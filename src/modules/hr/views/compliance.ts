/**
 * Compliance & Reporting view.
 * Three sections: New Hire Reporting, EEO-1 Summary, and I-9 / E-Verify Tracking.
 * Loads data in parallel from HRService. Supports marking new hires reported,
 * exporting EEO-1 as CSV, completing I-9, and updating E-Verify status.
 */

import { getHRService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(
  tag: string,
  attrs?: Record<string, string>,
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
    if (typeof child === 'string') {
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

function showMsg(
  container: HTMLElement,
  msg: string,
  type: 'success' | 'error' = 'success',
): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls =
    type === 'error'
      ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
      : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const toast = el('div', { className: cls, 'data-msg': '1' }, msg);
  container.prepend(toast);
  setTimeout(() => toast.remove(), 3000);
}

function maskSSN(ssn?: string): string {
  if (!ssn) return '-';
  const digits = ssn.replace(/\D/g, '');
  if (digits.length < 4) return '***-**-' + digits;
  return '***-**-' + digits.slice(-4);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RACE_LABELS: Record<string, string> = {
  white: 'White',
  black: 'Black or African American',
  hispanic: 'Hispanic or Latino',
  asian: 'Asian',
  native_american: 'American Indian or Alaska Native',
  pacific_islander: 'Native Hawaiian or Pacific Islander',
  two_or_more: 'Two or More Races',
  not_specified: 'Not Specified',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  not_specified: 'Not Specified',
};

const TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-Time',
  part_time: 'Part-Time',
  contract: 'Contract',
  seasonal: 'Seasonal',
  temp: 'Temp',
};

const EVERIFY_BADGE: Record<string, string> = {
  verified: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const EVERIFY_LABELS: Record<string, string> = {
  verified: 'Verified',
  pending: 'Pending',
  failed: 'Failed',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', { className: 'space-y-0' });

    const btnPrimary =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';
    const btnSmall =
      'px-2 py-1 rounded text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // ---- Header ----
    const headerRow = el('div', { className: 'flex items-center justify-between mb-6' });
    headerRow.appendChild(
      el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Compliance & Reporting'),
    );
    wrapper.appendChild(headerRow);

    // ---- Loading State ----
    const loadingEl = el(
      'div',
      { className: 'py-12 text-center text-[var(--text-muted)]' },
      'Loading compliance data...',
    );
    wrapper.appendChild(loadingEl);

    // ---- Section Containers ----
    const newHireContainer = el('div');
    const eeo1Container = el('div');
    const i9Container = el('div');

    wrapper.appendChild(newHireContainer);
    wrapper.appendChild(eeo1Container);
    wrapper.appendChild(i9Container);

    container.appendChild(wrapper);

    // ---- Build New Hire Table ----
    function buildNewHireSection(
      reports: Array<{
        employeeId: string;
        firstName: string;
        lastName: string;
        ssn?: string;
        hireDate?: string;
        state?: string;
        reported: boolean;
        reportedDate?: string;
      }>,
    ): HTMLElement {
      const section = el('div', { className: 'mb-8' });
      section.appendChild(
        el('h2', { className: 'text-xl font-semibold text-[var(--text)] mb-4' }, 'New Hire Reporting'),
      );

      const wrap = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
      });
      const table = el('table', { className: 'w-full text-sm' });

      const thead = el('thead');
      const headRow = el('tr', {
        className: 'text-left text-[var(--text-muted)] border-b border-[var(--border)]',
      });
      for (const col of [
        'Employee ID',
        'Name',
        'SSN',
        'Hire Date',
        'State',
        'Reported',
        'Report Date',
        'Actions',
      ]) {
        headRow.appendChild(el('th', { className: 'py-2 px-3 font-medium' }, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');

      if (reports.length === 0) {
        const tr = el('tr');
        const td = el('td', {
          className: 'py-8 px-3 text-center text-[var(--text-muted)]',
          colspan: '8',
        }, 'No new hire records found.');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const report of reports) {
        const tr = el('tr', {
          className: 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
        });

        tr.appendChild(
          el('td', { className: 'py-2 px-3 font-mono text-[var(--text-muted)]' }, report.employeeId),
        );
        tr.appendChild(
          el('td', { className: 'py-2 px-3 font-medium text-[var(--text)]' }, `${report.firstName} ${report.lastName}`),
        );
        tr.appendChild(el('td', { className: 'py-2 px-3 font-mono text-[var(--text-muted)]' }, maskSSN(report.ssn)));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, report.hireDate ?? '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, report.state ?? '-'));

        // Reported badge
        const tdReported = el('td', { className: 'py-2 px-3' });
        const reportedBadgeCls = report.reported
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-red-500/10 text-red-400 border border-red-500/20';
        tdReported.appendChild(
          el('span', { className: `px-2 py-0.5 rounded-full text-xs font-medium ${reportedBadgeCls}` }, report.reported ? 'Yes' : 'No'),
        );
        tr.appendChild(tdReported);

        tr.appendChild(
          el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, report.reportedDate ?? '-'),
        );

        // Actions
        const tdActions = el('td', { className: 'py-2 px-3' });
        if (!report.reported) {
          const markBtn = el('button', { className: btnSmall, type: 'button' }, 'Mark Reported');
          markBtn.addEventListener('click', () => {
            const state = prompt('Enter state (e.g. CA, NY, TX):');
            if (!state) return;
            void handleMarkReported(report.employeeId, state);
          });
          tdActions.appendChild(markBtn);
        }
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      section.appendChild(wrap);
      return section;
    }

    // ---- Build EEO-1 Section ----
    function buildEEO1Section(summary: {
      totalEmployees: number;
      byRace: Record<string, number>;
      byGender: Record<string, number>;
      byType: Record<string, number>;
    }): HTMLElement {
      const section = el('div', { className: 'mb-8' });

      const sectionHeader = el('div', { className: 'flex items-center justify-between mb-4' });
      sectionHeader.appendChild(
        el('h2', { className: 'text-xl font-semibold text-[var(--text)]' }, 'EEO-1 Summary'),
      );
      const exportBtn = el('button', { className: btnPrimary, type: 'button' }, 'Export EEO-1');
      exportBtn.addEventListener('click', () => handleExportEEO1(summary));
      sectionHeader.appendChild(exportBtn);
      section.appendChild(sectionHeader);

      // Total employees card
      const totalCard = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4 text-center',
      });
      totalCard.appendChild(el('div', { className: 'text-sm text-[var(--text-muted)] mb-1' }, 'Total Employees'));
      totalCard.appendChild(el('div', { className: 'text-2xl font-bold text-[var(--text)]' }, String(summary.totalEmployees)));
      section.appendChild(totalCard);

      // Grid of tables
      const grid = el('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' });

      // By Race
      const raceSection = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
      });
      raceSection.appendChild(
        el('div', { className: 'px-4 py-3 border-b border-[var(--border)]' },
          el('h3', { className: 'text-sm font-semibold text-[var(--text)]' }, 'By Race'),
        ),
      );
      const raceTable = el('table', { className: 'w-full text-sm' });
      const raceTbody = el('tbody');
      for (const [key, count] of Object.entries(summary.byRace)) {
        const tr = el('tr', { className: 'border-b border-[var(--border)]' });
        tr.appendChild(el('td', { className: 'py-2 px-4 text-[var(--text)]' }, RACE_LABELS[key] ?? key));
        tr.appendChild(el('td', { className: 'py-2 px-4 text-right font-mono text-[var(--text)]' }, String(count)));
        raceTbody.appendChild(tr);
      }
      raceTable.appendChild(raceTbody);
      raceSection.appendChild(raceTable);
      grid.appendChild(raceSection);

      // By Gender
      const genderSection = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
      });
      genderSection.appendChild(
        el('div', { className: 'px-4 py-3 border-b border-[var(--border)]' },
          el('h3', { className: 'text-sm font-semibold text-[var(--text)]' }, 'By Gender'),
        ),
      );
      const genderTable = el('table', { className: 'w-full text-sm' });
      const genderTbody = el('tbody');
      for (const [key, count] of Object.entries(summary.byGender)) {
        const tr = el('tr', { className: 'border-b border-[var(--border)]' });
        tr.appendChild(el('td', { className: 'py-2 px-4 text-[var(--text)]' }, GENDER_LABELS[key] ?? key));
        tr.appendChild(el('td', { className: 'py-2 px-4 text-right font-mono text-[var(--text)]' }, String(count)));
        genderTbody.appendChild(tr);
      }
      genderTable.appendChild(genderTbody);
      genderSection.appendChild(genderTable);
      grid.appendChild(genderSection);

      // By Type
      const typeSection = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
      });
      typeSection.appendChild(
        el('div', { className: 'px-4 py-3 border-b border-[var(--border)]' },
          el('h3', { className: 'text-sm font-semibold text-[var(--text)]' }, 'By Type'),
        ),
      );
      const typeTable = el('table', { className: 'w-full text-sm' });
      const typeTbody = el('tbody');
      for (const [key, count] of Object.entries(summary.byType)) {
        const tr = el('tr', { className: 'border-b border-[var(--border)]' });
        tr.appendChild(el('td', { className: 'py-2 px-4 text-[var(--text)]' }, TYPE_LABELS[key] ?? key));
        tr.appendChild(el('td', { className: 'py-2 px-4 text-right font-mono text-[var(--text)]' }, String(count)));
        typeTbody.appendChild(tr);
      }
      typeTable.appendChild(typeTbody);
      typeSection.appendChild(typeTable);
      grid.appendChild(typeSection);

      section.appendChild(grid);
      return section;
    }

    // ---- Build I-9 / E-Verify Section ----
    function buildI9Section(
      employees: Array<{
        id: string;
        employeeId: string;
        firstName: string;
        lastName: string;
        i9Completed?: boolean;
        i9CompletedDate?: string;
        eVerifyStatus?: string;
      }>,
    ): HTMLElement {
      const section = el('div', { className: 'mb-8' });
      section.appendChild(
        el('h2', { className: 'text-xl font-semibold text-[var(--text)] mb-4' }, 'I-9 / E-Verify Tracking'),
      );

      const wrap = el('div', {
        className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
      });
      const table = el('table', { className: 'w-full text-sm' });

      const thead = el('thead');
      const headRow = el('tr', {
        className: 'text-left text-[var(--text-muted)] border-b border-[var(--border)]',
      });
      for (const col of ['Employee ID', 'Name', 'I-9 Completed', 'I-9 Date', 'E-Verify Status', 'Actions']) {
        headRow.appendChild(el('th', { className: 'py-2 px-3 font-medium' }, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');

      if (employees.length === 0) {
        const tr = el('tr');
        const td = el('td', {
          className: 'py-8 px-3 text-center text-[var(--text-muted)]',
          colspan: '6',
        }, 'No active employees found.');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const emp of employees) {
        const tr = el('tr', {
          className: 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
        });

        tr.appendChild(
          el('td', { className: 'py-2 px-3 font-mono text-[var(--text-muted)]' }, emp.employeeId),
        );
        tr.appendChild(
          el('td', { className: 'py-2 px-3 font-medium text-[var(--text)]' }, `${emp.firstName} ${emp.lastName}`),
        );

        // I-9 Completed indicator
        const tdI9 = el('td', { className: 'py-2 px-3' });
        if (emp.i9Completed) {
          tdI9.appendChild(
            el('span', { className: 'text-emerald-400 font-bold' }, '\u2713'),
          );
        } else {
          tdI9.appendChild(
            el('span', { className: 'text-red-400 font-bold' }, '\u2717'),
          );
        }
        tr.appendChild(tdI9);

        tr.appendChild(
          el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, emp.i9CompletedDate ?? '-'),
        );

        // E-Verify badge
        const tdEVerify = el('td', { className: 'py-2 px-3' });
        const evStatus = emp.eVerifyStatus ?? 'pending';
        tdEVerify.appendChild(
          el(
            'span',
            { className: `px-2 py-0.5 rounded-full text-xs font-medium ${EVERIFY_BADGE[evStatus] ?? EVERIFY_BADGE.pending}` },
            EVERIFY_LABELS[evStatus] ?? evStatus,
          ),
        );
        tr.appendChild(tdEVerify);

        // Actions
        const tdActions = el('td', { className: 'py-2 px-3' });
        const actionWrap = el('div', { className: 'flex items-center gap-1 flex-wrap' });

        if (!emp.i9Completed) {
          const i9Btn = el('button', { className: btnSmall, type: 'button' }, 'Complete I-9');
          i9Btn.addEventListener('click', () => void handleCompleteI9(emp.id));
          actionWrap.appendChild(i9Btn);
        }

        const evBtn = el('button', {
          className: 'px-2 py-1 rounded text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]',
          type: 'button',
        }, 'Update E-Verify');
        evBtn.addEventListener('click', () => void handleUpdateEVerify(emp.id));
        actionWrap.appendChild(evBtn);

        tdActions.appendChild(actionWrap);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      section.appendChild(wrap);
      return section;
    }

    // ---- Actions ----

    async function handleMarkReported(employeeId: string, state: string): Promise<void> {
      try {
        const svc = getHRService();
        // Need to find the internal document ID from the employeeId field
        const employees = await svc.listEmployees({ status: 'active' as any });
        const emp = employees.find((e) => e.employeeId === employeeId);
        if (!emp) {
          showMsg(wrapper, 'Employee not found.', 'error');
          return;
        }
        await svc.markNewHireReported((emp as any).id, state);
        showMsg(wrapper, `New hire ${employeeId} marked as reported in ${state}.`, 'success');
        await loadData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to mark new hire reported.';
        showMsg(wrapper, message, 'error');
      }
    }

    async function handleCompleteI9(id: string): Promise<void> {
      try {
        const svc = getHRService();
        await svc.markI9Completed(id);
        showMsg(wrapper, 'I-9 marked as completed.', 'success');
        await loadData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to complete I-9.';
        showMsg(wrapper, message, 'error');
      }
    }

    async function handleUpdateEVerify(id: string): Promise<void> {
      const status = prompt('Enter E-Verify status (pending, verified, failed):');
      if (!status) return;
      const valid = ['pending', 'verified', 'failed'];
      if (!valid.includes(status)) {
        showMsg(wrapper, 'Invalid E-Verify status. Must be pending, verified, or failed.', 'error');
        return;
      }
      try {
        const svc = getHRService();
        await svc.updateEVerifyStatus(id, status as 'pending' | 'verified' | 'failed');
        showMsg(wrapper, 'E-Verify status updated.', 'success');
        await loadData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update E-Verify status.';
        showMsg(wrapper, message, 'error');
      }
    }

    function handleExportEEO1(summary: {
      totalEmployees: number;
      byRace: Record<string, number>;
      byGender: Record<string, number>;
      byType: Record<string, number>;
    }): void {
      const lines: string[] = [];
      lines.push('EEO-1 Summary Report');
      lines.push(`Total Employees,${summary.totalEmployees}`);
      lines.push('');
      lines.push('Category,Group,Count');

      for (const [key, count] of Object.entries(summary.byRace)) {
        lines.push(`Race,${RACE_LABELS[key] ?? key},${count}`);
      }
      for (const [key, count] of Object.entries(summary.byGender)) {
        lines.push(`Gender,${GENDER_LABELS[key] ?? key},${count}`);
      }
      for (const [key, count] of Object.entries(summary.byType)) {
        lines.push(`Employee Type,${TYPE_LABELS[key] ?? key},${count}`);
      }

      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eeo1-summary-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showMsg(wrapper, 'EEO-1 report exported.', 'success');
    }

    // ---- Data Loading ----
    async function loadData(): Promise<void> {
      newHireContainer.innerHTML = '';
      eeo1Container.innerHTML = '';
      i9Container.innerHTML = '';

      try {
        const svc = getHRService();

        // Load all three data sources in parallel
        const [newHireReport, eeo1Summary, activeEmployees] = await Promise.all([
          svc.getNewHireReport(),
          svc.getEEO1Summary(),
          svc.listEmployees({ status: 'active' as any }),
        ]);

        // Remove loading indicator
        const loadEl = wrapper.querySelector('.py-12');
        if (loadEl) loadEl.remove();

        // Render sections
        newHireContainer.appendChild(buildNewHireSection(newHireReport));

        eeo1Container.appendChild(buildEEO1Section(eeo1Summary));

        const i9Rows = activeEmployees.map((e) => ({
          id: (e as any).id as string,
          employeeId: e.employeeId,
          firstName: e.firstName,
          lastName: e.lastName,
          i9Completed: e.i9Completed,
          i9CompletedDate: e.i9CompletedDate,
          eVerifyStatus: e.eVerifyStatus,
        }));
        i9Container.appendChild(buildI9Section(i9Rows));
      } catch (err: unknown) {
        const loadEl = wrapper.querySelector('.py-12');
        if (loadEl) loadEl.remove();
        const message = err instanceof Error ? err.message : 'Failed to load compliance data.';
        showMsg(wrapper, message, 'error');
      }
    }

    // ---- Initial Load ----
    void loadData();
  },
};
