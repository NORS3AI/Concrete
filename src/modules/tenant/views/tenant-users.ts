/**
 * Tenant Users view.
 * User management: invite, roles, status, remove.
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

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'suspended', label: 'Suspended' },
];

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  admin: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  member: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  viewer: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  invited: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  suspended: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  userId: string;
  role: string;
  status: string;
  invitedAt: string;
  joinedAt: string;
}

// ---------------------------------------------------------------------------
// Invite Modal
// ---------------------------------------------------------------------------

function buildInviteForm(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-4', 'Invite User'));

  const grid = el('div', 'grid grid-cols-3 gap-4');

  const emailGroup = el('div', '');
  emailGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Email / User ID'));
  const emailInput = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  emailInput.type = 'text';
  emailInput.placeholder = 'user@example.com';
  emailGroup.appendChild(emailInput);
  grid.appendChild(emailGroup);

  const roleGroup = el('div', '');
  roleGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Role'));
  const roleSelect = el('select', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLSelectElement;
  for (const opt of [{ value: 'admin', label: 'Admin' }, { value: 'member', label: 'Member' }, { value: 'viewer', label: 'Viewer' }]) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    roleSelect.appendChild(o);
  }
  roleGroup.appendChild(roleSelect);
  grid.appendChild(roleGroup);

  const btnGroup = el('div', 'flex items-end');
  const inviteBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Send Invite');
  inviteBtn.type = 'button';
  inviteBtn.addEventListener('click', () => { /* invite placeholder */ });
  btnGroup.appendChild(inviteBtn);
  grid.appendChild(btnGroup);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (role: string, status: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search users...';
  bar.appendChild(searchInput);

  const roleSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of ROLE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    roleSelect.appendChild(o);
  }
  bar.appendChild(roleSelect);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => onFilter(roleSelect.value, statusSelect.value, searchInput.value);
  roleSelect.addEventListener('change', fire);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(users: UserRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['User ID', 'Role', 'Status', 'Invited', 'Joined', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (users.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No users found. Invite team members to get started.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const user of users) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', user.userId));

    const tdRole = el('td', 'py-2 px-3');
    const roleBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[user.role] ?? ROLE_BADGE.member}`,
      user.role.charAt(0).toUpperCase() + user.role.slice(1));
    tdRole.appendChild(roleBadge);
    tr.appendChild(tdRole);

    const tdStatus = el('td', 'py-2 px-3');
    const statusBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[user.status] ?? STATUS_BADGE.active}`,
      user.status.charAt(0).toUpperCase() + user.status.slice(1));
    tdStatus.appendChild(statusBadge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', user.invitedAt ? user.invitedAt.split('T')[0] : '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', user.joinedAt ? user.joinedAt.split('T')[0] : '-'));

    const tdActions = el('td', 'py-2 px-3');
    if (user.role !== 'owner') {
      const changeRoleBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Change Role');
      changeRoleBtn.type = 'button';
      changeRoleBtn.addEventListener('click', () => { /* change role placeholder */ });
      tdActions.appendChild(changeRoleBtn);

      const removeBtn = el('button', 'text-red-400 hover:underline text-sm', 'Remove');
      removeBtn.type = 'button';
      removeBtn.addEventListener('click', () => { /* remove placeholder */ });
      tdActions.appendChild(removeBtn);
    } else {
      tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'Owner'));
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Tenant Users'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Tenants') as HTMLAnchorElement;
    backLink.href = '#/tenant/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Usage indicator
    const usageBar = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
    const usageRow = el('div', 'flex items-center justify-between mb-2');
    usageRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'User Seats'));
    usageRow.appendChild(el('span', 'text-sm font-mono text-[var(--text)]', '0 / 10 used'));
    usageBar.appendChild(usageRow);
    const progressOuter = el('div', 'w-full h-2 bg-[var(--surface)] rounded-full overflow-hidden');
    const progressInner = el('div', 'h-full bg-[var(--accent)] rounded-full');
    progressInner.style.width = '0%';
    progressOuter.appendChild(progressInner);
    usageBar.appendChild(progressOuter);
    wrapper.appendChild(usageBar);

    wrapper.appendChild(buildInviteForm());
    wrapper.appendChild(buildFilterBar((_role, _status, _search) => { /* filter placeholder */ }));

    const users: UserRow[] = [];
    wrapper.appendChild(buildTable(users));

    container.appendChild(wrapper);
  },
};
