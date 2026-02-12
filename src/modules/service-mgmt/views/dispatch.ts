/**
 * Dispatch Board view.
 * Shows unassigned work orders and technician availability
 * with a drag-to-assign layout concept.
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
  customerName: string;
  priority: string;
  type: string;
  scheduledDate: string;
  description: string;
}

interface Technician {
  id: string;
  name: string;
  assignedCount: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Unassigned Queue
// ---------------------------------------------------------------------------

function buildUnassignedQueue(workOrders: UnassignedWO[]): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Unassigned Work Orders'));

  if (workOrders.length === 0) {
    section.appendChild(el('p', 'text-[var(--text-muted)] text-sm', 'No unassigned work orders.'));
    return section;
  }

  const list = el('div', 'space-y-2');
  for (const wo of workOrders) {
    const card = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3 cursor-grab hover:border-[var(--accent)] transition-colors');
    card.setAttribute('draggable', 'true');
    card.dataset.woId = wo.id;

    const topRow = el('div', 'flex items-center justify-between mb-1');
    topRow.appendChild(el('span', 'font-mono text-sm text-[var(--accent)]', wo.number));
    const prioBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[wo.priority] ?? PRIORITY_BADGE.medium}`,
      wo.priority);
    topRow.appendChild(prioBadge);
    card.appendChild(topRow);

    card.appendChild(el('div', 'text-sm text-[var(--text)]', wo.customerName));
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', `${wo.type} - ${wo.scheduledDate}`));
    if (wo.description) {
      card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1 truncate', wo.description));
    }

    list.appendChild(card);
  }
  section.appendChild(list);

  return section;
}

// ---------------------------------------------------------------------------
// Technician Lanes
// ---------------------------------------------------------------------------

function buildTechnicianLanes(technicians: Technician[]): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Technicians'));

  if (technicians.length === 0) {
    section.appendChild(el('p', 'text-[var(--text-muted)] text-sm', 'No technicians configured.'));
    return section;
  }

  const lanes = el('div', 'space-y-3');
  for (const tech of technicians) {
    const lane = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3 min-h-[80px]');
    lane.dataset.techId = tech.id;

    const header = el('div', 'flex items-center justify-between mb-2');
    header.appendChild(el('span', 'text-sm font-medium text-[var(--text)]', tech.name));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]',
      `${tech.assignedCount} assigned`);
    header.appendChild(countBadge);
    lane.appendChild(header);

    lane.appendChild(el('div', 'text-xs text-[var(--text-muted)]', `Status: ${tech.status}`));

    // Drop zone placeholder
    const dropZone = el('div', 'mt-2 border-2 border-dashed border-[var(--border)] rounded p-2 text-center text-xs text-[var(--text-muted)]', 'Drop work order here');
    lane.appendChild(dropZone);

    lanes.appendChild(lane);
  }
  section.appendChild(lanes);

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
    refreshBtn.addEventListener('click', () => { /* refresh placeholder */ });
    headerRow.appendChild(refreshBtn);
    wrapper.appendChild(headerRow);

    // Summary stats
    const statsRow = el('div', 'grid grid-cols-4 gap-4 mb-4');
    const buildStat = (label: string, value: string, accent?: boolean): HTMLElement => {
      const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
      card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
      card.appendChild(el('div', `text-xl font-bold ${accent ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`, value));
      return card;
    };
    statsRow.appendChild(buildStat('Unassigned', '0', true));
    statsRow.appendChild(buildStat('In Progress', '0'));
    statsRow.appendChild(buildStat('Emergency', '0'));
    statsRow.appendChild(buildStat('Completed Today', '0'));
    wrapper.appendChild(statsRow);

    // Two-column layout
    const grid = el('div', 'grid grid-cols-2 gap-4');

    const unassigned: UnassignedWO[] = [];
    grid.appendChild(buildUnassignedQueue(unassigned));

    const technicians: Technician[] = [];
    grid.appendChild(buildTechnicianLanes(technicians));

    wrapper.appendChild(grid);
    container.appendChild(wrapper);
  },
};
