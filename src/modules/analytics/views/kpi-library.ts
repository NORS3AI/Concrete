/**
 * KPI Library view.
 * KPI definitions list with KPI ID, name, category, formula, unit, target value,
 * thresholds, higher-is-better flag. Filter by category/active. Search.
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
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'KPI Library'));
    const badge = el('span', 'px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleRow.appendChild(badge);
    header.appendChild(titleRow);
    wrapper.appendChild(header);

    // Filters row
    const filterRow = el('div', 'flex flex-wrap items-center gap-3 mb-6');

    // Search
    const searchInput = el('input', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-64') as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search KPIs...';
    filterRow.appendChild(searchInput);

    // Category filter
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

    // Active filter
    const activeSelect = el('select', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLSelectElement;
    for (const [val, label] of [['', 'All Status'], ['true', 'Active'], ['false', 'Inactive']]) {
      const opt = el('option', '', label) as HTMLOptionElement;
      opt.value = val;
      activeSelect.appendChild(opt);
    }
    filterRow.appendChild(activeSelect);

    wrapper.appendChild(filterRow);

    // Loading
    const loadingEl = el('div', 'text-center py-12 text-[var(--text-muted)]', 'Loading KPIs...');
    wrapper.appendChild(loadingEl);

    // Table container
    const tableContainer = el('div', '');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    function buildTable(kpis: any[]): HTMLElement {
      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      const cols = ['KPI ID', 'Name', 'Category', 'Formula', 'Unit', 'Target', 'Warning', 'Critical', 'Higher is Better', 'Active'];
      for (const col of cols) {
        const thCls = ['Target', 'Warning', 'Critical'].includes(col)
          ? 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
          : 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-left';
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (kpis.length === 0) {
        const tr = el('tr');
        const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No KPI definitions found. Define KPIs to populate the library.');
        td.setAttribute('colspan', String(cols.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const k of kpis) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');
        tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-[var(--text-muted)]', k.kpiId));
        tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', k.name));

        const catTd = el('td', 'px-4 py-3 text-sm');
        const catBadge = el('span', 'px-2 py-0.5 text-xs rounded bg-[var(--surface)] text-[var(--text-muted)]', k.category.replace('_', ' '));
        catTd.appendChild(catBadge);
        tr.appendChild(catTd);

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono max-w-[200px] truncate', k.formula));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', k.unit));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', k.targetValue != null ? String(k.targetValue) : '-'));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-amber-600 text-right font-mono', k.warningThreshold != null ? String(k.warningThreshold) : '-'));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-red-600 text-right font-mono', k.criticalThreshold != null ? String(k.criticalThreshold) : '-'));

        const hibTd = el('td', 'px-4 py-3 text-sm');
        const hibBadge = el('span',
          k.higherIsBetter
            ? 'px-2 py-0.5 text-xs rounded bg-emerald-50 text-emerald-700'
            : 'px-2 py-0.5 text-xs rounded bg-red-50 text-red-700',
          k.higherIsBetter ? 'Yes' : 'No');
        hibTd.appendChild(hibBadge);
        tr.appendChild(hibTd);

        const activeTd = el('td', 'px-4 py-3 text-sm');
        const activeBadge = el('span',
          k.active
            ? 'px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700'
            : 'px-2 py-0.5 text-xs rounded-full bg-zinc-100 text-zinc-500',
          k.active ? 'Active' : 'Inactive');
        activeTd.appendChild(activeBadge);
        tr.appendChild(activeTd);

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

        const filters: { category?: any; active?: boolean; search?: string } = {};
        if (catSelect.value) filters.category = catSelect.value;
        if (activeSelect.value !== '') filters.active = activeSelect.value === 'true';
        if (searchInput.value.trim()) filters.search = searchInput.value.trim();

        const kpis = await svc().listKPIs(filters);
        badge.textContent = String(kpis.length);
        loadingEl.style.display = 'none';
        tableContainer.appendChild(buildTable(kpis));
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load KPIs', false);
        tableContainer.appendChild(buildTable([]));
      }
    }

    let debounceTimer: ReturnType<typeof setTimeout>;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => void loadData(), 300);
    });
    catSelect.addEventListener('change', () => void loadData());
    activeSelect.addEventListener('change', () => void loadData());

    void loadData();
  },
};
