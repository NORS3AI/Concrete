/**
 * Inventory module collection schemas.
 * item, location, receipt, issue, transfer, count.
 */

import type { SchemaDef } from '../../types/schema';

export const invSchemas: SchemaDef[] = [
  {
    collection: 'inv/item',
    module: 'inv',
    version: 1,
    fields: [
      { name: 'sku', type: 'string', required: true, label: 'SKU' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'unitOfMeasure', type: 'string', label: 'Unit of Measure' },
      { name: 'unitCost', type: 'currency', label: 'Unit Cost' },
    ],
    relations: [],
  },
  {
    collection: 'inv/location',
    module: 'inv',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Location Name' },
      { name: 'type', type: 'enum', enum: ['warehouse', 'jobsite', 'yard', 'vehicle'], label: 'Location Type' },
      { name: 'address', type: 'string', label: 'Address' },
    ],
    relations: [],
  },
  {
    collection: 'inv/receipt',
    module: 'inv',
    version: 1,
    fields: [
      { name: 'itemId', type: 'id', required: true, label: 'Item' },
      { name: 'locationId', type: 'id', required: true, label: 'Location' },
      { name: 'quantity', type: 'number', required: true, label: 'Quantity' },
      { name: 'date', type: 'date', required: true, label: 'Receipt Date' },
    ],
    relations: [
      { foreignKey: 'itemId', collection: 'inv/item', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'locationId', collection: 'inv/location', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'inv/issue',
    module: 'inv',
    version: 1,
    fields: [
      { name: 'itemId', type: 'id', required: true, label: 'Item' },
      { name: 'locationId', type: 'id', required: true, label: 'From Location' },
      { name: 'quantity', type: 'number', required: true, label: 'Quantity' },
      { name: 'jobId', type: 'id', label: 'Job' },
    ],
    relations: [
      { foreignKey: 'itemId', collection: 'inv/item', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'locationId', collection: 'inv/location', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'inv/transfer',
    module: 'inv',
    version: 1,
    fields: [
      { name: 'itemId', type: 'id', required: true, label: 'Item' },
      { name: 'fromLocationId', type: 'id', required: true, label: 'From Location' },
      { name: 'toLocationId', type: 'id', required: true, label: 'To Location' },
      { name: 'quantity', type: 'number', required: true, label: 'Quantity' },
    ],
    relations: [
      { foreignKey: 'itemId', collection: 'inv/item', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'fromLocationId', collection: 'inv/location', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'toLocationId', collection: 'inv/location', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'inv/count',
    module: 'inv',
    version: 1,
    fields: [
      { name: 'locationId', type: 'id', required: true, label: 'Location' },
      { name: 'date', type: 'date', required: true, label: 'Count Date' },
      { name: 'status', type: 'enum', enum: ['draft', 'in-progress', 'complete', 'posted'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'locationId', collection: 'inv/location', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
];
