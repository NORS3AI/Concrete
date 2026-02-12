/**
 * Export Wizard view.
 * Configure and execute data exports with collection selection,
 * column selection, filters, and format options (CSV, JSON, PDF, TSV, API).
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

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV (Comma-Separated Values)', icon: '\u{1F4C4}', description: 'Standard spreadsheet format compatible with Excel, Google Sheets' },
  { value: 'tsv', label: 'TSV (Tab-Separated Values)', icon: '\u{1F4CB}', description: 'Tab-delimited format for data interchange' },
  { value: 'json', label: 'JSON (JavaScript Object Notation)', icon: '\u{1F4C1}', description: 'Structured data format preserving all field types' },
  { value: 'pdf', label: 'PDF Report with Letterhead', icon: '\u{1F4D1}', description: 'Formatted report with company letterhead for printing' },
  { value: 'api', label: 'API Format (JSON with Pagination)', icon: '\u{1F310}', description: 'Paginated JSON with metadata for API integration' },
];

const COLLECTION_OPTIONS = [
  { value: 'ap/vendor', label: 'AP Vendors', fields: ['name', 'code', 'taxId', 'vendorType', 'status', 'phone', 'email', 'ytdPayments', 'is1099'] },
  { value: 'ap/invoice', label: 'AP Invoices', fields: ['vendorId', 'invoiceNumber', 'invoiceDate', 'dueDate', 'amount', 'taxAmount', 'retentionAmount', 'netAmount', 'paidAmount', 'balanceDue', 'status'] },
  { value: 'ar/customer', label: 'AR Customers', fields: ['name', 'code', 'status', 'creditLimit', 'balance'] },
  { value: 'ar/invoice', label: 'AR Invoices', fields: ['customerId', 'invoiceNumber', 'invoiceDate', 'dueDate', 'amount', 'status'] },
  { value: 'gl/account', label: 'GL Accounts', fields: ['accountNumber', 'accountName', 'accountType', 'normalBalance', 'balance'] },
  { value: 'gl/journalEntry', label: 'GL Journal Entries', fields: ['entryNumber', 'date', 'description', 'debit', 'credit', 'status'] },
  { value: 'job/job', label: 'Jobs', fields: ['jobNumber', 'name', 'status', 'contractAmount', 'billedToDate', 'costToDate'] },
  { value: 'entity/entity', label: 'Entities', fields: ['name', 'entityType', 'taxId', 'status'] },
  { value: 'payroll/employee', label: 'Payroll Employees', fields: ['firstName', 'lastName', 'employeeId', 'status', 'hireDate', 'payRate'] },
];

// ---------------------------------------------------------------------------
// Format Selection Cards
// ---------------------------------------------------------------------------

function buildFormatCards(selectedFormat: string): HTMLElement {
  const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6');

  for (const format of FORMAT_OPTIONS) {
    const isSelected = format.value === selectedFormat;
    const cardCls = isSelected
      ? 'bg-[var(--surface-raised)] border-2 border-[var(--accent)] rounded-lg p-4 cursor-pointer transition-all'
      : 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 cursor-pointer hover:border-[var(--accent)] transition-all';

    const card = el('div', cardCls);

    const titleRow = el('div', 'flex items-center gap-2 mb-2');
    titleRow.appendChild(el('span', 'text-lg', format.icon));
    titleRow.appendChild(el('span', 'font-medium text-[var(--text)]', format.label));
    card.appendChild(titleRow);

    card.appendChild(el('p', 'text-xs text-[var(--text-muted)]', format.description));

    if (isSelected) {
      const selectedBadge = el('div', 'mt-2');
      selectedBadge.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', 'Selected'));
      card.appendChild(selectedBadge);
    }

    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Column Selection
// ---------------------------------------------------------------------------

function buildColumnSelection(fields: string[]): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'Column Selection'));
  card.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Choose which columns to include in the export. Click to toggle.'));

  const selectAllRow = el('div', 'flex items-center gap-2 mb-3');
  const selectAllCb = el('input') as HTMLInputElement;
  selectAllCb.type = 'checkbox';
  selectAllCb.checked = true;
  selectAllCb.className = 'rounded border-[var(--border)]';
  selectAllRow.appendChild(selectAllCb);
  selectAllRow.appendChild(el('span', 'text-sm font-medium text-[var(--text)]', 'Select All'));
  card.appendChild(selectAllRow);

  const fieldGrid = el('div', 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2');
  for (const field of fields) {
    const fieldRow = el('label', 'flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--surface)] cursor-pointer');
    const cb = el('input') as HTMLInputElement;
    cb.type = 'checkbox';
    cb.checked = true;
    cb.className = 'rounded border-[var(--border)]';
    fieldRow.appendChild(cb);
    fieldRow.appendChild(el('span', 'text-sm text-[var(--text)]', field));
    fieldGrid.appendChild(fieldRow);
  }
  card.appendChild(fieldGrid);

  return card;
}

// ---------------------------------------------------------------------------
// Filter Panel
// ---------------------------------------------------------------------------

function buildFilterPanel(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'Filters'));
  card.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Optionally filter exported data by date range, entity, or job.'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';
  const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4');

  const dateFromGroup = el('div');
  dateFromGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Date From'));
  const dateFromInput = el('input', inputCls) as HTMLInputElement;
  dateFromInput.type = 'date';
  dateFromGroup.appendChild(dateFromInput);
  grid.appendChild(dateFromGroup);

  const dateToGroup = el('div');
  dateToGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Date To'));
  const dateToInput = el('input', inputCls) as HTMLInputElement;
  dateToInput.type = 'date';
  dateToGroup.appendChild(dateToInput);
  grid.appendChild(dateToGroup);

  const entityGroup = el('div');
  entityGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Entity'));
  const entitySelect = el('select', inputCls) as HTMLSelectElement;
  entitySelect.appendChild(el('option', '', 'All Entities') as HTMLOptionElement);
  entityGroup.appendChild(entitySelect);
  grid.appendChild(entityGroup);

  const jobGroup = el('div');
  jobGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Job'));
  const jobSelect = el('select', inputCls) as HTMLSelectElement;
  jobSelect.appendChild(el('option', '', 'All Jobs') as HTMLOptionElement);
  jobGroup.appendChild(jobSelect);
  grid.appendChild(jobGroup);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Letterhead Config (for PDF)
// ---------------------------------------------------------------------------

function buildLetterheadConfig(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'PDF Letterhead'));
  card.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Configure the letterhead for PDF report exports.'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';
  const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 gap-4');

  const companyGroup = el('div');
  companyGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Company Name'));
  const companyInput = el('input', inputCls) as HTMLInputElement;
  companyInput.type = 'text';
  companyInput.placeholder = 'Acme Construction Inc.';
  companyGroup.appendChild(companyInput);
  grid.appendChild(companyGroup);

  const addressGroup = el('div');
  addressGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Address'));
  const addressInput = el('input', inputCls) as HTMLInputElement;
  addressInput.type = 'text';
  addressInput.placeholder = '123 Main St, City, ST 12345';
  addressGroup.appendChild(addressInput);
  grid.appendChild(addressGroup);

  const phoneGroup = el('div');
  phoneGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Phone'));
  const phoneInput = el('input', inputCls) as HTMLInputElement;
  phoneInput.type = 'tel';
  phoneInput.placeholder = '(555) 555-0100';
  phoneGroup.appendChild(phoneInput);
  grid.appendChild(phoneGroup);

  const emailGroup = el('div');
  emailGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Email'));
  const emailInput = el('input', inputCls) as HTMLInputElement;
  emailInput.type = 'email';
  emailInput.placeholder = 'info@acmeconstruction.com';
  emailGroup.appendChild(emailInput);
  grid.appendChild(emailGroup);

  card.appendChild(grid);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Export Data'));
    wrapper.appendChild(headerRow);

    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';

    const collectionCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
    collectionCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'Select Collection'));
    const collectionSelect = el('select', inputCls) as HTMLSelectElement;
    const defaultOpt = el('option', '', 'Choose a data type to export...') as HTMLOptionElement;
    defaultOpt.value = '';
    collectionSelect.appendChild(defaultOpt);
    for (const opt of COLLECTION_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      collectionSelect.appendChild(o);
    }
    collectionCard.appendChild(collectionSelect);
    wrapper.appendChild(collectionCard);

    wrapper.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Export Format'));
    wrapper.appendChild(buildFormatCards('csv'));

    wrapper.appendChild(buildColumnSelection(COLLECTION_OPTIONS[0].fields));
    wrapper.appendChild(buildFilterPanel());
    wrapper.appendChild(buildLetterheadConfig());

    const delimiterCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
    delimiterCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'Delimiter'));
    const delimGrid = el('div', 'flex gap-3');
    const delimiterOptions = [
      { value: ',', label: 'Comma (,)' },
      { value: '\t', label: 'Tab' },
      { value: '|', label: 'Pipe (|)' },
      { value: ';', label: 'Semicolon (;)' },
    ];
    for (const delim of delimiterOptions) {
      const btn = el('button', 'px-4 py-2 rounded-md text-sm border transition-colors bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent)]', delim.label);
      delimGrid.appendChild(btn);
    }
    delimiterCard.appendChild(delimGrid);
    wrapper.appendChild(delimiterCard);

    const apiCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
    apiCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'API Pagination'));
    const apiGrid = el('div', 'grid grid-cols-2 gap-4');
    const pageGroup = el('div');
    pageGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Page'));
    const pageInput = el('input', inputCls) as HTMLInputElement;
    pageInput.type = 'number';
    pageInput.value = '1';
    pageInput.min = '1';
    pageGroup.appendChild(pageInput);
    apiGrid.appendChild(pageGroup);
    const pageSizeGroup = el('div');
    pageSizeGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Page Size'));
    const pageSizeInput = el('input', inputCls) as HTMLInputElement;
    pageSizeInput.type = 'number';
    pageSizeInput.value = '50';
    pageSizeInput.min = '1';
    pageSizeInput.max = '1000';
    pageSizeGroup.appendChild(pageSizeInput);
    apiGrid.appendChild(pageSizeGroup);
    apiCard.appendChild(apiGrid);
    wrapper.appendChild(apiCard);

    const actions = el('div', 'flex justify-end gap-3 mt-4');
    const exportBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Export Data');
    actions.appendChild(exportBtn);
    wrapper.appendChild(actions);

    container.appendChild(wrapper);
  },
};
