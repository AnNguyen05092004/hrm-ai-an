# Textarea

Ô nhập nhiều dòng: lý do giải trình công, ghi chú phỏng vấn, góp ý khi trả lại nội dung, mô tả mục tiêu học. Dùng `wf-input wf-textarea` bên trong `wf-field`, cùng viền, focus và lỗi như `TextField`.

## Quy tắc
- Có giới hạn ký tự thì hiện `wf-counter` ("120/500") ở góc phải dưới.
- Ô bắt buộc nhập **lý do** (từ chối, trả lại, yêu cầu làm lại) ghi rõ trong nhãn: "Lý do từ chối" kèm dấu `*`, và khóa nút xác nhận đến khi có nội dung.
- Lỗi nói sai gì và sửa thế nào: "Nhập ít nhất 20 ký tự để người nhận biết cần sửa gì."
- Cho kéo dãn theo chiều dọc (`resize: vertical`), không cho kéo ngang.
