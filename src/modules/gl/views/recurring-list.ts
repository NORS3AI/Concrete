/**
 * Recurring Journal Entries management view.
 * Table of recurring templates with execute and edit actions.
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

interface RecurringRow {
  id: string;
  name: string;
  frequency: string;
  nextRunDate: string;
  lastRunDate?: string;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Frequency labels
// ---------------------------------------------------------------------------

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  entries: RecurringRow[],
  onExecute: (id: string) => void,
): HTMLElement {
  const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  // thead
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Frequency', 'Next Run', 'Last Run', 'Active', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = el('tbody');
  tbody.setAttribute('data-role', 'recurring-rows');

  if (entries.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No recurring journal entries. Create a template to automate repeating entries.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const entry of entries) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    // Name
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', entry.name));

    // Frequency
    tr.appendChild(el('td', 'py-2 px-3', FREQ_LABELS[entry.frequency] ?? entry.frequency));

    // Next Run
    tr.appendChild(el('td', 'py-2 px-3', fmtDate(entry.nextRunDate)));

    // Last Run
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', entry.lastRunDate ? fmtDate(entry.lastRunDate) : '--'));

    // Active badge
    const tdActive = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      entry.isActive
        ? 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20',
      entry.isActive ? 'Active' : 'Inactive',
    );
    tdActive.appendChild(badge);
    tr.appendChild(tdActive);

    // Actions
    const tdActions = el('td', 'py-2 px-3');
    const actionsWrap = el('div', 'flex items-center gap-2');

    const executeBtn = el('button', 'px-3 py-1 rounded-md text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Execute');
    executeBtn.type = 'button';
    executeBtn.addEventListener('click', () => onExecute(entry.id));
    actionsWrap.appendChild(executeBtn);

    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/gl/recurring/${entry.id}`;
    actionsWrap.appendChild(editLink);

    tdActions.appendChild(actionsWrap);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  return tableWrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', 'space-y-0');

    // Header row
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Recurring Journal Entries'));

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Template');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => {
      // Service wiring opens create form or navigates
    });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Table (empty shell)
    const entries: RecurringRow[] = [];
    wrapper.appendChild(
      buildTable(entries, (_id) => {
        // Execute placeholder — service wiring happens later
      }),
    );

    container.appendChild(wrapper);
  },
};
