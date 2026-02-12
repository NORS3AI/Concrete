/**
 * Concrete — Query Utilities
 * Shared filtering, sorting, and value resolution for all DataAdapter implementations.
 * Extracted to avoid duplication between LocalStorageAdapter and IndexedDBAdapter.
 */

import type { QueryFilter } from './adapter';

/**
 * Resolve a dot-notation path to a value inside a record.
 * e.g. getNestedValue({ a: { b: 1 } }, 'a.b') => 1
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Evaluate a single QueryFilter against a record.
 */
export function matchesFilter(record: Record<string, unknown>, filter: QueryFilter): boolean {
  const value = getNestedValue(record, filter.field);
  const target = filter.value;

  switch (filter.operator) {
    case '=':
      return value === target;
    case '!=':
      return value !== target;
    case '>':
      return (value as number) > (target as number);
    case '<':
      return (value as number) < (target as number);
    case '>=':
      return (value as number) >= (target as number);
    case '<=':
      return (value as number) <= (target as number);
    case 'in':
      return Array.isArray(target) && target.includes(value);
    case 'notIn':
      return Array.isArray(target) && !target.includes(value);
    case 'contains':
      return typeof value === 'string' && typeof target === 'string' && value.includes(target);
    case 'startsWith':
      return typeof value === 'string' && typeof target === 'string' && value.startsWith(target);
    case 'between': {
      if (!Array.isArray(target) || target.length !== 2) return false;
      const num = value as number;
      return num >= (target[0] as number) && num <= (target[1] as number);
    }
    case 'isNull':
      return value == null;
    case 'isNotNull':
      return value != null;
    default: {
      const _exhaustive: never = filter.operator as never;
      void _exhaustive;
      return false;
    }
  }
}

/**
 * Filter records by an array of QueryFilters (AND logic — all must match).
 */
export function applyFilters(
  records: Record<string, unknown>[],
  filters: QueryFilter[],
): Record<string, unknown>[] {
  return records.filter((rec) => filters.every((f) => matchesFilter(rec, f)));
}

/**
 * Sort records by multiple fields with ascending/descending directions.
 */
export function applySorting(
  records: Record<string, unknown>[],
  orderBy: { field: string; direction: 'asc' | 'desc' }[],
): Record<string, unknown>[] {
  const sorted = [...records];
  sorted.sort((a, b) => {
    for (const { field, direction } of orderBy) {
      const aVal = getNestedValue(a, field);
      const bVal = getNestedValue(b, field);
      let cmp = 0;
      if (aVal == null && bVal == null) cmp = 0;
      else if (aVal == null) cmp = -1;
      else if (bVal == null) cmp = 1;
      else if (typeof aVal === 'string' && typeof bVal === 'string') cmp = aVal.localeCompare(bVal);
      else if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
      else cmp = String(aVal).localeCompare(String(bVal));

      if (cmp !== 0) return direction === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
  return sorted;
}
