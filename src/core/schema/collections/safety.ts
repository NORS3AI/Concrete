/**
 * Safety module collection schemas.
 * incident, inspection, oshaLog, toolboxTalk, corrective, drugTest.
 */

import type { SchemaDef } from '../../types/schema';

export const safetySchemas: SchemaDef[] = [
  {
    collection: 'safety/incident',
    module: 'safety',
    version: 1,
    fields: [
      { name: 'date', type: 'date', required: true, label: 'Incident Date' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'severity', type: 'enum', enum: ['near-miss', 'minor', 'moderate', 'serious', 'fatal'], label: 'Severity' },
      { name: 'jobId', type: 'id', label: 'Job' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'safety/inspection',
    module: 'safety',
    version: 1,
    fields: [
      { name: 'jobId', type: 'id', required: true, label: 'Job' },
      { name: 'date', type: 'date', required: true, label: 'Inspection Date' },
      { name: 'inspectorId', type: 'id', label: 'Inspector' },
      { name: 'result', type: 'enum', enum: ['pass', 'fail', 'conditional'], label: 'Result' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
  {
    collection: 'safety/oshaLog',
    module: 'safety',
    version: 1,
    fields: [
      { name: 'year', type: 'number', required: true, label: 'Year' },
      { name: 'formType', type: 'enum', enum: ['300', '300A', '301'], required: true, label: 'Form Type' },
      { name: 'status', type: 'enum', enum: ['draft', 'final', 'submitted'], label: 'Status' },
    ],
    relations: [],
  },
  {
    collection: 'safety/toolboxTalk',
    module: 'safety',
    version: 1,
    fields: [
      { name: 'topic', type: 'string', required: true, label: 'Topic' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'attendees', type: 'array', label: 'Attendees' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'safety/corrective',
    module: 'safety',
    version: 1,
    fields: [
      { name: 'incidentId', type: 'id', label: 'Incident' },
      { name: 'description', type: 'string', required: true, label: 'Corrective Action' },
      { name: 'assigneeId', type: 'id', label: 'Assignee' },
      { name: 'status', type: 'enum', enum: ['open', 'in-progress', 'complete', 'verified'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'incidentId', collection: 'safety/incident', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'safety/drugTest',
    module: 'safety',
    version: 1,
    fields: [
      { name: 'employeeId', type: 'id', required: true, label: 'Employee' },
      { name: 'date', type: 'date', required: true, label: 'Test Date' },
      { name: 'type', type: 'enum', enum: ['pre-employment', 'random', 'post-incident', 'reasonable-suspicion'], label: 'Test Type' },
      { name: 'result', type: 'enum', enum: ['negative', 'positive', 'pending'], label: 'Result' },
    ],
    relations: [
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'restrict' },
    ],
  },
];
