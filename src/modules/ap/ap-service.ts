/**
 * Concrete -- AP (Accounts Payable) Service
 *
 * Core service layer for the Accounts Payable module. Provides vendor
 * management, invoice processing, payment application, retention tracking,
 * vendor aging, 1099 reporting, lien waiver tracking, and compliance
 * certificate management.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';
import { now } from '../../core/types/base';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type VendorType = 'subcontractor' | 'supplier' | 'professional' | 'utility' | 'other';
export type VendorStatus = 'active' | 'inactive' | 'hold';
export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'partial' | 'paid' | 'voided';
export type PaymentMethod = 'check' | 'ach' | 'wire' | 'credit-card';
export type PaymentStatus = 'pending' | 'processed' | 'voided';
export type LienWaiverType = 'conditional_partial' | 'unconditional_partial' | 'conditional_final' | 'unconditional_final';
export type LienWaiverStatus = 'requested' | 'received' | 'expired';
export type ComplianceCertType = 'insurance_gl' | 'insurance_auto' | 'insurance_umbrella' | 'insurance_wc' | 'license' | 'bond' | 'other';
export type ComplianceCertStatus = 'valid' | 'expired' | 'pending' | 'revoked';
export type RetentionStatus = 'held' | 'partial' | 'released';
export type CostType = 'labor' | 'material' | 'subcontract' | 'equipment' | 'other' | 'overhead';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Vendor {
  [key: string]: unknown;
  name: string;
  code?: string;
  taxId?: string;
  vendorType?: VendorType;
  status: VendorStatus;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  defaultTerms?: string;
  defaultPaymentMethod?: PaymentMethod;
  is1099: boolean;
  form1099Type?: string;
  insuranceRequired: boolean;
  bondRequired: boolean;
  entityId?: string;
  notes?: string;
  ytdPayments: number;
  ytd1099Amount: number;
}

export interface APInvoice {
  [key: string]: unknown;
  vendorId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  receivedDate?: string;
  terms?: string;
  description?: string;
  amount: number;
  taxAmount: number;
  retentionAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
  approvedBy?: string;
  approvedAt?: string;
  jobId?: string;
  entityId?: string;
  duplicateFlag: boolean;
  duplicateOfId?: string;
}

export interface APInvoiceLine {
  [key: string]: unknown;
  invoiceId: string;
  description?: string;
  amount: number;
  jobId?: string;
  costCodeId?: string;
  costType?: CostType;
  glAccountId?: string;
  quantity?: number;
  unitCost?: number;
}

export interface APPayment {
  [key: string]: unknown;
  vendorId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  memo?: string;
  entityId?: string;
  status: PaymentStatus;
}

export interface APPaymentLine {
  [key: string]: unknown;
  paymentId: string;
  invoiceId: string;
  amount: number;
  retentionAmount: number;
  discountAmount: number;
}

export interface LienWaiver {
  [key: string]: unknown;
  vendorId: string;
  jobId?: string;
  type: LienWaiverType;
  status: LienWaiverStatus;
  amount?: number;
  throughDate?: string;
  receivedDate?: string;
  paymentId?: string;
  description?: string;
}

export interface ComplianceCert {
  [key: string]: unknown;
  vendorId: string;
  certType: ComplianceCertType;
  policyNumber?: string;
  carrier?: string;
  agent?: string;
  effectiveDate?: string;
  expirationDate?: string;
  coverageAmount?: number;
  status: ComplianceCertStatus;
  jobId?: string;
}

export interface Retention {
  [key: string]: unknown;
  invoiceId: string;
  vendorId: string;
  jobId?: string;
  amount: number;
  retentionPct?: number;
  releasedAmount: number;
  remainingAmount: number;
  releaseDate?: string;
  status: RetentionStatus;
}

// ---------------------------------------------------------------------------
// Report Types
// ---------------------------------------------------------------------------

export interface AgingRow {
  vendorId: string;
  vendorName: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days120Plus: number;
  total: number;
}

export interface Report1099Row {
  vendorId: string;
  vendorName: string;
  taxId: string;
  form1099Type: string;
  totalPayments: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// APService
// ---------------------------------------------------------------------------

export class APService {
  constructor(
    private vendors: Collection<Vendor>,
    private invoices: Collection<APInvoice>,
    private invoiceLines: Collection<APInvoiceLine>,
    private payments: Collection<APPayment>,
    private paymentLines: Collection<APPaymentLine>,
    private lienWaivers: Collection<LienWaiver>,
    private complianceCerts: Collection<ComplianceCert>,
    private retentions: Collection<Retention>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // VENDOR CRUD
  // ========================================================================

  /**
   * Create a new vendor.
   * Validates name uniqueness. Defaults: status='active', ytdPayments=0,
   * ytd1099Amount=0.
   */
  async createVendor(data: {
    name: string;
    code?: string;
    taxId?: string;
    vendorType?: VendorType;
    status?: VendorStatus;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    defaultTerms?: string;
    defaultPaymentMethod?: PaymentMethod;
    is1099?: boolean;
    form1099Type?: string;
    insuranceRequired?: boolean;
    bondRequired?: boolean;
    entityId?: string;
    notes?: string;
  }): Promise<Vendor & CollectionMeta> {
    // Validate name uniqueness
    const existing = await this.getVendorByName(data.name);
    if (existing) {
      throw new Error(`Vendor name "${data.name}" already exists.`);
    }

    const record = await this.vendors.insert({
      name: data.name,
      code: data.code,
      taxId: data.taxId,
      vendorType: data.vendorType,
      status: data.status ?? 'active',
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country,
      phone: data.phone,
      email: data.email,
      website: data.website,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      defaultTerms: data.defaultTerms,
      defaultPaymentMethod: data.defaultPaymentMethod,
      is1099: data.is1099 ?? false,
      form1099Type: data.form1099Type,
      insuranceRequired: data.insuranceRequired ?? false,
      bondRequired: data.bondRequired ?? false,
      entityId: data.entityId,
      notes: data.notes,
      ytdPayments: 0,
      ytd1099Amount: 0,
    } as Vendor);

    this.events.emit('ap.vendor.created', { vendor: record });
    return record;
  }

  /**
   * Update an existing vendor.
   */
  async updateVendor(
    id: string,
    changes: Partial<Vendor>,
  ): Promise<Vendor & CollectionMeta> {
    const existing = await this.vendors.get(id);
    if (!existing) {
      throw new Error(`Vendor not found: ${id}`);
    }

    // If name is changing, validate uniqueness
    if (changes.name && changes.name !== existing.name) {
      const duplicate = await this.getVendorByName(changes.name);
      if (duplicate) {
        throw new Error(`Vendor name "${changes.name}" already exists.`);
      }
    }

    const updated = await this.vendors.update(id, changes as Partial<Vendor>);
    this.events.emit('ap.vendor.updated', { vendor: updated });
    return updated;
  }

  /**
   * Soft-delete a vendor.
   * Refuses deletion if the vendor has any invoices.
   */
  async deleteVendor(id: string): Promise<void> {
    const existing = await this.vendors.get(id);
    if (!existing) {
      throw new Error(`Vendor not found: ${id}`);
    }

    // Check for invoices
    const invoiceCount = await this.invoices
      .query()
      .where('vendorId', '=', id)
      .count();

    if (invoiceCount > 0) {
      throw new Error(
        `Cannot delete vendor: it has ${invoiceCount} invoice(s). Set vendor to inactive instead.`,
      );
    }

    await this.vendors.remove(id);
    this.events.emit('ap.vendor.deleted', { vendorId: id });
  }

  /**
   * Get a single vendor by ID.
   */
  async getVendor(id: string): Promise<(Vendor & CollectionMeta) | null> {
    return this.vendors.get(id);
  }

  /**
   * Get vendors with optional filters, ordered by name.
   */
  async getVendors(filters?: {
    status?: VendorStatus;
    vendorType?: VendorType;
    is1099?: boolean;
    entityId?: string;
  }): Promise<(Vendor & CollectionMeta)[]> {
    const q = this.vendors.query();

    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.vendorType) {
      q.where('vendorType', '=', filters.vendorType);
    }
    if (filters?.is1099 !== undefined) {
      q.where('is1099', '=', filters.is1099);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }

    q.orderBy('name', 'asc');
    return q.execute();
  }

  /**
   * Lookup a vendor by name.
   */
  async getVendorByName(name: string): Promise<(Vendor & CollectionMeta) | null> {
    const result = await this.vendors
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
   * Create a new AP invoice.
   * Validates vendor exists. Defaults: status='draft', paidAmount=0,
   * balanceDue=amount, netAmount=amount-retentionAmount-taxAmount,
   * duplicateFlag=false. Checks for duplicate invoices (same vendorId +
   * invoiceNumber).
   */
  async createInvoice(data: {
    vendorId: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    receivedDate?: string;
    terms?: string;
    description?: string;
    amount: number;
    taxAmount?: number;
    retentionAmount?: number;
    status?: InvoiceStatus;
    jobId?: string;
    entityId?: string;
  }): Promise<APInvoice & CollectionMeta> {
    // Validate vendor exists
    const vendor = await this.vendors.get(data.vendorId);
    if (!vendor) {
      throw new Error(`Vendor not found: ${data.vendorId}`);
    }

    const taxAmount = data.taxAmount ?? 0;
    const retentionAmount = data.retentionAmount ?? 0;
    const netAmount = round2(data.amount - retentionAmount - taxAmount);

    // Check for duplicate invoices (same vendorId + invoiceNumber)
    let duplicateFlag = false;
    let duplicateOfId: string | undefined;
    const existingInvoice = await this.invoices
      .query()
      .where('vendorId', '=', data.vendorId)
      .where('invoiceNumber', '=', data.invoiceNumber)
      .limit(1)
      .first();

    if (existingInvoice) {
      duplicateFlag = true;
      duplicateOfId = existingInvoice.id;
    }

    const record = await this.invoices.insert({
      vendorId: data.vendorId,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      receivedDate: data.receivedDate,
      terms: data.terms,
      description: data.description,
      amount: round2(data.amount),
      taxAmount: round2(taxAmount),
      retentionAmount: round2(retentionAmount),
      netAmount,
      paidAmount: 0,
      balanceDue: round2(data.amount),
      status: data.status ?? 'draft',
      jobId: data.jobId,
      entityId: data.entityId,
      duplicateFlag,
      duplicateOfId,
    } as APInvoice);

    this.events.emit('ap.invoice.created', { invoice: record });
    return record;
  }

  /**
   * Update an existing invoice.
   * Recalculates netAmount and balanceDue on amount/tax/retention changes.
   */
  async updateInvoice(
    id: string,
    changes: Partial<APInvoice>,
  ): Promise<APInvoice & CollectionMeta> {
    const existing = await this.invoices.get(id);
    if (!existing) {
      throw new Error(`Invoice not found: ${id}`);
    }

    // If vendor is changing, validate the new vendor exists
    if (changes.vendorId && changes.vendorId !== existing.vendorId) {
      const vendor = await this.vendors.get(changes.vendorId);
      if (!vendor) {
        throw new Error(`Vendor not found: ${changes.vendorId}`);
      }
    }

    // Merge for recalculation
    const amount = changes.amount !== undefined ? changes.amount : existing.amount;
    const taxAmount = changes.taxAmount !== undefined ? changes.taxAmount : existing.taxAmount;
    const retentionAmount = changes.retentionAmount !== undefined ? changes.retentionAmount : existing.retentionAmount;
    const paidAmount = changes.paidAmount !== undefined ? changes.paidAmount : existing.paidAmount;

    const netAmount = round2(amount - retentionAmount - taxAmount);
    const balanceDue = round2(amount - paidAmount);

    const mergedChanges: Partial<APInvoice> = {
      ...changes,
      netAmount,
      balanceDue,
    };

    const updated = await this.invoices.update(id, mergedChanges as Partial<APInvoice>);
    return updated;
  }

  /**
   * Get a single invoice by ID.
   */
  async getInvoice(id: string): Promise<(APInvoice & CollectionMeta) | null> {
    return this.invoices.get(id);
  }

  /**
   * Get invoices with optional filters, ordered by invoiceDate descending.
   */
  async getInvoices(filters?: {
    vendorId?: string;
    status?: InvoiceStatus;
    jobId?: string;
    entityId?: string;
  }): Promise<(APInvoice & CollectionMeta)[]> {
    const q = this.invoices.query();

    if (filters?.vendorId) {
      q.where('vendorId', '=', filters.vendorId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }

    q.orderBy('invoiceDate', 'desc');
    return q.execute();
  }

  // ========================================================================
  // INVOICE APPROVAL
  // ========================================================================

  /**
   * Approve an invoice.
   * Validates the invoice is in 'pending' status, then sets status='approved',
   * approvedAt, and approvedBy.
   */
  async approveInvoice(
    id: string,
    approvedBy: string,
  ): Promise<APInvoice & CollectionMeta> {
    const invoice = await this.invoices.get(id);
    if (!invoice) {
      throw new Error(`Invoice not found: ${id}`);
    }

    if (invoice.status !== 'pending') {
      throw new Error(
        `Invoice "${invoice.invoiceNumber}" cannot be approved: current status is "${invoice.status}". Invoice must be in "pending" status.`,
      );
    }

    const updated = await this.invoices.update(id, {
      status: 'approved',
      approvedAt: now(),
      approvedBy,
    } as Partial<APInvoice>);

    this.events.emit('ap.invoice.approved', { invoice: updated });
    return updated;
  }

  /**
   * Void an invoice.
   * Sets status='voided'.
   */
  async voidInvoice(id: string): Promise<APInvoice & CollectionMeta> {
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
    } as Partial<APInvoice>);

    this.events.emit('ap.invoice.voided', { invoice: updated });
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
    amount: number;
    jobId?: string;
    costCodeId?: string;
    costType?: CostType;
    glAccountId?: string;
    quantity?: number;
    unitCost?: number;
  }): Promise<APInvoiceLine & CollectionMeta> {
    // Validate invoice exists
    const invoice = await this.invoices.get(data.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${data.invoiceId}`);
    }

    const record = await this.invoiceLines.insert({
      invoiceId: data.invoiceId,
      description: data.description,
      amount: round2(data.amount),
      jobId: data.jobId,
      costCodeId: data.costCodeId,
      costType: data.costType,
      glAccountId: data.glAccountId,
      quantity: data.quantity,
      unitCost: data.unitCost,
    } as APInvoiceLine);

    // Recalculate invoice amount from sum of lines
    const lines = await this.invoiceLines
      .query()
      .where('invoiceId', '=', data.invoiceId)
      .execute();

    const totalAmount = round2(lines.reduce((sum, l) => sum + (l.amount || 0), 0));
    const taxAmount = invoice.taxAmount;
    const retentionAmount = invoice.retentionAmount;
    const netAmount = round2(totalAmount - retentionAmount - taxAmount);
    const balanceDue = round2(totalAmount - invoice.paidAmount);

    await this.invoices.update(data.invoiceId, {
      amount: totalAmount,
      netAmount,
      balanceDue,
    } as Partial<APInvoice>);

    return record;
  }

  /**
   * Get all line items for an invoice.
   */
  async getInvoiceLines(
    invoiceId: string,
  ): Promise<(APInvoiceLine & CollectionMeta)[]> {
    return this.invoiceLines
      .query()
      .where('invoiceId', '=', invoiceId)
      .execute();
  }

  // ========================================================================
  // PAYMENT PROCESSING
  // ========================================================================

  /**
   * Create a payment for a vendor.
   * Defaults: status='pending'.
   */
  async createPayment(
    vendorId: string,
    date: string,
    amount: number,
    method: PaymentMethod,
    referenceNumber?: string,
    memo?: string,
    entityId?: string,
  ): Promise<APPayment & CollectionMeta> {
    // Validate vendor exists
    const vendor = await this.vendors.get(vendorId);
    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }

    const record = await this.payments.insert({
      vendorId,
      date,
      amount: round2(amount),
      method,
      referenceNumber,
      memo,
      entityId,
      status: 'pending',
    } as APPayment);

    this.events.emit('ap.payment.created', { payment: record });
    return record;
  }

  /**
   * Apply a payment to one or more invoices.
   *
   * For each application, creates a payment line and updates the invoice's
   * paidAmount, balanceDue, and status. Also updates the vendor's ytdPayments.
   */
  async applyPayment(
    paymentId: string,
    applications: {
      invoiceId: string;
      amount: number;
      retentionAmount?: number;
      discountAmount?: number;
    }[],
  ): Promise<(APPaymentLine & CollectionMeta)[]> {
    // Validate payment exists
    const payment = await this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    const createdLines: (APPaymentLine & CollectionMeta)[] = [];

    for (const app of applications) {
      // Validate invoice exists
      const invoice = await this.invoices.get(app.invoiceId);
      if (!invoice) {
        throw new Error(`Invoice not found: ${app.invoiceId}`);
      }

      const retentionAmount = app.retentionAmount ?? 0;
      const discountAmount = app.discountAmount ?? 0;

      // Create payment line
      const line = await this.paymentLines.insert({
        paymentId,
        invoiceId: app.invoiceId,
        amount: round2(app.amount),
        retentionAmount: round2(retentionAmount),
        discountAmount: round2(discountAmount),
      } as APPaymentLine);

      createdLines.push(line);

      // Update invoice paidAmount and balanceDue
      const newPaidAmount = round2(invoice.paidAmount + app.amount);
      const newBalanceDue = round2(invoice.amount - newPaidAmount);

      let newStatus: InvoiceStatus = invoice.status;
      if (newBalanceDue <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      await this.invoices.update(app.invoiceId, {
        paidAmount: newPaidAmount,
        balanceDue: Math.max(newBalanceDue, 0),
        status: newStatus,
      } as Partial<APInvoice>);
    }

    // Update vendor ytdPayments
    const totalApplied = round2(
      applications.reduce((sum, a) => sum + a.amount, 0),
    );
    const vendor = await this.vendors.get(payment.vendorId);
    if (vendor) {
      const newYtdPayments = round2(vendor.ytdPayments + totalApplied);
      await this.vendors.update(vendor.id, {
        ytdPayments: newYtdPayments,
      } as Partial<Vendor>);
    }

    // Update payment status to processed
    await this.payments.update(paymentId, {
      status: 'processed',
    } as Partial<APPayment>);

    this.events.emit('ap.payment.applied', {
      paymentId,
      lines: createdLines,
    });

    return createdLines;
  }

  /**
   * Get a single payment by ID.
   */
  async getPayment(id: string): Promise<(APPayment & CollectionMeta) | null> {
    return this.payments.get(id);
  }

  /**
   * Get payments with optional filters, ordered by date descending.
   */
  async getPayments(filters?: {
    vendorId?: string;
    status?: PaymentStatus;
    entityId?: string;
  }): Promise<(APPayment & CollectionMeta)[]> {
    const q = this.payments.query();

    if (filters?.vendorId) {
      q.where('vendorId', '=', filters.vendorId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }

    q.orderBy('date', 'desc');
    return q.execute();
  }

  /**
   * Get payment lines for a payment.
   */
  async getPaymentLines(
    paymentId: string,
  ): Promise<(APPaymentLine & CollectionMeta)[]> {
    return this.paymentLines
      .query()
      .where('paymentId', '=', paymentId)
      .execute();
  }

  // ========================================================================
  // RETENTION TRACKING
  // ========================================================================

  /**
   * Create a retention record.
   * Defaults: releasedAmount=0, remainingAmount=amount, status='held'.
   */
  async createRetention(
    invoiceId: string,
    vendorId: string,
    jobId?: string,
    amount?: number,
    retentionPct?: number,
  ): Promise<Retention & CollectionMeta> {
    // Validate invoice exists
    const invoice = await this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    // Validate vendor exists
    const vendor = await this.vendors.get(vendorId);
    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }

    const retentionAmount = amount ?? 0;

    const record = await this.retentions.insert({
      invoiceId,
      vendorId,
      jobId,
      amount: round2(retentionAmount),
      retentionPct,
      releasedAmount: 0,
      remainingAmount: round2(retentionAmount),
      status: 'held',
    } as Retention);

    this.events.emit('ap.retention.created', { retention: record });
    return record;
  }

  /**
   * Release retention (partial or full).
   * Updates releasedAmount, remainingAmount, and status.
   */
  async releaseRetention(
    id: string,
    releaseAmount: number,
  ): Promise<Retention & CollectionMeta> {
    const existing = await this.retentions.get(id);
    if (!existing) {
      throw new Error(`Retention not found: ${id}`);
    }

    if (releaseAmount > existing.remainingAmount) {
      throw new Error(
        `Release amount (${releaseAmount}) exceeds remaining retention (${existing.remainingAmount}).`,
      );
    }

    const newReleasedAmount = round2(existing.releasedAmount + releaseAmount);
    const newRemainingAmount = round2(existing.remainingAmount - releaseAmount);

    let newStatus: RetentionStatus;
    if (newRemainingAmount <= 0) {
      newStatus = 'released';
    } else if (newReleasedAmount > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'held';
    }

    const updated = await this.retentions.update(id, {
      releasedAmount: newReleasedAmount,
      remainingAmount: Math.max(newRemainingAmount, 0),
      releaseDate: now(),
      status: newStatus,
    } as Partial<Retention>);

    this.events.emit('ap.retention.released', { retention: updated });
    return updated;
  }

  /**
   * Get retentions with optional filters.
   */
  async getRetentions(filters?: {
    vendorId?: string;
    jobId?: string;
    status?: RetentionStatus;
  }): Promise<(Retention & CollectionMeta)[]> {
    const q = this.retentions.query();

    if (filters?.vendorId) {
      q.where('vendorId', '=', filters.vendorId);
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
  // VENDOR AGING REPORT
  // ========================================================================

  /**
   * Get vendor aging report.
   *
   * For each vendor with open invoices (status not 'paid' or 'voided'),
   * computes current/30/60/90/120+ buckets based on dueDate (or
   * invoiceDate if no dueDate). Returns an array of AgingRow objects.
   */
  async getVendorAging(asOfDate?: string): Promise<AgingRow[]> {
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    const asOfTime = asOf.getTime();

    // Get all open invoices (not paid or voided)
    const allInvoices = await this.invoices.query().execute();
    const openInvoices = allInvoices.filter(
      (inv) => inv.status !== 'paid' && inv.status !== 'voided',
    );

    // Group by vendor
    const vendorMap = new Map<
      string,
      { current: number; days30: number; days60: number; days90: number; days120Plus: number; total: number }
    >();

    for (const inv of openInvoices) {
      const referenceDate = inv.dueDate || inv.invoiceDate;
      const refTime = new Date(referenceDate).getTime();
      const daysOld = Math.floor((asOfTime - refTime) / (1000 * 60 * 60 * 24));
      const balance = inv.balanceDue;

      if (!vendorMap.has(inv.vendorId)) {
        vendorMap.set(inv.vendorId, {
          current: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          days120Plus: 0,
          total: 0,
        });
      }

      const bucket = vendorMap.get(inv.vendorId)!;

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

    // Build result rows with vendor names
    const rows: AgingRow[] = [];

    for (const [vendorId, bucket] of vendorMap) {
      const vendor = await this.vendors.get(vendorId);
      const vendorName = vendor ? vendor.name : vendorId;

      rows.push({
        vendorId,
        vendorName,
        current: bucket.current,
        days30: bucket.days30,
        days60: bucket.days60,
        days90: bucket.days90,
        days120Plus: bucket.days120Plus,
        total: bucket.total,
      });
    }

    // Sort by vendor name
    rows.sort((a, b) => a.vendorName.localeCompare(b.vendorName));

    return rows;
  }

  // ========================================================================
  // 1099 REPORTING
  // ========================================================================

  /**
   * Get 1099 report for a given year.
   *
   * For each vendor marked as is1099, sums all processed payments within
   * the specified year. Returns an array of Report1099Row objects.
   */
  async get1099Report(year: string): Promise<Report1099Row[]> {
    // Get all 1099 vendors
    const vendors1099 = await this.vendors
      .query()
      .where('is1099', '=', true)
      .execute();

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const rows: Report1099Row[] = [];

    for (const vendor of vendors1099) {
      // Get all processed payments for this vendor within the year
      const vendorPayments = await this.payments
        .query()
        .where('vendorId', '=', vendor.id)
        .where('status', '=', 'processed')
        .where('date', '>=', yearStart)
        .where('date', '<=', yearEnd)
        .execute();

      const totalPayments = round2(
        vendorPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      );

      rows.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        taxId: vendor.taxId ?? '',
        form1099Type: vendor.form1099Type ?? 'NEC',
        totalPayments,
        address: vendor.address,
        city: vendor.city,
        state: vendor.state,
        zip: vendor.zip,
      });
    }

    // Sort by vendor name
    rows.sort((a, b) => a.vendorName.localeCompare(b.vendorName));

    return rows;
  }

  // ========================================================================
  // LIEN WAIVER TRACKING
  // ========================================================================

  /**
   * Create a lien waiver.
   */
  async createLienWaiver(data: {
    vendorId: string;
    jobId?: string;
    type: LienWaiverType;
    status?: LienWaiverStatus;
    amount?: number;
    throughDate?: string;
    receivedDate?: string;
    paymentId?: string;
    description?: string;
  }): Promise<LienWaiver & CollectionMeta> {
    // Validate vendor exists
    const vendor = await this.vendors.get(data.vendorId);
    if (!vendor) {
      throw new Error(`Vendor not found: ${data.vendorId}`);
    }

    const record = await this.lienWaivers.insert({
      vendorId: data.vendorId,
      jobId: data.jobId,
      type: data.type,
      status: data.status ?? 'requested',
      amount: data.amount,
      throughDate: data.throughDate,
      receivedDate: data.receivedDate,
      paymentId: data.paymentId,
      description: data.description,
    } as LienWaiver);

    this.events.emit('ap.lienWaiver.created', { lienWaiver: record });
    return record;
  }

  /**
   * Update an existing lien waiver.
   */
  async updateLienWaiver(
    id: string,
    changes: Partial<LienWaiver>,
  ): Promise<LienWaiver & CollectionMeta> {
    const existing = await this.lienWaivers.get(id);
    if (!existing) {
      throw new Error(`Lien waiver not found: ${id}`);
    }

    const updated = await this.lienWaivers.update(id, changes as Partial<LienWaiver>);
    this.events.emit('ap.lienWaiver.updated', { lienWaiver: updated });
    return updated;
  }

  /**
   * Get lien waivers with optional filters.
   */
  async getLienWaivers(
    vendorId?: string,
    jobId?: string,
  ): Promise<(LienWaiver & CollectionMeta)[]> {
    const q = this.lienWaivers.query();

    if (vendorId) {
      q.where('vendorId', '=', vendorId);
    }
    if (jobId) {
      q.where('jobId', '=', jobId);
    }

    return q.execute();
  }

  // ========================================================================
  // COMPLIANCE CERTIFICATE TRACKING
  // ========================================================================

  /**
   * Create a compliance certificate.
   */
  async createComplianceCert(data: {
    vendorId: string;
    certType: ComplianceCertType;
    policyNumber?: string;
    carrier?: string;
    agent?: string;
    effectiveDate?: string;
    expirationDate?: string;
    coverageAmount?: number;
    status?: ComplianceCertStatus;
    jobId?: string;
  }): Promise<ComplianceCert & CollectionMeta> {
    // Validate vendor exists
    const vendor = await this.vendors.get(data.vendorId);
    if (!vendor) {
      throw new Error(`Vendor not found: ${data.vendorId}`);
    }

    const record = await this.complianceCerts.insert({
      vendorId: data.vendorId,
      certType: data.certType,
      policyNumber: data.policyNumber,
      carrier: data.carrier,
      agent: data.agent,
      effectiveDate: data.effectiveDate,
      expirationDate: data.expirationDate,
      coverageAmount: data.coverageAmount,
      status: data.status ?? 'valid',
      jobId: data.jobId,
    } as ComplianceCert);

    this.events.emit('ap.complianceCert.created', { complianceCert: record });
    return record;
  }

  /**
   * Update an existing compliance certificate.
   */
  async updateComplianceCert(
    id: string,
    changes: Partial<ComplianceCert>,
  ): Promise<ComplianceCert & CollectionMeta> {
    const existing = await this.complianceCerts.get(id);
    if (!existing) {
      throw new Error(`Compliance certificate not found: ${id}`);
    }

    const updated = await this.complianceCerts.update(id, changes as Partial<ComplianceCert>);
    return updated;
  }

  /**
   * Get compliance certificates with optional vendor filter.
   */
  async getComplianceCerts(
    vendorId?: string,
  ): Promise<(ComplianceCert & CollectionMeta)[]> {
    const q = this.complianceCerts.query();

    if (vendorId) {
      q.where('vendorId', '=', vendorId);
    }

    return q.execute();
  }

  /**
   * Get compliance certificates expiring within N days from today.
   */
  async getExpiringCerts(
    daysAhead: number,
  ): Promise<(ComplianceCert & CollectionMeta)[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const certs = await this.complianceCerts
      .query()
      .where('status', '=', 'valid')
      .execute();

    // Filter to certs with expirationDate between today and futureDate
    return certs.filter((cert) => {
      if (!cert.expirationDate) return false;
      return cert.expirationDate >= todayStr && cert.expirationDate <= futureDateStr;
    });
  }

  // ========================================================================
  // VENDOR PAYMENT HISTORY
  // ========================================================================

  /**
   * Get all payments for a vendor, ordered by date descending.
   */
  async getVendorPaymentHistory(
    vendorId: string,
  ): Promise<(APPayment & CollectionMeta)[]> {
    // Validate vendor exists
    const vendor = await this.vendors.get(vendorId);
    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }

    return this.payments
      .query()
      .where('vendorId', '=', vendorId)
      .orderBy('date', 'desc')
      .execute();
  }
}
