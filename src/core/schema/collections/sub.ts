/**
 * Subcontract module collection schemas.
 * subcontract, changeOrder, payApp, backcharge, prequalification, compliance.
 */

import type { SchemaDef } from '../../types/schema';

export const subSchemas: SchemaDef[] = [
  {
    collection: 'sub/subcontract',
    module: 'sub',
    version: 1,
    fields: [
      { name: 'vendorId', type: 'id', required: true, label: 'Subcontractor' },
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'amount', type: 'currency', required: true, label: 'Contract Amount' },
      { name: 'status', type: 'enum', enum: ['draft', 'executed', 'complete', 'terminated'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'sub/changeOrder',
    module: 'sub',
    version: 1,
    fields: [
      { name: 'subcontractId', type: 'id', required: true, label: 'Subcontract' },
      { name: 'number', type: 'number', required: true, label: 'CO Number' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'status', type: 'enum', enum: ['pending', 'approved', 'rejected', 'voided'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'subcontractId', collection: 'sub/subcontract', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'sub/payApp',
    module: 'sub',
    version: 1,
    fields: [
      { name: 'subcontractId', type: 'id', required: true, label: 'Subcontract' },
      { name: 'applicationNumber', type: 'number', required: true, label: 'Application Number' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'status', type: 'enum', enum: ['draft', 'submitted', 'approved', 'paid'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'subcontractId', collection: 'sub/subcontract', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'sub/backcharge',
    module: 'sub',
    version: 1,
    fields: [
      { name: 'subcontractId', type: 'id', required: true, label: 'Subcontract' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'status', type: 'enum', enum: ['pending', 'approved', 'deducted', 'disputed'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'subcontractId', collection: 'sub/subcontract', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'sub/prequalification',
    module: 'sub',
    version: 1,
    fields: [
      { name: 'vendorId', type: 'id', required: true, label: 'Subcontractor' },
      { name: 'status', type: 'enum', enum: ['pending', 'qualified', 'disqualified', 'expired'], label: 'Status' },
      { name: 'expirationDate', type: 'date', label: 'Expiration Date' },
      { name: 'bondingCapacity', type: 'currency', label: 'Bonding Capacity' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'sub/compliance',
    module: 'sub',
    version: 1,
    fields: [
      { name: 'vendorId', type: 'id', required: true, label: 'Subcontractor' },
      { name: 'type', type: 'string', required: true, label: 'Compliance Type' },
      { name: 'status', type: 'enum', enum: ['compliant', 'non-compliant', 'pending-review'], label: 'Status' },
      { name: 'expirationDate', type: 'date', label: 'Expiration Date' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
];
