/**
 * Webhooks view.
 * Table of webhook configurations with events, retry counts, status, and toggle actions.
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
};

function fmtDateTime(iso?: string): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusCodeBadge(code?: number): HTMLElement {
  if (code === undefined || code === null) return el('span', 'text-[var(--text-muted)] text-xs', '\u2014');
  let cls: string;
  if (code >= 200 && code < 300) cls = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  else if (code >= 400 && code < 500) cls = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  else if (code >= 500) cls = 'bg-red-500/10 text-red-400 border border-red-500/20';
  else cls = 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
  return el('span', `px-2 py-0.5 rounded text-xs font-mono font-medium ${cls}`, String(code));
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Webhooks'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading webhooks...');
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    async function loadAndRender(): Promise<void> {
      try {
        const items = await svc().listWebhooks();
        countBadge.textContent = String(items.length);

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Name', 'URL', 'Events', 'Retries', 'Last Triggered', 'Last Status', 'Failures', 'Status', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No webhooks configured. Create your first webhook to get started.');
          td.setAttribute('colspan', '9');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const wh of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', wh.name));
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text-muted)] max-w-xs truncate', wh.url));

          // Events as tags
          const tdEvents = el('td', 'px-4 py-3');
          const eventWrap = el('div', 'flex flex-wrap gap-1');
          const events = wh.events.split(',').map(s => s.trim()).filter(Boolean);
          for (const ev of events) {
            eventWrap.appendChild(el('span', 'px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20', ev));
          }
          tdEvents.appendChild(eventWrap);
          tr.appendChild(tdEvents);

          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text)] font-mono', String(wh.retryCount)));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(wh.lastTriggeredAt)));

          // Last status code
          const tdLastStatus = el('td', 'px-4 py-3');
          tdLastStatus.appendChild(statusCodeBadge(wh.lastStatus));
          tr.appendChild(tdLastStatus);

          // Failure count
          const failCls = wh.failureCount > 0 ? 'px-4 py-3 font-mono text-red-400' : 'px-4 py-3 font-mono text-[var(--text-muted)]';
          tr.appendChild(el('td', failCls, String(wh.failureCount)));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3');
          const statusKey = wh.active ? 'active' : 'inactive';
          tdStatus.appendChild(el('span',
            `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[statusKey]}`,
            statusKey.charAt(0).toUpperCase() + statusKey.slice(1)));
          tr.appendChild(tdStatus);

          // Actions - toggle
          const tdActions = el('td', 'px-4 py-3');
          const toggleBtn = el('button',
            wh.active
              ? 'text-amber-400 hover:underline text-sm'
              : 'text-emerald-400 hover:underline text-sm',
            wh.active ? 'Deactivate' : 'Activate');
          toggleBtn.addEventListener('click', () => {
            void (async () => {
              try {
                await svc().toggleWebhook(wh.id, !wh.active);
                showMsg(wrapper, `Webhook "${wh.name}" ${wh.active ? 'deactivated' : 'activated'}.`, true);
                await loadAndRender();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to toggle webhook';
                showMsg(wrapper, message, false);
              }
            })();
          });
          tdActions.appendChild(toggleBtn);
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load webhooks';
        showMsg(wrapper, message, false);
      }
    }

    // Initial load
    void loadAndRender();
  },
};
