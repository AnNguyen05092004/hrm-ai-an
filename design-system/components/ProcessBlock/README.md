# ProcessBlock

**Khối quy trình**: các bước **theo thứ tự** trong một bài học, mỗi bước có số, tên và mô tả. Dùng cho hướng dẫn thao tác, quy trình nghiệp vụ, các bước xử lý tình huống.

Khác `Stepper` (hiển thị **tiến độ** của một quy trình cố định đang chạy): ProcessBlock là **nội dung để đọc**, không có trạng thái xong/đang làm.

## Quy tắc
- Mỗi bước bắt đầu bằng động từ ("Báo cho đầu mối ATTT", "Ngắt kết nối mạng").
- 3–7 bước. Nhiều hơn thì tách quy trình.
- Số bước tự đếm bằng CSS counter; dùng `<ol class="wf-process">`.
- Bước có cảnh báo dùng `Alert` bên trong bước, không đổi màu số.
