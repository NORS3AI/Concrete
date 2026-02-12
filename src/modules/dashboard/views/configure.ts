/**
 * Dashboard Configuration view.
 *
 * Provides a dashboard builder/configurator where users can:
 * - Create, edit, and delete dashboards
 * - Add, remove, and reposition widgets
 * - Configure KPI definitions and thresholds
 * - Set default dashboards
 * - Manage saved reports
 */

import {
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

interface DashboardListItem {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  layout: string;
  widgetCount: number;
  isDefault: boolean;
}

interface KPIDefItem {
  [key: string]: unknown;
  id: string;
  code: string;
  name: string;
  category: string;
  format: string;
  isBuiltin: boolean;
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function buildDashboardList(dashboards: DashboardListItem[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Description', 'Layout', 'Widgets', 'Default', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (dashboards.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No dashboards configured. Create your first dashboard to get started.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const dash of dashboards) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', dash.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', dash.description));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', dash.layout));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', dash.widgetCount.toString()));

    const tdDefault = el('td', 'py-2 px-3');
    if (dash.isDefault) {
      tdDefault.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Default'));
    } else {
      tdDefault.appendChild(el('span', 'text-[var(--text-muted)] text-xs', '--'));
    }
    tr.appendChild(tdDefault);

    const tdActions = el('td', 'py-2 px-3');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-3', 'Edit');
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function buildNewDashboardForm(): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';

  const form = el('div', 'space-y-4');

  // Name field
  const nameGroup = el('div');
  nameGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Dashboard Name'));
  const nameInput = el('input', inputCls) as HTMLInputElement;
  nameInput.type = 'text';
  nameInput.placeholder = 'e.g. Executive Overview';
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  // Description field
  const descGroup = el('div');
  descGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Description'));
  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.type = 'text';
  descInput.placeholder = 'Brief description of the dashboard';
  descGroup.appendChild(descInput);
  form.appendChild(descGroup);

  // Layout selector
  const layoutGroup = el('div');
  layoutGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Layout'));
  const layoutSelect = el('select', inputCls) as HTMLSelectElement;
  for (const layout of [
    { value: 'grid', label: 'Grid' },
    { value: 'list', label: 'List' },
    { value: 'free', label: 'Free Form' },
  ]) {
    const opt = el('option', '', layout.label) as HTMLOptionElement;
    opt.value = layout.value;
    layoutSelect.appendChild(opt);
  }
  layoutGroup.appendChild(layoutSelect);
  form.appendChild(layoutGroup);

  // Default checkbox
  const defaultGroup = el('div', 'flex items-center gap-2');
  const defaultCheck = el('input') as HTMLInputElement;
  defaultCheck.type = 'checkbox';
  defaultCheck.id = 'is-default';
  defaultGroup.appendChild(defaultCheck);
  const defaultLabel = el('label', 'text-sm text-[var(--text)]', 'Set as default dashboard');
  (defaultLabel as HTMLLabelElement).htmlFor = 'is-default';
  defaultGroup.appendChild(defaultLabel);
  form.appendChild(defaultGroup);

  // Submit button
  const btnRow = el('div', 'flex justify-end');
  const createBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create Dashboard');
  btnRow.appendChild(createBtn);
  form.appendChild(btnRow);

  wrap.appendChild(form);
  return wrap;
}

function buildKPIDefList(kpiDefs: KPIDefItem[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Code', 'Name', 'Category', 'Format', 'Source', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (kpiDefs.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No KPI definitions. Built-in KPIs are available by default.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const kpi of kpiDefs) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', kpi.code));
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', kpi.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', kpi.category));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', kpi.format));

    const tdSource = el('td', 'py-2 px-3');
    const sourceLabel = kpi.isBuiltin ? 'Built-in' : 'Custom';
    const sourceCls = kpi.isBuiltin
      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    tdSource.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${sourceCls}`, sourceLabel));
    tr.appendChild(tdSource);

    const tdActions = el('td', 'py-2 px-3');
    if (!kpi.isBuiltin) {
      const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-3', 'Edit');
      const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
      tdActions.appendChild(editBtn);
      tdActions.appendChild(deleteBtn);
    } else {
      tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'Read-only'));
    }
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function buildWidgetPalette(): HTMLElement {
  const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4');

  const widgetTypes = [
    { type: 'kpi_card', label: 'KPI Card', description: 'Single metric with status and trend' },
    { type: 'chart', label: 'Chart', description: 'Line, bar, pie, or area chart' },
    { type: 'table', label: 'Table', description: 'Tabular data with sorting' },
    { type: 'gauge', label: 'Gauge', description: 'Circular gauge with thresholds' },
    { type: 'trend', label: 'Trend', description: 'Sparkline trend indicator' },
  ];

  for (const wt of widgetTypes) {
    const card = el('div', 'p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer text-center');
    card.appendChild(el('div', 'text-sm font-medium text-[var(--text)] mb-1', wt.label));
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)]', wt.description));
    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const titleSection = el('div');
    titleSection.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Configure Dashboard'));
    titleSection.appendChild(el('p', 'text-sm text-[var(--text-muted)] mt-1', 'Manage dashboards, widgets, KPI definitions, and thresholds'));
    headerRow.appendChild(titleSection);
    wrapper.appendChild(headerRow);

    // Dashboards section
    const dashboards: DashboardListItem[] = [];
    wrapper.appendChild(buildSection('Dashboards', buildDashboardList(dashboards)));

    // New dashboard form
    wrapper.appendChild(buildSection('Create Dashboard', buildNewDashboardForm()));

    // Widget palette
    wrapper.appendChild(buildSection('Available Widget Types', buildWidgetPalette()));

    // KPI definitions
    const kpiDefs: KPIDefItem[] = [];
    wrapper.appendChild(buildSection('KPI Definitions', buildKPIDefList(kpiDefs)));

    container.appendChild(wrapper);
  },
};
