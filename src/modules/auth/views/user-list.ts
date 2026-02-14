/**
 * User List view.
 * Filterable table of users with status badges, role display, and search.
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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'locked', label: 'Locked' },
  { value: 'pending', label: 'Pending' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  locked: 'bg-red-500/10 text-red-400 border border-red-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  roleId: string;
  department: string;
  status: string;
  lastLogin: string;
  mfaEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  roleOptions: { value: string; label: string }[],
  onFilter: (status: string, role: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search users...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const roleSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of roleOptions) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    roleSelect.appendChild(o);
  }
  bar.appendChild(roleSelect);

  const fire = () => onFilter(statusSelect.value, roleSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  roleSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(users: UserRow[], wrapper: HTMLElement, reRender: () => void): HTMLElement {
  const svc = getAuthService();
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Username', 'Name', 'Email', 'Role', 'Department', 'Status', 'MFA', 'Last Login', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (users.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No users found. Create your first user to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const user of users) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdUsername = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', user.username) as HTMLAnchorElement;
    link.href = `#/auth/users/${user.id}`;
    tdUsername.appendChild(link);
    tr.appendChild(tdUsername);

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', user.displayName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', user.email));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', user.role));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', user.department || ''));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[user.status] ?? STATUS_BADGE.active}`,
      user.status.charAt(0).toUpperCase() + user.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdMfa = el('td', 'py-2 px-3');
    if (user.mfaEnabled) {
      tdMfa.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'On'));
    } else {
      tdMfa.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'Off'));
    }
    tr.appendChild(tdMfa);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', user.lastLogin || 'Never'));

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/auth/users/${user.id}`;
    tdActions.appendChild(editLink);

    // Deactivate button (for active users only)
    if (user.status === 'active') {
      const deactivateBtn = el('button', 'text-red-400 hover:underline text-sm ml-2', 'Deactivate');
      deactivateBtn.type = 'button';
      deactivateBtn.addEventListener('click', async () => {
        if (!confirm(`Deactivate user "${user.username}"? They will no longer be able to log in.`)) return;
        try {
          await svc.deactivateUser(user.id);
          showMsg(wrapper, `User "${user.username}" has been deactivated.`, false);
          reRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to deactivate user.';
          showMsg(wrapper, message, true);
        }
      });
      tdActions.appendChild(deactivateBtn);
    }

    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(counts: Record<string, number>): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const total = (counts.active ?? 0) + (counts.inactive ?? 0) + (counts.locked ?? 0) + (counts.pending ?? 0);

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Total Users', String(total)));
  row.appendChild(buildCard('Active', String(counts.active ?? 0), 'text-emerald-400'));
  row.appendChild(buildCard('Locked', String(counts.locked ?? 0), 'text-red-400'));
  row.appendChild(buildCard('Pending', String(counts.pending ?? 0), 'text-amber-400'));

  return row;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const svc = getAuthService();
    const wrapper = el('div', 'space-y-0');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Users'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/auth/users/new';
    newBtn.textContent = 'New User';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Load data and render
    const roles = svc.getRoles();
    const roleMap = new Map<string, string>();
    for (const r of roles) {
      if (r.id) roleMap.set(r.id, r.name);
    }

    // Build role filter options from live data
    const roleFilterOptions: { value: string; label: string }[] = [
      { value: '', label: 'All Roles' },
    ];
    for (const r of roles) {
      roleFilterOptions.push({ value: r.id!, label: r.name });
    }

    const statusCounts = svc.getUserCountByStatus();
    wrapper.appendChild(buildSummaryCards(statusCounts));

    // State for filtering
    let currentStatus = '';
    let currentRoleId = '';
    let currentSearch = '';

    const tableContainer = el('div', '');

    const self = this;
    function loadAndRenderTable(): void {
      // Build server-side filters
      const filters: { status?: string; roleId?: string; department?: string } = {};
      if (currentStatus) filters.status = currentStatus;
      if (currentRoleId) filters.roleId = currentRoleId;

      const allUsers = svc.getUsers(filters);

      // Client-side search filter on username/displayName/email
      const searchLower = currentSearch.toLowerCase();
      const filtered = searchLower
        ? allUsers.filter((u) =>
            (u.username ?? '').toLowerCase().includes(searchLower) ||
            (u.displayName ?? '').toLowerCase().includes(searchLower) ||
            (u.email ?? '').toLowerCase().includes(searchLower),
          )
        : allUsers;

      const userRows: UserRow[] = filtered.map((u) => ({
        id: u.id!,
        username: u.username ?? '',
        displayName: u.displayName ?? '',
        email: u.email ?? '',
        role: roleMap.get(u.roleId ?? '') ?? 'Unassigned',
        roleId: u.roleId ?? '',
        department: u.department ?? '',
        status: u.status ?? 'active',
        lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '',
        mfaEnabled: u.mfaEnabled ?? false,
      }));

      tableContainer.innerHTML = '';
      tableContainer.appendChild(buildTable(userRows, wrapper, () => {
        // Full re-render on deactivation
        self.render(container);
      }));
    }

    wrapper.appendChild(buildFilterBar(roleFilterOptions, (status, roleId, search) => {
      currentStatus = status;
      currentRoleId = roleId;
      currentSearch = search;
      loadAndRenderTable();
    }));

    wrapper.appendChild(tableContainer);
    loadAndRenderTable();

    container.appendChild(wrapper);
  },
};
