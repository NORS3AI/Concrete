/**
 * Concrete — Construction Financial & Operations Platform
 * Breadcrumb Generation (Phase Zed.6)
 *
 * Builds a hierarchical breadcrumb trail from the current URL path
 * by matching progressive path segments against registered routes.
 */

import type { Route, BreadcrumbItem } from '../types/router';

/**
 * Generate breadcrumb items for a given resolved path.
 *
 * Algorithm:
 *   1. Split the path into segments (e.g. `/jobs/42/cost` -> `['jobs','42','cost']`).
 *   2. For each progressive accumulation of segments, attempt to match
 *      against the registered routes.
 *   3. When a match is found, use the route's `title` (or fall back to
 *      the literal segment / param value) as the breadcrumb label.
 *   4. The last breadcrumb is marked `active` (current page, no link).
 *
 * @param currentPath  The concrete, resolved path (params already substituted).
 *                     Example: `/jobs/42/cost`
 * @param routes       The router's registered route map, keyed by pattern path.
 *                     Example key: `/jobs/:jobId/cost`
 * @returns            Ordered array of breadcrumb items from root to current.
 */
export function generateBreadcrumbs(
  currentPath: string,
  routes: Map<string, Route>,
): BreadcrumbItem[] {
  const segments = currentPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    // Root path — single "Home" breadcrumb.
    return [{ label: 'Home', path: '/', active: true }];
  }

  const breadcrumbs: BreadcrumbItem[] = [];

  // Always start with a "Home" entry pointing to root.
  const hasRootRoute = findRouteForPath('/', routes) !== null;
  breadcrumbs.push({
    label: hasRootRoute ? (findRouteForPath('/', routes)!.title ?? 'Home') : 'Home',
    path: '/',
    active: false,
  });

  // Walk through progressive segment accumulations.
  let accumulated = '';
  for (let i = 0; i < segments.length; i++) {
    accumulated += '/' + segments[i];
    const isLast = i === segments.length - 1;

    const matchedRoute = findRouteForPath(accumulated, routes);
    const label = matchedRoute?.title ?? humanize(segments[i]);

    breadcrumbs.push({
      label,
      path: isLast ? undefined : accumulated,
      active: isLast,
    });
  }

  return breadcrumbs;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to match a concrete path against the registered route patterns.
 * Returns the first matching Route, or `null`.
 */
function findRouteForPath(
  path: string,
  routes: Map<string, Route>,
): Route | null {
  for (const [, route] of routes) {
    if (route.pattern.test(path)) {
      return route;
    }
  }
  return null;
}

/**
 * Convert a URL segment into a human-readable label.
 *
 * - Replaces dashes and underscores with spaces.
 * - Capitalises the first letter of each word.
 * - Leaves numeric-looking segments (IDs) as-is.
 *
 * Examples:
 *   `cost-tracking` -> `Cost Tracking`
 *   `42`            -> `42`
 *   `change_orders` -> `Change Orders`
 */
function humanize(segment: string): string {
  // If the segment looks like a pure ID (numeric or UUID-ish), return as-is.
  if (/^[0-9a-f-]+$/i.test(segment) && /\d/.test(segment)) {
    return segment;
  }

  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
