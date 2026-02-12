/**
 * GL Dashboard view — module landing page.
 * Shows KPI cards, quick-action buttons, and a recent journal entries table.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtDate = (iso: string): string => {
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
// KPI Row
// ---------------------------------------------------------------------------

interface KPI {
  label: string;
  value: string;
  color?: string; // extra Tailwind text class
}

function buildKPIRow(kpis: KPI[]): HTMLElement {
  const row = el('div', 'grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6');
  for (const kpi of kpis) {
    const card = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 text-center',
    );
    const value = el('div', `text-2xl font-bold ${kpi.color ?? 'text-[var(--text)]'}`, kpi.value);
    const label = el('div', 'text-xs text-[var(--text-muted)] mt-1', kpi.label);
    card.appendChild(value);
    card.appendChild(label);
    row.appendChild(card);
  }
  return row;
}

// ---------------------------------------------------------------------------
// Quick Actions
// ---------------------------------------------------------------------------

function buildQuickActions(): HTMLElement {
  const wrap = el('div', 'flex flex-wrap gap-3 mb-6');

  const actions: Array<{ label: string; href: string; primary?: boolean }> = [
    { label: 'New Account', href: '#/gl/accounts/new', primary: true },
    { label: 'New Journal Entry', href: '#/gl/journal/new', primary: true },
    { label: 'Trial Balance', href: '#/gl/trial-balance' },
  ];

  for (const action of actions) {
    const btn = el('a') as HTMLAnchorElement;
    btn.href = action.href;
    btn.textContent = action.label;
    btn.className = action.primary
      ? 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90'
      : 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)]';
    wrap.appendChild(btn);
  }

  return wrap;
}

// ---------------------------------------------------------------------------
// Recent Journal Entries Table
// ---------------------------------------------------------------------------

interface RecentJE {
  number: string;
  date: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  posted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  voided: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

function buildRecentTable(entries: RecentJE[]): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');

  const header = el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Recent Journal Entries');
  section.appendChild(header);

  const table = el('table', 'w-full text-sm');

  // thead
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Entry #', 'Date', 'Description', 'Debit', 'Credit', 'Status']) {
    const th = el('th', 'py-2 px-3 font-medium', col);
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = el('tbody');

  if (entries.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No journal entries yet.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const entry of entries) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', entry.number) as HTMLAnchorElement;
    link.href = `#/gl/journal/${entry.number}`;
    tdNum.appendChild(link);

    const tdDate = el('td', 'py-2 px-3', fmtDate(entry.date));
    const tdDesc = el('td', 'py-2 px-3 truncate max-w-[200px]', entry.description);
    const tdDebit = el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(entry.totalDebit));
    const tdCredit = el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(entry.totalCredit));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[entry.status] ?? STATUS_BADGE.draft}`,
      entry.status.charAt(0).toUpperCase() + entry.status.slice(1),
    );
    tdStatus.appendChild(badge);

    tr.append(tdNum, tdDate, tdDesc, tdDebit, tdCredit, tdStatus);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  section.appendChild(table);
  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', 'space-y-0');

    // Page title
    const title = el('h1', 'text-2xl font-bold text-[var(--text)] mb-6', 'General Ledger');
    wrapper.appendChild(title);

    // KPI row (placeholder values — wiring happens later)
    const kpis: KPI[] = [
      { label: 'Total Accounts', value: '0' },
      { label: 'Journal Entries (This Month)', value: '0' },
      { label: 'Total Debits', value: fmtCurrency(0), color: 'text-[var(--positive)]' },
      { label: 'Total Credits', value: fmtCurrency(0), color: 'text-[var(--negative)]' },
    ];
    wrapper.appendChild(buildKPIRow(kpis));

    // Quick actions
    wrapper.appendChild(buildQuickActions());

    // Recent journal entries table (empty shell — service wires data later)
    const sampleEntries: RecentJE[] = [];
    wrapper.appendChild(buildRecentTable(sampleEntries));

    container.appendChild(wrapper);
  },
};
