# EmploymentTimeline

Trục thời gian làm việc của ứng viên, để **nhìn thấy** khoảng trống và đoạn trùng lặp (1.5). Mỗi công ty là một thanh trên cùng một trục; khoảng trống bất thường là ô viền nét đứt vàng; đoạn trùng giữa hai công ty là sọc chéo.

| Lớp | Nghĩa |
|---|---|
| `wf-emp-bar` | Thời gian làm tại một công ty |
| `wf-emp-bar--overlap` | Đoạn làm việc trùng với công ty khác, cần xác minh |
| `wf-emp-gap` | Khoảng trống bất thường |

Vị trí thanh đặt bằng `--s` (bắt đầu, %) và `--w` (độ rộng, %); trục chia thành `--n` khoảng.

## Quy tắc
- Mọi thanh và ô trống ghi **chữ** ("FPT 2019–2021", "Trống 8 tháng"), không chỉ màu.
- Chỉ **nêu sự việc, không kết luận gian lận**: "Trùng 2 tháng, cần ứng viên giải thích".
- Là một phần của báo cáo xác minh trong `AiPanel`, kèm nguồn dữ liệu (CV, LinkedIn nếu có).
- Cung cấp bản bảng thay thế cho người dùng trình đọc màn hình (`wf-sr`).
