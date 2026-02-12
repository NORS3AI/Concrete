/**
 * Project create/edit form view.
 * Full project details: name, job, dates, budget, manager, percent complete method.
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
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PCT_METHOD_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'cost', label: 'Cost-Based' },
  { value: 'units', label: 'Units-Based' },
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Project Details'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Projects') as HTMLAnchorElement;
    backLink.href = '#/project/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // General Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'General Information'));
    const genGrid = el('div', 'grid grid-cols-2 gap-4');
    genGrid.appendChild(buildField('Project Name', textInput('name', 'Enter project name')));
    genGrid.appendChild(buildField('Job ID', textInput('jobId', 'Link to job')));
    genGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    genGrid.appendChild(buildField('Project Manager', textInput('manager', 'Manager name')));
    form.appendChild(genGrid);

    // Schedule
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Schedule'));
    const schedGrid = el('div', 'grid grid-cols-2 gap-4');
    schedGrid.appendChild(buildField('Start Date', dateInput('startDate')));
    schedGrid.appendChild(buildField('End Date', dateInput('endDate')));
    schedGrid.appendChild(buildField('Baseline Start', dateInput('baselineStartDate')));
    schedGrid.appendChild(buildField('Baseline End', dateInput('baselineEndDate')));
    form.appendChild(schedGrid);

    // Budget & Progress
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Budget & Progress'));
    const budgetGrid = el('div', 'grid grid-cols-2 gap-4');
    budgetGrid.appendChild(buildField('Budgeted Cost', numberInput('budgetedCost', '0.00')));
    budgetGrid.appendChild(buildField('Actual Cost', numberInput('actualCost', '0.00')));
    budgetGrid.appendChild(buildField('% Complete Method', selectInput('percentCompleteMethod', PCT_METHOD_OPTIONS)));
    budgetGrid.appendChild(buildField('% Complete', numberInput('percentComplete', '0')));
    form.appendChild(budgetGrid);

    // Description
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Description'));
    form.appendChild(buildField('Project Description', textareaInput('description', 4), 2));

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Project');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/project/list';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
