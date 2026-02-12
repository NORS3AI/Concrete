/**
 * Doc Service Tests
 * Tests for the Document Management business logic layer (Phase 14).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DocService } from '../../src/modules/doc/doc-service';
import type {
  Document, Revision, Template, Transmittal, Photo,
} from '../../src/modules/doc/doc-service';
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

  const documents = new Collection<Document>('doc/document', adapter, schemas, events);
  const revisions = new Collection<Revision>('doc/revision', adapter, schemas, events);
  const templates = new Collection<Template>('doc/template', adapter, schemas, events);
  const transmittals = new Collection<Transmittal>('doc/transmittal', adapter, schemas, events);
  const photos = new Collection<Photo>('doc/photo', adapter, schemas, events);

  const service = new DocService(
    documents, revisions, templates, transmittals, photos, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DocService', () => {
  let service: DocService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Document CRUD
  // ==========================================================================

  describe('Document CRUD', () => {
    it('creates a document with defaults', async () => {
      const doc = await service.createDocument({
        title: 'Site Plan',
        category: 'drawing',
        fileName: 'site-plan-v1.pdf',
        fileSize: 2048000,
        mimeType: 'application/pdf',
      });

      expect(doc.title).toBe('Site Plan');
      expect(doc.category).toBe('drawing');
      expect(doc.status).toBe('active');
      expect(doc.fileName).toBe('site-plan-v1.pdf');
      expect(doc.fileSize).toBe(2048000);
      expect(doc.tags).toEqual([]);
      expect(doc.uploadedAt).toBeDefined();
    });

    it('updates a document', async () => {
      const doc = await service.createDocument({
        title: 'Contract Draft',
        category: 'contract',
      });

      const updated = await service.updateDocument(doc.id, {
        title: 'Contract Final',
        description: 'Finalized contract document',
        tags: ['contract', 'final'],
      });

      expect(updated.title).toBe('Contract Final');
      expect(updated.description).toBe('Finalized contract document');
      expect(updated.tags).toEqual(['contract', 'final']);
    });

    it('deletes a document and its revisions', async () => {
      const doc = await service.createDocument({
        title: 'Test Doc',
        category: 'report',
      });

      await service.addRevision({
        documentId: doc.id,
        description: 'Initial revision',
      });

      await service.deleteDocument(doc.id);

      const fetched = await service.getDocument(doc.id);
      expect(fetched).toBeNull();

      const revisions = await service.getRevisions(doc.id);
      expect(revisions).toHaveLength(0);
    });

    it('filters documents by category', async () => {
      await service.createDocument({ title: 'Drawing A', category: 'drawing' });
      await service.createDocument({ title: 'Contract B', category: 'contract' });
      await service.createDocument({ title: 'Drawing C', category: 'drawing' });

      const drawings = await service.getDocuments({ category: 'drawing' });
      expect(drawings).toHaveLength(2);
      expect(drawings.every((d) => d.category === 'drawing')).toBe(true);
    });

    it('filters documents by tag', async () => {
      await service.createDocument({
        title: 'Doc A',
        category: 'report',
        tags: ['electrical', 'phase1'],
      });
      await service.createDocument({
        title: 'Doc B',
        category: 'report',
        tags: ['plumbing', 'phase2'],
      });
      await service.createDocument({
        title: 'Doc C',
        category: 'contract',
        tags: ['electrical', 'phase2'],
      });

      const electrical = await service.getDocumentsByTag('electrical');
      expect(electrical).toHaveLength(2);
    });

    it('archives a document', async () => {
      const doc = await service.createDocument({
        title: 'Old Report',
        category: 'report',
      });

      const archived = await service.archiveDocument(doc.id);
      expect(archived.status).toBe('archived');
    });
  });

  // ==========================================================================
  // Revision Management
  // ==========================================================================

  describe('Revision Management', () => {
    let docId: string;

    beforeEach(async () => {
      const doc = await service.createDocument({
        title: 'Test Drawing',
        category: 'drawing',
        fileName: 'drawing-v0.dwg',
      });
      docId = doc.id;
    });

    it('adds revisions with auto-incrementing numbers', async () => {
      const rev1 = await service.addRevision({
        documentId: docId,
        description: 'First revision',
        fileName: 'drawing-v1.dwg',
        fileSize: 1024000,
      });
      expect(rev1.revisionNumber).toBe(1);

      const rev2 = await service.addRevision({
        documentId: docId,
        description: 'Second revision',
        fileName: 'drawing-v2.dwg',
        fileSize: 1100000,
      });
      expect(rev2.revisionNumber).toBe(2);
    });

    it('gets revision history in descending order', async () => {
      await service.addRevision({ documentId: docId, description: 'Rev 1' });
      await service.addRevision({ documentId: docId, description: 'Rev 2' });
      await service.addRevision({ documentId: docId, description: 'Rev 3' });

      const revisions = await service.getRevisions(docId);
      expect(revisions).toHaveLength(3);
      expect(revisions[0].revisionNumber).toBe(3);
      expect(revisions[1].revisionNumber).toBe(2);
      expect(revisions[2].revisionNumber).toBe(1);
    });

    it('updates parent document fileName on revision', async () => {
      await service.addRevision({
        documentId: docId,
        description: 'Updated file',
        fileName: 'drawing-rev1.dwg',
        fileSize: 2048000,
      });

      const doc = await service.getDocument(docId);
      expect(doc!.fileName).toBe('drawing-rev1.dwg');
      expect(doc!.fileSize).toBe(2048000);
    });

    it('gets latest revision number', async () => {
      await service.addRevision({ documentId: docId, description: 'A' });
      await service.addRevision({ documentId: docId, description: 'B' });

      const latest = await service.getLatestRevisionNumber(docId);
      expect(latest).toBe(2);
    });

    it('returns 0 for document with no revisions', async () => {
      const latest = await service.getLatestRevisionNumber(docId);
      expect(latest).toBe(0);
    });

    it('rejects revision for non-existent document', async () => {
      await expect(
        service.addRevision({ documentId: 'nonexistent', description: 'Bad' }),
      ).rejects.toThrow('Document not found');
    });
  });

  // ==========================================================================
  // Template CRUD
  // ==========================================================================

  describe('Template CRUD', () => {
    it('creates a template with defaults', async () => {
      const tmpl = await service.createTemplate({
        name: 'Standard Subcontract',
        category: 'contract',
        description: 'Standard subcontract agreement template',
        content: 'This agreement between {{ownerName}} and {{subName}}...',
        variables: ['ownerName', 'subName', 'contractAmount'],
      });

      expect(tmpl.name).toBe('Standard Subcontract');
      expect(tmpl.category).toBe('contract');
      expect(tmpl.isActive).toBe(true);
      expect(tmpl.variables).toEqual(['ownerName', 'subName', 'contractAmount']);
    });

    it('rejects duplicate template names', async () => {
      await service.createTemplate({ name: 'My Template' });
      await expect(
        service.createTemplate({ name: 'My Template' }),
      ).rejects.toThrow('already exists');
    });

    it('renders template with variable substitution', () => {
      const content = 'Project: {{projectName}}, Amount: {{amount}}, Date: {{date}}';
      const rendered = service.renderTemplate(content, {
        projectName: 'Building A',
        amount: '$1,000,000',
        date: '2026-03-01',
      });

      expect(rendered).toBe('Project: Building A, Amount: $1,000,000, Date: 2026-03-01');
    });

    it('filters templates by category', async () => {
      await service.createTemplate({ name: 'Contract Template', category: 'contract' });
      await service.createTemplate({ name: 'Lien Waiver Template', category: 'lien_waiver' });
      await service.createTemplate({ name: 'AIA G702', category: 'aia_form' });

      const contracts = await service.getTemplates({ category: 'contract' });
      expect(contracts).toHaveLength(1);
      expect(contracts[0].name).toBe('Contract Template');
    });
  });

  // ==========================================================================
  // Transmittal Management
  // ==========================================================================

  describe('Transmittal Management', () => {
    it('creates a transmittal with defaults', async () => {
      const trans = await service.createTransmittal({
        number: 'TRANS-001',
        toName: 'John Smith',
        toCompany: 'ABC Contractors',
        fromName: 'Jane Doe',
        date: '2026-02-15',
        subject: 'Foundation Drawings',
      });

      expect(trans.number).toBe('TRANS-001');
      expect(trans.status).toBe('draft');
      expect(trans.toName).toBe('John Smith');
      expect(trans.items).toEqual([]);
    });

    it('rejects duplicate transmittal numbers', async () => {
      await service.createTransmittal({
        number: 'TRANS-001',
        toName: 'John',
        date: '2026-02-15',
      });
      await expect(
        service.createTransmittal({
          number: 'TRANS-001',
          toName: 'Jane',
          date: '2026-02-16',
        }),
      ).rejects.toThrow('already exists');
    });

    it('sends a draft transmittal', async () => {
      const trans = await service.createTransmittal({
        number: 'TRANS-002',
        toName: 'John',
        date: '2026-02-15',
      });

      const sent = await service.sendTransmittal(trans.id);
      expect(sent.status).toBe('sent');
    });

    it('rejects sending a non-draft transmittal', async () => {
      const trans = await service.createTransmittal({
        number: 'TRANS-003',
        toName: 'John',
        date: '2026-02-15',
      });

      await service.sendTransmittal(trans.id);

      await expect(
        service.sendTransmittal(trans.id),
      ).rejects.toThrow('cannot be sent');
    });

    it('acknowledges a sent transmittal', async () => {
      const trans = await service.createTransmittal({
        number: 'TRANS-004',
        toName: 'John',
        date: '2026-02-15',
      });

      await service.sendTransmittal(trans.id);
      const acked = await service.acknowledgeTransmittal(trans.id);
      expect(acked.status).toBe('acknowledged');
    });

    it('rejects acknowledging a non-sent transmittal', async () => {
      const trans = await service.createTransmittal({
        number: 'TRANS-005',
        toName: 'John',
        date: '2026-02-15',
      });

      await expect(
        service.acknowledgeTransmittal(trans.id),
      ).rejects.toThrow('cannot be acknowledged');
    });

    it('adds and removes documents from transmittal', async () => {
      const trans = await service.createTransmittal({
        number: 'TRANS-006',
        toName: 'John',
        date: '2026-02-15',
      });

      const doc1 = await service.createDocument({ title: 'Doc 1', category: 'drawing' });
      const doc2 = await service.createDocument({ title: 'Doc 2', category: 'report' });

      await service.addDocumentToTransmittal(trans.id, doc1.id);
      let updated = await service.addDocumentToTransmittal(trans.id, doc2.id);
      expect(updated.items).toHaveLength(2);

      updated = await service.removeDocumentFromTransmittal(trans.id, doc1.id);
      expect(updated.items).toHaveLength(1);
      expect(updated.items![0]).toBe(doc2.id);
    });

    it('rejects adding duplicate document to transmittal', async () => {
      const trans = await service.createTransmittal({
        number: 'TRANS-007',
        toName: 'John',
        date: '2026-02-15',
      });

      const doc = await service.createDocument({ title: 'Doc', category: 'drawing' });
      await service.addDocumentToTransmittal(trans.id, doc.id);

      await expect(
        service.addDocumentToTransmittal(trans.id, doc.id),
      ).rejects.toThrow('already in transmittal');
    });
  });

  // ==========================================================================
  // Photo Log
  // ==========================================================================

  describe('Photo Log', () => {
    it('creates a photo entry with associated document', async () => {
      const result = await service.createPhotoEntry({
        title: 'Foundation Pour',
        fileName: 'IMG_0001.jpg',
        fileSize: 4096000,
        jobId: 'job-001',
        dateTaken: '2026-02-10',
        location: 'Building A, North Corner',
        description: 'Foundation pour in progress',
        latitude: 40.7128,
        longitude: -74.006,
        takenBy: 'John Photo',
        tags: ['foundation', 'concrete'],
      });

      expect(result.document.title).toBe('Foundation Pour');
      expect(result.document.category).toBe('photo');
      expect(result.document.tags).toEqual(['foundation', 'concrete']);
      expect(result.photo.dateTaken).toBe('2026-02-10');
      expect(result.photo.location).toBe('Building A, North Corner');
      expect(result.photo.latitude).toBe(40.7128);
      expect(result.photo.longitude).toBe(-74.006);
      expect(result.photo.takenBy).toBe('John Photo');
      expect(result.photo.documentId).toBe(result.document.id);
    });

    it('filters photos by job', async () => {
      await service.createPhotoEntry({
        title: 'Photo A',
        jobId: 'job-001',
        dateTaken: '2026-02-10',
      });
      await service.createPhotoEntry({
        title: 'Photo B',
        jobId: 'job-002',
        dateTaken: '2026-02-11',
      });
      await service.createPhotoEntry({
        title: 'Photo C',
        jobId: 'job-001',
        dateTaken: '2026-02-12',
      });

      const job1Photos = await service.getPhotos({ jobId: 'job-001' });
      expect(job1Photos).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Drawing Log
  // ==========================================================================

  describe('Drawing Log', () => {
    it('returns only drawing category documents', async () => {
      await service.createDocument({ title: 'Floor Plan', category: 'drawing' });
      await service.createDocument({ title: 'Contract', category: 'contract' });
      await service.createDocument({ title: 'Elevation', category: 'drawing' });

      const drawings = await service.getDrawingLog();
      expect(drawings).toHaveLength(2);
      expect(drawings.every((d) => d.category === 'drawing')).toBe(true);
    });

    it('gets drawing with revision history', async () => {
      const doc = await service.createDocument({
        title: 'Floor Plan A',
        category: 'drawing',
      });

      await service.addRevision({ documentId: doc.id, description: 'Rev A' });
      await service.addRevision({ documentId: doc.id, description: 'Rev B' });

      const result = await service.getDrawingWithRevisions(doc.id);
      expect(result).not.toBeNull();
      expect(result!.drawing.title).toBe('Floor Plan A');
      expect(result!.revisions).toHaveLength(2);
    });

    it('returns null for non-drawing document', async () => {
      const doc = await service.createDocument({
        title: 'Contract',
        category: 'contract',
      });

      const result = await service.getDrawingWithRevisions(doc.id);
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Full-Text Search
  // ==========================================================================

  describe('Full-Text Search', () => {
    beforeEach(async () => {
      await service.createDocument({
        title: 'Foundation Floor Plan',
        category: 'drawing',
        description: 'Detailed floor plan for the foundation',
        tags: ['foundation', 'structural'],
        fileName: 'foundation-plan.dwg',
      });
      await service.createDocument({
        title: 'Electrical Wiring Diagram',
        category: 'drawing',
        description: 'Main electrical panel wiring',
        tags: ['electrical', 'mep'],
        fileName: 'wiring-diagram.pdf',
      });
      await service.createDocument({
        title: 'Subcontract Agreement',
        category: 'contract',
        description: 'Agreement with ABC Concrete',
        tags: ['legal', 'concrete'],
      });
    });

    it('searches by title', async () => {
      const results = await service.searchDocuments('Foundation');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].matchField).toBe('title');
    });

    it('searches by description', async () => {
      const results = await service.searchDocuments('electrical panel');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.matchField === 'description')).toBe(true);
    });

    it('searches by tags', async () => {
      const results = await service.searchDocuments('structural');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.matchField === 'tags')).toBe(true);
    });

    it('searches by category', async () => {
      const results = await service.searchDocuments('contract');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty array for empty query', async () => {
      const results = await service.searchDocuments('');
      expect(results).toHaveLength(0);
    });

    it('returns empty array for no matches', async () => {
      const results = await service.searchDocuments('zzzznonexistentzzz');
      expect(results).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Expiration Alerts
  // ==========================================================================

  describe('Expiration Alerts', () => {
    it('finds expiring documents within N days', async () => {
      const today = new Date();
      const in10Days = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
      const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

      await service.createDocument({
        title: 'Insurance Cert',
        category: 'insurance',
        expirationDate: in10Days.toISOString().split('T')[0],
      });

      await service.createDocument({
        title: 'Permit',
        category: 'permit',
        expirationDate: in60Days.toISOString().split('T')[0],
      });

      const expiring30 = await service.getExpiringDocuments(30);
      expect(expiring30).toHaveLength(1);
      expect(expiring30[0].title).toBe('Insurance Cert');
    });

    it('identifies already expired documents', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await service.createDocument({
        title: 'Expired License',
        category: 'permit',
        expirationDate: yesterday.toISOString().split('T')[0],
      });

      const expired = await service.getExpiredDocuments();
      expect(expired).toHaveLength(1);
      expect(expired[0].title).toBe('Expired License');
    });

    it('marks expired documents and returns count', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await service.createDocument({
        title: 'Expired Bond',
        category: 'insurance',
        expirationDate: yesterday.toISOString().split('T')[0],
      });

      const count = await service.markExpiredDocuments();
      expect(count).toBe(1);

      const doc = (await service.getDocuments({ status: 'expired' }))[0];
      expect(doc.title).toBe('Expired Bond');
      expect(doc.status).toBe('expired');
    });
  });

  // ==========================================================================
  // Statistics
  // ==========================================================================

  describe('Statistics', () => {
    it('computes document stats', async () => {
      await service.createDocument({ title: 'Drawing 1', category: 'drawing', jobId: 'job-1' });
      await service.createDocument({ title: 'Drawing 2', category: 'drawing', jobId: 'job-1' });
      await service.createDocument({ title: 'Contract 1', category: 'contract', jobId: 'job-2' });

      const doc = await service.createDocument({ title: 'Drawing 3', category: 'drawing' });
      await service.addRevision({ documentId: doc.id, description: 'Rev 1' });

      await service.createTemplate({ name: 'Tmpl 1' });
      await service.createTransmittal({ number: 'T-001', toName: 'A', date: '2026-01-01' });

      const stats = await service.getStats();
      expect(stats.totalDocuments).toBe(4);
      expect(stats.totalRevisions).toBe(1);
      expect(stats.totalTemplates).toBe(1);
      expect(stats.totalTransmittals).toBe(1);
      expect(stats.byCategory.find((c) => c.category === 'drawing')?.count).toBe(3);
      expect(stats.byCategory.find((c) => c.category === 'contract')?.count).toBe(1);
      expect(stats.byJob.find((j) => j.jobId === 'job-1')?.count).toBe(2);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits doc.created', async () => {
      let emitted = false;
      events.on('doc.created', () => { emitted = true; });
      await service.createDocument({ title: 'Test', category: 'report' });
      expect(emitted).toBe(true);
    });

    it('emits doc.revision.added', async () => {
      const doc = await service.createDocument({ title: 'Test', category: 'drawing' });
      let emitted = false;
      events.on('doc.revision.added', () => { emitted = true; });
      await service.addRevision({ documentId: doc.id, description: 'Rev' });
      expect(emitted).toBe(true);
    });

    it('emits doc.transmittal.sent', async () => {
      const trans = await service.createTransmittal({
        number: 'T-EVENT',
        toName: 'Test',
        date: '2026-02-15',
      });

      let emitted = false;
      events.on('doc.transmittal.sent', () => { emitted = true; });
      await service.sendTransmittal(trans.id);
      expect(emitted).toBe(true);
    });

    it('emits doc.expired on mark', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await service.createDocument({
        title: 'Expired',
        category: 'insurance',
        expirationDate: yesterday.toISOString().split('T')[0],
      });

      let emitted = false;
      events.on('doc.expired', () => { emitted = true; });
      await service.markExpiredDocuments();
      expect(emitted).toBe(true);
    });
  });
});
