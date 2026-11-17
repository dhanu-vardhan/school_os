import type { DisplayRole } from '../roles'

export function landingRouteFor(role: DisplayRole | string | undefined): string {
  switch (role) {
    case 'guardian':
    case 'guardian2':
    case 'parent': return '/parent'
    case 'student': return '/student'
    case 'teacher':
    case 'assistant':
    case 'instructor': return '/teacher'
    case 'finance':
    case 'accountant': return '/finance'
    case 'hr': return '/hr'
    case 'safeguarding': return '/safeguarding'
    case 'nurse': return '/health'
    case 'itadmin': return '/it'
    case 'librarian': return '/library'
    case 'reception': return '/front-office'
    case 'auditor': return '/audit'
    case 'operator': return '/platform'
    default: return '/app/dashboard'
  }
}