// Review khóa học. Reviewer: xem bản nháp, góp ý theo tài liệu và vị trí, kết luận Duyệt / Cần sửa.
// Người soạn: mời reviewer, xem kết luận, trả lời góp ý, đánh dấu đã xử lý, gửi lại vòng review mới.
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Eye, MessageSquare, Check, CheckCircle2, RotateCcw, UserPlus, Trash2, Clock, AlertTriangle, CornerDownRight, Pencil } from 'lucide-react'
import { useStore, useMe, initials } from '../store'
import { FORMATS, TYPE_ORDER } from '../data'
import { Avatar, FormatGlyph, Modal, Spinner, Thumb } from '../ui'
import { questionAnchor } from './QuizSheet'
import { TopOrg } from '../Shell'
import NotificationBell from '../Notifications'
import { get, post, patch, del } from '../api'

export const REVIEW_STATE = {
  pending: ['Đang chờ review', 'bg-sky-50 text-sky-800'],
  approved: ['Đã duyệt', 'bg-emerald-50 text-emerald-800'],
  changes: ['Cần sửa', 'bg-red-50 text-red-700'],
}
const pad2 = (n) => String(n).padStart(2, '0')
const fmtDay = (d) => { if (!d) return ''; const x = new Date(d); return `${pad2(x.getDate())}/${pad2(x.getMonth() + 1)}` }
const fmtAt = (d) => { const x = new Date(d); return `${pad2(x.getHours())}:${pad2(x.getMinutes())} ${fmtDay(x)}` }
// nút nhỏ trong luồng góp ý (btn-ghost có cỡ chữ riêng, không ghép với btn-sm được)
const ACT = 'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-ink hover:bg-neutral-100'

export const StateChip = ({ s, mine }) => { const [t0, c] = REVIEW_STATE[s]; const t = mine && s === 'pending' ? 'Chưa kết luận' : t0; return <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-medium ${c}`}>{t}</span> }

/** Tóm tắt review của khóa trên thẻ khóa học: ưu tiên cho thấy việc cần làm */
export function ReviewBadge({ review }) {
  if (!review?.total) return <span className="text-[12px] text-neutral-500">Chưa mời review</span>
  if (review.changes) return <span className="rounded-md bg-red-50 px-2 py-0.5 text-[12px] font-medium text-red-700">{review.changes} người yêu cầu sửa</span>
  if (review.pending) return <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[12px] font-medium text-sky-800">Đang review · {review.approved}/{review.total} đã duyệt</span>
  return <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-800">Đã duyệt · {review.total} người</span>
}

/** Các vị trí góp ý được trong một tài liệu: bài, slide, cảnh, chương, bước, câu hỏi */
export function anchorsOf(v) {
  if (!v) return []
  const out = []
  ;(v.lessons ?? []).filter((l) => l.kind === 'lesson').forEach((l, i) => out.push({ key: `lesson:${l.id}`, label: `Bài ${i + 1}: ${l.title}` }))
  ;(v.slides ?? []).forEach((s, i) => out.push({ key: `slide:${s.id ?? i}`, label: `Slide ${i + 1}: ${s.title ?? ''}`.trim() }))
  if (!v.slides?.length) (v.chapters ?? []).forEach((c) => out.push({ key: `t:${c.t}`, label: `Chương ${Math.floor(c.t / 60)}:${String(c.t % 60).padStart(2, '0')}: ${c.title}` }))
  ;(v.scenes ?? []).forEach((s, i) => out.push({ key: `scene:${s.id}`, label: `Cảnh ${i + 1}${s.goal ? `: ${s.goal}` : ''}` }))
  ;(v.steps ?? []).forEach((s, i) => out.push({ key: `step:${i}`, label: `Bước ${i + 1}: ${s.title}` }))
  ;(v.questions ?? []).forEach((q, i) => out.push(questionAnchor(q, i)))
  return out
}

/** Mở trình soạn đúng chỗ được góp ý (bài trong Tài liệu nhanh), các dạng khác mở đầu tài liệu */
const editUrl = (c) => `/edit/${c.artifactId}${c.anchor?.key?.startsWith('lesson:') ? `?lesson=${c.anchor.key.slice(7)}` : ''}`

function Who({ u, size = 26 }) { return <Avatar text={initials(u.name)} size={size} color={u.color} /> }

/* ---------- Hộp việc của reviewer ---------- */
export function ReviewInbox() {
  const nav = useNavigate()
  const { me } = useMe()
  const q = useQuery({ queryKey: ['reviews'], queryFn: () => get('/reviews') })
  const list = q.data ?? []
  const todo = list.filter((x) => x.status === 'pending')
  return (
    <div className="min-h-full">
      <TopOrg />
      <div className="px-10 py-8">
        <h1 className="text-[36px] font-semibold">Chào {me.name.split(' ').pop()}</h1>
        <p className="mt-1 text-[15px] text-neutral-600">{todo.length ? `${todo.length} khóa học đang chờ bạn review.` : 'Không có khóa nào đang chờ bạn review.'}</p>
        {q.isLoading && <div className="mt-6"><Spinner /></div>}
        {!q.isLoading && !list.length && <div className="card mt-6 px-6 py-12 text-center text-[15px] text-neutral-600">Chưa có lời mời review nào. Khi người soạn mời, khóa học sẽ hiện ở đây.</div>}
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((x) => (
            <button key={x.kitId} onClick={() => nav(`/review/${x.kitId}`)} className="card flex flex-col overflow-hidden text-left transition hover:shadow-pop">
              <Thumb img={x.img} className="h-36" />
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2"><StateChip s={x.status} />{x.round > 1 && <span className="text-[12px] text-neutral-500">Vòng {x.round}</span>}{x.due && x.status === 'pending' && <span className="ml-auto flex items-center gap-1 text-[12px] text-neutral-500"><Clock size={12} />Hạn {fmtDay(x.due)}</span>}</div>
                <div className="mt-2 text-[16px] font-semibold leading-snug">{x.title}</div>
                {x.message && <p className="mt-1.5 line-clamp-2 text-[13px] text-neutral-600">“{x.message}” · {x.invitedBy}</p>}
                <div className="flex-1" />
                <div className="mt-3 text-[12px] text-neutral-500">{x.artifacts} tài liệu{x.myOpen ? ` · ${x.myOpen} góp ý của bạn chưa xử lý` : ''}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- Mời reviewer ---------- */
function InviteModal({ open, onClose, kitId, candidates, invited, onDone }) {
  const { say } = useStore()
  const [pick, setPick] = useState(new Set())
  const [message, setMessage] = useState('')
  const [due, setDue] = useState(() => new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)
  const free = candidates.filter((c) => !invited.has(c.id))
  const submit = async () => {
    setBusy(true)
    try {
      const r = await post(`/reviews/kits/${kitId}/invite`, { reviewerIds: [...pick], message, due })
      say(`Đã mời ${r.invited} người review`); setPick(new Set()); setMessage(''); onDone(); onClose()
    } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} w={560} title="Mời review" sub="Reviewer xem bản nháp hiện tại của mọi tài liệu trong khóa, góp ý theo từng phần rồi kết luận Duyệt hoặc Cần sửa."
      footer={<button className="btn-dark h-10" disabled={busy || !pick.size} onClick={submit}>{busy ? <Spinner size={18} w={2} /> : pick.size ? `Mời ${pick.size} người` : 'Chọn người để mời'}</button>}>
      <div className="text-[14px]">
        {!candidates.length && <p className="rounded-lg bg-neutral-50 px-3 py-3 text-neutral-600">Chưa có tài khoản nào có vai reviewer. Nhờ quản trị tạo tài khoản ở mục Người dùng.</p>}
        <div className="max-h-[240px] divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {candidates.map((c) => (
            <label key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <input type="checkbox" disabled={invited.has(c.id)} checked={invited.has(c.id) || pick.has(c.id)} onChange={(e) => setPick((s) => { const n = new Set(s); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n })} />
              <Who u={c} /><span className="flex-1"><span className="block font-medium">{c.name}</span><span className="block text-[12px] text-neutral-500">{c.title}</span></span>
              {invited.has(c.id) && <span className="text-[12px] text-neutral-500">Đã mời</span>}
            </label>
          ))}
        </div>
        {free.length > 0 && <>
          <label className="mb-1 mt-4 block font-medium">Lời nhắn (reviewer thấy)</label>
          <textarea className="field min-h-[72px] py-2" maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ví dụ: Nhờ anh chị xem kỹ phần quy trình báo cáo sự cố" />
          <label className="mb-1 mt-3 block font-medium">Hạn review</label>
          <input type="date" className="field w-48 py-1.5" value={due} onChange={(e) => setDue(e.target.value)} />
        </>}
      </div>
    </Modal>
  )
}

/* ---------- Kết luận của reviewer ---------- */
function DecisionModal({ open, onClose, kitId, initial, onDone }) {
  const { say } = useStore()
  const [status, setStatus] = useState(initial ?? 'approved')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try { await post(`/reviews/kits/${kitId}/decision`, { status, note }); say(status === 'approved' ? 'Đã duyệt khóa học' : 'Đã gửi yêu cầu sửa cho người soạn'); onDone(); onClose() } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} w={520} title="Kết luận review" sub="Người soạn nhận kết luận cùng các góp ý bạn đã viết."
      footer={<button className="btn-dark h-10" disabled={busy} onClick={submit}>{busy ? <Spinner size={18} w={2} /> : 'Gửi kết luận'}</button>}>
      <div className="grid grid-cols-2 gap-2 text-[14px]">
        {[['approved', 'Duyệt', 'Nội dung đúng, có thể xuất bản', CheckCircle2], ['changes', 'Cần sửa', 'Người soạn sửa rồi gửi lại', AlertTriangle]].map(([k, t, d, I]) => (
          <button key={k} onClick={() => setStatus(k)} className={`rounded-xl border px-4 py-3 text-left ${status === k ? 'border-ink bg-neutral-50' : 'border-line hover:bg-neutral-50'}`}>
            <div className="flex items-center gap-2 font-semibold"><I size={16} className={k === 'approved' ? 'text-emerald-600' : 'text-red-600'} />{t}</div><div className="mt-0.5 text-[13px] text-neutral-600">{d}</div>
          </button>
        ))}
      </div>
      <label className="mb-1 mt-4 block text-[14px] font-medium">Nhận xét chung {status === 'changes' ? '(cần sửa gì)' : '(tùy chọn)'}</label>
      <textarea className="field min-h-[96px] py-2 text-[14px]" maxLength={3000} value={note} onChange={(e) => setNote(e.target.value)} placeholder={status === 'changes' ? 'Ví dụ: Cập nhật quy trình báo cáo theo quy định mới' : 'Ví dụ: Nội dung chính xác'} />
    </Modal>
  )
}

/* ---------- Góp ý ---------- */
function CommentForm({ kitId, artifacts, initialArt, onDone }) {
  const { say } = useStore()
  const [art, setArt] = useState(initialArt ?? '')
  const [anchor, setAnchor] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const view = useQuery({ queryKey: ['preview', art], queryFn: () => get(`/view/${art}`), enabled: !!art })
  const anchors = useMemo(() => anchorsOf(view.data), [view.data])
  const send = async () => {
    setBusy(true)
    try {
      const a = anchors.find((x) => x.key === anchor)
      await post(`/reviews/kits/${kitId}/comments`, { body, ...(art ? { artifactId: art } : {}), ...(a ? { anchor: a } : {}) })
      setBody(''); onDone()
    } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="grid grid-cols-2 gap-2">
        <select className="field py-1.5 text-[13px]" value={art} onChange={(e) => { setArt(e.target.value); setAnchor('') }} aria-label="Tài liệu">
          <option value="">Cả khóa học</option>
          {artifacts.map((a) => <option key={a.id} value={a.id}>{FORMATS[a.type].name}: {a.title}</option>)}
        </select>
        <select className="field py-1.5 text-[13px]" value={anchor} disabled={!art || !anchors.length} onChange={(e) => setAnchor(e.target.value)} aria-label="Vị trí">
          <option value="">{art && view.isLoading ? 'Đang tải…' : 'Cả tài liệu'}</option>
          {anchors.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
        </select>
      </div>
      <textarea className="field mt-2 min-h-[80px] py-2 text-[14px]" maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Viết góp ý: chỗ nào chưa đúng, nên sửa thế nào" />
      <div className="mt-2 flex justify-end"><button className="btn-dark btn-sm" disabled={busy || !body.trim()} onClick={send}>{busy ? <Spinner size={16} w={2} /> : 'Gửi góp ý'}</button></div>
    </div>
  )
}

function Thread({ c, kitId, me, canEdit, onChanged }) {
  const { say } = useStore()
  const nav = useNavigate()
  const [reply, setReply] = useState(null)
  const act = async (fn) => { try { await fn(); onChanged() } catch (e) { say(e.message) } }
  const resolved = !!c.resolvedAt
  return (
    <div className={`rounded-xl border p-3 text-[14px] ${resolved ? 'border-line bg-neutral-50' : 'border-line bg-white'}`}>
      {c.artifact && <div className="mb-2 flex items-start gap-1.5 text-[12px] leading-snug text-neutral-600"><span className="mt-px shrink-0"><FormatGlyph type={c.artifact.type} size={13} /></span><span><span className="font-medium">{c.artifact.title}</span>{c.anchor && ` › ${c.anchor.label}`}</span></div>}
      <div className="flex items-start gap-2">
        <Who u={c.author} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px]"><b>{c.author.name}</b> <span className="text-neutral-500">· {fmtAt(c.at)}{c.round > 1 ? ` · vòng ${c.round}` : ''}</span></div>
          <p className={`mt-0.5 whitespace-pre-wrap leading-relaxed ${resolved ? 'text-neutral-500' : ''}`}>{c.body}</p>
        </div>
      </div>
      {c.replies.map((r) => (
        <div key={r.id} className="ml-8 mt-2 flex items-start gap-2 border-l-2 border-line pl-3">
          <Who u={r.author} size={22} />
          <div className="min-w-0 flex-1"><div className="text-[13px]"><b>{r.author.name}</b> <span className="text-neutral-500">· {fmtAt(r.at)}</span></div><p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{r.body}</p></div>
        </div>
      ))}
      {reply !== null && (
        <div className="ml-8 mt-2">
          <textarea autoFocus className="field min-h-[60px] py-2 text-[14px]" maxLength={3000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Trả lời" />
          <div className="mt-1.5 flex justify-end gap-2"><button className="btn-line btn-sm" onClick={() => setReply(null)}>Hủy</button><button className="btn-dark btn-sm" disabled={!reply.trim()} onClick={() => act(async () => { await post(`/reviews/kits/${kitId}/comments`, { body: reply, parentId: c.id }); setReply(null) })}>Gửi</button></div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1 text-[13px]">
        {resolved && <span className="mr-auto flex items-center gap-1 text-emerald-700"><Check size={14} />Đã xử lý · {c.resolvedBy}</span>}
        {!resolved && <span className="mr-auto" />}
        {reply === null && <button className={ACT} onClick={() => setReply('')}><CornerDownRight size={14} />Trả lời</button>}
        {canEdit && c.artifactId && <button className={ACT} onClick={() => nav(editUrl(c))}><Pencil size={14} />Sửa chỗ này</button>}
        {(canEdit || c.author.id === me.id) && <button className={ACT} onClick={() => act(() => patch(`/reviews/comments/${c.id}`, { resolved: !resolved }))}>{resolved ? <><RotateCcw size={14} />Mở lại</> : <><Check size={14} />Đã xử lý</>}</button>}
        {c.author.id === me.id && !c.replies.length && <button className={ACT} aria-label="Xóa góp ý" onClick={() => act(() => del(`/reviews/comments/${c.id}`))}><Trash2 size={14} /></button>}
      </div>
    </div>
  )
}

/* ---------- Trang review của một khóa ---------- */
export function ReviewPage() {
  const { kitId } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { say, confirmBox } = useStore()
  const { me } = useMe()
  const q = useQuery({ queryKey: ['review', kitId], queryFn: () => get(`/reviews/kits/${kitId}`) })
  const [filter, setFilter] = useState('open')
  const [invite, setInvite] = useState(false)
  const [decide, setDecide] = useState(null)
  const reload = () => { q.refetch(); qc.invalidateQueries({ queryKey: ['kits'] }); qc.invalidateQueries({ queryKey: ['reviews'] }) }
  if (q.error) return <div className="grid h-full place-items-center text-center"><div><div className="text-[18px] font-semibold">Không mở được khóa học</div><p className="mt-2 text-[14px] text-neutral-600">{q.error.message}</p><button className="btn-line mt-4" onClick={() => nav('/')}>Về trang chủ</button></div></div>
  if (!q.data) return <div className="grid h-full place-items-center"><Spinner /></div>
  const d = q.data
  const arts = [...d.artifacts].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type))
  const open = d.comments.filter((c) => !c.resolvedAt)
  const shown = filter === 'open' ? open : d.comments
  const countOf = (aid) => open.filter((c) => c.artifactId === aid).length
  const changes = d.reviewers.filter((r) => r.status === 'changes')
  const requestAgain = async () => {
    if (open.length && !(await confirmBox(`Còn ${open.length} góp ý chưa đánh dấu đã xử lý. Vẫn gửi lại review?`, { ok: 'Gửi lại' }))) return
    try { const r = await post(`/reviews/kits/${kitId}/request-again`, {}); say(`Đã gửi lại cho ${r.reviewers} người review`); reload() } catch (e) { say(e.message) }
  }
  const removeReviewer = async (r) => {
    if (!(await confirmBox(`Bỏ ${r.user.name} khỏi review khóa này? Góp ý đã viết vẫn được giữ.`, { ok: 'Bỏ', danger: true }))) return
    try { await del(`/reviews/kits/${kitId}/reviewers/${r.id}`); reload() } catch (e) { say(e.message) }
  }
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-4">
        <button className="icon-btn" onClick={() => nav(d.canEdit ? `/kit/${kitId}` : '/')} aria-label="Quay lại"><ChevronLeft size={20} /></button>
        <span className="h-7 w-px bg-line" />
        <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-semibold">Review · {d.kit.title}</div></div>
        {d.mine && <><StateChip s={d.mine.status} mine /><button className="btn-dark btn-sm h-9" onClick={() => setDecide(d.mine.status === 'pending' ? 'approved' : d.mine.status)}>{d.mine.status === 'pending' ? 'Kết luận review' : 'Đổi kết luận'}</button></>}
        {d.canEdit && <>{changes.length > 0 && <button className="btn-line btn-sm h-9" onClick={requestAgain}><RotateCcw size={15} />Đã sửa, gửi lại review</button>}<button className="btn-dark btn-sm h-9" onClick={() => setInvite(true)}><UserPlus size={15} />Mời review</button></>}
        <span className="mx-1 h-6 w-px bg-line" aria-hidden />
        <NotificationBell />
      </header>
      <div className="scroll-thin grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_440px] lg:overflow-hidden">
        <div className="scroll-thin px-6 py-6 lg:overflow-y-auto lg:px-10">
          {d.mine?.message && <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-[14px]"><b>Lời nhắn của người soạn:</b> {d.mine.message}{d.mine.due && <span className="text-neutral-600"> · Hạn {fmtDay(d.mine.due)}</span>}</div>}
          <h1 className="text-[26px] font-semibold">{d.kit.title}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-neutral-700">{d.kit.desc}</p>
          {(d.kit.audience || d.kit.goals.length > 0) && <div className="mt-4 grid gap-4 rounded-2xl border border-dashed border-line p-4 text-[14px] md:grid-cols-2">
            {d.kit.audience && <div><div className="font-semibold">Đối tượng</div><p className="mt-1 text-neutral-700">{d.kit.audience}</p></div>}
            {d.kit.goals.length > 0 && <div><div className="font-semibold">Mục tiêu</div><ul className="mt-1 list-disc pl-5 text-neutral-700">{d.kit.goals.map((g) => <li key={g}>{g}</li>)}</ul></div>}
          </div>}
          <div className="mt-6 text-[15px] font-semibold">Tài liệu trong khóa ({arts.length})</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {arts.map((a) => (
              <div key={a.id} className="card flex items-center gap-3 p-3">
                <Thumb img={a.img} className="h-14 w-20 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 text-[12px] text-neutral-600"><FormatGlyph type={a.type} size={13} />{FORMATS[a.type].name}</div><div className="truncate text-[14px] font-semibold">{a.title}</div><div className="text-[12px] text-neutral-500">{countOf(a.id) ? `${countOf(a.id)} góp ý chưa xử lý` : 'Chưa có góp ý mở'}</div></div>
                <button className="btn-line btn-sm" onClick={() => nav(`/preview/${a.id}`)}><Eye size={14} />Xem</button>
              </div>
            ))}
          </div>
          <div className="mt-8 text-[15px] font-semibold">Người review ({d.reviewers.length})</div>
          {!d.reviewers.length && <p className="mt-2 text-[14px] text-neutral-600">Chưa mời ai. Bấm “Mời review” để chọn reviewer.</p>}
          <div className="mt-3 divide-y divide-line rounded-xl border border-line">
            {d.reviewers.map((r) => (
              <div key={r.id} className="flex items-start gap-3 px-4 py-3 text-[14px]">
                <Who u={r.user} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><b>{r.user.name}</b><span className="text-[12px] text-neutral-500">{r.user.title}</span></div>
                  <div className="mt-0.5 text-[12px] text-neutral-500">{r.status === 'pending' ? `Mời ${fmtDay(r.invitedAt)}${r.due ? ` · hạn ${fmtDay(r.due)}` : ''}` : `Kết luận ${fmtDay(r.decidedAt)}`}{r.round > 1 ? ` · vòng ${r.round}` : ''}</div>
                  {r.decisionNote && r.status !== 'pending' && <p className="mt-1 text-neutral-700">“{r.decisionNote}”</p>}
                </div>
                <StateChip s={r.status} />
                {d.canEdit && <button className="icon-btn h-8 w-8" aria-label={`Bỏ ${r.user.name}`} onClick={() => removeReviewer(r)}><Trash2 size={15} /></button>}
              </div>
            ))}
          </div>
        </div>
        <aside className="flex flex-col border-t border-line bg-neutral-50 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3"><MessageSquare size={16} /><span className="flex-1 text-[15px] font-semibold">Góp ý</span>
            <div className="flex rounded-lg bg-white p-0.5 text-[13px] shadow-card">{[['open', `Chưa xử lý ${open.length}`], ['all', `Tất cả ${d.comments.length}`]].map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`rounded-md px-2.5 py-1 ${filter === k ? 'bg-ink font-medium text-white' : 'text-neutral-600'}`}>{l}</button>)}</div>
          </div>
          <div className="scroll-thin flex-1 space-y-3 p-4 lg:overflow-y-auto">
            <CommentForm kitId={kitId} artifacts={arts} initialArt={params.get('a')} onDone={reload} />
            {!shown.length && <p className="px-1 py-6 text-center text-[14px] text-neutral-500">{filter === 'open' ? 'Không còn góp ý nào chưa xử lý.' : 'Chưa có góp ý nào.'}</p>}
            {shown.map((c) => <Thread key={c.id} c={c} kitId={kitId} me={me} canEdit={d.canEdit} onChanged={reload} />)}
          </div>
        </aside>
      </div>
      {d.canEdit && <InviteModal open={invite} onClose={() => setInvite(false)} kitId={kitId} candidates={d.candidates} invited={new Set(d.reviewers.map((r) => r.user.id))} onDone={reload} />}
      {decide && <DecisionModal open onClose={() => setDecide(null)} kitId={kitId} initial={decide} onDone={reload} />}
    </div>
  )
}
