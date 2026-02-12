/**
 * Phase Zed.7 - InlineEdit
 * Click-to-edit text field that shows a display value and toggles to an input on click.
 */

export interface InlineEditConfig {
  name: string;
  label?: string;
  value: string;
  placeholder?: string;
  onSave: (value: string) => void | Promise<void>;
  onCancel?: () => void;
}

export class InlineEdit {
  static render(config: InlineEditConfig): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'inline-flex items-center gap-1 group';

    let isEditing = false;

    const renderDisplay = (): void => {
      wrapper.innerHTML = '';
      isEditing = false;

      if (config.label) {
        const label = document.createElement('span');
        label.className = 'text-xs text-[var(--text-muted)] mr-1';
        label.textContent = `${config.label}:`;
        wrapper.appendChild(label);
      }

      const display = document.createElement('span');
      display.className =
        'text-sm text-[var(--text)] cursor-pointer border-b border-dashed border-transparent hover:border-[var(--text-muted)] transition-colors';
      display.textContent = config.value || config.placeholder || 'Click to edit';
      if (!config.value) {
        display.className += ' text-[var(--text-muted)] italic';
      }

      display.addEventListener('click', () => renderInput());
      wrapper.appendChild(display);

      // Edit icon (visible on hover)
      const editIcon = document.createElement('span');
      editIcon.className =
        'text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs';
      editIcon.textContent = '\u270E';
      editIcon.addEventListener('click', () => renderInput());
      wrapper.appendChild(editIcon);
    };

    const renderInput = (): void => {
      wrapper.innerHTML = '';
      isEditing = true;

      const input = document.createElement('input');
      input.type = 'text';
      input.value = config.value;
      input.className =
        'px-2 py-1 text-sm bg-[var(--surface)] border border-[var(--accent)] rounded-md text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';
      if (config.placeholder) input.placeholder = config.placeholder;

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'text-xs text-emerald-400 hover:text-emerald-300 px-1';
      saveBtn.textContent = '\u2713';
      saveBtn.addEventListener('click', async () => {
        config.value = input.value;
        await config.onSave(input.value);
        renderDisplay();
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'text-xs text-red-400 hover:text-red-300 px-1';
      cancelBtn.textContent = '\u2717';
      cancelBtn.addEventListener('click', () => {
        config.onCancel?.();
        renderDisplay();
      });

      input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          config.value = input.value;
          await config.onSave(input.value);
          renderDisplay();
        } else if (e.key === 'Escape') {
          config.onCancel?.();
          renderDisplay();
        }
      });

      // Focus on blur to cancel if editing
      input.addEventListener('blur', () => {
        // Small delay to allow button clicks
        setTimeout(() => {
          if (isEditing) {
            renderDisplay();
          }
        }, 200);
      });

      wrapper.appendChild(input);
      wrapper.appendChild(saveBtn);
      wrapper.appendChild(cancelBtn);

      input.focus();
      input.select();
    };

    renderDisplay();
    return wrapper;
  }
}
