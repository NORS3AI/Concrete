/* ═══════════════════════════════════════════════════
   FinConsol - KPI Calculation Engine
   Real-time financial metric computation
   ═══════════════════════════════════════════════════ */

const KPIEngine = (() => {
  const CURRENCY_SYMBOLS = {
    USD: '$', EUR: '\u20AC', GBP: '\u00A3', CAD: 'C$', AUD: 'A$',
    JPY: '\u00A5', CHF: 'CHF ', CNY: '\u00A5', INR: '\u20B9', BRL: 'R$'
  };

  function fmt(val, decimals = 0) {
    if (val === null || val === undefined || isNaN(val)) return '--';
    const sym = CURRENCY_SYMBOLS[Store.getConfig().baseCurrency] || '$';
    const abs = Math.abs(val);
    let str;
    if (abs >= 1e9) str = (val / 1e9).toFixed(1) + 'B';
    else if (abs >= 1e6) str = (val / 1e6).toFixed(1) + 'M';
    else if (abs >= 1e3) str = (val / 1e3).toFixed(1) + 'K';
    else str = val.toFixed(decimals);
    return sym + str;
  }

  function fmtNum(val, decimals = 0) {
    if (val === null || val === undefined || isNaN(val)) return '--';
    return val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function fmtPct(val) {
    if (val === null || val === undefined || isNaN(val)) return '--';
    return val.toFixed(1) + '%';
  }

  function fmtDays(val) {
    if (val === null || val === undefined || isNaN(val)) return '--';
    return val.toFixed(0) + ' days';
  }

  function changeClass(val) {
    if (val > 0) return 'up';
    if (val < 0) return 'down';
    return 'flat';
  }

  function valueClass(val, invertColors = false) {
    if (val > 0) return invertColors ? 'negative' : 'positive';
    if (val < 0) return invertColors ? 'positive' : 'negative';
    return 'neutral';
  }

  function healthStatus(score) {
    if (score >= 70) return 'green';
    if (score >= 40) return 'yellow';
    return 'red';
  }

  // ── Core Aggregation ──

  function getFilteredTransactions(entityId, period) {
    const dateRange = Store.getDateRange(period);
    const filter = { dateFrom: dateRange.from, dateTo: dateRange.to };
    if (entityId && entityId !== '__all__') {
      // Include children in consolidated view
      const children = Store.getEntityChildren(entityId, true);
      const entityIds = [entityId, ...children.map(c => c.id)];
      const allTxns = Store.getTransactions({ dateFrom: dateRange.from, dateTo: dateRange.to });
      return allTxns.filter(t => entityIds.includes(t.entityId));
    }
    return Store.getTransactions(filter);
  }

  function sumByType(txns, type) {
    return txns.filter(t => t.type === type).reduce((s, t) => s + (t.amount || 0), 0);
  }

  function sumByCategory(txns, category) {
    return txns.filter(t => t.category === category).reduce((s, t) => s + (t.amount || 0), 0);
  }

  function sumByAccount(txns, account) {
    return txns.filter(t => t.account === account).reduce((s, t) => s + (t.amount || 0), 0);
  }

  function groupByMonth(txns) {
    const groups = {};
    txns.forEach(t => {
      const month = t.date ? t.date.substring(0, 7) : 'unknown';
      if (!groups[month]) groups[month] = [];
      groups[month].push(t);
    });
    return groups;
  }

  function groupByEntity(txns) {
    const groups = {};
    txns.forEach(t => {
      if (!groups[t.entityId]) groups[t.entityId] = [];
      groups[t.entityId].push(t);
    });
    return groups;
  }

  function groupByCategory(txns) {
    const groups = {};
    txns.forEach(t => {
      const cat = t.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  }

  // ── Intercompany Elimination ──

  function eliminateIntercompany(txns) {
    const config = Store.getConfig();
    if (!config.features?.intercompanyElimination) return txns;
    return txns.filter(t => !t.counterpartyEntityId);
  }

  // ── Executive KPIs ──

  function getExecutiveKPIs(entityId, period) {
    const txns = getFilteredTransactions(entityId, period);
    const clean = eliminateIntercompany(txns);

    const revenue = sumByType(clean, 'revenue');
    const expenses = Math.abs(sumByType(clean, 'expense'));
    const netIncome = revenue - expenses;
    const margin = revenue !== 0 ? (netIncome / revenue) * 100 : 0;

    const cashIn = clean.filter(t => t.type === 'revenue' || (t.type === 'transfer' && t.amount > 0))
      .reduce((s, t) => s + t.amount, 0);
    const cashOut = Math.abs(clean.filter(t => t.type === 'expense' || (t.type === 'transfer' && t.amount < 0))
      .reduce((s, t) => s + t.amount, 0));
    const netCashFlow = cashIn - cashOut;

    // Assets & liabilities from balance sheet entries
    const totalAssets = sumByType(clean, 'asset');
    const totalLiabilities = Math.abs(sumByType(clean, 'liability'));
    const equity = totalAssets - totalLiabilities;

    // Working capital components
    const ar = sumByCategory(clean, 'Accounts Receivable');
    const ap = Math.abs(sumByCategory(clean, 'Accounts Payable'));
    const inventory = sumByCategory(clean, 'Inventory');
    const workingCapital = ar + inventory - ap;

    // Burn rate (monthly expense average)
    const months = groupByMonth(clean);
    const monthKeys = Object.keys(months).sort();
    const monthCount = Math.max(monthKeys.length, 1);
    const monthlyBurn = expenses / monthCount;
    const cashBalance = cashIn - cashOut + totalAssets;
    const runway = monthlyBurn > 0 ? cashBalance / monthlyBurn : Infinity;

    // Entity count
    const entityCount = entityId === '__all__' || !entityId
      ? Store.getEntities().length
      : Store.getEntityChildren(entityId, true).length + 1;

    return {
      revenue, expenses, netIncome, margin,
      cashIn, cashOut, netCashFlow,
      totalAssets, totalLiabilities, equity,
      ar, ap, inventory, workingCapital,
      monthlyBurn, runway, cashBalance,
      entityCount,
      transactionCount: txns.length
    };
  }

  // ── Cash Flow ──

  function getCashFlowData(entityId, period) {
    const txns = getFilteredTransactions(entityId, period);
    const clean = eliminateIntercompany(txns);
    const monthly = groupByMonth(clean);
    const sortedMonths = Object.keys(monthly).sort();

    const operatingCashFlow = [];
    const investingCashFlow = [];
    const financingCashFlow = [];
    const netCashFlow = [];
    let runningBalance = 0;
    const balanceOverTime = [];

    sortedMonths.forEach(month => {
      const mtxns = monthly[month];
      const opRevenue = mtxns.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0);
      const opExpense = mtxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const operating = opRevenue + opExpense; // opExpense is negative

      const investing = mtxns.filter(t => t.category === 'Capital Expenditure' || t.category === 'Investment')
        .reduce((s, t) => s + t.amount, 0);
      const financing = mtxns.filter(t => t.category === 'Debt' || t.category === 'Equity' || t.category === 'Loan')
        .reduce((s, t) => s + t.amount, 0);

      const net = operating + investing + financing;
      runningBalance += net;

      operatingCashFlow.push(operating);
      investingCashFlow.push(investing);
      financingCashFlow.push(financing);
      netCashFlow.push(net);
      balanceOverTime.push(runningBalance);
    });

    // Cash by entity
    const byEntity = groupByEntity(clean);
    const entityCash = {};
    Object.entries(byEntity).forEach(([eid, etxns]) => {
      entityCash[eid] = etxns.reduce((s, t) => s + t.amount, 0);
    });

    return {
      months: sortedMonths,
      operatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      netCashFlow,
      balanceOverTime,
      entityCash,
      totalCashIn: clean.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      totalCashOut: Math.abs(clean.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))
    };
  }

  // ── P&L ──

  function getPnLData(entityId, period) {
    const txns = getFilteredTransactions(entityId, period);
    const clean = eliminateIntercompany(txns);
    const monthly = groupByMonth(clean);
    const sortedMonths = Object.keys(monthly).sort();

    const revenueByMonth = [];
    const expenseByMonth = [];
    const profitByMonth = [];

    sortedMonths.forEach(month => {
      const mtxns = monthly[month];
      const rev = sumByType(mtxns, 'revenue');
      const exp = Math.abs(sumByType(mtxns, 'expense'));
      revenueByMonth.push(rev);
      expenseByMonth.push(exp);
      profitByMonth.push(rev - exp);
    });

    // Revenue breakdown by category
    const revTxns = clean.filter(t => t.type === 'revenue');
    const revByCategory = groupByCategory(revTxns);
    const revenueBreakdown = {};
    Object.entries(revByCategory).forEach(([cat, ctxns]) => {
      revenueBreakdown[cat] = ctxns.reduce((s, t) => s + t.amount, 0);
    });

    // Expense breakdown by category
    const expTxns = clean.filter(t => t.type === 'expense');
    const expByCategory = groupByCategory(expTxns);
    const expenseBreakdown = {};
    Object.entries(expByCategory).forEach(([cat, ctxns]) => {
      expenseBreakdown[cat] = Math.abs(ctxns.reduce((s, t) => s + t.amount, 0));
    });

    const totalRevenue = revTxns.reduce((s, t) => s + t.amount, 0);
    const totalExpenses = Math.abs(expTxns.reduce((s, t) => s + t.amount, 0));
    const grossProfit = totalRevenue - (expenseBreakdown['Cost of Goods Sold'] || 0);
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netIncome = totalRevenue - totalExpenses;
    const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
    const ebitda = netIncome + (expenseBreakdown['Depreciation'] || 0) + (expenseBreakdown['Amortization'] || 0)
      + (expenseBreakdown['Interest'] || 0) + (expenseBreakdown['Tax'] || 0);

    return {
      months: sortedMonths,
      revenueByMonth, expenseByMonth, profitByMonth,
      revenueBreakdown, expenseBreakdown,
      totalRevenue, totalExpenses,
      grossProfit, grossMargin,
      netIncome, netMargin,
      ebitda,
      opex: totalExpenses - (expenseBreakdown['Cost of Goods Sold'] || 0)
    };
  }

  // ── Balance Sheet ──

  function getBalanceSheetData(entityId, period) {
    const txns = getFilteredTransactions(entityId, period);
    const clean = eliminateIntercompany(txns);

    const assetTxns = clean.filter(t => t.type === 'asset');
    const liabilityTxns = clean.filter(t => t.type === 'liability');

    const assetsByCategory = {};
    groupByCategory(assetTxns).forEach = null;
    const assetGroups = groupByCategory(assetTxns);
    Object.entries(assetGroups).forEach(([cat, ctxns]) => {
      assetsByCategory[cat] = ctxns.reduce((s, t) => s + t.amount, 0);
    });

    const liabilitiesByCategory = {};
    const liabGroups = groupByCategory(liabilityTxns);
    Object.entries(liabGroups).forEach(([cat, ctxns]) => {
      liabilitiesByCategory[cat] = Math.abs(ctxns.reduce((s, t) => s + t.amount, 0));
    });

    const totalAssets = Object.values(assetsByCategory).reduce((s, v) => s + v, 0);
    const totalLiabilities = Object.values(liabilitiesByCategory).reduce((s, v) => s + v, 0);
    const equity = totalAssets - totalLiabilities;

    // Current vs non-current
    const currentAssetCats = ['Cash', 'Accounts Receivable', 'Inventory', 'Short-term Investments', 'Prepaid Expenses'];
    const currentLiabCats = ['Accounts Payable', 'Short-term Debt', 'Accrued Expenses', 'Current Portion of Long-term Debt'];

    const currentAssets = Object.entries(assetsByCategory)
      .filter(([cat]) => currentAssetCats.includes(cat))
      .reduce((s, [, v]) => s + v, 0);
    const nonCurrentAssets = totalAssets - currentAssets;

    const currentLiabilities = Object.entries(liabilitiesByCategory)
      .filter(([cat]) => currentLiabCats.includes(cat))
      .reduce((s, [, v]) => s + v, 0);
    const nonCurrentLiabilities = totalLiabilities - currentLiabilities;

    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
    const quickRatio = currentLiabilities > 0
      ? (currentAssets - (assetsByCategory['Inventory'] || 0)) / currentLiabilities
      : 0;
    const debtToEquity = equity > 0 ? totalLiabilities / equity : 0;

    return {
      assetsByCategory, liabilitiesByCategory,
      totalAssets, totalLiabilities, equity,
      currentAssets, nonCurrentAssets,
      currentLiabilities, nonCurrentLiabilities,
      currentRatio, quickRatio, debtToEquity
    };
  }

  // ── Working Capital ──

  function getWorkingCapitalData(entityId, period) {
    const txns = getFilteredTransactions(entityId, period);
    const clean = eliminateIntercompany(txns);

    const ar = sumByCategory(clean.filter(t => t.type === 'asset'), 'Accounts Receivable');
    const ap = Math.abs(sumByCategory(clean.filter(t => t.type === 'liability'), 'Accounts Payable'));
    const inventory = sumByCategory(clean.filter(t => t.type === 'asset'), 'Inventory');

    const revenue = sumByType(clean, 'revenue');
    const cogs = Math.abs(sumByCategory(clean.filter(t => t.type === 'expense'), 'Cost of Goods Sold'));

    const monthCount = Math.max(Object.keys(groupByMonth(clean)).length, 1);
    const dailyRevenue = revenue / (monthCount * 30);
    const dailyCogs = cogs / (monthCount * 30);

    const dso = dailyRevenue > 0 ? ar / dailyRevenue : 0;
    const dpo = dailyCogs > 0 ? ap / dailyCogs : 0;
    const dio = dailyCogs > 0 ? inventory / dailyCogs : 0;
    const ccc = dso + dio - dpo;

    const workingCapital = ar + inventory - ap;
    const wcRatio = ap > 0 ? (ar + inventory) / ap : 0;

    // Monthly trend
    const monthly = groupByMonth(clean);
    const sortedMonths = Object.keys(monthly).sort();
    const wcTrend = sortedMonths.map(month => {
      const mtxns = monthly[month];
      const mAr = sumByCategory(mtxns.filter(t => t.type === 'asset'), 'Accounts Receivable');
      const mAp = Math.abs(sumByCategory(mtxns.filter(t => t.type === 'liability'), 'Accounts Payable'));
      const mInv = sumByCategory(mtxns.filter(t => t.type === 'asset'), 'Inventory');
      return mAr + mInv - mAp;
    });

    // Aging buckets for AR
    const customers = Store.getCustomers(entityId === '__all__' ? undefined : entityId);
    const agingBuckets = { current: 0, '30': 0, '60': 0, '90': 0, '90+': 0 };
    customers.forEach(c => {
      if (!c.lastPaymentDate || !c.outstandingReceivables) return;
      const daysSince = Math.floor((Date.now() - new Date(c.lastPaymentDate).getTime()) / 86400000);
      const amt = c.outstandingReceivables;
      if (daysSince <= 0) agingBuckets.current += amt;
      else if (daysSince <= 30) agingBuckets['30'] += amt;
      else if (daysSince <= 60) agingBuckets['60'] += amt;
      else if (daysSince <= 90) agingBuckets['90'] += amt;
      else agingBuckets['90+'] += amt;
    });

    return {
      ar, ap, inventory,
      dso, dpo, dio, ccc,
      workingCapital, wcRatio,
      months: sortedMonths, wcTrend,
      agingBuckets
    };
  }

  // ── Entity Comparison ──

  function getEntityComparison(period) {
    const entities = Store.getEntities();
    const dateRange = Store.getDateRange(period);

    return entities.map(entity => {
      const txns = Store.getTransactions({
        entityId: entity.id,
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      });

      const revenue = sumByType(txns, 'revenue');
      const expenses = Math.abs(sumByType(txns, 'expense'));
      const netIncome = revenue - expenses;
      const margin = revenue > 0 ? (netIncome / revenue) * 100 : 0;
      const cashFlow = txns.reduce((s, t) => s + t.amount, 0);
      const assets = sumByType(txns, 'asset');
      const liabilities = Math.abs(sumByType(txns, 'liability'));

      // Health score (0-100)
      let score = 50;
      if (margin > 20) score += 20; else if (margin > 10) score += 10; else if (margin < 0) score -= 20;
      if (cashFlow > 0) score += 15; else score -= 15;
      if (assets > liabilities) score += 15; else score -= 10;

      score = Math.max(0, Math.min(100, score));

      return {
        id: entity.id,
        name: entity.name,
        type: entity.type || 'subsidiary',
        parentId: entity.parentId,
        revenue, expenses, netIncome, margin,
        cashFlow, assets, liabilities,
        healthScore: score,
        health: healthStatus(score),
        transactionCount: txns.length,
        riskRating: entity.riskRating || 'medium',
        tags: entity.tags || []
      };
    });
  }

  // ── Alerts ──

  function generateAlerts(entityId, period) {
    const alerts = [];
    const entities = entityId && entityId !== '__all__'
      ? [Store.getEntity(entityId)].filter(Boolean)
      : Store.getEntities();
    const dateRange = Store.getDateRange(period);

    entities.forEach(entity => {
      const txns = Store.getTransactions({
        entityId: entity.id,
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      });

      const revenue = sumByType(txns, 'revenue');
      const expenses = Math.abs(sumByType(txns, 'expense'));
      const netIncome = revenue - expenses;
      const cashFlow = txns.reduce((s, t) => s + t.amount, 0);

      // Negative cash flow
      if (cashFlow < 0) {
        alerts.push({
          type: 'critical',
          title: 'Negative Cash Flow',
          detail: `Net cash flow: ${fmt(cashFlow)}`,
          entityId: entity.id,
          entityName: entity.name
        });
      }

      // Operating at a loss
      if (netIncome < 0 && revenue > 0) {
        alerts.push({
          type: 'warning',
          title: 'Operating at Loss',
          detail: `Net margin: ${fmtPct((netIncome / revenue) * 100)}`,
          entityId: entity.id,
          entityName: entity.name
        });
      }

      // Check debts for maturity
      const debts = Store.getDebts(entity.id);
      debts.forEach(debt => {
        if (debt.maturityDate) {
          const daysToMaturity = Math.floor(
            (new Date(debt.maturityDate).getTime() - Date.now()) / 86400000
          );
          if (daysToMaturity <= 30 && daysToMaturity >= 0) {
            alerts.push({
              type: 'warning',
              title: 'Debt Maturing Soon',
              detail: `${debt.counterparty}: ${fmt(debt.currentBalance)} in ${daysToMaturity} days`,
              entityId: entity.id,
              entityName: entity.name
            });
          } else if (daysToMaturity < 0) {
            alerts.push({
              type: 'critical',
              title: 'Past Due Debt',
              detail: `${debt.counterparty}: ${fmt(debt.currentBalance)} overdue by ${Math.abs(daysToMaturity)} days`,
              entityId: entity.id,
              entityName: entity.name
            });
          }
        }
      });

      // Late customer payments
      const customers = Store.getCustomers(entity.id);
      customers.forEach(cust => {
        if (cust.outstandingReceivables > 0 && cust.lastPaymentDate) {
          const daysSince = Math.floor((Date.now() - new Date(cust.lastPaymentDate).getTime()) / 86400000);
          const terms = cust.paymentTerms || 30;
          if (daysSince > terms) {
            alerts.push({
              type: 'warning',
              title: 'Late Customer Payment',
              detail: `${cust.name}: ${fmt(cust.outstandingReceivables)} (${daysSince - terms} days past terms)`,
              entityId: entity.id,
              entityName: entity.name
            });
          }
        }
      });

      // Anomaly detection: check for spikes
      const monthly = groupByMonth(txns);
      const monthKeys = Object.keys(monthly).sort();
      if (monthKeys.length >= 3) {
        const lastMonth = monthKeys[monthKeys.length - 1];
        const prevMonths = monthKeys.slice(0, -1);
        const lastExpense = Math.abs(sumByType(monthly[lastMonth], 'expense'));
        const avgExpense = prevMonths.reduce((s, m) => s + Math.abs(sumByType(monthly[m], 'expense')), 0) / prevMonths.length;
        if (avgExpense > 0 && lastExpense > avgExpense * 3) {
          alerts.push({
            type: 'critical',
            title: 'Expense Spike Detected',
            detail: `${lastMonth}: ${fmt(lastExpense)} vs avg ${fmt(avgExpense)} (${(lastExpense / avgExpense).toFixed(1)}x)`,
            entityId: entity.id,
            entityName: entity.name
          });
        }
      }

      // Budget variance
      const budgets = Store.getBudgets(entity.id);
      budgets.forEach(budget => {
        if (budget.actual && budget.planned && budget.planned > 0) {
          const variance = ((budget.actual - budget.planned) / budget.planned) * 100;
          if (Math.abs(variance) > 20) {
            alerts.push({
              type: variance > 0 ? 'warning' : 'info',
              title: 'Budget Variance',
              detail: `${budget.category}: ${fmtPct(variance)} (${fmt(budget.actual)} vs ${fmt(budget.planned)})`,
              entityId: entity.id,
              entityName: entity.name
            });
          }
        }
      });
    });

    // Sort: critical first, then warning, then info
    const order = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => (order[a.type] || 3) - (order[b.type] || 3));
    return alerts;
  }

  // ── Entity Drilldown ──

  function getEntityDrilldown(entityId, period) {
    const entity = Store.getEntity(entityId);
    if (!entity) return null;

    const kpis = getExecutiveKPIs(entityId, period);
    const pnl = getPnLData(entityId, period);
    const cashFlow = getCashFlowData(entityId, period);
    const balance = getBalanceSheetData(entityId, period);
    const wc = getWorkingCapitalData(entityId, period);
    const customers = Store.getCustomers(entityId);
    const employees = Store.getEmployees(entityId);
    const debts = Store.getDebts(entityId);
    const budgets = Store.getBudgets(entityId);
    const children = Store.getEntityChildren(entityId);
    const alerts = generateAlerts(entityId, period);

    return {
      entity, kpis, pnl, cashFlow, balance, wc,
      customers, employees, debts, budgets, children, alerts
    };
  }

  return {
    fmt, fmtNum, fmtPct, fmtDays,
    changeClass, valueClass, healthStatus,
    getFilteredTransactions,
    sumByType, sumByCategory, sumByAccount,
    groupByMonth, groupByEntity, groupByCategory,
    eliminateIntercompany,
    getExecutiveKPIs,
    getCashFlowData,
    getPnLData,
    getBalanceSheetData,
    getWorkingCapitalData,
    getEntityComparison,
    generateAlerts,
    getEntityDrilldown
  };
})();
