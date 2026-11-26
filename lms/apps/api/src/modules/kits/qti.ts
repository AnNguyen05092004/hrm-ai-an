// Xuất đề kiểm tra kèm đáp án và tiêu chí chấm để LMS công ty tự quản lý và tự chấm.
// Gói .zip theo IMS QTI 2.1 (Moodle, Canvas, Blackboard, D2L… nhập được), kèm:
//   exam.json          toàn bộ đề theo cấu trúc gốc: đáp án, giải thích, rubric, test case, cách tính điểm
//   huong-dan-cham.md  hướng dẫn cho người quản trị và lời nhắc mẫu cho AI chấm tự luận theo tiêu chí
// Chỉ câu đã duyệt. Gói chứa đáp án nên chỉ người soạn tải được và mỗi lần tải được ghi nhật ký.
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { zipSync, strToU8 } from 'fflate'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me } from '../../lib/auth.js'
import { badRequest, notFound } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { publishedContent } from '../artifacts/view.js'
import { getKit } from './service.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const QTI_NS = 'http://www.imsglobal.org/xsd/imsqti_v2p1'
const SCHEMA = 'http://www.imsglobal.org/xsd/imsqti_v2p1 http://www.imsglobal.org/xsd/qti/qtiv2p1/imsqti_v2p1.xsd'
const x = (s: unknown): string => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const slugify = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'de-kiem-tra'
/** mã định danh QTI: bắt đầu bằng chữ, chỉ chữ số gạch */
const ident = (s: string): string => `I${String(s).replace(/[^A-Za-z0-9_-]/g, '_')}`

export const TYPE_NAME: Record<string, string> = {
  mc: 'Một đáp án', mr: 'Nhiều đáp án', fill: 'Điền chỗ trống', match: 'Ghép cặp', order: 'Sắp thứ tự', cat: 'Phân loại', essay: 'Tự luận', code: 'Bài code JavaScript',
}
/** Cách tính điểm từng dạng câu, giống hệt cách LMS này chấm */
export const SCORING: Record<string, string> = {
  mc: 'Đúng đáp án được 1 điểm, sai 0.',
  mr: 'Chọn đúng và đủ mọi đáp án đúng được 1 điểm, còn lại 0.',
  fill: 'Khớp một trong các đáp án chấp nhận được 1 điểm. So khớp không phân biệt hoa thường, dấu tiếng Việt và khoảng trắng đầu cuối.',
  match: 'Mỗi cặp ghép đúng được 1/số cặp điểm.',
  order: 'Mỗi mục đứng đúng vị trí được 1/số mục điểm.',
  cat: 'Mỗi mục xếp đúng nhóm được 1/số mục điểm.',
  essay: 'Chấm theo tiêu chí: điểm = số tiêu chí đạt / tổng số tiêu chí. Chỉ tính tiêu chí có bằng chứng trong bài làm.',
  code: 'Chạy hàm solve với từng bộ tham số: điểm = số test đạt / tổng số test. So sánh kết quả dạng JSON.',
}

const head = (id: string, title: string, adaptive = false): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<assessmentItem xmlns="${QTI_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${SCHEMA}" identifier="${ident(id)}" title="${x(title)}" adaptive="${adaptive}" timeDependent="false">\n`
const score = (normalMaximum = 1, external = ''): string =>
  `  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float" normalMaximum="${normalMaximum}"${external ? ` externalScored="${external}"` : ''}><defaultValue><value>0</value></defaultValue></outcomeDeclaration>\n  <outcomeDeclaration identifier="MAXSCORE" cardinality="single" baseType="float"><defaultValue><value>1</value></defaultValue></outcomeDeclaration>\n`
const prompt = (q: Json): string => `    <prompt>${x(q.q)}</prompt>\n`
const MATCH_CORRECT = '  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>\n'
const MAP_RESPONSE = '  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/map_response"/>\n'
const scorer = (title: string, body: string): string => `    <rubricBlock view="scorer"><p><strong>${x(title)}</strong></p>${body}</rubricBlock>\n`

/** Một câu hỏi → assessmentItem QTI 2.1 */
export function itemXml(q: Json): string {
  const t = q.type
  const title = `${TYPE_NAME[t] ?? t} · mức ${q.level ?? 1}`
  if (t === 'mc' || t === 'mr') {
    const choices: Json[] = q.choices ?? []
    const ok = choices.map((c, i) => (c.ok ? `C${i}` : '')).filter(Boolean)
    return head(q.id, title)
      + `  <responseDeclaration identifier="RESPONSE" cardinality="${t === 'mr' ? 'multiple' : 'single'}" baseType="identifier"><correctResponse>${ok.map((v) => `<value>${v}</value>`).join('')}</correctResponse></responseDeclaration>\n`
      + score()
      + `  <itemBody>\n    <choiceInteraction responseIdentifier="RESPONSE" shuffle="true" maxChoices="${t === 'mr' ? 0 : 1}">\n${prompt(q)}`
      + choices.map((c, i) => `      <simpleChoice identifier="C${i}">${x(c.t)}</simpleChoice>\n`).join('')
      + '    </choiceInteraction>\n  </itemBody>\n' + MATCH_CORRECT + '</assessmentItem>\n'
  }
  if (t === 'fill') {
    const accepted = String(q.answer ?? '').split('|').map((s) => s.trim()).filter(Boolean)
    const blank = '<textEntryInteraction responseIdentifier="RESPONSE" expectedLength="20"/>'
    const text = x(q.q)
    const body = /_{3,}/.test(text) ? text.replace(/_{3,}/, blank) : `${text} ${blank}`
    return head(q.id, title)
      + `  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string"><correctResponse><value>${x(accepted[0] ?? '')}</value></correctResponse><mapping defaultValue="0" upperBound="1">${accepted.map((a) => `<mapEntry mapKey="${x(a)}" mappedValue="1" caseSensitive="false"/>`).join('')}</mapping></responseDeclaration>\n`
      + score() + `  <itemBody>\n    <p>${body}</p>\n  </itemBody>\n` + MAP_RESPONSE + '</assessmentItem>\n'
  }
  if (t === 'match' || t === 'cat') {
    // ghép cặp: vế trái → vế phải; phân loại: mục → nhóm. Cả hai là matchInteraction, chấm từng phần qua mapping
    const left: { id: string; text: string }[] = t === 'match' ? (q.pairs ?? []).map((p: Json, i: number) => ({ id: `L${i}`, text: p.l })) : (q.groups ?? []).flatMap((g: Json, gi: number) => (g.items ?? []).map((it: string, ii: number) => ({ id: `L${gi}_${ii}`, text: it })))
    const right: { id: string; text: string }[] = t === 'match' ? (q.pairs ?? []).map((p: Json, i: number) => ({ id: `R${i}`, text: p.r })) : (q.groups ?? []).map((g: Json, gi: number) => ({ id: `G${gi}`, text: g.name }))
    const pairs: string[] = t === 'match' ? left.map((l, i) => `${l.id} R${i}`) : (q.groups ?? []).flatMap((g: Json, gi: number) => (g.items ?? []).map((_: string, ii: number) => `L${gi}_${ii} G${gi}`))
    const each = pairs.length ? Math.round((1 / pairs.length) * 10000) / 10000 : 0
    return head(q.id, title)
      + `  <responseDeclaration identifier="RESPONSE" cardinality="multiple" baseType="directedPair"><correctResponse>${pairs.map((p) => `<value>${p}</value>`).join('')}</correctResponse><mapping defaultValue="0" lowerBound="0" upperBound="1">${pairs.map((p) => `<mapEntry mapKey="${p}" mappedValue="${each}"/>`).join('')}</mapping></responseDeclaration>\n`
      + score()
      + `  <itemBody>\n    <matchInteraction responseIdentifier="RESPONSE" shuffle="true" maxAssociations="${left.length}">\n${prompt(q)}`
      + `      <simpleMatchSet>${left.map((l) => `<simpleAssociableChoice identifier="${l.id}" matchMax="1">${x(l.text)}</simpleAssociableChoice>`).join('')}</simpleMatchSet>\n`
      + `      <simpleMatchSet>${right.map((r) => `<simpleAssociableChoice identifier="${r.id}" matchMax="${t === 'match' ? 1 : left.length}">${x(r.text)}</simpleAssociableChoice>`).join('')}</simpleMatchSet>\n`
      + '    </matchInteraction>\n  </itemBody>\n' + MAP_RESPONSE + '</assessmentItem>\n'
  }
  if (t === 'order') {
    // điểm từng phần theo vị trí: mỗi vị trí đúng cộng 1/n
    const items: string[] = q.items ?? []
    const n = items.length
    const each = n ? Math.round((1 / n) * 10000) / 10000 : 0
    const rp = items.map((_, i) => `    <responseCondition><responseIf><match><index n="${i + 1}"><variable identifier="RESPONSE"/></index><baseValue baseType="identifier">O${i}</baseValue></match><setOutcomeValue identifier="SCORE"><sum><variable identifier="SCORE"/><baseValue baseType="float">${each}</baseValue></sum></setOutcomeValue></responseIf></responseCondition>\n`).join('')
    return head(q.id, title)
      + `  <responseDeclaration identifier="RESPONSE" cardinality="ordered" baseType="identifier"><correctResponse>${items.map((_, i) => `<value>O${i}</value>`).join('')}</correctResponse></responseDeclaration>\n`
      + score()
      + `  <itemBody>\n    <orderInteraction responseIdentifier="RESPONSE" shuffle="true">\n${prompt(q)}`
      + items.map((it, i) => `      <simpleChoice identifier="O${i}">${x(it)}</simpleChoice>\n`).join('')
      + '    </orderInteraction>\n  </itemBody>\n'
      + `  <responseProcessing>\n${rp}  </responseProcessing>\n</assessmentItem>\n`
  }
  if (t === 'code') {
    const tests: Json[] = q.tests ?? []
    return head(q.id, title)
      + '  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string"/>\n' + score(1, 'externalMachine')
      + `  <itemBody>\n    <extendedTextInteraction responseIdentifier="RESPONSE" format="preformatted" expectedLines="16"${q.starter ? ` placeholderText="${x(q.starter)}"` : ''}>\n${prompt(q)}    </extendedTextInteraction>\n`
      + scorer('Test case (gọi solve(...tham số), so sánh kết quả dạng JSON)', `<table><thead><tr><th>Tên</th><th>Tham số (mảng JSON)</th><th>Kết quả mong đợi (JSON)</th></tr></thead><tbody>${tests.map((c) => `<tr><td>${x(c.name)}</td><td>${x(c.args)}</td><td>${x(c.expected)}</td></tr>`).join('')}</tbody></table><p>${x(SCORING.code)}</p>`)
      + '  </itemBody>\n</assessmentItem>\n'
  }
  // tự luận: người hoặc AI của LMS công ty chấm theo tiêu chí
  const rubric: string[] = q.rubric ?? []
  return head(q.id, title)
    + '  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string"/>\n' + score(1, 'human')
    + `  <itemBody>\n    <extendedTextInteraction responseIdentifier="RESPONSE" format="plain" expectedLines="10">\n${prompt(q)}    </extendedTextInteraction>\n`
    + scorer('Tiêu chí chấm (mỗi tiêu chí đạt được 1/số tiêu chí điểm)', `<ol>${rubric.map((c) => `<li>${x(c)}</li>`).join('')}</ol><p>${x(SCORING.essay)}</p>`)
    + '  </itemBody>\n</assessmentItem>\n'
}

/** assessmentTest: rút ngẫu nhiên pick câu, xáo thứ tự, giới hạn thời gian; điểm đạt ghi ở outcome PASS_SCORE (%) */
function testXml(id: string, title: string, quiz: Json, qs: Json[]): string {
  const pick = Math.min(Number(quiz.pick ?? qs.length), qs.length)
  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentTest xmlns="${QTI_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${SCHEMA}" identifier="${ident(id)}" title="${x(title)}">
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"><defaultValue><value>0</value></defaultValue></outcomeDeclaration>
  <outcomeDeclaration identifier="MAXSCORE" cardinality="single" baseType="float"><defaultValue><value>${pick}</value></defaultValue></outcomeDeclaration>
  <outcomeDeclaration identifier="PASS_SCORE" cardinality="single" baseType="float"><defaultValue><value>${Number(quiz.passScore ?? 80)}</value></defaultValue></outcomeDeclaration>
  <timeLimits maxTime="${Number(quiz.minutes ?? 30) * 60}" allowLateSubmission="false"/>
  <testPart identifier="P1" navigationMode="nonlinear" submissionMode="simultaneous">
    <itemSessionControl maxAttempts="${Number(quiz.attempts ?? 1)}" allowReview="true" showFeedback="false" showSolution="false"/>
    <assessmentSection identifier="S1" title="${x(title)}" visible="true">
      <selection select="${pick}" withReplacement="false"/>
      <ordering shuffle="true"/>
${qs.map((q) => `      <assessmentItemRef identifier="${ident(q.id)}" href="items/${q.id}.xml"/>`).join('\n')}
    </assessmentSection>
  </testPart>
  <outcomeProcessing>
    <setOutcomeValue identifier="SCORE"><sum><testVariables variableIdentifier="SCORE"/></sum></setOutcomeValue>
  </outcomeProcessing>
</assessmentTest>
`
}

function manifestXml(id: string, title: string, qs: Json[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="exam-${x(id)}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd">
  <metadata><schema>QTIv2.1 Package</schema><schemaversion>1.0.0</schemaversion></metadata>
  <organizations/>
  <resources>
    <resource identifier="test" type="imsqti_test_xmlv2p1" href="test.xml">
      <metadata><imsmd:lom><imsmd:general><imsmd:title><imsmd:langstring xml:lang="vi">${x(title)}</imsmd:langstring></imsmd:title></imsmd:general></imsmd:lom></metadata>
      <file href="test.xml"/>
${qs.map((q) => `      <dependency identifierref="${ident(q.id)}"/>`).join('\n')}
    </resource>
${qs.map((q) => `    <resource identifier="${ident(q.id)}" type="imsqti_item_xmlv2p1" href="items/${q.id}.xml"><file href="items/${q.id}.xml"/></resource>`).join('\n')}
    <resource identifier="answer-key" type="webcontent" href="exam.json"><file href="exam.json"/><file href="huong-dan-cham.md"/></resource>
  </resources>
</manifest>
`
}

/** Lời nhắc mẫu để AI của LMS công ty chấm nháp một câu tự luận theo tiêu chí */
export const AI_PROMPT = `Bạn chấm nháp câu tự luận theo tiêu chí. Với từng tiêu chí, xét bài làm có đáp ứng không và trích nguyên văn đoạn bài làm làm bằng chứng.
Không cho đạt khi không có bằng chứng. Điểm = số tiêu chí đạt / tổng số tiêu chí. Đây là điểm nháp, người chấm xác nhận.
Trả JSON: {"criteria":[{"index":0,"met":true,"evidence":"..."}],"comment":"nhận xét ngắn"}

Câu hỏi: {{question}}
Tiêu chí:
{{rubric}}
Bài làm:
{{answer}}`

function guideMd(title: string, kitTitle: string, quiz: Json, qs: Json[]): string {
  const count = Object.entries(qs.reduce<Record<string, number>>((m, q) => ({ ...m, [q.type]: (m[q.type] ?? 0) + 1 }), {})).map(([t, n]) => `${TYPE_NAME[t] ?? t}: ${n}`).join(' · ')
  const manual = qs.filter((q) => q.type === 'essay' || q.type === 'code').length
  return `# ${title}

Khóa: ${kitTitle}. Xuất lúc ${new Date().toISOString()}.

**Gói này có đáp án.** Chỉ người quản trị đào tạo giữ và nhập vào LMS. Không gửi cho người thi.

## Cấu hình đề

| Mục | Giá trị |
|---|---|
| Số câu trong ngân hàng | ${qs.length} (${count}) |
| Mỗi lượt thi rút | ${Math.min(Number(quiz.pick ?? qs.length), qs.length)} câu ngẫu nhiên, xáo thứ tự |
| Thời gian | ${quiz.minutes ?? 30} phút |
| Điểm đạt | ${quiz.passScore ?? 80}% |
| Số lượt thi | ${quiz.attempts ?? 1} |
| Mỗi câu | 1 điểm, điểm bài = tổng điểm / số câu × 100 |

## Nhập vào LMS

- LMS hỗ trợ **IMS QTI 2.1** (Canvas, Blackboard, D2L, TAO; Moodle qua plugin QTI): nhập nguyên tệp .zip. Đáp án, điểm từng phần và giới hạn thời gian nằm trong \`test.xml\` và \`items/\`.
- LMS không đọc QTI, hoặc có AI riêng: dùng \`exam.json\`. Tệp chứa mọi câu, đáp án, giải thích từng lựa chọn, tiêu chí chấm, test case và cách tính điểm từng dạng câu.

## Cách tính điểm từng dạng câu

${Object.entries(SCORING).map(([t, s]) => `- **${TYPE_NAME[t]}:** ${s}`).join('\n')}

## Câu cần chấm ngoài (${manual} câu)

Câu tự luận chấm theo tiêu chí trong \`rubricBlock view="scorer"\` (QTI) hoặc trường \`rubric\` (exam.json). Câu code chạy test case trong trường \`tests\`.
LMS có AI thì chấm nháp tự luận bằng lời nhắc dưới đây, thay {{question}}, {{rubric}}, {{answer}}. Người chấm vẫn xác nhận điểm cuối.

\`\`\`
${AI_PROMPT}
\`\`\`
`
}

export async function buildExamPackage(orgId: string, kitId: string, artifactId: string): Promise<{ name: string; zip: Uint8Array; questions: number }> {
  const k = await getKit(orgId, kitId)
  const [a] = await db.select().from(schema.artifacts).where(and(eq(schema.artifacts.id, artifactId), eq(schema.artifacts.kitId, k.id), eq(schema.artifacts.orgId, orgId)))
  if (!a || a.type !== 'exam') throw notFound('Đề kiểm tra')
  if (!a.publishedVersion) throw badRequest('Đề kiểm tra chưa được xuất bản')
  const { content, title, version } = await publishedContent(a)
  const quiz: Json = content.quiz ?? {}
  const qs: Json[] = (quiz.questions ?? []).filter((q: Json) => q.approved)
  if (!qs.length) throw badRequest('Đề chưa có câu nào được duyệt')
  const exam = {
    format: 'lms-exam', formatVersion: 1, exportedAt: new Date().toISOString(),
    exam: { id: a.id, title, version, kit: { id: k.id, title: k.title } },
    settings: { passScore: quiz.passScore ?? 80, minutes: quiz.minutes ?? 30, attempts: quiz.attempts ?? 1, pick: Math.min(Number(quiz.pick ?? qs.length), qs.length), shuffle: true, pointsPerQuestion: 1 },
    scoring: SCORING,
    aiGrading: { essayPrompt: AI_PROMPT },
    questions: qs.map((q) => ({
      id: q.id, type: q.type, typeName: TYPE_NAME[q.type] ?? q.type, level: q.level ?? 1, question: q.q, points: 1, source: q.src ?? null,
      ...(q.choices ? { choices: q.choices.map((c: Json) => ({ text: c.t, correct: !!c.ok, feedback: c.fb ?? '' })) } : {}),
      ...(q.type === 'fill' ? { accepted: String(q.answer ?? '').split('|').map((s) => s.trim()).filter(Boolean) } : {}),
      ...(q.pairs ? { pairs: q.pairs.map((p: Json) => ({ left: p.l, right: p.r })) } : {}),
      ...(q.type === 'order' ? { correctOrder: q.items ?? [] } : {}),
      ...(q.groups ? { groups: q.groups.map((g: Json) => ({ name: g.name, items: g.items ?? [] })) } : {}),
      ...(q.rubric ? { rubric: q.rubric } : {}),
      ...(q.type === 'code' ? { starter: q.starter ?? '', tests: q.tests ?? [] } : {}),
    })),
  }
  const files: Record<string, Uint8Array> = {
    'imsmanifest.xml': strToU8(manifestXml(a.id, title, qs)),
    'test.xml': strToU8(testXml(a.id, title, quiz, qs)),
    'exam.json': strToU8(JSON.stringify(exam, null, 2)),
    'huong-dan-cham.md': strToU8(guideMd(title, k.title, quiz, qs)),
    ...Object.fromEntries(qs.map((q) => [`items/${q.id}.xml`, strToU8(itemXml(q))])),
  }
  return { name: `${slugify(title)}-qti21-co-dap-an.zip`, zip: zipSync(files, { level: 6 }), questions: qs.length }
}

export const examExportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/:id/export/exam/:artifactId', { schema: { params: z.object({ id: z.string(), artifactId: z.string() }) } }, async (req, reply) => {
    const u = me(req)
    const r = await buildExamPackage(u.orgId, req.params.id, req.params.artifactId)
    // gói có đáp án: ghi nhật ký mỗi lần tải
    await audit(u, 'kit.export_exam', req.params.artifactId, { kitId: req.params.id, questions: r.questions, size: r.zip.length })
    return reply.type('application/zip').header('content-disposition', `attachment; filename="${r.name}"; filename*=UTF-8''${encodeURIComponent(r.name)}`).send(Buffer.from(r.zip))
  })
}
