/**
 * Document Management module collection schemas.
 * document, revision, template, transmittal, photo.
 */

import type { SchemaDef } from '../../types/schema';

export const docSchemas: SchemaDef[] = [
  {
    collection: 'doc/document',
    module: 'doc',
    version: 1,
    fields: [
      { name: 'title', type: 'string', required: true, label: 'Title' },
      { name: 'category', type: 'string', label: 'Category' },
      { name: 'status', type: 'enum', enum: ['draft', 'review', 'approved', 'archived'], label: 'Status' },
      { name: 'jobId', type: 'id', label: 'Job' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'doc/revision',
    module: 'doc',
    version: 1,
    fields: [
      { name: 'documentId', type: 'id', required: true, label: 'Document' },
      { name: 'revisionNumber', type: 'number', required: true, label: 'Revision Number' },
      { name: 'description', type: 'string', label: 'Change Description' },
      { name: 'fileName', type: 'string', label: 'File Name' },
    ],
    relations: [
      { foreignKey: 'documentId', collection: 'doc/document', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'doc/template',
    module: 'doc',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Template Name' },
      { name: 'category', type: 'string', label: 'Category' },
      { name: 'content', type: 'string', label: 'Template Content' },
    ],
    relations: [],
  },
  {
    collection: 'doc/transmittal',
    module: 'doc',
    version: 1,
    fields: [
      { name: 'number', type: 'string', required: true, label: 'Transmittal Number' },
      { name: 'to', type: 'string', required: true, label: 'To' },
      { name: 'subject', type: 'string', label: 'Subject' },
      { name: 'status', type: 'enum', enum: ['draft', 'sent', 'acknowledged'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'doc/photo',
    module: 'doc',
    version: 1,
    fields: [
      { name: 'fileName', type: 'string', required: true, label: 'File Name' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'caption', type: 'string', label: 'Caption' },
      { name: 'takenDate', type: 'date', label: 'Date Taken' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
];
