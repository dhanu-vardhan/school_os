import crypto from 'node:crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf) {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const out = []
  for (const char of clean) {
    const idx = ALPHABET.indexOf(char)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

export function generateTotpSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes))
}

export function hotp(secret, counter, digits = 6) {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const digest = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return String(binary % 10 ** digits).padStart(digits, '0')
}

export function totp(secret, atMs = Date.now(), stepSeconds = 30, digits = 6) {
  return hotp(secret, Math.floor(atMs / 1000 / stepSeconds), digits)
}

export function verifyTotp(secret, code, { atMs = Date.now(), window = 1, stepSeconds = 30 } = {}) {
  if (!secret || !/^\d{6}$/.test(String(code || '').replace(/\s/g, ''))) return false
  const input = String(code).replace(/\s/g, '')
  const counter = Math.floor(atMs / 1000 / stepSeconds)
  for (let offset = -window; offset <= window; offset++) {
    const expected = hotp(secret, counter + offset)
    if (crypto.timingSafeEqual(Buffer.from(input), Buffer.from(expected))) return true
  }
  return false
}

export function otpauthUrl({ secret, account, issuer = 'SchoolOS' }) {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' })
  return `otpauth://totp/${label}?${params.toString()}`
}

export function generateBackupCodes(count = 10) {
  const codes = []
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase()
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`)
  }
  return codes
}

export function hashBackupCodes(codes, salt = crypto.randomBytes(16).toString('base64url')) {
  return {
    salt,
    hashes: codes.map(code => crypto.createHash('sha256').update(`${salt}:${code}`).digest('base64url')),
  }
}

export function consumeBackupCode(store, hashes, code) {
  const normalized = String(code || '').trim().toUpperCase()
  const hash = crypto.createHash('sha256').update(`${hashes.salt}:${normalized}`).digest('base64url')
  const index = hashes.hashes.indexOf(hash)
  if (index < 0) return false
  hashes.hashes.splice(index, 1)
  return true
}
