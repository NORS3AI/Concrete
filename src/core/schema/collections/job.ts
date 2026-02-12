/**
 * Job Costing module collection schemas.
 * job, costCode, budget, budgetLine, wip, estimate, estimateLine, bid.
 */

import type { SchemaDef } from '../../types/schema';

export const jobSchemas: SchemaDef[] = [
  {
    collection: 'job/job',
    module: 'job',
    version: 1,
    fields: [
      { name: 'number', type: 'string', required: true, label: 'Job Number' },
      { name: 'name', type: 'string', required: true, label: 'Job Name' },
      { name: 'status', type: 'enum', enum: ['bidding', 'awarded', 'active', 'complete', 'closed'], label: 'Status' },
      { name: 'customerId', type: 'id', label: 'Customer' },
    ],
    relations: [
      { foreignKey: 'customerId', collection: 'ar/customer', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'job/costCode',
    module: 'job',
    version: 1,
    fields: [
      { name: 'code', type: 'string', required: true, label: 'Cost Code' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'category', type: 'enum', enum: ['labor', 'material', 'equipment', 'subcontract', 'other'], label: 'Category' },
    ],
    relations: [],
  },
  {
    collection: 'job/budget',
    module: 'job',
    version: 1,
    fields: [
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'name', type: 'string', required: true, label: 'Budget Name' },
      { name: 'status', type: 'enum', enum: ['draft', 'approved', 'revised'], label: 'Status' },
      { name: 'totalAmount', type: 'currency', label: 'Total Amount' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'job/budgetLine',
    module: 'job',
    version: 1,
    fields: [
      { name: 'budgetId', type: 'id', required: true, label: 'Budget' },
      { name: 'costCodeId', type: 'id', required: true, label: 'Cost Code' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
    ],
    relations: [
      { foreignKey: 'budgetId', collection: 'job/budget', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'costCodeId', collection: 'job/costCode', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'job/wip',
    module: 'job',
    version: 1,
    fields: [
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'periodId', type: 'id', label: 'Fiscal Period' },
      { name: 'earnedRevenue', type: 'currency', label: 'Earned Revenue' },
      { name: 'actualCost', type: 'currency', label: 'Actual Cost' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'job/estimate',
    module: 'job',
    version: 1,
    fields: [
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'name', type: 'string', required: true, label: 'Estimate Name' },
      { name: 'totalAmount', type: 'currency', label: 'Total Amount' },
      { name: 'status', type: 'enum', enum: ['draft', 'submitted', 'accepted', 'rejected'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'job/estimateLine',
    module: 'job',
    version: 1,
    fields: [
      { name: 'estimateId', type: 'id', required: true, label: 'Estimate' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'quantity', type: 'number', label: 'Quantity' },
      { name: 'unitPrice', type: 'currency', label: 'Unit Price' },
    ],
    relations: [
      { foreignKey: 'estimateId', collection: 'job/estimate', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'job/bid',
    module: 'job',
    version: 1,
    fields: [
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'bidAmount', type: 'currency', required: true, label: 'Bid Amount' },
      { name: 'dueDate', type: 'date', label: 'Due Date' },
      { name: 'status', type: 'enum', enum: ['preparing', 'submitted', 'won', 'lost', 'no-bid'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
