/**
 * Drawing Log view.
 * Tracks drawings with revision history, showing current revision
 * and full revision chain for each drawing document.
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

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  archived: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

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

function buildDrawingTable(drawings: DrawingRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Title', 'File', 'Size', 'Job', 'Current Rev', 'Status', 'Uploaded By', 'Date', 'Actions']) {
    const align = col === 'Size' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (drawings.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No drawings found. Create a document with category "Drawing" to populate the drawing log.');
    td.setAttribute('colspan', '9');
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

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', drawing.uploadedBy || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', drawing.uploadedAt || '-'));

    const tdActions = el('td', 'py-2 px-3 space-x-2');
    const revLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Revisions') as HTMLAnchorElement;
    revLink.href = `#/doc/documents/${drawing.id}/revisions`;
    tdActions.appendChild(revLink);
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
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-4');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Drawing Log'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/doc/documents/new';
    newBtn.textContent = 'New Drawing';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Filter bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search drawings...';
    bar.appendChild(searchInput);

    const jobFilter = el('input', inputCls) as HTMLInputElement;
    jobFilter.type = 'text';
    jobFilter.placeholder = 'Filter by job...';
    bar.appendChild(jobFilter);

    const statusFilter = el('select', inputCls) as HTMLSelectElement;
    const statusOpts = [
      { value: '', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'archived', label: 'Archived' },
    ];
    for (const opt of statusOpts) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusFilter.appendChild(o);
    }
    bar.appendChild(statusFilter);

    wrapper.appendChild(bar);

    const drawings: DrawingRow[] = [];
    wrapper.appendChild(buildDrawingTable(drawings));

    container.appendChild(wrapper);
  },
};
