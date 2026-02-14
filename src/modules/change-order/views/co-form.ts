/**
 * Change Order create/edit form view.
 * Full CO details with line items (cost breakdown), markup, schedule extension.
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
  { value: 'owner', label: 'Owner' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'internal', label: 'Internal' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'executed', label: 'Executed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'voided', label: 'Voided' },
];

// ---------------------------------------------------------------------------
// Form Builder Helpers
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
// Line Items Table
// ---------------------------------------------------------------------------

interface COLineItem {
  lineNumber: number;
  costType: string;
  description: string;
  quantity: number;
  unitCost: number;
  amount: number;
  markupPct: number;
  markup: number;
  totalWithMarkup: number;
}

function buildLineItemsTable(lineItems: COLineItem[]): HTMLElement {
  const section = el('div', 'space-y-3');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Cost Breakdown'));

  const wrap = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['#', 'Cost Type', 'Description', 'Qty', 'Unit Cost', 'Amount', 'Markup %', 'Markup', 'Total', 'Actions']) {
    const align = ['Qty', 'Unit Cost', 'Amount', 'Markup %', 'Markup', 'Total'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (lineItems.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No line items. Click "Add Line" to add cost items.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const line of lineItems) {
    const tr = el('tr', 'border-b border-[var(--border)]');
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', String(line.lineNumber)));
    tr.appendChild(el('td', 'py-2 px-3', line.costType));
    tr.appendChild(el('td', 'py-2 px-3', line.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(line.quantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.unitCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', `${line.markupPct}%`));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(line.markup)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(line.totalWithMarkup)));
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

  grid.appendChild(buildTotal('Subtotal', fmtCurrency(0)));
  grid.appendChild(buildTotal('Total Markup', fmtCurrency(0)));
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Change Order'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Change Orders') as HTMLAnchorElement;
    backLink.href = '#/change-orders/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: CO Header
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Change Order Details'));
    const headerGrid = el('div', 'grid grid-cols-2 gap-4');
    headerGrid.appendChild(buildField('CO Number', textInput('number', 'CO-001')));
    headerGrid.appendChild(buildField('Title', textInput('title', 'Change order title')));
    headerGrid.appendChild(buildField('Type', selectInput('type', TYPE_OPTIONS)));
    headerGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    headerGrid.appendChild(buildField('Job', textInput('jobId', 'Select job')));
    headerGrid.appendChild(buildField('Effective Date', dateInput('effectiveDate')));
    headerGrid.appendChild(buildField('Schedule Extension (Days)', numberInput('scheduleExtensionDays', '0')));
    headerGrid.appendChild(buildField('Request (PCO)', textInput('requestId', 'Link to PCO (optional)')));
    form.appendChild(headerGrid);

    // Section: Description/Scope
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Scope'));
    form.appendChild(buildField('Description', textareaInput('description', 3), 2));
    form.appendChild(buildField('Scope Description', textareaInput('scopeDescription', 3), 2));

    // Section: Line Items
    const lineItems: COLineItem[] = [];
    form.appendChild(buildLineItemsTable(lineItems));

    // Section: Totals
    form.appendChild(buildTotals());

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const submitBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Submit for Approval');
    submitBtn.type = 'button';
    submitBtn.addEventListener('click', () => { /* submit placeholder */ });
    btnRow.appendChild(submitBtn);

    const executeBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:opacity-90', 'Execute');
    executeBtn.type = 'button';
    executeBtn.addEventListener('click', () => { /* execute placeholder */ });
    btnRow.appendChild(executeBtn);

    const voidBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Void');
    voidBtn.type = 'button';
    voidBtn.addEventListener('click', () => { /* void placeholder */ });
    btnRow.appendChild(voidBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/change-orders/list';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
