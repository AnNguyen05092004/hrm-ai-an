# Xuất khóa học sang LMS của công ty

Bản này là công cụ soạn khóa học: người học không học trên đây mà học trên LMS sẵn có của công ty. Khóa xuất ra hai dạng:

| Dạng | Dùng khi | Ở đâu |
|---|---|---|
| Gói SCORM 1.2 | Đưa cả khóa (bài học, slide, tình huống, video, bài luyện tập) lên LMS công ty | Trang khóa học → Xuất khóa học → Gói SCORM và đề QTI |
| Đề kiểm tra QTI 2.1 kèm đáp án | LMS công ty tự tổ chức thi và chấm | Cùng chỗ, mục "Đề kiểm tra cho LMS công ty tự chấm" |

Nên mời review và xuất bản trước khi xuất: gói chỉ lấy bản đã xuất bản.

## 1. Gói SCORM 1.2

Gói chứa trình học chạy độc lập, cùng giao diện học của LMS này, dữ liệu của bản đã xuất bản, ảnh và video đã dựng. Đưa lên được các LMS hỗ trợ SCORM 1.2, ví dụ Moodle, SAP SuccessFactors, Cornerstone, Docebo, TalentLMS.

LMS công ty nhận được:

| Trường SCORM | Ý nghĩa |
|---|---|
| `cmi.core.lesson_status` | `incomplete` khi đang học. Học xong mọi phần: `completed`, hoặc `passed` nếu khóa có bài luyện tập |
| `cmi.core.score.raw` | Điểm bài luyện tập (0–100) |
| `cmi.suspend_data` | Tiến độ học dở. Người học mở lại thì học tiếp đúng chỗ |
| `cmi.core.session_time` | Thời gian học mỗi lần mở |

Không có trong gói:
- **Đề kiểm tra chính thức.** Gói chạy hoàn toàn trên trình duyệt nên đáp án sẽ nằm phía người học, không giữ được bảo mật đề. Muốn LMS công ty tự tổ chức thi, tải riêng đề QTI kèm đáp án (mục dưới).

Gói lấy bản đã xuất bản tại thời điểm xuất. Sửa khóa xong thì xuất bản lại rồi xuất gói mới.

### Thử trên LMS công ty (demo)

`apps/company-lms` là một LMS mô phỏng của công ty, chạy riêng ở http://localhost:5196 (`npm start` tự bật). Dùng để xem gói xuất ra được LMS khác nhận và dùng thế nào, không cần cài Moodle.

1. Ở LMS: mở khóa → Xuất khóa học → Gói SCORM và đề QTI → Tải gói.
2. Ở cổng đào tạo (vai Quản trị đào tạo): Nhập gói SCORM, chọn tệp .zip. Cổng giải nén, đọc `imsmanifest.xml` và kiểm tra: có manifest ở gốc gói, đúng SCORM 1.2, có mục học, tệp khởi chạy tồn tại và là SCO, đủ tệp khai báo, điểm đạt (`masteryscore`). Gói lỗi thì báo rõ lý do và không cho nhập.
3. Đặt tên hiển thị, giao cho nhân viên, đặt hạn. Nhập lại gói cùng mã (`identifier`) thì cổng đề nghị cập nhật khóa cũ và giữ kết quả học viên.
4. Đổi sang vai Nhân viên → Bắt đầu học. Gói chạy trong khung cùng nguồn với cổng và gọi `window.API` của cổng. Bảng **Dữ liệu SCORM** bên phải cho thấy giá trị gói đang ghi (trạng thái, điểm, `suspend_data`…) và nhật ký từng lệnh API, kể cả lỗi theo mã chuẩn.
5. Thoát giữa chừng: gói gọi `LMSFinish` với `exit = suspend`, lần sau cổng trả `entry = resume` và gói học tiếp đúng chỗ. Gói báo `completed` kèm điểm mà manifest có điểm đạt thì cổng tự xếp `passed` / `failed`.
6. Quản trị xem kết quả ở Báo cáo học tập (trạng thái, điểm, thời gian, số phiên, hạn), tải CSV, hoặc mở chi tiết khóa để xem từng phiên học. **Xem thử** chạy gói với `credit = no-credit`, không ghi kết quả.

Cổng demo cài phần lõi của SCORM 1.2 (`cmi.core.*`, `suspend_data`, `launch_data`, `comments`, `student_data`) và kiểm tra quyền đọc/ghi, kiểu dữ liệu theo chuẩn. Các phần tùy chọn (`objectives`, `interactions`, `student_preference`) trả lỗi 401. Gói lưu ở Cache Storage và kết quả lưu ở localStorage của trình duyệt đang mở cổng.

### Đề kiểm tra cho LMS công ty tự quản lý và chấm

Đề chính thức không vào gói SCORM. Khi công ty muốn tự tổ chức thi trên LMS của họ: Xuất khóa học → Gói SCORM và đề QTI → mục **Đề kiểm tra cho LMS công ty tự chấm**, tích xác nhận rồi **Tải đề kèm đáp án**. Mỗi lần tải ghi nhật ký (`kit.export_exam`).

Gói `.zip` theo **IMS QTI 2.1** (Canvas, Blackboard, D2L, TAO nhập được; Moodle qua plugin QTI), chỉ gồm câu đã duyệt:

| Tệp | Nội dung |
|---|---|
| `imsmanifest.xml`, `test.xml` | Đề: rút ngẫu nhiên `pick` câu, xáo thứ tự, giới hạn thời gian, số lượt, điểm đạt (`PASS_SCORE`) |
| `items/<mã câu>.xml` | Từng câu kèm đáp án (`correctResponse`). Ghép cặp, phân loại, sắp thứ tự chấm từng phần giống LMS này. Điền chỗ trống nhận nhiều đáp án, không phân biệt hoa thường |
| | Tự luận: `externalScored="human"`, tiêu chí trong `rubricBlock view="scorer"`. Bài code: `externalScored="externalMachine"`, test case trong `rubricBlock` |
| `exam.json` | Toàn bộ đề theo cấu trúc gốc: đáp án, giải thích từng lựa chọn, rubric, test case, cách tính điểm từng dạng câu, lời nhắc mẫu cho AI chấm |
| `huong-dan-cham.md` | Hướng dẫn cho người quản trị LMS công ty và lời nhắc mẫu để AI của họ chấm nháp tự luận theo tiêu chí |

LMS công ty tự tổ chức thi và chấm. Gói có đáp án nên chỉ gửi cho người quản trị.

Trang demo LMS công ty nhận được gói này: đọc QTI, kiểm tra có đáp án và tiêu chí, cho nhân viên làm bài có giờ, tự chấm câu khách quan; câu tự luận/code vào **Chấm bài**, người chấm tích tiêu chí đạt (hoặc sao chép lời nhắc cho AI chấm nháp) rồi xác nhận điểm.

## Chưa làm (cần trao đổi với IT công ty)

| Hạng mục | Ghi chú |
|---|---|
| Đăng nhập một lần (SSO qua SAML hoặc OIDC) | Cần thông tin nhà cung cấp định danh của công ty |
| SCORM 2004 / cmi5 | Làm thêm khi LMS công ty yêu cầu |
| Đẩy gói thẳng lên LMS công ty qua API | Hiện tải tệp .zip rồi nhập tay |
