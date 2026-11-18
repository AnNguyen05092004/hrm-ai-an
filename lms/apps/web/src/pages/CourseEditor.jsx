import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlignLeft, HelpCircle, ChevronLeft, Eye, Sparkles, Plus, ArrowUp, ArrowDown, Copy, Trash2, X, Check, ShieldCheck, GripVertical, Code2, FileText, Wand2, AlertTriangle } from 'lucide-react'
import { useStore, uid } from '../store'
import { LEVELS } from '../data'
import { Tip, Toggle, SrcChip, Modal, Spinner } from '../ui'
import { BlockView } from '../blocks'
import { Editable, EditableList, MiniBtn } from '../edit'
import { ArtifactTop, ShareModal, DraftBar } from './Common'
import { useSkills } from './KitFlow'
import { post } from '../api'

const NEW_BLOCK = {
  para: () => ({ t: 'para', p: '' }), heading: () => ({ t: 'heading', h: '', p: '' }), list: () => ({ t: 'list', intro: '', items: [''] }),
  image: () => ({ t: 'image', img: 'office', cap: '' }), accordion: () => ({ t: 'accordion', h: '', p: '', items: [{ t: '', b: '' }] }),
  flash: () => ({ t: 'flash', h: '', p: '', cards: [{ f: '', b: '' }, { f: '', b: '' }] }), process: () => ({ t: 'process', h: '', steps: [''] }),
  table: () => ({ t: 'table', head: ['Cột 1', 'Cột 2'], rows: [['', '']] }), code: () => ({ t: 'code', h: '', code: '' }), kc: () => ({ t: 'kc', q: '', choices: ['', '', ''], correct: 0 }),
}
const BLOCK_NAMES = [['para', 'Văn bản'], ['heading', 'Tiêu đề + đoạn'], ['list', 'Danh sách'], ['image', 'Hình ảnh'], ['accordion', 'Mục mở rộng'], ['flash', 'Thẻ lật'], ['process', 'Các bước'], ['table', 'Bảng'], ['code', 'Mã lệnh'], ['kc', 'Câu hỏi kiểm tra nhanh']]

/** Chèn khối: chọn loại để tự viết, hoặc mô tả để AI viết từ tài liệu nguồn */
function BlockLibrary({ open, onClose, onPick, artId }) {
  const { say } = useStore()
  const [txt, setTxt] = useState('')
  const [busy, setBusy] = useState(false)
  if (!open) return null
  const aiBlock = async () => {
    setBusy(true)
    try { const b = await post(`/artifacts/${artId}/ai-block`, { instruction: txt }); onPick(b); setTxt(''); say(b.t === 'gap' ? 'Tài liệu nguồn không có nội dung này, AI đã đánh dấu thiếu căn cứ' : 'AI đã tạo khối từ tài liệu nguồn') } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40" onMouseDown={onClose}>
      <div className="fade absolute bottom-0 left-0 top-0 flex w-[320px] flex-col border-r border-line bg-white shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center px-5 pt-5 text-[20px] font-semibold">Thêm khối<div className="flex-1" /><button onClick={onClose} aria-label="Đóng"><X size={18} /></button></div>
        <div className="mx-5 mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
          <div className="flex items-center gap-2 text-[14px] font-semibold"><Sparkles size={16} className="text-violet-600" />Tạo khối bằng AI</div>
          <textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={3} maxLength={1000} className="mt-2 w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-[14px] outline-none focus:border-violet-400" placeholder="Ví dụ: các bước khôi phục từ file sao lưu" />
          <button disabled={txt.trim().length < 3 || busy} onClick={aiBlock} className="btn-dark btn-sm mt-2 h-9 w-full">{busy ? <Spinner size={16} w={2} /> : 'Tạo từ tài liệu nguồn'}</button>
        </div>
        <div className="scroll-thin mt-3 flex-1 overflow-y-auto px-3 pb-4">
          {BLOCK_NAMES.map(([k, l]) => <button key={k} onClick={() => onPick({ ...NEW_BLOCK[k]() })} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] hover:bg-neutral-50"><Plus size={15} className="text-neutral-400" />{l}</button>)}
        </div>
      </div>
    </div>
  )
}

/** Ô "Sửa bằng AI" cho một khối / câu hỏi */
function AiEdit({ artId, kind, value, onApply, onClose }) {
  const { say } = useStore()
  const [t, setT] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (instruction) => {
    setBusy(true)
    try { onApply(await post(`/artifacts/${artId}/ai-edit`, { kind, value, instruction })); say('AI đã sửa, bấm vào chữ để chỉnh tiếp'); onClose() } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="fade absolute left-5 top-16 z-20 w-[320px] rounded-2xl border border-line bg-white p-4 shadow-pop">
      <div className="flex items-center gap-2 text-[15px] font-semibold"><Sparkles size={17} className="text-violet-600" />Sửa bằng AI<div className="flex-1" /><button onClick={onClose} aria-label="Đóng"><X size={16} /></button></div>
      <div className="mt-2 flex flex-wrap gap-1.5">{['Viết ngắn gọn hơn', 'Viết dễ hiểu hơn', 'Thêm ví dụ từ tài liệu', 'Sửa lỗi chính tả'].map((c) => <button key={c} disabled={busy} onClick={() => run(c)} className="rounded-lg border border-line px-2 py-1 text-[12px] hover:bg-neutral-50">{c}</button>)}</div>
      <textarea autoFocus value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && t.trim()) { e.preventDefault(); run(t) } }} className="mt-2 h-16 w-full resize-none text-[14px] outline-none" placeholder="Hoặc nhập yêu cầu…" />
      <div className="flex justify-end">{busy ? <Spinner size={20} w={2} /> : <button disabled={!t.trim()} onClick={() => run(t)} className="btn-dark btn-sm h-8">Sửa</button>}</div>
    </div>
  )
}

function LessonEditor({ art, lesson, up, onBack }) {
  const [lib, setLib] = useState(null)
  const [aiAt, setAiAt] = useState(null)
  const [hover, setHover] = useState(null)
  const nav = useNavigate()
  const li = art.lessons.findIndex((l) => l.id === lesson.id)
  const upL = (fn) => up((a) => fn(a.lessons[li]))
  const move = (i, dir) => upL((l) => { const j = i + dir; if (j < 0 || j >= l.blocks.length) return; [l.blocks[i], l.blocks[j]] = [l.blocks[j], l.blocks[i]] })
  const insert = (at, b) => { upL((l) => { l.blocks.splice(at, 0, { ...b, id: uid('b') }) }); setLib(null) }
  return (
    <div className="min-h-full pb-24">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-4">
        <button className="icon-btn" onClick={onBack} aria-label="Về danh sách bài"><ChevronLeft size={20} /></button>
        <span className="h-7 w-px bg-line" />
        <span className="max-w-[420px] truncate rounded-lg bg-neutral-100 px-3 py-1.5 text-[14px] font-semibold">{lesson.title || 'Bài chưa đặt tên'}</span>
        <div className="flex-1" />
        <Tip label="Xem trước" onClick={() => nav(`/preview/${art.id}?l=${lesson.id}`)}><Eye size={19} /></Tip>
      </header>
      <div className="mx-auto max-w-[680px] px-6 pt-12">
        <h1 className="font-lato text-[40px] font-black leading-tight"><Editable value={lesson.title} onChange={(v) => upL((l) => { l.title = v })} className="block" placeholder="Tên bài học" /></h1>
        <div className="mt-10 h-1 w-28 bg-brand" />
      </div>
      <div className="mt-10 border-t border-line" />
      {lesson.blocks.length === 0 && <p className="mx-auto mt-10 max-w-[680px] px-6 text-[15px] text-neutral-500">Bài này chưa có nội dung. Bấm "Thêm khối" để bắt đầu.</p>}
      {lesson.blocks.map((b, i) => (
        <div key={b.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={`relative border-b border-dashed py-10 ${hover === i ? 'border-neutral-300 bg-neutral-50/40' : 'border-transparent'}`}>
          {hover === i && <>
            {b.t !== 'image' && b.t !== 'gap' && <div className="absolute left-5 top-4 z-10 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-1 shadow-card">
              <Tip label="Sửa bằng AI" className="h-8 w-8" onClick={() => setAiAt(aiAt === i ? null : i)}><Sparkles size={16} className="text-violet-600" /></Tip>
            </div>}
            <div className="absolute right-5 top-4 z-10 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-1 shadow-card">
              <Tip label="Lên" className="h-8 w-8" onClick={() => move(i, -1)}><ArrowUp size={16} /></Tip>
              <Tip label="Xuống" className="h-8 w-8" onClick={() => move(i, 1)}><ArrowDown size={16} /></Tip>
              <Tip label="Nhân đôi" className="h-8 w-8" onClick={() => upL((l) => { l.blocks.splice(i + 1, 0, { ...structuredClone(b), id: uid('b') }) })}><Copy size={16} /></Tip>
              <Tip label="Xóa" className="h-8 w-8" onClick={() => upL((l) => { l.blocks.splice(i, 1) })}><Trash2 size={16} /></Tip>
            </div>
          </>}
          {aiAt === i && <AiEdit artId={art.id} kind="block" value={b} onClose={() => setAiAt(null)} onApply={(nb) => upL((l) => { l.blocks[i] = { ...nb, id: b.id, nosrc: undefined } })} />}
          {b.nosrc && <div className="mx-auto mb-3 max-w-[680px] px-6"><span className="chip bg-amber-50 text-amber-700"><AlertTriangle size={12} />Chưa có nguồn trích dẫn, kiểm tra lại nội dung</span></div>}
          <BlockView b={b} editor onChange={(nb) => upL((l) => { l.blocks[i] = nb })} />
          <button onClick={() => setLib(i + 1)} className={`absolute -bottom-4 left-1/2 z-10 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-ink text-white shadow transition ${hover === i ? 'opacity-100' : 'opacity-0'}`} aria-label="Thêm khối"><Plus size={16} /></button>
        </div>
      ))}
      <div className="mt-10 flex justify-center"><button onClick={() => setLib(lesson.blocks.length)} className="btn-line"><Plus size={16} />Thêm khối</button></div>
      <BlockLibrary artId={art.id} open={lib !== null} onClose={() => setLib(null)} onPick={(b) => insert(lib, b)} />
    </div>
  )
}

const QTYPE = { mc: 'Một đáp án', mr: 'Nhiều đáp án', fill: 'Điền chỗ trống', essay: 'Tự luận', code: 'Bài code' }
const toTest = (t) => (typeof t === 'string' ? { name: t, args: '[]', expected: '' } : t)

function CodeTests({ q, upCur }) {
  const tests = (q.tests ?? []).map(toTest)
  const set = (i, k, v) => upCur((x) => { x.tests = tests.map((t, j) => (j === i ? { ...t, [k]: v } : t)) })
  return (
    <div className="mt-4 rounded-xl border border-line p-5">
      <div className="flex items-center gap-2 font-semibold"><Code2 size={16} />Mã khởi đầu (JavaScript)</div>
      <pre className="mt-2 rounded-lg bg-[#1e1e2e] p-4 font-mono text-[13px] text-[#e5e7eb]"><Editable value={q.starter ?? ''} multiline className="block" placeholder={'function solve(a, b) {\n  \n}'} onChange={(v) => upCur((x) => { x.starter = v })} /></pre>
      <div className="mt-5 flex items-center gap-2 font-semibold"><Check size={16} className="text-emerald-600" />Test case (quyết định đạt hay không)</div>
      <p className="mt-1 text-[13px] text-neutral-500">Hệ thống gọi <code>solve(...tham số)</code> trong môi trường cách ly, so kết quả với giá trị mong đợi. Tham số và kết quả viết dạng JSON.</p>
      <table className="mt-3 w-full text-[13px]">
        <thead><tr className="text-left text-neutral-500"><th className="pb-2 font-medium">Tên test</th><th className="pb-2 font-medium">Tham số (mảng JSON)</th><th className="pb-2 font-medium">Mong đợi (JSON)</th><th className="w-6" /></tr></thead>
        <tbody>{tests.map((t, i) => (
          <tr key={i} className="group/t border-t border-line font-mono">
            <td className="py-2 pr-2 font-sans"><Editable value={t.name} className="block" placeholder="Tên" onChange={(v) => set(i, 'name', v)} /></td>
            <td className="py-2 pr-2"><Editable value={t.args} className="block" placeholder="[1, 2]" onChange={(v) => set(i, 'args', v)} /></td>
            <td className="py-2 pr-2"><Editable value={t.expected} className="block" placeholder="3" onChange={(v) => set(i, 'expected', v)} /></td>
            <td><button onClick={() => upCur((x) => { x.tests = tests.filter((_, j) => j !== i) })} className="text-neutral-400 opacity-0 group-hover/t:opacity-100" aria-label="Xóa test"><Trash2 size={14} /></button></td>
          </tr>))}</tbody>
      </table>
      <MiniBtn onClick={() => upCur((x) => { x.tests = [...tests, { name: '', args: '[]', expected: '' }] })} className="mt-2"><Plus size={13} />Thêm test</MiniBtn>
      <p className="mt-3 text-[13px] text-neutral-500">AI chỉ nhận xét chất lượng code (đặt tên, cấu trúc, xử lý lỗi), không quyết định đạt.</p>
    </div>
  )
}

function GenQuestions({ open, onClose, art, onAdd }) {
  const { say } = useStore()
  const [o, setO] = useState({ level: art.quiz.level, count: 3, focus: '' })
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try { const r = await post(`/artifacts/${art.id}/questions/generate`, o); onAdd(r.questions); say(`Đã thêm ${r.questions.length} câu nháp, chưa vào ngân hàng đề`); onClose() } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title="Sinh thêm câu bằng AI" sub="AI soạn nháp câu hỏi, đáp án, giải thích từ tài liệu nguồn của bộ. Mỗi câu gắn nguồn; bạn duyệt từng câu vào ngân hàng đề." w={540}
      footer={<button className="btn-dark h-10" disabled={busy} onClick={run}>{busy ? <Spinner size={18} w={2} /> : <><Sparkles size={16} />Sinh {o.count} câu</>}</button>}>
      <div className="grid grid-cols-2 gap-3 text-[14px]">
        <label><div className="mb-1 font-medium">Mức</div><select className="field py-2" value={o.level} onChange={(e) => setO({ ...o, level: +e.target.value })}>{LEVELS.map((l) => <option key={l.v} value={l.v}>Mức {l.v} · {l.kinds}</option>)}</select></label>
        <label><div className="mb-1 font-medium">Số câu</div><input type="number" min={1} max={10} className="field py-2" value={o.count} onChange={(e) => setO({ ...o, count: Math.max(1, Math.min(10, +e.target.value || 1)) })} /></label>
        <label className="col-span-2"><div className="mb-1 font-medium">Trọng tâm (tùy chọn)</div><input className="field py-2" value={o.focus} maxLength={300} onChange={(e) => setO({ ...o, focus: e.target.value })} placeholder="Ví dụ: lỗi hay gặp khi dọn dẹp volume" /></label>
      </div>
    </Modal>
  )
}

function QuizEditor({ art, up, onBack }) {
  const nav = useNavigate()
  const skills = useSkills()
  const [sel, setSel] = useState('settings')
  const [gen, setGen] = useState(false)
  const [ai, setAi] = useState(false)
  const qz = art.quiz
  const upQ = (fn) => up((a) => fn(a.quiz))
  const q = qz.questions.find((x) => x.id === sel)
  const upCur = (fn) => upQ((z) => fn(z.questions.find((x) => x.id === sel)))
  const lv = LEVELS.find((l) => l.v === qz.level) ?? LEVELS[0]
  const approved = qz.questions.filter((x) => x.approved).length
  const skillName = skills.find((s) => s.id === qz.skill)?.name ?? 'chưa gắn kỹ năng'
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-4">
        <button className="icon-btn" onClick={onBack} aria-label="Về danh sách bài"><ChevronLeft size={20} /></button><span className="h-7 w-px bg-line" />
        <span className="rounded-lg bg-neutral-100 px-3 py-1.5 text-[14px] font-semibold">Bài kiểm tra</span>
        <span className="chip bg-violet-50 text-violet-700">{skillName} · Mức {qz.level}</span>
        <span className="text-[13px] text-neutral-500">{approved}/{qz.questions.length} câu trong ngân hàng đề</span>
        <div className="flex-1" />
        <Tip label="Xem trước" onClick={() => nav(`/preview/${art.id}?l=quiz`)}><Eye size={19} /></Tip>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="scroll-thin w-[340px] shrink-0 overflow-y-auto bg-neutral-100">
          <button onClick={() => setSel('settings')} className={`block w-full border-b border-line px-6 py-4 text-left text-[16px] ${sel === 'settings' ? 'bg-white font-semibold' : ''}`}>Màn mở đầu và cài đặt</button>
          <div className="px-6 pb-2 pt-5 text-[13px] font-bold tracking-wide">NGÂN HÀNG CÂU HỎI</div>
          {qz.questions.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={`flex w-full items-start gap-2 border-b border-line px-3 py-3 text-left text-[14px] ${sel === x.id ? 'border-l-4 border-l-ink bg-white' : 'hover:bg-white/60'}`}>
              <GripVertical size={15} className="mt-0.5 shrink-0 text-neutral-400" />
              <div className="flex-1"><div className="line-clamp-2">{x.q || <span className="text-neutral-400">Câu hỏi chưa có nội dung</span>}</div><div className="mt-1 flex flex-wrap gap-1.5"><span className="chip bg-white">{QTYPE[x.type]}</span><span className="chip bg-white">Mức {x.level}</span>{!x.approved && <span className="chip bg-amber-100 text-amber-700">Chưa duyệt</span>}</div></div>
              <span role="button" title="Xóa câu hỏi" onClick={(e) => { e.stopPropagation(); upQ((z) => { z.questions = z.questions.filter((y) => y.id !== x.id) }); if (sel === x.id) setSel('settings') }} className="shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-red-600"><Trash2 size={15} /></span>
            </button>
          ))}
          <div className="space-y-2 p-4">
            <button onClick={() => setGen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300 bg-white py-2.5 text-[14px] font-semibold text-violet-700"><Wand2 size={16} />Sinh thêm câu bằng AI</button>
            <button onClick={() => { const n = { id: uid('q'), type: 'mc', level: qz.level, approved: false, q: '', choices: [{ t: '', ok: true, fb: '' }, { t: '', ok: false, fb: '' }] }; upQ((z) => { z.questions.push(n) }); setSel(n.id) }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white py-2.5 text-[14px] font-semibold"><Plus size={16} />Thêm câu hỏi</button>
          </div>
        </aside>
        <main className="scroll-thin flex-1 overflow-y-auto">
          {sel === 'settings' ? (
            <div className="mx-auto max-w-[720px] px-8 py-12">
              <h1 className="font-lato text-[44px] font-black">Bài kiểm tra</h1>
              <div className="mt-8 h-1 w-28 bg-brand" />
              <p className="mt-8 font-serif text-[17px] text-neutral-500">Bài kiểm tra cho kỹ năng {skillName}, mức {qz.level}. Mỗi người nhận một đề riêng rút ngẫu nhiên từ các câu đã duyệt, thứ tự câu và lựa chọn được xáo.</p>
              <div className="card mt-10 divide-y divide-line">
                <div className="flex items-center gap-4 px-5 py-4"><div className="flex-1"><div className="font-semibold">Loại bài</div><div className="text-[13px] text-neutral-600">Chỉ bài thi chính thức đạt mới cập nhật mức kỹ năng</div></div>
                  <div className="flex rounded-lg bg-neutral-100 p-1 text-[14px]">{[['practice', 'Luyện tập'], ['official', 'Thi chính thức']].map(([k, l]) => <button key={k} onClick={() => upQ((z) => { z.mode = k; if (k === 'practice') z.proctor = false })} className={`rounded-md px-3 py-1.5 ${qz.mode === k ? 'bg-white font-semibold shadow-card' : 'text-neutral-600'}`}>{l}</button>)}</div></div>
                <div className="flex items-center gap-4 px-5 py-4"><div className="flex-1"><div className="font-semibold">Mức kỹ năng</div><div className="text-[13px] text-neutral-600">Dạng bài theo mức: {lv.kinds}. Mức 4–5 đánh giá qua dự án, không thi trên LMS.</div></div>
                  <select className="field w-28 py-1.5" value={qz.level} onChange={(e) => upQ((z) => { z.level = +e.target.value })}>{LEVELS.map((l) => <option key={l.v} value={l.v}>Mức {l.v}</option>)}</select></div>
                {[['Số câu mỗi đề', 'pick', 'câu', 1, 50], ['Điểm đạt', 'passScore', '%', 1, 100], ['Số lượt thi', 'attempts', 'lượt', 1, 10], ['Thời gian', 'minutes', 'phút', 1, 240]].map(([l, k, u, min, max]) => (
                  <div key={k} className="flex items-center gap-4 px-5 py-4"><div className="flex-1"><div className="font-semibold">{l}</div>{k === 'pick' && <div className="text-[13px] text-neutral-600">Ngân hàng hiện có {approved} câu đã duyệt</div>}</div><input type="number" min={min} max={max} className="field w-24 py-1.5 text-right" value={qz[k] ?? (k === 'pick' ? approved : '')} onChange={(e) => upQ((z) => { z[k] = Math.max(min, Math.min(max, +e.target.value || min)) })} /><span className="w-10 text-[14px] text-neutral-600">{u}</span></div>
                ))}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-4"><ShieldCheck size={20} /><div className="flex-1"><div className="font-semibold">Giám sát khi thi</div><div className="text-[13px] text-neutral-600">Chỉ bật được cho bài thi chính thức</div></div><Toggle on={qz.proctor} disabled={qz.mode !== 'official'} onChange={(v) => upQ((z) => { z.proctor = v })} /></div>
                  {qz.proctor && <div className="ml-9 mt-3 rounded-xl bg-neutral-50 p-3 text-[13px] leading-relaxed text-neutral-700">
                    · Người thi thấy rõ những gì được ghi lại và phải bấm đồng ý trước khi vào thi.<br />· Hệ thống gắn cờ khi chuyển tab, rời cửa sổ hoặc dán nội dung từ ngoài vào. Mỗi cờ có mốc thời gian.<br />· Người chấm xem lại rồi quyết định. Hệ thống không tự hủy bài, không tự trừ điểm.<br />· Bản ghi giám sát tự xóa sau 30 ngày, trừ bài đang được xem xét.<br />· AI Tutor tắt trong lúc thi.</div>}
                </div>
              </div>
            </div>
          ) : q && (
            <div className="relative mx-auto max-w-[900px] px-8 py-6">
              <div className="flex items-center gap-2">
                <button onClick={() => setAi(!ai)} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[14px] font-medium"><Sparkles size={15} className="text-violet-600" />Sửa bằng AI</button>
                {ai && <AiEdit artId={art.id} kind="question" value={q} onClose={() => setAi(false)} onApply={(nq) => upCur((x) => { Object.assign(x, { ...nq, id: x.id, approved: false }) })} />}
                <div className="flex-1" />
                {q.approved ? <button onClick={() => upCur((x) => { x.approved = false })} className="flex items-center gap-1.5 text-[14px] font-semibold text-emerald-700" title="Bấm để bỏ khỏi ngân hàng đề"><Check size={16} />Đã duyệt vào ngân hàng đề</button>
                  : <button onClick={() => upCur((x) => { x.approved = true })} className="btn-dark btn-sm h-9"><Check size={15} />Duyệt vào ngân hàng đề</button>}
              </div>
              <div className="mt-6 flex gap-4">
                <span className="font-lato text-[22px] italic text-neutral-400">{String(qz.questions.indexOf(q) + 1).padStart(2, '0')}</span>
                <div className="flex-1 border-b border-line pb-2 text-[17px] font-medium"><Editable value={q.q} multiline className="block" placeholder="Nhập câu hỏi" onChange={(v) => upCur((x) => { x.q = v })} /></div>
              </div>
              <div className="mt-2 flex items-center gap-2"><SrcChip src={q.src} />
                <select className="chip cursor-pointer outline-none" value={q.level} onChange={(e) => upCur((x) => { x.level = +e.target.value })}>{LEVELS.map((l) => <option key={l.v} value={l.v}>Mức {l.v}</option>)}</select></div>
              <div className="mt-6 flex justify-end"><select className="rounded-lg px-2 py-1 text-[14px] font-semibold outline-none hover:bg-neutral-100" value={q.type} onChange={(e) => upCur((x) => { const t = e.target.value; x.type = t; if ((t === 'mc' || t === 'mr') && !x.choices) x.choices = [{ t: '', ok: true, fb: '' }, { t: '', ok: false, fb: '' }]; if (t === 'essay' && !x.rubric) x.rubric = ['']; if (t === 'code' && !x.tests) { x.tests = [{ name: '', args: '[]', expected: '' }]; x.starter = 'function solve() {\n  \n}' } if (t === 'fill' && x.answer == null) x.answer = '' })}>{Object.entries(QTYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              {(q.type === 'mc' || q.type === 'mr') && q.choices && (<>
                <table className="mt-2 w-full text-[14px]">
                  <thead><tr className="text-left text-[13px] font-semibold"><th className="w-20 pb-3">Đúng</th><th className="pb-3">Lựa chọn</th><th className="w-6" /><th className="pb-3">Phản hồi khi chọn</th><th className="w-8" /></tr></thead>
                  <tbody>{q.choices.map((c, i) => (
                    <tr key={i} className="group/c border-t border-line align-top">
                      <td className="py-4"><button title={q.type === 'mr' ? 'Bấm để bật/tắt đáp án đúng' : 'Đặt làm đáp án đúng'} onClick={() => upCur((x) => { x.choices.forEach((cc, j) => { if (q.type === 'mr') { if (j === i) cc.ok = !cc.ok } else cc.ok = j === i }) })} className={`mx-2 h-5 w-5 ${q.type === 'mr' ? 'rounded' : 'rounded-full'} border-2 ${c.ok ? 'border-ink bg-white ring-4 ring-inset ring-ink' : 'border-neutral-400'}`} /></td>
                      <td className="py-4 text-[15px]"><Editable value={c.t} className="block" placeholder={`Lựa chọn ${i + 1}`} onChange={(v) => upCur((x) => { x.choices[i].t = v })} /></td><td />
                      <td className="py-4 text-neutral-700"><Editable value={c.fb} className="block" multiline placeholder="Giải thích khi chọn (tùy chọn)" onChange={(v) => upCur((x) => { x.choices[i].fb = v })} /></td>
                      <td className="py-4">{q.choices.length > 2 && <button onClick={() => upCur((x) => { x.choices.splice(i, 1); if (!x.choices.some((cc) => cc.ok)) x.choices[0].ok = true })} className="text-neutral-400 opacity-0 group-hover/c:opacity-100" title="Xóa lựa chọn"><Trash2 size={15} /></button>}</td>
                    </tr>))}</tbody>
                </table>
                <MiniBtn onClick={() => upCur((x) => { x.choices.push({ t: '', ok: false, fb: '' }) })} className="mt-2"><Plus size={13} />Thêm lựa chọn</MiniBtn>
              </>)}
              {q.type === 'fill' && <div className="mt-4 flex items-center gap-2 rounded-xl border border-line p-4 text-[14px]">Đáp án chấp nhận: <b className="font-mono"><Editable value={q.answer || ''} placeholder="Nhập đáp án" onChange={(v) => upCur((x) => { x.answer = v })} /></b> <span className="text-neutral-500">· không phân biệt hoa thường; nhiều đáp án cách nhau bằng dấu |</span></div>}
              {q.type === 'essay' && <div className="mt-4 rounded-xl border border-line p-5"><div className="flex items-center gap-2 font-semibold"><FileText size={16} />Rubric chấm (AI chấm nháp, người chấm xác nhận)</div><EditableList items={q.rubric?.length ? q.rubric : ['']} placeholder="Tiêu chí chấm" itemClass="block flex-1" onChange={(v) => upCur((x) => { x.rubric = v })} render={(el, i) => <div className="mt-3 flex gap-3 text-[14px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neutral-100 text-[12px] font-semibold">{i + 1}</span>{el}</div>} /><p className="mt-3 text-[12px] text-neutral-500">Enter để thêm tiêu chí, Backspace ở dòng trống để xóa.</p></div>}
              {q.type === 'code' && <CodeTests q={q} upCur={upCur} />}
            </div>
          )}
        </main>
      </div>
      <GenQuestions open={gen} onClose={() => setGen(false)} art={art} onAdd={(qs) => upQ((z) => { z.questions.push(...qs) })} />
    </div>
  )
}

export default function CourseEditor({ art, kit, up, saveText, onRestored }) {
  const { confirmBox } = useStore()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const [share, setShare] = useState(false)
  const [newL, setNewL] = useState('')
  const l = params.get('l') ?? params.get('lesson')
  const lesson = art.lessons.find((x) => x.id === l)
  if (lesson?.kind === 'quiz') return <QuizEditor art={art} up={up} onBack={() => setParams({})} />
  if (lesson) return <LessonEditor art={art} lesson={lesson} up={up} onBack={() => setParams({})} />
  const lessonCount = art.lessons.filter((x) => x.kind === 'lesson').length
  return (
    <div className="min-h-full pb-24">
      <ArtifactTop art={art} kit={kit} saveText={saveText} onRestored={onRestored} onShare={() => setShare(true)} onPreview={() => nav(`/preview/${art.id}`)} />
      <DraftBar art={art} />
      <div className="mx-auto max-w-[760px] px-6 pt-12">
        <h1 className="font-lato text-[44px] font-black leading-tight"><Editable value={art.title} onChange={(v) => up((a) => { a.title = v })} className="block" placeholder="Tên tài liệu" /></h1>
        <div className="mt-10 h-1 w-28 bg-brand" />
        <p className="mt-14 font-serif text-[17px] leading-[1.9] text-neutral-800"><Editable value={art.summary} multiline onChange={(v) => up((a) => { a.summary = v })} className="block" placeholder="Mô tả ngắn về tài liệu" /></p>
        <div className="mt-14">
          {art.lessons.map((x) => (
            <div key={x.id} className="group/l flex items-center gap-4 border-b border-line py-5">
              {x.kind === 'quiz' ? <HelpCircle size={20} /> : <AlignLeft size={20} />}
              <div className="min-w-0 flex-1"><div className="text-[18px] font-semibold">{x.kind === 'quiz' ? 'Bài kiểm tra' : <Editable value={x.title} className="block" placeholder="Tên bài học" onChange={(v) => up((a) => { a.lessons.find((y) => y.id === x.id).title = v })} />}</div><div className="text-[13px] text-neutral-500">{x.kind === 'quiz' ? `${art.quiz.mode === 'official' ? 'Thi chính thức' : 'Luyện tập'} · mức ${art.quiz.level} · ${art.quiz.questions.filter((y) => y.approved).length}/${art.quiz.questions.length} câu đã duyệt${art.quiz.proctor ? ' · có giám sát' : ''}` : `Bài học · ${x.blocks.length} khối${x.blocks.some((b) => b.t === 'gap') ? ' · có chỗ thiếu căn cứ' : ''}`}</div></div>
              {x.kind !== 'quiz' && <button title="Xóa bài" onClick={async () => { if (await confirmBox(`Xóa bài "${x.title}"?`, { ok: 'Xóa', danger: true })) up((a) => { a.lessons = a.lessons.filter((y) => y.id !== x.id) }) }} className="icon-btn h-8 w-8 opacity-0 group-hover/l:opacity-100"><Trash2 size={16} /></button>}
              <button className="btn-line btn-sm h-9" onClick={() => setParams({ l: x.id })}>{x.kind === 'quiz' ? 'Mở bài kiểm tra' : 'Mở bài học'}</button>
            </div>
          ))}
          {lessonCount < 3 && <div className="flex items-center gap-4 border-b border-line py-5">
            <span className="w-5 text-center text-neutral-400">•</span>
            <input value={newL} onChange={(e) => setNewL(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newL.trim()) { up((a) => { const qi = a.lessons.findIndex((x) => x.kind === 'quiz'); a.lessons.splice(qi < 0 ? a.lessons.length : qi, 0, { id: uid('l'), kind: 'lesson', title: newL, blocks: [] }) }); setNewL('') } }} className="flex-1 text-[18px] font-semibold outline-none placeholder:text-neutral-400" placeholder="Thêm bài học…" />
            <span className="text-[12px] text-neutral-400">Enter để thêm</span>
          </div>}
        </div>
      </div>
      <ShareModal open={share} art={art} onClose={() => setShare(false)} onChanged={onRestored} />
    </div>
  )
}
