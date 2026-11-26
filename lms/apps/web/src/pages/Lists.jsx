import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, FileText, Box, Upload, Trash2, RefreshCw } from 'lucide-react'
import { useStore, useMe } from '../store'
import { ROLE_LABEL } from './Users'
import { ReviewBadge } from './Review'
import { Thumb, FormatGlyph, Status, Spinner, Modal } from '../ui'
import { TopOrg } from '../Shell'
import { api, get, patch, del } from '../api'

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
          <div className="p-4"><div className="flex items-center gap-1.5 text-[13px] font-medium"><Box size={14} className="text-emerald-600" />Khóa học · {k.stage === 'ready' ? `${k.artifacts.length} tài liệu` : 'đang soạn'}</div><div className="mt-1.5 text-[16px] font-semibold">{k.title}</div><div className="mt-1 text-[13px] text-neutral-500">Cập nhật {k.updated}{k.createdBy ? ` · ${k.createdBy}` : ''}</div>{k.stage === 'ready' && <div className="mt-2"><ReviewBadge review={k.review} /></div>}</div>
        </button>))}</div>}
      {tab === 'arts' && <table className="mt-5 w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] text-neutral-500"><th className="py-2 font-medium">Tài liệu</th><th className="font-medium">Bộ</th><th className="font-medium">Trạng thái</th><th className="font-medium">Cập nhật</th></tr></thead>
        <tbody>{arts.map((a) => <tr key={a.id} onClick={() => nav(`/edit/${a.id}`)} className="cursor-pointer border-b border-line hover:bg-neutral-50"><td className="py-3"><span className="flex items-center gap-2 font-medium"><FormatGlyph type={a.type} size={15} />{a.title}</span></td><td className="text-neutral-600">{a.kit.title}</td><td><Status s={a.status} /></td><td className="text-neutral-500">{a.updated}</td></tr>)}</tbody></table>}
      {tab === 'sources' && <Sources />}
    </Page>
  )
}

/* ---------- Phân tích ---------- */

/* ---------- Cài đặt ---------- */
const FEATURE = { kit_details: 'Soạn chi tiết khóa học', outline_qr: 'Dàn ý tài liệu nhanh', outline_deck: 'Dàn ý slide', outline_video: 'Dàn ý video', outline_scenario: 'Dàn ý tình huống', gen_qr: 'Soạn tài liệu nhanh', gen_deck: 'Soạn slide', gen_video: 'Kịch bản video', gen_scenario: 'Soạn tình huống', embed: 'Lập chỉ mục tìm kiếm', gen_questions: 'Sinh câu hỏi', ai_edit: 'Sửa bằng AI', ai_block: 'Tạo khối bằng AI', tts: 'Giọng đọc AI', image: 'AI tạo ảnh', plan_item: 'Thêm tài liệu' }

const ACTION = {
  'kit.create': 'Tạo khóa học', 'kit.generate': 'AI soạn khóa học', 'kit.delete': 'Xóa khóa học', 'kit.publish_all': 'Xuất bản cả khóa',
  'kit.export_scorm': 'Xuất gói SCORM', 'kit.export_exam': 'Tải đề kèm đáp án (QTI)', 'exam.create': 'Tạo đề kiểm tra',
  'artifact.publish': 'Xuất bản tài liệu', 'artifact.unpublish': 'Ngừng xuất bản', 'artifact.delete': 'Xóa tài liệu',
  'review.invite': 'Mời review', 'review.remove': 'Bỏ người review', 'review.request_again': 'Gửi lại review', 'review.decision': 'Kết luận review',
  'user.create': 'Tạo tài khoản', 'user.update': 'Sửa tài khoản', 'user.reset_password': 'Đặt lại mật khẩu',
  'image.upload': 'Tải ảnh lên', 'image.generate': 'AI tạo ảnh', 'settings.ai_quota': 'Đổi hạn mức AI',
}
const REVIEW_STATUS = { approved: 'Duyệt', changes: 'Cần sửa' }
const META = { version: 'phiên bản', artifacts: 'số tài liệu', published: 'đã xuất bản', skipped: 'bỏ qua', size: 'dung lượng (byte)', status: 'kết luận', round: 'vòng', title: 'tên', quota: 'hạn mức', invited: 'đã mời', reviewers: 'số người review', role: 'vai', active: 'đang hoạt động' }
const metaValue = (k, v) => (k === 'role' ? ROLE_LABEL[v] ?? v : k === 'status' ? REVIEW_STATUS[v] ?? v : v === true ? 'có' : v === false ? 'không' : v)

export function SettingsPage() {
  const { me } = useMe()
  const { say } = useStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('profile')
  const admin = me.role === 'admin'
  const ai = useQuery({ queryKey: ['ai-settings'], queryFn: () => get('/settings/ai'), enabled: tab === 'ai' })
  const log = useQuery({ queryKey: ['audit'], queryFn: () => get('/audit'), enabled: tab === 'audit' && admin })
  const [quota, setQuota] = useState('')
  const saveQuota = async () => { try { await patch('/settings/ai', { quota: Number(quota) }); qc.invalidateQueries({ queryKey: ['ai-settings'] }); say('Đã cập nhật hạn mức'); setQuota('') } catch (e) { say(e.message) } }
  const pct = ai.data ? Math.min(100, Math.round((100 * ai.data.used) / ai.data.quota)) : 0
  return (
    <Page title="Cài đặt">
      <Tabs value={tab} onChange={setTab} items={[['profile', 'Hồ sơ'], ...(me.role !== 'reviewer' ? [['ai', 'Hạn mức AI']] : []), ...(admin ? [['audit', 'Nhật ký']] : [])]} />
      {tab === 'profile' && <div className="mt-6 max-w-[520px] space-y-3 text-[15px]">{[['Họ tên', me.name], ['Email', me.email], ['Chức danh', me.title], ['Tổ chức', me.orgName], ['Vai trò', ROLE_LABEL[me.role]]].map(([k, v]) => <div key={k} className="flex border-b border-line py-3"><span className="w-40 text-neutral-500">{k}</span><span className="font-medium">{v}</span></div>)}</div>}
      {tab === 'ai' && (ai.isLoading ? <div className="mt-6"><Spinner /></div> : <div className="mt-6 max-w-[720px]">
        <div className="card p-6"><div className="flex items-end"><div className="flex-1"><div className="text-[13px] text-neutral-500">Đã dùng tháng này</div><div className="font-display text-[30px] font-semibold">{ai.data.used.toLocaleString('vi-VN')} <span className="text-[16px] font-normal text-neutral-500">/ {ai.data.quota.toLocaleString('vi-VN')} token</span></div></div><span className="text-[14px] font-semibold">{pct}%</span></div>
          <div className="mt-3 h-2 rounded-full bg-neutral-100"><div className={`h-2 rounded-full ${pct > 90 ? 'bg-red-500' : 'bg-ink'}`} style={{ width: `${pct}%` }} /></div>
          {admin && <div className="mt-4 flex items-center gap-2 text-[14px]">Đổi hạn mức tháng<input type="number" className="field w-40 py-1.5" placeholder={String(ai.data.quota)} value={quota} onChange={(e) => setQuota(e.target.value)} /><button className="btn-line btn-sm" disabled={!quota} onClick={saveQuota}>Lưu</button></div>}
          <p className="mt-2 text-[12px] text-neutral-500">Hết hạn mức thì các tính năng AI tạm dừng tới tháng sau. Dữ liệu gửi tới dịch vụ AI không được dùng để huấn luyện mô hình.</p>
        </div>
        <table className="mt-6 w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] text-neutral-500"><th className="py-2 font-medium">Tính năng</th><th className="font-medium">Số lần gọi</th><th className="font-medium">Token</th></tr></thead>
          <tbody>{[...ai.data.byFeature].sort((a, b) => b.tokens - a.tokens).map((f) => <tr key={f.feature} className="border-b border-line"><td className="py-2.5">{FEATURE[f.feature] ?? f.feature}</td><td>{f.calls}</td><td>{f.tokens.toLocaleString('vi-VN')}</td></tr>)}</tbody></table>
      </div>)}
      {tab === 'audit' && <div className="mt-6">{log.isLoading ? <Spinner /> : <table className="w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] text-neutral-500"><th className="py-2 font-medium">Lúc</th><th className="font-medium">Ai</th><th className="font-medium">Hành động</th><th className="font-medium">Chi tiết</th></tr></thead>
        <tbody>{log.data?.map((x) => <tr key={x.id} className="border-b border-line"><td className="py-2.5 text-neutral-500">{fmtDate(x.at)}</td><td>{x.who}</td><td title={x.action}>{ACTION[x.action] ?? x.action}</td><td className="max-w-[420px] truncate text-[13px] text-neutral-600">{Object.entries(x.meta ?? {}).filter(([, v]) => v !== null && v !== '' && typeof v !== 'object').map(([k, v]) => `${META[k] ?? k}: ${metaValue(k, v)}`).join(' · ')}</td></tr>)}</tbody></table>}</div>}
    </Page>
  )
}
