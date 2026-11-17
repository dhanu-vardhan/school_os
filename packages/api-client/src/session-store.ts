import type { AppConfig, DisplayRole, PublicSession, SessionUser } from '@schoolos/shared'
import { toDisplayRole } from '@schoolos/shared'

export const DEFAULT_CONFIG: AppConfig = {
  appName: 'SchoolOS', version: '0.0.1', defaultLocale: 'fr', locales: ['fr', 'en'],
  authMode: 'demo', demoEnabled: true, apiBasePath: '/api', timezone: 'Europe/Paris',
}

/** Sessions carry canonical API roles; the UI stores display roles plus the raw list. */
function normalise(next: PublicSession): PublicSession {
  if (!next.user) return next
  const apiRoles = next.user.apiRoles ?? next.user.roles ?? []
  const roles = apiRoles.map(role => toDisplayRole(role)).filter((role): role is DisplayRole => role !== undefined)
  return {
    ...next,
    user: { ...next.user, apiRoles, roles: roles.length ? roles : apiRoles },
  }
}

let session: PublicSession = { authenticated: false }
let config: AppConfig = DEFAULT_CONFIG
const listeners = new Set<() => void>()

export const sessionStore = {
  get: () => session,
  getConfig: () => config,
  set(next: PublicSession) { session = normalise(next); listeners.forEach(l => l()) },
  setConfig(next: AppConfig) { config = next; listeners.forEach(l => l()) },
  subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener) },
  get user(): SessionUser | undefined { return session.user },
  get csrfToken(): string | undefined { return session.csrfToken },
}
