/**
 * Remittances view.
 * Lists union remittance reports with union, period, hours,
 * amount, and status workflow (draft -> submitted -> paid).
 * Wired to UnionService for live data.
 */

import { getUnionService } from '../service-accessor';
import type { RemittanceStatus } from '../union-service';

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
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'paid', label: 'Paid' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RemittanceRow {
  id: string;
  unionId: string;
  unionName: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  totalHours: number;
  totalAmount: number;
  employeeCount: number;
  status: string;
}

interface UnionOption {
  id: string;
  name: string;
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
  searchInput.placeholder = 'Search remittances...';
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
// New Remittance Form
// ---------------------------------------------------------------------------

function buildNewForm(
  unions: UnionOption[],
  onAdd: (data: {
    unionId: string;
    periodStart: string;
    periodEnd: string;
    dueDate: string;
    totalHours: number;
    totalAmount: number;
    employeeCount: number;
  }) => void,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Remittance'));

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

  const periodStartInput = el('input', inputCls) as HTMLInputElement;
  periodStartInput.type = 'date';
  periodStartInput.title = 'Period Start';
  grid.appendChild(periodStartInput);

  const periodEndInput = el('input', inputCls) as HTMLInputElement;
  periodEndInput.type = 'date';
  periodEndInput.title = 'Period End';
  grid.appendChild(periodEndInput);

  const dueDateInput = el('input', inputCls) as HTMLInputElement;
  dueDateInput.type = 'date';
  dueDateInput.title = 'Due Date';
  grid.appendChild(dueDateInput);

  const hoursInput = el('input', inputCls) as HTMLInputElement;
  hoursInput.type = 'number';
  hoursInput.step = '0.01';
  hoursInput.placeholder = 'Total Hours';
  grid.appendChild(hoursInput);

  const amountInput = el('input', inputCls) as HTMLInputElement;
  amountInput.type = 'number';
  amountInput.step = '0.01';
  amountInput.placeholder = 'Total Amount';
  grid.appendChild(amountInput);

  const empCountInput = el('input', inputCls) as HTMLInputElement;
  empCountInput.type = 'number';
  empCountInput.step = '1';
  empCountInput.placeholder = 'Employee Count';
  grid.appendChild(empCountInput);

  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Remittance');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => {
    const unionId = unionSelect.value;
    const periodStart = periodStartInput.value;
    const periodEnd = periodEndInput.value;
    if (!unionId || !periodStart || !periodEnd) return;

    onAdd({
      unionId,
      periodStart,
      periodEnd,
      dueDate: dueDateInput.value,
      totalHours: parseFloat(hoursInput.value) || 0,
      totalAmount: parseFloat(amountInput.value) || 0,
      employeeCount: parseInt(empCountInput.value, 10) || 0,
    });

    // Clear form
    unionSelect.value = '';
    periodStartInput.value = '';
    periodEndInput.value = '';
    dueDateInput.value = '';
    hoursInput.value = '';
    amountInput.value = '';
    empCountInput.value = '';
  });
  grid.appendChild(addBtn);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  remittances: RemittanceRow[],
  onSubmit: (id: string) => void,
  onPay: (id: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Union', 'Period Start', 'Period End', 'Due Date', 'Hours', 'Amount', 'Employees', 'Status', 'Actions']) {
    const align = (col === 'Hours' || col === 'Amount' || col === 'Employees') ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (remittances.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No remittance reports found.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const rem of remittances) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', rem.unionName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rem.periodStart));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rem.periodEnd));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rem.dueDate || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', rem.totalHours.toFixed(2)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(rem.totalAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right', String(rem.employeeCount)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rem.status] ?? STATUS_BADGE.draft}`,
      rem.status.charAt(0).toUpperCase() + rem.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (rem.status === 'draft') {
      const submitBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Submit');
      submitBtn.addEventListener('click', () => onSubmit(rem.id));
      tdActions.appendChild(submitBtn);
    }
    if (rem.status === 'submitted') {
      const payBtn = el('button', 'text-emerald-400 hover:underline text-sm mr-2', 'Mark Paid');
      payBtn.addEventListener('click', () => onPay(rem.id));
      tdActions.appendChild(payBtn);
    }
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Union Remittances'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Remittance');
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    const formContainer = el('div', '');
    formContainer.style.display = 'none';
    const tableContainer = el('div', '');

    let currentStatus = '';
    let currentSearch = '';

    // Build union name map
    const unionMap = new Map<string, string>();

    async function loadRemittances(): Promise<void> {
      try {
        const svc = getUnionService();
        const filters: { status?: RemittanceStatus } = {};
        if (currentStatus) filters.status = currentStatus as RemittanceStatus;

        const remittances = await svc.getRemittances(filters);

        // Ensure union map is populated
        if (unionMap.size === 0) {
          const unions = await svc.getUnions();
          for (const u of unions) {
            unionMap.set(u.id, u.name);
          }
        }

        let rows: RemittanceRow[] = remittances.map((r) => ({
          id: r.id,
          unionId: r.unionId,
          unionName: unionMap.get(r.unionId) ?? r.unionId,
          periodStart: r.periodStart,
          periodEnd: r.periodEnd,
          dueDate: r.dueDate ?? '',
          totalHours: r.totalHours,
          totalAmount: r.totalAmount,
          employeeCount: r.employeeCount ?? 0,
          status: r.status,
        }));

        // Apply search filter
        if (currentSearch) {
          const q = currentSearch.toLowerCase();
          rows = rows.filter((r) =>
            r.unionName.toLowerCase().includes(q) ||
            r.periodStart.includes(q) ||
            r.periodEnd.includes(q),
          );
        }

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(
          rows,
          (id) => {
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.submitRemittance(id);
                showMsg(wrapper, 'Remittance submitted.', false);
                void loadRemittances();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to submit remittance';
                showMsg(wrapper, message, true);
              }
            })();
          },
          (id) => {
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.payRemittance(id);
                showMsg(wrapper, 'Remittance marked as paid.', false);
                void loadRemittances();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to mark remittance as paid';
                showMsg(wrapper, message, true);
              }
            })();
          },
        ));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load remittances';
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
                  await svcInner.createRemittance({
                    unionId: data.unionId,
                    periodStart: data.periodStart,
                    periodEnd: data.periodEnd,
                    dueDate: data.dueDate || undefined,
                    totalHours: data.totalHours,
                    totalAmount: data.totalAmount,
                    employeeCount: data.employeeCount,
                  });
                  showMsg(wrapper, 'Remittance created.', false);
                  formContainer.style.display = 'none';
                  void loadRemittances();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to create remittance';
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

    wrapper.appendChild(buildFilterBar((status, search) => {
      currentStatus = status;
      currentSearch = search;
      void loadRemittances();
    }));

    wrapper.appendChild(formContainer);
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // Initial load
    void loadRemittances();
  },
};
