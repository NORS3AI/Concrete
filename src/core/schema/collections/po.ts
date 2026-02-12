/**
 * Purchase Order module collection schemas (v2).
 * purchaseOrder, poLine, receipt, receiptLine, amendment.
 *
 * Enhanced for Phase 10 with full PO lifecycle support including
 * approval workflow, three-way matching, blanket/service PO types,
 * and change order management.
 */

import type { SchemaDef } from '../../types/schema';

export const poSchemas: SchemaDef[] = [
  {
    collection: 'po/purchaseOrder',
    module: 'po',
    version: 2,
    fields: [
      { name: 'vendorId', type: 'id', required: true, label: 'Vendor' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'entityId', type: 'id', label: 'Entity' },
      { name: 'poNumber', type: 'string', required: true, label: 'PO Number' },
      { name: 'type', type: 'enum', enum: ['standard', 'blanket', 'service'], required: true, label: 'PO Type' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'taxAmount', type: 'currency', label: 'Tax Amount' },
      { name: 'shippingAmount', type: 'currency', label: 'Shipping Amount' },
      { name: 'totalAmount', type: 'currency', label: 'Total Amount' },
      { name: 'status', type: 'enum', enum: ['draft', 'pending_approval', 'approved', 'partial_receipt', 'received', 'closed', 'cancelled'], required: true, label: 'Status' },
      { name: 'terms', type: 'string', label: 'Terms' },
      { name: 'shipTo', type: 'string', label: 'Ship To' },
      { name: 'approvedBy', type: 'string', label: 'Approved By' },
      { name: 'approvedAt', type: 'date', label: 'Approved At' },
      { name: 'issuedDate', type: 'date', label: 'Issued Date' },
      { name: 'expectedDate', type: 'date', label: 'Expected Date' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
      { foreignKey: 'entityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'nullify' },
    ],
    indexes: [
      { fields: ['poNumber'], unique: true, name: 'idx_po_number' },
      { fields: ['vendorId'], name: 'idx_po_vendor' },
      { fields: ['jobId'], name: 'idx_po_job' },
      { fields: ['status'], name: 'idx_po_status' },
    ],
  },
  {
    collection: 'po/poLine',
    module: 'po',
    version: 2,
    fields: [
      { name: 'purchaseOrderId', type: 'id', required: true, label: 'Purchase Order' },
      { name: 'lineNumber', type: 'number', required: true, label: 'Line Number' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'costCodeId', type: 'id', label: 'Cost Code' },
      { name: 'costType', type: 'enum', enum: ['labor', 'material', 'subcontract', 'equipment', 'other', 'overhead'], label: 'Cost Type' },
      { name: 'quantity', type: 'number', required: true, label: 'Quantity' },
      { name: 'unitCost', type: 'currency', required: true, label: 'Unit Cost' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'receivedQuantity', type: 'number', label: 'Received Quantity' },
      { name: 'invoicedQuantity', type: 'number', label: 'Invoiced Quantity' },
      { name: 'glAccountId', type: 'id', label: 'GL Account' },
    ],
    relations: [
      { foreignKey: 'purchaseOrderId', collection: 'po/purchaseOrder', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'costCodeId', collection: 'job/costCode', type: 'belongsTo', cascade: 'nullify' },
      { foreignKey: 'glAccountId', collection: 'gl/account', type: 'belongsTo', cascade: 'nullify' },
    ],
    indexes: [
      { fields: ['purchaseOrderId'], name: 'idx_poline_po' },
      { fields: ['costCodeId'], name: 'idx_poline_costcode' },
    ],
  },
  {
    collection: 'po/receipt',
    module: 'po',
    version: 2,
    fields: [
      { name: 'purchaseOrderId', type: 'id', required: true, label: 'Purchase Order' },
      { name: 'receiptNumber', type: 'string', required: true, label: 'Receipt Number' },
      { name: 'receivedDate', type: 'date', required: true, label: 'Received Date' },
      { name: 'receivedBy', type: 'string', label: 'Received By' },
      { name: 'notes', type: 'string', label: 'Notes' },
      { name: 'status', type: 'enum', enum: ['partial', 'complete'], required: true, label: 'Status' },
    ],
    relations: [
      { foreignKey: 'purchaseOrderId', collection: 'po/purchaseOrder', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['purchaseOrderId'], name: 'idx_receipt_po' },
      { fields: ['receiptNumber'], unique: true, name: 'idx_receipt_number' },
    ],
  },
  {
    collection: 'po/receiptLine',
    module: 'po',
    version: 2,
    fields: [
      { name: 'receiptId', type: 'id', required: true, label: 'Receipt' },
      { name: 'poLineId', type: 'id', required: true, label: 'PO Line' },
      { name: 'quantity', type: 'number', required: true, label: 'Quantity Received' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'condition', type: 'enum', enum: ['good', 'damaged', 'rejected'], required: true, label: 'Condition' },
    ],
    relations: [
      { foreignKey: 'receiptId', collection: 'po/receipt', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'poLineId', collection: 'po/poLine', type: 'belongsTo', cascade: 'restrict' },
    ],
    indexes: [
      { fields: ['receiptId'], name: 'idx_receiptline_receipt' },
      { fields: ['poLineId'], name: 'idx_receiptline_poline' },
    ],
  },
  {
    collection: 'po/amendment',
    module: 'po',
    version: 2,
    fields: [
      { name: 'purchaseOrderId', type: 'id', required: true, label: 'Purchase Order' },
      { name: 'amendmentNumber', type: 'number', required: true, label: 'Amendment Number' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'amountChange', type: 'currency', required: true, label: 'Amount Change' },
      { name: 'newTotal', type: 'currency', required: true, label: 'New Total' },
      { name: 'reason', type: 'string', label: 'Reason' },
      { name: 'status', type: 'enum', enum: ['pending', 'approved', 'rejected'], required: true, label: 'Status' },
      { name: 'approvedBy', type: 'string', label: 'Approved By' },
      { name: 'approvedAt', type: 'date', label: 'Approved At' },
    ],
    relations: [
      { foreignKey: 'purchaseOrderId', collection: 'po/purchaseOrder', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['purchaseOrderId'], name: 'idx_amendment_po' },
      { fields: ['status'], name: 'idx_amendment_status' },
    ],
  },
];
