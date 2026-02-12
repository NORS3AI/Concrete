/**
 * Equipment module collection schemas (v2).
 * Enhanced schemas for: equipment, rateTable, usage, maintenance,
 * workOrder, fuelLog, depreciation.
 *
 * Phase 8 — Equipment Management
 */

import type { SchemaDef } from '../../types/schema';

export const equipSchemas: SchemaDef[] = [
  // -------------------------------------------------------------------------
  // equip/equipment — Equipment master record
  // -------------------------------------------------------------------------
  {
    collection: 'equip/equipment',
    module: 'equip',
    version: 2,
    fields: [
      { name: 'equipmentNumber', type: 'string', required: true, label: 'Equipment Number' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'year', type: 'number', label: 'Year' },
      { name: 'make', type: 'string', label: 'Make' },
      { name: 'model', type: 'string', label: 'Model' },
      { name: 'serialNumber', type: 'string', label: 'Serial Number' },
      { name: 'vin', type: 'string', label: 'VIN' },
      { name: 'licensePlate', type: 'string', label: 'License Plate' },
      {
        name: 'category',
        type: 'enum',
        enum: ['owned', 'leased', 'rented', 'idle'],
        required: true,
        label: 'Category',
      },
      {
        name: 'status',
        type: 'enum',
        enum: ['active', 'inactive', 'disposed'],
        required: true,
        label: 'Status',
      },
      { name: 'entityId', type: 'id', label: 'Entity' },
      { name: 'purchaseDate', type: 'date', label: 'Purchase Date' },
      { name: 'purchasePrice', type: 'currency', label: 'Purchase Price' },
      { name: 'currentValue', type: 'currency', label: 'Current Value' },
      { name: 'salvageValue', type: 'currency', label: 'Salvage Value' },
      { name: 'usefulLifeMonths', type: 'number', label: 'Useful Life (Months)' },
      {
        name: 'depreciationMethod',
        type: 'enum',
        enum: ['straight_line', 'macrs', 'declining_balance'],
        label: 'Depreciation Method',
      },
      { name: 'assignedJobId', type: 'id', label: 'Assigned Job' },
      { name: 'meterReading', type: 'number', label: 'Meter Reading' },
      {
        name: 'meterUnit',
        type: 'enum',
        enum: ['hours', 'miles'],
        label: 'Meter Unit',
      },
      { name: 'locationDescription', type: 'string', label: 'Location Description' },
    ],
    relations: [
      { foreignKey: 'entityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'nullify' },
      { foreignKey: 'assignedJobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
    indexes: [
      { fields: ['equipmentNumber'], unique: true, name: 'idx_equipment_number' },
      { fields: ['category'], name: 'idx_equipment_category' },
      { fields: ['status'], name: 'idx_equipment_status' },
    ],
  },

  // -------------------------------------------------------------------------
  // equip/rateTable — Equipment rate tables with effective dates
  // -------------------------------------------------------------------------
  {
    collection: 'equip/rateTable',
    module: 'equip',
    version: 2,
    fields: [
      { name: 'equipmentId', type: 'id', required: true, label: 'Equipment' },
      { name: 'effectiveDate', type: 'date', required: true, label: 'Effective Date' },
      { name: 'hourlyRate', type: 'currency', label: 'Hourly Rate' },
      { name: 'dailyRate', type: 'currency', label: 'Daily Rate' },
      { name: 'weeklyRate', type: 'currency', label: 'Weekly Rate' },
      { name: 'monthlyRate', type: 'currency', label: 'Monthly Rate' },
      { name: 'operatorIncluded', type: 'boolean', label: 'Operator Included' },
      { name: 'fhwaRate', type: 'currency', label: 'FHWA Rate' },
      { name: 'notes', type: 'string', label: 'Notes' },
    ],
    relations: [
      { foreignKey: 'equipmentId', collection: 'equip/equipment', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['equipmentId', 'effectiveDate'], name: 'idx_rate_equip_date' },
    ],
  },

  // -------------------------------------------------------------------------
  // equip/usage — Equipment usage log (hours/days on jobs)
  // -------------------------------------------------------------------------
  {
    collection: 'equip/usage',
    module: 'equip',
    version: 2,
    fields: [
      { name: 'equipmentId', type: 'id', required: true, label: 'Equipment' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'costCodeId', type: 'id', label: 'Cost Code' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'hours', type: 'number', label: 'Hours' },
      { name: 'days', type: 'number', label: 'Days' },
      { name: 'rate', type: 'currency', label: 'Rate' },
      { name: 'amount', type: 'currency', label: 'Amount' },
      { name: 'operatorId', type: 'id', label: 'Operator' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'posted', type: 'boolean', label: 'Posted' },
    ],
    relations: [
      { foreignKey: 'equipmentId', collection: 'equip/equipment', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
    indexes: [
      { fields: ['equipmentId', 'date'], name: 'idx_usage_equip_date' },
      { fields: ['jobId', 'date'], name: 'idx_usage_job_date' },
      { fields: ['posted'], name: 'idx_usage_posted' },
    ],
  },

  // -------------------------------------------------------------------------
  // equip/maintenance — Maintenance schedule records
  // -------------------------------------------------------------------------
  {
    collection: 'equip/maintenance',
    module: 'equip',
    version: 2,
    fields: [
      { name: 'equipmentId', type: 'id', required: true, label: 'Equipment' },
      {
        name: 'type',
        type: 'enum',
        enum: ['preventive', 'repair', 'inspection'],
        required: true,
        label: 'Maintenance Type',
      },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'scheduledDate', type: 'date', label: 'Scheduled Date' },
      { name: 'completedDate', type: 'date', label: 'Completed Date' },
      { name: 'cost', type: 'currency', label: 'Cost' },
      { name: 'vendorId', type: 'id', label: 'Vendor' },
      { name: 'meterAtService', type: 'number', label: 'Meter at Service' },
      { name: 'nextServiceMeter', type: 'number', label: 'Next Service Meter' },
      { name: 'nextServiceDate', type: 'date', label: 'Next Service Date' },
      {
        name: 'status',
        type: 'enum',
        enum: ['scheduled', 'in_progress', 'completed', 'overdue'],
        required: true,
        label: 'Status',
      },
    ],
    relations: [
      { foreignKey: 'equipmentId', collection: 'equip/equipment', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'nullify' },
    ],
    indexes: [
      { fields: ['equipmentId', 'status'], name: 'idx_maint_equip_status' },
      { fields: ['scheduledDate'], name: 'idx_maint_scheduled' },
    ],
  },

  // -------------------------------------------------------------------------
  // equip/workOrder — Work order tracking
  // -------------------------------------------------------------------------
  {
    collection: 'equip/workOrder',
    module: 'equip',
    version: 2,
    fields: [
      { name: 'equipmentId', type: 'id', required: true, label: 'Equipment' },
      { name: 'number', type: 'string', required: true, label: 'Work Order Number' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      {
        name: 'priority',
        type: 'enum',
        enum: ['low', 'medium', 'high', 'critical'],
        required: true,
        label: 'Priority',
      },
      { name: 'assignedTo', type: 'string', label: 'Assigned To' },
      { name: 'reportedDate', type: 'date', label: 'Reported Date' },
      { name: 'completedDate', type: 'date', label: 'Completed Date' },
      { name: 'laborHours', type: 'number', label: 'Labor Hours' },
      { name: 'partsCost', type: 'currency', label: 'Parts Cost' },
      { name: 'totalCost', type: 'currency', label: 'Total Cost' },
      {
        name: 'status',
        type: 'enum',
        enum: ['open', 'in_progress', 'completed', 'cancelled'],
        required: true,
        label: 'Status',
      },
    ],
    relations: [
      { foreignKey: 'equipmentId', collection: 'equip/equipment', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['equipmentId', 'status'], name: 'idx_wo_equip_status' },
      { fields: ['number'], unique: true, name: 'idx_wo_number' },
    ],
  },

  // -------------------------------------------------------------------------
  // equip/fuelLog — Fuel consumption tracking
  // -------------------------------------------------------------------------
  {
    collection: 'equip/fuelLog',
    module: 'equip',
    version: 2,
    fields: [
      { name: 'equipmentId', type: 'id', required: true, label: 'Equipment' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'gallons', type: 'number', required: true, label: 'Gallons' },
      { name: 'costPerGallon', type: 'currency', label: 'Cost Per Gallon' },
      { name: 'totalCost', type: 'currency', label: 'Total Cost' },
      { name: 'meterReading', type: 'number', label: 'Meter Reading' },
      { name: 'locationDescription', type: 'string', label: 'Location' },
      { name: 'vendorName', type: 'string', label: 'Vendor Name' },
    ],
    relations: [
      { foreignKey: 'equipmentId', collection: 'equip/equipment', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['equipmentId', 'date'], name: 'idx_fuel_equip_date' },
    ],
  },

  // -------------------------------------------------------------------------
  // equip/depreciation — Depreciation period records
  // -------------------------------------------------------------------------
  {
    collection: 'equip/depreciation',
    module: 'equip',
    version: 2,
    fields: [
      { name: 'equipmentId', type: 'id', required: true, label: 'Equipment' },
      { name: 'periodStart', type: 'date', required: true, label: 'Period Start' },
      { name: 'periodEnd', type: 'date', required: true, label: 'Period End' },
      {
        name: 'method',
        type: 'enum',
        enum: ['straight_line', 'macrs', 'declining_balance'],
        required: true,
        label: 'Method',
      },
      { name: 'beginningValue', type: 'currency', label: 'Beginning Value' },
      { name: 'depreciationAmount', type: 'currency', label: 'Depreciation Amount' },
      { name: 'accumulatedDepreciation', type: 'currency', label: 'Accumulated Depreciation' },
      { name: 'endingValue', type: 'currency', label: 'Ending Value' },
    ],
    relations: [
      { foreignKey: 'equipmentId', collection: 'equip/equipment', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['equipmentId', 'periodStart'], name: 'idx_depr_equip_period' },
    ],
  },
];
