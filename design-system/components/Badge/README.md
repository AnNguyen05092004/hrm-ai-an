# Badge

Nhãn trạng thái viên thuốc có chấm màu; trạng thái **luôn có chữ**, màu chỉ hỗ trợ.

| Lớp | Nghĩa |
|---|---|
| `neutral` | Nháp, chưa bắt đầu |
| `brand` | Mới, nổi bật |
| `info` | Đang chờ, đang xử lý |
| `warning` | Cần bổ sung, sắp hết hạn |
| `success` | Đạt, đã duyệt, hoàn tất |
| `danger` | Từ chối, quá hạn, lỗi |
| `ai` | Nội dung do AI tạo, chưa có người xác nhận |

`wf-count` là số đếm đỏ trên menu và tab.

## Hình thức v2
Nhãn 12px/20px, weight 500, bo `radius-sm` 8px. Màu và chữ cùng thể hiện trạng thái. Badge AI cần icon tia sáng và nhãn; không dùng badge đỏ chung cho cả AI và lỗi.
