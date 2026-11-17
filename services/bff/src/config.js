import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..', '..')

function bool(name, fallback, env = process.env) {
  const raw = env[name]
  if (raw == null || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())
}

function num(name, fallback, env = process.env) {
  const raw = env[name]
  if (raw == null || raw === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function csv(name, fallback, env = process.env) {
  const raw = env[name]
  if (raw == null || raw === '') return fallback
  return raw.split(',').map(v => v.trim()).filter(Boolean)
}

/**
 * Configuration is deliberately boring: every security-relevant value comes from the
 * environment, defaults are safe for local HTTP only, and `assertSafeConfig` refuses
 * production-like deployments with demo or weak settings.
 */
export function loadConfig(env = process.env) {
  const profile = (env.SCHOOLOS_PROFILE || env.SPRING_PROFILES_ACTIVE || 'local').toLowerCase()
  const envName = (env.SCHOOLOS_ENV || env.ENV || 'local').toLowerCase()
  const production = ['prod', 'production'].includes(envName)
  const demoMode = bool('DEMO_MODE', false, env)
  const demoEnabled = profile === 'demo' && demoMode && !production
  const issuer = env.OIDC_ISSUER || env.SCHOOLOS_ISSUER_URI || ''
  const secureCookies = bool('COOKIE_SECURE', production || issuer.startsWith('https://'), env)

  return {
    port: Number(env.PORT || 8085),
    host: env.HOST || '0.0.0.0',
    apiBaseUrl: env.API_BASE_URL || 'http://localhost:8080',
    webDist: env.WEB_DIST || path.join(repoRoot, 'apps', 'web', 'dist'),
    profile,
    envName,
    production,
    demoMode,
    demoEnabled,
    credentialsFile: env.DEMO_CREDENTIALS_FILE || path.join(repoRoot, '.demo', 'credentials.json'),
    sessionSecret: env.SESSION_SECRET || 'schoolos-local-session-secret-change-me',
    jwtSecret: env.SCHOOLOS_DEMO_JWT_SECRET || 'schoolos-local-demo-jwt-secret-change-me',
    jwtTtlSeconds: num('JWT_TTL_SECONDS', 300, env),
    sessionTtlSeconds: num('SESSION_TTL_SECONDS', 12 * 3600, env),
    parentSessionTtlSeconds: num('PARENT_SESSION_TTL_SECONDS', 7 * 24 * 3600, env),
    idleTimeoutSeconds: num('IDLE_TIMEOUT_SECONDS', 30 * 60, env),
    privilegedIdleTimeoutSeconds: num('PRIVILEGED_IDLE_TIMEOUT_SECONDS', 15 * 60, env),
    trustDeviceDays: num('TRUST_DEVICE_DAYS', 30, env),
    stepUpSeconds: num('STEP_UP_SECONDS', 10 * 60, env),
    maxPrivilegedSessions: num('MAX_PRIVILEGED_SESSIONS', 5, env),
    secureCookies,
    cookieName: secureCookies ? '__Host-schoolos_session' : 'schoolos_session',
    csrfCookieName: secureCookies ? '__Host-schoolos_csrf' : 'schoolos_csrf',
    allowedOrigins: csv('ALLOWED_ORIGINS', [], env),
    authFloorMs: num('AUTH_RESPONSE_FLOOR_MS', production ? 250 : 60, env),
    rateLimit: {
      windowMs: num('RATE_LIMIT_WINDOW_MS', 60_000, env),
      ipMax: num('RATE_LIMIT_IP_MAX', 60, env),
      accountMax: num('RATE_LIMIT_ACCOUNT_MAX', 8, env),
      lockoutBaseMs: num('LOCKOUT_BASE_MS', 60_000, env),
      lockoutMaxMs: num('LOCKOUT_MAX_MS', 15 * 60_000, env),
      disabled: bool('RATE_LIMIT_DISABLED', false, env),
    },
    store: {
      driver: env.REDIS_URL ? 'redis' : 'memory',
      redisUrl: env.REDIS_URL || '',
      prefix: env.REDIS_PREFIX || 'schoolos:',
    },
    oidc: {
      issuer,
      clientId: env.OIDC_CLIENT_ID || 'schoolos-bff',
      clientSecret: env.OIDC_CLIENT_SECRET || '',
      redirectUri: env.OIDC_REDIRECT_URI || 'http://localhost:3000/auth/callback',
      apiAudience: env.OIDC_API_AUDIENCE || 'schoolos-api',
      scopes: env.OIDC_SCOPES || 'openid profile email organization',
      jwksCacheSeconds: num('OIDC_JWKS_CACHE_SECONDS', 600, env),
      clockSkewSeconds: 30,
    },
    version: env.APP_VERSION || '0.0.1',
    repoRoot,
  }
}

const DEFAULT_SECRETS = new Set([
  'schoolos-local-session-secret-change-me',
  'schoolos-local-demo-jwt-secret-change-me',
  'changeme',
  'change-me',
  '',
])

/**
 * Fail fast instead of running a production-looking deployment with demo or weak settings.
 * The demo profile guard (DemoStartupGuard in the API) is the second half of the same rule.
 */
export function assertSafeConfig(config) {
  const problems = []
  const prodLike = config.production
  if (prodLike) {
    if (config.demoMode || config.demoEnabled || config.profile === 'demo') {
      problems.push('demo mode/profile is enabled')
    }
    if (!config.secureCookies) problems.push('COOKIE_SECURE is false')
    if (config.oidc.issuer && !config.oidc.issuer.startsWith('https://')) {
      problems.push('OIDC issuer is not HTTPS')
    }
    if (DEFAULT_SECRETS.has(config.sessionSecret) || config.sessionSecret.length < 32) {
      problems.push('SESSION_SECRET is missing, default or shorter than 32 chars')
    }
    if (DEFAULT_SECRETS.has(config.jwtSecret) || config.jwtSecret.length < 32) {
      problems.push('SCHOOLOS_DEMO_JWT_SECRET is missing, default or shorter than 32 chars')
    }
    if (!config.oidc.issuer) problems.push('OIDC_ISSUER is missing')
    if (!config.oidc.clientSecret) problems.push('OIDC_CLIENT_SECRET is missing')
  }
  if (config.demoEnabled && !config.production) {
    if (!config.oidc.issuer) {
      // Local demo does not need Keycloak. Keep the issuer optional but never non-local.
    } else if (!/^https?:\/\/(localhost|127\.0\.0\.1|keycloak)(:|\/|$)/.test(config.oidc.issuer)) {
      problems.push('demo mode refuses a non-local OIDC issuer')
    }
    if (/prod|production/.test(config.apiBaseUrl) || /prod|production/.test(process.env.SPRING_DATASOURCE_URL || '')) {
      problems.push('demo mode refuses a production-looking API/database URL')
    }
  }
  if (problems.length) {
    const err = new Error(`Unsafe authentication configuration: ${problems.join('; ')}`)
    err.code = 'unsafe_config'
    throw err
  }
  return true
}

export const INTERNAL_SECRET_DEFAULTS = DEFAULT_SECRETS
