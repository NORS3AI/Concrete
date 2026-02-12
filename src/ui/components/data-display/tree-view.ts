/**
 * Phase Zed.7 - TreeView
 * Expandable tree view with selection support.
 */

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  icon?: string;
  data?: Record<string, unknown>;
}

export class TreeView {
  private nodes: TreeNode[];
  private onSelect: ((node: TreeNode) => void) | undefined;
  private container: HTMLElement | null = null;
  private expandedIds: Set<string> = new Set();
  private selectedId: string | null = null;

  constructor(
    nodes: TreeNode[],
    onSelect?: (node: TreeNode) => void
  ) {
    this.nodes = nodes;
    this.onSelect = onSelect;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  expandAll(): void {
    this.forEachNode(this.nodes, (node) => {
      if (node.children && node.children.length > 0) {
        this.expandedIds.add(node.id);
      }
    });
    this.render();
  }

  collapseAll(): void {
    this.expandedIds.clear();
    this.render();
  }

  selectNode(id: string): void {
    this.selectedId = id;
    // Expand parents to make selected node visible
    this.expandParents(id, this.nodes);
    this.render();
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.className = 'text-sm';

    const list = this.renderNodes(this.nodes, 0);
    this.container.appendChild(list);
  }

  private renderNodes(nodes: TreeNode[], depth: number): HTMLElement {
    const ul = document.createElement('ul');
    ul.className = 'space-y-0.5';
    ul.setAttribute('role', 'tree');

    for (const node of nodes) {
      const li = document.createElement('li');
      li.setAttribute('role', 'treeitem');
      li.setAttribute('aria-expanded', String(this.expandedIds.has(node.id)));

      const row = document.createElement('div');
      const isSelected = this.selectedId === node.id;
      const paddingLeft = depth * 20 + 8;
      row.className = `flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'text-[var(--text)] hover:bg-[var(--surface)]'
      }`;
      row.style.paddingLeft = `${paddingLeft}px`;

      // Expand/collapse chevron
      const hasChildren = node.children && node.children.length > 0;
      const chevron = document.createElement('span');
      chevron.className = `w-4 h-4 flex-shrink-0 flex items-center justify-center transition-transform ${
        hasChildren ? 'text-[var(--text-muted)]' : 'invisible'
      }`;
      if (hasChildren) {
        chevron.textContent = this.expandedIds.has(node.id) ? '\u25BE' : '\u25B8';
        chevron.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleNode(node.id);
        });
      }
      row.appendChild(chevron);

      // Icon
      if (node.icon) {
        const iconEl = document.createElement('span');
        iconEl.className = 'w-4 h-4 flex-shrink-0';
        iconEl.innerHTML = node.icon;
        row.appendChild(iconEl);
      }

      // Label
      const label = document.createElement('span');
      label.className = 'truncate';
      label.textContent = node.label;
      row.appendChild(label);

      row.addEventListener('click', () => {
        this.selectedId = node.id;
        if (hasChildren) {
          this.toggleNode(node.id);
        }
        this.onSelect?.(node);
        this.render();
      });

      li.appendChild(row);

      // Children (if expanded)
      if (hasChildren && this.expandedIds.has(node.id)) {
        const childList = this.renderNodes(node.children!, depth + 1);
        li.appendChild(childList);
      }

      ul.appendChild(li);
    }

    return ul;
  }

  private toggleNode(id: string): void {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
    this.render();
  }

  private expandParents(id: string, nodes: TreeNode[]): boolean {
    for (const node of nodes) {
      if (node.id === id) return true;
      if (node.children && node.children.length > 0) {
        if (this.expandParents(id, node.children)) {
          this.expandedIds.add(node.id);
          return true;
        }
      }
    }
    return false;
  }

  private forEachNode(
    nodes: TreeNode[],
    callback: (node: TreeNode) => void
  ): void {
    for (const node of nodes) {
      callback(node);
      if (node.children) {
        this.forEachNode(node.children, callback);
      }
    }
  }
}
