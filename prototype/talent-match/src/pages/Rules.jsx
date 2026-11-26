// Quy tắc chấm điểm áp dụng cho mọi vị trí — minh bạch để người tuyển dụng giải thích được với quản lý và ứng viên.
import { EyeOff, RotateCcw, ShieldCheck } from 'lucide-react'
import { useStore } from '../store.jsx'
import { REQ, GRADES, KNOCKOUT_MIN } from '../lib/match.js'
import { Card, Button, GradeChip, ReqBadge, cx } from '../ui.jsx'

const RULES = [
  ['Kỹ năng', 'Mức hồ sơ ÷ mức yêu cầu (thang 1–5), tối đa 100%. Không có đúng kỹ năng nhưng có kỹ năng gần → độ tương đồng × mức (ví dụ MySQL ≈ PostgreSQL 75%).'],
  ['Số năm kinh nghiệm', 'Chỉ cộng các vị trí thuộc lĩnh vực yêu cầu. Số năm ÷ số năm tối thiểu, tối đa 100%; dư nhiều được ghi chú, không trừ điểm.'],
  ['Lĩnh vực, vai trò', 'Có ít nhất một vị trí thuộc lĩnh vực / từng giữ vai trò → 100%. Đã kèm cặp nhưng chưa làm trưởng nhóm → 50%.'],
  ['Bằng cấp', 'Đủ bậc và đúng ngành → 100%; đủ bậc khác ngành → 60%; thấp hơn một bậc → 40%.'],
  ['Chứng chỉ', 'Có một trong các chứng chỉ được chấp nhận → 100%.'],
  ['Tiếng Anh', 'Quy đổi về thang IELTS. Thiếu mỗi 0,5 điểm → trừ khoảng 33%.'],
  ['Địa điểm', 'Cùng thành phố → 100%; sẵn sàng chuyển nơi ở → 70%. Vị trí làm từ xa không xét địa điểm.'],
  ['Lương kỳ vọng', 'Trong ngân sách → 100%; vượt trần không quá 15% → 50%; vượt hơn → 0%.'],
  ['Thời gian nhận việc', 'Trong thời hạn → 100%; không quá gấp đôi → 50%.'],
]

export default function Rules() {
  const s = useStore()
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quy tắc chấm điểm</h1>
        <p className="mt-1 text-sm text-mute">Áp dụng chung cho mọi vị trí. Trọng số và mức yêu cầu được chỉnh riêng ở từng tin tuyển dụng.</p>
      </div>

      <Card className="p-5">
        <p className="font-semibold">Cách tính từ trên xuống</p>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ['1', 'Nhóm tiêu chí', 'Chia 100 điểm cho 6 nhóm: chuyên môn, kinh nghiệm, học vấn, ngoại ngữ, kỹ năng mềm, điều kiện.'],
            ['2', 'Tiêu chí trong nhóm', 'Chia điểm của nhóm cho từng tiêu chí theo trọng số; gắn mức độ Bắt buộc / Quan trọng / Cộng điểm.'],
            ['3', 'Mức đạt', 'Mỗi tiêu chí được chấm 0–100% kèm bằng chứng trích từ CV. Điểm = trọng số × mức đạt.'],
          ].map(([n, t, d]) => (
            <li key={n} className="rounded-xl bg-soft p-3.5">
              <p className="flex items-center gap-2 text-sm font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-white">{n}</span>{t}</p>
              <p className="mt-1.5 text-[13px] text-mute">{d}</p>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <p className="font-semibold">Mức độ yêu cầu</p>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li className="flex gap-2"><ReqBadge req="must" /><span>Đạt dưới {KNOCKOUT_MIN * 100}% → hồ sơ tối đa hạng C. Vẫn hiển thị để người tuyển dụng quyết định.</span></li>
            <li className="flex gap-2"><ReqBadge req="important" /><span>Ảnh hưởng điểm theo trọng số, không giới hạn hạng.</span></li>
            <li className="flex gap-2"><ReqBadge req="bonus" /><span>Lợi thế. Nút “Phân bổ theo mức độ” chia trọng số {REQ.must.factor} : {REQ.important.factor} : {REQ.bonus.factor}.</span></li>
          </ul>
        </Card>
        <Card className="p-5">
          <p className="font-semibold">Hạng (mặc định, chỉnh được theo vị trí)</p>
          <ul className="mt-3 space-y-2 text-sm">
            {[['A', '≥ 85%'], ['B', '70–84%'], ['C', '50–69% hoặc thiếu tiêu chí bắt buộc'], ['D', '< 50%']].map(([g, r]) => (
              <li key={g} className="flex items-center gap-2"><GradeChip grade={g} size="sm" /><b className="font-medium">{GRADES[g].label}</b><span className="text-mute">· {r}</span></li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <p className="px-5 pt-5 font-semibold">Cách chấm mức đạt theo loại tiêu chí</p>
        <dl className="mt-3">
          {RULES.map(([k, v]) => (
            <div key={k} className="grid gap-1 border-t border-line px-5 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
              <dt className="text-sm font-medium">{k}</dt><dd className="text-sm text-mute">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="flex items-center gap-2 font-semibold"><ShieldCheck size={17} aria-hidden />Công bằng khi sàng lọc</p>
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <span>
            <span className="flex items-center gap-2 text-sm font-medium"><EyeOff size={15} aria-hidden />Ẩn danh khi sàng lọc</span>
            <span className="mt-0.5 block text-[13px] text-mute">Ẩn tên và ảnh đại diện ở danh sách, phân tích và bảng so sánh; chỉ hiện mã hồ sơ.</span>
          </span>
          <button type="button" role="switch" aria-checked={s.masked} onClick={() => s.setMasked(!s.masked)}
            className={cx('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition', s.masked ? 'bg-brand-600' : 'bg-[#d5d9e2]')}>
            <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', s.masked ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </label>
        <p className="text-[13px] text-mute">Không dùng tuổi, giới tính, quê quán, ảnh làm tiêu chí. Điểm phù hợp là gợi ý; quyết định mời hay loại do người tuyển dụng.</p>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={() => { s.resetDemo(); s.notify('Đã đặt lại dữ liệu demo') }}><RotateCcw size={15} aria-hidden />Đặt lại dữ liệu demo</Button>
      </div>
    </div>
  )
}
