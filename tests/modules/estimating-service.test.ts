/**
 * Estimating Service Tests
 * Tests for the Estimating & Bid Management business logic layer (Phase 13).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EstimatingService } from '../../src/modules/estimating/estimating-service';
import type {
  Estimate, EstimateLine, Bid,
} from '../../src/modules/estimating/estimating-service';
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

  const estimates = new Collection<Estimate>('job/estimate', adapter, schemas, events);
  const estimateLines = new Collection<EstimateLine>('job/estimateLine', adapter, schemas, events);
  const bids = new Collection<Bid>('job/bid', adapter, schemas, events);

  const service = new EstimatingService(
    estimates, estimateLines, bids, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EstimatingService', () => {
  let service: EstimatingService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Estimate CRUD
  // ==========================================================================

  describe('Estimate CRUD', () => {
    it('creates an estimate with defaults', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Highway Bridge Estimate',
        clientName: 'DOT',
        projectName: 'Bridge Replacement',
      });

      expect(estimate.jobId).toBe('job-001');
      expect(estimate.name).toBe('Highway Bridge Estimate');
      expect(estimate.revision).toBe(1);
      expect(estimate.status).toBe('draft');
      expect(estimate.totalCost).toBe(0);
      expect(estimate.totalMarkup).toBe(0);
      expect(estimate.totalPrice).toBe(0);
      expect(estimate.marginPct).toBe(0);
      expect(estimate.transferredToBudget).toBe(false);
      expect(estimate.defaultMarkupPct).toBe(0);
    });

    it('rejects estimate without jobId', async () => {
      await expect(
        service.createEstimate({ jobId: '', name: 'Test' }),
      ).rejects.toThrow('must be linked to a job');
    });

    it('rejects estimate without name', async () => {
      await expect(
        service.createEstimate({ jobId: 'job-001', name: '' }),
      ).rejects.toThrow('name is required');
    });

    it('updates an estimate', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Test Estimate',
      });
      const updated = await service.updateEstimate(estimate.id, {
        clientName: 'ABC Corp',
        bidDate: '2026-03-15',
      });
      expect(updated.clientName).toBe('ABC Corp');
      expect(updated.bidDate).toBe('2026-03-15');
    });

    it('gets estimates filtered by status', async () => {
      await service.createEstimate({ jobId: 'job-001', name: 'Est A' });
      const est2 = await service.createEstimate({ jobId: 'job-001', name: 'Est B' });
      await service.submitEstimate(est2.id);

      const drafts = await service.getEstimates({ status: 'draft' });
      expect(drafts).toHaveLength(1);
      expect(drafts[0].name).toBe('Est A');
    });

    it('soft-deletes a draft estimate', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Delete Me',
      });
      await service.deleteEstimate(estimate.id);
      const found = await service.getEstimate(estimate.id);
      expect(found).toBeNull();
    });

    it('rejects deletion of submitted estimate', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Cannot Delete',
      });
      await service.submitEstimate(estimate.id);
      await expect(
        service.deleteEstimate(estimate.id),
      ).rejects.toThrow('Only draft or withdrawn');
    });
  });

  // ==========================================================================
  // Estimate Lines
  // ==========================================================================

  describe('Estimate Lines', () => {
    let estimateId: string;

    beforeEach(async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Test Estimate',
        defaultMarkupPct: 10,
      });
      estimateId = estimate.id;
    });

    it('adds a line with automatic cost calculation', async () => {
      const line = await service.addEstimateLine({
        estimateId,
        description: 'Concrete pour',
        costType: 'material',
        quantity: 100,
        unit: 'CY',
        unitCost: 150,
      });

      expect(line.amount).toBe(15000);
      expect(line.markupPct).toBe(10); // Inherits from estimate default
      expect(line.markupAmount).toBe(1500);
      expect(line.totalPrice).toBe(16500);
      expect(line.isAssembly).toBe(false);
    });

    it('recalculates estimate totals after adding lines', async () => {
      await service.addEstimateLine({
        estimateId,
        description: 'Rebar',
        costType: 'material',
        quantity: 50,
        unit: 'TON',
        unitCost: 1200,
        markupPct: 15,
      });

      await service.addEstimateLine({
        estimateId,
        description: 'Labor crew',
        costType: 'labor',
        quantity: 200,
        unit: 'HR',
        unitCost: 65,
        markupPct: 20,
      });

      const estimate = await service.getEstimate(estimateId);
      // Rebar: 50*1200 = 60000, markup 15% = 9000, total = 69000
      // Labor: 200*65 = 13000, markup 20% = 2600, total = 15600
      expect(estimate!.totalCost).toBe(73000);
      expect(estimate!.totalMarkup).toBe(11600);
      expect(estimate!.totalPrice).toBe(84600);
    });

    it('updates a line and recalculates', async () => {
      const line = await service.addEstimateLine({
        estimateId,
        description: 'Concrete',
        costType: 'material',
        quantity: 100,
        unit: 'CY',
        unitCost: 150,
      });

      const updated = await service.updateEstimateLine(line.id, {
        quantity: 200,
      });

      expect(updated.amount).toBe(30000);
      expect(updated.markupAmount).toBe(3000);
      expect(updated.totalPrice).toBe(33000);

      const estimate = await service.getEstimate(estimateId);
      expect(estimate!.totalCost).toBe(30000);
    });

    it('removes a line and recalculates', async () => {
      const line1 = await service.addEstimateLine({
        estimateId,
        description: 'Line 1',
        costType: 'material',
        quantity: 10,
        unitCost: 100,
        markupPct: 0,
      });
      await service.addEstimateLine({
        estimateId,
        description: 'Line 2',
        costType: 'labor',
        quantity: 10,
        unitCost: 50,
        markupPct: 0,
      });

      await service.removeEstimateLine(line1.id);

      const estimate = await service.getEstimate(estimateId);
      expect(estimate!.totalCost).toBe(500); // Only line 2: 10*50
    });

    it('assigns automatic sort order', async () => {
      const line1 = await service.addEstimateLine({
        estimateId,
        description: 'First',
        costType: 'material',
        quantity: 1,
        unitCost: 100,
      });
      const line2 = await service.addEstimateLine({
        estimateId,
        description: 'Second',
        costType: 'material',
        quantity: 1,
        unitCost: 200,
      });

      expect(line1.sortOrder).toBe(10);
      expect(line2.sortOrder).toBe(20);
    });
  });

  // ==========================================================================
  // Assemblies
  // ==========================================================================

  describe('Assembly Management', () => {
    let estimateId: string;

    beforeEach(async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Assembly Test',
        defaultMarkupPct: 0,
      });
      estimateId = estimate.id;
    });

    it('creates an assembly and groups child lines', async () => {
      const child1 = await service.addEstimateLine({
        estimateId,
        description: 'Concrete',
        costType: 'material',
        quantity: 10,
        unitCost: 100,
        markupPct: 0,
      });
      const child2 = await service.addEstimateLine({
        estimateId,
        description: 'Rebar',
        costType: 'material',
        quantity: 5,
        unitCost: 200,
        markupPct: 0,
      });

      const assembly = await service.createAssembly({
        estimateId,
        assemblyName: 'Foundation Assembly',
        description: 'Complete foundation',
        childLineIds: [child1.id, child2.id],
      });

      expect(assembly.isAssembly).toBe(true);
      expect(assembly.assemblyName).toBe('Foundation Assembly');

      // Children should have parentId set to assembly
      const lines = await service.getEstimateLines(estimateId);
      const children = lines.filter((l) => l.parentId === assembly.id);
      expect(children).toHaveLength(2);
    });

    it('removes assembly and its children', async () => {
      const child = await service.addEstimateLine({
        estimateId,
        description: 'Child Line',
        costType: 'labor',
        quantity: 1,
        unitCost: 100,
        markupPct: 0,
      });

      const assembly = await service.createAssembly({
        estimateId,
        assemblyName: 'Test Assembly',
        description: 'Assembly',
        childLineIds: [child.id],
      });

      await service.removeEstimateLine(assembly.id);

      const lines = await service.getEstimateLines(estimateId);
      // Both assembly and child should be removed
      expect(lines).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Markup & Margin
  // ==========================================================================

  describe('Markup & Margin', () => {
    let estimateId: string;

    beforeEach(async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Markup Test',
        defaultMarkupPct: 0,
      });
      estimateId = estimate.id;
    });

    it('applies overall markup to all lines', async () => {
      await service.addEstimateLine({
        estimateId,
        description: 'Material',
        costType: 'material',
        quantity: 10,
        unitCost: 100,
        markupPct: 0,
      });
      await service.addEstimateLine({
        estimateId,
        description: 'Labor',
        costType: 'labor',
        quantity: 10,
        unitCost: 50,
        markupPct: 0,
      });

      await service.applyOverallMarkup(estimateId, 20);

      const estimate = await service.getEstimate(estimateId);
      // Material: 1000, markup 20% = 200, total = 1200
      // Labor: 500, markup 20% = 100, total = 600
      expect(estimate!.totalCost).toBe(1500);
      expect(estimate!.totalMarkup).toBe(300);
      expect(estimate!.totalPrice).toBe(1800);
    });

    it('applies category-specific markup', async () => {
      await service.addEstimateLine({
        estimateId,
        description: 'Material',
        costType: 'material',
        quantity: 10,
        unitCost: 100,
        markupPct: 0,
      });
      await service.addEstimateLine({
        estimateId,
        description: 'Labor',
        costType: 'labor',
        quantity: 10,
        unitCost: 50,
        markupPct: 0,
      });

      // Apply 30% markup only to material
      await service.applyCategoryMarkup(estimateId, 'material', 30);

      const estimate = await service.getEstimate(estimateId);
      // Material: 1000, markup 30% = 300, total = 1300
      // Labor: 500, markup 0% = 0, total = 500
      expect(estimate!.totalCost).toBe(1500);
      expect(estimate!.totalMarkup).toBe(300);
      expect(estimate!.totalPrice).toBe(1800);
    });

    it('excludes alternates from estimate totals', async () => {
      await service.addEstimateLine({
        estimateId,
        description: 'Base scope',
        costType: 'material',
        quantity: 10,
        unitCost: 100,
        markupPct: 0,
      });
      await service.addEstimateLine({
        estimateId,
        description: 'Alternate scope',
        costType: 'material',
        quantity: 5,
        unitCost: 200,
        markupPct: 0,
        isAlternate: true,
      });

      const estimate = await service.getEstimate(estimateId);
      expect(estimate!.totalCost).toBe(1000); // Only base scope
    });
  });

  // ==========================================================================
  // Bid Solicitation & Tabulation
  // ==========================================================================

  describe('Bid Solicitation', () => {
    let estimateId: string;

    beforeEach(async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Bid Test',
      });
      estimateId = estimate.id;
    });

    it('creates a bid solicitation', async () => {
      const bid = await service.createBid({
        estimateId,
        trade: 'Concrete',
        description: 'Foundation concrete work',
        expirationDate: '2026-04-01',
      });

      expect(bid.trade).toBe('Concrete');
      expect(bid.status).toBe('solicited');
      expect(bid.amount).toBe(0);
      expect(bid.isLowBid).toBe(false);
    });

    it('records a received bid and recalculates low bid', async () => {
      const bid1 = await service.createBid({
        estimateId,
        trade: 'Electrical',
      });
      const bid2 = await service.createBid({
        estimateId,
        trade: 'Electrical',
      });

      await service.receiveBid(bid1.id, 50000);
      await service.receiveBid(bid2.id, 45000);

      const bid1Updated = await service.getBid(bid1.id);
      const bid2Updated = await service.getBid(bid2.id);

      expect(bid1Updated!.status).toBe('received');
      expect(bid2Updated!.status).toBe('received');
      expect(bid1Updated!.isLowBid).toBe(false);
      expect(bid2Updated!.isLowBid).toBe(true);
    });

    it('selects a bid and rejects others for the same trade', async () => {
      const bid1 = await service.createBid({
        estimateId,
        trade: 'Plumbing',
      });
      const bid2 = await service.createBid({
        estimateId,
        trade: 'Plumbing',
      });

      await service.receiveBid(bid1.id, 30000);
      await service.receiveBid(bid2.id, 28000);

      await service.selectBid(bid2.id);

      const bid1Updated = await service.getBid(bid1.id);
      const bid2Updated = await service.getBid(bid2.id);

      expect(bid2Updated!.status).toBe('selected');
      expect(bid1Updated!.status).toBe('rejected');
    });

    it('rejects selecting a non-received bid', async () => {
      const bid = await service.createBid({
        estimateId,
        trade: 'HVAC',
      });

      await expect(service.selectBid(bid.id)).rejects.toThrow('Must be "received"');
    });
  });

  describe('Bid Tabulation', () => {
    let estimateId: string;

    beforeEach(async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Tab Test',
      });
      estimateId = estimate.id;
    });

    it('generates bid tabulation grouped by trade', async () => {
      // Create bids for two trades
      const elecBid1 = await service.createBid({ estimateId, trade: 'Electrical' });
      const elecBid2 = await service.createBid({ estimateId, trade: 'Electrical' });
      const plumbBid1 = await service.createBid({ estimateId, trade: 'Plumbing' });

      await service.receiveBid(elecBid1.id, 50000);
      await service.receiveBid(elecBid2.id, 45000);
      await service.receiveBid(plumbBid1.id, 30000);

      const tabulation = await service.getBidTabulation(estimateId);

      expect(tabulation).toHaveLength(2);

      const elecTab = tabulation.find((t) => t.trade === 'Electrical');
      expect(elecTab).toBeDefined();
      expect(elecTab!.lowBidAmount).toBe(45000);
      expect(elecTab!.highBidAmount).toBe(50000);
      expect(elecTab!.averageBidAmount).toBe(47500);
      expect(elecTab!.spread).toBe(5000);

      const plumbTab = tabulation.find((t) => t.trade === 'Plumbing');
      expect(plumbTab).toBeDefined();
      expect(plumbTab!.lowBidAmount).toBe(30000);
      expect(plumbTab!.spread).toBe(0);
    });
  });

  // ==========================================================================
  // Revision Tracking
  // ==========================================================================

  describe('Revision Tracking', () => {
    it('creates a revision with incremented revision number', async () => {
      const original = await service.createEstimate({
        jobId: 'job-001',
        name: 'Original Estimate',
        defaultMarkupPct: 15,
      });

      await service.addEstimateLine({
        estimateId: original.id,
        description: 'Concrete',
        costType: 'material',
        quantity: 100,
        unitCost: 150,
      });

      const revision = await service.createRevision(original.id, 'Estimator B');

      expect(revision.name).toBe('Original Estimate');
      expect(revision.revision).toBe(2);
      expect(revision.status).toBe('draft');
      expect(revision.createdBy).toBe('Estimator B');

      // Lines should be copied
      const revisionLines = await service.getEstimateLines(revision.id);
      expect(revisionLines).toHaveLength(1);
      expect(revisionLines[0].description).toBe('Concrete');
      expect(revisionLines[0].quantity).toBe(100);
    });
  });

  // ==========================================================================
  // Submit & Win/Loss
  // ==========================================================================

  describe('Submit & Win/Loss', () => {
    it('submits a draft estimate', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Submit Test',
      });

      const submitted = await service.submitEstimate(estimate.id);
      expect(submitted.status).toBe('submitted');
      expect(submitted.submittedDate).toBeTruthy();
    });

    it('rejects submitting a non-draft estimate', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Test',
      });
      await service.submitEstimate(estimate.id);

      await expect(
        service.submitEstimate(estimate.id),
      ).rejects.toThrow('Must be in "draft" status');
    });

    it('marks estimate as won', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Win Test',
      });
      await service.submitEstimate(estimate.id);

      const won = await service.markAsWon(estimate.id);
      expect(won.status).toBe('won');
      expect(won.wonDate).toBeTruthy();
    });

    it('marks estimate as lost with reason', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Loss Test',
      });
      await service.submitEstimate(estimate.id);

      const lost = await service.markAsLost(
        estimate.id,
        'Price too high',
        'Competitor Inc',
        500000,
      );
      expect(lost.status).toBe('lost');
      expect(lost.lostReason).toBe('Price too high');
      expect(lost.competitorName).toBe('Competitor Inc');
      expect(lost.competitorPrice).toBe(500000);
    });

    it('computes win/loss statistics', async () => {
      // Create won estimate
      const est1 = await service.createEstimate({
        jobId: 'job-001',
        name: 'Won Est',
      });
      await service.addEstimateLine({
        estimateId: est1.id,
        description: 'Line',
        costType: 'material',
        quantity: 1,
        unitCost: 10000,
        markupPct: 20,
      });
      await service.submitEstimate(est1.id);
      await service.markAsWon(est1.id);

      // Create lost estimate
      const est2 = await service.createEstimate({
        jobId: 'job-001',
        name: 'Lost Est',
      });
      await service.addEstimateLine({
        estimateId: est2.id,
        description: 'Line',
        costType: 'material',
        quantity: 1,
        unitCost: 20000,
        markupPct: 10,
      });
      await service.submitEstimate(est2.id);
      await service.markAsLost(est2.id, 'Too expensive');

      const stats = await service.getWinLossStats();
      expect(stats.totalEstimates).toBe(2);
      expect(stats.totalWon).toBe(1);
      expect(stats.totalLost).toBe(1);
      expect(stats.winRate).toBe(50);
    });
  });

  // ==========================================================================
  // Budget Transfer
  // ==========================================================================

  describe('Budget Transfer', () => {
    it('prepares estimate-to-budget transfer data', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Transfer Test',
      });

      await service.addEstimateLine({
        estimateId: estimate.id,
        description: 'Concrete',
        costType: 'material',
        quantity: 100,
        unitCost: 150,
        markupPct: 0,
      });
      await service.addEstimateLine({
        estimateId: estimate.id,
        description: 'Alternate scope',
        costType: 'material',
        quantity: 50,
        unitCost: 200,
        markupPct: 0,
        isAlternate: true,
      });

      const transfer = await service.prepareEstimateToBudgetTransfer(estimate.id);
      expect(transfer.jobId).toBe('job-001');
      expect(transfer.lines).toHaveLength(1); // Alternate excluded
      expect(transfer.totalAmount).toBe(15000);
    });

    it('rejects transfer of already-transferred estimate', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Already Transferred',
      });
      await service.markAsTransferred(estimate.id, 'budget-001');

      await expect(
        service.prepareEstimateToBudgetTransfer(estimate.id),
      ).rejects.toThrow('already been transferred');
    });

    it('marks estimate as transferred', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Transfer Mark Test',
      });

      const transferred = await service.markAsTransferred(estimate.id, 'budget-123');
      expect(transferred.transferredToBudget).toBe(true);
      expect(transferred.budgetId).toBe('budget-123');
    });
  });

  // ==========================================================================
  // Historical Cost Lookup
  // ==========================================================================

  describe('Historical Costs', () => {
    it('returns historical costs from won estimates', async () => {
      const est = await service.createEstimate({
        jobId: 'job-001',
        name: 'Historical Test',
      });
      await service.addEstimateLine({
        estimateId: est.id,
        description: 'Concrete',
        costType: 'material',
        costCodeId: 'cc-001',
        quantity: 100,
        unitCost: 150,
        markupPct: 0,
      });
      await service.submitEstimate(est.id);
      await service.markAsWon(est.id);

      const history = await service.getHistoricalCosts();
      expect(history.length).toBeGreaterThan(0);
      const concreteRow = history.find((h) => h.costCodeId === 'cc-001');
      expect(concreteRow).toBeDefined();
      expect(concreteRow!.averageUnitCost).toBe(150);
      expect(concreteRow!.jobCount).toBe(1);
    });

    it('returns empty array when no won estimates exist', async () => {
      const history = await service.getHistoricalCosts();
      expect(history).toHaveLength(0);
    });
  });

  // ==========================================================================
  // CSV Import
  // ==========================================================================

  describe('CSV Import', () => {
    it('imports estimate lines from parsed CSV rows', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Import Test',
        defaultMarkupPct: 10,
      });

      const rows = [
        { description: 'Concrete', costType: 'material' as const, quantity: 100, unit: 'CY', unitCost: 150 },
        { description: 'Rebar', costType: 'material' as const, quantity: 50, unit: 'TON', unitCost: 1200 },
        { description: 'Labor', costType: 'labor' as const, quantity: 200, unit: 'HR', unitCost: 65 },
      ];

      const imported = await service.importEstimateLines(estimate.id, rows);
      expect(imported).toHaveLength(3);

      const lines = await service.getEstimateLines(estimate.id);
      expect(lines).toHaveLength(3);

      // Verify totals were recalculated
      const est = await service.getEstimate(estimate.id);
      expect(est!.totalCost).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits estimating.estimate.created', async () => {
      let emitted = false;
      events.on('estimating.estimate.created', () => { emitted = true; });
      await service.createEstimate({ jobId: 'job-001', name: 'Test' });
      expect(emitted).toBe(true);
    });

    it('emits estimating.estimate.submitted', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Test',
      });
      let emitted = false;
      events.on('estimating.estimate.submitted', () => { emitted = true; });
      await service.submitEstimate(estimate.id);
      expect(emitted).toBe(true);
    });

    it('emits estimating.bid.received', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Test',
      });
      const bid = await service.createBid({
        estimateId: estimate.id,
        trade: 'Concrete',
      });
      let emitted = false;
      events.on('estimating.bid.received', () => { emitted = true; });
      await service.receiveBid(bid.id, 50000);
      expect(emitted).toBe(true);
    });

    it('emits estimating.budget.transferred', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Test',
      });
      let emitted = false;
      events.on('estimating.budget.transferred', () => { emitted = true; });
      await service.markAsTransferred(estimate.id, 'budget-001');
      expect(emitted).toBe(true);
    });
  });

  // ==========================================================================
  // Withdraw
  // ==========================================================================

  describe('Withdraw', () => {
    it('withdraws a submitted estimate', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Withdraw Test',
      });
      await service.submitEstimate(estimate.id);

      const withdrawn = await service.withdrawEstimate(estimate.id);
      expect(withdrawn.status).toBe('withdrawn');
    });

    it('rejects withdrawing a won estimate', async () => {
      const estimate = await service.createEstimate({
        jobId: 'job-001',
        name: 'Cannot Withdraw',
      });
      await service.submitEstimate(estimate.id);
      await service.markAsWon(estimate.id);

      await expect(
        service.withdrawEstimate(estimate.id),
      ).rejects.toThrow('cannot be withdrawn');
    });
  });
});
