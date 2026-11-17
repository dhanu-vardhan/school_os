import type { ReactNode } from 'react'
import { canAccess, type AccessResource, type PermissionInput } from '@schoolos/shared'
import { useSession } from '../app/session'
import { AccessDenied } from './states'

/**
 * Action-level gate (route-level access is handled by RouteGuard). Accepts dotted or colon-shaped
 * permissions and an optional resource for object-scoped checks; denies by default.
 */
export function RequirePermission({ permission, resource, children }: {
  permission: PermissionInput
  resource?: AccessResource
  children: ReactNode
}) {
  const { role, roles, schoolId, loading } = useSession()
  if (loading) return null
  if (!canAccess({ role, roles, schoolId }, permission, resource)) return <AccessDenied />
  return <>{children}</>
}
