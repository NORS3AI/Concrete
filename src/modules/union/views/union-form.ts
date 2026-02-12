/**
 * Union Form view.
 * Create/edit form for union master file records.
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
];

const FIELD_CLS = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';
const LABEL_CLS = 'block text-sm font-medium text-[var(--text-muted)] mb-1';

// ---------------------------------------------------------------------------
// Form Field Builder
// ---------------------------------------------------------------------------

function buildField(label: string, inputEl: HTMLElement): HTMLElement {
  const group = el('div', 'mb-4');
  group.appendChild(el('label', LABEL_CLS, label));
  group.appendChild(inputEl);
  return group;
}

function textInput(placeholder?: string): HTMLInputElement {
  const input = el('input', FIELD_CLS) as HTMLInputElement;
  input.type = 'text';
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function selectInput(options: { value: string; label: string }[]): HTMLSelectElement {
  const select = el('select', FIELD_CLS) as HTMLSelectElement;
  for (const opt of options) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    select.appendChild(o);
  }
  return select;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-2xl');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Union'));
    const backBtn = el('a', 'text-sm text-[var(--accent)] hover:underline') as HTMLAnchorElement;
    backBtn.href = '#/union/unions';
    backBtn.textContent = 'Back to Unions';
    headerRow.appendChild(backBtn);
    wrapper.appendChild(headerRow);

    const form = el('form', 'space-y-0');

    const row1 = el('div', 'grid grid-cols-2 gap-4');
    row1.appendChild(buildField('Union Name *', textInput('e.g., IBEW')));
    row1.appendChild(buildField('Local Number *', textInput('e.g., Local 134')));
    form.appendChild(row1);

    const row2 = el('div', 'grid grid-cols-2 gap-4');
    row2.appendChild(buildField('Trade *', textInput('e.g., Electrician')));
    row2.appendChild(buildField('Jurisdiction', textInput('e.g., Cook County, IL')));
    form.appendChild(row2);

    form.appendChild(buildField('Status', selectInput(STATUS_OPTIONS)));

    const contactHeader = el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-3', 'Contact Information');
    form.appendChild(contactHeader);

    const row3 = el('div', 'grid grid-cols-3 gap-4');
    row3.appendChild(buildField('Contact Name', textInput()));
    row3.appendChild(buildField('Phone', textInput()));
    row3.appendChild(buildField('Email', textInput()));
    form.appendChild(row3);

    const addressHeader = el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-3', 'Address');
    form.appendChild(addressHeader);

    form.appendChild(buildField('Address', textInput()));

    const row4 = el('div', 'grid grid-cols-3 gap-4');
    row4.appendChild(buildField('City', textInput()));
    row4.appendChild(buildField('State', textInput()));
    row4.appendChild(buildField('ZIP', textInput()));
    form.appendChild(row4);

    const btnRow = el('div', 'flex gap-3 mt-6');
    const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Union');
    saveBtn.setAttribute('type', 'submit');
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]') as HTMLAnchorElement;
    cancelBtn.href = '#/union/unions';
    cancelBtn.textContent = 'Cancel';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    wrapper.appendChild(form);
    container.appendChild(wrapper);
  },
};
