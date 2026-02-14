/**
 * Safety Metrics Dashboard view.
 *
 * Displays safety KPIs including TRIR (Total Recordable Incident Rate),
 * DART (Days Away, Restricted, Transfer), EMR (Experience Modification Rate),
 * and incident tracking. Provides placeholder data entry for safety metrics.
 * Supports period selector and entity filter.
 *
 * Wired to DashboardService for benchmark storage, KPI computation,
 * and safety data retrieval.
 */

import { getDashboardService } from '../service-accessor';
import type { KPIResult, PeriodPreset, Benchmark } from '../dashboard-service';
import {
  buildKPICard,
  buildKPICardGrid,
  buildPeriodSelector,
  buildEntityFilter,
  buildDashboardHeader,
  buildSection,
  buildEmptyState,
  buildKPISummaryTable,
  formatKPIValue,
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

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 5000);
}

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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
// State
// ---------------------------------------------------------------------------

let currentPeriod: PeriodPreset = 'ytd';
let currentEntityId = '';

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

function buildDataEntryForm(wrapper: HTMLElement, onSubmit: (data: {
  trir: number;
  dart: number;
  emr: number;
  hoursWorked: number;
  incidents: number;
  nearMisses: number;
  period: string;
}) => void): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';

  const form = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

  // TRIR input
  const trirWrap = el('div');
  trirWrap.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'TRIR'));
  const trirInput = el('input', inputCls) as HTMLInputElement;
  trirInput.type = 'number';
  trirInput.step = '0.01';
  trirInput.placeholder = 'e.g. 2.5';
  trirInput.setAttribute('data-field', 'trir');
  trirWrap.appendChild(trirInput);
  form.appendChild(trirWrap);

  // DART input
  const dartWrap = el('div');
  dartWrap.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'DART Rate'));
  const dartInput = el('input', inputCls) as HTMLInputElement;
  dartInput.type = 'number';
  dartInput.step = '0.01';
  dartInput.placeholder = 'e.g. 1.5';
  dartInput.setAttribute('data-field', 'dart');
  dartWrap.appendChild(dartInput);
  form.appendChild(dartWrap);

  // EMR input
  const emrWrap = el('div');
  emrWrap.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'EMR'));
  const emrInput = el('input', inputCls) as HTMLInputElement;
  emrInput.type = 'number';
  emrInput.step = '0.01';
  emrInput.placeholder = 'e.g. 0.95';
  emrInput.setAttribute('data-field', 'emr');
  emrWrap.appendChild(emrInput);
  form.appendChild(emrWrap);

  // Hours Worked input
  const hoursWrap = el('div');
  hoursWrap.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Hours Worked'));
  const hoursInput = el('input', inputCls) as HTMLInputElement;
  hoursInput.type = 'number';
  hoursInput.placeholder = 'e.g. 250000';
  hoursInput.setAttribute('data-field', 'hoursWorked');
  hoursWrap.appendChild(hoursInput);
  form.appendChild(hoursWrap);

  // Recordable Incidents input
  const incidentsWrap = el('div');
  incidentsWrap.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Recordable Incidents'));
  const incidentsInput = el('input', inputCls) as HTMLInputElement;
  incidentsInput.type = 'number';
  incidentsInput.placeholder = 'e.g. 3';
  incidentsInput.setAttribute('data-field', 'incidents');
  incidentsWrap.appendChild(incidentsInput);
  form.appendChild(incidentsWrap);

  // Near Misses input
  const nearMissWrap = el('div');
  nearMissWrap.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Near Misses'));
  const nearMissInput = el('input', inputCls) as HTMLInputElement;
  nearMissInput.type = 'number';
  nearMissInput.placeholder = 'e.g. 12';
  nearMissInput.setAttribute('data-field', 'nearMisses');
  nearMissWrap.appendChild(nearMissInput);
  form.appendChild(nearMissWrap);

  // Period input
  const periodWrap = el('div');
  periodWrap.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Period Label'));
  const periodInput = el('input', inputCls) as HTMLInputElement;
  periodInput.type = 'text';
  periodInput.placeholder = 'e.g. 2026-Q1';
  periodInput.setAttribute('data-field', 'period');
  periodWrap.appendChild(periodInput);
  form.appendChild(periodWrap);

  wrap.appendChild(form);

  const btnRow = el('div', 'mt-4 flex justify-end');
  const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Safety Metrics');
  saveBtn.addEventListener('click', () => {
    const trir = parseFloat(trirInput.value);
    const dart = parseFloat(dartInput.value);
    const emr = parseFloat(emrInput.value);
    const hoursWorked = parseFloat(hoursInput.value);
    const incidents = parseInt(incidentsInput.value, 10);
    const nearMisses = parseInt(nearMissInput.value, 10);
    const period = periodInput.value.trim();

    if (!period) {
      showMsg(wrapper, 'Period label is required.', true);
      return;
    }

    if (isNaN(trir) && isNaN(dart) && isNaN(emr) && isNaN(hoursWorked) && isNaN(incidents) && isNaN(nearMisses)) {
      showMsg(wrapper, 'Please enter at least one metric value.', true);
      return;
    }

    onSubmit({
      trir: isNaN(trir) ? 0 : trir,
      dart: isNaN(dart) ? 0 : dart,
      emr: isNaN(emr) ? 0 : emr,
      hoursWorked: isNaN(hoursWorked) ? 0 : hoursWorked,
      incidents: isNaN(incidents) ? 0 : incidents,
      nearMisses: isNaN(nearMisses) ? 0 : nearMisses,
      period,
    });

    // Clear inputs after submit
    trirInput.value = '';
    dartInput.value = '';
    emrInput.value = '';
    hoursInput.value = '';
    incidentsInput.value = '';
    nearMissInput.value = '';
    periodInput.value = '';
  });
  btnRow.appendChild(saveBtn);
  wrap.appendChild(btnRow);

  return wrap;
}

// ---------------------------------------------------------------------------
// Data extraction helpers
// ---------------------------------------------------------------------------

function extractMetricsFromBenchmarks(benchmarks: (Benchmark & { id: string })[]): SafetyMetrics {
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

  // Extract most recent value per kpiCode
  const codeMap: Record<string, number> = {};
  for (const b of benchmarks) {
    codeMap[b.kpiCode] = b.value;
  }

  if (codeMap['trir'] !== undefined) metrics.trir = codeMap['trir'];
  if (codeMap['dart'] !== undefined) metrics.dart = codeMap['dart'];
  if (codeMap['emr'] !== undefined) metrics.emr = codeMap['emr'];
  if (codeMap['safety_emr'] !== undefined && metrics.emr === 0) metrics.emr = codeMap['safety_emr'];
  if (codeMap['hours_worked'] !== undefined) metrics.totalHoursWorked = codeMap['hours_worked'];
  if (codeMap['recordable_incidents'] !== undefined) metrics.recordableIncidents = codeMap['recordable_incidents'];
  if (codeMap['near_misses'] !== undefined) metrics.nearMisses = codeMap['near_misses'];

  return metrics;
}

function extractIncidentsFromBenchmarks(benchmarks: (Benchmark & { id: string })[]): IncidentRow[] {
  // Incident benchmarks have kpiCode starting with 'incident_'
  const incidents: IncidentRow[] = [];
  for (const b of benchmarks) {
    if (b.kpiCode.startsWith('incident_')) {
      incidents.push({
        date: b.period || '--',
        description: (b.industry as string) || b.kpiCode.replace('incident_', ''),
        type: 'Recordable',
        severity: b.value >= 3 ? 'high' : b.value >= 2 ? 'medium' : 'low',
        jobName: b.entityId || '--',
        status: 'closed',
      });
    }
  }
  return incidents;
}

// ---------------------------------------------------------------------------
// Load & Render
// ---------------------------------------------------------------------------

async function loadAndRender(container: HTMLElement): Promise<void> {
  container.innerHTML = '';
  const wrapper = el('div', 'space-y-0');

  const svc = getDashboardService();
  const entityId = currentEntityId || undefined;
  const period = currentPeriod;

  // Build header with wired selectors
  const periodSelector = buildPeriodSelector(period, (newPeriod) => {
    currentPeriod = newPeriod as PeriodPreset;
    loadAndRender(container);
  });

  // Load entities for filter (from benchmarks entityId values as proxy)
  const allBenchmarks = await svc.getBenchmarks();
  const entityIds = new Set<string>();
  for (const b of allBenchmarks) {
    if (b.entityId) entityIds.add(b.entityId);
  }
  const entities = Array.from(entityIds).map((id) => ({ id, name: id }));

  const entityFilter = buildEntityFilter(entities, currentEntityId, (newEntityId) => {
    currentEntityId = newEntityId;
    loadAndRender(container);
  });

  const header = buildDashboardHeader(
    'Safety Metrics',
    'TRIR, DART, EMR tracking with incident reporting and safety trend analysis',
    periodSelector,
    entityFilter,
  );
  wrapper.appendChild(header);

  // Fetch safety-related benchmarks
  const [trirBenchmarks, dartBenchmarks, emrBenchmarks, hoursBenchmarks, incidentBenchmarks, nearMissBenchmarks] = await Promise.all([
    svc.getBenchmarks({ kpiCode: 'trir' }),
    svc.getBenchmarks({ kpiCode: 'dart' }),
    svc.getBenchmarks({ kpiCode: 'emr' }),
    svc.getBenchmarks({ kpiCode: 'hours_worked' }),
    svc.getBenchmarks({ kpiCode: 'recordable_incidents' }),
    svc.getBenchmarks({ kpiCode: 'near_misses' }),
  ]);

  const allSafetyBenchmarks = [
    ...trirBenchmarks,
    ...dartBenchmarks,
    ...emrBenchmarks,
    ...hoursBenchmarks,
    ...incidentBenchmarks,
    ...nearMissBenchmarks,
  ];

  // Also fetch computed operational KPIs which may include safety_emr
  let operationalKPIs: KPIResult[] = [];
  try {
    operationalKPIs = await svc.computeOperationalKPIs(entityId, period);
  } catch {
    // Non-fatal: operational KPIs may not be available
  }

  // Also try to compute individual safety KPIs
  const safetyKPIResults: KPIResult[] = [];
  for (const code of ['trir', 'dart', 'emr', 'safety_emr']) {
    try {
      const result = await svc.computeKPI(code, entityId, period);
      safetyKPIResults.push(result);
    } catch {
      // KPI def may not exist; skip
    }
  }

  // Extract metrics from benchmarks
  const metrics = extractMetricsFromBenchmarks(allSafetyBenchmarks as (Benchmark & { id: string })[]);

  // Override with computed KPI values if available
  for (const kpi of safetyKPIResults) {
    if (kpi.code === 'trir' && kpi.value !== 0) metrics.trir = kpi.value;
    if (kpi.code === 'dart' && kpi.value !== 0) metrics.dart = kpi.value;
    if ((kpi.code === 'emr' || kpi.code === 'safety_emr') && kpi.value !== 0) metrics.emr = kpi.value;
  }

  // Safety KPI cards
  wrapper.appendChild(buildSection('Safety KPIs', buildSafetyKPICards(metrics)));

  // Incident summary
  wrapper.appendChild(buildSection('Incident Summary', buildIncidentSummary(metrics)));

  // Show computed KPIs in a summary table if available
  const displayKPIs = [...safetyKPIResults];
  // Include relevant operational KPIs (safety_emr)
  for (const kpi of operationalKPIs) {
    if (kpi.code === 'safety_emr' && !displayKPIs.find((k) => k.code === 'safety_emr')) {
      displayKPIs.push(kpi);
    }
  }
  if (displayKPIs.length > 0) {
    wrapper.appendChild(buildSection('Computed Safety KPIs', buildKPISummaryTable(displayKPIs)));
  }

  // Trend chart placeholder
  wrapper.appendChild(buildSection('Safety Trend', buildEmptyState('Safety trend chart coming in Phase 26+')));

  // Incident log from benchmarks
  const incidentLogBenchmarks = await svc.getBenchmarks({ kpiCode: 'incident_log' });
  const allIncidentBenchmarks = [...incidentLogBenchmarks];
  // Also check for any incident_ prefixed benchmarks
  for (const b of allBenchmarks) {
    if (b.kpiCode.startsWith('incident_') && !allIncidentBenchmarks.find((x) => (x as any).id === (b as any).id)) {
      allIncidentBenchmarks.push(b);
    }
  }
  const incidents = extractIncidentsFromBenchmarks(allIncidentBenchmarks as (Benchmark & { id: string })[]);
  wrapper.appendChild(buildSection('Incident Log', buildIncidentTable(incidents)));

  // Data entry form
  const dataEntryForm = buildDataEntryForm(wrapper, async (data) => {
    try {
      const promises: Promise<unknown>[] = [];

      if (data.trir !== 0) {
        promises.push(svc.recordBenchmark({
          kpiCode: 'trir',
          entityId: currentEntityId || undefined,
          period: data.period,
          value: data.trir,
        }));
      }

      if (data.dart !== 0) {
        promises.push(svc.recordBenchmark({
          kpiCode: 'dart',
          entityId: currentEntityId || undefined,
          period: data.period,
          value: data.dart,
        }));
      }

      if (data.emr !== 0) {
        promises.push(svc.recordBenchmark({
          kpiCode: 'emr',
          entityId: currentEntityId || undefined,
          period: data.period,
          value: data.emr,
        }));
      }

      if (data.hoursWorked !== 0) {
        promises.push(svc.recordBenchmark({
          kpiCode: 'hours_worked',
          entityId: currentEntityId || undefined,
          period: data.period,
          value: data.hoursWorked,
        }));
      }

      if (data.incidents !== 0) {
        promises.push(svc.recordBenchmark({
          kpiCode: 'recordable_incidents',
          entityId: currentEntityId || undefined,
          period: data.period,
          value: data.incidents,
        }));
      }

      if (data.nearMisses !== 0) {
        promises.push(svc.recordBenchmark({
          kpiCode: 'near_misses',
          entityId: currentEntityId || undefined,
          period: data.period,
          value: data.nearMisses,
        }));
      }

      await Promise.all(promises);
      showMsg(wrapper, 'Safety metrics saved successfully.', false);

      // Re-render to show updated data
      await loadAndRender(container);
    } catch (err) {
      showMsg(wrapper, `Failed to save safety metrics: ${err instanceof Error ? err.message : String(err)}`, true);
    }
  });
  wrapper.appendChild(buildSection('Enter Safety Data', dataEntryForm));

  // Drill-down to safety reports section
  const drillDownSection = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  drillDownSection.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Safety Reports'));
  const reportLinks = [
    { label: 'OSHA 300 Log', description: 'Injury and illness log' },
    { label: 'OSHA 300A Summary', description: 'Annual summary of injuries' },
    { label: 'EMR History Report', description: 'Experience modification rate over time' },
    { label: 'Near Miss Analysis', description: 'Trends and root cause analysis' },
  ];
  const linkGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 gap-3');
  for (const report of reportLinks) {
    const link = el('div', 'p-3 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer');
    link.appendChild(el('div', 'text-sm font-medium text-[var(--accent)]', report.label));
    link.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', report.description));
    linkGrid.appendChild(link);
  }
  drillDownSection.appendChild(linkGrid);
  wrapper.appendChild(buildSection('Drill-Down Reports', drillDownSection));

  container.appendChild(wrapper);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    // Show loading state
    const loading = el('div', 'flex items-center justify-center py-12 text-[var(--text-muted)]', 'Loading safety metrics...');
    container.appendChild(loading);

    loadAndRender(container).catch((err) => {
      container.innerHTML = '';
      const wrapper = el('div', 'space-y-0');
      showMsg(wrapper, `Failed to load safety dashboard: ${err instanceof Error ? err.message : String(err)}`, true);
      container.appendChild(wrapper);
    });
  },
};
