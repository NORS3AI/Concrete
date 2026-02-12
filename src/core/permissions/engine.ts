/**
 * Phase Zed.8 - Permission & Access Control Engine
 *
 * Role-based permission checking with entity scoping, field-level
 * restrictions, segregation-of-duties enforcement, and wildcard
 * resource matching.  Designed for client-side use in the Concrete
 * construction platform.  When no user is set the engine defaults to
 * "allow all" (Phase Zed has no backend auth).
 */

import type {
  Permission,
  Role,
  FieldRestriction,
  SegregationRule,
  UserPermissions,
  PermissionCheck,
} from '../types/permissions';
import type { EventBus } from '../events/bus';

// ---------------------------------------------------------------------------
// Wildcard helpers
// ---------------------------------------------------------------------------

/**
 * Test whether a permission resource pattern matches a concrete resource.
 *
 * Examples:
 *   `'*'`              matches everything
 *   `'gl/*'`           matches `'gl/account'`, `'gl/journal'`, etc.
 *   `'job/estimate'`   matches only `'job/estimate'`
 */
function resourceMatches(pattern: string, resource: string): boolean {
  if (pattern === '*') return true;
  if (pattern === resource) return true;

  // Convert glob-style pattern to RegExp
  if (pattern.includes('*')) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
    return new RegExp(regexStr).test(resource);
  }

  return false;
}

// ---------------------------------------------------------------------------
// PermissionEngine
// ---------------------------------------------------------------------------

export class PermissionEngine {
  private currentUser: UserPermissions | null = null;
  private roles: Map<string, Role> = new Map();
  private segregationRules: SegregationRule[] = [];
  private _store: unknown;
  private events: EventBus;

  constructor(store: unknown, events: EventBus) {
    this._store = store;
    this.events = events;
    this.registerDefaultRoles();
  }

  /** Access the underlying store (for future permission persistence). */
  get store(): unknown {
    return this._store;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Set the current user's permissions context. */
  setUser(user: UserPermissions): void {
    this.currentUser = user;
    this.events.emit('permissions.user.changed', { userId: user.userId });
  }

  /** Clear the current user (return to anonymous / allow-all mode). */
  clearUser(): void {
    this.currentUser = null;
    this.events.emit('permissions.user.cleared', {});
  }

  /** Register (or replace) a role definition. */
  registerRole(role: Role): void {
    this.roles.set(role.id, role);
  }

  /** Remove a role definition. */
  unregisterRole(roleId: string): void {
    this.roles.delete(roleId);
  }

  /** Retrieve a role definition by ID. */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /** Return all registered roles. */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /** Add a segregation-of-duties rule. */
  addSegregationRule(rule: SegregationRule): void {
    this.segregationRules.push(rule);
  }

  // -----------------------------------------------------------------------
  // Permission checks
  // -----------------------------------------------------------------------

  /**
   * Check whether the current user can perform `action` on `resource`.
   *
   * If no user is set, the check returns `{ allowed: true }` -- in Phase
   * Zed the app runs without backend authentication and everything is
   * permitted by default.
   *
   * The optional `context` map can carry additional metadata (e.g. the
   * record being operated on) for future fine-grained rules.
   */
  can(
    action: string,
    resource: string,
    context?: Record<string, unknown>,
  ): PermissionCheck {
    if (!this.currentUser) {
      return { allowed: true };
    }

    const allPermissions = this.getEffectivePermissions();

    // Check whether any permission grants the requested action
    const hasPermission = allPermissions.some(
      (p) =>
        resourceMatches(p.resource, resource) &&
        (p.action === action || p.action === 'admin'),
    );

    if (!hasPermission) {
      return {
        allowed: false,
        reason: `Missing permission: ${action} on ${resource}`,
      };
    }

    // Segregation of duties check
    const segregationViolation = this.checkSegregation(
      action,
      resource,
      context,
    );
    if (segregationViolation) {
      return {
        allowed: false,
        reason: segregationViolation,
      };
    }

    return { allowed: true };
  }

  /**
   * Convenience shorthand -- returns a plain boolean.
   */
  canDo(action: string, resource: string): boolean {
    return this.can(action, resource).allowed;
  }

  /**
   * Check if the current user can access a specific entity.
   *
   * When the user has no `entityScope` restriction (or no user is set at
   * all), access is granted to all entities.
   */
  canAccessEntity(entityId: string): boolean {
    if (!this.currentUser) return true;
    if (
      !this.currentUser.entityScope ||
      this.currentUser.entityScope.length === 0
    ) {
      return true;
    }
    return this.currentUser.entityScope.includes(entityId);
  }

  /**
   * Check whether the current user can see / edit a specific field.
   *
   * Roles can declare `fieldRestrictions` that limit visibility of certain
   * fields within a collection.  The *most restrictive* restriction across
   * all of the user's roles wins.
   */
  canSeeField(
    collection: string,
    field: string,
  ): 'hidden' | 'readonly' | 'full' {
    if (!this.currentUser) return 'full';

    const roles = this.currentUser.roles
      .map((r) => this.roles.get(r))
      .filter(Boolean) as Role[];

    let mostRestrictive: 'hidden' | 'readonly' | 'full' = 'full';

    for (const role of roles) {
      if (!role.fieldRestrictions) continue;
      const restriction = role.fieldRestrictions.find(
        (fr: FieldRestriction) =>
          fr.collection === collection && fr.field === field,
      );
      if (restriction) {
        if (restriction.access === 'hidden') return 'hidden';
        if (restriction.access === 'readonly') {
          mostRestrictive = 'readonly';
        }
      }
    }

    return mostRestrictive;
  }

  /**
   * Convenience: can the current user access a given module (tab / screen)?
   * Modules are treated as resources that require at least `read` access.
   */
  canAccessModule(moduleId: string): boolean {
    return this.can('read', moduleId).allowed;
  }

  /**
   * Filter an array of entity IDs down to those the user can access.
   */
  filterEntities(entityIds: string[]): string[] {
    return entityIds.filter((id) => this.canAccessEntity(id));
  }

  /**
   * Apply field restrictions to a record object, returning a sanitised
   * copy.  Hidden fields are removed; readonly fields are kept.
   */
  applyFieldRestrictions(
    collection: string,
    record: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      const access = this.canSeeField(collection, key);
      if (access !== 'hidden') {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Return the current user's effective permissions (or null if anonymous).
   */
  getCurrentUser(): UserPermissions | null {
    return this.currentUser;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Merge all permissions from the user's roles + direct grants. */
  private getEffectivePermissions(): Permission[] {
    if (!this.currentUser) return [];

    const permissions: Permission[] = [
      ...(this.currentUser.directPermissions ?? []),
    ];

    for (const roleId of this.currentUser.roles) {
      const role = this.roles.get(roleId);
      if (role) {
        permissions.push(...role.permissions);
      }
    }

    return permissions;
  }

  /**
   * Check segregation-of-duties rules.
   *
   * If any rule is violated, return a human-readable reason string.
   * Otherwise return `null`.
   */
  private checkSegregation(
    action: string,
    resource: string,
    _context?: Record<string, unknown>,
  ): string | null {
    if (!this.currentUser || this.segregationRules.length === 0) return null;

    const allPermissions = this.getEffectivePermissions();

    for (const rule of this.segregationRules) {
      if (!resourceMatches(rule.resource, resource)) continue;

      // The rule's `actions` list must contain the current action
      if (!rule.actions.includes(action)) continue;

      // The user must NOT also hold any of the *other* actions in the list
      const otherActions = rule.actions.filter((a) => a !== action);
      for (const other of otherActions) {
        const holdsOther = allPermissions.some(
          (p) =>
            resourceMatches(p.resource, resource) &&
            (p.action === other || p.action === 'admin'),
        );
        if (holdsOther) {
          return (
            `Segregation of duties violation: user cannot hold both ` +
            `"${action}" and "${other}" on "${resource}"`
          );
        }
      }
    }

    return null;
  }

  // -----------------------------------------------------------------------
  // Default role registration
  // -----------------------------------------------------------------------

  /** Register the built-in role templates shipped with the platform. */
  private registerDefaultRoles(): void {
    // Administrator - full system access
    this.registerRole({
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access',
      permissions: [{ resource: '*', action: 'admin' }],
    });

    // Financial Controller
    this.registerRole({
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
    });

    // Project Manager
    this.registerRole({
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
    });

    // AP Clerk
    this.registerRole({
      id: 'ap_clerk',
      name: 'AP Clerk',
      description: 'Accounts payable data entry',
      permissions: [
        { resource: 'ap/*', action: 'create' },
        { resource: 'ap/*', action: 'read' },
        { resource: 'ap/*', action: 'update' },
      ],
    });

    // AR Clerk
    this.registerRole({
      id: 'ar_clerk',
      name: 'AR Clerk',
      description: 'Accounts receivable and billing',
      permissions: [
        { resource: 'ar/*', action: 'create' },
        { resource: 'ar/*', action: 'read' },
        { resource: 'ar/*', action: 'update' },
      ],
    });

    // Payroll Administrator
    this.registerRole({
      id: 'payroll_admin',
      name: 'Payroll Administrator',
      description: 'Full payroll access',
      permissions: [
        { resource: 'payroll/*', action: 'admin' },
        { resource: 'union/*', action: 'admin' },
      ],
      fieldRestrictions: [],
    });

    // Payroll Clerk
    this.registerRole({
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
    });

    // Estimator
    this.registerRole({
      id: 'estimator',
      name: 'Estimator',
      description: 'Estimating and bidding',
      permissions: [
        { resource: 'job/estimate', action: 'admin' },
        { resource: 'job/bid', action: 'admin' },
        { resource: 'job/costCode', action: 'read' },
        { resource: 'sub/prequalification', action: 'read' },
      ],
    });

    // Field Foreman
    this.registerRole({
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
    });

    // Technician
    this.registerRole({
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
    });

    // Read Only
    this.registerRole({
      id: 'readonly',
      name: 'Read Only',
      description: 'View-only access to all data',
      permissions: [{ resource: '*', action: 'read' }],
    });
  }
}
