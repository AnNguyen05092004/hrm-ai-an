// Màn học trên cổng đào tạo: gói chạy trong khung (iframe) cùng nguồn, gọi window.API của cổng.
// Bảng bên phải cho buổi demo: dữ liệu SCORM gói đang ghi và nhật ký từng lệnh API.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ChevronLeft, Database, PanelRightClose, PanelRightOpen, Terminal, X } from 'lucide-react'
import { createApi, ERRORS, humanTime } from './scormApi'
import { launchUrl } from './pkg'
import { getRecord, saveRecord } from './store'
import { Badge } from './ui'
import { fmtClock } from './format'

const MAX_LOG = 500
// bảng dữ liệu SCORM mặc định ẩn; nhớ lựa chọn lần trước
const PANEL_KEY = 'company-lms-scorm-panel'
const readPanel = () => { try { return localStorage.getItem(PANEL_KEY) === '1' } catch { return false } }
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
  const [panel, setPanel] = useState(readPanel)
  const togglePanel = (on) => { setPanel(on); try { localStorage.setItem(PANEL_KEY, on ? '1' : '0') } catch { /* chỉ nhớ trong phiên */ } }
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
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-3 md:px-4">
        <button className="btn-ghost" onClick={exit}><ChevronLeft size={18} />Thoát khóa học</button>
        <span className="h-6 w-px shrink-0 bg-line" aria-hidden />
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[16px] font-medium tracking-[-0.02em]">{pkg.title}</div><div className="truncate text-[12px] text-ink-subtle">{browse ? 'Xem thử của quản trị · không ghi kết quả' : `${learner.name} · SCORM 1.2`}</div></div>
        <div className="hidden items-center gap-2 sm:flex">{browse ? <span className="rounded-lg bg-muted px-2 py-0.5 text-[12px] font-medium leading-5 text-ink-muted">Xem thử</span> : <Badge status={status} />}{!browse && score !== '' && score != null && <span className="text-[13px] font-medium">Điểm {score}</span>}</div>
        <button className={`btn-line btn-sm ${panel ? 'bg-muted' : ''}`} onClick={() => togglePanel(!panel)} aria-pressed={panel} aria-controls="scorm-panel">{panel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}<span className="hidden md:inline">{panel ? 'Ẩn dữ liệu SCORM' : 'Xem dữ liệu SCORM'}</span></button>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 bg-muted">{frameOn && <iframe title={pkg.title} src={launchUrl(pkg)} className="h-full w-full border-0 bg-white" />}</div>
        {panel && (
          <aside id="scorm-panel" className="absolute inset-y-0 right-0 flex w-[min(400px,100vw)] flex-col border-l border-line bg-white shadow-pop lg:static lg:shadow-none" aria-label="Dữ liệu SCORM gói gửi về">
            <div className="flex items-start gap-2 border-b border-line px-4 py-3">
              <div className="min-w-0 flex-1"><h2 className="text-[15px] leading-5">Dữ liệu SCORM gói gửi về</h2><p className="mt-0.5 text-[12px] leading-4 text-ink-subtle">Bảng cho buổi demo: xem gói ghi gì vào cổng. Nhân viên học thật không thấy bảng này.</p></div>
              <button className="btn-ghost h-8 w-8 shrink-0 px-0" onClick={() => togglePanel(false)} aria-label="Ẩn bảng dữ liệu SCORM"><X size={16} /></button>
            </div>
            <div className="flex gap-5 border-b border-line px-4">
              {[['data', 'Bản ghi', Database], ['log', `Nhật ký API (${log.filter((x) => !x.lms).length})`, Terminal]].map(([id, label, Icon]) => (
                <button key={id} onClick={() => setTab(id)} className={`relative flex items-center gap-1.5 py-3 text-[13px] ${tab === id ? 'font-semibold text-ink' : 'text-ink-muted hover:text-ink'}`}><Icon size={15} />{label}{tab === id && <i className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-primary" aria-hidden />}</button>
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
      <div className="border-b border-line bg-canvas px-4 py-2.5 text-[12px] text-ink-muted">
        {browse ? 'Xem thử: cổng trả về credit = no-credit, không lưu gì.' : savedAt ? `Đã lưu vào cổng lúc ${fmtClock(savedAt)} (LMSCommit)` : state === 'running' ? 'Gói đã kết nối, chưa lưu lần nào.' : 'Đang chờ gói gọi LMSInitialize…'}
      </div>
      <dl>
        {FIELDS.map(([k, label]) => {
          const v = cmi[k] ?? ''
          return (
            <div key={`${k}:${v}`} className={`border-b border-line px-4 py-2.5 ${seen.current ? 'flash' : ''}`}>
              <dt className="flex items-baseline justify-between gap-2"><span className="text-[13px] font-medium text-ink">{label}</span><code className="truncate font-mono text-[11px] text-ink-subtle">{k.replace(/^cmi\./, '')}</code></dt>
              <dd className="mt-0.5 break-words font-mono text-[12.5px] text-ink-muted">{k === 'cmi.suspend_data' ? <Suspend v={v} /> : k === 'cmi.core.total_time' ? `${v} (${humanTime(v)})` : v === '' ? <span className="text-ink-subtle">trống</span> : v}</dd>
            </div>
          )
        })}
      </dl>
      <p className="px-4 py-3 text-[12px] leading-relaxed text-ink-subtle">SCORM 1.2 không có trường % tiến độ. Cổng chỉ hiểu trạng thái, điểm và thời gian; tiến độ chi tiết gói tự lưu trong suspend_data để mở lại học tiếp.</p>
    </div>
  )
}

function Suspend({ v }) {
  const [full, setFull] = useState(false)
  if (!v) return <span className="text-ink-subtle">trống</span>
  return (
    <>
      <span className="text-ink-subtle">{v.length}/4096 ký tự · </span>
      <span>{full || v.length <= 120 ? v : `${v.slice(0, 120)}…`}</span>
      {v.length > 120 && <button className="ml-1 font-sans text-[12px] text-link" onClick={() => setFull((x) => !x)}>{full ? 'Thu gọn' : 'Xem đủ'}</button>}
    </>
  )
}

const q = (x) => { const s = JSON.stringify(String(x)); return s.length > 140 ? `${s.slice(0, 139)}…"` : s }
function LogTab({ log }) {
  const box = useRef(null)
  useEffect(() => { box.current?.scrollTo(0, box.current.scrollHeight) }, [log.length])
  return (
    <div ref={box} className="scroll-thin flex-1 overflow-y-auto bg-ink px-3 py-2 font-mono text-[11.5px] leading-relaxed text-white/80">
      {!log.length && <div className="py-2 text-ink-subtle">Chưa có lệnh nào.</div>}
      {log.map((e, i) => (
        <div key={i} className="border-b border-white/5 py-1">
          <span className="mr-2 text-ink-subtle">{fmtClock(e.at)}</span>
          {e.lms ? <span className="text-teal-300">Cổng: {e.text}</span> : (<>
            <span className="text-sky-300">{e.fn}</span>({e.args.map(q).join(', ')}) → <span className={e.err ? 'text-red-400' : 'text-emerald-300'}>{q(e.ret)}</span>
            {e.err > 0 && <div className="pl-[4.2rem] text-red-400">Lỗi {e.err}: {ERRORS[e.err]?.[1]}</div>}
          </>)}
        </div>
      ))}
    </div>
  )
}
