# ExtractedFieldsReview

Màn HR **đối chiếu** dữ liệu AI đọc từ giấy tờ (OCR) với dữ liệu nhân viên khai báo và hồ sơ tuyển dụng (3.2). Mỗi hàng là một trường: tên trường · giá trị khai báo · giá trị đọc được · trạng thái.

| Lớp hàng | Nghĩa |
|---|---|
| mặc định | Khớp |
| `wf-extract-row--diff` | Lệch: nền `warning-surface`, phần khác biệt đánh dấu `wf-diff` |
| `wf-extract-row--missing` | Thiếu hoặc không đọc được: nền `danger-surface` |

Đặt trong `AiPanel` (kết quả AI) kèm `DecisionBar` "HR xác nhận hồ sơ" ở dưới.

## Quy tắc
- Hiện **cả hai giá trị song song** và đánh dấu đúng phần khác ("Nguyễn Thị **Hanh**" so với "Nguyễn Thị **Hạnh**"). Không chỉ báo "có lệch".
- Mỗi giá trị AI đọc ghi **nguồn** (`wf-extract-src`): "CCCD, mặt trước". Bấm mở tệp gốc cạnh bên.
- HR **sửa trực tiếp** giá trị đúng rồi ghi nhận, không buộc nhân viên tải lại khi lỗi chỉ ở OCR.
- Thiếu hoặc lệch thì có nút "Yêu cầu nhân viên bổ sung" soạn sẵn nội dung nói rõ cần gì.
- Số định danh và dữ liệu nhạy cảm che một phần ("079•••••123"), hiện đủ khi bấm và ghi nhật ký truy cập.
- Nút "Xác nhận hồ sơ" khóa khi còn hàng lệch hoặc thiếu chưa xử lý, ghi rõ còn mấy hàng.
