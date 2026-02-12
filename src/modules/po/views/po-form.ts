/**
 * Purchase Order create/edit form view.
 * Full PO details with line items, job/cost code distribution, and approval actions.
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

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'partial_receipt', label: 'Partial Receipt' },
  { value: 'received', label: 'Received' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'blanket', label: 'Blanket' },
  { value: 'service', label: 'Service' },
];

// ---------------------------------------------------------------------------
// Form Builders
// ---------------------------------------------------------------------------

function buildField(
  label: string,
  inputEl: HTMLElement,
  colSpan?: number,
): HTMLElement {
  const group = el('div', colSpan === 2 ? 'col-span-2' : '');
  group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', label));
  group.appendChild(inputEl);
  return group;
}

function textInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'text';
  input.name = name;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function dateInput(name: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'date';
  input.name = name;
  return input;
}

function numberInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'number';
  input.name = name;
  input.step = '0.01';
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function selectInput(name: string, options: { value: string; label: string }[]): HTMLSelectElement {
  const select = el('select', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLSelectElement;
  select.name = name;
  for (const opt of options) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    select.appendChild(o);
  }
  return select;
}

function textareaInput(name: string, rows: number): HTMLTextAreaElement {
  const ta = el('textarea', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLTextAreaElement;
  ta.name = name;
  ta.rows = rows;
  return ta;
}

// ---------------------------------------------------------------------------
// Line Items Table
// ---------------------------------------------------------------------------

interface POLineRow {
  lineNumber: number;
  description: string;
  costCode: string;
  costType: string;
  quantity: number;
  unitCost: number;
  amount: number;
  receivedQuantity: number;
  invoicedQuantity: number;
  glAccount: string;
}

function buildLineItemsTable(lines: POLineRow[]): HTMLElement {
  const section = el('div', 'space-y-3');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Line Items'));

  const wrap = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['#', 'Description', 'Cost Code', 'Cost Type', 'Qty', 'Unit Cost', 'Amount', 'Received', 'Invoiced', 'GL Account', 'Actions']) {
    const align = ['Qty', 'Unit Cost', 'Amount', 'Received', 'Invoiced'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (lines.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No line items. Click "Add Line" to add PO line items.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const line of lines) {
    const tr = el('tr', 'border-b border-[var(--border)]');
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', String(line.lineNumber)));
    tr.appendChild(el('td', 'py-2 px-3', line.description));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', line.costCode));
    tr.appendChild(el('td', 'py-2 px-3', line.costType));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(line.quantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.unitCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(line.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', String(line.receivedQuantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', String(line.invoicedQuantity)));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', line.glAccount));
    const tdActions = el('td', 'py-2 px-3');
    const removeBtn = el('button', 'text-red-400 hover:text-red-300 text-sm', 'Remove');
    removeBtn.type = 'button';
    tdActions.appendChild(removeBtn);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);

  const addLineBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]', 'Add Line');
  addLineBtn.type = 'button';
  addLineBtn.addEventListener('click', () => { /* add line placeholder */ });
  section.appendChild(addLineBtn);

  return section;
}

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

function buildTotals(): HTMLElement {
  const section = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 mt-4');
  const grid = el('div', 'grid grid-cols-4 gap-4 text-sm');

  const buildTotal = (label: string, value: string): HTMLElement => {
    const group = el('div', 'text-right');
    group.appendChild(el('div', 'text-[var(--text-muted)]', label));
    group.appendChild(el('div', 'font-mono font-medium text-[var(--text)]', value));
    return group;
  };

  grid.appendChild(buildTotal('Subtotal', fmtCurrency(0)));
  grid.appendChild(buildTotal('Tax', fmtCurrency(0)));
  grid.appendChild(buildTotal('Shipping', fmtCurrency(0)));
  grid.appendChild(buildTotal('Total', fmtCurrency(0)));
  section.appendChild(grid);

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Purchase Order'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Purchase Orders') as HTMLAnchorElement;
    backLink.href = '#/po/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: PO Header
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'PO Header'));
    const headerGrid = el('div', 'grid grid-cols-3 gap-4');
    headerGrid.appendChild(buildField('PO Number', textInput('poNumber', 'PO-0001')));
    headerGrid.appendChild(buildField('PO Type', selectInput('type', TYPE_OPTIONS)));
    headerGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    headerGrid.appendChild(buildField('Vendor', textInput('vendorId', 'Select vendor')));
    headerGrid.appendChild(buildField('Job', textInput('jobId', 'Select job')));
    headerGrid.appendChild(buildField('Entity', textInput('entityId', 'Select entity')));
    headerGrid.appendChild(buildField('Issued Date', dateInput('issuedDate')));
    headerGrid.appendChild(buildField('Expected Date', dateInput('expectedDate')));
    headerGrid.appendChild(buildField('Terms', textInput('terms', 'Net 30')));
    form.appendChild(headerGrid);

    // Section: Ship To / Description
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Details'));
    const detailGrid = el('div', 'grid grid-cols-2 gap-4');
    detailGrid.appendChild(buildField('Ship To', textareaInput('shipTo', 2)));
    detailGrid.appendChild(buildField('Description', textareaInput('description', 2)));
    form.appendChild(detailGrid);

    // Section: Tax / Shipping
    const taxGrid = el('div', 'grid grid-cols-2 gap-4 mt-4');
    taxGrid.appendChild(buildField('Tax Amount', numberInput('taxAmount', '0.00')));
    taxGrid.appendChild(buildField('Shipping Amount', numberInput('shippingAmount', '0.00')));
    form.appendChild(taxGrid);

    // Section: Line Items
    const lines: POLineRow[] = [];
    form.appendChild(buildLineItemsTable(lines));

    // Section: Totals
    form.appendChild(buildTotals());

    // Section: Approval
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Approval'));
    const approvalGrid = el('div', 'grid grid-cols-2 gap-4');
    approvalGrid.appendChild(buildField('Approved By', textInput('approvedBy', 'Approver name')));
    approvalGrid.appendChild(buildField('Approved Date', dateInput('approvedAt')));
    form.appendChild(approvalGrid);

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');

    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save PO');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const submitBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-amber-600 text-white hover:opacity-90', 'Submit for Approval');
    submitBtn.type = 'button';
    submitBtn.addEventListener('click', () => { /* submit placeholder */ });
    btnRow.appendChild(submitBtn);

    const approveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Approve');
    approveBtn.type = 'button';
    approveBtn.addEventListener('click', () => { /* approve placeholder */ });
    btnRow.appendChild(approveBtn);

    const cancelPOBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Cancel PO');
    cancelPOBtn.type = 'button';
    cancelPOBtn.addEventListener('click', () => { /* cancel PO placeholder */ });
    btnRow.appendChild(cancelPOBtn);

    const closeBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-zinc-600 text-white hover:opacity-90', 'Close PO');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => { /* close PO placeholder */ });
    btnRow.appendChild(closeBtn);

    const backBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    backBtn.href = '#/po/list';
    btnRow.appendChild(backBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
