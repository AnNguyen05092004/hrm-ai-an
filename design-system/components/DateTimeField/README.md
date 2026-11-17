# DateTimeField

Ô chọn ngày, giờ và khoảng thời gian: ngày nghỉ, giờ OT, hạn hoàn thành khóa, hạn từng bước của kỳ đánh giá. Dùng `wf-input` với `type="date"`, `"time"` hoặc `"datetime-local"`, thêm `wf-input-icon` khi cần icon lịch.

## Khoảng thời gian
`wf-range`: hai ô cách nhau dấu gạch, dùng cho OT (18:00 – 21:00) và nghỉ nhiều ngày.

## Quy tắc
- Hiển thị theo kiểu Việt Nam: 21/11/2026, 18:00 (24 giờ).
- Hạn mức hoặc điều kiện ràng buộc nói ngay dưới ô bằng `wf-help` ("OT tối đa 4 giờ/ngày, còn 18 giờ trong tháng").
- Lỗi ngày quá khứ, giờ kết thúc trước giờ bắt đầu, vượt hạn mức: nêu giá trị đúng cần nhập.
- Không bắt gõ tay định dạng. Dùng bộ chọn của trình duyệt trên điện thoại.
