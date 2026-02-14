/**
 * Bid Tabulation view.
 * Side-by-side comparison of all received bids grouped by trade,
 * highlighting the low bidder and showing spread analysis.
 */

import { getEstimatingService } from '../service-accessor';

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

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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
// Types (display-oriented, mapped from service types)
// ---------------------------------------------------------------------------

interface TabBidRow {
  id: string;
  vendorId: string;
  amount: number;
  status: string;
  isLowBid: boolean;
  notes: string;
}

interface TabTradeGroup {
  trade: string;
  bids: TabBidRow[];
  lowBidId: string | null;
  lowBidAmount: number | null;
  highBidAmount: number | null;
  averageBidAmount: number;
  spread: number;
}

// ---------------------------------------------------------------------------
// Estimate Selector
// ---------------------------------------------------------------------------

async function buildEstimateSelector(
  wrapper: HTMLElement,
  selectedId: string | null,
  onSelect: (estimateId: string) => void,
): Promise<HTMLElement> {
  const bar = el('div', 'flex items-center gap-3 mb-6');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  bar.appendChild(el('label', 'text-sm font-medium text-[var(--text)]', 'Select Estimate:'));

  const selectEl = el('select', inputCls) as HTMLSelectElement;
  const defaultOpt = el('option', '', 'Choose an estimate...') as HTMLOptionElement;
  defaultOpt.value = '';
  selectEl.appendChild(defaultOpt);

  try {
    const svc = getEstimatingService();
    const estimates = await svc.getEstimates();
    for (const est of estimates) {
      const opt = el('option', '', `${est.name} (Rev ${est.revision})`) as HTMLOptionElement;
      opt.value = est.id;
      if (est.id === selectedId) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load estimates.';
    showMsg(wrapper, message, true);
  }

  bar.appendChild(selectEl);

  selectEl.addEventListener('change', () => {
    onSelect(selectEl.value);
  });

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Table
// ---------------------------------------------------------------------------

function buildSummary(groups: TabTradeGroup[]): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-6');
  card.appendChild(el('h3', 'text-md font-semibold text-[var(--text)] mb-3', 'Tabulation Summary'));

  const table = el('table', 'w-full text-sm');
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Trade', 'Bids Received', 'Low Bid', 'High Bid', 'Average', 'Spread']) {
    const align = ['Low Bid', 'High Bid', 'Average', 'Spread'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');

  if (groups.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No bid tabulation data available.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const group of groups) {
    const receivedCount = group.bids.filter(
      (b) => b.status === 'received' || b.status === 'selected',
    ).length;
    const tr = el('tr', 'border-b border-[var(--border)]');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', group.trade));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', String(receivedCount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', group.lowBidAmount !== null ? fmtCurrency(group.lowBidAmount) : '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', group.highBidAmount !== null ? fmtCurrency(group.highBidAmount) : '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(group.averageBidAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(group.spread)));
    tbody.appendChild(tr);
  }

  // Total row summing low bids
  if (groups.length > 0) {
    const totalLow = groups.reduce((sum, g) => sum + (g.lowBidAmount ?? 0), 0);
    const totalTr = el('tr', 'border-t-2 border-[var(--border)] font-semibold');
    totalTr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', 'Total'));
    totalTr.appendChild(el('td', 'py-2 px-3', ''));
    totalTr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text)]', fmtCurrency(totalLow)));
    totalTr.appendChild(el('td', 'py-2 px-3', ''));
    totalTr.appendChild(el('td', 'py-2 px-3', ''));
    totalTr.appendChild(el('td', 'py-2 px-3', ''));
    tbody.appendChild(totalTr);
  }

  table.appendChild(tbody);
  card.appendChild(table);

  return card;
}

// ---------------------------------------------------------------------------
// Trade Detail Cards
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
    const isLow = bid.id === group.lowBidId;
    const tr = el('tr', `border-b border-[var(--border)] ${isLow ? 'bg-emerald-500/5' : ''}`);

    tr.appendChild(el('td', 'py-1 px-2 text-[var(--text)]', bid.vendorId || '--'));

    const amountCls = isLow
      ? 'py-1 px-2 text-right font-mono text-emerald-400'
      : 'py-1 px-2 text-right font-mono';
    tr.appendChild(el('td', amountCls, bid.amount > 0 ? fmtCurrency(bid.amount) : '--'));

    const tdStatus = el('td', 'py-1 px-2');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${BID_STATUS_BADGE[bid.status] ?? BID_STATUS_BADGE.solicited}`,
      bid.status.charAt(0).toUpperCase() + bid.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdLow = el('td', 'py-1 px-2');
    if (isLow) {
      tdLow.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', '\u2605 LOW'));
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
// CSV Export
// ---------------------------------------------------------------------------

function exportTabulationCsv(groups: TabTradeGroup[]): void {
  const headers = ['Trade', 'Vendor', 'Amount', 'Status', 'Is Low Bid', 'Notes'];
  const rows: string[][] = [headers];

  for (const group of groups) {
    for (const bid of group.bids) {
      rows.push([
        group.trade,
        bid.vendorId || '',
        bid.amount > 0 ? bid.amount.toFixed(2) : '',
        bid.status,
        bid.id === group.lowBidId ? 'Yes' : 'No',
        bid.notes || '',
      ]);
    }
    // Summary row per trade
    rows.push([
      `${group.trade} (Summary)`,
      '',
      '',
      `Low: ${group.lowBidAmount?.toFixed(2) ?? '--'} | High: ${group.highBidAmount?.toFixed(2) ?? '--'} | Avg: ${group.averageBidAmount.toFixed(2)} | Spread: ${group.spread.toFixed(2)}`,
      '',
      '',
    ]);
  }

  const csvContent = rows
    .map((row) =>
      row.map((cell) => {
        const escaped = cell.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','),
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'bid-tabulation.csv';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', 'space-y-0');
    container.appendChild(wrapper);

    let selectedEstimateId: string | null = null;
    let currentGroups: TabTradeGroup[] = [];

    const renderView = async (): Promise<void> => {
      wrapper.innerHTML = '';

      // Header
      const headerRow = el('div', 'flex items-center justify-between mb-4');
      const titleArea = el('div');
      titleArea.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Bid Tabulation'));
      headerRow.appendChild(titleArea);

      const headerActions = el('div', 'flex items-center gap-3');

      const exportBtn = el(
        'button',
        'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
        'Export CSV',
      );
      exportBtn.addEventListener('click', () => {
        if (currentGroups.length === 0) {
          showMsg(wrapper, 'No tabulation data to export.', true);
          return;
        }
        exportTabulationCsv(currentGroups);
        showMsg(wrapper, 'CSV exported successfully.', false);
      });
      headerActions.appendChild(exportBtn);

      const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', '\u2190 Back to Estimates') as HTMLAnchorElement;
      backLink.href = '#/estimating';
      headerActions.appendChild(backLink);

      headerRow.appendChild(headerActions);
      wrapper.appendChild(headerRow);

      // Estimate selector
      const selector = await buildEstimateSelector(
        wrapper,
        selectedEstimateId,
        (estimateId: string) => {
          selectedEstimateId = estimateId || null;
          renderView();
        },
      );
      wrapper.appendChild(selector);

      // Load tabulation data if an estimate is selected
      if (!selectedEstimateId) {
        currentGroups = [];
        wrapper.appendChild(
          el('div', 'text-center py-12 text-[var(--text-muted)]', 'Select an estimate to view bid tabulation.'),
        );
        return;
      }

      try {
        const svc = getEstimatingService();
        const tabulationRows = await svc.getBidTabulation(selectedEstimateId);

        // Map service BidTabulationRow[] to display TabTradeGroup[]
        currentGroups = tabulationRows.map((row) => ({
          trade: row.trade,
          bids: row.bids.map((b) => ({
            id: b.id,
            vendorId: b.vendorId ?? '',
            amount: b.amount,
            status: b.status,
            isLowBid: b.isLowBid,
            notes: b.notes ?? '',
          })),
          lowBidId: row.lowBidId,
          lowBidAmount: row.lowBidAmount,
          highBidAmount: row.highBidAmount,
          averageBidAmount: row.averageBidAmount,
          spread: row.spread,
        }));

        if (currentGroups.length === 0) {
          wrapper.appendChild(
            el('div', 'text-center py-12 text-[var(--text-muted)]', 'No bids found for this estimate.'),
          );
          return;
        }

        // Summary table
        wrapper.appendChild(buildSummary(currentGroups));

        // Trade detail cards
        for (const group of currentGroups) {
          wrapper.appendChild(buildTradeCard(group));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load bid tabulation.';
        showMsg(wrapper, message, true);
      }
    };

    renderView();
  },
};
