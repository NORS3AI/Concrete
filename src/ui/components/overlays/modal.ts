/**
 * Phase Zed.7 - Modal
 * Modal overlay component with configurable size, content, and action buttons.
 */

export interface ModalConfig {
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  content: HTMLElement | string;
  onClose?: () => void;
  actions?: Array<{ label: string; variant?: string; onClick: () => void }>;
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[90vw] max-h-[90vh]',
};

export class Modal {
  private overlay: HTMLElement | null = null;

  static open(config: ModalConfig): Modal {
    const modal = new Modal();
    modal.show(config);
    return modal;
  }

  private show(config: ModalConfig): void {
    // Backdrop overlay
    this.overlay = document.createElement('div');
    this.overlay.className =
      'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in';

    // Close on backdrop click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
        config.onClose?.();
      }
    });

    // Dialog
    const dialog = document.createElement('div');
    const sizeClass = SIZE_CLASSES[config.size ?? 'md'];
    dialog.className = `w-full ${sizeClass} bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl shadow-xl flex flex-col overflow-hidden mx-4`;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'modal-title');

    // Header
    const header = document.createElement('div');
    header.className =
      'flex items-center justify-between px-5 py-4 border-b border-[var(--border)]';

    const title = document.createElement('h2');
    title.id = 'modal-title';
    title.className = 'text-base font-semibold text-[var(--text)]';
    title.textContent = config.title;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className =
      'p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
    closeBtn.addEventListener('click', () => {
      this.close();
      config.onClose?.();
    });
    header.appendChild(closeBtn);

    dialog.appendChild(header);

    // Content
    const body = document.createElement('div');
    body.className = 'flex-1 overflow-y-auto px-5 py-4';
    if (typeof config.content === 'string') {
      body.innerHTML = config.content;
    } else {
      body.appendChild(config.content);
    }
    dialog.appendChild(body);

    // Footer actions
    if (config.actions && config.actions.length > 0) {
      const footer = document.createElement('div');
      footer.className =
        'flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)]';

      for (const action of config.actions) {
        const btn = document.createElement('button');
        const variant = action.variant ?? 'default';

        if (variant === 'primary') {
          btn.className =
            'px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors';
        } else if (variant === 'danger') {
          btn.className =
            'px-4 py-2 text-sm font-medium rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors';
        } else {
          btn.className =
            'px-4 py-2 text-sm font-medium rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors';
        }

        btn.textContent = action.label;
        btn.addEventListener('click', () => action.onClick());
        footer.appendChild(btn);
      }

      dialog.appendChild(footer);
    }

    this.overlay.appendChild(dialog);
    document.body.appendChild(this.overlay);

    // Trap focus and handle Escape
    const handleKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        this.close();
        config.onClose?.();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);

    // Focus the close button
    closeBtn.focus();
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
