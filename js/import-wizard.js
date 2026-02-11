/* ═══════════════════════════════════════════════════
   FinConsol - CSV Import Wizard
   Column mapping, incremental updates, templates
   ═══════════════════════════════════════════════════ */

const ImportWizard = (() => {
  const STANDARD_FIELDS = {
    transactions: [
      { key: 'date', label: 'Date', required: true },
      { key: 'entity', label: 'Entity Name', required: true },
      { key: 'type', label: 'Type (revenue/expense/asset/liability/transfer)', required: false },
      { key: 'category', label: 'Category', required: false },
      { key: 'subcategory', label: 'Subcategory', required: false },
      { key: 'account', label: 'Account', required: false },
      { key: 'amount', label: 'Amount', required: true },
      { key: 'description', label: 'Description', required: false },
      { key: 'currency', label: 'Currency', required: false },
      { key: 'counterpartyEntity', label: 'Counterparty Entity (intercompany)', required: false },
      { key: 'reference', label: 'Reference / Transaction ID', required: false }
    ],
    customers: [
      { key: 'entity', label: 'Entity Name', required: true },
      { key: 'name', label: 'Customer Name', required: true },
      { key: 'totalRevenue', label: 'Total Revenue', required: false },
      { key: 'outstandingReceivables', label: 'Outstanding Receivables', required: false },
      { key: 'lastPaymentDate', label: 'Last Payment Date', required: false },
      { key: 'paymentTerms', label: 'Payment Terms (days)', required: false }
    ],
    employees: [
      { key: 'entity', label: 'Entity Name', required: true },
      { key: 'name', label: 'Employee Name', required: true },
      { key: 'department', label: 'Department', required: false },
      { key: 'costCenter', label: 'Cost Center', required: false },
      { key: 'salary', label: 'Salary', required: false },
      { key: 'startDate', label: 'Start Date', required: false }
    ],
    debts: [
      { key: 'entity', label: 'Entity Name', required: true },
      { key: 'type', label: 'Type (loan/payable/receivable)', required: true },
      { key: 'counterparty', label: 'Counterparty / Lender', required: false },
      { key: 'principal', label: 'Principal Amount', required: false },
      { key: 'interestRate', label: 'Interest Rate (%)', required: false },
      { key: 'maturityDate', label: 'Maturity Date', required: false },
      { key: 'currentBalance', label: 'Current Balance', required: true }
    ],
    budgets: [
      { key: 'entity', label: 'Entity Name', required: true },
      { key: 'period', label: 'Period (e.g. 2024-01)', required: true },
      { key: 'category', label: 'Category', required: true },
      { key: 'planned', label: 'Planned Amount', required: true },
      { key: 'actual', label: 'Actual Amount', required: false }
    ],
    entities: [
      { key: 'name', label: 'Entity Name', required: true },
      { key: 'type', label: 'Type (subsidiary/division/department)', required: false },
      { key: 'parent', label: 'Parent Entity', required: false },
      { key: 'industry', label: 'Industry', required: false },
      { key: 'riskRating', label: 'Risk Rating (low/medium/high)', required: false },
      { key: 'currency', label: 'Currency', required: false },
      { key: 'tags', label: 'Tags (comma-separated)', required: false }
    ]
  };

  let currentState = {
    step: 1,
    files: [],
    parsedData: null,
    headers: [],
    sampleRows: [],
    dataType: 'transactions',
    mapping: {},
    templateName: '',
    importResults: null
  };

  function reset() {
    currentState = {
      step: 1, files: [], parsedData: null, headers: [], sampleRows: [],
      dataType: 'transactions', mapping: {}, templateName: '', importResults: null
    };
  }

  // ── Date parsing ──
  function parseDate(val) {
    if (!val) return null;
    val = String(val).trim();

    // ISO: 2024-01-15
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
    // US: 01/15/2024 or 1/15/2024
    let m = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
    // EU: 15/01/2024 (day first if day > 12)
    m = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m && parseInt(m[1]) > 12) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    // Try Date constructor
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
  }

  // ── Amount parsing ──
  function parseAmount(val) {
    if (val === null || val === undefined) return 0;
    val = String(val).trim();
    // Remove currency symbols and spaces
    val = val.replace(/[$\u20AC\u00A3\u00A5\u20B9R\s]/g, '');
    // Handle parentheses for negative: (1,234.56) -> -1234.56
    const isNeg = /^\(.*\)$/.test(val);
    val = val.replace(/[()]/g, '');
    // Handle European format: 1.234,56 -> 1234.56
    if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(val)) {
      val = val.replace(/\./g, '').replace(',', '.');
    } else {
      // Remove commas: 1,234.56 -> 1234.56
      val = val.replace(/,/g, '');
    }
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    return isNeg ? -num : num;
  }

  // ── Auto-detect transaction type ──
  function inferType(row, mapping) {
    if (mapping.type && row[mapping.type]) {
      const t = row[mapping.type].toLowerCase().trim();
      if (['revenue', 'income', 'sales', 'sale'].includes(t)) return 'revenue';
      if (['expense', 'cost', 'payment', 'purchase'].includes(t)) return 'expense';
      if (['asset', 'assets'].includes(t)) return 'asset';
      if (['liability', 'liabilities', 'debt'].includes(t)) return 'liability';
      if (['transfer', 'internal'].includes(t)) return 'transfer';
    }
    // Infer from amount sign
    const amt = mapping.amount ? parseAmount(row[mapping.amount]) : 0;
    if (amt > 0) return 'revenue';
    if (amt < 0) return 'expense';
    return 'revenue';
  }

  // ── Auto-categorize ──
  function inferCategory(description, type) {
    if (!description) return 'General';
    const d = description.toLowerCase();

    const patterns = {
      'Payroll': /payroll|salary|wages|bonus|compensation/,
      'Rent': /rent|lease|office space/,
      'Utilities': /utility|utilities|electric|water|gas|internet|phone/,
      'Cost of Goods Sold': /cogs|cost of goods|cost of sales|materials/,
      'Marketing': /marketing|advertising|ads|promotion/,
      'Travel': /travel|flight|hotel|transport/,
      'Insurance': /insurance|premium/,
      'Tax': /tax|vat|gst|hst/,
      'Interest': /interest|finance charge/,
      'Depreciation': /depreciation|amortization/,
      'Professional Services': /consulting|legal|accounting|audit/,
      'Software': /software|saas|subscription|license/,
      'Capital Expenditure': /capex|capital expenditure|equipment|machinery/,
      'Sales Revenue': /sales|revenue|income/,
      'Service Revenue': /service|consulting revenue|fee/,
      'Accounts Receivable': /receivable|ar|a\/r/,
      'Accounts Payable': /payable|ap|a\/p/,
      'Inventory': /inventory|stock/,
      'Cash': /cash|bank|deposit/,
      'Loan': /loan|borrowing|credit line/,
      'Equity': /equity|share|stock|capital/
    };

    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(d)) return category;
    }
    return 'General';
  }

  // ── Auto-map columns ──
  function autoMapColumns(headers, dataType) {
    const fields = STANDARD_FIELDS[dataType];
    const mapping = {};

    fields.forEach(field => {
      const target = field.key.toLowerCase();
      let bestMatch = null;
      let bestScore = 0;

      headers.forEach(header => {
        const h = header.toLowerCase().replace(/[_\-\s]+/g, '');
        let score = 0;

        // Exact match
        if (h === target) score = 100;
        // Contains match
        else if (h.includes(target) || target.includes(h)) score = 60;
        // Keyword matching
        else {
          const synonyms = {
            date: ['date', 'dt', 'timestamp', 'time', 'period', 'transactiondate', 'postdate', 'valuedate'],
            entity: ['entity', 'company', 'subsidiary', 'division', 'unit', 'entityname', 'companyname', 'businessunit'],
            amount: ['amount', 'amt', 'value', 'total', 'sum', 'debit', 'credit', 'balance', 'price'],
            type: ['type', 'category', 'classification', 'transactiontype', 'txntype', 'class'],
            category: ['category', 'cat', 'group', 'class', 'department', 'dept', 'glcode', 'accountcategory'],
            description: ['description', 'desc', 'memo', 'note', 'narrative', 'details', 'reference', 'particulars'],
            name: ['name', 'customername', 'employeename', 'fullname', 'vendor'],
            account: ['account', 'acct', 'accountno', 'accountnumber', 'glaccount', 'ledger'],
            currency: ['currency', 'curr', 'ccy', 'currencycode'],
            reference: ['reference', 'ref', 'refno', 'transactionid', 'txnid', 'id'],
            salary: ['salary', 'pay', 'wage', 'compensation', 'annualsalary'],
            department: ['department', 'dept', 'division', 'team', 'unit'],
            principal: ['principal', 'loanamount', 'original', 'facevalue'],
            interestRate: ['interestrate', 'rate', 'interest', 'apr', 'coupon'],
            planned: ['planned', 'budget', 'budgeted', 'forecast', 'target', 'plan'],
            actual: ['actual', 'realised', 'realized', 'result']
          };

          const syns = synonyms[target] || [target];
          if (syns.some(s => h.includes(s) || s.includes(h))) score = 50;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = header;
        }
      });

      if (bestMatch && bestScore >= 50) {
        mapping[field.key] = bestMatch;
      }
    });

    return mapping;
  }

  // ── Process Import ──
  function processImport(parsedRows, dataType, mapping, targetEntityId) {
    const results = { added: 0, updated: 0, skipped: 0, errors: [], newEntities: [] };

    parsedRows.forEach((row, idx) => {
      try {
        switch (dataType) {
          case 'transactions':
            processTransactionRow(row, mapping, targetEntityId, results, idx);
            break;
          case 'customers':
            processCustomerRow(row, mapping, targetEntityId, results, idx);
            break;
          case 'employees':
            processEmployeeRow(row, mapping, targetEntityId, results, idx);
            break;
          case 'debts':
            processDebtRow(row, mapping, targetEntityId, results, idx);
            break;
          case 'budgets':
            processBudgetRow(row, mapping, targetEntityId, results, idx);
            break;
          case 'entities':
            processEntityRow(row, mapping, results, idx);
            break;
        }
      } catch (e) {
        results.errors.push(`Row ${idx + 1}: ${e.message}`);
      }
    });

    // Record import batch
    Store.addImportBatch({
      timestamp: new Date().toISOString(),
      fileName: currentState.files.map(f => f.name).join(', '),
      recordCount: results.added + results.updated,
      dataType: dataType,
      mapping: { ...mapping }
    });

    return results;
  }

  function resolveOrCreateEntity(name, results) {
    if (!name) return null;
    let entity = Store.resolveEntityName(name);
    if (!entity) {
      entity = Store.addEntity({
        name: name.trim(),
        type: 'subsidiary',
        parentId: null,
        riskRating: 'medium',
        tags: [],
        currency: Store.getConfig().baseCurrency
      });
      results.newEntities.push(entity.name);
    }
    return entity;
  }

  function processTransactionRow(row, mapping, targetEntityId, results, idx) {
    const entityName = mapping.entity ? row[mapping.entity] : null;
    let entityId = targetEntityId;

    if (entityName && entityName.trim()) {
      const entity = resolveOrCreateEntity(entityName, results);
      if (entity) entityId = entity.id;
    }

    if (!entityId) {
      results.errors.push(`Row ${idx + 1}: No entity specified`);
      results.skipped++;
      return;
    }

    const date = mapping.date ? parseDate(row[mapping.date]) : null;
    if (!date) {
      results.errors.push(`Row ${idx + 1}: Invalid date "${row[mapping.date]}"`);
      results.skipped++;
      return;
    }

    const amount = mapping.amount ? parseAmount(row[mapping.amount]) : 0;
    if (amount === 0 && mapping.amount) {
      results.skipped++;
      return;
    }

    const description = mapping.description ? String(row[mapping.description] || '') : '';
    const type = inferType(row, mapping);
    const category = mapping.category
      ? String(row[mapping.category] || inferCategory(description, type))
      : inferCategory(description, type);

    const txn = {
      entityId,
      date,
      type,
      category,
      subcategory: mapping.subcategory ? String(row[mapping.subcategory] || '') : '',
      account: mapping.account ? String(row[mapping.account] || '') : '',
      amount: type === 'expense' && amount > 0 ? -amount : amount,
      description,
      currency: mapping.currency ? String(row[mapping.currency] || '') : Store.getConfig().baseCurrency,
      counterpartyEntityId: null,
      reference: mapping.reference ? String(row[mapping.reference] || '') : ''
    };

    // Intercompany
    if (mapping.counterpartyEntity && row[mapping.counterpartyEntity]) {
      const cp = resolveOrCreateEntity(row[mapping.counterpartyEntity], results);
      if (cp) txn.counterpartyEntityId = cp.id;
    }

    // Dedup
    const dup = Store.findDuplicateTransaction(txn);
    if (dup) {
      Store.updateTransaction(dup.id, txn);
      results.updated++;
    } else {
      Store.addTransaction(txn);
      results.added++;
    }
  }

  function processCustomerRow(row, mapping, targetEntityId, results, idx) {
    const entityName = mapping.entity ? row[mapping.entity] : null;
    let entityId = targetEntityId;
    if (entityName && entityName.trim()) {
      const entity = resolveOrCreateEntity(entityName, results);
      if (entity) entityId = entity.id;
    }
    if (!entityId) { results.skipped++; return; }

    const name = mapping.name ? String(row[mapping.name] || '') : '';
    if (!name) { results.skipped++; return; }

    Store.addCustomer({
      entityId,
      name,
      totalRevenue: mapping.totalRevenue ? parseAmount(row[mapping.totalRevenue]) : 0,
      outstandingReceivables: mapping.outstandingReceivables ? parseAmount(row[mapping.outstandingReceivables]) : 0,
      lastPaymentDate: mapping.lastPaymentDate ? parseDate(row[mapping.lastPaymentDate]) : null,
      paymentTerms: mapping.paymentTerms ? parseInt(row[mapping.paymentTerms]) || 30 : 30
    });
    results.added++;
  }

  function processEmployeeRow(row, mapping, targetEntityId, results, idx) {
    const entityName = mapping.entity ? row[mapping.entity] : null;
    let entityId = targetEntityId;
    if (entityName && entityName.trim()) {
      const entity = resolveOrCreateEntity(entityName, results);
      if (entity) entityId = entity.id;
    }
    if (!entityId) { results.skipped++; return; }

    const name = mapping.name ? String(row[mapping.name] || '') : '';
    if (!name) { results.skipped++; return; }

    Store.addEmployee({
      entityId, name,
      department: mapping.department ? String(row[mapping.department] || '') : '',
      costCenter: mapping.costCenter ? String(row[mapping.costCenter] || '') : '',
      salary: mapping.salary ? parseAmount(row[mapping.salary]) : 0,
      startDate: mapping.startDate ? parseDate(row[mapping.startDate]) : null
    });
    results.added++;
  }

  function processDebtRow(row, mapping, targetEntityId, results, idx) {
    const entityName = mapping.entity ? row[mapping.entity] : null;
    let entityId = targetEntityId;
    if (entityName && entityName.trim()) {
      const entity = resolveOrCreateEntity(entityName, results);
      if (entity) entityId = entity.id;
    }
    if (!entityId) { results.skipped++; return; }

    Store.addDebt({
      entityId,
      type: mapping.type ? String(row[mapping.type] || 'loan').toLowerCase() : 'loan',
      counterparty: mapping.counterparty ? String(row[mapping.counterparty] || '') : '',
      principal: mapping.principal ? parseAmount(row[mapping.principal]) : 0,
      interestRate: mapping.interestRate ? parseFloat(row[mapping.interestRate]) || 0 : 0,
      maturityDate: mapping.maturityDate ? parseDate(row[mapping.maturityDate]) : null,
      currentBalance: mapping.currentBalance ? parseAmount(row[mapping.currentBalance]) : 0
    });
    results.added++;
  }

  function processBudgetRow(row, mapping, targetEntityId, results, idx) {
    const entityName = mapping.entity ? row[mapping.entity] : null;
    let entityId = targetEntityId;
    if (entityName && entityName.trim()) {
      const entity = resolveOrCreateEntity(entityName, results);
      if (entity) entityId = entity.id;
    }
    if (!entityId) { results.skipped++; return; }

    Store.addBudget({
      entityId,
      period: mapping.period ? String(row[mapping.period] || '') : '',
      category: mapping.category ? String(row[mapping.category] || '') : '',
      planned: mapping.planned ? parseAmount(row[mapping.planned]) : 0,
      actual: mapping.actual ? parseAmount(row[mapping.actual]) : 0
    });
    results.added++;
  }

  function processEntityRow(row, mapping, results, idx) {
    const name = mapping.name ? String(row[mapping.name] || '').trim() : '';
    if (!name) { results.skipped++; return; }

    const existing = Store.resolveEntityName(name);
    if (existing) {
      Store.updateEntity(existing.id, {
        type: mapping.type ? String(row[mapping.type] || existing.type) : existing.type,
        industry: mapping.industry ? String(row[mapping.industry] || '') : existing.industry,
        riskRating: mapping.riskRating ? String(row[mapping.riskRating] || 'medium') : existing.riskRating,
        currency: mapping.currency ? String(row[mapping.currency] || '') : existing.currency,
        tags: mapping.tags ? String(row[mapping.tags] || '').split(',').map(t => t.trim()).filter(Boolean) : existing.tags
      });
      results.updated++;
    } else {
      let parentId = null;
      if (mapping.parent && row[mapping.parent]) {
        const parent = resolveOrCreateEntity(row[mapping.parent], results);
        if (parent) parentId = parent.id;
      }
      Store.addEntity({
        name,
        type: mapping.type ? String(row[mapping.type] || 'subsidiary') : 'subsidiary',
        parentId,
        industry: mapping.industry ? String(row[mapping.industry] || '') : '',
        riskRating: mapping.riskRating ? String(row[mapping.riskRating] || 'medium') : 'medium',
        currency: mapping.currency ? String(row[mapping.currency] || Store.getConfig().baseCurrency) : Store.getConfig().baseCurrency,
        tags: mapping.tags ? String(row[mapping.tags] || '').split(',').map(t => t.trim()).filter(Boolean) : []
      });
      results.added++;
    }
  }

  // ── Render Import Wizard Steps ──

  function renderStep1(container) {
    container.innerHTML = `
      <div class="import-dropzone" id="import-dropzone">
        <div class="drop-icon">&#128196;</div>
        <p><strong>Drop CSV files here</strong> or click to browse</p>
        <p style="font-size:0.78rem;">Supports CSV, TSV. Multiple files allowed.</p>
        <input type="file" id="import-file-input" accept=".csv,.tsv,.txt" multiple style="display:none;">
      </div>
      <div class="form-group">
        <label>Data Type</label>
        <select id="import-data-type">
          <option value="transactions">Transactions (Revenue, Expenses, Assets, Liabilities)</option>
          <option value="entities">Entities (Subsidiaries, Divisions)</option>
          <option value="customers">Customers</option>
          <option value="employees">Employees</option>
          <option value="debts">Debts (Loans, Payables, Receivables)</option>
          <option value="budgets">Budgets (Planned vs Actual)</option>
        </select>
      </div>
      ${renderTemplateList()}
      <div id="import-file-list"></div>
      <div style="text-align:right; margin-top:16px;">
        <button class="btn-primary" id="import-next-1" disabled>Next: Map Columns</button>
      </div>
    `;

    const dropzone = container.querySelector('#import-dropzone');
    const fileInput = container.querySelector('#import-file-input');
    const nextBtn = container.querySelector('#import-next-1');
    const dataTypeSelect = container.querySelector('#import-data-type');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));
    dataTypeSelect.addEventListener('change', () => { currentState.dataType = dataTypeSelect.value; });

    // Template click handlers
    container.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        const templateId = card.dataset.templateId;
        const template = Store.getMappingTemplates().find(t => t.id === templateId);
        if (template) {
          currentState.mapping = { ...template.mapping };
          currentState.dataType = template.dataType;
          dataTypeSelect.value = template.dataType;
        }
      });
    });

    function handleFiles(files) {
      currentState.files = Array.from(files);
      const fileList = container.querySelector('#import-file-list');
      fileList.innerHTML = currentState.files.map(f =>
        `<div style="padding:6px 0;color:var(--text-secondary);font-size:0.85rem;">&bull; ${f.name} (${(f.size / 1024).toFixed(1)} KB)</div>`
      ).join('');

      // Parse first file for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
        currentState.parsedData = result.data;
        currentState.headers = result.meta.fields || [];
        currentState.sampleRows = result.data.slice(0, 5);
        nextBtn.disabled = false;
      };
      reader.readAsText(currentState.files[0]);
    }

    nextBtn.addEventListener('click', () => {
      currentState.step = 2;
      // Auto-map
      if (Object.keys(currentState.mapping).length === 0) {
        currentState.mapping = autoMapColumns(currentState.headers, currentState.dataType);
      }
      renderWizard(container.parentElement);
    });
  }

  function renderTemplateList() {
    const templates = Store.getMappingTemplates();
    if (templates.length === 0) return '';
    return `
      <div class="section-divider">Saved Mapping Templates</div>
      <div class="template-list">
        ${templates.map(t => `
          <div class="template-card" data-template-id="${t.id}">
            <div class="template-name">${t.name}</div>
            <div class="template-desc">${t.dataType} &bull; ${Object.keys(t.mapping).length} fields mapped</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderStep2(container) {
    const fields = STANDARD_FIELDS[currentState.dataType];

    container.innerHTML = `
      <h4>Map CSV Columns to Standard Fields</h4>
      <p style="margin-bottom:16px;font-size:0.85rem;">We auto-detected mappings where possible. Adjust as needed.</p>

      <div class="import-preview">
        <div class="table-container">
          <table>
            <thead><tr>${currentState.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${currentState.sampleRows.slice(0, 3).map(row => `<tr>${currentState.headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section-divider">Column Mapping</div>
      <div id="mapping-rows">
        ${fields.map(field => `
          <div class="mapping-row">
            <div style="flex:1;">
              <strong>${field.label}</strong>
              ${field.required ? '<span class="tag red" style="margin-left:4px;">Required</span>' : ''}
            </div>
            <div style="flex:1;">
              <select class="mapping-select" data-field="${field.key}">
                <option value="">-- Skip --</option>
                ${currentState.headers.map(h => `<option value="${h}" ${currentState.mapping[field.key] === h ? 'selected' : ''}>${h}</option>`).join('')}
              </select>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="form-group" style="margin-top:16px;">
        <label>Assign to specific entity (optional, overrides entity column)</label>
        <select id="import-target-entity">
          <option value="">Use entity column from CSV</option>
          ${Store.getEntities().map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label>Save this mapping as template?</label>
        <input type="text" id="import-template-name" placeholder="e.g. Bank Statement Import">
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:16px;">
        <button class="btn-secondary" id="import-back-2">Back</button>
        <button class="btn-primary" id="import-next-2">Import Data</button>
      </div>
    `;

    // Update mapping on change
    container.querySelectorAll('.mapping-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const field = sel.dataset.field;
        if (sel.value) currentState.mapping[field] = sel.value;
        else delete currentState.mapping[field];
      });
    });

    container.querySelector('#import-back-2').addEventListener('click', () => {
      currentState.step = 1;
      renderWizard(container.parentElement);
    });

    container.querySelector('#import-next-2').addEventListener('click', () => {
      // Save template if named
      const templateName = container.querySelector('#import-template-name').value.trim();
      if (templateName) {
        Store.addMappingTemplate({
          name: templateName,
          dataType: currentState.dataType,
          mapping: { ...currentState.mapping }
        });
      }

      const targetEntity = container.querySelector('#import-target-entity').value || null;

      // Process all files
      let allResults = { added: 0, updated: 0, skipped: 0, errors: [], newEntities: [] };

      const processFiles = (fileIdx) => {
        if (fileIdx >= currentState.files.length) {
          currentState.importResults = allResults;
          currentState.step = 3;
          renderWizard(container.parentElement);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const result = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
          const fileResults = processImport(result.data, currentState.dataType, currentState.mapping, targetEntity);
          allResults.added += fileResults.added;
          allResults.updated += fileResults.updated;
          allResults.skipped += fileResults.skipped;
          allResults.errors = allResults.errors.concat(fileResults.errors);
          allResults.newEntities = allResults.newEntities.concat(fileResults.newEntities);
          processFiles(fileIdx + 1);
        };
        reader.readAsText(currentState.files[fileIdx]);
      };

      processFiles(0);
    });
  }

  function renderStep3(container) {
    const r = currentState.importResults;
    const hasErrors = r.errors.length > 0;

    container.innerHTML = `
      <h4>Import Complete</h4>
      <div class="import-stats">
        <div class="import-stat">
          <div class="stat-value" style="color:var(--green);">${r.added}</div>
          <div class="stat-label">Records Added</div>
        </div>
        <div class="import-stat">
          <div class="stat-value" style="color:var(--accent);">${r.updated}</div>
          <div class="stat-label">Records Updated</div>
        </div>
        <div class="import-stat">
          <div class="stat-value" style="color:var(--text-muted);">${r.skipped}</div>
          <div class="stat-label">Skipped</div>
        </div>
      </div>

      ${r.newEntities.length > 0 ? `
        <div class="card" style="margin:12px 0;">
          <h4 style="margin-bottom:8px;">New Entities Created</h4>
          <p style="font-size:0.85rem;">${r.newEntities.join(', ')}</p>
        </div>
      ` : ''}

      ${hasErrors ? `
        <div class="card" style="margin:12px 0; border-color:var(--red);">
          <h4 style="color:var(--red);margin-bottom:8px;">Errors (${r.errors.length})</h4>
          <div style="max-height:200px;overflow-y:auto;font-size:0.8rem;color:var(--text-muted);">
            ${r.errors.slice(0, 50).map(e => `<div style="padding:2px 0;">${e}</div>`).join('')}
            ${r.errors.length > 50 ? `<div>... and ${r.errors.length - 50} more</div>` : ''}
          </div>
        </div>
      ` : ''}

      <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
        <button class="btn-secondary" id="import-another">Import More</button>
        <button class="btn-primary" id="import-done">Done</button>
      </div>
    `;

    container.querySelector('#import-another').addEventListener('click', () => {
      reset();
      renderWizard(container.parentElement);
    });

    container.querySelector('#import-done').addEventListener('click', () => {
      reset();
      document.getElementById('import-modal')?.classList.add('hidden');
      if (typeof Dashboard !== 'undefined') Dashboard.refresh();
    });
  }

  function renderWizard(modalBody) {
    const container = modalBody || document.getElementById('import-wizard-body');
    if (!container) return;

    switch (currentState.step) {
      case 1: renderStep1(container); break;
      case 2: renderStep2(container); break;
      case 3: renderStep3(container); break;
    }
  }

  // ── Inline Import Tab ──
  function renderInlineImport(container) {
    const batches = Store.getImportBatches();
    const stats = Store.getStats();

    container.innerHTML = `
      <div class="tab-title">
        Data Import
        <span class="subtitle">Import CSV files, manage mapping templates</span>
      </div>

      <div class="grid-3" style="margin-bottom:24px;">
        <div class="kpi-card">
          <div class="kpi-label">Total Records</div>
          <div class="kpi-value neutral">${KPIEngine.fmtNum(stats.transactions + stats.customers + stats.employees + stats.debts)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Import Batches</div>
          <div class="kpi-value neutral">${stats.importBatches}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Entities</div>
          <div class="kpi-value neutral">${stats.entities}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <div class="card-header"><h4>Quick Import</h4></div>
        <div class="import-dropzone" id="inline-dropzone">
          <div class="drop-icon">&#128196;</div>
          <p><strong>Drop CSV files here</strong> or click to browse</p>
          <p style="font-size:0.78rem;">Or use the full import wizard for column mapping</p>
          <input type="file" id="inline-file-input" accept=".csv,.tsv,.txt" multiple style="display:none;">
        </div>
        <div style="text-align:center;margin-top:8px;">
          <button class="btn-primary" id="open-import-wizard">Open Import Wizard</button>
        </div>
      </div>

      ${batches.length > 0 ? `
        <div class="section-divider">Import History</div>
        <div class="table-container">
          <table>
            <thead><tr>
              <th>Date</th><th>File</th><th>Type</th><th>Records</th>
            </tr></thead>
            <tbody>
              ${batches.slice().reverse().slice(0, 20).map(b => `<tr>
                <td>${new Date(b.timestamp).toLocaleString()}</td>
                <td>${b.fileName || '--'}</td>
                <td><span class="tag blue">${b.dataType || 'transactions'}</span></td>
                <td class="num">${b.recordCount || 0}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${renderMappingTemplatesSection()}
    `;

    // Bind events
    const dropzone = container.querySelector('#inline-dropzone');
    const fileInput = container.querySelector('#inline-file-input');

    dropzone?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone?.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      openWizardWithFiles(e.dataTransfer.files);
    });
    fileInput?.addEventListener('change', () => openWizardWithFiles(fileInput.files));

    container.querySelector('#open-import-wizard')?.addEventListener('click', () => {
      reset();
      document.getElementById('import-modal')?.classList.remove('hidden');
      renderWizard();
    });
  }

  function openWizardWithFiles(files) {
    reset();
    currentState.files = Array.from(files);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
      currentState.parsedData = result.data;
      currentState.headers = result.meta.fields || [];
      currentState.sampleRows = result.data.slice(0, 5);
      currentState.mapping = autoMapColumns(currentState.headers, currentState.dataType);
      currentState.step = 2;
      document.getElementById('import-modal')?.classList.remove('hidden');
      renderWizard();
    };
    reader.readAsText(currentState.files[0]);
  }

  function renderMappingTemplatesSection() {
    const templates = Store.getMappingTemplates();
    if (templates.length === 0) return '';
    return `
      <div class="section-divider" style="margin-top:24px;">Mapping Templates</div>
      <div class="template-list">
        ${templates.map(t => `
          <div class="template-card">
            <div class="template-name">${t.name}</div>
            <div class="template-desc">${t.dataType} &bull; ${Object.keys(t.mapping).length} fields</div>
            <button class="btn-sm btn-danger" style="margin-top:8px;" onclick="Store.removeMappingTemplate('${t.id}'); Dashboard.refresh();">Delete</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  return {
    reset, renderWizard, renderInlineImport,
    STANDARD_FIELDS, autoMapColumns,
    parseDate, parseAmount, processImport
  };
})();
