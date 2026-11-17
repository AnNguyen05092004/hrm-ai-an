# ReadinessConditions

Danh sách **điều kiện bắt buộc** để hoàn tất onboarding và active vào dự án (3.3, 6.6): hồ sơ hợp lệ, thủ tục xong, tài khoản và thiết bị được cấp, đào tạo xong, bài kiểm tra đạt. Mỗi điều kiện có biểu tượng trạng thái, mô tả và người/hệ thống xác nhận.

| Lớp | Nghĩa |
|---|---|
| mặc định | Chưa đạt (vòng rỗng) |
| `is-ok` | Đã đạt (xanh, dấu tích) |
| `is-fail` | Không đạt hoặc quá hạn (đỏ đậm, dấu X) |

## Quy tắc
- Đầu khối (`wf-cond-head`) nói **tổng số đạt** ("4/5 điều kiện") bằng `ProgressBar`.
- Mỗi dòng nêu **nguồn xác nhận** ("HR xác nhận 15/11", "LMS: điểm 82/100, ngưỡng 70"). Phần chưa đạt nêu việc cần làm tiếp.
- **Hoàn thành khóa học không đồng nghĩa đạt**: dòng "Đào tạo" và dòng "Bài kiểm tra" tách riêng.
- Bước xác nhận kế tiếp nằm dưới bằng `DecisionBar` (HR → Lead/Manager); nút khóa đến khi mọi điều kiện đạt, ghi rõ điều kiện còn thiếu.
- Nhấn mạnh: **AI không tự kích hoạt**. Danh sách chỉ tổng hợp, người có thẩm quyền xác nhận.
- Trạng thái active theo dự án tách khỏi trạng thái quan hệ lao động; không gộp trong cùng một nhãn.
