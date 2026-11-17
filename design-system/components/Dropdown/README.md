# Dropdown

Menu thả xuống từ một nút: "Xuất báo cáo", thao tác khác trên một dòng, chọn loại nội dung để tạo. Dùng `wf-menu` và `wf-menu-item`. Cũng là khung danh sách gợi ý của `MultiSelect`.

## Quy tắc
- Nút mở có `aria-haspopup="menu"` và `aria-expanded`. Mũi tên lên xuống di chuyển, Enter chọn, Esc đóng.
- Mục tác động mạnh (Xóa, Gỡ khỏi shortlist) dùng `wf-menu-item--danger` đặt cuối, sau `wf-menu-sep`, và vẫn qua `ConfirmDialog`.
- Tối đa 7 mục. Nhiều hơn thì nhóm bằng `wf-menu-label` hoặc đổi sang trang.
- Mục bị khóa vẫn hiện, ghi lý do bằng tooltip.
- Hành động chính của vùng **không** giấu trong menu.
