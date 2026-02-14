/**
 * Transfer Pricing Rules view.
 * Table of transfer pricing rules showing method, markup, effective dates, and active status.
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

const fmtPct = (n: number): string => `${n.toFixed(2)}%`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const METHOD_LABELS: Record<string, string> = {
  cost_plus: 'Cost Plus',
  market_rate: 'Market Rate',
  fixed_rate: 'Fixed Rate',
};

const COLUMNS = [
  'Name', 'From Entity', 'To Entity', 'Service Type', 'Method',
  'Markup %', 'Fixed Rate', 'Effective Date', 'End Date', 'Active',
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Transfer Pricing Rules'));
    const badge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    badge.setAttribute('data-role', 'count-badge');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading transfer pricing rules...');
    wrapper.appendChild(loading);

    // Table container
    const tableContainer = el('div');
    tableContainer.style.display = 'none';
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // Data load
    const loadData = async () => {
      try {
        const data = await svc().listTransferPricingRules();

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
          const align = ['Markup %', 'Fixed Rate'].includes(col)
            ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // tbody
        const tbody = el('tbody');
        if (data.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No transfer pricing rules found.');
          td.setAttribute('colspan', String(COLUMNS.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const rule of data) {
          const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', rule.name));
          tr.appendChild(el('td', 'py-2 px-3', rule.fromEntityId));
          tr.appendChild(el('td', 'py-2 px-3', rule.toEntityId));
          tr.appendChild(el('td', 'py-2 px-3', rule.serviceType));
          tr.appendChild(el('td', 'py-2 px-3', METHOD_LABELS[rule.method] ?? rule.method));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', rule.markupPct ? fmtPct(rule.markupPct) : '--'));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', rule.fixedRate ? fmtCurrency(rule.fixedRate) : '--'));
          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtDate(rule.effectiveDate)));
          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rule.endDate ? fmtDate(rule.endDate) : '--'));

          // Active status
          const tdActive = el('td', 'py-2 px-3');
          const activeBadge = el(
            'span',
            `px-2 py-0.5 rounded-full text-xs font-medium ${rule.active
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`,
            rule.active ? 'Active' : 'Inactive',
          );
          tdActive.appendChild(activeBadge);
          tr.appendChild(tdActive);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        tableWrap.appendChild(table);
        tableContainer.appendChild(tableWrap);
      } catch (err: any) {
        loading.style.display = 'none';
        tableContainer.style.display = '';
        showMsg(wrapper, `Failed to load transfer pricing rules: ${err.message}`, false);
      }
    };

    loadData();
  },
};
