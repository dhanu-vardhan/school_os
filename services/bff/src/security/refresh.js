import crypto from 'node:crypto'
import { refreshTokens } from '../identity/oidc.js'
import { revokeUserSessions } from '../session.js'

const REFRESH_PREFIX = 'refresh:'

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('base64url').slice(0, 32)
}

/**
 * Refresh-token rotation with reuse detection. A reused refresh token means the token was
 * stolen or replayed: the whole family and every session for the subject are revoked and a
 * security event is recorded.
 */
export async function rotateRefreshToken(store, config, session, log) {
  if (!session.oidc?.refreshToken) return { ok: false, reason: 'no_refresh_token' }
  const familyId = session.oidc.familyId || crypto.randomUUID()
  const familyKey = `${REFRESH_PREFIX}${familyId}`
  const family = (await store.get(familyKey)) || { used: [], current: tokenHash(session.oidc.refreshToken), sub: session.sub }
  const presented = tokenHash(session.oidc.refreshToken)
  if (family.used.includes(presented)) {
    await log?.append({
      type: 'token.reuse',
      severity: 'critical',
      actorSub: session.sub,
      schoolId: session.schoolId,
      detail: { familyId },
    })
    await store.put(familyKey, { ...family, revoked: true }, 30 * 86_400_000)
    await revokeUserSessions(store, session.sub)
    return { ok: false, reason: 'token_reuse' }
  }
  if (family.revoked) return { ok: false, reason: 'family_revoked' }

  let tokens
  try {
    tokens = await refreshTokens(config, session.oidc.refreshToken)
  } catch {
    return { ok: false, reason: 'refresh_failed' }
  }
  const nextHash = tokenHash(tokens.refresh_token || session.oidc.refreshToken)
  await store.put(familyKey, {
    ...family,
    used: [...family.used, presented].slice(-20),
    current: nextHash,
  }, 30 * 86_400_000)

  session.oidc = {
    ...session.oidc,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || session.oidc.refreshToken,
    idToken: tokens.id_token || session.oidc.idToken,
    accessExpiresAt: Date.now() + Number(tokens.expires_in || 300) * 1000,
    familyId,
  }
  return { ok: true, tokens }
}

export function accessTokenValid(session) {
  return !!session?.oidc?.accessToken && session.oidc.accessExpiresAt > Date.now() + 15_000
}
