// Ô kéo thả file CV / JD (PDF hoặc TXT). Đọc trên trình duyệt rồi trả văn bản qua onText.
import { useRef, useState } from 'react'
import { FileUp, Loader2, AlertCircle } from 'lucide-react'
import { readFileText } from '../lib/readFile.js'
import { cx } from '../ui.jsx'

export default function Dropzone({ onText, title = 'Kéo thả file PDF vào đây', hint = 'hoặc bấm để chọn file · PDF, TXT · tối đa 5 MB', compact }) {
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handle = async (file) => {
    if (!file) return
    setBusy(true); setError('')
    try {
      onText(await readFileText(file), file)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được file.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      <button type="button" onClick={() => input.current?.click()} disabled={busy}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files?.[0]) }}
        className={cx('flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition',
          compact ? 'gap-1.5 px-4 py-5' : 'gap-2.5 px-6 py-10',
          over ? 'border-accent-600 bg-accent-50' : 'border-ink/15 bg-paper hover:border-accent-500 hover:bg-accent-50/60')}>
        <span className={cx('flex items-center justify-center rounded-full bg-white text-accent-700 shadow-card ring-1 ring-line', compact ? 'h-9 w-9' : 'h-12 w-12')}>
          {busy ? <Loader2 size={compact ? 17 : 22} className="animate-spin" aria-hidden /> : <FileUp size={compact ? 17 : 22} aria-hidden />}
        </span>
        <span className={cx('font-semibold text-ink', compact ? 'text-sm' : 'text-base')}>{busy ? 'Đang đọc file…' : title}</span>
        <span className="text-xs text-mute">{hint}</span>
      </button>
      <input ref={input} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" className="sr-only" tabIndex={-1} aria-label="Chọn file"
        onChange={(e) => handle(e.target.files?.[0])} />
      {error && <p className="mt-2 flex items-start gap-1.5 text-sm text-danger-700" role="alert"><AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />{error}</p>}
    </div>
  )
}
