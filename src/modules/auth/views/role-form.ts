/**
 * Role create/edit form view.
 * Includes permission checkboxes as a resource x action grid.
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

const RESOURCES = [
  { id: 'gl.*', label: 'General Ledger' },
  { id: 'ap.*', label: 'Accounts Payable' },
  { id: 'ar.*', label: 'Accounts Receivable' },
  { id: 'payroll.*', label: 'Payroll' },
  { id: 'job.*', label: 'Job Costing' },
  { id: 'sub.*', label: 'Subcontracts' },
  { id: 'equip.*', label: 'Equipment' },
  { id: 'hr.employee', label: 'HR / Employees' },
  { id: 'safety.*', label: 'Safety' },
  { id: 'report.*', label: 'Reports' },
  { id: 'auth.user', label: 'User Management' },
  { id: 'auth.role', label: 'Role Management' },
  { id: 'auth.session', label: 'Sessions' },
  { id: 'auth.apiKey', label: 'API Keys' },
  { id: 'auth.auditLog', label: 'Audit Log' },
  { id: 'auth.settings', label: 'Auth Settings' },
];

const ACTIONS = ['create', 'read', 'update', 'delete', 'export', 'approve', 'admin'];

// ---------------------------------------------------------------------------
// Form Builder
// ---------------------------------------------------------------------------

function buildField(
  label: string,
  inputEl: HTMLElement,
): HTMLElement {
  const group = el('div', '');
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
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function textareaInput(name: string, rows: number): HTMLTextAreaElement {
  const ta = el('textarea', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLTextAreaElement;
  ta.name = name;
  ta.rows = rows;
  return ta;
}

// ---------------------------------------------------------------------------
// Permission Grid
// ---------------------------------------------------------------------------

function buildPermissionGrid(): HTMLElement {
  const section = el('div', 'mt-4');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Permissions'));
  section.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Select the actions allowed for each resource. Check the boxes to grant access.'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  // Header
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  headRow.appendChild(el('th', 'py-2 px-3 font-medium', 'Resource'));
  for (const action of ACTIONS) {
    const th = el('th', 'py-2 px-3 font-medium text-center text-xs uppercase');
    th.textContent = action;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body
  const tbody = el('tbody');
  for (const resource of RESOURCES) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)] font-medium', resource.label));

    for (const action of ACTIONS) {
      const td = el('td', 'py-2 px-3 text-center');
      const checkbox = el('input', 'rounded border-[var(--border)] text-[var(--accent)]') as HTMLInputElement;
      checkbox.type = 'checkbox';
      checkbox.name = `perm_${resource.id}_${action}`;
      checkbox.dataset.resource = resource.id;
      checkbox.dataset.action = action;
      td.appendChild(checkbox);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  // Select All row
  const selectAllRow = el('tr', 'border-t-2 border-[var(--border)] bg-[var(--surface)]');
  const selectAllLabel = el('td', 'py-2 px-3 text-[var(--text)] font-semibold', 'Select All');
  selectAllRow.appendChild(selectAllLabel);
  for (const action of ACTIONS) {
    const td = el('td', 'py-2 px-3 text-center');
    const checkbox = el('input', 'rounded border-[var(--border)] text-[var(--accent)]') as HTMLInputElement;
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', () => {
      const allBoxes = tbody.querySelectorAll<HTMLInputElement>(`input[data-action="${action}"]`);
      allBoxes.forEach((box) => { box.checked = checkbox.checked; });
    });
    td.appendChild(checkbox);
    selectAllRow.appendChild(td);
  }
  tbody.appendChild(selectAllRow);

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Role Details'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Roles') as HTMLAnchorElement;
    backLink.href = '#/auth/roles';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: Role Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Role Information'));
    const infoGrid = el('div', 'grid grid-cols-2 gap-4');
    infoGrid.appendChild(buildField('Role Name', textInput('name', 'Enter role name')));
    infoGrid.appendChild(buildField('Priority', numberInput('priority', '0')));
    form.appendChild(infoGrid);

    form.appendChild(buildField('Description', textareaInput('description', 3)));

    // Permission Grid
    form.appendChild(buildPermissionGrid());

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Role');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/auth/roles';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
