/**
 * Core module collection schemas.
 * Company, user, role, permission, auditLog, config, notification,
 * attachment, comment, tag, customField, savedFilter.
 */

import type { SchemaDef } from '../../types/schema';

export const coreSchemas: SchemaDef[] = [
  {
    collection: 'core/company',
    module: 'core',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Company Name' },
      { name: 'legalName', type: 'string', label: 'Legal Name' },
      { name: 'taxId', type: 'string', label: 'Tax ID / EIN' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive', 'suspended'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'core/user',
    module: 'core',
    version: 1,
    fields: [
      { name: 'email', type: 'string', required: true, label: 'Email' },
      { name: 'displayName', type: 'string', required: true, label: 'Display Name' },
      { name: 'roleIds', type: 'array', label: 'Role IDs' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive', 'locked'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'roleIds', collection: 'core/role', type: 'manyToMany', cascade: 'nullify' },
    ],
  },
  {
    collection: 'core/role',
    module: 'core',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Role Name' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'permissions', type: 'array', label: 'Permissions' },
    ],
    relations: [],
  },
  {
    collection: 'core/permission',
    module: 'core',
    version: 1,
    fields: [
      { name: 'resource', type: 'string', required: true, label: 'Resource' },
      { name: 'action', type: 'string', required: true, label: 'Action' },
      { name: 'description', type: 'string', label: 'Description' },
    ],
    relations: [],
  },
  {
    collection: 'core/auditLog',
    module: 'core',
    version: 1,
    fields: [
      { name: 'userId', type: 'id', required: true, label: 'User' },
      { name: 'action', type: 'string', required: true, label: 'Action' },
      { name: 'collection', type: 'string', label: 'Collection' },
      { name: 'recordId', type: 'id', label: 'Record ID' },
    ],
    relations: [
      { foreignKey: 'userId', collection: 'core/user', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'core/config',
    module: 'core',
    version: 1,
    fields: [
      { name: 'key', type: 'string', required: true, label: 'Key' },
      { name: 'value', type: 'object', label: 'Value' },
      { name: 'scope', type: 'enum', enum: ['system', 'tenant', 'user'], label: 'Scope' },
    ],
    relations: [],
  },
  {
    collection: 'core/notification',
    module: 'core',
    version: 1,
    fields: [
      { name: 'title', type: 'string', required: true, label: 'Title' },
      { name: 'message', type: 'string', required: true, label: 'Message' },
      { name: 'type', type: 'enum', enum: ['critical', 'warning', 'info', 'success', 'action-required'], label: 'Type' },
      { name: 'read', type: 'boolean', label: 'Read' },
    ],
    relations: [],
  },
  {
    collection: 'core/attachment',
    module: 'core',
    version: 1,
    fields: [
      { name: 'fileName', type: 'string', required: true, label: 'File Name' },
      { name: 'mimeType', type: 'string', label: 'MIME Type' },
      { name: 'size', type: 'number', label: 'File Size' },
      { name: 'entityId', type: 'id', label: 'Attached To' },
    ],
    relations: [],
  },
  {
    collection: 'core/comment',
    module: 'core',
    version: 1,
    fields: [
      { name: 'text', type: 'string', required: true, label: 'Comment' },
      { name: 'authorId', type: 'id', required: true, label: 'Author' },
      { name: 'entityId', type: 'id', required: true, label: 'Entity' },
    ],
    relations: [
      { foreignKey: 'authorId', collection: 'core/user', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'core/tag',
    module: 'core',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Tag Name' },
      { name: 'color', type: 'string', label: 'Color' },
    ],
    relations: [],
  },
  {
    collection: 'core/customField',
    module: 'core',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Field Name' },
      { name: 'type', type: 'enum', enum: ['string', 'number', 'boolean', 'date', 'enum'], label: 'Field Type' },
      { name: 'collection', type: 'string', required: true, label: 'Target Collection' },
    ],
    relations: [],
  },
  {
    collection: 'core/savedFilter',
    module: 'core',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Filter Name' },
      { name: 'collection', type: 'string', required: true, label: 'Collection' },
      { name: 'filters', type: 'object', required: true, label: 'Filter Criteria' },
    ],
    relations: [],
  },
];
