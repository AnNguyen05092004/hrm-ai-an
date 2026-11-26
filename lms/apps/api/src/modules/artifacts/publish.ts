// Xuất bản một tài liệu: chụp bản hiện tại thành phiên bản mới. Gói xuất (SCORM, đề QTI) chỉ dùng bản đã xuất bản.
import { and, eq, inArray } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import type { AuthUser } from '../../lib/auth.js'
import { badRequest } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { publishIssues } from './validate.js'

type Artifact = typeof schema.artifacts.$inferSelect

export async function publishArtifact(u: AuthUser, a: Artifact, note = ''): Promise<Artifact> {
  const issues = publishIssues(a)
  if (issues.blocking.length) throw badRequest(issues.blocking.join(' '), 'not_ready')
  const [k] = await db.select({ sourceIds: schema.kits.sourceIds }).from(schema.kits).where(eq(schema.kits.id, a.kitId))
  const ids = k?.sourceIds ?? []
  const srcs = ids.length ? await db.select({ id: schema.sources.id, version: schema.sources.version }).from(schema.sources).where(inArray(schema.sources.id, ids)) : []
  const version = (a.publishedVersion ?? 0) + 1
  await db.insert(schema.artifactVersions).values({
    artifactId: a.id, version, title: a.title, summary: a.summary, content: a.content, publishedBy: u.id, note,
    sourceVersions: Object.fromEntries(srcs.map((s) => [s.id, s.version])),
  })
  const [r] = await db.update(schema.artifacts).set({ status: 'published', publishedVersion: version, updatedAt: new Date() }).where(eq(schema.artifacts.id, a.id)).returning()
  await audit(u, 'artifact.publish', a.id, { version })
  return r
}

/** Bản nháp có khác bản đã xuất bản gần nhất không (để "xuất bản cả khóa" bỏ qua tài liệu không đổi) */
export async function hasUnpublishedChanges(a: Artifact): Promise<boolean> {
  if (!a.publishedVersion) return true
  const [v] = await db.select().from(schema.artifactVersions).where(and(eq(schema.artifactVersions.artifactId, a.id), eq(schema.artifactVersions.version, a.publishedVersion)))
  return !v || v.title !== a.title || v.summary !== a.summary || JSON.stringify(v.content) !== JSON.stringify(a.content)
}
