/**
 * PO Amendments / Change Orders view.
 * Lists and manages amendments to purchase orders.
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

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const inputCls =
  'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AmendmentRow {
  id: string;
  purchaseOrderId: string;
  poNumber: string;
  amendmentNumber: number;
  description: string;
  amountChange: number;
  newTotal: number;
  reason: string;
  status: string;
  approvedBy: string;
  approvedAt: string;
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
let allAmendments: AmendmentRow[] = [];
let selectedPOId = '__all__';
let formVisible = false;

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

async function loadPOs(): Promise<void> {
  const svc = getPOService();
  const pos = await svc.getPurchaseOrders();
  poOptions = pos.map((po) => ({ id: po.id, poNumber: po.poNumber }));
}

function poNumberById(poId: string): string {
  return poOptions.find((p) => p.id === poId)?.poNumber ?? poId;
}

async function loadAmendments(): Promise<void> {
  const svc = getPOService();

  if (selectedPOId === '__all__') {
    const all: AmendmentRow[] = [];
    for (const po of poOptions) {
      const amendments = await svc.getAmendments(po.id);
      for (const a of amendments) {
        all.push({
          id: a.id,
          purchaseOrderId: a.purchaseOrderId,
          poNumber: poNumberById(a.purchaseOrderId),
          amendmentNumber: a.amendmentNumber,
          description: a.description ?? '',
          amountChange: a.amountChange,
          newTotal: a.newTotal,
          reason: a.reason ?? '',
          status: a.status,
          approvedBy: a.approvedBy ?? '',
          approvedAt: a.approvedAt ?? '',
        });
      }
    }
    allAmendments = all;
  } else {
    const amendments = await svc.getAmendments(selectedPOId);
    allAmendments = amendments.map((a) => ({
      id: a.id,
      purchaseOrderId: a.purchaseOrderId,
      poNumber: poNumberById(a.purchaseOrderId),
      amendmentNumber: a.amendmentNumber,
      description: a.description ?? '',
      amountChange: a.amountChange,
      newTotal: a.newTotal,
      reason: a.reason ?? '',
      status: a.status,
      approvedBy: a.approvedBy ?? '',
      approvedAt: a.approvedAt ?? '',
    }));
  }
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(amendments: AmendmentRow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const total = amendments.length;
  const pending = amendments.filter((a) => a.status === 'pending').length;
  const approved = amendments.filter((a) => a.status === 'approved').length;
  const netChange = amendments
    .filter((a) => a.status === 'approved')
    .reduce((sum, a) => sum + a.amountChange, 0);

  const cardData = [
    { label: 'Total Amendments', value: String(total), cls: 'text-[var(--text)]' },
    { label: 'Pending', value: String(pending), cls: 'text-amber-400' },
    { label: 'Approved', value: String(approved), cls: 'text-emerald-400' },
    { label: 'Net Change', value: fmtCurrency(netChange), cls: netChange >= 0 ? 'text-red-400' : 'text-emerald-400' },
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
  const allOption = el('option', undefined, 'All POs') as HTMLOptionElement;
  allOption.value = '__all__';
  select.appendChild(allOption);

  for (const po of poOptions) {
    const opt = el('option', undefined, po.poNumber) as HTMLOptionElement;
    opt.value = po.id;
    if (po.id === selectedPOId) opt.selected = true;
    select.appendChild(opt);
  }

  if (selectedPOId === '__all__') {
    (select.querySelector('option[value="__all__"]') as HTMLOptionElement).selected = true;
  }

  select.addEventListener('change', () => {
    selectedPOId = select.value;
    rebuildView();
  });

  bar.appendChild(select);

  const newBtn = el(
    'button',
    'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
    'New Amendment',
  );
  newBtn.type = 'button';
  newBtn.addEventListener('click', () => {
    formVisible = !formVisible;
    rebuildView();
  });
  bar.appendChild(newBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Amendment Table
// ---------------------------------------------------------------------------

function buildAmendmentTable(amendments: AmendmentRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['PO #', 'Amendment #', 'Description', 'Amount Change', 'New Total', 'Reason', 'Status', 'Approved By', 'Actions']) {
    const align = ['Amount Change', 'New Total'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (amendments.length === 0) {
    const tr = el('tr');
    const td = el(
      'td',
      'py-8 px-3 text-center text-[var(--text-muted)]',
      'No amendments found. Create an amendment from a purchase order to track change orders.',
    );
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const amendment of amendments) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', amendment.poNumber));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', String(amendment.amendmentNumber)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', amendment.description));

    const changeColor = amendment.amountChange >= 0 ? 'text-red-400' : 'text-emerald-400';
    const changePrefix = amendment.amountChange >= 0 ? '+' : '';
    tr.appendChild(
      el(
        'td',
        `py-2 px-3 text-right font-mono ${changeColor}`,
        `${changePrefix}${fmtCurrency(amendment.amountChange)}`,
      ),
    );

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(amendment.newTotal)));
    tr.appendChild(
      el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[150px]', amendment.reason),
    );

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[amendment.status] ?? STATUS_BADGE.pending}`,
      amendment.status.charAt(0).toUpperCase() + amendment.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', amendment.approvedBy));

    const tdActions = el('td', 'py-2 px-3');
    if (amendment.status === 'pending') {
      const approveBtn = el('button', 'text-emerald-400 hover:text-emerald-300 text-sm mr-2', 'Approve');
      approveBtn.type = 'button';
      approveBtn.addEventListener('click', async () => {
        const name = prompt('Approved by (enter name):');
        if (!name) return;
        try {
          const svc = getPOService();
          await svc.approveAmendment(amendment.id, name);
          showMsg(wrapper, `Amendment #${amendment.amendmentNumber} approved.`, false);
          await rebuildView();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      });
      tdActions.appendChild(approveBtn);

      const rejectBtn = el('button', 'text-red-400 hover:text-red-300 text-sm', 'Reject');
      rejectBtn.type = 'button';
      rejectBtn.addEventListener('click', async () => {
        if (!confirm(`Reject amendment #${amendment.amendmentNumber}?`)) return;
        try {
          const svc = getPOService();
          await svc.rejectAmendment(amendment.id);
          showMsg(wrapper, `Amendment #${amendment.amendmentNumber} rejected.`, false);
          await rebuildView();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      });
      tdActions.appendChild(rejectBtn);
    }
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// New Amendment Form
// ---------------------------------------------------------------------------

function buildNewAmendmentForm(): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mt-6');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Amendment / Change Order'));

  const grid = el('div', 'grid grid-cols-2 gap-4');

  // PO selector
  const poGroup = el('div');
  poGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Purchase Order'));
  const poSelect = el('select', inputCls) as HTMLSelectElement;
  poSelect.name = 'purchaseOrderId';
  const placeholder = el('option', undefined, 'Select PO...') as HTMLOptionElement;
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  poSelect.appendChild(placeholder);
  for (const po of poOptions) {
    const opt = el('option', undefined, po.poNumber) as HTMLOptionElement;
    opt.value = po.id;
    poSelect.appendChild(opt);
  }
  poGroup.appendChild(poSelect);
  grid.appendChild(poGroup);

  // Amount Change
  const amtGroup = el('div');
  amtGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Amount Change'));
  const amtInput = el('input', inputCls) as HTMLInputElement;
  amtInput.type = 'number';
  amtInput.name = 'amountChange';
  amtInput.step = '0.01';
  amtInput.placeholder = '0.00 (positive = increase, negative = decrease)';
  amtGroup.appendChild(amtInput);
  grid.appendChild(amtGroup);

  // Description
  const descGroup = el('div');
  descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Description'));
  const descInput = el('textarea', inputCls) as HTMLTextAreaElement;
  descInput.name = 'description';
  descInput.rows = 2;
  descGroup.appendChild(descInput);
  grid.appendChild(descGroup);

  // Reason
  const reasonGroup = el('div');
  reasonGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Reason'));
  const reasonInput = el('textarea', inputCls) as HTMLTextAreaElement;
  reasonInput.name = 'reason';
  reasonInput.rows = 2;
  reasonGroup.appendChild(reasonInput);
  grid.appendChild(reasonGroup);

  section.appendChild(grid);

  const btnRow = el('div', 'flex items-center gap-3 mt-4');
  const saveBtn = el(
    'button',
    'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
    'Create Amendment',
  );
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', async () => {
    const purchaseOrderId = poSelect.value;
    const amountChange = parseFloat(amtInput.value);
    const description = descInput.value.trim();
    const reason = reasonInput.value.trim();

    if (!purchaseOrderId) {
      showMsg(wrapper, 'Please select a purchase order.', true);
      return;
    }
    if (isNaN(amountChange)) {
      showMsg(wrapper, 'Please enter a valid amount change.', true);
      return;
    }

    try {
      const svc = getPOService();
      await svc.createAmendment({
        purchaseOrderId,
        description,
        amountChange,
        reason,
      });
      showMsg(wrapper, 'Amendment created successfully.', false);
      formVisible = false;
      await rebuildView();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operation failed';
      showMsg(wrapper, message, true);
    }
  });
  btnRow.appendChild(saveBtn);

  const cancelBtn = el(
    'button',
    'px-6 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]',
    'Cancel',
  );
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => {
    formVisible = false;
    rebuildView();
  });
  btnRow.appendChild(cancelBtn);

  section.appendChild(btnRow);

  return section;
}

// ---------------------------------------------------------------------------
// Rebuild
// ---------------------------------------------------------------------------

async function rebuildView(): Promise<void> {
  try {
    await loadAmendments();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load amendments';
    showMsg(wrapper, message, true);
  }

  // Preserve data-msg elements
  const msgs = Array.from(wrapper.querySelectorAll('[data-msg]'));
  wrapper.innerHTML = '';
  for (const m of msgs) wrapper.appendChild(m);

  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'PO Amendments & Change Orders'));
  wrapper.appendChild(headerRow);

  wrapper.appendChild(buildSummaryCards(allAmendments));
  wrapper.appendChild(buildPOSelector());
  wrapper.appendChild(buildAmendmentTable(allAmendments));

  if (formVisible) {
    wrapper.appendChild(buildNewAmendmentForm());
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

void (async () => {
  try {
    const svc = getPOService();
    const pos = await svc.getPurchaseOrders();
    poOptions = pos.map((po) => ({ id: po.id, poNumber: po.poNumber }));
    await loadAmendments();
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
