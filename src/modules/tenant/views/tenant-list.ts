/**
 * Tenant List view.
 * Filterable table of tenants with plan badges, status, user count, and storage.
 * Wired to TenantService for live data.
 */

import { getTenantService } from '../service-accessor';

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

function buildSummaryCards(tenants: TenantRow[]): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const total = tenants.length;
  const activeCount = tenants.filter((t) => t.status === 'active').length;
  const trialCount = tenants.filter((t) => t.status === 'trial').length;
  const suspendedCount = tenants.filter((t) => t.status === 'suspended').length;

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Total Tenants', String(total), 'text-[var(--accent)]'));
  row.appendChild(buildCard('Active', String(activeCount), 'text-emerald-400'));
  row.appendChild(buildCard('Trial', String(trialCount), 'text-blue-400'));
  row.appendChild(buildCard('Suspended', String(suspendedCount), 'text-amber-400'));

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

    // Placeholder containers that will be replaced once data loads
    const summarySlot = el('div');
    wrapper.appendChild(summarySlot);

    // All tenants loaded from the service (unfiltered by search, but filtered by status/plan)
    let allRows: TenantRow[] = [];

    // Reference to the current table element so we can swap it out
    let tableSlot = el('div');

    const rebuildContent = (rows: TenantRow[], search: string) => {
      // Client-side search filter on name/slug
      let filtered = rows;
      const q = search.trim().toLowerCase();
      if (q) {
        filtered = rows.filter(
          (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
        );
      }

      // Rebuild summary cards from full (non-search-filtered) dataset
      const newSummary = buildSummaryCards(rows);
      summarySlot.replaceChildren(newSummary);

      // Rebuild table with filtered data
      const newTable = buildTable(filtered);
      tableSlot.replaceChildren(newTable);
    };

    const loadData = async (status: string, plan: string, search: string) => {
      try {
        const svc = getTenantService();

        const filters: { status?: string; plan?: string } = {};
        if (status) filters.status = status;
        if (plan) filters.plan = plan;

        const tenants = await svc.getTenants(filters as Parameters<typeof svc.getTenants>[0]);

        // Map to TenantRow, fetching usage stats for user counts
        const rows: TenantRow[] = [];
        for (const t of tenants) {
          let userCount = 0;
          try {
            const stats = await svc.getUsageStats(t.id);
            userCount = stats.userCount;
          } catch {
            // Fallback: cannot get stats
          }
          rows.push({
            id: t.id,
            name: t.name,
            slug: t.slug,
            status: t.status,
            plan: t.plan,
            dataRegion: t.dataRegion,
            userCount,
            maxUsers: t.maxUsers,
            storageUsedMb: t.storageUsedMb,
            storageLimitMb: t.storageLimitMb,
            createdAt: t.createdAt,
          });
        }

        allRows = rows;
        rebuildContent(allRows, search);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to load tenants: ${message}`, true);
      }
    };

    wrapper.appendChild(
      buildFilterBar((status, plan, search) => {
        loadData(status, plan, search);
      }),
    );

    wrapper.appendChild(tableSlot);
    container.appendChild(wrapper);

    // Initial load with no filters
    loadData('', '', '');
  },
};
