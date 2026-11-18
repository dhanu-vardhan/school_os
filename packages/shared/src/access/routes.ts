/**
 * Single source of truth for routes. Navigation, guards, breadcrumbs, the command palette and
 * redirects all read from this registry. The backend remains the security authority: this registry
 * only mirrors access so the UI can hide, disable-with-reason or redirect.
 */
import { can, type Permission } from '../roles'
import { displayToCanonical, type CanonicalRole } from './roles'

export type PermissionMode = 'any' | 'all'
export type RouteLayout = 'shell' | 'auth' | 'standalone'
export type DenyReason = 'ok' | 'tenant' | 'role' | 'permission' | 'stepup' | 'flag' | 'impersonation'

export interface RouteEntry {
  path: string
  titleKey: string
  icon?: string
  requiredPermissions?: Permission[]
  permissionMode?: PermissionMode
  allowedRoles?: CanonicalRole[]
  requiresStepUp?: boolean
  requiresTenant?: boolean
  featureFlag?: string
  layout?: RouteLayout
  navGroup?: string
  navLabelKey?: string
  mobileTab?: boolean
  nav?: boolean
  aliases?: string[]
  parent?: string
  soon?: boolean
}

const r = (entry: RouteEntry): RouteEntry => ({
  requiresTenant: true,
  layout: 'shell',
  permissionMode: 'any',
  ...entry,
})

/** Every role landing renders the same shared RoleDashboard configured by canonical role. */
const ROLE_LANDINGS: RouteEntry[] = [
  r({ path: '/principal', titleKey: 'role.principal', icon: 'School', allowedRoles: ['principal'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/admin', titleKey: 'role.schoolAdmin', icon: 'Settings2', allowedRoles: ['school-admin'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/vie-scolaire', titleKey: 'role.deputy', icon: 'ClipboardCheck', allowedRoles: ['deputy'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/teacher', titleKey: 'role.teacher', icon: 'GraduationCap', allowedRoles: ['teacher'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/parent', titleKey: 'role.parent', icon: 'UsersRound', allowedRoles: ['parent'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/student', titleKey: 'role.student', icon: 'BookOpenText', allowedRoles: ['student'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/finance', titleKey: 'role.finance', icon: 'Wallet', allowedRoles: ['finance'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/hr', titleKey: 'role.hr', icon: 'UserCog', allowedRoles: ['hr'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/safeguarding', titleKey: 'role.safeguarding', icon: 'ShieldAlert', allowedRoles: ['safeguarding-lead'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/health', titleKey: 'role.nurse', icon: 'HeartPulse', allowedRoles: ['nurse'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/it', titleKey: 'role.itadmin', icon: 'Monitor', allowedRoles: ['it-admin'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/library', titleKey: 'role.librarian', icon: 'LibraryBig', allowedRoles: ['librarian'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/front-office', titleKey: 'role.reception', icon: 'DoorOpen', allowedRoles: ['receptionist'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/reception', titleKey: 'role.reception', icon: 'DoorOpen', allowedRoles: ['receptionist'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/audit', titleKey: 'role.auditor', icon: 'ScrollText', allowedRoles: ['auditor'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/group', titleKey: 'role.groupAdmin', icon: 'Boxes', allowedRoles: ['group-admin'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/platform', titleKey: 'role.operator', icon: 'ShieldCheck', allowedRoles: ['super-admin'], nav: false, parent: '/app/dashboard' }),
  r({ path: '/analyst', titleKey: 'role.analyst', icon: 'ChartNoAxesCombined', allowedRoles: ['analyst'], nav: false, parent: '/app/dashboard' }),
]

/** Canonical role → landing alias. Kept here so nav trees and redirects share one definition. */
export const CANONICAL_LANDINGS: Record<CanonicalRole, string> = {
  principal: '/principal',
  'school-admin': '/admin',
  deputy: '/vie-scolaire',
  teacher: '/teacher',
  parent: '/family',
  student: '/student',
  finance: '/finance',
  hr: '/hr',
  'safeguarding-lead': '/safeguarding',
  nurse: '/health',
  'it-admin': '/it',
  librarian: '/library',
  receptionist: '/reception',
  auditor: '/audit',
  'group-admin': '/group',
  'super-admin': '/platform',
  analyst: '/analyst',
}

export const ROUTE_REGISTRY: RouteEntry[] = [
  r({ path: '/login', titleKey: 'auth.welcome', layout: 'auth', requiresTenant: false, nav: false }),
  r({ path: '/forgot-password', titleKey: 'auth.forgot', layout: 'auth', requiresTenant: false, nav: false }),
  r({ path: '/reset-password', titleKey: 'auth.forgot', layout: 'auth', requiresTenant: false, nav: false }),
  r({ path: '/invite', titleKey: 'auth.invite', layout: 'auth', requiresTenant: false, nav: false }),
  r({ path: '/session-expired', titleKey: 'auth.sessionExpired', layout: 'auth', requiresTenant: false, nav: false }),
  r({ path: '/forbidden', titleKey: 'auth.forbidden', layout: 'standalone', requiresTenant: false, nav: false }),
  r({ path: '/403', titleKey: 'auth.forbidden', layout: 'standalone', requiresTenant: false, nav: false }),

  r({ path: '/schools/select', titleKey: 'auth.schoolSelect', layout: 'shell', requiresTenant: false, nav: false }),
  r({ path: '/app/dashboard', titleKey: 'nav.dashboard', icon: 'LayoutDashboard', navGroup: 'nav.group.overview', mobileTab: true, aliases: ['/', '/dashboard', '/home', '/app/home'] }),
  r({ path: '/app/dashboard/admin', titleKey: 'nav.dashboard', nav: false, aliases: ['/app/dashboard/director'] }),
  r({ path: '/app/dashboard/teacher', titleKey: 'nav.dashboard', nav: false }),
  r({ path: '/app/dashboard/parent', titleKey: 'nav.dashboard', nav: false }),
  r({ path: '/app/dashboard/student', titleKey: 'nav.dashboard', nav: false }),
  r({ path: '/family', titleKey: 'nav.familyHome', icon: 'LayoutDashboard', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family', mobileTab: true }),
  r({ path: '/family/children', titleKey: 'nav.children', icon: 'UsersRound', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family' }),
  r({ path: '/family/children/:id', titleKey: 'family.childProfile', allowedRoles: ['parent'], requiredPermissions: ['family.read'], nav: false }),
  r({ path: '/family/attendance', titleKey: 'nav.attendance', icon: 'ClipboardCheck', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family', mobileTab: true }),
  r({ path: '/family/timetable', titleKey: 'nav.timetable', icon: 'CalendarDays', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family' }),
  r({ path: '/family/homework', titleKey: 'nav.homework', icon: 'ClipboardList', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family' }),
  r({ path: '/family/grades', titleKey: 'nav.grades', icon: 'BookOpenText', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family' }),
  r({ path: '/family/messages', titleKey: 'nav.messages', icon: 'Mail', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family', mobileTab: true }),
  r({ path: '/family/announcements', titleKey: 'nav.announcements', icon: 'Megaphone', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family' }),
  r({ path: '/family/forms', titleKey: 'nav.forms', icon: 'FileText', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family' }),
  r({ path: '/family/appointments', titleKey: 'nav.appointments', icon: 'CalendarClock', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family' }),
  r({ path: '/family/activities', titleKey: 'nav.activities', icon: 'Puzzle', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family' }),
  r({ path: '/family/canteen', titleKey: 'nav.canteen', icon: 'Utensils', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family' }),
  r({ path: '/family/billing', titleKey: 'nav.payments', icon: 'Wallet', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family' }),
  r({ path: '/family/documents', titleKey: 'nav.documents', icon: 'FileText', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.family' }),
  r({ path: '/family/profile', titleKey: 'nav.familyProfile', icon: 'Settings2', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.account' }),
  r({ path: '/family/data-rights', titleKey: 'nav.dataRights', icon: 'DatabaseBackup', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.account' }),
  r({ path: '/family/concerns', titleKey: 'nav.concerns', icon: 'ShieldAlert', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.account' }),
  r({ path: '/family/help', titleKey: 'nav.familyHelp', icon: 'LifeBuoy', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.account' }),
  r({ path: '/family/notifications', titleKey: 'nav.notifications', icon: 'Bell', allowedRoles: ['parent'], requiredPermissions: ['family.read'], navGroup: 'nav.group.account' }),
  ...ROLE_LANDINGS,
  r({ path: '/app/soon/:module', titleKey: 'soon.title', icon: 'Construction', nav: false, featureFlag: 'SHOW_COMING_SOON' }),

  r({ path: '/app/timetable', titleKey: 'nav.timetable', icon: 'CalendarDays', navGroup: 'nav.group.overview', mobileTab: true }),
  r({ path: '/app/attendance', titleKey: 'nav.attendance', icon: 'ClipboardCheck', requiredPermissions: ['attendance.record', 'students.read', 'attendance.board'], navGroup: 'nav.group.overview', mobileTab: true, aliases: ['/attendance'] }),
  r({ path: '/app/notifications', titleKey: 'nav.notifications', icon: 'Bell', navGroup: 'nav.group.overview', mobileTab: true }),

  r({ path: '/app/people/students', titleKey: 'nav.students', icon: 'UsersRound', requiredPermissions: ['students.read'], navGroup: 'nav.group.people', aliases: ['/students'] }),
  r({ path: '/app/people/students/new', titleKey: 'student.new', requiredPermissions: ['students.write'], nav: false }),
  r({ path: '/app/people/students/:id', titleKey: 'student.profile', requiredPermissions: ['students.read'], nav: false }),
  r({ path: '/app/people/students/:id/edit', titleKey: 'common.edit', requiredPermissions: ['students.write'], nav: false }),
  r({ path: '/app/people/guardians', titleKey: 'nav.guardians', icon: 'UsersRound', requiredPermissions: ['students.read'], navGroup: 'nav.group.people' }),
  r({ path: '/app/people/staff', titleKey: 'nav.staff', icon: 'UserCog', requiredPermissions: ['students.read'], navGroup: 'nav.group.people' }),
  r({ path: '/app/people/roles', titleKey: 'nav.roles', icon: 'KeyRound', requiredPermissions: ['school.settings'], navGroup: 'nav.group.people' }),
  r({ path: '/app/people/members', titleKey: 'nav.members', requiredPermissions: ['members.manage'], nav: false }),
  r({ path: '/app/people/invitations', titleKey: 'nav.invitations', requiredPermissions: ['members.manage'], nav: false }),

  r({ path: '/app/school/settings', titleKey: 'nav.settings', icon: 'Settings2', requiredPermissions: ['school.settings'], navGroup: 'nav.group.school' }),
  r({ path: '/app/school/members', titleKey: 'nav.members', requiredPermissions: ['members.manage'], navGroup: 'nav.group.school' }),
  r({ path: '/app/school/invitations', titleKey: 'nav.invitations', requiredPermissions: ['members.manage'], navGroup: 'nav.group.school' }),

  r({ path: '/app/activities', titleKey: 'nav.activities', icon: 'Puzzle', requiredPermissions: ['activities.read'], navGroup: 'nav.group.activities' }),
  r({ path: '/app/activities/mine', titleKey: 'nav.myActivities', requiredPermissions: ['activities.read'], navGroup: 'nav.group.activities' }),
  r({ path: '/app/activities/:id', titleKey: 'activity.detail', requiredPermissions: ['activities.read'], nav: false }),
  r({ path: '/app/activities/:id/enrol', titleKey: 'activity.enrol', requiredPermissions: ['activities.enrol'], nav: false }),

  r({ path: '/app/safeguarding', titleKey: 'nav.safeguarding', icon: 'ShieldAlert', requiredPermissions: ['safeguarding.read'], navGroup: 'nav.group.restricted' }),
  r({ path: '/app/safeguarding/new', titleKey: 'concern.new', requiredPermissions: ['safeguarding.write'], requiresStepUp: true, nav: false }),
  r({ path: '/app/safeguarding/:id', titleKey: 'concern.detail', requiredPermissions: ['safeguarding.read'], requiresStepUp: true, nav: false }),
  r({ path: '/app/safeguarding/harassment', titleKey: 'sg.harassment', requiredPermissions: ['safeguarding.read'], nav: false }),
  r({ path: '/app/safeguarding/contacts', titleKey: 'sg.contacts', requiredPermissions: ['safeguarding.read'], nav: false }),
  r({ path: '/app/safeguarding/reports', titleKey: 'sg.reports', requiredPermissions: ['safeguarding.read'], nav: false }),
  r({ path: '/app/safeguarding/access-log', titleKey: 'sg.accessLog', requiredPermissions: ['safeguarding.read'], nav: false }),
  r({ path: '/app/safeguarding/settings', titleKey: 'sg.settings', requiredPermissions: ['safeguarding.write'], nav: false }),

  r({ path: '/app/health', titleKey: 'nav.health', icon: 'HeartPulse', requiredPermissions: ['health.read'], navGroup: 'nav.group.restricted', soon: true }),
  r({ path: '/app/health/:id', titleKey: 'health.detail', requiredPermissions: ['health.read'], requiresStepUp: true, nav: false, soon: true }),
  r({ path: '/app/finance', titleKey: 'nav.finance', icon: 'Wallet', requiredPermissions: ['finance.invoice.read'], navGroup: 'nav.group.operations', soon: true }),
  r({ path: '/app/finance/exports', titleKey: 'nav.exports', requiredPermissions: ['finance.export'], requiresStepUp: true, nav: false, soon: true }),
  r({ path: '/app/hr/contracts', titleKey: 'nav.contracts', requiredPermissions: ['hr.contracts.read'], requiresStepUp: true, nav: false, soon: true }),
  r({ path: '/app/library', titleKey: 'nav.library', icon: 'LibraryBig', requiredPermissions: ['library.catalogue'], navGroup: 'nav.group.operations', soon: true }),
  r({ path: '/app/front-office', titleKey: 'nav.frontOffice', icon: 'DoorOpen', requiredPermissions: ['visitors.manage'], navGroup: 'nav.group.operations', soon: true }),
  r({ path: '/app/group/schools', titleKey: 'nav.schools', requiredPermissions: ['group.schools.read'], navGroup: 'nav.group.group', soon: true }),

  r({ path: '/app/ai/suggestions', titleKey: 'nav.ai', icon: 'Sparkles', requiredPermissions: ['ai.use'], navGroup: 'nav.group.insights' }),
  r({ path: '/app/ai/tools', titleKey: 'nav.aiTools', requiredPermissions: ['ai.use'], navGroup: 'nav.group.insights' }),
  r({ path: '/app/analytics', titleKey: 'analytics.dashboard', icon: 'ChartNoAxesCombined', requiredPermissions: ['analytics.read'], navGroup: 'nav.group.insights' }),
  r({ path: '/app/analytics/explore', titleKey: 'analytics.explore', requiredPermissions: ['analytics.student'], navGroup: 'nav.group.insights' }),
  r({ path: '/app/reports', titleKey: 'nav.reports', icon: 'FileClock', requiredPermissions: ['reports.read'], navGroup: 'nav.group.insights' }),

  r({ path: '/app/compliance/retention', titleKey: 'nav.retention', requiredPermissions: ['compliance.read'], navGroup: 'nav.group.compliance' }),
  r({ path: '/app/compliance/requests', titleKey: 'nav.dataRequests', requiredPermissions: ['compliance.read'], navGroup: 'nav.group.compliance' }),
  r({ path: '/app/compliance/pack', titleKey: 'nav.compliancePack', requiredPermissions: ['compliance.read'], navGroup: 'nav.group.compliance' }),
  r({ path: '/app/compliance/audit', titleKey: 'nav.auditLog', requiredPermissions: ['security.audit.read'], navGroup: 'nav.group.compliance' }),
  r({ path: '/app/security', titleKey: 'nav.securityCentre', icon: 'ShieldCheck', requiredPermissions: ['security.read'], navGroup: 'nav.group.compliance' }),
  r({ path: '/app/account/security', titleKey: 'nav.accountSecurity', icon: 'KeyRound', navGroup: 'nav.group.account' }),
  r({ path: '/app/settings', titleKey: 'nav.settings', icon: 'Settings2', navGroup: 'nav.group.account' }),

  r({ path: '/app/communication/announcements', titleKey: 'nav.announcements', icon: 'Megaphone', requiredPermissions: ['messages.read'], navGroup: 'nav.group.communication' }),
  r({ path: '/app/communication/messages', titleKey: 'nav.messages', icon: 'Mail', requiredPermissions: ['messages.read'], navGroup: 'nav.group.communication', mobileTab: true }),

  r({ path: '/app/platform/status', titleKey: 'nav.systemStatus', icon: 'Activity', requiredPermissions: ['platform.admin'], navGroup: 'nav.group.platform' }),
  r({ path: '/app/platform/flags', titleKey: 'nav.featureFlags', requiredPermissions: ['platform.admin'], navGroup: 'nav.group.platform' }),
  r({ path: '/app/platform/integrations', titleKey: 'nav.integrations', requiredPermissions: ['platform.admin'], navGroup: 'nav.group.platform' }),
  r({ path: '/app/platform/models', titleKey: 'nav.models', requiredPermissions: ['platform.admin'], navGroup: 'nav.group.platform' }),
  r({ path: '/app/platform/support', titleKey: 'nav.support', requiredPermissions: ['platform.admin'], navGroup: 'nav.group.platform' }),

  r({ path: '/demo', titleKey: 'nav.demo', nav: false, requiresTenant: false, layout: 'standalone' }),
  r({ path: '/ui-kit', titleKey: 'nav.uiKit', nav: false, featureFlag: 'SHOW_UI_KIT', layout: 'standalone' }),
  r({ path: '/ui-kit/colors', titleKey: 'nav.uiKit', nav: false, featureFlag: 'SHOW_UI_KIT', layout: 'standalone' }),
  r({ path: '/ui-kit/buttons', titleKey: 'nav.uiKit', nav: false, featureFlag: 'SHOW_UI_KIT', layout: 'standalone' }),
  r({ path: '/ui-kit/analytics', titleKey: 'nav.uiKit', nav: false, featureFlag: 'SHOW_UI_KIT', layout: 'standalone' }),
]

/** Legacy redirects: documented in docs/ROLE_UI_MAP.md. Values must be registry paths or role landings. */
export const LEGACY_REDIRECTS: Record<string, string> = {
  '/home': '/app/dashboard',
  '/dashboard': '/app/dashboard',
  '/app/home': '/app/dashboard',
  '/students': '/app/people/students',
  '/attendance': '/app/attendance',
  '/calendar': '/app/timetable',
  '/messages': '/app/communication/messages',
  '/settings': '/app/settings',
}

function split(path: string): string[] {
  return path.split('/').filter(Boolean)
}

function matches(pattern: string, path: string): boolean {
  const a = split(pattern)
  const b = split(path)
  return a.length === b.length && a.every((segment, i) => segment.startsWith(':') || segment === b[i])
}

/** Resolve a legacy alias to its canonical registry path (supports exact aliases only). */
export function resolveAlias(path: string): string {
  const direct = ROUTE_REGISTRY.find(route => route.aliases?.includes(path))
  if (direct) return direct.path
  return LEGACY_REDIRECTS[path] ?? path
}

/** Find the registry entry for a concrete path, honouring aliases and parameterised patterns. */
export function findRoute(path: string): RouteEntry | undefined {
  const resolved = resolveAlias(path)
  return ROUTE_REGISTRY.find(route => route.path === resolved)
    ?? ROUTE_REGISTRY.find(route => matches(route.path, resolved))
}

export interface RouteContext {
  role?: string
  roles?: string[]
  schoolId?: string
  stepUpActive?: boolean
  featureFlags?: Record<string, boolean>
  impersonating?: boolean
  /** Explicit grants override role-derived grants (used by tests and future API-driven permissions). */
  permissions?: Permission[]
}

function activeRoles(context: RouteContext): string[] {
  return context.roles ?? (context.role ? [context.role] : [])
}

function roleAllowed(entry: RouteEntry, context: RouteContext): boolean {
  if (!entry.allowedRoles?.length) return true
  const canonical = new Set(
    activeRoles(context).map(role => displayToCanonical(role)).filter(Boolean) as CanonicalRole[],
  )
  return entry.allowedRoles.some(role => canonical.has(role))
}

function permissionAllowed(entry: RouteEntry, context: RouteContext): boolean {
  if (!entry.requiredPermissions?.length) return true
  if (context.permissions) {
    const grants = new Set(context.permissions)
    return entry.permissionMode === 'all'
      ? entry.requiredPermissions.every(permission => grants.has(permission))
      : entry.requiredPermissions.some(permission => grants.has(permission))
  }
  const roles = activeRoles(context)
  return entry.permissionMode === 'all'
    ? entry.requiredPermissions.every(permission => roles.some(role => can(role, permission)))
    : entry.requiredPermissions.some(permission => roles.some(role => can(role, permission)))
}

/** Pure, synchronous access decision used by guards, nav filtering and the role×route test matrix. */
export function routeAccess(entry: RouteEntry | undefined, context: RouteContext): DenyReason {
  if (!entry) return 'role'
  if (entry.layout === 'auth' || entry.layout === 'standalone') return 'ok'
  if (entry.featureFlag && !context.featureFlags?.[entry.featureFlag]) return 'flag'
  if (entry.requiresTenant && !context.schoolId) return 'tenant'
  if (context.impersonating && (entry.requiresStepUp || entry.path.startsWith('/app/safeguarding') || entry.path.startsWith('/app/health'))) {
    return 'impersonation'
  }
  if (!roleAllowed(entry, context)) return 'role'
  if (!permissionAllowed(entry, context)) return 'permission'
  if (entry.requiresStepUp && !context.stepUpActive) return 'stepup'
  return 'ok'
}

export interface NavEntry extends RouteEntry {
  labelKey: string
}

/** Sidebar/bottom-tab/command-palette items: only permitted, non-hidden, flag-enabled routes. */
export function navigationFor(context: RouteContext, options?: { includeSoon?: boolean }): NavEntry[] {
  return ROUTE_REGISTRY
    .filter(route => route.nav !== false && route.navGroup)
    .filter(route => (options?.includeSoon || !route.soon))
    .filter(route => routeAccess(route, context) === 'ok')
    .map(route => ({ ...route, labelKey: route.navLabelKey ?? route.titleKey }))
}

/** Breadcrumb trail for a concrete path, resolved through the registry without exposing record data. */
export function breadcrumbsFor(path: string): string[] {
  const trail: string[] = []
  let entry = findRoute(path)
  while (entry) {
    trail.unshift(entry.titleKey)
    if (!entry.parent) break
    entry = findRoute(entry.parent)
  }
  return trail.length ? trail : ['nav.dashboard']
}

/**
 * Open-redirect defence. Accepts only same-origin, registry-known internal paths that the user may
 * open. Rejects absolute URLs, protocol-relative `//`, backslash tricks, encoded control characters
 * and any target outside the registry.
 */
export function safeReturnTo(
  candidate: string | null | undefined,
  context?: RouteContext,
): string | null {
  if (!candidate || typeof candidate !== 'string') return null
  const value = candidate.trim()
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  if (value.includes('\\') || value.includes('\0')) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null
  try {
    const decoded = decodeURIComponent(value)
    if (decoded !== value && (decoded.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(decoded))) return null
  } catch {
    return null
  }
  if (!findRoute(value)) return null
  if (context && routeAccess(findRoute(value), context) !== 'ok') return null
  return value
}

/* -------------------------------------------------------------------------- */
/* Per-role navigation trees                                                  */
/* -------------------------------------------------------------------------- */

type NavTuple = [labelKey: string, path: string, icon?: string, permission?: Permission]
const soon = (role: CanonicalRole, slug: string) => `/app/soon/${role}/${slug}`

const ROLE_NAV_TREES: Record<CanonicalRole, { key: string; items: NavTuple[] }[]> = {
  principal: [
    { key: 'nav.group.overview', items: [
      ['nav.dashboard', CANONICAL_LANDINGS.principal, 'LayoutDashboard'],
      ['nav.students', '/app/people/students', 'UsersRound', 'students.read'],
      ['nav.staff', '/app/people/staff', 'UserCog', 'students.read'],
      ['nav.classes', soon('principal', 'classes'), 'School'],
      ['nav.timetable', '/app/timetable', 'CalendarDays'],
      ['nav.attendance', '/app/attendance', 'ClipboardCheck', 'attendance.board'],
      ['nav.financeOverview', '/app/reports', 'Wallet', 'billing.read'],
      ['nav.announcements', '/app/communication/announcements', 'Megaphone', 'messages.read'],
    ] },
    { key: 'nav.group.insights', items: [
      ['nav.reports', '/app/reports', 'FileClock', 'reports.read'],
      ['analytics.dashboard', '/app/analytics', 'ChartNoAxesCombined', 'analytics.read'],
      ['nav.approvals', soon('principal', 'approvals'), 'ClipboardCheck'],
    ] },
    { key: 'nav.group.school', items: [
      ['nav.settings', '/app/school/settings', 'Settings2', 'school.settings'],
      ['nav.securityCentre', '/app/security', 'ShieldCheck', 'security.read'],
      ['nav.auditLog', '/app/compliance/audit', 'ScrollText', 'security.audit.read'],
    ] },
  ],
  'school-admin': [
    { key: 'nav.group.overview', items: [
      ['nav.dashboard', CANONICAL_LANDINGS['school-admin'], 'LayoutDashboard'],
      ['nav.students', '/app/people/students', 'UsersRound', 'students.read'],
      ['nav.staff', '/app/people/staff', 'UserCog', 'students.read'],
      ['nav.timetable', '/app/timetable', 'CalendarDays'],
      ['nav.attendance', '/app/attendance', 'ClipboardCheck', 'attendance.board'],
      ['nav.notifications', '/app/notifications', 'Bell'],
    ] },
    { key: 'nav.group.school', items: [
      ['nav.admissions', soon('school-admin', 'admissions'), 'School'],
      ['nav.approvals', soon('school-admin', 'approvals'), 'ClipboardCheck'],
      ['nav.settings', '/app/school/settings', 'Settings2', 'school.settings'],
      ['nav.members', '/app/school/members', 'UserCog', 'members.manage'],
      ['nav.invitations', '/app/school/invitations', 'Mail', 'members.manage'],
    ] },
    { key: 'nav.group.insights', items: [
      ['nav.reports', '/app/reports', 'FileClock', 'reports.read'],
      ['analytics.dashboard', '/app/analytics', 'ChartNoAxesCombined', 'analytics.read'],
    ] },
  ],
  deputy: [
    { key: 'nav.group.overview', items: [
      ['nav.dashboard', CANONICAL_LANDINGS.deputy, 'LayoutDashboard'],
      ['nav.attendanceBoard', '/app/attendance', 'ClipboardCheck', 'attendance.board'],
      ['nav.absences', soon('deputy', 'absences'), 'CalendarDays'],
      ['nav.lateness', soon('deputy', 'lateness'), 'Clock'],
      ['nav.behaviour', soon('deputy', 'behaviour'), 'Flag'],
      ['nav.detentions', soon('deputy', 'detentions'), 'FileClock'],
      ['nav.cover', '/app/timetable', 'CalendarDays'],
    ] },
    { key: 'nav.group.communication', items: [
      ['nav.messages', '/app/communication/messages', 'Mail', 'messages.read'],
      ['nav.reports', '/app/reports', 'FileClock', 'reports.read'],
    ] },
  ],
  teacher: [
    { key: 'nav.group.overview', items: [
      ['nav.dashboard', CANONICAL_LANDINGS.teacher, 'LayoutDashboard'],
      ['nav.myClasses', soon('teacher', 'classes'), 'School'],
      ['nav.register', '/app/attendance', 'ClipboardCheck', 'attendance.record'],
      ['nav.gradebook', soon('teacher', 'gradebook'), 'BookOpenText', 'grades.publish'],
      ['nav.homework', soon('teacher', 'homework'), 'ClipboardList'],
      ['nav.timetable', '/app/timetable', 'CalendarDays'],
      ['nav.instructor', '/app/instructor', 'Trophy', 'activities.read'],
      ['nav.provider', '/app/provider', 'Building2', 'activities.read'],
    ] },
    { key: 'nav.group.communication', items: [
      ['nav.messages', '/app/communication/messages', 'Mail', 'messages.read'],
      ['nav.lessonPlanner', soon('teacher', 'lessons'), 'CalendarDays'],
      ['nav.resources', soon('teacher', 'resources'), 'LibraryBig'],
      ['nav.students', '/app/people/students', 'UsersRound', 'students.read'],
    ] },
  ],
  parent: [
    { key: 'nav.group.family', items: [
      ['nav.familyHome', '/family', 'LayoutDashboard', 'family.read'],
      ['nav.children', '/family/children', 'UsersRound', 'family.read'],
      ['nav.attendance', '/family/attendance', 'ClipboardCheck', 'family.read'],
      ['nav.timetable', '/family/timetable', 'CalendarDays', 'family.read'],
      ['nav.homework', '/family/homework', 'ClipboardList', 'family.read'],
      ['nav.grades', '/family/grades', 'BookOpenText', 'family.read'],
      ['nav.forms', '/family/forms', 'FileText', 'family.read'],
    ] },
    { key: 'nav.group.communication', items: [
      ['nav.messages', '/family/messages', 'Mail', 'family.read'],
      ['nav.announcements', '/family/announcements', 'Megaphone', 'family.read'],
      ['nav.appointments', '/family/appointments', 'CalendarClock', 'family.read'],
      ['nav.activities', '/family/activities', 'Puzzle', 'family.read'],
      ['nav.canteen', '/family/canteen', 'Utensils', 'family.read'],
      ['nav.payments', '/family/billing', 'Wallet', 'family.read'],
      ['nav.documents', '/family/documents', 'FileText', 'family.read'],
    ] },
    { key: 'nav.group.account', items: [
      ['nav.familyProfile', '/family/profile', 'Settings2', 'family.read'],
      ['nav.dataRights', '/family/data-rights', 'DatabaseBackup', 'family.read'],
      ['nav.concerns', '/family/concerns', 'ShieldAlert', 'family.read'],
      ['nav.familyHelp', '/family/help', 'LifeBuoy', 'family.read'],
      ['nav.notifications', '/family/notifications', 'Bell', 'family.read'],
      ['nav.accountSecurity', '/app/account/security', 'KeyRound'],
    ] },
  ],
  student: [
    { key: 'nav.group.overview', items: [
      ['nav.dashboard', CANONICAL_LANDINGS.student, 'LayoutDashboard'],
      ['nav.timetable', '/app/timetable', 'CalendarDays'],
      ['nav.homework', soon('student', 'homework'), 'ClipboardList'],
      ['nav.grades', soon('student', 'grades'), 'BookOpenText'],
      ['nav.attendance', soon('student', 'attendance'), 'ClipboardCheck'],
    ] },
    { key: 'nav.group.communication', items: [
      ['nav.messages', '/app/communication/messages', 'Mail', 'messages.read'],
      ['nav.activities', '/app/activities', 'Puzzle', 'activities.read'],
      ['nav.announcements', '/app/communication/announcements', 'Megaphone', 'messages.read'],
      ['nav.portfolio', soon('student', 'portfolio'), 'BookOpenText'],
    ] },
    { key: 'nav.group.account', items: [['nav.accountSecurity', '/app/account/security', 'KeyRound']] },
  ],
  finance: [
    { key: 'nav.group.operations', items: [
      ['nav.dashboard', CANONICAL_LANDINGS.finance, 'LayoutDashboard'],
      ['nav.invoices', soon('finance', 'invoices'), 'FileText', 'finance.invoice.read'],
      ['nav.payments', soon('finance', 'payments'), 'Wallet', 'finance.invoice.read'],
      ['nav.families', '/app/people/guardians', 'UsersRound', 'students.read'],
      ['nav.feePlans', soon('finance', 'plans'), 'FileClock'],
      ['nav.reminders', soon('finance', 'reminders'), 'Bell', 'finance.reminders'],
    ] },
    { key: 'nav.group.insights', items: [
      ['nav.reports', '/app/reports', 'FileClock', 'reports.read'],
      ['nav.exports', '/app/finance/exports', 'DatabaseBackup', 'finance.export'],
      ['nav.settings', '/app/settings', 'Settings2'],
    ] },
  ],
  hr: [
    { key: 'nav.group.people', items: [
      ['nav.dashboard', CANONICAL_LANDINGS.hr, 'LayoutDashboard'],
      ['nav.staff', '/app/people/staff', 'UserCog', 'students.read'],
      ['nav.leave', soon('hr', 'leave'), 'CalendarDays', 'hr.leave.review'],
      ['nav.absenceCover', soon('hr', 'cover'), 'ClipboardCheck'],
      ['nav.documents', soon('hr', 'documents'), 'FileText'],
      ['nav.dutyRota', soon('hr', 'rota'), 'CalendarDays'],
    ] },
    { key: 'nav.group.insights', items: [
      ['nav.reports', '/app/reports', 'FileClock', 'reports.read'],
      ['nav.contracts', '/app/hr/contracts', 'FileText', 'hr.contracts.read'],
    ] },
  ],
  'safeguarding-lead': [
    { key: 'nav.group.restricted', items: [
      ['nav.dashboard', CANONICAL_LANDINGS['safeguarding-lead'], 'LayoutDashboard'],
      ['nav.concerns', '/app/safeguarding', 'ShieldAlert', 'safeguarding.read'],
      ['concern.new', '/app/safeguarding/new', 'FileText', 'safeguarding.write'],
      ['sg.harassment', '/app/safeguarding/harassment', 'ShieldAlert', 'safeguarding.read'],
      ['sg.contacts', '/app/safeguarding/contacts', 'Phone', 'safeguarding.read'],
      ['sg.reports', '/app/safeguarding/reports', 'BarChart3', 'safeguarding.read'],
      ['sg.accessLog', '/app/safeguarding/access-log', 'ScrollText', 'safeguarding.read'],
      ['sg.settings', '/app/safeguarding/settings', 'Settings2', 'safeguarding.write'],
      ['nav.therapist', '/app/therapist', 'HeartPulse', 'safeguarding.read'],
    ] },
    { key: 'nav.group.compliance', items: [
      ['nav.accessReports', '/app/compliance/audit', 'ScrollText', 'security.audit.read'],
      ['nav.settings', '/app/settings', 'Settings2'],
    ] },
  ],
  nurse: [
    { key: 'nav.group.restricted', items: [
      ['nav.dashboard', CANONICAL_LANDINGS.nurse, 'LayoutDashboard'],
      ['nav.visits', soon('nurse', 'visits'), 'HeartPulse', 'health.read'],
      ['nav.medication', soon('nurse', 'medication'), 'FileText', 'health.write'],
      ['nav.alerts', soon('nurse', 'alerts'), 'ShieldAlert', 'health.read'],
      ['nav.incidents', soon('nurse', 'incidents'), 'Flag', 'health.read'],
      ['nav.reports', '/app/reports', 'FileClock', 'reports.read'],
    ] },
  ],
  'it-admin': [
    { key: 'nav.group.platform', items: [
      ['nav.dashboard', CANONICAL_LANDINGS['it-admin'], 'LayoutDashboard'],
      ['nav.users', '/app/people/members', 'UserCog', 'members.manage'],
      ['nav.sessions', soon('it-admin', 'sessions'), 'Monitor', 'security.sessions.revoke'],
      ['nav.mfaCoverage', '/app/account/security', 'ShieldCheck', 'security.read'],
      ['nav.securityEvents', '/app/security', 'Activity', 'security.read'],
    ] },
    { key: 'nav.group.account', items: [
      ['nav.integrations', soon('it-admin', 'integrations'), 'Puzzle'],
      ['nav.helpdesk', soon('it-admin', 'helpdesk'), 'LifeBuoy'],
      ['nav.systemStatus', soon('it-admin', 'status'), 'Activity'],
    ] },
  ],
  librarian: [
    { key: 'nav.group.operations', items: [
      ['nav.dashboard', CANONICAL_LANDINGS.librarian, 'LayoutDashboard'],
      ['nav.catalogue', '/app/library', 'LibraryBig', 'library.catalogue'],
      ['nav.loans', soon('librarian', 'loans'), 'BookOpenText', 'library.loans'],
      ['nav.returns', soon('librarian', 'returns'), 'BookOpenText', 'library.loans'],
      ['nav.overdues', soon('librarian', 'overdues'), 'Bell', 'library.loans'],
      ['nav.members', '/app/people/students', 'UsersRound', 'students.read'],
      ['nav.reports', '/app/reports', 'FileClock', 'reports.read'],
    ] },
  ],
  receptionist: [
    { key: 'nav.group.operations', items: [
      ['nav.dashboard', CANONICAL_LANDINGS.receptionist, 'LayoutDashboard'],
      ['nav.visitors', '/app/reception', 'DoorOpen', 'visitors.manage'],
      ['nav.pickups', '/app/reception', 'UsersRound', 'pickups.approve'],
      ['nav.absenceCalls', '/app/reception', 'ClipboardCheck', 'attendance.board'],
      ['nav.requests', '/app/reception', 'ClipboardList'],
      ['nav.enrolment', '/app/reception', 'FileText'],
      ['nav.appointments', '/app/reception', 'Calendar'],
      ['nav.emergency', '/app/reception', 'AlertTriangle'],
      ['nav.directory', '/app/reception', 'BookOpen', 'students.read'],
      ['nav.announcements', '/app/communication/announcements', 'Megaphone', 'messages.read'],
    ] },
  ],
  auditor: [
    { key: 'nav.group.compliance', items: [
      ['nav.dashboard', CANONICAL_LANDINGS.auditor, 'LayoutDashboard'],
      ['nav.auditLog', '/app/compliance/audit', 'ScrollText', 'security.audit.read'],
      ['nav.accessReports', soon('auditor', 'access'), 'FileClock', 'security.audit.read'],
      ['nav.permissionMatrix', soon('auditor', 'matrix'), 'KeyRound', 'compliance.read'],
      ['nav.compliancePack', '/app/compliance/pack', 'FileText', 'compliance.read'],
      ['nav.exports', soon('auditor', 'exports'), 'DatabaseBackup', 'analytics.export'],
    ] },
  ],
  'group-admin': [
    { key: 'nav.group.group', items: [
      ['nav.dashboard', CANONICAL_LANDINGS['group-admin'], 'LayoutDashboard'],
      ['nav.schools', '/app/group/schools', 'Boxes', 'group.schools.read'],
      ['nav.aggregateAnalytics', '/app/analytics', 'ChartNoAxesCombined', 'analytics.read'],
      ['nav.users', soon('group-admin', 'users'), 'UserCog'],
      ['nav.billing', soon('group-admin', 'billing'), 'Wallet'],
      ['nav.security', soon('group-admin', 'security'), 'ShieldCheck'],
    ] },
  ],
  'super-admin': [
    { key: 'nav.group.platform', items: [
      ['nav.dashboard', CANONICAL_LANDINGS['super-admin'], 'LayoutDashboard'],
      ['nav.console', '/app/platform/console', 'ShieldCheck', 'platform.admin'],
      ['nav.tenants', '/app/platform/console', 'Boxes', 'platform.admin'],
      ['nav.authEvents', '/app/security', 'Activity', 'platform.admin'],
      ['nav.featureFlags', '/app/platform/flags', 'Flag', 'platform.admin'],
      ['nav.systemStatus', '/app/platform/status', 'Activity', 'platform.admin'],
      ['nav.plans', '/app/platform/console', 'Wallet', 'platform.admin'],
      ['nav.support', '/app/platform/support', 'LifeBuoy', 'platform.admin'],
    ] },
  ],
  analyst: [
    { key: 'nav.group.insights', items: [
      ['nav.dashboard', CANONICAL_LANDINGS.analyst, 'LayoutDashboard'],
      ['analytics.explore', '/app/analytics/explore', 'ChartNoAxesCombined', 'analytics.student'],
      ['nav.analystConsole', '/app/analytics/analyst', 'ChartNoAxesCombined', 'analytics.student'],
      ['nav.savedReports', '/app/analytics/analyst', 'FileClock', 'analytics.student'],
      ['nav.dictionary', '/app/analytics/analyst', 'BookOpenText', 'analytics.student'],
      ['nav.exports', '/app/analytics/analyst', 'DatabaseBackup', 'analytics.export'],
    ] },
  ],
}

/** Synthetic registry entries for role-specific "coming soon" destinations. */
export const ROLE_NAV_ENTRIES: RouteEntry[] = (Object.keys(ROLE_NAV_TREES) as CanonicalRole[]).flatMap(role =>
  ROLE_NAV_TREES[role].flatMap(group =>
    group.items
      .filter(([, path]) => path.startsWith('/app/soon/'))
      .map(([labelKey, path, icon, permission]) => r({
        path,
        titleKey: labelKey,
        navLabelKey: labelKey,
        icon,
        allowedRoles: [role],
        requiredPermissions: permission ? [permission] : undefined,
        navGroup: group.key,
        soon: true,
      })),
  ),
)

ROUTE_REGISTRY.push(...ROLE_NAV_ENTRIES)

export interface NavGroupEntry {
  labelKey: string
  items: NavEntry[]
}

/** Role-specific nav tree, filtered by the same access decision used by the guards. */
export function navGroupsForRole(
  role: CanonicalRole | undefined,
  context: RouteContext,
  options?: { includeSoon?: boolean },
): NavGroupEntry[] {
  if (!role) return []
  return (ROLE_NAV_TREES[role] ?? []).map(group => ({
    labelKey: group.key,
    items: group.items
      .filter(([, path]) => options?.includeSoon || !path.startsWith('/app/soon/'))
      .map(([labelKey, path, icon, permission]) => {
        const entry = findRoute(path) ?? r({ path, titleKey: labelKey, icon, requiredPermissions: permission ? [permission] : undefined })
        return { ...entry, labelKey, icon, navLabelKey: labelKey } as NavEntry
      })
      .filter(item => routeAccess(item, context) === 'ok'),
  })).filter(group => group.items.length > 0)
}
