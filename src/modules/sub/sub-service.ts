/**
 * Concrete -- Sub (Subcontractor Management) Service
 *
 * Core service layer for the Subcontractor Management module. Provides
 * subcontract CRUD, change order management, payment application processing
 * (AIA G702), backcharge tracking, prequalification questionnaire tracking,
 * compliance matrix management, retention schedule/release, lien waiver
 * collection workflow, bonding capacity tracking, performance scoring,
 * and reporting.
 *
 * Phase 9
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';
import { now } from '../../core/types/base';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type SubcontractStatus = 'draft' | 'active' | 'complete' | 'closed' | 'terminated';
export type ChangeOrderType = 'addition' | 'deduction' | 'time_extension';
export type ChangeOrderStatus = 'pending' | 'approved' | 'rejected';
export type PayAppStatus = 'draft' | 'submitted' | 'approved' | 'paid';
export type BackchargeStatus = 'pending' | 'approved' | 'deducted';
export type PrequalificationStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type ComplianceType = 'insurance_gl' | 'insurance_auto' | 'insurance_umbrella' | 'insurance_wc' | 'license' | 'bond' | 'osha' | 'everify' | 'other';
export type ComplianceStatus = 'valid' | 'expired' | 'pending' | 'missing';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Subcontract {
  [key: string]: unknown;
  vendorId: string;
  jobId: string;
  number: string;
  description?: string;
  scope?: string;
  contractAmount: number;
  retentionPct: number;
  startDate?: string;
  endDate?: string;
  status: SubcontractStatus;
  approvedChangeOrders: number;
  revisedAmount: number;
  billedToDate: number;
  paidToDate: number;
  retainageHeld: number;
  entityId?: string;
}

export interface ChangeOrder {
  [key: string]: unknown;
  subcontractId: string;
  number: number;
  description: string;
  amount: number;
  type: ChangeOrderType;
  status: ChangeOrderStatus;
  date: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface PayApp {
  [key: string]: unknown;
  subcontractId: string;
  applicationNumber: number;
  periodTo: string;
  previouslyBilled: number;
  currentBilled: number;
  materialStored: number;
  totalBilled: number;
  retainageAmount: number;
  netPayable: number;
  status: PayAppStatus;
}

export interface Backcharge {
  [key: string]: unknown;
  subcontractId: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  status: BackchargeStatus;
  invoiceId?: string;
}

export interface Prequalification {
  [key: string]: unknown;
  vendorId: string;
  submittedDate?: string;
  reviewedDate?: string;
  score: number;
  status: PrequalificationStatus;
  emr?: number;
  bondingCapacity?: number;
  yearsInBusiness?: number;
  revenueAvg3Year?: number;
}

export interface SubCompliance {
  [key: string]: unknown;
  vendorId: string;
  subcontractId?: string;
  type: ComplianceType;
  status: ComplianceStatus;
  documentId?: string;
  expirationDate?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Report Types
// ---------------------------------------------------------------------------

export interface SubPaymentHistoryRow {
  subcontractId: string;
  subcontractNumber: string;
  vendorId: string;
  vendorName: string;
  applicationNumber: number;
  periodTo: string;
  currentBilled: number;
  retainageAmount: number;
  netPayable: number;
  status: string;
}

export interface ComplianceMatrixRow {
  vendorId: string;
  vendorName: string;
  insuranceGl: ComplianceStatus;
  insuranceAuto: ComplianceStatus;
  insuranceUmbrella: ComplianceStatus;
  insuranceWc: ComplianceStatus;
  license: ComplianceStatus;
  bond: ComplianceStatus;
  osha: ComplianceStatus;
  everify: ComplianceStatus;
  overallStatus: 'compliant' | 'non_compliant' | 'partial';
}

export interface OpenCommitmentRow {
  subcontractId: string;
  subcontractNumber: string;
  vendorId: string;
  vendorName: string;
  jobId: string;
  contractAmount: number;
  approvedChangeOrders: number;
  revisedAmount: number;
  billedToDate: number;
  remainingCommitment: number;
  retainageHeld: number;
  paidToDate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// SubService
// ---------------------------------------------------------------------------

export class SubService {
  constructor(
    private subcontracts: Collection<Subcontract>,
    private changeOrders: Collection<ChangeOrder>,
    private payApps: Collection<PayApp>,
    private backcharges: Collection<Backcharge>,
    private prequalifications: Collection<Prequalification>,
    private compliances: Collection<SubCompliance>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // SUBCONTRACT CRUD
  // ========================================================================

  /**
   * Create a new subcontract.
   * Validates subcontract number uniqueness per job. Defaults: status='draft',
   * approvedChangeOrders=0, revisedAmount=contractAmount, billedToDate=0,
   * paidToDate=0, retainageHeld=0.
   */
  async createSubcontract(data: {
    vendorId: string;
    jobId: string;
    number: string;
    description?: string;
    scope?: string;
    contractAmount: number;
    retentionPct?: number;
    startDate?: string;
    endDate?: string;
    status?: SubcontractStatus;
    entityId?: string;
  }): Promise<Subcontract & CollectionMeta> {
    // Validate subcontract number uniqueness per job
    const existing = await this.subcontracts
      .query()
      .where('jobId', '=', data.jobId)
      .where('number', '=', data.number)
      .limit(1)
      .first();

    if (existing) {
      throw new Error(`Subcontract number "${data.number}" already exists for this job.`);
    }

    const contractAmount = round2(data.contractAmount);

    const record = await this.subcontracts.insert({
      vendorId: data.vendorId,
      jobId: data.jobId,
      number: data.number,
      description: data.description,
      scope: data.scope,
      contractAmount,
      retentionPct: data.retentionPct ?? 10,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status ?? 'draft',
      approvedChangeOrders: 0,
      revisedAmount: contractAmount,
      billedToDate: 0,
      paidToDate: 0,
      retainageHeld: 0,
      entityId: data.entityId,
    } as Subcontract);

    this.events.emit('sub.created', { subcontract: record });
    return record;
  }

  /**
   * Update an existing subcontract.
   * Recalculates revisedAmount if contractAmount changes.
   */
  async updateSubcontract(
    id: string,
    changes: Partial<Subcontract>,
  ): Promise<Subcontract & CollectionMeta> {
    const existing = await this.subcontracts.get(id);
    if (!existing) {
      throw new Error(`Subcontract not found: ${id}`);
    }

    // If number is changing, validate uniqueness within the job
    if (changes.number && changes.number !== existing.number) {
      const jobId = changes.jobId ?? existing.jobId;
      const duplicate = await this.subcontracts
        .query()
        .where('jobId', '=', jobId)
        .where('number', '=', changes.number)
        .limit(1)
        .first();

      if (duplicate) {
        throw new Error(`Subcontract number "${changes.number}" already exists for this job.`);
      }
    }

    // Recalculate revisedAmount if contractAmount changes
    const mergedChanges: Partial<Subcontract> = { ...changes };
    if (changes.contractAmount !== undefined) {
      const newContractAmount = round2(changes.contractAmount);
      mergedChanges.contractAmount = newContractAmount;
      mergedChanges.revisedAmount = round2(newContractAmount + existing.approvedChangeOrders);
    }

    const updated = await this.subcontracts.update(id, mergedChanges as Partial<Subcontract>);
    this.events.emit('sub.updated', { subcontract: updated });
    return updated;
  }

  /**
   * Soft-delete a subcontract.
   * Refuses deletion if subcontract has any pay apps.
   */
  async deleteSubcontract(id: string): Promise<void> {
    const existing = await this.subcontracts.get(id);
    if (!existing) {
      throw new Error(`Subcontract not found: ${id}`);
    }

    const payAppCount = await this.payApps
      .query()
      .where('subcontractId', '=', id)
      .count();

    if (payAppCount > 0) {
      throw new Error(
        `Cannot delete subcontract: it has ${payAppCount} pay application(s). Set subcontract to terminated instead.`,
      );
    }

    await this.subcontracts.remove(id);
    this.events.emit('sub.deleted', { subcontractId: id });
  }

  /**
   * Get a single subcontract by ID.
   */
  async getSubcontract(id: string): Promise<(Subcontract & CollectionMeta) | null> {
    return this.subcontracts.get(id);
  }

  /**
   * Get subcontracts with optional filters, ordered by number ascending.
   */
  async getSubcontracts(filters?: {
    vendorId?: string;
    jobId?: string;
    status?: SubcontractStatus;
    entityId?: string;
  }): Promise<(Subcontract & CollectionMeta)[]> {
    const q = this.subcontracts.query();

    if (filters?.vendorId) {
      q.where('vendorId', '=', filters.vendorId);
    }
    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }

    q.orderBy('number', 'asc');
    return q.execute();
  }

  /**
   * Lookup a subcontract by number within a job.
   */
  async getSubcontractByNumber(
    jobId: string,
    number: string,
  ): Promise<(Subcontract & CollectionMeta) | null> {
    const result = await this.subcontracts
      .query()
      .where('jobId', '=', jobId)
      .where('number', '=', number)
      .limit(1)
      .first();
    return result;
  }

  // ========================================================================
  // CHANGE ORDER MANAGEMENT
  // ========================================================================

  /**
   * Create a change order for a subcontract.
   * Validates the subcontract exists. Defaults: status='pending'.
   */
  async createChangeOrder(data: {
    subcontractId: string;
    number: number;
    description: string;
    amount: number;
    type: ChangeOrderType;
    date: string;
    status?: ChangeOrderStatus;
  }): Promise<ChangeOrder & CollectionMeta> {
    // Validate subcontract exists
    const sub = await this.subcontracts.get(data.subcontractId);
    if (!sub) {
      throw new Error(`Subcontract not found: ${data.subcontractId}`);
    }

    // Validate CO number uniqueness within the subcontract
    const existingCO = await this.changeOrders
      .query()
      .where('subcontractId', '=', data.subcontractId)
      .where('number', '=', data.number)
      .limit(1)
      .first();

    if (existingCO) {
      throw new Error(`Change order #${data.number} already exists for this subcontract.`);
    }

    const record = await this.changeOrders.insert({
      subcontractId: data.subcontractId,
      number: data.number,
      description: data.description,
      amount: round2(data.amount),
      type: data.type,
      status: data.status ?? 'pending',
      date: data.date,
    } as ChangeOrder);

    this.events.emit('sub.changeOrder.created', { changeOrder: record });
    return record;
  }

  /**
   * Approve a change order.
   * Validates the change order is in 'pending' status, then updates the
   * subcontract's approvedChangeOrders and revisedAmount.
   */
  async approveChangeOrder(
    id: string,
    approvedBy: string,
  ): Promise<ChangeOrder & CollectionMeta> {
    const co = await this.changeOrders.get(id);
    if (!co) {
      throw new Error(`Change order not found: ${id}`);
    }

    if (co.status !== 'pending') {
      throw new Error(
        `Change order #${co.number} cannot be approved: current status is "${co.status}". Change order must be in "pending" status.`,
      );
    }

    const updated = await this.changeOrders.update(id, {
      status: 'approved',
      approvedAt: now(),
      approvedBy,
    } as Partial<ChangeOrder>);

    // Update subcontract totals
    const sub = await this.subcontracts.get(co.subcontractId);
    if (sub) {
      let coAdjustment = co.amount;
      if (co.type === 'deduction') {
        coAdjustment = -Math.abs(co.amount);
      } else if (co.type === 'time_extension') {
        coAdjustment = 0;
      }

      const newApprovedCOs = round2(sub.approvedChangeOrders + coAdjustment);
      const newRevisedAmount = round2(sub.contractAmount + newApprovedCOs);

      await this.subcontracts.update(sub.id, {
        approvedChangeOrders: newApprovedCOs,
        revisedAmount: newRevisedAmount,
      } as Partial<Subcontract>);
    }

    this.events.emit('sub.changeOrder.approved', { changeOrder: updated });
    return updated;
  }

  /**
   * Reject a change order.
   */
  async rejectChangeOrder(id: string): Promise<ChangeOrder & CollectionMeta> {
    const co = await this.changeOrders.get(id);
    if (!co) {
      throw new Error(`Change order not found: ${id}`);
    }

    if (co.status !== 'pending') {
      throw new Error(
        `Change order #${co.number} cannot be rejected: current status is "${co.status}".`,
      );
    }

    const updated = await this.changeOrders.update(id, {
      status: 'rejected',
    } as Partial<ChangeOrder>);

    this.events.emit('sub.changeOrder.rejected', { changeOrder: updated });
    return updated;
  }

  /**
   * Get a single change order by ID.
   */
  async getChangeOrder(id: string): Promise<(ChangeOrder & CollectionMeta) | null> {
    return this.changeOrders.get(id);
  }

  /**
   * Get change orders for a subcontract, ordered by number ascending.
   */
  async getChangeOrders(filters?: {
    subcontractId?: string;
    status?: ChangeOrderStatus;
  }): Promise<(ChangeOrder & CollectionMeta)[]> {
    const q = this.changeOrders.query();

    if (filters?.subcontractId) {
      q.where('subcontractId', '=', filters.subcontractId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    q.orderBy('number', 'asc');
    return q.execute();
  }

  // ========================================================================
  // PAYMENT APPLICATION PROCESSING (AIA G702)
  // ========================================================================

  /**
   * Create a payment application (AIA G702 from sub).
   * Validates subcontract exists. Computes totalBilled, retainageAmount,
   * and netPayable automatically. Defaults: status='draft'.
   */
  async createPayApp(data: {
    subcontractId: string;
    applicationNumber: number;
    periodTo: string;
    currentBilled: number;
    materialStored?: number;
    status?: PayAppStatus;
  }): Promise<PayApp & CollectionMeta> {
    // Validate subcontract exists
    const sub = await this.subcontracts.get(data.subcontractId);
    if (!sub) {
      throw new Error(`Subcontract not found: ${data.subcontractId}`);
    }

    // Validate application number uniqueness
    const existingApp = await this.payApps
      .query()
      .where('subcontractId', '=', data.subcontractId)
      .where('applicationNumber', '=', data.applicationNumber)
      .limit(1)
      .first();

    if (existingApp) {
      throw new Error(
        `Pay app #${data.applicationNumber} already exists for this subcontract.`,
      );
    }

    // Calculate totals using the AIA G702 methodology
    const previouslyBilled = sub.billedToDate;
    const currentBilled = round2(data.currentBilled);
    const materialStored = round2(data.materialStored ?? 0);
    const totalBilled = round2(previouslyBilled + currentBilled + materialStored);
    const retainageAmount = round2(totalBilled * (sub.retentionPct / 100));
    const netPayable = round2(currentBilled + materialStored - round2((currentBilled + materialStored) * (sub.retentionPct / 100)));

    const record = await this.payApps.insert({
      subcontractId: data.subcontractId,
      applicationNumber: data.applicationNumber,
      periodTo: data.periodTo,
      previouslyBilled,
      currentBilled,
      materialStored,
      totalBilled,
      retainageAmount,
      netPayable,
      status: data.status ?? 'draft',
    } as PayApp);

    this.events.emit('sub.payApp.created', { payApp: record });
    return record;
  }

  /**
   * Approve a payment application.
   * Updates subcontract billedToDate and retainageHeld.
   */
  async approvePayApp(id: string): Promise<PayApp & CollectionMeta> {
    const payApp = await this.payApps.get(id);
    if (!payApp) {
      throw new Error(`Pay app not found: ${id}`);
    }

    if (payApp.status !== 'submitted') {
      throw new Error(
        `Pay app #${payApp.applicationNumber} cannot be approved: current status is "${payApp.status}". Pay app must be in "submitted" status.`,
      );
    }

    const updated = await this.payApps.update(id, {
      status: 'approved',
    } as Partial<PayApp>);

    // Update subcontract billedToDate and retainageHeld
    const sub = await this.subcontracts.get(payApp.subcontractId);
    if (sub) {
      const newBilledToDate = round2(sub.billedToDate + payApp.currentBilled + payApp.materialStored);
      const newRetainageHeld = round2(newBilledToDate * (sub.retentionPct / 100));

      await this.subcontracts.update(sub.id, {
        billedToDate: newBilledToDate,
        retainageHeld: newRetainageHeld,
      } as Partial<Subcontract>);
    }

    this.events.emit('sub.payApp.approved', { payApp: updated });
    return updated;
  }

  /**
   * Mark a pay app as paid.
   * Updates subcontract paidToDate.
   */
  async markPayAppPaid(id: string): Promise<PayApp & CollectionMeta> {
    const payApp = await this.payApps.get(id);
    if (!payApp) {
      throw new Error(`Pay app not found: ${id}`);
    }

    if (payApp.status !== 'approved') {
      throw new Error(
        `Pay app #${payApp.applicationNumber} cannot be marked as paid: current status is "${payApp.status}". Pay app must be in "approved" status.`,
      );
    }

    const updated = await this.payApps.update(id, {
      status: 'paid',
    } as Partial<PayApp>);

    // Update subcontract paidToDate
    const sub = await this.subcontracts.get(payApp.subcontractId);
    if (sub) {
      const newPaidToDate = round2(sub.paidToDate + payApp.netPayable);
      await this.subcontracts.update(sub.id, {
        paidToDate: newPaidToDate,
      } as Partial<Subcontract>);
    }

    this.events.emit('sub.payApp.paid', { payApp: updated });
    return updated;
  }

  /**
   * Submit a pay app for approval.
   */
  async submitPayApp(id: string): Promise<PayApp & CollectionMeta> {
    const payApp = await this.payApps.get(id);
    if (!payApp) {
      throw new Error(`Pay app not found: ${id}`);
    }

    if (payApp.status !== 'draft') {
      throw new Error(
        `Pay app #${payApp.applicationNumber} cannot be submitted: current status is "${payApp.status}". Pay app must be in "draft" status.`,
      );
    }

    const updated = await this.payApps.update(id, {
      status: 'submitted',
    } as Partial<PayApp>);

    this.events.emit('sub.payApp.submitted', { payApp: updated });
    return updated;
  }

  /**
   * Get a single pay app by ID.
   */
  async getPayApp(id: string): Promise<(PayApp & CollectionMeta) | null> {
    return this.payApps.get(id);
  }

  /**
   * Get pay apps with optional filters, ordered by applicationNumber ascending.
   */
  async getPayApps(filters?: {
    subcontractId?: string;
    status?: PayAppStatus;
  }): Promise<(PayApp & CollectionMeta)[]> {
    const q = this.payApps.query();

    if (filters?.subcontractId) {
      q.where('subcontractId', '=', filters.subcontractId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    q.orderBy('applicationNumber', 'asc');
    return q.execute();
  }

  // ========================================================================
  // BACKCHARGE TRACKING
  // ========================================================================

  /**
   * Create a backcharge against a subcontract.
   * Validates the subcontract exists. Defaults: status='pending'.
   */
  async createBackcharge(data: {
    subcontractId: string;
    description: string;
    amount: number;
    date: string;
    category?: string;
    invoiceId?: string;
    status?: BackchargeStatus;
  }): Promise<Backcharge & CollectionMeta> {
    // Validate subcontract exists
    const sub = await this.subcontracts.get(data.subcontractId);
    if (!sub) {
      throw new Error(`Subcontract not found: ${data.subcontractId}`);
    }

    const record = await this.backcharges.insert({
      subcontractId: data.subcontractId,
      description: data.description,
      amount: round2(data.amount),
      date: data.date,
      category: data.category,
      status: data.status ?? 'pending',
      invoiceId: data.invoiceId,
    } as Backcharge);

    this.events.emit('sub.backcharge.created', { backcharge: record });
    return record;
  }

  /**
   * Approve a backcharge.
   */
  async approveBackcharge(id: string): Promise<Backcharge & CollectionMeta> {
    const bc = await this.backcharges.get(id);
    if (!bc) {
      throw new Error(`Backcharge not found: ${id}`);
    }

    if (bc.status !== 'pending') {
      throw new Error(
        `Backcharge cannot be approved: current status is "${bc.status}". Backcharge must be in "pending" status.`,
      );
    }

    const updated = await this.backcharges.update(id, {
      status: 'approved',
    } as Partial<Backcharge>);

    this.events.emit('sub.backcharge.approved', { backcharge: updated });
    return updated;
  }

  /**
   * Deduct a backcharge (mark as deducted from a pay app or payment).
   */
  async deductBackcharge(id: string): Promise<Backcharge & CollectionMeta> {
    const bc = await this.backcharges.get(id);
    if (!bc) {
      throw new Error(`Backcharge not found: ${id}`);
    }

    if (bc.status !== 'approved') {
      throw new Error(
        `Backcharge cannot be deducted: current status is "${bc.status}". Backcharge must be in "approved" status.`,
      );
    }

    const updated = await this.backcharges.update(id, {
      status: 'deducted',
    } as Partial<Backcharge>);

    this.events.emit('sub.backcharge.deducted', { backcharge: updated });
    return updated;
  }

  /**
   * Get a single backcharge by ID.
   */
  async getBackcharge(id: string): Promise<(Backcharge & CollectionMeta) | null> {
    return this.backcharges.get(id);
  }

  /**
   * Get backcharges with optional filters, ordered by date descending.
   */
  async getBackcharges(filters?: {
    subcontractId?: string;
    status?: BackchargeStatus;
  }): Promise<(Backcharge & CollectionMeta)[]> {
    const q = this.backcharges.query();

    if (filters?.subcontractId) {
      q.where('subcontractId', '=', filters.subcontractId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    q.orderBy('date', 'desc');
    return q.execute();
  }

  // ========================================================================
  // PREQUALIFICATION TRACKING
  // ========================================================================

  /**
   * Create a prequalification record for a vendor.
   * Defaults: status='pending', score=0.
   */
  async createPrequalification(data: {
    vendorId: string;
    submittedDate?: string;
    reviewedDate?: string;
    score?: number;
    status?: PrequalificationStatus;
    emr?: number;
    bondingCapacity?: number;
    yearsInBusiness?: number;
    revenueAvg3Year?: number;
  }): Promise<Prequalification & CollectionMeta> {
    const record = await this.prequalifications.insert({
      vendorId: data.vendorId,
      submittedDate: data.submittedDate,
      reviewedDate: data.reviewedDate,
      score: data.score ?? 0,
      status: data.status ?? 'pending',
      emr: data.emr,
      bondingCapacity: data.bondingCapacity,
      yearsInBusiness: data.yearsInBusiness,
      revenueAvg3Year: data.revenueAvg3Year,
    } as Prequalification);

    this.events.emit('sub.prequalification.created', { prequalification: record });
    return record;
  }

  /**
   * Update a prequalification record.
   */
  async updatePrequalification(
    id: string,
    changes: Partial<Prequalification>,
  ): Promise<Prequalification & CollectionMeta> {
    const existing = await this.prequalifications.get(id);
    if (!existing) {
      throw new Error(`Prequalification not found: ${id}`);
    }

    const updated = await this.prequalifications.update(id, changes as Partial<Prequalification>);
    this.events.emit('sub.prequalification.updated', { prequalification: updated });
    return updated;
  }

  /**
   * Approve a prequalification.
   */
  async approvePrequalification(
    id: string,
    score: number,
  ): Promise<Prequalification & CollectionMeta> {
    const existing = await this.prequalifications.get(id);
    if (!existing) {
      throw new Error(`Prequalification not found: ${id}`);
    }

    if (existing.status !== 'pending') {
      throw new Error(
        `Prequalification cannot be approved: current status is "${existing.status}".`,
      );
    }

    const updated = await this.prequalifications.update(id, {
      status: 'approved',
      score,
      reviewedDate: now(),
    } as Partial<Prequalification>);

    this.events.emit('sub.prequalification.approved', { prequalification: updated });
    return updated;
  }

  /**
   * Reject a prequalification.
   */
  async rejectPrequalification(id: string): Promise<Prequalification & CollectionMeta> {
    const existing = await this.prequalifications.get(id);
    if (!existing) {
      throw new Error(`Prequalification not found: ${id}`);
    }

    if (existing.status !== 'pending') {
      throw new Error(
        `Prequalification cannot be rejected: current status is "${existing.status}".`,
      );
    }

    const updated = await this.prequalifications.update(id, {
      status: 'rejected',
      reviewedDate: now(),
    } as Partial<Prequalification>);

    this.events.emit('sub.prequalification.rejected', { prequalification: updated });
    return updated;
  }

  /**
   * Get a single prequalification by ID.
   */
  async getPrequalification(id: string): Promise<(Prequalification & CollectionMeta) | null> {
    return this.prequalifications.get(id);
  }

  /**
   * Get prequalifications with optional filters.
   */
  async getPrequalifications(filters?: {
    vendorId?: string;
    status?: PrequalificationStatus;
  }): Promise<(Prequalification & CollectionMeta)[]> {
    const q = this.prequalifications.query();

    if (filters?.vendorId) {
      q.where('vendorId', '=', filters.vendorId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    return q.execute();
  }

  // ========================================================================
  // COMPLIANCE MATRIX MANAGEMENT
  // ========================================================================

  /**
   * Create a compliance record.
   * Defaults: status='pending'.
   */
  async createCompliance(data: {
    vendorId: string;
    subcontractId?: string;
    type: ComplianceType;
    status?: ComplianceStatus;
    documentId?: string;
    expirationDate?: string;
    notes?: string;
  }): Promise<SubCompliance & CollectionMeta> {
    const record = await this.compliances.insert({
      vendorId: data.vendorId,
      subcontractId: data.subcontractId,
      type: data.type,
      status: data.status ?? 'pending',
      documentId: data.documentId,
      expirationDate: data.expirationDate,
      notes: data.notes,
    } as SubCompliance);

    this.events.emit('sub.compliance.created', { compliance: record });
    return record;
  }

  /**
   * Update a compliance record.
   */
  async updateCompliance(
    id: string,
    changes: Partial<SubCompliance>,
  ): Promise<SubCompliance & CollectionMeta> {
    const existing = await this.compliances.get(id);
    if (!existing) {
      throw new Error(`Compliance record not found: ${id}`);
    }

    const updated = await this.compliances.update(id, changes as Partial<SubCompliance>);
    this.events.emit('sub.compliance.updated', { compliance: updated });
    return updated;
  }

  /**
   * Get a single compliance record by ID.
   */
  async getCompliance(id: string): Promise<(SubCompliance & CollectionMeta) | null> {
    return this.compliances.get(id);
  }

  /**
   * Get compliance records with optional filters.
   */
  async getCompliances(filters?: {
    vendorId?: string;
    subcontractId?: string;
    type?: ComplianceType;
    status?: ComplianceStatus;
  }): Promise<(SubCompliance & CollectionMeta)[]> {
    const q = this.compliances.query();

    if (filters?.vendorId) {
      q.where('vendorId', '=', filters.vendorId);
    }
    if (filters?.subcontractId) {
      q.where('subcontractId', '=', filters.subcontractId);
    }
    if (filters?.type) {
      q.where('type', '=', filters.type);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    return q.execute();
  }

  /**
   * Get compliance records expiring within N days from today.
   * Returns records with status 'valid' and expirationDate within the range.
   */
  async getExpiringCompliances(
    daysAhead: number,
  ): Promise<(SubCompliance & CollectionMeta)[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const certs = await this.compliances
      .query()
      .where('status', '=', 'valid')
      .execute();

    return certs.filter((cert) => {
      if (!cert.expirationDate) return false;
      return cert.expirationDate >= todayStr && cert.expirationDate <= futureDateStr;
    });
  }

  // ========================================================================
  // RETENTION SCHEDULE AND RELEASE
  // ========================================================================

  /**
   * Release retainage for a subcontract (partial or full).
   * Reduces the retainageHeld and increases paidToDate on the subcontract.
   */
  async releaseRetainage(
    subcontractId: string,
    releaseAmount: number,
  ): Promise<Subcontract & CollectionMeta> {
    const sub = await this.subcontracts.get(subcontractId);
    if (!sub) {
      throw new Error(`Subcontract not found: ${subcontractId}`);
    }

    if (releaseAmount > sub.retainageHeld) {
      throw new Error(
        `Release amount (${releaseAmount}) exceeds retainage held (${sub.retainageHeld}).`,
      );
    }

    const newRetainageHeld = round2(sub.retainageHeld - releaseAmount);
    const newPaidToDate = round2(sub.paidToDate + releaseAmount);

    const updated = await this.subcontracts.update(subcontractId, {
      retainageHeld: newRetainageHeld,
      paidToDate: newPaidToDate,
    } as Partial<Subcontract>);

    this.events.emit('sub.retainage.released', {
      subcontract: updated,
      releaseAmount,
    });
    return updated;
  }

  // ========================================================================
  // PERFORMANCE SCORING
  // ========================================================================

  /**
   * Calculate a performance score for a vendor across all their subcontracts.
   *
   * Scoring (0-100):
   *  - Budget adherence (40 pts): How close billed is to revised amount
   *  - Compliance status (30 pts): Percentage of compliance items that are valid
   *  - Prequalification score (30 pts): Direct from prequalification
   */
  async getPerformanceScore(vendorId: string): Promise<{
    vendorId: string;
    overall: number;
    budgetAdherence: number;
    complianceScore: number;
    prequalScore: number;
  }> {
    // Budget adherence: evaluate across active/complete subcontracts
    const subs = await this.subcontracts
      .query()
      .where('vendorId', '=', vendorId)
      .execute();

    let budgetAdherence = 40; // Default full score if no subcontracts
    if (subs.length > 0) {
      const activeSubs = subs.filter(
        (s) => s.status === 'active' || s.status === 'complete',
      );
      if (activeSubs.length > 0) {
        let totalRevised = 0;
        let totalBilled = 0;
        for (const s of activeSubs) {
          totalRevised += s.revisedAmount;
          totalBilled += s.billedToDate;
        }
        if (totalRevised > 0) {
          const ratio = totalBilled / totalRevised;
          // Perfect score if billed <= revised; penalty scales linearly for overruns
          if (ratio <= 1.0) {
            budgetAdherence = 40;
          } else {
            budgetAdherence = Math.max(0, round2(40 * (1 - (ratio - 1))));
          }
        }
      }
    }

    // Compliance score: percentage of valid compliance records
    const complianceRecords = await this.compliances
      .query()
      .where('vendorId', '=', vendorId)
      .execute();

    let complianceScore = 30; // Default full score if no compliance records
    if (complianceRecords.length > 0) {
      const validCount = complianceRecords.filter((c) => c.status === 'valid').length;
      complianceScore = round2((validCount / complianceRecords.length) * 30);
    }

    // Prequalification score: latest approved prequal
    const prequalRecords = await this.prequalifications
      .query()
      .where('vendorId', '=', vendorId)
      .where('status', '=', 'approved')
      .execute();

    let prequalScore = 0;
    if (prequalRecords.length > 0) {
      // Use the highest score among approved prequalifications
      const maxScore = Math.max(...prequalRecords.map((p) => p.score));
      prequalScore = round2(Math.min(maxScore, 100) * 0.3);
    }

    const overall = round2(budgetAdherence + complianceScore + prequalScore);

    return {
      vendorId,
      overall,
      budgetAdherence,
      complianceScore,
      prequalScore,
    };
  }

  // ========================================================================
  // REPORTS
  // ========================================================================

  /**
   * Sub payment history report.
   * Returns all pay apps across subcontracts with vendor and sub details.
   */
  async getPaymentHistory(filters?: {
    vendorId?: string;
    jobId?: string;
  }): Promise<SubPaymentHistoryRow[]> {
    // Get all subcontracts matching filters
    const subQ = this.subcontracts.query();
    if (filters?.vendorId) {
      subQ.where('vendorId', '=', filters.vendorId);
    }
    if (filters?.jobId) {
      subQ.where('jobId', '=', filters.jobId);
    }
    const subs = await subQ.execute();

    const rows: SubPaymentHistoryRow[] = [];

    for (const sub of subs) {
      const payApps = await this.payApps
        .query()
        .where('subcontractId', '=', sub.id)
        .orderBy('applicationNumber', 'asc')
        .execute();

      for (const pa of payApps) {
        rows.push({
          subcontractId: sub.id,
          subcontractNumber: sub.number,
          vendorId: sub.vendorId,
          vendorName: (sub as Record<string, unknown>)['vendorName'] as string ?? sub.vendorId,
          applicationNumber: pa.applicationNumber,
          periodTo: pa.periodTo,
          currentBilled: pa.currentBilled,
          retainageAmount: pa.retainageAmount,
          netPayable: pa.netPayable,
          status: pa.status,
        });
      }
    }

    return rows;
  }

  /**
   * Compliance matrix report.
   * For each vendor with compliance records, builds a matrix of compliance
   * types and their statuses. Determines overall compliance status.
   */
  async getComplianceMatrix(filters?: {
    vendorId?: string;
  }): Promise<ComplianceMatrixRow[]> {
    const compQ = this.compliances.query();
    if (filters?.vendorId) {
      compQ.where('vendorId', '=', filters.vendorId);
    }
    const allCompliance = await compQ.execute();

    // Group by vendorId
    const vendorMap = new Map<string, (SubCompliance & CollectionMeta)[]>();
    for (const comp of allCompliance) {
      const existing = vendorMap.get(comp.vendorId);
      if (existing) {
        existing.push(comp);
      } else {
        vendorMap.set(comp.vendorId, [comp]);
      }
    }

    const rows: ComplianceMatrixRow[] = [];

    for (const [vendorId, records] of vendorMap) {
      const getStatus = (type: ComplianceType): ComplianceStatus => {
        const match = records.find((r) => r.type === type);
        return match ? match.status : 'missing';
      };

      const insuranceGl = getStatus('insurance_gl');
      const insuranceAuto = getStatus('insurance_auto');
      const insuranceUmbrella = getStatus('insurance_umbrella');
      const insuranceWc = getStatus('insurance_wc');
      const license = getStatus('license');
      const bond = getStatus('bond');
      const osha = getStatus('osha');
      const everify = getStatus('everify');

      const allStatuses = [
        insuranceGl, insuranceAuto, insuranceUmbrella, insuranceWc,
        license, bond, osha, everify,
      ];

      const validCount = allStatuses.filter((s) => s === 'valid').length;
      const missingOrExpired = allStatuses.filter(
        (s) => s === 'missing' || s === 'expired',
      ).length;

      let overallStatus: 'compliant' | 'non_compliant' | 'partial';
      if (missingOrExpired === 0) {
        overallStatus = 'compliant';
      } else if (validCount === 0) {
        overallStatus = 'non_compliant';
      } else {
        overallStatus = 'partial';
      }

      rows.push({
        vendorId,
        vendorName: vendorId,
        insuranceGl,
        insuranceAuto,
        insuranceUmbrella,
        insuranceWc,
        license,
        bond,
        osha,
        everify,
        overallStatus,
      });
    }

    return rows;
  }

  /**
   * Open commitments report.
   * Returns all active/draft subcontracts with remaining commitment calculations.
   */
  async getOpenCommitments(filters?: {
    jobId?: string;
    vendorId?: string;
  }): Promise<OpenCommitmentRow[]> {
    const q = this.subcontracts.query();

    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.vendorId) {
      q.where('vendorId', '=', filters.vendorId);
    }

    const subs = await q.execute();

    // Filter to only active or draft subcontracts (open commitments)
    const openSubs = subs.filter(
      (s) => s.status === 'active' || s.status === 'draft',
    );

    const rows: OpenCommitmentRow[] = [];

    for (const sub of openSubs) {
      const remainingCommitment = round2(sub.revisedAmount - sub.billedToDate);

      rows.push({
        subcontractId: sub.id,
        subcontractNumber: sub.number,
        vendorId: sub.vendorId,
        vendorName: sub.vendorId,
        jobId: sub.jobId,
        contractAmount: sub.contractAmount,
        approvedChangeOrders: sub.approvedChangeOrders,
        revisedAmount: sub.revisedAmount,
        billedToDate: sub.billedToDate,
        remainingCommitment,
        retainageHeld: sub.retainageHeld,
        paidToDate: sub.paidToDate,
      });
    }

    // Sort by subcontract number
    rows.sort((a, b) => a.subcontractNumber.localeCompare(b.subcontractNumber));

    return rows;
  }
}
