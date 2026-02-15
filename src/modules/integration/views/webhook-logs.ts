/**
 * Webhook Logs view.
 * Delivery log table with response status badges, duration, retry tracking.
 * Filter by webhook and success/failure.
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
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function statusCodeBadge(code: number): HTMLElement {
  let cls: string;
  if (code >= 200 && code < 300) cls = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  else if (code >= 400 && code < 500) cls = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  else if (code >= 500) cls = 'bg-red-500/10 text-red-400 border border-red-500/20';
  else cls = 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
  return el('span', `px-2 py-0.5 rounded text-xs font-mono font-medium ${cls}`, String(code));
}

const SUCCESS_OPTIONS = [
  { value: '', label: 'All Results' },
  { value: 'true', label: 'Success' },
  { value: 'false', label: 'Failed' },
];

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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Webhook Logs'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const webhookSelect = el('select', inputCls) as HTMLSelectElement;
    const defaultOpt = el('option', '', 'All Webhooks') as HTMLOptionElement;
    defaultOpt.value = '';
    webhookSelect.appendChild(defaultOpt);
    filterBar.appendChild(webhookSelect);

    const successSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of SUCCESS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      successSelect.appendChild(o);
    }
    filterBar.appendChild(successSelect);

    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading webhook logs...');
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    let webhooksLoaded = false;

    async function loadAndRender(): Promise<void> {
      try {
        // Load webhook list for filter dropdown (once)
        if (!webhooksLoaded) {
          const webhooks = await svc().listWebhooks();
          for (const wh of webhooks) {
            const o = el('option', '', `${wh.name} (${wh.webhookId})`) as HTMLOptionElement;
            o.value = wh.id;
            webhookSelect.appendChild(o);
          }
          webhooksLoaded = true;
        }

        // Get logs - service method requires webhookId
        const selectedWebhook = webhookSelect.value;
        let items: Awaited<ReturnType<ReturnType<typeof svc>['getWebhookLogs']>>;

        if (selectedWebhook) {
          items = await svc().getWebhookLogs(selectedWebhook);
        } else {
          // Load all webhooks' logs
          const webhooks = await svc().listWebhooks();
          const allLogs = await Promise.all(webhooks.map(wh => svc().getWebhookLogs(wh.id)));
          items = allLogs.flat().sort((a, b) => b.sentAt.localeCompare(a.sentAt));
        }

        // Client-side success filter
        const successFilter = successSelect.value;
        if (successFilter) {
          const wantSuccess = successFilter === 'true';
          items = items.filter(log => log.success === wantSuccess);
        }

        countBadge.textContent = String(items.length);

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Webhook ID', 'Event', 'Response Status', 'Duration', 'Retry', 'Timestamp', 'Result']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No webhook logs found. Logs will appear here when webhooks are triggered.');
          td.setAttribute('colspan', '7');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const log of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text-muted)]', log.webhookId));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text)]', log.event));

          // Response status badge
          const tdStatus = el('td', 'px-4 py-3');
          tdStatus.appendChild(statusCodeBadge(log.responseStatus));
          tr.appendChild(tdStatus);

          // Duration
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-[var(--text-muted)]', `${log.duration}ms`));

          // Retry attempt
          const retryText = log.retryAttempt > 0 ? `#${log.retryAttempt}` : '\u2014';
          const retryCls = log.retryAttempt > 0 ? 'px-4 py-3 font-mono text-amber-400' : 'px-4 py-3 text-[var(--text-muted)]';
          tr.appendChild(el('td', retryCls, retryText));

          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(log.sentAt)));

          // Success flag
          const tdResult = el('td', 'px-4 py-3');
          const resultCls = log.success
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20';
          tdResult.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${resultCls}`, log.success ? 'Success' : 'Failed'));
          tr.appendChild(tdResult);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load webhook logs';
        showMsg(wrapper, message, false);
      }
    }

    // Wire up filter events
    webhookSelect.addEventListener('change', () => void loadAndRender());
    successSelect.addEventListener('change', () => void loadAndRender());

    // Initial load
    void loadAndRender();
  },
};
