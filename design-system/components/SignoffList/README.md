# SignoffList

Danh sách **xác nhận của nhiều bên** cho cùng một hồ sơ: các bộ phận HR, IT, Admin, Finance trong đóng hồ sơ nghỉ việc (4.3); người nhận và Manager khi bàn giao (4.2). Khác `DecisionBar` (một người quyết định): mỗi hàng là một bên với trạng thái riêng.

| Trạng thái (Badge) | Nghĩa |
|---|---|
| `success` Đã xác nhận | Có thời điểm và bằng chứng |
| `info` Chờ xác nhận | Đã giao, chưa phản hồi |
| `warning` Yêu cầu làm lại | Kèm lý do |
| `danger` Quá hạn | Kèm việc hệ thống đã làm ("đã nhắc") |
| `neutral` Chưa bắt đầu | Phụ thuộc bước trước |

## Quy tắc
- Đầu khối ghi **tổng số bên đã xác nhận** ("2/4") bằng `ProgressBar`.
- Mỗi hàng hiện người xác nhận và thời điểm, hoặc người đang chờ và hạn.
- Nút đóng hồ sơ (người có thẩm quyền) đặt dưới bằng `DecisionBar`, **khóa đến khi đủ mọi bên**, và ghi rõ còn thiếu bên nào.
- Một bên từ chối hoặc yêu cầu làm lại thì hiện lý do ngay trong hàng, không giấu trong chi tiết.
- Không cho một bên xác nhận thay bên khác. Có ngoại lệ thì ghi nhật ký người thay và lý do.
