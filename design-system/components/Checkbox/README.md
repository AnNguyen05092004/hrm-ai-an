# Checkbox

Ô chọn vuông 16px; khi chọn nền `primary` và dấu tích trắng.

## Dùng khi
Chọn nhiều dòng để thao tác hàng loạt (chọn hồ sơ để so sánh, chọn ticket để duyệt cùng lúc). Luôn đi kèm nhãn bấm được.

## Trạng thái
- Chọn một phần (`indeterminate`) cho ô "chọn tất cả" ở đầu bảng.
- Khóa (`disabled`): nền `surface-muted`. Luôn ghi lý do ở cột bên cạnh (ví dụ ticket chưa có xác nhận của quản lý).
- Chọn nhiều dòng thì hiện `BulkActionBar`. Một lựa chọn trong vài lựa chọn dùng `RadioGroup`; bật/tắt có hiệu lực ngay dùng `Switch`.
