/**
 * Phase Zed.2 - Schema Validation
 * Field-level and record-level validation functions.
 */

import type { FieldDef, SchemaDef } from '../types/schema';

/**
 * Validate a single field value against its field definition.
 * Returns an error message string, or null if valid.
 */
export function validateField(
  value: unknown,
  fieldDef: FieldDef
): string | null {
  // Required check
  if (fieldDef.required) {
    if (value === undefined || value === null || value === '') {
      return `${fieldDef.label ?? fieldDef.name} is required`;
    }
  }

  // If value is not present and not required, skip further checks
  if (value === undefined || value === null) {
    return null;
  }

  // Type checking
  switch (fieldDef.type) {
    case 'string':
    case 'id':
    case 'date': {
      if (typeof value !== 'string') {
        return `${fieldDef.label ?? fieldDef.name} must be a string`;
      }
      break;
    }
    case 'number':
    case 'currency':
    case 'percentage': {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return `${fieldDef.label ?? fieldDef.name} must be a number`;
      }
      break;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        return `${fieldDef.label ?? fieldDef.name} must be a boolean`;
      }
      break;
    }
    case 'enum': {
      if (fieldDef.enum && !fieldDef.enum.includes(value as string)) {
        return `${fieldDef.label ?? fieldDef.name} must be one of: ${fieldDef.enum.join(', ')}`;
      }
      break;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        return `${fieldDef.label ?? fieldDef.name} must be an array`;
      }
      break;
    }
    case 'object': {
      if (typeof value !== 'object' || Array.isArray(value)) {
        return `${fieldDef.label ?? fieldDef.name} must be an object`;
      }
      break;
    }
  }

  // Min/max for numbers
  if (
    (fieldDef.type === 'number' || fieldDef.type === 'currency' || fieldDef.type === 'percentage') &&
    typeof value === 'number'
  ) {
    if (fieldDef.min !== undefined && value < fieldDef.min) {
      return `${fieldDef.label ?? fieldDef.name} must be at least ${fieldDef.min}`;
    }
    if (fieldDef.max !== undefined && value > fieldDef.max) {
      return `${fieldDef.label ?? fieldDef.name} must be at most ${fieldDef.max}`;
    }
  }

  // Min/max for string length
  if (fieldDef.type === 'string' && typeof value === 'string') {
    if (fieldDef.min !== undefined && value.length < fieldDef.min) {
      return `${fieldDef.label ?? fieldDef.name} must be at least ${fieldDef.min} characters`;
    }
    if (fieldDef.max !== undefined && value.length > fieldDef.max) {
      return `${fieldDef.label ?? fieldDef.name} must be at most ${fieldDef.max} characters`;
    }
  }

  // Pattern check for strings
  if (fieldDef.pattern && typeof value === 'string') {
    const regex = new RegExp(fieldDef.pattern);
    if (!regex.test(value)) {
      return `${fieldDef.label ?? fieldDef.name} does not match the required pattern`;
    }
  }

  // Custom validators
  if (fieldDef.validators) {
    for (const validator of fieldDef.validators) {
      const error = validator(value, fieldDef, {});
      if (error) {
        return error;
      }
    }
  }

  return null;
}

/**
 * Validate an entire record against its schema definition.
 * Returns an array of error message strings (empty if valid).
 */
export function validateRecord(
  record: Record<string, unknown>,
  schema: SchemaDef
): string[] {
  const errors: string[] = [];

  // Validate each field
  for (const fieldDef of schema.fields) {
    const value = record[fieldDef.name];
    const error = validateField(value, fieldDef);
    if (error) {
      errors.push(error);
    }

    // Run field-level custom validators with full record context
    if (fieldDef.validators) {
      for (const validator of fieldDef.validators) {
        const customError = validator(value, fieldDef, record);
        if (customError && !errors.includes(customError)) {
          errors.push(customError);
        }
      }
    }
  }

  // Run record-level validators
  if (schema.validators) {
    for (const validator of schema.validators) {
      const recordErrors = validator(record, schema);
      errors.push(...recordErrors);
    }
  }

  return errors;
}
