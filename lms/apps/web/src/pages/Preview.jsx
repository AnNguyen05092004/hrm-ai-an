import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, AlignLeft, HelpCircle, Menu, Flag, CheckCircle2 } from 'lucide-react'
import { useMe } from '../store'
import { fmtTime } from '../data'
import { Thumb, Spinner, Modal } from '../ui'
import { QuizSheet } from './QuizSheet'
import { BlockView } from '../blocks'
import { DeviceBar, DEVICES } from './Common'
import { Slide, VideoStage, ScenarioPlay } from './OtherEditors'
import { themeStyle } from '../theme'
import { useOffline } from '../offline'
import { get, post } from '../api'

/** Tiến độ học: trong gói SCORM, lệnh ghi tiến độ được trình học SCORM nhận và báo về LMS công ty. Xem trước trên web thì không ghi */
function useProgress(art, preview) {
  const [done, setDone] = useState(art.progress?.done ?? [])
  const mark = async (unit) => {
    if (preview || done.includes(unit)) return
    setDone((d) => [...d, unit])
    try { const r = await post(`/learn/a/${art.id}/progress`, { unit }); setDone(r.done) } catch { /* tiến độ sẽ ghi lại ở lần sau */ }
  }
  return { done, mark }
}

/* ---------- Tài liệu nhanh ---------- */
function CoursePlayer({ art, start, preview }) {
  const [cur, setCur] = useState(start)
  const [side, setSide] = useState(true)
  const { done, mark } = useProgress(art, preview)
  const lessons = art.lessons
  const L = lessons.find((x) => x.id === cur)
  const idx = lessons.indexOf(L)
  const learnCount = lessons.filter((x) => x.kind === 'lesson').length
  const pct = Math.round((done.length / Math.max(1, learnCount)) * 100)
  const off = useOffline()
  const [quiz, setQuiz] = useState(false)
  const openQuiz = () => (off ? off.onQuiz(art) : setQuiz(true))
  const sheet = <Modal open={quiz} onClose={() => setQuiz(false)} w={760} title="Bài kiểm tra" sub={`${art.questions?.length ?? 0} câu · đạt từ ${art.quiz?.passScore ?? 80}%. Người soạn và reviewer thấy đáp án; người học làm bài trên LMS nhận gói.`}><QuizSheet questions={art.questions} /></Modal>
  if (!cur) return (
    <div>
      {sheet}
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
      {sheet}
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
function VideoPlayer({ art, preview, seek }) {
  const [t, setT] = useState(seek ?? 0)
  const [play, setPlay] = useState(false)
  const [cp, setCp] = useState(null)
  const [passed, setPassed] = useState([])
  const [fb, setFb] = useState(null)
  const vref = useRef()
  const { mark } = useProgress(art, preview)
  const real = art.render?.status === 'done' && art.render.url
  const duration = art.duration || 1
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
              <video ref={vref} src={`${art.render.url}#t=0.5`} className="h-full w-full" controls onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onPlay={() => setPlay(true)} onPause={() => setPlay(false)}><track kind="captions" src={art.render.vtt} srcLang="vi" label="Tiếng Việt" default /></video>
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

function DeckViewer({ art, preview }) {
  const [i, setI] = useState(0)
  const { mark } = useProgress(art, preview)
  useEffect(() => { mark(art.slides[i]?.id) }, [i]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="p-8"><div className="aspect-video overflow-hidden rounded-xl shadow-pop"><Slide s={art.slides[i]} n={i + 1} total={art.slides.length} /></div><div className="mt-4 flex items-center justify-center gap-4"><button onClick={() => setI(Math.max(0, i - 1))} className="btn-line btn-sm">Trước</button><span className="text-[14px]">{i + 1}/{art.slides.length}</span><button onClick={() => setI(Math.min(art.slides.length - 1, i + 1))} className="btn-line btn-sm">Sau</button></div></div>
}

function GuideViewer({ art, preview }) {
  const { done, mark } = useProgress(art, preview)
  return <div className="mx-auto max-w-[760px] p-10"><h1 className="font-lato text-[32px] font-black">{art.title}</h1>{art.steps.map((s, i) => <div key={i} className="mt-6 flex gap-4"><button onClick={() => mark(`s${i}`)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold text-white ${done.includes(`s${i}`) ? 'bg-emerald-600' : 'bg-emerald-400'}`} title="Đánh dấu đã làm">{done.includes(`s${i}`) ? '✓' : i + 1}</button><div><div className="font-lato text-[19px] font-bold">{s.title}</div><p className="mt-1 font-serif">{s.text}</p><Thumb img={s.img || 'screen'} className="mt-3 h-40 w-[420px] rounded-lg" /></div></div>)}</div>
}

/** Trình học dùng chung: xem trước trên web (người soạn, reviewer) và trình học trong gói SCORM */
export function Player({ art, preview, start }) {
  const nav = useNavigate()
  const off = useOffline()
  const { done, mark } = useProgress(art, preview)
  return (
    <>
      {art.type === 'qr' && <CoursePlayer key={start || 'cover'} art={art} start={start} preview={preview} />}
      {art.type === 'video' && <VideoPlayer art={art} preview={preview} />}
      {art.type === 'scenario' && <div className="h-[calc(100vh-56px)]"><ScenarioPlay art={art} onExit={() => { if (!done.includes('end')) mark('end'); if (off) off.onExit(); else nav(-1) }} /></div>}
      {art.type === 'deck' && <DeckViewer art={art} preview={preview} />}
      {art.type === 'guide' && <GuideViewer art={art} preview={preview} />}
      {art.type === 'exam' && <div className="mx-auto max-w-[820px] px-6 py-10"><h1 className="font-lato text-[30px] font-black">{art.title}</h1><p className="mt-2 text-[14px] text-neutral-600">{art.summary}</p><div className="mt-6"><QuizSheet questions={art.questions} /></div></div>}
    </>
  )
}

const Loading = () => <div className="grid h-full place-items-center"><Spinner /></div>
const Err = ({ e }) => <div className="grid h-full place-items-center text-center"><div><div className="text-[18px] font-semibold">Không mở được tài liệu</div><p className="mt-2 text-[14px] text-neutral-600">{e.message}</p></div></div>

/** Xem trước bản nháp ở nhiều cỡ màn hình: người soạn (có nút Sửa) và reviewer được mời */
export function Preview() {
  const { aid } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { me } = useMe()
  const [device, setDevice] = useState('desktop')
  const q = useQuery({ queryKey: ['preview', aid], queryFn: () => get(`/view/${aid}`), staleTime: 0 })
  if (q.error) return <Err e={q.error} />
  if (!q.data) return <Loading />
  const w = DEVICES.find((d) => d[0] === device)[3]
  const editor = me.role !== 'reviewer'
  return (
    <div className="flex h-full flex-col" style={themeStyle(q.data.theme)}>
      <DeviceBar device={device} setDevice={setDevice}
        left={<><button className="icon-btn" onClick={() => nav(-1)} aria-label="Quay lại"><ChevronLeft size={20} /></button><span className="h-7 w-px bg-line" /><span className="text-[15px] font-medium">Xem trước bản nháp</span></>}
        right={editor ? <button className="btn-dark btn-sm ml-3 h-9" onClick={() => nav(`/edit/${aid}`)}>Sửa</button> : <button className="btn-dark btn-sm ml-3 h-9" onClick={() => nav(`/review/${q.data.kitId}?a=${aid}`)}>Góp ý</button>} />
      <div className="scroll-thin flex-1 overflow-y-auto bg-neutral-100">
        <div className="mx-auto min-h-full bg-white transition-all" style={{ width: w, maxWidth: '100%' }}>
          <Player art={q.data} preview start={params.get('l') === 'quiz' ? null : params.get('l')} />
        </div>
      </div>
    </div>
  )
}
