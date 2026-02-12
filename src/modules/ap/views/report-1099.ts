/**
 * 1099 Reporting view.
 * List of vendors subject to 1099 reporting with year-to-date amounts.
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

const FORM_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'NEC', label: '1099-NEC' },
  { value: 'MISC', label: '1099-MISC' },
  { value: 'INT', label: '1099-INT' },
];

const THRESHOLD_BADGE: Record<string, string> = {
  above: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  below: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Report1099Row {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  taxId: string;
  form1099Type: string;
  ytdAmount: number;
  threshold: number;
  thresholdStatus: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  w9OnFile: boolean;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (formType: string, year: string, search: string, aboveThresholdOnly: boolean) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search vendors...';
  bar.appendChild(searchInput);

  const formTypeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of FORM_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    formTypeSelect.appendChild(o);
  }
  bar.appendChild(formTypeSelect);

  const yearLabel = el('span', 'text-sm text-[var(--text-muted)]', 'Tax Year:');
  bar.appendChild(yearLabel);
  const yearInput = el('input', inputCls) as HTMLInputElement;
  yearInput.type = 'number';
  yearInput.value = String(new Date().getFullYear());
  yearInput.min = '2000';
  yearInput.max = '2099';
  yearInput.style.width = '80px';
  bar.appendChild(yearInput);

  const thresholdWrap = el('div', 'flex items-center gap-2');
  const thresholdCheck = el('input', 'rounded border-[var(--border)]') as HTMLInputElement;
  thresholdCheck.type = 'checkbox';
  thresholdCheck.name = 'aboveThreshold';
  thresholdWrap.appendChild(thresholdCheck);
  thresholdWrap.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Above threshold only'));
  bar.appendChild(thresholdWrap);

  const fire = () => onFilter(formTypeSelect.value, yearInput.value, searchInput.value, thresholdCheck.checked);
  formTypeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);
  yearInput.addEventListener('change', fire);
  thresholdCheck.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const buildCard = (label: string, value: string, subtext?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', 'text-xl font-bold text-[var(--text)]', value));
    if (subtext) card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', subtext));
    return card;
  };

  row.appendChild(buildCard('1099 Vendors', '0', 'Total vendors subject to 1099'));
  row.appendChild(buildCard('Above Threshold', '0', 'Vendors exceeding reporting threshold'));
  row.appendChild(buildCard('Total 1099 Amount', fmtCurrency(0), 'Year-to-date total'));
  row.appendChild(buildCard('Missing W-9', '0', 'Vendors without W-9 on file'));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: Report1099Row[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Code', 'Vendor', 'Tax ID', 'Form Type', 'YTD Amount', 'Threshold', 'Status', 'W-9', 'Address', 'Actions']) {
    const align = ['YTD Amount', 'Threshold'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No 1099 vendors found. Mark vendors as subject to 1099 reporting in vendor setup.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', row.vendorCode));

    const tdName = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.vendorName) as HTMLAnchorElement;
    link.href = `#/ap/vendors/${row.vendorId}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', row.taxId));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.form1099Type));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(row.ytdAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.threshold)));

    const tdStatus = el('td', 'py-2 px-3');
    const badgeCls = THRESHOLD_BADGE[row.thresholdStatus] ?? THRESHOLD_BADGE.below;
    const statusLabel = row.thresholdStatus === 'above' ? 'Above' : row.thresholdStatus === 'warning' ? 'Near' : 'Below';
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`, statusLabel));
    tr.appendChild(tdStatus);

    const tdW9 = el('td', 'py-2 px-3');
    if (row.w9OnFile) {
      tdW9.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Yes'));
    } else {
      tdW9.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20', 'Missing'));
    }
    tr.appendChild(tdW9);

    const addressParts = [row.address, row.city, row.state, row.zip].filter(Boolean);
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', addressParts.join(', ')));

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/ap/vendors/${row.vendorId}`;
    tdActions.appendChild(editLink);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', '1099 Report'));
    const btnGroup = el('div', 'flex items-center gap-2');
    const generateBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate 1099s');
    generateBtn.type = 'button';
    generateBtn.addEventListener('click', () => { /* generate placeholder */ });
    btnGroup.appendChild(generateBtn);
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    btnGroup.appendChild(exportBtn);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());
    wrapper.appendChild(buildFilterBar((_formType, _year, _search, _aboveOnly) => { /* filter placeholder */ }));

    const rows: Report1099Row[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
