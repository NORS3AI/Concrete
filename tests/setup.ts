/**
 * Phase Zed.17 - Vitest Global Setup
 * Mock browser APIs for test environment.
 */

// Mock localStorage for tests
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string): string | null => storage.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    storage.set(key, value);
  },
  removeItem: (key: string): void => {
    storage.delete(key);
  },
  clear: (): void => {
    storage.clear();
  },
  get length(): number {
    return storage.size;
  },
  key: (index: number): string | null =>
    Array.from(storage.keys())[index] ?? null,
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: (): void => {},
    removeEventListener: (): void => {},
    dispatchEvent: (): boolean => false,
    onchange: null,
    addListener: (): void => {},
    removeListener: (): void => {},
  }),
});
