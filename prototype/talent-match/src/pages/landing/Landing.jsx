// Trang đích (zero-config onboarding): kéo thả CV hoặc JD → xem kết quả phân tích ngay, chưa cần tài khoản.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, FileText, Download, ShieldCheck, Sparkles, Loader2, RotateCcw, ArrowRight, ClipboardPaste } from 'lucide-react'
import { useStore } from '../../store.jsx'
import { detectKind, parseCv, parseJd, effectiveCv } from '../../lib/extract.js'
import { rankJobs, rankCandidates, matchScore } from '../../lib/match.js'
import { SAMPLE_CV, SAMPLE_JD } from '../../data/samples.js'
import Dropzone from '../../components/Dropzone.jsx'
import Modal from '../../components/Modal.jsx'
import { Button, Card, buttonCls, cx } from '../../ui.jsx'
import CvResult, { ParsedCv } from './CvResult.jsx'
import JdResult, { ParsedJd } from './JdResult.jsx'

const STEPS = ['Đọc nội dung file', 'Tách kỹ năng, kinh nghiệm, yêu cầu', 'Chấm theo tiêu chí có trọng số']
const STEP_MS = 420
const MIN_TEXT = 40

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-700 text-white" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
      </span>
      <span className="text-[15px] font-semibold">Talent Match</span>
    </Link>
  )
}

function Analyzing({ step }) {
  return (
    <Card className="mx-auto max-w-md p-6" role="status" aria-live="polite">
      <p className="font-semibold">Đang phân tích…</p>
      <ul className="mt-4 space-y-3">
        {STEPS.map((label, i) => (
          <li key={label} className={cx('flex items-center gap-3 text-sm', i > step && 'text-mute')}>
            <span className={cx('flex h-6 w-6 items-center justify-center rounded-full', i < step ? 'bg-accent-700 text-white' : 'bg-soft ring-1 ring-line')}>
              {i < step ? <Check size={14} aria-hidden /> : i === step ? <Loader2 size={14} className="animate-spin text-accent-700" aria-hidden /> : null}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Landing() {
  const s = useStore()
  const navigate = useNavigate()
  const [input, setInput] = useState(null) // { text, kind, source }
  const [step, setStep] = useState(0)
  const [paste, setPaste] = useState(false)
  const [pasted, setPasted] = useState('')
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const resultRef = useRef(null)

  const analyzing = input && step < STEPS.length
  useEffect(() => {
    if (!input || step >= STEPS.length) return undefined
    const t = setTimeout(() => setStep((x) => x + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [input, step])
  useEffect(() => {
    if (input && !analyzing) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [input, analyzing])

  const start = (text, source) => { setInput({ text, kind: detectKind(text), source }); setStep(0); setSelected(null); setPaste(false) }
  const openJobs = s.jobs.filter((j) => s.statusOf(j.id) !== 'draft')

  const result = useMemo(() => {
    if (!input) return null
    if (input.kind === 'cv') {
      const cv = parseCv(input.text, { id: 'cv-me' })
      return { cv, ranking: rankJobs(effectiveCv(cv).cv, openJobs, (j) => s.criteriaOf(j.id)) }
    }
    const job = parseJd(input.text)
    return { job, m: matchScore(job, s.cvs[0]), ranking: rankCandidates(job, s.cvs) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ phân tích lại khi đổi nội dung đầu vào
  }, [input])

  const confirm = () => {
    if (input.kind === 'cv') {
      s.saveCv(result.cv)
      s.setMe(result.cv.id)
      s.setRole('candidate')
      navigate(`/me/resume/match/${selected ?? result.ranking[0].job.id}`)
    } else {
      s.addJob(result.job)
      s.setRole('recruiter')
      navigate(`/jobs/${result.job.id}?tab=criteria`)
    }
  }
  const demoHome = s.role === 'candidate' ? '/me/home' : '/jobs'

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <a href="#cach-cham" className="hidden rounded-full px-3 py-1.5 text-sm text-mute hover:text-ink sm:block">Cách chấm điểm</a>
            <Link to={demoHome} className={buttonCls('secondary', 'md')}>Vào bản demo</Link>
          </nav>
        </div>
      </header>

      <main>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:pt-16">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-800 ring-1 ring-accent-200">
            <Sparkles size={13} aria-hidden />Miễn phí · Không cần đăng ký
          </p>
          <h1 className="mt-4 text-[34px] font-bold leading-[1.15] tracking-tight sm:text-[44px]">Thả CV hoặc JD vào,<br />biết ngay phù hợp bao nhiêu %.</h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-mute">
            Hệ thống đọc file, tách kỹ năng và chấm theo tiêu chí có trọng số. Mỗi con số đi kèm lý do: vì sao phù hợp, còn thiếu gì, bổ sung thì tăng bao nhiêu.
          </p>
          <ul className="mt-6 space-y-2.5 text-[15px]">
            {[
              <><b>Ứng viên</b> thả CV: thấy {openJobs.length} vị trí đang tuyển xếp theo mức phù hợp.</>,
              <><b>Nhà tuyển dụng</b> thả JD: nhận cây tiêu chí và ứng viên hợp nhất trong kho {s.cvs.length} hồ sơ.</>,
              <>File được đọc ngay trên trình duyệt, không gửi lên máy chủ.</>,
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-700 text-white"><Check size={12} aria-hidden /></span><span>{t}</span></li>
            ))}
          </ul>
        </div>

        <Card className="p-5 sm:p-6">
          {paste ? (
            <div>
              <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={10} autoFocus aria-label="Dán nội dung CV hoặc JD"
                placeholder="Dán toàn bộ nội dung CV hoặc mô tả công việc vào đây…"
                className="w-full resize-none rounded-xl border-0 bg-paper p-3 text-sm leading-relaxed ring-1 ring-line focus:ring-2 focus:ring-accent-500/40" />
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setPaste(false)}>Huỷ</Button>
                <Button variant="accent" disabled={pasted.trim().length < MIN_TEXT} onClick={() => start(pasted, 'Văn bản dán vào')}>Phân tích</Button>
              </div>
            </div>
          ) : (
            <>
              <Dropzone onText={(text, file) => start(text, file.name)} title="Kéo thả CV hoặc JD (PDF)" />
              <div className="mt-3 flex items-center gap-3 text-xs text-mute"><span className="h-px flex-1 bg-line" />hoặc<span className="h-px flex-1 bg-line" /></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Button variant="secondary" onClick={() => start(SAMPLE_CV, 'CV mẫu')}><FileText size={15} aria-hidden />Thử CV mẫu</Button>
                <Button variant="secondary" onClick={() => start(SAMPLE_JD, 'JD mẫu')}><FileText size={15} aria-hidden />Thử JD mẫu</Button>
                <Button variant="secondary" onClick={() => setPaste(true)}><ClipboardPaste size={15} aria-hidden />Dán nội dung</Button>
              </div>
              <p className="mt-3 flex items-center gap-1 text-xs text-mute"><ShieldCheck size={13} aria-hidden />Không lưu file khi bạn chưa đồng ý.</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-mute">
                <span>Tải file mẫu để thử kéo thả:</span>
                <a href="/samples/cv-mau.pdf" download className="inline-flex items-center gap-0.5 font-medium text-accent-800 hover:underline"><Download size={12} aria-hidden />CV</a>
                <a href="/samples/jd-mau.pdf" download className="inline-flex items-center gap-0.5 font-medium text-accent-800 hover:underline"><Download size={12} aria-hidden />JD</a>
              </p>
            </>
          )}
        </Card>
      </section>

      {input && (
        <section ref={resultRef} className="scroll-mt-4 border-t border-line bg-white/60 py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {analyzing ? <Analyzing step={step} /> : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent-800">Kết quả phân tích · {input.source}</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">{input.kind === 'cv' ? 'CV này hợp với vị trí nào?' : 'Ai trong kho hợp với JD này?'}</h2>
                    <p className="mt-1 text-sm text-mute">
                      Nhận dạng là <b className="text-ink">{input.kind === 'cv' ? 'CV' : 'mô tả công việc'}</b>.{' '}
                      <button type="button" className="font-medium text-accent-800 hover:underline" onClick={() => setInput((x) => ({ ...x, kind: x.kind === 'cv' ? 'jd' : 'cv' }))}>
                        Không đúng? Xem như {input.kind === 'cv' ? 'JD' : 'CV'}
                      </button>
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => { setInput(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><RotateCcw size={15} aria-hidden />Thử file khác</Button>
                </div>

                <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
                  {input.kind === 'cv' ? <ParsedCv cv={result.cv} /> : <ParsedJd job={result.job} m={result.m} />}
                  {input.kind === 'cv'
                    ? <CvResult ranking={result.ranking} selected={result.ranking[0].job.id} onSelect={setSelected} />
                    : <JdResult ranking={result.ranking} />}
                </div>

                <div className="sticky bottom-4 z-10">
                  <div className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-ink px-5 py-4 text-white shadow-pop sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold">{input.kind === 'cv' ? 'Muốn tăng mức phù hợp?' : 'Muốn chỉnh tiêu chí và xem hồ sơ đầy đủ?'}</p>
                      <p className="text-sm text-white/70">{input.kind === 'cv' ? 'Lưu CV để mở chế độ đối chiếu: bấm từ khoá còn thiếu và sửa CV ngay cạnh JD.' : 'Lưu thành tin nháp để chỉnh trọng số, xem trước bảng xếp hạng và mời phỏng vấn.'}</p>
                    </div>
                    <button type="button" onClick={() => setSaving(true)} className={buttonCls('secondary', 'lg', 'shrink-0 ring-0')}>
                      {input.kind === 'cv' ? 'Lưu & mở chế độ đối chiếu' : 'Lưu thành tin nháp'}<ArrowRight size={16} aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section id="cach-cham" className="mx-auto max-w-6xl scroll-mt-4 px-4 py-14 sm:px-6">
        <h2 className="text-xl font-semibold tracking-tight">Điểm được tính thế nào?</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ['1. Tách tiêu chí từ JD', 'Kỹ năng, số năm kinh nghiệm, bằng cấp, ngoại ngữ, điều kiện làm việc. Mỗi tiêu chí có mức Bắt buộc / Quan trọng / Cộng điểm.'],
            ['2. Chấm từ trên xuống', 'Nhóm tiêu chí có trọng số (tổng 100) → từng tiêu chí có trọng số trong nhóm → mức đạt 0–100% có bằng chứng từ CV.'],
            ['3. Giải thích từng con số', 'Vì sao phù hợp, còn thiếu gì, bổ sung thì tăng bao nhiêu %. Thiếu tiêu chí bắt buộc thì tối đa hạng C.'],
          ].map(([t, d]) => (
            <Card key={t} className="p-5"><p className="font-semibold">{t}</p><p className="mt-1.5 text-sm leading-relaxed text-mute">{d}</p></Card>
          ))}
        </div>
      </section>

      {saving && (
        <Modal title={input.kind === 'cv' ? 'Lưu CV vào tài khoản' : 'Lưu thành tin tuyển dụng nháp'} onClose={() => setSaving(false)}>
          <ul className="mt-3 space-y-2 text-sm text-mute">
            {(input.kind === 'cv'
              ? ['CV được lưu để bạn sửa trong Trình tạo CV.', 'Mở chế độ đối chiếu với vị trí đã chọn.', 'Theo dõi các việc đã lưu và đã ứng tuyển.']
              : ['Tin được lưu ở trạng thái nháp, chưa đăng tuyển.', 'Bạn chỉnh trọng số và xem trước thay đổi xếp hạng.', 'Hồ sơ ứng viên hiện đầy đủ sau khi lưu.']
            ).map((t) => <li key={t} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-accent-700" aria-hidden />{t}</li>)}
          </ul>
          <p className="mt-4 rounded-xl bg-paper px-3 py-2 text-xs text-mute ring-1 ring-line">Bản demo dùng tài khoản thử nghiệm, không cần email hay mật khẩu.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSaving(false)}>Để sau</Button>
            <Button variant="accent" onClick={confirm}>Tiếp tục với tài khoản demo</Button>
          </div>
        </Modal>
      )}
      </main>
    </div>
  )
}
