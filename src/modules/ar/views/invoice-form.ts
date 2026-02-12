/**
 * AR Invoice create/edit form view.
 * Supports progress, T&M, unit-price, cost-plus, and lump-sum billing types
 * with line items, retainage, and tax calculations.
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
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'voided', label: 'Voided' },
];

const BILLING_TYPE_OPTIONS = [
  { value: 'progress', label: 'Progress Billing' },
  { value: 'tm', label: 'Time & Material' },
  { value: 'unit_price', label: 'Unit Price' },
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'lump_sum', label: 'Lump Sum' },
];

// ---------------------------------------------------------------------------
// Form Builder
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

interface InvoiceLine {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  costCode: string;
  costType: string;
  markupPct: number;
}

function buildLineItemsTable(lines: InvoiceLine[]): HTMLElement {
  const section = el('div', 'space-y-3');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Line Items'));

  const wrap = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['#', 'Description', 'Qty', 'Unit Price', 'Amount', 'Cost Code', 'Cost Type', 'Markup %', 'Actions']) {
    const align = ['Qty', 'Unit Price', 'Amount', 'Markup %'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (lines.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No line items. Click "Add Line" to add invoice line items.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const line of lines) {
    const tr = el('tr', 'border-b border-[var(--border)]');
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', String(line.lineNumber)));
    tr.appendChild(el('td', 'py-2 px-3', line.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(line.quantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.unitPrice)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(line.amount)));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', line.costCode));
    tr.appendChild(el('td', 'py-2 px-3', line.costType));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', `${line.markupPct}%`));
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
  const grid = el('div', 'grid grid-cols-5 gap-4 text-sm');

  const buildTotal = (label: string, value: string): HTMLElement => {
    const group = el('div', 'text-right');
    group.appendChild(el('div', 'text-[var(--text-muted)]', label));
    group.appendChild(el('div', 'font-mono font-medium text-[var(--text)]', value));
    return group;
  };

  grid.appendChild(buildTotal('Subtotal', fmtCurrency(0)));
  grid.appendChild(buildTotal('Retainage', fmtCurrency(0)));
  grid.appendChild(buildTotal('Tax', fmtCurrency(0)));
  grid.appendChild(buildTotal('Net Amount', fmtCurrency(0)));
  grid.appendChild(buildTotal('Balance Due', fmtCurrency(0)));
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'AR Invoice'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Invoices') as HTMLAnchorElement;
    backLink.href = '#/ar/invoices';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: Invoice Header
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Invoice Header'));
    const headerGrid = el('div', 'grid grid-cols-2 gap-4');
    headerGrid.appendChild(buildField('Customer', textInput('customerId', 'Select customer')));
    headerGrid.appendChild(buildField('Job', textInput('jobId', 'Select job')));
    headerGrid.appendChild(buildField('Invoice Number', textInput('invoiceNumber', 'Invoice number')));
    headerGrid.appendChild(buildField('Billing Type', selectInput('billingType', BILLING_TYPE_OPTIONS)));
    headerGrid.appendChild(buildField('Invoice Date', dateInput('invoiceDate')));
    headerGrid.appendChild(buildField('Due Date', dateInput('dueDate')));
    headerGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    headerGrid.appendChild(buildField('Retainage %', numberInput('retainagePct', '0')));
    headerGrid.appendChild(buildField('Tax Amount', numberInput('taxAmount', '0.00')));
    form.appendChild(headerGrid);

    // Section: Description
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Description'));
    form.appendChild(buildField('Description', textareaInput('description', 3), 2));

    // Section: Line Items
    const lines: InvoiceLine[] = [];
    form.appendChild(buildLineItemsTable(lines));

    // Section: Totals
    form.appendChild(buildTotals());

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Invoice');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const sendBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Send Invoice');
    sendBtn.type = 'button';
    sendBtn.addEventListener('click', () => { /* send placeholder */ });
    btnRow.appendChild(sendBtn);

    const voidBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Void');
    voidBtn.type = 'button';
    voidBtn.addEventListener('click', () => { /* void placeholder */ });
    btnRow.appendChild(voidBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/ar/invoices';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
