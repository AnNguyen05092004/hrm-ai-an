import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Paperclip, Link2, HardDrive, Cloud, Video, Mic, Plus, ArrowRight, ChevronRight, Users, Target, FileText, X, FolderOpen, Sparkles, FileUp, Box, CornerDownRight, ChevronLeft } from 'lucide-react'
import { useStore } from '../store'
import { FORMATS } from '../data'
import { FormatIcon, Modal, Thumb, FormatGlyph, Status, Avatar } from '../ui'
import { ShareModal } from './Common'
import { TopOrg } from '../Shell'
import { draftKit, EXAMPLE_GOAL } from '../gen'
import { PRESETS } from '../presets'

const FILE_COLOR = { pdf: 'text-red-500', doc: 'text-sky-600', ppt: 'text-orange-500', video: 'text-violet-600', audio: 'text-pink-500', sheet: 'text-emerald-600', code: 'text-slate-700' }

const SAMPLE_FILES = [
  { name: 'Docker-Volumes-NoiBo.pdf', size: '2,1 MB', kind: 'pdf' },
  { name: 'Runbook-Backup-v2.docx', size: '480 KB', kind: 'doc' },
]

function HowItWorks({ open, onClose }) {
  const [tab, setTab] = useState(0)
  return (
    <Modal open={open} onClose={onClose} w={560} pad={false}
      footer={<button className="btn-dark" onClick={onClose}>Đã hiểu</button>}>
      <div className="flex items-end gap-7 border-b border-line px-6 pt-5">
        {['Cần cho chúng tôi biết gì', 'Một bộ đào tạo gồm gì'].map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`-mb-px border-b-2 pb-2.5 text-[16px] ${tab === i ? 'border-ink font-semibold' : 'border-transparent text-neutral-500'}`}>{t}</button>
        ))}
        <div className="flex-1" />
        <button className="icon-btn mb-1.5" onClick={onClose}><X size={20} /></button>
      </div>
      {tab === 0 ? (
        <div className="px-6 py-5">
          {[[Users, 'Ai học, vai trò của họ và họ đã biết đến đâu'], [Target, 'Người học cần hiểu hoặc làm được gì sau khóa'], [FileText, 'Dùng các tài liệu đã tải lên thế nào']].map(([I, t]) => (
            <div key={t} className="flex items-center gap-3 py-2 text-[16px]"><I size={18} />{t}</div>
          ))}
          <div className="mt-3 rounded-xl border border-line p-4">
            <div className="mb-2 text-[15px] font-semibold text-neutral-600">Ví dụ</div>
            <p className="text-[15px] leading-relaxed">"{EXAMPLE_GOAL}"</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-[14px]">
              <b className="text-neutral-600">Đính kèm</b>
              {SAMPLE_FILES.map((f) => <span key={f.name} className="flex items-center gap-1.5"><FileUp size={15} className={f.kind === 'pdf' ? 'text-red-500' : 'text-sky-600'} />{f.name}</span>)}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-5">
          <p className="mb-4 text-[16px] font-semibold">Bộ đào tạo là một nhóm tài liệu cùng phục vụ mục tiêu đào tạo của bạn</p>
          <div className="mb-4 grid h-40 place-items-center rounded-xl bg-emerald-50">
            <div className="flex gap-3">{Object.keys(FORMATS).map((k) => <div key={k} className="grid h-16 w-16 place-items-center rounded-xl bg-white/70 shadow-card"><FormatIcon type={k} size={40} /></div>)}</div>
          </div>
          {Object.entries(FORMATS).map(([k, f]) => (
            <div key={k} className="flex gap-3 border-b border-line py-3 last:border-0">
              <FormatIcon type={k} size={28} r={7} />
              <div>
                <div className="text-[15px] font-semibold">{f.name}{f.note && <span className="font-normal text-neutral-500"> · {f.note}</span>}</div>
                <div className="text-[15px]">{f.long}</div>
                {f.req && <div className="mt-0.5 text-[13px] italic text-neutral-500">{f.req}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default function Dashboard() {
  const { S, set } = useStore()
  const nav = useNavigate()
  const [goal, setGoal] = useState('')
  const [files, setFiles] = useState([])
  const [how, setHow] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [rec, setRec] = useState(false)
  const [brand, setBrand] = useState(false)
  const rowRef = useRef(null)

  const addFile = (f) => setFiles((x) => x.some((y) => y.name === f.name) ? x : [...x, f])
  const start = () => {
    const kit = draftKit(goal, files)
    set((d) => { d.kits.unshift(kit) })
    nav(`/kit/${kit.id}/loading`)
  }
  // Như bản gốc: trộn tài liệu và bộ đào tạo, tài liệu của bộ đứng trước thẻ bộ
  const recent = S.kits.flatMap((k) => [...k.artifacts.map((id) => S.artifacts[id]).filter((a) => a && !a.gen).slice(0, 2).map((a) => ({ a, k })), { k }]).slice(0, 6)
  const [share, setShare] = useState(null)

  return (
    <div className="hero-bg min-h-full">
      <TopOrg />
      <div className="mx-auto max-w-[760px] px-6 pt-12">
        <h1 className="text-center text-[52px] font-semibold tracking-tight">Sẵn sàng khi bạn cần, {S.user.short}</h1>
        <p className="mt-2 text-center text-[20px] font-display font-medium">Biến tài liệu rời rạc thành bài đào tạo dùng được ngay</p>

        <div className="mt-10 rounded-2xl border-2 border-dashed border-[#a9a4ea] bg-[#f2f0fd]/80">
          <div className="px-6 pt-10 pb-8 text-center">
            <div className="text-[18px] font-semibold">Kéo thả hoặc chọn tệp</div>
            <div className="mt-6 flex justify-center gap-5">
              {[
                [Paperclip, 'Tải tệp lên', () => SAMPLE_FILES.forEach(addFile)],
                [Link2, 'Dán đường dẫn', () => setLinkOpen(true)],
                [HardDrive, 'Kho tài liệu nội bộ', () => addFile({ name: 'SoTay-NhanVien-2026.pdf', size: '3,4 MB', kind: 'pdf' })],
                [Cloud, 'OneDrive', () => addFile({ name: 'Quy-trinh-trien-khai.pptx', size: '5,8 MB', kind: 'ppt' })],
              ].map(([I, l, fn], i) => (
                <button key={l} onClick={fn} className="group/tip relative grid h-[68px] w-[68px] place-items-center rounded-2xl bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
                  <I size={28} strokeWidth={2} className={['text-ink', 'text-ink', 'text-emerald-600', 'text-sky-500'][i]} />
                  <span className="tip group-hover/tip:opacity-100 top-[76px] left-1/2 -translate-x-1/2">{l}</span>
                </button>
              ))}
            </div>
            {files.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {files.map((f) => (
                  <span key={f.name} className="flex items-center gap-2 rounded-lg border border-line bg-white py-1.5 pl-2.5 pr-1.5 text-[14px]">
                    <FileUp size={15} className={FILE_COLOR[f.kind] || 'text-sky-600'} />{f.name}<span className="text-neutral-400">{f.size}</span>
                    <button className="rounded p-0.5 hover:bg-neutral-100" onClick={() => setFiles((x) => x.filter((y) => y !== f))}><X size={14} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setRec(true)} className="flex w-full items-center justify-center gap-3 border-t-2 border-dashed border-[#a9a4ea] py-5 text-[18px] font-medium hover:bg-white/40">
            <Video size={22} fill="currentColor" />Quay màn hình
          </button>
        </div>

        <div className="mt-9 flex items-end justify-between">
          <label className="text-[18px] font-semibold">Mô tả mục tiêu đào tạo</label>
          <button className="text-[15px] text-neutral-600 underline underline-offset-4 hover:text-ink" onClick={() => setHow(true)}>Cách hoạt động</button>
        </div>
        <div className="mt-3 rounded-2xl border border-neutral-300 bg-white focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-100">
          <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={4}
            placeholder="Ai cần học, điều gì đang thay đổi và họ cần làm gì tiếp theo…"
            className="w-full resize-none rounded-2xl bg-transparent px-5 pt-4 text-[16px] leading-relaxed outline-none placeholder:text-neutral-500" />
          <div className="flex items-center gap-2 px-4 pb-4">
            <button onClick={() => setBrand(true)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[15px] font-medium hover:bg-neutral-50"><Plus size={17} />Thêm thương hiệu</button>
            {!goal && <button onClick={() => { setGoal(EXAMPLE_GOAL); setFiles(PRESETS[0].files) }} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[15px] text-violet-700 hover:bg-violet-50"><Sparkles size={16} />Dùng ví dụ mẫu</button>}
            <div className="flex-1" />
            <button className="icon-btn"><Mic size={18} /></button>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-neutral-600"><Sparkles size={14} className="text-violet-600" />Thử nhanh với chủ đề mẫu<span className="font-normal text-neutral-400">· {PRESETS.length} chủ đề</span><div className="flex-1" />
            {[[ChevronLeft, -1], [ChevronRight, 1]].map(([I, d]) => <button key={d} onClick={() => rowRef.current?.scrollBy({ left: d * 360, behavior: 'smooth' })} className="grid h-7 w-7 place-items-center rounded-full border border-line bg-white hover:bg-neutral-50"><I size={15} /></button>)}</div>
          <div ref={rowRef} className="scroll-thin -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 pt-1">
            {PRESETS.map((p) => { const on = goal === p.goal; return (
              <button key={p.id} onClick={() => { setGoal(p.goal); setFiles(p.files) }} className={`w-[170px] shrink-0 snap-start overflow-hidden rounded-xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-card ${on ? 'border-violet-500 ring-2 ring-violet-200' : 'border-line'}`}>
                <Thumb img={p.img} className="h-14" />
                <div className="px-2.5 py-2"><div className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">{p.tag}</div><div className="mt-0.5 text-[13px] font-medium leading-snug">{p.label}</div></div>
              </button>) })}
          </div>
        </div>
        <button disabled={!goal.trim()} onClick={start} className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-ink text-[18px] font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300">
          <Sparkles size={19} className="text-violet-300" />Bắt đầu<ArrowRight size={20} />
        </button>
        <p className="mt-3 text-center text-[13px] italic text-neutral-500">Tiếp theo, bạn rà lại chi tiết và bổ sung chỗ thiếu trước khi AI tạo nội dung</p>
      </div>

      <div className="mx-auto mt-16 max-w-[1100px] px-8 pb-24">
        <div className="card px-9 py-8">
          <h3 className="text-[20px] font-semibold">Xây một bộ đào tạo</h3>
          <p className="mt-2 text-[16px] leading-relaxed">Chọn dạng tài liệu và thêm nội dung hoặc tệp của bạn. AI tạo dàn ý để bạn chỉnh theo nhu cầu của nhóm: sửa mục tiêu, bỏ phần không cần, thêm phần còn thiếu.</p>
          <div className="my-6 h-px bg-line" />
          <div className="mb-3 text-[16px] font-semibold">Chọn dạng phù hợp với việc cần dạy</div>
          {Object.entries(FORMATS).map(([k, f]) => (
            <button key={k} onClick={() => setHow(true)} className="group flex w-full items-start gap-4 rounded-xl py-3 text-left">
              <FormatIcon type={k} size={46} r={12} />
              <div>
                <div className="flex items-center gap-1 text-[18px] font-semibold group-hover:underline">{f.name}<ChevronRight size={18} /></div>
                <div className="text-[16px] text-neutral-600">{f.desc}{f.req ? `. ${f.req.split('.')[0]}.` : ''}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-14 flex items-center justify-between">
          <h3 className="text-[19px] font-semibold">Tiếp tục công việc</h3>
          <button onClick={() => nav('/library')} className="flex items-center gap-2 text-[15px] font-semibold"><FolderOpen size={18} />Xem thư viện</button>
        </div>
        {recent.length === 0 ? (
          <div className="mt-5 grid h-56 place-items-center rounded-2xl border-2 border-dashed border-line text-center">
            <div><div className="text-[22px] font-medium text-neutral-500">Chưa có gì đang làm</div><p className="mt-2 text-neutral-500">Bộ đào tạo bạn bắt đầu sẽ hiện ở đây.</p></div>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-3 gap-5">
            {recent.map(({ a, k }) => {
              const arts = k.artifacts.map((id) => S.artifacts[id]).filter(Boolean)
              const go = () => nav(a ? `/edit/${a.id}` : k.stage === 'details' ? `/kit/${k.id}/details` : k.stage === 'outline' ? `/kit/${k.id}/outline` : `/kit/${k.id}`)
              return (
                <div key={a ? a.id : k.id} className="card flex flex-col overflow-hidden transition hover:shadow-pop">
                  <button onClick={go} className="text-left">
                    <Thumb img={(a || arts[0])?.img || 'office'} className="h-40"><span className="absolute left-3 top-3 rounded-full ring-2 ring-white/70"><Avatar text={S.user.initials} size={24} /></span></Thumb>
                    <div className="px-4 pt-4">
                      <div className="flex items-center gap-1.5 text-[13px] font-medium">
                        {a ? <><CornerDownRight size={14} className="text-neutral-400" /><FormatGlyph type={a.type} size={14} />{FORMATS[a.type].name}</> : <><Box size={14} className="text-emerald-600" />Bộ đào tạo<span className="font-normal text-neutral-500">· {k.stage ? 'đang soạn' : `${arts.length} tài liệu`}</span></>}
                      </div>
                      <div className="mt-1.5 text-[15px] font-semibold leading-snug">{a ? a.title : k.title}</div>
                      <div className="mt-1 text-[13px] text-neutral-500">Cập nhật {(a || k).updated}</div>
                    </div>
                  </button>
                  <div className="flex-1" />
                  <div className="mt-4 min-h-[86px] border-t border-line px-4 pb-4 pt-3">
                    {a && <><Status s={a.status} /><button onClick={() => setShare(a)} className="btn-line mt-3 h-9 w-full">Chia sẻ</button></>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <HowItWorks open={how} onClose={() => setHow(false)} />
      <ShareModal open={!!share} art={share && S.artifacts[share.id]} onClose={() => setShare(null)} />
      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Thêm đường dẫn" sub="Trang wiki, tài liệu chia sẻ hoặc video nội bộ."
        footer={<button className="btn-dark" disabled={!url} onClick={() => { addFile({ name: url.replace(/^https?:\/\//, '').slice(0, 40), size: 'liên kết' }); setUrl(''); setLinkOpen(false) }}>Thêm</button>}>
        <input className="field" placeholder="https://wiki.congty.vn/…" value={url} onChange={(e) => setUrl(e.target.value)} />
      </Modal>
      <Modal open={rec} onClose={() => setRec(false)} title="Quay màn hình" sub="Quay thao tác kèm lời thuyết minh. Video dùng để tạo Hướng dẫn từng bước hoặc Video tương tác."
        footer={<><button className="btn-line" onClick={() => setRec(false)}>Hủy</button><button className="btn-dark" onClick={() => { addFile({ name: 'quay-man-hinh-18-11.mp4', size: '64 MB', kind: 'mp4' }); setRec(false) }}>Bắt đầu quay</button></>}>
        <div className="grid grid-cols-3 gap-3">{['Toàn màn hình', 'Một cửa sổ', 'Một tab'].map((t, i) => <div key={t} className={`rounded-xl border p-4 text-center text-[14px] ${i === 0 ? 'border-ink' : 'border-line'}`}><div className="mb-2 h-16 rounded-lg bg-neutral-100" />{t}</div>)}</div>
        <label className="mt-4 flex items-center gap-2 text-[14px]"><input type="checkbox" defaultChecked /> Thu âm thanh micro</label>
      </Modal>
      <Modal open={brand} onClose={() => setBrand(false)} title="Thêm thương hiệu" sub="Màu, phông chữ và logo áp dụng cho mọi tài liệu trong bộ đào tạo."
        footer={<button className="btn-dark" onClick={() => setBrand(false)}>Áp dụng</button>}>
        {['Mặc định (cam)', 'Khối Phần mềm (xanh)'].map((b, i) => (
          <label key={b} className="mb-2 flex items-center gap-3 rounded-xl border border-line p-3"><input type="radio" name="brand" defaultChecked={i === 0} /><span className="h-6 w-6 rounded" style={{ background: i ? '#1d5f95' : '#ff6119' }} />{b}</label>
        ))}
      </Modal>
    </div>
  )
}
