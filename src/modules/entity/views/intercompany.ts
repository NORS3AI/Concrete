/**
 * Intercompany transaction list view.
 * Filterable table of IC transactions with status, post/eliminate actions.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ICStatus = 'draft' | 'posted' | 'eliminated';

interface ICRow {
  id: string;
  date: string;
  fromEntityName: string;
  toEntityName: string;
  amount: number;
  description: string;
  status: ICStatus;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<ICStatus, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  posted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  eliminated: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (from: string, to: string, status: string, startDate: string, endDate: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  // From entity
  const fromSelect = el('select', inputCls) as HTMLSelectElement;
  fromSelect.setAttribute('data-role', 'filter-from');
  const fromAll = el('option', '', 'All From') as HTMLOptionElement;
  fromAll.value = '';
  fromSelect.appendChild(fromAll);
  bar.appendChild(fromSelect);

  // To entity
  const toSelect = el('select', inputCls) as HTMLSelectElement;
  toSelect.setAttribute('data-role', 'filter-to');
  const toAll = el('option', '', 'All To') as HTMLOptionElement;
  toAll.value = '';
  toSelect.appendChild(toAll);
  bar.appendChild(toSelect);

  // Status
  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const [val, label] of [['', 'All Statuses'], ['draft', 'Draft'], ['posted', 'Posted'], ['eliminated', 'Eliminated']]) {
    const opt = el('option', '', label) as HTMLOptionElement;
    opt.value = val;
    statusSelect.appendChild(opt);
  }
  bar.appendChild(statusSelect);

  // Date range
  const startLabel = el('label', 'text-sm text-[var(--text-muted)]', 'From');
  bar.appendChild(startLabel);
  const startInput = el('input', inputCls) as HTMLInputElement;
  startInput.type = 'date';
  bar.appendChild(startInput);

  const endLabel = el('label', 'text-sm text-[var(--text-muted)]', 'To');
  bar.appendChild(endLabel);
  const endInput = el('input', inputCls) as HTMLInputElement;
  endInput.type = 'date';
  bar.appendChild(endInput);

  // Wire events
  const fire = () => onFilter(fromSelect.value, toSelect.value, statusSelect.value, startInput.value, endInput.value);
  fromSelect.addEventListener('change', fire);
  toSelect.addEventListener('change', fire);
  statusSelect.addEventListener('change', fire);
  startInput.addEventListener('change', fire);
  endInput.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: ICRow[]): HTMLElement {
  const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  // thead
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Date', 'From', 'To', 'Amount', 'Description', 'Status', 'Actions']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = el('tbody');
  tbody.setAttribute('data-role', 'ic-rows');

  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No intercompany transactions found.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    // Date
    tr.appendChild(el('td', 'py-2 px-3', fmtDate(row.date)));

    // From
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.fromEntityName));

    // To
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.toEntityName));

    // Amount
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.amount)));

    // Description
    tr.appendChild(el('td', 'py-2 px-3 truncate max-w-[200px] text-[var(--text-muted)]', row.description));

    // Status badge
    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
      row.status.charAt(0).toUpperCase() + row.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    // Actions
    const tdActions = el('td', 'py-2 px-3');
    const actionWrap = el('div', 'flex items-center gap-2');

    if (row.status === 'draft') {
      const postBtn = el('button', 'text-xs text-emerald-400 hover:text-emerald-300', 'Post');
      postBtn.type = 'button';
      postBtn.setAttribute('data-action', 'post');
      postBtn.setAttribute('data-id', row.id);
      postBtn.addEventListener('click', () => { /* post handler placeholder */ });
      actionWrap.appendChild(postBtn);
    }

    if (row.status === 'posted') {
      const elimBtn = el('button', 'text-xs text-blue-400 hover:text-blue-300', 'Eliminate');
      elimBtn.type = 'button';
      elimBtn.setAttribute('data-action', 'eliminate');
      elimBtn.setAttribute('data-id', row.id);
      elimBtn.addEventListener('click', () => { /* eliminate handler placeholder */ });
      actionWrap.appendChild(elimBtn);
    }

    tdActions.appendChild(actionWrap);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  return tableWrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', 'space-y-0');

    // Header row
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Intercompany Transactions'));

    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/entities/intercompany/new';
    newBtn.textContent = 'New Transaction';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Filter bar
    wrapper.appendChild(buildFilterBar((_from, _to, _status, _start, _end) => { /* filter placeholder */ }));

    // Table (empty shell -- service populates later)
    const rows: ICRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
