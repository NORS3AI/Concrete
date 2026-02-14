/**
 * Safety Dashboard view.
 * Displays an overview of safety metrics including incident counts,
 * TRIR, DART, EMR, corrective action statuses, and trend data.
 * Year-selectable with refresh capability. Purely informational.
 * Wired to SafetyService for data loading.
 */

import { getSafetyService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(
  tag: string,
  attrs?: Record<string, string>,
  ...children: Array<string | HTMLElement>
): HTMLElement {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') node.className = v;
      else node.setAttribute(k, v);
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
  const msg = el('div', { className: cls }, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  injury: 'Injury',
  illness: 'Illness',
  near_miss: 'Near Miss',
  property_damage: 'Property Damage',
  environmental: 'Environmental',
  vehicle: 'Vehicle',
};

const DEFAULT_HOURS = 200000;

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', { className: 'max-w-7xl mx-auto' });

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // ---- Header ----
    const headerRow = el('div', { className: 'flex items-center justify-between mb-4' });
    headerRow.appendChild(el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Safety Dashboard'));

    const controlsWrap = el('div', { className: 'flex items-center gap-3' });
    const yearLabel = el('label', { className: 'text-sm text-[var(--text-muted)]' }, 'Year:');
    controlsWrap.appendChild(yearLabel);
    const yearInput = el('input', {
      className: inputCls + ' w-24',
      type: 'number',
      value: String(new Date().getFullYear()),
      min: '2000',
      max: '2099',
    }) as HTMLInputElement;
    controlsWrap.appendChild(yearInput);
    const refreshBtn = el('button', { className: btnCls, type: 'button' }, 'Refresh');
    controlsWrap.appendChild(refreshBtn);
    headerRow.appendChild(controlsWrap);
    wrapper.appendChild(headerRow);

    // ---- Loading State ----
    const loadingEl = el(
      'div',
      { className: 'py-8 text-center text-[var(--text-muted)] text-sm' },
      'Loading dashboard data...',
    );
    wrapper.appendChild(loadingEl);

    // ---- Summary Cards Container ----
    const cardsContainer = el('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6' });
    wrapper.appendChild(cardsContainer);

    // ---- Incidents by Type Container ----
    const byTypeContainer = el('div', { className: 'mb-6' });
    wrapper.appendChild(byTypeContainer);

    // ---- Monthly Trend Container ----
    const monthlyContainer = el('div', { className: 'mb-6' });
    wrapper.appendChild(monthlyContainer);

    container.appendChild(wrapper);

    // -------------------------------------------------------------------
    // Data loading & rendering
    // -------------------------------------------------------------------

    function buildCard(label: string, value: string | number, colorCls: string): HTMLElement {
      const card = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4',
      });
      card.appendChild(el('div', { className: 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1' }, label));
      card.appendChild(el('div', { className: `text-2xl font-bold ${colorCls}` }, String(value)));
      return card;
    }

    async function loadAndRender(): Promise<void> {
      try {
        const svc = getSafetyService();
        const year = parseInt(yearInput.value, 10) || new Date().getFullYear();
        loadingEl.style.display = 'block';
        cardsContainer.innerHTML = '';
        byTypeContainer.innerHTML = '';
        monthlyContainer.innerHTML = '';

        const [dashboard, trirResult, dartResult] = await Promise.all([
          svc.getSafetyDashboard(year),
          svc.calculateTRIR(DEFAULT_HOURS, year),
          svc.calculateDART(DEFAULT_HOURS, year),
        ]);

        loadingEl.style.display = 'none';

        // ---- Section 1: Summary Cards ----
        cardsContainer.appendChild(buildCard(
          'Total Incidents',
          dashboard.totalIncidents,
          'text-[var(--text)]',
        ));

        cardsContainer.appendChild(buildCard(
          'Open Incidents',
          dashboard.openIncidents,
          dashboard.openIncidents > 0 ? 'text-amber-400' : 'text-[var(--text)]',
        ));

        cardsContainer.appendChild(buildCard(
          'Recordable',
          dashboard.recordableIncidents,
          dashboard.recordableIncidents > 0 ? 'text-red-400' : 'text-[var(--text)]',
        ));

        cardsContainer.appendChild(buildCard(
          'Near Misses',
          dashboard.nearMisses,
          'text-[var(--text)]',
        ));

        cardsContainer.appendChild(buildCard(
          'Days Without Incident',
          dashboard.daysWithoutIncident,
          'text-emerald-400',
        ));

        cardsContainer.appendChild(buildCard(
          'TRIR',
          trirResult.trir,
          'text-[var(--text)]',
        ));

        cardsContainer.appendChild(buildCard(
          'DART',
          dartResult.dart,
          'text-[var(--text)]',
        ));

        cardsContainer.appendChild(buildCard(
          'EMR',
          dashboard.emr,
          dashboard.emr > 1 ? 'text-red-400' : dashboard.emr < 1 ? 'text-emerald-400' : 'text-[var(--text)]',
        ));

        cardsContainer.appendChild(buildCard(
          'Open Corrective Actions',
          dashboard.openCorrectiveActions,
          dashboard.openCorrectiveActions > 0 ? 'text-amber-400' : 'text-[var(--text)]',
        ));

        cardsContainer.appendChild(buildCard(
          'Overdue CAs',
          dashboard.overdueCorrectiveActions,
          dashboard.overdueCorrectiveActions > 0 ? 'text-red-400' : 'text-[var(--text)]',
        ));

        cardsContainer.appendChild(buildCard(
          'Upcoming Inspections',
          dashboard.upcomingInspections,
          'text-[var(--text)]',
        ));

        // ---- Section 2: Incidents by Type ----
        const typeSection = el('div', {
          className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
        });
        typeSection.appendChild(el('div', { className: 'px-4 py-3 border-b border-[var(--border)]' },
          el('h2', { className: 'text-lg font-semibold text-[var(--text)]' }, 'Incidents by Type'),
        ));

        const typeTable = el('table', { className: 'w-full text-sm' });
        const typeThead = el('thead');
        const typeHeadRow = el('tr', { className: 'border-b border-[var(--border)]' });
        typeHeadRow.appendChild(el('th', {
          className: 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3',
        }, 'Type'));
        typeHeadRow.appendChild(el('th', {
          className: 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3',
        }, 'Count'));
        typeThead.appendChild(typeHeadRow);
        typeTable.appendChild(typeThead);

        const typeTbody = el('tbody');
        const byType = dashboard.incidentsByType;
        const typeEntries = Object.entries(byType) as Array<[string, number]>;

        if (typeEntries.length === 0) {
          const tr = el('tr');
          const td = el('td', {
            className: 'py-4 px-4 text-center text-[var(--text-muted)]',
            colspan: '2',
          }, 'No incident type data available.');
          tr.appendChild(td);
          typeTbody.appendChild(tr);
        } else {
          for (const [type, count] of typeEntries) {
            const tr = el('tr', { className: 'border-t border-[var(--border)]' });
            tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text)]' }, INCIDENT_TYPE_LABELS[type] ?? type));
            const countCls = count > 0 ? 'px-4 py-3 text-sm text-[var(--text)] font-mono font-medium' : 'px-4 py-3 text-sm text-[var(--text-muted)] font-mono';
            tr.appendChild(el('td', { className: countCls }, String(count)));
            typeTbody.appendChild(tr);
          }
        }

        typeTable.appendChild(typeTbody);
        typeSection.appendChild(typeTable);
        byTypeContainer.appendChild(typeSection);

        // ---- Section 3: Monthly Trend ----
        const monthSection = el('div', {
          className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
        });
        monthSection.appendChild(el('div', { className: 'px-4 py-3 border-b border-[var(--border)]' },
          el('h2', { className: 'text-lg font-semibold text-[var(--text)]' }, 'Monthly Trend'),
        ));

        const monthTable = el('table', { className: 'w-full text-sm' });
        const monthThead = el('thead');
        const monthHeadRow = el('tr', { className: 'border-b border-[var(--border)]' });
        monthHeadRow.appendChild(el('th', {
          className: 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3',
        }, 'Month'));
        monthHeadRow.appendChild(el('th', {
          className: 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3',
        }, 'Incident Count'));
        monthThead.appendChild(monthHeadRow);
        monthTable.appendChild(monthThead);

        const monthTbody = el('tbody');
        const monthlyData = dashboard.incidentsByMonth;

        if (monthlyData.length === 0) {
          const tr = el('tr');
          const td = el('td', {
            className: 'py-4 px-4 text-center text-[var(--text-muted)]',
            colspan: '2',
          }, 'No monthly data available for this year.');
          tr.appendChild(td);
          monthTbody.appendChild(tr);
        } else {
          for (const entry of monthlyData) {
            const tr = el('tr', { className: 'border-t border-[var(--border)]' });
            tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text)]' }, entry.month));
            const mCountCls = entry.count > 0 ? 'px-4 py-3 text-sm text-[var(--text)] font-mono font-medium' : 'px-4 py-3 text-sm text-[var(--text-muted)] font-mono';
            tr.appendChild(el('td', { className: mCountCls }, String(entry.count)));
            monthTbody.appendChild(tr);
          }
        }

        monthTable.appendChild(monthTbody);
        monthSection.appendChild(monthTable);
        monthlyContainer.appendChild(monthSection);
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data.';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Event Handlers ----
    refreshBtn.addEventListener('click', () => void loadAndRender());
    yearInput.addEventListener('change', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAndRender();
  },
};
