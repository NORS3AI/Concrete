/**
 * Tenant Service Tests
 * Tests for the Multi-Tenant business logic layer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TenantService } from '../../src/modules/tenant/tenant-service';
import type {
  Tenant, TenantConfig, Subscription, TenantUser, TenantBranding,
} from '../../src/modules/tenant/tenant-service';
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

  const tenants = new Collection<Tenant>('tenant/tenant', adapter, schemas, events);
  const configs = new Collection<TenantConfig>('tenant/tenantConfig', adapter, schemas, events);
  const subscriptions = new Collection<Subscription>('tenant/subscription', adapter, schemas, events);
  const tenantUsers = new Collection<TenantUser>('tenant/tenantUser', adapter, schemas, events);
  const brandings = new Collection<TenantBranding>('tenant/tenantBranding', adapter, schemas, events);

  const service = new TenantService(
    tenants, configs, subscriptions, tenantUsers, brandings, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TenantService', () => {
  let service: TenantService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Slug Validation
  // ==========================================================================

  describe('Slug Validation', () => {
    it('validates correct slugs', () => {
      expect(service.validateSlug('acme-corp')).toBe(true);
      expect(service.validateSlug('company123')).toBe(true);
      expect(service.validateSlug('abc')).toBe(true);
    });

    it('rejects invalid slugs', () => {
      expect(service.validateSlug('ab')).toBe(false); // too short
      expect(service.validateSlug('-acme')).toBe(false); // starts with hyphen
      expect(service.validateSlug('acme-')).toBe(false); // ends with hyphen
      expect(service.validateSlug('ACME')).toBe(false); // uppercase
      expect(service.validateSlug('acme corp')).toBe(false); // space
      expect(service.validateSlug('')).toBe(false); // empty
    });

    it('rejects reserved slugs', () => {
      expect(service.validateSlug('admin')).toBe(false);
      expect(service.validateSlug('api')).toBe(false);
      expect(service.validateSlug('login')).toBe(false);
      expect(service.validateSlug('www')).toBe(false);
    });

    it('checks slug availability', async () => {
      const available = await service.checkSlugAvailability('acme-corp');
      expect(available).toBe(true);

      await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const availableAfter = await service.checkSlugAvailability('acme-corp');
      expect(availableAfter).toBe(false);
    });
  });

  // ==========================================================================
  // Tenant CRUD
  // ==========================================================================

  describe('Tenant CRUD', () => {
    it('creates a tenant with defaults', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      expect(tenant.name).toBe('Acme Corp');
      expect(tenant.slug).toBe('acme-corp');
      expect(tenant.status).toBe('trial');
      expect(tenant.plan).toBe('free');
      expect(tenant.ownerId).toBe('user-1');
      expect(tenant.dataRegion).toBe('us');
      expect(tenant.storageUsedMb).toBe(0);
      expect(tenant.maxUsers).toBe(3);
      expect(tenant.maxEntities).toBe(5);
      expect(tenant.storageLimitMb).toBe(100);
    });

    it('creates default config for new tenant', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const config = await service.getConfig(tenant.id);
      expect(config).not.toBeNull();
      expect(config!.tenantId).toBe(tenant.id);
      expect(config!.defaultCurrency).toBe('USD');
      expect(config!.timezone).toBe('America/New_York');
      expect(config!.fiscalYearStart).toBe('01-01');
    });

    it('creates trial subscription for new tenant', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const sub = await service.getSubscription(tenant.id);
      expect(sub).not.toBeNull();
      expect(sub!.tenantId).toBe(tenant.id);
      expect(sub!.status).toBe('trialing');
      expect(sub!.amount).toBe(0);
    });

    it('adds owner as first user', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const users = await service.listUsers(tenant.id);
      expect(users).toHaveLength(1);
      expect(users[0].userId).toBe('user-1');
      expect(users[0].role).toBe('owner');
      expect(users[0].status).toBe('active');
    });

    it('rejects duplicate slugs', async () => {
      await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await expect(
        service.createTenant({
          name: 'Another Corp',
          slug: 'acme-corp',
          ownerId: 'user-2',
        }),
      ).rejects.toThrow('already taken');
    });

    it('rejects invalid slugs on creation', async () => {
      await expect(
        service.createTenant({
          name: 'Acme',
          slug: 'ab',
          ownerId: 'user-1',
        }),
      ).rejects.toThrow('Invalid slug');
    });

    it('updates a tenant', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const updated = await service.updateTenant(tenant.id, {
        name: 'Acme Corporation',
        domain: 'acme.example.com',
      });

      expect(updated.name).toBe('Acme Corporation');
      expect(updated.domain).toBe('acme.example.com');
    });

    it('gets tenant by slug', async () => {
      await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const found = await service.getTenantBySlug('acme-corp');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Acme Corp');
    });

    it('filters tenants by status', async () => {
      const t1 = await service.createTenant({
        name: 'Tenant A',
        slug: 'tenant-a',
        ownerId: 'user-1',
      });
      await service.createTenant({
        name: 'Tenant B',
        slug: 'tenant-b',
        ownerId: 'user-2',
      });

      // Activate first tenant
      await service.updateTenant(t1.id, { status: 'active' });

      const active = await service.getTenants({ status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Tenant A');
    });
  });

  // ==========================================================================
  // Suspend / Reactivate
  // ==========================================================================

  describe('Suspend / Reactivate', () => {
    it('suspends an active tenant', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await service.updateTenant(tenant.id, { status: 'active' });
      const suspended = await service.suspendTenant(tenant.id, 'Non-payment');
      expect(suspended.status).toBe('suspended');
    });

    it('rejects suspending already suspended tenant', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await service.updateTenant(tenant.id, { status: 'active' });
      await service.suspendTenant(tenant.id);

      await expect(
        service.suspendTenant(tenant.id),
      ).rejects.toThrow('already suspended');
    });

    it('reactivates a suspended tenant', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await service.updateTenant(tenant.id, { status: 'active' });
      await service.suspendTenant(tenant.id);
      const reactivated = await service.reactivateTenant(tenant.id);
      expect(reactivated.status).toBe('active');
    });

    it('rejects reactivating non-suspended tenant', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await expect(
        service.reactivateTenant(tenant.id),
      ).rejects.toThrow('cannot be reactivated');
    });
  });

  // ==========================================================================
  // Config
  // ==========================================================================

  describe('Config', () => {
    it('updates tenant config', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const updated = await service.updateConfig(tenant.id, {
        defaultCurrency: 'EUR',
        timezone: 'Europe/London',
        fiscalYearStart: '04-01',
      });

      expect(updated.defaultCurrency).toBe('EUR');
      expect(updated.timezone).toBe('Europe/London');
      expect(updated.fiscalYearStart).toBe('04-01');
    });

    it('resets config to defaults', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await service.updateConfig(tenant.id, {
        defaultCurrency: 'EUR',
        timezone: 'Europe/Berlin',
      });

      const reset = await service.resetConfig(tenant.id);
      expect(reset.defaultCurrency).toBe('USD');
      expect(reset.timezone).toBe('America/New_York');
    });
  });

  // ==========================================================================
  // Subscription Management
  // ==========================================================================

  describe('Subscription Management', () => {
    it('updates plan and limits', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const updated = await service.updatePlan(tenant.id, 'professional', 149);
      expect(updated.plan).toBe('professional');
      expect(updated.amount).toBe(149);

      const refreshedTenant = await service.getTenant(tenant.id);
      expect(refreshedTenant!.plan).toBe('professional');
      expect(refreshedTenant!.maxUsers).toBe(50);
      expect(refreshedTenant!.maxEntities).toBe(100);
      expect(refreshedTenant!.storageLimitMb).toBe(10000);
    });

    it('cancels a subscription', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const cancelled = await service.cancelSubscription(tenant.id);
      expect(cancelled.status).toBe('cancelled');

      const refreshedTenant = await service.getTenant(tenant.id);
      expect(refreshedTenant!.status).toBe('cancelled');
    });

    it('resumes a cancelled subscription', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await service.cancelSubscription(tenant.id);
      const resumed = await service.resumeSubscription(tenant.id);
      expect(resumed.status).toBe('active');

      const refreshedTenant = await service.getTenant(tenant.id);
      expect(refreshedTenant!.status).toBe('active');
    });

    it('rejects resuming non-cancelled subscription', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await expect(
        service.resumeSubscription(tenant.id),
      ).rejects.toThrow('Cannot resume');
    });

    it('gets billing history', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const history = await service.getBillingHistory(tenant.id);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].plan).toBe('free');
    });
  });

  // ==========================================================================
  // User Management
  // ==========================================================================

  describe('User Management', () => {
    let tenantId: string;

    beforeEach(async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'owner-1',
        plan: 'starter',
      });
      tenantId = tenant.id;
    });

    it('invites a user', async () => {
      const user = await service.inviteUser(tenantId, 'user-2', 'member');
      expect(user.userId).toBe('user-2');
      expect(user.role).toBe('member');
      expect(user.status).toBe('invited');
      expect(user.invitedAt).toBeDefined();
    });

    it('rejects inviting duplicate user', async () => {
      await service.inviteUser(tenantId, 'user-2', 'member');

      await expect(
        service.inviteUser(tenantId, 'user-2', 'admin'),
      ).rejects.toThrow('already a member');
    });

    it('removes a user', async () => {
      await service.inviteUser(tenantId, 'user-2', 'member');
      await service.removeUser(tenantId, 'user-2');

      const users = await service.listUsers(tenantId);
      const user2 = users.find((u) => u.userId === 'user-2');
      expect(user2).toBeUndefined();
    });

    it('refuses to remove the owner', async () => {
      await expect(
        service.removeUser(tenantId, 'owner-1'),
      ).rejects.toThrow('Cannot remove the tenant owner');
    });

    it('updates user role', async () => {
      await service.inviteUser(tenantId, 'user-2', 'member');
      const updated = await service.updateUserRole(tenantId, 'user-2', 'admin');
      expect(updated.role).toBe('admin');
    });

    it('refuses to change owner role', async () => {
      await expect(
        service.updateUserRole(tenantId, 'owner-1', 'admin'),
      ).rejects.toThrow('Cannot change the owner role');
    });

    it('lists users with role filter', async () => {
      await service.inviteUser(tenantId, 'user-2', 'admin');
      await service.inviteUser(tenantId, 'user-3', 'member');

      const admins = await service.listUsers(tenantId, { role: 'admin' });
      expect(admins).toHaveLength(1);
      expect(admins[0].userId).toBe('user-2');
    });

    it('accepts an invitation', async () => {
      await service.inviteUser(tenantId, 'user-2', 'member');
      const accepted = await service.acceptInvitation(tenantId, 'user-2');
      expect(accepted.status).toBe('active');
      expect(accepted.joinedAt).toBeDefined();
    });
  });

  // ==========================================================================
  // Branding
  // ==========================================================================

  describe('Branding', () => {
    it('updates branding for a tenant', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const branding = await service.updateBranding(tenant.id, {
        primaryColor: '#FF6B35',
        secondaryColor: '#2D3748',
        companyName: 'Acme Construction',
      });

      expect(branding.primaryColor).toBe('#FF6B35');
      expect(branding.secondaryColor).toBe('#2D3748');
      expect(branding.companyName).toBe('Acme Construction');
    });

    it('gets branding after update', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await service.updateBranding(tenant.id, {
        primaryColor: '#FF6B35',
        companyName: 'Acme Construction',
      });

      const branding = await service.getBranding(tenant.id);
      expect(branding).not.toBeNull();
      expect(branding!.primaryColor).toBe('#FF6B35');
    });

    it('updates existing branding', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await service.updateBranding(tenant.id, {
        primaryColor: '#FF6B35',
      });

      const updated = await service.updateBranding(tenant.id, {
        primaryColor: '#3B82F6',
        customCss: ':root { --accent: #3B82F6; }',
      });

      expect(updated.primaryColor).toBe('#3B82F6');
      expect(updated.customCss).toBe(':root { --accent: #3B82F6; }');
    });
  });

  // ==========================================================================
  // Data Export
  // ==========================================================================

  describe('Data Export', () => {
    it('exports all tenant data', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await service.updateBranding(tenant.id, {
        primaryColor: '#FF6B35',
        companyName: 'Acme Construction',
      });

      const exportData = await service.exportAllTenantData(tenant.id);
      expect(exportData.tenant).not.toBeNull();
      expect(exportData.tenant!.name).toBe('Acme Corp');
      expect(exportData.config).not.toBeNull();
      expect(exportData.subscription).not.toBeNull();
      expect(exportData.users).toHaveLength(1);
      expect(exportData.branding).not.toBeNull();
      expect(exportData.exportedAt).toBeDefined();
    });
  });

  // ==========================================================================
  // Data Deletion
  // ==========================================================================

  describe('Data Deletion', () => {
    it('schedules and confirms deletion', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const request = await service.scheduleDeletion(tenant.id);
      expect(request.confirmationCode).toBeDefined();
      expect(request.status).toBe('scheduled');

      await service.confirmDeletion(tenant.id, request.confirmationCode);

      const deleted = await service.getTenant(tenant.id);
      expect(deleted).toBeNull();
    });

    it('rejects invalid confirmation code', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await service.scheduleDeletion(tenant.id);

      await expect(
        service.confirmDeletion(tenant.id, 'WRONGCODE'),
      ).rejects.toThrow('Invalid confirmation code');
    });

    it('deletes all related data', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await service.inviteUser(tenant.id, 'user-2', 'member');
      await service.updateBranding(tenant.id, { primaryColor: '#FF6B35' });

      await service.deleteTenant(tenant.id);

      const config = await service.getConfig(tenant.id);
      const sub = await service.getSubscription(tenant.id);
      const users = await service.listUsers(tenant.id);
      const branding = await service.getBranding(tenant.id);

      expect(config).toBeNull();
      expect(sub).toBeNull();
      expect(users).toHaveLength(0);
      expect(branding).toBeNull();
    });
  });

  // ==========================================================================
  // Usage Stats
  // ==========================================================================

  describe('Usage Stats', () => {
    it('returns usage statistics', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      await service.inviteUser(tenant.id, 'user-2', 'member');

      const stats = await service.getUsageStats(tenant.id);
      expect(stats.tenantId).toBe(tenant.id);
      expect(stats.userCount).toBe(2); // owner + invited user
      expect(stats.maxUsers).toBe(3);
      expect(stats.storageUsedMb).toBe(0);
      expect(stats.userUtilizationPct).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Plan Limit Checks
  // ==========================================================================

  describe('Plan Limit Checks', () => {
    it('checks user plan limit', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
        plan: 'free',
      });

      // Free plan: 3 users max. Owner is user #1.
      const withinLimit = await service.checkPlanLimit(tenant.id, 'users');
      expect(withinLimit).toBe(true);

      // Add 2 more users to reach the limit
      await service.inviteUser(tenant.id, 'user-2', 'member');
      await service.inviteUser(tenant.id, 'user-3', 'member');

      const atLimit = await service.checkPlanLimit(tenant.id, 'users');
      expect(atLimit).toBe(false);
    });

    it('checks storage plan limit', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      const withinLimit = await service.checkPlanLimit(tenant.id, 'storage');
      expect(withinLimit).toBe(true);
    });

    it('enforces user limit on invite', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
        plan: 'free',
      });

      await service.inviteUser(tenant.id, 'user-2', 'member');
      await service.inviteUser(tenant.id, 'user-3', 'member');

      await expect(
        service.inviteUser(tenant.id, 'user-4', 'member'),
      ).rejects.toThrow('maximum');
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits tenant.created', async () => {
      let emitted = false;
      events.on('tenant.created', () => { emitted = true; });
      await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });
      expect(emitted).toBe(true);
    });

    it('emits tenant.updated', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      let emitted = false;
      events.on('tenant.updated', () => { emitted = true; });
      await service.updateTenant(tenant.id, { name: 'Acme Corporation' });
      expect(emitted).toBe(true);
    });

    it('emits tenant.suspended', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });
      await service.updateTenant(tenant.id, { status: 'active' });

      let emitted = false;
      events.on('tenant.suspended', () => { emitted = true; });
      await service.suspendTenant(tenant.id);
      expect(emitted).toBe(true);
    });

    it('emits tenant.deleted', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      let emitted = false;
      events.on('tenant.deleted', () => { emitted = true; });
      await service.deleteTenant(tenant.id);
      expect(emitted).toBe(true);
    });

    it('emits tenant.user.invited', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      let emitted = false;
      events.on('tenant.user.invited', () => { emitted = true; });
      await service.inviteUser(tenant.id, 'user-2', 'member');
      expect(emitted).toBe(true);
    });

    it('emits tenant.subscription.updated on plan change', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      let emitted = false;
      events.on('tenant.subscription.updated', () => { emitted = true; });
      await service.updatePlan(tenant.id, 'professional', 149);
      expect(emitted).toBe(true);
    });

    it('emits tenant.branding.updated', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      let emitted = false;
      events.on('tenant.branding.updated', () => { emitted = true; });
      await service.updateBranding(tenant.id, { primaryColor: '#FF6B35' });
      expect(emitted).toBe(true);
    });

    it('emits tenant.data.exported', async () => {
      const tenant = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-1',
      });

      let emitted = false;
      events.on('tenant.data.exported', () => { emitted = true; });
      await service.exportAllTenantData(tenant.id);
      expect(emitted).toBe(true);
    });
  });

  // ==========================================================================
  // Cross-Tenant Analytics
  // ==========================================================================

  describe('Cross-Tenant Analytics', () => {
    it('returns aggregated analytics', async () => {
      await service.createTenant({
        name: 'Tenant A',
        slug: 'tenant-a',
        ownerId: 'user-1',
      });
      await service.createTenant({
        name: 'Tenant B',
        slug: 'tenant-b',
        ownerId: 'user-2',
        plan: 'professional',
      });

      const analytics = await service.getCrossTenantAnalytics();
      expect(analytics.totalTenants).toBe(2);
      expect(analytics.trialCount).toBe(2);
      expect(analytics.planDistribution).toBeDefined();
      expect(analytics.regionDistribution).toBeDefined();
      expect(analytics.avgUsersPerTenant).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Domain Generation
  // ==========================================================================

  describe('Domain Generation', () => {
    it('generates a domain from slug', () => {
      const domain = service.generateDomain('acme-corp');
      expect(domain).toBe('acme-corp.concrete.app');
    });
  });
});
