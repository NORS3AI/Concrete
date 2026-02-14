/**
 * Drug Testing view.
 * Displays a filterable table of drug test records with summary statistics,
 * result tracking, and the ability to record new tests or update pending
 * results. Wired to SafetyService for data persistence.
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

const TEST_TYPE_OPTIONS = [
  { value: '', label: 'All Test Types' },
  { value: 'pre_employment', label: 'Pre-Employment' },
  { value: 'random', label: 'Random' },
  { value: 'post_accident', label: 'Post-Accident' },
  { value: 'reasonable_suspicion', label: 'Reasonable Suspicion' },
  { value: 'return_to_duty', label: 'Return to Duty' },
  { value: 'follow_up', label: 'Follow-Up' },
];

const RESULT_OPTIONS = [
  { value: '', label: 'All Results' },
  { value: 'negative', label: 'Negative' },
  { value: 'positive', label: 'Positive' },
  { value: 'pending', label: 'Pending' },
  { value: 'inconclusive', label: 'Inconclusive' },
  { value: 'refused', label: 'Refused' },
];

const RESULT_BADGE: Record<string, string> = {
  negative: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  positive: 'bg-red-500/10 text-red-400 border border-red-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  inconclusive: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  refused: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const COLUMNS = [
  'Employee', 'Test Type', 'Test Date', 'Result', 'Result Date',
  'Lab', 'Collection Site', 'MRO', 'Notes', 'Actions',
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
      el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Drug Testing'),
    );
    const recordBtn = el('button', { className: btnCls, type: 'button' }, 'Record Test');
    headerRow.appendChild(recordBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Stats ----
    const statsRow = el('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-6' });
    const statCardCls = 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4';
    const statLabelCls = 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider';
    const statValueCls = 'text-2xl font-bold text-[var(--text)] mt-1';

    const totalCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Total Tests'),
      el('div', { className: statValueCls + ' stat-total' }, '...'),
    );
    const pendingCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Pending Results'),
      el('div', { className: statValueCls + ' stat-pending text-amber-400' }, '...'),
    );
    const negativeCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Negative (Pass)'),
      el('div', { className: statValueCls + ' stat-negative text-emerald-400' }, '...'),
    );
    const positiveCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Positive (Fail)'),
      el('div', { className: statValueCls + ' stat-positive text-red-400' }, '...'),
    );
    statsRow.appendChild(totalCard);
    statsRow.appendChild(pendingCard);
    statsRow.appendChild(negativeCard);
    statsRow.appendChild(positiveCard);
    wrapper.appendChild(statsRow);

    // ---- Filter Bar ----
    const bar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });

    const searchInput = document.createElement('input') as HTMLInputElement;
    searchInput.className = inputCls;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by employee...';
    bar.appendChild(searchInput);

    const typeSelect = document.createElement('select') as HTMLSelectElement;
    typeSelect.className = inputCls;
    for (const opt of TEST_TYPE_OPTIONS) {
      const o = document.createElement('option') as HTMLOptionElement;
      o.value = opt.value;
      o.textContent = opt.label;
      typeSelect.appendChild(o);
    }
    bar.appendChild(typeSelect);

    const resultSelect = document.createElement('select') as HTMLSelectElement;
    resultSelect.className = inputCls;
    for (const opt of RESULT_OPTIONS) {
      const o = document.createElement('option') as HTMLOptionElement;
      o.value = opt.value;
      o.textContent = opt.label;
      resultSelect.appendChild(o);
    }
    bar.appendChild(resultSelect);

    wrapper.appendChild(bar);

    // ---- Loading Indicator ----
    const loadingEl = el('div', { className: 'text-sm text-[var(--text-muted)] py-8 text-center' }, 'Loading drug test records...');
    wrapper.appendChild(loadingEl);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Data & Rendering ----
    type TestRow = {
      id: string;
      employeeId: string;
      employeeName?: string;
      testType: string;
      testDate: string;
      result: string;
      resultDate?: string;
      lab?: string;
      collectionSite?: string;
      mroName?: string;
      notes?: string;
    };

    let allTests: TestRow[] = [];

    function updateStats(tests: TestRow[]): void {
      const totalEl = wrapper.querySelector('.stat-total');
      const pendingEl = wrapper.querySelector('.stat-pending');
      const negativeEl = wrapper.querySelector('.stat-negative');
      const positiveEl = wrapper.querySelector('.stat-positive');

      if (totalEl) totalEl.textContent = String(tests.length);
      if (pendingEl) pendingEl.textContent = String(tests.filter((t) => t.result === 'pending').length);
      if (negativeEl) negativeEl.textContent = String(tests.filter((t) => t.result === 'negative').length);
      if (positiveEl) positiveEl.textContent = String(tests.filter((t) => t.result === 'positive').length);
    }

    function getFilteredTests(): TestRow[] {
      let filtered = [...allTests];
      const search = searchInput.value.toLowerCase().trim();
      const typeVal = typeSelect.value;
      const resultVal = resultSelect.value;

      if (typeVal) {
        filtered = filtered.filter((t) => t.testType === typeVal);
      }
      if (resultVal) {
        filtered = filtered.filter((t) => t.result === resultVal);
      }
      if (search) {
        filtered = filtered.filter((t) =>
          (t.employeeName ?? '').toLowerCase().includes(search) ||
          t.employeeId.toLowerCase().includes(search),
        );
      }

      return filtered;
    }

    function formatTestType(type: string): string {
      return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    function formatResult(result: string): string {
      return result.charAt(0).toUpperCase() + result.slice(1);
    }

    function renderTable(): void {
      tableContainer.innerHTML = '';
      const filtered = getFilteredTests();

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
          'No drug test records found. Record a test to get started.',
        );
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const row of filtered) {
        const tr = el('tr', { className: trCls });

        // Employee
        const empText = row.employeeName ? `${row.employeeName} (${row.employeeId})` : row.employeeId;
        tr.appendChild(el('td', { className: tdCls + ' font-medium' }, empText));

        // Test Type
        tr.appendChild(el('td', { className: tdCls }, formatTestType(row.testType)));

        // Test Date
        tr.appendChild(el('td', { className: tdCls + ' text-[var(--text-muted)]' }, row.testDate));

        // Result badge
        const tdResult = el('td', { className: tdCls });
        const badgeCls = RESULT_BADGE[row.result] ?? RESULT_BADGE.pending;
        tdResult.appendChild(
          el('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}` }, formatResult(row.result)),
        );
        tr.appendChild(tdResult);

        // Result Date
        tr.appendChild(el('td', { className: tdCls + ' text-[var(--text-muted)]' }, row.resultDate || '-'));

        // Lab
        tr.appendChild(el('td', { className: tdCls }, row.lab || '-'));

        // Collection Site
        tr.appendChild(el('td', { className: tdCls }, row.collectionSite || '-'));

        // MRO
        tr.appendChild(el('td', { className: tdCls }, row.mroName || '-'));

        // Notes
        const noteText = (row.notes ?? '').length > 30 ? (row.notes ?? '').substring(0, 30) + '...' : (row.notes ?? '-');
        tr.appendChild(el('td', { className: tdCls + ' text-[var(--text-muted)]' }, noteText));

        // Actions
        const tdActions = el('td', { className: tdCls });
        if (row.result === 'pending') {
          const updateBtn = el('button', { className: 'text-[var(--accent)] hover:underline text-sm', type: 'button' }, 'Update Result');
          updateBtn.addEventListener('click', () => {
            void handleUpdateResult(row.id);
          });
          tdActions.appendChild(updateBtn);
        } else {
          tdActions.appendChild(el('span', { className: 'text-[var(--text-muted)] text-sm' }, '-'));
        }
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
        const tests = await svc.listDrugTests();
        allTests = tests.map((t) => ({
          id: t.id,
          employeeId: t.employeeId,
          employeeName: t.employeeName || undefined,
          testType: t.testType,
          testDate: t.testDate,
          result: t.result,
          resultDate: t.resultDate || undefined,
          lab: t.lab || undefined,
          collectionSite: t.collectionSite || undefined,
          mroName: t.mroName || undefined,
          notes: t.notes || undefined,
        }));
        updateStats(allTests);
        loadingEl.style.display = 'none';
        renderTable();
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        const message = err instanceof Error ? err.message : 'Failed to load drug test records.';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Update Result ----
    async function handleUpdateResult(id: string): Promise<void> {
      const result = prompt('Enter result (negative, positive, inconclusive, refused):');
      if (!result) return;

      const valid = ['negative', 'positive', 'inconclusive', 'refused'];
      if (!valid.includes(result)) {
        showMsg(wrapper, 'Invalid result. Must be one of: ' + valid.join(', '), true);
        return;
      }

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.updateDrugTestResult(id, result as 'negative' | 'positive' | 'inconclusive' | 'refused');
          showMsg(wrapper, 'Drug test result updated successfully.', false);
          await loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to update drug test result.';
          showMsg(wrapper, message, true);
        }
      })();
    }

    // ---- Record Test ----
    recordBtn.addEventListener('click', () => {
      const employeeId = prompt('Employee ID:');
      if (!employeeId) return;

      const employeeName = prompt('Employee name (leave blank to skip):') || '';

      const testType = prompt('Test type (pre_employment, random, post_accident, reasonable_suspicion, return_to_duty, follow_up):');
      if (!testType) return;

      const validTypes = ['pre_employment', 'random', 'post_accident', 'reasonable_suspicion', 'return_to_duty', 'follow_up'];
      if (!validTypes.includes(testType)) {
        showMsg(wrapper, 'Invalid test type. Must be one of: ' + validTypes.join(', '), true);
        return;
      }

      const testDate = prompt('Test date (YYYY-MM-DD):');
      if (!testDate) return;

      const lab = prompt('Lab name (leave blank to skip):') || '';
      const collectionSite = prompt('Collection site (leave blank to skip):') || '';

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.recordDrugTest({
            employeeId,
            employeeName: employeeName || undefined,
            testType: testType as 'pre_employment' | 'random' | 'post_accident' | 'reasonable_suspicion' | 'return_to_duty' | 'follow_up',
            testDate,
            lab: lab || undefined,
            collectionSite: collectionSite || undefined,
          });
          showMsg(wrapper, 'Drug test recorded successfully.', false);
          await loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to record drug test.';
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
    resultSelect.addEventListener('change', () => {
      renderTable();
    });

    // ---- Initial Load ----
    void loadData();
  },
};
