/**
 * Chart of Accounts list view.
 * Displays a filterable, sortable table of accounts with hierarchy indentation.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Types used by this view
// ---------------------------------------------------------------------------

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'costOfRevenue';

interface AccountRow {
  id: string;
  number: string;
  name: string;
  type: AccountType;
  normalBalance: 'debit' | 'credit';
  isActive: boolean;
  depth: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCOUNT_TYPES: AccountType[] = [
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense',
  'costOfRevenue',
];

const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
  costOfRevenue: 'Cost of Revenue',
};

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(onFilter: (type: string, active: string) => void): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  // Type dropdown
  const typeSelect = el('select', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLSelectElement;
  const allOpt = el('option', '', 'All Types') as HTMLOptionElement;
  allOpt.value = '';
  typeSelect.appendChild(allOpt);
  for (const t of ACCOUNT_TYPES) {
    const opt = el('option', '', TYPE_LABELS[t]) as HTMLOptionElement;
    opt.value = t;
    typeSelect.appendChild(opt);
  }
  bar.appendChild(typeSelect);

  // Active / inactive toggle
  const activeSelect = el('select', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLSelectElement;
  for (const [val, label] of [['', 'All'], ['active', 'Active Only'], ['inactive', 'Inactive Only']]) {
    const opt = el('option', '', label) as HTMLOptionElement;
    opt.value = val;
    activeSelect.appendChild(opt);
  }
  bar.appendChild(activeSelect);

  // Wire events
  typeSelect.addEventListener('change', () => onFilter(typeSelect.value, activeSelect.value));
  activeSelect.addEventListener('change', () => onFilter(typeSelect.value, activeSelect.value));

  return bar;
}

// ---------------------------------------------------------------------------
// Accounts Table
// ---------------------------------------------------------------------------

function buildTable(accounts: AccountRow[]): HTMLElement {
  const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  // thead
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Number', 'Name', 'Type', 'Normal Balance', 'Active', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = el('tbody');
  tbody.setAttribute('data-role', 'account-rows');

  if (accounts.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No accounts found. Create your first account to get started.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const acct of accounts) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    // Number
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', acct.number));

    // Name (indented by depth)
    const tdName = el('td', 'py-2 px-3 text-[var(--text)]');
    const indent = el('span');
    indent.style.paddingLeft = `${acct.depth * 1.25}rem`;
    indent.textContent = acct.name;
    tdName.appendChild(indent);
    tr.appendChild(tdName);

    // Type
    tr.appendChild(el('td', 'py-2 px-3', TYPE_LABELS[acct.type] ?? acct.type));

    // Normal Balance
    const nbText = acct.normalBalance === 'debit' ? 'Debit' : 'Credit';
    tr.appendChild(el('td', 'py-2 px-3', nbText));

    // Active badge
    const tdActive = el('td', 'py-2 px-3');
    const activeBadge = el(
      'span',
      acct.isActive
        ? 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20',
      acct.isActive ? 'Active' : 'Inactive',
    );
    tdActive.appendChild(activeBadge);
    tr.appendChild(tdActive);

    // Actions
    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/gl/accounts/${acct.id}`;
    tdActions.appendChild(editLink);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Chart of Accounts'));

    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/gl/accounts/new';
    newBtn.textContent = 'New Account';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Filter bar (no-op handler — service wiring happens later)
    wrapper.appendChild(buildFilterBar((_type, _active) => { /* filter handler placeholder */ }));

    // Table (empty — service populates later)
    const accounts: AccountRow[] = [];
    wrapper.appendChild(buildTable(accounts));

    container.appendChild(wrapper);
  },
};
