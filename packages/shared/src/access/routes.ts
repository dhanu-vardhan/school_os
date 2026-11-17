import type { Permission } from './permissions'

export interface RouteEntry {
  path: string
  titleKey: string
  requiredPermissions?: Permission[]
  allowedRoles?: string[]
  requiresTenant?: boolean
  layout?: 'shell' | 'auth' | 'standalone'
  navGroup?: string
}

export const ROUTE_REGISTRY: RouteEntry[] = [
  { path: '/login', titleKey: 'auth.welcome', layout: 'auth', requiresTenant: false },
  { path: '/app/dashboard', titleKey: 'nav.dashboard', layout: 'shell', requiresTenant: true },
  { path: '/app/people/students', titleKey: 'nav.students', requiredPermissions: ['students.read'], layout: 'shell' },
  { path: '/app/safeguarding', titleKey: 'nav.safeguarding', requiredPermissions: ['safeguarding.read'], layout: 'shell' },
  { path: '/app/security', titleKey: 'nav.securityCentre', requiredPermissions: ['security.read'], layout: 'shell' },
  { path: '/app/analytics', titleKey: 'analytics.dashboard', requiredPermissions: ['analytics.read'], layout: 'shell', navGroup: 'nav.group.insights' },
  { path: '/app/analytics/explore', titleKey: 'analytics.explore', requiredPermissions: ['analytics.read'], layout: 'shell', navGroup: 'nav.group.insights' },
]

export function findRoute(path: string): RouteEntry | undefined {
  return ROUTE_REGISTRY.find(r => r.path === path)
}

export const SAFE_RETURN_TO = (candidate: string | null): string | null => {
  if (!candidate) return null
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return null
  if (/^[a-z]+:/i.test(candidate)) return null
  return candidate
}