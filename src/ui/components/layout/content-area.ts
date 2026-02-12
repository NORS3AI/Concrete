/**
 * Phase Zed.7 - ContentArea
 * Content area wrapper with loading state management.
 */

export class ContentArea {
  private container: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.container = container;
  }

  /** Replace current content with a new element */
  render(element: HTMLElement): void {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.appendChild(element);
  }

  /** Show a centered spinner/loading indicator */
  showLoading(): void {
    if (!this.container) return;
    this.container.innerHTML = '';

    const loader = document.createElement('div');
    loader.className =
      'flex flex-col items-center justify-center h-64 gap-3 text-[var(--text-muted)]';

    const spinner = document.createElement('div');
    spinner.className =
      'w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin';
    loader.appendChild(spinner);

    const text = document.createElement('span');
    text.className = 'text-sm';
    text.textContent = 'Loading...';
    loader.appendChild(text);

    this.container.appendChild(loader);
  }

  /** Clear all content */
  clear(): void {
    if (!this.container) return;
    this.container.innerHTML = '';
  }

  getContainer(): HTMLElement | null {
    return this.container;
  }
}
