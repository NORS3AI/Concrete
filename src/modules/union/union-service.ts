/**
 * Concrete -- Union & Prevailing Wage Service
 *
 * Core service layer for the Union module (Phase 7). Provides union
 * master file CRUD, rate table management with effective dates and line
 * items, fringe benefit configuration, prevailing wage table management,
 * certified payroll generation (WH-347), apprentice tracking and ratio
 * compliance, remittance report generation, and rate lookup utilities.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type UnionStatus = 'active' | 'inactive';
export type RateTableStatus = 'active' | 'expired';
export type RateLineCategory = 'base_wage' | 'fringe' | 'vacation' | 'training' | 'pension' | 'annuity' | 'health' | 'other';
export type RateLineMethod = 'hourly' | 'percent' | 'flat';
export type RateLinePayableTo = 'employee' | 'fund';
export type FringeMethod = 'hourly' | 'percent';
export type FringePayableTo = 'employee' | 'fund';
export type FringeAllocationMethod = 'cash' | 'plan' | 'split';
export type PrevailingWageProjectType = 'federal' | 'state' | 'local';
export type PrevailingWageSource = 'davis_bacon' | 'state' | 'local';
export type CertifiedPayrollStatus = 'draft' | 'submitted' | 'approved';
export type ApprenticeStatus = 'active' | 'completed' | 'terminated';
export type RemittanceStatus = 'draft' | 'submitted' | 'paid';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Union {
  [key: string]: unknown;
  name: string;
  localNumber: string;
  trade: string;
  jurisdiction?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status: UnionStatus;
}

export interface RateTable {
  [key: string]: unknown;
  unionId: string;
  name: string;
  effectiveDate: string;
  expirationDate?: string;
  classification: string;
  journeymanRate?: number;
  apprenticePct?: number;
  status: RateTableStatus;
}

export interface RateTableLine {
  [key: string]: unknown;
  rateTableId: string;
  category: RateLineCategory;
  description?: string;
  rate: number;
  method: RateLineMethod;
  payableTo: RateLinePayableTo;
  fundName?: string;
}

export interface FringeBenefit {
  [key: string]: unknown;
  unionId: string;
  name: string;
  rate: number;
  method: FringeMethod;
  payableTo: FringePayableTo;
  allocationMethod: FringeAllocationMethod;
  fundName?: string;
  fundAddress?: string;
  fundAccountNumber?: string;
}

export interface PrevailingWage {
  [key: string]: unknown;
  jurisdiction: string;
  state: string;
  county?: string;
  projectType: PrevailingWageProjectType;
  classification: string;
  trade: string;
  baseRate: number;
  fringeRate: number;
  totalRate: number;
  effectiveDate: string;
  expirationDate?: string;
  source: PrevailingWageSource;
}

export interface CertifiedPayroll {
  [key: string]: unknown;
  jobId: string;
  weekEndingDate: string;
  contractorName: string;
  projectName: string;
  projectNumber?: string;
  reportNumber?: string;
  status: CertifiedPayrollStatus;
  totalGross: number;
  totalFringe: number;
  totalNet: number;
}

export interface Apprentice {
  [key: string]: unknown;
  employeeId: string;
  unionId: string;
  trade: string;
  startDate: string;
  periodNumber: number;
  totalPeriods: number;
  currentRatio?: number;
  requiredRatio?: number;
  status: ApprenticeStatus;
}

export interface Remittance {
  [key: string]: unknown;
  unionId: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  totalHours: number;
  totalAmount: number;
  status: RemittanceStatus;
  employeeCount?: number;
}

// ---------------------------------------------------------------------------
// Report / Lookup Types
// ---------------------------------------------------------------------------

export interface RateLookupResult {
  rateTableId: string;
  rateTableName: string;
  classification: string;
  effectiveDate: string;
  expirationDate?: string;
  journeymanRate: number;
  lines: (RateTableLine & CollectionMeta)[];
  totalHourlyRate: number;
  totalFringeRate: number;
}

export interface ApprenticeComplianceResult {
  apprenticeId: string;
  employeeId: string;
  unionId: string;
  trade: string;
  currentRatio: number;
  requiredRatio: number;
  isCompliant: boolean;
  periodNumber: number;
  totalPeriods: number;
}

export interface RemittanceSummaryRow {
  unionId: string;
  unionName: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  totalAmount: number;
  employeeCount: number;
  status: RemittanceStatus;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// UnionService
// ---------------------------------------------------------------------------

export class UnionService {
  constructor(
    private unions: Collection<Union>,
    private rateTables: Collection<RateTable>,
    private rateTableLines: Collection<RateTableLine>,
    private fringeBenefits: Collection<FringeBenefit>,
    private prevailingWages: Collection<PrevailingWage>,
    private certifiedPayrolls: Collection<CertifiedPayroll>,
    private apprentices: Collection<Apprentice>,
    private remittances: Collection<Remittance>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // UNION CRUD
  // ========================================================================

  /**
   * Create a new union master record.
   * Validates that localNumber is unique. Defaults: status='active'.
   */
  async createUnion(data: {
    name: string;
    localNumber: string;
    trade: string;
    jurisdiction?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    status?: UnionStatus;
  }): Promise<Union & CollectionMeta> {
    // Validate localNumber uniqueness
    const existing = await this.getUnionByLocalNumber(data.localNumber);
    if (existing) {
      throw new Error(`Union with local number "${data.localNumber}" already exists.`);
    }

    const record = await this.unions.insert({
      name: data.name,
      localNumber: data.localNumber,
      trade: data.trade,
      jurisdiction: data.jurisdiction,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      status: data.status ?? 'active',
    } as Union);

    this.events.emit('union.created', { union: record });
    return record;
  }

  /**
   * Update an existing union.
   */
  async updateUnion(
    id: string,
    changes: Partial<Union>,
  ): Promise<Union & CollectionMeta> {
    const existing = await this.unions.get(id);
    if (!existing) {
      throw new Error(`Union not found: ${id}`);
    }

    // If localNumber is changing, validate uniqueness
    if (changes.localNumber && changes.localNumber !== existing.localNumber) {
      const duplicate = await this.getUnionByLocalNumber(changes.localNumber);
      if (duplicate) {
        throw new Error(`Union with local number "${changes.localNumber}" already exists.`);
      }
    }

    const updated = await this.unions.update(id, changes as Partial<Union>);
    this.events.emit('union.updated', { union: updated });
    return updated;
  }

  /**
   * Soft-delete a union.
   * Refuses deletion if the union has rate tables or active apprentices.
   */
  async deleteUnion(id: string): Promise<void> {
    const existing = await this.unions.get(id);
    if (!existing) {
      throw new Error(`Union not found: ${id}`);
    }

    // Check for rate tables
    const rateTableCount = await this.rateTables
      .query()
      .where('unionId', '=', id)
      .count();

    if (rateTableCount > 0) {
      throw new Error(
        `Cannot delete union: it has ${rateTableCount} rate table(s). Set union to inactive instead.`,
      );
    }

    // Check for active apprentices
    const apprenticeCount = await this.apprentices
      .query()
      .where('unionId', '=', id)
      .where('status', '=', 'active')
      .count();

    if (apprenticeCount > 0) {
      throw new Error(
        `Cannot delete union: it has ${apprenticeCount} active apprentice(s). Set union to inactive instead.`,
      );
    }

    await this.unions.remove(id);
    this.events.emit('union.deleted', { unionId: id });
  }

  /**
   * Get a single union by ID.
   */
  async getUnion(id: string): Promise<(Union & CollectionMeta) | null> {
    return this.unions.get(id);
  }

  /**
   * Get unions with optional filters, ordered by name.
   */
  async getUnions(filters?: {
    status?: UnionStatus;
    trade?: string;
    jurisdiction?: string;
  }): Promise<(Union & CollectionMeta)[]> {
    const q = this.unions.query();

    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.trade) {
      q.where('trade', '=', filters.trade);
    }
    if (filters?.jurisdiction) {
      q.where('jurisdiction', '=', filters.jurisdiction);
    }

    q.orderBy('name', 'asc');
    return q.execute();
  }

  /**
   * Lookup a union by local number.
   */
  async getUnionByLocalNumber(localNumber: string): Promise<(Union & CollectionMeta) | null> {
    const result = await this.unions
      .query()
      .where('localNumber', '=', localNumber)
      .limit(1)
      .first();
    return result;
  }

  // ========================================================================
  // RATE TABLE MANAGEMENT
  // ========================================================================

  /**
   * Create a new rate table.
   * Validates union exists. Defaults: status='active'.
   */
  async createRateTable(data: {
    unionId: string;
    name: string;
    effectiveDate: string;
    expirationDate?: string;
    classification: string;
    journeymanRate?: number;
    apprenticePct?: number;
    status?: RateTableStatus;
  }): Promise<RateTable & CollectionMeta> {
    // Validate union exists
    const union = await this.unions.get(data.unionId);
    if (!union) {
      throw new Error(`Union not found: ${data.unionId}`);
    }

    const record = await this.rateTables.insert({
      unionId: data.unionId,
      name: data.name,
      effectiveDate: data.effectiveDate,
      expirationDate: data.expirationDate,
      classification: data.classification,
      journeymanRate: data.journeymanRate !== undefined ? round2(data.journeymanRate) : undefined,
      apprenticePct: data.apprenticePct,
      status: data.status ?? 'active',
    } as RateTable);

    this.events.emit('union.rateTable.created', { rateTable: record });
    return record;
  }

  /**
   * Update an existing rate table.
   */
  async updateRateTable(
    id: string,
    changes: Partial<RateTable>,
  ): Promise<RateTable & CollectionMeta> {
    const existing = await this.rateTables.get(id);
    if (!existing) {
      throw new Error(`Rate table not found: ${id}`);
    }

    if (changes.journeymanRate !== undefined) {
      changes.journeymanRate = round2(changes.journeymanRate);
    }

    const updated = await this.rateTables.update(id, changes as Partial<RateTable>);
    this.events.emit('union.rateTable.updated', { rateTable: updated });
    return updated;
  }

  /**
   * Get a single rate table by ID.
   */
  async getRateTable(id: string): Promise<(RateTable & CollectionMeta) | null> {
    return this.rateTables.get(id);
  }

  /**
   * Get rate tables with optional filters, ordered by effectiveDate descending.
   */
  async getRateTables(filters?: {
    unionId?: string;
    classification?: string;
    status?: RateTableStatus;
  }): Promise<(RateTable & CollectionMeta)[]> {
    const q = this.rateTables.query();

    if (filters?.unionId) {
      q.where('unionId', '=', filters.unionId);
    }
    if (filters?.classification) {
      q.where('classification', '=', filters.classification);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    q.orderBy('effectiveDate', 'desc');
    return q.execute();
  }

  // ========================================================================
  // RATE TABLE LINE ITEMS
  // ========================================================================

  /**
   * Add a line item to a rate table.
   */
  async addRateTableLine(data: {
    rateTableId: string;
    category: RateLineCategory;
    description?: string;
    rate: number;
    method: RateLineMethod;
    payableTo: RateLinePayableTo;
    fundName?: string;
  }): Promise<RateTableLine & CollectionMeta> {
    // Validate rate table exists
    const rateTable = await this.rateTables.get(data.rateTableId);
    if (!rateTable) {
      throw new Error(`Rate table not found: ${data.rateTableId}`);
    }

    const record = await this.rateTableLines.insert({
      rateTableId: data.rateTableId,
      category: data.category,
      description: data.description,
      rate: round2(data.rate),
      method: data.method,
      payableTo: data.payableTo,
      fundName: data.fundName,
    } as RateTableLine);

    return record;
  }

  /**
   * Update an existing rate table line.
   */
  async updateRateTableLine(
    id: string,
    changes: Partial<RateTableLine>,
  ): Promise<RateTableLine & CollectionMeta> {
    const existing = await this.rateTableLines.get(id);
    if (!existing) {
      throw new Error(`Rate table line not found: ${id}`);
    }

    if (changes.rate !== undefined) {
      changes.rate = round2(changes.rate);
    }

    const updated = await this.rateTableLines.update(id, changes as Partial<RateTableLine>);
    return updated;
  }

  /**
   * Remove a rate table line.
   */
  async removeRateTableLine(id: string): Promise<void> {
    const existing = await this.rateTableLines.get(id);
    if (!existing) {
      throw new Error(`Rate table line not found: ${id}`);
    }

    await this.rateTableLines.remove(id);
  }

  /**
   * Get all line items for a rate table.
   */
  async getRateTableLines(
    rateTableId: string,
  ): Promise<(RateTableLine & CollectionMeta)[]> {
    return this.rateTableLines
      .query()
      .where('rateTableId', '=', rateTableId)
      .execute();
  }

  // ========================================================================
  // FRINGE BENEFIT CONFIGURATION
  // ========================================================================

  /**
   * Create a fringe benefit configuration.
   * Validates union exists.
   */
  async createFringeBenefit(data: {
    unionId: string;
    name: string;
    rate: number;
    method: FringeMethod;
    payableTo: FringePayableTo;
    allocationMethod: FringeAllocationMethod;
    fundName?: string;
    fundAddress?: string;
    fundAccountNumber?: string;
  }): Promise<FringeBenefit & CollectionMeta> {
    // Validate union exists
    const union = await this.unions.get(data.unionId);
    if (!union) {
      throw new Error(`Union not found: ${data.unionId}`);
    }

    const record = await this.fringeBenefits.insert({
      unionId: data.unionId,
      name: data.name,
      rate: round2(data.rate),
      method: data.method,
      payableTo: data.payableTo,
      allocationMethod: data.allocationMethod,
      fundName: data.fundName,
      fundAddress: data.fundAddress,
      fundAccountNumber: data.fundAccountNumber,
    } as FringeBenefit);

    this.events.emit('union.fringeBenefit.created', { fringeBenefit: record });
    return record;
  }

  /**
   * Update an existing fringe benefit.
   */
  async updateFringeBenefit(
    id: string,
    changes: Partial<FringeBenefit>,
  ): Promise<FringeBenefit & CollectionMeta> {
    const existing = await this.fringeBenefits.get(id);
    if (!existing) {
      throw new Error(`Fringe benefit not found: ${id}`);
    }

    if (changes.rate !== undefined) {
      changes.rate = round2(changes.rate);
    }

    const updated = await this.fringeBenefits.update(id, changes as Partial<FringeBenefit>);
    return updated;
  }

  /**
   * Delete a fringe benefit.
   */
  async deleteFringeBenefit(id: string): Promise<void> {
    const existing = await this.fringeBenefits.get(id);
    if (!existing) {
      throw new Error(`Fringe benefit not found: ${id}`);
    }

    await this.fringeBenefits.remove(id);
  }

  /**
   * Get fringe benefits for a union.
   */
  async getFringeBenefits(
    unionId?: string,
  ): Promise<(FringeBenefit & CollectionMeta)[]> {
    const q = this.fringeBenefits.query();

    if (unionId) {
      q.where('unionId', '=', unionId);
    }

    return q.execute();
  }

  // ========================================================================
  // PREVAILING WAGE TABLE MANAGEMENT
  // ========================================================================

  /**
   * Create a prevailing wage record.
   * Computes totalRate = baseRate + fringeRate.
   */
  async createPrevailingWage(data: {
    jurisdiction: string;
    state: string;
    county?: string;
    projectType: PrevailingWageProjectType;
    classification: string;
    trade: string;
    baseRate: number;
    fringeRate: number;
    totalRate?: number;
    effectiveDate: string;
    expirationDate?: string;
    source: PrevailingWageSource;
  }): Promise<PrevailingWage & CollectionMeta> {
    const baseRate = round2(data.baseRate);
    const fringeRate = round2(data.fringeRate);
    const totalRate = data.totalRate !== undefined ? round2(data.totalRate) : round2(baseRate + fringeRate);

    const record = await this.prevailingWages.insert({
      jurisdiction: data.jurisdiction,
      state: data.state,
      county: data.county,
      projectType: data.projectType,
      classification: data.classification,
      trade: data.trade,
      baseRate,
      fringeRate,
      totalRate,
      effectiveDate: data.effectiveDate,
      expirationDate: data.expirationDate,
      source: data.source,
    } as PrevailingWage);

    this.events.emit('union.prevailingWage.created', { prevailingWage: record });
    return record;
  }

  /**
   * Update an existing prevailing wage record.
   * Recalculates totalRate if baseRate or fringeRate change.
   */
  async updatePrevailingWage(
    id: string,
    changes: Partial<PrevailingWage>,
  ): Promise<PrevailingWage & CollectionMeta> {
    const existing = await this.prevailingWages.get(id);
    if (!existing) {
      throw new Error(`Prevailing wage record not found: ${id}`);
    }

    // Recalculate totalRate if base or fringe changed
    const baseRate = changes.baseRate !== undefined ? round2(changes.baseRate) : existing.baseRate;
    const fringeRate = changes.fringeRate !== undefined ? round2(changes.fringeRate) : existing.fringeRate;

    if (changes.baseRate !== undefined || changes.fringeRate !== undefined) {
      changes.baseRate = baseRate;
      changes.fringeRate = fringeRate;
      changes.totalRate = round2(baseRate + fringeRate);
    }

    const updated = await this.prevailingWages.update(id, changes as Partial<PrevailingWage>);
    return updated;
  }

  /**
   * Delete a prevailing wage record.
   */
  async deletePrevailingWage(id: string): Promise<void> {
    const existing = await this.prevailingWages.get(id);
    if (!existing) {
      throw new Error(`Prevailing wage record not found: ${id}`);
    }

    await this.prevailingWages.remove(id);
  }

  /**
   * Get prevailing wage records with optional filters.
   */
  async getPrevailingWages(filters?: {
    jurisdiction?: string;
    state?: string;
    county?: string;
    projectType?: PrevailingWageProjectType;
    classification?: string;
    trade?: string;
    source?: PrevailingWageSource;
  }): Promise<(PrevailingWage & CollectionMeta)[]> {
    const q = this.prevailingWages.query();

    if (filters?.jurisdiction) {
      q.where('jurisdiction', '=', filters.jurisdiction);
    }
    if (filters?.state) {
      q.where('state', '=', filters.state);
    }
    if (filters?.county) {
      q.where('county', '=', filters.county);
    }
    if (filters?.projectType) {
      q.where('projectType', '=', filters.projectType);
    }
    if (filters?.classification) {
      q.where('classification', '=', filters.classification);
    }
    if (filters?.trade) {
      q.where('trade', '=', filters.trade);
    }
    if (filters?.source) {
      q.where('source', '=', filters.source);
    }

    q.orderBy('effectiveDate', 'desc');
    return q.execute();
  }

  /**
   * Lookup prevailing wage for a given jurisdiction, classification, and date.
   * Returns the most recent active rate that contains the given date.
   */
  async lookupPrevailingWage(
    jurisdiction: string,
    classification: string,
    asOfDate: string,
  ): Promise<(PrevailingWage & CollectionMeta) | null> {
    const candidates = await this.prevailingWages
      .query()
      .where('jurisdiction', '=', jurisdiction)
      .where('classification', '=', classification)
      .where('effectiveDate', '<=', asOfDate)
      .orderBy('effectiveDate', 'desc')
      .execute();

    // Find first that is not expired (expirationDate is null or >= asOfDate)
    for (const wage of candidates) {
      if (!wage.expirationDate || wage.expirationDate >= asOfDate) {
        return wage;
      }
    }

    return null;
  }

  // ========================================================================
  // CERTIFIED PAYROLL GENERATION (WH-347)
  // ========================================================================

  /**
   * Generate a certified payroll report for a job and week ending date.
   * Takes pay run data and produces a WH-347 compatible report.
   * Defaults: status='draft'.
   */
  async generateCertifiedPayroll(data: {
    jobId: string;
    weekEndingDate: string;
    contractorName: string;
    projectName: string;
    projectNumber?: string;
    reportNumber?: string;
    totalGross: number;
    totalFringe: number;
    totalNet: number;
  }): Promise<CertifiedPayroll & CollectionMeta> {
    const record = await this.certifiedPayrolls.insert({
      jobId: data.jobId,
      weekEndingDate: data.weekEndingDate,
      contractorName: data.contractorName,
      projectName: data.projectName,
      projectNumber: data.projectNumber,
      reportNumber: data.reportNumber,
      status: 'draft' as CertifiedPayrollStatus,
      totalGross: round2(data.totalGross),
      totalFringe: round2(data.totalFringe),
      totalNet: round2(data.totalNet),
    } as CertifiedPayroll);

    this.events.emit('union.certifiedPayroll.generated', { certifiedPayroll: record });
    return record;
  }

  /**
   * Update a certified payroll report.
   */
  async updateCertifiedPayroll(
    id: string,
    changes: Partial<CertifiedPayroll>,
  ): Promise<CertifiedPayroll & CollectionMeta> {
    const existing = await this.certifiedPayrolls.get(id);
    if (!existing) {
      throw new Error(`Certified payroll not found: ${id}`);
    }

    if (changes.totalGross !== undefined) {
      changes.totalGross = round2(changes.totalGross);
    }
    if (changes.totalFringe !== undefined) {
      changes.totalFringe = round2(changes.totalFringe);
    }
    if (changes.totalNet !== undefined) {
      changes.totalNet = round2(changes.totalNet);
    }

    const updated = await this.certifiedPayrolls.update(id, changes as Partial<CertifiedPayroll>);
    return updated;
  }

  /**
   * Submit a certified payroll report.
   * Validates that the report is in 'draft' status.
   */
  async submitCertifiedPayroll(id: string): Promise<CertifiedPayroll & CollectionMeta> {
    const existing = await this.certifiedPayrolls.get(id);
    if (!existing) {
      throw new Error(`Certified payroll not found: ${id}`);
    }

    if (existing.status !== 'draft') {
      throw new Error(
        `Certified payroll cannot be submitted: current status is "${existing.status}". Must be in "draft" status.`,
      );
    }

    const updated = await this.certifiedPayrolls.update(id, {
      status: 'submitted',
    } as Partial<CertifiedPayroll>);

    this.events.emit('union.certifiedPayroll.submitted', { certifiedPayroll: updated });
    return updated;
  }

  /**
   * Approve a certified payroll report.
   * Validates that the report is in 'submitted' status.
   */
  async approveCertifiedPayroll(id: string): Promise<CertifiedPayroll & CollectionMeta> {
    const existing = await this.certifiedPayrolls.get(id);
    if (!existing) {
      throw new Error(`Certified payroll not found: ${id}`);
    }

    if (existing.status !== 'submitted') {
      throw new Error(
        `Certified payroll cannot be approved: current status is "${existing.status}". Must be in "submitted" status.`,
      );
    }

    const updated = await this.certifiedPayrolls.update(id, {
      status: 'approved',
    } as Partial<CertifiedPayroll>);

    this.events.emit('union.certifiedPayroll.approved', { certifiedPayroll: updated });
    return updated;
  }

  /**
   * Get a single certified payroll by ID.
   */
  async getCertifiedPayroll(id: string): Promise<(CertifiedPayroll & CollectionMeta) | null> {
    return this.certifiedPayrolls.get(id);
  }

  /**
   * Get certified payrolls with optional filters.
   */
  async getCertifiedPayrolls(filters?: {
    jobId?: string;
    status?: CertifiedPayrollStatus;
    weekEndingDate?: string;
  }): Promise<(CertifiedPayroll & CollectionMeta)[]> {
    const q = this.certifiedPayrolls.query();

    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.weekEndingDate) {
      q.where('weekEndingDate', '=', filters.weekEndingDate);
    }

    q.orderBy('weekEndingDate', 'desc');
    return q.execute();
  }

  // ========================================================================
  // APPRENTICE TRACKING AND RATIO COMPLIANCE
  // ========================================================================

  /**
   * Create an apprentice record.
   * Validates union exists. Defaults: status='active', currentRatio=0.
   */
  async createApprentice(data: {
    employeeId: string;
    unionId: string;
    trade: string;
    startDate: string;
    periodNumber: number;
    totalPeriods: number;
    currentRatio?: number;
    requiredRatio?: number;
    status?: ApprenticeStatus;
  }): Promise<Apprentice & CollectionMeta> {
    // Validate union exists
    const union = await this.unions.get(data.unionId);
    if (!union) {
      throw new Error(`Union not found: ${data.unionId}`);
    }

    const record = await this.apprentices.insert({
      employeeId: data.employeeId,
      unionId: data.unionId,
      trade: data.trade,
      startDate: data.startDate,
      periodNumber: data.periodNumber,
      totalPeriods: data.totalPeriods,
      currentRatio: data.currentRatio ?? 0,
      requiredRatio: data.requiredRatio ?? 0,
      status: data.status ?? 'active',
    } as Apprentice);

    this.events.emit('union.apprentice.created', { apprentice: record });
    return record;
  }

  /**
   * Update an existing apprentice record.
   */
  async updateApprentice(
    id: string,
    changes: Partial<Apprentice>,
  ): Promise<Apprentice & CollectionMeta> {
    const existing = await this.apprentices.get(id);
    if (!existing) {
      throw new Error(`Apprentice not found: ${id}`);
    }

    const updated = await this.apprentices.update(id, changes as Partial<Apprentice>);
    this.events.emit('union.apprentice.updated', { apprentice: updated });
    return updated;
  }

  /**
   * Get a single apprentice by ID.
   */
  async getApprentice(id: string): Promise<(Apprentice & CollectionMeta) | null> {
    return this.apprentices.get(id);
  }

  /**
   * Get apprentices with optional filters.
   */
  async getApprentices(filters?: {
    unionId?: string;
    employeeId?: string;
    trade?: string;
    status?: ApprenticeStatus;
  }): Promise<(Apprentice & CollectionMeta)[]> {
    const q = this.apprentices.query();

    if (filters?.unionId) {
      q.where('unionId', '=', filters.unionId);
    }
    if (filters?.employeeId) {
      q.where('employeeId', '=', filters.employeeId);
    }
    if (filters?.trade) {
      q.where('trade', '=', filters.trade);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    return q.execute();
  }

  /**
   * Check apprentice ratio compliance.
   * Returns compliance status for all active apprentices, or filtered by union.
   */
  async checkApprenticeCompliance(
    unionId?: string,
  ): Promise<ApprenticeComplianceResult[]> {
    const filters: { unionId?: string; status?: ApprenticeStatus } = { status: 'active' };
    if (unionId) {
      filters.unionId = unionId;
    }

    const activeApprentices = await this.getApprentices(filters);
    const results: ApprenticeComplianceResult[] = [];

    for (const apprentice of activeApprentices) {
      const currentRatio = apprentice.currentRatio ?? 0;
      const requiredRatio = apprentice.requiredRatio ?? 0;
      const isCompliant = requiredRatio === 0 || currentRatio >= requiredRatio;

      results.push({
        apprenticeId: apprentice.id,
        employeeId: apprentice.employeeId,
        unionId: apprentice.unionId,
        trade: apprentice.trade,
        currentRatio,
        requiredRatio,
        isCompliant,
        periodNumber: apprentice.periodNumber,
        totalPeriods: apprentice.totalPeriods,
      });
    }

    return results;
  }

  // ========================================================================
  // REMITTANCE REPORT GENERATION
  // ========================================================================

  /**
   * Create a remittance report.
   * Validates union exists. Defaults: status='draft'.
   */
  async createRemittance(data: {
    unionId: string;
    periodStart: string;
    periodEnd: string;
    dueDate?: string;
    totalHours: number;
    totalAmount: number;
    status?: RemittanceStatus;
    employeeCount?: number;
  }): Promise<Remittance & CollectionMeta> {
    // Validate union exists
    const union = await this.unions.get(data.unionId);
    if (!union) {
      throw new Error(`Union not found: ${data.unionId}`);
    }

    const record = await this.remittances.insert({
      unionId: data.unionId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      dueDate: data.dueDate,
      totalHours: round2(data.totalHours),
      totalAmount: round2(data.totalAmount),
      status: data.status ?? 'draft',
      employeeCount: data.employeeCount ?? 0,
    } as Remittance);

    this.events.emit('union.remittance.created', { remittance: record });
    return record;
  }

  /**
   * Update an existing remittance.
   */
  async updateRemittance(
    id: string,
    changes: Partial<Remittance>,
  ): Promise<Remittance & CollectionMeta> {
    const existing = await this.remittances.get(id);
    if (!existing) {
      throw new Error(`Remittance not found: ${id}`);
    }

    if (changes.totalHours !== undefined) {
      changes.totalHours = round2(changes.totalHours);
    }
    if (changes.totalAmount !== undefined) {
      changes.totalAmount = round2(changes.totalAmount);
    }

    const updated = await this.remittances.update(id, changes as Partial<Remittance>);
    this.events.emit('union.remittance.updated', { remittance: updated });
    return updated;
  }

  /**
   * Submit a remittance report.
   * Validates that the remittance is in 'draft' status.
   */
  async submitRemittance(id: string): Promise<Remittance & CollectionMeta> {
    const existing = await this.remittances.get(id);
    if (!existing) {
      throw new Error(`Remittance not found: ${id}`);
    }

    if (existing.status !== 'draft') {
      throw new Error(
        `Remittance cannot be submitted: current status is "${existing.status}". Must be in "draft" status.`,
      );
    }

    const updated = await this.remittances.update(id, {
      status: 'submitted',
    } as Partial<Remittance>);

    this.events.emit('union.remittance.submitted', { remittance: updated });
    return updated;
  }

  /**
   * Mark a remittance as paid.
   * Validates that the remittance is in 'submitted' status.
   */
  async payRemittance(id: string): Promise<Remittance & CollectionMeta> {
    const existing = await this.remittances.get(id);
    if (!existing) {
      throw new Error(`Remittance not found: ${id}`);
    }

    if (existing.status !== 'submitted') {
      throw new Error(
        `Remittance cannot be marked as paid: current status is "${existing.status}". Must be in "submitted" status.`,
      );
    }

    const updated = await this.remittances.update(id, {
      status: 'paid',
    } as Partial<Remittance>);

    this.events.emit('union.remittance.paid', { remittance: updated });
    return updated;
  }

  /**
   * Get a single remittance by ID.
   */
  async getRemittance(id: string): Promise<(Remittance & CollectionMeta) | null> {
    return this.remittances.get(id);
  }

  /**
   * Get remittances with optional filters.
   */
  async getRemittances(filters?: {
    unionId?: string;
    status?: RemittanceStatus;
  }): Promise<(Remittance & CollectionMeta)[]> {
    const q = this.remittances.query();

    if (filters?.unionId) {
      q.where('unionId', '=', filters.unionId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    q.orderBy('periodEnd', 'desc');
    return q.execute();
  }

  /**
   * Generate a remittance summary report for a given date range.
   * Groups by union and returns summary rows.
   */
  async getRemittanceSummary(
    periodStart: string,
    periodEnd: string,
  ): Promise<RemittanceSummaryRow[]> {
    const allRemittances = await this.remittances.query().execute();

    // Filter to remittances that overlap the given range
    const filtered = allRemittances.filter((r) => {
      return r.periodEnd >= periodStart && r.periodStart <= periodEnd;
    });

    // Group by union
    const unionMap = new Map<string, {
      totalHours: number;
      totalAmount: number;
      employeeCount: number;
      periodStart: string;
      periodEnd: string;
      status: RemittanceStatus;
    }>();

    for (const rem of filtered) {
      const existing = unionMap.get(rem.unionId);
      if (existing) {
        existing.totalHours = round2(existing.totalHours + rem.totalHours);
        existing.totalAmount = round2(existing.totalAmount + rem.totalAmount);
        existing.employeeCount = Math.max(existing.employeeCount, rem.employeeCount ?? 0);
        // Use the broadest date range
        if (rem.periodStart < existing.periodStart) {
          existing.periodStart = rem.periodStart;
        }
        if (rem.periodEnd > existing.periodEnd) {
          existing.periodEnd = rem.periodEnd;
        }
      } else {
        unionMap.set(rem.unionId, {
          totalHours: round2(rem.totalHours),
          totalAmount: round2(rem.totalAmount),
          employeeCount: rem.employeeCount ?? 0,
          periodStart: rem.periodStart,
          periodEnd: rem.periodEnd,
          status: rem.status,
        });
      }
    }

    // Build result rows with union names
    const rows: RemittanceSummaryRow[] = [];

    for (const [unionId, data] of unionMap) {
      const union = await this.unions.get(unionId);
      const unionName = union ? union.name : unionId;

      rows.push({
        unionId,
        unionName,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        totalHours: data.totalHours,
        totalAmount: data.totalAmount,
        employeeCount: data.employeeCount,
        status: data.status,
      });
    }

    // Sort by union name
    rows.sort((a, b) => a.unionName.localeCompare(b.unionName));

    return rows;
  }

  // ========================================================================
  // RATE LOOKUP
  // ========================================================================

  /**
   * Lookup union rates for a given union, classification, and date.
   * Finds the active rate table whose effective date range contains the
   * given date, then returns the rate table and all its line items along
   * with computed totals.
   */
  async lookupRate(
    unionId: string,
    classification: string,
    asOfDate: string,
  ): Promise<RateLookupResult | null> {
    // Find rate tables matching union + classification + date
    const candidates = await this.rateTables
      .query()
      .where('unionId', '=', unionId)
      .where('classification', '=', classification)
      .where('effectiveDate', '<=', asOfDate)
      .orderBy('effectiveDate', 'desc')
      .execute();

    // Find first that is active and not expired
    let matchingTable: (RateTable & CollectionMeta) | null = null;
    for (const table of candidates) {
      if (table.status !== 'active') {
        continue;
      }
      if (!table.expirationDate || table.expirationDate >= asOfDate) {
        matchingTable = table;
        break;
      }
    }

    if (!matchingTable) {
      return null;
    }

    // Get all line items for this rate table
    const lines = await this.getRateTableLines(matchingTable.id);

    // Compute totals
    let totalHourlyRate = 0;
    let totalFringeRate = 0;

    for (const line of lines) {
      if (line.method === 'hourly') {
        if (line.category === 'base_wage') {
          totalHourlyRate = round2(totalHourlyRate + line.rate);
        } else {
          totalFringeRate = round2(totalFringeRate + line.rate);
        }
      }
    }

    return {
      rateTableId: matchingTable.id,
      rateTableName: matchingTable.name,
      classification: matchingTable.classification,
      effectiveDate: matchingTable.effectiveDate,
      expirationDate: matchingTable.expirationDate,
      journeymanRate: matchingTable.journeymanRate ?? 0,
      lines,
      totalHourlyRate: round2(totalHourlyRate + totalFringeRate),
      totalFringeRate,
    };
  }

  // ========================================================================
  // IMPORT HELPERS
  // ========================================================================

  /**
   * Import union rate table data from parsed CSV rows.
   * Each row should have: unionLocalNumber, classification, category,
   * description, rate, method, payableTo, effectiveDate, expirationDate.
   *
   * Creates or finds the rate table, then adds line items.
   */
  async importRateTableRows(rows: {
    unionLocalNumber: string;
    rateTableName: string;
    classification: string;
    category: RateLineCategory;
    description?: string;
    rate: number;
    method: RateLineMethod;
    payableTo: RateLinePayableTo;
    fundName?: string;
    effectiveDate: string;
    expirationDate?: string;
  }[]): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    // Group rows by union + classification + effectiveDate to batch into rate tables
    const groupKey = (r: typeof rows[0]) =>
      `${r.unionLocalNumber}|${r.classification}|${r.effectiveDate}`;

    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = groupKey(row);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    }

    for (const [, groupRows] of groups) {
      const firstRow = groupRows[0];

      // Find the union
      const union = await this.getUnionByLocalNumber(firstRow.unionLocalNumber);
      if (!union) {
        errors.push(`Union with local number "${firstRow.unionLocalNumber}" not found.`);
        continue;
      }

      // Find or create the rate table
      let rateTable: (RateTable & CollectionMeta) | null = null;

      const existingTables = await this.rateTables
        .query()
        .where('unionId', '=', union.id)
        .where('classification', '=', firstRow.classification)
        .where('effectiveDate', '=', firstRow.effectiveDate)
        .limit(1)
        .first();

      if (existingTables) {
        rateTable = existingTables;
      } else {
        rateTable = await this.createRateTable({
          unionId: union.id,
          name: firstRow.rateTableName || `${union.name} - ${firstRow.classification}`,
          effectiveDate: firstRow.effectiveDate,
          expirationDate: firstRow.expirationDate,
          classification: firstRow.classification,
          status: 'active',
        });
      }

      // Add line items
      for (const row of groupRows) {
        try {
          await this.addRateTableLine({
            rateTableId: rateTable.id,
            category: row.category,
            description: row.description,
            rate: row.rate,
            method: row.method,
            payableTo: row.payableTo,
            fundName: row.fundName,
          });
          imported++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`Row import failed for ${row.unionLocalNumber}/${row.classification}: ${message}`);
        }
      }
    }

    return { imported, errors };
  }

  /**
   * Import prevailing wage schedule data from parsed CSV rows.
   */
  async importPrevailingWageRows(rows: {
    jurisdiction: string;
    state: string;
    county?: string;
    projectType: PrevailingWageProjectType;
    classification: string;
    trade: string;
    baseRate: number;
    fringeRate: number;
    effectiveDate: string;
    expirationDate?: string;
    source: PrevailingWageSource;
  }[]): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        await this.createPrevailingWage({
          jurisdiction: row.jurisdiction,
          state: row.state,
          county: row.county,
          projectType: row.projectType,
          classification: row.classification,
          trade: row.trade,
          baseRate: row.baseRate,
          fringeRate: row.fringeRate,
          effectiveDate: row.effectiveDate,
          expirationDate: row.expirationDate,
          source: row.source,
        });
        imported++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Prevailing wage import failed for ${row.jurisdiction}/${row.classification}: ${message}`);
      }
    }

    return { imported, errors };
  }
}
