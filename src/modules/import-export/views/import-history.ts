/**
 * Import History view.
 * Displays past import batches with status, row counts, and revert option.
 * Includes summary statistics across all imports, filtering, and batch management.
 */

import { getImportExportService } from '../service-accessor';

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

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  validating: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  preview: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  importing: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
  reverted: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

const FORMAT_LABELS: Record<string, string> = {
  csv: 'CSV',
  tsv: 'TSV',
  json: 'JSON',
  iif: 'IIF',
  qb: 'QuickBooks',
  sage: 'Sage',
  foundation: 'Foundation',
  fixed: 'Fixed-Width',
};

type BatchStatus = 'pending' | 'validating' | 'preview' | 'importing' | 'completed' | 'failed' | 'reverted';
type SourceFormat = 'csv' | 'json' | 'iif' | 'qb' | 'sage' | 'foundation' | 'tsv' | 'fixed';

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    // State
    let statusFilter = '';
    let formatFilter = '';
    let searchQuery = '';

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Import History'));
    const newImportLink = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newImportLink.href = '#/import-export/import';
    newImportLink.textContent = 'New Import';
    headerRow.appendChild(newImportLink);
    wrapper.appendChild(headerRow);

    // Summary cards area
    const summaryArea = el('div');
    wrapper.appendChild(summaryArea);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by batch name...';
    filterBar.appendChild(searchInput);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    const statusOptions: { value: string; label: string }[] = [
      { value: '', label: 'All Statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'validating', label: 'Validating' },
      { value: 'preview', label: 'Preview' },
      { value: 'importing', label: 'Importing' },
      { value: 'completed', label: 'Completed' },
      { value: 'failed', label: 'Failed' },
      { value: 'reverted', label: 'Reverted' },
    ];
    for (const opt of statusOptions) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const formatSelect = el('select', inputCls) as HTMLSelectElement;
    const formatOptions: { value: string; label: string }[] = [
      { value: '', label: 'All Formats' },
      { value: 'csv', label: 'CSV' },
      { value: 'tsv', label: 'TSV' },
      { value: 'json', label: 'JSON' },
      { value: 'iif', label: 'IIF' },
      { value: 'qb', label: 'QuickBooks' },
      { value: 'sage', label: 'Sage' },
      { value: 'foundation', label: 'Foundation' },
      { value: 'fixed', label: 'Fixed-Width' },
    ];
    for (const opt of formatOptions) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      formatSelect.appendChild(o);
    }
    filterBar.appendChild(formatSelect);

    wrapper.appendChild(filterBar);

    // Table area
    const tableArea = el('div');
    wrapper.appendChild(tableArea);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Load and render data
    // -----------------------------------------------------------------------
    const loadData = async () => {
      try {
        const svc = getImportExportService();

        // Load summary stats
        const history = await svc.getImportHistory();

        // Render summary cards
        summaryArea.innerHTML = '';
        const summaryGrid = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-6');
        const summaryCards: { label: string; value: number; cls: string }[] = [
          { label: 'Total Imports', value: history.totalBatches, cls: 'text-[var(--text)]' },
          { label: 'Records Imported', value: history.totalImported, cls: 'text-emerald-400' },
          { label: 'Records Skipped', value: history.totalSkipped, cls: 'text-amber-400' },
          { label: 'Errors', value: history.totalErrors, cls: 'text-red-400' },
        ];
        for (const card of summaryCards) {
          const cardEl = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 text-center');
          cardEl.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', card.label));
          cardEl.appendChild(el('p', `text-2xl font-bold ${card.cls}`, String(card.value)));
          summaryGrid.appendChild(cardEl);
        }
        summaryArea.appendChild(summaryGrid);

        // Load batches with service-side filters
        const svcFilters: { status?: BatchStatus; collection?: string } = {};
        if (statusFilter) {
          svcFilters.status = statusFilter as BatchStatus;
        }
        // Format filter is client-side since service doesn't support it directly
        let batches = await svc.getBatches(Object.keys(svcFilters).length > 0 ? svcFilters : undefined);

        // Client-side filtering for format and search
        if (formatFilter) {
          batches = batches.filter(b => b.sourceFormat === formatFilter);
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          batches = batches.filter(b => (b.name || '').toLowerCase().includes(q));
        }

        // Render table
        tableArea.innerHTML = '';
        const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
        for (const col of ['Name', 'Format', 'Collection', 'Status', 'Total', 'Imported', 'Skipped', 'Errors', 'Strategy', 'Date', 'Actions']) {
          const align = ['Total', 'Imported', 'Skipped', 'Errors'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');

        if (batches.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No import history. Start by importing data from the Import Wizard.');
          td.setAttribute('colspan', '11');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const batch of batches) {
          const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          // Name (link to view)
          const tdName = el('td', 'py-2 px-3');
          const nameLink = el('a', 'text-[var(--accent)] hover:underline font-medium', batch.name || '--') as HTMLAnchorElement;
          nameLink.href = `#/import-export/import/${(batch as any).id}`;
          tdName.appendChild(nameLink);
          tr.appendChild(tdName);

          // Format badge
          const tdFormat = el('td', 'py-2 px-3');
          const formatBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]', FORMAT_LABELS[batch.sourceFormat] ?? batch.sourceFormat);
          tdFormat.appendChild(formatBadge);
          tr.appendChild(tdFormat);

          // Collection
          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono text-xs', batch.collection));

          // Status badge
          const tdStatus = el('td', 'py-2 px-3');
          const badgeCls = STATUS_BADGE[batch.status] ?? STATUS_BADGE['pending'];
          tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`, batch.status.charAt(0).toUpperCase() + batch.status.slice(1)));
          tr.appendChild(tdStatus);

          // Numeric columns
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(batch.totalRows)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', String(batch.importedRows)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', String(batch.skippedRows)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', String(batch.errorRows)));

          // Strategy
          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', batch.mergeStrategy));

          // Date
          const dateStr = batch.startedAt ? new Date(batch.startedAt).toLocaleDateString() : '--';
          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', dateStr));

          // Actions
          const tdActions = el('td', 'py-2 px-3');
          const actionWrap = el('div', 'flex gap-2');

          // Revert (only for completed)
          if (batch.status === 'completed') {
            const revertBtn = el('button', 'text-xs text-red-400 hover:text-red-300 font-medium', 'Revert');
            revertBtn.addEventListener('click', async () => {
              const confirmed = confirm(`Revert import batch "${batch.name}"? This will remove all ${batch.importedRows} imported records.`);
              if (!confirmed) return;

              try {
                const svc = getImportExportService();
                await svc.revert((batch as any).id);
                showMsg(wrapper, `Batch "${batch.name}" reverted successfully.`, false);
                loadData();
              } catch (err) {
                showMsg(wrapper, `Revert failed: ${err instanceof Error ? err.message : String(err)}`, true);
              }
            });
            actionWrap.appendChild(revertBtn);
          }

          // View link
          const viewLink = el('a', 'text-xs text-[var(--accent)] hover:underline', 'View') as HTMLAnchorElement;
          viewLink.href = `#/import-export/import/${(batch as any).id}`;
          actionWrap.appendChild(viewLink);

          // Delete (only for completed/failed/reverted)
          if (['completed', 'failed', 'reverted'].includes(batch.status)) {
            const deleteBtn = el('button', 'text-xs text-red-400 hover:text-red-300', 'Delete');
            deleteBtn.addEventListener('click', async () => {
              const confirmed = confirm(`Delete import batch "${batch.name}"? This will remove the batch record and its history.`);
              if (!confirmed) return;

              try {
                const svc = getImportExportService();
                await svc.deleteBatch((batch as any).id);
                showMsg(wrapper, `Batch "${batch.name}" deleted.`, false);
                loadData();
              } catch (err) {
                showMsg(wrapper, `Delete failed: ${err instanceof Error ? err.message : String(err)}`, true);
              }
            });
            actionWrap.appendChild(deleteBtn);
          }

          tdActions.appendChild(actionWrap);
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        tableWrap.appendChild(table);
        tableArea.appendChild(tableWrap);
      } catch (err) {
        // Show empty state if service fails
        summaryArea.innerHTML = '';
        const summaryGrid = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-6');
        const emptySummary = [
          { label: 'Total Imports', value: 0, cls: 'text-[var(--text)]' },
          { label: 'Records Imported', value: 0, cls: 'text-emerald-400' },
          { label: 'Records Skipped', value: 0, cls: 'text-amber-400' },
          { label: 'Errors', value: 0, cls: 'text-red-400' },
        ];
        for (const card of emptySummary) {
          const cardEl = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 text-center');
          cardEl.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', card.label));
          cardEl.appendChild(el('p', `text-2xl font-bold ${card.cls}`, String(card.value)));
          summaryGrid.appendChild(cardEl);
        }
        summaryArea.appendChild(summaryGrid);

        tableArea.innerHTML = '';
        const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const tbody = el('tbody');
        const tr = el('tr');
        const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No import history. Start by importing data from the Import Wizard.');
        td.setAttribute('colspan', '11');
        tr.appendChild(td);
        tbody.appendChild(tr);
        table.appendChild(tbody);
        tableWrap.appendChild(table);
        tableArea.appendChild(tableWrap);
      }
    };

    // Wire filter events
    statusSelect.addEventListener('change', () => {
      statusFilter = statusSelect.value;
      loadData();
    });
    formatSelect.addEventListener('change', () => {
      formatFilter = formatSelect.value;
      loadData();
    });
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      loadData();
    });

    // Initial load
    loadData();
  },
};
