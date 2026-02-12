/**
 * Job Service Tests
 * Tests for the Job Costing business logic layer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { JobService } from '../../src/modules/job/job-service';
import type {
  Job, CostCode, Budget, BudgetLine,
  ActualCost, CommittedCost, WipSchedule, ChangeOrder,
} from '../../src/modules/job/job-service';
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

  const jobs = new Collection<Job>('job/job', adapter, schemas, events);
  const costCodes = new Collection<CostCode>('job/costCode', adapter, schemas, events);
  const budgets = new Collection<Budget>('job/budget', adapter, schemas, events);
  const budgetLines = new Collection<BudgetLine>('job/budgetLine', adapter, schemas, events);
  const actualCosts = new Collection<ActualCost>('job/actualCost', adapter, schemas, events);
  const committedCosts = new Collection<CommittedCost>('job/committedCost', adapter, schemas, events);
  const wipSchedules = new Collection<WipSchedule>('job/wip', adapter, schemas, events);
  const changeOrders = new Collection<ChangeOrder>('job/changeOrder', adapter, schemas, events);

  const service = new JobService(
    jobs, costCodes, budgets, budgetLines,
    actualCosts, committedCosts, wipSchedules, changeOrders, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JobService', () => {
  let service: JobService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Job CRUD
  // ==========================================================================

  describe('Job CRUD', () => {
    it('creates a job with defaults', async () => {
      const job = await service.createJob({
        number: 'J-001',
        name: 'Highway Bridge',
        type: 'lump_sum',
      });

      expect(job.number).toBe('J-001');
      expect(job.name).toBe('Highway Bridge');
      expect(job.type).toBe('lump_sum');
      expect(job.status).toBe('active');
      expect(job.contractAmount).toBe(0);
      expect(job.retentionPct).toBe(0);
      expect(job.percentComplete).toBe(0);
      expect(job.totalBudget).toBe(0);
      expect(job.totalActualCost).toBe(0);
      expect(job.totalCommitted).toBe(0);
    });

    it('rejects duplicate job numbers', async () => {
      await service.createJob({ number: 'J-001', name: 'Job A', type: 'lump_sum' });
      await expect(
        service.createJob({ number: 'J-001', name: 'Job B', type: 'cost_plus' }),
      ).rejects.toThrow('already exists');
    });

    it('gets a job by number', async () => {
      await service.createJob({ number: 'J-001', name: 'Bridge', type: 'lump_sum' });
      const found = await service.getJobByNumber('J-001');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Bridge');
    });

    it('filters jobs by status', async () => {
      await service.createJob({ number: 'J-001', name: 'Active', type: 'lump_sum', status: 'active' });
      await service.createJob({ number: 'J-002', name: 'Closed', type: 'cost_plus', status: 'closed' });

      const active = await service.getJobs({ status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].number).toBe('J-001');
    });

    it('updates a job', async () => {
      const job = await service.createJob({ number: 'J-001', name: 'Bridge', type: 'lump_sum' });
      const updated = await service.updateJob(job.id, { contractAmount: 500000 });
      expect(updated.contractAmount).toBe(500000);
    });
  });

  // ==========================================================================
  // Cost Codes
  // ==========================================================================

  describe('Cost Codes', () => {
    it('creates a cost code', async () => {
      const cc = await service.createCostCode({ code: '03-000', description: 'Concrete' });
      expect(cc.code).toBe('03-000');
      expect(cc.isStandard).toBe(false);
      expect(cc.depth).toBe(0);
    });

    it('rejects duplicate cost codes', async () => {
      await service.createCostCode({ code: '03-000', description: 'Concrete' });
      await expect(
        service.createCostCode({ code: '03-000', description: 'Duplicate' }),
      ).rejects.toThrow('already exists');
    });

    it('lists cost codes ordered by code', async () => {
      await service.createCostCode({ code: '03-000', description: 'Concrete' });
      await service.createCostCode({ code: '01-000', description: 'General' });
      await service.createCostCode({ code: '02-000', description: 'Sitework' });

      const codes = await service.getCostCodes();
      expect(codes[0].code).toBe('01-000');
      expect(codes[1].code).toBe('02-000');
      expect(codes[2].code).toBe('03-000');
    });
  });

  // ==========================================================================
  // Budget Management
  // ==========================================================================

  describe('Budget Management', () => {
    let jobId: string;
    let ccId: string;

    beforeEach(async () => {
      const job = await service.createJob({ number: 'J-001', name: 'Bridge', type: 'lump_sum' });
      jobId = job.id;
      const cc = await service.createCostCode({ code: '03-000', description: 'Concrete' });
      ccId = cc.id;
    });

    it('creates a budget and adds lines', async () => {
      const budget = await service.createBudget(jobId, 'Original Budget');
      expect(budget.status).toBe('draft');
      expect(budget.revision).toBe(1);

      await service.addBudgetLine({
        budgetId: budget.id,
        jobId,
        costCodeId: ccId,
        costType: 'material',
        amount: 50000,
      });

      const lines = await service.getBudgetLines(budget.id);
      expect(lines).toHaveLength(1);
      expect(lines[0].amount).toBe(50000);
    });

    it('approves a budget and updates job total', async () => {
      const budget = await service.createBudget(jobId, 'Original Budget');
      await service.addBudgetLine({
        budgetId: budget.id, jobId, costCodeId: ccId, costType: 'material', amount: 50000,
      });
      await service.addBudgetLine({
        budgetId: budget.id, jobId, costCodeId: ccId, costType: 'labor', amount: 30000,
      });

      const approved = await service.approveBudget(budget.id, 'John Doe');
      expect(approved.status).toBe('approved');

      const job = await service.getJob(jobId);
      expect(job!.totalBudget).toBe(80000);
    });
  });

  // ==========================================================================
  // Actual Cost Posting
  // ==========================================================================

  describe('Actual Cost Posting', () => {
    let jobId: string;
    let ccId: string;

    beforeEach(async () => {
      const job = await service.createJob({ number: 'J-001', name: 'Bridge', type: 'lump_sum' });
      jobId = job.id;
      const cc = await service.createCostCode({ code: '03-000', description: 'Concrete' });
      ccId = cc.id;
    });

    it('posts an actual cost and updates job total', async () => {
      await service.postActualCost({
        jobId,
        costCodeId: ccId,
        costType: 'material',
        date: '2026-02-01',
        amount: 15000,
        source: 'ap',
        description: 'Concrete delivery',
      });

      const job = await service.getJob(jobId);
      expect(job!.totalActualCost).toBe(15000);

      const costs = await service.getActualCosts(jobId);
      expect(costs).toHaveLength(1);
      expect(costs[0].amount).toBe(15000);
    });

    it('filters actual costs by cost type', async () => {
      await service.postActualCost({
        jobId, costCodeId: ccId, costType: 'material',
        date: '2026-02-01', amount: 10000, source: 'ap',
      });
      await service.postActualCost({
        jobId, costCodeId: ccId, costType: 'labor',
        date: '2026-02-02', amount: 5000, source: 'payroll',
      });

      const materials = await service.getActualCosts(jobId, { costType: 'material' });
      expect(materials).toHaveLength(1);
      expect(materials[0].amount).toBe(10000);
    });
  });

  // ==========================================================================
  // Committed Costs
  // ==========================================================================

  describe('Committed Costs', () => {
    let jobId: string;
    let ccId: string;

    beforeEach(async () => {
      const job = await service.createJob({ number: 'J-001', name: 'Bridge', type: 'lump_sum' });
      jobId = job.id;
      const cc = await service.createCostCode({ code: '03-000', description: 'Concrete' });
      ccId = cc.id;
    });

    it('creates a committed cost and updates job total', async () => {
      const commitment = await service.createCommittedCost({
        jobId, costCodeId: ccId, costType: 'subcontract',
        type: 'subcontract', amount: 100000,
        date: '2026-02-01', vendorName: 'ABC Concrete',
      });

      expect(commitment.status).toBe('open');
      expect(commitment.remainingAmount).toBe(100000);

      const job = await service.getJob(jobId);
      expect(job!.totalCommitted).toBe(100000);
    });

    it('updates invoiced amount and adjusts status', async () => {
      const commitment = await service.createCommittedCost({
        jobId, costCodeId: ccId, costType: 'subcontract',
        type: 'subcontract', amount: 100000,
        date: '2026-02-01',
      });

      const partial = await service.updateCommittedInvoiced(commitment.id, 40000);
      expect(partial.invoicedAmount).toBe(40000);
      expect(partial.remainingAmount).toBe(60000);
      expect(partial.status).toBe('partial');

      const closed = await service.updateCommittedInvoiced(commitment.id, 100000);
      expect(closed.remainingAmount).toBe(0);
      expect(closed.status).toBe('closed');
    });
  });

  // ==========================================================================
  // Change Orders
  // ==========================================================================

  describe('Change Orders', () => {
    let jobId: string;

    beforeEach(async () => {
      const job = await service.createJob({
        number: 'J-001', name: 'Bridge', type: 'lump_sum', contractAmount: 500000,
      });
      jobId = job.id;
    });

    it('creates and approves a change order', async () => {
      const co = await service.createChangeOrder({
        jobId, number: 'CO-001', description: 'Additional foundation work', amount: 50000,
      });
      expect(co.status).toBe('pending');

      await service.approveChangeOrder(co.id);

      const job = await service.getJob(jobId);
      expect(job!.contractAmount).toBe(550000); // 500k + 50k CO
    });

    it('rejects a change order', async () => {
      const co = await service.createChangeOrder({
        jobId, number: 'CO-002', description: 'Rejected scope', amount: 25000,
      });

      const rejected = await service.rejectChangeOrder(co.id);
      expect(rejected.status).toBe('rejected');

      // Contract should not change
      const job = await service.getJob(jobId);
      expect(job!.contractAmount).toBe(500000);
    });
  });

  // ==========================================================================
  // Reports
  // ==========================================================================

  describe('Reports', () => {
    let jobId: string;
    let ccId: string;

    beforeEach(async () => {
      const job = await service.createJob({
        number: 'J-001', name: 'Bridge', type: 'lump_sum', contractAmount: 1000000,
      });
      jobId = job.id;

      const cc = await service.createCostCode({ code: '03-000', description: 'Concrete' });
      ccId = cc.id;

      // Create budget
      const budget = await service.createBudget(jobId, 'Original');
      await service.addBudgetLine({
        budgetId: budget.id, jobId, costCodeId: ccId,
        costType: 'material', amount: 200000,
      });
      await service.addBudgetLine({
        budgetId: budget.id, jobId, costCodeId: ccId,
        costType: 'labor', amount: 300000,
      });
      await service.approveBudget(budget.id, 'Admin');

      // Post actual costs
      await service.postActualCost({
        jobId, costCodeId: ccId, costType: 'material',
        date: '2026-01-15', amount: 80000, source: 'ap',
      });
      await service.postActualCost({
        jobId, costCodeId: ccId, costType: 'labor',
        date: '2026-01-20', amount: 120000, source: 'payroll',
      });

      // Create committed cost
      await service.createCommittedCost({
        jobId, costCodeId: ccId, costType: 'material',
        type: 'purchase_order', amount: 50000, date: '2026-01-25',
      });
    });

    it('generates job cost detail', async () => {
      const detail = await service.getJobCostDetail(jobId);
      expect(detail.length).toBeGreaterThanOrEqual(2); // at least material + labor rows
    });

    it('generates job profitability summary', async () => {
      const prof = await service.getJobProfitability(jobId);
      expect(prof.contractAmount).toBe(1000000);
      expect(prof.totalBudget).toBe(500000);
      expect(prof.actualCostToDate).toBe(200000);
      expect(prof.committedCost).toBe(50000);
    });

    it('generates WIP schedule', async () => {
      const wip = await service.generateWipSchedule(jobId);
      expect(wip.contractAmount).toBe(1000000);
      expect(wip.actualCostToDate).toBe(200000);
      expect(wip.totalBudget).toBe(500000);
      // EAC should be calculated
      expect(wip.estimateAtCompletion).toBeGreaterThan(0);
      // % complete should be > 0
      expect(wip.percentComplete).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits job.created', async () => {
      let emitted = false;
      events.on('job.created', () => { emitted = true; });
      await service.createJob({ number: 'J-001', name: 'Test', type: 'lump_sum' });
      expect(emitted).toBe(true);
    });

    it('emits job.cost.posted', async () => {
      const job = await service.createJob({ number: 'J-001', name: 'Test', type: 'lump_sum' });
      const cc = await service.createCostCode({ code: '01-000', description: 'General' });

      let emitted = false;
      events.on('job.actualCost.posted', () => { emitted = true; });

      await service.postActualCost({
        jobId: job.id, costCodeId: cc.id, costType: 'labor',
        date: '2026-02-01', amount: 5000, source: 'manual',
      });
      expect(emitted).toBe(true);
    });
  });
});
