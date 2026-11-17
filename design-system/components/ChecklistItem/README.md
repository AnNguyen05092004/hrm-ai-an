# ChecklistItem

Một đầu việc trong checklist có **người phụ trách, hạn và bằng chứng**: checklist onboarding theo bộ phận (HR, IT, Admin, Manager) và hạng mục bàn giao khi nghỉ việc. Ghép từ `Checkbox`, `PersonCell`, `SlaBadge`, `Badge`, `FileUpload` theo bố cục cố định để mọi màn trông giống nhau.

Cấu trúc: `wf-task-group` (đầu nhóm theo bộ phận kèm `ProgressBar`) → nhiều `wf-task` (ô chọn · tiêu đề + meta + bằng chứng · hành động).

## Quy tắc
- Tiêu đề là động từ + đối tượng ("Cấp email và tài khoản VPN"), không viết "Email".
- Mỗi dòng có đủ: **ai phụ trách**, **hạn** (`SlaBadge` khi trễ), **trạng thái bằng chữ**. Thiếu người phụ trách thì ghi "Chưa phân công" kèm nút "Phân công".
- Việc cần **bằng chứng** thì ô chọn chỉ tích được khi đã đính kèm. Ghi rõ "Cần đính kèm biên bản".
- Người không có quyền chỉ xem: ô chọn khóa (`disabled`), không ẩn dòng.
- AI đề xuất thêm hạng mục thì dòng mang `Badge ai` và chỉ vào checklist khi người phụ trách chấp nhận.
- Việc phụ thuộc việc khác thì ghi "Chờ: Cấp thiết bị" và khóa ô chọn.
