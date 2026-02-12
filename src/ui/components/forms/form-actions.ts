/**
 * Phase Zed.7 - FormActions
 * Submit/cancel button row for forms.
 */

export interface FormActionsConfig {
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  submitDisabled?: boolean;
  loading?: boolean;
}

export class FormActions {
  static render(config: FormActionsConfig): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]';

    // Cancel button
    if (config.onCancel) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className =
        'px-4 py-2 text-sm font-medium rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors';
      cancelBtn.textContent = config.cancelLabel ?? 'Cancel';
      cancelBtn.addEventListener('click', config.onCancel);
      wrapper.appendChild(cancelBtn);
    }

    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className =
      'px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    submitBtn.disabled = config.submitDisabled ?? false;

    if (config.loading) {
      submitBtn.disabled = true;
      const spinner = document.createElement('span');
      spinner.className = 'inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2';
      submitBtn.appendChild(spinner);
    }

    const labelSpan = document.createElement('span');
    labelSpan.textContent = config.submitLabel ?? 'Save';
    submitBtn.appendChild(labelSpan);

    wrapper.appendChild(submitBtn);

    return wrapper;
  }
}
