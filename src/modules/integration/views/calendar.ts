/**
 * Calendar Events view.
 * Table of calendar events with project, milestone, provider, and sync status.
 * Filter by project and calendar provider.
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

const PROVIDER_BADGE: Record<string, string> = {
  google: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  outlook: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  ical: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  outlook: 'Outlook',
  ical: 'iCal',
};

const PROVIDER_OPTIONS = [
  { value: '', label: 'All Providers' },
  { value: 'google', label: 'Google Calendar' },
  { value: 'outlook', label: 'Outlook' },
  { value: 'ical', label: 'iCal' },
];

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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Calendar Events'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const projectSelect = el('select', inputCls) as HTMLSelectElement;
    const defaultProjOpt = el('option', '', 'All Projects') as HTMLOptionElement;
    defaultProjOpt.value = '';
    projectSelect.appendChild(defaultProjOpt);
    filterBar.appendChild(projectSelect);

    const providerSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of PROVIDER_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      providerSelect.appendChild(o);
    }
    filterBar.appendChild(providerSelect);

    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading calendar events...');
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    let projectsLoaded = false;

    async function loadAndRender(): Promise<void> {
      try {
        const selectedProject = projectSelect.value || undefined;
        let items = await svc().listCalendarEvents(selectedProject);

        // Populate project filter (once)
        if (!projectsLoaded) {
          const projects = new Map<string, string>();
          for (const ev of items) {
            if (ev.projectId && ev.projectName) {
              projects.set(ev.projectId, ev.projectName);
            }
          }
          for (const [id, name] of projects) {
            const o = el('option', '', name) as HTMLOptionElement;
            o.value = id;
            projectSelect.appendChild(o);
          }
          projectsLoaded = true;
        }

        // Client-side provider filter
        const provFilter = providerSelect.value;
        if (provFilter) {
          items = items.filter(ev => ev.calendarProvider === provFilter);
        }

        countBadge.textContent = String(items.length);

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Title', 'Start', 'End', 'All Day', 'Project', 'Milestone', 'Provider', 'Synced', 'Last Sync']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No calendar events found. Create events or sync with an external calendar provider.');
          td.setAttribute('colspan', '9');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const ev of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', ev.title));

          // Start/End - use date format for all-day events, datetime otherwise
          if (ev.allDay) {
            tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDate(ev.startDate)));
            tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDate(ev.endDate)));
          } else {
            tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(ev.startDate)));
            tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(ev.endDate)));
          }

          // All day flag
          const tdAllDay = el('td', 'px-4 py-3');
          if (ev.allDay) {
            tdAllDay.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20', 'Yes'));
          } else {
            tdAllDay.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'No'));
          }
          tr.appendChild(tdAllDay);

          // Project
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text)]', ev.projectName || '\u2014'));

          // Milestone type
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', ev.milestoneType || '\u2014'));

          // Provider badge
          const tdProv = el('td', 'px-4 py-3');
          const provCls = PROVIDER_BADGE[ev.calendarProvider] ?? PROVIDER_BADGE.ical;
          const provLabel = PROVIDER_LABEL[ev.calendarProvider] ?? ev.calendarProvider;
          tdProv.appendChild(el('span', `px-2 py-0.5 rounded text-xs font-medium ${provCls}`, provLabel));
          tr.appendChild(tdProv);

          // Synced status
          const tdSynced = el('td', 'px-4 py-3');
          if (ev.synced) {
            tdSynced.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Synced'));
          } else {
            tdSynced.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20', 'Not Synced'));
          }
          tr.appendChild(tdSynced);

          // Last sync
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(ev.lastSyncAt)));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load calendar events';
        showMsg(wrapper, message, false);
      }
    }

    // Wire up filter events
    projectSelect.addEventListener('change', () => void loadAndRender());
    providerSelect.addEventListener('change', () => void loadAndRender());

    // Initial load
    void loadAndRender();
  },
};
