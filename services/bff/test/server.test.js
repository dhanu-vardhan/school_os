import test from 'node:test'
import assert from 'node:assert/strict'
import { makeTestApp, testConfig, tmpDist, listen } from './helpers.js'
import { createApp } from '../src/server.js'

test('static document, JS and CSS return 200 with correct content types and security headers', async () => {
  const app = await makeTestApp()
  try {
    const doc = await fetch(`${app.base}/`)
    assert.equal(doc.status, 200)
    assert.match(doc.headers.get('content-type'), /text\/html/)
    assert.equal(doc.headers.get('x-frame-options'), 'DENY')
    assert.equal(doc.headers.get('cache-control'), 'no-store')
    assert.match(doc.headers.get('content-security-policy'), /frame-ancestors 'none'/)
    assert.match(doc.headers.get('content-security-policy'), /script-src 'self'/)
    assert.match(await doc.text(), /id="root"/)

    const js = await fetch(`${app.base}/assets/app.js`)
    assert.equal(js.status, 200)
    assert.match(js.headers.get('content-type'), /javascript/)

    const css = await fetch(`${app.base}/assets/app.css`)
    assert.equal(css.status, 200)
    assert.match(css.headers.get('content-type'), /text\/css/)

    assert.equal((await fetch(`${app.base}/assets/missing.css`)).status, 404)
  } finally {
    await app.close()
  }
})

test('SPA routes fall back to index.html', async () => {
  const app = await makeTestApp()
  try {
    assert.equal((await fetch(`${app.base}/classes`)).status, 200)
    assert.equal((await fetch(`${app.base}/favicon.ico`)).status, 404)
  } finally {
    await app.close()
  }
})

test('config, healthz and session bootstrap', async () => {
  const app = await makeTestApp()
  try {
    const health = await (await fetch(`${app.base}/healthz`)).json()
    assert.equal(health.status, 'UP')
    assert.equal(health.demoEnabled, true)
    const cfg = await (await fetch(`${app.base}/config`)).json()
    assert.equal(cfg.authMode, 'demo')
    assert.equal(cfg.defaultLocale, 'fr')
    assert.equal(cfg.demoMode, true)
    assert.ok(Array.isArray(cfg.mfaRequiredRoles))

    assert.equal((await fetch(`${app.base}/session`)).status, 401)
  } finally {
    await app.close()
  }
})

test('demo accounts are hidden when demo is disabled', async () => {
  const config = testConfig({ demoEnabled: false })
  const dir = config.credentialsFile
  const { writeCredentials } = await import('./helpers.js')
  await writeCredentials(dir.replace(/\/credentials\.json$/, ''))
  const app = await createApp(config)
  const { server, base } = await listen(app)
  try {
    assert.equal((await fetch(`${base}/demo/session`, { method: 'POST' })).status, 404)
    assert.equal((await fetch(`${base}/demo/accounts`)).status, 404)
    assert.equal((await (await fetch(`${base}/config`)).json()).authMode, 'oidc')
  } finally {
    server.close()
  }
})

test('demo login requires a generated password, not just a role', async () => {
  const app = await makeTestApp()
  try {
    const noPassword = await app.post('/demo/session', { key: 'director' })
    assert.equal(noPassword.status, 401)
    const wrong = await app.post('/demo/session', { key: 'director', password: 'wrong-password-1234' })
    assert.equal(wrong.status, 401)
    const ok = await app.post('/demo/session', { key: 'teacher-parttime', password: app.passwords['teacher-parttime'].password })
    assert.equal(ok.status, 200)
  } finally {
    await app.close()
  }
})
