import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal, X, Plus, ChevronDown, Home, User, ListChecks, Type, Pencil, ZoomIn, ZoomOut, Trophy, CheckCircle2, XCircle, MinusCircle, ChevronRight, RotateCcw, Play, Pause, Trash2, StickyNote, Sparkles, AudioLines, RefreshCw, Flag, Film, FileText, ChevronLeft, Captions } from 'lucide-react'
import { useStore, uid } from '../store'
import { fmtTime } from '../data'
import { Avatar, Modal, Tip, Thumb } from '../ui'
import { ArtifactTop, ShareModal, DraftBar } from './Common'
import { post } from '../api'

// Cho phép mã soạn cũ dạng set(d => d.artifacts[art.id]...) ghi vào bản nháp đang mở
const artSet = (art, up) => (fn) => up((a) => fn({ artifacts: { [art.id]: a } }))
import { Editable, MiniBtn } from '../edit'
import { Slide, SlideCanvas } from './SlideKit'

/* ================= TÌNH HUỐNG ================= */

// Mức của lựa chọn: good / neutral / bad. Giá trị lạ (dữ liệu cũ) hiển thị như neutral để màn không vỡ
const OK = { good: [CheckCircle2, 'text-emerald-600'], bad: [XCircle, 'text-red-500'], neutral: [MinusCircle, 'text-neutral-400'] }

function Portrait({ mood = 0, className = '', img = 'person' }) {
  return (
    <Thumb img={img} pos="center 25%" className={className}>
      <div className={`absolute inset-0 ring-inset transition ${mood > 0 ? 'ring-[6px] ring-emerald-400' : mood < 0 ? 'ring-[6px] ring-red-400' : ''}`} />
      <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/50 to-transparent pb-4 pt-10">
        <span className="rounded-full bg-white/90 px-3 py-1 text-[13px] font-semibold text-slate-700">{mood > 0 ? 'Hài lòng' : mood < 0 ? 'Lo ngại' : 'Đang lắng nghe'}</span>
      </div>
    </Thumb>
  )
}

export function ScenarioPlay({ art, onExit }) {
  // Mọi thẻ trước lựa chọn trong cảnh: lời nhân vật hoặc lời dẫn
  const linesOf = (i) => (art.scenes[i]?.cards || []).filter((c) => c.kind !== 'decision' && c.text).map((c) => [c.kind === 'text' ? 'note' : 'char', c.text])
  const [scene, setScene] = useState(0)
  const [log, setLog] = useState(() => linesOf(0))
  const [mood, setMood] = useState(0)
  const [busy, setBusy] = useState(false)
  const [score, setScore] = useState([])
  const bottom = useRef(null)
  const lock = useRef(false)
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [log, busy])
  const sc = art.scenes[scene]
  const dec = sc?.cards.find((c) => c.kind === 'decision')
  const pick = (c) => {
    if (lock.current) return
    lock.current = true; setBusy(true); setScore((x) => [...x, c.ok])
    setLog((l) => [...l, ['me', c.t]])
    setTimeout(() => { setLog((l) => [...l, ['char', c.reply]]); setMood(c.ok === 'good' ? 1 : c.ok === 'bad' ? -1 : 0) }, 700)
    setTimeout(() => { const n = scene + 1; setScene(n); setLog((l) => [...l, ...linesOf(n)]); setBusy(false); lock.current = false }, 2000)
  }
  const reset = () => { setScene(0); setLog(linesOf(0)); setMood(0); setScore([]); setBusy(false); lock.current = false }
  const end = scene >= art.scenes.length || !dec
  const good = score.filter((x) => x === 'good').length
  return (
    <div className="grid h-full min-h-0 grid-cols-[1fr_520px] overflow-hidden bg-[#111]">
      <Portrait mood={mood} img={art.character.img} className="h-full min-h-0" />
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center gap-3 p-3 text-[12px] text-white/60"><span className="flex-1 pl-3">{art.character.name} · {art.character.role}</span><span>Cảnh {Math.min(scene + 1, art.scenes.length)}/{art.scenes.length}</span><button onClick={reset} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"><RotateCcw size={15} /></button></div>
        <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
          {log.map(([w, t], i) => w === 'note' ? <div key={i} className="fade px-6 text-center font-serif text-[14px] italic text-neutral-400">{t}</div> : (
            <div key={i} className={`flex ${w === 'me' ? 'justify-end' : ''}`}><div className="max-w-[80%]">{w === 'char' && <div className="mb-1 text-[12px] text-neutral-400">{art.character.name}</div>}
              <div className={`fade rounded-xl px-4 py-3 font-serif text-[15px] leading-relaxed ${w === 'me' ? 'bg-white text-ink' : 'bg-[#2a2a2a] text-neutral-100'}`}>{t}</div></div></div>
          ))}
          {busy && <div className="flex gap-1.5 px-1 py-2">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-white/50" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>}
          <div ref={bottom} />
        </div>
        <div className="border-t border-white/10 p-5">
          {end ? (
            <div className="text-center text-white"><Trophy size={28} className="mx-auto text-amber-400" /><div className="mt-2 font-lato text-[18px] font-bold">Hoàn thành tình huống</div>{score.length > 0 && <div className="mt-1 text-[13px] text-white/70">Chọn tốt nhất {good}/{score.length} lần{good < score.length && ' · thử lại để xem các nhánh khác'}</div>}<div className="mt-3 flex justify-center gap-2"><button onClick={reset} className="rounded-full border border-white/30 px-5 py-2 text-[14px] font-bold">Chơi lại</button><button onClick={onExit} className="rounded-full bg-brand px-6 py-2 text-[14px] font-bold">Quay lại</button></div></div>
          ) : (<>
            <div className="mb-3 text-[14px] font-semibold text-white">Chọn câu trả lời tốt nhất…</div>
            {dec.choices.map((c, ci) => <button key={ci} disabled={busy} onClick={() => pick(c)} className="mb-2.5 disabled:opacity-40 flex w-full items-center gap-3 rounded-xl border border-white/25 px-4 py-3 text-left font-serif text-[14px] text-neutral-100 hover:bg-white/10">{c.t}<span className="ml-auto">↑</span></button>)}
          </>)}
        </div>
      </div>
    </div>
  )
}

export function ScenarioEditor({ art, kit, up, saveText, onRestored }) {
  const set = artSet(art, up)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('edit')
  const [sel, setSel] = useState('sc1')
  const [addMenu, setAddMenu] = useState(false)
  const [exp, setExp] = useState(false)
  const [share, setShare] = useState(false)
  const [zoom, setZoom] = useState(80)
  const [picked, setPicked] = useState('c1')
  const sc = art.scenes.find((s) => s.id === sel) || art.scenes[0]
  const si = art.scenes.indexOf(sc)
  const upSc = (fn) => set((d) => fn(d.artifacts[art.id].scenes[si]))
  const upA = (fn) => set((d) => fn(d.artifacts[art.id]))

  if (!open) return (
    <div className="min-h-full">
      <ArtifactTop art={art} kit={kit} saveText={saveText} onRestored={onRestored} onShare={() => setShare(true)} onPreview={() => { setOpen(true); setMode('preview') }} />
      <DraftBar art={art} />
      <div className="bg-brand px-[22%] pb-36 pt-16"><h1 className="font-lato text-[48px] font-black"><Editable value={art.title} className="block" placeholder="Tên tình huống" onChange={(v) => upA((a) => { a.title = v })} /></h1><div className="mt-4 flex items-center gap-2 font-lato font-bold"><Avatar size={38} />Nguyễn An<ChevronDown size={14} /></div></div>
      <div className="relative bg-gradient-to-b from-slate-700 to-slate-500 px-24 pb-14">
        <div className="group relative -mt-24 flex overflow-hidden rounded-2xl bg-white shadow-pop">
          <Portrait img={art.character.img} className="h-[340px] w-[44%]" />
          <div className="flex-1 p-10"><h2 className="font-lato text-[30px] font-bold">{art.title}</h2><p className="mt-4 font-serif text-[17px] leading-relaxed text-neutral-700"><Editable value={art.intro ?? `Trong tình huống này, một ${art.learner.toLowerCase()} cùng ${art.character.name} xử lý lỗi mất dữ liệu do cấu hình Docker volume sai. Người học phải chọn loại volume và cách sao lưu phù hợp.`} multiline className="block" placeholder="Giới thiệu tình huống cho người học" onChange={(v) => upA((a) => { a.intro = v })} /></p>
            <div className="mt-3 flex flex-wrap items-center gap-1 text-[13px] text-neutral-500">Nhân vật: <b className="text-ink"><Editable value={art.character.name} placeholder="Tên" onChange={(v) => upA((a) => { a.character.name = v })} /></b> · <Editable value={art.character.role} placeholder="Vai trò" onChange={(v) => upA((a) => { a.character.role = v })} /></div>
            <button onClick={() => { setOpen(true); setMode('preview') }} className="mt-6 rounded-full border-2 border-ink bg-brand px-14 py-2.5 font-lato text-[14px] font-bold">Bắt đầu</button></div>
          <button onClick={() => { setOpen(true); setMode('edit') }} className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold shadow-card"><Pencil size={14} />Sửa các cảnh</button>
        </div>
      </div>
      <ShareModal open={share} art={art} onClose={() => setShare(false)} onChanged={onRestored} />
    </div>
  )

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
        <span className="text-[15px] text-neutral-500">Tình huống:</span><span className="text-[15px] font-semibold">{art.title}</span>
        <div className="flex-1" />
        <button onClick={() => setExp(true)} className="btn-line btn-sm h-9"><SlidersHorizontal size={15} />Trải nghiệm</button>
        <div className="flex rounded-lg bg-neutral-100 p-1 text-[14px]">{[['edit', 'Sửa'], ['preview', 'Xem trước']].map(([k, l]) => <button key={k} onClick={() => setMode(k)} className={`rounded-md px-4 py-1.5 ${mode === k ? 'bg-white font-semibold shadow-card' : 'text-neutral-500'}`}>{l}</button>)}</div>
        <button className="icon-btn" onClick={() => setOpen(false)}><X size={20} /></button>
      </header>
      {mode === 'preview' ? <div className="flex-1 overflow-hidden"><ScenarioPlay art={art} onExit={() => setMode('edit')} /></div> : (
        <div className="flex flex-1 overflow-hidden p-3">
          <aside className="scroll-thin w-[290px] shrink-0 overflow-y-auto rounded-l-xl border border-line bg-white px-3 py-4">
            <div className="mb-3 flex items-center px-1 text-[16px] font-semibold">Cảnh<div className="flex-1" /><X size={16} /></div>
            <div className="mb-1 flex gap-2.5 rounded-lg bg-neutral-100 px-3 py-2.5"><Play size={16} className="mt-0.5" /><div><div className="text-[14px] font-semibold">Bắt đầu</div><div className="text-[12px] text-neutral-500">Giới thiệu tình huống</div></div></div>
            {art.scenes.map((s, i) => (
              <div key={s.id}>
                <button onClick={() => setSel(s.id)} className={`mt-1 flex w-full gap-2 rounded-lg border px-3 py-2.5 text-left ${sel === s.id ? 'border-violet-500' : 'border-transparent hover:bg-neutral-50'}`}>
                  {sel === s.id ? <ChevronDown size={15} className="mt-0.5" /> : <ChevronRight size={15} className="mt-0.5" />}
                  <div className="min-w-0"><div className="text-[14px] font-semibold">Cảnh {i + 1}: {s.title || 'Chưa đặt tên'}</div><div className="truncate text-[12px] text-neutral-500">{s.goal || s.cards.find((c) => c.text)?.text || 'Chưa có nội dung'}</div></div>
                </button>
                {sel === s.id && <div className="ml-7 mt-1 space-y-0.5">{s.cards.map((c) => <button key={c.id} onClick={() => setPicked(c.id)} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] ${picked === c.id ? 'bg-violet-50' : 'hover:bg-neutral-50'}`}>{c.kind === 'char' ? <User size={13} /> : c.kind === 'decision' ? <ListChecks size={13} /> : <Type size={13} />}<span className="truncate">{(c.kind === 'decision' ? c.choices?.[0]?.t : c.text) || <i className="text-neutral-400">Chưa có nội dung</i>}</span></button>)}</div>}
              </div>
            ))}
            <button onClick={() => set((d) => { d.artifacts[art.id].scenes.push({ id: uid('sc'), title: `Cảnh ${art.scenes.length + 1}`, goal: '', cards: [{ id: uid('c'), kind: 'char', text: '' }, { id: uid('c'), kind: 'decision', choices: [{ t: '', ok: 'good', reply: '' }, { t: '', ok: 'bad', reply: '' }] }] }) })} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium hover:bg-neutral-50"><Plus size={15} />Thêm cảnh</button>
          </aside>
          <div className="dots relative flex-1 overflow-hidden rounded-r-xl border border-l-0 border-line">
            <div className="absolute left-4 top-4 z-10 w-[320px] rounded-xl border border-line bg-white shadow-card"><div className="flex items-center gap-2 border-b border-line px-3 py-2.5 text-[15px] font-semibold"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px]">{si + 1}</span><Editable value={sc.title} className="flex-1" placeholder="Tên cảnh" onChange={(v) => upSc((x) => { x.title = v })} />{art.scenes.length > 1 && <button title="Xóa cảnh" onClick={() => { const nx = art.scenes[si === 0 ? 1 : si - 1].id; set((d) => { d.artifacts[art.id].scenes.splice(si, 1) }); setSel(nx) }} className="text-neutral-400 hover:text-red-600"><Trash2 size={14} /></button>}</div><div className="flex items-start gap-2 px-3 py-2.5 text-[13px] font-medium"><Trophy size={14} className="mt-0.5 shrink-0 text-amber-600" />Mục tiêu:<Editable value={sc.goal} className="flex-1" placeholder="Người học cần làm được gì ở cảnh này" onChange={(v) => upSc((x) => { x.goal = v })} /></div></div>
            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
              <button onClick={() => setAddMenu(!addMenu)} className="btn-dark h-10 px-5"><Plus size={17} />Thêm thẻ<ChevronDown size={15} /></button>
              {addMenu && <div className="fade mt-2 w-44 rounded-xl border border-line bg-white py-2 shadow-pop">
                <div className="px-3 pb-1 text-[12px] font-semibold text-neutral-500">Thêm thẻ</div>
                {[['char', 'Nhân vật', User, 'bg-sky-500'], ['text', 'Văn bản', Type, 'bg-emerald-500'], ['decision', 'Lựa chọn', ListChecks, 'bg-violet-500']].map(([k, l, I, c]) => <button key={k} onClick={() => { upSc((s) => s.cards.push(k === 'decision' ? { id: uid('c'), kind: 'decision', choices: [{ t: '', ok: 'good', reply: '' }, { t: '', ok: 'bad', reply: '' }] } : { id: uid('c'), kind: k, text: '' })); setAddMenu(false) }} className="flex w-full items-center gap-2.5 px-3 py-2 text-[14px] hover:bg-neutral-50"><span className={`grid h-5 w-5 place-items-center rounded ${c} text-white`}><I size={12} /></span>{l}</button>)}
              </div>}
            </div>
            <div className="absolute right-4 top-4 z-10 flex gap-1"><button className="icon-btn bg-white shadow-card" onClick={() => setZoom((z) => Math.max(50, z - 10))}><ZoomOut size={17} /></button><button className="icon-btn bg-white shadow-card" onClick={() => setZoom((z) => Math.min(150, z + 10))}><ZoomIn size={17} /></button></div>
            <div className="absolute inset-0 origin-top-left" style={{ transform: `scale(${zoom / 100})` }}>
              {(() => {
                const X = (i) => 300 + i * 400, Y = 170
                // Xếp như lúc người học chơi: lời thoại, lời dẫn trước; lựa chọn cuối cùng
                const order = [...sc.cards.filter((c) => c.kind !== 'decision'), ...sc.cards.filter((c) => c.kind === 'decision')]
                const di = order.findIndex((c) => c.kind === 'decision')
                const upCard = (id, fn) => upSc((x) => fn(x.cards.find((c) => c.id === id)))
                return <>
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: 'visible' }}>
                    <path d={`M 250 ${Y + 40} L 300 ${Y + 40}`} stroke="#c4b5fd" strokeWidth="2" fill="none" />
                    {order.slice(1).map((_, i) => <path key={i} d={`M ${X(i) + 350} ${Y + 40} L ${X(i + 1)} ${Y + 40}`} stroke="#c4b5fd" strokeWidth="2" fill="none" />)}
                    {di >= 0 && order[di].choices.map((_, i) => <path key={i} d={`M ${X(di) + 350} ${Y + 80 + i * 110} C ${X(di) + 380} ${Y + 80 + i * 110}, ${X(di) + 380} ${Y + 40 + i * 70}, ${X(di) + 410} ${Y + 40 + i * 70}`} stroke="#c4b5fd" strokeWidth="2" fill="none" />)}
                  </svg>
                  <div className="absolute flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] font-semibold shadow-card" style={{ left: 30, top: Y + 18 }}><Home size={16} />Bắt đầu cảnh<span className="ml-2 h-3 w-3 rounded-full border-2 border-violet-500 bg-violet-200" /></div>
                  {order.map((c, idx) => {
                    const [bg, I, label] = c.kind === 'char' ? ['bg-sky-500', User, 'Nhân vật nói'] : c.kind === 'text' ? ['bg-emerald-500', Type, 'Lời dẫn'] : ['bg-violet-500', ListChecks, 'Người học chọn']
                    return (
                      <div key={c.id} onClick={() => setPicked(c.id)} className={`group/k absolute w-[350px] rounded-2xl border bg-white shadow-card ${picked === c.id ? 'border-violet-500' : 'border-line'}`} style={{ left: X(idx), top: Y }}>
                        <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[14px] font-semibold"><span className={`grid h-6 w-6 place-items-center rounded text-white ${bg}`}><I size={14} /></span>{idx + 1}. {label}<div className="flex-1" />
                          {sc.cards.length > 1 && <button title="Xóa thẻ" onClick={(e) => { e.stopPropagation(); upSc((x) => { x.cards = x.cards.filter((k) => k.id !== c.id) }) }} className="text-neutral-400 opacity-0 hover:text-red-600 group-hover/k:opacity-100"><Trash2 size={14} /></button>}</div>
                        {c.kind === 'char' && <div className="flex gap-3 p-4"><Avatar text={(art.character.name.split(' ').pop() || 'A')[0]} size={40} color="#475569" /><div className="min-w-0 flex-1"><div className="text-[13px] font-semibold">{art.character.name}</div><div className="mt-1 rounded-lg bg-neutral-100 p-2.5 text-[13px] font-medium"><Editable value={c.text} multiline className="block" placeholder="Nhân vật nói gì?" onChange={(v) => upCard(c.id, (k) => { k.text = v })} /></div></div></div>}
                        {c.kind === 'text' && <div className="p-4 font-serif text-[14px] italic text-neutral-700"><Editable value={c.text} multiline className="block" placeholder="Lời dẫn, bối cảnh" onChange={(v) => upCard(c.id, (k) => { k.text = v })} /></div>}
                        {c.kind === 'decision' && <div className="space-y-2 p-3">
                          {c.choices.map((ch, i) => { const [OI, cl] = OK[ch.ok] ?? OK.neutral; return (
                            <div key={i} className="group/o rounded-xl border border-line p-3 text-[13px]">
                              <div className="flex gap-2.5"><button title="Đổi đánh giá: tốt / chưa tốt / trung tính" onClick={(e) => { e.stopPropagation(); upCard(c.id, (k) => { const o = k.choices[i]; o.ok = o.ok === 'good' ? 'bad' : o.ok === 'bad' ? 'neutral' : 'good' }) }}><OI size={18} className={cl} /></button>
                                <Editable value={ch.t} multiline className="block flex-1 font-medium" placeholder="Câu người học chọn" onChange={(v) => upCard(c.id, (k) => { k.choices[i].t = v })} />
                                {c.choices.length > 1 && <button title="Xóa lựa chọn" onClick={(e) => { e.stopPropagation(); upCard(c.id, (k) => { k.choices.splice(i, 1) }) }} className="text-neutral-400 opacity-0 group-hover/o:opacity-100"><X size={14} /></button>}</div>
                              <div className="mt-2 flex gap-1.5 border-t border-dashed border-line pt-2 text-[12px] text-neutral-600"><span className="shrink-0">{art.character.name} đáp:</span><Editable value={ch.reply} multiline className="block flex-1" placeholder="Nhân vật phản hồi thế nào" onChange={(v) => upCard(c.id, (k) => { k.choices[i].reply = v })} /></div>
                            </div>) })}
                          <MiniBtn onClick={() => upCard(c.id, (k) => { k.choices.push({ t: '', ok: 'neutral', reply: '' }) })}><Plus size={13} />Thêm lựa chọn</MiniBtn>
                        </div>}
                      </div>
                    )
                  })}
                  {di >= 0 && order[di].choices.map((ch, i) => <div key={i} className="absolute flex items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-semibold shadow-card" style={{ left: X(di) + 410, top: Y + 22 + i * 70 }}>{ch.ok === 'good' ? (si + 1 < art.scenes.length ? `→ Cảnh ${si + 2}` : '→ Kết thúc') : '→ Phản hồi rồi sang cảnh tiếp'}</div>)}
                </>
              })()}
            </div>
            <div className="absolute bottom-4 left-4 flex items-center gap-2"><span className="rounded-lg border border-line bg-white px-3 py-1.5 text-[13px]">{zoom}%</span></div>
          </div>
        </div>
      )}
      <Modal open={exp} onClose={() => setExp(false)} title="Trải nghiệm" sub="Chọn cách người học trải nghiệm tình huống. Áp dụng cho toàn bộ." w={620}
        footer={<button className="btn-dark h-10" onClick={() => setExp(false)}>Lưu</button>}>
        <div className="grid grid-cols-2 gap-4">
          {[['chat', 'Chat', 'Chỉ có chữ.'], ['photo', 'Ảnh nhân vật + chat', 'Nhân vật đổi nét mặt theo hội thoại.']].map(([k, t, s]) => (
            <button key={k} onClick={() => set((d) => { d.artifacts[art.id].experience = k })} className={`rounded-xl border p-3 text-left ${art.experience === k ? 'border-ink' : 'border-line'}`}>
              <div className="flex h-28 gap-2 rounded-lg bg-neutral-100 p-2">{k === 'photo' && <Portrait className="h-full w-24 rounded" />}<div className="flex-1 space-y-2 pt-3"><div className="h-1.5 w-3/4 rounded bg-neutral-300" /><div className="ml-auto h-1.5 w-1/2 rounded bg-brand" /><div className="h-1.5 w-2/3 rounded bg-neutral-300" /></div></div>
              <div className="mt-3 flex items-center gap-2 text-[15px] font-semibold"><span className={`h-4 w-4 rounded-full border-2 ${art.experience === k ? 'border-ink ring-2 ring-inset ring-ink' : 'border-neutral-400'}`} />{t}</div><div className="ml-6 text-[13px] text-neutral-600">{s}</div>
            </button>))}
        </div>
        <div className="mt-5 text-[14px] font-semibold">Khung</div>
        <div className="mt-2 grid grid-cols-2 gap-4">{[['inline', 'Nhúng', 'Nhỏ hơn, nằm trong trang'], ['full', 'Toàn màn hình', 'Rộng và cuốn hút hơn']].map(([k, t, s]) => <button key={k} onClick={() => set((d) => { d.artifacts[art.id].frame = k })} className={`rounded-xl border p-3 text-left ${art.frame === k ? 'border-ink' : 'border-line'}`}><div className="text-[15px] font-semibold">{t}</div><div className="text-[13px] text-neutral-600">{s}</div></button>)}</div>
      </Modal>
    </div>
  )
}

/* ================= BỘ SLIDE ================= */

export { Slide }

/** Nghe thử lời đọc bằng giọng AI thật */
function VoicePreview({ text }) {
  const { say } = useStore()
  const [state, setState] = useState('idle')
  const audio = useRef(null)
  useEffect(() => () => audio.current?.pause(), [])
  const play = async () => {
    if (state === 'playing') { audio.current?.pause(); setState('idle'); return }
    if (!text?.trim()) { say('Slide này chưa có ghi chú để đọc'); return }
    setState('loading')
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'x-lms': '1', 'content-type': 'application/json' }, body: JSON.stringify({ text }) })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? 'Không tạo được giọng đọc')
      const url = URL.createObjectURL(await res.blob())
      audio.current?.pause()
      audio.current = new Audio(url)
      audio.current.onended = () => { setState('idle'); URL.revokeObjectURL(url) }
      await audio.current.play(); setState('playing')
    } catch (e) { say(e.message); setState('idle') }
  }
  return <button onClick={play} disabled={state === 'loading'} className="flex items-center gap-1 text-[13px] font-medium text-violet-700 disabled:opacity-50">{state === 'loading' ? <RefreshCw size={14} className="spin" /> : state === 'playing' ? <Pause size={14} /> : <AudioLines size={14} />}{state === 'playing' ? 'Dừng' : 'Nghe thử giọng AI'}</button>
}

export function DeckEditor({ art, kit, up, saveText, onRestored }) {
  const { say } = useStore()
  const set = artSet(art, up)
  const nav = useNavigate()
  const [cur, setCur] = useState(0)
  const [share, setShare] = useState(false)
  const [present, setPresent] = useState(false)
  const [vid, setVid] = useState(false)
  const s = art.slides[cur]
  const upS = (fn) => set((d) => fn(d.artifacts[art.id].slides[cur]))
  useEffect(() => { if (!present) return; const h = (e) => { if (e.key === 'ArrowRight') setCur((c) => Math.min(art.slides.length - 1, c + 1)); if (e.key === 'ArrowLeft') setCur((c) => Math.max(0, c - 1)); if (e.key === 'Escape') setPresent(false) }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [present])
  return (
    <div className="flex h-full flex-col">
      <ArtifactTop art={art} kit={kit} saveText={saveText} onRestored={onRestored} onShare={() => setShare(true)} onPreview={() => setPresent(true)}
        right={<button onClick={() => setVid(true)} className="mr-1 flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold"><Film size={15} className="text-red-500" />Tạo video từ slide</button>} />
      <DraftBar art={art} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="scroll-thin w-[240px] shrink-0 overflow-y-auto border-r border-line px-4 py-4">
          <div className="mb-3 flex items-center text-[16px] font-semibold">Slide <span className="ml-2 font-normal text-neutral-500">{art.slides.length}</span><div className="flex-1" /><button onClick={() => { set((d) => d.artifacts[art.id].slides.splice(cur + 1, 0, { id: uid('s'), layout: 'bullets', title: 'Slide mới', items: ['Ý 1', 'Ý 2'], notes: '' })); setCur(cur + 1) }}><Plus size={18} /></button></div>
          {art.slides.map((x, i) => (
            <button key={x.id} onClick={() => setCur(i)} className="mb-3 flex w-full gap-2 text-left">
              <span className="w-5 pt-1 text-[13px] text-neutral-500">{i + 1}</span>
              <div className={`aspect-video flex-1 overflow-hidden rounded-lg border-2 ${cur === i ? 'border-neutral-700' : 'border-line'}`}><Slide s={x} n={i + 1} /></div>
            </button>
          ))}
        </aside>
        <div className="flex flex-1 flex-col bg-neutral-50">
          <div className="scroll-thin flex min-h-0 flex-1 justify-center overflow-y-auto p-8">
            <SlideCanvas key={cur} artId={art.id} s={s} n={cur + 1} total={art.slides.length} upS={upS}
              onDuplicate={() => { set((d) => { const sl = d.artifacts[art.id].slides; sl.splice(cur + 1, 0, { ...structuredClone(sl[cur]), id: uid('s') }) }); setCur(cur + 1); say('Đã nhân đôi slide') }}
              onDelete={art.slides.length > 1 ? () => { set((d) => d.artifacts[art.id].slides.splice(cur, 1)); setCur(Math.max(0, cur - 1)) } : undefined} />
          </div>
          <div className="border-t border-line bg-white px-6 py-4">
            <div className="flex items-center gap-2 text-[14px] font-semibold"><StickyNote size={15} />Ghi chú người trình bày<span className="font-normal text-neutral-500">Slide {cur + 1}</span><div className="flex-1" /><VoicePreview text={s.notes} /></div>
            <div className="mt-2 min-h-[56px] text-[15px]"><Editable value={s.notes} multiline className="block min-h-[44px]" placeholder="Ghi chú cho người trình bày, cũng là lời đọc khi tạo video" onChange={(v) => upS((x) => { x.notes = v })} /></div>
          </div>
        </div>
      </div>
      {present && <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={() => setCur((c) => Math.min(art.slides.length - 1, c + 1))}>
        <div className="flex flex-1 items-center justify-center p-10"><div className="aspect-video w-full max-w-[1200px]"><Slide s={s} n={cur + 1} total={art.slides.length} /></div></div>
        <div className="flex items-center gap-3 px-6 pb-5 text-[13px] text-white/70"><span>{cur + 1} / {art.slides.length}</span><span className="flex-1">← → để chuyển · Esc để thoát</span><button onClick={(e) => { e.stopPropagation(); setPresent(false) }} className="rounded-full bg-white/10 px-3 py-1 text-white">Thoát</button></div>
      </div>}
      <Modal open={vid} onClose={() => setVid(false)} title="Tạo video từ slide" sub="AI ghép slide với giọng đọc từ ghi chú người trình bày, rồi chép lời và chia chương." w={560}
        footer={<button className="btn-dark h-10" onClick={async () => { try { const r = await post(`/artifacts/${art.id}/to-video`, {}); setVid(false); say('Đang tạo video bằng giọng đọc AI. Video mới ở dạng bản nháp.'); nav(`/edit/${r.id}`) } catch (e) { say(e.message) } }}><Sparkles size={16} />Tạo video</button>}>
        <div className="space-y-3 text-[14px]">
          <div className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3"><AudioLines size={16} />Giọng đọc AI có sẵn của dịch vụ (alloy), không nhân bản giọng người thật</div>
          <div className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3"><Captions size={16} />Video ghi rõ "Nội dung do AI tạo"</div>
          <div className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3"><RefreshCw size={16} />Sửa lời đọc hoặc slide thì chỉ tạo lại đoạn đó, không làm lại cả video</div>
        </div>
      </Modal>
      <ShareModal open={share} art={art} onClose={() => setShare(false)} onChanged={onRestored} />
    </div>
  )
}

/* ================= VIDEO TƯƠNG TÁC ================= */

// Khung hình video: video AI tạo hiện slide theo chương; video tải lên hiện cảnh quay
function frameOf(art, i) {
  if (art.slides?.[i]) return art.slides[i]
  if (art.frames?.[i]) return art.frames[i]
  const ch = art.chapters[i]; const next = art.chapters[i + 1]?.t ?? Infinity
  const lines = art.transcript.filter((x) => x.t >= ch.t && x.t < next).map((x) => { const v = x.x.replace(/\.$/, ''); return v.length > 78 ? v.slice(0, v.lastIndexOf(' ', 76)) + '…' : v })
  if (i === 0) return { layout: 'cover', img: art.img, kicker: art.title, title: ch.title }
  return i % 2 ? { layout: 'image', img: art.img, kicker: `Chương ${i + 1}`, title: ch.title, items: lines.slice(0, 3) } : { layout: 'bullets', kicker: `Chương ${i + 1}`, title: ch.title, items: lines.slice(0, 3) }
}
export function VideoStage({ art, t, playing, onToggle, cp, onAnswer }) {
  const idx = Math.max(0, art.chapters.findLastIndex((c) => c.t <= t))
  const ch = art.chapters[idx]
  const line = [...art.transcript].reverse().find((x) => x.t <= t)
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
      <div key={idx} className="fade absolute inset-0">
        {art.ai ? <div className="absolute inset-0 kenburns" style={{ animationPlayState: playing ? 'running' : 'paused' }}><Slide s={frameOf(art, idx)} /></div>
          : <Thumb img={art.img || 'video'} className="kenburns h-full" pos={`${30 + idx * 15}% center`}><div className="absolute inset-0 bg-black/10" /></Thumb>}
      </div>
      {!art.ai && <span className="absolute left-3 top-3 rounded bg-black/55 px-2 py-1 text-[12px] font-medium text-white">Chương {idx + 1} · {ch?.title}</span>}
      {art.ai && <span className="absolute right-3 top-3 rounded bg-black/50 px-2 py-1 text-[11px] text-white">Nội dung do AI tạo</span>}
      {line && <div className="pointer-events-none absolute inset-x-0 bottom-[60px] flex justify-center px-10"><span key={line.t} className="fade max-w-[85%] rounded-md bg-black/75 px-3 py-1.5 text-center text-[15px] leading-snug text-white">{line.x}</span></div>}
      {art.ai && <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/60 py-1.5 pl-1.5 pr-3 text-[12px] text-white"><span className="grid h-7 w-7 place-items-center rounded-full bg-violet-500"><AudioLines size={15} /></span><span className="flex h-4 items-end gap-[3px]">{[0, 1, 2, 3, 4].map((k) => <span key={k} className={`w-[3px] rounded-full bg-white/80 ${playing ? 'wave' : ''}`} style={{ height: playing ? undefined : 4, animationDelay: `${k * 0.12}s` }} />)}</span>{art.voice?.split(' · ')[0]}</div>}
      {cp && (
        <div className="absolute inset-0 grid place-items-center bg-black/60 p-6">
          <div className="w-[440px] rounded-xl bg-white p-6"><div className="text-[12px] font-bold uppercase tracking-wider text-neutral-500">Điểm kiểm tra</div><div className="mt-2 font-lato text-[19px] font-bold">{cp.q}</div>
            <div className="mt-4 space-y-2">{cp.choices.map((c, i) => <button key={c} onClick={() => onAnswer(i === cp.correct)} className="block w-full rounded-lg border border-line px-4 py-2.5 text-left text-[14px] hover:border-brand">{c}</button>)}</div></div>
        </div>
      )}
      <button onClick={onToggle} className="absolute bottom-4 left-4 grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow">{playing ? <Pause size={18} /> : <Play size={18} />}</button>
    </div>
  )
}


/** Trạng thái dựng video thật từ slide + giọng đọc AI; sửa slide/lời đọc thì chỉ dựng lại đoạn đổi */
function RenderPanel({ art, onReload }) {
  const { say } = useStore()
  const r = art.render ?? { status: 'none' }
  const rendering = r.status === 'rendering'
  useEffect(() => { if (!rendering) return; const i = setInterval(onReload, 3000); return () => clearInterval(i) }, [rendering]) // eslint-disable-line react-hooks/exhaustive-deps
  const start = async () => { try { await post(`/artifacts/${art.id}/render`, {}); say('Đang dựng video bằng giọng đọc AI'); onReload() } catch (e) { say(e.message) } }
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-line p-4 text-[14px]">
      <Film size={18} className="shrink-0 text-rose-500" />
      <div className="flex-1">{rendering ? <span className="flex items-center gap-2 font-medium"><RefreshCw size={14} className="spin" />Đang dựng video… (mỗi đoạn vài giây)</span>
        : r.status === 'done' ? <span><b>Video đã dựng</b> · {fmtTime(art.duration)} · {r.total} đoạn{r.reused ? `, dùng lại ${r.reused} đoạn không đổi` : ''}</span>
          : r.status === 'failed' ? <span className="text-red-600">Dựng lỗi: {r.error}</span>
            : <span className="text-neutral-600">Chưa dựng. Hình lấy từ slide, lời đọc lấy từ ghi chú từng slide, giọng đọc AI có sẵn.</span>}</div>
      <button className="btn-dark btn-sm h-9 shrink-0" disabled={rendering} onClick={start}><Sparkles size={14} />{r.status === 'done' ? 'Dựng lại phần đã sửa' : 'Dựng video'}</button>
    </div>
  )
}

export function VideoEditor({ art, kit, up, saveText, onRestored }) {
  const { say } = useStore()
  const set = artSet(art, up)
  const nav = useNavigate()
  const fromSlides = !!art.slides?.length
  const rendered = fromSlides && art.render?.status === 'done' && art.render.url
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [share, setShare] = useState(false)
  const [tab, setTab] = useState(fromSlides ? 'vo' : 'ch')
  const [cur, setCur] = useState(0)
  const ref = useRef()
  const vref = useRef()
  const upA = (fn) => set((d) => fn(d.artifacts[art.id]))
  // video tải lên (dữ liệu mẫu) không có tệp thật: phát mô phỏng theo chương
  useEffect(() => { if (!playing || rendered) return; ref.current = setInterval(() => setT((x) => Math.min(art.duration, x + 4)), 100); return () => clearInterval(ref.current) }, [playing, rendered])
  useEffect(() => { if (!rendered && t >= art.duration) setPlaying(false) }, [t])
  const seek = (x) => { setT(x); if (vref.current) vref.current.currentTime = x; if (fromSlides) { const i = art.chapters.findLastIndex((c) => c.t <= x); if (i >= 0 && i < art.slides.length) setCur(i) } }
  const sl = fromSlides ? art.slides[Math.min(cur, art.slides.length - 1)] : null
  const upS = (fn) => upA((a) => fn(a.slides[Math.min(cur, a.slides.length - 1)]))
  return (
    <div className="flex h-full flex-col">
      <ArtifactTop art={art} kit={kit} saveText={saveText} onRestored={onRestored} onShare={() => setShare(true)} onPreview={() => nav(`/preview/${art.id}`)} />
      <DraftBar art={art} />
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_400px] grid-rows-[minmax(0,1fr)] overflow-hidden">
        <div className="scroll-thin min-h-0 overflow-y-auto p-8">
          <h1 className="mb-1 font-lato text-[26px] font-black"><Editable value={art.title} className="block" placeholder="Tên video" onChange={(v) => upA((a) => { a.title = v })} /></h1>
          <p className="mb-5 text-[14px] text-neutral-600"><Editable value={art.summary} multiline className="block" placeholder="Mô tả ngắn" onChange={(v) => upA((a) => { a.summary = v })} /></p>
          {fromSlides && <RenderPanel art={art} onReload={onRestored} />}
          {rendered ? <video ref={vref} key={art.render.url} src={`${art.render.url}#t=0.5`} controls className="aspect-video w-full rounded-xl bg-black" onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}><track kind="captions" src={art.render.vtt} srcLang="vi" label="Tiếng Việt" default /></video>
            : fromSlides ? <div className="relative aspect-video overflow-hidden rounded-xl bg-neutral-100"><Slide s={sl} n={cur + 1} total={art.slides.length} /><span className="absolute right-3 top-3 rounded bg-black/60 px-2 py-1 text-[12px] text-white">Xem trước slide {cur + 1} · bấm Dựng video để có video thật</span></div>
              : <VideoStage art={art} t={t} playing={playing} onToggle={() => setPlaying(!playing)} />}
          <div className="mt-4">
            <div className="relative h-10">
              <div className="absolute left-0 right-0 top-4 h-2 rounded-full bg-neutral-200" />
              <div className="absolute left-0 top-4 h-2 rounded-full bg-brand" style={{ width: `${Math.min(100, (t / (art.duration || 1)) * 100)}%` }} />
              {art.chapters.map((c) => <button key={c.t} onClick={() => seek(c.t)} className="absolute top-2 h-6 w-1 rounded bg-neutral-500" style={{ left: `${(c.t / (art.duration || 1)) * 100}%` }} title={c.title} />)}
              {art.checkpoints.map((c) => <span key={c.t} className="absolute top-0 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-violet-600 text-white" style={{ left: `${(c.t / (art.duration || 1)) * 100}%` }}><Flag size={11} /></span>)}
            </div>
            <div className="flex text-[13px] text-neutral-500"><span>{fmtTime(t)}</span><span className="ml-3">Vạch xám: chương · cờ tím: điểm kiểm tra</span><div className="flex-1" /><span>{fmtTime(art.duration)}</span></div>
          </div>
          {fromSlides && <div className="mt-6 rounded-2xl border border-line bg-neutral-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold">Slide trong video<span className="font-normal text-neutral-500">{art.slides.length} slide · sửa xong bấm "Dựng lại phần đã sửa"</span></div>
            <div className="scroll-thin mb-4 flex gap-2 overflow-x-auto pb-1">{art.slides.map((x, i) => <button key={x.id ?? i} onClick={() => seek(art.chapters[i]?.t ?? 0)} className={`aspect-video w-[132px] shrink-0 overflow-hidden rounded-lg border-2 ${i === cur ? 'border-neutral-700' : 'border-line'}`}><Slide s={x} n={i + 1} /></button>)}</div>
            <div className="flex justify-center"><SlideCanvas key={cur} artId={art.id} s={sl} n={cur + 1} total={art.slides.length} upS={upS} /></div>
            <div className="mt-4 rounded-xl border border-line bg-white p-4"><div className="flex items-center gap-2 text-[14px] font-semibold"><AudioLines size={15} />Lời đọc slide {cur + 1}<div className="flex-1" /><VoicePreview text={sl.notes} /></div>
              <div className="mt-2 text-[15px]"><Editable value={sl.notes ?? ''} multiline className="block min-h-[44px]" placeholder="Lời giọng AI đọc khi slide này hiện" onChange={(v) => upS((x) => { x.notes = v })} /></div></div>
          </div>}
          <div className="mt-6 grid grid-cols-3 gap-3 text-[13px]">
            <div className="rounded-xl border border-line p-3"><div className="text-neutral-500">Nguồn video</div><div className="mt-1 font-semibold">{art.ai ? 'AI tạo từ bộ slide' : 'Tải lên'}</div></div>
            <div className="rounded-xl border border-line p-3"><div className="text-neutral-500">Giọng đọc</div><div className="mt-1 font-semibold">{art.voice}</div></div>
            <div className="rounded-xl border border-line p-3"><div className="text-neutral-500">Chép lời và chia chương</div><div className="mt-1 font-semibold text-emerald-700">{fromSlides && !rendered ? 'Có sau khi dựng' : `Đã xong · ${art.chapters.length} chương`}</div></div>
          </div>
        </div>
        <aside className="flex min-h-0 flex-col border-l border-line">
          <div className="flex border-b border-line px-4">{[...(fromSlides ? [['vo', 'Lời đọc']] : []), ['ch', 'Chương'], ['cp', 'Điểm kiểm tra'], ['tr', 'Lời thoại']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-3 py-3.5 text-[14px] ${tab === k ? 'border-ink font-semibold' : 'border-transparent text-neutral-500'}`}>{l}</button>)}</div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
            {tab === 'ch' && (fromSlides
              ? <><p className="mb-3 text-[13px] text-neutral-500">Mỗi slide là một chương, tên chương là tiêu đề slide, mốc thời gian theo thời lượng thật khi dựng.</p>{art.chapters.map((c, i) => <button key={i} onClick={() => seek(c.t)} className="mb-2 flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left hover:bg-neutral-50"><span className="w-12 shrink-0 font-mono text-[13px] text-sky-700">{fmtTime(c.t)}</span><span className="text-[14px] text-neutral-400">{i + 1}.</span><span className="flex-1 text-[14px] font-medium">{c.title}</span></button>)}</>
              : <>{art.chapters.map((c, i) => <div key={i} className="group/c mb-2 flex w-full items-center gap-3 rounded-xl border border-line p-3"><button onClick={() => seek(c.t)} className="w-12 shrink-0 text-left font-mono text-[13px] text-sky-700 hover:underline" title="Tua tới đây">{fmtTime(c.t)}</button><span className="text-[14px] text-neutral-400">{i + 1}.</span><Editable value={c.title} className="block flex-1 text-[14px] font-medium" placeholder="Tên chương" onChange={(v) => upA((a) => { a.chapters[i].title = v })} />{art.chapters.length > 1 && <button title="Xóa chương" onClick={() => upA((a) => { a.chapters.splice(i, 1) })} className="text-neutral-400 opacity-0 hover:text-red-600 group-hover/c:opacity-100"><Trash2 size={14} /></button>}</div>)}
                <button onClick={() => { upA((a) => { a.chapters.push({ t: Math.round(t), title: '' }); a.chapters.sort((x, y) => x.t - y.t) }); say(`Đã thêm chương tại ${fmtTime(t)}`) }} className="btn-line btn-sm mt-2 w-full"><Plus size={14} />Thêm chương tại {fmtTime(t)}</button></>)}
            {tab === 'cp' && <>{art.checkpoints.map((c, ci) => <div key={ci} className="group/p mb-2 rounded-xl border border-line p-3"><div className="flex items-center gap-2 text-[13px] text-violet-700"><Flag size={13} /><button onClick={() => seek(c.t)} className="hover:underline">{fmtTime(c.t)}</button><div className="flex-1" /><button title="Xóa điểm kiểm tra" onClick={() => upA((a) => { a.checkpoints.splice(ci, 1) })} className="text-neutral-400 opacity-0 hover:text-red-600 group-hover/p:opacity-100"><Trash2 size={14} /></button></div>
                <div className="mt-1 text-[14px] font-medium"><Editable value={c.q} multiline className="block" placeholder="Câu hỏi" onChange={(v) => upA((a) => { a.checkpoints[ci].q = v })} /></div>
                <div className="mt-2 space-y-1">{c.choices.map((o, oi) => <div key={oi} className="group/o flex items-center gap-2 text-[13px]"><button title="Đặt làm đáp án đúng" onClick={() => upA((a) => { a.checkpoints[ci].correct = oi })} className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${oi === c.correct ? 'border-emerald-600 bg-emerald-500' : 'border-neutral-400'}`} /><Editable value={o} className="block flex-1" placeholder={`Lựa chọn ${oi + 1}`} onChange={(v) => upA((a) => { a.checkpoints[ci].choices[oi] = v })} />{c.choices.length > 2 && <button onClick={() => upA((a) => { const k = a.checkpoints[ci]; k.choices.splice(oi, 1); if (k.correct >= k.choices.length) k.correct = 0 })} className="text-neutral-400 opacity-0 group-hover/o:opacity-100"><X size={13} /></button>}</div>)}</div>
                <MiniBtn onClick={() => upA((a) => { a.checkpoints[ci].choices.push('') })} className="mt-1"><Plus size={12} />Thêm lựa chọn</MiniBtn></div>)}
              <p className="mb-2 text-[13px] text-neutral-500">Video dừng ở mốc này và hỏi người học. Tua video tới đúng chỗ rồi bấm thêm.</p>
              <button onClick={() => { upA((a) => { a.checkpoints.push({ t: Math.round(t), q: '', choices: ['', ''], correct: 0 }); a.checkpoints.sort((x, y) => x.t - y.t) }); say(`Đã thêm điểm kiểm tra tại ${fmtTime(t)}`) }} className="btn-line btn-sm w-full"><Plus size={14} />Thêm điểm kiểm tra tại {fmtTime(t)}</button></>}
            {tab === 'vo' && <><p className="mb-3 text-[13px] text-neutral-500">Lời giọng AI đọc cho từng slide. Sửa xong bấm "Dựng lại phần đã sửa": chỉ đoạn đổi được dựng lại, lời thoại và chương tự cập nhật theo thời lượng thật.</p>{art.slides.map((x, si) => <div key={x.id ?? si} className={`mb-3 rounded-lg border p-3 ${si === cur ? 'border-neutral-500' : 'border-line'}`} onFocusCapture={() => setCur(si)}><div className="text-[13px] font-semibold"><Editable value={x.title} className="block" placeholder="Tiêu đề slide" onChange={(v) => upA((a) => { a.slides[si].title = v })} /></div><div className="mt-1 text-[14px] text-neutral-700"><Editable value={x.notes ?? ''} multiline className="block" placeholder="Lời đọc cho đoạn này" onChange={(v) => upA((a) => { a.slides[si].notes = v })} /></div></div>)}</>}
            {tab === 'tr' && <>{fromSlides && <p className="mb-3 text-[13px] text-neutral-500">Lời thoại chép từ lời đọc khi dựng. Muốn đổi thì sửa ở tab Lời đọc rồi dựng lại.</p>}
              {!art.transcript.length && <p className="text-[14px] text-neutral-500">Chưa có lời thoại. Dựng video để tạo.</p>}
              {art.transcript.map((x, xi) => <div key={xi} className={`mb-1 flex gap-3 rounded-lg p-2 ${t >= x.t ? 'bg-brand/5' : ''}`}><button onClick={() => seek(x.t)} className="w-12 shrink-0 font-mono text-[12px] text-sky-700">{fmtTime(x.t)}</button>{fromSlides ? <span className="flex-1 text-[14px]">{x.x}</span> : <Editable value={x.x} multiline className="block flex-1 text-[14px]" placeholder="Lời thoại" onChange={(v) => upA((a) => { a.transcript[xi].x = v })} />}</div>)}</>}
          </div>
        </aside>
      </div>
      <ShareModal open={share} art={art} onClose={() => setShare(false)} onChanged={onRestored} />
    </div>
  )
}

/* ================= HƯỚNG DẪN TỪNG BƯỚC ================= */

export function GuideEditor({ art, kit, up, saveText, onRestored }) {
  const nav = useNavigate()
  const set = artSet(art, up)
  const [share, setShare] = useState(false)
  const upA = (fn) => set((d) => fn(d.artifacts[art.id]))
  return (
    <div className="min-h-full pb-20">
      <ArtifactTop art={art} kit={kit} saveText={saveText} onRestored={onRestored} onShare={() => setShare(true)} onPreview={() => nav(`/preview/${art.id}`)} />
      <DraftBar art={art} />
      <div className="mx-auto max-w-[820px] px-6 pt-12">
        <h1 className="font-lato text-[42px] font-black"><Editable value={art.title} className="block" placeholder="Tên hướng dẫn" onChange={(v) => upA((a) => { a.title = v })} /></h1>
        <p className="mt-4 font-serif text-[17px] text-neutral-700"><Editable value={art.summary} multiline className="block" placeholder="Mô tả ngắn" onChange={(v) => upA((a) => { a.summary = v })} /></p>
        <div className="mt-3 flex items-center gap-2 text-[13px] text-neutral-500"><FileText size={14} />Tạo từ {art.source || 'quay-man-hinh-don-phep.mp4 · 3:42'}</div>
        <div className="mt-10 space-y-8">{art.steps.map((s, i) => (
          <div key={i} className="group/s relative grid grid-cols-[1fr_1.2fr] gap-6 rounded-2xl border border-line p-5">
            <div><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500 font-lato font-bold text-white">{i + 1}</span><span className="flex-1 font-lato text-[20px] font-bold"><Editable value={s.title} className="block" placeholder="Tên bước" onChange={(v) => upA((a) => { a.steps[i].title = v })} /></span></div>
              <div className="mt-3 font-serif text-[16px] leading-relaxed"><Editable value={s.text} multiline className="block" placeholder="Mô tả thao tác ở bước này" onChange={(v) => upA((a) => { a.steps[i].text = v })} /></div></div>
            <Thumb img={s.img || 'screen'} className="h-44 rounded-xl"><span className="absolute left-3 top-3 rounded bg-black/50 px-2 py-0.5 text-[11px] text-white">Ảnh chụp tại {fmtTime(20 + i * 48)}</span><span className="absolute left-[40%] top-[45%] h-10 w-28 rounded-lg border-[3px] border-amber-300" /></Thumb>
            <div className="absolute -right-12 top-4 flex flex-col gap-1 opacity-0 transition group-hover/s:opacity-100">
              <Tip label="Lên" className="h-8 w-8" onClick={() => i > 0 && upA((a) => { const [x] = a.steps.splice(i, 1); a.steps.splice(i - 1, 0, x) })}><ChevronDown size={15} className="rotate-180" /></Tip>
              <Tip label="Xuống" className="h-8 w-8" onClick={() => i < art.steps.length - 1 && upA((a) => { const [x] = a.steps.splice(i, 1); a.steps.splice(i + 1, 0, x) })}><ChevronDown size={15} /></Tip>
              {art.steps.length > 1 && <Tip label="Xóa bước" className="h-8 w-8" onClick={() => upA((a) => { a.steps.splice(i, 1) })}><Trash2 size={15} /></Tip>}
            </div>
          </div>))}</div>
        <div className="mt-6 flex justify-center"><button onClick={() => upA((a) => { a.steps.push({ title: '', text: '', img: 'screen' }) })} className="btn-line"><Plus size={16} />Thêm bước</button></div>
      </div>
      <ShareModal open={share} art={art} onClose={() => setShare(false)} onChanged={onRestored} />
    </div>
  )
}

export { ChevronLeft }
