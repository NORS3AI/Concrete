/**
 * Concrete -- Auth (Authentication & Authorization) Service
 *
 * Core service layer for the Auth module. Provides user management,
 * role-based access control (RBAC), session management, API key
 * generation, audit logging, MFA stubs, password management,
 * and permission checking.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type UserStatus = 'active' | 'inactive' | 'locked' | 'pending';
export type SSOProvider = 'none' | 'saml' | 'oidc' | 'google' | 'microsoft';
export type AuditSeverity = 'info' | 'warning' | 'critical';
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'approve' | 'admin';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface AuthUser {
  [key: string]: unknown;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  roleId: string;
  status: UserStatus;
  mfaEnabled: boolean;
  mfaSecret: string;
  lastLoginAt: string;
  failedLoginAttempts: number;
  lockedUntil: string;
  passwordChangedAt: string;
  phone: string;
  avatar: string;
  department: string;
  title: string;
  entityId: string;
  ssoProvider: SSOProvider;
  ssoExternalId: string;
  preferences: string;
}

export interface AuthRole {
  [key: string]: unknown;
  name: string;
  description: string;
  permissions: string;
  isBuiltIn: boolean;
  priority: number;
}

export interface AuthSession {
  [key: string]: unknown;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: string;
  lastActivityAt: string;
  isActive: boolean;
}

export interface AuthApiKey {
  [key: string]: unknown;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: string;
  expiresAt: string;
  lastUsedAt: string;
  isRevoked: boolean;
  revokedAt: string;
}

export interface AuditLogEntry {
  [key: string]: unknown;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: AuditSeverity;
}

// ---------------------------------------------------------------------------
// Permission / Role Types
// ---------------------------------------------------------------------------

export interface PermissionRule {
  resource: string;
  actions: PermissionAction[];
}

export interface RolePermissions {
  rules: PermissionRule[];
}

// ---------------------------------------------------------------------------
// Built-in Role Definitions
// ---------------------------------------------------------------------------

export const BUILT_IN_ROLES: {
  name: string;
  description: string;
  priority: number;
  permissions: RolePermissions;
}[] = [
  {
    name: 'Admin',
    description: 'Full system access. Can manage users, roles, and all system settings.',
    priority: 100,
    permissions: {
      rules: [
        { resource: '*', actions: ['create', 'read', 'update', 'delete', 'export', 'approve', 'admin'] },
      ],
    },
  },
  {
    name: 'Controller',
    description: 'Financial controller with access to all financial modules and reporting.',
    priority: 90,
    permissions: {
      rules: [
        { resource: 'gl.*', actions: ['create', 'read', 'update', 'delete', 'export', 'approve'] },
        { resource: 'ap.*', actions: ['create', 'read', 'update', 'delete', 'export', 'approve'] },
        { resource: 'ar.*', actions: ['create', 'read', 'update', 'delete', 'export', 'approve'] },
        { resource: 'payroll.*', actions: ['create', 'read', 'update', 'delete', 'export', 'approve'] },
        { resource: 'job.*', actions: ['create', 'read', 'update', 'export'] },
        { resource: 'report.*', actions: ['read', 'export'] },
        { resource: 'auth.user', actions: ['read'] },
        { resource: 'auth.auditLog', actions: ['read'] },
      ],
    },
  },
  {
    name: 'PM',
    description: 'Project Manager with access to job costing, budgets, and project reporting.',
    priority: 70,
    permissions: {
      rules: [
        { resource: 'job.*', actions: ['create', 'read', 'update', 'export'] },
        { resource: 'ap.invoice', actions: ['read', 'approve'] },
        { resource: 'ar.invoice', actions: ['read'] },
        { resource: 'sub.*', actions: ['create', 'read', 'update'] },
        { resource: 'report.*', actions: ['read', 'export'] },
      ],
    },
  },
  {
    name: 'AP Clerk',
    description: 'Accounts Payable clerk with access to vendor management and invoice processing.',
    priority: 50,
    permissions: {
      rules: [
        { resource: 'ap.vendor', actions: ['create', 'read', 'update'] },
        { resource: 'ap.invoice', actions: ['create', 'read', 'update'] },
        { resource: 'ap.payment', actions: ['create', 'read'] },
        { resource: 'ap.lienWaiver', actions: ['create', 'read', 'update'] },
        { resource: 'ap.compliance', actions: ['read'] },
        { resource: 'ap.report', actions: ['read'] },
      ],
    },
  },
  {
    name: 'Payroll',
    description: 'Payroll manager with access to payroll processing and employee data.',
    priority: 60,
    permissions: {
      rules: [
        { resource: 'payroll.*', actions: ['create', 'read', 'update', 'export'] },
        { resource: 'hr.employee', actions: ['read'] },
        { resource: 'report.*', actions: ['read'] },
      ],
    },
  },
  {
    name: 'Field',
    description: 'Field supervisor with access to timekeeping, daily logs, and safety.',
    priority: 40,
    permissions: {
      rules: [
        { resource: 'job.dailyLog', actions: ['create', 'read', 'update'] },
        { resource: 'job.timecard', actions: ['create', 'read', 'update'] },
        { resource: 'safety.*', actions: ['create', 'read', 'update'] },
        { resource: 'equip.*', actions: ['read'] },
        { resource: 'job.job', actions: ['read'] },
      ],
    },
  },
  {
    name: 'Read-Only',
    description: 'View-only access to all modules. Cannot create, edit, or delete any records.',
    priority: 10,
    permissions: {
      rules: [
        { resource: '*', actions: ['read'] },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Auth Settings
// ---------------------------------------------------------------------------

export interface AuthSettings {
  sessionTimeoutMinutes: number;
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSpecial: boolean;
  passwordExpiryDays: number;
  mfaRequired: boolean;
  allowedSSOProviders: SSOProvider[];
  corsAllowedOrigins: string[];
  rateLimitRequestsPerMinute: number;
  apiKeyExpiryDays: number;
}

export const DEFAULT_AUTH_SETTINGS: AuthSettings = {
  sessionTimeoutMinutes: 480,
  maxFailedLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: false,
  passwordExpiryDays: 90,
  mfaRequired: false,
  allowedSSOProviders: ['none'],
  corsAllowedOrigins: ['*'],
  rateLimitRequestsPerMinute: 100,
  apiKeyExpiryDays: 365,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Simple stub hash for passwords (not cryptographically secure). */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `stub_hash_${Math.abs(hash).toString(36)}`;
}

/** Generate a random token string. */
function generateToken(length: number = 48): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Generate a prefixed API key. */
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = 'ck_' + generateToken(8);
  const secret = generateToken(32);
  const fullKey = `${prefix}_${secret}`;
  return {
    key: fullKey,
    prefix,
    hash: simpleHash(fullKey),
  };
}

/** Get current ISO timestamp. */
function currentTimestamp(): string {
  return new Date().toISOString();
}

/** Check if a wildcard permission pattern matches a resource. */
function matchResource(pattern: string, resource: string): boolean {
  if (pattern === '*') return true;
  if (pattern === resource) return true;

  // Handle wildcard patterns like 'ap.*'
  if (pattern.includes('*')) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
    return new RegExp(regexStr).test(resource);
  }

  return false;
}

// ---------------------------------------------------------------------------
// AuthService
// ---------------------------------------------------------------------------

export class AuthService {
  private settings: AuthSettings;

  constructor(
    private users: Collection<AuthUser>,
    private roles: Collection<AuthRole>,
    private sessions: Collection<AuthSession>,
    private apiKeys: Collection<AuthApiKey>,
    private auditLogs: Collection<AuditLogEntry>,
    private events: EventBus,
  ) {
    this.settings = { ...DEFAULT_AUTH_SETTINGS };
  }

  // ========================================================================
  // USER CRUD
  // ========================================================================

  /**
   * Create a new user.
   * Validates email uniqueness and username uniqueness.
   * Defaults: status='active', mfaEnabled=false, failedLoginAttempts=0.
   */
  async createUser(data: {
    email: string;
    username: string;
    displayName: string;
    password?: string;
    roleId?: string;
    status?: UserStatus;
    phone?: string;
    avatar?: string;
    department?: string;
    title?: string;
    entityId?: string;
    ssoProvider?: SSOProvider;
    ssoExternalId?: string;
    preferences?: string;
  }): Promise<AuthUser & CollectionMeta> {
    // Validate email uniqueness
    const existingEmail = await this.getUserByEmail(data.email);
    if (existingEmail) {
      throw new Error(`Email "${data.email}" is already registered.`);
    }

    // Validate username uniqueness
    const existingUsername = await this.getUserByUsername(data.username);
    if (existingUsername) {
      throw new Error(`Username "${data.username}" is already taken.`);
    }

    // Validate role exists if specified
    if (data.roleId) {
      const role = await this.roles.get(data.roleId);
      if (!role) {
        throw new Error(`Role not found: ${data.roleId}`);
      }
    }

    const now = currentTimestamp();
    const passwordHash = data.password ? simpleHash(data.password) : '';

    const record = await this.users.insert({
      email: data.email,
      username: data.username,
      displayName: data.displayName,
      passwordHash,
      roleId: data.roleId ?? '',
      status: data.status ?? 'active',
      mfaEnabled: false,
      mfaSecret: '',
      lastLoginAt: '',
      failedLoginAttempts: 0,
      lockedUntil: '',
      passwordChangedAt: passwordHash ? now : '',
      phone: data.phone ?? '',
      avatar: data.avatar ?? '',
      department: data.department ?? '',
      title: data.title ?? '',
      entityId: data.entityId ?? '',
      ssoProvider: data.ssoProvider ?? 'none',
      ssoExternalId: data.ssoExternalId ?? '',
      preferences: data.preferences ?? '{}',
    } as AuthUser);

    this.events.emit('auth.user.created', { user: record });

    await this.logAudit({
      action: 'user.created',
      resource: 'auth/user',
      resourceId: record.id,
      details: JSON.stringify({ email: data.email, username: data.username }),
      severity: 'info',
    });

    return record;
  }

  /**
   * Update an existing user.
   */
  async updateUser(
    id: string,
    changes: Partial<Omit<AuthUser, 'passwordHash'>>,
  ): Promise<AuthUser & CollectionMeta> {
    const existing = await this.users.get(id);
    if (!existing) {
      throw new Error(`User not found: ${id}`);
    }

    // If email is changing, validate uniqueness
    if (changes.email && changes.email !== existing.email) {
      const duplicate = await this.getUserByEmail(changes.email as string);
      if (duplicate) {
        throw new Error(`Email "${changes.email}" is already registered.`);
      }
    }

    // If username is changing, validate uniqueness
    if (changes.username && changes.username !== existing.username) {
      const duplicate = await this.getUserByUsername(changes.username as string);
      if (duplicate) {
        throw new Error(`Username "${changes.username}" is already taken.`);
      }
    }

    // If role is changing, validate it exists
    if (changes.roleId && changes.roleId !== existing.roleId) {
      const role = await this.roles.get(changes.roleId as string);
      if (!role) {
        throw new Error(`Role not found: ${changes.roleId}`);
      }
    }

    const updated = await this.users.update(id, changes as Partial<AuthUser>);
    this.events.emit('auth.user.updated', { user: updated });

    await this.logAudit({
      action: 'user.updated',
      resource: 'auth/user',
      resourceId: id,
      details: JSON.stringify(Object.keys(changes)),
      severity: 'info',
    });

    return updated;
  }

  /**
   * Deactivate a user (set status to inactive).
   * Also terminates all active sessions for this user.
   */
  async deactivateUser(id: string): Promise<AuthUser & CollectionMeta> {
    const existing = await this.users.get(id);
    if (!existing) {
      throw new Error(`User not found: ${id}`);
    }

    // End all active sessions for this user
    const activeSessions = await this.sessions
      .query()
      .where('userId', '=', id)
      .where('isActive', '=', true)
      .execute();

    for (const session of activeSessions) {
      await this.endSession(session.id);
    }

    const updated = await this.users.update(id, {
      status: 'inactive',
    } as Partial<AuthUser>);

    this.events.emit('auth.user.updated', { user: updated });

    await this.logAudit({
      action: 'user.deactivated',
      resource: 'auth/user',
      resourceId: id,
      details: JSON.stringify({ email: existing.email }),
      severity: 'warning',
    });

    return updated;
  }

  /**
   * Get a single user by ID.
   */
  async getUser(id: string): Promise<(AuthUser & CollectionMeta) | null> {
    return this.users.get(id);
  }

  /**
   * Get a user by email address.
   */
  async getUserByEmail(email: string): Promise<(AuthUser & CollectionMeta) | null> {
    return this.users
      .query()
      .where('email', '=', email)
      .limit(1)
      .first();
  }

  /**
   * Get a user by username.
   */
  async getUserByUsername(username: string): Promise<(AuthUser & CollectionMeta) | null> {
    return this.users
      .query()
      .where('username', '=', username)
      .limit(1)
      .first();
  }

  /**
   * Get users with optional filters, ordered by displayName.
   */
  async getUsers(filters?: {
    status?: UserStatus;
    roleId?: string;
    department?: string;
    entityId?: string;
    search?: string;
  }): Promise<(AuthUser & CollectionMeta)[]> {
    const q = this.users.query();

    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.roleId) {
      q.where('roleId', '=', filters.roleId);
    }
    if (filters?.department) {
      q.where('department', '=', filters.department);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }

    q.orderBy('displayName', 'asc');
    const results = await q.execute();

    // Apply search filter client-side (searches across displayName, email, username)
    if (filters?.search) {
      const term = filters.search.toLowerCase();
      return results.filter(
        (u) =>
          u.displayName.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.username.toLowerCase().includes(term),
      );
    }

    return results;
  }

  // ========================================================================
  // ROLE MANAGEMENT
  // ========================================================================

  /**
   * Create a new role.
   * Validates name uniqueness.
   */
  async createRole(data: {
    name: string;
    description?: string;
    permissions: RolePermissions;
    isBuiltIn?: boolean;
    priority?: number;
  }): Promise<AuthRole & CollectionMeta> {
    // Validate name uniqueness
    const existing = await this.getRoleByName(data.name);
    if (existing) {
      throw new Error(`Role name "${data.name}" already exists.`);
    }

    const record = await this.roles.insert({
      name: data.name,
      description: data.description ?? '',
      permissions: JSON.stringify(data.permissions),
      isBuiltIn: data.isBuiltIn ?? false,
      priority: data.priority ?? 0,
    } as AuthRole);

    await this.logAudit({
      action: 'role.created',
      resource: 'auth/role',
      resourceId: record.id,
      details: JSON.stringify({ name: data.name }),
      severity: 'info',
    });

    return record;
  }

  /**
   * Update an existing role.
   * Cannot update built-in roles' names.
   */
  async updateRole(
    id: string,
    changes: {
      name?: string;
      description?: string;
      permissions?: RolePermissions;
      priority?: number;
    },
  ): Promise<AuthRole & CollectionMeta> {
    const existing = await this.roles.get(id);
    if (!existing) {
      throw new Error(`Role not found: ${id}`);
    }

    // Cannot rename built-in roles
    if (existing.isBuiltIn && changes.name && changes.name !== existing.name) {
      throw new Error(`Cannot rename built-in role "${existing.name}".`);
    }

    // If name is changing, validate uniqueness
    if (changes.name && changes.name !== existing.name) {
      const duplicate = await this.getRoleByName(changes.name);
      if (duplicate) {
        throw new Error(`Role name "${changes.name}" already exists.`);
      }
    }

    const updateData: Partial<AuthRole> = {};
    if (changes.name !== undefined) updateData.name = changes.name;
    if (changes.description !== undefined) updateData.description = changes.description;
    if (changes.permissions !== undefined) updateData.permissions = JSON.stringify(changes.permissions);
    if (changes.priority !== undefined) updateData.priority = changes.priority;

    const updated = await this.roles.update(id, updateData);

    await this.logAudit({
      action: 'role.updated',
      resource: 'auth/role',
      resourceId: id,
      details: JSON.stringify(Object.keys(changes)),
      severity: 'info',
    });

    return updated;
  }

  /**
   * Delete a role.
   * Cannot delete built-in roles. Cannot delete roles that are assigned to users.
   */
  async deleteRole(id: string): Promise<void> {
    const existing = await this.roles.get(id);
    if (!existing) {
      throw new Error(`Role not found: ${id}`);
    }

    if (existing.isBuiltIn) {
      throw new Error(`Cannot delete built-in role "${existing.name}".`);
    }

    // Check if any users have this role
    const usersWithRole = await this.users
      .query()
      .where('roleId', '=', id)
      .count();

    if (usersWithRole > 0) {
      throw new Error(
        `Cannot delete role "${existing.name}": ${usersWithRole} user(s) are assigned this role.`,
      );
    }

    await this.roles.remove(id);

    await this.logAudit({
      action: 'role.deleted',
      resource: 'auth/role',
      resourceId: id,
      details: JSON.stringify({ name: existing.name }),
      severity: 'warning',
    });
  }

  /**
   * Assign a role to a user.
   */
  async assignRole(userId: string, roleId: string): Promise<AuthUser & CollectionMeta> {
    const user = await this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const role = await this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role not found: ${roleId}`);
    }

    const updated = await this.users.update(userId, {
      roleId,
    } as Partial<AuthUser>);

    this.events.emit('auth.user.updated', { user: updated });

    await this.logAudit({
      action: 'role.assigned',
      resource: 'auth/user',
      resourceId: userId,
      details: JSON.stringify({ roleId, roleName: role.name }),
      severity: 'info',
    });

    return updated;
  }

  /**
   * Get a single role by ID.
   */
  async getRole(id: string): Promise<(AuthRole & CollectionMeta) | null> {
    return this.roles.get(id);
  }

  /**
   * Get a role by name.
   */
  async getRoleByName(name: string): Promise<(AuthRole & CollectionMeta) | null> {
    return this.roles
      .query()
      .where('name', '=', name)
      .limit(1)
      .first();
  }

  /**
   * Get all roles, ordered by priority descending.
   */
  async getRoles(): Promise<(AuthRole & CollectionMeta)[]> {
    return this.roles
      .query()
      .orderBy('priority', 'desc')
      .execute();
  }

  /**
   * Initialize built-in roles. Creates them if they don't exist.
   * Returns the number of roles created.
   */
  async initBuiltInRoles(): Promise<number> {
    let created = 0;
    for (const roleDef of BUILT_IN_ROLES) {
      const existing = await this.getRoleByName(roleDef.name);
      if (!existing) {
        await this.createRole({
          name: roleDef.name,
          description: roleDef.description,
          permissions: roleDef.permissions,
          isBuiltIn: true,
          priority: roleDef.priority,
        });
        created++;
      }
    }
    return created;
  }

  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================

  /**
   * Create a new session for a user.
   * Generates a session token with configurable expiry.
   */
  async createSession(data: {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    expiryMinutes?: number;
  }): Promise<AuthSession & CollectionMeta> {
    const user = await this.users.get(data.userId);
    if (!user) {
      throw new Error(`User not found: ${data.userId}`);
    }

    if (user.status !== 'active') {
      throw new Error(`Cannot create session for ${user.status} user.`);
    }

    const now = new Date();
    const expiryMinutes = data.expiryMinutes ?? this.settings.sessionTimeoutMinutes;
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);

    const record = await this.sessions.insert({
      userId: data.userId,
      token: generateToken(64),
      ipAddress: data.ipAddress ?? '',
      userAgent: data.userAgent ?? '',
      expiresAt: expiresAt.toISOString(),
      lastActivityAt: now.toISOString(),
      isActive: true,
    } as AuthSession);

    this.events.emit('auth.session.created', { session: record });
    return record;
  }

  /**
   * End a session (logout).
   */
  async endSession(sessionId: string): Promise<void> {
    const session = await this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await this.sessions.update(sessionId, {
      isActive: false,
    } as Partial<AuthSession>);

    this.events.emit('auth.session.ended', { sessionId, userId: session.userId });
  }

  /**
   * Get all active sessions.
   */
  async getActiveSessions(userId?: string): Promise<(AuthSession & CollectionMeta)[]> {
    const q = this.sessions.query();
    q.where('isActive', '=', true);

    if (userId) {
      q.where('userId', '=', userId);
    }

    q.orderBy('lastActivityAt', 'desc');
    return q.execute();
  }

  /**
   * Get a session by token.
   */
  async getSessionByToken(token: string): Promise<(AuthSession & CollectionMeta) | null> {
    return this.sessions
      .query()
      .where('token', '=', token)
      .where('isActive', '=', true)
      .limit(1)
      .first();
  }

  /**
   * Validate and refresh a session. Checks expiry and updates lastActivityAt.
   * Returns the session if valid, null if expired or invalid.
   */
  async validateSession(token: string): Promise<(AuthSession & CollectionMeta) | null> {
    const session = await this.getSessionByToken(token);
    if (!session) return null;

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    if (now > expiresAt) {
      // Session expired — deactivate it
      await this.sessions.update(session.id, {
        isActive: false,
      } as Partial<AuthSession>);
      return null;
    }

    // Refresh last activity
    const updated = await this.sessions.update(session.id, {
      lastActivityAt: now.toISOString(),
    } as Partial<AuthSession>);

    return updated;
  }

  /**
   * Clean up expired sessions.
   * Sets isActive=false for all sessions past their expiresAt.
   * Returns the number of sessions cleaned.
   */
  async cleanExpiredSessions(): Promise<number> {
    const now = new Date().toISOString();

    const activeSessions = await this.sessions
      .query()
      .where('isActive', '=', true)
      .execute();

    let cleaned = 0;
    for (const session of activeSessions) {
      if (session.expiresAt < now) {
        await this.sessions.update(session.id, {
          isActive: false,
        } as Partial<AuthSession>);
        cleaned++;
      }
    }

    return cleaned;
  }

  // ========================================================================
  // API KEY MANAGEMENT
  // ========================================================================

  /**
   * Create a new API key for a user.
   * Returns the full key (only visible once).
   */
  async createApiKey(data: {
    userId: string;
    name: string;
    permissions?: RolePermissions;
    expiryDays?: number;
  }): Promise<{ apiKey: AuthApiKey & CollectionMeta; fullKey: string }> {
    const user = await this.users.get(data.userId);
    if (!user) {
      throw new Error(`User not found: ${data.userId}`);
    }

    // Validate name uniqueness per user
    const existingKeys = await this.apiKeys
      .query()
      .where('userId', '=', data.userId)
      .where('name', '=', data.name)
      .where('isRevoked', '=', false)
      .execute();

    if (existingKeys.length > 0) {
      throw new Error(`API key name "${data.name}" already exists for this user.`);
    }

    const { key, prefix, hash } = generateApiKey();
    const expiryDays = data.expiryDays ?? this.settings.apiKeyExpiryDays;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const record = await this.apiKeys.insert({
      userId: data.userId,
      name: data.name,
      keyHash: hash,
      keyPrefix: prefix,
      permissions: data.permissions ? JSON.stringify(data.permissions) : '',
      expiresAt: expiresAt.toISOString(),
      lastUsedAt: '',
      isRevoked: false,
      revokedAt: '',
    } as AuthApiKey);

    this.events.emit('auth.apikey.created', { apiKey: record });

    await this.logAudit({
      action: 'apikey.created',
      resource: 'auth/apiKey',
      resourceId: record.id,
      details: JSON.stringify({ name: data.name, userId: data.userId }),
      severity: 'info',
    });

    return { apiKey: record, fullKey: key };
  }

  /**
   * Revoke an API key.
   */
  async revokeApiKey(keyId: string): Promise<AuthApiKey & CollectionMeta> {
    const existing = await this.apiKeys.get(keyId);
    if (!existing) {
      throw new Error(`API key not found: ${keyId}`);
    }

    if (existing.isRevoked) {
      throw new Error(`API key "${existing.name}" is already revoked.`);
    }

    const updated = await this.apiKeys.update(keyId, {
      isRevoked: true,
      revokedAt: currentTimestamp(),
    } as Partial<AuthApiKey>);

    this.events.emit('auth.apikey.revoked', { apiKey: updated });

    await this.logAudit({
      action: 'apikey.revoked',
      resource: 'auth/apiKey',
      resourceId: keyId,
      details: JSON.stringify({ name: existing.name }),
      severity: 'warning',
    });

    return updated;
  }

  /**
   * Validate an API key. Checks hash match, expiry, and revocation.
   * Updates lastUsedAt on success.
   */
  async validateApiKey(fullKey: string): Promise<(AuthApiKey & CollectionMeta) | null> {
    const hash = simpleHash(fullKey);

    const keys = await this.apiKeys
      .query()
      .where('keyHash', '=', hash)
      .where('isRevoked', '=', false)
      .limit(1)
      .execute();

    if (keys.length === 0) return null;

    const apiKey = keys[0];
    const now = new Date();

    // Check expiry
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < now) {
      return null;
    }

    // Update last used
    const updated = await this.apiKeys.update(apiKey.id, {
      lastUsedAt: now.toISOString(),
    } as Partial<AuthApiKey>);

    return updated;
  }

  /**
   * Get API keys for a user.
   */
  async getApiKeys(userId: string): Promise<(AuthApiKey & CollectionMeta)[]> {
    return this.apiKeys
      .query()
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  /**
   * Get all API keys.
   */
  async getAllApiKeys(): Promise<(AuthApiKey & CollectionMeta)[]> {
    return this.apiKeys
      .query()
      .orderBy('createdAt', 'desc')
      .execute();
  }

  // ========================================================================
  // AUDIT LOGGING
  // ========================================================================

  /**
   * Log an audit entry.
   */
  async logAudit(data: {
    userId?: string;
    username?: string;
    action: string;
    resource?: string;
    resourceId?: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    severity?: AuditSeverity;
  }): Promise<AuditLogEntry & CollectionMeta> {
    const record = await this.auditLogs.insert({
      userId: data.userId ?? '',
      username: data.username ?? '',
      action: data.action,
      resource: data.resource ?? '',
      resourceId: data.resourceId ?? '',
      details: data.details ?? '',
      ipAddress: data.ipAddress ?? '',
      userAgent: data.userAgent ?? '',
      timestamp: currentTimestamp(),
      severity: data.severity ?? 'info',
    } as AuditLogEntry);

    this.events.emit('auth.audit.logged', { entry: record });
    return record;
  }

  /**
   * Query audit log entries with filters.
   */
  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    severity?: AuditSeverity;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<(AuditLogEntry & CollectionMeta)[]> {
    const q = this.auditLogs.query();

    if (filters?.userId) {
      q.where('userId', '=', filters.userId);
    }
    if (filters?.action) {
      q.where('action', '=', filters.action);
    }
    if (filters?.resource) {
      q.where('resource', '=', filters.resource);
    }
    if (filters?.severity) {
      q.where('severity', '=', filters.severity);
    }
    if (filters?.fromDate) {
      q.where('timestamp', '>=', filters.fromDate);
    }
    if (filters?.toDate) {
      q.where('timestamp', '<=', filters.toDate);
    }

    q.orderBy('timestamp', 'desc');

    if (filters?.limit) {
      q.limit(filters.limit);
    }

    return q.execute();
  }

  // ========================================================================
  // MFA (STUB IMPLEMENTATION)
  // ========================================================================

  /**
   * Enable MFA for a user. Generates a stub secret.
   */
  async enableMFA(userId: string): Promise<{ secret: string; qrData: string }> {
    const user = await this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const secret = `MFA_SECRET_${generateToken(16)}`;
    const qrData = `otpauth://totp/Concrete:${user.email}?secret=${secret}&issuer=Concrete`;

    await this.users.update(userId, {
      mfaSecret: secret,
    } as Partial<AuthUser>);

    await this.logAudit({
      action: 'mfa.setup.initiated',
      resource: 'auth/user',
      resourceId: userId,
      severity: 'info',
    });

    return { secret, qrData };
  }

  /**
   * Verify MFA code and complete enablement.
   * Stub: accepts any 6-digit code.
   */
  async verifyMFA(userId: string, code: string): Promise<boolean> {
    const user = await this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (!user.mfaSecret) {
      throw new Error('MFA has not been set up for this user. Call enableMFA first.');
    }

    // Stub verification: accept any 6-digit code
    const isValid = /^\d{6}$/.test(code);

    if (isValid) {
      await this.users.update(userId, {
        mfaEnabled: true,
      } as Partial<AuthUser>);

      await this.logAudit({
        action: 'mfa.enabled',
        resource: 'auth/user',
        resourceId: userId,
        severity: 'info',
      });
    }

    return isValid;
  }

  /**
   * Disable MFA for a user.
   */
  async disableMFA(userId: string): Promise<void> {
    const user = await this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    await this.users.update(userId, {
      mfaEnabled: false,
      mfaSecret: '',
    } as Partial<AuthUser>);

    await this.logAudit({
      action: 'mfa.disabled',
      resource: 'auth/user',
      resourceId: userId,
      severity: 'warning',
    });
  }

  // ========================================================================
  // PASSWORD MANAGEMENT
  // ========================================================================

  /**
   * Change a user's password.
   * Validates the current password before updating.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Verify current password
    const currentHash = simpleHash(currentPassword);
    if (currentHash !== user.passwordHash) {
      throw new Error('Current password is incorrect.');
    }

    // Validate new password policy
    this.validatePasswordPolicy(newPassword);

    const newHash = simpleHash(newPassword);
    await this.users.update(userId, {
      passwordHash: newHash,
      passwordChangedAt: currentTimestamp(),
    } as Partial<AuthUser>);

    await this.logAudit({
      action: 'password.changed',
      resource: 'auth/user',
      resourceId: userId,
      severity: 'info',
    });
  }

  /**
   * Reset a user's password (admin operation).
   * Does not require current password.
   */
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    this.validatePasswordPolicy(newPassword);

    const newHash = simpleHash(newPassword);
    await this.users.update(userId, {
      passwordHash: newHash,
      passwordChangedAt: currentTimestamp(),
      failedLoginAttempts: 0,
      lockedUntil: '',
    } as Partial<AuthUser>);

    await this.logAudit({
      action: 'password.reset',
      resource: 'auth/user',
      resourceId: userId,
      severity: 'warning',
    });
  }

  /**
   * Validate a password against the configured policy.
   */
  validatePasswordPolicy(password: string): void {
    const errors: string[] = [];

    if (password.length < this.settings.passwordMinLength) {
      errors.push(`Password must be at least ${this.settings.passwordMinLength} characters.`);
    }
    if (this.settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter.');
    }
    if (this.settings.passwordRequireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter.');
    }
    if (this.settings.passwordRequireNumber && !/\d/.test(password)) {
      errors.push('Password must contain at least one number.');
    }
    if (this.settings.passwordRequireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character.');
    }

    if (errors.length > 0) {
      throw new Error(`Password policy violation: ${errors.join(' ')}`);
    }
  }

  // ========================================================================
  // PERMISSION CHECKING
  // ========================================================================

  /**
   * Check if a user has a specific permission.
   * Returns true if the user's role grants the specified action on the resource.
   */
  async hasPermission(
    userId: string,
    resource: string,
    action: PermissionAction,
  ): Promise<boolean> {
    const user = await this.users.get(userId);
    if (!user) return false;
    if (user.status !== 'active') return false;

    if (!user.roleId) return false;

    const role = await this.roles.get(user.roleId);
    if (!role) return false;

    let permissions: RolePermissions;
    try {
      permissions = JSON.parse(role.permissions) as RolePermissions;
    } catch {
      return false;
    }

    return this.checkPermissions(permissions, resource, action);
  }

  /**
   * Check access for a user on a resource/action.
   * Returns an object with allowed flag and reason.
   */
  async checkAccess(
    userId: string,
    resource: string,
    action: PermissionAction,
  ): Promise<{ allowed: boolean; reason: string }> {
    const user = await this.users.get(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found.' };
    }
    if (user.status !== 'active') {
      return { allowed: false, reason: `User is ${user.status}.` };
    }
    if (!user.roleId) {
      return { allowed: false, reason: 'No role assigned.' };
    }

    const role = await this.roles.get(user.roleId);
    if (!role) {
      return { allowed: false, reason: 'Assigned role not found.' };
    }

    let permissions: RolePermissions;
    try {
      permissions = JSON.parse(role.permissions) as RolePermissions;
    } catch {
      return { allowed: false, reason: 'Invalid role permissions.' };
    }

    const allowed = this.checkPermissions(permissions, resource, action);
    if (allowed) {
      return { allowed: true, reason: `Granted by role "${role.name}".` };
    }

    return {
      allowed: false,
      reason: `Role "${role.name}" does not grant "${action}" on "${resource}".`,
    };
  }

  /**
   * Evaluate a RolePermissions object for a given resource and action.
   */
  private checkPermissions(
    permissions: RolePermissions,
    resource: string,
    action: PermissionAction,
  ): boolean {
    if (!permissions.rules) return false;

    for (const rule of permissions.rules) {
      if (matchResource(rule.resource, resource)) {
        if (rule.actions.includes(action)) {
          return true;
        }
      }
    }

    return false;
  }

  // ========================================================================
  // LOGIN / LOGOUT
  // ========================================================================

  /**
   * Login a user with username/email and password.
   * Returns a session on success. Handles lockout and failed attempts.
   */
  async login(data: {
    usernameOrEmail: string;
    password: string;
    mfaCode?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: AuthUser & CollectionMeta; session: AuthSession & CollectionMeta }> {
    // Find user by username or email
    let user = await this.getUserByUsername(data.usernameOrEmail);
    if (!user) {
      user = await this.getUserByEmail(data.usernameOrEmail);
    }
    if (!user) {
      throw new Error('Invalid credentials.');
    }

    // Check if account is locked
    if (user.status === 'locked') {
      if (user.lockedUntil) {
        const lockExpiry = new Date(user.lockedUntil);
        if (new Date() < lockExpiry) {
          throw new Error('Account is locked. Please try again later.');
        }
        // Lock expired, unlock the account
        await this.users.update(user.id, {
          status: 'active',
          failedLoginAttempts: 0,
          lockedUntil: '',
        } as Partial<AuthUser>);
        // Re-fetch user
        user = (await this.users.get(user.id))!;
      } else {
        throw new Error('Account is locked. Contact an administrator.');
      }
    }

    if (user.status === 'inactive') {
      throw new Error('Account is inactive. Contact an administrator.');
    }

    if (user.status === 'pending') {
      throw new Error('Account is pending activation.');
    }

    // Verify password
    const passwordHash = simpleHash(data.password);
    if (passwordHash !== user.passwordHash) {
      // Increment failed attempts
      const newAttempts = user.failedLoginAttempts + 1;
      const updateData: Partial<AuthUser> = {
        failedLoginAttempts: newAttempts,
      };

      // Lock account if max attempts exceeded
      if (newAttempts >= this.settings.maxFailedLoginAttempts) {
        const lockUntil = new Date(
          Date.now() + this.settings.lockoutDurationMinutes * 60 * 1000,
        );
        updateData.status = 'locked';
        updateData.lockedUntil = lockUntil.toISOString();
      }

      await this.users.update(user.id, updateData);

      await this.logAudit({
        userId: user.id,
        username: user.username,
        action: 'login.failed',
        resource: 'auth/session',
        details: JSON.stringify({ reason: 'invalid_password', attempts: newAttempts }),
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        severity: newAttempts >= this.settings.maxFailedLoginAttempts ? 'critical' : 'warning',
      });

      throw new Error('Invalid credentials.');
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!data.mfaCode) {
        throw new Error('MFA code is required.');
      }
      // Stub: accept any 6-digit code
      if (!/^\d{6}$/.test(data.mfaCode)) {
        await this.logAudit({
          userId: user.id,
          username: user.username,
          action: 'login.mfa.failed',
          resource: 'auth/session',
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          severity: 'warning',
        });
        throw new Error('Invalid MFA code.');
      }
    }

    // Successful login — reset failed attempts and update last login
    await this.users.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: '',
      lastLoginAt: currentTimestamp(),
    } as Partial<AuthUser>);

    // Create session
    const session = await this.createSession({
      userId: user.id,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    // Re-fetch user to get latest state
    const updatedUser = (await this.users.get(user.id))!;

    this.events.emit('auth.login', { userId: user.id, sessionId: session.id });

    await this.logAudit({
      userId: user.id,
      username: user.username,
      action: 'login.success',
      resource: 'auth/session',
      resourceId: session.id,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      severity: 'info',
    });

    return { user: updatedUser, session };
  }

  /**
   * Logout a user by ending a session.
   */
  async logout(sessionId: string): Promise<void> {
    const session = await this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await this.endSession(sessionId);

    this.events.emit('auth.logout', { userId: session.userId, sessionId });

    await this.logAudit({
      userId: session.userId,
      action: 'logout',
      resource: 'auth/session',
      resourceId: sessionId,
      severity: 'info',
    });
  }

  // ========================================================================
  // SETTINGS MANAGEMENT
  // ========================================================================

  /**
   * Get current auth settings.
   */
  getSettings(): AuthSettings {
    return { ...this.settings };
  }

  /**
   * Update auth settings.
   */
  async updateSettings(changes: Partial<AuthSettings>): Promise<AuthSettings> {
    this.settings = { ...this.settings, ...changes };

    await this.logAudit({
      action: 'settings.updated',
      resource: 'auth/settings',
      details: JSON.stringify(Object.keys(changes)),
      severity: 'warning',
    });

    return { ...this.settings };
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Get user count by status.
   */
  async getUserCountByStatus(): Promise<Record<UserStatus, number>> {
    const all = await this.users.query().execute();
    const counts: Record<UserStatus, number> = {
      active: 0,
      inactive: 0,
      locked: 0,
      pending: 0,
    };
    for (const user of all) {
      const status = user.status as UserStatus;
      if (status in counts) {
        counts[status]++;
      }
    }
    return counts;
  }

  /**
   * Get session count (active only).
   */
  async getActiveSessionCount(): Promise<number> {
    return this.sessions
      .query()
      .where('isActive', '=', true)
      .count();
  }

  /**
   * Get API key count (active, non-revoked).
   */
  async getActiveApiKeyCount(): Promise<number> {
    return this.apiKeys
      .query()
      .where('isRevoked', '=', false)
      .count();
  }

  /**
   * Get audit log count.
   */
  async getAuditLogCount(): Promise<number> {
    return this.auditLogs.query().count();
  }

  /**
   * Export a summary of auth statistics.
   */
  async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    activeSessions: number;
    activeApiKeys: number;
    auditLogEntries: number;
  }> {
    const userCounts = await this.getUserCountByStatus();
    const totalUsers = Object.values(userCounts).reduce((s, c) => s + c, 0);

    return {
      totalUsers,
      activeUsers: userCounts.active,
      totalRoles: (await this.getRoles()).length,
      activeSessions: await this.getActiveSessionCount(),
      activeApiKeys: await this.getActiveApiKeyCount(),
      auditLogEntries: await this.getAuditLogCount(),
    };
  }

  /**
   * Utility: round2 exposed for consistency with other services.
   */
  round2(n: number): number {
    return round2(n);
  }
}
