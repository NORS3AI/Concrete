export const safetyManifest = {
  id: 'concrete.safety',
  name: 'Safety & Compliance',
  description: 'OSHA compliance, incident recording, inspections, PPE tracking, drug testing, DOT compliance, and safety dashboard.',
  version: '1.0.0',
  phase: 23,
  dependencies: ['concrete.hr'],

  collections: [
    'safety/incident',
    'safety/inspection',
    'safety/toolboxTalk',
    'safety/ppeRecord',
    'safety/drugTest',
    'safety/safetyPlan',
    'safety/safetyTraining',
    'safety/correctiveAction',
    'safety/dotCompliance',
    'safety/emrRecord',
  ],

  routes: [
    { path: '/safety/incidents', component: () => import('./views/incidents'), title: 'Incidents', icon: 'alert-circle' },
    { path: '/safety/osha-logs', component: () => import('./views/osha-logs'), title: 'OSHA Logs', icon: 'file-text' },
    { path: '/safety/rates', component: () => import('./views/rates'), title: 'TRIR / DART / EMR', icon: 'bar-chart' },
    { path: '/safety/inspections', component: () => import('./views/inspections'), title: 'Inspections', icon: 'clipboard' },
    { path: '/safety/toolbox-talks', component: () => import('./views/toolbox-talks'), title: 'Toolbox Talks', icon: 'message-square' },
    { path: '/safety/ppe', component: () => import('./views/ppe'), title: 'PPE Tracking', icon: 'shield' },
    { path: '/safety/drug-tests', component: () => import('./views/drug-tests'), title: 'Drug Testing', icon: 'activity' },
    { path: '/safety/plans', component: () => import('./views/plans'), title: 'Safety Plans', icon: 'map' },
    { path: '/safety/training-matrix', component: () => import('./views/training-matrix'), title: 'Training Matrix', icon: 'grid' },
    { path: '/safety/corrective-actions', component: () => import('./views/corrective-actions'), title: 'Corrective Actions', icon: 'check-circle' },
    { path: '/safety/dashboard', component: () => import('./views/dashboard'), title: 'Safety Dashboard', icon: 'bar-chart-2' },
    { path: '/safety/dot', component: () => import('./views/dot'), title: 'DOT Compliance', icon: 'truck' },
  ],

  navItems: [
    { id: 'safety', label: 'Safety', icon: 'shield', path: '/safety/dashboard', order: 230 },
    { id: 'safety-dashboard', label: 'Dashboard', icon: 'bar-chart-2', path: '/safety/dashboard', order: 1, parent: 'safety' },
    { id: 'safety-incidents', label: 'Incidents', icon: 'alert-circle', path: '/safety/incidents', order: 2, parent: 'safety' },
    { id: 'safety-osha', label: 'OSHA Logs', icon: 'file-text', path: '/safety/osha-logs', order: 3, parent: 'safety' },
    { id: 'safety-rates', label: 'TRIR / DART / EMR', icon: 'bar-chart', path: '/safety/rates', order: 4, parent: 'safety' },
    { id: 'safety-inspections', label: 'Inspections', icon: 'clipboard', path: '/safety/inspections', order: 5, parent: 'safety' },
    { id: 'safety-toolbox', label: 'Toolbox Talks', icon: 'message-square', path: '/safety/toolbox-talks', order: 6, parent: 'safety' },
    { id: 'safety-ppe', label: 'PPE Tracking', icon: 'shield', path: '/safety/ppe', order: 7, parent: 'safety' },
    { id: 'safety-drugs', label: 'Drug Testing', icon: 'activity', path: '/safety/drug-tests', order: 8, parent: 'safety' },
    { id: 'safety-plans', label: 'Safety Plans', icon: 'map', path: '/safety/plans', order: 9, parent: 'safety' },
    { id: 'safety-training', label: 'Training Matrix', icon: 'grid', path: '/safety/training-matrix', order: 10, parent: 'safety' },
    { id: 'safety-ca', label: 'Corrective Actions', icon: 'check-circle', path: '/safety/corrective-actions', order: 11, parent: 'safety' },
    { id: 'safety-dot', label: 'DOT Compliance', icon: 'truck', path: '/safety/dot', order: 12, parent: 'safety' },
  ],

  dashboardWidgets: [],
  settings: [],

  permissions: [
    { resource: 'safety.incident', actions: ['create', 'read', 'update', 'investigate', 'close', 'export'], description: 'Safety incident management' },
    { resource: 'safety.osha', actions: ['read', 'generate', 'export'], description: 'OSHA log generation' },
    { resource: 'safety.inspection', actions: ['create', 'read', 'complete', 'fail'], description: 'Inspection and audit management' },
    { resource: 'safety.toolbox', actions: ['create', 'read'], description: 'Toolbox talk and meeting logs' },
    { resource: 'safety.ppe', actions: ['create', 'read', 'update'], description: 'PPE tracking' },
    { resource: 'safety.drugTest', actions: ['create', 'read', 'update'], description: 'Drug testing schedule and results' },
    { resource: 'safety.plan', actions: ['create', 'read', 'update', 'approve'], description: 'Safety plan management' },
    { resource: 'safety.training', actions: ['create', 'read', 'complete'], description: 'Safety training matrix' },
    { resource: 'safety.correctiveAction', actions: ['create', 'read', 'complete', 'verify'], description: 'Corrective action tracking' },
    { resource: 'safety.dot', actions: ['create', 'read', 'update'], description: 'DOT compliance tracking' },
    { resource: 'safety.emr', actions: ['create', 'read'], description: 'EMR tracking' },
  ],

  workflows: [],

  importTypes: [
    {
      id: 'safety-incidents',
      label: 'Import Incident Records',
      collection: 'safety/incident',
      fields: [
        { name: 'incidentNumber', type: 'string', required: true, label: 'Incident Number' },
        { name: 'type', type: 'string', required: true, label: 'Type' },
        { name: 'severity', type: 'string', required: true, label: 'Severity' },
        { name: 'date', type: 'string', required: true, label: 'Date' },
        { name: 'employeeName', type: 'string', required: false, label: 'Employee' },
        { name: 'description', type: 'string', required: true, label: 'Description' },
        { name: 'jobId', type: 'string', required: false, label: 'Job ID' },
        { name: 'location', type: 'string', required: false, label: 'Location' },
      ],
      autoDetectHeaders: true,
    },
  ],

  exportTypes: [
    {
      id: 'safety-osha300-export',
      label: 'Export OSHA 300 Log',
      collection: 'safety/incident',
      defaultFields: ['incidentNumber', 'employeeName', 'date', 'location', 'description', 'severity', 'daysAway', 'daysRestricted', 'type', 'bodyPart'],
    },
    {
      id: 'safety-incidents-export',
      label: 'Export All Incidents',
      collection: 'safety/incident',
      defaultFields: ['incidentNumber', 'type', 'severity', 'status', 'date', 'employeeName', 'description', 'oshaRecordable', 'daysAway', 'daysRestricted'],
    },
  ],

  hooks: [],
};
