/**
 * Concrete -- Change Order Service
 *
 * Core service layer for the Change Order module (Phase 19). Provides
 * PCO/COR management, change order CRUD, line item management, cost
 * impact analysis, schedule impact, multi-level approval workflow,
 * change order execution/voiding, activity log, trend reporting,
 * job summary, and subcontractor flow-down.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type CORequestSource = 'owner' | 'subcontractor' | 'internal' | 'field';
export type CORequestStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'withdrawn';
export type COType = 'owner' | 'subcontractor' | 'internal';
export type COStatus = 'draft' | 'pending_approval' | 'approved' | 'executed' | 'rejected' | 'voided';
export type COLineCostType = 'labor' | 'material' | 'subcontract' | 'equipment' | 'overhead' | 'other';
export type COApprovalStatus = 'pending' | 'approved' | 'rejected';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface ChangeOrderRequest {
  [key: string]: unknown;
  jobId: string;
  number: string;
  title: string;
  description?: string;
  requestedBy?: string;
  requestDate?: string;
  source: CORequestSource;
  status: CORequestStatus;
  estimatedAmount: number;
  scheduleImpactDays: number;
  entityId?: string;
}

export interface ChangeOrder {
  [key: string]: unknown;
  jobId: string;
  requestId?: string;
  number: string;
  title: string;
  description?: string;
  type: COType;
  status: COStatus;
  amount: number;
  approvedAmount: number;
  scheduleExtensionDays: number;
  effectiveDate?: string;
  executedDate?: string;
  scopeDescription?: string;
  entityId?: string;
}

export interface ChangeOrderLine {
  [key: string]: unknown;
  changeOrderId: string;
  costType: COLineCostType;
  description?: string;
  quantity: number;
  unitCost: number;
  amount: number;
  markup: number;
  markupPct: number;
  totalWithMarkup: number;
}

export interface ChangeOrderApproval {
  [key: string]: unknown;
  changeOrderId: string;
  approverId: string;
  approverRole?: string;
  status: COApprovalStatus;
  comments?: string;
  date?: string;
  sequence: number;
}

export interface ChangeOrderLog {
  [key: string]: unknown;
  jobId?: string;
  changeOrderId?: string;
  action: string;
  performedBy?: string;
  date: string;
  previousStatus?: string;
  newStatus?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Report Types
// ---------------------------------------------------------------------------

export interface CostImpact {
  labor: number;
  material: number;
  subcontract: number;
  equipment: number;
  overhead: number;
  other: number;
  subtotal: number;
  markup: number;
  total: number;
}

export interface ChangeOrderTrendPeriod {
  period: string;
  count: number;
  totalAmount: number;
  approvedAmount: number;
}

export interface JobChangeOrderSummary {
  jobId: string;
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  totalExecuted: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  netCostImpact: number;
  totalScheduleExtensionDays: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Get current ISO date string. */
function currentDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// ChangeOrderService
// ---------------------------------------------------------------------------

export class ChangeOrderService {
  constructor(
    private requests: Collection<ChangeOrderRequest>,
    private changeOrders: Collection<ChangeOrder>,
    private lines: Collection<ChangeOrderLine>,
    private approvals: Collection<ChangeOrderApproval>,
    private logs: Collection<ChangeOrderLog>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // PCO/COR REQUEST MANAGEMENT
  // ========================================================================

  /**
   * Create a new change order request (PCO/COR).
   * Defaults: status='draft', estimatedAmount=0, scheduleImpactDays=0.
   */
  async createRequest(data: {
    jobId: string;
    number: string;
    title: string;
    description?: string;
    requestedBy?: string;
    requestDate?: string;
    source: CORequestSource;
    status?: CORequestStatus;
    estimatedAmount?: number;
    scheduleImpactDays?: number;
    entityId?: string;
  }): Promise<ChangeOrderRequest & CollectionMeta> {
    const record = await this.requests.insert({
      jobId: data.jobId,
      number: data.number,
      title: data.title,
      description: data.description,
      requestedBy: data.requestedBy,
      requestDate: data.requestDate ?? currentDate(),
      source: data.source,
      status: data.status ?? 'draft',
      estimatedAmount: round2(data.estimatedAmount ?? 0),
      scheduleImpactDays: data.scheduleImpactDays ?? 0,
      entityId: data.entityId,
    } as ChangeOrderRequest);

    await this.addLogEntry({
      jobId: data.jobId,
      action: 'request_created',
      performedBy: data.requestedBy,
      newStatus: record.status,
      notes: `PCO/COR "${data.title}" created`,
    });

    this.events.emit('co.request.created', { request: record });
    return record;
  }

  /**
   * Update an existing change order request.
   */
  async updateRequest(
    id: string,
    changes: Partial<ChangeOrderRequest>,
  ): Promise<ChangeOrderRequest & CollectionMeta> {
    const existing = await this.requests.get(id);
    if (!existing) {
      throw new Error(`Change order request not found: ${id}`);
    }

    const updated = await this.requests.update(id, changes as Partial<ChangeOrderRequest>);
    return updated;
  }

  /**
   * Submit a request for review. Transitions from 'draft' to 'pending'.
   */
  async submitRequest(id: string, submittedBy?: string): Promise<ChangeOrderRequest & CollectionMeta> {
    const existing = await this.requests.get(id);
    if (!existing) {
      throw new Error(`Change order request not found: ${id}`);
    }

    if (existing.status !== 'draft') {
      throw new Error(
        `Request "${existing.number}" cannot be submitted: current status is "${existing.status}". Must be in "draft" status.`,
      );
    }

    const updated = await this.requests.update(id, {
      status: 'pending',
    } as Partial<ChangeOrderRequest>);

    await this.addLogEntry({
      jobId: existing.jobId,
      action: 'request_submitted',
      performedBy: submittedBy,
      previousStatus: 'draft',
      newStatus: 'pending',
      notes: `PCO/COR "${existing.number}" submitted for review`,
    });

    this.events.emit('co.request.submitted', { request: updated });
    return updated;
  }

  /**
   * Withdraw a request. Transitions to 'withdrawn' from any non-approved status.
   */
  async withdrawRequest(id: string, reason?: string): Promise<ChangeOrderRequest & CollectionMeta> {
    const existing = await this.requests.get(id);
    if (!existing) {
      throw new Error(`Change order request not found: ${id}`);
    }

    if (existing.status === 'approved') {
      throw new Error(
        `Request "${existing.number}" cannot be withdrawn: it has already been approved.`,
      );
    }

    if (existing.status === 'withdrawn') {
      throw new Error(
        `Request "${existing.number}" is already withdrawn.`,
      );
    }

    const previousStatus = existing.status;
    const updated = await this.requests.update(id, {
      status: 'withdrawn',
    } as Partial<ChangeOrderRequest>);

    await this.addLogEntry({
      jobId: existing.jobId,
      action: 'request_withdrawn',
      previousStatus,
      newStatus: 'withdrawn',
      notes: reason ?? `PCO/COR "${existing.number}" withdrawn`,
    });

    return updated;
  }

  /**
   * List all change order requests with optional filters.
   */
  async listRequests(filters?: {
    jobId?: string;
    status?: CORequestStatus;
    source?: CORequestSource;
  }): Promise<(ChangeOrderRequest & CollectionMeta)[]> {
    const q = this.requests.query();

    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.source) {
      q.where('source', '=', filters.source);
    }

    q.orderBy('requestDate', 'desc');
    return q.execute();
  }

  /**
   * Get all requests for a specific job.
   */
  async getRequestsByJob(jobId: string): Promise<(ChangeOrderRequest & CollectionMeta)[]> {
    return this.listRequests({ jobId });
  }

  /**
   * Get a single request by ID.
   */
  async getRequest(id: string): Promise<(ChangeOrderRequest & CollectionMeta) | null> {
    return this.requests.get(id);
  }

  // ========================================================================
  // CHANGE ORDER CRUD
  // ========================================================================

  /**
   * Create a new change order, optionally from a request.
   * Defaults: status='draft', amount=0, approvedAmount=0, scheduleExtensionDays=0.
   */
  async createChangeOrder(data: {
    jobId: string;
    requestId?: string;
    number: string;
    title: string;
    description?: string;
    type: COType;
    status?: COStatus;
    amount?: number;
    approvedAmount?: number;
    scheduleExtensionDays?: number;
    effectiveDate?: string;
    scopeDescription?: string;
    entityId?: string;
  }): Promise<ChangeOrder & CollectionMeta> {
    // If creating from a request, validate it exists
    if (data.requestId) {
      const request = await this.requests.get(data.requestId);
      if (!request) {
        throw new Error(`Change order request not found: ${data.requestId}`);
      }
    }

    const record = await this.changeOrders.insert({
      jobId: data.jobId,
      requestId: data.requestId,
      number: data.number,
      title: data.title,
      description: data.description,
      type: data.type,
      status: data.status ?? 'draft',
      amount: round2(data.amount ?? 0),
      approvedAmount: round2(data.approvedAmount ?? 0),
      scheduleExtensionDays: data.scheduleExtensionDays ?? 0,
      effectiveDate: data.effectiveDate,
      scopeDescription: data.scopeDescription,
      entityId: data.entityId,
    } as ChangeOrder);

    await this.addLogEntry({
      jobId: data.jobId,
      changeOrderId: record.id,
      action: 'co_created',
      newStatus: record.status,
      notes: `Change order "${data.number}" created`,
    });

    this.events.emit('co.created', { changeOrder: record });
    return record;
  }

  /**
   * Update an existing change order.
   */
  async updateChangeOrder(
    id: string,
    changes: Partial<ChangeOrder>,
  ): Promise<ChangeOrder & CollectionMeta> {
    const existing = await this.changeOrders.get(id);
    if (!existing) {
      throw new Error(`Change order not found: ${id}`);
    }

    if (existing.status === 'executed') {
      throw new Error(
        `Change order "${existing.number}" cannot be updated: it has been executed.`,
      );
    }

    if (existing.status === 'voided') {
      throw new Error(
        `Change order "${existing.number}" cannot be updated: it has been voided.`,
      );
    }

    const updated = await this.changeOrders.update(id, changes as Partial<ChangeOrder>);
    return updated;
  }

  /**
   * List change orders with optional filters.
   */
  async listChangeOrders(filters?: {
    jobId?: string;
    type?: COType;
    status?: COStatus;
  }): Promise<(ChangeOrder & CollectionMeta)[]> {
    const q = this.changeOrders.query();

    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.type) {
      q.where('type', '=', filters.type);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    q.orderBy('number', 'asc');
    return q.execute();
  }

  /**
   * Get change orders for a specific job.
   */
  async getByJob(jobId: string): Promise<(ChangeOrder & CollectionMeta)[]> {
    return this.listChangeOrders({ jobId });
  }

  /**
   * Get a single change order by ID.
   */
  async getChangeOrder(id: string): Promise<(ChangeOrder & CollectionMeta) | null> {
    return this.changeOrders.get(id);
  }

  // ========================================================================
  // CHANGE ORDER LINE ITEMS
  // ========================================================================

  /**
   * Add a line item to a change order.
   * Computes markup and totalWithMarkup, then recalculates the CO amount.
   */
  async addLine(data: {
    changeOrderId: string;
    costType: COLineCostType;
    description?: string;
    quantity?: number;
    unitCost?: number;
    amount: number;
    markupPct?: number;
  }): Promise<ChangeOrderLine & CollectionMeta> {
    const co = await this.changeOrders.get(data.changeOrderId);
    if (!co) {
      throw new Error(`Change order not found: ${data.changeOrderId}`);
    }

    const amount = round2(data.amount);
    const markupPct = data.markupPct ?? 0;
    const markup = round2(amount * markupPct / 100);
    const totalWithMarkup = round2(amount + markup);

    const record = await this.lines.insert({
      changeOrderId: data.changeOrderId,
      costType: data.costType,
      description: data.description,
      quantity: data.quantity ?? 0,
      unitCost: data.unitCost ?? 0,
      amount,
      markup,
      markupPct,
      totalWithMarkup,
    } as ChangeOrderLine);

    // Recalculate CO amount from sum of all lines
    await this.recalculateCOAmount(data.changeOrderId);

    this.events.emit('co.line.added', { line: record, changeOrderId: data.changeOrderId });
    return record;
  }

  /**
   * Update a line item on a change order.
   * Recalculates markup/total, then recalculates the CO amount.
   */
  async updateLine(
    lineId: string,
    changes: Partial<Pick<ChangeOrderLine, 'costType' | 'description' | 'quantity' | 'unitCost' | 'amount' | 'markupPct'>>,
  ): Promise<ChangeOrderLine & CollectionMeta> {
    const existing = await this.lines.get(lineId);
    if (!existing) {
      throw new Error(`Change order line not found: ${lineId}`);
    }

    const amount = changes.amount !== undefined ? round2(changes.amount) : existing.amount;
    const markupPct = changes.markupPct !== undefined ? changes.markupPct : existing.markupPct;
    const markup = round2(amount * markupPct / 100);
    const totalWithMarkup = round2(amount + markup);

    const updated = await this.lines.update(lineId, {
      ...changes,
      amount,
      markup,
      markupPct,
      totalWithMarkup,
    } as Partial<ChangeOrderLine>);

    await this.recalculateCOAmount(existing.changeOrderId);

    return updated;
  }

  /**
   * Remove a line item from a change order.
   * Recalculates the CO amount after removal.
   */
  async removeLine(lineId: string): Promise<void> {
    const existing = await this.lines.get(lineId);
    if (!existing) {
      throw new Error(`Change order line not found: ${lineId}`);
    }

    const changeOrderId = existing.changeOrderId;
    await this.lines.remove(lineId);

    await this.recalculateCOAmount(changeOrderId);
  }

  /**
   * Get all line items for a change order.
   */
  async getLines(changeOrderId: string): Promise<(ChangeOrderLine & CollectionMeta)[]> {
    return this.lines
      .query()
      .where('changeOrderId', '=', changeOrderId)
      .execute();
  }

  /**
   * Recalculate CO amount from sum of line totalWithMarkup values.
   */
  private async recalculateCOAmount(changeOrderId: string): Promise<void> {
    const allLines = await this.getLines(changeOrderId);
    const totalAmount = round2(allLines.reduce((sum, l) => sum + (l.totalWithMarkup || 0), 0));

    await this.changeOrders.update(changeOrderId, {
      amount: totalAmount,
    } as Partial<ChangeOrder>);
  }

  // ========================================================================
  // COST IMPACT ANALYSIS
  // ========================================================================

  /**
   * Calculate the cost impact breakdown for a change order.
   * Groups lines by cost type and sums amounts and markups.
   */
  async calculateCostImpact(changeOrderId: string): Promise<CostImpact> {
    const allLines = await this.getLines(changeOrderId);

    const impact: CostImpact = {
      labor: 0,
      material: 0,
      subcontract: 0,
      equipment: 0,
      overhead: 0,
      other: 0,
      subtotal: 0,
      markup: 0,
      total: 0,
    };

    for (const line of allLines) {
      const amount = line.amount || 0;
      const lineMarkup = line.markup || 0;

      switch (line.costType) {
        case 'labor':
          impact.labor = round2(impact.labor + amount);
          break;
        case 'material':
          impact.material = round2(impact.material + amount);
          break;
        case 'subcontract':
          impact.subcontract = round2(impact.subcontract + amount);
          break;
        case 'equipment':
          impact.equipment = round2(impact.equipment + amount);
          break;
        case 'overhead':
          impact.overhead = round2(impact.overhead + amount);
          break;
        case 'other':
          impact.other = round2(impact.other + amount);
          break;
      }

      impact.markup = round2(impact.markup + lineMarkup);
    }

    impact.subtotal = round2(
      impact.labor + impact.material + impact.subcontract +
      impact.equipment + impact.overhead + impact.other,
    );
    impact.total = round2(impact.subtotal + impact.markup);

    return impact;
  }

  // ========================================================================
  // SCHEDULE IMPACT
  // ========================================================================

  /**
   * Set the schedule impact (time extension) for a change order.
   */
  async setScheduleImpact(
    changeOrderId: string,
    days: number,
    description?: string,
  ): Promise<ChangeOrder & CollectionMeta> {
    const co = await this.changeOrders.get(changeOrderId);
    if (!co) {
      throw new Error(`Change order not found: ${changeOrderId}`);
    }

    const updated = await this.changeOrders.update(changeOrderId, {
      scheduleExtensionDays: days,
      scopeDescription: description ?? co.scopeDescription,
    } as Partial<ChangeOrder>);

    await this.addLogEntry({
      jobId: co.jobId,
      changeOrderId,
      action: 'schedule_impact_set',
      notes: `Schedule extension set to ${days} days`,
    });

    return updated;
  }

  // ========================================================================
  // APPROVAL WORKFLOW
  // ========================================================================

  /**
   * Submit a change order for approval.
   * Transitions from 'draft' to 'pending_approval'.
   */
  async submitForApproval(
    changeOrderId: string,
    submittedBy?: string,
  ): Promise<ChangeOrder & CollectionMeta> {
    const co = await this.changeOrders.get(changeOrderId);
    if (!co) {
      throw new Error(`Change order not found: ${changeOrderId}`);
    }

    if (co.status !== 'draft') {
      throw new Error(
        `Change order "${co.number}" cannot be submitted: current status is "${co.status}". Must be in "draft" status.`,
      );
    }

    const updated = await this.changeOrders.update(changeOrderId, {
      status: 'pending_approval',
    } as Partial<ChangeOrder>);

    await this.addLogEntry({
      jobId: co.jobId,
      changeOrderId,
      action: 'co_submitted',
      performedBy: submittedBy,
      previousStatus: 'draft',
      newStatus: 'pending_approval',
      notes: `Change order "${co.number}" submitted for approval`,
    });

    this.events.emit('co.submitted', { changeOrder: updated });
    return updated;
  }

  /**
   * Approve a change order.
   * Creates an approval record and, if this is the final approval needed,
   * transitions the CO to 'approved' status.
   */
  async approve(
    changeOrderId: string,
    approverId: string,
    comments?: string,
  ): Promise<ChangeOrder & CollectionMeta> {
    const co = await this.changeOrders.get(changeOrderId);
    if (!co) {
      throw new Error(`Change order not found: ${changeOrderId}`);
    }

    if (co.status !== 'pending_approval') {
      throw new Error(
        `Change order "${co.number}" cannot be approved: current status is "${co.status}". Must be in "pending_approval" status.`,
      );
    }

    // Get existing approvals to determine next sequence
    const existingApprovals = await this.approvals
      .query()
      .where('changeOrderId', '=', changeOrderId)
      .execute();

    const nextSequence = existingApprovals.length + 1;

    // Create approval record
    await this.approvals.insert({
      changeOrderId,
      approverId,
      approverRole: 'approver',
      status: 'approved',
      comments,
      date: currentDate(),
      sequence: nextSequence,
    } as ChangeOrderApproval);

    // Transition CO to approved
    const updated = await this.changeOrders.update(changeOrderId, {
      status: 'approved',
      approvedAmount: co.amount,
    } as Partial<ChangeOrder>);

    await this.addLogEntry({
      jobId: co.jobId,
      changeOrderId,
      action: 'co_approved',
      performedBy: approverId,
      previousStatus: 'pending_approval',
      newStatus: 'approved',
      notes: comments ?? `Change order "${co.number}" approved`,
    });

    this.events.emit('co.approved', { changeOrder: updated, approverId });
    return updated;
  }

  /**
   * Reject a change order.
   * Creates a rejection record and transitions the CO to 'rejected' status.
   */
  async reject(
    changeOrderId: string,
    approverId: string,
    reason?: string,
  ): Promise<ChangeOrder & CollectionMeta> {
    const co = await this.changeOrders.get(changeOrderId);
    if (!co) {
      throw new Error(`Change order not found: ${changeOrderId}`);
    }

    if (co.status !== 'pending_approval') {
      throw new Error(
        `Change order "${co.number}" cannot be rejected: current status is "${co.status}". Must be in "pending_approval" status.`,
      );
    }

    // Get existing approvals to determine next sequence
    const existingApprovals = await this.approvals
      .query()
      .where('changeOrderId', '=', changeOrderId)
      .execute();

    const nextSequence = existingApprovals.length + 1;

    // Create rejection record
    await this.approvals.insert({
      changeOrderId,
      approverId,
      approverRole: 'approver',
      status: 'rejected',
      comments: reason,
      date: currentDate(),
      sequence: nextSequence,
    } as ChangeOrderApproval);

    // Transition CO to rejected
    const updated = await this.changeOrders.update(changeOrderId, {
      status: 'rejected',
    } as Partial<ChangeOrder>);

    await this.addLogEntry({
      jobId: co.jobId,
      changeOrderId,
      action: 'co_rejected',
      performedBy: approverId,
      previousStatus: 'pending_approval',
      newStatus: 'rejected',
      notes: reason ?? `Change order "${co.number}" rejected`,
    });

    this.events.emit('co.rejected', { changeOrder: updated, approverId, reason });
    return updated;
  }

  /**
   * Get the approval chain (all approval records) for a change order.
   */
  async getApprovalChain(
    changeOrderId: string,
  ): Promise<(ChangeOrderApproval & CollectionMeta)[]> {
    return this.approvals
      .query()
      .where('changeOrderId', '=', changeOrderId)
      .orderBy('sequence', 'asc')
      .execute();
  }

  /**
   * Get all pending approvals across all change orders.
   */
  async getPendingApprovals(): Promise<(ChangeOrderApproval & CollectionMeta)[]> {
    return this.approvals
      .query()
      .where('status', '=', 'pending')
      .orderBy('date', 'asc')
      .execute();
  }

  // ========================================================================
  // EXECUTE / VOID CHANGE ORDER
  // ========================================================================

  /**
   * Execute an approved change order.
   * Transitions from 'approved' to 'executed' and sets executedDate.
   */
  async executeChangeOrder(
    id: string,
    executedBy?: string,
  ): Promise<ChangeOrder & CollectionMeta> {
    const co = await this.changeOrders.get(id);
    if (!co) {
      throw new Error(`Change order not found: ${id}`);
    }

    if (co.status !== 'approved') {
      throw new Error(
        `Change order "${co.number}" cannot be executed: current status is "${co.status}". Must be in "approved" status.`,
      );
    }

    const updated = await this.changeOrders.update(id, {
      status: 'executed',
      executedDate: currentDate(),
    } as Partial<ChangeOrder>);

    await this.addLogEntry({
      jobId: co.jobId,
      changeOrderId: id,
      action: 'co_executed',
      performedBy: executedBy,
      previousStatus: 'approved',
      newStatus: 'executed',
      notes: `Change order "${co.number}" executed`,
    });

    this.events.emit('co.executed', { changeOrder: updated });
    return updated;
  }

  /**
   * Void a change order.
   * Can void from any non-executed status.
   */
  async voidChangeOrder(
    id: string,
    reason?: string,
  ): Promise<ChangeOrder & CollectionMeta> {
    const co = await this.changeOrders.get(id);
    if (!co) {
      throw new Error(`Change order not found: ${id}`);
    }

    if (co.status === 'executed') {
      throw new Error(
        `Change order "${co.number}" cannot be voided: it has been executed.`,
      );
    }

    if (co.status === 'voided') {
      throw new Error(
        `Change order "${co.number}" is already voided.`,
      );
    }

    const previousStatus = co.status;
    const updated = await this.changeOrders.update(id, {
      status: 'voided',
    } as Partial<ChangeOrder>);

    await this.addLogEntry({
      jobId: co.jobId,
      changeOrderId: id,
      action: 'co_voided',
      previousStatus,
      newStatus: 'voided',
      notes: reason ?? `Change order "${co.number}" voided`,
    });

    this.events.emit('co.voided', { changeOrder: updated, reason });
    return updated;
  }

  // ========================================================================
  // CHANGE ORDER LOG
  // ========================================================================

  /**
   * Get the activity log for a job.
   */
  async getLog(jobId: string): Promise<(ChangeOrderLog & CollectionMeta)[]> {
    return this.logs
      .query()
      .where('jobId', '=', jobId)
      .orderBy('date', 'desc')
      .execute();
  }

  /**
   * Get the activity log for a specific change order.
   */
  async getLogByChangeOrder(
    changeOrderId: string,
  ): Promise<(ChangeOrderLog & CollectionMeta)[]> {
    return this.logs
      .query()
      .where('changeOrderId', '=', changeOrderId)
      .orderBy('date', 'desc')
      .execute();
  }

  /**
   * Get all log entries, optionally filtered by action.
   */
  async getAllLogs(filters?: {
    action?: string;
  }): Promise<(ChangeOrderLog & CollectionMeta)[]> {
    const q = this.logs.query();

    if (filters?.action) {
      q.where('action', '=', filters.action);
    }

    q.orderBy('date', 'desc');
    return q.execute();
  }

  /**
   * Internal helper to add a log entry.
   */
  private async addLogEntry(data: {
    jobId?: string;
    changeOrderId?: string;
    action: string;
    performedBy?: string;
    previousStatus?: string;
    newStatus?: string;
    notes?: string;
  }): Promise<ChangeOrderLog & CollectionMeta> {
    return this.logs.insert({
      jobId: data.jobId,
      changeOrderId: data.changeOrderId,
      action: data.action,
      performedBy: data.performedBy,
      date: currentDate(),
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      notes: data.notes,
    } as ChangeOrderLog);
  }

  // ========================================================================
  // TREND REPORT
  // ========================================================================

  /**
   * Get change order trend data, optionally filtered by job.
   * Groups change orders by month and computes count/totalAmount/approvedAmount.
   */
  async getChangeOrderTrend(
    jobId?: string,
  ): Promise<ChangeOrderTrendPeriod[]> {
    const q = this.changeOrders.query();

    if (jobId) {
      q.where('jobId', '=', jobId);
    }

    const allCOs = await q.execute();

    // Group by month (YYYY-MM)
    const periodMap = new Map<string, { count: number; totalAmount: number; approvedAmount: number }>();

    for (const co of allCOs) {
      const effectiveDate = co.effectiveDate || co.createdAt;
      const period = effectiveDate.substring(0, 7); // YYYY-MM

      if (!periodMap.has(period)) {
        periodMap.set(period, { count: 0, totalAmount: 0, approvedAmount: 0 });
      }

      const bucket = periodMap.get(period)!;
      bucket.count += 1;
      bucket.totalAmount = round2(bucket.totalAmount + (co.amount || 0));

      if (co.status === 'approved' || co.status === 'executed') {
        bucket.approvedAmount = round2(bucket.approvedAmount + (co.approvedAmount || 0));
      }
    }

    // Convert to sorted array
    const result: ChangeOrderTrendPeriod[] = [];
    periodMap.forEach((data, period) => {
      result.push({
        period,
        count: data.count,
        totalAmount: data.totalAmount,
        approvedAmount: data.approvedAmount,
      });
    });

    result.sort((a, b) => a.period.localeCompare(b.period));
    return result;
  }

  // ========================================================================
  // JOB SUMMARY
  // ========================================================================

  /**
   * Get a summary of change orders for a specific job.
   */
  async getJobChangeOrderSummary(jobId: string): Promise<JobChangeOrderSummary> {
    const allCOs = await this.changeOrders
      .query()
      .where('jobId', '=', jobId)
      .execute();

    const summary: JobChangeOrderSummary = {
      jobId,
      totalApproved: 0,
      totalPending: 0,
      totalRejected: 0,
      totalExecuted: 0,
      approvedAmount: 0,
      pendingAmount: 0,
      rejectedAmount: 0,
      netCostImpact: 0,
      totalScheduleExtensionDays: 0,
    };

    for (const co of allCOs) {
      switch (co.status) {
        case 'approved':
          summary.totalApproved += 1;
          summary.approvedAmount = round2(summary.approvedAmount + (co.approvedAmount || 0));
          summary.totalScheduleExtensionDays += co.scheduleExtensionDays || 0;
          break;
        case 'pending_approval':
          summary.totalPending += 1;
          summary.pendingAmount = round2(summary.pendingAmount + (co.amount || 0));
          break;
        case 'rejected':
          summary.totalRejected += 1;
          summary.rejectedAmount = round2(summary.rejectedAmount + (co.amount || 0));
          break;
        case 'executed':
          summary.totalExecuted += 1;
          summary.approvedAmount = round2(summary.approvedAmount + (co.approvedAmount || 0));
          summary.totalScheduleExtensionDays += co.scheduleExtensionDays || 0;
          break;
      }
    }

    summary.netCostImpact = round2(summary.approvedAmount);

    return summary;
  }

  // ========================================================================
  // SUBCONTRACTOR FLOW-DOWN
  // ========================================================================

  /**
   * Create a subcontractor change order that flows down from an owner CO.
   * Creates a new change order of type 'subcontractor' linked to the same job.
   */
  async createSubcontractorCO(
    changeOrderId: string,
    subcontractId: string,
    amount: number,
  ): Promise<ChangeOrder & CollectionMeta> {
    const parentCO = await this.changeOrders.get(changeOrderId);
    if (!parentCO) {
      throw new Error(`Parent change order not found: ${changeOrderId}`);
    }

    if (parentCO.type !== 'owner') {
      throw new Error(
        `Flow-down is only supported from owner change orders. This CO is type "${parentCO.type}".`,
      );
    }

    const subCO = await this.changeOrders.insert({
      jobId: parentCO.jobId,
      requestId: parentCO.requestId,
      number: `${parentCO.number}-SUB-${subcontractId.substring(0, 6)}`,
      title: `Sub CO: ${parentCO.title}`,
      description: `Flow-down from ${parentCO.number} to subcontract ${subcontractId}`,
      type: 'subcontractor',
      status: 'draft',
      amount: round2(amount),
      approvedAmount: 0,
      scheduleExtensionDays: 0,
      entityId: parentCO.entityId,
    } as ChangeOrder);

    await this.addLogEntry({
      jobId: parentCO.jobId,
      changeOrderId: subCO.id,
      action: 'sub_co_created',
      notes: `Subcontractor CO created from ${parentCO.number} for subcontract ${subcontractId}, amount: ${amount}`,
    });

    this.events.emit('co.created', { changeOrder: subCO, parentId: changeOrderId });
    return subCO;
  }
}
