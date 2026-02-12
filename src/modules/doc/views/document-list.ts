/**
 * Document List view.
 * Filterable table of documents with category, status, and job dropdowns.
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
// Types
// ---------------------------------------------------------------------------

interface DocumentRow {
  id: string;
  title: string;
  category: string;
  fileName: string;
  fileSize: number;
  status: string;
  jobId: string;
  tags: string[];
  expirationDate: string;
  uploadedBy: string;
  uploadedAt: string;
}

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
  bar.appendChild(searchInput);

  const categorySelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of CATEGORY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    categorySelect.appendChild(o);
  }
  bar.appendChild(categorySelect);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => onFilter(categorySelect.value, statusSelect.value, searchInput.value);
  categorySelect.addEventListener('change', fire);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(documents: DocumentRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Title', 'Category', 'File', 'Size', 'Status', 'Job', 'Tags', 'Expires', 'Uploaded By', 'Actions']) {
    const align = col === 'Size' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (documents.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No documents found. Upload your first document to get started.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const doc of documents) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdTitle = el('td', 'py-2 px-3 font-medium');
    const link = el('a', 'text-[var(--accent)] hover:underline', doc.title) as HTMLAnchorElement;
    link.href = `#/doc/documents/${doc.id}`;
    tdTitle.appendChild(link);
    tr.appendChild(tdTitle);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', CATEGORY_LABEL[doc.category] ?? doc.category));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono text-xs', doc.fileName || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-xs text-[var(--text-muted)]', doc.fileSize ? fmtBytes(doc.fileSize) : '-'));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[doc.status] ?? STATUS_BADGE.active}`,
      doc.status.charAt(0).toUpperCase() + doc.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', doc.jobId || '-'));

    const tdTags = el('td', 'py-2 px-3');
    if (doc.tags && doc.tags.length > 0) {
      for (const tag of doc.tags.slice(0, 3)) {
        const tagSpan = el('span', 'inline-block px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 mr-1', tag);
        tdTags.appendChild(tagSpan);
      }
      if (doc.tags.length > 3) {
        tdTags.appendChild(el('span', 'text-xs text-[var(--text-muted)]', `+${doc.tags.length - 3}`));
      }
    } else {
      tdTags.appendChild(el('span', 'text-[var(--text-muted)] text-xs', '-'));
    }
    tr.appendChild(tdTags);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', doc.expirationDate || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', doc.uploadedBy || '-'));

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/doc/documents/${doc.id}`;
    tdActions.appendChild(editLink);
    const revLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Revisions') as HTMLAnchorElement;
    revLink.href = `#/doc/documents/${doc.id}/revisions`;
    tdActions.appendChild(revLink);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Documents'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/doc/documents/new';
    newBtn.textContent = 'New Document';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_category, _status, _search) => { /* filter placeholder */ }));

    const documents: DocumentRow[] = [];
    wrapper.appendChild(buildTable(documents));

    container.appendChild(wrapper);
  },
};
