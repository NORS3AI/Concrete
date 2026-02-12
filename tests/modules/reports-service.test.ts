/**
 * Reports Service Tests
 * Tests for the Financial Reporting Suite business logic layer (Phase 11).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ReportsService } from '../../src/modules/reports/reports-service';
import type {
  GLAccountRef, GLJournalEntryRef, GLJournalLineRef, GLFiscalPeriodRef,
  APInvoiceRef, APVendorRef, ARInvoiceRef, ARCustomerRef,
  PayRunRef, PayCheckRef, EmployeeRef,
  JobRef, ActualCostRef, BudgetRef, BudgetLineRef,
  CommittedCostRef, ChangeOrderRef, CostCodeRef,
  ReportTemplate, EquipmentRef, EquipmentUsageRef,
} from '../../src/modules/reports/reports-service';
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

  const accounts = new Collection<GLAccountRef>('reports-test/account', adapter, schemas, events);
  const journalEntries = new Collection<GLJournalEntryRef>('reports-test/journalEntry', adapter, schemas, events);
  const journalLines = new Collection<GLJournalLineRef>('reports-test/journalLine', adapter, schemas, events);
  const fiscalPeriods = new Collection<GLFiscalPeriodRef>('reports-test/fiscalPeriod', adapter, schemas, events);
  const apInvoices = new Collection<APInvoiceRef>('reports-test/apInvoice', adapter, schemas, events);
  const apVendors = new Collection<APVendorRef>('reports-test/apVendor', adapter, schemas, events);
  const arInvoices = new Collection<ARInvoiceRef>('reports-test/arInvoice', adapter, schemas, events);
  const arCustomers = new Collection<ARCustomerRef>('reports-test/arCustomer', adapter, schemas, events);
  const payRuns = new Collection<PayRunRef>('reports-test/payRun', adapter, schemas, events);
  const payChecks = new Collection<PayCheckRef>('reports-test/payCheck', adapter, schemas, events);
  const employees = new Collection<EmployeeRef>('reports-test/employee', adapter, schemas, events);
  const jobs = new Collection<JobRef>('reports-test/job', adapter, schemas, events);
  const actualCosts = new Collection<ActualCostRef>('reports-test/actualCost', adapter, schemas, events);
  const budgets = new Collection<BudgetRef>('reports-test/budget', adapter, schemas, events);
  const budgetLines = new Collection<BudgetLineRef>('reports-test/budgetLine', adapter, schemas, events);
  const committedCosts = new Collection<CommittedCostRef>('reports-test/committedCost', adapter, schemas, events);
  const changeOrders = new Collection<ChangeOrderRef>('reports-test/changeOrder', adapter, schemas, events);
  const costCodes = new Collection<CostCodeRef>('reports-test/costCode', adapter, schemas, events);
  const templates = new Collection<ReportTemplate>('reports-test/template', adapter, schemas, events);
  const equipment = new Collection<EquipmentRef>('reports-test/equipment', adapter, schemas, events);
  const equipmentUsage = new Collection<EquipmentUsageRef>('reports-test/equipmentUsage', adapter, schemas, events);

  const service = new ReportsService(
    accounts, journalEntries, journalLines, fiscalPeriods,
    apInvoices, apVendors, arInvoices, arCustomers,
    payRuns, payChecks, employees,
    jobs, actualCosts, budgets, budgetLines,
    committedCosts, changeOrders, costCodes,
    templates, events,
    equipment, equipmentUsage,
  );

  return {
    service, events,
    accounts, journalEntries, journalLines, fiscalPeriods,
    apInvoices, apVendors, arInvoices, arCustomers,
    payRuns, payChecks, employees,
    jobs, actualCosts, budgets, budgetLines,
    committedCosts, changeOrders, costCodes,
    templates, equipment, equipmentUsage,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReportsService', () => {
  let ctx: ReturnType<typeof createTestService>;

  beforeEach(() => {
    localStorage.clear();
    ctx = createTestService();
  });

  // ========================================================================
  // Balance Sheet
  // ========================================================================

  describe('Balance Sheet', () => {
    it('generates a balance sheet from posted journal entries', async () => {
      // Create accounts
      const cashAccount = await ctx.accounts.insert({
        number: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit',
        isActive: true, depth: 0, path: '1000', isSummary: false,
      } as GLAccountRef);

      await ctx.accounts.insert({
        number: '2000', name: 'Accounts Payable', type: 'liability', normalBalance: 'credit',
        isActive: true, depth: 0, path: '2000', isSummary: false,
      } as GLAccountRef);

      const equityAccount = await ctx.accounts.insert({
        number: '3000', name: 'Owner Equity', type: 'equity', normalBalance: 'credit',
        isActive: true, depth: 0, path: '3000', isSummary: false,
      } as GLAccountRef);

      // Create journal entry
      const je = await ctx.journalEntries.insert({
        entryNumber: 'JE-001', date: '2026-01-15', status: 'posted',
        totalDebit: 100000, totalCredit: 100000, isAutoGenerated: false,
      } as GLJournalEntryRef);

      // Debit cash 100k, credit equity 100k
      await ctx.journalLines.insert({
        journalEntryId: je.id, accountId: cashAccount.id, debit: 100000, credit: 0, lineOrder: 1,
      } as GLJournalLineRef);

      await ctx.journalLines.insert({
        journalEntryId: je.id, accountId: equityAccount.id, debit: 0, credit: 100000, lineOrder: 2,
      } as GLJournalLineRef);

      const rows = await ctx.service.generateBalanceSheet({
        reportType: 'balance-sheet',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      });

      expect(rows.length).toBeGreaterThanOrEqual(2);

      const cashRow = rows.find((r) => r.accountNumber === '1000');
      expect(cashRow).toBeDefined();
      expect(cashRow!.currentBalance).toBe(100000);

      const equityRow = rows.find((r) => r.accountNumber === '3000');
      expect(equityRow).toBeDefined();
      expect(equityRow!.currentBalance).toBe(100000);
    });

    it('generates a comparative balance sheet with prior period', async () => {
      const cashAccount = await ctx.accounts.insert({
        number: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit',
        isActive: true, depth: 0, path: '1000', isSummary: false,
      } as GLAccountRef);

      const equityAccount = await ctx.accounts.insert({
        number: '3000', name: 'Owner Equity', type: 'equity', normalBalance: 'credit',
        isActive: true, depth: 0, path: '3000', isSummary: false,
      } as GLAccountRef);

      // Prior period entry
      const je1 = await ctx.journalEntries.insert({
        entryNumber: 'JE-001', date: '2025-12-15', status: 'posted',
        totalDebit: 50000, totalCredit: 50000, isAutoGenerated: false,
      } as GLJournalEntryRef);

      await ctx.journalLines.insert({
        journalEntryId: je1.id, accountId: cashAccount.id, debit: 50000, credit: 0, lineOrder: 1,
      } as GLJournalLineRef);
      await ctx.journalLines.insert({
        journalEntryId: je1.id, accountId: equityAccount.id, debit: 0, credit: 50000, lineOrder: 2,
      } as GLJournalLineRef);

      // Current period entry
      const je2 = await ctx.journalEntries.insert({
        entryNumber: 'JE-002', date: '2026-01-15', status: 'posted',
        totalDebit: 30000, totalCredit: 30000, isAutoGenerated: false,
      } as GLJournalEntryRef);

      await ctx.journalLines.insert({
        journalEntryId: je2.id, accountId: cashAccount.id, debit: 30000, credit: 0, lineOrder: 1,
      } as GLJournalLineRef);
      await ctx.journalLines.insert({
        journalEntryId: je2.id, accountId: equityAccount.id, debit: 0, credit: 30000, lineOrder: 2,
      } as GLJournalLineRef);

      const rows = await ctx.service.generateBalanceSheet({
        reportType: 'balance-sheet',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        comparePeriodEnd: '2025-12-31',
      });

      const cashRow = rows.find((r) => r.accountNumber === '1000');
      expect(cashRow).toBeDefined();
      expect(cashRow!.currentBalance).toBe(80000); // 50k + 30k
      expect(cashRow!.priorBalance).toBe(50000); // only 50k as of 12/31
      expect(cashRow!.change).toBe(30000);
    });

    it('returns accounts with zero balance when no journal entries exist', async () => {
      await ctx.accounts.insert({
        number: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit',
        isActive: true, depth: 0, path: '1000', isSummary: false,
      } as GLAccountRef);

      const rows = await ctx.service.generateBalanceSheet({
        reportType: 'balance-sheet',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].currentBalance).toBe(0);
    });
  });

  // ========================================================================
  // Income Statement
  // ========================================================================

  describe('Income Statement', () => {
    it('generates an income statement from posted journal entries', async () => {
      const revenueAccount = await ctx.accounts.insert({
        number: '4000', name: 'Revenue', type: 'revenue', normalBalance: 'credit',
        isActive: true, depth: 0, path: '4000', isSummary: false,
      } as GLAccountRef);

      const expenseAccount = await ctx.accounts.insert({
        number: '5000', name: 'Operating Expenses', type: 'expense', normalBalance: 'debit',
        isActive: true, depth: 0, path: '5000', isSummary: false,
      } as GLAccountRef);

      const je = await ctx.journalEntries.insert({
        entryNumber: 'JE-001', date: '2026-01-15', status: 'posted',
        totalDebit: 75000, totalCredit: 75000, isAutoGenerated: false,
      } as GLJournalEntryRef);

      // Credit revenue 75k
      await ctx.journalLines.insert({
        journalEntryId: je.id, accountId: revenueAccount.id, debit: 0, credit: 75000, lineOrder: 1,
      } as GLJournalLineRef);

      // Debit expense 25k
      const je2 = await ctx.journalEntries.insert({
        entryNumber: 'JE-002', date: '2026-01-20', status: 'posted',
        totalDebit: 25000, totalCredit: 25000, isAutoGenerated: false,
      } as GLJournalEntryRef);

      await ctx.journalLines.insert({
        journalEntryId: je2.id, accountId: expenseAccount.id, debit: 25000, credit: 0, lineOrder: 1,
      } as GLJournalLineRef);

      const rows = await ctx.service.generateIncomeStatement({
        reportType: 'income-statement',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      });

      expect(rows.length).toBe(2);

      const revenueRow = rows.find((r) => r.category === 'revenue');
      expect(revenueRow).toBeDefined();
      expect(revenueRow!.currentAmount).toBe(75000);

      const expenseRow = rows.find((r) => r.category === 'expense');
      expect(expenseRow).toBeDefined();
      expect(expenseRow!.currentAmount).toBe(25000);
    });

    it('computes variance for comparative income statement', async () => {
      const revenueAccount = await ctx.accounts.insert({
        number: '4000', name: 'Revenue', type: 'revenue', normalBalance: 'credit',
        isActive: true, depth: 0, path: '4000', isSummary: false,
      } as GLAccountRef);

      // Prior period
      const je1 = await ctx.journalEntries.insert({
        entryNumber: 'JE-001', date: '2025-12-15', status: 'posted',
        totalDebit: 0, totalCredit: 50000, isAutoGenerated: false,
      } as GLJournalEntryRef);

      await ctx.journalLines.insert({
        journalEntryId: je1.id, accountId: revenueAccount.id, debit: 0, credit: 50000, lineOrder: 1,
      } as GLJournalLineRef);

      // Current period
      const je2 = await ctx.journalEntries.insert({
        entryNumber: 'JE-002', date: '2026-01-15', status: 'posted',
        totalDebit: 0, totalCredit: 75000, isAutoGenerated: false,
      } as GLJournalEntryRef);

      await ctx.journalLines.insert({
        journalEntryId: je2.id, accountId: revenueAccount.id, debit: 0, credit: 75000, lineOrder: 1,
      } as GLJournalLineRef);

      const rows = await ctx.service.generateIncomeStatement({
        reportType: 'income-statement',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        comparePeriodStart: '2025-12-01',
        comparePeriodEnd: '2025-12-31',
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].currentAmount).toBe(75000);
      expect(rows[0].priorAmount).toBe(50000);
      expect(rows[0].variance).toBe(25000);
    });
  });

  // ========================================================================
  // Cash Flow Statement
  // ========================================================================

  describe('Cash Flow Statement', () => {
    it('generates an indirect cash flow statement', async () => {
      const revenueAccount = await ctx.accounts.insert({
        number: '4000', name: 'Revenue', type: 'revenue', normalBalance: 'credit',
        isActive: true, depth: 0, path: '4000', isSummary: false,
      } as GLAccountRef);

      const expenseAccount = await ctx.accounts.insert({
        number: '5000', name: 'Operating Expenses', type: 'expense', normalBalance: 'debit',
        isActive: true, depth: 0, path: '5000', isSummary: false,
      } as GLAccountRef);

      const je = await ctx.journalEntries.insert({
        entryNumber: 'JE-001', date: '2026-01-15', status: 'posted',
        totalDebit: 50000, totalCredit: 50000, isAutoGenerated: false,
      } as GLJournalEntryRef);

      await ctx.journalLines.insert({
        journalEntryId: je.id, accountId: revenueAccount.id, debit: 0, credit: 50000, lineOrder: 1,
      } as GLJournalLineRef);

      await ctx.journalLines.insert({
        journalEntryId: je.id, accountId: expenseAccount.id, debit: 20000, credit: 0, lineOrder: 2,
      } as GLJournalLineRef);

      const rows = await ctx.service.generateCashFlowStatement({
        reportType: 'cash-flow',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        method: 'indirect',
      });

      // Should have at least the net income row
      const netIncomeRow = rows.find((r) => r.description === 'Net Income');
      expect(netIncomeRow).toBeDefined();
      expect(netIncomeRow!.category).toBe('operating');
      expect(netIncomeRow!.amount).toBe(30000); // 50k revenue - 20k expense
    });

    it('returns empty array when no entries exist for direct method', async () => {
      const rows = await ctx.service.generateCashFlowStatement({
        reportType: 'cash-flow',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        method: 'direct',
      });

      expect(rows).toEqual([]);
    });
  });

  // ========================================================================
  // WIP Schedule
  // ========================================================================

  describe('WIP Schedule', () => {
    it('generates WIP schedule for active jobs', async () => {
      const job = await ctx.jobs.insert({
        number: 'J-001', name: 'Highway Bridge', type: 'lump_sum', status: 'active',
        contractAmount: 1000000, totalBudget: 800000, totalActualCost: 400000,
        totalCommitted: 100000, totalBilled: 350000, percentComplete: 50,
        retentionPct: 10, entityId: undefined,
      } as JobRef);

      await ctx.budgets.insert({
        jobId: job.id, name: 'Original Budget', status: 'approved', totalAmount: 800000,
      } as BudgetRef);
      // budget result unused - only side effect matters

      await ctx.actualCosts.insert({
        jobId: job.id, costCodeId: 'cc1', costType: 'labor', date: '2026-01-15',
        amount: 400000, source: 'payroll',
      } as ActualCostRef);

      const rows = await ctx.service.generateWipSchedule({
        reportType: 'wip-schedule',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].jobNumber).toBe('J-001');
      expect(rows[0].contractAmount).toBe(1000000);
      expect(rows[0].actualCostToDate).toBe(400000);
      expect(rows[0].totalBudget).toBe(800000);
      expect(rows[0].billedToDate).toBe(350000);
    });

    it('generates WIP schedule for a specific job', async () => {
      const job = await ctx.jobs.insert({
        number: 'J-001', name: 'Highway Bridge', type: 'lump_sum', status: 'active',
        contractAmount: 500000, totalBudget: 400000, totalActualCost: 200000,
        totalCommitted: 0, totalBilled: 200000, percentComplete: 50,
        retentionPct: 10, entityId: undefined,
      } as JobRef);

      await ctx.budgets.insert({
        jobId: job.id, name: 'Budget', status: 'approved', totalAmount: 400000,
      } as BudgetRef);

      await ctx.actualCosts.insert({
        jobId: job.id, costCodeId: 'cc1', costType: 'labor', date: '2026-01-15',
        amount: 200000, source: 'payroll',
      } as ActualCostRef);

      const rows = await ctx.service.generateWipSchedule({
        reportType: 'wip-schedule',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        jobId: job.id,
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].jobNumber).toBe('J-001');
    });

    it('throws error for non-existent job in WIP schedule', async () => {
      await expect(
        ctx.service.generateWipSchedule({
          reportType: 'wip-schedule',
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          jobId: 'nonexistent',
        }),
      ).rejects.toThrow('Job not found');
    });
  });

  // ========================================================================
  // Job Cost Summary
  // ========================================================================

  describe('Job Cost Summary', () => {
    it('generates job cost summary with change orders', async () => {
      const job = await ctx.jobs.insert({
        number: 'J-001', name: 'Office Building', type: 'lump_sum', status: 'active',
        contractAmount: 500000, totalBudget: 400000, totalActualCost: 150000,
        totalCommitted: 50000, totalBilled: 100000, percentComplete: 30,
        retentionPct: 10, entityId: undefined,
      } as JobRef);

      await ctx.changeOrders.insert({
        jobId: job.id, number: 'CO-001', description: 'Extra work',
        amount: 50000, status: 'approved',
      } as ChangeOrderRef);

      await ctx.budgets.insert({
        jobId: job.id, name: 'Budget', status: 'approved', totalAmount: 400000,
      } as BudgetRef);

      await ctx.actualCosts.insert({
        jobId: job.id, costCodeId: 'cc1', costType: 'labor', date: '2026-01-15',
        amount: 150000, source: 'payroll',
      } as ActualCostRef);

      await ctx.committedCosts.insert({
        jobId: job.id, costCodeId: 'cc1', costType: 'material',
        amount: 50000, invoicedAmount: 0, remainingAmount: 50000, status: 'open',
      } as CommittedCostRef);

      const rows = await ctx.service.generateJobCostSummary(job.id);

      expect(rows).toHaveLength(1);
      expect(rows[0].contractAmount).toBe(500000);
      expect(rows[0].approvedChangeOrders).toBe(50000);
      expect(rows[0].revisedContract).toBe(550000);
      expect(rows[0].actualCostToDate).toBe(150000);
      expect(rows[0].committedCost).toBe(50000);
    });

    it('throws error for non-existent job', async () => {
      await expect(
        ctx.service.generateJobCostSummary('nonexistent'),
      ).rejects.toThrow('Job not found');
    });
  });

  // ========================================================================
  // Aging Reports
  // ========================================================================

  describe('Aging Reports', () => {
    it('generates AP aging report with aging buckets', async () => {
      const vendor = await ctx.apVendors.insert({
        name: 'ABC Concrete', code: 'V001', status: 'active',
      } as APVendorRef);

      // Current invoice (within 30 days of 2026-02-12)
      await ctx.apInvoices.insert({
        vendorId: vendor.id, invoiceNumber: 'INV-001',
        invoiceDate: '2026-02-01', dueDate: '2026-02-10',
        amount: 10000, paidAmount: 0, balanceDue: 10000, status: 'approved',
      } as APInvoiceRef);

      // 60-day old invoice
      await ctx.apInvoices.insert({
        vendorId: vendor.id, invoiceNumber: 'INV-002',
        invoiceDate: '2025-12-01', dueDate: '2025-12-15',
        amount: 20000, paidAmount: 0, balanceDue: 20000, status: 'approved',
      } as APInvoiceRef);

      const rows = await ctx.service.generateAgingReport('ap', '2026-02-12');

      expect(rows).toHaveLength(1);
      expect(rows[0].entityName).toBe('ABC Concrete');
      expect(rows[0].current).toBe(10000);
      expect(rows[0].days30).toBe(20000);
      expect(rows[0].days60).toBe(0);
      expect(rows[0].total).toBe(30000);
    });

    it('generates AR aging report', async () => {
      const customer = await ctx.arCustomers.insert({
        name: 'XYZ Corp', code: 'C001', status: 'active',
      } as ARCustomerRef);

      await ctx.arInvoices.insert({
        customerId: customer.id, invoiceNumber: 'AR-001',
        invoiceDate: '2026-02-01', dueDate: '2026-02-05',
        amount: 15000, paidAmount: 0, balanceDue: 15000, status: 'open',
      } as ARInvoiceRef);

      const rows = await ctx.service.generateAgingReport('ar', '2026-02-12');

      expect(rows).toHaveLength(1);
      expect(rows[0].entityName).toBe('XYZ Corp');
      expect(rows[0].current).toBe(15000);
      expect(rows[0].total).toBe(15000);
    });

    it('excludes paid invoices from aging', async () => {
      const vendor = await ctx.apVendors.insert({
        name: 'Paid Vendor', code: 'V002', status: 'active',
      } as APVendorRef);

      await ctx.apInvoices.insert({
        vendorId: vendor.id, invoiceNumber: 'INV-PAID',
        invoiceDate: '2026-01-01', dueDate: '2026-01-15',
        amount: 10000, paidAmount: 10000, balanceDue: 0, status: 'paid',
      } as APInvoiceRef);

      const rows = await ctx.service.generateAgingReport('ap', '2026-02-12');
      expect(rows).toHaveLength(0);
    });
  });

  // ========================================================================
  // Payroll Summary
  // ========================================================================

  describe('Payroll Summary', () => {
    it('generates payroll summary for completed pay runs', async () => {
      const employee = await ctx.employees.insert({
        firstName: 'John', lastName: 'Doe', status: 'active',
        department: 'Field', payType: 'hourly', payRate: 35,
      } as EmployeeRef);

      const payRun = await ctx.payRuns.insert({
        periodStart: '2026-01-01', periodEnd: '2026-01-15',
        payDate: '2026-01-17', status: 'completed',
        totalGross: 5600, totalNet: 4000, totalTaxes: 1200,
        totalDeductions: 400, employeeCount: 1,
      } as PayRunRef);

      await ctx.payChecks.insert({
        payRunId: payRun.id, employeeId: employee.id,
        grossPay: 5600, federalTax: 700, stateTax: 200,
        localTax: 0, ficaSS: 347.2, ficaMed: 81.2,
        totalDeductions: 400, netPay: 3871.6,
        hours: 160, overtimeHours: 0,
      } as PayCheckRef);

      const rows = await ctx.service.generatePayrollSummary('2026-01-01', '2026-01-31');

      expect(rows).toHaveLength(1);
      expect(rows[0].employeeName).toBe('Doe, John');
      expect(rows[0].department).toBe('Field');
      expect(rows[0].totalGross).toBe(5600);
      expect(rows[0].totalHours).toBe(160);
    });

    it('returns empty array when no completed pay runs exist', async () => {
      const rows = await ctx.service.generatePayrollSummary('2026-01-01', '2026-01-31');
      expect(rows).toEqual([]);
    });
  });

  // ========================================================================
  // Equipment Utilization
  // ========================================================================

  describe('Equipment Utilization', () => {
    it('generates equipment utilization report', async () => {
      const equip = await ctx.equipment!.insert({
        code: 'EQ-001', name: 'Excavator CAT 320',
        type: 'heavy', status: 'active', hourlyRate: 150,
      } as EquipmentRef);

      await ctx.equipmentUsage!.insert({
        equipmentId: equip.id, jobId: 'job-1',
        date: '2026-01-10', hours: 8, cost: 1200,
      } as EquipmentUsageRef);

      await ctx.equipmentUsage!.insert({
        equipmentId: equip.id, jobId: 'job-2',
        date: '2026-01-11', hours: 6, cost: 900,
      } as EquipmentUsageRef);

      const rows = await ctx.service.generateEquipmentUtilization('2026-01-01', '2026-01-31');

      expect(rows).toHaveLength(1);
      expect(rows[0].equipmentCode).toBe('EQ-001');
      expect(rows[0].totalHours).toBe(14);
      expect(rows[0].totalCost).toBe(2100);
      expect(rows[0].jobBreakdown).toHaveLength(2);
    });

    it('returns empty array when no equipment collections', async () => {
      // Create a service without equipment collections
      const noEquipEvents = new EventBus();

      const noEquipService = new ReportsService(
        ctx.accounts, ctx.journalEntries, ctx.journalLines, ctx.fiscalPeriods,
        ctx.apInvoices, ctx.apVendors, ctx.arInvoices, ctx.arCustomers,
        ctx.payRuns, ctx.payChecks, ctx.employees,
        ctx.jobs, ctx.actualCosts, ctx.budgets, ctx.budgetLines,
        ctx.committedCosts, ctx.changeOrders, ctx.costCodes,
        ctx.templates, noEquipEvents,
      );

      const rows = await noEquipService.generateEquipmentUtilization('2026-01-01', '2026-01-31');
      expect(rows).toEqual([]);
    });
  });

  // ========================================================================
  // Bonding Capacity
  // ========================================================================

  describe('Bonding Capacity', () => {
    it('generates bonding capacity analysis', async () => {
      // Create balance sheet accounts
      const cashAccount = await ctx.accounts.insert({
        number: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit',
        isActive: true, depth: 0, path: '1000', isSummary: false,
      } as GLAccountRef);

      const liabilityAccount = await ctx.accounts.insert({
        number: '2000', name: 'Accounts Payable', type: 'liability', normalBalance: 'credit',
        isActive: true, depth: 0, path: '2000', isSummary: false,
      } as GLAccountRef);

      const je = await ctx.journalEntries.insert({
        entryNumber: 'JE-001', date: '2026-01-15', status: 'posted',
        totalDebit: 500000, totalCredit: 500000, isAutoGenerated: false,
      } as GLJournalEntryRef);

      await ctx.journalLines.insert({
        journalEntryId: je.id, accountId: cashAccount.id, debit: 500000, credit: 0, lineOrder: 1,
      } as GLJournalLineRef);

      await ctx.journalLines.insert({
        journalEntryId: je.id, accountId: liabilityAccount.id, debit: 0, credit: 200000, lineOrder: 2,
      } as GLJournalLineRef);

      const result = await ctx.service.generateBondingCapacity();

      expect(result.totalAssets).toBe(500000);
      expect(result.totalLiabilities).toBe(200000);
      expect(result.netWorth).toBe(300000);
      expect(result.workingCapital).toBe(300000);
      expect(result.aggregateBondingLimit).toBe(3000000); // 10x working capital
      expect(result.singleJobLimit).toBe(1000000); // aggregate / 3
    });
  });

  // ========================================================================
  // Report Templates CRUD
  // ========================================================================

  describe('Report Templates', () => {
    it('creates a report template', async () => {
      const template = await ctx.service.createTemplate({
        name: 'Monthly P&L',
        reportType: 'income-statement',
        description: 'Standard monthly profit and loss report',
        columns: ['accountNumber', 'accountName', 'currentAmount'],
        filters: [{ field: 'category', operator: '=', value: 'expense' }],
        groupBy: ['category'],
        sortBy: [{ field: 'accountNumber', direction: 'asc' }],
        isDefault: true,
      });

      expect(template.name).toBe('Monthly P&L');
      expect(template.reportType).toBe('income-statement');
      expect(template.columns).toHaveLength(3);
      expect(template.filters).toHaveLength(1);
      expect(template.groupBy).toHaveLength(1);
      expect(template.isDefault).toBe(true);
    });

    it('retrieves templates by report type', async () => {
      await ctx.service.createTemplate({
        name: 'BS Template', reportType: 'balance-sheet',
        columns: ['accountNumber'], filters: [], groupBy: [],
        sortBy: [],
      });

      await ctx.service.createTemplate({
        name: 'IS Template', reportType: 'income-statement',
        columns: ['accountNumber'], filters: [], groupBy: [],
        sortBy: [],
      });

      const bsTemplates = await ctx.service.getTemplates('balance-sheet');
      expect(bsTemplates).toHaveLength(1);
      expect(bsTemplates[0].name).toBe('BS Template');

      const allTemplates = await ctx.service.getTemplates();
      expect(allTemplates).toHaveLength(2);
    });

    it('deletes a report template', async () => {
      const template = await ctx.service.createTemplate({
        name: 'To Delete', reportType: 'balance-sheet',
        columns: [], filters: [], groupBy: [], sortBy: [],
      });

      await ctx.service.deleteTemplate(template.id);

      const result = await ctx.service.getTemplate(template.id);
      expect(result).toBeNull();
    });

    it('throws error when deleting non-existent template', async () => {
      await expect(
        ctx.service.deleteTemplate('nonexistent'),
      ).rejects.toThrow('Report template not found');
    });

    it('updates a report template', async () => {
      const template = await ctx.service.createTemplate({
        name: 'Original', reportType: 'balance-sheet',
        columns: ['accountNumber'], filters: [], groupBy: [], sortBy: [],
      });

      const updated = await ctx.service.updateTemplate(template.id, {
        name: 'Updated Name',
        columns: ['accountNumber', 'accountName', 'currentBalance'],
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.columns).toHaveLength(3);
    });
  });

  // ========================================================================
  // Events
  // ========================================================================

  describe('Events', () => {
    it('emits reports.generated event for balance sheet', async () => {
      await ctx.accounts.insert({
        number: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit',
        isActive: true, depth: 0, path: '1000', isSummary: false,
      } as GLAccountRef);

      let emitted = false;
      ctx.events.on('reports.generated', () => { emitted = true; });

      await ctx.service.generateBalanceSheet({
        reportType: 'balance-sheet',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      });

      expect(emitted).toBe(true);
    });

    it('emits reports.template.created event', async () => {
      let emitted = false;
      ctx.events.on('reports.template.created', () => { emitted = true; });

      await ctx.service.createTemplate({
        name: 'Test', reportType: 'balance-sheet',
        columns: [], filters: [], groupBy: [], sortBy: [],
      });

      expect(emitted).toBe(true);
    });
  });
});
