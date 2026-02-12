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

    // 7. Register Phase 1 — General Ledger module
    modules.register(glManifest);

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

    // 13. Start router (renders initial view)
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
