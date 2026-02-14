/**
 * Apprentices view.
 * Lists apprentice records with union, trade, period progress,
 * ratio compliance, and status. Supports filtering, CRUD, and
 * compliance checking.
 * Wired to UnionService for live data.
 */

import { getUnionService } from '../service-accessor';
import type { ApprenticeStatus } from '../union-service';

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'terminated', label: 'Terminated' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  terminated: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApprenticeRow {
  id: string;
  employeeId: string;
  unionId: string;
  unionName: string;
  trade: string;
  startDate: string;
  periodNumber: number;
  totalPeriods: number;
  currentRatio: number;
  requiredRatio: number;
  isCompliant: boolean;
  status: string;
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
  searchInput.placeholder = 'Search apprentices...';
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
// New Apprentice Form
// ---------------------------------------------------------------------------

function buildNewForm(
  unions: { id: string; name: string }[],
  onAdd: (data: {
    employeeId: string;
    unionId: string;
    trade: string;
    startDate: string;
    periodNumber: number;
    totalPeriods: number;
    currentRatio: number;
    requiredRatio: number;
  }) => void,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'New Apprentice'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const grid = el('div', 'grid grid-cols-4 gap-3');

  const employeeIdInput = el('input', inputCls) as HTMLInputElement;
  employeeIdInput.placeholder = 'Employee ID';
  employeeIdInput.name = 'employeeId';
  grid.appendChild(employeeIdInput);

  const unionSelect = el('select', inputCls) as HTMLSelectElement;
  const defaultOpt = el('option', '', 'Select Union') as HTMLOptionElement;
  defaultOpt.value = '';
  unionSelect.appendChild(defaultOpt);
  for (const u of unions) {
    const o = el('option', '', u.name) as HTMLOptionElement;
    o.value = u.id;
    unionSelect.appendChild(o);
  }
  grid.appendChild(unionSelect);

  const tradeInput = el('input', inputCls) as HTMLInputElement;
  tradeInput.placeholder = 'Trade';
  tradeInput.name = 'trade';
  grid.appendChild(tradeInput);

  const startDateInput = el('input', inputCls) as HTMLInputElement;
  startDateInput.type = 'date';
  startDateInput.name = 'startDate';
  startDateInput.title = 'Start Date';
  grid.appendChild(startDateInput);

  const periodNumberInput = el('input', inputCls) as HTMLInputElement;
  periodNumberInput.type = 'number';
  periodNumberInput.min = '1';
  periodNumberInput.placeholder = 'Period Number';
  periodNumberInput.name = 'periodNumber';
  grid.appendChild(periodNumberInput);

  const totalPeriodsInput = el('input', inputCls) as HTMLInputElement;
  totalPeriodsInput.type = 'number';
  totalPeriodsInput.min = '1';
  totalPeriodsInput.placeholder = 'Total Periods';
  totalPeriodsInput.name = 'totalPeriods';
  grid.appendChild(totalPeriodsInput);

  const currentRatioInput = el('input', inputCls) as HTMLInputElement;
  currentRatioInput.type = 'number';
  currentRatioInput.step = '0.01';
  currentRatioInput.placeholder = 'Current Ratio';
  currentRatioInput.name = 'currentRatio';
  grid.appendChild(currentRatioInput);

  const requiredRatioInput = el('input', inputCls) as HTMLInputElement;
  requiredRatioInput.type = 'number';
  requiredRatioInput.step = '0.01';
  requiredRatioInput.placeholder = 'Required Ratio';
  requiredRatioInput.name = 'requiredRatio';
  grid.appendChild(requiredRatioInput);

  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Apprentice');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => {
    const employeeId = employeeIdInput.value.trim();
    const unionId = unionSelect.value;
    const trade = tradeInput.value.trim();
    const startDate = startDateInput.value;
    const periodNumber = parseInt(periodNumberInput.value, 10) || 0;
    const totalPeriods = parseInt(totalPeriodsInput.value, 10) || 0;

    if (!employeeId || !unionId || !trade || !startDate || periodNumber <= 0 || totalPeriods <= 0) return;

    onAdd({
      employeeId,
      unionId,
      trade,
      startDate,
      periodNumber,
      totalPeriods,
      currentRatio: parseFloat(currentRatioInput.value) || 0,
      requiredRatio: parseFloat(requiredRatioInput.value) || 0,
    });

    // Clear form
    employeeIdInput.value = '';
    unionSelect.value = '';
    tradeInput.value = '';
    startDateInput.value = '';
    periodNumberInput.value = '';
    totalPeriodsInput.value = '';
    currentRatioInput.value = '';
    requiredRatioInput.value = '';
  });
  grid.appendChild(addBtn);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  apprentices: ApprenticeRow[],
  onEdit: (appr: ApprenticeRow) => void,
  onDelete: (id: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Employee ID', 'Union', 'Trade', 'Start Date', 'Period', 'Current Ratio', 'Required Ratio', 'Compliant', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (apprentices.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No apprentice records found.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const appr of apprentices) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', appr.employeeId));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', appr.unionName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', appr.trade));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', appr.startDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', `${appr.periodNumber} / ${appr.totalPeriods}`));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', `${appr.currentRatio.toFixed(2)}`));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', `${appr.requiredRatio.toFixed(2)}`));

    const tdCompliant = el('td', 'py-2 px-3');
    if (appr.isCompliant) {
      tdCompliant.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Yes'));
    } else {
      tdCompliant.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20', 'No'));
    }
    tr.appendChild(tdCompliant);

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[appr.status] ?? STATUS_BADGE.active}`,
      appr.status.charAt(0).toUpperCase() + appr.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3 flex gap-2');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Edit');
    editBtn.addEventListener('click', () => onEdit(appr));
    tdActions.appendChild(editBtn);
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', () => onDelete(appr.id));
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Apprentices'));

    const newToggleBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Apprentice');
    newToggleBtn.type = 'button';
    headerRow.appendChild(newToggleBtn);
    wrapper.appendChild(headerRow);

    let currentStatus = '';
    let currentSearch = '';
    let formVisible = false;

    const formContainer = el('div', '');
    const tableContainer = el('div', '');

    // Union name cache for resolving unionId -> name
    const unionNameMap = new Map<string, string>();

    async function resolveUnionName(unionId: string): Promise<string> {
      if (unionNameMap.has(unionId)) return unionNameMap.get(unionId)!;
      try {
        const svc = getUnionService();
        const union = await svc.getUnion(unionId);
        const name = union ? union.name : unionId;
        unionNameMap.set(unionId, name);
        return name;
      } catch {
        return unionId;
      }
    }

    newToggleBtn.addEventListener('click', () => {
      formVisible = !formVisible;
      formContainer.innerHTML = '';
      if (formVisible) {
        // Load unions for the select dropdown
        void (async () => {
          try {
            const svc = getUnionService();
            const unions = await svc.getUnions();
            const unionList = unions.map((u) => ({ id: u.id, name: u.name }));
            formContainer.appendChild(buildNewForm(unionList, (data) => {
              void (async () => {
                try {
                  const svcInner = getUnionService();
                  await svcInner.createApprentice({
                    employeeId: data.employeeId,
                    unionId: data.unionId,
                    trade: data.trade,
                    startDate: data.startDate,
                    periodNumber: data.periodNumber,
                    totalPeriods: data.totalPeriods,
                    currentRatio: data.currentRatio,
                    requiredRatio: data.requiredRatio,
                  });
                  showMsg(wrapper, 'Apprentice created.', false);
                  void loadApprentices();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to create apprentice';
                  showMsg(wrapper, message, true);
                }
              })();
            }));
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load unions';
            showMsg(wrapper, message, true);
          }
        })();
      }
    });

    async function loadApprentices(): Promise<void> {
      try {
        const svc = getUnionService();
        const filters: { status?: ApprenticeStatus } = {};
        if (currentStatus) filters.status = currentStatus as ApprenticeStatus;

        const apprentices = await svc.getApprentices(filters);

        // Get compliance data
        const compliance = await svc.checkApprenticeCompliance();
        const complianceMap = new Map<string, boolean>();
        for (const c of compliance) {
          complianceMap.set(c.apprenticeId, c.isCompliant);
        }

        // Resolve union names
        const rows: ApprenticeRow[] = [];
        for (const a of apprentices) {
          const unionName = await resolveUnionName(a.unionId);
          const currentRatio = a.currentRatio ?? 0;
          const requiredRatio = a.requiredRatio ?? 0;
          // Use compliance check result if available, otherwise compute locally
          const isCompliant = complianceMap.has(a.id)
            ? complianceMap.get(a.id)!
            : (requiredRatio === 0 || currentRatio >= requiredRatio);

          rows.push({
            id: a.id,
            employeeId: a.employeeId,
            unionId: a.unionId,
            unionName,
            trade: a.trade,
            startDate: a.startDate,
            periodNumber: a.periodNumber,
            totalPeriods: a.totalPeriods,
            currentRatio,
            requiredRatio,
            isCompliant,
            status: a.status,
          });
        }

        // Client-side search filter
        let filtered = rows;
        if (currentSearch) {
          const q = currentSearch.toLowerCase();
          filtered = rows.filter((r) =>
            r.employeeId.toLowerCase().includes(q) ||
            r.unionName.toLowerCase().includes(q) ||
            r.trade.toLowerCase().includes(q),
          );
        }

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(
          filtered,
          (appr) => {
            // Inline edit via prompts for key fields
            const newPeriod = prompt('Enter new period number:', String(appr.periodNumber));
            if (newPeriod === null) return;
            const newCurrentRatio = prompt('Enter new current ratio:', String(appr.currentRatio));
            if (newCurrentRatio === null) return;
            const newRequiredRatio = prompt('Enter new required ratio:', String(appr.requiredRatio));
            if (newRequiredRatio === null) return;
            const newStatus = prompt('Enter new status (active/completed/terminated):', appr.status);
            if (newStatus === null) return;
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.updateApprentice(appr.id, {
                  periodNumber: parseInt(newPeriod, 10) || appr.periodNumber,
                  currentRatio: parseFloat(newCurrentRatio) || appr.currentRatio,
                  requiredRatio: parseFloat(newRequiredRatio) || appr.requiredRatio,
                  status: (newStatus as ApprenticeStatus) || appr.status,
                });
                showMsg(wrapper, 'Apprentice updated.', false);
                void loadApprentices();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to update apprentice';
                showMsg(wrapper, message, true);
              }
            })();
          },
          (id) => {
            if (!confirm('Are you sure you want to delete this apprentice record?')) return;
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.updateApprentice(id, { status: 'terminated' });
                showMsg(wrapper, 'Apprentice terminated.', false);
                void loadApprentices();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to delete apprentice';
                showMsg(wrapper, message, true);
              }
            })();
          },
        ));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load apprentices';
        showMsg(wrapper, message, true);
      }
    }

    wrapper.appendChild(buildFilterBar((status, search) => {
      currentStatus = status;
      currentSearch = search;
      void loadApprentices();
    }));

    wrapper.appendChild(formContainer);
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // Initial load
    void loadApprentices();
  },
};
