/**
 * Accounts Receivable module collection schemas.
 * customer, invoice, invoiceLine, payment, aiaApplication, retainage, billingSchedule, billingMilestone.
 */

import type { SchemaDef } from '../../types/schema';

export const arSchemas: SchemaDef[] = [
  {
    collection: 'ar/customer',
    module: 'ar',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Customer Name' },
      { name: 'contactEmail', type: 'string', label: 'Contact Email' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive', 'hold'], label: 'Status' },
      { name: 'creditLimit', type: 'currency', label: 'Credit Limit' },
    ],
    relations: [],
  },
  {
    collection: 'ar/invoice',
    module: 'ar',
    version: 1,
    fields: [
      { name: 'customerId', type: 'id', required: true, label: 'Customer' },
      { name: 'invoiceNumber', type: 'string', required: true, label: 'Invoice Number' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'status', type: 'enum', enum: ['draft', 'sent', 'partial', 'paid', 'overdue', 'voided'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'customerId', collection: 'ar/customer', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'ar/invoiceLine',
    module: 'ar',
    version: 1,
    fields: [
      { name: 'invoiceId', type: 'id', required: true, label: 'Invoice' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'quantity', type: 'number', label: 'Quantity' },
      { name: 'unitPrice', type: 'currency', label: 'Unit Price' },
    ],
    relations: [
      { foreignKey: 'invoiceId', collection: 'ar/invoice', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'ar/payment',
    module: 'ar',
    version: 1,
    fields: [
      { name: 'customerId', type: 'id', required: true, label: 'Customer' },
      { name: 'date', type: 'date', required: true, label: 'Payment Date' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'method', type: 'enum', enum: ['check', 'ach', 'wire', 'credit-card'], label: 'Method' },
    ],
    relations: [
      { foreignKey: 'customerId', collection: 'ar/customer', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'ar/aiaApplication',
    module: 'ar',
    version: 1,
    fields: [
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'applicationNumber', type: 'number', required: true, label: 'Application Number' },
      { name: 'periodTo', type: 'date', label: 'Period To' },
      { name: 'status', type: 'enum', enum: ['draft', 'submitted', 'approved', 'paid'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'ar/retainage',
    module: 'ar',
    version: 1,
    fields: [
      { name: 'invoiceId', type: 'id', required: true, label: 'Invoice' },
      { name: 'amount', type: 'currency', required: true, label: 'Retainage Amount' },
      { name: 'percentage', type: 'percentage', label: 'Retainage Percentage' },
      { name: 'status', type: 'enum', enum: ['held', 'released', 'partial'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'invoiceId', collection: 'ar/invoice', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'ar/billingSchedule',
    module: 'ar',
    version: 1,
    fields: [
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'name', type: 'string', required: true, label: 'Schedule Name' },
      { name: 'frequency', type: 'enum', enum: ['monthly', 'milestone', 'progress'], label: 'Frequency' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'ar/billingMilestone',
    module: 'ar',
    version: 1,
    fields: [
      { name: 'scheduleId', type: 'id', required: true, label: 'Billing Schedule' },
      { name: 'description', type: 'string', required: true, label: 'Milestone Description' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'status', type: 'enum', enum: ['pending', 'reached', 'billed', 'paid'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'scheduleId', collection: 'ar/billingSchedule', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
