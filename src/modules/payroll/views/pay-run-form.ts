/**
 * Pay Run create/edit form view.
 * Allows setting pay period and date, adding employee checks, and
 * advancing the pay run through its workflow (draft -> processing -> completed).
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

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  processing: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  voided: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Form Builder
// ---------------------------------------------------------------------------

function buildField(label: string, inputEl: HTMLElement): HTMLElement {
  const group = el('div', '');
  group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', label));
  group.appendChild(inputEl);
  return group;
}

function dateInput(name: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'date';
  input.name = name;
  return input;
}

function textInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'text';
  input.name = name;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const grid = el('div', 'grid grid-cols-5 gap-4 mb-6');

  const items = [
    { label: 'Total Gross', value: '$0.00' },
    { label: 'Total Taxes', value: '$0.00' },
    { label: 'Total Deductions', value: '$0.00' },
    { label: 'Total Net', value: '$0.00' },
    { label: 'Employees', value: '0' },
  ];

  for (const item of items) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', item.label));
    card.appendChild(el('div', 'text-lg font-bold text-[var(--text)] font-mono', item.value));
    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Checks Table
// ---------------------------------------------------------------------------

function buildChecksTable(): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Employee', 'Hours', 'OT Hours', 'Gross', 'Fed Tax', 'State Tax', 'FICA SS', 'FICA Med', 'Deductions', 'Net']) {
    const align = col === 'Employee' ? 'py-2 px-3 font-medium' : 'py-2 px-3 font-medium text-right';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  const tr = el('tr');
  const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No checks added yet. Use the form above to add employee checks.');
  td.setAttribute('colspan', '10');
  tr.appendChild(td);
  tbody.appendChild(tr);
  table.appendChild(tbody);

  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Pay Run'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Pay Runs') as HTMLAnchorElement;
    backLink.href = '#/payroll/pay-runs';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Pay Run details form
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-6');

    const formGrid = el('div', 'grid grid-cols-3 gap-4 mb-4');
    formGrid.appendChild(buildField('Period Start', dateInput('periodStart')));
    formGrid.appendChild(buildField('Period End', dateInput('periodEnd')));
    formGrid.appendChild(buildField('Pay Date', dateInput('payDate')));
    card.appendChild(formGrid);

    // Status and workflow buttons
    const actionRow = el('div', 'flex items-center gap-3');

    const statusBadge = el('span', `px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE.draft}`, 'Draft');
    actionRow.appendChild(statusBadge);

    const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    actionRow.appendChild(saveBtn);

    const processBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-amber-600 text-white hover:opacity-90', 'Process');
    processBtn.type = 'button';
    processBtn.addEventListener('click', () => { /* process placeholder */ });
    actionRow.appendChild(processBtn);

    const completeBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Complete');
    completeBtn.type = 'button';
    completeBtn.addEventListener('click', () => { /* complete placeholder */ });
    actionRow.appendChild(completeBtn);

    const voidBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Void');
    voidBtn.type = 'button';
    voidBtn.addEventListener('click', () => { /* void placeholder */ });
    actionRow.appendChild(voidBtn);

    card.appendChild(actionRow);
    wrapper.appendChild(card);

    // Add check form
    const addCheckCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-6');
    addCheckCard.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Employee Check'));
    const addGrid = el('div', 'grid grid-cols-3 gap-3');
    addGrid.appendChild(buildField('Employee ID', textInput('addEmployeeId', 'Employee ID')));
    const addBtnWrap = el('div', 'flex items-end');
    const addCheckBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Calculate & Add');
    addCheckBtn.type = 'button';
    addCheckBtn.addEventListener('click', () => { /* add check placeholder */ });
    addBtnWrap.appendChild(addCheckBtn);
    addGrid.appendChild(addBtnWrap);
    addCheckCard.appendChild(addGrid);
    wrapper.appendChild(addCheckCard);

    // Summary
    wrapper.appendChild(buildSummaryCards());

    // Checks table
    wrapper.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Pay Checks'));
    wrapper.appendChild(buildChecksTable());

    container.appendChild(wrapper);
  },
};
