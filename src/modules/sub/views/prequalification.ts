/**
 * Prequalification view.
 * Filterable table of subcontractor prequalification records with
 * review/approval workflow actions. Tracks EMR, bonding capacity,
 * years in business, and revenue history. Wired to SubService.
 */

import { getSubService } from '../service-accessor';

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
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Subcontractor Prequalification'));
    const newBtn = el('button', btnCls, 'New Prequalification');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Inline Form (hidden by default) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Prequalification'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    // Vendor ID
    const vendorGroup = el('div');
    vendorGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Vendor ID'));
    const vendorInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    vendorInput.type = 'text';
    vendorInput.placeholder = 'Vendor ID';
    vendorGroup.appendChild(vendorInput);
    formGrid.appendChild(vendorGroup);

    // Submitted Date
    const dateGroup = el('div');
    dateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Submitted Date'));
    const dateInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    dateInput.type = 'date';
    dateGroup.appendChild(dateInput);
    formGrid.appendChild(dateGroup);

    // EMR
    const emrGroup = el('div');
    emrGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'EMR'));
    const emrInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    emrInput.type = 'number';
    emrInput.step = '0.01';
    emrInput.placeholder = '1.00';
    emrGroup.appendChild(emrInput);
    formGrid.appendChild(emrGroup);

    // Bonding Capacity
    const bondGroup = el('div');
    bondGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Bonding Capacity'));
    const bondInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    bondInput.type = 'number';
    bondInput.placeholder = '0';
    bondGroup.appendChild(bondInput);
    formGrid.appendChild(bondGroup);

    // Years in Business
    const yearsGroup = el('div');
    yearsGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Years in Business'));
    const yearsInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    yearsInput.type = 'number';
    yearsInput.placeholder = '0';
    yearsGroup.appendChild(yearsInput);
    formGrid.appendChild(yearsGroup);

    // Avg 3yr Revenue
    const revGroup = el('div');
    revGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Avg 3yr Revenue'));
    const revInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    revInput.type = 'number';
    revInput.placeholder = '0';
    revGroup.appendChild(revInput);
    formGrid.appendChild(revGroup);

    formWrap.appendChild(formGrid);

    const formBtnRow = el('div', 'flex items-center gap-3 mt-4');
    const saveBtn = el('button', btnCls, 'Save');
    const cancelBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Cancel',
    );
    formBtnRow.appendChild(saveBtn);
    formBtnRow.appendChild(cancelBtn);
    formWrap.appendChild(formBtnRow);
    wrapper.appendChild(formWrap);

    // Toggle form
    newBtn.addEventListener('click', () => {
      formWrap.classList.toggle('hidden');
    });
    cancelBtn.addEventListener('click', () => {
      formWrap.classList.add('hidden');
    });

    // ---- Filter Bar ----
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by vendor ID...';
    bar.appendChild(searchInput);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusSelect.appendChild(o);
    }
    bar.appendChild(statusSelect);

    wrapper.appendChild(bar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Score Bar Builder ----
    function buildScoreBar(score: number): HTMLElement {
      const wrap = el('div', 'flex items-center gap-2');
      const barOuter = el('div', 'w-16 h-2 rounded-full bg-[var(--surface)] overflow-hidden');
      const barInner = el('div', 'h-full rounded-full');

      let colorClass = 'bg-red-500';
      if (score >= 80) colorClass = 'bg-emerald-500';
      else if (score >= 60) colorClass = 'bg-amber-500';
      else if (score >= 40) colorClass = 'bg-orange-500';

      barInner.className = `h-full rounded-full ${colorClass}`;
      barInner.style.width = `${Math.min(score, 100)}%`;
      barOuter.appendChild(barInner);
      wrap.appendChild(barOuter);
      wrap.appendChild(el('span', 'text-xs font-mono text-[var(--text)]', score.toString()));
      return wrap;
    }

    // ---- Render Table ----
    function renderTable(
      rows: Array<{
        id: string;
        vendorId: string;
        submittedDate?: string;
        reviewedDate?: string;
        score: number;
        status: string;
        emr?: number;
        bondingCapacity?: number;
        yearsInBusiness?: number;
        revenueAvg3Year?: number;
      }>,
    ): void {
      tableContainer.innerHTML = '';

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
      for (const col of ['Vendor ID', 'Submitted', 'Reviewed', 'Score', 'EMR', 'Bonding Capacity', 'Years', 'Avg 3yr Revenue', 'Status', 'Actions']) {
        const align = ['Bonding Capacity', 'Avg 3yr Revenue'].includes(col)
          ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
        headRow.appendChild(el('th', align, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (rows.length === 0) {
        const tr = el('tr');
        const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No prequalification records found.');
        td.setAttribute('colspan', '10');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const pq of rows) {
        const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

        tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', pq.vendorId));
        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pq.submittedDate || '-'));
        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pq.reviewedDate || '-'));

        const tdScore = el('td', 'py-2 px-3');
        tdScore.appendChild(buildScoreBar(pq.score));
        tr.appendChild(tdScore);

        const emrVal = pq.emr ?? 0;
        let emrCls = 'py-2 px-3 font-mono text-emerald-400';
        if (emrVal > 1.5) emrCls = 'py-2 px-3 font-mono text-red-400';
        else if (emrVal > 1.0) emrCls = 'py-2 px-3 font-mono text-amber-400';
        tr.appendChild(el('td', emrCls, pq.emr ? pq.emr.toFixed(2) : '-'));

        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', pq.bondingCapacity ? fmtCurrency(pq.bondingCapacity) : '-'));
        tr.appendChild(el('td', 'py-2 px-3 text-center font-mono', pq.yearsInBusiness ? pq.yearsInBusiness.toString() : '-'));
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', pq.revenueAvg3Year ? fmtCurrency(pq.revenueAvg3Year) : '-'));

        const tdStatus = el('td', 'py-2 px-3');
        const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[pq.status] ?? STATUS_BADGE.pending}`,
          pq.status.charAt(0).toUpperCase() + pq.status.slice(1));
        tdStatus.appendChild(badge);
        tr.appendChild(tdStatus);

        const tdActions = el('td', 'py-2 px-3');
        if (pq.status === 'pending') {
          const approveBtn = el('button', 'text-emerald-400 hover:underline text-sm mr-2', 'Approve');
          approveBtn.type = 'button';
          approveBtn.addEventListener('click', () => {
            void handleApprove(pq.id);
          });
          tdActions.appendChild(approveBtn);

          const rejectBtn = el('button', 'text-red-400 hover:underline text-sm', 'Reject');
          rejectBtn.type = 'button';
          rejectBtn.addEventListener('click', () => {
            void handleReject(pq.id);
          });
          tdActions.appendChild(rejectBtn);
        } else {
          const viewBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'View');
          viewBtn.type = 'button';
          viewBtn.addEventListener('click', () => {
            void handleView(pq);
          });
          tdActions.appendChild(viewBtn);
        }
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Data Loading ----
    async function loadTable(): Promise<void> {
      const svc = getSubService();

      const filters: { status?: string; vendorId?: string } = {};
      if (statusSelect.value) {
        (filters as Record<string, string>).status = statusSelect.value;
      }

      let records = await svc.getPrequalifications(filters as Parameters<typeof svc.getPrequalifications>[0]);

      // Client-side search by vendor ID
      const search = searchInput.value.toLowerCase().trim();
      if (search) {
        records = records.filter((r) => r.vendorId.toLowerCase().includes(search));
      }

      renderTable(records);
    }

    // ---- Approve ----
    async function handleApprove(id: string): Promise<void> {
      const scoreStr = prompt('Enter score (0-100):');
      if (scoreStr === null) return;
      const score = parseInt(scoreStr, 10);
      if (isNaN(score) || score < 0 || score > 100) {
        showMsg(wrapper, 'Score must be a number between 0 and 100.', true);
        return;
      }

      void (async () => {
        try {
          const svc = getSubService();
          await svc.approvePrequalification(id, score);
          showMsg(wrapper, 'Prequalification approved successfully.', false);
          await loadTable();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to approve prequalification.';
          showMsg(wrapper, message, true);
        }
      })();
    }

    // ---- Reject ----
    async function handleReject(id: string): Promise<void> {
      if (!confirm('Are you sure you want to reject this prequalification?')) return;

      void (async () => {
        try {
          const svc = getSubService();
          await svc.rejectPrequalification(id);
          showMsg(wrapper, 'Prequalification rejected.', false);
          await loadTable();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to reject prequalification.';
          showMsg(wrapper, message, true);
        }
      })();
    }

    // ---- View Details ----
    async function handleView(pq: Record<string, unknown>): Promise<void> {
      const details = [
        `Vendor ID: ${pq.vendorId ?? '-'}`,
        `Submitted: ${pq.submittedDate ?? '-'}`,
        `Reviewed: ${pq.reviewedDate ?? '-'}`,
        `Score: ${pq.score ?? 0}`,
        `Status: ${pq.status ?? '-'}`,
        `EMR: ${pq.emr ?? '-'}`,
        `Bonding Capacity: ${pq.bondingCapacity ? fmtCurrency(pq.bondingCapacity as number) : '-'}`,
        `Years in Business: ${pq.yearsInBusiness ?? '-'}`,
        `Avg 3yr Revenue: ${pq.revenueAvg3Year ? fmtCurrency(pq.revenueAvg3Year as number) : '-'}`,
      ].join('\n');
      alert(details);
    }

    // ---- Save New Prequalification ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getSubService();

          if (!vendorInput.value.trim()) {
            showMsg(wrapper, 'Vendor ID is required.', true);
            return;
          }

          await svc.createPrequalification({
            vendorId: vendorInput.value.trim(),
            submittedDate: dateInput.value || undefined,
            emr: emrInput.value ? parseFloat(emrInput.value) : undefined,
            bondingCapacity: bondInput.value ? parseFloat(bondInput.value) : undefined,
            yearsInBusiness: yearsInput.value ? parseInt(yearsInput.value, 10) : undefined,
            revenueAvg3Year: revInput.value ? parseFloat(revInput.value) : undefined,
          });

          showMsg(wrapper, 'Prequalification created successfully.', false);
          formWrap.classList.add('hidden');

          // Reset form
          vendorInput.value = '';
          dateInput.value = '';
          emrInput.value = '';
          bondInput.value = '';
          yearsInput.value = '';
          revInput.value = '';

          await loadTable();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create prequalification.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    statusSelect.addEventListener('change', () => {
      void loadTable();
    });
    searchInput.addEventListener('input', () => {
      void loadTable();
    });

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadTable();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load prequalification records.';
        showMsg(wrapper, message, true);
      }
    })();
  },
};
