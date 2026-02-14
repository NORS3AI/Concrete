/**
 * Tenant List view.
 * Filterable table of tenants with plan badges, status, user count, and storage.
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
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PLAN_OPTIONS = [
  { value: '', label: 'All Plans' },
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  trial: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  suspended: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  starter: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  professional: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  enterprise: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  dataRegion: string;
  userCount: number;
  maxUsers: number;
  storageUsedMb: number;
  storageLimitMb: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, plan: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search tenants...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const planSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of PLAN_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    planSelect.appendChild(o);
  }
  bar.appendChild(planSelect);

  const fire = () => onFilter(statusSelect.value, planSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  planSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Total Tenants', '0', 'text-[var(--accent)]'));
  row.appendChild(buildCard('Active', '0', 'text-emerald-400'));
  row.appendChild(buildCard('Trial', '0', 'text-blue-400'));
  row.appendChild(buildCard('Suspended', '0', 'text-amber-400'));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(tenants: TenantRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Slug', 'Status', 'Plan', 'Region', 'Users', 'Storage', 'Created', 'Actions']) {
    const align = ['Users', 'Storage'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (tenants.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No tenants found. Create your first tenant to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const tenant of tenants) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline font-medium', tenant.name) as HTMLAnchorElement;
    link.href = `#/tenant/${tenant.id}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', tenant.slug));

    const tdStatus = el('td', 'py-2 px-3');
    const statusBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[tenant.status] ?? STATUS_BADGE.active}`,
      tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1));
    tdStatus.appendChild(statusBadge);
    tr.appendChild(tdStatus);

    const tdPlan = el('td', 'py-2 px-3');
    const planBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGE[tenant.plan] ?? PLAN_BADGE.free}`,
      tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1));
    tdPlan.appendChild(planBadge);
    tr.appendChild(tdPlan);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] uppercase', tenant.dataRegion));

    const userPct = tenant.maxUsers > 0 ? Math.round((tenant.userCount / tenant.maxUsers) * 100) : 0;
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', `${tenant.userCount}/${tenant.maxUsers} (${userPct}%)`));

    const storagePct = tenant.storageLimitMb > 0 ? Math.round((tenant.storageUsedMb / tenant.storageLimitMb) * 100) : 0;
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', `${tenant.storageUsedMb}/${tenant.storageLimitMb} MB (${storagePct}%)`));

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', tenant.createdAt.split('T')[0]));

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Manage') as HTMLAnchorElement;
    editLink.href = `#/tenant/${tenant.id}`;
    tdActions.appendChild(editLink);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Tenants'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/tenant/new';
    newBtn.textContent = 'New Tenant';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());
    wrapper.appendChild(buildFilterBar((_status, _plan, _search) => { /* filter placeholder */ }));

    const tenants: TenantRow[] = [];
    wrapper.appendChild(buildTable(tenants));

    container.appendChild(wrapper);
  },
};
