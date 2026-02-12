/**
 * Phase Zed.7 - TopNav
 * Manages dynamic tab rendering from modules and global filter dropdowns.
 */

export interface NavItemConfig {
  id: string;
  label: string;
  icon?: string;
  path: string;
  order: number;
  parent?: string;
  badge?: string | (() => string | number | null);
}

export class TopNav {
  private tabContainer: HTMLElement | null = null;
  private filtersContainer: HTMLElement | null = null;
  private activePath: string = '';
  private onTabClick: ((path: string) => void) | null = null;
  private onEntityChange: ((entityId: string) => void) | null = null;
  private onPeriodChange: ((period: string) => void) | null = null;

  mount(
    tabContainer: HTMLElement,
    filtersContainer: HTMLElement,
    callbacks?: {
      onTabClick?: (path: string) => void;
      onEntityChange?: (entityId: string) => void;
      onPeriodChange?: (period: string) => void;
    }
  ): void {
    this.tabContainer = tabContainer;
    this.filtersContainer = filtersContainer;
    this.onTabClick = callbacks?.onTabClick ?? null;
    this.onEntityChange = callbacks?.onEntityChange ?? null;
    this.onPeriodChange = callbacks?.onPeriodChange ?? null;
  }

  /** Rebuild tab bar from enabled modules' nav items */
  updateTabs(items: NavItemConfig[]): void {
    if (!this.tabContainer) return;
    this.tabContainer.innerHTML = '';

    const sorted = [...items].sort((a, b) => a.order - b.order);

    for (const item of sorted) {
      const btn = document.createElement('button');
      btn.className = this.getTabClass(item.path === this.activePath);
      btn.dataset.path = item.path;
      btn.setAttribute('role', 'tab');
      btn.setAttribute(
        'aria-selected',
        String(item.path === this.activePath)
      );

      if (item.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'w-4 h-4 flex-shrink-0';
        iconSpan.innerHTML = item.icon;
        btn.appendChild(iconSpan);
      }

      const label = document.createElement('span');
      label.textContent = item.label;
      btn.appendChild(label);

      // Badge
      const badgeValue =
        typeof item.badge === 'function' ? item.badge() : item.badge;
      if (badgeValue != null && badgeValue !== '') {
        const badge = document.createElement('span');
        badge.className =
          'ml-1.5 px-1.5 py-0.5 text-2xs bg-[var(--accent)] text-white rounded-full leading-none';
        badge.textContent = String(badgeValue);
        btn.appendChild(badge);
      }

      btn.addEventListener('click', () => {
        this.setActiveTab(item.path);
        this.onTabClick?.(item.path);
      });

      this.tabContainer.appendChild(btn);
    }
  }

  /** Highlight active tab */
  setActiveTab(path: string): void {
    this.activePath = path;
    if (!this.tabContainer) return;

    const buttons = this.tabContainer.querySelectorAll('button');
    buttons.forEach((btn) => {
      const btnPath = btn.dataset.path;
      const isActive = btnPath === path;
      btn.className = this.getTabClass(isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
  }

  /** Render global filter dropdowns for entity and period selection */
  updateGlobalFilters(
    entities: Array<{ id: string; name: string }>,
    periods: string[]
  ): void {
    if (!this.filtersContainer) return;
    this.filtersContainer.innerHTML = '';

    // Entity filter
    const entitySelect = document.createElement('select');
    entitySelect.id = 'global-entity-filter';
    entitySelect.className =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-sm text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';

    const allOpt = document.createElement('option');
    allOpt.value = '__all__';
    allOpt.textContent = 'All Entities';
    entitySelect.appendChild(allOpt);

    for (const entity of entities) {
      const opt = document.createElement('option');
      opt.value = entity.id;
      opt.textContent = entity.name;
      entitySelect.appendChild(opt);
    }

    entitySelect.addEventListener('change', () => {
      this.onEntityChange?.(entitySelect.value);
    });

    this.filtersContainer.appendChild(entitySelect);

    // Period filter
    const periodSelect = document.createElement('select');
    periodSelect.id = 'global-period-filter';
    periodSelect.className =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-sm text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';

    for (const period of periods) {
      const opt = document.createElement('option');
      opt.value = period;
      opt.textContent = period;
      periodSelect.appendChild(opt);
    }

    periodSelect.addEventListener('change', () => {
      this.onPeriodChange?.(periodSelect.value);
    });

    this.filtersContainer.appendChild(periodSelect);
  }

  private getTabClass(active: boolean): string {
    const base =
      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap';
    if (active) {
      return `${base} bg-[var(--accent)]/10 text-[var(--accent)] font-medium`;
    }
    return `${base} text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50`;
  }
}
