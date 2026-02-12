/**
 * Merge Resolution view.
 * Conflict resolution UI for manual merge strategy.
 * Shows side-by-side comparison of incoming vs. existing records,
 * allowing the user to choose per-field or per-row resolution.
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

const RESOLUTION_OPTIONS = [
  { value: 'add', label: 'Add as New', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'update', label: 'Overwrite Existing', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'skip', label: 'Skip (Keep Existing)', cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConflictRecord {
  rowNumber: number;
  sourceData: Record<string, unknown>;
  existingData: Record<string, unknown>;
  conflicts: { field: string; sourceValue: unknown; existingValue: unknown }[];
  resolution: string;
}

// ---------------------------------------------------------------------------
// Conflict Summary
// ---------------------------------------------------------------------------

function buildConflictSummary(conflicts: ConflictRecord[]): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-6');

  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)]', 'Conflict Summary'));

  const countBadge = el('span', 'px-3 py-1 rounded-full text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20', `${conflicts.length} conflict(s)`);
  headerRow.appendChild(countBadge);
  card.appendChild(headerRow);

  card.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'The following rows have conflicting data with existing records (matched by composite key). Choose how to resolve each conflict: add as a new record, overwrite the existing record, or skip.'));

  const bulkActions = el('div', 'flex gap-3 mb-4');
  bulkActions.appendChild(el('span', 'text-sm text-[var(--text-muted)] mr-2', 'Resolve all as:'));
  for (const opt of RESOLUTION_OPTIONS) {
    const btn = el('button', `px-3 py-1 rounded-md text-xs font-medium border ${opt.cls}`, opt.label);
    bulkActions.appendChild(btn);
  }
  card.appendChild(bulkActions);

  return card;
}

// ---------------------------------------------------------------------------
// Side-by-Side Diff
// ---------------------------------------------------------------------------

function buildSideBySideDiff(conflict: ConflictRecord): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');

  const headerRow = el('div', 'flex items-center justify-between mb-4');
  const rowLabel = el('div', 'flex items-center gap-2');
  rowLabel.appendChild(el('span', 'text-sm font-medium text-[var(--text)]', `Row ${conflict.rowNumber}`));
  rowLabel.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20', `${conflict.conflicts.length} field conflict(s)`));
  headerRow.appendChild(rowLabel);

  const resolutionWrap = el('div', 'flex gap-2');
  for (const opt of RESOLUTION_OPTIONS) {
    const isSelected = opt.value === conflict.resolution;
    const btnCls = isSelected
      ? `px-3 py-1 rounded-md text-xs font-medium border-2 ${opt.cls} ring-2 ring-[var(--accent)]/30`
      : `px-3 py-1 rounded-md text-xs font-medium border ${opt.cls} opacity-60 hover:opacity-100`;
    resolutionWrap.appendChild(el('button', btnCls, opt.label));
  }
  headerRow.appendChild(resolutionWrap);
  card.appendChild(headerRow);

  const diffGrid = el('div', 'grid grid-cols-2 gap-4');

  const sourcePanel = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-emerald-500/20');
  sourcePanel.appendChild(el('h4', 'text-sm font-bold text-emerald-400 mb-3', 'Incoming (Source)'));
  const sourceFields = el('div', 'space-y-2');
  for (const [field, value] of Object.entries(conflict.sourceData)) {
    const isConflict = conflict.conflicts.some((c) => c.field === field);
    const fieldRow = el('div', 'flex justify-between text-xs');
    fieldRow.appendChild(el('span', `font-medium ${isConflict ? 'text-amber-400' : 'text-[var(--text-muted)]'}`, field));
    fieldRow.appendChild(el('span', `font-mono ${isConflict ? 'text-emerald-400 font-bold' : 'text-[var(--text)]'}`, value !== null && value !== undefined ? String(value) : '--'));
    sourceFields.appendChild(fieldRow);
  }
  sourcePanel.appendChild(sourceFields);
  diffGrid.appendChild(sourcePanel);

  const existingPanel = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-red-500/20');
  existingPanel.appendChild(el('h4', 'text-sm font-bold text-red-400 mb-3', 'Existing (Current)'));
  const existingFields = el('div', 'space-y-2');
  for (const [field, value] of Object.entries(conflict.existingData)) {
    const isConflict = conflict.conflicts.some((c) => c.field === field);
    const fieldRow = el('div', 'flex justify-between text-xs');
    fieldRow.appendChild(el('span', `font-medium ${isConflict ? 'text-amber-400' : 'text-[var(--text-muted)]'}`, field));
    fieldRow.appendChild(el('span', `font-mono ${isConflict ? 'text-red-400 font-bold' : 'text-[var(--text)]'}`, value !== null && value !== undefined ? String(value) : '--'));
    existingFields.appendChild(fieldRow);
  }
  existingPanel.appendChild(existingFields);
  diffGrid.appendChild(existingPanel);

  card.appendChild(diffGrid);

  const conflictDetails = el('div', 'mt-4 bg-[var(--surface)] rounded-lg p-3 border border-[var(--border)]');
  conflictDetails.appendChild(el('h5', 'text-xs font-bold text-amber-400 mb-2', 'Conflicting Fields'));
  const conflictTable = el('table', 'w-full text-xs');
  const ctHead = el('thead');
  const ctHeadRow = el('tr', 'text-left text-[var(--text-muted)]');
  ctHeadRow.appendChild(el('th', 'py-1 px-2 font-medium', 'Field'));
  ctHeadRow.appendChild(el('th', 'py-1 px-2 font-medium', 'Incoming'));
  ctHeadRow.appendChild(el('th', 'py-1 px-2 font-medium', 'Existing'));
  ctHeadRow.appendChild(el('th', 'py-1 px-2 font-medium', 'Keep'));
  ctHead.appendChild(ctHeadRow);
  conflictTable.appendChild(ctHead);

  const ctBody = el('tbody');
  for (const cf of conflict.conflicts) {
    const cfRow = el('tr', 'border-t border-[var(--border)]');
    cfRow.appendChild(el('td', 'py-1 px-2 font-medium text-[var(--text)]', cf.field));
    cfRow.appendChild(el('td', 'py-1 px-2 font-mono text-emerald-400', cf.sourceValue !== null && cf.sourceValue !== undefined ? String(cf.sourceValue) : '--'));
    cfRow.appendChild(el('td', 'py-1 px-2 font-mono text-red-400', cf.existingValue !== null && cf.existingValue !== undefined ? String(cf.existingValue) : '--'));

    const tdKeep = el('td', 'py-1 px-2');
    const keepSelect = el('select', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded px-1 py-0.5 text-xs text-[var(--text)]') as HTMLSelectElement;
    const optIncoming = el('option', '', 'Incoming') as HTMLOptionElement;
    optIncoming.value = 'source';
    keepSelect.appendChild(optIncoming);
    const optExisting = el('option', '', 'Existing') as HTMLOptionElement;
    optExisting.value = 'existing';
    keepSelect.appendChild(optExisting);
    tdKeep.appendChild(keepSelect);
    cfRow.appendChild(tdKeep);

    ctBody.appendChild(cfRow);
  }
  conflictTable.appendChild(ctBody);
  conflictDetails.appendChild(conflictTable);
  card.appendChild(conflictDetails);

  return card;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Merge Conflict Resolution'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Review and resolve each conflict below. For each row, you can choose to add a new record, overwrite the existing record, or skip the row entirely. You can also resolve conflicts on a per-field basis.'));

    const sampleConflicts: ConflictRecord[] = [
      {
        rowNumber: 3,
        sourceData: { name: 'ABC Concrete LLC', code: 'V-001', phone: '555-0101', email: 'info@abc.com', status: 'active' },
        existingData: { name: 'ABC Concrete Inc.', code: 'V-001', phone: '555-0100', email: 'old@abc.com', status: 'active' },
        conflicts: [
          { field: 'name', sourceValue: 'ABC Concrete LLC', existingValue: 'ABC Concrete Inc.' },
          { field: 'phone', sourceValue: '555-0101', existingValue: '555-0100' },
          { field: 'email', sourceValue: 'info@abc.com', existingValue: 'old@abc.com' },
        ],
        resolution: 'skip',
      },
      {
        rowNumber: 7,
        sourceData: { name: 'XYZ Steel Supply', code: 'V-005', phone: '555-0200', amount: 75000 },
        existingData: { name: 'XYZ Steel Supply', code: 'V-005', phone: '555-0199', amount: 50000 },
        conflicts: [
          { field: 'phone', sourceValue: '555-0200', existingValue: '555-0199' },
          { field: 'amount', sourceValue: 75000, existingValue: 50000 },
        ],
        resolution: 'update',
      },
    ];

    wrapper.appendChild(buildConflictSummary(sampleConflicts));

    for (const conflict of sampleConflicts) {
      wrapper.appendChild(buildSideBySideDiff(conflict));
    }

    const actions = el('div', 'flex justify-between gap-3 mt-4');
    const backBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]', 'Back to Preview');
    actions.appendChild(backBtn);
    const rightActions = el('div', 'flex gap-3');
    const skipAllBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 hover:bg-zinc-500/20', 'Skip All Conflicts');
    rightActions.appendChild(skipAllBtn);
    const applyBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-500 text-white hover:opacity-90', 'Apply Resolutions & Commit');
    rightActions.appendChild(applyBtn);
    actions.appendChild(rightActions);
    wrapper.appendChild(actions);

    container.appendChild(wrapper);
  },
};
