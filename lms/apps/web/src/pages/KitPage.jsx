import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Target, TrendingUp, Plus, FileWarning, ArrowRight, Link2, AlertTriangle, RotateCw, Trash2, PackageOpen, Palette, MessageSquare } from 'lucide-react'
import { useStore, useMe } from '../store'
import { FORMATS, TYPE_ORDER } from '../data'
import { FormatIcon, FormatGlyph, Spinner, Thumb, Avatar, Status, Modal, Tip } from '../ui'
import { KitHeader, AddArtifact, GEN_FORMATS, useKit, useSkills } from './KitFlow'
import { PublishModal } from './Common'
import { KitExportModal, ExamCreateModal } from './KitShare'
import { ReviewBadge } from './Review'
import { KitThemeModal } from './KitTheme'
import { ChangeImage } from '../blocks'
import { Editable, EditableList } from '../edit'
import { saveLabel } from '../hooks'
import { get, post, patch, del } from '../api'

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function GenCard({ a }) {
  return (
    <div className="card overflow-hidden">
      <div className="grid h-40 place-items-center bg-neutral-100"><div className="text-center"><Spinner size={30} /><div className="mt-2 text-[14px] text-neutral-600">AI đang soạn {FORMATS[a.type].name.toLowerCase()}…</div></div></div>
      <div className="px-4 pt-4 text-[15px] font-semibold">{a.title}</div>
      <div className="space-y-2.5 p-4"><div className="skel h-2.5 w-3/4 rounded" /><div className="skel h-2.5 w-1/2 rounded" /></div>
    </div>
  )
}

/** Nội dung gốc: soạn, duyệt, chốt. Các định dạng cho người học chỉ tạo từ bản đã chốt */
function MasterPanel({ kitId, art, master, onLock, onCreate }) {
  const nav = useNavigate()
  if (!art) return (
    <div className="mt-8 flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <FormatIcon type="master" size={40} />
      <div className="flex-1 text-[15px]"><b>Khóa này chưa có Nội dung gốc.</b> Khóa được tạo trước khi có bước nội dung gốc. Tạo nội dung gốc (lấy các bài của Tài liệu nhanh nếu có), rà lại và chốt để tạo thêm định dạng.</div>
      <button className="btn-dark btn-sm h-9 shrink-0" onClick={onCreate}>Tạo nội dung gốc</button>
    </div>
  )
  if (art.status === 'generating') return <div className="card mt-8 flex items-center gap-4 p-5"><Spinner size={28} /><div className="text-[15px]"><b>AI đang soạn nội dung gốc…</b><div className="text-[14px] text-neutral-600">Xong thì rà lại, mời review rồi chốt.</div></div></div>
  const locked = master?.lockedVersion
  return (
    <div className="card mt-8 p-5">
      <div className="flex flex-wrap items-center gap-4">
        <FormatIcon type="master" size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="text-[17px] font-semibold">Nội dung gốc</span><Status s={locked ? 'published' : 'draft'} master />{locked && <span className="text-[13px] text-neutral-500">phiên bản {locked}</span>}{master?.changed && locked && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-800">Có thay đổi chưa chốt</span>}</div>
          <p className="mt-1 text-[14px] text-neutral-600">{locked ? 'Mọi định dạng soạn từ bản đã chốt. Sửa nội dung thì chốt lại; định dạng soạn từ bản cũ được đánh dấu để soạn lại.' : 'Bản nội dung đầy đủ, chỉ dùng nội bộ. Rà lại, mời review, rồi chốt để tạo Tài liệu nhanh, slide, video, tình huống, đề kiểm tra.'}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="btn-line btn-sm h-9" onClick={() => nav(`/review/${kitId}?a=${art.id}`)}>Review</button>
          <button className="btn-line btn-sm h-9" onClick={() => nav(`/edit/${art.id}`)}>Mở để sửa</button>
          {(!locked || master?.changed) && <button className="btn-dark btn-sm h-9" onClick={onLock}>{locked ? 'Chốt lại' : 'Chốt nội dung'}</button>}
        </div>
      </div>
    </div>
  )
}

export default function KitPage() {
  const { id } = useParams(); const nav = useNavigate()
  const { say, confirmBox } = useStore()
  const { me } = useMe()
  const qc = useQueryClient()
  const { doc: kit, up, saveState, reload } = useKit(id)
  const skills = useSkills()
  // theo dõi tài liệu đang được AI soạn và trạng thái chốt của nội dung gốc
  const live = useQuery({
    queryKey: ['kit-live', id], queryFn: () => get(`/kits/${id}`).then((k) => ({ artifacts: k.artifacts, master: k.master, bank: k.bank })),
    refetchInterval: (q) => ((q.state.data?.artifacts ?? kit?.artifacts ?? []).some((a) => a.status === 'generating') ? 2000 : false),
  })
  const changes = useQuery({ queryKey: ['source-changes', id], queryFn: () => get(`/kits/${id}/source-changes`) })
  const [share, setShare] = useState(null)
  const [add, setAdd] = useState(null)
  const [src, setSrc] = useState(false)
  const [exporting, setExporting] = useState(false)
  const review = useQuery({ queryKey: ['kits'], queryFn: () => get('/kits') }).data?.find((k) => k.id === id)?.review
  const [exam, setExam] = useState(false)
  const [theme, setTheme] = useState(false)
  if (!kit) return <div className="grid h-full place-items-center"><Spinner /></div>
  // đề trong Kho đề tạo từ tài liệu: không phải khóa học, về Kho đề
  if (kit.bank) return <Navigate to="/library?tab=exams" replace />
  const all = live.data?.artifacts ?? kit.artifacts
  const masterArt = all.find((a) => a.type === 'master')
  const master = live.data ? live.data.master : kit.master
  const locked = master?.lockedVersion ?? null
  // cùng thứ tự với trình học trong gói SCORM
  const arts = all.filter((a) => a.type !== 'master').sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type))
  const stale = (a) => locked != null && a.basedOn != null && a.basedOn < locked
  const createMaster = async () => { try { const r = await post(`/kits/${id}/master`); await live.refetch(); nav(`/edit/${r.id}`) } catch (e) { say(e.message) } }
  const refresh = async (a) => {
    if (!(await confirmBox(`Soạn lại "${a.title}" từ nội dung gốc v${locked}? Bản nháp hiện tại bị thay; bản đã xuất bản giữ nguyên tới khi bạn xuất bản lại.`, { ok: 'Soạn lại' }))) return
    try { await post(`/artifacts/${a.id}/regenerate`, { force: true }); await live.refetch(); say('AI đang soạn lại từ nội dung gốc mới') } catch (e) { say(e.message) }
  }
  const skill = skills.find((s) => s.id === kit.skill)
  const addArtifact = async (item) => {
    setAdd(null)
    try { await post(`/kits/${id}/artifacts`, item); await live.refetch(); say('AI đang soạn tài liệu mới') } catch (e) { say(e.message) }
  }
  const regen = async (a) => { try { await post(`/artifacts/${a.id}/regenerate`); await live.refetch() } catch (e) { say(e.message) } }
  const remove = async (a) => {
    if (!(await confirmBox(`Xóa "${a.title}"? Thao tác này không hoàn tác được.`, { ok: 'Xóa', danger: true }))) return
    try { await del(`/artifacts/${a.id}`); await live.refetch(); qc.invalidateQueries({ queryKey: ['kits'] }); say('Đã xóa tài liệu') } catch (e) { say(e.message) }
  }
  const delKit = async () => {
    if (!(await confirmBox(`Xóa cả khóa "${kit.title}" và ${arts.length} tài liệu? Thao tác này không hoàn tác được.`, { ok: 'Xóa', danger: true }))) return
    await del(`/kits/${id}`); qc.invalidateQueries({ queryKey: ['kits'] }); nav('/library')
  }
  const ch = changes.data ?? []

  return (
    <div className="min-h-full pb-24">
      <KitHeader kit={kit} saveText={saveLabel(saveState)} />
      <div className="fixed right-5 top-2.5 z-40 flex items-center gap-1">
        <button onClick={() => setTheme(true)} className="btn-line btn-sm mr-1 h-9"><Palette size={15} />Giao diện</button>
        <button onClick={() => nav(`/review/${id}`)} className="btn-line btn-sm mr-1 h-9"><MessageSquare size={15} />Review{review?.open > 0 && <span className="ml-0.5 rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">{review.open}</span>}</button>
        <button onClick={() => setExporting(true)} className="btn-dark btn-sm mr-1 h-9"><PackageOpen size={15} />Xuất khóa học</button>
        <Tip label="Xóa khóa học" onClick={delKit}><Trash2 size={19} /></Tip>
      </div>
      <div className="mx-auto max-w-[880px] px-6 pt-10">
        <button onClick={() => nav(`/review/${id}`)} className="mb-5 flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left text-[14px] hover:bg-neutral-50">
          <MessageSquare size={18} className="shrink-0 text-neutral-500" /><span className="flex-1">Review: <ReviewBadge review={review} />{review?.open > 0 && <span className="ml-2 text-neutral-600">· {review.open} góp ý chưa xử lý</span>}</span><ArrowRight size={16} className="text-neutral-400" />
        </button>
        <h1 className="text-[26px] font-semibold"><Editable value={kit.title} className="block" placeholder="Tên khóa học" onChange={(v) => up((k) => { k.title = v })} /></h1>
        <p className="mt-3 text-[16px] leading-relaxed"><Editable value={kit.desc} multiline className="block" placeholder="Mô tả khóa học" onChange={(v) => up((k) => { k.desc = v })} /></p>
        <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
          {skill && <span className="chip bg-violet-50 text-violet-700"><Link2 size={12} />{skill.name} · đưa tới mức {kit.level}</span>}
          {kit.sources.map((s) => <span key={s.id} className="chip">{s.name} · v{s.version}</span>)}
        </div>

        {ch.length > 0 && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <FileWarning size={20} className="mt-0.5 text-amber-600" />
            <div className="flex-1 text-[15px]"><b>Tài liệu nguồn đã có bản mới.</b> {ch.map((c) => `${c.sourceName} v${c.from} → v${c.to}`).join(', ')}. AI tìm thấy {ch.reduce((n, c) => n + c.parts.length, 0)} phần đang trích đoạn bị đổi. Gói xuất vẫn dùng bản cũ cho tới khi bạn xuất bản bản cập nhật.</div>
            <button className="btn-dark btn-sm" onClick={() => setSrc(true)}>Xem phần bị ảnh hưởng</button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-8 rounded-2xl border border-dashed border-line px-5 py-5">
          {[[Target, 'Mục tiêu', 'goals'], [TrendingUp, 'Chỉ số thành công', 'metrics']].map(([I, t, k]) => (
            <div key={t}><div className="flex items-center gap-2 text-[16px] font-semibold"><I size={18} className="text-sky-600" />{t}</div>
              <ul className="mt-3 space-y-1.5"><EditableList items={kit[k]?.length ? kit[k] : ['']} itemClass="block flex-1" onChange={(v) => up((x) => { x[k] = v })} render={(el) => <li className="flex gap-2 text-[14px]"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink" />{el}</li>} /></ul></div>
          ))}
        </div>

        <MasterPanel kitId={id} art={masterArt} master={master} onLock={() => setShare(masterArt)} onCreate={createMaster} />

        <div className="mt-10 flex items-end gap-3">
          <div className="flex-1"><h2 className="text-[19px] font-semibold">Định dạng cho người học</h2><p className="mt-0.5 text-[14px] text-neutral-600">{locked ? `Soạn từ nội dung gốc đã chốt (v${locked}). Đây là phần được xuất sang LMS công ty.` : 'Chốt nội dung gốc để tạo các định dạng.'}</p></div>
        </div>
        {arts.length > 0 && <div className="mt-4 grid grid-cols-3 gap-4">
          {arts.map((a) => a.status === 'generating' ? <GenCard key={a.id} a={a} /> : (
            <div key={a.id} className="group card flex flex-col overflow-hidden transition hover:shadow-pop">
              <div role="button" tabIndex={0} onClick={() => a.status !== 'failed' && nav(`/edit/${a.id}`)} onKeyDown={(e) => { if (e.key === 'Enter' && a.status !== 'failed') nav(`/edit/${a.id}`) }} className="cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
                <Thumb img={a.img} className="h-40"><span className="absolute left-3 top-3"><Avatar text={me.initials} size={26} color={me.color} /></span>
                  <span onClick={(e) => e.stopPropagation()} className="absolute bottom-2 right-2 opacity-0 transition group-hover:opacity-100"><ChangeImage value={a.img} className="relative" onPick={async (v) => { try { await patch(`/artifacts/${a.id}`, { img: v }); await live.refetch(); say('Đã đổi ảnh bìa') } catch (e) { say(e.message) } }} /></span>
                  {a.status === 'failed' && <span className="absolute inset-0 grid place-items-center bg-white/80 text-[14px] font-medium text-red-700"><span className="flex items-center gap-2"><AlertTriangle size={18} />AI soạn lỗi</span></span>}</Thumb>
                <div className="px-4 pt-4">
                  <div className="flex items-center gap-1.5 text-[14px] font-medium"><FormatGlyph type={a.type} size={15} />{FORMATS[a.type].name}</div>
                  <div className="mt-1.5 text-[16px] font-semibold leading-snug">{a.title}</div>
                  <div className="mt-1.5 text-[13px] text-neutral-500">Cập nhật {a.updated}</div>
                </div>
              </div>
              <div className="flex-1" />
              <div className="mt-4 border-t border-line px-4 pb-4 pt-3">
                {stale(a) && <div className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12px] leading-snug text-amber-900">Soạn từ nội dung gốc v{a.basedOn}, đã có v{locked}. <button className="font-semibold underline" onClick={() => refresh(a)}>Soạn lại</button></div>}
                <div className="flex items-center"><Status s={a.status} /><div className="flex-1" /><button onClick={() => remove(a)} className="icon-btn h-8 w-8 opacity-0 group-hover:opacity-100" aria-label="Xóa tài liệu"><Trash2 size={15} /></button></div>
                {a.status === 'failed' ? <button onClick={() => regen(a)} className="btn-line mt-3 h-9 w-full"><RotateCw size={15} />Soạn lại</button>
                  : <button onClick={() => setShare(a)} className="btn-line mt-3 h-9 w-full">Xuất bản</button>}
              </div>
            </div>
          ))}
        </div>}

        <div className="mb-3 mt-8 text-[15px] font-semibold">Tạo định dạng</div>
        <div className="grid grid-cols-5 gap-3">
          {[...GEN_FORMATS, 'exam'].map((k) => (
            <button key={k} disabled={!locked} title={locked ? undefined : 'Chốt nội dung gốc trước'} onClick={() => (k === 'exam' ? setExam(true) : setAdd(k))} className="card relative p-3.5 text-left transition enabled:hover:shadow-pop disabled:cursor-not-allowed disabled:opacity-50">
              <FormatIcon type={k} size={32} r={8} /><Plus size={18} className="absolute right-3 top-4 text-neutral-500" />
              <div className="mt-3 text-[15px] font-semibold leading-tight">{FORMATS[k].name}</div>
              <div className="mt-1 text-[12px] leading-snug text-neutral-600">{FORMATS[k].desc}</div>
            </button>
          ))}
        </div>
      </div>

      <PublishModal open={!!share} art={share} onClose={() => setShare(null)} onChanged={() => { live.refetch(); reload(); qc.invalidateQueries({ queryKey: ['kits'] }) }} />
      <KitThemeModal open={theme} kit={kit} onClose={() => setTheme(false)} onSave={(v) => { up((k) => { k.theme = v.theme; k.img = v.img }); say('Đã lưu giao diện khóa') }} />
      <KitExportModal open={exporting} kit={kit} onClose={() => setExporting(false)} onChanged={() => { live.refetch(); reload() }} />
      <ExamCreateModal open={exam} kit={kit} onClose={() => setExam(false)} onCreated={() => live.refetch()} />
      <AddArtifact kitId={id} open={!!add} initial={add || 'deck'} onClose={() => setAdd(null)} onAdd={addArtifact} />
      <Modal open={src} onClose={() => setSrc(false)} title="Phần bị ảnh hưởng khi tài liệu nguồn đổi" w={680} footer={<button className="btn-dark h-10" onClick={() => setSrc(false)}>Đóng</button>}>
        {ch.map((c) => (
          <div key={c.sourceId} className="mb-4">
            <div className="text-[14px] font-semibold text-neutral-600">{c.sourceName}: v{c.from} → v{c.to}</div>
            {c.parts.map((p, i) => (
              <button key={i} onClick={() => nav(`/edit/${p.artifactId}${p.lessonId ? `?lesson=${p.lessonId}` : ''}`)} className="flex w-full items-start gap-3 border-b border-line py-3 text-left last:border-0 hover:bg-neutral-50">
                <ArrowRight size={16} className="mt-1 shrink-0 text-amber-600" />
                <div className="flex-1"><div className="text-[15px] font-semibold">{p.where}</div><div className="text-[14px] text-neutral-600">{p.what}</div></div>
                {p.t != null && <span className="text-[13px] text-neutral-500">{mmss(p.t)}</span>}
              </button>
            ))}
          </div>
        ))}
      </Modal>
    </div>
  )
}
