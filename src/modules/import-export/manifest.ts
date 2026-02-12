import type { ModuleManifest } from '../../core/types/module';

export const importExportManifest: ModuleManifest = {
  id: 'concrete.importExport',
  name: 'Import/Export Engine V2',
  description: 'Universal import wizard, multi-format support (Foundation, QuickBooks, Sage, CSV, JSON, IIF), merge with conflict resolution, dry-run preview, batch undo, full backup/restore, selective export with column selection and PDF letterhead',
  version: '2.0.0',
  phase: 15,
  dependencies: ['concrete.gl', 'concrete.entity'],
  collections: [
    'integration/importBatch',
    'integration/importError',
    'integration/exportJob',
    'integration/fieldMapping',
  ],
  routes: [
    { path: '/import-export', component: () => import('./views/import-wizard'), title: 'Import/Export', icon: 'upload-cloud' },
    { path: '/import-export/import', component: () => import('./views/import-wizard'), title: 'Import Wizard', icon: 'upload' },
    { path: '/import-export/import/:batchId', component: () => import('./views/preview'), title: 'Import Preview', icon: 'eye' },
    { path: '/import-export/export', component: () => import('./views/export-wizard'), title: 'Export Data', icon: 'download' },
    { path: '/import-export/backup', component: () => import('./views/backup-restore'), title: 'Backup & Restore', icon: 'database' },
    { path: '/import-export/restore', component: () => import('./views/backup-restore'), title: 'Restore Data', icon: 'refresh-cw' },
    { path: '/import-export/history', component: () => import('./views/import-history'), title: 'Import History', icon: 'clock' },
  ],
  navItems: [
    { id: 'import-export', label: 'Import/Export', icon: 'upload-cloud', path: '/import-export', order: 150 },
    { id: 'ie-import', label: 'Import', icon: 'upload', path: '/import-export/import', order: 1, parent: 'import-export' },
    { id: 'ie-export', label: 'Export', icon: 'download', path: '/import-export/export', order: 2, parent: 'import-export' },
    { id: 'ie-backup', label: 'Backup & Restore', icon: 'database', path: '/import-export/backup', order: 3, parent: 'import-export' },
    { id: 'ie-history', label: 'History', icon: 'clock', path: '/import-export/history', order: 4, parent: 'import-export' },
  ],
  dashboardWidgets: [],
  settings: [],
  permissions: [
    { resource: 'import', actions: ['create', 'read', 'commit', 'revert', 'delete'], description: 'Import data from files' },
    { resource: 'export', actions: ['create', 'read', 'download'], description: 'Export data to files' },
    { resource: 'backup', actions: ['create', 'restore'], description: 'Full backup and restore' },
  ],
  workflows: [],
  importTypes: [],
  exportTypes: [],
  hooks: [],
};
