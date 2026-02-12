/**
 * Phase Zed.7 - SlidePanel
 * Slide-in panel from the right side of the screen.
 */

export interface SlidePanelConfig {
  title: string;
  width?: string;
  content: HTMLElement | string;
  onClose?: () => void;
  actions?: Array<{ label: string; variant?: string; onClick: () => void }>;
}

export class SlidePanel {
  private overlay: HTMLElement | null = null;
  private panel: HTMLElement | null = null;

  static open(config: SlidePanelConfig): SlidePanel {
    const instance = new SlidePanel();
    instance.show(config);
    return instance;
  }

  private show(config: SlidePanelConfig): void {
    // Backdrop
    this.overlay = document.createElement('div');
    this.overlay.className = 'fixed inset-0 z-50 bg-black/40';
    this.overlay.addEventListener('click', () => {
      this.close();
      config.onClose?.();
    });

    // Panel
    this.panel = document.createElement('div');
    this.panel.className =
      'fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-[var(--surface-raised)] border-l border-[var(--border)] shadow-xl transform transition-transform duration-300 translate-x-0';
    this.panel.style.width = config.width ?? '400px';

    // Header
    const header = document.createElement('div');
    header.className =
      'flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0';

    const title = document.createElement('h2');
    title.className = 'text-base font-semibold text-[var(--text)]';
    title.textContent = config.title;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className =
      'p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors';
    closeBtn.setAttribute('aria-label', 'Close panel');
    closeBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
    closeBtn.addEventListener('click', () => {
      this.close();
      config.onClose?.();
    });
    header.appendChild(closeBtn);

    this.panel.appendChild(header);

    // Content
    const body = document.createElement('div');
    body.className = 'flex-1 overflow-y-auto px-5 py-4';
    if (typeof config.content === 'string') {
      body.innerHTML = config.content;
    } else {
      body.appendChild(config.content);
    }
    this.panel.appendChild(body);

    // Footer actions
    if (config.actions && config.actions.length > 0) {
      const footer = document.createElement('div');
      footer.className =
        'flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] flex-shrink-0';

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

      this.panel.appendChild(footer);
    }

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.panel);

    // Escape to close
    const handleKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        this.close();
        config.onClose?.();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }

  close(): void {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
