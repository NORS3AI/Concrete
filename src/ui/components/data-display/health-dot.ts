/**
 * Phase Zed.7 - HealthDot
 * Health status indicator: Green (>70), Yellow (40-70), Red (<40).
 */

export class HealthDot {
  static render(score: number): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = 'inline-flex items-center gap-1.5';
    wrapper.setAttribute('title', `Health: ${Math.round(score)}`);

    const dot = document.createElement('span');
    dot.className = 'w-2.5 h-2.5 rounded-full flex-shrink-0';

    if (score > 70) {
      dot.className += ' bg-emerald-400';
    } else if (score >= 40) {
      dot.className += ' bg-amber-400';
    } else {
      dot.className += ' bg-red-400';
    }

    wrapper.appendChild(dot);

    const label = document.createElement('span');
    label.className = 'text-xs text-[var(--text-muted)]';
    label.textContent = String(Math.round(score));
    wrapper.appendChild(label);

    return wrapper;
  }
}
