/**
 * Phase Zed.7 - ProgressBar
 * Progress bar with optional label and threshold coloring.
 */

export interface ProgressBarThresholds {
  warning: number;
  danger: number;
}

export class ProgressBar {
  static render(
    value: number,
    max?: number,
    label?: string,
    thresholds?: ProgressBarThresholds
  ): HTMLElement {
    const maxVal = max ?? 100;
    const pct = Math.min(100, Math.max(0, (value / maxVal) * 100));

    const wrapper = document.createElement('div');
    wrapper.className = 'w-full';

    // Label + value row
    if (label != null) {
      const labelRow = document.createElement('div');
      labelRow.className =
        'flex items-center justify-between mb-1 text-xs';

      const labelEl = document.createElement('span');
      labelEl.className = 'text-[var(--text-muted)]';
      labelEl.textContent = label;
      labelRow.appendChild(labelEl);

      const valueEl = document.createElement('span');
      valueEl.className = 'text-[var(--text)] font-medium';
      valueEl.textContent = `${Math.round(pct)}%`;
      labelRow.appendChild(valueEl);

      wrapper.appendChild(labelRow);
    }

    // Track
    const track = document.createElement('div');
    track.className =
      'w-full h-2 bg-[var(--surface)] rounded-full overflow-hidden';

    // Fill
    const fill = document.createElement('div');
    fill.className = 'h-full rounded-full transition-all duration-300';
    fill.style.width = `${pct}%`;

    // Color based on thresholds
    if (thresholds) {
      if (pct >= thresholds.danger) {
        fill.className += ' bg-red-500';
      } else if (pct >= thresholds.warning) {
        fill.className += ' bg-amber-500';
      } else {
        fill.className += ' bg-emerald-500';
      }
    } else {
      fill.className += ' bg-[var(--accent)]';
    }

    track.appendChild(fill);
    wrapper.appendChild(track);

    return wrapper;
  }
}
