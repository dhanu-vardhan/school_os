import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../app/session'
import { FullPageLoader, TenantRequired } from './states'

export function RequireTenant({ children }: { children: ReactNode }) {
  const { session, loading, schoolId, memberships, switchSchool } = useSession()
  const { pathname } = useLocation()
  const selecting = pathname === '/schools/select'
  useEffect(() => {
    if (!loading && session.authenticated && !schoolId && memberships.length === 1 && !selecting) {
      void switchSchool(memberships[0].schoolId)
    }
  }, [loading, session.authenticated, schoolId, memberships, switchSchool, selecting])

  if (loading) return <FullPageLoader />
  if (!session.authenticated) return <Navigate to="/login" replace />
  if (selecting) return <>{children}</>
  if (schoolId) return <>{children}</>
  if (memberships.length === 1) return <FullPageLoader />
  if (memberships.length === 0) return <TenantRequired />
  return <Navigate to="/schools/select" replace />
}
