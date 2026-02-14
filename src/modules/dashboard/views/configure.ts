/**
 * Dashboard Configuration view.
 *
 * Provides a dashboard builder/configurator where users can:
 * - Create, edit, and delete dashboards
 * - Add, remove, and reposition widgets
 * - Configure KPI definitions and thresholds
 * - Set default dashboards
 * - Manage saved reports
 *
 * Wired to DashboardService for all CRUD operations.
 */

import { getDashboardService } from '../service-accessor';
import type { KPIResult, PeriodPreset, Dashboard, Widget, KPIDef, KPICategory, KPIFormat, WidgetType, DashboardLayout } from '../dashboard-service';
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

interface DashboardListItem {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  layout: string;
  widgetCount: number;
  isDefault: boolean;
}

interface WidgetListItem {
  [key: string]: unknown;
  id: string;
  type: string;
  title: string;
  kpiCode: string;
  dashboardId: string;
}

interface KPIDefItem {
  [key: string]: unknown;
  id: string;
  code: string;
  name: string;
  category: string;
  formula: string;
  format: string;
  thresholdWarning?: number;
  thresholdCritical?: number;
  higherIsBetter: boolean;
  isBuiltin: boolean;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type ConfigTab = 'dashboards' | 'widgets' | 'kpi-defs';
let activeTab: ConfigTab = 'dashboards';
let selectedDashboardId: string | null = null;

// ---------------------------------------------------------------------------
// Sub-views: Dashboards
// ---------------------------------------------------------------------------

function buildDashboardList(
  dashboards: DashboardListItem[],
  onEdit: (id: string) => void,
  onDelete: (id: string) => void,
  onSelect: (id: string) => void,
): HTMLElement {
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
    const isSelected = dash.id === selectedDashboardId;
    const rowCls = isSelected
      ? 'border-b border-[var(--border)] bg-[var(--accent)]/5'
      : 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors';
    const tr = el('tr', rowCls);

    const tdName = el('td', 'py-2 px-3 font-medium text-[var(--text)] cursor-pointer', dash.name);
    tdName.addEventListener('click', () => onSelect(dash.id));
    tr.appendChild(tdName);

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
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onEdit(dash.id);
    });
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onDelete(dash.id);
    });
    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function buildNewDashboardForm(onSubmit: (data: {
  name: string;
  description: string;
  layout: DashboardLayout;
  isDefault: boolean;
}) => void): HTMLElement {
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
  defaultCheck.id = 'is-default-new';
  defaultGroup.appendChild(defaultCheck);
  const defaultLabel = el('label', 'text-sm text-[var(--text)]', 'Set as default dashboard');
  (defaultLabel as HTMLLabelElement).htmlFor = 'is-default-new';
  defaultGroup.appendChild(defaultLabel);
  form.appendChild(defaultGroup);

  // Submit button
  const btnRow = el('div', 'flex justify-end');
  const createBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create Dashboard');
  createBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;

    onSubmit({
      name,
      description: descInput.value.trim(),
      layout: layoutSelect.value as DashboardLayout,
      isDefault: defaultCheck.checked,
    });

    // Clear form
    nameInput.value = '';
    descInput.value = '';
    layoutSelect.value = 'grid';
    defaultCheck.checked = false;
  });
  btnRow.appendChild(createBtn);
  form.appendChild(btnRow);

  wrap.appendChild(form);
  return wrap;
}

// ---------------------------------------------------------------------------
// Sub-views: Widgets
// ---------------------------------------------------------------------------

function buildWidgetList(
  widgets: WidgetListItem[],
  onRemove: (id: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');

  if (!selectedDashboardId) {
    const msg = el('div', 'p-6 text-center text-[var(--text-muted)]', 'Select a dashboard from the Dashboards tab to manage its widgets.');
    wrap.appendChild(msg);
    return wrap;
  }

  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Title', 'Type', 'KPI Code', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (widgets.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No widgets in this dashboard. Add widgets using the form below.');
    td.setAttribute('colspan', '4');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const widget of widgets) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', widget.title));

    const tdType = el('td', 'py-2 px-3');
    const typeColors: Record<string, string> = {
      kpi_card: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      chart: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      table: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      summary: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      gauge: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      trend: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    };
    tdType.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[widget.type] ?? typeColors.kpi_card}`, widget.type));
    tr.appendChild(tdType);

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', widget.kpiCode || '--'));

    const tdActions = el('td', 'py-2 px-3');
    const removeBtn = el('button', 'text-red-400 hover:underline text-sm', 'Remove');
    removeBtn.addEventListener('click', () => onRemove(widget.id));
    tdActions.appendChild(removeBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function buildAddWidgetForm(onSubmit: (data: {
  type: WidgetType;
  title: string;
  kpiCode: string;
}) => void): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');

  if (!selectedDashboardId) {
    wrap.appendChild(el('div', 'text-center text-[var(--text-muted)]', 'Select a dashboard first to add widgets.'));
    return wrap;
  }

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';
  const form = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4');

  // Type select
  const typeGroup = el('div');
  typeGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Widget Type'));
  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const wt of [
    { value: 'kpi_card', label: 'KPI Card' },
    { value: 'chart', label: 'Chart' },
    { value: 'table', label: 'Table' },
    { value: 'summary', label: 'Summary' },
  ]) {
    const opt = el('option', '', wt.label) as HTMLOptionElement;
    opt.value = wt.value;
    typeSelect.appendChild(opt);
  }
  typeGroup.appendChild(typeSelect);
  form.appendChild(typeGroup);

  // Title input
  const titleGroup = el('div');
  titleGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Widget Title'));
  const titleInput = el('input', inputCls) as HTMLInputElement;
  titleInput.type = 'text';
  titleInput.placeholder = 'e.g. Revenue Overview';
  titleGroup.appendChild(titleInput);
  form.appendChild(titleGroup);

  // KPI Code input
  const kpiGroup = el('div');
  kpiGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'KPI Code'));
  const kpiInput = el('input', inputCls) as HTMLInputElement;
  kpiInput.type = 'text';
  kpiInput.placeholder = 'e.g. revenue_ytd';
  kpiGroup.appendChild(kpiInput);
  form.appendChild(kpiGroup);

  wrap.appendChild(form);

  const btnRow = el('div', 'mt-4 flex justify-end');
  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Widget');
  addBtn.addEventListener('click', () => {
    const title = titleInput.value.trim();
    if (!title) return;

    onSubmit({
      type: typeSelect.value as WidgetType,
      title,
      kpiCode: kpiInput.value.trim(),
    });

    // Clear form
    titleInput.value = '';
    kpiInput.value = '';
    typeSelect.value = 'kpi_card';
  });
  btnRow.appendChild(addBtn);
  wrap.appendChild(btnRow);

  return wrap;
}

function buildWidgetPalette(): HTMLElement {
  const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4');

  const widgetTypes = [
    { type: 'kpi_card', label: 'KPI Card', description: 'Single metric with status and trend' },
    { type: 'chart', label: 'Chart', description: 'Line, bar, pie, or area chart' },
    { type: 'table', label: 'Table', description: 'Tabular data with sorting' },
    { type: 'summary', label: 'Summary', description: 'Aggregated summary panel' },
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
// Sub-views: KPI Definitions
// ---------------------------------------------------------------------------

function buildKPIDefList(
  kpiDefs: KPIDefItem[],
  onDelete: (id: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Code', 'Name', 'Category', 'Formula', 'Format', 'Warning', 'Critical', 'Higher=Better', 'Source', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (kpiDefs.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No KPI definitions. Built-in KPIs are available by default.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const kpi of kpiDefs) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', kpi.code));
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', kpi.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', kpi.category));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono text-xs max-w-[200px] truncate', kpi.formula));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', kpi.format));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', kpi.thresholdWarning !== undefined ? String(kpi.thresholdWarning) : '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', kpi.thresholdCritical !== undefined ? String(kpi.thresholdCritical) : '--'));

    const tdHigher = el('td', 'py-2 px-3');
    const higherBadge = kpi.higherIsBetter
      ? el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Yes')
      : el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20', 'No');
    tdHigher.appendChild(higherBadge);
    tr.appendChild(tdHigher);

    const tdSource = el('td', 'py-2 px-3');
    const sourceLabel = kpi.isBuiltin ? 'Built-in' : 'Custom';
    const sourceCls = kpi.isBuiltin
      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    tdSource.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${sourceCls}`, sourceLabel));
    tr.appendChild(tdSource);

    const tdActions = el('td', 'py-2 px-3');
    if (!kpi.isBuiltin) {
      const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
      deleteBtn.addEventListener('click', () => onDelete(kpi.id));
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

function buildNewKPIDefForm(onSubmit: (data: {
  code: string;
  name: string;
  category: KPICategory;
  formula: string;
  format: KPIFormat;
  thresholdWarning?: number;
  thresholdCritical?: number;
  higherIsBetter: boolean;
}) => void): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';

  const form = el('div', 'space-y-4');

  // Row 1: code, name, category
  const row1 = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4');

  const codeGroup = el('div');
  codeGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'KPI Code'));
  const codeInput = el('input', inputCls) as HTMLInputElement;
  codeInput.type = 'text';
  codeInput.placeholder = 'e.g. custom_metric';
  codeGroup.appendChild(codeInput);
  row1.appendChild(codeGroup);

  const nameGroup = el('div');
  nameGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Name'));
  const nameInput = el('input', inputCls) as HTMLInputElement;
  nameInput.type = 'text';
  nameInput.placeholder = 'e.g. Custom Metric';
  nameGroup.appendChild(nameInput);
  row1.appendChild(nameGroup);

  const catGroup = el('div');
  catGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Category'));
  const catSelect = el('select', inputCls) as HTMLSelectElement;
  for (const cat of [
    { value: 'financial', label: 'Financial' },
    { value: 'operational', label: 'Operational' },
    { value: 'safety', label: 'Safety' },
    { value: 'hr', label: 'HR' },
  ]) {
    const opt = el('option', '', cat.label) as HTMLOptionElement;
    opt.value = cat.value;
    catSelect.appendChild(opt);
  }
  catGroup.appendChild(catSelect);
  row1.appendChild(catGroup);

  form.appendChild(row1);

  // Row 2: formula
  const formulaGroup = el('div');
  formulaGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Formula'));
  const formulaInput = el('input', inputCls) as HTMLInputElement;
  formulaInput.type = 'text';
  formulaInput.placeholder = 'e.g. SUM(field) or manual_entry';
  formulaGroup.appendChild(formulaInput);
  form.appendChild(formulaGroup);

  // Row 3: format, warning, critical, higherIsBetter
  const row3 = el('div', 'grid grid-cols-1 md:grid-cols-4 gap-4');

  const fmtGroup = el('div');
  fmtGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Format'));
  const fmtSelect = el('select', inputCls) as HTMLSelectElement;
  for (const fmt of [
    { value: 'currency', label: 'Currency' },
    { value: 'percent', label: 'Percent' },
    { value: 'number', label: 'Number' },
    { value: 'days', label: 'Days' },
  ]) {
    const opt = el('option', '', fmt.label) as HTMLOptionElement;
    opt.value = fmt.value;
    fmtSelect.appendChild(opt);
  }
  fmtGroup.appendChild(fmtSelect);
  row3.appendChild(fmtGroup);

  const warnGroup = el('div');
  warnGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Warning Threshold'));
  const warnInput = el('input', inputCls) as HTMLInputElement;
  warnInput.type = 'number';
  warnInput.step = 'any';
  warnInput.placeholder = 'Optional';
  warnGroup.appendChild(warnInput);
  row3.appendChild(warnGroup);

  const critGroup = el('div');
  critGroup.appendChild(el('label', 'block text-xs font-medium text-[var(--text-muted)] mb-1', 'Critical Threshold'));
  const critInput = el('input', inputCls) as HTMLInputElement;
  critInput.type = 'number';
  critInput.step = 'any';
  critInput.placeholder = 'Optional';
  critGroup.appendChild(critInput);
  row3.appendChild(critGroup);

  const higherGroup = el('div', 'flex items-end pb-2');
  const higherCheck = el('input') as HTMLInputElement;
  higherCheck.type = 'checkbox';
  higherCheck.checked = true;
  higherCheck.id = 'higher-is-better';
  higherGroup.appendChild(higherCheck);
  const higherLabel = el('label', 'text-sm text-[var(--text)] ml-2', 'Higher is Better');
  (higherLabel as HTMLLabelElement).htmlFor = 'higher-is-better';
  higherGroup.appendChild(higherLabel);
  row3.appendChild(higherGroup);

  form.appendChild(row3);

  // Submit button
  const btnRow = el('div', 'flex justify-end');
  const createBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create KPI Definition');
  createBtn.addEventListener('click', () => {
    const code = codeInput.value.trim();
    const name = nameInput.value.trim();
    const formula = formulaInput.value.trim();
    if (!code || !name || !formula) return;

    const warnVal = parseFloat(warnInput.value);
    const critVal = parseFloat(critInput.value);

    onSubmit({
      code,
      name,
      category: catSelect.value as KPICategory,
      formula,
      format: fmtSelect.value as KPIFormat,
      thresholdWarning: isNaN(warnVal) ? undefined : warnVal,
      thresholdCritical: isNaN(critVal) ? undefined : critVal,
      higherIsBetter: higherCheck.checked,
    });

    // Clear form
    codeInput.value = '';
    nameInput.value = '';
    formulaInput.value = '';
    catSelect.value = 'financial';
    fmtSelect.value = 'currency';
    warnInput.value = '';
    critInput.value = '';
    higherCheck.checked = true;
  });
  btnRow.appendChild(createBtn);
  form.appendChild(btnRow);

  wrap.appendChild(form);
  return wrap;
}

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------

function buildTabBar(onTabChange: (tab: ConfigTab) => void): HTMLElement {
  const bar = el('div', 'flex border-b border-[var(--border)] mb-6');

  const tabs: { key: ConfigTab; label: string }[] = [
    { key: 'dashboards', label: 'Dashboards' },
    { key: 'widgets', label: 'Widgets' },
    { key: 'kpi-defs', label: 'KPI Definitions' },
  ];

  for (const tab of tabs) {
    const isActive = tab.key === activeTab;
    const btnCls = isActive
      ? 'px-4 py-2 text-sm font-medium text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px'
      : 'px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors';
    const btn = el('button', btnCls, tab.label);
    btn.addEventListener('click', () => {
      activeTab = tab.key;
      onTabChange(tab.key);
    });
    bar.appendChild(btn);
  }

  return bar;
}

// ---------------------------------------------------------------------------
// Load & Render
// ---------------------------------------------------------------------------

async function loadAndRender(container: HTMLElement): Promise<void> {
  container.innerHTML = '';
  const wrapper = el('div', 'space-y-0');

  const svc = getDashboardService();

  // Header
  const headerRow = el('div', 'flex items-center justify-between mb-6');
  const titleSection = el('div');
  titleSection.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Configure Dashboard'));
  titleSection.appendChild(el('p', 'text-sm text-[var(--text-muted)] mt-1', 'Manage dashboards, widgets, KPI definitions, and thresholds'));
  headerRow.appendChild(titleSection);
  wrapper.appendChild(headerRow);

  // Tab bar
  const tabBar = buildTabBar(() => loadAndRender(container));
  wrapper.appendChild(tabBar);

  // ---------------------------------------------------------------------------
  // Dashboards tab
  // ---------------------------------------------------------------------------
  if (activeTab === 'dashboards') {
    // Load dashboards
    const dashboardRecords = await svc.getDashboards();
    const dashboards: DashboardListItem[] = [];

    for (const d of dashboardRecords) {
      const widgets = await svc.getWidgets(d.id);
      dashboards.push({
        id: d.id,
        name: d.name,
        description: d.description || '',
        layout: d.layout,
        widgetCount: widgets.length,
        isDefault: d.isDefault,
      });
    }

    // Dashboard list
    const dashList = buildDashboardList(
      dashboards,
      // onEdit
      async (id: string) => {
        const dash = dashboards.find((d) => d.id === id);
        if (!dash) return;

        const newName = prompt('Dashboard name:', dash.name);
        if (newName === null) return;
        const newDesc = prompt('Description:', dash.description);
        if (newDesc === null) return;

        try {
          await svc.updateDashboard(id, {
            name: newName.trim() || dash.name,
            description: newDesc.trim(),
          } as Partial<Dashboard>);
          showMsg(wrapper, `Dashboard "${newName.trim() || dash.name}" updated.`, false);
          await loadAndRender(container);
        } catch (err) {
          showMsg(wrapper, `Failed to update dashboard: ${err instanceof Error ? err.message : String(err)}`, true);
        }
      },
      // onDelete
      async (id: string) => {
        const dash = dashboards.find((d) => d.id === id);
        if (!dash) return;
        if (!confirm(`Delete dashboard "${dash.name}"? All widgets will be removed.`)) return;

        try {
          await svc.deleteDashboard(id);
          if (selectedDashboardId === id) selectedDashboardId = null;
          showMsg(wrapper, `Dashboard "${dash.name}" deleted.`, false);
          await loadAndRender(container);
        } catch (err) {
          showMsg(wrapper, `Failed to delete dashboard: ${err instanceof Error ? err.message : String(err)}`, true);
        }
      },
      // onSelect
      (id: string) => {
        selectedDashboardId = id;
        activeTab = 'widgets';
        loadAndRender(container);
      },
    );
    wrapper.appendChild(buildSection('Dashboards', dashList));

    // New dashboard form
    const newForm = buildNewDashboardForm(async (data) => {
      try {
        await svc.createDashboard({
          name: data.name,
          description: data.description,
          layout: data.layout,
          isDefault: data.isDefault,
        });
        showMsg(wrapper, `Dashboard "${data.name}" created.`, false);
        await loadAndRender(container);
      } catch (err) {
        showMsg(wrapper, `Failed to create dashboard: ${err instanceof Error ? err.message : String(err)}`, true);
      }
    });
    wrapper.appendChild(buildSection('Create Dashboard', newForm));
  }

  // ---------------------------------------------------------------------------
  // Widgets tab
  // ---------------------------------------------------------------------------
  if (activeTab === 'widgets') {
    // Show selected dashboard info
    if (selectedDashboardId) {
      const dashRecord = await svc.getDashboard(selectedDashboardId);
      if (dashRecord) {
        const infoBar = el('div', 'p-3 mb-4 rounded-md text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20');
        infoBar.textContent = `Managing widgets for: ${dashRecord.name}`;
        wrapper.appendChild(infoBar);
      } else {
        selectedDashboardId = null;
      }
    }

    // Widget palette
    wrapper.appendChild(buildSection('Available Widget Types', buildWidgetPalette()));

    // Current widgets list
    let widgets: WidgetListItem[] = [];
    if (selectedDashboardId) {
      const widgetRecords = await svc.getWidgets(selectedDashboardId);
      widgets = widgetRecords.map((w) => ({
        id: w.id,
        type: w.type,
        title: w.title,
        kpiCode: w.config?.kpiCode || '',
        dashboardId: w.dashboardId,
      }));
    }

    const widgetList = buildWidgetList(
      widgets,
      async (id: string) => {
        const widget = widgets.find((w) => w.id === id);
        if (!widget) return;
        if (!confirm(`Remove widget "${widget.title}"?`)) return;

        try {
          await svc.removeWidget(id);
          showMsg(wrapper, `Widget "${widget.title}" removed.`, false);
          await loadAndRender(container);
        } catch (err) {
          showMsg(wrapper, `Failed to remove widget: ${err instanceof Error ? err.message : String(err)}`, true);
        }
      },
    );
    wrapper.appendChild(buildSection('Dashboard Widgets', widgetList));

    // Add widget form
    const addForm = buildAddWidgetForm(async (data) => {
      if (!selectedDashboardId) {
        showMsg(wrapper, 'Select a dashboard first.', true);
        return;
      }

      try {
        await svc.addWidget({
          dashboardId: selectedDashboardId,
          type: data.type,
          title: data.title,
          config: data.kpiCode ? { kpiCode: data.kpiCode } : {},
        });
        showMsg(wrapper, `Widget "${data.title}" added.`, false);
        await loadAndRender(container);
      } catch (err) {
        showMsg(wrapper, `Failed to add widget: ${err instanceof Error ? err.message : String(err)}`, true);
      }
    });
    wrapper.appendChild(buildSection('Add Widget', addForm));

    // Dashboard selector if none selected
    if (!selectedDashboardId) {
      const dashboardRecords = await svc.getDashboards();
      if (dashboardRecords.length > 0) {
        const selectWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
        selectWrap.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-3', 'Select a dashboard to manage its widgets:'));
        const selectCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';
        const dashSelect = el('select', selectCls) as HTMLSelectElement;
        const emptyOpt = el('option', '', '-- Choose a dashboard --') as HTMLOptionElement;
        emptyOpt.value = '';
        dashSelect.appendChild(emptyOpt);
        for (const d of dashboardRecords) {
          const opt = el('option', '', d.name) as HTMLOptionElement;
          opt.value = d.id;
          dashSelect.appendChild(opt);
        }
        dashSelect.addEventListener('change', () => {
          if (dashSelect.value) {
            selectedDashboardId = dashSelect.value;
            loadAndRender(container);
          }
        });
        selectWrap.appendChild(dashSelect);
        wrapper.appendChild(buildSection('Select Dashboard', selectWrap));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // KPI Definitions tab
  // ---------------------------------------------------------------------------
  if (activeTab === 'kpi-defs') {
    // Load all KPI defs (builtin + custom)
    const builtinDefs = svc.getBuiltinKPIDefs();
    const customDefs = await svc.getKPIDefs();

    const kpiDefs: KPIDefItem[] = [];

    // Add builtin defs
    for (const d of builtinDefs) {
      kpiDefs.push({
        id: `builtin-${d.code}`,
        code: d.code,
        name: d.name,
        category: d.category,
        formula: d.formula,
        format: d.format,
        thresholdWarning: d.thresholdWarning,
        thresholdCritical: d.thresholdCritical,
        higherIsBetter: d.higherIsBetter,
        isBuiltin: true,
      });
    }

    // Add custom defs
    for (const d of customDefs) {
      kpiDefs.push({
        id: d.id,
        code: d.code,
        name: d.name,
        category: d.category,
        formula: d.formula,
        format: d.format,
        thresholdWarning: d.thresholdWarning,
        thresholdCritical: d.thresholdCritical,
        higherIsBetter: d.higherIsBetter,
        isBuiltin: false,
      });
    }

    // KPI defs table
    const kpiList = buildKPIDefList(
      kpiDefs,
      async (id: string) => {
        const kpi = kpiDefs.find((k) => k.id === id);
        if (!kpi) return;
        if (!confirm(`Delete KPI definition "${kpi.name}" (${kpi.code})?`)) return;

        try {
          await svc.deleteKPIDef(id);
          showMsg(wrapper, `KPI definition "${kpi.name}" deleted.`, false);
          await loadAndRender(container);
        } catch (err) {
          showMsg(wrapper, `Failed to delete KPI definition: ${err instanceof Error ? err.message : String(err)}`, true);
        }
      },
    );
    wrapper.appendChild(buildSection('KPI Definitions', kpiList));

    // New KPI definition form
    const newKPIForm = buildNewKPIDefForm(async (data) => {
      try {
        await svc.createKPIDef({
          code: data.code,
          name: data.name,
          category: data.category,
          formula: data.formula,
          format: data.format,
          thresholdWarning: data.thresholdWarning,
          thresholdCritical: data.thresholdCritical,
          higherIsBetter: data.higherIsBetter,
        });
        showMsg(wrapper, `KPI definition "${data.name}" created.`, false);
        await loadAndRender(container);
      } catch (err) {
        showMsg(wrapper, `Failed to create KPI definition: ${err instanceof Error ? err.message : String(err)}`, true);
      }
    });
    wrapper.appendChild(buildSection('Create KPI Definition', newKPIForm));
  }

  container.appendChild(wrapper);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    // Show loading state
    const loading = el('div', 'flex items-center justify-center py-12 text-[var(--text-muted)]', 'Loading configuration...');
    container.appendChild(loading);

    loadAndRender(container).catch((err) => {
      container.innerHTML = '';
      const wrapper = el('div', 'space-y-0');
      showMsg(wrapper, `Failed to load configuration: ${err instanceof Error ? err.message : String(err)}`, true);
      container.appendChild(wrapper);
    });
  },
};
