# MultiSelect

Chọn **nhiều** người, nhóm, vai trò hoặc dự án: giao học theo đối tượng, mời cộng tác viên, chọn phạm vi kỳ đánh giá. Mỗi lựa chọn là một `wf-tag` có nút gỡ; danh sách gợi ý dùng `wf-menu`.

## Quy tắc
- Gõ để lọc, Enter để chọn, Backspace gỡ tag cuối. Mọi thao tác dùng được bằng bàn phím.
- Danh sách gợi ý nhóm theo loại bằng `wf-menu-label` (Phòng ban, Vai trò, Dự án). Mục đã chọn đánh dấu `aria-selected`.
- Hiện **tổng số người bị ảnh hưởng** dưới ô ("Giao cho 142 người"), vì giao học là thao tác ảnh hưởng nhiều người.
- Nút gỡ tag có `aria-label` ("Gỡ Khối Công nghệ").
