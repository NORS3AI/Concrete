/**
 * Revisions view.
 * Displays revision history for a document with the ability to add new revisions.
 * Wired to DocService for live data.
 */

import { getDocService } from '../service-accessor';

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
// Route parsing
// ---------------------------------------------------------------------------

function parseDocumentId(): string | null {
  const hash = window.location.hash; // e.g. #/doc/documents/{id}/revisions
  const match = hash.match(/#\/doc\/documents\/([^/]+)\/revisions/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RevisionRow {
  id: string;
  revisionNumber: number;
  description?: string;
  fileName?: string;
  fileSize?: number;
  uploadedBy?: string;
  uploadedAt?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Document Info Header
// ---------------------------------------------------------------------------

function buildDocHeader(doc: {
  title: string;
  category: string;
  status: string;
  revisionCount: number;
}): HTMLElement {
  const info = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');

  const row = el('div', 'flex items-center gap-3 flex-wrap');
  row.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)]', doc.title));

  // Category badge
  row.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20', CATEGORY_LABEL[doc.category] ?? doc.category));

  // Status badge
  const statusBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[doc.status] ?? STATUS_BADGE.active}`,
    doc.status.charAt(0).toUpperCase() + doc.status.slice(1));
  row.appendChild(statusBadge);

  // Revision count
  row.appendChild(el('span', 'text-sm text-[var(--text-muted)]', `${doc.revisionCount} revision${doc.revisionCount !== 1 ? 's' : ''}`));

  info.appendChild(row);
  return info;
}

// ---------------------------------------------------------------------------
// Revision Table
// ---------------------------------------------------------------------------

function buildRevisionTable(revisions: RevisionRow[], latestRevNum: number): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Rev #', 'Description', 'File Name', 'Size', 'Uploaded By', 'Date', 'Notes']) {
    const align = col === 'Size' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (revisions.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No revisions yet. Add the first revision below.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const rev of revisions) {
    const isLatest = rev.revisionNumber === latestRevNum;
    const rowCls = isLatest
      ? 'border-b border-[var(--border)] bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors'
      : 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors';
    const tr = el('tr', rowCls);

    const tdRev = el('td', 'py-2 px-3 font-mono font-bold');
    const revLabel = isLatest ? `Rev ${rev.revisionNumber} (latest)` : `Rev ${rev.revisionNumber}`;
    tdRev.appendChild(el('span', 'text-[var(--accent)]', revLabel));
    tr.appendChild(tdRev);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', rev.description || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono text-xs', rev.fileName || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-xs text-[var(--text-muted)]', rev.fileSize ? fmtBytes(rev.fileSize) : '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rev.uploadedBy || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', rev.uploadedAt || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', rev.notes || '-'));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Add Revision Form
// ---------------------------------------------------------------------------

function buildAddRevisionForm(
  documentId: string,
  wrapper: HTMLElement,
  reloadFn: () => void,
): HTMLElement {
  const form = el('form', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 space-y-3');
  form.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)]', 'Add New Revision'));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const descGroup = el('div', 'space-y-1');
  descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Description'));
  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.type = 'text';
  descInput.name = 'description';
  descInput.placeholder = 'What changed in this revision?';
  descGroup.appendChild(descInput);
  form.appendChild(descGroup);

  const row = el('div', 'grid grid-cols-2 gap-4');

  const fileGroup = el('div', 'space-y-1');
  fileGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'File Name'));
  const fileInput = el('input', inputCls) as HTMLInputElement;
  fileInput.type = 'text';
  fileInput.name = 'fileName';
  fileInput.placeholder = 'document-v2.pdf';
  fileGroup.appendChild(fileInput);
  row.appendChild(fileGroup);

  const sizeGroup = el('div', 'space-y-1');
  sizeGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'File Size (bytes)'));
  const sizeInput = el('input', inputCls) as HTMLInputElement;
  sizeInput.type = 'number';
  sizeInput.name = 'fileSize';
  sizeInput.placeholder = '0';
  sizeGroup.appendChild(sizeInput);
  row.appendChild(sizeGroup);

  form.appendChild(row);

  const uploadByGroup = el('div', 'space-y-1');
  uploadByGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Uploaded By'));
  const uploadByInput = el('input', inputCls) as HTMLInputElement;
  uploadByInput.type = 'text';
  uploadByInput.name = 'uploadedBy';
  uploadByInput.placeholder = 'User name';
  uploadByGroup.appendChild(uploadByInput);
  form.appendChild(uploadByGroup);

  const notesGroup = el('div', 'space-y-1');
  notesGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Notes'));
  const notesInput = el('textarea', inputCls) as HTMLTextAreaElement;
  notesInput.name = 'notes';
  notesInput.rows = 2;
  notesInput.placeholder = 'Additional notes about this revision';
  notesGroup.appendChild(notesInput);
  form.appendChild(notesGroup);

  const submitBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Revision');
  submitBtn.type = 'submit';
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const svc = getDocService();
      await svc.addRevision({
        documentId,
        description: descInput.value.trim() || undefined,
        fileName: fileInput.value.trim() || undefined,
        fileSize: sizeInput.value ? Number(sizeInput.value) : undefined,
        uploadedBy: uploadByInput.value.trim() || undefined,
        notes: notesInput.value.trim() || undefined,
      });

      showMsg(wrapper, 'Revision added successfully.', false);

      // Reset form fields
      descInput.value = '';
      fileInput.value = '';
      sizeInput.value = '';
      uploadByInput.value = '';
      notesInput.value = '';

      // Reload the view
      reloadFn();
    } catch (err: unknown) {
      showMsg(wrapper, `Failed to add revision: ${(err as Error).message}`, true);
    }
  });

  return form;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-6');

    const documentId = parseDocumentId();
    if (!documentId) {
      wrapper.appendChild(el('p', 'text-red-400 text-sm', 'Invalid document ID. Could not parse from URL.'));
      const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Documents') as HTMLAnchorElement;
      backLink.href = '#/doc/documents';
      wrapper.appendChild(backLink);
      container.appendChild(wrapper);
      return;
    }

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Revision History'));
    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Documents') as HTMLAnchorElement;
    backLink.href = '#/doc/documents';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Placeholders for dynamic content
    const docInfoContainer = el('div');
    const tableContainer = el('div');
    const formContainer = el('div');

    wrapper.appendChild(docInfoContainer);
    wrapper.appendChild(tableContainer);
    wrapper.appendChild(formContainer);
    container.appendChild(wrapper);

    const reload = async () => {
      try {
        const svc = getDocService();

        // Load document info
        const doc = await svc.getDocument(documentId);
        if (!doc) {
          showMsg(wrapper, 'Document not found.', true);
          return;
        }

        // Load revisions
        const revisions = await svc.getRevisions(documentId);
        const latestRevNum = revisions.length > 0 ? revisions[0].revisionNumber : 0;

        const revRows: RevisionRow[] = revisions.map((r) => ({
          id: r.id,
          revisionNumber: r.revisionNumber,
          description: r.description,
          fileName: r.fileName,
          fileSize: r.fileSize,
          uploadedBy: r.uploadedBy,
          uploadedAt: r.uploadedAt,
          notes: r.notes,
        }));

        // Render document info header
        docInfoContainer.innerHTML = '';
        docInfoContainer.appendChild(buildDocHeader({
          title: doc.title,
          category: doc.category,
          status: doc.status,
          revisionCount: revisions.length,
        }));

        // Render revision table
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildRevisionTable(revRows, latestRevNum));

        // Render add revision form
        formContainer.innerHTML = '';
        formContainer.appendChild(buildAddRevisionForm(documentId, wrapper, reload));
      } catch (err: unknown) {
        showMsg(wrapper, `Failed to load revisions: ${(err as Error).message}`, true);
      }
    };

    // Initial load
    reload();
  },
};
