/**
 * Phase Zed.9 - Notification & Alert System
 *
 * Manages in-app notifications, toast queue, alert-rule evaluation, and
 * per-user notification preferences.  All state is kept in memory and
 * emitted through the EventBus so that UI layers can react accordingly.
 */

import type {
  Notification,
  NotificationType,
  NotificationChannel,
  AlertRule,
  NotificationPreference,
} from '../types/notifications';
import type { EventBus } from '../events/bus';
import { generateId, now } from '../types/base';

// ---------------------------------------------------------------------------
// Priority map (lower number = higher priority)
// ---------------------------------------------------------------------------

const TYPE_PRIORITY: Record<NotificationType, number> = {
  'critical': 0,
  'action-required': 1,
  'warning': 2,
  'info': 3,
  'success': 4,
};

// ---------------------------------------------------------------------------
// NotificationManager
// ---------------------------------------------------------------------------

/** Parameters accepted by {@link NotificationManager.notify}. */
export interface NotifyParams {
  type: NotificationType;
  title: string;
  message: string;
  source?: string;
  entityId?: string;
  link?: string;
  channel?: NotificationChannel;
}

export class NotificationManager {
  private notifications: Notification[] = [];
  private rules: AlertRule[] = [];
  private preferences: Map<string, NotificationPreference> = new Map();
  private events: EventBus;
  private _config: unknown;
  private toastQueue: Notification[] = [];

  constructor(events: EventBus, config: unknown) {
    this.events = events;
    this._config = config;
  }

  /** Access the underlying config (for future preference persistence). */
  get config(): unknown {
    return this._config;
  }

  // -----------------------------------------------------------------------
  // Core operations
  // -----------------------------------------------------------------------

  /**
   * Create and store a notification.
   *
   * Emits `notification.created` on the event bus.
   * For `critical` and `action-required` types, also emits a `toast.show`
   * event so that the UI can present an ephemeral toast.
   */
  notify(params: NotifyParams): Notification {
    const notification: Notification = {
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
      version: 1,
      type: params.type,
      title: params.title,
      message: params.message,
      source: params.source ?? 'system',
      entityId: params.entityId,
      link: params.link,
      read: false,
      acknowledged: false,
      channel: params.channel ?? 'panel',
    };

    this.notifications.push(notification);
    this.events.emit('notification.created', notification);

    // Auto-show toast for high-priority notification types
    if (params.type === 'critical' || params.type === 'action-required') {
      this.toastQueue.push(notification);
      this.events.emit('toast.show', {
        id: notification.id,
        type: params.type,
        title: params.title,
        message: params.message,
      });
    }

    return notification;
  }

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  /**
   * Retrieve notifications, optionally filtered.
   *
   * Results are sorted by priority (critical first), then by creation
   * date (newest first within the same priority tier).
   */
  getAll(options?: {
    unreadOnly?: boolean;
    type?: NotificationType;
    source?: string;
    limit?: number;
  }): Notification[] {
    let result = [...this.notifications];

    if (options?.unreadOnly) {
      result = result.filter((n) => !n.read);
    }
    if (options?.type) {
      result = result.filter((n) => n.type === options.type);
    }
    if (options?.source) {
      result = result.filter((n) => n.source === options.source);
    }

    // Sort: priority asc, then newest first
    result.sort((a, b) => {
      const pa = TYPE_PRIORITY[a.type] ?? 99;
      const pb = TYPE_PRIORITY[b.type] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.createdAt.localeCompare(a.createdAt);
    });

    if (options?.limit && options.limit > 0) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  /** Count of unread notifications. */
  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  /** Count of unread notifications by type. */
  getUnreadCountByType(): Record<NotificationType, number> {
    const counts: Record<NotificationType, number> = {
      'critical': 0,
      'action-required': 0,
      'warning': 0,
      'info': 0,
      'success': 0,
    };
    for (const n of this.notifications) {
      if (!n.read) {
        counts[n.type] += 1;
      }
    }
    return counts;
  }

  /** Get a single notification by ID. */
  getById(id: string): Notification | undefined {
    return this.notifications.find((n) => n.id === id);
  }

  // -----------------------------------------------------------------------
  // State mutations
  // -----------------------------------------------------------------------

  /** Mark a single notification as read. */
  markRead(id: string): void {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      notification.updatedAt = now();
      notification.version += 1;
      this.events.emit('notification.read', { id });
    }
  }

  /** Mark all notifications as read. */
  markAllRead(): void {
    let changed = false;
    for (const n of this.notifications) {
      if (!n.read) {
        n.read = true;
        n.updatedAt = now();
        n.version += 1;
        changed = true;
      }
    }
    if (changed) {
      this.events.emit('notification.allRead', {});
    }
  }

  /** Acknowledge (dismiss) a notification. */
  acknowledge(id: string): void {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification && !notification.acknowledged) {
      notification.acknowledged = true;
      notification.read = true;
      notification.updatedAt = now();
      notification.version += 1;
      this.events.emit('notification.acknowledged', { id });
    }
  }

  /**
   * Snooze a notification until the given ISO date-time.
   * The notification is marked as read and will reappear after the snooze
   * period expires (the UI layer is responsible for checking `snoozedUntil`).
   */
  snooze(id: string, until: string): void {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) {
      notification.snoozedUntil = until;
      notification.read = true;
      notification.updatedAt = now();
      notification.version += 1;
      this.events.emit('notification.snoozed', { id, until });
    }
  }

  /**
   * Remove a single notification entirely.
   */
  remove(id: string): void {
    const idx = this.notifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      this.notifications.splice(idx, 1);
      this.events.emit('notification.removed', { id });
    }
  }

  /** Clear all notifications. */
  clear(): void {
    this.notifications = [];
    this.toastQueue = [];
    this.events.emit('notification.cleared', {});
  }

  // -----------------------------------------------------------------------
  // Toast queue
  // -----------------------------------------------------------------------

  /** Pop the next toast from the queue (FIFO). Returns `undefined` if empty. */
  dequeueToast(): Notification | undefined {
    return this.toastQueue.shift();
  }

  /** Peek at the toast queue without removing entries. */
  peekToastQueue(): readonly Notification[] {
    return this.toastQueue;
  }

  // -----------------------------------------------------------------------
  // Alert rules
  // -----------------------------------------------------------------------

  /** Register an alert rule. */
  addRule(rule: AlertRule): void {
    // Replace if already exists with same ID
    const idx = this.rules.findIndex((r) => r.id === rule.id);
    if (idx !== -1) {
      this.rules[idx] = rule;
    } else {
      this.rules.push(rule);
    }
    this.events.emit('alertRule.added', { id: rule.id });
  }

  /** Remove an alert rule by ID. */
  removeRule(id: string): void {
    const idx = this.rules.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.rules.splice(idx, 1);
      this.events.emit('alertRule.removed', { id });
    }
  }

  /** Enable or disable an alert rule. */
  toggleRule(id: string, enabled: boolean): void {
    const rule = this.rules.find((r) => r.id === id);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /** Get all registered alert rules. */
  getRules(): AlertRule[] {
    return [...this.rules];
  }

  /**
   * Evaluate all enabled alert rules against a record change.
   *
   * Typically called by the store layer after an insert or update:
   * ```
   * notificationManager.evaluateRules('job/job', updatedJobRecord);
   * ```
   */
  evaluateRules(
    collection: string,
    record: Record<string, unknown>,
  ): Notification[] {
    const triggered: Notification[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (rule.collection !== collection) continue;

      const fieldValue = record[rule.field];
      if (fieldValue === undefined || fieldValue === null) continue;

      let ruleTriggered = false;

      switch (rule.operator) {
        case '<':
          ruleTriggered =
            typeof fieldValue === 'number' &&
            typeof rule.value === 'number' &&
            fieldValue < rule.value;
          break;

        case '<=':
          ruleTriggered =
            typeof fieldValue === 'number' &&
            typeof rule.value === 'number' &&
            fieldValue <= rule.value;
          break;

        case '>':
          ruleTriggered =
            typeof fieldValue === 'number' &&
            typeof rule.value === 'number' &&
            fieldValue > rule.value;
          break;

        case '>=':
          ruleTriggered =
            typeof fieldValue === 'number' &&
            typeof rule.value === 'number' &&
            fieldValue >= rule.value;
          break;

        case '=':
          ruleTriggered = fieldValue === rule.value;
          break;

        case '!=':
          ruleTriggered = fieldValue !== rule.value;
          break;

        case 'contains':
          ruleTriggered =
            typeof fieldValue === 'string' &&
            typeof rule.value === 'string' &&
            fieldValue.includes(rule.value);
          break;

        case 'not_contains':
          ruleTriggered =
            typeof fieldValue === 'string' &&
            typeof rule.value === 'string' &&
            !fieldValue.includes(rule.value);
          break;

        default:
          // Unknown operator -- skip silently
          break;
      }

      if (ruleTriggered) {
        const notification = this.notify({
          type: rule.notificationType,
          title: rule.name,
          message:
            `${rule.field} is ${rule.operator} ${String(rule.value)} ` +
            `(current: ${String(fieldValue)})`,
          source: 'alert-rule',
          entityId: (record['id'] as string) ?? undefined,
        });
        triggered.push(notification);
      }
    }

    return triggered;
  }

  // -----------------------------------------------------------------------
  // Preferences
  // -----------------------------------------------------------------------

  /** Set a user's notification preference for a given type. */
  setPreference(pref: NotificationPreference): void {
    const key = `${pref.userId}::${pref.notificationType}`;
    this.preferences.set(key, pref);
  }

  /** Get a user's notification preference for a given type. */
  getPreference(
    userId: string,
    notificationType: NotificationType,
  ): NotificationPreference | undefined {
    const key = `${userId}::${notificationType}`;
    return this.preferences.get(key);
  }

  /** Get all preferences for a user. */
  getUserPreferences(userId: string): NotificationPreference[] {
    const results: NotificationPreference[] = [];
    for (const pref of this.preferences.values()) {
      if (pref.userId === userId) {
        results.push(pref);
      }
    }
    return results;
  }

  /**
   * Check whether a given notification should be delivered on a specific
   * channel based on user preferences.  Returns `true` if no preference
   * is set (default = deliver everywhere).
   */
  shouldDeliver(
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel,
  ): boolean {
    const pref = this.getPreference(userId, notificationType);
    if (!pref) return true; // No preference = deliver
    if (!pref.enabled) return false;
    return pref.channels.includes(channel);
  }
}
