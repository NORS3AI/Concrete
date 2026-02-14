/**
 * Open Enrollment view.
 *
 * Lists all benefit enrollments with summary stats, status/period filtering,
 * and action buttons to waive, close, or create new enrollments.
 * Contribution columns formatted as currency.
 * Fully wired to HRService for live data.
 */

import { getHRService } from '../service-accessor';

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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'waived', label: 'Waived' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  enrolled: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  waived: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  closed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  enrolled: 'Enrolled',
  waived: 'Waived',
  pending: 'Pending',
  closed: 'Closed',
};

const COVERAGE_LABEL: Record<string, string> = {
  employee: 'Employee',
  employee_spouse: 'Employee + Spouse',
  employee_children: 'Employee + Children',
  family: 'Family',
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
    headerRow.appendChild(el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Open Enrollment'));

    const newEnrollBtn = el(
      'button',
      { className: 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90' },
      'New Enrollment',
    );
    headerRow.appendChild(newEnrollBtn);
    wrapper.appendChild(headerRow);

    // Stats row
    const statsRow = el('div', { className: 'grid grid-cols-4 gap-4 mb-6' });
    wrapper.appendChild(statsRow);

    // Filter bar
    const filterBar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const statusSelect = document.createElement('select') as HTMLSelectElement;
    statusSelect.className = inputCls;
    for (const opt of STATUS_OPTIONS) {
      const o = document.createElement('option') as HTMLOptionElement;
      o.value = opt.value;
      o.textContent = opt.label;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const periodInput = document.createElement('input') as HTMLInputElement;
    periodInput.type = 'text';
    periodInput.placeholder = 'Enrollment Period...';
    periodInput.className = inputCls;
    filterBar.appendChild(periodInput);

    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div', {});
    tableContainer.appendChild(
      el('div', { className: 'py-12 text-center text-[var(--text-muted)] text-sm' }, 'Loading enrollments...'),
    );
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // State
    let currentStatus = '';
    let currentPeriod = '';
    let allEnrollments: any[] = [];

    // Stat card builder
    function buildStatCard(label: string, value: string | number): HTMLElement {
      const card = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4',
      });
      card.appendChild(el('div', { className: 'text-xs font-medium text-[var(--text-muted)] mb-1' }, String(label)));
      card.appendChild(el('div', { className: 'text-xl font-bold text-[var(--text)]' }, String(value)));
      return card;
    }

    function renderStats(enrollments: any[]): void {
      statsRow.innerHTML = '';
      const total = enrollments.length;
      const active = enrollments.filter((e: any) => e.status === 'enrolled').length;
      const waived = enrollments.filter((e: any) => e.status === 'waived').length;
      const pending = enrollments.filter((e: any) => e.status === 'pending').length;
      statsRow.appendChild(buildStatCard('Total Enrollments', total));
      statsRow.appendChild(buildStatCard('Active', active));
      statsRow.appendChild(buildStatCard('Waived', waived));
      statsRow.appendChild(buildStatCard('Pending', pending));
    }

    function filterEnrollments(): any[] {
      let filtered = [...allEnrollments];
      if (currentStatus) {
        filtered = filtered.filter((e: any) => e.status === currentStatus);
      }
      if (currentPeriod) {
        const term = currentPeriod.toLowerCase();
        filtered = filtered.filter(
          (e: any) => (e.enrollmentPeriod ?? '').toLowerCase().includes(term),
        );
      }
      return filtered;
    }

    function renderTable(enrollments: any[]): void {
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
        'Employee ID',
        'Plan Name',
        'Enrollment Date',
        'Effective Date',
        'Coverage Level',
        'Employee Contrib.',
        'Employer Contrib.',
        'Status',
        'Actions',
      ];
      for (const col of columns) {
        const isMoneyCol = col === 'Employee Contrib.' || col === 'Employer Contrib.';
        const align = isMoneyCol ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
        headRow.appendChild(el('th', { className: align }, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      // Body
      const tbody = el('tbody', {});
      if (enrollments.length === 0) {
        const tr = el('tr', {});
        const td = el('td', {
          className: 'py-8 px-3 text-center text-[var(--text-muted)]',
          colspan: String(columns.length),
        }, 'No enrollments found.');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const enr of enrollments) {
        const tr = el('tr', {
          className: 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
        });

        tr.appendChild(el('td', { className: 'py-2 px-3 font-medium text-[var(--text)]' }, enr.employeeId ?? '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text)]' }, enr.planName || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, enr.enrollmentDate || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, enr.effectiveDate || '-'));

        // Coverage level
        const coverageLabel = COVERAGE_LABEL[enr.coverageLevel] ?? enr.coverageLevel ?? '-';
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, coverageLabel));

        // Contribution columns
        tr.appendChild(el('td', { className: 'py-2 px-3 text-right font-mono text-[var(--text)]' }, enr.employeeContribution != null ? fmtCurrency(enr.employeeContribution) : '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-right font-mono text-[var(--text)]' }, enr.employerContribution != null ? fmtCurrency(enr.employerContribution) : '-'));

        // Status badge
        const tdStatus = el('td', { className: 'py-2 px-3' });
        const badgeCls = STATUS_BADGE[enr.status] ?? STATUS_BADGE['pending'];
        const badgeLabel = STATUS_LABEL[enr.status] ?? enr.status;
        tdStatus.appendChild(
          el('span', { className: `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}` }, badgeLabel),
        );
        tr.appendChild(tdStatus);

        // Actions
        const tdActions = el('td', { className: 'py-2 px-3' });
        const actionsWrap = el('div', { className: 'flex gap-2' });

        if (enr.status === 'enrolled' || enr.status === 'open' || enr.status === 'pending') {
          const waiveBtn = el(
            'button',
            { className: 'text-zinc-400 hover:underline text-sm' },
            'Waive',
          );
          waiveBtn.addEventListener('click', () => {
            void (async () => {
              try {
                const svc = getHRService();
                await svc.waiveEnrollment(enr.id);
                showMsg(wrapper, 'Enrollment waived.');
                void loadData();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to waive enrollment';
                showMsg(wrapper, message, 'error');
              }
            })();
          });
          actionsWrap.appendChild(waiveBtn);
        }

        if (enr.status === 'enrolled') {
          const closeBtn = el(
            'button',
            { className: 'text-red-400 hover:underline text-sm' },
            'Close',
          );
          closeBtn.addEventListener('click', () => {
            void (async () => {
              try {
                const svc = getHRService();
                await svc.closeEnrollment(enr.id);
                showMsg(wrapper, 'Enrollment closed.');
                void loadData();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to close enrollment';
                showMsg(wrapper, message, 'error');
              }
            })();
          });
          actionsWrap.appendChild(closeBtn);
        }

        tdActions.appendChild(actionsWrap);
        tr.appendChild(tdActions);
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
          el('div', { className: 'py-12 text-center text-[var(--text-muted)] text-sm' }, 'Loading enrollments...'),
        );

        const svc = getHRService();
        allEnrollments = await svc.listEnrollments();
        allEnrollments = allEnrollments.map((e: any) => ({ ...e, id: e.id ?? e._id }));

        renderStats(allEnrollments);
        const filtered = filterEnrollments();
        renderTable(filtered);
      } catch (err: unknown) {
        tableContainer.innerHTML = '';
        const message = err instanceof Error ? err.message : 'Failed to load enrollments';
        showMsg(wrapper, message, 'error');
      }
    }

    // Filter events
    statusSelect.addEventListener('change', () => {
      currentStatus = statusSelect.value;
      const filtered = filterEnrollments();
      renderTable(filtered);
    });

    periodInput.addEventListener('input', () => {
      currentPeriod = periodInput.value;
      const filtered = filterEnrollments();
      renderTable(filtered);
    });

    // New Enrollment button
    newEnrollBtn.addEventListener('click', () => {
      const employeeId = prompt('Employee ID:');
      if (!employeeId) return;

      const planId = prompt('Plan ID:');
      if (!planId) return;

      const planName = prompt('Plan Name (optional):') || undefined;

      const effectiveDate = prompt('Effective Date (YYYY-MM-DD):');
      if (!effectiveDate) return;

      const coverageLevelStr = prompt('Coverage Level (employee, employee_spouse, employee_children, family):');
      const coverageLevel = (coverageLevelStr?.trim() || 'employee') as
        | 'employee'
        | 'employee_spouse'
        | 'employee_children'
        | 'family';

      const enrollmentPeriod = prompt('Enrollment Period (optional, e.g. 2026-Q1):') || undefined;

      void (async () => {
        try {
          const svc = getHRService();
          await svc.enrollEmployee({
            employeeId,
            planId,
            planName,
            effectiveDate,
            coverageLevel,
            enrollmentPeriod,
          });
          showMsg(wrapper, 'Employee enrolled successfully.');
          void loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to enroll employee';
          showMsg(wrapper, message, 'error');
        }
      })();
    });

    // Initial load
    void loadData();
  },
};
