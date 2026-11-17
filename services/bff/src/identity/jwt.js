import crypto from 'node:crypto'

export class JwtError extends Error {
  constructor(message, code = 'invalid_token') {
    super(message)
    this.code = code
  }
}

function decodeSegment(segment) {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
  } catch {
    throw new JwtError('Malformed token segment', 'malformed')
  }
}

export function decodeJwt(token) {
  if (typeof token !== 'string') throw new JwtError('Missing token', 'missing')
  const parts = token.split('.')
  if (parts.length !== 3) throw new JwtError('Malformed token', 'malformed')
  return { header: decodeSegment(parts[0]), payload: decodeSegment(parts[1]), signingInput: `${parts[0]}.${parts[1]}`, signature: Buffer.from(parts[2], 'base64url') }
}

const ALG_MAP = { RS256: 'sha256', RS384: 'sha384', RS512: 'sha512', ES256: 'sha256' }

/**
 * JWKS cache with a hard TTL. Production tokens must be asymmetric; HS256 is accepted only
 * when a demo secret is explicitly provided (demo profile).
 */
export function createJwksCache({ issuer, ttlSeconds = 600, fetchImpl = fetch }) {
  let cached = null
  let fetchedAt = 0
  const url = issuer ? `${issuer.replace(/\/$/, '')}/protocol/openid-connect/certs` : null

  return {
    async keys(force = false) {
      if (!url) throw new JwtError('OIDC issuer is not configured', 'issuer_missing')
      if (!force && cached && Date.now() - fetchedAt < ttlSeconds * 1000) return cached
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) throw new JwtError('JWKS endpoint unavailable', 'jwks_unavailable')
      const body = await res.json()
      cached = Array.isArray(body.keys) ? body.keys : []
      fetchedAt = Date.now()
      return cached
    },
    invalidate() { cached = null; fetchedAt = 0 },
  }
}

function jwkToKey(jwk) {
  if (jwk.kty === 'RSA' && jwk.n && jwk.e) return crypto.createPublicKey({ key: { kty: 'RSA', n: jwk.n, e: jwk.e }, format: 'jwk' })
  if (jwk.kty === 'EC' && jwk.crv === 'P-256' && jwk.x && jwk.y) {
    return crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, format: 'jwk' })
  }
  return null
}

export function verifySignature(jwt, jwksKeys, allowedAlgs = ['RS256', 'RS384', 'RS512', 'ES256']) {
  const { header, signingInput, signature } = jwt
  if (!allowedAlgs.includes(header.alg)) throw new JwtError(`Algorithm not allowed: ${header.alg}`, 'alg_not_allowed')
  const byKid = header.kid ? jwksKeys.filter(k => k.kid === header.kid) : jwksKeys
  const candidates = (byKid.length ? byKid : jwksKeys).filter(k => !k.alg || k.alg === header.alg)
  if (!candidates.length) throw new JwtError('No matching signing key', 'key_not_found')
  for (const jwk of candidates) {
    const key = jwkToKey(jwk)
    if (!key) continue
    const nodeAlg = ALG_MAP[header.alg]
    try {
      const ok = header.alg === 'ES256'
        ? crypto.verify('sha256', Buffer.from(signingInput), { key, dsaEncoding: 'ieee-p1363' }, signature)
        : crypto.verify(nodeAlg, Buffer.from(signingInput), key, signature)
      if (ok) return true
    } catch {
      // try next key
    }
  }
  throw new JwtError('Signature verification failed', 'bad_signature')
}

function verifyClaimTimes(payload, clockSkewSeconds) {
  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || payload.exp + clockSkewSeconds < now) throw new JwtError('Token expired', 'expired')
  if (typeof payload.nbf === 'number' && payload.nbf - clockSkewSeconds > now) throw new JwtError('Token not yet valid', 'not_yet_valid')
  if (typeof payload.iat === 'number' && payload.iat - clockSkewSeconds > now) throw new JwtError('Token issued in the future', 'bad_iat')
}

function audienceMatches(aud, expected) {
  if (!expected) return true
  if (Array.isArray(aud)) return aud.includes(expected)
  return aud === expected
}

/**
 * Verifies an access or ID token. Exactly what is checked is explicit so tests can prove
 * each rejection: algorithm, signature, issuer, audience, expiration, nonce.
 */
export async function verifyJwt(token, {
  issuer,
  audience,
  jwks,
  demoSecret = null,
  clockSkewSeconds = 30,
  expectedNonce = null,
  maxAgeSeconds = null,
} = {}) {
  const jwt = decodeJwt(token)
  const { header, payload } = jwt
  if (header.alg === 'none' || !header.alg) throw new JwtError('Unsigned tokens are refused', 'alg_none')
  if (header.alg === 'HS256') {
    if (!demoSecret) throw new JwtError('HS256 is refused outside demo', 'alg_not_allowed')
    const expected = crypto.createHmac('sha256', demoSecret).update(jwt.signingInput).digest()
    if (expected.length !== jwt.signature.length || !crypto.timingSafeEqual(expected, jwt.signature)) {
      throw new JwtError('Signature verification failed', 'bad_signature')
    }
  } else {
    if (!issuer) throw new JwtError('Issuer not configured', 'issuer_missing')
    const keys = await jwks.keys()
    try {
      verifySignature(jwt, keys)
    } catch (err) {
      // Key rotation: refresh once before failing.
      const refreshed = await jwks.keys(true)
      verifySignature(jwt, refreshed)
    }
  }
  if (issuer && payload.iss !== issuer) throw new JwtError('Issuer mismatch', 'bad_issuer')
  if (!audienceMatches(payload.aud, audience)) throw new JwtError('Audience mismatch', 'bad_audience')
  if (issuer && payload.azp && payload.azp !== audience && Array.isArray(payload.aud) && !payload.aud.includes(payload.azp)) {
    // azp is informational for Keycloak; audience check above is authoritative.
  }
  verifyClaimTimes(payload, clockSkewSeconds)
  if (expectedNonce && payload.nonce !== expectedNonce) throw new JwtError('Nonce mismatch', 'bad_nonce')
  if (maxAgeSeconds != null && typeof payload.auth_time === 'number') {
    if (Math.floor(Date.now() / 1000) - payload.auth_time > maxAgeSeconds) throw new JwtError('Authentication too old', 'auth_too_old')
  }
  return payload
}
