/**
 * Accounts Payable module collection schemas.
 * vendor, invoice, invoiceLine, payment, paymentLine, lienWaiver, complianceCert, retention.
 */

import type { SchemaDef } from '../../types/schema';

export const apSchemas: SchemaDef[] = [
  {
    collection: 'ap/vendor',
    module: 'ap',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Vendor Name' },
      { name: 'taxId', type: 'string', label: 'Tax ID' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive', 'hold'], label: 'Status' },
      { name: 'defaultTerms', type: 'string', label: 'Default Terms' },
    ],
    relations: [],
  },
  {
    collection: 'ap/invoice',
    module: 'ap',
    version: 1,
    fields: [
      { name: 'vendorId', type: 'id', required: true, label: 'Vendor' },
      { name: 'invoiceNumber', type: 'string', required: true, label: 'Invoice Number' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'status', type: 'enum', enum: ['draft', 'pending', 'approved', 'paid', 'voided'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'ap/invoiceLine',
    module: 'ap',
    version: 1,
    fields: [
      { name: 'invoiceId', type: 'id', required: true, label: 'Invoice' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'costCodeId', type: 'id', label: 'Cost Code' },
    ],
    relations: [
      { foreignKey: 'invoiceId', collection: 'ap/invoice', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'costCodeId', collection: 'job/costCode', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'ap/payment',
    module: 'ap',
    version: 1,
    fields: [
      { name: 'vendorId', type: 'id', required: true, label: 'Vendor' },
      { name: 'date', type: 'date', required: true, label: 'Payment Date' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'method', type: 'enum', enum: ['check', 'ach', 'wire', 'credit-card'], label: 'Method' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'ap/paymentLine',
    module: 'ap',
    version: 1,
    fields: [
      { name: 'paymentId', type: 'id', required: true, label: 'Payment' },
      { name: 'invoiceId', type: 'id', required: true, label: 'Invoice' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount Applied' },
    ],
    relations: [
      { foreignKey: 'paymentId', collection: 'ap/payment', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'invoiceId', collection: 'ap/invoice', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'ap/lienWaiver',
    module: 'ap',
    version: 1,
    fields: [
      { name: 'vendorId', type: 'id', required: true, label: 'Vendor' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'type', type: 'enum', enum: ['conditional', 'unconditional', 'partial', 'final'], label: 'Waiver Type' },
      { name: 'status', type: 'enum', enum: ['requested', 'received', 'expired'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'ap/complianceCert',
    module: 'ap',
    version: 1,
    fields: [
      { name: 'vendorId', type: 'id', required: true, label: 'Vendor' },
      { name: 'type', type: 'string', required: true, label: 'Certificate Type' },
      { name: 'expirationDate', type: 'date', label: 'Expiration Date' },
      { name: 'status', type: 'enum', enum: ['valid', 'expired', 'pending'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'ap/retention',
    module: 'ap',
    version: 1,
    fields: [
      { name: 'invoiceId', type: 'id', required: true, label: 'Invoice' },
      { name: 'amount', type: 'currency', required: true, label: 'Retained Amount' },
      { name: 'releaseDate', type: 'date', label: 'Release Date' },
      { name: 'status', type: 'enum', enum: ['held', 'released', 'partial'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'invoiceId', collection: 'ap/invoice', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
