/**
 * Phase Zed.9 - Default Alert Rules
 *
 * Pre-configured alert rules for common construction-industry operational
 * thresholds.  These are loaded into the NotificationManager at startup
 * and can be toggled on/off or customised by the user at runtime.
 */

import type { AlertRule } from '../types/notifications';

/** Default alert rules shipped with the Concrete platform. */
export const DEFAULT_ALERT_RULES: readonly AlertRule[] = [
  // -----------------------------------------------------------------------
  // Cash & Treasury
  // -----------------------------------------------------------------------
  {
    id: 'negative-cash',
    name: 'Negative Cash Flow',
    collection: 'core/company',
    field: 'cashFlow',
    operator: '<',
    value: 0,
    notificationType: 'critical',
    enabled: true,
  },
  {
    id: 'low-cash-reserve',
    name: 'Low Cash Reserve',
    collection: 'core/company',
    field: 'cashBalance',
    operator: '<',
    value: 50_000,
    notificationType: 'warning',
    enabled: true,
  },

  // -----------------------------------------------------------------------
  // Job Costing
  // -----------------------------------------------------------------------
  {
    id: 'low-margin',
    name: 'Low Job Margin',
    collection: 'job/job',
    field: 'margin',
    operator: '<',
    value: 0.05,
    notificationType: 'warning',
    enabled: true,
  },
  {
    id: 'budget-overrun',
    name: 'Budget Overrun',
    collection: 'job/budget',
    field: 'variancePercent',
    operator: '>',
    value: 0.20,
    notificationType: 'warning',
    enabled: true,
  },
  {
    id: 'cost-overrun-critical',
    name: 'Critical Cost Overrun',
    collection: 'job/budget',
    field: 'variancePercent',
    operator: '>',
    value: 0.50,
    notificationType: 'critical',
    enabled: true,
  },
  {
    id: 'negative-job-margin',
    name: 'Negative Job Margin',
    collection: 'job/job',
    field: 'margin',
    operator: '<',
    value: 0,
    notificationType: 'critical',
    enabled: true,
  },

  // -----------------------------------------------------------------------
  // Accounts Payable
  // -----------------------------------------------------------------------
  {
    id: 'overdue-payable',
    name: 'Past Due Payable',
    collection: 'ap/invoice',
    field: 'daysOverdue',
    operator: '>',
    value: 0,
    notificationType: 'critical',
    enabled: true,
  },
  {
    id: 'payable-approaching-due',
    name: 'Payable Approaching Due Date',
    collection: 'ap/invoice',
    field: 'daysToDue',
    operator: '<',
    value: 7,
    notificationType: 'warning',
    enabled: true,
  },

  // -----------------------------------------------------------------------
  // Accounts Receivable
  // -----------------------------------------------------------------------
  {
    id: 'overdue-receivable',
    name: 'Past Due Receivable',
    collection: 'ar/invoice',
    field: 'daysOverdue',
    operator: '>',
    value: 0,
    notificationType: 'warning',
    enabled: true,
  },
  {
    id: 'aged-receivable-critical',
    name: 'Aged Receivable (90+ days)',
    collection: 'ar/invoice',
    field: 'daysOverdue',
    operator: '>',
    value: 90,
    notificationType: 'critical',
    enabled: true,
  },

  // -----------------------------------------------------------------------
  // Insurance & Bonds
  // -----------------------------------------------------------------------
  {
    id: 'insurance-expiring',
    name: 'Insurance Expiring',
    collection: 'bond/coi',
    field: 'daysToExpiry',
    operator: '<',
    value: 30,
    notificationType: 'warning',
    enabled: true,
  },
  {
    id: 'insurance-expired',
    name: 'Insurance Expired',
    collection: 'bond/coi',
    field: 'daysToExpiry',
    operator: '<',
    value: 0,
    notificationType: 'critical',
    enabled: true,
  },
  {
    id: 'bond-capacity-low',
    name: 'Bond Capacity Below Threshold',
    collection: 'bond/capacity',
    field: 'remainingPercent',
    operator: '<',
    value: 0.20,
    notificationType: 'warning',
    enabled: true,
  },

  // -----------------------------------------------------------------------
  // Subcontractor
  // -----------------------------------------------------------------------
  {
    id: 'sub-retention-due',
    name: 'Subcontractor Retention Due',
    collection: 'sub/contract',
    field: 'retentionDueDays',
    operator: '<',
    value: 14,
    notificationType: 'action-required',
    enabled: true,
  },
  {
    id: 'sub-coi-expiring',
    name: 'Sub COI Expiring',
    collection: 'sub/coi',
    field: 'daysToExpiry',
    operator: '<',
    value: 30,
    notificationType: 'warning',
    enabled: true,
  },

  // -----------------------------------------------------------------------
  // Payroll
  // -----------------------------------------------------------------------
  {
    id: 'overtime-threshold',
    name: 'Overtime Hours Threshold',
    collection: 'payroll/timeEntry',
    field: 'weeklyHours',
    operator: '>',
    value: 40,
    notificationType: 'info',
    enabled: true,
  },
  {
    id: 'excessive-overtime',
    name: 'Excessive Overtime',
    collection: 'payroll/timeEntry',
    field: 'weeklyHours',
    operator: '>',
    value: 60,
    notificationType: 'warning',
    enabled: true,
  },

  // -----------------------------------------------------------------------
  // Equipment
  // -----------------------------------------------------------------------
  {
    id: 'equip-maintenance-due',
    name: 'Equipment Maintenance Due',
    collection: 'equip/unit',
    field: 'daysToMaintenance',
    operator: '<',
    value: 7,
    notificationType: 'action-required',
    enabled: true,
  },
  {
    id: 'equip-maintenance-overdue',
    name: 'Equipment Maintenance Overdue',
    collection: 'equip/unit',
    field: 'daysToMaintenance',
    operator: '<',
    value: 0,
    notificationType: 'critical',
    enabled: true,
  },

  // -----------------------------------------------------------------------
  // Safety
  // -----------------------------------------------------------------------
  {
    id: 'safety-incident-reported',
    name: 'Safety Incident Reported',
    collection: 'safety/incident',
    field: 'severity',
    operator: '>=',
    value: 3,
    notificationType: 'critical',
    enabled: true,
  },
] as const;

/**
 * Lookup a single default rule by ID.
 */
export function getDefaultRule(ruleId: string): AlertRule | undefined {
  return DEFAULT_ALERT_RULES.find((r) => r.id === ruleId);
}

/**
 * Return all default rule IDs.
 */
export function getDefaultRuleIds(): string[] {
  return DEFAULT_ALERT_RULES.map((r) => r.id);
}
