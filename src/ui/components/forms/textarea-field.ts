/**
 * Phase Zed.7 - TextareaField
 * Multi-line text input field.
 */

export interface TextareaFieldConfig {
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  rows?: number;
  onChange?: (value: string) => void;
}

export class TextareaField {
  static render(config: TextareaFieldConfig): HTMLElement {
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

    // Textarea
    const textarea = document.createElement('textarea');
    textarea.id = `field-${config.name}`;
    textarea.name = config.name;
    textarea.rows = config.rows ?? 4;
    textarea.className = `w-full px-3 py-2 text-sm bg-[var(--surface)] border rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y ${
      config.error ? 'border-red-500' : 'border-[var(--border)]'
    }`;
    if (config.value != null) textarea.value = config.value;
    if (config.placeholder) textarea.placeholder = config.placeholder;
    if (config.required) textarea.required = true;

    textarea.addEventListener('input', () => {
      config.onChange?.(textarea.value);
    });

    wrapper.appendChild(textarea);

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
