import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { db, sqlClient } from './client.js'

const here = path.dirname(fileURLToPath(import.meta.url))

export async function runMigrations(): Promise<void> {
  await sqlClient`create extension if not exists vector`
  await migrate(db, { migrationsFolder: path.resolve(here, '../../drizzle') })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations().then(() => { process.stdout.write('Đã migrate\n'); return sqlClient.end() })
    .catch((e) => { process.stderr.write(`${e}\n`); process.exit(1) })
}
