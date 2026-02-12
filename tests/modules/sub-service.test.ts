/**
 * Sub Service Tests
 * Tests for the Subcontractor Management business logic layer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SubService } from '../../src/modules/sub/sub-service';
import type {
  Subcontract, ChangeOrder, PayApp, Backcharge,
  Prequalification, SubCompliance,
} from '../../src/modules/sub/sub-service';
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

  const subcontracts = new Collection<Subcontract>('sub/subcontract', adapter, schemas, events);
  const changeOrders = new Collection<ChangeOrder>('sub/changeOrder', adapter, schemas, events);
  const payApps = new Collection<PayApp>('sub/payApp', adapter, schemas, events);
  const backcharges = new Collection<Backcharge>('sub/backcharge', adapter, schemas, events);
  const prequalifications = new Collection<Prequalification>('sub/prequalification', adapter, schemas, events);
  const compliances = new Collection<SubCompliance>('sub/compliance', adapter, schemas, events);

  const service = new SubService(
    subcontracts, changeOrders, payApps, backcharges,
    prequalifications, compliances, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SubService', () => {
  let service: SubService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Subcontract CRUD
  // ==========================================================================

  describe('Subcontract CRUD', () => {
    it('creates a subcontract with defaults', async () => {
      const sub = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        description: 'Concrete work',
        contractAmount: 500000,
      });

      expect(sub.vendorId).toBe('vendor-1');
      expect(sub.jobId).toBe('job-1');
      expect(sub.number).toBe('SC-001');
      expect(sub.contractAmount).toBe(500000);
      expect(sub.retentionPct).toBe(10);
      expect(sub.status).toBe('draft');
      expect(sub.approvedChangeOrders).toBe(0);
      expect(sub.revisedAmount).toBe(500000);
      expect(sub.billedToDate).toBe(0);
      expect(sub.paidToDate).toBe(0);
      expect(sub.retainageHeld).toBe(0);
    });

    it('rejects duplicate subcontract numbers within the same job', async () => {
      await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
      });

      await expect(
        service.createSubcontract({
          vendorId: 'vendor-2',
          jobId: 'job-1',
          number: 'SC-001',
          contractAmount: 200000,
        }),
      ).rejects.toThrow('already exists');
    });

    it('allows same subcontract number on different jobs', async () => {
      await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
      });

      const sub2 = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-2',
        number: 'SC-001',
        contractAmount: 200000,
      });

      expect(sub2.number).toBe('SC-001');
      expect(sub2.jobId).toBe('job-2');
    });

    it('updates a subcontract and recalculates revisedAmount', async () => {
      const sub = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 500000,
      });

      const updated = await service.updateSubcontract(sub.id, {
        contractAmount: 600000,
      });

      expect(updated.contractAmount).toBe(600000);
      expect(updated.revisedAmount).toBe(600000);
    });

    it('filters subcontracts by status', async () => {
      await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
        status: 'active',
      });
      await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-002',
        contractAmount: 200000,
      });

      const active = await service.getSubcontracts({ status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].number).toBe('SC-001');
    });

    it('refuses deletion when pay apps exist', async () => {
      const sub = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
      });

      await service.createPayApp({
        subcontractId: sub.id,
        applicationNumber: 1,
        periodTo: '2026-02-28',
        currentBilled: 10000,
      });

      await expect(service.deleteSubcontract(sub.id)).rejects.toThrow(
        'Cannot delete subcontract',
      );
    });
  });

  // ==========================================================================
  // Change Order Management
  // ==========================================================================

  describe('Change Order Management', () => {
    let subId: string;

    beforeEach(async () => {
      const sub = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 500000,
      });
      subId = sub.id;
    });

    it('creates a change order', async () => {
      const co = await service.createChangeOrder({
        subcontractId: subId,
        number: 1,
        description: 'Additional concrete pour',
        amount: 50000,
        type: 'addition',
        date: '2026-02-15',
      });

      expect(co.subcontractId).toBe(subId);
      expect(co.number).toBe(1);
      expect(co.amount).toBe(50000);
      expect(co.type).toBe('addition');
      expect(co.status).toBe('pending');
    });

    it('approves a change order and updates subcontract', async () => {
      const co = await service.createChangeOrder({
        subcontractId: subId,
        number: 1,
        description: 'Additional work',
        amount: 50000,
        type: 'addition',
        date: '2026-02-15',
      });

      const approved = await service.approveChangeOrder(co.id, 'John PM');
      expect(approved.status).toBe('approved');
      expect(approved.approvedBy).toBe('John PM');

      const sub = await service.getSubcontract(subId);
      expect(sub!.approvedChangeOrders).toBe(50000);
      expect(sub!.revisedAmount).toBe(550000);
    });

    it('handles deduction change orders correctly', async () => {
      const co = await service.createChangeOrder({
        subcontractId: subId,
        number: 1,
        description: 'Scope reduction',
        amount: 25000,
        type: 'deduction',
        date: '2026-02-15',
      });

      await service.approveChangeOrder(co.id, 'John PM');

      const sub = await service.getSubcontract(subId);
      expect(sub!.approvedChangeOrders).toBe(-25000);
      expect(sub!.revisedAmount).toBe(475000);
    });

    it('rejects approval of non-pending change order', async () => {
      const co = await service.createChangeOrder({
        subcontractId: subId,
        number: 1,
        description: 'Extra work',
        amount: 10000,
        type: 'addition',
        date: '2026-02-15',
      });

      await service.approveChangeOrder(co.id, 'Admin');

      await expect(
        service.approveChangeOrder(co.id, 'Admin'),
      ).rejects.toThrow('cannot be approved');
    });

    it('rejects a change order', async () => {
      const co = await service.createChangeOrder({
        subcontractId: subId,
        number: 1,
        description: 'Rejected work',
        amount: 10000,
        type: 'addition',
        date: '2026-02-15',
      });

      const rejected = await service.rejectChangeOrder(co.id);
      expect(rejected.status).toBe('rejected');
    });
  });

  // ==========================================================================
  // Payment Application Processing
  // ==========================================================================

  describe('Payment Application Processing', () => {
    let subId: string;

    beforeEach(async () => {
      const sub = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
        retentionPct: 10,
      });
      subId = sub.id;
    });

    it('creates a pay app with computed fields', async () => {
      const payApp = await service.createPayApp({
        subcontractId: subId,
        applicationNumber: 1,
        periodTo: '2026-02-28',
        currentBilled: 25000,
        materialStored: 5000,
      });

      expect(payApp.subcontractId).toBe(subId);
      expect(payApp.applicationNumber).toBe(1);
      expect(payApp.previouslyBilled).toBe(0);
      expect(payApp.currentBilled).toBe(25000);
      expect(payApp.materialStored).toBe(5000);
      expect(payApp.totalBilled).toBe(30000); // 0 + 25000 + 5000
      expect(payApp.retainageAmount).toBe(3000); // 30000 * 10%
      expect(payApp.netPayable).toBe(27000); // (25000 + 5000) - (30000 * 10%)
      expect(payApp.status).toBe('draft');
    });

    it('submits, approves, and pays a pay app', async () => {
      const payApp = await service.createPayApp({
        subcontractId: subId,
        applicationNumber: 1,
        periodTo: '2026-02-28',
        currentBilled: 25000,
      });

      // Submit
      const submitted = await service.submitPayApp(payApp.id);
      expect(submitted.status).toBe('submitted');

      // Approve
      const approved = await service.approvePayApp(payApp.id);
      expect(approved.status).toBe('approved');

      // Check subcontract was updated
      let sub = await service.getSubcontract(subId);
      expect(sub!.billedToDate).toBe(25000);
      expect(sub!.retainageHeld).toBe(2500); // 25000 * 10%

      // Mark paid
      const paid = await service.markPayAppPaid(payApp.id);
      expect(paid.status).toBe('paid');

      sub = await service.getSubcontract(subId);
      expect(sub!.paidToDate).toBe(22500); // netPayable = 25000 - 2500
    });

    it('rejects approval of non-submitted pay app', async () => {
      const payApp = await service.createPayApp({
        subcontractId: subId,
        applicationNumber: 1,
        periodTo: '2026-02-28',
        currentBilled: 25000,
      });

      await expect(service.approvePayApp(payApp.id)).rejects.toThrow(
        'cannot be approved',
      );
    });

    it('rejects duplicate application numbers', async () => {
      await service.createPayApp({
        subcontractId: subId,
        applicationNumber: 1,
        periodTo: '2026-02-28',
        currentBilled: 25000,
      });

      await expect(
        service.createPayApp({
          subcontractId: subId,
          applicationNumber: 1,
          periodTo: '2026-03-31',
          currentBilled: 15000,
        }),
      ).rejects.toThrow('already exists');
    });
  });

  // ==========================================================================
  // Backcharge Tracking
  // ==========================================================================

  describe('Backcharge Tracking', () => {
    let subId: string;

    beforeEach(async () => {
      const sub = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
      });
      subId = sub.id;
    });

    it('creates a backcharge', async () => {
      const bc = await service.createBackcharge({
        subcontractId: subId,
        description: 'Cleanup charge',
        amount: 2500,
        date: '2026-02-10',
        category: 'cleanup',
      });

      expect(bc.subcontractId).toBe(subId);
      expect(bc.description).toBe('Cleanup charge');
      expect(bc.amount).toBe(2500);
      expect(bc.status).toBe('pending');
      expect(bc.category).toBe('cleanup');
    });

    it('follows approve-then-deduct workflow', async () => {
      const bc = await service.createBackcharge({
        subcontractId: subId,
        description: 'Damage repair',
        amount: 5000,
        date: '2026-02-10',
      });

      // Cannot deduct before approving
      await expect(service.deductBackcharge(bc.id)).rejects.toThrow(
        'must be in "approved" status',
      );

      // Approve
      const approved = await service.approveBackcharge(bc.id);
      expect(approved.status).toBe('approved');

      // Deduct
      const deducted = await service.deductBackcharge(bc.id);
      expect(deducted.status).toBe('deducted');
    });
  });

  // ==========================================================================
  // Prequalification Tracking
  // ==========================================================================

  describe('Prequalification Tracking', () => {
    it('creates a prequalification with defaults', async () => {
      const pq = await service.createPrequalification({
        vendorId: 'vendor-1',
        submittedDate: '2026-01-15',
        emr: 0.85,
        bondingCapacity: 5000000,
        yearsInBusiness: 15,
        revenueAvg3Year: 12000000,
      });

      expect(pq.vendorId).toBe('vendor-1');
      expect(pq.score).toBe(0);
      expect(pq.status).toBe('pending');
      expect(pq.emr).toBe(0.85);
      expect(pq.bondingCapacity).toBe(5000000);
    });

    it('approves a prequalification with score', async () => {
      const pq = await service.createPrequalification({
        vendorId: 'vendor-1',
      });

      const approved = await service.approvePrequalification(pq.id, 85);
      expect(approved.status).toBe('approved');
      expect(approved.score).toBe(85);
      expect(approved.reviewedDate).toBeTruthy();
    });

    it('rejects a prequalification', async () => {
      const pq = await service.createPrequalification({
        vendorId: 'vendor-1',
      });

      const rejected = await service.rejectPrequalification(pq.id);
      expect(rejected.status).toBe('rejected');
    });

    it('prevents approving non-pending prequalification', async () => {
      const pq = await service.createPrequalification({
        vendorId: 'vendor-1',
      });
      await service.approvePrequalification(pq.id, 85);

      await expect(
        service.approvePrequalification(pq.id, 90),
      ).rejects.toThrow('cannot be approved');
    });
  });

  // ==========================================================================
  // Compliance Matrix
  // ==========================================================================

  describe('Compliance Matrix', () => {
    it('creates compliance records', async () => {
      const comp = await service.createCompliance({
        vendorId: 'vendor-1',
        type: 'insurance_gl',
        status: 'valid',
        expirationDate: '2026-12-31',
        documentId: 'DOC-001',
      });

      expect(comp.vendorId).toBe('vendor-1');
      expect(comp.type).toBe('insurance_gl');
      expect(comp.status).toBe('valid');
      expect(comp.expirationDate).toBe('2026-12-31');
    });

    it('updates a compliance record', async () => {
      const comp = await service.createCompliance({
        vendorId: 'vendor-1',
        type: 'license',
        status: 'pending',
      });

      const updated = await service.updateCompliance(comp.id, {
        status: 'valid',
        expirationDate: '2027-06-30',
      });

      expect(updated.status).toBe('valid');
      expect(updated.expirationDate).toBe('2027-06-30');
    });

    it('builds compliance matrix report', async () => {
      await service.createCompliance({
        vendorId: 'vendor-1',
        type: 'insurance_gl',
        status: 'valid',
      });
      await service.createCompliance({
        vendorId: 'vendor-1',
        type: 'insurance_auto',
        status: 'valid',
      });
      await service.createCompliance({
        vendorId: 'vendor-1',
        type: 'license',
        status: 'expired',
      });

      const matrix = await service.getComplianceMatrix();
      expect(matrix).toHaveLength(1);
      expect(matrix[0].vendorId).toBe('vendor-1');
      expect(matrix[0].insuranceGl).toBe('valid');
      expect(matrix[0].insuranceAuto).toBe('valid');
      expect(matrix[0].license).toBe('expired');
      expect(matrix[0].bond).toBe('missing');
      expect(matrix[0].overallStatus).toBe('partial');
    });
  });

  // ==========================================================================
  // Retention Release
  // ==========================================================================

  describe('Retention Release', () => {
    it('releases retainage partially', async () => {
      const sub = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
        retentionPct: 10,
      });

      // Simulate retainage being held
      await service.updateSubcontract(sub.id, {
        retainageHeld: 10000,
      } as Partial<Subcontract>);

      const updated = await service.releaseRetainage(sub.id, 5000);
      expect(updated.retainageHeld).toBe(5000);
      expect(updated.paidToDate).toBe(5000);
    });

    it('prevents releasing more than held', async () => {
      const sub = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
      });

      await service.updateSubcontract(sub.id, {
        retainageHeld: 5000,
      } as Partial<Subcontract>);

      await expect(
        service.releaseRetainage(sub.id, 10000),
      ).rejects.toThrow('exceeds retainage held');
    });
  });

  // ==========================================================================
  // Performance Scoring
  // ==========================================================================

  describe('Performance Scoring', () => {
    it('computes performance score for vendor', async () => {
      // Create an active subcontract
      await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
        status: 'active',
      });

      // Add compliance records (all valid)
      await service.createCompliance({
        vendorId: 'vendor-1',
        type: 'insurance_gl',
        status: 'valid',
      });
      await service.createCompliance({
        vendorId: 'vendor-1',
        type: 'license',
        status: 'valid',
      });

      // Add approved prequalification
      const pq = await service.createPrequalification({
        vendorId: 'vendor-1',
      });
      await service.approvePrequalification(pq.id, 80);

      const score = await service.getPerformanceScore('vendor-1');
      expect(score.vendorId).toBe('vendor-1');
      expect(score.budgetAdherence).toBe(40); // No billing yet, so full score
      expect(score.complianceScore).toBe(30); // All valid
      expect(score.prequalScore).toBe(24); // 80 * 0.3
      expect(score.overall).toBe(94); // 40 + 30 + 24
    });
  });

  // ==========================================================================
  // Reports
  // ==========================================================================

  describe('Reports', () => {
    it('generates open commitments report', async () => {
      await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 200000,
        status: 'active',
      });
      await service.createSubcontract({
        vendorId: 'vendor-2',
        jobId: 'job-1',
        number: 'SC-002',
        contractAmount: 150000,
        status: 'active',
      });
      await service.createSubcontract({
        vendorId: 'vendor-3',
        jobId: 'job-1',
        number: 'SC-003',
        contractAmount: 100000,
        status: 'complete',
      });

      const commitments = await service.getOpenCommitments({ jobId: 'job-1' });
      expect(commitments).toHaveLength(2);
      // Sorted by subcontract number: SC-001 (200000), SC-002 (150000)
      expect(commitments[0].remainingCommitment).toBe(200000);
      expect(commitments[1].remainingCommitment).toBe(150000);
    });

    it('generates payment history report', async () => {
      const sub = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
      });

      await service.createPayApp({
        subcontractId: sub.id,
        applicationNumber: 1,
        periodTo: '2026-02-28',
        currentBilled: 25000,
      });
      await service.createPayApp({
        subcontractId: sub.id,
        applicationNumber: 2,
        periodTo: '2026-03-31',
        currentBilled: 30000,
      });

      const history = await service.getPaymentHistory({ vendorId: 'vendor-1' });
      expect(history).toHaveLength(2);
      expect(history[0].applicationNumber).toBe(1);
      expect(history[1].applicationNumber).toBe(2);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits sub.created', async () => {
      let emitted = false;
      events.on('sub.created', () => { emitted = true; });
      await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
      });
      expect(emitted).toBe(true);
    });

    it('emits sub.changeOrder.approved', async () => {
      const sub = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
      });

      const co = await service.createChangeOrder({
        subcontractId: sub.id,
        number: 1,
        description: 'Extra work',
        amount: 10000,
        type: 'addition',
        date: '2026-02-15',
      });

      let emitted = false;
      events.on('sub.changeOrder.approved', () => { emitted = true; });
      await service.approveChangeOrder(co.id, 'Admin');
      expect(emitted).toBe(true);
    });

    it('emits sub.payApp.approved', async () => {
      const sub = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
      });

      const pa = await service.createPayApp({
        subcontractId: sub.id,
        applicationNumber: 1,
        periodTo: '2026-02-28',
        currentBilled: 10000,
      });

      await service.submitPayApp(pa.id);

      let emitted = false;
      events.on('sub.payApp.approved', () => { emitted = true; });
      await service.approvePayApp(pa.id);
      expect(emitted).toBe(true);
    });

    it('emits sub.backcharge.created', async () => {
      const sub = await service.createSubcontract({
        vendorId: 'vendor-1',
        jobId: 'job-1',
        number: 'SC-001',
        contractAmount: 100000,
      });

      let emitted = false;
      events.on('sub.backcharge.created', () => { emitted = true; });
      await service.createBackcharge({
        subcontractId: sub.id,
        description: 'Cleanup',
        amount: 1000,
        date: '2026-02-10',
      });
      expect(emitted).toBe(true);
    });
  });
});
