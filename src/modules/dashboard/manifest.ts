/**
 * Dashboard & KPI Engine Module Manifest (Phase 12)
 *
 * Provides executive dashboards, job performance tracking, cash flow
 * forecasting, backlog analysis, equipment utilization, payroll burden,
 * safety metrics, bonding capacity, revenue recognition trends,
 * and configurable KPI cards with thresholds and alerts.
 */

import type { ModuleManifest } from '../../core/types/module';

export const dashboardManifest: ModuleManifest = {
  id: 'concrete.dashboard',
  name: 'Dashboard & KPI Engine',
  description: 'Executive dashboards, KPI computation engine, configurable widgets, period comparison, entity filtering, and drill-down analytics for construction financial management',
  version: '1.0.0',
  phase: 12,
  dependencies: [
    'concrete.gl',
    'concrete.entity',
    'concrete.job',
    'concrete.ap',
    'concrete.ar',
  ],
  collections: [
    'analytics/dashboard',
    'analytics/widget',
    'analytics/savedReport',
    'analytics/kpiDef',
    'analytics/benchmark',
  ],
  routes: [
    { path: '/dashboard', component: () => import('./views/executive'), title: 'Dashboard', icon: 'layout-dashboard' },
    { path: '/dashboard/executive', component: () => import('./views/executive'), title: 'Executive Dashboard', icon: 'bar-chart-2' },
    { path: '/dashboard/jobs', component: () => import('./views/job-performance'), title: 'Job Performance', icon: 'briefcase' },
    { path: '/dashboard/cash-flow', component: () => import('./views/cash-flow'), title: 'Cash Flow', icon: 'trending-up' },
    { path: '/dashboard/backlog', component: () => import('./views/backlog'), title: 'Backlog Analysis', icon: 'layers' },
    { path: '/dashboard/equipment', component: () => import('./views/equipment-dash'), title: 'Equipment Utilization', icon: 'truck' },
    { path: '/dashboard/payroll', component: () => import('./views/payroll-dash'), title: 'Payroll Burden', icon: 'users' },
    { path: '/dashboard/safety', component: () => import('./views/safety-dash'), title: 'Safety Metrics', icon: 'shield' },
    { path: '/dashboard/configure', component: () => import('./views/configure'), title: 'Configure Dashboard', icon: 'settings' },
  ],
  navItems: [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', path: '/dashboard', order: 5 },
    { id: 'dashboard-executive', label: 'Executive', icon: 'bar-chart-2', path: '/dashboard/executive', order: 1, parent: 'dashboard' },
    { id: 'dashboard-jobs', label: 'Job Performance', icon: 'briefcase', path: '/dashboard/jobs', order: 2, parent: 'dashboard' },
    { id: 'dashboard-cashflow', label: 'Cash Flow', icon: 'trending-up', path: '/dashboard/cash-flow', order: 3, parent: 'dashboard' },
    { id: 'dashboard-backlog', label: 'Backlog', icon: 'layers', path: '/dashboard/backlog', order: 4, parent: 'dashboard' },
    { id: 'dashboard-equipment', label: 'Equipment', icon: 'truck', path: '/dashboard/equipment', order: 5, parent: 'dashboard' },
    { id: 'dashboard-payroll', label: 'Payroll', icon: 'users', path: '/dashboard/payroll', order: 6, parent: 'dashboard' },
    { id: 'dashboard-safety', label: 'Safety', icon: 'shield', path: '/dashboard/safety', order: 7, parent: 'dashboard' },
    { id: 'dashboard-configure', label: 'Configure', icon: 'settings', path: '/dashboard/configure', order: 8, parent: 'dashboard' },
  ],
  dashboardWidgets: [],
  settings: [],
  permissions: [
    { resource: 'dashboard', actions: ['create', 'read', 'update', 'delete'], description: 'Dashboard management' },
    { resource: 'dashboard.widget', actions: ['create', 'read', 'update', 'delete'], description: 'Widget management' },
    { resource: 'dashboard.kpiDef', actions: ['create', 'read', 'update', 'delete'], description: 'KPI definition management' },
    { resource: 'dashboard.benchmark', actions: ['create', 'read', 'update', 'delete'], description: 'Benchmark data management' },
    { resource: 'dashboard.savedReport', actions: ['create', 'read', 'update', 'delete', 'share'], description: 'Saved report management' },
    { resource: 'dashboard.kpi', actions: ['compute', 'export'], description: 'KPI computation and export' },
  ],
  workflows: [],
  importTypes: [
    {
      id: 'dashboard-benchmarks',
      label: 'Import KPI Benchmarks',
      collection: 'analytics/benchmark',
      fields: [
        { name: 'kpiCode', type: 'string', required: true, label: 'KPI Code' },
        { name: 'period', type: 'string', required: true, label: 'Period' },
        { name: 'value', type: 'number', required: true, label: 'Value' },
        { name: 'target', type: 'number', label: 'Target' },
        { name: 'entityId', type: 'string', label: 'Entity ID' },
        { name: 'industry', type: 'string', label: 'Industry Benchmark' },
      ],
      autoDetectHeaders: true,
    },
    {
      id: 'dashboard-kpiDefs',
      label: 'Import KPI Definitions',
      collection: 'analytics/kpiDef',
      fields: [
        { name: 'code', type: 'string', required: true, label: 'KPI Code' },
        { name: 'name', type: 'string', required: true, label: 'KPI Name' },
        { name: 'category', type: 'string', required: true, label: 'Category' },
        { name: 'formula', type: 'string', required: true, label: 'Formula' },
        { name: 'format', type: 'string', required: true, label: 'Format' },
        { name: 'thresholdWarning', type: 'number', label: 'Warning Threshold' },
        { name: 'thresholdCritical', type: 'number', label: 'Critical Threshold' },
        { name: 'higherIsBetter', type: 'boolean', label: 'Higher Is Better' },
      ],
      autoDetectHeaders: true,
    },
  ],
  exportTypes: [
    { id: 'dashboard-kpis', label: 'Export KPI Results', collection: 'analytics/benchmark', defaultFields: ['kpiCode', 'period', 'value', 'target', 'entityId'] },
    { id: 'dashboard-kpiDefs', label: 'Export KPI Definitions', collection: 'analytics/kpiDef', defaultFields: ['code', 'name', 'category', 'formula', 'format', 'thresholdWarning', 'thresholdCritical', 'higherIsBetter'] },
  ],
  hooks: [],
};
