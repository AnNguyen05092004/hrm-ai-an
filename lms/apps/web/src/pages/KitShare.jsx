// Xuất khóa học: xuất bản cả khóa, gói SCORM 1.2, đề kiểm tra kèm đáp án (QTI 2.1); tạo đề kiểm tra riêng.
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, AlertTriangle, Sparkles, PackageOpen, Download, Send, RotateCcw, Clock } from 'lucide-react'
import { useStore } from '../store'
import { FORMATS, DEFAULT_MATRIX } from '../data'
import { Modal, Spinner, FormatGlyph } from '../ui'
import { MatrixEditor, matrixOk } from './QuizSheet'
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
          {[['publish', 'Xuất bản cả khóa', Check], ['scorm', 'Tải gói SCORM, đề QTI', PackageOpen], ['lms', 'Gửi sang LMS công ty', Send]].map(([k, l, I]) => (
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
          {tab === 'lms' && <LmsSend kit={kit} />}
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

const SEND_ST = {
  queued: ['Đang chờ gửi', 'bg-neutral-100 text-neutral-600', Clock],
  sending: ['Đang gửi', 'bg-sky-50 text-sky-700', Clock],
  sent: ['LMS đã nhận', 'bg-emerald-50 text-emerald-700', Check],
  failed: ['Gửi lỗi', 'bg-red-50 text-red-600', AlertTriangle],
}

/** Gửi thẳng sang LMS công ty qua API: gửi đúng phiên bản đang xuất bản lúc xác nhận; worker gửi nền, lưu mã hoặc lỗi LMS trả về */
function LmsSend({ kit }) {
  const { say } = useStore()
  const [confirm, setConfirm] = useState(null) // { kind, artifactId?, title, items }
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const info = useQuery({ queryKey: ['scorm-info', kit.id], queryFn: () => get(`/kits/${kit.id}/export/scorm/info`) })
  const hist = useQuery({
    queryKey: ['lms-exports', kit.id], queryFn: () => get(`/kits/${kit.id}/lms-exports`),
    refetchInterval: (q) => (q.state.data?.items ?? []).some((x) => x.status === 'queued' || x.status === 'sending') ? 2000 : false,
  })
  if (info.isLoading || hist.isLoading) return <Spinner size={20} w={2} />
  const lms = hist.data?.lms ?? info.data?.lms ?? { name: 'LMS công ty', configured: false }
  const inc = info.data?.included ?? [], exams = info.data?.exams ?? []
  const send = async () => {
    setBusy(true)
    try {
      await post(`/kits/${kit.id}/lms-exports`, confirm.kind === 'qti' ? { kind: 'qti', artifactId: confirm.artifactId } : { kind: 'scorm' })
      say(`Đang gửi sang ${lms.name}`); setConfirm(null); setOk(false); hist.refetch()
    } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  const retry = async (x) => { try { await post(`/kits/${kit.id}/lms-exports/${x.id}/retry`); hist.refetch() } catch (e) { say(e.message) } }
  if (!lms.configured) return <div className="rounded-xl bg-neutral-50 px-4 py-4 text-[14px] text-neutral-600">Chưa kết nối API của {lms.name}. Quản trị hệ thống đặt <code>LMS_API_URL</code> và <code>LMS_API_TOKEN</code> rồi chạy lại máy chủ. Trong lúc chờ, dùng mục <b>Tải gói SCORM, đề QTI</b> để tải gói về và nhập tay.</div>
  return (<>
    <p className="text-[14px]">Studio gửi gói thẳng sang <b>{lms.name}</b> qua API, đúng phiên bản đang xuất bản lúc bạn xác nhận. Sửa và xuất bản lại sau đó không làm đổi gói đã gửi. Người quản trị LMS duyệt và giao khóa cho nhân viên bên đó.</p>
    <div className="mt-3 divide-y divide-line rounded-xl border border-line">
      <div className="flex items-center gap-3 px-4 py-3 text-[14px]">
        <PackageOpen size={16} className="shrink-0 text-neutral-500" />
        <div className="min-w-0 flex-1"><div className="font-medium">Khóa học (gói SCORM 1.2)</div><div className="text-[12px] text-neutral-500">{inc.length ? `${inc.length} tài liệu đã xuất bản` : 'Chưa có tài liệu nào đã xuất bản'}</div></div>
        <button className="btn-line btn-sm" disabled={!inc.length} onClick={() => setConfirm({ kind: 'scorm', title: kit.title, items: inc })}><Send size={14} />Gửi khóa</button>
      </div>
      {exams.map((e) => (
        <div key={e.id} className="flex items-center gap-3 px-4 py-3 text-[14px]">
          <FormatGlyph type="exam" size={15} />
          <div className="min-w-0 flex-1"><div className="truncate font-medium">{e.title}</div><div className="text-[12px] text-neutral-500">Đề QTI 2.1 kèm đáp án · v{e.version} · {e.questions} câu đã duyệt</div></div>
          <button className="btn-line btn-sm" disabled={!e.questions} onClick={() => setConfirm({ kind: 'qti', artifactId: e.id, title: e.title, items: [{ id: e.id, type: 'exam', title: e.title, version: e.version }] })}><Send size={14} />Gửi đề</button>
        </div>
      ))}
    </div>
    {confirm && (
      <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3">
        <div className="text-[14px] font-semibold">Xác nhận gửi {confirm.kind === 'qti' ? 'đề' : 'khóa'} “{confirm.title}” sang {lms.name}</div>
        <ul className="mt-2 space-y-1 text-[13px] text-neutral-700">{confirm.items.map((x) => <li key={x.id} className="flex items-center gap-2"><FormatGlyph type={x.type} size={13} /><span className="flex-1 truncate">{x.title}</span><span className="text-neutral-500">phiên bản {x.version}</span></li>)}</ul>
        {confirm.kind === 'qti' && <label className="mt-3 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={ok} onChange={(ev) => setOk(ev.target.checked)} />Gói có đáp án; chỉ người quản trị {lms.name} xem được</label>}
        <div className="mt-3 flex justify-end gap-2"><button className="btn-line btn-sm" onClick={() => { setConfirm(null); setOk(false) }}>Hủy</button><button className="btn-dark btn-sm" disabled={busy || (confirm.kind === 'qti' && !ok)} onClick={send}>{busy ? <Spinner size={16} w={2} /> : <><Send size={14} />Gửi đúng các phiên bản này</>}</button></div>
      </div>
    )}
    <div className="mt-5 text-[14px] font-semibold">Lần gửi gần đây</div>
    <div className="mt-2 rounded-xl border border-line">
      {!(hist.data?.items ?? []).length && <div className="px-4 py-3 text-[13px] text-neutral-500">Chưa gửi lần nào.</div>}
      {(hist.data?.items ?? []).map((x) => { const [l, cls, I] = SEND_ST[x.status] ?? SEND_ST.queued; return (
        <div key={x.id} className="border-b border-line px-4 py-2.5 text-[13px] last:border-0">
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 font-semibold text-neutral-500">{x.kind === 'qti' ? 'Đề' : 'Khóa'}</span>
            <span className="min-w-0 flex-1 truncate">{x.title}</span>
            <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold ${cls}`}><I size={12} />{l}</span>
            {x.status === 'failed' && <button className="btn-line btn-sm" onClick={() => retry(x)}><RotateCcw size={13} />Gửi lại</button>}
          </div>
          <div className="ml-16 mt-0.5 text-[12px] text-neutral-500">{new Date(x.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })} · {x.by}{x.remoteId ? ` · mã bên LMS: ${x.remoteId}` : ''}</div>
          {x.error && <div className="ml-16 mt-0.5 text-[12px] text-red-600">{x.error}</div>}
        </div>) })}
    </div>
  </>)
}

/**
 * Tạo đề kiểm tra: AI soạn ngân hàng câu theo ma trận đề (dạng câu × độ khó × số câu).
 * Có kit: ra đề từ nội dung đã chốt của khóa đó. Không có kit (Kho đề): chọn một khóa học, hoặc chọn thẳng tài liệu nguồn.
 */
export function ExamCreateModal({ open, onClose, kit, onCreated }) {
  const { say } = useStore()
  const [from, setFrom] = useState('kit')
  const [kitId, setKitId] = useState('')
  const [sourceIds, setSourceIds] = useState([])
  const kits = useQuery({ queryKey: ['kits'], queryFn: () => get('/kits'), enabled: open && !kit })
  const sources = useQuery({ queryKey: ['sources'], queryFn: () => get('/sources'), enabled: open && !kit && from === 'sources' })
  // khóa có thể ra đề: đã chốt nội dung
  const ready = (kits.data ?? []).filter((k) => k.artifacts.some((a) => a.type === 'master' && a.publishedVersion))
  const chosen = kit ?? ready.find((k) => k.id === kitId)
  const [o, setO] = useState(() => ({ title: '', focus: '', matrix: DEFAULT_MATRIX, reserve: 2, mode: 'official', minutes: 30, passScore: 80, attempts: 2 }))
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setO((x) => ({ ...x, [k]: v }))
  const perExam = o.matrix.reduce((n, c) => n + c.count, 0)
  const total = perExam * o.reserve
  const bySources = !kit && from === 'sources'
  const tooMany = perExam > 50 || total > 100
  const canRun = matrixOk(o.matrix) && !tooMany && (kit || (bySources ? sourceIds.length > 0 && o.title.trim().length >= 3 : !!kitId))
  const run = async () => {
    setBusy(true)
    const spec = o
    try {
      const r = await post('/exams', bySources ? { ...spec, from: 'sources', sourceIds } : { ...spec, from: 'kit', kitId: kit?.id ?? kitId })
      say('AI đang soạn đề kiểm tra'); onCreated(r); onClose()
    } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  const num = (k, l, u, min, max) => <label className="text-[14px]"><div className="mb-1 font-medium">{l}</div><div className="flex items-center gap-2"><input type="number" min={min} max={max} className="field py-1.5 text-right" value={o[k]} onChange={(e) => set(k, Math.max(min, Math.min(max, +e.target.value || min)))} /><span className="w-10 text-neutral-500">{u}</span></div></label>
  const ground = kit ? 'nội dung đã chốt của khóa' : bySources ? 'tài liệu nguồn bạn chọn' : 'nội dung đã chốt của khóa học bạn chọn'
  return (
    <Modal open={open} onClose={onClose} w={680} title="Tạo đề kiểm tra" sub={`AI soạn ngân hàng câu hỏi từ ${ground}, mỗi câu gắn nguồn. Ma trận đề quyết định mỗi lượt thi có bao nhiêu câu của từng dạng ở từng độ khó. Bạn duyệt từng câu rồi xuất đề kèm đáp án (QTI 2.1) cho LMS công ty.`}
      footer={<button className="btn-dark h-10" disabled={busy || !canRun} onClick={run}>{busy ? <Spinner size={18} w={2} /> : <><Sparkles size={16} />Soạn {total} câu</>}</button>}>
      <div className="space-y-4 text-[14px]">
        {!kit && <div>
          <div className="mb-1 font-medium">Ra đề từ</div>
          <div className="grid grid-cols-2 gap-2">{[['kit', 'Khóa học có sẵn', 'Dùng nội dung đã chốt'], ['sources', 'Tài liệu nguồn', 'Đề đứng riêng, không thuộc khóa nào']].map(([k, t, d]) => (
            <button key={k} type="button" onClick={() => setFrom(k)} className={`rounded-xl border px-3 py-2.5 text-left ${from === k ? 'border-ink bg-neutral-50' : 'border-line hover:bg-neutral-50'}`}><div className="font-semibold">{t}</div><div className="text-[12px] text-neutral-600">{d}</div></button>))}</div>
          {from === 'kit' && <>
            <select className="field mt-2 py-2" value={kitId} onChange={(e) => setKitId(e.target.value)} aria-label="Khóa học"><option value="">Chọn khóa học</option>{ready.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}</select>
            {kits.data && ready.length < kits.data.length && <p className="mt-1 text-[12px] text-neutral-500">Chỉ hiện khóa đã chốt nội dung ({ready.length}/{kits.data.length} khóa).</p>}
          </>}
          {from === 'sources' && <div className="mt-2 max-h-[180px] divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {sources.isLoading && <div className="p-3"><Spinner size={18} w={2} /></div>}
            {(sources.data ?? []).map((x) => <label key={x.id} className={`flex items-center gap-2 px-3 py-2 ${x.status === 'ready' ? '' : 'opacity-50'}`}><input type="checkbox" disabled={x.status !== 'ready'} checked={sourceIds.includes(x.id)} onChange={(e) => setSourceIds((v) => (e.target.checked ? [...v, x.id] : v.filter((y) => y !== x.id)))} /><span className="flex-1 truncate">{x.name}</span><span className="text-[12px] text-neutral-500">v{x.version}</span></label>)}
            {sources.data?.length === 0 && <p className="p-3 text-neutral-500">Chưa có tài liệu nguồn. Tải lên ở Thư viện → Tài liệu nguồn.</p>}
          </div>}
        </div>}
        <label className="block"><div className="mb-1 font-medium">Tên đề{bySources && ' (bắt buộc)'}</div><input className="field py-2" value={o.title} maxLength={200} onChange={(e) => set('title', e.target.value)} placeholder={chosen ? `Đề kiểm tra: ${chosen.title}` : 'Ví dụ: Đề kiểm tra quy định an toàn thông tin'} /></label>
        <div>
          <div className="mb-1 font-medium">Ma trận đề</div>
          <MatrixEditor value={o.matrix} onChange={(v) => set('matrix', v)} />
        </div>
        <label className="block"><div className="mb-1 font-medium">Câu dự phòng</div>
          <select className="field py-2" value={o.reserve} onChange={(e) => set('reserve', +e.target.value)}>
            <option value={1}>Không dự phòng: mọi lượt thi cùng một bộ câu ({perExam} câu)</option>
            <option value={2}>Gấp đôi: soạn {perExam * 2} câu, mỗi lượt thi rút ngẫu nhiên theo ma trận</option>
            <option value={3}>Gấp ba: soạn {perExam * 3} câu, các lượt thi ít trùng nhau hơn</option>
          </select>
          {tooMany && <p className="mt-1 text-[12px] text-red-700">Mỗi đề tối đa 50 câu, ngân hàng tối đa 100 câu. Giảm số câu hoặc số câu dự phòng.</p>}
        </label>
        <div className="grid grid-cols-3 gap-3">{num('minutes', 'Thời gian', 'phút', 5, 240)}{num('passScore', 'Điểm đạt', '%', 1, 100)}{num('attempts', 'Số lượt thi', 'lượt', 1, 10)}</div>
        <label className="block"><div className="mb-1 font-medium">Trọng tâm (tùy chọn)</div><input className="field py-2" value={o.focus} maxLength={500} onChange={(e) => set('focus', e.target.value)} placeholder="Ví dụ: chọn kiến trúc phù hợp cho từng tình huống" /></label>
      </div>
    </Modal>
  )
}
