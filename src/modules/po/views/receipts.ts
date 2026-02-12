/**
 * Material Receipts view.
 * Tracks materials received against purchase orders with line-level detail.
 */

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  partial: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  complete: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReceiptRow {
  id: string;
  receiptNumber: string;
  poNumber: string;
  vendorName: string;
  receivedDate: string;
  receivedBy: string;
  status: string;
  notes: string;
  lineCount: number;
}

// ---------------------------------------------------------------------------
// Receipt Table
// ---------------------------------------------------------------------------

function buildReceiptTable(receipts: ReceiptRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Receipt #', 'PO #', 'Vendor', 'Received Date', 'Received By', 'Lines', 'Status', 'Notes']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (receipts.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No receipts found. Create a receipt from a purchase order to track material deliveries.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const receipt of receipts) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', receipt.receiptNumber));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', receipt.poNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', receipt.vendorName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', receipt.receivedDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', receipt.receivedBy));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', String(receipt.lineCount)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[receipt.status] ?? STATUS_BADGE.partial}`,
      receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[200px]', receipt.notes));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// New Receipt Form
// ---------------------------------------------------------------------------

function buildNewReceiptForm(): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mt-6');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Receipt'));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const grid = el('div', 'grid grid-cols-3 gap-4');

  const poGroup = el('div');
  poGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Purchase Order'));
  const poInput = el('input', inputCls) as HTMLInputElement;
  poInput.type = 'text';
  poInput.name = 'purchaseOrderId';
  poInput.placeholder = 'Select PO...';
  poGroup.appendChild(poInput);
  grid.appendChild(poGroup);

  const rcptNumGroup = el('div');
  rcptNumGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Receipt Number'));
  const rcptNumInput = el('input', inputCls) as HTMLInputElement;
  rcptNumInput.type = 'text';
  rcptNumInput.name = 'receiptNumber';
  rcptNumInput.placeholder = 'RCV-0001';
  rcptNumGroup.appendChild(rcptNumInput);
  grid.appendChild(rcptNumGroup);

  const dateGroup = el('div');
  dateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Received Date'));
  const dateIn = el('input', inputCls) as HTMLInputElement;
  dateIn.type = 'date';
  dateIn.name = 'receivedDate';
  dateGroup.appendChild(dateIn);
  grid.appendChild(dateGroup);

  const byGroup = el('div');
  byGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Received By'));
  const byInput = el('input', inputCls) as HTMLInputElement;
  byInput.type = 'text';
  byInput.name = 'receivedBy';
  byInput.placeholder = 'Name';
  byGroup.appendChild(byInput);
  grid.appendChild(byGroup);

  const notesGroup = el('div', 'col-span-2');
  notesGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Notes'));
  const notesInput = el('textarea', inputCls) as HTMLTextAreaElement;
  notesInput.name = 'notes';
  notesInput.rows = 2;
  notesGroup.appendChild(notesInput);
  grid.appendChild(notesGroup);

  section.appendChild(grid);

  // Receipt lines placeholder
  section.appendChild(el('h3', 'text-md font-semibold text-[var(--text)] mt-4 mb-2', 'Receipt Lines'));
  section.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-3', 'Select a PO above to load line items for receipt.'));

  const btnRow = el('div', 'flex items-center gap-3 mt-4');
  const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create Receipt');
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', () => { /* create receipt placeholder */ });
  btnRow.appendChild(saveBtn);
  section.appendChild(btnRow);

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Material Receipts'));
    wrapper.appendChild(headerRow);

    const receipts: ReceiptRow[] = [];
    wrapper.appendChild(buildReceiptTable(receipts));
    wrapper.appendChild(buildNewReceiptForm());

    container.appendChild(wrapper);
  },
};
