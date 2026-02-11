/* ═══════════════════════════════════════════════════
   FinConsol - Export Module
   CSV, TSV, JSON export with entity filtering
   ═══════════════════════════════════════════════════ */

const ExportModule = (() => {

  function exportData(format, collections, entityFilter) {
    const data = {};

    collections.forEach(col => {
      switch (col) {
        case 'transactions':
          data.transactions = Store.getTransactions(
            entityFilter && entityFilter !== '__all__' ? { entityId: entityFilter } : {}
          );
          break;
        case 'entities':
          data.entities = Store.getEntities();
          break;
        case 'customers':
          data.customers = Store.getCustomers(entityFilter !== '__all__' ? entityFilter : undefined);
          break;
        case 'employees':
          data.employees = Store.getEmployees(entityFilter !== '__all__' ? entityFilter : undefined);
          break;
        case 'debts':
          data.debts = Store.getDebts(entityFilter !== '__all__' ? entityFilter : undefined);
          break;
        case 'budgets':
          data.budgets = Store.getBudgets(entityFilter !== '__all__' ? entityFilter : undefined);
          break;
      }
    });

    switch (format) {
      case 'json':
        downloadJSON(data);
        break;
      case 'csv':
        downloadCSVBundle(data, ',');
        break;
      case 'tsv':
        downloadCSVBundle(data, '\t');
        break;
    }
  }

  function downloadJSON(data) {
    const fullExport = {
      exportDate: new Date().toISOString(),
      config: Store.getConfig(),
      ...data
    };
    const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `finConsol-export-${dateStamp()}.json`);
  }

  function downloadCSVBundle(data, delimiter) {
    const ext = delimiter === '\t' ? 'tsv' : 'csv';

    // If only one collection, download single file
    const keys = Object.keys(data);
    if (keys.length === 1) {
      const csv = arrayToCSV(data[keys[0]], delimiter);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `finConsol-${keys[0]}-${dateStamp()}.${ext}`);
      return;
    }

    // Multiple collections: download each
    keys.forEach(key => {
      if (data[key] && data[key].length > 0) {
        const csv = arrayToCSV(data[key], delimiter);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `finConsol-${key}-${dateStamp()}.${ext}`);
      }
    });
  }

  function arrayToCSV(arr, delimiter = ',') {
    if (!arr || arr.length === 0) return '';

    // Get all unique keys across all objects
    const keys = new Set();
    arr.forEach(item => Object.keys(item).forEach(k => keys.add(k)));
    const headers = Array.from(keys);

    const lines = [headers.join(delimiter)];
    arr.forEach(item => {
      const row = headers.map(h => {
        let val = item[h];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'object') val = JSON.stringify(val);
        val = String(val);
        // Escape delimiter and quotes
        if (val.includes(delimiter) || val.includes('"') || val.includes('\n')) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      });
      lines.push(row.join(delimiter));
    });

    return lines.join('\n');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function dateStamp() {
    return new Date().toISOString().split('T')[0];
  }

  // Full backup export (all data)
  function exportFullBackup() {
    const data = Store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `finConsol-backup-${dateStamp()}.json`);
  }

  // Full backup import
  function importFullBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.config && !data.entities) {
            reject(new Error('Invalid backup file format'));
            return;
          }
          Store.importAll(data);
          resolve({ success: true });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Export KPI summary as CSV
  function exportKPISummary(entityId, period) {
    const kpis = KPIEngine.getExecutiveKPIs(entityId, period);
    const rows = [
      { Metric: 'Revenue', Value: kpis.revenue },
      { Metric: 'Expenses', Value: kpis.expenses },
      { Metric: 'Net Income', Value: kpis.netIncome },
      { Metric: 'Margin %', Value: kpis.margin },
      { Metric: 'Cash In', Value: kpis.cashIn },
      { Metric: 'Cash Out', Value: kpis.cashOut },
      { Metric: 'Net Cash Flow', Value: kpis.netCashFlow },
      { Metric: 'Total Assets', Value: kpis.totalAssets },
      { Metric: 'Total Liabilities', Value: kpis.totalLiabilities },
      { Metric: 'Equity', Value: kpis.equity },
      { Metric: 'Working Capital', Value: kpis.workingCapital },
      { Metric: 'Monthly Burn Rate', Value: kpis.monthlyBurn },
      { Metric: 'Runway (months)', Value: kpis.runway === Infinity ? 'N/A' : kpis.runway },
      { Metric: 'Entity Count', Value: kpis.entityCount },
      { Metric: 'Transaction Count', Value: kpis.transactionCount }
    ];

    const csv = arrayToCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `finConsol-kpi-summary-${dateStamp()}.csv`);
  }

  // Export entity comparison as CSV
  function exportEntityComparison(period) {
    const comparison = KPIEngine.getEntityComparison(period);
    const rows = comparison.map(e => ({
      Entity: e.name,
      Type: e.type,
      Health: e.health,
      'Health Score': e.healthScore,
      Revenue: e.revenue,
      Expenses: e.expenses,
      'Net Income': e.netIncome,
      'Margin %': e.margin,
      'Cash Flow': e.cashFlow,
      Assets: e.assets,
      Liabilities: e.liabilities,
      'Risk Rating': e.riskRating
    }));

    const csv = arrayToCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `finConsol-entity-comparison-${dateStamp()}.csv`);
  }

  function initExportModal() {
    const modal = document.getElementById('export-modal');
    const executeBtn = document.getElementById('export-execute');
    const entitySelect = document.getElementById('export-entity-filter');

    // Populate entity filter
    if (entitySelect) {
      entitySelect.innerHTML = '<option value="__all__">All Entities</option>';
      Store.getEntities().forEach(e => {
        entitySelect.innerHTML += `<option value="${e.id}">${e.name}</option>`;
      });
    }

    executeBtn?.addEventListener('click', () => {
      const format = document.getElementById('export-format').value;
      const checkboxes = modal.querySelectorAll('.checkbox-group input:checked');
      const collections = Array.from(checkboxes).map(cb => cb.value);
      const entityFilter = entitySelect?.value || '__all__';

      if (collections.length === 0) {
        alert('Select at least one data type to export');
        return;
      }

      exportData(format, collections, entityFilter);
      modal.classList.add('hidden');
    });
  }

  return {
    exportData, exportFullBackup, importFullBackup,
    exportKPISummary, exportEntityComparison,
    initExportModal, arrayToCSV
  };
})();
