/**
 * Phase Zed.8 - Default Role Definitions
 *
 * Exported as a constant array so that other modules (UI role pickers,
 * seed data generators, permission audit reports) can reference the
 * full set of built-in role templates without instantiating the engine.
 *
 * The PermissionEngine registers these automatically in its constructor,
 * but they are available here for read-only consumption elsewhere.
 */

import type { Role } from '../types/permissions';

/** All built-in role templates for the Concrete construction platform. */
export const DEFAULT_ROLES: readonly Role[] = [
  // -----------------------------------------------------------------------
  // Administrator
  // -----------------------------------------------------------------------
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access',
    permissions: [{ resource: '*', action: 'admin' }],
  },

  // -----------------------------------------------------------------------
  // Financial Controller
  // -----------------------------------------------------------------------
  {
    id: 'controller',
    name: 'Financial Controller',
    description: 'Full financial access, module management',
    permissions: [
      { resource: 'gl/*', action: 'admin' },
      { resource: 'job/*', action: 'admin' },
      { resource: 'ap/*', action: 'admin' },
      { resource: 'ar/*', action: 'admin' },
      { resource: 'payroll/*', action: 'read' },
      { resource: 'payroll/*', action: 'approve' },
    ],
  },

  // -----------------------------------------------------------------------
  // Project Manager
  // -----------------------------------------------------------------------
  {
    id: 'project_manager',
    name: 'Project Manager',
    description: 'Job and project management',
    permissions: [
      { resource: 'job/*', action: 'read' },
      { resource: 'job/*', action: 'update' },
      { resource: 'sub/*', action: 'read' },
      { resource: 'sub/*', action: 'update' },
      { resource: 'proj/*', action: 'admin' },
      { resource: 'doc/*', action: 'admin' },
    ],
  },

  // -----------------------------------------------------------------------
  // AP Clerk
  // -----------------------------------------------------------------------
  {
    id: 'ap_clerk',
    name: 'AP Clerk',
    description: 'Accounts payable data entry',
    permissions: [
      { resource: 'ap/*', action: 'create' },
      { resource: 'ap/*', action: 'read' },
      { resource: 'ap/*', action: 'update' },
    ],
  },

  // -----------------------------------------------------------------------
  // AR Clerk
  // -----------------------------------------------------------------------
  {
    id: 'ar_clerk',
    name: 'AR Clerk',
    description: 'Accounts receivable and billing',
    permissions: [
      { resource: 'ar/*', action: 'create' },
      { resource: 'ar/*', action: 'read' },
      { resource: 'ar/*', action: 'update' },
    ],
  },

  // -----------------------------------------------------------------------
  // Payroll Administrator
  // -----------------------------------------------------------------------
  {
    id: 'payroll_admin',
    name: 'Payroll Administrator',
    description: 'Full payroll access',
    permissions: [
      { resource: 'payroll/*', action: 'admin' },
      { resource: 'union/*', action: 'admin' },
    ],
    fieldRestrictions: [],
  },

  // -----------------------------------------------------------------------
  // Payroll Clerk
  // -----------------------------------------------------------------------
  {
    id: 'payroll_clerk',
    name: 'Payroll Clerk',
    description: 'Payroll data entry and time processing',
    permissions: [
      { resource: 'payroll/timeEntry', action: 'create' },
      { resource: 'payroll/timeEntry', action: 'read' },
      { resource: 'payroll/timeEntry', action: 'update' },
      { resource: 'payroll/employee', action: 'read' },
      { resource: 'payroll/check', action: 'read' },
      { resource: 'union/rate', action: 'read' },
    ],
    fieldRestrictions: [
      { collection: 'payroll/employee', field: 'ssn', access: 'hidden' },
      { collection: 'payroll/employee', field: 'salary', access: 'hidden' },
    ],
  },

  // -----------------------------------------------------------------------
  // Estimator
  // -----------------------------------------------------------------------
  {
    id: 'estimator',
    name: 'Estimator',
    description: 'Estimating and bidding',
    permissions: [
      { resource: 'job/estimate', action: 'admin' },
      { resource: 'job/bid', action: 'admin' },
      { resource: 'job/costCode', action: 'read' },
      { resource: 'sub/prequalification', action: 'read' },
    ],
  },

  // -----------------------------------------------------------------------
  // Field Foreman
  // -----------------------------------------------------------------------
  {
    id: 'foreman',
    name: 'Field Foreman',
    description: 'Field operations',
    permissions: [
      { resource: 'payroll/timeEntry', action: 'create' },
      { resource: 'payroll/timeEntry', action: 'read' },
      { resource: 'proj/dailyLog', action: 'create' },
      { resource: 'proj/dailyLog', action: 'read' },
      { resource: 'safety/*', action: 'create' },
      { resource: 'safety/*', action: 'read' },
      { resource: 'equip/usage', action: 'create' },
    ],
  },

  // -----------------------------------------------------------------------
  // Field Technician
  // -----------------------------------------------------------------------
  {
    id: 'technician',
    name: 'Field Technician',
    description: 'Equipment operation and maintenance logging',
    permissions: [
      { resource: 'equip/usage', action: 'create' },
      { resource: 'equip/usage', action: 'read' },
      { resource: 'equip/maintenance', action: 'create' },
      { resource: 'equip/maintenance', action: 'read' },
      { resource: 'safety/incident', action: 'create' },
      { resource: 'safety/incident', action: 'read' },
    ],
  },

  // -----------------------------------------------------------------------
  // Read Only
  // -----------------------------------------------------------------------
  {
    id: 'readonly',
    name: 'Read Only',
    description: 'View-only access to all data',
    permissions: [{ resource: '*', action: 'read' }],
  },
] as const;

/**
 * Lookup a single default role by ID.
 */
export function getDefaultRole(roleId: string): Role | undefined {
  return DEFAULT_ROLES.find((r) => r.id === roleId);
}

/**
 * Return the list of all default role IDs.
 */
export function getDefaultRoleIds(): string[] {
  return DEFAULT_ROLES.map((r) => r.id);
}
