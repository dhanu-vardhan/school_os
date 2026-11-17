import crypto from 'node:crypto'

/**
 * Coarse, privacy-preserving session binding signals. We keep a browser family and a
 * network prefix, never the full IP or user agent. A change raises an event and forces
 * step-up for privileged roles; it does not hard-block mobile users changing networks.
 */
export function uaFamily(userAgent = '') {
  const ua = String(userAgent)
  if (/Edg\//.test(ua)) return 'edge'
  if (/OPR\/|Opera/.test(ua)) return 'opera'
  if (/Firefox\//.test(ua)) return 'firefox'
  if (/Chrome\//.test(ua)) return 'chrome'
  if (/Safari\//.test(ua)) return 'safari'
  if (/curl|node|python/i.test(ua)) return 'automation'
  return 'other'
}

export function coarseIp(ip = '') {
  const raw = String(ip).replace(/^::ffff:/, '')
  if (raw.includes(':')) return raw.split(':').slice(0, 3).join(':') // /48-ish for IPv6
  const parts = raw.split('.')
  if (parts.length !== 4) return 'unknown'
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
}

export function requestIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || ''
}

export function fingerprintRequest(req) {
  if (!req) return null
  return {
    ua: uaFamily(req.headers['user-agent']),
    net: coarseIp(requestIp(req)),
    hash: crypto.createHash('sha256')
      .update(`${uaFamily(req.headers['user-agent'])}|${coarseIp(requestIp(req))}`)
      .digest('base64url')
      .slice(0, 22),
  }
}

export function fingerprintChanged(previous, next) {
  if (!previous || !next) return false
  return previous.hash !== next.hash
}

export function redactIp(ip) {
  const raw = String(ip || '').replace(/^::ffff:/, '')
  if (raw.includes(':')) return `${raw.split(':').slice(0, 2).join(':')}:…`
  const parts = raw.split('.')
  if (parts.length !== 4) return 'unknown'
  return `${parts[0]}.${parts[1]}.x.x`
}
