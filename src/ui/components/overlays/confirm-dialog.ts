/**
 * Phase Zed.7 - ConfirmDialog
 * Confirmation dialog with customizable message and actions.
 */

import { Modal } from './modal';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export class ConfirmDialog {
  static open(config: ConfirmDialogConfig): Modal {
    const content = document.createElement('div');
    content.className = 'space-y-3';

    // Warning icon for danger variant
    if (config.variant === 'danger') {
      const iconWrapper = document.createElement('div');
      iconWrapper.className =
        'flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10 mb-2';
      iconWrapper.innerHTML = `<svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>`;
      content.appendChild(iconWrapper);
    }

    const message = document.createElement('p');
    message.className = 'text-sm text-[var(--text-muted)] leading-relaxed';
    message.textContent = config.message;
    content.appendChild(message);

    let modalInstance: Modal | null = null;

    modalInstance = Modal.open({
      title: config.title,
      size: 'sm',
      content,
      onClose: config.onCancel,
      actions: [
        {
          label: config.cancelLabel ?? 'Cancel',
          variant: 'default',
          onClick: () => {
            modalInstance?.close();
            config.onCancel?.();
          },
        },
        {
          label: config.confirmLabel ?? 'Confirm',
          variant: config.variant === 'danger' ? 'danger' : 'primary',
          onClick: async () => {
            await config.onConfirm();
            modalInstance?.close();
          },
        },
      ],
    });

    return modalInstance;
  }
}
