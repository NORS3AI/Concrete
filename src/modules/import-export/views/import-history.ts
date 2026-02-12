/**
 * Import History view.
 * Displays past import batches with status, row counts, and revert option.
 * Includes summary statistics across all imports.
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

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  validating: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  preview: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BatchRow {
  id: string;
  name: string;
  sourceFormat: string;
  collection: string;
  status: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errorRows: number;
  mergeStrategy: string;
  startedAt: string;
  completedAt: string;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(summary: {
  totalBatches: number;
  totalImported: number;
  totalSkipped: number;
  totalErrors: number;
}): HTMLElement {
  const grid = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-6');

  const cards: { label: string; value: number; cls: string }[] = [
    { label: 'Total Imports', value: summary.totalBatches, cls: 'text-[var(--text)]' },
    { label: 'Records Imported', value: summary.totalImported, cls: 'text-emerald-400' },
    { label: 'Records Skipped', value: summary.totalSkipped, cls: 'text-amber-400' },
    { label: 'Errors', value: summary.totalErrors, cls: 'text-red-400' },
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
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, format: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search by batch name...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  const statusOptions = [
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
  bar.appendChild(statusSelect);

  const formatSelect = el('select', inputCls) as HTMLSelectElement;
  const formatOptions = [
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
  bar.appendChild(formatSelect);

  const fire = () => onFilter(statusSelect.value, formatSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  formatSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// History Table
// ---------------------------------------------------------------------------

function buildHistoryTable(batches: BatchRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
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

    const tdName = el('td', 'py-2 px-3');
    const nameLink = el('a', 'text-[var(--accent)] hover:underline font-medium', batch.name) as HTMLAnchorElement;
    nameLink.href = `#/import-export/import/${batch.id}`;
    tdName.appendChild(nameLink);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', FORMAT_LABELS[batch.sourceFormat] ?? batch.sourceFormat));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono text-xs', batch.collection));

    const tdStatus = el('td', 'py-2 px-3');
    const badgeCls = STATUS_BADGE[batch.status] ?? STATUS_BADGE['pending'];
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`, batch.status.charAt(0).toUpperCase() + batch.status.slice(1)));
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(batch.totalRows)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', String(batch.importedRows)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', String(batch.skippedRows)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', String(batch.errorRows)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', batch.mergeStrategy));

    const dateStr = batch.startedAt ? new Date(batch.startedAt).toLocaleDateString() : '--';
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', dateStr));

    const tdActions = el('td', 'py-2 px-3');
    const actionWrap = el('div', 'flex gap-2');

    if (batch.status === 'completed') {
      const revertBtn = el('button', 'text-xs text-red-400 hover:text-red-300 font-medium', 'Revert');
      actionWrap.appendChild(revertBtn);
    }

    const viewLink = el('a', 'text-xs text-[var(--accent)] hover:underline', 'View') as HTMLAnchorElement;
    viewLink.href = `#/import-export/import/${batch.id}`;
    actionWrap.appendChild(viewLink);

    if (['completed', 'failed', 'reverted'].includes(batch.status)) {
      const deleteBtn = el('button', 'text-xs text-red-400 hover:text-red-300', 'Delete');
      actionWrap.appendChild(deleteBtn);
    }

    tdActions.appendChild(actionWrap);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Import History'));
    const newImportLink = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newImportLink.href = '#/import-export/import';
    newImportLink.textContent = 'New Import';
    headerRow.appendChild(newImportLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards({
      totalBatches: 0,
      totalImported: 0,
      totalSkipped: 0,
      totalErrors: 0,
    }));

    wrapper.appendChild(buildFilterBar((_status, _format, _search) => { /* filter placeholder */ }));

    const batches: BatchRow[] = [];
    wrapper.appendChild(buildHistoryTable(batches));

    container.appendChild(wrapper);
  },
};
