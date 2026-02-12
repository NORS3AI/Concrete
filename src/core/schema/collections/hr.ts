/**
 * Human Resources module collection schemas.
 * position, certification, training, benefit, leave, applicant.
 */

import type { SchemaDef } from '../../types/schema';

export const hrSchemas: SchemaDef[] = [
  {
    collection: 'hr/position',
    module: 'hr',
    version: 1,
    fields: [
      { name: 'title', type: 'string', required: true, label: 'Position Title' },
      { name: 'department', type: 'string', label: 'Department' },
      { name: 'status', type: 'enum', enum: ['open', 'filled', 'closed'], label: 'Status' },
      { name: 'payGrade', type: 'string', label: 'Pay Grade' },
    ],
    relations: [],
  },
  {
    collection: 'hr/certification',
    module: 'hr',
    version: 1,
    fields: [
      { name: 'employeeId', type: 'id', required: true, label: 'Employee' },
      { name: 'name', type: 'string', required: true, label: 'Certification Name' },
      { name: 'issuedDate', type: 'date', label: 'Issued Date' },
      { name: 'expirationDate', type: 'date', label: 'Expiration Date' },
    ],
    relations: [
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'hr/training',
    module: 'hr',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Training Name' },
      { name: 'type', type: 'enum', enum: ['required', 'optional', 'safety', 'professional'], label: 'Training Type' },
      { name: 'durationHours', type: 'number', label: 'Duration (Hours)' },
    ],
    relations: [],
  },
  {
    collection: 'hr/benefit',
    module: 'hr',
    version: 1,
    fields: [
      { name: 'employeeId', type: 'id', required: true, label: 'Employee' },
      { name: 'planId', type: 'id', label: 'Benefit Plan' },
      { name: 'enrollmentDate', type: 'date', label: 'Enrollment Date' },
      { name: 'status', type: 'enum', enum: ['active', 'waived', 'terminated'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'hr/leave',
    module: 'hr',
    version: 1,
    fields: [
      { name: 'employeeId', type: 'id', required: true, label: 'Employee' },
      { name: 'type', type: 'enum', enum: ['vacation', 'sick', 'personal', 'fmla', 'bereavement'], label: 'Leave Type' },
      { name: 'startDate', type: 'date', required: true, label: 'Start Date' },
      { name: 'status', type: 'enum', enum: ['requested', 'approved', 'denied', 'cancelled'], label: 'Status' },
    ],
    relations: [
      { foreignKey: 'employeeId', collection: 'payroll/employee', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'hr/applicant',
    module: 'hr',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Applicant Name' },
      { name: 'positionId', type: 'id', label: 'Applied Position' },
      { name: 'status', type: 'enum', enum: ['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'], label: 'Status' },
      { name: 'applicationDate', type: 'date', label: 'Application Date' },
    ],
    relations: [
      { foreignKey: 'positionId', collection: 'hr/position', type: 'belongsTo', cascade: 'nullify' },
    ],
  },
];
