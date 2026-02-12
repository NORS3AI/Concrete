/**
 * Import Preview (Dry-Run) view.
 * Displays the results of a dry-run preview showing what will be
 * added, updated, skipped, or flagged as conflicts before committing.
 * Includes diff view for conflicting records.
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
// Constants
// ---------------------------------------------------------------------------

const ACTION_BADGE: Record<string, { cls: string; label: string }> = {
  add: { cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', label: 'Add' },
  update: { cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', label: 'Update' },
  skip: { cls: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20', label: 'Skip' },
  conflict: { cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', label: 'Conflict' },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PreviewRowDisplay {
  rowNumber: number;
  action: string;
  fields: Record<string, unknown>;
  existingFields?: Record<string, unknown>;
  conflicts?: { field: string; sourceValue: unknown; existingValue: unknown }[];
  errors?: string[];
  warnings?: string[];
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(summary: {
  totalRows: number;
  toAdd: number;
  toUpdate: number;
  toSkip: number;
  conflicts: number;
  errors: number;
  warnings: number;
}): HTMLElement {
  const grid = el('div', 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6');

  const cards: { label: string; value: number; cls: string }[] = [
    { label: 'Total Rows', value: summary.totalRows, cls: 'text-[var(--text)]' },
    { label: 'To Add', value: summary.toAdd, cls: 'text-emerald-400' },
    { label: 'To Update', value: summary.toUpdate, cls: 'text-blue-400' },
    { label: 'To Skip', value: summary.toSkip, cls: 'text-zinc-400' },
    { label: 'Conflicts', value: summary.conflicts, cls: 'text-amber-400' },
    { label: 'Errors', value: summary.errors, cls: 'text-red-400' },
    { label: 'Warnings', value: summary.warnings, cls: 'text-orange-400' },
  ];

  for (const card of cards) {
    const cardEl = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 text-center');
    cardEl.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', card.label));
    cardEl.appendChild(el('p', `text-2xl font-bold ${card.cls}`, String(card.value)));
    grid.appendChild(cardEl);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Preview Table
// ---------------------------------------------------------------------------

function buildPreviewTable(rows: PreviewRowDisplay[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Row', 'Action', 'Data Preview', 'Conflicts', 'Issues']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');

  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No preview data available. Run the preview step first.');
    td.setAttribute('colspan', '5');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', String(row.rowNumber)));

    const tdAction = el('td', 'py-2 px-3');
    const actionInfo = ACTION_BADGE[row.action] ?? ACTION_BADGE['skip'];
    tdAction.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${actionInfo.cls}`, actionInfo.label));
    tr.appendChild(tdAction);

    const tdData = el('td', 'py-2 px-3');
    const fieldPairs = Object.entries(row.fields).slice(0, 4);
    const fieldSummary = fieldPairs.map(([k, v]) => `${k}: ${v}`).join(', ');
    tdData.appendChild(el('span', 'text-[var(--text-muted)] text-xs', fieldSummary));
    tr.appendChild(tdData);

    const tdConflicts = el('td', 'py-2 px-3');
    if (row.conflicts && row.conflicts.length > 0) {
      const conflictList = el('div', 'space-y-1');
      for (const conflict of row.conflicts.slice(0, 3)) {
        const conflictEl = el('div', 'text-xs');
        conflictEl.appendChild(el('span', 'font-medium text-[var(--text)]', `${conflict.field}: `));
        conflictEl.appendChild(el('span', 'text-red-400 line-through', String(conflict.existingValue ?? '')));
        conflictEl.appendChild(el('span', 'text-[var(--text-muted)]', ' \u2192 '));
        conflictEl.appendChild(el('span', 'text-emerald-400', String(conflict.sourceValue ?? '')));
        conflictList.appendChild(conflictEl);
      }
      if (row.conflicts.length > 3) {
        conflictList.appendChild(el('span', 'text-xs text-[var(--text-muted)]', `+${row.conflicts.length - 3} more`));
      }
      tdConflicts.appendChild(conflictList);
    } else {
      tdConflicts.appendChild(el('span', 'text-xs text-[var(--text-muted)]', '--'));
    }
    tr.appendChild(tdConflicts);

    const tdIssues = el('td', 'py-2 px-3');
    const issueList = el('div', 'space-y-1');
    if (row.errors && row.errors.length > 0) {
      for (const err of row.errors) {
        issueList.appendChild(el('span', 'block text-xs text-red-400', err));
      }
    }
    if (row.warnings && row.warnings.length > 0) {
      for (const warn of row.warnings) {
        issueList.appendChild(el('span', 'block text-xs text-orange-400', warn));
      }
    }
    if ((!row.errors || row.errors.length === 0) && (!row.warnings || row.warnings.length === 0)) {
      issueList.appendChild(el('span', 'text-xs text-[var(--text-muted)]', '--'));
    }
    tdIssues.appendChild(issueList);
    tr.appendChild(tdIssues);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Diff Panel
// ---------------------------------------------------------------------------

function buildDiffPanel(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-4', 'Side-by-Side Diff'));
  card.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Select a row with conflicts above to see a detailed side-by-side comparison of the incoming data vs. existing data.'));

  const diffGrid = el('div', 'grid grid-cols-2 gap-4 mt-4');

  const sourcePanel = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-emerald-500/20');
  sourcePanel.appendChild(el('h4', 'text-sm font-bold text-emerald-400 mb-2', 'Incoming (Source)'));
  sourcePanel.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'No conflict selected'));
  diffGrid.appendChild(sourcePanel);

  const existingPanel = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-red-500/20');
  existingPanel.appendChild(el('h4', 'text-sm font-bold text-red-400 mb-2', 'Existing (Current)'));
  existingPanel.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'No conflict selected'));
  diffGrid.appendChild(existingPanel);

  card.appendChild(diffGrid);
  return card;
}

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------

function buildProgressBar(percent: number, label: string): HTMLElement {
  const container = el('div', 'mb-4');
  const labelRow = el('div', 'flex justify-between text-sm mb-1');
  labelRow.appendChild(el('span', 'text-[var(--text)]', label));
  labelRow.appendChild(el('span', 'text-[var(--text-muted)]', `${percent}%`));
  container.appendChild(labelRow);

  const track = el('div', 'h-2 rounded-full bg-[var(--surface)] overflow-hidden');
  const fill = el('div', 'h-full rounded-full bg-[var(--accent)] transition-all duration-300');
  fill.style.width = `${percent}%`;
  track.appendChild(fill);
  container.appendChild(track);

  return container;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Import Preview'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Review the dry-run results below. No data has been changed yet. Verify the actions and resolve any conflicts before committing.'));

    wrapper.appendChild(buildSummaryCards({
      totalRows: 0,
      toAdd: 0,
      toUpdate: 0,
      toSkip: 0,
      conflicts: 0,
      errors: 0,
      warnings: 0,
    }));

    wrapper.appendChild(buildProgressBar(0, 'Import Progress'));

    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const filterBtnCls = 'px-3 py-1 rounded-md text-xs font-medium border transition-colors';
    const filters = [
      { label: 'All', value: 'all', active: true },
      { label: 'To Add', value: 'add', active: false },
      { label: 'To Update', value: 'update', active: false },
      { label: 'To Skip', value: 'skip', active: false },
      { label: 'Conflicts', value: 'conflict', active: false },
      { label: 'Errors', value: 'error', active: false },
    ];
    for (const filter of filters) {
      const btnCls = filter.active
        ? `${filterBtnCls} bg-[var(--accent)] text-white border-[var(--accent)]`
        : `${filterBtnCls} bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-raised)]`;
      filterBar.appendChild(el('button', btnCls, filter.label));
    }
    wrapper.appendChild(filterBar);

    wrapper.appendChild(buildDiffPanel());
    wrapper.appendChild(buildPreviewTable([]));

    const actions = el('div', 'flex justify-between gap-3 mt-4');
    const backBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]', 'Back to Mapping');
    actions.appendChild(backBtn);
    const rightActions = el('div', 'flex gap-3');
    const cancelBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20', 'Cancel Import');
    rightActions.appendChild(cancelBtn);
    const commitBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-500 text-white hover:opacity-90', 'Commit Import');
    rightActions.appendChild(commitBtn);
    actions.appendChild(rightActions);
    wrapper.appendChild(actions);

    container.appendChild(wrapper);
  },
};
