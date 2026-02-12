/**
 * Contract module collection schemas.
 * contract, sov, amendment, milestone, closeout, warranty.
 */

import type { SchemaDef } from '../../types/schema';

export const contractSchemas: SchemaDef[] = [
  {
    collection: 'contract/contract',
    module: 'contract',
    version: 1,
    fields: [
      { name: 'number', type: 'string', required: true, label: 'Contract Number' },
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'amount', type: 'currency', required: true, label: 'Contract Amount' },
      { name: 'status', type: 'enum', enum: ['draft', 'executed', 'active', 'complete', 'closed'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'contract/sov',
    module: 'contract',
    version: 1,
    fields: [
      { name: 'contractId', type: 'id', required: true, label: 'Contract' },
      { name: 'lineNumber', type: 'number', required: true, label: 'Line Number' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'scheduledValue', type: 'currency', required: true, label: 'Scheduled Value' },
    ],
    relations: [
      { foreignKey: 'contractId', collection: 'contract/contract', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'contract/amendment',
    module: 'contract',
    version: 1,
    fields: [
      { name: 'contractId', type: 'id', required: true, label: 'Contract' },
      { name: 'number', type: 'number', required: true, label: 'Amendment Number' },
      { name: 'amountChange', type: 'currency', label: 'Amount Change' },
      { name: 'status', type: 'enum', enum: ['pending', 'approved', 'rejected'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'contractId', collection: 'contract/contract', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'contract/milestone',
    module: 'contract',
    version: 1,
    fields: [
      { name: 'contractId', type: 'id', required: true, label: 'Contract' },
      { name: 'name', type: 'string', required: true, label: 'Milestone Name' },
      { name: 'dueDate', type: 'date', label: 'Due Date' },
      { name: 'status', type: 'enum', enum: ['upcoming', 'reached', 'missed'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'contractId', collection: 'contract/contract', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'contract/closeout',
    module: 'contract',
    version: 1,
    fields: [
      { name: 'contractId', type: 'id', required: true, label: 'Contract' },
      { name: 'status', type: 'enum', enum: ['pending', 'in-progress', 'complete'], label: 'Status' },
      { name: 'completionDate', type: 'date', label: 'Completion Date' },
    ],
    relations: [
      { foreignKey: 'contractId', collection: 'contract/contract', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'contract/warranty',
    module: 'contract',
    version: 1,
    fields: [
      { name: 'contractId', type: 'id', required: true, label: 'Contract' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'startDate', type: 'date', label: 'Start Date' },
      { name: 'expirationDate', type: 'date', label: 'Expiration Date' },
    ],
    relations: [
      { foreignKey: 'contractId', collection: 'contract/contract', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
