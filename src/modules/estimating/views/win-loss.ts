/**
 * Win/Loss Analysis view.
 * Dashboard showing win/loss statistics, win rate trends,
 * margin analysis, and competitor comparison for estimating performance.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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

interface WinLossStatsData {
  totalEstimates: number;
  totalWon: number;
  totalLost: number;
  totalPending: number;
  winRate: number;
  totalWonValue: number;
  totalLostValue: number;
  averageMarginWon: number;
  averageMarginLost: number;
}

interface EstimateDetailRow {
  id: string;
  name: string;
  clientName: string;
  totalPrice: number;
  marginPct: number;
  status: string;
  bidDate: string;
  lostReason: string;
  competitorName: string;
  competitorPrice: number;
}

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------

function buildKPICards(stats: WinLossStatsData): HTMLElement {
  const grid = el('div', 'grid grid-cols-5 gap-4 mb-6');

  const buildCard = (label: string, value: string, subtext?: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 text-center');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', label));
    card.appendChild(el('div', `text-2xl font-bold mt-1 font-mono ${colorCls ?? 'text-[var(--text)]'}`, value));
    if (subtext) {
      card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', subtext));
    }
    return card;
  };

  grid.appendChild(buildCard('Win Rate', fmtPct(stats.winRate), `${stats.totalWon}W / ${stats.totalLost}L`, stats.winRate >= 30 ? 'text-emerald-400' : 'text-red-400'));
  grid.appendChild(buildCard('Total Estimates', String(stats.totalEstimates), `${stats.totalPending} pending`));
  grid.appendChild(buildCard('Won Value', fmtCurrency(stats.totalWonValue), undefined, 'text-emerald-400'));
  grid.appendChild(buildCard('Lost Value', fmtCurrency(stats.totalLostValue), undefined, 'text-red-400'));
  grid.appendChild(buildCard('Avg Margin (Won)', fmtPct(stats.averageMarginWon), `Lost avg: ${fmtPct(stats.averageMarginLost)}`));

  return grid;
}

// ---------------------------------------------------------------------------
// Estimate Detail Table
// ---------------------------------------------------------------------------

function buildDetailTable(estimates: EstimateDetailRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Estimate', 'Client', 'Total Price', 'Margin', 'Status', 'Bid Date', 'Lost Reason', 'Competitor', 'Competitor $']) {
    const align = ['Total Price', 'Margin', 'Competitor $'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const STATUS_BADGE: Record<string, string> = {
    draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
    submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    won: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    lost: 'bg-red-500/10 text-red-400 border border-red-500/20',
    withdrawn: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  };

  const tbody = el('tbody');
  if (estimates.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No estimate data available for analysis.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const est of estimates) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline', est.name) as HTMLAnchorElement;
    link.href = `#/estimating/${est.id}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', est.clientName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(est.totalPrice)));

    const marginCls = est.marginPct >= 15 ? 'text-emerald-400' : est.marginPct >= 5 ? 'text-amber-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${marginCls}`, fmtPct(est.marginPct)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[est.status] ?? STATUS_BADGE.draft}`,
      est.status.charAt(0).toUpperCase() + est.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', est.bidDate ?? ''));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', est.lostReason ?? ''));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', est.competitorName ?? ''));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', est.competitorPrice > 0 ? fmtCurrency(est.competitorPrice) : ''));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Date Range Filter
// ---------------------------------------------------------------------------

function buildDateFilter(
  onFilter: (fromDate: string, toDate: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  bar.appendChild(el('label', 'text-sm text-[var(--text-muted)]', 'From:'));
  const fromInput = el('input', inputCls) as HTMLInputElement;
  fromInput.type = 'date';
  bar.appendChild(fromInput);

  bar.appendChild(el('label', 'text-sm text-[var(--text-muted)]', 'To:'));
  const toInput = el('input', inputCls) as HTMLInputElement;
  toInput.type = 'date';
  bar.appendChild(toInput);

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Apply');
  applyBtn.addEventListener('click', () => {
    onFilter(fromInput.value, toInput.value);
  });
  bar.appendChild(applyBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Win/Loss Analysis'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Export Report');
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildDateFilter((_fromDate, _toDate) => { /* filter placeholder */ }));

    const stats: WinLossStatsData = {
      totalEstimates: 0,
      totalWon: 0,
      totalLost: 0,
      totalPending: 0,
      winRate: 0,
      totalWonValue: 0,
      totalLostValue: 0,
      averageMarginWon: 0,
      averageMarginLost: 0,
    };
    wrapper.appendChild(buildKPICards(stats));

    wrapper.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Estimate Details'));

    const estimates: EstimateDetailRow[] = [];
    wrapper.appendChild(buildDetailTable(estimates));

    container.appendChild(wrapper);
  },
};
