/**
 * Concrete — Command Palette
 * Phase Zed.13: Search & Command Palette
 *
 * Unified command palette for navigation, actions, and data search.
 * Combines registered navigation routes, action commands, and
 * global data search into a single searchable interface.
 */

import type { SearchEngine } from './engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category: 'navigation' | 'action' | 'record' | 'search';
  handler: () => void;
  keywords?: string[];
}

// ---------------------------------------------------------------------------
// CommandPalette
// ---------------------------------------------------------------------------

export class CommandPalette {
  private items: PaletteItem[] = [];
  private recentIds: string[] = [];
  private maxRecent = 10;
  private searchEngine: SearchEngine;
  private recentStorageKey = 'concrete_palette_recent';

  constructor(searchEngine: SearchEngine) {
    this.searchEngine = searchEngine;
    this.loadRecent();
  }

  /** Register a palette item. */
  register(item: PaletteItem): void {
    // Avoid duplicates by id
    const existingIndex = this.items.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      this.items[existingIndex] = item;
    } else {
      this.items.push(item);
    }
  }

  /** Unregister a palette item. */
  unregister(id: string): void {
    this.items = this.items.filter((i) => i.id !== id);
  }

  /** Register navigation items from router routes. */
  registerRoutes(
    routes: Array<{ path: string; title: string; icon?: string }>,
  ): void {
    for (const route of routes) {
      this.register({
        id: `nav:${route.path}`,
        label: route.title,
        description: `Navigate to ${route.title}`,
        icon: route.icon,
        category: 'navigation',
        handler: () => {
          window.location.hash = `#${route.path}`;
        },
        keywords: [
          route.title.toLowerCase(),
          ...route.path.split('/').filter(Boolean),
        ],
      });
    }
  }

  /** Register actions. */
  registerActions(
    actions: Array<{
      id: string;
      label: string;
      description?: string;
      icon?: string;
      handler: () => void;
      keywords?: string[];
    }>,
  ): void {
    for (const action of actions) {
      this.register({
        id: `action:${action.id}`,
        label: action.label,
        description: action.description,
        icon: action.icon,
        category: 'action',
        handler: action.handler,
        keywords: action.keywords,
      });
    }
  }

  /** Search palette items + global data. */
  search(query: string): PaletteItem[] {
    if (!query || query.trim().length === 0) {
      return this.getRecent();
    }

    const lowerQuery = query.toLowerCase().trim();
    const results: Array<PaletteItem & { _score: number }> = [];

    // 1. Search registered items (navigation, actions)
    for (const item of this.items) {
      const score = this.scoreItem(item, lowerQuery);
      if (score > 0) {
        results.push({ ...item, _score: score });
      }
    }

    // 2. Search global data via the search engine
    const dataResults = this.searchEngine.search(query, { limit: 20 });
    for (const result of dataResults) {
      results.push({
        id: `record:${result.collection}:${result.id}`,
        label: result.title,
        description: result.subtitle ?? `${result.collection}`,
        category: 'record' as const,
        handler: () => {
          // Navigate to record detail view
          window.location.hash = `#/${result.collection}/${result.id}`;
        },
        _score: result.score * 0.8, // Slightly lower weight for data results
      });
    }

    // Sort by score descending
    results.sort((a, b) => b._score - a._score);

    // Strip the internal _score and return
    return results.map(({ _score: _s, ...item }) => item);
  }

  /** Get all items in a category. */
  getByCategory(category: PaletteItem['category']): PaletteItem[] {
    return this.items.filter((item) => item.category === category);
  }

  /** Get recently used items. */
  getRecent(): PaletteItem[] {
    const recent: PaletteItem[] = [];
    for (const id of this.recentIds) {
      const item = this.items.find((i) => i.id === id);
      if (item) {
        recent.push(item);
      }
    }
    return recent;
  }

  /** Record that an item was used (for recent tracking). */
  recordUsage(id: string): void {
    // Move to front of recent list
    this.recentIds = this.recentIds.filter((rid) => rid !== id);
    this.recentIds.unshift(id);

    // Trim to max
    if (this.recentIds.length > this.maxRecent) {
      this.recentIds = this.recentIds.slice(0, this.maxRecent);
    }

    this.persistRecent();
  }

  /** Get all registered items. */
  getAll(): PaletteItem[] {
    return [...this.items];
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Score an item against a query string. */
  private scoreItem(item: PaletteItem, query: string): number {
    let maxScore = 0;

    // Check label
    const labelScore = this.scoreText(item.label.toLowerCase(), query);
    maxScore = Math.max(maxScore, labelScore * 1.5); // Label gets bonus weight

    // Check description
    if (item.description) {
      const descScore = this.scoreText(item.description.toLowerCase(), query);
      maxScore = Math.max(maxScore, descScore);
    }

    // Check keywords
    if (item.keywords) {
      for (const keyword of item.keywords) {
        const kwScore = this.scoreText(keyword.toLowerCase(), query);
        maxScore = Math.max(maxScore, kwScore * 1.2); // Keywords get slight bonus
      }
    }

    return maxScore;
  }

  /** Score a text match. */
  private scoreText(text: string, query: string): number {
    if (text === query) return 100;
    if (text.startsWith(query)) return 80;
    if (text.includes(query)) return 60;

    // Check individual query words
    const queryWords = query.split(/\s+/);
    if (queryWords.length > 1) {
      let matched = 0;
      for (const word of queryWords) {
        if (text.includes(word)) {
          matched++;
        }
      }
      if (matched === queryWords.length) return 50;
      if (matched > 0) return 30 * (matched / queryWords.length);
    }

    return 0;
  }

  /** Load recent items from storage. */
  private loadRecent(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(this.recentStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          this.recentIds = parsed;
        }
      }
    } catch {
      this.recentIds = [];
    }
  }

  /** Persist recent items to storage. */
  private persistRecent(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(
        this.recentStorageKey,
        JSON.stringify(this.recentIds),
      );
    } catch {
      // Storage full — ignore
    }
  }
}
