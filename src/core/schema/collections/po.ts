/**
 * Purchase Order module collection schemas.
 * purchaseOrder, poLine, receipt, receiptLine, amendment.
 */

import type { SchemaDef } from '../../types/schema';

export const poSchemas: SchemaDef[] = [
  {
    collection: 'po/purchaseOrder',
    module: 'po',
    version: 1,
    fields: [
      { name: 'number', type: 'string', required: true, label: 'PO Number' },
      { name: 'vendorId', type: 'id', required: true, label: 'Vendor' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'status', type: 'enum', enum: ['draft', 'issued', 'partial', 'received', 'closed', 'cancelled'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'po/poLine',
    module: 'po',
    version: 1,
    fields: [
      { name: 'purchaseOrderId', type: 'id', required: true, label: 'Purchase Order' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'quantity', type: 'number', required: true, label: 'Quantity' },
      { name: 'unitPrice', type: 'currency', required: true, label: 'Unit Price' },
    ],
    relations: [
      { foreignKey: 'purchaseOrderId', collection: 'po/purchaseOrder', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'po/receipt',
    module: 'po',
    version: 1,
    fields: [
      { name: 'purchaseOrderId', type: 'id', required: true, label: 'Purchase Order' },
      { name: 'date', type: 'date', required: true, label: 'Receipt Date' },
      { name: 'receivedBy', type: 'string', label: 'Received By' },
    ],
    relations: [
      { foreignKey: 'purchaseOrderId', collection: 'po/purchaseOrder', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'po/receiptLine',
    module: 'po',
    version: 1,
    fields: [
      { name: 'receiptId', type: 'id', required: true, label: 'Receipt' },
      { name: 'poLineId', type: 'id', required: true, label: 'PO Line' },
      { name: 'quantityReceived', type: 'number', required: true, label: 'Quantity Received' },
    ],
    relations: [
      { foreignKey: 'receiptId', collection: 'po/receipt', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'poLineId', collection: 'po/poLine', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'po/amendment',
    module: 'po',
    version: 1,
    fields: [
      { name: 'purchaseOrderId', type: 'id', required: true, label: 'Purchase Order' },
      { name: 'number', type: 'number', required: true, label: 'Amendment Number' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'amountChange', type: 'currency', label: 'Amount Change' },
    ],
    relations: [
      { foreignKey: 'purchaseOrderId', collection: 'po/purchaseOrder', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
