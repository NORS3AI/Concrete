/**
 * Look-Ahead Schedule view.
 * Displays tasks within 2-week, 4-week, or 6-week look-ahead windows
 * with task timeline bars and status indicators.
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

const WEEK_OPTIONS = [
  { value: '2', label: '2 Weeks' },
  { value: '4', label: '4 Weeks' },
  { value: '6', label: '6 Weeks' },
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

interface LookAheadTask {
  id: string;
  name: string;
  assignee: string;
  startDate: string;
  endDate: string;
  percentComplete: number;
  status: string;
  isCriticalPath: boolean;
}

// ---------------------------------------------------------------------------
// Week Toggle
// ---------------------------------------------------------------------------

function buildWeekToggle(
  selected: string,
  onChange: (weeks: string) => void,
): HTMLElement {
  const toggle = el('div', 'flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1');

  for (const opt of WEEK_OPTIONS) {
    const btn = el('button', '', opt.label);
    btn.type = 'button';

    if (opt.value === selected) {
      btn.className = 'px-3 py-1 rounded-md text-sm font-medium bg-[var(--accent)] text-white';
    } else {
      btn.className = 'px-3 py-1 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]';
    }

    btn.addEventListener('click', () => onChange(opt.value));
    toggle.appendChild(btn);
  }

  return toggle;
}

// ---------------------------------------------------------------------------
// Timeline Rows
// ---------------------------------------------------------------------------

function buildTimeline(tasks: LookAheadTask[], weeks: number): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');

  // Header
  const headerRow = el('div', 'flex items-center border-b border-[var(--border)] text-xs text-[var(--text-muted)]');
  const labelCol = el('div', 'w-56 flex-shrink-0 py-2 px-3 font-medium border-r border-[var(--border)]');
  labelCol.textContent = 'Task';
  headerRow.appendChild(labelCol);

  const assigneeCol = el('div', 'w-28 flex-shrink-0 py-2 px-3 font-medium border-r border-[var(--border)]');
  assigneeCol.textContent = 'Assignee';
  headerRow.appendChild(assigneeCol);

  const statusCol = el('div', 'w-24 flex-shrink-0 py-2 px-3 font-medium border-r border-[var(--border)]');
  statusCol.textContent = 'Status';
  headerRow.appendChild(statusCol);

  const pctCol = el('div', 'w-16 flex-shrink-0 py-2 px-3 font-medium border-r border-[var(--border)]');
  pctCol.textContent = '% Done';
  headerRow.appendChild(pctCol);

  // Week labels
  const now = new Date();
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(now.getTime() + w * 7 * 24 * 60 * 60 * 1000);
    const label = `Wk ${w + 1} (${weekStart.getMonth() + 1}/${weekStart.getDate()})`;
    const weekCol = el('div', 'flex-1 min-w-[80px] py-2 px-2 text-center border-r border-[var(--border)]');
    weekCol.textContent = label;
    headerRow.appendChild(weekCol);
  }

  card.appendChild(headerRow);

  if (tasks.length === 0) {
    const empty = el('div', 'py-8 text-center text-[var(--text-muted)] text-sm', 'No tasks in the look-ahead window.');
    card.appendChild(empty);
  }

  for (const task of tasks) {
    const row = el('div', 'flex items-center border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const nameCell = el('div', 'w-56 flex-shrink-0 py-2 px-3 text-sm truncate');
    const nameText = el('span', `font-medium ${task.isCriticalPath ? 'text-red-400' : 'text-[var(--text)]'}`, task.name);
    nameCell.appendChild(nameText);
    row.appendChild(nameCell);

    row.appendChild(el('div', 'w-28 flex-shrink-0 py-2 px-3 text-sm text-[var(--text-muted)] truncate', task.assignee));

    const statusCell = el('div', 'w-24 flex-shrink-0 py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[task.status] ?? STATUS_BADGE.not_started}`,
      task.status.replace(/_/g, ' '));
    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    row.appendChild(el('div', 'w-16 flex-shrink-0 py-2 px-3 text-sm font-mono text-[var(--text-muted)]', `${task.percentComplete}%`));

    // Visual bar area for weeks
    for (let w = 0; w < weeks; w++) {
      const weekCell = el('div', 'flex-1 min-w-[80px] py-2 px-1 border-r border-[var(--border)]');
      const bar = el('div', 'h-3 rounded');

      // Simplified: show bar if task overlaps this week
      const weekStart = new Date(now.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);

      if (taskStart <= weekEnd && taskEnd >= weekStart) {
        if (task.isCriticalPath) {
          bar.className += ' bg-red-500/60';
        } else if (task.status === 'completed') {
          bar.className += ' bg-emerald-500/60';
        } else {
          bar.className += ' bg-blue-500/60';
        }
      }

      weekCell.appendChild(bar);
      row.appendChild(weekCell);
    }

    card.appendChild(row);
  }

  return card;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-4');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Look-Ahead Schedule'));

    const controls = el('div', 'flex items-center gap-3');
    controls.appendChild(buildWeekToggle('2', (_weeks) => { /* toggle placeholder */ }));

    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Project') as HTMLAnchorElement;
    backLink.href = '#/project/list';
    controls.appendChild(backLink);
    headerRow.appendChild(controls);
    wrapper.appendChild(headerRow);

    const tasks: LookAheadTask[] = [];
    wrapper.appendChild(buildTimeline(tasks, 2));

    container.appendChild(wrapper);
  },
};
