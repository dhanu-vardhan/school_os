import crypto from 'node:crypto'

const SENSITIVE_KEYS = /^(password|passwd|token|access_token|refresh_token|id_token|secret|totp|code|backup|authorization|cookie)$/i

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`
}

function scrub(value, depth = 0) {
  if (depth > 4 || value == null) return value
  if (Array.isArray(value)) return value.slice(0, 20).map(v => scrub(v, depth + 1))
  if (typeof value !== 'object') return value
  const out = {}
  for (const [key, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.test(key)) continue
    out[key] = scrub(v, depth + 1)
  }
  return out
}

/**
 * Append-only, tamper-evident security log. Every record includes the previous hash and a
 * SHA-256 over the canonical record, so deleting or editing an entry in the middle breaks
 * `verify()`. Secrets are stripped before hashing; callers must still avoid PII.
 */
export class SecurityLog {
  constructor(store, clock = () => Date.now()) {
    this.store = store
    this.clock = clock
    this.tail = null
    this.queue = Promise.resolve()
  }

  async #loadTail() {
    if (this.tail) return this.tail
    const all = await this.store.allAudit()
    this.tail = all.length
      ? { seq: all[all.length - 1].seq, hash: all[all.length - 1].hash }
      : { seq: 0, hash: 'GENESIS' }
    return this.tail
  }

  append({ type, severity = 'info', actorSub = null, schoolId = null, ip = null, ua = null, detail = {} }) {
    const run = async () => {
      const tail = await this.#loadTail()
      const seq = tail.seq + 1
      const body = {
        seq,
        at: new Date(this.clock()).toISOString(),
        type,
        severity,
        actorSub,
        schoolId,
        ip,
        ua,
        detail: scrub(detail),
        prevHash: tail.hash,
      }
      const hash = crypto.createHash('sha256').update(`${body.prevHash}|${canonical(body)}`).digest('base64url')
      const event = { ...body, hash }
      await this.store.appendAudit(event)
      this.tail = { seq, hash }
      return event
    }
    this.queue = this.queue.then(run, run)
    return this.queue
  }

  async list(limit = 100) {
    const events = await this.store.listAudit(limit)
    return events.map(({ prevHash, ...rest }) => ({ ...rest, previousHash: prevHash }))
  }

  async all() {
    return this.store.allAudit()
  }

  async verify() {
    const events = await this.store.allAudit()
    let previous = 'GENESIS'
    for (const event of events) {
      const { hash, ...body } = event
      const expected = crypto.createHash('sha256').update(`${previous}|${canonical(body)}`).digest('base64url')
      if (body.prevHash !== previous || hash !== expected) {
        return { valid: false, brokenAt: event.seq, checked: events.length }
      }
      previous = hash
    }
    return { valid: true, checked: events.length }
  }

  async exportJsonl(limit = 10_000) {
    const events = await this.store.listAudit(limit)
    return events.map(e => JSON.stringify(e)).join('\n') + (events.length ? '\n' : '')
  }
}

export const SECURITY_EVENTS = Object.freeze({
  LOGIN_SUCCESS: 'login.success',
  LOGIN_FAILURE: 'login.failure',
  LOGIN_LOCKED: 'login.locked',
  LOGOUT: 'session.logout',
  SESSION_REVOKED: 'session.revoked',
  SESSION_EXPIRED: 'session.expired',
  TENANT_SWITCH: 'tenant.switch',
  MFA_CHALLENGE: 'mfa.challenge',
  MFA_SUCCESS: 'mfa.success',
  MFA_FAILURE: 'mfa.failure',
  MFA_ENROLLED: 'mfa.enrolled',
  MFA_REMOVED: 'mfa.removed',
  STEP_UP: 'mfa.step_up',
  PASSWORD_RESET_REQUEST: 'password.reset_request',
  PASSWORD_RESET: 'password.reset',
  INVITE_ACCEPTED: 'invite.accepted',
  TOKEN_REUSE: 'token.reuse',
  IMPERSONATION_START: 'impersonation.start',
  IMPERSONATION_STOP: 'impersonation.stop',
  POLICY_DENIED: 'policy.denied',
  DEMO_RESET: 'demo.reset',
})
