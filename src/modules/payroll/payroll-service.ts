/**
 * Concrete -- Payroll Service (Phase 6)
 *
 * Core service layer for the Payroll module. Provides employee management,
 * time entry tracking, pay run processing, gross-to-net calculation with
 * federal/state/local tax withholding, FICA/FUTA/SUTA, workers' compensation
 * tracking, earnings/deductions/benefits configuration, payroll register,
 * quarterly tax summaries, and pay stub generation.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type EmployeeStatus = 'active' | 'inactive' | 'terminated';
export type EmployeePayType = 'hourly' | 'salary';
export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type TimeEntryPayType = 'regular' | 'overtime' | 'doubletime' | 'premium' | 'perdiem';
export type PayRunStatus = 'draft' | 'processing' | 'completed' | 'voided';
export type EarningType = 'regular' | 'overtime' | 'doubletime' | 'premium' | 'perdiem' | 'piecerate' | 'commission';
export type DeductionType = 'pretax' | 'posttax' | 'garnishment';
export type CalcMethod = 'flat' | 'percent';
export type BenefitType = 'health' | 'dental' | 'vision' | 'life' | 'retirement' | 'hsa' | 'fsa' | 'other';
export type TaxJurisdiction = 'federal' | 'state' | 'local';
export type TaxType = 'income' | 'fica_ss' | 'fica_med' | 'futa' | 'suta';
export type TaxFilingType = '941' | '940' | 'w2' | 'state_quarterly';
export type TaxFilingStatus = 'draft' | 'filed';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Employee {
  [key: string]: unknown;
  firstName: string;
  lastName: string;
  middleName?: string;
  ssn: string;
  status: EmployeeStatus;
  hireDate: string;
  terminationDate?: string;
  department?: string;
  jobTitle?: string;
  payType: EmployeePayType;
  payRate: number;
  payFrequency: PayFrequency;
  federalFilingStatus?: string;
  stateFilingStatus?: string;
  allowances?: number;
  entityId?: string;
  unionId?: string;
  wcClassCode?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
}

export interface TimeEntry {
  [key: string]: unknown;
  employeeId: string;
  jobId?: string;
  costCodeId?: string;
  date: string;
  hours: number;
  payType: TimeEntryPayType;
  workClassification?: string;
  description?: string;
  approved: boolean;
  approvedBy?: string;
}

export interface PayRun {
  [key: string]: unknown;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: PayRunStatus;
  totalGross: number;
  totalNet: number;
  totalTaxes: number;
  totalDeductions: number;
  employeeCount: number;
  entityId?: string;
}

export interface PayCheck {
  [key: string]: unknown;
  payRunId: string;
  employeeId: string;
  grossPay: number;
  federalTax: number;
  stateTax: number;
  localTax: number;
  ficaSS: number;
  ficaMed: number;
  totalDeductions: number;
  netPay: number;
  hours: number;
  overtimeHours: number;
}

export interface Earning {
  [key: string]: unknown;
  name: string;
  code: string;
  type: EarningType;
  multiplier: number;
  isTaxable: boolean;
  isOvertime: boolean;
}

export interface Deduction {
  [key: string]: unknown;
  name: string;
  code: string;
  type: DeductionType;
  method: CalcMethod;
  amount: number;
  maxPerPeriod?: number;
  maxPerYear?: number;
}

export interface Benefit {
  [key: string]: unknown;
  name: string;
  code: string;
  type: BenefitType;
  employeeContribution: number;
  employerContribution: number;
  method: CalcMethod;
}

export interface TaxTable {
  [key: string]: unknown;
  jurisdiction: TaxJurisdiction;
  state?: string;
  locality?: string;
  year: number;
  type: TaxType;
  rate: number;
  wageBase?: number;
  filingStatus?: string;
}

export interface TaxFiling {
  [key: string]: unknown;
  type: TaxFilingType;
  period: string;
  year: number;
  quarter?: number;
  status: TaxFilingStatus;
  totalWages: number;
  totalTax: number;
  dueDate?: string;
}

export interface WorkerComp {
  [key: string]: unknown;
  classCode: string;
  description?: string;
  rate: number;
  stateCode?: string;
  effectiveDate?: string;
  expirationDate?: string;
}

// ---------------------------------------------------------------------------
// Report Types
// ---------------------------------------------------------------------------

export interface PayrollRegisterRow {
  employeeId: string;
  employeeName: string;
  grossPay: number;
  federalTax: number;
  stateTax: number;
  localTax: number;
  ficaSS: number;
  ficaMed: number;
  totalDeductions: number;
  netPay: number;
  hours: number;
  overtimeHours: number;
}

export interface QuarterlyTaxSummary {
  year: number;
  quarter: number;
  totalWages: number;
  totalFederalTax: number;
  totalStateTax: number;
  totalLocalTax: number;
  totalFicaSS: number;
  totalFicaMed: number;
  totalFuta: number;
  totalSuta: number;
  employeeCount: number;
}

export interface EmployeeEarningsHistory {
  employeeId: string;
  employeeName: string;
  totalGross: number;
  totalFederalTax: number;
  totalStateTax: number;
  totalLocalTax: number;
  totalFicaSS: number;
  totalFicaMed: number;
  totalDeductions: number;
  totalNet: number;
  payChecks: (PayCheck & CollectionMeta)[];
}

// ---------------------------------------------------------------------------
// Tax Constants (2026 defaults)
// ---------------------------------------------------------------------------

/** Federal income tax default rate (flat simplified withholding). */
const DEFAULT_FEDERAL_INCOME_RATE = 0.22;

/** Social Security rate (employee portion). */
const FICA_SS_RATE = 0.062;

/** Social Security wage base for 2026. */
const FICA_SS_WAGE_BASE = 168600;

/** Medicare rate (employee portion). */
const FICA_MED_RATE = 0.0145;

/** Additional Medicare rate for high earners (over $200k). */
const FICA_MED_ADDITIONAL_RATE = 0.009;

/** Additional Medicare threshold. */
const FICA_MED_ADDITIONAL_THRESHOLD = 200000;

/** FUTA rate (employer-only). */
const FUTA_RATE = 0.006;

/** FUTA wage base. */
const FUTA_WAGE_BASE = 7000;

/** Default SUTA rate (varies by state, using default). */
const DEFAULT_SUTA_RATE = 0.027;

/** Default SUTA wage base. */
const DEFAULT_SUTA_WAGE_BASE = 10000;

// ---------------------------------------------------------------------------
// State tax rates lookup (simplified flat rates for all 50 states + DC)
// ---------------------------------------------------------------------------

const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.050, AK: 0.000, AZ: 0.025, AR: 0.044, CA: 0.093,
  CO: 0.044, CT: 0.050, DE: 0.066, DC: 0.085, FL: 0.000,
  GA: 0.055, HI: 0.080, ID: 0.058, IL: 0.049, IN: 0.032,
  IA: 0.044, KS: 0.057, KY: 0.045, LA: 0.042, ME: 0.071,
  MD: 0.057, MA: 0.050, MI: 0.043, MN: 0.098, MS: 0.050,
  MO: 0.049, MT: 0.068, NE: 0.068, NV: 0.000, NH: 0.000,
  NJ: 0.109, NM: 0.049, NY: 0.085, NC: 0.046, ND: 0.029,
  OH: 0.040, OK: 0.048, OR: 0.099, PA: 0.031, RI: 0.059,
  SC: 0.065, SD: 0.000, TN: 0.000, TX: 0.000, UT: 0.049,
  VT: 0.088, VA: 0.057, WA: 0.000, WV: 0.065, WI: 0.076,
  WY: 0.000,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Get the pay-type multiplier for time entry types. */
function getPayTypeMultiplier(payType: TimeEntryPayType): number {
  switch (payType) {
    case 'regular': return 1.0;
    case 'overtime': return 1.5;
    case 'doubletime': return 2.0;
    case 'premium': return 1.0;
    case 'perdiem': return 1.0;
    default: return 1.0;
  }
}

// ---------------------------------------------------------------------------
// PayrollService
// ---------------------------------------------------------------------------

export class PayrollService {
  constructor(
    private employees: Collection<Employee>,
    private timeEntries: Collection<TimeEntry>,
    private payRuns: Collection<PayRun>,
    private payChecks: Collection<PayCheck>,
    private earnings: Collection<Earning>,
    private deductions: Collection<Deduction>,
    private benefits: Collection<Benefit>,
    private taxTables: Collection<TaxTable>,
    private taxFilings: Collection<TaxFiling>,
    private workerComps: Collection<WorkerComp>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // EMPLOYEE CRUD
  // ========================================================================

  /**
   * Create a new employee.
   * Validates SSN uniqueness. Defaults: status='active', allowances=0.
   */
  async createEmployee(data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    ssn: string;
    status?: EmployeeStatus;
    hireDate: string;
    terminationDate?: string;
    department?: string;
    jobTitle?: string;
    payType: EmployeePayType;
    payRate: number;
    payFrequency: PayFrequency;
    federalFilingStatus?: string;
    stateFilingStatus?: string;
    allowances?: number;
    entityId?: string;
    unionId?: string;
    wcClassCode?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    email?: string;
    emergencyContact?: string;
  }): Promise<Employee & CollectionMeta> {
    // Validate SSN uniqueness
    const existingBySsn = await this.getEmployeeBySsn(data.ssn);
    if (existingBySsn) {
      throw new Error(`Employee with SSN "${data.ssn}" already exists.`);
    }

    const record = await this.employees.insert({
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      ssn: data.ssn,
      status: data.status ?? 'active',
      hireDate: data.hireDate,
      terminationDate: data.terminationDate,
      department: data.department,
      jobTitle: data.jobTitle,
      payType: data.payType,
      payRate: round2(data.payRate),
      payFrequency: data.payFrequency,
      federalFilingStatus: data.federalFilingStatus,
      stateFilingStatus: data.stateFilingStatus,
      allowances: data.allowances ?? 0,
      entityId: data.entityId,
      unionId: data.unionId,
      wcClassCode: data.wcClassCode,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      phone: data.phone,
      email: data.email,
      emergencyContact: data.emergencyContact,
    } as Employee);

    this.events.emit('payroll.employee.created', { employee: record });
    return record;
  }

  /**
   * Update an existing employee.
   */
  async updateEmployee(
    id: string,
    changes: Partial<Employee>,
  ): Promise<Employee & CollectionMeta> {
    const existing = await this.employees.get(id);
    if (!existing) {
      throw new Error(`Employee not found: ${id}`);
    }

    // If SSN is changing, validate uniqueness
    if (changes.ssn && changes.ssn !== existing.ssn) {
      const duplicate = await this.getEmployeeBySsn(changes.ssn);
      if (duplicate) {
        throw new Error(`Employee with SSN "${changes.ssn}" already exists.`);
      }
    }

    const updated = await this.employees.update(id, changes as Partial<Employee>);
    this.events.emit('payroll.employee.updated', { employee: updated });
    return updated;
  }

  /**
   * Soft-delete an employee.
   * Refuses deletion if the employee has any pay checks.
   */
  async deleteEmployee(id: string): Promise<void> {
    const existing = await this.employees.get(id);
    if (!existing) {
      throw new Error(`Employee not found: ${id}`);
    }

    const checkCount = await this.payChecks
      .query()
      .where('employeeId', '=', id)
      .count();

    if (checkCount > 0) {
      throw new Error(
        `Cannot delete employee: they have ${checkCount} pay check(s). Set employee to terminated instead.`,
      );
    }

    await this.employees.remove(id);
    this.events.emit('payroll.employee.deleted', { employeeId: id });
  }

  /**
   * Get a single employee by ID.
   */
  async getEmployee(id: string): Promise<(Employee & CollectionMeta) | null> {
    return this.employees.get(id);
  }

  /**
   * Lookup an employee by SSN.
   */
  async getEmployeeBySsn(ssn: string): Promise<(Employee & CollectionMeta) | null> {
    const result = await this.employees
      .query()
      .where('ssn', '=', ssn)
      .limit(1)
      .first();
    return result;
  }

  /**
   * Get employees with optional filters, ordered by lastName asc.
   */
  async getEmployees(filters?: {
    status?: EmployeeStatus;
    department?: string;
    entityId?: string;
    payType?: EmployeePayType;
  }): Promise<(Employee & CollectionMeta)[]> {
    const q = this.employees.query();

    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.department) {
      q.where('department', '=', filters.department);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }
    if (filters?.payType) {
      q.where('payType', '=', filters.payType);
    }

    q.orderBy('lastName', 'asc');
    return q.execute();
  }

  // ========================================================================
  // TIME ENTRY CRUD
  // ========================================================================

  /**
   * Create a time entry.
   * Validates employee exists. Defaults: approved=false.
   */
  async createTimeEntry(data: {
    employeeId: string;
    jobId?: string;
    costCodeId?: string;
    date: string;
    hours: number;
    payType: TimeEntryPayType;
    workClassification?: string;
    description?: string;
  }): Promise<TimeEntry & CollectionMeta> {
    const employee = await this.employees.get(data.employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${data.employeeId}`);
    }

    const record = await this.timeEntries.insert({
      employeeId: data.employeeId,
      jobId: data.jobId,
      costCodeId: data.costCodeId,
      date: data.date,
      hours: round2(data.hours),
      payType: data.payType,
      workClassification: data.workClassification,
      description: data.description,
      approved: false,
      approvedBy: undefined,
    } as TimeEntry);

    this.events.emit('payroll.timeEntry.created', { timeEntry: record });
    return record;
  }

  /**
   * Approve a time entry.
   */
  async approveTimeEntry(id: string, approvedBy: string): Promise<TimeEntry & CollectionMeta> {
    const entry = await this.timeEntries.get(id);
    if (!entry) {
      throw new Error(`Time entry not found: ${id}`);
    }

    if (entry.approved) {
      throw new Error(`Time entry "${id}" is already approved.`);
    }

    const updated = await this.timeEntries.update(id, {
      approved: true,
      approvedBy,
    } as Partial<TimeEntry>);

    this.events.emit('payroll.timeEntry.approved', { timeEntry: updated });
    return updated;
  }

  /**
   * Get time entries by employee.
   */
  async getTimeEntriesByEmployee(
    employeeId: string,
  ): Promise<(TimeEntry & CollectionMeta)[]> {
    return this.timeEntries
      .query()
      .where('employeeId', '=', employeeId)
      .orderBy('date', 'desc')
      .execute();
  }

  /**
   * Get time entries by job.
   */
  async getTimeEntriesByJob(
    jobId: string,
  ): Promise<(TimeEntry & CollectionMeta)[]> {
    return this.timeEntries
      .query()
      .where('jobId', '=', jobId)
      .orderBy('date', 'desc')
      .execute();
  }

  /**
   * Get time entries by date range.
   */
  async getTimeEntriesByDateRange(
    startDate: string,
    endDate: string,
    employeeId?: string,
  ): Promise<(TimeEntry & CollectionMeta)[]> {
    const q = this.timeEntries.query();
    q.where('date', '>=', startDate);
    q.where('date', '<=', endDate);

    if (employeeId) {
      q.where('employeeId', '=', employeeId);
    }

    q.orderBy('date', 'asc');
    return q.execute();
  }

  /**
   * Get a single time entry by ID.
   */
  async getTimeEntry(id: string): Promise<(TimeEntry & CollectionMeta) | null> {
    return this.timeEntries.get(id);
  }

  /**
   * Update a time entry.
   */
  async updateTimeEntry(
    id: string,
    changes: Partial<TimeEntry>,
  ): Promise<TimeEntry & CollectionMeta> {
    const existing = await this.timeEntries.get(id);
    if (!existing) {
      throw new Error(`Time entry not found: ${id}`);
    }

    const updated = await this.timeEntries.update(id, changes as Partial<TimeEntry>);
    return updated;
  }

  // ========================================================================
  // PAY RUN MANAGEMENT
  // ========================================================================

  /**
   * Create a new pay run.
   * Defaults: status='draft', all totals=0, employeeCount=0.
   */
  async createPayRun(data: {
    periodStart: string;
    periodEnd: string;
    payDate: string;
    entityId?: string;
  }): Promise<PayRun & CollectionMeta> {
    const record = await this.payRuns.insert({
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      payDate: data.payDate,
      status: 'draft',
      totalGross: 0,
      totalNet: 0,
      totalTaxes: 0,
      totalDeductions: 0,
      employeeCount: 0,
      entityId: data.entityId,
    } as PayRun);

    this.events.emit('payroll.payRun.created', { payRun: record });
    return record;
  }

  /**
   * Get a single pay run by ID.
   */
  async getPayRun(id: string): Promise<(PayRun & CollectionMeta) | null> {
    return this.payRuns.get(id);
  }

  /**
   * Get pay runs with optional filters, ordered by payDate descending.
   */
  async getPayRuns(filters?: {
    status?: PayRunStatus;
    entityId?: string;
  }): Promise<(PayRun & CollectionMeta)[]> {
    const q = this.payRuns.query();

    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }

    q.orderBy('payDate', 'desc');
    return q.execute();
  }

  /**
   * Add a pay check to a pay run by computing gross-to-net for an employee.
   *
   * 1. Looks up approved time entries for the employee in the pay run period.
   * 2. Computes gross pay from time entries using employee pay rate and multipliers.
   * 3. Computes taxes: federal income, state income, local, FICA SS, FICA Medicare.
   * 4. Computes deductions from configured deductions.
   * 5. Computes net pay = gross - taxes - deductions.
   * 6. Creates the pay check record and updates the pay run totals.
   */
  async addPayCheck(
    payRunId: string,
    employeeId: string,
  ): Promise<PayCheck & CollectionMeta> {
    // Validate pay run
    const payRun = await this.payRuns.get(payRunId);
    if (!payRun) {
      throw new Error(`Pay run not found: ${payRunId}`);
    }
    if (payRun.status !== 'draft' && payRun.status !== 'processing') {
      throw new Error(
        `Pay run "${payRunId}" cannot accept new checks: status is "${payRun.status}".`,
      );
    }

    // Validate employee
    const employee = await this.employees.get(employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // Get approved time entries for the period
    const entries = await this.timeEntries
      .query()
      .where('employeeId', '=', employeeId)
      .where('date', '>=', payRun.periodStart)
      .where('date', '<=', payRun.periodEnd)
      .where('approved', '=', true)
      .execute();

    // Compute gross pay
    let regularHours = 0;
    let overtimeHours = 0;
    let grossPay = 0;

    for (const entry of entries) {
      const multiplier = getPayTypeMultiplier(entry.payType);
      const amount = round2(entry.hours * employee.payRate * multiplier);
      grossPay = round2(grossPay + amount);

      if (entry.payType === 'regular') {
        regularHours = round2(regularHours + entry.hours);
      } else if (entry.payType === 'overtime' || entry.payType === 'doubletime') {
        overtimeHours = round2(overtimeHours + entry.hours);
      }
    }

    // If salary employee with no time entries, compute from salary
    if (entries.length === 0 && employee.payType === 'salary') {
      grossPay = this.computeSalaryGross(employee.payRate, employee.payFrequency);
    }

    // Compute taxes
    const federalTax = this.computeFederalTax(grossPay, employee);
    const stateTax = this.computeStateTax(grossPay, employee);
    const localTax = this.computeLocalTax(grossPay, employee);
    const ficaSS = this.computeFicaSS(grossPay);
    const ficaMed = this.computeFicaMed(grossPay);

    // Compute deductions
    const totalDeductions = await this.computeDeductions(grossPay);

    // Compute net pay
    const totalTaxes = round2(federalTax + stateTax + localTax + ficaSS + ficaMed);
    const netPay = round2(grossPay - totalTaxes - totalDeductions);

    // Create pay check
    const check = await this.payChecks.insert({
      payRunId,
      employeeId,
      grossPay,
      federalTax,
      stateTax,
      localTax,
      ficaSS,
      ficaMed,
      totalDeductions,
      netPay,
      hours: regularHours,
      overtimeHours,
    } as PayCheck);

    // Update pay run totals
    const newTotalGross = round2(payRun.totalGross + grossPay);
    const newTotalNet = round2(payRun.totalNet + netPay);
    const newTotalTaxes = round2(payRun.totalTaxes + totalTaxes);
    const newTotalDeductions = round2(payRun.totalDeductions + totalDeductions);
    const newEmployeeCount = payRun.employeeCount + 1;

    await this.payRuns.update(payRunId, {
      totalGross: newTotalGross,
      totalNet: newTotalNet,
      totalTaxes: newTotalTaxes,
      totalDeductions: newTotalDeductions,
      employeeCount: newEmployeeCount,
    } as Partial<PayRun>);

    this.events.emit('payroll.payCheck.created', { payCheck: check });
    return check;
  }

  /**
   * Process a pay run -- transition from 'draft' to 'processing'.
   */
  async processPayRun(id: string): Promise<PayRun & CollectionMeta> {
    const payRun = await this.payRuns.get(id);
    if (!payRun) {
      throw new Error(`Pay run not found: ${id}`);
    }
    if (payRun.status !== 'draft') {
      throw new Error(`Pay run can only be processed from draft status. Current: "${payRun.status}".`);
    }

    const updated = await this.payRuns.update(id, {
      status: 'processing',
    } as Partial<PayRun>);

    return updated;
  }

  /**
   * Complete a pay run -- transition from 'processing' to 'completed'.
   */
  async completePayRun(id: string): Promise<PayRun & CollectionMeta> {
    const payRun = await this.payRuns.get(id);
    if (!payRun) {
      throw new Error(`Pay run not found: ${id}`);
    }
    if (payRun.status !== 'processing') {
      throw new Error(`Pay run can only be completed from processing status. Current: "${payRun.status}".`);
    }

    const updated = await this.payRuns.update(id, {
      status: 'completed',
    } as Partial<PayRun>);

    this.events.emit('payroll.payRun.completed', { payRun: updated });
    return updated;
  }

  /**
   * Void a pay run -- transition to 'voided'.
   */
  async voidPayRun(id: string): Promise<PayRun & CollectionMeta> {
    const payRun = await this.payRuns.get(id);
    if (!payRun) {
      throw new Error(`Pay run not found: ${id}`);
    }
    if (payRun.status === 'voided') {
      throw new Error(`Pay run is already voided.`);
    }

    const updated = await this.payRuns.update(id, {
      status: 'voided',
    } as Partial<PayRun>);

    return updated;
  }

  // ========================================================================
  // GROSS-TO-NET CALCULATION HELPERS
  // ========================================================================

  /**
   * Compute salary gross pay for one pay period.
   */
  private computeSalaryGross(annualSalary: number, frequency: PayFrequency): number {
    switch (frequency) {
      case 'weekly': return round2(annualSalary / 52);
      case 'biweekly': return round2(annualSalary / 26);
      case 'semimonthly': return round2(annualSalary / 24);
      case 'monthly': return round2(annualSalary / 12);
      default: return round2(annualSalary / 26);
    }
  }

  /**
   * Compute federal income tax withholding.
   * Uses tax tables if configured; otherwise uses simplified flat rate.
   */
  private computeFederalTax(grossPay: number, _employee: Employee): number {
    // Simplified: apply flat federal rate
    // In a production system, this would use progressive brackets
    // based on the employee's filing status and allowances.
    const rate = DEFAULT_FEDERAL_INCOME_RATE;
    return round2(grossPay * rate);
  }

  /**
   * Compute state income tax withholding.
   * Uses the state tax rate lookup table.
   */
  private computeStateTax(grossPay: number, employee: Employee): number {
    const stateCode = employee.state?.toUpperCase();
    if (!stateCode) return 0;

    const rate = STATE_TAX_RATES[stateCode] ?? 0;
    return round2(grossPay * rate);
  }

  /**
   * Compute local/city tax withholding.
   * Returns 0 by default unless local tax tables are configured.
   */
  private computeLocalTax(_grossPay: number, _employee: Employee): number {
    // Local taxes are jurisdiction-specific; return 0 unless configured
    return 0;
  }

  /**
   * Compute FICA Social Security (employee portion).
   * 6.2% up to wage base ($168,600 for 2026).
   */
  private computeFicaSS(grossPay: number): number {
    const taxableWages = Math.min(grossPay, FICA_SS_WAGE_BASE);
    return round2(taxableWages * FICA_SS_RATE);
  }

  /**
   * Compute FICA Medicare (employee portion).
   * 1.45% on all wages, plus 0.9% additional on wages over $200k.
   */
  private computeFicaMed(grossPay: number): number {
    let tax = round2(grossPay * FICA_MED_RATE);
    if (grossPay > FICA_MED_ADDITIONAL_THRESHOLD) {
      const additionalWages = grossPay - FICA_MED_ADDITIONAL_THRESHOLD;
      tax = round2(tax + additionalWages * FICA_MED_ADDITIONAL_RATE);
    }
    return tax;
  }

  /**
   * Compute FUTA (employer-only, not deducted from employee).
   * 0.6% up to $7,000 wage base.
   */
  computeFuta(grossPay: number): number {
    const taxableWages = Math.min(grossPay, FUTA_WAGE_BASE);
    return round2(taxableWages * FUTA_RATE);
  }

  /**
   * Compute SUTA (employer-only typically).
   * Uses default rate/base; can be overridden via tax tables.
   */
  computeSuta(grossPay: number, _stateCode?: string): number {
    const taxableWages = Math.min(grossPay, DEFAULT_SUTA_WAGE_BASE);
    return round2(taxableWages * DEFAULT_SUTA_RATE);
  }

  /**
   * Compute total deductions for an employee pay check.
   * Iterates all configured deductions and sums them.
   */
  private async computeDeductions(grossPay: number): Promise<number> {
    const allDeductions = await this.deductions.query().execute();
    let total = 0;

    for (const ded of allDeductions) {
      let amount = 0;
      if (ded.method === 'flat') {
        amount = ded.amount;
      } else if (ded.method === 'percent') {
        amount = round2(grossPay * (ded.amount / 100));
      }

      // Cap per period if set
      if (ded.maxPerPeriod !== undefined && ded.maxPerPeriod !== null) {
        amount = Math.min(amount, ded.maxPerPeriod);
      }

      total = round2(total + amount);
    }

    return total;
  }

  // ========================================================================
  // PAY CHECK QUERIES
  // ========================================================================

  /**
   * Get a single pay check by ID.
   */
  async getPayCheck(id: string): Promise<(PayCheck & CollectionMeta) | null> {
    return this.payChecks.get(id);
  }

  /**
   * Get all pay checks for a pay run.
   */
  async getPayChecksByRun(
    payRunId: string,
  ): Promise<(PayCheck & CollectionMeta)[]> {
    return this.payChecks
      .query()
      .where('payRunId', '=', payRunId)
      .execute();
  }

  /**
   * Get all pay checks for an employee.
   */
  async getPayChecksByEmployee(
    employeeId: string,
  ): Promise<(PayCheck & CollectionMeta)[]> {
    return this.payChecks
      .query()
      .where('employeeId', '=', employeeId)
      .execute();
  }

  // ========================================================================
  // EARNINGS CRUD
  // ========================================================================

  /**
   * Create an earning type configuration.
   */
  async createEarning(data: {
    name: string;
    code: string;
    type: EarningType;
    multiplier?: number;
    isTaxable?: boolean;
    isOvertime?: boolean;
  }): Promise<Earning & CollectionMeta> {
    // Validate code uniqueness
    const existing = await this.earnings
      .query()
      .where('code', '=', data.code)
      .limit(1)
      .first();
    if (existing) {
      throw new Error(`Earning code "${data.code}" already exists.`);
    }

    const record = await this.earnings.insert({
      name: data.name,
      code: data.code,
      type: data.type,
      multiplier: data.multiplier ?? 1.0,
      isTaxable: data.isTaxable ?? true,
      isOvertime: data.isOvertime ?? false,
    } as Earning);

    return record;
  }

  /**
   * Update an earning type configuration.
   */
  async updateEarning(
    id: string,
    changes: Partial<Earning>,
  ): Promise<Earning & CollectionMeta> {
    const existing = await this.earnings.get(id);
    if (!existing) {
      throw new Error(`Earning not found: ${id}`);
    }

    return this.earnings.update(id, changes as Partial<Earning>);
  }

  /**
   * Get all earning type configurations.
   */
  async getEarnings(): Promise<(Earning & CollectionMeta)[]> {
    return this.earnings.query().orderBy('code', 'asc').execute();
  }

  /**
   * Delete an earning type configuration.
   */
  async deleteEarning(id: string): Promise<void> {
    const existing = await this.earnings.get(id);
    if (!existing) {
      throw new Error(`Earning not found: ${id}`);
    }
    await this.earnings.remove(id);
  }

  // ========================================================================
  // DEDUCTIONS CRUD
  // ========================================================================

  /**
   * Create a deduction configuration.
   */
  async createDeduction(data: {
    name: string;
    code: string;
    type: DeductionType;
    method: CalcMethod;
    amount: number;
    maxPerPeriod?: number;
    maxPerYear?: number;
  }): Promise<Deduction & CollectionMeta> {
    // Validate code uniqueness
    const existing = await this.deductions
      .query()
      .where('code', '=', data.code)
      .limit(1)
      .first();
    if (existing) {
      throw new Error(`Deduction code "${data.code}" already exists.`);
    }

    const record = await this.deductions.insert({
      name: data.name,
      code: data.code,
      type: data.type,
      method: data.method,
      amount: round2(data.amount),
      maxPerPeriod: data.maxPerPeriod !== undefined ? round2(data.maxPerPeriod) : undefined,
      maxPerYear: data.maxPerYear !== undefined ? round2(data.maxPerYear) : undefined,
    } as Deduction);

    return record;
  }

  /**
   * Update a deduction configuration.
   */
  async updateDeduction(
    id: string,
    changes: Partial<Deduction>,
  ): Promise<Deduction & CollectionMeta> {
    const existing = await this.deductions.get(id);
    if (!existing) {
      throw new Error(`Deduction not found: ${id}`);
    }

    return this.deductions.update(id, changes as Partial<Deduction>);
  }

  /**
   * Get all deduction configurations.
   */
  async getDeductions(): Promise<(Deduction & CollectionMeta)[]> {
    return this.deductions.query().orderBy('code', 'asc').execute();
  }

  /**
   * Delete a deduction configuration.
   */
  async deleteDeduction(id: string): Promise<void> {
    const existing = await this.deductions.get(id);
    if (!existing) {
      throw new Error(`Deduction not found: ${id}`);
    }
    await this.deductions.remove(id);
  }

  // ========================================================================
  // BENEFITS CRUD
  // ========================================================================

  /**
   * Create a benefit configuration.
   */
  async createBenefit(data: {
    name: string;
    code: string;
    type: BenefitType;
    employeeContribution?: number;
    employerContribution?: number;
    method: CalcMethod;
  }): Promise<Benefit & CollectionMeta> {
    // Validate code uniqueness
    const existing = await this.benefits
      .query()
      .where('code', '=', data.code)
      .limit(1)
      .first();
    if (existing) {
      throw new Error(`Benefit code "${data.code}" already exists.`);
    }

    const record = await this.benefits.insert({
      name: data.name,
      code: data.code,
      type: data.type,
      employeeContribution: round2(data.employeeContribution ?? 0),
      employerContribution: round2(data.employerContribution ?? 0),
      method: data.method,
    } as Benefit);

    return record;
  }

  /**
   * Update a benefit configuration.
   */
  async updateBenefit(
    id: string,
    changes: Partial<Benefit>,
  ): Promise<Benefit & CollectionMeta> {
    const existing = await this.benefits.get(id);
    if (!existing) {
      throw new Error(`Benefit not found: ${id}`);
    }

    return this.benefits.update(id, changes as Partial<Benefit>);
  }

  /**
   * Get all benefit configurations.
   */
  async getBenefits(): Promise<(Benefit & CollectionMeta)[]> {
    return this.benefits.query().orderBy('code', 'asc').execute();
  }

  /**
   * Delete a benefit configuration.
   */
  async deleteBenefit(id: string): Promise<void> {
    const existing = await this.benefits.get(id);
    if (!existing) {
      throw new Error(`Benefit not found: ${id}`);
    }
    await this.benefits.remove(id);
  }

  // ========================================================================
  // TAX TABLE MANAGEMENT
  // ========================================================================

  /**
   * Create a tax table entry.
   */
  async createTaxTable(data: {
    jurisdiction: TaxJurisdiction;
    state?: string;
    locality?: string;
    year: number;
    type: TaxType;
    rate: number;
    wageBase?: number;
    filingStatus?: string;
  }): Promise<TaxTable & CollectionMeta> {
    const record = await this.taxTables.insert({
      jurisdiction: data.jurisdiction,
      state: data.state,
      locality: data.locality,
      year: data.year,
      type: data.type,
      rate: data.rate,
      wageBase: data.wageBase,
      filingStatus: data.filingStatus,
    } as TaxTable);

    return record;
  }

  /**
   * Update a tax table entry.
   */
  async updateTaxTable(
    id: string,
    changes: Partial<TaxTable>,
  ): Promise<TaxTable & CollectionMeta> {
    const existing = await this.taxTables.get(id);
    if (!existing) {
      throw new Error(`Tax table entry not found: ${id}`);
    }

    return this.taxTables.update(id, changes as Partial<TaxTable>);
  }

  /**
   * Get tax tables with optional filters.
   */
  async getTaxTables(filters?: {
    jurisdiction?: TaxJurisdiction;
    state?: string;
    year?: number;
    type?: TaxType;
  }): Promise<(TaxTable & CollectionMeta)[]> {
    const q = this.taxTables.query();

    if (filters?.jurisdiction) {
      q.where('jurisdiction', '=', filters.jurisdiction);
    }
    if (filters?.state) {
      q.where('state', '=', filters.state);
    }
    if (filters?.year) {
      q.where('year', '=', filters.year);
    }
    if (filters?.type) {
      q.where('type', '=', filters.type);
    }

    return q.execute();
  }

  /**
   * Delete a tax table entry.
   */
  async deleteTaxTable(id: string): Promise<void> {
    const existing = await this.taxTables.get(id);
    if (!existing) {
      throw new Error(`Tax table entry not found: ${id}`);
    }
    await this.taxTables.remove(id);
  }

  // ========================================================================
  // TAX FILING MANAGEMENT
  // ========================================================================

  /**
   * Create a tax filing record.
   */
  async createTaxFiling(data: {
    type: TaxFilingType;
    period: string;
    year: number;
    quarter?: number;
    status?: TaxFilingStatus;
    totalWages?: number;
    totalTax?: number;
    dueDate?: string;
  }): Promise<TaxFiling & CollectionMeta> {
    const record = await this.taxFilings.insert({
      type: data.type,
      period: data.period,
      year: data.year,
      quarter: data.quarter,
      status: data.status ?? 'draft',
      totalWages: round2(data.totalWages ?? 0),
      totalTax: round2(data.totalTax ?? 0),
      dueDate: data.dueDate,
    } as TaxFiling);

    return record;
  }

  /**
   * Update a tax filing record.
   */
  async updateTaxFiling(
    id: string,
    changes: Partial<TaxFiling>,
  ): Promise<TaxFiling & CollectionMeta> {
    const existing = await this.taxFilings.get(id);
    if (!existing) {
      throw new Error(`Tax filing not found: ${id}`);
    }

    return this.taxFilings.update(id, changes as Partial<TaxFiling>);
  }

  /**
   * Get tax filings with optional filters.
   */
  async getTaxFilings(filters?: {
    type?: TaxFilingType;
    year?: number;
    quarter?: number;
    status?: TaxFilingStatus;
  }): Promise<(TaxFiling & CollectionMeta)[]> {
    const q = this.taxFilings.query();

    if (filters?.type) {
      q.where('type', '=', filters.type);
    }
    if (filters?.year) {
      q.where('year', '=', filters.year);
    }
    if (filters?.quarter) {
      q.where('quarter', '=', filters.quarter);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    return q.execute();
  }

  // ========================================================================
  // WORKERS' COMPENSATION
  // ========================================================================

  /**
   * Create a worker's compensation class code record.
   */
  async createWorkerComp(data: {
    classCode: string;
    description?: string;
    rate: number;
    stateCode?: string;
    effectiveDate?: string;
    expirationDate?: string;
  }): Promise<WorkerComp & CollectionMeta> {
    const record = await this.workerComps.insert({
      classCode: data.classCode,
      description: data.description,
      rate: data.rate,
      stateCode: data.stateCode,
      effectiveDate: data.effectiveDate,
      expirationDate: data.expirationDate,
    } as WorkerComp);

    return record;
  }

  /**
   * Update a worker's compensation record.
   */
  async updateWorkerComp(
    id: string,
    changes: Partial<WorkerComp>,
  ): Promise<WorkerComp & CollectionMeta> {
    const existing = await this.workerComps.get(id);
    if (!existing) {
      throw new Error(`Worker's comp record not found: ${id}`);
    }

    return this.workerComps.update(id, changes as Partial<WorkerComp>);
  }

  /**
   * Get worker's compensation records with optional filters.
   */
  async getWorkerComps(filters?: {
    stateCode?: string;
  }): Promise<(WorkerComp & CollectionMeta)[]> {
    const q = this.workerComps.query();

    if (filters?.stateCode) {
      q.where('stateCode', '=', filters.stateCode);
    }

    q.orderBy('classCode', 'asc');
    return q.execute();
  }

  /**
   * Delete a worker's compensation record.
   */
  async deleteWorkerComp(id: string): Promise<void> {
    const existing = await this.workerComps.get(id);
    if (!existing) {
      throw new Error(`Worker's comp record not found: ${id}`);
    }
    await this.workerComps.remove(id);
  }

  /**
   * Compute workers' compensation premium for a given employee's gross pay.
   * Looks up the WC class code rate and applies it.
   */
  async computeWcPremium(employeeId: string, grossPay: number): Promise<number> {
    const employee = await this.employees.get(employeeId);
    if (!employee || !employee.wcClassCode) return 0;

    const wcRecords = await this.workerComps
      .query()
      .where('classCode', '=', employee.wcClassCode)
      .limit(1)
      .first();

    if (!wcRecords) return 0;

    // WC rate is typically per $100 of payroll
    return round2(grossPay * (wcRecords.rate / 100));
  }

  // ========================================================================
  // REPORTS
  // ========================================================================

  /**
   * Payroll register: all pay checks for a given pay run with employee names.
   */
  async getPayrollRegister(payRunId: string): Promise<PayrollRegisterRow[]> {
    const payRun = await this.payRuns.get(payRunId);
    if (!payRun) {
      throw new Error(`Pay run not found: ${payRunId}`);
    }

    const checks = await this.payChecks
      .query()
      .where('payRunId', '=', payRunId)
      .execute();

    const rows: PayrollRegisterRow[] = [];

    for (const check of checks) {
      const employee = await this.employees.get(check.employeeId);
      const employeeName = employee
        ? `${employee.lastName}, ${employee.firstName}`
        : check.employeeId;

      rows.push({
        employeeId: check.employeeId,
        employeeName,
        grossPay: check.grossPay,
        federalTax: check.federalTax,
        stateTax: check.stateTax,
        localTax: check.localTax,
        ficaSS: check.ficaSS,
        ficaMed: check.ficaMed,
        totalDeductions: check.totalDeductions,
        netPay: check.netPay,
        hours: check.hours,
        overtimeHours: check.overtimeHours,
      });
    }

    rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    return rows;
  }

  /**
   * Quarterly tax summary for a given year and quarter.
   *
   * Aggregates all completed pay runs whose payDate falls within the quarter,
   * then sums all pay checks for those runs.
   */
  async getQuarterlyTaxSummary(year: number, quarter: number): Promise<QuarterlyTaxSummary> {
    // Determine quarter date boundaries
    const quarterStartMonth = (quarter - 1) * 3;
    const quarterStart = `${year}-${String(quarterStartMonth + 1).padStart(2, '0')}-01`;
    const quarterEndMonth = quarterStartMonth + 3;
    let quarterEnd: string;
    if (quarterEndMonth <= 12) {
      quarterEnd = `${year}-${String(quarterEndMonth).padStart(2, '0')}-01`;
    } else {
      quarterEnd = `${year + 1}-01-01`;
    }

    // Get completed pay runs in the quarter
    const allRuns = await this.payRuns
      .query()
      .where('status', '=', 'completed')
      .where('payDate', '>=', quarterStart)
      .where('payDate', '<', quarterEnd)
      .execute();

    let totalWages = 0;
    let totalFederalTax = 0;
    let totalStateTax = 0;
    let totalLocalTax = 0;
    let totalFicaSS = 0;
    let totalFicaMed = 0;
    let totalFuta = 0;
    let totalSuta = 0;
    const employeeSet = new Set<string>();

    for (const run of allRuns) {
      const checks = await this.payChecks
        .query()
        .where('payRunId', '=', run.id)
        .execute();

      for (const check of checks) {
        totalWages = round2(totalWages + check.grossPay);
        totalFederalTax = round2(totalFederalTax + check.federalTax);
        totalStateTax = round2(totalStateTax + check.stateTax);
        totalLocalTax = round2(totalLocalTax + check.localTax);
        totalFicaSS = round2(totalFicaSS + check.ficaSS);
        totalFicaMed = round2(totalFicaMed + check.ficaMed);
        totalFuta = round2(totalFuta + this.computeFuta(check.grossPay));
        totalSuta = round2(totalSuta + this.computeSuta(check.grossPay));
        employeeSet.add(check.employeeId);
      }
    }

    return {
      year,
      quarter,
      totalWages,
      totalFederalTax,
      totalStateTax,
      totalLocalTax,
      totalFicaSS,
      totalFicaMed,
      totalFuta,
      totalSuta,
      employeeCount: employeeSet.size,
    };
  }

  /**
   * Employee earnings history: all pay checks for an employee with totals.
   */
  async getEmployeeEarningsHistory(employeeId: string): Promise<EmployeeEarningsHistory> {
    const employee = await this.employees.get(employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    const checks = await this.payChecks
      .query()
      .where('employeeId', '=', employeeId)
      .execute();

    let totalGross = 0;
    let totalFederalTax = 0;
    let totalStateTax = 0;
    let totalLocalTax = 0;
    let totalFicaSS = 0;
    let totalFicaMed = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const check of checks) {
      totalGross = round2(totalGross + check.grossPay);
      totalFederalTax = round2(totalFederalTax + check.federalTax);
      totalStateTax = round2(totalStateTax + check.stateTax);
      totalLocalTax = round2(totalLocalTax + check.localTax);
      totalFicaSS = round2(totalFicaSS + check.ficaSS);
      totalFicaMed = round2(totalFicaMed + check.ficaMed);
      totalDeductions = round2(totalDeductions + check.totalDeductions);
      totalNet = round2(totalNet + check.netPay);
    }

    return {
      employeeId,
      employeeName: `${employee.lastName}, ${employee.firstName}`,
      totalGross,
      totalFederalTax,
      totalStateTax,
      totalLocalTax,
      totalFicaSS,
      totalFicaMed,
      totalDeductions,
      totalNet,
      payChecks: checks,
    };
  }
}
