import { useEffect, useRef } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useSession } from '../app/session'
import { useUiContext } from '../app/context'

const trackedObjectUrls = new Set<string>()

/** Call for every URL created via URL.createObjectURL so tenant switches cannot leak stale blobs. */
export function trackObjectUrl(url: string): string {
  trackedObjectUrls.add(url)
  return url
}

/**
 * Clear everything scoped to a session: server cache, widget/draft preferences, object URLs and
 * the service worker's authenticated caches. Deliberately keeps only non-sensitive UI preferences.
 */
export function clearSessionCaches(client: QueryClient): void {
  client.clear()
  for (const url of trackedObjectUrls) {
    try { URL.revokeObjectURL(url) } catch { /* already revoked */ }
  }
  trackedObjectUrls.clear()
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key) keys.push(key)
    }
    for (const key of keys) {
      if (key.startsWith('schoolos.ui.widget') || key.startsWith('schoolos.ui.draft')) {
        localStorage.removeItem(key)
      }
    }
  } catch { /* storage may be unavailable */ }
  try {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.active?.postMessage({ type: 'SCHOOLOS_CLEAR_AUTHENTICATED_CACHE' })
        })
      }).catch(() => { /* no active worker in tests */ })
    }
  } catch { /* no navigator in SSR */ }
}

/** Runs on tenant, role-context and auth-identity changes; never on initial mount. */
export function useCacheHygiene(): void {
  const client = useQueryClient()
  const { schoolId, role } = useSession()
  const { viewingRole } = useUiContext()
  const previous = useRef({ schoolId, role, viewingRole })
  useEffect(() => {
    const before = previous.current
    if (before.schoolId !== schoolId || before.role !== role || before.viewingRole !== viewingRole) {
      clearSessionCaches(client)
      previous.current = { schoolId, role, viewingRole }
    }
  }, [client, schoolId, role, viewingRole])
}
