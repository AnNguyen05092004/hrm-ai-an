"""Tài khoản mẫu dùng chung cho seed, test và bản demo (đổi vai không cần mật khẩu)."""
ADMIN_EMAIL = "admin@demo.local"
AUTHOR_EMAIL = "an@demo.local"
REVIEWER_EMAIL = "ha@demo.local"
# người đầu danh sách là vai mặc định khi mở bản demo
DEMO_ACCOUNTS = [
    {"email": AUTHOR_EMAIL, "label": "Người soạn"},
    {"email": REVIEWER_EMAIL, "label": "Reviewer"},
    {"email": ADMIN_EMAIL, "label": "Quản trị"},
]
