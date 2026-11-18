import { z } from 'zod'
import { aiJson } from '../../lib/ai/index.js'
import { fold } from '../../lib/text.js'
import type { Model } from './model.js'

// ---------- Gợi ý kỹ năng cho KPI tự thêm ----------
const KpiSkills = z.object({
  skills: z.array(z.object({
    skillId: z.string(), why: z.string().describe('vì sao kỹ năng này tác động tới KPI, 1 câu'),
    boost: z.number().int().describe('mức tối thiểu cần để đạt KPI (0 nếu khung vị trí đã đủ)'),
    positions: z.array(z.string()).describe('id vị trí cần nâng mức; rỗng nếu áp dụng mọi vị trí'),
  })),
})

export function suggestKpiSkills(orgId: string, kpi: { name: string; metric: string; target: string }, skills: { id: string; name: string }[], positions: { id: string; name: string }[]): Promise<z.infer<typeof KpiSkills>> {
  return aiJson({
    orgId, feature: 'kpi_skills', schema: KpiSkills,
    system: 'Bạn là chuyên gia phát triển năng lực đội kỹ thuật. Với một KPI, chọn 1–3 kỹ năng trong danh sách tác động trực tiếp nhất. Chỉ dùng id có trong danh sách. Mức 1 biết khái niệm, 2 làm được khi có hướng dẫn, 3 làm độc lập. Tiếng Việt.',
    input: `KPI: ${kpi.name}\nChỉ số: ${kpi.metric}\nMục tiêu: ${kpi.target}\n\nKỹ năng:\n${skills.map((s) => `${s.id}: ${s.name}`).join('\n')}\n\nVị trí:\n${positions.map((p) => `${p.id}: ${p.name}`).join('\n')}`,
    mock: () => ({ skills: skills.filter((s) => fold(kpi.name).includes(fold(s.name).split(/[\s(]/)[0])).slice(0, 2).map((s) => ({ skillId: s.id, why: `Ảnh hưởng trực tiếp tới ${kpi.name.toLowerCase()}`, boost: 0, positions: [] })) }),
  })
}

// ---------- Đánh giá mức kỹ năng từ bằng chứng ----------
const Assess = z.object({ level: z.number().int(), confidence: z.enum(['high', 'medium', 'low']), rationale: z.string() })

export function assessEvidence(orgId: string, skillName: string, current: number, evidence: string): Promise<z.infer<typeof Assess>> {
  return aiJson({
    orgId, feature: 'assess', schema: Assess,
    system: 'Bạn đánh giá mức kỹ năng của nhân viên từ bằng chứng công việc (bài code, kết quả dự án, đánh giá của quản lý). Thang: 0 chưa có, 1 biết khái niệm, 2 làm được khi có hướng dẫn, 3 làm độc lập. Chỉ đề xuất, quản lý quyết định. Nếu bằng chứng yếu thì confidence low và không nâng quá 1 mức. Tiếng Việt, rationale 1–2 câu dẫn đúng bằng chứng.',
    input: `Kỹ năng: ${skillName}\nMức hiện tại: ${current}\n\nBằng chứng:\n${evidence.slice(0, 6000)}`,
    mock: () => ({ level: Math.min(3, current + 1), confidence: 'medium' as const, rationale: 'Bằng chứng cho thấy làm được việc ở mức cao hơn hiện tại.' }),
  })
}

// ---------- Trợ lý giám đốc ----------
const Advice = z.object({
  answer: z.string().describe('trả lời ngắn gọn, có số liệu, tiếng Việt, ≤ 150 từ'),
  points: z.array(z.string()).describe('ý chính hoặc danh sách người/bộ phận, có thể rỗng'),
  actions: z.array(z.object({
    kind: z.enum(['person', 'dept', 'assign', 'generate', 'tab']),
    label: z.string(),
    target: z.string().describe('id người / id bộ phận / id kỹ năng / tên tab (plan|team|assess|impact)'),
  })).describe('0–3 nút hành động gợi ý'),
})
export type Advice = z.infer<typeof Advice>

export interface LearningRow { userId: string; name: string; title: string; percent: number; due: Date | null; lastAt: Date | null }

/** Ngữ cảnh gọn cho LLM: đội, KPI, khoảng cách, tiến độ học. Chỉ gồm dữ liệu trong tổ chức của giám đốc. */
export function advisorContext(m: Model, learning: LearningRow[]): string {
  const dept = (id: string | null) => m.depts.find((d) => d.id === id)?.name ?? 'Khác'
  const sk = (id: string) => m.skills.find((s) => s.id === id)?.name ?? id
  const team = m.team.map((p) => `${p.id} | ${p.name} | ${p.title} | ${dept(p.deptId)} | ${Object.entries(m.cells[p.id] ?? {}).map(([s, c]) => `${sk(s)} ${c.cur}/${c.need}${c.state !== 'ok' ? ` (${c.state})` : ''}`).join(', ')}`).join('\n')
  const kpis = m.kpis.filter((k) => k.active).map((k) => `${k.id} | ${k.name} | hiện ${k.current} → mục tiêu ${k.target} (hạn ${k.due}) | kỹ năng: ${k.skills.map((s) => sk(s.skillId)).join(', ')} | xu hướng: ${k.trend.map((t) => `${t.m}=${t.v}`).join(' ')}`).join('\n')
  const recs = m.recs.map((r) => `${r.skillId} (${r.skillName}) | thiếu ${r.gap.length} người, đã giao ${r.assigned.length}, xong ${r.completed.length} | khóa có sẵn: ${r.courses.length ? `${r.courses.length} tài liệu đưa tới mức ${r.courseLevel}` : 'chưa có'}`).join('\n')
  const late = learning.filter((l) => l.percent < 100 && l.due && l.due < new Date()).map((l) => `${l.name}: ${l.title} ${l.percent}% quá hạn`).slice(0, 20).join('\n')
  const depts = m.depts.map((d) => `${d.id} | ${d.name}`).join('\n')
  return `Mức sẵn sàng hiện tại ${m.readiness.now}%, sau khi học theo kế hoạch ${m.readiness.after}%.\n\nBỘ PHẬN (id | tên)\n${depts}\n\nKPI\n${kpis}\n\nKỸ NĂNG THIẾU\n${recs}\n\nĐỘI NGŨ (id | tên | vị trí | bộ phận | kỹ năng hiện/cần)\n${team}\n\nKHÓA QUÁ HẠN\n${late || 'không có'}`
}

export function askAdvisor(orgId: string, context: string, question: string, history: { role: 'user' | 'assistant'; text: string }[]): Promise<Advice> {
  return aiJson({
    orgId, feature: 'advisor', schema: Advice,
    system: `Bạn là trợ lý phân tích năng lực đội ngũ cho giám đốc. Chỉ dựa trên dữ liệu được cấp, nêu số liệu cụ thể, không bịa. Nếu dữ liệu không đủ thì nói rõ. Gợi ý hành động thiết thực (giao khóa, tạo khóa cho kỹ năng chưa có khóa, xem người cụ thể).
Hành động: person (target = id người), dept (target = id bộ phận), assign (target = id kỹ năng có khóa), generate (target = id kỹ năng chưa có khóa), tab (target = plan|team|assess|impact). Tiếng Việt.`,
    input: `DỮ LIỆU\n${context}\n\n${history.slice(-4).map((h) => `${h.role === 'user' ? 'Giám đốc' : 'Trợ lý'}: ${h.text}`).join('\n')}\nGiám đốc hỏi: ${question}`,
    mock: () => ({ answer: `Mức sẵn sàng hiện tại của đội được tính từ dữ liệu. ${question}`, points: [], actions: [{ kind: 'tab' as const, label: 'Xem kế hoạch', target: 'plan' }] }),
  })
}
