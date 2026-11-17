export const DISPLAY_ROLES = [
  'director', 'deputy', 'admin', 'itadmin', 'teacher', 'assistant', 'instructor', 'librarian',
  'finance', 'accountant', 'hr', 'admissions', 'reception', 'guardian', 'guardian2', 'parent',
  'student', 'provider', 'safeguarding', 'therapist', 'nurse', 'auditor', 'operator', 'analyst',
] as const
export type DisplayRole = typeof DISPLAY_ROLES[number]

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

const all = new Set<Permission>([
  'students.read', 'students.write', 'school.settings', 'members.manage',
  'activities.read', 'activities.manage', 'activities.enrol', 'safeguarding.read',
  'safeguarding.write', 'ai.use', 'ai.decide', 'billing.read', 'billing.manage',
  'reports.read', 'compliance.read', 'compliance.manage', 'messages.read', 'messages.write',
  'security.read', 'analytics.read', 'analytics.student', 'analytics.configure', 'analytics.export',
])

const teaching: Permission[] = [
  'students.read', 'activities.read', 'activities.manage', 'ai.use', 'messages.read', 'messages.write',
]

const rolePermissions: Record<DisplayRole, Permission[]> = {
  director: [...all],
  deputy: [...all].filter(p => p !== 'platform.admin'),
  admin: [...all].filter(p => p !== 'platform.admin' && p !== 'safeguarding.write'),
  itadmin: ['students.read', 'members.manage', 'security.read', 'compliance.read', 'messages.read', 'reports.read', 'analytics.read'],
  teacher: [...teaching, 'analytics.read', 'analytics.student'],
  assistant: [...teaching, 'analytics.read'],
  instructor: ['students.read', 'activities.read', 'activities.manage', 'messages.read', 'analytics.read'],
  librarian: ['students.read', 'activities.read', 'messages.read', 'analytics.read'],
  finance: ['students.read', 'billing.read', 'billing.manage', 'reports.read', 'compliance.read', 'messages.read', 'analytics.read', 'analytics.export'],
  accountant: ['students.read', 'billing.read', 'billing.manage', 'reports.read', 'compliance.read', 'analytics.read', 'analytics.export'],
  hr: ['students.read', 'members.manage', 'reports.read', 'compliance.read', 'messages.read', 'analytics.read'],
  admissions: ['students.read', 'students.write', 'messages.read', 'messages.write'],
  reception: ['students.read', 'messages.read', 'messages.write', 'activities.read', 'analytics.read'],
  guardian: ['activities.read', 'activities.enrol', 'messages.read', 'messages.write', 'billing.read', 'analytics.read'],
  guardian2: ['activities.read', 'activities.enrol', 'messages.read', 'messages.write', 'billing.read', 'analytics.read'],
  parent: ['activities.read', 'activities.enrol', 'messages.read', 'messages.write', 'billing.read', 'analytics.read'],
  student: ['activities.read', 'activities.enrol', 'messages.read', 'messages.write', 'analytics.read'],
  provider: ['activities.read', 'activities.manage', 'messages.read'],
  safeguarding: ['students.read', 'safeguarding.read', 'safeguarding.write', 'compliance.read', 'messages.read', 'security.read', 'analytics.read'],
  therapist: ['students.read', 'safeguarding.read', 'messages.read'],
  nurse: ['students.read', 'safeguarding.read', 'messages.read'],
  auditor: ['students.read', 'compliance.read', 'reports.read', 'security.read', 'analytics.read', 'analytics.export'],
  operator: ['platform.admin', 'reports.read', 'compliance.read', 'security.read'],
  analyst: ['students.read', 'reports.read', 'analytics.read', 'analytics.student', 'analytics.export', 'messages.read'],
}

export function permissionsFor(role: DisplayRole | string | undefined): Permission[] {
  if (!role) return []
  return rolePermissions[toDisplayRole(role) as DisplayRole] ?? []
}

export function can(role: DisplayRole | string | undefined, permission: Permission): boolean {
  return permissionsFor(role).includes(permission)
}

export const ROLE_ACCENT: Record<DisplayRole, string> = {
  director: 'admin', deputy: 'admin', admin: 'admin', itadmin: 'admin',
  teacher: 'teacher', assistant: 'teacher', instructor: 'teacher', librarian: 'teacher',
  guardian: 'parent', guardian2: 'parent', parent: 'parent', student: 'student',
  finance: 'finance', accountant: 'finance', admissions: 'admin', reception: 'admin',
  provider: 'teacher', safeguarding: 'safeguarding', therapist: 'safeguarding', nurse: 'safeguarding',
  auditor: 'safeguarding', hr: 'admin', operator: 'operator', analyst: 'admin',
}

export const ROLE_FAMILY: Record<DisplayRole, 'school' | 'teaching' | 'family' | 'restricted' | 'platform'> = {
  director: 'school', deputy: 'school', admin: 'school', itadmin: 'school', admissions: 'school',
  reception: 'school', hr: 'school',
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
}

const API_TO_DISPLAY: Record<string, DisplayRole> = {
  PLATFORM_ADMIN: 'operator', OPERATOR: 'operator', OWNER: 'operator',
  GROUP_ADMIN: 'director', DIRECTOR: 'director',
  ADMIN: 'admin', SCHOOL_ADMIN: 'admin', IT_ADMIN: 'itadmin',
  DEPUTY: 'deputy', VIE_SCOLAIRE: 'deputy',
  TEACHER: 'teacher', INSTRUCTOR: 'teacher', LIBRARIAN: 'librarian',
  ASSISTANT: 'assistant',
  SAFEGUARDING: 'safeguarding', AUDITOR: 'auditor', INSPECTOR: 'auditor',
  NURSE: 'nurse', HEALTH: 'nurse', THERAPIST: 'therapist',
  FINANCE: 'finance', BURSAR: 'finance', ACCOUNTANT: 'accountant', HR: 'hr',
  RECEPTION: 'reception', RECEPTIONIST: 'reception',
  GUARDIAN: 'parent', PARENT: 'parent', STUDENT: 'student',
  ADMISSIONS: 'admissions', PROVIDER: 'provider',
  ANALYST: 'analyst', DATA_ANALYST: 'analyst',
}

/**
 * The BFF returns canonical API roles; screens and navigation use display roles.
 * Already-display values pass through so mock data and older links keep working.
 */
export function toDisplayRole(role: string | undefined | null): DisplayRole | undefined {
  if (!role) return undefined
  const raw = role.trim()
  const direct = API_TO_DISPLAY[raw.toUpperCase().replace(/^ROLE_/, '')]
  if (direct) return direct
  const lower = raw.toLowerCase()
  return (DISPLAY_ROLES as readonly string[]).includes(lower) ? lower as DisplayRole : undefined
}
