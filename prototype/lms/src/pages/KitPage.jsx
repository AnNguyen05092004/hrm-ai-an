import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BarChart3, Languages, Sparkles, Target, TrendingUp, Plus, X, FileWarning, ArrowRight, Link2 } from 'lucide-react'
import { useStore, useRole } from '../store'
import { FORMATS, SKILLS } from '../data'
import { FormatIcon, FormatGlyph, Spinner, Thumb, Avatar, Status, Modal, Tip } from '../ui'
import { KitHeader } from './KitFlow'
import { ShareModal, AIPanel } from './Common'
import { buildArtifact } from '../gen'
import { Editable, EditableList } from '../edit'

const route = (a) => `/edit/${a.id}`

function GenCard({ a, onDone }) {
  const [msg, setMsg] = useState('Đang dọn dẹp…')
  useEffect(() => {
    const steps = a.type === 'qr' ? ['Đang tạo bài 1/3…', 'Đang tạo bài 2/3…', 'Đang tạo bài 3/3…', 'Đang soạn bài kiểm tra…'] : a.type === 'video' ? ['Đang tạo slide…', 'Đang đọc lời bằng giọng AI…', 'Đang chép lời và chia chương…'] : ['Đang viết nội dung…', 'Đang trích nguồn…']
    const ts = steps.map((s, i) => setTimeout(() => setMsg(s), 900 + i * 900))
    const d = setTimeout(onDone, 1200 + steps.length * 900)
    return () => { ts.forEach(clearTimeout); clearTimeout(d) }
  }, [a.id])
  return (
    <div className="card overflow-hidden">
      <div className="grid h-40 place-items-center bg-neutral-100"><div className="text-center"><Spinner size={30} /><div className="mt-2 text-[14px] text-neutral-600">{msg}</div></div></div>
      <div className="space-y-2.5 p-4"><div className="skel h-2.5 w-3/4 rounded" /><div className="skel h-2.5 w-1/2 rounded" /><div className="skel h-2.5 w-1/3 rounded" /></div>
    </div>
  )
}

export default function KitPage() {
  const { id } = useParams(); const nav = useNavigate()
  const { S, set, say } = useStore()
  const author = useRole().role === 'author'
  const kit = S.kits.find((k) => k.id === id)
  const [share, setShare] = useState(null)
  const [ai, setAi] = useState(false)
  const [tr, setTr] = useState(false)
  const [src, setSrc] = useState(false)
  const [tip, setTip] = useState(true)
  if (!kit) return null
  const arts = kit.artifacts.map((x) => S.artifacts[x]).filter(Boolean)
  const upK = (fn) => set((d) => fn(d.kits.find((k) => k.id === id)))
  const add = (type) => {
    const a = buildArtifact({ type, title: `${FORMATS[type].name}: ${kit.title}` }, kit)
    set((d) => { d.artifacts[a.id] = a; d.kits.find((k) => k.id === id).artifacts.push(a.id); d.credits.used += 1500 })
  }

  return (
    <div className="min-h-full pb-24">
      <KitHeader kit={kit} saved={false} />
      <div className="fixed right-5 top-2.5 z-40 flex gap-1">
        <Tip label="Phân tích" onClick={() => nav('/analytics')}><BarChart3 size={19} /></Tip>
        <Tip label="Dịch" onClick={() => setTr(true)}><Languages size={19} /></Tip>
        <Tip label="AI" onClick={() => setAi(true)}><Sparkles size={19} /></Tip>
      </div>
      <div className="mx-auto max-w-[880px] px-6 pt-10">
        {kit.fromPlan && author && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-[14px]">
            <Target size={18} className="shrink-0 text-violet-600" />
            <span className="flex-1">Bộ này được tạo từ <b>kế hoạch năng lực đội ngũ</b> để bù kỹ năng {SKILLS.find((s) => s.id === kit.skill)?.name}. Rà bản nháp, chia sẻ, rồi quay lại giao cho người còn thiếu.</span>
            <button onClick={() => nav('/workforce')} className="btn-line btn-sm shrink-0">Về kế hoạch<ArrowRight size={14} /></button>
          </div>
        )}
        <h1 className="text-[26px] font-semibold">{author ? <Editable value={kit.title} className="block" placeholder="Tên bộ đào tạo" onChange={(v) => upK((k) => { k.title = v })} /> : kit.title}</h1>
        <p className="mt-3 text-[16px] leading-relaxed">{author ? <Editable value={kit.desc} multiline className="block" placeholder="Mô tả bộ đào tạo" onChange={(v) => upK((k) => { k.desc = v })} /> : kit.desc}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
          <span className="chip bg-violet-50 text-violet-700"><Link2 size={12} />{SKILLS.find((s) => s.id === kit.skill)?.name} · đưa tới mức {kit.level}</span>
          {kit.sources.map((s) => <span key={s.name} className="chip">{s.name} · {s.ver}</span>)}
        </div>

        {kit.sourceChange && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <FileWarning size={20} className="mt-0.5 text-amber-600" />
            <div className="flex-1 text-[15px]"><b>Tài liệu nguồn đã có bản mới.</b> {kit.sourceChange.file} {kit.sourceChange.from} → {kit.sourceChange.to}. AI tìm thấy {kit.sourceChange.parts.length} phần đang trích phần bị đổi. Người học vẫn thấy bản cũ cho tới khi bạn chia sẻ bản cập nhật.</div>
            <button className="btn-dark btn-sm" onClick={() => setSrc(true)}>Xem phần bị ảnh hưởng</button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-8 rounded-2xl border border-dashed border-line px-5 py-5">
          {[[Target, 'Mục tiêu', 'goals', 'text-sky-600'], [TrendingUp, 'Chỉ số thành công', 'metrics', 'text-sky-600']].map(([I, t, k, c]) => (
            <div key={t}><div className="flex items-center gap-2 text-[16px] font-semibold"><I size={18} className={c} />{t}</div>
              <ul className="mt-3 space-y-1.5">{author ? <EditableList items={kit[k]?.length ? kit[k] : ['']} itemClass="block flex-1" onChange={(v) => upK((x) => { x[k] = v })} render={(el) => <li className="flex gap-2 text-[14px]"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink" />{el}</li>} />
                : kit[k].map((g, i) => <li key={i} className="flex gap-2 text-[14px]"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink" />{g}</li>)}</ul></div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          {arts.map((a) => a.gen ? (
            <GenCard key={a.id} a={a} onDone={() => set((d) => { delete d.artifacts[a.id].gen; d.artifacts[a.id].updated = 'Vừa xong' })} />
          ) : (
            <div key={a.id} className="card flex flex-col overflow-hidden transition hover:shadow-pop">
              <button onClick={() => nav(route(a))} className="text-left">
                <Thumb img={a.img} className="h-40"><span className="absolute left-3 top-3"><Avatar text="AN" size={26} /></span>
                  {a.type === 'video' && a.ai && <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">Video AI tạo · 08:12</span>}</Thumb>
                <div className="px-4 pt-4">
                  <div className="flex items-center gap-1.5 text-[14px] font-medium"><FormatGlyph type={a.type} size={15} />{FORMATS[a.type].name}{a.type === 'qr' && <span className="font-normal text-neutral-500">· {a.lessons.filter((l) => l.kind === 'lesson').length} bài</span>}</div>
                  <div className="mt-1.5 text-[16px] font-semibold leading-snug">{a.title}</div>
                  <div className="mt-1.5 text-[13px] text-neutral-500">Cập nhật {a.updated}</div>
                </div>
              </button>
              <div className="flex-1" />
              <div className="mt-4 border-t border-line px-4 pb-4 pt-3">
                <Status s={a.status} />
                <button onClick={() => setShare(a)} className="btn-line mt-3 h-9 w-full">Chia sẻ</button>
              </div>
            </div>
          ))}
        </div>

        {author && <>
        <div className="my-10 h-px bg-line" />
        <div className="mb-3 text-[15px] font-semibold">Thêm tài liệu</div>
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(FORMATS).map(([k, f]) => (
            <button key={k} onClick={() => add(k)} className="card relative p-3.5 text-left transition hover:shadow-pop">
              <FormatIcon type={k} size={32} r={8} /><Plus size={18} className="absolute right-3 top-4 text-neutral-500" />
              <div className="mt-3 text-[15px] font-semibold leading-tight">{f.name}</div>
              <div className="mt-1 text-[12px] leading-snug text-neutral-600">{f.desc}</div>
            </button>
          ))}
        </div>
        </>}
      </div>

      {author && tip && kit.artifacts.length > 0 && (
        <div className="fade fixed right-6 top-[58px] z-40 w-[240px] rounded-xl bg-gradient-to-br from-[#1b1340] to-[#0b1d3a] p-4 text-white shadow-pop">
          <span className="absolute -top-1.5 right-[48px] h-3 w-3 rotate-45 bg-[#1b1340]" />
          <div className="flex text-[14px] font-semibold">Dịch bộ đào tạo<div className="flex-1" /><button onClick={() => setTip(false)} aria-label="Đóng"><X size={15} /></button></div>
          <p className="mt-1.5 text-[13px] leading-snug text-white/85">Đưa bài học tới người học bằng ngôn ngữ họ dùng, cho mọi loại tài liệu trong bộ.</p>
        </div>
      )}
      <ShareModal open={!!share} art={share && S.artifacts[share.id]} onClose={() => setShare(null)} />
      <AIPanel open={ai} onClose={() => setAi(false)} scope="cả bộ đào tạo" />
      <Modal open={tr} onClose={() => setTr(false)} title="Dịch bộ đào tạo" sub={`${kit.title} · ${arts.length} tài liệu`} w={520}
        footer={<><button className="btn-line h-10" onClick={() => setTr(false)}>Hủy</button><button className="btn-dark h-10" onClick={() => { setTr(false); say('Đang dịch sang tiếng Anh. Bản dịch tạo thành bản nháp riêng.') }}><Sparkles size={16} />Dịch</button></>}>
        {['Tiếng Anh', 'Tiếng Nhật', 'Tiếng Hàn'].map((l, i) => <label key={l} className="mb-2 flex items-center gap-3 rounded-xl border border-line p-3 text-[15px]"><input type="checkbox" defaultChecked={i === 0} />{l}</label>)}
        <p className="mt-2 text-[13px] text-neutral-500">Bản dịch tạo thành bản riêng, giữ nguyên nguồn trích; rà lại rồi chia sẻ.</p>
      </Modal>
      <Modal open={src} onClose={() => setSrc(false)} title="Phần bị ảnh hưởng khi tài liệu nguồn đổi" sub={kit.sourceChange && `${kit.sourceChange.file}: ${kit.sourceChange.from} → ${kit.sourceChange.to}`} w={640}
        footer={<><button className="btn-line h-10" onClick={() => setSrc(false)}>Để sau</button><button className="btn-dark h-10" onClick={() => { set((d) => { delete d.kits.find((k) => k.id === id).sourceChange; (() => { const f = d.artifacts[d.kits.find((k) => k.id === id).artifacts[0]]; if (f) f.updated = 'Vừa xong' })() }); setSrc(false); say('AI đã cập nhật các phần bị ảnh hưởng, đang ở dạng nháp') }}><Sparkles size={16} />Để AI cập nhật nháp</button></>}>
        {kit.sourceChange?.parts.map((p) => (
          <div key={p.where} className="flex items-start gap-3 border-b border-line py-3 last:border-0"><ArrowRight size={16} className="mt-1 text-amber-600" /><div><div className="text-[15px] font-semibold">{p.where}</div><div className="text-[14px] text-neutral-600">{p.what}</div></div></div>
        ))}
      </Modal>
    </div>
  )
}
