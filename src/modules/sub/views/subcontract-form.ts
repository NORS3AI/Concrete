/**
 * Subcontract create/edit form view.
 * Full subcontract details with all fields for creating or editing a subcontract.
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
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'complete', label: 'Complete' },
  { value: 'closed', label: 'Closed' },
  { value: 'terminated', label: 'Terminated' },
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Subcontract Details'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Subcontracts') as HTMLAnchorElement;
    backLink.href = '#/sub/contracts';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: General Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'General Information'));
    const genGrid = el('div', 'grid grid-cols-2 gap-4');
    genGrid.appendChild(buildField('Subcontract Number', textInput('number', 'e.g. SC-001')));
    genGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    genGrid.appendChild(buildField('Subcontractor (Vendor)', textInput('vendorId', 'Select vendor')));
    genGrid.appendChild(buildField('Job', textInput('jobId', 'Select job')));
    genGrid.appendChild(buildField('Description', textInput('description', 'Brief description'), 2));
    form.appendChild(genGrid);

    // Section: Scope of Work
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Scope of Work'));
    form.appendChild(buildField('Scope', textareaInput('scope', 4), 2));

    // Section: Financial
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Financial'));
    const finGrid = el('div', 'grid grid-cols-2 gap-4');
    finGrid.appendChild(buildField('Original Contract Amount', numberInput('contractAmount', '0.00')));
    finGrid.appendChild(buildField('Retention %', numberInput('retentionPct', '10')));
    form.appendChild(finGrid);

    // Section: Computed fields (read-only summary)
    const summaryGrid = el('div', 'grid grid-cols-3 gap-4 mt-4');
    const readOnly = (label: string, value: string): HTMLElement => {
      const div = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3');
      div.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
      div.appendChild(el('div', 'text-sm font-mono font-medium text-[var(--text)]', value));
      return div;
    };
    summaryGrid.appendChild(readOnly('Approved COs', '$0.00'));
    summaryGrid.appendChild(readOnly('Revised Amount', '$0.00'));
    summaryGrid.appendChild(readOnly('Billed to Date', '$0.00'));
    summaryGrid.appendChild(readOnly('Paid to Date', '$0.00'));
    summaryGrid.appendChild(readOnly('Retainage Held', '$0.00'));
    summaryGrid.appendChild(readOnly('Remaining', '$0.00'));
    form.appendChild(summaryGrid);

    // Section: Schedule
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Schedule'));
    const schedGrid = el('div', 'grid grid-cols-2 gap-4');
    schedGrid.appendChild(buildField('Start Date', dateInput('startDate')));
    schedGrid.appendChild(buildField('End Date', dateInput('endDate')));
    form.appendChild(schedGrid);

    // Section: Entity
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Entity'));
    const entityGrid = el('div', 'grid grid-cols-2 gap-4');
    entityGrid.appendChild(buildField('Entity', textInput('entityId', 'Select entity')));
    form.appendChild(entityGrid);

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Subcontract');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/sub/contracts';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
