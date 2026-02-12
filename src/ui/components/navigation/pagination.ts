/**
 * Phase Zed.7 - Pagination
 * Standalone pagination component.
 */

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisible?: number;
}

export class Pagination {
  private container: HTMLElement | null = null;
  private config: PaginationConfig;

  constructor(config: PaginationConfig) {
    this.config = config;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  setPage(page: number): void {
    this.config.currentPage = page;
    this.render();
  }

  setTotalPages(total: number): void {
    this.config.totalPages = total;
    if (this.config.currentPage >= total) {
      this.config.currentPage = Math.max(0, total - 1);
    }
    this.render();
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = '';

    const { currentPage, totalPages } = this.config;
    if (totalPages <= 1) return;

    const maxVisible = this.config.maxVisible ?? 5;

    const nav = document.createElement('nav');
    nav.className = 'flex items-center gap-1';
    nav.setAttribute('aria-label', 'Pagination');

    // Previous button
    const prevBtn = this.createButton('\u2190', currentPage > 0, () => {
      this.config.onPageChange(currentPage - 1);
    });
    prevBtn.setAttribute('aria-label', 'Previous page');
    nav.appendChild(prevBtn);

    // Page numbers
    const pages = this.getVisiblePages(currentPage, totalPages, maxVisible);
    for (const page of pages) {
      if (page === -1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'px-1 text-[var(--text-muted)]';
        ellipsis.textContent = '\u2026';
        nav.appendChild(ellipsis);
      } else {
        const pageBtn = this.createButton(
          String(page + 1),
          true,
          () => this.config.onPageChange(page),
          page === currentPage
        );
        pageBtn.setAttribute('aria-label', `Page ${page + 1}`);
        if (page === currentPage) {
          pageBtn.setAttribute('aria-current', 'page');
        }
        nav.appendChild(pageBtn);
      }
    }

    // Next button
    const nextBtn = this.createButton(
      '\u2192',
      currentPage < totalPages - 1,
      () => this.config.onPageChange(currentPage + 1)
    );
    nextBtn.setAttribute('aria-label', 'Next page');
    nav.appendChild(nextBtn);

    this.container.appendChild(nav);
  }

  private createButton(
    text: string,
    enabled: boolean,
    onClick: () => void,
    active: boolean = false
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `px-2.5 py-1 text-sm rounded-md transition-colors ${
      active
        ? 'bg-[var(--accent)] text-white'
        : enabled
          ? 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
          : 'text-[var(--text-muted)] opacity-30 cursor-not-allowed'
    }`;
    btn.textContent = text;
    btn.disabled = !enabled;
    if (enabled) {
      btn.addEventListener('click', onClick);
    }
    return btn;
  }

  private getVisiblePages(
    current: number,
    total: number,
    max: number
  ): number[] {
    if (total <= max) {
      return Array.from({ length: total }, (_, i) => i);
    }

    const pages: number[] = [];
    const half = Math.floor(max / 2);

    let start = Math.max(0, current - half);
    const end = Math.min(total - 1, start + max - 1);

    if (end - start < max - 1) {
      start = Math.max(0, end - max + 1);
    }

    // Always show first page
    if (start > 0) {
      pages.push(0);
      if (start > 1) pages.push(-1); // ellipsis
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Always show last page
    if (end < total - 1) {
      if (end < total - 2) pages.push(-1); // ellipsis
      pages.push(total - 1);
    }

    return pages;
  }

  /** Static convenience */
  static render(config: PaginationConfig): HTMLElement {
    const el = document.createElement('div');
    const pagination = new Pagination(config);
    pagination.mount(el);
    return el;
  }
}
