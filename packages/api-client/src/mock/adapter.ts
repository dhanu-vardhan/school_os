import { makeDemoData } from '@schoolos/shared'
import { bodyOf, getDb, matchId, mutateDb } from './db'
import type { Method, RequestSpec } from '../http'
import type { ApiResponse } from '../client'

const ok = <T>(data: T): ApiResponse<T> => ({ data, mock: true })

type Handler = (path: string, method: Method, body: any) => ApiResponse<any> | null

const routes: Array<[RegExp, Method[], Handler]> = [
  [/^\/config$/, ['GET'], () => ok({
    appName: 'SchoolOS', version: '0.0.1', defaultLocale: 'fr', locales: ['fr', 'en'],
    authMode: 'demo', demoEnabled: true, apiBasePath: '/api', timezone: 'Europe/Paris',
  })],
  [/^\/session$/, ['GET'], () => ok({ authenticated: false })],
  [/^\/demo\/users$/, ['GET'], () => ok({ users: getDb().users.map(({ role, name, schoolId, schoolName }) => ({ role, name, schoolId, schoolName })) })],
  [/^\/demo\/session$/, ['POST'], (_p, _m, body) => {
    const db = getDb()
    const user = db.users.find(u => u.role === body.role && (!body.schoolId || u.schoolId === body.schoolId)) ?? db.users[0]
    return ok({
      authenticated: true,
      user: { sub: user.sub, name: user.name, locale: 'fr', roles: [user.role], schoolId: body.schoolId ?? user.schoolId, demo: true },
      csrfToken: `mock-csrf-${user.role}`,
      expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
    })
  }],
  [/^\/auth\/logout$/, ['POST'], () => ok({ authenticated: false })],
  [/^\/auth\/csrf$/, ['GET'], () => ok({ csrfToken: 'mock-csrf' })],

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
  for (const [pattern, methods, handler] of routes) {
    if (!pattern.test(path) || !methods.includes(method)) continue
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
