/**
 * Currency Translation Rates view.
 * Table of currency translation rates with entity filter.
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

const fmtDate = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RATE_TYPE_LABELS: Record<string, string> = {
  current: 'Current',
  average: 'Average',
  historical: 'Historical',
};

const COLUMNS = [
  'Entity', 'From Currency', 'To Currency', 'Rate',
  'Rate Type', 'Effective Date', 'Notes',
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Currency Translation Rates'));
    const badge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    badge.setAttribute('data-role', 'count-badge');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Filter bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const entityInput = document.createElement('input');
    entityInput.type = 'text';
    entityInput.placeholder = 'Filter by entity ID...';
    entityInput.className = inputCls;
    bar.appendChild(entityInput);

    wrapper.appendChild(bar);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading currency rates...');
    wrapper.appendChild(loading);

    // Table container
    const tableContainer = el('div');
    tableContainer.style.display = 'none';
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // Data load
    const loadData = async () => {
      try {
        const entityId = entityInput.value.trim() || undefined;
        const data = await svc().listTranslationRates(entityId);

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
          const align = col === 'Rate'
            ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // tbody
        const tbody = el('tbody');
        if (data.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No currency translation rates found.');
          td.setAttribute('colspan', String(COLUMNS.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const rate of data) {
          const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'py-2 px-3', rate.entityName || rate.entityId));
          tr.appendChild(el('td', 'py-2 px-3 font-mono', rate.fromCurrency));
          tr.appendChild(el('td', 'py-2 px-3 font-mono', rate.toCurrency));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', rate.rate.toFixed(6)));

          // Rate type badge
          const tdType = el('td', 'py-2 px-3');
          const typeBadge = el(
            'span',
            'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20',
            RATE_TYPE_LABELS[rate.rateType] ?? rate.rateType,
          );
          tdType.appendChild(typeBadge);
          tr.appendChild(tdType);

          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtDate(rate.effectiveDate)));
          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[200px]', rate.notes ?? ''));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        tableWrap.appendChild(table);
        tableContainer.appendChild(tableWrap);
      } catch (err: any) {
        loading.style.display = 'none';
        tableContainer.style.display = '';
        showMsg(wrapper, `Failed to load currency rates: ${err.message}`, false);
      }
    };

    // Wire filter events
    entityInput.addEventListener('input', loadData);

    loadData();
  },
};
