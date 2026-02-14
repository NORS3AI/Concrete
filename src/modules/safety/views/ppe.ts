/**
 * PPE Tracking view.
 * Displays a filterable table of PPE records with summary statistics,
 * condition tracking, and the ability to issue new PPE or update
 * condition per item. Wired to SafetyService for data persistence.
 */

import { getSafetyService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(
  tag: string,
  attrs?: Record<string, string> | null,
  ...children: (string | HTMLElement)[]
): HTMLElement {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') node.className = v;
      else node.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', { className: cls }, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PPE_TYPE_OPTIONS = [
  { value: '', label: 'All PPE Types' },
  { value: 'hard_hat', label: 'Hard Hat' },
  { value: 'safety_glasses', label: 'Safety Glasses' },
  { value: 'gloves', label: 'Gloves' },
  { value: 'vest', label: 'Vest' },
  { value: 'boots', label: 'Boots' },
  { value: 'harness', label: 'Harness' },
  { value: 'respirator', label: 'Respirator' },
  { value: 'ear_protection', label: 'Ear Protection' },
  { value: 'face_shield', label: 'Face Shield' },
  { value: 'other', label: 'Other' },
];

const CONDITION_OPTIONS = [
  { value: '', label: 'All Conditions' },
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'replace', label: 'Replace' },
  { value: 'retired', label: 'Retired' },
];

const CONDITION_BADGE: Record<string, string> = {
  new: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  good: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  fair: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  replace: 'bg-red-500/10 text-red-400 border border-red-500/20',
  retired: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const COLUMNS = [
  'Employee', 'PPE Type', 'Brand', 'Serial #', 'Issued Date',
  'Expiration', 'Condition', 'Last Inspection', 'Actions',
];

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', { className: 'max-w-7xl mx-auto' });

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';
    const thCls =
      'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    const tdCls = 'px-4 py-3 text-sm text-[var(--text)]';
    const trCls = 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]';

    // ---- Header ----
    const headerRow = el('div', { className: 'flex items-center justify-between mb-6' },
      el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'PPE Tracking'),
    );
    const issueBtn = el('button', { className: btnCls, type: 'button' }, 'Issue PPE');
    headerRow.appendChild(issueBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Stats ----
    const statsRow = el('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-6' });
    const statCardCls = 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4';
    const statLabelCls = 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider';
    const statValueCls = 'text-2xl font-bold text-[var(--text)] mt-1';

    const totalCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Total PPE Items'),
      el('div', { className: statValueCls + ' stat-total' }, '...'),
    );
    const newCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'New'),
      el('div', { className: statValueCls + ' stat-new' }, '...'),
    );
    const replaceCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Need Replacement'),
      el('div', { className: statValueCls + ' stat-replace text-red-400' }, '...'),
    );
    const retiredCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Retired'),
      el('div', { className: statValueCls + ' stat-retired text-[var(--text-muted)]' }, '...'),
    );
    statsRow.appendChild(totalCard);
    statsRow.appendChild(newCard);
    statsRow.appendChild(replaceCard);
    statsRow.appendChild(retiredCard);
    wrapper.appendChild(statsRow);

    // ---- Filter Bar ----
    const bar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });

    const searchInput = document.createElement('input') as HTMLInputElement;
    searchInput.className = inputCls;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by employee name/ID...';
    bar.appendChild(searchInput);

    const typeSelect = document.createElement('select') as HTMLSelectElement;
    typeSelect.className = inputCls;
    for (const opt of PPE_TYPE_OPTIONS) {
      const o = document.createElement('option') as HTMLOptionElement;
      o.value = opt.value;
      o.textContent = opt.label;
      typeSelect.appendChild(o);
    }
    bar.appendChild(typeSelect);

    const conditionSelect = document.createElement('select') as HTMLSelectElement;
    conditionSelect.className = inputCls;
    for (const opt of CONDITION_OPTIONS) {
      const o = document.createElement('option') as HTMLOptionElement;
      o.value = opt.value;
      o.textContent = opt.label;
      conditionSelect.appendChild(o);
    }
    bar.appendChild(conditionSelect);

    wrapper.appendChild(bar);

    // ---- Loading Indicator ----
    const loadingEl = el('div', { className: 'text-sm text-[var(--text-muted)] py-8 text-center' }, 'Loading PPE records...');
    wrapper.appendChild(loadingEl);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Data & Rendering ----
    type PPERow = {
      id: string;
      employeeId: string;
      employeeName?: string;
      ppeType: string;
      brand?: string;
      serialNumber?: string;
      issuedDate: string;
      expirationDate?: string;
      condition: string;
      lastInspectionDate?: string;
    };

    let allRecords: PPERow[] = [];

    function updateStats(records: PPERow[]): void {
      const totalEl = wrapper.querySelector('.stat-total');
      const newEl = wrapper.querySelector('.stat-new');
      const replaceEl = wrapper.querySelector('.stat-replace');
      const retiredEl = wrapper.querySelector('.stat-retired');

      if (totalEl) totalEl.textContent = String(records.length);
      if (newEl) newEl.textContent = String(records.filter((r) => r.condition === 'new').length);
      if (replaceEl) replaceEl.textContent = String(records.filter((r) => r.condition === 'replace').length);
      if (retiredEl) retiredEl.textContent = String(records.filter((r) => r.condition === 'retired').length);
    }

    function getFilteredRecords(): PPERow[] {
      let filtered = [...allRecords];
      const search = searchInput.value.toLowerCase().trim();
      const typeVal = typeSelect.value;
      const condVal = conditionSelect.value;

      if (typeVal) {
        filtered = filtered.filter((r) => r.ppeType === typeVal);
      }
      if (condVal) {
        filtered = filtered.filter((r) => r.condition === condVal);
      }
      if (search) {
        filtered = filtered.filter((r) =>
          (r.employeeName ?? '').toLowerCase().includes(search) ||
          r.employeeId.toLowerCase().includes(search),
        );
      }

      return filtered;
    }

    function formatPPEType(type: string): string {
      return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    function formatCondition(condition: string): string {
      return condition.charAt(0).toUpperCase() + condition.slice(1);
    }

    function renderTable(): void {
      tableContainer.innerHTML = '';
      const filtered = getFilteredRecords();

      const wrap = el('div', { className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden' });
      const table = el('table', { className: 'w-full text-sm' });

      // Header
      const thead = el('thead');
      const headRow = el('tr', { className: 'border-b border-[var(--border)]' });
      for (const col of COLUMNS) {
        headRow.appendChild(el('th', { className: thCls }, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      // Body
      const tbody = el('tbody');

      if (filtered.length === 0) {
        const tr = el('tr');
        const td = el('td', { className: 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', colspan: String(COLUMNS.length) },
          'No PPE records found. Issue PPE to get started.',
        );
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const row of filtered) {
        const tr = el('tr', { className: trCls });

        // Employee
        const empText = row.employeeName ? `${row.employeeName} (${row.employeeId})` : row.employeeId;
        tr.appendChild(el('td', { className: tdCls + ' font-medium' }, empText));

        // PPE Type
        tr.appendChild(el('td', { className: tdCls }, formatPPEType(row.ppeType)));

        // Brand
        tr.appendChild(el('td', { className: tdCls }, row.brand || '-'));

        // Serial #
        tr.appendChild(el('td', { className: tdCls + ' font-mono' }, row.serialNumber || '-'));

        // Issued Date
        tr.appendChild(el('td', { className: tdCls + ' text-[var(--text-muted)]' }, row.issuedDate));

        // Expiration
        tr.appendChild(el('td', { className: tdCls + ' text-[var(--text-muted)]' }, row.expirationDate || '-'));

        // Condition badge
        const tdCond = el('td', { className: tdCls });
        const badgeCls = CONDITION_BADGE[row.condition] ?? CONDITION_BADGE.good;
        tdCond.appendChild(
          el('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}` }, formatCondition(row.condition)),
        );
        tr.appendChild(tdCond);

        // Last Inspection
        tr.appendChild(el('td', { className: tdCls + ' text-[var(--text-muted)]' }, row.lastInspectionDate || '-'));

        // Actions
        const tdActions = el('td', { className: tdCls });
        const updateBtn = el('button', { className: 'text-[var(--accent)] hover:underline text-sm', type: 'button' }, 'Update Condition');
        updateBtn.addEventListener('click', () => {
          void handleUpdateCondition(row.id);
        });
        tdActions.appendChild(updateBtn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Load Data ----
    async function loadData(): Promise<void> {
      loadingEl.style.display = '';
      tableContainer.innerHTML = '';
      try {
        const svc = getSafetyService();
        const records = await svc.listPPE();
        allRecords = records.map((r) => ({
          id: r.id,
          employeeId: r.employeeId,
          employeeName: r.employeeName || undefined,
          ppeType: r.ppeType,
          brand: r.brand || undefined,
          serialNumber: r.serialNumber || undefined,
          issuedDate: r.issuedDate,
          expirationDate: r.expirationDate || undefined,
          condition: r.condition,
          lastInspectionDate: r.lastInspectionDate || undefined,
        }));
        updateStats(allRecords);
        loadingEl.style.display = 'none';
        renderTable();
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        const message = err instanceof Error ? err.message : 'Failed to load PPE records.';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Update Condition ----
    async function handleUpdateCondition(id: string): Promise<void> {
      const condition = prompt('New condition (new, good, fair, replace, retired):');
      if (!condition) return;

      const valid = ['new', 'good', 'fair', 'replace', 'retired'];
      if (!valid.includes(condition)) {
        showMsg(wrapper, 'Invalid condition. Must be one of: ' + valid.join(', '), true);
        return;
      }

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.updatePPECondition(id, condition as 'new' | 'good' | 'fair' | 'replace' | 'retired');
          showMsg(wrapper, 'PPE condition updated successfully.', false);
          await loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to update PPE condition.';
          showMsg(wrapper, message, true);
        }
      })();
    }

    // ---- Issue PPE ----
    issueBtn.addEventListener('click', () => {
      const employeeId = prompt('Employee ID:');
      if (!employeeId) return;

      const employeeName = prompt('Employee name (leave blank to skip):') || '';

      const ppeType = prompt('PPE type (hard_hat, safety_glasses, gloves, vest, boots, harness, respirator, ear_protection, face_shield, other):');
      if (!ppeType) return;

      const validTypes = ['hard_hat', 'safety_glasses', 'gloves', 'vest', 'boots', 'harness', 'respirator', 'ear_protection', 'face_shield', 'other'];
      if (!validTypes.includes(ppeType)) {
        showMsg(wrapper, 'Invalid PPE type. Must be one of: ' + validTypes.join(', '), true);
        return;
      }

      const brand = prompt('Brand (leave blank to skip):') || '';
      const serialNumber = prompt('Serial number (leave blank to skip):') || '';
      const expirationDate = prompt('Expiration date YYYY-MM-DD (leave blank to skip):') || '';

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.issuePPE({
            employeeId,
            employeeName: employeeName || undefined,
            ppeType: ppeType as 'hard_hat' | 'safety_glasses' | 'gloves' | 'vest' | 'boots' | 'harness' | 'respirator' | 'ear_protection' | 'face_shield' | 'other',
            brand: brand || undefined,
            serialNumber: serialNumber || undefined,
            expirationDate: expirationDate || undefined,
          });
          showMsg(wrapper, 'PPE issued successfully.', false);
          await loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to issue PPE.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => {
      renderTable();
    });
    typeSelect.addEventListener('change', () => {
      renderTable();
    });
    conditionSelect.addEventListener('change', () => {
      renderTable();
    });

    // ---- Initial Load ----
    void loadData();
  },
};
