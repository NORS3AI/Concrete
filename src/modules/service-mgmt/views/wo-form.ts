/**
 * Work Order create/edit form view.
 * Full work order details with type, customer, equipment, priority,
 * pricing type, and line items.
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

const TYPE_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'on_demand', label: 'On Demand' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'callback', label: 'Callback' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'emergency', label: 'Emergency' },
];

const PRICING_OPTIONS = [
  { value: 'tm', label: 'Time & Material' },
  { value: 'flat_rate', label: 'Flat Rate' },
];

const LINE_TYPE_OPTIONS = [
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Form Builder
// ---------------------------------------------------------------------------

function buildField(label: string, inputEl: HTMLElement, colSpan?: number): HTMLElement {
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
// Line Items
// ---------------------------------------------------------------------------

interface WOLine {
  lineType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  partNumber: string;
}

function buildLineItemsTable(lines: WOLine[]): HTMLElement {
  const section = el('div', 'space-y-3');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Line Items'));

  const wrap = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Type', 'Description', 'Part #', 'Qty', 'Unit Price', 'Amount', 'Actions']) {
    const align = ['Qty', 'Unit Price', 'Amount'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (lines.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No line items. Click "Add Line" to add labor, materials, or other charges.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const line of lines) {
    const tr = el('tr', 'border-b border-[var(--border)]');
    tr.appendChild(el('td', 'py-2 px-3', line.lineType));
    tr.appendChild(el('td', 'py-2 px-3', line.description));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', line.partNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-right', String(line.quantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.unitPrice)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(line.amount)));
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
  const grid = el('div', 'grid grid-cols-3 gap-4 text-sm');

  const buildTotal = (label: string, value: string): HTMLElement => {
    const group = el('div', 'text-right');
    group.appendChild(el('div', 'text-[var(--text-muted)]', label));
    group.appendChild(el('div', 'font-mono font-medium text-[var(--text)]', value));
    return group;
  };

  grid.appendChild(buildTotal('Labor Total', fmtCurrency(0)));
  grid.appendChild(buildTotal('Material Total', fmtCurrency(0)));
  grid.appendChild(buildTotal('Grand Total', fmtCurrency(0)));
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Work Order'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Work Orders') as HTMLAnchorElement;
    backLink.href = '#/service/work-orders';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: Work Order Header
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Work Order Details'));
    const headerGrid = el('div', 'grid grid-cols-2 gap-4');
    headerGrid.appendChild(buildField('WO Number', textInput('number', 'Auto-generated')));
    headerGrid.appendChild(buildField('Customer', textInput('customerId', 'Select customer')));
    headerGrid.appendChild(buildField('Type', selectInput('type', TYPE_OPTIONS)));
    headerGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    headerGrid.appendChild(buildField('Priority', selectInput('priority', PRIORITY_OPTIONS)));
    headerGrid.appendChild(buildField('Pricing Type', selectInput('pricingType', PRICING_OPTIONS)));
    headerGrid.appendChild(buildField('Scheduled Date', dateInput('scheduledDate')));
    headerGrid.appendChild(buildField('Time Slot', textInput('scheduledTimeSlot', 'e.g., 8:00 AM - 12:00 PM')));
    headerGrid.appendChild(buildField('Assigned To', textInput('assignedTo', 'Select technician')));
    headerGrid.appendChild(buildField('Equipment', textInput('customerEquipmentId', 'Select equipment')));
    headerGrid.appendChild(buildField('Flat Rate Amount', numberInput('flatRateAmount', '0.00')));
    headerGrid.appendChild(buildField('Agreement', textInput('agreementId', 'Select agreement')));
    form.appendChild(headerGrid);

    // Section: Description
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Problem & Resolution'));
    form.appendChild(buildField('Problem Description', textareaInput('problemDescription', 3), 2));
    form.appendChild(buildField('Resolution', textareaInput('resolution', 3), 2));

    // Section: Line Items (unused variables suppressed)
    void LINE_TYPE_OPTIONS;
    const lines: WOLine[] = [];
    form.appendChild(buildLineItemsTable(lines));

    // Section: Totals
    form.appendChild(buildTotals());

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Work Order');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const completeBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Complete');
    completeBtn.type = 'button';
    completeBtn.addEventListener('click', () => { /* complete placeholder */ });
    btnRow.appendChild(completeBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/service/work-orders';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
