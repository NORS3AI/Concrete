/**
 * Subcontract module collection schemas (v2).
 * Enhanced schemas for: subcontract, changeOrder, payApp, backcharge,
 * prequalification, compliance.
 *
 * Phase 9 -- Subcontractor Management
 */

import type { SchemaDef } from '../../types/schema';

export const subSchemas: SchemaDef[] = [
  // =========================================================================
  // sub/subcontract
  // =========================================================================
  {
    collection: 'sub/subcontract',
    module: 'sub',
    version: 2,
    fields: [
      { name: 'vendorId', type: 'id', required: true, label: 'Subcontractor (Vendor)' },
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'number', type: 'string', required: true, label: 'Subcontract Number' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'scope', type: 'string', label: 'Scope of Work' },
      { name: 'contractAmount', type: 'currency', required: true, label: 'Original Contract Amount' },
      { name: 'retentionPct', type: 'percentage', label: 'Retention %' },
      { name: 'startDate', type: 'date', label: 'Start Date' },
      { name: 'endDate', type: 'date', label: 'End Date' },
      { name: 'status', type: 'enum', enum: ['draft', 'active', 'complete', 'closed', 'terminated'], label: 'Status' },
      { name: 'approvedChangeOrders', type: 'currency', label: 'Approved Change Orders Total' },
      { name: 'revisedAmount', type: 'currency', label: 'Revised Contract Amount' },
      { name: 'billedToDate', type: 'currency', label: 'Billed to Date' },
      { name: 'paidToDate', type: 'currency', label: 'Paid to Date' },
      { name: 'retainageHeld', type: 'currency', label: 'Retainage Held' },
      { name: 'entityId', type: 'id', label: 'Entity' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'restrict' },
    ],
    indexes: [
      { fields: ['jobId', 'number'], unique: true, name: 'idx_sub_job_number' },
      { fields: ['vendorId'], name: 'idx_sub_vendor' },
      { fields: ['status'], name: 'idx_sub_status' },
    ],
  },

  // =========================================================================
  // sub/changeOrder
  // =========================================================================
  {
    collection: 'sub/changeOrder',
    module: 'sub',
    version: 2,
    fields: [
      { name: 'subcontractId', type: 'id', required: true, label: 'Subcontract' },
      { name: 'number', type: 'number', required: true, label: 'CO Number' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'type', type: 'enum', enum: ['addition', 'deduction', 'time_extension'], required: true, label: 'Type' },
      { name: 'status', type: 'enum', enum: ['pending', 'approved', 'rejected'], label: 'Status' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'approvedAt', type: 'date', label: 'Approved At' },
      { name: 'approvedBy', type: 'string', label: 'Approved By' },
    ],
    relations: [
      { foreignKey: 'subcontractId', collection: 'sub/subcontract', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['subcontractId', 'number'], unique: true, name: 'idx_co_sub_number' },
      { fields: ['status'], name: 'idx_co_status' },
    ],
  },

  // =========================================================================
  // sub/payApp
  // =========================================================================
  {
    collection: 'sub/payApp',
    module: 'sub',
    version: 2,
    fields: [
      { name: 'subcontractId', type: 'id', required: true, label: 'Subcontract' },
      { name: 'applicationNumber', type: 'number', required: true, label: 'Application Number' },
      { name: 'periodTo', type: 'date', required: true, label: 'Period To' },
      { name: 'previouslyBilled', type: 'currency', label: 'Previously Billed' },
      { name: 'currentBilled', type: 'currency', required: true, label: 'Current Billed' },
      { name: 'materialStored', type: 'currency', label: 'Material Stored' },
      { name: 'totalBilled', type: 'currency', label: 'Total Completed & Stored' },
      { name: 'retainageAmount', type: 'currency', label: 'Retainage Amount' },
      { name: 'netPayable', type: 'currency', label: 'Net Payable' },
      { name: 'status', type: 'enum', enum: ['draft', 'submitted', 'approved', 'paid'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'subcontractId', collection: 'sub/subcontract', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['subcontractId', 'applicationNumber'], unique: true, name: 'idx_payapp_sub_appnum' },
      { fields: ['status'], name: 'idx_payapp_status' },
    ],
  },

  // =========================================================================
  // sub/backcharge
  // =========================================================================
  {
    collection: 'sub/backcharge',
    module: 'sub',
    version: 2,
    fields: [
      { name: 'subcontractId', type: 'id', required: true, label: 'Subcontract' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'category', type: 'string', label: 'Category' },
      { name: 'status', type: 'enum', enum: ['pending', 'approved', 'deducted'], label: 'Status' },
      { name: 'invoiceId', type: 'id', label: 'Related Invoice' },
    ],
    relations: [
      { foreignKey: 'subcontractId', collection: 'sub/subcontract', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['subcontractId'], name: 'idx_backcharge_sub' },
      { fields: ['status'], name: 'idx_backcharge_status' },
    ],
  },

  // =========================================================================
  // sub/prequalification
  // =========================================================================
  {
    collection: 'sub/prequalification',
    module: 'sub',
    version: 2,
    fields: [
      { name: 'vendorId', type: 'id', required: true, label: 'Subcontractor (Vendor)' },
      { name: 'submittedDate', type: 'date', label: 'Submitted Date' },
      { name: 'reviewedDate', type: 'date', label: 'Reviewed Date' },
      { name: 'score', type: 'number', label: 'Qualification Score' },
      { name: 'status', type: 'enum', enum: ['pending', 'approved', 'rejected', 'expired'], label: 'Status' },
      { name: 'emr', type: 'number', label: 'Experience Modification Rate (EMR)' },
      { name: 'bondingCapacity', type: 'currency', label: 'Bonding Capacity' },
      { name: 'yearsInBusiness', type: 'number', label: 'Years in Business' },
      { name: 'revenueAvg3Year', type: 'currency', label: '3-Year Avg Revenue' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'restrict' },
    ],
    indexes: [
      { fields: ['vendorId'], name: 'idx_prequal_vendor' },
      { fields: ['status'], name: 'idx_prequal_status' },
    ],
  },

  // =========================================================================
  // sub/compliance
  // =========================================================================
  {
    collection: 'sub/compliance',
    module: 'sub',
    version: 2,
    fields: [
      { name: 'vendorId', type: 'id', required: true, label: 'Subcontractor (Vendor)' },
      { name: 'subcontractId', type: 'id', label: 'Subcontract' },
      { name: 'type', type: 'enum', enum: ['insurance_gl', 'insurance_auto', 'insurance_umbrella', 'insurance_wc', 'license', 'bond', 'osha', 'everify', 'other'], required: true, label: 'Compliance Type' },
      { name: 'status', type: 'enum', enum: ['valid', 'expired', 'pending', 'missing'], label: 'Status' },
      { name: 'documentId', type: 'string', label: 'Document Reference' },
      { name: 'expirationDate', type: 'date', label: 'Expiration Date' },
      { name: 'notes', type: 'string', label: 'Notes' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'subcontractId', collection: 'sub/subcontract', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['vendorId'], name: 'idx_compliance_vendor' },
      { fields: ['subcontractId'], name: 'idx_compliance_sub' },
      { fields: ['type', 'status'], name: 'idx_compliance_type_status' },
      { fields: ['expirationDate'], name: 'idx_compliance_expiration' },
    ],
  },
];
