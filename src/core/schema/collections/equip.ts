/**
 * Equipment module collection schemas.
 * equipment, rateTable, usage, maintenance, workOrder, fuelLog, depreciation.
 */

import type { SchemaDef } from '../../types/schema';

export const equipSchemas: SchemaDef[] = [
  {
    collection: 'equip/equipment',
    module: 'equip',
    version: 1,
    fields: [
      { name: 'code', type: 'string', required: true, label: 'Equipment Code' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'status', type: 'enum', enum: ['available', 'in-use', 'maintenance', 'retired'], label: 'Status' },
      { name: 'category', type: 'string', label: 'Category' },
    ],
    relations: [],
  },
  {
    collection: 'equip/rateTable',
    module: 'equip',
    version: 1,
    fields: [
      { name: 'equipmentId', type: 'id', required: true, label: 'Equipment' },
      { name: 'hourlyRate', type: 'currency', label: 'Hourly Rate' },
      { name: 'dailyRate', type: 'currency', label: 'Daily Rate' },
      { name: 'effectiveDate', type: 'date', label: 'Effective Date' },
    ],
    relations: [
      { foreignKey: 'equipmentId', collection: 'equip/equipment', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'equip/usage',
    module: 'equip',
    version: 1,
    fields: [
      { name: 'equipmentId', type: 'id', required: true, label: 'Equipment' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'hours', type: 'number', label: 'Hours Used' },
    ],
    relations: [
      { foreignKey: 'equipmentId', collection: 'equip/equipment', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'equip/maintenance',
    module: 'equip',
    version: 1,
    fields: [
      { name: 'equipmentId', type: 'id', required: true, label: 'Equipment' },
      { name: 'type', type: 'enum', enum: ['preventive', 'corrective', 'inspection'], label: 'Maintenance Type' },
      { name: 'scheduledDate', type: 'date', label: 'Scheduled Date' },
      { name: 'status', type: 'enum', enum: ['scheduled', 'in-progress', 'complete'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'equipmentId', collection: 'equip/equipment', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'equip/workOrder',
    module: 'equip',
    version: 1,
    fields: [
      { name: 'equipmentId', type: 'id', required: true, label: 'Equipment' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'priority', type: 'enum', enum: ['low', 'medium', 'high', 'urgent'], label: 'Priority' },
      { name: 'status', type: 'enum', enum: ['open', 'assigned', 'in-progress', 'complete'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'equipmentId', collection: 'equip/equipment', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'equip/fuelLog',
    module: 'equip',
    version: 1,
    fields: [
      { name: 'equipmentId', type: 'id', required: true, label: 'Equipment' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'gallons', type: 'number', required: true, label: 'Gallons' },
      { name: 'cost', type: 'currency', label: 'Cost' },
    ],
    relations: [
      { foreignKey: 'equipmentId', collection: 'equip/equipment', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'equip/depreciation',
    module: 'equip',
    version: 1,
    fields: [
      { name: 'equipmentId', type: 'id', required: true, label: 'Equipment' },
      { name: 'method', type: 'enum', enum: ['straight-line', 'declining-balance', 'units-of-production'], label: 'Method' },
      { name: 'currentValue', type: 'currency', label: 'Current Value' },
      { name: 'usefulLife', type: 'number', label: 'Useful Life (months)' },
    ],
    relations: [
      { foreignKey: 'equipmentId', collection: 'equip/equipment', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
