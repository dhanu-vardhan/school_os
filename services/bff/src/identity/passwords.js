import crypto from 'node:crypto'

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 }

/**
 * Password hashing with Node's scrypt (memory-hard, built-in). Keycloak owns credentials in
 * production; this module is used by the demo identity adapter and the invitation/reset
 * flows so no plaintext or fast hash is ever stored.
 */
export function hashPassword(password, salt = crypto.randomBytes(16)) {
  const derived = crypto.scryptSync(String(password), salt, SCRYPT.keylen, {
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024,
  })
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, N, r, p, saltB64, hashB64] = parts
  try {
    const expected = Buffer.from(hashB64, 'base64url')
    const derived = crypto.scryptSync(String(password), Buffer.from(saltB64, 'base64url'), expected.length, {
      N: Number(N), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
    })
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived)
  } catch {
    return false
  }
}

export function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

export function newOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url')
}

/** Reset/invitation tokens are stored hashed; the raw value only exists in the link. */
export function hashToken(token, pepper) {
  return crypto.createHmac('sha256', pepper).update(String(token)).digest('base64url')
}

export function generatePassword(length = 20) {
  // base64url has no ambiguous characters and yields ~119 bits at 20 chars.
  return crypto.randomBytes(Math.ceil((length * 3) / 4)).toString('base64url').slice(0, length)
}

const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'motdepasse', 'azerty', 'azerty123',
  'qwerty', 'qwerty123', '123456789012', '1234567890123', '000000000000', 'iloveyou',
  'admin', 'admin123', 'welcome', 'welcome123', 'letmein', 'schoolos', 'schoolos123',
  'changeme', 'changeme123', 'demo12345678', 'passepartout', 'soleil12345', 'liverpool',
])

export function passwordPolicy(password, { privileged = false, identifier = '' } = {}) {
  const value = String(password || '')
  const min = privileged ? 14 : 12
  const issues = []
  if (value.length < min) issues.push(`min_length_${min}`)
  if (value.length > 128) issues.push('max_length_128')
  const lower = value.toLowerCase()
  if (COMMON.has(lower) || /(password|motdepasse|azerty|qwerty|123456|changeme)/.test(lower)) issues.push('common_password')
  const local = String(identifier || '').toLowerCase()
  if (local && value.toLowerCase().includes(local.split('@')[0])) issues.push('contains_identifier')
  if (/^(.)\1+$/.test(value)) issues.push('repeated_character')
  if (/^(0123|1234|abcd|azerty|qwerty)/i.test(value)) issues.push('predictable_pattern')
  return { ok: issues.length === 0, issues, minLength: min }
}

export function passwordStrength(password) {
  const value = String(password || '')
  let score = Math.min(4, Math.floor(value.length / 5))
  if (/\s/.test(value)) score += 1 // passphrases encouraged
  if (/[0-9]/.test(value) && /[a-zA-Z]/.test(value)) score += 1
  if (/[^a-zA-Z0-9]/.test(value)) score += 1
  if (COMMON.has(value.toLowerCase())) score = 0
  return Math.max(0, Math.min(4, score))
}
