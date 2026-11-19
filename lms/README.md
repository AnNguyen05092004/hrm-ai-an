# LMS: soạn khóa bằng AI, AI Tutor, thi và năng lực đội ngũ

Bản chạy thật của [prototype LMS](../prototype/lms): có backend, cơ sở dữ liệu, đăng nhập và AI thật (OpenAI). Phân tích và quyết định kiến trúc ở [docs/PLAN.md](docs/PLAN.md), rà soát UX và so sánh với Articulate ở [docs/REVIEW-UX.md](docs/REVIEW-UX.md), kết nối LMS công ty ở [docs/INTEGRATION.md](docs/INTEGRATION.md), đặc tả ở [lms-specs.md](../docs/modules/lms/lms-specs.md).

## Chạy (một lệnh)

Cần cài sẵn Node 22, Docker Desktop (đang mở) và ffmpeg (`brew install ffmpeg`, chỉ dùng để dựng video AI).

```bash
cd lms
npm start
```

Mở http://localhost:5190. Dừng bằng Ctrl+C.

`npm start` tự làm các bước:

1. Tạo `.env` nếu chưa có. Lấy key OpenAI từ `../key.txt`; không có key thì chạy AI giả lập.
2. Chạy `npm install` nếu chưa cài.
3. Bật Postgres trong Docker.
4. Tạo bảng và dữ liệu mẫu, chỉ ở lần chạy đầu. Các lần sau giữ nguyên dữ liệu.
5. Chạy API (cổng 4000) và web (cổng 5190).

| Lệnh | Dùng khi |
|---|---|
| `npm start` | Chạy hằng ngày |
| `npm run reset` | Xóa hết dữ liệu, tạo lại dữ liệu mẫu rồi chạy |
| `npm test` | Chạy 59 test API (AI giả lập, DB `lms_test` riêng) |
| `npm run typecheck` · `npm run build` | Kiểm tra kiểu · build bản production (gồm cả trình học cho gói SCORM) |

Muốn chạy không cần key: đặt `AI_PROVIDER=mock` trong `.env`.

**Tài khoản mẫu** (mật khẩu `demo1234`, chỉ dùng ở môi trường phát triển):

| Vai | Email | Thấy gì |
|---|---|---|
| Giám đốc, người tạo khóa học | an@demo.local | Trang chủ, Thư viện, Năng lực đội ngũ, Phân tích, Chấm bài, Cài đặt |
| Người học | ha@demo.local | Khóa học của tôi, học, hỏi AI Tutor, thi |

## Tech stack

| Lớp | Dùng | Ghi chú |
|---|---|---|
| Web | React 18, Vite, Tailwind, React Router, TanStack Query | Tái dùng giao diện prototype. Vite chuyển `/api` sang cổng 4000 |
| API | Node 22, Fastify 5, TypeScript strict, Zod | Kiểm tra mọi đầu vào bằng schema |
| CSDL | PostgreSQL 16 + pgvector (Docker), Drizzle ORM | Bảng quan hệ, nội dung bài học dạng JSONB, vector cho Tutor, tất cả trong một DB |
| AI | OpenAI: `gpt-5.4-mini` (mặc định), `gpt-5.4` (việc khó), `text-embedding-3-small`, `gpt-4o-mini-tts`, `gpt-image-2` (tạo ảnh) | Đầu ra JSON theo schema. Đổi model qua `.env`. Có hạn mức theo tháng |
| Đăng nhập | Email + mật khẩu (bcrypt), session trong cookie httpOnly | Có chống CSRF và giới hạn số lần gọi |
| Việc chạy nền | Bảng `jobs` + worker trong tiến trình API | Dùng cho AI soạn bài và dựng video. Khởi động lại không mất việc |
| Tài liệu nguồn | pdf-parse, mammoth | Trích chữ, chia đoạn theo mục, tạo embedding |
| Chấm bài code | worker thread + `node:vm` | Giới hạn thời gian và bộ nhớ, không có biến môi trường |
| Video | resvg (vẽ slide), TTS, ffmpeg | Ghép slide và giọng đọc thành MP4 có phụ đề |
| Tích hợp | SCORM 1.2 (gói .zip, fflate), xAPI 1.0.3, webhook HMAC | Hàng đợi `outbox` gửi nền, thử lại khi lỗi. Chi tiết ở [docs/INTEGRATION.md](docs/INTEGRATION.md) |
| Test | Vitest + `app.inject` | AI giả lập nên test không tốn tiền |

## Tính năng đã làm

| Phần | Làm được |
|---|---|
| Tài liệu nguồn | Tải PDF, DOCX, TXT, MD rồi tìm theo nghĩa. Tải bản mới thì chỉ ra bài, slide, câu hỏi nào đang trích phần bị đổi |
| Soạn bộ đào tạo | Nhập mục tiêu → AI soạn chi tiết → dàn ý → 4 loại tài liệu (Tài liệu nhanh, Slide, Tình huống, Video). Mọi khối đều ghi nguồn. Chỗ nguồn không đủ được đánh dấu. AI cảnh báo khi nguồn mâu thuẫn hoặc có nội dung nhạy cảm |
| Khối nội dung | Văn bản, tiêu đề, danh sách, bảng, mã lệnh, ảnh, ảnh có chú thích (điểm bấm), tab, mục mở rộng, thẻ lật, dòng thời gian, các bước, câu hỏi nhanh, luyện tập kéo thả phân loại. AI soạn được các khối này từ tài liệu nguồn |
| Ảnh | Ảnh có sẵn, tải ảnh lên (kiểm tra định dạng thật của tệp, tối đa 8 MB), AI tạo ảnh từ mô tả. Dùng cho khối ảnh, slide, ảnh bìa tài liệu và khóa; ảnh vào cả video dựng |
| Giao diện khóa | Màu nhấn, bộ font, ảnh bìa riêng cho từng khóa; áp cho trình soạn, trang khóa, bài học, slide, video và trang thi |
| Soạn tại chỗ | Bấm vào chữ là sửa, tự lưu. Bôi đen chữ để in đậm, nghiêng, gạch chân, gạch ngang, đổi màu, tô nền, gắn liên kết (⌘B/I/U/K). Mỗi khối chỉnh được cỡ chữ, căn lề, nền. Sửa từng khối bằng AI, sinh câu hỏi theo mức. Xuất bản có phiên bản, khôi phục được bản cũ |
| Slide | 8 bố cục, sửa chữ tại chỗ; định dạng như phần mềm trình chiếu: kéo di chuyển, cỡ chữ, màu, đậm/nghiêng, căn lề, hộp chữ tự do, màu nền; sửa slide bằng AI; nghe thử lời đọc bằng giọng AI |
| Video AI | Slide + lời đọc → giọng AI → MP4 có phụ đề, chương theo thời lượng thật (giữ đúng định dạng slide). Sửa slide ngay trong trang video; sửa slide nào chỉ dựng lại đoạn đó |
| Khóa học | Một khóa gồm Tài liệu nhanh, Slide, Tình huống, Video, Đề kiểm tra. Chia sẻ cả khóa: xuất bản hàng loạt (bỏ qua tài liệu không đổi, nêu lý do tài liệu bị chặn), giao cả khóa, một đường dẫn cho cả khóa |
| Học | Khóa học của tôi gom theo khóa; mở khóa thấy các phần theo thứ tự học, tiến độ từng phần và nút học tiếp. Có hạn, theo dõi tiến độ |
| AI Tutor | Chỉ trả lời từ nội dung đã xuất bản, kèm nguồn và nút nhảy tới bài hoặc phút video. Tìm sang khóa khác. Không có câu trả lời thì nói rõ và gom câu hỏi cho người soạn. Tự tắt khi người học đang thi |
| Đề kiểm tra | Tạo đề riêng cho khóa: chọn mức, số câu mỗi mức, số câu mỗi đề, giờ, điểm đạt, lượt, giám sát; AI soạn ngân hàng câu có nguồn, người soạn duyệt (có duyệt tất cả) |
| Dạng câu hỏi | Một đáp án, nhiều đáp án, điền chỗ trống, ghép cặp, sắp thứ tự, phân loại kéo thả (chấm tự động, cho điểm từng phần), tự luận (AI chấm nháp), bài code JavaScript (chạy cách ly) |
| Thi và chấm | Mỗi người một đề riêng, rút từ ngân hàng câu đã duyệt. Có giờ thi, số lượt, lưu liên tục, làm tiếp được khi mất mạng. Trắc nghiệm và bài code JavaScript chấm tự động. AI chấm nháp tự luận theo rubric, người chấm xác nhận |
| Giám sát | Bật theo bài, người thi phải đồng ý. Gắn cờ khi chuyển tab, rời cửa sổ, dán từ ngoài. Người chấm quyết định. Tự xóa sau 30 ngày |
| Năng lực đội ngũ | Từ KPI ra kỹ năng cần và khoảng cách của từng người. Gợi ý khóa có sẵn, hoặc tạo khóa bằng AI cho kỹ năng chưa có. Có sơ đồ đội ngũ và đánh giá mức từ bằng chứng. Thi chính thức đạt thì nâng mức (tối đa 3). Trợ lý AI trả lời trên dữ liệu đội |
| Kết nối LMS công ty | Xuất khóa thành gói SCORM 1.2 (cùng giao diện học, ghi hoàn thành, điểm, học dở); gửi kết quả học sang LRS qua xAPI; webhook có chữ ký cho hệ thống nội bộ |
| Vận hành | Hạn mức AI theo tháng, thống kê token theo tính năng, nhật ký thao tác. Phân tích câu Tutor chưa trả lời được và câu hỏi bị sai nhiều |

## Kịch bản demo nhanh

1. Đăng nhập `an@demo.local`. Ở Trang chủ, tải lên [docs/demo/Quy-trinh-release.md](docs/demo/Quy-trinh-release.md), chọn chủ đề mẫu CI/CD rồi bấm **Bắt đầu**. Rà chi tiết → **Tạo dàn ý** → **Tạo N tài liệu**.
2. Mở Tài liệu nhanh. Xem nguồn ở từng khối, thử **Sửa bằng AI**, vào Bài kiểm tra duyệt vài câu vào ngân hàng đề. Sau đó **Chia sẻ** → **Xuất bản** → **Giao khóa**.
3. Mở Video → tab **Lời đọc** → **Dựng video**.
4. Vào Thư viện → Tài liệu nguồn → `Runbook-Backup-v2.docx` → **Tải bản mới** bằng [docs/demo/Runbook-Backup-v3.md](docs/demo/Runbook-Backup-v3.md). Mở bộ "Docker Volume cơ bản": banner chỉ ra bài bị ảnh hưởng.
5. Đăng nhập `ha@demo.local`. Mở "Lệnh và lựa chọn khi dùng Docker Volume" và hỏi Tutor 3 câu: "Khi nào dùng bind mount?", "Chính sách nghỉ phép năm bao nhiêu ngày?", "Đáp án câu 2 là gì?". Sau đó làm bài thi chính thức có giám sát.
6. Quay lại `an@demo.local` → **Chấm bài**. Xem rubric AI đề xuất, xử lý cờ, xác nhận. Nếu đạt, mức Docker của Hà lên 2 ở **Năng lực đội ngũ**.
7. Ở **Năng lực đội ngũ**: xem kế hoạch theo KPI, giao khóa, tạo khóa bằng AI cho kỹ năng chưa có khóa, hỏi trợ lý "Bộ phận nào yếu nhất?".

## Cấu trúc

```
lms/
├── scripts/start.sh          lệnh chạy một bước (npm start)
├── docker-compose.yml        Postgres + pgvector (DB lms và lms_test)
├── docs/PLAN.md              phân tích, quyết định kiến trúc, tiến độ
├── apps/api                  Fastify + TypeScript + Drizzle
│   ├── src/db                schema, migration, dữ liệu mẫu
│   ├── src/lib               auth, AI (OpenAI/mock), job nền, sandbox code, trích tài liệu
│   └── src/modules           sources, kits, artifacts, learn, tutor, exams, workforce, video, analytics
└── apps/web                  React + Vite + Tailwind
```

## Giới hạn của bản này

- Chỉ đăng nhập bằng email và mật khẩu. Chưa có SSO, chưa có màn đổi mật khẩu.
- Bài code chỉ hỗ trợ JavaScript, chạy trong worker cách ly của Node. Production nên chạy trong container riêng.
- Giám sát chỉ ghi sự kiện trên trình duyệt, chưa phân tích camera.
- Worker giả định chỉ có một tiến trình API. Chạy nhiều máy chủ thì cần hàng đợi riêng.
- Chưa tạo được Hướng dẫn từng bước bằng AI. Loại này chỉ có trong dữ liệu mẫu.
- Gói SCORM không có đề kiểm tra chính thức và AI Tutor (cần máy chủ). Kết quả thi gửi sang công ty qua xAPI hoặc webhook.
