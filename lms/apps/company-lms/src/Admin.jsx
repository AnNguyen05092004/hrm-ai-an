// Màn quản trị đào tạo: danh mục khóa đã nhập từ gói SCORM, chi tiết gói, báo cáo kết quả gói gửi về
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, Eye, FileArchive, RotateCcw, Trash2, Upload } from 'lucide-react'
import { humanTime } from './scormApi'
import { deletePackage, fmtSize } from './pkg'
import { LEARNERS, attemptsOf, getRecord, isDone, recKey, resetRecord, statusOf, update, useData } from './store'
import { Avatar, Badge, Drawer } from './ui'
import { fmtDate, fmtDateTime } from './format'
import { toast } from './toast'

const learnerOf = (id) => LEARNERS.find((l) => l.id === id)
const overdue = (a, rec) => a.due && !isDone(statusOf(rec)) && new Date(`${a.due}T23:59:59`) < new Date()

export function Courses({ onImport, onPreview }) {
  const { packages, records } = useData()
  const [open, setOpen] = useState(null)
  const pkg = packages.find((p) => p.id === open)
  if (!packages.length) {
    return (
      <div className="card flex flex-col items-center px-6 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-ink"><FileArchive size={26} /></span>
        <h2 className="mt-4 text-[18px]">Chưa có khóa học hay đề kiểm tra nào</h2>
        <p className="mt-1.5 max-w-[460px] text-[14px] text-ink-muted">Ở LMS, mở một khóa → Chia sẻ cả khóa → Xuất SCORM, tải gói khóa học hoặc đề kèm đáp án. Rồi nhập tệp .zip vào đây để giao cho nhân viên.</p>
        <button className="btn-dark mt-5" onClick={onImport}><Upload size={16} />Nhập gói</button>
      </div>
    )
  }
  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-line bg-canvas"><tr><th className="th">Khóa học</th><th className="th">Loại gói</th><th className="th">Điểm đạt</th><th className="th">Học viên</th><th className="th text-right"> </th></tr></thead>
          <tbody className="divide-y divide-line">
            {packages.map((p) => {
              const recs = p.assigned.map((a) => records[recKey(p.id, a.userId)] ?? {})
              const done = recs.filter((r) => isDone(statusOf(r))).length
              return (
                <tr key={p.id} className="cursor-pointer hover:bg-canvas" onClick={() => setOpen(p.id)}>
                  <td className="td"><div className="font-display text-[15px] font-medium tracking-[-0.02em]">{p.title}</div><div className="text-[12px] text-ink-subtle">Nhập {fmtDate(p.importedAt)}{p.revision > 1 ? ` · bản cập nhật thứ ${p.revision}` : ''}</div></td>
                  <td className="td text-[13px] text-ink-muted">{p.kind === 'qti' ? `Đề kiểm tra · QTI 2.1 · ${p.exam.questions.length} câu` : `Khóa học · SCORM ${p.version} · ${p.fileCount} tệp · ${fmtSize(p.size)}`}</td>
                  <td className="td">{p.mastery ?? <span className="text-ink-subtle">—</span>}</td>
                  <td className="td"><span className="font-semibold">{done}/{p.assigned.length}</span> <span className="text-[13px] text-ink-subtle">hoàn thành</span></td>
                  <td className="td text-right"><button className="btn-line btn-sm" onClick={(e) => { e.stopPropagation(); onPreview(p) }}><Eye size={14} />{p.kind === 'qti' ? 'Xem đề' : 'Xem thử'}</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <CourseDrawer pkg={pkg} onClose={() => setOpen(null)} onPreview={onPreview} />
    </>
  )
}

function CourseDrawer({ pkg, onClose, onPreview }) {
  useData() // vẽ lại khi bản ghi đổi
  const [confirmDel, setConfirmDel] = useState(false)
  if (!pkg) return null
  const remove = async () => {
    await deletePackage(pkg.id)
    update((d) => ({ ...d, packages: d.packages.filter((p) => p.id !== pkg.id), records: Object.fromEntries(Object.entries(d.records).filter(([k]) => !k.startsWith(`${pkg.id}|`))) }))
    toast('Đã gỡ khóa khỏi cổng đào tạo'); onClose()
  }
  const qti = pkg.kind === 'qti'
  const info = [['Mã gói (identifier)', pkg.identifier || '—'], ['Chuẩn', qti ? 'IMS QTI 2.1' : `SCORM ${pkg.version}`], [qti ? 'Tệp đề' : 'Tệp khởi chạy', pkg.launch], ...(qti ? [['Cấu hình đề', `Rút ${pkg.exam.pick}/${pkg.exam.questions.length} câu · ${pkg.exam.minutes} phút · ${pkg.exam.attempts} lượt`]] : []), ['Điểm đạt', pkg.mastery ?? 'Không đặt'], ['Tệp gốc', pkg.fileName], ['Dung lượng', `${pkg.fileCount} tệp · ${fmtSize(pkg.size)}`], ['Nhập lần đầu', fmtDateTime(pkg.firstImportedAt)], ['Cập nhật gần nhất', fmtDateTime(pkg.importedAt)]]
  return (
    <Drawer open onClose={onClose} title={pkg.title} w={640}>
      <div className="flex flex-wrap gap-2"><button className="btn-line btn-sm" onClick={() => onPreview(pkg)}><Eye size={14} />{qti ? 'Xem đề và đáp án' : 'Xem thử (không ghi kết quả)'}</button></div>
      <h3 className="mt-6 overline">Học viên được giao</h3>
      <div className="mt-2 divide-y divide-line rounded-lg border border-line">
        {pkg.assigned.map((a) => {
          const l = learnerOf(a.userId), rec = getRecord(pkg.id, a.userId)
          return (
            <div key={a.userId} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar person={l} />
                <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold">{l.name}</div><div className="text-[12px] text-ink-subtle">{l.id} · giao {fmtDate(a.at)}{a.due ? ` · hạn ${fmtDate(a.due)}` : ''}{overdue(a, rec) ? ' · quá hạn' : ''}</div></div>
                <Badge status={statusOf(rec)} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-4">
                <div><dt className="text-ink-subtle">Điểm</dt><dd className="font-semibold">{rec.score?.raw || '—'}</dd></div>
                <div><dt className="text-ink-subtle">Tổng thời gian</dt><dd className="font-semibold">{rec.total_time ? humanTime(rec.total_time) : '—'}</dd></div>
                <div><dt className="text-ink-subtle">{qti ? 'Số lượt thi' : 'Số phiên học'}</dt><dd className="font-semibold">{qti ? attemptsOf(rec).length : rec.sessions?.length ?? 0}</dd></div>
                <div><dt className="text-ink-subtle">Học gần nhất</dt><dd className="font-semibold">{fmtDateTime(rec.lastAt)}</dd></div>
              </dl>
              {qti && attemptsOf(rec).length > 0 && (
                <ul className="mt-2 grid gap-1 text-[13px]">{attemptsOf(rec).map((t, i) => <li key={t.id} className="flex items-center gap-2"><span className="w-14 text-ink-subtle">Lượt {i + 1}</span><Badge status={t.status} /><span>{t.score ?? (t.status === 'grading' ? `trắc nghiệm ${t.autoScore}` : '—')}</span><span className="ml-auto text-ink-subtle">{fmtDateTime(t.end ?? t.start)}</span></li>)}</ul>
              )}
              {rec.sessions?.length > 0 && (
                <details className="mt-2 text-[13px]"><summary className="cursor-pointer font-medium text-ink">Các phiên học và dữ liệu gói đã ghi</summary>
                  <table className="mt-2 w-full text-[12.5px]"><thead><tr className="text-left text-ink-subtle"><th className="py-1 font-medium">Bắt đầu</th><th className="font-medium">Thời gian</th><th className="font-medium">Trạng thái khi thoát</th><th className="font-medium">Điểm</th><th className="font-medium">exit</th></tr></thead>
                    <tbody>{rec.sessions.map((s) => <tr key={s.start} className="border-t border-line"><td className="py-1.5">{fmtDateTime(s.start)}</td><td>{humanTime(s.time)}{s.reported ? '' : ' (cổng đo)'}</td><td><Badge status={s.status} /></td><td>{s.score || '—'}</td><td className="font-mono">{s.exit || '""'}</td></tr>)}</tbody></table>
                  <div className="mt-2 break-all rounded bg-canvas px-2.5 py-2 font-mono text-[11.5px] text-ink-muted">suspend_data ({rec.suspend_data?.length ?? 0} ký tự): {rec.suspend_data || 'trống'}</div>
                </details>
              )}
              {rec.lastAt && <button className="btn-ghost btn-sm mt-2 -ml-3 text-ink-muted" onClick={() => { resetRecord(pkg.id, a.userId); toast(`Đã xóa kết quả của ${l.name} với khóa này`) }}><RotateCcw size={14} />Đặt lại kết quả</button>}
            </div>
          )
        })}
        {!pkg.assigned.length && <div className="px-4 py-3 text-[14px] text-ink-subtle">Chưa giao cho ai.</div>}
      </div>
      <h3 className="mt-6 overline">Thông tin gói</h3>
      <dl className="mt-2 divide-y divide-line rounded-lg border border-line text-[14px]">{info.map(([k, v]) => <div key={k} className="flex gap-4 px-4 py-2"><dt className="w-40 shrink-0 text-ink-subtle">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>)}</dl>
      <h3 className="mt-6 overline">Kết quả kiểm tra khi nhập</h3>
      <ul className="mt-2 space-y-1.5">{pkg.checks.map((c) => <li key={c.label} className="flex gap-2 text-[13px]">{c.ok === true ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" />}<span><b className="font-medium">{c.label}</b>{c.detail ? `: ${c.detail}` : ''}</span></li>)}</ul>
      <div className="mt-8 border-t border-line pt-4">
        {confirmDel ? (
          <div className="flex flex-wrap items-center gap-2 text-[14px]"><span className="mr-auto text-danger-text">Gỡ khóa sẽ xóa tệp gói và kết quả của học viên trên cổng này.</span><button className="btn-line btn-sm" onClick={() => setConfirmDel(false)}>Hủy</button><button className="btn btn-sm bg-danger-text text-white hover:bg-primary-pressed" onClick={remove}>Gỡ khóa</button></div>
        ) : <button className="btn-ghost btn-sm -ml-3 text-danger-text" onClick={() => setConfirmDel(true)}><Trash2 size={14} />Gỡ khóa khỏi cổng</button>}
      </div>
    </Drawer>
  )
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
export function Reports() {
  const { packages, records } = useData()
  const rows = packages.flatMap((p) => p.assigned.map((a) => ({ p, a, l: learnerOf(a.userId), rec: records[recKey(p.id, a.userId)] ?? {} })))
  const download = () => {
    const head = ['Khóa học', 'Mã nhân viên', 'Học viên', 'Trạng thái (lesson_status)', 'Điểm', 'Tổng thời gian (total_time)', 'Số phiên / lượt thi', 'Học gần nhất', 'Hạn']
    const body = rows.map(({ p, a, l, rec }) => [p.title, l.id, l.name, statusOf(rec), rec.score?.raw ?? '', rec.total_time ?? '', rec.attempts?.length ?? rec.sessions?.length ?? 0, rec.lastAt ? new Date(rec.lastAt).toISOString() : '', a.due ?? ''])
    const csv = '﻿' + [head, ...body].map((r) => r.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    Object.assign(document.createElement('a'), { href: url, download: `bao-cao-scorm-${new Date().toISOString().slice(0, 10)}.csv` }).click()
    URL.revokeObjectURL(url)
  }
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="mr-auto max-w-[640px] text-[13px] text-ink-muted">Số liệu do gói gửi về qua SCORM 1.2: trạng thái, điểm, thời gian học. Gói không gửi % tiến độ hay từng câu trả lời; muốn xem chi tiết đó, dùng trang Phân tích của LMS.</p>
        <button className="btn-line btn-sm" onClick={download} disabled={!rows.length}><Download size={14} />Tải CSV</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-line bg-canvas"><tr><th className="th">Học viên</th><th className="th">Khóa học</th><th className="th">Trạng thái</th><th className="th">Điểm</th><th className="th">Thời gian học</th><th className="th">Phiên / lượt</th><th className="th">Học gần nhất</th><th className="th">Hạn</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ p, a, l, rec }) => (
              <tr key={recKey(p.id, l.id)}>
                <td className="td"><div className="flex items-center gap-2"><Avatar person={l} size={28} /><span className="font-medium">{l.name}</span></div></td>
                <td className="td">{p.title}</td>
                <td className="td"><Badge status={statusOf(rec)} /></td>
                <td className="td">{rec.score?.raw || '—'}</td>
                <td className="td">{rec.total_time ? humanTime(rec.total_time) : '—'}</td>
                <td className="td">{rec.attempts ? `${rec.attempts.length} lượt thi` : rec.sessions?.length ?? 0}</td>
                <td className="td">{fmtDateTime(rec.lastAt)}</td>
                <td className={`td ${overdue(a, rec) ? 'font-semibold text-danger-text' : ''}`}>{a.due ? fmtDate(a.due) : '—'}{overdue(a, rec) ? ' · quá hạn' : ''}</td>
              </tr>
            ))}
            {!rows.length && <tr><td className="td text-ink-subtle" colSpan={8}>Chưa có khóa nào được giao.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
