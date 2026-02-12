/**
 * Bid Tabulation view.
 * Side-by-side comparison of all received bids grouped by trade,
 * highlighting the low bidder and showing spread analysis.
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

const BID_STATUS_BADGE: Record<string, string> = {
  solicited: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  received: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  selected: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TabBidRow {
  vendorName: string;
  amount: number;
  status: string;
  isLowBid: boolean;
  notes: string;
}

interface TabTradeGroup {
  trade: string;
  bids: TabBidRow[];
  lowBidAmount: number | null;
  highBidAmount: number | null;
  averageBidAmount: number;
  spread: number;
}

// ---------------------------------------------------------------------------
// Estimate Selector
// ---------------------------------------------------------------------------

function buildEstimateSelector(
  onSelect: (estimateId: string) => void,
): HTMLElement {
  const bar = el('div', 'flex items-center gap-3 mb-6');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  bar.appendChild(el('label', 'text-sm font-medium text-[var(--text)]', 'Select Estimate:'));

  const selectEl = el('select', inputCls) as HTMLSelectElement;
  const defaultOpt = el('option', '', 'Choose an estimate...') as HTMLOptionElement;
  defaultOpt.value = '';
  selectEl.appendChild(defaultOpt);
  bar.appendChild(selectEl);

  selectEl.addEventListener('change', () => {
    onSelect(selectEl.value);
  });

  return bar;
}

// ---------------------------------------------------------------------------
// Trade Tabulation Cards
// ---------------------------------------------------------------------------

function buildTradeCard(group: TabTradeGroup): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');

  // Trade header
  const header = el('div', 'flex items-center justify-between mb-3');
  header.appendChild(el('h3', 'text-md font-semibold text-[var(--text)]', group.trade));
  const stats = el('div', 'flex items-center gap-4 text-xs text-[var(--text-muted)]');
  stats.appendChild(el('span', '', `Low: ${group.lowBidAmount !== null ? fmtCurrency(group.lowBidAmount) : '--'}`));
  stats.appendChild(el('span', '', `High: ${group.highBidAmount !== null ? fmtCurrency(group.highBidAmount) : '--'}`));
  stats.appendChild(el('span', '', `Avg: ${fmtCurrency(group.averageBidAmount)}`));
  stats.appendChild(el('span', '', `Spread: ${fmtCurrency(group.spread)}`));
  header.appendChild(stats);
  card.appendChild(header);

  // Bids table
  const table = el('table', 'w-full text-sm');
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Vendor', 'Bid Amount', 'Status', 'Low Bid', 'Notes']) {
    const align = col === 'Bid Amount' ? 'py-1 px-2 font-medium text-right' : 'py-1 px-2 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  for (const bid of group.bids) {
    const tr = el('tr', `border-b border-[var(--border)] ${bid.isLowBid ? 'bg-emerald-500/5' : ''}`);

    tr.appendChild(el('td', 'py-1 px-2 text-[var(--text)]', bid.vendorName));
    tr.appendChild(el('td', 'py-1 px-2 text-right font-mono', bid.amount > 0 ? fmtCurrency(bid.amount) : '--'));

    const tdStatus = el('td', 'py-1 px-2');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${BID_STATUS_BADGE[bid.status] ?? BID_STATUS_BADGE.solicited}`,
      bid.status.charAt(0).toUpperCase() + bid.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdLow = el('td', 'py-1 px-2');
    if (bid.isLowBid) {
      tdLow.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'LOW'));
    }
    tr.appendChild(tdLow);

    tr.appendChild(el('td', 'py-1 px-2 text-[var(--text-muted)] text-xs', bid.notes));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  card.appendChild(table);

  return card;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function buildSummary(groups: TabTradeGroup[]): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-6');
  card.appendChild(el('h3', 'text-md font-semibold text-[var(--text)] mb-3', 'Tabulation Summary'));

  const table = el('table', 'w-full text-sm');
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Trade', 'Bids Received', 'Low Bid', 'High Bid', 'Average', 'Spread']) {
    const align = ['Low Bid', 'High Bid', 'Average', 'Spread'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  for (const group of groups) {
    const receivedCount = group.bids.filter((b) => b.status === 'received' || b.status === 'selected').length;
    const tr = el('tr', 'border-b border-[var(--border)]');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', group.trade));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', String(receivedCount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', group.lowBidAmount !== null ? fmtCurrency(group.lowBidAmount) : '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', group.highBidAmount !== null ? fmtCurrency(group.highBidAmount) : '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(group.averageBidAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(group.spread)));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  card.appendChild(table);

  return card;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Bid Tabulation'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Export PDF');
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildEstimateSelector((_estimateId) => { /* select placeholder */ }));

    const groups: TabTradeGroup[] = [];
    wrapper.appendChild(buildSummary(groups));

    for (const group of groups) {
      wrapper.appendChild(buildTradeCard(group));
    }

    if (groups.length === 0) {
      wrapper.appendChild(
        el('div', 'text-center py-12 text-[var(--text-muted)]', 'Select an estimate to view bid tabulation.'),
      );
    }

    container.appendChild(wrapper);
  },
};
