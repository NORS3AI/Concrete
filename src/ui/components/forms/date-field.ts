/**
 * Phase Zed.7 - DateField
 * Date input field with native date picker.
 */

export interface DateFieldConfig {
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  min?: string;
  max?: string;
  onChange?: (value: string) => void;
}

export class DateField {
  static render(config: DateFieldConfig): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col gap-1';

    // Label
    const label = document.createElement('label');
    label.className = 'text-sm font-medium text-[var(--text)]';
    label.htmlFor = `field-${config.name}`;
    label.textContent = config.label;
    if (config.required) {
      const asterisk = document.createElement('span');
      asterisk.className = 'text-red-400 ml-0.5';
      asterisk.textContent = '*';
      label.appendChild(asterisk);
    }
    wrapper.appendChild(label);

    // Input
    const input = document.createElement('input');
    input.type = 'date';
    input.id = `field-${config.name}`;
    input.name = config.name;
    input.className = `w-full px-3 py-2 text-sm bg-[var(--surface)] border rounded-md text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${
      config.error ? 'border-red-500' : 'border-[var(--border)]'
    }`;
    if (config.value) {
      // Convert ISO string to date input format (YYYY-MM-DD)
      input.value = config.value.substring(0, 10);
    }
    if (config.min) input.min = config.min;
    if (config.max) input.max = config.max;
    if (config.required) input.required = true;

    input.addEventListener('change', () => {
      config.onChange?.(input.value);
    });

    wrapper.appendChild(input);

    // Error
    if (config.error) {
      const error = document.createElement('span');
      error.className = 'text-xs text-red-400';
      error.textContent = config.error;
      wrapper.appendChild(error);
    }

    return wrapper;
  }
}
