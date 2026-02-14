/**
 * Safety Training Matrix view.
 * Displays training records with filtering by employee, status, and search.
 * Supports completing training and adding new training records.
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
  { value: 'required', label: 'Required' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' },
  { value: 'waived', label: 'Waived' },
];

const STATUS_BADGE: Record<string, string> = {
  required: 'bg-red-500/10 text-red-400 border border-red-500/20',
  scheduled: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
  waived: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  required: 'Required',
  scheduled: 'Scheduled',
  completed: 'Completed',
  expired: 'Expired',
  waived: 'Waived',
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
    headerRow.appendChild(el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Safety Training Matrix'));
    const addBtn = el('button', { className: btnCls, type: 'button' }, 'Add Training');
    headerRow.appendChild(addBtn);
    wrapper.appendChild(headerRow);

    // ---- Employee Filter ----
    const empRow = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });
    const empInput = el('input', {
      className: inputCls,
      type: 'text',
      placeholder: 'Employee ID (optional)',
    }) as HTMLInputElement;
    empRow.appendChild(empInput);
    const empFilterBtn = el('button', { className: btnCls, type: 'button' }, 'Filter');
    empRow.appendChild(empFilterBtn);
    wrapper.appendChild(empRow);

    // ---- Summary Stats ----
    const statsContainer = el('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6' });
    wrapper.appendChild(statsContainer);

    // ---- Filter Bar ----
    const filterBar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });

    const searchInput = el('input', {
      className: inputCls,
      type: 'text',
      placeholder: 'Search training records...',
    }) as HTMLInputElement;
    filterBar.appendChild(searchInput);

    const statusSelect = el('select', { className: inputCls }) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);
    wrapper.appendChild(filterBar);

    // ---- Loading State ----
    const loadingEl = el(
      'div',
      { className: 'py-8 text-center text-[var(--text-muted)] text-sm' },
      'Loading training data...',
    );
    wrapper.appendChild(loadingEl);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // -------------------------------------------------------------------
    // Data loading & rendering
    // -------------------------------------------------------------------

    let filterByEmployee = '';

    function renderStats(
      entries: Array<{ status: string }>,
    ): void {
      statsContainer.innerHTML = '';

      const total = entries.length;
      const required = entries.filter((e) => e.status === 'required').length;
      const completed = entries.filter((e) => e.status === 'completed').length;
      const expired = entries.filter((e) => e.status === 'expired').length;

      const cards: Array<{ label: string; value: number; cls: string }> = [
        { label: 'Total Entries', value: total, cls: 'text-[var(--text)]' },
        { label: 'Required', value: required, cls: required > 0 ? 'text-red-400' : 'text-[var(--text)]' },
        { label: 'Completed', value: completed, cls: 'text-emerald-400' },
        { label: 'Expired', value: expired, cls: expired > 0 ? 'text-red-400' : 'text-[var(--text)]' },
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

    async function loadAndRender(): Promise<void> {
      try {
        const svc = getSafetyService();
        loadingEl.style.display = 'block';
        tableContainer.innerHTML = '';

        let items: Array<any>;

        if (filterByEmployee) {
          items = await svc.getTrainingMatrix(filterByEmployee);
        } else {
          items = await svc.listSafetyTraining();
        }

        loadingEl.style.display = 'none';

        // Render stats from all loaded items (before client-side filtering)
        renderStats(items);

        // Client-side filtering
        const searchQuery = searchInput.value.trim().toLowerCase();
        const statusFilter = statusSelect.value;

        let filtered = items;

        if (statusFilter) {
          filtered = filtered.filter((t: any) => t.status === statusFilter);
        }

        if (searchQuery) {
          filtered = filtered.filter((t: any) => {
            const searchable = [
              t.employeeName ?? '',
              t.employeeId ?? '',
              t.courseName ?? '',
              t.provider ?? '',
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
        const columns = ['Employee', 'Course Name', 'Status', 'Required Date', 'Completed Date', 'Expiration Date', 'Provider', 'Actions'];
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
          }, 'No training records found.');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of filtered) {
          const tr = el('tr', { className: 'border-t border-[var(--border)] hover:bg-[var(--surface)]' });

          // Employee
          const empText = item.employeeName
            ? `${item.employeeName} (${item.employeeId})`
            : item.employeeId;
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text)] font-medium' }, empText));

          // Course Name
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text)]' }, item.courseName ?? ''));

          // Status badge
          const tdStatus = el('td', { className: 'px-4 py-3 text-sm' });
          const badgeCls = STATUS_BADGE[item.status] ?? STATUS_BADGE.required;
          tdStatus.appendChild(el('span', {
            className: `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}`,
          }, STATUS_LABEL[item.status] ?? item.status));
          tr.appendChild(tdStatus);

          // Required Date
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text-muted)]' }, item.requiredDate || '-'));

          // Completed Date
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text-muted)]' }, item.completedDate || '-'));

          // Expiration Date
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text-muted)]' }, item.expirationDate || '-'));

          // Provider
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text-muted)]' }, item.provider || '-'));

          // Actions
          const tdActions = el('td', { className: 'px-4 py-3 text-sm' });
          const actionsWrap = el('div', { className: 'flex items-center gap-3' });

          if (item.status === 'required' || item.status === 'scheduled') {
            const completeBtn = el('button', {
              className: 'text-emerald-400 hover:underline text-sm',
              type: 'button',
            }, 'Complete');
            completeBtn.addEventListener('click', () => {
              void (async () => {
                try {
                  await svc.completeSafetyTraining(item.id);
                  showMsg(wrapper, `Training "${item.courseName}" marked as completed.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to complete training.';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            actionsWrap.appendChild(completeBtn);
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
        const message = err instanceof Error ? err.message : 'Failed to load training data.';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Add Training Handler ----
    addBtn.addEventListener('click', () => {
      const employeeId = prompt('Employee ID:');
      if (!employeeId) return;
      const employeeName = prompt('Employee Name:');
      if (!employeeName) return;
      const courseName = prompt('Course Name:');
      if (!courseName) return;
      const status = prompt('Status (required / scheduled):', 'required');
      if (!status) return;
      const requiredDate = prompt('Required Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
      const provider = prompt('Provider (optional):');

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.addSafetyTraining({
            employeeId,
            employeeName,
            courseName,
            status: status as 'required' | 'scheduled',
            requiredDate: requiredDate || undefined,
            provider: provider || undefined,
          });
          showMsg(wrapper, `Training "${courseName}" added for ${employeeName}.`, false);
          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add training.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Employee Filter Handler ----
    empFilterBtn.addEventListener('click', () => {
      filterByEmployee = empInput.value.trim();
      void loadAndRender();
    });

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAndRender();
  },
};
