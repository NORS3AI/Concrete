/**
 * Entity Service Tests
 * Tests for the Multi-Entity & Company Structure business logic layer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EntityService } from '../../src/modules/entity/entity-service';
import type { Entity, EntityHierarchy, EntityAlias, CoaOverride, IntercompanyTransaction } from '../../src/modules/entity/entity-service';
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

  const entities = new Collection<Entity>('entity/entity', adapter, schemas, events);
  const hierarchies = new Collection<EntityHierarchy>('entity/hierarchy', adapter, schemas, events);
  const aliases = new Collection<EntityAlias>('entity/alias', adapter, schemas, events);
  const coaOverrides = new Collection<CoaOverride>('entity/coaOverride', adapter, schemas, events);
  const intercompanyTxns = new Collection<IntercompanyTransaction>('entity/intercompany', adapter, schemas, events);

  const service = new EntityService(entities, hierarchies, aliases, coaOverrides, intercompanyTxns, events);
  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EntityService', () => {
  let service: EntityService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Entity CRUD
  // ==========================================================================

  describe('Entity CRUD', () => {
    it('creates an entity with defaults', async () => {
      const entity = await service.createEntity({
        name: 'Acme Corp',
        code: 'ACME',
        type: 'holding',
      });

      expect(entity.name).toBe('Acme Corp');
      expect(entity.code).toBe('ACME');
      expect(entity.type).toBe('holding');
      expect(entity.status).toBe('active');
      expect(entity.currency).toBe('USD');
      expect(entity.fiscalYearEndMonth).toBe(12);
      expect(entity.fiscalYearEndDay).toBe(31);
      expect(entity.depth).toBe(0);
      expect(entity.path).toBe('ACME');
      expect(entity.id).toBeTruthy();
    });

    it('creates a child entity with correct depth and path', async () => {
      const parent = await service.createEntity({
        name: 'Acme Corp',
        code: 'ACME',
        type: 'holding',
      });

      const child = await service.createEntity({
        name: 'Acme Construction',
        code: 'ACME-CON',
        type: 'operating',
        parentId: parent.id,
      });

      expect(child.depth).toBe(1);
      expect(child.path).toBe('ACME.ACME-CON');
    });

    it('rejects duplicate entity codes', async () => {
      await service.createEntity({ name: 'Acme', code: 'ACME', type: 'holding' });

      await expect(
        service.createEntity({ name: 'Another Acme', code: 'ACME', type: 'operating' }),
      ).rejects.toThrow('already exists');
    });

    it('gets entity by ID', async () => {
      const created = await service.createEntity({ name: 'Acme', code: 'ACME', type: 'holding' });
      const fetched = await service.getEntity(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.code).toBe('ACME');
    });

    it('gets entity by code', async () => {
      await service.createEntity({ name: 'Acme', code: 'ACME', type: 'holding' });
      const fetched = await service.getEntityByCode('ACME');
      expect(fetched).not.toBeNull();
      expect(fetched!.name).toBe('Acme');
    });

    it('lists entities filtered by type', async () => {
      await service.createEntity({ name: 'Holding', code: 'HOLD', type: 'holding' });
      await service.createEntity({ name: 'Operating', code: 'OPS', type: 'operating' });
      await service.createEntity({ name: 'Sub', code: 'SUB', type: 'subsidiary' });

      const holdings = await service.getEntities({ type: 'holding' });
      expect(holdings).toHaveLength(1);
      expect(holdings[0].code).toBe('HOLD');
    });

    it('updates an entity', async () => {
      const entity = await service.createEntity({ name: 'Acme', code: 'ACME', type: 'holding' });
      const updated = await service.updateEntity(entity.id, { name: 'Acme International' });
      expect(updated.name).toBe('Acme International');
    });

    it('prevents deleting entity with children', async () => {
      const parent = await service.createEntity({ name: 'Parent', code: 'PAR', type: 'holding' });
      await service.createEntity({ name: 'Child', code: 'CHD', type: 'subsidiary', parentId: parent.id });

      await expect(service.deleteEntity(parent.id)).rejects.toThrow('child');
    });

    it('builds entity tree', async () => {
      const parent = await service.createEntity({ name: 'Acme', code: 'ACME', type: 'holding' });
      await service.createEntity({ name: 'Ops', code: 'OPS', type: 'operating', parentId: parent.id });
      await service.createEntity({ name: 'Sub', code: 'SUB', type: 'subsidiary', parentId: parent.id });
      await service.createEntity({ name: 'Other', code: 'OTH', type: 'branch' });

      const tree = await service.getEntityTree();
      expect(tree).toHaveLength(2); // 2 roots
      const acmeNode = tree.find((n) => n.entity.code === 'ACME');
      expect(acmeNode).toBeDefined();
      expect(acmeNode!.children).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Entity Cloning
  // ==========================================================================

  describe('Entity Cloning', () => {
    it('clones an entity with new code and name', async () => {
      const original = await service.createEntity({
        name: 'Acme Corp',
        code: 'ACME',
        type: 'holding',
        currency: 'EUR',
        fiscalYearEndMonth: 6,
        fiscalYearEndDay: 30,
        description: 'Original entity',
      });

      const clone = await service.cloneEntity(original.id, 'ACME2', 'Acme Corp Clone');

      expect(clone.code).toBe('ACME2');
      expect(clone.name).toBe('Acme Corp Clone');
      expect(clone.type).toBe('holding');
      expect(clone.currency).toBe('EUR');
      expect(clone.fiscalYearEndMonth).toBe(6);
      expect(clone.clonedFromId).toBe(original.id);
    });
  });

  // ==========================================================================
  // COA Overrides
  // ==========================================================================

  describe('COA Overrides', () => {
    it('sets and retrieves a COA override', async () => {
      const entity = await service.createEntity({ name: 'Acme', code: 'ACME', type: 'holding' });

      await service.setCoaOverride(entity.id, 'fake-account-id', {
        overrideName: 'Custom Cash',
        isExcluded: false,
      });

      const overrides = await service.getCoaOverrides(entity.id);
      expect(overrides).toHaveLength(1);
      expect(overrides[0].overrideName).toBe('Custom Cash');
    });

    it('removes a COA override', async () => {
      const entity = await service.createEntity({ name: 'Acme', code: 'ACME', type: 'holding' });

      await service.setCoaOverride(entity.id, 'fake-account-id', {
        overrideName: 'Custom Cash',
        isExcluded: false,
      });

      const overrides = await service.getCoaOverrides(entity.id);
      expect(overrides).toHaveLength(1);

      await service.removeCoaOverride(entity.id, 'fake-account-id');
      const after = await service.getCoaOverrides(entity.id);
      expect(after).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Intercompany Transactions
  // ==========================================================================

  describe('Intercompany Transactions', () => {
    let entityA: Entity & { id: string };
    let entityB: Entity & { id: string };

    beforeEach(async () => {
      entityA = await service.createEntity({ name: 'Entity A', code: 'ENT-A', type: 'operating' }) as Entity & { id: string };
      entityB = await service.createEntity({ name: 'Entity B', code: 'ENT-B', type: 'subsidiary' }) as Entity & { id: string };
    });

    it('creates an intercompany transaction', async () => {
      const txn = await service.createIntercompanyTransaction({
        fromEntityId: entityA.id,
        toEntityId: entityB.id,
        date: '2026-02-01',
        amount: 5000,
        description: 'Management fee',
      });

      expect(txn.status).toBe('pending');
      expect(txn.amount).toBe(5000);
      expect(txn.fromEntityId).toBe(entityA.id);
      expect(txn.toEntityId).toBe(entityB.id);
    });

    it('rejects IC transaction to same entity', async () => {
      await expect(
        service.createIntercompanyTransaction({
          fromEntityId: entityA.id,
          toEntityId: entityA.id,
          date: '2026-02-01',
          amount: 1000,
        }),
      ).rejects.toThrow('two different entities');
    });

    it('posts an IC transaction', async () => {
      const txn = await service.createIntercompanyTransaction({
        fromEntityId: entityA.id,
        toEntityId: entityB.id,
        date: '2026-02-01',
        amount: 3000,
      });

      const posted = await service.postIntercompanyTransaction(txn.id);
      expect(posted.status).toBe('posted');
    });

    it('filters IC transactions by entity', async () => {
      await service.createIntercompanyTransaction({
        fromEntityId: entityA.id,
        toEntityId: entityB.id,
        date: '2026-02-01',
        amount: 1000,
      });

      await service.createIntercompanyTransaction({
        fromEntityId: entityB.id,
        toEntityId: entityA.id,
        date: '2026-02-05',
        amount: 2000,
      });

      const fromA = await service.getIntercompanyTransactions({ fromEntityId: entityA.id });
      expect(fromA).toHaveLength(1);
      expect(fromA[0].amount).toBe(1000);
    });
  });

  // ==========================================================================
  // Aliases
  // ==========================================================================

  describe('Aliases', () => {
    it('adds and retrieves aliases', async () => {
      const entity = await service.createEntity({ name: 'Acme', code: 'ACME', type: 'holding' });

      await service.addAlias(entity.id, 'Acme Corporation', 'Legacy ERP');
      await service.addAlias(entity.id, 'ACME LLC', 'Legal');

      const aliases = await service.getAliases(entity.id);
      expect(aliases).toHaveLength(2);
    });

    it('finds entity by alias', async () => {
      const entity = await service.createEntity({ name: 'Acme', code: 'ACME', type: 'holding' });
      await service.addAlias(entity.id, 'Acme Corporation');

      const found = await service.findEntityByAlias('Acme Corporation');
      expect(found).not.toBeNull();
      expect(found!.id).toBe(entity.id);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits entity.created on entity creation', async () => {
      let emitted = false;
      events.on('entity.created', () => { emitted = true; });

      await service.createEntity({ name: 'Acme', code: 'ACME', type: 'holding' });
      expect(emitted).toBe(true);
    });

    it('emits entity.cloned on clone', async () => {
      const orig = await service.createEntity({ name: 'Acme', code: 'ACME', type: 'holding' });

      let emitted = false;
      events.on('entity.cloned', () => { emitted = true; });

      await service.cloneEntity(orig.id, 'ACME2', 'Clone');
      expect(emitted).toBe(true);
    });

    it('emits intercompany.created on IC transaction', async () => {
      const a = await service.createEntity({ name: 'A', code: 'A', type: 'operating' });
      const b = await service.createEntity({ name: 'B', code: 'B', type: 'subsidiary' });

      let emitted = false;
      events.on('entity.intercompany.created', () => { emitted = true; });

      await service.createIntercompanyTransaction({
        fromEntityId: a.id,
        toEntityId: b.id,
        date: '2026-02-01',
        amount: 1000,
      });
      expect(emitted).toBe(true);
    });
  });
});
