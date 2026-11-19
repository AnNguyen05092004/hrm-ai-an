// Cài đặt → Tích hợp: gửi kết quả học sang LMS/LRS của công ty (xAPI), webhook cho hệ thống nội bộ, xuất SCORM.
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle, Send, PackageOpen, Webhook, Database, Copy, RefreshCw, Clock } from 'lucide-react'
import { useStore } from '../store'
import { Spinner, Toggle } from '../ui'
import { get, patch, post } from '../api'

const MASK = '••••••••'
const fmt = (d) => new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })

function Field({ label, hint, children }) {
  return <label className="block text-[14px]"><div className="mb-1 font-medium">{label}</div>{children}{hint && <div className="mt-1 text-[12px] text-neutral-500">{hint}</div>}</label>
}

function TestResult({ r }) {
  if (!r) return null
  return r.ok ? <span className="flex items-center gap-1.5 text-[13px] text-emerald-700"><CheckCircle2 size={15} />Gửi thử thành công{r.status ? ` (HTTP ${r.status})` : ''}</span>
    : <span className="flex items-center gap-1.5 text-[13px] text-red-600"><AlertTriangle size={15} />{r.error}</span>
}

export function IntegrationsTab() {
  const { say } = useStore()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['integrations'], queryFn: () => get('/settings/integrations') })
  const log = useQuery({ queryKey: ['integrations-log'], queryFn: () => get('/settings/integrations/log'), refetchInterval: 15_000 })
  const [x, setX] = useState(null)
  const [w, setW] = useState(null)
  const [busy, setBusy] = useState('')
  const [test, setTest] = useState({})
  const [secret, setSecret] = useState('')
  useEffect(() => { if (q.data) { setX(q.data.xapi); setW(q.data.webhook) } }, [q.data])
  if (q.isLoading || !x || !w) return <div className="mt-6"><Spinner /></div>
  const save = async (target) => {
    setBusy(target)
    try { await patch('/settings/integrations', target === 'xapi' ? { xapi: x } : { webhook: w }); await qc.invalidateQueries({ queryKey: ['integrations'] }); say('Đã lưu kết nối') } catch (e) { say(e.message) } finally { setBusy('') }
  }
  const sendTest = async (target) => {
    setBusy(`t-${target}`)
    setTest((t) => ({ ...t, [target]: null }))
    try { const r = await post('/settings/integrations/test', { target }); setTest((t) => ({ ...t, [target]: r })) } catch (e) { say(e.message) } finally { setBusy('') }
  }
  const newSecret = async () => { try { const r = await post('/settings/integrations/webhook-secret'); setSecret(r.secret); qc.invalidateQueries({ queryKey: ['integrations'] }) } catch (e) { say(e.message) } }
  const dirtyX = JSON.stringify(x) !== JSON.stringify(q.data.xapi), dirtyW = JSON.stringify(w) !== JSON.stringify(q.data.webhook)
  return (
    <div className="mt-6 max-w-[860px] space-y-6">
      <p className="text-[14px] text-neutral-600">Ba cách nối với hệ thống đào tạo sẵn có của công ty. Có thể dùng cùng lúc.</p>

      <div className="card p-6">
        <div className="flex items-start gap-3"><PackageOpen size={22} className="mt-0.5 shrink-0 text-sky-700" /><div className="flex-1">
          <div className="text-[16px] font-semibold">Xuất khóa học dạng SCORM 1.2</div>
          <p className="mt-1 text-[14px] text-neutral-600">Tải gói .zip rồi đưa lên LMS của công ty (Moodle, SAP SuccessFactors, Cornerstone, Docebo, TalentLMS…). Gói chạy độc lập với cùng giao diện học, LMS ghi được trạng thái hoàn thành, điểm bài luyện tập và tiến độ học dở.</p>
          <p className="mt-2 text-[13px] text-neutral-500">Thực hiện ở trang khóa học: <b>Chia sẻ cả khóa → Xuất SCORM</b>. Đề kiểm tra chính thức và AI Tutor chỉ có trên LMS này.</p>
        </div></div>
      </div>

      <div className="card p-6">
        <div className="flex items-start gap-3"><Database size={22} className="mt-0.5 shrink-0 text-violet-700" /><div className="flex-1">
          <div className="flex items-center gap-3"><div className="flex-1 text-[16px] font-semibold">Gửi kết quả học sang LRS (xAPI)</div><span className="text-[13px] text-neutral-500">{x.enabled ? 'Đang bật' : 'Đang tắt'}</span><Toggle on={x.enabled} onChange={(v) => setX({ ...x, enabled: v })} /></div>
          <p className="mt-1 text-[14px] text-neutral-600">Mỗi khi người học xong một phần, có kết quả thi hoặc xong cả khóa, LMS này gửi một statement xAPI 1.0.3 tới LRS của công ty (nhiều LMS có sẵn LRS: Moodle, Docebo, Cornerstone, Watershed…).</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="Địa chỉ LRS (endpoint)" hint="Ví dụ: https://lrs.congty.vn/xapi — hệ thống tự thêm /statements"><input className="field py-2" value={x.endpoint} onChange={(e) => setX({ ...x, endpoint: e.target.value })} placeholder="https://" /></Field></div>
            <Field label="Khóa (username)"><input className="field py-2" value={x.username} onChange={(e) => setX({ ...x, username: e.target.value })} /></Field>
            <Field label="Mật khẩu (secret)" hint={q.data.xapi.password ? 'Đã lưu. Để nguyên nếu không đổi.' : ''}><input type="password" className="field py-2" value={x.password} onFocus={() => x.password === MASK && setX({ ...x, password: '' })} onChange={(e) => setX({ ...x, password: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex items-center gap-3"><button className="btn-dark btn-sm h-9" disabled={!dirtyX || busy === 'xapi'} onClick={() => save('xapi')}>Lưu</button><button className="btn-line btn-sm h-9" disabled={dirtyX || !q.data.xapi.endpoint || busy === 't-xapi'} onClick={() => sendTest('xapi')}>{busy === 't-xapi' ? <Spinner size={14} w={2} /> : <Send size={14} />}Gửi thử</button><TestResult r={test.xapi} /></div>
        </div></div>
      </div>

      <div className="card p-6">
        <div className="flex items-start gap-3"><Webhook size={22} className="mt-0.5 shrink-0 text-emerald-700" /><div className="flex-1">
          <div className="flex items-center gap-3"><div className="flex-1 text-[16px] font-semibold">Webhook cho hệ thống nội bộ</div><span className="text-[13px] text-neutral-500">{w.enabled ? 'Đang bật' : 'Đang tắt'}</span><Toggle on={w.enabled} onChange={(v) => setW({ ...w, enabled: v })} /></div>
          <p className="mt-1 text-[14px] text-neutral-600">Gửi JSON tới địa chỉ của bạn cho các sự kiện <code className="text-[13px]">artifact.completed</code>, <code className="text-[13px]">exam.finished</code>, <code className="text-[13px]">course.completed</code>. Có chữ ký <code className="text-[13px]">X-LMS-Signature: sha256=…</code> (HMAC) để bên nhận kiểm tra.</p>
          <div className="mt-4"><Field label="Địa chỉ nhận"><input className="field py-2" value={w.url} onChange={(e) => setW({ ...w, url: e.target.value })} placeholder="https://hr.congty.vn/hooks/lms" /></Field></div>
          <div className="mt-3 flex items-center gap-3 text-[14px]"><span className="font-medium">Khóa ký</span><span className="text-neutral-500">{q.data.webhook.secret ? 'Đã tạo' : 'Chưa có'}</span><button className="btn-ghost h-8 text-[13px]" onClick={newSecret}><RefreshCw size={13} />Tạo khóa mới</button></div>
          {secret && <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px]"><span className="flex-1 font-mono">{secret}</span><button onClick={() => { navigator.clipboard?.writeText(secret); say('Đã sao chép khóa') }} className="flex items-center gap-1 font-medium"><Copy size={13} />Sao chép</button><span className="text-amber-800">Chỉ hiện một lần.</span></div>}
          <div className="mt-4 flex items-center gap-3"><button className="btn-dark btn-sm h-9" disabled={!dirtyW || busy === 'webhook'} onClick={() => save('webhook')}>Lưu</button><button className="btn-line btn-sm h-9" disabled={dirtyW || !q.data.webhook.url || busy === 't-webhook'} onClick={() => sendTest('webhook')}>{busy === 't-webhook' ? <Spinner size={14} w={2} /> : <Send size={14} />}Gửi thử</button><TestResult r={test.webhook} /></div>
        </div></div>
      </div>

      <div>
        <div className="mb-2 text-[15px] font-semibold">Nhật ký gửi gần đây</div>
        {!log.data?.length ? <p className="text-[14px] text-neutral-500">Chưa có sự kiện nào. Bật một kết nối, sự kiện học mới sẽ hiện ở đây.</p> : (
          <table className="w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] text-neutral-500"><th className="py-2 font-medium">Lúc</th><th className="font-medium">Gửi tới</th><th className="font-medium">Sự kiện</th><th className="font-medium">Người học</th><th className="font-medium">Trạng thái</th></tr></thead>
            <tbody>{log.data.map((r) => <tr key={r.id} className="border-b border-line"><td className="py-2.5 text-neutral-500">{fmt(r.at)}</td><td>{r.target === 'xapi' ? 'LRS (xAPI)' : 'Webhook'}</td><td className="max-w-[300px] truncate">{r.event}</td><td>{r.who}</td>
              <td>{r.deliveredAt ? <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 size={14} />Đã gửi</span> : r.attempts >= 8 ? <span className="text-red-600" title={r.error}>Dừng thử · {r.error}</span> : r.attempts ? <span className="flex items-center gap-1 text-amber-700" title={r.error}><Clock size={14} />Thử lại ({r.attempts})</span> : <span className="text-neutral-500">Đang chờ</span>}</td></tr>)}</tbody></table>)}
      </div>
    </div>
  )
}
