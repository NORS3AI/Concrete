/**
 * Phase Zed.7 - Timeline
 * Vertical timeline for activity feeds and history.
 */

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  icon?: string;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const DOT_COLORS: Record<string, string> = {
  default: 'bg-[var(--text-muted)]',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-cyan-400',
};

export class Timeline {
  static render(items: TimelineItem[]): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative space-y-0';

    items.forEach((item, idx) => {
      const isLast = idx === items.length - 1;
      const row = document.createElement('div');
      row.className = 'flex gap-3';

      // Left column: dot + line
      const leftCol = document.createElement('div');
      leftCol.className = 'flex flex-col items-center';

      const dot = document.createElement('div');
      const dotColor = DOT_COLORS[item.color ?? 'default'];
      dot.className = `w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`;

      if (item.icon) {
        dot.innerHTML = item.icon;
        dot.className = `w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${dotColor} text-white`;
      }

      leftCol.appendChild(dot);

      if (!isLast) {
        const line = document.createElement('div');
        line.className = 'w-px flex-1 bg-[var(--border)] my-1';
        leftCol.appendChild(line);
      }

      row.appendChild(leftCol);

      // Right column: content
      const rightCol = document.createElement('div');
      rightCol.className = `pb-4 ${isLast ? '' : 'pb-4'}`;

      const titleRow = document.createElement('div');
      titleRow.className = 'flex items-center gap-2 mb-0.5';

      const title = document.createElement('span');
      title.className = 'text-sm font-medium text-[var(--text)]';
      title.textContent = item.title;
      titleRow.appendChild(title);

      const time = document.createElement('span');
      time.className = 'text-2xs text-[var(--text-muted)]';
      time.textContent = item.timestamp;
      titleRow.appendChild(time);

      rightCol.appendChild(titleRow);

      if (item.description) {
        const desc = document.createElement('p');
        desc.className = 'text-xs text-[var(--text-muted)] leading-relaxed';
        desc.textContent = item.description;
        rightCol.appendChild(desc);
      }

      row.appendChild(rightCol);
      wrapper.appendChild(row);
    });

    return wrapper;
  }
}
