// SCORM 1.2 Run-Time phía LMS công ty: đối tượng window.API mà gói tìm thấy ở cửa sổ cha.
// Kiểm tra quyền đọc/ghi và kiểu dữ liệu theo chuẩn; chỉ LMSCommit/LMSFinish mới ghi vào bản ghi học viên.

export const ERRORS = {
  0: ['No error', 'Không lỗi'],
  101: ['General exception', 'Lỗi chung (gọi sai thứ tự, ví dụ khởi tạo hai lần)'],
  201: ['Invalid argument error', 'Tham số không hợp lệ hoặc trường không có trong chuẩn'],
  202: ['Element cannot have children', 'Trường này không có _children'],
  203: ['Element not an array - cannot have count', 'Trường này không có _count'],
  301: ['Not initialized', 'Gói chưa gọi LMSInitialize hoặc phiên đã đóng'],
  401: ['Not implemented error', 'Cổng đào tạo chưa hỗ trợ trường này'],
  402: ['Invalid set value, element is a keyword', 'Không ghi được vào trường từ khóa'],
  403: ['Element is read only', 'Trường chỉ đọc, gói không được ghi'],
  404: ['Element is write only', 'Trường chỉ ghi, gói không đọc được'],
  405: ['Incorrect data type', 'Sai kiểu dữ liệu hoặc giá trị ngoài danh sách cho phép'],
}

const TIMESPAN = /^(\d{2,4}):(\d{2}):(\d{2})(?:\.(\d{1,2}))?$/
const ZERO = '0000:00:00.00'
const decimal = (v) => v === '' || (/^\d+(\.\d+)?$/.test(v) && Number(v) <= 100)
const oneOf = (...xs) => (v) => xs.includes(v)
const upTo = (n) => (v) => v.length <= n

/** r: gói đọc được · w: gói ghi được · kw: trường từ khóa · ok: kiểm tra giá trị khi ghi */
const EL = {
  'cmi._version': { r: 1, kw: 1 },
  'cmi.core._children': { r: 1, kw: 1 },
  'cmi.core.student_id': { r: 1 },
  'cmi.core.student_name': { r: 1 },
  'cmi.core.lesson_location': { r: 1, w: 1, ok: upTo(255) },
  'cmi.core.credit': { r: 1 },
  'cmi.core.lesson_status': { r: 1, w: 1, ok: oneOf('passed', 'completed', 'failed', 'incomplete', 'browsed') },
  'cmi.core.entry': { r: 1 },
  'cmi.core.score._children': { r: 1, kw: 1 },
  'cmi.core.score.raw': { r: 1, w: 1, ok: decimal },
  'cmi.core.score.min': { r: 1, w: 1, ok: decimal },
  'cmi.core.score.max': { r: 1, w: 1, ok: decimal },
  'cmi.core.total_time': { r: 1 },
  'cmi.core.lesson_mode': { r: 1 },
  'cmi.core.exit': { w: 1, ok: oneOf('time-out', 'suspend', 'logout', '') },
  'cmi.core.session_time': { w: 1, ok: (v) => TIMESPAN.test(v) },
  'cmi.suspend_data': { r: 1, w: 1, ok: upTo(4096) },
  'cmi.launch_data': { r: 1 },
  'cmi.comments': { r: 1, w: 1, ok: upTo(4096) },
  'cmi.comments_from_lms': { r: 1 },
  'cmi.student_data._children': { r: 1, kw: 1 },
  'cmi.student_data.mastery_score': { r: 1 },
  'cmi.student_data.max_time_allowed': { r: 1 },
  'cmi.student_data.time_limit_action': { r: 1 },
}
// phần tùy chọn của SCORM 1.2 mà cổng demo không lưu
const OPTIONAL = /^cmi\.(objectives|interactions|student_preference)(\.|$)/
const RW = { 'cmi.core.lesson_location': 'lesson_location', 'cmi.core.lesson_status': 'lesson_status', 'cmi.core.exit': 'exit', 'cmi.core.session_time': 'session_time', 'cmi.suspend_data': 'suspend_data', 'cmi.comments': 'comments' }

const centis = (t) => { const m = TIMESPAN.exec(t ?? ''); return m ? ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 100 + Number((m[4] ?? '0').padEnd(2, '0')) : 0 }
const p2 = (x) => String(x).padStart(2, '0')
export const timespan = (c) => `${String(Math.floor(c / 360000)).padStart(4, '0')}:${p2(Math.floor(c / 6000) % 60)}:${p2(Math.floor(c / 100) % 60)}.${p2(c % 100)}`
export const addTime = (a, b) => timespan(centis(a) + centis(b))
/** "0000:12:05.00" → "12 phút 5 giây" */
export function humanTime(t) {
  const s = Math.floor(centis(t) / 100)
  if (!s) return '0 giây'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return [h && `${h} giờ`, m && `${m} phút`, !h && x && `${x} giây`].filter(Boolean).join(' ')
}

/**
 * Tạo window.API cho một lần mở gói.
 * record: bản ghi đã lưu của học viên với gói này ({} nếu chưa học) · browse: xem thử, không ghi kết quả
 * log(entry): mỗi lệnh gói gọi · onChange(cmi): giá trị đang làm việc thay đổi · onSave(record): bản ghi mới sau Commit/Finish
 */
export function createApi({ learner, pkg, record: saved = {}, browse = false, log = () => {}, onChange = () => {}, onSave = () => {} }) {
  let record = saved
  let state = 'new' // new → running → done
  let last = 0
  let started = 0
  const score = { raw: '', min: '', max: '', ...record.score }
  const cmi = {
    lesson_location: record.lesson_location ?? '', lesson_status: record.lesson_status ?? 'not attempted', score,
    suspend_data: record.suspend_data ?? '', comments: record.comments ?? '', exit: '', session_time: '',
  }
  const fixed = {
    'cmi._version': '3.4',
    'cmi.core._children': 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time',
    'cmi.core.student_id': learner.id,
    'cmi.core.student_name': learner.scormName,
    'cmi.core.credit': browse ? 'no-credit' : 'credit',
    'cmi.core.entry': record.exit === 'suspend' ? 'resume' : record.sessions?.length ? '' : 'ab-initio',
    'cmi.core.score._children': 'raw,min,max',
    'cmi.core.total_time': record.total_time ?? ZERO,
    'cmi.core.lesson_mode': browse ? 'browse' : 'normal',
    'cmi.launch_data': '',
    'cmi.comments_from_lms': '',
    'cmi.student_data._children': 'mastery_score,max_time_allowed,time_limit_action',
    'cmi.student_data.mastery_score': pkg.mastery == null ? '' : String(pkg.mastery),
    'cmi.student_data.max_time_allowed': '',
    'cmi.student_data.time_limit_action': '',
  }
  const read = (k) => (k.startsWith('cmi.core.score.') && !k.endsWith('_children') ? score[k.slice(15)] : RW[k] ? cmi[RW[k]] : fixed[k])
  const snapshot = () => ({ ...fixed, ...Object.fromEntries(Object.keys(RW).map((k) => [k, read(k)])), 'cmi.core.score.raw': score.raw, 'cmi.core.score.min': score.min, 'cmi.core.score.max': score.max })
  const note = (text) => log({ at: Date.now(), lms: true, text })

  function save(finish) {
    if (browse) return
    const now = Date.now()
    const next = { ...record, lesson_location: cmi.lesson_location, lesson_status: cmi.lesson_status, score: { ...score }, suspend_data: cmi.suspend_data, comments: cmi.comments, firstAt: record.firstAt ?? started, lastAt: now }
    if (finish) {
      // thời gian phiên: lấy số gói báo; gói không báo thì cổng tự đo từ lúc khởi tạo
      const reported = !!cmi.session_time
      const session = reported ? cmi.session_time : timespan(Math.round((now - started) / 10))
      if (!reported) note(`Gói không báo cmi.core.session_time, cổng tự đo thời gian phiên: ${humanTime(session)}`)
      next.total_time = addTime(record.total_time ?? ZERO, session)
      next.exit = cmi.exit
      // có điểm đạt trong manifest và gói chỉ báo "completed" kèm điểm: cổng tự xếp đạt / chưa đạt
      if (pkg.mastery != null && score.raw !== '' && cmi.lesson_status === 'completed') {
        next.lesson_status = Number(score.raw) >= pkg.mastery ? 'passed' : 'failed'
        note(`Điểm ${score.raw} ${next.lesson_status === 'passed' ? '≥' : '<'} điểm đạt ${pkg.mastery} trong manifest: cổng đổi completed → ${next.lesson_status}`)
      }
      next.sessions = [...(record.sessions ?? []), { start: started, end: now, time: session, reported, status: next.lesson_status, score: score.raw, exit: cmi.exit }]
    }
    record = next
    onSave(next)
  }

  function call(fn, args, body) {
    let ret
    try { ret = body(); last = 0 } catch (e) { if (typeof e !== 'number') throw e; last = e; ret = fn === 'LMSGetValue' ? '' : 'false' }
    log({ at: Date.now(), fn, args, ret, err: last })
    return ret
  }
  const running = () => { if (state !== 'running') throw 301 }
  const element = (k) => {
    if (typeof k !== 'string' || !k) throw 201
    if (OPTIONAL.test(k)) throw 401
    const d = EL[k]
    if (!d) throw k.endsWith('._children') ? 202 : k.endsWith('._count') ? 203 : 201
    return d
  }

  const api = {
    LMSInitialize: (p = '') => call('LMSInitialize', [p], () => {
      if (p !== '') throw 201
      if (state !== 'new') throw 101
      state = 'running'; started = Date.now()
      return 'true'
    }),
    LMSGetValue: (k) => call('LMSGetValue', [k], () => {
      running()
      if (!element(k).r) throw 404
      return String(read(k) ?? '')
    }),
    LMSSetValue: (k, v) => call('LMSSetValue', [k, v], () => {
      running()
      const d = element(k)
      if (d.kw) throw 402
      if (!d.w) throw 403
      const s = String(v)
      if (!d.ok(s)) throw 405
      if (k.startsWith('cmi.core.score.')) score[k.slice(15)] = s
      else cmi[RW[k]] = s
      onChange(snapshot())
      return 'true'
    }),
    LMSCommit: (p = '') => call('LMSCommit', [p], () => {
      if (p !== '') throw 201
      running(); save(false)
      return 'true'
    }),
    LMSFinish: (p = '') => call('LMSFinish', [p], () => {
      if (p !== '') throw 201
      running(); save(true); state = 'done'
      return 'true'
    }),
    LMSGetLastError: () => String(last),
    LMSGetErrorString: (c) => ERRORS[Number(c)]?.[0] ?? '',
    LMSGetDiagnostic: (c) => ERRORS[Number(c === '' || c == null ? last : c)]?.[1] ?? '',
  }

  return {
    api,
    snapshot,
    get state() { return state },
    /** Cổng đóng khung học mà gói chưa gọi LMSFinish: tự đóng phiên để không mất thời gian học */
    close() {
      if (state !== 'running') return false
      note('Gói chưa gọi LMSFinish khi đóng khung học: cổng tự đóng phiên và lưu phần đã ghi')
      save(true); state = 'done'
      return true
    },
  }
}
