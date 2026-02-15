/**
 * Field Mappings view.
 * Table of field mapping configurations between local and remote systems.
 * Filter by integration.
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Field Mappings'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const integrationSelect = el('select', inputCls) as HTMLSelectElement;
    const defaultOpt = el('option', '', 'All Integrations') as HTMLOptionElement;
    defaultOpt.value = '';
    integrationSelect.appendChild(defaultOpt);
    filterBar.appendChild(integrationSelect);

    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading mappings...');
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    let integrationsLoaded = false;

    async function loadAndRender(): Promise<void> {
      try {
        // Load integration list for filter dropdown (once)
        const integrations = await svc().listIntegrations();
        if (!integrationsLoaded) {
          for (const integ of integrations) {
            const o = el('option', '', `${integ.name} (${integ.provider})`) as HTMLOptionElement;
            o.value = integ.id;
            integrationSelect.appendChild(o);
          }
          integrationsLoaded = true;
        }

        // Build a name lookup
        const integNameMap = new Map<string, string>();
        for (const integ of integrations) {
          integNameMap.set(integ.id, integ.name);
        }

        // Get mappings
        const selectedInteg = integrationSelect.value;
        let items: Awaited<ReturnType<ReturnType<typeof svc>['listMappings']>>;

        if (selectedInteg) {
          items = await svc().listMappings(selectedInteg);
        } else {
          // Load all integrations' mappings
          const allMappings = await Promise.all(integrations.map(integ => svc().listMappings(integ.id)));
          items = allMappings.flat();
        }

        countBadge.textContent = String(items.length);

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Integration', 'Local Collection', 'Local Field', 'Remote Entity', 'Remote Field', 'Transform', 'Direction', 'Status']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No field mappings found. Add mappings to your integrations to map local and remote data fields.');
          td.setAttribute('colspan', '8');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const mapping of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          // Integration name
          const integName = integNameMap.get(mapping.integrationId) ?? mapping.integrationId;
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', integName));

          // Local collection/field
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text)]', mapping.localCollection));
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text)]', mapping.localField));

          // Remote entity/field
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text-muted)]', mapping.remoteEntity));
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text-muted)]', mapping.remoteField));

          // Transform rule
          const transformText = mapping.transformRule || '\u2014';
          const tdTransform = el('td', 'px-4 py-3 text-xs');
          if (mapping.transformRule) {
            tdTransform.appendChild(el('span', 'px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono', mapping.transformRule));
          } else {
            tdTransform.appendChild(el('span', 'text-[var(--text-muted)]', transformText));
          }
          tr.appendChild(tdTransform);

          // Direction badge
          const tdDir = el('td', 'px-4 py-3');
          const dirCls = DIRECTION_BADGE[mapping.direction] ?? DIRECTION_BADGE.inbound;
          tdDir.appendChild(el('span', `px-2 py-0.5 rounded text-xs font-medium ${dirCls}`,
            DIRECTION_LABEL[mapping.direction] ?? mapping.direction));
          tr.appendChild(tdDir);

          // Active status
          const tdStatus = el('td', 'px-4 py-3');
          const statusCls = mapping.active
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
          tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`, mapping.active ? 'Active' : 'Inactive'));
          tr.appendChild(tdStatus);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load mappings';
        showMsg(wrapper, message, false);
      }
    }

    // Wire up filter events
    integrationSelect.addEventListener('change', () => void loadAndRender());

    // Initial load
    void loadAndRender();
  },
};
