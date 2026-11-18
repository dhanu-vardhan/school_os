import { API_ROLE, makeDemoData } from '@schoolos/shared'
import { bodyOf, getDb, matchId, mutateDb } from './db'
import { sessionStore } from '../session-store'
import { analyticsRequest } from './analytics'
import { familyRoutes } from './family'
import type { Method, RequestSpec } from '../http'
import type { ApiResponse } from '../client'

const ok = <T>(data: T): ApiResponse<T> => ({ data, mock: true })

const MFA_ROLES = new Set(['PLATFORM_ADMIN', 'GROUP_ADMIN', 'DIRECTOR', 'ADMIN', 'DEPUTY', 'SAFEGUARDING', 'NURSE', 'FINANCE', 'ACCOUNTANT', 'HR', 'IT_ADMIN', 'AUDITOR'])

// Mock-only, generated per process. Real demo credentials live only in the
// BFF's git-ignored .demo/credentials.json; no password constant is shipped.
const mockNonce = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
const MOCK_DEMO_PASSWORD = `mock-${mockNonce}`
const MOCK_DEMO_TOTP = `MOCK-${mockNonce.replace(/-/g, '').toUpperCase()}`

function demoUser(key: string, schoolId?: string) {
  const db = getDb()
  return db.users.find(u => u.role === key || u.sub === key || u.sub === `demo-${key}`)
    ?? db.users.find(u => !schoolId || u.schoolId === schoolId)
    ?? db.users[0]
}

function mockSession(user: NonNullable<ReturnType<typeof demoUser>>, schoolId?: string) {
  const db = getDb()
  const memberships = db.users
    .filter(u => u.name === user.name)
    .map(u => ({ schoolId: u.schoolId, schoolName: u.schoolName, role: API_ROLE[u.role as keyof typeof API_ROLE] ?? 'TEACHER' }))
  const unique = memberships.length ? memberships : [{ schoolId: user.schoolId, schoolName: user.schoolName, role: API_ROLE[user.role as keyof typeof API_ROLE] ?? 'TEACHER' }]
  const activeSchool = schoolId ?? user.schoolId
  const active = unique.find(m => m.schoolId === activeSchool)
    ?? (schoolId
      ? { schoolId, schoolName: user.schoolName, role: API_ROLE[user.role as keyof typeof API_ROLE] ?? 'TEACHER' }
      : unique[0])
  return {
    authenticated: true,
    user: {
      sub: user.sub, name: user.name, email: user.email, locale: 'fr',
      roles: [user.role], schoolId: active.schoolId, schoolName: active.schoolName,
      memberships: unique, demo: true, mfa: true, mfaRequired: false,
      stepUpUntil: Date.now() + 10 * 60_000,
    },
    csrfToken: `mock-csrf-${user.role}`,
    expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
    idleExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    authTime: new Date().toISOString(),
  }
}

function mockEvents(user: NonNullable<ReturnType<typeof demoUser>>) {
  return [
    { id: 'ev-1', at: new Date(Date.now() - 5 * 60_000).toISOString(), type: 'login.success', severity: 'info' as const, actorSub: user.sub },
    { id: 'ev-2', at: new Date(Date.now() - 20 * 60_000).toISOString(), type: 'mfa.success', severity: 'info' as const, actorSub: user.sub },
    { id: 'ev-3', at: new Date(Date.now() - 90 * 60_000).toISOString(), type: 'session.revoked', severity: 'warning' as const, actorSub: user.sub },
  ]
}

function mockActiveSession(user: NonNullable<ReturnType<typeof demoUser>>, schoolId?: string) {
  return {
    ...mockSession(user, schoolId),
    id: 'mock-session-current',
    current: true,
    lastSeen: new Date().toISOString(),
    fingerprint: 'mock-fingerprint',
  }
}

type Handler = (path: string, method: Method, body: any) => ApiResponse<any> | null

const routes: Array<[RegExp, Method[], Handler]> = [
  ...familyRoutes(),
  [/^\/config$/, ['GET'], () => ok({
    appName: 'SchoolOS', version: '0.0.1', defaultLocale: 'fr', locales: ['fr', 'en'],
    authMode: 'demo', demoEnabled: true, apiBasePath: '/api', timezone: 'Europe/Paris',
  })],
  [/^\/session$/, ['GET'], () => ok({ authenticated: false })],
  [/^\/demo\/accounts$/, ['GET'], () => {
    const db = getDb()
    const schools = Array.from(new Map(db.users.map(u => [u.schoolId, u.schoolName])), ([id, name]) => ({ id, name }))
    return ok({
      demoOnly: true,
      schools,
      accounts: db.users.map(u => {
        const apiRole = API_ROLE[u.role as keyof typeof API_ROLE] ?? 'TEACHER'
        return {
          key: u.role, name: u.name, email: u.email, role: apiRole, title: u.role, scope: u.schoolName,
          schoolId: u.schoolId, schoolName: u.schoolName,
          schools: schools.filter(s => s.id === u.schoolId), mfa: MFA_ROLES.has(apiRole),
          demoPassword: MOCK_DEMO_PASSWORD, demoTotpSecret: MFA_ROLES.has(apiRole) ? MOCK_DEMO_TOTP : null,
        }
      }),
    })
  }],
  [/^\/demo\/users$/, ['GET'], () => ok({ users: getDb().users.map(({ role, name, schoolId, schoolName }) => ({ role, name, schoolId, schoolName })) })],
  [/^\/demo\/session$/, ['POST'], (_p, _m, body) => {
    const user = demoUser(body?.key ?? body?.role, body?.schoolId)
    return ok(mockSession(user, body?.schoolId))
  }],
  [/^\/demo\/session\/verify$/, ['POST'], (_p, _m, body) => ok(mockSession(demoUser(String(body?.challengeId ?? '').split(':')[0] || 'director')))],
  [/^\/demo\/totp$/, ['GET'], () => ok({ code: String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0') })],
  [/^\/auth\/login$/, ['POST'], (_p, _m, body) => {
    const db = getDb()
    const user = db.users.find(u => u.email?.toLowerCase() === String(body?.identifier ?? '').toLowerCase())
      ?? db.users.find(u => u.role === body?.identifier)
    if (!user) {
      const err = new Error('Invalid credentials') as Error & { status?: number; code?: string }
      err.status = 401
      err.code = 'UNAUTHORIZED'
      throw err
    }
    return ok(mockSession(user))
  }],
  [/^\/auth\/logout$/, ['POST'], () => ok({ authenticated: false })],
  [/^\/auth\/logout-all$/, ['POST'], () => ok({ revoked: 1 })],
  [/^\/auth\/csrf$/, ['GET'], () => ok({ csrfToken: 'mock-csrf' })],
  [/^\/auth\/switch-school$/, ['POST'], (_p, _m, body) => {
    const user = getDb().users.find(u => u.schoolId === body?.schoolId) ?? getDb().users[0]
    return ok(mockSession(user, body?.schoolId))
  }],
  [/^\/auth\/mfa\/step-up$/, ['POST'], () => {
    // Step-up re-authenticates the *current* account; it must never swap the session identity.
    const current = sessionStore.get()
    if (!current.user) return ok(mockSession(getDb().users[0]))
    return ok({ ...current, user: { ...current.user, mfa: true, stepUpUntil: Date.now() + 10 * 60_000 } })
  }],
  [/^\/auth\/mfa\/enroll\/start$/, ['POST'], () => ok({
    secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/SchoolOS:demo?secret=JBSWY3DPEHPK3PXP&issuer=SchoolOS',
    backupCodes: ['1111-2222', '3333-4444', '5555-6666'],
  })],
  [/^\/auth\/mfa\/enroll\/verify$/, ['POST'], () => ok({ enrolled: true, mfa: true })],
  [/^\/account\/security$/, ['GET'], () => {
    const user = getDb().users[0]
    return ok({
      mfa: true, mfaRequired: false, trustedUntil: 0, stepUpActive: true,
      sessions: [mockActiveSession(user)], events: mockEvents(user),
    })
  }],
  [/^\/account\/security\/sessions$/, ['GET'], () => ok({ sessions: [mockActiveSession(getDb().users[0])] })],
  [/^\/account\/security\/sessions\/[^/]+\/revoke$/, ['POST'], () => ok({ revoked: true })],
  [/^\/account\/security\/events$/, ['GET'], () => ok({ events: mockEvents(getDb().users[0]) })],
  [/^\/security\/overview$/, ['GET'], () => {
    const user = getDb().users[0]
    return ok({
      loginSuccess: 12, loginFailure: 2, lockouts: 0, mfaEvents: 9,
      auditChain: { ok: true, length: 42 }, activeSessions: 3, lastEvents: mockEvents(user),
    })
  }],
  [/^\/security\/events$/, ['GET'], () => ok({ events: mockEvents(getDb().users[0]) })],
  [/^\/auth\/forgot-password$/, ['POST'], () => ok({ accepted: true, demoToken: 'mock-reset-token' })],
  [/^\/auth\/reset-password$/, ['POST'], () => ok({ reset: true })],
  [/^\/auth\/invitations\/accept$/, ['POST'], () => ok({ accepted: true, mfaEnrollmentRequired: true })],

  [/^\/v1\/students$/, ['GET'], () => ok(getDb().students)],
  [/^\/v1\/students$/, ['POST'], (_p, _m, body) => {
    const created: any = { id: `stu-${getDb().students.length + 1}-${Date.now().toString(36)}`, ...body, version: 1 }
    mutateDb(d => { d.students.unshift(created) })
    return ok(created)
  }],
  [/^\/v1\/students\/([^/]+)$/, ['GET', 'PATCH'], (path, method, body) => {
    const id = decodeURIComponent(path.split('/').pop()!)
    const student = getDb().students.find(s => s.id === id)
    if (!student) return notFound()
    if (method === 'PATCH') {
      let updated: any
      mutateDb(d => {
        const s = d.students.find(x => x.id === id)!
        Object.assign(s, body, { version: (s.version ?? 0) + 1 })
        updated = s
      })
      return ok(updated)
    }
    return ok(student)
  }],

  [/^\/v1\/schools$/, ['GET'], () => ok(getDb().schools)],
  [/^\/v1\/schools\/([^/]+)$/, ['GET', 'PATCH'], (path, method, body) => {
    const id = decodeURIComponent(path.split('/').pop()!)
    const school = getDb().schools.find(s => s.id === id) ?? getDb().schools[0]
    if (method === 'PATCH' && body?.name) {
      let updated: any
      mutateDb(d => {
        const s = d.schools.find(x => x.id === id) ?? d.schools[0]
        Object.assign(s, body)
        updated = s
      })
      return ok(updated)
    }
    return ok(school)
  }],

  [/^\/v1\/classes$/, ['GET'], () => ok(getDb().classes)],
  [/^\/v1\/guardians$/, ['GET'], () => ok(getDb().guardians)],
  [/^\/v1\/staff$/, ['GET'], () => ok(getDb().users.filter(u => !['guardian', 'guardian2', 'parent', 'student', 'provider'].includes(u.role)))],
  [/^\/v1\/members$/, ['GET'], () => ok(getDb().users.map((u, i) => ({
    id: `mem-${i}`, schoolId: u.schoolId, userSubject: u.sub, userEmail: u.email,
    name: u.name, role: u.role, status: 'active' as const,
  })))],
  [/^\/v1\/members$/, ['POST'], (_p, _m, body) => ok({ id: `mem-${Date.now()}`, ...body, status: 'invited' })],

  [/^\/v1\/activities$/, ['GET'], () => ok(getDb().activities)],
  [/^\/v1\/activities\/([^/]+)$/, ['GET'], (path) => {
    const id = decodeURIComponent(path.split('/').pop()!)
    return ok({ activity: getDb().activities.find(a => a.id === id), offering: getDb().offerings.find(o => o.activityId === id) })
  }],
  [/^\/v1\/offerings$/, ['GET'], () => ok(getDb().offerings)],
  [/^\/v1\/enrolments$/, ['POST'], (_p, _m, body) => {
    const offering = getDb().offerings.find(o => o.id === body?.offeringId)
    const waitlisted = !offering || offering.booked >= offering.capacity
    if (offering) mutateDb(d => {
      const o = d.offerings.find(x => x.id === offering.id)!
      if (waitlisted) o.waitlist += 1; else o.booked += 1
    })
    return ok({ status: waitlisted ? 'waitlisted' : 'confirmed', id: `enr-${Date.now()}` })
  }],
  [/^\/v1\/holidays$/, ['GET'], () => ok(getDb().holidays)],
  [/^\/v1\/timetable$/, ['GET'], () => ok(getDb().timetable)],
  [/^\/v1\/attendance$/, ['GET'], () => ok(getDb().attendance)],
  [/^\/v1\/attendance$/, ['PUT'], (_p, _m, body) => {
    const marks: Array<{ studentId: string; classId: string; date: string; status: string }> = body?.marks ?? []
    mutateDb(d => {
      for (const mark of marks) {
        const existing = d.attendance.find(a => a.studentId === mark.studentId && a.date === mark.date)
        if (existing) existing.status = mark.status as any
        else d.attendance.push({ id: `att-${mark.studentId}`, studentId: mark.studentId, classId: mark.classId, date: mark.date, status: mark.status as any })
      }
    })
    return ok({ saved: marks.length })
  }],

  [/^\/v1\/concerns$/, ['GET'], () => ok(getDb().concerns)],
  [/^\/v1\/concerns$/, ['POST'], (_p, _m, body) => {
    const created: any = {
      id: `sc-${Date.now()}`, reference: `SC-2026-${String(getDb().concerns.length + 15).padStart(3, '0')}`,
      category: body?.category ?? 'wellbeing', status: 'open',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      reportedByRole: body?.reportedByRole ?? 'safeguarding', subjectInitials: '—',
      summary: 'Concern record — content restricted to authorised roles.',
      events: [{ id: 'e-new', at: new Date().toISOString(), actorRole: body?.reportedByRole ?? 'safeguarding', action: 'Concern opened' }],
    }
    mutateDb(d => { d.concerns.unshift(created) })
    return ok({ id: created.id, reference: created.reference })
  }],
  [/^\/v1\/concerns\/([^/]+)$/, ['GET', 'PATCH'], (path, method, body) => {
    const id = decodeURIComponent(path.split('/').pop()!)
    const concern = getDb().concerns.find(c => c.id === id)
    if (!concern) return notFound()
    if (method === 'PATCH' && body?.status) {
      mutateDb(d => {
        const c = d.concerns.find(x => x.id === id)!
        c.status = body.status
        c.updatedAt = new Date().toISOString()
        c.events.push({ id: `e-${Date.now()}`, at: c.updatedAt, actorRole: 'safeguarding', action: `Status changed to ${body.status}` })
      })
      return ok(getDb().concerns.find(c => c.id === id))
    }
    return ok(concern)
  }],

  [/^\/v1\/suggestions$/, ['GET'], () => ok(getDb().suggestions)],
  [/^\/v1\/suggestions\/([^/]+)$/, ['PATCH'], (path, _m, body) => {
    const id = decodeURIComponent(path.split('/').pop()!)
    mutateDb(d => { const s = d.suggestions.find(x => x.id === id); if (s) s.status = body?.status })
    return ok(getDb().suggestions.find(s => s.id === id))
  }],
  [/^\/v1\/suggestions\/([^/]+)$/, ['POST'], (path, _m, body) => {
    const id = decodeURIComponent(path.split('/').pop()!)
    mutateDb(d => { const s = d.suggestions.find(x => x.id === id); if (s) Object.assign(s, body) })
    return ok(getDb().suggestions.find(s => s.id === id) ?? { id, ...body })
  }],

  [/^\/v1\/notifications$/, ['GET'], () => ok(getDb().notifications)],
  [/^\/v1\/notifications\/read-all$/, ['POST'], () => {
    mutateDb(d => { d.notifications.forEach(n => { n.read = true }) })
    return ok({ updated: true })
  }],
  [/^\/v1\/notifications\/([^/]+)$/, ['PATCH'], (path) => {
    const id = decodeURIComponent(path.split('/').pop()!)
    mutateDb(d => { const n = d.notifications.find(x => x.id === id); if (n) n.read = true })
    return ok(getDb().notifications.find(n => n.id === id))
  }],

  [/^\/v1\/messages$/, ['GET'], () => ok(getDb().messages)],
  [/^\/v1\/messages$/, ['POST'], (_p, _m, body) => {
    const created: any = { id: `msg-${Date.now()}`, ...body, at: new Date().toISOString(), read: false, replies: [] }
    mutateDb(d => { d.messages.unshift(created) })
    return ok(created)
  }],
  [/^\/v1\/announcements$/, ['GET'], () => ok(getDb().announcements)],
  [/^\/v1\/announcements$/, ['POST'], (_p, _m, body) => {
    const created: any = { id: `ann-${Date.now()}`, ...body, at: new Date().toISOString() }
    mutateDb(d => { d.announcements.unshift(created) })
    return ok(created)
  }],
  [/^\/v1\/invoices$/, ['GET'], () => ok(getDb().invoices)],
  [/^\/v1\/invoices\/([^/]+)\/mark-paid$/, ['POST'], (path) => {
    const id = decodeURIComponent(path.split('/')[3])
    mutateDb(d => { const i = d.invoices.find(x => x.id === id); if (i) i.status = 'paid' })
    return ok(getDb().invoices.find(i => i.id === id))
  }],

  [/^\/v1\/audit$/, ['GET'], () => ok(getDb().audit)],
  [/^\/v1\/retention$/, ['GET'], () => ok(getDb().retentionPolicies)],
  [/^\/v1\/consents$/, ['GET'], () => ok(getDb().consents)],
  [/^\/v1\/data-requests$/, ['GET'], () => ok(getDb().dataRequests)],
  [/^\/v1\/data-requests$/, ['POST'], (_p, _m, body) => {
    const created: any = { id: `dr-${Date.now()}`, ...body, requestedAt: new Date().toISOString().slice(0, 10), status: 'pending', dueAt: '2027-01-01' }
    mutateDb(d => { d.dataRequests.unshift(created) })
    return ok(created)
  }],

  [/^\/v1\/analytics\//, ['GET', 'POST', 'PATCH'], (path, method, body) => {
    const result = analyticsRequest(path, method, body)
    return result === null ? null : ok(result)
  }],

  [/^\/v1\/dashboard$/, ['GET'], () => ok(buildDashboard())],
  [/^\/v1\/reports$/, ['POST'], (_p, _m, body) => ok(buildReport(body))],
  [/^\/v1\/platform\/status$/, ['GET'], () => ok(platformStatus())],
  [/^\/v1\/platform\/flags$/, ['GET'], () => ok(platformFlags())],
  [/^\/v1\/platform\/integrations$/, ['GET'], () => ok(platformIntegrations())],
  [/^\/v1\/platform\/models$/, ['GET'], () => ok(platformModels())],
]

const notFound = () => { throw Object.assign(new Error('NOT_FOUND'), { status: 404, code: 'NOT_FOUND' }) }

export function mockRequest<T = any>(spec: RequestSpec): ApiResponse<T> {
  const { path, method, body } = spec
  // Query strings carry filters only; handlers still receive the full path to read them.
  const pathname = path.split('?')[0]
  for (const [pattern, methods, handler] of routes) {
    if (!pattern.test(pathname) || !methods.includes(method)) continue
    const result = handler(path, method, body)
    if (result) return result as ApiResponse<T>
  }
  throw Object.assign(new Error(`No mock handler for ${method} ${path}`), { status: 501, code: 'NOT_IMPLEMENTED' })
}

function buildDashboard() {
  const db = getDb()
  const present = db.students.filter(s => s.classId === 'c-cp').length
  return {
    kpis: {
      enrolment: db.students.length, attendanceRate: 94,
      openConcerns: db.concerns.filter(c => c.status !== 'closed').length,
      activityUptake: 68, aiPending: db.suggestions.filter(s => s.status === 'proposed').length,
      presentToday: present,
    },
    attendanceTrend: [
      { label: 'W44', value: 92 }, { label: 'W45', value: 94 }, { label: 'W46', value: 91 },
      { label: 'W47', value: 95 }, { label: 'W48', value: 94 },
    ],
    enrolmentByLevel: db.classes.map(c => ({ label: c.level, value: c.headcount })),
  }
}

function buildReport(body: Record<string, any>) {
  return {
    rows: getDb().classes.map(c => ({ label: c.name, value: c.headcount, secondary: c.attendanceToday })),
    metric: body?.metric ?? 'enrolment', groupBy: body?.groupBy ?? 'class',
  }
}

const platformStatus = () => ([
  { name: 'API', status: 'operational', latencyMs: 42 },
  { name: 'BFF session', status: 'operational', latencyMs: 12 },
  { name: 'PostgreSQL (RLS)', status: 'operational', latencyMs: 18 },
  { name: 'Object storage', status: 'degraded', latencyMs: 220 },
  { name: 'Notification sink', status: 'planned', latencyMs: 0 },
  { name: 'AI gateway', status: 'planned', latencyMs: 0 },
])
const platformFlags = () => ([
  { key: 'ai.suggestions', enabled: true, scope: 'school', rollout: 100 },
  { key: 'ai.ocr', enabled: false, scope: 'school', rollout: 0 },
  { key: 'activities.waitlist.auto', enabled: false, scope: 'school', rollout: 0 },
  { key: 'notifications.push', enabled: false, scope: 'platform', rollout: 0 },
  { key: 'billing.sepa', enabled: true, scope: 'school', rollout: 100 },
])
const platformIntegrations = () => ([
  { name: 'Keycloak', category: 'Identity', status: 'available', note: 'Realm imported on startup' },
  { name: 'MinIO', category: 'Storage', status: 'available', note: 'Private buckets, pre-signed URLs' },
  { name: 'Mailpit', category: 'Mail', status: 'available', note: 'Local sink only' },
  { name: 'ClamAV', category: 'Security', status: 'available', note: 'Upload scanning' },
  { name: 'Stripe sandbox', category: 'Payments', status: 'planned', note: 'PaymentGateway port not wired' },
  { name: 'Inference gateway', category: 'AI', status: 'planned', note: 'AiProvider port not wired' },
])
const platformModels = () => ([
  { id: 'local-draft-v1', task: 'Text drafting', tier: 'local', licence: 'self-hosted', languages: ['fr', 'en'], approved: true },
  { id: 'redaction-v1', task: 'PII redaction', tier: 'local', licence: 'self-hosted', languages: ['fr', 'en'], approved: true },
  { id: 'ocr-v1', task: 'OCR', tier: 'local', licence: 'unverified', languages: ['fr'], approved: false },
])

export { makeDemoData }
