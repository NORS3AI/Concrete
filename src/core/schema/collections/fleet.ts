/**
 * Fleet module collection schemas.
 * asset, inspection, fuelCard, assignment, depreciation.
 */

import type { SchemaDef } from '../../types/schema';

export const fleetSchemas: SchemaDef[] = [
  {
    collection: 'fleet/asset',
    module: 'fleet',
    version: 1,
    fields: [
      { name: 'vin', type: 'string', required: true, label: 'VIN' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'type', type: 'enum', enum: ['truck', 'van', 'trailer', 'car', 'heavy-equipment'], label: 'Vehicle Type' },
      { name: 'status', type: 'enum', enum: ['active', 'maintenance', 'retired'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'fleet/inspection',
    module: 'fleet',
    version: 1,
    fields: [
      { name: 'assetId', type: 'id', required: true, label: 'Fleet Asset' },
      { name: 'date', type: 'date', required: true, label: 'Inspection Date' },
      { name: 'type', type: 'enum', enum: ['pre-trip', 'post-trip', 'annual', 'dot'], label: 'Inspection Type' },
      { name: 'result', type: 'enum', enum: ['pass', 'fail', 'conditional'], label: 'Result' },
    ],
    relations: [
      { foreignKey: 'assetId', collection: 'fleet/asset', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'fleet/fuelCard',
    module: 'fleet',
    version: 1,
    fields: [
      { name: 'cardNumber', type: 'string', required: true, label: 'Card Number' },
      { name: 'assetId', type: 'id', label: 'Assigned Vehicle' },
      { name: 'status', type: 'enum', enum: ['active', 'suspended', 'cancelled'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'assetId', collection: 'fleet/asset', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'fleet/assignment',
    module: 'fleet',
    version: 1,
    fields: [
      { name: 'assetId', type: 'id', required: true, label: 'Fleet Asset' },
      { name: 'employeeId', type: 'id', required: true, label: 'Employee' },
      { name: 'startDate', type: 'date', required: true, label: 'Start Date' },
      { name: 'endDate', type: 'date', label: 'End Date' },
    ],
    relations: [
      { foreignKey: 'assetId', collection: 'fleet/asset', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'fleet/depreciation',
    module: 'fleet',
    version: 1,
    fields: [
      { name: 'assetId', type: 'id', required: true, label: 'Fleet Asset' },
      { name: 'method', type: 'enum', enum: ['straight-line', 'declining-balance', 'mileage-based'], label: 'Method' },
      { name: 'currentValue', type: 'currency', label: 'Current Value' },
      { name: 'usefulLife', type: 'number', label: 'Useful Life (months)' },
    ],
    relations: [
      { foreignKey: 'assetId', collection: 'fleet/asset', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
