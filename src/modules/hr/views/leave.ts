/**
 * PTO / Leave Management view.
 *
 * Lists all leave requests with summary stats, search/status/type filtering,
 * and action buttons to approve, deny, cancel, or create new leave requests.
 * Fully wired to HRService for live data.
 */

import { getHRService } from '../service-accessor';
import type { LeaveType } from '../hr-service';

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
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick', label: 'Sick' },
  { value: 'fmla', label: 'FMLA' },
  { value: 'military', label: 'Military' },
  { value: 'jury', label: 'Jury Duty' },
  { value: 'bereavement', label: 'Bereavement' },
  { value: 'personal', label: 'Personal' },
  { value: 'unpaid', label: 'Unpaid' },
];

const STATUS_BADGE: Record<string, string> = {
  requested: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  denied: 'bg-red-500/10 text-red-400 border border-red-500/20',
  active: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  requested: 'Requested',
  approved: 'Approved',
  denied: 'Denied',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const TYPE_BADGE: Record<string, string> = {
  vacation: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  sick: 'bg-red-500/10 text-red-400 border border-red-500/20',
  fmla: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  military: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  jury: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  bereavement: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  personal: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  unpaid: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const TYPE_LABEL: Record<string, string> = {
  vacation: 'Vacation',
  sick: 'Sick',
  fmla: 'FMLA',
  military: 'Military',
  jury: 'Jury Duty',
  bereavement: 'Bereavement',
  personal: 'Personal',
  unpaid: 'Unpaid',
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
    headerRow.appendChild(el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'PTO / Leave Management'));

    const newLeaveBtn = el(
      'button',
      { className: 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90' },
      'New Leave Request',
    );
    headerRow.appendChild(newLeaveBtn);
    wrapper.appendChild(headerRow);

    // Stats row
    const statsRow = el('div', { className: 'grid grid-cols-4 gap-4 mb-6' });
    wrapper.appendChild(statsRow);

    // Filter bar
    const filterBar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const searchInput = document.createElement('input') as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search leave requests...';
    searchInput.className = inputCls;
    filterBar.appendChild(searchInput);

    const statusSelect = document.createElement('select') as HTMLSelectElement;
    statusSelect.className = inputCls;
    for (const opt of STATUS_OPTIONS) {
      const o = document.createElement('option') as HTMLOptionElement;
      o.value = opt.value;
      o.textContent = opt.label;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const typeSelect = document.createElement('select') as HTMLSelectElement;
    typeSelect.className = inputCls;
    for (const opt of TYPE_OPTIONS) {
      const o = document.createElement('option') as HTMLOptionElement;
      o.value = opt.value;
      o.textContent = opt.label;
      typeSelect.appendChild(o);
    }
    filterBar.appendChild(typeSelect);

    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div', {});
    tableContainer.appendChild(
      el('div', { className: 'py-12 text-center text-[var(--text-muted)] text-sm' }, 'Loading leave requests...'),
    );
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // State
    let currentSearch = '';
    let currentStatus = '';
    let currentType = '';
    let allRequests: any[] = [];

    // Stat card builder
    function buildStatCard(label: string, value: string | number): HTMLElement {
      const card = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4',
      });
      card.appendChild(el('div', { className: 'text-xs font-medium text-[var(--text-muted)] mb-1' }, String(label)));
      card.appendChild(el('div', { className: 'text-xl font-bold text-[var(--text)]' }, String(value)));
      return card;
    }

    function renderStats(requests: any[]): void {
      statsRow.innerHTML = '';
      const total = requests.length;
      const pending = requests.filter((r: any) => r.status === 'requested').length;
      const approved = requests.filter((r: any) => r.status === 'approved').length;
      const active = requests.filter((r: any) => r.status === 'active').length;
      statsRow.appendChild(buildStatCard('Total Requests', total));
      statsRow.appendChild(buildStatCard('Pending Approval', pending));
      statsRow.appendChild(buildStatCard('Approved', approved));
      statsRow.appendChild(buildStatCard('Active', active));
    }

    function filterRequests(): any[] {
      let filtered = [...allRequests];
      if (currentStatus) {
        filtered = filtered.filter((r: any) => r.status === currentStatus);
      }
      if (currentType) {
        filtered = filtered.filter((r: any) => r.type === currentType);
      }
      if (currentSearch) {
        const term = currentSearch.toLowerCase();
        filtered = filtered.filter(
          (r: any) =>
            (r.employeeId ?? '').toLowerCase().includes(term) ||
            (r.employeeName ?? '').toLowerCase().includes(term) ||
            (r.reason ?? '').toLowerCase().includes(term),
        );
      }
      return filtered;
    }

    function renderTable(requests: any[]): void {
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
        'Employee Name',
        'Type',
        'Start Date',
        'End Date',
        'Total Days',
        'Status',
        'Actions',
      ];
      for (const col of columns) {
        const align = col === 'Total Days' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
        headRow.appendChild(el('th', { className: align }, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      // Body
      const tbody = el('tbody', {});
      if (requests.length === 0) {
        const tr = el('tr', {});
        const td = el('td', {
          className: 'py-8 px-3 text-center text-[var(--text-muted)]',
          colspan: String(columns.length),
        }, 'No leave requests found.');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const req of requests) {
        const tr = el('tr', {
          className: 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
        });

        tr.appendChild(el('td', { className: 'py-2 px-3 font-medium text-[var(--text)]' }, req.employeeId ?? '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text)]' }, req.employeeName || '-'));

        // Type badge
        const tdType = el('td', { className: 'py-2 px-3' });
        const typeBadgeCls = TYPE_BADGE[req.type] ?? TYPE_BADGE['personal'];
        const typeLabel = TYPE_LABEL[req.type] ?? req.type;
        tdType.appendChild(
          el('span', { className: `px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeCls}` }, typeLabel),
        );
        tr.appendChild(tdType);

        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, req.startDate || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, req.endDate || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-right font-mono' }, req.totalDays != null ? String(req.totalDays) : '-'));

        // Status badge
        const tdStatus = el('td', { className: 'py-2 px-3' });
        const badgeCls = STATUS_BADGE[req.status] ?? STATUS_BADGE['requested'];
        const badgeLabel = STATUS_LABEL[req.status] ?? req.status;
        tdStatus.appendChild(
          el('span', { className: `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}` }, badgeLabel),
        );
        tr.appendChild(tdStatus);

        // Actions
        const tdActions = el('td', { className: 'py-2 px-3' });
        const actionsWrap = el('div', { className: 'flex gap-2' });

        if (req.status === 'requested') {
          const approveBtn = el(
            'button',
            { className: 'text-emerald-400 hover:underline text-sm' },
            'Approve',
          );
          approveBtn.addEventListener('click', () => {
            const approvedBy = prompt('Approver ID:');
            if (!approvedBy) return;
            void (async () => {
              try {
                const svc = getHRService();
                await svc.approveLeave(req.id, approvedBy);
                showMsg(wrapper, 'Leave request approved.');
                void loadData();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to approve leave';
                showMsg(wrapper, message, 'error');
              }
            })();
          });
          actionsWrap.appendChild(approveBtn);

          const denyBtn = el(
            'button',
            { className: 'text-red-400 hover:underline text-sm' },
            'Deny',
          );
          denyBtn.addEventListener('click', () => {
            void (async () => {
              try {
                const svc = getHRService();
                await svc.denyLeave(req.id);
                showMsg(wrapper, 'Leave request denied.');
                void loadData();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to deny leave';
                showMsg(wrapper, message, 'error');
              }
            })();
          });
          actionsWrap.appendChild(denyBtn);
        }

        if (req.status === 'requested' || req.status === 'approved' || req.status === 'active') {
          const cancelBtn = el(
            'button',
            { className: 'text-zinc-400 hover:underline text-sm' },
            'Cancel',
          );
          cancelBtn.addEventListener('click', () => {
            void (async () => {
              try {
                const svc = getHRService();
                await svc.cancelLeave(req.id);
                showMsg(wrapper, 'Leave request cancelled.');
                void loadData();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to cancel leave';
                showMsg(wrapper, message, 'error');
              }
            })();
          });
          actionsWrap.appendChild(cancelBtn);
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
          el('div', { className: 'py-12 text-center text-[var(--text-muted)] text-sm' }, 'Loading leave requests...'),
        );

        const svc = getHRService();
        allRequests = await svc.listLeaveRequests();
        allRequests = allRequests.map((r: any) => ({ ...r, id: r.id ?? r._id }));

        renderStats(allRequests);
        const filtered = filterRequests();
        renderTable(filtered);
      } catch (err: unknown) {
        tableContainer.innerHTML = '';
        const message = err instanceof Error ? err.message : 'Failed to load leave requests';
        showMsg(wrapper, message, 'error');
      }
    }

    // Filter events
    searchInput.addEventListener('input', () => {
      currentSearch = searchInput.value;
      const filtered = filterRequests();
      renderTable(filtered);
    });

    statusSelect.addEventListener('change', () => {
      currentStatus = statusSelect.value;
      const filtered = filterRequests();
      renderTable(filtered);
    });

    typeSelect.addEventListener('change', () => {
      currentType = typeSelect.value;
      const filtered = filterRequests();
      renderTable(filtered);
    });

    // New Leave Request button
    newLeaveBtn.addEventListener('click', () => {
      const employeeId = prompt('Employee ID:');
      if (!employeeId) return;

      const employeeName = prompt('Employee Name (optional):') || undefined;

      const typeStr = prompt('Leave Type (vacation, sick, fmla, military, jury, bereavement, personal, unpaid):');
      if (!typeStr) return;
      const leaveType = typeStr.trim().toLowerCase() as LeaveType;

      const startDate = prompt('Start Date (YYYY-MM-DD):');
      if (!startDate) return;

      const endDate = prompt('End Date (YYYY-MM-DD):');
      if (!endDate) return;

      const reason = prompt('Reason (optional):') || undefined;

      void (async () => {
        try {
          const svc = getHRService();
          await svc.requestLeave({
            employeeId,
            employeeName,
            type: leaveType,
            startDate,
            endDate,
            reason,
          });
          showMsg(wrapper, 'Leave request created.');
          void loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create leave request';
          showMsg(wrapper, message, 'error');
        }
      })();
    });

    // Initial load
    void loadData();
  },
};
