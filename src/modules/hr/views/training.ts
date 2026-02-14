/**
 * Training Records view.
 *
 * Lists all training records with summary stats, search/status filtering,
 * and action buttons to complete, cancel, or add new training entries.
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
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
];

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
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
    headerRow.appendChild(el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Training Records'));

    const addBtn = el(
      'button',
      { className: 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90' },
      'Add Training',
    );
    headerRow.appendChild(addBtn);
    wrapper.appendChild(headerRow);

    // Stats row
    const statsRow = el('div', { className: 'grid grid-cols-4 gap-4 mb-6' });
    wrapper.appendChild(statsRow);

    // Filter bar
    const filterBar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const searchInput = document.createElement('input') as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search training records...';
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
    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div', {});

    // Loading indicator
    const loadingEl = el(
      'div',
      { className: 'py-12 text-center text-[var(--text-muted)] text-sm' },
      'Loading training records...',
    );
    tableContainer.appendChild(loadingEl);
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // State
    let currentSearch = '';
    let currentStatus = '';
    let allRecords: any[] = [];

    // Stat card builder
    function buildStatCard(label: string, value: string | number): HTMLElement {
      const card = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4',
      });
      card.appendChild(el('div', { className: 'text-xs font-medium text-[var(--text-muted)] mb-1' }, String(label)));
      card.appendChild(el('div', { className: 'text-xl font-bold text-[var(--text)]' }, String(value)));
      return card;
    }

    function renderStats(records: any[]): void {
      statsRow.innerHTML = '';
      const total = records.length;
      const scheduled = records.filter((r: any) => r.status === 'scheduled').length;
      const inProgress = records.filter((r: any) => r.status === 'in_progress').length;
      const completed = records.filter((r: any) => r.status === 'completed').length;
      statsRow.appendChild(buildStatCard('Total Records', total));
      statsRow.appendChild(buildStatCard('Scheduled', scheduled));
      statsRow.appendChild(buildStatCard('In Progress', inProgress));
      statsRow.appendChild(buildStatCard('Completed', completed));
    }

    function filterRecords(): any[] {
      let filtered = [...allRecords];
      if (currentStatus) {
        filtered = filtered.filter((r: any) => r.status === currentStatus);
      }
      if (currentSearch) {
        const term = currentSearch.toLowerCase();
        filtered = filtered.filter(
          (r: any) =>
            (r.courseName ?? '').toLowerCase().includes(term) ||
            (r.provider ?? '').toLowerCase().includes(term) ||
            (r.employeeId ?? '').toLowerCase().includes(term),
        );
      }
      return filtered;
    }

    function renderTable(records: any[]): void {
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
        'Course Name',
        'Provider',
        'Scheduled Date',
        'Completed Date',
        'Hours',
        'Score',
        'Status',
        'Actions',
      ];
      for (const col of columns) {
        const align = col === 'Hours' || col === 'Score'
          ? 'py-2 px-3 font-medium text-right'
          : 'py-2 px-3 font-medium';
        headRow.appendChild(el('th', { className: align }, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      // Body
      const tbody = el('tbody', {});
      if (records.length === 0) {
        const tr = el('tr', {});
        const td = el('td', {
          className: 'py-8 px-3 text-center text-[var(--text-muted)]',
          colspan: String(columns.length),
        }, 'No training records found.');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const rec of records) {
        const tr = el('tr', {
          className: 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
        });

        tr.appendChild(el('td', { className: 'py-2 px-3 font-medium text-[var(--text)]' }, rec.employeeId ?? '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text)]' }, rec.courseName ?? '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, rec.provider || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, rec.scheduledDate || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, rec.completedDate || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-right font-mono' }, rec.hours != null ? String(rec.hours) : '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-right font-mono' }, rec.score != null ? String(rec.score) : '-'));

        // Status badge
        const tdStatus = el('td', { className: 'py-2 px-3' });
        const badgeCls = STATUS_BADGE[rec.status] ?? STATUS_BADGE['scheduled'];
        const badgeLabel = STATUS_LABEL[rec.status] ?? rec.status;
        tdStatus.appendChild(
          el('span', { className: `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}` }, badgeLabel),
        );
        tr.appendChild(tdStatus);

        // Actions
        const tdActions = el('td', { className: 'py-2 px-3' });
        const actionsWrap = el('div', { className: 'flex gap-2' });

        if (rec.status === 'scheduled' || rec.status === 'in_progress') {
          const completeBtn = el(
            'button',
            { className: 'text-emerald-400 hover:underline text-sm' },
            'Complete',
          );
          completeBtn.addEventListener('click', () => {
            const scoreStr = prompt('Enter score (optional, leave blank to skip):');
            const score = scoreStr !== null && scoreStr.trim() !== '' ? parseFloat(scoreStr) : undefined;
            void (async () => {
              try {
                const svc = getHRService();
                await svc.completeTraining(rec.id, score);
                showMsg(wrapper, 'Training marked as completed.');
                void loadData();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to complete training';
                showMsg(wrapper, message, 'error');
              }
            })();
          });
          actionsWrap.appendChild(completeBtn);

          const cancelBtn = el(
            'button',
            { className: 'text-red-400 hover:underline text-sm' },
            'Cancel',
          );
          cancelBtn.addEventListener('click', () => {
            void (async () => {
              try {
                const svc = getHRService();
                await svc.cancelTraining(rec.id);
                showMsg(wrapper, 'Training cancelled.');
                void loadData();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to cancel training';
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
          el('div', { className: 'py-12 text-center text-[var(--text-muted)] text-sm' }, 'Loading training records...'),
        );

        const svc = getHRService();
        allRecords = await svc.listTraining();

        // Add the internal id to each record for action lookups
        allRecords = allRecords.map((r: any) => ({ ...r, id: r.id ?? r._id }));

        renderStats(allRecords);
        const filtered = filterRecords();
        renderTable(filtered);
      } catch (err: unknown) {
        tableContainer.innerHTML = '';
        const message = err instanceof Error ? err.message : 'Failed to load training records';
        showMsg(wrapper, message, 'error');
      }
    }

    // Filter events
    searchInput.addEventListener('input', () => {
      currentSearch = searchInput.value;
      const filtered = filterRecords();
      renderTable(filtered);
    });

    statusSelect.addEventListener('change', () => {
      currentStatus = statusSelect.value;
      const filtered = filterRecords();
      renderTable(filtered);
    });

    // Add Training button
    addBtn.addEventListener('click', () => {
      const employeeId = prompt('Employee ID:');
      if (!employeeId) return;
      const courseName = prompt('Course Name:');
      if (!courseName) return;
      const provider = prompt('Provider (optional):') || undefined;
      const scheduledDate = prompt('Scheduled Date (YYYY-MM-DD):') || undefined;
      const hoursStr = prompt('Hours (optional):');
      const hours = hoursStr ? parseFloat(hoursStr) : undefined;

      void (async () => {
        try {
          const svc = getHRService();
          await svc.addTraining({
            employeeId,
            courseName,
            provider,
            scheduledDate,
            hours,
          });
          showMsg(wrapper, 'Training record added.');
          void loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add training';
          showMsg(wrapper, message, 'error');
        }
      })();
    });

    // Initial load
    void loadData();
  },
};
