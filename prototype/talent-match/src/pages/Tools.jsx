// Tất cả công cụ (bố cục theo Teal "All Tools"): banner + lưới công cụ + tài nguyên.
import { Link } from 'react-router-dom'
import { FileText, Search, ChevronsRight, Columns2, Upload, GraduationCap, House, HelpCircle, BookOpen, FileDown, Route } from 'lucide-react'
import { Banner } from './Home.jsx'
import { useMyRanking } from './useMyRanking.js'

function AiSearchGlyph() {
  return <span className="relative inline-flex h-5 w-5"><Search size={17} className="absolute bottom-0 left-0" /><span className="absolute -right-0.5 -top-1 text-[11px] font-bold">✦</span></span>
}

export default function Tools() {
  const { ranking } = useMyRanking()
  const top = ranking[0].job.id
  const tools = [
    { to: '/me/resume', label: 'Trình tạo CV', icon: FileText },
    { to: '/me/jobs', label: 'Tìm việc', icon: Search },
    { to: '/me/ai', label: 'Tìm việc bằng AI', icon: AiSearchGlyph },
    { to: '/me/tracker', label: 'Theo dõi việc làm', icon: ChevronsRight },
    { to: `/me/resume/match/${top}`, label: 'Chế độ đối chiếu', icon: Columns2 },
    { to: '/', label: 'Thả CV / JD để chấm nhanh', icon: Upload },
    { to: '/rules', label: 'Quy tắc chấm điểm', icon: GraduationCap },
    { to: '/me/home', label: 'Trang chủ', icon: House },
  ]
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6 sm:px-8">
      <Banner to={`/me/resume/match/${top}`} />
      <h1 className="mt-8 text-lg font-medium">Tất cả công cụ</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tools.map(({ to, label, icon: Icon }) => (
          <Link key={label} to={to} className="flex h-[120px] flex-col items-center justify-center gap-3 rounded-md border border-line text-center transition hover:border-ink/30 hover:bg-paper">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-soft text-brand-600"><Icon size={19} aria-hidden /></span>
            <span className="px-2 text-[15px]">{label}</span>
          </Link>
        ))}
      </div>
      <h2 className="mt-9 text-lg font-medium">Tài nguyên</h2>
      <ul className="mt-3 space-y-2.5 text-[15px]">
        <li><Link to="/rules" className="inline-flex items-center gap-2 text-brand-600 underline underline-offset-2"><HelpCircle size={17} aria-hidden />Cách chấm điểm và đọc phần giải thích</Link></li>
        <li><Link to="/" className="inline-flex items-center gap-2 text-brand-600 underline underline-offset-2"><BookOpen size={17} aria-hidden />Trang giới thiệu Talent Match</Link></li>
        <li><a href="/samples/cv-mau.pdf" download className="inline-flex items-center gap-2 text-brand-600 underline underline-offset-2"><FileDown size={17} aria-hidden />CV mẫu (PDF)</a></li>
        <li><a href="/samples/jd-mau.pdf" download className="inline-flex items-center gap-2 text-brand-600 underline underline-offset-2"><Route size={17} aria-hidden />JD mẫu (PDF)</a></li>
      </ul>
    </div>
  )
}
