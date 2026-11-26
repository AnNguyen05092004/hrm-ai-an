// Bảng thao tác khi bấm một từ khoá trong JD: xem trạng thái và chèn vào CV.
import { useEffect, useRef, useState } from 'react'
import { X, Plus, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { SKILLS, LEVELS } from '../../data/skills.js'
import { gainIfMet } from '../../lib/match.js'
import { Button, ReqBadge, StatusIcon } from '../../ui.jsx'

const WIDTH = 320

function statusText(item, cv) {
  if (!item) return 'Từ khoá này có trong JD nhưng không được tính điểm.'
  if (item.status === 'met') return `Đã có: ${item.have}.`
  if (item.near) return `Chưa có ${item.label}; đang tính gần đúng theo ${item.near}.`
  if (cv.skills[item.skill]) return `Có ${item.have}, vị trí cần ${item.need}.`
  if (item.status === 'partial') return `Chỉ nhắc trong kinh nghiệm (tính mức Cơ bản), vị trí cần ${item.need}.`
  return `Chưa có trong CV. Vị trí cần ${item.need}.`
}

export default function KeywordPopover({ pick, item, cv, onClose, onAddSkill, onInsert }) {
  const ref = useRef(null)
  const need = item?.level ?? 3
  const [level, setLevel] = useState(Math.min(need, cv.skills[pick.skill] ? Math.max(cv.skills[pick.skill], need) : need))

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target) && !pick.anchor?.contains(e.target)) onClose() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onClose)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); window.removeEventListener('resize', onClose) }
  }, [onClose, pick.anchor])

  const r = pick.rect
  const left = Math.max(8, Math.min(r.left, window.innerWidth - WIDTH - 8))
  const below = r.bottom + 8 + 300 < window.innerHeight
  const style = below ? { top: r.bottom + 6, left, width: WIDTH } : { bottom: window.innerHeight - r.top + 6, left, width: WIDTH }
  const met = item?.status === 'met'
  const hasSkill = Boolean(cv.skills[pick.skill])

  return (
    <div ref={ref} role="dialog" aria-label={`Từ khoá ${SKILLS[pick.skill].name}`} style={style}
      className="fixed z-50 rounded-2xl bg-white p-4 text-sm shadow-pop ring-1 ring-line">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold">{item && <StatusIcon status={item.status} />}{SKILLS[pick.skill].name}</p>
          {item && <div className="mt-1 flex flex-wrap items-center gap-1.5"><ReqBadge req={item.req} />{!met && <span className="text-xs font-semibold text-emerald-700">+{gainIfMet(item).toLocaleString('vi-VN')}% nếu đạt</span>}</div>}
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-mute hover:bg-soft hover:text-ink" aria-label="Đóng"><X size={16} /></button>
      </div>
      <p className="mt-2 text-mute">{statusText(item, cv)}</p>

      {!met && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          <div>
            <p className="text-xs font-medium text-mute">{hasSkill ? 'Cập nhật mức ở mục Kỹ năng' : 'Thêm vào mục Kỹ năng'}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <select value={level} onChange={(e) => setLevel(Number(e.target.value))} aria-label="Mức thành thạo"
                className="h-8 flex-1 rounded-lg border-0 bg-soft px-2 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent-500/40">
                {[1, 2, 3, 4, 5].map((lv) => <option key={lv} value={lv}>{LEVELS[lv]} ({lv}/5)</option>)}
              </select>
              <Button size="sm" variant="accent" onClick={() => onAddSkill(pick.skill, level)}><Plus size={14} aria-hidden />{hasSkill ? 'Cập nhật' : 'Thêm'}</Button>
            </div>
          </div>
          {cv.history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-mute">Hoặc chèn vào mô tả kinh nghiệm</p>
              <div className="mt-1.5 space-y-1">
                {cv.history.slice(0, 3).map((e, idx) => (
                  <button key={`${e.title}-${e.from}`} type="button" onClick={() => onInsert(pick.skill, idx)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left ring-1 ring-line hover:bg-soft">
                    <span className="min-w-0 truncate">{e.title} <span className="text-mute">· {e.org}</span></span>
                    <ArrowUpRight size={14} className="shrink-0 text-mute" aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="flex items-start gap-1.5 text-xs text-mute"><ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden />Chỉ thêm kỹ năng bạn thực sự có — nhà tuyển dụng sẽ hỏi lại khi phỏng vấn.</p>
        </div>
      )}
    </div>
  )
}
