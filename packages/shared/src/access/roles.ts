export type SchoolRole =
  | 'super-admin' | 'group-admin' | 'school-admin' | 'principal' | 'deputy'
  | 'teacher' | 'parent' | 'student' | 'safeguarding-lead' | 'nurse'
  | 'finance' | 'hr' | 'it-admin' | 'librarian' | 'receptionist' | 'auditor'

export const DISPLAY_ROLE_TO_SCHOOL_ROLE: Record<string, SchoolRole> = {
  director: 'principal', deputy: 'deputy', admin: 'school-admin', itadmin: 'it-admin',
  teacher: 'teacher', assistant: 'teacher', instructor: 'teacher', librarian: 'librarian',
  finance: 'finance', accountant: 'finance', hr: 'hr', admissions: 'school-admin',
  reception: 'receptionist', guardian: 'parent', guardian2: 'parent', parent: 'parent',
  student: 'student', provider: 'teacher', safeguarding: 'safeguarding-lead',
  therapist: 'safeguarding-lead', nurse: 'nurse', auditor: 'auditor',
  operator: 'super-admin',
}
