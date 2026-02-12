/**
 * Aging Report view.
 * Renders aged AP and AR reports with current, 30, 60, 90, and 120+ day
 * aging buckets. Supports toggle between AP and AR aging.
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

const TYPE_OPTIONS = [
  { value: 'ap', label: 'Accounts Payable (AP)' },
  { value: 'ar', label: 'Accounts Receivable (AR)' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgingDisplayRow {
  entityName: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days120Plus: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onApply: (type: string, asOfDate: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const asOfLabel = el('label', 'text-sm text-[var(--text-muted)]', 'As of:');
  bar.appendChild(asOfLabel);
  const asOfInput = el('input', inputCls) as HTMLInputElement;
  asOfInput.type = 'date';
  asOfInput.value = new Date().toISOString().split('T')[0];
  bar.appendChild(asOfInput);

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  applyBtn.addEventListener('click', () => {
    onApply(typeSelect.value, asOfInput.value);
  });
  bar.appendChild(applyBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: AgingDisplayRow[], type: string): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm');

  const entityLabel = type === 'ap' ? 'Vendor' : 'Customer';

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const columns = [
    { name: entityLabel, numeric: false },
    { name: 'Current', numeric: true },
    { name: '31-60', numeric: true },
    { name: '61-90', numeric: true },
    { name: '91-120', numeric: true },
    { name: '120+', numeric: true },
    { name: 'Total', numeric: true },
  ];

  for (const col of columns) {
    const align = col.numeric ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col.name));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No aging data available. Generate the report to see results.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let grandCurrent = 0;
  let grand30 = 0;
  let grand60 = 0;
  let grand90 = 0;
  let grand120 = 0;
  let grandTotal = 0;

  for (const row of rows) {
    grandCurrent += row.current;
    grand30 += row.days30;
    grand60 += row.days60;
    grand90 += row.days90;
    grand120 += row.days120Plus;
    grandTotal += row.total;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium', row.entityName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.current)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.days30)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.days60)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.days90)));

    const overdueCls = row.days120Plus > 0
      ? 'py-2 px-3 text-right font-mono text-red-400'
      : 'py-2 px-3 text-right font-mono';
    tr.appendChild(el('td', overdueCls, fmtCurrency(row.days120Plus)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-semibold', fmtCurrency(row.total)));

    tbody.appendChild(tr);
  }

  if (rows.length > 0) {
    const totalRow = el('tr', 'bg-[var(--surface)] font-bold border-t-2 border-[var(--border)]');
    totalRow.appendChild(el('td', 'py-2 px-3', 'Grand Total'));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(grandCurrent)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(grand30)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(grand60)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(grand90)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(grand120)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(grandTotal)));
    tbody.appendChild(totalRow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Export Bar
// ---------------------------------------------------------------------------

function buildExportBar(): HTMLElement {
  const bar = el('div', 'flex items-center gap-3 mt-4');
  bar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Export:'));

  for (const format of ['PDF', 'CSV', 'Excel']) {
    const btn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', format);
    bar.appendChild(btn);
  }

  return bar;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Aging Reports'));

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_type, _asOfDate) => {
      /* filter action placeholder */
    }));

    const rows: AgingDisplayRow[] = [];
    wrapper.appendChild(buildTable(rows, 'ap'));
    wrapper.appendChild(buildExportBar());

    container.appendChild(wrapper);
  },
};
