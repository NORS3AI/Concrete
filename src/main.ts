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
import { arManifest } from './modules/ar/manifest';
import { payrollManifest } from './modules/payroll/manifest';
import { unionManifest } from './modules/union/manifest';
import { equipManifest } from './modules/equip/manifest';
import { subManifest } from './modules/sub/manifest';
import { poManifest } from './modules/po/manifest';
import { reportsManifest } from './modules/reports/manifest';
import { dashboardManifest } from './modules/dashboard/manifest';
import { estimatingManifest } from './modules/estimating/manifest';
import { docManifest } from './modules/doc/manifest';
import { importExportManifest } from './modules/import-export/manifest';
import { authManifest } from './modules/auth/manifest';
import { tenantManifest } from './modules/tenant/manifest';
import { projectManifest } from './modules/project/manifest';
import { changeOrderManifest } from './modules/change-order/manifest';
import { serviceMgmtManifest } from './modules/service-mgmt/manifest';

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
    modules.register(arManifest);
    modules.register(payrollManifest);
    modules.register(unionManifest);
    modules.register(equipManifest);
    modules.register(subManifest);
    modules.register(poManifest);
    modules.register(reportsManifest);
    modules.register(dashboardManifest);
    modules.register(estimatingManifest);
    modules.register(docManifest);
    modules.register(importExportManifest);
    modules.register(authManifest);
    modules.register(tenantManifest);
    modules.register(projectManifest);
    modules.register(changeOrderManifest);
    modules.register(serviceMgmtManifest);

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
    const everyNavItem = modules.getAll()
      .flatMap((mod) => mod.manifest.navItems);
    const topLevelNavItems = everyNavItem
      .filter((item) => !item.parent)
      .sort((a, b) => a.order - b.order);

    const navTabs = document.getElementById('nav-tabs');
    if (navTabs) {
      for (const item of topLevelNavItems) {
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

    // 13b. Populate mega menu dropdown with all modules and their children
    const megaMenuContent = document.getElementById('mega-menu-content');
    if (megaMenuContent) {
      for (const parent of topLevelNavItems) {
        const children = everyNavItem
          .filter((item) => item.parent === parent.id)
          .sort((a, b) => a.order - b.order);

        const group = document.createElement('div');
        group.className = 'p-3';

        // Module header
        const header = document.createElement('a');
        header.href = `#${parent.path}`;
        header.className = 'block text-sm font-semibold text-[var(--accent)] mb-2 hover:underline';
        header.textContent = parent.label;
        header.addEventListener('click', () => shell.toggleMegaMenu(false));
        group.appendChild(header);

        // Child links
        if (children.length > 0) {
          const list = document.createElement('ul');
          list.className = 'space-y-0.5';
          for (const child of children) {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = `#${child.path}`;
            link.className = 'block px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] rounded transition-colors';
            link.textContent = child.label;
            link.addEventListener('click', () => shell.toggleMegaMenu(false));
            li.appendChild(link);
            list.appendChild(li);
          }
          group.appendChild(list);
        }

        megaMenuContent.appendChild(group);
      }
    }

    // 13c. Wire up smart search bar
    const searchInput = document.getElementById('nav-search-input') as HTMLInputElement | null;
    const searchResults = document.getElementById('nav-search-results');
    if (searchInput && searchResults) {
      // Build a flat searchable index of all nav items with parent context
      interface SearchEntry {
        label: string;
        path: string;
        parentLabel: string;
        keywords: string; // lowercase combined text for matching
      }
      const searchIndex: SearchEntry[] = [];

      for (const parent of topLevelNavItems) {
        // Add the parent itself
        searchIndex.push({
          label: parent.label,
          path: parent.path,
          parentLabel: '',
          keywords: parent.label.toLowerCase(),
        });

        // Add children
        const children = everyNavItem
          .filter((item) => item.parent === parent.id)
          .sort((a, b) => a.order - b.order);
        for (const child of children) {
          searchIndex.push({
            label: child.label,
            path: child.path,
            parentLabel: parent.label,
            keywords: `${child.label} ${parent.label}`.toLowerCase(),
          });
        }
      }

      let activeIndex = -1;

      function renderSearchResults(query: string): void {
        if (!searchResults) return;
        searchResults.innerHTML = '';
        activeIndex = -1;

        const q = query.trim().toLowerCase();
        // Tokenize query for multi-word matching
        const tokens = q.split(/\s+/).filter(Boolean);

        let filtered: SearchEntry[];
        if (tokens.length === 0) {
          // Show top-level modules when empty
          filtered = searchIndex.filter((e) => !e.parentLabel);
        } else {
          // Match entries where ALL tokens appear somewhere in keywords
          filtered = searchIndex.filter((e) =>
            tokens.every((t) => e.keywords.includes(t))
          );
        }

        if (filtered.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'py-8 text-center text-sm text-[var(--text-muted)]';
          empty.textContent = 'No results found';
          searchResults.appendChild(empty);
          return;
        }

        // Group results by parent module
        const grouped = new Map<string, SearchEntry[]>();
        for (const entry of filtered) {
          const group = entry.parentLabel || entry.label;
          if (!grouped.has(group)) grouped.set(group, []);
          grouped.get(group)!.push(entry);
        }

        let globalIdx = 0;
        for (const [groupName, entries] of grouped) {
          // Group header
          const groupHeader = document.createElement('div');
          groupHeader.className = 'px-3 py-1.5 text-2xs font-semibold text-[var(--text-muted)] uppercase tracking-wider';
          groupHeader.textContent = groupName;
          searchResults.appendChild(groupHeader);

          for (const entry of entries) {
            const item = document.createElement('a');
            item.href = `#${entry.path}`;
            item.dataset.searchIdx = String(globalIdx);
            item.className = 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text)] hover:bg-[var(--accent)]/10 cursor-pointer transition-colors';

            // Icon
            const icon = document.createElement('div');
            icon.className = 'w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0';
            icon.innerHTML = entry.parentLabel
              ? '<svg class="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>'
              : '<svg class="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>';
            item.appendChild(icon);

            // Text
            const text = document.createElement('div');
            text.className = 'flex-1 min-w-0';
            const title = document.createElement('div');
            title.className = 'font-medium truncate';

            // Highlight matching text
            if (tokens.length > 0) {
              let html = entry.label;
              for (const t of tokens) {
                const regex = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                html = html.replace(regex, '<mark class="bg-[var(--accent)]/20 text-[var(--accent)] rounded px-0.5">$1</mark>');
              }
              title.innerHTML = html;
            } else {
              title.textContent = entry.label;
            }
            text.appendChild(title);

            if (entry.parentLabel) {
              const breadcrumb = document.createElement('div');
              breadcrumb.className = 'text-2xs text-[var(--text-muted)] truncate';
              breadcrumb.textContent = entry.parentLabel;
              text.appendChild(breadcrumb);
            }
            item.appendChild(text);

            // Path hint
            const pathHint = document.createElement('span');
            pathHint.className = 'text-2xs text-[var(--text-muted)] flex-shrink-0';
            pathHint.textContent = entry.path;
            item.appendChild(pathHint);

            item.addEventListener('click', () => shell.closeSearch());
            searchResults.appendChild(item);
            globalIdx++;
          }
        }

        // Auto-select first result
        if (globalIdx > 0) {
          activeIndex = 0;
          highlightResult(0);
        }
      }

      function highlightResult(idx: number): void {
        if (!searchResults) return;
        const items = searchResults.querySelectorAll('a[data-search-idx]');
        items.forEach((el) => {
          el.classList.remove('bg-[var(--accent)]/10');
        });
        const active = searchResults.querySelector(`a[data-search-idx="${idx}"]`);
        if (active) {
          active.classList.add('bg-[var(--accent)]/10');
          active.scrollIntoView({ block: 'nearest' });
        }
      }

      searchInput.addEventListener('input', () => {
        renderSearchResults(searchInput.value);
      });

      searchInput.addEventListener('keydown', (e) => {
        const items = searchResults.querySelectorAll('a[data-search-idx]');
        const count = items.length;
        if (count === 0) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          activeIndex = (activeIndex + 1) % count;
          highlightResult(activeIndex);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          activeIndex = (activeIndex - 1 + count) % count;
          highlightResult(activeIndex);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const active = searchResults.querySelector(`a[data-search-idx="${activeIndex}"]`) as HTMLAnchorElement;
          if (active) {
            active.click();
            shell.closeSearch();
          }
        }
      });
    }

    // 14. Wire router to render views into content area on navigation
    events.on('navigation.after', async (payload: unknown) => {
      // Close mega menu and search on navigation
      shell.toggleMegaMenu(false);
      shell.closeSearch();
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
