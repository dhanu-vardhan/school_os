import crypto from 'node:crypto'
import { requestIp } from './fingerprint.js'

/**
 * Token buckets for login/reset/invite endpoints. In-process by design for a single BFF
 * instance; a multi-instance deployment enables the Redis-backed counter through the
 * same interface (see docs/AUTH_DESIGN.md §7 and the deployment note).
 */
export class RateLimiter {
  constructor(config, clock = () => Date.now()) {
    this.config = config
    this.clock = clock
    this.buckets = new Map()
  }

  #bucket(key, windowMs) {
    const now = this.clock()
    let bucket = this.buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs, failures: 0, blockedUntil: 0 }
      this.buckets.set(key, bucket)
    }
    return bucket
  }

  hit(key, limit, windowMs) {
    if (this.config.disabled) return { allowed: true, remaining: limit }
    const bucket = this.#bucket(key, windowMs)
    bucket.count += 1
    if (bucket.count > limit) {
      return { allowed: false, retryAfterMs: Math.max(0, bucket.resetAt - this.clock()), remaining: 0 }
    }
    return { allowed: true, remaining: Math.max(0, limit - bucket.count) }
  }

  /** Exponential backoff after repeated failures for the same account. */
  failure(key) {
    if (this.config.disabled) return 0
    const bucket = this.#bucket(`fail:${key}`, 24 * 3600_000)
    bucket.failures += 1
    if (bucket.failures < this.config.accountMax) return 0
    const exponent = Math.min(bucket.failures - this.config.accountMax, 5)
    const wait = Math.min(this.config.lockoutBaseMs * 2 ** exponent, this.config.lockoutMaxMs)
    bucket.blockedUntil = this.clock() + wait
    return wait
  }

  success(key) {
    this.buckets.delete(`fail:${key}`)
  }

  blocked(key) {
    if (this.config.disabled) return 0
    const bucket = this.buckets.get(`fail:${key}`)
    if (!bucket) return 0
    return Math.max(0, bucket.blockedUntil - this.clock())
  }

  checkLogin(req, accountKey) {
    const ip = requestIp(req) || 'unknown'
    const ipCheck = this.hit(`ip:${ip}`, this.config.ipMax, this.config.windowMs)
    if (!ipCheck.allowed) return { ...ipCheck, scope: 'ip' }
    const wait = this.blocked(accountKey)
    if (wait > 0) return { allowed: false, retryAfterMs: wait, scope: 'account' }
    return { allowed: true, remaining: ipCheck.remaining }
  }

  reset() {
    this.buckets.clear()
  }
}

export function retryAfterSeconds(ms) {
  return Math.max(1, Math.ceil(ms / 1000))
}

export function rateKey(identifier = '') {
  return crypto.createHash('sha256').update(String(identifier).toLowerCase()).digest('base64url').slice(0, 24)
}
