/**
 * Data Checksums view.
 * Displays data checksums with collection, record ID, checksum value,
 * calculated timestamp, and verified/mismatch status.
 */

import { getSyncService } from '../service-accessor';

const svc = () => getSyncService();

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
  setTimeout(() => msg.remove(), 3000);
}

const VERIFICATION_BADGE: Record<string, string> = {
  verified: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  mismatch: 'bg-red-500/10 text-red-400 border border-red-500/20',
  pending: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const headerLeft = el('div', 'flex items-center gap-3');
    headerLeft.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Data Checksums'));
    const countBadge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    headerLeft.appendChild(countBadge);
    headerRow.appendChild(headerLeft);
    wrapper.appendChild(headerRow);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const collectionInput = el('input', inputCls) as HTMLInputElement;
    collectionInput.type = 'text';
    collectionInput.placeholder = 'Filter by collection...';
    filterBar.appendChild(collectionInput);
    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loadingEl = el('div', 'flex items-center justify-center py-12');
    loadingEl.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading checksums...'));
    tableContainer.appendChild(loadingEl);

    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const collectionFilter = collectionInput.value.trim() || undefined;
        const items = await svc().listChecksums(collectionFilter);
        countBadge.textContent = String(items.length);

        tableContainer.innerHTML = '';
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Collection', 'Record ID', 'Checksum', 'Calculated At', 'Verified', 'Integrity']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No checksums found.');
          td.setAttribute('colspan', '6');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.collection));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.recordId));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)] font-mono text-xs', item.checksum));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', new Date(item.calculatedAt).toLocaleString()));

          // Verified badge
          const tdVerified = el('td', 'px-4 py-3 text-sm');
          const verifiedBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${item.verified ? VERIFICATION_BADGE.verified : VERIFICATION_BADGE.pending}`,
            item.verified ? 'Verified' : 'Pending');
          tdVerified.appendChild(verifiedBadge);
          tr.appendChild(tdVerified);

          // Integrity badge (mismatch)
          const tdIntegrity = el('td', 'px-4 py-3 text-sm');
          const integrityKey = item.mismatch ? 'mismatch' : 'verified';
          const integrityLabel = item.mismatch ? 'Mismatch' : 'OK';
          const integrityBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${VERIFICATION_BADGE[integrityKey]}`,
            integrityLabel);
          tdIntegrity.appendChild(integrityBadge);
          tr.appendChild(tdIntegrity);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load checksums';
        showMsg(wrapper, message, true);
      }
    }

    collectionInput.addEventListener('input', () => void loadAndRender());

    void loadAndRender();
  },
};
