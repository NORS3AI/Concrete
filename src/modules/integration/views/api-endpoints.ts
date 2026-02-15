/**
 * API Endpoints view.
 * Filterable table of REST API endpoints with method badges, version, and rate limit info.
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

const METHOD_BADGE: Record<string, string> = {
  GET: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  POST: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  PUT: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  PATCH: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  DELETE: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'API Endpoints'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const methodSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of METHOD_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      methodSelect.appendChild(o);
    }
    filterBar.appendChild(methodSelect);

    const versionInput = el('input', inputCls) as HTMLInputElement;
    versionInput.type = 'text';
    versionInput.placeholder = 'Filter by version (e.g. v1)';
    filterBar.appendChild(versionInput);

    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading endpoints...');
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    async function loadAndRender(): Promise<void> {
      try {
        const version = versionInput.value.trim() || undefined;
        let items = await svc().listEndpoints(version);

        // Client-side method filter
        const method = methodSelect.value;
        if (method) {
          items = items.filter((ep) => ep.method === method);
        }

        countBadge.textContent = String(items.length);

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Path', 'Method', 'Description', 'Version', 'Auth', 'Rate Limit', 'Status']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No API endpoints found. Register your first endpoint to get started.');
          td.setAttribute('colspan', '7');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const ep of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 font-mono text-[var(--text)]', ep.path));

          // Method badge
          const tdMethod = el('td', 'px-4 py-3');
          const badge = el('span',
            `px-2 py-0.5 rounded text-xs font-bold ${METHOD_BADGE[ep.method] ?? METHOD_BADGE.GET}`,
            ep.method);
          tdMethod.appendChild(badge);
          tr.appendChild(tdMethod);

          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text)]', ep.description));
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-[var(--text-muted)]', ep.version));

          // Auth required
          const tdAuth = el('td', 'px-4 py-3');
          if (ep.authRequired) {
            tdAuth.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20', 'Required'));
          } else {
            tdAuth.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'No'));
          }
          tr.appendChild(tdAuth);

          // Rate limit
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] font-mono text-xs', `${ep.rateLimit}/${ep.ratePeriod}`));

          // Active status
          const tdStatus = el('td', 'px-4 py-3');
          const statusCls = ep.active
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
          tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`, ep.active ? 'Active' : 'Inactive'));
          tr.appendChild(tdStatus);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load endpoints';
        showMsg(wrapper, message, false);
      }
    }

    // Wire up filter events
    methodSelect.addEventListener('change', () => void loadAndRender());
    versionInput.addEventListener('input', () => void loadAndRender());

    // Initial load
    void loadAndRender();
  },
};
