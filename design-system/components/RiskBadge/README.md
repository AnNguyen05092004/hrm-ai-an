# RiskBadge

Mức rủi ro của một hồ sơ sau **xác minh bằng cấp, chứng chỉ và timeline** (1.5): thấp, trung bình, cao. Hình viên thuốc có viền và icon để **không chỉ dựa vào màu**.

| Lớp | Nghĩa |
|---|---|
| `wf-risk--low` | Rủi ro thấp: không có cờ cảnh báo |
| `wf-risk--mid` | Rủi ro trung bình: có điểm cần hỏi thêm |
| `wf-risk--high` | Rủi ro cao: có điểm cần xác minh trước khi quyết định |

## Quy tắc
- Luôn đi kèm **danh sách cờ cảnh báo cụ thể** ("Trống việc 8 tháng 2021–2022", "IELTS chưa tra được trên nguồn chính thức"). Không bao giờ chỉ hiện mức.
- Là **đề xuất của AI**: đặt trong `AiPanel`, người xác minh quyết định. Rủi ro cao không có nghĩa là loại hồ sơ; không tự động từ chối.
- Chưa kiểm tra thì dùng `Badge neutral` "Chưa xác minh", không dùng "rủi ro thấp".
- Chứng chỉ không có nguồn tra cứu được ghi "Chưa đủ căn cứ để xác minh", không ghi "giả".
