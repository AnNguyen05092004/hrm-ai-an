// Quản trị người dùng: tạo tài khoản (mật khẩu tạm hiện một lần), đổi vai, khóa / mở tài khoản, đặt lại mật khẩu.
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Copy, KeyRound, Search } from 'lucide-react'
import { useStore, useMe, initials } from '../store'
import { Avatar, Modal, Spinner } from '../ui'
import { TopOrg } from '../Shell'
import { get, post, patch } from '../api'

export const ROLE_LABEL = { admin: 'Quản trị', author: 'Người soạn', reviewer: 'Reviewer' }
export const ROLE_DESC = {
  admin: 'Quản lý người dùng, hạn mức AI, nhật ký; làm được mọi việc của người soạn',
  author: 'Tạo và soạn khóa học, mời review, xuất bản và xuất gói',
  reviewer: 'Chỉ xem khóa được mời, góp ý và kết luận Duyệt / Cần sửa',
}

function TempPassword({ data, onClose }) {
  const { say } = useStore()
  return (
    <Modal open={!!data} onClose={onClose} w={480} title="Mật khẩu tạm" sub="Chỉ hiện một lần. Gửi cho người dùng qua kênh riêng và nhắc đổi mật khẩu sau khi đăng nhập."
      footer={<button className="btn-dark h-10" onClick={onClose}>Xong</button>}>
      {data && <div className="text-[14px]">
        <div className="flex border-b border-line py-2"><span className="w-28 text-neutral-500">Email</span><b>{data.email}</b></div>
        <div className="flex items-center py-2"><span className="w-28 text-neutral-500">Mật khẩu</span><code className="flex-1 rounded bg-neutral-100 px-2 py-1 font-mono text-[15px]">{data.tempPassword}</code>
          <button className="btn-ghost btn-sm ml-2" onClick={() => { navigator.clipboard?.writeText(data.tempPassword); say('Đã sao chép mật khẩu tạm') }}><Copy size={14} />Sao chép</button></div>
      </div>}
    </Modal>
  )
}

function NewUser({ open, onClose, onCreated }) {
  const { say } = useStore()
  const blank = { name: '', email: '', role: 'author', title: '' }
  const [f, setF] = useState(blank)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const submit = async () => {
    setBusy(true)
    try { const r = await post('/users', f); setF(blank); onCreated(r); onClose() } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} w={520} title="Thêm người dùng"
      footer={<button className="btn-dark h-10" disabled={busy || f.name.trim().length < 2 || !f.email.includes('@')} onClick={submit}>{busy ? <Spinner size={18} w={2} /> : 'Tạo tài khoản'}</button>}>
      <div className="space-y-3 text-[14px]">
        <label className="block"><div className="mb-1 font-medium">Họ tên</div><input className="field py-2" maxLength={120} value={f.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="block"><div className="mb-1 font-medium">Email</div><input type="email" className="field py-2" maxLength={200} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="ten@congty.vn" /></label>
        <label className="block"><div className="mb-1 font-medium">Chức danh (tùy chọn)</div><input className="field py-2" maxLength={120} value={f.title} onChange={(e) => set('title', e.target.value)} /></label>
        <div><div className="mb-1 font-medium">Vai</div>
          <div className="space-y-2">{Object.keys(ROLE_LABEL).map((r) => (
            <label key={r} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 ${f.role === r ? 'border-ink bg-neutral-50' : 'border-line'}`}>
              <input type="radio" name="role" className="mt-1" checked={f.role === r} onChange={() => set('role', r)} />
              <span><span className="block font-semibold">{ROLE_LABEL[r]}</span><span className="block text-[13px] text-neutral-600">{ROLE_DESC[r]}</span></span>
            </label>))}</div>
        </div>
      </div>
    </Modal>
  )
}

export default function Users() {
  const { say, confirmBox } = useStore()
  const { me } = useMe()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['users'], queryFn: () => get('/users') })
  const [adding, setAdding] = useState(false)
  const [temp, setTemp] = useState(null)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] })
  const update = async (u, body, msg) => { try { await patch(`/users/${u.id}`, body); refresh(); say(msg) } catch (e) { say(e.message) } }
  const changeRole = async (u, r) => {
    const warn = u.role === 'reviewer' ? ' Các lời mời review của người này sẽ bị bỏ.' : ''
    if (await confirmBox(`Đổi vai ${u.name} thành ${ROLE_LABEL[r]}? Người này sẽ phải đăng nhập lại.${warn}`, { ok: 'Đổi vai' })) update(u, { role: r }, `Đã đổi vai ${u.name}`)
  }
  const toggle = async (u) => {
    if (u.active && !(await confirmBox(`Khóa tài khoản ${u.name}? Người này bị đăng xuất và không đăng nhập được nữa.`, { ok: 'Khóa', danger: true }))) return
    update(u, { active: !u.active }, u.active ? `Đã khóa ${u.name}` : `Đã mở lại ${u.name}`)
  }
  const reset = async (u) => {
    if (!(await confirmBox(`Đặt lại mật khẩu cho ${u.name}? Mật khẩu cũ hết hiệu lực ngay.`, { ok: 'Đặt lại' }))) return
    try { const r = await post(`/users/${u.id}/reset-password`); setTemp({ email: u.email, tempPassword: r.tempPassword }) } catch (e) { say(e.message) }
  }
  const all = q.data ?? []
  const list = all.filter((u) => (role === 'all' || u.role === role) && (!search || `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())))
  return (
    <div className="min-h-full">
      <TopOrg><button className="btn-dark btn-sm h-9" onClick={() => setAdding(true)}><UserPlus size={15} />Thêm người dùng</button></TopOrg>
      <div className="px-4 py-8 md:px-10">
        <h1 className="text-[36px] font-semibold">Người dùng</h1>
        <p className="mt-1 text-[15px] text-neutral-600">Ba vai: quản trị, người soạn khóa học và reviewer.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex w-full max-w-[320px] items-center gap-2 rounded-lg border border-line px-3"><Search size={15} className="text-neutral-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 flex-1 text-[14px] outline-none" placeholder="Tìm theo tên hoặc email" /></div>
          <div className="flex rounded-lg bg-neutral-100 p-1 text-[13px]">{[['all', 'Tất cả'], ...Object.entries(ROLE_LABEL)].map(([k, l]) => <button key={k} onClick={() => setRole(k)} className={`rounded-md px-3 py-1 ${role === k ? 'bg-white font-semibold shadow-card' : 'text-neutral-600'}`}>{l} {k === 'all' ? all.length : all.filter((u) => u.role === k).length}</button>)}</div>
        </div>
        {q.isLoading ? <div className="mt-6"><Spinner /></div> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-[14px]">
              <thead><tr className="border-b border-line text-left text-[13px] text-neutral-500"><th className="py-2 font-medium">Người dùng</th><th className="font-medium">Vai</th><th className="font-medium">Trạng thái</th><th className="font-medium">Tạo lúc</th><th /></tr></thead>
              <tbody>{list.map((u) => { const self = u.id === me.id; return (
                <tr key={u.id} className={`border-b border-line ${u.active ? '' : 'text-neutral-400'}`}>
                  <td className="py-3"><div className="flex items-center gap-3"><Avatar text={initials(u.name)} size={32} color={u.color} /><div className="leading-tight"><div className="font-medium">{u.name}{self && <span className="ml-1.5 text-[12px] font-normal text-neutral-500">(bạn)</span>}</div><div className="text-[12px] text-neutral-500">{u.email}{u.title ? ` · ${u.title}` : ''}</div></div></div></td>
                  <td><select className="field w-36 py-1 text-[13px]" value={u.role} disabled={self} onChange={(e) => changeRole(u, e.target.value)} aria-label={`Vai của ${u.name}`}>{Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
                  <td>{u.active ? <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-800">Đang hoạt động</span> : <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[12px] font-medium text-neutral-600">Đã khóa</span>}</td>
                  <td className="text-neutral-500">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="whitespace-nowrap text-right">{!self && <><button className="btn-ghost btn-sm" onClick={() => reset(u)}><KeyRound size={14} />Đặt lại mật khẩu</button><button className="btn-ghost btn-sm" onClick={() => toggle(u)}>{u.active ? 'Khóa' : 'Mở lại'}</button></>}</td>
                </tr>) })}</tbody>
            </table>
            {!list.length && <p className="py-8 text-center text-[14px] text-neutral-500">Không có người dùng phù hợp.</p>}
          </div>
        )}
      </div>
      <NewUser open={adding} onClose={() => setAdding(false)} onCreated={(r) => { refresh(); setTemp(r) }} />
      <TempPassword data={temp} onClose={() => setTemp(null)} />
    </div>
  )
}
