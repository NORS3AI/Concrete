/**
 * Multi-Tenant module collection schemas.
 * Phase 17: tenant, tenantConfig, subscription, tenantUser, tenantBranding.
 */

import type { SchemaDef } from '../../types/schema';

export const tenantSchemas: SchemaDef[] = [
  {
    collection: 'tenant/tenant',
    module: 'tenant',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Tenant Name' },
      { name: 'slug', type: 'string', required: true, label: 'Slug' },
      { name: 'domain', type: 'string', label: 'Custom Domain' },
      { name: 'status', type: 'enum', enum: ['active', 'suspended', 'trial', 'cancelled'], required: true, label: 'Status' },
      { name: 'plan', type: 'enum', enum: ['free', 'starter', 'professional', 'enterprise'], required: true, label: 'Plan' },
      { name: 'ownerId', type: 'id', required: true, label: 'Owner' },
      { name: 'dataRegion', type: 'enum', enum: ['us', 'eu', 'apac'], label: 'Data Region' },
      { name: 'createdAt', type: 'date', label: 'Created At' },
      { name: 'trialEndsAt', type: 'date', label: 'Trial Ends At' },
      { name: 'maxUsers', type: 'number', label: 'Max Users' },
      { name: 'maxEntities', type: 'number', label: 'Max Entities' },
      { name: 'storageUsedMb', type: 'number', label: 'Storage Used (MB)' },
      { name: 'storageLimitMb', type: 'number', label: 'Storage Limit (MB)' },
    ],
    relations: [],
  },
  {
    collection: 'tenant/tenantConfig',
    module: 'tenant',
    version: 1,
    fields: [
      { name: 'tenantId', type: 'id', required: true, label: 'Tenant' },
      { name: 'coaTemplateId', type: 'string', label: 'COA Template' },
      { name: 'taxTableId', type: 'string', label: 'Tax Table' },
      { name: 'payScaleId', type: 'string', label: 'Pay Scale' },
      { name: 'fiscalYearStart', type: 'string', label: 'Fiscal Year Start' },
      { name: 'defaultCurrency', type: 'string', label: 'Default Currency' },
      { name: 'timezone', type: 'string', label: 'Timezone' },
      { name: 'features', type: 'object', label: 'Feature Flags' },
    ],
    relations: [
      { foreignKey: 'tenantId', collection: 'tenant/tenant', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'tenant/subscription',
    module: 'tenant',
    version: 1,
    fields: [
      { name: 'tenantId', type: 'id', required: true, label: 'Tenant' },
      { name: 'plan', type: 'enum', enum: ['free', 'starter', 'professional', 'enterprise'], required: true, label: 'Plan' },
      { name: 'status', type: 'enum', enum: ['active', 'past_due', 'cancelled', 'trialing'], required: true, label: 'Status' },
      { name: 'currentPeriodStart', type: 'date', label: 'Current Period Start' },
      { name: 'currentPeriodEnd', type: 'date', label: 'Current Period End' },
      { name: 'amount', type: 'currency', label: 'Amount' },
      { name: 'currency', type: 'string', label: 'Currency' },
      { name: 'paymentMethod', type: 'string', label: 'Payment Method' },
    ],
    relations: [
      { foreignKey: 'tenantId', collection: 'tenant/tenant', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'tenant/tenantUser',
    module: 'tenant',
    version: 1,
    fields: [
      { name: 'tenantId', type: 'id', required: true, label: 'Tenant' },
      { name: 'userId', type: 'id', required: true, label: 'User' },
      { name: 'role', type: 'enum', enum: ['owner', 'admin', 'member', 'viewer'], required: true, label: 'Role' },
      { name: 'status', type: 'enum', enum: ['active', 'invited', 'suspended'], required: true, label: 'Status' },
      { name: 'invitedAt', type: 'date', label: 'Invited At' },
      { name: 'joinedAt', type: 'date', label: 'Joined At' },
    ],
    relations: [
      { foreignKey: 'tenantId', collection: 'tenant/tenant', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'tenant/tenantBranding',
    module: 'tenant',
    version: 1,
    fields: [
      { name: 'tenantId', type: 'id', required: true, label: 'Tenant' },
      { name: 'logoUrl', type: 'string', label: 'Logo URL' },
      { name: 'primaryColor', type: 'string', label: 'Primary Color' },
      { name: 'secondaryColor', type: 'string', label: 'Secondary Color' },
      { name: 'companyName', type: 'string', label: 'Company Name' },
      { name: 'favicon', type: 'string', label: 'Favicon URL' },
      { name: 'customCss', type: 'string', label: 'Custom CSS' },
    ],
    relations: [
      { foreignKey: 'tenantId', collection: 'tenant/tenant', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
