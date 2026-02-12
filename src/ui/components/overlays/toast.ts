/**
 * Phase Zed.7 - Toast
 * Toast notification system supporting multiple concurrent toasts with auto-dismiss.
 */

export interface ToastConfig {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  dismissible?: boolean;
  action?: { label: string; onClick: () => void };
}

const TYPE_STYLES: Record<string, { bg: string; icon: string; border: string }> = {
  info: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    icon: `<svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  },
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: `<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: `<svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>`,
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: `<svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  },
};

let toastContainer: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className =
      'fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export class Toast {
  private element: HTMLElement | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  /** Show a toast notification */
  static show(config: ToastConfig): Toast {
    const instance = new Toast();
    instance.display(config);
    return instance;
  }

  /** Convenience methods */
  static info(message: string, duration?: number): Toast {
    return Toast.show({ message, type: 'info', duration });
  }

  static success(message: string, duration?: number): Toast {
    return Toast.show({ message, type: 'success', duration });
  }

  static warning(message: string, duration?: number): Toast {
    return Toast.show({ message, type: 'warning', duration });
  }

  static error(message: string, duration?: number): Toast {
    return Toast.show({ message, type: 'error', duration });
  }

  private display(config: ToastConfig): void {
    const container = ensureContainer();
    const type = config.type ?? 'info';
    const styles = TYPE_STYLES[type];
    const duration = config.duration ?? 4000;
    const dismissible = config.dismissible ?? true;

    this.element = document.createElement('div');
    this.element.className = `flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg pointer-events-auto ${styles.bg} ${styles.border} text-sm text-[var(--text)] max-w-sm backdrop-blur-sm`;
    this.element.style.animation = 'slideInRight 0.2s ease-out';

    // Icon
    const iconEl = document.createElement('span');
    iconEl.className = 'flex-shrink-0';
    iconEl.innerHTML = styles.icon;
    this.element.appendChild(iconEl);

    // Message
    const msg = document.createElement('span');
    msg.className = 'flex-1 text-sm';
    msg.textContent = config.message;
    this.element.appendChild(msg);

    // Action button
    if (config.action) {
      const actionBtn = document.createElement('button');
      actionBtn.className =
        'text-xs font-medium text-[var(--accent)] hover:underline flex-shrink-0';
      actionBtn.textContent = config.action.label;
      actionBtn.addEventListener('click', () => {
        config.action!.onClick();
        this.dismiss();
      });
      this.element.appendChild(actionBtn);
    }

    // Dismiss button
    if (dismissible) {
      const dismissBtn = document.createElement('button');
      dismissBtn.className =
        'text-[var(--text-muted)] hover:text-[var(--text)] flex-shrink-0 p-0.5';
      dismissBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
      dismissBtn.addEventListener('click', () => this.dismiss());
      this.element.appendChild(dismissBtn);
    }

    container.appendChild(this.element);

    // Auto-dismiss
    if (duration > 0) {
      this.timeoutId = setTimeout(() => this.dismiss(), duration);
    }
  }

  dismiss(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.element) {
      this.element.style.animation = 'slideOutRight 0.15s ease-in forwards';
      setTimeout(() => {
        this.element?.remove();
        this.element = null;
      }, 150);
    }
  }
}
