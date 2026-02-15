/**
 * Sync Logs view.
 * Table of sync operation logs with status badges, record counts, and filtering.
 * Filter by provider and status.
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
  running: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const DIRECTION_BADGE: Record<string, string> = {
  inbound: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  outbound: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  bidirectional: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

const DIRECTION_LABEL: Record<string, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
  bidirectional: 'Bidirectional',
};

const PROVIDER_OPTIONS = [
  { value: '', label: 'All Providers' },
  { value: 'procore', label: 'Procore' },
  { value: 'plangrid', label: 'PlanGrid' },
  { value: 'bluebeam', label: 'Bluebeam' },
  { value: 'hcss', label: 'HCSS' },
  { value: 'raken', label: 'Raken' },
  { value: 'buildertrend', label: 'Buildertrend' },
  { value: 'quickbooks', label: 'QuickBooks' },
  { value: 'adp', label: 'ADP' },
  { value: 'paychex', label: 'Paychex' },
  { value: 'plaid', label: 'Plaid' },
  { value: 'zapier', label: 'Zapier' },
  { value: 'make', label: 'Make' },
  { value: 'email', label: 'Email' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'sftp', label: 'SFTP' },
  { value: 'custom', label: 'Custom' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

function fmtDateTime(iso?: string): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Sync Logs'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const providerSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of PROVIDER_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      providerSelect.appendChild(o);
    }
    filterBar.appendChild(providerSelect);

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
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading sync logs...');
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    async function loadAndRender(): Promise<void> {
      try {
        let items = await svc().listSyncLogs();

        // Client-side filters
        const provFilter = providerSelect.value;
        if (provFilter) {
          items = items.filter(log => log.provider === provFilter);
        }

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
        for (const col of ['Integration ID', 'Provider', 'Direction', 'Started', 'Completed', 'Synced', 'Failed', 'Status']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No sync logs found. Logs will appear here when integrations are synced.');
          td.setAttribute('colspan', '8');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const log of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text-muted)]', log.integrationId));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text)]', log.provider));

          // Direction badge
          const tdDir = el('td', 'px-4 py-3');
          const dirCls = DIRECTION_BADGE[log.direction] ?? DIRECTION_BADGE.inbound;
          tdDir.appendChild(el('span', `px-2 py-0.5 rounded text-xs font-medium ${dirCls}`,
            DIRECTION_LABEL[log.direction] ?? log.direction));
          tr.appendChild(tdDir);

          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(log.startedAt)));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(log.completedAt)));

          // Records synced
          const syncedCls = log.recordsSynced > 0 ? 'px-4 py-3 font-mono text-emerald-400' : 'px-4 py-3 font-mono text-[var(--text-muted)]';
          tr.appendChild(el('td', syncedCls, log.recordsSynced.toLocaleString()));

          // Records failed
          const failedCls = log.recordsFailed > 0 ? 'px-4 py-3 font-mono text-red-400' : 'px-4 py-3 font-mono text-[var(--text-muted)]';
          tr.appendChild(el('td', failedCls, log.recordsFailed.toLocaleString()));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3');
          const statusCls = STATUS_BADGE[log.status] ?? STATUS_BADGE.running;
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
        const message = err instanceof Error ? err.message : 'Failed to load sync logs';
        showMsg(wrapper, message, false);
      }
    }

    // Wire up filter events
    providerSelect.addEventListener('change', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());

    // Initial load
    void loadAndRender();
  },
};
