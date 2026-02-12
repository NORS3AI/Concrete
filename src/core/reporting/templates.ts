/**
 * Concrete -- Report Templates
 * Phase Zed.11 Reporting & PDF Engine
 *
 * Pre-built report definitions for the construction industry.
 * Each template defines the collection to query, columns to display,
 * default sorting, grouping, and which fields to total.
 */

import type { ReportDef } from '../types/reporting';

// ---------------------------------------------------------------------------
// Financial Reports
// ---------------------------------------------------------------------------

const trialBalance: ReportDef = {
  id: 'trial-balance',
  title: 'Trial Balance',
  subtitle: 'Debit and Credit Balances by Account',
  type: 'summary',
  collection: 'chartOfAccounts',
  columns: [
    { field: 'accountNumber', label: 'Account #', width: 90, format: 'text', align: 'left' },
    { field: 'accountName',   label: 'Account Name', format: 'text', align: 'left' },
    { field: 'accountType',   label: 'Type', width: 100, format: 'text', align: 'left' },
    { field: 'debitBalance',  label: 'Debit', width: 110, format: 'currency', align: 'right' },
    { field: 'creditBalance', label: 'Credit', width: 110, format: 'currency', align: 'right' },
  ],
  sortBy: ['accountNumber'],
  groupBy: ['accountType'],
  totals: ['debitBalance', 'creditBalance'],
};

const glDetail: ReportDef = {
  id: 'gl-detail',
  title: 'General Ledger Detail',
  subtitle: 'All Journal Entries by Account',
  type: 'detail',
  collection: 'glEntries',
  columns: [
    { field: 'date',          label: 'Date', width: 90, format: 'date', align: 'left' },
    { field: 'journalId',     label: 'Journal #', width: 90, format: 'text', align: 'left' },
    { field: 'accountNumber', label: 'Account #', width: 90, format: 'text', align: 'left' },
    { field: 'description',   label: 'Description', format: 'text', align: 'left' },
    { field: 'debit',         label: 'Debit', width: 100, format: 'currency', align: 'right' },
    { field: 'credit',        label: 'Credit', width: 100, format: 'currency', align: 'right' },
  ],
  sortBy: ['date', 'journalId'],
  groupBy: ['accountNumber'],
  totals: ['debit', 'credit'],
};

const incomeStatement: ReportDef = {
  id: 'income-statement',
  title: 'Income Statement',
  subtitle: 'Revenue, Cost of Goods Sold, and Operating Expenses',
  type: 'summary',
  collection: 'glEntries',
  columns: [
    { field: 'accountNumber', label: 'Account #', width: 90, format: 'text', align: 'left' },
    { field: 'accountName',   label: 'Account', format: 'text', align: 'left' },
    { field: 'accountType',   label: 'Category', width: 120, format: 'text', align: 'left' },
    { field: 'amount',        label: 'Amount', width: 120, format: 'currency', align: 'right' },
  ],
  sortBy: ['accountType', 'accountNumber'],
  groupBy: ['accountType'],
  totals: ['amount'],
  filters: [
    { field: 'accountType', operator: 'in', value: ['revenue', 'cogs', 'expense'] },
  ],
};

const balanceSheet: ReportDef = {
  id: 'balance-sheet',
  title: 'Balance Sheet',
  subtitle: 'Assets, Liabilities, and Equity',
  type: 'summary',
  collection: 'chartOfAccounts',
  columns: [
    { field: 'accountNumber', label: 'Account #', width: 90, format: 'text', align: 'left' },
    { field: 'accountName',   label: 'Account', format: 'text', align: 'left' },
    { field: 'accountType',   label: 'Category', width: 120, format: 'text', align: 'left' },
    { field: 'balance',       label: 'Balance', width: 130, format: 'currency', align: 'right' },
  ],
  sortBy: ['accountType', 'accountNumber'],
  groupBy: ['accountType'],
  totals: ['balance'],
  filters: [
    { field: 'accountType', operator: 'in', value: ['asset', 'liability', 'equity'] },
  ],
};

const cashFlow: ReportDef = {
  id: 'cash-flow',
  title: 'Cash Flow Statement',
  subtitle: 'Operating, Investing, and Financing Activities',
  type: 'summary',
  collection: 'glEntries',
  columns: [
    { field: 'category',    label: 'Category', width: 150, format: 'text', align: 'left' },
    { field: 'description', label: 'Description', format: 'text', align: 'left' },
    { field: 'date',        label: 'Date', width: 90, format: 'date', align: 'left' },
    { field: 'amount',      label: 'Amount', width: 130, format: 'currency', align: 'right' },
  ],
  sortBy: ['category', 'date'],
  groupBy: ['category'],
  totals: ['amount'],
  filters: [
    { field: 'cashFlowCategory', operator: 'isNotNull', value: null },
  ],
};

// ---------------------------------------------------------------------------
// Job Reports
// ---------------------------------------------------------------------------

const jobCostDetail: ReportDef = {
  id: 'job-cost-detail',
  title: 'Job Cost Detail',
  subtitle: 'Detailed Cost Transactions by Job and Cost Code',
  type: 'detail',
  collection: 'jobCostEntries',
  columns: [
    { field: 'jobId',       label: 'Job #', width: 80, format: 'text', align: 'left' },
    { field: 'jobName',     label: 'Job Name', width: 140, format: 'text', align: 'left' },
    { field: 'costCode',    label: 'Cost Code', width: 80, format: 'text', align: 'left' },
    { field: 'date',        label: 'Date', width: 85, format: 'date', align: 'left' },
    { field: 'description', label: 'Description', format: 'text', align: 'left' },
    { field: 'amount',      label: 'Amount', width: 110, format: 'currency', align: 'right' },
  ],
  sortBy: ['jobId', 'costCode', 'date'],
  groupBy: ['jobId'],
  totals: ['amount'],
};

const jobProfitability: ReportDef = {
  id: 'job-profitability',
  title: 'Job Profitability Summary',
  subtitle: 'Revenue, Cost, and Profit by Job',
  type: 'summary',
  collection: 'jobs',
  columns: [
    { field: 'jobNumber',     label: 'Job #', width: 80, format: 'text', align: 'left' },
    { field: 'name',          label: 'Job Name', format: 'text', align: 'left' },
    { field: 'contractAmount', label: 'Contract', width: 110, format: 'currency', align: 'right' },
    { field: 'totalCost',     label: 'Total Cost', width: 110, format: 'currency', align: 'right' },
    { field: 'totalBilled',   label: 'Billed', width: 110, format: 'currency', align: 'right' },
    { field: 'profitMargin',  label: 'Margin', width: 80, format: 'percentage', align: 'right' },
    { field: 'status',        label: 'Status', width: 80, format: 'text', align: 'center' },
  ],
  sortBy: ['jobNumber'],
  totals: ['contractAmount', 'totalCost', 'totalBilled'],
};

const wipSchedule: ReportDef = {
  id: 'wip-schedule',
  title: 'Work in Progress Schedule',
  subtitle: 'Over/Under Billing Analysis by Job',
  type: 'summary',
  collection: 'jobs',
  columns: [
    { field: 'jobNumber',       label: 'Job #', width: 80, format: 'text', align: 'left' },
    { field: 'name',            label: 'Job Name', format: 'text', align: 'left' },
    { field: 'contractAmount',  label: 'Contract', width: 100, format: 'currency', align: 'right' },
    { field: 'percentComplete', label: '% Complete', width: 80, format: 'percentage', align: 'right' },
    { field: 'earnedRevenue',   label: 'Earned Rev', width: 100, format: 'currency', align: 'right' },
    { field: 'totalBilled',     label: 'Billed', width: 100, format: 'currency', align: 'right' },
    { field: 'overUnderBilling', label: 'Over/Under', width: 100, format: 'currency', align: 'right' },
  ],
  sortBy: ['jobNumber'],
  totals: ['contractAmount', 'earnedRevenue', 'totalBilled', 'overUnderBilling'],
  filters: [
    { field: 'status', operator: 'in', value: ['active', 'in-progress'] },
  ],
};

// ---------------------------------------------------------------------------
// AP/AR Reports
// ---------------------------------------------------------------------------

const apAging: ReportDef = {
  id: 'ap-aging',
  title: 'AP Aging Summary',
  subtitle: 'Outstanding Payables by Aging Bucket',
  type: 'summary',
  collection: 'apInvoices',
  columns: [
    { field: 'vendorName',  label: 'Vendor', format: 'text', align: 'left' },
    { field: 'current',     label: 'Current', width: 100, format: 'currency', align: 'right' },
    { field: 'days30',      label: '1-30 Days', width: 100, format: 'currency', align: 'right' },
    { field: 'days60',      label: '31-60 Days', width: 100, format: 'currency', align: 'right' },
    { field: 'days90',      label: '61-90 Days', width: 100, format: 'currency', align: 'right' },
    { field: 'over90',      label: '90+ Days', width: 100, format: 'currency', align: 'right' },
    { field: 'totalDue',    label: 'Total', width: 110, format: 'currency', align: 'right' },
  ],
  sortBy: ['vendorName'],
  totals: ['current', 'days30', 'days60', 'days90', 'over90', 'totalDue'],
  filters: [
    { field: 'status', operator: '=', value: 'open' },
  ],
};

const arAging: ReportDef = {
  id: 'ar-aging',
  title: 'AR Aging Summary',
  subtitle: 'Outstanding Receivables by Aging Bucket',
  type: 'summary',
  collection: 'arInvoices',
  columns: [
    { field: 'customerName', label: 'Customer', format: 'text', align: 'left' },
    { field: 'current',      label: 'Current', width: 100, format: 'currency', align: 'right' },
    { field: 'days30',       label: '1-30 Days', width: 100, format: 'currency', align: 'right' },
    { field: 'days60',       label: '31-60 Days', width: 100, format: 'currency', align: 'right' },
    { field: 'days90',       label: '61-90 Days', width: 100, format: 'currency', align: 'right' },
    { field: 'over90',       label: '90+ Days', width: 100, format: 'currency', align: 'right' },
    { field: 'totalDue',     label: 'Total', width: 110, format: 'currency', align: 'right' },
  ],
  sortBy: ['customerName'],
  totals: ['current', 'days30', 'days60', 'days90', 'over90', 'totalDue'],
  filters: [
    { field: 'status', operator: '=', value: 'open' },
  ],
};

const vendorActivity: ReportDef = {
  id: 'vendor-activity',
  title: 'Vendor Activity Report',
  subtitle: 'Invoices, Payments, and Balances by Vendor',
  type: 'detail',
  collection: 'apInvoices',
  columns: [
    { field: 'vendorName',     label: 'Vendor', width: 140, format: 'text', align: 'left' },
    { field: 'invoiceNumber',  label: 'Invoice #', width: 100, format: 'text', align: 'left' },
    { field: 'invoiceDate',    label: 'Date', width: 85, format: 'date', align: 'left' },
    { field: 'dueDate',        label: 'Due Date', width: 85, format: 'date', align: 'left' },
    { field: 'amount',         label: 'Amount', width: 110, format: 'currency', align: 'right' },
    { field: 'paidAmount',     label: 'Paid', width: 110, format: 'currency', align: 'right' },
    { field: 'balance',        label: 'Balance', width: 110, format: 'currency', align: 'right' },
  ],
  sortBy: ['vendorName', 'invoiceDate'],
  groupBy: ['vendorName'],
  totals: ['amount', 'paidAmount', 'balance'],
};

// ---------------------------------------------------------------------------
// Payroll Reports
// ---------------------------------------------------------------------------

const payrollRegister: ReportDef = {
  id: 'payroll-register',
  title: 'Payroll Register',
  subtitle: 'Employee Earnings, Deductions, and Net Pay',
  type: 'detail',
  collection: 'paychecks',
  columns: [
    { field: 'employeeName',  label: 'Employee', format: 'text', align: 'left' },
    { field: 'payDate',       label: 'Pay Date', width: 85, format: 'date', align: 'left' },
    { field: 'regularHours',  label: 'Reg Hours', width: 75, format: 'number', align: 'right' },
    { field: 'overtimeHours', label: 'OT Hours', width: 75, format: 'number', align: 'right' },
    { field: 'grossPay',      label: 'Gross Pay', width: 100, format: 'currency', align: 'right' },
    { field: 'deductions',    label: 'Deductions', width: 100, format: 'currency', align: 'right' },
    { field: 'netPay',        label: 'Net Pay', width: 100, format: 'currency', align: 'right' },
  ],
  sortBy: ['payDate', 'employeeName'],
  groupBy: ['payDate'],
  totals: ['regularHours', 'overtimeHours', 'grossPay', 'deductions', 'netPay'],
};

const certifiedPayroll: ReportDef = {
  id: 'certified-payroll',
  title: 'Certified Payroll (WH-347)',
  subtitle: 'Federal Prevailing Wage Compliance Report',
  type: 'detail',
  collection: 'paychecks',
  columns: [
    { field: 'employeeName',    label: 'Name & Address', format: 'text', align: 'left' },
    { field: 'workClassification', label: 'Work Class', width: 100, format: 'text', align: 'left' },
    { field: 'regularHours',    label: 'Hours Worked', width: 80, format: 'number', align: 'right' },
    { field: 'overtimeHours',   label: 'OT Hours', width: 70, format: 'number', align: 'right' },
    { field: 'hourlyRate',      label: 'Rate', width: 80, format: 'currency', align: 'right' },
    { field: 'grossPay',        label: 'Gross', width: 100, format: 'currency', align: 'right' },
    { field: 'deductions',      label: 'Deductions', width: 90, format: 'currency', align: 'right' },
    { field: 'netPay',          label: 'Net Pay', width: 100, format: 'currency', align: 'right' },
  ],
  sortBy: ['workClassification', 'employeeName'],
  groupBy: ['workClassification'],
  totals: ['regularHours', 'overtimeHours', 'grossPay', 'deductions', 'netPay'],
  filters: [
    { field: 'prevailingWage', operator: '=', value: true },
  ],
};

// ---------------------------------------------------------------------------
// Equipment Reports
// ---------------------------------------------------------------------------

const equipmentUtilization: ReportDef = {
  id: 'equipment-utilization',
  title: 'Equipment Utilization',
  subtitle: 'Usage, Revenue, and Cost by Equipment',
  type: 'summary',
  collection: 'equipment',
  columns: [
    { field: 'equipmentNumber', label: 'Equipment #', width: 90, format: 'text', align: 'left' },
    { field: 'description',     label: 'Description', format: 'text', align: 'left' },
    { field: 'hoursUsed',       label: 'Hours Used', width: 85, format: 'number', align: 'right' },
    { field: 'hoursAvailable',  label: 'Hours Avail', width: 85, format: 'number', align: 'right' },
    { field: 'utilizationRate', label: 'Utilization', width: 80, format: 'percentage', align: 'right' },
    { field: 'revenue',         label: 'Revenue', width: 100, format: 'currency', align: 'right' },
    { field: 'operatingCost',   label: 'Op. Cost', width: 100, format: 'currency', align: 'right' },
    { field: 'netIncome',       label: 'Net', width: 100, format: 'currency', align: 'right' },
  ],
  sortBy: ['equipmentNumber'],
  totals: ['hoursUsed', 'hoursAvailable', 'revenue', 'operatingCost', 'netIncome'],
};

// ---------------------------------------------------------------------------
// Export: All report templates
// ---------------------------------------------------------------------------

export const REPORT_TEMPLATES: ReportDef[] = [
  // Financial Reports
  trialBalance,
  glDetail,
  incomeStatement,
  balanceSheet,
  cashFlow,

  // Job Reports
  jobCostDetail,
  jobProfitability,
  wipSchedule,

  // AP/AR Reports
  apAging,
  arAging,
  vendorActivity,

  // Payroll Reports
  payrollRegister,
  certifiedPayroll,

  // Equipment Reports
  equipmentUtilization,
];
