import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useSession } from '../app/session'

export function RequireTenant({ children }: { children: ReactNode }) {
  const { session, loading, schoolId } = useSession()
  if (loading) return null
  if (!session.authenticated) return <Navigate to="/login" replace />
  if (!schoolId && (session.user?.memberships?.length ?? 0) > 1) return <Navigate to="/schools/select" replace />
  return <>{children}</>
}