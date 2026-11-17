import test from 'node:test'
import assert from 'node:assert/strict'
import { makeTestApp } from './helpers.js'

test('state-changing routes reject a missing CSRF header', async () => {
  const app = await makeTestApp()
  try {
    const { cookie } = await app.login('teacher-parttime')
    const res = await fetch(`${app.base}/auth/logout`, {
      method: 'POST', headers: { cookie, origin: app.origin },
    })
    assert.equal(res.status, 403)
    assert.equal((await res.json()).error, 'csrf_failed')
  } finally {
    await app.close()
  }
})

test('state-changing routes reject a mismatched CSRF token', async () => {
  const app = await makeTestApp()
  try {
    const { cookie, csrf } = await app.login('teacher-parttime')
    const res = await app.post('/auth/logout', {}, { cookie, csrf: `${csrf}x` })
    assert.equal(res.status, 403)
  } finally {
    await app.close()
  }
})

test('a disallowed Origin is rejected even with a valid CSRF token', async () => {
  const app = await makeTestApp()
  try {
    const { cookie, csrf } = await app.login('teacher-parttime')
    const res = await fetch(`${app.base}/auth/logout`, {
      method: 'POST',
      headers: { cookie, 'x-csrf-token': csrf, origin: 'https://evil.example' },
    })
    assert.equal(res.status, 403)
    assert.equal((await res.json()).error, 'csrf_failed')
  } finally {
    await app.close()
  }
})

test('valid double-submit token and Origin allow the mutation', async () => {
  const app = await makeTestApp()
  try {
    const { cookie, csrf } = await app.login('teacher-parttime')
    const res = await app.post('/auth/logout', {}, { cookie, csrf })
    assert.equal(res.status, 204)
  } finally {
    await app.close()
  }
})

test('demo session creation requires a same-origin request', async () => {
  const app = await makeTestApp()
  try {
    const res = await fetch(`${app.base}/demo/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'teacher-parttime', password: app.passwords['teacher-parttime'].password }),
    })
    assert.equal(res.status, 403)
  } finally {
    await app.close()
  }
})
