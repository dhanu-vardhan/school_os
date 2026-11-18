import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import {
  canAccess, findRoute, landingRouteFor, routeAccess, ROUTE_REGISTRY, safeReturnTo,
} from '@schoolos/shared'
import { demoLogin, sessionStore } from '@schoolos/api-client'
import { clearSessionCaches } from '../access'
import App from '../App'
import { renderApp } from './utils'

const SCHOOL = 'school-a'

describe('access registry — role x route matrix', () => {
  const matrix: [role: string, path: string, expected: string][] = [
    ['director', '/app/people/students', 'ok'],
    ['teacher', '/app/people/students', 'ok'],
    ['parent', '/app/people/students', 'permission'],
    ['student', '/app/people/students', 'permission'],
    ['provider', '/app/analytics', 'permission'],
    ['teacher', '/app/analytics', 'ok'],
    ['director', '/app/platform/flags', 'permission'],
    ['operator', '/app/platform/flags', 'ok'],
    ['teacher', '/app/security', 'permission'],
    ['director', '/app/security', 'ok'],
    ['parent', '/app/attendance', 'permission'],
    ['teacher', '/app/attendance', 'ok'],
    ['director', '/app/safeguarding', 'ok'],
    ['finance', '/app/safeguarding', 'permission'],
    ['nurse', '/app/health', 'ok'],
    ['parent', '/app/health', 'permission'],
    ['auditor', '/app/compliance/audit', 'ok'],
    ['teacher', '/app/compliance/audit', 'permission'],
    ['group-admin', '/group', 'ok'],
    ['teacher', '/group', 'role'],
  ]

  it.each(matrix)('%s at %s -> %s', (role, path, expected) => {
    const entry = findRoute(path)
    expect(entry).toBeDefined()
    expect(routeAccess(entry, { role, schoolId: SCHOOL })).toBe(expected)
  })

  it('every canonical landing exists and is reachable by its own role', () => {
    const roles = [
      'principal', 'school-admin', 'deputy', 'teacher', 'parent', 'student', 'finance', 'hr',
      'safeguarding-lead', 'nurse', 'it-admin', 'librarian', 'receptionist', 'auditor',
      'group-admin', 'super-admin', 'analyst',
    ]
    for (const role of roles) {
      const landing = landingRouteFor(role)
      expect(findRoute(landing), `landing ${landing} must be registered`).toBeDefined()
      expect(routeAccess(findRoute(landing), { role, schoolId: SCHOOL }), `${role} at ${landing}`).toBe('ok')
    }
  })

  it('every registry entry has a title key and is deny-by-default', () => {
    for (const entry of ROUTE_REGISTRY) {
      expect(entry.titleKey, `${entry.path} needs a title key`).toBeTruthy()
    }
    expect(findRoute('/app/definitely/not/a/route')).toBeUndefined()
    expect(routeAccess(undefined, { role: 'operator', schoolId: SCHOOL })).toBe('role')
  })
})

describe('safe redirects and landing resolution', () => {
  it('rejects open-redirect vectors and unpermitted targets', () => {
    expect(safeReturnTo('https://evil.example')).toBeNull()
    expect(safeReturnTo('//evil.example')).toBeNull()
    expect(safeReturnTo('/\\evil.example')).toBeNull()
    expect(safeReturnTo('javascript:alert(1)')).toBeNull()
    expect(safeReturnTo('data:text/html,x')).toBeNull()
    expect(safeReturnTo('/unknown')).toBeNull()
    expect(safeReturnTo('/app/timetable')).toBe('/app/timetable')
    expect(safeReturnTo('/app/people/students/stu-1')).toBe('/app/people/students/stu-1')
    expect(safeReturnTo('/app/platform/flags', { role: 'director', schoolId: SCHOOL })).toBeNull()
    expect(safeReturnTo('/app/platform/flags', { role: 'operator', schoolId: SCHOOL })).toBe('/app/platform/flags')
  })

  it('resolves multi-role landings without merging permissions', () => {
    expect(landingRouteFor(['teacher', 'parent'])).toBe('/teacher')
    expect(landingRouteFor(['teacher', 'parent'], 'parent')).toBe('/family')
    expect(landingRouteFor([])).toBe('/app/dashboard')
  })

  it('resolves legacy aliases through the registry', () => {
    expect(findRoute('/home')?.path).toBe('/app/dashboard')
    expect(findRoute('/students')?.path).toBe('/app/people/students')
  })
})

describe('object-scoped access and step-up', () => {
  it('scopes checks by school, class and child', () => {
    const teacher = { role: 'teacher', schoolId: 'a', classIds: ['c1'] }
    expect(canAccess(teacher, 'attendance.record', { classId: 'c1' })).toBe(true)
    expect(canAccess(teacher, 'attendance.record', { classId: 'c2' })).toBe(false)
    expect(canAccess(teacher, 'students.read', { schoolId: 'b' })).toBe(false)
    const parent = { role: 'parent', childIds: ['child-1'] }
    expect(canAccess(parent, 'messages.read', { childId: 'child-2' })).toBe(false)
  })

  it('gates sensitive detail routes on step-up and impersonation', () => {
    const entry = findRoute('/app/safeguarding/SC-1')
    expect(routeAccess(entry, { role: 'director', schoolId: SCHOOL })).toBe('stepup')
    expect(routeAccess(entry, { role: 'director', schoolId: SCHOOL, stepUpActive: true })).toBe('ok')
    expect(routeAccess(entry, { role: 'director', schoolId: SCHOOL, stepUpActive: true, impersonating: true })).toBe('impersonation')
  })

  it('hides flag-gated routes when the flag is off', () => {
    const entry = findRoute('/app/soon/library')
    expect(routeAccess(entry, { role: 'teacher', schoolId: SCHOOL, featureFlags: {} })).toBe('flag')
    expect(routeAccess(entry, { role: 'teacher', schoolId: SCHOOL, featureFlags: { SHOW_COMING_SOON: true } })).toBe('ok')
  })
})

describe('cache hygiene', () => {
  it('clears the query cache and local widget state', () => {
    const client = new QueryClient()
    client.setQueryData(['session'], { authenticated: true })
    localStorage.setItem('schoolos.ui.widget.parent', '{}')
    clearSessionCaches(client)
    expect(client.getQueryData(['session'])).toBeUndefined()
    expect(localStorage.getItem('schoolos.ui.widget.parent')).toBeNull()
  })
})

describe('guards in the shell', () => {
  it('sends unauthenticated users to login with a safe returnTo', async () => {
    sessionStore.set({ authenticated: false })
    renderApp(<App />, { route: '/app/people/students?filter=all' })
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bon retour !' })).toBeInTheDocument())
  })

  it('shows the branded 403 without flashing protected content', async () => {
    await demoLogin('guardian')
    await waitFor(() => expect(sessionStore.user?.roles).toContain('parent'))
    renderApp(<App />, { route: '/app/people/students' })
    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
    expect(screen.queryByText(/Léa Martin/)).not.toBeInTheDocument()
  })

  it('keeps the user in the shell when following a deep link without access', async () => {
    await demoLogin('guardian')
    await waitFor(() => expect(sessionStore.user?.roles).toContain('parent'))
    renderApp(<App />, { route: '/app/platform/flags' })
    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Demander l’accès/ })).toBeInTheDocument()
  })
})
