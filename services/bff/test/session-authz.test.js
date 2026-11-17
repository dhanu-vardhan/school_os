import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { makeTestApp } from './helpers.js'
import { SCHOOL_A, SCHOOL_B } from '../src/identity/demo-accounts.js'

test('tenant switching only succeeds for an actual membership', async () => {
  const app = await makeTestApp()
  try {
    const parent = await app.login('parent')
    assert.equal(parent.json.user.memberships.length, 2)
    assert.equal(parent.json.user.schoolId, SCHOOL_A)

    const denied = await app.post('/auth/school', { schoolId: '99999999-9999-4999-8999-999999999999' }, { cookie: parent.cookie, csrf: parent.csrf })
    assert.equal(denied.status, 403)

    const switched = await app.post('/auth/school', { schoolId: SCHOOL_B }, { cookie: parent.cookie, csrf: parent.csrf })
    assert.equal(switched.status, 200)
    const next = await switched.json()
    assert.equal(next.user.schoolId, SCHOOL_B)
    assert.equal(next.user.schoolName.includes('Tilleuls'), true)
    // The old session id is gone, so a stolen pre-switch cookie cannot be reused.
    assert.equal((await fetch(`${app.base}/session`, { headers: { cookie: parent.cookie } })).status, 401)
  } finally {
    await app.close()
  }
})

test('an API proxy call never sends a client-supplied tenant header', async () => {
  let seen = {}
  const upstream = http.createServer((req, res) => {
    seen = req.headers
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ ok: true }))
  })
  await new Promise(r => upstream.listen(0, '127.0.0.1', r))
  const app = await makeTestApp({ apiBaseUrl: `http://127.0.0.1:${upstream.address().port}` })
  try {
    const { cookie } = await app.login('director')
    const res = await fetch(`${app.base}/api/v1/students`, {
      headers: { cookie, 'x-school-id': SCHOOL_B },
    })
    assert.equal(res.status, 200)
    assert.equal(seen['x-school-id'], undefined)
    const claims = JSON.parse(Buffer.from(seen.authorization.replace('Bearer ', '').split('.')[1], 'base64url').toString())
    assert.equal(claims.school_id, SCHOOL_A)
    assert.equal(claims.aud, 'schoolos-api')
  } finally {
    await app.close()
    upstream.close()
  }
})

test('step-up is required before exporting the security log', async () => {
  const app = await makeTestApp()
  try {
    const director = await app.login('director')
    const denied = await fetch(`${app.base}/account/security/export`, { headers: { cookie: director.cookie } })
    assert.equal(denied.status, 403)
    assert.equal((await denied.json()).error, 'step_up_required')

    const { totp } = await import('../src/identity/totp.js')
    const code = totp(app.passwords.director.totpSecret)
    const step = await app.post('/auth/mfa/step-up', { code }, { cookie: director.cookie, csrf: director.csrf })
    assert.equal(step.status, 200)

    const ok = await fetch(`${app.base}/account/security/export`, { headers: { cookie: director.cookie } })
    assert.equal(ok.status, 200)
    assert.match(ok.headers.get('content-disposition'), /attachment/)
  } finally {
    await app.close()
  }
})

test('step-up rejects a wrong code and does not extend the window', async () => {
  const app = await makeTestApp()
  try {
    const director = await app.login('director')
    const res = await app.post('/auth/mfa/step-up', { code: '000000' }, { cookie: director.cookie, csrf: director.csrf })
    assert.equal(res.status, 401)
    const denied = await fetch(`${app.base}/account/security/export`, { headers: { cookie: director.cookie } })
    assert.equal(denied.status, 403)
  } finally {
    await app.close()
  }
})

test('parents see only their own sessions and cannot revoke another user session', async () => {
  const app = await makeTestApp()
  try {
    const parent = await app.login('parent')
    const director = await app.login('director')
    const directorSid = decodeURIComponent(director.cookie.split('=')[1])
    const res = await app.post(`/account/security/sessions/${directorSid}/revoke`, {}, { cookie: parent.cookie, csrf: parent.csrf })
    assert.equal(res.status, 404)
  } finally {
    await app.close()
  }
})

test('impersonation requires step-up, a reason and forbids sensitive routes', async () => {
  const app = await makeTestApp()
  try {
    const admin = await app.login('super-admin')
    const noStep = await app.post('/admin/impersonate', { key: 'teacher', reason: 'support investigation' }, { cookie: admin.cookie, csrf: admin.csrf })
    assert.equal(noStep.status, 403)

    const { totp } = await import('../src/identity/totp.js')
    const code = totp(app.passwords['super-admin'].totpSecret)
    await app.post('/auth/mfa/step-up', { code }, { cookie: admin.cookie, csrf: admin.csrf })

    const noReason = await app.post('/admin/impersonate', { key: 'teacher' }, { cookie: admin.cookie, csrf: admin.csrf })
    assert.equal(noReason.status, 400)
    const res = await app.post('/admin/impersonate', {
      key: 'teacher', reason: 'Ticket #42 — reproduce timetable issue', minutes: 10,
    }, { cookie: admin.cookie, csrf: admin.csrf })
    assert.equal(res.status, 200)
    const session = await res.json()
    assert.ok(session.user.impersonating)
    const cookie = app.cookieHeaderFrom(res)
    const blocked = await fetch(`${app.base}/api/v1/concerns`, { headers: { cookie } })
    assert.equal(blocked.status, 403)
  } finally {
    await app.close()
  }
})
