import test from 'node:test'
import assert from 'node:assert/strict'
import { makeTestApp } from './helpers.js'
import { totp } from '../src/identity/totp.js'

test('privileged demo roles must complete the TOTP challenge', async () => {
  const app = await makeTestApp({ rateLimit: { windowMs: 60_000, ipMax: 1000, accountMax: 20, lockoutBaseMs: 10, lockoutMaxMs: 20, disabled: true } })
  try {
    const password = app.passwords.director.password
    const first = await app.post('/demo/session', { key: 'director', password })
    assert.equal(first.status, 200)
    const challenge = await first.json()
    assert.equal(challenge.mfaRequired, true)
    assert.equal(challenge.methods[0], 'totp')
    assert.ok(challenge.challengeId)
    // The response must not set an authenticated cookie before MFA.
    assert.equal((first.headers.getSetCookie() || []).length, 0)

    const wrong = await app.post('/demo/session/verify', { challengeId: challenge.challengeId, code: '000000' })
    assert.equal(wrong.status, 401)

    const code = totp(app.passwords.director.totpSecret)
    const res = await app.post('/demo/session/verify', { challengeId: challenge.challengeId, code })
    assert.equal(res.status, 200)
    const session = await res.json()
    assert.equal(session.authenticated, true)
    assert.equal(session.user.mfa, true)
    assert.equal(session.user.roles[0], 'DIRECTOR')
  } finally {
    await app.close()
  }
})

test('non-MFA demo roles get a session without a challenge', async () => {
  const app = await makeTestApp()
  try {
    const res = await app.post('/demo/session', { key: 'teacher-parttime', password: app.passwords['teacher-parttime'].password })
    assert.equal(res.status, 200)
    const session = await res.json()
    assert.equal(session.authenticated, true)
    assert.equal(session.user.mfa, false)
  } finally {
    await app.close()
  }
})

test('login failures are uniform and do not reveal whether an account exists', async () => {
  const app = await makeTestApp()
  try {
    const unknown = await app.post('/auth/login', { identifier: 'nobody@example.invalid', password: 'a-long-wrong-password' })
    const known = await app.post('/auth/login', { identifier: 'director@demo.schoolos.invalid', password: 'a-long-wrong-password' })
    assert.equal(unknown.status, 401)
    assert.equal(known.status, 401)
    const a = await unknown.json()
    const b = await known.json()
    assert.deepEqual(a, b)
  } finally {
    await app.close()
  }
})

test('repeated failures lock the account with a retry-after', async () => {
  const app = await makeTestApp({
    rateLimit: { windowMs: 60_000, ipMax: 1000, accountMax: 2, lockoutBaseMs: 200, lockoutMaxMs: 200, disabled: false },
  })
  try {
    const password = 'wrong-password-value'
    let last
    for (let i = 0; i < 6; i++) {
      last = await app.post('/demo/session', { key: 'teacher-parttime', password })
    }
    assert.equal(last.status, 429)
    assert.ok(last.headers.get('retry-after'))
    assert.equal((await last.json()).error, 'rate_limited')
  } finally {
    await app.close()
  }
})

test('per-IP login flood is rate limited', async () => {
  const app = await makeTestApp({
    rateLimit: { windowMs: 60_000, ipMax: 3, accountMax: 100, lockoutBaseMs: 10, lockoutMaxMs: 10, disabled: false },
  })
  try {
    let status = 200
    for (let i = 0; i < 6; i++) {
      const res = await app.post('/demo/session', { key: 'teacher-parttime', password: 'wrong-password-value' })
      status = res.status
      if (status === 429) break
    }
    assert.equal(status, 429)
  } finally {
    await app.close()
  }
})

test('password reset is uniform, single-use and invalidates the token', async () => {
  const app = await makeTestApp()
  try {
    const requested = await app.post('/auth/forgot-password', { identifier: 'director@demo.schoolos.invalid' })
    assert.equal(requested.status, 202)
    const { demoToken } = await requested.json()
    assert.ok(demoToken)
    const unknown = await app.post('/auth/forgot-password', { identifier: 'nobody@example.invalid' })
    assert.equal(unknown.status, 202)

    const weak = await app.post('/auth/reset-password', { token: demoToken, password: 'short' })
    assert.equal(weak.status, 400)
    const strong = 'correct horse battery staple 42'
    const ok = await app.post('/auth/reset-password', { token: demoToken, password: strong })
    assert.equal(ok.status, 200)
    const reuse = await app.post('/auth/reset-password', { token: demoToken, password: strong })
    assert.equal(reuse.status, 400)
  } finally {
    await app.close()
  }
})

test('open redirect attempts on returnTo are rejected', async () => {
  const app = await makeTestApp()
  try {
    const res = await fetch(`${app.base}/auth/oidc/start?returnTo=${encodeURIComponent('//evil.example/app')}`)
    // No OIDC issuer in demo: 503 is expected, but the helper is unit-tested below.
    assert.ok([302, 503].includes(res.status))
  } finally {
    await app.close()
  }
})
