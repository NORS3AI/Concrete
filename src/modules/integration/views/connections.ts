/**
 * Connections view.
 * Integration connections with provider badges, direction, sync status, and activate/deactivate actions.
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
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  error: 'bg-red-500/10 text-red-400 border border-red-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const PROVIDER_BADGE: Record<string, string> = {
  procore: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  plangrid: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  bluebeam: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  hcss: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  raken: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  buildertrend: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  quickbooks: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  adp: 'bg-red-500/10 text-red-400 border border-red-500/20',
  paychex: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  plaid: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  zapier: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  make: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  email: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  calendar: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  sftp: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  custom: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const DIRECTION_LABEL: Record<string, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
  bidirectional: 'Bidirectional',
};

const DIRECTION_BADGE: Record<string, string> = {
  inbound: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  outbound: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  bidirectional: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

function fmtDateTime(iso?: string): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtInterval(seconds?: number): string {
  if (!seconds) return '\u2014';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Connections'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading connections...');
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    async function loadAndRender(): Promise<void> {
      try {
        const items = await svc().listIntegrations();
        countBadge.textContent = String(items.length);

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Provider', 'Name', 'Status', 'Direction', 'Last Sync', 'Sync Interval', 'Error', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No integration connections found. Configure your first connection to get started.');
          td.setAttribute('colspan', '8');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const conn of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          // Provider badge
          const tdProvider = el('td', 'px-4 py-3');
          const provCls = PROVIDER_BADGE[conn.provider] ?? PROVIDER_BADGE.custom;
          tdProvider.appendChild(el('span', `px-2 py-0.5 rounded text-xs font-medium ${provCls}`, conn.provider));
          tr.appendChild(tdProvider);

          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', conn.name));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3');
          const statusCls = STATUS_BADGE[conn.status] ?? STATUS_BADGE.pending;
          tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`,
            conn.status.charAt(0).toUpperCase() + conn.status.slice(1)));
          tr.appendChild(tdStatus);

          // Direction badge
          const tdDir = el('td', 'px-4 py-3');
          const dirCls = DIRECTION_BADGE[conn.direction] ?? DIRECTION_BADGE.inbound;
          tdDir.appendChild(el('span', `px-2 py-0.5 rounded text-xs font-medium ${dirCls}`,
            DIRECTION_LABEL[conn.direction] ?? conn.direction));
          tr.appendChild(tdDir);

          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(conn.lastSyncAt)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-[var(--text-muted)]', fmtInterval(conn.syncInterval)));

          // Error message (truncated)
          const errorText = conn.errorMessage || '\u2014';
          const tdError = el('td', 'px-4 py-3 text-xs max-w-xs truncate');
          if (conn.errorMessage) {
            tdError.className += ' text-red-400';
          } else {
            tdError.className += ' text-[var(--text-muted)]';
          }
          tdError.textContent = errorText;
          tdError.title = conn.errorMessage || '';
          tr.appendChild(tdError);

          // Actions
          const tdActions = el('td', 'px-4 py-3');
          const actionsWrap = el('div', 'flex items-center gap-3');

          if (conn.status === 'active') {
            const deactivateBtn = el('button', 'text-amber-400 hover:underline text-sm', 'Deactivate');
            deactivateBtn.addEventListener('click', () => {
              void (async () => {
                try {
                  await svc().deactivateIntegration(conn.id);
                  showMsg(wrapper, `Connection "${conn.name}" deactivated.`, true);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to deactivate';
                  showMsg(wrapper, message, false);
                }
              })();
            });
            actionsWrap.appendChild(deactivateBtn);
          } else {
            const activateBtn = el('button', 'text-emerald-400 hover:underline text-sm', 'Activate');
            activateBtn.addEventListener('click', () => {
              void (async () => {
                try {
                  await svc().activateIntegration(conn.id);
                  showMsg(wrapper, `Connection "${conn.name}" activated.`, true);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to activate';
                  showMsg(wrapper, message, false);
                }
              })();
            });
            actionsWrap.appendChild(activateBtn);
          }

          tdActions.appendChild(actionsWrap);
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load connections';
        showMsg(wrapper, message, false);
      }
    }

    // Initial load
    void loadAndRender();
  },
};
