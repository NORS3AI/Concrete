/**
 * Phase Zed.7 - TextField
 * Standard text input field.
 */

export interface TextFieldConfig {
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'url' | 'tel';
}

export class TextField {
  static render(config: TextFieldConfig): HTMLElement {
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
    input.type = config.type ?? 'text';
    input.id = `field-${config.name}`;
    input.name = config.name;
    input.className = `w-full px-3 py-2 text-sm bg-[var(--surface)] border rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${
      config.error ? 'border-red-500' : 'border-[var(--border)]'
    }`;
    if (config.value != null) input.value = config.value;
    if (config.placeholder) input.placeholder = config.placeholder;
    if (config.required) input.required = true;

    input.addEventListener('input', () => {
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
