// Trình sửa CV dùng chung cho Trình tạo CV và Chế độ đối chiếu. Mọi thay đổi trả về bản CV mới qua onChange.
import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { SKILLS, LEVELS, DEGREES } from '../../data/skills.js'
import { skillsIn, fold } from '../../lib/extract.js'
import * as E from '../../lib/cvEdit.js'
import AutoTextarea from '../../components/AutoTextarea.jsx'
import { Button, cx } from '../../ui.jsx'

const field = 'h-9 rounded-lg border-0 bg-white px-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent-500/40'
const input = `${field} w-full`
const monthInput = `${field} h-8 w-[9.5rem] text-[13px]`
const CITIES = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Chưa ghi']
const BANDS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]
const TONE = {
  met: 'bg-emerald-50 ring-emerald-200',
  partial: 'bg-amber-50 ring-amber-200',
  missing: 'bg-rose-50 ring-rose-200',
  none: 'bg-white ring-line',
}

function Section({ title, hint, action, children }) {
  return (
    <section className="border-t border-line pt-4 first:border-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-mute">{title}{hint && <span className="ml-2 font-normal normal-case tracking-normal">{hint}</span>}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Detected({ text, statusOf }) {
  const ids = skillsIn(text)
  if (!ids.length) return null
  return (
    <p className="mt-1 flex flex-wrap items-center gap-1 px-2.5 text-[11px] text-mute">
      Từ khoá nhận ra:
      {ids.map((id) => <span key={id} className={cx('rounded-full px-1.5 leading-5 text-ink ring-1', TONE[statusOf(id)])}>{SKILLS[id].name}</span>)}
    </p>
  )
}

function SkillAdder({ onAdd }) {
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    const exact = Object.entries(SKILLS).find(([, v]) => fold(v.name) === fold(q.trim()))?.[0]
    const id = exact ?? skillsIn(q)[0]
    if (!id) { setErr('Chưa có trong danh mục kỹ năng của bản demo.'); return }
    onAdd(id); setQ(''); setErr('')
  }
  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <input list="skill-catalog" value={q} onChange={(e) => { setQ(e.target.value); setErr('') }} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && submit()}
          placeholder="Thêm kỹ năng, ví dụ Kafka" aria-label="Thêm kỹ năng" className={input} />
        <Button size="sm" className="h-9" onClick={submit} disabled={!q.trim()}><Plus size={14} aria-hidden />Thêm</Button>
      </div>
      <datalist id="skill-catalog">{Object.values(SKILLS).map((s) => <option key={s.name} value={s.name} />)}</datalist>
      {err && <p className="mt-1 text-xs text-danger-700">{err}</p>}
    </div>
  )
}

const monthOf = (v) => v ?? ''

export default function CvEditor({ cv, onChange, statusBySkill = {}, derived = [], focus, flash }) {
  const notes = useRef([])
  const statusOf = (id) => statusBySkill[id] ?? 'none'
  const set = (next, meta) => onChange(next, meta)

  useEffect(() => {
    if (!focus) return
    const el = notes.current[focus.idx]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
    el.setSelectionRange(...focus.range)
  }, [focus])

  const skills = Object.entries(cv.skills).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-4">
      <Section title="Thông tin">
        <input value={cv.name} onChange={(e) => set(E.setField(cv, 'name', e.target.value))} aria-label="Họ tên"
          className="w-full rounded-lg border-0 bg-transparent px-2.5 py-1 text-xl font-semibold ring-1 ring-transparent hover:ring-line focus:bg-white focus:ring-2 focus:ring-accent-500/40" />
        <input value={cv.headline} onChange={(e) => set(E.setField(cv, 'headline', e.target.value))} aria-label="Chức danh mục tiêu"
          className="mt-0.5 w-full rounded-lg border-0 bg-transparent px-2.5 py-1 text-sm text-mute ring-1 ring-transparent hover:ring-line focus:bg-white focus:ring-2 focus:ring-accent-500/40" />
        <div className="mt-2 grid gap-2 px-0.5 sm:grid-cols-2">
          <label className="text-xs text-mute">Nơi ở
            <select value={CITIES.includes(cv.city) ? cv.city : 'Chưa ghi'} onChange={(e) => set(E.setField(cv, 'city', e.target.value))} className={cx(input, 'mt-1')}>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={cv.relocate} onChange={(e) => set(E.setField(cv, 'relocate', e.target.checked))} className="h-4 w-4 rounded accent-accent-700" />
            Sẵn sàng chuyển nơi làm việc
          </label>
        </div>
      </Section>

      <Section title="Tóm tắt">
        <AutoTextarea value={cv.summary} onChange={(e) => set(E.setField(cv, 'summary', e.target.value))} aria-label="Tóm tắt" placeholder="2–3 câu về kinh nghiệm và thế mạnh của bạn" />
        <Detected text={cv.summary} statusOf={statusOf} />
      </Section>

      <Section title="Kỹ năng" hint={`${skills.length} kỹ năng`}>
        <ul className="flex flex-wrap gap-1.5">
          {skills.map(([id, lv]) => (
            <li key={id} className={cx('inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-xs ring-1 transition', TONE[statusOf(id)], flash === `skill:${id}` && 'animate-flash')}>
              <span className="font-medium">{SKILLS[id]?.name ?? id}</span>
              <select value={lv} onChange={(e) => set(E.setSkill(cv, id, Number(e.target.value)))} aria-label={`Mức ${SKILLS[id]?.name}`} title="Đổi mức thành thạo"
                style={{ fieldSizing: 'content' }}
                className="h-5 cursor-pointer appearance-none rounded border-0 bg-transparent px-1 py-0 text-[11px] text-mute underline decoration-dotted underline-offset-2 hover:text-ink focus:outline-none focus:ring-1 focus:ring-accent-500/40">
                {[1, 2, 3, 4, 5].map((x) => <option key={x} value={x}>{LEVELS[x]}</option>)}
              </select>
              <button type="button" onClick={() => set(E.removeSkill(cv, id))} aria-label={`Xoá ${SKILLS[id]?.name}`} className="rounded-full p-0.5 text-mute hover:bg-black/5 hover:text-ink"><X size={12} /></button>
            </li>
          ))}
        </ul>
        {derived.length > 0 && (
          <div className="mt-2.5 rounded-lg bg-paper px-3 py-2 text-xs text-mute ring-1 ring-line">
            <p>Có trong mô tả kinh nghiệm nhưng chưa khai ở mục này (đang tính mức Cơ bản):</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {derived.map((id) => (
                <button key={id} type="button" onClick={() => set(E.setSkill(cv, id, 3), { flash: `skill:${id}` })}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink/25 bg-white px-2 py-0.5 text-ink hover:border-accent-600 hover:text-accent-800">
                  <Plus size={11} aria-hidden />{SKILLS[id].name}
                </button>
              ))}
            </div>
          </div>
        )}
        <SkillAdder onAdd={(id) => set(E.setSkill(cv, id, 3), { flash: `skill:${id}` })} />
      </Section>

      <Section title="Kinh nghiệm" action={<Button size="sm" variant="ghost" onClick={() => set(E.addEntry(cv), { focus: { idx: 0, range: [0, 0] } })}><Plus size={14} aria-hidden />Thêm</Button>}>
        <div className="space-y-3">
          {cv.history.map((e, idx) => (
            <div key={e.uid ?? idx} className={cx('rounded-xl p-2 ring-1 ring-line transition', flash === `entry:${idx}` && 'animate-flash')}>
              <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <input value={e.title} onChange={(ev) => set(E.setEntry(cv, idx, { title: ev.target.value }))} aria-label="Chức danh" className={cx(input, 'font-medium')} />
                <input value={e.org} onChange={(ev) => set(E.setEntry(cv, idx, { org: ev.target.value }))} aria-label="Công ty" className={input} />
                <button type="button" onClick={() => set(E.removeEntry(cv, idx))} aria-label="Xoá kinh nghiệm này" className="justify-self-end rounded-lg p-2 text-mute hover:bg-soft hover:text-danger-700"><Trash2 size={15} /></button>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-mute">
                <input type="month" value={monthOf(e.from)} onChange={(ev) => ev.target.value && set(E.setEntry(cv, idx, { from: ev.target.value }))} aria-label="Từ tháng" className={monthInput} />
                –
                {e.to ? <input type="month" value={e.to} onChange={(ev) => ev.target.value && set(E.setEntry(cv, idx, { to: ev.target.value }))} aria-label="Đến tháng" className={monthInput} /> : <span className="text-ink">nay</span>}
                <label className="ml-1 inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={!e.to} onChange={(ev) => set(E.setEntry(cv, idx, { to: ev.target.checked ? null : '2026-11' }))} className="h-3.5 w-3.5 accent-accent-700" />Đang làm
                </label>
              </div>
              <AutoTextarea ref={(el) => { notes.current[idx] = el }} value={e.note} className="mt-1.5"
                onChange={(ev) => set(E.setEntry(cv, idx, { note: ev.target.value }))} aria-label={`Mô tả công việc tại ${e.org}`}
                placeholder="Bạn đã làm gì, dùng công nghệ gì, đạt kết quả gì (có số liệu)?" />
              <Detected text={`${e.title} ${e.note}`} statusOf={statusOf} />
            </div>
          ))}
          {!cv.history.length && <p className="text-sm text-mute">Chưa có kinh nghiệm. Bấm “Thêm” để bắt đầu.</p>}
        </div>
      </Section>

      <Section title="Học vấn">
        <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
          <select value={cv.education.level} onChange={(e) => set(E.setNested(cv, 'education', { level: Number(e.target.value) }))} aria-label="Bậc học" className={input}>
            {Object.entries(DEGREES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input value={cv.education.major} onChange={(e) => set(E.setNested(cv, 'education', { major: e.target.value }))} aria-label="Ngành" className={input} />
        </div>
        <input value={cv.education.school} onChange={(e) => set(E.setNested(cv, 'education', { school: e.target.value }))} aria-label="Trường" className={cx(input, 'mt-2')} />
      </Section>

      <Section title="Ngoại ngữ và mong muốn">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs text-mute">Tiếng Anh (quy đổi IELTS)
            <select value={/Chưa ghi/.test(cv.english.label) ? '' : cv.english.band} className={cx(input, 'mt-1')}
              onChange={(e) => set(E.setField(cv, 'english', e.target.value ? { band: Number(e.target.value), label: `IELTS ${Number(e.target.value).toFixed(1)}` } : { band: 5, label: 'Chưa ghi chứng chỉ' }))}>
              <option value="">Chưa có</option>
              {BANDS.map((b) => <option key={b} value={b}>{b.toFixed(1)}</option>)}
            </select>
          </label>
          <label className="text-xs text-mute">Lương kỳ vọng (triệu)
            <input type="number" min={0} value={cv.salary ?? ''} onChange={(e) => set(E.setField(cv, 'salary', e.target.value === '' ? null : Number(e.target.value)))} className={cx(input, 'mt-1')} />
          </label>
          <label className="text-xs text-mute">Nhận việc sau (ngày)
            <input type="number" min={0} value={cv.noticeDays ?? ''} onChange={(e) => set(E.setField(cv, 'noticeDays', e.target.value === '' ? null : Number(e.target.value)))} className={cx(input, 'mt-1')} />
          </label>
        </div>
      </Section>
    </div>
  )
}
