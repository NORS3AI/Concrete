/**
 * Customer create/edit form view.
 * Full customer details with all fields for creating or editing a customer.
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

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'hold', label: 'Hold' },
];

const TERMS_OPTIONS = [
  { value: 'net10', label: 'Net 10' },
  { value: 'net15', label: 'Net 15' },
  { value: 'net30', label: 'Net 30' },
  { value: 'net45', label: 'Net 45' },
  { value: 'net60', label: 'Net 60' },
  { value: 'net90', label: 'Net 90' },
  { value: 'due_on_receipt', label: 'Due on Receipt' },
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
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Customer Details'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Customers') as HTMLAnchorElement;
    backLink.href = '#/ar/customers';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: General Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'General Information'));
    const genGrid = el('div', 'grid grid-cols-2 gap-4');
    genGrid.appendChild(buildField('Customer Code', textInput('code', 'Auto-generated if blank')));
    genGrid.appendChild(buildField('Customer Name', textInput('name', 'Enter customer name')));
    genGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    genGrid.appendChild(buildField('Credit Limit', numberInput('creditLimit', '0.00')));
    form.appendChild(genGrid);

    // Section: Contact Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Contact Information'));
    const contactGrid = el('div', 'grid grid-cols-2 gap-4');
    contactGrid.appendChild(buildField('Contact Name', textInput('contactName', 'Primary contact')));
    contactGrid.appendChild(buildField('Contact Phone', textInput('contactPhone', '(555) 555-5555')));
    contactGrid.appendChild(buildField('Contact Email', textInput('contactEmail', 'email@example.com')));
    form.appendChild(contactGrid);

    // Section: Address
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Address'));
    const addrGrid = el('div', 'grid grid-cols-2 gap-4');
    addrGrid.appendChild(buildField('Address', textInput('address', 'Street address')));
    addrGrid.appendChild(buildField('City', textInput('city', 'City')));
    addrGrid.appendChild(buildField('State', textInput('state', 'State')));
    addrGrid.appendChild(buildField('ZIP Code', textInput('zip', 'ZIP code')));
    form.appendChild(addrGrid);

    // Section: Billing Terms
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Billing Terms'));
    const termsGrid = el('div', 'grid grid-cols-2 gap-4');
    termsGrid.appendChild(buildField('Payment Terms', selectInput('terms', TERMS_OPTIONS)));
    termsGrid.appendChild(buildField('Entity', textInput('entityId', 'Select entity')));
    form.appendChild(termsGrid);

    // Section: Notes
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Notes'));
    form.appendChild(buildField('Internal Notes', textareaInput('notes', 4), 2));

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Customer');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/ar/customers';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
