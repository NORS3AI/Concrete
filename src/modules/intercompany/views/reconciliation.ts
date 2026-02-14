/**
 * IC Reconciliation view.
 * Table of intercompany reconciliation entries with period filter,
 * mark reconciled action, and color-coded differences.
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
  'Period', 'Entity 1', 'Entity 2', 'Entity 1 Balance', 'Entity 2 Balance',
  'Difference', 'Reconciled', 'Actions',
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'IC Reconciliation'));
    const badge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    badge.setAttribute('data-role', 'count-badge');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Filter bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const periodInput = document.createElement('input');
    periodInput.type = 'text';
    periodInput.placeholder = 'Filter by period (e.g. 2025-01)...';
    periodInput.className = inputCls;
    bar.appendChild(periodInput);

    wrapper.appendChild(bar);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading reconciliations...');
    wrapper.appendChild(loading);

    // Table container
    const tableContainer = el('div');
    tableContainer.style.display = 'none';
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // Data load
    const loadData = async () => {
      try {
        const period = periodInput.value.trim() || undefined;
        const data = await svc().listReconciliations(period);

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
          const align = ['Entity 1 Balance', 'Entity 2 Balance', 'Difference'].includes(col)
            ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // tbody
        const tbody = el('tbody');
        if (data.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No reconciliation entries found.');
          td.setAttribute('colspan', String(COLUMNS.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const rec of data) {
          const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'py-2 px-3', rec.period));
          tr.appendChild(el('td', 'py-2 px-3', rec.entity1Name || rec.entity1Id));
          tr.appendChild(el('td', 'py-2 px-3', rec.entity2Name || rec.entity2Id));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(rec.entity1Balance)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(rec.entity2Balance)));

          // Difference - color-coded: 0 = emerald, non-zero = red
          const diffColor = rec.difference === 0
            ? 'text-emerald-400' : 'text-red-400';
          tr.appendChild(el('td', `py-2 px-3 text-right font-mono font-medium ${diffColor}`, fmtCurrency(rec.difference)));

          // Reconciled status
          const tdRecon = el('td', 'py-2 px-3');
          const reconBadge = el(
            'span',
            `px-2 py-0.5 rounded-full text-xs font-medium ${rec.reconciled
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`,
            rec.reconciled ? 'Reconciled' : 'Unreconciled',
          );
          tdRecon.appendChild(reconBadge);
          tr.appendChild(tdRecon);

          // Actions
          const tdActions = el('td', 'py-2 px-3');
          if (!rec.reconciled) {
            const markBtn = el('button', 'px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20', 'Mark Reconciled');
            markBtn.addEventListener('click', async () => {
              try {
                await svc().markReconciled((rec as any).id);
                showMsg(wrapper, `Reconciliation marked as reconciled.`);
                loadData();
              } catch (err: any) {
                showMsg(wrapper, `Failed: ${err.message}`, false);
              }
            });
            tdActions.appendChild(markBtn);
          }
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        tableWrap.appendChild(table);
        tableContainer.appendChild(tableWrap);
      } catch (err: any) {
        loading.style.display = 'none';
        tableContainer.style.display = '';
        showMsg(wrapper, `Failed to load reconciliations: ${err.message}`, false);
      }
    };

    // Wire filter events
    periodInput.addEventListener('input', loadData);

    loadData();
  },
};
