/**
 * PO Service Tests
 * Tests for the Purchase Orders & Procurement business logic layer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { POService } from '../../src/modules/po/po-service';
import type {
  PurchaseOrder, POLine, POReceipt, POReceiptLine, POAmendment,
} from '../../src/modules/po/po-service';
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

  const purchaseOrders = new Collection<PurchaseOrder>('po/purchaseOrder', adapter, schemas, events);
  const poLines = new Collection<POLine>('po/poLine', adapter, schemas, events);
  const receipts = new Collection<POReceipt>('po/receipt', adapter, schemas, events);
  const receiptLines = new Collection<POReceiptLine>('po/receiptLine', adapter, schemas, events);
  const amendments = new Collection<POAmendment>('po/amendment', adapter, schemas, events);

  const service = new POService(
    purchaseOrders, poLines, receipts, receiptLines, amendments, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POService', () => {
  let service: POService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Purchase Order CRUD
  // ==========================================================================

  describe('Purchase Order CRUD', () => {
    it('creates a purchase order with defaults', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
      });

      expect(po.vendorId).toBe('vendor-1');
      expect(po.poNumber).toBe('PO-001');
      expect(po.type).toBe('standard');
      expect(po.amount).toBe(50000);
      expect(po.taxAmount).toBe(0);
      expect(po.shippingAmount).toBe(0);
      expect(po.totalAmount).toBe(50000);
      expect(po.status).toBe('draft');
    });

    it('calculates totalAmount with tax and shipping', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-002',
        type: 'standard',
        amount: 10000,
        taxAmount: 800,
        shippingAmount: 200,
      });

      expect(po.totalAmount).toBe(11000);
    });

    it('rejects duplicate PO numbers', async () => {
      await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
      });

      await expect(
        service.createPurchaseOrder({
          vendorId: 'vendor-2',
          poNumber: 'PO-001',
          type: 'blanket',
          amount: 30000,
        }),
      ).rejects.toThrow('already exists');
    });

    it('creates blanket and service PO types', async () => {
      const blanket = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-B001',
        type: 'blanket',
        amount: 100000,
      });
      expect(blanket.type).toBe('blanket');

      const svc = await service.createPurchaseOrder({
        vendorId: 'vendor-2',
        poNumber: 'PO-S001',
        type: 'service',
        amount: 25000,
      });
      expect(svc.type).toBe('service');
    });

    it('updates a purchase order and recalculates total', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
      });

      const updated = await service.updatePurchaseOrder(po.id, {
        taxAmount: 500,
        shippingAmount: 100,
      });

      expect(updated.taxAmount).toBe(500);
      expect(updated.shippingAmount).toBe(100);
      expect(updated.totalAmount).toBe(50600);
    });

    it('filters purchase orders by vendor and status', async () => {
      await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
      });
      await service.createPurchaseOrder({
        vendorId: 'vendor-2',
        poNumber: 'PO-002',
        type: 'blanket',
        amount: 30000,
      });

      const vendor1POs = await service.getPurchaseOrders({ vendorId: 'vendor-1' });
      expect(vendor1POs).toHaveLength(1);
      expect(vendor1POs[0].poNumber).toBe('PO-001');

      const draftPOs = await service.getPurchaseOrders({ status: 'draft' });
      expect(draftPOs).toHaveLength(2);
    });

    it('deletes a draft purchase order', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
      });

      await service.deletePurchaseOrder(po.id);

      const result = await service.getPurchaseOrder(po.id);
      expect(result).toBeNull();
    });

    it('refuses to delete a non-draft PO', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
      });

      await service.submitForApproval(po.id);

      await expect(
        service.deletePurchaseOrder(po.id),
      ).rejects.toThrow('Cannot delete');
    });
  });

  // ==========================================================================
  // PO Line Management
  // ==========================================================================

  describe('PO Line Management', () => {
    let poId: string;

    beforeEach(async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 0,
      });
      poId = po.id;
    });

    it('adds a line and recalculates PO amount', async () => {
      await service.addPOLine({
        purchaseOrderId: poId,
        description: 'Concrete - 3000 PSI',
        quantity: 100,
        unitCost: 125,
      });

      const po = await service.getPurchaseOrder(poId);
      expect(po!.amount).toBe(12500);
      expect(po!.totalAmount).toBe(12500);
    });

    it('adds multiple lines and recalculates', async () => {
      await service.addPOLine({
        purchaseOrderId: poId,
        description: 'Concrete - 3000 PSI',
        quantity: 100,
        unitCost: 125,
      });

      await service.addPOLine({
        purchaseOrderId: poId,
        description: 'Rebar #5',
        quantity: 200,
        unitCost: 15.50,
      });

      const po = await service.getPurchaseOrder(poId);
      expect(po!.amount).toBe(15600); // 12500 + 3100
    });

    it('auto-assigns line numbers', async () => {
      const line1 = await service.addPOLine({
        purchaseOrderId: poId,
        description: 'Line A',
        quantity: 10,
        unitCost: 100,
      });
      const line2 = await service.addPOLine({
        purchaseOrderId: poId,
        description: 'Line B',
        quantity: 20,
        unitCost: 50,
      });

      expect(line1.lineNumber).toBe(1);
      expect(line2.lineNumber).toBe(2);
    });

    it('initializes receivedQuantity and invoicedQuantity to zero', async () => {
      const line = await service.addPOLine({
        purchaseOrderId: poId,
        description: 'Concrete',
        quantity: 100,
        unitCost: 125,
      });

      expect(line.receivedQuantity).toBe(0);
      expect(line.invoicedQuantity).toBe(0);
    });

    it('updates a PO line and recalculates', async () => {
      const line = await service.addPOLine({
        purchaseOrderId: poId,
        description: 'Concrete',
        quantity: 100,
        unitCost: 125,
      });

      const updated = await service.updatePOLine(line.id, {
        quantity: 200,
      });

      expect(updated.amount).toBe(25000); // 200 * 125
      const po = await service.getPurchaseOrder(poId);
      expect(po!.amount).toBe(25000);
    });

    it('deletes a PO line and recalculates', async () => {
      const line1 = await service.addPOLine({
        purchaseOrderId: poId,
        description: 'Line A',
        quantity: 10,
        unitCost: 100,
      });
      await service.addPOLine({
        purchaseOrderId: poId,
        description: 'Line B',
        quantity: 20,
        unitCost: 50,
      });

      await service.deletePOLine(line1.id);

      const po = await service.getPurchaseOrder(poId);
      expect(po!.amount).toBe(1000); // Only line B: 20 * 50
    });
  });

  // ==========================================================================
  // PO Approval Workflow
  // ==========================================================================

  describe('PO Approval Workflow', () => {
    it('submits a draft PO for approval', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
      });

      const submitted = await service.submitForApproval(po.id);
      expect(submitted.status).toBe('pending_approval');
    });

    it('rejects submission of non-draft PO', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
      });
      await service.submitForApproval(po.id);

      await expect(
        service.submitForApproval(po.id),
      ).rejects.toThrow('must be in "draft" status');
    });

    it('approves a pending_approval PO', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
      });
      await service.submitForApproval(po.id);

      const approved = await service.approvePurchaseOrder(po.id, 'John PM');
      expect(approved.status).toBe('approved');
      expect(approved.approvedBy).toBe('John PM');
      expect(approved.approvedAt).toBeTruthy();
      expect(approved.issuedDate).toBeTruthy();
    });

    it('rejects approval of non-pending PO', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
      });

      await expect(
        service.approvePurchaseOrder(po.id, 'Admin'),
      ).rejects.toThrow('must be in "pending_approval" status');
    });

    it('cancels a draft PO', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
      });

      const cancelled = await service.cancelPurchaseOrder(po.id);
      expect(cancelled.status).toBe('cancelled');
    });

    it('closes a received PO', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
        status: 'approved',
      });

      // Add a line and create a complete receipt
      const line = await service.addPOLine({
        purchaseOrderId: po.id,
        description: 'Materials',
        quantity: 10,
        unitCost: 100,
      });

      await service.createReceipt({
        purchaseOrderId: po.id,
        receiptNumber: 'RCV-001',
        receivedDate: '2026-02-01',
        receivedBy: 'Warehouse',
        lines: [{ poLineId: line.id, quantity: 10 }],
      });

      // PO should now be 'received'
      const receivedPO = await service.getPurchaseOrder(po.id);
      expect(receivedPO!.status).toBe('received');

      const closed = await service.closePurchaseOrder(po.id);
      expect(closed.status).toBe('closed');
    });
  });

  // ==========================================================================
  // Receipt Tracking
  // ==========================================================================

  describe('Receipt Tracking', () => {
    let poId: string;
    let lineId: string;

    beforeEach(async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 0,
        status: 'approved',
      });
      poId = po.id;

      const line = await service.addPOLine({
        purchaseOrderId: poId,
        description: 'Concrete',
        quantity: 100,
        unitCost: 125,
      });
      lineId = line.id;
    });

    it('creates a partial receipt', async () => {
      const receipt = await service.createReceipt({
        purchaseOrderId: poId,
        receiptNumber: 'RCV-001',
        receivedDate: '2026-02-01',
        receivedBy: 'Site Manager',
        lines: [{ poLineId: lineId, quantity: 50 }],
      });

      expect(receipt.status).toBe('partial');
      expect(receipt.receiptNumber).toBe('RCV-001');

      const po = await service.getPurchaseOrder(poId);
      expect(po!.status).toBe('partial_receipt');

      const line = await service.getPOLine(lineId);
      expect(line!.receivedQuantity).toBe(50);
    });

    it('creates a complete receipt', async () => {
      const receipt = await service.createReceipt({
        purchaseOrderId: poId,
        receiptNumber: 'RCV-001',
        receivedDate: '2026-02-01',
        lines: [{ poLineId: lineId, quantity: 100 }],
      });

      expect(receipt.status).toBe('complete');

      const po = await service.getPurchaseOrder(poId);
      expect(po!.status).toBe('received');

      const line = await service.getPOLine(lineId);
      expect(line!.receivedQuantity).toBe(100);
    });

    it('rejects over-receiving', async () => {
      await expect(
        service.createReceipt({
          purchaseOrderId: poId,
          receiptNumber: 'RCV-001',
          receivedDate: '2026-02-01',
          lines: [{ poLineId: lineId, quantity: 150 }],
        }),
      ).rejects.toThrow('exceed ordered quantity');
    });

    it('rejects duplicate receipt numbers', async () => {
      await service.createReceipt({
        purchaseOrderId: poId,
        receiptNumber: 'RCV-001',
        receivedDate: '2026-02-01',
        lines: [{ poLineId: lineId, quantity: 50 }],
      });

      await expect(
        service.createReceipt({
          purchaseOrderId: poId,
          receiptNumber: 'RCV-001',
          receivedDate: '2026-02-02',
          lines: [{ poLineId: lineId, quantity: 25 }],
        }),
      ).rejects.toThrow('already exists');
    });

    it('tracks receipt lines with condition', async () => {
      const receipt = await service.createReceipt({
        purchaseOrderId: poId,
        receiptNumber: 'RCV-001',
        receivedDate: '2026-02-01',
        lines: [{ poLineId: lineId, quantity: 50, condition: 'damaged' }],
      });

      const lines = await service.getReceiptLines(receipt.id);
      expect(lines).toHaveLength(1);
      expect(lines[0].condition).toBe('damaged');
      expect(lines[0].quantity).toBe(50);
    });
  });

  // ==========================================================================
  // Amendment / Change Order Management
  // ==========================================================================

  describe('Amendment Management', () => {
    let poId: string;

    beforeEach(async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
        status: 'approved',
      });
      poId = po.id;
    });

    it('creates an amendment with auto-assigned number', async () => {
      const amendment = await service.createAmendment({
        purchaseOrderId: poId,
        amountChange: 5000,
        description: 'Additional materials',
        reason: 'Scope increase',
      });

      expect(amendment.amendmentNumber).toBe(1);
      expect(amendment.amountChange).toBe(5000);
      expect(amendment.newTotal).toBe(55000);
      expect(amendment.status).toBe('pending');
    });

    it('auto-increments amendment numbers', async () => {
      const a1 = await service.createAmendment({
        purchaseOrderId: poId,
        amountChange: 5000,
      });
      const a2 = await service.createAmendment({
        purchaseOrderId: poId,
        amountChange: 3000,
      });

      expect(a1.amendmentNumber).toBe(1);
      expect(a2.amendmentNumber).toBe(2);
    });

    it('approves an amendment and updates PO amount', async () => {
      const amendment = await service.createAmendment({
        purchaseOrderId: poId,
        amountChange: 10000,
      });

      const approved = await service.approveAmendment(amendment.id, 'Controller');
      expect(approved.status).toBe('approved');
      expect(approved.approvedBy).toBe('Controller');

      const po = await service.getPurchaseOrder(poId);
      expect(po!.amount).toBe(60000); // 50000 + 10000
      expect(po!.totalAmount).toBe(60000);
    });

    it('rejects an amendment', async () => {
      const amendment = await service.createAmendment({
        purchaseOrderId: poId,
        amountChange: 10000,
      });

      const rejected = await service.rejectAmendment(amendment.id);
      expect(rejected.status).toBe('rejected');

      // PO amount should remain unchanged
      const po = await service.getPurchaseOrder(poId);
      expect(po!.amount).toBe(50000);
    });

    it('rejects amendment on a non-amendable PO', async () => {
      const draftPO = await service.createPurchaseOrder({
        vendorId: 'vendor-2',
        poNumber: 'PO-002',
        type: 'standard',
        amount: 10000,
      });

      await expect(
        service.createAmendment({
          purchaseOrderId: draftPO.id,
          amountChange: 1000,
        }),
      ).rejects.toThrow('cannot be amended');
    });
  });

  // ==========================================================================
  // Three-Way Matching
  // ==========================================================================

  describe('Three-Way Matching', () => {
    it('performs three-way matching validation', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 0,
        status: 'approved',
      });

      const line = await service.addPOLine({
        purchaseOrderId: po.id,
        description: 'Concrete',
        quantity: 100,
        unitCost: 125,
      });

      // Simulate receiving all 100
      await service.createReceipt({
        purchaseOrderId: po.id,
        receiptNumber: 'RCV-001',
        receivedDate: '2026-02-01',
        lines: [{ poLineId: line.id, quantity: 100 }],
      });

      // Simulate invoicing all 100
      await service.updateInvoicedQuantity(line.id, 100);

      const results = await service.threeWayMatch(po.id);
      expect(results).toHaveLength(1);
      expect(results[0].poQuantity).toBe(100);
      expect(results[0].receivedQuantity).toBe(100);
      expect(results[0].invoicedQuantity).toBe(100);
      expect(results[0].quantityMatch).toBe(true);
      expect(results[0].amountMatch).toBe(true);
      expect(results[0].fullyMatched).toBe(true);
    });

    it('detects mismatches', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 0,
        status: 'approved',
      });

      const line = await service.addPOLine({
        purchaseOrderId: po.id,
        description: 'Concrete',
        quantity: 100,
        unitCost: 125,
      });

      // Only receive 80
      await service.createReceipt({
        purchaseOrderId: po.id,
        receiptNumber: 'RCV-001',
        receivedDate: '2026-02-01',
        lines: [{ poLineId: line.id, quantity: 80 }],
      });

      // Invoice 90
      await service.updateInvoicedQuantity(line.id, 90);

      const results = await service.threeWayMatch(po.id);
      expect(results).toHaveLength(1);
      expect(results[0].quantityMatch).toBe(false);
      expect(results[0].amountMatch).toBe(false);
      expect(results[0].fullyMatched).toBe(false);
    });
  });

  // ==========================================================================
  // Reports
  // ==========================================================================

  describe('Reports', () => {
    it('generates open PO report', async () => {
      await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
        status: 'approved',
      });

      await service.createPurchaseOrder({
        vendorId: 'vendor-2',
        poNumber: 'PO-002',
        type: 'blanket',
        amount: 30000,
        status: 'closed',
      });

      const report = await service.getOpenPOReport();
      expect(report).toHaveLength(1);
      expect(report[0].poNumber).toBe('PO-001');
      expect(report[0].amount).toBe(50000);
      expect(report[0].remainingAmount).toBe(50000);
    });

    it('generates buyout report', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 0,
        jobId: 'job-1',
        status: 'approved',
      });

      await service.addPOLine({
        purchaseOrderId: po.id,
        description: 'Concrete',
        quantity: 100,
        unitCost: 125,
        costCodeId: 'cc-03200',
      });

      const report = await service.getBuyoutReport('job-1', [
        { costCodeId: 'cc-03200', description: 'Concrete', budgetAmount: 15000 },
      ]);

      expect(report).toHaveLength(1);
      expect(report[0].costCodeId).toBe('cc-03200');
      expect(report[0].budgetAmount).toBe(15000);
      expect(report[0].committedAmount).toBe(12500);
      expect(report[0].varianceAmount).toBe(2500);
    });

    it('generates PO history', async () => {
      const po1 = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
        status: 'approved',
      });

      await service.createAmendment({
        purchaseOrderId: po1.id,
        amountChange: 5000,
      });

      await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-002',
        type: 'blanket',
        amount: 30000,
      });

      const history = await service.getPOHistory({ vendorId: 'vendor-1' });
      expect(history).toHaveLength(2);

      const po1History = history.find((h) => h.poNumber === 'PO-001');
      expect(po1History).toBeTruthy();
      expect(po1History!.amendmentCount).toBe(1);
    });

    it('generates vendor price comparison', async () => {
      const po1 = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 0,
      });
      await service.addPOLine({
        purchaseOrderId: po1.id,
        description: 'Concrete 3000 PSI',
        quantity: 100,
        unitCost: 125,
        costCodeId: 'cc-concrete',
      });

      const po2 = await service.createPurchaseOrder({
        vendorId: 'vendor-2',
        poNumber: 'PO-002',
        type: 'standard',
        amount: 0,
      });
      await service.addPOLine({
        purchaseOrderId: po2.id,
        description: 'Concrete 3000 PSI',
        quantity: 50,
        unitCost: 130,
        costCodeId: 'cc-concrete',
      });

      const comparison = await service.compareVendorPrices({ costCodeId: 'cc-concrete' });
      expect(comparison).toHaveLength(2);
      // Sorted by unitCost ascending
      expect(comparison[0].unitCost).toBe(125);
      expect(comparison[1].unitCost).toBe(130);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits po.created', async () => {
      let emitted = false;
      events.on('po.created', () => { emitted = true; });
      await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 1000,
      });
      expect(emitted).toBe(true);
    });

    it('emits po.approved', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 1000,
      });
      await service.submitForApproval(po.id);

      let emitted = false;
      events.on('po.approved', () => { emitted = true; });
      await service.approvePurchaseOrder(po.id, 'Admin');
      expect(emitted).toBe(true);
    });

    it('emits po.receipt.created', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 0,
        status: 'approved',
      });

      const line = await service.addPOLine({
        purchaseOrderId: po.id,
        description: 'Materials',
        quantity: 10,
        unitCost: 100,
      });

      let emitted = false;
      events.on('po.receipt.created', () => { emitted = true; });
      await service.createReceipt({
        purchaseOrderId: po.id,
        receiptNumber: 'RCV-001',
        receivedDate: '2026-02-01',
        lines: [{ poLineId: line.id, quantity: 10 }],
      });
      expect(emitted).toBe(true);
    });

    it('emits po.amendment.approved', async () => {
      const po = await service.createPurchaseOrder({
        vendorId: 'vendor-1',
        poNumber: 'PO-001',
        type: 'standard',
        amount: 50000,
        status: 'approved',
      });

      const amendment = await service.createAmendment({
        purchaseOrderId: po.id,
        amountChange: 5000,
      });

      let emitted = false;
      events.on('po.amendment.approved', () => { emitted = true; });
      await service.approveAmendment(amendment.id, 'Admin');
      expect(emitted).toBe(true);
    });
  });
});
