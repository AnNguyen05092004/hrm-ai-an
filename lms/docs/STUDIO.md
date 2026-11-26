# LMS Studio: phạm vi và quyết định

> Nhánh `feat/lms-studio`, tách từ `feat/lms-app` ngày 26/11/2026.

## 1. Mục tiêu

Chỉ làm ra khóa học, không vận hành việc học: soạn khóa bằng AI, mời người review, xuất sang LMS sẵn có của công ty. Người học học và thi trên LMS công ty.

## 2. Giữ, bỏ, thêm

| | Nội dung |
|---|---|
| Giữ | Tài liệu nguồn, luồng tạo khóa (chi tiết → dàn ý → AI soạn), các trình soạn (Tài liệu nhanh, Slide, Tình huống, Video, Đề kiểm tra), ảnh, video AI, xuất bản có phiên bản, xuất SCORM 1.2, đề QTI 2.1, trang demo LMS công ty |
| Bỏ | Vai người học, Khóa học của tôi, trình học trên web, tiến độ học, AI Tutor, thi và giám sát, chấm bài, kế hoạch đào tạo (KPI, khoảng cách kỹ năng, đội ngũ, trợ lý giám đốc), phân tích học tập, giao khóa, đường dẫn chia sẻ, xAPI, webhook |
| Thêm | Vai admin và reviewer, quản trị người dùng, review khóa học (mời, góp ý theo vị trí, kết luận, nhiều vòng), trang xem câu hỏi kèm đáp án |

Bảng bị bỏ khỏi CSDL: `departments`, `positions`, `user_skills`, `skill_events`, `kpis`, `evidence`, `assignments`, `progress`, `attempts`, `tutor_messages`, `content_chunks`, `outbox`. Bảng `skills` giữ lại làm danh mục kỹ năng để gắn khóa học. Bảng mới: `kit_reviews`, `review_comments`.

## 3. Phân quyền

| Việc | admin | author | reviewer |
|---|:-:|:-:|:-:|
| Tạo, soạn, xóa khóa học; tài liệu nguồn; ảnh; video | ✓ | ✓ | |
| Xuất bản, xuất SCORM, tải đề QTI kèm đáp án | ✓ | ✓ | |
| Mời / bỏ reviewer, gửi lại review | ✓ | ✓ | |
| Xem bản nháp, câu hỏi và đáp án | mọi khóa | mọi khóa | khóa được mời |
| Góp ý, trả lời | ✓ | ✓ | khóa được mời |
| Đánh dấu góp ý đã xử lý | ✓ | ✓ | góp ý của mình |
| Kết luận Duyệt / Cần sửa | | | ✓ (khóa được mời) |
| Người dùng, đổi hạn mức AI, nhật ký | ✓ | | |

Chặn ở API: `requireEditor` (author, admin), `requireAdmin`; reviewer qua kiểm tra lời mời (`kit_reviews`) ở từng route review và route xem tài liệu `/api/view/:id`. Quản trị không tự hạ quyền hay khóa chính mình, và luôn còn ít nhất một quản trị đang hoạt động.

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
| Migration | Một migration nền mới (`0000_studio_baseline`), DB riêng `lms_studio` | Nhánh là sản phẩm tách riêng. Lỡ chạy nhầm vào DB của bản đầy đủ thì migration báo lỗi bảng đã có và dừng, không xóa dữ liệu |
| Cổng chạy | 4100 / 5194 / 5196 | Chạy song song với bản đầy đủ (4000 / 5190 / 5192) |

## 5. Kiểm thử

- `npm test`: 43 test API, gồm `reviews.test.ts` (phạm vi xem của reviewer, mời, góp ý gắn vị trí, trả lời, đã xử lý, kết luận, vòng mới, bỏ reviewer) và `users.test.ts` (chỉ admin, mật khẩu tạm, hết phiên khi đổi vai / khóa, không tự hạ quyền, đổi vai reviewer thì bỏ lời mời).
- Kiểm tra trên trình duyệt (Chrome không giao diện, hồ sơ tạm): ba vai, luồng mời → góp ý → kết luận → gửi lại → xuất.
