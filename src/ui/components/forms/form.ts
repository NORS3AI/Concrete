/**
 * Phase Zed.7 - Form
 * Auto-generated form from schema field definitions.
 */

import type { FieldDef } from '../../../core/types/schema';
import { TextField } from './text-field';
import { NumberField } from './number-field';
import { CurrencyField } from './currency-field';
import { DateField } from './date-field';
import { SelectField } from './select-field';
import { CheckboxField } from './checkbox-field';
import { TextareaField } from './textarea-field';
import { FormActions } from './form-actions';

export interface FormConfig {
  fields: FieldDef[];
  values?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export class Form {
  private config: FormConfig;
  private container: HTMLElement | null = null;
  private formEl: HTMLFormElement | null = null;
  private currentValues: Record<string, unknown>;
  private errors: Record<string, string> = {};

  constructor(config: FormConfig) {
    this.config = config;
    this.currentValues = { ...(config.values ?? {}) };
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  getValues(): Record<string, unknown> {
    return { ...this.currentValues };
  }

  setValues(values: Record<string, unknown>): void {
    this.currentValues = { ...this.currentValues, ...values };
    this.render();
  }

  validate(): string[] {
    const errors: string[] = [];
    this.errors = {};

    for (const field of this.config.fields) {
      const value = this.currentValues[field.name];

      // Required check
      if (field.required && (value == null || value === '')) {
        const msg = `${field.label ?? field.name} is required`;
        errors.push(msg);
        this.errors[field.name] = msg;
        continue;
      }

      // Skip further validation if empty and not required
      if (value == null || value === '') continue;

      // Min/max for numbers
      if (
        (field.type === 'number' || field.type === 'currency' || field.type === 'percentage') &&
        typeof value === 'number'
      ) {
        if (field.min != null && value < field.min) {
          const msg = `${field.label ?? field.name} must be at least ${field.min}`;
          errors.push(msg);
          this.errors[field.name] = msg;
        }
        if (field.max != null && value > field.max) {
          const msg = `${field.label ?? field.name} must be at most ${field.max}`;
          errors.push(msg);
          this.errors[field.name] = msg;
        }
      }

      // Pattern for strings
      if (field.type === 'string' && field.pattern && typeof value === 'string') {
        if (!new RegExp(field.pattern).test(value)) {
          const msg = `${field.label ?? field.name} has an invalid format`;
          errors.push(msg);
          this.errors[field.name] = msg;
        }
      }

      // Enum check
      if (field.enum && typeof value === 'string' && !field.enum.includes(value)) {
        const msg = `${field.label ?? field.name} must be one of: ${field.enum.join(', ')}`;
        errors.push(msg);
        this.errors[field.name] = msg;
      }

      // Custom validators
      if (field.validators) {
        for (const validator of field.validators) {
          const result = validator(value, field, this.currentValues);
          if (result) {
            errors.push(result);
            this.errors[field.name] = result;
            break;
          }
        }
      }
    }

    this.render();
    return errors;
  }

  reset(): void {
    this.currentValues = { ...(this.config.values ?? {}) };
    this.errors = {};
    this.render();
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = '';

    this.formEl = document.createElement('form');
    this.formEl.className = 'space-y-4';
    this.formEl.noValidate = true;

    this.formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const validationErrors = this.validate();
      if (validationErrors.length === 0) {
        await this.config.onSubmit(this.getValues());
      }
    });

    // Render each field
    for (const field of this.config.fields) {
      // Skip computed fields
      if (field.computed) continue;

      const value = this.currentValues[field.name];
      const error = this.errors[field.name];

      const fieldConfig = {
        name: field.name,
        label: field.label ?? field.name,
        value: value as string | number | boolean | undefined,
        placeholder: field.description,
        required: field.required,
        error,
        onChange: (newValue: unknown) => {
          this.currentValues[field.name] = newValue;
          // Clear error on change
          if (this.errors[field.name]) {
            delete this.errors[field.name];
          }
        },
      };

      let fieldEl: HTMLElement;

      switch (field.type) {
        case 'string':
        case 'id':
          fieldEl = TextField.render({
            ...fieldConfig,
            value: value as string | undefined,
          });
          break;

        case 'number':
        case 'percentage':
          fieldEl = NumberField.render({
            ...fieldConfig,
            value: value as number | undefined,
            min: field.min,
            max: field.max,
          });
          break;

        case 'currency':
          fieldEl = CurrencyField.render({
            ...fieldConfig,
            value: value as number | undefined,
            min: field.min,
            max: field.max,
          });
          break;

        case 'date':
          fieldEl = DateField.render({
            ...fieldConfig,
            value: value as string | undefined,
          });
          break;

        case 'enum':
          fieldEl = SelectField.render({
            ...fieldConfig,
            value: value as string | undefined,
            options: (field.enum ?? []).map((v) => ({
              value: v,
              label: v,
            })),
          });
          break;

        case 'boolean':
          fieldEl = CheckboxField.render({
            ...fieldConfig,
            value: value as boolean | undefined,
            onChange: (newValue: unknown) => {
              this.currentValues[field.name] = newValue;
            },
          });
          break;

        case 'object':
        case 'array':
          fieldEl = TextareaField.render({
            ...fieldConfig,
            value:
              value != null ? JSON.stringify(value, null, 2) : undefined,
            onChange: (newValue: unknown) => {
              try {
                this.currentValues[field.name] = JSON.parse(
                  String(newValue)
                );
              } catch {
                this.currentValues[field.name] = newValue;
              }
            },
          });
          break;

        default:
          fieldEl = TextField.render({
            ...fieldConfig,
            value: value as string | undefined,
          });
      }

      this.formEl.appendChild(fieldEl);
    }

    // Actions
    const actions = FormActions.render({
      submitLabel: this.config.submitLabel ?? 'Save',
      onCancel: this.config.onCancel,
    });
    this.formEl.appendChild(actions);

    this.container.appendChild(this.formEl);
  }
}
