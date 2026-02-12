/**
 * Payroll Service Tests
 * Tests for the Payroll business logic layer (Phase 6).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PayrollService } from '../../src/modules/payroll/payroll-service';
import type {
  Employee, TimeEntry, PayRun, PayCheck,
  Earning, Deduction, Benefit,
  TaxTable, TaxFiling, WorkerComp,
} from '../../src/modules/payroll/payroll-service';
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

  const employees = new Collection<Employee>('payroll/employee', adapter, schemas, events);
  const timeEntries = new Collection<TimeEntry>('payroll/timeEntry', adapter, schemas, events);
  const payRuns = new Collection<PayRun>('payroll/payRun', adapter, schemas, events);
  const payChecks = new Collection<PayCheck>('payroll/payCheck', adapter, schemas, events);
  const earnings = new Collection<Earning>('payroll/earning', adapter, schemas, events);
  const deductions = new Collection<Deduction>('payroll/deduction', adapter, schemas, events);
  const benefits = new Collection<Benefit>('payroll/benefit', adapter, schemas, events);
  const taxTables = new Collection<TaxTable>('payroll/taxTable', adapter, schemas, events);
  const taxFilings = new Collection<TaxFiling>('payroll/taxFiling', adapter, schemas, events);
  const workerComps = new Collection<WorkerComp>('payroll/workerComp', adapter, schemas, events);

  const service = new PayrollService(
    employees, timeEntries, payRuns, payChecks,
    earnings, deductions, benefits,
    taxTables, taxFilings, workerComps,
    events,
  );

  return { service, events };
}

/** Helper: create a standard test employee. */
async function createTestEmployee(service: PayrollService, overrides?: Record<string, unknown>) {
  return service.createEmployee({
    firstName: 'John',
    lastName: 'Smith',
    ssn: '123-45-6789',
    hireDate: '2025-01-15',
    payType: 'hourly',
    payRate: 50,
    payFrequency: 'biweekly',
    state: 'CA',
    ...(overrides as Record<string, never>),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PayrollService', () => {
  let service: PayrollService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Employee CRUD
  // ==========================================================================

  describe('Employee CRUD', () => {
    it('creates an employee with defaults', async () => {
      const emp = await createTestEmployee(service);

      expect(emp.firstName).toBe('John');
      expect(emp.lastName).toBe('Smith');
      expect(emp.ssn).toBe('123-45-6789');
      expect(emp.status).toBe('active');
      expect(emp.payType).toBe('hourly');
      expect(emp.payRate).toBe(50);
      expect(emp.payFrequency).toBe('biweekly');
      expect(emp.allowances).toBe(0);
      expect(emp.id).toBeDefined();
    });

    it('rejects duplicate SSN', async () => {
      await createTestEmployee(service);
      await expect(
        createTestEmployee(service),
      ).rejects.toThrow('already exists');
    });

    it('updates an employee', async () => {
      const emp = await createTestEmployee(service);
      const updated = await service.updateEmployee(emp.id, {
        department: 'Concrete',
        payRate: 55,
      });
      expect(updated.department).toBe('Concrete');
      expect(updated.payRate).toBe(55);
    });

    it('filters employees by status', async () => {
      await createTestEmployee(service);
      await service.createEmployee({
        firstName: 'Jane',
        lastName: 'Doe',
        ssn: '987-65-4321',
        hireDate: '2025-03-01',
        payType: 'salary',
        payRate: 80000,
        payFrequency: 'monthly',
        status: 'terminated',
      });

      const active = await service.getEmployees({ status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].firstName).toBe('John');

      const terminated = await service.getEmployees({ status: 'terminated' });
      expect(terminated).toHaveLength(1);
      expect(terminated[0].firstName).toBe('Jane');
    });

    it('deletes an employee with no pay checks', async () => {
      const emp = await createTestEmployee(service);
      await service.deleteEmployee(emp.id);
      const found = await service.getEmployee(emp.id);
      expect(found).toBeNull();
    });

    it('rejects deletion of employee with pay checks', async () => {
      const emp = await createTestEmployee(service);

      // Create a time entry and pay run to generate a check
      const te = await service.createTimeEntry({
        employeeId: emp.id,
        date: '2026-01-05',
        hours: 40,
        payType: 'regular',
      });
      await service.approveTimeEntry(te.id, 'Manager');

      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });
      await service.addPayCheck(run.id, emp.id);

      await expect(
        service.deleteEmployee(emp.id),
      ).rejects.toThrow('Cannot delete');
    });

    it('looks up employee by SSN', async () => {
      await createTestEmployee(service);
      const found = await service.getEmployeeBySsn('123-45-6789');
      expect(found).not.toBeNull();
      expect(found!.firstName).toBe('John');
    });
  });

  // ==========================================================================
  // Time Entry CRUD
  // ==========================================================================

  describe('Time Entry CRUD', () => {
    let employeeId: string;

    beforeEach(async () => {
      const emp = await createTestEmployee(service);
      employeeId = emp.id;
    });

    it('creates a time entry with defaults', async () => {
      const te = await service.createTimeEntry({
        employeeId,
        date: '2026-01-05',
        hours: 8,
        payType: 'regular',
      });

      expect(te.employeeId).toBe(employeeId);
      expect(te.hours).toBe(8);
      expect(te.payType).toBe('regular');
      expect(te.approved).toBe(false);
    });

    it('approves a time entry', async () => {
      const te = await service.createTimeEntry({
        employeeId,
        date: '2026-01-05',
        hours: 8,
        payType: 'regular',
      });

      const approved = await service.approveTimeEntry(te.id, 'Supervisor');
      expect(approved.approved).toBe(true);
      expect(approved.approvedBy).toBe('Supervisor');
    });

    it('rejects double approval', async () => {
      const te = await service.createTimeEntry({
        employeeId,
        date: '2026-01-05',
        hours: 8,
        payType: 'regular',
      });

      await service.approveTimeEntry(te.id, 'Supervisor');
      await expect(
        service.approveTimeEntry(te.id, 'Manager'),
      ).rejects.toThrow('already approved');
    });

    it('gets time entries by employee', async () => {
      await service.createTimeEntry({ employeeId, date: '2026-01-05', hours: 8, payType: 'regular' });
      await service.createTimeEntry({ employeeId, date: '2026-01-06', hours: 10, payType: 'overtime' });

      const entries = await service.getTimeEntriesByEmployee(employeeId);
      expect(entries).toHaveLength(2);
    });

    it('gets time entries by date range', async () => {
      await service.createTimeEntry({ employeeId, date: '2026-01-05', hours: 8, payType: 'regular' });
      await service.createTimeEntry({ employeeId, date: '2026-01-15', hours: 8, payType: 'regular' });
      await service.createTimeEntry({ employeeId, date: '2026-02-01', hours: 8, payType: 'regular' });

      const entries = await service.getTimeEntriesByDateRange('2026-01-01', '2026-01-31');
      expect(entries).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Pay Run Workflow
  // ==========================================================================

  describe('Pay Run Workflow', () => {
    it('creates a pay run in draft status', async () => {
      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      expect(run.status).toBe('draft');
      expect(run.totalGross).toBe(0);
      expect(run.totalNet).toBe(0);
      expect(run.totalTaxes).toBe(0);
      expect(run.totalDeductions).toBe(0);
      expect(run.employeeCount).toBe(0);
    });

    it('transitions draft -> processing -> completed', async () => {
      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      const processing = await service.processPayRun(run.id);
      expect(processing.status).toBe('processing');

      const completed = await service.completePayRun(run.id);
      expect(completed.status).toBe('completed');
    });

    it('rejects invalid status transitions', async () => {
      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      // Cannot complete from draft
      await expect(
        service.completePayRun(run.id),
      ).rejects.toThrow('processing');

      // Cannot process twice
      await service.processPayRun(run.id);
      await expect(
        service.processPayRun(run.id),
      ).rejects.toThrow('draft');
    });

    it('voids a pay run', async () => {
      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      const voided = await service.voidPayRun(run.id);
      expect(voided.status).toBe('voided');
    });

    it('rejects voiding an already voided run', async () => {
      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      await service.voidPayRun(run.id);
      await expect(
        service.voidPayRun(run.id),
      ).rejects.toThrow('already voided');
    });
  });

  // ==========================================================================
  // Gross-to-Net Calculation
  // ==========================================================================

  describe('Gross-to-Net Calculation', () => {
    let employeeId: string;

    beforeEach(async () => {
      const emp = await createTestEmployee(service);
      employeeId = emp.id;
    });

    it('computes gross from time entries', async () => {
      // 40 hours regular at $50/hr = $2000
      const te1 = await service.createTimeEntry({
        employeeId,
        date: '2026-01-05',
        hours: 40,
        payType: 'regular',
      });
      await service.approveTimeEntry(te1.id, 'Manager');

      // 8 hours overtime at $50 * 1.5 = $600
      const te2 = await service.createTimeEntry({
        employeeId,
        date: '2026-01-06',
        hours: 8,
        payType: 'overtime',
      });
      await service.approveTimeEntry(te2.id, 'Manager');

      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      const check = await service.addPayCheck(run.id, employeeId);

      // Gross = (40 * 50 * 1.0) + (8 * 50 * 1.5) = 2000 + 600 = 2600
      expect(check.grossPay).toBe(2600);
      expect(check.hours).toBe(40);
      expect(check.overtimeHours).toBe(8);
    });

    it('computes federal tax at 22%', async () => {
      const te = await service.createTimeEntry({
        employeeId,
        date: '2026-01-05',
        hours: 40,
        payType: 'regular',
      });
      await service.approveTimeEntry(te.id, 'Manager');

      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      const check = await service.addPayCheck(run.id, employeeId);

      // Gross = 40 * 50 = 2000
      // Federal = 2000 * 0.22 = 440
      expect(check.federalTax).toBe(440);
    });

    it('computes state tax for CA at 9.3%', async () => {
      const te = await service.createTimeEntry({
        employeeId,
        date: '2026-01-05',
        hours: 40,
        payType: 'regular',
      });
      await service.approveTimeEntry(te.id, 'Manager');

      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      const check = await service.addPayCheck(run.id, employeeId);

      // Gross = 2000, CA rate = 9.3%
      // State tax = 2000 * 0.093 = 186
      expect(check.stateTax).toBe(186);
    });

    it('computes FICA SS and Medicare', async () => {
      const te = await service.createTimeEntry({
        employeeId,
        date: '2026-01-05',
        hours: 40,
        payType: 'regular',
      });
      await service.approveTimeEntry(te.id, 'Manager');

      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      const check = await service.addPayCheck(run.id, employeeId);

      // Gross = 2000
      // FICA SS = 2000 * 0.062 = 124
      // FICA Med = 2000 * 0.0145 = 29
      expect(check.ficaSS).toBe(124);
      expect(check.ficaMed).toBe(29);
    });

    it('computes net pay correctly', async () => {
      const te = await service.createTimeEntry({
        employeeId,
        date: '2026-01-05',
        hours: 40,
        payType: 'regular',
      });
      await service.approveTimeEntry(te.id, 'Manager');

      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      const check = await service.addPayCheck(run.id, employeeId);

      // Gross = 2000
      // Federal = 440, State = 186, Local = 0, SS = 124, Med = 29
      // Total taxes = 779
      // Deductions = 0 (none configured)
      // Net = 2000 - 779 - 0 = 1221
      const expectedTaxes = 440 + 186 + 0 + 124 + 29;
      expect(check.netPay).toBe(2000 - expectedTaxes);
    });

    it('updates pay run totals after adding a check', async () => {
      const te = await service.createTimeEntry({
        employeeId,
        date: '2026-01-05',
        hours: 40,
        payType: 'regular',
      });
      await service.approveTimeEntry(te.id, 'Manager');

      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      const check = await service.addPayCheck(run.id, employeeId);
      const updatedRun = await service.getPayRun(run.id);

      expect(updatedRun!.totalGross).toBe(check.grossPay);
      expect(updatedRun!.totalNet).toBe(check.netPay);
      expect(updatedRun!.employeeCount).toBe(1);
    });

    it('computes salary gross for salaried employee', async () => {
      const salariedEmp = await service.createEmployee({
        firstName: 'Jane',
        lastName: 'Doe',
        ssn: '222-33-4444',
        hireDate: '2025-06-01',
        payType: 'salary',
        payRate: 78000,
        payFrequency: 'biweekly',
        state: 'TX',
      });

      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      // No time entries for salary employee, so it uses salary calculation
      const check = await service.addPayCheck(run.id, salariedEmp.id);

      // Biweekly = 78000 / 26 = 3000
      expect(check.grossPay).toBe(3000);
      // TX has 0% state tax
      expect(check.stateTax).toBe(0);
    });
  });

  // ==========================================================================
  // Earnings Configuration
  // ==========================================================================

  describe('Earnings Configuration', () => {
    it('creates an earning type', async () => {
      const earning = await service.createEarning({
        name: 'Regular Pay',
        code: 'REG',
        type: 'regular',
        multiplier: 1.0,
        isTaxable: true,
      });

      expect(earning.name).toBe('Regular Pay');
      expect(earning.code).toBe('REG');
      expect(earning.multiplier).toBe(1.0);
      expect(earning.isTaxable).toBe(true);
      expect(earning.isOvertime).toBe(false);
    });

    it('rejects duplicate earning codes', async () => {
      await service.createEarning({ name: 'Regular', code: 'REG', type: 'regular' });
      await expect(
        service.createEarning({ name: 'Regular 2', code: 'REG', type: 'regular' }),
      ).rejects.toThrow('already exists');
    });
  });

  // ==========================================================================
  // Deductions Configuration
  // ==========================================================================

  describe('Deductions Configuration', () => {
    it('creates a flat deduction', async () => {
      const ded = await service.createDeduction({
        name: '401k',
        code: '401K',
        type: 'pretax',
        method: 'flat',
        amount: 200,
      });

      expect(ded.name).toBe('401k');
      expect(ded.type).toBe('pretax');
      expect(ded.method).toBe('flat');
      expect(ded.amount).toBe(200);
    });

    it('creates a percent deduction', async () => {
      const ded = await service.createDeduction({
        name: 'Garnishment',
        code: 'GARN',
        type: 'garnishment',
        method: 'percent',
        amount: 15,
        maxPerPeriod: 500,
      });

      expect(ded.method).toBe('percent');
      expect(ded.amount).toBe(15);
      expect(ded.maxPerPeriod).toBe(500);
    });

    it('rejects duplicate deduction codes', async () => {
      await service.createDeduction({ name: '401k', code: '401K', type: 'pretax', method: 'flat', amount: 200 });
      await expect(
        service.createDeduction({ name: '401k Copy', code: '401K', type: 'pretax', method: 'flat', amount: 100 }),
      ).rejects.toThrow('already exists');
    });
  });

  // ==========================================================================
  // Benefits Configuration
  // ==========================================================================

  describe('Benefits Configuration', () => {
    it('creates a benefit', async () => {
      const ben = await service.createBenefit({
        name: 'Health Insurance',
        code: 'HLTH',
        type: 'health',
        employeeContribution: 150,
        employerContribution: 450,
        method: 'flat',
      });

      expect(ben.name).toBe('Health Insurance');
      expect(ben.type).toBe('health');
      expect(ben.employeeContribution).toBe(150);
      expect(ben.employerContribution).toBe(450);
    });
  });

  // ==========================================================================
  // Tax Table Management
  // ==========================================================================

  describe('Tax Table Management', () => {
    it('creates a tax table entry', async () => {
      const tt = await service.createTaxTable({
        jurisdiction: 'federal',
        year: 2026,
        type: 'fica_ss',
        rate: 6.2,
        wageBase: 168600,
      });

      expect(tt.jurisdiction).toBe('federal');
      expect(tt.type).toBe('fica_ss');
      expect(tt.rate).toBe(6.2);
      expect(tt.wageBase).toBe(168600);
    });

    it('filters tax tables by jurisdiction and type', async () => {
      await service.createTaxTable({ jurisdiction: 'federal', year: 2026, type: 'income', rate: 22 });
      await service.createTaxTable({ jurisdiction: 'state', state: 'CA', year: 2026, type: 'income', rate: 9.3 });

      const federal = await service.getTaxTables({ jurisdiction: 'federal' });
      expect(federal).toHaveLength(1);

      const state = await service.getTaxTables({ jurisdiction: 'state', state: 'CA' });
      expect(state).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Workers' Compensation
  // ==========================================================================

  describe('Workers Compensation', () => {
    it('creates a WC class code', async () => {
      const wc = await service.createWorkerComp({
        classCode: '5403',
        description: 'Carpentry',
        rate: 12.50,
        stateCode: 'CA',
        effectiveDate: '2026-01-01',
      });

      expect(wc.classCode).toBe('5403');
      expect(wc.rate).toBe(12.50);
      expect(wc.stateCode).toBe('CA');
    });

    it('computes WC premium', async () => {
      await service.createWorkerComp({
        classCode: '5403',
        description: 'Carpentry',
        rate: 10.00,
        stateCode: 'CA',
      });

      const emp = await service.createEmployee({
        firstName: 'Bob',
        lastName: 'Builder',
        ssn: '111-22-3333',
        hireDate: '2025-01-01',
        payType: 'hourly',
        payRate: 40,
        payFrequency: 'weekly',
        wcClassCode: '5403',
      });

      // Premium for $2000 gross at rate 10.00 per $100
      // 2000 * (10.00 / 100) = 200
      const premium = await service.computeWcPremium(emp.id, 2000);
      expect(premium).toBe(200);
    });

    it('returns 0 premium for employee without WC code', async () => {
      const emp = await createTestEmployee(service);
      const premium = await service.computeWcPremium(emp.id, 2000);
      expect(premium).toBe(0);
    });
  });

  // ==========================================================================
  // Payroll Register Report
  // ==========================================================================

  describe('Payroll Register Report', () => {
    it('generates register for a pay run', async () => {
      const emp1 = await createTestEmployee(service);
      const emp2 = await service.createEmployee({
        firstName: 'Jane',
        lastName: 'Doe',
        ssn: '555-66-7777',
        hireDate: '2025-03-01',
        payType: 'hourly',
        payRate: 40,
        payFrequency: 'biweekly',
        state: 'TX',
      });

      // Time entries for emp1
      const te1 = await service.createTimeEntry({ employeeId: emp1.id, date: '2026-01-05', hours: 40, payType: 'regular' });
      await service.approveTimeEntry(te1.id, 'Manager');

      // Time entries for emp2
      const te2 = await service.createTimeEntry({ employeeId: emp2.id, date: '2026-01-05', hours: 40, payType: 'regular' });
      await service.approveTimeEntry(te2.id, 'Manager');

      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      await service.addPayCheck(run.id, emp1.id);
      await service.addPayCheck(run.id, emp2.id);

      const register = await service.getPayrollRegister(run.id);
      expect(register).toHaveLength(2);

      // Should be sorted by employee name
      expect(register[0].employeeName).toBe('Doe, Jane');
      expect(register[1].employeeName).toBe('Smith, John');

      // emp2 (TX, no state tax): gross = 40 * 40 = 1600
      expect(register[0].grossPay).toBe(1600);
      expect(register[0].stateTax).toBe(0); // TX = 0%
    });
  });

  // ==========================================================================
  // Quarterly Tax Summary
  // ==========================================================================

  describe('Quarterly Tax Summary', () => {
    it('aggregates taxes for a quarter', async () => {
      const emp = await createTestEmployee(service);

      const te = await service.createTimeEntry({
        employeeId: emp.id,
        date: '2026-01-05',
        hours: 40,
        payType: 'regular',
      });
      await service.approveTimeEntry(te.id, 'Manager');

      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      await service.addPayCheck(run.id, emp.id);
      await service.processPayRun(run.id);
      await service.completePayRun(run.id);

      const summary = await service.getQuarterlyTaxSummary(2026, 1);
      expect(summary.year).toBe(2026);
      expect(summary.quarter).toBe(1);
      expect(summary.totalWages).toBe(2000);
      expect(summary.totalFederalTax).toBe(440);
      expect(summary.employeeCount).toBe(1);
    });
  });

  // ==========================================================================
  // Employee Earnings History
  // ==========================================================================

  describe('Employee Earnings History', () => {
    it('returns earnings history for an employee', async () => {
      const emp = await createTestEmployee(service);

      const te = await service.createTimeEntry({
        employeeId: emp.id,
        date: '2026-01-05',
        hours: 40,
        payType: 'regular',
      });
      await service.approveTimeEntry(te.id, 'Manager');

      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      await service.addPayCheck(run.id, emp.id);

      const history = await service.getEmployeeEarningsHistory(emp.id);
      expect(history.employeeName).toBe('Smith, John');
      expect(history.totalGross).toBe(2000);
      expect(history.payChecks).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Tax Filings
  // ==========================================================================

  describe('Tax Filings', () => {
    it('creates a tax filing', async () => {
      const filing = await service.createTaxFiling({
        type: '941',
        period: '2026-Q1',
        year: 2026,
        quarter: 1,
        totalWages: 50000,
        totalTax: 11000,
        dueDate: '2026-04-30',
      });

      expect(filing.type).toBe('941');
      expect(filing.status).toBe('draft');
      expect(filing.totalWages).toBe(50000);
    });

    it('updates filing status to filed', async () => {
      const filing = await service.createTaxFiling({
        type: '941',
        period: '2026-Q1',
        year: 2026,
        quarter: 1,
      });

      const updated = await service.updateTaxFiling(filing.id, { status: 'filed' });
      expect(updated.status).toBe('filed');
    });
  });

  // ==========================================================================
  // FUTA / SUTA Calculation
  // ==========================================================================

  describe('FUTA / SUTA Calculation', () => {
    it('computes FUTA at 0.6% up to $7000 wage base', () => {
      // $5000 gross -> $5000 * 0.006 = $30
      expect(service.computeFuta(5000)).toBe(30);

      // $10000 gross -> capped at $7000 * 0.006 = $42
      expect(service.computeFuta(10000)).toBe(42);
    });

    it('computes SUTA at 2.7% up to default wage base', () => {
      // $5000 gross -> $5000 * 0.027 = $135
      expect(service.computeSuta(5000)).toBe(135);

      // $15000 gross -> capped at $10000 * 0.027 = $270
      expect(service.computeSuta(15000)).toBe(270);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits payroll.employee.created', async () => {
      let emitted = false;
      events.on('payroll.employee.created', () => { emitted = true; });
      await createTestEmployee(service);
      expect(emitted).toBe(true);
    });

    it('emits payroll.employee.updated', async () => {
      const emp = await createTestEmployee(service);
      let emitted = false;
      events.on('payroll.employee.updated', () => { emitted = true; });
      await service.updateEmployee(emp.id, { department: 'Engineering' });
      expect(emitted).toBe(true);
    });

    it('emits payroll.timeEntry.created', async () => {
      const emp = await createTestEmployee(service);
      let emitted = false;
      events.on('payroll.timeEntry.created', () => { emitted = true; });
      await service.createTimeEntry({
        employeeId: emp.id,
        date: '2026-01-05',
        hours: 8,
        payType: 'regular',
      });
      expect(emitted).toBe(true);
    });

    it('emits payroll.timeEntry.approved', async () => {
      const emp = await createTestEmployee(service);
      const te = await service.createTimeEntry({
        employeeId: emp.id,
        date: '2026-01-05',
        hours: 8,
        payType: 'regular',
      });

      let emitted = false;
      events.on('payroll.timeEntry.approved', () => { emitted = true; });
      await service.approveTimeEntry(te.id, 'Manager');
      expect(emitted).toBe(true);
    });

    it('emits payroll.payRun.created', async () => {
      let emitted = false;
      events.on('payroll.payRun.created', () => { emitted = true; });
      await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });
      expect(emitted).toBe(true);
    });

    it('emits payroll.payRun.completed', async () => {
      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });
      await service.processPayRun(run.id);

      let emitted = false;
      events.on('payroll.payRun.completed', () => { emitted = true; });
      await service.completePayRun(run.id);
      expect(emitted).toBe(true);
    });

    it('emits payroll.payCheck.created', async () => {
      const emp = await createTestEmployee(service);
      const te = await service.createTimeEntry({
        employeeId: emp.id,
        date: '2026-01-05',
        hours: 40,
        payType: 'regular',
      });
      await service.approveTimeEntry(te.id, 'Manager');

      const run = await service.createPayRun({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-14',
        payDate: '2026-01-17',
      });

      let emitted = false;
      events.on('payroll.payCheck.created', () => { emitted = true; });
      await service.addPayCheck(run.id, emp.id);
      expect(emitted).toBe(true);
    });
  });
});
