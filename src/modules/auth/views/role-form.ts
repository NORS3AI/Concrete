/**
 * Role create/edit form view.
 * Includes permission checkboxes as a resource x action grid.
 * Wired to AuthService for live data.
 */

import { getAuthService } from '../service-accessor';

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

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 5000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESOURCES = [
  { id: 'gl.account', label: 'GL Accounts' },
  { id: 'gl.journal', label: 'GL Journal' },
  { id: 'job.job', label: 'Jobs' },
  { id: 'job.costCode', label: 'Cost Codes' },
  { id: 'job.budget', label: 'Job Budget' },
  { id: 'ap.vendor', label: 'Vendors' },
  { id: 'ap.bill', label: 'Bills' },
  { id: 'ar.customer', label: 'Customers' },
  { id: 'ar.invoice', label: 'Invoices' },
  { id: 'entity.entity', label: 'Entities' },
  { id: 'payroll.employee', label: 'Employees' },
  { id: 'payroll.timeEntry', label: 'Time Entries' },
  { id: 'doc.document', label: 'Documents' },
  { id: 'estimate', label: 'Estimates' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'auth.user', label: 'User Management' },
];

const ACTIONS = ['create', 'read', 'update', 'delete', 'export', 'approve', 'admin'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PermissionRule {
  resource: string;
  actions: string[];
}

interface RolePermissions {
  rules: PermissionRule[];
}

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

function buildPermissionGrid(existingPermissions?: RolePermissions): HTMLElement {
  const section = el('div', 'mt-4');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Permissions'));
  section.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Select the actions allowed for each resource. Check the boxes to grant access.'));

  // Build a lookup set for existing permissions
  const permLookup = new Set<string>();
  if (existingPermissions?.rules) {
    for (const rule of existingPermissions.rules) {
      for (const action of rule.actions) {
        permLookup.add(`${rule.resource}:${action}`);
      }
    }
  }

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

      // Pre-check if this permission exists
      if (permLookup.has(`${resource.id}:${action}`)) {
        checkbox.checked = true;
      }

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

/**
 * Collect all checked permissions from the form into a RolePermissions structure.
 */
function collectPermissions(form: HTMLElement): RolePermissions {
  const resourceActionMap = new Map<string, string[]>();

  const checkboxes = form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-resource][data-action]');
  for (const cb of checkboxes) {
    if (!cb.checked) continue;
    const resource = cb.dataset.resource!;
    const action = cb.dataset.action!;
    if (!resourceActionMap.has(resource)) {
      resourceActionMap.set(resource, []);
    }
    resourceActionMap.get(resource)!.push(action);
  }

  const rules: PermissionRule[] = [];
  for (const [resource, actions] of resourceActionMap) {
    rules.push({ resource, actions });
  }

  return { rules };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const svc = getAuthService();

    // Determine create vs. edit mode from hash
    const hash = window.location.hash; // e.g. #/auth/roles/new or #/auth/roles/{id}
    const segments = hash.replace('#/', '').split('/');
    const idParam = segments[2]; // 'new' or an actual ID
    const isCreate = idParam === 'new';

    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isCreate ? 'Create Role' : 'Edit Role'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Roles') as HTMLAnchorElement;
    backLink.href = '#/auth/roles';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Load existing role data if editing
    let existingRole: ReturnType<typeof svc.getRole> = null;
    let existingPermissions: RolePermissions | undefined;
    if (!isCreate) {
      existingRole = svc.getRole(idParam);
      if (!existingRole) {
        showMsg(wrapper, `Role with ID "${idParam}" not found.`, true);
        container.appendChild(wrapper);
        return;
      }
      // Parse permissions JSON
      try {
        existingPermissions = JSON.parse(existingRole.permissions || '{"rules":[]}');
      } catch {
        existingPermissions = { rules: [] };
      }
    }

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // ------- Section: Role Information -------
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Role Information'));
    const infoGrid = el('div', 'grid grid-cols-2 gap-4');

    const nameInput = textInput('name', 'Enter role name');
    const priorityInput = numberInput('priority', '0');

    if (existingRole) {
      nameInput.value = existingRole.name;
      priorityInput.value = String(existingRole.priority ?? 0);
      // Built-in roles: name is read-only
      if (existingRole.isBuiltIn) {
        nameInput.readOnly = true;
        nameInput.className += ' opacity-60 cursor-not-allowed';
      }
    }

    infoGrid.appendChild(buildField('Role Name *', nameInput));
    infoGrid.appendChild(buildField('Priority', priorityInput));
    form.appendChild(infoGrid);

    const descInput = textareaInput('description', 3);
    if (existingRole) {
      descInput.value = existingRole.description ?? '';
    }
    form.appendChild(buildField('Description', descInput));

    // ------- Permission Grid -------
    form.appendChild(buildPermissionGrid(existingPermissions));

    // ------- Action Buttons -------
    const btnRow = el('div', 'flex items-center gap-3 mt-6');

    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', isCreate ? 'Create Role' : 'Save Changes');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      const description = descInput.value.trim();
      const priority = parseInt(priorityInput.value, 10) || 0;

      if (!name) {
        showMsg(card, 'Role name is required.', true);
        return;
      }

      // Collect permissions from the grid
      const permissions = collectPermissions(form);
      const permissionsJson = JSON.stringify(permissions);

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        if (isCreate) {
          await svc.createRole({
            name,
            description,
            permissions: permissionsJson,
            priority,
          });
        } else {
          await svc.updateRole(idParam, {
            name: existingRole?.isBuiltIn ? undefined : name,
            description,
            permissions: permissionsJson,
            priority,
          });
        }

        // Navigate back to list
        window.location.hash = '#/auth/roles';
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to save role.';
        showMsg(card, message, true);
        saveBtn.disabled = false;
        saveBtn.textContent = isCreate ? 'Create Role' : 'Save Changes';
      }
    });
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
