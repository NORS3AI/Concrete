/**
 * Tax Filings view.
 * Management of quarterly tax filings (941, 940, state quarterly) with
 * summary cards and filing status tracking.
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

const FILING_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: '941', label: 'Form 941' },
  { value: '940', label: 'Form 940' },
  { value: 'w2', label: 'W-2' },
  { value: 'state_quarterly', label: 'State Quarterly' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'filed', label: 'Filed' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  filed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaxFilingRow {
  id: string;
  type: string;
  period: string;
  year: number;
  quarter: number;
  status: string;
  totalWages: number;
  totalTax: number;
  dueDate: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (type: string, status: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of FILING_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const yearInput = el('input', inputCls) as HTMLInputElement;
  yearInput.type = 'number';
  yearInput.placeholder = 'Year';
  yearInput.min = '2020';
  yearInput.max = '2030';
  bar.appendChild(yearInput);

  const fire = () => onFilter(typeSelect.value, statusSelect.value);
  typeSelect.addEventListener('change', fire);
  statusSelect.addEventListener('change', fire);
  yearInput.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Quarterly Summary
// ---------------------------------------------------------------------------

function buildQuarterlySummary(): HTMLElement {
  const grid = el('div', 'grid grid-cols-4 gap-4 mb-6');

  for (let q = 1; q <= 4; q++) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', `Q${q}`));
    card.appendChild(el('div', 'text-sm font-medium text-[var(--text)]', 'Wages: $0.00'));
    card.appendChild(el('div', 'text-sm font-medium text-[var(--text)]', 'Tax: $0.00'));
    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(filings: TaxFilingRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Type', 'Period', 'Year', 'Quarter', 'Status', 'Total Wages', 'Total Tax', 'Due Date', 'Actions']) {
    const align = ['Total Wages', 'Total Tax'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (filings.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No tax filings found.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const filing of filings) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const typeLabel = filing.type === '941' ? 'Form 941' : filing.type === '940' ? 'Form 940' : filing.type === 'w2' ? 'W-2' : 'State Quarterly';
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', typeLabel));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', filing.period));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', String(filing.year)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', filing.quarter ? `Q${filing.quarter}` : '-'));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[filing.status] ?? STATUS_BADGE.draft}`,
      filing.status.charAt(0).toUpperCase() + filing.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(filing.totalWages)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(filing.totalTax)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', filing.dueDate || '-'));

    const tdActions = el('td', 'py-2 px-3');
    if (filing.status === 'draft') {
      const fileBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Mark Filed');
      fileBtn.addEventListener('click', () => { /* mark filed placeholder */ });
      tdActions.appendChild(fileBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Tax Filings'));

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Filing');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* new filing placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildQuarterlySummary());
    wrapper.appendChild(buildFilterBar((_type, _status) => { /* filter placeholder */ }));

    const filings: TaxFilingRow[] = [];
    wrapper.appendChild(buildTable(filings));

    container.appendChild(wrapper);
  },
};
