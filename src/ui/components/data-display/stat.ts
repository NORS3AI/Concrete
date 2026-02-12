/**
 * Phase Zed.7 - Stat
 * A compact stat display with label, value, and optional sub-text.
 */

export interface StatConfig {
  label: string;
  value: string;
  subtext?: string;
  icon?: string;
}

export class Stat {
  static render(config: StatConfig): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-start gap-3';

    // Icon
    if (config.icon) {
      const iconEl = document.createElement('div');
      iconEl.className =
        'w-8 h-8 flex items-center justify-center rounded-md bg-[var(--accent)]/10 text-[var(--accent)] flex-shrink-0';
      iconEl.innerHTML = config.icon;
      wrapper.appendChild(iconEl);
    }

    const textBlock = document.createElement('div');
    textBlock.className = 'flex flex-col';

    const label = document.createElement('span');
    label.className = 'text-xs text-[var(--text-muted)] uppercase tracking-wider';
    label.textContent = config.label;
    textBlock.appendChild(label);

    const value = document.createElement('span');
    value.className = 'text-lg font-semibold text-[var(--text)] leading-tight';
    value.textContent = config.value;
    textBlock.appendChild(value);

    if (config.subtext) {
      const sub = document.createElement('span');
      sub.className = 'text-xs text-[var(--text-muted)] mt-0.5';
      sub.textContent = config.subtext;
      textBlock.appendChild(sub);
    }

    wrapper.appendChild(textBlock);
    return wrapper;
  }
}
