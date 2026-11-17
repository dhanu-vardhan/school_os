import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..', '..')

function bool(name, fallback) {
  const raw = process.env[name]
  if (raw == null || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())
}

export function loadConfig(env = process.env) {
  const demoEnabled = bool('DEMO_ENABLED', false) || bool('SCHOOLOS_DEMO', false) ||
    ['demo', 'local'].includes((env.SCHOOLOS_PROFILE || '').toLowerCase())
  return {
    port: Number(env.PORT || 8085),
    host: env.HOST || '0.0.0.0',
    apiBaseUrl: env.API_BASE_URL || 'http://localhost:8080',
    webDist: env.WEB_DIST || path.join(repoRoot, 'apps', 'web', 'dist'),
    demoEnabled,
    sessionSecret: env.SESSION_SECRET || 'schoolos-local-session-secret-change-me',
    jwtSecret: env.SCHOOLOS_DEMO_JWT_SECRET || 'schoolos-local-demo-jwt-secret-change-me',
    jwtTtlSeconds: Number(env.JWT_TTL_SECONDS || 300),
    sessionTtlSeconds: Number(env.SESSION_TTL_SECONDS || 28800),
    secureCookies: bool('COOKIE_SECURE', false),
    envName: (env.SCHOOLOS_ENV || env.ENV || 'local').toLowerCase(),
    version: env.APP_VERSION || '0.0.1',
    repoRoot,
  }
}
