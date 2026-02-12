/**
 * Phase Zed.7 - EmptyState
 * Empty state placeholder with optional icon, message, and action button.
 */

export interface EmptyStateConfig {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export class EmptyState {
  static render(config: EmptyStateConfig): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className =
      'flex flex-col items-center justify-center py-16 px-4 text-center';

    // Icon
    if (config.icon) {
      const iconEl = document.createElement('div');
      iconEl.className =
        'w-12 h-12 mb-4 text-[var(--text-muted)] opacity-50';
      iconEl.innerHTML = config.icon;
      wrapper.appendChild(iconEl);
    }

    // Title
    const title = document.createElement('h3');
    title.className = 'text-lg font-semibold text-[var(--text)] mb-1';
    title.textContent = config.title;
    wrapper.appendChild(title);

    // Message
    if (config.message) {
      const msg = document.createElement('p');
      msg.className = 'text-sm text-[var(--text-muted)] max-w-md mb-4';
      msg.textContent = config.message;
      wrapper.appendChild(msg);
    }

    // Action button
    if (config.actionLabel && config.onAction) {
      const btn = document.createElement('button');
      btn.className =
        'px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors';
      btn.textContent = config.actionLabel;
      btn.addEventListener('click', config.onAction);
      wrapper.appendChild(btn);
    }

    return wrapper;
  }
}
