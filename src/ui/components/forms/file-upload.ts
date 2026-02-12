/**
 * Phase Zed.7 - FileUpload
 * File upload field with drag-and-drop support.
 */

export interface FileUploadConfig {
  name: string;
  label: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  error?: string;
  maxSizeMB?: number;
  onChange?: (files: FileList | null) => void;
}

export class FileUpload {
  static render(config: FileUploadConfig): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col gap-1';

    // Label
    const label = document.createElement('label');
    label.className = 'text-sm font-medium text-[var(--text)]';
    label.textContent = config.label;
    if (config.required) {
      const asterisk = document.createElement('span');
      asterisk.className = 'text-red-400 ml-0.5';
      asterisk.textContent = '*';
      label.appendChild(asterisk);
    }
    wrapper.appendChild(label);

    // Hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.id = `field-${config.name}`;
    input.name = config.name;
    input.className = 'sr-only';
    if (config.accept) input.accept = config.accept;
    if (config.multiple) input.multiple = true;

    // Drop zone
    const dropZone = document.createElement('div');
    dropZone.className =
      'flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors';

    const icon = document.createElement('div');
    icon.className = 'text-[var(--text-muted)] mb-2';
    icon.innerHTML = `<svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>`;
    dropZone.appendChild(icon);

    const text = document.createElement('div');
    text.className = 'text-sm text-[var(--text-muted)]';
    text.innerHTML = '<span class="text-[var(--accent)] font-medium">Click to upload</span> or drag and drop';
    dropZone.appendChild(text);

    if (config.accept) {
      const hint = document.createElement('div');
      hint.className = 'text-xs text-[var(--text-muted)] mt-1';
      hint.textContent = config.accept;
      dropZone.appendChild(hint);
    }

    // File name display
    const fileDisplay = document.createElement('div');
    fileDisplay.id = `file-display-${config.name}`;
    fileDisplay.className = 'text-xs text-[var(--accent)] mt-2 hidden';
    dropZone.appendChild(fileDisplay);

    // Click to open file dialog
    dropZone.addEventListener('click', () => input.click());

    // Drag events
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-[var(--accent)]', 'bg-[var(--accent)]/5');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-[var(--accent)]', 'bg-[var(--accent)]/5');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-[var(--accent)]', 'bg-[var(--accent)]/5');
      if (e.dataTransfer?.files) {
        handleFiles(e.dataTransfer.files);
      }
    });

    input.addEventListener('change', () => {
      if (input.files) {
        handleFiles(input.files);
      }
    });

    const handleFiles = (files: FileList): void => {
      // Size check
      if (config.maxSizeMB) {
        const maxBytes = config.maxSizeMB * 1024 * 1024;
        for (let i = 0; i < files.length; i++) {
          if (files[i].size > maxBytes) {
            fileDisplay.textContent = `File too large (max ${config.maxSizeMB}MB)`;
            fileDisplay.className =
              'text-xs text-red-400 mt-2';
            return;
          }
        }
      }

      const names = Array.from(files).map((f) => f.name).join(', ');
      fileDisplay.textContent = names;
      fileDisplay.className = 'text-xs text-[var(--accent)] mt-2';
      config.onChange?.(files);
    };

    wrapper.appendChild(input);
    wrapper.appendChild(dropZone);

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
