/**
 * Project List view.
 * Filterable table of projects with status, % complete bar, dates, and manager.
 */

import { getProjectService } from '../service-accessor';

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

function parseProjectId(): string {
  const hash = window.location.hash;
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts.length >= 2 && parts[0] === 'project') return parts[1];
  return '';
}

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE: Record<string, string> = {
  planning: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  on_hold: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  manager: string;
  startDate: string;
  endDate: string;
  percentComplete: number;
  budgetedCost: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search projects...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => onFilter(statusSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------

function buildProgressBar(percent: number): HTMLElement {
  const wrapper = el('div', 'flex items-center gap-2');

  const track = el('div', 'w-24 h-2 bg-[var(--surface)] rounded-full overflow-hidden');
  const fill = el('div', 'h-full rounded-full transition-all');

  const pct = Math.min(100, Math.max(0, percent));
  fill.style.width = `${pct}%`;

  if (pct >= 100) {
    fill.className += ' bg-emerald-500';
  } else if (pct >= 50) {
    fill.className += ' bg-blue-500';
  } else if (pct > 0) {
    fill.className += ' bg-amber-500';
  } else {
    fill.className += ' bg-zinc-500';
  }

  track.appendChild(fill);
  wrapper.appendChild(track);
  wrapper.appendChild(el('span', 'text-xs text-[var(--text-muted)] font-mono', `${pct}%`));
  return wrapper;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(projects: ProjectRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Project', 'Status', 'Manager', 'Start', 'End', '% Complete', 'Budget', 'Actions']) {
    const align = col === 'Budget' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (projects.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No projects found. Create your first project to get started.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const proj of projects) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline font-medium', proj.name) as HTMLAnchorElement;
    link.href = `#/project/${proj.id}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[proj.status] ?? STATUS_BADGE.active}`,
      proj.status.replace('_', ' '));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', proj.manager));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', proj.startDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', proj.endDate));

    const tdProgress = el('td', 'py-2 px-3');
    tdProgress.appendChild(buildProgressBar(proj.percentComplete));
    tr.appendChild(tdProgress);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(proj.budgetedCost)));

    const tdActions = el('td', 'py-2 px-3');
    const ganttLink = el('a', 'text-[var(--accent)] hover:underline text-sm mr-3', 'Gantt') as HTMLAnchorElement;
    ganttLink.href = `#/project/${proj.id}/gantt`;
    tdActions.appendChild(ganttLink);
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/project/${proj.id}`;
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Projects'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/project/new';
    newBtn.textContent = 'New Project';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Holds the current full list from the service (filtered by status)
    let allProjects: ProjectRow[] = [];
    // Reference to the table container so we can swap it on filter/search
    let tableContainer: HTMLElement | null = null;

    const svc = getProjectService();

    /** Replace the table element inside the wrapper */
    function replaceTable(projects: ProjectRow[]): void {
      const newTable = buildTable(projects);
      if (tableContainer) {
        wrapper.replaceChild(newTable, tableContainer);
      } else {
        wrapper.appendChild(newTable);
      }
      tableContainer = newTable;
    }

    /** Load projects from the service, applying optional status filter */
    async function loadProjects(statusFilter: string, searchTerm: string): Promise<void> {
      try {
        const filters: Record<string, string> = {};
        if (statusFilter) filters.status = statusFilter;

        const projects = await svc.getProjects(Object.keys(filters).length ? filters : undefined);

        allProjects = projects.map((p: any) => ({
          id: p.id,
          name: p.name || '',
          status: p.status || 'planning',
          manager: p.manager || '',
          startDate: p.startDate || '',
          endDate: p.endDate || '',
          percentComplete: p.percentComplete ?? 0,
          budgetedCost: p.budgetedCost ?? 0,
        }));

        // Apply client-side search
        const filtered = applySearch(allProjects, searchTerm);
        replaceTable(filtered);
      } catch (err: any) {
        showMsg(wrapper, `Failed to load projects: ${err.message ?? err}`, true);
      }
    }

    /** Client-side search on name and manager */
    function applySearch(projects: ProjectRow[], search: string): ProjectRow[] {
      if (!search.trim()) return projects;
      const q = search.toLowerCase();
      return projects.filter(
        (p) => p.name.toLowerCase().includes(q) || p.manager.toLowerCase().includes(q),
      );
    }

    // Track current filter values so the filter bar can coordinate
    let currentStatus = '';
    let currentSearch = '';

    const filterBar = buildFilterBar((status, search) => {
      // If status changed, reload from service. If only search changed, filter client-side.
      if (status !== currentStatus) {
        currentStatus = status;
        currentSearch = search;
        loadProjects(status, search);
      } else {
        currentSearch = search;
        const filtered = applySearch(allProjects, search);
        replaceTable(filtered);
      }
    });

    wrapper.appendChild(filterBar);

    // Initial empty table placeholder (will be replaced by loadProjects)
    tableContainer = buildTable([]);
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // Kick off initial load
    loadProjects('', '');
  },
};
