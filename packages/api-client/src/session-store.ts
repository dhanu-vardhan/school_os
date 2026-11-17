import type { AppConfig, PublicSession, SessionUser } from '@schoolos/shared'

export const DEFAULT_CONFIG: AppConfig = {
  appName: 'SchoolOS', version: '0.0.1', defaultLocale: 'fr', locales: ['fr', 'en'],
  authMode: 'demo', demoEnabled: true, apiBasePath: '/api', timezone: 'Europe/Paris',
}

let session: PublicSession = { authenticated: false }
let config: AppConfig = DEFAULT_CONFIG
const listeners = new Set<() => void>()

export const sessionStore = {
  get: () => session,
  getConfig: () => config,
  set(next: PublicSession) { session = next; listeners.forEach(l => l()) },
  setConfig(next: AppConfig) { config = next; listeners.forEach(l => l()) },
  subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener) },
  get user(): SessionUser | undefined { return session.user },
  get csrfToken(): string | undefined { return session.csrfToken },
}
