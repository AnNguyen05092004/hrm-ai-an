// Chạy thử luồng soạn khóa với AI thật trên DB phát triển: npx tsx --env-file=../../.env scripts/try-ai.ts
import { eq } from 'drizzle-orm'
import { db, schema, sqlClient } from '../src/db/client.js'
import { drainJobs, enqueue } from '../src/lib/jobs.js'
import '../src/modules/index.js'

const [org] = await db.select().from(schema.orgs)
const [author] = await db.select().from(schema.users).where(eq(schema.users.role, 'author'))
const srcs = await db.select().from(schema.sources).where(eq(schema.sources.orgId, org.id))
const docker = srcs.filter((s) => s.name.includes('Docker') || s.name.includes('Runbook')).map((s) => s.id)
const t0 = Date.now()
const [k] = await db.insert(schema.kits).values({ orgId: org.id, title: 'thử', goal: 'x', sourceIds: docker, createdBy: author.id, details: { goalText: 'Tạo khóa cho kỹ sư backend mới về lưu dữ liệu container bằng Docker volume và sao lưu', plan: [] } }).returning()
await enqueue(org.id, 'kit.draft', { kitId: k.id })
await drainJobs()
let [kk] = await db.select().from(schema.kits).where(eq(schema.kits.id, k.id))
console.log('DETAILS', Date.now() - t0, kk.title, JSON.stringify(kk.details).slice(0, 1500))
await enqueue(org.id, 'kit.outline', { kitId: k.id })
await drainJobs()
;[kk] = await db.select().from(schema.kits).where(eq(schema.kits.id, k.id))
console.log('OUTLINE', Date.now() - t0, JSON.stringify((kk.details as any).plan).slice(0, 2000))
const { createArtifact } = await import('../src/modules/kits/service.js')
for (const p of (kk.details as any).plan) { const a = await createArtifact(kk, p); await enqueue(org.id, 'artifact.generate', { artifactId: a.id }) }
await drainJobs()
const arts = await db.select().from(schema.artifacts).where(eq(schema.artifacts.kitId, k.id))
for (const a of arts) console.log('ART', a.type, a.status, JSON.stringify(a.content).slice(0, 2500))
const jobs = await db.select().from(schema.jobs).where(eq(schema.jobs.status, 'failed'))
console.log('FAILED', jobs.map((j) => j.error))
console.log('TOTAL ms', Date.now() - t0)
await sqlClient.end()
