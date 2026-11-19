import { Fragment, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, FileText, Box, Flag, ShieldCheck, Check, X, Upload, Trash2, RefreshCw, AlertTriangle, MessageSquareWarning, CheckCircle2, Hourglass, Code2 } from 'lucide-react'
import { useStore, useMe } from '../store'
import { TYPE_ORDER } from '../data'
import { Thumb, FormatGlyph, Status, Avatar, Spinner, Modal } from '../ui'
import { TopOrg } from '../Shell'
import { api, get, post, patch, del } from '../api'

const fmtDate = (d) => (d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
const Page = ({ title, sub, children, right }) => (
  <div className="min-h-full"><TopOrg>{right}</TopOrg><div className="px-10 py-8"><h1 className="text-[36px] font-semibold">{title}</h1>{sub && <p className="mt-1 text-[15px] text-neutral-600">{sub}</p>}{children}</div></div>
)
const Tabs = ({ value, onChange, items }) => (
  <div className="mt-6 flex gap-6 border-b border-line">{items.map(([k, l, n]) => <button key={k} onClick={() => onChange(k)} className={`-mb-px border-b-2 pb-2.5 text-[15px] ${value === k ? 'border-ink font-semibold' : 'border-transparent text-neutral-500'}`}>{l}{n != null && <span className="ml-1.5 text-neutral-400">{n}</span>}</button>)}</div>
)

/* ---------- Thư viện ---------- */
function Sources() {
  const { say, confirmBox } = useStore()
  const qc = useQueryClient()
  const input = useRef(), replaceId = useRef(null)
  const q = useQuery({ queryKey: ['sources'], queryFn: () => get('/sources'), refetchInterval: (x) => ((x.state.data ?? []).some((s) => s.status === 'processing') ? 2000 : false) })
  const [view, setView] = useState(null)
  const upload = async (files) => {
    for (const f of files) {
      const form = new FormData(); form.append('file', f)
      try { await api(`/sources${replaceId.current ? `?replace=${replaceId.current}` : ''}`, { method: 'POST', form }); say(replaceId.current ? `Đã tải bản mới của ${f.name}. Các khóa học dùng tài liệu này sẽ báo phần cần cập nhật.` : `Đã tải ${f.name}`) } catch (e) { say(e.message) }
    }
    replaceId.current = null
    qc.invalidateQueries({ queryKey: ['sources'] })
  }
  const remove = async (s) => { if (!(await confirmBox(`Xóa tài liệu "${s.name}"? Các khóa học đang dùng sẽ mất nguồn này.`, { ok: 'Xóa', danger: true }))) return; await del(`/sources/${s.id}`); qc.invalidateQueries({ queryKey: ['sources'] }) }
  const detail = useQuery({ queryKey: ['source', view], queryFn: () => get(`/sources/${view}`), enabled: !!view })
  return (
    <div className="mt-6">
      <div className="flex items-center"><p className="flex-1 text-[14px] text-neutral-600">Tài liệu nội bộ AI được phép dùng làm nguồn. Tải bản mới để hệ thống chỉ ra bài nào cần cập nhật.</p><button className="btn-dark btn-sm h-9" onClick={() => { replaceId.current = null; input.current.click() }}><Upload size={15} />Tải tài liệu</button></div>
      <input ref={input} type="file" hidden multiple accept=".pdf,.docx,.txt,.md" onChange={(e) => { upload([...e.target.files]); e.target.value = '' }} />
      <table className="mt-4 w-full text-[14px]">
        <thead><tr className="border-b border-line text-left text-[13px] text-neutral-500"><th className="py-2 font-medium">Tên</th><th className="font-medium">Phiên bản</th><th className="font-medium">Trạng thái</th><th className="font-medium">Cập nhật</th><th /></tr></thead>
        <tbody>{q.data?.map((s) => (
          <tr key={s.id} className="group border-b border-line">
            <td className="py-3"><button onClick={() => setView(s.id)} className="flex items-center gap-2 font-medium hover:underline"><FileText size={15} className="text-sky-600" />{s.name}</button>{s.sensitive && <span className="chip ml-6 mt-1 bg-amber-50 text-amber-700">Có thể chứa dữ liệu nhạy cảm</span>}</td>
            <td>v{s.version}</td>
            <td>{s.status === 'ready' ? <span className="text-emerald-700">Sẵn sàng</span> : s.status === 'processing' ? <span className="flex items-center gap-1.5 text-neutral-500"><Spinner size={14} w={2} />Đang đọc</span> : <span className="text-red-600" title={s.error}>Lỗi: {s.error}</span>}</td>
            <td className="text-neutral-500">{fmtDate(s.updatedAt)}</td>
            <td className="text-right"><span className="opacity-0 group-hover:opacity-100"><button className="btn-ghost h-8 text-[13px]" onClick={() => { replaceId.current = s.id; input.current.click() }}><RefreshCw size={14} />Tải bản mới</button><button className="icon-btn h-8 w-8" onClick={() => remove(s)} aria-label="Xóa"><Trash2 size={15} /></button></span></td>
          </tr>))}</tbody>
      </table>
      <Modal open={!!view} onClose={() => setView(null)} title={detail.data?.name} sub={detail.data && `v${detail.data.version} · ${detail.data.chunks.length} đoạn`} w={760}>
        {detail.isLoading ? <Spinner /> : detail.data?.chunks.map((c) => <div key={c.id} className="border-b border-line py-3 text-[14px] last:border-0"><div className="text-[12px] font-semibold text-sky-700">{c.section}</div><p className="mt-1 whitespace-pre-wrap text-neutral-700">{c.text}</p></div>)}
      </Modal>
    </div>
  )
}

export function Library() {
  const nav = useNavigate()
  const [tab, setTab] = useState('kits')
  const [q, setQ] = useState('')
  const kits = useQuery({ queryKey: ['kits'], queryFn: () => get('/kits') })
  const list = (kits.data ?? []).filter((k) => !q || `${k.title} ${k.artifacts.map((a) => a.title).join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  const arts = list.flatMap((k) => k.artifacts.map((a) => ({ ...a, kit: k })))
  return (
    <Page title="Thư viện" sub="Khóa học, tài liệu và tài liệu nguồn của công ty.">
      <Tabs value={tab} onChange={setTab} items={[['kits', 'Khóa học', kits.data?.length], ['arts', 'Tài liệu', arts.length], ['sources', 'Tài liệu nguồn']]} />
      {tab !== 'sources' && <div className="mt-5 flex w-[360px] items-center gap-2 rounded-lg border border-line px-3"><Search size={15} className="text-neutral-400" /><input value={q} onChange={(e) => setQ(e.target.value)} className="h-9 flex-1 text-[14px] outline-none" placeholder="Tìm theo tên" /></div>}
      {kits.isLoading && tab !== 'sources' && <div className="mt-6"><Spinner /></div>}
      {tab === 'kits' && <div className="mt-5 grid grid-cols-3 gap-5">{list.map((k) => (
        <button key={k.id} onClick={() => nav(k.stage === 'details' ? `/kit/${k.id}/details` : k.stage === 'outline' ? `/kit/${k.id}/outline` : `/kit/${k.id}`)} className="card overflow-hidden text-left transition hover:shadow-pop">
          <Thumb img={k.artifacts[0]?.img ?? k.img} className="h-36" />
          <div className="p-4"><div className="flex items-center gap-1.5 text-[13px] font-medium"><Box size={14} className="text-emerald-600" />Khóa học · {k.stage === 'ready' ? `${k.artifacts.length} tài liệu` : 'đang soạn'}</div><div className="mt-1.5 text-[16px] font-semibold">{k.title}</div><div className="mt-1 text-[13px] text-neutral-500">Cập nhật {k.updated}</div></div>
        </button>))}</div>}
      {tab === 'arts' && <table className="mt-5 w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] text-neutral-500"><th className="py-2 font-medium">Tài liệu</th><th className="font-medium">Bộ</th><th className="font-medium">Trạng thái</th><th className="font-medium">Cập nhật</th></tr></thead>
        <tbody>{arts.map((a) => <tr key={a.id} onClick={() => nav(`/edit/${a.id}`)} className="cursor-pointer border-b border-line hover:bg-neutral-50"><td className="py-3"><span className="flex items-center gap-2 font-medium"><FormatGlyph type={a.type} size={15} />{a.title}</span></td><td className="text-neutral-600">{a.kit.title}</td><td><Status s={a.status} /></td><td className="text-neutral-500">{a.updated}</td></tr>)}</tbody></table>}
      {tab === 'sources' && <Sources />}
    </Page>
  )
}

/* ---------- Phân tích ---------- */
/** Gom số liệu tài liệu theo khóa (khóa học), mục con theo thứ tự học */
function byKit(rows, kits) {
  const m = new Map()
  for (const r of rows) m.set(r.kitId, [...(m.get(r.kitId) ?? []), r])
  return [...m.entries()].map(([id, list]) => [{ id, title: kits.find((k) => k.id === id)?.title ?? 'Khóa học' }, list.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type))])
}

export function Analytics() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const focus = params.get('artifact')
  const q = useQuery({ queryKey: ['analytics'], queryFn: () => get('/analytics') })
  const kits = useQuery({ queryKey: ['kits'], queryFn: () => get('/kits') })
  const [tab, setTab] = useState('arts')
  if (q.isLoading) return <Page title="Phân tích"><div className="mt-6"><Spinner /></div></Page>
  const rows = (q.data.rows ?? []).filter((r) => r.status === 'published' || r.id === focus).sort((a, b) => (b.id === focus) - (a.id === focus) || b.assigned - a.assigned)
  const tot = rows.reduce((s, r) => ({ assigned: s.assigned + r.assigned, started: s.started + r.started, completed: s.completed + r.completed, attempts: s.attempts + r.attempts, passed: s.passed + r.passed }), { assigned: 0, started: 0, completed: 0, attempts: 0, passed: 0 })
  const resolve = async (id) => { await post(`/tutor/unanswered/${id}/resolve`); qc.invalidateQueries({ queryKey: ['analytics'] }) }
  const stat = (label, value, sub) => <div className="card p-5"><div className="text-[13px] text-neutral-500">{label}</div><div className="mt-1 font-display text-[30px] font-semibold">{value}</div>{sub && <div className="text-[12px] text-neutral-500">{sub}</div>}</div>
  return (
    <Page title="Phân tích" sub="Số liệu thật từ lượt học, lượt thi và câu hỏi AI Tutor.">
      <div className="mt-6 grid grid-cols-4 gap-4">
        {stat('Lượt giao khóa', tot.assigned)}
        {stat('Đã bắt đầu học', tot.started, tot.assigned ? `${Math.round((100 * tot.started) / tot.assigned)}% số lượt giao` : null)}
        {stat('Học xong', tot.completed, tot.started ? `${Math.round((100 * tot.completed) / tot.started)}% người đã bắt đầu` : null)}
        {stat('Lượt thi đạt', `${tot.passed}/${tot.attempts}`)}
      </div>
      <Tabs value={tab} onChange={setTab} items={[['arts', 'Theo khóa'], ['tutor', 'Câu Tutor chưa trả lời được', q.data.unanswered.length], ['hard', 'Câu hỏi bị sai nhiều', q.data.hardQuestions.length]]} />
      {tab === 'arts' && <table className="mt-4 w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] text-neutral-500"><th className="py-2 font-medium">Khóa · tài liệu</th><th className="font-medium">Được giao</th><th className="font-medium">Bắt đầu</th><th className="font-medium">Học xong</th><th className="font-medium">Lượt thi · đạt</th><th className="font-medium">Điểm TB</th><th className="font-medium">Hỏi Tutor · chưa trả lời</th></tr></thead>
        <tbody>{byKit(rows, kits.data ?? []).map(([k, list]) => <Fragment key={k.id}>
          <tr className="border-b border-line bg-neutral-50"><td className="py-2.5 pl-2"><button onClick={() => nav(`/kit/${k.id}`)} className="font-semibold hover:underline">{k.title}</button><span className="ml-2 text-[12px] text-neutral-500">{list.length} tài liệu</span></td><td className="font-semibold">{Math.max(...list.map((r) => r.assigned))} người</td><td /><td /><td>{list.reduce((n, r) => n + r.attempts, 0)} · {list.reduce((n, r) => n + r.passed, 0)}</td><td /><td>{list.reduce((n, r) => n + r.tutorAsked, 0)} · {list.reduce((n, r) => n + r.tutorMissed, 0)}</td></tr>
          {list.map((r) => <tr key={r.id} className={`border-b border-line ${r.id === focus ? 'bg-sky-50' : ''}`}><td className="py-3 pl-6"><button onClick={() => nav(`/edit/${r.id}`)} className="flex items-center gap-2 font-medium hover:underline"><FormatGlyph type={r.type} size={15} />{r.title}</button></td><td>{r.assigned}</td><td>{r.started}</td><td>{r.completed}</td><td>{r.attempts} · {r.passed}</td><td>{r.avgScore == null ? '—' : `${r.avgScore}%`}</td><td>{r.tutorAsked} · <span className={r.tutorMissed ? 'font-semibold text-amber-700' : ''}>{r.tutorMissed}</span></td></tr>)}
        </Fragment>)}</tbody></table>}
      {tab === 'tutor' && <div className="mt-4">{q.data.unanswered.length === 0 ? <p className="text-[14px] text-neutral-500">Chưa có câu nào.</p> : <>
        <p className="text-[14px] text-neutral-600">Câu người học hỏi mà khóa chưa có nội dung. Đây là dấu hiệu khóa đang thiếu; bổ sung nội dung rồi đánh dấu đã xử lý.</p>
        {q.data.unanswered.map((x) => <div key={x.id} className="mt-2 flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-[14px]"><MessageSquareWarning size={16} className="shrink-0 text-amber-600" /><div className="flex-1"><div className="font-medium">"{x.question}"</div><div className="text-[12px] text-neutral-500">{x.title} · {x.by} · {fmtDate(x.at)}</div></div><button onClick={() => nav(`/edit/${x.artifactId}`)} className="btn-line btn-sm">Bổ sung nội dung</button><button onClick={() => resolve(x.id)} className="btn-ghost h-8 text-[13px]"><Check size={14} />Đã xử lý</button></div>)}
      </>}</div>}
      {tab === 'hard' && <div className="mt-4">{q.data.hardQuestions.length === 0 ? <p className="text-[14px] text-neutral-500">Chưa có câu nào bị sai bất thường (cần ít nhất 3 lượt làm).</p> : <>
        <p className="text-[14px] text-neutral-600">Câu có từ 60% lượt làm sai trở lên. Có thể câu hỏi sai hoặc mơ hồ, nên chuyên gia xem lại.</p>
        {q.data.hardQuestions.map((x, i) => <div key={i} className="mt-2 flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-[14px]"><AlertTriangle size={16} className="shrink-0 text-red-500" /><div className="flex-1"><div className="font-medium">{x.q}</div><div className="text-[12px] text-neutral-500">{x.title} · sai {x.wrong}/{x.n} lượt</div></div><button onClick={() => nav(`/edit/${x.artifactId}?l=quiz`)} className="btn-line btn-sm">Xem câu hỏi</button></div>)}
      </>}</div>}
    </Page>
  )
}

/* ---------- Chấm bài ---------- */
const STATUS = { grading: [Hourglass, 'Chờ chấm', 'text-amber-700'], passed: [CheckCircle2, 'Đạt', 'text-emerald-700'], failed: [X, 'Chưa đạt', 'text-red-600'] }
const FLAG = { tab: 'Chuyển sang tab khác', blur: 'Rời cửa sổ bài thi', paste: 'Dán nội dung từ ngoài vào' }

function GradeDetail({ id, onDone }) {
  const { say } = useStore()
  const q = useQuery({ queryKey: ['grade', id], queryFn: () => get(`/grading/${id}`) })
  const [scores, setScores] = useState({})
  const [flags, setFlags] = useState({})
  const [rub, setRub] = useState({})
  const [busy, setBusy] = useState(false)
  const a = q.data
  const passScore = 80
  const finalOf = (qid) => scores[qid] ?? a.grades[qid]?.final ?? a.grades[qid]?.score ?? 0
  const total = useMemo(() => (a ? Math.round((100 * a.questions.reduce((s, x) => s + finalOf(x.id), 0)) / Math.max(1, a.questions.length)) : 0), [a, scores]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <div className="grid flex-1 place-items-center"><Spinner /></div>
  const grading = a.status === 'grading'
  const openFlags = a.flags.filter((f, i) => (flags[i] ?? f.status) === 'open').length
  const confirm = async () => {
    setBusy(true)
    try { const r = await post(`/grading/${id}/confirm`, { scores, flags }); say(r.status === 'passed' ? `Đã xác nhận: đạt ${Math.round(r.score)}%${r.skill?.to > r.skill?.from ? ` · nâng mức kỹ năng lên ${r.skill.to}` : ''}` : `Đã xác nhận: chưa đạt ${Math.round(r.score)}%`); onDone() } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  const ans = (x) => a.answers[x.id]
  return (
    <div className="scroll-thin flex-1 overflow-y-auto px-10 py-8">
      <div className="flex items-start">
        <div><div className="text-[13px] text-neutral-500">{a.mode === 'official' ? 'Thi chính thức' : 'Luyện tập'} · {a.artifactTitle} · nộp {fmtDate(a.submittedAt)}</div><h2 className="mt-1 text-[26px] font-semibold">{a.who?.name}</h2><div className="text-[13px] text-neutral-500">{a.who?.title}</div></div>
        <div className="flex-1" />
        <div className="text-right"><div className="text-[13px] text-neutral-500">{grading ? 'Điểm tạm' : 'Điểm'}</div><div className={`font-display text-[34px] ${total >= passScore ? 'text-emerald-700' : 'text-red-600'}`}>{grading ? total : Math.round(a.score)}%</div></div>
      </div>
      {a.flags.length > 0 && (
        <div className="card mt-6 p-6">
          <div className="flex items-center gap-2 font-semibold"><ShieldCheck size={17} />Cờ giám sát ({a.flags.length})</div>
          <p className="mt-1 text-[13px] text-neutral-600">Hệ thống chỉ gắn cờ. Bạn xem bối cảnh rồi quyết định; không có cờ nào tự trừ điểm. Bản ghi tự xóa sau 30 ngày, trừ bài đang xem xét.</p>
          {a.flags.map((f, i) => { const st = flags[i] ?? f.status; return (
            <div key={i} className="mt-3 flex items-center gap-4 rounded-xl border border-line p-3 text-[14px]">
              <Flag size={16} className="text-amber-600" /><span className="w-16 font-mono text-[13px]">{String(Math.floor(f.at / 60)).padStart(2, '0')}:{String(f.at % 60).padStart(2, '0')}</span><span className="flex-1">{FLAG[f.kind] ?? f.kind}</span>
              <div className="flex rounded-lg bg-neutral-100 p-0.5">{[['ok', 'Không vi phạm'], ['violation', 'Vi phạm']].map(([v, l]) => <button key={v} disabled={!grading} onClick={() => setFlags({ ...flags, [i]: v })} className={`rounded-md px-3 py-1 text-[13px] ${st === v ? 'bg-white font-semibold shadow-card' : 'text-neutral-500'}`}>{l}</button>)}</div>
            </div>) })}
        </div>
      )}
      {a.questions.map((x, n) => { const g = a.grades[x.id] ?? {}; return (
        <div key={x.id} className="card mt-6 p-6">
          <div className="flex items-start gap-3"><span className="font-lato text-[18px] italic text-neutral-400">{String(n + 1).padStart(2, '0')}</span><div className="flex-1"><div className="text-[15px] font-medium">{x.q}</div><div className="mt-1 text-[12px] text-neutral-500">{{ match: 'Ghép cặp · chấm tự động từng cặp', order: 'Sắp thứ tự · chấm tự động từng vị trí', cat: 'Phân loại · chấm tự động từng mục', mc: 'Trắc nghiệm · code chấm', mr: 'Nhiều đáp án · code chấm', fill: 'Điền · code chấm', essay: 'Tự luận · AI chấm nháp, bạn xác nhận', code: 'Bài code · test case quyết định' }[x.type]}</div></div>
            <span className={`text-[14px] font-semibold ${finalOf(x.id) >= 1 ? 'text-emerald-700' : finalOf(x.id) > 0 ? 'text-amber-700' : 'text-red-600'}`}>{Math.round(finalOf(x.id) * 100)}%</span></div>
          {(x.type === 'mc' || x.type === 'mr') && <div className="mt-3 space-y-1.5">{x.choices.map((c, i) => { const picked = [].concat(ans(x) ?? []).map(Number).includes(i); return <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] ${c.ok ? 'bg-emerald-50' : picked ? 'bg-red-50' : ''}`}>{c.ok ? <Check size={14} className="text-emerald-600" /> : picked ? <X size={14} className="text-red-500" /> : <span className="w-[14px]" />}{c.t}{picked && <span className="ml-auto text-[12px] text-neutral-500">Người thi chọn</span>}</div> })}</div>}
          {x.type === 'match' && <div className="mt-3 space-y-1.5">{(x.pairs ?? []).map((p, i) => { const got = (ans(x) ?? {})[i]; return <div key={i} className={`grid grid-cols-[1fr_1fr] gap-3 rounded-lg px-3 py-2 text-[14px] ${got === p.r ? 'bg-emerald-50' : 'bg-red-50'}`}><span className="font-medium">{p.l}</span><span>{got ?? '(chưa ghép)'}{got !== p.r && <span className="text-neutral-500"> · đúng: {p.r}</span>}</span></div> })}</div>}
          {x.type === 'order' && <div className="mt-3 space-y-1.5">{(Array.isArray(ans(x)) ? ans(x) : x.opts ?? []).map((t, i) => <div key={i} className={`flex gap-3 rounded-lg px-3 py-2 text-[14px] ${x.items?.[i] === t ? 'bg-emerald-50' : 'bg-red-50'}`}><span className="w-5 font-semibold">{i + 1}</span><span className="flex-1">{t}</span>{x.items?.[i] !== t && <span className="text-neutral-500">đúng: {x.items?.[i]}</span>}</div>)}</div>}
          {x.type === 'cat' && <div className="mt-3 space-y-1.5">{(x.groups ?? []).flatMap((gr) => (gr.items ?? []).map((t) => { const got = (ans(x) ?? {})[t]; return <div key={t} className={`flex gap-3 rounded-lg px-3 py-2 text-[14px] ${got === gr.name ? 'bg-emerald-50' : 'bg-red-50'}`}><span className="flex-1">{t}</span><span>{got ?? '(chưa xếp)'}{got !== gr.name && <span className="text-neutral-500"> · đúng: {gr.name}</span>}</span></div> }))}</div>}
          {x.type === 'fill' && <div className="mt-3 text-[14px]">Trả lời: <b className="font-mono">{String(ans(x) ?? '(bỏ trống)')}</b> · Đáp án: <span className="font-mono">{x.answer}</span></div>}
          {x.type === 'essay' && <>
            <div className="mt-3 whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 font-serif text-[15px] leading-relaxed">{ans(x) || '(bỏ trống)'}</div>
            <div className="mt-4 text-[14px] font-semibold">Rubric · AI đề xuất, bạn xác nhận</div>
            {(x.rubric ?? []).map((c, i) => { const ai = g.ai?.criteria?.find((k) => k.index === i); const met = (rub[`${x.id}#${i}`] ?? ai?.met) === true; return (
              <div key={i} className="mt-2 flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-[14px]">
                <div className="flex-1">{c}{ai?.evidence && <div className="mt-1 text-[12px] text-sky-700">"{ai.evidence}"</div>}</div>
                <span className="text-[12px] text-neutral-500">AI: {ai?.met ? 'đạt' : 'chưa'}</span>
                <div className="flex rounded-lg bg-neutral-100 p-0.5">{[[true, 'Đạt'], [false, 'Chưa']].map(([v, l]) => <button key={l} disabled={!grading} onClick={() => { const next = { ...rub, [`${x.id}#${i}`]: v }; setRub(next); const met2 = (x.rubric ?? []).filter((_, j) => (next[`${x.id}#${j}`] ?? g.ai?.criteria?.find((k) => k.index === j)?.met) === true).length; setScores({ ...scores, [x.id]: met2 / Math.max(1, x.rubric.length) }) }} className={`rounded-md px-3 py-1 text-[13px] ${met === v ? 'bg-white font-semibold shadow-card' : 'text-neutral-500'}`}>{l}</button>)}</div>
              </div>) })}
            {g.ai?.comment && <p className="mt-2 text-[13px] text-neutral-600">Nhận xét AI: {g.ai.comment}</p>}
          </>}
          {x.type === 'code' && <>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-[#1e1e2e] p-4 font-mono text-[13px] text-[#e5e7eb]">{ans(x) || '(bỏ trống)'}</pre>
            <div className="mt-3 space-y-1">{(g.tests ?? []).map((t, i) => <div key={i} className="flex items-center gap-2 font-mono text-[13px]">{t.pass ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-red-500" />}{t.name}{t.error && <span className="text-red-600">· {t.error}</span>}{!t.pass && t.got && <span className="text-neutral-500">· ra {t.got}</span>}</div>)}</div>
            {g.ai?.comment && <p className="mt-2 flex gap-2 text-[13px] text-neutral-600"><Code2 size={14} className="mt-0.5 shrink-0" />Nhận xét chất lượng code (không tính điểm): {g.ai.comment}</p>}
          </>}
        </div>) })}
      {grading && <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t border-line bg-white py-4">
        <span className="flex-1 text-[14px] text-neutral-600">{openFlags ? `Còn ${openFlags} cờ giám sát chưa xử lý` : `Điểm sau khi xác nhận: ${total}%. Kết quả đạt chính thức sẽ cập nhật mức kỹ năng.`}</span>
        <button className="btn-dark" disabled={busy || openFlags > 0} onClick={confirm}>{busy ? <Spinner size={18} w={2} /> : 'Xác nhận kết quả'}</button>
      </div>}
    </div>
  )
}

export function Grading() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('grading')
  const list = useQuery({ queryKey: ['grading', status], queryFn: () => get(`/grading?status=${status}`) })
  const [sel, setSel] = useState(null)
  const cur = sel ?? list.data?.[0]?.id
  return (
    <div className="flex h-full">
      <aside className="scroll-thin w-[360px] shrink-0 overflow-y-auto border-r border-line">
        <div className="px-6 pt-6"><h1 className="text-[28px] font-semibold">Chấm bài</h1><p className="mt-1 text-[14px] text-neutral-600">Tự luận AI chấm nháp và bài có cờ giám sát chờ bạn xác nhận.</p></div>
        <div className="mx-6 mt-4 flex rounded-lg bg-neutral-100 p-1 text-[13px]">{[['grading', 'Chờ chấm'], ['all', 'Tất cả']].map(([k, l]) => <button key={k} onClick={() => { setStatus(k); setSel(null) }} className={`flex-1 rounded-md py-1.5 ${status === k ? 'bg-white font-semibold shadow-card' : 'text-neutral-600'}`}>{l}</button>)}</div>
        <div className="mt-3">
          {list.isLoading && <div className="p-6"><Spinner /></div>}
          {list.data?.length === 0 && <p className="px-6 py-4 text-[14px] text-neutral-500">Không có bài nào.</p>}
          {list.data?.map((x) => { const [I, l, c] = STATUS[x.status] ?? STATUS.grading; return (
            <button key={x.id} onClick={() => setSel(x.id)} className={`flex w-full items-center gap-3 border-t border-line px-6 py-4 text-left ${cur === x.id ? 'bg-navsel' : 'hover:bg-neutral-50'}`}>
              <Avatar text={x.who.split(' ').pop()[0]} size={36} color="#64748b" />
              <div className="min-w-0 flex-1"><div className="text-[15px] font-semibold">{x.who}</div><div className="truncate text-[12px] text-neutral-500">{x.title} · {fmtDate(x.submittedAt)}</div></div>
              <span className={`flex items-center gap-1 text-[12px] font-semibold ${c}`}>{x.openFlags > 0 && <Flag size={12} />}<I size={13} />{l}</span>
            </button>) })}
        </div>
      </aside>
      {cur ? <GradeDetail key={cur} id={cur} onDone={() => { qc.invalidateQueries({ queryKey: ['grading'] }); qc.invalidateQueries({ queryKey: ['grade', cur] }); qc.invalidateQueries({ queryKey: ['grading-count'] }) }} /> : <div className="grid flex-1 place-items-center text-[15px] text-neutral-500">Chọn một bài để chấm</div>}
    </div>
  )
}

/* ---------- Cài đặt ---------- */
const FEATURE = { kit_details: 'Soạn chi tiết khóa học', outline_qr: 'Dàn ý tài liệu nhanh', outline_deck: 'Dàn ý slide', outline_video: 'Dàn ý video', outline_scenario: 'Dàn ý tình huống', gen_qr: 'Soạn tài liệu nhanh', gen_deck: 'Soạn slide', gen_video: 'Kịch bản video', gen_scenario: 'Soạn tình huống', tutor: 'AI Tutor', embed: 'Lập chỉ mục tìm kiếm', grade_essay: 'Chấm nháp tự luận', review_code: 'Nhận xét code', gen_questions: 'Sinh câu hỏi', ai_edit: 'Sửa bằng AI', ai_block: 'Tạo khối bằng AI', tts: 'Giọng đọc AI', advisor: 'Trợ lý giám đốc', plan_item: 'Thêm tài liệu', kpi_skills: 'Gợi ý kỹ năng cho KPI', assess: 'Đánh giá năng lực' }

export function SettingsPage() {
  const { me } = useMe()
  const { say } = useStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('profile')
  const ai = useQuery({ queryKey: ['ai-settings'], queryFn: () => get('/settings/ai'), enabled: tab === 'ai' })
  const log = useQuery({ queryKey: ['audit'], queryFn: () => get('/audit'), enabled: tab === 'audit' })
  const [quota, setQuota] = useState('')
  const saveQuota = async () => { try { await patch('/settings/ai', { quota: Number(quota) }); qc.invalidateQueries({ queryKey: ['ai-settings'] }); say('Đã cập nhật hạn mức'); setQuota('') } catch (e) { say(e.message) } }
  const pct = ai.data ? Math.min(100, Math.round((100 * ai.data.used) / ai.data.quota)) : 0
  return (
    <Page title="Cài đặt">
      <Tabs value={tab} onChange={setTab} items={[['profile', 'Hồ sơ'], ['ai', 'Hạn mức AI'], ['audit', 'Nhật ký']]} />
      {tab === 'profile' && <div className="mt-6 max-w-[520px] space-y-3 text-[15px]">{[['Họ tên', me.name], ['Email', me.email], ['Chức danh', me.title], ['Tổ chức', me.orgName], ['Vai trò', me.role === 'author' ? 'Người tạo khóa học' : 'Người học']].map(([k, v]) => <div key={k} className="flex border-b border-line py-3"><span className="w-40 text-neutral-500">{k}</span><span className="font-medium">{v}</span></div>)}</div>}
      {tab === 'ai' && (ai.isLoading ? <div className="mt-6"><Spinner /></div> : <div className="mt-6 max-w-[720px]">
        <div className="card p-6"><div className="flex items-end"><div className="flex-1"><div className="text-[13px] text-neutral-500">Đã dùng tháng này</div><div className="font-display text-[30px] font-semibold">{ai.data.used.toLocaleString('vi-VN')} <span className="text-[16px] font-normal text-neutral-500">/ {ai.data.quota.toLocaleString('vi-VN')} token</span></div></div><span className="text-[14px] font-semibold">{pct}%</span></div>
          <div className="mt-3 h-2 rounded-full bg-neutral-100"><div className={`h-2 rounded-full ${pct > 90 ? 'bg-red-500' : 'bg-ink'}`} style={{ width: `${pct}%` }} /></div>
          <div className="mt-4 flex items-center gap-2 text-[14px]">Đổi hạn mức tháng<input type="number" className="field w-40 py-1.5" placeholder={String(ai.data.quota)} value={quota} onChange={(e) => setQuota(e.target.value)} /><button className="btn-line btn-sm" disabled={!quota} onClick={saveQuota}>Lưu</button></div>
          <p className="mt-2 text-[12px] text-neutral-500">Hết hạn mức thì các tính năng AI tạm dừng tới tháng sau. Dữ liệu gửi tới dịch vụ AI không được dùng để huấn luyện mô hình.</p>
        </div>
        <table className="mt-6 w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] text-neutral-500"><th className="py-2 font-medium">Tính năng</th><th className="font-medium">Số lần gọi</th><th className="font-medium">Token</th></tr></thead>
          <tbody>{[...ai.data.byFeature].sort((a, b) => b.tokens - a.tokens).map((f) => <tr key={f.feature} className="border-b border-line"><td className="py-2.5">{FEATURE[f.feature] ?? f.feature}</td><td>{f.calls}</td><td>{f.tokens.toLocaleString('vi-VN')}</td></tr>)}</tbody></table>
      </div>)}
      {tab === 'audit' && <div className="mt-6">{log.isLoading ? <Spinner /> : <table className="w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] text-neutral-500"><th className="py-2 font-medium">Lúc</th><th className="font-medium">Ai</th><th className="font-medium">Hành động</th><th className="font-medium">Chi tiết</th></tr></thead>
        <tbody>{log.data?.map((x) => <tr key={x.id} className="border-b border-line"><td className="py-2.5 text-neutral-500">{fmtDate(x.at)}</td><td>{x.who}</td><td className="font-mono text-[13px]">{x.action}</td><td className="max-w-[420px] truncate text-[13px] text-neutral-600">{JSON.stringify(x.meta)}</td></tr>)}</tbody></table>}</div>}
    </Page>
  )
}
