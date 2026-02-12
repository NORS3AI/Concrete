/**
 * Equipment Usage Log view.
 * Displays equipment usage records with filtering by equipment, job, and date range.
 * Supports posting usage records to jobs.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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

const POSTED_OPTIONS = [
  { value: '', label: 'All Records' },
  { value: 'true', label: 'Posted' },
  { value: 'false', label: 'Unposted' },
];

const POSTED_BADGE: Record<string, string> = {
  true: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  false: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UsageRow {
  id: string;
  equipmentNumber: string;
  jobNumber: string;
  date: string;
  hours: number;
  days: number;
  rate: number;
  amount: number;
  operator: string;
  description: string;
  posted: boolean;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (posted: string, search: string, fromDate: string, toDate: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search usage records...';
  bar.appendChild(searchInput);

  const postedSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of POSTED_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    postedSelect.appendChild(o);
  }
  bar.appendChild(postedSelect);

  const fromLabel = el('span', 'text-sm text-[var(--text-muted)]', 'From:');
  bar.appendChild(fromLabel);
  const fromDate = el('input', inputCls) as HTMLInputElement;
  fromDate.type = 'date';
  bar.appendChild(fromDate);

  const toLabel = el('span', 'text-sm text-[var(--text-muted)]', 'To:');
  bar.appendChild(toLabel);
  const toDate = el('input', inputCls) as HTMLInputElement;
  toDate.type = 'date';
  bar.appendChild(toDate);

  const fire = () => onFilter(postedSelect.value, searchInput.value, fromDate.value, toDate.value);
  postedSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);
  fromDate.addEventListener('change', fire);
  toDate.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: UsageRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Equipment', 'Job', 'Date', 'Hours', 'Days', 'Rate', 'Amount', 'Operator', 'Posted', 'Actions']) {
    const align = ['Rate', 'Amount'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No usage records found. Log equipment usage to get started.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.equipmentNumber));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', row.jobNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.date));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.hours ? String(row.hours) : ''));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.days ? String(row.days) : ''));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.rate ? fmtCurrency(row.rate) : ''));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(row.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.operator));

    const tdPosted = el('td', 'py-2 px-3');
    const postedBadge = el('span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${POSTED_BADGE[String(row.posted)] ?? POSTED_BADGE.false}`,
      row.posted ? 'Posted' : 'Unposted');
    tdPosted.appendChild(postedBadge);
    tr.appendChild(tdPosted);

    const tdActions = el('td', 'py-2 px-3');
    if (!row.posted) {
      const postBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Post');
      postBtn.addEventListener('click', () => { /* post placeholder */ });
      tdActions.appendChild(postBtn);
    }
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment Usage'));
    const postAllBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Post All Unposted');
    postAllBtn.addEventListener('click', () => { /* post all placeholder */ });
    headerRow.appendChild(postAllBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_posted, _search, _from, _to) => { /* filter placeholder */ }));

    const rows: UsageRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
