import crypto from 'node:crypto'
import { isPrivileged, needsMfa, ROLES } from './identity/roles.js'
import { fingerprintRequest, fingerprintChanged } from './security/fingerprint.js'

export const SESSION_PREFIX = 'sess:'
export const USER_INDEX_PREFIX = 'user-sessions:'

const b64u = buf => Buffer.from(buf).toString('base64url')

export function parseCookies(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    const key = part.slice(0, i).trim()
    if (key) {
      try { out[key] = decodeURIComponent(part.slice(i + 1).trim()) } catch { /* ignore malformed */ }
    }
  }
  return out
}

function membershipId(m) {
  return `${m.schoolId}:${m.role}`
}

export function baseMemberships(account) {
  return (account.memberships || []).map(m => ({
    schoolId: m.schoolId,
    schoolName: m.schoolName,
    role: m.role,
    childIds: m.childIds || [],
  }))
}

/**
 * Creates and persists a new session. The browser only ever receives the opaque id;
 * every field used for authorisation lives server-side.
 */
export async function createSession(store, config, {
  account,
  membership,
  amr = ['pwd'],
  remember = false,
  authTime = Math.floor(Date.now() / 1000),
  req,
  trustedDevice = false,
  oidc = null,
  impersonation = null,
}) {
  const sid = b64u(crypto.randomBytes(32))
  const now = Date.now()
  const role = membership.role
  const absoluteTtl = role === ROLES.GUARDIAN && remember
    ? config.parentSessionTtlSeconds
    : config.sessionTtlSeconds
  const idleTtl = isPrivileged([role])
    ? config.privilegedIdleTimeoutSeconds
    : config.idleTimeoutSeconds
  const mfa = amr.some(a => ['otp', 'webauthn', 'hwk', 'mfa'].includes(a))
  const record = {
    sid,
    sub: account.sub,
    email: account.email,
    name: account.name,
    locale: account.locale || 'fr',
    roles: [role],
    memberships: baseMemberships(account),
    schoolId: membership.schoolId,
    schoolName: membership.schoolName,
    activeMembership: membershipId(membership),
    demo: !!account.demo,
    csrf: b64u(crypto.randomBytes(32)),
    createdAt: now,
    lastSeen: now,
    authTime,
    amr,
    mfa,
    mfaRequired: needsMfa([role]),
    trustedUntil: trustedDevice ? now + config.trustDeviceDays * 86_400_000 : 0,
    stepUpUntil: 0,
    idleExpiresAt: now + idleTtl * 1000,
    absoluteExpiresAt: now + absoluteTtl * 1000,
    fingerprint: fingerprintRequest(req),
    oidc,
    impersonation,
  }
  await store.put(`${SESSION_PREFIX}${sid}`, record, absoluteTtl * 1000)
  await addUserIndex(store, record.sub, sid, absoluteTtl * 1000)
  await enforceConcurrency(store, config, record)
  return record
}

async function addUserIndex(store, sub, sid, ttlMs) {
  const key = `${USER_INDEX_PREFIX}${sub}`
  const list = (await store.get(key)) || []
  if (!list.includes(sid)) list.push(sid)
  await store.put(key, list, ttlMs)
}

async function enforceConcurrency(store, config, record) {
  if (!isPrivileged(record.roles)) return
  const active = await listUserSessions(store, config, record.sub)
  if (active.length <= config.maxPrivilegedSessions) return
  const sorted = active.sort((a, b) => a.lastSeen - b.lastSeen)
  const excess = sorted.slice(0, active.length - config.maxPrivilegedSessions)
  for (const session of excess) await deleteSession(store, session.sid)
}

export async function getSession(store, sid) {
  if (!sid || typeof sid !== 'string') return null
  return store.get(`${SESSION_PREFIX}${sid}`)
}

export async function deleteSession(store, sid) {
  const record = await getSession(store, sid)
  if (record) {
    const key = `${USER_INDEX_PREFIX}${record.sub}`
    const list = (await store.get(key)) || []
    await store.put(key, list.filter(id => id !== sid))
  }
  await store.del(`${SESSION_PREFIX}${sid}`)
  return !!record
}

export async function listUserSessions(store, config, sub) {
  const ids = (await store.get(`${USER_INDEX_PREFIX}${sub}`)) || []
  const out = []
  for (const sid of ids) {
    const record = await getSession(store, sid)
    if (!record) continue
    if (isExpired(record)) {
      await deleteSession(store, sid)
      continue
    }
    out.push(record)
  }
  return out
}

export async function revokeUserSessions(store, sub, exceptSid = null) {
  const ids = (await store.get(`${USER_INDEX_PREFIX}${sub}`)) || []
  let revoked = 0
  for (const sid of ids) {
    if (sid === exceptSid) continue
    if (await deleteSession(store, sid)) revoked += 1
  }
  return revoked
}

export function isExpired(record, now = Date.now()) {
  return !record || record.absoluteExpiresAt <= now || record.idleExpiresAt <= now
}

/**
 * Reads, validates (absolute + idle + fingerprint signal) and slides a session.
 * A changed fingerprint is a signal, not a hard block: it forces a security event and
 * a step-up for privileged roles.
 */
export async function readSession(req, config, store) {
  const cookies = parseCookies(req.headers.cookie || '')
  const sid = cookies[config.cookieName]
  const record = await getSession(store, sid)
  if (!record) return null
  if (isExpired(record)) {
    await deleteSession(store, sid)
    return null
  }
  const now = Date.now()
  const changed = fingerprintChanged(record.fingerprint, fingerprintRequest(req))
  if (changed) {
    record.fingerprintMismatch = true
    if (isPrivileged(record.roles) && record.stepUpUntil < now) {
      record.stepUpUntil = 0
    }
  }
  // Sliding renewal, never beyond the absolute cap.
  if (now - record.lastSeen > 30_000) {
    record.lastSeen = now
    const idleTtl = isPrivileged(record.roles)
      ? config.privilegedIdleTimeoutSeconds
      : config.idleTimeoutSeconds
    record.idleExpiresAt = Math.min(now + idleTtl * 1000, record.absoluteExpiresAt)
    await store.put(`${SESSION_PREFIX}${sid}`, record, record.absoluteExpiresAt - now)
  }
  return record
}

export function serializeCookie(sid, config) {
  const attrs = [
    `${config.cookieName}=${encodeURIComponent(sid)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Priority=High',
  ]
  if (config.secureCookies) attrs.push('Secure')
  return attrs.join('; ')
}

export function serializeCsrfCookie(token, config) {
  const attrs = [
    `${config.csrfCookieName}=${encodeURIComponent(token)}`,
    'Path=/',
    'SameSite=Lax',
    'Priority=High',
  ]
  if (config.secureCookies) attrs.push('Secure')
  return attrs.join('; ')
}

export function clearCookie(config) {
  const attrs = ['Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (config.secureCookies) attrs.push('Secure')
  return [`${config.cookieName}=; ${attrs.join('; ')}`, `${config.csrfCookieName}=; ${['Path=/', 'SameSite=Lax', 'Max-Age=0', ...(config.secureCookies ? ['Secure'] : [])].join('; ')}`]
}

export function publicSession(record, config) {
  if (!record) return { authenticated: false }
  return {
    authenticated: true,
    user: {
      sub: record.sub,
      name: record.name,
      email: record.email,
      locale: record.locale,
      roles: record.roles,
      schoolId: record.schoolId,
      schoolName: record.schoolName,
      memberships: record.memberships,
      demo: record.demo,
      mfa: record.mfa,
      mfaRequired: record.mfaRequired,
      stepUpUntil: record.stepUpUntil || 0,
      impersonating: record.impersonation || null,
      fingerprintMismatch: !!record.fingerprintMismatch,
    },
    csrfToken: record.csrf,
    expiresAt: new Date(record.absoluteExpiresAt).toISOString(),
    idleExpiresAt: new Date(record.idleExpiresAt).toISOString(),
    authTime: new Date(record.authTime * 1000).toISOString(),
  }
}

export function isStepUpActive(record, config) {
  return !!record && record.stepUpUntil > Date.now()
}

export function markStepUp(record, config) {
  record.stepUpUntil = Date.now() + config.stepUpSeconds * 1000
  return record
}

/** Demo access tokens are the only HS256 tokens in the system and exist only in demo. */
export function issueDemoJwt(record, config) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: 'demo' }))
  const payload = b64u(JSON.stringify({
    sub: record.sub,
    school_id: record.schoolId,
    roles: record.roles,
    name: record.name,
    email: record.email,
    locale: record.locale,
    iss: 'schoolos-demo',
    aud: 'schoolos-api',
    azp: 'schoolos-bff',
    sid: record.sid,
    amr: record.amr,
    auth_time: record.authTime,
    ...(isStepUpActive(record, config) ? { step_up: Math.floor(record.stepUpUntil / 1000) } : {}),
    ...(record.impersonation ? { act: { sub: record.impersonation.actorSub }, impersonated_by: record.impersonation.actorSub } : {}),
    iat: now,
    exp: now + config.jwtTtlSeconds,
    jti: crypto.randomUUID(),
  }))
  const signingInput = `${header}.${payload}`
  return `${signingInput}.${crypto.createHmac('sha256', config.jwtSecret).update(signingInput).digest('base64url')}`
}

export function issueOidcSessionCookie(sid, config) {
  return serializeCookie(sid, config)
}
