/**
 * Analytics module collection schemas.
 * dashboard, widget, savedReport, kpiDef, benchmark.
 */

import type { SchemaDef } from '../../types/schema';

export const analyticsSchemas: SchemaDef[] = [
  {
    collection: 'analytics/dashboard',
    module: 'analytics',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Dashboard Name' },
      { name: 'layout', type: 'object', label: 'Layout Configuration' },
      { name: 'isDefault', type: 'boolean', label: 'Default Dashboard' },
    ],
    relations: [],
  },
  {
    collection: 'analytics/widget',
    module: 'analytics',
    version: 1,
    fields: [
      { name: 'dashboardId', type: 'id', required: true, label: 'Dashboard' },
      { name: 'type', type: 'enum', enum: ['chart', 'kpi', 'table', 'list', 'map'], label: 'Widget Type' },
      { name: 'config', type: 'object', label: 'Widget Config' },
      { name: 'position', type: 'object', label: 'Position' },
    ],
    relations: [
      { foreignKey: 'dashboardId', collection: 'analytics/dashboard', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
  {
    collection: 'analytics/savedReport',
    module: 'analytics',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Report Name' },
      { name: 'definition', type: 'object', required: true, label: 'Report Definition' },
      { name: 'schedule', type: 'string', label: 'Schedule (cron)' },
    ],
    relations: [],
  },
  {
    collection: 'analytics/kpiDef',
    module: 'analytics',
    version: 1,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'KPI Name' },
      { name: 'formula', type: 'string', required: true, label: 'Formula' },
      { name: 'unit', type: 'enum', enum: ['currency', 'percentage', 'number', 'days'], label: 'Unit' },
      { name: 'target', type: 'number', label: 'Target Value' },
    ],
    relations: [],
  },
  {
    collection: 'analytics/benchmark',
    module: 'analytics',
    version: 1,
    fields: [
      { name: 'kpiDefId', type: 'id', required: true, label: 'KPI Definition' },
      { name: 'period', type: 'string', required: true, label: 'Period' },
      { name: 'value', type: 'number', required: true, label: 'Benchmark Value' },
      { name: 'source', type: 'string', label: 'Source' },
    ],
    relations: [
      { foreignKey: 'kpiDefId', collection: 'analytics/kpiDef', type: 'belongsTo', cascade: 'cascade' },
    ],
  },
];
