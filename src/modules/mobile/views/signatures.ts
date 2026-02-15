/**
 * Digital Signatures view.
 * Displays digital signature records with document type, document ID, signer name, role, and signed timestamp.
 * Filterable by document type.
 */

import { getMobileService } from '../service-accessor';

const svc = () => getMobileService();

const el = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const showMsg = (c: HTMLElement, msg: string, ok = true) => {
  const d = el('div', `p-3 rounded mb-4 ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`, msg);
  c.prepend(d);
  setTimeout(() => d.remove(), 3000);
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const thCls =
      'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    const tdCls = 'px-4 py-3 text-sm text-[var(--text)]';
    const trCls = 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]';

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Digital Signatures'));
    const badge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // ---- Filter Bar ----
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const docTypeInput = el('input', inputCls) as HTMLInputElement;
    docTypeInput.type = 'text';
    docTypeInput.placeholder = 'Filter by document type...';
    bar.appendChild(docTypeInput);

    wrapper.appendChild(bar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // ---- Loading State ----
    const loading = el('div', 'flex items-center justify-center py-12');
    loading.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading signatures...'));
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // ---- Load & Render ----
    async function loadTable(): Promise<void> {
      const service = svc();
      let records = await service.listSignatures();

      const docTypeFilter = docTypeInput.value.toLowerCase().trim();
      if (docTypeFilter) {
        records = records.filter(r =>
          r.documentType.toLowerCase().includes(docTypeFilter)
        );
      }

      badge.textContent = String(records.length);
      renderTable(records);
    }

    function renderTable(records: any[]): void {
      tableContainer.innerHTML = '';

      if (records.length === 0) {
        const empty = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
        empty.appendChild(el('p', 'text-[var(--text-muted)] text-sm', 'No digital signatures found. Signature records will appear here once captured.'));
        tableContainer.appendChild(empty);
        return;
      }

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      for (const col of ['Document Type', 'Document ID', 'Signer Name', 'Role', 'Signed At', 'Job', 'Notes']) {
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      for (const row of records) {
        const tr = el('tr', trCls);

        tr.appendChild(el('td', tdCls + ' font-medium', row.documentType));
        tr.appendChild(el('td', tdCls + ' font-mono text-[var(--accent)]', row.documentId));
        tr.appendChild(el('td', tdCls, row.signerName));
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.signerRole || '--'));

        // Signed at timestamp
        const signedDate = new Date(row.signedAt);
        const formattedDate = signedDate.toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', formattedDate));

        tr.appendChild(el('td', tdCls, row.jobId || '--'));
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.notes || '--'));

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Filter Handlers ----
    docTypeInput.addEventListener('input', () => { void loadTable(); });

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadTable();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load signatures.';
        showMsg(wrapper, message, false);
      }
    })();
  },
};
