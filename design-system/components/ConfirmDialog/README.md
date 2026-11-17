# ConfirmDialog

Hộp xác nhận trước thao tác khó hoàn tác: tiêu đề là câu hỏi, danh sách **hệ quả** cụ thể, nút Hủy và nút xác nhận lặp lại động từ của tiêu đề.

## Quy tắc
Không dùng "Bạn có chắc không?". Nút xác nhận ghi đúng hành động ("Phê duyệt", "Đóng hồ sơ"). Bo 14px, bóng `shadow-pop`, nền mờ navy.

## Biến thể có nhập lý do
Từ chối, trả lại nội dung, yêu cầu làm lại: thêm một `Textarea` bắt buộc trong `wf-dialog-body` ("Lý do trả lại *"). Nút xác nhận **khóa đến khi có lý do**, và lý do được gửi tới người liên quan. Xem mẫu thứ hai trong `preview.html`.

Phê duyệt **hàng loạt** (từ `BulkActionBar`) luôn dùng hộp này, liệt kê số bản ghi và hệ quả.
