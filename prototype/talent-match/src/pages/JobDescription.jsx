// JD dạng tài liệu, sửa kiểu "thấy gì sửa nấy": trông như bản đọc, bấm vào chữ nào sửa ngay chữ đó.
// Gõ tới đâu AI trích lại tiêu chí tới đó (thẻ dưới mỗi dòng yêu cầu + cột phải so với bộ đang dùng).
// Bản nháp tự lưu trong trình duyệt nên chuyển tab / tải lại trang không mất; bấm Lưu (hoặc Ctrl/⌘+S) mới áp vào tin.
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Sparkles, RotateCcw, Info, Plus, X, ChevronDown } from 'lucide-react'
import { useStore } from '../store.jsx'
import { labelOf } from '../lib/criteria.js'
import { REQ } from '../lib/match.js'
import { CITY_NAMES } from '../lib/extract.js'
import { toDraft, fromDraft, isDirty, affectsCriteria, previewCriteria, validate, draftKey, uid, cleanLine, sourceLine } from '../lib/jdDraft.js'
import { Card, Button, cx } from '../ui.jsx'

const isInferred = (src) => /AI đề xuất|Suy ra|Người tuyển dụng thêm/.test(src)
const META_TYPES = ['location', 'salary', 'availability']
const MODES = ['Tại văn phòng', 'Hybrid', 'Từ xa']
/** Vùng sửa được: không viền khi đọc, nền nhạt khi rê chuột, viền xanh khi đang sửa — chữ giữ nguyên vị trí. */
const editable = 'rounded-md -mx-1.5 px-1.5 transition hover:bg-soft focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30'
const noSpin = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

function CriterionTag({ item }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ai px-2 py-0.5 text-xs text-ink ring-1 ring-line">
      <ArrowRight size={11} className="text-mute" aria-hidden />{labelOf(item)} · <span className="text-mute">{REQ[item.req].label}</span>
    </span>
  )
}

/** Đoạn chữ sửa tại chỗ: textarea trong suốt, tự giãn, cùng cỡ chữ với bản đọc. */
const InlineText = forwardRef(function InlineText({ value, onChange, className, ...rest }, ref) {
  const el = useRef(null)
  useImperativeHandle(ref, () => el.current)
  useLayoutEffect(() => {
    if (!el.current) return
    el.current.style.height = 'auto'
    el.current.style.height = `${el.current.scrollHeight}px`
  }, [value])
  return (
    <textarea ref={el} rows={1} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false}
      className={cx('block w-full resize-none overflow-hidden border-0 bg-transparent py-0.5 placeholder:text-mute/80', editable, className)} {...rest} />
  )
})

function InlineNumber({ value, onChange, label, min = 0 }) {
  return (
    <input type="number" min={min} value={value} aria-label={label} onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
      style={{ width: `calc(${Math.max(1, String(value).length)}ch + 0.5rem + 2px)` }}
      className={cx('-mx-1 inline-block rounded-md border-0 bg-transparent px-1 py-0.5 tabular-nums transition hover:bg-soft focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30', noSpin)} />
  )
}

function InlineSelect({ value, onChange, options, label }) {
  return (
    <span className="relative inline-flex items-center">
      <select value={value} aria-label={label} onChange={(e) => onChange(e.target.value)} className={cx('appearance-none border-0 bg-transparent py-0.5 pr-6 [field-sizing:content]', editable)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-1 text-mute" aria-hidden />
    </span>
  )
}

/** Danh sách dòng (trách nhiệm / yêu cầu): Enter thêm dòng ngay dưới, Backspace ở dòng trống xoá dòng. */
function Lines({ label, lines, onChange, variant, chipsFor }) {
  const refs = useRef({})
  const [focusId, setFocusId] = useState(null)
  useEffect(() => {
    if (!focusId) return
    refs.current[focusId]?.focus()
    setFocusId(null)
  }, [focusId])
  const update = (id, text) => onChange(lines.map((l) => (l.id === id ? { ...l, text } : l)))
  const insertAfter = (id) => {
    const line = { id: uid(), text: '' }
    const i = lines.findIndex((l) => l.id === id)
    onChange([...lines.slice(0, i + 1), line, ...lines.slice(i + 1)])
    setFocusId(line.id)
  }
  const remove = (id) => {
    const i = lines.findIndex((l) => l.id === id)
    const next = lines.filter((l) => l.id !== id)
    onChange(next.length ? next : [{ id: uid(), text: '' }])
    if (next.length) setFocusId(next[Math.max(0, i - 1)].id)
  }
  const onKeyDown = (e, line) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); insertAfter(line.id) }
    if (e.key === 'Backspace' && !line.text && lines.length > 1) { e.preventDefault(); remove(line.id) }
  }
  const card = variant === 'card'
  return (
    <>
      <ul className={card ? 'mt-2 space-y-3' : 'mt-2 list-disc space-y-1.5 pl-5 marker:text-ink/70'}>
        {lines.map((l, idx) => {
          const chips = chipsFor?.(l.text) ?? []
          return (
            <li key={l.id} className={cx('group relative', card && 'rounded-xl px-3 py-2 ring-1 ring-line focus-within:ring-brand-500/50')}>
              <InlineText ref={(el) => { refs.current[l.id] = el }} value={l.text} onChange={(t) => update(l.id, t)} onKeyDown={(e) => onKeyDown(e, l)}
                aria-label={`${label} – dòng ${idx + 1}`} placeholder="Gõ nội dung…" className="pr-7 text-[15px] leading-relaxed text-ink/90" />
              <button type="button" onClick={() => remove(l.id)} aria-label={`Xoá dòng ${idx + 1} của ${label}`}
                className={cx('absolute right-1 rounded p-1 text-mute opacity-0 transition hover:bg-soft hover:text-danger-700 focus:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100', card ? 'top-2' : 'top-0.5')}>
                <X size={14} />
              </button>
              {card && cleanLine(l.text) && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {chips.length ? chips.map((i) => <CriterionTag key={i.id} item={i} />) : <span className="text-xs text-mute">Chưa nhận ra tiêu chí nào trong dòng này</span>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <button type="button" onClick={() => insertAfter(lines[lines.length - 1].id)} className="mt-2 inline-flex items-center gap-1 rounded px-1 text-sm text-mute hover:bg-soft hover:text-ink">
        <Plus size={14} aria-hidden />Thêm dòng
      </button>
    </>
  )
}

function Meta({ label, children }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-line py-1.5 text-[15px]">
      <dt className="w-32 shrink-0 text-sm text-mute">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}

function CurrentCriteria({ items, onEditCriteria }) {
  const meta = items.filter((i) => META_TYPES.includes(i.type))
  const inferred = items.filter((i) => isInferred(i.src) && !META_TYPES.includes(i.type))
  return (
    <>
      <p className="flex items-center gap-1.5 font-semibold"><Sparkles size={16} aria-hidden />AI trích được {items.length} tiêu chí</p>
      <p className="mt-1 text-sm text-mute">{items.length - inferred.length - meta.length} từ phần yêu cầu, {meta.length} từ thông tin tin tuyển dụng, {inferred.length} do AI suy ra hoặc người tuyển dụng thêm.</p>
      <p className="mt-3 text-xs font-medium text-mute">Từ thông tin tin tuyển dụng</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{meta.map((i) => <CriterionTag key={i.id} item={i} />)}</div>
      {inferred.length > 0 && <p className="mt-3 text-xs font-medium text-mute">AI suy ra / bổ sung</p>}
      <div className="mt-1.5 flex flex-wrap gap-1.5">{inferred.map((i) => <CriterionTag key={i.id} item={i} />)}</div>
      <Button variant="subtle" className="mt-4 w-full" onClick={onEditCriteria}>Xem và chỉnh trọng số</Button>
    </>
  )
}

export default function JobDescription({ job, onEditCriteria }) {
  const s = useStore()
  const key = draftKey(job.id)
  const base = useMemo(() => toDraft(job), [job])
  const stored = s.pref(key, null)
  const d = stored ?? base
  const dirty = isDirty(job, stored)
  const setD = (p) => s.setPref(key, { ...d, ...p })
  const fields = useMemo(() => fromDraft(d), [d])
  const currentCriteria = s.criteriaOf(job.id)
  const current = currentCriteria.groups.flatMap((g) => g.items)
  const preview = useMemo(() => previewCriteria(job, fields, currentCriteria), [job, fields, currentCriteria])
  const items = dirty ? preview.groups.flatMap((g) => g.items) : current
  const [choice, setChoice] = useState(null) // null = theo mặc định: trích lại nếu phần ảnh hưởng tiêu chí đã đổi
  const changed = affectsCriteria(job, fields)
  const reextract = choice ?? changed
  const errors = dirty ? validate(fields) : []
  const currentLabels = new Set(current.map(labelOf))
  const nextLabels = new Set(items.map(labelOf))
  const added = [...nextLabels].filter((l) => !currentLabels.has(l))
  const removed = [...currentLabels].filter((l) => !nextLabels.has(l))
  const cities = CITY_NAMES.includes(d.city) ? CITY_NAMES : [d.city, ...CITY_NAMES]
  const shown = dirty && reextract ? items : current
  const linked = (text) => {
    const line = cleanLine(text)
    return shown.filter((i) => !isInferred(i.src) && !META_TYPES.includes(i.type) && sourceLine(i, [line]) === line)
  }

  const discard = () => { s.setPref(key, null); setChoice(null) }
  const save = () => {
    if (!dirty || errors.length) return
    s.saveJob(job.id, fields, reextract ? preview : undefined)
    s.setPref(key, null)
    setChoice(null)
    s.notify(reextract ? 'Đã lưu JD và trích lại tiêu chí — hãy kiểm tra rồi chốt' : 'Đã lưu JD, giữ nguyên bộ tiêu chí')
  }
  const saveRef = useRef(save)
  useEffect(() => { saveRef.current = save })
  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-mute">
          <span>Bấm vào bất kỳ đoạn nào để sửa · Enter thêm dòng · Ctrl/⌘ + S để lưu</span>
          {!dirty && s.isJobEdited(job.id) && (
            <Button variant="ghost" size="sm" onClick={() => { s.resetJob(job.id); s.notify('Đã khôi phục JD và tiêu chí gốc') }}><RotateCcw size={14} aria-hidden />Khôi phục JD gốc</Button>
          )}
        </div>

        <InlineText value={d.title} onChange={(title) => setD({ title })} aria-label="Chức danh" placeholder="Chức danh"
          className="text-2xl font-semibold tracking-tight" />
        <dl className="mt-3">
          <Meta label="Phòng ban"><InlineText value={d.dept} onChange={(dept) => setD({ dept })} aria-label="Phòng ban" /></Meta>
          <Meta label="Cấp bậc"><InlineText value={d.level} onChange={(level) => setD({ level })} aria-label="Cấp bậc" /></Meta>
          <Meta label="Địa điểm">
            <InlineSelect label="Thành phố" value={d.city} options={cities} onChange={(city) => setD({ city })} />
            <span className="mx-1 text-mute">·</span>
            <InlineSelect label="Hình thức làm việc" value={d.mode} options={MODES} onChange={(mode) => setD({ mode })} />
          </Meta>
          <Meta label="Mức lương">
            <InlineNumber label="Lương tối thiểu (triệu)" value={d.salaryMin} onChange={(salaryMin) => setD({ salaryMin })} />
            <span className="mx-2">–</span>
            <InlineNumber label="Lương tối đa (triệu)" value={d.salaryMax} onChange={(salaryMax) => setD({ salaryMax })} />
            <span className="ml-2">triệu/tháng</span>
            {!d.salaryMax && <span className="ml-2 text-xs text-mute">(0 = chưa công bố)</span>}
          </Meta>
          <Meta label="Số lượng tuyển"><InlineNumber label="Số lượng tuyển" min={1} value={d.headcount} onChange={(headcount) => setD({ headcount })} /><span className="ml-2">người</span></Meta>
          <Meta label="Nhận việc trong"><InlineNumber label="Số ngày nhận việc" value={d.noticeDays} onChange={(noticeDays) => setD({ noticeDays })} /><span className="ml-2">ngày</span></Meta>
        </dl>

        <section className="mt-6">
          <h2 className="font-semibold">Mô tả</h2>
          <InlineText value={d.summary} onChange={(summary) => setD({ summary })} aria-label="Mô tả" placeholder="Bấm để thêm giới thiệu ngắn về vị trí và đội ngũ…"
            className="mt-2 text-[15px] leading-relaxed text-ink/90" />
        </section>
        <section className="mt-6">
          <h2 className="font-semibold">Trách nhiệm</h2>
          <Lines label="Trách nhiệm" lines={d.responsibilities} onChange={(responsibilities) => setD({ responsibilities })} />
        </section>
        <section className="mt-6">
          <h2 className="font-semibold">Yêu cầu</h2>
          <Lines label="Yêu cầu" variant="card" lines={d.requirements} onChange={(requirements) => setD({ requirements })} chipsFor={linked} />
        </section>

        {dirty && (
          <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-b-lg border-t border-line bg-white/95 px-6 py-3 backdrop-blur">
            <p className="min-w-0 text-sm" role="status">
              {errors.length ? <span className="text-danger-700">{errors[0]}</span> : <span className="text-mute">Có thay đổi chưa lưu · bản nháp được giữ khi chuyển tab</span>}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={discard}>Huỷ thay đổi</Button>
              <Button variant="primary" disabled={errors.length > 0} onClick={save}>Lưu JD</Button>
            </div>
          </div>
        )}
      </Card>

      <aside>
        <Card className="p-4 lg:sticky lg:top-6">
          {!dirty ? <CurrentCriteria items={current} onEditCriteria={onEditCriteria} /> : (
            <div className="space-y-3">
              <p className="flex items-center gap-1.5 font-semibold"><Sparkles size={16} aria-hidden />AI trích lại được {items.length} tiêu chí</p>
              <p className="text-sm text-mute">Cập nhật ngay khi bạn sửa. Bộ đang dùng có {current.length} tiêu chí.</p>
              {added.length > 0 && <div><p className="text-xs font-medium text-emerald-800">Thêm mới</p><p className="mt-0.5 text-sm">{added.join(', ')}</p></div>}
              {removed.length > 0 && <div><p className="text-xs font-medium text-danger-700">Sẽ bỏ</p><p className="mt-0.5 text-sm">{removed.join(', ')}</p></div>}
              {!added.length && !removed.length && <p className="text-sm text-mute">Danh sách tiêu chí không đổi.</p>}
              <label className="flex items-start gap-2 border-t border-line pt-3 text-sm">
                <input type="checkbox" className="mt-0.5" checked={reextract} onChange={(e) => setChoice(e.target.checked)} />
                <span>Cập nhật tiêu chí theo JD mới khi lưu<span className="block text-xs text-mute">Tin sẽ về trạng thái “chờ chốt” để bạn kiểm tra trọng số. Bỏ chọn để giữ bộ tiêu chí hiện tại.</span></span>
              </label>
              <p className="flex items-start gap-1.5 rounded-md bg-soft px-2.5 py-2 text-xs text-ink/80">
                <Info size={14} className="mt-0.5 shrink-0 text-mute" aria-hidden />Chỉ dòng mới hoặc dòng đã sửa được trích lại. Tiêu chí của các dòng không đổi, tiêu chí AI suy ra và tiêu chí bạn tự thêm được giữ nguyên trọng số.
              </p>
            </div>
          )}
        </Card>
      </aside>
    </div>
  )
}
