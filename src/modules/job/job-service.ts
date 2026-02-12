/**
 * Concrete -- Job Costing Service (Job Cost Business Logic)
 *
 * Core service layer for the Job Costing module. Provides job management,
 * cost code hierarchy, budget creation/approval, actual cost posting,
 * committed cost tracking, change order workflow, and WIP schedule
 * generation using the cost-to-cost percentage-of-completion method.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';
import { now } from '../../core/types/base';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type JobType = 'lump_sum' | 'time_material' | 'cost_plus' | 'unit_price' | 'design_build' | 'gmp';
export type JobStatus = 'bidding' | 'awarded' | 'active' | 'complete' | 'closed';
export type CostType = 'labor' | 'material' | 'subcontract' | 'equipment' | 'other' | 'overhead';
export type CostSource = 'ap' | 'payroll' | 'equipment' | 'je' | 'manual';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Job {
  [key: string]: unknown;
  number: string;
  name: string;
  type: JobType;
  status: JobStatus;
  customerId?: string;
  entityId?: string;
  description?: string;
  contractAmount: number;
  startDate?: string;
  endDate?: string;
  completionDate?: string;
  ownerName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  projectManagerId?: string;
  superintendentId?: string;
  retentionPct: number;
  percentComplete: number;
  totalBudget: number;
  totalActualCost: number;
  totalCommitted: number;
  totalBilled: number;
}

export interface CostCode {
  [key: string]: unknown;
  code: string;
  description: string;
  parentId?: string;
  isStandard: boolean;
  depth: number;
}

export interface Budget {
  [key: string]: unknown;
  jobId: string;
  name: string;
  status: 'draft' | 'approved' | 'revised';
  revision: number;
  totalAmount: number;
  approvedAt?: string;
  approvedBy?: string;
}

export interface BudgetLine {
  [key: string]: unknown;
  budgetId: string;
  jobId: string;
  costCodeId: string;
  costType: CostType;
  amount: number;
  description?: string;
  quantity?: number;
  unitCost?: number;
}

export interface ActualCost {
  [key: string]: unknown;
  jobId: string;
  costCodeId: string;
  costType: CostType;
  date: string;
  amount: number;
  description?: string;
  source: CostSource;
  sourceId?: string;
  vendorName?: string;
  invoiceNumber?: string;
  quantity?: number;
  unitCost?: number;
}

export interface CommittedCost {
  [key: string]: unknown;
  jobId: string;
  costCodeId: string;
  costType: CostType;
  type: 'purchase_order' | 'subcontract';
  referenceNumber?: string;
  vendorName?: string;
  amount: number;
  invoicedAmount: number;
  remainingAmount: number;
  date: string;
  description?: string;
  status: 'open' | 'partial' | 'closed' | 'cancelled';
}

export interface WipSchedule {
  [key: string]: unknown;
  jobId: string;
  periodId?: string;
  periodName?: string;
  contractAmount: number;
  totalBudget: number;
  actualCostToDate: number;
  estimateToComplete: number;
  estimateAtCompletion: number;
  percentComplete: number;
  earnedRevenue: number;
  billedToDate: number;
  overUnderBilling: number;
  projectedGrossProfit: number;
  projectedMarginPct: number;
}

export interface ChangeOrder {
  [key: string]: unknown;
  jobId: string;
  number: string;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  date?: string;
  approvedAt?: string;
}

// ---------------------------------------------------------------------------
// Report Types
// ---------------------------------------------------------------------------

export interface JobCostDetailRow {
  costCodeId: string;
  costCode: string;
  costCodeDescription: string;
  costType: CostType;
  budgetAmount: number;
  actualAmount: number;
  committedAmount: number;
  estimateToComplete: number;
  estimateAtCompletion: number;
  variance: number;
}

export interface JobProfitabilitySummary {
  jobId: string;
  jobNumber: string;
  jobName: string;
  contractAmount: number;
  approvedChangeOrders: number;
  revisedContract: number;
  totalBudget: number;
  actualCostToDate: number;
  committedCost: number;
  projectedCost: number;
  projectedProfit: number;
  projectedMarginPct: number;
  percentComplete: number;
}

// ---------------------------------------------------------------------------
// JobService
// ---------------------------------------------------------------------------

export class JobService {
  constructor(
    private jobs: Collection<Job>,
    private costCodes: Collection<CostCode>,
    private budgets: Collection<Budget>,
    private budgetLines: Collection<BudgetLine>,
    private actualCosts: Collection<ActualCost>,
    private committedCosts: Collection<CommittedCost>,
    private wipSchedules: Collection<WipSchedule>,
    private changeOrders: Collection<ChangeOrder>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // JOB CRUD
  // ========================================================================

  /**
   * Create a new job.
   * Validates job number uniqueness. Defaults: status='active',
   * contractAmount=0, retentionPct=0, percentComplete=0, all totals=0.
   */
  async createJob(data: {
    number: string;
    name: string;
    type: JobType;
    status?: JobStatus;
    contractAmount?: number;
    customerId?: string;
    entityId?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    completionDate?: string;
    ownerName?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    projectManagerId?: string;
    superintendentId?: string;
    retentionPct?: number;
  }): Promise<Job & CollectionMeta> {
    // Validate job number uniqueness
    const existing = await this.getJobByNumber(data.number);
    if (existing) {
      throw new Error(`Job number "${data.number}" already exists.`);
    }

    const record = await this.jobs.insert({
      number: data.number,
      name: data.name,
      type: data.type,
      status: data.status ?? 'active',
      contractAmount: data.contractAmount ?? 0,
      customerId: data.customerId,
      entityId: data.entityId,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      completionDate: data.completionDate,
      ownerName: data.ownerName,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      projectManagerId: data.projectManagerId,
      superintendentId: data.superintendentId,
      retentionPct: data.retentionPct ?? 0,
      percentComplete: 0,
      totalBudget: 0,
      totalActualCost: 0,
      totalCommitted: 0,
      totalBilled: 0,
    } as Job);

    this.events.emit('job.created', { job: record });
    return record;
  }

  /**
   * Update an existing job.
   */
  async updateJob(
    id: string,
    changes: Partial<Job>,
  ): Promise<Job & CollectionMeta> {
    const existing = await this.jobs.get(id);
    if (!existing) {
      throw new Error(`Job not found: ${id}`);
    }

    const updated = await this.jobs.update(id, changes as Partial<Job>);
    this.events.emit('job.updated', { job: updated });
    return updated;
  }

  /**
   * Soft-delete a job.
   * Refuses deletion if actual costs have been posted against the job.
   */
  async deleteJob(id: string): Promise<void> {
    const existing = await this.jobs.get(id);
    if (!existing) {
      throw new Error(`Job not found: ${id}`);
    }

    // Check for actual costs
    const costCount = await this.actualCosts
      .query()
      .where('jobId', '=', id)
      .count();

    if (costCount > 0) {
      throw new Error(
        `Cannot delete job: it has ${costCount} actual cost record(s). Close the job instead.`,
      );
    }

    await this.jobs.remove(id);
    this.events.emit('job.deleted', { jobId: id });
  }

  /**
   * Get a single job by ID.
   */
  async getJob(id: string): Promise<(Job & CollectionMeta) | null> {
    return this.jobs.get(id);
  }

  /**
   * Get jobs with optional filters, ordered by job number.
   */
  async getJobs(filters?: {
    status?: JobStatus;
    type?: JobType;
    entityId?: string;
  }): Promise<(Job & CollectionMeta)[]> {
    const q = this.jobs.query();

    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.type) {
      q.where('type', '=', filters.type);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }

    q.orderBy('number', 'asc');
    return q.execute();
  }

  /**
   * Lookup a job by its job number.
   */
  async getJobByNumber(number: string): Promise<(Job & CollectionMeta) | null> {
    const result = await this.jobs
      .query()
      .where('number', '=', number)
      .limit(1)
      .first();
    return result;
  }

  // ========================================================================
  // COST CODE MANAGEMENT
  // ========================================================================

  /**
   * Create a new cost code.
   * Validates code uniqueness and computes depth from parent chain.
   */
  async createCostCode(data: {
    code: string;
    description: string;
    parentId?: string;
    isStandard?: boolean;
  }): Promise<CostCode & CollectionMeta> {
    // Validate code uniqueness
    const existingByCode = await this.costCodes
      .query()
      .where('code', '=', data.code)
      .limit(1)
      .first();

    if (existingByCode) {
      throw new Error(`Cost code "${data.code}" already exists.`);
    }

    // Compute depth from parent chain
    let depth = 0;
    if (data.parentId) {
      const allCodes = await this.costCodes.query().execute();
      let currentParentId: string | undefined = data.parentId;
      const visited = new Set<string>();

      while (currentParentId) {
        if (visited.has(currentParentId)) {
          break; // Prevent infinite loop on circular references
        }
        visited.add(currentParentId);
        const parent = allCodes.find((c) => c.id === currentParentId);
        if (!parent) break;
        depth += 1;
        currentParentId = parent.parentId;
      }
    }

    const record = await this.costCodes.insert({
      code: data.code,
      description: data.description,
      parentId: data.parentId,
      isStandard: data.isStandard ?? false,
      depth,
    } as CostCode);

    this.events.emit('job.costCode.created', { costCode: record });
    return record;
  }

  /**
   * Get cost codes with optional filters, ordered by code.
   */
  async getCostCodes(filters?: {
    isStandard?: boolean;
  }): Promise<(CostCode & CollectionMeta)[]> {
    const q = this.costCodes.query();

    if (filters?.isStandard !== undefined) {
      q.where('isStandard', '=', filters.isStandard);
    }

    q.orderBy('code', 'asc');
    return q.execute();
  }

  /**
   * Get a single cost code by ID.
   */
  async getCostCode(id: string): Promise<(CostCode & CollectionMeta) | null> {
    return this.costCodes.get(id);
  }

  // ========================================================================
  // BUDGET MANAGEMENT
  // ========================================================================

  /**
   * Create a new budget for a job in draft status with revision=1.
   */
  async createBudget(
    jobId: string,
    name: string,
  ): Promise<Budget & CollectionMeta> {
    const job = await this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const record = await this.budgets.insert({
      jobId,
      name,
      status: 'draft',
      revision: 1,
      totalAmount: 0,
    } as Budget);

    this.events.emit('job.budget.created', { budget: record });
    return record;
  }

  /**
   * Add a line item to a budget.
   */
  async addBudgetLine(data: {
    budgetId: string;
    jobId: string;
    costCodeId: string;
    costType: CostType;
    amount: number;
    description?: string;
    quantity?: number;
    unitCost?: number;
  }): Promise<BudgetLine & CollectionMeta> {
    // Validate budget exists
    const budget = await this.budgets.get(data.budgetId);
    if (!budget) {
      throw new Error(`Budget not found: ${data.budgetId}`);
    }

    // Validate cost code exists
    const costCode = await this.costCodes.get(data.costCodeId);
    if (!costCode) {
      throw new Error(`Cost code not found: ${data.costCodeId}`);
    }

    const record = await this.budgetLines.insert({
      budgetId: data.budgetId,
      jobId: data.jobId,
      costCodeId: data.costCodeId,
      costType: data.costType,
      amount: data.amount,
      description: data.description,
      quantity: data.quantity,
      unitCost: data.unitCost,
    } as BudgetLine);

    // Update budget totalAmount
    const lines = await this.budgetLines
      .query()
      .where('budgetId', '=', data.budgetId)
      .execute();

    const totalAmount = lines.reduce((sum, l) => sum + (l.amount || 0), 0);
    await this.budgets.update(data.budgetId, {
      totalAmount: Math.round(totalAmount * 100) / 100,
    } as Partial<Budget>);

    this.events.emit('job.budgetLine.added', { budgetLine: record });
    return record;
  }

  /**
   * Approve a budget.
   * Validates that the budget has at least one line item.
   * Sets status='approved', approvedAt, approvedBy.
   * Recalculates the job's totalBudget from all approved budgets.
   */
  async approveBudget(
    budgetId: string,
    approvedBy: string,
  ): Promise<Budget & CollectionMeta> {
    const budget = await this.budgets.get(budgetId);
    if (!budget) {
      throw new Error(`Budget not found: ${budgetId}`);
    }

    if (budget.status === 'approved') {
      throw new Error(`Budget "${budget.name}" is already approved.`);
    }

    // Validate that the budget has lines
    const lineCount = await this.budgetLines
      .query()
      .where('budgetId', '=', budgetId)
      .count();

    if (lineCount === 0) {
      throw new Error(
        `Cannot approve budget "${budget.name}": it has no line items.`,
      );
    }

    const updated = await this.budgets.update(budgetId, {
      status: 'approved',
      approvedAt: now(),
      approvedBy,
    } as Partial<Budget>);

    // Recalculate job totalBudget from all approved budgets
    await this.recalcJobTotals(budget.jobId);

    this.events.emit('job.budget.approved', { budget: updated });
    return updated;
  }

  /**
   * Get a single budget by ID.
   */
  async getBudget(id: string): Promise<(Budget & CollectionMeta) | null> {
    return this.budgets.get(id);
  }

  /**
   * Get all line items for a budget.
   */
  async getBudgetLines(
    budgetId: string,
  ): Promise<(BudgetLine & CollectionMeta)[]> {
    return this.budgetLines
      .query()
      .where('budgetId', '=', budgetId)
      .execute();
  }

  /**
   * Get all budgets for a job.
   */
  async getJobBudgets(
    jobId: string,
  ): Promise<(Budget & CollectionMeta)[]> {
    return this.budgets
      .query()
      .where('jobId', '=', jobId)
      .orderBy('revision', 'asc')
      .execute();
  }

  // ========================================================================
  // ACTUAL COST POSTING
  // ========================================================================

  /**
   * Post an actual cost against a job.
   * Validates that the job exists and is in 'active' status.
   * Validates that the cost code exists.
   * Posts the cost and updates the job's totalActualCost.
   */
  async postActualCost(data: {
    jobId: string;
    costCodeId: string;
    costType: CostType;
    date: string;
    amount: number;
    description?: string;
    source: CostSource;
    sourceId?: string;
    vendorName?: string;
    invoiceNumber?: string;
    quantity?: number;
    unitCost?: number;
  }): Promise<ActualCost & CollectionMeta> {
    // Validate job exists and is active
    const job = await this.jobs.get(data.jobId);
    if (!job) {
      throw new Error(`Job not found: ${data.jobId}`);
    }
    if (job.status !== 'active') {
      throw new Error(
        `Cannot post costs to job "${job.number}": status is "${job.status}". Job must be active.`,
      );
    }

    // Validate cost code exists
    const costCode = await this.costCodes.get(data.costCodeId);
    if (!costCode) {
      throw new Error(`Cost code not found: ${data.costCodeId}`);
    }

    const record = await this.actualCosts.insert({
      jobId: data.jobId,
      costCodeId: data.costCodeId,
      costType: data.costType,
      date: data.date,
      amount: data.amount,
      description: data.description,
      source: data.source,
      sourceId: data.sourceId,
      vendorName: data.vendorName,
      invoiceNumber: data.invoiceNumber,
      quantity: data.quantity,
      unitCost: data.unitCost,
    } as ActualCost);

    // Update job totalActualCost
    await this.recalcJobTotals(data.jobId);

    this.events.emit('job.actualCost.posted', { actualCost: record });
    return record;
  }

  /**
   * Get actual costs for a job with optional filters.
   */
  async getActualCosts(
    jobId: string,
    filters?: {
      costCodeId?: string;
      costType?: CostType;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<(ActualCost & CollectionMeta)[]> {
    const q = this.actualCosts.query().where('jobId', '=', jobId);

    if (filters?.costCodeId) {
      q.where('costCodeId', '=', filters.costCodeId);
    }
    if (filters?.costType) {
      q.where('costType', '=', filters.costType);
    }
    if (filters?.startDate) {
      q.where('date', '>=', filters.startDate);
    }
    if (filters?.endDate) {
      q.where('date', '<=', filters.endDate);
    }

    q.orderBy('date', 'asc');
    return q.execute();
  }

  // ========================================================================
  // COMMITTED COSTS
  // ========================================================================

  /**
   * Create a committed cost (purchase order or subcontract).
   * Creates with status='open', invoicedAmount=0, remainingAmount=amount.
   * Updates the job's totalCommitted.
   */
  async createCommittedCost(data: {
    jobId: string;
    costCodeId: string;
    costType: CostType;
    type: 'purchase_order' | 'subcontract';
    referenceNumber?: string;
    vendorName?: string;
    amount: number;
    date: string;
    description?: string;
  }): Promise<CommittedCost & CollectionMeta> {
    // Validate job exists
    const job = await this.jobs.get(data.jobId);
    if (!job) {
      throw new Error(`Job not found: ${data.jobId}`);
    }

    // Validate cost code exists
    const costCode = await this.costCodes.get(data.costCodeId);
    if (!costCode) {
      throw new Error(`Cost code not found: ${data.costCodeId}`);
    }

    const record = await this.committedCosts.insert({
      jobId: data.jobId,
      costCodeId: data.costCodeId,
      costType: data.costType,
      type: data.type,
      referenceNumber: data.referenceNumber,
      vendorName: data.vendorName,
      amount: data.amount,
      invoicedAmount: 0,
      remainingAmount: data.amount,
      date: data.date,
      description: data.description,
      status: 'open',
    } as CommittedCost);

    // Update job totalCommitted
    await this.recalcJobTotals(data.jobId);

    this.events.emit('job.committedCost.created', { committedCost: record });
    return record;
  }

  /**
   * Update the invoiced amount on a committed cost.
   * Recalculates remainingAmount and sets status to 'partial' or 'closed'
   * based on remaining balance.
   */
  async updateCommittedInvoiced(
    id: string,
    invoicedAmount: number,
  ): Promise<CommittedCost & CollectionMeta> {
    const existing = await this.committedCosts.get(id);
    if (!existing) {
      throw new Error(`Committed cost not found: ${id}`);
    }

    const remainingAmount = Math.round((existing.amount - invoicedAmount) * 100) / 100;

    let status: CommittedCost['status'];
    if (remainingAmount <= 0) {
      status = 'closed';
    } else if (invoicedAmount > 0) {
      status = 'partial';
    } else {
      status = 'open';
    }

    const updated = await this.committedCosts.update(id, {
      invoicedAmount,
      remainingAmount: Math.max(remainingAmount, 0),
      status,
    } as Partial<CommittedCost>);

    // Recalculate job totals
    await this.recalcJobTotals(existing.jobId);

    this.events.emit('job.committedCost.updated', { committedCost: updated });
    return updated;
  }

  /**
   * Get committed costs for a job with optional filters.
   */
  async getCommittedCosts(
    jobId: string,
    filters?: {
      costType?: CostType;
      status?: CommittedCost['status'];
    },
  ): Promise<(CommittedCost & CollectionMeta)[]> {
    const q = this.committedCosts.query().where('jobId', '=', jobId);

    if (filters?.costType) {
      q.where('costType', '=', filters.costType);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    q.orderBy('date', 'asc');
    return q.execute();
  }

  // ========================================================================
  // CHANGE ORDERS
  // ========================================================================

  /**
   * Create a change order in 'pending' status.
   */
  async createChangeOrder(data: {
    jobId: string;
    number: string;
    description: string;
    amount: number;
    date?: string;
  }): Promise<ChangeOrder & CollectionMeta> {
    const job = await this.jobs.get(data.jobId);
    if (!job) {
      throw new Error(`Job not found: ${data.jobId}`);
    }

    const record = await this.changeOrders.insert({
      jobId: data.jobId,
      number: data.number,
      description: data.description,
      amount: data.amount,
      date: data.date,
      status: 'pending',
    } as ChangeOrder);

    this.events.emit('job.changeOrder.created', { changeOrder: record });
    return record;
  }

  /**
   * Approve a change order.
   * Sets status='approved' and approvedAt.
   * Updates the job's contractAmount with the change order amount.
   */
  async approveChangeOrder(id: string): Promise<ChangeOrder & CollectionMeta> {
    const co = await this.changeOrders.get(id);
    if (!co) {
      throw new Error(`Change order not found: ${id}`);
    }
    if (co.status !== 'pending') {
      throw new Error(
        `Change order "${co.number}" cannot be approved: current status is "${co.status}".`,
      );
    }

    const updated = await this.changeOrders.update(id, {
      status: 'approved',
      approvedAt: now(),
    } as Partial<ChangeOrder>);

    // Update job contract amount
    const job = await this.jobs.get(co.jobId);
    if (job) {
      const newContractAmount = Math.round((job.contractAmount + co.amount) * 100) / 100;
      await this.jobs.update(job.id, {
        contractAmount: newContractAmount,
      } as Partial<Job>);
    }

    this.events.emit('job.changeOrder.approved', { changeOrder: updated });
    return updated;
  }

  /**
   * Reject a change order.
   * Sets status='rejected'.
   */
  async rejectChangeOrder(id: string): Promise<ChangeOrder & CollectionMeta> {
    const co = await this.changeOrders.get(id);
    if (!co) {
      throw new Error(`Change order not found: ${id}`);
    }
    if (co.status !== 'pending') {
      throw new Error(
        `Change order "${co.number}" cannot be rejected: current status is "${co.status}".`,
      );
    }

    const updated = await this.changeOrders.update(id, {
      status: 'rejected',
    } as Partial<ChangeOrder>);

    this.events.emit('job.changeOrder.rejected', { changeOrder: updated });
    return updated;
  }

  /**
   * Get all change orders for a job.
   */
  async getChangeOrders(
    jobId: string,
  ): Promise<(ChangeOrder & CollectionMeta)[]> {
    return this.changeOrders
      .query()
      .where('jobId', '=', jobId)
      .orderBy('number', 'asc')
      .execute();
  }

  // ========================================================================
  // REPORTS
  // ========================================================================

  /**
   * Get job cost detail report.
   *
   * Aggregates budget, actual, and committed costs by cost code + cost type.
   * Computes estimateToComplete (ETC), estimateAtCompletion (EAC), and variance.
   *
   * ETC logic:
   *  - If actual < budget: ETC = budget - actual
   *  - If actual >= budget and percentComplete > 0:
   *    EAC = actual / percentComplete, ETC = EAC - actual
   *  - If percentComplete is 0 and actual >= budget: ETC = 0
   *
   * Returns one row per distinct (costCode, costType) combination.
   */
  async getJobCostDetail(jobId: string): Promise<JobCostDetailRow[]> {
    const job = await this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Get all approved budgets for this job
    const approvedBudgets = await this.budgets
      .query()
      .where('jobId', '=', jobId)
      .where('status', '=', 'approved')
      .execute();

    const approvedBudgetIds = approvedBudgets.map((b) => b.id);

    // Get budget lines from approved budgets
    let allBudgetLines: (BudgetLine & CollectionMeta)[] = [];
    if (approvedBudgetIds.length > 0) {
      allBudgetLines = await this.budgetLines
        .query()
        .where('budgetId', 'in', approvedBudgetIds)
        .execute();
    }

    // Get actual costs for this job
    const allActualCosts = await this.actualCosts
      .query()
      .where('jobId', '=', jobId)
      .execute();

    // Get committed costs for this job (exclude cancelled)
    const allCommittedCosts = await this.committedCosts
      .query()
      .where('jobId', '=', jobId)
      .execute();
    const activeCommitted = allCommittedCosts.filter(
      (c) => c.status !== 'cancelled',
    );

    // Get all cost codes for display info
    const allCostCodes = await this.costCodes.query().execute();
    const costCodeMap = new Map(allCostCodes.map((cc) => [cc.id, cc]));

    // Aggregate by (costCodeId, costType)
    type AggKey = string;
    const makeKey = (costCodeId: string, costType: CostType): AggKey =>
      `${costCodeId}::${costType}`;

    const aggregation = new Map<
      AggKey,
      {
        costCodeId: string;
        costType: CostType;
        budgetAmount: number;
        actualAmount: number;
        committedAmount: number;
      }
    >();

    const ensureEntry = (costCodeId: string, costType: CostType) => {
      const key = makeKey(costCodeId, costType);
      if (!aggregation.has(key)) {
        aggregation.set(key, {
          costCodeId,
          costType,
          budgetAmount: 0,
          actualAmount: 0,
          committedAmount: 0,
        });
      }
      return aggregation.get(key)!;
    };

    // Aggregate budget lines
    for (const line of allBudgetLines) {
      const entry = ensureEntry(line.costCodeId, line.costType);
      entry.budgetAmount += line.amount || 0;
    }

    // Aggregate actual costs
    for (const cost of allActualCosts) {
      const entry = ensureEntry(cost.costCodeId, cost.costType);
      entry.actualAmount += cost.amount || 0;
    }

    // Aggregate committed costs (remaining amount = uncommitted portion)
    for (const cost of activeCommitted) {
      const entry = ensureEntry(cost.costCodeId, cost.costType);
      entry.committedAmount += cost.remainingAmount || 0;
    }

    // Build result rows
    const rows: JobCostDetailRow[] = [];
    const percentComplete = job.percentComplete || 0;

    for (const [, agg] of aggregation) {
      const cc = costCodeMap.get(agg.costCodeId);

      const budgetAmount = Math.round(agg.budgetAmount * 100) / 100;
      const actualAmount = Math.round(agg.actualAmount * 100) / 100;
      const committedAmount = Math.round(agg.committedAmount * 100) / 100;

      // Compute ETC and EAC
      let estimateToComplete: number;
      let estimateAtCompletion: number;

      if (actualAmount < budgetAmount) {
        // Under budget: ETC is the remaining budget
        estimateToComplete = budgetAmount - actualAmount;
        estimateAtCompletion = actualAmount + estimateToComplete;
      } else if (percentComplete > 0) {
        // Over budget with progress: project based on % complete
        estimateAtCompletion = actualAmount / (percentComplete / 100);
        estimateToComplete = estimateAtCompletion - actualAmount;
      } else {
        // Over budget with no progress: ETC = 0, EAC = actual
        estimateToComplete = 0;
        estimateAtCompletion = actualAmount;
      }

      estimateToComplete = Math.round(estimateToComplete * 100) / 100;
      estimateAtCompletion = Math.round(estimateAtCompletion * 100) / 100;

      const variance = Math.round((budgetAmount - estimateAtCompletion) * 100) / 100;

      rows.push({
        costCodeId: agg.costCodeId,
        costCode: cc ? cc.code : agg.costCodeId,
        costCodeDescription: cc ? cc.description : '',
        costType: agg.costType,
        budgetAmount,
        actualAmount,
        committedAmount,
        estimateToComplete,
        estimateAtCompletion,
        variance,
      });
    }

    // Sort by cost code, then cost type
    rows.sort((a, b) => {
      const codeCompare = a.costCode.localeCompare(b.costCode);
      if (codeCompare !== 0) return codeCompare;
      return a.costType.localeCompare(b.costType);
    });

    return rows;
  }

  /**
   * Get job profitability summary.
   *
   * Computes contract + approved change orders = revised contract,
   * projected costs (actual + committed remaining + ETC for remaining budget),
   * projected profit and margin percentage.
   */
  async getJobProfitability(jobId: string): Promise<JobProfitabilitySummary> {
    const job = await this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Get approved change orders
    const changeOrdersList = await this.changeOrders
      .query()
      .where('jobId', '=', jobId)
      .where('status', '=', 'approved')
      .execute();

    const approvedChangeOrders = changeOrdersList.reduce(
      (sum, co) => sum + (co.amount || 0),
      0,
    );

    const revisedContract = Math.round(
      (job.contractAmount + approvedChangeOrders) * 100,
    ) / 100;

    // Get actual costs
    const actualCostsList = await this.actualCosts
      .query()
      .where('jobId', '=', jobId)
      .execute();
    const actualCostToDate = Math.round(
      actualCostsList.reduce((sum, c) => sum + (c.amount || 0), 0) * 100,
    ) / 100;

    // Get committed costs (remaining on open/partial commitments)
    const committedCostsList = await this.committedCosts
      .query()
      .where('jobId', '=', jobId)
      .execute();
    const committedCost = Math.round(
      committedCostsList
        .filter((c) => c.status !== 'cancelled')
        .reduce((sum, c) => sum + (c.remainingAmount || 0), 0) * 100,
    ) / 100;

    // Get approved budget total
    const approvedBudgets = await this.budgets
      .query()
      .where('jobId', '=', jobId)
      .where('status', '=', 'approved')
      .execute();
    const totalBudget = Math.round(
      approvedBudgets.reduce((sum, b) => sum + (b.totalAmount || 0), 0) * 100,
    ) / 100;

    // Projected cost: actual + committed remaining + remaining budget not yet committed
    const remainingBudget = Math.max(totalBudget - actualCostToDate - committedCost, 0);
    const projectedCost = Math.round(
      (actualCostToDate + committedCost + remainingBudget) * 100,
    ) / 100;

    const projectedProfit = Math.round((revisedContract - projectedCost) * 100) / 100;
    const projectedMarginPct =
      revisedContract !== 0
        ? Math.round((projectedProfit / revisedContract) * 10000) / 100
        : 0;

    return {
      jobId: job.id,
      jobNumber: job.number,
      jobName: job.name,
      contractAmount: job.contractAmount,
      approvedChangeOrders: Math.round(approvedChangeOrders * 100) / 100,
      revisedContract,
      totalBudget,
      actualCostToDate,
      committedCost,
      projectedCost,
      projectedProfit,
      projectedMarginPct,
      percentComplete: job.percentComplete,
    };
  }

  /**
   * Generate a WIP (Work In Progress) schedule for a job.
   *
   * Uses the cost-to-cost method for percentage of completion:
   *   percentComplete = actualCostToDate / estimateAtCompletion
   *
   * earnedRevenue = percentComplete * revisedContract
   * overUnderBilling = earnedRevenue - billedToDate
   *
   * Saves the WipSchedule record and returns it.
   */
  async generateWipSchedule(
    jobId: string,
    periodId?: string,
    periodName?: string,
  ): Promise<WipSchedule & CollectionMeta> {
    const job = await this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Get approved change orders
    const changeOrdersList = await this.changeOrders
      .query()
      .where('jobId', '=', jobId)
      .where('status', '=', 'approved')
      .execute();

    const approvedCOs = changeOrdersList.reduce(
      (sum, co) => sum + (co.amount || 0),
      0,
    );

    const contractAmount = Math.round(
      (job.contractAmount + approvedCOs) * 100,
    ) / 100;

    // Get approved budget total
    const approvedBudgets = await this.budgets
      .query()
      .where('jobId', '=', jobId)
      .where('status', '=', 'approved')
      .execute();
    const totalBudget = Math.round(
      approvedBudgets.reduce((sum, b) => sum + (b.totalAmount || 0), 0) * 100,
    ) / 100;

    // Get actual costs to date
    const actualCostsList = await this.actualCosts
      .query()
      .where('jobId', '=', jobId)
      .execute();
    const actualCostToDate = Math.round(
      actualCostsList.reduce((sum, c) => sum + (c.amount || 0), 0) * 100,
    ) / 100;

    // Get committed costs (remaining)
    const committedCostsList = await this.committedCosts
      .query()
      .where('jobId', '=', jobId)
      .execute();
    const committedRemaining = Math.round(
      committedCostsList
        .filter((c) => c.status !== 'cancelled')
        .reduce((sum, c) => sum + (c.remainingAmount || 0), 0) * 100,
    ) / 100;

    // Estimate at completion: actual + committed remaining + remaining budget
    const remainingBudget = Math.max(totalBudget - actualCostToDate - committedRemaining, 0);
    const estimateAtCompletion = Math.round(
      (actualCostToDate + committedRemaining + remainingBudget) * 100,
    ) / 100;

    // Estimate to complete: EAC - actual
    const estimateToComplete = Math.round(
      (estimateAtCompletion - actualCostToDate) * 100,
    ) / 100;

    // Cost-to-cost percent complete
    const percentComplete =
      estimateAtCompletion > 0
        ? Math.round((actualCostToDate / estimateAtCompletion) * 10000) / 100
        : 0;

    // Earned revenue = percentComplete * revisedContract
    const earnedRevenue = Math.round(
      (percentComplete / 100) * contractAmount * 100,
    ) / 100;

    // Over/under billing
    const billedToDate = job.totalBilled || 0;
    const overUnderBilling = Math.round(
      (earnedRevenue - billedToDate) * 100,
    ) / 100;

    // Projected gross profit and margin
    const projectedGrossProfit = Math.round(
      (contractAmount - estimateAtCompletion) * 100,
    ) / 100;
    const projectedMarginPct =
      contractAmount !== 0
        ? Math.round((projectedGrossProfit / contractAmount) * 10000) / 100
        : 0;

    // Save the WIP schedule record
    const record = await this.wipSchedules.insert({
      jobId,
      periodId,
      periodName,
      contractAmount,
      totalBudget,
      actualCostToDate,
      estimateToComplete,
      estimateAtCompletion,
      percentComplete,
      earnedRevenue,
      billedToDate,
      overUnderBilling,
      projectedGrossProfit,
      projectedMarginPct,
    } as WipSchedule);

    // Update the job's percent complete from the WIP calculation
    await this.jobs.update(jobId, {
      percentComplete,
    } as Partial<Job>);

    this.events.emit('job.wipSchedule.generated', { wipSchedule: record });
    return record;
  }

  /**
   * Get WIP schedules, optionally filtered by jobId.
   */
  async getWipSchedules(
    jobId?: string,
  ): Promise<(WipSchedule & CollectionMeta)[]> {
    const q = this.wipSchedules.query();

    if (jobId) {
      q.where('jobId', '=', jobId);
    }

    q.orderBy('createdAt', 'desc');
    return q.execute();
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  /**
   * Recalculate and update the denormalized totals on a job record.
   *
   * Sums:
   *  - totalActualCost from all actualCosts for the job
   *  - totalCommitted from remaining amounts on non-cancelled committedCosts
   *  - totalBudget from all approved budgets for the job
   */
  private async recalcJobTotals(jobId: string): Promise<void> {
    const job = await this.jobs.get(jobId);
    if (!job) return;

    // Sum actual costs
    const actualCostsList = await this.actualCosts
      .query()
      .where('jobId', '=', jobId)
      .execute();
    const totalActualCost = Math.round(
      actualCostsList.reduce((sum, c) => sum + (c.amount || 0), 0) * 100,
    ) / 100;

    // Sum committed costs (remaining amounts, excluding cancelled)
    const committedCostsList = await this.committedCosts
      .query()
      .where('jobId', '=', jobId)
      .execute();
    const totalCommitted = Math.round(
      committedCostsList
        .filter((c) => c.status !== 'cancelled')
        .reduce((sum, c) => sum + (c.remainingAmount || 0), 0) * 100,
    ) / 100;

    // Sum approved budget totals
    const approvedBudgets = await this.budgets
      .query()
      .where('jobId', '=', jobId)
      .where('status', '=', 'approved')
      .execute();
    const totalBudget = Math.round(
      approvedBudgets.reduce((sum, b) => sum + (b.totalAmount || 0), 0) * 100,
    ) / 100;

    await this.jobs.update(jobId, {
      totalActualCost,
      totalCommitted,
      totalBudget,
    } as Partial<Job>);
  }
}
