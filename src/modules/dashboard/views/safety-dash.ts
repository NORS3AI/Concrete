/**
 * Safety Metrics Dashboard view.
 *
 * Displays safety KPIs including TRIR (Total Recordable Incident Rate),
 * DART (Days Away, Restricted, Transfer), EMR (Experience Modification Rate),
 * and incident tracking. Provides placeholder data entry for safety metrics.
 * Supports period selector and entity filter.
 */

import {
  buildPeriodSelector,
  buildEntityFilter,
  buildDashboardHeader,
  buildSection,
} from './kpi-cards';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SafetyMetrics {
  [key: string]: unknown;
  trir: number;
  dart: number;
  emr: number;
  totalHoursWorked: number;
  recordableIncidents: number;
  dartIncidents: number;
  fatalities: number;
  nearMisses: number;
  safetyTrainingHours: number;
}

interface IncidentRow {
  [key: string]: unknown;
  date: string;
  description: string;
  type: string;
  severity: string;
  jobName: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function buildSafetyKPICards(metrics: SafetyMetrics): HTMLElement {
  const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4');

  const trirStatus = metrics.trir <= 2.0 ? 'text-emerald-400' : metrics.trir <= 4.0 ? 'text-amber-400' : 'text-red-400';
  const dartStatus = metrics.dart <= 1.5 ? 'text-emerald-400' : metrics.dart <= 3.0 ? 'text-amber-400' : 'text-red-400';
  const emrStatus = metrics.emr <= 1.0 ? 'text-emerald-400' : metrics.emr <= 1.2 ? 'text-amber-400' : 'text-red-400';

  const cards = [
    { label: 'TRIR', value: metrics.trir.toFixed(2), sublabel: 'Total Recordable Incident Rate', cls: trirStatus },
    { label: 'DART', value: metrics.dart.toFixed(2), sublabel: 'Days Away/Restricted/Transfer Rate', cls: dartStatus },
    { label: 'EMR', value: metrics.emr.toFixed(2), sublabel: 'Experience Modification Rate', cls: emrStatus },
    { label: 'Hours Worked', value: metrics.totalHoursWorked.toLocaleString(), sublabel: 'Total hours in period', cls: 'text-[var(--text)]' },
  ];

  for (const card of cards) {
    const cardEl = el('div', 'p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]');
    cardEl.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', card.label));
    cardEl.appendChild(el('div', `text-2xl font-bold ${card.cls}`, card.value));
    cardEl.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', card.sublabel));
    grid.appendChild(cardEl);
  }

  return grid;
}

function buildIncidentSummary(metrics: SafetyMetrics): HTMLElement {
  const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4');

  const summaryCards = [
    { label: 'Recordable Incidents', value: metrics.recordableIncidents.toString(), cls: metrics.recordableIncidents === 0 ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'DART Incidents', value: metrics.dartIncidents.toString(), cls: metrics.dartIncidents === 0 ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Near Misses', value: metrics.nearMisses.toString(), cls: 'text-blue-400' },
    { label: 'Training Hours', value: metrics.safetyTrainingHours.toLocaleString(), cls: 'text-[var(--text)]' },
  ];

  for (const card of summaryCards) {
    const cardEl = el('div', 'p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]');
    cardEl.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1', card.label));
    cardEl.appendChild(el('div', `text-2xl font-bold ${card.cls}`, card.value));
    grid.appendChild(cardEl);
  }

  return grid;
}

function buildSafetyTrendChart(): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  const placeholder = el('div', 'flex items-center justify-center h-48 text-[var(--text-muted)]', 'Safety metrics trend chart (TRIR, DART, EMR over time) will render here when Chart.js is connected and safety data is available.');
  wrap.appendChild(placeholder);
  return wrap;
}

function buildIncidentTable(incidents: IncidentRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Date', 'Description', 'Type', 'Severity', 'Job', 'Status']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (incidents.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No incidents recorded. Use the form below to enter safety data.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const incident of incidents) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', incident.date));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', incident.description));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', incident.type));

    const severityColors: Record<string, string> = {
      low: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      high: 'bg-red-500/10 text-red-400 border border-red-500/20',
      critical: 'bg-red-700/10 text-red-500 border border-red-700/20',
    };
    const tdSev = el('td', 'py-2 px-3');
    tdSev.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[incident.severity] ?? severityColors.low}`, incident.severity));
    tr.appendChild(tdSev);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', incident.jobName));

    const statusColors: Record<string, string> = {
      open: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      investigating: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      closed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    };
    const tdSt = el('td', 'py-2 px-3');
    tdSt.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[incident.status] ?? statusColors.open}`, incident.status));
    tr.appendChild(tdSt);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function buildDataEntryForm(): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';

  const form = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

  const fields = [
    { label: 'TRIR', placeholder: 'e.g. 2.5', type: 'number' },
    { label: 'DART Rate', placeholder: 'e.g. 1.5', type: 'number' },
    { label: 'EMR', placeholder: 'e.g. 0.95', type: 'number' },
    { label: 'Hours Worked', placeholder: 'e.g. 250000', type: 'number' },
    { label: 'Recordable Incidents', placeholder: 'e.g. 3', type: 'number' },
    { label: 'Near Misses', placeholder: 'e.g. 12', type: 'number' },
  ];

  for (const field of fields) {
    const fieldWrap = el('div');
    fieldWrap.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', field.label));
    const input = el('input', inputCls) as HTMLInputElement;
    input.type = field.type;
    input.placeholder = field.placeholder;
    fieldWrap.appendChild(input);
    form.appendChild(fieldWrap);
  }

  wrap.appendChild(form);

  const btnRow = el('div', 'mt-4 flex justify-end');
  const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Safety Metrics');
  btnRow.appendChild(saveBtn);
  wrap.appendChild(btnRow);

  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    // Header
    const periodSelector = buildPeriodSelector('ytd', () => {});
    const entityFilter = buildEntityFilter([], '', () => {});
    const header = buildDashboardHeader(
      'Safety Metrics',
      'TRIR, DART, EMR tracking with incident reporting and safety trend analysis',
      periodSelector,
      entityFilter,
    );
    wrapper.appendChild(header);

    // Safety KPI cards (placeholder zeros)
    const metrics: SafetyMetrics = {
      trir: 0,
      dart: 0,
      emr: 0,
      totalHoursWorked: 0,
      recordableIncidents: 0,
      dartIncidents: 0,
      fatalities: 0,
      nearMisses: 0,
      safetyTrainingHours: 0,
    };
    wrapper.appendChild(buildSection('Safety KPIs', buildSafetyKPICards(metrics)));
    wrapper.appendChild(buildSection('Incident Summary', buildIncidentSummary(metrics)));

    // Trend chart
    wrapper.appendChild(buildSection('Safety Trend', buildSafetyTrendChart()));

    // Incident log
    const incidents: IncidentRow[] = [];
    wrapper.appendChild(buildSection('Incident Log', buildIncidentTable(incidents)));

    // Data entry form
    wrapper.appendChild(buildSection('Enter Safety Data', buildDataEntryForm()));

    container.appendChild(wrapper);
  },
};
