/**
 * Concrete — Construction Financial & Operations Platform
 * Router Module Public API (Phase Zed.6)
 *
 * Re-exports the Router class, guard factories, and breadcrumb
 * generation utilities for convenient single-import usage:
 *
 *   import { Router, requireAuth, generateBreadcrumbs } from '@core/router';
 */

export { Router } from './router';

export {
  requireAuth,
  requirePermission,
  requireModule,
  warnUnsavedChanges,
  composeGuards,
} from './guards';

export { generateBreadcrumbs } from './breadcrumbs';

// Re-export types for consumers that need them alongside the runtime code.
export type {
  Route,
  RouteMatch,
  RouteGuard,
  BreadcrumbItem,
  NavigationState,
} from '../types/router';
