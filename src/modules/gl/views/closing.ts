/**
 * Period Close view.
 * Fiscal year selector, periods table with close/reopen actions,
 * closing entries generation, and retained earnings selector.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDate = (iso: string): string => {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PeriodRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'locked';
}

interface ClosingEntryRow {
  id: string;
  number: string;
  date: string;
  description: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Status badge map
// ---------------------------------------------------------------------------

const PERIOD_STATUS_BADGE: Record<string, string> = {
  open: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  locked: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Fiscal year selector
// ---------------------------------------------------------------------------

function buildYearSelector(onChange: (year: number) => void): HTMLElement {
  const row = el('div', 'flex items-center gap-3 mb-4');
  const label = el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Fiscal Year');
  row.appendChild(label);

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const yearSelect = el('select', inputCls) as HTMLSelectElement;
  yearSelect.setAttribute('data-role', 'year-select');

  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 1; y >= currentYear - 5; y--) {
    const opt = el('option', '', String(y)) as HTMLOptionElement;
    opt.value = String(y);
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  yearSelect.addEventListener('change', () => onChange(parseInt(yearSelect.value, 10)));
  row.appendChild(yearSelect);

  return row;
}

// ---------------------------------------------------------------------------
// Periods table
// ---------------------------------------------------------------------------

function buildPeriodsTable(
  periods: PeriodRow[],
  onClose: (id: string) => void,
  onReopen: (id: string) => void,
): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-6');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Fiscal Periods'));

  const table = el('table', 'w-full text-sm');

  // thead
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Period Name', 'Start', 'End', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = el('tbody');
  tbody.setAttribute('data-role', 'period-rows');

  if (periods.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No fiscal periods for the selected year. Periods are generated automatically or can be created in settings.');
    td.setAttribute('colspan', '5');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const period of periods) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', period.name));
    tr.appendChild(el('td', 'py-2 px-3', fmtDate(period.startDate)));
    tr.appendChild(el('td', 'py-2 px-3', fmtDate(period.endDate)));

    // Status badge
    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${PERIOD_STATUS_BADGE[period.status] ?? PERIOD_STATUS_BADGE.open}`,
      period.status.charAt(0).toUpperCase() + period.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    // Actions
    const tdActions = el('td', 'py-2 px-3');
    const actionsWrap = el('div', 'flex items-center gap-2');

    if (period.status === 'open') {
      const closeBtn = el('button', 'px-3 py-1 rounded-md text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30', 'Close');
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => onClose(period.id));
      actionsWrap.appendChild(closeBtn);
    } else if (period.status === 'closed') {
      const reopenBtn = el('button', 'px-3 py-1 rounded-md text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30', 'Reopen');
      reopenBtn.type = 'button';
      reopenBtn.addEventListener('click', () => onReopen(period.id));
      actionsWrap.appendChild(reopenBtn);
    } else {
      actionsWrap.appendChild(el('span', 'text-xs text-[var(--text-muted)]', 'Locked'));
    }

    tdActions.appendChild(actionsWrap);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  section.appendChild(table);
  return section;
}

// ---------------------------------------------------------------------------
// Closing entries section
// ---------------------------------------------------------------------------

function buildClosingSection(
  closingEntries: ClosingEntryRow[],
  onGenerate: (retainedEarningsAccountId: string) => void,
): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Closing Entries'));

  // Retained earnings selector + generate button
  const controlRow = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const reLabel = el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Retained Earnings Account');
  controlRow.appendChild(reLabel);

  const reSelect = el('select', inputCls) as HTMLSelectElement;
  reSelect.name = 'retainedEarningsAccountId';
  reSelect.setAttribute('data-role', 'retained-earnings-select');
  const defaultOpt = el('option', '', 'Select account...') as HTMLOptionElement;
  defaultOpt.value = '';
  reSelect.appendChild(defaultOpt);
  controlRow.appendChild(reSelect);

  const generateBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate Closing Entries');
  generateBtn.type = 'button';
  generateBtn.addEventListener('click', () => {
    onGenerate(reSelect.value);
  });
  controlRow.appendChild(generateBtn);

  section.appendChild(controlRow);

  // Existing closing entries table
  if (closingEntries.length > 0) {
    const table = el('table', 'w-full text-sm');

    const thead = el('thead');
    const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
    for (const col of ['Entry #', 'Date', 'Description', 'Status']) {
      headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    for (const ce of closingEntries) {
      const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

      const tdNum = el('td', 'py-2 px-3 font-mono');
      const link = el('a', 'text-[var(--accent)] hover:underline', ce.number) as HTMLAnchorElement;
      link.href = `#/gl/journal/${ce.id}`;
      tdNum.appendChild(link);
      tr.appendChild(tdNum);

      tr.appendChild(el('td', 'py-2 px-3', fmtDate(ce.date)));
      tr.appendChild(el('td', 'py-2 px-3', ce.description));

      const statusBadge = el(
        'span',
        `px-2 py-0.5 rounded-full text-xs font-medium ${ce.status === 'posted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`,
        ce.status.charAt(0).toUpperCase() + ce.status.slice(1),
      );
      const tdStatus = el('td', 'py-2 px-3');
      tdStatus.appendChild(statusBadge);
      tr.appendChild(tdStatus);

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    section.appendChild(table);
  } else {
    section.appendChild(
      el('p', 'text-sm text-[var(--text-muted)]', 'No closing entries generated yet for the selected period.'),
    );
  }

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', 'space-y-0');

    // Title
    wrapper.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)] mb-4', 'Period Close'));

    // Year selector
    wrapper.appendChild(
      buildYearSelector((_year) => {
        // Service wiring refreshes periods for the selected year
      }),
    );

    // Periods table (empty shell)
    const periods: PeriodRow[] = [];
    wrapper.appendChild(
      buildPeriodsTable(
        periods,
        (_id) => { /* close handler placeholder */ },
        (_id) => { /* reopen handler placeholder */ },
      ),
    );

    // Closing entries section (empty shell)
    const closingEntries: ClosingEntryRow[] = [];
    wrapper.appendChild(
      buildClosingSection(closingEntries, (_accountId) => {
        // Generate closing entries placeholder
      }),
    );

    container.appendChild(wrapper);
  },
};
