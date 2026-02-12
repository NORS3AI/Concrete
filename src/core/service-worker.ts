/**
 * Phase Zed.18 - Service Worker Manager
 * Registration, update detection, and connectivity monitoring.
 * This is NOT the service worker itself -- it's the client-side registration code.
 */

export class ServiceWorkerManager {
  /** Register the service worker */
  static async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // Notify user of update
              console.info('Concrete updated. Refresh for new version.');
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.warn('Service worker registration failed:', error);
      return null;
    }
  }

  /** Unregister all service workers */
  static async unregister(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }

  /** Check if app is running offline */
  static isOffline(): boolean {
    return !navigator.onLine;
  }

  /** Listen for online/offline changes */
  static onConnectivityChange(
    handler: (online: boolean) => void,
  ): () => void {
    const onOnline = (): void => handler(true);
    const onOffline = (): void => handler(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }
}
