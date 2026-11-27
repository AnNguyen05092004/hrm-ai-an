// Cổng đào tạo của Công ty demo: mô phỏng LMS có sẵn của công ty nhận gói SCORM 1.2 xuất từ LMS.
// Bố cục theo design system Workforce AI: sidebar trắng, nền xám nhạt, topbar có breadcrumb; đỏ dùng tiết kiệm.
import { useEffect, useState } from 'react'
import { ArrowUpRight, BarChart3, BookOpen, ClipboardCheck, Info, LibraryBig, Menu, Upload, X } from 'lucide-react'
import { Courses, Reports } from './Admin'
import ImportModal from './Import'
import Inbox, { markImported } from './Inbox'
import MyCourses from './Learner'
import Player from './Player'
import ExamPlayer from './Exam'
import { ExamPreview, GradingQueue, useAttempts } from './Grading'
import { ensureWorker } from './pkg'
import { ADMIN, LEARNERS, statusOf, useData } from './store'
import { Avatar, Toaster } from './ui'
import { toast } from './toast'

const LMS_URL = `${location.protocol}//${location.hostname}:5190`
const ROLE_KEY = 'company-lms-role'
const readRole = () => { try { return localStorage.getItem(ROLE_KEY) ?? 'admin' } catch { return 'admin' } }
const learner = LEARNERS[0]
const STATUS_TEXT = { 'not attempted': 'chưa học', incomplete: 'đang học', completed: 'hoàn thành', passed: 'đạt', failed: 'chưa đạt', browsed: 'đã xem thử' }
const statusText = (rec) => `${STATUS_TEXT[statusOf(rec)]}${rec.score?.raw ? ` · điểm ${rec.score.raw}` : ''}`
const PAGE_DESC = {
  courses: 'Khóa học (gói SCORM) và đề kiểm tra (gói QTI) nhập từ LMS, giao cho nhân viên và theo dõi kết quả.',
  grading: 'Bài thi có câu tự luận hoặc code, chấm theo tiêu chí đi kèm đề.',
  reports: 'Kết quả học của từng nhân viên theo từng khóa.',
  mine: `Xin chào ${learner.name}. Kết quả học được ghi về cổng đào tạo của công ty.`,
}

export default function App() {
  const [role, setRole] = useState(readRole)
  const [page, setPage] = useState(() => (readRole() === 'admin' ? 'courses' : 'mine'))
  const [importing, setImporting] = useState(false)
  const [inboxFile, setInboxFile] = useState(null) // gói nhận qua API đang mở để nhập
  const [play, setPlay] = useState(null) // { pkg, browse }
  const [exam, setExam] = useState(null) // { pkg, preview }
  const [menu, setMenu] = useState(false)
  const [workerErr, setWorkerErr] = useState('')
  const { packages } = useData()

  useEffect(() => { ensureWorker().catch((e) => setWorkerErr(e.message)) }, [])
  const switchRole = (r) => {
    setRole(r); setPage(r === 'admin' ? 'courses' : 'mine'); setMenu(false)
    try { localStorage.setItem(ROLE_KEY, r) } catch { /* không lưu được thì chỉ đổi trong phiên */ }
  }
  const go = (p) => { setPage(p); setMenu(false) }
  const open = async (pkg, browse) => {
    // đề QTI: cổng tự hiển thị và chấm; khóa SCORM: chạy gói trong khung
    if (pkg.kind === 'qti') return setExam({ pkg, preview: browse })
    try { await ensureWorker(); setPlay({ pkg, browse }) } catch (e) { toast(e.message) }
  }
  const pending = useAttempts().filter((r) => r.t.status === 'grading').length
  const closed = (rec) => { setPlay(null); if (rec) toast(`Cổng đã ghi: ${statusText(rec)}`) }

  const nav = role === 'admin'
    ? { group: 'Quản trị đào tạo', items: [['courses', 'Khóa học và đề', LibraryBig, packages.length], ['grading', 'Chấm bài', ClipboardCheck, pending], ['reports', 'Báo cáo học tập', BarChart3]] }
    : { group: 'Học tập', items: [['mine', 'Khóa học của tôi', BookOpen, packages.filter((p) => p.assigned.some((a) => a.userId === learner.id)).length]] }
  const current = nav.items.find((x) => x[0] === page) ?? nav.items[0]
  const who = role === 'admin' ? ADMIN : learner
  const side = <Sidebar nav={nav} page={current[0]} go={go} role={role} switchRole={switchRole} />

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <div className="hidden lg:block">{side}</div>
      {menu && (
        <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setMenu(false)}>
          <div className="relative h-full w-[min(300px,88vw)] bg-white shadow-pop">
            <button className="btn-ghost absolute right-2 top-3 z-10 w-9 px-0" onClick={() => setMenu(false)} aria-label="Đóng menu"><X size={18} /></button>
            {side}
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-[68px] items-center gap-3 border-b border-line bg-white px-4 md:px-8 lg:h-20">
          <button className="btn-ghost w-10 px-0 lg:hidden" onClick={() => setMenu(true)} aria-label="Mở menu"><Menu size={20} /></button>
          <nav aria-label="Vị trí" className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">Cổng đào tạo<span className="mx-1.5 text-line-strong">/</span><span className="font-medium text-ink">{current[1]}</span></nav>
          <div className="hidden text-right leading-tight sm:block"><div className="text-[13px] font-medium">{who.name}</div><div className="mt-0.5 text-[12px] text-ink-subtle">{who.role}</div></div>
          <Avatar person={who} size={36} />
        </header>

        <main className="mx-auto grid max-w-[1280px] gap-6 px-4 pb-16 pt-6 md:px-8 md:pt-8">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <h1 className="text-[24px] leading-8 md:text-[28px] md:leading-9">{current[1]}</h1>
              <p className="mt-1 text-ink-muted">{PAGE_DESC[current[0]]}</p>
            </div>
            {role === 'admin' && <button className="btn-primary" onClick={() => setImporting(true)}><Upload size={16} />Nhập gói</button>}
          </div>
          <div className="flex gap-2 rounded-lg border border-info/30 bg-info-surface px-3 py-2.5 text-[13px] leading-5">
            <Info size={16} className="mt-0.5 shrink-0 text-info" />
            <p>Trang demo: mô phỏng LMS có sẵn của công ty (kiểu Moodle, SAP SuccessFactors) nhận gói SCORM 1.2 xuất từ <a className="text-link" href={LMS_URL} target="_blank" rel="noopener noreferrer">LMS</a>. Chạy ở cổng riêng, dữ liệu lưu trên trình duyệt này.</p>
          </div>
          {workerErr && <p role="alert" className="rounded-lg border border-danger-line bg-danger-surface px-3 py-2.5 text-[13px] text-danger-text">Không mở được gói: {workerErr}</p>}
          {current[0] === 'courses' && <><Flow onImport={() => setImporting(true)} /><Inbox onOpen={(f, id) => { setInboxFile({ f, id }); setImporting(true) }} /><Courses onImport={() => setImporting(true)} onPreview={(p) => open(p, true)} /></>}
          {current[0] === 'reports' && <Reports />}
          {current[0] === 'grading' && <GradingQueue />}
          {current[0] === 'mine' && <MyCourses learner={learner} onOpen={(p) => open(p, false)} />}
        </main>
      </div>

      <ImportModal open={importing} file={inboxFile?.f ?? null} onImported={() => inboxFile && markImported(inboxFile.id)} onClose={() => { setImporting(false); setInboxFile(null) }} />
      {exam && (exam.preview ? <ExamPreview pkg={exam.pkg} onClose={() => setExam(null)} /> : <ExamPlayer pkg={exam.pkg} learner={learner} onClose={() => setExam(null)} />)}
      {play && <Player pkg={play.pkg} browse={play.browse} learner={learner} onClose={closed} />}
      <Toaster />
    </div>
  )
}

function Sidebar({ nav, page, go, role, switchRole }) {
  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-1 overflow-y-auto border-r border-line bg-white p-4">
      <div className="flex items-center gap-3 px-2 pb-6 pt-3">
        <span className="grid h-10 w-9 shrink-0 place-items-center rounded-lg border border-primary-line bg-primary-soft font-display text-[20px] font-semibold text-primary-ink">V</span>
        <div className="min-w-0 leading-tight"><div className="font-display text-[18px] font-semibold tracking-[-0.025em]">Cổng đào tạo</div><div className="mt-1 text-[12px] text-ink-subtle">Công ty demo</div></div>
      </div>
      <div className="overline px-3 pb-2 pt-2">{nav.group}</div>
      {nav.items.map(([id, label, Icon, count]) => {
        const on = page === id
        return (
          <button key={id} onClick={() => go(id)} aria-current={on ? 'page' : undefined}
            className={`relative flex items-center gap-3 rounded-lg p-3 text-left text-[13px] transition-colors ${on ? 'bg-muted font-semibold text-ink' : 'text-ink-muted hover:bg-canvas hover:text-ink'}`}>
            {on && <i className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-primary" aria-hidden />}
            <Icon size={20} strokeWidth={1.65} />{label}
            {count > 0 && <span className="ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-sm bg-white px-1 text-[11px] font-medium text-ink-muted ring-1 ring-line">{count}</span>}
          </button>
        )
      })}
      <div className="mt-auto pt-6">
        <div className="rounded-lg border border-line p-3">
          <div className="text-[12px] text-ink-muted">Xem với vai</div>
          <div role="tablist" aria-label="Vai đang xem" className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-[12px] font-medium">
            {[['admin', 'Quản trị'], ['learner', 'Nhân viên']].map(([id, label]) => (
              <button key={id} role="tab" aria-selected={role === id} onClick={() => switchRole(id)} className={`rounded-md px-2 py-1.5 ${role === id ? 'bg-white text-ink shadow-card' : 'text-ink-muted hover:text-ink'}`}>{label}</button>
            ))}
          </div>
          <div className="mt-2 text-[12px] text-ink-subtle">{role === 'admin' ? `${ADMIN.name} · ${ADMIN.id}` : `${learner.name} · ${learner.id}`}</div>
        </div>
      </div>
    </aside>
  )
}

/** Quy trình 4 bước, bước nào đã có dữ liệu thì đánh dấu xong */
function Flow({ onImport }) {
  const { packages, records } = useData()
  const steps = [
    { t: 'Xuất gói ở LMS', d: 'Mở khóa → Chia sẻ cả khóa → Xuất SCORM: tải gói khóa học, hoặc tải đề kèm đáp án (QTI)', done: packages.length > 0, act: <a className="text-link inline-flex items-center gap-1" href={LMS_URL} target="_blank" rel="noopener noreferrer">Mở LMS<ArrowUpRight size={14} /></a> },
    { t: 'Nhập vào cổng đào tạo', d: 'Cổng kiểm tra gói: manifest, tệp khởi chạy hoặc câu hỏi, đáp án, điểm đạt', done: packages.length > 0, act: <button className="text-link" onClick={onImport}>Nhập gói</button> },
    { t: 'Giao cho nhân viên', d: 'Chọn người học và hạn ngay khi nhập', done: packages.some((p) => p.assigned.length) },
    { t: 'Nhân viên học, cổng ghi kết quả', d: 'Gói gọi API SCORM: trạng thái, điểm, thời gian, học dở', done: Object.values(records).some((r) => r.lastAt) },
  ]
  const now = steps.findIndex((s) => !s.done)
  return (
    <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Quy trình đưa khóa học sang cổng đào tạo">
      {steps.map((s, i) => (
        <li key={s.t} className={`card p-4 ${i === now ? 'border-ink-subtle' : ''}`} aria-current={i === now ? 'step' : undefined}>
          <div className="flex items-start gap-2">
            <span className={`mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${s.done ? 'bg-success-surface text-success-text' : i === now ? 'bg-ink text-white' : 'bg-muted text-ink-muted'}`}>{i + 1}</span>
            <span className="font-display text-[15px] font-medium leading-6 tracking-[-0.02em]">{s.t}</span>
          </div>
          <p className="mt-1.5 text-[13px] leading-5 text-ink-muted">{s.d}</p>
          {s.act && <div className="mt-2 text-[13px]">{s.act}</div>}
        </li>
      ))}
    </ol>
  )
}
