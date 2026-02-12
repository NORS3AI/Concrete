/**
 * Union / Prevailing Wage module collection schemas (v2).
 * Enhanced schemas for union master file, rate tables, fringe benefits,
 * prevailing wage, certified payroll (WH-347), apprentice tracking, and remittances.
 */

import type { SchemaDef } from '../../types/schema';

export const unionSchemas: SchemaDef[] = [
  // -------------------------------------------------------------------------
  // union/union — Union master file
  // -------------------------------------------------------------------------
  {
    collection: 'union/union',
    module: 'union',
    version: 2,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Union Name' },
      { name: 'localNumber', type: 'string', required: true, label: 'Local Number' },
      { name: 'trade', type: 'string', required: true, label: 'Trade' },
      { name: 'jurisdiction', type: 'string', label: 'Jurisdiction' },
      { name: 'contactName', type: 'string', label: 'Contact Name' },
      { name: 'contactPhone', type: 'string', label: 'Contact Phone' },
      { name: 'contactEmail', type: 'string', label: 'Contact Email' },
      { name: 'address', type: 'string', label: 'Address' },
      { name: 'city', type: 'string', label: 'City' },
      { name: 'state', type: 'string', label: 'State' },
      { name: 'zip', type: 'string', label: 'ZIP' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive'], required: true, label: 'Status' },
    ],
    relations: [],
    indexes: [
      { fields: ['localNumber'], unique: true, name: 'idx_union_localNumber' },
      { fields: ['trade'], name: 'idx_union_trade' },
      { fields: ['status'], name: 'idx_union_status' },
    ],
  },

  // -------------------------------------------------------------------------
  // union/rateTable — Union pay scale table header
  // -------------------------------------------------------------------------
  {
    collection: 'union/rateTable',
    module: 'union',
    version: 2,
    fields: [
      { name: 'unionId', type: 'id', required: true, label: 'Union' },
      { name: 'name', type: 'string', required: true, label: 'Rate Table Name' },
      { name: 'effectiveDate', type: 'date', required: true, label: 'Effective Date' },
      { name: 'expirationDate', type: 'date', label: 'Expiration Date' },
      { name: 'classification', type: 'string', required: true, label: 'Classification' },
      { name: 'journeymanRate', type: 'currency', label: 'Journeyman Rate' },
      { name: 'apprenticePct', type: 'percentage', label: 'Apprentice Percentage' },
      { name: 'status', type: 'enum', enum: ['active', 'expired'], required: true, label: 'Status' },
    ],
    relations: [
      { foreignKey: 'unionId', collection: 'union/union', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['unionId', 'classification', 'effectiveDate'], name: 'idx_rateTable_lookup' },
      { fields: ['status'], name: 'idx_rateTable_status' },
    ],
  },

  // -------------------------------------------------------------------------
  // union/rateTableLine — Individual line items within a rate table
  // -------------------------------------------------------------------------
  {
    collection: 'union/rateTableLine',
    module: 'union',
    version: 2,
    fields: [
      { name: 'rateTableId', type: 'id', required: true, label: 'Rate Table' },
      { name: 'category', type: 'enum', enum: ['base_wage', 'fringe', 'vacation', 'training', 'pension', 'annuity', 'health', 'other'], required: true, label: 'Category' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'rate', type: 'currency', required: true, label: 'Rate' },
      { name: 'method', type: 'enum', enum: ['hourly', 'percent', 'flat'], required: true, label: 'Method' },
      { name: 'payableTo', type: 'enum', enum: ['employee', 'fund'], required: true, label: 'Payable To' },
      { name: 'fundName', type: 'string', label: 'Fund Name' },
    ],
    relations: [
      { foreignKey: 'rateTableId', collection: 'union/rateTable', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['rateTableId'], name: 'idx_rateTableLine_rateTableId' },
      { fields: ['category'], name: 'idx_rateTableLine_category' },
    ],
  },

  // -------------------------------------------------------------------------
  // union/fringeBenefit — Fringe benefit configuration per union
  // -------------------------------------------------------------------------
  {
    collection: 'union/fringeBenefit',
    module: 'union',
    version: 2,
    fields: [
      { name: 'unionId', type: 'id', required: true, label: 'Union' },
      { name: 'name', type: 'string', required: true, label: 'Benefit Name' },
      { name: 'rate', type: 'currency', required: true, label: 'Rate' },
      { name: 'method', type: 'enum', enum: ['hourly', 'percent'], required: true, label: 'Method' },
      { name: 'payableTo', type: 'enum', enum: ['employee', 'fund'], required: true, label: 'Payable To' },
      { name: 'allocationMethod', type: 'enum', enum: ['cash', 'plan', 'split'], required: true, label: 'Allocation Method' },
      { name: 'fundName', type: 'string', label: 'Fund Name' },
      { name: 'fundAddress', type: 'string', label: 'Fund Address' },
      { name: 'fundAccountNumber', type: 'string', label: 'Fund Account Number' },
    ],
    relations: [
      { foreignKey: 'unionId', collection: 'union/union', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['unionId'], name: 'idx_fringeBenefit_unionId' },
    ],
  },

  // -------------------------------------------------------------------------
  // union/prevailingWage — Prevailing wage rate tables by jurisdiction
  // -------------------------------------------------------------------------
  {
    collection: 'union/prevailingWage',
    module: 'union',
    version: 2,
    fields: [
      { name: 'jurisdiction', type: 'string', required: true, label: 'Jurisdiction' },
      { name: 'state', type: 'string', required: true, label: 'State' },
      { name: 'county', type: 'string', label: 'County' },
      { name: 'projectType', type: 'enum', enum: ['federal', 'state', 'local'], required: true, label: 'Project Type' },
      { name: 'classification', type: 'string', required: true, label: 'Classification' },
      { name: 'trade', type: 'string', required: true, label: 'Trade' },
      { name: 'baseRate', type: 'currency', required: true, label: 'Base Rate' },
      { name: 'fringeRate', type: 'currency', required: true, label: 'Fringe Rate' },
      { name: 'totalRate', type: 'currency', required: true, label: 'Total Rate' },
      { name: 'effectiveDate', type: 'date', required: true, label: 'Effective Date' },
      { name: 'expirationDate', type: 'date', label: 'Expiration Date' },
      { name: 'source', type: 'enum', enum: ['davis_bacon', 'state', 'local'], required: true, label: 'Source' },
    ],
    relations: [],
    indexes: [
      { fields: ['jurisdiction', 'classification', 'effectiveDate'], name: 'idx_prevWage_lookup' },
      { fields: ['state', 'county'], name: 'idx_prevWage_location' },
      { fields: ['source'], name: 'idx_prevWage_source' },
    ],
  },

  // -------------------------------------------------------------------------
  // union/certifiedPayroll — Certified payroll report (WH-347)
  // -------------------------------------------------------------------------
  {
    collection: 'union/certifiedPayroll',
    module: 'union',
    version: 2,
    fields: [
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'weekEndingDate', type: 'date', required: true, label: 'Week Ending Date' },
      { name: 'contractorName', type: 'string', required: true, label: 'Contractor Name' },
      { name: 'projectName', type: 'string', required: true, label: 'Project Name' },
      { name: 'projectNumber', type: 'string', label: 'Project Number' },
      { name: 'reportNumber', type: 'string', label: 'Report Number' },
      { name: 'status', type: 'enum', enum: ['draft', 'submitted', 'approved'], required: true, label: 'Status' },
      { name: 'totalGross', type: 'currency', required: true, label: 'Total Gross' },
      { name: 'totalFringe', type: 'currency', required: true, label: 'Total Fringe' },
      { name: 'totalNet', type: 'currency', required: true, label: 'Total Net' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'restrict' },
    ],
    indexes: [
      { fields: ['jobId', 'weekEndingDate'], name: 'idx_certPayroll_jobWeek' },
      { fields: ['status'], name: 'idx_certPayroll_status' },
    ],
  },

  // -------------------------------------------------------------------------
  // union/apprentice — Apprentice tracking and ratio compliance
  // -------------------------------------------------------------------------
  {
    collection: 'union/apprentice',
    module: 'union',
    version: 2,
    fields: [
      { name: 'employeeId', type: 'id', required: true, label: 'Employee' },
      { name: 'unionId', type: 'id', required: true, label: 'Union' },
      { name: 'trade', type: 'string', required: true, label: 'Trade' },
      { name: 'startDate', type: 'date', required: true, label: 'Start Date' },
      { name: 'periodNumber', type: 'number', required: true, label: 'Period Number' },
      { name: 'totalPeriods', type: 'number', required: true, label: 'Total Periods' },
      { name: 'currentRatio', type: 'number', label: 'Current Ratio' },
      { name: 'requiredRatio', type: 'number', label: 'Required Ratio' },
      { name: 'status', type: 'enum', enum: ['active', 'completed', 'terminated'], required: true, label: 'Status' },
    ],
    relations: [
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'unionId', collection: 'union/union', type: 'belongsTo', cascade: 'restrict' },
    ],
    indexes: [
      { fields: ['employeeId'], name: 'idx_apprentice_employeeId' },
      { fields: ['unionId'], name: 'idx_apprentice_unionId' },
      { fields: ['status'], name: 'idx_apprentice_status' },
    ],
  },

  // -------------------------------------------------------------------------
  // union/remittance — Union remittance report
  // -------------------------------------------------------------------------
  {
    collection: 'union/remittance',
    module: 'union',
    version: 2,
    fields: [
      { name: 'unionId', type: 'id', required: true, label: 'Union' },
      { name: 'periodStart', type: 'date', required: true, label: 'Period Start' },
      { name: 'periodEnd', type: 'date', required: true, label: 'Period End' },
      { name: 'dueDate', type: 'date', label: 'Due Date' },
      { name: 'totalHours', type: 'number', required: true, label: 'Total Hours' },
      { name: 'totalAmount', type: 'currency', required: true, label: 'Total Amount' },
      { name: 'status', type: 'enum', enum: ['draft', 'submitted', 'paid'], required: true, label: 'Status' },
      { name: 'employeeCount', type: 'number', label: 'Employee Count' },
    ],
    relations: [
      { foreignKey: 'unionId', collection: 'union/union', type: 'belongsTo', cascade: 'restrict' },
    ],
    indexes: [
      { fields: ['unionId', 'periodEnd'], name: 'idx_remittance_unionPeriod' },
      { fields: ['status'], name: 'idx_remittance_status' },
    ],
  },
];
