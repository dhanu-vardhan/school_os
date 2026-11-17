import crypto from 'node:crypto'

export const COOKIE_NAME = 'schoolos_session'

const b64u = buf => Buffer.from(buf).toString('base64url')
const unb64u = str => Buffer.from(str, 'base64url')

function mac(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url')
}

export function encodeSession(session, secret) {
  const payload = b64u(JSON.stringify(session))
  return `${payload}.${mac(payload, secret)}`
}

export function decodeSession(token, secret) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, signature] = parts
  const expected = mac(payload, secret)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const session = JSON.parse(unb64u(payload).toString('utf8'))
    if (!session || typeof session.exp !== 'number' || session.exp <= Date.now()) return null
    if (!session.sub || !session.schoolId || !Array.isArray(session.roles)) return null
    return session
  } catch {
    return null
  }
}

export function parseCookies(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    const key = part.slice(0, i).trim()
    if (key) out[key] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export function sessionFromRequest(req, secret) {
  return decodeSession(parseCookies(req.headers.cookie)[COOKIE_NAME], secret)
}

export function serializeCookie(session, config) {
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(encodeSession(session, config.sessionSecret))}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (config.secureCookies) attrs.push('Secure')
  return attrs.join('; ')
}

export function clearCookie(config) {
  const attrs = ['Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (config.secureCookies) attrs.push('Secure')
  return [`${COOKIE_NAME}=; ${attrs.join('; ')}`]
}

export function makeSession({ sub, schoolId, roles, name, locale = 'fr', demo = false }, config) {
  return {
    sub,
    schoolId,
    roles,
    name,
    locale,
    demo,
    csrf: crypto.randomBytes(16).toString('hex'),
    exp: Date.now() + config.sessionTtlSeconds * 1000,
  }
}

export function publicSession(session) {
  if (!session) return { authenticated: false }
  return {
    authenticated: true,
    user: {
      sub: session.sub,
      name: session.name,
      locale: session.locale,
      roles: session.roles,
      schoolId: session.schoolId,
      demo: session.demo,
    },
    csrfToken: session.csrf,
    expiresAt: new Date(session.exp).toISOString(),
  }
}

function jwtSegment(value) {
  return b64u(JSON.stringify(value))
}

export function issueJwt(session, config) {
  const now = Math.floor(Date.now() / 1000)
  const header = jwtSegment({ alg: 'HS256', typ: 'JWT' })
  const payload = jwtSegment({
    sub: session.sub,
    school_id: session.schoolId,
    roles: session.roles,
    name: session.name,
    locale: session.locale,
    iss: 'schoolos-demo',
    iat: now,
    exp: now + config.jwtTtlSeconds,
  })
  const signingInput = `${header}.${payload}`
  return `${signingInput}.${mac(signingInput, config.jwtSecret)}`
}
