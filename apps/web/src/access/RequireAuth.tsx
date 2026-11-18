import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { safeReturnTo } from '@schoolos/shared'
import { useSession } from '../app/session'
import { FullPageLoader } from './states'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!session.authenticated) {
    const returnTo = safeReturnTo(location.pathname + location.search)
    const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''
    return <Navigate to={`/login${query}`} replace />
  }
  return <>{children}</>
}

/** Public screens redirect home once authenticated; the home path is resolved by the shell guard. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  if (loading) return <FullPageLoader />
  if (session.authenticated) return <Navigate to="/" replace />
  return <>{children}</>
}
