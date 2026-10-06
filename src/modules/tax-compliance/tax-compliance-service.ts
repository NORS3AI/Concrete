/**
 * Concrete -- Tax & Regulatory Compliance Service (Phase 32)
 *
 * Multi-jurisdiction tax compliance: federal/state payroll tax filing,
 * 1099 generation, sales & use tax, contractor licenses, OCIP/CCIP,
 * EEO/AA, prevailing wage, certified payroll, audit trail, tax rate
 * management, and year-end processing.
 */
import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type FederalFormType = '941' | '940' | 'w2' | 'w3';
export type FilingStatus = 'draft' | 'pending_review' | 'approved' | 'filed' | 'rejected' | 'amended';
export type JurisdictionLevel = 'federal' | 'state' | 'local';
export type TaxType = 'income' | 'fica_ss' | 'fica_med' | 'futa' | 'suta' | 'sales' | 'use' | 'other';
export type Form1099Type = 'NEC' | 'MISC' | 'INT' | 'DIV' | 'R' | 'S' | 'K1';
export type Form1099Status = 'draft' | 'generated' | 'reviewed' | 'filed' | 'corrected';
export type LicenseStatus = 'active' | 'expiring_soon' | 'expired' | 'pending' | 'suspended';
export type InsuranceProgramType = 'OCIP' | 'CCIP';
export type InsuranceProgramStatus = 'enrolled' | 'pending' | 'active' | 'closed' | 'audit';
export type ComplianceReportStatus = 'draft' | 'submitted' | 'accepted' | 'rejected';
export type CertifiedPayrollStatus = 'draft' | 'certified' | 'submitted' | 'accepted' | 'rejected';
export type AuditAction = 'create' | 'update' | 'delete' | 'file' | 'approve' | 'reject' | 'generate' | 'import' | 'export';
export type TaxRateSource = 'manual' | 'import' | 'api' | 'scheduled';
export type YearEndStep = 'review_payroll' | 'reconcile_taxes' | 'generate_w2' | 'generate_w3' | 'generate_1099' | 'file_annual' | 'archive' | 'rollover';
export type YearEndStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface FederalFiling {
  [key: string]: unknown;
  filingId: string;
  formType: FederalFormType;
  year: number;
  quarter?: number;
  period: string;
  status: FilingStatus;
  ein: string;
  totalWages: number;
  totalFederalTax: number;
  totalFicaSS: number;
  totalFicaMed: number;
  totalFUTA: number;
  employeeCount: number;
  dueDate: string;
  filedDate?: string;
  confirmationNumber?: string;
  preparedBy: string;
  reviewedBy?: string;
  notes?: string;
}

export interface StateFiling {
  [key: string]: unknown;
  filingId: string;
  state: string;
  formName: string;
  year: number;
  quarter?: number;
  period: string;
  status: FilingStatus;
  stateEIN: string;
  totalWages: number;
  totalStateTax: number;
  totalSUTA: number;
  employeeCount: number;
  dueDate: string;
  filedDate?: string;
  confirmationNumber?: string;
  preparedBy: string;
  notes?: string;
}

export interface MultiStateWithholding {
  [key: string]: unknown;
  recordId: string;
  employeeId: string;
  employeeName: string;
  residentState: string;
  workState: string;
  year: number;
  quarter: number;
  wagesEarned: number;
  residentWithholding: number;
  workStateWithholding: number;
  creditApplied: number;
  reciprocityApplies: boolean;
  reciprocityAgreementId?: string;
  notes?: string;
}

export interface ReciprocityAgreement {
  [key: string]: unknown;
  agreementId: string;
  homeState: string;
  workState: string;
  effectiveDate: string;
  expirationDate?: string;
  exemptionType: string;
  formRequired: string;
  active: boolean;
  notes?: string;
}

export interface Form1099 {
  [key: string]: unknown;
  formId: string;
  type: Form1099Type;
  year: number;
  status: Form1099Status;
  payerEIN: string;
  payerName: string;
  recipientTIN: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientState: string;
  recipientZip: string;
  amount: number;
  federalTaxWithheld: number;
  stateTaxWithheld: number;
  stateIncome: number;
  state: string;
  generatedDate?: string;
  filedDate?: string;
  corrected: boolean;
  originalFormId?: string;
  notes?: string;
}

export interface SalesTaxRecord {
  [key: string]: unknown;
  recordId: string;
  jurisdiction: string;
  jurisdictionLevel: JurisdictionLevel;
  state: string;
  county?: string;
  city?: string;
  taxType: 'sales' | 'use';
  period: string;
  year: number;
  month: number;
  taxableAmount: number;
  exemptAmount: number;
  taxRate: number;
  taxDue: number;
  taxPaid: number;
  status: FilingStatus;
  dueDate: string;
  filedDate?: string;
  notes?: string;
}

export interface ContractorLicense {
  [key: string]: unknown;
  licenseId: string;
  entityId: string;
  entityName: string;
  state: string;
  licenseNumber: string;
  licenseType: string;
  classification: string;
  issueDate: string;
  expirationDate: string;
  status: LicenseStatus;
  renewalDate?: string;
  bondRequired: boolean;
  bondAmount?: number;
  insuranceRequired: boolean;
  notes?: string;
}

export interface OCIPCCIPRecord {
  [key: string]: unknown;
  programId: string;
  programType: InsuranceProgramType;
  projectId: string;
  projectName: string;
  carrier: string;
  policyNumber: string;
  status: InsuranceProgramStatus;
  effectiveDate: string;
  expirationDate: string;
  enrolledContractors: number;
  totalPremium: number;
  totalClaims: number;
  lossRatio: number;
  lastAuditDate?: string;
  nextAuditDate?: string;
  notes?: string;
}

export interface EEOAAReport {
  [key: string]: unknown;
  reportId: string;
  reportType: string;
  year: number;
  period: string;
  projectId?: string;
  projectName?: string;
  status: ComplianceReportStatus;
  totalEmployees: number;
  minorityCount: number;
  femaleCount: number;
  veteranCount: number;
  disabledCount: number;
  minorityPct: number;
  femalePct: number;
  goalMet: boolean;
  submittedDate?: string;
  dueDate: string;
  preparedBy: string;
  notes?: string;
}

export interface PrevailingWageReport {
  [key: string]: unknown;
  reportId: string;
  projectId: string;
  projectName: string;
  jurisdiction: string;
  state: string;
  wageDecisionNumber: string;
  classification: string;
  year: number;
  weekEnding: string;
  status: ComplianceReportStatus;
  totalWorkers: number;
  totalHours: number;
  totalWages: number;
  totalFringe: number;
  requiredRate: number;
  actualRate: number;
  compliant: boolean;
  submittedDate?: string;
  notes?: string;
}

export interface CertifiedPayroll {
  [key: string]: unknown;
  reportId: string;
  projectId: string;
  projectName: string;
  state: string;
  format: string;
  weekEnding: string;
  contractorName: string;
  contractorEIN: string;
  year: number;
  status: CertifiedPayrollStatus;
  totalWorkers: number;
  totalHours: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  certifiedBy: string;
  certifiedDate?: string;
  submittedDate?: string;
  notes?: string;
}

export interface TaxAuditEntry {
  [key: string]: unknown;
  entryId: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityDescription: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
  sessionId?: string;
  notes?: string;
}

export interface TaxRateRecord {
  [key: string]: unknown;
  rateId: string;
  jurisdiction: string;
  jurisdictionLevel: JurisdictionLevel;
  state: string;
  county?: string;
  city?: string;
  taxType: TaxType;
  rate: number;
  wageBase?: number;
  effectiveDate: string;
  expirationDate?: string;
  source: TaxRateSource;
  lastUpdated: string;
  updatedBy: string;
  active: boolean;
  notes?: string;
}

export interface YearEndProcess {
  [key: string]: unknown;
  processId: string;
  year: number;
  step: YearEndStep;
  status: YearEndStatus;
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  recordsProcessed: number;
  errors: number;
  warnings: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ts(): string { return new Date().toISOString(); }
function today(): string { return new Date().toISOString().split('T')[0]; }

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TaxComplianceService {
  constructor(
    private federalFilings: Collection<FederalFiling>,
    private stateFilings: Collection<StateFiling>,
    private multiStateRecords: Collection<MultiStateWithholding>,
    private reciprocityAgreements: Collection<ReciprocityAgreement>,
    private form1099s: Collection<Form1099>,
    private salesTaxRecords: Collection<SalesTaxRecord>,
    private licenses: Collection<ContractorLicense>,
    private ocipCcipRecords: Collection<OCIPCCIPRecord>,
    private eeoaaReports: Collection<EEOAAReport>,
    private prevailingWageReports: Collection<PrevailingWageReport>,
    private certifiedPayrolls: Collection<CertifiedPayroll>,
    private auditEntries: Collection<TaxAuditEntry>,
    private taxRates: Collection<TaxRateRecord>,
    private yearEndProcesses: Collection<YearEndProcess>,
    private events: EventBus,
  ) {}

  // --- Federal Filings ---------------------------------------------------

  async createFederalFiling(data: Omit<FederalFiling, 'status'> & { status?: FilingStatus }): Promise<FederalFiling & CollectionMeta> {
    const f = await this.federalFilings.insert({ ...data, status: data.status ?? 'draft', quarter: data.quarter ?? 0, filedDate: '', confirmationNumber: '', reviewedBy: '', notes: data.notes ?? '' });
    this.events.emit('tax.federal.created', { filing: f });
    await this.logAudit('create', 'federal_filing', f.id, `Created ${data.formType} filing for ${data.period}`, data.preparedBy);
    return f;
  }

  async updateFederalFiling(id: string, updates: Partial<FederalFiling>): Promise<FederalFiling & CollectionMeta> {
    const f = await this.federalFilings.update(id, updates);
    this.events.emit('tax.federal.updated', { filing: f });
    return f;
  }

  async fileFederalFiling(id: string, confirmationNumber: string, filedBy: string): Promise<FederalFiling & CollectionMeta> {
    const f = await this.federalFilings.update(id, { status: 'filed' as FilingStatus, filedDate: today(), confirmationNumber });
    this.events.emit('tax.federal.filed', { filing: f });
    await this.logAudit('file', 'federal_filing', id, `Filed ${f.formType} - confirmation: ${confirmationNumber}`, filedBy);
    return f;
  }

  async listFederalFilings(filters?: { formType?: FederalFormType; status?: FilingStatus; year?: number }): Promise<(FederalFiling & CollectionMeta)[]> {
    const q = this.federalFilings.query();
    if (filters?.formType) q.where('formType', '=', filters.formType);
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.year) q.where('year', '=', filters.year);
    q.orderBy('dueDate', 'desc');
    return q.execute();
  }

  // --- State Filings ------------------------------------------------------

  async createStateFiling(data: Omit<StateFiling, 'status'> & { status?: FilingStatus }): Promise<StateFiling & CollectionMeta> {
    const f = await this.stateFilings.insert({ ...data, status: data.status ?? 'draft', quarter: data.quarter ?? 0, filedDate: '', confirmationNumber: '', notes: data.notes ?? '' });
    this.events.emit('tax.state.created', { filing: f });
    await this.logAudit('create', 'state_filing', f.id, `Created ${data.state} filing for ${data.period}`, data.preparedBy);
    return f;
  }

  async updateStateFiling(id: string, updates: Partial<StateFiling>): Promise<StateFiling & CollectionMeta> {
    return this.stateFilings.update(id, updates);
  }

  async fileStateFiling(id: string, confirmationNumber: string, filedBy: string): Promise<StateFiling & CollectionMeta> {
    const f = await this.stateFilings.update(id, { status: 'filed' as FilingStatus, filedDate: today(), confirmationNumber });
    this.events.emit('tax.state.filed', { filing: f });
    await this.logAudit('file', 'state_filing', id, `Filed ${f.state} state filing - confirmation: ${confirmationNumber}`, filedBy);
    return f;
  }

  async listStateFilings(filters?: { state?: string; status?: FilingStatus; year?: number }): Promise<(StateFiling & CollectionMeta)[]> {
    const q = this.stateFilings.query();
    if (filters?.state) q.where('state', '=', filters.state);
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.year) q.where('year', '=', filters.year);
    q.orderBy('dueDate', 'desc');
    return q.execute();
  }

  // --- Multi-State Withholding --------------------------------------------

  async addMultiStateRecord(data: MultiStateWithholding): Promise<MultiStateWithholding & CollectionMeta> {
    return this.multiStateRecords.insert({ ...data, reciprocityAgreementId: data.reciprocityAgreementId ?? '', notes: data.notes ?? '' });
  }

  async listMultiStateRecords(filters?: { employeeId?: string; workState?: string; year?: number; quarter?: number }): Promise<(MultiStateWithholding & CollectionMeta)[]> {
    const q = this.multiStateRecords.query();
    if (filters?.employeeId) q.where('employeeId', '=', filters.employeeId);
    if (filters?.workState) q.where('workState', '=', filters.workState);
    if (filters?.year) q.where('year', '=', filters.year);
    if (filters?.quarter) q.where('quarter', '=', filters.quarter);
    q.orderBy('employeeName', 'asc');
    return q.execute();
  }

  // --- Reciprocity Agreements ---------------------------------------------

  async addReciprocityAgreement(data: ReciprocityAgreement): Promise<ReciprocityAgreement & CollectionMeta> {
    return this.reciprocityAgreements.insert({ ...data, expirationDate: data.expirationDate ?? '', active: data.active ?? true, notes: data.notes ?? '' });
  }

  async listReciprocityAgreements(activeOnly?: boolean): Promise<(ReciprocityAgreement & CollectionMeta)[]> {
    const q = this.reciprocityAgreements.query();
    if (activeOnly) q.where('active', '=', true);
    q.orderBy('homeState', 'asc');
    return q.execute();
  }

  async checkReciprocity(homeState: string, workState: string): Promise<(ReciprocityAgreement & CollectionMeta) | null> {
    const results = await this.reciprocityAgreements.query().where('homeState', '=', homeState).where('workState', '=', workState).where('active', '=', true).execute();
    return results.length > 0 ? results[0] : null;
  }

  // --- 1099 Generation ----------------------------------------------------

  async createForm1099(data: Omit<Form1099, 'status'> & { status?: Form1099Status }): Promise<Form1099 & CollectionMeta> {
    const f = await this.form1099s.insert({ ...data, status: data.status ?? 'draft', generatedDate: '', filedDate: '', corrected: data.corrected ?? false, originalFormId: data.originalFormId ?? '', notes: data.notes ?? '' });
    this.events.emit('tax.1099.created', { form: f });
    await this.logAudit('generate', '1099', f.id, `Generated 1099-${data.type} for ${data.recipientName}`, 'system');
    return f;
  }

  async updateForm1099(id: string, updates: Partial<Form1099>): Promise<Form1099 & CollectionMeta> {
    return this.form1099s.update(id, updates);
  }

  async fileForm1099(id: string, filedBy: string): Promise<Form1099 & CollectionMeta> {
    const f = await this.form1099s.update(id, { status: 'filed' as Form1099Status, filedDate: today() });
    this.events.emit('tax.1099.filed', { form: f });
    await this.logAudit('file', '1099', id, `Filed 1099-${f.type} for ${f.recipientName}`, filedBy);
    return f;
  }

  async listForm1099s(filters?: { type?: Form1099Type; status?: Form1099Status; year?: number }): Promise<(Form1099 & CollectionMeta)[]> {
    const q = this.form1099s.query();
    if (filters?.type) q.where('type', '=', filters.type);
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.year) q.where('year', '=', filters.year);
    q.orderBy('recipientName', 'asc');
    return q.execute();
  }

  // --- Sales & Use Tax ----------------------------------------------------

  async addSalesTaxRecord(data: Omit<SalesTaxRecord, 'status'> & { status?: FilingStatus }): Promise<SalesTaxRecord & CollectionMeta> {
    return this.salesTaxRecords.insert({ ...data, status: data.status ?? 'draft', county: data.county ?? '', city: data.city ?? '', filedDate: '', notes: data.notes ?? '' });
  }

  async updateSalesTaxRecord(id: string, updates: Partial<SalesTaxRecord>): Promise<SalesTaxRecord & CollectionMeta> {
    return this.salesTaxRecords.update(id, updates);
  }

  async listSalesTaxRecords(filters?: { state?: string; taxType?: 'sales' | 'use'; year?: number; status?: FilingStatus }): Promise<(SalesTaxRecord & CollectionMeta)[]> {
    const q = this.salesTaxRecords.query();
    if (filters?.state) q.where('state', '=', filters.state);
    if (filters?.taxType) q.where('taxType', '=', filters.taxType);
    if (filters?.year) q.where('year', '=', filters.year);
    if (filters?.status) q.where('status', '=', filters.status);
    q.orderBy('dueDate', 'desc');
    return q.execute();
  }

  // --- Contractor Licenses ------------------------------------------------

  async addLicense(data: ContractorLicense): Promise<ContractorLicense & CollectionMeta> {
    return this.licenses.insert({ ...data, renewalDate: data.renewalDate ?? '', bondAmount: data.bondAmount ?? 0, notes: data.notes ?? '' });
  }

  async updateLicense(id: string, updates: Partial<ContractorLicense>): Promise<ContractorLicense & CollectionMeta> {
    return this.licenses.update(id, updates);
  }

  async listLicenses(filters?: { state?: string; status?: LicenseStatus; entityId?: string }): Promise<(ContractorLicense & CollectionMeta)[]> {
    const q = this.licenses.query();
    if (filters?.state) q.where('state', '=', filters.state);
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.entityId) q.where('entityId', '=', filters.entityId);
    q.orderBy('expirationDate', 'asc');
    return q.execute();
  }

  // --- OCIP/CCIP ----------------------------------------------------------

  async addOCIPCCIP(data: OCIPCCIPRecord): Promise<OCIPCCIPRecord & CollectionMeta> {
    return this.ocipCcipRecords.insert({ ...data, lastAuditDate: data.lastAuditDate ?? '', nextAuditDate: data.nextAuditDate ?? '', notes: data.notes ?? '' });
  }

  async updateOCIPCCIP(id: string, updates: Partial<OCIPCCIPRecord>): Promise<OCIPCCIPRecord & CollectionMeta> {
    return this.ocipCcipRecords.update(id, updates);
  }

  async listOCIPCCIP(filters?: { programType?: InsuranceProgramType; status?: InsuranceProgramStatus; projectId?: string }): Promise<(OCIPCCIPRecord & CollectionMeta)[]> {
    const q = this.ocipCcipRecords.query();
    if (filters?.programType) q.where('programType', '=', filters.programType);
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.projectId) q.where('projectId', '=', filters.projectId);
    q.orderBy('projectName', 'asc');
    return q.execute();
  }

  // --- EEO/AA Compliance --------------------------------------------------

  async createEEOAAReport(data: Omit<EEOAAReport, 'status'> & { status?: ComplianceReportStatus }): Promise<EEOAAReport & CollectionMeta> {
    return this.eeoaaReports.insert({ ...data, status: data.status ?? 'draft', projectId: data.projectId ?? '', projectName: data.projectName ?? '', submittedDate: '', notes: data.notes ?? '' });
  }

  async updateEEOAAReport(id: string, updates: Partial<EEOAAReport>): Promise<EEOAAReport & CollectionMeta> {
    return this.eeoaaReports.update(id, updates);
  }

  async submitEEOAAReport(id: string, submittedBy: string): Promise<EEOAAReport & CollectionMeta> {
    const r = await this.eeoaaReports.update(id, { status: 'submitted' as ComplianceReportStatus, submittedDate: today() });
    this.events.emit('tax.eeoaa.submitted', { report: r });
    await this.logAudit('file', 'eeoaa_report', id, `Submitted EEO/AA report for ${r.period}`, submittedBy);
    return r;
  }

  async listEEOAAReports(filters?: { year?: number; status?: ComplianceReportStatus; projectId?: string }): Promise<(EEOAAReport & CollectionMeta)[]> {
    const q = this.eeoaaReports.query();
    if (filters?.year) q.where('year', '=', filters.year);
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.projectId) q.where('projectId', '=', filters.projectId);
    q.orderBy('dueDate', 'desc');
    return q.execute();
  }

  // --- Prevailing Wage ----------------------------------------------------

  async createPrevailingWageReport(data: Omit<PrevailingWageReport, 'status'> & { status?: ComplianceReportStatus }): Promise<PrevailingWageReport & CollectionMeta> {
    return this.prevailingWageReports.insert({ ...data, status: data.status ?? 'draft', submittedDate: '', notes: data.notes ?? '' });
  }

  async updatePrevailingWageReport(id: string, updates: Partial<PrevailingWageReport>): Promise<PrevailingWageReport & CollectionMeta> {
    return this.prevailingWageReports.update(id, updates);
  }

  async listPrevailingWageReports(filters?: { projectId?: string; state?: string; year?: number; status?: ComplianceReportStatus }): Promise<(PrevailingWageReport & CollectionMeta)[]> {
    const q = this.prevailingWageReports.query();
    if (filters?.projectId) q.where('projectId', '=', filters.projectId);
    if (filters?.state) q.where('state', '=', filters.state);
    if (filters?.year) q.where('year', '=', filters.year);
    if (filters?.status) q.where('status', '=', filters.status);
    q.orderBy('weekEnding', 'desc');
    return q.execute();
  }

  // --- Certified Payroll --------------------------------------------------

  async createCertifiedPayroll(data: Omit<CertifiedPayroll, 'status'> & { status?: CertifiedPayrollStatus }): Promise<CertifiedPayroll & CollectionMeta> {
    return this.certifiedPayrolls.insert({ ...data, status: data.status ?? 'draft', certifiedDate: '', submittedDate: '', notes: data.notes ?? '' });
  }

  async updateCertifiedPayroll(id: string, updates: Partial<CertifiedPayroll>): Promise<CertifiedPayroll & CollectionMeta> {
    return this.certifiedPayrolls.update(id, updates);
  }

  async certifyPayroll(id: string, certifiedBy: string): Promise<CertifiedPayroll & CollectionMeta> {
    const r = await this.certifiedPayrolls.update(id, { status: 'certified' as CertifiedPayrollStatus, certifiedBy, certifiedDate: today() });
    this.events.emit('tax.certifiedPayroll.certified', { report: r });
    await this.logAudit('approve', 'certified_payroll', id, `Certified payroll for ${r.projectName} week ending ${r.weekEnding}`, certifiedBy);
    return r;
  }

  async listCertifiedPayrolls(filters?: { projectId?: string; state?: string; year?: number; status?: CertifiedPayrollStatus }): Promise<(CertifiedPayroll & CollectionMeta)[]> {
    const q = this.certifiedPayrolls.query();
    if (filters?.projectId) q.where('projectId', '=', filters.projectId);
    if (filters?.state) q.where('state', '=', filters.state);
    if (filters?.year) q.where('year', '=', filters.year);
    if (filters?.status) q.where('status', '=', filters.status);
    q.orderBy('weekEnding', 'desc');
    return q.execute();
  }

  // --- Audit Trail --------------------------------------------------------

  async logAudit(action: AuditAction, entityType: string, entityId: string, description: string, userId: string): Promise<TaxAuditEntry & CollectionMeta> {
    return this.auditEntries.insert({ entryId: `aud-${Date.now()}`, timestamp: ts(), userId, userName: userId, action, entityType, entityId, entityDescription: description, previousValue: '', newValue: '', ipAddress: '', sessionId: '', notes: '' });
  }

  async listAuditEntries(filters?: { entityType?: string; action?: AuditAction; userId?: string; startDate?: string; endDate?: string }): Promise<(TaxAuditEntry & CollectionMeta)[]> {
    const q = this.auditEntries.query();
    if (filters?.entityType) q.where('entityType', '=', filters.entityType);
    if (filters?.action) q.where('action', '=', filters.action);
    if (filters?.userId) q.where('userId', '=', filters.userId);
    q.orderBy('timestamp', 'desc');
    return q.execute();
  }

  // --- Tax Rates ----------------------------------------------------------

  async addTaxRate(data: TaxRateRecord): Promise<TaxRateRecord & CollectionMeta> {
    const r = await this.taxRates.insert({ ...data, county: data.county ?? '', city: data.city ?? '', wageBase: data.wageBase ?? 0, expirationDate: data.expirationDate ?? '', lastUpdated: ts(), notes: data.notes ?? '' });
    this.events.emit('tax.rate.updated', { rate: r });
    return r;
  }

  async updateTaxRate(id: string, updates: Partial<TaxRateRecord>): Promise<TaxRateRecord & CollectionMeta> {
    return this.taxRates.update(id, { ...updates, lastUpdated: ts() });
  }

  async listTaxRates(filters?: { state?: string; taxType?: TaxType; jurisdictionLevel?: JurisdictionLevel; activeOnly?: boolean }): Promise<(TaxRateRecord & CollectionMeta)[]> {
    const q = this.taxRates.query();
    if (filters?.state) q.where('state', '=', filters.state);
    if (filters?.taxType) q.where('taxType', '=', filters.taxType);
    if (filters?.jurisdictionLevel) q.where('jurisdictionLevel', '=', filters.jurisdictionLevel);
    if (filters?.activeOnly) q.where('active', '=', true);
    q.orderBy('jurisdiction', 'asc');
    return q.execute();
  }

  async importTaxRates(rates: TaxRateRecord[], importedBy: string): Promise<number> {
    let count = 0;
    for (const rate of rates) {
      await this.taxRates.insert({ ...rate, source: 'import' as TaxRateSource, lastUpdated: ts(), updatedBy: importedBy });
      count++;
    }
    await this.logAudit('import', 'tax_rates', 'bulk', `Imported ${count} tax rates`, importedBy);
    this.events.emit('tax.rates.imported', { count });
    return count;
  }

  // --- Year-End Processing ------------------------------------------------

  async initYearEnd(year: number, initiatedBy: string): Promise<(YearEndProcess & CollectionMeta)[]> {
    const steps: YearEndStep[] = ['review_payroll', 'reconcile_taxes', 'generate_w2', 'generate_w3', 'generate_1099', 'file_annual', 'archive', 'rollover'];
    const results: (YearEndProcess & CollectionMeta)[] = [];
    for (const step of steps) {
      const p = await this.yearEndProcesses.insert({ processId: `ye-${year}-${step}`, year, step, status: 'not_started' as YearEndStatus, recordsProcessed: 0, errors: 0, warnings: 0, notes: '' });
      results.push(p);
    }
    await this.logAudit('create', 'year_end', `ye-${year}`, `Initiated year-end processing for ${year}`, initiatedBy);
    this.events.emit('tax.yearEnd.initiated', { year });
    return results;
  }

  async startYearEndStep(id: string, startedBy: string): Promise<YearEndProcess & CollectionMeta> {
    return this.yearEndProcesses.update(id, { status: 'in_progress' as YearEndStatus, startedAt: ts(), completedBy: startedBy });
  }

  async completeYearEndStep(id: string, recordsProcessed: number, errors: number, warnings: number, completedBy: string): Promise<YearEndProcess & CollectionMeta> {
    const p = await this.yearEndProcesses.update(id, { status: 'completed' as YearEndStatus, completedAt: ts(), completedBy, recordsProcessed, errors, warnings });
    this.events.emit('tax.yearEnd.stepCompleted', { process: p });
    return p;
  }

  async listYearEndSteps(year: number): Promise<(YearEndProcess & CollectionMeta)[]> {
    return this.yearEndProcesses.query().where('year', '=', year).orderBy('processId', 'asc').execute();
  }
}
