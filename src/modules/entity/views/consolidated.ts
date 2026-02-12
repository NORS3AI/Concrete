/**
 * Consolidated trial balance view.
 * Root entity selector, as-of date picker, multi-entity column table with
 * eliminations and consolidated total, export button.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v === 0 ? '' : v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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

interface ConsolidatedRow {
  accountNumber: string;
  accountName: string;
  entityBalances: Record<string, number>;
  eliminations: number;
  consolidatedTotal: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function buildControls(
  onRefresh: (rootEntityId: string, asOfDate: string) => void,
  onExport: () => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  // Root entity selector
  const entityLabel = el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Root Entity');
  bar.appendChild(entityLabel);

  const entitySelect = el('select', inputCls) as HTMLSelectElement;
  entitySelect.setAttribute('data-role', 'root-entity');
  const allOpt = el('option', '', 'All Entities') as HTMLOptionElement;
  allOpt.value = '__all__';
  entitySelect.appendChild(allOpt);
  bar.appendChild(entitySelect);

  // As-of date
  const dateLabel = el('label', 'text-sm font-medium text-[var(--text-muted)]', 'As of Date');
  bar.appendChild(dateLabel);

  const dateInput = el('input', inputCls) as HTMLInputElement;
  dateInput.type = 'date';
  dateInput.name = 'asOfDate';
  dateInput.value = new Date().toISOString().split('T')[0];
  bar.appendChild(dateInput);

  // Refresh button
  const refreshBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Refresh');
  refreshBtn.type = 'button';
  refreshBtn.addEventListener('click', () => onRefresh(entitySelect.value, dateInput.value));
  bar.appendChild(refreshBtn);

  // Spacer
  const spacer = el('div', 'flex-1');
  bar.appendChild(spacer);

  // Export button
  const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Export');
  exportBtn.type = 'button';
  exportBtn.setAttribute('data-role', 'export-consolidated');
  exportBtn.addEventListener('click', onExport);
  bar.appendChild(exportBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: ConsolidatedRow[], entityNames: string[]): HTMLElement {
  const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm');

  // thead
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  headRow.appendChild(el('th', 'py-2 px-3 font-medium sticky left-0 bg-[var(--surface-raised)]', 'Account Number'));
  headRow.appendChild(el('th', 'py-2 px-3 font-medium sticky left-24 bg-[var(--surface-raised)]', 'Account Name'));
  for (const name of entityNames) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium text-right', name));
  }
  headRow.appendChild(el('th', 'py-2 px-3 font-medium text-right text-amber-400', 'Eliminations'));
  headRow.appendChild(el('th', 'py-2 px-3 font-medium text-right font-semibold', 'Consolidated'));
  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = el('tbody');
  tbody.setAttribute('data-role', 'consolidated-rows');

  if (rows.length === 0) {
    const tr = el('tr');
    const colCount = entityNames.length + 4;
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No data available. Select a root entity and date, then click Refresh.');
    td.setAttribute('colspan', String(colCount));
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    // Account Number
    tr.appendChild(el('td', 'py-2 px-3 font-mono sticky left-0 bg-[var(--surface-raised)]', row.accountNumber));

    // Account Name
    tr.appendChild(el('td', 'py-2 px-3 sticky left-24 bg-[var(--surface-raised)]', row.accountName));

    // Entity columns
    for (const name of entityNames) {
      const bal = row.entityBalances[name] ?? 0;
      tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(bal)));
    }

    // Eliminations
    const elimCls = row.eliminations !== 0
      ? 'py-2 px-3 text-right font-mono text-amber-400'
      : 'py-2 px-3 text-right font-mono';
    tr.appendChild(el('td', elimCls, fmtCurrency(row.eliminations)));

    // Consolidated Total
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-semibold', fmtCurrency(row.consolidatedTotal)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);

  // tfoot -- totals row
  const tfoot = el('tfoot');
  const footRow = el('tr', 'border-t-2 border-[var(--border)] font-semibold');
  footRow.appendChild(el('td', 'py-2 px-3 sticky left-0 bg-[var(--surface-raised)]'));
  footRow.appendChild(el('td', 'py-2 px-3 sticky left-24 bg-[var(--surface-raised)] text-right text-[var(--text-muted)]', 'Totals'));

  for (const name of entityNames) {
    const total = rows.reduce((sum, r) => sum + (r.entityBalances[name] ?? 0), 0);
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(total)));
  }

  const elimTotal = rows.reduce((sum, r) => sum + r.eliminations, 0);
  footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', fmtCurrency(elimTotal)));

  const consTotal = rows.reduce((sum, r) => sum + r.consolidatedTotal, 0);
  footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono font-semibold', fmtCurrency(consTotal)));

  tfoot.appendChild(footRow);
  table.appendChild(tfoot);

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

    // Header
    wrapper.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)] mb-4', 'Consolidated Trial Balance'));

    // Controls
    wrapper.appendChild(buildControls(
      (_rootEntityId, _asOfDate) => { /* refresh handler placeholder */ },
      () => { /* export handler placeholder */ },
    ));

    // Table (empty shell -- service populates later)
    const rows: ConsolidatedRow[] = [];
    const entityNames: string[] = [];
    wrapper.appendChild(buildTable(rows, entityNames));

    container.appendChild(wrapper);
  },
};
