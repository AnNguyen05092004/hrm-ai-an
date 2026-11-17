# DecisionBar

Vùng **quyết định của con người**, đặt ngay dưới AiPanel: icon khiên màu ink, tiêu đề nói ai quyết định, mô tả điều kiện, và các nút quyết định.

## Quy tắc
- Tiêu đề nêu vai trò quyết định ("Recruiter quyết định", "Quản lý xác nhận").
- Chưa đủ điều kiện thì khóa nút và mô tả ghi rõ còn thiếu gì.
- Vai trò không có quyền: ẩn nút, mô tả ghi "Bạn đang ở chế độ xem".
- Quyết định khó hoàn tác mở ConfirmDialog.

## Nhiều bên cùng xác nhận
`DecisionBar` là **một** người quyết định. Khi nhiều bên phải xác nhận (các bộ phận, người nhận và Manager), liệt kê bằng `SignoffList` và đặt DecisionBar của người đóng hồ sơ bên dưới, **khóa đến khi đủ mọi bên**.
