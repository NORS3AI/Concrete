/**
 * Phase Zed.2 - Event System Types
 * Typed event bus for inter-module communication.
 */

import type { ISODateString } from './base';

/** Base event payload - all events include a timestamp */
export interface EventPayload {
  timestamp: ISODateString;
}

/** Generic event handler function */
export type EventHandler<T> = (payload: T & EventPayload) => void | Promise<void>;

/** Tracked event subscription */
export interface EventSubscription {
  id: string;
  event: string;
  handler: EventHandler<unknown>;
  priority: number;
  once: boolean;
}

/** Event that can be cancelled by handlers */
export interface CancellableEvent extends EventPayload {
  cancelled: boolean;
  preventDefault(): void;
}

/** Payload for store CRUD operations */
export interface StoreEventPayload extends EventPayload {
  collection: string;
  operation: 'insert' | 'update' | 'delete';
  recordId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/** Payload for application lifecycle events */
export interface AppLifecycleEvent extends EventPayload {
  app: string;
}

/** Payload for navigation events */
export interface NavigationEvent extends EventPayload {
  from: string;
  to: string;
  params: Record<string, string>;
}

/** Payload for module status change events */
export interface ModuleEvent extends EventPayload {
  moduleId: string;
  status: string;
}
