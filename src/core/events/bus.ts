/**
 * Phase Zed.4/5 - EventBus
 * Typed publish/subscribe event bus with wildcard matching,
 * priority ordering, debounce/throttle, and history tracking.
 */

import type { EventHandler } from '../types/events';

/** Internal listener entry */
interface ListenerEntry {
  id: string;
  handler: EventHandler<unknown>;
  priority: number;
  once: boolean;
}

/** A single entry in the event history log */
interface HistoryEntry {
  event: string;
  payload: unknown;
  timestamp: number;
}

/** Counter for generating unique listener IDs */
let listenerIdCounter = 0;

function nextListenerId(): string {
  listenerIdCounter += 1;
  return `listener_${listenerIdCounter}`;
}

/**
 * Check whether a pattern with wildcards matches a given event name.
 *
 * Rules:
 *  - `'*'` matches everything.
 *  - `'payroll.*'` matches `'payroll.run.completed'`, `'payroll.check.created'`, etc.
 *  - Exact match is handled separately for priority; this function only tests
 *    wildcard patterns (patterns containing `*`).
 */
function wildcardMatch(pattern: string, event: string): boolean {
  if (pattern === '*') return true;

  // Convert wildcard pattern to regex:
  //   'payroll.*' -> /^payroll\..*$/
  // Escape all regex-special chars except *, then replace * with .*
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
  return new RegExp(regexStr).test(event);
}

export class EventBus {
  private listeners: Map<string, ListenerEntry[]>;
  private history: HistoryEntry[];
  private maxHistory: number;

  constructor(maxHistory: number = 1000) {
    this.listeners = new Map();
    this.history = [];
    this.maxHistory = maxHistory;
  }

  /**
   * Emit an event to all listeners (fire-and-forget for async handlers).
   * Listeners are sorted by priority (higher number = called first).
   * Exact-match listeners run before wildcard listeners at equal priority.
   */
  emit(event: string, payload?: unknown): void {
    this.recordHistory(event, payload);

    const handlers = this.collectHandlers(event);

    for (const entry of handlers) {
      try {
        const result = entry.handler(payload as never);
        // Fire-and-forget: if handler returns a promise, swallow rejections
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch(() => {
            // intentionally swallowed in fire-and-forget mode
          });
        }
      } catch {
        // Swallow synchronous errors in fire-and-forget mode
      }

      if (entry.once) {
        this.removeListener(entry.pattern, entry.id);
      }
    }
  }

  /**
   * Emit an event and wait for ALL async handlers to resolve.
   * Throws if any handler rejects.
   */
  async emitAsync(event: string, payload?: unknown): Promise<void> {
    this.recordHistory(event, payload);

    const handlers = this.collectHandlers(event);
    const promises: Promise<void>[] = [];

    for (const entry of handlers) {
      try {
        const result = entry.handler(payload as never);
        if (result && typeof (result as Promise<void>).then === 'function') {
          promises.push(result as Promise<void>);
        }
      } catch (err) {
        promises.push(Promise.reject(err));
      }

      if (entry.once) {
        this.removeListener(entry.pattern, entry.id);
      }
    }

    await Promise.all(promises);
  }

  /**
   * Register a listener for an event pattern.
   * @returns An unsubscribe function.
   */
  on(event: string, handler: EventHandler<unknown>, priority: number = 0): () => void {
    const entry: ListenerEntry = {
      id: nextListenerId(),
      handler,
      priority,
      once: false,
    };
    this.addListener(event, entry);

    return () => {
      this.removeListener(event, entry.id);
    };
  }

  /**
   * Register a one-time listener. It is automatically removed after first invocation.
   * @returns An unsubscribe function (can be called to cancel before the event fires).
   */
  once(event: string, handler: EventHandler<unknown>, priority: number = 0): () => void {
    const entry: ListenerEntry = {
      id: nextListenerId(),
      handler,
      priority,
      once: true,
    };
    this.addListener(event, entry);

    return () => {
      this.removeListener(event, entry.id);
    };
  }

  /**
   * Remove ALL listeners registered under the given event pattern string.
   */
  off(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Remove every listener for every event.
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Return the event history, optionally filtered by a pattern.
   */
  getHistory(filter?: string): HistoryEntry[] {
    if (!filter) return [...this.history];

    return this.history.filter((entry) => {
      if (entry.event === filter) return true;
      if (filter.includes('*')) return wildcardMatch(filter, entry.event);
      return false;
    });
  }

  /**
   * Create a debounced emitter for the given event.
   * Successive calls within `delay` ms are collapsed into the last one.
   */
  debounce(event: string, delay: number): (payload?: unknown) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return (payload?: unknown) => {
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        this.emit(event, payload);
      }, delay);
    };
  }

  /**
   * Create a throttled emitter for the given event.
   * At most one emission per `delay` ms window.
   */
  throttle(event: string, delay: number): (payload?: unknown) => void {
    let lastEmit = 0;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    return (payload?: unknown) => {
      const now = Date.now();
      const elapsed = now - lastEmit;

      if (elapsed >= delay) {
        lastEmit = now;
        this.emit(event, payload);
      } else if (pendingTimer === null) {
        // Schedule a trailing emission
        pendingTimer = setTimeout(() => {
          lastEmit = Date.now();
          pendingTimer = null;
          this.emit(event, payload);
        }, delay - elapsed);
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private addListener(event: string, entry: ListenerEntry): void {
    const list = this.listeners.get(event);
    if (list) {
      list.push(entry);
    } else {
      this.listeners.set(event, [entry]);
    }
  }

  private removeListener(pattern: string, listenerId: string): void {
    const list = this.listeners.get(pattern);
    if (!list) return;

    const idx = list.findIndex((l) => l.id === listenerId);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
    if (list.length === 0) {
      this.listeners.delete(pattern);
    }
  }

  /**
   * Collect all matching handlers for a given concrete event name.
   *
   * Sorting strategy:
   *  1. Higher `priority` first.
   *  2. At equal priority exact matches sort before wildcards.
   */
  private collectHandlers(
    event: string
  ): Array<ListenerEntry & { pattern: string; isExact: boolean }> {
    const results: Array<ListenerEntry & { pattern: string; isExact: boolean }> = [];

    for (const [pattern, entries] of this.listeners) {
      const isExact = pattern === event;
      const isWild = !isExact && pattern.includes('*') && wildcardMatch(pattern, event);

      if (isExact || isWild) {
        for (const entry of entries) {
          results.push({ ...entry, pattern, isExact });
        }
      }
    }

    // Sort: higher priority first, exact before wildcard at same priority
    results.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.isExact && !b.isExact) return -1;
      if (!a.isExact && b.isExact) return 1;
      return 0;
    });

    return results;
  }

  private recordHistory(event: string, payload: unknown): void {
    this.history.push({ event, payload, timestamp: Date.now() });

    // Trim history if it exceeds the cap
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(this.history.length - this.maxHistory);
    }
  }
}
