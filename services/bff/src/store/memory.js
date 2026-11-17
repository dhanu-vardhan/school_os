/**
 * In-memory store used by tests and the local demo. It implements the same async
 * surface as the Redis store so production code never branches on the driver.
 * Values are JSON-serialisable objects; TTLs are milliseconds.
 */
export class MemoryStore {
  constructor() {
    this.values = new Map()
    this.lists = new Map()
    this.audit = []
    this.closed = false
  }

  #entry(key) {
    const entry = this.values.get(key)
    if (!entry) return null
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.values.delete(key)
      return null
    }
    return entry
  }

  async get(key) {
    const entry = this.#entry(key)
    return entry ? structuredClone(entry.value) : null
  }

  async put(key, value, ttlMs = 0) {
    this.values.set(key, {
      value: structuredClone(value),
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0,
    })
    return true
  }

  async del(key) {
    return this.values.delete(key)
  }

  async keys(prefix) {
    const out = []
    for (const key of this.values.keys()) {
      if (this.#entry(key) && key.startsWith(prefix)) out.push(key)
    }
    return out
  }

  async listPush(key, value) {
    const arr = this.lists.get(key) || []
    arr.push(structuredClone(value))
    this.lists.set(key, arr)
    return arr.length
  }

  async listRange(key, start = 0, end = -1) {
    const arr = this.lists.get(key) || []
    return structuredClone(end === -1 ? arr.slice(start) : arr.slice(start, end + 1))
  }

  async appendAudit(event) {
    this.audit.push(structuredClone(event))
    return this.audit.length
  }

  async listAudit(limit = 100) {
    return structuredClone(this.audit.slice(-limit).reverse())
  }

  async allAudit() {
    return structuredClone(this.audit)
  }

  async close() {
    this.closed = true
    this.values.clear()
    this.lists.clear()
    this.audit = []
  }
}
