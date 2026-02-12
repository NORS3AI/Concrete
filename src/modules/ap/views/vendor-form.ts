/**
 * Vendor create/edit form view.
 * Full vendor details with all fields for creating or editing a vendor.
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

const TYPE_OPTIONS = [
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'professional', label: 'Professional Services' },
  { value: 'utility', label: 'Utility' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'blocked', label: 'Blocked' },
];

const PAYMENT_TERM_OPTIONS = [
  { value: 'net10', label: 'Net 10' },
  { value: 'net15', label: 'Net 15' },
  { value: 'net30', label: 'Net 30' },
  { value: 'net45', label: 'Net 45' },
  { value: 'net60', label: 'Net 60' },
  { value: 'net90', label: 'Net 90' },
  { value: 'due_on_receipt', label: 'Due on Receipt' },
];

const FORM_1099_TYPE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'NEC', label: '1099-NEC' },
  { value: 'MISC', label: '1099-MISC' },
  { value: 'INT', label: '1099-INT' },
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

function checkboxInput(name: string, label: string): HTMLElement {
  const wrapper = el('div', 'flex items-center gap-2');
  const input = el('input', 'rounded border-[var(--border)]') as HTMLInputElement;
  input.type = 'checkbox';
  input.name = name;
  wrapper.appendChild(input);
  wrapper.appendChild(el('span', 'text-sm text-[var(--text)]', label));
  return wrapper;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Vendor Details'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Vendors') as HTMLAnchorElement;
    backLink.href = '#/ap/vendors';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: General Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'General Information'));
    const genGrid = el('div', 'grid grid-cols-2 gap-4');
    genGrid.appendChild(buildField('Vendor Code', textInput('code', 'Auto-generated if blank')));
    genGrid.appendChild(buildField('Vendor Name', textInput('name', 'Enter vendor name')));
    genGrid.appendChild(buildField('DBA / Trade Name', textInput('dba', 'Doing business as')));
    genGrid.appendChild(buildField('Type', selectInput('type', TYPE_OPTIONS)));
    genGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    genGrid.appendChild(buildField('Tax ID (EIN/SSN)', textInput('taxId', 'XX-XXXXXXX')));
    form.appendChild(genGrid);

    // Section: Contact Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Contact Information'));
    const contactGrid = el('div', 'grid grid-cols-2 gap-4');
    contactGrid.appendChild(buildField('Contact Name', textInput('contactName', 'Primary contact')));
    contactGrid.appendChild(buildField('Contact Title', textInput('contactTitle', 'Title')));
    contactGrid.appendChild(buildField('Phone', textInput('phone', '(555) 555-5555')));
    contactGrid.appendChild(buildField('Fax', textInput('fax', '(555) 555-5555')));
    contactGrid.appendChild(buildField('Email', textInput('email', 'email@example.com')));
    contactGrid.appendChild(buildField('Website', textInput('website', 'https://')));
    form.appendChild(contactGrid);

    // Section: Address
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Address'));
    const addrGrid = el('div', 'grid grid-cols-2 gap-4');
    addrGrid.appendChild(buildField('Address Line 1', textInput('address1', 'Street address')));
    addrGrid.appendChild(buildField('Address Line 2', textInput('address2', 'Suite, unit, etc.')));
    addrGrid.appendChild(buildField('City', textInput('city', 'City')));
    addrGrid.appendChild(buildField('State', textInput('state', 'State')));
    addrGrid.appendChild(buildField('ZIP Code', textInput('zip', 'ZIP code')));
    addrGrid.appendChild(buildField('Country', textInput('country', 'Country')));
    form.appendChild(addrGrid);

    // Section: Payment & Terms
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Payment & Terms'));
    const payGrid = el('div', 'grid grid-cols-2 gap-4');
    payGrid.appendChild(buildField('Payment Terms', selectInput('paymentTerms', PAYMENT_TERM_OPTIONS)));
    payGrid.appendChild(buildField('Default GL Account', textInput('defaultGLAccount', 'GL account number')));
    payGrid.appendChild(buildField('Credit Limit', numberInput('creditLimit', '0.00')));
    payGrid.appendChild(buildField('Default Retention %', numberInput('defaultRetentionPct', '0')));
    form.appendChild(payGrid);

    // Section: 1099 & Tax
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', '1099 & Tax Information'));
    const taxGrid = el('div', 'grid grid-cols-2 gap-4');
    taxGrid.appendChild(buildField('1099 Type', selectInput('form1099Type', FORM_1099_TYPE_OPTIONS)));
    taxGrid.appendChild(buildField('1099 Threshold', numberInput('form1099Threshold', '600.00')));
    const checkboxGroup = el('div', 'col-span-2 flex items-center gap-6 mt-2');
    checkboxGroup.appendChild(checkboxInput('is1099', 'Subject to 1099 reporting'));
    checkboxGroup.appendChild(checkboxInput('w9Received', 'W-9 received on file'));
    taxGrid.appendChild(checkboxGroup);
    form.appendChild(taxGrid);

    // Section: Insurance & Compliance
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Insurance & Compliance'));
    const insGrid = el('div', 'grid grid-cols-2 gap-4');
    insGrid.appendChild(buildField('Insurance Carrier', textInput('insuranceCarrier', 'Carrier name')));
    insGrid.appendChild(buildField('Policy Number', textInput('insurancePolicyNumber', 'Policy number')));
    insGrid.appendChild(buildField('Insurance Expiry', textInput('insuranceExpiry', 'YYYY-MM-DD')));
    insGrid.appendChild(buildField('License Number', textInput('licenseNumber', 'License number')));
    insGrid.appendChild(buildField('License Expiry', textInput('licenseExpiry', 'YYYY-MM-DD')));
    form.appendChild(insGrid);

    // Section: Notes
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Notes'));
    form.appendChild(buildField('Internal Notes', textareaInput('notes', 4), 2));

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Vendor');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/ap/vendors';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
