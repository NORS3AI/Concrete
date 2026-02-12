/**
 * Equipment Depreciation view.
 * Displays depreciation schedule and history by equipment.
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

const METHOD_LABELS: Record<string, string> = {
  straight_line: 'Straight Line',
  macrs: 'MACRS',
  declining_balance: 'Declining Balance',
};

const METHOD_BADGE: Record<string, string> = {
  straight_line: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  macrs: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  declining_balance: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DepreciationRow {
  equipmentNumber: string;
  periodStart: string;
  periodEnd: string;
  method: string;
  beginningValue: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  endingValue: number;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: DepreciationRow[]): HTMLElement {
  const totalDepreciation = rows.reduce((sum, r) => sum + r.depreciationAmount, 0);
  const totalAccumulated = rows.length > 0 ? rows[rows.length - 1].accumulatedDepreciation : 0;
  const currentBookValue = rows.length > 0 ? rows[rows.length - 1].endingValue : 0;

  const grid = el('div', 'grid grid-cols-3 gap-4 mb-4');

  const card1 = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  card1.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Period Depreciation'));
  card1.appendChild(el('div', 'text-xl font-bold text-[var(--text)] mt-1', fmtCurrency(totalDepreciation)));
  grid.appendChild(card1);

  const card2 = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  card2.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Accumulated Depreciation'));
  card2.appendChild(el('div', 'text-xl font-bold text-[var(--text)] mt-1', fmtCurrency(totalAccumulated)));
  grid.appendChild(card2);

  const card3 = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  card3.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Current Book Value'));
  card3.appendChild(el('div', 'text-xl font-bold text-[var(--text)] mt-1', fmtCurrency(currentBookValue)));
  grid.appendChild(card3);

  return grid;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: DepreciationRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Equipment', 'Period Start', 'Period End', 'Method', 'Beginning Value', 'Depreciation', 'Accumulated', 'Ending Value']) {
    const align = ['Beginning Value', 'Depreciation', 'Accumulated', 'Ending Value'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No depreciation records found. Run depreciation calculations to generate records.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.equipmentNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.periodStart));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.periodEnd));

    const tdMethod = el('td', 'py-2 px-3');
    const methodBadge = el('span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${METHOD_BADGE[row.method] ?? METHOD_BADGE.straight_line}`,
      METHOD_LABELS[row.method] ?? row.method);
    tdMethod.appendChild(methodBadge);
    tr.appendChild(tdMethod);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.beginningValue)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', fmtCurrency(row.depreciationAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.accumulatedDepreciation)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(row.endingValue)));

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment Depreciation'));
    const runBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Run Depreciation');
    runBtn.addEventListener('click', () => { /* run depreciation placeholder */ });
    headerRow.appendChild(runBtn);
    wrapper.appendChild(headerRow);

    const rows: DepreciationRow[] = [];
    wrapper.appendChild(buildSummaryCards(rows));
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};
