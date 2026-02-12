/**
 * Phase Zed.7 - Tooltip
 * Lightweight tooltip that attaches to a target element.
 */

export interface TooltipConfig {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export class Tooltip {
  /**
   * Wrap a target element with a tooltip.
   * Returns the wrapper element that should be placed in the DOM.
   */
  static render(target: HTMLElement, config: TooltipConfig): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative inline-flex group';
    wrapper.appendChild(target);

    const tip = document.createElement('div');
    const pos = config.position ?? 'top';
    const positionClasses = Tooltip.getPositionClasses(pos);

    tip.className = `absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${positionClasses}`;
    tip.textContent = config.text;

    // Caret / arrow
    const arrow = document.createElement('div');
    arrow.className = `absolute w-2 h-2 bg-gray-900 transform rotate-45 ${Tooltip.getArrowClasses(pos)}`;
    tip.appendChild(arrow);

    wrapper.appendChild(tip);
    return wrapper;
  }

  private static getPositionClasses(pos: string): string {
    switch (pos) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  }

  private static getArrowClasses(pos: string): string {
    switch (pos) {
      case 'top':
        return '-bottom-1 left-1/2 -translate-x-1/2';
      case 'bottom':
        return '-top-1 left-1/2 -translate-x-1/2';
      case 'left':
        return '-right-1 top-1/2 -translate-y-1/2';
      case 'right':
        return '-left-1 top-1/2 -translate-y-1/2';
      default:
        return '-bottom-1 left-1/2 -translate-x-1/2';
    }
  }
}
