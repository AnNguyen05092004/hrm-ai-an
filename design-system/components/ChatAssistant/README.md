# ChatAssistant

Khung trò chuyện với trợ lý HR, đầu khung đỏ, bong bóng người dùng đỏ chữ trắng, bong bóng trợ lý `ai-surface`, bo 16px; nút nổi tròn đỏ 56px ở góc phải dưới, hover `red-800`.

## Quy tắc
- Câu trả lời về chính sách luôn có trích dẫn `wf-cite` dẫn tới điều khoản.
- Tác vụ (đơn nghỉ, OT, giải trình) hiện thành thẻ bản nháp trong khung chat; người dùng bấm "Gửi đơn", trợ lý không tự gửi.
- Ẩn nút nổi trên màn đã là trang chat.

## Thành phần dùng trong khung chat
- `DraftCard`: thẻ bản nháp đơn nghỉ, phiếu OT, ticket giải trình công (trợ lý **không tự gửi**).
- `wf-quick`: tối đa 3 gợi ý trả lời nhanh bằng `FilterChip`, đặt dưới tin nhắn của trợ lý.
- Trợ lý học tập trong khóa dùng `AiTutor` (đầu khung `ai-surface`), không dùng khung chat đầu đỏ này.
