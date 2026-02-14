/**
 * Usage Stats view.
 * Dashboard with usage metrics: users, entities, storage, API calls.
 * Wired to TenantService for live data.
 */

import { getTenantService } from '../service-accessor';

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

/** Extract tenantId from hash: #/tenant/{id}/usage or similar */
function parseTenantId(): string {
  const hash = window.location.hash;
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts.length >= 3 && parts[0] === 'tenant') {
    return parts[1];
  }
  return '';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetricCard {
  label: string;
  value: string;
  limit: string;
  pct: number;
  colorCls: string;
  barColorCls: string;
}

/** Determine status from utilization percentage */
function getStatus(pct: number): 'ok' | 'warning' | 'critical' {
  if (pct >= 90) return 'critical';
  if (pct >= 70) return 'warning';
  return 'ok';
}

// ---------------------------------------------------------------------------
// Metric Cards
// ---------------------------------------------------------------------------

function buildMetricCards(
  stats: { userCount: number; maxUsers: number; entityCount: number; maxEntities: number; storageUsedMb: number; storageLimitMb: number } | null,
): HTMLElement {
  const grid = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const userPct = stats && stats.maxUsers > 0
    ? Math.round((stats.userCount / stats.maxUsers) * 100) : 0;
  const entityPct = stats && stats.maxEntities > 0
    ? Math.round((stats.entityCount / stats.maxEntities) * 100) : 0;
  const storagePct = stats && stats.storageLimitMb > 0
    ? Math.round((stats.storageUsedMb / stats.storageLimitMb) * 100) : 0;

  const storageLimitText = stats
    ? (stats.storageLimitMb >= 1000
      ? `/ ${(stats.storageLimitMb / 1000).toFixed(0)} GB`
      : `/ ${stats.storageLimitMb} MB`)
    : '/ 100 MB';

  const storageValueText = stats
    ? (stats.storageUsedMb >= 1000
      ? `${(stats.storageUsedMb / 1000).toFixed(1)} GB`
      : `${stats.storageUsedMb} MB`)
    : '0 MB';

  const metrics: MetricCard[] = [
    {
      label: 'Active Users',
      value: stats ? String(stats.userCount) : '0',
      limit: stats ? `/ ${stats.maxUsers}` : '/ 3',
      pct: userPct,
      colorCls: 'text-blue-400',
      barColorCls: userPct >= 90 ? 'bg-red-400' : userPct >= 70 ? 'bg-amber-400' : 'bg-blue-400',
    },
    {
      label: 'Entities',
      value: stats ? String(stats.entityCount) : '0',
      limit: stats ? `/ ${stats.maxEntities}` : '/ 5',
      pct: entityPct,
      colorCls: 'text-emerald-400',
      barColorCls: entityPct >= 90 ? 'bg-red-400' : entityPct >= 70 ? 'bg-amber-400' : 'bg-emerald-400',
    },
    {
      label: 'Storage Used',
      value: storageValueText,
      limit: storageLimitText,
      pct: storagePct,
      colorCls: 'text-purple-400',
      barColorCls: storagePct >= 90 ? 'bg-red-400' : storagePct >= 70 ? 'bg-amber-400' : 'bg-purple-400',
    },
    {
      label: 'API Calls (30d)',
      value: '0',
      limit: '/ 10,000',
      pct: 0,
      colorCls: 'text-amber-400',
      barColorCls: 'bg-amber-400',
    },
  ];

  for (const metric of metrics) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');

    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-2', metric.label));

    const valueRow = el('div', 'flex items-baseline gap-1 mb-3');
    valueRow.appendChild(el('span', `text-2xl font-bold ${metric.colorCls}`, metric.value));
    valueRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', metric.limit));
    card.appendChild(valueRow);

    const progressOuter = el('div', 'w-full h-2 bg-[var(--surface)] rounded-full overflow-hidden');
    const progressInner = el('div', `h-full ${metric.barColorCls} rounded-full transition-all`);
    progressInner.style.width = `${metric.pct}%`;
    progressOuter.appendChild(progressInner);
    card.appendChild(progressOuter);

    const pctLabel = el('div', 'text-xs text-[var(--text-muted)] mt-1 text-right', `${metric.pct}% utilized`);
    card.appendChild(pctLabel);

    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Usage Over Time Chart Placeholder
// ---------------------------------------------------------------------------

function buildUsageChart(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Usage Trends (30 Days)'));

  const chartArea = el('div', 'w-full h-48 bg-[var(--surface)] rounded-md flex items-center justify-center');
  chartArea.appendChild(el('span', 'text-[var(--text-muted)] text-sm', 'Chart data will appear once usage is tracked'));
  card.appendChild(chartArea);

  return card;
}

// ---------------------------------------------------------------------------
// Detailed Breakdown
// ---------------------------------------------------------------------------

function buildBreakdownTable(
  stats: { userCount: number; maxUsers: number; entityCount: number; maxEntities: number; storageUsedMb: number; storageLimitMb: number } | null,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Resource Breakdown'));

  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Resource', 'Current', 'Limit', 'Utilization', 'Status']) {
    const align = ['Current', 'Limit', 'Utilization'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');

  const userPct = stats && stats.maxUsers > 0
    ? Math.round((stats.userCount / stats.maxUsers) * 100) : 0;
  const entityPct = stats && stats.maxEntities > 0
    ? Math.round((stats.entityCount / stats.maxEntities) * 100) : 0;
  const storagePct = stats && stats.storageLimitMb > 0
    ? Math.round((stats.storageUsedMb / stats.storageLimitMb) * 100) : 0;

  const resources = [
    {
      name: 'Users',
      current: stats ? String(stats.userCount) : '0',
      limit: stats ? String(stats.maxUsers) : '3',
      pct: userPct,
      status: getStatus(userPct),
    },
    {
      name: 'Entities',
      current: stats ? String(stats.entityCount) : '0',
      limit: stats ? String(stats.maxEntities) : '5',
      pct: entityPct,
      status: getStatus(entityPct),
    },
    {
      name: 'Storage (MB)',
      current: stats ? String(stats.storageUsedMb) : '0',
      limit: stats ? String(stats.storageLimitMb) : '100',
      pct: storagePct,
      status: getStatus(storagePct),
    },
    { name: 'API Calls (monthly)', current: '0', limit: '10,000', pct: 0, status: 'ok' as const },
    { name: 'File Uploads', current: '0', limit: '50', pct: 0, status: 'ok' as const },
    { name: 'Report Exports', current: '0', limit: '100', pct: 0, status: 'ok' as const },
  ];

  const statusBadge: Record<string, string> = {
    ok: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
  };

  const statusLabel: Record<string, string> = {
    ok: 'OK',
    warning: 'Warning',
    critical: 'Critical',
  };

  for (const res of resources) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', res.name));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text)]', res.current));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', res.limit));

    const tdPct = el('td', 'py-2 px-3 text-right');
    const pctBar = el('div', 'flex items-center justify-end gap-2');
    const barOuter = el('div', 'w-16 h-2 bg-[var(--surface)] rounded-full overflow-hidden');
    const barColorCls = res.pct >= 90 ? 'bg-red-400' : res.pct >= 70 ? 'bg-amber-400' : 'bg-[var(--accent)]';
    const barInner = el('div', `h-full ${barColorCls} rounded-full`);
    barInner.style.width = `${res.pct}%`;
    barOuter.appendChild(barInner);
    pctBar.appendChild(barOuter);
    pctBar.appendChild(el('span', 'text-xs font-mono text-[var(--text-muted)]', `${res.pct}%`));
    tdPct.appendChild(pctBar);
    tr.appendChild(tdPct);

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[res.status]}`,
      statusLabel[res.status]);
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  card.appendChild(table);
  return card;
}

// ---------------------------------------------------------------------------
// Plan Upgrade CTA
// ---------------------------------------------------------------------------

function buildUpgradeCta(tenantId: string): HTMLElement {
  const card = el('div', 'bg-gradient-to-r from-[var(--accent)]/10 to-purple-500/10 border border-[var(--accent)]/20 rounded-lg p-6');

  const row = el('div', 'flex items-center justify-between');
  const text = el('div', '');
  text.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)]', 'Need more capacity?'));
  text.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Upgrade your plan to unlock higher limits for users, entities, storage, and more.'));
  row.appendChild(text);

  const upgradeBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'View Plans') as HTMLAnchorElement;
  upgradeBtn.href = `#/tenant/${tenantId}/subscription`;
  row.appendChild(upgradeBtn);

  card.appendChild(row);
  return card;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Usage Statistics'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Tenants') as HTMLAnchorElement;
    backLink.href = '#/tenant/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Show loading state
    const loadingEl = el('div', 'text-sm text-[var(--text-muted)] py-8 text-center', 'Loading usage statistics...');
    wrapper.appendChild(loadingEl);
    container.appendChild(wrapper);

    const tenantId = parseTenantId();
    if (!tenantId) {
      loadingEl.remove();
      showMsg(wrapper, 'Could not determine tenant ID from the URL.', true);
      // Render with defaults
      wrapper.appendChild(buildMetricCards(null));
      wrapper.appendChild(buildUsageChart());
      wrapper.appendChild(buildBreakdownTable(null));
      wrapper.appendChild(buildUpgradeCta(''));
      return;
    }

    const svc = getTenantService();

    Promise.all([
      svc.getUsageStats(tenantId),
      svc.getTenant(tenantId),
    ])
      .then(([usageStats, _tenant]) => {
        loadingEl.remove();

        const statsData = usageStats
          ? {
              userCount: usageStats.userCount,
              maxUsers: usageStats.maxUsers,
              entityCount: usageStats.entityCount,
              maxEntities: usageStats.maxEntities,
              storageUsedMb: usageStats.storageUsedMb,
              storageLimitMb: usageStats.storageLimitMb,
            }
          : null;

        wrapper.appendChild(buildMetricCards(statsData));
        wrapper.appendChild(buildUsageChart());
        wrapper.appendChild(buildBreakdownTable(statsData));
        wrapper.appendChild(buildUpgradeCta(tenantId));
      })
      .catch((err: unknown) => {
        loadingEl.remove();
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to load usage statistics: ${message}`, true);

        // Render with defaults on error
        wrapper.appendChild(buildMetricCards(null));
        wrapper.appendChild(buildUsageChart());
        wrapper.appendChild(buildBreakdownTable(null));
        wrapper.appendChild(buildUpgradeCta(tenantId));
      });
  },
};
