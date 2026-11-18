# LMS: soạn khóa bằng AI, AI Tutor, thi và năng lực đội ngũ

Bản chạy thật của [prototype LMS](../prototype/lms). Có backend, cơ sở dữ liệu, đăng nhập và AI thật (OpenAI). Phân tích, kiến trúc và tiến độ ở [docs/PLAN.md](docs/PLAN.md). Đặc tả ở [lms-specs.md](../docs/modules/lms/lms-specs.md).

## Chạy trên máy

Cần Node 22, Docker, ffmpeg (để dựng video AI).

```bash
cd lms
cp .env.example .env            # điền OPENAI_API_KEY, hoặc đặt AI_PROVIDER=mock để chạy không cần key
docker compose up -d db         # Postgres 16 + pgvector ở cổng 54329
npm install
npm run db:seed -w apps/api     # tạo bảng và dữ liệu mẫu (xóa dữ liệu cũ)
npm run dev -w apps/api         # API ở http://localhost:4000
npm run dev -w apps/web         # web ở http://localhost:5190
```

Tài khoản mẫu (mật khẩu `demo1234`, chỉ dùng ở môi trường phát triển):

| Vai | Email | Thấy gì |
|---|---|---|
| Giám đốc · người tạo khóa học | an@demo.local | Trang chủ, Thư viện, Năng lực đội ngũ, Phân tích, Chấm bài, Cài đặt |
| Người học | ha@demo.local | Khóa học của tôi, học, hỏi AI Tutor, thi |

Kiểm tra: `npm test -w apps/api` (AI giả lập, DB `lms_test`), `npm run typecheck -w apps/api`, `npm run build -w apps/web`.

## Có gì

| Phần | Làm được |
|---|---|
| Tài liệu nguồn | Tải PDF, DOCX, TXT, MD; trích chữ, chia đoạn theo mục, lập chỉ mục vector; tải bản mới thì chỉ ra bài, slide, câu hỏi đang trích phần bị đổi |
| Soạn bộ đào tạo | Mô tả mục tiêu → AI soạn chi tiết (đối tượng, mục tiêu, chỉ số, kỹ năng, mức, kế hoạch tài liệu, cảnh báo nguồn mâu thuẫn hoặc nhạy cảm) → dàn ý → nội dung. Mọi khối có nguồn; chỗ nguồn không đủ được đánh dấu |
| Soạn tại chỗ | Bấm vào chữ là sửa, tự lưu; sửa bằng AI từng khối, tạo khối từ nguồn, sinh câu hỏi theo mức; xuất bản có phiên bản, khôi phục phiên bản cũ |
| Video AI | Từ slide + ghi chú → giọng đọc AI → MP4 có phụ đề, chương theo thời lượng thật; sửa đoạn nào chỉ dựng lại đoạn đó |
| Học | Giao khóa theo người/bộ phận, hạn; tiến độ thật; xem trước nhiều cỡ màn hình; đường dẫn chia sẻ trong công ty |
| AI Tutor | Trả lời chỉ từ nội dung đã xuất bản, có nguồn và nút nhảy tới bài/phút video; tìm ở khóa khác; không có thì nói rõ và gom câu hỏi cho người soạn; tắt khi đang thi |
| Thi và chấm | Đề riêng rút từ ngân hàng đã duyệt, xáo thứ tự; giờ thi, số lượt, lưu liên tục, làm tiếp khi mất mạng; trắc nghiệm và bài code (JavaScript, chạy cách ly) chấm tự động; AI chấm nháp tự luận theo rubric; người chấm xác nhận |
| Giám sát | Bật theo bài, phải đồng ý trước; gắn cờ chuyển tab, rời cửa sổ, dán từ ngoài; người chấm quyết định; tự xóa sau 30 ngày |
| Năng lực đội ngũ | KPI → kỹ năng cần → khoảng cách từng người → khóa có sẵn hoặc tạo khóa bằng AI; sơ đồ đội ngũ; đánh giá mức từ bằng chứng; thi chính thức đạt nâng mức (≤ 3) và gửi sang Talent qua outbox; trợ lý AI hỏi đáp trên dữ liệu đội |
| Vận hành | Hạn mức AI theo tháng, thống kê token theo tính năng, nhật ký thao tác, phân tích (câu Tutor chưa trả lời được, câu hỏi bị sai nhiều) |

## Kịch bản demo nhanh

1. Đăng nhập `an@demo.local`. Trang chủ → tải [docs/demo/Quy-trinh-release.md](docs/demo/Quy-trinh-release.md) → chọn chủ đề mẫu CI/CD → **Bắt đầu**. Rà chi tiết → **Tạo dàn ý** → **Tạo N tài liệu**.
2. Mở Tài liệu nhanh: xem nguồn trích ở từng khối, thử **Sửa bằng AI**, vào Bài kiểm tra duyệt vài câu vào ngân hàng đề. **Chia sẻ → Xuất bản → Giao khóa**.
3. Mở Video: tab **Lời đọc** → **Dựng video**.
4. Thư viện → Tài liệu nguồn → `Runbook-Backup-v2.docx` → **Tải bản mới** bằng [docs/demo/Runbook-Backup-v3.md](docs/demo/Runbook-Backup-v3.md). Mở bộ "Docker Volume cơ bản": banner chỉ ra bài bị ảnh hưởng.
5. Đăng nhập `ha@demo.local`: mở "Lệnh và lựa chọn khi dùng Docker Volume", hỏi Tutor ("Khi nào dùng bind mount?", "Chính sách nghỉ phép năm bao nhiêu ngày?", "Đáp án câu 2 là gì?"), rồi thi chính thức có giám sát.
6. Quay lại `an@demo.local` → **Chấm bài**: xem rubric AI đề xuất, xử lý cờ, xác nhận. Đạt thì mức Docker của Hà lên 2 ở **Năng lực đội ngũ**.
7. **Năng lực đội ngũ**: xem kế hoạch theo KPI, giao khóa, tạo khóa bằng AI cho kỹ năng chưa có khóa, hỏi trợ lý "Bộ phận nào yếu nhất?".

## Cấu trúc

```
lms/
├── docker-compose.yml        Postgres + pgvector (DB lms và lms_test)
├── docs/PLAN.md              phân tích, quyết định kiến trúc, phạm vi, tiến độ
├── apps/api                  Fastify + TypeScript + Drizzle
│   ├── src/db                schema, migration, seed (dữ liệu mẫu từ prototype)
│   ├── src/lib               auth, AI (OpenAI/mock), job nền, sandbox chạy code, trích tài liệu
│   └── src/modules           sources, kits (AI soạn), artifacts, learn, tutor, exams, workforce, video, analytics
└── apps/web                  React + Vite + Tailwind, giao diện từ prototype
```

## Giới hạn của bản này

- Đăng nhập bằng email/mật khẩu; chưa có SSO công ty, chưa có màn đổi mật khẩu.
- Bài code chỉ hỗ trợ JavaScript, chạy trong worker cách ly của Node. Production nên chạy trong container riêng.
- Giám sát chỉ ghi sự kiện trên trình duyệt (chuyển tab, rời cửa sổ, dán); chưa phân tích camera.
- Worker chạy job trong tiến trình API, giả định một tiến trình; nhiều máy chủ thì cần hàng đợi riêng.
- Hướng dẫn từng bước (từ video quay màn hình) chỉ có ở dữ liệu mẫu, chưa tạo mới bằng AI.
