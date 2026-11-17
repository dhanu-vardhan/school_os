import { loadConfig } from './config.js'
import { startServer } from './server.js'

const config = loadConfig()

if (config.envName === 'prod' || config.envName === 'production') {
  if (config.demoEnabled) {
    console.error('REFUSED: demo mode cannot run in a production environment')
    process.exit(3)
  }
  if (!config.secureCookies) {
    console.error('REFUSED: COOKIE_SECURE must be true in production')
    process.exit(3)
  }
}

const server = await startServer(config)
console.log(`SchoolOS BFF listening on http://${config.host}:${config.port} (demo=${config.demoEnabled}, api=${config.apiBaseUrl})`)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
