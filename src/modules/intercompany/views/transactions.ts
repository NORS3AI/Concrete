/**
 * IC Transactions list view.
 * Filterable table of intercompany transactions with status badges.
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

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  posted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  eliminated: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  reversed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'billing', label: 'Billing' },
  { value: 'loan', label: 'Loan' },
  { value: 'allocation', label: 'Allocation' },
  { value: 'transfer', label: 'Transfer' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'posted', label: 'Posted' },
  { value: 'eliminated', label: 'Eliminated' },
  { value: 'reversed', label: 'Reversed' },
];

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const COLUMNS = [
  'Txn #', 'Type', 'From Entity', 'To Entity', 'Amount', 'Currency',
  'Exch Rate', 'Base Amount', 'Status', 'Date',
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'IC Transactions'));
    const badge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    badge.setAttribute('data-role', 'count-badge');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Filter bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search transactions...';
    searchInput.className = inputCls;
    bar.appendChild(searchInput);

    const typeSelect = document.createElement('select');
    typeSelect.className = inputCls;
    for (const opt of TYPE_OPTIONS) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      typeSelect.appendChild(o);
    }
    bar.appendChild(typeSelect);

    const statusSelect = document.createElement('select');
    statusSelect.className = inputCls;
    for (const opt of STATUS_OPTIONS) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      statusSelect.appendChild(o);
    }
    bar.appendChild(statusSelect);

    const entityInput = document.createElement('input');
    entityInput.type = 'text';
    entityInput.placeholder = 'Filter by entity ID...';
    entityInput.className = inputCls;
    bar.appendChild(entityInput);

    wrapper.appendChild(bar);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading transactions...');
    wrapper.appendChild(loading);

    // Table container
    const tableContainer = el('div');
    tableContainer.style.display = 'none';
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // Data load
    const loadData = async () => {
      try {
        const type = typeSelect.value || undefined;
        const status = statusSelect.value || undefined;
        const entityId = entityInput.value.trim() || undefined;
        const search = searchInput.value.trim() || undefined;
        const data = await svc().listICTransactions({
          type: type as any,
          status: status as any,
          entityId,
          search,
        });

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
          const align = ['Amount', 'Exch Rate', 'Base Amount'].includes(col)
            ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // tbody
        const tbody = el('tbody');
        if (data.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No intercompany transactions found.');
          td.setAttribute('colspan', String(COLUMNS.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const txn of data) {
          const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', txn.transactionNumber));
          tr.appendChild(el('td', 'py-2 px-3', txn.type.charAt(0).toUpperCase() + txn.type.slice(1)));
          tr.appendChild(el('td', 'py-2 px-3', txn.fromEntityName || txn.fromEntityId));
          tr.appendChild(el('td', 'py-2 px-3', txn.toEntityName || txn.toEntityId));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(txn.amount)));
          tr.appendChild(el('td', 'py-2 px-3', txn.currency));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', txn.exchangeRate.toFixed(4)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(txn.baseAmount)));

          // Status badge
          const tdStatus = el('td', 'py-2 px-3');
          const statusBadge = el(
            'span',
            `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[txn.status] ?? STATUS_BADGE.pending}`,
            txn.status.charAt(0).toUpperCase() + txn.status.slice(1),
          );
          tdStatus.appendChild(statusBadge);
          tr.appendChild(tdStatus);

          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtDate(txn.date)));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        tableWrap.appendChild(table);
        tableContainer.appendChild(tableWrap);
      } catch (err: any) {
        loading.style.display = 'none';
        tableContainer.style.display = '';
        showMsg(wrapper, `Failed to load transactions: ${err.message}`, false);
      }
    };

    // Wire filter events
    searchInput.addEventListener('input', loadData);
    typeSelect.addEventListener('change', loadData);
    statusSelect.addEventListener('change', loadData);
    entityInput.addEventListener('input', loadData);

    loadData();
  },
};
