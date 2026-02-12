/**
 * Concrete — Construction Financial & Operations Platform
 * Hash-based SPA Router (Phase Zed.6)
 *
 * Provides client-side routing using the URL hash fragment.
 * Supports parameterized paths, query strings, route guards,
 * global filters, breadcrumbs, and event-driven navigation lifecycle.
 */

import type {
  Route,
  RouteMatch,
  RouteGuard,
  BreadcrumbItem,
  NavigationState,
} from '../types/router';
import type { EventBus } from '../events/bus';
import type { ModuleManager } from '../module/manager';
import type { PermissionEngine } from '../permissions/engine';
import { generateBreadcrumbs } from './breadcrumbs';

/**
 * Internal representation of a registered route with the compiled regex
 * and extracted parameter names kept alongside the original config.
 */
interface RegisteredRoute {
  /** Original path pattern, e.g. '/jobs/:jobId/cost' */
  path: string;
  /** Compiled regex for matching */
  pattern: RegExp;
  /** Ordered parameter names extracted from the path pattern */
  paramNames: string[];
  /** Component loader */
  component: () => Promise<unknown>;
  /** Display title */
  title?: string;
  /** Icon identifier */
  icon?: string;
  /** Navigation guard */
  guard?: RouteGuard;
  /** Arbitrary metadata */
  meta?: Record<string, unknown>;
  /** Parent route path for hierarchy */
  parent?: string;
  /** Child routes */
  children?: Route[];
}

export class Router {
  private routes: Map<string, RegisteredRoute> = new Map();
  private currentRoute: RouteMatch | null = null;
  private previousRoute: RouteMatch | null = null;
  private navigationHistory: RouteMatch[] = [];
  private globalFilters: Record<string, string> = {};
  private events: EventBus;
  private modules: ModuleManager;
  private permissions: PermissionEngine;
  private started = false;

  /** Bound handler reference so we can add/remove the listener cleanly. */
  private readonly hashChangeHandler: () => void;

  constructor(events: EventBus, modules: ModuleManager, permissions: PermissionEngine) {
    this.events = events;
    this.modules = modules;
    this.permissions = permissions;
    this.hashChangeHandler = this.onHashChange.bind(this);
  }

  // ---------------------------------------------------------------------------
  // Route registration
  // ---------------------------------------------------------------------------

  /**
   * Register a route.
   *
   * Path patterns may contain named parameters prefixed with `:`.
   * Examples: `/jobs`, `/jobs/:jobId`, `/jobs/:jobId/cost/:lineId`
   * A wildcard `*` segment matches the rest of the path.
   */
  register(config: {
    path: string;
    component: () => Promise<unknown> | unknown;
    title?: string;
    icon?: string;
    guard?: RouteGuard;
    meta?: Record<string, unknown>;
  }): void {
    const { paramNames, regex } = this.compilePath(config.path);

    // Wrap synchronous component loaders in a promise for uniformity.
    const asyncComponent = (): Promise<unknown> => {
      const result = config.component();
      return result instanceof Promise ? result : Promise.resolve(result);
    };

    const registered: RegisteredRoute = {
      path: config.path,
      pattern: regex,
      paramNames,
      component: asyncComponent,
      title: config.title,
      icon: config.icon,
      guard: config.guard,
      meta: config.meta,
    };

    this.routes.set(config.path, registered);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Start listening to `hashchange` events and navigate to the
   * current hash (or the default `/` route).
   */
  start(): void {
    if (this.started) return;
    this.started = true;

    window.addEventListener('hashchange', this.hashChangeHandler);

    // Navigate to whatever is currently in the address bar.
    const { path, query } = this.parseHash(window.location.hash);
    void this.navigate(path || '/', query);
  }

  /**
   * Stop listening to hash changes. Useful for tests and teardown.
   */
  stop(): void {
    if (!this.started) return;
    this.started = false;
    window.removeEventListener('hashchange', this.hashChangeHandler);
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /**
   * Navigate to a path.
   *
   * Steps:
   *  1. Parse path and match against registered routes.
   *  2. Extract route params.
   *  3. Merge global filters into query.
   *  4. Emit `navigation.before` (cancellable via `payload.cancelled = true`).
   *  5. Run route guard if present.
   *  6. Check module permission via PermissionEngine.
   *  7. Update `window.location.hash`.
   *  8. Set currentRoute / previousRoute.
   *  9. Emit `navigation.after`.
   */
  async navigate(path: string, query?: Record<string, string>): Promise<void> {
    // 1. Match route
    const match = this.matchRoute(path);
    if (!match) {
      this.handleNotFound(path);
      return;
    }

    // 3. Merge global filters into query
    const mergedQuery: Record<string, string> = {
      ...this.globalFilters,
      ...query,
    };

    // Build the full RouteMatch
    const routeMatch: RouteMatch = {
      route: match.route,
      params: match.params,
      query: mergedQuery,
    };

    // 4. Emit navigation.before — listeners can set `cancelled = true` to abort.
    const beforePayload: {
      to: RouteMatch;
      from: RouteMatch | null;
      cancelled: boolean;
    } = {
      to: routeMatch,
      from: this.currentRoute,
      cancelled: false,
    };

    this.events.emit('navigation.before', beforePayload);
    if (beforePayload.cancelled) return;

    // 5. Run route guard if present.
    if (match.route.guard) {
      const guardResult = match.route.guard(routeMatch, this.currentRoute);
      if (guardResult === false) return;
      if (typeof guardResult === 'string') {
        // Guard returned a redirect path.
        void this.navigate(guardResult);
        return;
      }
    }

    // 6. Check module permission (using meta.moduleId if set).
    const moduleId = match.route.meta?.['moduleId'] as string | undefined;
    if (moduleId) {
      const engine = this.permissions as { canAccessModule?: (id: string) => boolean };
      if (typeof engine.canAccessModule === 'function' && !engine.canAccessModule(moduleId)) {
        this.events.emit('navigation.forbidden', { path, moduleId });
        return;
      }
    }

    // 7. Update hash without retriggering the handler.
    const newHash = '#' + this.buildHash(path, mergedQuery);
    if (window.location.hash !== newHash) {
      window.removeEventListener('hashchange', this.hashChangeHandler);
      window.location.hash = newHash;
      // Reattach on the next microtask so the browser finishes the hash update.
      queueMicrotask(() => {
        if (this.started) {
          window.addEventListener('hashchange', this.hashChangeHandler);
        }
      });
    }

    // 8. Update internal state.
    this.previousRoute = this.currentRoute;
    this.currentRoute = routeMatch;
    this.navigationHistory.push(routeMatch);

    // Update document title.
    if (match.route.title) {
      document.title = `${match.route.title} | Concrete`;
    }

    // 9. Emit navigation.after.
    this.events.emit('navigation.after', {
      to: routeMatch,
      from: this.previousRoute,
    });
  }

  /**
   * Navigate to the previous route if one exists,
   * otherwise fall back to browser history.
   */
  back(): void {
    if (this.previousRoute) {
      const prevPath = this.previousRoute.route.path;
      void this.navigate(prevPath, this.previousRoute.query);
    } else {
      window.history.back();
    }
  }

  // ---------------------------------------------------------------------------
  // State accessors
  // ---------------------------------------------------------------------------

  /** Get the current matched route, or `null` before first navigation. */
  getCurrent(): RouteMatch | null {
    return this.currentRoute;
  }

  /** Get the module manager (for route-level module queries). */
  getModules(): ModuleManager {
    return this.modules;
  }

  /** Get the previous matched route, or `null`. */
  getPrevious(): RouteMatch | null {
    return this.previousRoute;
  }

  /**
   * Build a breadcrumb trail for the current route.
   *
   * Each path segment that maps to a registered route produces a
   * clickable breadcrumb. The last entry is marked `active`.
   */
  getBreadcrumbs(): BreadcrumbItem[] {
    if (!this.currentRoute) return [];

    // Reconstruct the actual resolved path from params.
    const resolvedPath = this.resolveCurrentPath();
    return generateBreadcrumbs(resolvedPath, this.routes as Map<string, Route>);
  }

  /**
   * Full snapshot of the navigation state, conforming to the
   * NavigationState interface.
   */
  getState(): NavigationState {
    return {
      currentRoute: this.currentRoute,
      history: [...this.navigationHistory],
      breadcrumbs: this.getBreadcrumbs(),
    };
  }

  // ---------------------------------------------------------------------------
  // Global filters
  // ---------------------------------------------------------------------------

  /**
   * Set a global filter that will be merged into every subsequent
   * navigation's query parameters. Useful for entity-scoped or
   * date-range filters that persist across page transitions.
   */
  setGlobalFilter(key: string, value: string): void {
    this.globalFilters[key] = value;
    this.events.emit('navigation.filterChanged', {
      key,
      value,
      filters: { ...this.globalFilters },
    });
  }

  /** Remove a global filter by key. */
  removeGlobalFilter(key: string): void {
    delete this.globalFilters[key];
    this.events.emit('navigation.filterChanged', {
      key,
      value: undefined,
      filters: { ...this.globalFilters },
    });
  }

  /** Get a shallow copy of the current global filters. */
  getGlobalFilters(): Record<string, string> {
    return { ...this.globalFilters };
  }

  // ---------------------------------------------------------------------------
  // Internal: hash change listener
  // ---------------------------------------------------------------------------

  private onHashChange(): void {
    const { path, query } = this.parseHash(window.location.hash);
    void this.navigate(path || '/', query);
  }

  // ---------------------------------------------------------------------------
  // Internal: URL parsing
  // ---------------------------------------------------------------------------

  /**
   * Parse a hash string into a path and query parameters.
   *
   * Examples:
   *   `#/jobs/42?tab=cost&view=table`
   *   -> { path: '/jobs/42', query: { tab: 'cost', view: 'table' } }
   *
   *   `#/dashboard`
   *   -> { path: '/dashboard', query: {} }
   */
  private parseHash(hash: string): { path: string; query: Record<string, string> } {
    let raw = hash.startsWith('#') ? hash.slice(1) : hash;

    if (!raw.startsWith('/')) {
      raw = '/' + raw;
    }

    const queryIndex = raw.indexOf('?');
    const pathPart = queryIndex >= 0 ? raw.slice(0, queryIndex) : raw;
    const queryString = queryIndex >= 0 ? raw.slice(queryIndex + 1) : '';

    const query: Record<string, string> = {};
    if (queryString) {
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => {
        query[key] = value;
      });
    }

    return { path: this.normalizePath(pathPart), query };
  }

  /**
   * Build a hash string (without leading `#`) from a path and query params.
   */
  private buildHash(path: string, query: Record<string, string>): string {
    const normalized = this.normalizePath(path);
    const entries = Object.entries(query).filter(
      ([, v]) => v !== undefined && v !== '',
    );

    if (entries.length === 0) return normalized;

    const qs = new URLSearchParams(entries).toString();
    return `${normalized}?${qs}`;
  }

  /**
   * Normalize a path: ensure leading `/`, strip trailing `/` (unless root).
   */
  private normalizePath(path: string): string {
    let p = path;
    if (!p.startsWith('/')) p = '/' + p;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  }

  // ---------------------------------------------------------------------------
  // Internal: route matching
  // ---------------------------------------------------------------------------

  /**
   * Match a path against all registered routes.
   * Returns the first match with extracted params, or `null`.
   *
   * Uses a specificity heuristic: exact (no params) routes are
   * tried first, then parameterized, then wildcards last.
   */
  private matchRoute(path: string): { route: RegisteredRoute; params: Record<string, string> } | null {
    const normalized = this.normalizePath(path);

    // Sort by specificity: fewer paramNames = more specific.
    const sorted = [...this.routes.values()].sort(
      (a, b) => a.paramNames.length - b.paramNames.length,
    );

    for (const registered of sorted) {
      const match = normalized.match(registered.pattern);
      if (match) {
        const params: Record<string, string> = {};
        registered.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1] ?? '');
        });

        return { route: registered, params };
      }
    }

    return null;
  }

  /**
   * Compile a path pattern string into a regex and ordered parameter names.
   *
   * Pattern syntax:
   *   `:paramName`  — matches a single non-empty path segment (no `/`)
   *   `*`           — matches the rest of the path (catch-all)
   *
   * Examples:
   *   `/jobs/:jobId/cost`   -> regex: /^\/jobs\/([^/]+)\/cost$/
   *   `/files/*`            -> regex: /^\/files\/(.*)$/
   */
  private compilePath(path: string): { regex: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const normalized = this.normalizePath(path);

    const regexStr = normalized
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          paramNames.push(segment.slice(1));
          return '([^/]+)';
        }
        if (segment === '*') {
          paramNames.push('wildcard');
          return '(.*)';
        }
        // Escape regex-special characters in literal segments.
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');

    return {
      regex: new RegExp('^' + regexStr + '$'),
      paramNames,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal: resolve actual path from current route + params
  // ---------------------------------------------------------------------------

  /**
   * Reconstruct the concrete URL path from the current route's pattern
   * and matched params. Needed for breadcrumb generation.
   */
  private resolveCurrentPath(): string {
    if (!this.currentRoute) return '/';

    const routePath = this.currentRoute.route.path;
    const params = this.currentRoute.params;

    return routePath.replace(/:([^/]+)/g, (_full, paramName: string) => {
      return params[paramName] ?? paramName;
    });
  }

  // ---------------------------------------------------------------------------
  // Internal: 404 handling
  // ---------------------------------------------------------------------------

  /**
   * Handle navigation to an unregistered path.
   * Emits `navigation.notFound` so the shell or error boundary can react.
   * Falls back to a catch-all `/*` route if one is registered.
   */
  private handleNotFound(path: string): void {
    this.events.emit('navigation.notFound', { path });

    // Try the catch-all route.
    const catchAll = this.routes.get('/*') ?? this.routes.get('*');
    if (catchAll) {
      const routeMatch: RouteMatch = {
        route: {
          path: catchAll.path,
          pattern: catchAll.pattern,
          component: catchAll.component,
          title: catchAll.title,
          icon: catchAll.icon,
          guard: catchAll.guard,
          meta: catchAll.meta,
        },
        params: { wildcard: path },
        query: { ...this.globalFilters },
      };

      this.previousRoute = this.currentRoute;
      this.currentRoute = routeMatch;
      this.navigationHistory.push(routeMatch);

      this.events.emit('navigation.after', {
        to: routeMatch,
        from: this.previousRoute,
      });
    }
  }
}
