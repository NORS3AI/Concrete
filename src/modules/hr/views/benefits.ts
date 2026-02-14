/**
 * Benefits Administration view.
 *
 * Lists all benefit plans with summary stats, type/status filtering,
 * and a "New Plan" action button. Contribution columns formatted as currency.
 * Fully wired to HRService for live data.
 */

import { getHRService } from '../service-accessor';
import type { BenefitType, BenefitPlanStatus } from '../hr-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(
  tag: string,
  attrs?: Record<string, string>,
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
    if (typeof child === 'string') {
      const span = document.createElement('span');
      span.textContent = child;
      node.appendChild(span);
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

function showMsg(
  container: HTMLElement,
  msg: string,
  type: 'success' | 'error' = 'success',
): void {
  const existing = container.querySelector('[data-toast]');
  if (existing) existing.remove();

  const cls =
    type === 'error'
      ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
      : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';

  const toast = el('div', { className: cls, 'data-toast': '1' }, msg);
  container.prepend(toast);
  setTimeout(() => toast.remove(), 3000);
}

const fmtCurrency = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'health', label: 'Health' },
  { value: 'dental', label: 'Dental' },
  { value: 'vision', label: 'Vision' },
  { value: '401k', label: '401k' },
  { value: 'hsa', label: 'HSA' },
  { value: 'life', label: 'Life' },
  { value: 'disability', label: 'Disability' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
};

const TYPE_BADGE: Record<string, string> = {
  health: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  dental: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  vision: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  '401k': 'bg-purple-400/10 text-purple-400 border border-purple-400/20',
  hsa: 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20',
  life: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  disability: 'bg-red-500/10 text-red-400 border border-red-500/20',
  other: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const TYPE_LABEL: Record<string, string> = {
  health: 'Health',
  dental: 'Dental',
  vision: 'Vision',
  '401k': '401k',
  hsa: 'HSA',
  life: 'Life',
  disability: 'Disability',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', { className: 'space-y-0' });

    // Header
    const headerRow = el('div', { className: 'flex items-center justify-between mb-4' });
    headerRow.appendChild(el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Benefits Administration'));

    const newPlanBtn = el(
      'button',
      { className: 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90' },
      'New Plan',
    );
    headerRow.appendChild(newPlanBtn);
    wrapper.appendChild(headerRow);

    // Stats row
    const statsRow = el('div', { className: 'grid grid-cols-3 gap-4 mb-6' });
    wrapper.appendChild(statsRow);

    // Filter bar
    const filterBar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const typeSelect = document.createElement('select') as HTMLSelectElement;
    typeSelect.className = inputCls;
    for (const opt of TYPE_OPTIONS) {
      const o = document.createElement('option') as HTMLOptionElement;
      o.value = opt.value;
      o.textContent = opt.label;
      typeSelect.appendChild(o);
    }
    filterBar.appendChild(typeSelect);

    const statusSelect = document.createElement('select') as HTMLSelectElement;
    statusSelect.className = inputCls;
    for (const opt of STATUS_OPTIONS) {
      const o = document.createElement('option') as HTMLOptionElement;
      o.value = opt.value;
      o.textContent = opt.label;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);
    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div', {});
    tableContainer.appendChild(
      el('div', { className: 'py-12 text-center text-[var(--text-muted)] text-sm' }, 'Loading benefit plans...'),
    );
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // State
    let currentType = '';
    let currentStatus = '';
    let allPlans: any[] = [];

    // Stat card builder
    function buildStatCard(label: string, value: string | number): HTMLElement {
      const card = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4',
      });
      card.appendChild(el('div', { className: 'text-xs font-medium text-[var(--text-muted)] mb-1' }, String(label)));
      card.appendChild(el('div', { className: 'text-xl font-bold text-[var(--text)]' }, String(value)));
      return card;
    }

    function renderStats(plans: any[]): void {
      statsRow.innerHTML = '';
      const total = plans.length;
      const active = plans.filter((p: any) => p.status === 'active').length;
      const types = new Set(plans.map((p: any) => p.type));
      statsRow.appendChild(buildStatCard('Total Plans', total));
      statsRow.appendChild(buildStatCard('Active Plans', active));
      statsRow.appendChild(buildStatCard('Plan Types', types.size));
    }

    function filterPlans(): any[] {
      let filtered = [...allPlans];
      if (currentType) {
        filtered = filtered.filter((p: any) => p.type === currentType);
      }
      if (currentStatus) {
        filtered = filtered.filter((p: any) => p.status === currentStatus);
      }
      return filtered;
    }

    function renderTable(plans: any[]): void {
      tableContainer.innerHTML = '';

      const wrap = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
      });
      const table = el('table', { className: 'w-full text-sm' });

      // Head
      const thead = el('thead', {});
      const headRow = el('tr', {
        className: 'text-left text-[var(--text-muted)] border-b border-[var(--border)]',
      });
      const columns = [
        'Plan Name',
        'Type',
        'Carrier',
        'Plan Code',
        'Effective Date',
        'End Date',
        'Employer Contrib.',
        'Employee Contrib.',
        'Status',
      ];
      for (const col of columns) {
        const isMoneyCol = col === 'Employer Contrib.' || col === 'Employee Contrib.';
        const align = isMoneyCol ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
        headRow.appendChild(el('th', { className: align }, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      // Body
      const tbody = el('tbody', {});
      if (plans.length === 0) {
        const tr = el('tr', {});
        const td = el('td', {
          className: 'py-8 px-3 text-center text-[var(--text-muted)]',
          colspan: String(columns.length),
        }, 'No benefit plans found.');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const plan of plans) {
        const tr = el('tr', {
          className: 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
        });

        tr.appendChild(el('td', { className: 'py-2 px-3 font-medium text-[var(--text)]' }, plan.name ?? '-'));

        // Type badge
        const tdType = el('td', { className: 'py-2 px-3' });
        const typeBadgeCls = TYPE_BADGE[plan.type] ?? TYPE_BADGE['other'];
        const typeLabel = TYPE_LABEL[plan.type] ?? plan.type;
        tdType.appendChild(
          el('span', { className: `px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeCls}` }, typeLabel),
        );
        tr.appendChild(tdType);

        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, plan.carrier || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, plan.planCode || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, plan.effectiveDate || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, plan.endDate || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-right font-mono text-[var(--text)]' }, plan.employerContribution != null ? fmtCurrency(plan.employerContribution) : '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-right font-mono text-[var(--text)]' }, plan.employeeContribution != null ? fmtCurrency(plan.employeeContribution) : '-'));

        // Status badge
        const tdStatus = el('td', { className: 'py-2 px-3' });
        const badgeCls = STATUS_BADGE[plan.status] ?? STATUS_BADGE['pending'];
        const badgeLabel = STATUS_LABEL[plan.status] ?? plan.status;
        tdStatus.appendChild(
          el('span', { className: `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}` }, badgeLabel),
        );
        tr.appendChild(tdStatus);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    async function loadData(): Promise<void> {
      try {
        tableContainer.innerHTML = '';
        tableContainer.appendChild(
          el('div', { className: 'py-12 text-center text-[var(--text-muted)] text-sm' }, 'Loading benefit plans...'),
        );

        const svc = getHRService();
        allPlans = await svc.listBenefitPlans();
        allPlans = allPlans.map((p: any) => ({ ...p, id: p.id ?? p._id }));

        renderStats(allPlans);
        const filtered = filterPlans();
        renderTable(filtered);
      } catch (err: unknown) {
        tableContainer.innerHTML = '';
        const message = err instanceof Error ? err.message : 'Failed to load benefit plans';
        showMsg(wrapper, message, 'error');
      }
    }

    // Filter events
    typeSelect.addEventListener('change', () => {
      currentType = typeSelect.value;
      const filtered = filterPlans();
      renderTable(filtered);
    });

    statusSelect.addEventListener('change', () => {
      currentStatus = statusSelect.value;
      const filtered = filterPlans();
      renderTable(filtered);
    });

    // New Plan button
    newPlanBtn.addEventListener('click', () => {
      const name = prompt('Plan Name:');
      if (!name) return;

      const typeStr = prompt('Type (health, dental, vision, 401k, hsa, life, disability, other):');
      if (!typeStr) return;
      const planType = typeStr.trim().toLowerCase() as BenefitType;

      const carrier = prompt('Carrier (optional):') || undefined;
      const planCode = prompt('Plan Code (optional):') || undefined;

      const effectiveDate = prompt('Effective Date (YYYY-MM-DD):');
      if (!effectiveDate) return;

      const employerContribStr = prompt('Employer Contribution (optional, e.g. 500):');
      const employerContribution = employerContribStr ? parseFloat(employerContribStr) : undefined;

      const employeeContribStr = prompt('Employee Contribution (optional, e.g. 200):');
      const employeeContribution = employeeContribStr ? parseFloat(employeeContribStr) : undefined;

      const description = prompt('Description (optional):') || undefined;

      void (async () => {
        try {
          const svc = getHRService();
          await svc.createBenefitPlan({
            name,
            type: planType,
            carrier,
            planCode,
            effectiveDate,
            employerContribution,
            employeeContribution,
            description,
          });
          showMsg(wrapper, 'Benefit plan created.');
          void loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create benefit plan';
          showMsg(wrapper, message, 'error');
        }
      })();
    });

    // Initial load
    void loadData();
  },
};
