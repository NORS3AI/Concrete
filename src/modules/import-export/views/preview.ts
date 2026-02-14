/**
 * Import Preview (Dry-Run) view.
 * Displays the results of a dry-run preview showing what will be
 * added, updated, skipped, or flagged as conflicts before committing.
 * Includes diff view for conflicting records, per-row resolution,
 * progress tracking, and commit/cancel actions.
 *
 * Fully wired to ImportExportService for preview, commit, and delete.
 */

import { getImportExportService } from '../service-accessor';
import type { PreviewRow, PreviewResult } from '../import-export-service';

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

const ACTION_BADGE: Record<string, { cls: string; label: string }> = {
  add: { cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', label: 'Add' },
  update: { cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', label: 'Update' },
  skip: { cls: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20', label: 'Skip' },
  conflict: { cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', label: 'Conflict' },
};

// ---------------------------------------------------------------------------
// Parse batchId from hash
// ---------------------------------------------------------------------------

function parseBatchId(): string | null {
  const hash = window.location.hash;
  // Expected: #/import-export/import/{batchId}
  const match = hash.match(/import\/([^/]+)$/);
  if (match) return match[1];
  const match2 = hash.match(/import\/([^/]+)\//);
  if (match2) return match2[1];
  return null;
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

function buildPreviewTable(
  rows: PreviewRow[],
  resolutions: Record<number, 'add' | 'update' | 'skip'>,
  onResolutionChange: (rowNumber: number, action: 'add' | 'update' | 'skip') => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Row', 'Action', 'Data Preview', 'Conflicts', 'Issues', 'Resolution']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');

  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No preview data available. Run the preview step first.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors cursor-pointer');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', String(row.rowNumber)));

    const tdAction = el('td', 'py-2 px-3');
    const actionInfo = ACTION_BADGE[row.action] ?? ACTION_BADGE['skip'];
    tdAction.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${actionInfo.cls}`, actionInfo.label));
    tr.appendChild(tdAction);

    const tdData = el('td', 'py-2 px-3');
    const dataStr = JSON.stringify(row.sourceData);
    tdData.appendChild(el('span', 'text-[var(--text-muted)] text-xs', dataStr.length > 100 ? dataStr.substring(0, 100) + '...' : dataStr));
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

    // Resolution dropdown (for conflict rows)
    const tdResolution = el('td', 'py-2 px-3');
    if (row.action === 'conflict') {
      const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-xs text-[var(--text)]';
      const select = el('select', inputCls) as HTMLSelectElement;
      const options: { value: 'add' | 'update' | 'skip'; label: string }[] = [
        { value: 'skip', label: 'Skip' },
        { value: 'add', label: 'Add as New' },
        { value: 'update', label: 'Overwrite' },
      ];
      for (const opt of options) {
        const o = el('option', '', opt.label) as HTMLOptionElement;
        o.value = opt.value;
        if (resolutions[row.rowNumber] === opt.value) o.selected = true;
        select.appendChild(o);
      }
      select.addEventListener('change', (e) => {
        e.stopPropagation();
        onResolutionChange(row.rowNumber, select.value as 'add' | 'update' | 'skip');
      });
      select.addEventListener('click', (e) => e.stopPropagation());
      tdResolution.appendChild(select);
    } else {
      tdResolution.appendChild(el('span', 'text-xs text-[var(--text-muted)]', '--'));
    }
    tr.appendChild(tdResolution);

    // Expand row on click for side-by-side diff
    tr.addEventListener('click', () => {
      const next = tr.nextElementSibling;
      if (next?.getAttribute('data-expand') === '1') {
        next.remove();
        return;
      }

      const expandRow = el('tr');
      expandRow.setAttribute('data-expand', '1');
      const expandTd = el('td', 'p-4 bg-[var(--surface)]');
      expandTd.setAttribute('colspan', '6');

      const diffGrid = el('div', 'grid grid-cols-2 gap-4');

      // Source panel
      const sourcePanel = el('div', 'bg-[var(--surface-raised)] rounded-lg p-4 border border-emerald-500/20');
      sourcePanel.appendChild(el('h4', 'text-sm font-bold text-emerald-400 mb-2', 'Incoming (Source)'));
      if (row.sourceData) {
        for (const [field, value] of Object.entries(row.sourceData)) {
          const isConflict = row.conflicts?.some((c) => c.field === field);
          const fieldRow = el('div', 'flex justify-between text-xs mb-1');
          fieldRow.appendChild(el('span', `font-medium ${isConflict ? 'text-amber-400' : 'text-[var(--text-muted)]'}`, field));
          fieldRow.appendChild(el('span', `font-mono ${isConflict ? 'text-emerald-400 font-bold' : 'text-[var(--text)]'}`, value != null ? String(value) : '--'));
          sourcePanel.appendChild(fieldRow);
        }
      } else {
        sourcePanel.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'No source data'));
      }
      diffGrid.appendChild(sourcePanel);

      // Existing panel
      const existingPanel = el('div', 'bg-[var(--surface-raised)] rounded-lg p-4 border border-red-500/20');
      existingPanel.appendChild(el('h4', 'text-sm font-bold text-red-400 mb-2', 'Existing (Current)'));
      if (row.existingData) {
        for (const [field, value] of Object.entries(row.existingData)) {
          const isConflict = row.conflicts?.some((c) => c.field === field);
          const fieldRow = el('div', 'flex justify-between text-xs mb-1');
          fieldRow.appendChild(el('span', `font-medium ${isConflict ? 'text-amber-400' : 'text-[var(--text-muted)]'}`, field));
          fieldRow.appendChild(el('span', `font-mono ${isConflict ? 'text-red-400 font-bold' : 'text-[var(--text)]'}`, value != null ? String(value) : '--'));
          existingPanel.appendChild(fieldRow);
        }
      } else {
        existingPanel.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'No existing record'));
      }
      diffGrid.appendChild(existingPanel);

      expandTd.appendChild(diffGrid);

      // Conflict fields highlighted
      if (row.conflicts && row.conflicts.length > 0) {
        const conflictSection = el('div', 'mt-3 bg-[var(--surface-raised)] rounded-lg p-3 border border-amber-500/20');
        conflictSection.appendChild(el('h5', 'text-xs font-bold text-amber-400 mb-2', `Conflicting Fields (${row.conflicts.length})`));
        for (const cf of row.conflicts) {
          const cfRow = el('div', 'flex items-center gap-3 text-xs mb-1');
          cfRow.appendChild(el('span', 'font-medium text-[var(--text)]', cf.field));
          cfRow.appendChild(el('span', 'text-red-400 line-through', String(cf.existingValue ?? '--')));
          cfRow.appendChild(el('span', 'text-[var(--text-muted)]', '\u2192'));
          cfRow.appendChild(el('span', 'text-emerald-400 font-bold', String(cf.sourceValue ?? '--')));
          conflictSection.appendChild(cfRow);
        }
        expandTd.appendChild(conflictSection);
      }

      expandRow.appendChild(expandTd);
      tr.after(expandRow);
    });

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------

function buildProgressBar(): {
  container: HTMLElement;
  update: (percent: number, label?: string) => void;
  show: () => void;
  hide: () => void;
} {
  const container = el('div', 'mb-4 hidden');
  const labelRow = el('div', 'flex justify-between text-sm mb-1');
  const labelEl = el('span', 'text-[var(--text)]', 'Import Progress');
  const pctEl = el('span', 'text-[var(--text-muted)]', '0%');
  labelRow.appendChild(labelEl);
  labelRow.appendChild(pctEl);
  container.appendChild(labelRow);

  const track = el('div', 'h-2 rounded-full bg-[var(--surface)] overflow-hidden');
  const fill = el('div', 'h-full rounded-full bg-[var(--accent)] transition-all duration-300');
  fill.style.width = '0%';
  track.appendChild(fill);
  container.appendChild(track);

  return {
    container,
    update(percent: number, label?: string) {
      fill.style.width = `${percent}%`;
      pctEl.textContent = `${percent}%`;
      if (label) labelEl.textContent = label;
    },
    show() {
      container.className = 'mb-4';
    },
    hide() {
      container.className = 'mb-4 hidden';
    },
  };
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Import Preview'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Review the dry-run results below. No data has been changed yet. Verify the actions and resolve any conflicts before committing.'));

    // Summary placeholder
    const summaryArea = el('div');
    wrapper.appendChild(summaryArea);

    // Progress bar
    const progress = buildProgressBar();
    wrapper.appendChild(progress.container);

    // Filter bar placeholder
    const filterArea = el('div');
    wrapper.appendChild(filterArea);

    // Table area
    const tableArea = el('div');
    wrapper.appendChild(tableArea);

    // Actions
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

    // --- State ---
    let previewResult: PreviewResult | null = null;
    let activeFilter = 'all';
    const resolutions: Record<number, 'add' | 'update' | 'skip'> = {};

    if (!batchId) {
      summaryArea.appendChild(el('p', 'text-sm text-red-400', 'No batch ID found in the URL. Navigate from the Import Wizard.'));
      return;
    }

    // --- Filter + render ---
    const getFilteredRows = (): PreviewRow[] => {
      if (!previewResult) return [];
      const rows = previewResult.rows;
      if (activeFilter === 'all') return rows;
      if (activeFilter === 'error') return rows.filter((r) => r.errors && r.errors.length > 0);
      return rows.filter((r) => r.action === activeFilter);
    };

    const renderTable = () => {
      tableArea.innerHTML = '';
      const filtered = getFilteredRows();
      tableArea.appendChild(buildPreviewTable(
        filtered,
        resolutions,
        (rowNumber, action) => {
          resolutions[rowNumber] = action;
        },
      ));
    };

    const renderFilters = () => {
      filterArea.innerHTML = '';
      const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
      const filterBtnCls = 'px-3 py-1 rounded-md text-xs font-medium border transition-colors';
      const filters = [
        { label: 'All', value: 'all' },
        { label: 'To Add', value: 'add' },
        { label: 'To Update', value: 'update' },
        { label: 'To Skip', value: 'skip' },
        { label: 'Conflicts', value: 'conflict' },
        { label: 'Errors', value: 'error' },
      ];
      for (const f of filters) {
        const isActive = f.value === activeFilter;
        const btnCls = isActive
          ? `${filterBtnCls} bg-[var(--accent)] text-white border-[var(--accent)]`
          : `${filterBtnCls} bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-raised)]`;
        const btn = el('button', btnCls, f.label);
        btn.addEventListener('click', () => {
          activeFilter = f.value;
          renderFilters();
          renderTable();
        });
        filterBar.appendChild(btn);
      }
      filterArea.appendChild(filterBar);
    };

    // --- Load preview ---
    const loadPreview = async () => {
      summaryArea.innerHTML = '';
      summaryArea.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Loading preview...'));

      try {
        previewResult = await svc.preview(batchId);

        // Initialize resolutions for conflict rows
        for (const row of previewResult.rows) {
          if (row.action === 'conflict' && !(row.rowNumber in resolutions)) {
            resolutions[row.rowNumber] = 'skip';
          }
        }

        // Render summary cards
        summaryArea.innerHTML = '';
        summaryArea.appendChild(buildSummaryCards({
          totalRows: previewResult.totalRows,
          toAdd: previewResult.toAdd,
          toUpdate: previewResult.toUpdate,
          toSkip: previewResult.toSkip,
          conflicts: previewResult.conflicts,
          errors: previewResult.errors,
          warnings: previewResult.warnings,
        }));

        renderFilters();
        renderTable();
      } catch (err) {
        summaryArea.innerHTML = '';
        showMsg(wrapper, `Preview failed: ${err instanceof Error ? err.message : String(err)}`, true);
      }
    };

    // --- Back ---
    backBtn.addEventListener('click', () => {
      window.location.hash = `#/import-export/import/${batchId}/mapping`;
    });

    // --- Cancel ---
    cancelBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to cancel this import? The batch will be deleted.')) {
        return;
      }
      try {
        await svc.deleteBatch(batchId);
        showMsg(wrapper, 'Import cancelled and batch deleted.', false);
        window.location.hash = '#/import-export/history';
      } catch (err) {
        showMsg(wrapper, `Cannot delete batch: ${err instanceof Error ? err.message : String(err)}`, true);
      }
    });

    // --- Commit ---
    commitBtn.addEventListener('click', async () => {
      commitBtn.disabled = true;
      commitBtn.textContent = 'Committing...';
      cancelBtn.style.display = 'none';
      backBtn.style.display = 'none';
      progress.show();

      const onProgress = (percent: number) => {
        progress.update(percent, percent >= 100 ? 'Complete!' : 'Importing...');
      };

      try {
        const result = await svc.commit(batchId, resolutions, onProgress);

        progress.update(100, 'Complete!');

        // Show completion message
        const statsMsg = `Import completed: ${result.importedRows} imported, ${result.skippedRows} skipped, ${result.errorRows} errors.`;
        const isSuccess = result.status === 'completed';
        showMsg(wrapper, statsMsg, !isSuccess);

        // Replace commit button with link to history
        commitBtn.textContent = 'View Import History';
        commitBtn.disabled = false;
        commitBtn.className = 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';
        commitBtn.onclick = () => {
          window.location.hash = '#/import-export/history';
        };
      } catch (err) {
        showMsg(wrapper, `Commit failed: ${err instanceof Error ? err.message : String(err)}`, true);
        commitBtn.disabled = false;
        commitBtn.textContent = 'Retry Commit';
        cancelBtn.style.display = '';
        backBtn.style.display = '';
        progress.hide();
      }
    });

    loadPreview();
  },
};
