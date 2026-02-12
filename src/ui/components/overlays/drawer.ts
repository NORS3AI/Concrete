/**
 * Phase Zed.7 - Drawer
 * A drawer overlay that slides in from a configurable edge.
 */

export interface DrawerConfig {
  title: string;
  position?: 'left' | 'right' | 'bottom';
  size?: string;
  content: HTMLElement | string;
  onClose?: () => void;
}

export class Drawer {
  private overlay: HTMLElement | null = null;
  private drawer: HTMLElement | null = null;

  static open(config: DrawerConfig): Drawer {
    const instance = new Drawer();
    instance.show(config);
    return instance;
  }

  private show(config: DrawerConfig): void {
    const position = config.position ?? 'right';

    // Backdrop
    this.overlay = document.createElement('div');
    this.overlay.className = 'fixed inset-0 z-50 bg-black/40';
    this.overlay.addEventListener('click', () => {
      this.close();
      config.onClose?.();
    });

    // Drawer panel
    this.drawer = document.createElement('div');
    this.drawer.className =
      'fixed z-50 flex flex-col bg-[var(--surface-raised)] border-[var(--border)] shadow-xl overflow-hidden';

    switch (position) {
      case 'left':
        this.drawer.className += ' top-0 left-0 bottom-0 border-r';
        this.drawer.style.width = config.size ?? '320px';
        break;
      case 'right':
        this.drawer.className += ' top-0 right-0 bottom-0 border-l';
        this.drawer.style.width = config.size ?? '320px';
        break;
      case 'bottom':
        this.drawer.className += ' bottom-0 left-0 right-0 border-t';
        this.drawer.style.height = config.size ?? '50vh';
        break;
    }

    // Header
    const header = document.createElement('div');
    header.className =
      'flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0';

    const title = document.createElement('h2');
    title.className = 'text-sm font-semibold text-[var(--text)]';
    title.textContent = config.title;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className =
      'p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors';
    closeBtn.setAttribute('aria-label', 'Close drawer');
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => {
      this.close();
      config.onClose?.();
    });
    header.appendChild(closeBtn);

    this.drawer.appendChild(header);

    // Content
    const body = document.createElement('div');
    body.className = 'flex-1 overflow-y-auto p-4';
    if (typeof config.content === 'string') {
      body.innerHTML = config.content;
    } else {
      body.appendChild(config.content);
    }
    this.drawer.appendChild(body);

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.drawer);

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
    if (this.drawer) {
      this.drawer.remove();
      this.drawer = null;
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
