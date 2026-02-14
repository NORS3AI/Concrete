/**
 * Corrective Action Tracking view.
 * Lists corrective actions with filtering by status, priority, and search.
 * Supports completing, verifying, and creating new corrective actions.
 * Wired to SafetyService for data and mutation operations.
 */

import { getSafetyService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(
  tag: string,
  attrs?: Record<string, string>,
  ...children: Array<string | HTMLElement>
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
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'verified', label: 'Verified' },
  { value: 'overdue', label: 'Overdue' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  verified: 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/30 font-bold',
  overdue: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  verified: 'Verified',
  overdue: 'Overdue',
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
  high: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  low: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

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

    // ---- Header ----
    const headerRow = el('div', { className: 'flex items-center justify-between mb-4' });
    headerRow.appendChild(el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Corrective Action Tracking'));
    const newBtn = el('button', { className: btnCls, type: 'button' }, 'New Action');
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Stats ----
    const statsContainer = el('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-4 mb-6' });
    wrapper.appendChild(statsContainer);

    // ---- Filter Bar ----
    const filterBar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });

    const searchInput = el('input', {
      className: inputCls,
      type: 'text',
      placeholder: 'Search actions...',
    }) as HTMLInputElement;
    filterBar.appendChild(searchInput);

    const statusSelect = el('select', { className: inputCls }) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const prioritySelect = el('select', { className: inputCls }) as HTMLSelectElement;
    for (const opt of PRIORITY_OPTIONS) {
      const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
      prioritySelect.appendChild(o);
    }
    filterBar.appendChild(prioritySelect);

    wrapper.appendChild(filterBar);

    // ---- Loading State ----
    const loadingEl = el(
      'div',
      { className: 'py-8 text-center text-[var(--text-muted)] text-sm' },
      'Loading corrective actions...',
    );
    wrapper.appendChild(loadingEl);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // -------------------------------------------------------------------
    // Data loading & rendering
    // -------------------------------------------------------------------

    function renderStats(
      items: Array<{ status: string }>,
    ): void {
      statsContainer.innerHTML = '';

      const total = items.length;
      const open = items.filter((i) => i.status === 'open' || i.status === 'in_progress').length;
      const overdue = items.filter((i) => i.status === 'overdue').length;
      const completed = items.filter((i) => i.status === 'completed').length;
      const verified = items.filter((i) => i.status === 'verified').length;

      const cards: Array<{ label: string; value: number; cls: string }> = [
        { label: 'Total Actions', value: total, cls: 'text-[var(--text)]' },
        { label: 'Open', value: open, cls: open > 0 ? 'text-amber-400' : 'text-[var(--text)]' },
        { label: 'Overdue', value: overdue, cls: overdue > 0 ? 'text-red-400' : 'text-[var(--text)]' },
        { label: 'Completed', value: completed, cls: 'text-emerald-400' },
        { label: 'Verified', value: verified, cls: 'text-emerald-400' },
      ];

      for (const card of cards) {
        const c = el('div', {
          className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4',
        });
        c.appendChild(el('div', { className: 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1' }, card.label));
        c.appendChild(el('div', { className: `text-2xl font-bold ${card.cls}` }, String(card.value)));
        statsContainer.appendChild(c);
      }
    }

    function isOverdue(dueDate: string): boolean {
      const today = new Date().toISOString().split('T')[0];
      return dueDate < today;
    }

    async function loadAndRender(): Promise<void> {
      try {
        const svc = getSafetyService();
        loadingEl.style.display = 'block';
        tableContainer.innerHTML = '';

        const allItems = await svc.listCorrectiveActions();

        loadingEl.style.display = 'none';

        // Render stats from all items (before client-side filtering)
        renderStats(allItems);

        // Client-side filtering
        const searchQuery = searchInput.value.trim().toLowerCase();
        const statusFilter = statusSelect.value;
        const priorityFilter = prioritySelect.value;

        let filtered = allItems;

        if (statusFilter) {
          filtered = filtered.filter((i: any) => i.status === statusFilter);
        }

        if (priorityFilter) {
          filtered = filtered.filter((i: any) => i.priority === priorityFilter);
        }

        if (searchQuery) {
          filtered = filtered.filter((i: any) => {
            const searchable = [
              i.number ?? '',
              i.description ?? '',
              i.assignedTo ?? '',
            ].join(' ').toLowerCase();
            return searchable.includes(searchQuery);
          });
        }

        // Build table
        const wrap = el('div', {
          className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
        });
        const table = el('table', { className: 'w-full text-sm' });

        // Table header
        const thead = el('thead');
        const headRow = el('tr', { className: 'border-b border-[var(--border)]' });
        const columns = ['Number', 'Description', 'Priority', 'Status', 'Assigned To', 'Assigned Date', 'Due Date', 'Completed Date', 'Verified By', 'Actions'];
        for (const col of columns) {
          headRow.appendChild(el('th', {
            className: 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3',
          }, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Table body
        const tbody = el('tbody');
        if (filtered.length === 0) {
          const tr = el('tr');
          const td = el('td', {
            className: 'py-8 px-4 text-center text-[var(--text-muted)]',
            colspan: String(columns.length),
          }, 'No corrective actions found.');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of filtered) {
          const tr = el('tr', { className: 'border-t border-[var(--border)] hover:bg-[var(--surface)]' });

          // Number
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text)] font-mono font-medium' }, item.number));

          // Description
          const descText = item.description.length > 60
            ? item.description.substring(0, 60) + '...'
            : item.description;
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text)]' }, descText));

          // Priority badge
          const tdPriority = el('td', { className: 'px-4 py-3 text-sm' });
          const priBadgeCls = PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.medium;
          tdPriority.appendChild(el('span', {
            className: `px-2 py-1 rounded-full text-xs font-medium ${priBadgeCls}`,
          }, PRIORITY_LABEL[item.priority] ?? item.priority));
          tr.appendChild(tdPriority);

          // Status badge
          const tdStatus = el('td', { className: 'px-4 py-3 text-sm' });
          const stBadgeCls = STATUS_BADGE[item.status] ?? STATUS_BADGE.open;
          tdStatus.appendChild(el('span', {
            className: `px-2 py-1 rounded-full text-xs font-medium ${stBadgeCls}`,
          }, STATUS_LABEL[item.status] ?? item.status));
          tr.appendChild(tdStatus);

          // Assigned To
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text)]' }, item.assignedTo));

          // Assigned Date
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text-muted)]' }, item.assignedDate || '-'));

          // Due Date (highlight if overdue)
          const dueDateOverdue = (item.status === 'open' || item.status === 'in_progress' || item.status === 'overdue') && isOverdue(item.dueDate);
          const dueDateCls = dueDateOverdue
            ? 'px-4 py-3 text-sm text-red-400 font-medium'
            : 'px-4 py-3 text-sm text-[var(--text-muted)]';
          tr.appendChild(el('td', { className: dueDateCls }, item.dueDate || '-'));

          // Completed Date
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text-muted)]' }, item.completedDate || '-'));

          // Verified By
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text-muted)]' }, item.verifiedBy || '-'));

          // Actions
          const tdActions = el('td', { className: 'px-4 py-3 text-sm' });
          const actionsWrap = el('div', { className: 'flex items-center gap-3' });

          if (item.status === 'open' || item.status === 'in_progress' || item.status === 'overdue') {
            const completeBtn = el('button', {
              className: 'text-emerald-400 hover:underline text-sm',
              type: 'button',
            }, 'Complete');
            completeBtn.addEventListener('click', () => {
              void (async () => {
                try {
                  await svc.completeCorrectiveAction(item.id);
                  showMsg(wrapper, `Corrective action "${item.number}" marked as completed.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to complete corrective action.';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            actionsWrap.appendChild(completeBtn);
          }

          if (item.status === 'completed') {
            const verifyBtn = el('button', {
              className: 'text-blue-400 hover:underline text-sm',
              type: 'button',
            }, 'Verify');
            verifyBtn.addEventListener('click', () => {
              const verifierName = prompt('Verifier Name:');
              if (!verifierName) return;
              void (async () => {
                try {
                  await svc.verifyCorrectiveAction(item.id, verifierName);
                  showMsg(wrapper, `Corrective action "${item.number}" verified by ${verifierName}.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to verify corrective action.';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            actionsWrap.appendChild(verifyBtn);
          }

          tdActions.appendChild(actionsWrap);
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        const message = err instanceof Error ? err.message : 'Failed to load corrective actions.';
        showMsg(wrapper, message, true);
      }
    }

    // ---- New Action Handler ----
    newBtn.addEventListener('click', () => {
      const number = prompt('Action Number (e.g., CA-001):');
      if (!number) return;
      const description = prompt('Description:');
      if (!description) return;
      const priority = prompt('Priority (critical / high / medium / low):', 'medium');
      if (!priority) return;
      const assignedTo = prompt('Assigned To:');
      if (!assignedTo) return;
      const dueDate = prompt('Due Date (YYYY-MM-DD):');
      if (!dueDate) return;
      const incidentId = prompt('Incident ID (optional):');
      const inspectionId = prompt('Inspection ID (optional):');
      const jobId = prompt('Job ID (optional):');

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.createCorrectiveAction({
            number,
            description,
            priority: priority as 'critical' | 'high' | 'medium' | 'low',
            assignedTo,
            dueDate,
            incidentId: incidentId || undefined,
            inspectionId: inspectionId || undefined,
            jobId: jobId || undefined,
          });
          showMsg(wrapper, `Corrective action "${number}" created.`, false);
          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create corrective action.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());
    prioritySelect.addEventListener('change', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAndRender();
  },
};
