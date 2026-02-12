/**
 * Concrete — Search Engine
 * Phase Zed.13: Search & Command Palette
 *
 * Full-text search engine with inverted index, tokenization,
 * fuzzy matching, and scoring. Indexes all string/text fields
 * from registered collections.
 */

import type { DataAdapter } from '../store/adapter';
import type { SchemaRegistry } from '../schema/registry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult {
  id: string;
  collection: string;
  title: string;
  subtitle?: string;
  score: number;
  data?: Record<string, unknown>;
}

export interface SearchOptions {
  collections?: string[];
  limit?: number;
  fuzzy?: boolean;
}

interface IndexEntry {
  collection: string;
  id: string;
  field: string;
}

// ---------------------------------------------------------------------------
// Stopwords (common English words to exclude from indexing)
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
  'were', 'been', 'has', 'had', 'have', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that',
  'these', 'those', 'not', 'no', 'if', 'so', 'up', 'out', 'then',
]);

// ---------------------------------------------------------------------------
// SearchEngine
// ---------------------------------------------------------------------------

export class SearchEngine {
  /** Inverted index: term -> [{ collection, id, field }] */
  private index: Map<string, IndexEntry[]>;

  /** Record title cache: "collection:id" -> title string */
  private titleCache: Map<string, string>;

  /** Record subtitle cache: "collection:id" -> subtitle string */
  private subtitleCache: Map<string, string>;

  /** Record data cache: "collection:id" -> record */
  private dataCache: Map<string, Record<string, unknown>>;

  private store: DataAdapter;
  private schemas: SchemaRegistry;

  constructor(store: DataAdapter, schemas: SchemaRegistry) {
    this.index = new Map();
    this.titleCache = new Map();
    this.subtitleCache = new Map();
    this.dataCache = new Map();
    this.store = store;
    this.schemas = schemas;
  }

  /** Build/rebuild the search index from all data. */
  async buildIndex(): Promise<void> {
    this.index.clear();
    this.titleCache.clear();
    this.subtitleCache.clear();
    this.dataCache.clear();

    const allSchemas = this.schemas.getAll();

    for (const schema of allSchemas) {
      const collection = schema.collection;

      // Identify text-indexable fields
      const textFields = schema.fields
        .filter((f) => f.type === 'string' || f.type === 'id')
        .map((f) => f.name);

      if (textFields.length === 0) continue;

      let records: Record<string, unknown>[];
      try {
        records = await this.store.getAll(collection);
      } catch {
        continue; // Skip collections that fail to load
      }

      for (const record of records) {
        // Skip soft-deleted records
        if (record['deletedAt'] != null) continue;

        const id = record['id'] as string;
        if (!id) continue;

        const cacheKey = `${collection}:${id}`;
        this.dataCache.set(cacheKey, record);

        // Determine title: prefer 'name', then 'title', then 'description', then 'number'
        const title =
          (record['name'] as string) ??
          (record['title'] as string) ??
          (record['description'] as string) ??
          (record['number'] as string) ??
          id;
        this.titleCache.set(cacheKey, String(title));

        // Determine subtitle from secondary fields
        const subtitleParts: string[] = [];
        if (record['number'] && record['name']) {
          subtitleParts.push(String(record['number']));
        }
        if (record['status']) {
          subtitleParts.push(String(record['status']));
        }
        if (subtitleParts.length > 0) {
          this.subtitleCache.set(cacheKey, subtitleParts.join(' | '));
        }

        // Index each text field
        for (const field of textFields) {
          const value = record[field];
          if (typeof value !== 'string' || value.length === 0) continue;

          const tokens = this.tokenize(value);
          for (const token of tokens) {
            const entries = this.index.get(token);
            const entry: IndexEntry = { collection, id, field };
            if (entries) {
              entries.push(entry);
            } else {
              this.index.set(token, [entry]);
            }
          }
        }
      }
    }
  }

  /** Update index for a single record change. */
  updateRecord(collection: string, record: Record<string, unknown>): void {
    const id = record['id'] as string;
    if (!id) return;

    // Remove old entries for this record
    this.removeRecord(collection, id);

    // Skip soft-deleted records
    if (record['deletedAt'] != null) return;

    const cacheKey = `${collection}:${id}`;
    this.dataCache.set(cacheKey, record);

    // Update title cache
    const title =
      (record['name'] as string) ??
      (record['title'] as string) ??
      (record['description'] as string) ??
      (record['number'] as string) ??
      id;
    this.titleCache.set(cacheKey, String(title));

    // Update subtitle cache
    const subtitleParts: string[] = [];
    if (record['number'] && record['name']) {
      subtitleParts.push(String(record['number']));
    }
    if (record['status']) {
      subtitleParts.push(String(record['status']));
    }
    if (subtitleParts.length > 0) {
      this.subtitleCache.set(cacheKey, subtitleParts.join(' | '));
    }

    // Get schema to know which fields to index
    const schema = this.schemas.get(collection);
    const textFields = schema
      ? schema.fields
          .filter((f) => f.type === 'string' || f.type === 'id')
          .map((f) => f.name)
      : Object.keys(record).filter(
          (k) => typeof record[k] === 'string',
        );

    // Index each text field
    for (const field of textFields) {
      const value = record[field];
      if (typeof value !== 'string' || value.length === 0) continue;

      const tokens = this.tokenize(value);
      for (const token of tokens) {
        const entries = this.index.get(token);
        const entry: IndexEntry = { collection, id, field };
        if (entries) {
          entries.push(entry);
        } else {
          this.index.set(token, [entry]);
        }
      }
    }
  }

  /** Remove a record from the index. */
  removeRecord(collection: string, id: string): void {
    const cacheKey = `${collection}:${id}`;
    this.titleCache.delete(cacheKey);
    this.subtitleCache.delete(cacheKey);
    this.dataCache.delete(cacheKey);

    // Remove from inverted index
    for (const [token, entries] of this.index) {
      const filtered = entries.filter(
        (e) => !(e.collection === collection && e.id === id),
      );
      if (filtered.length === 0) {
        this.index.delete(token);
      } else if (filtered.length !== entries.length) {
        this.index.set(token, filtered);
      }
    }
  }

  /** Search across all indexed data. */
  search(query: string, options?: SearchOptions): SearchResult[] {
    if (!query || query.trim().length === 0) return [];

    const tokens = this.tokenize(query);
    if (tokens.length === 0) return [];

    const limit = options?.limit ?? 50;
    const fuzzy = options?.fuzzy ?? true;
    const allowedCollections = options?.collections
      ? new Set(options.collections)
      : null;

    // Score accumulator: "collection:id" -> score
    const scores = new Map<string, number>();

    // For AND logic: track which records match all tokens
    const tokenMatches = new Map<string, Set<string>>(); // token -> Set<"collection:id">

    for (const queryToken of tokens) {
      const matchSet = new Set<string>();

      for (const [indexToken, entries] of this.index) {
        const matchScore = this.scoreMatch(queryToken, indexToken, fuzzy);
        if (matchScore === 0) continue;

        for (const entry of entries) {
          if (allowedCollections && !allowedCollections.has(entry.collection)) {
            continue;
          }

          const key = `${entry.collection}:${entry.id}`;
          matchSet.add(key);

          const existing = scores.get(key) ?? 0;
          scores.set(key, existing + matchScore);
        }
      }

      tokenMatches.set(queryToken, matchSet);
    }

    // AND logic: only keep results that matched ALL tokens
    const tokenSets = [...tokenMatches.values()];
    if (tokenSets.length === 0) return [];

    let intersection = tokenSets[0];
    for (let i = 1; i < tokenSets.length; i++) {
      const next = tokenSets[i];
      const newIntersection = new Set<string>();
      for (const key of intersection) {
        if (next.has(key)) {
          newIntersection.add(key);
        }
      }
      intersection = newIntersection;
    }

    // Build result array
    const results: SearchResult[] = [];
    for (const key of intersection) {
      const score = scores.get(key) ?? 0;
      const [collection, id] = this.splitCacheKey(key);

      results.push({
        id,
        collection,
        title: this.titleCache.get(key) ?? id,
        subtitle: this.subtitleCache.get(key),
        score,
        data: this.dataCache.get(key),
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    return results.slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Tokenize a string for indexing. */
  private tokenize(text: string): string[] {
    const lower = text.toLowerCase();
    // Split on whitespace and common punctuation
    const raw = lower.split(/[\s,.\-_/\\|;:!?'"()\[\]{}#@&*+=<>~`]+/);

    return raw.filter(
      (token) =>
        token.length > 0 &&
        token.length <= 100 &&
        !STOPWORDS.has(token),
    );
  }

  /** Score a match between a query token and an indexed token. */
  private scoreMatch(
    query: string,
    indexed: string,
    fuzzy: boolean,
  ): number {
    // Exact match
    if (query === indexed) return 100;

    // Starts with
    if (indexed.startsWith(query)) return 80;

    // Contains
    if (indexed.includes(query)) return 60;

    // Fuzzy: Levenshtein distance for short tokens
    if (fuzzy && query.length >= 3 && indexed.length >= 3) {
      const distance = this.levenshtein(query, indexed);
      const maxLen = Math.max(query.length, indexed.length);
      const similarity = 1 - distance / maxLen;

      if (similarity >= 0.7) {
        return Math.round(40 * similarity);
      }
    }

    return 0;
  }

  /** Compute Levenshtein distance between two strings. */
  private levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;

    // Use a single-row optimization for space efficiency
    const prev = new Array<number>(n + 1);
    const curr = new Array<number>(n + 1);

    for (let j = 0; j <= n; j++) {
      prev[j] = j;
    }

    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,       // deletion
          curr[j - 1] + 1,   // insertion
          prev[j - 1] + cost, // substitution
        );
      }
      // Copy curr to prev
      for (let j = 0; j <= n; j++) {
        prev[j] = curr[j];
      }
    }

    return prev[n];
  }

  /** Split a cache key "collection:id" back into parts. */
  private splitCacheKey(key: string): [string, string] {
    const idx = key.indexOf(':');
    if (idx === -1) return [key, ''];
    return [key.substring(0, idx), key.substring(idx + 1)];
  }
}
