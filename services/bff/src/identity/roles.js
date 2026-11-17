/**
 * Canonical role vocabulary shared by the BFF, the API claims and the UI.
 * Keep this list in sync with `SchoolRole.java` and `docs/AUTH_DESIGN.md §3`.
 */
export const ROLES = Object.freeze({
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  GROUP_ADMIN: 'GROUP_ADMIN',
  DIRECTOR: 'DIRECTOR',
  ADMIN: 'ADMIN',
  DEPUTY: 'DEPUTY',
  TEACHER: 'TEACHER',
  ASSISTANT: 'ASSISTANT',
  SAFEGUARDING: 'SAFEGUARDING',
  NURSE: 'NURSE',
  FINANCE: 'FINANCE',
  ACCOUNTANT: 'ACCOUNTANT',
  HR: 'HR',
  IT_ADMIN: 'IT_ADMIN',
  LIBRARIAN: 'LIBRARIAN',
  RECEPTION: 'RECEPTION',
  AUDITOR: 'AUDITOR',
  GUARDIAN: 'GUARDIAN',
  STUDENT: 'STUDENT',
  ADMISSIONS: 'ADMISSIONS',
  INSTRUCTOR: 'INSTRUCTOR',
  PROVIDER: 'PROVIDER',
  OPERATOR: 'OPERATOR',
  THERAPIST: 'THERAPIST',
  OWNER: 'OWNER',
})

const ALIASES = {
  'super-admin': ROLES.PLATFORM_ADMIN,
  'superadmin': ROLES.PLATFORM_ADMIN,
  'platform-admin': ROLES.PLATFORM_ADMIN,
  'group-admin': ROLES.GROUP_ADMIN,
  groupadmin: ROLES.GROUP_ADMIN,
  head: ROLES.DIRECTOR,
  director: ROLES.DIRECTOR,
  'school-admin': ROLES.ADMIN,
  school_admin: ROLES.ADMIN,
  admin: ROLES.ADMIN,
  'vie-scolaire': ROLES.DEPUTY,
  deputy: ROLES.DEPUTY,
  teacher: ROLES.TEACHER,
  parent: ROLES.GUARDIAN,
  guardian: ROLES.GUARDIAN,
  student: ROLES.STUDENT,
  nurse: ROLES.NURSE,
  health: ROLES.NURSE,
  finance: ROLES.FINANCE,
  bursar: ROLES.FINANCE,
  accountant: ROLES.ACCOUNTANT,
  hr: ROLES.HR,
  it: ROLES.IT_ADMIN,
  'it-admin': ROLES.IT_ADMIN,
  librarian: ROLES.LIBRARIAN,
  receptionist: ROLES.RECEPTION,
  reception: ROLES.RECEPTION,
  auditor: ROLES.AUDITOR,
  inspector: ROLES.AUDITOR,
  safeguarding: ROLES.SAFEGUARDING,
  'safeguarding-lead': ROLES.SAFEGUARDING,
  admissions: ROLES.ADMISSIONS,
  instructor: ROLES.INSTRUCTOR,
  provider: ROLES.PROVIDER,
  operator: ROLES.OPERATOR,
  therapist: ROLES.THERAPIST,
  owner: ROLES.OWNER,
  assistant: ROLES.ASSISTANT,
}

export function normalizeRole(input) {
  if (!input) return null
  const raw = String(input).trim()
  const upper = raw.toUpperCase().replace(/^ROLE_/, '')
  if (ROLES[upper]) return upper
  return ALIASES[raw.toLowerCase()] || null
}

/** Roles that must use MFA: admin/head/finance/health/safeguarding/HR/export rights. */
export const MFA_REQUIRED_ROLES = new Set([
  ROLES.PLATFORM_ADMIN,
  ROLES.GROUP_ADMIN,
  ROLES.DIRECTOR,
  ROLES.ADMIN,
  ROLES.DEPUTY,
  ROLES.SAFEGUARDING,
  ROLES.NURSE,
  ROLES.FINANCE,
  ROLES.ACCOUNTANT,
  ROLES.HR,
  ROLES.IT_ADMIN,
  ROLES.AUDITOR,
])

/** Privileged roles get shorter idle timeouts, a session cap and no silent MFA skip. */
export const PRIVILEGED_ROLES = new Set([...MFA_REQUIRED_ROLES])

export const EXPORT_ROLES = new Set([
  ROLES.PLATFORM_ADMIN, ROLES.GROUP_ADMIN, ROLES.DIRECTOR, ROLES.ADMIN,
  ROLES.AUDITOR, ROLES.FINANCE, ROLES.HR, ROLES.IT_ADMIN,
])

export const SENSITIVE_PERMISSIONS = new Set([
  'safeguarding.read',
  'safeguarding.write',
  'health.read',
  'health.write',
  'billing.manage',
  'export',
  'erasure',
  'role.manage',
  'mfa.manage',
  'security.read',
  'impersonate',
])

/** Permissions that may never be used while impersonating. */
export const IMPERSONATION_FORBIDDEN = new Set(['safeguarding.read', 'safeguarding.write', 'health.read', 'health.write'])

export function needsMfa(roles) {
  return roles.some(role => MFA_REQUIRED_ROLES.has(normalizeRole(role)))
}

export function isPrivileged(roles) {
  return roles.some(role => PRIVILEGED_ROLES.has(normalizeRole(role)))
}

export function highestRole(roles) {
  const order = [
    ROLES.PLATFORM_ADMIN, ROLES.GROUP_ADMIN, ROLES.DIRECTOR, ROLES.ADMIN, ROLES.DEPUTY,
    ROLES.SAFEGUARDING, ROLES.NURSE, ROLES.FINANCE, ROLES.ACCOUNTANT, ROLES.HR,
    ROLES.IT_ADMIN, ROLES.AUDITOR, ROLES.TEACHER, ROLES.ASSISTANT, ROLES.ADMISSIONS,
    ROLES.RECEPTION, ROLES.LIBRARIAN, ROLES.GUARDIAN, ROLES.STUDENT, ROLES.INSTRUCTOR,
    ROLES.PROVIDER, ROLES.THERAPIST, ROLES.OPERATOR, ROLES.OWNER,
  ]
  const normalized = roles.map(normalizeRole).filter(Boolean)
  return order.find(role => normalized.includes(role)) || normalized[0] || null
}

export function legacyDisplayRole(role) {
  const map = {
    PLATFORM_ADMIN: 'operator',
    GROUP_ADMIN: 'director',
    DIRECTOR: 'director',
    ADMIN: 'admin',
    DEPUTY: 'deputy',
    TEACHER: 'teacher',
    ASSISTANT: 'assistant',
    SAFEGUARDING: 'safeguarding',
    NURSE: 'therapist',
    FINANCE: 'finance',
    ACCOUNTANT: 'accountant',
    HR: 'admin',
    IT_ADMIN: 'admin',
    LIBRARIAN: 'teacher',
    RECEPTION: 'reception',
    AUDITOR: 'safeguarding',
    GUARDIAN: 'guardian',
    STUDENT: 'student',
    ADMISSIONS: 'admissions',
    INSTRUCTOR: 'instructor',
    PROVIDER: 'provider',
    THERAPIST: 'therapist',
    OPERATOR: 'operator',
    OWNER: 'operator',
  }
  return map[normalizeRole(role)] || 'teacher'
}
