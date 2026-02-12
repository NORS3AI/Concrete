/**
 * Equipment Service Tests
 * Tests for the Equipment Management business logic layer (Phase 8).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EquipService } from '../../src/modules/equip/equip-service';
import type {
  Equipment, RateTable, EquipUsage, Maintenance,
  WorkOrder, FuelLog, DepreciationRecord,
} from '../../src/modules/equip/equip-service';
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

  const equipment = new Collection<Equipment>('equip/equipment', adapter, schemas, events);
  const rateTables = new Collection<RateTable>('equip/rateTable', adapter, schemas, events);
  const usages = new Collection<EquipUsage>('equip/usage', adapter, schemas, events);
  const maintenances = new Collection<Maintenance>('equip/maintenance', adapter, schemas, events);
  const workOrders = new Collection<WorkOrder>('equip/workOrder', adapter, schemas, events);
  const fuelLogs = new Collection<FuelLog>('equip/fuelLog', adapter, schemas, events);
  const depreciations = new Collection<DepreciationRecord>('equip/depreciation', adapter, schemas, events);

  const service = new EquipService(
    equipment, rateTables, usages, maintenances,
    workOrders, fuelLogs, depreciations, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EquipService', () => {
  let service: EquipService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Equipment CRUD
  // ==========================================================================

  describe('Equipment CRUD', () => {
    it('creates equipment with defaults', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'CAT 320 Excavator',
        category: 'owned',
        year: 2022,
        make: 'Caterpillar',
        model: '320',
        purchasePrice: 250000,
      });

      expect(equip.equipmentNumber).toBe('EQ-001');
      expect(equip.description).toBe('CAT 320 Excavator');
      expect(equip.category).toBe('owned');
      expect(equip.status).toBe('active');
      expect(equip.purchasePrice).toBe(250000);
      expect(equip.currentValue).toBe(250000);
      expect(equip.meterReading).toBe(0);
    });

    it('rejects duplicate equipment numbers', async () => {
      await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });

      await expect(
        service.createEquipment({
          equipmentNumber: 'EQ-001',
          description: 'Different Machine',
          category: 'rented',
        }),
      ).rejects.toThrow('already exists');
    });

    it('updates equipment', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });

      const updated = await service.updateEquipment(equip.id, {
        meterReading: 1500,
        meterUnit: 'hours',
        locationDescription: 'Job Site A',
      });

      expect(updated.meterReading).toBe(1500);
      expect(updated.meterUnit).toBe('hours');
      expect(updated.locationDescription).toBe('Job Site A');
    });

    it('filters equipment by category', async () => {
      await service.createEquipment({ equipmentNumber: 'EQ-001', description: 'Owned Machine', category: 'owned' });
      await service.createEquipment({ equipmentNumber: 'EQ-002', description: 'Rented Machine', category: 'rented' });

      const owned = await service.getEquipmentList({ category: 'owned' });
      expect(owned).toHaveLength(1);
      expect(owned[0].equipmentNumber).toBe('EQ-001');
    });

    it('filters equipment by status', async () => {
      await service.createEquipment({ equipmentNumber: 'EQ-001', description: 'Active', category: 'owned' });
      const e2 = await service.createEquipment({ equipmentNumber: 'EQ-002', description: 'Inactive', category: 'owned' });
      await service.updateEquipment(e2.id, { status: 'inactive' });

      const active = await service.getEquipmentList({ status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].equipmentNumber).toBe('EQ-001');
    });

    it('looks up equipment by number', async () => {
      await service.createEquipment({ equipmentNumber: 'EQ-100', description: 'Backhoe', category: 'owned' });

      const found = await service.getEquipmentByNumber('EQ-100');
      expect(found).not.toBeNull();
      expect(found!.description).toBe('Backhoe');

      const notFound = await service.getEquipmentByNumber('EQ-999');
      expect(notFound).toBeNull();
    });
  });

  // ==========================================================================
  // Rate Table Management
  // ==========================================================================

  describe('Rate Table Management', () => {
    let equipId: string;

    beforeEach(async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });
      equipId = equip.id;
    });

    it('creates a rate table entry', async () => {
      const rate = await service.createRateTable({
        equipmentId: equipId,
        effectiveDate: '2026-01-01',
        hourlyRate: 150,
        dailyRate: 1200,
        weeklyRate: 5000,
        monthlyRate: 18000,
        fhwaRate: 125,
      });

      expect(rate.equipmentId).toBe(equipId);
      expect(rate.hourlyRate).toBe(150);
      expect(rate.dailyRate).toBe(1200);
      expect(rate.operatorIncluded).toBe(false);
      expect(rate.fhwaRate).toBe(125);
    });

    it('gets the effective rate as of a date', async () => {
      await service.createRateTable({
        equipmentId: equipId,
        effectiveDate: '2025-01-01',
        hourlyRate: 100,
        dailyRate: 800,
      });
      await service.createRateTable({
        equipmentId: equipId,
        effectiveDate: '2026-01-01',
        hourlyRate: 150,
        dailyRate: 1200,
      });

      const rate = await service.getEffectiveRate(equipId, '2025-06-15');
      expect(rate).not.toBeNull();
      expect(rate!.hourlyRate).toBe(100);

      const rate2 = await service.getEffectiveRate(equipId, '2026-02-01');
      expect(rate2).not.toBeNull();
      expect(rate2!.hourlyRate).toBe(150);
    });
  });

  // ==========================================================================
  // Usage Logging & Posting
  // ==========================================================================

  describe('Usage Logging & Posting', () => {
    let equipId: string;

    beforeEach(async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });
      equipId = equip.id;

      await service.createRateTable({
        equipmentId: equipId,
        effectiveDate: '2026-01-01',
        hourlyRate: 150,
        dailyRate: 1200,
      });
    });

    it('logs usage with auto-calculated amount from rate table', async () => {
      const usage = await service.logUsage({
        equipmentId: equipId,
        jobId: 'job-1',
        date: '2026-02-01',
        hours: 8,
      });

      expect(usage.equipmentId).toBe(equipId);
      expect(usage.hours).toBe(8);
      expect(usage.rate).toBe(150);
      expect(usage.amount).toBe(1200); // 150 * 8
      expect(usage.posted).toBe(false);
    });

    it('logs usage with explicit amount', async () => {
      const usage = await service.logUsage({
        equipmentId: equipId,
        date: '2026-02-01',
        hours: 4,
        amount: 500,
      });

      expect(usage.amount).toBe(500);
    });

    it('posts usage records', async () => {
      const u1 = await service.logUsage({
        equipmentId: equipId,
        jobId: 'job-1',
        date: '2026-02-01',
        hours: 8,
        amount: 1200,
      });
      const u2 = await service.logUsage({
        equipmentId: equipId,
        jobId: 'job-1',
        date: '2026-02-02',
        hours: 6,
        amount: 900,
      });

      const posted = await service.postUsage([u1.id, u2.id]);
      expect(posted).toHaveLength(2);
      expect(posted[0].posted).toBe(true);
      expect(posted[1].posted).toBe(true);
    });

    it('skips already-posted records when posting', async () => {
      const u1 = await service.logUsage({
        equipmentId: equipId,
        date: '2026-02-01',
        hours: 8,
        amount: 1200,
      });

      await service.postUsage([u1.id]);
      const posted = await service.postUsage([u1.id]);
      expect(posted).toHaveLength(0);
    });

    it('filters usage records by posted status', async () => {
      const u1 = await service.logUsage({ equipmentId: equipId, date: '2026-02-01', hours: 8, amount: 1200 });
      await service.logUsage({ equipmentId: equipId, date: '2026-02-02', hours: 6, amount: 900 });
      await service.postUsage([u1.id]);

      const unposted = await service.getUsageRecords({ posted: false });
      expect(unposted).toHaveLength(1);

      const allPosted = await service.getUsageRecords({ posted: true });
      expect(allPosted).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Fuel Log Tracking
  // ==========================================================================

  describe('Fuel Log Tracking', () => {
    let equipId: string;

    beforeEach(async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
        meterReading: 1000,
        meterUnit: 'hours',
      });
      equipId = equip.id;
    });

    it('logs fuel with auto-calculated total cost', async () => {
      const log = await service.logFuel({
        equipmentId: equipId,
        date: '2026-02-01',
        gallons: 50,
        costPerGallon: 3.50,
      });

      expect(log.gallons).toBe(50);
      expect(log.costPerGallon).toBe(3.5);
      expect(log.totalCost).toBe(175); // 50 * 3.50
    });

    it('updates equipment meter reading when fuel is logged', async () => {
      await service.logFuel({
        equipmentId: equipId,
        date: '2026-02-01',
        gallons: 50,
        costPerGallon: 3.50,
        meterReading: 1050,
      });

      const equip = await service.getEquipment(equipId);
      expect(equip!.meterReading).toBe(1050);
    });
  });

  // ==========================================================================
  // Maintenance Scheduling
  // ==========================================================================

  describe('Maintenance Scheduling', () => {
    let equipId: string;

    beforeEach(async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });
      equipId = equip.id;
    });

    it('creates a maintenance record with defaults', async () => {
      const maint = await service.createMaintenance({
        equipmentId: equipId,
        type: 'preventive',
        description: 'Oil change',
        scheduledDate: '2026-03-01',
      });

      expect(maint.type).toBe('preventive');
      expect(maint.status).toBe('scheduled');
      expect(maint.description).toBe('Oil change');
    });

    it('completes a maintenance record', async () => {
      const maint = await service.createMaintenance({
        equipmentId: equipId,
        type: 'preventive',
        description: 'Oil change',
        scheduledDate: '2026-03-01',
      });

      const completed = await service.completeMaintenance(
        maint.id,
        '2026-03-01',
        250,
        1500,
      );

      expect(completed.status).toBe('completed');
      expect(completed.completedDate).toBe('2026-03-01');
      expect(completed.cost).toBe(250);
      expect(completed.meterAtService).toBe(1500);

      // Check equipment meter updated
      const equip = await service.getEquipment(equipId);
      expect(equip!.meterReading).toBe(1500);
    });

    it('filters maintenance by status', async () => {
      const m1 = await service.createMaintenance({
        equipmentId: equipId,
        type: 'preventive',
        description: 'Oil change',
        scheduledDate: '2026-03-01',
      });
      await service.createMaintenance({
        equipmentId: equipId,
        type: 'repair',
        description: 'Track repair',
        scheduledDate: '2026-04-01',
      });
      await service.completeMaintenance(m1.id, '2026-03-01');

      const scheduled = await service.getMaintenanceRecords({ status: 'scheduled' });
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].description).toBe('Track repair');
    });
  });

  // ==========================================================================
  // Work Order Management
  // ==========================================================================

  describe('Work Order Management', () => {
    let equipId: string;

    beforeEach(async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });
      equipId = equip.id;
    });

    it('creates a work order with defaults', async () => {
      const wo = await service.createWorkOrder({
        equipmentId: equipId,
        number: 'WO-001',
        description: 'Hydraulic leak repair',
        priority: 'high',
        assignedTo: 'John Mechanic',
      });

      expect(wo.number).toBe('WO-001');
      expect(wo.priority).toBe('high');
      expect(wo.status).toBe('open');
      expect(wo.assignedTo).toBe('John Mechanic');
    });

    it('rejects duplicate work order numbers', async () => {
      await service.createWorkOrder({
        equipmentId: equipId,
        number: 'WO-001',
        description: 'Repair 1',
        priority: 'medium',
      });

      await expect(
        service.createWorkOrder({
          equipmentId: equipId,
          number: 'WO-001',
          description: 'Repair 2',
          priority: 'low',
        }),
      ).rejects.toThrow('already exists');
    });

    it('completes a work order', async () => {
      const wo = await service.createWorkOrder({
        equipmentId: equipId,
        number: 'WO-001',
        description: 'Hydraulic leak repair',
        priority: 'high',
      });

      const completed = await service.completeWorkOrder(
        wo.id,
        '2026-02-15',
        4,
        350.50,
        850.75,
      );

      expect(completed.status).toBe('completed');
      expect(completed.completedDate).toBe('2026-02-15');
      expect(completed.laborHours).toBe(4);
      expect(completed.partsCost).toBe(350.50);
      expect(completed.totalCost).toBe(850.75);
    });
  });

  // ==========================================================================
  // Depreciation Calculation
  // ==========================================================================

  describe('Depreciation Calculation', () => {
    it('calculates straight-line depreciation', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
        purchasePrice: 120000,
        purchaseDate: '2025-01-01',
        salvageValue: 20000,
        usefulLifeMonths: 60,
        depreciationMethod: 'straight_line',
      });

      const depr = await service.calculateDepreciation(
        equip.id,
        '2026-01-01',
        '2026-02-01',
      );

      // Monthly = (120000 - 20000) / 60 = 1666.67
      expect(depr.method).toBe('straight_line');
      expect(depr.beginningValue).toBe(120000);
      expect(depr.depreciationAmount).toBe(1666.67);
      expect(depr.accumulatedDepreciation).toBe(1666.67);
      expect(depr.endingValue).toBe(118333.33);

      // Check equipment currentValue updated
      const updated = await service.getEquipment(equip.id);
      expect(updated!.currentValue).toBe(118333.33);
    });

    it('calculates declining balance depreciation', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-002',
        description: 'Loader',
        category: 'owned',
        purchasePrice: 100000,
        purchaseDate: '2025-01-01',
        salvageValue: 10000,
        usefulLifeMonths: 60,
        depreciationMethod: 'declining_balance',
      });

      const depr = await service.calculateDepreciation(
        equip.id,
        '2026-01-01',
        '2026-02-01',
      );

      // Annual rate = 2 / (60/12) = 0.4
      // Monthly rate = 0.4 * (1/12) = 0.03333
      // Depreciation = 100000 * 0.03333 = 3333.33
      expect(depr.method).toBe('declining_balance');
      expect(depr.beginningValue).toBe(100000);
      expect(depr.depreciationAmount).toBe(3333.33);
      expect(depr.endingValue).toBe(96666.67);
    });

    it('does not depreciate below salvage value', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-003',
        description: 'Small Tool',
        category: 'owned',
        purchasePrice: 1000,
        purchaseDate: '2025-01-01',
        salvageValue: 950,
        usefulLifeMonths: 60,
        depreciationMethod: 'straight_line',
      });

      const depr = await service.calculateDepreciation(
        equip.id,
        '2026-01-01',
        '2026-02-01',
      );

      // Monthly = (1000 - 950) / 60 = 0.83
      // But the max depreciation is beginning (1000) - salvage (950) = 50
      // 0.83 < 50, so it should be 0.83
      expect(depr.depreciationAmount).toBe(0.83);
    });

    it('rejects depreciation for equipment without purchase price', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-004',
        description: 'Rented Machine',
        category: 'rented',
        depreciationMethod: 'straight_line',
      });

      await expect(
        service.calculateDepreciation(equip.id, '2026-01-01', '2026-02-01'),
      ).rejects.toThrow('no purchase price');
    });

    it('calculates MACRS depreciation', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-005',
        description: 'Dump Truck',
        category: 'owned',
        purchasePrice: 200000,
        purchaseDate: '2026-01-01',
        salvageValue: 0,
        usefulLifeMonths: 60,
        depreciationMethod: 'macrs',
      });

      const depr = await service.calculateDepreciation(
        equip.id,
        '2026-01-01',
        '2026-02-01',
      );

      // Year 0 (5-year MACRS): 20% of 200000 = 40000/year, /12 = 3333.33/month
      expect(depr.method).toBe('macrs');
      expect(depr.beginningValue).toBe(200000);
      expect(depr.depreciationAmount).toBe(3333.33);
    });
  });

  // ==========================================================================
  // Utilization Report
  // ==========================================================================

  describe('Utilization Report', () => {
    it('calculates utilization by equipment', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });

      await service.logUsage({
        equipmentId: equip.id,
        jobId: 'job-1',
        date: '2026-02-01',
        hours: 8,
        amount: 1200,
      });
      await service.logUsage({
        equipmentId: equip.id,
        jobId: 'job-1',
        date: '2026-02-02',
        hours: 6,
        amount: 900,
      });

      const report = await service.getUtilizationByEquipment('2026-02-01', '2026-02-28');
      expect(report).toHaveLength(1);
      expect(report[0].equipmentNumber).toBe('EQ-001');
      expect(report[0].totalHours).toBe(14);
      expect(report[0].totalAmount).toBe(2100);
      expect(report[0].utilizationPct).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Equipment P&L Report
  // ==========================================================================

  describe('Equipment P&L Report', () => {
    it('calculates P&L by equipment unit', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });

      // Revenue (posted usage)
      const u1 = await service.logUsage({
        equipmentId: equip.id,
        jobId: 'job-1',
        date: '2026-02-01',
        hours: 8,
        amount: 1200,
      });
      await service.postUsage([u1.id]);

      // Fuel cost
      await service.logFuel({
        equipmentId: equip.id,
        date: '2026-02-01',
        gallons: 50,
        costPerGallon: 3.50,
      });

      const report = await service.getEquipmentPnl('2026-02-01', '2026-02-28');
      expect(report).toHaveLength(1);
      expect(report[0].revenue).toBe(1200);
      expect(report[0].fuelCost).toBe(175); // 50 * 3.50
      expect(report[0].netIncome).toBe(1025); // 1200 - 175
    });
  });

  // ==========================================================================
  // FHWA Comparison
  // ==========================================================================

  describe('FHWA Comparison', () => {
    it('compares internal vs FHWA rates', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });

      await service.createRateTable({
        equipmentId: equip.id,
        effectiveDate: '2026-01-01',
        hourlyRate: 150,
        fhwaRate: 125,
      });

      const report = await service.getFhwaComparison('2026-02-01');
      expect(report).toHaveLength(1);
      expect(report[0].internalHourlyRate).toBe(150);
      expect(report[0].fhwaRate).toBe(125);
      expect(report[0].variance).toBe(25);
      expect(report[0].variancePct).toBe(20);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits equip.created', async () => {
      let emitted = false;
      events.on('equip.created', () => { emitted = true; });
      await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });
      expect(emitted).toBe(true);
    });

    it('emits equip.updated', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });

      let emitted = false;
      events.on('equip.updated', () => { emitted = true; });
      await service.updateEquipment(equip.id, { meterReading: 100 });
      expect(emitted).toBe(true);
    });

    it('emits equip.usage.posted', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });
      const usage = await service.logUsage({
        equipmentId: equip.id,
        date: '2026-02-01',
        hours: 8,
        amount: 1200,
      });

      let emitted = false;
      events.on('equip.usage.posted', () => { emitted = true; });
      await service.postUsage([usage.id]);
      expect(emitted).toBe(true);
    });

    it('emits equip.maintenance.completed', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });
      const maint = await service.createMaintenance({
        equipmentId: equip.id,
        type: 'preventive',
        description: 'Oil change',
      });

      let emitted = false;
      events.on('equip.maintenance.completed', () => { emitted = true; });
      await service.completeMaintenance(maint.id, '2026-02-15');
      expect(emitted).toBe(true);
    });

    it('emits equip.fuel.logged', async () => {
      const equip = await service.createEquipment({
        equipmentNumber: 'EQ-001',
        description: 'Excavator',
        category: 'owned',
      });

      let emitted = false;
      events.on('equip.fuel.logged', () => { emitted = true; });
      await service.logFuel({
        equipmentId: equip.id,
        date: '2026-02-01',
        gallons: 50,
        costPerGallon: 3.50,
      });
      expect(emitted).toBe(true);
    });
  });
});
