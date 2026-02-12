/**
 * Integration module collection schemas.
 * endpoint, webhook, apiKey, syncLog, mapping, importBatch,
 * importError, exportJob, fieldMapping.
 */

import type { SchemaDef } from '../../types/schema';

export const integrationSchemas: SchemaDef[] = [
  {
    collection: 'integration/endpoint',
    module: 'integration',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Endpoint Name' },
      { name: 'url', type: 'string', required: true, label: 'URL' },
      { name: 'method', type: 'enum', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], label: 'HTTP Method' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive', 'error'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'integration/webhook',
    module: 'integration',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Webhook Name' },
      { name: 'url', type: 'string', required: true, label: 'Callback URL' },
      { name: 'events', type: 'array', label: 'Subscribed Events' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'integration/apiKey',
    module: 'integration',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Key Name' },
      { name: 'prefix', type: 'string', required: true, label: 'Key Prefix' },
      { name: 'expiresAt', type: 'date', label: 'Expires At' },
      { name: 'status', type: 'enum', enum: ['active', 'revoked', 'expired'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'integration/syncLog',
    module: 'integration',
    version: 1,
    fields: [
      { name: 'endpointId', type: 'id', required: true, label: 'Endpoint' },
      { name: 'direction', type: 'enum', enum: ['inbound', 'outbound'], required: true, label: 'Direction' },
      { name: 'recordCount', type: 'number', label: 'Record Count' },
      { name: 'status', type: 'enum', enum: ['success', 'partial', 'failed'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'endpointId', collection: 'integration/endpoint', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'integration/mapping',
    module: 'integration',
    version: 1,
    fields: [
      { name: 'endpointId', type: 'id', required: true, label: 'Endpoint' },
      { name: 'sourceField', type: 'string', required: true, label: 'Source Field' },
      { name: 'targetField', type: 'string', required: true, label: 'Target Field' },
      { name: 'transform', type: 'string', label: 'Transform Expression' },
    ],
    relations: [
      { foreignKey: 'endpointId', collection: 'integration/endpoint', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'integration/importBatch',
    module: 'integration',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Batch Name' },
      { name: 'sourceFormat', type: 'enum', enum: ['csv', 'json', 'iif', 'qb', 'sage', 'foundation', 'tsv', 'fixed'], required: true, label: 'Source Format' },
      { name: 'collection', type: 'string', required: true, label: 'Target Collection' },
      { name: 'status', type: 'enum', enum: ['pending', 'validating', 'preview', 'importing', 'completed', 'failed', 'reverted'], required: true, label: 'Status' },
      { name: 'totalRows', type: 'number', required: true, label: 'Total Rows' },
      { name: 'importedRows', type: 'number', required: true, label: 'Imported Rows' },
      { name: 'skippedRows', type: 'number', required: true, label: 'Skipped Rows' },
      { name: 'errorRows', type: 'number', required: true, label: 'Error Rows' },
      { name: 'mergeStrategy', type: 'enum', enum: ['skip', 'overwrite', 'append', 'manual'], required: true, label: 'Merge Strategy' },
      { name: 'compositeKeys', type: 'array', label: 'Composite Keys' },
      { name: 'delimiter', type: 'string', label: 'Custom Delimiter' },
      { name: 'rawData', type: 'array', label: 'Raw Parsed Rows' },
      { name: 'importedIds', type: 'array', label: 'Imported Record IDs' },
      { name: 'startedAt', type: 'date', label: 'Started At' },
      { name: 'completedAt', type: 'date', label: 'Completed At' },
      { name: 'revertedAt', type: 'date', label: 'Reverted At' },
    ],
    relations: [],
  },
  {
    collection: 'integration/importError',
    module: 'integration',
    version: 1,
    fields: [
      { name: 'batchId', type: 'id', required: true, label: 'Batch' },
      { name: 'rowNumber', type: 'number', required: true, label: 'Row Number' },
      { name: 'field', type: 'string', required: true, label: 'Field' },
      { name: 'value', type: 'string', label: 'Value' },
      { name: 'error', type: 'string', required: true, label: 'Error Message' },
      { name: 'severity', type: 'enum', enum: ['warning', 'error'], required: true, label: 'Severity' },
    ],
    relations: [
      { foreignKey: 'batchId', collection: 'integration/importBatch', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'integration/exportJob',
    module: 'integration',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Export Name' },
      { name: 'format', type: 'enum', enum: ['csv', 'json', 'pdf', 'tsv', 'api'], required: true, label: 'Format' },
      { name: 'collection', type: 'string', required: true, label: 'Collection' },
      { name: 'filters', type: 'object', label: 'Filters' },
      { name: 'columns', type: 'array', label: 'Selected Columns' },
      { name: 'status', type: 'enum', enum: ['pending', 'processing', 'completed', 'failed'], required: true, label: 'Status' },
      { name: 'fileSize', type: 'number', label: 'File Size (bytes)' },
      { name: 'resultData', type: 'string', label: 'Result Data' },
      { name: 'startedAt', type: 'date', label: 'Started At' },
      { name: 'completedAt', type: 'date', label: 'Completed At' },
    ],
    relations: [],
  },
  {
    collection: 'integration/fieldMapping',
    module: 'integration',
    version: 1,
    fields: [
      { name: 'batchId', type: 'id', required: true, label: 'Batch' },
      { name: 'sourceField', type: 'string', required: true, label: 'Source Field' },
      { name: 'targetField', type: 'string', required: true, label: 'Target Field' },
      { name: 'transform', type: 'enum', enum: ['none', 'lowercase', 'uppercase', 'date', 'number', 'trim'], required: true, label: 'Transform' },
    ],
    relations: [
      { foreignKey: 'batchId', collection: 'integration/importBatch', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
