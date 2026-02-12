/**
 * Three-Way Matching view.
 * Validates PO line amounts vs received quantities vs invoice amounts.
 * Provides a detailed match status per PO line.
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

const MATCH_BADGE: Record<string, string> = {
  matched: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  mismatch: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchRow {
  poLineId: string;
  poNumber: string;
  lineNumber: number;
  description: string;
  poQuantity: number;
  poUnitCost: number;
  poAmount: number;
  receivedQuantity: number;
  invoicedQuantity: number;
  invoicedAmount: number;
  quantityMatch: boolean;
  amountMatch: boolean;
  fullyMatched: boolean;
}

// ---------------------------------------------------------------------------
// Match Table
// ---------------------------------------------------------------------------

function buildMatchTable(matches: MatchRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['PO #', 'Line', 'Description', 'PO Qty', 'Unit Cost', 'PO Amount', 'Rcvd Qty', 'Inv Qty', 'Inv Amount', 'Qty Match', 'Amt Match', 'Status']) {
    const align = ['PO Qty', 'Unit Cost', 'PO Amount', 'Rcvd Qty', 'Inv Qty', 'Inv Amount'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (matches.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'Select a purchase order above to view three-way matching results.');
    td.setAttribute('colspan', '12');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const match of matches) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', match.poNumber));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', String(match.lineNumber)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', match.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(match.poQuantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(match.poUnitCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(match.poAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(match.receivedQuantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(match.invoicedQuantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(match.invoicedAmount)));

    // Quantity match indicator
    const tdQtyMatch = el('td', 'py-2 px-3 text-center');
    const qtyIcon = match.quantityMatch ? 'Yes' : 'No';
    const qtyCls = match.quantityMatch ? 'text-emerald-400' : 'text-red-400';
    tdQtyMatch.appendChild(el('span', `text-sm font-medium ${qtyCls}`, qtyIcon));
    tr.appendChild(tdQtyMatch);

    // Amount match indicator
    const tdAmtMatch = el('td', 'py-2 px-3 text-center');
    const amtIcon = match.amountMatch ? 'Yes' : 'No';
    const amtCls = match.amountMatch ? 'text-emerald-400' : 'text-red-400';
    tdAmtMatch.appendChild(el('span', `text-sm font-medium ${amtCls}`, amtIcon));
    tr.appendChild(tdAmtMatch);

    // Overall status
    const tdStatus = el('td', 'py-2 px-3');
    let statusLabel: string;
    let statusKey: string;
    if (match.fullyMatched) {
      statusLabel = 'Matched';
      statusKey = 'matched';
    } else if (match.quantityMatch || match.amountMatch) {
      statusLabel = 'Partial';
      statusKey = 'partial';
    } else {
      statusLabel = 'Mismatch';
      statusKey = 'mismatch';
    }
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${MATCH_BADGE[statusKey]}`, statusLabel);
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// PO Selector
// ---------------------------------------------------------------------------

function buildPOSelector(onSelect: (poId: string) => void): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const poInput = el('input', inputCls) as HTMLInputElement;
  poInput.type = 'text';
  poInput.placeholder = 'Enter PO number or select...';
  bar.appendChild(poInput);

  const matchBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Run Match');
  matchBtn.type = 'button';
  matchBtn.addEventListener('click', () => onSelect(poInput.value));
  bar.appendChild(matchBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(matches: MatchRow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const totalLines = matches.length;
  const fullyMatched = matches.filter((m) => m.fullyMatched).length;
  const partialMatch = matches.filter((m) => !m.fullyMatched && (m.quantityMatch || m.amountMatch)).length;
  const mismatched = matches.filter((m) => !m.fullyMatched && !m.quantityMatch && !m.amountMatch).length;

  const cardData = [
    { label: 'Total Lines', value: String(totalLines), cls: 'text-[var(--text)]' },
    { label: 'Fully Matched', value: String(fullyMatched), cls: 'text-emerald-400' },
    { label: 'Partial Match', value: String(partialMatch), cls: 'text-amber-400' },
    { label: 'Mismatched', value: String(mismatched), cls: 'text-red-400' },
  ];

  for (const card of cardData) {
    const cardEl = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    cardEl.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', card.label));
    cardEl.appendChild(el('div', `text-2xl font-bold ${card.cls}`, card.value));
    section.appendChild(cardEl);
  }

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Three-Way Matching'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Compare PO line amounts against material receipts and vendor invoices to ensure consistency.'));

    wrapper.appendChild(buildPOSelector((_poId) => { /* load match results placeholder */ }));

    const matches: MatchRow[] = [];
    wrapper.appendChild(buildSummaryCards(matches));
    wrapper.appendChild(buildMatchTable(matches));

    container.appendChild(wrapper);
  },
};
