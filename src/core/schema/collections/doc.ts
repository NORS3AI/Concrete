/**
 * Document Management module collection schemas (v2).
 * Enhanced schema with full document, revision, template, transmittal, and photo
 * collections for the Phase 14 Document Management module.
 */

import type { SchemaDef } from '../../types/schema';

export const docSchemas: SchemaDef[] = [
  // =========================================================================
  // doc/document - Core document record
  // =========================================================================
  {
    collection: 'doc/document',
    module: 'doc',
    version: 2,
    fields: [
      { name: 'title', type: 'string', required: true, label: 'Title' },
      {
        name: 'category',
        type: 'enum',
        required: true,
        enum: [
          'contract',
          'change_order',
          'rfi',
          'submittal',
          'drawing',
          'photo',
          'report',
          'correspondence',
          'insurance',
          'permit',
          'other',
        ],
        label: 'Category',
      },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'fileName', type: 'string', label: 'File Name' },
      { name: 'fileSize', type: 'number', label: 'File Size (bytes)' },
      { name: 'mimeType', type: 'string', label: 'MIME Type' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'entityId', type: 'id', label: 'Entity' },
      { name: 'vendorId', type: 'id', label: 'Vendor' },
      { name: 'employeeId', type: 'id', label: 'Employee' },
      { name: 'tags', type: 'array', label: 'Tags' },
      { name: 'expirationDate', type: 'date', label: 'Expiration Date' },
      {
        name: 'status',
        type: 'enum',
        enum: ['active', 'archived', 'expired'],
        label: 'Status',
      },
      { name: 'uploadedBy', type: 'string', label: 'Uploaded By' },
      { name: 'uploadedAt', type: 'date', label: 'Uploaded At' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
      { foreignKey: 'entityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'nullify' },
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'nullify' },
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'nullify' },
    ],
    indexes: [
      { fields: ['category'], name: 'idx_doc_category' },
      { fields: ['jobId'], name: 'idx_doc_job' },
      { fields: ['entityId'], name: 'idx_doc_entity' },
      { fields: ['vendorId'], name: 'idx_doc_vendor' },
      { fields: ['status'], name: 'idx_doc_status' },
      { fields: ['expirationDate'], name: 'idx_doc_expiration' },
    ],
  },

  // =========================================================================
  // doc/revision - Revision history for documents
  // =========================================================================
  {
    collection: 'doc/revision',
    module: 'doc',
    version: 2,
    fields: [
      { name: 'documentId', type: 'id', required: true, label: 'Document' },
      { name: 'revisionNumber', type: 'number', required: true, label: 'Revision Number' },
      { name: 'description', type: 'string', label: 'Change Description' },
      { name: 'fileName', type: 'string', label: 'File Name' },
      { name: 'fileSize', type: 'number', label: 'File Size (bytes)' },
      { name: 'uploadedBy', type: 'string', label: 'Uploaded By' },
      { name: 'uploadedAt', type: 'date', label: 'Uploaded At' },
      { name: 'notes', type: 'string', label: 'Notes' },
    ],
    relations: [
      { foreignKey: 'documentId', collection: 'doc/document', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['documentId'], name: 'idx_revision_document' },
      { fields: ['documentId', 'revisionNumber'], unique: true, name: 'idx_revision_unique' },
    ],
  },

  // =========================================================================
  // doc/template - Document templates
  // =========================================================================
  {
    collection: 'doc/template',
    module: 'doc',
    version: 2,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Template Name' },
      {
        name: 'category',
        type: 'enum',
        enum: [
          'contract',
          'change_order',
          'rfi',
          'submittal',
          'drawing',
          'photo',
          'report',
          'correspondence',
          'insurance',
          'permit',
          'lien_waiver',
          'aia_form',
          'other',
        ],
        label: 'Category',
      },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'content', type: 'string', label: 'Template Content' },
      { name: 'variables', type: 'array', label: 'Template Variables (JSON)' },
      { name: 'isActive', type: 'boolean', label: 'Is Active' },
    ],
    relations: [],
    indexes: [
      { fields: ['category'], name: 'idx_template_category' },
      { fields: ['isActive'], name: 'idx_template_active' },
    ],
  },

  // =========================================================================
  // doc/transmittal - Transmittal records
  // =========================================================================
  {
    collection: 'doc/transmittal',
    module: 'doc',
    version: 2,
    fields: [
      { name: 'number', type: 'string', required: true, label: 'Transmittal Number' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'toName', type: 'string', required: true, label: 'To Name' },
      { name: 'toCompany', type: 'string', label: 'To Company' },
      { name: 'fromName', type: 'string', label: 'From Name' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'subject', type: 'string', label: 'Subject' },
      { name: 'notes', type: 'string', label: 'Notes' },
      {
        name: 'status',
        type: 'enum',
        enum: ['draft', 'sent', 'acknowledged'],
        label: 'Status',
      },
      { name: 'items', type: 'array', label: 'Document IDs (JSON array)' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
    indexes: [
      { fields: ['number'], unique: true, name: 'idx_transmittal_number' },
      { fields: ['jobId'], name: 'idx_transmittal_job' },
      { fields: ['status'], name: 'idx_transmittal_status' },
    ],
  },

  // =========================================================================
  // doc/photo - Photo log entries linked to documents
  // =========================================================================
  {
    collection: 'doc/photo',
    module: 'doc',
    version: 2,
    fields: [
      { name: 'documentId', type: 'id', required: true, label: 'Document' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'dateTaken', type: 'date', required: true, label: 'Date Taken' },
      { name: 'location', type: 'string', label: 'Location' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'latitude', type: 'number', label: 'Latitude' },
      { name: 'longitude', type: 'number', label: 'Longitude' },
      { name: 'takenBy', type: 'string', label: 'Taken By' },
    ],
    relations: [
      { foreignKey: 'documentId', collection: 'doc/document', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
    indexes: [
      { fields: ['documentId'], name: 'idx_photo_document' },
      { fields: ['jobId'], name: 'idx_photo_job' },
      { fields: ['dateTaken'], name: 'idx_photo_date' },
    ],
  },
];
