export { authManifest } from './manifest';
export { AuthService } from './auth-service';
export type {
  UserStatus, SSOProvider, AuditSeverity, PermissionAction,
  AuthUser, AuthRole, AuthSession, AuthApiKey, AuditLogEntry,
  PermissionRule, RolePermissions,
  AuthSettings,
} from './auth-service';
export { BUILT_IN_ROLES, DEFAULT_AUTH_SETTINGS } from './auth-service';
