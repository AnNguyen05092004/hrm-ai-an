import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Search, AlignLeft, HelpCircle, Sparkles, X, Lightbulb, ArrowUp, ShieldCheck, PlayCircle, BookOpen, Menu, Flag, Video as VideoIcon, Clock, CheckCircle2 } from 'lucide-react'
import { useMe } from '../store'
import { fmtTime } from '../data'
import { Thumb, Spinner } from '../ui'
import { BlockView } from '../blocks'
import { DeviceBar, DEVICES } from './Common'
import { Slide, VideoStage, ScenarioPlay } from './OtherEditors'
import { Md } from '../md'
import { get, post } from '../api'

const STARTERS = [['bulb', 'Giải thích đơn giản hơn'], ['list', 'Tóm tắt khóa này'], ['search', 'Khái niệm quan trọng nhất là gì?'], ['book', 'Mình chỉ cần học một phần, nên xem phần nào?']]
const ICON = { bulb: Lightbulb, list: AlignLeft, search: Search, book: BookOpen }

/* ---------- AI Tutor ---------- */
function Tutor({ open, onClose, onJump, artId, courseTitle, draft }) {
  const [msgs, setMsgs] = useState([])
  const [t, setT] = useState('')
  const [typing, setTyping] = useState(false)
  const end = useRef()
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])
  if (!open) return null
  const ask = async (q) => {
    if (!q.trim() || typing) return
    const history = msgs.slice(-6).map((m) => ({ role: m.me ? 'user' : 'tutor', text: (m.me ?? m.text ?? '').slice(0, 1500) }))
    setMsgs((m) => [...m, { me: q }]); setT(''); setTyping(true)
    try { const a = await post(`/tutor/${artId}/ask`, { question: q, history }); setMsgs((m) => [...m, a]) } catch (e) { setMsgs((m) => [...m, { text: e.message, none: true }]) } finally { setTyping(false) }
  }
  const lastBot = msgs.length - 1
  return (
    <div className="fade fixed bottom-24 right-6 z-40 flex h-[min(580px,calc(100vh-120px))] w-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-100"><Sparkles size={15} className="text-violet-600" /></span>
        <div className="min-w-0 flex-1 leading-tight"><div className="text-[14px] font-semibold">AI Tutor</div><div className="truncate text-[12px] text-neutral-500">{courseTitle}</div></div>
        {msgs.length > 0 && <button onClick={() => setMsgs([])} className="rounded-lg px-2 py-1 text-[12px] font-medium text-neutral-600 hover:bg-neutral-100">Cuộc trò chuyện mới</button>}
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-line" aria-label="Đóng"><X size={16} /></button>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-5">
        {draft && <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Đang xem trước bản nháp. Tutor chỉ trả lời từ bản đã xuất bản.</div>}
        {msgs.length === 0 ? (
          <div className="pt-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-violet-300"><Sparkles size={28} className="text-violet-500" /></div>
            <div className="mt-4 text-[17px] font-semibold">Cần trợ giúp không?</div>
            <div className="mt-1 text-[13px] text-neutral-500">Hỏi bất kỳ điều gì về nội dung khóa này</div>
            <div className="mt-5 flex flex-col items-center gap-2">
              {STARTERS.map(([k, l]) => { const I = ICON[k]; return <button key={l} onClick={() => ask(l)} className="flex items-center gap-1.5 rounded-full border-2 border-violet-300 px-4 py-1.5 text-[14px] font-medium hover:bg-violet-50"><I size={15} />{l}</button> })}
            </div>
          </div>
        ) : msgs.map((m, i) => m.me ? (
          <div key={i} className="my-3 flex justify-end"><div className="max-w-[85%] rounded-2xl bg-ink px-4 py-2.5 text-[14px] text-white">{m.me}</div></div>
        ) : (
          <div key={i}>
            <div className={`my-3 rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${m.none ? 'border border-amber-200 bg-amber-50' : m.off ? 'border border-line bg-neutral-50' : 'bg-neutral-100'}`}>
              {m.off && <ShieldCheck size={18} className="mb-1 text-neutral-500" />}
              <Md text={m.text} />
              {m.list && <ul className="mt-2 space-y-1">{m.list.map((x) => <li key={x} className="flex gap-2"><PlayCircle size={15} className="mt-0.5 shrink-0 text-violet-600" /><span><Md text={x} /></span></li>)}</ul>}
              {m.src && <div className="mt-2 text-[12px] text-neutral-500">Nguồn: {m.src}</div>}
              {m.jump?.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{m.jump.map((j) => <button key={j.label} onClick={() => onJump(j)} className="rounded-full border border-violet-300 bg-white px-3 py-1 text-[12px] font-semibold text-violet-700">{j.label}</button>)}</div>}
            </div>
            {i === lastBot && !typing && m.suggest?.length > 0 && <div className="-mt-1 mb-3 flex flex-wrap gap-1.5">{m.suggest.map((x) => <button key={x} onClick={() => ask(x)} className="rounded-full border border-line bg-white px-3 py-1 text-[12px] text-neutral-700 hover:border-violet-300 hover:bg-violet-50">{x}</button>)}</div>}
          </div>
        ))}
        {typing && <div className="my-3 flex w-16 items-center justify-center gap-1 rounded-2xl bg-neutral-100 py-3">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${d * 0.15}s` }} />)}</div>}
        <div ref={end} />
      </div>
      <div className="p-4">
        <div className="flex items-center rounded-xl border border-line px-3 py-2"><input value={t} maxLength={1000} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(t)} className="flex-1 text-[14px] outline-none" placeholder="Nhập câu hỏi" /><button onClick={() => ask(t)} disabled={typing} className="grid h-7 w-7 place-items-center rounded-md bg-neutral-100" aria-label="Gửi"><ArrowUp size={15} /></button></div>
        <p className="mt-2 text-center text-[11px] leading-snug text-neutral-500">AI có thể sai, hãy kiểm tra thông tin quan trọng. Tutor chỉ trả lời từ nội dung đã xuất bản mà bạn được xem.</p>
      </div>
    </div>
  )
}

const TutorBtn = ({ onClick }) => <button onClick={onClick} className="fixed bottom-8 right-6 z-30 flex items-center gap-2 rounded-full border-2 border-violet-400 bg-[#1e1b4b] px-4 py-2.5 text-[14px] font-semibold text-white shadow-pop"><Sparkles size={16} />Hỏi AI Tutor</button>

/** Dùng chung: theo dõi tiến độ phía server */
function useProgress(art, preview) {
  const qc = useQueryClient()
  const [done, setDone] = useState(art.progress?.done ?? [])
  const mark = async (unit) => {
    if (preview || done.includes(unit)) return
    setDone((d) => [...d, unit])
    try { const r = await post(`/learn/a/${art.id}/progress`, { unit }); setDone(r.done); qc.invalidateQueries({ queryKey: ['my-learning'] }) } catch { /* tiến độ sẽ ghi lại ở lần sau */ }
  }
  return { done, mark }
}

/* ---------- Tài liệu nhanh ---------- */
function CoursePlayer({ art, start, preview, onTutorJump }) {
  const nav = useNavigate()
  const [cur, setCur] = useState(start)
  const [side, setSide] = useState(true)
  const { done, mark } = useProgress(art, preview)
  const lessons = art.lessons
  const L = lessons.find((x) => x.id === cur)
  const idx = lessons.indexOf(L)
  const learnCount = lessons.filter((x) => x.kind === 'lesson').length
  const pct = Math.round((done.length / Math.max(1, learnCount)) * 100)
  useEffect(() => { onTutorJump.current = (j) => { if (j.to.lesson && lessons.some((x) => x.id === j.to.lesson)) { setCur(j.to.lesson); window.scrollTo(0, 0) } } })
  const openQuiz = () => nav(`/exam/${art.id}${preview ? '?preview=1' : ''}`)
  if (!cur) return (
    <div>
      <div className="grid min-h-[520px] grid-cols-2">
        <div className="flex flex-col justify-center bg-brand px-[14%]"><div className="font-lato text-[14px] font-bold uppercase tracking-wider">{art.kitTitle}</div><h1 className="mt-5 font-lato text-[34px] font-black leading-tight">{art.title}</h1><button onClick={() => setCur(lessons[0].id)} className="mt-7 w-fit rounded-full bg-ink px-9 py-3.5 font-lato text-[13px] font-bold tracking-wider text-white">{done.length ? 'HỌC TIẾP' : 'BẮT ĐẦU KHÓA HỌC'}</button></div>
        <Thumb img={art.img} />
      </div>
      <div className="mx-auto max-w-[620px] px-6 py-14 font-serif text-[17px] leading-[1.9]">{art.summary}
        <div className="mt-10 font-sans">{lessons.map((x, i) => <button key={x.id} onClick={() => (x.kind === 'quiz' ? openQuiz() : setCur(x.id))} className="flex w-full items-center gap-4 border-b border-line py-4 text-left"><span className="w-6 text-neutral-400">{i + 1}</span>{x.kind === 'quiz' ? <HelpCircle size={18} /> : <AlignLeft size={18} />}<span className="flex-1 font-lato text-[17px] font-bold">{x.kind === 'quiz' ? 'Bài kiểm tra' : x.title}</span>{done.includes(x.id) && <CheckCircle2 size={18} className="text-emerald-600" />}</button>)}</div>
      </div>
    </div>
  )
  return (
    <div className="flex min-h-full">
      {side && <aside className="sticky top-0 h-[calc(100vh-56px)] w-[300px] shrink-0 overflow-y-auto bg-neutral-100">
        <div className="bg-brand px-6 pb-5 pt-5"><div className="font-lato text-[26px] font-black leading-tight">{art.title}</div><div className="mt-6 h-px bg-ink/30" /><div className="mt-2 text-[11px] font-bold tracking-wide">{pct}% HOÀN THÀNH</div></div>
        {lessons.map((x) => <button key={x.id} onClick={() => (x.kind === 'quiz' ? openQuiz() : setCur(x.id))} className={`flex w-full items-center gap-3 px-5 py-4 text-left text-[13px] font-semibold ${x.id === cur ? 'border-l-4 border-brand bg-white' : 'hover:bg-white/60'}`}>{x.kind === 'quiz' ? <HelpCircle size={15} /> : <AlignLeft size={15} />}<span className="flex-1">{x.kind === 'quiz' ? 'Bài kiểm tra' : x.title}</span><span className={`h-4 w-4 rounded-full border-2 ${done.includes(x.id) ? 'border-brand bg-brand' : 'border-neutral-400'}`} /></button>)}
      </aside>}
      <div className="flex-1">
        <button onClick={() => setSide(!side)} className="icon-btn m-3" aria-label="Ẩn hiện mục lục"><Menu size={18} /></button>
        <div className="mx-auto max-w-[680px] px-6 pt-6"><div className="font-serif text-[13px] italic text-neutral-500">Bài {idx + 1} / {lessons.length}</div><h1 className="mt-3 font-lato text-[38px] font-black leading-tight">{L.title}</h1><div className="mt-8 h-1 w-28 bg-brand" /></div>
        <div className="mt-10 space-y-14 border-t border-line pb-14 pt-14">{L.blocks.map((b) => <div key={b.id}><BlockView b={b} /></div>)}</div>
        <div className="pb-24 text-center"><button onClick={() => { mark(cur); const next = lessons[idx + 1]; if (next?.kind === 'quiz') openQuiz(); else { setCur(next?.id || cur); window.scrollTo(0, 0) } }} className="rounded-full bg-brand px-12 py-3.5 font-lato text-[14px] font-bold tracking-wider text-white">{lessons[idx + 1] ? 'TIẾP TỤC' : 'HOÀN THÀNH'}</button></div>
      </div>
    </div>
  )
}

/* ---------- Video ---------- */
function VideoPlayer({ art, preview, onTutorJump, seek }) {
  const [t, setT] = useState(seek ?? 0)
  const [play, setPlay] = useState(false)
  const [cp, setCp] = useState(null)
  const [passed, setPassed] = useState([])
  const [fb, setFb] = useState(null)
  const vref = useRef()
  const { mark } = useProgress(art, preview)
  const real = art.render?.status === 'done' && art.render.url
  const duration = art.duration || 1
  useEffect(() => { onTutorJump.current = (j) => { if (j.to.t != null) { setT(j.to.t); if (vref.current) vref.current.currentTime = j.to.t } } })
  useEffect(() => {
    const ch = [...art.chapters].reverse().find((c) => c.t <= t)
    if (ch && t - ch.t > 5) mark(`t${ch.t}`)
    const hit = (art.checkpoints ?? []).find((c) => c.t <= t && t - c.t < 2 && !passed.includes(c.t))
    if (hit && play) { setPlay(false); vref.current?.pause(); setCp(hit) }
    if (t >= duration) { setPlay(false); art.chapters.forEach((c) => mark(`t${c.t}`)) }
  }, [t]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!play || real) return
    const i = setInterval(() => setT((x) => Math.min(duration, x + 0.5)), 500)
    return () => clearInterval(i)
  }, [play, real, duration])
  const toggle = () => { if (real) { if (vref.current.paused) vref.current.play(); else vref.current.pause() } else setPlay(!play) }
  const go = (x) => { setT(x); if (vref.current) vref.current.currentTime = x }
  const answer = (ok) => { setFb(ok ? 'Chính xác!' : 'Chưa đúng, xem lại chương trước.'); setPassed((p) => [...p, cp.t]); setCp(null); if (real) vref.current.play(); else setPlay(true); setTimeout(() => setFb(null), 2500) }
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <h1 className="font-lato text-[30px] font-black">{art.title}</h1>
      {art.ai && <p className="mt-1 text-[13px] text-neutral-500">Nội dung do AI tạo, đã được chuyên gia duyệt.</p>}
      <div className="mt-5 grid grid-cols-[1fr_300px] gap-6">
        <div>
          {real ? (
            <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
              <video ref={vref} src={art.render.url} className="h-full w-full" controls onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onPlay={() => setPlay(true)} onPause={() => setPlay(false)}><track kind="captions" src={art.render.vtt} srcLang="vi" label="Tiếng Việt" default /></video>
              {cp && <div className="absolute inset-0 grid place-items-center bg-black/60 p-6"><div className="w-[440px] rounded-xl bg-white p-6"><div className="text-[12px] font-bold uppercase tracking-wider text-neutral-500">Điểm kiểm tra</div><div className="mt-2 font-lato text-[19px] font-bold">{cp.q}</div><div className="mt-4 space-y-2">{cp.choices.map((c, i) => <button key={i} onClick={() => answer(i === cp.correct)} className="block w-full rounded-lg border border-line px-4 py-2.5 text-left text-[14px] hover:border-brand">{c}</button>)}</div></div></div>}
            </div>
          ) : <VideoStage art={art} t={t} playing={play} onToggle={toggle} cp={cp} onAnswer={answer} />}
          {fb && <div className="mt-3 rounded-lg bg-neutral-100 px-4 py-2 text-[14px]">{fb}</div>}
          {!real && <div className="relative mt-4 h-2 cursor-pointer rounded-full bg-neutral-200" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); go(Math.round(((e.clientX - r.left) / r.width) * duration)) }}><div className="h-2 rounded-full bg-brand" style={{ width: `${(t / duration) * 100}%` }} />{(art.checkpoints ?? []).map((c) => <span key={c.t} className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full bg-violet-600 text-white" style={{ left: `${(c.t / duration) * 100}%` }}><Flag size={11} className="m-1" /></span>)}</div>}
          {!real && <div className="mt-2 text-[12px] text-neutral-500">{fmtTime(t)} / {fmtTime(duration)} · Video chưa được dựng, đang phát dạng slide kèm phụ đề</div>}
        </div>
        <div className="rounded-xl border border-line">
          <div className="border-b border-line px-4 py-3 font-lato font-bold">Chương</div>
          {art.chapters.map((c) => <button key={c.t} onClick={() => go(c.t)} className={`flex w-full gap-3 px-4 py-3 text-left text-[14px] ${t >= c.t ? 'font-semibold' : ''} hover:bg-neutral-50`}><span className="w-11 font-mono text-[12px] text-sky-700">{fmtTime(c.t)}</span>{c.title}</button>)}
        </div>
      </div>
    </div>
  )
}

function DeckViewer({ art, preview, onTutorJump }) {
  const [i, setI] = useState(0)
  const { mark } = useProgress(art, preview)
  useEffect(() => { mark(art.slides[i]?.id) }, [i]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onTutorJump.current = (j) => { if (j.to.slide != null) setI(j.to.slide) } })
  return <div className="p-8"><div className="aspect-video overflow-hidden rounded-xl shadow-pop"><Slide s={art.slides[i]} n={i + 1} total={art.slides.length} /></div><div className="mt-4 flex items-center justify-center gap-4"><button onClick={() => setI(Math.max(0, i - 1))} className="btn-line btn-sm">Trước</button><span className="text-[14px]">{i + 1}/{art.slides.length}</span><button onClick={() => setI(Math.min(art.slides.length - 1, i + 1))} className="btn-line btn-sm">Sau</button></div></div>
}

function GuideViewer({ art, preview }) {
  const { done, mark } = useProgress(art, preview)
  return <div className="mx-auto max-w-[760px] p-10"><h1 className="font-lato text-[32px] font-black">{art.title}</h1>{art.steps.map((s, i) => <div key={i} className="mt-6 flex gap-4"><button onClick={() => mark(`s${i}`)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold text-white ${done.includes(`s${i}`) ? 'bg-emerald-600' : 'bg-emerald-400'}`} title="Đánh dấu đã làm">{done.includes(`s${i}`) ? '✓' : i + 1}</button><div><div className="font-lato text-[19px] font-bold">{s.title}</div><p className="mt-1 font-serif">{s.text}</p><Thumb img={s.img || 'screen'} className="mt-3 h-40 w-[420px] rounded-lg" /></div></div>)}</div>
}

/** Trình học dùng chung cho người học (bản xuất bản) và người soạn (xem trước bản nháp) */
function Player({ art, preview, start }) {
  const nav = useNavigate()
  const [tutor, setTutor] = useState(false)
  const [other, setOther] = useState(null)
  const jumpRef = useRef(() => {})
  const onJump = (j) => {
    setTutor(false)
    if (j.other) { setOther(j); return }
    jumpRef.current(j)
  }
  const { done, mark } = useProgress(art, preview)
  return (
    <>
      {art.type === 'qr' && <CoursePlayer key={start || 'cover'} art={art} start={start} preview={preview} onTutorJump={jumpRef} />}
      {art.type === 'video' && <VideoPlayer art={art} preview={preview} onTutorJump={jumpRef} />}
      {art.type === 'scenario' && <div className="h-[calc(100vh-56px)]"><ScenarioPlay art={art} onExit={() => { if (!done.includes('end')) mark('end'); nav(-1) }} /></div>}
      {art.type === 'deck' && <DeckViewer art={art} preview={preview} onTutorJump={jumpRef} />}
      {art.type === 'guide' && <GuideViewer art={art} preview={preview} />}
      {art.type !== 'scenario' && <TutorBtn onClick={() => setTutor(!tutor)} />}
      <Tutor open={tutor} onClose={() => setTutor(false)} artId={art.id} courseTitle={art.title} draft={art.draft} onJump={onJump} />
      {other && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" onClick={() => setOther(null)}>
          <div className="w-[440px] rounded-2xl bg-white p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-[16px] font-semibold"><VideoIcon size={18} className="text-violet-600" />Nội dung ở khóa khác</div>
            <p className="mt-2 text-[14px] text-neutral-600">Tutor tìm thấy phần này ở khóa khác bạn được xem. Mở khóa đó tại đúng chỗ?</p>
            <div className="mt-5 flex justify-end gap-2"><button className="btn-line h-10" onClick={() => setOther(null)}>Để sau</button><button className="btn-dark h-10" onClick={() => { const q = other.to.lesson ? `?l=${other.to.lesson}` : other.to.t != null ? `?t=${other.to.t}` : ''; nav(`/learn/${other.artifactId}${q}`); setOther(null) }}>Mở khóa</button></div>
          </div>
        </div>
      )}
    </>
  )
}

const Loading = () => <div className="grid h-full place-items-center"><Spinner /></div>
const Err = ({ e }) => <div className="grid h-full place-items-center text-center"><div><div className="text-[18px] font-semibold">Không mở được tài liệu</div><p className="mt-2 text-[14px] text-neutral-600">{e.message}</p></div></div>

/** Người học mở khóa: /learn/:aid hoặc đường dẫn chia sẻ /s/:slug */
export function LearnerPlayer() {
  const { aid, slug } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { me } = useMe()
  const resolved = useQuery({ queryKey: ['slug', slug], queryFn: () => get(`/learn/s/${slug}`), enabled: !!slug })
  const id = aid ?? resolved.data?.id
  const q = useQuery({ queryKey: ['learn', id], queryFn: () => get(`/learn/a/${id}`), enabled: !!id, staleTime: 0 })
  if (resolved.error) return <Err e={resolved.error} />
  if (q.error) return <Err e={q.error} />
  if (!q.data) return <Loading />
  return (
    <div className="flex h-full flex-col">
      <DeviceBar devices={false} left={<><button className="icon-btn" onClick={() => nav(me.role === 'learner' ? '/learn' : -1)} aria-label="Quay lại"><ChevronLeft size={20} /></button><span className="h-7 w-px bg-line" /><span className="text-[15px] font-medium">{me.role === 'learner' ? 'Khóa học của tôi' : 'Bản người học thấy'}</span><span className="ml-2 flex items-center gap-1 text-[13px] text-neutral-500"><Clock size={13} />Phiên bản {q.data.version}</span></>} />
      <div className="scroll-thin flex-1 overflow-y-auto bg-white"><Player art={q.data} start={params.get('l')} /></div>
    </div>
  )
}

/** Người soạn xem trước bản nháp ở nhiều cỡ màn hình */
export function AuthorPreview() {
  const { aid } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [device, setDevice] = useState('desktop')
  const q = useQuery({ queryKey: ['preview', aid], queryFn: () => get(`/learn/a/${aid}?draft=1`), staleTime: 0 })
  if (q.error) return <Err e={q.error} />
  if (!q.data) return <Loading />
  const w = DEVICES.find((d) => d[0] === device)[3]
  return (
    <div className="flex h-full flex-col">
      <DeviceBar device={device} setDevice={setDevice}
        left={<><button className="icon-btn" onClick={() => nav(-1)} aria-label="Quay lại"><ChevronLeft size={20} /></button><span className="h-7 w-px bg-line" /><span className="text-[15px] font-medium">Xem trước bản nháp</span></>}
        right={<button className="btn-dark btn-sm ml-3 h-9" onClick={() => nav(`/edit/${aid}`)}>Sửa</button>} />
      <div className="scroll-thin flex-1 overflow-y-auto bg-neutral-100">
        <div className="mx-auto min-h-full bg-white transition-all" style={{ width: w, maxWidth: '100%' }}>
          <Player art={q.data} preview start={params.get('l') === 'quiz' ? null : params.get('l')} />
        </div>
      </div>
    </div>
  )
}
