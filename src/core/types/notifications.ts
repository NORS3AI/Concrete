/**
 * Phase Zed.2 - Notification Types
 * Alerts, notifications, and notification preferences.
 */

import type { BaseEntity } from './base';

/** Notification severity levels */
export type NotificationType = 'critical' | 'warning' | 'info' | 'success' | 'action-required';

/** Delivery channels for notifications */
export type NotificationChannel = 'toast' | 'panel' | 'email' | 'push' | 'webhook';

/** A notification entity */
export interface Notification extends BaseEntity {
  type: NotificationType;
  title: string;
  message: string;
  source: string;
  entityId?: string;
  link?: string;
  read: boolean;
  acknowledged: boolean;
  snoozedUntil?: string;
  channel: NotificationChannel;
}

/** Rule for triggering automatic alerts */
export interface AlertRule {
  id: string;
  name: string;
  collection: string;
  field: string;
  operator: string;
  value: unknown;
  notificationType: NotificationType;
  enabled: boolean;
}

/** User preference for notification delivery */
export interface NotificationPreference {
  userId: string;
  notificationType: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
}
