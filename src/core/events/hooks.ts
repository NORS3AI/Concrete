/**
 * Phase Zed.5 - Lifecycle Hooks
 * Defines all system lifecycle events and provides helpers
 * for constructing dynamic store-mutation event names.
 */

// ---------------------------------------------------------------------------
// Lifecycle event catalogue
// ---------------------------------------------------------------------------

/** All lifecycle events the system fires */
export const LIFECYCLE_EVENTS = {
  // App
  'app.boot': 'Fired before anything renders',
  'app.ready': 'Fired after all modules loaded',

  // Module
  'module.registered': 'Module added to registry',
  'module.activated': 'Module enabled and running',
  'module.deactivated': 'Module disabled',
  'module.error': 'Module failed to load',

  // Auth
  'user.login': 'User authenticated',
  'user.logout': 'User logged out',

  // Data
  'data.imported': 'Batch import completed',
  'data.exported': 'Data export completed',
  'data.seeded': 'Demo data seeded',
  'data.reset': 'All data cleared',

  // Navigation
  'navigation.before': 'About to navigate (cancellable)',
  'navigation.after': 'Navigation completed',

  // Filters
  'period.changed': 'Global period filter changed',
  'entity.changed': 'Global entity filter changed',

  // Store mutations - generated dynamically per collection
  // 'before.insert.{collection}'
  // 'after.insert.{collection}'
  // 'before.update.{collection}'
  // 'after.update.{collection}'
  // 'before.delete.{collection}'
  // 'after.delete.{collection}'
} as const;

/** Union type of all statically-known lifecycle event keys */
export type LifecycleEvent = keyof typeof LIFECYCLE_EVENTS;

// ---------------------------------------------------------------------------
// Dynamic store mutation event helpers
// ---------------------------------------------------------------------------

/** Valid timings for store mutation events */
export type StoreMutationTiming = 'before' | 'after';

/** Valid operations for store mutation events */
export type StoreMutationOperation = 'insert' | 'update' | 'delete';

/**
 * Build a store-mutation event name.
 *
 * @example
 *   storeEvent('before', 'insert', 'invoices')
 *   // => 'before.insert.invoices'
 */
export function storeEvent(
  timing: StoreMutationTiming,
  operation: StoreMutationOperation,
  collection: string
): string {
  return `${timing}.${operation}.${collection}`;
}

/**
 * Check whether an event name represents a known lifecycle event.
 */
export function isLifecycleEvent(event: string): event is LifecycleEvent {
  return Object.prototype.hasOwnProperty.call(LIFECYCLE_EVENTS, event);
}

/**
 * Check whether an event name is a dynamic store-mutation event.
 */
export function isStoreMutationEvent(event: string): boolean {
  const parts = event.split('.');
  if (parts.length < 3) return false;
  const [timing, operation] = parts;
  return (
    (timing === 'before' || timing === 'after') &&
    (operation === 'insert' || operation === 'update' || operation === 'delete')
  );
}
