# LevelMatrix

Bảng **khung năng lực** (S13, 6.7): mỗi hàng là một năng lực, mỗi cột là một cấp bậc (giả định Junior, Professional, Senior, Expert), mỗi ô là **mô tả hành vi** ở cấp đó. Dùng chung khung ô với `RubricGrid` (`wf-rubric`). Ô thuộc **mức yêu cầu của vai trò đang chọn** có `data-required` (nền `red-50`, viền `red-300`).

Đầu màn: chọn vai trò, `Badge` trạng thái khung (`neutral` Nháp · `info` Chờ duyệt · `success` Đã ban hành), **phiên bản và ngày hiệu lực**.

## Quy tắc
- **Khung chưa duyệt không dùng làm chuẩn**: hiển thị cảnh báo `Alert warning` "Khung đang ở trạng thái Nháp, chưa dùng để đối chiếu".
- Đề xuất của AI (nhóm năng lực, mô tả hành vi, chỗ trùng lặp hoặc mâu thuẫn giữa đơn vị) nằm trong `AiPanel` bên cạnh; mô tả chỉ vào khung sau khi Lead/chuyên gia **chấp nhận**.
- Mô tả là **hành vi quan sát được** ở cấp đó, không dùng từ chung chung.
- Sửa khung đã ban hành tạo **phiên bản mới**; kết quả đánh giá đã chốt giữ theo phiên bản khung lúc đánh giá.
- Số cấp bậc và tên cấp bậc là cấu hình cần chốt: cột đọc từ dữ liệu, không cứng 4 cột.
