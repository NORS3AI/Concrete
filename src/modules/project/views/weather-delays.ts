/**
 * Weather Delays view.
 * Weather delay log with date, type, hours lost, description, and impact analysis.
 * Wired to ProjectService for data operations.
 */

import { getProjectService } from '../service-accessor';

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

function parseProjectId(): string {
  const hash = window.location.hash;
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts.length >= 2 && parts[0] === 'project') return parts[1];
  return '';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEATHER_TYPE_OPTIONS = [
  { value: 'rain', label: 'Rain' },
  { value: 'snow', label: 'Snow' },
  { value: 'wind', label: 'High Wind' },
  { value: 'extreme_heat', label: 'Extreme Heat' },
  { value: 'extreme_cold', label: 'Extreme Cold' },
  { value: 'other', label: 'Other' },
];

const WEATHER_BADGE: Record<string, string> = {
  rain: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  snow: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  wind: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  extreme_heat: 'bg-red-500/10 text-red-400 border border-red-500/20',
  extreme_cold: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  other: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const WEATHER_LABELS: Record<string, string> = {
  rain: 'Rain',
  snow: 'Snow',
  wind: 'Wind',
  extreme_heat: 'Extreme Heat',
  extreme_cold: 'Extreme Cold',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeatherDelayRow {
  id: string;
  date: string;
  type: string;
  hoursLost: number;
  description: string;
  impactedTasks: string[];
}

interface DelayImpactSummary {
  totalHoursLost: number;
  totalDaysLost: number;
  delaysByType: Record<string, number>;
  impactedTaskCount: number;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(impact: DelayImpactSummary): HTMLElement {
  const grid = el('div', 'grid grid-cols-4 gap-3 mb-4');

  const buildCard = (label: string, value: string, colorCls: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-3 text-center');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-2xl font-bold font-mono ${colorCls}`, value));
    return card;
  };

  grid.appendChild(buildCard('Total Hours Lost', impact.totalHoursLost.toFixed(1), 'text-red-400'));
  grid.appendChild(buildCard('Total Days Lost', impact.totalDaysLost.toFixed(1), 'text-amber-400'));
  grid.appendChild(buildCard('Impacted Tasks', String(impact.impactedTaskCount), 'text-blue-400'));
  grid.appendChild(buildCard('Delay Types', String(Object.keys(impact.delaysByType).length), 'text-[var(--text)]'));

  return grid;
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function buildForm(
  projectId: string,
  wrapper: HTMLElement,
  onSaved: () => void,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Log Weather Delay'));

  const form = el('form', 'space-y-4');
  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const row1 = el('div', 'grid grid-cols-3 gap-4');

  const dateGroup = el('div');
  dateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Date'));
  const dateInput = el('input', inputCls) as HTMLInputElement;
  dateInput.type = 'date';
  dateInput.name = 'date';
  dateInput.valueAsDate = new Date();
  dateGroup.appendChild(dateInput);
  row1.appendChild(dateGroup);

  const typeGroup = el('div');
  typeGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Weather Type'));
  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  typeSelect.name = 'type';
  for (const opt of WEATHER_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  typeGroup.appendChild(typeSelect);
  row1.appendChild(typeGroup);

  const hoursGroup = el('div');
  hoursGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Hours Lost'));
  const hoursInput = el('input', inputCls) as HTMLInputElement;
  hoursInput.type = 'number';
  hoursInput.name = 'hoursLost';
  hoursInput.step = '0.5';
  hoursInput.placeholder = '0';
  hoursGroup.appendChild(hoursInput);
  row1.appendChild(hoursGroup);

  form.appendChild(row1);

  const descGroup = el('div');
  descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Description'));
  const descInput = el('textarea', inputCls) as HTMLTextAreaElement;
  descInput.name = 'description';
  descInput.rows = 2;
  descInput.placeholder = 'Describe the weather event and its impact';
  descGroup.appendChild(descInput);
  form.appendChild(descGroup);

  const tasksGroup = el('div');
  tasksGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Impacted Tasks'));
  const tasksInput = el('input', inputCls) as HTMLInputElement;
  tasksInput.type = 'text';
  tasksInput.name = 'impactedTasks';
  tasksInput.placeholder = 'Task IDs or names (comma-separated)';
  tasksGroup.appendChild(tasksInput);
  form.appendChild(tasksGroup);

  const btnRow = el('div', 'flex items-center gap-3');
  const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Log Delay');
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', async () => {
    const date = dateInput.value.trim();
    const type = typeSelect.value;
    const hoursLost = parseFloat(hoursInput.value);

    if (!date) {
      showMsg(wrapper, 'Date is required.', true);
      return;
    }

    if (isNaN(hoursLost) || hoursLost <= 0) {
      showMsg(wrapper, 'Hours lost must be greater than 0.', true);
      return;
    }

    const impactedTasks = tasksInput.value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      const svc = getProjectService();
      await svc.logWeatherDelay({
        projectId,
        date,
        type: type as any,
        hoursLost,
        description: descInput.value.trim() || undefined,
        impactedTasks: impactedTasks.length > 0 ? impactedTasks : undefined,
      });

      // Clear form
      dateInput.valueAsDate = new Date();
      typeSelect.selectedIndex = 0;
      hoursInput.value = '';
      descInput.value = '';
      tasksInput.value = '';

      showMsg(wrapper, 'Weather delay logged successfully.', false);
      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to log weather delay';
      showMsg(wrapper, message, true);
    }
  });
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);

  card.appendChild(form);
  return card;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(delays: WeatherDelayRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Date', 'Type', 'Hours Lost', 'Description', 'Impacted Tasks']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (delays.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No weather delays logged.');
    td.setAttribute('colspan', '5');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const delay of delays) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', delay.date));

    const tdType = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${WEATHER_BADGE[delay.type] ?? WEATHER_BADGE.other}`,
      WEATHER_LABELS[delay.type] ?? delay.type);
    tdType.appendChild(badge);
    tr.appendChild(tdType);

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', `${delay.hoursLost}h`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] max-w-xs truncate', delay.description || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${delay.impactedTasks.length} task(s)`));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const projectId = parseProjectId();

    const wrapper = el('div', 'space-y-4');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleArea = el('div', 'flex items-center gap-3');
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', '\u2190 Back') as HTMLAnchorElement;
    backLink.href = `#/project/${projectId}`;
    titleArea.appendChild(backLink);
    titleArea.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Weather Delays'));
    headerRow.appendChild(titleArea);
    wrapper.appendChild(headerRow);

    // Dynamic slots
    const summarySlot = el('div');
    wrapper.appendChild(summarySlot);

    wrapper.appendChild(buildForm(projectId, wrapper, () => loadData()));

    const tableSlot = el('div');
    wrapper.appendChild(tableSlot);

    container.appendChild(wrapper);

    // State
    let allDelays: WeatherDelayRow[] = [];
    let currentImpact: DelayImpactSummary = {
      totalHoursLost: 0,
      totalDaysLost: 0,
      delaysByType: {},
      impactedTaskCount: 0,
    };

    const renderContent = () => {
      summarySlot.innerHTML = '';
      summarySlot.appendChild(buildSummaryCards(currentImpact));

      tableSlot.innerHTML = '';
      tableSlot.appendChild(buildTable(allDelays));
    };

    // Load data
    const loadData = async () => {
      try {
        const svc = getProjectService();
        const [delays, impact] = await Promise.all([
          svc.getWeatherDelays(projectId),
          svc.calculateDelayImpact(projectId),
        ]);

        allDelays = delays.map((d: any) => ({
          id: d.id ?? '',
          date: d.date ?? '',
          type: d.type ?? 'other',
          hoursLost: d.hoursLost ?? 0,
          description: d.description ?? '',
          impactedTasks: Array.isArray(d.impactedTasks) ? d.impactedTasks : [],
        }));

        currentImpact = {
          totalHoursLost: impact.totalHoursLost ?? 0,
          totalDaysLost: impact.totalDaysLost ?? 0,
          delaysByType: impact.delaysByType ?? {},
          impactedTaskCount: impact.impactedTaskCount ?? 0,
        };

        renderContent();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load weather delays';
        showMsg(wrapper, message, true);
        renderContent();
      }
    };

    // Initial load
    loadData();
  },
};
