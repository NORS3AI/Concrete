/**
 * Revisions view.
 * Displays revision history for a document with the ability to add new revisions.
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
// Types
// ---------------------------------------------------------------------------

interface RevisionRow {
  id: string;
  revisionNumber: number;
  description: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Revision Table
// ---------------------------------------------------------------------------

function buildRevisionTable(revisions: RevisionRow[]): HTMLElement {
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
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdRev = el('td', 'py-2 px-3 font-mono font-bold');
    tdRev.appendChild(el('span', 'text-[var(--accent)]', `Rev ${rev.revisionNumber}`));
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

function buildAddRevisionForm(): HTMLElement {
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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    /* add revision placeholder */
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

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Revision History'));
    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Documents') as HTMLAnchorElement;
    backLink.href = '#/doc/documents';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Document info placeholder
    const docInfo = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    docInfo.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Document details will be loaded here.'));
    wrapper.appendChild(docInfo);

    const revisions: RevisionRow[] = [];
    wrapper.appendChild(buildRevisionTable(revisions));
    wrapper.appendChild(buildAddRevisionForm());

    container.appendChild(wrapper);
  },
};
