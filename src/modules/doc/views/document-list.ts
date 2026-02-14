/**
 * Document List view.
 * Filterable table of documents with category, status, and search filtering.
 * Wired to DocService for live data.
 */

import { getDocService } from '../service-accessor';
import type { DocumentCategory, DocumentStatus } from '../doc-service';

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

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'contract', label: 'Contract' },
  { value: 'change_order', label: 'Change Order' },
  { value: 'rfi', label: 'RFI' },
  { value: 'submittal', label: 'Submittal' },
  { value: 'drawing', label: 'Drawing' },
  { value: 'photo', label: 'Photo' },
  { value: 'report', label: 'Report' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'permit', label: 'Permit' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  archived: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const CATEGORY_LABEL: Record<string, string> = {
  contract: 'Contract',
  change_order: 'Change Order',
  rfi: 'RFI',
  submittal: 'Submittal',
  drawing: 'Drawing',
  photo: 'Photo',
  report: 'Report',
  correspondence: 'Correspondence',
  insurance: 'Insurance',
  permit: 'Permit',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let categoryFilter = '';
let statusFilter = '';
let searchQuery = '';
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (category: string, status: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search documents...';
  searchInput.value = searchQuery;
  bar.appendChild(searchInput);

  const categorySelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of CATEGORY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    if (opt.value === categoryFilter) o.selected = true;
    categorySelect.appendChild(o);
  }
  bar.appendChild(categorySelect);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    if (opt.value === statusFilter) o.selected = true;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => {
    categoryFilter = categorySelect.value;
    statusFilter = statusSelect.value;
    searchQuery = searchInput.value;
    onFilter(categoryFilter, statusFilter, searchQuery);
  };

  categorySelect.addEventListener('change', fire);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = searchInput.value;
      onFilter(categoryFilter, statusFilter, searchQuery);
    }, 300);
  });

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

interface DocRow {
  id: string;
  title: string;
  category: string;
  description?: string;
  fileName?: string;
  fileSize?: number;
  status: string;
  jobId?: string;
  entityId?: string;
  tags?: string[];
  expirationDate?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

function isExpiredOrNear(dateStr: string | undefined): 'expired' | 'near' | '' {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(dateStr);
  if (expDate < today) return 'expired';
  const diffDays = (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) return 'near';
  return '';
}

function truncate(str: string | undefined, max: number): string {
  if (!str) return '-';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function buildTable(
  documents: DocRow[],
  wrapper: HTMLElement,
  reloadFn: () => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Title', 'Category', 'Description', 'File Name', 'Size', 'Job ID', 'Entity ID', 'Status', 'Expires', 'Uploaded By', 'Uploaded At', 'Actions']) {
    const align = col === 'Size' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (documents.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No documents found. Upload your first document to get started.');
    td.setAttribute('colspan', '12');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const doc of documents) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    // Title
    const tdTitle = el('td', 'py-2 px-3 font-medium');
    const link = el('a', 'text-[var(--accent)] hover:underline', doc.title) as HTMLAnchorElement;
    link.href = `#/doc/documents/${doc.id}`;
    tdTitle.appendChild(link);
    tr.appendChild(tdTitle);

    // Category badge
    const tdCat = el('td', 'py-2 px-3');
    tdCat.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20', CATEGORY_LABEL[doc.category] ?? doc.category));
    tr.appendChild(tdCat);

    // Description (truncated)
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', truncate(doc.description, 60)));

    // File Name
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono text-xs', doc.fileName || '-'));

    // File Size
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-xs text-[var(--text-muted)]', doc.fileSize ? fmtBytes(doc.fileSize) : '-'));

    // Job ID
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', doc.jobId || '-'));

    // Entity ID
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', doc.entityId || '-'));

    // Status badge
    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[doc.status] ?? STATUS_BADGE.active}`,
      doc.status.charAt(0).toUpperCase() + doc.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    // Expiration Date
    const expState = isExpiredOrNear(doc.expirationDate);
    const expCls = expState === 'expired'
      ? 'py-2 px-3 text-red-400 font-medium text-xs'
      : expState === 'near'
        ? 'py-2 px-3 text-red-400 text-xs'
        : 'py-2 px-3 text-[var(--text-muted)] text-xs';
    tr.appendChild(el('td', expCls, doc.expirationDate || '-'));

    // Uploaded By
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', doc.uploadedBy || '-'));

    // Uploaded At
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', doc.uploadedAt || '-'));

    // Actions
    const tdActions = el('td', 'py-2 px-3 whitespace-nowrap');

    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/doc/documents/${doc.id}`;
    tdActions.appendChild(editLink);

    const revLink = el('a', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Revisions') as HTMLAnchorElement;
    revLink.href = `#/doc/documents/${doc.id}/revisions`;
    tdActions.appendChild(revLink);

    const archiveBtn = el('button', 'text-yellow-400 hover:underline text-sm mr-2', 'Archive');
    archiveBtn.addEventListener('click', async () => {
      try {
        const svc = getDocService();
        await svc.archiveDocument(doc.id);
        showMsg(wrapper, `Document "${doc.title}" archived.`, false);
        reloadFn();
      } catch (err: unknown) {
        showMsg(wrapper, `Archive failed: ${(err as Error).message}`, true);
      }
    });
    tdActions.appendChild(archiveBtn);

    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`Delete document "${doc.title}"? This will also remove all revisions and photos.`)) return;
      try {
        const svc = getDocService();
        await svc.deleteDocument(doc.id);
        showMsg(wrapper, `Document "${doc.title}" deleted.`, false);
        reloadFn();
      } catch (err: unknown) {
        showMsg(wrapper, `Delete failed: ${(err as Error).message}`, true);
      }
    });
    tdActions.appendChild(deleteBtn);

    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportCsv(documents: DocRow[]): void {
  const headers = ['Title', 'Category', 'Description', 'File Name', 'File Size', 'Job ID', 'Entity ID', 'Status', 'Expiration Date', 'Uploaded By', 'Uploaded At', 'Tags'];
  const rows = documents.map((d) => [
    d.title,
    d.category,
    d.description ?? '',
    d.fileName ?? '',
    d.fileSize != null ? String(d.fileSize) : '',
    d.jobId ?? '',
    d.entityId ?? '',
    d.status,
    d.expirationDate ?? '',
    d.uploadedBy ?? '',
    d.uploadedAt ?? '',
    (d.tags ?? []).join('; '),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'documents-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

async function loadDocuments(): Promise<DocRow[]> {
  const svc = getDocService();
  const filters: { category?: DocumentCategory; status?: DocumentStatus } = {};
  if (categoryFilter) filters.category = categoryFilter as DocumentCategory;
  if (statusFilter) filters.status = statusFilter as DocumentStatus;

  const docs = await svc.getDocuments(filters);

  // Client-side search on title/description/fileName
  let filtered = docs;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = docs.filter((d) =>
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      (d.fileName && d.fileName.toLowerCase().includes(q))
    );
  }

  return filtered.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    description: d.description,
    fileName: d.fileName,
    fileSize: d.fileSize,
    status: d.status,
    jobId: d.jobId,
    entityId: d.entityId,
    tags: d.tags as string[] | undefined,
    expirationDate: d.expirationDate,
    uploadedBy: d.uploadedBy,
    uploadedAt: d.uploadedAt,
  }));
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Documents'));

    const btnGroup = el('div', 'flex items-center gap-2');

    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface)]', 'Export CSV');
    btnGroup.appendChild(exportBtn);

    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/doc/documents/new';
    newBtn.textContent = 'New Document';
    btnGroup.appendChild(newBtn);

    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    // Placeholder for table
    const tableContainer = el('div');
    let currentDocs: DocRow[] = [];

    const reload = async () => {
      try {
        currentDocs = await loadDocuments();
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(currentDocs, wrapper, reload));
      } catch (err: unknown) {
        showMsg(wrapper, `Failed to load documents: ${(err as Error).message}`, true);
      }
    };

    wrapper.appendChild(buildFilterBar((_category, _status, _search) => {
      reload();
    }));

    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // Export CSV handler
    exportBtn.addEventListener('click', () => {
      if (currentDocs.length === 0) {
        showMsg(wrapper, 'No documents to export.', true);
        return;
      }
      exportCsv(currentDocs);
      showMsg(wrapper, `Exported ${currentDocs.length} documents to CSV.`, false);
    });

    // Initial load
    reload();
  },
};
