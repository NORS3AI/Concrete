/**
 * Consolidated Trial Balance view.
 * Period-selectable trial balance with entity, elimination, and consolidated columns.
 * Includes totals row at bottom.
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

const COLUMNS = [
  'Account #', 'Account Name', 'Entity',
  'Debit', 'Credit',
  'Elim Debit', 'Elim Credit',
  'Consol Debit', 'Consol Credit',
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Consolidated Trial Balance'));
    const badge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    badge.setAttribute('data-role', 'count-badge');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Period selector
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

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
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Enter a period and click Load to view the trial balance.');
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

      loading.textContent = 'Loading trial balance...';
      loading.style.display = '';
      tableContainer.style.display = 'none';

      try {
        const data = await svc().getTrialBalance(period);

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
          const align = ['Debit', 'Credit', 'Elim Debit', 'Elim Credit', 'Consol Debit', 'Consol Credit'].includes(col)
            ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // tbody
        const tbody = el('tbody');
        if (data.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No trial balance data found for this period.');
          td.setAttribute('colspan', String(COLUMNS.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        // Accumulate totals
        let totDebit = 0, totCredit = 0, totElimDebit = 0, totElimCredit = 0, totConsolDebit = 0, totConsolCredit = 0;

        for (const line of data) {
          const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', line.accountNumber));
          tr.appendChild(el('td', 'py-2 px-3', line.accountName));
          tr.appendChild(el('td', 'py-2 px-3', line.entityName || line.entityId));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.debitBalance)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.creditBalance)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(line.eliminationDebit)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(line.eliminationCredit)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(line.consolidatedDebit)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(line.consolidatedCredit)));

          totDebit += line.debitBalance;
          totCredit += line.creditBalance;
          totElimDebit += line.eliminationDebit;
          totElimCredit += line.eliminationCredit;
          totConsolDebit += line.consolidatedDebit;
          totConsolCredit += line.consolidatedCredit;

          tbody.appendChild(tr);
        }

        // Totals row
        if (data.length > 0) {
          const totRow = el('tr', 'border-t-2 border-[var(--border)] bg-[var(--surface)] font-bold');
          totRow.appendChild(el('td', 'py-2 px-3', ''));
          totRow.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', 'Totals'));
          totRow.appendChild(el('td', 'py-2 px-3', ''));
          totRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totDebit)));
          totRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totCredit)));
          totRow.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(totElimDebit)));
          totRow.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(totElimCredit)));
          totRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totConsolDebit)));
          totRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totConsolCredit)));
          tbody.appendChild(totRow);
        }

        table.appendChild(tbody);
        tableWrap.appendChild(table);
        tableContainer.appendChild(tableWrap);
      } catch (err: any) {
        loading.style.display = 'none';
        tableContainer.style.display = '';
        showMsg(wrapper, `Failed to load trial balance: ${err.message}`, false);
      }
    };

    loadBtn.addEventListener('click', loadData);
    periodInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loadData();
    });
  },
};
