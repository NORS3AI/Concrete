/**
 * Project Management module collection schemas.
 * project, phase, task, milestone, rfi, submittal, dailyLog, meetingMinutes, punchList.
 */

import type { SchemaDef } from '../../types/schema';

export const projSchemas: SchemaDef[] = [
  {
    collection: 'proj/project',
    module: 'proj',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Project Name' },
      { name: 'jobId', type: 'id', label: 'Job' },
      { name: 'startDate', type: 'date', label: 'Start Date' },
      { name: 'status', type: 'enum', enum: ['planning', 'active', 'on-hold', 'complete'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'jobId', collection: 'job/job', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
  {
    collection: 'proj/phase',
    module: 'proj',
    version: 1,
    fields: [
      { name: 'projectId', type: 'id', required: true, label: 'Project' },
      { name: 'name', type: 'string', required: true, label: 'Phase Name' },
      { name: 'order', type: 'number', label: 'Sort Order' },
      { name: 'status', type: 'enum', enum: ['pending', 'active', 'complete'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'projectId', collection: 'proj/project', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'proj/task',
    module: 'proj',
    version: 1,
    fields: [
      { name: 'phaseId', type: 'id', label: 'Phase' },
      { name: 'name', type: 'string', required: true, label: 'Task Name' },
      { name: 'assigneeId', type: 'id', label: 'Assignee' },
      { name: 'status', type: 'enum', enum: ['todo', 'in-progress', 'done', 'blocked'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'phaseId', collection: 'proj/phase', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'proj/milestone',
    module: 'proj',
    version: 1,
    fields: [
      { name: 'projectId', type: 'id', required: true, label: 'Project' },
      { name: 'name', type: 'string', required: true, label: 'Milestone Name' },
      { name: 'dueDate', type: 'date', label: 'Due Date' },
      { name: 'status', type: 'enum', enum: ['upcoming', 'reached', 'missed'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'projectId', collection: 'proj/project', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'proj/rfi',
    module: 'proj',
    version: 1,
    fields: [
      { name: 'projectId', type: 'id', required: true, label: 'Project' },
      { name: 'number', type: 'number', required: true, label: 'RFI Number' },
      { name: 'subject', type: 'string', required: true, label: 'Subject' },
      { name: 'status', type: 'enum', enum: ['draft', 'open', 'answered', 'closed'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'projectId', collection: 'proj/project', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'proj/submittal',
    module: 'proj',
    version: 1,
    fields: [
      { name: 'projectId', type: 'id', required: true, label: 'Project' },
      { name: 'number', type: 'number', required: true, label: 'Submittal Number' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'status', type: 'enum', enum: ['pending', 'submitted', 'approved', 'rejected', 'revise-resubmit'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'projectId', collection: 'proj/project', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'proj/dailyLog',
    module: 'proj',
    version: 1,
    fields: [
      { name: 'projectId', type: 'id', required: true, label: 'Project' },
      { name: 'date', type: 'date', required: true, label: 'Date' },
      { name: 'weather', type: 'string', label: 'Weather' },
      { name: 'notes', type: 'string', label: 'Notes' },
    ],
    relations: [
      { foreignKey: 'projectId', collection: 'proj/project', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'proj/meetingMinutes',
    module: 'proj',
    version: 1,
    fields: [
      { name: 'projectId', type: 'id', required: true, label: 'Project' },
      { name: 'date', type: 'date', required: true, label: 'Meeting Date' },
      { name: 'subject', type: 'string', required: true, label: 'Subject' },
      { name: 'attendees', type: 'array', label: 'Attendees' },
    ],
    relations: [
      { foreignKey: 'projectId', collection: 'proj/project', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'proj/punchList',
    module: 'proj',
    version: 1,
    fields: [
      { name: 'projectId', type: 'id', required: true, label: 'Project' },
      { name: 'description', type: 'string', required: true, label: 'Description' },
      { name: 'assigneeId', type: 'id', label: 'Assignee' },
      { name: 'status', type: 'enum', enum: ['open', 'in-progress', 'complete', 'verified'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'projectId', collection: 'proj/project', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
