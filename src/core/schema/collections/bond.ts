/**
 * Bonding & Insurance module collection schemas.
 * surety, bondPolicy, claim, insurance, coi.
 */

import type { SchemaDef } from '../../types/schema';

export const bondSchemas: SchemaDef[] = [
  {
    collection: 'bond/surety',
    module: 'bond',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Surety Name' },
      { name: 'agentName', type: 'string', label: 'Agent Name' },
      { name: 'bondingCapacity', type: 'currency', label: 'Bonding Capacity' },
      { name: 'status', type: 'enum', enum: ['active', 'inactive'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'bond/bondPolicy',
    module: 'bond',
    version: 1,
    fields: [
      { name: 'suretyId', type: 'id', required: true, label: 'Surety' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'type', type: 'enum', enum: ['bid', 'performance', 'payment', 'maintenance'], required: true, label: 'Bond Type' },
      { name: 'amount', type: 'currency', required: true, label: 'Bond Amount' },
    ],
    relations: [
      { foreignKey: 'suretyId', collection: 'bond/surety', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'bond/claim',
    module: 'bond',
    version: 1,
    fields: [
      { name: 'bondPolicyId', type: 'id', required: true, label: 'Bond Policy' },
      { name: 'claimantName', type: 'string', required: true, label: 'Claimant' },
      { name: 'amount', type: 'currency', label: 'Claim Amount' },
      { name: 'status', type: 'enum', enum: ['filed', 'under-review', 'settled', 'denied'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'bondPolicyId', collection: 'bond/bondPolicy', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'bond/insurance',
    module: 'bond',
    version: 1,
    fields: [
      { name: 'carrier', type: 'string', required: true, label: 'Carrier' },
      { name: 'policyNumber', type: 'string', required: true, label: 'Policy Number' },
      { name: 'type', type: 'enum', enum: ['general-liability', 'auto', 'umbrella', 'workers-comp', 'professional', 'builders-risk'], label: 'Policy Type' },
      { name: 'expirationDate', type: 'date', label: 'Expiration Date' },
    ],
    relations: [],
  },
  {
    collection: 'bond/coi',
    module: 'bond',
    version: 1,
    fields: [
      { name: 'vendorId', type: 'id', required: true, label: 'Vendor / Sub' },
      { name: 'carrier', type: 'string', label: 'Carrier' },
      { name: 'expirationDate', type: 'date', required: true, label: 'Expiration Date' },
      { name: 'status', type: 'enum', enum: ['valid', 'expired', 'pending'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'vendorId', collection: 'ap/vendor', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
];
