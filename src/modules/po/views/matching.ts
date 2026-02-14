/**
 * Three-Way Matching view.
 * Validates PO line amounts vs received quantities vs invoice amounts.
 * Provides a detailed match status per PO line.
 * Wired to POService for live data.
 */

import { getPOService } from '../service-accessor';

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

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 5000);
}

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MATCH_BADGE: Record<string, string> = {
  matched: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  mismatch: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const inputCls =
  'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchRow {
  poLineId: string;
  poLineDescription: string;
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

interface POOption {
  id: string;
  poNumber: string;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');
let poOptions: POOption[] = [];
let matchResults: MatchRow[] = [];
let selectedPOId = '';

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

async function loadPOs(): Promise<void> {
  const svc = getPOService();

  // Load approved, partial_receipt, and received POs (eligible for matching)
  const approved = await svc.getPurchaseOrders({ status: 'approved' });
  const partial = await svc.getPurchaseOrders({ status: 'partial_receipt' });
  const received = await svc.getPurchaseOrders({ status: 'received' });

  const all = [...approved, ...partial, ...received];
  // De-duplicate and sort by poNumber
  const seen = new Set<string>();
  poOptions = [];
  for (const po of all) {
    if (!seen.has(po.id)) {
      seen.add(po.id);
      poOptions.push({ id: po.id, poNumber: po.poNumber });
    }
  }
  poOptions.sort((a, b) => a.poNumber.localeCompare(b.poNumber));
}

async function runMatch(poId: string): Promise<void> {
  const svc = getPOService();
  const results = await svc.threeWayMatch(poId);
  matchResults = results.map((r) => ({
    poLineId: r.poLineId,
    poLineDescription: r.poLineDescription,
    poQuantity: r.poQuantity,
    poUnitCost: r.poUnitCost,
    poAmount: r.poAmount,
    receivedQuantity: r.receivedQuantity,
    invoicedQuantity: r.invoicedQuantity,
    invoicedAmount: r.invoicedAmount,
    quantityMatch: r.quantityMatch,
    amountMatch: r.amountMatch,
    fullyMatched: r.fullyMatched,
  }));
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(matches: MatchRow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const totalLines = matches.length;
  const fullyMatched = matches.filter((m) => m.fullyMatched).length;
  const partialMatch = matches.filter(
    (m) => !m.fullyMatched && (m.quantityMatch || m.amountMatch),
  ).length;
  const mismatched = matches.filter(
    (m) => !m.fullyMatched && !m.quantityMatch && !m.amountMatch,
  ).length;

  const cardData = [
    { label: 'Total Lines', value: String(totalLines), cls: 'text-[var(--text)]' },
    { label: 'Fully Matched', value: String(fullyMatched), cls: 'text-emerald-400' },
    { label: 'Partial Match', value: String(partialMatch), cls: 'text-blue-400' },
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
// PO Selector
// ---------------------------------------------------------------------------

function buildPOSelector(): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  const select = el('select', inputCls) as HTMLSelectElement;
  const placeholder = el('option', undefined, 'Select a Purchase Order...') as HTMLOptionElement;
  placeholder.value = '';
  placeholder.disabled = true;
  if (!selectedPOId) placeholder.selected = true;
  select.appendChild(placeholder);

  for (const po of poOptions) {
    const opt = el('option', undefined, po.poNumber) as HTMLOptionElement;
    opt.value = po.id;
    if (po.id === selectedPOId) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener('change', async () => {
    selectedPOId = select.value;
    if (selectedPOId) {
      try {
        await runMatch(selectedPOId);
        await rebuildView();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Operation failed';
        showMsg(wrapper, message, true);
      }
    }
  });

  bar.appendChild(select);

  const matchBtn = el(
    'button',
    'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
    'Run Match',
  );
  matchBtn.type = 'button';
  matchBtn.addEventListener('click', async () => {
    if (!selectedPOId) {
      showMsg(wrapper, 'Please select a purchase order first.', true);
      return;
    }
    try {
      await runMatch(selectedPOId);
      showMsg(wrapper, 'Three-way match completed.', false);
      await rebuildView();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operation failed';
      showMsg(wrapper, message, true);
    }
  });
  bar.appendChild(matchBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Match Table
// ---------------------------------------------------------------------------

function buildMatchTable(matches: MatchRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of [
    'Line Description', 'PO Qty', 'Unit Cost', 'PO Amount',
    'Received Qty', 'Invoiced Qty', 'Invoiced Amount',
    'Qty Match', 'Amt Match', 'Status',
  ]) {
    const align = ['PO Qty', 'Unit Cost', 'PO Amount', 'Received Qty', 'Invoiced Qty', 'Invoiced Amount'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (matches.length === 0) {
    const tr = el('tr');
    const td = el(
      'td',
      'py-8 px-3 text-center text-[var(--text-muted)]',
      'Select a purchase order above to view three-way matching results.',
    );
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const match of matches) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', match.poLineDescription));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(match.poQuantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(match.poUnitCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(match.poAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(match.receivedQuantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(match.invoicedQuantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(match.invoicedAmount)));

    // Quantity match badge
    const tdQtyMatch = el('td', 'py-2 px-3 text-center');
    const qtyLabel = match.quantityMatch ? 'Yes' : 'No';
    const qtyCls = match.quantityMatch
      ? 'bg-emerald-500/10 text-emerald-400'
      : 'bg-red-500/10 text-red-400';
    tdQtyMatch.appendChild(
      el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${qtyCls}`, qtyLabel),
    );
    tr.appendChild(tdQtyMatch);

    // Amount match badge
    const tdAmtMatch = el('td', 'py-2 px-3 text-center');
    const amtLabel = match.amountMatch ? 'Yes' : 'No';
    const amtCls = match.amountMatch
      ? 'bg-emerald-500/10 text-emerald-400'
      : 'bg-red-500/10 text-red-400';
    tdAmtMatch.appendChild(
      el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${amtCls}`, amtLabel),
    );
    tr.appendChild(tdAmtMatch);

    // Overall status badge
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
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${MATCH_BADGE[statusKey]}`,
      statusLabel,
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Rebuild
// ---------------------------------------------------------------------------

async function rebuildView(): Promise<void> {
  // Preserve data-msg elements
  const msgs = Array.from(wrapper.querySelectorAll('[data-msg]'));
  wrapper.innerHTML = '';
  for (const m of msgs) wrapper.appendChild(m);

  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Three-Way Matching'));
  wrapper.appendChild(headerRow);

  wrapper.appendChild(
    el(
      'p',
      'text-sm text-[var(--text-muted)] mb-4',
      'Compare PO line amounts against material receipts and vendor invoices to ensure consistency.',
    ),
  );

  wrapper.appendChild(buildPOSelector());

  if (matchResults.length > 0 || selectedPOId) {
    wrapper.appendChild(buildSummaryCards(matchResults));
  }

  wrapper.appendChild(buildMatchTable(matchResults));
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

void (async () => {
  try {
    await loadPOs();
    await rebuildView();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    showMsg(wrapper, message, true);
  }
})();

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};
