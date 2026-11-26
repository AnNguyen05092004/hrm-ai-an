// Chế độ đối chiếu (split view): trái là JD có từ khoá tô màu, phải là CV sửa trực tiếp; điểm tính lại tức thì.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Undo2, Send, CheckCircle2, Save } from 'lucide-react'
import { useStore } from '../../store.jsx'
import { matchScore, rankJobs, GRADES } from '../../lib/match.js'
import { setSkill, insertKeyword } from '../../lib/cvEdit.js'
import { SKILLS, LEVELS } from '../../data/skills.js'
import { ExplainCard } from '../../components/Explain.jsx'
import { ContributionBar } from '../../components/Breakdown.jsx'
import { Button, Card, ScoreRing, PageBar, cx } from '../../ui.jsx'
import JdPane from './JdPane.jsx'
import CvEditor from './CvEditor.jsx'
import KeywordPopover from './KeywordPopover.jsx'
import { useCvDraft } from './useCvDraft.js'

const DELTA_MS = 2600

function useScoreDelta(score) {
  const prev = useRef(null)
  const [delta, setDelta] = useState(null)
  useEffect(() => {
    if (prev.current != null && prev.current !== score) setDelta({ v: score - prev.current, at: Date.now() })
    prev.current = score
  }, [score])
  useEffect(() => {
    if (!delta) return undefined
    const t = setTimeout(() => setDelta(null), DELTA_MS)
    return () => clearTimeout(t)
  }, [delta])
  return delta
}

export default function MatchMode() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const s = useStore()
  const draft = useCvDraft()
  const [pick, setPick] = useState(null)

  const options = useMemo(() => rankJobs(draft.scored, s.jobs.filter((j) => s.statusOf(j.id) !== 'draft'), (j) => s.criteriaOf(j.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- thứ tự trong danh sách chọn chỉ cần tính theo hồ sơ khi mở trang
    [s.meId, s.jobs, s.criteria])
  const job = s.job(jobId) ?? options[0].job
  const m = matchScore(job, draft.scored, s.criteriaOf(job.id))
  const delta = useScoreDelta(m.score)
  const items = m.groups.flatMap((g) => g.items)
  const bySkill = Object.fromEntries(items.filter((i) => i.type === 'skill').map((i) => [i.skill, i]))
  const statusBySkill = Object.fromEntries(Object.entries(bySkill).map(([k, i]) => [k, i.status]))
  const applied = s.hasApplied(draft.cv.id, job.id)

  const openPick = (skill, el) => setPick({ skill, rect: el.getBoundingClientRect(), anchor: el })
  const addSkill = (skill, level) => {
    draft.change(setSkill(draft.cv, skill, level), { flash: `skill:${skill}` })
    s.notify(`Đã ghi ${SKILLS[skill].name} – ${LEVELS[level]} vào mục Kỹ năng`)
    setPick(null)
  }
  const insert = (skill, idx) => {
    const r = insertKeyword(draft.cv, idx, skill)
    draft.change(r.cv, { flash: `entry:${idx}`, focus: { idx, range: r.select, at: Date.now() } })
    s.notify('Đã chèn câu mẫu — hãy thay phần [kết quả cụ thể] bằng kết quả thật')
    setPick(null)
  }

  return (
    <div>
      <PageBar title={<span className="flex items-center gap-2"><Link to="/me/resume" className="font-normal text-mute hover:text-ink">Trình tạo CV</Link><span className="font-normal text-mute">/</span>Chế độ đối chiếu</span>}>
        <select value={job.id} onChange={(e) => navigate(`/me/resume/match/${e.target.value}`)} aria-label="Đối chiếu với vị trí"
          className="h-9 w-full rounded-md border border-line bg-white pl-3 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/40 sm:w-72">
          {options.map(({ job: j, m: jm }) => <option key={j.id} value={j.id}>{j.title} · {jm.score}%</option>)}
        </select>
        <Button variant="secondary" onClick={draft.undo} disabled={!draft.canUndo} title="Hoàn tác thay đổi gần nhất"><Undo2 size={15} aria-hidden />Hoàn tác</Button>
        <Button variant="primary" disabled={applied}
          onClick={() => { s.apply(draft.cv.id, job.id); s.notify(`Đã ứng tuyển “${job.title}” với CV hiện tại`) }}>
          {applied ? <><CheckCircle2 size={15} aria-hidden />Đã ứng tuyển</> : <><Send size={15} aria-hidden />Ứng tuyển</>}
        </Button>
      </PageBar>
      <div className="space-y-4 px-4 py-5 sm:px-8">
      <p className="text-sm text-mute">Bấm từ khoá trong JD để thêm vào CV. Điểm cập nhật ngay khi bạn sửa.</p>
      <Card className="p-5">
        <ExplainCard m={m} onPick={openPick}>
          {delta && (
            <span key={delta.at} className={cx('mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              delta.v > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')} role="status">
              {delta.v > 0 ? '+' : ''}{delta.v}% sau thay đổi vừa rồi
            </span>
          )}
        </ExplainCard>
        <div className="mt-4 border-t border-line pt-3"><ContributionBar m={m} /></div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <JdPane job={job} m={m} onPick={openPick} />
        </Card>
        <Card className="p-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="sticky -top-5 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-between gap-2 border-b border-line bg-white/95 px-5 py-3 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <ScoreRing value={m.score} grade={m.grade} size={36} stroke={4} />
              <div className="leading-tight">
                <p className="text-xs font-semibold uppercase tracking-wide text-mute">CV của bạn</p>
                <p className="text-[13px]">{GRADES[m.grade].label}{delta && <span key={delta.at} className={cx('ml-1.5 font-semibold tabular-nums', delta.v > 0 ? 'text-emerald-700' : 'text-rose-700')}>{delta.v > 0 ? '+' : ''}{delta.v}%</span>}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-mute"><Save size={12} aria-hidden />Tự lưu</span>
          </div>
          <CvEditor cv={draft.cv} onChange={draft.change} statusBySkill={statusBySkill} derived={draft.derived} focus={draft.meta.focus} flash={draft.meta.flash} />
        </Card>
      </div>

      </div>
      {pick && <KeywordPopover key={pick.skill + pick.rect.top} pick={pick} item={bySkill[pick.skill]} cv={draft.cv} onClose={() => setPick(null)} onAddSkill={addSkill} onInsert={insert} />}
    </div>
  )
}
