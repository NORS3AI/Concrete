/**
 * Certified Payroll view.
 * Lists WH-347 certified payroll reports with job, week ending,
 * totals, and status. Supports filtering, generation, and status workflow.
 * Wired to UnionService for live data.
 */

import { getUnionService } from '../service-accessor';
import type { CertifiedPayrollStatus } from '../union-service';

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
  { value: 'approved', label: 'Approved' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CertPayrollRow {
  id: string;
  jobId: string;
  projectName: string;
  projectNumber: string;
  contractorName: string;
  weekEndingDate: string;
  reportNumber: string;
  totalGross: number;
  totalFringe: number;
  totalNet: number;
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
  searchInput.placeholder = 'Search by project, contractor...';
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
// Generate Report Form
// ---------------------------------------------------------------------------

function buildGenerateForm(onGenerate: (data: {
  jobId: string;
  weekEndingDate: string;
  contractorName: string;
  projectName: string;
  projectNumber: string;
  totalGross: number;
  totalFringe: number;
  totalNet: number;
}) => void): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Generate Certified Payroll Report'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const grid = el('div', 'grid grid-cols-4 gap-3');

  const jobIdInput = el('input', inputCls) as HTMLInputElement;
  jobIdInput.placeholder = 'Job ID';
  jobIdInput.name = 'jobId';
  grid.appendChild(jobIdInput);

  const weekEndingInput = el('input', inputCls) as HTMLInputElement;
  weekEndingInput.type = 'date';
  weekEndingInput.name = 'weekEndingDate';
  weekEndingInput.title = 'Week Ending Date';
  grid.appendChild(weekEndingInput);

  const contractorInput = el('input', inputCls) as HTMLInputElement;
  contractorInput.placeholder = 'Contractor Name';
  contractorInput.name = 'contractorName';
  grid.appendChild(contractorInput);

  const projectNameInput = el('input', inputCls) as HTMLInputElement;
  projectNameInput.placeholder = 'Project Name';
  projectNameInput.name = 'projectName';
  grid.appendChild(projectNameInput);

  const projectNumberInput = el('input', inputCls) as HTMLInputElement;
  projectNumberInput.placeholder = 'Project Number';
  projectNumberInput.name = 'projectNumber';
  grid.appendChild(projectNumberInput);

  const grossInput = el('input', inputCls) as HTMLInputElement;
  grossInput.type = 'number';
  grossInput.step = '0.01';
  grossInput.placeholder = 'Total Gross';
  grossInput.name = 'totalGross';
  grid.appendChild(grossInput);

  const fringeInput = el('input', inputCls) as HTMLInputElement;
  fringeInput.type = 'number';
  fringeInput.step = '0.01';
  fringeInput.placeholder = 'Total Fringe';
  fringeInput.name = 'totalFringe';
  grid.appendChild(fringeInput);

  const netInput = el('input', inputCls) as HTMLInputElement;
  netInput.type = 'number';
  netInput.step = '0.01';
  netInput.placeholder = 'Total Net';
  netInput.name = 'totalNet';
  grid.appendChild(netInput);

  const genBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  genBtn.type = 'button';
  genBtn.addEventListener('click', () => {
    const jobId = jobIdInput.value.trim();
    const weekEndingDate = weekEndingInput.value;
    const contractorName = contractorInput.value.trim();
    const projectName = projectNameInput.value.trim();

    if (!jobId || !weekEndingDate || !contractorName || !projectName) return;

    onGenerate({
      jobId,
      weekEndingDate,
      contractorName,
      projectName,
      projectNumber: projectNumberInput.value.trim(),
      totalGross: parseFloat(grossInput.value) || 0,
      totalFringe: parseFloat(fringeInput.value) || 0,
      totalNet: parseFloat(netInput.value) || 0,
    });

    // Clear form
    jobIdInput.value = '';
    weekEndingInput.value = '';
    contractorInput.value = '';
    projectNameInput.value = '';
    projectNumberInput.value = '';
    grossInput.value = '';
    fringeInput.value = '';
    netInput.value = '';
  });
  grid.appendChild(genBtn);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  reports: CertPayrollRow[],
  onSubmit: (id: string) => void,
  onApprove: (id: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Report #', 'Project', 'Contractor', 'Week Ending', 'Gross', 'Fringe', 'Net', 'Status', 'Actions']) {
    const align = (col === 'Gross' || col === 'Fringe' || col === 'Net') ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (reports.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No certified payroll reports found. Generate one from a pay run to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const report of reports) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', report.reportNumber || '--'));
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', report.projectName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', report.contractorName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', report.weekEndingDate));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(report.totalGross)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(report.totalFringe)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-bold', fmtCurrency(report.totalNet)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[report.status] ?? STATUS_BADGE.draft}`,
      report.status.charAt(0).toUpperCase() + report.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (report.status === 'draft') {
      const submitBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Submit');
      submitBtn.addEventListener('click', () => onSubmit(report.id));
      tdActions.appendChild(submitBtn);
    }
    if (report.status === 'submitted') {
      const approveBtn = el('button', 'text-emerald-400 hover:underline text-sm mr-2', 'Approve');
      approveBtn.addEventListener('click', () => onApprove(report.id));
      tdActions.appendChild(approveBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Certified Payroll (WH-347)'));

    const genToggleBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate Report');
    genToggleBtn.type = 'button';
    headerRow.appendChild(genToggleBtn);
    wrapper.appendChild(headerRow);

    let currentStatus = '';
    let currentSearch = '';
    let formVisible = false;

    const formContainer = el('div', '');
    const tableContainer = el('div', '');

    const generateForm = buildGenerateForm((data) => {
      void (async () => {
        try {
          const svc = getUnionService();
          await svc.generateCertifiedPayroll({
            jobId: data.jobId,
            weekEndingDate: data.weekEndingDate,
            contractorName: data.contractorName,
            projectName: data.projectName,
            projectNumber: data.projectNumber || undefined,
            totalGross: data.totalGross,
            totalFringe: data.totalFringe,
            totalNet: data.totalNet,
          });
          showMsg(wrapper, 'Certified payroll report generated.', false);
          void loadReports();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to generate report';
          showMsg(wrapper, message, true);
        }
      })();
    });

    genToggleBtn.addEventListener('click', () => {
      formVisible = !formVisible;
      formContainer.innerHTML = '';
      if (formVisible) {
        formContainer.appendChild(generateForm);
      }
    });

    async function loadReports(): Promise<void> {
      try {
        const svc = getUnionService();
        const filters: { status?: CertifiedPayrollStatus } = {};
        if (currentStatus) filters.status = currentStatus as CertifiedPayrollStatus;

        const payrolls = await svc.getCertifiedPayrolls(filters);

        let rows: CertPayrollRow[] = payrolls.map((p) => ({
          id: p.id,
          jobId: p.jobId,
          projectName: p.projectName,
          projectNumber: p.projectNumber ?? '',
          contractorName: p.contractorName,
          weekEndingDate: p.weekEndingDate,
          reportNumber: p.reportNumber ?? '',
          totalGross: p.totalGross,
          totalFringe: p.totalFringe,
          totalNet: p.totalNet,
          status: p.status,
        }));

        // Client-side search filter
        if (currentSearch) {
          const q = currentSearch.toLowerCase();
          rows = rows.filter((r) =>
            r.projectName.toLowerCase().includes(q) ||
            r.contractorName.toLowerCase().includes(q) ||
            r.reportNumber.toLowerCase().includes(q) ||
            r.projectNumber.toLowerCase().includes(q),
          );
        }

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(
          rows,
          (id) => {
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.submitCertifiedPayroll(id);
                showMsg(wrapper, 'Report submitted.', false);
                void loadReports();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to submit report';
                showMsg(wrapper, message, true);
              }
            })();
          },
          (id) => {
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.approveCertifiedPayroll(id);
                showMsg(wrapper, 'Report approved.', false);
                void loadReports();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to approve report';
                showMsg(wrapper, message, true);
              }
            })();
          },
        ));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load certified payrolls';
        showMsg(wrapper, message, true);
      }
    }

    wrapper.appendChild(buildFilterBar((status, search) => {
      currentStatus = status;
      currentSearch = search;
      void loadReports();
    }));

    wrapper.appendChild(formContainer);
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // Initial load
    void loadReports();
  },
};
