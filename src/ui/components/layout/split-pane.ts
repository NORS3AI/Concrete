/**
 * Phase Zed.7 - SplitPane
 * Resizable two-panel layout with a draggable divider.
 */

export interface SplitPaneOptions {
  /** Default split ratio for left pane (0-100). Defaults to 50. */
  defaultSplit?: number;
  /** Minimum width for either pane in pixels. Defaults to 200. */
  minPaneWidth?: number;
  /** Orientation. Defaults to 'horizontal'. */
  orientation?: 'horizontal' | 'vertical';
}

export class SplitPane {
  private wrapper: HTMLElement | null = null;
  private leftPane: HTMLElement | null = null;
  private rightPane: HTMLElement | null = null;
  private divider: HTMLElement | null = null;
  private splitRatio: number;
  private isDragging: boolean = false;
  private minPaneWidth: number;
  private orientation: 'horizontal' | 'vertical';

  constructor() {
    this.splitRatio = 50;
    this.minPaneWidth = 200;
    this.orientation = 'horizontal';
  }

  mount(
    container: HTMLElement,
    leftContent: HTMLElement,
    rightContent: HTMLElement,
    options?: SplitPaneOptions
  ): void {
    this.splitRatio = options?.defaultSplit ?? 50;
    this.minPaneWidth = options?.minPaneWidth ?? 200;
    this.orientation = options?.orientation ?? 'horizontal';

    container.innerHTML = '';

    const isHorizontal = this.orientation === 'horizontal';

    // Wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = `flex ${isHorizontal ? 'flex-row' : 'flex-col'} h-full w-full overflow-hidden`;

    // Left / Top pane
    this.leftPane = document.createElement('div');
    this.leftPane.className = 'overflow-auto';
    this.leftPane.style[isHorizontal ? 'width' : 'height'] = `${this.splitRatio}%`;
    this.leftPane.style.flexShrink = '0';
    this.leftPane.appendChild(leftContent);
    this.wrapper.appendChild(this.leftPane);

    // Divider
    this.divider = document.createElement('div');
    this.divider.className = `flex-shrink-0 bg-[var(--border)] hover:bg-[var(--accent)] transition-colors ${
      isHorizontal
        ? 'w-1 cursor-col-resize'
        : 'h-1 cursor-row-resize'
    }`;
    this.divider.setAttribute('role', 'separator');
    this.divider.setAttribute('aria-orientation', isHorizontal ? 'vertical' : 'horizontal');
    this.wrapper.appendChild(this.divider);

    // Right / Bottom pane
    this.rightPane = document.createElement('div');
    this.rightPane.className = 'overflow-auto flex-1';
    this.rightPane.appendChild(rightContent);
    this.wrapper.appendChild(this.rightPane);

    container.appendChild(this.wrapper);

    this.attachDragListeners();
  }

  private attachDragListeners(): void {
    if (!this.divider || !this.wrapper) return;

    const onMouseDown = (e: MouseEvent): void => {
      e.preventDefault();
      this.isDragging = true;
      document.body.style.cursor =
        this.orientation === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent): void => {
      if (!this.isDragging || !this.wrapper || !this.leftPane) return;

      const rect = this.wrapper.getBoundingClientRect();
      const isHorizontal = this.orientation === 'horizontal';
      const total = isHorizontal ? rect.width : rect.height;
      const offset = isHorizontal
        ? e.clientX - rect.left
        : e.clientY - rect.top;

      const minRatio = (this.minPaneWidth / total) * 100;
      const maxRatio = 100 - minRatio;
      const newRatio = Math.min(maxRatio, Math.max(minRatio, (offset / total) * 100));

      this.splitRatio = newRatio;
      this.leftPane.style[isHorizontal ? 'width' : 'height'] = `${newRatio}%`;
    };

    const onMouseUp = (): void => {
      this.isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    this.divider.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  getSplitRatio(): number {
    return this.splitRatio;
  }
}
