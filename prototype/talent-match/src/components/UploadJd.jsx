// Nhà tuyển dụng tải JD lên → AI trích tiêu chí & trọng số → tạo tin nháp → mở ngay danh sách ứng viên tiềm năng trong kho.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ClipboardPaste, AlertCircle } from 'lucide-react'
import { useStore } from '../store.jsx'
import { detectKind, parseJd } from '../lib/extract.js'
import { SAMPLE_JD } from '../data/samples.js'
import { Button } from '../ui.jsx'
import Modal from './Modal.jsx'
import Dropzone from './Dropzone.jsx'

const MIN_TEXT = 40

export default function UploadJd({ onClose }) {
  const s = useStore()
  const navigate = useNavigate()
  const [paste, setPaste] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const create = (raw) => {
    if (raw.trim().length < MIN_TEXT) { setError('Nội dung quá ngắn để trích tiêu chí. Hãy dán đầy đủ phần mô tả và yêu cầu.'); return }
    if (detectKind(raw) === 'cv') { setError('File này giống một CV, không phải mô tả công việc. Hãy chọn file JD.'); return }
    const job = parseJd(raw)
    s.addJob(job)
    s.notify('Đã tạo tin nháp từ JD — đây là ứng viên tiềm năng trong kho hồ sơ')
    onClose()
    navigate(`/jobs/${job.id}`)
  }

  return (
    <Modal title="Tải JD lên để tìm ứng viên" onClose={onClose}>
      <p className="mb-3 mt-1 text-sm text-mute">
        AI trích tiêu chí và trọng số từ JD, rồi chấm ngay toàn bộ {s.cvs.length} hồ sơ trong kho. File chỉ được đọc trên trình duyệt.
      </p>
      {paste ? (
        <div className="space-y-2">
          <textarea value={text} onChange={(e) => { setText(e.target.value); setError('') }} rows={9} autoFocus aria-label="Dán nội dung JD"
            placeholder="Dán toàn bộ mô tả công việc: chức danh, trách nhiệm, yêu cầu, quyền lợi…"
            className="w-full rounded-md border border-line p-3 text-sm placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPaste(false)}>Quay lại</Button>
            <Button variant="primary" disabled={text.trim().length < MIN_TEXT} onClick={() => create(text)}>Phân tích JD</Button>
          </div>
        </div>
      ) : (
        <>
          <Dropzone compact title="Kéo thả JD (PDF) vào đây" onText={(t) => create(t)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setPaste(true); setError('') }}><ClipboardPaste size={15} aria-hidden />Dán nội dung</Button>
            <Button variant="secondary" onClick={() => create(SAMPLE_JD)}><FileText size={15} aria-hidden />Dùng JD mẫu</Button>
          </div>
        </>
      )}
      {error && <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-danger-700"><AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />{error}</p>}
    </Modal>
  )
}
