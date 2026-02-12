/* ═══════════════════════════════════════════════════
   Concrete - Entity Manager
   Hierarchy, CRUD, drill-down support
   ═══════════════════════════════════════════════════ */

const EntityManager = (() => {

  function renderEntityTab(container, period) {
    const comparison = KPIEngine.getEntityComparison(period);
    const entities = Store.getEntities();

    container.innerHTML = `
      <div class="tab-title">
        Entities
        <span class="subtitle">${entities.length} entities across the group</span>
      </div>

      <div class="filter-bar">
        <input type="text" id="entity-search" placeholder="Search entities...">
        <select id="entity-health-filter">
          <option value="all">All Health</option>
          <option value="green">Healthy</option>
          <option value="yellow">Warning</option>
          <option value="red">Critical</option>
        </select>
        <select id="entity-sort">
          <option value="name">Sort by Name</option>
          <option value="revenue">Sort by Revenue</option>
          <option value="netIncome">Sort by Net Income</option>
          <option value="cashFlow">Sort by Cash Flow</option>
          <option value="healthScore">Sort by Health</option>
        </select>
        <button class="btn-primary btn-sm" id="add-entity-btn">+ Add Entity</button>
      </div>

      <div id="entity-table-wrapper">
        ${renderEntityTable(comparison)}
      </div>

      ${entities.length > 0 ? renderHierarchySection() : ''}
    `;

    bindEntityEvents(container, comparison, period);
  }

  function renderEntityTable(comparison) {
    if (comparison.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">&#127970;</div><p>No entities yet. Add entities or import data.</p></div>`;
    }

    return `
      <div class="table-container">
        <table id="entity-comparison-table">
          <thead>
            <tr>
              <th data-sort="health" style="width:40px;">Health</th>
              <th data-sort="name">Entity</th>
              <th data-sort="type">Type</th>
              <th data-sort="revenue" class="num">Revenue</th>
              <th data-sort="expenses" class="num">Expenses</th>
              <th data-sort="netIncome" class="num">Net Income</th>
              <th data-sort="margin" class="num">Margin</th>
              <th data-sort="cashFlow" class="num">Cash Flow</th>
              <th data-sort="healthScore" class="num">Score</th>
              <th style="width:80px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${comparison.map(e => `
              <tr class="clickable" data-entity-id="${e.id}">
                <td><span class="health-dot ${e.health}"></span></td>
                <td><strong>${e.name}</strong></td>
                <td><span class="tag blue">${e.type}</span></td>
                <td class="num">${KPIEngine.fmt(e.revenue)}</td>
                <td class="num">${KPIEngine.fmt(e.expenses)}</td>
                <td class="num ${e.netIncome >= 0 ? 'positive' : 'negative'}">${KPIEngine.fmt(e.netIncome)}</td>
                <td class="num ${e.margin >= 0 ? 'positive' : 'negative'}">${KPIEngine.fmtPct(e.margin)}</td>
                <td class="num ${e.cashFlow >= 0 ? 'positive' : 'negative'}">${KPIEngine.fmt(e.cashFlow)}</td>
                <td class="num">${e.healthScore}</td>
                <td>
                  <button class="btn-sm btn-secondary edit-entity" data-id="${e.id}" title="Edit">&#9998;</button>
                  <button class="btn-sm btn-danger delete-entity" data-id="${e.id}" title="Delete">&#10005;</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderHierarchySection() {
    const tree = Store.getEntityHierarchy();
    if (tree.length === 0) return '';

    return `
      <div class="section-divider" style="margin-top:24px;">Entity Hierarchy</div>
      <div class="card">
        <ul class="hierarchy-tree">
          ${tree.map(node => renderHierarchyNode(node)).join('')}
        </ul>
      </div>
    `;
  }

  function renderHierarchyNode(node) {
    const hasChildren = node.children && node.children.length > 0;
    return `
      <li>
        <span class="hierarchy-node" data-entity-id="${node.id}">
          <span class="hierarchy-toggle">${hasChildren ? '\u25BC' : '\u2022'}</span>
          <span class="health-dot ${KPIEngine.healthStatus(50)}"></span>
          ${node.name}
          <span style="color:var(--text-muted);font-size:0.8rem;">(${node.type || 'subsidiary'})</span>
        </span>
        ${hasChildren ? `<ul>${node.children.map(c => renderHierarchyNode(c)).join('')}</ul>` : ''}
      </li>
    `;
  }

  function bindEntityEvents(container, comparison, period) {
    const searchInput = container.querySelector('#entity-search');
    const healthFilter = container.querySelector('#entity-health-filter');
    const sortSelect = container.querySelector('#entity-sort');
    const addBtn = container.querySelector('#add-entity-btn');

    function filterAndSort() {
      let data = [...comparison];
      const search = searchInput.value.toLowerCase();
      const health = healthFilter.value;
      const sort = sortSelect.value;

      if (search) data = data.filter(e => e.name.toLowerCase().includes(search));
      if (health !== 'all') data = data.filter(e => e.health === health);

      data.sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        return (b[sort] || 0) - (a[sort] || 0);
      });

      const wrapper = container.querySelector('#entity-table-wrapper');
      if (wrapper) wrapper.innerHTML = renderEntityTable(data);
      bindTableEvents(container, period);
    }

    searchInput?.addEventListener('input', filterAndSort);
    healthFilter?.addEventListener('change', filterAndSort);
    sortSelect?.addEventListener('change', filterAndSort);

    addBtn?.addEventListener('click', () => showAddEntityDialog());
    bindTableEvents(container, period);

    // Hierarchy clicks
    container.querySelectorAll('.hierarchy-node').forEach(node => {
      node.addEventListener('click', () => {
        const entityId = node.dataset.entityId;
        if (entityId) openDrillDown(entityId, period);
      });
    });
  }

  function bindTableEvents(container, period) {
    container.querySelectorAll('tr.clickable').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const entityId = row.dataset.entityId;
        if (entityId) openDrillDown(entityId, period);
      });
    });

    container.querySelectorAll('.edit-entity').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showEditEntityDialog(btn.dataset.id);
      });
    });

    container.querySelectorAll('.delete-entity').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this entity and all associated data?')) {
          Store.removeEntity(btn.dataset.id);
          if (typeof Dashboard !== 'undefined') Dashboard.refresh();
        }
      });
    });
  }

  // ── Add/Edit Entity Dialog ──

  function showAddEntityDialog() {
    showEntityForm(null);
  }

  function showEditEntityDialog(entityId) {
    const entity = Store.getEntity(entityId);
    if (entity) showEntityForm(entity);
  }

  function showEntityForm(entity) {
    const isEdit = !!entity;
    const entities = Store.getEntities();
    const modal = document.getElementById('drilldown-modal');
    const title = document.getElementById('drilldown-title');
    const body = document.getElementById('drilldown-body');

    title.textContent = isEdit ? `Edit: ${entity.name}` : 'Add New Entity';
    body.innerHTML = `
      <div style="max-width:500px;">
        <div class="form-group">
          <label>Entity Name *</label>
          <input type="text" id="ef-name" value="${isEdit ? entity.name : ''}" placeholder="e.g. Acme Corp">
        </div>
        <div class="form-group">
          <label>Type</label>
          <select id="ef-type">
            <option value="subsidiary" ${isEdit && entity.type === 'subsidiary' ? 'selected' : ''}>Subsidiary</option>
            <option value="division" ${isEdit && entity.type === 'division' ? 'selected' : ''}>Division</option>
            <option value="department" ${isEdit && entity.type === 'department' ? 'selected' : ''}>Department</option>
          </select>
        </div>
        <div class="form-group">
          <label>Parent Entity</label>
          <select id="ef-parent">
            <option value="">None (Top Level)</option>
            ${entities.filter(e => !isEdit || e.id !== entity.id).map(e =>
              `<option value="${e.id}" ${isEdit && entity.parentId === e.id ? 'selected' : ''}>${e.name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Industry</label>
          <input type="text" id="ef-industry" value="${isEdit ? (entity.industry || '') : ''}" placeholder="e.g. Technology">
        </div>
        <div class="form-group">
          <label>Risk Rating</label>
          <select id="ef-risk">
            <option value="low" ${isEdit && entity.riskRating === 'low' ? 'selected' : ''}>Low</option>
            <option value="medium" ${isEdit && entity.riskRating === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${isEdit && entity.riskRating === 'high' ? 'selected' : ''}>High</option>
          </select>
        </div>
        <div class="form-group">
          <label>Currency</label>
          <input type="text" id="ef-currency" value="${isEdit ? (entity.currency || '') : Store.getConfig().baseCurrency}" placeholder="USD">
        </div>
        <div class="form-group">
          <label>Tags (comma-separated)</label>
          <input type="text" id="ef-tags" value="${isEdit ? (entity.tags || []).join(', ') : ''}" placeholder="e.g. manufacturing, asia-pacific">
        </div>
        <div class="form-group">
          <label>Aliases (for fuzzy matching, comma-separated)</label>
          <input type="text" id="ef-aliases" value="" placeholder="e.g. Acme, ACME Corp.">
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button class="btn-secondary" id="ef-cancel">Cancel</button>
          <button class="btn-primary" id="ef-save">${isEdit ? 'Update' : 'Create'} Entity</button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');

    body.querySelector('#ef-cancel').addEventListener('click', () => modal.classList.add('hidden'));
    body.querySelector('#ef-save').addEventListener('click', () => {
      const name = body.querySelector('#ef-name').value.trim();
      if (!name) { alert('Entity name is required'); return; }

      const data = {
        name,
        type: body.querySelector('#ef-type').value,
        parentId: body.querySelector('#ef-parent').value || null,
        industry: body.querySelector('#ef-industry').value.trim(),
        riskRating: body.querySelector('#ef-risk').value,
        currency: body.querySelector('#ef-currency').value.trim() || Store.getConfig().baseCurrency,
        tags: body.querySelector('#ef-tags').value.split(',').map(t => t.trim()).filter(Boolean)
      };

      if (isEdit) {
        Store.updateEntity(entity.id, data);
      } else {
        const newEntity = Store.addEntity(data);
        // Add aliases
        const aliases = body.querySelector('#ef-aliases').value.split(',').map(a => a.trim()).filter(Boolean);
        aliases.forEach(alias => Store.addEntityAlias(newEntity.id, alias));
      }

      modal.classList.add('hidden');
      if (typeof Dashboard !== 'undefined') Dashboard.refresh();
    });
  }

  // ── Drill-Down ──

  function openDrillDown(entityId, period) {
    const data = KPIEngine.getEntityDrilldown(entityId, period);
    if (!data) return;

    const modal = document.getElementById('drilldown-modal');
    const title = document.getElementById('drilldown-title');
    const body = document.getElementById('drilldown-body');

    title.textContent = data.entity.name;

    body.innerHTML = `
      <div class="drilldown-kpis">
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">Revenue</div>
            <div class="kpi-value ${KPIEngine.valueClass(data.kpis.revenue)}">${KPIEngine.fmt(data.kpis.revenue)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Expenses</div>
            <div class="kpi-value negative">${KPIEngine.fmt(data.kpis.expenses)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Net Income</div>
            <div class="kpi-value ${KPIEngine.valueClass(data.kpis.netIncome)}">${KPIEngine.fmt(data.kpis.netIncome)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Cash Flow</div>
            <div class="kpi-value ${KPIEngine.valueClass(data.kpis.netCashFlow)}">${KPIEngine.fmt(data.kpis.netCashFlow)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Margin</div>
            <div class="kpi-value ${KPIEngine.valueClass(data.kpis.margin)}">${KPIEngine.fmtPct(data.kpis.margin)}</div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="drilldown-section">
          <h4>Revenue &amp; Expenses Trend</h4>
          <div class="chart-container"><canvas id="drilldown-pnl-chart"></canvas></div>
        </div>
        <div class="drilldown-section">
          <h4>Cash Flow Trend</h4>
          <div class="chart-container"><canvas id="drilldown-cf-chart"></canvas></div>
        </div>
      </div>

      ${data.customers.length > 0 ? renderDrilldownCustomers(data.customers) : ''}
      ${data.employees.length > 0 ? renderDrilldownEmployees(data.employees) : ''}
      ${data.debts.length > 0 ? renderDrilldownDebts(data.debts) : ''}
      ${data.budgets.length > 0 ? renderDrilldownBudgets(data.budgets) : ''}
      ${data.children.length > 0 ? renderDrilldownChildren(data.children) : ''}

      ${data.alerts.length > 0 ? `
        <div class="drilldown-section">
          <h4>Alerts</h4>
          ${data.alerts.map(a => `
            <div class="alert-item ${a.type}">
              <div class="alert-title">${a.title}</div>
              <div class="alert-detail">${a.detail}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    modal.classList.remove('hidden');

    // Render drilldown charts
    setTimeout(() => {
      if (data.pnl.months.length > 0) {
        Charts.renderLineChart('drilldown-pnl-chart', {
          labels: data.pnl.months,
          datasets: [
            { label: 'Revenue', data: data.pnl.revenueByMonth, color: Charts.COLORS.green },
            { label: 'Expenses', data: data.pnl.expenseByMonth, color: Charts.COLORS.red }
          ]
        });
        Charts.renderBarChart('drilldown-cf-chart', {
          labels: data.cashFlow.months,
          datasets: [
            { label: 'Net Cash Flow', data: data.cashFlow.netCashFlow, color: Charts.COLORS.blue }
          ]
        });
      }
    }, 100);
  }

  function renderDrilldownCustomers(customers) {
    return `
      <div class="drilldown-section">
        <h4>Top Customers (${customers.length})</h4>
        <div class="table-container">
          <table>
            <thead><tr><th>Name</th><th class="num">Revenue</th><th class="num">Outstanding AR</th><th>Last Payment</th><th class="num">Terms</th></tr></thead>
            <tbody>
              ${customers.slice(0, 10).map(c => `<tr>
                <td>${c.name}</td>
                <td class="num">${KPIEngine.fmt(c.totalRevenue)}</td>
                <td class="num ${c.outstandingReceivables > 0 ? 'negative' : ''}">${KPIEngine.fmt(c.outstandingReceivables)}</td>
                <td>${c.lastPaymentDate || '--'}</td>
                <td class="num">${c.paymentTerms || 30} days</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderDrilldownEmployees(employees) {
    return `
      <div class="drilldown-section">
        <h4>Employees (${employees.length})</h4>
        <div class="table-container">
          <table>
            <thead><tr><th>Name</th><th>Department</th><th>Cost Center</th><th class="num">Salary</th></tr></thead>
            <tbody>
              ${employees.slice(0, 10).map(e => `<tr>
                <td>${e.name}</td>
                <td>${e.department || '--'}</td>
                <td>${e.costCenter || '--'}</td>
                <td class="num">${KPIEngine.fmt(e.salary)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderDrilldownDebts(debts) {
    return `
      <div class="drilldown-section">
        <h4>Debts &amp; Obligations (${debts.length})</h4>
        <div class="table-container">
          <table>
            <thead><tr><th>Type</th><th>Counterparty</th><th class="num">Principal</th><th class="num">Balance</th><th class="num">Rate</th><th>Maturity</th></tr></thead>
            <tbody>
              ${debts.map(d => `<tr>
                <td><span class="tag ${d.type === 'receivable' ? 'green' : 'red'}">${d.type}</span></td>
                <td>${d.counterparty || '--'}</td>
                <td class="num">${KPIEngine.fmt(d.principal)}</td>
                <td class="num">${KPIEngine.fmt(d.currentBalance)}</td>
                <td class="num">${d.interestRate ? d.interestRate + '%' : '--'}</td>
                <td>${d.maturityDate || '--'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderDrilldownBudgets(budgets) {
    return `
      <div class="drilldown-section">
        <h4>Budget vs Actual</h4>
        <div class="table-container">
          <table>
            <thead><tr><th>Period</th><th>Category</th><th class="num">Planned</th><th class="num">Actual</th><th class="num">Variance</th></tr></thead>
            <tbody>
              ${budgets.map(b => {
                const variance = b.planned > 0 ? ((b.actual - b.planned) / b.planned * 100) : 0;
                return `<tr>
                  <td>${b.period}</td>
                  <td>${b.category}</td>
                  <td class="num">${KPIEngine.fmt(b.planned)}</td>
                  <td class="num">${KPIEngine.fmt(b.actual)}</td>
                  <td class="num ${variance > 0 ? 'negative' : 'positive'}">${KPIEngine.fmtPct(variance)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderDrilldownChildren(children) {
    return `
      <div class="drilldown-section">
        <h4>Sub-Entities (${children.length})</h4>
        <div class="table-container">
          <table>
            <thead><tr><th>Name</th><th>Type</th></tr></thead>
            <tbody>
              ${children.map(c => `<tr class="clickable" data-child-id="${c.id}">
                <td>${c.name}</td>
                <td><span class="tag blue">${c.type || 'subsidiary'}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return {
    renderEntityTab,
    openDrillDown,
    showAddEntityDialog
  };
})();
