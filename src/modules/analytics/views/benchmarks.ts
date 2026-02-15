/**
 * Benchmark Comparisons view.
 * Shows metric name, category, company value vs industry avg/median,
 * percentile rank, sample size, source. Color-code above/below avg.
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

const CATEGORIES = ['financial', 'job_cost', 'labor', 'equipment', 'safety', 'vendor', 'hr', 'custom'] as const;

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const header = el('div', 'flex items-center justify-between mb-6');
    const titleRow = el('div', 'flex items-center gap-3');
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Benchmark Comparisons'));
    const badge = el('span', 'px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleRow.appendChild(badge);
    header.appendChild(titleRow);
    wrapper.appendChild(header);

    // Category filter
    const filterRow = el('div', 'flex flex-wrap items-center gap-3 mb-6');
    filterRow.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Category:'));
    const catSelect = el('select', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLSelectElement;
    const allOpt = el('option', '', 'All Categories') as HTMLOptionElement;
    allOpt.value = '';
    catSelect.appendChild(allOpt);
    for (const cat of CATEGORIES) {
      const opt = el('option', '', cat.replace('_', ' ')) as HTMLOptionElement;
      opt.value = cat;
      catSelect.appendChild(opt);
    }
    filterRow.appendChild(catSelect);
    wrapper.appendChild(filterRow);

    // Loading
    const loadingEl = el('div', 'text-center py-12 text-[var(--text-muted)]', 'Loading benchmarks...');
    wrapper.appendChild(loadingEl);

    // Table container
    const tableContainer = el('div', '');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    function buildTable(benchmarks: any[]): HTMLElement {
      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      const cols = ['Metric', 'Category', 'Company Value', 'Industry Avg', 'Industry Median', 'Percentile', 'Sample Size', 'Source'];
      for (const col of cols) {
        const thCls = ['Company Value', 'Industry Avg', 'Industry Median', 'Percentile', 'Sample Size'].includes(col)
          ? 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
          : 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-left';
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (benchmarks.length === 0) {
        const tr = el('tr');
        const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No benchmark data found.');
        td.setAttribute('colspan', String(cols.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const b of benchmarks) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

        tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', b.metricName));

        const catTd = el('td', 'px-4 py-3 text-sm');
        const catBadge = el('span', 'px-2 py-0.5 text-xs rounded bg-[var(--surface)] text-[var(--text-muted)]', b.category.replace('_', ' '));
        catTd.appendChild(catBadge);
        tr.appendChild(catTd);

        // Color-code company value vs industry avg
        const aboveAvg = b.companyValue >= b.industryAvg;
        const companyCls = aboveAvg
          ? 'px-4 py-3 text-sm text-right font-mono font-semibold text-emerald-600'
          : 'px-4 py-3 text-sm text-right font-mono font-semibold text-red-600';
        tr.appendChild(el('td', companyCls, b.companyValue.toFixed(2)));

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', b.industryAvg.toFixed(2)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', b.industryMedian.toFixed(2)));

        const pctRankCls = b.percentileRank >= 75
          ? 'px-4 py-3 text-sm text-right font-mono font-semibold text-emerald-600'
          : b.percentileRank >= 50
            ? 'px-4 py-3 text-sm text-right font-mono text-amber-600'
            : 'px-4 py-3 text-sm text-right font-mono text-red-600';
        const pctTd = el('td', pctRankCls);
        pctTd.textContent = `P${b.percentileRank}`;
        tr.appendChild(pctTd);

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)] text-right font-mono', String(b.sampleSize)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', b.source || '-'));

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

        const category = catSelect.value || undefined;
        const benchmarks = await svc().listBenchmarks(category as any);
        badge.textContent = String(benchmarks.length);
        loadingEl.style.display = 'none';
        tableContainer.appendChild(buildTable(benchmarks));
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load benchmarks', false);
        tableContainer.appendChild(buildTable([]));
      }
    }

    catSelect.addEventListener('change', () => void loadData());
    void loadData();
  },
};
