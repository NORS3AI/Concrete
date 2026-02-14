/**
 * Job Site Safety Plans view.
 * Displays a filterable table of safety plans with summary statistics,
 * approval workflow, activation/deactivation controls, and the ability
 * to create new plans. Wired to SafetyService for data persistence.
 */

import { getSafetyService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(
  tag: string,
  attrs?: Record<string, string> | null,
  ...children: (string | HTMLElement)[]
): HTMLElement {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') node.className = v;
      else node.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', { className: cls }, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVE_OPTIONS = [
  { value: '', label: 'All Plans' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const STATUS_BADGE: Record<string, string> = {
  'active_approved': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'active_pending': 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  'inactive': 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const COLUMNS = [
  'Name', 'Job', 'Created By', 'Created Date', 'Approved By',
  'Approved Date', 'Hazards', 'Status', 'Actions',
];

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', { className: 'max-w-7xl mx-auto' });

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';
    const thCls =
      'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    const tdCls = 'px-4 py-3 text-sm text-[var(--text)]';
    const trCls = 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]';

    // ---- Header ----
    const headerRow = el('div', { className: 'flex items-center justify-between mb-6' },
      el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Job Site Safety Plans'),
    );
    const newBtn = el('button', { className: btnCls, type: 'button' }, 'New Plan');
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Stats ----
    const statsRow = el('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-6' });
    const statCardCls = 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4';
    const statLabelCls = 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider';
    const statValueCls = 'text-2xl font-bold text-[var(--text)] mt-1';

    const totalCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Total Plans'),
      el('div', { className: statValueCls + ' stat-total' }, '...'),
    );
    const activeCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Active'),
      el('div', { className: statValueCls + ' stat-active text-emerald-400' }, '...'),
    );
    const approvedCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Approved'),
      el('div', { className: statValueCls + ' stat-approved text-blue-400' }, '...'),
    );
    const unapprovedCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Unapproved'),
      el('div', { className: statValueCls + ' stat-unapproved text-amber-400' }, '...'),
    );
    statsRow.appendChild(totalCard);
    statsRow.appendChild(activeCard);
    statsRow.appendChild(approvedCard);
    statsRow.appendChild(unapprovedCard);
    wrapper.appendChild(statsRow);

    // ---- Filter Bar ----
    const bar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });

    const searchInput = document.createElement('input') as HTMLInputElement;
    searchInput.className = inputCls;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search plans...';
    bar.appendChild(searchInput);

    const activeSelect = document.createElement('select') as HTMLSelectElement;
    activeSelect.className = inputCls;
    for (const opt of ACTIVE_OPTIONS) {
      const o = document.createElement('option') as HTMLOptionElement;
      o.value = opt.value;
      o.textContent = opt.label;
      activeSelect.appendChild(o);
    }
    bar.appendChild(activeSelect);

    wrapper.appendChild(bar);

    // ---- Loading Indicator ----
    const loadingEl = el('div', { className: 'text-sm text-[var(--text-muted)] py-8 text-center' }, 'Loading safety plans...');
    wrapper.appendChild(loadingEl);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Data & Rendering ----
    type PlanRow = {
      id: string;
      name: string;
      jobId: string;
      jobName?: string;
      createdBy: string;
      createdDate: string;
      approvedBy?: string;
      approvedDate?: string;
      hazards?: string;
      controls?: string;
      emergencyProcedures?: string;
      ppeRequirements?: string;
      active: boolean;
    };

    let allPlans: PlanRow[] = [];

    function updateStats(plans: PlanRow[]): void {
      const totalEl = wrapper.querySelector('.stat-total');
      const activeEl = wrapper.querySelector('.stat-active');
      const approvedEl = wrapper.querySelector('.stat-approved');
      const unapprovedEl = wrapper.querySelector('.stat-unapproved');

      const activePlans = plans.filter((p) => p.active);
      const approvedPlans = plans.filter((p) => !!p.approvedDate);
      const unapprovedPlans = activePlans.filter((p) => !p.approvedDate);

      if (totalEl) totalEl.textContent = String(plans.length);
      if (activeEl) activeEl.textContent = String(activePlans.length);
      if (approvedEl) approvedEl.textContent = String(approvedPlans.length);
      if (unapprovedEl) unapprovedEl.textContent = String(unapprovedPlans.length);
    }

    function getFilteredPlans(): PlanRow[] {
      let filtered = [...allPlans];
      const search = searchInput.value.toLowerCase().trim();
      const activeVal = activeSelect.value;

      if (activeVal === 'active') {
        filtered = filtered.filter((p) => p.active);
      } else if (activeVal === 'inactive') {
        filtered = filtered.filter((p) => !p.active);
      }

      if (search) {
        filtered = filtered.filter((p) =>
          p.name.toLowerCase().includes(search) ||
          (p.jobName ?? '').toLowerCase().includes(search) ||
          p.createdBy.toLowerCase().includes(search),
        );
      }

      return filtered;
    }

    function getStatusKey(plan: PlanRow): string {
      if (!plan.active) return 'inactive';
      if (plan.approvedDate) return 'active_approved';
      return 'active_pending';
    }

    function getStatusLabel(plan: PlanRow): string {
      if (!plan.active) return 'Inactive';
      if (plan.approvedDate) return 'Active/Approved';
      return 'Pending Approval';
    }

    function truncate(text: string, maxLen: number): string {
      if (!text) return '-';
      return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    }

    function renderTable(): void {
      tableContainer.innerHTML = '';
      const filtered = getFilteredPlans();

      const wrap = el('div', { className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden' });
      const table = el('table', { className: 'w-full text-sm' });

      // Header
      const thead = el('thead');
      const headRow = el('tr', { className: 'border-b border-[var(--border)]' });
      for (const col of COLUMNS) {
        headRow.appendChild(el('th', { className: thCls }, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      // Body
      const tbody = el('tbody');

      if (filtered.length === 0) {
        const tr = el('tr');
        const td = el('td', { className: 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', colspan: String(COLUMNS.length) },
          'No safety plans found. Create a new plan to get started.',
        );
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const row of filtered) {
        const tr = el('tr', { className: trCls });

        // Name
        tr.appendChild(el('td', { className: tdCls + ' font-medium' }, row.name));

        // Job
        tr.appendChild(el('td', { className: tdCls }, row.jobName || row.jobId));

        // Created By
        tr.appendChild(el('td', { className: tdCls }, row.createdBy));

        // Created Date
        tr.appendChild(el('td', { className: tdCls + ' text-[var(--text-muted)]' }, row.createdDate));

        // Approved By
        tr.appendChild(el('td', { className: tdCls }, row.approvedBy || '-'));

        // Approved Date
        tr.appendChild(el('td', { className: tdCls + ' text-[var(--text-muted)]' }, row.approvedDate || '-'));

        // Hazards (truncated)
        tr.appendChild(el('td', { className: tdCls + ' text-[var(--text-muted)]' }, truncate(row.hazards ?? '', 40)));

        // Status badge
        const tdStatus = el('td', { className: tdCls });
        const statusKey = getStatusKey(row);
        const badgeCls = STATUS_BADGE[statusKey] ?? STATUS_BADGE.inactive;
        tdStatus.appendChild(
          el('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}` }, getStatusLabel(row)),
        );
        tr.appendChild(tdStatus);

        // Actions
        const tdActions = el('td', { className: tdCls });
        const actionWrap = el('div', { className: 'flex items-center gap-2' });

        if (row.active && !row.approvedDate) {
          const approveBtn = el('button', { className: 'text-emerald-400 hover:underline text-sm', type: 'button' }, 'Approve');
          approveBtn.addEventListener('click', () => {
            void handleApprove(row.id);
          });
          actionWrap.appendChild(approveBtn);
        }

        if (row.active) {
          const deactivateBtn = el('button', { className: 'text-red-400 hover:underline text-sm', type: 'button' }, 'Deactivate');
          deactivateBtn.addEventListener('click', () => {
            void handleDeactivate(row.id);
          });
          actionWrap.appendChild(deactivateBtn);
        }

        if (!row.active && actionWrap.children.length === 0) {
          actionWrap.appendChild(el('span', { className: 'text-[var(--text-muted)] text-sm' }, '-'));
        }

        tdActions.appendChild(actionWrap);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Load Data ----
    async function loadData(): Promise<void> {
      loadingEl.style.display = '';
      tableContainer.innerHTML = '';
      try {
        const svc = getSafetyService();
        const plans = await svc.listSafetyPlans();
        allPlans = plans.map((p) => ({
          id: p.id,
          name: p.name,
          jobId: p.jobId,
          jobName: p.jobName || undefined,
          createdBy: p.createdBy,
          createdDate: p.createdDate,
          approvedBy: p.approvedBy || undefined,
          approvedDate: p.approvedDate || undefined,
          hazards: p.hazards || undefined,
          controls: p.controls || undefined,
          emergencyProcedures: p.emergencyProcedures || undefined,
          ppeRequirements: p.ppeRequirements || undefined,
          active: p.active,
        }));
        updateStats(allPlans);
        loadingEl.style.display = 'none';
        renderTable();
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        const message = err instanceof Error ? err.message : 'Failed to load safety plans.';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Approve Plan ----
    async function handleApprove(id: string): Promise<void> {
      const approverName = prompt('Approver name:');
      if (!approverName) return;

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.approveSafetyPlan(id, approverName);
          showMsg(wrapper, 'Safety plan approved successfully.', false);
          await loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to approve safety plan.';
          showMsg(wrapper, message, true);
        }
      })();
    }

    // ---- Deactivate Plan ----
    async function handleDeactivate(id: string): Promise<void> {
      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.updateSafetyPlan(id, { active: false });
          showMsg(wrapper, 'Safety plan deactivated.', false);
          await loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to deactivate safety plan.';
          showMsg(wrapper, message, true);
        }
      })();
    }

    // ---- New Plan ----
    newBtn.addEventListener('click', () => {
      const name = prompt('Plan name:');
      if (!name) return;

      const jobId = prompt('Job ID:');
      if (!jobId) return;

      const jobName = prompt('Job name (leave blank to skip):') || '';

      const createdBy = prompt('Created by:');
      if (!createdBy) return;

      const hazards = prompt('Hazards (leave blank to skip):') || '';
      const controls = prompt('Controls (leave blank to skip):') || '';
      const emergencyProcedures = prompt('Emergency procedures (leave blank to skip):') || '';
      const ppeRequirements = prompt('PPE requirements (leave blank to skip):') || '';

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.createSafetyPlan({
            name,
            jobId,
            jobName: jobName || undefined,
            createdBy,
            hazards: hazards || undefined,
            controls: controls || undefined,
            emergencyProcedures: emergencyProcedures || undefined,
            ppeRequirements: ppeRequirements || undefined,
          });
          showMsg(wrapper, 'Safety plan created successfully.', false);
          await loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create safety plan.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => {
      renderTable();
    });
    activeSelect.addEventListener('change', () => {
      renderTable();
    });

    // ---- Initial Load ----
    void loadData();
  },
};
