/**
 * Phase Zed.9 - Notification & Alert System
 * Barrel export for the notifications sub-system.
 */

export { NotificationManager } from './manager';
export type { NotifyParams } from './manager';
export {
  DEFAULT_ALERT_RULES,
  getDefaultRule,
  getDefaultRuleIds,
} from './rules';
