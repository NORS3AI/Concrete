/**
 * Entity module collection schemas.
 * entity, hierarchy, alias.
 */

import type { SchemaDef } from '../../types/schema';

export const entitySchemas: SchemaDef[] = [
  {
    collection: 'entity/entity',
    module: 'entity',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Entity Name' },
      { name: 'type', type: 'enum', enum: ['company', 'division', 'branch', 'department'], required: true, label: 'Entity Type' },
      { name: 'parentId', type: 'id', label: 'Parent Entity' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive'], label: 'Status' },
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
];
