/**
 * Payroll module collection schemas (v2).
 * Enhanced schemas for: employee, timeEntry, payRun, payCheck, earning,
 * deduction, benefit, taxTable, taxFiling, workerComp.
 */

import type { SchemaDef } from '../../types/schema';

export const payrollSchemas: SchemaDef[] = [
  // =========================================================================
  // payroll/employee
  // =========================================================================
  {
    collection: 'payroll/employee',
    module: 'payroll',
    version: 2,
    fields: [
      { name: 'firstName', type: 'string', required: true, label: 'First Name' },
      { name: 'lastName', type: 'string', required: true, label: 'Last Name' },
      { name: 'middleName', type: 'string', label: 'Middle Name' },
      { name: 'ssn', type: 'string', required: true, label: 'SSN' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive', 'terminated'], required: true, label: 'Status' },
      { name: 'hireDate', type: 'date', required: true, label: 'Hire Date' },
      { name: 'terminationDate', type: 'date', label: 'Termination Date' },
      { name: 'department', type: 'string', label: 'Department' },
      { name: 'jobTitle', type: 'string', label: 'Job Title' },
      { name: 'payType', type: 'enum', enum: ['hourly', 'salary'], required: true, label: 'Pay Type' },
      { name: 'payRate', type: 'currency', required: true, label: 'Pay Rate' },
      { name: 'payFrequency', type: 'enum', enum: ['weekly', 'biweekly', 'semimonthly', 'monthly'], required: true, label: 'Pay Frequency' },
      { name: 'federalFilingStatus', type: 'string', label: 'Federal Filing Status' },
      { name: 'stateFilingStatus', type: 'string', label: 'State Filing Status' },
      { name: 'allowances', type: 'number', label: 'Allowances' },
      { name: 'entityId', type: 'id', label: 'Entity' },
      { name: 'unionId', type: 'string', label: 'Union Affiliation' },
      { name: 'wcClassCode', type: 'string', label: 'WC Class Code' },
      { name: 'address', type: 'string', label: 'Address' },
      { name: 'city', type: 'string', label: 'City' },
      { name: 'state', type: 'string', label: 'State' },
      { name: 'zip', type: 'string', label: 'ZIP Code' },
      { name: 'phone', type: 'string', label: 'Phone' },
      { name: 'email', type: 'string', label: 'Email' },
      { name: 'emergencyContact', type: 'string', label: 'Emergency Contact' },
    ],
    relations: [
      { foreignKey: 'entityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'nullify' },
    ],
    indexes: [
      { fields: ['ssn'], unique: true, name: 'idx_employee_ssn' },
      { fields: ['status'], name: 'idx_employee_status' },
      { fields: ['entityId'], name: 'idx_employee_entity' },
      { fields: ['department'], name: 'idx_employee_department' },
    ],
  },

  // =========================================================================
  // payroll/timeEntry
  // =========================================================================
  {
    collection: 'payroll/timeEntry',
    module: 'payroll',
    version: 2,
    fields: [
      { name: 'employeeId', type: 'id', required: true, label: 'Employee' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'costCodeId', type: 'id', label: 'Cost Code' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'hours', type: 'number', required: true, label: 'Hours' },
      { name: 'payType', type: 'enum', enum: ['regular', 'overtime', 'doubletime', 'premium', 'perdiem'], required: true, label: 'Pay Type' },
      { name: 'workClassification', type: 'string', label: 'Work Classification' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'approved', type: 'boolean', label: 'Approved' },
      { name: 'approvedBy', type: 'string', label: 'Approved By' },
    ],
    relations: [
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
    indexes: [
      { fields: ['employeeId'], name: 'idx_timeEntry_employee' },
      { fields: ['jobId'], name: 'idx_timeEntry_job' },
      { fields: ['date'], name: 'idx_timeEntry_date' },
      { fields: ['approved'], name: 'idx_timeEntry_approved' },
    ],
  },

  // =========================================================================
  // payroll/payRun
  // =========================================================================
  {
    collection: 'payroll/payRun',
    module: 'payroll',
    version: 2,
    fields: [
      { name: 'periodStart', type: 'date', required: true, label: 'Period Start' },
      { name: 'periodEnd', type: 'date', required: true, label: 'Period End' },
      { name: 'payDate', type: 'date', required: true, label: 'Pay Date' },
      { name: 'status', type: 'enum', enum: ['draft', 'processing', 'completed', 'voided'], required: true, label: 'Status' },
      { name: 'totalGross', type: 'currency', label: 'Total Gross' },
      { name: 'totalNet', type: 'currency', label: 'Total Net' },
      { name: 'totalTaxes', type: 'currency', label: 'Total Taxes' },
      { name: 'totalDeductions', type: 'currency', label: 'Total Deductions' },
      { name: 'employeeCount', type: 'number', label: 'Employee Count' },
      { name: 'entityId', type: 'id', label: 'Entity' },
    ],
    relations: [
      { foreignKey: 'entityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'nullify' },
    ],
    indexes: [
      { fields: ['status'], name: 'idx_payRun_status' },
      { fields: ['payDate'], name: 'idx_payRun_payDate' },
      { fields: ['entityId'], name: 'idx_payRun_entity' },
    ],
  },

  // =========================================================================
  // payroll/payCheck
  // =========================================================================
  {
    collection: 'payroll/payCheck',
    module: 'payroll',
    version: 2,
    fields: [
      { name: 'payRunId', type: 'id', required: true, label: 'Pay Run' },
      { name: 'employeeId', type: 'id', required: true, label: 'Employee' },
      { name: 'grossPay', type: 'currency', required: true, label: 'Gross Pay' },
      { name: 'federalTax', type: 'currency', label: 'Federal Tax' },
      { name: 'stateTax', type: 'currency', label: 'State Tax' },
      { name: 'localTax', type: 'currency', label: 'Local Tax' },
      { name: 'ficaSS', type: 'currency', label: 'FICA SS' },
      { name: 'ficaMed', type: 'currency', label: 'FICA Medicare' },
      { name: 'totalDeductions', type: 'currency', label: 'Total Deductions' },
      { name: 'netPay', type: 'currency', required: true, label: 'Net Pay' },
      { name: 'hours', type: 'number', label: 'Regular Hours' },
      { name: 'overtimeHours', type: 'number', label: 'Overtime Hours' },
    ],
    relations: [
      { foreignKey: 'payRunId', collection: 'payroll/payRun', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'restrict' },
    ],
    indexes: [
      { fields: ['payRunId'], name: 'idx_payCheck_payRun' },
      { fields: ['employeeId'], name: 'idx_payCheck_employee' },
    ],
  },

  // =========================================================================
  // payroll/earning
  // =========================================================================
  {
    collection: 'payroll/earning',
    module: 'payroll',
    version: 2,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Earning Name' },
      { name: 'code', type: 'string', required: true, label: 'Earning Code' },
      { name: 'type', type: 'enum', enum: ['regular', 'overtime', 'doubletime', 'premium', 'perdiem', 'piecerate', 'commission'], required: true, label: 'Earning Type' },
      { name: 'multiplier', type: 'number', label: 'Rate Multiplier' },
      { name: 'isTaxable', type: 'boolean', label: 'Is Taxable' },
      { name: 'isOvertime', type: 'boolean', label: 'Is Overtime' },
    ],
    relations: [],
    indexes: [
      { fields: ['code'], unique: true, name: 'idx_earning_code' },
      { fields: ['type'], name: 'idx_earning_type' },
    ],
  },

  // =========================================================================
  // payroll/deduction
  // =========================================================================
  {
    collection: 'payroll/deduction',
    module: 'payroll',
    version: 2,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Deduction Name' },
      { name: 'code', type: 'string', required: true, label: 'Deduction Code' },
      { name: 'type', type: 'enum', enum: ['pretax', 'posttax', 'garnishment'], required: true, label: 'Deduction Type' },
      { name: 'method', type: 'enum', enum: ['flat', 'percent'], required: true, label: 'Calculation Method' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'maxPerPeriod', type: 'currency', label: 'Max Per Period' },
      { name: 'maxPerYear', type: 'currency', label: 'Max Per Year' },
    ],
    relations: [],
    indexes: [
      { fields: ['code'], unique: true, name: 'idx_deduction_code' },
      { fields: ['type'], name: 'idx_deduction_type' },
    ],
  },

  // =========================================================================
  // payroll/benefit
  // =========================================================================
  {
    collection: 'payroll/benefit',
    module: 'payroll',
    version: 2,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Benefit Name' },
      { name: 'code', type: 'string', required: true, label: 'Benefit Code' },
      { name: 'type', type: 'enum', enum: ['health', 'dental', 'vision', 'life', 'retirement', 'hsa', 'fsa', 'other'], required: true, label: 'Benefit Type' },
      { name: 'employeeContribution', type: 'currency', label: 'Employee Contribution' },
      { name: 'employerContribution', type: 'currency', label: 'Employer Contribution' },
      { name: 'method', type: 'enum', enum: ['flat', 'percent'], required: true, label: 'Calculation Method' },
    ],
    relations: [],
    indexes: [
      { fields: ['code'], unique: true, name: 'idx_benefit_code' },
      { fields: ['type'], name: 'idx_benefit_type' },
    ],
  },

  // =========================================================================
  // payroll/taxTable
  // =========================================================================
  {
    collection: 'payroll/taxTable',
    module: 'payroll',
    version: 2,
    fields: [
      { name: 'jurisdiction', type: 'enum', enum: ['federal', 'state', 'local'], required: true, label: 'Jurisdiction' },
      { name: 'state', type: 'string', label: 'State' },
      { name: 'locality', type: 'string', label: 'Locality' },
      { name: 'year', type: 'number', required: true, label: 'Tax Year' },
      { name: 'type', type: 'enum', enum: ['income', 'fica_ss', 'fica_med', 'futa', 'suta'], required: true, label: 'Tax Type' },
      { name: 'rate', type: 'percentage', required: true, label: 'Rate' },
      { name: 'wageBase', type: 'currency', label: 'Wage Base' },
      { name: 'filingStatus', type: 'string', label: 'Filing Status' },
    ],
    relations: [],
    indexes: [
      { fields: ['jurisdiction', 'type', 'year'], name: 'idx_taxTable_jurisdiction_type_year' },
      { fields: ['state'], name: 'idx_taxTable_state' },
    ],
  },

  // =========================================================================
  // payroll/taxFiling
  // =========================================================================
  {
    collection: 'payroll/taxFiling',
    module: 'payroll',
    version: 2,
    fields: [
      { name: 'type', type: 'enum', enum: ['941', '940', 'w2', 'state_quarterly'], required: true, label: 'Filing Type' },
      { name: 'period', type: 'string', required: true, label: 'Period' },
      { name: 'year', type: 'number', required: true, label: 'Tax Year' },
      { name: 'quarter', type: 'number', label: 'Quarter' },
      { name: 'status', type: 'enum', enum: ['draft', 'filed'], required: true, label: 'Status' },
      { name: 'totalWages', type: 'currency', label: 'Total Wages' },
      { name: 'totalTax', type: 'currency', label: 'Total Tax' },
      { name: 'dueDate', type: 'date', label: 'Due Date' },
    ],
    relations: [],
    indexes: [
      { fields: ['type', 'year', 'quarter'], name: 'idx_taxFiling_type_year_quarter' },
      { fields: ['status'], name: 'idx_taxFiling_status' },
    ],
  },

  // =========================================================================
  // payroll/workerComp
  // =========================================================================
  {
    collection: 'payroll/workerComp',
    module: 'payroll',
    version: 2,
    fields: [
      { name: 'classCode', type: 'string', required: true, label: 'Class Code' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'rate', type: 'percentage', required: true, label: 'Rate' },
      { name: 'stateCode', type: 'string', label: 'State Code' },
      { name: 'effectiveDate', type: 'date', label: 'Effective Date' },
      { name: 'expirationDate', type: 'date', label: 'Expiration Date' },
    ],
    relations: [],
    indexes: [
      { fields: ['classCode'], name: 'idx_workerComp_classCode' },
      { fields: ['stateCode'], name: 'idx_workerComp_state' },
    ],
  },
];
