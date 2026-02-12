/**
 * Analytics module collection schemas (v2 - Enhanced for Phase 12).
 * dashboard, widget, savedReport, kpiDef, benchmark.
 *
 * Provides schema definitions for configurable dashboards, KPI definitions,
 * widgets with positioning, saved reports, and industry benchmarks.
 */

import type { SchemaDef } from '../../types/schema';

export const analyticsSchemas: SchemaDef[] = [
  // =========================================================================
  // analytics/dashboard
  // =========================================================================
  {
    collection: 'analytics/dashboard',
    module: 'analytics',
    version: 2,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Dashboard Name' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'layout', type: 'enum', enum: ['grid', 'list', 'free'], label: 'Layout Mode' },
      { name: 'entityId', type: 'id', label: 'Entity Filter' },
      { name: 'isDefault', type: 'boolean', label: 'Default Dashboard' },
      { name: 'widgets', type: 'object', label: 'Widget Placement Configs (JSON array)' },
    ],
    relations: [],
    indexes: [
      { fields: ['name'], unique: true, name: 'idx_dashboard_name' },
      { fields: ['entityId'], name: 'idx_dashboard_entity' },
      { fields: ['isDefault'], name: 'idx_dashboard_default' },
    ],
  },

  // =========================================================================
  // analytics/widget
  // =========================================================================
  {
    collection: 'analytics/widget',
    module: 'analytics',
    version: 2,
    fields: [
      { name: 'dashboardId', type: 'id', required: true, label: 'Dashboard' },
      { name: 'type', type: 'enum', enum: ['kpi_card', 'chart', 'table', 'gauge', 'trend'], required: true, label: 'Widget Type' },
      { name: 'title', type: 'string', required: true, label: 'Widget Title' },
      { name: 'config', type: 'object', label: 'Widget Config (JSON - dataSource, filters, thresholds, format)' },
      { name: 'position', type: 'object', label: 'Position (row, col, width, height)' },
    ],
    relations: [
      { foreignKey: 'dashboardId', collection: 'analytics/dashboard', type: 'belongsTo', cascade: 'cascade' },
    ],
    indexes: [
      { fields: ['dashboardId'], name: 'idx_widget_dashboard' },
      { fields: ['type'], name: 'idx_widget_type' },
    ],
  },

  // =========================================================================
  // analytics/savedReport
  // =========================================================================
  {
    collection: 'analytics/savedReport',
    module: 'analytics',
    version: 2,
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Report Name' },
      { name: 'reportType', type: 'string', required: true, label: 'Report Type' },
      { name: 'config', type: 'object', required: true, label: 'Report Config (JSON)' },
      { name: 'createdBy', type: 'string', label: 'Created By' },
      { name: 'isShared', type: 'boolean', label: 'Shared Report' },
    ],
    relations: [],
    indexes: [
      { fields: ['name'], unique: true, name: 'idx_savedreport_name' },
      { fields: ['reportType'], name: 'idx_savedreport_type' },
      { fields: ['createdBy'], name: 'idx_savedreport_creator' },
    ],
  },

  // =========================================================================
  // analytics/kpiDef
  // =========================================================================
  {
    collection: 'analytics/kpiDef',
    module: 'analytics',
    version: 2,
    fields: [
      { name: 'code', type: 'string', required: true, label: 'KPI Code' },
      { name: 'name', type: 'string', required: true, label: 'KPI Name' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'category', type: 'enum', enum: ['financial', 'operational', 'safety', 'hr'], required: true, label: 'Category' },
      { name: 'formula', type: 'string', required: true, label: 'Formula' },
      { name: 'format', type: 'enum', enum: ['currency', 'percent', 'number', 'days'], required: true, label: 'Display Format' },
      { name: 'thresholdWarning', type: 'number', label: 'Warning Threshold' },
      { name: 'thresholdCritical', type: 'number', label: 'Critical Threshold' },
      { name: 'higherIsBetter', type: 'boolean', label: 'Higher Is Better' },
    ],
    relations: [],
    indexes: [
      { fields: ['code'], unique: true, name: 'idx_kpidef_code' },
      { fields: ['category'], name: 'idx_kpidef_category' },
    ],
  },

  // =========================================================================
  // analytics/benchmark
  // =========================================================================
  {
    collection: 'analytics/benchmark',
    module: 'analytics',
    version: 2,
    fields: [
      { name: 'kpiCode', type: 'string', required: true, label: 'KPI Code' },
      { name: 'entityId', type: 'id', label: 'Entity' },
      { name: 'period', type: 'string', required: true, label: 'Period' },
      { name: 'value', type: 'number', required: true, label: 'Actual Value' },
      { name: 'target', type: 'number', label: 'Target Value' },
      { name: 'industry', type: 'string', label: 'Industry Benchmark' },
    ],
    relations: [],
    indexes: [
      { fields: ['kpiCode', 'period'], name: 'idx_benchmark_kpi_period' },
      { fields: ['entityId'], name: 'idx_benchmark_entity' },
      { fields: ['kpiCode'], name: 'idx_benchmark_kpi' },
    ],
  },
];
