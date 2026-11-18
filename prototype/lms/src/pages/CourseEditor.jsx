import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlignLeft, HelpCircle, ChevronLeft, ChevronDown, MessageSquare, Eye, Sparkles, Plus, Pencil, Palette, Ruler, ArrowUp, ArrowDown, Copy, Trash2, MoreHorizontal, X, AudioLines, Shuffle, ChevronRight, LayoutTemplate, Image as ImgIcon, MoreVertical, Check, ShieldCheck, Video, GripVertical, Code2, FileText, Wand2 } from 'lucide-react'
import { useStore, useRole, uid } from '../store'
import { SKILLS, LEVELS, FORMATS } from '../data'
import { Avatar, Tip, Drawer, Toggle, SrcChip, Modal } from '../ui'
import { BlockView, BLOCK_LIB } from '../blocks'
import { Editable, EditableList, MiniBtn } from '../edit'
import { ArtifactTop, ShareModal, AIPanel, ReviewBar, ThemePanel, AIFeedback } from './Common'

function LibPreview({ cat }) {
  const box = 'rounded-lg border border-line bg-white p-4'
  if (cat === 'ai') return (<div className="space-y-5">
    <div><div className="mb-2 text-[13px] text-neutral-600">Tạo khối bằng AI</div><div className={box}><div className="rounded-md bg-violet-50 px-3 py-2 text-[13px]">Bạn muốn tạo loại khối nào?</div><div className="mt-3 flex flex-wrap gap-1.5">{['Đoạn văn', 'Câu nhấn mạnh', 'Danh sách', 'Accordion', 'Tab', 'Quy trình', 'Sắp xếp', 'Thẻ ghi nhớ'].map((x) => <span key={x} className="rounded border border-line px-2 py-1 text-[12px]">{x}</span>)}</div></div></div>
    <div><div className="mb-2 text-[13px] text-neutral-600">Tạo video từ slide và giọng đọc AI</div><div className={`${box} grid h-28 place-items-center bg-gradient-to-br from-rose-50 to-violet-50`}><Video size={30} className="text-rose-500" /></div></div>
    <div><div className="mb-2 text-[13px] text-neutral-600">Tạo hoặc sửa ảnh</div><div className={`${box} grid h-28 place-items-center`}><ImgIcon size={30} className="text-amber-500" /></div></div>
    <div><div className="mb-2 text-[13px] text-neutral-600">Tạo giọng đọc AI</div><div className={`${box} flex items-center gap-2`}><AudioLines size={20} /><span className="text-[13px]">Giọng nữ miền Bắc · 1.0x</span></div></div>
  </div>)
  if (cat === 'kc') return (<div className="space-y-5">
    <div><div className="mb-2 text-[13px] text-neutral-600">Tạo câu hỏi kiểm tra bằng AI</div><div className={`${box} border-violet-300`}>{['Lựa chọn 1', 'Lựa chọn 2', 'Lựa chọn 3'].map((x, i) => <div key={x} className="flex items-center gap-2 py-1 text-[13px]"><span className={`h-3 w-3 rounded-full border ${i === 1 ? 'border-violet-500 bg-violet-500' : 'border-neutral-400'}`} />{x}</div>)}</div></div>
    {['Một đáp án', 'Nhiều đáp án', 'Điền vào chỗ trống', 'Ghép cặp'].map((x) => <div key={x}><div className="mb-2 text-[13px] text-neutral-600">{x}</div><div className={`${box} h-20`} /></div>)}
  </div>)
  if (cat === 'interactive') return (<div className="space-y-5">{['Accordion', 'Tab', 'Ảnh có chú thích', 'Quy trình', 'Dòng thời gian', 'Thẻ ghi nhớ', 'Sắp xếp', 'Tình huống'].map((x) => <div key={x}><div className="mb-2 text-[13px] text-neutral-600">{x}</div><div className={`${box} h-24`} /></div>)}</div>)
  return (<div className="space-y-5">{['Đoạn văn', 'Đoạn văn có tiêu đề', 'Tiêu đề phụ', 'Hai cột'].map((x) => <div key={x}><div className="mb-2 text-[13px] text-neutral-600">{x}</div><div className={`${box} h-20 space-y-2`}><div className="h-2 w-1/3 rounded bg-neutral-300" /><div className="h-2 w-full rounded bg-neutral-200" /><div className="h-2 w-5/6 rounded bg-neutral-200" /></div></div>)}</div>)
}

function BlockLibrary({ open, onClose, onPick }) {
  const [cat, setCat] = useState('ai')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40" onMouseDown={onClose}>
      <div className="fade absolute left-0 top-0 bottom-0 flex shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
        <div className="w-[240px] border-r border-line bg-white px-4 py-5">
          <div className="mb-4 flex items-center px-2 text-[20px] font-semibold">Thư viện khối<div className="flex-1" /><button onClick={onClose}><X size={18} /></button></div>
          {BLOCK_LIB.map(([k, l]) => <button key={k} onClick={() => setCat(k)} className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-[15px] ${cat === k ? 'bg-neutral-100 font-medium' : 'hover:bg-neutral-50'}`}>{k === 'ai' ? <Sparkles size={17} className="text-violet-600" /> : <span className="w-[17px]" />}{l}</button>)}
        </div>
        <div className="scroll-thin w-[280px] overflow-y-auto bg-neutral-100 p-5" onClick={() => onPick(cat)}><LibPreview cat={cat} /></div>
      </div>
    </div>
  )
}

function LessonEditor({ art, lesson, onBack }) {
  const { set, say } = useStore()
  const { role } = useRole()
  const [lib, setLib] = useState(null)
  const [aiMenu, setAiMenu] = useState(null)
  const [hover, setHover] = useState(null)
  const [ai, setAi] = useState(false)
  const nav = useNavigate()
  const li = art.lessons.findIndex((l) => l.id === lesson.id)
  const up = (fn) => set((d) => fn(d.artifacts[art.id].lessons[li]))
  const move = (i, dir) => up((l) => { const j = i + dir; if (j < 0 || j >= l.blocks.length) return; [l.blocks[i], l.blocks[j]] = [l.blocks[j], l.blocks[i]] })
  const insert = (at, cat) => {
    const id = uid('b')
    const NEW = {
      text: { id, t: 'para', p: '' }, statement: { id, t: 'heading', h: '', p: '' }, quote: { id, t: 'para', p: '' },
      list: { id, t: 'list', intro: '', items: [''] }, image: { id, t: 'image', img: 'office', cap: '' }, gallery: { id, t: 'image', img: 'meeting', cap: '' }, media: { id, t: 'image', img: 'screen', cap: '' },
      interactive: { id, t: 'accordion', h: '', p: '', items: [{ t: '', b: '' }] }, kc: { id, t: 'kc', q: '', choices: ['', '', ''], correct: 0 }, survey: { id, t: 'kc', q: '', choices: ['', ''], correct: 0 },
      chart: { id, t: 'table', head: ['Cột 1', 'Cột 2'], rows: [['', '']] }, divider: { id, t: 'para', p: '' },
    }
    const nb = cat === 'ai' && !/docker|volume/i.test(art.title) ? { id, t: 'heading', h: 'Nội dung AI soạn thêm', p: 'AI soạn đoạn này từ tài liệu nguồn của bộ đào tạo. Hãy rà lại trước khi chia sẻ.' }
      : cat === 'ai' ? { id, t: 'process', h: 'Khôi phục volume từ file sao lưu', steps: ['Tạo volume mới', 'Chạy container tạm gắn volume và thư mục sao lưu', 'Giải nén file .tar.gz vào volume'], src: 'Runbook-Backup-v2.docx · mục 3' }
      : NEW[cat] || NEW.text
    up((l) => l.blocks.splice(at, 0, nb)); setLib(null); say(cat === 'ai' ? 'AI đã tạo khối từ tài liệu nguồn' : 'Đã thêm khối. Bấm vào chữ để nhập nội dung.')
  }
  return (
    <div className="min-h-full pb-24">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-4">
        <button className="icon-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <span className="h-7 w-px bg-line" />
        <span className="max-w-[420px] truncate rounded-lg bg-neutral-100 px-3 py-1.5 text-[14px] font-semibold">{lesson.title || 'Bài chưa đặt tên'}</span>
        <div className="flex-1" />
        <Tip label="Xem trước" onClick={() => nav(`/preview/${art.id}?l=${lesson.id}`)}><Eye size={19} /></Tip>
        <Tip label="AI" onClick={() => setAi(true)}><Sparkles size={19} /></Tip>
        {role === 'author' && <AIFeedback key={art.id} name={FORMATS[art.type].name.toLowerCase()} />}
      </header>
      <div className="mx-auto max-w-[680px] px-6 pt-12">
        <h1 className="font-lato text-[40px] font-black leading-tight"><Editable value={lesson.title} onChange={(v) => up((l) => { l.title = v })} className="block" placeholder="Tên bài học" /></h1>
        <div className="mt-4 flex items-center gap-2 text-[14px] text-neutral-600"><Avatar size={30} />Nguyễn An<ChevronDown size={14} /></div>
        <div className="mt-10 h-1 w-28 bg-brand" />
      </div>
      <div className="mt-10 border-t border-line" />
      {lesson.blocks.length === 0 && <p className="mx-auto mt-10 max-w-[680px] px-6 text-[15px] text-neutral-500">Bài này chưa có nội dung. Bấm "Thêm khối" để bắt đầu.</p>}
      {lesson.blocks.map((b, i) => (
        <div key={b.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => { setHover(null) }} className={`relative border-b border-dashed py-10 ${hover === i ? 'border-neutral-300 bg-neutral-50/40' : 'border-transparent'}`}>
          {hover === i && <>
            <div className="absolute left-5 top-4 z-10 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-1 shadow-card">
              <Tip label="Công cụ AI" className="h-8 w-8" onClick={() => setAiMenu(aiMenu === i ? null : i)}><Sparkles size={16} className="text-violet-600" /></Tip>
            </div>
            <div className="absolute right-5 top-4 z-10 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-1 shadow-card">
              <Tip label="Lên" className="h-8 w-8" onClick={() => move(i, -1)}><ArrowUp size={16} /></Tip>
              <Tip label="Xuống" className="h-8 w-8" onClick={() => move(i, 1)}><ArrowDown size={16} /></Tip>
              <Tip label="Nhân đôi" className="h-8 w-8" onClick={() => up((l) => l.blocks.splice(i + 1, 0, { ...structuredClone(b), id: uid('b') }))}><Copy size={16} /></Tip>
              <Tip label="Xóa" className="h-8 w-8" onClick={() => up((l) => l.blocks.splice(i, 1))}><Trash2 size={16} /></Tip>
            </div>
          </>}
          {aiMenu === i && (
            <div className="fade absolute left-5 top-16 z-20 w-56 rounded-xl border border-line bg-white py-1.5 shadow-pop" onMouseLeave={() => setAiMenu(null)}>
              {[[Pencil, 'Sửa bằng AI', () => say('AI đã viết lại khối, giữ nguyên nguồn trích')], [AudioLines, 'Thêm giọng đọc AI', () => say('Đã tạo giọng đọc AI cho khối')], [Shuffle, 'Chuyển nhanh sang dạng khác', () => say('Đã chuyển sang dạng thẻ ghi nhớ')]].map(([I, l, fn]) => <button key={l} onClick={() => { fn(); setAiMenu(null) }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[14px] hover:bg-neutral-50"><I size={16} />{l}{l.startsWith('Chuyển') && <ChevronRight size={14} className="ml-auto" />}</button>)}
            </div>
          )}
          <BlockView b={b} editor onChange={(nb) => up((l) => { l.blocks[i] = nb })} />
          <button onClick={() => setLib(i + 1)} className={`absolute -bottom-4 left-1/2 z-10 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-ink text-white shadow transition ${hover === i ? 'opacity-100' : 'opacity-0'}`}><Plus size={16} /></button>
        </div>
      ))}
      <div className="mt-10 flex justify-center"><button onClick={() => setLib(lesson.blocks.length)} className="btn-line"><Plus size={16} />Thêm khối</button></div>
      <BlockLibrary open={lib !== null} onClose={() => setLib(null)} onPick={(cat) => insert(lib, cat)} />
      <AIPanel open={ai} onClose={() => setAi(false)} scope="bài học này" />
    </div>
  )
}

const QTYPE = { mc: 'Một đáp án', mr: 'Nhiều đáp án', fill: 'Điền chỗ trống', essay: 'Tự luận', code: 'Bài code' }

function QuizEditor({ art, onBack }) {
  const { S, set, say } = useStore()
  const nav = useNavigate()
  const [sel, setSel] = useState('settings')
  const [gen, setGen] = useState(false)
  const qz = art.quiz
  const upQ = (fn) => set((d) => fn(d.artifacts[art.id].quiz))
  const q = qz.questions.find((x) => x.id === sel)
  const upCur = (fn) => upQ((z) => fn(z.questions.find((x) => x.id === sel)))
  const lv = LEVELS.find((l) => l.v === qz.level)
  const approved = qz.questions.filter((x) => x.approved).length
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-4">
        <button className="icon-btn" onClick={onBack}><ChevronLeft size={20} /></button><span className="h-7 w-px bg-line" />
        <button className="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-1.5 text-[14px] font-semibold">Bài kiểm tra<ChevronDown size={15} /></button>
        <span className="chip bg-violet-50 text-violet-700">{SKILLS.find((s) => s.id === qz.skill)?.name} · Mức {qz.level}</span>
        <span className="text-[13px] text-neutral-500">{approved}/{qz.questions.length} câu trong ngân hàng đề</span>
        <div className="flex-1" />
        <Tip label="Xem trước" onClick={() => nav(`/preview/${art.id}?l=quiz`)}><Eye size={19} /></Tip>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="scroll-thin w-[340px] shrink-0 overflow-y-auto bg-neutral-100">
          <button onClick={() => setSel('settings')} className={`block w-full border-b border-line px-6 py-4 text-left text-[16px] ${sel === 'settings' ? 'bg-white font-semibold' : ''}`}>Màn mở đầu và cài đặt</button>
          <div className="px-6 pt-5 pb-2 text-[13px] font-bold tracking-wide">THỨ TỰ CÂU HỎI</div>
          {qz.questions.map((x, i) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={`flex w-full items-start gap-2 border-b border-line px-3 py-3 text-left text-[14px] ${sel === x.id ? 'border-l-4 border-l-ink bg-white' : 'hover:bg-white/60'}`}>
              <GripVertical size={15} className="mt-0.5 shrink-0 text-neutral-400" />
              <div className="flex-1"><div className="line-clamp-2">{x.q || <span className="text-neutral-400">Câu hỏi chưa có nội dung</span>}</div><div className="mt-1 flex gap-1.5"><span className="chip bg-white">{QTYPE[x.type]}</span><span className="chip bg-white">Mức {x.level}</span>{!x.approved && <span className="chip bg-amber-100 text-amber-700">Chưa vào ngân hàng đề</span>}</div></div>
              <span role="button" title="Xóa câu hỏi" onClick={(e) => { e.stopPropagation(); upQ((z) => { z.questions = z.questions.filter((y) => y.id !== x.id) }); if (sel === x.id) setSel('settings') }} className="shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-red-600"><Trash2 size={15} /></span>
            </button>
          ))}
          <div className="space-y-2 p-4">
            <button onClick={() => setGen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300 bg-white py-2.5 text-[14px] font-semibold text-violet-700"><Wand2 size={16} />Sinh thêm câu bằng AI</button>
            <button onClick={() => { const n = { id: uid('q'), type: 'mc', level: 1, approved: false, q: '', choices: [{ t: '', ok: true, fb: '' }, { t: '', ok: false, fb: '' }] }; upQ((z) => z.questions.push(n)); setSel(n.id) }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white py-2.5 text-[14px] font-semibold"><Plus size={16} />Thêm câu hỏi</button>
          </div>
        </aside>
        <main className="scroll-thin flex-1 overflow-y-auto">
          {sel === 'settings' ? (
            <div className="mx-auto max-w-[720px] px-8 py-12">
              <h1 className="font-lato text-[44px] font-black">Bài kiểm tra</h1>
              <div className="mt-4 flex items-center gap-2 text-[14px] text-neutral-600"><Avatar size={30} />Nguyễn An</div>
              <div className="mt-8 h-1 w-28 bg-brand" />
              <p className="mt-8 font-serif text-[17px] text-neutral-500">Bài kiểm tra cho kỹ năng {SKILLS.find((s) => s.id === qz.skill)?.name}, mức {qz.level}. Mỗi người nhận một đề riêng rút từ ngân hàng đề.</p>
              <div className="card mt-10 divide-y divide-line">
                <div className="flex items-center gap-4 px-5 py-4"><div className="flex-1"><div className="font-semibold">Loại bài</div><div className="text-[13px] text-neutral-600">Chỉ bài thi chính thức đạt mới gửi kết quả sang Quản trị nhân tài</div></div>
                  <div className="flex rounded-lg bg-neutral-100 p-1 text-[14px]">{[['practice', 'Luyện tập'], ['official', 'Thi chính thức']].map(([k, l]) => <button key={k} onClick={() => upQ((z) => { z.mode = k; if (k === 'practice') z.proctor = false })} className={`rounded-md px-3 py-1.5 ${qz.mode === k ? 'bg-white font-semibold shadow-card' : 'text-neutral-600'}`}>{l}</button>)}</div></div>
                <div className="flex items-center gap-4 px-5 py-4"><div className="flex-1"><div className="font-semibold">Mức kỹ năng</div><div className="text-[13px] text-neutral-600">Dạng bài theo mức: {lv.kinds}. Mức 4–5 đánh giá qua dự án, không thi trên LMS.</div></div>
                  <select className="field w-28 py-1.5" value={qz.level} onChange={(e) => upQ((z) => { z.level = +e.target.value })}>{LEVELS.map((l) => <option key={l.v} value={l.v}>Mức {l.v}</option>)}</select></div>
                {[['Điểm đạt', 'passScore', '%'], ['Số lượt thi', 'attempts', 'lượt'], ['Thời gian', 'minutes', 'phút']].map(([l, k, u]) => (
                  <div key={k} className="flex items-center gap-4 px-5 py-4"><div className="flex-1 font-semibold">{l}</div><input type="number" className="field w-24 py-1.5 text-right" value={qz[k]} onChange={(e) => upQ((z) => { z[k] = +e.target.value })} /><span className="w-10 text-[14px] text-neutral-600">{u}</span></div>
                ))}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-4"><ShieldCheck size={20} /><div className="flex-1"><div className="font-semibold">Giám sát khi thi</div><div className="text-[13px] text-neutral-600">Chỉ bật được cho bài thi chính thức</div></div><Toggle on={qz.proctor} disabled={qz.mode !== 'official'} onChange={(v) => upQ((z) => { z.proctor = v })} /></div>
                  {qz.proctor && <div className="ml-9 mt-3 rounded-xl bg-neutral-50 p-3 text-[13px] leading-relaxed text-neutral-700">
                    · Người thi thấy rõ những gì được ghi lại và phải bấm đồng ý trước khi vào thi.<br />· AI chỉ gắn cờ: rời khỏi khung hình, có người thứ hai, chuyển tab, dán từ ngoài vào. Mỗi cờ có mốc thời gian.<br />· Người chấm xem lại rồi quyết định. AI không tự hủy bài, không tự trừ điểm.<br />· Bản ghi tự xóa sau 30 ngày, trừ bài đang được xem xét.<br />· AI Tutor tắt trong lúc thi.</div>}
                </div>
              </div>
            </div>
          ) : q && (
            <div className="mx-auto max-w-[900px] px-8 py-6">
              <div className="flex items-center gap-2">
                <button onClick={() => say('AI đã viết lại câu hỏi, giữ nguyên nguồn')} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[14px] font-medium"><Sparkles size={15} className="text-violet-600" />Sửa bằng AI</button>
                <div className="flex-1" />
                {q.approved ? <span className="flex items-center gap-1.5 text-[14px] font-semibold text-emerald-700"><Check size={16} />Đã vào ngân hàng đề</span>
                  : <button onClick={() => { upQ((z) => { z.questions.find((x) => x.id === q.id).approved = true }); say('Câu hỏi đã vào ngân hàng') }} className="btn-dark btn-sm h-9"><Check size={15} />Thêm vào ngân hàng đề</button>}
              </div>
              <div className="mt-6 flex gap-4">
                <span className="font-lato text-[22px] italic text-neutral-400">{String(qz.questions.indexOf(q) + 1).padStart(2, '0')}</span>
                <div className="flex-1 border-b border-line pb-2 text-[17px] font-medium"><Editable value={q.q} multiline className="block" placeholder="Nhập câu hỏi" onChange={(v) => upCur((x) => { x.q = v })} /></div>
                <div className="flex gap-1"><Tip label="Ảnh"><ImgIcon size={18} /></Tip><Tip label="Giọng đọc AI"><AudioLines size={18} className="text-violet-600" /></Tip></div>
              </div>
              <div className="mt-2 flex items-center gap-2"><SrcChip src={q.src} /><span className="chip">Mức {q.level}</span></div>
              <div className="mt-6 flex justify-end"><select className="rounded-lg px-2 py-1 text-[14px] font-semibold outline-none hover:bg-neutral-100" value={q.type} onChange={(e) => upCur((x) => { const t = e.target.value; x.type = t; if ((t === 'mc' || t === 'mr') && !x.choices) x.choices = [{ t: '', ok: true, fb: '' }, { t: '', ok: false, fb: '' }]; if (t === 'essay' && !x.rubric) x.rubric = ['']; if (t === 'code' && !x.tests) x.tests = ['']; if (t === 'fill' && x.answer == null) x.answer = '' })}>{Object.entries(QTYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              {(q.type === 'mc' || q.type === 'mr') && q.choices && (
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
              )}
              {(q.type === 'mc' || q.type === 'mr') && q.choices && (
                <MiniBtn onClick={() => upCur((x) => { x.choices.push({ t: '', ok: false, fb: '' }) })} className="mt-2"><Plus size={13} />Thêm lựa chọn</MiniBtn>
              )}
              {q.type === 'fill' && <div className="mt-4 flex items-center gap-2 rounded-xl border border-line p-4 text-[14px]">Đáp án chấp nhận: <b className="font-mono"><Editable value={q.answer || ''} placeholder="Nhập đáp án" onChange={(v) => upCur((x) => { x.answer = v })} /></b> <span className="text-neutral-500">· không phân biệt hoa thường</span></div>}
              {q.type === 'essay' && <div className="mt-4 rounded-xl border border-line p-5"><div className="flex items-center gap-2 font-semibold"><FileText size={16} />Rubric chấm (AI chấm nháp, người chấm xác nhận)</div><EditableList items={q.rubric?.length ? q.rubric : ['']} placeholder="Tiêu chí chấm" itemClass="block flex-1" onChange={(v) => upCur((x) => { x.rubric = v })} render={(el, i) => <div className="mt-3 flex gap-3 text-[14px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neutral-100 text-[12px] font-semibold">{i + 1}</span>{el}</div>} /><p className="mt-3 text-[12px] text-neutral-500">Enter để thêm tiêu chí, Backspace ở dòng trống để xóa.</p></div>}
              {q.type === 'code' && <div className="mt-4 rounded-xl border border-line p-5"><div className="flex items-center gap-2 font-semibold"><Code2 size={16} />Test case (quyết định đạt hay không)</div><EditableList items={q.tests?.length ? q.tests : ['']} placeholder="Test case" itemClass="block flex-1" onChange={(v) => upCur((x) => { x.tests = v })} render={(el) => <div className="mt-3 flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2 font-mono text-[13px]"><Check size={14} className="text-emerald-600" />{el}</div>} /><p className="mt-3 text-[13px] text-neutral-500">AI chỉ nhận xét chất lượng code (đặt tên, cấu trúc, xử lý lỗi), không quyết định đạt.</p></div>}
            </div>
          )}
        </main>
      </div>
      <Modal open={gen} onClose={() => setGen(false)} title="Sinh thêm câu bằng AI" sub="AI soạn nháp câu hỏi, đáp án, giải thích. Mỗi câu gắn nguồn, bạn chọn câu nào đưa vào ngân hàng đề." w={540}
        footer={<button className="btn-dark h-10" onClick={() => { if (!/docker|volume/i.test(art.title)) { upQ((z) => { z.questions.push({ id: uid('q'), type: 'mc', level: qz.level, approved: false, q: 'Câu hỏi nháp do AI soạn từ tài liệu nguồn', choices: [{ t: 'Lựa chọn đúng', ok: true, fb: '' }, { t: 'Lựa chọn sai', ok: false, fb: '' }] }) }); setGen(false); say('Đã thêm 1 câu nháp, chưa vào ngân hàng đề'); return } upQ((z) => { z.questions.push({ id: uid('q'), type: 'mc', level: qz.level, approved: false, q: 'Bind mount gõ sai đường dẫn trên máy chủ thì điều gì xảy ra?', src: 'Docker-Volumes-NoiBo.pdf · mục 4', choices: [{ t: 'Docker báo lỗi và dừng', ok: false, fb: 'Docker không báo lỗi trong trường hợp này.' }, { t: 'Docker tạo thư mục rỗng mới', ok: true, fb: 'Đúng. Ứng dụng sẽ thấy thư mục rỗng.' }, { t: 'Dữ liệu tự chuyển sang volume', ok: false, fb: 'Không có cơ chế tự chuyển.' }] }, { id: uid('q'), type: 'essay', level: qz.level, approved: false, q: 'Đồng nghiệp định chạy docker volume prune trên máy chủ dùng chung. Bạn khuyên gì và vì sao?', src: 'Docker-Volumes-NoiBo.pdf · mục 4', rubric: ['Nêu rủi ro xóa volume không gắn container', 'Đề xuất kiểm tra danh sách trước', 'Đề xuất sao lưu trước khi xóa'] }) }); setGen(false); say('Đã thêm 2 câu nháp, chưa vào ngân hàng đề') }}><Sparkles size={16} />Sinh 2 câu</button>}>
        <div className="grid grid-cols-2 gap-3 text-[14px]">
          <div><div className="mb-1 font-medium">Mức</div><select className="field py-2" defaultValue={qz.level}>{LEVELS.map((l) => <option key={l.v}>Mức {l.v}</option>)}</select></div>
          <div><div className="mb-1 font-medium">Số câu</div><input className="field py-2" defaultValue={2} /></div>
          <div className="col-span-2"><div className="mb-1 font-medium">Tài liệu nguồn</div><div className="space-y-1">{(S.kits.find((k) => k.id === art.kitId)?.sources.map((x) => x.name) || []).map((s) => <label key={s} className="flex items-center gap-2"><input type="checkbox" defaultChecked />{s}</label>)}</div></div>
          <div className="col-span-2"><div className="mb-1 font-medium">Trọng tâm</div><input className="field py-2" placeholder="Ví dụ: lỗi hay gặp khi dọn dẹp volume" /></div>
        </div>
      </Modal>
    </div>
  )
}

export default function CourseEditor({ art, kit }) {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const { set } = useStore()
  const [share, setShare] = useState(false)
  const [ai, setAi] = useState(false)
  const [theme, setTheme] = useState(false)
  const [newL, setNewL] = useState('')
  const upA = (fn) => set((d) => fn(d.artifacts[art.id]))
  const l = params.get('l')
  const lesson = art.lessons.find((x) => x.id === l)
  if (lesson?.kind === 'quiz') return <QuizEditor art={art} onBack={() => setParams({})} />
  if (lesson) return <LessonEditor art={art} lesson={lesson} onBack={() => setParams({})} />
  return (
    <div className="min-h-full pb-24">
      <ArtifactTop art={art} kit={kit} onShare={() => setShare(true)} onAI={() => setAi(true)} onTheme={() => setTheme(true)} onPreview={() => nav(`/preview/${art.id}`)} />
      <ReviewBar art={art} />
      <div className="mx-auto max-w-[760px] px-6 pt-12">
        <h1 className="font-lato text-[44px] font-black leading-tight"><Editable value={art.title} onChange={(v) => upA((a) => { a.title = v })} className="block" placeholder="Tên tài liệu" /></h1>
        <div className="mt-4 flex items-center gap-2 text-[14px] text-neutral-600"><Avatar size={32} />Nguyễn An<ChevronDown size={14} /></div>
        <div className="mt-10 h-1 w-28 bg-brand" />
        <p className="mt-14 font-serif text-[17px] leading-[1.9] text-neutral-800"><Editable value={art.summary} multiline onChange={(v) => upA((a) => { a.summary = v })} className="block" placeholder="Mô tả ngắn về tài liệu" /></p>
        <div className="mt-14">
          {art.lessons.map((x) => (
            <div key={x.id} className="group/l flex items-center gap-4 border-b border-line py-5">
              {x.kind === 'quiz' ? <HelpCircle size={20} /> : <AlignLeft size={20} />}
              <div className="min-w-0 flex-1"><div className="text-[18px] font-semibold">{x.kind === 'quiz' ? 'Bài kiểm tra' : <Editable value={x.title} className="block" placeholder="Tên bài học" onChange={(v) => upA((a) => { a.lessons.find((y) => y.id === x.id).title = v })} />}</div><div className="text-[13px] text-neutral-500">{x.kind === 'quiz' ? `${art.quiz.mode === 'official' ? 'Thi chính thức' : 'Luyện tập'} · mức ${art.quiz.level} · ${art.quiz.questions.length} câu${art.quiz.proctor ? ' · có giám sát' : ''}` : `Bài học · ${x.blocks.length} khối`}</div></div>
              {x.kind !== 'quiz' && <button title="Xóa bài" onClick={() => upA((a) => { a.lessons = a.lessons.filter((y) => y.id !== x.id) })} className="icon-btn h-8 w-8 opacity-0 group-hover/l:opacity-100"><Trash2 size={16} /></button>}
              <button className="btn-line btn-sm h-9" onClick={() => setParams({ l: x.id })}>{x.kind === 'quiz' ? 'Mở bài kiểm tra' : 'Mở bài học'}</button>
            </div>
          ))}
          <div className="flex items-center gap-4 border-b border-line py-5">
            <span className="w-5 text-center text-neutral-400">•</span>
            <input value={newL} onChange={(e) => setNewL(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newL.trim()) { set((d) => { const a = d.artifacts[art.id]; const qi = a.lessons.findIndex((x) => x.kind === 'quiz'); a.lessons.splice(qi < 0 ? a.lessons.length : qi, 0, { id: uid('l'), kind: 'lesson', title: newL, blocks: [] }) }); setNewL('') } }} className="flex-1 text-[18px] font-semibold outline-none placeholder:text-neutral-400" placeholder="Thêm bài học hoặc tiêu đề bài kiểm tra…" />
            <span className="text-[12px] text-neutral-400">Enter để thêm</span>
          </div>
        </div>
      </div>
      <ShareModal open={share} art={art} onClose={() => setShare(false)} />
      <AIPanel open={ai} onClose={() => setAi(false)} />
      <ThemePanel open={theme} onClose={() => setTheme(false)} />
    </div>
  )
}
