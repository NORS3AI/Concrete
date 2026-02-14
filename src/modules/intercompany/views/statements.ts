/**
 * Consolidated Financial Statements view.
 * Statement type selector (income/balance_sheet/cash_flow), period,
 * line items with entity amounts, elimination amounts, consolidated amounts, minority interest.
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATEMENT_TYPES = [
  { value: 'income', label: 'Income Statement' },
  { value: 'balance_sheet', label: 'Balance Sheet' },
  { value: 'cash_flow', label: 'Cash Flow Statement' },
];

const COLUMNS = [
  'Line Item', 'Entity Amounts', 'Elimination Amount',
  'Consolidated Amount', 'Minority Interest',
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Consolidated Financial Statements'));
    const badge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    badge.setAttribute('data-role', 'count-badge');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Selector bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    bar.appendChild(el('label', 'text-sm text-[var(--text-muted)]', 'Statement:'));
    const typeSelect = document.createElement('select');
    typeSelect.className = inputCls;
    for (const opt of STATEMENT_TYPES) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      typeSelect.appendChild(o);
    }
    bar.appendChild(typeSelect);

    bar.appendChild(el('label', 'text-sm text-[var(--text-muted)]', 'Period:'));
    const periodInput = document.createElement('input');
    periodInput.type = 'text';
    periodInput.placeholder = 'e.g. 2025-01';
    periodInput.className = inputCls;
    bar.appendChild(periodInput);

    const loadBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Load');
    bar.appendChild(loadBtn);

    wrapper.appendChild(bar);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Select a statement type and period, then click Load.');
    wrapper.appendChild(loading);

    // Table container
    const tableContainer = el('div');
    tableContainer.style.display = 'none';
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // Data load
    const loadData = async () => {
      const statementType = typeSelect.value;
      const period = periodInput.value.trim();
      if (!period) {
        showMsg(wrapper, 'Please enter a period.', false);
        return;
      }

      loading.textContent = 'Loading statement...';
      loading.style.display = '';
      tableContainer.style.display = 'none';

      try {
        const data = await svc().getStatement(statementType, period);

        badge.textContent = String(data.length);
        loading.style.display = 'none';
        tableContainer.style.display = '';
        tableContainer.innerHTML = '';

        // Statement title
        const stmtLabel = STATEMENT_TYPES.find(s => s.value === statementType)?.label ?? statementType;
        const stmtTitle = el('div', 'mb-3');
        stmtTitle.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)]', `${stmtLabel} - ${period}`));
        tableContainer.appendChild(stmtTitle);

        const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // thead
        const thead = el('thead');
        const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
        for (const col of COLUMNS) {
          const align = ['Entity Amounts', 'Elimination Amount', 'Consolidated Amount', 'Minority Interest'].includes(col)
            ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // tbody
        const tbody = el('tbody');
        if (data.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No statement data found for this selection.');
          td.setAttribute('colspan', String(COLUMNS.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const line of data) {
          const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', line.lineItem));

          // Entity amounts is stored as a JSON string; display as-is or parsed
          let entityAmountsDisplay = '';
          try {
            const parsed = JSON.parse(line.entityAmounts);
            if (typeof parsed === 'object' && parsed !== null) {
              entityAmountsDisplay = Object.entries(parsed)
                .map(([entity, amt]) => `${entity}: ${fmtCurrency(Number(amt))}`)
                .join(', ');
            } else {
              entityAmountsDisplay = String(line.entityAmounts);
            }
          } catch {
            entityAmountsDisplay = String(line.entityAmounts);
          }
          tr.appendChild(el('td', 'py-2 px-3 text-right text-xs font-mono text-[var(--text-muted)]', entityAmountsDisplay));

          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.eliminationAmount)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(line.consolidatedAmount)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(line.minorityInterest)));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        tableWrap.appendChild(table);
        tableContainer.appendChild(tableWrap);
      } catch (err: any) {
        loading.style.display = 'none';
        tableContainer.style.display = '';
        showMsg(wrapper, `Failed to load statement: ${err.message}`, false);
      }
    };

    loadBtn.addEventListener('click', loadData);
    periodInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loadData();
    });
  },
};
