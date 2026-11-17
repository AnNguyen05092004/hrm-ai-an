# SlaCountdown

Bộ đếm hạn xử lý đầy đủ cho **người duyệt** và **người gửi đơn** (5.5): thời gian còn lại bằng chữ, thanh tiến trình với **vạch mốc nhắc 75%**, và nhật ký những việc hệ thống đã làm. `SlaBadge` vẫn dùng ở dòng bảng và danh sách; `SlaCountdown` dùng ở màn chi tiết đơn.

| Lớp | Trạng thái |
|---|---|
| mặc định | Còn thời gian (xanh) |
| `wf-countdown--soon` | Qua mốc nhắc (vàng): "đã nhắc" |
| `wf-countdown--over` | Quá hạn (đỏ đậm): "SLA_BREACHED" |

## Quy tắc
- Số còn lại bằng chữ ("1 giờ 40 phút") cập nhật mỗi phút, báo cho trình đọc màn hình ở các mốc.
- **Quá hạn chỉ nhắc và leo thang, không bao giờ tự duyệt**: nhật ký ghi rõ "Đã chuyển Trưởng khối" và trạng thái đơn vẫn là **Chờ duyệt**. Trạng thái quá hạn tách riêng khỏi trạng thái phê duyệt.
- Mốc nhắc và hạn lấy từ cấu hình theo loại đơn/đơn vị (mặc định ban đầu 2 giờ); không viết cứng số trong giao diện.
- Người có thẩm quyền quyết định đơn quá hạn thấy nút quyết định trong `DecisionBar` ngay dưới bộ đếm.
