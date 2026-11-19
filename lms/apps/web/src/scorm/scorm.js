// Nối SCORM 1.2 với LMS nhận gói: tìm đối tượng API ở cửa sổ cha, ghi trạng thái, điểm, tiến độ học dở.
// Mở gói trực tiếp (không qua LMS) thì lưu tạm vào trình duyệt để vẫn học được.

function findApi(win) {
  for (let w = win, n = 0; w && n < 12; n++) {
    if (w.API) return w.API
    if (w.parent && w.parent !== w) w = w.parent
    else break
  }
  return win.opener ? findApi(win.opener) : null
}

const fmtSession = (ms) => {
  const s = Math.floor(ms / 1000)
  const p = (x, n = 2) => String(x).padStart(n, '0')
  return `${p(Math.floor(s / 3600), 4)}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}.00`
}

export function connect(courseId) {
  const api = findApi(window)
  const key = `lms-scorm-${courseId}`
  const started = Date.now()
  let finished = false
  if (api) api.LMSInitialize('')
  const get = (k) => (api ? api.LMSGetValue(k) : '')
  const set = (k, v) => { if (api) api.LMSSetValue(k, String(v)) }
  const commit = () => { if (api) api.LMSCommit('') }
  const load = () => {
    try { return JSON.parse((api ? get('cmi.suspend_data') : localStorage.getItem(key)) || '{}') } catch { return {} }
  }
  const save = (state) => {
    const raw = JSON.stringify(state)
    if (api) { set('cmi.suspend_data', raw.slice(0, 4096)); commit() } else { try { localStorage.setItem(key, raw) } catch { /* trình duyệt chặn lưu trữ */ } }
  }
  const status = get('cmi.core.lesson_status')
  if (api && (!status || status === 'not attempted')) { set('cmi.core.lesson_status', 'incomplete'); commit() }
  return {
    connected: !!api,
    student: api ? get('cmi.core.student_name') : '',
    load, save,
    /** status: completed | passed | failed | incomplete */
    report({ status: st, score }) {
      if (!api) return
      if (score != null) { set('cmi.core.score.min', 0); set('cmi.core.score.max', 100); set('cmi.core.score.raw', Math.round(score)) }
      if (st) set('cmi.core.lesson_status', st)
      commit()
    },
    finish(done) {
      if (!api || finished) return
      finished = true
      set('cmi.core.session_time', fmtSession(Date.now() - started))
      set('cmi.core.exit', done ? '' : 'suspend')
      commit()
      api.LMSFinish('')
    },
  }
}
