/**
 * Banking / Cash Management module collection schemas.
 * account, statement, statementLine, reconciliation, matchRule.
 */

import type { SchemaDef } from '../../types/schema';

export const bankSchemas: SchemaDef[] = [
  {
    collection: 'bank/account',
    module: 'bank',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Account Name' },
      { name: 'accountNumber', type: 'string', required: true, label: 'Account Number' },
      { name: 'bankName', type: 'string', label: 'Bank Name' },
      { name: 'type', type: 'enum', enum: ['checking', 'savings', 'money-market', 'line-of-credit'], label: 'Account Type' },
    ],
    relations: [],
  },
  {
    collection: 'bank/statement',
    module: 'bank',
    version: 1,
    fields: [
      { name: 'accountId', type: 'id', required: true, label: 'Bank Account' },
      { name: 'periodStart', type: 'date', required: true, label: 'Period Start' },
      { name: 'periodEnd', type: 'date', required: true, label: 'Period End' },
      { name: 'endingBalance', type: 'currency', label: 'Ending Balance' },
    ],
    relations: [
      { foreignKey: 'accountId', collection: 'bank/account', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'bank/statementLine',
    module: 'bank',
    version: 1,
    fields: [
      { name: 'statementId', type: 'id', required: true, label: 'Statement' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
    ],
    relations: [
      { foreignKey: 'statementId', collection: 'bank/statement', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'bank/reconciliation',
    module: 'bank',
    version: 1,
    fields: [
      { name: 'accountId', type: 'id', required: true, label: 'Bank Account' },
      { name: 'statementId', type: 'id', label: 'Statement' },
      { name: 'date', type: 'date', required: true, label: 'Reconciliation Date' },
      { name: 'status', type: 'enum', enum: ['in-progress', 'balanced', 'unbalanced', 'posted'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'accountId', collection: 'bank/account', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'statementId', collection: 'bank/statement', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'bank/matchRule',
    module: 'bank',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Rule Name' },
      { name: 'pattern', type: 'string', required: true, label: 'Match Pattern' },
      { name: 'targetAccountId', type: 'id', label: 'Target GL Account' },
      { name: 'priority', type: 'number', label: 'Priority' },
    ],
    relations: [
      { foreignKey: 'targetAccountId', collection: 'gl/account', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
];
