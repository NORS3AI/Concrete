/**
 * Win/Loss Analysis view.
 * Dashboard showing win/loss statistics, win rate trends,
 * margin analysis, and competitor comparison for estimating performance.
 */

import { getEstimatingService } from '../service-accessor';

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

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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

interface EstimateRow {
  id: string;
  name: string;
  clientName?: string;
  totalPrice: number;
  marginPct: number;
  status: string;
  bidDate?: string;
  lostReason?: string;
  competitorName?: string;
  competitorPrice?: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let fromDate = '';
let toDate = '';

// ---------------------------------------------------------------------------
// Status Badge Map
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  won: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  lost: 'bg-red-500/10 text-red-400 border border-red-500/20',
  withdrawn: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

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

  const winRateColor = stats.winRate >= 30 ? 'text-emerald-400' : stats.winRate < 15 ? 'text-red-400' : 'text-[var(--text)]';
  grid.appendChild(buildCard('Win Rate', fmtPct(stats.winRate), `${stats.totalWon}W / ${stats.totalLost}L`, winRateColor));
  grid.appendChild(buildCard('Total Estimates', String(stats.totalEstimates), `${stats.totalPending} pending`));
  grid.appendChild(buildCard('Won Value', fmtCurrency(stats.totalWonValue), undefined, 'text-emerald-400'));
  grid.appendChild(buildCard('Lost Value', fmtCurrency(stats.totalLostValue), undefined, 'text-red-400'));
  grid.appendChild(buildCard('Avg Won Margin', fmtPct(stats.averageMarginWon), `Lost avg: ${fmtPct(stats.averageMarginLost)}`));

  return grid;
}

// ---------------------------------------------------------------------------
// Date Range Filter
// ---------------------------------------------------------------------------

function buildDateFilter(
  onFilter: (from: string, to: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  bar.appendChild(el('label', 'text-sm text-[var(--text-muted)]', 'From:'));
  const fromInput = el('input', inputCls) as HTMLInputElement;
  fromInput.type = 'date';
  fromInput.value = fromDate;
  bar.appendChild(fromInput);

  bar.appendChild(el('label', 'text-sm text-[var(--text-muted)]', 'To:'));
  const toInput = el('input', inputCls) as HTMLInputElement;
  toInput.type = 'date';
  toInput.value = toDate;
  bar.appendChild(toInput);

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Apply');
  applyBtn.addEventListener('click', () => {
    fromDate = fromInput.value;
    toDate = toInput.value;
    onFilter(fromDate, toDate);
  });
  bar.appendChild(applyBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Detail Table with Actions
// ---------------------------------------------------------------------------

function buildDetailTable(
  estimates: EstimateRow[],
  onMarkWon: (id: string) => void,
  onMarkLost: (id: string) => void,
  onWithdraw: (id: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Estimate Name', 'Client', 'Total Price', 'Margin %', 'Status', 'Bid Date', 'Lost Reason', 'Competitor', 'Competitor Price', 'Actions']) {
    const align = ['Total Price', 'Margin %', 'Competitor Price'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (estimates.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No estimate data available for analysis.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const est of estimates) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    // Estimate name as link
    const tdName = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline', est.name) as HTMLAnchorElement;
    link.href = `#/estimating/${est.id}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', est.clientName ?? ''));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(est.totalPrice)));

    const marginCls = est.marginPct >= 15 ? 'text-emerald-400' : est.marginPct >= 5 ? 'text-amber-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${marginCls}`, fmtPct(est.marginPct)));

    // Status badge
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
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', est.competitorPrice && est.competitorPrice > 0 ? fmtCurrency(est.competitorPrice) : ''));

    // Actions column
    const tdActions = el('td', 'py-2 px-3');
    const actionWrap = el('div', 'flex items-center gap-1');

    if (est.status === 'submitted') {
      const wonBtn = el('button', 'px-2 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:opacity-90', 'Won');
      wonBtn.addEventListener('click', () => onMarkWon(est.id));
      actionWrap.appendChild(wonBtn);

      const lostBtn = el('button', 'px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:opacity-90', 'Lost');
      lostBtn.addEventListener('click', () => onMarkLost(est.id));
      actionWrap.appendChild(lostBtn);

      const withdrawBtn = el('button', 'px-2 py-1 rounded text-xs font-medium bg-amber-600 text-white hover:opacity-90', 'Withdraw');
      withdrawBtn.addEventListener('click', () => onWithdraw(est.id));
      actionWrap.appendChild(withdrawBtn);
    } else if (est.status === 'draft') {
      const withdrawBtn = el('button', 'px-2 py-1 rounded text-xs font-medium bg-amber-600 text-white hover:opacity-90', 'Withdraw');
      withdrawBtn.addEventListener('click', () => onWithdraw(est.id));
      actionWrap.appendChild(withdrawBtn);
    }

    tdActions.appendChild(actionWrap);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportReport(stats: WinLossStatsData, estimates: EstimateRow[]): void {
  const csvLines: string[] = [];

  // Stats summary section
  csvLines.push('Win/Loss Report Summary');
  csvLines.push(`Win Rate,${fmtPct(stats.winRate)}`);
  csvLines.push(`Total Estimates,${stats.totalEstimates}`);
  csvLines.push(`Total Won,${stats.totalWon}`);
  csvLines.push(`Total Lost,${stats.totalLost}`);
  csvLines.push(`Total Pending,${stats.totalPending}`);
  csvLines.push(`Won Value,"${fmtCurrency(stats.totalWonValue)}"`);
  csvLines.push(`Lost Value,"${fmtCurrency(stats.totalLostValue)}"`);
  csvLines.push(`Avg Margin Won,${fmtPct(stats.averageMarginWon)}`);
  csvLines.push(`Avg Margin Lost,${fmtPct(stats.averageMarginLost)}`);
  csvLines.push('');

  // Detail section
  csvLines.push('Estimate Details');
  csvLines.push('Estimate Name,Client,Total Price,Margin %,Status,Bid Date,Lost Reason,Competitor,Competitor Price');

  for (const est of estimates) {
    csvLines.push([
      `"${(est.name || '').replace(/"/g, '""')}"`,
      `"${(est.clientName || '').replace(/"/g, '""')}"`,
      est.totalPrice.toFixed(2),
      est.marginPct.toFixed(1),
      est.status,
      est.bidDate ?? '',
      `"${(est.lostReason || '').replace(/"/g, '""')}"`,
      `"${(est.competitorName || '').replace(/"/g, '""')}"`,
      est.competitorPrice && est.competitorPrice > 0 ? est.competitorPrice.toFixed(2) : '',
    ].join(','));
  }

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `win-loss-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Filter estimates by date range
// ---------------------------------------------------------------------------

function filterEstimatesByDate(estimates: EstimateRow[], from: string, to: string): EstimateRow[] {
  let filtered = estimates;

  if (from) {
    filtered = filtered.filter((e) => e.bidDate && e.bidDate >= from);
  }
  if (to) {
    filtered = filtered.filter((e) => e.bidDate && e.bidDate <= to);
  }

  return filtered;
}

// ---------------------------------------------------------------------------
// Mark Lost Dialog
// ---------------------------------------------------------------------------

function promptMarkLost(callback: (lostReason: string, competitorName: string, competitorPrice: number | undefined) => void): void {
  const overlay = el('div', 'fixed inset-0 bg-black/50 flex items-center justify-center z-50');
  const dialog = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 w-full max-w-md');

  dialog.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-4', 'Mark Estimate as Lost'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full mb-3';

  dialog.appendChild(el('label', 'text-sm text-[var(--text-muted)] mb-1 block', 'Lost Reason'));
  const reasonInput = el('input', inputCls) as HTMLInputElement;
  reasonInput.type = 'text';
  reasonInput.placeholder = 'e.g., Price too high, scope mismatch...';
  dialog.appendChild(reasonInput);

  dialog.appendChild(el('label', 'text-sm text-[var(--text-muted)] mb-1 block', 'Competitor Name'));
  const competitorInput = el('input', inputCls) as HTMLInputElement;
  competitorInput.type = 'text';
  competitorInput.placeholder = 'e.g., ABC Construction';
  dialog.appendChild(competitorInput);

  dialog.appendChild(el('label', 'text-sm text-[var(--text-muted)] mb-1 block', 'Competitor Price'));
  const priceInput = el('input', inputCls) as HTMLInputElement;
  priceInput.type = 'number';
  priceInput.placeholder = '0.00';
  priceInput.step = '0.01';
  dialog.appendChild(priceInput);

  const btnRow = el('div', 'flex items-center gap-3 mt-4');

  const confirmBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Mark as Lost');
  confirmBtn.addEventListener('click', () => {
    const price = priceInput.value ? parseFloat(priceInput.value) : undefined;
    callback(reasonInput.value, competitorInput.value, price);
    overlay.remove();
  });
  btnRow.appendChild(confirmBtn);

  const cancelBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel');
  cancelBtn.addEventListener('click', () => overlay.remove());
  btnRow.appendChild(cancelBtn);

  dialog.appendChild(btnRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
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
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    // Content area (stats + table)
    const contentArea = el('div');
    contentArea.setAttribute('data-wl-content', '1');
    wrapper.appendChild(contentArea);

    container.appendChild(wrapper);

    // Cached data for export
    let currentStats: WinLossStatsData = {
      totalEstimates: 0, totalWon: 0, totalLost: 0, totalPending: 0,
      winRate: 0, totalWonValue: 0, totalLostValue: 0,
      averageMarginWon: 0, averageMarginLost: 0,
    };
    let allEstimates: EstimateRow[] = [];
    let displayedEstimates: EstimateRow[] = [];

    const svc = getEstimatingService();

    // Load and render everything
    async function loadAndRender(): Promise<void> {
      try {
        const filters: { fromDate?: string; toDate?: string } = {};
        if (fromDate) filters.fromDate = fromDate;
        if (toDate) filters.toDate = toDate;

        const [stats, rawEstimates] = await Promise.all([
          svc.getWinLossStats(filters),
          svc.getEstimates(),
        ]);

        currentStats = stats;

        // Map service estimates to view rows
        allEstimates = rawEstimates.map((e) => ({
          id: e.id,
          name: e.name,
          clientName: e.clientName,
          totalPrice: e.totalPrice,
          marginPct: e.marginPct,
          status: e.status,
          bidDate: e.bidDate,
          lostReason: e.lostReason,
          competitorName: e.competitorName,
          competitorPrice: e.competitorPrice,
        }));

        // Filter detail table by date range
        displayedEstimates = filterEstimatesByDate(allEstimates, fromDate, toDate);

        renderContent();
      } catch (err) {
        showMsg(wrapper, `Error loading win/loss data: ${(err as Error).message}`, true);
        renderContent();
      }
    }

    function renderContent(): void {
      contentArea.innerHTML = '';

      // Date filter
      const dateFilter = buildDateFilter((_from, _to) => {
        loadAndRender();
      });
      contentArea.appendChild(dateFilter);

      // KPI cards
      contentArea.appendChild(buildKPICards(currentStats));

      // Detail heading
      contentArea.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Estimate Details'));

      // Detail table with action handlers
      const detailTable = buildDetailTable(
        displayedEstimates,
        // Mark Won
        async (id: string) => {
          try {
            await svc.markAsWon(id);
            showMsg(wrapper, 'Estimate marked as won.', false);
            await loadAndRender();
          } catch (err) {
            showMsg(wrapper, `Error: ${(err as Error).message}`, true);
          }
        },
        // Mark Lost
        (id: string) => {
          promptMarkLost(async (lostReason, competitorName, competitorPrice) => {
            try {
              await svc.markAsLost(id, lostReason || undefined, competitorName || undefined, competitorPrice);
              showMsg(wrapper, 'Estimate marked as lost.', false);
              await loadAndRender();
            } catch (err) {
              showMsg(wrapper, `Error: ${(err as Error).message}`, true);
            }
          });
        },
        // Withdraw
        async (id: string) => {
          if (!confirm('Are you sure you want to withdraw this estimate?')) return;
          try {
            await svc.withdrawEstimate(id);
            showMsg(wrapper, 'Estimate withdrawn.', false);
            await loadAndRender();
          } catch (err) {
            showMsg(wrapper, `Error: ${(err as Error).message}`, true);
          }
        },
      );
      contentArea.appendChild(detailTable);
    }

    // Wire export button
    exportBtn.addEventListener('click', () => {
      if (allEstimates.length === 0 && currentStats.totalEstimates === 0) {
        showMsg(wrapper, 'No data to export.', true);
        return;
      }
      exportReport(currentStats, displayedEstimates);
      showMsg(wrapper, 'Report exported to CSV.', false);
    });

    // Initial load
    loadAndRender();
  },
};
