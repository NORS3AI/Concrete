/**
 * Segment Reports view.
 * Table of segment reports with period and type filters.
 */

import { getIntercompanyService } from '../service-accessor';

const svc = () => getIntercompanyService();

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

const fmtNumber = (n: number) =>
  new Intl.NumberFormat('en-US').format(n);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEGMENT_TYPE_LABELS: Record<string, string> = {
  division: 'Division',
  region: 'Region',
  product_line: 'Product Line',
  custom: 'Custom',
};

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'division', label: 'Division' },
  { value: 'region', label: 'Region' },
  { value: 'product_line', label: 'Product Line' },
  { value: 'custom', label: 'Custom' },
];

const COLUMNS = [
  'Period', 'Segment Name', 'Type', 'Revenue', 'Expenses',
  'Operating Income', 'Assets', 'Liabilities', 'Headcount',
];

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', 'p-6 space-y-0');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Segment Reports'));
    const badge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    badge.setAttribute('data-role', 'count-badge');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Filter bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    bar.appendChild(el('label', 'text-sm text-[var(--text-muted)]', 'Period:'));
    const periodInput = document.createElement('input');
    periodInput.type = 'text';
    periodInput.placeholder = 'e.g. 2025-01';
    periodInput.className = inputCls;
    bar.appendChild(periodInput);

    const typeSelect = document.createElement('select');
    typeSelect.className = inputCls;
    for (const opt of TYPE_OPTIONS) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      typeSelect.appendChild(o);
    }
    bar.appendChild(typeSelect);

    const loadBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Load');
    bar.appendChild(loadBtn);

    wrapper.appendChild(bar);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Enter a period and click Load to view segment reports.');
    wrapper.appendChild(loading);

    // Table container
    const tableContainer = el('div');
    tableContainer.style.display = 'none';
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // Data load
    const loadData = async () => {
      const period = periodInput.value.trim();
      if (!period) {
        showMsg(wrapper, 'Please enter a period.', false);
        return;
      }

      loading.textContent = 'Loading segment reports...';
      loading.style.display = '';
      tableContainer.style.display = 'none';

      try {
        let data = await svc().getSegmentReports(period);

        // Client-side type filter
        const typeFilter = typeSelect.value;
        if (typeFilter) {
          data = data.filter(s => s.segmentType === typeFilter);
        }

        badge.textContent = String(data.length);
        loading.style.display = 'none';
        tableContainer.style.display = '';
        tableContainer.innerHTML = '';

        const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // thead
        const thead = el('thead');
        const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
        for (const col of COLUMNS) {
          const align = ['Revenue', 'Expenses', 'Operating Income', 'Assets', 'Liabilities', 'Headcount'].includes(col)
            ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // tbody
        const tbody = el('tbody');
        if (data.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No segment reports found for this selection.');
          td.setAttribute('colspan', String(COLUMNS.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const seg of data) {
          const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'py-2 px-3', seg.period));
          tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', seg.segmentName));

          // Type badge
          const tdType = el('td', 'py-2 px-3');
          const typeBadge = el(
            'span',
            'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20',
            SEGMENT_TYPE_LABELS[seg.segmentType] ?? seg.segmentType,
          );
          tdType.appendChild(typeBadge);
          tr.appendChild(tdType);

          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(seg.revenue)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(seg.expenses)));

          // Operating income - color based on positive/negative
          const oiColor = seg.operatingIncome >= 0 ? 'text-emerald-400' : 'text-red-400';
          tr.appendChild(el('td', `py-2 px-3 text-right font-mono font-medium ${oiColor}`, fmtCurrency(seg.operatingIncome)));

          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(seg.assets)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(seg.liabilities)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtNumber(seg.headcount)));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        tableWrap.appendChild(table);
        tableContainer.appendChild(tableWrap);
      } catch (err: any) {
        loading.style.display = 'none';
        tableContainer.style.display = '';
        showMsg(wrapper, `Failed to load segment reports: ${err.message}`, false);
      }
    };

    loadBtn.addEventListener('click', loadData);
    periodInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loadData();
    });
  },
};
