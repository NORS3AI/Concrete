/**
 * API Keys view.
 * Table of API keys with scopes, expiration, usage tracking, and revoke action.
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
  revoked: 'bg-red-500/10 text-red-400 border border-red-500/20',
  expired: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

function getKeyStatus(key: { active: boolean; expiresAt?: string }): string {
  if (!key.active) return 'revoked';
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return 'expired';
  return 'active';
}

function fmtDate(iso?: string): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(iso?: string): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'API Keys'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading API keys...');
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    async function loadAndRender(): Promise<void> {
      try {
        const items = await svc().listAPIKeys();
        countBadge.textContent = String(items.length);

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Key ID', 'Name', 'Client ID', 'Scopes', 'Expires', 'Last Used', 'Requests', 'Status', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No API keys found. Create your first API key to get started.');
          td.setAttribute('colspan', '9');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const key of items) {
          const status = getKeyStatus(key);
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text)]', key.keyId));
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', key.name));
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text-muted)]', key.clientId));

          // Scopes as tags
          const tdScopes = el('td', 'px-4 py-3');
          const scopeWrap = el('div', 'flex flex-wrap gap-1');
          const scopes = key.scopes.split(',').map(s => s.trim()).filter(Boolean);
          for (const scope of scopes) {
            scopeWrap.appendChild(el('span', 'px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20', scope));
          }
          tdScopes.appendChild(scopeWrap);
          tr.appendChild(tdScopes);

          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDate(key.expiresAt)));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(key.lastUsedAt)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-[var(--text)]', key.requestCount.toLocaleString()));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3');
          tdStatus.appendChild(el('span',
            `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status] ?? STATUS_BADGE.active}`,
            status.charAt(0).toUpperCase() + status.slice(1)));
          tr.appendChild(tdStatus);

          // Actions
          const tdActions = el('td', 'px-4 py-3');
          if (status === 'active') {
            const revokeBtn = el('button', 'text-red-400 hover:underline text-sm', 'Revoke');
            revokeBtn.addEventListener('click', () => {
              if (!confirm(`Revoke API key "${key.name}"? This cannot be undone.`)) return;
              void (async () => {
                try {
                  await svc().revokeAPIKey(key.id);
                  showMsg(wrapper, `API key "${key.name}" revoked.`, true);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to revoke key';
                  showMsg(wrapper, message, false);
                }
              })();
            });
            tdActions.appendChild(revokeBtn);
          } else {
            tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', '\u2014'));
          }
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load API keys';
        showMsg(wrapper, message, false);
      }
    }

    // Initial load
    void loadAndRender();
  },
};
