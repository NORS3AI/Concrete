/**
 * What-If Scenario Models view.
 * Shows name, description, status, projected revenue/expenses/profit,
 * created by/date. Status badges (draft=amber, active=emerald, archived=zinc).
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

function statusBadge(status: string): HTMLElement {
  let cls = 'px-2 py-0.5 text-xs font-medium rounded-full ';
  switch (status) {
    case 'draft':
      cls += 'bg-amber-50 text-amber-700';
      break;
    case 'active':
      cls += 'bg-emerald-50 text-emerald-700';
      break;
    case 'archived':
      cls += 'bg-zinc-100 text-zinc-500';
      break;
    default:
      cls += 'bg-zinc-100 text-zinc-500';
  }
  return el('span', cls, status);
}

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const header = el('div', 'flex items-center justify-between mb-6');
    const titleRow = el('div', 'flex items-center gap-3');
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'What-If Scenarios'));
    const badge = el('span', 'px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleRow.appendChild(badge);
    header.appendChild(titleRow);
    wrapper.appendChild(header);

    // Loading
    const loadingEl = el('div', 'text-center py-12 text-[var(--text-muted)]', 'Loading scenarios...');
    wrapper.appendChild(loadingEl);

    // Table container
    const tableContainer = el('div', '');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    function buildTable(scenarios: any[]): HTMLElement {
      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      const cols = ['Name', 'Description', 'Status', 'Projected Revenue', 'Projected Expenses', 'Projected Profit', 'Created By', 'Created Date'];
      for (const col of cols) {
        const thCls = ['Projected Revenue', 'Projected Expenses', 'Projected Profit'].includes(col)
          ? 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
          : 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-left';
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (scenarios.length === 0) {
        const tr = el('tr');
        const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No scenarios found. Create a what-if scenario to get started.');
        td.setAttribute('colspan', String(cols.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const s of scenarios) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

        tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', s.name));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)] max-w-[200px] truncate', s.description || '-'));

        const statusTd = el('td', 'px-4 py-3 text-sm');
        statusTd.appendChild(statusBadge(s.status));
        tr.appendChild(statusTd);

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(s.projectedRevenue)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(s.projectedExpenses)));

        const profitCls = s.projectedProfit >= 0
          ? 'px-4 py-3 text-sm text-right font-mono font-semibold text-emerald-600'
          : 'px-4 py-3 text-sm text-right font-mono font-semibold text-red-600';
        tr.appendChild(el('td', profitCls, fmtCurrency(s.projectedProfit)));

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', s.createdBy || '-'));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', s.createdDate || '-'));

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

        const scenarios = await svc().listScenarios();
        badge.textContent = String(scenarios.length);
        loadingEl.style.display = 'none';
        tableContainer.appendChild(buildTable(scenarios));
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load scenarios', false);
        tableContainer.appendChild(buildTable([]));
      }
    }

    void loadData();
  },
};
