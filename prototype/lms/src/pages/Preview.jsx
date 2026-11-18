import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronDown, Search, AlignLeft, HelpCircle, Sparkles, X, Lightbulb, ArrowUp, Play, Camera, ShieldCheck, Clock, Check, AlertTriangle, PlayCircle, BookOpen, Menu, Flag, Video as VideoIcon } from 'lucide-react'
import { useStore, useRole, uid } from '../store'
import { fmtTime } from '../data'
import { Thumb, Avatar } from '../ui'
import { BlockView } from '../blocks'
import { DeviceBar, DEVICES } from './Common'
import { Slide, VideoStage, ScenarioPlay } from './OtherEditors'
import { tutorAnswer, STARTERS } from '../tutor'

/* ---------- AI Tutor ---------- */
function Tutor({ open, onClose, onJump, disabled, courseTitle, art }) {
  const { set } = useStore()
  const [msgs, setMsgs] = useState([])
  const [t, setT] = useState('')
  const [typing, setTyping] = useState(false)
  const end = useRef()
  const lock = useRef(false)
  const docker = /docker|volume/i.test(courseTitle)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])
  if (!open) return null
  const ask = (q) => {
    if (!q.trim() || lock.current) return
    lock.current = true
    const a = tutorAnswer(q, docker, art)
    setMsgs((m) => [...m, { me: q }]); setT(''); setTyping(true)
    setTimeout(() => {
      setMsgs((m) => [...m, a]); setTyping(false); lock.current = false
      if (a.none) set((d) => { d.tutorMissed.unshift({ q, course: courseTitle, n: 1, at: 'hôm nay' }) })
    }, 550)
  }
  const ICON = { bulb: Lightbulb, list: AlignLeft, search: Search, book: BookOpen }
  const lastBot = msgs.length - 1
  return (
    <div className="fade fixed bottom-24 right-6 z-40 flex h-[min(560px,calc(100vh-120px))] w-[400px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-100"><Sparkles size={15} className="text-violet-600" /></span>
        <div className="min-w-0 flex-1 leading-tight"><div className="text-[14px] font-semibold">AI Tutor</div><div className="truncate text-[12px] text-neutral-500">{courseTitle}</div></div>
        {msgs.length > 0 && !disabled && <button onClick={() => setMsgs([])} className="rounded-lg px-2 py-1 text-[12px] font-medium text-neutral-600 hover:bg-neutral-100">Cuộc trò chuyện mới</button>}
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-line"><X size={16} /></button>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-5">
        {disabled ? <div className="pt-20 text-center"><ShieldCheck size={40} className="mx-auto text-neutral-400" /><div className="mt-3 font-semibold">AI Tutor tắt trong lúc thi chính thức</div></div>
          : msgs.length === 0 ? (
            <div className="pt-8 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-violet-300"><Sparkles size={28} className="text-violet-500" /></div>
              <div className="mt-4 text-[17px] font-semibold">Cần trợ giúp không?</div>
              <div className="mt-1 text-[13px] text-neutral-500">Hỏi bất kỳ điều gì về nội dung khóa này</div>
              <div className="mt-5 flex flex-col items-center gap-2">
                {STARTERS(docker, art).map(([k, l]) => { const I = ICON[k]; return <button key={l} onClick={() => ask(l)} className="flex items-center gap-1.5 rounded-full border-2 border-violet-300 px-4 py-1.5 text-[14px] font-medium hover:bg-violet-50"><I size={15} />{l}</button> })}
              </div>
            </div>
          ) : msgs.map((m, i) => m.me ? (
            <div key={i} className="my-3 flex justify-end"><div className="max-w-[85%] rounded-2xl bg-ink px-4 py-2.5 text-[14px] text-white">{m.me}</div></div>
          ) : (
            <div key={i}>
              <div className={`my-3 rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${m.none ? 'border border-amber-200 bg-amber-50' : 'bg-neutral-100'}`}>
                {m.text}
                {m.list && <ul className="mt-2 space-y-1">{m.list.map((x) => <li key={x} className="flex gap-2"><PlayCircle size={15} className="mt-0.5 shrink-0 text-violet-600" />{x}</li>)}</ul>}
                {m.note && <div className="mt-2 text-[13px] text-neutral-600">{m.note}</div>}
                {m.src && <div className="mt-2 text-[12px] text-neutral-500">Nguồn: {m.src}</div>}
                {m.jump && <div className="mt-2 flex flex-wrap gap-2">{m.jump.map(([l, to]) => <button key={l} onClick={() => onJump(to)} className="rounded-full border border-violet-300 bg-white px-3 py-1 text-[12px] font-semibold text-violet-700">{l}</button>)}</div>}
              </div>
              {i === lastBot && !typing && m.suggest?.length > 0 && <div className="-mt-1 mb-3 flex flex-wrap gap-1.5">{m.suggest.map((x) => <button key={x} onClick={() => ask(x)} className="rounded-full border border-line bg-white px-3 py-1 text-[12px] text-neutral-700 hover:border-violet-300 hover:bg-violet-50">{x}</button>)}</div>}
            </div>
          ))}
        {typing && <div className="my-3 flex w-16 items-center justify-center gap-1 rounded-2xl bg-neutral-100 py-3">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${d * 0.15}s` }} />)}</div>}
        <div ref={end} />
      </div>
      <div className="p-4">
        <div className="flex items-center rounded-xl border border-line px-3 py-2"><input disabled={disabled} value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(t)} className="flex-1 text-[14px] outline-none" placeholder="Nhập câu hỏi" /><button onClick={() => ask(t)} className="grid h-7 w-7 place-items-center rounded-md bg-neutral-100"><ArrowUp size={15} /></button></div>
        <p className="mt-2 text-center text-[11px] leading-snug text-neutral-500">AI có thể sai, hãy kiểm tra thông tin quan trọng. Tutor chỉ trả lời từ nội dung đã chia sẻ mà bạn được xem.</p>
      </div>
    </div>
  )
}

/* ---------- Thi ---------- */
function Exam({ art, onExit }) {
  const { S, set } = useStore()
  const { role, me } = useRole()
  const qz = art.quiz
  const qs = qz.questions.filter((q) => q.approved)
  const [stage, setStage] = useState('intro')
  const [agree, setAgree] = useState(false)
  const [i, setI] = useState(0)
  const [ans, setAns] = useState({})
  const [flags, setFlags] = useState([])
  const [sec, setSec] = useState(0)
  useEffect(() => { if (stage !== 'run') return; const t = setInterval(() => setSec((s) => s + 1), 1000); const v = () => { if (document.hidden && qz.proctor) setFlags((f) => [...f, { kind: 'Chuyển tab', t: fmtTime(sec) }]) }; document.addEventListener('visibilitychange', v); return () => { clearInterval(t); document.removeEventListener('visibilitychange', v) } }, [stage, sec])
  const q = qs[i]
  const left = qz.minutes * 60 - sec
  useEffect(() => { if (stage === 'run' && left <= 0) submit() }, [left, stage])
  const submit = () => {
    const mc = qs.filter((x) => x.type === 'mc' || x.type === 'fill').map((x) => x.type === 'mc' ? (x.choices[ans[x.id]]?.ok ? 1 : 0) : (String(ans[x.id] || '').trim().toLowerCase() === x.answer ? 1 : 0))
    const eq = qs.find((x) => x.type === 'essay'); const et = (eq && ans[eq.id]) || ''
    const ai = (eq?.rubric || []).map((_, c) => ({ c, ok: eq.kw?.[c] ? new RegExp(eq.kw[c], 'i').test(et) : et.length > 40, quote: '' }))
    if (qz.mode === 'official') set((d) => { d.submissions.unshift({ id: uid('sub'), who: role === 'learner' ? me.name : `${me.name} (xem thử)`, code: me.code || 'NV001', art: art.id, at: 'Vừa xong', mc, status: 'grading', essay: et || '(bỏ trống)', ai, flags: flags.map((f) => ({ ...f, note: f.kind === 'Chuyển tab' ? 'Rời trang bài thi' : 'Dán nội dung vào ô tự luận' })) }) })
    setStage('done')
  }
  const box = 'mx-auto max-w-[720px] px-6 py-14'
  if (qs.length === 0) return <div className={box}><h1 className="font-lato text-[32px] font-black">Bài kiểm tra chưa sẵn sàng</h1><p className="mt-3 font-serif text-neutral-700">Ngân hàng đề chưa có câu nào.</p></div>
  if (stage === 'intro') return (
    <div className={box}>
      <div className="text-[13px] font-bold uppercase tracking-wider text-brand">{qz.mode === 'official' ? 'Thi chính thức' : 'Luyện tập'}</div>
      <h1 className="mt-2 font-lato text-[40px] font-black">Bài kiểm tra</h1>
      <div className="mt-6 grid grid-cols-4 gap-3 text-center font-lato">{[[`${qs.length}`, 'câu hỏi'], [`${qz.minutes}'`, 'thời gian'], [`${qz.passScore}%`, 'điểm đạt'], [`${qz.attempts}`, 'lượt thi']].map(([a, b]) => <div key={b} className="rounded-xl border border-line py-4"><div className="text-[24px] font-bold">{a}</div><div className="text-[13px] text-neutral-500">{b}</div></div>)}</div>
      <p className="mt-6 font-serif text-[16px] leading-relaxed text-neutral-700">Mỗi người nhận một đề riêng rút từ ngân hàng đề. Trắc nghiệm được chấm ngay; tự luận do AI chấm nháp và người chấm xác nhận.{qz.mode === 'official' && ' Kết quả đạt sẽ cập nhật mức kỹ năng của bạn (tối đa mức 3).'}</p>
      <button onClick={() => setStage(qz.proctor ? 'consent' : 'run')} className="mt-8 rounded-full bg-brand px-10 py-3 font-lato font-bold text-white">Bắt đầu làm bài</button>
    </div>
  )
  if (stage === 'consent') return (
    <div className={box}>
      <ShieldCheck size={36} className="text-brand" />
      <h1 className="mt-3 font-lato text-[32px] font-black">Bài thi này có giám sát</h1>
      <p className="mt-3 font-serif text-[16px] text-neutral-700">Trước khi vào thi, hãy đọc những gì được ghi lại:</p>
      <div className="mt-5 space-y-2.5">{['Camera ghi hình trong lúc làm bài', 'AI gắn cờ khi: rời khỏi khung hình, có người thứ hai, chuyển tab, dán nội dung từ ngoài vào', 'AI không tự hủy bài hay trừ điểm. Người chấm xem lại đoạn bị gắn cờ rồi quyết định', 'Bản ghi tự xóa sau 30 ngày, trừ bài đang được xem xét', 'AI Tutor tắt trong lúc thi'].map((x) => <div key={x} className="flex gap-3 rounded-xl bg-neutral-50 px-4 py-3 text-[15px]"><Check size={18} className="mt-0.5 shrink-0 text-emerald-600" />{x}</div>)}</div>
      <div className="mt-6 flex items-center gap-4 rounded-xl border border-line p-4"><div className="grid h-20 w-28 place-items-center rounded-lg bg-neutral-800 text-white"><Camera size={22} /></div><div className="text-[14px]"><div className="font-semibold">Kiểm tra camera</div><div className="text-emerald-700">Camera hoạt động · Thấy rõ khuôn mặt</div></div></div>
      <label className="mt-6 flex items-center gap-3 text-[15px]"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-4 w-4" />Tôi đã đọc và đồng ý với việc giám sát cho bài thi này</label>
      <div className="mt-6 flex gap-3"><button onClick={onExit} className="rounded-full border-2 border-ink px-8 py-2.5 font-lato font-bold">Để sau</button><button disabled={!agree} onClick={() => setStage('run')} className="rounded-full bg-brand px-10 py-2.5 font-lato font-bold text-white disabled:opacity-40">Đồng ý và vào thi</button></div>
    </div>
  )
  if (stage === 'done') {
    const auto = qs.filter((x) => x.type === 'mc' || x.type === 'fill')
    const right = auto.filter((x) => x.type === 'mc' ? x.choices[ans[x.id]]?.ok : String(ans[x.id] || '').trim().toLowerCase() === x.answer).length
    const wrong = auto.filter((x) => !(x.type === 'mc' ? x.choices[ans[x.id]]?.ok : String(ans[x.id] || '').trim().toLowerCase() === x.answer))
    return (
      <div className={box}>
        <h1 className="font-lato text-[34px] font-black">Đã nộp bài</h1>
        <div className="mt-6 rounded-2xl border border-line p-6 font-lato">
          <div className="flex items-center gap-6"><div><div className="text-[13px] text-neutral-500">Trắc nghiệm (chấm ngay)</div><div className="text-[30px] font-bold">{right}/{auto.length}</div></div><div className="h-12 w-px bg-line" /><div><div className="text-[13px] text-neutral-500">Tự luận</div><div className="text-[17px] font-bold text-amber-600">Chờ người chấm xác nhận</div></div></div>
          {qz.mode === 'official' && <p className="mt-4 font-serif text-[15px] text-neutral-700">Kết quả chính thức có sau khi người chấm xác nhận. Nếu đạt, mức kỹ năng của bạn sẽ được cập nhật ở Quản trị nhân tài.</p>}
        </div>
        {wrong.length > 0 && <div className="mt-6"><div className="font-lato text-[18px] font-bold">Nên xem lại</div>{wrong.map((x) => <div key={x.id} className="mt-2 flex items-center gap-3 rounded-xl bg-orange-50 px-4 py-3 text-[14px]"><AlertTriangle size={16} className="text-brand" /><span className="flex-1">{x.q.slice(0, 70)}…</span><span className="font-semibold">{x.src}</span></div>)}</div>}
        <button onClick={onExit} className="mt-8 rounded-full bg-brand px-10 py-3 font-lato font-bold text-white">Quay lại khóa học</button>
      </div>
    )
  }
  return (
    <div className="relative">
      {qz.proctor && <div className="fixed bottom-24 right-6 z-30 w-44 overflow-hidden rounded-xl bg-neutral-800 shadow-pop"><div className="grid h-24 place-items-center text-white/70"><Camera size={22} /></div><div className="flex items-center gap-1.5 bg-black px-2 py-1 text-[11px] text-white"><span className="h-2 w-2 rounded-full bg-red-500" />Đang ghi · {flags.length} cờ</div></div>}
      <div className={box}>
        <div className="flex items-center text-[14px] text-neutral-500"><span>Câu {i + 1}/{qs.length}</span><div className="flex-1" /><Clock size={15} className="mr-1" />{fmtTime(Math.max(0, left))}</div>
        <div className="mt-2 h-1 rounded bg-neutral-100"><div className="h-1 rounded bg-brand" style={{ width: `${((i + 1) / qs.length) * 100}%` }} /></div>
        <div className="mt-8 font-lato text-[22px] font-bold leading-snug">{q.q}</div>
        {q.type === 'mc' && <div className="mt-6 space-y-3">{q.choices.map((c, j) => <button key={j} onClick={() => setAns({ ...ans, [q.id]: j })} className={`flex w-full items-center gap-3 rounded-md border px-4 py-3.5 text-left font-serif text-[15px] ${ans[q.id] === j ? 'border-brand bg-orange-50/40' : 'border-line'}`}><span className={`h-4 w-4 shrink-0 rounded-full border-2 ${ans[q.id] === j ? 'border-brand bg-brand' : 'border-neutral-400'}`} />{c.t}</button>)}</div>}
        {q.type === 'fill' && <input className="field mt-6 font-mono" value={ans[q.id] || ''} onChange={(e) => setAns({ ...ans, [q.id]: e.target.value })} placeholder="Nhập đáp án" />}
        {q.type === 'essay' && <textarea className="field mt-6 h-44 font-serif" value={ans[q.id] || ''} onChange={(e) => setAns({ ...ans, [q.id]: e.target.value })} onPaste={() => qz.proctor && setFlags((f) => [...f, { kind: 'Dán từ ngoài vào', t: fmtTime(sec) }])} placeholder="Viết câu trả lời…" />}
        <div className="mt-8 flex gap-3">
          {i > 0 && <button onClick={() => setI(i - 1)} className="rounded-full border-2 border-ink px-8 py-2.5 font-lato font-bold">Câu trước</button>}
          <div className="flex-1" />
          {i < qs.length - 1 ? <button onClick={() => setI(i + 1)} className="rounded-full bg-brand px-10 py-2.5 font-lato font-bold text-white">Câu tiếp</button> : <button onClick={submit} className="rounded-full bg-ink px-10 py-2.5 font-lato font-bold text-white">Nộp bài</button>}
        </div>
      </div>
    </div>
  )
}

/* ---------- Khóa học ---------- */
function CoursePlayer({ art, start }) {
  const [cur, setCur] = useState(start)
  const [doneSet, setDone] = useState([])
  const [tutor, setTutor] = useState(false)
  const [side, setSide] = useState(true)
  const [vid, setVid] = useState(null)
  const nav = useNavigate()
  const lessons = art.lessons
  const L = lessons.find((x) => x.id === cur)
  const idx = lessons.indexOf(L)
  const pct = Math.round((doneSet.length / lessons.length) * 100)
  const inExam = L?.kind === 'quiz'
  const jump = (to) => { setTutor(false); if (typeof to === 'number') setVid(to); else if (lessons.some((x) => x.id === to)) { setCur(to); window.scrollTo(0, 0) } }
  if (!cur) return (
    <div>
      <div className="grid min-h-[520px] grid-cols-2">
        <div className="flex flex-col justify-center bg-brand px-[14%]"><div className="flex items-center gap-2 font-lato font-bold"><Avatar size={32} />Nguyễn An</div><h1 className="mt-5 font-lato text-[34px] font-black leading-tight">{art.title}</h1><button onClick={() => setCur(lessons[0].id)} className="mt-7 w-fit rounded-full bg-ink px-9 py-3.5 font-lato text-[13px] font-bold tracking-wider text-white">BẮT ĐẦU KHÓA HỌC</button></div>
        <Thumb img={art.img} />
      </div>
      <div className="mx-auto max-w-[620px] px-6 py-14 font-serif text-[17px] leading-[1.9]">{art.summary}
        <div className="mt-10 font-sans">{lessons.map((x, i) => <button key={x.id} onClick={() => setCur(x.id)} className="flex w-full items-center gap-4 border-b border-line py-4 text-left"><span className="w-6 text-neutral-400">{i + 1}</span>{x.kind === 'quiz' ? <HelpCircle size={18} /> : <AlignLeft size={18} />}<span className="flex-1 font-lato text-[17px] font-bold">{x.kind === 'quiz' ? 'Bài kiểm tra' : x.title}</span></button>)}</div>
      </div>
      <TutorBtn onClick={() => setTutor(!tutor)} />
      <Tutor open={tutor} onClose={() => setTutor(false)} courseTitle={art.title} art={art} onJump={jump} />
      {vid !== null && <VidModal t={vid} onClose={() => setVid(null)} />}
    </div>
  )
  return (
    <div className="flex min-h-full">
      {side && <aside className="sticky top-0 h-[calc(100vh-56px)] w-[300px] shrink-0 overflow-y-auto bg-neutral-100">
        <div className="bg-brand px-6 pb-5 pt-5"><div className="flex justify-end"><Search size={18} /></div><div className="font-lato text-[26px] font-black leading-tight">{art.title}</div><div className="mt-6 h-px bg-ink/30" /><div className="mt-2 text-[11px] font-bold tracking-wide">{pct}% HOÀN THÀNH</div></div>
        {lessons.map((x) => <button key={x.id} onClick={() => setCur(x.id)} className={`flex w-full items-center gap-3 px-5 py-4 text-left text-[13px] font-semibold ${x.id === cur ? 'border-l-4 border-brand bg-white' : 'hover:bg-white/60'}`}>{x.kind === 'quiz' ? <HelpCircle size={15} /> : <AlignLeft size={15} />}<span className="flex-1">{x.kind === 'quiz' ? 'Bài kiểm tra' : x.title}</span><span className={`h-4 w-4 rounded-full border-2 ${doneSet.includes(x.id) ? 'border-brand bg-brand' : 'border-neutral-400'}`} /></button>)}
      </aside>}
      <div className="flex-1">
        <button onClick={() => setSide(!side)} className="m-3 icon-btn"><Menu size={18} /></button>
        {inExam ? <Exam art={art} onExit={() => setCur(lessons[0].id)} /> : (<>
          <div className="mx-auto max-w-[680px] px-6 pt-6"><div className="font-serif text-[13px] italic text-neutral-500">Bài {idx + 1} / {lessons.length}</div><h1 className="mt-3 font-lato text-[38px] font-black leading-tight">{L.title}</h1><div className="mt-4 flex items-center gap-2 text-[14px]"><Avatar size={30} />Nguyễn An</div><div className="mt-8 h-1 w-28 bg-brand" /></div>
          <div className="mt-10 space-y-14 border-t border-line pt-14 pb-14">{L.blocks.map((b) => <div key={b.id}><BlockView b={b} /></div>)}</div>
          <div className="pb-24 text-center"><button onClick={() => { setDone((d) => [...new Set([...d, cur])]); setCur(lessons[idx + 1]?.id || cur); window.scrollTo(0, 0) }} className="rounded-full bg-brand px-12 py-3.5 font-lato text-[14px] font-bold tracking-wider text-white">TIẾP TỤC</button></div>
        </>)}
      </div>
      <TutorBtn onClick={() => setTutor(!tutor)} off={inExam && art.quiz.mode === 'official'} />
      <Tutor open={tutor} disabled={inExam && art.quiz.mode === 'official'} onClose={() => setTutor(false)} courseTitle={art.title} art={art} onJump={jump} />
      {vid !== null && <VidModal t={vid} onClose={() => setVid(null)} />}
    </div>
  )
}

const TutorBtn = ({ onClick, off }) => <button onClick={onClick} className={`fixed bottom-8 right-6 z-30 flex items-center gap-2 rounded-full border-2 border-violet-400 bg-[#1e1b4b] px-4 py-2.5 text-[14px] font-semibold text-white shadow-pop ${off ? 'opacity-50' : ''}`}><Sparkles size={16} />Hỏi AI Tutor</button>

function VidModal({ t, onClose }) {
  const { S } = useStore()
  const art = S.artifacts['a-vid']
  const [time, setTime] = useState(t)
  const [play, setPlay] = useState(true)
  useEffect(() => { if (!play) return; const i = setInterval(() => setTime((x) => x + 2), 200); return () => clearInterval(i) }, [play])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-8" onClick={onClose}>
      <div className="w-full max-w-[900px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center text-white"><VideoIcon size={16} className="mr-2" />{art.title} · bắt đầu từ {fmtTime(t)}<div className="flex-1" /><button onClick={onClose}><X size={20} /></button></div>
        <VideoStage art={art} t={time} playing={play} onToggle={() => setPlay(!play)} />
      </div>
    </div>
  )
}

function VideoPlayer({ art }) {
  const [t, setT] = useState(0)
  const [play, setPlay] = useState(false)
  const [cp, setCp] = useState(null)
  const [passed, setPassed] = useState([])
  const [tutor, setTutor] = useState(false)
  const [fb, setFb] = useState(null)
  useEffect(() => { const hit = art.checkpoints.find((c) => c.t <= t && t - c.t < 4 && !passed.includes(c.t)); if (hit && play) { setPlay(false); setCp(hit) } if (t >= art.duration) setPlay(false) }, [t])
  useEffect(() => {
    if (!play) return
    const i = setInterval(() => setT((x) => Math.min(art.duration, x + 3)), 100)
    return () => clearInterval(i)
  }, [play, passed])
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <h1 className="font-lato text-[30px] font-black">{art.title}</h1>
      <div className="mt-5 grid grid-cols-[1fr_300px] gap-6">
        <div>
          <VideoStage art={art} t={t} playing={play} onToggle={() => setPlay(!play)} cp={cp} onAnswer={(ok) => { setFb(ok ? 'Chính xác!' : 'Chưa đúng, xem lại chương trước.'); setPassed((p) => [...p, cp.t]); setCp(null); setPlay(true); setTimeout(() => setFb(null), 2000) }} />
          {fb && <div className="mt-3 rounded-lg bg-neutral-100 px-4 py-2 text-[14px]">{fb}</div>}
          <div className="relative mt-4 h-2 rounded-full bg-neutral-200"><div className="h-2 rounded-full bg-brand" style={{ width: `${(t / art.duration) * 100}%` }} />{art.checkpoints.map((c) => <span key={c.t} className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full bg-violet-600 text-white" style={{ left: `${(c.t / art.duration) * 100}%` }}><Flag size={11} className="m-1" /></span>)}</div>
        </div>
        <div className="rounded-xl border border-line">
          <div className="border-b border-line px-4 py-3 font-lato font-bold">Chương</div>
          {art.chapters.map((c) => <button key={c.t} onClick={() => setT(c.t)} className={`flex w-full gap-3 px-4 py-3 text-left text-[14px] ${t >= c.t ? 'font-semibold' : ''} hover:bg-neutral-50`}><span className="w-11 font-mono text-[12px] text-sky-700">{fmtTime(c.t)}</span>{c.title}</button>)}
        </div>
      </div>
      <TutorBtn onClick={() => setTutor(!tutor)} />
      <Tutor open={tutor} onClose={() => setTutor(false)} courseTitle={art.title} art={art} onJump={(to) => { setTutor(false); if (typeof to === 'number') setT(to) }} />
    </div>
  )
}

export default function Preview() {
  const { aid } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { S } = useStore()
  const { role } = useRole()
  const learner = role === 'learner'
  const art = S.artifacts[aid]
  const [device, setDevice] = useState('desktop')
  const [slide, setSlide] = useState(0)
  if (!art) return null
  const w = DEVICES.find((d) => d[0] === device)[3]
  return (
    <div className="flex h-full flex-col">
      <DeviceBar device={device} setDevice={setDevice} devices={!learner}
        left={learner
          ? <><button className="icon-btn" onClick={() => nav('/learn')}><ChevronLeft size={20} /></button><span className="h-7 w-px bg-line" /><span className="text-[15px] font-medium">Khóa học của tôi</span></>
          : <><button className="icon-btn" onClick={() => nav(-1)}><ChevronLeft size={20} /></button><span className="h-7 w-px bg-line" /><span className="text-[15px] font-medium">Xem trước</span><button className="flex items-center gap-1 text-[14px] font-semibold">Bản hiện tại<ChevronDown size={14} /></button></>}
        right={!learner && <button className="btn-dark btn-sm ml-3 h-9" onClick={() => nav(`/edit/${aid}`)}>Sửa</button>} />
      <div className="scroll-thin flex-1 overflow-y-auto bg-neutral-100">
        <div className="mx-auto min-h-full bg-white transition-all" style={{ width: w, maxWidth: '100%' }}>
          {art.type === 'qr' && <CoursePlayer key={params.get('l') || 'cover'} art={art} start={params.get('l')} />}
          {art.type === 'video' && <VideoPlayer art={art} />}
          {art.type === 'scenario' && <div className="h-[calc(100vh-56px)]"><ScenarioPlay art={art} onExit={() => nav(-1)} /></div>}
          {art.type === 'deck' && <div className="p-8"><div className="aspect-video overflow-hidden rounded-xl shadow-pop"><Slide s={art.slides[slide]} n={slide + 1} total={art.slides.length} /></div><div className="mt-4 flex items-center justify-center gap-4"><button onClick={() => setSlide(Math.max(0, slide - 1))} className="btn-line btn-sm">Trước</button><span className="text-[14px]">{slide + 1}/{art.slides.length}</span><button onClick={() => setSlide(Math.min(art.slides.length - 1, slide + 1))} className="btn-line btn-sm">Sau</button></div></div>}
          {art.type === 'guide' && <div className="mx-auto max-w-[760px] p-10"><h1 className="font-lato text-[32px] font-black">{art.title}</h1>{art.steps.map((s, i) => <div key={s.title} className="mt-6 flex gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500 font-bold text-white">{i + 1}</span><div><div className="font-lato text-[19px] font-bold">{s.title}</div><p className="mt-1 font-serif">{s.text}</p><Thumb img={s.img || 'screen'} className="mt-3 h-40 w-[420px] rounded-lg" /></div></div>)}</div>}
        </div>
      </div>
    </div>
  )
}
