/**
 * Import/Export Service Tests
 * Tests for the Import/Export Engine V2 business logic layer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ImportExportService } from '../../src/modules/import-export/import-export-service';
import type {
  ImportBatch,
  ImportError,
  ExportJob,
  FieldMapping,
} from '../../src/modules/import-export/import-export-service';
import { Collection } from '../../src/core/store/collection';
import { EventBus } from '../../src/core/events/bus';
import { SchemaRegistry } from '../../src/core/schema/registry';
import { LocalStorageAdapter } from '../../src/core/store/local-storage';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

interface TestRecord {
  [key: string]: unknown;
  name: string;
  code?: string;
  amount?: number;
  date?: string;
  status?: string;
  vendorId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
}

function createTestService() {
  const adapter = new LocalStorageAdapter();
  const events = new EventBus();
  const schemas = new SchemaRegistry();

  const importBatches = new Collection<ImportBatch>('integration/importBatch', adapter, schemas, events);
  const importErrors = new Collection<ImportError>('integration/importError', adapter, schemas, events);
  const exportJobs = new Collection<ExportJob>('integration/exportJob', adapter, schemas, events);
  const fieldMappings = new Collection<FieldMapping>('integration/fieldMapping', adapter, schemas, events);

  const testCollection = new Collection<TestRecord>('test/records', adapter, schemas, events);

  const collectionRegistry = new Map<string, Collection<Record<string, unknown>>>();
  collectionRegistry.set('test/records', testCollection as unknown as Collection<Record<string, unknown>>);

  const collectionResolver = (name: string): Collection<Record<string, unknown>> | null => {
    return collectionRegistry.get(name) ?? null;
  };

  const service = new ImportExportService(
    importBatches,
    importErrors,
    exportJobs,
    fieldMappings,
    events,
    collectionResolver,
  );

  return { service, events, testCollection, collectionResolver };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ImportExportService', () => {
  let service: ImportExportService;
  let events: EventBus;
  let testCollection: Collection<TestRecord>;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
    testCollection = ctx.testCollection;
  });

  // ==========================================================================
  // Format Detection
  // ==========================================================================

  describe('Format Detection', () => {
    it('detects CSV format from content', () => {
      const csvContent = 'FirstName,LastName,Age\nJohn,Smith,42\nJane,Doe,38';
      const result = service.detectFormat(csvContent);
      expect(result.format).toBe('csv');
      expect(result.delimiter).toBe(',');
      expect(result.headers).toContain('FirstName');
      expect(result.headers).toContain('LastName');
      expect(result.headers).toContain('Age');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('detects JSON format from content', () => {
      const jsonContent = JSON.stringify([
        { name: 'ABC Concrete', code: 'V-001', amount: 50000 },
        { name: 'XYZ Steel', code: 'V-002', amount: 25000 },
      ]);
      const result = service.detectFormat(jsonContent);
      expect(result.format).toBe('json');
      expect(result.confidence).toBeGreaterThanOrEqual(0.98);
      expect(result.headers).toContain('name');
      expect(result.headers).toContain('code');
      expect(result.headers).toContain('amount');
    });

    it('detects IIF format from file extension', () => {
      const iifContent = '!TRNS\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\nTRNS\tCHECK\t01/15/2026\tChecking\t-5000';
      const result = service.detectFormat(iifContent, 'export.iif');
      expect(result.format).toBe('iif');
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it('detects TSV format from tab-delimited content', () => {
      const tsvContent = 'FirstName\tLastName\tAge\nJohn\tSmith\t42';
      const result = service.detectFormat(tsvContent);
      expect(result.format).toBe('tsv');
      expect(result.delimiter).toBe('\t');
    });

    it('detects Foundation Software format from headers', () => {
      const content = 'Vendor Number,Vendor Name,Invoice Number,Invoice Date,Invoice Amount,Due Date\nV-001,ABC Concrete,INV-001,02/01/2026,50000,03/01/2026';
      const result = service.detectFormat(content);
      expect(result.format).toBe('foundation');
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  // ==========================================================================
  // Field Auto-Matching
  // ==========================================================================

  describe('Field Auto-Matching', () => {
    it('auto-matches headers by name similarity', () => {
      const sourceHeaders = ['Name', 'Invoice Number', 'Amount', 'Date'];
      const targetFields = ['name', 'invoiceNumber', 'amount', 'date', 'status'];
      const results = service.autoMatchFields(sourceHeaders, targetFields);

      expect(results).toHaveLength(4);
      const nameMatch = results.find((r) => r.sourceField === 'Name');
      expect(nameMatch?.targetField).toBe('name');
      expect(nameMatch?.confidence).toBeGreaterThan(0);
    });

    it('uses Foundation header map for known format', () => {
      const sourceHeaders = ['Vendor Name', 'Invoice Number', 'Invoice Amount'];
      const targetFields = ['name', 'invoiceNumber', 'amount', 'vendorCode'];
      const results = service.autoMatchFields(sourceHeaders, targetFields, 'foundation');

      const vendorMatch = results.find((r) => r.sourceField === 'Vendor Name');
      expect(vendorMatch?.confidence).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Import Batch CRUD
  // ==========================================================================

  describe('Import Batch CRUD', () => {
    it('creates an import batch with defaults', async () => {
      const batch = await service.createBatch({
        name: 'Test Import',
        sourceFormat: 'csv',
        collection: 'test/records',
      });

      expect(batch.name).toBe('Test Import');
      expect(batch.sourceFormat).toBe('csv');
      expect(batch.collection).toBe('test/records');
      expect(batch.status).toBe('pending');
      expect(batch.totalRows).toBe(0);
      expect(batch.importedRows).toBe(0);
      expect(batch.skippedRows).toBe(0);
      expect(batch.errorRows).toBe(0);
      expect(batch.mergeStrategy).toBe('append');
      expect(batch.compositeKeys).toEqual([]);
    });

    it('lists batches ordered by startedAt', async () => {
      await service.createBatch({ name: 'First', sourceFormat: 'csv', collection: 'test/records' });
      await service.createBatch({ name: 'Second', sourceFormat: 'json', collection: 'test/records' });

      const batches = await service.getBatches();
      expect(batches.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // Upload and Parse
  // ==========================================================================

  describe('Upload and Parse', () => {
    it('parses CSV content into rows', async () => {
      const batch = await service.createBatch({
        name: 'CSV Import',
        sourceFormat: 'csv',
        collection: 'test/records',
      });

      const csvContent = 'name,code,amount\nABC Concrete,V-001,50000\nXYZ Steel,V-002,25000\nDemo Lumber,V-003,15000';
      const updated = await service.uploadData(batch.id, csvContent);

      expect(updated.status).toBe('validating');
      expect(updated.totalRows).toBe(3);
      expect(updated.rawData).toHaveLength(3);
      expect(updated.rawData![0]['name']).toBe('ABC Concrete');
      expect(updated.rawData![1]['code']).toBe('V-002');
    });

    it('parses JSON content into rows', async () => {
      const batch = await service.createBatch({
        name: 'JSON Import',
        sourceFormat: 'json',
        collection: 'test/records',
      });

      const jsonContent = JSON.stringify([
        { name: 'ABC Concrete', code: 'V-001', amount: 50000 },
        { name: 'XYZ Steel', code: 'V-002', amount: 25000 },
      ]);
      const updated = await service.uploadData(batch.id, jsonContent);

      expect(updated.status).toBe('validating');
      expect(updated.totalRows).toBe(2);
      expect(updated.rawData![0]['name']).toBe('ABC Concrete');
    });

    it('rejects upload for non-pending batch', async () => {
      const batch = await service.createBatch({
        name: 'Test',
        sourceFormat: 'csv',
        collection: 'test/records',
      });
      await service.uploadData(batch.id, 'name\nABC');

      await expect(
        service.uploadData(batch.id, 'name\nXYZ'),
      ).rejects.toThrow('Cannot upload data');
    });
  });

  // ==========================================================================
  // Validation
  // ==========================================================================

  describe('Validation', () => {
    it('validates required fields', async () => {
      const batch = await service.createBatch({
        name: 'Validation Test',
        sourceFormat: 'csv',
        collection: 'test/records',
      });

      const csvContent = 'name,code,amount\nABC Concrete,V-001,50000\n,V-002,25000';
      await service.uploadData(batch.id, csvContent);

      const result = await service.validateRows(batch.id, [
        { field: 'name', type: 'required' },
      ]);

      expect(result.valid).toBe(false);
      expect(result.errorCount).toBe(1);

      const errors = await service.getImportErrors(batch.id);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('name');
      expect(errors[0].rowNumber).toBe(2);
    });

    it('validates data types', async () => {
      const batch = await service.createBatch({
        name: 'Type Validation',
        sourceFormat: 'csv',
        collection: 'test/records',
      });

      const csvContent = 'name,amount\nABC,50000\nXYZ,not-a-number';
      await service.uploadData(batch.id, csvContent);

      const result = await service.validateRows(batch.id, [
        { field: 'amount', type: 'dataType', dataType: 'number' },
      ]);

      expect(result.warningCount).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Field Mapping
  // ==========================================================================

  describe('Field Mapping', () => {
    it('saves and retrieves field mappings', async () => {
      const batch = await service.createBatch({
        name: 'Mapping Test',
        sourceFormat: 'csv',
        collection: 'test/records',
      });

      const mappings = await service.saveFieldMappings(batch.id, [
        { sourceField: 'Vendor Name', targetField: 'name', transform: 'trim' },
        { sourceField: 'Invoice Amount', targetField: 'amount', transform: 'number' },
      ]);

      expect(mappings).toHaveLength(2);
      expect(mappings[0].sourceField).toBe('Vendor Name');
      expect(mappings[0].targetField).toBe('name');
      expect(mappings[0].transform).toBe('trim');

      const retrieved = await service.getFieldMappings(batch.id);
      expect(retrieved).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Preview (Dry Run)
  // ==========================================================================

  describe('Preview (Dry Run)', () => {
    it('generates preview with all additions for append strategy', async () => {
      const batch = await service.createBatch({
        name: 'Preview Test',
        sourceFormat: 'csv',
        collection: 'test/records',
        mergeStrategy: 'append',
      });

      const csvContent = 'name,code,amount\nABC Concrete,V-001,50000\nXYZ Steel,V-002,25000';
      await service.uploadData(batch.id, csvContent);

      await service.validateRows(batch.id, []);

      const preview = await service.preview(batch.id);

      expect(preview.totalRows).toBe(2);
      expect(preview.toAdd).toBe(2);
      expect(preview.toUpdate).toBe(0);
      expect(preview.toSkip).toBe(0);
      expect(preview.rows).toHaveLength(2);
      expect(preview.rows[0].action).toBe('add');
      expect(preview.rows[1].action).toBe('add');
    });
  });

  // ==========================================================================
  // Commit
  // ==========================================================================

  describe('Commit', () => {
    it('commits import and inserts records', async () => {
      const batch = await service.createBatch({
        name: 'Commit Test',
        sourceFormat: 'csv',
        collection: 'test/records',
        mergeStrategy: 'append',
      });

      const csvContent = 'name,code,amount\nABC Concrete,V-001,50000\nXYZ Steel,V-002,25000';
      await service.uploadData(batch.id, csvContent);
      await service.validateRows(batch.id, []);
      await service.preview(batch.id);

      const committed = await service.commit(batch.id);

      expect(committed.status).toBe('completed');
      expect(committed.importedRows).toBe(2);
      expect(committed.importedIds).toHaveLength(2);

      const records = await testCollection.getAll();
      expect(records).toHaveLength(2);
      expect(records.some((r) => r.name === 'ABC Concrete')).toBe(true);
      expect(records.some((r) => r.name === 'XYZ Steel')).toBe(true);
    });

    it('commits with field mappings and transforms', async () => {
      const batch = await service.createBatch({
        name: 'Mapped Commit',
        sourceFormat: 'csv',
        collection: 'test/records',
      });

      const csvContent = 'Vendor Name,Invoice Amount\n  ABC Concrete  ,50000';
      await service.uploadData(batch.id, csvContent);

      await service.saveFieldMappings(batch.id, [
        { sourceField: 'Vendor Name', targetField: 'name', transform: 'trim' },
        { sourceField: 'Invoice Amount', targetField: 'amount', transform: 'number' },
      ]);

      await service.validateRows(batch.id, []);
      await service.preview(batch.id);
      const committed = await service.commit(batch.id);

      expect(committed.status).toBe('completed');
      expect(committed.importedRows).toBe(1);

      const records = await testCollection.getAll();
      expect(records).toHaveLength(1);
      expect(records[0].name).toBe('ABC Concrete');
      expect(records[0].amount).toBe(50000);
    });

    it('rejects commit of non-preview batch', async () => {
      const batch = await service.createBatch({
        name: 'Bad Commit',
        sourceFormat: 'csv',
        collection: 'test/records',
      });

      await expect(service.commit(batch.id)).rejects.toThrow('Cannot commit');
    });
  });

  // ==========================================================================
  // Revert
  // ==========================================================================

  describe('Revert', () => {
    it('reverts a completed import', async () => {
      const batch = await service.createBatch({
        name: 'Revert Test',
        sourceFormat: 'csv',
        collection: 'test/records',
      });

      const csvContent = 'name,code\nABC Concrete,V-001\nXYZ Steel,V-002';
      await service.uploadData(batch.id, csvContent);
      await service.validateRows(batch.id, []);
      await service.preview(batch.id);
      await service.commit(batch.id);

      let records = await testCollection.getAll();
      expect(records).toHaveLength(2);

      const reverted = await service.revert(batch.id);

      expect(reverted.status).toBe('reverted');
      expect(reverted.revertedAt).toBeDefined();

      records = await testCollection.getAll();
      expect(records).toHaveLength(0);
    });

    it('rejects revert of non-completed batch', async () => {
      const batch = await service.createBatch({
        name: 'Bad Revert',
        sourceFormat: 'csv',
        collection: 'test/records',
      });

      await expect(service.revert(batch.id)).rejects.toThrow('Cannot revert');
    });
  });

  // ==========================================================================
  // Export
  // ==========================================================================

  describe('Export', () => {
    beforeEach(async () => {
      await testCollection.insert({ name: 'ABC Concrete', code: 'V-001', amount: 50000 } as TestRecord);
      await testCollection.insert({ name: 'XYZ Steel', code: 'V-002', amount: 25000 } as TestRecord);
      await testCollection.insert({ name: 'Demo Lumber', code: 'V-003', amount: 15000 } as TestRecord);
    });

    it('exports to JSON format', async () => {
      const result = await service.exportCollection('test/records', {
        format: 'json',
        name: 'JSON Export',
      });

      expect(result.format).toBe('json');
      expect(result.recordCount).toBe(3);
      expect(result.fileSize).toBeGreaterThan(0);

      const parsed = JSON.parse(result.data);
      expect(parsed).toHaveLength(3);
    });

    it('exports to CSV format', async () => {
      const result = await service.exportCollection('test/records', {
        format: 'csv',
        name: 'CSV Export',
      });

      expect(result.format).toBe('csv');
      expect(result.recordCount).toBe(3);
      expect(result.data).toContain('name');
      expect(result.data).toContain('ABC Concrete');
    });

    it('exports with column selection', async () => {
      const result = await service.exportCollection('test/records', {
        format: 'json',
        columns: ['name', 'amount'],
      });

      const parsed = JSON.parse(result.data);
      expect(parsed[0]).toHaveProperty('name');
      expect(parsed[0]).toHaveProperty('amount');
      expect(parsed[0]).not.toHaveProperty('code');
    });

    it('exports with filters', async () => {
      const result = await service.exportCollection('test/records', {
        format: 'json',
        columns: ['name', 'code', 'amount'],
        filters: { code: 'V-001' },
      });

      const parsed = JSON.parse(result.data);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('ABC Concrete');
    });

    it('exports to API format with pagination', async () => {
      const result = await service.exportCollection('test/records', {
        format: 'api',
        page: 1,
        pageSize: 2,
      });

      const parsed = JSON.parse(result.data);
      expect(parsed.data).toHaveLength(2);
      expect(parsed.pagination.page).toBe(1);
      expect(parsed.pagination.pageSize).toBe(2);
      expect(parsed.pagination.totalRecords).toBe(3);
      expect(parsed.pagination.totalPages).toBe(2);
      expect(parsed.meta.collection).toBe('test/records');
    });

    it('exports to PDF format with letterhead', async () => {
      const result = await service.exportCollection('test/records', {
        format: 'pdf',
        letterhead: {
          companyName: 'Acme Construction Inc.',
          address: '123 Main St',
          phone: '555-0100',
          email: 'info@acme.com',
        },
      });

      expect(result.format).toBe('pdf');
      expect(result.data).toContain('Acme Construction Inc.');
      expect(result.data).toContain('123 Main St');
      expect(result.data).toContain('PDF REPORT');
    });
  });

  // ==========================================================================
  // Full Backup & Restore
  // ==========================================================================

  describe('Full Backup & Restore', () => {
    it('creates a full backup and restores it', async () => {
      await testCollection.insert({ name: 'ABC Concrete', code: 'V-001', amount: 50000 } as TestRecord);
      await testCollection.insert({ name: 'XYZ Steel', code: 'V-002', amount: 25000 } as TestRecord);

      const backup = await service.exportAll(['test/records']);

      expect(backup.version).toBe('2.0.0');
      expect(backup.collections['test/records']).toHaveLength(2);

      localStorage.clear();

      const ctx = createTestService();
      const newService = ctx.service;
      const result = await newService.importAll(backup);

      expect(result.collectionsRestored).toBe(1);
      expect(result.totalRecords).toBe(2);
    });

    it('rejects invalid backup format', async () => {
      const invalidBackup = { invalid: true } as unknown as { version: string; exportedAt: string; collections: Record<string, Record<string, unknown>[]> };

      await expect(service.importAll(invalidBackup)).rejects.toThrow('Invalid backup format');
    });
  });

  // ==========================================================================
  // Import History
  // ==========================================================================

  describe('Import History', () => {
    it('returns import history with statistics', async () => {
      const batch = await service.createBatch({
        name: 'History Test',
        sourceFormat: 'csv',
        collection: 'test/records',
      });
      await service.uploadData(batch.id, 'name\nABC\nXYZ');
      await service.validateRows(batch.id, []);
      await service.preview(batch.id);
      await service.commit(batch.id);

      const history = await service.getImportHistory();
      expect(history.totalBatches).toBeGreaterThan(0);
      expect(history.batches.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits import.batch.created', async () => {
      let emitted = false;
      events.on('import.batch.created', () => { emitted = true; });
      await service.createBatch({ name: 'Event Test', sourceFormat: 'csv', collection: 'test/records' });
      expect(emitted).toBe(true);
    });

    it('emits import.batch.committed', async () => {
      let emitted = false;
      events.on('import.batch.committed', () => { emitted = true; });

      const batch = await service.createBatch({
        name: 'Commit Event Test',
        sourceFormat: 'csv',
        collection: 'test/records',
      });
      await service.uploadData(batch.id, 'name\nABC');
      await service.validateRows(batch.id, []);
      await service.preview(batch.id);
      await service.commit(batch.id);

      expect(emitted).toBe(true);
    });

    it('emits import.batch.reverted', async () => {
      let emitted = false;
      events.on('import.batch.reverted', () => { emitted = true; });

      const batch = await service.createBatch({
        name: 'Revert Event Test',
        sourceFormat: 'csv',
        collection: 'test/records',
      });
      await service.uploadData(batch.id, 'name\nABC');
      await service.validateRows(batch.id, []);
      await service.preview(batch.id);
      await service.commit(batch.id);
      await service.revert(batch.id);

      expect(emitted).toBe(true);
    });

    it('emits export.completed', async () => {
      await testCollection.insert({ name: 'ABC Concrete' } as TestRecord);

      let emitted = false;
      events.on('export.completed', () => { emitted = true; });

      await service.exportCollection('test/records', { format: 'json' });
      expect(emitted).toBe(true);
    });

    it('emits import.batch.validated', async () => {
      let emitted = false;
      events.on('import.batch.validated', () => { emitted = true; });

      const batch = await service.createBatch({
        name: 'Validate Event Test',
        sourceFormat: 'csv',
        collection: 'test/records',
      });
      await service.uploadData(batch.id, 'name\nABC');
      await service.validateRows(batch.id, []);

      expect(emitted).toBe(true);
    });
  });

  // ==========================================================================
  // Merge Strategies with Composite Keys
  // ==========================================================================

  describe('Merge Strategies', () => {
    it('skips existing records with skip strategy', async () => {
      await testCollection.insert({ name: 'ABC Concrete', code: 'V-001', amount: 50000 } as TestRecord);

      const batch = await service.createBatch({
        name: 'Skip Merge Test',
        sourceFormat: 'csv',
        collection: 'test/records',
        mergeStrategy: 'skip',
        compositeKeys: ['name'],
      });

      const csvContent = 'name,code,amount\nABC Concrete,V-001-NEW,99999\nNew Vendor,V-010,10000';
      await service.uploadData(batch.id, csvContent);
      await service.validateRows(batch.id, []);
      await service.preview(batch.id);

      const committed = await service.commit(batch.id);
      expect(committed.importedRows).toBe(1);
      expect(committed.skippedRows).toBe(1);

      const records = await testCollection.getAll();
      expect(records).toHaveLength(2);
      const abc = records.find((r) => r.name === 'ABC Concrete');
      expect(abc!.amount).toBe(50000);
    });

    it('overwrites existing records with overwrite strategy', async () => {
      await testCollection.insert({ name: 'ABC Concrete', code: 'V-001', amount: 50000 } as TestRecord);

      const batch = await service.createBatch({
        name: 'Overwrite Merge Test',
        sourceFormat: 'csv',
        collection: 'test/records',
        mergeStrategy: 'overwrite',
        compositeKeys: ['name'],
      });

      const csvContent = 'name,code,amount\nABC Concrete,V-001-NEW,99999';
      await service.uploadData(batch.id, csvContent);
      await service.validateRows(batch.id, []);
      await service.preview(batch.id);

      const committed = await service.commit(batch.id);
      expect(committed.importedRows).toBe(1);

      const records = await testCollection.getAll();
      const abc = records.find((r) => r.name === 'ABC Concrete');
      expect(abc!.code).toBe('V-001-NEW');
      expect(abc!.amount).toBe('99999');
    });
  });

  // ==========================================================================
  // Batch Deletion
  // ==========================================================================

  describe('Batch Deletion', () => {
    it('deletes a completed batch and its associated records', async () => {
      const batch = await service.createBatch({
        name: 'Delete Test',
        sourceFormat: 'csv',
        collection: 'test/records',
      });
      await service.uploadData(batch.id, 'name\nABC');
      await service.validateRows(batch.id, []);
      await service.preview(batch.id);
      await service.commit(batch.id);

      await service.deleteBatch(batch.id);

      const found = await service.getBatch(batch.id);
      expect(found).toBeNull();
    });

    it('rejects deletion of pending batch', async () => {
      const batch = await service.createBatch({
        name: 'Bad Delete',
        sourceFormat: 'csv',
        collection: 'test/records',
      });

      await expect(service.deleteBatch(batch.id)).rejects.toThrow('Cannot delete batch');
    });
  });
});
