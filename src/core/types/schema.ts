/**
 * Phase Zed.2 - Schema Definition Types
 * Defines the structure for collection schemas, fields, relations, and migrations.
 */

/** Supported field types */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'id'
  | 'enum'
  | 'array'
  | 'object'
  | 'currency'
  | 'percentage';

/** Validator function: returns error message or null if valid */
export type ValidatorFn = (
  value: unknown,
  field: FieldDef,
  record: Record<string, unknown>
) => string | null;

/** Record-level validator: returns array of error messages */
export type RecordValidatorFn = (
  record: Record<string, unknown>,
  schema: SchemaDef
) => string[];

/** Field definition within a schema */
export interface FieldDef {
  name: string;
  type: FieldType;
  required?: boolean;
  label?: string;
  description?: string;
  defaultValue?: unknown;
  enum?: string[];
  min?: number;
  max?: number;
  pattern?: string;
  refCollection?: string;
  refField?: string;
  computed?: (record: Record<string, unknown>) => unknown;
  validators?: ValidatorFn[];
}

/** Relation definition between collections */
export interface RelationDef {
  foreignKey: string;
  collection: string;
  type: 'belongsTo' | 'hasMany' | 'hasOne' | 'manyToMany';
  cascade: 'nullify' | 'cascade' | 'restrict';
}

/** Index definition for optimized lookups */
export interface IndexDef {
  fields: string[];
  unique?: boolean;
  name?: string;
}

/** Computed field that derives its value from other fields */
export interface ComputedFieldDef {
  name: string;
  type: FieldType;
  compute: (record: Record<string, unknown>) => unknown;
  dependencies: string[];
}

/** Schema migration definition */
export interface SchemaMigration {
  version: number;
  up: (records: unknown[]) => unknown[];
  description: string;
}

/** Complete schema definition for a collection */
export interface SchemaDef {
  collection: string;
  module: string;
  version: number;
  fields: FieldDef[];
  relations: RelationDef[];
  indexes?: IndexDef[];
  computedFields?: ComputedFieldDef[];
  validators?: RecordValidatorFn[];
  migrations?: SchemaMigration[];
}
