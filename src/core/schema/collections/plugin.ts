/**
 * Plugin module collection schemas.
 * manifest, config, customObject, customField, script.
 */

import type { SchemaDef } from '../../types/schema';

export const pluginSchemas: SchemaDef[] = [
  {
    collection: 'plugin/manifest',
    module: 'plugin',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Plugin Name' },
      { name: 'version', type: 'string', required: true, label: 'Version' },
      { name: 'author', type: 'string', label: 'Author' },
      { name: 'status', type: 'enum', enum: ['installed', 'active', 'disabled', 'error'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'plugin/config',
    module: 'plugin',
    version: 1,
    fields: [
      { name: 'pluginId', type: 'id', required: true, label: 'Plugin' },
      { name: 'key', type: 'string', required: true, label: 'Key' },
      { name: 'value', type: 'object', label: 'Value' },
    ],
    relations: [
      { foreignKey: 'pluginId', collection: 'plugin/manifest', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'plugin/customObject',
    module: 'plugin',
    version: 1,
    fields: [
      { name: 'pluginId', type: 'id', required: true, label: 'Plugin' },
      { name: 'name', type: 'string', required: true, label: 'Object Name' },
      { name: 'schema', type: 'object', required: true, label: 'Schema Definition' },
    ],
    relations: [
      { foreignKey: 'pluginId', collection: 'plugin/manifest', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'plugin/customField',
    module: 'plugin',
    version: 1,
    fields: [
      { name: 'pluginId', type: 'id', required: true, label: 'Plugin' },
      { name: 'collection', type: 'string', required: true, label: 'Target Collection' },
      { name: 'fieldName', type: 'string', required: true, label: 'Field Name' },
      { name: 'fieldType', type: 'enum', enum: ['string', 'number', 'boolean', 'date', 'enum'], label: 'Field Type' },
    ],
    relations: [
      { foreignKey: 'pluginId', collection: 'plugin/manifest', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'plugin/script',
    module: 'plugin',
    version: 1,
    fields: [
      { name: 'pluginId', type: 'id', required: true, label: 'Plugin' },
      { name: 'name', type: 'string', required: true, label: 'Script Name' },
      { name: 'trigger', type: 'enum', enum: ['beforeSave', 'afterSave', 'beforeDelete', 'afterDelete', 'scheduled'], label: 'Trigger' },
      { name: 'code', type: 'string', label: 'Script Code' },
    ],
    relations: [
      { foreignKey: 'pluginId', collection: 'plugin/manifest', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
