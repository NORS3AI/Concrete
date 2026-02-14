/**
 * Bid Solicitation view.
 * Manage bid requests for an estimate -- create solicitations, record
 * received bids, and select winning bidders per trade.
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
// URL Parsing
// ---------------------------------------------------------------------------

function getEstimateIdFromHash(): string | null {
  // Expected format: #/estimating/<estimateId>/bids
  const hash = window.location.hash;
  const match = hash.match(/^#\/estimating\/([^/]+)\/bids/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Add Bid Form
// ---------------------------------------------------------------------------

function buildAddBidForm(
  estimateId: string,
  wrapper: HTMLElement,
  reRender: () => void,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-6');
  card.appendChild(el('h3', 'text-md font-semibold text-[var(--text)] mb-3', 'Solicit New Bid'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';
  const textareaCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full resize-y';

  // Row 1: Trade, Vendor, Description, Expiration Date
  const row1 = el('div', 'grid grid-cols-4 gap-3');

  const tradeInput = el('input', inputCls) as HTMLInputElement;
  tradeInput.type = 'text';
  tradeInput.placeholder = 'Trade (e.g., Concrete, Steel)';
  const tradeGroup = el('div');
  tradeGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Trade *'));
  tradeGroup.appendChild(tradeInput);
  row1.appendChild(tradeGroup);

  const vendorInput = el('input', inputCls) as HTMLInputElement;
  vendorInput.type = 'text';
  vendorInput.placeholder = 'Vendor / Subcontractor ID';
  const vendorGroup = el('div');
  vendorGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Vendor ID'));
  vendorGroup.appendChild(vendorInput);
  row1.appendChild(vendorGroup);

  const descInput = el('textarea', textareaCls) as HTMLTextAreaElement;
  descInput.rows = 1;
  descInput.placeholder = 'Scope description';
  const descGroup = el('div');
  descGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Description'));
  descGroup.appendChild(descInput);
  row1.appendChild(descGroup);

  const expInput = el('input', inputCls) as HTMLInputElement;
  expInput.type = 'date';
  const expGroup = el('div');
  expGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Expiration Date'));
  expGroup.appendChild(expInput);
  row1.appendChild(expGroup);

  card.appendChild(row1);

  // Row 2: Contact Name, Contact Phone, Contact Email, Bond Included
  const row2 = el('div', 'grid grid-cols-4 gap-3 mt-3');

  const contactNameInput = el('input', inputCls) as HTMLInputElement;
  contactNameInput.type = 'text';
  contactNameInput.placeholder = 'Contact name';
  const contactNameGroup = el('div');
  contactNameGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Contact Name'));
  contactNameGroup.appendChild(contactNameInput);
  row2.appendChild(contactNameGroup);

  const contactPhoneInput = el('input', inputCls) as HTMLInputElement;
  contactPhoneInput.type = 'tel';
  contactPhoneInput.placeholder = 'Phone number';
  const contactPhoneGroup = el('div');
  contactPhoneGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Contact Phone'));
  contactPhoneGroup.appendChild(contactPhoneInput);
  row2.appendChild(contactPhoneGroup);

  const contactEmailInput = el('input', inputCls) as HTMLInputElement;
  contactEmailInput.type = 'email';
  contactEmailInput.placeholder = 'Email address';
  const contactEmailGroup = el('div');
  contactEmailGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Contact Email'));
  contactEmailGroup.appendChild(contactEmailInput);
  row2.appendChild(contactEmailGroup);

  const bondCheckbox = el('input') as HTMLInputElement;
  bondCheckbox.type = 'checkbox';
  bondCheckbox.className = 'mr-2';
  const bondGroup = el('div', 'flex items-end pb-2');
  const bondLabel = el('label', 'text-sm text-[var(--text)] flex items-center cursor-pointer');
  bondLabel.appendChild(bondCheckbox);
  bondLabel.appendChild(document.createTextNode('Bond Included'));
  bondGroup.appendChild(bondLabel);
  row2.appendChild(bondGroup);

  card.appendChild(row2);

  // Row 3: Scope Inclusions, Scope Exclusions
  const row3 = el('div', 'grid grid-cols-2 gap-3 mt-3');

  const inclusionsInput = el('textarea', textareaCls) as HTMLTextAreaElement;
  inclusionsInput.rows = 2;
  inclusionsInput.placeholder = 'What is included in scope...';
  const inclusionsGroup = el('div');
  inclusionsGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Scope Inclusions'));
  inclusionsGroup.appendChild(inclusionsInput);
  row3.appendChild(inclusionsGroup);

  const exclusionsInput = el('textarea', textareaCls) as HTMLTextAreaElement;
  exclusionsInput.rows = 2;
  exclusionsInput.placeholder = 'What is excluded from scope...';
  const exclusionsGroup = el('div');
  exclusionsGroup.appendChild(el('label', 'block text-xs text-[var(--text-muted)] mb-1', 'Scope Exclusions'));
  exclusionsGroup.appendChild(exclusionsInput);
  row3.appendChild(exclusionsGroup);

  card.appendChild(row3);

  // Submit button
  const btnRow = el('div', 'flex items-center gap-3 mt-3');
  const solicitBtn = el(
    'button',
    'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
    'Send Solicitation',
  );

  solicitBtn.addEventListener('click', async () => {
    const trade = tradeInput.value.trim();
    if (!trade) {
      showMsg(wrapper, 'Trade is required.', true);
      return;
    }

    try {
      const svc = getEstimatingService();
      await svc.createBid({
        estimateId,
        trade,
        vendorId: vendorInput.value.trim() || undefined,
        description: descInput.value.trim() || undefined,
        expirationDate: expInput.value || undefined,
        contactName: contactNameInput.value.trim() || undefined,
        contactPhone: contactPhoneInput.value.trim() || undefined,
        contactEmail: contactEmailInput.value.trim() || undefined,
        scopeInclusions: inclusionsInput.value.trim() || undefined,
        scopeExclusions: exclusionsInput.value.trim() || undefined,
        bondIncluded: bondCheckbox.checked || undefined,
      });
      showMsg(wrapper, 'Bid solicitation created successfully.', false);
      reRender();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create bid.';
      showMsg(wrapper, message, true);
    }
  });

  btnRow.appendChild(solicitBtn);
  card.appendChild(btnRow);

  return card;
}

// ---------------------------------------------------------------------------
// Inline "Record Bid" Form
// ---------------------------------------------------------------------------

function showRecordBidForm(
  bidId: string,
  actionsCell: HTMLElement,
  wrapper: HTMLElement,
  reRender: () => void,
): void {
  actionsCell.innerHTML = '';
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-xs text-[var(--text)] w-full';

  const form = el('div', 'flex flex-col gap-1');

  const amountInput = el('input', inputCls) as HTMLInputElement;
  amountInput.type = 'number';
  amountInput.step = '0.01';
  amountInput.placeholder = 'Amount';

  const dateInput = el('input', inputCls) as HTMLInputElement;
  dateInput.type = 'date';
  dateInput.valueAsDate = new Date();

  const notesInput = el('input', inputCls) as HTMLInputElement;
  notesInput.type = 'text';
  notesInput.placeholder = 'Notes (optional)';

  const btnRow = el('div', 'flex items-center gap-1 mt-1');

  const saveBtn = el('button', 'px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:opacity-90', 'Save');
  saveBtn.addEventListener('click', async () => {
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
      showMsg(wrapper, 'Please enter a valid bid amount.', true);
      return;
    }
    try {
      const svc = getEstimatingService();
      await svc.receiveBid(
        bidId,
        amount,
        dateInput.value || undefined,
        notesInput.value.trim() || undefined,
      );
      showMsg(wrapper, 'Bid recorded successfully.', false);
      reRender();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record bid.';
      showMsg(wrapper, message, true);
    }
  });

  const cancelBtn = el('button', 'px-2 py-1 rounded text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Cancel');
  cancelBtn.addEventListener('click', () => reRender());

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(cancelBtn);

  form.appendChild(amountInput);
  form.appendChild(dateInput);
  form.appendChild(notesInput);
  form.appendChild(btnRow);

  actionsCell.appendChild(form);
}

// ---------------------------------------------------------------------------
// Bid Table
// ---------------------------------------------------------------------------

interface BidDisplayRow {
  id: string;
  trade: string;
  vendorId: string;
  description: string;
  amount: number;
  status: string;
  receivedDate: string;
  expirationDate: string;
  isLowBid: boolean;
  notes: string;
}

function buildBidTable(
  bids: BidDisplayRow[],
  wrapper: HTMLElement,
  reRender: () => void,
): HTMLElement {
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
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', bid.vendorId || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', bid.description || '--'));
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
      tdLow.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', '\u2605 LOW'));
    }
    tr.appendChild(tdLow);

    const tdActions = el('td', 'py-2 px-3');
    const actionsWrap = el('div', 'flex items-center gap-2');

    if (bid.status === 'solicited') {
      const receiveBtn = el('button', 'text-blue-400 hover:underline text-xs', 'Record Bid');
      receiveBtn.addEventListener('click', () => {
        showRecordBidForm(bid.id, tdActions, wrapper, reRender);
      });
      actionsWrap.appendChild(receiveBtn);
    }

    if (bid.status === 'received') {
      const selectBtn = el('button', 'text-emerald-400 hover:underline text-xs', 'Select');
      selectBtn.addEventListener('click', async () => {
        try {
          const svc = getEstimatingService();
          await svc.selectBid(bid.id);
          showMsg(wrapper, `Bid selected for trade "${bid.trade}".`, false);
          reRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to select bid.';
          showMsg(wrapper, message, true);
        }
      });
      actionsWrap.appendChild(selectBtn);

      const rejectBtn = el('button', 'text-red-400 hover:underline text-xs', 'Reject');
      rejectBtn.addEventListener('click', async () => {
        try {
          const svc = getEstimatingService();
          await svc.updateBid(bid.id, { status: 'rejected' });
          showMsg(wrapper, 'Bid rejected.', false);
          reRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to reject bid.';
          showMsg(wrapper, message, true);
        }
      });
      actionsWrap.appendChild(rejectBtn);
    }

    // selected/rejected: no action buttons, status badge is sufficient

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

    const estimateId = getEstimateIdFromHash();
    if (!estimateId) {
      const msg = el('div', 'text-center py-12 text-[var(--text-muted)]', 'No estimate ID found in URL. Navigate from the estimate list.');
      const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline block mt-4', 'Back to Estimates') as HTMLAnchorElement;
      backLink.href = '#/estimating';
      msg.appendChild(backLink);
      container.appendChild(msg);
      return;
    }

    const wrapper = el('div', 'space-y-0');
    container.appendChild(wrapper);

    const renderView = async (): Promise<void> => {
      wrapper.innerHTML = '';

      const svc = getEstimatingService();

      // Load estimate info for the header
      let estimateName = 'Estimate';
      try {
        const estimate = await svc.getEstimate(estimateId);
        if (estimate) {
          estimateName = estimate.name || 'Estimate';
        }
      } catch {
        // Fall back to generic name
      }

      // Header
      const headerRow = el('div', 'flex items-center justify-between mb-4');
      const titleArea = el('div');
      titleArea.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Bid Solicitation'));
      titleArea.appendChild(el('p', 'text-sm text-[var(--text-muted)] mt-1', estimateName));
      headerRow.appendChild(titleArea);

      const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', '\u2190 Back to Estimates') as HTMLAnchorElement;
      backLink.href = '#/estimating';
      headerRow.appendChild(backLink);
      wrapper.appendChild(headerRow);

      // New bid form
      wrapper.appendChild(buildAddBidForm(estimateId, wrapper, () => { renderView(); }));

      // Load bids
      try {
        const rawBids = await svc.getBids({ estimateId });

        const bids: BidDisplayRow[] = rawBids.map((b) => ({
          id: b.id,
          trade: b.trade,
          vendorId: b.vendorId ?? '',
          description: b.description ?? '',
          amount: b.amount,
          status: b.status,
          receivedDate: b.receivedDate ?? '',
          expirationDate: b.expirationDate ?? '',
          isLowBid: b.isLowBid,
          notes: b.notes ?? '',
        }));

        wrapper.appendChild(buildBidTable(bids, wrapper, () => { renderView(); }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load bids.';
        showMsg(wrapper, message, true);
      }
    };

    renderView();
  },
};
