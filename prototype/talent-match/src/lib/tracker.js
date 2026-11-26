// Trạng thái theo dõi việc làm của ứng viên (6 bước như dải trạng thái của Teal + "Đã đóng").
export const STAGES = [
  { id: 'saved', label: 'Đã lưu' },
  { id: 'applying', label: 'Đang ứng tuyển' },
  { id: 'applied', label: 'Đã ứng tuyển' },
  { id: 'interviewing', label: 'Phỏng vấn' },
  { id: 'negotiating', label: 'Đàm phán' },
  { id: 'accepted', label: 'Nhận việc' },
]
export const ALL_STATUSES = [...STAGES, { id: 'closed', label: 'Đã đóng' }]
export const stageLabel = (id) => ALL_STATUSES.find((x) => x.id === id)?.label ?? id
const LEGACY = { preparing: 'applying', offer: 'negotiating' } // dữ liệu demo đã lưu ở phiên bản trước
export const normalizeStatus = (id) => LEGACY[id] ?? id

const SEED_SAVED = 3
const SEED_DATES = ['2026-11-18', '2026-11-16', '2026-11-12']
const DAY = 86400000
export const addDays = (iso, n) => new Date(new Date(iso).getTime() + n * DAY).toISOString().slice(0, 10)

/** Bộ theo dõi ban đầu: việc đã ứng tuyển + vài việc phù hợp nhất ở trạng thái "Đã lưu". */
export function seedTracker(cv, ranking, hasApplied) {
  const map = {}
  ranking.forEach(({ job }) => {
    if (hasApplied(cv.id, job.id)) map[job.id] = { status: 'applied', savedAt: '2026-11-05', appliedAt: '2026-11-06', excitement: 4 }
  })
  ranking.filter(({ job }) => !map[job.id]).slice(0, SEED_SAVED).forEach(({ job }, i) => {
    map[job.id] = { status: i === 0 ? 'applying' : 'saved', savedAt: SEED_DATES[i], excitement: 5 - i }
  })
  return map
}
