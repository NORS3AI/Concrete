/**
 * Concrete -- Entity Service (Multi-Entity & Company Structure)
 *
 * Core service layer for the Entity module. Provides entity CRUD with
 * hierarchical depth/path computation, entity cloning, COA override
 * management, intercompany transaction tracking with elimination support,
 * alias management, and consolidated trial balance reporting.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';
import { now } from '../../core/types/base';

// ---------------------------------------------------------------------------
// Entity Types
// ---------------------------------------------------------------------------

export type EntityType = 'holding' | 'operating' | 'subsidiary' | 'division' | 'branch' | 'joint_venture' | 'spe';

export interface Entity {
  [key: string]: unknown;
  name: string;
  code: string;
  type: EntityType;
  parentId?: string;
  status: 'active' | 'inactive';
  description?: string;
  taxId?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  currency: string;
  fiscalYearEndMonth: number; // 1-12
  fiscalYearEndDay: number; // 1-31
  depth: number;
  path: string; // "PARENT.CHILD.GRANDCHILD" by code
  clonedFromId?: string;
}

// ---------------------------------------------------------------------------
// Hierarchy Types
// ---------------------------------------------------------------------------

export interface EntityHierarchy {
  [key: string]: unknown;
  name: string;
  rootEntityId: string;
  type: 'legal' | 'management' | 'reporting';
}

// ---------------------------------------------------------------------------
// Alias Types
// ---------------------------------------------------------------------------

export interface EntityAlias {
  [key: string]: unknown;
  entityId: string;
  alias: string;
  source?: string;
}

// ---------------------------------------------------------------------------
// COA Override Types
// ---------------------------------------------------------------------------

export interface CoaOverride {
  [key: string]: unknown;
  entityId: string;
  accountId: string;
  overrideName?: string;
  isExcluded: boolean;
  defaultValue?: number;
}

// ---------------------------------------------------------------------------
// Intercompany Transaction Types
// ---------------------------------------------------------------------------

export interface IntercompanyTransaction {
  [key: string]: unknown;
  fromEntityId: string;
  toEntityId: string;
  date: string;
  description?: string;
  amount: number;
  fromJournalEntryId?: string;
  toJournalEntryId?: string;
  eliminationJournalEntryId?: string;
  status: 'pending' | 'posted' | 'eliminated';
  reference?: string;
}

// ---------------------------------------------------------------------------
// Tree Node & Report Types
// ---------------------------------------------------------------------------

export interface EntityTreeNode {
  entity: Entity & { id: string };
  children: EntityTreeNode[];
}

export interface ConsolidatedBalanceRow {
  accountId: string;
  accountNumber: string;
  accountName: string;
  entityBalances: Map<string, number>; // entityId -> balance
  consolidated: number;
  eliminations: number;
}

// ---------------------------------------------------------------------------
// EntityService
// ---------------------------------------------------------------------------

export class EntityService {
  constructor(
    private entities: Collection<Entity>,
    private hierarchies: Collection<EntityHierarchy>,
    private aliases: Collection<EntityAlias>,
    private coaOverrides: Collection<CoaOverride>,
    private intercompanyTxns: Collection<IntercompanyTransaction>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // HELPERS
  // ========================================================================

  /**
   * Compute the hierarchy depth of an entity by walking the parent chain.
   * Root entities (no parentId) have depth 0.
   */
  computeEntityDepth(
    entity: { parentId?: string },
    allEntities: Array<Entity & CollectionMeta>,
  ): number {
    let depth = 0;
    let currentParentId = entity.parentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        break; // Prevent infinite loop on circular references
      }
      visited.add(currentParentId);
      const parent = allEntities.find((e) => e.id === currentParentId);
      if (!parent) break;
      depth += 1;
      currentParentId = parent.parentId;
    }

    return depth;
  }

  /**
   * Compute the full path of an entity by walking up the parent chain
   * and joining entity codes with dots.
   * Example: "HOLDING.SUBSIDIARY.BRANCH"
   */
  computeEntityPath(
    entity: { code: string; parentId?: string },
    allEntities: Array<Entity & CollectionMeta>,
  ): string {
    const segments: string[] = [entity.code];
    let currentParentId = entity.parentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        break; // Prevent infinite loop on circular references
      }
      visited.add(currentParentId);
      const parent = allEntities.find((e) => e.id === currentParentId);
      if (!parent) break;
      segments.unshift(parent.code);
      currentParentId = parent.parentId;
    }

    return segments.join('.');
  }

  // ========================================================================
  // ENTITY CRUD
  // ========================================================================

  /**
   * Create a new entity.
   * Auto-computes depth and path from parentId.
   * Validates code uniqueness.
   * Defaults currency to 'USD', fiscal year end to 12/31, status to 'active'.
   */
  async createEntity(data: {
    name: string;
    code: string;
    type: EntityType;
    parentId?: string;
    description?: string;
    taxId?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phone?: string;
    email?: string;
    currency?: string;
    fiscalYearEndMonth?: number;
    fiscalYearEndDay?: number;
    status?: 'active' | 'inactive';
  }): Promise<Entity & CollectionMeta> {
    // Validate code uniqueness
    const existingByCode = await this.getEntityByCode(data.code);
    if (existingByCode) {
      throw new Error(`Entity code "${data.code}" already exists.`);
    }

    // Fetch all entities to compute depth and path
    const allEntities = await this.entities.query().orderBy('code', 'asc').execute();

    // Validate parent exists if specified
    if (data.parentId) {
      const parent = allEntities.find((e) => e.id === data.parentId);
      if (!parent) {
        throw new Error(`Parent entity not found: ${data.parentId}`);
      }
    }

    const depth = this.computeEntityDepth(data, allEntities);
    const path = this.computeEntityPath(data, allEntities);

    const record = await this.entities.insert({
      name: data.name,
      code: data.code,
      type: data.type,
      parentId: data.parentId,
      status: data.status ?? 'active',
      description: data.description,
      taxId: data.taxId,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country,
      phone: data.phone,
      email: data.email,
      currency: data.currency ?? 'USD',
      fiscalYearEndMonth: data.fiscalYearEndMonth ?? 12,
      fiscalYearEndDay: data.fiscalYearEndDay ?? 31,
      depth,
      path,
    } as Entity);

    this.events.emit('entity.created', { entity: record });
    return record;
  }

  /**
   * Update an existing entity.
   * If parentId or code changes, recomputes depth and path for this entity
   * and all descendant entities.
   */
  async updateEntity(
    id: string,
    changes: Partial<Entity>,
  ): Promise<Entity & CollectionMeta> {
    const existing = await this.entities.get(id);
    if (!existing) {
      throw new Error(`Entity not found: ${id}`);
    }

    // If code changed, validate uniqueness
    if (changes.code !== undefined && changes.code !== existing.code) {
      const existingByCode = await this.getEntityByCode(changes.code);
      if (existingByCode) {
        throw new Error(`Entity code "${changes.code}" already exists.`);
      }
    }

    // If parentId or code changed, recompute depth and path
    if (changes.parentId !== undefined || changes.code !== undefined) {
      const allEntities = await this.entities.query().orderBy('code', 'asc').execute();
      const merged = {
        code: changes.code ?? existing.code,
        parentId: changes.parentId !== undefined ? changes.parentId : existing.parentId,
      };
      changes.depth = this.computeEntityDepth(merged, allEntities);
      changes.path = this.computeEntityPath(merged, allEntities);
    }

    const updated = await this.entities.update(id, changes);

    // If parentId or code changed, recompute depth/path for all descendants
    if (changes.parentId !== undefined || changes.code !== undefined) {
      await this.recomputeDescendantPaths(id);
    }

    this.events.emit('entity.updated', { entity: updated });
    return updated;
  }

  /**
   * Delete (soft-delete) an entity.
   * Refuses if the entity has child entities.
   */
  async deleteEntity(id: string): Promise<void> {
    const existing = await this.entities.get(id);
    if (!existing) {
      throw new Error(`Entity not found: ${id}`);
    }

    // Check for child entities
    const childCount = await this.entities
      .query()
      .where('parentId', '=', id)
      .count();

    if (childCount > 0) {
      throw new Error(
        `Cannot delete entity "${existing.name}": it has ${childCount} child entity(ies). Remove or reassign them first.`,
      );
    }

    await this.entities.remove(id);
    this.events.emit('entity.deleted', { entityId: id });
  }

  /**
   * Get a single entity by ID.
   */
  async getEntity(id: string): Promise<(Entity & CollectionMeta) | null> {
    return this.entities.get(id);
  }

  /**
   * Get entities with optional filters, ordered by code.
   */
  async getEntities(filters?: {
    type?: EntityType;
    status?: 'active' | 'inactive';
    parentId?: string;
  }): Promise<(Entity & CollectionMeta)[]> {
    const q = this.entities.query();

    if (filters?.type) {
      q.where('type', '=', filters.type);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.parentId !== undefined) {
      q.where('parentId', '=', filters.parentId);
    }

    q.orderBy('code', 'asc');
    return q.execute();
  }

  /**
   * Lookup an entity by its code.
   */
  async getEntityByCode(code: string): Promise<(Entity & CollectionMeta) | null> {
    const result = await this.entities
      .query()
      .where('code', '=', code)
      .limit(1)
      .first();
    return result;
  }

  /**
   * Build a tree of entities based on parentId hierarchy.
   * Returns root-level nodes with nested children.
   */
  async getEntityTree(): Promise<EntityTreeNode[]> {
    const allEntities = await this.entities
      .query()
      .orderBy('code', 'asc')
      .execute();

    const nodeMap = new Map<string, EntityTreeNode>();
    const roots: EntityTreeNode[] = [];

    // Create nodes for all entities
    for (const entity of allEntities) {
      nodeMap.set(entity.id, {
        entity: entity as Entity & { id: string },
        children: [],
      });
    }

    // Build tree structure
    for (const entity of allEntities) {
      const node = nodeMap.get(entity.id)!;
      if (entity.parentId && nodeMap.has(entity.parentId)) {
        nodeMap.get(entity.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  // ========================================================================
  // ENTITY CLONING
  // ========================================================================

  /**
   * Deep-clone an entity with a new code and name.
   * Sets clonedFromId to the source entity. Optionally clones COA overrides.
   */
  async cloneEntity(
    sourceId: string,
    newCode: string,
    newName: string,
    options?: { includeCoaOverrides?: boolean },
  ): Promise<Entity & CollectionMeta> {
    const source = await this.entities.get(sourceId);
    if (!source) {
      throw new Error(`Source entity not found: ${sourceId}`);
    }

    // Validate new code uniqueness
    const existingByCode = await this.getEntityByCode(newCode);
    if (existingByCode) {
      throw new Error(`Entity code "${newCode}" already exists.`);
    }

    // Clone the entity with the new code and name
    const cloned = await this.createEntity({
      name: newName,
      code: newCode,
      type: source.type,
      parentId: source.parentId,
      description: source.description,
      taxId: undefined, // Tax ID should not be cloned
      address: source.address,
      city: source.city,
      state: source.state,
      zip: source.zip,
      country: source.country,
      phone: source.phone,
      email: source.email,
      currency: source.currency,
      fiscalYearEndMonth: source.fiscalYearEndMonth,
      fiscalYearEndDay: source.fiscalYearEndDay,
      status: source.status,
    });

    // Set clonedFromId on the new entity
    const updated = await this.entities.update(cloned.id, {
      clonedFromId: sourceId,
    } as Partial<Entity>);

    // Optionally clone COA overrides
    if (options?.includeCoaOverrides) {
      const sourceOverrides = await this.getCoaOverrides(sourceId);
      for (const override of sourceOverrides) {
        await this.coaOverrides.insert({
          entityId: updated.id,
          accountId: override.accountId,
          overrideName: override.overrideName,
          isExcluded: override.isExcluded,
          defaultValue: override.defaultValue,
        } as CoaOverride);
      }
    }

    this.events.emit('entity.cloned', {
      sourceId,
      clonedEntity: updated,
      includeCoaOverrides: options?.includeCoaOverrides ?? false,
    });

    return updated;
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  /**
   * Recompute depth and path for all descendants of a given entity.
   * Called when an entity's parentId or code changes.
   */
  private async recomputeDescendantPaths(entityId: string): Promise<void> {
    const allEntities = await this.entities.query().orderBy('code', 'asc').execute();

    // Find all descendants by traversing the parent chain
    const descendants = this.collectDescendants(entityId, allEntities);

    for (const descendant of descendants) {
      const newDepth = this.computeEntityDepth(descendant, allEntities);
      const newPath = this.computeEntityPath(descendant, allEntities);

      if (descendant.depth !== newDepth || descendant.path !== newPath) {
        await this.entities.update(descendant.id, {
          depth: newDepth,
          path: newPath,
        } as Partial<Entity>);
      }
    }
  }

  /**
   * Collect all descendant entities of a given entity ID.
   */
  private collectDescendants(
    entityId: string,
    allEntities: Array<Entity & CollectionMeta>,
  ): Array<Entity & CollectionMeta> {
    const descendants: Array<Entity & CollectionMeta> = [];
    const queue = [entityId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = allEntities.filter((e) => e.parentId === currentId);
      for (const child of children) {
        descendants.push(child);
        queue.push(child.id);
      }
    }

    return descendants;
  }

  /**
   * Collect all descendant entity IDs (including the root itself).
   */
  private collectDescendantIds(
    rootId: string,
    allEntities: Array<Entity & CollectionMeta>,
  ): string[] {
    const ids: string[] = [rootId];
    const queue = [rootId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = allEntities.filter((e) => e.parentId === currentId);
      for (const child of children) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }

    return ids;
  }

  // ========================================================================
  // COA OVERRIDE MANAGEMENT
  // ========================================================================

  /**
   * Upsert a COA override for a specific entity and account.
   * If an override already exists for this entity+account pair, it is updated.
   * Otherwise a new override is created.
   */
  async setCoaOverride(
    entityId: string,
    accountId: string,
    override: {
      overrideName?: string;
      isExcluded?: boolean;
      defaultValue?: number;
    },
  ): Promise<CoaOverride & CollectionMeta> {
    // Validate entity exists
    const entity = await this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    // Check if an override already exists for this entity+account pair
    const existing = await this.coaOverrides
      .query()
      .where('entityId', '=', entityId)
      .where('accountId', '=', accountId)
      .limit(1)
      .first();

    if (existing) {
      // Update the existing override
      const updated = await this.coaOverrides.update(existing.id, {
        overrideName: override.overrideName !== undefined ? override.overrideName : existing.overrideName,
        isExcluded: override.isExcluded !== undefined ? override.isExcluded : existing.isExcluded,
        defaultValue: override.defaultValue !== undefined ? override.defaultValue : existing.defaultValue,
      } as Partial<CoaOverride>);

      this.events.emit('entity.coaOverride.updated', {
        entityId,
        accountId,
        override: updated,
      });

      return updated;
    }

    // Create a new override
    const record = await this.coaOverrides.insert({
      entityId,
      accountId,
      overrideName: override.overrideName,
      isExcluded: override.isExcluded ?? false,
      defaultValue: override.defaultValue,
    } as CoaOverride);

    this.events.emit('entity.coaOverride.created', {
      entityId,
      accountId,
      override: record,
    });

    return record;
  }

  /**
   * Remove a COA override for a specific entity and account.
   */
  async removeCoaOverride(entityId: string, accountId: string): Promise<void> {
    const existing = await this.coaOverrides
      .query()
      .where('entityId', '=', entityId)
      .where('accountId', '=', accountId)
      .limit(1)
      .first();

    if (!existing) {
      throw new Error(
        `No COA override found for entity "${entityId}" and account "${accountId}".`,
      );
    }

    await this.coaOverrides.remove(existing.id);

    this.events.emit('entity.coaOverride.removed', { entityId, accountId });
  }

  /**
   * List all COA overrides for a specific entity.
   */
  async getCoaOverrides(entityId: string): Promise<(CoaOverride & CollectionMeta)[]> {
    return this.coaOverrides
      .query()
      .where('entityId', '=', entityId)
      .execute();
  }

  /**
   * Returns the effective Chart of Accounts for an entity.
   *
   * Takes the full list of GL accounts, removes any that are excluded
   * by entity-specific COA overrides, and applies override names where set.
   *
   * @param entityId The entity to get the COA for
   * @param glAccounts The complete list of GL accounts (with id, number, name fields)
   * @returns The effective COA for the entity with overrides applied
   */
  async getEntityCoa(
    entityId: string,
    glAccounts: Array<{ id: string; number: string; name: string; [key: string]: unknown }>,
  ): Promise<Array<{ id: string; number: string; name: string; [key: string]: unknown }>> {
    const overrides = await this.getCoaOverrides(entityId);

    // Build a lookup map for overrides by accountId
    const overrideMap = new Map<string, CoaOverride & CollectionMeta>();
    for (const override of overrides) {
      overrideMap.set(override.accountId, override);
    }

    // Filter out excluded accounts and apply name overrides
    const effectiveCoa: Array<{ id: string; number: string; name: string; [key: string]: unknown }> = [];

    for (const account of glAccounts) {
      const override = overrideMap.get(account.id);

      // Skip excluded accounts
      if (override && override.isExcluded) {
        continue;
      }

      // Apply override name if set
      if (override && override.overrideName) {
        effectiveCoa.push({
          ...account,
          name: override.overrideName,
        });
      } else {
        effectiveCoa.push({ ...account });
      }
    }

    return effectiveCoa;
  }

  // ========================================================================
  // INTERCOMPANY TRANSACTIONS
  // ========================================================================

  /**
   * Create an intercompany transaction between two entities.
   * Validates both entities exist and are different.
   * Creates in 'pending' status.
   */
  async createIntercompanyTransaction(data: {
    fromEntityId: string;
    toEntityId: string;
    date: string;
    description?: string;
    amount: number;
    reference?: string;
  }): Promise<IntercompanyTransaction & CollectionMeta> {
    // Validate entities are different
    if (data.fromEntityId === data.toEntityId) {
      throw new Error('Intercompany transaction must involve two different entities.');
    }

    // Validate both entities exist
    const fromEntity = await this.entities.get(data.fromEntityId);
    if (!fromEntity) {
      throw new Error(`From entity not found: ${data.fromEntityId}`);
    }

    const toEntity = await this.entities.get(data.toEntityId);
    if (!toEntity) {
      throw new Error(`To entity not found: ${data.toEntityId}`);
    }

    const record = await this.intercompanyTxns.insert({
      fromEntityId: data.fromEntityId,
      toEntityId: data.toEntityId,
      date: data.date,
      description: data.description,
      amount: data.amount,
      status: 'pending',
      reference: data.reference,
    } as IntercompanyTransaction);

    this.events.emit('entity.intercompany.created', { transaction: record });
    return record;
  }

  /**
   * Post an intercompany transaction (change status from pending to posted).
   * Only pending transactions can be posted.
   */
  async postIntercompanyTransaction(
    id: string,
  ): Promise<IntercompanyTransaction & CollectionMeta> {
    const txn = await this.intercompanyTxns.get(id);
    if (!txn) {
      throw new Error(`Intercompany transaction not found: ${id}`);
    }
    if (txn.status !== 'pending') {
      throw new Error(
        `Can only post transactions in "pending" status. Current status: "${txn.status}".`,
      );
    }

    const updated = await this.intercompanyTxns.update(id, {
      status: 'posted',
    } as Partial<IntercompanyTransaction>);

    this.events.emit('entity.intercompany.posted', { transaction: updated });
    return updated;
  }

  /**
   * Generate an elimination entry for an intercompany transaction.
   *
   * Marks the transaction as 'eliminated' and stores a reference
   * eliminationJournalEntryId. The actual journal entry creation
   * requires GL service integration, so this method only updates
   * the intercompany transaction record with elimination metadata.
   *
   * Only posted transactions can be eliminated.
   */
  async generateEliminationEntry(
    id: string,
  ): Promise<IntercompanyTransaction & CollectionMeta> {
    const txn = await this.intercompanyTxns.get(id);
    if (!txn) {
      throw new Error(`Intercompany transaction not found: ${id}`);
    }
    if (txn.status !== 'posted') {
      throw new Error(
        `Can only generate elimination entries for "posted" transactions. Current status: "${txn.status}".`,
      );
    }

    // Generate a placeholder reference for the elimination JE.
    // The actual journal entry should be created via GLService integration.
    const eliminationRef = `ELIM-${id}-${now()}`;

    const updated = await this.intercompanyTxns.update(id, {
      status: 'eliminated',
      eliminationJournalEntryId: eliminationRef,
    } as Partial<IntercompanyTransaction>);

    this.events.emit('entity.intercompany.eliminated', { transaction: updated });
    return updated;
  }

  /**
   * Get intercompany transactions with optional filters.
   */
  async getIntercompanyTransactions(filters?: {
    fromEntityId?: string;
    toEntityId?: string;
    status?: 'pending' | 'posted' | 'eliminated';
    startDate?: string;
    endDate?: string;
  }): Promise<(IntercompanyTransaction & CollectionMeta)[]> {
    const q = this.intercompanyTxns.query();

    if (filters?.fromEntityId) {
      q.where('fromEntityId', '=', filters.fromEntityId);
    }
    if (filters?.toEntityId) {
      q.where('toEntityId', '=', filters.toEntityId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.startDate) {
      q.where('date', '>=', filters.startDate);
    }
    if (filters?.endDate) {
      q.where('date', '<=', filters.endDate);
    }

    q.orderBy('date', 'desc');
    return q.execute();
  }

  // ========================================================================
  // CONSOLIDATED REPORTING
  // ========================================================================

  /**
   * Generate a consolidated trial balance for a root entity and all its descendants.
   *
   * Gets all descendant entities of the root, aggregates their account balances
   * into ConsolidatedBalanceRow[]. The consolidated column sums all entity balances.
   * The elimination column sums intercompany elimination amounts from eliminated
   * intercompany transactions between entities in the consolidation group.
   *
   * Note: This method builds the structure using available intercompany transaction
   * data. For full GL-level balance integration, the caller should supply account
   * balances or integrate with GLService.
   */
  async getConsolidatedTrialBalance(
    rootEntityId: string,
    asOfDate?: string,
  ): Promise<ConsolidatedBalanceRow[]> {
    // Validate root entity exists
    const rootEntity = await this.entities.get(rootEntityId);
    if (!rootEntity) {
      throw new Error(`Root entity not found: ${rootEntityId}`);
    }

    // Get all entities to find descendants
    const allEntities = await this.entities.query().execute();
    const descendantIds = this.collectDescendantIds(rootEntityId, allEntities);

    // Get eliminated intercompany transactions within this consolidation group
    const icTxnQuery = this.intercompanyTxns
      .query()
      .where('status', '=', 'eliminated');

    if (asOfDate) {
      icTxnQuery.where('date', '<=', asOfDate);
    }

    const allEliminatedTxns = await icTxnQuery.execute();

    // Filter to only transactions between entities in the consolidation group
    const groupTxns = allEliminatedTxns.filter(
      (txn) =>
        descendantIds.includes(txn.fromEntityId) &&
        descendantIds.includes(txn.toEntityId),
    );

    // Sum total eliminations across intercompany transactions
    const totalEliminations = groupTxns.reduce((sum, txn) => sum + txn.amount, 0);

    // Build consolidated balance rows.
    // Since we do not have direct access to GL account balances from this service,
    // we build the structure from the entity set and intercompany data.
    // Each entity's individual account balances would need to come from the GL module.
    // Here we provide the consolidation framework with elimination data.

    // Get COA overrides for all entities in the group to determine which accounts
    // are relevant across the group
    const allOverrides = await this.coaOverrides.query().execute();
    const groupOverrides = allOverrides.filter((o) =>
      descendantIds.includes(o.entityId),
    );

    // Collect unique account IDs referenced in overrides (with default values)
    const accountBalanceMap = new Map<
      string,
      { entityBalances: Map<string, number>; accountId: string }
    >();

    for (const override of groupOverrides) {
      if (override.isExcluded) continue;
      if (override.defaultValue === undefined || override.defaultValue === null) continue;

      if (!accountBalanceMap.has(override.accountId)) {
        accountBalanceMap.set(override.accountId, {
          accountId: override.accountId,
          entityBalances: new Map<string, number>(),
        });
      }

      const entry = accountBalanceMap.get(override.accountId)!;
      const currentBalance = entry.entityBalances.get(override.entityId) ?? 0;
      entry.entityBalances.set(override.entityId, currentBalance + (override.defaultValue ?? 0));
    }

    // Build the result rows
    const rows: ConsolidatedBalanceRow[] = [];

    for (const [accountId, data] of accountBalanceMap) {
      let consolidated = 0;
      for (const balance of data.entityBalances.values()) {
        consolidated += balance;
      }

      rows.push({
        accountId,
        accountNumber: '', // Would be populated from GL account lookup
        accountName: '', // Would be populated from GL account lookup
        entityBalances: data.entityBalances,
        consolidated: Math.round(consolidated * 100) / 100,
        eliminations: 0, // Per-account eliminations require JE line-level data
      });
    }

    // If there are no account-level rows but we have elimination data,
    // provide a summary row indicating total eliminations available
    if (rows.length === 0 && groupTxns.length > 0) {
      // Create a placeholder structure showing the consolidation group
      // has intercompany elimination data
      rows.push({
        accountId: '__intercompany_eliminations__',
        accountNumber: 'IC-ELIM',
        accountName: 'Intercompany Eliminations',
        entityBalances: new Map<string, number>(),
        consolidated: 0,
        eliminations: Math.round(totalEliminations * 100) / 100,
      });
    } else if (groupTxns.length > 0) {
      // Distribute total eliminations proportionally or add as a line item
      // For now, add a separate elimination summary row
      rows.push({
        accountId: '__intercompany_eliminations__',
        accountNumber: 'IC-ELIM',
        accountName: 'Intercompany Eliminations',
        entityBalances: new Map<string, number>(),
        consolidated: 0,
        eliminations: Math.round(totalEliminations * 100) / 100,
      });
    }

    return rows;
  }

  // ========================================================================
  // HIERARCHY MANAGEMENT (EntityHierarchy CRUD)
  // ========================================================================

  /**
   * Create a named hierarchy record (legal, management, or reporting).
   */
  async createHierarchy(data: {
    name: string;
    rootEntityId: string;
    type: 'legal' | 'management' | 'reporting';
  }): Promise<EntityHierarchy & CollectionMeta> {
    // Validate root entity exists
    const rootEntity = await this.entities.get(data.rootEntityId);
    if (!rootEntity) {
      throw new Error(`Root entity not found: ${data.rootEntityId}`);
    }

    const record = await this.hierarchies.insert({
      name: data.name,
      rootEntityId: data.rootEntityId,
      type: data.type,
    } as EntityHierarchy);

    this.events.emit('entity.hierarchy.created', { hierarchy: record });
    return record;
  }

  /**
   * Get all hierarchy records, optionally filtered by type.
   */
  async getHierarchies(
    type?: 'legal' | 'management' | 'reporting',
  ): Promise<(EntityHierarchy & CollectionMeta)[]> {
    const q = this.hierarchies.query();
    if (type) {
      q.where('type', '=', type);
    }
    q.orderBy('name', 'asc');
    return q.execute();
  }

  /**
   * Delete a hierarchy record.
   */
  async deleteHierarchy(id: string): Promise<void> {
    const existing = await this.hierarchies.get(id);
    if (!existing) {
      throw new Error(`Hierarchy not found: ${id}`);
    }
    await this.hierarchies.remove(id);
    this.events.emit('entity.hierarchy.deleted', { hierarchyId: id });
  }

  // ========================================================================
  // ALIASES
  // ========================================================================

  /**
   * Add an alias for an entity.
   */
  async addAlias(
    entityId: string,
    alias: string,
    source?: string,
  ): Promise<EntityAlias & CollectionMeta> {
    // Validate entity exists
    const entity = await this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    const record = await this.aliases.insert({
      entityId,
      alias,
      source,
    } as EntityAlias);

    this.events.emit('entity.alias.added', { entityId, alias: record });
    return record;
  }

  /**
   * Remove an alias by its record ID.
   */
  async removeAlias(id: string): Promise<void> {
    const existing = await this.aliases.get(id);
    if (!existing) {
      throw new Error(`Alias not found: ${id}`);
    }

    await this.aliases.remove(id);
    this.events.emit('entity.alias.removed', { aliasId: id, entityId: existing.entityId });
  }

  /**
   * List all aliases for a specific entity.
   */
  async getAliases(entityId: string): Promise<(EntityAlias & CollectionMeta)[]> {
    return this.aliases
      .query()
      .where('entityId', '=', entityId)
      .execute();
  }

  /**
   * Find an entity by one of its aliases.
   * Returns the entity record if found via an alias match, or null.
   */
  async findEntityByAlias(
    alias: string,
  ): Promise<(Entity & CollectionMeta) | null> {
    const aliasRecord = await this.aliases
      .query()
      .where('alias', '=', alias)
      .limit(1)
      .first();

    if (!aliasRecord) {
      return null;
    }

    return this.entities.get(aliasRecord.entityId);
  }
}
