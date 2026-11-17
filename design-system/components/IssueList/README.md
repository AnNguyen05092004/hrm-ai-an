# IssueList

Danh sách **vấn đề AI tìm thấy** khi rà soát: bàn giao thiếu hoặc mâu thuẫn so với checklist (4.2), hồ sơ lệch (3.2), cờ cảnh báo xác minh (1.5). Phân biệt ba loại bằng **nhãn chữ, viền và icon**, không chỉ màu.

| Lớp | Nhãn | Ý nghĩa |
|---|---|---|
| `wf-issue--missing` | THIẾU | Hạng mục chưa có nội dung hoặc tài liệu |
| `wf-issue--conflict` | MÂU THUẪN | Hai nguồn nói khác nhau (viền đỏ nhạt) |
| `wf-issue--noevidence` | CHƯA CÓ BẰNG CHỨNG | Có nội dung nhưng chưa có bằng chứng xác nhận (viền nét đứt) |

## Quy tắc
- Đặt trong `AiPanel`. Mỗi mục có **tiêu đề, mô tả và nguồn** (`wf-source`) dẫn tới hạng mục, tài liệu liên quan.
- Mỗi mục có một hành động rõ: "Yêu cầu bổ sung", "Mở tài liệu", "Đánh dấu đã kiểm tra thủ công".
- **Giới hạn rà soát phải nói ra** bằng `wf-ai-limit`: tài liệu không đọc được, thiếu dữ liệu. AI không kết luận "đã bàn giao" hay "đã thu hồi tài sản" chỉ từ mô tả.
- Danh sách rỗng ghi "AI không tìm thấy vấn đề **trong dữ liệu được cung cấp**" và nhắc người phụ trách vẫn phải xác nhận thực tế. Không ghi "Không có vấn đề".
- Sắp xếp: mâu thuẫn, thiếu, rồi chưa có bằng chứng.
