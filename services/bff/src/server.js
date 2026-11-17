import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { URL } from 'node:url'
import {
  COOKIE_NAME, clearCookie, issueJwt, makeSession, publicSession,
  serializeCookie, sessionFromRequest,
} from './session.js'
import { findDemoUser, publicDemoUsers } from './demo-users.js'

const MAX_BODY = 1024 * 1024
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-store',
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function send(res, status, body, contentType = 'application/json; charset=utf-8', extraHeaders = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(payload),
    ...extraHeaders,
  })
  res.end(payload)
}

function notFound(res) {
  send(res, 404, { error: 'not_found' })
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) {
      const err = new Error('payload_too_large')
      err.status = 413
      throw err
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function readJson(req) {
  const raw = await readBody(req)
  if (!raw.length) return {}
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    const err = new Error('invalid_json')
    err.status = 400
    throw err
  }
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': 'same-origin' }
}

function publicConfig(config) {
  return {
    appName: 'SchoolOS',
    version: config.version,
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    authMode: config.demoEnabled ? 'demo' : 'oidc',
    demoEnabled: config.demoEnabled,
    apiBasePath: '/api',
    timezone: 'Europe/Paris',
  }
}

async function serveStatic(config, req, res, pathname) {
  const root = path.resolve(config.webDist)
  let relative
  try {
    relative = decodeURIComponent(pathname).replace(/^\/+/, '')
  } catch {
    return notFound(res)
  }
  let target = path.resolve(root, relative || 'index.html')
  if (target !== root && !target.startsWith(root + path.sep)) return notFound(res)

  let stats
  try {
    stats = await fsp.stat(target)
  } catch {
    if (!path.extname(target)) target = path.join(root, 'index.html')
    else return notFound(res)
    try {
      stats = await fsp.stat(target)
    } catch {
      return notFound(res)
    }
  }
  if (stats.isDirectory()) target = path.join(target, 'index.html')
  const ext = path.extname(target).toLowerCase()
  const contentType = MIME[ext] || 'application/octet-stream'
  const isHtml = ext === '.html'
  const headers = {
    ...(isHtml ? { 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'" } : {}),
    'Cache-Control': isHtml ? 'no-store' : 'public, max-age=3600',
  }
  const stream = fs.createReadStream(target)
  stream.on('error', () => { if (!res.headersSent) notFound(res); else res.destroy() })
  res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': contentType, ...headers, ...corsHeaders() })
  stream.pipe(res)
}

async function proxyApi(config, req, res, pathname, session) {
  if (!session) return send(res, 401, { error: 'unauthenticated' })
  const method = req.method || 'GET'
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = req.headers['x-csrf-token']
    if (!csrf || csrf !== session.csrf) return send(res, 403, { error: 'csrf_failed' })
  }
  const body = ['GET', 'HEAD'].includes(method) ? undefined : await readBody(req)
  const target = new URL(pathname + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''), config.apiBaseUrl)
  const upstream = await fetch(target, {
    method,
    headers: {
      Authorization: `Bearer ${issueJwt(session, config)}`,
      'X-Request-Id': req.headers['x-request-id'] || crypto.randomUUID(),
      ...(session.schoolId ? { 'X-School-Id': session.schoolId } : {}),
      ...(body && req.headers['content-type'] ? { 'Content-Type': req.headers['content-type'] } : {}),
      Accept: req.headers.accept || 'application/json',
    },
    body,
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  })
  const responseBody = Buffer.from(await upstream.arrayBuffer())
  const headers = { ...SECURITY_HEADERS }
  const ct = upstream.headers.get('content-type')
  if (ct) headers['Content-Type'] = ct
  headers['X-Request-Id'] = req.headers['x-request-id'] || ''
  res.writeHead(upstream.status, headers)
  res.end(responseBody)
}

export function createApp(config) {
  return async function handler(req, res) {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const pathname = requestUrl.pathname
    const method = req.method || 'GET'

    try {
      if (pathname === '/healthz' && method === 'GET') {
        return send(res, 200, { status: 'UP', service: 'bff', demoEnabled: config.demoEnabled })
      }
      if (pathname === '/config' && method === 'GET') {
        return send(res, 200, publicConfig(config))
      }
      if (pathname === '/session' && method === 'GET') {
        const session = sessionFromRequest(req, config.sessionSecret)
        return send(res, session ? 200 : 401, publicSession(session))
      }
      if (pathname === '/auth/csrf' && method === 'GET') {
        const session = sessionFromRequest(req, config.sessionSecret)
        return session
          ? send(res, 200, { csrfToken: session.csrf })
          : send(res, 401, { error: 'unauthenticated' })
      }
      if (pathname === '/auth/logout' && method === 'POST') {
        res.setHeader('Set-Cookie', clearCookie(config))
        return send(res, 204, '')
      }
      if (pathname === '/demo/session' && method === 'POST') {
        if (!config.demoEnabled) return send(res, 404, { error: 'not_found' })
        const input = await readJson(req)
        const user = findDemoUser(input.role, input.schoolId)
        if (!user) return send(res, 400, { error: 'unknown_demo_role' })
        const session = makeSession({
          sub: user.sub, schoolId: user.schoolId, roles: user.apiRoles,
          name: user.name, demo: true,
        }, config)
        res.setHeader('Set-Cookie', serializeCookie(session, config))
        return send(res, 200, publicSession(session))
      }
      if (pathname === '/demo/users' && method === 'GET') {
        if (!config.demoEnabled) return send(res, 404, { error: 'not_found' })
        return send(res, 200, { users: publicDemoUsers() })
      }
      if (pathname === '/auth/login' || pathname === '/auth/callback') {
        return send(res, 400, { error: 'oidc_not_configured', hint: config.demoEnabled ? 'use POST /demo/session' : 'configure Keycloak' })
      }
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        const session = sessionFromRequest(req, config.sessionSecret)
        return await proxyApi(config, req, res, pathname, session)
      }
      if (method !== 'GET' && method !== 'HEAD') return notFound(res)
      return await serveStatic(config, req, res, pathname)
    } catch (err) {
      const status = err.status || 502
      if (!res.headersSent) send(res, status, { error: status === 413 ? 'payload_too_large' : 'bad_gateway' })
      else res.destroy()
    }
  }
}

export function startServer(config) {
  const server = http.createServer(createApp(config))
  return new Promise(resolve => {
    server.listen(config.port, config.host, () => resolve(server))
  })
}

export { COOKIE_NAME }
