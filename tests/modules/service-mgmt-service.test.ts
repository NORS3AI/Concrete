/**
 * Service Management Service Tests
 * Tests for the Service Management business logic layer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceMgmtService } from '../../src/modules/service-mgmt/service-mgmt-service';
import type {
  ServiceAgreement, WorkOrder, WorkOrderLine, ServiceCall,
  CustomerEquipment, PreventiveMaintenance, TechnicianTimeEntry,
} from '../../src/modules/service-mgmt/service-mgmt-service';
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

  const agreements = new Collection<ServiceAgreement>('service/serviceAgreement', adapter, schemas, events);
  const workOrders = new Collection<WorkOrder>('service/workOrder', adapter, schemas, events);
  const workOrderLines = new Collection<WorkOrderLine>('service/workOrderLine', adapter, schemas, events);
  const serviceCalls = new Collection<ServiceCall>('service/serviceCall', adapter, schemas, events);
  const customerEquipment = new Collection<CustomerEquipment>('service/customerEquipment', adapter, schemas, events);
  const preventiveMaintenances = new Collection<PreventiveMaintenance>('service/preventiveMaintenance', adapter, schemas, events);
  const technicianTimeEntries = new Collection<TechnicianTimeEntry>('service/technicianTimeEntry', adapter, schemas, events);

  const service = new ServiceMgmtService(
    agreements, workOrders, workOrderLines, serviceCalls,
    customerEquipment, preventiveMaintenances, technicianTimeEntries, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ServiceMgmtService', () => {
  let service: ServiceMgmtService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Agreement CRUD
  // ==========================================================================

  describe('Agreement CRUD', () => {
    it('creates an agreement with defaults', async () => {
      const agreement = await service.createAgreement({
        customerId: 'cust-1',
        name: 'Full Service Contract',
        type: 'full_service',
        startDate: '2026-01-01',
      });

      expect(agreement.name).toBe('Full Service Contract');
      expect(agreement.customerId).toBe('cust-1');
      expect(agreement.type).toBe('full_service');
      expect(agreement.status).toBe('pending');
      expect(agreement.recurringAmount).toBe(0);
    });

    it('updates an agreement', async () => {
      const agreement = await service.createAgreement({
        customerId: 'cust-1',
        name: 'Test Agreement',
        type: 'preventive',
        startDate: '2026-01-01',
      });

      const updated = await service.updateAgreement(agreement.id, {
        recurringAmount: 5000,
        billingFrequency: 'monthly',
      });

      expect(updated.recurringAmount).toBe(5000);
      expect(updated.billingFrequency).toBe('monthly');
    });

    it('renews an agreement', async () => {
      const agreement = await service.createAgreement({
        customerId: 'cust-1',
        name: 'Renewable Agreement',
        type: 'full_service',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      const renewed = await service.renewAgreement(
        agreement.id,
        '2026-01-01',
        '2026-12-31',
        '2026-11-01',
      );

      expect(renewed.startDate).toBe('2026-01-01');
      expect(renewed.endDate).toBe('2026-12-31');
      expect(renewed.renewalDate).toBe('2026-11-01');
      expect(renewed.status).toBe('active');
    });

    it('cancels an agreement', async () => {
      const agreement = await service.createAgreement({
        customerId: 'cust-1',
        name: 'Cancel Me',
        type: 'on_call',
        startDate: '2026-01-01',
        status: 'active',
      });

      const cancelled = await service.cancelAgreement(agreement.id);
      expect(cancelled.status).toBe('cancelled');
    });

    it('lists agreements by customer', async () => {
      await service.createAgreement({
        customerId: 'cust-1',
        name: 'Agreement A',
        type: 'full_service',
        startDate: '2026-01-01',
      });
      await service.createAgreement({
        customerId: 'cust-2',
        name: 'Agreement B',
        type: 'preventive',
        startDate: '2026-01-01',
      });

      const cust1Agreements = await service.getAgreementsByCustomer('cust-1');
      expect(cust1Agreements).toHaveLength(1);
      expect(cust1Agreements[0].name).toBe('Agreement A');
    });

    it('gets expiring agreements', async () => {
      await service.createAgreement({
        customerId: 'cust-1',
        name: 'Expiring Soon',
        type: 'full_service',
        startDate: '2025-01-01',
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
      });

      const expiring = await service.getExpiringAgreements(30);
      expect(Array.isArray(expiring)).toBe(true);
      expect(expiring.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Work Order CRUD
  // ==========================================================================

  describe('Work Order CRUD', () => {
    it('creates a work order with defaults', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-001',
        type: 'scheduled',
      });

      expect(wo.number).toBe('WO-001');
      expect(wo.status).toBe('open');
      expect(wo.priority).toBe('medium');
      expect(wo.pricingType).toBe('tm');
      expect(wo.billingStatus).toBe('unbilled');
      expect(wo.laborTotal).toBe(0);
      expect(wo.materialTotal).toBe(0);
      expect(wo.totalAmount).toBe(0);
    });

    it('updates a work order', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-002',
        type: 'on_demand',
      });

      const updated = await service.updateWorkOrder(wo.id, {
        description: 'HVAC repair',
        priority: 'high',
      });

      expect(updated.description).toBe('HVAC repair');
      expect(updated.priority).toBe('high');
    });

    it('assigns a work order', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-003',
        type: 'scheduled',
      });

      const assigned = await service.assignWorkOrder(wo.id, 'tech-1');
      expect(assigned.assignedTo).toBe('tech-1');
      expect(assigned.status).toBe('assigned');
    });

    it('completes a work order', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-004',
        type: 'on_demand',
      });

      const completed = await service.completeWorkOrder(wo.id, 'Fixed the compressor');
      expect(completed.status).toBe('completed');
      expect(completed.resolution).toBe('Fixed the compressor');
      expect(completed.completedDate).toBeTruthy();
    });

    it('cancels a work order', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-005',
        type: 'scheduled',
      });

      const cancelled = await service.cancelWorkOrder(wo.id);
      expect(cancelled.status).toBe('cancelled');
    });

    it('lists work orders by customer', async () => {
      await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-010',
        type: 'scheduled',
      });
      await service.createWorkOrder({
        customerId: 'cust-2',
        number: 'WO-011',
        type: 'on_demand',
      });

      const cust1WOs = await service.getWorkOrdersByCustomer('cust-1');
      expect(cust1WOs).toHaveLength(1);
      expect(cust1WOs[0].number).toBe('WO-010');
    });

    it('lists work orders by technician', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-012',
        type: 'scheduled',
      });
      await service.assignWorkOrder(wo.id, 'tech-1');

      const techWOs = await service.getWorkOrdersByTechnician('tech-1');
      expect(techWOs).toHaveLength(1);
    });

    it('lists work orders by status', async () => {
      await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-013',
        type: 'scheduled',
      });

      const openWOs = await service.getWorkOrdersByStatus('open');
      expect(openWOs).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Work Order Dispatch
  // ==========================================================================

  describe('Work Order Dispatch', () => {
    it('dispatches a work order to a technician', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-020',
        type: 'emergency',
      });

      const dispatched = await service.dispatch(wo.id, 'tech-2');
      expect(dispatched.assignedTo).toBe('tech-2');
      expect(dispatched.status).toBe('assigned');
    });

    it('reschedules a work order', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-021',
        type: 'scheduled',
        scheduledDate: '2026-03-01',
      });

      const rescheduled = await service.reschedule(wo.id, '2026-03-15', '2:00 PM - 4:00 PM');
      expect(rescheduled.scheduledDate).toBe('2026-03-15');
      expect(rescheduled.scheduledTimeSlot).toBe('2:00 PM - 4:00 PM');
    });
  });

  // ==========================================================================
  // Work Order Lines and Total Calculation
  // ==========================================================================

  describe('Work Order Lines', () => {
    let woId: string;

    beforeEach(async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-030',
        type: 'on_demand',
      });
      woId = wo.id;
    });

    it('adds a labor line and recalculates total', async () => {
      await service.addWorkOrderLine({
        workOrderId: woId,
        type: 'labor',
        description: 'Repair work',
        quantity: 2,
        unitPrice: 75,
      });

      const wo = await service.getWorkOrder(woId);
      expect(wo!.laborTotal).toBe(150);
      expect(wo!.materialTotal).toBe(0);
      expect(wo!.totalAmount).toBe(150);
    });

    it('adds material and labor lines, recalculates total', async () => {
      await service.addWorkOrderLine({
        workOrderId: woId,
        type: 'labor',
        description: 'Installation',
        quantity: 3,
        unitPrice: 80,
      });

      await service.addWorkOrderLine({
        workOrderId: woId,
        type: 'material',
        description: 'Replacement filter',
        quantity: 2,
        unitPrice: 45.50,
        partNumber: 'FIL-100',
      });

      const wo = await service.getWorkOrder(woId);
      expect(wo!.laborTotal).toBe(240);
      expect(wo!.materialTotal).toBe(91);
      expect(wo!.totalAmount).toBe(331);
    });

    it('removes a line and recalculates total', async () => {
      const line1 = await service.addWorkOrderLine({
        workOrderId: woId,
        type: 'labor',
        description: 'Work A',
        quantity: 1,
        unitPrice: 100,
      });

      await service.addWorkOrderLine({
        workOrderId: woId,
        type: 'labor',
        description: 'Work B',
        quantity: 1,
        unitPrice: 50,
      });

      await service.removeWorkOrderLine(line1.id);

      const wo = await service.getWorkOrder(woId);
      expect(wo!.laborTotal).toBe(50);
      expect(wo!.totalAmount).toBe(50);
    });

    it('gets lines for a work order', async () => {
      await service.addWorkOrderLine({
        workOrderId: woId,
        type: 'labor',
        description: 'Task 1',
        quantity: 1,
        unitPrice: 100,
      });
      await service.addWorkOrderLine({
        workOrderId: woId,
        type: 'material',
        description: 'Part 1',
        quantity: 3,
        unitPrice: 25,
      });

      const lines = await service.getWorkOrderLines(woId);
      expect(lines).toHaveLength(2);
    });

    it('calculates total via calculateWorkOrderTotal', async () => {
      await service.addWorkOrderLine({
        workOrderId: woId,
        type: 'labor',
        description: 'Labor',
        quantity: 4,
        unitPrice: 50,
      });
      await service.addWorkOrderLine({
        workOrderId: woId,
        type: 'material',
        description: 'Parts',
        quantity: 10,
        unitPrice: 12.5,
      });

      const totals = await service.calculateWorkOrderTotal(woId);
      expect(totals.laborTotal).toBe(200);
      expect(totals.materialTotal).toBe(125);
      expect(totals.totalAmount).toBe(325);
    });
  });

  // ==========================================================================
  // Service Calls
  // ==========================================================================

  describe('Service Calls', () => {
    it('creates a service call with defaults', async () => {
      const call = await service.createCall({
        customerId: 'cust-1',
        callDate: '2026-02-10',
        callType: 'request',
        description: 'AC not working',
        callerName: 'John Smith',
        callerPhone: '555-0100',
      });

      expect(call.customerId).toBe('cust-1');
      expect(call.callType).toBe('request');
      expect(call.status).toBe('new');
      expect(call.priority).toBe('medium');
    });

    it('dispatches a service call', async () => {
      const call = await service.createCall({
        customerId: 'cust-1',
        callDate: '2026-02-10',
        callType: 'emergency',
      });

      const dispatched = await service.dispatchCall(call.id, 'tech-1');
      expect(dispatched.status).toBe('dispatched');
      expect(dispatched.assignedTo).toBe('tech-1');
      expect(dispatched.dispatchedAt).toBeTruthy();
    });

    it('resolves a service call', async () => {
      const call = await service.createCall({
        customerId: 'cust-1',
        callDate: '2026-02-10',
        callType: 'complaint',
      });

      const resolved = await service.resolveCall(call.id);
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolvedAt).toBeTruthy();
    });

    it('lists calls by customer', async () => {
      await service.createCall({
        customerId: 'cust-1',
        callDate: '2026-02-10',
        callType: 'request',
      });
      await service.createCall({
        customerId: 'cust-2',
        callDate: '2026-02-11',
        callType: 'inquiry',
      });

      const calls = await service.getCallsByCustomer('cust-1');
      expect(calls).toHaveLength(1);
    });

    it('filters calls by status', async () => {
      await service.createCall({
        customerId: 'cust-1',
        callDate: '2026-02-10',
        callType: 'request',
      });

      const newCalls = await service.listCalls({ status: 'new' });
      expect(newCalls).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Customer Equipment
  // ==========================================================================

  describe('Customer Equipment', () => {
    it('registers equipment with defaults', async () => {
      const eq = await service.registerEquipment({
        customerId: 'cust-1',
        name: 'Rooftop AC Unit',
        manufacturer: 'Carrier',
        model: 'RTU-500',
        serialNumber: 'SN-12345',
      });

      expect(eq.name).toBe('Rooftop AC Unit');
      expect(eq.status).toBe('active');
      expect(eq.manufacturer).toBe('Carrier');
    });

    it('updates equipment', async () => {
      const eq = await service.registerEquipment({
        customerId: 'cust-1',
        name: 'AC Unit',
      });

      const updated = await service.updateEquipment(eq.id, {
        location: 'Building A, Roof',
        warrantyEndDate: '2028-12-31',
      });

      expect(updated.location).toBe('Building A, Roof');
      expect(updated.warrantyEndDate).toBe('2028-12-31');
    });

    it('retires equipment', async () => {
      const eq = await service.registerEquipment({
        customerId: 'cust-1',
        name: 'Old Heater',
      });

      const retired = await service.retireEquipment(eq.id);
      expect(retired.status).toBe('retired');
    });

    it('lists equipment by customer', async () => {
      await service.registerEquipment({
        customerId: 'cust-1',
        name: 'Unit A',
      });
      await service.registerEquipment({
        customerId: 'cust-1',
        name: 'Unit B',
      });
      await service.registerEquipment({
        customerId: 'cust-2',
        name: 'Unit C',
      });

      const cust1Equipment = await service.listEquipmentByCustomer('cust-1');
      expect(cust1Equipment).toHaveLength(2);
    });

    it('gets equipment service history', async () => {
      const eq = await service.registerEquipment({
        customerId: 'cust-1',
        name: 'AC Unit',
      });

      await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-EQ-1',
        type: 'scheduled',
        customerEquipmentId: eq.id,
      });

      const history = await service.getEquipmentServiceHistory(eq.id);
      expect(history).toHaveLength(1);
      expect(history[0].number).toBe('WO-EQ-1');
    });
  });

  // ==========================================================================
  // PM Scheduling
  // ==========================================================================

  describe('PM Scheduling', () => {
    let equipmentId: string;

    beforeEach(async () => {
      const eq = await service.registerEquipment({
        customerId: 'cust-1',
        name: 'HVAC Unit',
      });
      equipmentId = eq.id;
    });

    it('creates a PM schedule', async () => {
      const pm = await service.createPMSchedule({
        customerEquipmentId: equipmentId,
        name: 'Quarterly Filter Change',
        frequency: 'quarterly',
        nextDue: '2026-04-01',
      });

      expect(pm.name).toBe('Quarterly Filter Change');
      expect(pm.frequency).toBe('quarterly');
      expect(pm.status).toBe('active');
    });

    it('gets upcoming PM tasks', async () => {
      const nextDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await service.createPMSchedule({
        customerEquipmentId: equipmentId,
        name: 'Due Soon',
        frequency: 'monthly',
        nextDue,
      });

      const upcoming = await service.getUpcomingPM(30);
      expect(upcoming.length).toBeGreaterThanOrEqual(1);
    });

    it('marks PM completed and calculates next due', async () => {
      const pm = await service.createPMSchedule({
        customerEquipmentId: equipmentId,
        name: 'Monthly Check',
        frequency: 'monthly',
        nextDue: '2026-02-15',
      });

      const completed = await service.markPMCompleted(pm.id);
      expect(completed.lastPerformed).toBeTruthy();
      expect(completed.nextDue).toBeTruthy();
      // Next due should be about 1 month from today
      const nextDate = new Date(completed.nextDue!);
      const today = new Date();
      const daysDiff = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(27);
      expect(daysDiff).toBeLessThanOrEqual(32);
    });

    it('generates a work order from PM', async () => {
      const pm = await service.createPMSchedule({
        customerEquipmentId: equipmentId,
        name: 'Annual Inspection',
        frequency: 'annual',
        nextDue: '2026-03-01',
        assignedTo: 'tech-1',
      });

      const wo = await service.generateWorkOrderFromPM(pm.id, 'WO-PM-001');
      expect(wo.number).toBe('WO-PM-001');
      expect(wo.type).toBe('scheduled');
      expect(wo.customerEquipmentId).toBe(equipmentId);
      expect(wo.assignedTo).toBe('tech-1');
      expect(wo.description).toContain('Annual Inspection');
    });
  });

  // ==========================================================================
  // Technician Time Logging
  // ==========================================================================

  describe('Technician Time', () => {
    let woId: string;

    beforeEach(async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-TIME-1',
        type: 'on_demand',
      });
      woId = wo.id;
    });

    it('logs time with auto-calculated amount', async () => {
      const entry = await service.logTime({
        workOrderId: woId,
        technicianId: 'tech-1',
        date: '2026-02-10',
        hours: 3,
        hourlyRate: 75,
        startTime: '09:00',
        endTime: '12:00',
      });

      expect(entry.hours).toBe(3);
      expect(entry.hourlyRate).toBe(75);
      expect(entry.amount).toBe(225);
    });

    it('gets time entries by work order', async () => {
      await service.logTime({
        workOrderId: woId,
        technicianId: 'tech-1',
        date: '2026-02-10',
        hours: 2,
        hourlyRate: 75,
      });
      await service.logTime({
        workOrderId: woId,
        technicianId: 'tech-2',
        date: '2026-02-10',
        hours: 4,
        hourlyRate: 60,
      });

      const entries = await service.getTimeByWorkOrder(woId);
      expect(entries).toHaveLength(2);
    });

    it('gets time entries by technician with date range', async () => {
      await service.logTime({
        workOrderId: woId,
        technicianId: 'tech-1',
        date: '2026-02-05',
        hours: 2,
      });
      await service.logTime({
        workOrderId: woId,
        technicianId: 'tech-1',
        date: '2026-02-15',
        hours: 3,
      });

      const filtered = await service.getTimeByTechnician('tech-1', {
        start: '2026-02-01',
        end: '2026-02-10',
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].date).toBe('2026-02-05');
    });
  });

  // ==========================================================================
  // Billing
  // ==========================================================================

  describe('Billing', () => {
    it('marks a completed work order for billing', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-BILL-1',
        type: 'on_demand',
      });
      await service.completeWorkOrder(wo.id);

      const billed = await service.markForBilling(wo.id);
      expect(billed.billingStatus).toBe('billed');
      expect(billed.status).toBe('invoiced');
    });

    it('rejects billing for non-completed work orders', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-BILL-2',
        type: 'on_demand',
      });

      await expect(service.markForBilling(wo.id)).rejects.toThrow('must be completed');
    });

    it('gets billable work orders', async () => {
      const wo1 = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-BILL-3',
        type: 'on_demand',
      });
      await service.addWorkOrderLine({
        workOrderId: wo1.id,
        type: 'labor',
        quantity: 2,
        unitPrice: 100,
      });
      await service.completeWorkOrder(wo1.id);

      const wo2 = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-BILL-4',
        type: 'scheduled',
      });
      await service.addWorkOrderLine({
        workOrderId: wo2.id,
        type: 'labor',
        quantity: 1,
        unitPrice: 50,
      });
      await service.completeWorkOrder(wo2.id);

      const billable = await service.getBillableWorkOrders();
      expect(billable).toHaveLength(2);
    });

    it('calculates unbilled total', async () => {
      const wo1 = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-BILL-5',
        type: 'on_demand',
      });
      await service.addWorkOrderLine({
        workOrderId: wo1.id,
        type: 'labor',
        quantity: 2,
        unitPrice: 100,
      });
      await service.completeWorkOrder(wo1.id);

      const wo2 = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-BILL-6',
        type: 'scheduled',
      });
      await service.addWorkOrderLine({
        workOrderId: wo2.id,
        type: 'material',
        quantity: 5,
        unitPrice: 30,
      });
      await service.completeWorkOrder(wo2.id);

      const total = await service.getUnbilledTotal();
      expect(total).toBe(350);
    });
  });

  // ==========================================================================
  // Profitability
  // ==========================================================================

  describe('Profitability', () => {
    it('calculates overall profitability', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-PROF-1',
        type: 'on_demand',
      });

      await service.addWorkOrderLine({
        workOrderId: wo.id,
        type: 'labor',
        quantity: 5,
        unitPrice: 80,
      });
      await service.addWorkOrderLine({
        workOrderId: wo.id,
        type: 'material',
        quantity: 10,
        unitPrice: 25,
      });

      const profitability = await service.getServiceProfitability();
      expect(profitability.revenue).toBe(650);
      expect(profitability.laborCost).toBe(400);
      expect(profitability.materialCost).toBe(250);
      expect(profitability.profit).toBe(0);
      expect(profitability.margin).toBe(0);
    });

    it('calculates profitability per agreement including recurring revenue', async () => {
      const agreement = await service.createAgreement({
        customerId: 'cust-1',
        name: 'Service Plan',
        type: 'full_service',
        startDate: '2026-01-01',
        recurringAmount: 1000,
      });

      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-PROF-2',
        type: 'scheduled',
        agreementId: agreement.id,
      });

      await service.addWorkOrderLine({
        workOrderId: wo.id,
        type: 'labor',
        quantity: 2,
        unitPrice: 50,
      });
      await service.addWorkOrderLine({
        workOrderId: wo.id,
        type: 'material',
        quantity: 1,
        unitPrice: 30,
      });

      const profitability = await service.getServiceProfitability(agreement.id);
      // Revenue = WO totalAmount (130) + recurring (1000) = 1130
      expect(profitability.revenue).toBe(1130);
      expect(profitability.laborCost).toBe(100);
      expect(profitability.materialCost).toBe(30);
      expect(profitability.profit).toBe(1000);
      expect(profitability.agreementName).toBe('Service Plan');
    });
  });

  // ==========================================================================
  // Customer Service History
  // ==========================================================================

  describe('Customer Service History', () => {
    it('returns combined history of WOs, calls, and equipment', async () => {
      await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-HIST-1',
        type: 'scheduled',
        scheduledDate: '2026-02-01',
      });

      await service.createCall({
        customerId: 'cust-1',
        callDate: '2026-02-05',
        callType: 'request',
        description: 'Broken heater',
      });

      await service.registerEquipment({
        customerId: 'cust-1',
        name: 'Furnace',
        installDate: '2025-01-15',
      });

      const history = await service.getCustomerServiceHistory('cust-1');
      expect(history).toHaveLength(3);

      const types = history.map((h) => h.type);
      expect(types).toContain('workOrder');
      expect(types).toContain('call');
      expect(types).toContain('equipment');
    });

    it('sorts history by date descending', async () => {
      await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-HIST-2',
        type: 'scheduled',
        scheduledDate: '2026-01-01',
      });

      await service.createCall({
        customerId: 'cust-1',
        callDate: '2026-03-01',
        callType: 'request',
      });

      const history = await service.getCustomerServiceHistory('cust-1');
      expect(history.length).toBe(2);
      // Most recent first
      expect(history[0].date >= history[1].date).toBe(true);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits service.agreement.created', async () => {
      let emitted = false;
      events.on('service.agreement.created', () => { emitted = true; });
      await service.createAgreement({
        customerId: 'cust-1',
        name: 'Test',
        type: 'full_service',
        startDate: '2026-01-01',
      });
      expect(emitted).toBe(true);
    });

    it('emits service.agreement.renewed', async () => {
      const agreement = await service.createAgreement({
        customerId: 'cust-1',
        name: 'Renew Test',
        type: 'full_service',
        startDate: '2025-01-01',
      });

      let emitted = false;
      events.on('service.agreement.renewed', () => { emitted = true; });
      await service.renewAgreement(agreement.id, '2026-01-01', '2026-12-31');
      expect(emitted).toBe(true);
    });

    it('emits service.wo.created', async () => {
      let emitted = false;
      events.on('service.wo.created', () => { emitted = true; });
      await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-EVT-1',
        type: 'scheduled',
      });
      expect(emitted).toBe(true);
    });

    it('emits service.wo.assigned', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-EVT-2',
        type: 'scheduled',
      });

      let emitted = false;
      events.on('service.wo.assigned', () => { emitted = true; });
      await service.assignWorkOrder(wo.id, 'tech-1');
      expect(emitted).toBe(true);
    });

    it('emits service.wo.completed', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-EVT-3',
        type: 'on_demand',
      });

      let emitted = false;
      events.on('service.wo.completed', () => { emitted = true; });
      await service.completeWorkOrder(wo.id);
      expect(emitted).toBe(true);
    });

    it('emits service.wo.invoiced', async () => {
      const wo = await service.createWorkOrder({
        customerId: 'cust-1',
        number: 'WO-EVT-4',
        type: 'on_demand',
      });
      await service.completeWorkOrder(wo.id);

      let emitted = false;
      events.on('service.wo.invoiced', () => { emitted = true; });
      await service.markForBilling(wo.id);
      expect(emitted).toBe(true);
    });

    it('emits service.call.created', async () => {
      let emitted = false;
      events.on('service.call.created', () => { emitted = true; });
      await service.createCall({
        customerId: 'cust-1',
        callDate: '2026-02-10',
        callType: 'request',
      });
      expect(emitted).toBe(true);
    });

    it('emits service.call.dispatched', async () => {
      const call = await service.createCall({
        customerId: 'cust-1',
        callDate: '2026-02-10',
        callType: 'emergency',
      });

      let emitted = false;
      events.on('service.call.dispatched', () => { emitted = true; });
      await service.dispatchCall(call.id, 'tech-1');
      expect(emitted).toBe(true);
    });

    it('emits service.pm.completed', async () => {
      const eq = await service.registerEquipment({
        customerId: 'cust-1',
        name: 'Unit X',
      });
      const pm = await service.createPMSchedule({
        customerEquipmentId: eq.id,
        name: 'Check',
        frequency: 'monthly',
      });

      let emitted = false;
      events.on('service.pm.completed', () => { emitted = true; });
      await service.markPMCompleted(pm.id);
      expect(emitted).toBe(true);
    });

    it('emits service.equipment.registered', async () => {
      let emitted = false;
      events.on('service.equipment.registered', () => { emitted = true; });
      await service.registerEquipment({
        customerId: 'cust-1',
        name: 'New Unit',
      });
      expect(emitted).toBe(true);
    });
  });
});
