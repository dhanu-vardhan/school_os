import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { can } from '@schoolos/shared'
import { useSession } from '../app/session'

export function RequirePermission({ permission, children }: { permission?: string; children: ReactNode }) {
  const { role, loading } = useSession()
  if (loading) return null
  if (permission && !can(role, permission as any)) {
    return <Navigate to="/forbidden" replace />
  }
  return <>{children}</>
}