# LMS Studio: soạn khóa học bằng AI, mời review, xuất sang LMS công ty

Nhánh `feat/lms-studio`, tách từ bản LMS đầy đủ (`feat/lms-app`). Bản này chỉ giữ phần **làm ra khóa học**: soạn bằng AI từ tài liệu nội bộ, mời người review, xuất gói SCORM 1.2 và đề QTI 2.1 cho LMS sẵn có của công ty. Đã bỏ toàn bộ phía người học (học, AI Tutor, thi, chấm bài, kế hoạch đào tạo, phân tích, xAPI/webhook). Lý do và phạm vi ở [docs/STUDIO.md](docs/STUDIO.md), cách xuất ở [docs/INTEGRATION.md](docs/INTEGRATION.md).

## Chạy (một lệnh)

Cần Node 22, Docker Desktop (đang mở) và ffmpeg (`brew install ffmpeg`, chỉ dùng để dựng video AI).

```bash
cd lms
npm start
```

Mở http://localhost:5194. Dừng bằng Ctrl+C.

`npm start` tự làm các bước:

1. Tạo `.env` từ `.env.example` nếu chưa có. Lấy key OpenAI từ `../key.txt`; không có key thì chạy AI giả lập.
2. Chạy `npm install` nếu chưa cài.
3. Bật Postgres trong Docker, tạo DB `lms_studio` nếu chưa có.
4. Tạo bảng và dữ liệu mẫu ở lần chạy đầu. Các lần sau giữ nguyên dữ liệu.
5. Chạy API (cổng 4100), web (cổng 5194) và trang demo LMS công ty nhận gói (cổng 5196).

Cổng và DB khác bản LMS đầy đủ (4000, 5190, 5192, DB `lms`) nên chạy song song hai bản được, dữ liệu không đụng nhau.

| Lệnh | Dùng khi |
|---|---|
| `npm start` | Chạy hằng ngày |
| `npm run reset` | Xóa hết dữ liệu, tạo lại dữ liệu mẫu rồi chạy |
| `npm test` | Chạy 43 test API (AI giả lập, DB `lms_studio_test` riêng) |
| `npm run typecheck` · `npm run build` | Kiểm tra kiểu · build bản production (gồm cả trình học cho gói SCORM) |

**Bản demo:** mở web là vào thẳng vai người soạn. Bấm tên ở góc dưới thanh bên để đổi vai. Tự bật khi không phải production; tắt bằng `DEMO_MODE=false` trong `.env` để dùng màn đăng nhập.

## Ba vai

Mật khẩu mẫu `demo1234`, chỉ dùng ở môi trường phát triển.

| Vai | Email mẫu | Làm được |
|---|---|---|
| Quản trị (admin) | admin@demo.local | Mọi việc của người soạn, cộng thêm: tạo tài khoản, đổi vai, khóa tài khoản, đặt lại mật khẩu, đổi hạn mức AI, xem nhật ký |
| Người soạn (author) | an@demo.local | Tải tài liệu nguồn, tạo và soạn khóa học bằng AI, mời review, trả lời góp ý, xuất bản, xuất gói |
| Reviewer | ha@demo.local, nam.lh@demo.local | Chỉ thấy khóa được mời. Xem bản nháp (kèm đáp án câu hỏi), góp ý theo từng bài / slide / cảnh / câu hỏi, kết luận Duyệt hoặc Cần sửa. Không sửa được nội dung |

Quyền được kiểm tra ở API, không chỉ ẩn nút trên giao diện. Đổi vai hoặc khóa tài khoản thì mọi phiên đăng nhập của người đó hết hiệu lực ngay.

## Luồng làm việc

```
Người soạn                         Reviewer                         LMS công ty
──────────                         ────────                         ───────────
Tải tài liệu nguồn
Nhập mục tiêu → AI soạn chi tiết
→ dàn ý → tài liệu (có trích nguồn)
Mời review (chọn người, lời nhắn, hạn) ──► Hộp "Cần review"
                                   Xem bản nháp, góp ý theo vị trí
                                   Kết luận: Duyệt / Cần sửa
Trả lời, "Sửa chỗ này", đánh dấu  ◄──
đã xử lý → "Đã sửa, gửi lại review" ──► Vòng 2 ...
Xuất bản → Xuất khóa học ─────────────────────────────────────────► Nhập gói SCORM / đề QTI
```

## Tính năng

| Phần | Làm được |
|---|---|
| Tài liệu nguồn | Tải PDF, DOCX, TXT, MD rồi tìm theo nghĩa. Tải bản mới thì chỉ ra bài, slide, câu hỏi nào đang trích phần bị đổi |
| Soạn khóa học | Nhập mục tiêu → AI soạn chi tiết → dàn ý → Tài liệu nhanh, Slide, Tình huống, Video, Đề kiểm tra. Mọi khối ghi nguồn; chỗ nguồn không đủ được đánh dấu; AI cảnh báo nguồn mâu thuẫn hoặc nhạy cảm |
| Soạn tại chỗ | Bấm vào chữ là sửa, tự lưu, định dạng chữ, sửa từng khối bằng AI, sinh câu hỏi theo mức, khôi phục phiên bản cũ |
| Slide, video AI | Trình soạn slide (hộp chữ, ảnh, hình khối, xoay, sắp lớp, hoàn tác); slide + lời đọc → giọng AI → MP4 có phụ đề |
| Câu hỏi | Một / nhiều đáp án, điền chỗ trống, ghép cặp, sắp thứ tự, phân loại, tự luận có tiêu chí chấm, bài code có test case. Người soạn duyệt từng câu |
| Review | Mời nhiều reviewer cho một khóa, kèm lời nhắn và hạn. Góp ý gắn với tài liệu và vị trí (bài, slide, chương, cảnh, bước, câu hỏi), trả lời trong luồng, đánh dấu đã xử lý / mở lại. Kết luận "Cần sửa" bắt buộc nói rõ cần sửa gì. Gửi lại mở vòng review mới. Thẻ khóa học hiện tình trạng review |
| Xuất | Xuất bản cả khóa (bỏ qua tài liệu không đổi, nêu lý do tài liệu bị chặn). Gói SCORM 1.2 cùng giao diện học. Đề kiểm tra QTI 2.1 kèm đáp án, tiêu chí chấm và lời nhắc cho AI chấm của LMS công ty. Trang demo LMS công ty (http://localhost:5196) để thử nhập gói |
| Quản trị | Người dùng và vai, hạn mức AI theo tháng, thống kê token, nhật ký thao tác (mời review, kết luận, xuất gói, đổi vai…) |

## Kịch bản demo nhanh

1. Vai **Người soạn**: Trang chủ có khóa "Docker Volume cơ bản" đang **Cần sửa**. Mở **Xem review**: anh Nam góp ý ở Bài 3. Bấm **Sửa chỗ này**, sửa, quay lại đánh dấu **Đã xử lý**, rồi **Đã sửa, gửi lại review**.
2. Mở khóa "SQL cho phân tích dữ liệu" → **Review** → **Mời review**, chọn Phạm Thu Hà, ghi lời nhắn.
3. Đổi sang vai **Reviewer** (Phạm Thu Hà): hộp **Cần review** có khóa vừa mời và khóa An toàn thông tin. Mở khóa, bấm **Xem** một tài liệu, bấm **Góp ý**, chọn tài liệu và vị trí, viết góp ý. Bấm **Kết luận review** → Duyệt hoặc Cần sửa.
4. Về vai **Người soạn**: mở khóa An toàn thông tin → **Xuất khóa học** → xuất bản cả khóa → tải gói SCORM và đề QTI. Nhập thử vào http://localhost:5196.
5. Vai **Quản trị**: **Người dùng** → thêm một reviewer mới (mật khẩu tạm hiện một lần), đổi vai, khóa tài khoản. **Cài đặt → Nhật ký** xem lại các thao tác.

## Tech stack

| Lớp | Dùng |
|---|---|
| Web | React 18, Vite, Tailwind, React Router, TanStack Query. Vite chuyển `/api` sang cổng 4100 |
| API | Node 22, Fastify 5, TypeScript strict, Zod cho mọi đầu vào |
| CSDL | PostgreSQL 16 + pgvector (Docker), Drizzle ORM. Migration nền `0000_studio_baseline` |
| AI | OpenAI (model đổi qua `.env`), có hạn mức theo tháng; `AI_PROVIDER=mock` để chạy không cần key |
| Đăng nhập | Email + mật khẩu (bcrypt), session trong cookie httpOnly, chống CSRF, giới hạn số lần gọi |
| Việc chạy nền | Bảng `jobs` + worker trong tiến trình API (AI soạn, dựng video) |
| Xuất gói | SCORM 1.2 và IMS QTI 2.1 (fflate) |
| Test | Vitest + `app.inject` |

## Cấu trúc

```
lms/
├── scripts/start.sh          chạy một bước (npm start)
├── docker-compose.yml        Postgres + pgvector
├── docs/STUDIO.md            phạm vi bản này, quyết định, phân quyền
├── docs/INTEGRATION.md       xuất SCORM và đề QTI, thử trên LMS công ty
├── apps/api                  Fastify + TypeScript + Drizzle
│   ├── src/db                schema, migration, dữ liệu mẫu
│   ├── src/lib               auth, AI (OpenAI/mock), job nền, trích tài liệu
│   └── src/modules           sources, kits (soạn, xuất SCORM/QTI), artifacts (soạn, xem trước), reviews, users, images, video
├── apps/web                  React + Vite + Tailwind
└── apps/company-lms          LMS công ty mô phỏng để thử nhập gói
```

## Giới hạn

- Chỉ đăng nhập bằng email và mật khẩu. Chưa có SSO, chưa có màn đổi mật khẩu (quản trị đặt lại mật khẩu tạm).
- Chưa gửi email thông báo khi được mời review; reviewer xem ở hộp "Cần review" (có số đếm ở thanh bên).
- Reviewer xem bản nháp đang soạn, không phải bản chụp cố định: người soạn sửa trong lúc review thì reviewer thấy ngay bản mới.
- Worker giả định chỉ có một tiến trình API.
