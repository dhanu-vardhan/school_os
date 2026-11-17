import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { loadConfig } from '../src/config.js'
import { createApp } from '../src/server.js'
import { DEMO_ACCOUNTS, loadDemoCredentials } from '../src/identity/demo-accounts.js'
import { generatePassword, hashPassword } from '../src/identity/passwords.js'
import { generateTotpSecret, totp } from '../src/identity/totp.js'

export function tmpDist() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schoolos-bff-'))
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html lang="fr"><head><link rel="stylesheet" href="/assets/app.css"></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>')
  fs.mkdirSync(path.join(dir, 'assets'))
  fs.writeFileSync(path.join(dir, 'assets', 'app.js'), 'console.log("SchoolOS")')
  fs.writeFileSync(path.join(dir, 'assets', 'app.css'), ':root{--color-bg:#faf8f3}')
  return dir
}

export async function writeCredentials(dir) {
  const credentials = { version: 1, demoOnly: true, generatedAt: new Date().toISOString(), accounts: {} }
  const passwords = {}
  for (const account of DEMO_ACCOUNTS) {
    const password = generatePassword(20)
    const totpSecret = generateTotpSecret()
    passwords[account.key] = { password, totpSecret }
    credentials.accounts[account.key] = {
      password,
      passwordHash: hashPassword(password),
      totpSecret,
      mfaEnrolled: true,
    }
  }
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'credentials.json')
  fs.writeFileSync(file, JSON.stringify(credentials, null, 2), { mode: 0o600 })
  return { file, credentials, passwords }
}

export function testConfig(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schoolos-test-'))
  const config = {
    ...loadConfig({ SCHOOLOS_PROFILE: 'demo', DEMO_MODE: 'true', AUTH_RESPONSE_FLOOR_MS: '0' }),
    demoEnabled: true,
    demoMode: true,
    profile: 'demo',
    production: false,
    webDist: tmpDist(),
    apiBaseUrl: 'http://127.0.0.1:1',
    sessionSecret: 'test-session-secret-at-least-32-characters',
    jwtSecret: 'test-jwt-secret-at-least-32-characters',
    secureCookies: false,
    cookieName: 'schoolos_session',
    csrfCookieName: 'schoolos_csrf',
    authFloorMs: 0,
    credentialsFile: path.join(dir, 'credentials.json'),
    rateLimit: { windowMs: 60_000, ipMax: 1000, accountMax: 8, lockoutBaseMs: 50, lockoutMaxMs: 200, disabled: true },
    ...overrides,
  }
  return config
}

export async function listen(handler) {
  const server = http.createServer(handler)
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  return { server, base: `http://127.0.0.1:${server.address().port}` }
}

export async function makeTestApp(overrides = {}) {
  const config = testConfig(overrides)
  const dir = path.dirname(config.credentialsFile)
  const { passwords } = await writeCredentials(dir)
  // Ensure generated credentials exactly match the file the app will read.
  await loadDemoCredentials(config)
  const app = await createApp(config)
  const { server, base } = await listen(app)
  const origin = base

  function cookieHeaderFrom(res) {
    const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean)
    return cookies.map(c => c.split(';')[0]).join('; ')
  }

  async function post(path, body, { cookie, csrf, headers = {} } = {}) {
    return fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin,
        ...(cookie ? { cookie } : {}),
        ...(csrf ? { 'x-csrf-token': csrf } : {}),
        ...headers,
      },
      body: JSON.stringify(body || {}),
    })
  }

  async function login(key, { schoolId, remember = false } = {}) {
    const password = passwords[key].password
    let res = await post('/demo/session', { key, password, schoolId, remember })
    let json = await res.json()
    let cookie = cookieHeaderFrom(res)
    if (json.mfaRequired) {
      const code = totp(passwords[key].totpSecret)
      res = await post('/demo/session/verify', { challengeId: json.challengeId, code }, { cookie })
      json = await res.json()
      cookie = cookieHeaderFrom(res)
    }
    const csrf = json.csrfToken
    return { res, json, cookie, csrf, password, origin }
  }

  return {
    config, app, base, server, origin, passwords, login, post, cookieHeaderFrom,
    async close() { server.close() },
  }
}
