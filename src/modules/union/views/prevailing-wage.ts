/**
 * Prevailing Wage view.
 * Lists prevailing wage rate tables by jurisdiction, classification,
 * and source. Supports filtering, CRUD, and Davis-Bacon compliance tracking.
 * Wired to UnionService for live data.
 */

import { getUnionService } from '../service-accessor';
import type { PrevailingWageProjectType, PrevailingWageSource } from '../union-service';

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
// Constants
// ---------------------------------------------------------------------------

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'davis_bacon', label: 'Davis-Bacon (Federal)' },
  { value: 'state', label: 'State' },
  { value: 'local', label: 'Local' },
];

const PROJECT_TYPE_OPTIONS = [
  { value: '', label: 'All Project Types' },
  { value: 'federal', label: 'Federal' },
  { value: 'state', label: 'State' },
  { value: 'local', label: 'Local' },
];

const SOURCE_BADGE: Record<string, string> = {
  davis_bacon: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  state: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  local: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrevailingWageRow {
  id: string;
  jurisdiction: string;
  state: string;
  county: string;
  projectType: string;
  classification: string;
  trade: string;
  baseRate: number;
  fringeRate: number;
  totalRate: number;
  effectiveDate: string;
  expirationDate: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (source: string, projectType: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search by jurisdiction, classification...';
  bar.appendChild(searchInput);

  const sourceSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of SOURCE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    sourceSelect.appendChild(o);
  }
  bar.appendChild(sourceSelect);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of PROJECT_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fire = () => onFilter(sourceSelect.value, typeSelect.value, searchInput.value);
  sourceSelect.addEventListener('change', fire);
  typeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// New Prevailing Wage Form
// ---------------------------------------------------------------------------

function buildNewForm(onAdd: (data: {
  jurisdiction: string;
  state: string;
  county: string;
  projectType: PrevailingWageProjectType;
  classification: string;
  trade: string;
  baseRate: number;
  fringeRate: number;
  effectiveDate: string;
  expirationDate: string;
  source: PrevailingWageSource;
}) => void): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Prevailing Wage'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const grid = el('div', 'grid grid-cols-4 gap-3');

  const jurisdictionInput = el('input', inputCls) as HTMLInputElement;
  jurisdictionInput.placeholder = 'Jurisdiction';
  jurisdictionInput.name = 'jurisdiction';
  grid.appendChild(jurisdictionInput);

  const stateInput = el('input', inputCls) as HTMLInputElement;
  stateInput.placeholder = 'State (e.g., CA)';
  stateInput.name = 'state';
  grid.appendChild(stateInput);

  const countyInput = el('input', inputCls) as HTMLInputElement;
  countyInput.placeholder = 'County (optional)';
  countyInput.name = 'county';
  grid.appendChild(countyInput);

  const projectTypeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of [
    { value: 'federal', label: 'Federal' },
    { value: 'state', label: 'State' },
    { value: 'local', label: 'Local' },
  ]) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    projectTypeSelect.appendChild(o);
  }
  grid.appendChild(projectTypeSelect);

  const classificationInput = el('input', inputCls) as HTMLInputElement;
  classificationInput.placeholder = 'Classification';
  classificationInput.name = 'classification';
  grid.appendChild(classificationInput);

  const tradeInput = el('input', inputCls) as HTMLInputElement;
  tradeInput.placeholder = 'Trade';
  tradeInput.name = 'trade';
  grid.appendChild(tradeInput);

  const baseRateInput = el('input', inputCls) as HTMLInputElement;
  baseRateInput.type = 'number';
  baseRateInput.step = '0.01';
  baseRateInput.placeholder = 'Base Rate';
  baseRateInput.name = 'baseRate';
  grid.appendChild(baseRateInput);

  const fringeRateInput = el('input', inputCls) as HTMLInputElement;
  fringeRateInput.type = 'number';
  fringeRateInput.step = '0.01';
  fringeRateInput.placeholder = 'Fringe Rate';
  fringeRateInput.name = 'fringeRate';
  grid.appendChild(fringeRateInput);

  const effDateInput = el('input', inputCls) as HTMLInputElement;
  effDateInput.type = 'date';
  effDateInput.name = 'effectiveDate';
  effDateInput.title = 'Effective Date';
  grid.appendChild(effDateInput);

  const expDateInput = el('input', inputCls) as HTMLInputElement;
  expDateInput.type = 'date';
  expDateInput.name = 'expirationDate';
  expDateInput.title = 'Expiration Date';
  grid.appendChild(expDateInput);

  const sourceSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of [
    { value: 'davis_bacon', label: 'Davis-Bacon' },
    { value: 'state', label: 'State' },
    { value: 'local', label: 'Local' },
  ]) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    sourceSelect.appendChild(o);
  }
  grid.appendChild(sourceSelect);

  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Wage');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => {
    const jurisdiction = jurisdictionInput.value.trim();
    const stateVal = stateInput.value.trim();
    const classification = classificationInput.value.trim();
    const trade = tradeInput.value.trim();
    const baseRate = parseFloat(baseRateInput.value) || 0;
    const fringeRate = parseFloat(fringeRateInput.value) || 0;
    const effectiveDate = effDateInput.value;

    if (!jurisdiction || !stateVal || !classification || !trade || !effectiveDate) return;

    onAdd({
      jurisdiction,
      state: stateVal,
      county: countyInput.value.trim(),
      projectType: projectTypeSelect.value as PrevailingWageProjectType,
      classification,
      trade,
      baseRate,
      fringeRate,
      effectiveDate,
      expirationDate: expDateInput.value,
      source: sourceSelect.value as PrevailingWageSource,
    });

    // Clear form
    jurisdictionInput.value = '';
    stateInput.value = '';
    countyInput.value = '';
    classificationInput.value = '';
    tradeInput.value = '';
    baseRateInput.value = '';
    fringeRateInput.value = '';
    effDateInput.value = '';
    expDateInput.value = '';
  });
  grid.appendChild(addBtn);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  wages: PrevailingWageRow[],
  onEdit: (wage: PrevailingWageRow) => void,
  onDelete: (id: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Jurisdiction', 'State', 'County', 'Type', 'Classification', 'Trade', 'Base Rate', 'Fringe', 'Total', 'Effective', 'Source', 'Actions']) {
    const align = (col === 'Base Rate' || col === 'Fringe' || col === 'Total') ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (wages.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No prevailing wage records found. Import a schedule to get started.');
    td.setAttribute('colspan', '12');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const wage of wages) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', wage.jurisdiction));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wage.state));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wage.county || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wage.projectType));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', wage.classification));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wage.trade));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(wage.baseRate)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(wage.fringeRate)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-bold', fmtCurrency(wage.totalRate)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wage.effectiveDate));

    const tdSource = el('td', 'py-2 px-3');
    const sourceLabel = wage.source === 'davis_bacon' ? 'Davis-Bacon' : wage.source.charAt(0).toUpperCase() + wage.source.slice(1);
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_BADGE[wage.source] ?? SOURCE_BADGE.state}`, sourceLabel);
    tdSource.appendChild(badge);
    tr.appendChild(tdSource);

    const tdActions = el('td', 'py-2 px-3 flex gap-2');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Edit');
    editBtn.addEventListener('click', () => onEdit(wage));
    tdActions.appendChild(editBtn);
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', () => onDelete(wage.id));
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

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
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Prevailing Wage Rates'));
    const importBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Import Schedule');
    importBtn.type = 'button';
    importBtn.addEventListener('click', () => {
      showMsg(wrapper, 'Use Import Wizard for CSV import of prevailing wage schedules.', false);
    });
    headerRow.appendChild(importBtn);
    wrapper.appendChild(headerRow);

    let currentSource = '';
    let currentProjectType = '';
    let currentSearch = '';

    const tableContainer = el('div', '');

    async function loadWages(): Promise<void> {
      try {
        const svc = getUnionService();
        const filters: { source?: PrevailingWageSource; projectType?: PrevailingWageProjectType } = {};
        if (currentSource) filters.source = currentSource as PrevailingWageSource;
        if (currentProjectType) filters.projectType = currentProjectType as PrevailingWageProjectType;

        const wages = await svc.getPrevailingWages(filters);

        let rows: PrevailingWageRow[] = wages.map((w) => ({
          id: w.id,
          jurisdiction: w.jurisdiction,
          state: w.state,
          county: w.county ?? '',
          projectType: w.projectType,
          classification: w.classification,
          trade: w.trade,
          baseRate: w.baseRate,
          fringeRate: w.fringeRate,
          totalRate: w.totalRate,
          effectiveDate: w.effectiveDate,
          expirationDate: w.expirationDate ?? '',
          source: w.source,
        }));

        // Client-side search filter
        if (currentSearch) {
          const q = currentSearch.toLowerCase();
          rows = rows.filter((r) =>
            r.jurisdiction.toLowerCase().includes(q) ||
            r.classification.toLowerCase().includes(q) ||
            r.trade.toLowerCase().includes(q) ||
            r.state.toLowerCase().includes(q) ||
            r.county.toLowerCase().includes(q),
          );
        }

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(
          rows,
          (wage) => {
            // Inline edit via prompt for base/fringe rates
            const newBase = prompt('Enter new base rate:', String(wage.baseRate));
            if (newBase === null) return;
            const newFringe = prompt('Enter new fringe rate:', String(wage.fringeRate));
            if (newFringe === null) return;
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.updatePrevailingWage(wage.id, {
                  baseRate: parseFloat(newBase) || wage.baseRate,
                  fringeRate: parseFloat(newFringe) || wage.fringeRate,
                });
                showMsg(wrapper, 'Prevailing wage updated.', false);
                void loadWages();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to update prevailing wage';
                showMsg(wrapper, message, true);
              }
            })();
          },
          (id) => {
            if (!confirm('Are you sure you want to delete this prevailing wage record?')) return;
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.deletePrevailingWage(id);
                showMsg(wrapper, 'Prevailing wage deleted.', false);
                void loadWages();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to delete prevailing wage';
                showMsg(wrapper, message, true);
              }
            })();
          },
        ));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load prevailing wages';
        showMsg(wrapper, message, true);
      }
    }

    wrapper.appendChild(buildFilterBar((source, projectType, search) => {
      currentSource = source;
      currentProjectType = projectType;
      currentSearch = search;
      void loadWages();
    }));

    wrapper.appendChild(buildNewForm((data) => {
      void (async () => {
        try {
          const svc = getUnionService();
          await svc.createPrevailingWage({
            jurisdiction: data.jurisdiction,
            state: data.state,
            county: data.county || undefined,
            projectType: data.projectType,
            classification: data.classification,
            trade: data.trade,
            baseRate: data.baseRate,
            fringeRate: data.fringeRate,
            effectiveDate: data.effectiveDate,
            expirationDate: data.expirationDate || undefined,
            source: data.source,
          });
          showMsg(wrapper, 'Prevailing wage created.', false);
          void loadWages();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create prevailing wage';
          showMsg(wrapper, message, true);
        }
      })();
    }));

    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // Initial load
    void loadWages();
  },
};
