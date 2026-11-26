// Xuất khóa học: xuất bản cả khóa, gói SCORM 1.2, đề kiểm tra kèm đáp án (QTI 2.1); tạo đề kiểm tra riêng.
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, AlertTriangle, Sparkles, PackageOpen, Download } from 'lucide-react'
import { useStore } from '../store'
import { FORMATS, LEVELS } from '../data'
import { Modal, Spinner, FormatGlyph } from '../ui'
import { get, post } from '../api'

export function KitExportModal({ open, onClose, kit, onChanged }) {
  const { say } = useStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('publish')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [result, setResult] = useState(null)
  const st = useQuery({ queryKey: ['kit-publish', kit.id], queryFn: () => get(`/kits/${kit.id}/publish-status`), enabled: open })
  const items = st.data?.items ?? []
  const pub = items.filter((x) => x.publishedVersion)
  const ready = items.filter((x) => x.status !== 'generating' && !x.issues.blocking.length && x.changed)
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
    <Modal open={open} onClose={onClose} w={860} pad={false} title="Xuất khóa học">
      <div className="mx-6 flex items-center gap-2 border-b border-line pb-3 text-[13px]"><b>{kit.title}</b><span className="h-3 w-px bg-line" />{items.length} tài liệu · {pub.length} đã xuất bản</div>
      <div className="grid grid-cols-[190px_1fr] gap-6 px-6 py-4">
        <div className="space-y-1">
          {[['publish', 'Xuất bản cả khóa', Check], ['scorm', 'Gói SCORM và đề QTI', PackageOpen]].map(([k, l, I]) => (
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
          {tab === 'scorm' && <ScormExport kit={kit} />}
        </div>
      </div>
    </Modal>
  )
}

/** Xuất SCORM 1.2: xem trước phần nào vào gói, tải gói về để đưa lên LMS khác */
function ScormExport({ kit }) {
  const info = useQuery({ queryKey: ['scorm-info', kit.id], queryFn: () => get(`/kits/${kit.id}/export/scorm/info`) })
  if (info.isLoading) return <Spinner size={20} w={2} />
  const inc = info.data?.included ?? [], exc = info.data?.excluded ?? []
  return (<>
    <p className="text-[14px]">Gói SCORM 1.2 đưa được lên LMS khác của công ty (Moodle, SAP SuccessFactors, Cornerstone, Docebo…). Gói dùng bản đã xuất bản, cùng giao diện học; LMS ghi nhận hoàn thành, điểm bài luyện tập và tiến độ học dở.</p>
    <div className="mt-3 rounded-xl border border-line">
      <div className="border-b border-line px-4 py-2 text-[13px] font-semibold text-neutral-500">Có trong gói ({inc.length})</div>
      {inc.map((x) => <div key={x.id} className="flex items-center gap-2 border-b border-line px-4 py-2 text-[14px] last:border-0"><FormatGlyph type={x.type} size={15} /><span className="w-28 shrink-0 text-neutral-500">{FORMATS[x.type].name}</span><span className="flex-1 truncate">{x.title}</span><Check size={15} className="text-emerald-600" /></div>)}
      {!inc.length && <div className="px-4 py-3 text-[14px] text-neutral-500">Chưa có tài liệu nào đã xuất bản.</div>}
    </div>
    {exc.length > 0 && <div className="mt-3 rounded-xl bg-neutral-50 px-4 py-3 text-[13px] text-neutral-600"><div className="mb-1 font-semibold">Không đưa vào gói</div>{exc.map((x) => <div key={x.id}>{x.title}: {x.reason}</div>)}</div>}
    <p className="mt-3 text-[12px] text-neutral-500">Đề kiểm tra chính thức không vào gói SCORM để giữ bảo mật đề. Muốn LMS công ty tự quản lý và chấm đề, tải riêng đề kèm đáp án ở mục dưới.</p>
    {import.meta.env.DEV && <p className="mt-2 text-[12px] text-neutral-500">Thử ngay: tải gói rồi nhập vào <a className="font-semibold text-ink underline" href={`${location.protocol}//${location.hostname}:5196`} target="_blank" rel="noopener noreferrer">LMS công ty (demo)</a> để xem LMS khác nhận gói, chạy và ghi kết quả thế nào.</p>}
    <div className="mt-4 flex justify-end border-t border-line pt-4"><a href={inc.length ? `/api/kits/${kit.id}/export/scorm` : undefined} aria-disabled={!inc.length} className={`btn-dark ${inc.length ? '' : 'pointer-events-none opacity-40'}`}><Download size={16} />Tải gói SCORM (.zip)</a></div>
    {info.data?.exams?.length > 0 && <ExamExport kit={kit} exams={info.data.exams} />}
  </>)
}

/** Đề kiểm tra kèm đáp án và tiêu chí chấm (QTI 2.1 + exam.json): LMS công ty tự quản lý, tự chấm, kể cả bằng AI của họ */
function ExamExport({ kit, exams }) {
  const [ok, setOk] = useState(false)
  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="text-[15px] font-semibold">Đề kiểm tra cho LMS công ty tự chấm</div>
      <p className="mt-1 text-[14px] text-neutral-600">Gói đề chuẩn IMS QTI 2.1 (Canvas, Blackboard, D2L, Moodle qua plugin nhập được) kèm <b>đáp án</b>, cách tính điểm từng dạng câu, <b>tiêu chí chấm tự luận</b>, test case bài code và lời nhắc mẫu để AI của LMS công ty chấm nháp theo tiêu chí. Chỉ câu đã duyệt.</p>
      <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><div>Gói có đáp án: chỉ gửi cho người quản trị LMS công ty, không gửi người thi. LMS công ty tự tổ chức thi và chấm. Mỗi lần tải được ghi nhật ký.</div></div>
      <label className="mt-3 flex items-center gap-2 text-[14px]"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />Tôi hiểu gói có đáp án và sẽ chỉ gửi cho người quản trị</label>
      <div className="mt-3 rounded-xl border border-line">
        {exams.map((e) => (
          <div key={e.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-[14px] last:border-0">
            <FormatGlyph type="exam" size={15} />
            <div className="min-w-0 flex-1"><div className="truncate">{e.title}</div><div className="text-[12px] text-neutral-500">{e.questions} câu đã duyệt{e.manual ? ` · ${e.manual} câu tự luận/code chấm theo tiêu chí` : ''}</div></div>
            <a href={ok && e.questions ? `/api/kits/${kit.id}/export/exam/${e.id}` : undefined} aria-disabled={!ok || !e.questions} className={`btn-line btn-sm ${ok && e.questions ? '' : 'pointer-events-none opacity-40'}`}><Download size={14} />Tải đề kèm đáp án</a>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Đề kiểm tra riêng: AI soạn ngân hàng câu theo mức, mỗi người thi một đề rút ngẫu nhiên */
export function ExamCreateModal({ open, onClose, kit, onCreated }) {
  const { say } = useStore()
  const top = Math.min(3, kit.level ?? 2)
  const [o, setO] = useState(() => ({ title: '', focus: '', levels: [...new Set([Math.max(1, top - 1), top])], perLevel: 5, pick: 8, mode: 'official', minutes: 30, passScore: 80, attempts: 2, proctor: false }))
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setO((x) => ({ ...x, [k]: v }))
  const total = o.levels.length * o.perLevel
  const run = async () => {
    setBusy(true)
    try { await post(`/kits/${kit.id}/exams`, { ...o, pick: Math.min(o.pick, total) }); say('AI đang soạn đề kiểm tra'); onCreated(); onClose() } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  const num = (k, l, u, min, max) => <label className="text-[14px]"><div className="mb-1 font-medium">{l}</div><div className="flex items-center gap-2"><input type="number" min={min} max={max} className="field py-1.5 text-right" value={o[k]} onChange={(e) => set(k, Math.max(min, Math.min(max, +e.target.value || min)))} /><span className="w-10 text-neutral-500">{u}</span></div></label>
  return (
    <Modal open={open} onClose={onClose} w={600} title="Tạo đề kiểm tra" sub="AI soạn ngân hàng câu hỏi theo mức từ tài liệu nguồn của khóa, mỗi câu gắn nguồn. Bạn duyệt từng câu rồi xuất đề kèm đáp án (QTI 2.1) cho LMS công ty; mỗi lượt thi rút ngẫu nhiên từ các câu đã duyệt."
      footer={<button className="btn-dark h-10" disabled={busy || !o.levels.length} onClick={run}>{busy ? <Spinner size={18} w={2} /> : <><Sparkles size={16} />Soạn {total} câu</>}</button>}>
      <div className="space-y-4 text-[14px]">
        <label className="block"><div className="mb-1 font-medium">Tên đề</div><input className="field py-2" value={o.title} maxLength={200} onChange={(e) => set('title', e.target.value)} placeholder={`Đề kiểm tra: ${kit.title}`} /></label>
        <div><div className="mb-1 font-medium">Mức câu hỏi</div><div className="flex flex-wrap gap-2">{LEVELS.filter((l) => l.v <= 3).map((l) => { const on = o.levels.includes(l.v); return <button key={l.v} onClick={() => set('levels', on ? o.levels.filter((x) => x !== l.v) : [...o.levels, l.v].sort())} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-left ${on ? 'border-ink bg-ink text-white' : 'border-line hover:bg-neutral-50'}`}>{on && <Check size={14} />}<b>Mức {l.v}</b> <span className={`text-[12px] ${on ? 'text-white/70' : 'text-neutral-500'}`}>{l.kinds}</span></button> })}</div></div>
        <div className="grid grid-cols-3 gap-3">{num('perLevel', 'Câu mỗi mức', 'câu', 1, 10)}{num('pick', 'Câu mỗi đề', 'câu', 1, 50)}{num('minutes', 'Thời gian', 'phút', 5, 240)}{num('passScore', 'Điểm đạt', '%', 1, 100)}{num('attempts', 'Số lượt thi', 'lượt', 1, 10)}</div>
        <label className="block"><div className="mb-1 font-medium">Trọng tâm (tùy chọn)</div><input className="field py-2" value={o.focus} maxLength={500} onChange={(e) => set('focus', e.target.value)} placeholder="Ví dụ: chọn kiến trúc phù hợp cho từng tình huống" /></label>
      </div>
    </Modal>
  )
}
