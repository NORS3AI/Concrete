/**
 * Service Agreement create/edit form view.
 * Full agreement details with customer, type, SLA, billing, and covered equipment.
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
  { value: 'full_service', label: 'Full Service' },
  { value: 'preventive', label: 'Preventive Only' },
  { value: 'on_call', label: 'On Call' },
  { value: 'warranty', label: 'Warranty' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
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
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Service Agreement'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Agreements') as HTMLAnchorElement;
    backLink.href = '#/service/agreements';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: Agreement Details
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Agreement Details'));
    const detailsGrid = el('div', 'grid grid-cols-2 gap-4');
    detailsGrid.appendChild(buildField('Agreement Name', textInput('name', 'Enter agreement name')));
    detailsGrid.appendChild(buildField('Customer', textInput('customerId', 'Select customer')));
    detailsGrid.appendChild(buildField('Type', selectInput('type', TYPE_OPTIONS)));
    detailsGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    detailsGrid.appendChild(buildField('Start Date', dateInput('startDate')));
    detailsGrid.appendChild(buildField('End Date', dateInput('endDate')));
    detailsGrid.appendChild(buildField('Renewal Date', dateInput('renewalDate')));
    detailsGrid.appendChild(buildField('Response Time SLA', textInput('responseTimeSla', 'e.g., 4 hours')));
    form.appendChild(detailsGrid);

    // Section: Billing
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Billing'));
    const billingGrid = el('div', 'grid grid-cols-2 gap-4');
    billingGrid.appendChild(buildField('Recurring Amount', numberInput('recurringAmount', '0.00')));
    billingGrid.appendChild(buildField('Billing Frequency', selectInput('billingFrequency', BILLING_OPTIONS)));
    form.appendChild(billingGrid);

    // Section: Coverage & Terms
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Coverage & Terms'));
    form.appendChild(buildField('Covered Equipment', textareaInput('coveredEquipment', 3), 2));
    form.appendChild(buildField('Terms', textareaInput('terms', 3), 2));
    form.appendChild(buildField('Description', textareaInput('description', 3), 2));

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Agreement');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const renewBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Renew');
    renewBtn.type = 'button';
    renewBtn.addEventListener('click', () => { /* renew placeholder */ });
    btnRow.appendChild(renewBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/service/agreements';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
