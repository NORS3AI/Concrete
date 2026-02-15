/**
 * Labor Productivity view.
 * Shows period, job, cost code, total hours/units, cost per unit,
 * hours per unit, efficiency %, benchmark, variance.
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
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Labor Productivity'));
    const badge = el('span', 'px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleRow.appendChild(badge);
    header.appendChild(titleRow);
    wrapper.appendChild(header);

    // Filters
    const filterRow = el('div', 'flex flex-wrap items-center gap-3 mb-6');
    filterRow.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Period:'));
    const periodInput = el('input', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
    periodInput.type = 'text';
    periodInput.placeholder = 'e.g. 2026-01';
    filterRow.appendChild(periodInput);

    filterRow.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Job ID:'));
    const jobInput = el('input', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
    jobInput.type = 'text';
    jobInput.placeholder = 'Job ID';
    filterRow.appendChild(jobInput);

    const filterBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Filter');
    filterRow.appendChild(filterBtn);
    wrapper.appendChild(filterRow);

    // Loading
    const loadingEl = el('div', 'text-center py-12 text-[var(--text-muted)]', 'Loading labor productivity data...');
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
      const cols = ['Period', 'Job', 'Cost Code', 'Total Hours', 'Total Units', 'Cost/Unit', 'Hours/Unit', 'Efficiency %', 'Benchmark', 'Variance'];
      for (const col of cols) {
        const thCls = ['Total Hours', 'Total Units', 'Cost/Unit', 'Hours/Unit', 'Efficiency %', 'Benchmark', 'Variance'].includes(col)
          ? 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
          : 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-left';
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (rows.length === 0) {
        const tr = el('tr');
        const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No labor productivity data found.');
        td.setAttribute('colspan', String(cols.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const r of rows) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', r.period));
        tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', r.jobName || r.jobId || '-'));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)] font-mono', r.costCode || '-'));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', r.totalHours.toFixed(1)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', r.totalUnits.toFixed(1)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(r.costPerUnit)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', r.hoursPerUnit.toFixed(2)));

        const effCls = r.efficiencyPct >= 100
          ? 'px-4 py-3 text-sm text-right font-mono font-semibold text-emerald-600'
          : r.efficiencyPct >= 80
            ? 'px-4 py-3 text-sm text-right font-mono text-amber-600'
            : 'px-4 py-3 text-sm text-right font-mono text-red-600';
        tr.appendChild(el('td', effCls, fmtPct(r.efficiencyPct)));

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)] text-right font-mono', r.benchmark ? r.benchmark.toFixed(2) : '-'));

        const variance = r.variance ?? 0;
        const varCls = variance <= 0
          ? 'px-4 py-3 text-sm text-right font-mono text-emerald-600'
          : 'px-4 py-3 text-sm text-right font-mono text-red-600';
        tr.appendChild(el('td', varCls, variance ? variance.toFixed(2) : '-'));

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

        const filters: { period?: string; jobId?: string } = {};
        if (periodInput.value.trim()) filters.period = periodInput.value.trim();
        if (jobInput.value.trim()) filters.jobId = jobInput.value.trim();

        const rows = await svc().listLaborProductivity(filters);
        badge.textContent = String(rows.length);
        loadingEl.style.display = 'none';
        tableContainer.appendChild(buildTable(rows));
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load labor data', false);
        tableContainer.appendChild(buildTable([]));
      }
    }

    filterBtn.addEventListener('click', () => void loadData());
    void loadData();
  },
};
