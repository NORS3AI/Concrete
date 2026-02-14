/**
 * Fringe Benefits view.
 * Lists fringe benefit configurations per union with allocation method,
 * rate, fund details, and payable-to information.
 * Wired to UnionService for live data.
 */

import { getUnionService } from '../service-accessor';
import type { FringeMethod, FringePayableTo, FringeAllocationMethod } from '../union-service';

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

const ALLOCATION_OPTIONS = [
  { value: '', label: 'All Allocations' },
  { value: 'cash', label: 'Cash' },
  { value: 'plan', label: 'Plan' },
  { value: 'split', label: 'Split' },
];

const ALLOCATION_BADGE: Record<string, string> = {
  cash: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  plan: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  split: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const METHOD_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'percent', label: 'Percent' },
];

const PAYABLE_TO_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'fund', label: 'Fund' },
];

const ALLOCATION_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'plan', label: 'Plan' },
  { value: 'split', label: 'Split' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FringeRow {
  id: string;
  unionId: string;
  unionName: string;
  name: string;
  rate: number;
  method: string;
  payableTo: string;
  allocationMethod: string;
  fundName: string;
  fundAccountNumber: string;
}

interface UnionOption {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (allocation: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search fringe benefits...';
  bar.appendChild(searchInput);

  const allocSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of ALLOCATION_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    allocSelect.appendChild(o);
  }
  bar.appendChild(allocSelect);

  const fire = () => onFilter(allocSelect.value, searchInput.value);
  allocSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// New Fringe Benefit Form
// ---------------------------------------------------------------------------

function buildNewForm(
  unions: UnionOption[],
  onAdd: (data: {
    unionId: string;
    name: string;
    rate: number;
    method: FringeMethod;
    payableTo: FringePayableTo;
    allocationMethod: FringeAllocationMethod;
    fundName: string;
    fundAddress: string;
    fundAccountNumber: string;
  }) => void,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Fringe Benefit'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const grid = el('div', 'grid grid-cols-4 gap-3');

  const unionSelect = el('select', inputCls) as HTMLSelectElement;
  const defaultOpt = el('option', '', 'Select union...') as HTMLOptionElement;
  defaultOpt.value = '';
  unionSelect.appendChild(defaultOpt);
  for (const u of unions) {
    const o = el('option', '', u.name) as HTMLOptionElement;
    o.value = u.id;
    unionSelect.appendChild(o);
  }
  grid.appendChild(unionSelect);

  const nameInput = el('input', inputCls) as HTMLInputElement;
  nameInput.placeholder = 'Benefit Name';
  grid.appendChild(nameInput);

  const rateInput = el('input', inputCls) as HTMLInputElement;
  rateInput.type = 'number';
  rateInput.step = '0.01';
  rateInput.placeholder = 'Rate';
  grid.appendChild(rateInput);

  const methodSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of METHOD_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    methodSelect.appendChild(o);
  }
  grid.appendChild(methodSelect);

  const payableToSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of PAYABLE_TO_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    payableToSelect.appendChild(o);
  }
  grid.appendChild(payableToSelect);

  const allocMethodSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of ALLOCATION_METHOD_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    allocMethodSelect.appendChild(o);
  }
  grid.appendChild(allocMethodSelect);

  const fundNameInput = el('input', inputCls) as HTMLInputElement;
  fundNameInput.placeholder = 'Fund Name';
  grid.appendChild(fundNameInput);

  const fundAddressInput = el('input', inputCls) as HTMLInputElement;
  fundAddressInput.placeholder = 'Fund Address';
  grid.appendChild(fundAddressInput);

  const fundAccountInput = el('input', inputCls) as HTMLInputElement;
  fundAccountInput.placeholder = 'Fund Account #';
  grid.appendChild(fundAccountInput);

  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Benefit');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => {
    const unionId = unionSelect.value;
    const name = nameInput.value.trim();
    const rate = parseFloat(rateInput.value) || 0;
    if (!unionId || !name || rate <= 0) return;

    onAdd({
      unionId,
      name,
      rate,
      method: methodSelect.value as FringeMethod,
      payableTo: payableToSelect.value as FringePayableTo,
      allocationMethod: allocMethodSelect.value as FringeAllocationMethod,
      fundName: fundNameInput.value.trim(),
      fundAddress: fundAddressInput.value.trim(),
      fundAccountNumber: fundAccountInput.value.trim(),
    });

    // Clear form
    unionSelect.value = '';
    nameInput.value = '';
    rateInput.value = '';
    fundNameInput.value = '';
    fundAddressInput.value = '';
    fundAccountInput.value = '';
  });
  grid.appendChild(addBtn);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  fringes: FringeRow[],
  onEdit: (fringe: FringeRow) => void,
  onDelete: (id: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Union', 'Benefit', 'Rate', 'Method', 'Payable To', 'Allocation', 'Fund Name', 'Account #', 'Actions']) {
    const align = col === 'Rate' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (fringes.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No fringe benefits configured.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const fringe of fringes) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', fringe.unionName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', fringe.name));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(fringe.rate)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fringe.method));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fringe.payableTo));

    const tdAlloc = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${ALLOCATION_BADGE[fringe.allocationMethod] ?? ALLOCATION_BADGE.cash}`,
      fringe.allocationMethod.charAt(0).toUpperCase() + fringe.allocationMethod.slice(1));
    tdAlloc.appendChild(badge);
    tr.appendChild(tdAlloc);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fringe.fundName || '--'));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', fringe.fundAccountNumber || '--'));

    const tdActions = el('td', 'py-2 px-3');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit');
    editBtn.addEventListener('click', () => onEdit(fringe));
    tdActions.appendChild(editBtn);
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', () => onDelete(fringe.id));
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Fringe Benefits'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Fringe Benefit');
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    const formContainer = el('div', '');
    formContainer.style.display = 'none';
    const tableContainer = el('div', '');

    let currentAllocation = '';
    let currentSearch = '';

    // Build union name map
    const unionMap = new Map<string, string>();

    async function loadFringes(): Promise<void> {
      try {
        const svc = getUnionService();
        const fringes = await svc.getFringeBenefits();

        // Ensure union map is populated
        if (unionMap.size === 0) {
          const unions = await svc.getUnions();
          for (const u of unions) {
            unionMap.set(u.id, u.name);
          }
        }

        let rows: FringeRow[] = fringes.map((f) => ({
          id: f.id,
          unionId: f.unionId,
          unionName: unionMap.get(f.unionId) ?? f.unionId,
          name: f.name,
          rate: f.rate,
          method: f.method,
          payableTo: f.payableTo,
          allocationMethod: f.allocationMethod,
          fundName: f.fundName ?? '',
          fundAccountNumber: f.fundAccountNumber ?? '',
        }));

        // Apply allocation filter
        if (currentAllocation) {
          rows = rows.filter((r) => r.allocationMethod === currentAllocation);
        }

        // Apply search filter
        if (currentSearch) {
          const q = currentSearch.toLowerCase();
          rows = rows.filter((r) =>
            r.unionName.toLowerCase().includes(q) ||
            r.name.toLowerCase().includes(q) ||
            r.fundName.toLowerCase().includes(q),
          );
        }

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(
          rows,
          (fringe) => {
            // Inline edit via prompt
            const newRate = prompt('Enter new rate:', String(fringe.rate));
            if (newRate === null) return;
            const newName = prompt('Enter new name:', fringe.name);
            if (newName === null) return;
            const newAlloc = prompt('Enter allocation method (cash/plan/split):', fringe.allocationMethod);
            if (newAlloc === null) return;
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.updateFringeBenefit(fringe.id, {
                  rate: parseFloat(newRate) || fringe.rate,
                  name: newName || fringe.name,
                  allocationMethod: (newAlloc as FringeAllocationMethod) || fringe.allocationMethod,
                });
                showMsg(wrapper, 'Fringe benefit updated.', false);
                void loadFringes();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to update fringe benefit';
                showMsg(wrapper, message, true);
              }
            })();
          },
          (id) => {
            if (!confirm('Are you sure you want to delete this fringe benefit?')) return;
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.deleteFringeBenefit(id);
                showMsg(wrapper, 'Fringe benefit deleted.', false);
                void loadFringes();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to delete fringe benefit';
                showMsg(wrapper, message, true);
              }
            })();
          },
        ));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load fringe benefits';
        showMsg(wrapper, message, true);
      }
    }

    // Toggle new form
    newBtn.addEventListener('click', () => {
      if (formContainer.style.display === 'none') {
        formContainer.style.display = '';
        void (async () => {
          try {
            const svc = getUnionService();
            const unions = await svc.getUnions();
            const opts: UnionOption[] = unions.map((u) => ({ id: u.id, name: u.name }));
            formContainer.innerHTML = '';
            formContainer.appendChild(buildNewForm(opts, (data) => {
              void (async () => {
                try {
                  const svcInner = getUnionService();
                  await svcInner.createFringeBenefit({
                    unionId: data.unionId,
                    name: data.name,
                    rate: data.rate,
                    method: data.method,
                    payableTo: data.payableTo,
                    allocationMethod: data.allocationMethod,
                    fundName: data.fundName || undefined,
                    fundAddress: data.fundAddress || undefined,
                    fundAccountNumber: data.fundAccountNumber || undefined,
                  });
                  showMsg(wrapper, 'Fringe benefit created.', false);
                  formContainer.style.display = 'none';
                  void loadFringes();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to create fringe benefit';
                  showMsg(wrapper, message, true);
                }
              })();
            }));
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load unions';
            showMsg(wrapper, message, true);
          }
        })();
      } else {
        formContainer.style.display = 'none';
      }
    });

    wrapper.appendChild(buildFilterBar((allocation, search) => {
      currentAllocation = allocation;
      currentSearch = search;
      void loadFringes();
    }));

    wrapper.appendChild(formContainer);
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // Initial load
    void loadFringes();
  },
};
