/**
 * Concrete -- Estimating & Bid Management Service
 *
 * Core service layer for the Estimating module (Phase 13). Provides estimate
 * CRUD with revision tracking, line-item management, assembly grouping, markup
 * and margin computation, bid solicitation and tabulation, estimate-to-budget
 * transfer, historical cost lookup, win/loss tracking, and CSV import support.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';
import { now } from '../../core/types/base';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type EstimateStatus = 'draft' | 'submitted' | 'won' | 'lost' | 'withdrawn';
export type EstimateLineCostType = 'labor' | 'material' | 'equipment' | 'subcontract' | 'other';
export type BidStatus = 'solicited' | 'received' | 'selected' | 'rejected';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Estimate {
  [key: string]: unknown;
  jobId: string;
  name: string;
  revision: number;
  status: EstimateStatus;
  totalCost: number;
  totalMarkup: number;
  totalPrice: number;
  marginPct: number;
  bidDate?: string;
  submittedDate?: string;
  clientName?: string;
  projectName?: string;
  description?: string;
  createdBy?: string;
  defaultMarkupPct: number;
  wonDate?: string;
  lostDate?: string;
  lostReason?: string;
  competitorName?: string;
  competitorPrice?: number;
  transferredToBudget: boolean;
  budgetId?: string;
}

export interface EstimateLine {
  [key: string]: unknown;
  estimateId: string;
  parentId?: string;
  costCodeId?: string;
  description: string;
  costType: EstimateLineCostType;
  quantity: number;
  unit?: string;
  unitCost: number;
  amount: number;
  markupPct: number;
  markupAmount: number;
  totalPrice: number;
  isAssembly: boolean;
  assemblyName?: string;
  sortOrder: number;
  isAlternate: boolean;
  isAllowance: boolean;
  alternateGroup?: string;
}

export interface Bid {
  [key: string]: unknown;
  estimateId: string;
  vendorId?: string;
  trade: string;
  description?: string;
  amount: number;
  status: BidStatus;
  receivedDate?: string;
  expirationDate?: string;
  notes?: string;
  isLowBid: boolean;
  scopeInclusions?: string;
  scopeExclusions?: string;
  bondIncluded?: boolean;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

// ---------------------------------------------------------------------------
// Report / Analysis Types
// ---------------------------------------------------------------------------

export interface BidTabulationRow {
  trade: string;
  bids: (Bid & CollectionMeta)[];
  lowBidId: string | null;
  lowBidAmount: number | null;
  highBidAmount: number | null;
  averageBidAmount: number;
  spread: number;
}

export interface WinLossStats {
  totalEstimates: number;
  totalWon: number;
  totalLost: number;
  totalPending: number;
  winRate: number;
  totalWonValue: number;
  totalLostValue: number;
  averageMarginWon: number;
  averageMarginLost: number;
}

export interface HistoricalCostRow {
  costCodeId: string;
  costCodeDescription: string;
  costType: string;
  averageUnitCost: number;
  minUnitCost: number;
  maxUnitCost: number;
  totalQuantity: number;
  jobCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// EstimatingService
// ---------------------------------------------------------------------------

export class EstimatingService {
  constructor(
    private estimates: Collection<Estimate>,
    private estimateLines: Collection<EstimateLine>,
    private bids: Collection<Bid>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // ESTIMATE CRUD
  // ========================================================================

  /**
   * Create a new estimate.
   * Validates jobId is provided. Defaults: revision=1, status='draft',
   * all totals=0, transferredToBudget=false, defaultMarkupPct=0.
   */
  async createEstimate(data: {
    jobId: string;
    name: string;
    revision?: number;
    status?: EstimateStatus;
    bidDate?: string;
    submittedDate?: string;
    clientName?: string;
    projectName?: string;
    description?: string;
    createdBy?: string;
    defaultMarkupPct?: number;
  }): Promise<Estimate & CollectionMeta> {
    if (!data.jobId) {
      throw new Error('Estimate must be linked to a job.');
    }

    if (!data.name || data.name.trim() === '') {
      throw new Error('Estimate name is required.');
    }

    const record = await this.estimates.insert({
      jobId: data.jobId,
      name: data.name,
      revision: data.revision ?? 1,
      status: data.status ?? 'draft',
      totalCost: 0,
      totalMarkup: 0,
      totalPrice: 0,
      marginPct: 0,
      bidDate: data.bidDate,
      submittedDate: data.submittedDate,
      clientName: data.clientName,
      projectName: data.projectName,
      description: data.description,
      createdBy: data.createdBy,
      defaultMarkupPct: data.defaultMarkupPct ?? 0,
      transferredToBudget: false,
    } as Estimate);

    this.events.emit('estimating.estimate.created', { estimate: record });
    return record;
  }

  /**
   * Update an existing estimate.
   */
  async updateEstimate(
    id: string,
    changes: Partial<Estimate>,
  ): Promise<Estimate & CollectionMeta> {
    const existing = await this.estimates.get(id);
    if (!existing) {
      throw new Error(`Estimate not found: ${id}`);
    }

    const updated = await this.estimates.update(id, changes as Partial<Estimate>);
    this.events.emit('estimating.estimate.updated', { estimate: updated });
    return updated;
  }

  /**
   * Get a single estimate by ID.
   */
  async getEstimate(id: string): Promise<(Estimate & CollectionMeta) | null> {
    return this.estimates.get(id);
  }

  /**
   * Get estimates with optional filters, ordered by creation date descending.
   */
  async getEstimates(filters?: {
    jobId?: string;
    status?: EstimateStatus;
    clientName?: string;
  }): Promise<(Estimate & CollectionMeta)[]> {
    const q = this.estimates.query();

    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.clientName) {
      q.where('clientName', '=', filters.clientName);
    }

    q.orderBy('createdAt', 'desc');
    return q.execute();
  }

  /**
   * Soft-delete an estimate.
   * Only draft or withdrawn estimates can be deleted.
   */
  async deleteEstimate(id: string): Promise<void> {
    const existing = await this.estimates.get(id);
    if (!existing) {
      throw new Error(`Estimate not found: ${id}`);
    }

    if (existing.status !== 'draft' && existing.status !== 'withdrawn') {
      throw new Error(
        `Cannot delete estimate: status is "${existing.status}". Only draft or withdrawn estimates can be deleted.`,
      );
    }

    await this.estimates.remove(id);
    this.events.emit('estimating.estimate.deleted', { estimateId: id });
  }

  /**
   * Create a new revision of an existing estimate.
   * Copies all lines from the source estimate into a new estimate with
   * revision number incremented by 1.
   */
  async createRevision(
    sourceEstimateId: string,
    createdBy?: string,
  ): Promise<Estimate & CollectionMeta> {
    const source = await this.estimates.get(sourceEstimateId);
    if (!source) {
      throw new Error(`Source estimate not found: ${sourceEstimateId}`);
    }

    // Create new estimate with incremented revision
    const newEstimate = await this.estimates.insert({
      jobId: source.jobId,
      name: source.name,
      revision: source.revision + 1,
      status: 'draft',
      totalCost: source.totalCost,
      totalMarkup: source.totalMarkup,
      totalPrice: source.totalPrice,
      marginPct: source.marginPct,
      bidDate: source.bidDate,
      submittedDate: undefined,
      clientName: source.clientName,
      projectName: source.projectName,
      description: source.description,
      createdBy: createdBy ?? source.createdBy,
      defaultMarkupPct: source.defaultMarkupPct,
      transferredToBudget: false,
    } as Estimate);

    // Copy all lines from the source estimate
    const sourceLines = await this.estimateLines
      .query()
      .where('estimateId', '=', sourceEstimateId)
      .orderBy('sortOrder', 'asc')
      .execute();

    // Build a map from old line IDs to new line IDs for parent references
    const idMap = new Map<string, string>();

    // First pass: insert all lines and record ID mapping
    for (const line of sourceLines) {
      const newLine = await this.estimateLines.insert({
        estimateId: newEstimate.id,
        parentId: undefined, // Will be fixed in second pass
        costCodeId: line.costCodeId,
        description: line.description,
        costType: line.costType,
        quantity: line.quantity,
        unit: line.unit,
        unitCost: line.unitCost,
        amount: line.amount,
        markupPct: line.markupPct,
        markupAmount: line.markupAmount,
        totalPrice: line.totalPrice,
        isAssembly: line.isAssembly,
        assemblyName: line.assemblyName,
        sortOrder: line.sortOrder,
        isAlternate: line.isAlternate,
        isAllowance: line.isAllowance,
        alternateGroup: line.alternateGroup,
      } as EstimateLine);
      idMap.set(line.id, newLine.id);
    }

    // Second pass: fix parentId references
    for (const line of sourceLines) {
      if (line.parentId) {
        const newLineId = idMap.get(line.id);
        const newParentId = idMap.get(line.parentId);
        if (newLineId && newParentId) {
          await this.estimateLines.update(newLineId, {
            parentId: newParentId,
          } as Partial<EstimateLine>);
        }
      }
    }

    this.events.emit('estimating.estimate.revised', {
      sourceEstimateId,
      newEstimate,
    });

    return newEstimate;
  }

  /**
   * Submit an estimate. Validates it is in draft status.
   * Sets status to 'submitted' and records the submitted date.
   */
  async submitEstimate(id: string): Promise<Estimate & CollectionMeta> {
    const estimate = await this.estimates.get(id);
    if (!estimate) {
      throw new Error(`Estimate not found: ${id}`);
    }

    if (estimate.status !== 'draft') {
      throw new Error(
        `Estimate cannot be submitted: current status is "${estimate.status}". Must be in "draft" status.`,
      );
    }

    const updated = await this.estimates.update(id, {
      status: 'submitted',
      submittedDate: now(),
    } as Partial<Estimate>);

    this.events.emit('estimating.estimate.submitted', { estimate: updated });
    return updated;
  }

  // ========================================================================
  // ESTIMATE LINE MANAGEMENT
  // ========================================================================

  /**
   * Add a line item to an estimate.
   * Calculates amount from quantity * unitCost, markupAmount from
   * amount * markupPct / 100, and totalPrice from amount + markupAmount.
   * After adding the line, recalculates the estimate totals.
   */
  async addEstimateLine(data: {
    estimateId: string;
    parentId?: string;
    costCodeId?: string;
    description: string;
    costType: EstimateLineCostType;
    quantity?: number;
    unit?: string;
    unitCost?: number;
    amount?: number;
    markupPct?: number;
    isAssembly?: boolean;
    assemblyName?: string;
    sortOrder?: number;
    isAlternate?: boolean;
    isAllowance?: boolean;
    alternateGroup?: string;
  }): Promise<EstimateLine & CollectionMeta> {
    // Validate estimate exists
    const estimate = await this.estimates.get(data.estimateId);
    if (!estimate) {
      throw new Error(`Estimate not found: ${data.estimateId}`);
    }

    const quantity = data.quantity ?? 0;
    const unitCost = data.unitCost ?? 0;
    const amount = data.amount !== undefined ? round2(data.amount) : round2(quantity * unitCost);
    const markupPct = data.markupPct ?? estimate.defaultMarkupPct ?? 0;
    const markupAmount = round2(amount * markupPct / 100);
    const totalPrice = round2(amount + markupAmount);

    // Determine sort order if not provided
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const existingLines = await this.estimateLines
        .query()
        .where('estimateId', '=', data.estimateId)
        .execute();
      sortOrder = existingLines.length > 0
        ? Math.max(...existingLines.map((l) => l.sortOrder ?? 0)) + 10
        : 10;
    }

    const record = await this.estimateLines.insert({
      estimateId: data.estimateId,
      parentId: data.parentId,
      costCodeId: data.costCodeId,
      description: data.description,
      costType: data.costType,
      quantity,
      unit: data.unit,
      unitCost,
      amount,
      markupPct,
      markupAmount,
      totalPrice,
      isAssembly: data.isAssembly ?? false,
      assemblyName: data.assemblyName,
      sortOrder,
      isAlternate: data.isAlternate ?? false,
      isAllowance: data.isAllowance ?? false,
      alternateGroup: data.alternateGroup,
    } as EstimateLine);

    // Recalculate estimate totals
    await this.recalculateEstimateTotals(data.estimateId);

    return record;
  }

  /**
   * Update an existing estimate line.
   * Recalculates computed fields and estimate totals.
   */
  async updateEstimateLine(
    id: string,
    changes: Partial<EstimateLine>,
  ): Promise<EstimateLine & CollectionMeta> {
    const existing = await this.estimateLines.get(id);
    if (!existing) {
      throw new Error(`Estimate line not found: ${id}`);
    }

    // Merge and recalculate
    const quantity = changes.quantity !== undefined ? changes.quantity : existing.quantity;
    const unitCost = changes.unitCost !== undefined ? changes.unitCost : existing.unitCost;
    const amount = changes.amount !== undefined ? round2(changes.amount) : round2(quantity * unitCost);
    const markupPct = changes.markupPct !== undefined ? changes.markupPct : existing.markupPct;
    const markupAmount = round2(amount * markupPct / 100);
    const totalPrice = round2(amount + markupAmount);

    const mergedChanges: Partial<EstimateLine> = {
      ...changes,
      quantity,
      unitCost,
      amount,
      markupPct,
      markupAmount,
      totalPrice,
    };

    const updated = await this.estimateLines.update(id, mergedChanges as Partial<EstimateLine>);

    // Recalculate estimate totals
    await this.recalculateEstimateTotals(existing.estimateId);

    return updated;
  }

  /**
   * Remove an estimate line. Also removes child lines if it is an assembly.
   * Recalculates estimate totals after removal.
   */
  async removeEstimateLine(id: string): Promise<void> {
    const existing = await this.estimateLines.get(id);
    if (!existing) {
      throw new Error(`Estimate line not found: ${id}`);
    }

    // If this is an assembly, remove all child lines
    if (existing.isAssembly) {
      const children = await this.estimateLines
        .query()
        .where('parentId', '=', id)
        .execute();
      for (const child of children) {
        await this.estimateLines.remove(child.id);
      }
    }

    await this.estimateLines.remove(id);

    // Recalculate estimate totals
    await this.recalculateEstimateTotals(existing.estimateId);
  }

  /**
   * Get all lines for an estimate, ordered by sortOrder.
   */
  async getEstimateLines(
    estimateId: string,
  ): Promise<(EstimateLine & CollectionMeta)[]> {
    return this.estimateLines
      .query()
      .where('estimateId', '=', estimateId)
      .orderBy('sortOrder', 'asc')
      .execute();
  }

  /**
   * Reorder estimate lines by setting their sortOrder values.
   */
  async reorderEstimateLines(
    lineOrders: { id: string; sortOrder: number }[],
  ): Promise<void> {
    for (const item of lineOrders) {
      await this.estimateLines.update(item.id, {
        sortOrder: item.sortOrder,
      } as Partial<EstimateLine>);
    }
  }

  // ========================================================================
  // ASSEMBLY MANAGEMENT
  // ========================================================================

  /**
   * Create an assembly (grouping) line and optionally move existing lines
   * under it as children.
   */
  async createAssembly(data: {
    estimateId: string;
    assemblyName: string;
    description: string;
    costType?: EstimateLineCostType;
    childLineIds?: string[];
    sortOrder?: number;
  }): Promise<EstimateLine & CollectionMeta> {
    const assembly = await this.addEstimateLine({
      estimateId: data.estimateId,
      description: data.description,
      costType: data.costType ?? 'other',
      isAssembly: true,
      assemblyName: data.assemblyName,
      sortOrder: data.sortOrder,
      quantity: 0,
      unitCost: 0,
      amount: 0,
      markupPct: 0,
    });

    // Move child lines under this assembly
    if (data.childLineIds && data.childLineIds.length > 0) {
      for (const childId of data.childLineIds) {
        await this.estimateLines.update(childId, {
          parentId: assembly.id,
        } as Partial<EstimateLine>);
      }
    }

    // Recalculate assembly totals
    await this.recalculateAssemblyTotals(assembly.id);

    return assembly;
  }

  /**
   * Recalculate an assembly line's totals from its children.
   */
  async recalculateAssemblyTotals(
    assemblyId: string,
  ): Promise<EstimateLine & CollectionMeta> {
    const assembly = await this.estimateLines.get(assemblyId);
    if (!assembly) {
      throw new Error(`Assembly line not found: ${assemblyId}`);
    }

    const children = await this.estimateLines
      .query()
      .where('parentId', '=', assemblyId)
      .execute();

    const totalAmount = round2(children.reduce((sum, c) => sum + (c.amount ?? 0), 0));
    const totalMarkup = round2(children.reduce((sum, c) => sum + (c.markupAmount ?? 0), 0));
    const totalPrice = round2(children.reduce((sum, c) => sum + (c.totalPrice ?? 0), 0));
    const markupPct = totalAmount > 0 ? round2((totalMarkup / totalAmount) * 100) : 0;

    const updated = await this.estimateLines.update(assemblyId, {
      amount: totalAmount,
      markupPct,
      markupAmount: totalMarkup,
      totalPrice,
    } as Partial<EstimateLine>);

    return updated;
  }

  // ========================================================================
  // MARKUP & MARGIN CALCULATION
  // ========================================================================

  /**
   * Apply a markup percentage to all lines in an estimate.
   */
  async applyOverallMarkup(
    estimateId: string,
    markupPct: number,
  ): Promise<void> {
    const lines = await this.estimateLines
      .query()
      .where('estimateId', '=', estimateId)
      .execute();

    for (const line of lines) {
      if (line.isAssembly) continue; // Skip assemblies, they aggregate

      const markupAmount = round2(line.amount * markupPct / 100);
      const totalPrice = round2(line.amount + markupAmount);

      await this.estimateLines.update(line.id, {
        markupPct,
        markupAmount,
        totalPrice,
      } as Partial<EstimateLine>);
    }

    // Recalculate assembly totals for any assemblies
    const assemblies = lines.filter((l) => l.isAssembly);
    for (const assembly of assemblies) {
      await this.recalculateAssemblyTotals(assembly.id);
    }

    // Update the estimate default markup and totals
    await this.estimates.update(estimateId, {
      defaultMarkupPct: markupPct,
    } as Partial<Estimate>);

    await this.recalculateEstimateTotals(estimateId);
  }

  /**
   * Apply a markup percentage to all lines of a specific cost type.
   */
  async applyCategoryMarkup(
    estimateId: string,
    costType: EstimateLineCostType,
    markupPct: number,
  ): Promise<void> {
    const lines = await this.estimateLines
      .query()
      .where('estimateId', '=', estimateId)
      .where('costType', '=', costType)
      .execute();

    for (const line of lines) {
      if (line.isAssembly) continue;

      const markupAmount = round2(line.amount * markupPct / 100);
      const totalPrice = round2(line.amount + markupAmount);

      await this.estimateLines.update(line.id, {
        markupPct,
        markupAmount,
        totalPrice,
      } as Partial<EstimateLine>);
    }

    // Recalculate all assemblies and estimate totals
    const allLines = await this.estimateLines
      .query()
      .where('estimateId', '=', estimateId)
      .execute();

    const assemblies = allLines.filter((l) => l.isAssembly);
    for (const assembly of assemblies) {
      await this.recalculateAssemblyTotals(assembly.id);
    }

    await this.recalculateEstimateTotals(estimateId);
  }

  /**
   * Recalculate estimate totals from all non-alternate, non-assembly lines.
   * Alternates are excluded from the total unless they are the only option.
   */
  async recalculateEstimateTotals(estimateId: string): Promise<Estimate & CollectionMeta> {
    const lines = await this.estimateLines
      .query()
      .where('estimateId', '=', estimateId)
      .execute();

    // Include lines that are not alternates and not assemblies
    // (assembly totals are informational; their children are already counted)
    const includedLines = lines.filter(
      (l) => !l.isAlternate && !l.isAssembly,
    );

    const totalCost = round2(includedLines.reduce((sum, l) => sum + (l.amount ?? 0), 0));
    const totalMarkup = round2(includedLines.reduce((sum, l) => sum + (l.markupAmount ?? 0), 0));
    const totalPrice = round2(includedLines.reduce((sum, l) => sum + (l.totalPrice ?? 0), 0));
    const marginPct = totalPrice > 0 ? round2((totalMarkup / totalPrice) * 100) : 0;

    const updated = await this.estimates.update(estimateId, {
      totalCost,
      totalMarkup,
      totalPrice,
      marginPct,
    } as Partial<Estimate>);

    return updated;
  }

  // ========================================================================
  // BID SOLICITATION & TRACKING
  // ========================================================================

  /**
   * Create a bid solicitation (request for bid from a vendor/sub).
   * Defaults: status='solicited', isLowBid=false, amount=0.
   */
  async createBid(data: {
    estimateId: string;
    vendorId?: string;
    trade: string;
    description?: string;
    amount?: number;
    status?: BidStatus;
    expirationDate?: string;
    notes?: string;
    scopeInclusions?: string;
    scopeExclusions?: string;
    bondIncluded?: boolean;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
  }): Promise<Bid & CollectionMeta> {
    // Validate estimate exists
    const estimate = await this.estimates.get(data.estimateId);
    if (!estimate) {
      throw new Error(`Estimate not found: ${data.estimateId}`);
    }

    if (!data.trade || data.trade.trim() === '') {
      throw new Error('Trade is required for a bid.');
    }

    const record = await this.bids.insert({
      estimateId: data.estimateId,
      vendorId: data.vendorId,
      trade: data.trade,
      description: data.description,
      amount: round2(data.amount ?? 0),
      status: data.status ?? 'solicited',
      receivedDate: undefined,
      expirationDate: data.expirationDate,
      notes: data.notes,
      isLowBid: false,
      scopeInclusions: data.scopeInclusions,
      scopeExclusions: data.scopeExclusions,
      bondIncluded: data.bondIncluded,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
    } as Bid);

    return record;
  }

  /**
   * Record a received bid. Updates status to 'received', records the
   * received date, sets the amount, and recalculates low bid flags for
   * the trade.
   */
  async receiveBid(
    id: string,
    amount: number,
    receivedDate?: string,
    notes?: string,
  ): Promise<Bid & CollectionMeta> {
    const existing = await this.bids.get(id);
    if (!existing) {
      throw new Error(`Bid not found: ${id}`);
    }

    const updated = await this.bids.update(id, {
      amount: round2(amount),
      status: 'received',
      receivedDate: receivedDate ?? now(),
      notes: notes ?? existing.notes,
    } as Partial<Bid>);

    // Recalculate low bid flags for this trade
    await this.recalculateLowBid(existing.estimateId, existing.trade);

    this.events.emit('estimating.bid.received', { bid: updated });
    return updated;
  }

  /**
   * Update an existing bid.
   */
  async updateBid(
    id: string,
    changes: Partial<Bid>,
  ): Promise<Bid & CollectionMeta> {
    const existing = await this.bids.get(id);
    if (!existing) {
      throw new Error(`Bid not found: ${id}`);
    }

    const updated = await this.bids.update(id, changes as Partial<Bid>);

    // If amount changed, recalculate low bid
    if (changes.amount !== undefined) {
      await this.recalculateLowBid(existing.estimateId, existing.trade);
    }

    return updated;
  }

  /**
   * Select a bid (mark as selected and reject all other received bids
   * for the same trade).
   */
  async selectBid(id: string): Promise<Bid & CollectionMeta> {
    const existing = await this.bids.get(id);
    if (!existing) {
      throw new Error(`Bid not found: ${id}`);
    }

    if (existing.status !== 'received') {
      throw new Error(
        `Bid cannot be selected: current status is "${existing.status}". Must be "received".`,
      );
    }

    // Reject all other received bids for this trade on this estimate
    const tradeBids = await this.bids
      .query()
      .where('estimateId', '=', existing.estimateId)
      .where('trade', '=', existing.trade)
      .execute();

    for (const bid of tradeBids) {
      if (bid.id !== id && bid.status === 'received') {
        await this.bids.update(bid.id, {
          status: 'rejected',
        } as Partial<Bid>);
      }
    }

    const updated = await this.bids.update(id, {
      status: 'selected',
    } as Partial<Bid>);

    return updated;
  }

  /**
   * Get all bids for an estimate.
   */
  async getBids(filters?: {
    estimateId?: string;
    trade?: string;
    status?: BidStatus;
    vendorId?: string;
  }): Promise<(Bid & CollectionMeta)[]> {
    const q = this.bids.query();

    if (filters?.estimateId) {
      q.where('estimateId', '=', filters.estimateId);
    }
    if (filters?.trade) {
      q.where('trade', '=', filters.trade);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.vendorId) {
      q.where('vendorId', '=', filters.vendorId);
    }

    q.orderBy('trade', 'asc');
    return q.execute();
  }

  /**
   * Get a single bid by ID.
   */
  async getBid(id: string): Promise<(Bid & CollectionMeta) | null> {
    return this.bids.get(id);
  }

  // ========================================================================
  // BID TABULATION
  // ========================================================================

  /**
   * Generate a bid tabulation report for an estimate.
   * Groups received bids by trade, identifies low bidder, and calculates
   * statistics per trade.
   */
  async getBidTabulation(
    estimateId: string,
  ): Promise<BidTabulationRow[]> {
    const allBids = await this.bids
      .query()
      .where('estimateId', '=', estimateId)
      .execute();

    // Group bids by trade
    const tradeMap = new Map<string, (Bid & CollectionMeta)[]>();
    for (const bid of allBids) {
      const trade = bid.trade;
      if (!tradeMap.has(trade)) {
        tradeMap.set(trade, []);
      }
      tradeMap.get(trade)!.push(bid);
    }

    const rows: BidTabulationRow[] = [];

    for (const [trade, bids] of tradeMap) {
      // Only consider received/selected bids for tabulation
      const receivedBids = bids.filter(
        (b) => b.status === 'received' || b.status === 'selected',
      );

      let lowBidId: string | null = null;
      let lowBidAmount: number | null = null;
      let highBidAmount: number | null = null;
      let averageBidAmount = 0;
      let spread = 0;

      if (receivedBids.length > 0) {
        const amounts = receivedBids.map((b) => b.amount).filter((a) => a > 0);
        if (amounts.length > 0) {
          lowBidAmount = Math.min(...amounts);
          highBidAmount = Math.max(...amounts);
          averageBidAmount = round2(amounts.reduce((sum, a) => sum + a, 0) / amounts.length);
          spread = round2(highBidAmount - lowBidAmount);

          const lowBid = receivedBids.find((b) => b.amount === lowBidAmount);
          lowBidId = lowBid ? lowBid.id : null;
        }
      }

      rows.push({
        trade,
        bids,
        lowBidId,
        lowBidAmount,
        highBidAmount,
        averageBidAmount,
        spread,
      });
    }

    // Sort by trade name
    rows.sort((a, b) => a.trade.localeCompare(b.trade));

    return rows;
  }

  /**
   * Recalculate the isLowBid flag for all bids in a given trade on an estimate.
   */
  private async recalculateLowBid(
    estimateId: string,
    trade: string,
  ): Promise<void> {
    const tradeBids = await this.bids
      .query()
      .where('estimateId', '=', estimateId)
      .where('trade', '=', trade)
      .execute();

    const receivedBids = tradeBids.filter(
      (b) => b.status === 'received' || b.status === 'selected',
    );

    const amounts = receivedBids.map((b) => b.amount).filter((a) => a > 0);
    const lowAmount = amounts.length > 0 ? Math.min(...amounts) : null;

    for (const bid of tradeBids) {
      const isLow = bid.amount === lowAmount && bid.amount > 0 &&
        (bid.status === 'received' || bid.status === 'selected');
      if (bid.isLowBid !== isLow) {
        await this.bids.update(bid.id, {
          isLowBid: isLow,
        } as Partial<Bid>);
      }
    }
  }

  // ========================================================================
  // ESTIMATE-TO-BUDGET TRANSFER
  // ========================================================================

  /**
   * Transfer an estimate to a job budget.
   * Creates budget lines from the non-alternate, non-assembly estimate lines,
   * mapped by costCode and costType. Returns the created budget data
   * (budget ID and lines).
   *
   * NOTE: This method prepares the transfer data. The actual budget
   * creation is delegated to the caller (which has access to the budget
   * collection), unless budget collections are injected.
   */
  async prepareEstimateToBudgetTransfer(
    estimateId: string,
  ): Promise<{
    estimateId: string;
    jobId: string;
    budgetName: string;
    totalAmount: number;
    lines: {
      costCodeId?: string;
      costType: string;
      description: string;
      amount: number;
      quantity: number;
      unitCost: number;
    }[];
  }> {
    const estimate = await this.estimates.get(estimateId);
    if (!estimate) {
      throw new Error(`Estimate not found: ${estimateId}`);
    }

    if (estimate.transferredToBudget) {
      throw new Error('Estimate has already been transferred to a budget.');
    }

    if (estimate.status !== 'won' && estimate.status !== 'draft') {
      throw new Error(
        `Estimate must be in "won" or "draft" status to transfer. Current status: "${estimate.status}".`,
      );
    }

    const lines = await this.estimateLines
      .query()
      .where('estimateId', '=', estimateId)
      .execute();

    // Only include non-alternate, non-assembly lines
    const budgetLines = lines
      .filter((l) => !l.isAlternate && !l.isAssembly)
      .map((l) => ({
        costCodeId: l.costCodeId,
        costType: l.costType,
        description: l.description,
        amount: l.amount,
        quantity: l.quantity,
        unitCost: l.unitCost,
      }));

    const totalAmount = round2(budgetLines.reduce((sum, l) => sum + l.amount, 0));

    return {
      estimateId,
      jobId: estimate.jobId,
      budgetName: `Budget from Estimate: ${estimate.name} Rev ${estimate.revision}`,
      totalAmount,
      lines: budgetLines,
    };
  }

  /**
   * Mark an estimate as transferred to budget.
   */
  async markAsTransferred(
    estimateId: string,
    budgetId: string,
  ): Promise<Estimate & CollectionMeta> {
    const estimate = await this.estimates.get(estimateId);
    if (!estimate) {
      throw new Error(`Estimate not found: ${estimateId}`);
    }

    const updated = await this.estimates.update(estimateId, {
      transferredToBudget: true,
      budgetId,
    } as Partial<Estimate>);

    this.events.emit('estimating.budget.transferred', {
      estimateId,
      budgetId,
    });

    return updated;
  }

  // ========================================================================
  // WIN/LOSS TRACKING
  // ========================================================================

  /**
   * Mark an estimate as won.
   */
  async markAsWon(id: string): Promise<Estimate & CollectionMeta> {
    const estimate = await this.estimates.get(id);
    if (!estimate) {
      throw new Error(`Estimate not found: ${id}`);
    }

    if (estimate.status !== 'submitted') {
      throw new Error(
        `Estimate must be in "submitted" status to mark as won. Current status: "${estimate.status}".`,
      );
    }

    const updated = await this.estimates.update(id, {
      status: 'won',
      wonDate: now(),
    } as Partial<Estimate>);

    this.events.emit('estimating.estimate.won', { estimate: updated });
    return updated;
  }

  /**
   * Mark an estimate as lost with optional reason and competitor info.
   */
  async markAsLost(
    id: string,
    lostReason?: string,
    competitorName?: string,
    competitorPrice?: number,
  ): Promise<Estimate & CollectionMeta> {
    const estimate = await this.estimates.get(id);
    if (!estimate) {
      throw new Error(`Estimate not found: ${id}`);
    }

    if (estimate.status !== 'submitted') {
      throw new Error(
        `Estimate must be in "submitted" status to mark as lost. Current status: "${estimate.status}".`,
      );
    }

    const updated = await this.estimates.update(id, {
      status: 'lost',
      lostDate: now(),
      lostReason,
      competitorName,
      competitorPrice: competitorPrice !== undefined ? round2(competitorPrice) : undefined,
    } as Partial<Estimate>);

    this.events.emit('estimating.estimate.lost', { estimate: updated });
    return updated;
  }

  /**
   * Withdraw an estimate.
   */
  async withdrawEstimate(id: string): Promise<Estimate & CollectionMeta> {
    const estimate = await this.estimates.get(id);
    if (!estimate) {
      throw new Error(`Estimate not found: ${id}`);
    }

    if (estimate.status !== 'draft' && estimate.status !== 'submitted') {
      throw new Error(
        `Estimate cannot be withdrawn: current status is "${estimate.status}".`,
      );
    }

    const updated = await this.estimates.update(id, {
      status: 'withdrawn',
    } as Partial<Estimate>);

    return updated;
  }

  /**
   * Get win/loss statistics across all estimates, optionally filtered by
   * job or time range.
   */
  async getWinLossStats(filters?: {
    jobId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<WinLossStats> {
    const q = this.estimates.query();

    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }

    const allEstimates = await q.execute();

    // Apply date filter on submittedDate
    let filteredEstimates = allEstimates;
    if (filters?.fromDate) {
      filteredEstimates = filteredEstimates.filter(
        (e) => e.submittedDate && e.submittedDate >= filters.fromDate!,
      );
    }
    if (filters?.toDate) {
      filteredEstimates = filteredEstimates.filter(
        (e) => e.submittedDate && e.submittedDate <= filters.toDate!,
      );
    }

    const won = filteredEstimates.filter((e) => e.status === 'won');
    const lost = filteredEstimates.filter((e) => e.status === 'lost');
    const pending = filteredEstimates.filter(
      (e) => e.status === 'submitted' || e.status === 'draft',
    );

    const totalWonValue = round2(won.reduce((sum, e) => sum + (e.totalPrice ?? 0), 0));
    const totalLostValue = round2(lost.reduce((sum, e) => sum + (e.totalPrice ?? 0), 0));

    const averageMarginWon = won.length > 0
      ? round2(won.reduce((sum, e) => sum + (e.marginPct ?? 0), 0) / won.length)
      : 0;
    const averageMarginLost = lost.length > 0
      ? round2(lost.reduce((sum, e) => sum + (e.marginPct ?? 0), 0) / lost.length)
      : 0;

    const decidedCount = won.length + lost.length;
    const winRate = decidedCount > 0 ? round2((won.length / decidedCount) * 100) : 0;

    return {
      totalEstimates: filteredEstimates.length,
      totalWon: won.length,
      totalLost: lost.length,
      totalPending: pending.length,
      winRate,
      totalWonValue,
      totalLostValue,
      averageMarginWon,
      averageMarginLost,
    };
  }

  // ========================================================================
  // HISTORICAL COST DATABASE
  // ========================================================================

  /**
   * Look up historical costs from completed estimate lines grouped by
   * cost code and cost type. This provides average, min, and max unit
   * costs from actual winning estimates (status = 'won').
   */
  async getHistoricalCosts(filters?: {
    costCodeId?: string;
    costType?: EstimateLineCostType;
  }): Promise<HistoricalCostRow[]> {
    // Get all won estimates
    const wonEstimates = await this.estimates
      .query()
      .where('status', '=', 'won')
      .execute();

    if (wonEstimates.length === 0) {
      return [];
    }

    const wonEstimateIds = new Set(wonEstimates.map((e) => e.id));

    // Get all lines from won estimates
    const allLines = await this.estimateLines.query().execute();
    let wonLines = allLines.filter(
      (l) => wonEstimateIds.has(l.estimateId) && !l.isAssembly && !l.isAlternate,
    );

    // Apply filters
    if (filters?.costCodeId) {
      wonLines = wonLines.filter((l) => l.costCodeId === filters.costCodeId);
    }
    if (filters?.costType) {
      wonLines = wonLines.filter((l) => l.costType === filters.costType);
    }

    // Group by costCodeId + costType
    const groupMap = new Map<
      string,
      {
        costCodeId: string;
        costType: string;
        unitCosts: number[];
        quantities: number[];
        jobIds: Set<string>;
      }
    >();

    for (const line of wonLines) {
      const key = `${line.costCodeId ?? 'none'}|${line.costType}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          costCodeId: line.costCodeId ?? '',
          costType: line.costType,
          unitCosts: [],
          quantities: [],
          jobIds: new Set<string>(),
        });
      }

      const group = groupMap.get(key)!;
      if (line.unitCost > 0) {
        group.unitCosts.push(line.unitCost);
      }
      group.quantities.push(line.quantity ?? 0);

      // Find the estimate to get the jobId
      const estimate = wonEstimates.find((e) => e.id === line.estimateId);
      if (estimate) {
        group.jobIds.add(estimate.jobId);
      }
    }

    const rows: HistoricalCostRow[] = [];

    for (const [, group] of groupMap) {
      const unitCosts = group.unitCosts;
      const averageUnitCost = unitCosts.length > 0
        ? round2(unitCosts.reduce((sum, c) => sum + c, 0) / unitCosts.length)
        : 0;
      const minUnitCost = unitCosts.length > 0 ? Math.min(...unitCosts) : 0;
      const maxUnitCost = unitCosts.length > 0 ? Math.max(...unitCosts) : 0;
      const totalQuantity = round2(group.quantities.reduce((sum, q) => sum + q, 0));

      rows.push({
        costCodeId: group.costCodeId,
        costCodeDescription: '', // Caller can enrich with cost code lookup
        costType: group.costType,
        averageUnitCost,
        minUnitCost,
        maxUnitCost,
        totalQuantity,
        jobCount: group.jobIds.size,
      });
    }

    // Sort by costCodeId then costType
    rows.sort((a, b) => {
      const codeCmp = a.costCodeId.localeCompare(b.costCodeId);
      if (codeCmp !== 0) return codeCmp;
      return a.costType.localeCompare(b.costType);
    });

    return rows;
  }

  // ========================================================================
  // CSV IMPORT
  // ========================================================================

  /**
   * Import estimate lines from parsed CSV rows.
   * Each row should contain: description, costType, quantity, unit,
   * unitCost, and optionally markupPct and costCodeId.
   */
  async importEstimateLines(
    estimateId: string,
    rows: {
      description: string;
      costType: EstimateLineCostType;
      quantity?: number;
      unit?: string;
      unitCost?: number;
      amount?: number;
      markupPct?: number;
      costCodeId?: string;
      isAlternate?: boolean;
      isAllowance?: boolean;
      alternateGroup?: string;
    }[],
  ): Promise<(EstimateLine & CollectionMeta)[]> {
    const estimate = await this.estimates.get(estimateId);
    if (!estimate) {
      throw new Error(`Estimate not found: ${estimateId}`);
    }

    const createdLines: (EstimateLine & CollectionMeta)[] = [];

    // Get the current max sort order
    const existingLines = await this.estimateLines
      .query()
      .where('estimateId', '=', estimateId)
      .execute();
    let nextSortOrder = existingLines.length > 0
      ? Math.max(...existingLines.map((l) => l.sortOrder ?? 0)) + 10
      : 10;

    for (const row of rows) {
      const line = await this.addEstimateLine({
        estimateId,
        description: row.description,
        costType: row.costType,
        quantity: row.quantity,
        unit: row.unit,
        unitCost: row.unitCost,
        amount: row.amount,
        markupPct: row.markupPct,
        costCodeId: row.costCodeId,
        sortOrder: nextSortOrder,
        isAlternate: row.isAlternate,
        isAllowance: row.isAllowance,
        alternateGroup: row.alternateGroup,
      });
      createdLines.push(line);
      nextSortOrder += 10;
    }

    return createdLines;
  }
}
