import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { verifyJwt, JwtError } from '../src/identity/jwt.js'
import { otpauthUrl, totp, verifyTotp, base32Decode, base32Encode, generateBackupCodes, hashBackupCodes, consumeBackupCode } from '../src/identity/totp.js'
import { hashPassword, verifyPassword, passwordPolicy, passwordStrength } from '../src/identity/passwords.js'

const b64u = value => Buffer.from(JSON.stringify(value)).toString('base64url')

function rsaFixture() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const jwk = publicKey.export({ format: 'jwk' })
  const sign = (payload, header = { alg: 'RS256', typ: 'JWT', kid: 'test-key' }) => {
    const input = `${b64u(header)}.${b64u(payload)}`
    return `${input}.${crypto.sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')}`
  }
  return { jwk, sign }
}

const now = () => Math.floor(Date.now() / 1000)

test('valid RS256 token is accepted; issuer, audience and expiry are enforced', async () => {
  const { jwk, sign } = rsaFixture()
  const jwks = { keys: async () => [jwk] }
  const payload = { sub: 'u1', iss: 'https://issuer.example', aud: 'schoolos-api', exp: now() + 60, iat: now() }
  const claims = await verifyJwt(sign(payload), { issuer: 'https://issuer.example', audience: 'schoolos-api', jwks })
  assert.equal(claims.sub, 'u1')

  await assert.rejects(verifyJwt(sign({ ...payload, iss: 'https://evil.example' }), {
    issuer: 'https://issuer.example', audience: 'schoolos-api', jwks,
  }), err => err instanceof JwtError && err.code === 'bad_issuer')

  await assert.rejects(verifyJwt(sign(payload), {
    issuer: 'https://issuer.example', audience: 'other-api', jwks,
  }), err => err.code === 'bad_audience')

  await assert.rejects(verifyJwt(sign({ ...payload, exp: now() - 120 }), {
    issuer: 'https://issuer.example', audience: 'schoolos-api', jwks,
  }), err => err.code === 'expired')
})

test('tampered signature, alg=none and HS256 outside demo are rejected', async () => {
  const { jwk, sign } = rsaFixture()
  const jwks = { keys: async () => [jwk] }
  const payload = { sub: 'u1', iss: 'https://issuer.example', aud: 'schoolos-api', exp: now() + 60 }
  const token = sign(payload)
  const tampered = `${token.slice(0, -4)}AAAA`
  await assert.rejects(verifyJwt(tampered, { issuer: 'https://issuer.example', audience: 'schoolos-api', jwks }), err => err.code === 'bad_signature')

  const none = `${b64u({ alg: 'none', typ: 'JWT' })}.${b64u(payload)}.`
  await assert.rejects(verifyJwt(none, { issuer: 'https://issuer.example', audience: 'schoolos-api', jwks }), err => err.code === 'alg_none')

  const hsInput = `${b64u({ alg: 'HS256' })}.${b64u(payload)}`
  const hs = `${hsInput}.${crypto.createHmac('sha256', 'secret').update(hsInput).digest('base64url')}`
  await assert.rejects(verifyJwt(hs, { issuer: 'https://issuer.example', audience: 'schoolos-api', jwks }), err => err.code === 'alg_not_allowed')
})

test('HS256 demo tokens verify only with the explicit demo secret', async () => {
  const payload = { sub: 'demo-teacher', iss: 'schoolos-demo', aud: 'schoolos-api', exp: now() + 60 }
  const input = `${b64u({ alg: 'HS256' })}.${b64u(payload)}`
  const token = `${input}.${crypto.createHmac('sha256', 'demo-secret').update(input).digest('base64url')}`
  const claims = await verifyJwt(token, { demoSecret: 'demo-secret', issuer: 'schoolos-demo', audience: 'schoolos-api' })
  assert.equal(claims.sub, 'demo-teacher')
  await assert.rejects(verifyJwt(token, { demoSecret: 'other', issuer: 'schoolos-demo' }), err => err.code === 'bad_signature')
})

test('TOTP matches the RFC 6238 SHA-1 test vector', () => {
  // ASCII "12345678901234567890" base32-encoded.
  const secret = base32Encode(Buffer.from('12345678901234567890'))
  assert.equal(totp(secret, 59_000, 30, 8), '94287082')
  assert.equal(totp(secret, 1_111_111_109_000, 30, 8), '07081804')
  assert.equal(verifyTotp(secret, totp(secret), { window: 0 }), true)
  assert.equal(verifyTotp(secret, '000000', { window: 0 }), false)
  assert.equal(base32Decode(secret).toString(), '12345678901234567890')
  assert.match(otpauthUrl({ secret, account: 'a@b.c' }), /^otpauth:\/\/totp\//)
})

test('backup codes are single-use', () => {
  const codes = generateBackupCodes(3)
  const hashed = hashBackupCodes(codes)
  assert.equal(consumeBackupCode(null, hashed, codes[0]), true)
  assert.equal(consumeBackupCode(null, hashed, codes[0]), false)
  assert.equal(hashed.hashes.length, 2)
})

test('password hashing is slow-hash based and verifies', () => {
  const hash = hashPassword('a sufficiently long passphrase')
  assert.match(hash, /^scrypt\$/)
  assert.equal(verifyPassword('a sufficiently long passphrase', hash), true)
  assert.equal(verifyPassword('wrong password here', hash), false)
  assert.equal(verifyPassword('x', 'plaintext'), false)
})

test('password policy requires 12/14 chars, blocks common and identifier-based passwords', () => {
  assert.equal(passwordPolicy('short').ok, false)
  assert.equal(passwordPolicy('password1234').ok, false)
  assert.equal(passwordPolicy('alice.martin@demo.schoolos.invalid', { identifier: 'alice.martin@demo.schoolos.invalid' }).ok, false)
  assert.equal(passwordPolicy('a long and memorable passphrase').ok, true)
  assert.equal(passwordPolicy('a long and memorable passphrase', { privileged: true }).ok, true)
  assert.equal(passwordPolicy('elevenchars').ok, false)
  assert.equal(passwordPolicy('elevenchars').minLength, 12)
  assert.equal(passwordStrength('a long and memorable passphrase') >= 3, true)
})
