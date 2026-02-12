/* ═══════════════════════════════════════════════════
   Concrete - Data Store
   localStorage-backed data management layer
   ═══════════════════════════════════════════════════ */

const Store = (() => {
  const STORAGE_KEY = 'concrete';
  const VERSION = '1.0.0';

  // Default schema
  const defaultData = () => ({
    version: VERSION,
    config: {
      mode: 'full',        // 'single', 'multi', 'full'
      orgName: '',
      baseCurrency: 'USD',
      fiscalYearStart: 1,
      setupComplete: false,
      features: {
        intercompanyElimination: true,
        budgetTracking: true,
        alertsEnabled: true,
        fuzzyMatching: true,
        anomalyDetection: true
      }
    },
    entities: [],           // Entity[]
    transactions: [],       // Transaction[]
    customers: [],          // Customer[]
    employees: [],          // Employee[]
    debts: [],              // Debt[]
    budgets: [],            // Budget[]
    importBatches: [],      // ImportBatch[]
    mappingTemplates: [],   // MappingTemplate[]
    entityAliases: {}       // { entityId: ['alias1', 'alias2'] }
  });

  let _cache = null;

  function _load() {
    if (_cache) return _cache;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        _cache = JSON.parse(raw);
        if (!_cache.version) _cache = defaultData();
      } else {
        _cache = defaultData();
      }
    } catch {
      _cache = defaultData();
    }
    return _cache;
  }

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache));
    } catch (e) {
      console.error('Store: save failed', e);
    }
  }

  function _uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ── Config ──
  function getConfig() { return _load().config; }

  function setConfig(updates) {
    const d = _load();
    Object.assign(d.config, updates);
    _save();
    return d.config;
  }

  function isSetupComplete() { return _load().config.setupComplete; }

  // ── Generic CRUD ──
  function _getCollection(name) { return _load()[name] || []; }

  function _addToCollection(name, item) {
    const d = _load();
    if (!item.id) item.id = _uid();
    if (!d[name]) d[name] = [];
    d[name].push(item);
    _save();
    return item;
  }

  function _updateInCollection(name, id, updates) {
    const d = _load();
    const idx = d[name].findIndex(x => x.id === id);
    if (idx >= 0) {
      Object.assign(d[name][idx], updates);
      _save();
      return d[name][idx];
    }
    return null;
  }

  function _removeFromCollection(name, id) {
    const d = _load();
    d[name] = d[name].filter(x => x.id !== id);
    _save();
  }

  function _bulkAdd(name, items) {
    const d = _load();
    if (!d[name]) d[name] = [];
    items.forEach(item => {
      if (!item.id) item.id = _uid();
      d[name].push(item);
    });
    _save();
    return items;
  }

  function _clearCollection(name) {
    const d = _load();
    d[name] = [];
    _save();
  }

  // ── Entities ──
  function getEntities() { return _getCollection('entities'); }
  function addEntity(e) { return _addToCollection('entities', e); }
  function updateEntity(id, u) { return _updateInCollection('entities', id, u); }
  function removeEntity(id) { _removeFromCollection('entities', id); }
  function getEntity(id) { return getEntities().find(e => e.id === id); }

  function getEntityHierarchy() {
    const entities = getEntities();
    const roots = entities.filter(e => !e.parentId);
    function buildTree(parent) {
      const children = entities.filter(e => e.parentId === parent.id);
      return {
        ...parent,
        children: children.map(c => buildTree(c))
      };
    }
    return roots.map(r => buildTree(r));
  }

  function getEntityChildren(parentId, recursive = false) {
    const entities = getEntities();
    const direct = entities.filter(e => e.parentId === parentId);
    if (!recursive) return direct;
    let all = [...direct];
    direct.forEach(child => {
      all = all.concat(getEntityChildren(child.id, true));
    });
    return all;
  }

  function resolveEntityName(name) {
    const entities = getEntities();
    const config = getConfig();
    const lower = name.trim().toLowerCase().replace(/[.\s,]+/g, '');

    // Exact match
    let match = entities.find(e => e.name.toLowerCase() === name.trim().toLowerCase());
    if (match) return match;

    // Alias match
    const aliases = _load().entityAliases || {};
    for (const [entityId, aliasList] of Object.entries(aliases)) {
      for (const alias of aliasList) {
        if (alias.toLowerCase().replace(/[.\s,]+/g, '') === lower) {
          return entities.find(e => e.id === entityId);
        }
      }
    }

    // Fuzzy match
    if (config.features?.fuzzyMatching) {
      match = entities.find(e => {
        const eName = e.name.toLowerCase().replace(/[.\s,]+/g, '');
        return eName === lower || eName.includes(lower) || lower.includes(eName);
      });
      if (match) return match;
    }

    return null;
  }

  function addEntityAlias(entityId, alias) {
    const d = _load();
    if (!d.entityAliases) d.entityAliases = {};
    if (!d.entityAliases[entityId]) d.entityAliases[entityId] = [];
    if (!d.entityAliases[entityId].includes(alias)) {
      d.entityAliases[entityId].push(alias);
      _save();
    }
  }

  // ── Transactions ──
  function getTransactions(filter) {
    let txns = _getCollection('transactions');
    if (!filter) return txns;
    if (filter.entityId && filter.entityId !== '__all__') {
      txns = txns.filter(t => t.entityId === filter.entityId);
    }
    if (filter.type) txns = txns.filter(t => t.type === filter.type);
    if (filter.category) txns = txns.filter(t => t.category === filter.category);
    if (filter.dateFrom) txns = txns.filter(t => t.date >= filter.dateFrom);
    if (filter.dateTo) txns = txns.filter(t => t.date <= filter.dateTo);
    if (filter.account) txns = txns.filter(t => t.account === filter.account);
    return txns;
  }

  function addTransaction(t) { return _addToCollection('transactions', t); }
  function bulkAddTransactions(txns) { return _bulkAdd('transactions', txns); }
  function updateTransaction(id, u) { return _updateInCollection('transactions', id, u); }
  function removeTransaction(id) { _removeFromCollection('transactions', id); }

  // Dedup check: match on entityId + date + amount + description
  function findDuplicateTransaction(t) {
    return getTransactions().find(existing =>
      existing.entityId === t.entityId &&
      existing.date === t.date &&
      existing.amount === t.amount &&
      existing.description === t.description
    );
  }

  // ── Customers ──
  function getCustomers(entityId) {
    let c = _getCollection('customers');
    if (entityId && entityId !== '__all__') c = c.filter(x => x.entityId === entityId);
    return c;
  }
  function addCustomer(c) { return _addToCollection('customers', c); }
  function bulkAddCustomers(items) { return _bulkAdd('customers', items); }
  function updateCustomer(id, u) { return _updateInCollection('customers', id, u); }
  function removeCustomer(id) { _removeFromCollection('customers', id); }

  // ── Employees ──
  function getEmployees(entityId) {
    let e = _getCollection('employees');
    if (entityId && entityId !== '__all__') e = e.filter(x => x.entityId === entityId);
    return e;
  }
  function addEmployee(e) { return _addToCollection('employees', e); }
  function bulkAddEmployees(items) { return _bulkAdd('employees', items); }
  function updateEmployee(id, u) { return _updateInCollection('employees', id, u); }
  function removeEmployee(id) { _removeFromCollection('employees', id); }

  // ── Debts ──
  function getDebts(entityId) {
    let d = _getCollection('debts');
    if (entityId && entityId !== '__all__') d = d.filter(x => x.entityId === entityId);
    return d;
  }
  function addDebt(d) { return _addToCollection('debts', d); }
  function bulkAddDebts(items) { return _bulkAdd('debts', items); }
  function updateDebt(id, u) { return _updateInCollection('debts', id, u); }
  function removeDebt(id) { _removeFromCollection('debts', id); }

  // ── Budgets ──
  function getBudgets(entityId) {
    let b = _getCollection('budgets');
    if (entityId && entityId !== '__all__') b = b.filter(x => x.entityId === entityId);
    return b;
  }
  function addBudget(b) { return _addToCollection('budgets', b); }
  function bulkAddBudgets(items) { return _bulkAdd('budgets', items); }
  function updateBudget(id, u) { return _updateInCollection('budgets', id, u); }

  // ── Import Batches ──
  function getImportBatches() { return _getCollection('importBatches'); }
  function addImportBatch(b) { return _addToCollection('importBatches', b); }

  // ── Mapping Templates ──
  function getMappingTemplates() { return _getCollection('mappingTemplates'); }
  function addMappingTemplate(t) { return _addToCollection('mappingTemplates', t); }
  function updateMappingTemplate(id, u) { return _updateInCollection('mappingTemplates', id, u); }
  function removeMappingTemplate(id) { _removeFromCollection('mappingTemplates', id); }

  // ── Utility ──
  function getDateRange(period) {
    const now = new Date();
    const config = getConfig();
    const fiscalStart = config.fiscalYearStart || 1;
    let from, to;
    to = now.toISOString().split('T')[0];

    switch (period) {
      case 'mtd':
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'qtd': {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        from = new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0];
        break;
      }
      case 'ytd': {
        let year = now.getFullYear();
        if (now.getMonth() + 1 < fiscalStart) year--;
        from = new Date(year, fiscalStart - 1, 1).toISOString().split('T')[0];
        break;
      }
      case 'last12':
        from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
        break;
      case 'all':
        from = '1900-01-01';
        break;
      default:
        from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    }
    return { from, to };
  }

  function exportAll() {
    return JSON.parse(JSON.stringify(_load()));
  }

  function importAll(data) {
    _cache = data;
    _cache.version = VERSION;
    _save();
  }

  function resetAll() {
    _cache = defaultData();
    _save();
  }

  function getStats() {
    const d = _load();
    return {
      entities: d.entities.length,
      transactions: d.transactions.length,
      customers: d.customers.length,
      employees: d.employees.length,
      debts: d.debts.length,
      budgets: d.budgets.length,
      importBatches: d.importBatches.length
    };
  }

  return {
    getConfig, setConfig, isSetupComplete,
    getEntities, addEntity, updateEntity, removeEntity, getEntity,
    getEntityHierarchy, getEntityChildren, resolveEntityName, addEntityAlias,
    getTransactions, addTransaction, bulkAddTransactions, updateTransaction,
    removeTransaction, findDuplicateTransaction,
    getCustomers, addCustomer, bulkAddCustomers, updateCustomer, removeCustomer,
    getEmployees, addEmployee, bulkAddEmployees, updateEmployee, removeEmployee,
    getDebts, addDebt, bulkAddDebts, updateDebt, removeDebt,
    getBudgets, addBudget, bulkAddBudgets, updateBudget,
    getImportBatches, addImportBatch,
    getMappingTemplates, addMappingTemplate, updateMappingTemplate, removeMappingTemplate,
    getDateRange, exportAll, importAll, resetAll, getStats, _uid
  };
})();
