import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStore } from '../src/store/memory.js'
import { SecurityLog } from '../src/security/security-log.js'
import { loadConfig, assertSafeConfig } from '../src/config.js'

test('security log is append-only, chained and detects tampering', async () => {
  const store = new MemoryStore()
  const log = new SecurityLog(store)
  await log.append({ type: 'login.success', actorSub: 'u1', detail: { role: 'TEACHER' } })
  await log.append({ type: 'mfa.enrolled', actorSub: 'u1', severity: 'warning', detail: { method: 'totp' } })
  await log.append({ type: 'tenant.switch', actorSub: 'u1', detail: { to: 'school-b' } })
  assert.deepEqual(await log.verify(), { valid: true, checked: 3 })

  const events = await store.allAudit()
  events[1].type = 'login.failure'
  store.audit[1] = events[1]
  const broken = await log.verify()
  assert.equal(broken.valid, false)
  assert.equal(broken.brokenAt, 2)
})

test('security log strips secrets before storing', async () => {
  const store = new MemoryStore()
  const log = new SecurityLog(store)
  const event = await log.append({
    type: 'login.failure',
    actorSub: null,
    detail: { password: 'super-secret', token: 'abc', reason: 'bad_password', nested: { totp: '123456', ok: true } },
  })
  assert.equal('password' in event.detail, false)
  assert.equal('token' in event.detail, false)
  assert.equal('totp' in event.detail.nested, false)
  assert.equal(event.detail.reason, 'bad_password')
})

test('demo mode needs DEMO_MODE plus the demo profile', () => {
  assert.equal(loadConfig({ SCHOOLOS_PROFILE: 'demo' }).demoEnabled, false)
  assert.equal(loadConfig({ DEMO_MODE: 'true' }).demoEnabled, false)
  assert.equal(loadConfig({ SCHOOLOS_PROFILE: 'demo', DEMO_MODE: 'true' }).demoEnabled, true)
  assert.equal(loadConfig({ SCHOOLOS_PROFILE: 'demo', DEMO_MODE: 'true', SCHOOLOS_ENV: 'prod' }).demoEnabled, false)
})

test('production refuses demo, HTTP issuer, weak cookies and default secrets', () => {
  const prod = loadConfig({
    SCHOOLOS_ENV: 'prod', SCHOOLOS_PROFILE: 'demo', DEMO_MODE: 'true',
    OIDC_ISSUER: 'http://keycloak:8080/realms/schoolos', COOKIE_SECURE: 'false',
  })
  assert.throws(() => assertSafeConfig(prod), /demo mode\/profile is enabled/)

  const missing = loadConfig({ SCHOOLOS_ENV: 'prod', SCHOOLOS_PROFILE: 'prod' })
  assert.throws(() => assertSafeConfig(missing), /OIDC_ISSUER is missing|SESSION_SECRET/)

  const safe = loadConfig({
    SCHOOLOS_ENV: 'prod', SCHOOLOS_PROFILE: 'prod',
    OIDC_ISSUER: 'https://auth.schoolos.fr/realms/schoolos',
    OIDC_CLIENT_SECRET: 'a-real-client-secret',
    SESSION_SECRET: 'x'.repeat(40),
    SCHOOLOS_DEMO_JWT_SECRET: 'y'.repeat(40),
    COOKIE_SECURE: 'true',
  })
  assert.equal(assertSafeConfig(safe), true)
})

test('demo mode refuses a non-local issuer', () => {
  const config = loadConfig({
    SCHOOLOS_PROFILE: 'demo', DEMO_MODE: 'true',
    OIDC_ISSUER: 'https://auth.prod.example/realms/schoolos',
  })
  assert.throws(() => assertSafeConfig(config), /demo mode refuses a non-local OIDC issuer/)
})
