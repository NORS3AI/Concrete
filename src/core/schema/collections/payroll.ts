/**
 * Payroll module collection schemas.
 * employee, timeEntry, payRun, payCheck, earning, deduction, benefit, taxTable, taxFiling, w2, workerComp.
 */

import type { SchemaDef } from '../../types/schema';

export const payrollSchemas: SchemaDef[] = [
  {
    collection: 'payroll/employee',
    module: 'payroll',
    version: 1,
    fields: [
      { name: 'employeeNumber', type: 'string', required: true, label: 'Employee Number' },
      { name: 'name', type: 'string', required: true, label: 'Full Name' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive', 'terminated', 'leave'], label: 'Status' },
      { name: 'hireDate', type: 'date', label: 'Hire Date' },
    ],
    relations: [],
  },
  {
    collection: 'payroll/timeEntry',
    module: 'payroll',
    version: 1,
    fields: [
      { name: 'employeeId', type: 'id', required: true, label: 'Employee' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'hours', type: 'number', required: true, label: 'Hours' },
      { name: 'jobId', type: 'id', label: 'Job' },
    ],
    relations: [
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'payroll/payRun',
    module: 'payroll',
    version: 1,
    fields: [
      { name: 'periodStart', type: 'date', required: true, label: 'Period Start' },
      { name: 'periodEnd', type: 'date', required: true, label: 'Period End' },
      { name: 'status', type: 'enum', enum: ['draft', 'processing', 'approved', 'posted'], label: 'Status' },
      { name: 'totalGross', type: 'currency', label: 'Total Gross' },
    ],
    relations: [],
  },
  {
    collection: 'payroll/payCheck',
    module: 'payroll',
    version: 1,
    fields: [
      { name: 'payRunId', type: 'id', required: true, label: 'Pay Run' },
      { name: 'employeeId', type: 'id', required: true, label: 'Employee' },
      { name: 'grossPay', type: 'currency', required: true, label: 'Gross Pay' },
      { name: 'netPay', type: 'currency', required: true, label: 'Net Pay' },
    ],
    relations: [
      { foreignKey: 'payRunId', collection: 'payroll/payRun', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'payroll/earning',
    module: 'payroll',
    version: 1,
    fields: [
      { name: 'payCheckId', type: 'id', required: true, label: 'Paycheck' },
      { name: 'type', type: 'enum', enum: ['regular', 'overtime', 'bonus', 'commission', 'per-diem'], label: 'Earning Type' },
      { name: 'hours', type: 'number', label: 'Hours' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
    ],
    relations: [
      { foreignKey: 'payCheckId', collection: 'payroll/payCheck', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'payroll/deduction',
    module: 'payroll',
    version: 1,
    fields: [
      { name: 'payCheckId', type: 'id', required: true, label: 'Paycheck' },
      { name: 'type', type: 'string', required: true, label: 'Deduction Type' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'preTax', type: 'boolean', label: 'Pre-Tax' },
    ],
    relations: [
      { foreignKey: 'payCheckId', collection: 'payroll/payCheck', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'payroll/benefit',
    module: 'payroll',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Benefit Name' },
      { name: 'type', type: 'enum', enum: ['health', 'dental', 'vision', 'life', '401k', 'other'], label: 'Benefit Type' },
      { name: 'employerContribution', type: 'currency', label: 'Employer Contribution' },
    ],
    relations: [],
  },
  {
    collection: 'payroll/taxTable',
    module: 'payroll',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Tax Table Name' },
      { name: 'jurisdiction', type: 'string', required: true, label: 'Jurisdiction' },
      { name: 'effectiveDate', type: 'date', required: true, label: 'Effective Date' },
    ],
    relations: [],
  },
  {
    collection: 'payroll/taxFiling',
    module: 'payroll',
    version: 1,
    fields: [
      { name: 'type', type: 'string', required: true, label: 'Filing Type' },
      { name: 'period', type: 'string', required: true, label: 'Period' },
      { name: 'status', type: 'enum', enum: ['pending', 'filed', 'accepted', 'rejected'], label: 'Status' },
      { name: 'amount', type: 'currency', label: 'Amount' },
    ],
    relations: [],
  },
  {
    collection: 'payroll/w2',
    module: 'payroll',
    version: 1,
    fields: [
      { name: 'employeeId', type: 'id', required: true, label: 'Employee' },
      { name: 'year', type: 'number', required: true, label: 'Tax Year' },
      { name: 'wagesTips', type: 'currency', label: 'Wages & Tips' },
      { name: 'federalTax', type: 'currency', label: 'Federal Tax Withheld' },
    ],
    relations: [
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'payroll/workerComp',
    module: 'payroll',
    version: 1,
    fields: [
      { name: 'classCode', type: 'string', required: true, label: 'Class Code' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'rate', type: 'percentage', required: true, label: 'Rate' },
      { name: 'effectiveDate', type: 'date', label: 'Effective Date' },
    ],
    relations: [],
  },
];
