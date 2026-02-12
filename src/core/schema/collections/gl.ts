/**
 * General Ledger module collection schemas.
 * account, journalEntry, journalLine, fiscalPeriod, recurringEntry, closingEntry.
 */

import type { SchemaDef } from '../../types/schema';

export const glSchemas: SchemaDef[] = [
  {
    collection: 'gl/account',
    module: 'gl',
    version: 1,
    fields: [
      { name: 'number', type: 'string', required: true, label: 'Account Number' },
      { name: 'name', type: 'string', required: true, label: 'Account Name' },
      { name: 'type', type: 'enum', enum: ['asset', 'liability', 'equity', 'revenue', 'expense'], required: true, label: 'Account Type' },
      { name: 'parentId', type: 'id', label: 'Parent Account' },
    ],
    relations: [
      { foreignKey: 'parentId', collection: 'gl/account', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'gl/journalEntry',
    module: 'gl',
    version: 1,
    fields: [
      { name: 'date', type: 'date', required: true, label: 'Entry Date' },
      { name: 'reference', type: 'string', label: 'Reference' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'status', type: 'enum', enum: ['draft', 'posted', 'voided'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'gl/journalLine',
    module: 'gl',
    version: 1,
    fields: [
      { name: 'journalEntryId', type: 'id', required: true, label: 'Journal Entry' },
      { name: 'accountId', type: 'id', required: true, label: 'Account' },
      { name: 'debit', type: 'currency', label: 'Debit' },
      { name: 'credit', type: 'currency', label: 'Credit' },
    ],
    relations: [
      { foreignKey: 'journalEntryId', collection: 'gl/journalEntry', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'accountId', collection: 'gl/account', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'gl/fiscalPeriod',
    module: 'gl',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Period Name' },
      { name: 'startDate', type: 'date', required: true, label: 'Start Date' },
      { name: 'endDate', type: 'date', required: true, label: 'End Date' },
      { name: 'status', type: 'enum', enum: ['open', 'closed', 'locked'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'gl/recurringEntry',
    module: 'gl',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Name' },
      { name: 'frequency', type: 'enum', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], label: 'Frequency' },
      { name: 'templateEntryId', type: 'id', label: 'Template Entry' },
    ],
    relations: [
      { foreignKey: 'templateEntryId', collection: 'gl/journalEntry', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'gl/closingEntry',
    module: 'gl',
    version: 1,
    fields: [
      { name: 'fiscalPeriodId', type: 'id', required: true, label: 'Fiscal Period' },
      { name: 'journalEntryId', type: 'id', required: true, label: 'Journal Entry' },
      { name: 'type', type: 'enum', enum: ['income-summary', 'retained-earnings'], label: 'Closing Type' },
    ],
    relations: [
      { foreignKey: 'fiscalPeriodId', collection: 'gl/fiscalPeriod', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'journalEntryId', collection: 'gl/journalEntry', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
