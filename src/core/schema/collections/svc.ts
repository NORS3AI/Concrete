/**
 * Service Management module collection schemas.
 * serviceAgreement, workOrder, dispatch, call, invoice.
 */

import type { SchemaDef } from '../../types/schema';

export const svcSchemas: SchemaDef[] = [
  {
    collection: 'svc/serviceAgreement',
    module: 'svc',
    version: 1,
    fields: [
      { name: 'customerId', type: 'id', required: true, label: 'Customer' },
      { name: 'name', type: 'string', required: true, label: 'Agreement Name' },
      { name: 'startDate', type: 'date', label: 'Start Date' },
      { name: 'status', type: 'enum', enum: ['active', 'expired', 'cancelled'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'customerId', collection: 'ar/customer', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'svc/workOrder',
    module: 'svc',
    version: 1,
    fields: [
      { name: 'agreementId', type: 'id', label: 'Service Agreement' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'priority', type: 'enum', enum: ['low', 'medium', 'high', 'emergency'], label: 'Priority' },
      { name: 'status', type: 'enum', enum: ['new', 'assigned', 'in-progress', 'complete', 'invoiced'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'agreementId', collection: 'svc/serviceAgreement', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'svc/dispatch',
    module: 'svc',
    version: 1,
    fields: [
      { name: 'workOrderId', type: 'id', required: true, label: 'Work Order' },
      { name: 'technicianId', type: 'id', label: 'Technician' },
      { name: 'scheduledDate', type: 'date', label: 'Scheduled Date' },
      { name: 'status', type: 'enum', enum: ['scheduled', 'dispatched', 'arrived', 'complete'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'workOrderId', collection: 'svc/workOrder', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'svc/call',
    module: 'svc',
    version: 1,
    fields: [
      { name: 'customerId', type: 'id', required: true, label: 'Customer' },
      { name: 'subject', type: 'string', required: true, label: 'Subject' },
      { name: 'type', type: 'enum', enum: ['service-request', 'complaint', 'inquiry', 'emergency'], label: 'Call Type' },
      { name: 'status', type: 'enum', enum: ['new', 'assigned', 'resolved', 'closed'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'customerId', collection: 'ar/customer', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'svc/invoice',
    module: 'svc',
    version: 1,
    fields: [
      { name: 'workOrderId', type: 'id', required: true, label: 'Work Order' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'status', type: 'enum', enum: ['draft', 'sent', 'paid', 'voided'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'workOrderId', collection: 'svc/workOrder', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
