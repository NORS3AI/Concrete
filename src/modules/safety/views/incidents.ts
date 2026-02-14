/**
 * Safety Incidents view.
 * Filterable table of safety incidents with summary stats, status/severity
 * badges, and action buttons for investigation and closure. Wired to
 * SafetyService for all data operations.
 */

import { getSafetyService } from '../service-accessor';
import type {
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  BodyPart,
} from '../safety-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string> | string,
  ...children: Array<string | HTMLElement>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (typeof attrs === 'string') {
    node.className = attrs;
  } else if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class' || k === 'className') {
        node.className = v;
      } else {
        node.setAttribute(k, v);
      }
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
  }
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'injury', label: 'Injury' },
  { value: 'illness', label: 'Illness' },
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'vehicle', label: 'Vehicle' },
];

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Severities' },
  { value: 'first_aid', label: 'First Aid' },
  { value: 'recordable', label: 'Recordable' },
  { value: 'lost_time', label: 'Lost Time' },
  { value: 'fatality', label: 'Fatality' },
  { value: 'near_miss', label: 'Near Miss' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'reported', label: 'Reported' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'corrective_action', label: 'Corrective Action' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_BADGE: Record<string, string> = {
  reported: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  investigating: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  corrective_action: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  closed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  reported: 'Reported',
  investigating: 'Investigating',
  corrective_action: 'Corrective Action',
  closed: 'Closed',
};

const SEVERITY_BADGE: Record<string, string> = {
  first_aid: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  recordable: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  lost_time: 'bg-red-500/10 text-red-400 border border-red-500/20',
  fatality: 'bg-red-500/10 text-red-400 border border-red-500/20',
  near_miss: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

const SEVERITY_LABEL: Record<string, string> = {
  first_aid: 'First Aid',
  recordable: 'Recordable',
  lost_time: 'Lost Time',
  fatality: 'Fatality',
  near_miss: 'Near Miss',
};

const TYPE_LABEL: Record<string, string> = {
  injury: 'Injury',
  illness: 'Illness',
  near_miss: 'Near Miss',
  property_damage: 'Property Damage',
  environmental: 'Environmental',
  vehicle: 'Vehicle',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Safety Incidents'));
    const newBtn = el('button', btnCls, 'Record Incident');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Stats ----
    const statsRow = el('div', 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6');
    wrapper.appendChild(statsRow);

    // ---- Filter Bar ----
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search incidents...';
    filterBar.appendChild(searchInput);

    const typeSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of TYPE_OPTIONS) {
      const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
      typeSelect.appendChild(o);
    }
    filterBar.appendChild(typeSelect);

    const severitySelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of SEVERITY_OPTIONS) {
      const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
      severitySelect.appendChild(o);
    }
    filterBar.appendChild(severitySelect);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    wrapper.appendChild(filterBar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // -------------------------------------------------------------------
    // Data loading & rendering
    // -------------------------------------------------------------------

    function renderStats(
      total: number,
      open: number,
      recordable: number,
      nearMisses: number,
    ): void {
      statsRow.innerHTML = '';
      const cards: { label: string; value: number; color: string }[] = [
        { label: 'Total Incidents', value: total, color: 'text-[var(--text)]' },
        { label: 'Open', value: open, color: open > 0 ? 'text-amber-400' : 'text-emerald-400' },
        { label: 'Recordable', value: recordable, color: recordable > 0 ? 'text-red-400' : 'text-emerald-400' },
        { label: 'Near Misses', value: nearMisses, color: 'text-blue-400' },
      ];
      for (const card of cards) {
        const div = el(
          'div',
          'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4',
        );
        div.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1', card.label));
        div.appendChild(el('div', `text-2xl font-bold ${card.color}`, String(card.value)));
        statsRow.appendChild(div);
      }
    }

    async function loadAndRender(): Promise<void> {
      tableContainer.innerHTML = '';
      const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading incidents...');
      tableContainer.appendChild(loading);

      try {
        const svc = getSafetyService();
        let items = await svc.listIncidents();

        // Compute stats from full list before filtering
        const totalCount = items.length;
        const openCount = items.filter((i) => i.status !== 'closed').length;
        const recordableCount = items.filter((i) => i.oshaRecordable).length;
        const nearMissCount = items.filter((i) => i.severity === 'near_miss').length;
        renderStats(totalCount, openCount, recordableCount, nearMissCount);

        // Client-side filtering
        const query = searchInput.value.trim().toLowerCase();
        if (query) {
          items = items.filter((i) => {
            const searchable = [
              i.incidentNumber,
              i.description,
              i.employeeName ?? '',
              i.location ?? '',
              i.jobName ?? '',
            ].join(' ').toLowerCase();
            return searchable.includes(query);
          });
        }
        if (typeSelect.value) {
          items = items.filter((i) => i.type === typeSelect.value);
        }
        if (severitySelect.value) {
          items = items.filter((i) => i.severity === severitySelect.value);
        }
        if (statusSelect.value) {
          items = items.filter((i) => i.status === statusSelect.value);
        }

        // Build table
        tableContainer.innerHTML = '';
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Incident #', 'Date', 'Type', 'Severity', 'Status', 'Employee', 'Job', 'Location', 'Description', 'Actions']) {
          headRow.appendChild(
            el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col),
          );
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No incidents found.');
          td.setAttribute('colspan', '10');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          // Incident #
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.incidentNumber));

          // Date
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.date));

          // Type
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', TYPE_LABEL[item.type] ?? item.type));

          // Severity badge
          const tdSev = el('td', 'px-4 py-3 text-sm');
          tdSev.appendChild(
            el(
              'span',
              `px-2 py-1 rounded-full text-xs font-medium ${SEVERITY_BADGE[item.severity] ?? ''}`,
              SEVERITY_LABEL[item.severity] ?? item.severity,
            ),
          );
          tr.appendChild(tdSev);

          // Status badge
          const tdSt = el('td', 'px-4 py-3 text-sm');
          tdSt.appendChild(
            el(
              'span',
              `px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] ?? ''}`,
              STATUS_LABEL[item.status] ?? item.status,
            ),
          );
          tr.appendChild(tdSt);

          // Employee
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.employeeName ?? '-'));

          // Job
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.jobName ?? item.jobId ?? '-'));

          // Location
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.location ?? '-'));

          // Description (truncated)
          const desc = item.description.length > 60 ? item.description.substring(0, 60) + '...' : item.description;
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', desc));

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          const actionsWrap = el('div', 'flex items-center gap-2');
          const itemId = (item as any).id as string;

          if (item.status === 'reported') {
            const investigateBtn = el('button', 'text-blue-400 hover:underline text-xs', 'Investigate');
            investigateBtn.addEventListener('click', () => {
              const investigator = prompt('Investigator name:');
              if (!investigator) return;
              const rootCause = prompt('Root cause:');
              if (!rootCause) return;
              void (async () => {
                try {
                  await svc.investigateIncident(itemId, investigator, rootCause);
                  showMsg(wrapper, `Incident ${item.incidentNumber} is now under investigation.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to investigate incident.';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            actionsWrap.appendChild(investigateBtn);
          }

          if (item.status === 'investigating' || item.status === 'corrective_action') {
            const closeBtn = el('button', 'text-emerald-400 hover:underline text-xs', 'Close');
            closeBtn.addEventListener('click', () => {
              void (async () => {
                try {
                  await svc.closeIncident(itemId);
                  showMsg(wrapper, `Incident ${item.incidentNumber} closed.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to close incident.';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            actionsWrap.appendChild(closeBtn);
          }

          tdActions.appendChild(actionsWrap);
          tr.appendChild(tdActions);
          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        tableContainer.innerHTML = '';
        const message = err instanceof Error ? err.message : 'Failed to load incidents.';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Record Incident ----
    newBtn.addEventListener('click', () => {
      const incidentNumber = prompt('Incident Number:');
      if (!incidentNumber) return;
      const type = prompt('Type (injury, illness, near_miss, property_damage, environmental, vehicle):');
      if (!type) return;
      const severity = prompt('Severity (first_aid, recordable, lost_time, fatality, near_miss):');
      if (!severity) return;
      const date = prompt('Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
      if (!date) return;
      const employeeName = prompt('Employee Name:') ?? '';
      const description = prompt('Description:');
      if (!description) return;
      const jobId = prompt('Job ID (optional):') ?? '';
      const location = prompt('Location (optional):') ?? '';
      const bodyPart = prompt('Body Part (optional, e.g. hand, back, head):') ?? '';

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.recordIncident({
            incidentNumber,
            type: type as IncidentType,
            severity: severity as IncidentSeverity,
            date,
            employeeName,
            description,
            jobId: jobId || undefined,
            location: location || undefined,
            bodyPart: (bodyPart || undefined) as BodyPart | undefined,
          });
          showMsg(wrapper, `Incident ${incidentNumber} recorded successfully.`, false);
          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to record incident.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter events ----
    searchInput.addEventListener('input', () => void loadAndRender());
    typeSelect.addEventListener('change', () => void loadAndRender());
    severitySelect.addEventListener('change', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());

    // ---- Initial load ----
    void loadAndRender();
  },
};
