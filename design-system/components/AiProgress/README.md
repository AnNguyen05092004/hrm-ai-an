# AiProgress

Trạng thái **AI đang xử lý**, một trong 5 trạng thái bắt buộc của mỗi màn (đang tải, rỗng, lỗi, AI đang xử lý, không có quyền). Hiện các bước AI đang làm theo thứ tự, theo kiểu các bước "đang phân tích CV" của trang tuyển dụng.

## Quy tắc
- Dùng khi AI chạy lâu hơn 2 giây; ngắn hơn thì dùng Skeleton.
- Bước đã xong màu `ink` có dấu tích, bước đang chạy có chấm đỏ nhấp nháy (tắt khi người dùng chọn giảm chuyển động), bước chưa tới `ink-subtle`.
- Lỗi giữa chừng: thay bằng Alert nêu bước bị lỗi và nút "Thử lại".
