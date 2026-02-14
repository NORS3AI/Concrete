/**
 * Rate Tables view.
 * Lists union rate tables with classification, effective dates, and status.
 * Supports inline create, edit, delete, and line item management.
 * Wired to UnionService for live data.
 */

import { getUnionService } from '../service-accessor';
import type { RateTableStatus, RateLineCategory, RateLineMethod, RateLinePayableTo } from '../union-service';

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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
];

const RT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const CATEGORY_OPTIONS: { value: RateLineCategory; label: string }[] = [
  { value: 'base_wage', label: 'Base Wage' },
  { value: 'fringe', label: 'Fringe' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'training', label: 'Training' },
  { value: 'pension', label: 'Pension' },
  { value: 'annuity', label: 'Annuity' },
  { value: 'health', label: 'Health' },
  { value: 'other', label: 'Other' },
];

const METHOD_OPTIONS: { value: RateLineMethod; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'percent', label: 'Percent' },
  { value: 'flat', label: 'Flat' },
];

const PAYABLE_TO_OPTIONS: { value: RateLinePayableTo; label: string }[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'fund', label: 'Fund' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateTableRow {
  id: string;
  unionId: string;
  unionName: string;
  name: string;
  classification: string;
  effectiveDate: string;
  expirationDate: string;
  journeymanRate: number;
  apprenticePct: number;
  status: string;
}

interface LineRow {
  id: string;
  category: string;
  description: string;
  rate: number;
  method: string;
  payableTo: string;
  fundName: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search rate tables...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => onFilter(statusSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// New Rate Table Form
// ---------------------------------------------------------------------------

function buildNewRateTableForm(
  unionOptions: { value: string; label: string }[],
  onAdd: (data: {
    unionId: string;
    name: string;
    classification: string;
    effectiveDate: string;
    expirationDate: string;
    journeymanRate: number;
    apprenticePct: number;
    status: string;
  }) => void,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Rate Table'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const grid = el('div', 'grid grid-cols-4 gap-3');

  const unionSelect = el('select', inputCls) as HTMLSelectElement;
  unionSelect.name = 'unionId';
  const defaultOpt = el('option', '', 'Select Union') as HTMLOptionElement;
  defaultOpt.value = '';
  unionSelect.appendChild(defaultOpt);
  for (const opt of unionOptions) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    unionSelect.appendChild(o);
  }
  grid.appendChild(unionSelect);

  const nameInput = el('input', inputCls) as HTMLInputElement;
  nameInput.placeholder = 'Table Name';
  nameInput.name = 'name';
  grid.appendChild(nameInput);

  const classInput = el('input', inputCls) as HTMLInputElement;
  classInput.placeholder = 'Classification';
  classInput.name = 'classification';
  grid.appendChild(classInput);

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

  const jRateInput = el('input', inputCls) as HTMLInputElement;
  jRateInput.type = 'number';
  jRateInput.step = '0.01';
  jRateInput.placeholder = 'Journeyman Rate';
  jRateInput.name = 'journeymanRate';
  grid.appendChild(jRateInput);

  const appPctInput = el('input', inputCls) as HTMLInputElement;
  appPctInput.type = 'number';
  appPctInput.step = '0.01';
  appPctInput.placeholder = 'Apprentice %';
  appPctInput.name = 'apprenticePct';
  grid.appendChild(appPctInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  statusSelect.name = 'status';
  for (const opt of RT_STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  grid.appendChild(statusSelect);

  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Table');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => {
    const unionId = unionSelect.value;
    const name = nameInput.value.trim();
    const classification = classInput.value.trim();
    const effectiveDate = effDateInput.value;
    if (!unionId || !name || !classification || !effectiveDate) return;

    onAdd({
      unionId,
      name,
      classification,
      effectiveDate,
      expirationDate: expDateInput.value,
      journeymanRate: parseFloat(jRateInput.value) || 0,
      apprenticePct: parseFloat(appPctInput.value) || 0,
      status: statusSelect.value,
    });

    // Clear form
    unionSelect.value = '';
    nameInput.value = '';
    classInput.value = '';
    effDateInput.value = '';
    expDateInput.value = '';
    jRateInput.value = '';
    appPctInput.value = '';
    statusSelect.value = 'active';
  });
  grid.appendChild(addBtn);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Line Items Section
// ---------------------------------------------------------------------------

function buildLineItemsSection(
  rateTableId: string,
  wrapper: HTMLElement,
  onChanged: () => void,
): HTMLElement {
  const section = el('div', 'mt-2 ml-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg');
  section.appendChild(el('h4', 'text-sm font-semibold text-[var(--text)] mb-3', 'Line Items'));

  const linesContainer = el('div', '');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  // Add line form
  const addForm = el('div', 'grid grid-cols-6 gap-2 mb-3');

  const catSelect = el('select', inputCls) as HTMLSelectElement;
  catSelect.name = 'category';
  for (const opt of CATEGORY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    catSelect.appendChild(o);
  }
  addForm.appendChild(catSelect);

  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.placeholder = 'Description';
  descInput.name = 'description';
  addForm.appendChild(descInput);

  const rateInput = el('input', inputCls) as HTMLInputElement;
  rateInput.type = 'number';
  rateInput.step = '0.01';
  rateInput.placeholder = 'Rate';
  rateInput.name = 'rate';
  addForm.appendChild(rateInput);

  const methodSelect = el('select', inputCls) as HTMLSelectElement;
  methodSelect.name = 'method';
  for (const opt of METHOD_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    methodSelect.appendChild(o);
  }
  addForm.appendChild(methodSelect);

  const payableSelect = el('select', inputCls) as HTMLSelectElement;
  payableSelect.name = 'payableTo';
  for (const opt of PAYABLE_TO_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    payableSelect.appendChild(o);
  }
  addForm.appendChild(payableSelect);

  const fundInput = el('input', inputCls) as HTMLInputElement;
  fundInput.placeholder = 'Fund Name';
  fundInput.name = 'fundName';
  addForm.appendChild(fundInput);

  const addLineBtn = el('button', 'px-3 py-2 rounded-md text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Line');
  addLineBtn.type = 'button';
  addLineBtn.addEventListener('click', () => {
    const rate = parseFloat(rateInput.value) || 0;
    if (rate <= 0) return;

    void (async () => {
      try {
        const svc = getUnionService();
        await svc.addRateTableLine({
          rateTableId,
          category: catSelect.value as RateLineCategory,
          description: descInput.value.trim() || undefined,
          rate,
          method: methodSelect.value as RateLineMethod,
          payableTo: payableSelect.value as RateLinePayableTo,
          fundName: fundInput.value.trim() || undefined,
        });
        showMsg(wrapper, 'Line item added.', false);
        // Clear inputs
        catSelect.value = 'base_wage';
        descInput.value = '';
        rateInput.value = '';
        methodSelect.value = 'hourly';
        payableSelect.value = 'employee';
        fundInput.value = '';
        void loadLines();
        onChanged();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add line item';
        showMsg(wrapper, message, true);
      }
    })();
  });
  addForm.appendChild(addLineBtn);

  section.appendChild(addForm);
  section.appendChild(linesContainer);

  async function loadLines(): Promise<void> {
    try {
      const svc = getUnionService();
      const lines = await svc.getRateTableLines(rateTableId);

      linesContainer.innerHTML = '';

      if (lines.length === 0) {
        linesContainer.appendChild(el('p', 'text-sm text-[var(--text-muted)] py-2', 'No line items. Add one above.'));
        return;
      }

      const table = el('table', 'w-full text-sm');
      const thead = el('thead');
      const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
      for (const col of ['Category', 'Description', 'Rate', 'Method', 'Payable To', 'Fund Name', '']) {
        const align = col === 'Rate' ? 'py-1 px-2 font-medium text-right' : 'py-1 px-2 font-medium';
        headRow.appendChild(el('th', align, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      for (const line of lines) {
        const tr = el('tr', 'border-b border-[var(--border)]');
        const catLabel = CATEGORY_OPTIONS.find((c) => c.value === line.category)?.label ?? line.category;
        tr.appendChild(el('td', 'py-1 px-2 text-[var(--text)]', catLabel));
        tr.appendChild(el('td', 'py-1 px-2 text-[var(--text-muted)]', line.description ?? ''));
        tr.appendChild(el('td', 'py-1 px-2 text-right font-mono', fmtCurrency(line.rate)));
        const methodLabel = METHOD_OPTIONS.find((m) => m.value === line.method)?.label ?? line.method;
        tr.appendChild(el('td', 'py-1 px-2 text-[var(--text-muted)]', methodLabel));
        const payLabel = PAYABLE_TO_OPTIONS.find((p) => p.value === line.payableTo)?.label ?? line.payableTo;
        tr.appendChild(el('td', 'py-1 px-2 text-[var(--text-muted)]', payLabel));
        tr.appendChild(el('td', 'py-1 px-2 text-[var(--text-muted)]', line.fundName ?? ''));

        const tdAction = el('td', 'py-1 px-2');
        const delBtn = el('button', 'text-red-400 hover:underline text-xs', 'Delete');
        delBtn.addEventListener('click', () => {
          if (!confirm('Delete this line item?')) return;
          void (async () => {
            try {
              const svcInner = getUnionService();
              await svcInner.removeRateTableLine(line.id);
              showMsg(wrapper, 'Line item removed.', false);
              void loadLines();
              onChanged();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to remove line item';
              showMsg(wrapper, message, true);
            }
          })();
        });
        tdAction.appendChild(delBtn);
        tr.appendChild(tdAction);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      linesContainer.appendChild(table);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load line items';
      showMsg(wrapper, message, true);
    }
  }

  // Initial load
  void loadLines();

  return section;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  tables: RateTableRow[],
  wrapper: HTMLElement,
  onEdit: (rt: RateTableRow) => void,
  onDelete: (id: string) => void,
  onRefresh: () => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Union', 'Name', 'Classification', 'Effective', 'Expiration', 'Journeyman Rate', 'Apprentice %', 'Status', 'Actions']) {
    const align = (col === 'Journeyman Rate' || col === 'Apprentice %') ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (tables.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No rate tables found.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const rt of tables) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', rt.unionName));
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', rt.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rt.classification));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rt.effectiveDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rt.expirationDate || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(rt.journeymanRate)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', `${rt.apprenticePct}%`));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rt.status] ?? STATUS_BADGE.active}`,
      rt.status.charAt(0).toUpperCase() + rt.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3 flex gap-2');

    const viewLinesBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'View Lines');
    let linesExpanded = false;
    let linesSection: HTMLElement | null = null;
    viewLinesBtn.addEventListener('click', () => {
      if (linesExpanded && linesSection) {
        linesSection.remove();
        linesSection = null;
        linesExpanded = false;
        viewLinesBtn.textContent = 'View Lines';
      } else {
        linesSection = buildLineItemsSection(rt.id, wrapper, onRefresh);
        tr.after((() => {
          const lineTr = el('tr');
          const lineTd = el('td', 'p-0');
          lineTd.setAttribute('colspan', '9');
          lineTd.appendChild(linesSection!);
          lineTr.appendChild(lineTd);
          return lineTr;
        })());
        linesExpanded = true;
        viewLinesBtn.textContent = 'Hide Lines';
      }
    });
    tdActions.appendChild(viewLinesBtn);

    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Edit');
    editBtn.addEventListener('click', () => onEdit(rt));
    tdActions.appendChild(editBtn);

    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', () => onDelete(rt.id));
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Rate Tables'));
    wrapper.appendChild(headerRow);

    const formContainer = el('div', '');
    const tableContainer = el('div', '');

    // Current filter state
    let currentStatus = '';
    let currentSearch = '';

    // Union name cache
    const unionNameCache = new Map<string, string>();

    async function resolveUnionName(unionId: string): Promise<string> {
      if (unionNameCache.has(unionId)) return unionNameCache.get(unionId)!;
      try {
        const svc = getUnionService();
        const union = await svc.getUnion(unionId);
        const name = union ? union.name : unionId;
        unionNameCache.set(unionId, name);
        return name;
      } catch {
        return unionId;
      }
    }

    async function loadRateTables(): Promise<void> {
      try {
        const svc = getUnionService();
        const filters: { status?: RateTableStatus } = {};
        if (currentStatus) filters.status = currentStatus as RateTableStatus;

        let tables = await svc.getRateTables(filters);

        // Client-side search filtering
        if (currentSearch) {
          const term = currentSearch.toLowerCase();
          tables = tables.filter((rt) => {
            const name = (rt.name ?? '').toLowerCase();
            const classification = (rt.classification ?? '').toLowerCase();
            return name.includes(term) || classification.includes(term);
          });
        }

        // Resolve union names
        const rows: RateTableRow[] = [];
        for (const rt of tables) {
          const unionName = await resolveUnionName(rt.unionId);
          rows.push({
            id: rt.id,
            unionId: rt.unionId,
            unionName,
            name: rt.name,
            classification: rt.classification,
            effectiveDate: rt.effectiveDate,
            expirationDate: rt.expirationDate ?? '',
            journeymanRate: rt.journeymanRate ?? 0,
            apprenticePct: rt.apprenticePct ?? 0,
            status: rt.status,
          });
        }

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(
          rows,
          wrapper,
          (rt) => {
            // Inline edit via prompt
            const newName = prompt('Enter new name:', rt.name);
            if (newName === null) return;
            const newJRate = prompt('Enter new journeyman rate:', String(rt.journeymanRate));
            if (newJRate === null) return;
            const newAppPct = prompt('Enter new apprentice %:', String(rt.apprenticePct));
            if (newAppPct === null) return;
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.updateRateTable(rt.id, {
                  name: newName.trim() || rt.name,
                  journeymanRate: parseFloat(newJRate) || rt.journeymanRate,
                  apprenticePct: parseFloat(newAppPct) || rt.apprenticePct,
                });
                showMsg(wrapper, 'Rate table updated.', false);
                void loadRateTables();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to update rate table';
                showMsg(wrapper, message, true);
              }
            })();
          },
          (id) => {
            if (!confirm('Are you sure you want to delete this rate table?')) return;
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.updateRateTable(id, { status: 'expired' as RateTableStatus });
                showMsg(wrapper, 'Rate table marked as expired.', false);
                void loadRateTables();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to delete rate table';
                showMsg(wrapper, message, true);
              }
            })();
          },
          () => void loadRateTables(),
        ));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load rate tables';
        showMsg(wrapper, message, true);
      }
    }

    // Build new rate table form after loading unions
    void (async () => {
      try {
        const svc = getUnionService();
        const unions = await svc.getUnions({ status: 'active' });
        const unionOptions = unions.map((u) => ({ value: u.id, label: `${u.name} (${u.localNumber})` }));

        // Cache all union names
        for (const u of unions) {
          unionNameCache.set(u.id, u.name);
        }

        formContainer.innerHTML = '';
        formContainer.appendChild(buildNewRateTableForm(unionOptions, (data) => {
          void (async () => {
            try {
              const svcInner = getUnionService();
              await svcInner.createRateTable({
                unionId: data.unionId,
                name: data.name,
                classification: data.classification,
                effectiveDate: data.effectiveDate,
                expirationDate: data.expirationDate || undefined,
                journeymanRate: data.journeymanRate,
                apprenticePct: data.apprenticePct,
                status: (data.status || 'active') as RateTableStatus,
              });
              showMsg(wrapper, 'Rate table created.', false);
              void loadRateTables();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to create rate table';
              showMsg(wrapper, message, true);
            }
          })();
        }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load unions for form';
        showMsg(wrapper, message, true);
      }
    })();

    wrapper.appendChild(buildFilterBar((status, search) => {
      currentStatus = status;
      currentSearch = search;
      void loadRateTables();
    }));

    wrapper.appendChild(formContainer);
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // Initial load
    void loadRateTables();
  },
};
