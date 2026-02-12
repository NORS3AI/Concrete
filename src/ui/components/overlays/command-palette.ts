/**
 * Phase Zed.7 - CommandPalette
 * Keyboard-navigable command palette (Cmd+K / Ctrl+K).
 */

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  group?: string;
  action: () => void;
}

export interface CommandPaletteConfig {
  commands: CommandItem[];
  placeholder?: string;
  onClose?: () => void;
}

export class CommandPalette {
  private overlay: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private resultsList: HTMLElement | null = null;
  private commands: CommandItem[] = [];
  private filteredCommands: CommandItem[] = [];
  private selectedIndex: number = 0;
  private onClose: (() => void) | undefined;

  static open(config: CommandPaletteConfig): CommandPalette {
    const palette = new CommandPalette();
    palette.show(config);
    return palette;
  }

  private show(config: CommandPaletteConfig): void {
    this.commands = config.commands;
    this.filteredCommands = [...config.commands];
    this.onClose = config.onClose;
    this.selectedIndex = 0;

    // Backdrop
    this.overlay = document.createElement('div');
    this.overlay.className =
      'fixed inset-0 z-[60] flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Palette container
    const palette = document.createElement('div');
    palette.className =
      'w-full max-w-lg bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden';

    // Search input
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'flex items-center gap-3 px-4 border-b border-[var(--border)]';

    const searchIcon = document.createElement('span');
    searchIcon.className = 'text-[var(--text-muted)] flex-shrink-0';
    searchIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`;
    inputWrapper.appendChild(searchIcon);

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className =
      'flex-1 bg-transparent py-3.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none';
    this.input.placeholder = config.placeholder ?? 'Type a command...';
    this.input.addEventListener('input', () => this.handleFilter());
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    inputWrapper.appendChild(this.input);

    // Escape hint
    const escHint = document.createElement('kbd');
    escHint.className =
      'px-1.5 py-0.5 text-2xs text-[var(--text-muted)] border border-[var(--border)] rounded bg-[var(--surface)]';
    escHint.textContent = 'esc';
    inputWrapper.appendChild(escHint);

    palette.appendChild(inputWrapper);

    // Results list
    this.resultsList = document.createElement('div');
    this.resultsList.className = 'max-h-72 overflow-y-auto py-2';
    this.resultsList.setAttribute('role', 'listbox');
    palette.appendChild(this.resultsList);

    // Footer
    const footer = document.createElement('div');
    footer.className =
      'flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] text-2xs text-[var(--text-muted)]';
    footer.innerHTML = `
      <span><kbd class="px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded">\u2191\u2193</kbd> Navigate</span>
      <span><kbd class="px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded">\u23CE</kbd> Select</span>
      <span><kbd class="px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded">esc</kbd> Close</span>
    `;
    palette.appendChild(footer);

    this.overlay.appendChild(palette);
    document.body.appendChild(this.overlay);

    this.renderResults();
    this.input.focus();
  }

  private handleFilter(): void {
    const query = this.input?.value.toLowerCase() ?? '';
    this.filteredCommands = this.commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(query) ||
        cmd.description?.toLowerCase().includes(query) ||
        cmd.group?.toLowerCase().includes(query)
    );
    this.selectedIndex = 0;
    this.renderResults();
  }

  private handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(
          this.selectedIndex + 1,
          this.filteredCommands.length - 1
        );
        this.renderResults();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.renderResults();
        break;

      case 'Enter':
        e.preventDefault();
        if (this.filteredCommands[this.selectedIndex]) {
          this.executeCommand(this.filteredCommands[this.selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }

  private renderResults(): void {
    if (!this.resultsList) return;
    this.resultsList.innerHTML = '';

    if (this.filteredCommands.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'px-4 py-6 text-center text-sm text-[var(--text-muted)]';
      empty.textContent = 'No results found';
      this.resultsList.appendChild(empty);
      return;
    }

    // Group commands
    const grouped = new Map<string, CommandItem[]>();
    for (const cmd of this.filteredCommands) {
      const group = cmd.group ?? '';
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)!.push(cmd);
    }

    let globalIdx = 0;
    for (const [group, commands] of grouped) {
      if (group) {
        const groupLabel = document.createElement('div');
        groupLabel.className =
          'px-4 py-1 text-2xs font-semibold text-[var(--text-muted)] uppercase tracking-wider';
        groupLabel.textContent = group;
        this.resultsList.appendChild(groupLabel);
      }

      for (const cmd of commands) {
        const idx = globalIdx;
        const item = document.createElement('button');
        item.className = `w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
          idx === this.selectedIndex
            ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
            : 'text-[var(--text)] hover:bg-[var(--surface)]'
        }`;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(idx === this.selectedIndex));

        if (cmd.icon) {
          const iconEl = document.createElement('span');
          iconEl.className = 'w-5 h-5 flex-shrink-0 flex items-center justify-center';
          iconEl.innerHTML = cmd.icon;
          item.appendChild(iconEl);
        }

        const textCol = document.createElement('div');
        textCol.className = 'flex-1 min-w-0';

        const labelEl = document.createElement('div');
        labelEl.className = 'text-sm truncate';
        labelEl.textContent = cmd.label;
        textCol.appendChild(labelEl);

        if (cmd.description) {
          const descEl = document.createElement('div');
          descEl.className = 'text-2xs text-[var(--text-muted)] truncate';
          descEl.textContent = cmd.description;
          textCol.appendChild(descEl);
        }

        item.appendChild(textCol);

        if (cmd.shortcut) {
          const shortcut = document.createElement('kbd');
          shortcut.className =
            'text-2xs text-[var(--text-muted)] px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded flex-shrink-0';
          shortcut.textContent = cmd.shortcut;
          item.appendChild(shortcut);
        }

        item.addEventListener('click', () => this.executeCommand(cmd));
        item.addEventListener('mouseenter', () => {
          this.selectedIndex = idx;
          this.renderResults();
        });

        this.resultsList.appendChild(item);
        globalIdx++;
      }
    }

    // Scroll selected into view
    const selectedEl = this.resultsList.querySelector('[aria-selected="true"]');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  private executeCommand(cmd: CommandItem): void {
    this.close();
    cmd.action();
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.onClose?.();
  }
}
