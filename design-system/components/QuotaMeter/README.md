# QuotaMeter

Thanh **hạn mức và số dư**: giờ OT theo ngày/tháng/năm (5.3), số ngày phép còn lại và phần đang tạm giữ (5.4). Cho người dùng thấy **mình đang ở đâu so với giới hạn** trước khi gửi đơn.

| Phần thanh | Nghĩa |
|---|---|
| `i` (navy) | Đã dùng |
| `b` sọc vàng | Phần **đơn này sẽ chiếm** hoặc **đang tạm giữ** chờ duyệt |
| `b.is-over` (đỏ đậm) | Phần vượt hạn mức |

## Quy tắc
- Hàng trên ghi **số bằng chữ**: "Đã dùng 22 · đơn này 3 · hạn mức 40 giờ". Màu chỉ hỗ trợ.
- Vượt hạn mức: hàng chuyển `wf-quota-row--over`, chữ giải thích **điều luật hoặc quy tắc** và **đơn không được tạo** ("Vượt 4 giờ/ngày. Giảm xuống tối đa 4 giờ."). Không dùng màu đỏ cho đơn hợp lệ.
- Số dư phép: phần tạm giữ hiện sọc vàng kèm ghi chú "đang chờ quản lý duyệt, sẽ trả lại nếu không duyệt".
- Số liệu pháp lý (40 giờ/tháng, 200 giờ/năm) lấy từ cấu hình, **không cứng trong giao diện**; dòng chú thích ghi nguồn quy định.
- Nhiều hạn mức cùng lúc (ngày, tháng, năm) xếp dọc theo thứ tự nhỏ đến lớn.
