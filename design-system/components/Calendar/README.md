# Calendar

Lịch tháng hiển thị **sự kiện theo ngày**: lịch vắng mặt của phòng ban (5.4), lịch phỏng vấn kèm bộ câu hỏi (2.2), các mốc sắp tới của kỳ đánh giá (6.8, 6.9).

| Lớp sự kiện | Dùng cho |
|---|---|
| mặc định (xanh nhạt) | Sự kiện thường |
| `wf-cal-ev--leave` | Nghỉ phép, vắng mặt |
| `wf-cal-ev--milestone` | Mốc đã lên lịch (hạn bước trong kỳ đánh giá) |
| `wf-cal-ev--warn` | Gần hạn hoặc xung đột lịch |

## Quy tắc
- Hôm nay là vòng tròn `primary`. Cuối tuần nền `surface-subtle`.
- Sự kiện ghi **chữ ngắn** ("Hà · nghỉ phép"). Quá 2 sự kiện một ô thì thu thành "+3 nữa" mở `Drawer` danh sách của ngày.
- Mỗi lịch có dạng **danh sách thay thế** cho trình đọc màn hình (bảng ẩn hoặc nút chuyển dạng danh sách).
- Trên điện thoại sự kiện thu thành chấm; bấm vào ngày mở danh sách bên dưới lịch.
- Dùng cho **nhìn**; đặt ngày trong biểu mẫu dùng `DateTimeField`.
