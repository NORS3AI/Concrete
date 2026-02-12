/**
 * Tasks view.
 * Task listing with hierarchy, status, dependencies, percent complete,
 * critical path indicator, and resource type.
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

function buildTable(tasks: TaskRow[]): HTMLElement {
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
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Edit');
    editBtn.type = 'button';
    tdActions.appendChild(editBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Tasks'));
    const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Task');
    addBtn.type = 'button';
    addBtn.addEventListener('click', () => { /* add task placeholder */ });
    headerRow.appendChild(addBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const tasks: TaskRow[] = [];
    wrapper.appendChild(buildTable(tasks));

    container.appendChild(wrapper);
  },
};
