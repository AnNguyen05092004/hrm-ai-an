// Nhập gói SCORM: chọn .zip → cổng kiểm tra manifest → đặt tên, giao cho nhân viên → lưu tệp
import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileArchive, Loader2, Upload, XCircle } from 'lucide-react'
import { deletePackage, ensureWorker, fmtSize, readPackage, savePackage } from './pkg'
import { LEARNERS, update, useData } from './store'
import { Modal } from './ui'
import { toast } from './toast'

const newId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export default function ImportModal({ open, onClose }) {
  const [step, setStep] = useState('pick') // pick | reading | review | saving
  const [err, setErr] = useState('')
  const [res, setRes] = useState(null)
  const [form, setForm] = useState({})
  const [prog, setProg] = useState([0, 0])
  const [over, setOver] = useState(false)
  const input = useRef(null)
  const { packages } = useData()

  const reset = () => { setStep('pick'); setErr(''); setRes(null); setProg([0, 0]) }
  const close = () => { if (step === 'saving') return; reset(); onClose() }

  const pick = async (file) => {
    if (!file) return
    setErr(''); setStep('reading')
    try {
      const r = await readPackage(file)
      const same = r.info && packages.find((p) => p.identifier && p.identifier === r.info.identifier)
      setRes(r)
      setForm({ title: same?.title ?? r.info?.title ?? '', assign: LEARNERS.map((l) => l.id), due: '', sameId: same?.id ?? null, replace: same?.id ?? null })
      setStep('review')
    } catch (e) { setErr(e.message); setStep('pick') }
  }

  const blocked = !res?.info || res.checks.some((c) => c.ok === false)
  const save = async () => {
    setStep('saving')
    try {
      await ensureWorker()
      const id = form.replace ?? newId()
      if (form.replace) await deletePackage(id)
      await savePackage(id, res.files, (a, b) => setProg([a, b]))
      const now = Date.now()
      const meta = { ...res.info, id, title: form.title.trim() || res.info.title, size: res.size, checks: res.checks, importedAt: now }
      update((d) => {
        const old = d.packages.find((p) => p.id === id)
        const assigned = LEARNERS.filter((l) => form.assign.includes(l.id)).map((l) => old?.assigned.find((a) => a.userId === l.id) ?? { userId: l.id, at: now, due: form.due || null })
        const pkg = { ...meta, firstImportedAt: old?.firstImportedAt ?? now, revision: (old?.revision ?? 0) + 1, assigned }
        return { ...d, packages: old ? d.packages.map((p) => (p.id === id ? pkg : p)) : [pkg, ...d.packages] }
      })
      toast(form.replace ? 'Đã cập nhật khóa, giữ nguyên kết quả của học viên' : `Đã đưa "${meta.title}" lên cổng đào tạo`)
      reset(); onClose()
    } catch (e) { setErr(`Không lưu được gói: ${e.message}`); setStep('review') }
  }

  return (
    <Modal open={open} onClose={close} title="Nhập gói SCORM">
      {(step === 'pick' || step === 'reading') && (<>
        <button type="button" onClick={() => input.current?.click()} disabled={step === 'reading'}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]) }}
          className={`flex w-full flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${over ? 'border-co-600 bg-co-50' : 'border-slate-300 hover:border-co-600 hover:bg-slate-50'}`}>
          {step === 'reading' ? <Loader2 size={30} className="spin text-co-700" /> : <Upload size={30} className="text-co-700" />}
          <div className="mt-3 text-[15px] font-semibold">{step === 'reading' ? 'Đang giải nén và đọc manifest…' : 'Kéo tệp .zip vào đây hoặc bấm để chọn'}</div>
          <div className="mt-1 text-[13px] text-slate-500">Gói SCORM 1.2, ví dụ tệp tải từ LMS: Chia sẻ cả khóa → Xuất SCORM</div>
        </button>
        <input ref={input} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => { pick(e.target.files[0]); e.target.value = '' }} />
        {err && <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-[14px] text-red-700"><XCircle size={16} className="mt-0.5 shrink-0" />{err}</p>}
      </>)}

      {(step === 'review' || step === 'saving') && res && (<>
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3"><FileArchive size={20} className="shrink-0 text-co-700" /><div className="min-w-0"><div className="truncate text-[14px] font-semibold">{res.info?.fileName ?? 'Gói'}</div><div className="text-[12px] text-slate-500">{Object.keys(res.files).length} tệp · {fmtSize(res.size)}</div></div></div>
        <h3 className="mt-5 text-[13px] font-semibold uppercase tracking-wide text-slate-500">Cổng kiểm tra gói</h3>
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
          {res.checks.map((c) => (
            <li key={c.label} className="flex gap-3 px-4 py-2.5">
              {c.ok === true ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" /> : c.ok === 'warn' ? <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-500" /> : <XCircle size={17} className="mt-0.5 shrink-0 text-red-600" />}
              <div className="min-w-0"><div className="text-[14px] font-medium">{c.label}</div>{c.detail && <div className="break-words text-[13px] text-slate-500">{c.detail}</div>}</div>
            </li>
          ))}
        </ul>
        {blocked ? <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-[14px] text-red-700">Gói chưa đạt yêu cầu nên chưa đưa lên được. Sửa gói rồi nhập lại.</p> : (<>
          {form.sameId && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[14px]">
              <div className="font-semibold text-amber-900">Đã có khóa cùng mã gói ({res.info.identifier})</div>
              <label className="mt-2 flex items-center gap-2"><input type="radio" name="imp-mode" checked={!!form.replace} onChange={() => setForm((f) => ({ ...f, replace: f.sameId }))} />Cập nhật khóa đó, giữ kết quả học viên</label>
              <label className="mt-1 flex items-center gap-2"><input type="radio" name="imp-mode" checked={!form.replace} onChange={() => setForm((f) => ({ ...f, replace: null }))} />Thêm thành khóa mới</label>
            </div>
          )}
          <label className="mt-5 block text-[14px] font-semibold" htmlFor="imp-title">Tên hiển thị trên cổng đào tạo</label>
          <input id="imp-title" className="field mt-1.5" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          {!form.replace && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <fieldset><legend className="text-[14px] font-semibold">Giao cho</legend>
                {LEARNERS.map((l) => <label key={l.id} className="mt-1.5 flex items-center gap-2 text-[14px]"><input type="checkbox" checked={form.assign.includes(l.id)} onChange={(e) => setForm((f) => ({ ...f, assign: e.target.checked ? [...f.assign, l.id] : f.assign.filter((x) => x !== l.id) }))} />{l.name} <span className="text-slate-500">· {l.id}</span></label>)}
              </fieldset>
              <div><label className="text-[14px] font-semibold" htmlFor="imp-due">Hạn hoàn thành <span className="font-normal text-slate-500">(không bắt buộc)</span></label><input id="imp-due" type="date" className="field mt-1.5" value={form.due} onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))} /></div>
            </div>
          )}
        </>)}
        {err && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2.5 text-[14px] text-red-700">{err}</p>}
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
          {step === 'saving' && <span className="mr-auto flex items-center gap-2 text-[13px] text-slate-600"><Loader2 size={15} className="spin" />Đang lưu tệp {prog[0]}/{prog[1]}</span>}
          <button className="btn-line" onClick={reset} disabled={step === 'saving'}>Chọn tệp khác</button>
          {!blocked && <button className="btn-primary" onClick={save} disabled={step === 'saving' || !form.title.trim()}>{form.replace ? 'Cập nhật khóa' : 'Đưa lên cổng đào tạo'}</button>}
        </div>
      </>)}
    </Modal>
  )
}
