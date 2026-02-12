/**
 * AR Service Tests
 * Tests for the Accounts Receivable business logic layer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ARService } from '../../src/modules/ar/ar-service';
import type {
  Customer, ARInvoice, ARInvoiceLine, ARPayment, ARPaymentApplication,
  AIAApplication, Retainage, BillingSchedule, BillingMilestone,
} from '../../src/modules/ar/ar-service';
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

  const customers = new Collection<Customer>('ar/customer', adapter, schemas, events);
  const invoices = new Collection<ARInvoice>('ar/invoice', adapter, schemas, events);
  const invoiceLines = new Collection<ARInvoiceLine>('ar/invoiceLine', adapter, schemas, events);
  const payments = new Collection<ARPayment>('ar/payment', adapter, schemas, events);
  const paymentApplications = new Collection<ARPaymentApplication>('ar/paymentApplication', adapter, schemas, events);
  const aiaApplications = new Collection<AIAApplication>('ar/aiaApplication', adapter, schemas, events);
  const retainages = new Collection<Retainage>('ar/retainage', adapter, schemas, events);
  const billingSchedules = new Collection<BillingSchedule>('ar/billingSchedule', adapter, schemas, events);
  const billingMilestones = new Collection<BillingMilestone>('ar/billingMilestone', adapter, schemas, events);

  const service = new ARService(
    customers, invoices, invoiceLines, payments, paymentApplications,
    aiaApplications, retainages, billingSchedules, billingMilestones, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ARService', () => {
  let service: ARService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Customer CRUD
  // ==========================================================================

  describe('Customer CRUD', () => {
    it('creates a customer with defaults', async () => {
      const customer = await service.createCustomer({
        name: 'Acme Construction LLC',
        contactEmail: 'billing@acme.com',
      });

      expect(customer.name).toBe('Acme Construction LLC');
      expect(customer.contactEmail).toBe('billing@acme.com');
      expect(customer.status).toBe('active');
      expect(customer.ytdBillings).toBe(0);
      expect(customer.ytdPayments).toBe(0);
    });

    it('rejects duplicate customer names', async () => {
      await service.createCustomer({ name: 'Acme Construction LLC' });
      await expect(
        service.createCustomer({ name: 'Acme Construction LLC' }),
      ).rejects.toThrow('already exists');
    });

    it('updates a customer', async () => {
      const customer = await service.createCustomer({ name: 'Acme Construction LLC' });
      const updated = await service.updateCustomer(customer.id, {
        contactPhone: '555-0100',
        creditLimit: 500000,
      });
      expect(updated.contactPhone).toBe('555-0100');
      expect(updated.creditLimit).toBe(500000);
    });

    it('prevents updating to a duplicate name', async () => {
      await service.createCustomer({ name: 'Acme Construction LLC' });
      const other = await service.createCustomer({ name: 'Beta Builders' });
      await expect(
        service.updateCustomer(other.id, { name: 'Acme Construction LLC' }),
      ).rejects.toThrow('already exists');
    });

    it('filters customers by status', async () => {
      await service.createCustomer({ name: 'Active Customer' });
      const c2 = await service.createCustomer({ name: 'Inactive Customer' });
      await service.updateCustomer(c2.id, { status: 'inactive' });

      const active = await service.getCustomers({ status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Active Customer');
    });

    it('deletes a customer without invoices', async () => {
      const customer = await service.createCustomer({ name: 'Temp Customer' });
      await service.deleteCustomer(customer.id);
      const result = await service.getCustomer(customer.id);
      expect(result).toBeNull();
    });

    it('refuses to delete a customer with invoices', async () => {
      const customer = await service.createCustomer({ name: 'Acme Construction LLC' });
      await service.createInvoice({
        customerId: customer.id,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 10000,
      });
      await expect(service.deleteCustomer(customer.id)).rejects.toThrow('Cannot delete');
    });
  });

  // ==========================================================================
  // Invoice CRUD
  // ==========================================================================

  describe('Invoice CRUD', () => {
    let customerId: string;

    beforeEach(async () => {
      const customer = await service.createCustomer({ name: 'Acme Construction LLC' });
      customerId = customer.id;
    });

    it('creates an invoice with defaults', async () => {
      const invoice = await service.createInvoice({
        customerId,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 75000,
      });

      expect(invoice.customerId).toBe(customerId);
      expect(invoice.invoiceNumber).toBe('INV-001');
      expect(invoice.amount).toBe(75000);
      expect(invoice.status).toBe('draft');
      expect(invoice.paidAmount).toBe(0);
      expect(invoice.balanceDue).toBe(75000);
    });

    it('calculates netAmount with retainage and tax', async () => {
      const invoice = await service.createInvoice({
        customerId,
        invoiceNumber: 'INV-002',
        invoiceDate: '2026-02-01',
        amount: 100000,
        retainageAmount: 10000,
        taxAmount: 5000,
      });

      expect(invoice.netAmount).toBe(85000); // 100000 - 10000 - 5000
      expect(invoice.balanceDue).toBe(100000); // balanceDue uses full amount
    });

    it('rejects invoice for non-existent customer', async () => {
      await expect(
        service.createInvoice({
          customerId: 'nonexistent',
          invoiceNumber: 'INV-001',
          invoiceDate: '2026-02-01',
          amount: 1000,
        }),
      ).rejects.toThrow('Customer not found');
    });

    it('gets invoices with filters', async () => {
      await service.createInvoice({
        customerId,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 50000,
        billingType: 'progress',
      });
      await service.createInvoice({
        customerId,
        invoiceNumber: 'INV-002',
        invoiceDate: '2026-02-15',
        amount: 30000,
        billingType: 'tm',
      });

      const progressInvoices = await service.getInvoices({ billingType: 'progress' });
      expect(progressInvoices).toHaveLength(1);
      expect(progressInvoices[0].invoiceNumber).toBe('INV-001');
    });
  });

  // ==========================================================================
  // Invoice Line Management
  // ==========================================================================

  describe('Invoice Line Management', () => {
    let customerId: string;

    beforeEach(async () => {
      const customer = await service.createCustomer({ name: 'Acme Construction LLC' });
      customerId = customer.id;
    });

    it('adds invoice lines and recalculates amount', async () => {
      const invoice = await service.createInvoice({
        customerId,
        invoiceNumber: 'INV-003',
        invoiceDate: '2026-02-01',
        amount: 0,
      });

      await service.addInvoiceLine({
        invoiceId: invoice.id,
        description: 'Foundation work',
        quantity: 1,
        unitPrice: 45000,
        amount: 45000,
      });
      await service.addInvoiceLine({
        invoiceId: invoice.id,
        description: 'Framing labor',
        quantity: 80,
        unitPrice: 75,
        amount: 6000,
        costType: 'labor',
        markupPct: 15,
      });

      const updated = await service.getInvoice(invoice.id);
      expect(updated!.amount).toBe(51000);
    });

    it('retrieves invoice lines', async () => {
      const invoice = await service.createInvoice({
        customerId,
        invoiceNumber: 'INV-004',
        invoiceDate: '2026-02-01',
        amount: 0,
      });

      await service.addInvoiceLine({
        invoiceId: invoice.id,
        description: 'Line 1',
        amount: 10000,
      });
      await service.addInvoiceLine({
        invoiceId: invoice.id,
        description: 'Line 2',
        amount: 20000,
      });

      const lines = await service.getInvoiceLines(invoice.id);
      expect(lines).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Invoice Send / Void
  // ==========================================================================

  describe('Invoice Send / Void', () => {
    let customerId: string;

    beforeEach(async () => {
      const customer = await service.createCustomer({ name: 'Acme Construction LLC' });
      customerId = customer.id;
    });

    it('sends a draft invoice and updates ytdBillings', async () => {
      const invoice = await service.createInvoice({
        customerId,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 50000,
      });

      const sent = await service.sendInvoice(invoice.id);
      expect(sent.status).toBe('sent');

      const customer = await service.getCustomer(customerId);
      expect(customer!.ytdBillings).toBe(50000);
    });

    it('rejects sending a non-draft invoice', async () => {
      const invoice = await service.createInvoice({
        customerId,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 50000,
        status: 'sent',
      });

      await expect(service.sendInvoice(invoice.id)).rejects.toThrow('cannot be sent');
    });

    it('voids an invoice', async () => {
      const invoice = await service.createInvoice({
        customerId,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 50000,
      });

      const voided = await service.voidInvoice(invoice.id);
      expect(voided.status).toBe('voided');
    });
  });

  // ==========================================================================
  // AIA Application Workflow
  // ==========================================================================

  describe('AIA Application Workflow', () => {
    it('creates an AIA application with defaults', async () => {
      const aia = await service.createAIAApplication({
        jobId: 'job-001',
        applicationNumber: 1,
        contractSum: 1000000,
        retainagePct: 10,
      });

      expect(aia.jobId).toBe('job-001');
      expect(aia.applicationNumber).toBe(1);
      expect(aia.contractSum).toBe(1000000);
      expect(aia.changeOrderTotal).toBe(0);
      expect(aia.completedPreviousPeriod).toBe(0);
      expect(aia.completedThisPeriod).toBe(0);
      expect(aia.materialStored).toBe(0);
      expect(aia.totalCompleted).toBe(0);
      expect(aia.retainagePct).toBe(10);
      expect(aia.retainageAmount).toBe(0);
      expect(aia.status).toBe('draft');
    });

    it('updates AIA progress and recalculates totals', async () => {
      const aia = await service.createAIAApplication({
        jobId: 'job-001',
        applicationNumber: 1,
        contractSum: 1000000,
        retainagePct: 10,
      });

      const updated = await service.updateAIAProgress(aia.id, {
        completedPreviousPeriod: 200000,
        completedThisPeriod: 150000,
        materialStored: 50000,
      });

      expect(updated.completedPreviousPeriod).toBe(200000);
      expect(updated.completedThisPeriod).toBe(150000);
      expect(updated.materialStored).toBe(50000);
      expect(updated.totalCompleted).toBe(400000); // 200000 + 150000 + 50000
      expect(updated.retainageAmount).toBe(40000); // 400000 * 10%
    });

    it('submits a draft AIA application', async () => {
      const aia = await service.createAIAApplication({
        jobId: 'job-001',
        applicationNumber: 1,
        contractSum: 1000000,
      });

      const submitted = await service.submitAIAApplication(aia.id);
      expect(submitted.status).toBe('submitted');
    });

    it('rejects submission of non-draft AIA application', async () => {
      const aia = await service.createAIAApplication({
        jobId: 'job-001',
        applicationNumber: 1,
        contractSum: 1000000,
      });

      await service.submitAIAApplication(aia.id);
      await expect(service.submitAIAApplication(aia.id)).rejects.toThrow('cannot be submitted');
    });

    it('approves a submitted AIA application', async () => {
      const aia = await service.createAIAApplication({
        jobId: 'job-001',
        applicationNumber: 1,
        contractSum: 1000000,
      });

      await service.submitAIAApplication(aia.id);
      const approved = await service.approveAIAApplication(aia.id);
      expect(approved.status).toBe('approved');
    });

    it('rejects approval of non-submitted AIA application', async () => {
      const aia = await service.createAIAApplication({
        jobId: 'job-001',
        applicationNumber: 1,
        contractSum: 1000000,
      });

      await expect(service.approveAIAApplication(aia.id)).rejects.toThrow('cannot be approved');
    });
  });

  // ==========================================================================
  // Payment Processing
  // ==========================================================================

  describe('Payment Processing', () => {
    let customerId: string;
    let invoiceId: string;

    beforeEach(async () => {
      const customer = await service.createCustomer({ name: 'Acme Construction LLC' });
      customerId = customer.id;

      const invoice = await service.createInvoice({
        customerId,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 50000,
        status: 'sent',
      });
      invoiceId = invoice.id;
    });

    it('creates a payment and applies to invoice (full payment)', async () => {
      const payment = await service.createPayment(
        customerId, '2026-02-15', 50000, 'check', 'CHK-1001',
      );

      await service.applyPayment(payment.id, [
        { invoiceId, amount: 50000 },
      ]);

      const inv = await service.getInvoice(invoiceId);
      expect(inv!.paidAmount).toBe(50000);
      expect(inv!.balanceDue).toBe(0);
      expect(inv!.status).toBe('paid');

      const customer = await service.getCustomer(customerId);
      expect(customer!.ytdPayments).toBe(50000);
    });

    it('handles partial payments', async () => {
      const payment = await service.createPayment(
        customerId, '2026-02-15', 20000, 'ach',
      );

      await service.applyPayment(payment.id, [
        { invoiceId, amount: 20000 },
      ]);

      const inv = await service.getInvoice(invoiceId);
      expect(inv!.paidAmount).toBe(20000);
      expect(inv!.balanceDue).toBe(30000);
      expect(inv!.status).toBe('partial');
    });

    it('applies a payment to multiple invoices', async () => {
      const inv2 = await service.createInvoice({
        customerId,
        invoiceNumber: 'INV-002',
        invoiceDate: '2026-02-05',
        amount: 30000,
        status: 'sent',
      });

      const payment = await service.createPayment(
        customerId, '2026-02-20', 80000, 'wire',
      );

      await service.applyPayment(payment.id, [
        { invoiceId, amount: 50000 },
        { invoiceId: inv2.id, amount: 30000 },
      ]);

      const updatedInv1 = await service.getInvoice(invoiceId);
      expect(updatedInv1!.status).toBe('paid');

      const updatedInv2 = await service.getInvoice(inv2.id);
      expect(updatedInv2!.status).toBe('paid');

      const customer = await service.getCustomer(customerId);
      expect(customer!.ytdPayments).toBe(80000);
    });

    it('sets payment status to applied after applying', async () => {
      const payment = await service.createPayment(
        customerId, '2026-02-15', 50000, 'check',
      );
      expect(payment.status).toBe('pending');

      await service.applyPayment(payment.id, [
        { invoiceId, amount: 50000 },
      ]);

      const updated = await service.getPayment(payment.id);
      expect(updated!.status).toBe('applied');
    });
  });

  // ==========================================================================
  // Retainage Create / Release
  // ==========================================================================

  describe('Retainage Tracking', () => {
    let customerId: string;
    let invoiceId: string;

    beforeEach(async () => {
      const customer = await service.createCustomer({ name: 'Acme Construction LLC' });
      customerId = customer.id;
      const invoice = await service.createInvoice({
        customerId,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 100000,
        retainageAmount: 10000,
      });
      invoiceId = invoice.id;
    });

    it('creates a retainage record', async () => {
      const retainage = await service.createRetainage(
        invoiceId, customerId, 'job-001', 10000, 10,
      );

      expect(retainage.amount).toBe(10000);
      expect(retainage.releasedAmount).toBe(0);
      expect(retainage.remainingAmount).toBe(10000);
      expect(retainage.status).toBe('held');
    });

    it('releases retainage partially', async () => {
      const retainage = await service.createRetainage(
        invoiceId, customerId, undefined, 10000, 10,
      );

      const partial = await service.releaseRetainage(retainage.id, 5000);
      expect(partial.releasedAmount).toBe(5000);
      expect(partial.remainingAmount).toBe(5000);
      expect(partial.status).toBe('partial');
    });

    it('releases retainage fully', async () => {
      const retainage = await service.createRetainage(
        invoiceId, customerId, undefined, 10000,
      );

      const released = await service.releaseRetainage(retainage.id, 10000);
      expect(released.releasedAmount).toBe(10000);
      expect(released.remainingAmount).toBe(0);
      expect(released.status).toBe('released');
    });

    it('rejects over-release of retainage', async () => {
      const retainage = await service.createRetainage(
        invoiceId, customerId, undefined, 10000,
      );

      await expect(
        service.releaseRetainage(retainage.id, 15000),
      ).rejects.toThrow('exceeds remaining retainage');
    });
  });

  // ==========================================================================
  // Billing Schedule & Milestone
  // ==========================================================================

  describe('Billing Schedule & Milestone', () => {
    let customerId: string;

    beforeEach(async () => {
      const customer = await service.createCustomer({ name: 'Acme Construction LLC' });
      customerId = customer.id;
    });

    it('creates a billing schedule', async () => {
      const schedule = await service.createBillingSchedule({
        jobId: 'job-001',
        customerId,
        name: 'Monthly Progress Billing',
        frequency: 'monthly',
        billingType: 'progress',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });

      expect(schedule.name).toBe('Monthly Progress Billing');
      expect(schedule.frequency).toBe('monthly');
    });

    it('creates a billing milestone', async () => {
      const schedule = await service.createBillingSchedule({
        jobId: 'job-001',
        customerId,
        name: 'Milestone Schedule',
        frequency: 'milestone',
      });

      const milestone = await service.createBillingMilestone({
        scheduleId: schedule.id,
        description: 'Foundation Complete',
        amount: 250000,
        percentOfContract: 25,
        dueDate: '2026-03-15',
      });

      expect(milestone.description).toBe('Foundation Complete');
      expect(milestone.amount).toBe(250000);
      expect(milestone.status).toBe('pending');
    });

    it('updates a billing milestone status', async () => {
      const schedule = await service.createBillingSchedule({
        jobId: 'job-001',
        customerId,
        name: 'Milestone Schedule',
      });

      const milestone = await service.createBillingMilestone({
        scheduleId: schedule.id,
        description: 'Foundation Complete',
        amount: 250000,
      });

      const updated = await service.updateBillingMilestone(milestone.id, {
        status: 'reached',
      });
      expect(updated.status).toBe('reached');
    });

    it('retrieves milestones for a schedule', async () => {
      const schedule = await service.createBillingSchedule({
        jobId: 'job-001',
        customerId,
        name: 'Test Schedule',
      });

      await service.createBillingMilestone({
        scheduleId: schedule.id,
        description: 'Milestone A',
        amount: 100000,
      });
      await service.createBillingMilestone({
        scheduleId: schedule.id,
        description: 'Milestone B',
        amount: 200000,
      });

      const milestones = await service.getBillingMilestones(schedule.id);
      expect(milestones).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Customer Aging Report
  // ==========================================================================

  describe('Customer Aging Report', () => {
    it('computes aging buckets', async () => {
      const customer = await service.createCustomer({ name: 'Acme Construction LLC' });

      // Current invoice (within 30 days)
      await service.createInvoice({
        customerId: customer.id,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        dueDate: '2026-02-10',
        amount: 10000,
        status: 'sent',
      });

      // 60-day old invoice
      await service.createInvoice({
        customerId: customer.id,
        invoiceNumber: 'INV-002',
        invoiceDate: '2025-12-01',
        dueDate: '2025-12-15',
        amount: 20000,
        status: 'sent',
      });

      const aging = await service.getCustomerAging('2026-02-12');
      expect(aging).toHaveLength(1);
      expect(aging[0].customerName).toBe('Acme Construction LLC');
      expect(aging[0].total).toBe(30000);
    });

    it('excludes paid and voided invoices from aging', async () => {
      const customer = await service.createCustomer({ name: 'Acme Construction LLC' });

      await service.createInvoice({
        customerId: customer.id,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 10000,
        status: 'paid',
      });

      await service.createInvoice({
        customerId: customer.id,
        invoiceNumber: 'INV-002',
        invoiceDate: '2026-02-01',
        amount: 5000,
        status: 'voided',
      });

      const aging = await service.getCustomerAging('2026-02-12');
      expect(aging).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Overbilling Analysis
  // ==========================================================================

  describe('Overbilling Analysis', () => {
    it('computes overbilling when billed exceeds earned', async () => {
      const customer = await service.createCustomer({ name: 'Acme Construction LLC' });

      // Create an invoice billed against job-001
      await service.createInvoice({
        customerId: customer.id,
        jobId: 'job-001',
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 500000,
        status: 'sent',
      });

      // Create AIA showing only 30% complete on a $1M contract
      const aia = await service.createAIAApplication({
        jobId: 'job-001',
        applicationNumber: 1,
        contractSum: 1000000,
        retainagePct: 10,
      });
      await service.updateAIAProgress(aia.id, {
        completedThisPeriod: 300000,
      });

      const analysis = await service.getOverbillingAnalysis();
      const job001 = analysis.find((r) => r.jobId === 'job-001');
      expect(job001).toBeDefined();
      expect(job001!.totalBilled).toBe(500000);
      expect(job001!.overbilled).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits ar.customer.created', async () => {
      let emitted = false;
      events.on('ar.customer.created', () => { emitted = true; });
      await service.createCustomer({ name: 'Test Customer' });
      expect(emitted).toBe(true);
    });

    it('emits ar.customer.updated', async () => {
      const customer = await service.createCustomer({ name: 'Test Customer' });
      let emitted = false;
      events.on('ar.customer.updated', () => { emitted = true; });
      await service.updateCustomer(customer.id, { contactPhone: '555-0100' });
      expect(emitted).toBe(true);
    });

    it('emits ar.customer.deleted', async () => {
      const customer = await service.createCustomer({ name: 'Test Customer' });
      let emitted = false;
      events.on('ar.customer.deleted', () => { emitted = true; });
      await service.deleteCustomer(customer.id);
      expect(emitted).toBe(true);
    });

    it('emits ar.invoice.created', async () => {
      const customer = await service.createCustomer({ name: 'Test Customer' });
      let emitted = false;
      events.on('ar.invoice.created', () => { emitted = true; });
      await service.createInvoice({
        customerId: customer.id,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 1000,
      });
      expect(emitted).toBe(true);
    });

    it('emits ar.invoice.sent', async () => {
      const customer = await service.createCustomer({ name: 'Test Customer' });
      const invoice = await service.createInvoice({
        customerId: customer.id,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 1000,
      });

      let emitted = false;
      events.on('ar.invoice.sent', () => { emitted = true; });
      await service.sendInvoice(invoice.id);
      expect(emitted).toBe(true);
    });

    it('emits ar.payment.created', async () => {
      const customer = await service.createCustomer({ name: 'Test Customer' });
      let emitted = false;
      events.on('ar.payment.created', () => { emitted = true; });
      await service.createPayment(customer.id, '2026-02-15', 1000, 'check');
      expect(emitted).toBe(true);
    });

    it('emits ar.payment.applied', async () => {
      const customer = await service.createCustomer({ name: 'Test Customer' });
      const invoice = await service.createInvoice({
        customerId: customer.id,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 1000,
        status: 'sent',
      });

      const payment = await service.createPayment(
        customer.id, '2026-02-15', 1000, 'check',
      );

      let emitted = false;
      events.on('ar.payment.applied', () => { emitted = true; });
      await service.applyPayment(payment.id, [
        { invoiceId: invoice.id, amount: 1000 },
      ]);
      expect(emitted).toBe(true);
    });

    it('emits ar.aia.created', async () => {
      let emitted = false;
      events.on('ar.aia.created', () => { emitted = true; });
      await service.createAIAApplication({
        jobId: 'job-001',
        applicationNumber: 1,
        contractSum: 1000000,
      });
      expect(emitted).toBe(true);
    });

    it('emits ar.aia.submitted', async () => {
      const aia = await service.createAIAApplication({
        jobId: 'job-001',
        applicationNumber: 1,
        contractSum: 1000000,
      });

      let emitted = false;
      events.on('ar.aia.submitted', () => { emitted = true; });
      await service.submitAIAApplication(aia.id);
      expect(emitted).toBe(true);
    });

    it('emits ar.aia.approved', async () => {
      const aia = await service.createAIAApplication({
        jobId: 'job-001',
        applicationNumber: 1,
        contractSum: 1000000,
      });
      await service.submitAIAApplication(aia.id);

      let emitted = false;
      events.on('ar.aia.approved', () => { emitted = true; });
      await service.approveAIAApplication(aia.id);
      expect(emitted).toBe(true);
    });

    it('emits ar.retainage.created', async () => {
      const customer = await service.createCustomer({ name: 'Test Customer' });
      const invoice = await service.createInvoice({
        customerId: customer.id,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 100000,
      });

      let emitted = false;
      events.on('ar.retainage.created', () => { emitted = true; });
      await service.createRetainage(invoice.id, customer.id, undefined, 10000);
      expect(emitted).toBe(true);
    });

    it('emits ar.retainage.released', async () => {
      const customer = await service.createCustomer({ name: 'Test Customer' });
      const invoice = await service.createInvoice({
        customerId: customer.id,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01',
        amount: 100000,
      });
      const retainage = await service.createRetainage(invoice.id, customer.id, undefined, 10000);

      let emitted = false;
      events.on('ar.retainage.released', () => { emitted = true; });
      await service.releaseRetainage(retainage.id, 5000);
      expect(emitted).toBe(true);
    });
  });
});
