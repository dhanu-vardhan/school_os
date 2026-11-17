/**
 * Canonical UI roles. The BFF emits API roles; `toDisplayRole()` maps them to display roles and
 * `displayToCanonical()` maps those to the 17 roles the UI knows how to lay out.
 * Runtime permission checks live in `../roles` (the shared root module) so there is one `can()`.
 */
import type { DisplayRole } from '../roles'

export type SchoolRole =
  | 'super-admin' | 'group-admin' | 'school-admin' | 'principal' | 'deputy'
  | 'teacher' | 'parent' | 'student' | 'safeguarding-lead' | 'nurse'
  | 'finance' | 'hr' | 'it-admin' | 'librarian' | 'receptionist' | 'auditor'
  | 'data-analyst'

export const DISPLAY_ROLE_TO_SCHOOL_ROLE: Record<string, SchoolRole> = {
  director: 'principal', deputy: 'deputy', admin: 'school-admin', itadmin: 'it-admin',
  teacher: 'teacher', assistant: 'teacher', instructor: 'teacher', librarian: 'librarian',
  finance: 'finance', accountant: 'finance', hr: 'hr', admissions: 'school-admin',
  reception: 'receptionist', guardian: 'parent', guardian2: 'parent', parent: 'parent',
  student: 'student', provider: 'teacher', safeguarding: 'safeguarding-lead',
  therapist: 'safeguarding-lead', nurse: 'nurse', auditor: 'auditor',
  operator: 'super-admin', analyst: 'data-analyst',
}

export const CANONICAL_ROLES = [
  'principal', 'school-admin', 'deputy', 'teacher', 'parent', 'student', 'finance', 'hr',
  'safeguarding-lead', 'nurse', 'it-admin', 'librarian', 'receptionist', 'auditor',
  'group-admin', 'super-admin', 'analyst',
] as const
export type CanonicalRole = typeof CANONICAL_ROLES[number]

const DISPLAY_TO_CANONICAL: Record<string, CanonicalRole> = {
  director: 'principal', admin: 'school-admin', admissions: 'school-admin', deputy: 'deputy',
  teacher: 'teacher', assistant: 'teacher', instructor: 'teacher', provider: 'teacher',
  guardian: 'parent', guardian2: 'parent', parent: 'parent', student: 'student',
  finance: 'finance', accountant: 'finance', hr: 'hr', safeguarding: 'safeguarding-lead',
  therapist: 'safeguarding-lead', nurse: 'nurse', itadmin: 'it-admin', librarian: 'librarian',
  reception: 'receptionist', auditor: 'auditor', operator: 'super-admin', analyst: 'analyst',
  'group-admin': 'group-admin', principal: 'principal', 'school-admin': 'school-admin',
  'super-admin': 'super-admin', 'safeguarding-lead': 'safeguarding-lead',
}

export function displayToCanonical(role: string | undefined | null): CanonicalRole | undefined {
  if (!role) return undefined
  const raw = role.trim().toLowerCase().replace(/^role_/, '')
  if ((CANONICAL_ROLES as readonly string[]).includes(raw)) return raw as CanonicalRole
  return DISPLAY_TO_CANONICAL[raw]
}

/** First recognised role in a multi-role session; an explicit context switch overrides this. */
export function canonicalRoleForUser(roles: string[] | undefined): CanonicalRole | undefined {
  for (const role of roles ?? []) {
    const canonical = displayToCanonical(role)
    if (canonical) return canonical
  }
  return undefined
}

export const CANONICAL_ROLE_LABEL_KEY: Record<CanonicalRole, string> = {
  principal: 'role.principal', 'school-admin': 'role.schoolAdmin', deputy: 'role.deputy',
  teacher: 'role.teacher', parent: 'role.parent', student: 'role.student', finance: 'role.finance',
  hr: 'role.hr', 'safeguarding-lead': 'role.safeguarding', nurse: 'role.nurse',
  'it-admin': 'role.itadmin', librarian: 'role.librarian', receptionist: 'role.reception',
  auditor: 'role.auditor', 'group-admin': 'role.groupAdmin', 'super-admin': 'role.operator',
  analyst: 'role.analyst',
}

/** Display role used for legacy widgets that still key off the old union. */
export function canonicalToDisplay(role: CanonicalRole): DisplayRole {
  const map: Record<CanonicalRole, DisplayRole> = {
    principal: 'director', 'school-admin': 'admin', deputy: 'deputy', teacher: 'teacher',
    parent: 'parent', student: 'student', finance: 'finance', hr: 'hr',
    'safeguarding-lead': 'safeguarding', nurse: 'nurse', 'it-admin': 'itadmin',
    librarian: 'librarian', receptionist: 'reception', auditor: 'auditor',
    'group-admin': 'director', 'super-admin': 'operator', analyst: 'analyst',
  }
  return map[role]
}
