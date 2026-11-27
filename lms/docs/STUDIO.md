# LMS Studio: phạm vi và quyết định

> Nhánh `feat/lms-studio`, tách từ `feat/lms-app` ngày 26/11/2026.

## 1. Mục tiêu

Chỉ làm ra khóa học, không vận hành việc học: soạn khóa bằng AI, mời người review, xuất sang LMS sẵn có của công ty. Người học học và thi trên LMS công ty.

## 2. Giữ, bỏ, thêm

| | Nội dung |
|---|---|
| Giữ | Tài liệu nguồn, luồng tạo khóa (chi tiết → dàn ý → AI soạn), các trình soạn (Tài liệu nhanh, Slide, Tình huống, Video, Đề kiểm tra), ảnh, video AI, xuất bản có phiên bản, xuất SCORM 1.2, đề QTI 2.1, trang demo LMS công ty |
| Bỏ | Vai người học, Khóa học của tôi, trình học trên web, tiến độ học, AI Tutor, thi và giám sát, chấm bài, kế hoạch đào tạo (KPI, khoảng cách kỹ năng, đội ngũ, trợ lý giám đốc), phân tích học tập, giao khóa, đường dẫn chia sẻ, xAPI, webhook |
| Thêm | Vai admin và reviewer, quản trị người dùng, review khóa học (mời, góp ý theo vị trí, kết luận, nhiều vòng), trang xem câu hỏi kèm đáp án, Nội dung và luồng chốt nội dung, Kho đề, dạng câu Đúng/Sai, thông báo (chuông + email), gửi gói sang LMS công ty qua API |

Bảng bị bỏ khỏi CSDL: `departments`, `positions`, `user_skills`, `skill_events`, `kpis`, `evidence`, `assignments`, `progress`, `attempts`, `tutor_messages`, `content_chunks`, `outbox`. Bảng `skills` giữ lại làm danh mục kỹ năng để gắn khóa học. Bảng mới: `kit_reviews`, `review_comments`, `notifications`, `lms_exports`.

## 3. Phân quyền

| Việc | admin | author | reviewer |
|---|:-:|:-:|:-:|
| Tạo, soạn, xóa khóa học; tài liệu nguồn; ảnh; video | ✓ | ✓ | |
| Xuất bản, xuất SCORM, tải đề QTI kèm đáp án, gửi gói sang LMS | ✓ | ✓ | |
| Mời / bỏ reviewer, gửi lại review | ✓ | ✓ | |
| Xem bản nháp, câu hỏi và đáp án | mọi khóa | mọi khóa | khóa được mời |
| Góp ý, trả lời | ✓ | ✓ | khóa được mời |
| Đánh dấu góp ý đã xử lý | ✓ | ✓ | góp ý của mình |
| Kết luận Duyệt / Cần sửa | | | ✓ (khóa được mời) |
| Người dùng, đổi hạn mức AI, nhật ký | ✓ | | |
| Thông báo của mình | ✓ | ✓ | ✓ |

Chặn ở API: `require_editor` (author, admin), `require_admin`; reviewer qua kiểm tra lời mời (`kit_reviews`) ở từng route review và route xem tài liệu `/api/view/:id`. Quản trị không tự hạ quyền hay khóa chính mình, và luôn còn ít nhất một quản trị đang hoạt động.

## 4. Quyết định

| Vấn đề | Chọn | Vì sao |
|---|---|---|
| Admin có soạn được không | Có, là người soạn cộng quyền quản trị | Đội nhỏ thường một người kiêm. Tách hẳn thì quản trị phải đổi tài khoản để sửa một lỗi chính tả |
| Reviewer xem bản nào | Bản nháp hiện tại | Review diễn ra trước khi xuất bản. Bản chụp cố định cần thêm bảng phiên bản review; để sau nếu cần đối chiếu |
| Góp ý gắn vào đâu | Tài liệu + vị trí (bài, slide, chương, cảnh, bước, câu hỏi) chọn từ danh sách | Không phụ thuộc vào cách vẽ của từng trình xem; người soạn bấm "Sửa chỗ này" mở đúng bài |
| "Cần sửa" | Bắt buộc có nhận xét chung hoặc ít nhất một góp ý còn mở | Người soạn luôn biết phải sửa gì |
| Vòng review | Gửi lại đặt người "Cần sửa" về "Đang chờ", tăng số vòng; góp ý ghi vòng | Thấy được góp ý thuộc lần nào, không mất lịch sử |
| Xuất có cần đã duyệt không | Không chặn, chỉ hiện tình trạng review trên thẻ khóa và trang khóa | Có khóa không cần review (cập nhật nhỏ); chặn cứng sẽ cần thêm luồng ngoại lệ |
| Đổi vai reviewer sang vai khác | Bỏ các lời mời review đang có, giữ góp ý | Không để lời mời "mồ côi"; góp ý vẫn là lịch sử của khóa |
| Migration | Alembic. `0001_baseline` tạo bảng từ SQL nền khi DB trống, bỏ qua khi đã có bảng (giữ nguyên dữ liệu `lms_studio` tạo từ bản Node trước); `0002_master_title`, `0003_notifications_lms_exports`, `0004_notification_grouping`. DB riêng `lms_studio` | Chuyển backend không phải tạo lại dữ liệu. Các bước sau chỉ thêm, không xóa |
| Backend | Python 3.12 + FastAPI, thay hẳn bản Node/Fastify, giữ nguyên hợp đồng API (đường dẫn, dữ liệu, mã lỗi) nên web không phải sửa | Hệ sinh thái AI và xử lý tài liệu của Python; chia module nghiệp vụ + adapter rõ ràng ([C4](C4.md)) |
| Việc chạy nền | Background Worker là tiến trình riêng, hàng đợi trong bảng `jobs` | API khởi động lại không mất việc đang chạy; chưa cần Redis |
| Thông báo | Lưu trong CSDL, chuông ở góc trên bên phải (polling 30 giây); email gửi bằng job nền. Reviewer nhận lời mời và nhắc hạn; người soạn nhận kết luận, góp ý (gộp theo người khi chưa đọc), kết quả gửi LMS | Request không chờ SMTP; lỗi email không làm hỏng thao tác chính. Email kiểm lại lời mời còn hiệu lực trước khi gửi |
| Gửi sang LMS | Ghim phiên bản lúc người soạn xác nhận; worker dựng gói từ đúng các phiên bản đó | Xuất bản lại sau khi bấm gửi không làm đổi gói đang gửi. Gửi lại dùng cùng `Idempotency-Key` nên LMS không nhận trùng |
| Giọng đọc video | Giọng có sẵn của dịch vụ TTS (`gpt-4o-mini-tts`), chọn trong 4 giọng; phong cách chung của video + "cách đọc" riêng từng slide gửi kèm dưới dạng chỉ dẫn | Dịch vụ không có thẻ nhấn từng âm tiết, chỉ dẫn bằng lời là cách duy nhất. Không nhân bản giọng người thật. Video cũ giữ giọng alloy để dựng lại một slide không bị lệch giọng |
| Người dẫn ở góc video | Tạm thời: ảnh chân dung người do AI tạo (không có thật) trong khung tròn, vòng sáng theo giọng đọc; chưa khớp khẩu hình | Bản nhân vật 3D dựng bằng code nhìn không đạt. Người dẫn như thật cần dịch vụ avatar (HeyGen, D-ID, Synthesia: trả phí, gửi lời đọc ra ngoài, cần IT duyệt) hoặc mô hình tự chạy (cần GPU, kiểm giấy phép). Khi chốt chỉ thay adapter `presenter.py`, luồng dựng giữ nguyên. Không dùng ảnh người thật |
| Cổng chạy | 4100 / 5194 / 5196 | Chạy song song với bản đầy đủ (4000 / 5190 / 5192) |

## 5. Luồng tạo khóa: nội dung trước, định dạng sau

**Vấn đề của luồng cũ** (chi tiết → chọn 3–5 định dạng → dàn ý từng định dạng → AI soạn tất cả song song):
- Mỗi định dạng tự đọc lại tài liệu nguồn nên dễ lệch nhau (thuật ngữ, số liệu, ý có ở slide mà không có ở bài học).
- Reviewer phải soát cùng một kiến thức ở nhiều định dạng; sửa một ý phải sửa nhiều chỗ.
- Chọn định dạng trước khi biết nội dung; soạn sai thì tốn AI cho cả bộ.

**Luồng mới:**

| Bước | Ai làm | Kết quả |
|---|---|---|
| 1. Chi tiết | AI đề xuất, người soạn sửa | Đối tượng, mục tiêu, kỹ năng và mức. Không còn chọn định dạng ở bước này |
| 2. Dàn ý nội dung | AI đề xuất, người soạn sửa | 3–8 bài, mỗi bài các ý chính |
| 3. Nội dung | AI viết, người soạn sửa, reviewer góp ý | Bản nội dung đầy đủ có trích nguồn, chỉ dùng nội bộ |
| 4. Chốt nội dung | Người soạn | Lưu nội dung thành phiên bản (v1, v2…) |
| 5. Định dạng | AI soạn từ bản đã chốt | Tài liệu nhanh, slide, video, tình huống, đề kiểm tra; mỗi định dạng ghi soạn từ phiên bản nào |

Quyết định chi tiết:
- Định dạng chỉ dùng các đoạn của nội dung đã chốt làm căn cứ; khối trích nguồn giữ nguyên mã tài liệu và đoạn nguồn gốc, nên trích dẫn và cảnh báo "tài liệu nguồn có bản mới" vẫn đúng.
- Chưa chốt thì API chặn tạo định dạng, tạo đề, soạn lại (`master_not_locked`), không chỉ khóa nút.
- Sửa nội dung sau khi chốt không ảnh hưởng định dạng đã có. Chốt lại thì định dạng soạn từ bản cũ hiện "Soạn từ v1, đã có v2 · Soạn lại"; soạn lại chỉ thay bản nháp, bản đã xuất bản giữ nguyên tới khi xuất bản lại.
- Chỗ thiếu căn cứ trong nội dung là cảnh báo khi chốt (không chặn) và không được dùng khi soạn định dạng.
- Nội dung không có bài kiểm tra, không vào gói SCORM, không xuất bản cùng "xuất bản cả khóa".
- Đề trong Kho đề tạo thẳng từ tài liệu nằm trong một khóa ẩn (`details.bank`) để dùng chung luồng soạn, review, xuất QTI; khóa ẩn không hiện trong danh sách khóa học, xóa đề thì xóa luôn khóa ẩn.
- Hộp chốt liệt kê từng khối thiếu căn cứ / chưa có nguồn kèm tên bài và nút "Sửa chỗ này" (mở đúng bài, cuộn tới và làm nổi khối). Trên khối thiếu căn cứ: "Tìm lại trong tài liệu nguồn" (AI) hoặc "Tự viết đoạn này" (khối được đánh dấu chưa có nguồn để reviewer kiểm tra).
- Tên hiển thị là "Nội dung" (migration `0002_master_title` đổi tên các bản đã có, không đổi nội dung).
- Bỏ "Hình thức triển khai" ở bước Chi tiết: bản Studio không vận hành việc học nên trường này không ảnh hưởng gì.
- Tài liệu nhanh bỏ giới hạn cứng 3 bài (chỉ nhắc nên gọn); nội dung tối đa 8 bài khi AI lập dàn ý.

## 6. Đề kiểm tra: ma trận đề

Trước đây đề chọn "mức 1–3", mà mỗi mức lại gắn sẵn dạng câu, nên trùng với ô chọn dạng câu và không nói được câu nào dễ, câu nào khó.

| Vấn đề | Chọn | Vì sao |
|---|---|---|
| Mức của câu hỏi | Độ khó Dễ / Trung bình / Khó (trường `level` 1–3 của câu) | Tách khỏi mức năng lực của khóa (khung kỹ năng). Câu cũ giữ nguyên số, chỉ đổi cách đọc |
| Cấu trúc đề | Ma trận: mỗi dòng là dạng câu × độ khó × số câu mỗi lượt thi; không cho hai dòng trùng ô | Đúng cách người ra đề quen dùng; mọi lượt thi cùng cấu trúc |
| Ngân hàng | Soạn gấp 1–3 lần số câu của ma trận (mặc định gấp đôi) | Mỗi lượt thi rút một bộ khác nhau mà vẫn đúng ma trận |
| Xuất QTI | Mỗi ô một `assessmentSection` có `selection select` bằng số câu của ô; câu ngoài ma trận không vào gói | LMS nhập QTI rút đúng ma trận, không cần cấu hình thêm |
| Thiếu câu | Cảnh báo theo từng ô khi xuất bản; bảng ma trận trong cài đặt đề có cột "Đã duyệt" | Người soạn biết ô nào cần duyệt / thêm câu |
| Giới hạn | Tối đa 50 câu mỗi đề, 100 câu ngân hàng | Giữ thời gian AI soạn và chi phí trong tầm |
| Đề cũ (chưa có ma trận) | Vẫn chạy như trước: rút ngẫu nhiên `pick` câu | Không phải soạn lại |

## 7. Kiểm thử

- `npm test`: 77 test pytest (FastAPI TestClient, DB `lms_studio_test`, AI / email / LMS đều giả lập), gồm toàn bộ test chuyển từ bản Node và các phần mới:
  - `test_kits.py`: luồng nội dung, chặn khi chưa chốt, chốt lại và soạn lại, vị trí cảnh báo khi chốt, AI thêm bài học.
  - `test_bank.py`: Kho đề, ma trận đề và gói QTI theo ô, từ chối ma trận trùng ô / quá lớn, đề từ khóa / từ tài liệu, dạng Đúng/Sai.
  - `test_reviews.py`, `test_users.py`: phạm vi xem của reviewer, mời, góp ý, kết luận, vòng mới; chỉ admin quản trị, hết phiên khi đổi vai / khóa.
  - `test_export.py`: gói SCORM (có test Nội dung không vào gói), đề QTI.
  - `test_notifications.py`: thông báo khi mời, mời lại, kết luận, góp ý; gộp góp ý liên tiếp tới khi đọc; email qua job nền; không gửi khi lời mời đã bị bỏ; nhắc hạn một lần mỗi vòng; chỉ xem và đánh dấu thông báo của mình.
  - `test_narration.py`: giọng, phong cách, cách đọc từng slide được gửi đúng vào TTS; video cũ giữ giọng cũ và dùng lại đoạn đã dựng; vòng sáng theo giọng; khung người dẫn tròn, nền trong suốt; video có người dẫn 20 khung/giây; trình soạn theo dõi tiến độ bằng jobId; bản lưu từ trình duyệt không ghi đè kết quả dựng.
  - `test_lms_export.py`: gửi đúng phiên bản đã ghim kể cả khi xuất bản v2 sau đó, header và token, LMS từ chối (4xx, không thử lại), LMS lỗi (5xx, thử lại rồi báo lỗi), gửi lại, chưa cấu hình, phân quyền.
- Kiểm tra trên trình duyệt (Chrome không giao diện, hồ sơ tạm, DB riêng, API Python + worker): ba vai, luồng mời → góp ý → kết luận → gửi lại; luồng chi tiết → dàn ý → nội dung → chốt → định dạng; tạo đề theo ma trận; chuông thông báo và email trong Mailpit; gửi khóa sang LMS demo → "LMS đã nhận" → LMS demo **Xem và nhập**.
