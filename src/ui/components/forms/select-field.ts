/**
 * Phase Zed.7 - SelectField
 * Dropdown select field.
 */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldConfig {
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
}

export class SelectField {
  static render(config: SelectFieldConfig): HTMLElement {
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

    // Select
    const select = document.createElement('select');
    select.id = `field-${config.name}`;
    select.name = config.name;
    select.className = `w-full px-3 py-2 text-sm bg-[var(--surface)] border rounded-md text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] appearance-none ${
      config.error ? 'border-red-500' : 'border-[var(--border)]'
    }`;
    if (config.required) select.required = true;

    // Placeholder option
    if (config.placeholder) {
      const placeholderOpt = document.createElement('option');
      placeholderOpt.value = '';
      placeholderOpt.textContent = config.placeholder;
      placeholderOpt.disabled = true;
      if (!config.value) placeholderOpt.selected = true;
      select.appendChild(placeholderOpt);
    }

    // Options
    for (const opt of config.options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.disabled) option.disabled = true;
      if (config.value === opt.value) option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      config.onChange?.(select.value);
    });

    wrapper.appendChild(select);

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
