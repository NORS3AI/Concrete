import type { ModuleManifest } from '../../core/types/module';

export const entityManifest: ModuleManifest = {
  id: 'concrete.entity',
  name: 'Multi-Entity',
  description: 'Multi-entity company structure, hierarchy, intercompany transactions, and consolidated reporting',
  version: '1.0.0',
  phase: 2,
  dependencies: ['concrete.gl'],
  collections: [
    'entity/entity',
    'entity/hierarchy',
    'entity/alias',
    'entity/coaOverride',
    'entity/intercompany',
  ],
  routes: [
    { path: '/entities', component: () => import('./views/entity-list'), title: 'Entities', icon: 'building' },
    { path: '/entities/new', component: () => import('./views/entity-form'), title: 'New Entity', icon: 'plus' },
    { path: '/entities/:id', component: () => import('./views/entity-form'), title: 'Edit Entity', icon: 'edit' },
    { path: '/entities/org-chart', component: () => import('./views/org-chart'), title: 'Org Chart', icon: 'sitemap' },
    { path: '/entities/intercompany', component: () => import('./views/intercompany'), title: 'Intercompany', icon: 'exchange' },
    { path: '/entities/intercompany/new', component: () => import('./views/intercompany-form'), title: 'New IC Transaction', icon: 'plus' },
    { path: '/entities/consolidated', component: () => import('./views/consolidated'), title: 'Consolidated Statements', icon: 'chart-bar' },
    { path: '/entities/coa-overrides', component: () => import('./views/coa-overrides'), title: 'COA Overrides', icon: 'sliders' },
  ],
  navItems: [
    { id: 'entities', label: 'Entities', icon: 'building', path: '/entities', order: 20 },
    { id: 'entity-list', label: 'Entity List', icon: 'list', path: '/entities', order: 1, parent: 'entities' },
    { id: 'entity-org-chart', label: 'Org Chart', icon: 'sitemap', path: '/entities/org-chart', order: 2, parent: 'entities' },
    { id: 'entity-intercompany', label: 'Intercompany', icon: 'exchange', path: '/entities/intercompany', order: 3, parent: 'entities' },
    { id: 'entity-consolidated', label: 'Consolidated', icon: 'chart-bar', path: '/entities/consolidated', order: 4, parent: 'entities' },
    { id: 'entity-coa', label: 'COA Overrides', icon: 'sliders', path: '/entities/coa-overrides', order: 5, parent: 'entities' },
  ],
  dashboardWidgets: [],
  settings: [],
  permissions: [
    { resource: 'entity', actions: ['create', 'read', 'update', 'delete', 'clone', 'export'], description: 'Entity management' },
    { resource: 'intercompany', actions: ['create', 'read', 'post', 'eliminate', 'export'], description: 'Intercompany transactions' },
    { resource: 'consolidated', actions: ['read', 'export'], description: 'Consolidated reporting' },
  ],
  workflows: [],
  importTypes: [
    {
      id: 'entity-entities',
      label: 'Import Entities',
      collection: 'entity/entity',
      fields: [
        { name: 'code', type: 'string', required: true, label: 'Entity Code' },
        { name: 'name', type: 'string', required: true, label: 'Entity Name' },
        { name: 'type', type: 'string', required: true, label: 'Entity Type' },
        { name: 'parentCode', type: 'string', label: 'Parent Entity Code' },
        { name: 'taxId', type: 'string', label: 'Tax ID' },
        { name: 'currency', type: 'string', label: 'Currency' },
      ],
      autoDetectHeaders: true,
    },
  ],
  exportTypes: [
    { id: 'entity-entities', label: 'Export Entities', collection: 'entity/entity', defaultFields: ['code', 'name', 'type', 'status', 'parentId', 'currency'] },
    { id: 'entity-intercompany', label: 'Export Intercompany', collection: 'entity/intercompany', defaultFields: ['fromEntityId', 'toEntityId', 'date', 'amount', 'status'] },
  ],
  hooks: [],
};
