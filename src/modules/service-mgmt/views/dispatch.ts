/**
 * Dispatch Board view.
 * Shows unassigned work orders and technician availability
 * with assign actions and summary stats.
 * Integrates with ServiceMgmtService for live data.
 */

import { getServiceMgmtService } from '../service-accessor';

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

function showMsg(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const colors: Record<string, string> = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };
  const toast = el('div', `fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-white text-sm shadow-lg ${colors[type]}`);
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  emergency: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UnassignedWO {
  id: string;
  number: string;
  customerId: string;
  priority: string;
  type: string;
  scheduledDate: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Unassigned Queue
// ---------------------------------------------------------------------------

function buildUnassignedQueue(
  workOrders: UnassignedWO[],
  onAssign: (woId: string) => void,
): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Unassigned Work Orders'));

  if (workOrders.length === 0) {
    section.appendChild(el('p', 'text-[var(--text-muted)] text-sm', 'No unassigned work orders.'));
    return section;
  }

  const list = el('div', 'space-y-2');
  for (const wo of workOrders) {
    const card = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3 hover:border-[var(--accent)] transition-colors');
    card.dataset.woId = wo.id;

    const topRow = el('div', 'flex items-center justify-between mb-1');
    topRow.appendChild(el('span', 'font-mono text-sm text-[var(--accent)]', wo.number));
    const prioBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[wo.priority] ?? PRIORITY_BADGE.medium}`,
      wo.priority);
    topRow.appendChild(prioBadge);
    card.appendChild(topRow);

    card.appendChild(el('div', 'text-sm text-[var(--text)]', wo.customerId));
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', `${wo.type} - ${wo.scheduledDate || 'Unscheduled'}`));
    if (wo.description) {
      card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1 truncate', wo.description));
    }

    // Assign button
    const assignBtn = el('button', 'mt-2 px-3 py-1 rounded text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Assign');
    assignBtn.type = 'button';
    assignBtn.addEventListener('click', () => onAssign(wo.id));
    card.appendChild(assignBtn);

    list.appendChild(card);
  }
  section.appendChild(list);

  return section;
}

// ---------------------------------------------------------------------------
// Assigned Work Orders Panel
// ---------------------------------------------------------------------------

function buildAssignedPanel(
  assignedWOs: { id: string; number: string; customerId: string; priority: string; assignedTo: string; scheduledDate: string }[],
): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Assigned / In Progress'));

  if (assignedWOs.length === 0) {
    section.appendChild(el('p', 'text-[var(--text-muted)] text-sm', 'No assigned work orders.'));
    return section;
  }

  const list = el('div', 'space-y-2');
  for (const wo of assignedWOs) {
    const card = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3');

    const topRow = el('div', 'flex items-center justify-between mb-1');
    topRow.appendChild(el('span', 'font-mono text-sm text-[var(--accent)]', wo.number));
    const prioBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[wo.priority] ?? PRIORITY_BADGE.medium}`,
      wo.priority);
    topRow.appendChild(prioBadge);
    card.appendChild(topRow);

    card.appendChild(el('div', 'text-sm text-[var(--text)]', wo.customerId));
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', `Assigned to: ${wo.assignedTo || '--'}`));
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)]', `Scheduled: ${wo.scheduledDate || '--'}`));

    list.appendChild(card);
  }
  section.appendChild(list);

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Dispatch Board'));

    const refreshBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Refresh');
    refreshBtn.type = 'button';
    headerRow.appendChild(refreshBtn);
    wrapper.appendChild(headerRow);

    // Stats row placeholder
    const statsContainer = el('div');
    wrapper.appendChild(statsContainer);

    // Loading indicator
    const loadingEl = el('div', 'text-center py-8 text-[var(--text-muted)]', 'Loading dispatch board...');
    wrapper.appendChild(loadingEl);

    // Two-column layout container
    const gridContainer = el('div');
    wrapper.appendChild(gridContainer);

    container.appendChild(wrapper);

    const loadData = async () => {
      loadingEl.textContent = 'Loading dispatch board...';
      loadingEl.style.display = '';
      gridContainer.innerHTML = '';
      statsContainer.innerHTML = '';

      try {
        const svc = getServiceMgmtService();

        // Load WOs by status in parallel
        const [openWOs, assignedWOs, inProgressWOs, completedWOs] = await Promise.all([
          svc.getWorkOrdersByStatus('open'),
          svc.getWorkOrdersByStatus('assigned'),
          svc.getWorkOrdersByStatus('in_progress'),
          svc.getWorkOrdersByStatus('completed'),
        ]);

        // Hide loading
        loadingEl.style.display = 'none';

        // Emergency count across all statuses
        const allActive = [...openWOs, ...assignedWOs, ...inProgressWOs];
        const emergencyCount = allActive.filter(wo => wo.priority === 'emergency').length;

        // Today's completed count
        const today = new Date().toISOString().split('T')[0];
        const completedToday = completedWOs.filter(wo => wo.completedDate === today).length;

        // Summary stats
        const statsRow = el('div', 'grid grid-cols-4 gap-4 mb-4');
        const buildStat = (label: string, value: string, accent?: boolean): HTMLElement => {
          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
          card.appendChild(el('div', `text-xl font-bold ${accent ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`, value));
          return card;
        };
        statsRow.appendChild(buildStat('Unassigned', String(openWOs.length), true));
        statsRow.appendChild(buildStat('In Progress', String(inProgressWOs.length)));
        statsRow.appendChild(buildStat('Emergency', String(emergencyCount), emergencyCount > 0));
        statsRow.appendChild(buildStat('Completed Today', String(completedToday)));
        statsContainer.appendChild(statsRow);

        // Map open WOs to unassigned display rows
        const unassigned: UnassignedWO[] = openWOs.map(wo => ({
          id: wo.id,
          number: wo.number,
          customerId: wo.customerId,
          priority: wo.priority,
          type: wo.type,
          scheduledDate: wo.scheduledDate ?? '',
          description: wo.description ?? wo.problemDescription ?? '',
        }));

        // Map assigned/in-progress WOs for the right panel
        const assignedDisplay = [...assignedWOs, ...inProgressWOs].map(wo => ({
          id: wo.id,
          number: wo.number,
          customerId: wo.customerId,
          priority: wo.priority,
          assignedTo: wo.assignedTo ?? '',
          scheduledDate: wo.scheduledDate ?? '',
        }));

        // Two-column layout
        const grid = el('div', 'grid grid-cols-2 gap-4');

        // Unassigned queue with assign action
        grid.appendChild(buildUnassignedQueue(unassigned, async (woId: string) => {
          const technicianId = prompt('Enter technician ID to assign:');
          if (!technicianId) return;

          try {
            await svc.dispatch(woId, technicianId.trim());
            showMsg('Work order dispatched successfully.', 'success');
            await loadData();
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            showMsg(`Dispatch failed: ${errMsg}`, 'error');
          }
        }));

        // Assigned panel
        grid.appendChild(buildAssignedPanel(assignedDisplay));

        gridContainer.appendChild(grid);
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        const errMsg = err instanceof Error ? err.message : String(err);
        showMsg(`Failed to load dispatch board: ${errMsg}`, 'error');
        gridContainer.appendChild(el('div', 'text-center py-8 text-red-400', `Error loading dispatch board: ${errMsg}`));
      }
    };

    // Wire refresh button
    refreshBtn.addEventListener('click', () => {
      loadData();
    });

    // Initial load
    loadData();
  },
};
