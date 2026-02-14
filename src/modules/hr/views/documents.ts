/**
 * Employee Documents view.
 * Allows loading documents by employee ID, viewing document metadata,
 * uploading new documents, and deleting existing ones.
 * Wired to HRService for live data.
 */

import { getHRService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(
  tag: string,
  attrs?: Record<string, string>,
  ...children: (string | HTMLElement)[]
): HTMLElement {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') node.className = v;
      else node.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

function showMsg(
  container: HTMLElement,
  msg: string,
  type: 'success' | 'error' = 'success',
): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls =
    type === 'error'
      ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
      : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const toast = el('div', { className: cls, 'data-msg': '1' }, msg);
  container.prepend(toast);
  setTimeout(() => toast.remove(), 3000);
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS = [
  { value: 'tax', label: 'Tax' },
  { value: 'identification', label: 'Identification' },
  { value: 'certification', label: 'Certification' },
  { value: 'performance', label: 'Performance' },
  { value: 'disciplinary', label: 'Disciplinary' },
  { value: 'contract', label: 'Contract' },
  { value: 'benefits', label: 'Benefits' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_BADGE: Record<string, string> = {
  tax: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  identification: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  certification: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  performance: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  disciplinary: 'bg-red-500/10 text-red-400 border border-red-500/20',
  contract: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  benefits: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  other: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const CATEGORY_LABELS: Record<string, string> = {
  tax: 'Tax',
  identification: 'Identification',
  certification: 'Certification',
  performance: 'Performance',
  disciplinary: 'Disciplinary',
  contract: 'Contract',
  benefits: 'Benefits',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', { className: 'space-y-0' });

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnPrimary =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';
    const btnDanger =
      'px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:opacity-90';

    // ---- Header ----
    const headerRow = el('div', { className: 'flex items-center justify-between mb-4' });
    headerRow.appendChild(
      el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Employee Documents'),
    );
    wrapper.appendChild(headerRow);

    // ---- Employee ID Input Bar ----
    const lookupBar = el('div', {
      className: 'flex items-center gap-3 mb-6 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4',
    });
    lookupBar.appendChild(
      el('label', { className: 'text-sm font-medium text-[var(--text)]' }, 'Employee ID:'),
    );
    const empIdInput = el('input', {
      className: inputCls + ' flex-1',
      type: 'text',
      placeholder: 'Enter Employee ID',
    }) as HTMLInputElement;
    lookupBar.appendChild(empIdInput);
    const loadBtn = el('button', { className: btnPrimary, type: 'button' }, 'Load');
    lookupBar.appendChild(loadBtn);
    wrapper.appendChild(lookupBar);

    // ---- Document Action Bar (hidden until loaded) ----
    const actionBar = el('div', { className: 'flex items-center justify-between mb-4 hidden' });
    const empLabel = el('div', { className: 'text-sm text-[var(--text-muted)]' });
    actionBar.appendChild(empLabel);
    const uploadBtn = el('button', { className: btnPrimary, type: 'button' }, 'Upload Document');
    actionBar.appendChild(uploadBtn);
    wrapper.appendChild(actionBar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // ---- Initial Placeholder ----
    const placeholder = el('div', {
      className: 'py-12 text-center text-[var(--text-muted)] bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg',
    }, 'Enter an Employee ID to view documents.');
    tableContainer.appendChild(placeholder);

    container.appendChild(wrapper);

    // ---- State ----
    let currentEmployeeId = '';

    // ---- Build Table ----
    function buildTable(
      documents: Array<{
        id: string;
        name: string;
        category: string;
        uploadDate: string;
        fileType: string;
        fileSize: number;
        description: string;
        expirationDate: string;
      }>,
    ): HTMLElement {
      const wrap = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
      });
      const table = el('table', { className: 'w-full text-sm' });

      const thead = el('thead');
      const headRow = el('tr', {
        className: 'text-left text-[var(--text-muted)] border-b border-[var(--border)]',
      });
      for (const col of ['Name', 'Category', 'Upload Date', 'File Type', 'Size', 'Description', 'Expiration', 'Actions']) {
        headRow.appendChild(el('th', { className: 'py-2 px-3 font-medium' }, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');

      if (documents.length === 0) {
        const tr = el('tr');
        const td = el('td', {
          className: 'py-8 px-3 text-center text-[var(--text-muted)]',
          colspan: '8',
        }, 'No documents found for this employee.');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const doc of documents) {
        const tr = el('tr', {
          className: 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
        });

        tr.appendChild(
          el('td', { className: 'py-2 px-3 font-medium text-[var(--text)]' }, doc.name),
        );

        // Category badge
        const tdCategory = el('td', { className: 'py-2 px-3' });
        const badgeCls = CATEGORY_BADGE[doc.category] ?? CATEGORY_BADGE.other;
        tdCategory.appendChild(
          el('span', { className: `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}` },
            CATEGORY_LABELS[doc.category] ?? doc.category),
        );
        tr.appendChild(tdCategory);

        tr.appendChild(
          el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, doc.uploadDate || '-'),
        );
        tr.appendChild(
          el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, doc.fileType || '-'),
        );
        tr.appendChild(
          el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, formatFileSize(doc.fileSize)),
        );
        tr.appendChild(
          el('td', { className: 'py-2 px-3 text-[var(--text-muted)] max-w-xs truncate' }, doc.description || '-'),
        );
        tr.appendChild(
          el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, doc.expirationDate || '-'),
        );

        // Actions
        const tdActions = el('td', { className: 'py-2 px-3' });
        const deleteBtn = el('button', { className: btnDanger, type: 'button' }, 'Delete');
        deleteBtn.addEventListener('click', () => void handleDelete(doc.id, doc.name));
        tdActions.appendChild(deleteBtn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      return wrap;
    }

    // ---- Actions ----

    async function handleDelete(docId: string, docName: string): Promise<void> {
      const confirmed = prompt(`Type "DELETE" to confirm deleting "${docName}":`);
      if (confirmed !== 'DELETE') return;
      try {
        const svc = getHRService();
        await svc.deleteDocument(docId);
        showMsg(wrapper, `Document "${docName}" deleted.`, 'success');
        await loadDocuments();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete document.';
        showMsg(wrapper, message, 'error');
      }
    }

    uploadBtn.addEventListener('click', () => {
      if (!currentEmployeeId) {
        showMsg(wrapper, 'No employee loaded. Enter an Employee ID first.', 'error');
        return;
      }

      const name = prompt('Document name:');
      if (!name) return;

      const categoryInput = prompt(
        'Category (tax, identification, certification, performance, disciplinary, contract, benefits, other):',
      );
      if (!categoryInput) return;
      const validCategories = ['tax', 'identification', 'certification', 'performance', 'disciplinary', 'contract', 'benefits', 'other'];
      const category = categoryInput.toLowerCase().trim();
      if (!validCategories.includes(category)) {
        showMsg(wrapper, 'Invalid category. Must be one of: ' + validCategories.join(', '), 'error');
        return;
      }

      const fileType = prompt('File type (e.g. pdf, docx, jpg):') ?? '';
      const description = prompt('Description:') ?? '';
      const expirationDate = prompt('Expiration date (YYYY-MM-DD, or leave blank):') ?? '';

      void (async () => {
        try {
          const svc = getHRService();
          await svc.addDocument({
            employeeId: currentEmployeeId,
            name,
            category: category as any,
            fileType,
            description,
            expirationDate: expirationDate || undefined,
          });
          showMsg(wrapper, `Document "${name}" uploaded successfully.`, 'success');
          await loadDocuments();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to upload document.';
          showMsg(wrapper, message, 'error');
        }
      })();
    });

    // ---- Data Loading ----

    async function loadDocuments(): Promise<void> {
      if (!currentEmployeeId) return;

      tableContainer.innerHTML = '';
      tableContainer.appendChild(
        el('div', { className: 'py-12 text-center text-[var(--text-muted)]' }, 'Loading documents...'),
      );

      try {
        const svc = getHRService();
        const documents = await svc.getDocumentsByEmployee(currentEmployeeId);

        const rows = documents.map((d) => ({
          id: (d as any).id as string,
          name: d.name,
          category: d.category,
          uploadDate: d.uploadDate ?? '',
          fileType: d.fileType ?? '',
          fileSize: d.fileSize ?? 0,
          description: d.description ?? '',
          expirationDate: d.expirationDate ?? '',
        }));

        // Show action bar
        actionBar.classList.remove('hidden');
        empLabel.textContent = `Documents for Employee: ${currentEmployeeId} (${rows.length} total)`;

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(rows));
      } catch (err: unknown) {
        tableContainer.innerHTML = '';
        const message = err instanceof Error ? err.message : 'Failed to load documents.';
        showMsg(wrapper, message, 'error');
      }
    }

    // ---- Load Button Handler ----
    function handleLoad(): void {
      const empId = empIdInput.value.trim();
      if (!empId) {
        showMsg(wrapper, 'Please enter an Employee ID.', 'error');
        return;
      }
      currentEmployeeId = empId;
      void loadDocuments();
    }

    loadBtn.addEventListener('click', handleLoad);
    empIdInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleLoad();
    });
  },
};
