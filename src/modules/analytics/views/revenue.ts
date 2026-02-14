/**
 * Revenue Forecasts view.
 * Shows entity/job, period, forecast vs actual amount, variance, method, confidence.
 * Color-code variance (positive=emerald, negative=red).
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
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Revenue Forecasts'));
    const badge = el('span', 'px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleRow.appendChild(badge);
    header.appendChild(titleRow);
    wrapper.appendChild(header);

    // Filters
    const filterRow = el('div', 'flex flex-wrap items-center gap-3 mb-6');
    filterRow.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Period:'));
    const periodInput = el('input', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
    periodInput.type = 'text';
    periodInput.placeholder = 'e.g. 2026-Q1';
    filterRow.appendChild(periodInput);

    const filterBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Filter');
    filterRow.appendChild(filterBtn);
    wrapper.appendChild(filterRow);

    // Loading
    const loadingEl = el('div', 'text-center py-12 text-[var(--text-muted)]', 'Loading revenue forecasts...');
    wrapper.appendChild(loadingEl);

    // Table container
    const tableContainer = el('div', '');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    function buildTable(forecasts: any[]): HTMLElement {
      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      const cols = ['Entity / Job', 'Period', 'Forecast', 'Actual', 'Variance', 'Method', 'Confidence'];
      for (const col of cols) {
        const thCls = ['Forecast', 'Actual', 'Variance', 'Confidence'].includes(col)
          ? 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
          : 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-left';
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (forecasts.length === 0) {
        const tr = el('tr');
        const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No revenue forecasts found.');
        td.setAttribute('colspan', String(cols.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const f of forecasts) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

        const entityLabel = f.entityName || f.jobName || f.entityId || f.jobId || '-';
        tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', entityLabel));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', f.period));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(f.forecastAmount)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', f.actualAmount ? fmtCurrency(f.actualAmount) : '-'));

        const variance = f.variance ?? 0;
        const varCls = variance >= 0
          ? 'px-4 py-3 text-sm text-right font-mono font-semibold text-emerald-600'
          : 'px-4 py-3 text-sm text-right font-mono font-semibold text-red-600';
        tr.appendChild(el('td', varCls, variance ? fmtCurrency(variance) : '-'));

        const methodTd = el('td', 'px-4 py-3 text-sm');
        const methodBadge = el('span', 'px-2 py-0.5 text-xs rounded bg-[var(--surface)] text-[var(--text-muted)]', f.method);
        methodTd.appendChild(methodBadge);
        tr.appendChild(methodTd);

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtPct(f.confidenceLevel)));

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

        const filters: { period?: string } = {};
        if (periodInput.value.trim()) filters.period = periodInput.value.trim();

        const forecasts = await svc().listRevenueForecasts(filters);
        badge.textContent = String(forecasts.length);
        loadingEl.style.display = 'none';
        tableContainer.appendChild(buildTable(forecasts));
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load revenue forecasts', false);
        tableContainer.appendChild(buildTable([]));
      }
    }

    filterBtn.addEventListener('click', () => void loadData());
    void loadData();
  },
};
