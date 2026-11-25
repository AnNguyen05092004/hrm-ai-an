// Định dạng ngày giờ cho cổng đào tạo demo
const dtf = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
const p2 = (x) => String(x).padStart(2, '0')
export const fmtDate = (t) => (t ? dtf.format(new Date(t)) : '—')
/** 25/11 10:51 */
export const fmtDateTime = (t) => { if (!t) return '—'; const d = new Date(t); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}` }
export const fmtClock = (t) => new Date(t).toLocaleTimeString('vi-VN', { hour12: false })
