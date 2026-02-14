/**
 * OSHA 300 / 300A Logs view.
 * Generates OSHA 300 log and 300A summary for a given year. Includes
 * CSV export of the 300 log. Wired to SafetyService for data generation.
 */

import { getSafetyService } from '../service-accessor';
import type { OSHALog300Entry, OSHA300ASummary } from '../safety-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string> | string,
  ...children: Array<string | HTMLElement>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (typeof attrs === 'string') {
    node.className = attrs;
  } else if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class' || k === 'className') {
        node.className = v;
      } else {
        node.setAttribute(k, v);
      }
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

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // ---- Header ----
    wrapper.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)] mb-4', 'OSHA 300 / 300A Logs'));

    // ---- Input Bar ----
    const inputBar = el('div', 'flex flex-wrap items-end gap-4 mb-6');

    const yearGroup = el('div');
    yearGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Year'));
    const yearInput = el('input', inputCls + ' w-28') as HTMLInputElement;
    yearInput.type = 'number';
    yearInput.value = String(new Date().getFullYear());
    yearInput.min = '2000';
    yearInput.max = '2099';
    yearGroup.appendChild(yearInput);
    inputBar.appendChild(yearGroup);

    const avgEmpGroup = el('div');
    avgEmpGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Average Employees'));
    const avgEmpInput = el('input', inputCls + ' w-36') as HTMLInputElement;
    avgEmpInput.type = 'number';
    avgEmpInput.placeholder = 'e.g. 150';
    avgEmpInput.min = '0';
    avgEmpGroup.appendChild(avgEmpInput);
    inputBar.appendChild(avgEmpGroup);

    const hoursGroup = el('div');
    hoursGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Total Hours Worked'));
    const hoursInput = el('input', inputCls + ' w-40') as HTMLInputElement;
    hoursInput.type = 'number';
    hoursInput.placeholder = 'e.g. 300000';
    hoursInput.min = '0';
    hoursGroup.appendChild(hoursInput);
    inputBar.appendChild(hoursGroup);

    const generateBtn = el('button', btnCls, 'Generate');
    generateBtn.type = 'button';
    inputBar.appendChild(generateBtn);

    wrapper.appendChild(inputBar);

    // ---- Log 300 Section ----
    const log300Container = el('div', 'mb-8');
    wrapper.appendChild(log300Container);

    // ---- 300A Summary Section ----
    const summaryContainer = el('div', 'mb-6');
    wrapper.appendChild(summaryContainer);

    // ---- Export Button Row ----
    const exportRow = el('div', 'mb-6 hidden');
    const exportBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Export OSHA 300',
    );
    exportBtn.type = 'button';
    exportRow.appendChild(exportBtn);
    wrapper.appendChild(exportRow);

    container.appendChild(wrapper);

    // ---- State ----
    let currentEntries: OSHALog300Entry[] = [];

    // ---- Placeholder ----
    function showPlaceholder(): void {
      log300Container.innerHTML = '';
      summaryContainer.innerHTML = '';
      exportRow.classList.add('hidden');
      const placeholder = el(
        'div',
        'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center text-[var(--text-muted)]',
        'Enter year and click Generate to produce OSHA 300 and 300A logs.',
      );
      log300Container.appendChild(placeholder);
    }

    // ---- Render 300 Log Table ----
    function render300Log(entries: OSHALog300Entry[]): void {
      log300Container.innerHTML = '';

      const section = el('div');
      section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'OSHA 300 Log'));

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      const columns = [
        'Case #', 'Employee', 'Date', 'Location', 'Description', 'Death',
        'Days Away', 'Days Restricted', 'Other Recordable', 'Injury Type', 'Body Part',
      ];
      for (const col of columns) {
        headRow.appendChild(
          el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col),
        );
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (entries.length === 0) {
        const tr = el('tr');
        const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No recordable incidents found for this year.');
        td.setAttribute('colspan', String(columns.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const entry of entries) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', entry.caseNumber));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', entry.employeeName));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', entry.date));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', entry.location ?? '-'));
        const desc = entry.description.length > 50 ? entry.description.substring(0, 50) + '...' : entry.description;
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', desc));

        // Death
        const tdDeath = el('td', 'px-4 py-3 text-sm');
        if (entry.deathFlag) {
          tdDeath.appendChild(el('span', 'text-red-400 font-semibold', 'Yes'));
        } else {
          tdDeath.appendChild(el('span', 'text-emerald-400', '-'));
        }
        tr.appendChild(tdDeath);

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(entry.daysAway)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(entry.daysRestricted)));

        // Other Recordable
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', entry.otherRecordable ? 'Yes' : '-'));

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', entry.injuryType));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', entry.bodyPart ?? '-'));

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      section.appendChild(wrap);
      log300Container.appendChild(section);
    }

    // ---- Render 300A Summary ----
    function render300ASummary(summary: OSHA300ASummary): void {
      summaryContainer.innerHTML = '';

      const section = el('div');
      section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'OSHA 300A Summary'));

      const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
      const grid = el('div', 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4');

      const fields: { label: string; value: string }[] = [
        { label: 'Year', value: String(summary.year) },
        { label: 'Total Cases', value: String(summary.totalCases) },
        { label: 'Deaths', value: String(summary.deathCases) },
        { label: 'Days Away Cases', value: String(summary.daysAwayCases) },
        { label: 'Restricted Cases', value: String(summary.restrictedCases) },
        { label: 'Other Recordable', value: String(summary.otherRecordableCases) },
        { label: 'Total Days Away', value: String(summary.totalDaysAway) },
        { label: 'Total Days Restricted', value: String(summary.totalDaysRestricted) },
        { label: 'Avg Employees', value: String(summary.averageEmployees) },
        { label: 'Total Hours', value: summary.totalHoursWorked.toLocaleString() },
      ];

      for (const f of fields) {
        const item = el('div');
        item.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1', f.label));
        item.appendChild(el('div', 'text-lg font-bold text-[var(--text)]', f.value));
        grid.appendChild(item);
      }

      card.appendChild(grid);
      section.appendChild(card);
      summaryContainer.appendChild(section);
    }

    // ---- Generate ----
    generateBtn.addEventListener('click', () => {
      const year = parseInt(yearInput.value, 10);
      if (isNaN(year) || year < 2000 || year > 2099) {
        showMsg(wrapper, 'Please enter a valid year (2000-2099).', true);
        return;
      }
      const avgEmployees = parseInt(avgEmpInput.value, 10) || 0;
      const totalHours = parseInt(hoursInput.value, 10) || 0;

      log300Container.innerHTML = '';
      summaryContainer.innerHTML = '';
      const loading = el('div', 'py-8 text-center text-[var(--text-muted)]', 'Generating OSHA logs...');
      log300Container.appendChild(loading);

      void (async () => {
        try {
          const svc = getSafetyService();
          const [entries, summary] = await Promise.all([
            svc.generateOSHA300(year),
            svc.generateOSHA300A(year, avgEmployees, totalHours),
          ]);

          currentEntries = entries;
          render300Log(entries);
          render300ASummary(summary);
          exportRow.classList.remove('hidden');
        } catch (err: unknown) {
          log300Container.innerHTML = '';
          const message = err instanceof Error ? err.message : 'Failed to generate OSHA logs.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Export OSHA 300 as CSV ----
    exportBtn.addEventListener('click', () => {
      if (currentEntries.length === 0) {
        showMsg(wrapper, 'No data to export. Generate the log first.', true);
        return;
      }

      const headers = [
        'Case Number', 'Employee Name', 'Date', 'Location', 'Description',
        'Death', 'Days Away', 'Days Restricted', 'Other Recordable', 'Injury Type', 'Body Part',
      ];

      const rows = currentEntries.map((e) => [
        e.caseNumber,
        e.employeeName,
        e.date,
        e.location ?? '',
        `"${e.description.replace(/"/g, '""')}"`,
        e.deathFlag ? 'Yes' : 'No',
        String(e.daysAway),
        String(e.daysRestricted),
        e.otherRecordable ? 'Yes' : 'No',
        e.injuryType,
        e.bodyPart ?? '',
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OSHA_300_${yearInput.value}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showMsg(wrapper, 'OSHA 300 log exported as CSV.', false);
    });

    // ---- Initial state ----
    showPlaceholder();
  },
};
