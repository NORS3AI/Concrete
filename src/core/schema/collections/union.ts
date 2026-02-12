/**
 * Union / Prevailing Wage module collection schemas.
 * union, rateTable, rateTableLine, fringeBenefit, prevailingWage, certifiedPayroll, apprentice, remittance.
 */

import type { SchemaDef } from '../../types/schema';

export const unionSchemas: SchemaDef[] = [
  {
    collection: 'union/union',
    module: 'union',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Union Name' },
      { name: 'localNumber', type: 'string', label: 'Local Number' },
      { name: 'trade', type: 'string', label: 'Trade' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'union/rateTable',
    module: 'union',
    version: 1,
    fields: [
      { name: 'unionId', type: 'id', required: true, label: 'Union' },
      { name: 'effectiveDate', type: 'date', required: true, label: 'Effective Date' },
      { name: 'expirationDate', type: 'date', label: 'Expiration Date' },
    ],
    relations: [
      { foreignKey: 'unionId', collection: 'union/union', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'union/rateTableLine',
    module: 'union',
    version: 1,
    fields: [
      { name: 'rateTableId', type: 'id', required: true, label: 'Rate Table' },
      { name: 'classification', type: 'string', required: true, label: 'Classification' },
      { name: 'baseRate', type: 'currency', required: true, label: 'Base Rate' },
      { name: 'overtimeRate', type: 'currency', label: 'Overtime Rate' },
    ],
    relations: [
      { foreignKey: 'rateTableId', collection: 'union/rateTable', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'union/fringeBenefit',
    module: 'union',
    version: 1,
    fields: [
      { name: 'unionId', type: 'id', required: true, label: 'Union' },
      { name: 'name', type: 'string', required: true, label: 'Benefit Name' },
      { name: 'ratePerHour', type: 'currency', required: true, label: 'Rate Per Hour' },
    ],
    relations: [
      { foreignKey: 'unionId', collection: 'union/union', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'union/prevailingWage',
    module: 'union',
    version: 1,
    fields: [
      { name: 'jurisdiction', type: 'string', required: true, label: 'Jurisdiction' },
      { name: 'classification', type: 'string', required: true, label: 'Classification' },
      { name: 'wageRate', type: 'currency', required: true, label: 'Wage Rate' },
      { name: 'effectiveDate', type: 'date', label: 'Effective Date' },
    ],
    relations: [],
  },
  {
    collection: 'union/certifiedPayroll',
    module: 'union',
    version: 1,
    fields: [
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'weekEnding', type: 'date', required: true, label: 'Week Ending' },
      { name: 'status', type: 'enum', enum: ['draft', 'certified', 'submitted'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'union/apprentice',
    module: 'union',
    version: 1,
    fields: [
      { name: 'employeeId', type: 'id', required: true, label: 'Employee' },
      { name: 'unionId', type: 'id', required: true, label: 'Union' },
      { name: 'level', type: 'number', label: 'Apprentice Level' },
      { name: 'startDate', type: 'date', label: 'Start Date' },
    ],
    relations: [
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'unionId', collection: 'union/union', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'union/remittance',
    module: 'union',
    version: 1,
    fields: [
      { name: 'unionId', type: 'id', required: true, label: 'Union' },
      { name: 'periodEnd', type: 'date', required: true, label: 'Period End' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'status', type: 'enum', enum: ['pending', 'paid', 'overdue'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'unionId', collection: 'union/union', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
];
