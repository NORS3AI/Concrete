/**
 * Concrete — Focus Manager
 * Phase Zed.14: Keyboard Shortcuts & Accessibility
 *
 * Manages focus trapping for modals/dialogs, focus restoration,
 * and screen reader announcements via aria-live regions.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** CSS selector for all natively focusable elements */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

const ANNOUNCE_REGION_ID = 'concrete-aria-live';

// ---------------------------------------------------------------------------
// FocusManager
// ---------------------------------------------------------------------------

export class FocusManager {
  /** Stack of trapped elements and their associated cleanup info */
  private trapStack: Array<{
    element: HTMLElement;
    previousFocus: Element | null;
    handler: (e: KeyboardEvent) => void;
  }> = [];

  /** Trap focus within an element (for modals). */
  trapFocus(element: HTMLElement): void {
    const previousFocus = document.activeElement;

    const handler = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;

      const focusable = this.getFocusableElements(element);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: cycle backwards
        if (
          document.activeElement === first ||
          !element.contains(document.activeElement)
        ) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: cycle forwards
        if (
          document.activeElement === last ||
          !element.contains(document.activeElement)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Store trap info for later release
    this.trapStack.push({ element, previousFocus, handler });

    // Install the trap handler
    document.addEventListener('keydown', handler);

    // Set initial focus to the first focusable element
    this.focusFirst(element);
  }

  /** Release focus trap. */
  releaseFocus(): void {
    const trap = this.trapStack.pop();
    if (!trap) return;

    // Remove the keydown handler
    document.removeEventListener('keydown', trap.handler);

    // Restore focus to the previously focused element
    if (trap.previousFocus && trap.previousFocus instanceof HTMLElement) {
      trap.previousFocus.focus();
    }
  }

  /** Release all focus traps. */
  releaseAll(): void {
    while (this.trapStack.length > 0) {
      this.releaseFocus();
    }
  }

  /** Check if focus is currently trapped. */
  isTrapped(): boolean {
    return this.trapStack.length > 0;
  }

  /** Set focus to first focusable element in container. */
  focusFirst(container: HTMLElement): void {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      // If no focusable elements, make the container itself focusable
      container.setAttribute('tabindex', '-1');
      container.focus();
    }
  }

  /** Set focus to last focusable element in container. */
  focusLast(container: HTMLElement): void {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
    }
  }

  /** Announce to screen readers via aria-live region. */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    let region = document.getElementById(ANNOUNCE_REGION_ID);

    if (!region) {
      region = document.createElement('div');
      region.id = ANNOUNCE_REGION_ID;
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');

      // Visually hidden but accessible to screen readers
      Object.assign(region.style, {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      });

      document.body.appendChild(region);
    }

    // Update priority if different
    region.setAttribute('aria-live', priority);

    // Clear first, then set — this ensures screen readers pick up the change
    // even if the message is the same as before
    region.textContent = '';

    // Use a microtask to allow the DOM to process the clear
    requestAnimationFrame(() => {
      if (region) {
        region.textContent = message;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Get all focusable elements within a container, in DOM order. */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const result: HTMLElement[] = [];

    for (const el of elements) {
      // Skip hidden elements
      if (this.isVisible(el)) {
        result.push(el);
      }
    }

    return result;
  }

  /** Check if an element is visible (not display:none or visibility:hidden). */
  private isVisible(el: HTMLElement): boolean {
    if (el.offsetParent === null && el.style.position !== 'fixed') {
      return false;
    }

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    return true;
  }
}
