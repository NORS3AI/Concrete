/**
 * Concrete — Construction Financial & Operations Platform
 * Application Entry Point
 *
 * Boot sequence:
 * 1. Initialize error handling & logging
 * 2. Load configuration & feature flags
 * 3. Initialize data store (adapter selection)
 * 4. Register core modules
 * 5. Initialize router
 * 6. Initialize UI shell
 * 7. Register service worker
 * 8. Boot enabled modules
 * 9. Render initial view
 */

import './styles/main.css';
import { Logger } from '@core/errors/logger';
import { ErrorBoundary } from '@core/errors/boundary';
import { ConfigManager } from '@core/config/config';
import { FeatureFlags } from '@core/config/feature-flags';
import { Environment } from '@core/config/environment';
import { EventBus } from '@core/events/bus';
import { Store } from '@core/store/store';
import { SchemaRegistry } from '@core/schema/registry';
import { ModuleManager } from '@core/module/manager';
import { Router } from '@core/router/router';
import { PermissionEngine } from '@core/permissions/engine';
import { NotificationManager } from '@core/notifications/manager';
import { SearchEngine } from '@core/search/engine';
import { KeyboardManager } from '@core/a11y/keyboard';
import { I18n } from '@core/i18n/engine';
import { UndoManager } from '@core/history/undo-redo';
import { ServiceWorkerManager } from '@core/service-worker';
import { AppShell } from '@ui/components/layout/app-shell';
import { glManifest } from './modules/gl/manifest';
import { entityManifest } from './modules/entity/manifest';
import { jobManifest } from './modules/job/manifest';
import { apManifest } from './modules/ap/manifest';

// Global app instance
export interface ConcreteApp {
  logger: Logger;
  errorBoundary: ErrorBoundary;
  config: ConfigManager;
  features: FeatureFlags;
  env: Environment;
  events: EventBus;
  store: Store;
  schemas: SchemaRegistry;
  modules: ModuleManager;
  router: Router;
  permissions: PermissionEngine;
  notifications: NotificationManager;
  search: SearchEngine;
  keyboard: KeyboardManager;
  i18n: I18n;
  undo: UndoManager;
  shell: AppShell;
}

let app: ConcreteApp;

async function boot(): Promise<void> {
  // 1. Error handling & logging (must be first)
  const logger = new Logger();
  const errorBoundary = new ErrorBoundary(logger);
  errorBoundary.install();

  logger.info('app', 'Concrete booting...');

  try {
    // 2. Environment & configuration
    const env = new Environment();
    const events = new EventBus();
    const config = new ConfigManager(events);
    const features = new FeatureFlags(config);

    await config.load();
    logger.info('app', `Environment: ${env.mode}, Build: ${env.buildTarget}`);

    // 3. Schema registry
    const schemas = new SchemaRegistry();
    schemas.registerCoreSchemas();

    // 4. Data store
    const store = new Store(schemas, events, logger);
    await store.initialize();

    // 5. Core systems
    const i18n = new I18n();
    await i18n.load(config.get('locale', 'en-US'));

    const permissions = new PermissionEngine(store.getAdapter(), events);
    const notifications = new NotificationManager(events, config);
    const search = new SearchEngine(store.getAdapter(), schemas);
    const undo = new UndoManager(store.getAdapter(), events);
    const keyboard = new KeyboardManager();

    // 6. Module system
    const modules = new ModuleManager(events, store, schemas, logger);

    // 7. Register modules
    modules.register(glManifest);
    modules.register(entityManifest);
    modules.register(jobManifest);
    modules.register(apManifest);

    // 8. Router
    const router = new Router(events, modules, permissions);

    // Register module routes with the router
    for (const mod of modules.getAll()) {
      for (const route of mod.manifest.routes) {
        router.register({
          path: route.path,
          component: route.component,
          title: route.title,
          icon: route.icon,
        });
      }
    }

    // Default route: redirect `/` to the first module's root path
    router.register({
      path: '/',
      component: () => Promise.resolve(null),
      title: 'Home',
      meta: { redirect: '/gl' },
    });

    // 10. UI Shell
    const shell = new AppShell();

    // Assemble app
    app = {
      logger,
      errorBoundary,
      config,
      features,
      env,
      events,
      store,
      schemas,
      modules,
      router,
      permissions,
      notifications,
      search,
      keyboard,
      i18n,
      undo,
      shell,
    };

    // Expose for debugging in dev
    if (env.isDev) {
      (window as unknown as Record<string, unknown>).concrete = app;
    }

    // Fire lifecycle events
    events.emit('app.boot', { app });

    // 11. Register service worker (non-blocking)
    if (env.isProd) {
      ServiceWorkerManager.register().catch((err) => {
        logger.warn('sw', 'Service worker registration failed', err);
      });
    }

    // 12. Mount UI
    const root = document.getElementById('app');
    if (root) {
      shell.mount(root);
    }

    // 13. Build navigation tabs from module nav items
    const navTabs = document.getElementById('nav-tabs');
    if (navTabs) {
      const allNavItems = modules.getAll()
        .flatMap((mod) => mod.manifest.navItems)
        .filter((item) => !item.parent) // Only top-level items
        .sort((a, b) => a.order - b.order);

      for (const item of allNavItems) {
        const btn = document.createElement('a');
        btn.href = `#${item.path}`;
        btn.className = 'px-3 py-1.5 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors whitespace-nowrap';
        btn.dataset.navId = item.id;
        btn.textContent = item.label;
        navTabs.appendChild(btn);
      }

      // Sub-nav: build a dropdown/submenu container below the top nav for child items
      const subNav = document.createElement('div');
      subNav.id = 'sub-nav';
      subNav.className = 'flex items-center gap-1 px-4 py-1.5 bg-[var(--surface)] border-b border-[var(--border)] text-sm overflow-x-auto';
      subNav.style.display = 'none';
      shell.getTopNav()?.insertAdjacentElement('afterend', subNav);
    }

    // 14. Wire router to render views into content area on navigation
    events.on('navigation.after', async (payload: unknown) => {
      const { to } = payload as { to: { route: { path: string; component: () => Promise<unknown>; meta?: Record<string, unknown> }; params: Record<string, string>; query: Record<string, string> } };

      // Handle redirect routes
      if (to.route.meta?.redirect) {
        void router.navigate(to.route.meta.redirect as string);
        return;
      }

      const contentArea = shell.getContentArea();
      if (!contentArea) return;

      // Show loading state
      contentArea.innerHTML = '<div class="flex items-center justify-center h-64"><div class="text-[var(--text-muted)]">Loading...</div></div>';

      try {
        // Lazy-load the view module
        const viewModule = await to.route.component();
        const view = viewModule as { default?: { render: (container: HTMLElement) => void } } | null;

        if (view?.default?.render) {
          contentArea.innerHTML = '';
          view.default.render(contentArea);
        } else {
          contentArea.innerHTML = '<div class="p-4 text-[var(--text-muted)]">View not found.</div>';
        }
      } catch (err) {
        logger.error('router', 'Failed to load view', err);
        contentArea.innerHTML = `<div class="p-4 text-[var(--negative)]">Failed to load view: ${err instanceof Error ? err.message : String(err)}</div>`;
      }

      // Update active nav tab styling
      const navTabs = document.getElementById('nav-tabs');
      if (navTabs) {
        const currentPath = to.route.path;
        for (const link of navTabs.querySelectorAll('a[data-nav-id]')) {
          const href = link.getAttribute('href')?.slice(1) || '';
          const isActive = currentPath.startsWith(href);
          link.className = isActive
            ? 'px-3 py-1.5 rounded-md text-sm font-medium text-[var(--accent)] bg-[var(--accent)]/10 whitespace-nowrap'
            : 'px-3 py-1.5 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors whitespace-nowrap';
        }
      }

      // Render sub-nav for current module
      const subNav = document.getElementById('sub-nav');
      if (subNav) {
        const currentPath = to.route.path;
        // Find parent nav item for current route
        const allNavItems = modules.getAll().flatMap((mod) => mod.manifest.navItems);
        const parentItem = allNavItems.find((item) => !item.parent && currentPath.startsWith(item.path));

        if (parentItem) {
          const children = allNavItems
            .filter((item) => item.parent === parentItem.id)
            .sort((a, b) => a.order - b.order);

          if (children.length > 0) {
            subNav.innerHTML = '';
            subNav.style.display = 'flex';

            for (const child of children) {
              const link = document.createElement('a');
              link.href = `#${child.path}`;
              const isActive = currentPath === child.path || currentPath.startsWith(child.path + '/');
              link.className = isActive
                ? 'px-2.5 py-1 rounded text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 whitespace-nowrap'
                : 'px-2.5 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] whitespace-nowrap';
              link.textContent = child.label;
              subNav.appendChild(link);
            }
          } else {
            subNav.style.display = 'none';
          }
        } else {
          subNav.style.display = 'none';
        }
      }
    });

    // 15. Start router (renders initial view)
    router.start();

    // 14. Boot complete
    events.emit('app.ready', { app });
    logger.info('app', 'Concrete ready');
  } catch (err) {
    logger.fatal('app', 'Boot failed', err);
    errorBoundary.showFatalError(err as Error);
  }
}

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void boot());
} else {
  void boot();
}

export { app };
