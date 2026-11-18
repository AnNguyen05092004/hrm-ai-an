# Quy trình release nội bộ

## 1. Quality gate bắt buộc
Mọi merge request phải qua 4 cổng: unit test đạt 100%, độ phủ test tối thiểu 70%, quét bảo mật SAST không có lỗi mức cao, và một người review đã duyệt. Không được tắt test để kịp release.

## 2. Triển khai canary
Bản mới triển khai cho 5% người dùng trong 30 phút. Theo dõi tỷ lệ lỗi 5xx và độ trễ p95. Nếu tỷ lệ lỗi tăng quá 1% so với bản cũ thì dừng canary.

## 3. Rollback
Rollback phải xong trong vòng 15 phút kể từ khi phát hiện lỗi, bằng lệnh deploy rollback --to previous. Sau rollback, ghi sự cố vào sổ và họp rút kinh nghiệm trong 2 ngày làm việc.

## 4. Lịch release
Release vào thứ Ba và thứ Năm, từ 10h đến 15h. Không release vào thứ Sáu và trước ngày nghỉ lễ.
