/**
 * Bandwidth Profiles view.
 * Displays bandwidth profiles as configuration cards with connection type,
 * max batch size, compression, delta-only, sync interval, and max retries.
 */

import { getSyncService } from '../service-accessor';

const svc = () => getSyncService();

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
  setTimeout(() => msg.remove(), 3000);
}

const CONNECTION_BADGE: Record<string, string> = {
  '5g': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  wifi: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  '4g': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  lte: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  '3g': 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  '2g': 'bg-red-500/10 text-red-400 border border-red-500/20',
  offline: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

function formatInterval(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const headerLeft = el('div', 'flex items-center gap-3');
    headerLeft.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Bandwidth Profiles'));
    const countBadge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    headerLeft.appendChild(countBadge);
    headerRow.appendChild(headerLeft);
    wrapper.appendChild(headerRow);

    // Cards container
    const cardsContainer = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');
    wrapper.appendChild(cardsContainer);

    // Loading
    const loadingEl = el('div', 'flex items-center justify-center py-12');
    loadingEl.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading bandwidth profiles...'));
    cardsContainer.appendChild(loadingEl);

    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const items = await svc().listBandwidthProfiles();
        countBadge.textContent = String(items.length);

        cardsContainer.innerHTML = '';

        if (items.length === 0) {
          const empty = el('div', 'col-span-full py-12 text-center');
          empty.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'No bandwidth profiles configured.'));
          cardsContainer.appendChild(empty);
          return;
        }

        for (const item of items) {
          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-5');

          // Card header with connection type badge
          const cardHeader = el('div', 'flex items-center justify-between mb-4');
          const typeBadge = el('span',
            `px-3 py-1 rounded-full text-sm font-semibold uppercase ${CONNECTION_BADGE[item.connectionType] ?? CONNECTION_BADGE.offline}`,
            item.connectionType);
          cardHeader.appendChild(typeBadge);
          card.appendChild(cardHeader);

          // Config rows
          const configGrid = el('div', 'space-y-3');

          const configs = [
            { label: 'Max Batch Size', value: item.maxBatchSize.toLocaleString() },
            { label: 'Compression', value: item.compressionEnabled ? 'Enabled' : 'Disabled' },
            { label: 'Delta Only', value: item.deltaOnly ? 'Yes' : 'No' },
            { label: 'Sync Interval', value: formatInterval(item.syncIntervalMs) },
            { label: 'Max Retries', value: String(item.maxRetries) },
          ];

          for (const cfg of configs) {
            const row = el('div', 'flex items-center justify-between');
            row.appendChild(el('span', 'text-xs font-medium text-[var(--text-muted)]', cfg.label));
            row.appendChild(el('span', 'text-sm font-mono text-[var(--text)]', cfg.value));
            configGrid.appendChild(row);
          }

          // Compression & Delta indicators
          const indicators = el('div', 'flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]');
          if (item.compressionEnabled) {
            indicators.appendChild(el('span', 'px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400', 'Compressed'));
          }
          if (item.deltaOnly) {
            indicators.appendChild(el('span', 'px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400', 'Delta'));
          }
          if (indicators.children.length > 0) {
            configGrid.appendChild(indicators);
          }

          card.appendChild(configGrid);
          cardsContainer.appendChild(card);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load bandwidth profiles';
        showMsg(wrapper, message, true);
      }
    }

    void loadAndRender();
  },
};
