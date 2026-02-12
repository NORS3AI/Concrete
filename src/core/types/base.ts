/**
 * Phase Zed.2 - Base Entity Types
 * Foundation types that ALL collections extend.
 */

/** Unique identifier - timestamp + random */
export type ID = string;

/** ISO 8601 date string */
export type ISODateString = string;

/** All entities extend this */
export interface BaseEntity {
  id: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt?: ISODateString;
  version: number;
  tenantId?: string;
}

/** Soft-deletable entity methods */
export interface SoftDeletable {
  deletedAt?: ISODateString;
}

/** Metadata attached to any entity */
export interface EntityMeta {
  createdBy?: string;
  updatedBy?: string;
  source?: 'manual' | 'import' | 'api' | 'migration' | 'seed';
  importBatchId?: string;
  tags?: string[];
  notes?: string;
}

/** Generate a unique ID */
export function generateId(): ID {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Get current ISO timestamp */
export function now(): ISODateString {
  return new Date().toISOString();
}
