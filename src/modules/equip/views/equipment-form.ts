/**
 * Equipment create/edit form view.
 * Full equipment details with all fields for creating or editing equipment.
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

const CATEGORY_OPTIONS = [
  { value: 'owned', label: 'Owned' },
  { value: 'leased', label: 'Leased' },
  { value: 'rented', label: 'Rented' },
  { value: 'idle', label: 'Idle' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'disposed', label: 'Disposed' },
];

const DEPRECIATION_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'straight_line', label: 'Straight Line' },
  { value: 'macrs', label: 'MACRS' },
  { value: 'declining_balance', label: 'Declining Balance' },
];

const METER_UNIT_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'hours', label: 'Hours' },
  { value: 'miles', label: 'Miles' },
];

// ---------------------------------------------------------------------------
// Form Builder Helpers
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

function dateInput(name: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'date';
  input.name = name;
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment Details'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Equipment') as HTMLAnchorElement;
    backLink.href = '#/equipment';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: General Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'General Information'));
    const genGrid = el('div', 'grid grid-cols-2 gap-4');
    genGrid.appendChild(buildField('Equipment Number', textInput('equipmentNumber', 'e.g. EQ-001')));
    genGrid.appendChild(buildField('Description', textInput('description', 'Equipment description')));
    genGrid.appendChild(buildField('Category', selectInput('category', CATEGORY_OPTIONS)));
    genGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    genGrid.appendChild(buildField('Year', numberInput('year', 'e.g. 2024')));
    genGrid.appendChild(buildField('Make', textInput('make', 'Manufacturer')));
    genGrid.appendChild(buildField('Model', textInput('model', 'Model name')));
    genGrid.appendChild(buildField('Serial Number', textInput('serialNumber', 'Serial number')));
    genGrid.appendChild(buildField('VIN', textInput('vin', 'Vehicle identification number')));
    genGrid.appendChild(buildField('License Plate', textInput('licensePlate', 'License plate')));
    form.appendChild(genGrid);

    // Section: Financial Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Financial Information'));
    const finGrid = el('div', 'grid grid-cols-2 gap-4');
    finGrid.appendChild(buildField('Purchase Date', dateInput('purchaseDate')));
    finGrid.appendChild(buildField('Purchase Price', numberInput('purchasePrice', '0.00')));
    finGrid.appendChild(buildField('Current Value', numberInput('currentValue', '0.00')));
    finGrid.appendChild(buildField('Salvage Value', numberInput('salvageValue', '0.00')));
    finGrid.appendChild(buildField('Useful Life (Months)', numberInput('usefulLifeMonths', '60')));
    finGrid.appendChild(buildField('Depreciation Method', selectInput('depreciationMethod', DEPRECIATION_OPTIONS)));
    form.appendChild(finGrid);

    // Section: Meter & Location
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Meter & Location'));
    const meterGrid = el('div', 'grid grid-cols-2 gap-4');
    meterGrid.appendChild(buildField('Meter Reading', numberInput('meterReading', '0')));
    meterGrid.appendChild(buildField('Meter Unit', selectInput('meterUnit', METER_UNIT_OPTIONS)));
    meterGrid.appendChild(buildField('Location Description', textareaInput('locationDescription', 2), 2));
    form.appendChild(meterGrid);

    // Section: Assignment
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Assignment'));
    const assignGrid = el('div', 'grid grid-cols-2 gap-4');
    assignGrid.appendChild(buildField('Assigned Job', textInput('assignedJobId', 'Job ID')));
    assignGrid.appendChild(buildField('Entity', textInput('entityId', 'Entity ID')));
    form.appendChild(assignGrid);

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Equipment');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/equipment';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
