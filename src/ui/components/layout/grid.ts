/**
 * Phase Zed.7 - Grid
 * Responsive grid helper that returns a properly-classed div.
 */

export class Grid {
  /**
   * Create a responsive grid container.
   * @param columns Number of columns (2, 3, or 4)
   * @param gap Gap size in Tailwind spacing units (default 4)
   */
  static create(columns: 2 | 3 | 4, gap?: number): HTMLElement {
    const el = document.createElement('div');
    const gapClass = `gap-${gap ?? 4}`;

    const colClasses: Record<number, string> = {
      2: 'grid grid-cols-1 md:grid-cols-2',
      3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    };

    el.className = `${colClasses[columns]} ${gapClass}`;
    return el;
  }
}
