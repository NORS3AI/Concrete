/**
 * Workflow module collection schemas.
 * template, instance, step, approval, escalation.
 */

import type { SchemaDef } from '../../types/schema';

export const workflowSchemas: SchemaDef[] = [
  {
    collection: 'workflow/template',
    module: 'workflow',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Template Name' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'triggerCollection', type: 'string', label: 'Trigger Collection' },
      { name: 'status', type: 'enum', enum: ['active', 'draft', 'archived'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'workflow/instance',
    module: 'workflow',
    version: 1,
    fields: [
      { name: 'templateId', type: 'id', required: true, label: 'Template' },
      { name: 'entityId', type: 'id', label: 'Related Entity' },
      { name: 'status', type: 'enum', enum: ['active', 'complete', 'cancelled', 'error'], label: 'Status' },
      { name: 'currentStepId', type: 'id', label: 'Current Step' },
    ],
    relations: [
      { foreignKey: 'templateId', collection: 'workflow/template', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'workflow/step',
    module: 'workflow',
    version: 1,
    fields: [
      { name: 'templateId', type: 'id', required: true, label: 'Template' },
      { name: 'name', type: 'string', required: true, label: 'Step Name' },
      { name: 'type', type: 'enum', enum: ['approval', 'notification', 'action', 'condition'], required: true, label: 'Step Type' },
      { name: 'order', type: 'number', label: 'Sort Order' },
    ],
    relations: [
      { foreignKey: 'templateId', collection: 'workflow/template', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'workflow/approval',
    module: 'workflow',
    version: 1,
    fields: [
      { name: 'instanceId', type: 'id', required: true, label: 'Workflow Instance' },
      { name: 'stepId', type: 'id', required: true, label: 'Step' },
      { name: 'approverId', type: 'id', label: 'Approver' },
      { name: 'decision', type: 'enum', enum: ['pending', 'approved', 'rejected', 'delegated'], label: 'Decision' },
    ],
    relations: [
      { foreignKey: 'instanceId', collection: 'workflow/instance', type: 'belongsTo', cascade: 'cascade' },
      { foreignKey: 'stepId', collection: 'workflow/step', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'workflow/escalation',
    module: 'workflow',
    version: 1,
    fields: [
      { name: 'approvalId', type: 'id', required: true, label: 'Approval' },
      { name: 'escalatedToId', type: 'id', label: 'Escalated To' },
      { name: 'reason', type: 'string', label: 'Reason' },
      { name: 'status', type: 'enum', enum: ['pending', 'resolved'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'approvalId', collection: 'workflow/approval', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
