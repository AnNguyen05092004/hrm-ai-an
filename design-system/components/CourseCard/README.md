# CourseCard

Một khóa **được giao** trong cổng học của nhân viên (S8): ảnh bìa nhỏ, tên khóa, hạn, tiến độ và nút **Học tiếp**. Ghép từ `ProgressBar`, `Badge`, `Button`; cả hàng cho phép mở khóa.

| Lớp | Nghĩa |
|---|---|
| mặc định | Đang học hoặc chưa bắt đầu |
| `wf-course--overdue` | Quá hạn: viền `danger-line`, hạn chữ đỏ ("Quá hạn 2 ngày") |

## Quy tắc
- Hiện **ai giao** và **hạn** ("Hạn 20/11 · còn 4 ngày"), vì đây là khóa bắt buộc.
- Nút chính đổi theo trạng thái: "Bắt đầu học" · "Học tiếp" · "Xem kết quả" · "Làm lại bài đánh giá" (nút duy nhất đỏ của hàng).
- Đã hoàn thành hiện `Badge success` và kết quả bằng chữ ("Đạt 82/100"); **hoàn thành khóa chưa chắc là đạt năng lực**, nên bài đánh giá hiện **riêng** kèm trạng thái của nó.
- Khóa chưa mở do điều kiện tiên quyết thì ghi rõ "Học xong Quy tắc ứng xử trước", nút khóa.
- Danh sách gom theo "Cần làm ngay", "Đang học", "Đã hoàn thành". Rỗng dùng `EmptyState` ("Bạn chưa được giao khóa học nào").
