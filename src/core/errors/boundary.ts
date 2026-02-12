/**
 * Concrete — Error Boundary
 * Phase Zed.16: Error Handling, Logging & Diagnostics
 *
 * Installs global error handlers for unhandled exceptions and
 * unhandled promise rejections. Provides fatal and recoverable
 * error UI rendering.
 */

import type { Logger } from './logger';

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

export class ErrorBoundary {
  private logger: Logger;
  private installed = false;
  private toastContainer: HTMLElement | null = null;

  /** Stored handler references for cleanup */
  private errorHandler: OnErrorEventHandler | null = null;
  private rejectionHandler: ((e: PromiseRejectionEvent) => void) | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /** Install global error handlers. */
  install(): void {
    if (this.installed) return;
    this.installed = true;

    // window.onerror -- catch unhandled errors
    this.errorHandler = (
      event: Event | string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error,
    ): boolean => {
      const err =
        error ??
        new Error(typeof event === 'string' ? event : 'Unknown error');

      this.logger.error('ErrorBoundary', `Unhandled error: ${err.message}`, {
        source,
        lineno,
        colno,
        stack: err.stack,
      });

      this.showError(err, 'Unhandled exception');
      return true; // Prevent default browser error logging
    };

    window.onerror = this.errorHandler;

    // window.onunhandledrejection -- catch unhandled promise rejections
    this.rejectionHandler = (e: PromiseRejectionEvent): void => {
      const reason = e.reason;
      const err =
        reason instanceof Error
          ? reason
          : new Error(String(reason ?? 'Unhandled promise rejection'));

      this.logger.error(
        'ErrorBoundary',
        `Unhandled promise rejection: ${err.message}`,
        {
          stack: err.stack,
        },
      );

      this.showError(err, 'Unhandled promise rejection');
    };

    window.addEventListener('unhandledrejection', this.rejectionHandler);
  }

  /** Uninstall global error handlers. */
  uninstall(): void {
    if (!this.installed) return;
    this.installed = false;

    window.onerror = null;

    if (this.rejectionHandler) {
      window.removeEventListener('unhandledrejection', this.rejectionHandler);
      this.rejectionHandler = null;
    }

    this.errorHandler = null;
  }

  /** Show fatal error UI -- replaces page content. */
  showFatalError(error: Error): void {
    this.logger.fatal('ErrorBoundary', `Fatal error: ${error.message}`, error);

    // Get recent log entries for debugging
    const recentLogs = this.logger.getEntries({ limit: 50 });
    const logHtml = recentLogs
      .map((entry) => {
        const time = new Date(entry.timestamp).toISOString();
        const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
        return `<div style="font-family:monospace;font-size:12px;padding:2px 0;color:${this.getLevelColor(entry.level)}">[${time}][${entry.level.toUpperCase()}][${entry.module}] ${this.escapeHtml(entry.message)}${this.escapeHtml(dataStr)}</div>`;
      })
      .join('');

    const html = `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 800px;
        margin: 60px auto;
        padding: 40px;
        background: #1a1a2e;
        color: #e0e0e0;
        border-radius: 12px;
        border: 1px solid #333;
      ">
        <h1 style="color: #ff6b6b; margin-top: 0; font-size: 24px;">
          Something went wrong
        </h1>
        <p style="color: #aaa; font-size: 16px; line-height: 1.6;">
          The application encountered a fatal error and cannot continue.
          Please try reloading the page.
        </p>
        <div style="
          background: #0d0d1a;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
          overflow-x: auto;
        ">
          <code style="color: #ff6b6b; font-size: 14px;">
            ${this.escapeHtml(error.message)}
          </code>
          ${error.stack ? `<pre style="color: #888; font-size: 12px; margin-top: 8px; white-space: pre-wrap;">${this.escapeHtml(error.stack)}</pre>` : ''}
        </div>
        <div style="margin-top: 20px;">
          <button onclick="window.location.reload()" style="
            background: #4a90d9;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-right: 8px;
          ">
            Reload Application
          </button>
          <button onclick="localStorage.removeItem('concrete_data'); window.location.reload()" style="
            background: #e74c3c;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">
            Reset & Reload
          </button>
        </div>
        <details style="margin-top: 30px;">
          <summary style="cursor: pointer; color: #888; font-size: 14px;">
            Diagnostic Logs (last 50 entries)
          </summary>
          <div style="
            max-height: 300px;
            overflow-y: auto;
            margin-top: 10px;
            background: #0d0d1a;
            border-radius: 8px;
            padding: 12px;
          ">
            ${logHtml || '<div style="color:#666;">No log entries available</div>'}
          </div>
        </details>
      </div>
    `;

    document.body.innerHTML = html;
  }

  /** Show recoverable error UI as a toast notification. */
  showError(error: Error, context?: string): void {
    this.logger.error(
      'ErrorBoundary',
      context ? `${context}: ${error.message}` : error.message,
      error,
    );

    // Create toast container if needed
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'concrete-error-toasts';
      Object.assign(this.toastContainer.style, {
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: '10000',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '420px',
      });
      document.body.appendChild(this.toastContainer);
    }

    const toast = document.createElement('div');
    Object.assign(toast.style, {
      background: '#2d1b1b',
      color: '#ff8888',
      border: '1px solid #ff4444',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      animation: 'fadeIn 0.3s ease-out',
      position: 'relative' as const,
    });

    const title = context ?? 'Error';
    toast.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${this.escapeHtml(title)}</div>
      <div style="color: #cc8888; font-size: 13px;">${this.escapeHtml(error.message)}</div>
      <button style="
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: #ff8888;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        line-height: 1;
      " aria-label="Dismiss">&times;</button>
    `;

    // Click dismiss
    const dismissBtn = toast.querySelector('button');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this.dismissToast(toast);
      });
    }

    this.toastContainer.appendChild(toast);

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      this.dismissToast(toast);
    }, 8000);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Remove a toast element. */
  private dismissToast(toast: HTMLElement): void {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease-out';
      setTimeout(() => {
        toast.remove();
        // Remove container if empty
        if (this.toastContainer && this.toastContainer.children.length === 0) {
          this.toastContainer.remove();
          this.toastContainer = null;
        }
      }, 300);
    }
  }

  /** Escape HTML entities. */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
  }

  /** Get a color for a log level. */
  private getLevelColor(level: string): string {
    switch (level) {
      case 'debug':
        return '#888';
      case 'info':
        return '#4a90d9';
      case 'warn':
        return '#f0ad4e';
      case 'error':
        return '#ff6b6b';
      case 'fatal':
        return '#ff0000';
      default:
        return '#ccc';
    }
  }
}
