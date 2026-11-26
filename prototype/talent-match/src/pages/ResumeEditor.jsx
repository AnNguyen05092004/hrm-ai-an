// Sửa CV (mở từ Trình tạo CV): bên trái sửa từng mục, bên phải mức hoàn thiện + đối chiếu nhanh với việc đang tuyển.
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, Undo2, RotateCcw, ArrowRight, Upload, Eye, PencilLine } from 'lucide-react'
import { useStore } from '../store.jsx'
import { rankJobs, GRADES } from '../lib/match.js'
import { completeness, withUids } from '../lib/cvEdit.js'
import { detectKind, parseCv } from '../lib/extract.js'
import { Button, Card, ScoreRing, Segmented, Bar, PageBar } from '../ui.jsx'
import CvView from '../components/CvView.jsx'
import Dropzone from '../components/Dropzone.jsx'
import CvEditor from './match-mode/CvEditor.jsx'
import { useCvDraft } from './match-mode/useCvDraft.js'

export default function ResumeEditor() {
  const s = useStore()
  const navigate = useNavigate()
  const draft = useCvDraft()
  const [view, setView] = useState('edit')
  const [uploading, setUploading] = useState(false)
  const done = completeness(draft.cv)
  const top = useMemo(() => rankJobs(draft.scored, s.jobs.filter((j) => s.statusOf(j.id) !== 'draft'), (j) => s.criteriaOf(j.id)).slice(0, 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tính lại theo bản CV đang sửa
    [draft.scored, s.jobs, s.criteria])

  const replaceFromFile = (text) => {
    if (detectKind(text) === 'jd') { s.notify('File này giống mô tả công việc, không phải CV'); return }
    const parsed = withUids({ ...parseCv(text, { id: draft.cv.id }), source: draft.cv.source, appliedTo: draft.cv.appliedTo })
    draft.change(parsed, { flash: 'all' })
    setUploading(false)
    s.notify(`Đã đọc CV: ${Object.keys(parsed.skills).length} kỹ năng, ${parsed.history.length} mục kinh nghiệm`)
  }

  return (
    <div>
      <PageBar title={<span className="flex items-center gap-2"><Link to="/me/resume" className="font-normal text-mute hover:text-ink">Trình tạo CV</Link><span className="font-normal text-mute">/</span>{draft.cv.headline}</span>}>
        <Segmented value={view} onChange={setView} options={[{ value: 'edit', label: <span className="inline-flex items-center gap-1"><PencilLine size={13} aria-hidden />Chỉnh sửa</span> }, { value: 'preview', label: <span className="inline-flex items-center gap-1"><Eye size={13} aria-hidden />Xem CV</span> }]} />
        <Button variant="secondary" onClick={() => setUploading((x) => !x)}><Upload size={15} aria-hidden />Tải CV mới</Button>
      </PageBar>
      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-8">
      {uploading && (
        <Card className="p-4">
          <Dropzone compact onText={replaceFromFile} title="Thả CV mới để thay nội dung hiện tại" />
          <p className="mt-2 text-xs text-mute">Nội dung đang có sẽ được thay bằng CV mới. Bạn vẫn có thể bấm “Hoàn tác”.</p>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-5">
          {view === 'edit'
            ? <CvEditor cv={draft.cv} onChange={draft.change} derived={draft.derived} focus={draft.meta.focus} flash={draft.meta.flash} />
            : <div className="-m-5"><CvView cv={draft.scored} /></div>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <p className="text-xs text-mute">Mọi thay đổi được lưu tự động.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={draft.undo} disabled={!draft.canUndo}><Undo2 size={14} aria-hidden />Hoàn tác</Button>
              {draft.reset && draft.isEdited && <Button size="sm" variant="ghost" onClick={draft.reset}><RotateCcw size={14} aria-hidden />Về bản gốc</Button>}
            </div>
          </div>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-4">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold">Mức hoàn thiện CV</p>
              <p className="text-lg font-semibold tabular-nums">{done.pct}%</p>
            </div>
            <Bar value={done.pct} className="mt-2" tone="bg-accent-600" />
            <ul className="mt-3 space-y-1.5">
              {done.results.map((r) => (
                <li key={r.label} className="flex items-center gap-2 text-sm">
                  {r.ok ? <CheckCircle2 size={15} className="text-accent-600" aria-hidden /> : <Circle size={15} className="text-ink/25" aria-hidden />}
                  <span className={r.ok ? 'text-mute line-through decoration-ink/20' : ''}>{r.label}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <p className="font-semibold">Đối chiếu với việc đang tuyển</p>
            <p className="mt-0.5 text-xs text-mute">Chọn một vị trí để mở chế độ đối chiếu.</p>
            <ul className="mt-3 space-y-1">
              {top.map(({ job, m }) => (
                <li key={job.id}>
                  <Link to={`/me/resume/match/${job.id}`} className="group flex items-center gap-3 rounded-xl p-2 hover:bg-soft">
                    <ScoreRing value={m.score} grade={m.grade} size={40} stroke={4} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{job.title}</span>
                      <span className="block text-xs text-mute">{GRADES[m.grade].label}</span>
                    </span>
                    <ArrowRight size={15} className="text-mute transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <Button variant="accent" className="mt-3 w-full" onClick={() => navigate(`/me/resume/match/${top[0].job.id}`)}>Mở chế độ đối chiếu</Button>
          </Card>
        </aside>
      </div>
      </div>
    </div>
  )
}
