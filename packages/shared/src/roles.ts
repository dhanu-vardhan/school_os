export const DISPLAY_ROLES = [
  'director', 'deputy', 'admin', 'itadmin', 'teacher', 'assistant', 'instructor', 'librarian',
  'finance', 'accountant', 'hr', 'admissions', 'reception', 'guardian', 'guardian2', 'parent',
  'student', 'provider', 'safeguarding', 'therapist', 'nurse', 'auditor', 'operator', 'analyst',
  'group-admin',
] as const
export type DisplayRole = typeof DISPLAY_ROLES[number]

/**
 * Fine-grained permissions used by the UI route/action registry. Colon-shaped names such as
 * `attendance:record` from the backend spec are normalised to their dotted equivalent by
 * `normalisePermission`, so both spellings are accepted everywhere.
 */
export type Permission =
  | 'students.read' | 'students.write'
  | 'school.settings' | 'members.manage'
  | 'activities.read' | 'activities.manage' | 'activities.enrol'
  | 'safeguarding.read' | 'safeguarding.write'
  | 'ai.use' | 'ai.decide'
  | 'billing.read' | 'billing.manage'
  | 'reports.read' | 'compliance.read' | 'compliance.manage'
  | 'messages.read' | 'messages.write'
  | 'security.read'
  | 'platform.admin'
  | 'analytics.read' | 'analytics.student' | 'analytics.configure' | 'analytics.export'
  | 'attendance.record' | 'attendance.board'
  | 'grades.publish' | 'grades.read'
  | 'finance.invoice.read' | 'finance.invoice.write' | 'finance.export' | 'finance.reminders'
  | 'hr.contracts.read' | 'hr.leave.review'
  | 'health.read' | 'health.write'
  | 'security.audit.read' | 'security.sessions.revoke'
  | 'visitors.manage' | 'pickups.approve'
  | 'library.loans' | 'library.catalogue'
  | 'group.aggregate.read' | 'group.schools.read'
  | 'impersonation.request' | 'featureflags.write'
  // Guardian portal (PROMPT 005). Granted to family roles only — never to staff.
  | 'family.read' | 'family.absence.write' | 'family.forms.sign'
  | 'family.collector.write' | 'family.billing.pay' | 'family.data.request'
  | 'family.concern.write' | 'family.messages.write'

/** Accepts either the dotted canonical form or a colon-shaped alias. */
export type PermissionInput = Permission | (string & {})

export function normalisePermission(permission: PermissionInput): string {
  return permission.includes(':') ? permission.replace(/:/g, '.') : permission
}

const all = new Set<Permission>([
  'students.read', 'students.write', 'school.settings', 'members.manage',
  'activities.read', 'activities.manage', 'activities.enrol', 'safeguarding.read',
  'safeguarding.write', 'ai.use', 'ai.decide', 'billing.read', 'billing.manage',
  'reports.read', 'compliance.read', 'compliance.manage', 'messages.read', 'messages.write',
  'security.read', 'security.audit.read', 'security.sessions.revoke',
  'analytics.read', 'analytics.student', 'analytics.configure', 'analytics.export',
  'attendance.record', 'attendance.board', 'grades.publish', 'grades.read',
  'finance.invoice.read', 'finance.invoice.write', 'finance.export', 'finance.reminders',
  'hr.contracts.read', 'hr.leave.review', 'visitors.manage', 'pickups.approve',
  'library.loans', 'library.catalogue',
])

/** Family portal capabilities. Rights are scoped server-side to linked children. */
const familyPermissions: Permission[] = [
  'family.read', 'family.absence.write', 'family.forms.sign', 'family.collector.write',
  'family.billing.pay', 'family.data.request', 'family.concern.write', 'family.messages.write',
  'activities.read', 'activities.enrol', 'messages.read', 'billing.read', 'finance.invoice.read',
]

const teaching: Permission[] = [
  'students.read', 'activities.read', 'activities.manage', 'ai.use', 'messages.read', 'messages.write',
  'attendance.record', 'attendance.board', 'grades.publish', 'grades.read',
]

const rolePermissions: Record<DisplayRole, Permission[]> = {
  director: [...all],
  deputy: [...all].filter(p => p !== 'platform.admin' && p !== 'impersonation.request' && p !== 'featureflags.write'),
  admin: [...all].filter(p => p !== 'platform.admin' && p !== 'safeguarding.write' && p !== 'impersonation.request' && p !== 'featureflags.write' && p !== 'hr.contracts.read'),
  itadmin: ['students.read', 'members.manage', 'security.read', 'security.audit.read', 'security.sessions.revoke', 'compliance.read', 'messages.read', 'reports.read', 'analytics.read'],
  teacher: [...teaching, 'analytics.read', 'analytics.student'],
  assistant: [...teaching, 'analytics.read'],
  instructor: ['students.read', 'activities.read', 'activities.manage', 'messages.read', 'attendance.record', 'grades.publish', 'grades.read', 'analytics.read'],
  librarian: ['students.read', 'activities.read', 'messages.read', 'library.loans', 'library.catalogue', 'analytics.read'],
  finance: ['students.read', 'billing.read', 'billing.manage', 'finance.invoice.read', 'finance.invoice.write', 'finance.export', 'finance.reminders', 'reports.read', 'compliance.read', 'messages.read', 'analytics.read', 'analytics.export'],
  accountant: ['students.read', 'billing.read', 'billing.manage', 'finance.invoice.read', 'finance.export', 'reports.read', 'compliance.read', 'analytics.read', 'analytics.export'],
  hr: ['students.read', 'members.manage', 'hr.contracts.read', 'hr.leave.review', 'reports.read', 'compliance.read', 'messages.read', 'analytics.read'],
  admissions: ['students.read', 'students.write', 'messages.read', 'messages.write'],
  reception: ['students.read', 'messages.read', 'messages.write', 'activities.read', 'visitors.manage', 'pickups.approve', 'attendance.board', 'analytics.read'],
  guardian: [...familyPermissions],
  guardian2: [...familyPermissions],
  parent: [...familyPermissions],
  student: ['activities.read', 'activities.enrol', 'messages.read', 'messages.write', 'analytics.read'],
  provider: ['activities.read', 'activities.manage', 'messages.read'],
  safeguarding: ['students.read', 'safeguarding.read', 'safeguarding.write', 'compliance.read', 'messages.read', 'security.read', 'security.audit.read', 'analytics.read'],
  therapist: ['students.read', 'safeguarding.read', 'messages.read'],
  nurse: ['students.read', 'health.read', 'health.write', 'messages.read'],
  auditor: ['students.read', 'compliance.read', 'security.read', 'security.audit.read', 'reports.read', 'analytics.read', 'analytics.export'],
  operator: ['platform.admin', 'reports.read', 'compliance.read', 'security.read', 'security.audit.read', 'featureflags.write', 'impersonation.request'],
  analyst: ['students.read', 'reports.read', 'analytics.read', 'analytics.student', 'analytics.export', 'messages.read'],
  'group-admin': ['group.aggregate.read', 'group.schools.read', 'reports.read', 'analytics.read', 'security.read'],
}

export function permissionsFor(role: DisplayRole | string | undefined | null): Permission[] {
  if (!role) return []
  return rolePermissions[toDisplayRole(role) as DisplayRole] ?? []
}

function grantsFor(role: DisplayRole | string | undefined | null): Set<string> {
  return new Set(permissionsFor(role).map(normalisePermission))
}

/** Role-level check. Deny by default. Accepts dotted or colon-shaped permission names. */
export function can(role: DisplayRole | string | undefined | null, permission: PermissionInput): boolean {
  return grantsFor(role).has(normalisePermission(permission))
}

export interface AccessUser {
  role?: string
  roles?: string[]
  schoolId?: string
  classIds?: string[]
  childIds?: string[]
  studentId?: string
}

export interface AccessResource {
  schoolId?: string
  classId?: string
  childId?: string
  studentId?: string
}

/**
 * Object-scoped check: role permission plus resource ownership. A missing field on either side is
 * not a deny (the server still enforces row scope); a present-but-different value is a deny, so the
 * UI never flashes data for another tenant, class or child.
 */
export function canAccess(
  user: AccessUser | string | undefined | null,
  permission: PermissionInput,
  resource?: AccessResource,
): boolean {
  const subject: AccessUser = typeof user === 'string' ? { role: user } : (user ?? {})
  const roles = subject.roles ?? (subject.role ? [subject.role] : [])
  const permitted = roles.some(role => grantsFor(role).has(normalisePermission(permission)))
  if (!permitted) return false
  if (!resource) return true
  if (resource.schoolId && subject.schoolId && resource.schoolId !== subject.schoolId) return false
  if (resource.classId && subject.classIds && !subject.classIds.includes(resource.classId)) return false
  if (resource.childId && subject.childIds && !subject.childIds.includes(resource.childId)) return false
  if (resource.studentId && subject.studentId && resource.studentId !== subject.studentId) return false
  return true
}

export const ROLE_ACCENT: Record<DisplayRole, string> = {
  director: 'admin', deputy: 'admin', admin: 'admin', itadmin: 'admin',
  teacher: 'teacher', assistant: 'teacher', instructor: 'teacher', librarian: 'teacher',
  guardian: 'parent', guardian2: 'parent', parent: 'parent', student: 'student',
  finance: 'finance', accountant: 'finance', admissions: 'admin', reception: 'admin',
  provider: 'teacher', safeguarding: 'safeguarding', therapist: 'safeguarding', nurse: 'safeguarding',
  auditor: 'safeguarding', hr: 'admin', operator: 'operator', analyst: 'admin',
  'group-admin': 'operator',
}

export const ROLE_FAMILY: Record<DisplayRole, 'school' | 'teaching' | 'family' | 'restricted' | 'platform'> = {
  director: 'school', deputy: 'school', admin: 'school', itadmin: 'school', admissions: 'school',
  reception: 'school', hr: 'school', 'group-admin': 'platform',
  teacher: 'teaching', assistant: 'teaching', instructor: 'teaching', provider: 'teaching',
  librarian: 'teaching',
  guardian: 'family', guardian2: 'family', parent: 'family', student: 'family',
  finance: 'school', accountant: 'school',
  safeguarding: 'restricted', therapist: 'restricted', nurse: 'restricted', auditor: 'restricted',
  operator: 'platform', analyst: 'school',
}

/** Map a display role onto the backend SchoolRole claim used by the BFF demo picker. */
export const API_ROLE: Record<DisplayRole, string> = {
  director: 'DIRECTOR', deputy: 'DEPUTY', admin: 'ADMIN', itadmin: 'IT_ADMIN', admissions: 'ADMISSIONS',
  reception: 'RECEPTION', hr: 'HR',
  teacher: 'TEACHER', assistant: 'ASSISTANT', instructor: 'INSTRUCTOR', provider: 'PROVIDER',
  librarian: 'LIBRARIAN',
  guardian: 'GUARDIAN', guardian2: 'GUARDIAN', parent: 'GUARDIAN', student: 'STUDENT',
  finance: 'FINANCE', accountant: 'ACCOUNTANT',
  safeguarding: 'SAFEGUARDING', therapist: 'THERAPIST', nurse: 'NURSE', auditor: 'AUDITOR',
  operator: 'PLATFORM_ADMIN', analyst: 'DATA_ANALYST',
  'group-admin': 'GROUP_ADMIN',
}

const API_TO_DISPLAY: Record<string, DisplayRole> = {
  PLATFORM_ADMIN: 'operator', OPERATOR: 'operator', OWNER: 'operator', SUPER_ADMIN: 'operator',
  GROUP_ADMIN: 'group-admin', DIRECTOR: 'director', PRINCIPAL: 'director',
  ADMIN: 'admin', SCHOOL_ADMIN: 'admin', SCHOOLADMIN: 'admin', IT_ADMIN: 'itadmin',
  DEPUTY: 'deputy', VIE_SCOLAIRE: 'deputy',
  TEACHER: 'teacher', INSTRUCTOR: 'instructor', LIBRARIAN: 'librarian', ASSISTANT: 'assistant',
  SAFEGUARDING: 'safeguarding', SAFEGUARDING_LEAD: 'safeguarding', AUDITOR: 'auditor', INSPECTOR: 'auditor',
  NURSE: 'nurse', HEALTH: 'nurse', THERAPIST: 'therapist',
  FINANCE: 'finance', BURSAR: 'finance', ACCOUNTANT: 'accountant', HR: 'hr',
  RECEPTION: 'reception', RECEPTIONIST: 'reception',
  GUARDIAN: 'parent', PARENT: 'parent', STUDENT: 'student',
  ADMISSIONS: 'admissions', PROVIDER: 'provider',
  ANALYST: 'analyst', DATA_ANALYST: 'analyst',
}

/**
 * The BFF returns canonical API roles; screens and navigation use display roles. Canonical UI role
 * names and already-display values also pass through so mock data and older links keep working.
 */
export function toDisplayRole(role: string | undefined | null): DisplayRole | undefined {
  if (!role) return undefined
  const raw = role.trim()
  const direct = API_TO_DISPLAY[raw.toUpperCase().replace(/^ROLE_/, '')]
  if (direct) return direct
  const lower = raw.toLowerCase()
  return (DISPLAY_ROLES as readonly string[]).includes(lower) ? lower as DisplayRole : undefined
}
