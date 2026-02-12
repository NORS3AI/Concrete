/**
 * Phase Zed.7 - AppShell
 * Main application shell: top nav, content area, alerts panel, modal layer.
 */

export class AppShell {
  private rootEl: HTMLElement | null = null;
  private topNav: HTMLElement | null = null;
  private contentArea: HTMLElement | null = null;
  private alertsPanel: HTMLElement | null = null;
  private modalLayer: HTMLElement | null = null;

  mount(root: HTMLElement): void {
    this.rootEl = root;
    root.innerHTML = '';
    root.className = 'flex flex-col min-h-screen bg-[var(--surface)]';

    // Top navigation bar
    this.topNav = this.createTopNav();
    root.appendChild(this.topNav);

    // Main content area
    this.contentArea = document.createElement('main');
    this.contentArea.id = 'content';
    this.contentArea.className = 'flex-1 overflow-auto p-4 lg:p-6';
    root.appendChild(this.contentArea);

    // Alerts slide panel (hidden by default)
    this.alertsPanel = this.createAlertsPanel();
    root.appendChild(this.alertsPanel);

    // Modal overlay layer
    this.modalLayer = document.createElement('div');
    this.modalLayer.id = 'modal-layer';
    this.modalLayer.className = 'fixed inset-0 z-50 hidden';
    root.appendChild(this.modalLayer);

    // Wire up alerts toggle
    const alertsBtn = this.topNav.querySelector('#alerts-btn');
    if (alertsBtn) {
      alertsBtn.addEventListener('click', () => this.toggleAlerts());
    }
    const closeAlertsBtn = this.alertsPanel.querySelector('#close-alerts');
    if (closeAlertsBtn) {
      closeAlertsBtn.addEventListener('click', () => this.toggleAlerts(false));
    }
  }

  getRoot(): HTMLElement | null {
    return this.rootEl;
  }

  getContentArea(): HTMLElement | null {
    return this.contentArea;
  }

  getModalLayer(): HTMLElement | null {
    return this.modalLayer;
  }

  getAlertsPanel(): HTMLElement | null {
    return this.alertsPanel;
  }

  getTopNav(): HTMLElement | null {
    return this.topNav;
  }

  private createTopNav(): HTMLElement {
    const nav = document.createElement('nav');
    nav.className =
      'flex items-center gap-4 px-4 h-14 bg-[var(--surface-raised)] border-b border-[var(--border)] sticky top-0 z-40';

    // Logo
    const logo = document.createElement('div');
    logo.className =
      'font-bold text-lg tracking-tight text-[var(--accent)] flex-shrink-0';
    logo.textContent = 'Concrete';
    nav.appendChild(logo);

    // Tab bar container
    const tabs = document.createElement('div');
    tabs.id = 'nav-tabs';
    tabs.className = 'flex items-center gap-1 overflow-x-auto flex-1 px-2';
    nav.appendChild(tabs);

    // Global filters area
    const filters = document.createElement('div');
    filters.id = 'global-filters';
    filters.className = 'flex items-center gap-2 flex-shrink-0';
    nav.appendChild(filters);

    // Alerts button
    const alertsBtn = document.createElement('button');
    alertsBtn.id = 'alerts-btn';
    alertsBtn.className = 'btn-ghost relative p-2 rounded-md';
    alertsBtn.setAttribute('aria-label', 'Notifications');
    alertsBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>`;
    nav.appendChild(alertsBtn);

    // Command palette trigger
    const cmdBtn = document.createElement('button');
    cmdBtn.id = 'cmd-palette-btn';
    cmdBtn.className = 'btn-ghost p-2 rounded-md text-xs';
    cmdBtn.setAttribute('aria-label', 'Command palette');
    cmdBtn.innerHTML = `<kbd class="px-1.5 py-0.5 bg-[var(--surface)] rounded text-2xs border border-[var(--border)]">\u2318K</kbd>`;
    nav.appendChild(cmdBtn);

    return nav;
  }

  private createAlertsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'alerts-panel';
    panel.className =
      'fixed right-0 top-14 bottom-0 w-80 bg-[var(--surface-raised)] border-l border-[var(--border)] transform translate-x-full transition-transform z-30 overflow-y-auto';

    const header = document.createElement('div');
    header.className =
      'flex items-center justify-between p-4 border-b border-[var(--border)]';
    header.innerHTML =
      '<h2 class="font-semibold">Notifications</h2><button class="btn-ghost p-1 rounded" id="close-alerts">&times;</button>';
    panel.appendChild(header);

    const content = document.createElement('div');
    content.id = 'alerts-content';
    content.className = 'p-4 space-y-3';
    panel.appendChild(content);

    return panel;
  }

  /** Toggle alerts panel */
  toggleAlerts(show?: boolean): void {
    if (!this.alertsPanel) return;
    const isHidden = this.alertsPanel.classList.contains('translate-x-full');
    const shouldShow = show ?? isHidden;
    this.alertsPanel.classList.toggle('translate-x-full', !shouldShow);
    this.alertsPanel.classList.toggle('translate-x-0', shouldShow);
  }
}
