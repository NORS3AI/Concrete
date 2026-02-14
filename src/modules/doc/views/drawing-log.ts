/**
 * Drawing Log view.
 * Tracks drawings with revision history, showing current revision
 * and full revision chain for each drawing document.
 */

import { getDocService } from '../service-accessor';
import type { DocumentStatus, DocumentCategory } from '../doc-service';

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

function fmtBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  archived: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'expired', label: 'Expired' },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let jobFilter = '';
let statusFilter: DocumentStatus | '' = '';
let searchQuery = '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DrawingRow {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  jobId: string;
  status: string;
  latestRevision: number;
  uploadedBy: string;
  uploadedAt: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Drawing Table
// ---------------------------------------------------------------------------

function buildDrawingTable(
  drawings: DrawingRow[],
  onAddRevision: (drawingId: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Title', 'File', 'Size', 'Job', 'Current Rev', 'Status', 'Actions']) {
    const align = col === 'Size' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (drawings.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No drawings found. Create a new drawing to populate the drawing log.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const drawing of drawings) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdTitle = el('td', 'py-2 px-3 font-medium');
    const link = el('a', 'text-[var(--accent)] hover:underline', drawing.title) as HTMLAnchorElement;
    link.href = `#/doc/documents/${drawing.id}`;
    tdTitle.appendChild(link);
    tr.appendChild(tdTitle);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono text-xs', drawing.fileName || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-xs text-[var(--text-muted)]', drawing.fileSize ? fmtBytes(drawing.fileSize) : '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', drawing.jobId || '-'));

    const tdRev = el('td', 'py-2 px-3');
    if (drawing.latestRevision > 0) {
      tdRev.appendChild(el('span', 'font-mono font-bold text-[var(--accent)]', `Rev ${drawing.latestRevision}`));
    } else {
      tdRev.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'Original'));
    }
    tr.appendChild(tdRev);

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[drawing.status] ?? STATUS_BADGE.active}`,
      drawing.status.charAt(0).toUpperCase() + drawing.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3 space-x-2');
    const revLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Revisions') as HTMLAnchorElement;
    revLink.href = `#/doc/documents/${drawing.id}/revisions`;
    tdActions.appendChild(revLink);

    const addRevBtn = el('button', 'text-blue-400 hover:underline text-sm', 'Add Revision');
    addRevBtn.addEventListener('click', () => onAddRevision(drawing.id));
    tdActions.appendChild(addRevBtn);

    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/doc/documents/${drawing.id}`;
    tdActions.appendChild(editLink);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// New Drawing Dialog
// ---------------------------------------------------------------------------

function promptNewDrawing(container: HTMLElement, onCreated: () => void): void {
  // Build an inline form overlay
  const overlay = el('div', 'fixed inset-0 bg-black/50 flex items-center justify-center z-50');
  const dialog = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 w-full max-w-md space-y-4');

  dialog.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)]', 'New Drawing'));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const titleGroup = el('div', 'space-y-1');
  titleGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Title'));
  const titleInput = el('input', inputCls) as HTMLInputElement;
  titleInput.type = 'text';
  titleInput.placeholder = 'Drawing title';
  titleInput.required = true;
  titleGroup.appendChild(titleInput);
  dialog.appendChild(titleGroup);

  const jobGroup = el('div', 'space-y-1');
  jobGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Job ID'));
  const jobInput = el('input', inputCls) as HTMLInputElement;
  jobInput.type = 'text';
  jobInput.placeholder = 'Job reference';
  jobGroup.appendChild(jobInput);
  dialog.appendChild(jobGroup);

  const fileGroup = el('div', 'space-y-1');
  fileGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'File Name'));
  const fileInput = el('input', inputCls) as HTMLInputElement;
  fileInput.type = 'text';
  fileInput.placeholder = 'drawing.dwg';
  fileGroup.appendChild(fileInput);
  dialog.appendChild(fileGroup);

  const btnRow = el('div', 'flex justify-end gap-3');
  const cancelBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:opacity-90', 'Cancel');
  cancelBtn.addEventListener('click', () => overlay.remove());
  btnRow.appendChild(cancelBtn);

  const createBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create');
  createBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    if (!title) {
      showMsg(container, 'Title is required.', true);
      return;
    }
    try {
      const svc = getDocService();
      await svc.createDocument({
        title,
        category: 'drawing' as DocumentCategory,
        jobId: jobInput.value.trim() || undefined,
        fileName: fileInput.value.trim() || undefined,
      });
      overlay.remove();
      showMsg(container, `Drawing "${title}" created successfully.`, false);
      onCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create drawing.';
      showMsg(container, message, true);
    }
  });
  btnRow.appendChild(createBtn);
  dialog.appendChild(btnRow);

  overlay.appendChild(dialog);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

// ---------------------------------------------------------------------------
// Add Revision Dialog
// ---------------------------------------------------------------------------

function promptAddRevision(container: HTMLElement, drawingId: string, onAdded: () => void): void {
  const overlay = el('div', 'fixed inset-0 bg-black/50 flex items-center justify-center z-50');
  const dialog = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 w-full max-w-md space-y-4');

  dialog.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)]', 'Add Revision'));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const descGroup = el('div', 'space-y-1');
  descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Description'));
  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.type = 'text';
  descInput.placeholder = 'Revision description';
  descGroup.appendChild(descInput);
  dialog.appendChild(descGroup);

  const fileGroup = el('div', 'space-y-1');
  fileGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'File Name'));
  const fileInput = el('input', inputCls) as HTMLInputElement;
  fileInput.type = 'text';
  fileInput.placeholder = 'revised-drawing.dwg';
  fileGroup.appendChild(fileInput);
  dialog.appendChild(fileGroup);

  const btnRow = el('div', 'flex justify-end gap-3');
  const cancelBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:opacity-90', 'Cancel');
  cancelBtn.addEventListener('click', () => overlay.remove());
  btnRow.appendChild(cancelBtn);

  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Revision');
  addBtn.addEventListener('click', async () => {
    try {
      const svc = getDocService();
      await svc.addRevision({
        documentId: drawingId,
        description: descInput.value.trim() || undefined,
        fileName: fileInput.value.trim() || undefined,
      });
      overlay.remove();
      showMsg(container, 'Revision added successfully.', false);
      onAdded();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add revision.';
      showMsg(container, message, true);
    }
  });
  btnRow.appendChild(addBtn);
  dialog.appendChild(btnRow);

  overlay.appendChild(dialog);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

// ---------------------------------------------------------------------------
// Export CSV
// ---------------------------------------------------------------------------

function exportCsv(drawings: DrawingRow[]): void {
  const headers = ['Title', 'File Name', 'File Size', 'Job ID', 'Current Rev', 'Status'];
  const rows = drawings.map((d) => [
    d.title,
    d.fileName,
    d.fileSize ? fmtBytes(d.fileSize) : '',
    d.jobId,
    d.latestRevision > 0 ? `Rev ${d.latestRevision}` : 'Original',
    d.status,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'drawing-log.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-4');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Drawing Log'));

    const btnGroup = el('div', 'flex items-center gap-3');

    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text)] hover:opacity-90', 'Export CSV');
    btnGroup.appendChild(exportBtn);

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Drawing');
    btnGroup.appendChild(newBtn);

    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    // Filter bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search drawings...';
    searchInput.value = searchQuery;
    bar.appendChild(searchInput);

    const jobFilterInput = el('input', inputCls) as HTMLInputElement;
    jobFilterInput.type = 'text';
    jobFilterInput.placeholder = 'Filter by job...';
    jobFilterInput.value = jobFilter;
    bar.appendChild(jobFilterInput);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      if (opt.value === statusFilter) o.selected = true;
      statusSelect.appendChild(o);
    }
    bar.appendChild(statusSelect);

    wrapper.appendChild(bar);

    // Table placeholder
    const tableArea = el('div');
    wrapper.appendChild(tableArea);

    container.appendChild(wrapper);

    // -- Data loading and rendering --
    let currentData: DrawingRow[] = [];

    const loadData = async () => {
      try {
        const svc = getDocService();
        const filters: { jobId?: string; status?: DocumentStatus } = {};
        if (jobFilter) filters.jobId = jobFilter;
        if (statusFilter) filters.status = statusFilter as DocumentStatus;

        const drawings = await svc.getDrawingLog(filters);

        // For each drawing, fetch revision info to get latest revision number
        const rows: DrawingRow[] = [];
        for (const drawing of drawings) {
          // Client-side search on title
          if (searchQuery && !drawing.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            continue;
          }

          let latestRevision = 0;
          const revInfo = await svc.getDrawingWithRevisions(drawing.id);
          if (revInfo && revInfo.revisions.length > 0) {
            latestRevision = revInfo.revisions[0].revisionNumber;
          }

          rows.push({
            id: drawing.id,
            title: drawing.title,
            fileName: drawing.fileName ?? '',
            fileSize: drawing.fileSize ?? 0,
            jobId: drawing.jobId ?? '',
            status: drawing.status,
            latestRevision,
            uploadedBy: drawing.uploadedBy ?? '',
            uploadedAt: drawing.uploadedAt ?? '',
            tags: (drawing.tags as string[]) ?? [],
          });
        }

        currentData = rows;
        renderTable();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load drawings.';
        showMsg(container, message, true);
      }
    };

    const renderTable = () => {
      tableArea.innerHTML = '';
      tableArea.appendChild(buildDrawingTable(
        currentData,
        (drawingId) => {
          promptAddRevision(container, drawingId, () => loadData());
        },
      ));
    };

    // New drawing button
    newBtn.addEventListener('click', () => {
      promptNewDrawing(container, () => loadData());
    });

    // Export CSV
    exportBtn.addEventListener('click', () => {
      exportCsv(currentData);
    });

    // Filter handlers
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim();
      loadData();
    });

    jobFilterInput.addEventListener('input', () => {
      jobFilter = jobFilterInput.value.trim();
      loadData();
    });

    statusSelect.addEventListener('change', () => {
      statusFilter = statusSelect.value as DocumentStatus | '';
      loadData();
    });

    // Initial load
    loadData();
  },
};
