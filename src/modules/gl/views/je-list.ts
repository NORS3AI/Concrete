/**
 * Journal Entries list view.
 * Filterable table of journal entries with status badges.
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
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  posted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  voided: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'posted', label: 'Posted' },
  { value: 'voided', label: 'Voided' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JERow {
  id: string;
  number: string;
  date: string;
  description: string;
  reference?: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, startDate: string, endDate: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  // Status dropdown
  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  // Start date
  const startLabel = el('label', 'text-sm text-[var(--text-muted)]', 'From');
  bar.appendChild(startLabel);
  const startInput = el('input', inputCls) as HTMLInputElement;
  startInput.type = 'date';
  startInput.name = 'startDate';
  bar.appendChild(startInput);

  // End date
  const endLabel = el('label', 'text-sm text-[var(--text-muted)]', 'To');
  bar.appendChild(endLabel);
  const endInput = el('input', inputCls) as HTMLInputElement;
  endInput.type = 'date';
  endInput.name = 'endDate';
  bar.appendChild(endInput);

  // Wire events
  const fire = () => onFilter(statusSelect.value, startInput.value, endInput.value);
  statusSelect.addEventListener('change', fire);
  startInput.addEventListener('change', fire);
  endInput.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(entries: JERow[]): HTMLElement {
  const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  // thead
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Entry #', 'Date', 'Description', 'Reference', 'Debit', 'Credit', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = el('tbody');
  tbody.setAttribute('data-role', 'je-rows');

  if (entries.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No journal entries found.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const entry of entries) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    // Entry #
    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', entry.number) as HTMLAnchorElement;
    link.href = `#/gl/journal/${entry.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    // Date
    tr.appendChild(el('td', 'py-2 px-3', fmtDate(entry.date)));

    // Description
    tr.appendChild(el('td', 'py-2 px-3 truncate max-w-[200px]', entry.description));

    // Reference
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', entry.reference ?? ''));

    // Debit
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(entry.totalDebit)));

    // Credit
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(entry.totalCredit)));

    // Status badge
    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[entry.status] ?? STATUS_BADGE.draft}`,
      entry.status.charAt(0).toUpperCase() + entry.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    // Actions
    const tdActions = el('td', 'py-2 px-3');
    const viewLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'View') as HTMLAnchorElement;
    viewLink.href = `#/gl/journal/${entry.id}`;
    tdActions.appendChild(viewLink);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Journal Entries'));

    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/gl/journal/new';
    newBtn.textContent = 'New Entry';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Filter bar
    wrapper.appendChild(buildFilterBar((_status, _start, _end) => { /* filter placeholder */ }));

    // Table (empty shell)
    const entries: JERow[] = [];
    wrapper.appendChild(buildTable(entries));

    container.appendChild(wrapper);
  },
};
