/**
 * WebSocket Connections view.
 * Displays WebSocket connections with connection ID, user, device,
 * timestamps, status, and latency. Status badges color-coded.
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

const STATUS_BADGE: Record<string, string> = {
  connected: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  disconnected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  reconnecting: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const headerLeft = el('div', 'flex items-center gap-3');
    headerLeft.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'WebSocket Connections'));
    const countBadge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    headerLeft.appendChild(countBadge);
    headerRow.appendChild(headerLeft);
    wrapper.appendChild(headerRow);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loadingEl = el('div', 'flex items-center justify-center py-12');
    loadingEl.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading connections...'));
    tableContainer.appendChild(loadingEl);

    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const items = await svc().listConnections();
        countBadge.textContent = String(items.length);

        tableContainer.innerHTML = '';
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Connection ID', 'User', 'Device', 'Connected At', 'Disconnected At', 'Status', 'Last Ping', 'Latency (ms)', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No WebSocket connections found.');
          td.setAttribute('colspan', '9');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.connectionId));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.userId));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.deviceId));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', new Date(item.connectedAt).toLocaleString()));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.disconnectedAt ? new Date(item.disconnectedAt).toLocaleString() : '-'));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const statusBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] ?? STATUS_BADGE.disconnected}`,
            STATUS_LABEL[item.status] ?? item.status);
          tdStatus.appendChild(statusBadge);
          tr.appendChild(tdStatus);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.lastPingAt ? new Date(item.lastPingAt).toLocaleString() : '-'));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.latencyMs != null ? String(item.latencyMs) : '-'));

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          if (item.status === 'connected') {
            const disconnectBtn = el('button', 'text-red-400 hover:underline text-sm', 'Disconnect');
            disconnectBtn.addEventListener('click', () => {
              void (async () => {
                try {
                  await svc().disconnectConnection(item.id);
                  showMsg(wrapper, `Connection ${item.connectionId} disconnected.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to disconnect';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            tdActions.appendChild(disconnectBtn);
          } else {
            tdActions.appendChild(el('span', 'text-[var(--text-muted)]', '-'));
          }
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load connections';
        showMsg(wrapper, message, true);
      }
    }

    void loadAndRender();
  },
};
