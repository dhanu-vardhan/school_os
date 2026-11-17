import net from 'node:net'
import { URL } from 'node:url'

/**
 * Minimal RESP2 client for Redis, deliberately dependency-free like the rest of the BFF.
 * Only the commands the session/audit store needs are implemented. For production use a
 * managed Redis with TLS in front of this link (or swap in an official client later).
 */
class RespConnection {
  constructor(url) {
    this.url = new URL(url)
    this.socket = null
    this.buffer = Buffer.alloc(0)
    this.waiters = []
    this.connecting = null
  }

  async connect() {
    if (this.socket && !this.socket.destroyed) return
    if (this.connecting) return this.connecting
    this.connecting = new Promise((resolve, reject) => {
      const socket = net.createConnection({
        host: this.url.hostname,
        port: Number(this.url.port || 6379),
      })
      socket.setNoDelay(true)
      socket.once('connect', () => {
        this.socket = socket
        this.connecting = null
        if (this.url.password) {
          this.send('AUTH', this.url.password).then(() => resolve()).catch(reject)
        } else {
          resolve()
        }
      })
      socket.on('data', chunk => this.onData(chunk))
      socket.on('error', err => {
        this.connecting = null
        while (this.waiters.length) this.waiters.shift().reject(err)
        reject(err)
      })
      socket.on('close', () => {
        this.socket = null
        while (this.waiters.length) this.waiters.shift().reject(new Error('redis closed'))
      })
    })
    return this.connecting
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    while (this.waiters.length) {
      const parsed = parseResp(this.buffer, 0)
      if (!parsed) break
      this.buffer = this.buffer.subarray(parsed.next)
      const waiter = this.waiters.shift()
      if (parsed.error) waiter.reject(parsed.error)
      else waiter.resolve(parsed.value)
    }
  }

  async send(...args) {
    await this.connect()
    const payload = encodeCommand(args)
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject })
      this.socket.write(payload)
    })
  }

  close() {
    this.socket?.end()
    this.socket = null
  }
}

function encodeCommand(args) {
  const parts = [`*${args.length}\r\n`]
  for (const arg of args) {
    const str = String(arg)
    parts.push(`$${Buffer.byteLength(str)}\r\n${str}\r\n`)
  }
  return Buffer.from(parts.join(''), 'utf8')
}

function parseResp(buf, offset) {
  if (offset >= buf.length) return null
  const marker = String.fromCharCode(buf[offset])
  const lineEnd = buf.indexOf('\r\n', offset + 1)
  if (lineEnd < 0) return null
  const line = buf.subarray(offset + 1, lineEnd).toString('utf8')
  if (marker === '+') return { value: line, next: lineEnd + 2 }
  if (marker === '-') return { error: new Error(line), next: lineEnd + 2 }
  if (marker === ':') return { value: Number(line), next: lineEnd + 2 }
  if (marker === '$') {
    const length = Number(line)
    if (length === -1) return { value: null, next: lineEnd + 2 }
    const start = lineEnd + 2
    if (buf.length < start + length + 2) return null
    return { value: buf.subarray(start, start + length).toString('utf8'), next: start + length + 2 }
  }
  if (marker === '*') {
    const count = Number(line)
    if (count === -1) return { value: null, next: lineEnd + 2 }
    const values = []
    let cursor = lineEnd + 2
    for (let i = 0; i < count; i++) {
      const parsed = parseResp(buf, cursor)
      if (!parsed) return null
      values.push(parsed.value)
      cursor = parsed.next
    }
    return { value: values, next: cursor }
  }
  return null
}

export class RedisStore {
  constructor(url, prefix = 'schoolos:') {
    this.conn = new RespConnection(url)
    this.prefix = prefix
    this.auditKey = `${prefix}audit:events`
  }

  key(key) { return `${this.prefix}${key}` }

  async get(key) {
    const raw = await this.conn.send('GET', this.key(key))
    return raw == null ? null : JSON.parse(raw)
  }

  async put(key, value, ttlMs = 0) {
    const raw = JSON.stringify(value)
    if (ttlMs > 0) await this.conn.send('SET', this.key(key), raw, 'PX', Math.ceil(ttlMs))
    else await this.conn.send('SET', this.key(key), raw)
    return true
  }

  async del(key) {
    return (await this.conn.send('DEL', this.key(key))) > 0
  }

  async keys(prefix) {
    const raw = await this.conn.send('KEYS', `${this.key(prefix)}*`)
    return (raw || []).map(k => k.slice(this.prefix.length))
  }

  async listPush(key, value) {
    return this.conn.send('RPUSH', this.key(key), JSON.stringify(value))
  }

  async listRange(key, start = 0, end = -1) {
    const raw = await this.conn.send('LRANGE', this.key(key), start, end)
    return (raw || []).map(v => JSON.parse(v))
  }

  async appendAudit(event) {
    return this.listPush('audit:events', event)
  }

  async listAudit(limit = 100) {
    const raw = await this.listRange('audit:events', -limit, -1)
    return raw.reverse()
  }

  async allAudit() {
    return this.listRange('audit:events', 0, -1)
  }

  async close() {
    this.conn.close()
  }
}
