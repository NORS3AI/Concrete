/**
 * Concrete -- Entity Resolver
 * Phase Zed.10 Import/Export Framework
 *
 * Fuzzy entity matching for imports. Resolves free-text entity names
 * to entity IDs using a cascading strategy:
 *   1. Exact match on name
 *   2. Exact match on aliases
 *   3. Normalized match (lowercase, strip suffixes like Corp/Inc/LLC)
 *   4. Fuzzy match via Levenshtein distance
 *
 * Returns the best match with a confidence score (0-1), or null if
 * no match exceeds the configurable threshold.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EntityEntry {
  id: string;
  name: string;
  aliases?: string[];
}

interface ResolveResult {
  id: string;
  name: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Common business suffixes to strip during normalization
// ---------------------------------------------------------------------------

const SUFFIX_PATTERNS = [
  /\b(corporation|corp|incorporated|inc|limited|ltd|llc|llp|lp|co|company|plc|gmbh|ag|sa|srl|pty)\b\.?/gi,
];

// ---------------------------------------------------------------------------
// EntityResolver
// ---------------------------------------------------------------------------

export class EntityResolver {
  private entities: EntityEntry[] = [];
  private confidenceThreshold: number;

  /**
   * @param confidenceThreshold Minimum confidence (0-1) to return a match. Default 0.6.
   */
  constructor(confidenceThreshold: number = 0.6) {
    this.confidenceThreshold = confidenceThreshold;
  }

  // -----------------------------------------------------------------------
  // Load entities
  // -----------------------------------------------------------------------

  /**
   * Load (or refresh) the entity list from the store.
   */
  load(entities: Array<{ id: string; name: string; aliases?: string[] }>): void {
    this.entities = entities.map((e) => ({
      id: e.id,
      name: e.name,
      aliases: e.aliases ?? [],
    }));
  }

  // -----------------------------------------------------------------------
  // Resolve
  // -----------------------------------------------------------------------

  /**
   * Resolve a free-text name to a known entity.
   * Returns the best match with confidence, or null if below threshold.
   */
  resolve(name: string): ResolveResult | null {
    if (!name || name.trim() === '') return null;
    const trimmed = name.trim();

    // 1. Exact match on name
    for (const entity of this.entities) {
      if (entity.name === trimmed) {
        return { id: entity.id, name: entity.name, confidence: 1.0 };
      }
    }

    // 2. Exact match on aliases
    for (const entity of this.entities) {
      if (entity.aliases) {
        for (const alias of entity.aliases) {
          if (alias === trimmed) {
            return { id: entity.id, name: entity.name, confidence: 1.0 };
          }
        }
      }
    }

    // 3. Normalized match (case-insensitive, suffix-stripped)
    const normalizedInput = this.normalize(trimmed);

    for (const entity of this.entities) {
      const normalizedName = this.normalize(entity.name);
      if (normalizedName === normalizedInput) {
        return { id: entity.id, name: entity.name, confidence: 0.95 };
      }

      if (entity.aliases) {
        for (const alias of entity.aliases) {
          if (this.normalize(alias) === normalizedInput) {
            return { id: entity.id, name: entity.name, confidence: 0.95 };
          }
        }
      }
    }

    // 4. Fuzzy match via Levenshtein distance
    let bestMatch: ResolveResult | null = null;
    let bestConfidence = 0;

    for (const entity of this.entities) {
      const candidates = [entity.name, ...(entity.aliases ?? [])];

      for (const candidate of candidates) {
        const confidence = this.computeConfidence(normalizedInput, this.normalize(candidate));

        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = {
            id: entity.id,
            name: entity.name,
            confidence,
          };
        }
      }
    }

    if (bestMatch && bestMatch.confidence >= this.confidenceThreshold) {
      return bestMatch;
    }

    return null;
  }

  /**
   * Resolve a name, returning multiple candidate matches sorted by confidence.
   */
  resolveMultiple(name: string, maxResults: number = 5): ResolveResult[] {
    if (!name || name.trim() === '') return [];
    const normalizedInput = this.normalize(name.trim());

    const results: ResolveResult[] = [];

    for (const entity of this.entities) {
      const candidates = [entity.name, ...(entity.aliases ?? [])];
      let bestConfidence = 0;

      for (const candidate of candidates) {
        // Exact match
        if (candidate === name.trim()) {
          bestConfidence = 1.0;
          break;
        }

        const normalizedCandidate = this.normalize(candidate);

        // Normalized exact match
        if (normalizedCandidate === normalizedInput) {
          bestConfidence = Math.max(bestConfidence, 0.95);
          continue;
        }

        // Fuzzy match
        const confidence = this.computeConfidence(normalizedInput, normalizedCandidate);
        bestConfidence = Math.max(bestConfidence, confidence);
      }

      if (bestConfidence >= this.confidenceThreshold) {
        results.push({
          id: entity.id,
          name: entity.name,
          confidence: bestConfidence,
        });
      }
    }

    results.sort((a, b) => b.confidence - a.confidence);
    return results.slice(0, maxResults);
  }

  // -----------------------------------------------------------------------
  // Private: Normalization
  // -----------------------------------------------------------------------

  /**
   * Normalize a name for comparison:
   *   - Lowercase
   *   - Strip common business entity suffixes (Corp, Inc, LLC, Ltd, etc.)
   *   - Strip punctuation
   *   - Collapse whitespace
   */
  private normalize(name: string): string {
    let result = name.toLowerCase();

    // Strip business suffixes
    for (const pattern of SUFFIX_PATTERNS) {
      result = result.replace(pattern, '');
    }

    // Strip punctuation (keep alphanumeric and spaces)
    result = result.replace(/[^a-z0-9\s]/g, '');

    // Collapse whitespace
    result = result.replace(/\s+/g, ' ').trim();

    return result;
  }

  // -----------------------------------------------------------------------
  // Private: Levenshtein distance
  // -----------------------------------------------------------------------

  /**
   * Compute the Levenshtein edit distance between two strings.
   * Uses the classic Wagner-Fischer dynamic programming approach.
   */
  private levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;

    // Short-circuit identical strings
    if (a === b) return 0;

    // Short-circuit empty strings
    if (m === 0) return n;
    if (n === 0) return m;

    // Use two rows for space efficiency
    let prev = new Array<number>(n + 1);
    let curr = new Array<number>(n + 1);

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
          prev[j - 1] + cost  // substitution
        );
      }

      // Swap rows
      [prev, curr] = [curr, prev];
    }

    return prev[n];
  }

  /**
   * Compute a confidence score (0-1) based on Levenshtein distance.
   * 1.0 = identical, 0.0 = completely different.
   */
  private computeConfidence(a: string, b: string): number {
    if (a === b) return 1.0;

    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;

    const distance = this.levenshtein(a, b);
    const similarity = 1.0 - distance / maxLen;

    // Also check if one string contains the other (common substring bonus)
    let containsBonus = 0;
    if (a.length > 2 && b.length > 2) {
      if (a.includes(b) || b.includes(a)) {
        containsBonus = 0.15;
      }
    }

    return Math.min(1.0, similarity + containsBonus);
  }
}
