/**
 * Concrete — Keyboard Shortcut Manager
 * Phase Zed.14: Keyboard Shortcuts & Accessibility
 *
 * Registers, dispatches, and manages keyboard shortcuts with
 * scoping, customizable bindings, and a help display API.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Shortcut {
  id: string;
  keys: string; // e.g. 'ctrl+k', 'ctrl+shift+z', 'escape'
  description: string;
  handler: (e: KeyboardEvent) => void;
  scope?: string; // 'global' | 'table' | 'form' | module id
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// KeyboardManager
// ---------------------------------------------------------------------------

export class KeyboardManager {
  private shortcuts: Map<string, Shortcut> = new Map();
  private customBindings: Map<string, string> = new Map(); // id -> custom keys
  private activeScope: string = 'global';
  private installed = false;
  private bindingsStorageKey = 'concrete_keybindings';

  /** Bound handler reference for add/removeEventListener */
  private readonly keydownHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.keydownHandler = this.onKeydown.bind(this);
    this.loadCustomBindings();
  }

  /** Install the global keyboard listener. */
  install(): void {
    if (this.installed) return;
    this.installed = true;
    document.addEventListener('keydown', this.keydownHandler);
  }

  /** Uninstall the global keyboard listener. */
  uninstall(): void {
    if (!this.installed) return;
    this.installed = false;
    document.removeEventListener('keydown', this.keydownHandler);
  }

  /** Register a keyboard shortcut. */
  register(shortcut: Shortcut): void {
    const registered: Shortcut = {
      ...shortcut,
      scope: shortcut.scope ?? 'global',
      enabled: shortcut.enabled ?? true,
    };

    // Apply custom binding if one exists
    const custom = this.customBindings.get(shortcut.id);
    if (custom) {
      registered.keys = custom;
    }

    this.shortcuts.set(shortcut.id, registered);
  }

  /** Unregister a keyboard shortcut. */
  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  /** Set active scope (e.g., when focusing a table, set scope to 'table'). */
  setScope(scope: string): void {
    this.activeScope = scope;
  }

  /** Get the current active scope. */
  getScope(): string {
    return this.activeScope;
  }

  /** Get all registered shortcuts (for help display). */
  getAll(): Shortcut[] {
    return [...this.shortcuts.values()];
  }

  /** Get shortcuts by scope. */
  getByScope(scope: string): Shortcut[] {
    return [...this.shortcuts.values()].filter((s) => s.scope === scope);
  }

  /** Allow user to customize a binding. */
  rebind(id: string, newKeys: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.keys = newKeys;
    }
    this.customBindings.set(id, newKeys);
    this.persistCustomBindings();
  }

  /** Reset a binding to its default. */
  resetBinding(id: string): void {
    this.customBindings.delete(id);
    this.persistCustomBindings();
  }

  /** Register default global shortcuts. */
  registerDefaults(): void {
    // Ctrl+K -> command palette
    this.register({
      id: 'global.commandPalette',
      keys: 'ctrl+k',
      description: 'Open command palette',
      scope: 'global',
      handler: (e: KeyboardEvent) => {
        e.preventDefault();
        document.dispatchEvent(
          new CustomEvent('concrete:command-palette', { detail: { action: 'toggle' } }),
        );
      },
    });

    // Ctrl+Z -> undo
    this.register({
      id: 'global.undo',
      keys: 'ctrl+z',
      description: 'Undo last action',
      scope: 'global',
      handler: (e: KeyboardEvent) => {
        // Only intercept if not in an input/textarea
        const target = e.target as HTMLElement;
        if (this.isEditableElement(target)) return;
        e.preventDefault();
        document.dispatchEvent(
          new CustomEvent('concrete:undo'),
        );
      },
    });

    // Ctrl+Shift+Z -> redo
    this.register({
      id: 'global.redo',
      keys: 'ctrl+shift+z',
      description: 'Redo last undone action',
      scope: 'global',
      handler: (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (this.isEditableElement(target)) return;
        e.preventDefault();
        document.dispatchEvent(
          new CustomEvent('concrete:redo'),
        );
      },
    });

    // Ctrl+S -> save form
    this.register({
      id: 'global.save',
      keys: 'ctrl+s',
      description: 'Save current form',
      scope: 'global',
      handler: (e: KeyboardEvent) => {
        e.preventDefault();
        document.dispatchEvent(
          new CustomEvent('concrete:save'),
        );
      },
    });

    // Escape -> close modal
    this.register({
      id: 'global.escape',
      keys: 'escape',
      description: 'Close modal or dismiss',
      scope: 'global',
      handler: (_e: KeyboardEvent) => {
        document.dispatchEvent(
          new CustomEvent('concrete:escape'),
        );
      },
    });

    // ? -> show shortcuts help (only when not in an input)
    this.register({
      id: 'global.help',
      keys: 'shift+/',
      description: 'Show keyboard shortcuts help',
      scope: 'global',
      handler: (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (this.isEditableElement(target)) return;
        e.preventDefault();
        document.dispatchEvent(
          new CustomEvent('concrete:shortcuts-help'),
        );
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /** Handle a keydown event. */
  private onKeydown(e: KeyboardEvent): void {
    const combo = this.parseEvent(e);

    for (const shortcut of this.shortcuts.values()) {
      if (!shortcut.enabled) continue;

      // Check scope: global shortcuts always fire; scoped shortcuts
      // only fire when the active scope matches
      if (shortcut.scope !== 'global' && shortcut.scope !== this.activeScope) {
        continue;
      }

      const normalizedKeys = this.normalizeKeys(shortcut.keys);
      if (combo === normalizedKeys) {
        shortcut.handler(e);
        return; // Only fire the first matching shortcut
      }
    }
  }

  /** Parse a KeyboardEvent into a normalized string like 'ctrl+shift+k'. */
  private parseEvent(e: KeyboardEvent): string {
    const parts: string[] = [];

    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');

    // Get the key name, normalized to lowercase
    let key = e.key.toLowerCase();

    // Normalize common key names
    const keyMap: Record<string, string> = {
      'escape': 'escape',
      'esc': 'escape',
      'enter': 'enter',
      'return': 'enter',
      'backspace': 'backspace',
      'delete': 'delete',
      'tab': 'tab',
      'arrowup': 'up',
      'arrowdown': 'down',
      'arrowleft': 'left',
      'arrowright': 'right',
      ' ': 'space',
      '/': '/',
    };

    key = keyMap[key] ?? key;

    // Don't add modifier keys as the "key" part
    if (['control', 'alt', 'shift', 'meta'].includes(key)) {
      return parts.join('+');
    }

    parts.push(key);
    return parts.join('+');
  }

  /** Normalize a key binding string for comparison. */
  private normalizeKeys(keys: string): string {
    const parts = keys.toLowerCase().split('+').map((p) => p.trim());
    const modifiers: string[] = [];
    let mainKey = '';

    for (const part of parts) {
      if (['ctrl', 'cmd', 'meta', 'control'].includes(part)) {
        modifiers.push('ctrl');
      } else if (part === 'alt' || part === 'option') {
        modifiers.push('alt');
      } else if (part === 'shift') {
        modifiers.push('shift');
      } else {
        mainKey = part;
      }
    }

    // Sort modifiers for consistent comparison
    modifiers.sort();
    if (mainKey) {
      modifiers.push(mainKey);
    }

    return modifiers.join('+');
  }

  /** Check if an element is an editable input. */
  private isEditableElement(el: HTMLElement): boolean {
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  /** Load custom key bindings from localStorage. */
  private loadCustomBindings(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(this.bindingsStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        if (parsed && typeof parsed === 'object') {
          for (const [id, keys] of Object.entries(parsed)) {
            this.customBindings.set(id, keys);
          }
        }
      }
    } catch {
      // Ignore corrupted data
    }
  }

  /** Persist custom key bindings to localStorage. */
  private persistCustomBindings(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const obj: Record<string, string> = {};
      for (const [id, keys] of this.customBindings) {
        obj[id] = keys;
      }
      localStorage.setItem(this.bindingsStorageKey, JSON.stringify(obj));
    } catch {
      // Storage full — ignore
    }
  }
}
