/**
 * Integration module collection schemas.
 * endpoint, webhook, apiKey, syncLog, mapping.
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
];
