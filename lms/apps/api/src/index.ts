import { buildApp } from './app.js'
import { env } from './env.js'
import { runMigrations } from './db/migrate.js'
import { startWorker } from './lib/jobs.js'
import { startRetention } from './lib/retention.js'
import { startOutbox } from './lib/integrations.js'

await runMigrations()
const app = await buildApp({ logger: true })
startWorker(app.log)
startRetention(app.log)
startOutbox()
await app.listen({ port: env.PORT, host: '127.0.0.1' })
