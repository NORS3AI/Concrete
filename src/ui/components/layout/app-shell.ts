/**
 * Phase Zed.7 - AppShell
 * Main application shell: top nav, content area, alerts panel, modal layer.
 * Enhanced with dropdown navigation menu and smart search bar.
 */

export class AppShell {
  private rootEl: HTMLElement | null = null;
  private topNav: HTMLElement | null = null;
  private contentArea: HTMLElement | null = null;
  private alertsPanel: HTMLElement | null = null;
  private modalLayer: HTMLElement | null = null;
  private megaMenu: HTMLElement | null = null;
  private searchOverlay: HTMLElement | null = null;

  mount(root: HTMLElement): void {
    this.rootEl = root;
    root.innerHTML = '';
    root.className = 'flex flex-col min-h-screen bg-[var(--surface)]';

    // Top navigation bar
    this.topNav = this.createTopNav();
    root.appendChild(this.topNav);

    // Mega menu dropdown (hidden by default)
    this.megaMenu = this.createMegaMenu();
    root.appendChild(this.megaMenu);

    // Search overlay (hidden by default)
    this.searchOverlay = this.createSearchOverlay();
    root.appendChild(this.searchOverlay);

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

    // Wire up mega menu toggle
    const menuBtn = this.topNav.querySelector('#mega-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMegaMenu();
      });
    }

    // Wire up search trigger
    const searchBtn = this.topNav.querySelector('#search-trigger-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.openSearch());
    }

    // Close mega menu on outside click
    document.addEventListener('click', (e) => {
      if (this.megaMenu && !this.megaMenu.classList.contains('hidden') &&
          !this.megaMenu.contains(e.target as Node) &&
          !(e.target as Element).closest('#mega-menu-btn')) {
        this.toggleMegaMenu(false);
      }
    });

    // Global keyboard shortcut: Ctrl+K or Cmd+K to open search
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.openSearch();
      }
      if (e.key === 'Escape') {
        this.closeSearch();
        this.toggleMegaMenu(false);
      }
    });
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
      'flex items-center gap-3 px-4 h-14 bg-[var(--surface-raised)] border-b border-[var(--border)] sticky top-0 z-40';

    // Logo
    const logo = document.createElement('div');
    logo.className =
      'font-bold text-lg tracking-tight text-[var(--accent)] flex-shrink-0';
    logo.textContent = 'Concrete';
    nav.appendChild(logo);

    // Mega menu dropdown button
    const menuBtn = document.createElement('button');
    menuBtn.id = 'mega-menu-btn';
    menuBtn.className = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors flex-shrink-0 border border-[var(--border)]';
    menuBtn.setAttribute('aria-label', 'All modules');
    menuBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg><span>Menu</span><svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
    nav.appendChild(menuBtn);

    // Divider
    const divider1 = document.createElement('div');
    divider1.className = 'w-px h-6 bg-[var(--border)] flex-shrink-0';
    nav.appendChild(divider1);

    // Tab bar container
    const tabs = document.createElement('div');
    tabs.id = 'nav-tabs';
    tabs.className = 'flex items-center gap-1 overflow-x-auto flex-1 px-1';
    nav.appendChild(tabs);

    // Search trigger button
    const searchBtn = document.createElement('button');
    searchBtn.id = 'search-trigger-btn';
    searchBtn.className = 'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-colors flex-shrink-0 min-w-[180px]';
    searchBtn.innerHTML = `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg><span class="flex-1 text-left">Search...</span><kbd class="px-1.5 py-0.5 bg-[var(--surface-raised)] rounded text-2xs border border-[var(--border)] flex-shrink-0">\u2318K</kbd>`;
    nav.appendChild(searchBtn);

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

  /** Toggle mega menu dropdown */
  toggleMegaMenu(show?: boolean): void {
    if (!this.megaMenu) return;
    const isHidden = this.megaMenu.classList.contains('hidden');
    const shouldShow = show ?? isHidden;
    this.megaMenu.classList.toggle('hidden', !shouldShow);
    // Rotate the chevron on the menu button
    const btn = this.topNav?.querySelector('#mega-menu-btn svg:last-child');
    if (btn) {
      (btn as SVGElement).style.transform = shouldShow ? 'rotate(180deg)' : '';
    }
  }

  getMegaMenu(): HTMLElement | null {
    return this.megaMenu;
  }

  getSearchOverlay(): HTMLElement | null {
    return this.searchOverlay;
  }

  /** Open the search overlay */
  openSearch(): void {
    if (!this.searchOverlay) return;
    this.searchOverlay.classList.remove('hidden');
    const input = this.searchOverlay.querySelector('#nav-search-input') as HTMLInputElement;
    if (input) {
      input.value = '';
      input.focus();
      // Trigger search to show all results
      input.dispatchEvent(new Event('input'));
    }
  }

  /** Close the search overlay */
  closeSearch(): void {
    if (!this.searchOverlay) return;
    this.searchOverlay.classList.add('hidden');
  }

  private createMegaMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.id = 'mega-menu';
    menu.className = 'hidden absolute left-0 right-0 top-14 z-30 bg-[var(--surface-raised)] border-b-2 border-[var(--border)] shadow-xl max-h-[70vh] overflow-y-auto';

    // Inner container
    const inner = document.createElement('div');
    inner.id = 'mega-menu-content';
    inner.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0 p-4';
    menu.appendChild(inner);

    return menu;
  }

  private createSearchOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.id = 'search-overlay';
    overlay.className = 'hidden fixed inset-0 z-50 flex items-start justify-center pt-[10vh]';

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'absolute inset-0 bg-black/50 backdrop-blur-sm';
    backdrop.addEventListener('click', () => this.closeSearch());
    overlay.appendChild(backdrop);

    // Search dialog
    const dialog = document.createElement('div');
    dialog.className = 'relative w-full max-w-2xl mx-4 bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden';

    // Search input area
    const inputWrap = document.createElement('div');
    inputWrap.className = 'flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]';
    inputWrap.innerHTML = `<svg class="w-5 h-5 text-[var(--accent)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`;

    const input = document.createElement('input');
    input.id = 'nav-search-input';
    input.type = 'text';
    input.placeholder = 'Search pages, modules, features...';
    input.className = 'flex-1 bg-transparent text-[var(--text)] text-base outline-none placeholder:text-[var(--text-muted)]';
    input.setAttribute('autocomplete', 'off');
    inputWrap.appendChild(input);

    const escHint = document.createElement('kbd');
    escHint.className = 'px-1.5 py-0.5 bg-[var(--surface)] rounded text-2xs border border-[var(--border)] text-[var(--text-muted)] flex-shrink-0';
    escHint.textContent = 'ESC';
    inputWrap.appendChild(escHint);

    dialog.appendChild(inputWrap);

    // Results container
    const results = document.createElement('div');
    results.id = 'nav-search-results';
    results.className = 'max-h-[50vh] overflow-y-auto p-2';
    dialog.appendChild(results);

    // Footer hint
    const footer = document.createElement('div');
    footer.className = 'flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] text-2xs text-[var(--text-muted)]';
    footer.innerHTML = `<span class="flex items-center gap-1"><kbd class="px-1 py-0.5 bg-[var(--surface)] rounded border border-[var(--border)]">\u2191\u2193</kbd> Navigate</span><span class="flex items-center gap-1"><kbd class="px-1 py-0.5 bg-[var(--surface)] rounded border border-[var(--border)]">\u21B5</kbd> Open</span><span class="flex items-center gap-1"><kbd class="px-1 py-0.5 bg-[var(--surface)] rounded border border-[var(--border)]">ESC</kbd> Close</span>`;
    dialog.appendChild(footer);

    overlay.appendChild(dialog);

    return overlay;
  }
}
