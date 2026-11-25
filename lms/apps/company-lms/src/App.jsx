// Cổng đào tạo của Công ty demo: mô phỏng LMS có sẵn của công ty nhận gói SCORM 1.2 xuất từ LMS.
import { useEffect, useState } from 'react'
import { ArrowUpRight, BarChart3, Info, LibraryBig, Upload } from 'lucide-react'
import { Courses, Reports } from './Admin'
import ImportModal from './Import'
import MyCourses from './Learner'
import Player from './Player'
import { ensureWorker } from './pkg'
import { ADMIN, LEARNERS, statusOf, useData } from './store'
import { Avatar, Toaster } from './ui'
import { toast } from './toast'

const LMS_URL = `${location.protocol}//${location.hostname}:5190`
const ROLE_KEY = 'company-lms-role'
const readRole = () => { try { return localStorage.getItem(ROLE_KEY) ?? 'admin' } catch { return 'admin' } }

export default function App() {
  const [role, setRole] = useState(readRole)
  const [tab, setTab] = useState('courses')
  const [importing, setImporting] = useState(false)
  const [play, setPlay] = useState(null) // { pkg, browse }
  const [workerErr, setWorkerErr] = useState('')
  const learner = LEARNERS[0]

  useEffect(() => { ensureWorker().catch((e) => setWorkerErr(e.message)) }, [])
  const switchRole = (r) => { setRole(r); try { localStorage.setItem(ROLE_KEY, r) } catch { /* không lưu được thì chỉ đổi trong phiên */ } }
  const open = async (pkg, browse) => {
    try { await ensureWorker(); setPlay({ pkg, browse }) } catch (e) { toast(e.message) }
  }
  const closed = (rec) => {
    setPlay(null)
    if (rec) toast(`Cổng đã ghi: ${statusText(rec)}`)
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 md:px-8">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-co-700 text-[18px] font-extrabold text-white">V</span>
          <div className="min-w-0 flex-1 leading-tight"><div className="text-[16px] font-bold">Cổng đào tạo</div><div className="truncate text-[12px] text-slate-500">Công ty demo · LMS nội bộ</div></div>
          <div role="tablist" aria-label="Vai đang xem" className="flex rounded-lg bg-slate-100 p-1 text-[13px] font-semibold">
            {[['admin', 'Quản trị đào tạo', ADMIN], ['learner', 'Nhân viên', learner]].map(([id, label, who]) => (
              <button key={id} role="tab" aria-selected={role === id} aria-label={`${label}: ${who.name}`} title={`${label}: ${who.name}`} onClick={() => switchRole(id)} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${role === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                <Avatar person={who} size={22} /><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 pb-16 pt-6 md:px-8">
        <div className="mb-6 flex gap-2.5 rounded-xl border border-co-100 bg-co-50 px-4 py-3 text-[13px] text-co-900">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>Trang demo: mô phỏng LMS có sẵn của công ty (kiểu Moodle, SAP SuccessFactors) nhận gói SCORM 1.2 xuất từ <a className="font-semibold underline" href={LMS_URL} target="_blank" rel="noopener noreferrer">LMS</a>. Chạy tách cổng riêng, dữ liệu lưu trên trình duyệt này.</p>
        </div>
        {workerErr && <p role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-[14px] text-red-700">Không mở được gói: {workerErr}</p>}
        {role === 'admin' ? (<>
          <Flow onImport={() => setImporting(true)} />
          <div className="mt-8 flex flex-wrap items-end gap-3 border-b border-line">
            {[['courses', 'Khóa học', LibraryBig], ['reports', 'Báo cáo học tập', BarChart3]].map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTab(id)} className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-[15px] font-semibold ${tab === id ? 'border-co-700 text-co-800' : 'border-transparent text-slate-500 hover:text-slate-800'} mr-5`}><Icon size={17} />{label}</button>
            ))}
            <button className="btn-primary mb-2 ml-auto" onClick={() => setImporting(true)}><Upload size={16} />Nhập gói SCORM</button>
          </div>
          <div className="mt-5">{tab === 'courses' ? <Courses onImport={() => setImporting(true)} onPreview={(p) => open(p, true)} /> : <Reports />}</div>
        </>) : (<>
          <h1 className="text-[22px] font-bold">Khóa học của tôi</h1>
          <p className="mb-5 mt-1 text-[14px] text-slate-600">Xin chào {learner.name}. Kết quả học được ghi về cổng đào tạo của công ty.</p>
          <MyCourses learner={learner} onOpen={(p) => open(p, false)} />
        </>)}
      </main>

      <ImportModal open={importing} onClose={() => setImporting(false)} />
      {play && <Player pkg={play.pkg} browse={play.browse} learner={learner} onClose={closed} />}
      <Toaster />
    </div>
  )
}

function statusText(rec) {
  const s = statusOf(rec)
  const label = { 'not attempted': 'chưa học', incomplete: 'đang học', completed: 'hoàn thành', passed: 'đạt', failed: 'chưa đạt', browsed: 'đã xem thử' }[s]
  return `${label}${rec.score?.raw ? ` · điểm ${rec.score.raw}` : ''}`
}

/** Quy trình 4 bước, bước nào đã có dữ liệu thì đánh dấu xong */
function Flow({ onImport }) {
  const { packages, records } = useData()
  const recs = Object.values(records)
  const steps = [
    { t: 'Xuất gói ở LMS', d: 'Mở khóa → Chia sẻ cả khóa → Xuất SCORM → Tải gói (.zip)', done: packages.length > 0, act: <a className="inline-flex items-center gap-1 font-semibold text-co-700 hover:underline" href={LMS_URL} target="_blank" rel="noopener noreferrer">Mở LMS<ArrowUpRight size={14} /></a> },
    { t: 'Nhập vào cổng đào tạo', d: 'Cổng kiểm tra manifest, tệp khởi chạy, điểm đạt rồi lưu gói', done: packages.length > 0, act: <button className="font-semibold text-co-700 hover:underline" onClick={onImport}>Nhập gói</button> },
    { t: 'Giao cho nhân viên', d: 'Chọn người học và hạn ngay khi nhập', done: packages.some((p) => p.assigned.length) },
    { t: 'Nhân viên học, cổng ghi kết quả', d: 'Gói gọi API SCORM: trạng thái, điểm, thời gian, học dở', done: recs.some((r) => r.lastAt) },
  ]
  const current = steps.findIndex((s) => !s.done)
  return (
    <ol className="grid gap-3 md:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.t} className={`card p-4 ${i === current ? 'border-co-600 ring-2 ring-co-100' : ''}`}>
          <div className="flex items-center gap-2">
            <span className={`grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold ${s.done ? 'bg-co-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{i + 1}</span>
            <span className="text-[14px] font-semibold">{s.t}</span>
          </div>
          <p className="mt-1.5 text-[13px] text-slate-600">{s.d}</p>
          {s.act && <div className="mt-2 text-[13px]">{s.act}</div>}
        </li>
      ))}
    </ol>
  )
}
