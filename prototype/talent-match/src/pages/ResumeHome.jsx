// Trình tạo CV — màn tổng quan (bố cục theo Teal Resume Builder): 4 cách bắt đầu + danh sách CV gần đây.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, BriefcaseBusiness, PencilRuler, ScrollText, Search, MoreHorizontal, Clock, Menu, Upload } from 'lucide-react'
import { useStore } from '../store.jsx'
import { parseCv, detectKind } from '../lib/extract.js'
import { withUids } from '../lib/cvEdit.js'
import { SAMPLE_CV } from '../data/samples.js'
import { Button, PageBar, ScoreRing, fmtDate, cx } from '../ui.jsx'
import Modal from '../components/Modal.jsx'
import Dropzone from '../components/Dropzone.jsx'
import { useMyRanking } from './useMyRanking.js'

function Tile({ icon: Icon, tone, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex h-[150px] flex-col items-center justify-center gap-4 rounded-md border border-line bg-white transition hover:border-ink/30 hover:bg-paper">
      <span className={cx('flex h-[60px] w-[60px] items-center justify-center rounded-full', tone)}><Icon size={26} strokeWidth={2} aria-hidden /></span>
      <span className="text-[15px]">{label}</span>
    </button>
  )
}

function useOutside(open, close) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!ref.current?.contains(e.target)) close() }
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open, close])
  return ref
}

function Dropdown({ trigger, items }) {
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((x) => !x) })}
      {open && (
        <ul className="absolute right-0 z-30 mt-1 w-56 rounded-md border border-line bg-white py-1 shadow-pop" role="menu">
          {items.filter(Boolean).map((it) => (
            <li key={it.label}><button type="button" role="menuitem" onClick={() => { setOpen(false); it.onClick() }} className="w-full px-3.5 py-2 text-left text-sm hover:bg-soft">{it.label}</button></li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ResumeHome() {
  const s = useStore()
  const navigate = useNavigate()
  const { cv, ranking } = useMyRanking()
  const raw = s.rawCv(cv.id)
  const [modal, setModal] = useState(null) // 'upload' | 'job' | 'template'
  const [q, setQ] = useState('')
  const title = `CV – ${raw.headline}`
  const top = ranking[0]
  const replace = (text, note, keepName) => {
    if (detectKind(text) === 'jd') { s.notify('File này giống mô tả công việc, không phải CV'); return }
    const parsed = parseCv(text, { id: cv.id })
    s.saveCv(withUids({ ...parsed, name: keepName ? raw.name : parsed.name, source: raw.source, appliedTo: raw.appliedTo }))
    setModal(null)
    s.notify(note)
    navigate('/me/resume/edit')
  }
  const menu = [
    { label: 'Sửa CV', onClick: () => navigate('/me/resume/edit') },
    { label: 'Đối chiếu với việc phù hợp nhất', onClick: () => navigate(`/me/resume/match/${top.job.id}`) },
    { label: 'Tải CV mới từ file', onClick: () => setModal('upload') },
    s.isCvEdited(cv.id) && { label: 'Khôi phục bản gốc', onClick: () => { s.resetCv(cv.id); s.notify('Đã khôi phục CV gốc') } },
  ]

  return (
    <div>
      <PageBar title="Trình tạo CV">
        <Dropdown items={menu} trigger={({ open, toggle }) => (
          <Button variant="secondary" onClick={toggle} aria-expanded={open}><Menu size={17} aria-hidden />Menu</Button>
        )} />
      </PageBar>

      <div className="mx-auto max-w-[1000px] px-4 py-10 sm:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile icon={Plus} tone="bg-brand-50 text-brand-600" label="CV mới từ file" onClick={() => setModal('upload')} />
          <Tile icon={BriefcaseBusiness} tone="bg-[#e3e5fb] text-[#272f8c]" label="Bắt đầu từ mô tả công việc" onClick={() => setModal('job')} />
          <Tile icon={PencilRuler} tone="bg-[#f6dadd] text-[#8c1f3a]" label="Bắt đầu từ CV mẫu" onClick={() => setModal('template')} />
          <Tile icon={ScrollText} tone="bg-[#fbf3cf] text-[#8a6410]" label="Cách chấm điểm CV" onClick={() => navigate('/rules')} />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium">CV gần đây</h2>
          <label className="relative">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm CV" aria-label="Tìm CV" className="h-9 w-60 rounded-md border border-line pl-3 pr-9 text-sm placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/70" aria-hidden />
          </label>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(!q || title.toLowerCase().includes(q.toLowerCase())) ? (
            <div className="rounded-md border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <Link to="/me/resume/edit" className="min-w-0 font-semibold hover:underline">{title}</Link>
                <Dropdown items={menu} trigger={({ open, toggle }) => (
                  <button type="button" onClick={toggle} aria-expanded={open} aria-label="Thao tác với CV" className="-mr-1 -mt-1 rounded p-1 text-ink/60 hover:bg-soft"><MoreHorizontal size={18} /></button>
                )} />
              </div>
              <p className="mt-1 text-sm text-mute">{Object.keys(raw.skills).length} kỹ năng · {raw.history.length} mục kinh nghiệm</p>
              <Link to={`/me/resume/match/${top.job.id}`} className="mt-6 flex items-center gap-2 text-sm text-brand-600 hover:underline" title={`Hợp nhất: ${top.job.title}`}>
                <BriefcaseBusiness size={16} aria-hidden />Đối chiếu với việc<span className="text-mute">· hợp nhất {top.m.score}%</span>
              </Link>
              <p className="mt-2 flex items-center gap-2 text-sm text-mute"><Clock size={16} aria-hidden />Sửa lần cuối: {fmtDate(raw.updatedAt)}</p>
            </div>
          ) : <p className="text-sm text-mute">Không có CV khớp “{q}”.</p>}
        </div>
      </div>

      {modal === 'upload' && (
        <Modal title="CV mới từ file" onClose={() => setModal(null)}>
          <p className="mb-3 mt-1 text-sm text-mute">CV hiện tại sẽ được thay bằng nội dung file. File chỉ được đọc trên trình duyệt.</p>
          <Dropzone compact onText={(text) => replace(text, 'Đã đọc CV từ file')} title="Kéo thả CV (PDF) vào đây" />
        </Modal>
      )}
      {modal === 'job' && (
        <Modal title="Chọn vị trí để đối chiếu" onClose={() => setModal(null)}>
          <ul className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto">
            {ranking.map(({ job, m }) => (
              <li key={job.id}>
                <button type="button" onClick={() => navigate(`/me/resume/match/${job.id}`)} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-soft">
                  <ScoreRing value={m.score} grade={m.grade} size={36} stroke={3.5} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{job.title}</span><span className="block text-xs text-mute">{job.dept} · {job.city}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {modal === 'template' && (
        <Modal title="Bắt đầu từ CV mẫu?" onClose={() => setModal(null)}>
          <p className="mt-2 text-sm text-mute">Nội dung CV hiện tại sẽ được thay bằng CV mẫu của một kỹ sư frontend. Bạn sửa lại từng mục sau đó.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Huỷ</Button>
            <Button variant="primary" onClick={() => replace(SAMPLE_CV, 'Đã nạp CV mẫu', true)}><Upload size={15} aria-hidden />Dùng CV mẫu</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
