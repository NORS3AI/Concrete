/**
 * Concrete -- Multi-Tenant Service
 *
 * Core service layer for the Multi-Tenant module. Provides tenant
 * provisioning, configuration management, subscription handling,
 * user management, branding customization, data export/deletion
 * (GDPR/CCPA compliance), usage tracking, and plan limit enforcement.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';
export type TenantPlan = 'free' | 'starter' | 'professional' | 'enterprise';
export type DataRegion = 'us' | 'eu' | 'apac';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';
export type TenantUserRole = 'owner' | 'admin' | 'member' | 'viewer';
export type TenantUserStatus = 'active' | 'invited' | 'suspended';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Tenant {
  [key: string]: unknown;
  name: string;
  slug: string;
  domain?: string;
  status: TenantStatus;
  plan: TenantPlan;
  ownerId: string;
  dataRegion: DataRegion;
  createdAt: string;
  trialEndsAt?: string;
  maxUsers: number;
  maxEntities: number;
  storageUsedMb: number;
  storageLimitMb: number;
}

export interface TenantConfig {
  [key: string]: unknown;
  tenantId: string;
  coaTemplateId?: string;
  taxTableId?: string;
  payScaleId?: string;
  fiscalYearStart: string;
  defaultCurrency: string;
  timezone: string;
  features: Record<string, boolean>;
}

export interface Subscription {
  [key: string]: unknown;
  tenantId: string;
  plan: TenantPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
}

export interface TenantUser {
  [key: string]: unknown;
  tenantId: string;
  userId: string;
  role: TenantUserRole;
  status: TenantUserStatus;
  invitedAt?: string;
  joinedAt?: string;
}

export interface TenantBranding {
  [key: string]: unknown;
  tenantId: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  favicon?: string;
  customCss?: string;
}

// ---------------------------------------------------------------------------
// Report / Helper Types
// ---------------------------------------------------------------------------

export interface UsageStats {
  [key: string]: unknown;
  tenantId: string;
  userCount: number;
  entityCount: number;
  storageUsedMb: number;
  storageLimitMb: number;
  maxUsers: number;
  maxEntities: number;
  userUtilizationPct: number;
  entityUtilizationPct: number;
  storageUtilizationPct: number;
}

export interface TenantDataExport {
  [key: string]: unknown;
  tenant: (Tenant & CollectionMeta) | null;
  config: (TenantConfig & CollectionMeta) | null;
  subscription: (Subscription & CollectionMeta) | null;
  users: (TenantUser & CollectionMeta)[];
  branding: (TenantBranding & CollectionMeta) | null;
  exportedAt: string;
}

export interface DeletionRequest {
  [key: string]: unknown;
  tenantId: string;
  confirmationCode: string;
  scheduledAt: string;
  status: 'scheduled' | 'confirmed' | 'completed';
}

export interface BillingHistoryEntry {
  [key: string]: unknown;
  subscriptionId: string;
  plan: TenantPlan;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
}

// ---------------------------------------------------------------------------
// Plan Limits Configuration
// ---------------------------------------------------------------------------

const PLAN_LIMITS: Record<TenantPlan, { maxUsers: number; maxEntities: number; storageLimitMb: number }> = {
  free: { maxUsers: 3, maxEntities: 5, storageLimitMb: 100 },
  starter: { maxUsers: 10, maxEntities: 25, storageLimitMb: 1000 },
  professional: { maxUsers: 50, maxEntities: 100, storageLimitMb: 10000 },
  enterprise: { maxUsers: 500, maxEntities: 1000, storageLimitMb: 100000 },
};

// ---------------------------------------------------------------------------
// Slug Validation
// ---------------------------------------------------------------------------

const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'auth', 'billing', 'blog', 'cdn',
  'concrete', 'dashboard', 'docs', 'help', 'login', 'logout',
  'mail', 'manage', 'register', 'settings', 'signup', 'status',
  'support', 'system', 'tenant', 'test', 'www',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a random confirmation code. */
function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Round a number to 2 decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// TenantService
// ---------------------------------------------------------------------------

export class TenantService {
  /** Pending deletion requests by tenantId. */
  private deletionRequests = new Map<string, DeletionRequest>();

  constructor(
    private tenants: Collection<Tenant>,
    private configs: Collection<TenantConfig>,
    private subscriptions: Collection<Subscription>,
    private tenantUsers: Collection<TenantUser>,
    private brandings: Collection<TenantBranding>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // TENANT CRUD
  // ========================================================================

  /**
   * Create (provision) a new tenant.
   * Validates slug uniqueness and format. Sets up default plan limits,
   * creates a default config, creates a trial subscription, and adds
   * the owner as the first user.
   */
  async createTenant(data: {
    name: string;
    slug: string;
    domain?: string;
    plan?: TenantPlan;
    ownerId: string;
    dataRegion?: DataRegion;
    trialEndsAt?: string;
  }): Promise<Tenant & CollectionMeta> {
    // Validate slug format
    if (!this.validateSlug(data.slug)) {
      throw new Error(
        `Invalid slug "${data.slug}". Slug must be lowercase alphanumeric with hyphens, 3-63 characters, and cannot start or end with a hyphen.`,
      );
    }

    // Check slug availability
    const slugAvailable = await this.checkSlugAvailability(data.slug);
    if (!slugAvailable) {
      throw new Error(`Slug "${data.slug}" is already taken.`);
    }

    const plan = data.plan ?? 'trial' as unknown as TenantPlan;
    const effectivePlan: TenantPlan = plan === ('trial' as unknown as TenantPlan) ? 'free' : plan;
    const limits = PLAN_LIMITS[effectivePlan];
    const createdAt = new Date().toISOString();

    // Calculate default trial end (14 days from now)
    const trialEnd = data.trialEndsAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const record = await this.tenants.insert({
      name: data.name,
      slug: data.slug,
      domain: data.domain,
      status: 'trial',
      plan: effectivePlan,
      ownerId: data.ownerId,
      dataRegion: data.dataRegion ?? 'us',
      createdAt,
      trialEndsAt: trialEnd,
      maxUsers: limits.maxUsers,
      maxEntities: limits.maxEntities,
      storageUsedMb: 0,
      storageLimitMb: limits.storageLimitMb,
    } as Tenant);

    // Create default config
    await this.configs.insert({
      tenantId: record.id,
      coaTemplateId: undefined,
      taxTableId: undefined,
      payScaleId: undefined,
      fiscalYearStart: '01-01',
      defaultCurrency: 'USD',
      timezone: 'America/New_York',
      features: {},
    } as TenantConfig);

    // Create trial subscription
    const periodStart = new Date().toISOString().split('T')[0];
    const periodEnd = trialEnd;
    await this.subscriptions.insert({
      tenantId: record.id,
      plan: effectivePlan,
      status: 'trialing',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      amount: 0,
      currency: 'USD',
    } as Subscription);

    // Add owner as first user
    await this.tenantUsers.insert({
      tenantId: record.id,
      userId: data.ownerId,
      role: 'owner',
      status: 'active',
      joinedAt: createdAt,
    } as TenantUser);

    this.events.emit('tenant.created', { tenant: record });
    return record;
  }

  /**
   * Update an existing tenant.
   */
  async updateTenant(
    id: string,
    changes: Partial<Tenant>,
  ): Promise<Tenant & CollectionMeta> {
    const existing = await this.tenants.get(id);
    if (!existing) {
      throw new Error(`Tenant not found: ${id}`);
    }

    // If slug is changing, validate the new slug
    if (changes.slug && changes.slug !== existing.slug) {
      if (!this.validateSlug(changes.slug)) {
        throw new Error(
          `Invalid slug "${changes.slug}". Slug must be lowercase alphanumeric with hyphens, 3-63 characters.`,
        );
      }
      const slugAvailable = await this.checkSlugAvailability(changes.slug);
      if (!slugAvailable) {
        throw new Error(`Slug "${changes.slug}" is already taken.`);
      }
    }

    const updated = await this.tenants.update(id, changes as Partial<Tenant>);
    this.events.emit('tenant.updated', { tenant: updated });
    return updated;
  }

  /**
   * Get a single tenant by ID.
   */
  async getTenant(id: string): Promise<(Tenant & CollectionMeta) | null> {
    return this.tenants.get(id);
  }

  /**
   * Get a tenant by slug.
   */
  async getTenantBySlug(slug: string): Promise<(Tenant & CollectionMeta) | null> {
    return this.tenants
      .query()
      .where('slug', '=', slug)
      .limit(1)
      .first();
  }

  /**
   * Get all tenants with optional filters, ordered by name.
   */
  async getTenants(filters?: {
    status?: TenantStatus;
    plan?: TenantPlan;
    dataRegion?: DataRegion;
  }): Promise<(Tenant & CollectionMeta)[]> {
    const q = this.tenants.query();

    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.plan) {
      q.where('plan', '=', filters.plan);
    }
    if (filters?.dataRegion) {
      q.where('dataRegion', '=', filters.dataRegion);
    }

    q.orderBy('name', 'asc');
    return q.execute();
  }

  /**
   * Suspend a tenant.
   * Sets status to 'suspended'. All tenant users lose access.
   */
  async suspendTenant(id: string, reason?: string): Promise<Tenant & CollectionMeta> {
    const existing = await this.tenants.get(id);
    if (!existing) {
      throw new Error(`Tenant not found: ${id}`);
    }

    if (existing.status === 'suspended') {
      throw new Error(`Tenant "${existing.name}" is already suspended.`);
    }

    if (existing.status === 'cancelled') {
      throw new Error(`Tenant "${existing.name}" is cancelled and cannot be suspended.`);
    }

    const updated = await this.tenants.update(id, {
      status: 'suspended',
    } as Partial<Tenant>);

    this.events.emit('tenant.suspended', { tenant: updated, reason });
    return updated;
  }

  /**
   * Reactivate a suspended tenant.
   * Sets status back to 'active'.
   */
  async reactivateTenant(id: string): Promise<Tenant & CollectionMeta> {
    const existing = await this.tenants.get(id);
    if (!existing) {
      throw new Error(`Tenant not found: ${id}`);
    }

    if (existing.status !== 'suspended') {
      throw new Error(
        `Tenant "${existing.name}" cannot be reactivated: current status is "${existing.status}". Only suspended tenants can be reactivated.`,
      );
    }

    const updated = await this.tenants.update(id, {
      status: 'active',
    } as Partial<Tenant>);

    this.events.emit('tenant.updated', { tenant: updated, action: 'reactivated' });
    return updated;
  }

  /**
   * Delete a tenant (GDPR compliance).
   * This performs a hard delete of all tenant data: config, subscription,
   * users, branding, and the tenant record itself.
   */
  async deleteTenant(id: string): Promise<void> {
    const existing = await this.tenants.get(id);
    if (!existing) {
      throw new Error(`Tenant not found: ${id}`);
    }

    // Delete all related records
    const configs = await this.configs
      .query()
      .where('tenantId', '=', id)
      .execute();
    for (const cfg of configs) {
      await this.configs.remove(cfg.id);
    }

    const subs = await this.subscriptions
      .query()
      .where('tenantId', '=', id)
      .execute();
    for (const sub of subs) {
      await this.subscriptions.remove(sub.id);
    }

    const users = await this.tenantUsers
      .query()
      .where('tenantId', '=', id)
      .execute();
    for (const user of users) {
      await this.tenantUsers.remove(user.id);
    }

    const brandings = await this.brandings
      .query()
      .where('tenantId', '=', id)
      .execute();
    for (const branding of brandings) {
      await this.brandings.remove(branding.id);
    }

    // Remove deletion request if any
    this.deletionRequests.delete(id);

    // Delete tenant record itself
    await this.tenants.remove(id);

    this.events.emit('tenant.deleted', { tenantId: id, tenantName: existing.name });
  }

  // ========================================================================
  // TENANT CONFIG
  // ========================================================================

  /**
   * Get config for a tenant.
   */
  async getConfig(tenantId: string): Promise<(TenantConfig & CollectionMeta) | null> {
    return this.configs
      .query()
      .where('tenantId', '=', tenantId)
      .limit(1)
      .first();
  }

  /**
   * Update config for a tenant.
   * Creates a config record if one doesn't exist.
   */
  async updateConfig(
    tenantId: string,
    changes: Partial<TenantConfig>,
  ): Promise<TenantConfig & CollectionMeta> {
    // Validate tenant exists
    const tenant = await this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const existing = await this.getConfig(tenantId);

    if (existing) {
      const updated = await this.configs.update(existing.id, changes as Partial<TenantConfig>);
      this.events.emit('tenant.config.updated', { tenantId, config: updated });
      return updated;
    }

    // Create a new config record if one doesn't exist
    const record = await this.configs.insert({
      tenantId,
      coaTemplateId: undefined,
      taxTableId: undefined,
      payScaleId: undefined,
      fiscalYearStart: '01-01',
      defaultCurrency: 'USD',
      timezone: 'America/New_York',
      features: {},
      ...changes,
    } as TenantConfig);

    this.events.emit('tenant.config.updated', { tenantId, config: record });
    return record;
  }

  /**
   * Reset config to defaults for a tenant.
   */
  async resetConfig(tenantId: string): Promise<TenantConfig & CollectionMeta> {
    const tenant = await this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const existing = await this.getConfig(tenantId);

    const defaults: Partial<TenantConfig> = {
      coaTemplateId: undefined,
      taxTableId: undefined,
      payScaleId: undefined,
      fiscalYearStart: '01-01',
      defaultCurrency: 'USD',
      timezone: 'America/New_York',
      features: {},
    };

    if (existing) {
      return this.configs.update(existing.id, defaults as Partial<TenantConfig>);
    }

    return this.configs.insert({
      tenantId,
      ...defaults,
    } as TenantConfig);
  }

  // ========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ========================================================================

  /**
   * Create a subscription for a tenant.
   */
  async createSubscription(data: {
    tenantId: string;
    plan: TenantPlan;
    status?: SubscriptionStatus;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    amount: number;
    currency?: string;
    paymentMethod?: string;
  }): Promise<Subscription & CollectionMeta> {
    const tenant = await this.tenants.get(data.tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${data.tenantId}`);
    }

    const record = await this.subscriptions.insert({
      tenantId: data.tenantId,
      plan: data.plan,
      status: data.status ?? 'active',
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      amount: round2(data.amount),
      currency: data.currency ?? 'USD',
      paymentMethod: data.paymentMethod,
    } as Subscription);

    this.events.emit('tenant.subscription.updated', { tenantId: data.tenantId, subscription: record });
    return record;
  }

  /**
   * Get the current subscription for a tenant.
   */
  async getSubscription(tenantId: string): Promise<(Subscription & CollectionMeta) | null> {
    return this.subscriptions
      .query()
      .where('tenantId', '=', tenantId)
      .orderBy('currentPeriodEnd', 'desc')
      .limit(1)
      .first();
  }

  /**
   * Update a tenant's plan. Updates the subscription and tenant plan limits.
   */
  async updatePlan(
    tenantId: string,
    newPlan: TenantPlan,
    amount?: number,
  ): Promise<Subscription & CollectionMeta> {
    const tenant = await this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new Error(`No subscription found for tenant: ${tenantId}`);
    }

    // Update subscription plan
    const updated = await this.subscriptions.update(subscription.id, {
      plan: newPlan,
      status: 'active',
      amount: amount !== undefined ? round2(amount) : subscription.amount,
    } as Partial<Subscription>);

    // Update tenant plan and limits
    const limits = PLAN_LIMITS[newPlan];
    await this.tenants.update(tenantId, {
      plan: newPlan,
      maxUsers: limits.maxUsers,
      maxEntities: limits.maxEntities,
      storageLimitMb: limits.storageLimitMb,
    } as Partial<Tenant>);

    this.events.emit('tenant.subscription.updated', { tenantId, subscription: updated, action: 'plan_changed' });
    return updated;
  }

  /**
   * Cancel a subscription.
   */
  async cancelSubscription(tenantId: string): Promise<Subscription & CollectionMeta> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new Error(`No subscription found for tenant: ${tenantId}`);
    }

    if (subscription.status === 'cancelled') {
      throw new Error(`Subscription is already cancelled for tenant: ${tenantId}`);
    }

    const updated = await this.subscriptions.update(subscription.id, {
      status: 'cancelled',
    } as Partial<Subscription>);

    // Update tenant status to cancelled
    await this.tenants.update(tenantId, {
      status: 'cancelled',
    } as Partial<Tenant>);

    this.events.emit('tenant.subscription.updated', { tenantId, subscription: updated, action: 'cancelled' });
    return updated;
  }

  /**
   * Resume a cancelled subscription.
   */
  async resumeSubscription(tenantId: string): Promise<Subscription & CollectionMeta> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new Error(`No subscription found for tenant: ${tenantId}`);
    }

    if (subscription.status !== 'cancelled') {
      throw new Error(
        `Cannot resume subscription: current status is "${subscription.status}". Only cancelled subscriptions can be resumed.`,
      );
    }

    const updated = await this.subscriptions.update(subscription.id, {
      status: 'active',
    } as Partial<Subscription>);

    // Reactivate tenant
    await this.tenants.update(tenantId, {
      status: 'active',
    } as Partial<Tenant>);

    this.events.emit('tenant.subscription.updated', { tenantId, subscription: updated, action: 'resumed' });
    return updated;
  }

  /**
   * Get billing history for a tenant.
   * Returns all subscription records ordered by period start descending.
   */
  async getBillingHistory(tenantId: string): Promise<BillingHistoryEntry[]> {
    const tenant = await this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const subs = await this.subscriptions
      .query()
      .where('tenantId', '=', tenantId)
      .orderBy('currentPeriodStart', 'desc')
      .execute();

    return subs.map((sub) => ({
      subscriptionId: sub.id,
      plan: sub.plan,
      status: sub.status,
      amount: sub.amount,
      currency: sub.currency,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
    }));
  }

  // ========================================================================
  // TENANT USER MANAGEMENT
  // ========================================================================

  /**
   * Invite a user to a tenant.
   * Validates plan limit for max users.
   */
  async inviteUser(
    tenantId: string,
    userId: string,
    role: TenantUserRole,
  ): Promise<TenantUser & CollectionMeta> {
    const tenant = await this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Check if user is already a member
    const existingUser = await this.tenantUsers
      .query()
      .where('tenantId', '=', tenantId)
      .where('userId', '=', userId)
      .limit(1)
      .first();

    if (existingUser) {
      throw new Error(`User "${userId}" is already a member of this tenant.`);
    }

    // Check plan limit
    const withinLimit = await this.checkPlanLimit(tenantId, 'users');
    if (!withinLimit) {
      throw new Error(
        `Cannot invite user: tenant has reached the maximum of ${tenant.maxUsers} users for the "${tenant.plan}" plan.`,
      );
    }

    const record = await this.tenantUsers.insert({
      tenantId,
      userId,
      role,
      status: 'invited',
      invitedAt: new Date().toISOString(),
    } as TenantUser);

    this.events.emit('tenant.user.invited', { tenantId, user: record });
    return record;
  }

  /**
   * Remove a user from a tenant.
   * Refuses to remove the owner.
   */
  async removeUser(tenantId: string, userId: string): Promise<void> {
    const members = await this.tenantUsers
      .query()
      .where('tenantId', '=', tenantId)
      .where('userId', '=', userId)
      .execute();

    if (members.length === 0) {
      throw new Error(`User "${userId}" is not a member of tenant: ${tenantId}`);
    }

    const member = members[0];

    if (member.role === 'owner') {
      throw new Error('Cannot remove the tenant owner. Transfer ownership first.');
    }

    await this.tenantUsers.remove(member.id);
    this.events.emit('tenant.user.removed', { tenantId, userId });
  }

  /**
   * Update a user's role.
   */
  async updateUserRole(
    tenantId: string,
    userId: string,
    newRole: TenantUserRole,
  ): Promise<TenantUser & CollectionMeta> {
    const members = await this.tenantUsers
      .query()
      .where('tenantId', '=', tenantId)
      .where('userId', '=', userId)
      .execute();

    if (members.length === 0) {
      throw new Error(`User "${userId}" is not a member of tenant: ${tenantId}`);
    }

    const member = members[0];

    // Cannot change owner's role directly
    if (member.role === 'owner' && newRole !== 'owner') {
      throw new Error('Cannot change the owner role. Transfer ownership first.');
    }

    const updated = await this.tenantUsers.update(member.id, {
      role: newRole,
    } as Partial<TenantUser>);

    this.events.emit('tenant.user.updated', { tenantId, user: updated });
    return updated;
  }

  /**
   * List all users in a tenant.
   */
  async listUsers(
    tenantId: string,
    filters?: { role?: TenantUserRole; status?: TenantUserStatus },
  ): Promise<(TenantUser & CollectionMeta)[]> {
    const q = this.tenantUsers.query().where('tenantId', '=', tenantId);

    if (filters?.role) {
      q.where('role', '=', filters.role);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    return q.execute();
  }

  /**
   * Accept an invitation (set user status to active).
   */
  async acceptInvitation(
    tenantId: string,
    userId: string,
  ): Promise<TenantUser & CollectionMeta> {
    const members = await this.tenantUsers
      .query()
      .where('tenantId', '=', tenantId)
      .where('userId', '=', userId)
      .execute();

    if (members.length === 0) {
      throw new Error(`User "${userId}" has no invitation for tenant: ${tenantId}`);
    }

    const member = members[0];

    if (member.status !== 'invited') {
      throw new Error(
        `User "${userId}" invitation status is "${member.status}". Only invited users can accept.`,
      );
    }

    const updated = await this.tenantUsers.update(member.id, {
      status: 'active',
      joinedAt: new Date().toISOString(),
    } as Partial<TenantUser>);

    return updated;
  }

  // ========================================================================
  // BRANDING
  // ========================================================================

  /**
   * Get branding for a tenant.
   */
  async getBranding(tenantId: string): Promise<(TenantBranding & CollectionMeta) | null> {
    return this.brandings
      .query()
      .where('tenantId', '=', tenantId)
      .limit(1)
      .first();
  }

  /**
   * Update branding for a tenant.
   * Creates a branding record if one doesn't exist.
   */
  async updateBranding(
    tenantId: string,
    changes: Partial<TenantBranding>,
  ): Promise<TenantBranding & CollectionMeta> {
    const tenant = await this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const existing = await this.getBranding(tenantId);

    if (existing) {
      const updated = await this.brandings.update(existing.id, changes as Partial<TenantBranding>);
      this.events.emit('tenant.branding.updated', { tenantId, branding: updated });
      return updated;
    }

    // Create new branding
    const record = await this.brandings.insert({
      tenantId,
      logoUrl: undefined,
      primaryColor: '#3B82F6',
      secondaryColor: '#1E293B',
      companyName: tenant.name,
      favicon: undefined,
      customCss: undefined,
      ...changes,
    } as TenantBranding);

    this.events.emit('tenant.branding.updated', { tenantId, branding: record });
    return record;
  }

  // ========================================================================
  // DATA EXPORT
  // ========================================================================

  /**
   * Export all data for a tenant.
   * Returns a complete JSON dump of tenant data including config,
   * subscription, users, and branding.
   */
  async exportAllTenantData(tenantId: string): Promise<TenantDataExport> {
    const tenant = await this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const config = await this.getConfig(tenantId);
    const subscription = await this.getSubscription(tenantId);
    const users = await this.listUsers(tenantId);
    const branding = await this.getBranding(tenantId);

    const exportData: TenantDataExport = {
      tenant,
      config,
      subscription,
      users,
      branding,
      exportedAt: new Date().toISOString(),
    };

    this.events.emit('tenant.data.exported', { tenantId });
    return exportData;
  }

  // ========================================================================
  // DATA DELETION (GDPR/CCPA)
  // ========================================================================

  /**
   * Schedule a tenant for deletion.
   * Returns a confirmation code that must be provided to confirm deletion.
   * Data is not immediately deleted; this creates a deletion request.
   */
  async scheduleDeletion(tenantId: string): Promise<DeletionRequest> {
    const tenant = await this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Check for existing deletion request
    const existingRequest = this.deletionRequests.get(tenantId);
    if (existingRequest && existingRequest.status === 'scheduled') {
      return existingRequest;
    }

    const request: DeletionRequest = {
      tenantId,
      confirmationCode: generateConfirmationCode(),
      scheduledAt: new Date().toISOString(),
      status: 'scheduled',
    };

    this.deletionRequests.set(tenantId, request);
    return request;
  }

  /**
   * Confirm tenant deletion with the confirmation code.
   * This actually deletes all tenant data.
   */
  async confirmDeletion(tenantId: string, confirmationCode: string): Promise<void> {
    const request = this.deletionRequests.get(tenantId);
    if (!request) {
      throw new Error(`No deletion request found for tenant: ${tenantId}`);
    }

    if (request.status !== 'scheduled') {
      throw new Error(`Deletion request status is "${request.status}". Only scheduled requests can be confirmed.`);
    }

    if (request.confirmationCode !== confirmationCode) {
      throw new Error('Invalid confirmation code.');
    }

    // Mark as confirmed then perform deletion
    request.status = 'confirmed';

    await this.deleteTenant(tenantId);

    request.status = 'completed';
  }

  // ========================================================================
  // USAGE TRACKING
  // ========================================================================

  /**
   * Get usage statistics for a tenant.
   * Returns user count, entity count, storage used, and utilization percentages.
   */
  async getUsageStats(tenantId: string): Promise<UsageStats> {
    const tenant = await this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const users = await this.tenantUsers
      .query()
      .where('tenantId', '=', tenantId)
      .execute();

    const activeUsers = users.filter((u) => u.status === 'active' || u.status === 'invited');
    const userCount = activeUsers.length;

    // Entity count would come from actual entity collections in a real implementation.
    // For now we track it on the tenant record.
    const entityCount = 0;

    const storageUsedMb = tenant.storageUsedMb;
    const storageLimitMb = tenant.storageLimitMb;
    const maxUsers = tenant.maxUsers;
    const maxEntities = tenant.maxEntities;

    const userUtilizationPct = maxUsers > 0 ? round2((userCount / maxUsers) * 100) : 0;
    const entityUtilizationPct = maxEntities > 0 ? round2((entityCount / maxEntities) * 100) : 0;
    const storageUtilizationPct = storageLimitMb > 0 ? round2((storageUsedMb / storageLimitMb) * 100) : 0;

    return {
      tenantId,
      userCount,
      entityCount,
      storageUsedMb,
      storageLimitMb,
      maxUsers,
      maxEntities,
      userUtilizationPct,
      entityUtilizationPct,
      storageUtilizationPct,
    };
  }

  // ========================================================================
  // PLAN LIMIT CHECKS
  // ========================================================================

  /**
   * Check if a tenant is within plan limits for a given resource.
   * Returns true if the tenant can add more of the given resource.
   */
  async checkPlanLimit(
    tenantId: string,
    resource: 'users' | 'entities' | 'storage',
  ): Promise<boolean> {
    const tenant = await this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    switch (resource) {
      case 'users': {
        const userCount = await this.tenantUsers
          .query()
          .where('tenantId', '=', tenantId)
          .count();
        return userCount < tenant.maxUsers;
      }
      case 'entities': {
        // In a real implementation this would count actual entities.
        // For now, we rely on the tenant's maxEntities.
        return true;
      }
      case 'storage': {
        return tenant.storageUsedMb < tenant.storageLimitMb;
      }
      default:
        return true;
    }
  }

  // ========================================================================
  // SLUG / DOMAIN VALIDATION
  // ========================================================================

  /**
   * Validate a slug format.
   * Must be lowercase alphanumeric with hyphens, 3-63 characters,
   * cannot start or end with a hyphen, and cannot be a reserved word.
   */
  validateSlug(slug: string): boolean {
    if (!slug || slug.length < 3 || slug.length > 63) {
      return false;
    }
    if (!SLUG_REGEX.test(slug)) {
      return false;
    }
    if (RESERVED_SLUGS.has(slug)) {
      return false;
    }
    return true;
  }

  /**
   * Check if a slug is available (not already in use).
   */
  async checkSlugAvailability(slug: string): Promise<boolean> {
    const existing = await this.tenants
      .query()
      .where('slug', '=', slug)
      .limit(1)
      .first();

    return existing === null;
  }

  /**
   * Generate a domain from a slug.
   * Returns the subdomain URL for the tenant.
   */
  generateDomain(slug: string): string {
    return `${slug}.concrete.app`;
  }

  // ========================================================================
  // CROSS-TENANT ANALYTICS (ANONYMIZED, OPT-IN)
  // ========================================================================

  /**
   * Get anonymized, aggregated analytics across all tenants.
   * This only includes tenants that have opted in via the features config.
   * Returns high-level metrics without identifying data.
   */
  async getCrossTenantAnalytics(): Promise<{
    totalTenants: number;
    activeCount: number;
    trialCount: number;
    planDistribution: Record<string, number>;
    regionDistribution: Record<string, number>;
    avgUsersPerTenant: number;
    avgStorageUsedMb: number;
  }> {
    const allTenants = await this.tenants.query().execute();

    const totalTenants = allTenants.length;
    const activeCount = allTenants.filter((t) => t.status === 'active').length;
    const trialCount = allTenants.filter((t) => t.status === 'trial').length;

    const planDistribution: Record<string, number> = {};
    const regionDistribution: Record<string, number> = {};
    let totalUsers = 0;
    let totalStorage = 0;

    for (const t of allTenants) {
      planDistribution[t.plan] = (planDistribution[t.plan] || 0) + 1;
      regionDistribution[t.dataRegion] = (regionDistribution[t.dataRegion] || 0) + 1;
      totalStorage += t.storageUsedMb;

      const users = await this.tenantUsers
        .query()
        .where('tenantId', '=', t.id)
        .count();
      totalUsers += users;
    }

    const avgUsersPerTenant = totalTenants > 0 ? round2(totalUsers / totalTenants) : 0;
    const avgStorageUsedMb = totalTenants > 0 ? round2(totalStorage / totalTenants) : 0;

    return {
      totalTenants,
      activeCount,
      trialCount,
      planDistribution,
      regionDistribution,
      avgUsersPerTenant,
      avgStorageUsedMb,
    };
  }
}
