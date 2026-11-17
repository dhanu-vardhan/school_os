import '@testing-library/jest-dom/vitest'
import { initI18n, setLocale } from '@schoolos/i18n'
import { resetMockDb, sessionStore } from '@schoolos/api-client'

// Node 26 exposes an experimental localStorage stub; jsdom may not provide one.
// Provide a deterministic in-memory Storage so locale/UI preferences behave as in the browser.
class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() { return this.values.size }

  clear() { this.values.clear() }

  getItem(key: string) { return this.values.has(key) ? this.values.get(key)! : null }

  key(index: number) { return [...this.values.keys()][index] ?? null }

  removeItem(key: string) { this.values.delete(key) }

  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}

if (typeof window.localStorage === 'undefined') {
  const storage = new MemoryStorage()
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
}

initI18n()

// jsdom lacks these browser APIs used by the UI primitives and charts.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

Element.prototype.scrollIntoView ??= () => {}

beforeEach(async () => {
  resetMockDb()
  sessionStore.set({ authenticated: false })
  window.localStorage?.clear()
  await setLocale('fr')
})
