/**
 * Phase Zed.7 - BreakdownBar
 * Horizontal stacked bar showing proportional breakdown of categories.
 */

import { COLORS } from '../../theme/tokens';

export interface BreakdownSegment {
  label: string;
  value: number;
  color?: string;
}

export class BreakdownBar {
  static render(segments: BreakdownSegment[], height?: number): HTMLElement {
    const total = segments.reduce((sum, s) => sum + s.value, 0);

    const wrapper = document.createElement('div');
    wrapper.className = 'w-full';

    // Bar
    const bar = document.createElement('div');
    bar.className = 'flex w-full rounded-full overflow-hidden';
    bar.style.height = `${height ?? 8}px`;

    segments.forEach((segment, idx) => {
      if (segment.value <= 0 || total <= 0) return;
      const pct = (segment.value / total) * 100;
      const color = segment.color ?? COLORS.chart[idx % COLORS.chart.length];

      const seg = document.createElement('div');
      seg.style.width = `${pct}%`;
      seg.style.backgroundColor = color;
      seg.className = 'transition-all duration-300';
      seg.setAttribute('title', `${segment.label}: ${Math.round(pct)}%`);
      bar.appendChild(seg);
    });

    wrapper.appendChild(bar);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'flex flex-wrap gap-3 mt-2';

    segments.forEach((segment, idx) => {
      if (segment.value <= 0 || total <= 0) return;
      const color = segment.color ?? COLORS.chart[idx % COLORS.chart.length];

      const item = document.createElement('div');
      item.className = 'flex items-center gap-1.5 text-xs';

      const dot = document.createElement('span');
      dot.className = 'w-2 h-2 rounded-full flex-shrink-0';
      dot.style.backgroundColor = color;
      item.appendChild(dot);

      const label = document.createElement('span');
      label.className = 'text-[var(--text-muted)]';
      label.textContent = `${segment.label} (${Math.round((segment.value / total) * 100)}%)`;
      item.appendChild(label);

      legend.appendChild(item);
    });

    wrapper.appendChild(legend);

    return wrapper;
  }
}
