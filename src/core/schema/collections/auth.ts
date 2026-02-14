/**
 * Auth module collection schemas.
 * Phase 16: user, role, session, apiKey, auditLog.
 */

import type { SchemaDef } from '../../types/schema';

export const authSchemas: SchemaDef[] = [
  {
    collection: 'auth/user',
    module: 'auth',
    version: 1,
    fields: [
      { name: 'email', type: 'string', required: true, label: 'Email' },
      { name: 'username', type: 'string', required: true, label: 'Username' },
      { name: 'displayName', type: 'string', required: true, label: 'Display Name' },
      { name: 'passwordHash', type: 'string', label: 'Password Hash' },
      { name: 'roleId', type: 'id', label: 'Role' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive', 'locked', 'pending'], label: 'Status' },
      { name: 'mfaEnabled', type: 'boolean', label: 'MFA Enabled' },
      { name: 'mfaSecret', type: 'string', label: 'MFA Secret' },
      { name: 'lastLoginAt', type: 'date', label: 'Last Login' },
      { name: 'failedLoginAttempts', type: 'number', label: 'Failed Login Attempts' },
      { name: 'lockedUntil', type: 'date', label: 'Locked Until' },
      { name: 'passwordChangedAt', type: 'date', label: 'Password Changed At' },
      { name: 'phone', type: 'string', label: 'Phone' },
      { name: 'avatar', type: 'string', label: 'Avatar URL' },
      { name: 'department', type: 'string', label: 'Department' },
      { name: 'title', type: 'string', label: 'Title' },
      { name: 'entityId', type: 'id', label: 'Entity' },
      { name: 'ssoProvider', type: 'enum', enum: ['none', 'saml', 'oidc', 'google', 'microsoft'], label: 'SSO Provider' },
      { name: 'ssoExternalId', type: 'string', label: 'SSO External ID' },
      { name: 'preferences', type: 'string', label: 'Preferences JSON' },
    ],
    relations: [
      { foreignKey: 'roleId', collection: 'auth/role', type: 'belongsTo', cascade: 'nullify' },
      { foreignKey: 'entityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'auth/role',
    module: 'auth',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Role Name' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'permissions', type: 'string', required: true, label: 'Permissions JSON' },
      { name: 'isBuiltIn', type: 'boolean', label: 'Built-in Role' },
      { name: 'priority', type: 'number', label: 'Priority' },
    ],
    relations: [],
  },
  {
    collection: 'auth/session',
    module: 'auth',
    version: 1,
    fields: [
      { name: 'userId', type: 'id', required: true, label: 'User' },
      { name: 'token', type: 'string', required: true, label: 'Session Token' },
      { name: 'ipAddress', type: 'string', label: 'IP Address' },
      { name: 'userAgent', type: 'string', label: 'User Agent' },
      { name: 'expiresAt', type: 'date', required: true, label: 'Expires At' },
      { name: 'lastActivityAt', type: 'date', label: 'Last Activity' },
      { name: 'isActive', type: 'boolean', label: 'Is Active' },
    ],
    relations: [
      { foreignKey: 'userId', collection: 'auth/user', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'auth/apiKey',
    module: 'auth',
    version: 1,
    fields: [
      { name: 'userId', type: 'id', required: true, label: 'User' },
      { name: 'name', type: 'string', required: true, label: 'Key Name' },
      { name: 'keyHash', type: 'string', required: true, label: 'Key Hash' },
      { name: 'keyPrefix', type: 'string', label: 'Key Prefix' },
      { name: 'permissions', type: 'string', label: 'Permissions JSON' },
      { name: 'expiresAt', type: 'date', label: 'Expires At' },
      { name: 'lastUsedAt', type: 'date', label: 'Last Used' },
      { name: 'isRevoked', type: 'boolean', label: 'Is Revoked' },
      { name: 'revokedAt', type: 'date', label: 'Revoked At' },
    ],
    relations: [
      { foreignKey: 'userId', collection: 'auth/user', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'auth/auditLog',
    module: 'auth',
    version: 1,
    fields: [
      { name: 'userId', type: 'id', label: 'User' },
      { name: 'username', type: 'string', label: 'Username' },
      { name: 'action', type: 'string', required: true, label: 'Action' },
      { name: 'resource', type: 'string', label: 'Resource' },
      { name: 'resourceId', type: 'string', label: 'Resource ID' },
      { name: 'details', type: 'string', label: 'Details JSON' },
      { name: 'ipAddress', type: 'string', label: 'IP Address' },
      { name: 'userAgent', type: 'string', label: 'User Agent' },
      { name: 'timestamp', type: 'date', required: true, label: 'Timestamp' },
      { name: 'severity', type: 'enum', enum: ['info', 'warning', 'critical'], label: 'Severity' },
    ],
    relations: [
      { foreignKey: 'userId', collection: 'auth/user', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
];
