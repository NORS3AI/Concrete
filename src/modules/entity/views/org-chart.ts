/**
 * Org Chart view.
 * Displays entity hierarchy as an indented tree with expand/collapse,
 * type badges, and status indicators.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrgNode {
  id: string;
  name: string;
  code: string;
  type: string;
  status: 'active' | 'inactive' | 'pending';
  children: OrgNode[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_BADGE_CLS: Record<string, string> = {
  corporation: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  llc: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  partnership: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  branch: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  division: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  consolidation: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
};

const STATUS_DOT: Record<string, string> = {
  active: 'bg-emerald-400',
  inactive: 'bg-red-400',
  pending: 'bg-amber-400',
};

// ---------------------------------------------------------------------------
// Tree renderer
// ---------------------------------------------------------------------------

function renderNode(node: OrgNode, depth: number, collapsed: Set<string>): HTMLElement {
  const wrap = el('div', '');

  // Node row
  const row = el('div', 'flex items-center gap-2 py-1.5 px-3 rounded-md hover:bg-[var(--surface)] transition-colors cursor-pointer');
  row.style.paddingLeft = `${depth * 1.5 + 0.75}rem`;

  // Expand/collapse toggle
  const toggle = el('span', 'w-5 h-5 flex items-center justify-center text-[var(--text-muted)] text-xs select-none');
  if (node.children.length > 0) {
    const isCollapsed = collapsed.has(node.id);
    toggle.textContent = isCollapsed ? '\u25B6' : '\u25BC';
    toggle.classList.add('cursor-pointer');
  } else {
    toggle.textContent = '\u2022';
  }
  row.appendChild(toggle);

  // Connector line
  if (depth > 0) {
    const connector = el('span', 'text-[var(--border)] text-xs mr-1', '\u2514\u2500');
    row.appendChild(connector);
  }

  // Status dot
  const dot = el('span', `w-2 h-2 rounded-full inline-block flex-shrink-0 ${STATUS_DOT[node.status] ?? STATUS_DOT.pending}`);
  row.appendChild(dot);

  // Entity name
  const nameLink = el('a', 'text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]', node.name) as HTMLAnchorElement;
  nameLink.href = `#/entities/${node.id}`;
  row.appendChild(nameLink);

  // Code label
  row.appendChild(el('span', 'text-xs text-[var(--text-muted)] font-mono', node.code));

  // Type badge
  const badgeCls = TYPE_BADGE_CLS[node.type] ?? TYPE_BADGE_CLS.corporation;
  const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`, node.type);
  row.appendChild(badge);

  wrap.appendChild(row);

  // Children container
  const childContainer = el('div', '');
  childContainer.setAttribute('data-children', node.id);

  if (collapsed.has(node.id)) {
    childContainer.style.display = 'none';
  }

  for (const child of node.children) {
    childContainer.appendChild(renderNode(child, depth + 1, collapsed));
  }

  wrap.appendChild(childContainer);

  // Toggle click
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (node.children.length === 0) return;
    const isNowCollapsed = childContainer.style.display === 'none';
    childContainer.style.display = isNowCollapsed ? '' : 'none';
    toggle.textContent = isNowCollapsed ? '\u25BC' : '\u25B6';
    if (isNowCollapsed) {
      collapsed.delete(node.id);
    } else {
      collapsed.add(node.id);
    }
  });

  return wrap;
}

function buildTree(roots: OrgNode[], collapsed: Set<string>): HTMLElement {
  const container = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  container.setAttribute('data-role', 'org-tree');

  if (roots.length === 0) {
    container.appendChild(
      el('p', 'py-8 text-center text-[var(--text-muted)]', 'No entities found. Create entities to see the org chart.'),
    );
    return container;
  }

  for (const root of roots) {
    container.appendChild(renderNode(root, 0, collapsed));
  }

  return container;
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function buildToolbar(onExpandAll: () => void, onCollapseAll: () => void): HTMLElement {
  const bar = el('div', 'flex items-center gap-2 mb-4');

  const expandBtn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Expand All');
  expandBtn.type = 'button';
  expandBtn.addEventListener('click', onExpandAll);
  bar.appendChild(expandBtn);

  const collapseBtn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Collapse All');
  collapseBtn.type = 'button';
  collapseBtn.addEventListener('click', onCollapseAll);
  bar.appendChild(collapseBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const collapsed = new Set<string>();
    const wrapper = el('div', 'space-y-0');

    // Header
    wrapper.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)] mb-4', 'Org Chart'));

    // Toolbar
    wrapper.appendChild(buildToolbar(
      () => {
        collapsed.clear();
        redraw();
      },
      () => {
        collectAllIds(roots, collapsed);
        redraw();
      },
    ));

    // Tree (empty shell -- service populates later)
    const roots: OrgNode[] = [];
    let treeEl = buildTree(roots, collapsed);
    wrapper.appendChild(treeEl);

    function collectAllIds(nodes: OrgNode[], set: Set<string>): void {
      for (const n of nodes) {
        if (n.children.length > 0) set.add(n.id);
        collectAllIds(n.children, set);
      }
    }

    function redraw(): void {
      const newTree = buildTree(roots, collapsed);
      treeEl.replaceWith(newTree);
      treeEl = newTree;
    }

    container.appendChild(wrapper);
  },
};
