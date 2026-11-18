import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema.js'
import { env } from '../env.js'

export const sqlClient = postgres(env.DATABASE_URL, { max: 10, onnotice: () => {} })
export const db = drizzle(sqlClient, { schema })
export type Db = typeof db
export { schema }
