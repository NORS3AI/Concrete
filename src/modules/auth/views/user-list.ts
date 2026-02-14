/**
 * User List view.
 * Filterable table of users with status badges, role display, and search.
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
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'locked', label: 'Locked' },
  { value: 'pending', label: 'Pending' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Controller', label: 'Controller' },
  { value: 'PM', label: 'PM' },
  { value: 'AP Clerk', label: 'AP Clerk' },
  { value: 'Payroll', label: 'Payroll' },
  { value: 'Field', label: 'Field' },
  { value: 'Read-Only', label: 'Read-Only' },
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
  department: string;
  status: string;
  lastLogin: string;
  mfaEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
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
  for (const opt of ROLE_OPTIONS) {
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

function buildTable(users: UserRow[]): HTMLElement {
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
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', user.department));

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

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const buildCard = (label: string, value: string, accent?: boolean): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold ${accent ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Total Users', '0'));
  row.appendChild(buildCard('Active', '0', true));
  row.appendChild(buildCard('Locked', '0'));
  row.appendChild(buildCard('Pending', '0'));

  return row;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Users'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/auth/users/new';
    newBtn.textContent = 'New User';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());
    wrapper.appendChild(buildFilterBar((_status, _role, _search) => { /* filter placeholder */ }));

    const users: UserRow[] = [];
    wrapper.appendChild(buildTable(users));

    container.appendChild(wrapper);
  },
};
