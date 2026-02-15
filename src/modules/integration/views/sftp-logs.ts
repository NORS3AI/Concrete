/**
 * SFTP / Flat File Processing Logs view.
 * Table of file processing logs with file size, record counts, and status badges.
 * Filter by config and status.
 * Status badges: pending=amber, processing=blue, completed=emerald, failed=red.
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
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  processing: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

function fmtDateTime(iso?: string): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'File Processing Logs'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const configSelect = el('select', inputCls) as HTMLSelectElement;
    const defaultOpt = el('option', '', 'All Configs') as HTMLOptionElement;
    defaultOpt.value = '';
    configSelect.appendChild(defaultOpt);
    filterBar.appendChild(configSelect);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading file logs...');
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    let configsLoaded = false;

    async function loadAndRender(): Promise<void> {
      try {
        // Load configs for filter dropdown and name lookup (once)
        const configs = await svc().listFlatFileConfigs();
        if (!configsLoaded) {
          for (const cfg of configs) {
            const o = el('option', '', cfg.name) as HTMLOptionElement;
            o.value = cfg.id;
            configSelect.appendChild(o);
          }
          configsLoaded = true;
        }

        // Build name lookup
        const configNameMap = new Map<string, string>();
        for (const cfg of configs) {
          configNameMap.set(cfg.id, cfg.name);
        }

        // Get logs
        const selectedConfig = configSelect.value || undefined;
        let items = await svc().listFlatFileLogs(selectedConfig);

        // Client-side status filter
        const statusFilter = statusSelect.value;
        if (statusFilter) {
          items = items.filter(log => log.status === statusFilter);
        }

        countBadge.textContent = String(items.length);

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Config', 'File Name', 'File Size', 'Received', 'Processed', 'Imported', 'Failed', 'Status']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No file processing logs found. Logs will appear here when files are imported.');
          td.setAttribute('colspan', '8');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const log of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          // Config name
          const configName = configNameMap.get(log.configId) ?? log.configId;
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', configName));

          // File name
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text)]', log.fileName));

          // File size (formatted)
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text-muted)]', fmtFileSize(log.fileSize)));

          // Received
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(log.receivedAt)));

          // Processed
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(log.processedAt)));

          // Records imported
          const importedCls = log.recordsImported > 0 ? 'px-4 py-3 font-mono text-emerald-400' : 'px-4 py-3 font-mono text-[var(--text-muted)]';
          tr.appendChild(el('td', importedCls, log.recordsImported.toLocaleString()));

          // Records failed
          const failedCls = log.recordsFailed > 0 ? 'px-4 py-3 font-mono text-red-400' : 'px-4 py-3 font-mono text-[var(--text-muted)]';
          tr.appendChild(el('td', failedCls, log.recordsFailed.toLocaleString()));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3');
          const statusCls = STATUS_BADGE[log.status] ?? STATUS_BADGE.pending;
          tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`,
            log.status.charAt(0).toUpperCase() + log.status.slice(1)));
          tr.appendChild(tdStatus);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load file logs';
        showMsg(wrapper, message, false);
      }
    }

    // Wire up filter events
    configSelect.addEventListener('change', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());

    // Initial load
    void loadAndRender();
  },
};
