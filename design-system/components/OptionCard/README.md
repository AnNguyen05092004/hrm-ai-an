# OptionCard

Thẻ chọn **một trong vài lựa chọn lớn có mô tả**: định dạng nội dung (Course, Scenario), hình thức bài đánh giá, loại câu hỏi. Chọn thì viền `red-500` và nền `red-50` (`aria-pressed="true"`).

## Dùng khi
2–4 lựa chọn mà người dùng cần hiểu khác biệt trước khi chọn. Lựa chọn ngắn không cần mô tả dùng `RadioGroup` hoặc `FilterChip`.

## Quy tắc
- Mỗi thẻ có **tên** (đậm), **một câu** nói dùng khi nào, và icon.
- Lựa chọn chưa có ở bản đầu hiện thẻ khóa nét đứt kèm nhãn "Sắp có" (`Badge neutral`), không ẩn đi, để người dùng biết hướng phát triển.
- Chỉ chọn một: bọc trong `role="group"` hoặc `radiogroup`, dùng phím mũi tên chuyển.
- Không dùng để chọn **hành động**: hành động dùng `Button`.
