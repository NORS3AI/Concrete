/**
 * Safety Inspections & Audits view.
 * Filterable table of inspections with summary stats, status badges, and
 * action buttons for completion and failure. Wired to SafetyService for
 * all data operations.
 */

import { getSafetyService } from '../service-accessor';
import type { InspectionType, InspectionStatus } from '../safety-service';

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
  { value: 'safety_audit', label: 'Safety Audit' },
  { value: 'site_inspection', label: 'Site Inspection' },
  { value: 'equipment_inspection', label: 'Equipment Inspection' },
  { value: 'vehicle_inspection', label: 'Vehicle Inspection' },
  { value: 'regulatory', label: 'Regulatory' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const TYPE_LABEL: Record<string, string> = {
  safety_audit: 'Safety Audit',
  site_inspection: 'Site Inspection',
  equipment_inspection: 'Equipment Inspection',
  vehicle_inspection: 'Vehicle Inspection',
  regulatory: 'Regulatory',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Safety Inspections & Audits'));
    const newBtn = el('button', btnCls, 'New Inspection');
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
    searchInput.placeholder = 'Search inspections...';
    filterBar.appendChild(searchInput);

    const typeSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of TYPE_OPTIONS) {
      const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
      typeSelect.appendChild(o);
    }
    filterBar.appendChild(typeSelect);

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
      scheduled: number,
      completed: number,
      failed: number,
    ): void {
      statsRow.innerHTML = '';
      const cards: { label: string; value: number; color: string }[] = [
        { label: 'Total Inspections', value: total, color: 'text-[var(--text)]' },
        { label: 'Scheduled', value: scheduled, color: 'text-blue-400' },
        { label: 'Completed', value: completed, color: 'text-emerald-400' },
        { label: 'Failed', value: failed, color: failed > 0 ? 'text-red-400' : 'text-emerald-400' },
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
      const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading inspections...');
      tableContainer.appendChild(loading);

      try {
        const svc = getSafetyService();
        let items = await svc.listInspections();

        // Compute stats from full list before filtering
        const totalCount = items.length;
        const scheduledCount = items.filter((i) => i.status === 'scheduled').length;
        const completedCount = items.filter((i) => i.status === 'completed').length;
        const failedCount = items.filter((i) => i.status === 'failed').length;
        renderStats(totalCount, scheduledCount, completedCount, failedCount);

        // Client-side filtering
        const query = searchInput.value.trim().toLowerCase();
        if (query) {
          items = items.filter((i) => {
            const searchable = [
              i.number,
              i.inspectorName,
              i.jobName ?? '',
              i.location ?? '',
              i.findings ?? '',
            ].join(' ').toLowerCase();
            return searchable.includes(query);
          });
        }
        if (typeSelect.value) {
          items = items.filter((i) => i.type === typeSelect.value);
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
        for (const col of ['Number', 'Type', 'Status', 'Scheduled Date', 'Completed Date', 'Inspector', 'Job', 'Score', 'Findings', 'Actions']) {
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
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No inspections found.');
          td.setAttribute('colspan', '10');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          // Number
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.number));

          // Type
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', TYPE_LABEL[item.type] ?? item.type));

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

          // Scheduled Date
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.scheduledDate));

          // Completed Date
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.completedDate ?? '-'));

          // Inspector
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.inspectorName));

          // Job
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.jobName ?? item.jobId ?? '-'));

          // Score
          const scoreText = item.score !== undefined && item.maxScore
            ? `${item.score}/${item.maxScore}`
            : item.score !== undefined ? String(item.score) : '-';
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', scoreText));

          // Findings (truncated)
          const findings = item.findings
            ? (item.findings.length > 50 ? item.findings.substring(0, 50) + '...' : item.findings)
            : '-';
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', findings));

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          const actionsWrap = el('div', 'flex items-center gap-2');
          const itemId = (item as any).id as string;

          if (item.status === 'scheduled' || item.status === 'in_progress') {
            const completeBtn = el('button', 'text-emerald-400 hover:underline text-xs', 'Complete');
            completeBtn.addEventListener('click', () => {
              const findingsInput = prompt('Findings:');
              if (findingsInput === null) return;
              const scoreStr = prompt('Score (number):');
              const score = scoreStr ? parseInt(scoreStr, 10) : undefined;
              const maxScoreStr = prompt('Max Score (number):');
              const maxScore = maxScoreStr ? parseInt(maxScoreStr, 10) : undefined;

              void (async () => {
                try {
                  await svc.completeInspection(itemId, findingsInput, score, maxScore);
                  showMsg(wrapper, `Inspection ${item.number} completed.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to complete inspection.';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            actionsWrap.appendChild(completeBtn);

            const failBtn = el('button', 'text-red-400 hover:underline text-xs', 'Fail');
            failBtn.addEventListener('click', () => {
              const findingsInput = prompt('Findings:');
              if (findingsInput === null) return;

              void (async () => {
                try {
                  await svc.failInspection(itemId, findingsInput);
                  showMsg(wrapper, `Inspection ${item.number} marked as failed.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to update inspection.';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            actionsWrap.appendChild(failBtn);
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
        const message = err instanceof Error ? err.message : 'Failed to load inspections.';
        showMsg(wrapper, message, true);
      }
    }

    // ---- New Inspection ----
    newBtn.addEventListener('click', () => {
      const number = prompt('Inspection Number:');
      if (!number) return;
      const type = prompt('Type (safety_audit, site_inspection, equipment_inspection, vehicle_inspection, regulatory):');
      if (!type) return;
      const scheduledDate = prompt('Scheduled Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
      if (!scheduledDate) return;
      const inspectorName = prompt('Inspector Name:');
      if (!inspectorName) return;
      const jobId = prompt('Job ID (optional):') ?? '';

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.createInspection({
            number,
            type: type as InspectionType,
            scheduledDate,
            inspectorName,
            jobId: jobId || undefined,
          });
          showMsg(wrapper, `Inspection ${number} created successfully.`, false);
          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create inspection.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter events ----
    searchInput.addEventListener('input', () => void loadAndRender());
    typeSelect.addEventListener('change', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());

    // ---- Initial load ----
    void loadAndRender();
  },
};
