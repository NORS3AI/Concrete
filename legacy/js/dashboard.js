/* ═══════════════════════════════════════════════════
   Concrete - Dashboard Renderer
   All tab content: Executive, Cash Flow, P&L,
   Balance Sheet, Working Capital, Settings
   ═══════════════════════════════════════════════════ */

const Dashboard = (() => {
  let currentTab = 'executive';
  let currentEntity = '__all__';
  let currentPeriod = 'ytd';

  function init() {
    bindNavigation();
    bindFilters();
    refresh();
  }

  function bindNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        renderCurrentTab();
      });
    });

    // Logo click -> executive
    document.getElementById('nav-logo')?.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelector('[data-tab="executive"]')?.classList.add('active');
      currentTab = 'executive';
      renderCurrentTab();
    });
  }

  function bindFilters() {
    document.getElementById('entity-filter')?.addEventListener('change', (e) => {
      currentEntity = e.target.value;
      renderCurrentTab();
    });

    document.getElementById('period-filter')?.addEventListener('change', (e) => {
      currentPeriod = e.target.value;
      renderCurrentTab();
    });

    // Export button
    document.getElementById('export-btn')?.addEventListener('click', () => {
      document.getElementById('export-modal')?.classList.remove('hidden');
    });

    // Alerts toggle
    document.getElementById('alerts-toggle')?.addEventListener('click', () => {
      document.getElementById('alerts-panel')?.classList.toggle('hidden');
    });
    document.getElementById('alerts-close')?.addEventListener('click', () => {
      document.getElementById('alerts-panel')?.classList.add('hidden');
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal')?.classList.add('hidden');
      });
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });
  }

  function refresh() {
    populateEntityFilter();
    renderCurrentTab();
    renderAlerts();
    ExportModule.initExportModal();
  }

  function populateEntityFilter() {
    const select = document.getElementById('entity-filter');
    if (!select) return;
    const entities = Store.getEntities();
    select.innerHTML = '<option value="__all__">All Entities (Consolidated)</option>';
    entities.forEach(e => {
      select.innerHTML += `<option value="${e.id}" ${e.id === currentEntity ? 'selected' : ''}>${e.name}</option>`;
    });
  }

  function renderCurrentTab() {
    Charts.destroyAll();
    const container = document.getElementById('tab-content');
    if (!container) return;

    switch (currentTab) {
      case 'executive': renderExecutive(container); break;
      case 'cashflow': renderCashFlow(container); break;
      case 'pnl': renderPnL(container); break;
      case 'balance': renderBalanceSheet(container); break;
      case 'working-capital': renderWorkingCapital(container); break;
      case 'entities': EntityManager.renderEntityTab(container, currentPeriod); break;
      case 'import': ImportWizard.renderInlineImport(container); break;
      case 'settings': renderSettings(container); break;
    }
  }

  function renderAlerts() {
    const alerts = KPIEngine.generateAlerts(currentEntity, currentPeriod);
    const badge = document.getElementById('alerts-badge');
    const list = document.getElementById('alerts-list');

    if (badge) {
      badge.textContent = alerts.length;
      badge.classList.toggle('zero', alerts.length === 0);
    }

    if (list) {
      if (alerts.length === 0) {
        list.innerHTML = '<div class="empty-state" style="padding:30px;"><p>No alerts</p></div>';
      } else {
        list.innerHTML = alerts.map(a => `
          <div class="alert-item ${a.type}">
            <div class="alert-title">${a.title}</div>
            <div class="alert-detail">${a.detail}</div>
            <div class="alert-entity">${a.entityName}</div>
          </div>
        `).join('');
      }
    }
  }

  // ════════════════════════════════════════
  // EXECUTIVE SUMMARY TAB
  // ════════════════════════════════════════

  function renderExecutive(container) {
    const kpis = KPIEngine.getExecutiveKPIs(currentEntity, currentPeriod);
    const pnl = KPIEngine.getPnLData(currentEntity, currentPeriod);
    const cf = KPIEngine.getCashFlowData(currentEntity, currentPeriod);
    const config = Store.getConfig();

    container.innerHTML = `
      <div class="tab-title">
        Executive Summary
        <span class="subtitle">${config.orgName || 'Concrete'} &bull; ${currentPeriod.toUpperCase()}</span>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Total Revenue</div>
          <div class="kpi-value ${KPIEngine.valueClass(kpis.revenue)}">${KPIEngine.fmt(kpis.revenue)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Expenses</div>
          <div class="kpi-value negative">${KPIEngine.fmt(kpis.expenses)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Income</div>
          <div class="kpi-value ${KPIEngine.valueClass(kpis.netIncome)}">${KPIEngine.fmt(kpis.netIncome)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Margin</div>
          <div class="kpi-value ${KPIEngine.valueClass(kpis.margin)}">${KPIEngine.fmtPct(kpis.margin)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Cash Flow</div>
          <div class="kpi-value ${KPIEngine.valueClass(kpis.netCashFlow)}">${KPIEngine.fmt(kpis.netCashFlow)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Working Capital</div>
          <div class="kpi-value ${KPIEngine.valueClass(kpis.workingCapital)}">${KPIEngine.fmt(kpis.workingCapital)}</div>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Total Assets</div>
          <div class="kpi-value neutral">${KPIEngine.fmt(kpis.totalAssets)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Liabilities</div>
          <div class="kpi-value neutral">${KPIEngine.fmt(kpis.totalLiabilities)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Equity</div>
          <div class="kpi-value ${KPIEngine.valueClass(kpis.equity)}">${KPIEngine.fmt(kpis.equity)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Monthly Burn Rate</div>
          <div class="kpi-value neutral">${KPIEngine.fmt(kpis.monthlyBurn)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Runway</div>
          <div class="kpi-value ${kpis.runway < 6 ? 'negative' : kpis.runway < 12 ? 'warning' : 'positive'}">
            ${kpis.runway === Infinity ? 'N/A' : KPIEngine.fmtNum(kpis.runway, 1) + ' mo'}
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Entities / Transactions</div>
          <div class="kpi-value neutral">${kpis.entityCount} / ${KPIEngine.fmtNum(kpis.transactionCount)}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:8px;">
        <div class="card">
          <div class="card-header"><h4>Revenue vs Expenses</h4></div>
          <div class="chart-container"><canvas id="exec-rev-exp-chart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h4>Net Cash Flow</h4></div>
          <div class="chart-container"><canvas id="exec-cashflow-chart"></canvas></div>
        </div>
      </div>

      ${renderTopEntitiesWidget()}
    `;

    // Charts
    setTimeout(() => {
      if (pnl.months.length > 0) {
        Charts.renderComboChart('exec-rev-exp-chart', {
          labels: pnl.months,
          barDatasets: [
            { label: 'Revenue', data: pnl.revenueByMonth, color: Charts.COLORS.green },
            { label: 'Expenses', data: pnl.expenseByMonth, color: Charts.COLORS.red }
          ],
          lineDatasets: [
            { label: 'Net Income', data: pnl.profitByMonth, color: Charts.COLORS.blue }
          ]
        });
      }
      if (cf.months.length > 0) {
        Charts.renderBarChart('exec-cashflow-chart', {
          labels: cf.months,
          datasets: [{
            label: 'Net Cash Flow',
            data: cf.netCashFlow,
            colors: cf.netCashFlow.map(v => v >= 0 ? Charts.COLORS.green + 'cc' : Charts.COLORS.red + 'cc')
          }]
        });
      }
    }, 50);
  }

  function renderTopEntitiesWidget() {
    if (currentEntity !== '__all__') return '';
    const comparison = KPIEngine.getEntityComparison(currentPeriod);
    if (comparison.length === 0) return '';

    const top5 = [...comparison].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const bottom5 = [...comparison].sort((a, b) => a.healthScore - b.healthScore).slice(0, 5);

    return `
      <div class="grid-2" style="margin-top:16px;">
        <div class="card">
          <div class="card-header"><h4>Top Entities by Revenue</h4></div>
          <div class="table-container">
            <table>
              <thead><tr><th>Entity</th><th class="num">Revenue</th><th class="num">Margin</th></tr></thead>
              <tbody>
                ${top5.map(e => `<tr class="clickable" onclick="EntityManager.openDrillDown('${e.id}','${currentPeriod}')">
                  <td><span class="health-dot ${e.health}"></span>${e.name}</td>
                  <td class="num">${KPIEngine.fmt(e.revenue)}</td>
                  <td class="num ${e.margin >= 0 ? 'positive' : 'negative'}">${KPIEngine.fmtPct(e.margin)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h4>Entities Needing Attention</h4></div>
          <div class="table-container">
            <table>
              <thead><tr><th>Entity</th><th class="num">Score</th><th class="num">Cash Flow</th></tr></thead>
              <tbody>
                ${bottom5.map(e => `<tr class="clickable" onclick="EntityManager.openDrillDown('${e.id}','${currentPeriod}')">
                  <td><span class="health-dot ${e.health}"></span>${e.name}</td>
                  <td class="num">${e.healthScore}</td>
                  <td class="num ${e.cashFlow >= 0 ? 'positive' : 'negative'}">${KPIEngine.fmt(e.cashFlow)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════
  // CASH FLOW TAB
  // ════════════════════════════════════════

  function renderCashFlow(container) {
    const cf = KPIEngine.getCashFlowData(currentEntity, currentPeriod);
    const kpis = KPIEngine.getExecutiveKPIs(currentEntity, currentPeriod);

    container.innerHTML = `
      <div class="tab-title">Cash Flow <span class="subtitle">${currentPeriod.toUpperCase()}</span></div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Total Cash In</div>
          <div class="kpi-value positive">${KPIEngine.fmt(cf.totalCashIn)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Cash Out</div>
          <div class="kpi-value negative">${KPIEngine.fmt(cf.totalCashOut)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Cash Flow</div>
          <div class="kpi-value ${KPIEngine.valueClass(kpis.netCashFlow)}">${KPIEngine.fmt(kpis.netCashFlow)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Monthly Burn</div>
          <div class="kpi-value neutral">${KPIEngine.fmt(kpis.monthlyBurn)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Runway</div>
          <div class="kpi-value ${kpis.runway < 6 ? 'negative' : 'positive'}">
            ${kpis.runway === Infinity ? 'N/A' : KPIEngine.fmtNum(kpis.runway, 1) + ' mo'}
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h4>Cash Flow by Category</h4></div>
          <div class="chart-container tall"><canvas id="cf-stacked-chart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h4>Running Cash Balance</h4></div>
          <div class="chart-container tall"><canvas id="cf-balance-chart"></canvas></div>
        </div>
      </div>

      ${renderCashByEntitySection(cf)}
    `;

    setTimeout(() => {
      if (cf.months.length > 0) {
        Charts.renderBarChart('cf-stacked-chart', {
          labels: cf.months,
          datasets: [
            { label: 'Operating', data: cf.operatingCashFlow, color: Charts.COLORS.blue },
            { label: 'Investing', data: cf.investingCashFlow, color: Charts.COLORS.purple },
            { label: 'Financing', data: cf.financingCashFlow, color: Charts.COLORS.orange }
          ],
          stacked: true
        });

        Charts.renderLineChart('cf-balance-chart', {
          labels: cf.months,
          datasets: [
            { label: 'Cash Balance', data: cf.balanceOverTime, color: Charts.COLORS.green, fill: true }
          ]
        });
      }
    }, 50);
  }

  function renderCashByEntitySection(cf) {
    const entries = Object.entries(cf.entityCash);
    if (entries.length <= 1) return '';

    const sorted = entries
      .map(([eid, amount]) => ({ name: Store.getEntity(eid)?.name || eid, amount }))
      .sort((a, b) => b.amount - a.amount);

    return `
      <div class="card" style="margin-top:16px;">
        <div class="card-header"><h4>Cash Position by Entity</h4></div>
        <div class="chart-container tall"><canvas id="cf-entity-chart"></canvas></div>
      </div>
      <script>
        setTimeout(() => {
          Charts.renderHorizontalBar('cf-entity-chart', {
            labels: ${JSON.stringify(sorted.map(e => e.name))},
            data: ${JSON.stringify(sorted.map(e => e.amount))},
            colors: ${JSON.stringify(sorted.map(e => e.amount >= 0 ? Charts.COLORS.green + 'cc' : Charts.COLORS.red + 'cc'))}
          });
        }, 100);
      </script>
    `;
  }

  // ════════════════════════════════════════
  // P&L TAB
  // ════════════════════════════════════════

  function renderPnL(container) {
    const pnl = KPIEngine.getPnLData(currentEntity, currentPeriod);

    container.innerHTML = `
      <div class="tab-title">Profit &amp; Loss <span class="subtitle">${currentPeriod.toUpperCase()}</span></div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Total Revenue</div>
          <div class="kpi-value positive">${KPIEngine.fmt(pnl.totalRevenue)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">COGS</div>
          <div class="kpi-value neutral">${KPIEngine.fmt(pnl.expenseBreakdown['Cost of Goods Sold'] || 0)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Gross Profit</div>
          <div class="kpi-value ${KPIEngine.valueClass(pnl.grossProfit)}">${KPIEngine.fmt(pnl.grossProfit)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Gross Margin</div>
          <div class="kpi-value ${KPIEngine.valueClass(pnl.grossMargin)}">${KPIEngine.fmtPct(pnl.grossMargin)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Operating Expenses</div>
          <div class="kpi-value negative">${KPIEngine.fmt(pnl.opex)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">EBITDA</div>
          <div class="kpi-value ${KPIEngine.valueClass(pnl.ebitda)}">${KPIEngine.fmt(pnl.ebitda)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Income</div>
          <div class="kpi-value ${KPIEngine.valueClass(pnl.netIncome)}">${KPIEngine.fmt(pnl.netIncome)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Margin</div>
          <div class="kpi-value ${KPIEngine.valueClass(pnl.netMargin)}">${KPIEngine.fmtPct(pnl.netMargin)}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h4>Monthly Revenue vs Expenses</h4></div>
          <div class="chart-container tall"><canvas id="pnl-monthly-chart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h4>P&amp;L Waterfall</h4></div>
          <div class="chart-container tall"><canvas id="pnl-waterfall-chart"></canvas></div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px;">
        <div class="card">
          <div class="card-header"><h4>Revenue Breakdown</h4></div>
          <div class="chart-container tall"><canvas id="pnl-rev-breakdown"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h4>Expense Breakdown</h4></div>
          <div class="chart-container tall"><canvas id="pnl-exp-breakdown"></canvas></div>
        </div>
      </div>
    `;

    setTimeout(() => {
      if (pnl.months.length > 0) {
        Charts.renderComboChart('pnl-monthly-chart', {
          labels: pnl.months,
          barDatasets: [
            { label: 'Revenue', data: pnl.revenueByMonth, color: Charts.COLORS.green },
            { label: 'Expenses', data: pnl.expenseByMonth, color: Charts.COLORS.red }
          ],
          lineDatasets: [
            { label: 'Profit', data: pnl.profitByMonth, color: Charts.COLORS.blue }
          ]
        });
      }

      // Waterfall
      const wfLabels = ['Revenue'];
      const wfValues = [pnl.totalRevenue];
      const expCats = Object.entries(pnl.expenseBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);
      expCats.forEach(([cat, val]) => {
        wfLabels.push(cat);
        wfValues.push(-val);
      });
      wfLabels.push('Net Income');
      wfValues.push(pnl.netIncome);
      Charts.renderWaterfallChart('pnl-waterfall-chart', { labels: wfLabels, values: wfValues });

      // Breakdowns
      const revEntries = Object.entries(pnl.revenueBreakdown).sort((a, b) => b[1] - a[1]);
      if (revEntries.length > 0) {
        Charts.renderDoughnutChart('pnl-rev-breakdown', {
          labels: revEntries.map(e => e[0]),
          data: revEntries.map(e => e[1])
        });
      }

      const expEntries = Object.entries(pnl.expenseBreakdown).sort((a, b) => b[1] - a[1]);
      if (expEntries.length > 0) {
        Charts.renderDoughnutChart('pnl-exp-breakdown', {
          labels: expEntries.map(e => e[0]),
          data: expEntries.map(e => e[1])
        });
      }
    }, 50);
  }

  // ════════════════════════════════════════
  // BALANCE SHEET TAB
  // ════════════════════════════════════════

  function renderBalanceSheet(container) {
    const bs = KPIEngine.getBalanceSheetData(currentEntity, currentPeriod);

    container.innerHTML = `
      <div class="tab-title">Balance Sheet <span class="subtitle">${currentPeriod.toUpperCase()}</span></div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Total Assets</div>
          <div class="kpi-value neutral">${KPIEngine.fmt(bs.totalAssets)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Liabilities</div>
          <div class="kpi-value neutral">${KPIEngine.fmt(bs.totalLiabilities)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Equity</div>
          <div class="kpi-value ${KPIEngine.valueClass(bs.equity)}">${KPIEngine.fmt(bs.equity)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Current Ratio</div>
          <div class="kpi-value ${bs.currentRatio >= 1.5 ? 'positive' : bs.currentRatio >= 1 ? 'warning' : 'negative'}">
            ${KPIEngine.fmtNum(bs.currentRatio, 2)}x
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Quick Ratio</div>
          <div class="kpi-value ${bs.quickRatio >= 1 ? 'positive' : 'negative'}">
            ${KPIEngine.fmtNum(bs.quickRatio, 2)}x
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Debt-to-Equity</div>
          <div class="kpi-value ${bs.debtToEquity <= 2 ? 'positive' : 'negative'}">
            ${KPIEngine.fmtNum(bs.debtToEquity, 2)}x
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h4>Assets</h4></div>
          <div class="table-container">
            <table>
              <thead><tr><th>Category</th><th class="num">Amount</th><th class="num">% of Total</th></tr></thead>
              <tbody>
                ${Object.entries(bs.assetsByCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) => `<tr>
                  <td>${cat}</td>
                  <td class="num">${KPIEngine.fmt(val)}</td>
                  <td class="num">${bs.totalAssets > 0 ? KPIEngine.fmtPct(val / bs.totalAssets * 100) : '--'}</td>
                </tr>`).join('')}
                <tr style="font-weight:700;border-top:2px solid var(--border-light);">
                  <td>Total Assets</td><td class="num">${KPIEngine.fmt(bs.totalAssets)}</td><td class="num">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="margin-top:16px;">
            <div class="chart-container"><canvas id="bs-assets-chart"></canvas></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h4>Liabilities &amp; Equity</h4></div>
          <div class="table-container">
            <table>
              <thead><tr><th>Category</th><th class="num">Amount</th><th class="num">% of Total</th></tr></thead>
              <tbody>
                ${Object.entries(bs.liabilitiesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) => `<tr>
                  <td>${cat}</td>
                  <td class="num">${KPIEngine.fmt(val)}</td>
                  <td class="num">${bs.totalLiabilities > 0 ? KPIEngine.fmtPct(val / bs.totalLiabilities * 100) : '--'}</td>
                </tr>`).join('')}
                <tr style="font-weight:600;border-top:1px solid var(--border-light);">
                  <td>Total Liabilities</td><td class="num">${KPIEngine.fmt(bs.totalLiabilities)}</td><td></td>
                </tr>
                <tr style="font-weight:700;color:var(--accent);">
                  <td>Equity</td><td class="num">${KPIEngine.fmt(bs.equity)}</td><td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="margin-top:16px;">
            <div class="chart-container"><canvas id="bs-liab-chart"></canvas></div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="card-header"><h4>Balance Sheet Structure</h4></div>
        <div class="grid-2">
          <div>
            <h4 style="margin-bottom:8px;">Assets</h4>
            <div class="breakdown-bar">
              <div class="breakdown-segment" style="width:${bs.totalAssets > 0 ? (bs.currentAssets / bs.totalAssets * 100) : 50}%;background:${Charts.COLORS.blue};" title="Current: ${KPIEngine.fmt(bs.currentAssets)}"></div>
              <div class="breakdown-segment" style="width:${bs.totalAssets > 0 ? (bs.nonCurrentAssets / bs.totalAssets * 100) : 50}%;background:${Charts.COLORS.purple};" title="Non-Current: ${KPIEngine.fmt(bs.nonCurrentAssets)}"></div>
            </div>
            <div style="display:flex;gap:16px;font-size:0.8rem;color:var(--text-muted);">
              <span style="color:${Charts.COLORS.blue};">Current: ${KPIEngine.fmt(bs.currentAssets)}</span>
              <span style="color:${Charts.COLORS.purple};">Non-Current: ${KPIEngine.fmt(bs.nonCurrentAssets)}</span>
            </div>
          </div>
          <div>
            <h4 style="margin-bottom:8px;">Liabilities</h4>
            <div class="breakdown-bar">
              <div class="breakdown-segment" style="width:${bs.totalLiabilities > 0 ? (bs.currentLiabilities / bs.totalLiabilities * 100) : 50}%;background:${Charts.COLORS.red};" title="Current: ${KPIEngine.fmt(bs.currentLiabilities)}"></div>
              <div class="breakdown-segment" style="width:${bs.totalLiabilities > 0 ? (bs.nonCurrentLiabilities / bs.totalLiabilities * 100) : 50}%;background:${Charts.COLORS.orange};" title="Non-Current: ${KPIEngine.fmt(bs.nonCurrentLiabilities)}"></div>
            </div>
            <div style="display:flex;gap:16px;font-size:0.8rem;color:var(--text-muted);">
              <span style="color:${Charts.COLORS.red};">Current: ${KPIEngine.fmt(bs.currentLiabilities)}</span>
              <span style="color:${Charts.COLORS.orange};">Non-Current: ${KPIEngine.fmt(bs.nonCurrentLiabilities)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const assetEntries = Object.entries(bs.assetsByCategory).sort((a, b) => b[1] - a[1]);
      if (assetEntries.length > 0) {
        Charts.renderDoughnutChart('bs-assets-chart', {
          labels: assetEntries.map(e => e[0]),
          data: assetEntries.map(e => e[1])
        });
      }
      const liabEntries = Object.entries(bs.liabilitiesByCategory).sort((a, b) => b[1] - a[1]);
      if (liabEntries.length > 0) {
        Charts.renderDoughnutChart('bs-liab-chart', {
          labels: liabEntries.map(e => e[0]),
          data: liabEntries.map(e => e[1])
        });
      }
    }, 50);
  }

  // ════════════════════════════════════════
  // WORKING CAPITAL TAB
  // ════════════════════════════════════════

  function renderWorkingCapital(container) {
    const wc = KPIEngine.getWorkingCapitalData(currentEntity, currentPeriod);

    container.innerHTML = `
      <div class="tab-title">Working Capital <span class="subtitle">${currentPeriod.toUpperCase()}</span></div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Accounts Receivable</div>
          <div class="kpi-value neutral">${KPIEngine.fmt(wc.ar)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Accounts Payable</div>
          <div class="kpi-value neutral">${KPIEngine.fmt(wc.ap)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Inventory</div>
          <div class="kpi-value neutral">${KPIEngine.fmt(wc.inventory)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Working Capital</div>
          <div class="kpi-value ${KPIEngine.valueClass(wc.workingCapital)}">${KPIEngine.fmt(wc.workingCapital)}</div>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">DSO (Days Sales Outstanding)</div>
          <div class="kpi-value ${wc.dso > 60 ? 'negative' : wc.dso > 45 ? 'warning' : 'positive'}">
            ${KPIEngine.fmtDays(wc.dso)}
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">DPO (Days Payable Outstanding)</div>
          <div class="kpi-value neutral">${KPIEngine.fmtDays(wc.dpo)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">DIO (Days Inventory Outstanding)</div>
          <div class="kpi-value ${wc.dio > 90 ? 'negative' : 'neutral'}">${KPIEngine.fmtDays(wc.dio)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Cash Conversion Cycle</div>
          <div class="kpi-value ${wc.ccc > 90 ? 'negative' : wc.ccc > 45 ? 'warning' : 'positive'}">
            ${KPIEngine.fmtDays(wc.ccc)}
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h4>Working Capital Trend</h4></div>
          <div class="chart-container tall"><canvas id="wc-trend-chart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h4>AR Aging Analysis</h4></div>
          <div class="chart-container tall"><canvas id="wc-aging-chart"></canvas></div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="card-header"><h4>Cash Conversion Cycle</h4></div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:16px 0;">
          <div class="kpi-card" style="flex:1;min-width:120px;text-align:center;">
            <div class="kpi-label">DSO</div>
            <div style="font-size:1.2rem;font-weight:700;color:${Charts.COLORS.blue};">${KPIEngine.fmtNum(wc.dso, 0)}</div>
          </div>
          <div style="font-size:1.5rem;color:var(--text-muted);">+</div>
          <div class="kpi-card" style="flex:1;min-width:120px;text-align:center;">
            <div class="kpi-label">DIO</div>
            <div style="font-size:1.2rem;font-weight:700;color:${Charts.COLORS.purple};">${KPIEngine.fmtNum(wc.dio, 0)}</div>
          </div>
          <div style="font-size:1.5rem;color:var(--text-muted);">-</div>
          <div class="kpi-card" style="flex:1;min-width:120px;text-align:center;">
            <div class="kpi-label">DPO</div>
            <div style="font-size:1.2rem;font-weight:700;color:${Charts.COLORS.orange};">${KPIEngine.fmtNum(wc.dpo, 0)}</div>
          </div>
          <div style="font-size:1.5rem;color:var(--text-muted);">=</div>
          <div class="kpi-card" style="flex:1;min-width:120px;text-align:center;border-color:var(--accent);">
            <div class="kpi-label">CCC</div>
            <div style="font-size:1.2rem;font-weight:700;color:${Charts.COLORS.green};">${KPIEngine.fmtNum(wc.ccc, 0)} days</div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      if (wc.months.length > 0) {
        Charts.renderLineChart('wc-trend-chart', {
          labels: wc.months,
          datasets: [
            { label: 'Working Capital', data: wc.wcTrend, color: Charts.COLORS.blue, fill: true }
          ]
        });
      }

      Charts.renderBarChart('wc-aging-chart', {
        labels: ['Current', '1-30 days', '31-60 days', '61-90 days', '90+ days'],
        datasets: [{
          label: 'Outstanding AR',
          data: [
            wc.agingBuckets.current,
            wc.agingBuckets['30'],
            wc.agingBuckets['60'],
            wc.agingBuckets['90'],
            wc.agingBuckets['90+']
          ],
          colors: [
            Charts.COLORS.green + 'cc',
            Charts.COLORS.blue + 'cc',
            Charts.COLORS.yellow + 'cc',
            Charts.COLORS.orange + 'cc',
            Charts.COLORS.red + 'cc'
          ]
        }]
      });
    }, 50);
  }

  // ════════════════════════════════════════
  // SETTINGS TAB
  // ════════════════════════════════════════

  function renderSettings(container) {
    const config = Store.getConfig();
    const stats = Store.getStats();

    container.innerHTML = `
      <div class="tab-title">Settings <span class="subtitle">Configuration &amp; Data Management</span></div>

      <div class="grid-2">
        <div>
          <div class="settings-section">
            <h3>Organization</h3>
            <div class="form-group">
              <label>Organization Name</label>
              <input type="text" id="setting-org-name" value="${config.orgName || ''}">
            </div>
            <div class="form-group">
              <label>Base Currency</label>
              <select id="setting-currency">
                ${['USD','EUR','GBP','CAD','AUD','JPY','CHF','CNY','INR','BRL'].map(c =>
                  `<option value="${c}" ${config.baseCurrency === c ? 'selected' : ''}>${c}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Fiscal Year Start</label>
              <select id="setting-fiscal">
                ${[{v:1,l:'January'},{v:2,l:'February'},{v:3,l:'March'},{v:4,l:'April'},{v:7,l:'July'},{v:10,l:'October'}].map(m =>
                  `<option value="${m.v}" ${config.fiscalYearStart == m.v ? 'selected' : ''}>${m.l}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Dashboard Mode</label>
              <select id="setting-mode">
                <option value="single" ${config.mode === 'single' ? 'selected' : ''}>Single Entity</option>
                <option value="multi" ${config.mode === 'multi' ? 'selected' : ''}>Multi-Entity</option>
                <option value="full" ${config.mode === 'full' ? 'selected' : ''}>Full Suite (CFO/Controller)</option>
              </select>
            </div>
            <button class="btn-primary" id="save-settings">Save Settings</button>
          </div>

          <div class="settings-section">
            <h3>Features</h3>
            ${renderFeatureToggle('Intercompany Elimination', 'intercompanyElimination', config.features)}
            ${renderFeatureToggle('Budget Tracking', 'budgetTracking', config.features)}
            ${renderFeatureToggle('Alerts & Anomaly Detection', 'alertsEnabled', config.features)}
            ${renderFeatureToggle('Fuzzy Entity Matching', 'fuzzyMatching', config.features)}
            ${renderFeatureToggle('Anomaly Detection', 'anomalyDetection', config.features)}
          </div>
        </div>

        <div>
          <div class="settings-section">
            <h3>Data Summary</h3>
            <div class="table-container">
              <table>
                <tbody>
                  <tr><td>Entities</td><td class="num">${KPIEngine.fmtNum(stats.entities)}</td></tr>
                  <tr><td>Transactions</td><td class="num">${KPIEngine.fmtNum(stats.transactions)}</td></tr>
                  <tr><td>Customers</td><td class="num">${KPIEngine.fmtNum(stats.customers)}</td></tr>
                  <tr><td>Employees</td><td class="num">${KPIEngine.fmtNum(stats.employees)}</td></tr>
                  <tr><td>Debts</td><td class="num">${KPIEngine.fmtNum(stats.debts)}</td></tr>
                  <tr><td>Budgets</td><td class="num">${KPIEngine.fmtNum(stats.budgets)}</td></tr>
                  <tr><td>Import Batches</td><td class="num">${KPIEngine.fmtNum(stats.importBatches)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="settings-section">
            <h3>Data Management</h3>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <button class="btn-secondary" id="export-full-backup">Export Full Backup (JSON)</button>
              <div>
                <label class="btn-secondary" style="display:inline-block;cursor:pointer;">
                  Import Backup
                  <input type="file" id="import-backup-input" accept=".json" style="display:none;">
                </label>
              </div>
              <button class="btn-secondary" id="generate-sample-data">Generate Sample Data</button>
              <button class="btn-danger" id="reset-all-data">Reset All Data</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind settings events
    container.querySelector('#save-settings')?.addEventListener('click', () => {
      Store.setConfig({
        orgName: container.querySelector('#setting-org-name').value,
        baseCurrency: container.querySelector('#setting-currency').value,
        fiscalYearStart: parseInt(container.querySelector('#setting-fiscal').value),
        mode: container.querySelector('#setting-mode').value
      });
      refresh();
    });

    // Feature toggles
    container.querySelectorAll('.feature-toggle-input').forEach(toggle => {
      toggle.addEventListener('change', () => {
        const features = { ...Store.getConfig().features };
        features[toggle.dataset.feature] = toggle.checked;
        Store.setConfig({ features });
      });
    });

    container.querySelector('#export-full-backup')?.addEventListener('click', () => {
      ExportModule.exportFullBackup();
    });

    container.querySelector('#import-backup-input')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await ExportModule.importFullBackup(file);
        alert('Backup imported successfully');
        refresh();
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    });

    container.querySelector('#generate-sample-data')?.addEventListener('click', () => {
      if (confirm('Generate sample data for demonstration? This will add to existing data.')) {
        generateSampleData();
        refresh();
      }
    });

    container.querySelector('#reset-all-data')?.addEventListener('click', () => {
      if (confirm('Delete ALL data? This cannot be undone.')) {
        if (confirm('Are you sure? This will remove all entities, transactions, and settings.')) {
          Store.resetAll();
          window.location.reload();
        }
      }
    });
  }

  function renderFeatureToggle(label, key, features) {
    const checked = features && features[key] ? 'checked' : '';
    return `
      <div class="setting-row">
        <div class="setting-label">${label}</div>
        <div class="setting-control">
          <label class="toggle">
            <input type="checkbox" class="feature-toggle-input" data-feature="${key}" ${checked}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════
  // SAMPLE DATA GENERATOR
  // ════════════════════════════════════════

  function generateSampleData() {
    const entityNames = [
      'Acme Corp', 'Beta Holdings', 'Charlie Industries', 'Delta Services', 'Echo Finance',
      'Foxtrot Manufacturing', 'Golf Retail', 'Hotel Properties', 'India Tech', 'Juliet Logistics'
    ];

    const categories = {
      revenue: ['Sales Revenue', 'Service Revenue', 'Subscription Revenue', 'Licensing Revenue'],
      expense: ['Payroll', 'Rent', 'Utilities', 'Marketing', 'Cost of Goods Sold', 'Professional Services',
        'Software', 'Travel', 'Insurance', 'Depreciation', 'Interest', 'Tax'],
      asset: ['Cash', 'Accounts Receivable', 'Inventory', 'Short-term Investments', 'Property', 'Equipment'],
      liability: ['Accounts Payable', 'Short-term Debt', 'Long-term Debt', 'Accrued Expenses']
    };

    // Create entities
    const entities = entityNames.map((name, idx) => Store.addEntity({
      name,
      type: idx < 3 ? 'subsidiary' : idx < 6 ? 'division' : 'department',
      parentId: idx >= 3 && idx < 6 ? Store.getEntities()[0]?.id : idx >= 6 ? Store.getEntities()[Math.min(idx - 5, 2)]?.id : null,
      industry: ['Technology', 'Manufacturing', 'Retail', 'Finance', 'Services'][idx % 5],
      riskRating: idx % 3 === 0 ? 'low' : idx % 3 === 1 ? 'medium' : 'high',
      currency: 'USD',
      tags: ['demo']
    }));

    // Generate 12 months of transactions
    const now = new Date();
    for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
      const year = now.getFullYear();
      const month = now.getMonth() - monthOffset;
      const date = new Date(year, month, 15);
      const dateStr = date.toISOString().split('T')[0];

      entities.forEach((entity, eIdx) => {
        const scale = 1 + eIdx * 0.3;

        // Revenue transactions
        categories.revenue.forEach(cat => {
          Store.addTransaction({
            entityId: entity.id,
            date: dateStr,
            type: 'revenue',
            category: cat,
            amount: Math.round((50000 + Math.random() * 200000) * scale),
            description: `${cat} - ${date.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`,
            currency: 'USD'
          });
        });

        // Expense transactions
        categories.expense.forEach(cat => {
          const amt = cat === 'Cost of Goods Sold' ? 80000 + Math.random() * 100000 :
            cat === 'Payroll' ? 60000 + Math.random() * 80000 :
              5000 + Math.random() * 30000;
          Store.addTransaction({
            entityId: entity.id,
            date: dateStr,
            type: 'expense',
            category: cat,
            amount: -Math.round(amt * scale),
            description: `${cat} - ${date.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`,
            currency: 'USD'
          });
        });

        // Asset entries (quarterly)
        if (monthOffset % 3 === 0) {
          categories.asset.forEach(cat => {
            Store.addTransaction({
              entityId: entity.id,
              date: dateStr,
              type: 'asset',
              category: cat,
              amount: Math.round((100000 + Math.random() * 500000) * scale),
              description: `${cat} balance`,
              currency: 'USD'
            });
          });

          categories.liability.forEach(cat => {
            Store.addTransaction({
              entityId: entity.id,
              date: dateStr,
              type: 'liability',
              category: cat,
              amount: -Math.round((50000 + Math.random() * 200000) * scale),
              description: `${cat} balance`,
              currency: 'USD'
            });
          });
        }
      });
    }

    // Sample customers
    entities.forEach(entity => {
      for (let i = 0; i < 3; i++) {
        Store.addCustomer({
          entityId: entity.id,
          name: `Customer ${entity.name.split(' ')[0]}-${i + 1}`,
          totalRevenue: Math.round(100000 + Math.random() * 500000),
          outstandingReceivables: Math.round(Math.random() * 50000),
          lastPaymentDate: new Date(now.getTime() - Math.random() * 60 * 86400000).toISOString().split('T')[0],
          paymentTerms: [15, 30, 45, 60][Math.floor(Math.random() * 4)]
        });
      }
    });

    // Sample debts
    entities.slice(0, 5).forEach(entity => {
      Store.addDebt({
        entityId: entity.id,
        type: 'loan',
        counterparty: 'First National Bank',
        principal: Math.round(500000 + Math.random() * 2000000),
        interestRate: 3 + Math.random() * 5,
        maturityDate: new Date(now.getTime() + Math.random() * 365 * 3 * 86400000).toISOString().split('T')[0],
        currentBalance: Math.round(300000 + Math.random() * 1500000)
      });
    });

    // Sample budgets
    entities.forEach(entity => {
      ['Payroll', 'Marketing', 'Rent', 'Cost of Goods Sold'].forEach(cat => {
        const planned = Math.round(50000 + Math.random() * 200000);
        Store.addBudget({
          entityId: entity.id,
          period: now.toISOString().substring(0, 7),
          category: cat,
          planned,
          actual: Math.round(planned * (0.8 + Math.random() * 0.4))
        });
      });
    });
  }

  return { init, refresh, renderCurrentTab, generateSampleData };
})();
