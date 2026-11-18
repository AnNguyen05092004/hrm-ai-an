import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, Filter, ArrowUpDown, LayoutGrid, List, Folders, Bookmark, ArrowRight, Info, ChevronDown, Box, HelpCircle, User, Coins, LayoutGrid as Grid2, DollarSign, Check, X, ShieldCheck, Flag, Play, FileText, Code2, Send, AlertTriangle, MessageCircleQuestion, CircleDot, Bot, HardDrive, Cloud, Plug } from 'lucide-react'
import { useStore } from '../store'
import { FORMATS, SKILLS } from '../data'
import { FormatGlyph, Thumb, Status, Avatar, Modal } from '../ui'
import { TopOrg } from '../Shell'
import { ShareModal } from './Common'
import { TEAM } from '../data-team'

/* ---------- Thư viện ---------- */
export function Library() {
  const { S } = useStore()
  const nav = useNavigate()
  const [view, setView] = useState('grid')
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [share, setShare] = useState(null)
  const arts = Object.values(S.artifacts).filter((a) => !a.gen && (type === 'all' || a.type === type) && a.title.toLowerCase().includes(q.toLowerCase()))
  const kits = S.kits.filter((k) => !k.stage && k.title.toLowerCase().includes(q.toLowerCase()))
  const empty = tab === 'short' || (arts.length === 0 && kits.length === 0)
  return (
    <div className="min-h-full">
      <TopOrg />
      <div className="px-8 py-10">
        <div className="flex items-center gap-6">
          <div className="flex-1"><h1 className="font-display text-[36px] font-medium">Thư viện</h1></div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-64 items-center gap-2 rounded-lg border border-line px-3"><Search size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 text-[15px] outline-none" placeholder="Tìm trong mọi nội dung" /></div>
            <div className="relative"><select value={type} onChange={(e) => setType(e.target.value)} className="h-10 appearance-none rounded-full border border-line pl-10 pr-8 text-[14px] outline-none"><option value="all">Tất cả dạng</option>{Object.entries(FORMATS).map(([k, f]) => <option key={k} value={k}>{f.name}</option>)}</select><Filter size={16} className="pointer-events-none absolute left-4 top-3.5" /><ChevronDown size={14} className="pointer-events-none absolute right-3 top-4" /></div>
            <button className="flex h-10 items-center gap-2 rounded-full border border-line px-4"><ArrowUpDown size={16} /><ChevronDown size={14} /></button>
            <button onClick={() => setView('grid')} className={`icon-btn ${view === 'grid' ? 'text-ink' : 'text-neutral-400'}`}><LayoutGrid size={20} fill={view === 'grid' ? 'currentColor' : 'none'} /></button>
            <button onClick={() => setView('list')} className={`icon-btn ${view === 'list' ? 'text-ink' : 'text-neutral-400'}`}><List size={22} /></button>
          </div>
        </div>
        <p className="-mt-1 text-[16px] text-neutral-600">Tìm, quản lý hoặc sửa mọi bản nháp và nội dung đã chia sẻ.</p>
        <div className="mt-8 flex gap-3">{[['all', 'Tất cả', Folders], ['short', 'Lối tắt', Bookmark]].map(([k, l, I]) => <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[16px] ${tab === k ? 'bg-neutral-100 font-semibold' : 'text-neutral-600'}`}><I size={19} />{l}</button>)}</div>
        {empty ? (
          <div className="grid place-items-center py-20 text-center">
            <svg width="280" height="200" viewBox="0 0 280 200" fill="none" stroke="#222" strokeWidth="1.4"><path d="M20 150c40-120 120-40 90 10s80-130 150-140" /><rect x="90" y="100" width="110" height="80" rx="4" /><rect x="100" y="110" width="40" height="60" fill="#f3e8ff" /><path d="M210 30l30-10-14 20z" /><circle cx="55" cy="40" r="7" fill="#ede9fe" /></svg>
            <h3 className="mt-8 text-[30px] font-medium">Bài đào tạo bạn tạo sẽ hiện ở đây</h3>
            <button onClick={() => nav('/')} className="btn-dark mt-6 h-12 px-7 text-[16px]">Bắt đầu<ArrowRight size={18} /></button>
          </div>
        ) : view === 'grid' ? (
          <>
            {kits.length > 0 && type === 'all' && <>
              <h2 className="mt-8 text-[18px] font-semibold">Bộ đào tạo ({kits.length})</h2>
              <div className="mt-5 grid grid-cols-3 gap-5">
                {kits.map((k) => <button key={k.id} onClick={() => nav(`/kit/${k.id}`)} className="card overflow-hidden text-left transition hover:shadow-pop"><Thumb img={S.artifacts[k.artifacts[0]]?.img || 'office'} className="h-40"><span className="absolute left-3 top-3 rounded-full ring-2 ring-white/70"><Avatar text={S.user.initials} size={24} /></span></Thumb><div className="px-4 pb-6 pt-4"><div className="flex items-center gap-1.5 text-[13px] font-medium"><Box size={14} className="text-emerald-600" />Bộ đào tạo<span className="font-normal text-neutral-500">· {k.artifacts.length} tài liệu</span></div><div className="mt-1.5 text-[15px] font-semibold">{k.title}</div><div className="mt-1 text-[13px] text-neutral-500">Cập nhật {k.updated}</div></div></button>)}
              </div>
            </>}
            {arts.length > 0 && <>
              <h2 className="mt-10 text-[18px] font-semibold">Nội dung ({arts.length})</h2>
              <div className="mt-5 grid grid-cols-3 gap-5">
                {arts.map((a) => <div key={a.id} className="card flex flex-col overflow-hidden transition hover:shadow-pop"><button onClick={() => nav(`/edit/${a.id}`)} className="text-left"><Thumb img={a.img} className="h-40"><span className="absolute left-3 top-3 rounded-full ring-2 ring-white/70"><Avatar text={S.user.initials} size={24} /></span></Thumb><div className="px-4 pt-4"><div className="flex items-center gap-1.5 text-[13px] font-medium"><FormatGlyph type={a.type} size={14} />{FORMATS[a.type].name}</div><div className="mt-1.5 text-[15px] font-semibold leading-snug">{a.title}</div><div className="mt-1 text-[13px] text-neutral-500">Cập nhật {a.updated}</div></div></button><div className="flex-1" /><div className="mt-4 border-t border-line px-4 pb-4 pt-3"><Status s={a.status} /><button onClick={() => setShare(a)} className="btn-line mt-3 h-9 w-full">Chia sẻ</button></div></div>)}
              </div>
            </>}
          </>
        ) : (
          <table className="mt-8 w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] text-neutral-500"><th className="py-3 font-medium">Tên</th><th className="font-medium">Dạng</th><th className="font-medium">Trạng thái</th><th className="font-medium">Người xem</th><th className="font-medium">Cập nhật</th></tr></thead>
            <tbody>{arts.map((a) => <tr key={a.id} onClick={() => nav(`/edit/${a.id}`)} className="cursor-pointer border-b border-line hover:bg-neutral-50"><td className="py-3.5 font-medium">{a.title}</td><td><span className="flex items-center gap-1.5"><FormatGlyph type={a.type} size={14} />{FORMATS[a.type].name}</span></td><td><Status s={a.status} /></td><td>{a.viewers}</td><td className="text-neutral-500">{a.updated}</td></tr>)}</tbody></table>
        )}
      </div>
      <ShareModal open={!!share} art={share && S.artifacts[share.id]} onClose={() => setShare(null)} />
    </div>
  )
}

/* ---------- Phân tích ---------- */
export function Analytics() {
  const { S } = useStore()
  const nav = useNavigate()
  const arts = Object.values(S.artifacts).filter((a) => !a.gen).sort((a, b) => b.viewers - a.viewers)
  const v = arts.reduce((s, a) => s + a.viewers, 0), se = arts.reduce((s, a) => s + a.sessions, 0), d = arts.reduce((s, a) => s + a.done, 0)
  const withV = arts.filter((a) => a.viewers)
  const rate = withV.length ? Math.round(withV.reduce((s, a) => s + a.done / a.viewers, 0) / withV.length * 100) : 0
  return (
    <div className="min-h-full"><TopOrg /><div className="px-8 py-10">
      <h1 className="font-display text-[36px] font-medium">Phân tích</h1>
      <p className="mt-1 text-[16px] text-neutral-600">Người xem và tỷ lệ hoàn thành của mọi bộ đào tạo và tài liệu nhóm bạn đã chia sẻ</p>
      <div className="mt-8 grid grid-cols-4 gap-4">
        {[['Tổng người xem', v, 'Cộng dồn mọi tài liệu'], ['Tổng lượt học', se, 'Mọi bộ và tài liệu'], ['Tổng lượt hoàn thành', d, 'Mọi tài liệu'], ['Tỷ lệ hoàn thành trung bình', `${rate}%`, 'Trung bình theo tài liệu']].map(([t, n, s]) => (
          <div key={t} className="card px-5 py-5"><div className="flex items-center gap-1.5 whitespace-nowrap text-[14px] font-medium">{t}<Info size={13} /></div><div className="mt-1.5 font-display text-[32px] leading-tight">{n}</div><div className="mt-1 text-[13px] text-neutral-600">{s}</div></div>
        ))}
      </div>
      <div className="mt-9 flex items-baseline gap-3"><h2 className="text-[19px] font-normal">Tất cả</h2><span className="text-[13px] text-neutral-600">{arts.length + S.kits.length} mục · xếp theo hoạt động</span></div>
      {[['Bộ đào tạo', S.kits.filter((k) => !k.stage).map((k) => { const as = k.artifacts.map((x) => S.artifacts[x]).filter(Boolean); const vv = as.reduce((s, a) => s + a.viewers, 0); return { id: k.id, title: k.title, img: as[0]?.img, sub: `${as.length} tài liệu`, kit: true, f: 'Bộ đào tạo', v: vv, r: vv ? Math.round(as.reduce((s, a) => s + a.done, 0) / vv * 100) : 0, to: `/kit/${k.id}` } })],
        ['Tài liệu', arts.map((a) => ({ id: a.id, title: a.title, img: a.img, f: FORMATS[a.type].name, type: a.type, v: a.viewers, r: a.viewers ? Math.round(a.done / a.viewers * 100) : 0, to: `/edit/${a.id}` }))]].map(([t, rows]) => (
        <div key={t} className="mt-6">
          <div className="text-[17px] font-medium">{t} <span className="text-neutral-500">({rows.length})</span></div>
          <table className="mt-3 w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] font-semibold text-neutral-600"><th className="w-[40%] px-4 py-3">Tiêu đề</th><th>Dạng</th><th>Người xem</th><th>Tỷ lệ hoàn thành</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id} onClick={() => nav(r.to)} className="cursor-pointer border-b border-line hover:bg-neutral-50"><td className="px-4 py-3"><div className="flex items-center gap-3"><Thumb img={r.img || 'office'} className="h-10 w-10 shrink-0 rounded" /><div><div className="font-medium">{r.title}</div>{r.sub && <div className="text-[12px] text-neutral-500">{r.sub}</div>}</div></div></td><td><span className="flex items-center gap-1.5 text-[13px] font-medium">{r.type && <FormatGlyph type={r.type} size={14} />}{r.kit && <Box size={14} className="text-emerald-600" />}{r.f}</span></td><td>{r.v}</td><td><div className="flex items-center gap-3"><div className="h-1.5 w-28 rounded-full bg-neutral-200"><div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${r.r}%` }} /></div>{r.r}%</div></td></tr>)}</tbody></table>
        </div>
      ))}
      <div className="mt-12 card p-6">
        <div className="flex items-center gap-2 text-[18px] font-semibold"><MessageCircleQuestion size={20} className="text-violet-600" />Câu hỏi AI Tutor chưa trả lời được</div>
        <p className="mt-1 text-[14px] text-neutral-600">Dấu hiệu khóa đang thiếu nội dung. Gửi người soạn để bổ sung.</p>
        <table className="mt-4 w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] text-neutral-500"><th className="py-2 font-medium">Câu hỏi</th><th className="font-medium">Khóa</th><th className="font-medium">Số lần hỏi</th><th className="font-medium">Gần nhất</th><th /></tr></thead>
          <tbody>{S.tutorMissed.map((m, i) => <tr key={i} className="border-b border-line"><td className="py-3 font-medium">{m.q}</td><td className="text-neutral-600">{m.course}</td><td>{m.n}</td><td className="text-neutral-500">{m.at}</td><td className="text-right"><button onClick={() => { const a = Object.values(S.artifacts).find((x) => x.title === m.course); if (a) nav(`/edit/${a.id}`) }} className="btn-line btn-sm">Thêm nội dung</button></td></tr>)}</tbody></table>
      </div>
    </div></div>
  )
}

/* ---------- Chấm bài ---------- */
export function Grading() {
  const { S, set, say } = useStore()
  const [sel, setSel] = useState(S.submissions[0]?.id)
  const [dec, setDec] = useState({})
  const [rub, setRub] = useState({})
  const sub = S.submissions.find((x) => x.id === sel)
  const art = sub && S.artifacts[sub.art]
  const qz = art?.quiz
  const eq = qz?.questions.find((x) => x.type === 'essay')
  const RUB = eq?.rubric || []
  const r = rub[sel] || (sub?.ai || []).map((x) => x.ok)
  const mcScore = sub ? sub.mc.reduce((a, b) => a + b, 0) : 0
  const essayOk = r.filter(Boolean).length >= Math.ceil(RUB.length * 2 / 3)
  const total = sub ? Math.round(((mcScore + (essayOk ? 1 : 0)) / (sub.mc.length + 1)) * 100) : 0
  const flagsOpen = sub ? sub.flags.filter((_, i) => !dec[`${sel}-${i}`]).length : 0
  const pass = total >= (qz?.passScore || 80)
  return (
    <div className="flex h-full">
      <aside className="w-[340px] shrink-0 border-r border-line">
        <div className="px-6 py-6"><h1 className="text-[28px] font-semibold">Chấm bài</h1><p className="mt-1 text-[14px] text-neutral-600">Bài thi chính thức chờ xác nhận</p></div>
        {S.submissions.map((x) => (
          <button key={x.id} onClick={() => setSel(x.id)} className={`flex w-full items-center gap-3 border-t border-line px-6 py-4 text-left ${sel === x.id ? 'bg-navsel' : 'hover:bg-neutral-50'}`}>
            <Avatar text={x.who.replace(/\(.*\)/, '').trim().split(' ').pop()[0]} size={36} color="#64748b" />
            <div className="flex-1"><div className="text-[15px] font-semibold">{x.who}</div><div className="text-[12px] text-neutral-500">{S.artifacts[x.art]?.title.slice(0, 30)}… · {x.at}</div></div>
            {x.status === 'grading' ? <span className="flex items-center gap-1 text-[12px] font-semibold text-amber-700">{x.flags.length > 0 && <Flag size={12} />}Chờ</span> : x.status === 'failed' ? <span className="flex items-center gap-1 text-[12px] font-semibold text-red-600"><X size={14} />Chưa đạt</span> : <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-700"><Check size={14} />Đạt</span>}
          </button>
        ))}
      </aside>
      {sub && (
        <div className="scroll-thin flex-1 overflow-y-auto px-10 py-8">
          <div className="flex items-start">
            <div><div className="text-[13px] text-neutral-500">{sub.code} · Thi chính thức · {SKILLS.find((s) => s.id === qz.skill)?.name} mức {qz.level}</div><h2 className="mt-1 text-[26px] font-semibold">{sub.who}</h2></div>
            <div className="flex-1" />
            <div className="text-right"><div className="text-[13px] text-neutral-500">Điểm tạm</div><div className={`text-[34px] font-display ${pass ? 'text-emerald-700' : 'text-red-600'}`}>{total}%</div><div className="text-[12px] text-neutral-500">Điểm đạt {qz.passScore}%</div></div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="card p-4"><div className="text-[13px] text-neutral-500">Trắc nghiệm · code chấm</div><div className="mt-1 text-[22px] font-semibold">{mcScore}/{sub.mc.length}</div></div>
            <div className="card p-4"><div className="text-[13px] text-neutral-500">Tự luận · AI chấm nháp</div><div className="mt-1 text-[22px] font-semibold">{r.filter(Boolean).length}/{RUB.length} tiêu chí</div></div>
            <div className="card p-4"><div className="text-[13px] text-neutral-500">Cờ giám sát</div><div className="mt-1 text-[22px] font-semibold">{sub.flags.length} <span className="text-[14px] font-normal text-neutral-500">({flagsOpen} chưa xem)</span></div></div>
          </div>

          <div className="card mt-6 p-6">
            <div className="flex items-center gap-2 font-semibold"><FileText size={17} />Câu tự luận</div>
            <p className="mt-2 text-[14px] text-neutral-600">{eq?.q}</p>
            <div className="mt-4 rounded-xl bg-neutral-50 p-4 font-serif text-[15px] leading-relaxed">{sub.essay}</div>
            <div className="mt-5 text-[14px] font-semibold">Rubric · AI đề xuất, bạn xác nhận</div>
            {RUB.map((c, i) => (
              <div key={c} className="mt-2 flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-[14px]">
                <span className="flex-1">{c}{sub.ai[i]?.quote && <span className="ml-2 text-[12px] text-sky-700">"{sub.ai[i].quote}"</span>}</span>
                <span className="text-[12px] text-neutral-500">AI: {sub.ai[i]?.ok ? 'đạt' : 'chưa đạt'}</span>
                <div className="flex rounded-lg bg-neutral-100 p-0.5">{[[true, 'Đạt'], [false, 'Chưa']].map(([v, l]) => <button key={l} disabled={sub.status !== 'grading'} onClick={() => { const n = [...r]; n[i] = v; setRub({ ...rub, [sel]: n }) }} className={`rounded-md px-3 py-1 text-[13px] ${r[i] === v ? 'bg-white font-semibold shadow-card' : 'text-neutral-500'}`}>{l}</button>)}</div>
              </div>
            ))}
          </div>

          {sub.flags.length > 0 && (
            <div className="card mt-6 p-6">
              <div className="flex items-center gap-2 font-semibold"><ShieldCheck size={17} />Cờ giám sát</div>
              <p className="mt-1 text-[13px] text-neutral-600">AI chỉ gắn cờ. Xem lại đoạn ghi hình rồi quyết định. Bản ghi tự xóa sau 30 ngày, trừ bài đang được xem xét.</p>
              {sub.flags.map((f, i) => { const k = `${sel}-${i}`; return (
                <div key={i} className="mt-3 flex items-center gap-4 rounded-xl border border-line p-3">
                  <button className="grid h-14 w-24 place-items-center rounded-lg bg-neutral-800 text-white"><Play size={18} /></button>
                  <div className="flex-1"><div className="text-[14px] font-semibold"><Flag size={13} className="mr-1 inline text-red-500" />{f.kind} · {f.t}</div><div className="text-[13px] text-neutral-600">{f.note}</div></div>
                  {dec[k] ? <span className="text-[13px] font-semibold">{dec[k]}</span> : <div className="flex gap-2"><button onClick={() => setDec({ ...dec, [k]: 'Không vi phạm' })} className="btn-line btn-sm">Không vi phạm</button><button onClick={() => setDec({ ...dec, [k]: 'Vi phạm, ghi chú hồ sơ' })} className="btn-line btn-sm border-red-300 text-red-600">Vi phạm</button></div>}
                </div>) })}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line p-5">
            {sub.status === 'grading' ? (<>
              <div className="flex-1 text-[14px]">{flagsOpen > 0 ? <span className="flex items-center gap-2 text-amber-700"><AlertTriangle size={16} />Còn {flagsOpen} cờ chưa quyết định. Xử lý xong mới xác nhận được kết quả.</span> : pass ? <>Xác nhận <b>Đạt</b>: kết quả gửi sang Quản trị nhân tài, nâng {SKILLS.find((s) => s.id === qz.skill)?.name} lên <b>mức {Math.min(qz.level, 3)}</b>.</> : <>Chưa đạt. Người thi được chỉ lại bài và đoạn video cần xem, còn {qz.attempts - 1} lượt thi.</>}</div>
              <button disabled={flagsOpen > 0} onClick={() => {
                let lvMsg = ''
                set((d) => {
                  const s = d.submissions.find((x) => x.id === sel); s.status = pass ? 'passed' : 'failed'; s.sent = pass
                  // Nối sang Năng lực đội ngũ: thi chính thức đạt thì AI cập nhật mức kỹ năng
                  const w = d.wf; const p = w && [...TEAM, ...(w.members || [])].find((x) => sub.who.startsWith(x.name))
                  if (!pass || !p || !qz.skill) return
                  const from = { ...p.lv, ...((w.lv || {})[p.id] || {}) }[qz.skill] || 0, to = Math.min(qz.level, 3)
                  if (to <= from) return
                  const src = `Bài thi chính thức "${art.title}" · ${total}%`
                  if (qz.mode === 'official' && total >= qz.passScore + 5) {
                    w.lv = w.lv || {}; w.lv[p.id] = { ...(w.lv[p.id] || {}), [qz.skill]: to }
                    w.history = [{ pid: p.id, sk: qz.skill, from, to, at: '18/11', src, by: 'auto' }, ...(w.history || [])]
                    lvMsg = ` · ${p.name} tự lên mức ${to} trong Năng lực đội ngũ`
                  } else {
                    w.extraPending = [...(w.extraPending || []), { id: `ex-${sel}`, pid: p.id, sk: qz.skill, to, conf: 'medium', at: '18/11', why: 'Đạt bài thi nhưng điểm sát ngưỡng nên AI chờ bạn xác nhận.', items: [['exam', src, `ngưỡng ${qz.passScore}%`]] }]
                    lvMsg = ` · đề xuất lên mức cho ${p.name} chờ xác nhận`
                  }
                })
                setTimeout(() => say((pass ? 'Đã xác nhận Đạt, đã gửi sang Quản trị nhân tài' : 'Đã xác nhận Chưa đạt') + lvMsg), 0)
              }} className="btn-dark h-11">{pass ? <><Send size={16} />Xác nhận đạt</> : 'Xác nhận chưa đạt'}</button>
            </>) : <div className="flex items-center gap-2 text-[15px]"><Check size={18} className="text-emerald-600" />Đã xác nhận {sub.status === 'passed' ? 'Đạt' : 'Chưa đạt'}{sub.sent && ' · Đã gửi kết quả sang Quản trị nhân tài'}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Cài đặt ---------- */
export function SettingsPage() {
  const { S } = useStore()
  const [tab, setTab] = useState('profile')
  const tabs = [['profile', 'Hồ sơ', User], ['credits', 'Hạn mức AI', Coins], ['int', 'Tích hợp', Grid2]]
  return (
    <div className="min-h-full"><TopOrg /><div className="flex min-h-[calc(100%-64px)]">
      <aside className="w-[300px] shrink-0 border-r border-line px-5 py-8">{tabs.map(([k, l, I]) => <button key={k} onClick={() => setTab(k)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[16px] ${tab === k ? 'bg-navsel font-medium text-navtxt' : 'hover:bg-neutral-50'}`}><I size={20} strokeWidth={1.8} />{l}</button>)}</aside>
      <div className="flex-1">
        {tab === 'profile' && <>
          <div className="grid place-items-center border-b-8 border-neutral-100 py-10"><Avatar text="AN" size={180} /><div className="mt-5 text-[24px]">{S.user.name}</div></div>
          <div className="grid grid-cols-2 gap-14 px-10 py-10">
            <div className="space-y-7"><h3 className="text-[22px] font-semibold">Hồ sơ</h3>{[['Tên', 'An'], ['Họ', 'Nguyễn'], ['Đơn vị', S.user.org], ['Bộ phận', S.user.role]].map(([l, v]) => <div key={l}><div className="text-[15px] font-semibold">{l}</div><input className="mt-2 w-full border-b border-line pb-2 text-[17px] outline-none" defaultValue={v} /></div>)}</div>
            <div><h3 className="text-[22px] font-semibold">Tài khoản</h3><div className="mt-7 text-[15px] font-semibold">Đăng nhập</div><div className="mt-2 text-[17px]">SSO tài khoản công ty</div><h3 className="mt-10 text-[22px] font-semibold">Thông báo</h3><label className="mt-4 flex items-center gap-3 text-[16px]"><input type="checkbox" defaultChecked className="h-5 w-5" />Báo khi có bài chờ chấm hoặc đề xuất lên mức chờ xác nhận</label></div>
          </div></>}
        {tab === 'int' && <div className="max-w-[900px] px-10 py-10"><h1 className="text-[44px] font-semibold">Tích hợp</h1>
          {[[Bot, 'HR Agent', 'Nhân viên hỏi về khóa học ngay trong chat nhân sự'], [Plug, 'Quản trị nhân tài', 'Nhận skill và mức; gửi kết quả thi chính thức đạt'], [HardDrive, 'Kho tài liệu nội bộ', 'Biến tài liệu thành khóa học, hướng dẫn, tình huống'], [Cloud, 'OneDrive', 'Biến tệp thành khóa học, hướng dẫn, tình huống']].map(([I, t, s]) => <div key={t} className="card mt-5 flex items-center gap-6 p-7"><span className="grid h-20 w-20 place-items-center rounded-2xl bg-neutral-100"><I size={34} /></span><div className="flex-1"><div className="text-[24px] font-semibold">{t}</div><div className="mt-1 text-[16px] text-neutral-600">{s}</div></div><span className="flex items-center gap-1 text-[14px] font-semibold text-emerald-700"><Check size={16} />Đã kết nối</span></div>)}</div>}
        {tab === 'credits' && <div className="max-w-[700px] px-10 py-10"><h1 className="text-[44px] font-semibold">Hạn mức AI</h1><div className="card mt-6 p-6"><div className="text-[15px] text-neutral-600">Đã dùng tháng này</div><div className="mt-2 text-[36px] font-display">{S.credits.used.toLocaleString('vi-VN')} <span className="text-[18px] text-neutral-500">/ {S.credits.total.toLocaleString('vi-VN')}</span></div><div className="mt-4 h-2 rounded-full bg-neutral-200"><div className="h-2 rounded-full bg-sky-500" style={{ width: `${S.credits.used / S.credits.total * 100}%` }} /></div></div></div>}
      </div>
    </div></div>
  )
}
