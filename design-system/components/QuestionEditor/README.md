# QuestionEditor

Màn soạn **một câu hỏi** trong ngân hàng câu hỏi (S5, F20, F21): chọn loại câu, nhập đề, các đáp án (đánh dấu đáp án đúng), giải thích và nguồn. Câu do AI sinh mang `Badge ai` đến khi chuyên gia duyệt.

Cấu trúc: `wf-qe-top` (loại câu · chủ đề · trạng thái) → đề (`Textarea`) → đáp án (`wf-qe-opt`) → giải thích → `wf-qe-foot` (nguồn · nút).

## Quy tắc
- Đáp án đúng chọn bằng radio (một đáp án) hoặc checkbox (nhiều đáp án), **kèm nhãn "Đáp án đúng"** cho trình đọc màn hình.
- Mỗi câu **gắn nguồn** (`wf-source`) trong tài liệu và gắn với **tiêu chí/năng lực** được đánh giá.
- Trạng thái: `neutral` Nháp · `ai` AI soạn nháp · `info` Chờ duyệt · `success` Đã duyệt. Câu chưa duyệt **không được dùng** trong bài đánh giá chính thức.
- Khi AI sinh hàng loạt, xếp danh sách theo "Chưa xem" trước, cho duyệt từng câu hoặc cả nhóm.
- Câu đã dùng trong bài đã làm thì **sửa tạo phiên bản mới**, không sửa đè (kết quả giữ theo phiên bản đề).
