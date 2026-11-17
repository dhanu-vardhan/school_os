import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../src/server.js'
import { decodeSession, encodeSession, issueJwt } from '../src/session.js'
import { loadConfig } from '../src/config.js'

function tmpDist() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schoolos-bff-'))
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html lang="fr"><head><link rel="stylesheet" href="/assets/app.css"></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>')
  fs.mkdirSync(path.join(dir, 'assets'))
  fs.writeFileSync(path.join(dir, 'assets', 'app.js'), 'console.log("SchoolOS")')
  fs.writeFileSync(path.join(dir, 'assets', 'app.css'), ':root{--color-bg:#faf8f3}')
  return dir
}

async function listen(handler) {
  const server = http.createServer(handler)
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  return { server, base: `http://127.0.0.1:${server.address().port}` }
}

function baseConfig(dist, apiBaseUrl) {
  return {
    ...loadConfig({}),
    webDist: dist,
    apiBaseUrl,
    demoEnabled: true,
    sessionSecret: 'test-session-secret',
    jwtSecret: 'test-jwt-secret',
    secureCookies: false,
  }
}

test('static document, JS and CSS return 200 with correct content types and security headers', async () => {
  const { server, base } = await listen(createApp(baseConfig(tmpDist(), 'http://127.0.0.1:1')))
  try {
    const doc = await fetch(`${base}/`)
    assert.equal(doc.status, 200)
    assert.match(doc.headers.get('content-type'), /text\/html/)
    assert.equal(doc.headers.get('x-frame-options'), 'DENY')
    assert.match(await doc.text(), /id="root"/)

    const js = await fetch(`${base}/assets/app.js`)
    assert.equal(js.status, 200)
    assert.match(js.headers.get('content-type'), /javascript/)

    const css = await fetch(`${base}/assets/app.css`)
    assert.equal(css.status, 200)
    assert.match(css.headers.get('content-type'), /text\/css/)
    assert.match(await css.text(), /--color-bg/)

    const missing = await fetch(`${base}/assets/missing.css`)
    assert.equal(missing.status, 404)
  } finally {
    server.close()
  }
})

test('no static path returns 401 and SPA routes fall back to index.html', async () => {
  const { server, base } = await listen(createApp(baseConfig(tmpDist(), 'http://127.0.0.1:1')))
  try {
    assert.equal((await fetch(`${base}/classes`)).status, 200)
    assert.equal((await fetch(`${base}/favicon.ico`)).status, 404)
  } finally {
    server.close()
  }
})

test('config, healthz and demo session bootstrap', async () => {
  const { server, base } = await listen(createApp(baseConfig(tmpDist(), 'http://127.0.0.1:1')))
  try {
    assert.deepEqual(await (await fetch(`${base}/healthz`)).json(), { status: 'UP', service: 'bff', demoEnabled: true })
    const cfg = await (await fetch(`${base}/config`)).json()
    assert.equal(cfg.authMode, 'demo')
    assert.equal(cfg.defaultLocale, 'fr')
    assert.deepEqual(cfg.locales, ['fr', 'en'])

    assert.equal((await fetch(`${base}/session`)).status, 401)

    const res = await fetch(`${base}/demo/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'director' }),
    })
    assert.equal(res.status, 200)
    const cookie = res.headers.get('set-cookie')
    assert.match(cookie, /HttpOnly/)
    assert.match(cookie, /SameSite=Lax/)
    const session = await res.json()
    assert.equal(session.authenticated, true)
    assert.equal(session.user.roles[0], 'DIRECTOR')
    assert.ok(session.csrfToken)

    const me = await fetch(`${base}/session`, { headers: { cookie } })
    assert.equal(me.status, 200)
    assert.equal((await me.json()).user.name, 'Camille Durand')

    const bad = await fetch(`${base}/demo/session`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'not-a-role' }),
    })
    assert.equal(bad.status, 400)
  } finally {
    server.close()
  }
})

test('demo endpoints are hidden when demo is disabled', async () => {
  const cfg = baseConfig(tmpDist(), 'http://127.0.0.1:1')
  cfg.demoEnabled = false
  const { server, base } = await listen(createApp(cfg))
  try {
    assert.equal((await fetch(`${base}/demo/session`, { method: 'POST' })).status, 404)
    assert.equal((await fetch(`${base}/demo/users`)).status, 404)
    assert.equal((await (await fetch(`${base}/config`)).json()).authMode, 'oidc')
  } finally {
    server.close()
  }
})

test('API proxy requires a session and CSRF, and relays a signed JWT with school_id', async () => {
  let seenAuth = ''
  let seenSchool = ''
  const upstream = http.createServer((req, res) => {
    seenAuth = req.headers.authorization || ''
    seenSchool = req.headers['x-school-id'] || ''
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ ok: true }))
  })
  await new Promise(r => upstream.listen(0, '127.0.0.1', r))
  const apiBaseUrl = `http://127.0.0.1:${upstream.address().port}`
  const { server, base } = await listen(createApp(baseConfig(tmpDist(), apiBaseUrl)))
  try {
    assert.equal((await fetch(`${base}/api/v1/students`)).status, 401)

    const login = await fetch(`${base}/demo/session`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'teacher' }),
    })
    const cookie = login.headers.get('set-cookie')
    const { csrfToken } = await login.json()

    const noCsrf = await fetch(`${base}/api/v1/classes`, {
      method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{}',
    })
    assert.equal(noCsrf.status, 403)

    const ok = await fetch(`${base}/api/v1/students`, { headers: { cookie } })
    assert.equal(ok.status, 200)
    assert.deepEqual(await ok.json(), { ok: true })
    assert.match(seenAuth, /^Bearer /)
    assert.match(seenSchool, /^11111111-/)

    const jwt = seenAuth.replace('Bearer ', '')
    const claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
    assert.equal(claims.school_id, '11111111-1111-4111-8111-111111111111')
    assert.deepEqual(claims.roles, ['TEACHER'])
  } finally {
    server.close()
    upstream.close()
  }
})

test('session tokens are tamper-evident and expire', () => {
  const cfg = baseConfig(tmpDist(), 'http://127.0.0.1:1')
  const token = encodeSession({ sub: 'x', schoolId: '11111111-1111-4111-8111-111111111111', roles: [], exp: Date.now() + 10000 }, cfg.sessionSecret)
  assert.ok(decodeSession(token, cfg.sessionSecret))
  assert.equal(decodeSession(token.slice(0, -1) + 'X', cfg.sessionSecret), null)
  assert.equal(decodeSession(token, 'another-secret'), null)
  const expired = encodeSession({ sub: 'x', schoolId: '11111111-1111-4111-8111-111111111111', roles: [], exp: Date.now() - 1 }, cfg.sessionSecret)
  assert.equal(decodeSession(expired, cfg.sessionSecret), null)
  assert.match(issueJwt({ sub: 'x', schoolId: '11111111-1111-4111-8111-111111111111', roles: [], name: 'X', locale: 'fr' }, cfg).split('.')[0], /eyJ/)
})
