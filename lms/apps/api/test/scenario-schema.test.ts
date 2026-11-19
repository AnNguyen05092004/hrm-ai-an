import { describe, it, expect } from 'vitest'
import { ScenarioSchema } from '../src/modules/kits/ai.js'

// Trình soạn và trình học tình huống chỉ hiểu 3 mức: good / neutral / bad (web/src/pages/OtherEditors.jsx)
describe('scenario AI schema', () => {
  const draft = (ok: string) => ({ character: { name: 'Lan', role: 'Khách' }, learner: 'Nhân viên', intro: 'x', scenes: [{ title: 'a', goal: 'b', line: 'c', choices: [{ t: 't', ok, reply: 'r' }] }] })

  it('uses the same choice ratings as the scenario editor', () => {
    for (const ok of ['good', 'neutral', 'bad']) expect(ScenarioSchema.safeParse(draft(ok)).success).toBe(true)
  })

  it('rejects ratings the editor cannot show', () => {
    expect(ScenarioSchema.safeParse(draft('ok')).success).toBe(false)
  })
})
