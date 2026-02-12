/**
 * Change Order Service Tests
 * Tests for the Change Order business logic layer (Phase 19).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ChangeOrderService } from '../../src/modules/change-order/change-order-service';
import type {
  ChangeOrderRequest, ChangeOrder, ChangeOrderLine,
  ChangeOrderApproval, ChangeOrderLog,
} from '../../src/modules/change-order/change-order-service';
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

  const requests = new Collection<ChangeOrderRequest>('co/changeOrderRequest', adapter, schemas, events);
  const changeOrders = new Collection<ChangeOrder>('co/changeOrder', adapter, schemas, events);
  const lines = new Collection<ChangeOrderLine>('co/changeOrderLine', adapter, schemas, events);
  const approvals = new Collection<ChangeOrderApproval>('co/changeOrderApproval', adapter, schemas, events);
  const logs = new Collection<ChangeOrderLog>('co/changeOrderLog', adapter, schemas, events);

  const service = new ChangeOrderService(
    requests, changeOrders, lines, approvals, logs, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChangeOrderService', () => {
  let service: ChangeOrderService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // PCO/COR Request Management
  // ==========================================================================

  describe('PCO/COR Request Management', () => {
    it('creates a request with defaults', async () => {
      const req = await service.createRequest({
        jobId: 'job-1',
        number: 'PCO-001',
        title: 'Foundation scope change',
        source: 'owner',
      });

      expect(req.jobId).toBe('job-1');
      expect(req.number).toBe('PCO-001');
      expect(req.title).toBe('Foundation scope change');
      expect(req.source).toBe('owner');
      expect(req.status).toBe('draft');
      expect(req.estimatedAmount).toBe(0);
      expect(req.scheduleImpactDays).toBe(0);
    });

    it('creates a request with full data', async () => {
      const req = await service.createRequest({
        jobId: 'job-1',
        number: 'PCO-002',
        title: 'Additional concrete pour',
        description: 'Extra work for foundation expansion',
        requestedBy: 'John PM',
        requestDate: '2026-02-10',
        source: 'field',
        estimatedAmount: 50000,
        scheduleImpactDays: 5,
        entityId: 'entity-1',
      });

      expect(req.description).toBe('Extra work for foundation expansion');
      expect(req.requestedBy).toBe('John PM');
      expect(req.estimatedAmount).toBe(50000);
      expect(req.scheduleImpactDays).toBe(5);
    });

    it('submits a draft request', async () => {
      const req = await service.createRequest({
        jobId: 'job-1',
        number: 'PCO-001',
        title: 'Test',
        source: 'owner',
      });

      const submitted = await service.submitRequest(req.id, 'John PM');
      expect(submitted.status).toBe('pending');
    });

    it('rejects submission of non-draft request', async () => {
      const req = await service.createRequest({
        jobId: 'job-1',
        number: 'PCO-001',
        title: 'Test',
        source: 'owner',
        status: 'pending',
      });

      await expect(
        service.submitRequest(req.id),
      ).rejects.toThrow('cannot be submitted');
    });

    it('withdraws a pending request', async () => {
      const req = await service.createRequest({
        jobId: 'job-1',
        number: 'PCO-001',
        title: 'Test',
        source: 'owner',
      });

      await service.submitRequest(req.id);
      const withdrawn = await service.withdrawRequest(req.id, 'No longer needed');
      expect(withdrawn.status).toBe('withdrawn');
    });

    it('rejects withdrawal of approved request', async () => {
      const req = await service.createRequest({
        jobId: 'job-1',
        number: 'PCO-001',
        title: 'Test',
        source: 'owner',
        status: 'approved',
      });

      await expect(
        service.withdrawRequest(req.id),
      ).rejects.toThrow('cannot be withdrawn');
    });

    it('lists requests by job', async () => {
      await service.createRequest({ jobId: 'job-1', number: 'PCO-001', title: 'A', source: 'owner' });
      await service.createRequest({ jobId: 'job-1', number: 'PCO-002', title: 'B', source: 'field' });
      await service.createRequest({ jobId: 'job-2', number: 'PCO-003', title: 'C', source: 'internal' });

      const job1Reqs = await service.getRequestsByJob('job-1');
      expect(job1Reqs).toHaveLength(2);
    });

    it('filters requests by status', async () => {
      await service.createRequest({ jobId: 'job-1', number: 'PCO-001', title: 'A', source: 'owner' });
      const req2 = await service.createRequest({ jobId: 'job-1', number: 'PCO-002', title: 'B', source: 'owner' });
      await service.submitRequest(req2.id);

      const pending = await service.listRequests({ status: 'pending' });
      expect(pending).toHaveLength(1);
      expect(pending[0].number).toBe('PCO-002');
    });
  });

  // ==========================================================================
  // Change Order CRUD
  // ==========================================================================

  describe('Change Order CRUD', () => {
    it('creates a change order with defaults', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Foundation expansion',
        type: 'owner',
      });

      expect(co.jobId).toBe('job-1');
      expect(co.number).toBe('CO-001');
      expect(co.type).toBe('owner');
      expect(co.status).toBe('draft');
      expect(co.amount).toBe(0);
      expect(co.approvedAmount).toBe(0);
      expect(co.scheduleExtensionDays).toBe(0);
    });

    it('creates a change order from a request', async () => {
      const req = await service.createRequest({
        jobId: 'job-1',
        number: 'PCO-001',
        title: 'Foundation scope',
        source: 'owner',
      });

      const co = await service.createChangeOrder({
        jobId: 'job-1',
        requestId: req.id,
        number: 'CO-001',
        title: 'Foundation expansion',
        type: 'owner',
        amount: 75000,
      });

      expect(co.requestId).toBe(req.id);
      expect(co.amount).toBe(75000);
    });

    it('rejects CO creation with invalid request ID', async () => {
      await expect(
        service.createChangeOrder({
          jobId: 'job-1',
          requestId: 'nonexistent',
          number: 'CO-001',
          title: 'Test',
          type: 'owner',
        }),
      ).rejects.toThrow('not found');
    });

    it('updates a draft change order', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test',
        type: 'owner',
      });

      const updated = await service.updateChangeOrder(co.id, {
        title: 'Updated title',
        description: 'Updated description',
      });

      expect(updated.title).toBe('Updated title');
      expect(updated.description).toBe('Updated description');
    });

    it('rejects update of executed change order', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test',
        type: 'owner',
        status: 'executed',
      });

      await expect(
        service.updateChangeOrder(co.id, { title: 'New title' }),
      ).rejects.toThrow('cannot be updated');
    });

    it('lists change orders by job', async () => {
      await service.createChangeOrder({ jobId: 'job-1', number: 'CO-001', title: 'A', type: 'owner' });
      await service.createChangeOrder({ jobId: 'job-1', number: 'CO-002', title: 'B', type: 'subcontractor' });
      await service.createChangeOrder({ jobId: 'job-2', number: 'CO-003', title: 'C', type: 'internal' });

      const job1COs = await service.getByJob('job-1');
      expect(job1COs).toHaveLength(2);
    });

    it('filters change orders by type', async () => {
      await service.createChangeOrder({ jobId: 'job-1', number: 'CO-001', title: 'A', type: 'owner' });
      await service.createChangeOrder({ jobId: 'job-1', number: 'CO-002', title: 'B', type: 'subcontractor' });

      const ownerCOs = await service.listChangeOrders({ type: 'owner' });
      expect(ownerCOs).toHaveLength(1);
      expect(ownerCOs[0].type).toBe('owner');
    });
  });

  // ==========================================================================
  // Line Items
  // ==========================================================================

  describe('Line Items', () => {
    let coId: string;

    beforeEach(async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
      });
      coId = co.id;
    });

    it('adds a line item and recalculates CO amount', async () => {
      await service.addLine({
        changeOrderId: coId,
        costType: 'labor',
        description: 'Additional labor',
        amount: 10000,
        markupPct: 10,
      });

      const co = await service.getChangeOrder(coId);
      expect(co!.amount).toBe(11000); // 10000 + 10% markup
    });

    it('adds multiple lines and recalculates total', async () => {
      await service.addLine({
        changeOrderId: coId,
        costType: 'labor',
        description: 'Labor',
        amount: 10000,
        markupPct: 10,
      });

      await service.addLine({
        changeOrderId: coId,
        costType: 'material',
        description: 'Materials',
        amount: 20000,
        markupPct: 5,
      });

      const co = await service.getChangeOrder(coId);
      // 10000*1.1 + 20000*1.05 = 11000 + 21000 = 32000
      expect(co!.amount).toBe(32000);
    });

    it('updates a line item and recalculates', async () => {
      const line = await service.addLine({
        changeOrderId: coId,
        costType: 'labor',
        description: 'Labor',
        amount: 10000,
        markupPct: 10,
      });

      await service.updateLine(line.id, { amount: 20000 });

      const co = await service.getChangeOrder(coId);
      expect(co!.amount).toBe(22000); // 20000 + 10% = 22000
    });

    it('removes a line item and recalculates', async () => {
      const line1 = await service.addLine({
        changeOrderId: coId,
        costType: 'labor',
        amount: 10000,
      });

      await service.addLine({
        changeOrderId: coId,
        costType: 'material',
        amount: 20000,
      });

      await service.removeLine(line1.id);

      const co = await service.getChangeOrder(coId);
      expect(co!.amount).toBe(20000);
    });

    it('gets all lines for a change order', async () => {
      await service.addLine({ changeOrderId: coId, costType: 'labor', amount: 5000 });
      await service.addLine({ changeOrderId: coId, costType: 'material', amount: 3000 });
      await service.addLine({ changeOrderId: coId, costType: 'equipment', amount: 2000 });

      const allLines = await service.getLines(coId);
      expect(allLines).toHaveLength(3);
    });

    it('computes markup correctly', async () => {
      const line = await service.addLine({
        changeOrderId: coId,
        costType: 'labor',
        description: 'Labor',
        amount: 10000,
        markupPct: 15,
      });

      expect(line.amount).toBe(10000);
      expect(line.markupPct).toBe(15);
      expect(line.markup).toBe(1500);
      expect(line.totalWithMarkup).toBe(11500);
    });
  });

  // ==========================================================================
  // Cost Impact Calculation
  // ==========================================================================

  describe('Cost Impact Calculation', () => {
    it('calculates cost impact by cost type', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
      });

      await service.addLine({ changeOrderId: co.id, costType: 'labor', amount: 10000, markupPct: 10 });
      await service.addLine({ changeOrderId: co.id, costType: 'material', amount: 20000, markupPct: 5 });
      await service.addLine({ changeOrderId: co.id, costType: 'subcontract', amount: 15000 });
      await service.addLine({ changeOrderId: co.id, costType: 'equipment', amount: 5000 });

      const impact = await service.calculateCostImpact(co.id);

      expect(impact.labor).toBe(10000);
      expect(impact.material).toBe(20000);
      expect(impact.subcontract).toBe(15000);
      expect(impact.equipment).toBe(5000);
      expect(impact.subtotal).toBe(50000);
      expect(impact.markup).toBe(2000); // 1000 (labor 10%) + 1000 (material 5%)
      expect(impact.total).toBe(52000);
    });

    it('returns zero impact for CO with no lines', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
      });

      const impact = await service.calculateCostImpact(co.id);
      expect(impact.subtotal).toBe(0);
      expect(impact.total).toBe(0);
    });
  });

  // ==========================================================================
  // Schedule Impact
  // ==========================================================================

  describe('Schedule Impact', () => {
    it('sets schedule impact days', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
      });

      const updated = await service.setScheduleImpact(co.id, 14, 'Weather delay');
      expect(updated.scheduleExtensionDays).toBe(14);
    });
  });

  // ==========================================================================
  // Approval Workflow
  // ==========================================================================

  describe('Approval Workflow', () => {
    let coId: string;

    beforeEach(async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
        amount: 50000,
      });
      coId = co.id;
    });

    it('submits a CO for approval', async () => {
      const submitted = await service.submitForApproval(coId, 'John PM');
      expect(submitted.status).toBe('pending_approval');
    });

    it('rejects submission of non-draft CO', async () => {
      await service.submitForApproval(coId);

      await expect(
        service.submitForApproval(coId),
      ).rejects.toThrow('cannot be submitted');
    });

    it('approves a pending CO', async () => {
      await service.submitForApproval(coId);
      const approved = await service.approve(coId, 'approver-1', 'Looks good');

      expect(approved.status).toBe('approved');
      expect(approved.approvedAmount).toBe(50000);
    });

    it('rejects approval of non-pending CO', async () => {
      await expect(
        service.approve(coId, 'approver-1'),
      ).rejects.toThrow('cannot be approved');
    });

    it('rejects a pending CO', async () => {
      await service.submitForApproval(coId);
      const rejected = await service.reject(coId, 'approver-1', 'Out of budget');

      expect(rejected.status).toBe('rejected');
    });

    it('rejects rejection of non-pending CO', async () => {
      await expect(
        service.reject(coId, 'approver-1', 'Nope'),
      ).rejects.toThrow('cannot be rejected');
    });

    it('creates approval records', async () => {
      await service.submitForApproval(coId);
      await service.approve(coId, 'approver-1', 'Approved');

      const chain = await service.getApprovalChain(coId);
      expect(chain).toHaveLength(1);
      expect(chain[0].approverId).toBe('approver-1');
      expect(chain[0].status).toBe('approved');
      expect(chain[0].sequence).toBe(1);
    });
  });

  // ==========================================================================
  // Execute and Void
  // ==========================================================================

  describe('Execute and Void', () => {
    it('executes an approved CO', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
      });

      await service.submitForApproval(co.id);
      await service.approve(co.id, 'approver-1');

      const executed = await service.executeChangeOrder(co.id, 'admin');
      expect(executed.status).toBe('executed');
      expect(executed.executedDate).toBeTruthy();
    });

    it('rejects execution of non-approved CO', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
      });

      await expect(
        service.executeChangeOrder(co.id),
      ).rejects.toThrow('cannot be executed');
    });

    it('voids a draft CO', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
      });

      const voided = await service.voidChangeOrder(co.id, 'No longer needed');
      expect(voided.status).toBe('voided');
    });

    it('rejects voiding of executed CO', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
        status: 'executed',
      });

      await expect(
        service.voidChangeOrder(co.id),
      ).rejects.toThrow('cannot be voided');
    });

    it('rejects voiding of already voided CO', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
      });

      await service.voidChangeOrder(co.id);
      await expect(
        service.voidChangeOrder(co.id),
      ).rejects.toThrow('already voided');
    });
  });

  // ==========================================================================
  // Log Tracking
  // ==========================================================================

  describe('Log Tracking', () => {
    it('logs request creation', async () => {
      await service.createRequest({
        jobId: 'job-1',
        number: 'PCO-001',
        title: 'Test',
        source: 'owner',
      });

      const logs = await service.getLog('job-1');
      expect(logs.length).toBeGreaterThanOrEqual(1);
      const createLog = logs.find(l => l.action === 'request_created');
      expect(createLog).toBeTruthy();
    });

    it('logs CO approval', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
      });

      await service.submitForApproval(co.id);
      await service.approve(co.id, 'approver-1');

      const logs = await service.getLogByChangeOrder(co.id);
      const approvalLog = logs.find(l => l.action === 'co_approved');
      expect(approvalLog).toBeTruthy();
      expect(approvalLog!.performedBy).toBe('approver-1');
    });

    it('logs CO execution', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
      });

      await service.submitForApproval(co.id);
      await service.approve(co.id, 'approver-1');
      await service.executeChangeOrder(co.id, 'admin');

      const logs = await service.getLogByChangeOrder(co.id);
      const execLog = logs.find(l => l.action === 'co_executed');
      expect(execLog).toBeTruthy();
      expect(execLog!.previousStatus).toBe('approved');
      expect(execLog!.newStatus).toBe('executed');
    });

    it('logs CO void', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test CO',
        type: 'owner',
      });

      await service.voidChangeOrder(co.id, 'Cancelled by owner');

      const logs = await service.getLogByChangeOrder(co.id);
      const voidLog = logs.find(l => l.action === 'co_voided');
      expect(voidLog).toBeTruthy();
    });
  });

  // ==========================================================================
  // Trend Report
  // ==========================================================================

  describe('Trend Report', () => {
    it('returns trend data grouped by period', async () => {
      await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'A',
        type: 'owner',
        amount: 50000,
        effectiveDate: '2026-01-15',
      });

      await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-002',
        title: 'B',
        type: 'owner',
        amount: 30000,
        effectiveDate: '2026-01-20',
      });

      await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-003',
        title: 'C',
        type: 'owner',
        amount: 20000,
        effectiveDate: '2026-02-10',
      });

      const trend = await service.getChangeOrderTrend('job-1');
      expect(trend).toHaveLength(2); // Jan and Feb

      const jan = trend.find(t => t.period === '2026-01');
      expect(jan).toBeTruthy();
      expect(jan!.count).toBe(2);
      expect(jan!.totalAmount).toBe(80000);
    });

    it('returns empty array when no COs exist', async () => {
      const trend = await service.getChangeOrderTrend('job-1');
      expect(trend).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Job Summary
  // ==========================================================================

  describe('Job Summary', () => {
    it('computes job CO summary', async () => {
      // Approved CO
      const co1 = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'A',
        type: 'owner',
        amount: 50000,
      });
      await service.submitForApproval(co1.id);
      await service.approve(co1.id, 'approver-1');

      // Pending CO
      const co2 = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-002',
        title: 'B',
        type: 'owner',
        amount: 30000,
      });
      await service.submitForApproval(co2.id);

      // Rejected CO
      const co3 = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-003',
        title: 'C',
        type: 'owner',
        amount: 20000,
      });
      await service.submitForApproval(co3.id);
      await service.reject(co3.id, 'approver-1', 'Over budget');

      const summary = await service.getJobChangeOrderSummary('job-1');
      expect(summary.totalApproved).toBe(1);
      expect(summary.totalPending).toBe(1);
      expect(summary.totalRejected).toBe(1);
      expect(summary.approvedAmount).toBe(50000);
      expect(summary.pendingAmount).toBe(30000);
      expect(summary.rejectedAmount).toBe(20000);
    });

    it('returns zero summary for job with no COs', async () => {
      const summary = await service.getJobChangeOrderSummary('job-empty');
      expect(summary.totalApproved).toBe(0);
      expect(summary.totalPending).toBe(0);
      expect(summary.approvedAmount).toBe(0);
    });
  });

  // ==========================================================================
  // Subcontractor Flow-Down
  // ==========================================================================

  describe('Subcontractor Flow-Down', () => {
    it('creates a sub CO from an owner CO', async () => {
      const ownerCO = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Foundation work',
        type: 'owner',
        amount: 100000,
      });

      const subCO = await service.createSubcontractorCO(ownerCO.id, 'sub-123', 40000);

      expect(subCO.type).toBe('subcontractor');
      expect(subCO.amount).toBe(40000);
      expect(subCO.jobId).toBe('job-1');
      expect(subCO.number).toContain('SUB');
    });

    it('rejects flow-down from non-owner CO', async () => {
      const subCO = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Sub work',
        type: 'subcontractor',
        amount: 50000,
      });

      await expect(
        service.createSubcontractorCO(subCO.id, 'sub-123', 20000),
      ).rejects.toThrow('only supported from owner');
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits co.request.created', async () => {
      let emitted = false;
      events.on('co.request.created', () => { emitted = true; });
      await service.createRequest({
        jobId: 'job-1',
        number: 'PCO-001',
        title: 'Test',
        source: 'owner',
      });
      expect(emitted).toBe(true);
    });

    it('emits co.request.submitted', async () => {
      const req = await service.createRequest({
        jobId: 'job-1',
        number: 'PCO-001',
        title: 'Test',
        source: 'owner',
      });

      let emitted = false;
      events.on('co.request.submitted', () => { emitted = true; });
      await service.submitRequest(req.id);
      expect(emitted).toBe(true);
    });

    it('emits co.created', async () => {
      let emitted = false;
      events.on('co.created', () => { emitted = true; });
      await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test',
        type: 'owner',
      });
      expect(emitted).toBe(true);
    });

    it('emits co.submitted', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test',
        type: 'owner',
      });

      let emitted = false;
      events.on('co.submitted', () => { emitted = true; });
      await service.submitForApproval(co.id);
      expect(emitted).toBe(true);
    });

    it('emits co.approved', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test',
        type: 'owner',
      });
      await service.submitForApproval(co.id);

      let emitted = false;
      events.on('co.approved', () => { emitted = true; });
      await service.approve(co.id, 'approver-1');
      expect(emitted).toBe(true);
    });

    it('emits co.rejected', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test',
        type: 'owner',
      });
      await service.submitForApproval(co.id);

      let emitted = false;
      events.on('co.rejected', () => { emitted = true; });
      await service.reject(co.id, 'approver-1', 'Denied');
      expect(emitted).toBe(true);
    });

    it('emits co.executed', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test',
        type: 'owner',
      });
      await service.submitForApproval(co.id);
      await service.approve(co.id, 'approver-1');

      let emitted = false;
      events.on('co.executed', () => { emitted = true; });
      await service.executeChangeOrder(co.id);
      expect(emitted).toBe(true);
    });

    it('emits co.voided', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test',
        type: 'owner',
      });

      let emitted = false;
      events.on('co.voided', () => { emitted = true; });
      await service.voidChangeOrder(co.id, 'Not needed');
      expect(emitted).toBe(true);
    });

    it('emits co.line.added', async () => {
      const co = await service.createChangeOrder({
        jobId: 'job-1',
        number: 'CO-001',
        title: 'Test',
        type: 'owner',
      });

      let emitted = false;
      events.on('co.line.added', () => { emitted = true; });
      await service.addLine({ changeOrderId: co.id, costType: 'labor', amount: 5000 });
      expect(emitted).toBe(true);
    });
  });
});
