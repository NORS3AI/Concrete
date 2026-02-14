/**
 * Merge Resolution view.
 * Conflict resolution UI for manual merge strategy.
 * Shows side-by-side comparison of incoming vs. existing records,
 * allowing the user to choose per-field or per-row resolution.
 * Supports bulk resolution and commit with resolutions map.
 *
 * Fully wired to ImportExportService for preview, commit, and navigation.
 */

import { getImportExportService } from '../service-accessor';
import type { PreviewRow, ConflictField } from '../import-export-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 5000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESOLUTION_OPTIONS: { value: 'add' | 'update' | 'skip'; label: string; cls: string }[] = [
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
  conflicts: ConflictField[];
  resolution: 'add' | 'update' | 'skip';
  fieldKeep: Record<string, 'source' | 'existing'>;
}

// ---------------------------------------------------------------------------
// Parse batchId from hash
// ---------------------------------------------------------------------------

function parseBatchId(): string | null {
  const hash = window.location.hash;
  // Expected: #/import-export/merge/{batchId}
  const match = hash.match(/merge\/([^/]+)/);
  if (match) return match[1];
  // Fallback: import/{batchId}/merge
  const match2 = hash.match(/import\/([^/]+)\/merge/);
  if (match2) return match2[1];
  // Another fallback
  const match3 = hash.match(/import\/([^/]+)/);
  if (match3) return match3[1];
  return null;
}

// ---------------------------------------------------------------------------
// Conflict Summary
// ---------------------------------------------------------------------------

function buildConflictSummary(
  conflicts: ConflictRecord[],
  onBulkResolve: (resolution: 'add' | 'update' | 'skip') => void,
): HTMLElement {
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
    const btn = el('button', `px-3 py-1 rounded-md text-xs font-medium border ${opt.cls} hover:opacity-80`, opt.label);
    btn.addEventListener('click', () => onBulkResolve(opt.value));
    bulkActions.appendChild(btn);
  }
  card.appendChild(bulkActions);

  return card;
}

// ---------------------------------------------------------------------------
// Side-by-Side Diff
// ---------------------------------------------------------------------------

function buildSideBySideDiff(
  conflict: ConflictRecord,
  onResolutionChange: (rowNumber: number, resolution: 'add' | 'update' | 'skip') => void,
  onFieldKeepChange: (rowNumber: number, field: string, keep: 'source' | 'existing') => void,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');

  const headerRow = el('div', 'flex items-center justify-between mb-4');
  const rowLabel = el('div', 'flex items-center gap-2');
  rowLabel.appendChild(el('span', 'text-sm font-medium text-[var(--text)]', `Row ${conflict.rowNumber}`));
  rowLabel.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20', `${conflict.conflicts.length} field conflict(s)`));
  headerRow.appendChild(rowLabel);

  // Per-row resolution buttons
  const resolutionWrap = el('div', 'flex gap-2');
  for (const opt of RESOLUTION_OPTIONS) {
    const isSelected = opt.value === conflict.resolution;
    const btnCls = isSelected
      ? `px-3 py-1 rounded-md text-xs font-medium border-2 ${opt.cls} ring-2 ring-[var(--accent)]/30`
      : `px-3 py-1 rounded-md text-xs font-medium border ${opt.cls} opacity-60 hover:opacity-100`;
    const btn = el('button', btnCls, opt.label);
    btn.addEventListener('click', () => {
      onResolutionChange(conflict.rowNumber, opt.value);
    });
    resolutionWrap.appendChild(btn);
  }
  headerRow.appendChild(resolutionWrap);
  card.appendChild(headerRow);

  // Side-by-side panels
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

  // Conflicting fields table with per-field "Keep" dropdown
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
    // Set current value
    const currentKeep = conflict.fieldKeep[cf.field] ?? 'source';
    keepSelect.value = currentKeep;
    keepSelect.addEventListener('change', () => {
      onFieldKeepChange(conflict.rowNumber, cf.field, keepSelect.value as 'source' | 'existing');
    });
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

    const svc = getImportExportService();
    const batchId = parseBatchId();

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Merge Conflict Resolution'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Review and resolve each conflict below. For each row, you can choose to add a new record, overwrite the existing record, or skip the row entirely. You can also resolve conflicts on a per-field basis.'));

    const contentArea = el('div');
    contentArea.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Loading conflicts...'));
    wrapper.appendChild(contentArea);

    // Actions
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

    // --- State ---
    const conflictRecords: ConflictRecord[] = [];

    if (!batchId) {
      contentArea.innerHTML = '';
      contentArea.appendChild(el('p', 'text-sm text-red-400', 'No batch ID found in the URL. Navigate from the Import Wizard or Preview.'));
      return;
    }

    // --- Re-render all conflict diffs ---
    const rerenderConflicts = () => {
      contentArea.innerHTML = '';

      // Summary
      contentArea.appendChild(buildConflictSummary(conflictRecords, (resolution) => {
        // Bulk resolve: update all conflict records
        for (const record of conflictRecords) {
          record.resolution = resolution;
        }
        rerenderConflicts();
        showMsg(wrapper, `All conflicts resolved as "${resolution}".`, false);
      }));

      // Individual conflict diffs
      for (const conflict of conflictRecords) {
        contentArea.appendChild(buildSideBySideDiff(
          conflict,
          (rowNumber, resolution) => {
            const record = conflictRecords.find((r) => r.rowNumber === rowNumber);
            if (record) {
              record.resolution = resolution;
              rerenderConflicts();
            }
          },
          (rowNumber, field, keep) => {
            const record = conflictRecords.find((r) => r.rowNumber === rowNumber);
            if (record) {
              record.fieldKeep[field] = keep;
            }
          },
        ));
      }

      if (conflictRecords.length === 0) {
        contentArea.appendChild(el('p', 'text-sm text-[var(--text-muted)] text-center py-8', 'No conflicts found. All rows are ready for import.'));
      }
    };

    // --- Load data ---
    const loadConflicts = async () => {
      try {
        const previewResult = await svc.preview(batchId);

        // Filter to conflict rows only
        const conflictRows = previewResult.rows.filter((r) => r.action === 'conflict');

        for (const row of conflictRows) {
          const fieldKeep: Record<string, 'source' | 'existing'> = {};
          if (row.conflicts) {
            for (const cf of row.conflicts) {
              fieldKeep[cf.field] = 'source'; // default to incoming
            }
          }

          conflictRecords.push({
            rowNumber: row.rowNumber,
            sourceData: row.sourceData,
            existingData: row.existingData ?? {},
            conflicts: row.conflicts ?? [],
            resolution: 'skip', // default resolution
            fieldKeep,
          });
        }

        rerenderConflicts();
      } catch (err) {
        contentArea.innerHTML = '';
        showMsg(wrapper, `Failed to load conflicts: ${err instanceof Error ? err.message : String(err)}`, true);
      }
    };

    // --- Back to Preview ---
    backBtn.addEventListener('click', () => {
      window.location.hash = `#/import-export/import/${batchId}`;
    });

    // --- Skip All Conflicts ---
    skipAllBtn.addEventListener('click', () => {
      for (const record of conflictRecords) {
        record.resolution = 'skip';
      }
      rerenderConflicts();
      showMsg(wrapper, 'All conflicts set to "skip".', false);
    });

    // --- Apply Resolutions & Commit ---
    applyBtn.addEventListener('click', async () => {
      applyBtn.disabled = true;
      applyBtn.textContent = 'Committing...';
      skipAllBtn.style.display = 'none';
      backBtn.style.display = 'none';

      try {
        // Build resolutions map from conflict records
        const resolutions: Record<number, 'add' | 'update' | 'skip'> = {};
        for (const record of conflictRecords) {
          resolutions[record.rowNumber] = record.resolution;
        }

        const result = await svc.commit(batchId, resolutions);

        const statsMsg = `Import committed: ${result.importedRows} imported, ${result.skippedRows} skipped, ${result.errorRows} errors.`;
        const isSuccess = result.status === 'completed';
        showMsg(wrapper, statsMsg, !isSuccess);

        // Navigate to history after a brief delay
        applyBtn.textContent = 'View Import History';
        applyBtn.disabled = false;
        applyBtn.className = 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';
        applyBtn.onclick = () => {
          window.location.hash = '#/import-export/history';
        };
      } catch (err) {
        showMsg(wrapper, `Commit failed: ${err instanceof Error ? err.message : String(err)}`, true);
        applyBtn.disabled = false;
        applyBtn.textContent = 'Retry Commit';
        skipAllBtn.style.display = '';
        backBtn.style.display = '';
      }
    });

    loadConflicts();
  },
};
