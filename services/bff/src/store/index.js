import { MemoryStore } from './memory.js'
import { RedisStore } from './redis.js'

export function createStore(config) {
  if (config.store.driver === 'redis') {
    return new RedisStore(config.store.redisUrl, config.store.prefix)
  }
  return new MemoryStore()
}

export { MemoryStore, RedisStore }
