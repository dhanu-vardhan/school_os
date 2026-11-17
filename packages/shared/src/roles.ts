export const DISPLAY_ROLES = [
  'director', 'deputy', 'admin', 'teacher', 'assistant', 'instructor', 'finance',
  'accountant', 'admissions', 'reception', 'guardian', 'guardian2', 'parent', 'student',
  'provider', 'safeguarding', 'therapist', 'operator',
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
  | 'platform.admin'

const all = new Set<Permission>([
  'students.read', 'students.write', 'school.settings', 'members.manage',
  'activities.read', 'activities.manage', 'activities.enrol', 'safeguarding.read',
  'safeguarding.write', 'ai.use', 'ai.decide', 'billing.read', 'billing.manage',
  'reports.read', 'compliance.read', 'compliance.manage', 'messages.read', 'messages.write',
])

const teaching: Permission[] = [
  'students.read', 'activities.read', 'activities.manage', 'ai.use', 'messages.read', 'messages.write',
]

const rolePermissions: Record<DisplayRole, Permission[]> = {
  director: [...all],
  deputy: [...all].filter(p => p !== 'platform.admin'),
  admin: [...all].filter(p => p !== 'platform.admin' && p !== 'safeguarding.write'),
  teacher: teaching,
  assistant: [...teaching],
  instructor: ['students.read', 'activities.read', 'activities.manage', 'messages.read'],
  finance: ['students.read', 'billing.read', 'billing.manage', 'reports.read', 'compliance.read', 'messages.read'],
  accountant: ['students.read', 'billing.read', 'billing.manage', 'reports.read', 'compliance.read'],
  admissions: ['students.read', 'students.write', 'messages.read', 'messages.write'],
  reception: ['students.read', 'messages.read', 'messages.write', 'activities.read'],
  guardian: ['activities.read', 'activities.enrol', 'messages.read', 'messages.write', 'billing.read'],
  guardian2: ['activities.read', 'activities.enrol', 'messages.read', 'messages.write', 'billing.read'],
  parent: ['activities.read', 'activities.enrol', 'messages.read', 'messages.write', 'billing.read'],
  student: ['activities.read', 'activities.enrol', 'messages.read', 'messages.write'],
  provider: ['activities.read', 'activities.manage', 'messages.read'],
  safeguarding: ['students.read', 'safeguarding.read', 'safeguarding.write', 'compliance.read', 'messages.read'],
  therapist: ['students.read', 'safeguarding.read', 'messages.read'],
  operator: ['platform.admin', 'reports.read', 'compliance.read'],
}

export function permissionsFor(role: DisplayRole | string | undefined): Permission[] {
  if (!role) return []
  return rolePermissions[role as DisplayRole] ?? []
}

export function can(role: DisplayRole | string | undefined, permission: Permission): boolean {
  return permissionsFor(role).includes(permission)
}

export const ROLE_ACCENT: Record<DisplayRole, string> = {
  director: 'admin', deputy: 'admin', admin: 'admin',
  teacher: 'teacher', assistant: 'teacher', instructor: 'teacher',
  guardian: 'parent', guardian2: 'parent', parent: 'parent', student: 'student',
  finance: 'finance', accountant: 'finance', admissions: 'admin', reception: 'admin',
  provider: 'teacher', safeguarding: 'safeguarding', therapist: 'safeguarding',
  operator: 'operator',
}

export const ROLE_FAMILY: Record<DisplayRole, 'school' | 'teaching' | 'family' | 'restricted' | 'platform'> = {
  director: 'school', deputy: 'school', admin: 'school', admissions: 'school', reception: 'school',
  teacher: 'teaching', assistant: 'teaching', instructor: 'teaching', provider: 'teaching',
  guardian: 'family', guardian2: 'family', parent: 'family', student: 'family',
  finance: 'school', accountant: 'school',
  safeguarding: 'restricted', therapist: 'restricted',
  operator: 'platform',
}

/** Map a display role onto the nearest backend SchoolRole claim for display parity. */
export const API_ROLE: Record<DisplayRole, string> = {
  director: 'DIRECTOR', deputy: 'ADMIN', admin: 'ADMIN', admissions: 'ADMIN', reception: 'ADMIN',
  teacher: 'TEACHER', assistant: 'ASSISTANT', instructor: 'TEACHER', provider: 'TEACHER',
  guardian: 'PARENT', guardian2: 'PARENT', parent: 'PARENT', student: 'STUDENT',
  finance: 'ACCOUNTANT', accountant: 'ACCOUNTANT',
  safeguarding: 'THERAPIST', therapist: 'THERAPIST', operator: 'OWNER',
}
