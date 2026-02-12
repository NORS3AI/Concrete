/**
 * Phase Zed.7 - CheckboxField
 * Boolean checkbox input field.
 */

export interface CheckboxFieldConfig {
  name: string;
  label: string;
  value?: boolean;
  required?: boolean;
  error?: string;
  description?: string;
  onChange?: (value: boolean) => void;
}

export class CheckboxField {
  static render(config: CheckboxFieldConfig): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col gap-1';

    const row = document.createElement('label');
    row.className = 'flex items-center gap-2 cursor-pointer';

    // Checkbox input
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `field-${config.name}`;
    input.name = config.name;
    input.className = `w-4 h-4 rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:ring-offset-0`;
    if (config.value) input.checked = true;
    if (config.required) input.required = true;

    input.addEventListener('change', () => {
      config.onChange?.(input.checked);
    });

    row.appendChild(input);

    // Label text
    const labelText = document.createElement('span');
    labelText.className = 'text-sm text-[var(--text)]';
    labelText.textContent = config.label;
    if (config.required) {
      const asterisk = document.createElement('span');
      asterisk.className = 'text-red-400 ml-0.5';
      asterisk.textContent = '*';
      labelText.appendChild(asterisk);
    }
    row.appendChild(labelText);

    wrapper.appendChild(row);

    // Description
    if (config.description) {
      const desc = document.createElement('span');
      desc.className = 'text-xs text-[var(--text-muted)] ml-6';
      desc.textContent = config.description;
      wrapper.appendChild(desc);
    }

    // Error
    if (config.error) {
      const error = document.createElement('span');
      error.className = 'text-xs text-red-400 ml-6';
      error.textContent = config.error;
      wrapper.appendChild(error);
    }

    return wrapper;
  }
}
