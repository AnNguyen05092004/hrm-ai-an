# AssessmentPlayer

Màn **làm bài** của ứng viên (đánh giá kỹ thuật 2.1) và nhân viên (đánh giá năng lực 6.5). Bố cục hai cột: câu hỏi bên trái; **đồng hồ và bảng điều hướng câu** bên phải. Ghép từ `wf-timer`, `wf-qnav`, `wf-option` (xem `QuizQuestion`), `ProgressBar`.

## Trạng thái ô điều hướng (`wf-qnav`)
Câu hiện tại (viền đỏ) · đã trả lời (nền xám nhạt) · đánh dấu xem lại (gạch vàng dưới) · chưa trả lời (trắng). Mỗi ô có `aria-label` đủ ý ("Câu 3, đã trả lời, đánh dấu xem lại").

## Đồng hồ
`wf-timer`: thời gian còn lại, đổi vàng ở 25% cuối (`--soon`) và đỏ ở 5 phút cuối (`--over`). Ghi **chữ**, không chỉ màu. Thông báo cho trình đọc màn hình ở các mốc 10, 5, 1 phút.

## Quy tắc
- **Tự lưu** sau mỗi câu và ghi "Đã lưu lúc 09:14". Mất kết nối thì nói rõ bài đã lưu tới đâu.
- Hết giờ: nộp tự động và nói rõ, không để mất bài.
- Nộp bài mở `ConfirmDialog` nêu số câu chưa trả lời và số câu đánh dấu xem lại.
- **AI Tutor tắt** trong bài thi chính thức (xem `AiTutor` trạng thái khóa); nêu lý do trên đầu trang.
- Bài lập trình dùng `CodeEditor` thay cho khối đáp án.
