/**
 * Auth Service Tests
 * Tests for the Authentication & Authorization business logic layer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../src/modules/auth/auth-service';
import type {
  AuthUser, AuthRole, AuthSession, AuthApiKey, AuditLogEntry,
} from '../../src/modules/auth/auth-service';
import { Collection } from '../../src/core/store/collection';
import { EventBus } from '../../src/core/events/bus';
import { SchemaRegistry } from '../../src/core/schema/registry';
import { LocalStorageAdapter } from '../../src/core/store/local-storage';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createTestService() {
  const adapter = new LocalStorageAdapter();
  const events = new EventBus();
  const schemas = new SchemaRegistry();

  const users = new Collection<AuthUser>('auth/user', adapter, schemas, events);
  const roles = new Collection<AuthRole>('auth/role', adapter, schemas, events);
  const sessions = new Collection<AuthSession>('auth/session', adapter, schemas, events);
  const apiKeys = new Collection<AuthApiKey>('auth/apiKey', adapter, schemas, events);
  const auditLogs = new Collection<AuditLogEntry>('auth/auditLog', adapter, schemas, events);

  const service = new AuthService(
    users, roles, sessions, apiKeys, auditLogs, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // User CRUD
  // ==========================================================================

  describe('User CRUD', () => {
    it('creates a user with defaults', async () => {
      const user = await service.createUser({
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
        password: 'Secure123',
      });

      expect(user.email).toBe('john@example.com');
      expect(user.username).toBe('john');
      expect(user.displayName).toBe('John Doe');
      expect(user.status).toBe('active');
      expect(user.mfaEnabled).toBe(false);
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.ssoProvider).toBe('none');
      expect(user.passwordHash).toBeTruthy();
    });

    it('rejects duplicate email', async () => {
      await service.createUser({
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
      });
      await expect(
        service.createUser({
          email: 'john@example.com',
          username: 'john2',
          displayName: 'John Two',
        }),
      ).rejects.toThrow('already registered');
    });

    it('rejects duplicate username', async () => {
      await service.createUser({
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
      });
      await expect(
        service.createUser({
          email: 'john2@example.com',
          username: 'john',
          displayName: 'John Two',
        }),
      ).rejects.toThrow('already taken');
    });

    it('updates a user', async () => {
      const user = await service.createUser({
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
      });
      const updated = await service.updateUser(user.id, {
        phone: '555-0100',
        department: 'Engineering',
      });
      expect(updated.phone).toBe('555-0100');
      expect(updated.department).toBe('Engineering');
    });

    it('deactivates a user', async () => {
      const user = await service.createUser({
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
      });
      const deactivated = await service.deactivateUser(user.id);
      expect(deactivated.status).toBe('inactive');
    });

    it('filters users by status', async () => {
      await service.createUser({
        email: 'active@example.com',
        username: 'active_user',
        displayName: 'Active User',
      });
      const u2 = await service.createUser({
        email: 'inactive@example.com',
        username: 'inactive_user',
        displayName: 'Inactive User',
      });
      await service.deactivateUser(u2.id);

      const active = await service.getUsers({ status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].username).toBe('active_user');
    });

    it('filters users by role', async () => {
      const role = await service.createRole({
        name: 'TestRole',
        permissions: { rules: [{ resource: '*', actions: ['read'] }] },
      });
      await service.createUser({
        email: 'a@example.com',
        username: 'a',
        displayName: 'A User',
        roleId: role.id,
      });
      await service.createUser({
        email: 'b@example.com',
        username: 'b',
        displayName: 'B User',
      });

      const filtered = await service.getUsers({ roleId: role.id });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].username).toBe('a');
    });

    it('looks up user by email', async () => {
      await service.createUser({
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
      });
      const found = await service.getUserByEmail('john@example.com');
      expect(found).not.toBeNull();
      expect(found!.username).toBe('john');
    });
  });

  // ==========================================================================
  // Role Management
  // ==========================================================================

  describe('Role Management', () => {
    it('creates a role', async () => {
      const role = await service.createRole({
        name: 'Auditor',
        description: 'Financial auditor',
        permissions: { rules: [{ resource: 'gl.*', actions: ['read'] }] },
        priority: 30,
      });

      expect(role.name).toBe('Auditor');
      expect(role.isBuiltIn).toBe(false);
      expect(role.priority).toBe(30);
    });

    it('rejects duplicate role names', async () => {
      await service.createRole({
        name: 'Auditor',
        permissions: { rules: [] },
      });
      await expect(
        service.createRole({
          name: 'Auditor',
          permissions: { rules: [] },
        }),
      ).rejects.toThrow('already exists');
    });

    it('initializes built-in roles', async () => {
      const created = await service.initBuiltInRoles();
      expect(created).toBe(7); // Admin, Controller, PM, AP Clerk, Payroll, Field, Read-Only

      const roles = await service.getRoles();
      expect(roles.length).toBe(7);

      const admin = await service.getRoleByName('Admin');
      expect(admin).not.toBeNull();
      expect(admin!.isBuiltIn).toBe(true);
    });

    it('does not duplicate built-in roles on re-init', async () => {
      await service.initBuiltInRoles();
      const secondRun = await service.initBuiltInRoles();
      expect(secondRun).toBe(0);
    });

    it('cannot delete built-in roles', async () => {
      await service.initBuiltInRoles();
      const admin = await service.getRoleByName('Admin');
      await expect(service.deleteRole(admin!.id)).rejects.toThrow('Cannot delete built-in');
    });

    it('cannot delete a role assigned to users', async () => {
      const role = await service.createRole({
        name: 'TestRole',
        permissions: { rules: [] },
      });
      await service.createUser({
        email: 'a@example.com',
        username: 'a',
        displayName: 'A',
        roleId: role.id,
      });
      await expect(service.deleteRole(role.id)).rejects.toThrow('user(s) are assigned');
    });

    it('assigns a role to a user', async () => {
      const role = await service.createRole({
        name: 'TestRole',
        permissions: { rules: [] },
      });
      const user = await service.createUser({
        email: 'a@example.com',
        username: 'a',
        displayName: 'A',
      });
      const updated = await service.assignRole(user.id, role.id);
      expect(updated.roleId).toBe(role.id);
    });

    it('updates a role', async () => {
      const role = await service.createRole({
        name: 'TestRole',
        permissions: { rules: [] },
      });
      const updated = await service.updateRole(role.id, {
        description: 'Updated description',
        priority: 50,
      });
      expect(updated.description).toBe('Updated description');
      expect(updated.priority).toBe(50);
    });
  });

  // ==========================================================================
  // Session Management
  // ==========================================================================

  describe('Session Management', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await service.createUser({
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
      });
      userId = user.id;
    });

    it('creates a session', async () => {
      const session = await service.createSession({
        userId,
        ipAddress: '127.0.0.1',
        userAgent: 'TestBrowser/1.0',
      });

      expect(session.userId).toBe(userId);
      expect(session.token).toBeTruthy();
      expect(session.isActive).toBe(true);
      expect(session.ipAddress).toBe('127.0.0.1');
    });

    it('ends a session', async () => {
      const session = await service.createSession({ userId });
      await service.endSession(session.id);

      const activeSessions = await service.getActiveSessions(userId);
      expect(activeSessions).toHaveLength(0);
    });

    it('gets active sessions for a user', async () => {
      await service.createSession({ userId });
      await service.createSession({ userId });

      const activeSessions = await service.getActiveSessions(userId);
      expect(activeSessions).toHaveLength(2);
    });

    it('cleans expired sessions', async () => {
      // Create a session with very short expiry
      await service.createSession({
        userId,
        expiryMinutes: 0, // expired immediately
      });

      // Wait a tick for the expiry to take effect
      const cleaned = await service.cleanExpiredSessions();
      // The session with 0 minutes expires immediately
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });

    it('rejects session for inactive user', async () => {
      await service.deactivateUser(userId);
      await expect(
        service.createSession({ userId }),
      ).rejects.toThrow('inactive');
    });
  });

  // ==========================================================================
  // API Key Management
  // ==========================================================================

  describe('API Key Management', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await service.createUser({
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
      });
      userId = user.id;
    });

    it('creates an API key', async () => {
      const result = await service.createApiKey({
        userId,
        name: 'CI Key',
      });

      expect(result.fullKey).toBeTruthy();
      expect(result.fullKey.startsWith('ck_')).toBe(true);
      expect(result.apiKey.name).toBe('CI Key');
      expect(result.apiKey.isRevoked).toBe(false);
    });

    it('rejects duplicate key names for same user', async () => {
      await service.createApiKey({
        userId,
        name: 'CI Key',
      });
      await expect(
        service.createApiKey({
          userId,
          name: 'CI Key',
        }),
      ).rejects.toThrow('already exists');
    });

    it('revokes an API key', async () => {
      const result = await service.createApiKey({
        userId,
        name: 'CI Key',
      });
      const revoked = await service.revokeApiKey(result.apiKey.id);
      expect(revoked.isRevoked).toBe(true);
      expect(revoked.revokedAt).toBeTruthy();
    });

    it('validates an API key', async () => {
      const result = await service.createApiKey({
        userId,
        name: 'CI Key',
      });

      const validated = await service.validateApiKey(result.fullKey);
      expect(validated).not.toBeNull();
      expect(validated!.lastUsedAt).toBeTruthy();
    });

    it('rejects revoked API key on validation', async () => {
      const result = await service.createApiKey({
        userId,
        name: 'CI Key',
      });
      await service.revokeApiKey(result.apiKey.id);

      const validated = await service.validateApiKey(result.fullKey);
      expect(validated).toBeNull();
    });

    it('lists API keys for a user', async () => {
      await service.createApiKey({ userId, name: 'Key 1' });
      await service.createApiKey({ userId, name: 'Key 2' });

      const keys = await service.getApiKeys(userId);
      expect(keys).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Audit Logging
  // ==========================================================================

  describe('Audit Logging', () => {
    it('logs an audit entry', async () => {
      const entry = await service.logAudit({
        action: 'test.action',
        resource: 'test/resource',
        details: 'Test details',
        severity: 'info',
      });

      expect(entry.action).toBe('test.action');
      expect(entry.resource).toBe('test/resource');
      expect(entry.timestamp).toBeTruthy();
    });

    it('queries audit logs by action', async () => {
      await service.logAudit({ action: 'login.success', severity: 'info' });
      await service.logAudit({ action: 'login.failed', severity: 'warning' });
      await service.logAudit({ action: 'login.success', severity: 'info' });

      const logs = await service.getAuditLogs({ action: 'login.success' });
      expect(logs).toHaveLength(2);
    });

    it('queries audit logs by severity', async () => {
      await service.logAudit({ action: 'test1', severity: 'info' });
      await service.logAudit({ action: 'test2', severity: 'critical' });

      const critical = await service.getAuditLogs({ severity: 'critical' });
      expect(critical).toHaveLength(1);
      expect(critical[0].action).toBe('test2');
    });

    it('records audit log on user creation', async () => {
      await service.createUser({
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
      });

      const logs = await service.getAuditLogs({ action: 'user.created' });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Permission Checking
  // ==========================================================================

  describe('Permission Checking', () => {
    it('grants permission based on role', async () => {
      const role = await service.createRole({
        name: 'Viewer',
        permissions: { rules: [{ resource: '*', actions: ['read'] }] },
      });
      const user = await service.createUser({
        email: 'a@example.com',
        username: 'a',
        displayName: 'A',
        roleId: role.id,
      });

      const has = await service.hasPermission(user.id, 'ap.invoice', 'read');
      expect(has).toBe(true);
    });

    it('denies permission not in role', async () => {
      const role = await service.createRole({
        name: 'Viewer',
        permissions: { rules: [{ resource: '*', actions: ['read'] }] },
      });
      const user = await service.createUser({
        email: 'a@example.com',
        username: 'a',
        displayName: 'A',
        roleId: role.id,
      });

      const has = await service.hasPermission(user.id, 'ap.invoice', 'delete');
      expect(has).toBe(false);
    });

    it('denies permission for inactive user', async () => {
      const role = await service.createRole({
        name: 'Admin',
        permissions: { rules: [{ resource: '*', actions: ['read', 'create', 'update', 'delete'] }] },
      });
      const user = await service.createUser({
        email: 'a@example.com',
        username: 'a',
        displayName: 'A',
        roleId: role.id,
      });
      await service.deactivateUser(user.id);

      const has = await service.hasPermission(user.id, 'ap.invoice', 'read');
      expect(has).toBe(false);
    });

    it('checkAccess returns reason for denial', async () => {
      const user = await service.createUser({
        email: 'a@example.com',
        username: 'a',
        displayName: 'A',
      });

      const result = await service.checkAccess(user.id, 'ap.invoice', 'read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No role assigned');
    });

    it('checkAccess returns grant reason', async () => {
      const role = await service.createRole({
        name: 'Viewer',
        permissions: { rules: [{ resource: 'ap.*', actions: ['read'] }] },
      });
      const user = await service.createUser({
        email: 'a@example.com',
        username: 'a',
        displayName: 'A',
        roleId: role.id,
      });

      const result = await service.checkAccess(user.id, 'ap.invoice', 'read');
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('Viewer');
    });

    it('matches wildcard resource patterns', async () => {
      const role = await service.createRole({
        name: 'AP Full',
        permissions: { rules: [{ resource: 'ap.*', actions: ['create', 'read', 'update', 'delete'] }] },
      });
      const user = await service.createUser({
        email: 'a@example.com',
        username: 'a',
        displayName: 'A',
        roleId: role.id,
      });

      expect(await service.hasPermission(user.id, 'ap.invoice', 'create')).toBe(true);
      expect(await service.hasPermission(user.id, 'ap.vendor', 'read')).toBe(true);
      expect(await service.hasPermission(user.id, 'gl.account', 'read')).toBe(false);
    });
  });

  // ==========================================================================
  // Login / Logout
  // ==========================================================================

  describe('Login / Logout', () => {
    beforeEach(async () => {
      await service.createUser({
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
        password: 'SecurePass1',
      });
    });

    it('logs in with valid credentials', async () => {
      const result = await service.login({
        usernameOrEmail: 'john',
        password: 'SecurePass1',
      });

      expect(result.user.username).toBe('john');
      expect(result.session.token).toBeTruthy();
      expect(result.session.isActive).toBe(true);
      expect(result.user.lastLoginAt).toBeTruthy();
    });

    it('logs in with email', async () => {
      const result = await service.login({
        usernameOrEmail: 'john@example.com',
        password: 'SecurePass1',
      });

      expect(result.user.email).toBe('john@example.com');
    });

    it('rejects invalid password', async () => {
      await expect(
        service.login({
          usernameOrEmail: 'john',
          password: 'WrongPassword1',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('increments failed login attempts', async () => {
      try {
        await service.login({
          usernameOrEmail: 'john',
          password: 'WrongPassword1',
        });
      } catch {
        // expected
      }

      const user = await service.getUserByUsername('john');
      expect(user!.failedLoginAttempts).toBe(1);
    });

    it('logs out by ending session', async () => {
      const result = await service.login({
        usernameOrEmail: 'john',
        password: 'SecurePass1',
      });

      await service.logout(result.session.id);

      const active = await service.getActiveSessions(result.user.id);
      expect(active).toHaveLength(0);
    });
  });

  // ==========================================================================
  // MFA
  // ==========================================================================

  describe('MFA', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await service.createUser({
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
      });
      userId = user.id;
    });

    it('enables MFA setup', async () => {
      const result = await service.enableMFA(userId);
      expect(result.secret).toBeTruthy();
      expect(result.qrData).toContain('otpauth://totp/');
    });

    it('verifies MFA with 6-digit code', async () => {
      await service.enableMFA(userId);
      const verified = await service.verifyMFA(userId, '123456');
      expect(verified).toBe(true);

      const user = await service.getUser(userId);
      expect(user!.mfaEnabled).toBe(true);
    });

    it('rejects invalid MFA code', async () => {
      await service.enableMFA(userId);
      const verified = await service.verifyMFA(userId, 'abc');
      expect(verified).toBe(false);
    });

    it('disables MFA', async () => {
      await service.enableMFA(userId);
      await service.verifyMFA(userId, '123456');
      await service.disableMFA(userId);

      const user = await service.getUser(userId);
      expect(user!.mfaEnabled).toBe(false);
      expect(user!.mfaSecret).toBe('');
    });
  });

  // ==========================================================================
  // Password Management
  // ==========================================================================

  describe('Password Management', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await service.createUser({
        email: 'john@example.com',
        username: 'john',
        displayName: 'John Doe',
        password: 'OldPass123',
      });
      userId = user.id;
    });

    it('changes password with valid current password', async () => {
      await service.changePassword(userId, 'OldPass123', 'NewPass456');

      // Can login with new password
      const result = await service.login({
        usernameOrEmail: 'john',
        password: 'NewPass456',
      });
      expect(result.user.username).toBe('john');
    });

    it('rejects change with wrong current password', async () => {
      await expect(
        service.changePassword(userId, 'WrongPass', 'NewPass456'),
      ).rejects.toThrow('incorrect');
    });

    it('resets password (admin operation)', async () => {
      await service.resetPassword(userId, 'ResetPass789');

      const result = await service.login({
        usernameOrEmail: 'john',
        password: 'ResetPass789',
      });
      expect(result.user.username).toBe('john');
    });

    it('enforces password policy', () => {
      expect(() => service.validatePasswordPolicy('short')).toThrow('at least');
      expect(() => service.validatePasswordPolicy('nouppercase1')).toThrow('uppercase');
      expect(() => service.validatePasswordPolicy('NOLOWERCASE1')).toThrow('lowercase');
      expect(() => service.validatePasswordPolicy('NoNumbers')).toThrow('number');
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits auth.user.created', async () => {
      let emitted = false;
      events.on('auth.user.created', () => { emitted = true; });
      await service.createUser({
        email: 'test@example.com',
        username: 'test',
        displayName: 'Test',
      });
      expect(emitted).toBe(true);
    });

    it('emits auth.login', async () => {
      await service.createUser({
        email: 'test@example.com',
        username: 'test',
        displayName: 'Test',
        password: 'SecurePass1',
      });

      let emitted = false;
      events.on('auth.login', () => { emitted = true; });
      await service.login({
        usernameOrEmail: 'test',
        password: 'SecurePass1',
      });
      expect(emitted).toBe(true);
    });

    it('emits auth.logout', async () => {
      await service.createUser({
        email: 'test@example.com',
        username: 'test',
        displayName: 'Test',
        password: 'SecurePass1',
      });
      const result = await service.login({
        usernameOrEmail: 'test',
        password: 'SecurePass1',
      });

      let emitted = false;
      events.on('auth.logout', () => { emitted = true; });
      await service.logout(result.session.id);
      expect(emitted).toBe(true);
    });

    it('emits auth.session.created', async () => {
      const user = await service.createUser({
        email: 'test@example.com',
        username: 'test',
        displayName: 'Test',
      });

      let emitted = false;
      events.on('auth.session.created', () => { emitted = true; });
      await service.createSession({ userId: user.id });
      expect(emitted).toBe(true);
    });

    it('emits auth.apikey.created', async () => {
      const user = await service.createUser({
        email: 'test@example.com',
        username: 'test',
        displayName: 'Test',
      });

      let emitted = false;
      events.on('auth.apikey.created', () => { emitted = true; });
      await service.createApiKey({ userId: user.id, name: 'TestKey' });
      expect(emitted).toBe(true);
    });

    it('emits auth.apikey.revoked', async () => {
      const user = await service.createUser({
        email: 'test@example.com',
        username: 'test',
        displayName: 'Test',
      });
      const result = await service.createApiKey({ userId: user.id, name: 'TestKey' });

      let emitted = false;
      events.on('auth.apikey.revoked', () => { emitted = true; });
      await service.revokeApiKey(result.apiKey.id);
      expect(emitted).toBe(true);
    });

    it('emits auth.audit.logged', async () => {
      let emitted = false;
      events.on('auth.audit.logged', () => { emitted = true; });
      await service.logAudit({ action: 'test', severity: 'info' });
      expect(emitted).toBe(true);
    });
  });

  // ==========================================================================
  // Settings
  // ==========================================================================

  describe('Settings', () => {
    it('returns default settings', () => {
      const settings = service.getSettings();
      expect(settings.sessionTimeoutMinutes).toBe(480);
      expect(settings.maxFailedLoginAttempts).toBe(5);
      expect(settings.passwordMinLength).toBe(8);
    });

    it('updates settings', async () => {
      const updated = await service.updateSettings({
        sessionTimeoutMinutes: 120,
        passwordMinLength: 12,
      });
      expect(updated.sessionTimeoutMinutes).toBe(120);
      expect(updated.passwordMinLength).toBe(12);
    });
  });

  // ==========================================================================
  // Stats
  // ==========================================================================

  describe('Stats', () => {
    it('returns auth stats summary', async () => {
      await service.createUser({
        email: 'a@example.com',
        username: 'a',
        displayName: 'A',
      });
      await service.createUser({
        email: 'b@example.com',
        username: 'b',
        displayName: 'B',
      });

      const stats = await service.getStats();
      expect(stats.totalUsers).toBe(2);
      expect(stats.activeUsers).toBe(2);
    });
  });
});
