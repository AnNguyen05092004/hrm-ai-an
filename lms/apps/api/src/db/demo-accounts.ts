// Tài khoản mẫu dùng chung cho seed, test và bản demo (đổi vai không cần mật khẩu). Mỗi vai một tài khoản.
export const ADMIN_EMAIL = 'admin@demo.local'
export const AUTHOR_EMAIL = 'an@demo.local'
export const REVIEWER_EMAIL = 'ha@demo.local'
// người đầu danh sách là vai mặc định khi mở bản demo
export const DEMO_ACCOUNTS = [
  { email: AUTHOR_EMAIL, label: 'Người soạn' },
  { email: REVIEWER_EMAIL, label: 'Reviewer' },
  { email: ADMIN_EMAIL, label: 'Quản trị' },
]
