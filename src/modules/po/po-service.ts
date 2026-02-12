/**
 * Concrete -- PO (Purchase Orders & Procurement) Service
 *
 * Core service layer for the Purchase Order module. Provides purchase order
 * CRUD, PO line management, approval workflow, receipt tracking, amendment/
 * change order management, three-way matching validation, and reporting
 * (open PO report, buyout tracking, PO history).
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';
import { now } from '../../core/types/base';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type POType = 'standard' | 'blanket' | 'service';
export type POStatus = 'draft' | 'pending_approval' | 'approved' | 'partial_receipt' | 'received' | 'closed' | 'cancelled';
export type CostType = 'labor' | 'material' | 'subcontract' | 'equipment' | 'other' | 'overhead';
export type ReceiptStatus = 'partial' | 'complete';
export type ReceiptLineCondition = 'good' | 'damaged' | 'rejected';
export type AmendmentStatus = 'pending' | 'approved' | 'rejected';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface PurchaseOrder {
  [key: string]: unknown;
  vendorId: string;
  jobId?: string;
  entityId?: string;
  poNumber: string;
  type: POType;
  description?: string;
  amount: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  status: POStatus;
  terms?: string;
  shipTo?: string;
  approvedBy?: string;
  approvedAt?: string;
  issuedDate?: string;
  expectedDate?: string;
}

export interface POLine {
  [key: string]: unknown;
  purchaseOrderId: string;
  lineNumber: number;
  description: string;
  costCodeId?: string;
  costType?: CostType;
  quantity: number;
  unitCost: number;
  amount: number;
  receivedQuantity: number;
  invoicedQuantity: number;
  glAccountId?: string;
}

export interface POReceipt {
  [key: string]: unknown;
  purchaseOrderId: string;
  receiptNumber: string;
  receivedDate: string;
  receivedBy?: string;
  notes?: string;
  status: ReceiptStatus;
}

export interface POReceiptLine {
  [key: string]: unknown;
  receiptId: string;
  poLineId: string;
  quantity: number;
  description?: string;
  condition: ReceiptLineCondition;
}

export interface POAmendment {
  [key: string]: unknown;
  purchaseOrderId: string;
  amendmentNumber: number;
  description?: string;
  amountChange: number;
  newTotal: number;
  reason?: string;
  status: AmendmentStatus;
  approvedBy?: string;
  approvedAt?: string;
}

// ---------------------------------------------------------------------------
// Report Types
// ---------------------------------------------------------------------------

export interface OpenPORow {
  [key: string]: unknown;
  poId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  jobId: string;
  description: string;
  type: POType;
  status: POStatus;
  amount: number;
  totalAmount: number;
  receivedAmount: number;
  invoicedAmount: number;
  remainingAmount: number;
  issuedDate: string;
  expectedDate: string;
}

export interface BuyoutRow {
  [key: string]: unknown;
  jobId: string;
  costCodeId: string;
  description: string;
  budgetAmount: number;
  committedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  variancePct: number;
}

export interface POHistoryRow {
  [key: string]: unknown;
  poId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  jobId: string;
  type: POType;
  status: POStatus;
  amount: number;
  totalAmount: number;
  issuedDate: string;
  closedDate: string;
  amendmentCount: number;
  receiptCount: number;
}

export interface ThreeWayMatchResult {
  [key: string]: unknown;
  poLineId: string;
  poLineDescription: string;
  poQuantity: number;
  poUnitCost: number;
  poAmount: number;
  receivedQuantity: number;
  invoicedQuantity: number;
  invoicedAmount: number;
  quantityMatch: boolean;
  amountMatch: boolean;
  fullyMatched: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// POService
// ---------------------------------------------------------------------------

export class POService {
  constructor(
    private purchaseOrders: Collection<PurchaseOrder>,
    private poLines: Collection<POLine>,
    private receipts: Collection<POReceipt>,
    private receiptLines: Collection<POReceiptLine>,
    private amendments: Collection<POAmendment>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // PURCHASE ORDER CRUD
  // ========================================================================

  /**
   * Create a new purchase order.
   * Validates poNumber uniqueness. Defaults: status='draft', taxAmount=0,
   * shippingAmount=0, totalAmount=amount+taxAmount+shippingAmount.
   */
  async createPurchaseOrder(data: {
    vendorId: string;
    jobId?: string;
    entityId?: string;
    poNumber: string;
    type: POType;
    description?: string;
    amount: number;
    taxAmount?: number;
    shippingAmount?: number;
    status?: POStatus;
    terms?: string;
    shipTo?: string;
    issuedDate?: string;
    expectedDate?: string;
  }): Promise<PurchaseOrder & CollectionMeta> {
    // Validate PO number uniqueness
    const existing = await this.getPurchaseOrderByNumber(data.poNumber);
    if (existing) {
      throw new Error(`PO number "${data.poNumber}" already exists.`);
    }

    const taxAmount = data.taxAmount ?? 0;
    const shippingAmount = data.shippingAmount ?? 0;
    const totalAmount = round2(data.amount + taxAmount + shippingAmount);

    const record = await this.purchaseOrders.insert({
      vendorId: data.vendorId,
      jobId: data.jobId,
      entityId: data.entityId,
      poNumber: data.poNumber,
      type: data.type,
      description: data.description,
      amount: round2(data.amount),
      taxAmount: round2(taxAmount),
      shippingAmount: round2(shippingAmount),
      totalAmount,
      status: data.status ?? 'draft',
      terms: data.terms,
      shipTo: data.shipTo,
      issuedDate: data.issuedDate,
      expectedDate: data.expectedDate,
    } as PurchaseOrder);

    this.events.emit('po.created', { purchaseOrder: record });
    return record;
  }

  /**
   * Update an existing purchase order.
   * Recalculates totalAmount on amount/tax/shipping changes.
   */
  async updatePurchaseOrder(
    id: string,
    changes: Partial<PurchaseOrder>,
  ): Promise<PurchaseOrder & CollectionMeta> {
    const existing = await this.purchaseOrders.get(id);
    if (!existing) {
      throw new Error(`Purchase order not found: ${id}`);
    }

    // If poNumber is changing, validate uniqueness
    if (changes.poNumber && changes.poNumber !== existing.poNumber) {
      const duplicate = await this.getPurchaseOrderByNumber(changes.poNumber);
      if (duplicate) {
        throw new Error(`PO number "${changes.poNumber}" already exists.`);
      }
    }

    // Merge for recalculation
    const amount = changes.amount !== undefined ? changes.amount : existing.amount;
    const taxAmount = changes.taxAmount !== undefined ? changes.taxAmount : existing.taxAmount;
    const shippingAmount = changes.shippingAmount !== undefined ? changes.shippingAmount : existing.shippingAmount;
    const totalAmount = round2(amount + taxAmount + shippingAmount);

    const mergedChanges: Partial<PurchaseOrder> = {
      ...changes,
      totalAmount,
    };

    const updated = await this.purchaseOrders.update(id, mergedChanges as Partial<PurchaseOrder>);
    this.events.emit('po.updated', { purchaseOrder: updated });
    return updated;
  }

  /**
   * Soft-delete a purchase order.
   * Refuses deletion if the PO is not in draft or cancelled status.
   */
  async deletePurchaseOrder(id: string): Promise<void> {
    const existing = await this.purchaseOrders.get(id);
    if (!existing) {
      throw new Error(`Purchase order not found: ${id}`);
    }

    if (existing.status !== 'draft' && existing.status !== 'cancelled') {
      throw new Error(
        `Cannot delete PO "${existing.poNumber}": current status is "${existing.status}". Only draft or cancelled POs can be deleted.`,
      );
    }

    await this.purchaseOrders.remove(id);
    this.events.emit('po.deleted', { poId: id });
  }

  /**
   * Get a single purchase order by ID.
   */
  async getPurchaseOrder(id: string): Promise<(PurchaseOrder & CollectionMeta) | null> {
    return this.purchaseOrders.get(id);
  }

  /**
   * Lookup a purchase order by PO number.
   */
  async getPurchaseOrderByNumber(poNumber: string): Promise<(PurchaseOrder & CollectionMeta) | null> {
    const result = await this.purchaseOrders
      .query()
      .where('poNumber', '=', poNumber)
      .limit(1)
      .first();
    return result;
  }

  /**
   * Get purchase orders with optional filters, ordered by poNumber ascending.
   */
  async getPurchaseOrders(filters?: {
    vendorId?: string;
    jobId?: string;
    entityId?: string;
    status?: POStatus;
    type?: POType;
  }): Promise<(PurchaseOrder & CollectionMeta)[]> {
    const q = this.purchaseOrders.query();

    if (filters?.vendorId) {
      q.where('vendorId', '=', filters.vendorId);
    }
    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.type) {
      q.where('type', '=', filters.type);
    }

    q.orderBy('poNumber', 'asc');
    return q.execute();
  }

  // ========================================================================
  // PO LINE MANAGEMENT
  // ========================================================================

  /**
   * Add a line item to a purchase order.
   * After adding, recalculates the PO amount from the sum of all lines.
   */
  async addPOLine(data: {
    purchaseOrderId: string;
    lineNumber?: number;
    description: string;
    costCodeId?: string;
    costType?: CostType;
    quantity: number;
    unitCost: number;
    glAccountId?: string;
  }): Promise<POLine & CollectionMeta> {
    // Validate PO exists
    const po = await this.purchaseOrders.get(data.purchaseOrderId);
    if (!po) {
      throw new Error(`Purchase order not found: ${data.purchaseOrderId}`);
    }

    // Auto-generate line number if not provided
    let lineNumber = data.lineNumber;
    if (lineNumber === undefined) {
      const existingLines = await this.poLines
        .query()
        .where('purchaseOrderId', '=', data.purchaseOrderId)
        .execute();
      lineNumber = existingLines.length + 1;
    }

    const amount = round2(data.quantity * data.unitCost);

    const record = await this.poLines.insert({
      purchaseOrderId: data.purchaseOrderId,
      lineNumber,
      description: data.description,
      costCodeId: data.costCodeId,
      costType: data.costType,
      quantity: data.quantity,
      unitCost: round2(data.unitCost),
      amount,
      receivedQuantity: 0,
      invoicedQuantity: 0,
      glAccountId: data.glAccountId,
    } as POLine);

    // Recalculate PO amount from sum of lines
    await this.recalculatePOAmount(data.purchaseOrderId);

    return record;
  }

  /**
   * Update a PO line item.
   * Recalculates line amount and PO total after update.
   */
  async updatePOLine(
    id: string,
    changes: Partial<POLine>,
  ): Promise<POLine & CollectionMeta> {
    const existing = await this.poLines.get(id);
    if (!existing) {
      throw new Error(`PO line not found: ${id}`);
    }

    // Recalculate amount if quantity or unitCost changes
    const quantity = changes.quantity !== undefined ? changes.quantity : existing.quantity;
    const unitCost = changes.unitCost !== undefined ? changes.unitCost : existing.unitCost;
    const amount = round2(quantity * unitCost);

    const mergedChanges: Partial<POLine> = {
      ...changes,
      amount,
    };

    const updated = await this.poLines.update(id, mergedChanges as Partial<POLine>);

    // Recalculate PO amount
    await this.recalculatePOAmount(existing.purchaseOrderId);

    return updated;
  }

  /**
   * Delete a PO line item.
   * Recalculates PO amount after deletion.
   */
  async deletePOLine(id: string): Promise<void> {
    const existing = await this.poLines.get(id);
    if (!existing) {
      throw new Error(`PO line not found: ${id}`);
    }

    await this.poLines.remove(id);

    // Recalculate PO amount
    await this.recalculatePOAmount(existing.purchaseOrderId);
  }

  /**
   * Get all line items for a purchase order.
   */
  async getPOLines(
    purchaseOrderId: string,
  ): Promise<(POLine & CollectionMeta)[]> {
    return this.poLines
      .query()
      .where('purchaseOrderId', '=', purchaseOrderId)
      .orderBy('lineNumber', 'asc')
      .execute();
  }

  /**
   * Get a single PO line by ID.
   */
  async getPOLine(id: string): Promise<(POLine & CollectionMeta) | null> {
    return this.poLines.get(id);
  }

  /**
   * Recalculate PO amount from the sum of all its line items.
   */
  private async recalculatePOAmount(purchaseOrderId: string): Promise<void> {
    const lines = await this.poLines
      .query()
      .where('purchaseOrderId', '=', purchaseOrderId)
      .execute();

    const totalLineAmount = round2(lines.reduce((sum, l) => sum + (l.amount || 0), 0));

    const po = await this.purchaseOrders.get(purchaseOrderId);
    if (po) {
      const taxAmount = po.taxAmount;
      const shippingAmount = po.shippingAmount;
      const totalAmount = round2(totalLineAmount + taxAmount + shippingAmount);

      await this.purchaseOrders.update(purchaseOrderId, {
        amount: totalLineAmount,
        totalAmount,
      } as Partial<PurchaseOrder>);
    }
  }

  // ========================================================================
  // PO APPROVAL WORKFLOW
  // ========================================================================

  /**
   * Submit a PO for approval.
   * Validates the PO is in 'draft' status, then sets status='pending_approval'.
   */
  async submitForApproval(id: string): Promise<PurchaseOrder & CollectionMeta> {
    const po = await this.purchaseOrders.get(id);
    if (!po) {
      throw new Error(`Purchase order not found: ${id}`);
    }

    if (po.status !== 'draft') {
      throw new Error(
        `PO "${po.poNumber}" cannot be submitted for approval: current status is "${po.status}". PO must be in "draft" status.`,
      );
    }

    const updated = await this.purchaseOrders.update(id, {
      status: 'pending_approval',
    } as Partial<PurchaseOrder>);

    this.events.emit('po.submitted', { purchaseOrder: updated });
    return updated;
  }

  /**
   * Approve a purchase order.
   * Validates the PO is in 'pending_approval' status, then sets
   * status='approved', approvedAt, and approvedBy.
   */
  async approvePurchaseOrder(
    id: string,
    approvedBy: string,
  ): Promise<PurchaseOrder & CollectionMeta> {
    const po = await this.purchaseOrders.get(id);
    if (!po) {
      throw new Error(`Purchase order not found: ${id}`);
    }

    if (po.status !== 'pending_approval') {
      throw new Error(
        `PO "${po.poNumber}" cannot be approved: current status is "${po.status}". PO must be in "pending_approval" status.`,
      );
    }

    const updated = await this.purchaseOrders.update(id, {
      status: 'approved',
      approvedAt: now(),
      approvedBy,
      issuedDate: now().split('T')[0],
    } as Partial<PurchaseOrder>);

    this.events.emit('po.approved', { purchaseOrder: updated });
    return updated;
  }

  /**
   * Cancel a purchase order.
   * Only draft, pending_approval, or approved POs can be cancelled.
   */
  async cancelPurchaseOrder(id: string): Promise<PurchaseOrder & CollectionMeta> {
    const po = await this.purchaseOrders.get(id);
    if (!po) {
      throw new Error(`Purchase order not found: ${id}`);
    }

    const cancellableStatuses: POStatus[] = ['draft', 'pending_approval', 'approved'];
    if (!cancellableStatuses.includes(po.status)) {
      throw new Error(
        `PO "${po.poNumber}" cannot be cancelled: current status is "${po.status}".`,
      );
    }

    const updated = await this.purchaseOrders.update(id, {
      status: 'cancelled',
    } as Partial<PurchaseOrder>);

    this.events.emit('po.cancelled', { purchaseOrder: updated });
    return updated;
  }

  /**
   * Close a purchase order.
   * Only approved, partial_receipt, or received POs can be closed.
   */
  async closePurchaseOrder(id: string): Promise<PurchaseOrder & CollectionMeta> {
    const po = await this.purchaseOrders.get(id);
    if (!po) {
      throw new Error(`Purchase order not found: ${id}`);
    }

    const closableStatuses: POStatus[] = ['approved', 'partial_receipt', 'received'];
    if (!closableStatuses.includes(po.status)) {
      throw new Error(
        `PO "${po.poNumber}" cannot be closed: current status is "${po.status}".`,
      );
    }

    const updated = await this.purchaseOrders.update(id, {
      status: 'closed',
    } as Partial<PurchaseOrder>);

    this.events.emit('po.closed', { purchaseOrder: updated });
    return updated;
  }

  // ========================================================================
  // RECEIPT TRACKING
  // ========================================================================

  /**
   * Create a receipt for a purchase order.
   * Validates PO exists and is in an appropriate status.
   * After creating receipt lines, updates PO line receivedQuantity
   * and PO status (partial_receipt or received).
   */
  async createReceipt(data: {
    purchaseOrderId: string;
    receiptNumber: string;
    receivedDate: string;
    receivedBy?: string;
    notes?: string;
    lines: {
      poLineId: string;
      quantity: number;
      description?: string;
      condition?: ReceiptLineCondition;
    }[];
  }): Promise<POReceipt & CollectionMeta> {
    // Validate PO exists
    const po = await this.purchaseOrders.get(data.purchaseOrderId);
    if (!po) {
      throw new Error(`Purchase order not found: ${data.purchaseOrderId}`);
    }

    // Validate PO is in receivable status
    const receivableStatuses: POStatus[] = ['approved', 'partial_receipt'];
    if (!receivableStatuses.includes(po.status)) {
      throw new Error(
        `PO "${po.poNumber}" cannot receive materials: current status is "${po.status}". PO must be "approved" or "partial_receipt".`,
      );
    }

    // Validate receipt number uniqueness
    const existingReceipt = await this.receipts
      .query()
      .where('receiptNumber', '=', data.receiptNumber)
      .limit(1)
      .first();
    if (existingReceipt) {
      throw new Error(`Receipt number "${data.receiptNumber}" already exists.`);
    }

    // Determine if this is a partial or complete receipt
    // First, check if all PO lines will be fully received after this receipt
    const poLines = await this.getPOLines(data.purchaseOrderId);
    let allFullyReceived = true;

    for (const poLine of poLines) {
      const receiptLineData = data.lines.find((rl) => rl.poLineId === poLine.id);
      const additionalQty = receiptLineData ? receiptLineData.quantity : 0;
      const totalReceived = poLine.receivedQuantity + additionalQty;
      if (totalReceived < poLine.quantity) {
        allFullyReceived = false;
      }
    }

    const receiptStatus: ReceiptStatus = allFullyReceived ? 'complete' : 'partial';

    // Create the receipt record
    const receipt = await this.receipts.insert({
      purchaseOrderId: data.purchaseOrderId,
      receiptNumber: data.receiptNumber,
      receivedDate: data.receivedDate,
      receivedBy: data.receivedBy,
      notes: data.notes,
      status: receiptStatus,
    } as POReceipt);

    // Create receipt lines and update PO line receivedQuantity
    for (const lineData of data.lines) {
      // Validate PO line exists and belongs to this PO
      const poLine = await this.poLines.get(lineData.poLineId);
      if (!poLine) {
        throw new Error(`PO line not found: ${lineData.poLineId}`);
      }
      if (poLine.purchaseOrderId !== data.purchaseOrderId) {
        throw new Error(`PO line "${lineData.poLineId}" does not belong to PO "${data.purchaseOrderId}".`);
      }

      // Validate not over-receiving
      const newReceivedQty = poLine.receivedQuantity + lineData.quantity;
      if (newReceivedQty > poLine.quantity) {
        throw new Error(
          `Cannot receive ${lineData.quantity} for PO line ${poLine.lineNumber}: would exceed ordered quantity of ${poLine.quantity} (already received ${poLine.receivedQuantity}).`,
        );
      }

      // Create receipt line
      await this.receiptLines.insert({
        receiptId: receipt.id,
        poLineId: lineData.poLineId,
        quantity: lineData.quantity,
        description: lineData.description,
        condition: lineData.condition ?? 'good',
      } as POReceiptLine);

      // Update PO line received quantity
      await this.poLines.update(lineData.poLineId, {
        receivedQuantity: round2(newReceivedQty),
      } as Partial<POLine>);
    }

    // Update PO status based on receipt completeness
    const newPoStatus: POStatus = allFullyReceived ? 'received' : 'partial_receipt';
    await this.purchaseOrders.update(data.purchaseOrderId, {
      status: newPoStatus,
    } as Partial<PurchaseOrder>);

    this.events.emit('po.receipt.created', { receipt, purchaseOrderId: data.purchaseOrderId });
    return receipt;
  }

  /**
   * Get a single receipt by ID.
   */
  async getReceipt(id: string): Promise<(POReceipt & CollectionMeta) | null> {
    return this.receipts.get(id);
  }

  /**
   * Get receipts for a purchase order.
   */
  async getReceipts(purchaseOrderId: string): Promise<(POReceipt & CollectionMeta)[]> {
    return this.receipts
      .query()
      .where('purchaseOrderId', '=', purchaseOrderId)
      .orderBy('receivedDate', 'desc')
      .execute();
  }

  /**
   * Get receipt lines for a receipt.
   */
  async getReceiptLines(receiptId: string): Promise<(POReceiptLine & CollectionMeta)[]> {
    return this.receiptLines
      .query()
      .where('receiptId', '=', receiptId)
      .execute();
  }

  // ========================================================================
  // AMENDMENT / CHANGE ORDER MANAGEMENT
  // ========================================================================

  /**
   * Create an amendment (change order) for a purchase order.
   * Auto-assigns amendment number. Defaults: status='pending'.
   */
  async createAmendment(data: {
    purchaseOrderId: string;
    description?: string;
    amountChange: number;
    reason?: string;
  }): Promise<POAmendment & CollectionMeta> {
    // Validate PO exists
    const po = await this.purchaseOrders.get(data.purchaseOrderId);
    if (!po) {
      throw new Error(`Purchase order not found: ${data.purchaseOrderId}`);
    }

    // Only approved or partial_receipt POs can have amendments
    const amendableStatuses: POStatus[] = ['approved', 'partial_receipt'];
    if (!amendableStatuses.includes(po.status)) {
      throw new Error(
        `PO "${po.poNumber}" cannot be amended: current status is "${po.status}". PO must be "approved" or "partial_receipt".`,
      );
    }

    // Auto-assign amendment number
    const existingAmendments = await this.amendments
      .query()
      .where('purchaseOrderId', '=', data.purchaseOrderId)
      .execute();
    const amendmentNumber = existingAmendments.length + 1;

    const newTotal = round2(po.amount + data.amountChange);

    const record = await this.amendments.insert({
      purchaseOrderId: data.purchaseOrderId,
      amendmentNumber,
      description: data.description,
      amountChange: round2(data.amountChange),
      newTotal,
      reason: data.reason,
      status: 'pending',
    } as POAmendment);

    this.events.emit('po.amendment.created', { amendment: record });
    return record;
  }

  /**
   * Approve an amendment.
   * Updates the PO amount to reflect the amendment.
   */
  async approveAmendment(
    id: string,
    approvedBy: string,
  ): Promise<POAmendment & CollectionMeta> {
    const amendment = await this.amendments.get(id);
    if (!amendment) {
      throw new Error(`Amendment not found: ${id}`);
    }

    if (amendment.status !== 'pending') {
      throw new Error(
        `Amendment #${amendment.amendmentNumber} cannot be approved: current status is "${amendment.status}".`,
      );
    }

    const updated = await this.amendments.update(id, {
      status: 'approved',
      approvedBy,
      approvedAt: now(),
    } as Partial<POAmendment>);

    // Update the PO amount
    const po = await this.purchaseOrders.get(amendment.purchaseOrderId);
    if (po) {
      const newAmount = round2(po.amount + amendment.amountChange);
      const newTotalAmount = round2(newAmount + po.taxAmount + po.shippingAmount);
      await this.purchaseOrders.update(amendment.purchaseOrderId, {
        amount: newAmount,
        totalAmount: newTotalAmount,
      } as Partial<PurchaseOrder>);
    }

    this.events.emit('po.amendment.approved', { amendment: updated });
    return updated;
  }

  /**
   * Reject an amendment.
   */
  async rejectAmendment(id: string): Promise<POAmendment & CollectionMeta> {
    const amendment = await this.amendments.get(id);
    if (!amendment) {
      throw new Error(`Amendment not found: ${id}`);
    }

    if (amendment.status !== 'pending') {
      throw new Error(
        `Amendment #${amendment.amendmentNumber} cannot be rejected: current status is "${amendment.status}".`,
      );
    }

    const updated = await this.amendments.update(id, {
      status: 'rejected',
    } as Partial<POAmendment>);

    this.events.emit('po.amendment.rejected', { amendment: updated });
    return updated;
  }

  /**
   * Get amendments for a purchase order.
   */
  async getAmendments(purchaseOrderId: string): Promise<(POAmendment & CollectionMeta)[]> {
    return this.amendments
      .query()
      .where('purchaseOrderId', '=', purchaseOrderId)
      .orderBy('amendmentNumber', 'asc')
      .execute();
  }

  /**
   * Get a single amendment by ID.
   */
  async getAmendment(id: string): Promise<(POAmendment & CollectionMeta) | null> {
    return this.amendments.get(id);
  }

  // ========================================================================
  // THREE-WAY MATCHING
  // ========================================================================

  /**
   * Perform three-way matching validation for a purchase order.
   * Compares PO line amounts vs received quantities vs invoiced quantities.
   * Returns a detailed match result for each PO line.
   */
  async threeWayMatch(purchaseOrderId: string): Promise<ThreeWayMatchResult[]> {
    const po = await this.purchaseOrders.get(purchaseOrderId);
    if (!po) {
      throw new Error(`Purchase order not found: ${purchaseOrderId}`);
    }

    const lines = await this.getPOLines(purchaseOrderId);
    const results: ThreeWayMatchResult[] = [];

    for (const line of lines) {
      const invoicedAmount = round2(line.invoicedQuantity * line.unitCost);

      const quantityMatch = line.receivedQuantity === line.quantity;
      const amountMatch = line.invoicedQuantity === line.quantity;
      const fullyMatched = quantityMatch && amountMatch;

      results.push({
        poLineId: line.id,
        poLineDescription: line.description,
        poQuantity: line.quantity,
        poUnitCost: line.unitCost,
        poAmount: line.amount,
        receivedQuantity: line.receivedQuantity,
        invoicedQuantity: line.invoicedQuantity,
        invoicedAmount,
        quantityMatch,
        amountMatch,
        fullyMatched,
      });
    }

    return results;
  }

  /**
   * Update the invoiced quantity on a PO line.
   * Called when an AP invoice is matched to a PO line.
   */
  async updateInvoicedQuantity(
    poLineId: string,
    invoicedQuantity: number,
  ): Promise<POLine & CollectionMeta> {
    const line = await this.poLines.get(poLineId);
    if (!line) {
      throw new Error(`PO line not found: ${poLineId}`);
    }

    const updated = await this.poLines.update(poLineId, {
      invoicedQuantity: round2(invoicedQuantity),
    } as Partial<POLine>);

    return updated;
  }

  // ========================================================================
  // REPORTS
  // ========================================================================

  /**
   * Get open PO report.
   * Returns all POs that are not closed or cancelled, with remaining amounts.
   */
  async getOpenPOReport(filters?: {
    vendorId?: string;
    jobId?: string;
    entityId?: string;
  }): Promise<OpenPORow[]> {
    const q = this.purchaseOrders.query();

    if (filters?.vendorId) {
      q.where('vendorId', '=', filters.vendorId);
    }
    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }

    const allPOs = await q.execute();

    // Filter to open POs (not closed or cancelled)
    const openPOs = allPOs.filter(
      (po) => po.status !== 'closed' && po.status !== 'cancelled',
    );

    const rows: OpenPORow[] = [];

    for (const po of openPOs) {
      const lines = await this.getPOLines(po.id);

      let receivedAmount = 0;
      let invoicedAmount = 0;

      for (const line of lines) {
        receivedAmount = round2(receivedAmount + round2(line.receivedQuantity * line.unitCost));
        invoicedAmount = round2(invoicedAmount + round2(line.invoicedQuantity * line.unitCost));
      }

      const remainingAmount = round2(po.amount - receivedAmount);

      rows.push({
        poId: po.id,
        poNumber: po.poNumber,
        vendorId: po.vendorId,
        vendorName: '', // Will be populated by caller or view
        jobId: po.jobId ?? '',
        description: po.description ?? '',
        type: po.type,
        status: po.status,
        amount: po.amount,
        totalAmount: po.totalAmount,
        receivedAmount,
        invoicedAmount,
        remainingAmount,
        issuedDate: po.issuedDate ?? '',
        expectedDate: po.expectedDate ?? '',
      });
    }

    // Sort by PO number
    rows.sort((a, b) => a.poNumber.localeCompare(b.poNumber));

    return rows;
  }

  /**
   * Get buyout tracking report.
   * Compares budget vs committed (PO) vs actual (invoiced) amounts by job and cost code.
   * Budget amounts should be provided externally; this method computes committed and actual.
   */
  async getBuyoutReport(
    jobId: string,
    budgetData?: { costCodeId: string; description: string; budgetAmount: number }[],
  ): Promise<BuyoutRow[]> {
    // Get all POs for this job
    const pos = await this.purchaseOrders
      .query()
      .where('jobId', '=', jobId)
      .execute();

    // Filter to non-cancelled POs
    const activePOs = pos.filter((po) => po.status !== 'cancelled');

    // Aggregate committed and actual by cost code
    const costCodeMap = new Map<string, { committed: number; actual: number }>();

    for (const po of activePOs) {
      const lines = await this.getPOLines(po.id);
      for (const line of lines) {
        const ccId = line.costCodeId ?? 'unassigned';
        if (!costCodeMap.has(ccId)) {
          costCodeMap.set(ccId, { committed: 0, actual: 0 });
        }
        const entry = costCodeMap.get(ccId)!;
        entry.committed = round2(entry.committed + line.amount);
        entry.actual = round2(entry.actual + round2(line.invoicedQuantity * line.unitCost));
      }
    }

    const rows: BuyoutRow[] = [];

    // Build rows from budget data if provided
    if (budgetData && budgetData.length > 0) {
      for (const budget of budgetData) {
        const aggregated = costCodeMap.get(budget.costCodeId) ?? { committed: 0, actual: 0 };
        const varianceAmount = round2(budget.budgetAmount - aggregated.committed);
        const variancePct = budget.budgetAmount !== 0
          ? round2((varianceAmount / budget.budgetAmount) * 100)
          : 0;

        rows.push({
          jobId,
          costCodeId: budget.costCodeId,
          description: budget.description,
          budgetAmount: budget.budgetAmount,
          committedAmount: aggregated.committed,
          actualAmount: aggregated.actual,
          varianceAmount,
          variancePct,
        });

        // Remove from map so we can catch unbudgeted items
        costCodeMap.delete(budget.costCodeId);
      }
    }

    // Add any remaining cost codes not in budget
    for (const [costCodeId, aggregated] of costCodeMap) {
      const varianceAmount = round2(0 - aggregated.committed);
      rows.push({
        jobId,
        costCodeId,
        description: costCodeId === 'unassigned' ? 'Unassigned' : costCodeId,
        budgetAmount: 0,
        committedAmount: aggregated.committed,
        actualAmount: aggregated.actual,
        varianceAmount,
        variancePct: 0,
      });
    }

    return rows;
  }

  /**
   * Get PO history by vendor and/or job.
   * Returns all POs matching the filters with amendment and receipt counts.
   */
  async getPOHistory(filters?: {
    vendorId?: string;
    jobId?: string;
  }): Promise<POHistoryRow[]> {
    const q = this.purchaseOrders.query();

    if (filters?.vendorId) {
      q.where('vendorId', '=', filters.vendorId);
    }
    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }

    q.orderBy('poNumber', 'desc');
    const pos = await q.execute();

    const rows: POHistoryRow[] = [];

    for (const po of pos) {
      const amendmentList = await this.amendments
        .query()
        .where('purchaseOrderId', '=', po.id)
        .execute();

      const receiptList = await this.receipts
        .query()
        .where('purchaseOrderId', '=', po.id)
        .execute();

      rows.push({
        poId: po.id,
        poNumber: po.poNumber,
        vendorId: po.vendorId,
        vendorName: '', // Will be populated by caller or view
        jobId: po.jobId ?? '',
        type: po.type,
        status: po.status,
        amount: po.amount,
        totalAmount: po.totalAmount,
        issuedDate: po.issuedDate ?? '',
        closedDate: po.status === 'closed' ? (po.updatedAt as string) : '',
        amendmentCount: amendmentList.length,
        receiptCount: receiptList.length,
      });
    }

    return rows;
  }

  // ========================================================================
  // VENDOR PRICE COMPARISON
  // ========================================================================

  /**
   * Compare vendor prices for a given cost code or description.
   * Returns PO line data grouped by vendor showing unit costs.
   */
  async compareVendorPrices(filters: {
    costCodeId?: string;
    description?: string;
  }): Promise<{
    vendorId: string;
    poNumber: string;
    description: string;
    quantity: number;
    unitCost: number;
    amount: number;
    date: string;
  }[]> {
    const allLines = await this.poLines.query().execute();

    let filteredLines = allLines;

    if (filters.costCodeId) {
      filteredLines = filteredLines.filter((l) => l.costCodeId === filters.costCodeId);
    }
    if (filters.description) {
      const searchTerm = filters.description.toLowerCase();
      filteredLines = filteredLines.filter(
        (l) => (l.description || '').toLowerCase().includes(searchTerm),
      );
    }

    const results: {
      vendorId: string;
      poNumber: string;
      description: string;
      quantity: number;
      unitCost: number;
      amount: number;
      date: string;
    }[] = [];

    for (const line of filteredLines) {
      const po = await this.purchaseOrders.get(line.purchaseOrderId);
      if (po) {
        results.push({
          vendorId: po.vendorId,
          poNumber: po.poNumber,
          description: line.description,
          quantity: line.quantity,
          unitCost: line.unitCost,
          amount: line.amount,
          date: po.issuedDate ?? po.createdAt as string,
        });
      }
    }

    // Sort by unitCost ascending (cheapest first)
    results.sort((a, b) => a.unitCost - b.unitCost);

    return results;
  }
}
