/**
 * Entity create/edit form view.
 * Full entity details: identification, address, fiscal settings.
 * Clone button available when editing an existing entity.
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

const ENTITY_TYPES: Array<{ value: string; label: string }> = [
  { value: 'corporation', label: 'Corporation' },
  { value: 'llc', label: 'LLC' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'branch', label: 'Branch' },
  { value: 'division', label: 'Division' },
  { value: 'consolidation', label: 'Consolidation' },
];

const MONTHS: Array<{ value: string; label: string }> = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]';

// ---------------------------------------------------------------------------
// Field builders
// ---------------------------------------------------------------------------

function fieldGroup(labelText: string, inputEl: HTMLElement): HTMLElement {
  const group = el('div', 'flex flex-col gap-1');
  const label = el('label', 'text-sm font-medium text-[var(--text-muted)]', labelText);
  group.appendChild(label);
  group.appendChild(inputEl);
  return group;
}

function textInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', inputCls) as HTMLInputElement;
  input.type = 'text';
  input.name = name;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function emailInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', inputCls) as HTMLInputElement;
  input.type = 'email';
  input.name = name;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function selectInput(name: string, options: Array<{ value: string; label: string }>, includeBlank?: string): HTMLSelectElement {
  const select = el('select', inputCls) as HTMLSelectElement;
  select.name = name;
  if (includeBlank) {
    const blankOpt = el('option', '', includeBlank) as HTMLOptionElement;
    blankOpt.value = '';
    select.appendChild(blankOpt);
  }
  for (const opt of options) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    select.appendChild(o);
  }
  return select;
}

function numberInput(name: string, min: number, max: number, placeholder?: string): HTMLInputElement {
  const input = el('input', inputCls) as HTMLInputElement;
  input.type = 'number';
  input.name = name;
  input.min = String(min);
  input.max = String(max);
  if (placeholder) input.placeholder = placeholder;
  return input;
}

// ---------------------------------------------------------------------------
// Section builder
// ---------------------------------------------------------------------------

function section(title: string, children: HTMLElement[]): HTMLElement {
  const wrap = el('div', 'space-y-4');
  wrap.appendChild(el('h3', 'text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-1', title));
  for (const child of children) wrap.appendChild(child);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const isEdit = window.location.hash.match(/\/entities\/(?!new|org-chart|intercompany|consolidated|coa-overrides)([^/]+)/);
    const entityId = isEdit ? isEdit[1] : null;

    const wrapper = el('div', 'max-w-2xl mx-auto');

    // Page title
    const title = el('h1', 'text-2xl font-bold text-[var(--text)] mb-6', entityId ? 'Edit Entity' : 'New Entity');
    wrapper.appendChild(title);

    // Form card
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');
    form.setAttribute('data-role', 'entity-form');

    // -- Identification section --
    const codeInput = textInput('code', 'e.g. ACME-US');
    const nameInput = textInput('name', 'e.g. Acme Corp USA');
    const typeSelect = selectInput('type', ENTITY_TYPES, 'Select type...');
    const parentSelect = selectInput('parentId', [], 'None (top-level)');
    parentSelect.setAttribute('data-role', 'parent-select');
    const descArea = el('textarea', inputCls) as HTMLTextAreaElement;
    descArea.name = 'description';
    descArea.rows = 2;
    descArea.placeholder = 'Optional description...';
    const taxIdInput = textInput('taxId', 'e.g. 12-3456789');

    form.appendChild(section('Identification', [
      fieldGroup('Entity Code', codeInput),
      fieldGroup('Entity Name', nameInput),
      fieldGroup('Type', typeSelect),
      fieldGroup('Parent Entity', parentSelect),
      fieldGroup('Description', descArea),
      fieldGroup('Tax ID', taxIdInput),
    ]));

    // -- Address section --
    const row1 = el('div', 'grid grid-cols-1 gap-4');
    row1.appendChild(fieldGroup('Address', textInput('address', 'Street address')));

    const row2 = el('div', 'grid grid-cols-2 gap-4');
    row2.appendChild(fieldGroup('City', textInput('city', 'City')));
    row2.appendChild(fieldGroup('State / Province', textInput('state', 'State')));

    const row3 = el('div', 'grid grid-cols-2 gap-4');
    row3.appendChild(fieldGroup('ZIP / Postal Code', textInput('zip', 'ZIP')));
    row3.appendChild(fieldGroup('Country', textInput('country', 'US')));

    form.appendChild(section('Address', [row1, row2, row3]));

    // -- Contact section --
    const contactRow = el('div', 'grid grid-cols-2 gap-4');
    contactRow.appendChild(fieldGroup('Phone', textInput('phone', '+1 (555) 123-4567')));
    contactRow.appendChild(fieldGroup('Email', emailInput('email', 'admin@acme.com')));

    form.appendChild(section('Contact', [contactRow]));

    // -- Financial settings section --
    const currencyInput = textInput('currency', 'USD');
    currencyInput.value = 'USD';

    const fyRow = el('div', 'grid grid-cols-2 gap-4');
    fyRow.appendChild(fieldGroup('Fiscal Year End Month', selectInput('fyMonth', MONTHS)));
    fyRow.appendChild(fieldGroup('Fiscal Year End Day', numberInput('fyDay', 1, 31, '31')));

    form.appendChild(section('Financial Settings', [
      fieldGroup('Currency', currencyInput),
      fyRow,
    ]));

    // -- Buttons --
    const btnRow = el('div', 'flex items-center gap-3 pt-4 border-t border-[var(--border)]');

    const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save');
    saveBtn.type = 'submit';
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/entities';
    btnRow.appendChild(cancelBtn);

    if (entityId) {
      const cloneBtn = el('button', 'ml-auto px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Clone Entity');
      cloneBtn.type = 'button';
      cloneBtn.setAttribute('data-role', 'clone-entity');
      cloneBtn.addEventListener('click', () => { /* clone handler placeholder */ });
      btnRow.appendChild(cloneBtn);
    }

    form.appendChild(btnRow);

    // Form submit handler placeholder
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Service wiring will handle actual save
    });

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
