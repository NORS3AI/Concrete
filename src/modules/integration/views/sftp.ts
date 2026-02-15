/**
 * SFTP / Flat File Configurations view.
 * Table of flat file import configurations with protocol, host, schedule, and processing stats.
 */

import { getIntegrationService } from '../service-accessor';

const svc = () => getIntegrationService();

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

function showMsg(container: HTMLElement, text: string, ok = true): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = ok
    ? 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDateTime(iso?: string): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const PROTOCOL_BADGE: Record<string, string> = {
  sftp: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  ftp: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  s3: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'SFTP / Flat File'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading configurations...');
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    async function loadAndRender(): Promise<void> {
      try {
        const items = await svc().listFlatFileConfigs();
        countBadge.textContent = String(items.length);

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Name', 'Protocol', 'Host:Port', 'Path', 'Pattern', 'Data Type', 'Schedule', 'Last Processed', 'Files', 'Status']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No SFTP/flat file configurations found. Configure your first file import source to get started.');
          td.setAttribute('colspan', '10');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const cfg of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', cfg.name));

          // Protocol badge
          const tdProto = el('td', 'px-4 py-3');
          const protoCls = PROTOCOL_BADGE[cfg.protocol] ?? PROTOCOL_BADGE.sftp;
          tdProto.appendChild(el('span', `px-2 py-0.5 rounded text-xs font-medium uppercase ${protoCls}`, cfg.protocol));
          tr.appendChild(tdProto);

          // Host:Port
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text)]', `${cfg.host}:${cfg.port}`));

          // Path
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text-muted)] max-w-xs truncate', cfg.path));

          // File pattern
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text-muted)]', cfg.filePattern));

          // Data type
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text)]', cfg.dataType));

          // Schedule
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', cfg.schedule || '\u2014'));

          // Last processed
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(cfg.lastProcessedAt)));

          // Files processed count
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-[var(--text)]', cfg.filesProcessed.toLocaleString()));

          // Active status
          const tdStatus = el('td', 'px-4 py-3');
          const statusCls = cfg.active
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
          tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`, cfg.active ? 'Active' : 'Inactive'));
          tr.appendChild(tdStatus);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load configurations';
        showMsg(wrapper, message, false);
      }
    }

    // Initial load
    void loadAndRender();
  },
};
