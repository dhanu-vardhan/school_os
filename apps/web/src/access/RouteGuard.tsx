import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { findRoute, routeAccess, type DenyReason } from '@schoolos/shared'
import { SHOW_COMING_SOON, SHOW_UI_KIT } from '@schoolos/api-client'
import { useSession } from '../app/session'
import { useUiContext } from '../app/context'
import { AccessDenied, FlagDisabled, NotFoundState, StepUpGate, TenantRequired } from './states'

const REASON_KEYS: Record<Exclude<DenyReason, 'ok' | 'stepup'>, string> = {
  tenant: 'access.deniedTenant',
  role: 'access.deniedRole',
  permission: 'access.deniedPermission',
  flag: 'access.deniedFlag',
  impersonation: 'access.deniedImpersonation',
}

/**
 * Sits inside AppShell around the Outlet so forbidden and not-found states stay in the Part 6 shell
 * and protected page components never mount (no content flash). Reads only the route registry.
 */
export function RouteGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { role, roles, schoolId, stepUpActive } = useSession()
  const { impersonation } = useUiContext()
  const entry = findRoute(pathname)

  if (!entry) return <NotFoundState />

  const decision = routeAccess(entry, {
    role,
    roles,
    schoolId,
    stepUpActive,
    featureFlags: { SHOW_UI_KIT, SHOW_COMING_SOON },
    impersonating: !!impersonation,
  })

  if (decision === 'ok') return <>{children}</>
  if (decision === 'tenant') return <TenantRequired />
  if (decision === 'stepup') return <StepUpGate>{children}</StepUpGate>
  if (decision === 'flag') return <FlagDisabled />
  return <AccessDenied reasonKey={REASON_KEYS[decision]} />
}
