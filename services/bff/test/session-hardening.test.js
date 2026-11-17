import test from 'node:test'
import assert from 'node:assert/strict'
import { makeTestApp } from './helpers.js'

test('session cookie is opaque, HttpOnly, SameSite=Lax and Secure with __Host- in TLS mode', async () => {
  const app = await makeTestApp({
    secureCookies: true,
    cookieName: '__Host-schoolos_session',
    csrfCookieName: '__Host-schoolos_csrf',
  })
  try {
    const { res } = await app.login('teacher-parttime')
    const cookies = res.headers.getSetCookie()
    const session = cookies.find(c => c.startsWith('__Host-schoolos_session='))
    assert.ok(session, 'session cookie present')
    assert.match(session, /HttpOnly/)
    assert.match(session, /Secure/)
    assert.match(session, /SameSite=Lax/)
    assert.match(session, /Path=\//)
    assert.doesNotMatch(session, /Domain=/)
    // The cookie value is a random opaque id, not a signed JSON payload.
    const value = session.split(';')[0].split('=')[1]
    assert.ok(value.length >= 40)
    assert.equal(value.includes('.'), false)
  } finally {
    await app.close()
  }
})

test('a tampered or unknown session id is rejected', async () => {
  const app = await makeTestApp()
  try {
    const { cookie } = await app.login('teacher-parttime')
    const tampered = cookie.replace(/schoolos_session=([^;]+)/, (_, v) => `schoolos_session=${v.slice(0, -2)}xx`)
    const res = await fetch(`${app.base}/session`, { headers: { cookie: tampered } })
    assert.equal(res.status, 401)
  } finally {
    await app.close()
  }
})

test('logout revokes the server-side session immediately', async () => {
  const app = await makeTestApp()
  try {
    const { cookie, csrf } = await app.login('teacher-parttime')
    assert.equal((await fetch(`${app.base}/session`, { headers: { cookie } })).status, 200)
    const out = await app.post('/auth/logout', {}, { cookie, csrf })
    assert.equal(out.status, 204)
    assert.equal((await fetch(`${app.base}/session`, { headers: { cookie } })).status, 401)
  } finally {
    await app.close()
  }
})

test('idle timeout invalidates the session without waiting for the cookie to expire', async () => {
  const app = await makeTestApp({ idleTimeoutSeconds: 1 })
  try {
    const { cookie } = await app.login('teacher-parttime')
    const store = app.app.store
    const sid = decodeURIComponent(cookie.match(/schoolos_session=([^;]+)/)[1])
    const record = await store.get(`sess:${sid}`)
    record.idleExpiresAt = Date.now() - 1
    await store.put(`sess:${sid}`, record)
    assert.equal((await fetch(`${app.base}/session`, { headers: { cookie } })).status, 401)
    assert.equal(await store.get(`sess:${sid}`), null)
  } finally {
    await app.close()
  }
})

test('absolute timeout cannot be extended by activity', async () => {
  const app = await makeTestApp()
  try {
    const { cookie } = await app.login('teacher-parttime')
    const store = app.app.store
    const sid = decodeURIComponent(cookie.match(/schoolos_session=([^;]+)/)[1])
    const record = await store.get(`sess:${sid}`)
    record.absoluteExpiresAt = Date.now() - 1
    await store.put(`sess:${sid}`, record)
    assert.equal((await fetch(`${app.base}/session`, { headers: { cookie } })).status, 401)
  } finally {
    await app.close()
  }
})

test('sign out everywhere revokes other sessions but keeps the current one', async () => {
  const app = await makeTestApp({ maxPrivilegedSessions: 10 })
  try {
    const first = await app.login('director')
    const second = await app.login('director')
    // Director is privileged and capped at 10, so both sessions stay alive.
    assert.equal((await fetch(`${app.base}/session`, { headers: { cookie: first.cookie } })).status, 200)
    const res = await app.post('/auth/logout-all', {}, { cookie: second.cookie, csrf: second.csrf })
    assert.equal(res.status, 200)
    assert.equal((await fetch(`${app.base}/session`, { headers: { cookie: first.cookie } })).status, 401)
    assert.equal((await fetch(`${app.base}/session`, { headers: { cookie: second.cookie } })).status, 200)
  } finally {
    await app.close()
  }
})

test('privileged concurrent sessions are capped', async () => {
  const app = await makeTestApp({ maxPrivilegedSessions: 2 })
  try {
    const first = await app.login('director')
    await app.login('director')
    await app.login('director')
    assert.equal((await fetch(`${app.base}/session`, { headers: { cookie: first.cookie } })).status, 401)
  } finally {
    await app.close()
  }
})
