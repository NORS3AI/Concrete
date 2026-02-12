/**
 * Phase Zed.7 - TabNav
 * Horizontal tab navigation component for switching between views within a page.
 */

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabNavConfig {
  tabs: TabItem[];
  activeTab?: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pills';
}

export class TabNav {
  private container: HTMLElement | null = null;
  private config: TabNavConfig;
  private activeTab: string;

  constructor(config: TabNavConfig) {
    this.config = config;
    this.activeTab =
      config.activeTab ?? config.tabs[0]?.id ?? '';
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    this.render();
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = '';

    const variant = this.config.variant ?? 'underline';

    const nav = document.createElement('div');
    nav.className = `flex items-center ${
      variant === 'underline'
        ? 'border-b border-[var(--border)] gap-0'
        : 'gap-1 bg-[var(--surface)] p-1 rounded-lg'
    }`;
    nav.setAttribute('role', 'tablist');

    for (const tab of this.config.tabs) {
      const btn = document.createElement('button');
      const isActive = tab.id === this.activeTab;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(isActive));
      btn.setAttribute('aria-controls', `panel-${tab.id}`);
      btn.id = `tab-${tab.id}`;

      if (variant === 'underline') {
        btn.className = `flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
          isActive
            ? 'border-[var(--accent)] text-[var(--accent)]'
            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border)]'
        }`;
      } else {
        btn.className = `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-[var(--surface-raised)] text-[var(--text)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text)]'
        }`;
      }

      if (tab.disabled) {
        btn.disabled = true;
        btn.className += ' opacity-50 cursor-not-allowed';
      }

      if (tab.icon) {
        const iconEl = document.createElement('span');
        iconEl.className = 'w-4 h-4 flex-shrink-0';
        iconEl.innerHTML = tab.icon;
        btn.appendChild(iconEl);
      }

      const label = document.createElement('span');
      label.textContent = tab.label;
      btn.appendChild(label);

      if (tab.badge != null) {
        const badge = document.createElement('span');
        badge.className =
          'ml-1 px-1.5 py-0.5 text-2xs rounded-full bg-[var(--accent)]/10 text-[var(--accent)] leading-none';
        badge.textContent = String(tab.badge);
        btn.appendChild(badge);
      }

      if (!tab.disabled) {
        btn.addEventListener('click', () => {
          this.activeTab = tab.id;
          this.config.onChange(tab.id);
          this.render();
        });
      }

      nav.appendChild(btn);
    }

    this.container.appendChild(nav);
  }

  /** Static convenience */
  static render(config: TabNavConfig): HTMLElement {
    const el = document.createElement('div');
    const tabNav = new TabNav(config);
    tabNav.mount(el);
    return el;
  }
}
