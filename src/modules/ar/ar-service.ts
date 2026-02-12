/**
 * Concrete -- AR (Accounts Receivable) Service
 *
 * Core service layer for the Accounts Receivable module. Provides customer
 * management, invoice processing (progress, T&M, unit-price, cost-plus,
 * lump-sum), AIA G702/G703 progress billing, payment application, retainage
 * tracking, billing schedules/milestones, customer aging, retainage aging,
 * and overbilling/underbilling analysis.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';
import { now } from '../../core/types/base';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type CustomerStatus = 'active' | 'inactive' | 'hold';
export type BillingType = 'progress' | 'tm' | 'unit_price' | 'cost_plus' | 'lump_sum';
export type ARInvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'voided';
export type PaymentMethod = 'check' | 'ach' | 'wire' | 'credit-card';
export type ARPaymentStatus = 'pending' | 'applied' | 'voided';
export type AIAStatus = 'draft' | 'submitted' | 'approved' | 'paid';
export type RetainageStatus = 'held' | 'partial' | 'released';
export type ScheduleFrequency = 'monthly' | 'milestone' | 'progress';
export type MilestoneStatus = 'pending' | 'reached' | 'billed' | 'paid';
export type CostType = 'labor' | 'material' | 'subcontract' | 'equipment' | 'other' | 'overhead';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Customer {
  [key: string]: unknown;
  name: string;
  code?: string;
  status: CustomerStatus;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  creditLimit?: number;
  terms?: string;
  entityId?: string;
  ytdBillings: number;
  ytdPayments: number;
}

export interface ARInvoice {
  [key: string]: unknown;
  customerId: string;
  jobId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  billingType?: BillingType;
  amount: number;
  retainageAmount: number;
  taxAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: ARInvoiceStatus;
}

export interface ARInvoiceLine {
  [key: string]: unknown;
  invoiceId: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  costCodeId?: string;
  jobId?: string;
  costType?: CostType;
  markupPct?: number;
}

export interface ARPayment {
  [key: string]: unknown;
  customerId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  memo?: string;
  status: ARPaymentStatus;
}

export interface ARPaymentApplication {
  [key: string]: unknown;
  paymentId: string;
  invoiceId: string;
  amount: number;
}

export interface AIAApplication {
  [key: string]: unknown;
  jobId: string;
  applicationNumber: number;
  periodTo?: string;
  contractSum: number;
  changeOrderTotal: number;
  completedPreviousPeriod: number;
  completedThisPeriod: number;
  materialStored: number;
  totalCompleted: number;
  retainagePct: number;
  retainageAmount: number;
  status: AIAStatus;
}

export interface Retainage {
  [key: string]: unknown;
  invoiceId: string;
  customerId: string;
  jobId?: string;
  amount: number;
  pct?: number;
  releasedAmount: number;
  remainingAmount: number;
  status: RetainageStatus;
}

export interface BillingSchedule {
  [key: string]: unknown;
  jobId: string;
  customerId: string;
  name: string;
  frequency?: ScheduleFrequency;
  billingType?: BillingType;
  startDate?: string;
  endDate?: string;
}

export interface BillingMilestone {
  [key: string]: unknown;
  scheduleId: string;
  description: string;
  amount: number;
  dueDate?: string;
  percentOfContract?: number;
  status: MilestoneStatus;
}

// ---------------------------------------------------------------------------
// Report Types
// ---------------------------------------------------------------------------

export interface CustomerAgingRow {
  customerId: string;
  customerName: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days120Plus: number;
  total: number;
}

export interface RetainageAgingRow {
  customerId: string;
  customerName: string;
  jobId: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days120Plus: number;
  total: number;
}

export interface OverbillingRow {
  jobId: string;
  totalBilled: number;
  totalCost: number;
  earnedRevenue: number;
  overbilled: number;
  underbilled: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// ARService
// ---------------------------------------------------------------------------

export class ARService {
  constructor(
    private customers: Collection<Customer>,
    private invoices: Collection<ARInvoice>,
    private invoiceLines: Collection<ARInvoiceLine>,
    private payments: Collection<ARPayment>,
    private paymentApplications: Collection<ARPaymentApplication>,
    private aiaApplications: Collection<AIAApplication>,
    private retainages: Collection<Retainage>,
    private billingSchedules: Collection<BillingSchedule>,
    private billingMilestones: Collection<BillingMilestone>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // CUSTOMER CRUD
  // ========================================================================

  /**
   * Create a new customer.
   * Validates name uniqueness. Defaults: status='active', ytdBillings=0,
   * ytdPayments=0.
   */
  async createCustomer(data: {
    name: string;
    code?: string;
    status?: CustomerStatus;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    creditLimit?: number;
    terms?: string;
    entityId?: string;
  }): Promise<Customer & CollectionMeta> {
    // Validate name uniqueness
    const existing = await this.getCustomerByName(data.name);
    if (existing) {
      throw new Error(`Customer name "${data.name}" already exists.`);
    }

    const record = await this.customers.insert({
      name: data.name,
      code: data.code,
      status: data.status ?? 'active',
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      creditLimit: data.creditLimit,
      terms: data.terms,
      entityId: data.entityId,
      ytdBillings: 0,
      ytdPayments: 0,
    } as Customer);

    this.events.emit('ar.customer.created', { customer: record });
    return record;
  }

  /**
   * Update an existing customer.
   */
  async updateCustomer(
    id: string,
    changes: Partial<Customer>,
  ): Promise<Customer & CollectionMeta> {
    const existing = await this.customers.get(id);
    if (!existing) {
      throw new Error(`Customer not found: ${id}`);
    }

    // If name is changing, validate uniqueness
    if (changes.name && changes.name !== existing.name) {
      const duplicate = await this.getCustomerByName(changes.name);
      if (duplicate) {
        throw new Error(`Customer name "${changes.name}" already exists.`);
      }
    }

    const updated = await this.customers.update(id, changes as Partial<Customer>);
    this.events.emit('ar.customer.updated', { customer: updated });
    return updated;
  }

  /**
   * Soft-delete a customer.
   * Refuses deletion if the customer has any invoices.
   */
  async deleteCustomer(id: string): Promise<void> {
    const existing = await this.customers.get(id);
    if (!existing) {
      throw new Error(`Customer not found: ${id}`);
    }

    // Check for invoices
    const invoiceCount = await this.invoices
      .query()
      .where('customerId', '=', id)
      .count();

    if (invoiceCount > 0) {
      throw new Error(
        `Cannot delete customer: it has ${invoiceCount} invoice(s). Set customer to inactive instead.`,
      );
    }

    await this.customers.remove(id);
    this.events.emit('ar.customer.deleted', { customerId: id });
  }

  /**
   * Get a single customer by ID.
   */
  async getCustomer(id: string): Promise<(Customer & CollectionMeta) | null> {
    return this.customers.get(id);
  }

  /**
   * Get customers with optional filters, ordered by name.
   */
  async getCustomers(filters?: {
    status?: CustomerStatus;
    entityId?: string;
  }): Promise<(Customer & CollectionMeta)[]> {
    const q = this.customers.query();

    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }

    q.orderBy('name', 'asc');
    return q.execute();
  }

  /**
   * Lookup a customer by name.
   */
  async getCustomerByName(name: string): Promise<(Customer & CollectionMeta) | null> {
    const result = await this.customers
      .query()
      .where('name', '=', name)
      .limit(1)
      .first();
    return result;
  }

  // ========================================================================
  // INVOICE CRUD
  // ========================================================================

  /**
   * Create a new AR invoice.
   * Validates customer exists. Defaults: status='draft', paidAmount=0,
   * balanceDue=amount, netAmount=amount-retainageAmount-taxAmount.
   */
  async createInvoice(data: {
    customerId: string;
    jobId?: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    billingType?: BillingType;
    amount: number;
    retainageAmount?: number;
    taxAmount?: number;
    status?: ARInvoiceStatus;
  }): Promise<ARInvoice & CollectionMeta> {
    // Validate customer exists
    const customer = await this.customers.get(data.customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${data.customerId}`);
    }

    const taxAmount = data.taxAmount ?? 0;
    const retainageAmount = data.retainageAmount ?? 0;
    const netAmount = round2(data.amount - retainageAmount - taxAmount);

    const record = await this.invoices.insert({
      customerId: data.customerId,
      jobId: data.jobId,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      billingType: data.billingType,
      amount: round2(data.amount),
      retainageAmount: round2(retainageAmount),
      taxAmount: round2(taxAmount),
      netAmount,
      paidAmount: 0,
      balanceDue: round2(data.amount),
      status: data.status ?? 'draft',
    } as ARInvoice);

    this.events.emit('ar.invoice.created', { invoice: record });
    return record;
  }

  /**
   * Update an existing invoice.
   * Recalculates netAmount and balanceDue on amount/tax/retainage changes.
   */
  async updateInvoice(
    id: string,
    changes: Partial<ARInvoice>,
  ): Promise<ARInvoice & CollectionMeta> {
    const existing = await this.invoices.get(id);
    if (!existing) {
      throw new Error(`Invoice not found: ${id}`);
    }

    // If customer is changing, validate the new customer exists
    if (changes.customerId && changes.customerId !== existing.customerId) {
      const customer = await this.customers.get(changes.customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${changes.customerId}`);
      }
    }

    // Merge for recalculation
    const amount = changes.amount !== undefined ? changes.amount : existing.amount;
    const taxAmount = changes.taxAmount !== undefined ? changes.taxAmount : existing.taxAmount;
    const retainageAmount = changes.retainageAmount !== undefined ? changes.retainageAmount : existing.retainageAmount;
    const paidAmount = changes.paidAmount !== undefined ? changes.paidAmount : existing.paidAmount;

    const netAmount = round2(amount - retainageAmount - taxAmount);
    const balanceDue = round2(amount - paidAmount);

    const mergedChanges: Partial<ARInvoice> = {
      ...changes,
      netAmount,
      balanceDue,
    };

    const updated = await this.invoices.update(id, mergedChanges as Partial<ARInvoice>);
    return updated;
  }

  /**
   * Get a single invoice by ID.
   */
  async getInvoice(id: string): Promise<(ARInvoice & CollectionMeta) | null> {
    return this.invoices.get(id);
  }

  /**
   * Get invoices with optional filters, ordered by invoiceDate descending.
   */
  async getInvoices(filters?: {
    customerId?: string;
    status?: ARInvoiceStatus;
    jobId?: string;
    billingType?: BillingType;
  }): Promise<(ARInvoice & CollectionMeta)[]> {
    const q = this.invoices.query();

    if (filters?.customerId) {
      q.where('customerId', '=', filters.customerId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.billingType) {
      q.where('billingType', '=', filters.billingType);
    }

    q.orderBy('invoiceDate', 'desc');
    return q.execute();
  }

  /**
   * Send an invoice (set status to 'sent').
   * Validates invoice is in 'draft' status. Updates customer ytdBillings.
   */
  async sendInvoice(id: string): Promise<ARInvoice & CollectionMeta> {
    const invoice = await this.invoices.get(id);
    if (!invoice) {
      throw new Error(`Invoice not found: ${id}`);
    }

    if (invoice.status !== 'draft') {
      throw new Error(
        `Invoice "${invoice.invoiceNumber}" cannot be sent: current status is "${invoice.status}". Invoice must be in "draft" status.`,
      );
    }

    const updated = await this.invoices.update(id, {
      status: 'sent',
    } as Partial<ARInvoice>);

    // Update customer ytdBillings
    const customer = await this.customers.get(invoice.customerId);
    if (customer) {
      const newYtdBillings = round2(customer.ytdBillings + invoice.amount);
      await this.customers.update(customer.id, {
        ytdBillings: newYtdBillings,
      } as Partial<Customer>);
    }

    this.events.emit('ar.invoice.sent', { invoice: updated });
    return updated;
  }

  /**
   * Void an invoice.
   * Sets status='voided'.
   */
  async voidInvoice(id: string): Promise<ARInvoice & CollectionMeta> {
    const invoice = await this.invoices.get(id);
    if (!invoice) {
      throw new Error(`Invoice not found: ${id}`);
    }

    if (invoice.status === 'paid') {
      throw new Error(
        `Invoice "${invoice.invoiceNumber}" cannot be voided: it has been fully paid.`,
      );
    }

    const updated = await this.invoices.update(id, {
      status: 'voided',
    } as Partial<ARInvoice>);

    this.events.emit('ar.invoice.voided', { invoice: updated });
    return updated;
  }

  // ========================================================================
  // INVOICE LINES
  // ========================================================================

  /**
   * Add a line item to an invoice.
   * After adding the line, recalculates the invoice amount from the sum
   * of all lines.
   */
  async addInvoiceLine(data: {
    invoiceId: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
    costCodeId?: string;
    jobId?: string;
    costType?: CostType;
    markupPct?: number;
  }): Promise<ARInvoiceLine & CollectionMeta> {
    // Validate invoice exists
    const invoice = await this.invoices.get(data.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${data.invoiceId}`);
    }

    const record = await this.invoiceLines.insert({
      invoiceId: data.invoiceId,
      description: data.description,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      amount: round2(data.amount),
      costCodeId: data.costCodeId,
      jobId: data.jobId,
      costType: data.costType,
      markupPct: data.markupPct,
    } as ARInvoiceLine);

    // Recalculate invoice amount from sum of lines
    const lines = await this.invoiceLines
      .query()
      .where('invoiceId', '=', data.invoiceId)
      .execute();

    const totalAmount = round2(lines.reduce((sum, l) => sum + (l.amount || 0), 0));
    const taxAmount = invoice.taxAmount;
    const retainageAmount = invoice.retainageAmount;
    const netAmount = round2(totalAmount - retainageAmount - taxAmount);
    const balanceDue = round2(totalAmount - invoice.paidAmount);

    await this.invoices.update(data.invoiceId, {
      amount: totalAmount,
      netAmount,
      balanceDue,
    } as Partial<ARInvoice>);

    return record;
  }

  /**
   * Get all line items for an invoice.
   */
  async getInvoiceLines(
    invoiceId: string,
  ): Promise<(ARInvoiceLine & CollectionMeta)[]> {
    return this.invoiceLines
      .query()
      .where('invoiceId', '=', invoiceId)
      .execute();
  }

  // ========================================================================
  // AIA APPLICATION MANAGEMENT (G702/G703)
  // ========================================================================

  /**
   * Create a new AIA G702/G703 progress billing application.
   * Defaults: completedPreviousPeriod=0, completedThisPeriod=0,
   * materialStored=0, totalCompleted=0, retainageAmount=0, status='draft'.
   */
  async createAIAApplication(data: {
    jobId: string;
    applicationNumber: number;
    periodTo?: string;
    contractSum: number;
    changeOrderTotal?: number;
    retainagePct?: number;
  }): Promise<AIAApplication & CollectionMeta> {
    const record = await this.aiaApplications.insert({
      jobId: data.jobId,
      applicationNumber: data.applicationNumber,
      periodTo: data.periodTo,
      contractSum: round2(data.contractSum),
      changeOrderTotal: round2(data.changeOrderTotal ?? 0),
      completedPreviousPeriod: 0,
      completedThisPeriod: 0,
      materialStored: 0,
      totalCompleted: 0,
      retainagePct: data.retainagePct ?? 10,
      retainageAmount: 0,
      status: 'draft',
    } as AIAApplication);

    this.events.emit('ar.aia.created', { aiaApplication: record });
    return record;
  }

  /**
   * Update progress on an AIA application.
   * Recalculates totalCompleted and retainageAmount.
   */
  async updateAIAProgress(
    id: string,
    data: {
      completedThisPeriod?: number;
      materialStored?: number;
      completedPreviousPeriod?: number;
    },
  ): Promise<AIAApplication & CollectionMeta> {
    const existing = await this.aiaApplications.get(id);
    if (!existing) {
      throw new Error(`AIA application not found: ${id}`);
    }

    const completedPreviousPeriod = data.completedPreviousPeriod !== undefined
      ? data.completedPreviousPeriod
      : existing.completedPreviousPeriod;
    const completedThisPeriod = data.completedThisPeriod !== undefined
      ? data.completedThisPeriod
      : existing.completedThisPeriod;
    const materialStored = data.materialStored !== undefined
      ? data.materialStored
      : existing.materialStored;

    const totalCompleted = round2(completedPreviousPeriod + completedThisPeriod + materialStored);
    const retainageAmount = round2(totalCompleted * (existing.retainagePct / 100));

    const updated = await this.aiaApplications.update(id, {
      completedPreviousPeriod: round2(completedPreviousPeriod),
      completedThisPeriod: round2(completedThisPeriod),
      materialStored: round2(materialStored),
      totalCompleted,
      retainageAmount,
    } as Partial<AIAApplication>);

    return updated;
  }

  /**
   * Submit an AIA application for approval.
   * Validates status is 'draft'.
   */
  async submitAIAApplication(id: string): Promise<AIAApplication & CollectionMeta> {
    const existing = await this.aiaApplications.get(id);
    if (!existing) {
      throw new Error(`AIA application not found: ${id}`);
    }

    if (existing.status !== 'draft') {
      throw new Error(
        `AIA application #${existing.applicationNumber} cannot be submitted: current status is "${existing.status}".`,
      );
    }

    const updated = await this.aiaApplications.update(id, {
      status: 'submitted',
    } as Partial<AIAApplication>);

    this.events.emit('ar.aia.submitted', { aiaApplication: updated });
    return updated;
  }

  /**
   * Approve an AIA application.
   * Validates status is 'submitted'.
   */
  async approveAIAApplication(id: string): Promise<AIAApplication & CollectionMeta> {
    const existing = await this.aiaApplications.get(id);
    if (!existing) {
      throw new Error(`AIA application not found: ${id}`);
    }

    if (existing.status !== 'submitted') {
      throw new Error(
        `AIA application #${existing.applicationNumber} cannot be approved: current status is "${existing.status}".`,
      );
    }

    const updated = await this.aiaApplications.update(id, {
      status: 'approved',
    } as Partial<AIAApplication>);

    this.events.emit('ar.aia.approved', { aiaApplication: updated });
    return updated;
  }

  /**
   * Get a single AIA application by ID.
   */
  async getAIAApplication(id: string): Promise<(AIAApplication & CollectionMeta) | null> {
    return this.aiaApplications.get(id);
  }

  /**
   * Get AIA applications with optional filters.
   */
  async getAIAApplications(filters?: {
    jobId?: string;
    status?: AIAStatus;
  }): Promise<(AIAApplication & CollectionMeta)[]> {
    const q = this.aiaApplications.query();

    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    q.orderBy('applicationNumber', 'desc');
    return q.execute();
  }

  // ========================================================================
  // PAYMENT PROCESSING
  // ========================================================================

  /**
   * Create a payment from a customer.
   * Defaults: status='pending'.
   */
  async createPayment(
    customerId: string,
    date: string,
    amount: number,
    method: PaymentMethod,
    referenceNumber?: string,
    memo?: string,
  ): Promise<ARPayment & CollectionMeta> {
    // Validate customer exists
    const customer = await this.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const record = await this.payments.insert({
      customerId,
      date,
      amount: round2(amount),
      method,
      referenceNumber,
      memo,
      status: 'pending',
    } as ARPayment);

    this.events.emit('ar.payment.created', { payment: record });
    return record;
  }

  /**
   * Apply a payment to one or more invoices.
   *
   * For each application, creates a payment application record and updates
   * the invoice's paidAmount, balanceDue, and status. Also updates the
   * customer's ytdPayments.
   */
  async applyPayment(
    paymentId: string,
    applications: {
      invoiceId: string;
      amount: number;
    }[],
  ): Promise<(ARPaymentApplication & CollectionMeta)[]> {
    // Validate payment exists
    const payment = await this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    const createdApps: (ARPaymentApplication & CollectionMeta)[] = [];

    for (const app of applications) {
      // Validate invoice exists
      const invoice = await this.invoices.get(app.invoiceId);
      if (!invoice) {
        throw new Error(`Invoice not found: ${app.invoiceId}`);
      }

      // Create payment application record
      const appRecord = await this.paymentApplications.insert({
        paymentId,
        invoiceId: app.invoiceId,
        amount: round2(app.amount),
      } as ARPaymentApplication);

      createdApps.push(appRecord);

      // Update invoice paidAmount and balanceDue
      const newPaidAmount = round2(invoice.paidAmount + app.amount);
      const newBalanceDue = round2(invoice.amount - newPaidAmount);

      let newStatus: ARInvoiceStatus = invoice.status;
      if (newBalanceDue <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      await this.invoices.update(app.invoiceId, {
        paidAmount: newPaidAmount,
        balanceDue: Math.max(newBalanceDue, 0),
        status: newStatus,
      } as Partial<ARInvoice>);
    }

    // Update customer ytdPayments
    const totalApplied = round2(
      applications.reduce((sum, a) => sum + a.amount, 0),
    );
    const customer = await this.customers.get(payment.customerId);
    if (customer) {
      const newYtdPayments = round2(customer.ytdPayments + totalApplied);
      await this.customers.update(customer.id, {
        ytdPayments: newYtdPayments,
      } as Partial<Customer>);
    }

    // Update payment status to applied
    await this.payments.update(paymentId, {
      status: 'applied',
    } as Partial<ARPayment>);

    this.events.emit('ar.payment.applied', {
      paymentId,
      applications: createdApps,
    });

    return createdApps;
  }

  /**
   * Get a single payment by ID.
   */
  async getPayment(id: string): Promise<(ARPayment & CollectionMeta) | null> {
    return this.payments.get(id);
  }

  /**
   * Get payments with optional filters, ordered by date descending.
   */
  async getPayments(filters?: {
    customerId?: string;
    status?: ARPaymentStatus;
  }): Promise<(ARPayment & CollectionMeta)[]> {
    const q = this.payments.query();

    if (filters?.customerId) {
      q.where('customerId', '=', filters.customerId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    q.orderBy('date', 'desc');
    return q.execute();
  }

  /**
   * Get payment application records for a payment.
   */
  async getPaymentApplications(
    paymentId: string,
  ): Promise<(ARPaymentApplication & CollectionMeta)[]> {
    return this.paymentApplications
      .query()
      .where('paymentId', '=', paymentId)
      .execute();
  }

  // ========================================================================
  // RETAINAGE TRACKING
  // ========================================================================

  /**
   * Create a retainage record.
   * Defaults: releasedAmount=0, remainingAmount=amount, status='held'.
   */
  async createRetainage(
    invoiceId: string,
    customerId: string,
    jobId?: string,
    amount?: number,
    pct?: number,
  ): Promise<Retainage & CollectionMeta> {
    // Validate invoice exists
    const invoice = await this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    // Validate customer exists
    const customer = await this.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const retainageAmount = amount ?? 0;

    const record = await this.retainages.insert({
      invoiceId,
      customerId,
      jobId,
      amount: round2(retainageAmount),
      pct,
      releasedAmount: 0,
      remainingAmount: round2(retainageAmount),
      status: 'held',
    } as Retainage);

    this.events.emit('ar.retainage.created', { retainage: record });
    return record;
  }

  /**
   * Release retainage (partial or full).
   * Updates releasedAmount, remainingAmount, and status.
   */
  async releaseRetainage(
    id: string,
    releaseAmount: number,
  ): Promise<Retainage & CollectionMeta> {
    const existing = await this.retainages.get(id);
    if (!existing) {
      throw new Error(`Retainage not found: ${id}`);
    }

    if (releaseAmount > existing.remainingAmount) {
      throw new Error(
        `Release amount (${releaseAmount}) exceeds remaining retainage (${existing.remainingAmount}).`,
      );
    }

    const newReleasedAmount = round2(existing.releasedAmount + releaseAmount);
    const newRemainingAmount = round2(existing.remainingAmount - releaseAmount);

    let newStatus: RetainageStatus;
    if (newRemainingAmount <= 0) {
      newStatus = 'released';
    } else if (newReleasedAmount > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'held';
    }

    const updated = await this.retainages.update(id, {
      releasedAmount: newReleasedAmount,
      remainingAmount: Math.max(newRemainingAmount, 0),
      status: newStatus,
    } as Partial<Retainage>);

    this.events.emit('ar.retainage.released', { retainage: updated });
    return updated;
  }

  /**
   * Get retainages with optional filters.
   */
  async getRetainages(filters?: {
    customerId?: string;
    jobId?: string;
    status?: RetainageStatus;
  }): Promise<(Retainage & CollectionMeta)[]> {
    const q = this.retainages.query();

    if (filters?.customerId) {
      q.where('customerId', '=', filters.customerId);
    }
    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    return q.execute();
  }

  // ========================================================================
  // BILLING SCHEDULE & MILESTONE CRUD
  // ========================================================================

  /**
   * Create a billing schedule.
   */
  async createBillingSchedule(data: {
    jobId: string;
    customerId: string;
    name: string;
    frequency?: ScheduleFrequency;
    billingType?: BillingType;
    startDate?: string;
    endDate?: string;
  }): Promise<BillingSchedule & CollectionMeta> {
    // Validate customer exists
    const customer = await this.customers.get(data.customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${data.customerId}`);
    }

    const record = await this.billingSchedules.insert({
      jobId: data.jobId,
      customerId: data.customerId,
      name: data.name,
      frequency: data.frequency,
      billingType: data.billingType,
      startDate: data.startDate,
      endDate: data.endDate,
    } as BillingSchedule);

    return record;
  }

  /**
   * Update an existing billing schedule.
   */
  async updateBillingSchedule(
    id: string,
    changes: Partial<BillingSchedule>,
  ): Promise<BillingSchedule & CollectionMeta> {
    const existing = await this.billingSchedules.get(id);
    if (!existing) {
      throw new Error(`Billing schedule not found: ${id}`);
    }

    const updated = await this.billingSchedules.update(id, changes as Partial<BillingSchedule>);
    return updated;
  }

  /**
   * Get billing schedules with optional filters.
   */
  async getBillingSchedules(filters?: {
    jobId?: string;
    customerId?: string;
  }): Promise<(BillingSchedule & CollectionMeta)[]> {
    const q = this.billingSchedules.query();

    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.customerId) {
      q.where('customerId', '=', filters.customerId);
    }

    q.orderBy('name', 'asc');
    return q.execute();
  }

  /**
   * Get a single billing schedule by ID.
   */
  async getBillingSchedule(id: string): Promise<(BillingSchedule & CollectionMeta) | null> {
    return this.billingSchedules.get(id);
  }

  /**
   * Create a billing milestone.
   * Defaults: status='pending'.
   */
  async createBillingMilestone(data: {
    scheduleId: string;
    description: string;
    amount: number;
    dueDate?: string;
    percentOfContract?: number;
    status?: MilestoneStatus;
  }): Promise<BillingMilestone & CollectionMeta> {
    // Validate schedule exists
    const schedule = await this.billingSchedules.get(data.scheduleId);
    if (!schedule) {
      throw new Error(`Billing schedule not found: ${data.scheduleId}`);
    }

    const record = await this.billingMilestones.insert({
      scheduleId: data.scheduleId,
      description: data.description,
      amount: round2(data.amount),
      dueDate: data.dueDate,
      percentOfContract: data.percentOfContract,
      status: data.status ?? 'pending',
    } as BillingMilestone);

    return record;
  }

  /**
   * Update a billing milestone.
   */
  async updateBillingMilestone(
    id: string,
    changes: Partial<BillingMilestone>,
  ): Promise<BillingMilestone & CollectionMeta> {
    const existing = await this.billingMilestones.get(id);
    if (!existing) {
      throw new Error(`Billing milestone not found: ${id}`);
    }

    const updated = await this.billingMilestones.update(id, changes as Partial<BillingMilestone>);
    return updated;
  }

  /**
   * Get milestones for a billing schedule.
   */
  async getBillingMilestones(
    scheduleId: string,
  ): Promise<(BillingMilestone & CollectionMeta)[]> {
    return this.billingMilestones
      .query()
      .where('scheduleId', '=', scheduleId)
      .execute();
  }

  // ========================================================================
  // CUSTOMER AGING REPORT
  // ========================================================================

  /**
   * Get customer aging report.
   *
   * For each customer with open invoices (status not 'paid' or 'voided'),
   * computes current/30/60/90/120+ buckets based on dueDate (or
   * invoiceDate if no dueDate). Returns an array of CustomerAgingRow objects.
   */
  async getCustomerAging(asOfDate?: string): Promise<CustomerAgingRow[]> {
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    const asOfTime = asOf.getTime();

    // Get all open invoices (not paid or voided)
    const allInvoices = await this.invoices.query().execute();
    const openInvoices = allInvoices.filter(
      (inv) => inv.status !== 'paid' && inv.status !== 'voided',
    );

    // Group by customer
    const customerMap = new Map<
      string,
      { current: number; days30: number; days60: number; days90: number; days120Plus: number; total: number }
    >();

    for (const inv of openInvoices) {
      const referenceDate = inv.dueDate || inv.invoiceDate;
      const refTime = new Date(referenceDate).getTime();
      const daysOld = Math.floor((asOfTime - refTime) / (1000 * 60 * 60 * 24));
      const balance = inv.balanceDue;

      if (!customerMap.has(inv.customerId)) {
        customerMap.set(inv.customerId, {
          current: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          days120Plus: 0,
          total: 0,
        });
      }

      const bucket = customerMap.get(inv.customerId)!;

      if (daysOld <= 30) {
        bucket.current = round2(bucket.current + balance);
      } else if (daysOld <= 60) {
        bucket.days30 = round2(bucket.days30 + balance);
      } else if (daysOld <= 90) {
        bucket.days60 = round2(bucket.days60 + balance);
      } else if (daysOld <= 120) {
        bucket.days90 = round2(bucket.days90 + balance);
      } else {
        bucket.days120Plus = round2(bucket.days120Plus + balance);
      }

      bucket.total = round2(bucket.total + balance);
    }

    // Build result rows with customer names
    const rows: CustomerAgingRow[] = [];

    for (const [customerId, bucket] of customerMap) {
      const customer = await this.customers.get(customerId);
      const customerName = customer ? customer.name : customerId;

      rows.push({
        customerId,
        customerName,
        current: bucket.current,
        days30: bucket.days30,
        days60: bucket.days60,
        days90: bucket.days90,
        days120Plus: bucket.days120Plus,
        total: bucket.total,
      });
    }

    // Sort by customer name
    rows.sort((a, b) => a.customerName.localeCompare(b.customerName));

    return rows;
  }

  // ========================================================================
  // RETAINAGE AGING REPORT
  // ========================================================================

  /**
   * Get retainage aging report.
   *
   * For each held or partial retainage record, computes aging buckets based
   * on the associated invoice date. Groups by customer + job.
   */
  async getRetainageAging(asOfDate?: string): Promise<RetainageAgingRow[]> {
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    const asOfTime = asOf.getTime();

    // Get all retainages that have remaining amounts
    const allRetainages = await this.retainages.query().execute();
    const openRetainages = allRetainages.filter(
      (r) => r.status !== 'released',
    );

    // Group by customer + job
    const keyMap = new Map<
      string,
      { customerId: string; jobId: string; current: number; days30: number; days60: number; days90: number; days120Plus: number; total: number }
    >();

    for (const ret of openRetainages) {
      // Look up the invoice to get the date
      const invoice = await this.invoices.get(ret.invoiceId);
      const referenceDate = invoice ? (invoice.dueDate || invoice.invoiceDate) : now();
      const refTime = new Date(referenceDate).getTime();
      const daysOld = Math.floor((asOfTime - refTime) / (1000 * 60 * 60 * 24));
      const balance = ret.remainingAmount;

      const key = `${ret.customerId}::${ret.jobId ?? '__none__'}`;

      if (!keyMap.has(key)) {
        keyMap.set(key, {
          customerId: ret.customerId,
          jobId: ret.jobId ?? '',
          current: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          days120Plus: 0,
          total: 0,
        });
      }

      const bucket = keyMap.get(key)!;

      if (daysOld <= 30) {
        bucket.current = round2(bucket.current + balance);
      } else if (daysOld <= 60) {
        bucket.days30 = round2(bucket.days30 + balance);
      } else if (daysOld <= 90) {
        bucket.days60 = round2(bucket.days60 + balance);
      } else if (daysOld <= 120) {
        bucket.days90 = round2(bucket.days90 + balance);
      } else {
        bucket.days120Plus = round2(bucket.days120Plus + balance);
      }

      bucket.total = round2(bucket.total + balance);
    }

    // Build result rows with customer names
    const rows: RetainageAgingRow[] = [];

    for (const [, bucket] of keyMap) {
      const customer = await this.customers.get(bucket.customerId);
      const customerName = customer ? customer.name : bucket.customerId;

      rows.push({
        customerId: bucket.customerId,
        customerName,
        jobId: bucket.jobId,
        current: bucket.current,
        days30: bucket.days30,
        days60: bucket.days60,
        days90: bucket.days90,
        days120Plus: bucket.days120Plus,
        total: bucket.total,
      });
    }

    // Sort by customer name
    rows.sort((a, b) => a.customerName.localeCompare(b.customerName));

    return rows;
  }

  // ========================================================================
  // OVERBILLING / UNDERBILLING ANALYSIS
  // ========================================================================

  /**
   * Get overbilling/underbilling analysis by job.
   *
   * For each job that has AR invoices, computes:
   * - totalBilled: sum of all invoice amounts for the job
   * - totalCost: from AIA applications (totalCompleted) or sum of invoice
   *   line costs
   * - earnedRevenue: from AIA application contractSum percentage complete
   * - overbilled: max(0, totalBilled - earnedRevenue)
   * - underbilled: max(0, earnedRevenue - totalBilled)
   */
  async getOverbillingAnalysis(): Promise<OverbillingRow[]> {
    // Get all non-voided invoices
    const allInvoices = await this.invoices.query().execute();
    const activeInvoices = allInvoices.filter(
      (inv) => inv.status !== 'voided',
    );

    // Group invoices by job
    const jobBilledMap = new Map<string, number>();
    for (const inv of activeInvoices) {
      const jobId = inv.jobId;
      if (!jobId) continue;
      const current = jobBilledMap.get(jobId) ?? 0;
      jobBilledMap.set(jobId, round2(current + inv.amount));
    }

    // Get AIA applications by job for cost/earned data
    const allAIA = await this.aiaApplications.query().execute();
    const aiaByJob = new Map<string, AIAApplication & CollectionMeta>();
    for (const aia of allAIA) {
      const existing = aiaByJob.get(aia.jobId);
      if (!existing || aia.applicationNumber > existing.applicationNumber) {
        aiaByJob.set(aia.jobId, aia);
      }
    }

    const rows: OverbillingRow[] = [];

    for (const [jobId, totalBilled] of jobBilledMap) {
      const aia = aiaByJob.get(jobId);
      const totalCost = aia ? aia.totalCompleted : 0;
      const contractSum = aia ? round2(aia.contractSum + aia.changeOrderTotal) : totalBilled;
      const percentComplete = contractSum > 0 ? totalCost / contractSum : 0;
      const earnedRevenue = round2(contractSum * percentComplete);

      const overbilled = round2(Math.max(0, totalBilled - earnedRevenue));
      const underbilled = round2(Math.max(0, earnedRevenue - totalBilled));

      rows.push({
        jobId,
        totalBilled,
        totalCost,
        earnedRevenue,
        overbilled,
        underbilled,
      });
    }

    return rows;
  }
}
