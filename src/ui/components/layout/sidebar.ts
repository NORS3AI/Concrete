/**
 * Phase Zed.7 - Sidebar
 * Collapsible sidebar for sub-navigation within a module.
 */

export interface SidebarItem {
  label: string;
  path: string;
  icon?: string;
  active?: boolean;
}

export class Sidebar {
  private container: HTMLElement | null = null;
  private nav: HTMLElement | null = null;
  private items: SidebarItem[] = [];
  private _isCollapsed: boolean = false;
  private onItemClick: ((path: string) => void) | null = null;

  get isCollapsed(): boolean {
    return this._isCollapsed;
  }

  mount(
    container: HTMLElement,
    onItemClick?: (path: string) => void
  ): void {
    this.container = container;
    this.onItemClick = onItemClick ?? null;
    this.render();
  }

  setItems(items: SidebarItem[]): void {
    this.items = items;
    this.render();
  }

  toggle(): void {
    this._isCollapsed = !this._isCollapsed;
    this.render();
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.className = `flex flex-col bg-[var(--surface-raised)] border-r border-[var(--border)] transition-all duration-200 ${
      this._isCollapsed ? 'w-14' : 'w-56'
    }`;

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className =
      'flex items-center justify-center p-2 m-2 rounded-md btn-ghost text-[var(--text-muted)]';
    toggleBtn.setAttribute('aria-label', this._isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    toggleBtn.innerHTML = this._isCollapsed
      ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>`
      : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>`;
    toggleBtn.addEventListener('click', () => this.toggle());
    this.container.appendChild(toggleBtn);

    // Navigation items
    this.nav = document.createElement('nav');
    this.nav.className = 'flex-1 flex flex-col gap-0.5 px-2';
    this.nav.setAttribute('role', 'navigation');

    for (const item of this.items) {
      const btn = document.createElement('button');
      const isActive = item.active ?? false;
      btn.className = `flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors ${
        isActive
          ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
          : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
      }`;
      btn.dataset.path = item.path;
      btn.setAttribute('title', item.label);

      if (item.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'w-5 h-5 flex-shrink-0 flex items-center justify-center';
        iconSpan.innerHTML = item.icon;
        btn.appendChild(iconSpan);
      }

      if (!this._isCollapsed) {
        const label = document.createElement('span');
        label.className = 'truncate';
        label.textContent = item.label;
        btn.appendChild(label);
      }

      btn.addEventListener('click', () => {
        this.onItemClick?.(item.path);
      });

      this.nav.appendChild(btn);
    }

    this.container.appendChild(this.nav);
  }
}
