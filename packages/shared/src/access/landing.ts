import { canonicalRoleForUser, displayToCanonical, type CanonicalRole } from './roles'
import { CANONICAL_LANDINGS, findRoute, safeReturnTo } from './routes'

export { CANONICAL_LANDINGS }

/** Safe universal fallback: dispatches by role inside the shell, no personal data in the URL. */
export const DEFAULT_LANDING = '/app/dashboard'

/**
 * Resolve a landing for one role or a multi-role session. The first recognised role wins unless an
 * explicit `preferredRole` is supplied by the context switcher; permissions are never merged.
 */
export function landingRouteFor(
  role: string | string[] | undefined | null,
  preferredRole?: string | null,
): string {
  const roles = Array.isArray(role) ? role : (role ? [role] : [])
  const preferred = preferredRole ? displayToCanonical(preferredRole) : undefined
  const canonical = preferred ?? canonicalRoleForUser(roles)
  return canonical ? CANONICAL_LANDINGS[canonical] : DEFAULT_LANDING
}

/** Distinct landing choices offered by the "Viewing as" switcher. */
export function availableContexts(roles: string[] | undefined): { role: CanonicalRole; landing: string }[] {
  const seen = new Set<CanonicalRole>()
  return (roles ?? []).reduce<{ role: CanonicalRole; landing: string }[]>((acc, role) => {
    const canonical = displayToCanonical(role)
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical)
      acc.push({ role: canonical, landing: CANONICAL_LANDINGS[canonical] })
    }
    return acc
  }, [])
}

/**
 * Post-login redirect order: a permitted `returnTo`, else the role landing, else the first-login
 * destination. `returnTo` is validated against the registry and the user's access before use.
 */
export function postLoginRoute(
  returnTo: string | null | undefined,
  roles: string[] | undefined,
  options?: { firstLogin?: boolean; onboardingRoute?: string },
): string {
  const roleContext = { roles, schoolId: options?.firstLogin ? undefined : 'active' }
  const safe = safeReturnTo(returnTo, { roles, schoolId: 'active' })
  if (safe) return safe
  if (options?.firstLogin && options.onboardingRoute && findRoute(options.onboardingRoute)) {
    return options.onboardingRoute
  }
  if (roleContext.schoolId) return landingRouteFor(roles)
  return DEFAULT_LANDING
}

/** Storage keys for UI preferences only — never tokens, child ids or sensitive record content. */
export function roleContextStorageKey(schoolId: string): string {
  return `schoolos.ui.role-context.${schoolId}`
}
export function lastSchoolStorageKey(): string {
  return 'schoolos.ui.last-school'
}
