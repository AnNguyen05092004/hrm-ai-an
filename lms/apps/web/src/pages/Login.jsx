import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Logo, Spinner } from '../ui'
import { post } from '../api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const qc = useQueryClient()
  const nav = useNavigate()
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      await post('/auth/login', { email: email.trim(), password })
      await qc.invalidateQueries({ queryKey: ['me'] })
      nav('/', { replace: true })
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="hero-bg grid min-h-full place-items-center p-6">
      <form onSubmit={submit} className="card w-full max-w-[420px] p-8 shadow-pop">
        <div className="flex items-center gap-3"><Logo size={36} /><span className="h-7 w-px bg-line" /><span className="text-[18px] text-neutral-600">LMS</span></div>
        <h1 className="mt-6 text-[26px] font-bold">Đăng nhập</h1>
        <p className="mt-1 text-[15px] text-neutral-600">Dùng tài khoản công ty để vào hệ thống đào tạo.</p>
        <label className="label mt-6" htmlFor="email">Email</label>
        <input id="email" className="field" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <label className="label mt-4" htmlFor="pw">Mật khẩu</label>
        <input id="pw" className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-700" role="alert">{err}</div>}
        <button className="btn-dark mt-6 w-full" disabled={busy}>{busy ? <Spinner size={18} w={2} /> : 'Đăng nhập'}</button>
        <div className="mt-6 rounded-lg bg-neutral-50 p-3 text-[13px] text-neutral-600">
          <b>Tài khoản mẫu</b> (mật khẩu <code>demo1234</code>)
          <div className="mt-1 flex flex-wrap gap-2">
            {[['an@demo.local', 'Giám đốc · người tạo khóa'], ['ha@demo.local', 'Người học']].map(([e, l]) => (
              <button type="button" key={e} onClick={() => { setEmail(e); setPassword('demo1234') }} className="chip hover:bg-neutral-200">{l}</button>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}
