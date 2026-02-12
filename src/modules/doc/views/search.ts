/**
 * Document Search view.
 * Full-text search across document metadata including title, description,
 * tags, category, and file name.
 */

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
    const results: SearchResultRow[] = [];
    resultsArea.appendChild(buildSearchResults(results, ''));
    wrapper.appendChild(resultsArea);

    // Search interaction
    const performSearch = () => {
      const query = searchInput.value.trim();
      resultsArea.innerHTML = '';
      resultsArea.appendChild(buildSearchResults(results, query));
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });

    // Expiring documents section
    const expiringSection = el('div', 'mt-8');
    expiringSection.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Expiring Documents (Next 30 Days)'));

    const expiringPlaceholder = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    expiringPlaceholder.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Expiring document alerts will be displayed here.'));
    expiringSection.appendChild(expiringPlaceholder);
    wrapper.appendChild(expiringSection);

    container.appendChild(wrapper);
  },
};
