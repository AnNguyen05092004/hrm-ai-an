# SlaBadge

Thời hạn xử lý một đơn: còn thời gian (xanh), sắp hết sau mốc nhắc 75% (vàng), quá hạn (đỏ).

## Quy tắc
Ghi thời gian còn lại bằng chữ, kèm việc hệ thống đã làm ("đã nhắc", "đã chuyển cấp trên"). Quá hạn **chỉ nhắc và chuyển cấp, không tự duyệt**: không bao giờ hiển thị như đã duyệt.

## Khi cần chi tiết hơn
Ở màn chi tiết đơn dùng `SlaCountdown` (thời gian còn lại, mốc nhắc 75%, nhật ký nhắc và leo thang). `SlaBadge` giữ cho dòng bảng và danh sách. Tuyến leo thang xem `ApprovalChain`.
