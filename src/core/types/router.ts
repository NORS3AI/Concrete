/**
 * Phase Zed.2 - Router Types
 * Client-side routing for the single-page application.
 */

/** Route definition */
export interface Route {
  path: string;
  pattern: RegExp;
  component: () => Promise<unknown>;
  title?: string;
  icon?: string;
  guard?: RouteGuard;
  meta?: Record<string, unknown>;
  parent?: string;
  children?: Route[];
}

/** Result of matching a URL to a route */
export interface RouteMatch {
  route: Route;
  params: Record<string, string>;
  query: Record<string, string>;
}

/** Route guard: returns true to allow, false to deny, or a redirect path string */
export type RouteGuard = (
  to: RouteMatch,
  from: RouteMatch | null
) => boolean | string;

/** Breadcrumb navigation item */
export interface BreadcrumbItem {
  label: string;
  path?: string;
  active?: boolean;
}

/** Current navigation state */
export interface NavigationState {
  currentRoute: RouteMatch | null;
  history: RouteMatch[];
  breadcrumbs: BreadcrumbItem[];
}
