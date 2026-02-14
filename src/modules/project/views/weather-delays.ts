/**
 * Weather Delays view.
 * Weather delay log with date, type, hours lost, description, and impact analysis.
 */

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
  impactedTaskCount: number;
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
  grid.appendChild(buildCard('Delay Events', String(Object.values(impact.delaysByType).length), 'text-[var(--text)]'));

  return grid;
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function buildForm(): HTMLElement {
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
  saveBtn.addEventListener('click', () => { /* save placeholder */ });
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
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] max-w-xs truncate', delay.description));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${delay.impactedTaskCount} task(s)`));

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
    const wrapper = el('div', 'space-y-4');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Weather Delays'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Project') as HTMLAnchorElement;
    backLink.href = '#/project/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const defaultImpact: DelayImpactSummary = {
      totalHoursLost: 0,
      totalDaysLost: 0,
      delaysByType: {},
      impactedTaskCount: 0,
    };
    wrapper.appendChild(buildSummaryCards(defaultImpact));
    wrapper.appendChild(buildForm());

    const delays: WeatherDelayRow[] = [];
    wrapper.appendChild(buildTable(delays));

    container.appendChild(wrapper);
  },
};
