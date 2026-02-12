/**
 * Phase Zed.7 - Breadcrumb
 * Breadcrumb navigation component.
 */

export interface BreadcrumbItem {
  label: string;
  path?: string;
  onClick?: () => void;
}

export class Breadcrumb {
  private container: HTMLElement | null = null;
  private items: BreadcrumbItem[] = [];

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  setItems(items: BreadcrumbItem[]): void {
    this.items = items;
    this.render();
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = '';

    const nav = document.createElement('nav');
    nav.className = 'flex items-center gap-1 text-sm';
    nav.setAttribute('aria-label', 'Breadcrumb');

    const ol = document.createElement('ol');
    ol.className = 'flex items-center gap-1';

    this.items.forEach((item, idx) => {
      const isLast = idx === this.items.length - 1;

      const li = document.createElement('li');
      li.className = 'flex items-center gap-1';

      if (isLast) {
        const span = document.createElement('span');
        span.className = 'text-[var(--text)] font-medium';
        span.textContent = item.label;
        span.setAttribute('aria-current', 'page');
        li.appendChild(span);
      } else {
        const link = document.createElement('button');
        link.className =
          'text-[var(--text-muted)] hover:text-[var(--text)] transition-colors';
        link.textContent = item.label;

        if (item.onClick) {
          link.addEventListener('click', item.onClick);
        } else if (item.path) {
          link.addEventListener('click', () => {
            // Navigation would be handled by router
            window.dispatchEvent(
              new CustomEvent('navigate', { detail: { path: item.path } })
            );
          });
        }

        li.appendChild(link);

        // Separator
        const separator = document.createElement('span');
        separator.className = 'text-[var(--text-muted)] mx-0.5';
        separator.textContent = '/';
        separator.setAttribute('aria-hidden', 'true');
        li.appendChild(separator);
      }

      ol.appendChild(li);
    });

    nav.appendChild(ol);
    this.container.appendChild(nav);
  }

  /** Static convenience method */
  static render(items: BreadcrumbItem[]): HTMLElement {
    const el = document.createElement('div');
    const bc = new Breadcrumb();
    bc.mount(el);
    bc.setItems(items);
    return el;
  }
}
