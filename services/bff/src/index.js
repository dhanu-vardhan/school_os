import { assertSafeConfig, loadConfig } from './config.js'
import { startServer } from './server.js'

const config = loadConfig()

try {
  assertSafeConfig(config)
} catch (err) {
  console.error(`REFUSED: ${err.message}`)
  process.exit(3)
}

const server = await startServer(config)
console.log(`SchoolOS BFF listening on http://${config.host}:${config.port} (demo=${config.demoEnabled}, api=${config.apiBaseUrl}, store=${config.store.driver})`)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
