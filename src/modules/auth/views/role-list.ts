/**
 * Role List view.
 * Displays roles with permission summary, built-in badge, and user count.
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
// Types
// ---------------------------------------------------------------------------

interface RoleRow {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  priority: number;
  userCount: number;
  permissionCount: number;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(roles: RoleRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Description', 'Type', 'Priority', 'Users', 'Permissions', 'Actions']) {
    const align = col === 'Priority' || col === 'Users' || col === 'Permissions'
      ? 'py-2 px-3 font-medium text-center'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (roles.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No roles found. Initialize built-in roles to get started.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const role of roles) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3 font-medium');
    const link = el('a', 'text-[var(--accent)] hover:underline', role.name) as HTMLAnchorElement;
    link.href = `#/auth/roles/${role.id}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', role.description));

    const tdType = el('td', 'py-2 px-3');
    if (role.isBuiltIn) {
      tdType.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20', 'Built-in'));
    } else {
      tdType.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20', 'Custom'));
    }
    tr.appendChild(tdType);

    tr.appendChild(el('td', 'py-2 px-3 text-center text-[var(--text)]', String(role.priority)));
    tr.appendChild(el('td', 'py-2 px-3 text-center text-[var(--text)]', String(role.userCount)));
    tr.appendChild(el('td', 'py-2 px-3 text-center text-[var(--text)]', String(role.permissionCount)));

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/auth/roles/${role.id}`;
    tdActions.appendChild(editLink);
    if (!role.isBuiltIn) {
      const deleteBtn = el('button', 'text-red-400 hover:underline text-sm ml-2', 'Delete');
      deleteBtn.type = 'button';
      deleteBtn.addEventListener('click', () => { /* delete placeholder */ });
      tdActions.appendChild(deleteBtn);
    }
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

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

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Roles'));
    const btnGroup = el('div', 'flex items-center gap-2');
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/auth/roles/new';
    newBtn.textContent = 'New Role';
    btnGroup.appendChild(newBtn);
    const initBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Init Built-in Roles');
    initBtn.type = 'button';
    initBtn.addEventListener('click', () => { /* init placeholder */ });
    btnGroup.appendChild(initBtn);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    const roles: RoleRow[] = [];
    wrapper.appendChild(buildTable(roles));

    container.appendChild(wrapper);
  },
};
