// Màn học trên cổng đào tạo: gói chạy trong khung (iframe) cùng nguồn, gọi window.API của cổng.
// Bảng bên phải cho buổi demo: dữ liệu SCORM gói đang ghi và nhật ký từng lệnh API.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ChevronLeft, Database, PanelRightClose, PanelRightOpen, Terminal } from 'lucide-react'
import { createApi, ERRORS, humanTime } from './scormApi'
import { launchUrl } from './pkg'
import { getRecord, saveRecord } from './store'
import { Badge } from './ui'
import { fmtClock } from './format'

const MAX_LOG = 500
const FIELDS = [
  ['cmi.core.lesson_status', 'Trạng thái'],
  ['cmi.core.score.raw', 'Điểm'],
  ['cmi.suspend_data', 'Dữ liệu học dở'],
  ['cmi.core.lesson_location', 'Vị trí đang học'],
  ['cmi.core.exit', 'Cách thoát'],
  ['cmi.core.session_time', 'Thời gian phiên (gói báo)'],
  ['cmi.core.entry', 'Lần vào'],
  ['cmi.core.total_time', 'Tổng thời gian các phiên trước'],
  ['cmi.core.credit', 'Tính kết quả'],
  ['cmi.core.lesson_mode', 'Chế độ'],
  ['cmi.student_data.mastery_score', 'Điểm đạt (manifest)'],
  ['cmi.core.student_id', 'Mã nhân viên'],
  ['cmi.core.student_name', 'Tên học viên'],
]

/** pkg: gói · learner: người học · browse: xem thử của quản trị, không ghi kết quả · onClose(record|null) */
export default function Player({ pkg, learner, browse = false, onClose }) {
  const [log, setLog] = useState([])
  const [cmi, setCmi] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [frameOn, setFrameOn] = useState(false)
  const [panel, setPanel] = useState(() => window.innerWidth >= 1100)
  const [tab, setTab] = useState('data')
  const [rt] = useState(() => createApi({
    learner, pkg, browse, record: browse ? {} : getRecord(pkg.id, learner.id),
    log: (e) => setLog((xs) => (xs.length >= MAX_LOG ? [...xs.slice(1 - MAX_LOG), e] : [...xs, e])),
    onChange: setCmi,
    onSave: (rec) => { saveRecord(pkg.id, learner.id, rec); setSavedAt(Date.now()) },
  }))

  // API phải có sẵn ở cửa sổ cha trước khi gói tải
  useLayoutEffect(() => {
    window.API = rt.api
    setCmi(rt.snapshot())
    setFrameOn(true)
    return () => { if (window.API === rt.api) delete window.API }
  }, [rt])

  const exit = () => {
    flushSync(() => setFrameOn(false)) // gỡ khung: gói nhận pagehide và tự gọi LMSFinish
    rt.close()
    if (window.API === rt.api) delete window.API
    onClose(browse ? null : getRecord(pkg.id, learner.id))
  }
  // đóng tab khi đang học: vẫn đóng phiên
  useEffect(() => {
    const h = () => rt.close()
    window.addEventListener('pagehide', h)
    return () => window.removeEventListener('pagehide', h)
  }, [rt])

  const status = cmi?.['cmi.core.lesson_status'] ?? 'not attempted'
  const score = cmi?.['cmi.core.score.raw']
  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-co-900 px-3 text-white">
        <button className="btn h-9 px-3 text-white hover:bg-white/10" onClick={exit}><ChevronLeft size={18} />Thoát khóa học</button>
        <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-semibold">{pkg.title}</div><div className="truncate text-[12px] text-white/60">{browse ? 'Xem thử của quản trị · không ghi kết quả' : `${learner.name} · SCORM 1.2`}</div></div>
        <div className="hidden items-center gap-2 sm:flex"><Badge status={status} />{score !== '' && score != null && <span className="text-[13px] font-semibold">Điểm {score}</span>}</div>
        <button className="btn h-9 px-3 text-white hover:bg-white/10" onClick={() => setPanel((x) => !x)} aria-pressed={panel}>{panel ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}<span className="hidden md:inline">Dữ liệu SCORM</span></button>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 bg-slate-100">{frameOn && <iframe title={pkg.title} src={launchUrl(pkg)} className="h-full w-full border-0 bg-white" />}</div>
        {panel && (
          <aside className="absolute inset-y-0 right-0 flex w-[min(400px,100vw)] flex-col border-l border-line bg-white shadow-xl lg:static lg:shadow-none" aria-label="Dữ liệu SCORM gói gửi về">
            <div className="flex border-b border-line px-2">
              {[['data', 'Bản ghi', Database], ['log', `Nhật ký API (${log.filter((x) => !x.lms).length})`, Terminal]].map(([id, label, Icon]) => (
                <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-[13px] font-semibold ${tab === id ? 'border-co-700 text-co-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Icon size={15} />{label}</button>
              ))}
            </div>
            {tab === 'data' ? <DataTab cmi={cmi} savedAt={savedAt} browse={browse} state={rt.state} /> : <LogTab log={log} />}
          </aside>
        )}
      </div>
    </div>
  )
}

function DataTab({ cmi, savedAt, browse, state }) {
  const seen = useRef(false)
  useEffect(() => { seen.current = true }, [])
  if (!cmi) return null
  return (
    <div className="scroll-thin flex-1 overflow-y-auto">
      <div className="border-b border-line bg-slate-50 px-4 py-2.5 text-[12px] text-slate-600">
        {browse ? 'Xem thử: cổng trả về credit = no-credit, không lưu gì.' : savedAt ? `Đã lưu vào cổng lúc ${fmtClock(savedAt)} (LMSCommit)` : state === 'running' ? 'Gói đã kết nối, chưa lưu lần nào.' : 'Đang chờ gói gọi LMSInitialize…'}
      </div>
      <dl>
        {FIELDS.map(([k, label]) => {
          const v = cmi[k] ?? ''
          return (
            <div key={`${k}:${v}`} className={`border-b border-line px-4 py-2.5 ${seen.current ? 'flash' : ''}`}>
              <dt className="flex items-baseline justify-between gap-2"><span className="text-[13px] font-medium text-slate-800">{label}</span><code className="truncate font-mono text-[11px] text-slate-400">{k.replace(/^cmi\./, '')}</code></dt>
              <dd className="mt-0.5 break-words font-mono text-[12.5px] text-slate-700">{k === 'cmi.suspend_data' ? <Suspend v={v} /> : k === 'cmi.core.total_time' ? `${v} (${humanTime(v)})` : v === '' ? <span className="text-slate-400">trống</span> : v}</dd>
            </div>
          )
        })}
      </dl>
      <p className="px-4 py-3 text-[12px] leading-relaxed text-slate-500">SCORM 1.2 không có trường % tiến độ. Cổng chỉ hiểu trạng thái, điểm và thời gian; tiến độ chi tiết gói tự lưu trong suspend_data để mở lại học tiếp.</p>
    </div>
  )
}

function Suspend({ v }) {
  const [full, setFull] = useState(false)
  if (!v) return <span className="text-slate-400">trống</span>
  return (
    <>
      <span className="text-slate-500">{v.length}/4096 ký tự · </span>
      <span>{full || v.length <= 120 ? v : `${v.slice(0, 120)}…`}</span>
      {v.length > 120 && <button className="ml-1 font-sans text-[12px] font-semibold text-co-700 hover:underline" onClick={() => setFull((x) => !x)}>{full ? 'Thu gọn' : 'Xem đủ'}</button>}
    </>
  )
}

const q = (x) => { const s = JSON.stringify(String(x)); return s.length > 140 ? `${s.slice(0, 139)}…"` : s }
function LogTab({ log }) {
  const box = useRef(null)
  useEffect(() => { box.current?.scrollTo(0, box.current.scrollHeight) }, [log.length])
  return (
    <div ref={box} className="scroll-thin flex-1 overflow-y-auto bg-slate-950 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-slate-300">
      {!log.length && <div className="py-2 text-slate-500">Chưa có lệnh nào.</div>}
      {log.map((e, i) => (
        <div key={i} className="border-b border-white/5 py-1">
          <span className="mr-2 text-slate-500">{fmtClock(e.at)}</span>
          {e.lms ? <span className="text-teal-300">Cổng: {e.text}</span> : (<>
            <span className="text-sky-300">{e.fn}</span>({e.args.map(q).join(', ')}) → <span className={e.err ? 'text-red-400' : 'text-emerald-300'}>{q(e.ret)}</span>
            {e.err > 0 && <div className="pl-[4.2rem] text-red-400">Lỗi {e.err}: {ERRORS[e.err]?.[1]}</div>}
          </>)}
        </div>
      ))}
    </div>
  )
}
