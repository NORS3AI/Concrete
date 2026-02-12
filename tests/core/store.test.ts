/**
 * Phase Zed.17 - LocalStorageAdapter Tests
 * Verifies CRUD, query, bulk, and aggregation operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '../../src/core/store/local-storage';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  describe('CRUD', () => {
    it('should insert and retrieve a record', async () => {
      const record = {
        id: 'test-1',
        name: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };
      await adapter.insert('test/collection', record);
      const result = await adapter.get('test/collection', 'test-1');
      expect(result).toEqual(record);
    });

    it('should return null for non-existent record', async () => {
      const result = await adapter.get('test/collection', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should update a record', async () => {
      const record = {
        id: 'test-1',
        name: 'Original',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };
      await adapter.insert('test/collection', record);
      const updated = await adapter.update('test/collection', 'test-1', {
        name: 'Updated',
      });
      expect(updated.name).toBe('Updated');
    });

    it('should remove a record', async () => {
      const record = {
        id: 'test-1',
        name: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };
      await adapter.insert('test/collection', record);
      await adapter.remove('test/collection', 'test-1');
      const result = await adapter.get('test/collection', 'test-1');
      expect(result).toBeNull();
    });

    it('should getAll records', async () => {
      await adapter.insert('test/collection', {
        id: '1',
        name: 'A',
        createdAt: '',
        updatedAt: '',
        version: 1,
      });
      await adapter.insert('test/collection', {
        id: '2',
        name: 'B',
        createdAt: '',
        updatedAt: '',
        version: 1,
      });
      const all = await adapter.getAll('test/collection');
      expect(all.length).toBe(2);
    });
  });

  describe('Query', () => {
    it('should filter with equals operator', async () => {
      await adapter.insert('test/items', {
        id: '1',
        type: 'a',
        createdAt: '',
        updatedAt: '',
        version: 1,
      });
      await adapter.insert('test/items', {
        id: '2',
        type: 'b',
        createdAt: '',
        updatedAt: '',
        version: 1,
      });
      await adapter.insert('test/items', {
        id: '3',
        type: 'a',
        createdAt: '',
        updatedAt: '',
        version: 1,
      });
      const results = await adapter.query('test/items', {
        filters: [{ field: 'type', operator: '=', value: 'a' }],
      });
      expect(results.length).toBe(2);
    });

    it('should sort results', async () => {
      await adapter.insert('test/items', {
        id: '1',
        name: 'B',
        createdAt: '',
        updatedAt: '',
        version: 1,
      });
      await adapter.insert('test/items', {
        id: '2',
        name: 'A',
        createdAt: '',
        updatedAt: '',
        version: 1,
      });
      const results = await adapter.query('test/items', {
        orderBy: [{ field: 'name', direction: 'asc' }],
      });
      expect(results[0].name).toBe('A');
    });

    it('should limit and offset results', async () => {
      for (let i = 0; i < 10; i++) {
        await adapter.insert('test/items', {
          id: `${i}`,
          num: i,
          createdAt: '',
          updatedAt: '',
          version: 1,
        });
      }
      const results = await adapter.query('test/items', {
        limit: 3,
        offset: 2,
      });
      expect(results.length).toBe(3);
    });
  });

  describe('Bulk operations', () => {
    it('should bulk insert', async () => {
      const records = Array.from({ length: 5 }, (_, i) => ({
        id: `bulk-${i}`,
        name: `Item ${i}`,
        createdAt: '',
        updatedAt: '',
        version: 1,
      }));
      await adapter.bulkInsert('test/collection', records);
      const all = await adapter.getAll('test/collection');
      expect(all.length).toBe(5);
    });

    it('should bulk remove', async () => {
      const records = Array.from({ length: 5 }, (_, i) => ({
        id: `bulk-${i}`,
        name: `Item ${i}`,
        createdAt: '',
        updatedAt: '',
        version: 1,
      }));
      await adapter.bulkInsert('test/collection', records);
      await adapter.bulkRemove('test/collection', [
        'bulk-0',
        'bulk-1',
        'bulk-2',
      ]);
      const all = await adapter.getAll('test/collection');
      expect(all.length).toBe(2);
    });
  });

  describe('Aggregate', () => {
    it('should sum values', async () => {
      await adapter.insert('test/items', {
        id: '1',
        amount: 100,
        category: 'a',
        createdAt: '',
        updatedAt: '',
        version: 1,
      });
      await adapter.insert('test/items', {
        id: '2',
        amount: 200,
        category: 'a',
        createdAt: '',
        updatedAt: '',
        version: 1,
      });
      await adapter.insert('test/items', {
        id: '3',
        amount: 300,
        category: 'b',
        createdAt: '',
        updatedAt: '',
        version: 1,
      });
      const results = await adapter.aggregate('test/items', {
        aggregates: [{ field: 'amount', fn: 'sum' }],
      });
      expect(results[0].values['sum_amount']).toBe(600);
    });
  });
});
