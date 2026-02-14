/**
 * Change Order module collection schemas.
 * Phase 19: changeOrderRequest (PCO/COR), changeOrder, changeOrderLine,
 * changeOrderApproval, changeOrderLog.
 */

import type { SchemaDef } from '../../types/schema';

export const changeOrderSchemas: SchemaDef[] = [
  {
    collection: 'co/changeOrderRequest',
    module: 'change-order',
    version: 1,
    fields: [
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'number', type: 'string', required: true, label: 'Request Number' },
      { name: 'title', type: 'string', required: true, label: 'Title' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'requestedBy', type: 'string', label: 'Requested By' },
      { name: 'requestDate', type: 'date', label: 'Request Date' },
      { name: 'source', type: 'enum', enum: ['owner', 'subcontractor', 'internal', 'field'], label: 'Source' },
      { name: 'status', type: 'enum', enum: ['draft', 'pending', 'approved', 'rejected', 'withdrawn'], label: 'Status' },
      { name: 'estimatedAmount', type: 'currency', label: 'Estimated Amount' },
      { name: 'scheduleImpactDays', type: 'number', label: 'Schedule Impact (Days)' },
      { name: 'entityId', type: 'id', label: 'Entity' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'entityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'co/changeOrder',
    module: 'change-order',
    version: 1,
    fields: [
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'requestId', type: 'id', label: 'Request (PCO)' },
      { name: 'number', type: 'string', required: true, label: 'CO Number' },
      { name: 'title', type: 'string', required: true, label: 'Title' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'type', type: 'enum', enum: ['owner', 'subcontractor', 'internal'], required: true, label: 'Type' },
      { name: 'status', type: 'enum', enum: ['draft', 'pending_approval', 'approved', 'executed', 'rejected', 'voided'], label: 'Status' },
      { name: 'amount', type: 'currency', label: 'Amount' },
      { name: 'approvedAmount', type: 'currency', label: 'Approved Amount' },
      { name: 'scheduleExtensionDays', type: 'number', label: 'Schedule Extension (Days)' },
      { name: 'effectiveDate', type: 'date', label: 'Effective Date' },
      { name: 'executedDate', type: 'date', label: 'Executed Date' },
      { name: 'scopeDescription', type: 'string', label: 'Scope Description' },
      { name: 'entityId', type: 'id', label: 'Entity' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'restrict' },
      { foreignKey: 'requestId', collection: 'co/changeOrderRequest', type: 'belongsTo', cascade: 'nullify' },
      { foreignKey: 'entityId', collection: 'entity/entity', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'co/changeOrderLine',
    module: 'change-order',
    version: 1,
    fields: [
      { name: 'changeOrderId', type: 'id', required: true, label: 'Change Order' },
      { name: 'costType', type: 'enum', enum: ['labor', 'material', 'subcontract', 'equipment', 'overhead', 'other'], required: true, label: 'Cost Type' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'quantity', type: 'number', label: 'Quantity' },
      { name: 'unitCost', type: 'currency', label: 'Unit Cost' },
      { name: 'amount', type: 'currency', required: true, label: 'Amount' },
      { name: 'markup', type: 'currency', label: 'Markup Amount' },
      { name: 'markupPct', type: 'number', label: 'Markup %' },
      { name: 'totalWithMarkup', type: 'currency', label: 'Total with Markup' },
    ],
    relations: [
      { foreignKey: 'changeOrderId', collection: 'co/changeOrder', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'co/changeOrderApproval',
    module: 'change-order',
    version: 1,
    fields: [
      { name: 'changeOrderId', type: 'id', required: true, label: 'Change Order' },
      { name: 'approverId', type: 'string', required: true, label: 'Approver ID' },
      { name: 'approverRole', type: 'string', label: 'Approver Role' },
      { name: 'status', type: 'enum', enum: ['pending', 'approved', 'rejected'], label: 'Status' },
      { name: 'comments', type: 'string', label: 'Comments' },
      { name: 'date', type: 'date', label: 'Decision Date' },
      { name: 'sequence', type: 'number', label: 'Approval Sequence' },
    ],
    relations: [
      { foreignKey: 'changeOrderId', collection: 'co/changeOrder', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'co/changeOrderLog',
    module: 'change-order',
    version: 1,
    fields: [
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'changeOrderId', type: 'id', label: 'Change Order' },
      { name: 'action', type: 'string', required: true, label: 'Action' },
      { name: 'performedBy', type: 'string', label: 'Performed By' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'previousStatus', type: 'string', label: 'Previous Status' },
      { name: 'newStatus', type: 'string', label: 'New Status' },
      { name: 'notes', type: 'string', label: 'Notes' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
      { foreignKey: 'changeOrderId', collection: 'co/changeOrder', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
