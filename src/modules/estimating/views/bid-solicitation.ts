/**
 * Bid Solicitation view.
 * Manage bid requests for an estimate -- create solicitations, record
 * received bids, and select winning bidders per trade.
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

interface BidRow {
  id: string;
  trade: string;
  vendorName: string;
  description: string;
  amount: number;
  status: string;
  receivedDate: string;
  expirationDate: string;
  isLowBid: boolean;
  notes: string;
}

// ---------------------------------------------------------------------------
// Add Bid Form
// ---------------------------------------------------------------------------

function buildAddBidForm(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-6');
  card.appendChild(el('h3', 'text-md font-semibold text-[var(--text)] mb-3', 'Solicit New Bid'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const formGrid = el('div', 'grid grid-cols-4 gap-3');

  const tradeInput = el('input', inputCls) as HTMLInputElement;
  tradeInput.type = 'text';
  tradeInput.placeholder = 'Trade (e.g., Concrete, Steel)';
  const tradeGroup = el('div');
  tradeGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Trade'));
  tradeGroup.appendChild(tradeInput);
  formGrid.appendChild(tradeGroup);

  const vendorInput = el('input', inputCls) as HTMLInputElement;
  vendorInput.type = 'text';
  vendorInput.placeholder = 'Vendor / Subcontractor';
  const vendorGroup = el('div');
  vendorGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Vendor'));
  vendorGroup.appendChild(vendorInput);
  formGrid.appendChild(vendorGroup);

  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.type = 'text';
  descInput.placeholder = 'Scope description';
  const descGroup = el('div');
  descGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Description'));
  descGroup.appendChild(descInput);
  formGrid.appendChild(descGroup);

  const expInput = el('input', inputCls) as HTMLInputElement;
  expInput.type = 'date';
  const expGroup = el('div');
  expGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Expiration Date'));
  expGroup.appendChild(expInput);
  formGrid.appendChild(expGroup);

  card.appendChild(formGrid);

  const btnRow = el('div', 'flex items-center gap-3 mt-3');
  const solicitBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Send Solicitation');
  solicitBtn.addEventListener('click', () => { /* solicit placeholder */ });
  btnRow.appendChild(solicitBtn);
  card.appendChild(btnRow);

  return card;
}

// ---------------------------------------------------------------------------
// Bid Table
// ---------------------------------------------------------------------------

function buildBidTable(bids: BidRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Trade', 'Vendor', 'Description', 'Amount', 'Status', 'Received', 'Expires', 'Low Bid', 'Actions']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (bids.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No bids yet. Use the form above to solicit bids from subcontractors.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const bid of bids) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', bid.trade));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', bid.vendorName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', bid.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', bid.amount > 0 ? fmtCurrency(bid.amount) : '--'));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${BID_STATUS_BADGE[bid.status] ?? BID_STATUS_BADGE.solicited}`,
      bid.status.charAt(0).toUpperCase() + bid.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', bid.receivedDate ?? ''));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', bid.expirationDate ?? ''));

    const tdLow = el('td', 'py-2 px-3');
    if (bid.isLowBid) {
      tdLow.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'LOW'));
    }
    tr.appendChild(tdLow);

    const tdActions = el('td', 'py-2 px-3');
    const actionsWrap = el('div', 'flex items-center gap-2');

    if (bid.status === 'solicited') {
      const receiveBtn = el('button', 'text-blue-400 hover:underline text-xs', 'Record Bid');
      receiveBtn.addEventListener('click', () => { /* receive bid placeholder */ });
      actionsWrap.appendChild(receiveBtn);
    }
    if (bid.status === 'received') {
      const selectBtn = el('button', 'text-emerald-400 hover:underline text-xs', 'Select');
      selectBtn.addEventListener('click', () => { /* select bid placeholder */ });
      actionsWrap.appendChild(selectBtn);
      const rejectBtn = el('button', 'text-red-400 hover:underline text-xs', 'Reject');
      rejectBtn.addEventListener('click', () => { /* reject bid placeholder */ });
      actionsWrap.appendChild(rejectBtn);
    }

    tdActions.appendChild(actionsWrap);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Bid Solicitation'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Estimate') as HTMLAnchorElement;
    backLink.href = '#/estimating';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildAddBidForm());

    const bids: BidRow[] = [];
    wrapper.appendChild(buildBidTable(bids));

    container.appendChild(wrapper);
  },
};
