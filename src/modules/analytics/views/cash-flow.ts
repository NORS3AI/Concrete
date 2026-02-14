/**
 * Cash Flow Models view.
 * Shows model name, method, start/end dates, periodicity, net cash flow,
 * confidence level, assumptions.
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
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Cash Flow Models'));
    const badge = el('span', 'px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleRow.appendChild(badge);
    header.appendChild(titleRow);
    wrapper.appendChild(header);

    // Loading
    const loadingEl = el('div', 'text-center py-12 text-[var(--text-muted)]', 'Loading cash flow models...');
    wrapper.appendChild(loadingEl);

    // Table container
    const tableContainer = el('div', '');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    function buildTable(models: any[]): HTMLElement {
      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      const cols = ['Model Name', 'Method', 'Start Date', 'End Date', 'Periodicity', 'Net Cash Flow', 'Confidence', 'Assumptions'];
      for (const col of cols) {
        const thCls = ['Net Cash Flow', 'Confidence'].includes(col)
          ? 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
          : 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-left';
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (models.length === 0) {
        const tr = el('tr');
        const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No cash flow models found.');
        td.setAttribute('colspan', String(cols.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const m of models) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');
        tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', m.name));

        const methodTd = el('td', 'px-4 py-3 text-sm');
        const methodBadge = el('span', 'px-2 py-0.5 text-xs rounded bg-[var(--surface)] text-[var(--text-muted)]', m.method);
        methodTd.appendChild(methodBadge);
        tr.appendChild(methodTd);

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', m.startDate));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', m.endDate));

        const periodicityTd = el('td', 'px-4 py-3 text-sm');
        const perBadge = el('span', 'px-2 py-0.5 text-xs rounded bg-[var(--accent)]/10 text-[var(--accent)]', m.periodicity);
        periodicityTd.appendChild(perBadge);
        tr.appendChild(periodicityTd);

        const ncfCls = m.netCashFlow >= 0
          ? 'px-4 py-3 text-sm text-right font-mono font-semibold text-emerald-600'
          : 'px-4 py-3 text-sm text-right font-mono font-semibold text-red-600';
        tr.appendChild(el('td', ncfCls, fmtCurrency(m.netCashFlow)));

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtPct(m.confidenceLevel)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)] max-w-[200px] truncate', m.assumptions || '-'));

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

        const models = await svc().listCashFlowModels();
        badge.textContent = String(models.length);
        loadingEl.style.display = 'none';
        tableContainer.appendChild(buildTable(models));
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load cash flow models', false);
        tableContainer.appendChild(buildTable([]));
      }
    }

    void loadData();
  },
};
