import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { URL } from 'node:url'
import { assertSafeConfig } from './config.js'
import {
  clearCookie, createSession, deleteSession, getSession,
  isStepUpActive, issueDemoJwt, listUserSessions, markStepUp, parseCookies,
  publicSession, readSession, revokeUserSessions, serializeCookie, serializeCsrfCookie,
} from './session.js'
import { createStore } from './store/index.js'
import { SecurityLog, SECURITY_EVENTS } from './security/security-log.js'
import { RateLimiter, rateKey, retryAfterSeconds } from './security/rate-limit.js'
import { redactIp, requestIp, uaFamily } from './security/fingerprint.js'
import { accessTokenValid, rotateRefreshToken } from './security/refresh.js'
import {
  DEMO_ACCOUNTS, SCHOOL_A, SCHOOL_B, SCHOOL_A_NAME, SCHOOL_B_NAME, accountNeedsMfa,
  demoAccountForMembership, demoPasswordFor, demoTotpSecretFor, findDemoAccount,
  loadDemoCredentials, newDemoChallengeId, publicDemoAccounts, verifyDemoCredentials,
} from './identity/demo-accounts.js'
import { generateBackupCodes, hashBackupCodes, otpauthUrl, verifyTotp, generateTotpSecret, totp } from './identity/totp.js'
import {
  generatePassword, hashPassword, hashToken, newOpaqueToken, passwordPolicy,
  timingSafeEqualString, verifyPassword,
} from './identity/passwords.js'
import {
  beginOidcFlow, completeOidcFlow, jwksFor, logoutUrl, membershipsFromClaims, oidcEnabled,
} from './identity/oidc.js'
import { verifyJwt } from './identity/jwt.js'
import { IMPERSONATION_FORBIDDEN, isPrivileged, needsMfa, normalizeRole } from './identity/roles.js'

const MAX_BODY = 1024 * 1024
const CHALLENGE_PREFIX = 'challenge:'
const ENROLL_PREFIX = 'enroll:'
const RESET_PREFIX = 'reset:'
const INVITE_PREFIX = 'invite:'
const OIDC_SID_PREFIX = 'oidc-sid:'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function baseSecurityHeaders(config) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-store',
  }
  if (config.secureCookies) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
  }
  return headers
}

function htmlCsp() {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join('; ')
}

function send(res, status, body, contentType = 'application/json; charset=utf-8', extraHeaders = {}, config = null) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)
  res.writeHead(status, {
    ...(config ? baseSecurityHeaders(config) : {}),
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(payload),
    ...extraHeaders,
  })
  res.end(payload)
}

function notFound(res, config) {
  send(res, 404, { error: 'not_found' }, undefined, {}, config)
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) {
      const err = new Error('payload_too_large')
      err.status = 413
      throw err
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function readJson(req) {
  const raw = await readBody(req)
  if (!raw.length) return {}
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    const err = new Error('invalid_json')
    err.status = 400
    throw err
  }
}

async function readForm(req) {
  const raw = await readBody(req)
  return new URLSearchParams(raw.toString('utf8'))
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

function safeReturnTo(value, fallback = '/app/dashboard') {
  if (typeof value !== 'string' || !value) return fallback
  if (value.length > 512) return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (value.includes('\\') || value.includes('://') || /[\u0000-\u001f]/.test(value)) return fallback
  if (!/^\/(app|login|session-expired|schools|auth)(\/|$|\?)/.test(value)) return fallback
  return value
}

function isMutation(method) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method)
}

function hasAnyRole(session, roles) {
  if (!session) return false
  const set = new Set(roles.map(normalizeRole))
  return session.roles.some(r => set.has(normalizeRole(r)))
}

function publicConfig(config) {
  return {
    appName: 'SchoolOS',
    version: config.version,
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    authMode: config.demoEnabled ? 'demo' : 'oidc',
    demoEnabled: config.demoEnabled,
    demoMode: config.demoEnabled,
    passkeyEnabled: config.demoEnabled,
    mfaRequiredRoles: ['PLATFORM_ADMIN', 'GROUP_ADMIN', 'DIRECTOR', 'ADMIN', 'DEPUTY', 'SAFEGUARDING', 'NURSE', 'FINANCE', 'ACCOUNTANT', 'HR', 'IT_ADMIN', 'AUDITOR'],
    apiBasePath: '/api',
    timezone: 'Europe/Paris',
    store: config.store.driver,
  }
}

async function serveStatic(config, req, res, pathname) {
  const root = path.resolve(config.webDist)
  let relative
  try {
    relative = decodeURIComponent(pathname).replace(/^\/+/, '')
  } catch {
    return notFound(res, config)
  }
  let target = path.resolve(root, relative || 'index.html')
  if (target !== root && !target.startsWith(root + path.sep)) return notFound(res, config)

  let stats
  try {
    stats = await fsp.stat(target)
  } catch {
    if (!path.extname(target)) target = path.join(root, 'index.html')
    else return notFound(res, config)
    try {
      stats = await fsp.stat(target)
    } catch {
      return notFound(res, config)
    }
  }
  if (stats.isDirectory()) target = path.join(target, 'index.html')
  const ext = path.extname(target).toLowerCase()
  const contentType = MIME[ext] || 'application/octet-stream'
  const isHtml = ext === '.html'
  const headers = {
    ...baseSecurityHeaders(config),
    'Content-Security-Policy': htmlCsp(),
    'Cache-Control': isHtml ? 'no-store' : 'public, max-age=3600, immutable',
  }
  const stream = fs.createReadStream(target)
  stream.on('error', () => { if (!res.headersSent) notFound(res, config); else res.destroy() })
  res.writeHead(200, { ...headers, 'Content-Type': contentType })
  stream.pipe(res)
}

export async function createApp(config, deps = {}) {
  assertSafeConfig(config)
  const store = deps.store || createStore(config)
  const log = deps.log || new SecurityLog(store)
  const limiter = deps.limiter || new RateLimiter(config.rateLimit)
  const now = deps.clock || (() => Date.now())
  const jwks = oidcEnabled(config) ? jwksFor(config) : null
  const dummyHash = hashPassword('not-a-real-password-placeholder')
  let credentials = null
  let credentialsPromise = null

  async function ensureCredentials() {
    if (!config.demoEnabled) return null
    if (credentials) return credentials
    if (!credentialsPromise) credentialsPromise = loadDemoCredentials(config).then(c => { credentials = c; return c })
    return credentialsPromise
  }

  function setSessionCookies(res, record) {
    res.setHeader('Set-Cookie', [serializeCookie(record.sid, config), serializeCsrfCookie(record.csrf, config)])
  }

  function clearSessionCookies(res) {
    res.setHeader('Set-Cookie', clearCookie(config))
  }

  function allowedOrigins(req) {
    const forwarded = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
    const proto = forwarded || (req.socket?.encrypted ? 'https' : 'http')
    const host = req.headers.host || 'localhost'
    return new Set([`${proto}://${host}`, `http://localhost:${config.port}`, `https://localhost:${config.port}`, ...config.allowedOrigins])
  }

  function originOk(req) {
    const origin = req.headers.origin
    if (origin) return allowedOrigins(req).has(origin)
    const referer = req.headers.referer
    if (referer) {
      try { return allowedOrigins(req).has(new URL(referer).origin) } catch { return false }
    }
    // Non-browser clients must still present the custom CSRF header; reject missing
    // Origin/Referer for cookie-authenticated mutations to keep the rule strict.
    return false
  }

  function csrfOk(req, session) {
    const cookies = parseCookies(req.headers.cookie || '')
    const header = req.headers['x-csrf-token']
    const cookie = cookies[config.csrfCookieName]
    if (!header || !cookie || !session?.csrf) return false
    return timingSafeEqualString(String(header), session.csrf) && timingSafeEqualString(String(cookie), session.csrf)
  }

  async function event(req, session, type, severity = 'info', detail = {}) {
    const actorSub = session?.sub || detail.actorSub || null
    await log.append({
      type,
      severity,
      actorSub,
      schoolId: session?.schoolId || null,
      ip: redactIp(requestIp(req)),
      ua: uaFamily(req.headers['user-agent']),
      detail,
    })
  }

  async function floor(started) {
    const remaining = config.authFloorMs - (Date.now() - started)
    if (remaining > 0) await delay(remaining)
  }

  function rateLimited(res, retryAfterMs) {
    return send(res, 429, { error: 'rate_limited', retryAfterSeconds: retryAfterSeconds(retryAfterMs) }, undefined,
      { 'Retry-After': String(retryAfterSeconds(retryAfterMs)) }, config)
  }

  async function requireSession(req, res) {
    const session = await readSession(req, config, store)
    if (!session) {
      clearSessionCookies(res)
      send(res, 401, { error: 'unauthenticated', reauth: true }, undefined, {}, config)
      return null
    }
    return session
  }

  function requireCsrf(req, res, session) {
    if (!csrfOk(req, session) || !originOk(req)) {
      send(res, 403, { error: 'csrf_failed' }, undefined, {}, config)
      return false
    }
    return true
  }

  async function completeLogin(req, res, { account, membership, amr, remember = false, oidc = null, impersonation = null }) {
    const record = await createSession(store, config, {
      account, membership, amr, remember, req, oidc, impersonation,
    })
    if (oidc?.sid) {
      await store.put(`${OIDC_SID_PREFIX}${oidc.sid}`, { sid: record.sid, sub: record.sub }, 12 * 3600_000)
    }
    setSessionCookies(res, record)
    await event(req, record, SECURITY_EVENTS.LOGIN_SUCCESS, 'info', {
      role: membership.role, method: amr.join('+'), demo: !!account.demo,
    })
    return record
  }

  async function finishChallenge(res, req, challenge, amr) {
    const resolved = demoAccountForMembership(challenge.key, challenge.schoolId)
    if (!resolved) return send(res, 400, { error: 'invalid_challenge' }, undefined, {}, config)
    const record = await completeLogin(req, res, {
      account: resolved.account, membership: resolved.membership, amr,
      remember: challenge.remember, oidc: challenge.oidc || null,
    })
    await store.del(`${CHALLENGE_PREFIX}${challenge.id}`)
    return send(res, 200, publicSession(record, config))
  }

  async function handler(req, res) {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const pathname = requestUrl.pathname
    const method = req.method || 'GET'
    const started = Date.now()

    try {
      if (pathname === '/healthz' && method === 'GET') {
        return send(res, 200, { status: 'UP', service: 'bff', demoEnabled: config.demoEnabled, store: config.store.driver }, undefined, {}, config)
      }
      if (pathname === '/config' && method === 'GET') {
        return send(res, 200, publicConfig(config), undefined, {}, config)
      }
      if (pathname === '/session' && method === 'GET') {
        const session = await readSession(req, config, store)
        if (!session) return send(res, 401, { authenticated: false }, undefined, {}, config)
        return send(res, 200, publicSession(session, config), undefined, {}, config)
      }

      // ── CSRF token for the SPA ─────────────────────────────────────────────────
      if (pathname === '/auth/csrf' && method === 'GET') {
        const session = await readSession(req, config, store)
        if (!session) return send(res, 401, { error: 'unauthenticated' }, undefined, {}, config)
        return send(res, 200, { csrfToken: session.csrf }, undefined, { 'Set-Cookie': serializeCsrfCookie(session.csrf, config) }, config)
      }

      // ── OIDC (production) ──────────────────────────────────────────────────────
      if (pathname === '/auth/oidc/start' && method === 'GET') {
        if (!oidcEnabled(config)) return send(res, 503, { error: 'oidc_not_configured' }, undefined, {}, config)
        const returnTo = safeReturnTo(requestUrl.searchParams.get('returnTo'))
        const prompt = requestUrl.searchParams.get('prompt') || undefined
        const acr = requestUrl.searchParams.get('acr_values') || undefined
        const { url } = await beginOidcFlow(store, config, { returnTo, prompt, acrValues: acr })
        res.writeHead(302, { ...baseSecurityHeaders(config), Location: url })
        return res.end()
      }
      if (pathname === '/auth/callback' && method === 'GET') {
        if (!oidcEnabled(config)) return send(res, 503, { error: 'oidc_not_configured' }, undefined, {}, config)
        if (requestUrl.searchParams.get('error')) {
          await event(req, null, SECURITY_EVENTS.LOGIN_FAILURE, 'warning', { reason: 'oidc_error' })
          res.writeHead(302, { Location: '/login?error=signin' })
          return res.end()
        }
        const state = requestUrl.searchParams.get('state')
        const code = requestUrl.searchParams.get('code')
        try {
          const { flow, account, tokens } = await completeOidcFlow(store, config, { code, state })
          const membership = account.memberships[0]
          const claims = tokens.id_token ? JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString()) : {}
          const session = await completeLogin(req, res, {
            account, membership, amr: claims.amr || ['pwd'], remember: false,
            oidc: {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              idToken: tokens.id_token,
              accessExpiresAt: Date.now() + Number(tokens.expires_in || 300) * 1000,
              sid: claims.sid,
              familyId: crypto.randomUUID(),
            },
          })
          if (account.memberships.length > 1) {
            res.writeHead(302, { Location: '/schools/select' })
            return res.end()
          }
          res.writeHead(302, { ...baseSecurityHeaders(config), Location: safeReturnTo(flow.returnTo) })
          return res.end()
        } catch (err) {
          await event(req, null, SECURITY_EVENTS.LOGIN_FAILURE, 'warning', { reason: 'oidc_callback' })
          res.writeHead(302, { Location: '/login?error=signin' })
          return res.end()
        }
      }

      // ── Login (demo credential flow / OIDC hand-off) ───────────────────────────
      if (pathname === '/auth/login/start' && method === 'POST') {
        const rl = limiter.hit(`start:${requestIp(req)}`, config.rateLimit.ipMax, config.rateLimit.windowMs)
        if (!rl.allowed) return rateLimited(res, rl.retryAfterMs)
        await readJson(req)
        if (!config.demoEnabled) {
          const { url } = await beginOidcFlow(store, config, { returnTo: '/app/dashboard' })
          return send(res, 200, { mode: 'oidc', authorizationUrl: url }, undefined, {}, config)
        }
        return send(res, 200, { mode: 'demo', next: 'password', methods: ['password'] }, undefined, {}, config)
      }

      if (pathname === '/auth/login' && method === 'POST') {
        if (!config.demoEnabled) {
          const body = await readJson(req)
          const { url } = await beginOidcFlow(store, config, {
            returnTo: safeReturnTo(body.returnTo), loginHint: body.identifier,
          })
          return send(res, 200, { mode: 'oidc', authorizationUrl: url }, undefined, {}, config)
        }
        const body = await readJson(req)
        const identifier = String(body.identifier || '').trim().toLowerCase()
        const password = String(body.password || '')
        const check = limiter.checkLogin(req, `id:${rateKey(identifier)}`)
        if (!check.allowed) {
          await event(req, null, SECURITY_EVENTS.LOGIN_LOCKED, 'warning', { reason: check.scope })
          return rateLimited(res, check.retryAfterMs)
        }
        const account = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === identifier)
        const credentialsValue = await ensureCredentials()
        const ok = account ? verifyDemoCredentials(account, password, credentialsValue) : verifyPassword(password, dummyHash)
        if (!ok || !account) {
          const wait = limiter.failure(`id:${rateKey(identifier)}`)
          await event(req, null, SECURITY_EVENTS.LOGIN_FAILURE, 'warning', { identifierHash: rateKey(identifier) })
          await floor(started)
          if (wait > 0) return rateLimited(res, wait)
          return send(res, 401, { error: 'invalid_credentials', message: 'We could not sign you in. Check your details or reset your password.' }, undefined, {}, config)
        }
        limiter.success(`id:${rateKey(identifier)}`)
        const membership = account.memberships[0]
        if (accountNeedsMfa(account)) {
          const id = newDemoChallengeId()
          await store.put(`${CHALLENGE_PREFIX}${id}`, {
            id, key: account.key, schoolId: membership.schoolId, remember: !!body.remember, attempts: 0,
          }, 5 * 60_000)
          await event(req, null, SECURITY_EVENTS.MFA_CHALLENGE, 'info', { challenge: 'login' })
          return send(res, 200, {
            mfaRequired: true, challengeId: id, methods: ['totp'],
            ...(config.demoEnabled ? { demo: { totpSecret: demoTotpSecretFor(account.key, credentialsValue) } } : {}),
          }, undefined, {}, config)
        }
        const record = await completeLogin(req, res, { account, membership, amr: ['pwd'], remember: !!body.remember })
        return send(res, 200, publicSession(record, config), undefined, {}, config)
      }

      if (pathname === '/auth/mfa/verify' && method === 'POST') {
        if (!config.demoEnabled) return send(res, 501, { error: 'use_oidc' }, undefined, {}, config)
        const body = await readJson(req)
        const challenge = await store.get(`${CHALLENGE_PREFIX}${String(body.challengeId || '')}`)
        if (!challenge) return send(res, 400, { error: 'invalid_challenge' }, undefined, {}, config)
        challenge.attempts = (challenge.attempts || 0) + 1
        if (challenge.attempts > 5) {
          await store.del(`${CHALLENGE_PREFIX}${challenge.id}`)
          await event(req, null, SECURITY_EVENTS.MFA_FAILURE, 'warning', { reason: 'attempts' })
          return send(res, 429, { error: 'invalid_code' }, undefined, {}, config)
        }
        await store.put(`${CHALLENGE_PREFIX}${challenge.id}`, challenge, 5 * 60_000)
        const credentialsValue = await ensureCredentials()
        const secret = demoTotpSecretFor(challenge.key, credentialsValue)
        const code = String(body.code || '').replace(/\s/g, '')
        if (!verifyTotp(secret, code)) {
          await floor(started)
          await event(req, null, SECURITY_EVENTS.MFA_FAILURE, 'warning', { reason: 'code' })
          return send(res, 401, { error: 'invalid_code' }, undefined, {}, config)
        }
        await event(req, null, SECURITY_EVENTS.MFA_SUCCESS, 'info', {})
        return finishChallenge(res, req, challenge, ['pwd', 'otp'])
      }

      // ── Demo-only endpoints ────────────────────────────────────────────────────
      if (pathname.startsWith('/demo/') && !config.demoEnabled) return notFound(res, config)

      if (pathname === '/demo/accounts' && method === 'GET') {
        const credentialsValue = await ensureCredentials()
        return send(res, 200, {
          demoOnly: true,
          schools: [
            { id: SCHOOL_A, name: SCHOOL_A_NAME },
            { id: SCHOOL_B, name: SCHOOL_B_NAME },
          ],
          accounts: publicDemoAccounts(credentialsValue),
        }, undefined, {}, config)
      }
      if (pathname === '/demo/users' && method === 'GET') {
        const credentialsValue = await ensureCredentials()
        const users = publicDemoAccounts(credentialsValue).map(account => ({
          role: account.key,
          name: account.name,
          schoolId: account.schoolId,
          schoolName: account.schoolName,
          apiRole: account.role,
          mfa: account.mfa,
          title: account.title,
        }))
        return send(res, 200, { users }, undefined, {}, config)
      }
      if (pathname === '/demo/session' && method === 'POST') {
        if (!originOk(req)) return send(res, 403, { error: 'origin_failed' }, undefined, {}, config)
        const body = await readJson(req)
        const identifier = body.key || body.role
        const account = findDemoAccount(String(identifier || ''))
        if (!account) return send(res, 400, { error: 'unknown_demo_role' }, undefined, {}, config)
        const resolved = demoAccountForMembership(account.key, body.schoolId)
        if (!resolved) return send(res, 400, { error: 'unknown_demo_role' }, undefined, {}, config)
        const check = limiter.checkLogin(req, `demo:${account.key}`)
        if (!check.allowed) return rateLimited(res, check.retryAfterMs)
        const credentialsValue = await ensureCredentials()
        const password = String(body.password || '')
        const ok = password ? verifyDemoCredentials(account, password, credentialsValue) : false
        if (!ok) {
          const wait = limiter.failure(`demo:${account.key}`)
          await event(req, null, SECURITY_EVENTS.LOGIN_FAILURE, 'warning', { reason: 'demo_password', account: account.key })
          await floor(started)
          if (wait > 0) return rateLimited(res, wait)
          return send(res, 401, { error: 'invalid_credentials' }, undefined, {}, config)
        }
        limiter.success(`demo:${account.key}`)
        if (accountNeedsMfa(account)) {
          const id = newDemoChallengeId()
          await store.put(`${CHALLENGE_PREFIX}${id}`, {
            id, key: account.key, schoolId: resolved.membership.schoolId, remember: !!body.remember, attempts: 0,
          }, 5 * 60_000)
          await event(req, null, SECURITY_EVENTS.MFA_CHALLENGE, 'info', { account: account.key })
          return send(res, 200, {
            mfaRequired: true,
            challengeId: id,
            methods: ['totp'],
            account: { key: account.key, name: account.name, role: resolved.membership.role },
            demo: { totpSecret: demoTotpSecretFor(account.key, credentialsValue) },
          }, undefined, {}, config)
        }
        const record = await completeLogin(req, res, {
          account, membership: resolved.membership, amr: ['pwd'], remember: !!body.remember,
        })
        return send(res, 200, publicSession(record, config), undefined, {}, config)
      }
      if (pathname === '/demo/session/verify' && method === 'POST') {
        if (!originOk(req)) return send(res, 403, { error: 'origin_failed' }, undefined, {}, config)
        const body = await readJson(req)
        const challenge = await store.get(`${CHALLENGE_PREFIX}${String(body.challengeId || '')}`)
        if (!challenge) return send(res, 400, { error: 'invalid_challenge' }, undefined, {}, config)
        challenge.attempts = (challenge.attempts || 0) + 1
        if (challenge.attempts > 5) {
          await store.del(`${CHALLENGE_PREFIX}${challenge.id}`)
          return send(res, 429, { error: 'invalid_code' }, undefined, {}, config)
        }
        await store.put(`${CHALLENGE_PREFIX}${challenge.id}`, challenge, 5 * 60_000)
        const credentialsValue = await ensureCredentials()
        const secret = demoTotpSecretFor(challenge.key, credentialsValue)
        if (!verifyTotp(secret, String(body.code || '').replace(/\s/g, ''))) {
          await floor(started)
          await event(req, null, SECURITY_EVENTS.MFA_FAILURE, 'warning', { reason: 'demo_code' })
          return send(res, 401, { error: 'invalid_code' }, undefined, {}, config)
        }
        await event(req, null, SECURITY_EVENTS.MFA_SUCCESS, 'info', {})
        return finishChallenge(res, req, challenge, ['pwd', 'otp'])
      }
      if (pathname === '/demo/totp' && method === 'GET') {
        const key = requestUrl.searchParams.get('key') || ''
        const account = findDemoAccount(key)
        if (!account) return send(res, 400, { error: 'unknown_demo_role' }, undefined, {}, config)
        const credentialsValue = await ensureCredentials()
        return send(res, 200, { code: currentTotp(demoTotpSecretFor(key, credentialsValue)) }, undefined, {}, config)
      }
      if (pathname === '/demo/passkey' && method === 'POST') {
        const session = await requireSession(req, res); if (!session) return
        if (!requireCsrf(req, res, session)) return
        const body = await readJson(req)
        if (body.simulate !== true) return send(res, 400, { error: 'passkey_simulation_required' }, undefined, {}, config)
        session.amr = [...new Set([...session.amr, 'webauthn'])]
        session.mfa = true
        await store.put(`sess:${session.sid}`, session, session.absoluteExpiresAt - Date.now())
        await event(req, session, SECURITY_EVENTS.MFA_SUCCESS, 'info', { method: 'webauthn_simulated' })
        return send(res, 200, publicSession(session, config), undefined, {}, config)
      }
      if (pathname === '/demo/reset' && method === 'POST') {
        const session = await requireSession(req, res); if (!session) return
        if (!requireCsrf(req, res, session)) return
        if (!hasAnyRole(session, ['PLATFORM_ADMIN', 'DIRECTOR', 'ADMIN'])) return send(res, 403, { error: 'forbidden' }, undefined, {}, config)
        await event(req, session, SECURITY_EVENTS.DEMO_RESET, 'warning', {})
        return send(res, 200, { reset: true, note: 'Demo seed is idempotent; re-run the seed job to restore academic data.' }, undefined, {}, config)
      }

      // ── MFA enrollment (demo; production uses Keycloak account console) ────────
      if (pathname === '/auth/mfa/enroll/start' && method === 'POST') {
        const session = await requireSession(req, res); if (!session) return
        if (!requireCsrf(req, res, session)) return
        if (!config.demoEnabled) return send(res, 200, { redirect: `${config.oidc.issuer}/account/` }, undefined, {}, config)
        const secret = generateTotpSecret()
        const codes = generateBackupCodes(10)
        await store.put(`${ENROLL_PREFIX}${session.sid}`, {
          secret, backups: hashBackupCodes(codes), createdAt: Date.now(),
        }, 10 * 60_000)
        await event(req, session, SECURITY_EVENTS.MFA_CHALLENGE, 'info', { phase: 'enroll_start' })
        return send(res, 200, {
          secret,
          otpauthUrl: otpauthUrl({ secret, account: session.email || session.sub }),
          backupCodes: codes,
        }, undefined, {}, config)
      }
      if (pathname === '/auth/mfa/enroll/verify' && method === 'POST') {
        const session = await requireSession(req, res); if (!session) return
        if (!requireCsrf(req, res, session)) return
        if (!config.demoEnabled) return send(res, 501, { error: 'use_oidc' }, undefined, {}, config)
        const pending = await store.get(`${ENROLL_PREFIX}${session.sid}`)
        if (!pending) return send(res, 400, { error: 'enrollment_expired' }, undefined, {}, config)
        const body = await readJson(req)
        if (!verifyTotp(pending.secret, body.code)) {
          await floor(started)
          return send(res, 401, { error: 'invalid_code' }, undefined, {}, config)
        }
        const credentialsValue = await ensureCredentials()
        const existing = credentialsValue.accounts[session.sub.replace(/^demo-/, '')]
        const key = session.sub.replace(/^demo-/, '')
        if (existing) {
          existing.totpSecret = pending.secret
          existing.backupCodes = pending.backups
          existing.mfaEnrolled = true
          await fsp.writeFile(config.credentialsFile, JSON.stringify(credentialsValue, null, 2), { mode: 0o600 })
        }
        session.amr = [...new Set([...session.amr, 'otp'])]
        session.mfa = true
        session.mfaRequired = needsMfa(session.roles)
        await store.put(`sess:${session.sid}`, session, session.absoluteExpiresAt - Date.now())
        await store.del(`${ENROLL_PREFIX}${session.sid}`)
        await event(req, session, SECURITY_EVENTS.MFA_ENROLLED, 'warning', { method: 'totp' })
        return send(res, 200, { enrolled: true, mfa: true }, undefined, {}, config)
      }
      if (pathname === '/auth/mfa/step-up' && method === 'POST') {
        const session = await requireSession(req, res); if (!session) return
        if (!requireCsrf(req, res, session)) return
        if (!config.demoEnabled) {
          const { url } = await beginOidcFlow(store, config, {
            returnTo: safeReturnTo((await readJson(req)).returnTo),
            prompt: 'login', acrValues: 'urn:mace:incommon:iap:silver',
          })
          return send(res, 200, { mode: 'oidc', authorizationUrl: url }, undefined, {}, config)
        }
        const body = await readJson(req)
        const credentialsValue = await ensureCredentials()
        const key = session.sub.replace(/^demo-/, '')
        const entry = credentialsValue.accounts[key]
        const ok = entry && (verifyTotp(entry.totpSecret, body.code) || consumeBackup(entry, body.code))
        if (!ok) {
          await floor(started)
          await event(req, session, SECURITY_EVENTS.MFA_FAILURE, 'warning', { reason: 'step_up' })
          return send(res, 401, { error: 'invalid_code' }, undefined, {}, config)
        }
        markStepUp(session, config)
        await store.put(`sess:${session.sid}`, session, session.absoluteExpiresAt - Date.now())
        await event(req, session, SECURITY_EVENTS.STEP_UP, 'info', {})
        return send(res, 200, publicSession(session, config), undefined, {}, config)
      }

      // ── Recovery / invitations (uniform, no enumeration) ──────────────────────
      if (pathname === '/auth/forgot-password' && method === 'POST') {
        const rl = limiter.hit(`forgot:${requestIp(req)}`, config.rateLimit.ipMax, config.rateLimit.windowMs)
        if (!rl.allowed) return rateLimited(res, rl.retryAfterMs)
        const body = await readJson(req)
        const identifier = String(body.identifier || '').trim().toLowerCase()
        const token = newOpaqueToken(32)
        await store.put(`${RESET_PREFIX}${hashToken(token, config.sessionSecret)}`, {
          identifier, createdAt: Date.now(), used: false,
        }, 15 * 60_000)
        await event(req, null, SECURITY_EVENTS.PASSWORD_RESET_REQUEST, 'info', { identifierHash: rateKey(identifier) })
        await floor(started)
        return send(res, 202, {
          accepted: true,
          // Demo only: the UI can continue without an e-mail. Never returned in production.
          ...(config.demoEnabled ? { demoToken: token } : {}),
        }, undefined, {}, config)
      }
      if (pathname === '/auth/reset-password' && method === 'POST') {
        const body = await readJson(req)
        const key = `${RESET_PREFIX}${hashToken(String(body.token || ''), config.sessionSecret)}`
        const entry = await store.get(key)
        if (!entry || entry.used || Date.now() - entry.createdAt > 15 * 60_000) {
          await floor(started)
          return send(res, 400, { error: 'invalid_or_expired_token' }, undefined, {}, config)
        }
        const policy = passwordPolicy(body.password, { privileged: false, identifier: entry.identifier })
        if (!policy.ok) return send(res, 400, { error: 'weak_password', issues: policy.issues }, undefined, {}, config)
        entry.used = true
        await store.put(key, entry, 60_000)
        if (config.demoEnabled) {
          const credentialsValue = await ensureCredentials()
          const account = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === entry.identifier)
          const cred = account ? credentialsValue.accounts[account.key] : null
          if (cred) {
            cred.password = String(body.password)
            cred.passwordHash = hashPassword(body.password)
            await fsp.writeFile(config.credentialsFile, JSON.stringify(credentialsValue, null, 2), { mode: 0o600 })
          }
        }
        await event(req, null, SECURITY_EVENTS.PASSWORD_RESET, 'warning', { identifierHash: rateKey(entry.identifier) })
        return send(res, 200, { reset: true }, undefined, {}, config)
      }
      if (pathname === '/auth/invitations/accept' && method === 'POST') {
        const body = await readJson(req)
        const policy = passwordPolicy(body.password, { privileged: body.privileged === true })
        if (!policy.ok) return send(res, 400, { error: 'weak_password', issues: policy.issues }, undefined, {}, config)
        await event(req, null, SECURITY_EVENTS.INVITE_ACCEPTED, 'info', { identifierHash: rateKey(body.email) })
        return send(res, 200, { accepted: true, mfaEnrollmentRequired: true }, undefined, {}, config)
      }

      // ── Tenant switch ──────────────────────────────────────────────────────────
      if ((pathname === '/auth/school' || pathname === '/auth/switch-school') && method === 'POST') {
        const session = await requireSession(req, res); if (!session) return
        if (!requireCsrf(req, res, session)) return
        const body = await readJson(req)
        const membership = session.memberships.find(m => m.schoolId === body.schoolId)
        if (!membership) {
          await event(req, session, SECURITY_EVENTS.POLICY_DENIED, 'warning', { action: 'tenant_switch' })
          return send(res, 403, { error: 'not_a_member' }, undefined, {}, config)
        }
        const account = {
          sub: session.sub, email: session.email, name: session.name, locale: session.locale,
          demo: session.demo, memberships: session.memberships,
        }
        const previousSchool = session.schoolId
        await deleteSession(store, session.sid)
        const record = await createSession(store, config, {
          account, membership, amr: session.amr, remember: false, req, oidc: session.oidc,
          impersonation: session.impersonation,
        })
        setSessionCookies(res, record)
        await event(req, record, SECURITY_EVENTS.TENANT_SWITCH, 'info', { from: previousSchool, to: membership.schoolId })
        return send(res, 200, publicSession(record, config), undefined, {}, config)
      }

      // ── Logout / session management ────────────────────────────────────────────
      if (pathname === '/auth/logout' && method === 'POST') {
        const session = await readSession(req, config, store)
        if (session) {
          if (!requireCsrf(req, res, session)) return
          await deleteSession(store, session.sid)
          await event(req, session, SECURITY_EVENTS.LOGOUT, 'info', {})
        }
        clearSessionCookies(res)
        return send(res, 204, '', undefined, {}, config)
      }
      if (pathname === '/auth/logout-all' && method === 'POST') {
        const session = await requireSession(req, res); if (!session) return
        if (!requireCsrf(req, res, session)) return
        const revoked = await revokeUserSessions(store, session.sub, session.sid)
        await event(req, session, SECURITY_EVENTS.SESSION_REVOKED, 'warning', { scope: 'all', revoked })
        return send(res, 200, { revoked }, undefined, {}, config)
      }
      if (pathname === '/auth/backchannel-logout' && method === 'POST') {
        if (!oidcEnabled(config)) return notFound(res, config)
        const form = await readForm(req)
        const token = form.get('logout_token')
        try {
          const claims = await verifyJwt(token, {
            issuer: config.oidc.issuer,
            audience: config.oidc.clientId,
            jwks,
            clockSkewSeconds: 30,
          })
          const events = claims.events || {}
          if (!Object.prototype.hasOwnProperty.call(events, 'http://schemas.openid.net/event/backchannel-logout')) {
            return send(res, 400, { error: 'invalid_logout_token' }, undefined, {}, config)
          }
          let revoked = 0
          if (claims.sid) {
            const mapped = await store.get(`${OIDC_SID_PREFIX}${claims.sid}`)
            if (mapped && await deleteSession(store, mapped.sid)) revoked += 1
          }
          if (claims.sub) revoked += await revokeUserSessions(store, claims.sub)
          await event(req, null, SECURITY_EVENTS.SESSION_REVOKED, 'warning', { reason: 'backchannel', revoked })
          return send(res, 200, { revoked }, undefined, {}, config)
        } catch {
          return send(res, 400, { error: 'invalid_logout_token' }, undefined, {}, config)
        }
      }

      // ── Account & Security ─────────────────────────────────────────────────────
      if (pathname === '/account/security' && method === 'GET') {
        const session = await requireSession(req, res); if (!session) return
        const sessions = await listUserSessions(store, config, session.sub)
        const events = await log.list(20)
        return send(res, 200, {
          mfa: session.mfa,
          mfaRequired: session.mfaRequired,
          trustedUntil: session.trustedUntil,
          stepUpActive: isStepUpActive(session, config),
          sessions: sessions.map(s => ({ ...publicSession(s, config), current: s.sid === session.sid, lastSeen: new Date(s.lastSeen).toISOString(), fingerprint: s.fingerprint })),
          events: events.filter(e => e.actorSub === session.sub).slice(0, 20),
        }, undefined, {}, config)
      }
      if (pathname === '/account/security/sessions' && method === 'GET') {
        const session = await requireSession(req, res); if (!session) return
        const sessions = await listUserSessions(store, config, session.sub)
        return send(res, 200, { sessions: sessions.map(s => ({ ...publicSession(s, config), current: s.sid === session.sid, lastSeen: new Date(s.lastSeen).toISOString(), fingerprint: s.fingerprint })) }, undefined, {}, config)
      }
      if (pathname.match(/^\/account\/security\/sessions\/[^/]+\/revoke$/) && method === 'POST') {
        const session = await requireSession(req, res); if (!session) return
        if (!requireCsrf(req, res, session)) return
        const sid = decodeURIComponent(pathname.split('/')[4])
        const target = await getSession(store, sid)
        if (!target || target.sub !== session.sub) return send(res, 404, { error: 'not_found' }, undefined, {}, config)
        await deleteSession(store, sid)
        await event(req, session, SECURITY_EVENTS.SESSION_REVOKED, 'warning', { sid })
        return send(res, 200, { revoked: true }, undefined, {}, config)
      }
      if (pathname === '/account/security/events' && method === 'GET') {
        const session = await requireSession(req, res); if (!session) return
        const limit = Math.min(Number(requestUrl.searchParams.get('limit') || 20), 100)
        const events = (await log.list(limit * 4)).filter(e => e.actorSub === session.sub).slice(0, limit)
        return send(res, 200, { events }, undefined, {}, config)
      }
      if (pathname === '/account/security/export' && method === 'GET') {
        const session = await requireSession(req, res); if (!session) return
        if (isPrivileged(session.roles) && !isStepUpActive(session, config)) {
          return send(res, 403, { error: 'step_up_required' }, undefined, {}, config)
        }
        const events = (await log.list(10_000)).filter(e => e.actorSub === session.sub)
        const body = events.map(e => JSON.stringify(e)).join('\n')
        return send(res, 200, body, 'application/x-ndjson', {
          'Content-Disposition': 'attachment; filename="schoolos-security-log.ndjson"',
        }, config)
      }

      // ── Security Centre ────────────────────────────────────────────────────────
      if (pathname.startsWith('/security/') && method === 'GET') {
        const session = await requireSession(req, res); if (!session) return
        if (!hasAnyRole(session, ['PLATFORM_ADMIN', 'DIRECTOR', 'ADMIN', 'IT_ADMIN', 'AUDITOR'])) {
          return send(res, 403, { error: 'forbidden' }, undefined, {}, config)
        }
        const events = await log.list(200)
        if (pathname === '/security/overview') {
          const failures = events.filter(e => e.type === SECURITY_EVENTS.LOGIN_FAILURE).length
          const successes = events.filter(e => e.type === SECURITY_EVENTS.LOGIN_SUCCESS).length
          const lockouts = events.filter(e => e.type === SECURITY_EVENTS.LOGIN_LOCKED).length
          const mfaEvents = events.filter(e => e.type.startsWith('mfa.')).length
          const chain = await log.verify()
          return send(res, 200, {
            loginSuccess: successes, loginFailure: failures, lockouts, mfaEvents,
            auditChain: chain,
            activeSessions: (await listUserSessions(store, config, session.sub)).length,
            lastEvents: events.slice(0, 12),
          }, undefined, {}, config)
        }
        if (pathname === '/security/events') {
          return send(res, 200, { events }, undefined, {}, config)
        }
        if (pathname === '/security/audit/export') {
          if (!isStepUpActive(session, config)) return send(res, 403, { error: 'step_up_required' }, undefined, {}, config)
          const body = await log.exportJsonl()
          await event(req, session, SECURITY_EVENTS.STEP_UP, 'warning', { action: 'audit_export' })
          return send(res, 200, body, 'application/x-ndjson', {
            'Content-Disposition': 'attachment; filename="schoolos-audit.ndjson"',
          }, config)
        }
      }

      // ── Impersonation (support/admin, demo implementation) ────────────────────
      if (pathname === '/admin/impersonate' && method === 'POST') {
        const session = await requireSession(req, res); if (!session) return
        if (!requireCsrf(req, res, session)) return
        if (!hasAnyRole(session, ['PLATFORM_ADMIN', 'ADMIN'])) return send(res, 403, { error: 'forbidden' }, undefined, {}, config)
        if (!isStepUpActive(session, config)) return send(res, 403, { error: 'step_up_required' }, undefined, {}, config)
        if (!config.demoEnabled) return send(res, 501, { error: 'not_implemented' }, undefined, {}, config)
        const body = await readJson(req)
        const target = findDemoAccount(String(body.key || ''))
        if (!target) return send(res, 404, { error: 'not_found' }, undefined, {}, config)
        if (!body.reason || String(body.reason).trim().length < 10) return send(res, 400, { error: 'reason_required' }, undefined, {}, config)
        const resolved = demoAccountForMembership(target.key, body.schoolId)
        if (!resolved) return send(res, 400, { error: 'unknown_membership' }, undefined, {}, config)
        const account = {
          sub: session.sub, email: session.email, name: session.name, locale: session.locale,
          demo: true, memberships: session.memberships,
        }
        const record = await createSession(store, config, {
          account, membership: resolved.membership, amr: [...session.amr, 'impersonation'], req,
          impersonation: {
            actorSub: session.sub, actorName: session.name, targetSub: target.sub,
            targetName: target.name, reason: String(body.reason).slice(0, 200),
            until: Date.now() + Math.min(Number(body.minutes || 15), 30) * 60_000,
          },
        })
        setSessionCookies(res, record)
        await event(req, record, SECURITY_EVENTS.IMPERSONATION_START, 'critical', {
          actorSub: session.sub, target: target.sub, reason: record.impersonation.reason,
        })
        return send(res, 200, publicSession(record, config), undefined, {}, config)
      }
      if (pathname === '/admin/impersonate/stop' && method === 'POST') {
        const session = await requireSession(req, res); if (!session) return
        if (!requireCsrf(req, res, session)) return
        const actor = session.impersonation
        if (!actor) return send(res, 400, { error: 'not_impersonating' }, undefined, {}, config)
        const account = {
          sub: actor.actorSub, email: '', name: actor.actorName, locale: session.locale,
          demo: true, memberships: session.memberships.filter(m => m.schoolId === session.schoolId),
        }
        const membership = session.memberships.find(m => m.schoolId === session.schoolId)
        await deleteSession(store, session.sid)
        const record = await createSession(store, config, { account, membership, amr: ['pwd', 'otp'], req })
        setSessionCookies(res, record)
        await event(req, record, SECURITY_EVENTS.IMPERSONATION_STOP, 'warning', { target: actor.targetSub })
        return send(res, 200, publicSession(record, config), undefined, {}, config)
      }

      // ── API proxy ──────────────────────────────────────────────────────────────
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        const session = await requireSession(req, res)
        if (!session) return
        if (isMutation(method) && !requireCsrf(req, res, session)) return
        if (session.impersonation) {
          if (session.impersonation.until < Date.now()) {
            await deleteSession(store, session.sid)
            return send(res, 403, { error: 'impersonation_expired' }, undefined, {}, config)
          }
          if (/safeguarding|health|concerns|medical/i.test(pathname)) {
            return send(res, 403, { error: 'forbidden_while_impersonating' }, undefined, {}, config)
          }
        }
        let token
        if (config.demoEnabled) {
          token = issueDemoJwt(session, config)
        } else if (accessTokenValid(session)) {
          token = session.oidc.accessToken
        } else {
          const rotated = await rotateRefreshToken(store, config, session, log)
          if (!rotated.ok) {
            await deleteSession(store, session.sid)
            clearSessionCookies(res)
            return send(res, 401, { error: 'unauthenticated', reauth: true }, undefined, {}, config)
          }
          await store.put(`sess:${session.sid}`, session, session.absoluteExpiresAt - Date.now())
          token = session.oidc.accessToken
        }
        return proxyApi(config, req, res, pathname, token, session)
      }

      if (method !== 'GET' && method !== 'HEAD') return notFound(res, config)
      return await serveStatic(config, req, res, pathname)
    } catch (err) {
      const status = err.status || 502
      if (!res.headersSent) {
        send(res, status, {
          error: status === 413 ? 'payload_too_large' : status === 400 ? 'bad_request' : 'bad_gateway',
        }, undefined, {}, config)
      } else {
        res.destroy()
      }
    }
  }

  handler.store = store
  handler.log = log
  handler.limiter = limiter
  handler.credentials = () => credentials
  return handler
}

function currentTotp(secret) {
  return secret ? totp(secret) : null
}

function consumeBackup(entry, code) {
  if (!entry?.backupCodes) return false
  const normalized = String(code || '').trim().toUpperCase()
  const hash = crypto.createHash('sha256').update(`${entry.backupCodes.salt}:${normalized}`).digest('base64url')
  const index = entry.backupCodes.hashes.indexOf(hash)
  if (index < 0) return false
  entry.backupCodes.hashes.splice(index, 1)
  return true
}

async function proxyApi(config, req, res, pathname, token, session) {
  const method = req.method || 'GET'
  const body = ['GET', 'HEAD'].includes(method) ? undefined : await readBody(req)
  const target = new URL(pathname + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''), config.apiBaseUrl)
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Request-Id': req.headers['x-request-id'] || crypto.randomUUID(),
    Accept: req.headers.accept || 'application/json',
  }
  // Deliberately no tenant header: the API derives the tenant from the validated token.
  if (body && req.headers['content-type']) headers['Content-Type'] = req.headers['content-type']
  const upstream = await fetch(target, {
    method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(15000),
  })
  const responseBody = Buffer.from(await upstream.arrayBuffer())
  const out = { ...baseSecurityHeaders(config) }
  const ct = upstream.headers.get('content-type')
  if (ct) out['Content-Type'] = ct
  out['X-Request-Id'] = headers['X-Request-Id']
  if (upstream.status === 401) out['X-Reauth'] = '1'
  res.writeHead(upstream.status, out)
  res.end(responseBody)
}

export async function startServer(config) {
  const app = await createApp(config)
  const server = http.createServer(app)
  return new Promise(resolve => {
    server.listen(config.port, config.host, () => resolve(server))
  })
}

export { SCHOOL_A, SCHOOL_B }
