/**
 * Entity module collection schemas (Phase 2 — Multi-Entity & Company Structure).
 * entity, hierarchy, alias, config, intercompany.
 */

import type { SchemaDef } from '../../types/schema';

export const entitySchemas: SchemaDef[] = [
  {
    collection: 'entity/entity',
    module: 'entity',
    version: 2,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Entity Name' },
      { name: 'code', type: 'string', required: true, label: 'Entity Code' },
      {
        name: 'type',
        type: 'enum',
        enum: [
          'holding',
          'operating',
          'subsidiary',
          'division',
          'branch',
          'joint_venture',
          'spe',
        ],
        required: true,
        label: 'Entity Type',
      },
      { name: 'parentId', type: 'id', label: 'Parent Entity' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive'], label: 'Status' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'taxId', type: 'string', label: 'Tax ID / EIN' },
      { name: 'address', type: 'string', label: 'Address' },
      { name: 'city', type: 'string', label: 'City' },
      { name: 'state', type: 'string', label: 'State' },
      { name: 'zip', type: 'string', label: 'ZIP' },
      { name: 'country', type: 'string', label: 'Country' },
      { name: 'phone', type: 'string', label: 'Phone' },
      { name: 'email', type: 'string', label: 'Email' },
      { name: 'currency', type: 'string', label: 'Currency Code' },
      { name: 'fiscalYearEndMonth', type: 'number', label: 'Fiscal Year End Month' },
      { name: 'fiscalYearEndDay', type: 'number', label: 'Fiscal Year End Day' },
      { name: 'depth', type: 'number', label: 'Hierarchy Depth' },
      { name: 'path', type: 'string', label: 'Hierarchy Path' },
      { name: 'clonedFromId', type: 'id', label: 'Cloned From' },
    ],
    relations: [
      { foreignKey: 'parentId', collection: 'entity/entity', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'entity/hierarchy',
    module: 'entity',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Hierarchy Name' },
      { name: 'rootEntityId', type: 'id', required: true, label: 'Root Entity' },
      { name: 'type', type: 'enum', enum: ['legal', 'management', 'reporting'], label: 'Hierarchy Type' },
    ],
    relations: [
      { foreignKey: 'rootEntityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'entity/alias',
    module: 'entity',
    version: 1,
    fields: [
      { name: 'entityId', type: 'id', required: true, label: 'Entity' },
      { name: 'alias', type: 'string', required: true, label: 'Alias Name' },
      { name: 'source', type: 'string', label: 'Source System' },
    ],
    relations: [
      { foreignKey: 'entityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'entity/coaOverride',
    module: 'entity',
    version: 1,
    fields: [
      { name: 'entityId', type: 'id', required: true, label: 'Entity' },
      { name: 'accountId', type: 'id', required: true, label: 'GL Account' },
      { name: 'overrideName', type: 'string', label: 'Override Name' },
      { name: 'isExcluded', type: 'boolean', label: 'Excluded from Entity COA' },
      { name: 'defaultValue', type: 'currency', label: 'Default Value' },
    ],
    relations: [
      { foreignKey: 'entityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'accountId', collection: 'gl/account', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'entity/intercompany',
    module: 'entity',
    version: 1,
    fields: [
      { name: 'fromEntityId', type: 'id', required: true, label: 'From Entity' },
      { name: 'toEntityId', type: 'id', required: true, label: 'To Entity' },
      { name: 'date', type: 'date', required: true, label: 'Transaction Date' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'fromJournalEntryId', type: 'id', label: 'From JE' },
      { name: 'toJournalEntryId', type: 'id', label: 'To JE' },
      { name: 'eliminationJournalEntryId', type: 'id', label: 'Elimination JE' },
      { name: 'status', type: 'enum', enum: ['pending', 'posted', 'eliminated'], label: 'Status' },
      { name: 'reference', type: 'string', label: 'Reference' },
    ],
    relations: [
      { foreignKey: 'fromEntityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'toEntityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'fromJournalEntryId', collection: 'gl/journalEntry', type: 'belongsTo', cascade: 'nullify' },
      { foreignKey: 'toJournalEntryId', collection: 'gl/journalEntry', type: 'belongsTo', cascade: 'nullify' },
      { foreignKey: 'eliminationJournalEntryId', collection: 'gl/journalEntry', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
];
