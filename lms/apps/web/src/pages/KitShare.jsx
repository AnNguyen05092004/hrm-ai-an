// Chia sẻ cả khóa học (xuất bản hàng loạt, giao cả khóa, đường dẫn cả bộ) và tạo đề kiểm tra riêng.
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Link2, Users, Copy, AlertTriangle, Sparkles, ShieldCheck } from 'lucide-react'
import { useStore } from '../store'
import { FORMATS, LEVELS } from '../data'
import { Modal, Spinner, FormatGlyph, Toggle } from '../ui'
import { AssignForm, shareUrl } from './Common'
import { get, post } from '../api'

export function KitShareModal({ open, onClose, kit, onChanged }) {
  const { say } = useStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('publish')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [result, setResult] = useState(null)
  const st = useQuery({ queryKey: ['kit-share', kit.id], queryFn: () => get(`/kits/${kit.id}/share`), enabled: open })
  const items = st.data?.items ?? []
  const pub = items.filter((x) => x.publishedVersion)
  const ready = items.filter((x) => x.status !== 'generating' && !x.issues.blocking.length && x.changed)
  const slug = st.data?.shareSlug
  const refresh = () => { st.refetch(); qc.invalidateQueries({ queryKey: ['kits'] }); onChanged?.() }
  const act = async (fn) => { setBusy(true); try { await fn() } catch (e) { say(e.message) } finally { setBusy(false); refresh() } }
  const publishAll = () => act(async () => {
    const r = await post(`/kits/${kit.id}/publish-all`, { note })
    setResult(r)
    say(r.published.length ? `Đã xuất bản ${r.published.length} tài liệu` : 'Không có tài liệu nào cần xuất bản')
  })
  const state = (x) => x.status === 'generating' ? ['AI đang soạn', 'text-neutral-500']
    : x.issues.blocking.length ? ['Cần sửa', 'text-red-600']
      : !x.publishedVersion ? ['Sẵn sàng xuất bản', 'text-sky-700']
        : x.changed ? ['Có thay đổi chưa xuất bản', 'text-amber-700'] : ['Đã xuất bản, không đổi', 'text-emerald-700']
  return (
    <Modal open={open} onClose={onClose} w={860} pad={false} title="Chia sẻ cả khóa">
      <div className="mx-6 flex items-center gap-2 border-b border-line pb-3 text-[13px]"><b>{kit.title}</b><span className="h-3 w-px bg-line" />{items.length} tài liệu · {pub.length} đã xuất bản · {st.data?.learners ?? 0} người học</div>
      <div className="grid grid-cols-[170px_1fr] gap-6 px-6 py-4">
        <div className="space-y-1">
          {[['publish', 'Xuất bản cả khóa', Check], ['assign', 'Giao cả khóa', Users], ['link', 'Đường dẫn cả khóa', Link2]].map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] ${tab === k ? 'bg-navsel font-medium text-navtxt' : 'hover:bg-neutral-50'}`}><I size={15} />{l}</button>
          ))}
        </div>
        <div className="min-h-[340px] border-l border-line pl-6">
          {st.isLoading && <Spinner size={20} w={2} />}
          {tab === 'publish' && st.data && (<>
            <p className="text-[14px]">Xuất bản mọi tài liệu đã sẵn sàng trong một lần. Tài liệu không đổi được giữ nguyên phiên bản; tài liệu còn lỗi được bỏ qua và nêu lý do.</p>
            <div className="mt-3 divide-y divide-line rounded-xl border border-line">
              {items.map((x) => { const [t, c] = state(x); const skipped = result?.skipped.find((y) => y.id === x.id); return (
                <div key={x.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2 text-[14px]"><FormatGlyph type={x.type} size={15} /><span className="w-28 shrink-0 text-neutral-500">{FORMATS[x.type].name}</span><span className="flex-1 truncate font-medium">{x.title}</span><span className={`text-[13px] ${c}`}>{t}</span></div>
                  {(skipped?.reasons ?? x.issues.blocking).slice(0, 2).map((r) => <div key={r} className="ml-[140px] mt-1 flex gap-1.5 text-[12px] text-red-600"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{r}</div>)}
                </div>) })}
            </div>
            <label className="mb-1.5 mt-4 block text-[14px] font-medium">Ghi chú phiên bản</label>
            <input className="field py-2" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: Bản đầu tiên của khóa" />
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-line pt-4">
              <span className="text-[13px] text-neutral-500">{ready.length} tài liệu sẽ được xuất bản</span>
              <button className="btn-dark" disabled={busy || !ready.length} onClick={publishAll}>{busy ? <Spinner size={18} w={2} /> : `Xuất bản ${ready.length} tài liệu`}</button>
            </div>
          </>)}
          {tab === 'assign' && st.data && (pub.length
            ? <AssignForm assigned={new Set(st.data.fullyAssigned)} onDone={() => setTab('publish')}
              intro={`Giao cả khóa: người được chọn nhận ${pub.length} tài liệu đã xuất bản, thấy chung một khóa trong "Khóa học của tôi". Tài liệu xuất bản sau cần giao thêm.`}
              onSubmit={async (b) => { const r = await post(`/kits/${kit.id}/assign`, b); refresh(); return `Đã giao ${r.artifacts} tài liệu cho ${r.users} người` }} />
            : <p className="text-[14px] text-neutral-600">Xuất bản ít nhất một tài liệu trước khi giao cả khóa.</p>)}
          {tab === 'link' && st.data && (<>
            <p className="text-[14px]">Một đường dẫn cho cả khóa. Ai trong công ty đã đăng nhập mở được mọi tài liệu đã xuất bản của khóa; tiến độ và kết quả ghi theo tài khoản.</p>
            <div className={`mt-3 flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-[14px] ${slug ? 'bg-white' : 'bg-neutral-50 text-neutral-500'}`}>
              <Link2 size={16} />{slug ? <span className="flex-1 truncate font-medium text-ink">{shareUrl(slug, 'k')}</span> : <span className="flex-1">{pub.length ? 'Chưa có đường dẫn' : 'Xuất bản tài liệu trước khi tạo đường dẫn'}</span>}
              {slug && <button onClick={() => { navigator.clipboard?.writeText(shareUrl(slug, 'k')); say('Đã sao chép đường dẫn') }} className="flex items-center gap-1 font-medium text-ink"><Copy size={14} />Sao chép</button>}
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
              {slug ? <button className="btn-line" disabled={busy} onClick={() => act(async () => { await post(`/kits/${kit.id}/share`, { on: false }); say('Đã tắt đường dẫn') })}>Tắt đường dẫn</button>
                : <button className="btn-dark" disabled={busy || !pub.length} onClick={() => act(async () => { await post(`/kits/${kit.id}/share`, { on: true }); say('Đã tạo đường dẫn cho cả khóa') })}><Link2 size={16} />Tạo đường dẫn</button>}
            </div>
          </>)}
        </div>
      </div>
    </Modal>
  )
}

/** Đề kiểm tra riêng: AI soạn ngân hàng câu theo mức, mỗi người thi một đề rút ngẫu nhiên */
export function ExamCreateModal({ open, onClose, kit, onCreated }) {
  const { say } = useStore()
  const top = Math.min(3, kit.level ?? 2)
  const [o, setO] = useState(() => ({ title: '', focus: '', levels: [...new Set([Math.max(1, top - 1), top])], perLevel: 5, pick: 8, mode: 'official', minutes: 30, passScore: 80, attempts: 2, proctor: true }))
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setO((x) => ({ ...x, [k]: v }))
  const total = o.levels.length * o.perLevel
  const run = async () => {
    setBusy(true)
    try { await post(`/kits/${kit.id}/exams`, { ...o, pick: Math.min(o.pick, total) }); say('AI đang soạn đề kiểm tra'); onCreated(); onClose() } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  const num = (k, l, u, min, max) => <label className="text-[14px]"><div className="mb-1 font-medium">{l}</div><div className="flex items-center gap-2"><input type="number" min={min} max={max} className="field py-1.5 text-right" value={o[k]} onChange={(e) => set(k, Math.max(min, Math.min(max, +e.target.value || min)))} /><span className="w-10 text-neutral-500">{u}</span></div></label>
  return (
    <Modal open={open} onClose={onClose} w={600} title="Tạo đề kiểm tra" sub="AI soạn ngân hàng câu hỏi theo mức từ tài liệu nguồn của khóa, mỗi câu gắn nguồn. Bạn duyệt từng câu; mỗi người thi nhận một đề riêng rút ngẫu nhiên từ các câu đã duyệt."
      footer={<button className="btn-dark h-10" disabled={busy || !o.levels.length} onClick={run}>{busy ? <Spinner size={18} w={2} /> : <><Sparkles size={16} />Soạn {total} câu</>}</button>}>
      <div className="space-y-4 text-[14px]">
        <label className="block"><div className="mb-1 font-medium">Tên đề</div><input className="field py-2" value={o.title} maxLength={200} onChange={(e) => set('title', e.target.value)} placeholder={`Đề kiểm tra: ${kit.title}`} /></label>
        <div><div className="mb-1 font-medium">Mức câu hỏi</div><div className="flex flex-wrap gap-2">{LEVELS.filter((l) => l.v <= 3).map((l) => { const on = o.levels.includes(l.v); return <button key={l.v} onClick={() => set('levels', on ? o.levels.filter((x) => x !== l.v) : [...o.levels, l.v].sort())} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-left ${on ? 'border-ink bg-ink text-white' : 'border-line hover:bg-neutral-50'}`}>{on && <Check size={14} />}<b>Mức {l.v}</b> <span className={`text-[12px] ${on ? 'text-white/70' : 'text-neutral-500'}`}>{l.kinds}</span></button> })}</div></div>
        <div className="grid grid-cols-3 gap-3">{num('perLevel', 'Câu mỗi mức', 'câu', 1, 10)}{num('pick', 'Câu mỗi đề', 'câu', 1, 50)}{num('minutes', 'Thời gian', 'phút', 5, 240)}{num('passScore', 'Điểm đạt', '%', 1, 100)}{num('attempts', 'Số lượt thi', 'lượt', 1, 10)}</div>
        <label className="block"><div className="mb-1 font-medium">Trọng tâm (tùy chọn)</div><input className="field py-2" value={o.focus} maxLength={500} onChange={(e) => set('focus', e.target.value)} placeholder="Ví dụ: chọn kiến trúc phù hợp cho từng tình huống" /></label>
        <div className="flex items-center gap-4 rounded-xl border border-line px-4 py-3"><div className="flex-1"><div className="font-semibold">Loại bài</div><div className="text-[13px] text-neutral-600">Thi chính thức đạt thì cập nhật mức kỹ năng của người học</div></div>
          <div className="flex rounded-lg bg-neutral-100 p-1">{[['practice', 'Luyện tập'], ['official', 'Thi chính thức']].map(([k, l]) => <button key={k} onClick={() => set('mode', k)} className={`rounded-md px-3 py-1.5 ${o.mode === k ? 'bg-white font-semibold shadow-card' : 'text-neutral-600'}`}>{l}</button>)}</div></div>
        <div className="flex items-center gap-4 rounded-xl border border-line px-4 py-3"><ShieldCheck size={18} /><div className="flex-1"><div className="font-semibold">Giám sát khi thi</div><div className="text-[13px] text-neutral-600">Người thi đồng ý trước; gắn cờ khi chuyển tab, rời cửa sổ, dán từ ngoài</div></div><Toggle on={o.mode === 'official' && o.proctor} disabled={o.mode !== 'official'} onChange={(v) => set('proctor', v)} /></div>
      </div>
    </Modal>
  )
}
