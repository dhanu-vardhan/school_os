import { describe, expect, it } from 'vitest'
import {
  USE_MOCK, demoLogin, getSession, listStudents, logout, sessionStore,
} from '@schoolos/api-client'

describe('mock API adapter', () => {
  it('is enabled by default for the frontend build', () => {
    expect(USE_MOCK).toBe(true)
  })

  it('marks mock responses and returns seeded students', async () => {
    const res = await listStudents()
    expect(res.mock).toBe(true)
    expect(res.data.length).toBeGreaterThan(0)
    expect(res.data[0]).toHaveProperty('id')
  })

  it('keeps the demo session in the client store', async () => {
    expect((await getSession()).data.authenticated).toBe(false)
    await demoLogin('director')
    expect(sessionStore.get().authenticated).toBe(true)
    expect((await getSession()).data.authenticated).toBe(true)
    expect(sessionStore.user?.roles).toContain('director')
    await logout()
    expect((await getSession()).data.authenticated).toBe(false)
  })

  it('never requires a client-supplied tenant id', async () => {
    await demoLogin('teacher', 'school-1')
    expect(sessionStore.user?.schoolId).toBe('school-1')
    // The client sends no X-School-Id header; the BFF derives the tenant from the session.
    expect(Object.keys(sessionStore.get())).not.toContain('schoolId')
  })
})
