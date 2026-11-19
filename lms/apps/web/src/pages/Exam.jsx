import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ShieldCheck, Check, Clock, AlertTriangle, CheckCircle2, XCircle, Hourglass, CloudOff, Code2 } from 'lucide-react'
import { useStore, useMe } from '../store'
import { fmtTime } from '../data'
import { Spinner } from '../ui'
import { DeviceBar } from './Common'
import { get, post, patch } from '../api'
import { themeStyle } from '../theme'
import { MatchBoard, OrderBoard, CatBoard } from '../arrange'

const box = 'mx-auto max-w-[760px] px-6 py-14'
const SAVE_MS = 1200

function Intro({ info, onStart, onResume, busy, preview }) {
  const [agree, setAgree] = useState(false)
  const [consentStep, setConsentStep] = useState(false)
  const left = Math.max(0, info.attempts - info.used)
  if (!info.count) return <div className={box}><h1 className="font-lato text-[32px] font-black">Bài kiểm tra chưa sẵn sàng</h1><p className="mt-3 font-serif text-neutral-700">Ngân hàng đề chưa có câu nào được duyệt.</p></div>
  if (consentStep) return (
    <div className={box}>
      <ShieldCheck size={36} className="text-brand" />
      <h1 className="mt-3 font-lato text-[32px] font-black">Bài thi này có giám sát</h1>
      <p className="mt-3 font-serif text-[16px] text-neutral-700">Trước khi vào thi, hãy đọc những gì được ghi lại:</p>
      <div className="mt-5 space-y-2.5">{['Hệ thống ghi lại khi bạn chuyển tab, rời cửa sổ bài thi hoặc dán nội dung từ ngoài vào, kèm thời điểm', 'Hệ thống chỉ gắn cờ, không tự hủy bài hay trừ điểm. Người chấm xem lại rồi quyết định', 'Bản ghi giám sát tự xóa sau 30 ngày, trừ bài đang được xem xét', 'AI Tutor tắt trong lúc thi', 'Mất mạng giữa giờ: bài được lưu liên tục, vào lại thì làm tiếp, thời gian vẫn tính'].map((x) => <div key={x} className="flex gap-3 rounded-xl bg-neutral-50 px-4 py-3 text-[15px]"><Check size={18} className="mt-0.5 shrink-0 text-emerald-600" />{x}</div>)}</div>
      <label className="mt-6 flex items-center gap-3 text-[15px]"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-4 w-4" />Tôi đã đọc và đồng ý với việc giám sát cho bài thi này</label>
      <p className="mt-2 text-[13px] text-neutral-500">Không đồng ý? Bạn không vào được bài thi có giám sát; hãy liên hệ người phụ trách khóa để thi hình thức khác.</p>
      <div className="mt-6 flex gap-3"><button onClick={() => setConsentStep(false)} className="rounded-full border-2 border-ink px-8 py-2.5 font-lato font-bold">Quay lại</button><button disabled={!agree || busy} onClick={() => onStart(true)} className="rounded-full bg-brand px-10 py-2.5 font-lato font-bold text-white disabled:opacity-40">{busy ? 'Đang chuẩn bị đề…' : 'Đồng ý và vào thi'}</button></div>
    </div>
  )
  return (
    <div className={box}>
      <div className="text-[13px] font-bold uppercase tracking-wider text-brand">{info.mode === 'official' ? 'Thi chính thức' : 'Luyện tập'} · Mức {info.level}</div>
      <h1 className="mt-2 font-lato text-[40px] font-black">{info.title}</h1>
      <div className="mt-6 grid grid-cols-4 gap-3 text-center font-lato">{[[`${info.count}`, 'câu hỏi'], [`${info.minutes}'`, 'thời gian'], [`${info.passScore}%`, 'điểm đạt'], [`${left}/${info.attempts}`, 'lượt còn lại']].map(([a, b]) => <div key={b} className="rounded-xl border border-line py-4"><div className="text-[24px] font-bold">{a}</div><div className="text-[13px] text-neutral-500">{b}</div></div>)}</div>
      <p className="mt-6 font-serif text-[16px] leading-relaxed text-neutral-700">Mỗi người nhận một đề riêng rút ngẫu nhiên từ ngân hàng đề, thứ tự câu và lựa chọn được xáo. Trắc nghiệm và bài code được chấm ngay; tự luận do AI chấm nháp và người chấm xác nhận.{info.mode === 'official' && ' Kết quả đạt sẽ cập nhật mức kỹ năng của bạn (tối đa mức 3).'}</p>
      {info.passed && <div className="mt-4 flex items-center gap-2 text-[14px] font-semibold text-emerald-700"><CheckCircle2 size={16} />Bạn đã đạt bài này</div>}
      {preview ? <p className="mt-8 rounded-xl bg-amber-50 p-4 text-[14px] text-amber-800">Đang xem trước. Người học vào thi từ bản đã xuất bản.</p>
        : info.openAttempt ? <button onClick={onResume} disabled={busy} className="mt-8 rounded-full bg-brand px-10 py-3 font-lato font-bold text-white">Làm tiếp bài đang dở</button>
          : left > 0 ? <button onClick={() => (info.proctor ? setConsentStep(true) : onStart(false))} disabled={busy} className="mt-8 rounded-full bg-brand px-10 py-3 font-lato font-bold text-white">{busy ? 'Đang chuẩn bị đề…' : 'Bắt đầu làm bài'}</button>
            : <p className="mt-8 rounded-xl bg-neutral-50 p-4 text-[14px]">Bạn đã dùng hết số lượt thi. Liên hệ người phụ trách khóa nếu cần thi lại.</p>}
    </div>
  )
}

function Run({ attempt, proctor, onDone }) {
  const { say, confirmBox } = useStore()
  const [i, setI] = useState(0)
  const [ans, setAns] = useState(attempt.answers ?? {})
  const [now, setNow] = useState(Date.now())
  const [saveState, setSaveState] = useState('saved')
  const [flags, setFlags] = useState(attempt.flags ?? 0)
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(null), timer = useRef()
  const qs = attempt.questions
  const q = qs[i]
  const left = Math.max(0, Math.round((new Date(attempt.deadline) - now) / 1000))

  const inflight = useRef(Promise.resolve(true))
  // lưu tuần tự; trả về false nếu lần lưu này lỗi
  const save = () => {
    inflight.current = inflight.current.then(async () => {
      const a = pending.current
      if (!a) return true
      pending.current = null; setSaveState('saving')
      try { await patch(`/exams/attempts/${attempt.id}`, { answers: a }); setSaveState('saved'); return true } catch (e) {
        if (e.status === 409) { onDone(); return true }
        pending.current = { ...a, ...(pending.current ?? {}) }; setSaveState('offline'); clearTimeout(timer.current); timer.current = setTimeout(save, 3000)
        return false
      }
    })
    return inflight.current
  }
  const set = (v) => { setAns((x) => { const n = { ...x, [q.id]: v }; pending.current = { ...(pending.current ?? {}), [q.id]: v }; return n }); setSaveState('dirty'); clearTimeout(timer.current); timer.current = setTimeout(save, SAVE_MS) }
  const flag = (kind) => { if (!proctor) return; setFlags((n) => n + 1); post(`/exams/attempts/${attempt.id}/flags`, { kind }).catch(() => {}) }
  const submit = async (auto = false) => {
    if (!auto && !(await confirmBox(`Nộp bài? Bạn đã trả lời ${answered}/${qs.length} câu. Sau khi nộp không sửa được nữa.`, { ok: 'Nộp bài' }))) return
    setSubmitting(true); clearTimeout(timer.current)
    try {
      if (!(await save()) && !auto) { say('Chưa lưu được câu trả lời cuối. Kiểm tra mạng rồi nộp lại.'); setSubmitting(false); return }
      await post(`/exams/attempts/${attempt.id}/submit`); onDone()
    } catch (e) { say(e.message); setSubmitting(false) }
  }
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { if (left === 0 && !submitting) { say('Hết giờ, bài được nộp tự động'); submit(true) } }, [left]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!proctor) return
    // rời cửa sổ quá 3 giây mới gắn cờ, tránh báo nhầm khi bấm thanh trình duyệt
    let away
    const vis = () => { if (document.hidden) { clearTimeout(away); flag('tab') } }
    const blur = () => { away = setTimeout(() => { if (!document.hidden) flag('blur') }, 3000) }
    const focus = () => clearTimeout(away)
    document.addEventListener('visibilitychange', vis); window.addEventListener('blur', blur); window.addEventListener('focus', focus)
    return () => { clearTimeout(away); document.removeEventListener('visibilitychange', vis); window.removeEventListener('blur', blur); window.removeEventListener('focus', focus) }
  }, [proctor]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { clearTimeout(timer.current); save() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const answered = qs.filter((x) => ans[x.id] !== undefined && ans[x.id] !== '' && !(Array.isArray(ans[x.id]) && !ans[x.id].length)).length
  const onPaste = () => flag('paste')
  return (
    <div className="relative">
      {proctor && <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-[12px] text-white shadow-pop"><span className="h-2 w-2 rounded-full bg-red-500" />Đang giám sát · {flags} cờ</div>}
      <div className={box}>
        <div className="flex items-center gap-3 text-[14px] text-neutral-500"><span>Câu {i + 1}/{qs.length} · đã trả lời {answered}</span><div className="flex-1" />
          <span className="text-[12px]">{saveState === 'saving' ? 'Đang lưu…' : saveState === 'offline' ? <span className="flex items-center gap-1 text-amber-700"><CloudOff size={13} />Mất kết nối, đang thử lưu lại</span> : saveState === 'saved' ? 'Đã lưu' : ''}</span>
          <span className={`flex items-center gap-1 font-semibold ${left < 120 ? 'text-red-600' : 'text-ink'}`}><Clock size={15} />{fmtTime(left)}</span></div>
        <div className="mt-2 flex gap-1">{qs.map((x, j) => <button key={x.id} onClick={() => setI(j)} className={`h-1.5 flex-1 rounded ${j === i ? 'bg-ink' : ans[x.id] !== undefined && ans[x.id] !== '' ? 'bg-brand' : 'bg-neutral-200'}`} aria-label={`Câu ${j + 1}`} />)}</div>
        <div className="mt-8 whitespace-pre-wrap font-lato text-[22px] font-bold leading-snug">{q.q}</div>
        {q.type === 'mc' && <div className="mt-6 space-y-3">{q.choices.map((c, j) => <button key={j} onClick={() => set(j)} className={`flex w-full items-center gap-3 rounded-md border px-4 py-3.5 text-left font-serif text-[15px] ${ans[q.id] === j ? 'border-brand bg-brand/5' : 'border-line'}`}><span className={`h-4 w-4 shrink-0 rounded-full border-2 ${ans[q.id] === j ? 'border-brand bg-brand' : 'border-neutral-400'}`} />{c}</button>)}</div>}
        {q.type === 'mr' && <div className="mt-6 space-y-3"><div className="text-[13px] text-neutral-500">Chọn tất cả đáp án đúng</div>{q.choices.map((c, j) => { const on = (ans[q.id] ?? []).includes(j); return <button key={j} onClick={() => set(on ? ans[q.id].filter((x) => x !== j) : [...(ans[q.id] ?? []), j])} className={`flex w-full items-center gap-3 rounded-md border px-4 py-3.5 text-left font-serif text-[15px] ${on ? 'border-brand bg-brand/5' : 'border-line'}`}><span className={`h-4 w-4 shrink-0 rounded border-2 ${on ? 'border-brand bg-brand' : 'border-neutral-400'}`} />{c}</button> })}</div>}
        {q.type === 'match' && <div className="mt-6"><p className="mb-3 text-[13px] text-neutral-500">Kéo mỗi vế bên dưới vào ô phù hợp, hoặc bấm chọn rồi bấm vào ô.</p><MatchBoard left={q.left} opts={q.opts} value={ans[q.id]} onChange={set} /></div>}
        {q.type === 'order' && <div className="mt-6"><p className="mb-3 text-[13px] text-neutral-500">Kéo thả hoặc dùng nút mũi tên để xếp đúng thứ tự từ trên xuống.</p><OrderBoard opts={q.opts} value={ans[q.id]} onChange={set} /></div>}
        {q.type === 'cat' && <div className="mt-6"><p className="mb-3 text-[13px] text-neutral-500">Kéo từng mục vào đúng nhóm, hoặc bấm chọn mục rồi bấm vào nhóm.</p><CatBoard groups={q.groups} opts={q.opts} value={ans[q.id]} onChange={set} /></div>}
        {q.type === 'fill' && <input className="field mt-6 font-mono" value={ans[q.id] ?? ''} onChange={(e) => set(e.target.value)} onPaste={onPaste} placeholder="Nhập đáp án" />}
        {q.type === 'essay' && <><textarea className="field mt-6 h-52 font-serif" value={ans[q.id] ?? ''} maxLength={20000} onChange={(e) => set(e.target.value)} onPaste={onPaste} placeholder="Viết câu trả lời…" /><div className="mt-1 text-[12px] text-neutral-500">Chấm theo {q.criteria} tiêu chí. AI chấm nháp, người chấm xác nhận.</div></>}
        {q.type === 'code' && <>
          <div className="mt-6 flex items-center gap-2 text-[13px] text-neutral-600"><Code2 size={15} />JavaScript · khai báo hàm <code className="rounded bg-neutral-100 px-1">solve</code>. Bài được chạy với {q.tests?.length ?? 0} test: {q.tests?.join(', ')}</div>
          <textarea spellCheck={false} className="mt-2 h-64 w-full rounded-lg bg-[#1e1e2e] p-4 font-mono text-[13px] leading-relaxed text-[#e5e7eb] outline-none" value={ans[q.id] ?? q.starter ?? ''} onChange={(e) => set(e.target.value)} onPaste={onPaste} onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); const t = e.currentTarget, s = t.selectionStart; set(`${t.value.slice(0, s)}  ${t.value.slice(t.selectionEnd)}`); requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2 }) } }} />
        </>}
        <div className="mt-8 flex gap-3">
          {i > 0 && <button onClick={() => setI(i - 1)} className="rounded-full border-2 border-ink px-8 py-2.5 font-lato font-bold">Câu trước</button>}
          <div className="flex-1" />
          {i < qs.length - 1 && <button onClick={() => setI(i + 1)} className="rounded-full border-2 border-ink px-8 py-2.5 font-lato font-bold">Câu tiếp</button>}
          <button onClick={() => submit()} disabled={submitting} className="rounded-full bg-ink px-10 py-2.5 font-lato font-bold text-white disabled:opacity-50">{submitting ? 'Đang chấm…' : 'Nộp bài'}</button>
        </div>
      </div>
    </div>
  )
}

function Result({ attempt, onBack, onRetry, canRetry }) {
  const nav = useNavigate()
  const st = attempt.status
  const icon = st === 'passed' ? <CheckCircle2 size={40} className="text-emerald-600" /> : st === 'failed' ? <XCircle size={40} className="text-red-500" /> : <Hourglass size={40} className="text-amber-500" />
  const right = attempt.results?.filter((r) => r.correct === true).length ?? 0
  const auto = attempt.results?.filter((r) => r.correct !== null).length ?? 0
  return (
    <div className={box}>
      {icon}
      <h1 className="mt-3 font-lato text-[34px] font-black">{st === 'passed' ? 'Chúc mừng, bạn đã đạt' : st === 'failed' ? 'Chưa đạt lần này' : 'Đã nộp bài'}</h1>
      <div className="mt-6 rounded-2xl border border-line p-6 font-lato">
        {st === 'grading' ? (<>
          <div className="flex items-center gap-6"><div><div className="text-[13px] text-neutral-500">Phần chấm tự động</div><div className="text-[30px] font-bold">{right}/{auto}</div></div><div className="h-12 w-px bg-line" /><div><div className="text-[13px] text-neutral-500">Kết quả chính thức</div><div className="text-[17px] font-bold text-amber-600">Chờ người chấm xác nhận</div></div></div>
          <p className="mt-4 font-serif text-[15px] text-neutral-700">Bài có tự luận hoặc ghi nhận giám sát nên cần người chấm xem lại. Bạn sẽ thấy kết quả ở "Bài thi của tôi".</p>
        </>) : (<>
          <div className="flex items-end gap-3"><div className={`text-[44px] font-bold ${st === 'passed' ? 'text-emerald-700' : 'text-red-600'}`}>{Math.round(attempt.score)}%</div><div className="pb-3 text-[14px] text-neutral-500">điểm đạt {attempt.passScore}%</div></div>
          {st === 'passed' && attempt.mode === 'official' && <p className="mt-2 font-serif text-[15px] text-neutral-700">Mức kỹ năng mới đã được cập nhật vào hồ sơ năng lực của bạn.</p>}
        </>)}
      </div>
      {attempt.review?.length > 0 && <div className="mt-6"><div className="font-lato text-[18px] font-bold">Nên xem lại</div><p className="mt-1 text-[14px] text-neutral-600">Các câu chưa đúng thuộc phần sau của khóa:</p>
        {attempt.review.map((x, k) => <button key={k} onClick={() => x.lessonId && nav(`/learn/${x.artifactId ?? attempt.artifactId}?l=${x.lessonId}`)} className="mt-2 flex w-full items-center gap-3 rounded-xl bg-brand/5 px-4 py-3 text-left text-[14px]"><AlertTriangle size={16} className="shrink-0 text-brand" /><span className="flex-1">{x.q.slice(0, 80)}{x.q.length > 80 ? '…' : ''}</span><span className="shrink-0 font-semibold">{x.where}</span></button>)}</div>}
      {attempt.results?.some((r) => r.tests) && <div className="mt-6"><div className="font-lato text-[18px] font-bold">Kết quả test bài code</div>{attempt.results.filter((r) => r.tests).flatMap((r) => r.tests).map((t, k) => <div key={k} className="mt-2 flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 font-mono text-[13px]">{t.pass ? <Check size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-red-500" />}{t.name}{t.error && <span className="text-red-600">· {t.error}</span>}</div>)}</div>}
      <div className="mt-8 flex gap-3"><button onClick={onBack} className="rounded-full border-2 border-ink px-8 py-2.5 font-lato font-bold">Quay lại khóa học</button>{st === 'failed' && canRetry && <button onClick={onRetry} className="rounded-full bg-brand px-8 py-2.5 font-lato font-bold text-white">Thi lại</button>}</div>
    </div>
  )
}

export function ExamPage() {
  const { aid } = useParams()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { say } = useStore()
  const { me } = useMe()
  const preview = params.get('preview') === '1'
  const resultId = params.get('result')
  const [attemptId, setAttemptId] = useState(null)
  const [busy, setBusy] = useState(false)
  const info = useQuery({ queryKey: ['exam-info', aid], queryFn: () => get(`/exams/a/${aid}`), enabled: !preview })
  const shown = attemptId ?? resultId
  const attempt = useQuery({ queryKey: ['attempt', shown], queryFn: () => get(`/exams/attempts/${shown}`), enabled: !!shown, staleTime: 0 })
  const start = async (consent, resume = false) => {
    setBusy(true)
    try { const r = await post(`/exams/a/${aid}/start`, { consent, resume }); setAttemptId(r.id); if (r.resumed) say('Tiếp tục bài đang làm dở') } catch (e) { say(e.message); qc.invalidateQueries({ queryKey: ['exam-info', aid] }) } finally { setBusy(false) }
  }
  const finish = () => { qc.invalidateQueries({ queryKey: ['attempt', shown] }); qc.invalidateQueries({ queryKey: ['exam-info', aid] }); qc.invalidateQueries({ queryKey: ['my-exams'] }); qc.invalidateQueries({ queryKey: ['my-learning'] }) }
  // người học: đề riêng về trang khóa, bài kiểm tra trong Tài liệu nhanh về tài liệu đó
  const back = () => nav(me.role !== 'learner' ? -1 : info.data?.type === 'exam' ? `/course/${info.data.kitId}` : `/learn/${aid}`)
  const a = attempt.data
  let body
  if (preview) body = <div className={box}><h1 className="font-lato text-[32px] font-black">Bài kiểm tra</h1><p className="mt-3 rounded-xl bg-amber-50 p-4 text-[14px] text-amber-800">Đang xem trước bản nháp. Người học nhận đề riêng rút từ các câu đã duyệt sau khi bạn xuất bản. Mở "Bài kiểm tra" trong màn soạn để xem và duyệt câu hỏi.</p></div>
  else if (info.error || attempt.error) body = <div className={box}><p>{(info.error ?? attempt.error).message}</p></div>
  else if (!info.data || (shown && !a)) body = <div className="grid h-full place-items-center pt-20"><Spinner /></div>
  else if (a && a.status === 'in_progress') body = <Run key={a.id} attempt={a} proctor={info.data.proctor} onDone={finish} />
  else if (a) body = <Result attempt={a} onBack={back} canRetry={info.data.used < info.data.attempts} onRetry={() => { setAttemptId(null); setParams({}); qc.invalidateQueries({ queryKey: ['exam-info', aid] }) }} />
  else body = <Intro info={info.data} onStart={(c) => start(c)} onResume={() => start(true, true)} busy={busy} />
  return (
    <div className="flex h-full flex-col" style={themeStyle(info.data?.theme)}>
      <DeviceBar devices={false} left={<><button className="icon-btn" onClick={back} aria-label="Quay lại"><ChevronLeft size={20} /></button><span className="h-7 w-px bg-line" /><span className="text-[15px] font-medium">{info.data?.title ?? 'Bài kiểm tra'}</span></>} />
      <div className="scroll-thin flex-1 overflow-y-auto">{body}</div>
    </div>
  )
}
