/**
 * Phase Zed.7 - Stack
 * Vertical flex layout helper.
 */

export class Stack {
  /**
   * Create a vertical flex container.
   * @param gap Gap size in Tailwind spacing units (default 4)
   */
  static create(gap?: number): HTMLElement {
    const el = document.createElement('div');
    el.className = `flex flex-col gap-${gap ?? 4}`;
    return el;
  }
}
