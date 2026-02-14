/**
 * Tasks view.
 * Task listing with hierarchy, status, dependencies, percent complete,
 * critical path indicator, and resource type.
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'delayed', label: 'Delayed' },
];

const STATUS_BADGE: Record<string, string> = {
  not_started: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  delayed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskRow {
  id: string;
  name: string;
  assignee: string;
  status: string;
  startDate: string;
  endDate: string;
  duration: number;
  percentComplete: number;
  isCriticalPath: boolean;
  resourceType: string;
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
  searchInput.placeholder = 'Search tasks...';
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

function buildProgressBar(pct: number): HTMLElement {
  const wrapper = el('div', 'flex items-center gap-2');
  const track = el('div', 'w-20 h-2 bg-[var(--surface)] rounded-full overflow-hidden');
  const fill = el('div', 'h-full rounded-full bg-blue-500');
  fill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  track.appendChild(fill);
  wrapper.appendChild(track);
  wrapper.appendChild(el('span', 'text-xs text-[var(--text-muted)] font-mono', `${pct}%`));
  return wrapper;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  tasks: TaskRow[],
  onEdit: (task: TaskRow) => void,
  onComplete: (task: TaskRow) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Task', 'Assignee', 'Status', 'Start', 'End', 'Duration', '% Complete', 'CP', 'Resource', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (tasks.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No tasks found. Create tasks to manage project work.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const task of tasks) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', task.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', task.assignee));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[task.status] ?? STATUS_BADGE.not_started}`,
      task.status.replace(/_/g, ' '));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', task.startDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', task.endDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${task.duration}d`));

    const tdPct = el('td', 'py-2 px-3');
    tdPct.appendChild(buildProgressBar(task.percentComplete));
    tr.appendChild(tdPct);

    const tdCp = el('td', 'py-2 px-3');
    if (task.isCriticalPath) {
      tdCp.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20', 'CP'));
    }
    tr.appendChild(tdCp);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] capitalize', task.resourceType));

    const tdActions = el('td', 'py-2 px-3');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit');
    editBtn.type = 'button';
    editBtn.addEventListener('click', () => onEdit(task));
    tdActions.appendChild(editBtn);

    if (task.status !== 'completed') {
      const completeBtn = el('button', 'text-emerald-400 hover:underline text-sm', 'Complete');
      completeBtn.type = 'button';
      completeBtn.addEventListener('click', () => onComplete(task));
      tdActions.appendChild(completeBtn);
    }

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

    const projectId = parseProjectId();

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleRow = el('div', 'flex items-center gap-4');
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Tasks'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Project') as HTMLAnchorElement;
    backLink.href = `#/project/${projectId}`;
    titleRow.appendChild(backLink);
    headerRow.appendChild(titleRow);

    const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Task');
    addBtn.type = 'button';
    headerRow.appendChild(addBtn);
    wrapper.appendChild(headerRow);

    // Service and state
    const svc = getProjectService();
    let allTasks: TaskRow[] = [];
    let tableContainer: HTMLElement | null = null;
    let currentStatus = '';
    let currentSearch = '';

    /** Replace the table element */
    function replaceTable(tasks: TaskRow[]): void {
      const newTable = buildTable(tasks, handleEdit, handleComplete);
      if (tableContainer) {
        wrapper.replaceChild(newTable, tableContainer);
      } else {
        wrapper.appendChild(newTable);
      }
      tableContainer = newTable;
    }

    /** Client-side filter on name/assignee + status */
    function applyFilters(tasks: TaskRow[], status: string, search: string): TaskRow[] {
      let filtered = tasks;
      if (status) {
        filtered = filtered.filter((t) => t.status === status);
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (t) => t.name.toLowerCase().includes(q) || t.assignee.toLowerCase().includes(q),
        );
      }
      return filtered;
    }

    /** Load tasks from the service */
    async function loadTasks(): Promise<void> {
      try {
        const tasks = await svc.getTasks(projectId);
        allTasks = tasks.map((t: any) => ({
          id: t.id,
          name: t.name || '',
          assignee: t.assignee || '',
          status: t.status || 'not_started',
          startDate: t.startDate || '',
          endDate: t.endDate || '',
          duration: t.duration ?? 0,
          percentComplete: t.percentComplete ?? 0,
          isCriticalPath: t.isCriticalPath ?? false,
          resourceType: t.resourceType || '',
        }));
        const filtered = applyFilters(allTasks, currentStatus, currentSearch);
        replaceTable(filtered);
      } catch (err: any) {
        showMsg(wrapper, `Failed to load tasks: ${err.message ?? err}`, true);
      }
    }

    /** Handle add task */
    async function handleAdd(): Promise<void> {
      const name = window.prompt('Task name:');
      if (!name?.trim()) return;

      const startDate = window.prompt('Start date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
      if (!startDate) return;

      const endDate = window.prompt('End date (YYYY-MM-DD):');
      if (!endDate) return;

      const assignee = window.prompt('Assignee (optional):') || '';

      try {
        await svc.createTask({
          projectId,
          name: name.trim(),
          startDate,
          endDate,
          assignee: assignee.trim() || undefined,
        } as any);
        showMsg(wrapper, 'Task created successfully.', false);
        await loadTasks();
      } catch (err: any) {
        showMsg(wrapper, `Failed to create task: ${err.message ?? err}`, true);
      }
    }

    /** Handle edit task */
    async function handleEdit(task: TaskRow): Promise<void> {
      const name = window.prompt('Task name:', task.name);
      if (name === null) return;

      const assignee = window.prompt('Assignee:', task.assignee);
      if (assignee === null) return;

      const startDate = window.prompt('Start date (YYYY-MM-DD):', task.startDate);
      if (startDate === null) return;

      const endDate = window.prompt('End date (YYYY-MM-DD):', task.endDate);
      if (endDate === null) return;

      const pctStr = window.prompt('% Complete:', String(task.percentComplete));
      if (pctStr === null) return;

      try {
        const changes: Record<string, any> = {};
        if (name.trim()) changes.name = name.trim();
        if (assignee.trim() !== task.assignee) changes.assignee = assignee.trim();
        if (startDate !== task.startDate) changes.startDate = startDate;
        if (endDate !== task.endDate) changes.endDate = endDate;
        const pct = parseFloat(pctStr);
        if (!isNaN(pct) && pct !== task.percentComplete) changes.percentComplete = pct;

        if (Object.keys(changes).length > 0) {
          await svc.updateTask(task.id, changes);
          showMsg(wrapper, 'Task updated successfully.', false);
          await loadTasks();
        }
      } catch (err: any) {
        showMsg(wrapper, `Failed to update task: ${err.message ?? err}`, true);
      }
    }

    /** Handle complete task */
    async function handleComplete(task: TaskRow): Promise<void> {
      try {
        await svc.completeTask(task.id);
        showMsg(wrapper, `Task "${task.name}" marked as completed.`, false);
        await loadTasks();
      } catch (err: any) {
        showMsg(wrapper, `Failed to complete task: ${err.message ?? err}`, true);
      }
    }

    // Wire Add Task button
    addBtn.addEventListener('click', () => { handleAdd(); });

    // Wire filter bar
    const filterBar = buildFilterBar((status, search) => {
      currentStatus = status;
      currentSearch = search;
      const filtered = applyFilters(allTasks, status, search);
      replaceTable(filtered);
    });
    wrapper.appendChild(filterBar);

    // Initial empty table placeholder
    tableContainer = buildTable([], handleEdit, handleComplete);
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // Kick off initial load
    loadTasks();
  },
};
