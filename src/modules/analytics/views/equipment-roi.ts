/**
 * Equipment ROI view.
 * Shows equipment name, purchase cost, total revenue/expenses, net income,
 * ROI %, utilization %, cost/revenue per hour.
 */

import { getAnalyticsService } from '../service-accessor';

const svc = () => getAnalyticsService();

const el = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const showMsg = (c: HTMLElement, msg: string, ok = true) => {
  const d = el('div', `p-3 rounded mb-4 ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`, msg);
  c.prepend(d);
  setTimeout(() => d.remove(), 3000);
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const header = el('div', 'flex items-center justify-between mb-6');
    const titleRow = el('div', 'flex items-center gap-3');
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment ROI'));
    const badge = el('span', 'px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleRow.appendChild(badge);
    header.appendChild(titleRow);
    wrapper.appendChild(header);

    // Loading
    const loadingEl = el('div', 'text-center py-12 text-[var(--text-muted)]', 'Loading equipment ROI data...');
    wrapper.appendChild(loadingEl);

    // Table container
    const tableContainer = el('div', '');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    function buildTable(rows: any[]): HTMLElement {
      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      const cols = ['Equipment', 'Purchase Cost', 'Total Revenue', 'Total Expenses', 'Net Income', 'ROI %', 'Utilization %', 'Cost/Hour', 'Revenue/Hour'];
      for (const col of cols) {
        const thCls = ['Purchase Cost', 'Total Revenue', 'Total Expenses', 'Net Income', 'ROI %', 'Utilization %', 'Cost/Hour', 'Revenue/Hour'].includes(col)
          ? 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
          : 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-left';
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (rows.length === 0) {
        const tr = el('tr');
        const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No equipment ROI data found.');
        td.setAttribute('colspan', String(cols.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const r of rows) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

        tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', r.equipmentName || r.equipmentId));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(r.purchaseCost)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(r.totalRevenue)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(r.totalExpenses)));

        const netCls = r.netIncome >= 0
          ? 'px-4 py-3 text-sm text-right font-mono font-semibold text-emerald-600'
          : 'px-4 py-3 text-sm text-right font-mono font-semibold text-red-600';
        tr.appendChild(el('td', netCls, fmtCurrency(r.netIncome)));

        const roiCls = r.roiPct >= 0
          ? 'px-4 py-3 text-sm text-right font-mono font-semibold text-emerald-600'
          : 'px-4 py-3 text-sm text-right font-mono font-semibold text-red-600';
        tr.appendChild(el('td', roiCls, fmtPct(r.roiPct)));

        const utilCls = r.utilizationPct >= 75
          ? 'px-4 py-3 text-sm text-right font-mono text-emerald-600'
          : r.utilizationPct >= 50
            ? 'px-4 py-3 text-sm text-right font-mono text-amber-600'
            : 'px-4 py-3 text-sm text-right font-mono text-red-600';
        tr.appendChild(el('td', utilCls, fmtPct(r.utilizationPct)));

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(r.costPerHour)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(r.revenuePerHour)));

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      return wrap;
    }

    async function loadData(): Promise<void> {
      try {
        loadingEl.style.display = 'block';
        tableContainer.innerHTML = '';

        const rows = await svc().listEquipmentROI();
        badge.textContent = String(rows.length);
        loadingEl.style.display = 'none';
        tableContainer.appendChild(buildTable(rows));
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load equipment ROI data', false);
        tableContainer.appendChild(buildTable([]));
      }
    }

    void loadData();
  },
};
