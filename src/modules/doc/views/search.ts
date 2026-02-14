/**
 * Document Search view.
 * Full-text search across document metadata including title, description,
 * tags, category, and file name. Also includes expiration dashboard and stats.
 */

import { getDocService } from '../service-accessor';

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABEL: Record<string, string> = {
  contract: 'Contract',
  change_order: 'Change Order',
  rfi: 'RFI',
  submittal: 'Submittal',
  drawing: 'Drawing',
  photo: 'Photo',
  report: 'Report',
  correspondence: 'Correspondence',
  insurance: 'Insurance',
  permit: 'Permit',
  other: 'Other',
};

const MATCH_FIELD_LABEL: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  tags: 'Tags',
  category: 'Category',
  fileName: 'File Name',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResultRow {
  documentId: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  matchField: string;
}

interface ExpiringDoc {
  id: string;
  title: string;
  category: string;
  expirationDate: string;
  daysRemaining: number;
}

// ---------------------------------------------------------------------------
// Search Results
// ---------------------------------------------------------------------------

function buildSearchResults(results: SearchResultRow[], query: string): HTMLElement {
  const wrap = el('div', 'space-y-2');

  if (query && results.length === 0) {
    const empty = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
    empty.appendChild(el('p', 'text-[var(--text-muted)]', `No documents found matching "${query}".`));
    wrap.appendChild(empty);
    return wrap;
  }

  if (!query) {
    const prompt = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
    prompt.appendChild(el('p', 'text-[var(--text-muted)]', 'Enter a search term to find documents by title, description, tags, category, or file name.'));
    wrap.appendChild(prompt);
    return wrap;
  }

  const countText = el('p', 'text-sm text-[var(--text-muted)] mb-2', `Found ${results.length} result(s) for "${query}"`);
  wrap.appendChild(countText);

  for (const result of results) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--surface)] transition-colors');

    const headerRow = el('div', 'flex items-center justify-between mb-1');

    const titleLink = el('a', 'font-medium text-[var(--accent)] hover:underline', result.title) as HTMLAnchorElement;
    titleLink.href = `#/doc/documents/${result.documentId}`;
    headerRow.appendChild(titleLink);

    const catBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20',
      CATEGORY_LABEL[result.category] ?? result.category);
    headerRow.appendChild(catBadge);

    card.appendChild(headerRow);

    if (result.description) {
      card.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-1', result.description));
    }

    const metaRow = el('div', 'flex flex-wrap items-center gap-2');

    const matchBadge = el('span', 'text-xs text-amber-400', `Matched in: ${MATCH_FIELD_LABEL[result.matchField] ?? result.matchField}`);
    metaRow.appendChild(matchBadge);

    if (result.tags && result.tags.length > 0) {
      for (const tag of result.tags.slice(0, 5)) {
        const tagSpan = el('span', 'inline-block px-1.5 py-0.5 rounded text-xs bg-zinc-500/10 text-zinc-400', tag);
        metaRow.appendChild(tagSpan);
      }
    }

    card.appendChild(metaRow);
    wrap.appendChild(card);
  }

  return wrap;
}

// ---------------------------------------------------------------------------
// Expiring Documents Section
// ---------------------------------------------------------------------------

function buildExpiringSection(
  expiringDocs: ExpiringDoc[],
  expiredDocs: ExpiringDoc[],
  onMarkExpired: () => void,
): HTMLElement {
  const section = el('div', 'space-y-6');

  // Expiring Within 30 Days
  const expiringBlock = el('div');
  expiringBlock.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Expiring Within 30 Days'));

  if (expiringDocs.length === 0) {
    const empty = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    empty.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'No documents expiring in the next 30 days.'));
    expiringBlock.appendChild(empty);
  } else {
    const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3');
    for (const doc of expiringDocs) {
      const card = el('div', 'bg-amber-500/5 border border-amber-500/20 rounded-lg p-4');
      const titleLink = el('a', 'font-medium text-[var(--accent)] hover:underline text-sm', doc.title) as HTMLAnchorElement;
      titleLink.href = `#/doc/documents/${doc.id}`;
      card.appendChild(titleLink);

      const catBadge = el('span', 'inline-block ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20',
        CATEGORY_LABEL[doc.category] ?? doc.category);
      card.appendChild(catBadge);

      card.appendChild(el('p', 'text-xs text-amber-400 mt-1', `Expires: ${doc.expirationDate}`));
      card.appendChild(el('p', 'text-xs text-amber-400 font-medium', `${doc.daysRemaining} day(s) remaining`));
      grid.appendChild(card);
    }
    expiringBlock.appendChild(grid);
  }
  section.appendChild(expiringBlock);

  // Already Expired
  const expiredBlock = el('div');
  const expiredHeader = el('div', 'flex items-center justify-between mb-3');
  expiredHeader.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)]', 'Already Expired'));

  const markBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20', 'Mark All Expired');
  markBtn.addEventListener('click', onMarkExpired);
  expiredHeader.appendChild(markBtn);
  expiredBlock.appendChild(expiredHeader);

  if (expiredDocs.length === 0) {
    const empty = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    empty.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'No expired documents found.'));
    expiredBlock.appendChild(empty);
  } else {
    const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3');
    for (const doc of expiredDocs) {
      const card = el('div', 'bg-red-500/5 border border-red-500/20 rounded-lg p-4');
      const titleLink = el('a', 'font-medium text-[var(--accent)] hover:underline text-sm', doc.title) as HTMLAnchorElement;
      titleLink.href = `#/doc/documents/${doc.id}`;
      card.appendChild(titleLink);

      const catBadge = el('span', 'inline-block ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20',
        CATEGORY_LABEL[doc.category] ?? doc.category);
      card.appendChild(catBadge);

      card.appendChild(el('p', 'text-xs text-red-400 mt-1', `Expired: ${doc.expirationDate}`));
      grid.appendChild(card);
    }
    expiredBlock.appendChild(grid);
  }
  section.appendChild(expiredBlock);

  return section;
}

// ---------------------------------------------------------------------------
// Stats Section
// ---------------------------------------------------------------------------

function buildStatsSection(stats: {
  totalDocuments: number;
  totalRevisions: number;
  totalTemplates: number;
  totalTransmittals: number;
  totalPhotos: number;
  expiringWithin30Days: number;
}): HTMLElement {
  const section = el('div');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Document Statistics'));

  const grid = el('div', 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3');

  const items = [
    { label: 'Total Documents', value: String(stats.totalDocuments), cls: 'text-[var(--accent)]' },
    { label: 'Total Revisions', value: String(stats.totalRevisions), cls: 'text-[var(--text)]' },
    { label: 'Total Templates', value: String(stats.totalTemplates), cls: 'text-[var(--text)]' },
    { label: 'Total Transmittals', value: String(stats.totalTransmittals), cls: 'text-[var(--text)]' },
    { label: 'Total Photos', value: String(stats.totalPhotos), cls: 'text-[var(--text)]' },
    { label: 'Expiring Soon', value: String(stats.expiringWithin30Days), cls: stats.expiringWithin30Days > 0 ? 'text-amber-400' : 'text-[var(--text)]' },
  ];

  for (const item of items) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 text-center');
    card.appendChild(el('p', `text-2xl font-bold ${item.cls}`, item.value));
    card.appendChild(el('p', 'text-xs text-[var(--text-muted)] mt-1', item.label));
    grid.appendChild(card);
  }

  section.appendChild(grid);
  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-4');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Document Search'));
    wrapper.appendChild(headerRow);

    // Search input
    const searchBar = el('div', 'flex gap-3');
    const inputCls = 'flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-md px-4 py-3 text-sm text-[var(--text)]';

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search documents by title, description, tags, category, file name...';
    searchInput.autofocus = true;
    searchBar.appendChild(searchInput);

    const searchBtn = el('button', 'px-6 py-3 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Search');
    searchBar.appendChild(searchBtn);

    wrapper.appendChild(searchBar);

    // Results area
    const resultsArea = el('div', 'mt-4');
    resultsArea.appendChild(buildSearchResults([], ''));
    wrapper.appendChild(resultsArea);

    // Expiration section
    const expirationArea = el('div', 'mt-8');
    wrapper.appendChild(expirationArea);

    // Stats section
    const statsArea = el('div', 'mt-8');
    wrapper.appendChild(statsArea);

    container.appendChild(wrapper);

    // -- Search logic --
    const performSearch = async () => {
      const query = searchInput.value.trim();
      resultsArea.innerHTML = '';

      if (!query) {
        resultsArea.appendChild(buildSearchResults([], ''));
        return;
      }

      try {
        const svc = getDocService();
        const results = await svc.searchDocuments(query);
        const rows: SearchResultRow[] = results.map((r) => ({
          documentId: r.documentId,
          title: r.title,
          category: r.category,
          description: r.description ?? '',
          tags: r.tags ?? [],
          matchField: r.matchField,
        }));
        resultsArea.appendChild(buildSearchResults(rows, query));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Search failed.';
        showMsg(container, message, true);
        resultsArea.appendChild(buildSearchResults([], query));
      }
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });

    // -- Expiration dashboard --
    const loadExpirationData = async () => {
      expirationArea.innerHTML = '';
      try {
        const svc = getDocService();
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Expiring within 30 days
        const expiring = await svc.getExpiringDocuments(30);
        const expiringRows: ExpiringDoc[] = expiring.map((doc) => {
          const expDate = new Date(doc.expirationDate!);
          const diffMs = expDate.getTime() - today.getTime();
          const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          return {
            id: doc.id,
            title: doc.title,
            category: doc.category,
            expirationDate: doc.expirationDate ?? todayStr,
            daysRemaining,
          };
        });

        // Already expired
        const expired = await svc.getExpiredDocuments();
        const expiredRows: ExpiringDoc[] = expired.map((doc) => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          expirationDate: doc.expirationDate ?? '',
          daysRemaining: 0,
        }));

        expirationArea.appendChild(buildExpiringSection(
          expiringRows,
          expiredRows,
          async () => {
            try {
              const svc = getDocService();
              const count = await svc.markExpiredDocuments();
              showMsg(container, `${count} document(s) marked as expired.`, false);
              await loadExpirationData();
              await loadStats();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to mark expired documents.';
              showMsg(container, message, true);
            }
          },
        ));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load expiration data.';
        showMsg(container, message, true);
      }
    };

    // -- Stats --
    const loadStats = async () => {
      statsArea.innerHTML = '';
      try {
        const svc = getDocService();
        const stats = await svc.getStats();
        statsArea.appendChild(buildStatsSection(stats));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load stats.';
        showMsg(container, message, true);
      }
    };

    // Initial load
    loadExpirationData();
    loadStats();
  },
};
