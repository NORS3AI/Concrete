/**
 * Phase Zed.7 - CurrencyField
 * Currency input with symbol prefix and formatting.
 */

export interface CurrencyFieldConfig {
  name: string;
  label: string;
  value?: number;
  placeholder?: string;
  required?: boolean;
  error?: string;
  min?: number;
  max?: number;
  currencySymbol?: string;
  onChange?: (value: number | null) => void;
}

export class CurrencyField {
  static render(config: CurrencyFieldConfig): HTMLElement {
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

    // Input group with currency symbol
    const inputGroup = document.createElement('div');
    inputGroup.className = 'relative';

    const symbol = document.createElement('span');
    symbol.className =
      'absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]';
    symbol.textContent = config.currencySymbol ?? '$';
    inputGroup.appendChild(symbol);

    const input = document.createElement('input');
    input.type = 'number';
    input.id = `field-${config.name}`;
    input.name = config.name;
    input.className = `w-full pl-7 pr-3 py-2 text-sm bg-[var(--surface)] border rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${
      config.error ? 'border-red-500' : 'border-[var(--border)]'
    }`;
    input.step = '0.01';
    if (config.value != null) input.value = String(config.value);
    if (config.placeholder) input.placeholder = config.placeholder;
    if (config.min != null) input.min = String(config.min);
    if (config.max != null) input.max = String(config.max);
    if (config.required) input.required = true;

    input.addEventListener('input', () => {
      const val = input.value === '' ? null : Number(input.value);
      config.onChange?.(val);
    });

    inputGroup.appendChild(input);
    wrapper.appendChild(inputGroup);

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
