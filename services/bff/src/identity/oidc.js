import crypto from 'node:crypto'
import { createJwksCache, verifyJwt } from './jwt.js'
import { normalizeRole, highestRole } from './roles.js'

export const OIDC_FLOW_PREFIX = 'oidc:flow:'

/** PKCE (RFC 7636 S256) and state/nonce generation. No home-made crypto. */
export function createPkcePair() {
  const verifier = crypto.randomBytes(64).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

const discoveryCache = new Map()

export async function getDiscovery(config) {
  const issuer = config.oidc.issuer.replace(/\/$/, '')
  const cached = discoveryCache.get(issuer)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  const res = await fetch(`${issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`OIDC discovery failed (${res.status})`)
  const value = await res.json()
  discoveryCache.set(issuer, { value, expiresAt: Date.now() + 600_000 })
  return value
}

export function oidcEnabled(config) {
  return !!config.oidc.issuer && !!config.oidc.clientSecret
}

export async function beginOidcFlow(store, config, { returnTo = '/app/dashboard', prompt, acrValues, loginHint } = {}) {
  const discovery = await getDiscovery(config)
  const { verifier, challenge } = createPkcePair()
  const state = crypto.randomBytes(24).toString('base64url')
  const nonce = crypto.randomBytes(24).toString('base64url')
  await store.put(`${OIDC_FLOW_PREFIX}${state}`, {
    verifier, nonce, returnTo, createdAt: Date.now(), prompt, acrValues,
  }, 10 * 60_000)
  const url = new URL(discovery.authorization_endpoint)
  url.searchParams.set('client_id', config.oidc.clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', config.oidc.redirectUri)
  url.searchParams.set('scope', config.oidc.scopes)
  url.searchParams.set('state', state)
  url.searchParams.set('nonce', nonce)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  if (prompt) url.searchParams.set('prompt', prompt)
  if (acrValues) url.searchParams.set('acr_values', acrValues)
  if (loginHint) url.searchParams.set('login_hint', loginHint)
  return { url: url.toString(), state }
}

function basicAuth(clientId, clientSecret) {
  return `Basic ${Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`).toString('base64')}`
}

export async function exchangeCode(config, { code, verifier }) {
  const discovery = await getDiscovery(config)
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.oidc.redirectUri,
    client_id: config.oidc.clientId,
    code_verifier: verifier,
  })
  const res = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: basicAuth(config.oidc.clientId, config.oidc.clientSecret),
    },
    body,
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`)
  return res.json()
}

export async function refreshTokens(config, refreshToken) {
  const discovery = await getDiscovery(config)
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.oidc.clientId,
  })
  const res = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: basicAuth(config.oidc.clientId, config.oidc.clientSecret),
    },
    body,
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Refresh failed (${res.status})`)
  return res.json()
}

export async function fetchUserInfo(config, accessToken) {
  const discovery = await getDiscovery(config)
  const res = await fetch(discovery.userinfo_endpoint, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error('Userinfo failed')
  return res.json()
}

export function logoutUrl(config, { idTokenHint, postLogoutRedirectUri } = {}) {
  if (!config.oidc.issuer) return null
  const url = new URL(`${config.oidc.issuer.replace(/\/$/, '')}/protocol/openid-connect/logout`)
  if (idTokenHint) url.searchParams.set('id_token_hint', idTokenHint)
  if (postLogoutRedirectUri) url.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri)
  return url.toString()
}

export function jwksFor(config) {
  return createJwksCache({ issuer: config.oidc.issuer, ttlSeconds: config.oidc.jwksCacheSeconds })
}

function rolesFromClaims(claims) {
  const roles = [
    ...(claims.realm_access?.roles || []),
    ...(claims.resource_access?.[configRoleClient(claims)]?.roles || []),
  ]
  return roles.map(normalizeRole).filter(Boolean)
}

function configRoleClient() {
  return 'schoolos-bff'
}

/**
 * Keycloak Organizations are mapped with the convention `alias = school UUID`
 * (optionally `school:<uuid>`). The membership role comes from the realm role.
 * This is documented in AUTH_DESIGN §2; a dedicated Organization-role mapper can replace
 * it without changing the session model.
 */
export function membershipsFromClaims(claims) {
  const roles = rolesFromClaims(claims)
  const role = highestRole(roles) || normalizeRole(claims.school_role) || 'TEACHER'
  const orgs = claims.organizations && typeof claims.organizations === 'object'
    ? Object.keys(claims.organizations)
    : []
  const ids = orgs.length ? orgs : [claims.school_id].filter(Boolean)
  return ids.map(raw => {
    const id = String(raw).replace(/^school:/, '')
    return {
      schoolId: id,
      schoolName: claims.organization_names?.[raw] || `Établissement ${id.slice(0, 8)}`,
      role,
    }
  })
}

export async function completeOidcFlow(store, config, { code, state }) {
  const flow = await store.get(`${OIDC_FLOW_PREFIX}${state}`)
  if (!flow) throw new Error('OIDC state is unknown or expired')
  await store.del(`${OIDC_FLOW_PREFIX}${state}`)
  const tokens = await exchangeCode(config, { code, verifier: flow.verifier })
  const jwks = jwksFor(config)
  if (tokens.id_token) {
    await verifyJwt(tokens.id_token, {
      issuer: config.oidc.issuer,
      audience: config.oidc.clientId,
      jwks,
      expectedNonce: flow.nonce,
      clockSkewSeconds: config.oidc.clockSkewSeconds,
    })
  }
  const accessClaims = tokens.access_token
    ? await verifyJwt(tokens.access_token, {
      issuer: config.oidc.issuer,
      jwks,
      clockSkewSeconds: config.oidc.clockSkewSeconds,
    })
    : {}
  const userinfo = tokens.access_token ? await fetchUserInfo(config, tokens.access_token).catch(() => ({})) : {}
  const claims = { ...accessClaims, ...userinfo }
  const sub = claims.sub || accessClaims.sub
  if (!sub) throw new Error('OIDC token has no subject')
  const memberships = membershipsFromClaims(claims)
  if (!memberships.length) throw new Error('No school membership in token')
  return {
    flow,
    tokens,
    account: {
      sub,
      email: claims.email || '',
      name: claims.name || claims.preferred_username || sub,
      locale: (claims.locale || 'fr').slice(0, 2),
      demo: false,
      memberships,
    },
  }
}
