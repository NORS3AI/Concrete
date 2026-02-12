/**
 * Concrete — Construction Financial & Operations Platform
 * Route Guard Helpers (Phase Zed.6)
 *
 * Factory functions that produce RouteGuard callbacks for common
 * access-control patterns: authentication, permissions, module
 * availability, and unsaved-change warnings.
 */

import type { RouteGuard } from '../types/router';

// ---------------------------------------------------------------------------
// Authentication guard
// ---------------------------------------------------------------------------

/**
 * Guard that requires the user to be authenticated.
 *
 * When no authentication state is available (e.g. before the auth
 * subsystem is wired in), this guard defaults to allowing access.
 * Once an `isAuthenticated` provider is supplied, it will redirect
 * unauthenticated users to the given login path.
 *
 * @param isAuthenticated  Callback that synchronously returns the
 *                         current authentication status.
 * @param loginPath        Path to redirect to when not authenticated.
 *                         Defaults to `/login`.
 */
export function requireAuth(
  isAuthenticated?: () => boolean,
  loginPath = '/login',
): RouteGuard {
  return (_to, _from) => {
    if (isAuthenticated && !isAuthenticated()) {
      return loginPath;
    }
    return true;
  };
}

// ---------------------------------------------------------------------------
// Permission guard
// ---------------------------------------------------------------------------

/**
 * Guard that requires the current user to hold a specific permission.
 *
 * @param resource  The resource identifier (e.g. 'jobs', 'invoices').
 * @param action    The action on the resource (e.g. 'read', 'write').
 * @param checker   Callback that evaluates the permission. When omitted the
 *                  guard allows access unconditionally (useful during early
 *                  development before the permission engine is connected).
 * @param fallback  Path to redirect to on denial. Defaults to `/forbidden`.
 */
export function requirePermission(
  resource: string,
  action: string,
  checker?: (resource: string, action: string) => boolean,
  fallback = '/forbidden',
): RouteGuard {
  return (_to, _from) => {
    if (checker && !checker(resource, action)) {
      return fallback;
    }
    return true;
  };
}

// ---------------------------------------------------------------------------
// Module-enabled guard
// ---------------------------------------------------------------------------

/**
 * Guard that ensures a specific application module is enabled.
 *
 * @param moduleId  The unique module identifier (e.g. 'cost-tracking').
 * @param checker   Callback that returns whether the module is enabled.
 *                  When omitted the guard allows access unconditionally.
 * @param fallback  Path to redirect to when the module is disabled.
 *                  Defaults to `/`.
 */
export function requireModule(
  moduleId: string,
  checker?: (moduleId: string) => boolean,
  fallback = '/',
): RouteGuard {
  return (_to, _from) => {
    if (checker && !checker(moduleId)) {
      return fallback;
    }
    return true;
  };
}

// ---------------------------------------------------------------------------
// Unsaved-changes guard
// ---------------------------------------------------------------------------

/**
 * Guard that warns the user if there are unsaved changes before
 * navigating away.
 *
 * Uses `window.confirm` to display a browser-native dialog.
 * Returns `false` to block navigation when the user cancels.
 *
 * @param isDirty  Callback that synchronously returns `true` when
 *                 the current view has unsaved changes.
 */
export function warnUnsavedChanges(isDirty: () => boolean): RouteGuard {
  return (_to, _from) => {
    if (isDirty()) {
      return window.confirm('You have unsaved changes. Leave this page?');
    }
    return true;
  };
}

// ---------------------------------------------------------------------------
// Composite guard
// ---------------------------------------------------------------------------

/**
 * Combine multiple guards into a single guard that evaluates each
 * in order. The first guard that denies access (returns `false`)
 * or redirects (returns a string) wins.
 *
 * @param guards  Ordered list of guards to evaluate.
 */
export function composeGuards(...guards: RouteGuard[]): RouteGuard {
  return (to, from) => {
    for (const guard of guards) {
      const result = guard(to, from);
      if (result !== true) return result;
    }
    return true;
  };
}
