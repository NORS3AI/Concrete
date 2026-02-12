/**
 * Phase Zed.7 - FilterBar
 * Horizontal bar of filter controls (dropdowns, search, date range, etc.)
 */

export interface FilterDefinition {
  id: string;
  label: string;
  type: 'select' | 'search' | 'dateRange' | 'toggle';
  options?: Array<{ value: string; label: string }>;
  value?: unknown;
  placeholder?: string;
}

export interface FilterBarConfig {
  filters: FilterDefinition[];
  onChange: (filterValues: Record<string, unknown>) => void;
  onClear?: () => void;
}

export class FilterBar {
  private container: HTMLElement | null = null;
  private config: FilterBarConfig;
  private filterValues: Record<string, unknown> = {};

  constructor(config: FilterBarConfig) {
    this.config = config;
    // Initialize values
    for (const filter of config.filters) {
      this.filterValues[filter.id] = filter.value ?? null;
    }
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  getValues(): Record<string, unknown> {
    return { ...this.filterValues };
  }

  reset(): void {
    for (const filter of this.config.filters) {
      this.filterValues[filter.id] = filter.value ?? null;
    }
    this.render();
    this.config.onChange(this.filterValues);
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.className =
      'flex items-center gap-3 flex-wrap p-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg';

    for (const filter of this.config.filters) {
      const el = this.renderFilter(filter);
      this.container.appendChild(el);
    }

    // Clear button
    const hasActiveFilters = Object.values(this.filterValues).some(
      (v) => v != null && v !== '' && v !== false
    );

    if (hasActiveFilters && this.config.onClear) {
      const clearBtn = document.createElement('button');
      clearBtn.className =
        'text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors ml-auto';
      clearBtn.textContent = 'Clear all';
      clearBtn.addEventListener('click', () => {
        this.reset();
        this.config.onClear?.();
      });
      this.container.appendChild(clearBtn);
    }
  }

  private renderFilter(filter: FilterDefinition): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center gap-1.5';

    const label = document.createElement('label');
    label.className = 'text-xs text-[var(--text-muted)] whitespace-nowrap';
    label.textContent = filter.label;
    wrapper.appendChild(label);

    switch (filter.type) {
      case 'select': {
        const select = document.createElement('select');
        select.className =
          'px-2 py-1 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';

        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = filter.placeholder ?? 'All';
        select.appendChild(defaultOpt);

        for (const opt of filter.options ?? []) {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          if (this.filterValues[filter.id] === opt.value) {
            option.selected = true;
          }
          select.appendChild(option);
        }

        select.addEventListener('change', () => {
          this.filterValues[filter.id] = select.value || null;
          this.config.onChange(this.filterValues);
        });

        wrapper.appendChild(select);
        break;
      }

      case 'search': {
        const input = document.createElement('input');
        input.type = 'text';
        input.className =
          'px-2 py-1 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] w-48';
        input.placeholder = filter.placeholder ?? 'Search...';
        if (typeof this.filterValues[filter.id] === 'string') {
          input.value = this.filterValues[filter.id] as string;
        }

        let debounceTimer: ReturnType<typeof setTimeout>;
        input.addEventListener('input', () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            this.filterValues[filter.id] = input.value || null;
            this.config.onChange(this.filterValues);
          }, 300);
        });

        wrapper.appendChild(input);
        break;
      }

      case 'dateRange': {
        const from = document.createElement('input');
        from.type = 'date';
        from.className =
          'px-2 py-1 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';

        const separator = document.createElement('span');
        separator.className = 'text-[var(--text-muted)] text-xs';
        separator.textContent = 'to';

        const to = document.createElement('input');
        to.type = 'date';
        to.className =
          'px-2 py-1 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';

        const currentVal = this.filterValues[filter.id] as
          | { from: string; to: string }
          | null;
        if (currentVal) {
          from.value = currentVal.from;
          to.value = currentVal.to;
        }

        const updateDateRange = (): void => {
          if (from.value || to.value) {
            this.filterValues[filter.id] = { from: from.value, to: to.value };
          } else {
            this.filterValues[filter.id] = null;
          }
          this.config.onChange(this.filterValues);
        };

        from.addEventListener('change', updateDateRange);
        to.addEventListener('change', updateDateRange);

        wrapper.appendChild(from);
        wrapper.appendChild(separator);
        wrapper.appendChild(to);
        break;
      }

      case 'toggle': {
        const toggle = document.createElement('button');
        const isActive = this.filterValues[filter.id] === true;
        toggle.className = `px-2 py-1 text-xs rounded-md border transition-colors ${
          isActive
            ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30'
            : 'text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]'
        }`;
        toggle.textContent = filter.placeholder ?? filter.label;
        toggle.addEventListener('click', () => {
          this.filterValues[filter.id] = !isActive;
          this.config.onChange(this.filterValues);
          this.render();
        });
        wrapper.appendChild(toggle);
        break;
      }
    }

    return wrapper;
  }

  /** Static convenience for simple rendering */
  static render(config: FilterBarConfig): HTMLElement {
    const el = document.createElement('div');
    const bar = new FilterBar(config);
    bar.mount(el);
    return el;
  }
}
