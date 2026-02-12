import type { ModuleManifest } from '../../core/types/module';

export const jobManifest: ModuleManifest = {
  id: 'concrete.job',
  name: 'Job Costing',
  description: 'Job/project costing, budgets, actual costs, committed costs, WIP, and profitability reporting',
  version: '1.0.0',
  phase: 3,
  dependencies: ['concrete.gl', 'concrete.entity'],
  collections: [
    'job/job', 'job/costCode', 'job/budget', 'job/budgetLine',
    'job/actualCost', 'job/committedCost', 'job/wip', 'job/changeOrder',
  ],
  routes: [
    { path: '/jobs', component: () => import('./views/job-list'), title: 'Jobs', icon: 'briefcase' },
    { path: '/jobs/new', component: () => import('./views/job-form'), title: 'New Job', icon: 'plus' },
    { path: '/jobs/:id', component: () => import('./views/job-form'), title: 'Edit Job', icon: 'edit' },
    { path: '/jobs/:id/costs', component: () => import('./views/job-cost-detail'), title: 'Job Cost Detail', icon: 'dollar-sign' },
    { path: '/jobs/:id/budget', component: () => import('./views/budget'), title: 'Budget', icon: 'clipboard' },
    { path: '/jobs/:id/committed', component: () => import('./views/committed'), title: 'Committed Costs', icon: 'file-text' },
    { path: '/jobs/:id/change-orders', component: () => import('./views/change-orders'), title: 'Change Orders', icon: 'edit-3' },
    { path: '/jobs/cost-codes', component: () => import('./views/cost-codes'), title: 'Cost Codes', icon: 'hash' },
    { path: '/jobs/profitability', component: () => import('./views/profitability'), title: 'Profitability', icon: 'trending-up' },
    { path: '/jobs/wip', component: () => import('./views/wip'), title: 'WIP Schedule', icon: 'bar-chart-2' },
  ],
  navItems: [
    { id: 'jobs', label: 'Jobs', icon: 'briefcase', path: '/jobs', order: 30 },
    { id: 'job-list', label: 'Job List', icon: 'list', path: '/jobs', order: 1, parent: 'jobs' },
    { id: 'job-cost-codes', label: 'Cost Codes', icon: 'hash', path: '/jobs/cost-codes', order: 2, parent: 'jobs' },
    { id: 'job-profitability', label: 'Profitability', icon: 'trending-up', path: '/jobs/profitability', order: 3, parent: 'jobs' },
    { id: 'job-wip', label: 'WIP Schedule', icon: 'bar-chart-2', path: '/jobs/wip', order: 4, parent: 'jobs' },
  ],
  dashboardWidgets: [],
  settings: [],
  permissions: [
    { resource: 'job', actions: ['create', 'read', 'update', 'delete', 'export'], description: 'Job management' },
    { resource: 'budget', actions: ['create', 'read', 'update', 'approve', 'export'], description: 'Budget management' },
    { resource: 'cost', actions: ['create', 'read', 'export'], description: 'Cost posting' },
    { resource: 'wip', actions: ['read', 'generate', 'export'], description: 'WIP schedule' },
    { resource: 'changeOrder', actions: ['create', 'read', 'approve', 'reject', 'export'], description: 'Change orders' },
  ],
  workflows: [],
  importTypes: [
    {
      id: 'job-budgets',
      label: 'Import Budgets',
      collection: 'job/budgetLine',
      fields: [
        { name: 'jobNumber', type: 'string', required: true, label: 'Job Number' },
        { name: 'costCode', type: 'string', required: true, label: 'Cost Code' },
        { name: 'costType', type: 'string', required: true, label: 'Cost Type' },
        { name: 'amount', type: 'number', required: true, label: 'Amount' },
        { name: 'description', type: 'string', label: 'Description' },
      ],
      autoDetectHeaders: true,
    },
  ],
  exportTypes: [
    { id: 'job-list', label: 'Export Jobs', collection: 'job/job', defaultFields: ['number', 'name', 'type', 'status', 'contractAmount', 'totalBudget', 'totalActualCost'] },
    { id: 'job-costs', label: 'Export Job Costs', collection: 'job/actualCost', defaultFields: ['jobId', 'costCodeId', 'costType', 'date', 'amount', 'source'] },
  ],
  hooks: [],
};
