/**
 * Role List view.
 * Displays roles with permission summary, built-in badge, and user count.
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

function buildTable(roles: RoleRow[], wrapper: HTMLElement, reRender: () => void): HTMLElement {
  const svc = getAuthService();
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
      deleteBtn.addEventListener('click', async () => {
        if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
        try {
          await svc.deleteRole(role.id);
          showMsg(wrapper, `Role "${role.name}" has been deleted.`, false);
          reRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to delete role. It may have users assigned.';
          showMsg(wrapper, message, true);
        }
      });
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

    const svc = getAuthService();
    const self = this;
    const wrapper = el('div', 'space-y-0');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Roles'));
    const btnGroup = el('div', 'flex items-center gap-2');

    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/auth/roles/new';
    newBtn.textContent = 'New Role';
    btnGroup.appendChild(newBtn);

    const initBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Init Built-in Roles');
    initBtn.type = 'button';
    initBtn.addEventListener('click', async () => {
      try {
        const count = await svc.initBuiltInRoles();
        if (count > 0) {
          showMsg(wrapper, `${count} built-in role(s) created successfully.`, false);
        } else {
          showMsg(wrapper, 'All built-in roles already exist.', false);
        }
        // Re-render to show new roles
        self.render(container);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to initialize built-in roles.';
        showMsg(wrapper, message, true);
      }
    });
    btnGroup.appendChild(initBtn);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    // Load roles and compute user counts
    const allRoles = svc.getRoles();
    const allUsers = svc.getUsers();

    // Count users per role
    const userCountByRole = new Map<string, number>();
    for (const u of allUsers) {
      const rid = u.roleId ?? '';
      userCountByRole.set(rid, (userCountByRole.get(rid) ?? 0) + 1);
    }

    // Build role rows
    const roleRows: RoleRow[] = allRoles.map((r) => {
      let permissionCount = 0;
      try {
        const perms = JSON.parse(r.permissions || '{"rules":[]}');
        permissionCount = Array.isArray(perms.rules) ? perms.rules.length : 0;
      } catch {
        permissionCount = 0;
      }

      return {
        id: r.id!,
        name: r.name,
        description: r.description ?? '',
        isBuiltIn: r.isBuiltIn ?? false,
        priority: r.priority ?? 0,
        userCount: userCountByRole.get(r.id!) ?? 0,
        permissionCount,
      };
    });

    wrapper.appendChild(buildTable(roleRows, wrapper, () => {
      self.render(container);
    }));

    container.appendChild(wrapper);
  },
};
