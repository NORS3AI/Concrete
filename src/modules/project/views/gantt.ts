/**
 * Gantt Chart view.
 * Visual task bar display with milestones, critical path highlighting,
 * and baseline vs. actual comparison.
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
// Types
// ---------------------------------------------------------------------------

interface GanttTask {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  percentComplete: number;
  isCriticalPath: boolean;
  isMilestone: boolean;
  status: string;
}

// ---------------------------------------------------------------------------
// Gantt Header (date columns)
// ---------------------------------------------------------------------------

function buildDateHeader(startDate: string, totalDays: number): HTMLElement {
  const header = el('div', 'flex border-b border-[var(--border)] text-xs text-[var(--text-muted)]');

  const labelCol = el('div', 'w-48 flex-shrink-0 py-1 px-2 border-r border-[var(--border)] font-medium');
  labelCol.textContent = 'Task';
  header.appendChild(labelCol);

  const start = new Date(startDate);
  for (let i = 0; i < totalDays; i += 7) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const col = el('div', 'flex-1 min-w-[40px] py-1 px-1 text-center border-r border-[var(--border)]');
    col.textContent = label;
    header.appendChild(col);
  }

  return header;
}

// ---------------------------------------------------------------------------
// Task Bars
// ---------------------------------------------------------------------------

function buildTaskRow(task: GanttTask, projectStart: string, totalDays: number): HTMLElement {
  const row = el('div', 'flex items-center border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors h-8');

  const labelCol = el('div', 'w-48 flex-shrink-0 py-1 px-2 border-r border-[var(--border)] truncate text-sm');
  const link = el('a', 'text-[var(--accent)] hover:underline', task.name) as HTMLAnchorElement;
  link.href = `#/project/${task.id}`;
  labelCol.appendChild(link);
  row.appendChild(labelCol);

  const barArea = el('div', 'flex-1 relative h-full');

  if (task.startDate && task.endDate) {
    const startMs = new Date(projectStart).getTime();
    const taskStartMs = new Date(task.startDate).getTime();
    const taskEndMs = new Date(task.endDate).getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const startOffset = Math.max(0, (taskStartMs - startMs) / dayMs);
    const duration = Math.max(1, (taskEndMs - taskStartMs) / dayMs);

    const leftPct = totalDays > 0 ? (startOffset / totalDays) * 100 : 0;
    const widthPct = totalDays > 0 ? (duration / totalDays) * 100 : 0;

    if (task.isMilestone) {
      const diamond = el('div', 'absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-amber-500');
      diamond.style.left = `${leftPct}%`;
      barArea.appendChild(diamond);
    } else {
      const bar = el('div', 'absolute top-1 h-4 rounded');
      bar.style.left = `${leftPct}%`;
      bar.style.width = `${Math.min(widthPct, 100 - leftPct)}%`;

      if (task.isCriticalPath) {
        bar.className += ' bg-red-500/80';
      } else if (task.status === 'completed') {
        bar.className += ' bg-emerald-500/80';
      } else {
        bar.className += ' bg-blue-500/80';
      }

      // Progress fill inside bar
      if (task.percentComplete > 0 && task.percentComplete < 100) {
        const progress = el('div', 'h-full rounded bg-white/20');
        progress.style.width = `${task.percentComplete}%`;
        bar.appendChild(progress);
      }

      barArea.appendChild(bar);
    }
  }

  row.appendChild(barArea);
  return row;
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function buildLegend(): HTMLElement {
  const legend = el('div', 'flex items-center gap-4 text-xs text-[var(--text-muted)] mb-3');

  const items = [
    { color: 'bg-blue-500', label: 'Normal Task' },
    { color: 'bg-red-500', label: 'Critical Path' },
    { color: 'bg-emerald-500', label: 'Completed' },
    { color: 'bg-amber-500', label: 'Milestone' },
  ];

  for (const item of items) {
    const wrap = el('div', 'flex items-center gap-1');
    wrap.appendChild(el('div', `w-3 h-3 rounded ${item.color}`));
    wrap.appendChild(el('span', '', item.label));
    legend.appendChild(wrap);
  }

  return legend;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Gantt Chart'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Project') as HTMLAnchorElement;
    backLink.href = '#/project/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildLegend());

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden overflow-x-auto');

    const defaultStart = new Date().toISOString().split('T')[0];
    const totalDays = 90;

    card.appendChild(buildDateHeader(defaultStart, totalDays));

    // Sample empty state
    const tasks: GanttTask[] = [];
    if (tasks.length === 0) {
      const empty = el('div', 'py-8 text-center text-[var(--text-muted)] text-sm', 'No tasks scheduled. Add tasks to see the Gantt chart.');
      card.appendChild(empty);
    }

    for (const task of tasks) {
      card.appendChild(buildTaskRow(task, defaultStart, totalDays));
    }

    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};
