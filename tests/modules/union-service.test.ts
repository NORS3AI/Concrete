/**
 * Union Service Tests
 * Tests for the Union & Prevailing Wage business logic layer (Phase 7).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UnionService } from '../../src/modules/union/union-service';
import type {
  Union, RateTable, RateTableLine, FringeBenefit,
  PrevailingWage, CertifiedPayroll, Apprentice, Remittance,
} from '../../src/modules/union/union-service';
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

  const unions = new Collection<Union>('union/union', adapter, schemas, events);
  const rateTables = new Collection<RateTable>('union/rateTable', adapter, schemas, events);
  const rateTableLines = new Collection<RateTableLine>('union/rateTableLine', adapter, schemas, events);
  const fringeBenefits = new Collection<FringeBenefit>('union/fringeBenefit', adapter, schemas, events);
  const prevailingWages = new Collection<PrevailingWage>('union/prevailingWage', adapter, schemas, events);
  const certifiedPayrolls = new Collection<CertifiedPayroll>('union/certifiedPayroll', adapter, schemas, events);
  const apprentices = new Collection<Apprentice>('union/apprentice', adapter, schemas, events);
  const remittances = new Collection<Remittance>('union/remittance', adapter, schemas, events);

  const service = new UnionService(
    unions, rateTables, rateTableLines, fringeBenefits,
    prevailingWages, certifiedPayrolls, apprentices, remittances, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UnionService', () => {
  let service: UnionService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Union CRUD
  // ==========================================================================

  describe('Union CRUD', () => {
    it('creates a union with defaults', async () => {
      const union = await service.createUnion({
        name: 'IBEW',
        localNumber: 'Local 134',
        trade: 'Electrician',
      });

      expect(union.name).toBe('IBEW');
      expect(union.localNumber).toBe('Local 134');
      expect(union.trade).toBe('Electrician');
      expect(union.status).toBe('active');
      expect(union.id).toBeDefined();
    });

    it('rejects duplicate local numbers', async () => {
      await service.createUnion({
        name: 'IBEW',
        localNumber: 'Local 134',
        trade: 'Electrician',
      });
      await expect(
        service.createUnion({
          name: 'IBEW West',
          localNumber: 'Local 134',
          trade: 'Electrician',
        }),
      ).rejects.toThrow('already exists');
    });

    it('updates a union', async () => {
      const union = await service.createUnion({
        name: 'IBEW',
        localNumber: 'Local 134',
        trade: 'Electrician',
      });
      const updated = await service.updateUnion(union.id, {
        jurisdiction: 'Cook County, IL',
        contactName: 'John Smith',
        contactPhone: '555-0100',
      });
      expect(updated.jurisdiction).toBe('Cook County, IL');
      expect(updated.contactName).toBe('John Smith');
      expect(updated.contactPhone).toBe('555-0100');
    });

    it('filters unions by status', async () => {
      await service.createUnion({ name: 'IBEW', localNumber: 'Local 134', trade: 'Electrician' });
      const u2 = await service.createUnion({ name: 'UA', localNumber: 'Local 597', trade: 'Pipefitter' });
      await service.updateUnion(u2.id, { status: 'inactive' });

      const active = await service.getUnions({ status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('IBEW');
    });

    it('filters unions by trade', async () => {
      await service.createUnion({ name: 'IBEW', localNumber: 'Local 134', trade: 'Electrician' });
      await service.createUnion({ name: 'UA', localNumber: 'Local 597', trade: 'Pipefitter' });

      const electricians = await service.getUnions({ trade: 'Electrician' });
      expect(electricians).toHaveLength(1);
      expect(electricians[0].name).toBe('IBEW');
    });

    it('refuses to delete a union with rate tables', async () => {
      const union = await service.createUnion({
        name: 'IBEW',
        localNumber: 'Local 134',
        trade: 'Electrician',
      });
      await service.createRateTable({
        unionId: union.id,
        name: 'Standard Rates 2026',
        effectiveDate: '2026-01-01',
        classification: 'Journeyman',
      });

      await expect(service.deleteUnion(union.id)).rejects.toThrow('rate table');
    });
  });

  // ==========================================================================
  // Rate Table Management
  // ==========================================================================

  describe('Rate Table Management', () => {
    let unionId: string;

    beforeEach(async () => {
      const union = await service.createUnion({
        name: 'IBEW',
        localNumber: 'Local 134',
        trade: 'Electrician',
      });
      unionId = union.id;
    });

    it('creates a rate table with defaults', async () => {
      const rt = await service.createRateTable({
        unionId,
        name: 'Standard Rates 2026',
        effectiveDate: '2026-01-01',
        expirationDate: '2026-12-31',
        classification: 'Journeyman',
        journeymanRate: 52.50,
        apprenticePct: 50,
      });

      expect(rt.unionId).toBe(unionId);
      expect(rt.name).toBe('Standard Rates 2026');
      expect(rt.classification).toBe('Journeyman');
      expect(rt.journeymanRate).toBe(52.50);
      expect(rt.apprenticePct).toBe(50);
      expect(rt.status).toBe('active');
    });

    it('adds line items to a rate table', async () => {
      const rt = await service.createRateTable({
        unionId,
        name: 'Standard Rates 2026',
        effectiveDate: '2026-01-01',
        classification: 'Journeyman',
      });

      await service.addRateTableLine({
        rateTableId: rt.id,
        category: 'base_wage',
        description: 'Base hourly wage',
        rate: 52.50,
        method: 'hourly',
        payableTo: 'employee',
      });

      await service.addRateTableLine({
        rateTableId: rt.id,
        category: 'pension',
        description: 'Pension fund contribution',
        rate: 12.75,
        method: 'hourly',
        payableTo: 'fund',
        fundName: 'IBEW Pension Fund',
      });

      await service.addRateTableLine({
        rateTableId: rt.id,
        category: 'health',
        description: 'Health & welfare',
        rate: 15.20,
        method: 'hourly',
        payableTo: 'fund',
        fundName: 'IBEW H&W Fund',
      });

      const lines = await service.getRateTableLines(rt.id);
      expect(lines).toHaveLength(3);
      expect(lines.find(l => l.category === 'base_wage')?.rate).toBe(52.50);
      expect(lines.find(l => l.category === 'pension')?.rate).toBe(12.75);
    });

    it('filters rate tables by union and status', async () => {
      await service.createRateTable({
        unionId,
        name: 'Active Rates',
        effectiveDate: '2026-01-01',
        classification: 'Journeyman',
        status: 'active',
      });
      await service.createRateTable({
        unionId,
        name: 'Old Rates',
        effectiveDate: '2025-01-01',
        classification: 'Journeyman',
        status: 'expired',
      });

      const active = await service.getRateTables({ unionId, status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Active Rates');
    });
  });

  // ==========================================================================
  // Rate Lookup
  // ==========================================================================

  describe('Rate Lookup', () => {
    let unionId: string;

    beforeEach(async () => {
      const union = await service.createUnion({
        name: 'IBEW',
        localNumber: 'Local 134',
        trade: 'Electrician',
      });
      unionId = union.id;
    });

    it('looks up rates for a given union, classification, and date', async () => {
      const rt = await service.createRateTable({
        unionId,
        name: 'Standard Rates 2026',
        effectiveDate: '2026-01-01',
        expirationDate: '2026-12-31',
        classification: 'Journeyman',
        journeymanRate: 52.50,
      });

      await service.addRateTableLine({
        rateTableId: rt.id,
        category: 'base_wage',
        rate: 52.50,
        method: 'hourly',
        payableTo: 'employee',
      });
      await service.addRateTableLine({
        rateTableId: rt.id,
        category: 'pension',
        rate: 12.75,
        method: 'hourly',
        payableTo: 'fund',
      });

      const result = await service.lookupRate(unionId, 'Journeyman', '2026-06-15');
      expect(result).not.toBeNull();
      expect(result!.rateTableName).toBe('Standard Rates 2026');
      expect(result!.lines).toHaveLength(2);
      expect(result!.totalHourlyRate).toBe(65.25); // 52.50 + 12.75
      expect(result!.totalFringeRate).toBe(12.75);
    });

    it('returns null when no matching rate table found', async () => {
      const result = await service.lookupRate(unionId, 'Nonexistent', '2026-06-15');
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Fringe Benefit Configuration
  // ==========================================================================

  describe('Fringe Benefit Configuration', () => {
    let unionId: string;

    beforeEach(async () => {
      const union = await service.createUnion({
        name: 'IBEW',
        localNumber: 'Local 134',
        trade: 'Electrician',
      });
      unionId = union.id;
    });

    it('creates a fringe benefit with cash allocation', async () => {
      const fb = await service.createFringeBenefit({
        unionId,
        name: 'Health & Welfare',
        rate: 15.20,
        method: 'hourly',
        payableTo: 'fund',
        allocationMethod: 'cash',
        fundName: 'IBEW H&W Fund',
        fundAddress: '123 Main St, Chicago, IL',
        fundAccountNumber: 'HW-12345',
      });

      expect(fb.name).toBe('Health & Welfare');
      expect(fb.rate).toBe(15.20);
      expect(fb.method).toBe('hourly');
      expect(fb.payableTo).toBe('fund');
      expect(fb.allocationMethod).toBe('cash');
      expect(fb.fundName).toBe('IBEW H&W Fund');
      expect(fb.fundAccountNumber).toBe('HW-12345');
    });

    it('creates a fringe benefit with plan allocation', async () => {
      const fb = await service.createFringeBenefit({
        unionId,
        name: 'Pension',
        rate: 12.75,
        method: 'hourly',
        payableTo: 'fund',
        allocationMethod: 'plan',
        fundName: 'IBEW Pension Fund',
      });

      expect(fb.allocationMethod).toBe('plan');
    });

    it('gets fringe benefits for a union', async () => {
      await service.createFringeBenefit({
        unionId,
        name: 'Health & Welfare',
        rate: 15.20,
        method: 'hourly',
        payableTo: 'fund',
        allocationMethod: 'cash',
      });
      await service.createFringeBenefit({
        unionId,
        name: 'Pension',
        rate: 12.75,
        method: 'hourly',
        payableTo: 'fund',
        allocationMethod: 'plan',
      });

      const benefits = await service.getFringeBenefits(unionId);
      expect(benefits).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Prevailing Wage Management
  // ==========================================================================

  describe('Prevailing Wage Management', () => {
    it('creates a prevailing wage with auto-computed totalRate', async () => {
      const pw = await service.createPrevailingWage({
        jurisdiction: 'Cook County, IL',
        state: 'IL',
        county: 'Cook',
        projectType: 'federal',
        classification: 'Electrician',
        trade: 'Electrical',
        baseRate: 52.50,
        fringeRate: 28.45,
        effectiveDate: '2026-01-01',
        source: 'davis_bacon',
      });

      expect(pw.jurisdiction).toBe('Cook County, IL');
      expect(pw.baseRate).toBe(52.50);
      expect(pw.fringeRate).toBe(28.45);
      expect(pw.totalRate).toBe(80.95);
      expect(pw.source).toBe('davis_bacon');
      expect(pw.projectType).toBe('federal');
    });

    it('updates prevailing wage and recalculates totalRate', async () => {
      const pw = await service.createPrevailingWage({
        jurisdiction: 'Cook County, IL',
        state: 'IL',
        projectType: 'federal',
        classification: 'Electrician',
        trade: 'Electrical',
        baseRate: 52.50,
        fringeRate: 28.45,
        effectiveDate: '2026-01-01',
        source: 'davis_bacon',
      });

      const updated = await service.updatePrevailingWage(pw.id, {
        baseRate: 55.00,
      });

      expect(updated.baseRate).toBe(55.00);
      expect(updated.totalRate).toBe(83.45); // 55.00 + 28.45
    });

    it('looks up prevailing wage by jurisdiction and classification', async () => {
      await service.createPrevailingWage({
        jurisdiction: 'Cook County, IL',
        state: 'IL',
        projectType: 'federal',
        classification: 'Electrician',
        trade: 'Electrical',
        baseRate: 52.50,
        fringeRate: 28.45,
        effectiveDate: '2026-01-01',
        source: 'davis_bacon',
      });

      const result = await service.lookupPrevailingWage('Cook County, IL', 'Electrician', '2026-06-15');
      expect(result).not.toBeNull();
      expect(result!.baseRate).toBe(52.50);
      expect(result!.totalRate).toBe(80.95);
    });

    it('filters prevailing wages by source', async () => {
      await service.createPrevailingWage({
        jurisdiction: 'Cook County, IL',
        state: 'IL',
        projectType: 'federal',
        classification: 'Electrician',
        trade: 'Electrical',
        baseRate: 52.50,
        fringeRate: 28.45,
        effectiveDate: '2026-01-01',
        source: 'davis_bacon',
      });
      await service.createPrevailingWage({
        jurisdiction: 'DuPage County, IL',
        state: 'IL',
        projectType: 'state',
        classification: 'Electrician',
        trade: 'Electrical',
        baseRate: 48.00,
        fringeRate: 25.00,
        effectiveDate: '2026-01-01',
        source: 'state',
      });

      const federal = await service.getPrevailingWages({ source: 'davis_bacon' });
      expect(federal).toHaveLength(1);
      expect(federal[0].jurisdiction).toBe('Cook County, IL');
    });
  });

  // ==========================================================================
  // Certified Payroll (WH-347)
  // ==========================================================================

  describe('Certified Payroll', () => {
    it('generates a certified payroll report', async () => {
      const report = await service.generateCertifiedPayroll({
        jobId: 'job-001',
        weekEndingDate: '2026-02-07',
        contractorName: 'ABC Construction',
        projectName: 'City Hall Renovation',
        projectNumber: 'CH-2026-001',
        reportNumber: 'WH347-001',
        totalGross: 125000.00,
        totalFringe: 45000.00,
        totalNet: 80000.00,
      });

      expect(report.jobId).toBe('job-001');
      expect(report.weekEndingDate).toBe('2026-02-07');
      expect(report.contractorName).toBe('ABC Construction');
      expect(report.status).toBe('draft');
      expect(report.totalGross).toBe(125000.00);
      expect(report.totalFringe).toBe(45000.00);
      expect(report.totalNet).toBe(80000.00);
    });

    it('follows the status workflow: draft -> submitted -> approved', async () => {
      const report = await service.generateCertifiedPayroll({
        jobId: 'job-001',
        weekEndingDate: '2026-02-07',
        contractorName: 'ABC Construction',
        projectName: 'City Hall Renovation',
        totalGross: 125000.00,
        totalFringe: 45000.00,
        totalNet: 80000.00,
      });

      expect(report.status).toBe('draft');

      const submitted = await service.submitCertifiedPayroll(report.id);
      expect(submitted.status).toBe('submitted');

      const approved = await service.approveCertifiedPayroll(submitted.id);
      expect(approved.status).toBe('approved');
    });

    it('rejects submission of non-draft report', async () => {
      const report = await service.generateCertifiedPayroll({
        jobId: 'job-001',
        weekEndingDate: '2026-02-07',
        contractorName: 'ABC Construction',
        projectName: 'City Hall Renovation',
        totalGross: 125000.00,
        totalFringe: 45000.00,
        totalNet: 80000.00,
      });

      await service.submitCertifiedPayroll(report.id);

      await expect(
        service.submitCertifiedPayroll(report.id),
      ).rejects.toThrow('cannot be submitted');
    });

    it('rejects approval of non-submitted report', async () => {
      const report = await service.generateCertifiedPayroll({
        jobId: 'job-001',
        weekEndingDate: '2026-02-07',
        contractorName: 'ABC Construction',
        projectName: 'City Hall Renovation',
        totalGross: 125000.00,
        totalFringe: 45000.00,
        totalNet: 80000.00,
      });

      await expect(
        service.approveCertifiedPayroll(report.id),
      ).rejects.toThrow('cannot be approved');
    });
  });

  // ==========================================================================
  // Apprentice Tracking
  // ==========================================================================

  describe('Apprentice Tracking', () => {
    let unionId: string;

    beforeEach(async () => {
      const union = await service.createUnion({
        name: 'IBEW',
        localNumber: 'Local 134',
        trade: 'Electrician',
      });
      unionId = union.id;
    });

    it('creates an apprentice with defaults', async () => {
      const apprentice = await service.createApprentice({
        employeeId: 'emp-001',
        unionId,
        trade: 'Electrician',
        startDate: '2025-06-01',
        periodNumber: 2,
        totalPeriods: 8,
        currentRatio: 0.5,
        requiredRatio: 0.33,
      });

      expect(apprentice.employeeId).toBe('emp-001');
      expect(apprentice.unionId).toBe(unionId);
      expect(apprentice.trade).toBe('Electrician');
      expect(apprentice.periodNumber).toBe(2);
      expect(apprentice.totalPeriods).toBe(8);
      expect(apprentice.status).toBe('active');
      expect(apprentice.currentRatio).toBe(0.5);
      expect(apprentice.requiredRatio).toBe(0.33);
    });

    it('checks apprentice compliance - compliant', async () => {
      await service.createApprentice({
        employeeId: 'emp-001',
        unionId,
        trade: 'Electrician',
        startDate: '2025-06-01',
        periodNumber: 2,
        totalPeriods: 8,
        currentRatio: 0.5,
        requiredRatio: 0.33,
      });

      const compliance = await service.checkApprenticeCompliance(unionId);
      expect(compliance).toHaveLength(1);
      expect(compliance[0].isCompliant).toBe(true);
      expect(compliance[0].currentRatio).toBe(0.5);
      expect(compliance[0].requiredRatio).toBe(0.33);
    });

    it('checks apprentice compliance - non-compliant', async () => {
      await service.createApprentice({
        employeeId: 'emp-002',
        unionId,
        trade: 'Electrician',
        startDate: '2025-06-01',
        periodNumber: 1,
        totalPeriods: 8,
        currentRatio: 0.1,
        requiredRatio: 0.33,
      });

      const compliance = await service.checkApprenticeCompliance(unionId);
      expect(compliance).toHaveLength(1);
      expect(compliance[0].isCompliant).toBe(false);
    });
  });

  // ==========================================================================
  // Remittance Reports
  // ==========================================================================

  describe('Remittance Reports', () => {
    let unionId: string;

    beforeEach(async () => {
      const union = await service.createUnion({
        name: 'IBEW',
        localNumber: 'Local 134',
        trade: 'Electrician',
      });
      unionId = union.id;
    });

    it('creates a remittance with defaults', async () => {
      const rem = await service.createRemittance({
        unionId,
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        dueDate: '2026-02-15',
        totalHours: 1280,
        totalAmount: 85760.00,
        employeeCount: 16,
      });

      expect(rem.unionId).toBe(unionId);
      expect(rem.periodStart).toBe('2026-01-01');
      expect(rem.periodEnd).toBe('2026-01-31');
      expect(rem.totalHours).toBe(1280);
      expect(rem.totalAmount).toBe(85760.00);
      expect(rem.status).toBe('draft');
      expect(rem.employeeCount).toBe(16);
    });

    it('follows the status workflow: draft -> submitted -> paid', async () => {
      const rem = await service.createRemittance({
        unionId,
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        totalHours: 1280,
        totalAmount: 85760.00,
      });

      expect(rem.status).toBe('draft');

      const submitted = await service.submitRemittance(rem.id);
      expect(submitted.status).toBe('submitted');

      const paid = await service.payRemittance(submitted.id);
      expect(paid.status).toBe('paid');
    });

    it('rejects submission of non-draft remittance', async () => {
      const rem = await service.createRemittance({
        unionId,
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        totalHours: 1280,
        totalAmount: 85760.00,
      });

      await service.submitRemittance(rem.id);

      await expect(
        service.submitRemittance(rem.id),
      ).rejects.toThrow('cannot be submitted');
    });

    it('generates a remittance summary', async () => {
      await service.createRemittance({
        unionId,
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        totalHours: 1280,
        totalAmount: 85760.00,
        employeeCount: 16,
      });
      await service.createRemittance({
        unionId,
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
        totalHours: 1120,
        totalAmount: 74880.00,
        employeeCount: 14,
      });

      const summary = await service.getRemittanceSummary('2026-01-01', '2026-02-28');
      expect(summary).toHaveLength(1);
      expect(summary[0].unionName).toBe('IBEW');
      expect(summary[0].totalHours).toBe(2400);
      expect(summary[0].totalAmount).toBe(160640.00);
    });
  });

  // ==========================================================================
  // Import Helpers
  // ==========================================================================

  describe('Import Helpers', () => {
    let unionId: string;

    beforeEach(async () => {
      const union = await service.createUnion({
        name: 'IBEW',
        localNumber: 'Local 134',
        trade: 'Electrician',
      });
      unionId = union.id;
    });

    it('imports rate table rows from CSV data', async () => {
      const result = await service.importRateTableRows([
        {
          unionLocalNumber: 'Local 134',
          rateTableName: 'Standard Rates 2026',
          classification: 'Journeyman',
          category: 'base_wage',
          description: 'Base hourly wage',
          rate: 52.50,
          method: 'hourly',
          payableTo: 'employee',
          effectiveDate: '2026-01-01',
          expirationDate: '2026-12-31',
        },
        {
          unionLocalNumber: 'Local 134',
          rateTableName: 'Standard Rates 2026',
          classification: 'Journeyman',
          category: 'pension',
          description: 'Pension fund',
          rate: 12.75,
          method: 'hourly',
          payableTo: 'fund',
          fundName: 'IBEW Pension Fund',
          effectiveDate: '2026-01-01',
          expirationDate: '2026-12-31',
        },
      ]);

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);

      // Verify rate table was created
      const tables = await service.getRateTables({ unionId });
      expect(tables).toHaveLength(1);
      expect(tables[0].classification).toBe('Journeyman');

      // Verify lines
      const lines = await service.getRateTableLines(tables[0].id);
      expect(lines).toHaveLength(2);
    });

    it('reports errors for unknown union local numbers during import', async () => {
      const result = await service.importRateTableRows([
        {
          unionLocalNumber: 'Local 999',
          rateTableName: 'Unknown',
          classification: 'Journeyman',
          category: 'base_wage',
          rate: 50.00,
          method: 'hourly',
          payableTo: 'employee',
          effectiveDate: '2026-01-01',
        },
      ]);

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not found');
    });

    it('imports prevailing wage schedule rows', async () => {
      const result = await service.importPrevailingWageRows([
        {
          jurisdiction: 'Cook County, IL',
          state: 'IL',
          county: 'Cook',
          projectType: 'federal',
          classification: 'Electrician',
          trade: 'Electrical',
          baseRate: 52.50,
          fringeRate: 28.45,
          effectiveDate: '2026-01-01',
          source: 'davis_bacon',
        },
        {
          jurisdiction: 'DuPage County, IL',
          state: 'IL',
          county: 'DuPage',
          projectType: 'state',
          classification: 'Electrician',
          trade: 'Electrical',
          baseRate: 48.00,
          fringeRate: 25.00,
          effectiveDate: '2026-01-01',
          source: 'state',
        },
      ]);

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);

      const wages = await service.getPrevailingWages();
      expect(wages).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits union.created', async () => {
      let emitted = false;
      events.on('union.created', () => { emitted = true; });
      await service.createUnion({ name: 'IBEW', localNumber: 'Local 134', trade: 'Electrician' });
      expect(emitted).toBe(true);
    });

    it('emits union.rateTable.created', async () => {
      const union = await service.createUnion({ name: 'IBEW', localNumber: 'Local 134', trade: 'Electrician' });
      let emitted = false;
      events.on('union.rateTable.created', () => { emitted = true; });
      await service.createRateTable({
        unionId: union.id,
        name: 'Standard Rates',
        effectiveDate: '2026-01-01',
        classification: 'Journeyman',
      });
      expect(emitted).toBe(true);
    });

    it('emits union.certifiedPayroll.generated', async () => {
      let emitted = false;
      events.on('union.certifiedPayroll.generated', () => { emitted = true; });
      await service.generateCertifiedPayroll({
        jobId: 'job-001',
        weekEndingDate: '2026-02-07',
        contractorName: 'ABC Construction',
        projectName: 'City Hall',
        totalGross: 100000,
        totalFringe: 35000,
        totalNet: 65000,
      });
      expect(emitted).toBe(true);
    });

    it('emits union.remittance.created', async () => {
      const union = await service.createUnion({ name: 'IBEW', localNumber: 'Local 134', trade: 'Electrician' });
      let emitted = false;
      events.on('union.remittance.created', () => { emitted = true; });
      await service.createRemittance({
        unionId: union.id,
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        totalHours: 1280,
        totalAmount: 85760,
      });
      expect(emitted).toBe(true);
    });
  });
});
