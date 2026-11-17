# AiTutor

**Trợ lý học tập** gắn trong màn học của một khóa (6.4): nhân viên hỏi về nội dung đang học, AI trả lời **chỉ dựa trên nội dung đã duyệt của khóa** và tài liệu người học được phép truy cập, kèm nguồn. Khác `ChatAssistant` (trợ lý HR toàn công ty, đầu khung đỏ): AiTutor đầu khung `ai-surface`, nằm cạnh bài học, bật/tắt theo từng khóa.

## Trạng thái
| Trạng thái | Hiển thị |
|---|---|
| Hoạt động | Hỏi đáp, câu trả lời có nguồn `wf-cite` |
| **Không đủ căn cứ** | Bong bóng nói rõ "Khóa này chưa có nội dung về việc này", gợi ý hỏi người phụ trách. Không bịa. |
| **Khóa trong bài thi** (`wf-tutor--locked`) | Ô nhập khóa, `Alert info`: "AI Tutor tắt trong bài đánh giá chính thức theo quy chế." |
| Tắt cho khóa | Không hiển thị nút mở AI Tutor |

## Quy tắc
- Gợi ý nhanh (`wf-quick`): "Giải thích lại", "Cho ví dụ", "Ra bài luyện".
- Đề xuất bài luyện và nội dung cần học lại dựa trên **kết quả luyện tập**; AI **không tự nâng mức năng lực** chỉ vì học viên đã xem hết nội dung.
- Mọi câu trả lời ghi ít nhất một nguồn dẫn tới bài/mục trong khóa.
- Người học luôn có cách **chuyển cho giảng viên/chuyên gia** khi AI không giải đáp được.
