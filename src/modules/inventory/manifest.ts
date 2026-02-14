export const inventoryManifest = {
  id: 'concrete.inventory',
  name: 'Inventory & Material Management',
  description: 'Track materials across warehouses, yards, and job sites with full valuation and requisition workflow.',
  version: '1.0.0',
  phase: 21,
  dependencies: ['concrete.job'],

  collections: [
    'inv/item',
    'inv/warehouse',
    'inv/transaction',
    'inv/requisition',
    'inv/count',
  ],

  routes: [
    { path: '/inventory/items', component: () => import('./views/item-list'), title: 'Item Master', icon: 'package' },
    { path: '/inventory/items/new', component: () => import('./views/item-form'), title: 'New Item', icon: 'plus' },
    { path: '/inventory/items/:id', component: () => import('./views/item-form'), title: 'Edit Item', icon: 'edit' },
    { path: '/inventory/warehouses', component: () => import('./views/warehouse-list'), title: 'Warehouses', icon: 'warehouse' },
    { path: '/inventory/receipts', component: () => import('./views/receipts'), title: 'Receipts', icon: 'arrow-down' },
    { path: '/inventory/issues', component: () => import('./views/issues'), title: 'Issues', icon: 'arrow-up' },
    { path: '/inventory/transfers', component: () => import('./views/transfers'), title: 'Transfers', icon: 'repeat' },
    { path: '/inventory/requisitions', component: () => import('./views/requisitions'), title: 'Requisitions', icon: 'clipboard-list' },
    { path: '/inventory/counts', component: () => import('./views/count'), title: 'Physical Count', icon: 'hash' },
    { path: '/inventory/valuation', component: () => import('./views/valuation'), title: 'Valuation', icon: 'dollar-sign' },
    { path: '/inventory/alerts', component: () => import('./views/alerts'), title: 'Low Stock Alerts', icon: 'alert-triangle' },
    { path: '/inventory/job-materials', component: () => import('./views/job-materials'), title: 'Job Materials', icon: 'hard-hat' },
    { path: '/inventory/waste', component: () => import('./views/waste'), title: 'Waste Tracking', icon: 'trash' },
  ],

  navItems: [
    { id: 'inventory', label: 'Inventory', icon: 'package', path: '/inventory/items', order: 210 },
    { id: 'inv-items', label: 'Item Master', icon: 'package', path: '/inventory/items', order: 1, parent: 'inventory' },
    { id: 'inv-warehouses', label: 'Warehouses', icon: 'warehouse', path: '/inventory/warehouses', order: 2, parent: 'inventory' },
    { id: 'inv-receipts', label: 'Receipts', icon: 'arrow-down', path: '/inventory/receipts', order: 3, parent: 'inventory' },
    { id: 'inv-issues', label: 'Issues', icon: 'arrow-up', path: '/inventory/issues', order: 4, parent: 'inventory' },
    { id: 'inv-transfers', label: 'Transfers', icon: 'repeat', path: '/inventory/transfers', order: 5, parent: 'inventory' },
    { id: 'inv-requisitions', label: 'Requisitions', icon: 'clipboard-list', path: '/inventory/requisitions', order: 6, parent: 'inventory' },
    { id: 'inv-counts', label: 'Physical Count', icon: 'hash', path: '/inventory/counts', order: 7, parent: 'inventory' },
    { id: 'inv-valuation', label: 'Valuation', icon: 'dollar-sign', path: '/inventory/valuation', order: 8, parent: 'inventory' },
    { id: 'inv-alerts', label: 'Low Stock Alerts', icon: 'alert-triangle', path: '/inventory/alerts', order: 9, parent: 'inventory' },
    { id: 'inv-job-materials', label: 'Job Materials', icon: 'hard-hat', path: '/inventory/job-materials', order: 10, parent: 'inventory' },
    { id: 'inv-waste', label: 'Waste Tracking', icon: 'trash', path: '/inventory/waste', order: 11, parent: 'inventory' },
  ],

  dashboardWidgets: [],
  settings: [],

  permissions: [
    { resource: 'inv.item', actions: ['create', 'read', 'update', 'deactivate', 'export'], description: 'Manage inventory items' },
    { resource: 'inv.warehouse', actions: ['create', 'read', 'update', 'deactivate'], description: 'Manage warehouses and locations' },
    { resource: 'inv.transaction', actions: ['create', 'read', 'export'], description: 'Record inventory transactions' },
    { resource: 'inv.requisition', actions: ['create', 'read', 'submit', 'approve', 'fill', 'cancel'], description: 'Material requisition workflow' },
    { resource: 'inv.count', actions: ['create', 'read', 'update', 'complete', 'post'], description: 'Physical inventory counts' },
    { resource: 'inv.valuation', actions: ['read', 'export'], description: 'Inventory valuation reports' },
    { resource: 'inv.alerts', actions: ['read'], description: 'Low stock alerts' },
    { resource: 'inv.waste', actions: ['create', 'read', 'export'], description: 'Waste tracking' },
  ],

  workflows: [],

  importTypes: [
    {
      id: 'inv-items',
      label: 'Import Inventory Items',
      collection: 'inv/item',
      fields: [
        { name: 'number', type: 'string', required: true, label: 'Item Number' },
        { name: 'description', type: 'string', required: true, label: 'Description' },
        { name: 'unit', type: 'string', required: true, label: 'Unit' },
        { name: 'category', type: 'string', required: true, label: 'Category' },
        { name: 'preferredVendorName', type: 'string', required: false, label: 'Preferred Vendor' },
        { name: 'reorderPoint', type: 'number', required: false, label: 'Reorder Point' },
        { name: 'reorderQuantity', type: 'number', required: false, label: 'Reorder Quantity' },
        { name: 'unitCost', type: 'number', required: false, label: 'Unit Cost' },
      ],
      autoDetectHeaders: true,
    },
  ],

  exportTypes: [
    {
      id: 'inv-items-export',
      label: 'Export Inventory Items',
      collection: 'inv/item',
      defaultFields: ['number', 'description', 'unit', 'category', 'preferredVendorName', 'reorderPoint', 'unitCost', 'avgCost', 'active'],
    },
    {
      id: 'inv-valuation-export',
      label: 'Export Inventory Valuation',
      collection: 'inv/item',
      defaultFields: ['number', 'description', 'unit', 'totalQuantity', 'unitCost', 'totalValue', 'method'],
    },
    {
      id: 'inv-transactions-export',
      label: 'Export Inventory Transactions',
      collection: 'inv/transaction',
      defaultFields: ['itemId', 'warehouseId', 'type', 'quantity', 'unitCost', 'totalCost', 'date', 'jobId', 'reference'],
    },
  ],

  hooks: [],
};
