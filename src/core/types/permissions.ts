/**
 * Phase Zed.2 - Permission Types
 * Role-based access control with field-level restrictions.
 */

/** Single permission entry */
export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'admin';
}

/** Field-level access restriction */
export interface FieldRestriction {
  collection: string;
  field: string;
  access: 'hidden' | 'readonly' | 'full';
}

/** Segregation of duties rule */
export interface SegregationRule {
  actions: string[];
  resource: string;
  sameRecord: boolean;
}

/** Role definition with permissions */
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  entityScope?: string[];
  fieldRestrictions?: FieldRestriction[];
}

/** User's effective permissions */
export interface UserPermissions {
  userId: string;
  roles: string[];
  directPermissions?: Permission[];
  entityScope?: string[];
}

/** Result of a permission check */
export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}
