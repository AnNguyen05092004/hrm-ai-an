# CodeEditor

Khung soạn mã cho **bài lập trình** trong đánh giá kỹ thuật (Coding Challenge, 2.1) và bài thực hành (6.5). Gồm thanh đầu (ngôn ngữ, Chạy thử, Đặt lại), vùng mã có số dòng, và khung kết quả chạy thử.

Phông `--font-mono` (`text-code` 13px/20px). Tô màu cú pháp dùng token biểu đồ để đủ tương phản trên nền sáng: từ khóa `chart-5`, chuỗi `chart-3`, số `chart-1`, ghi chú `ink-subtle`.

## Quy tắc
- Nền **sáng**, giống phần còn lại của sản phẩm. Không dùng giao diện tối riêng.
- Thân trình soạn thật (Monaco, CodeMirror) chỉ cần nạp token và lớp `wf-code-*`, phần khung và thanh công cụ giữ nguyên.
- "Chạy thử" hiện từng ca kiểm thử **đạt/không đạt bằng chữ** (`.ok`, `.bad` có ✓/✗), kèm thời gian chạy.
- Ghi rõ giới hạn: thời gian chạy, ngôn ngữ cho phép. Dán mã từ ngoài vào là quy định của bài, nêu ở đầu đề.
- Điểm bài lập trình là **đề xuất của AI** theo rubric; người đánh giá xác nhận (xem `LevelRating`).
- Trình soạn phải dùng được hoàn toàn bằng bàn phím; Esc rồi Tab để thoát khỏi vùng mã.
