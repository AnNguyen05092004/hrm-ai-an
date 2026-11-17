# AiPanel

Khung kết quả AI có viền `ai-line`, đầu khung nền hồng rất nhạt `ai-surface`, nhãn và icon tia sáng màu `ai-ink`. Phần nội dung nền trắng để đọc dài.

## Bắt buộc có
1. Nhãn **AI đề xuất** và tiêu đề kết quả.
2. Người xác nhận và trạng thái rõ ràng.
3. Căn cứ, nguồn và thời điểm dữ liệu khi có.
4. Giới hạn bằng `wf-ai-limit` khi cần.

## Phân biệt ngữ nghĩa
AI dùng nhãn/icon riêng, không chỉ dựa vào màu đỏ. Nhãn chờ xác nhận dùng `warning`, thành công dùng `success`, lỗi dùng `danger`. Quyết định của con người vẫn ở vùng DecisionBar riêng. `wf-kind--ai`, `wf-kind--rule`, `wf-kind--human` phân biệt AI, quy tắc và con người trong mẫu mới.

Khi đang chạy dùng `AiProgress`. Các component nghiệp vụ như MatchScore, SkillChips và ExtractedFieldsReview tiếp tục ghép được trong khung.
