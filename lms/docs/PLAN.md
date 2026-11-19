# LMS bản chạy thật: phân tích và kế hoạch

> Nhánh `feat/lms-app`. Prototype giữ nguyên ở `prototype/lms` (bản backup: nhánh `backup/lms-prototype`).
> Đầu vào: [lms-specs.md](../../docs/modules/lms/lms-specs.md), prototype LMS (UI/UX đã chốt qua nhiều vòng góp ý).

## 1. Mục tiêu bản này

Biến prototype (chạy hoàn toàn trên trình duyệt, AI giả lập) thành hệ thống chạy thật:

- Có backend, cơ sở dữ liệu, đăng nhập, phân quyền 2 vai (người tạo khóa học, người học).
- AI thật (OpenAI): soạn khóa từ tài liệu nguồn có trích dẫn, sinh câu hỏi, chấm nháp tự luận, AI Tutor trả lời từ nội dung đã xuất bản, trợ lý giám đốc.
- Giữ UI/UX của prototype (thanh bên, trang bộ đào tạo, soạn "thấy gì sửa nấy").
- Chạy được khi không có key OpenAI (AI_PROVIDER=mock) để test và demo offline.

## 2. Quyết định kiến trúc

| Hạng mục | Chọn | Vì sao (và phương án đã loại) |
|---|---|---|
| Cấu trúc | Monorepo npm workspaces: `apps/api`, `apps/web` | Một lệnh chạy cả hai; không cần Turborepo cho 2 app |
| Frontend | React 18 + Vite + Tailwind + React Router (BrowserRouter) + TanStack Query | Tái dùng trực tiếp component prototype. Next.js bị loại: phải viết lại toàn bộ UI, không cần SSR cho app nội bộ |
| Backend | Node 22 + Fastify 5 + TypeScript strict + Zod | Nhanh, schema validation sẵn, dễ test bằng `app.inject`. NestJS bị loại vì nặng so với quy mô |
| CSDL | PostgreSQL 16 + pgvector (Docker) qua Drizzle ORM | Quan hệ rõ (người dùng, giao khóa, lượt thi) + JSONB cho nội dung bài học + vector cho Tutor trong cùng một DB. Loại SQLite (không có vector, khó lên production) |
| Nội dung soạn | Lưu cây nội dung tài liệu (bài, khối, slide, cảnh, câu hỏi) dạng JSONB trong `artifacts.content`, bản xuất bản lưu snapshot ở `artifact_versions` | Editor "thấy gì sửa nấy" sửa cả cây; tách bảng từng khối làm autosave phức tạp mà không được gì |
| Đăng nhập | Email + mật khẩu (bcrypt), session token ngẫu nhiên trong cookie httpOnly, bảng `sessions` lưu hash | Đơn giản, thu hồi được. JWT bị loại vì khó thu hồi. SSO công ty để sau (cần hỏi mentor) |
| Việc chạy lâu (AI soạn, tạo video) | Bảng `jobs` + worker chạy trong tiến trình API, web hỏi trạng thái định kỳ | Không cần Redis/BullMQ cho 1 máy chủ; vẫn bền qua khởi động lại |
| AI | OpenAI Responses API, đầu ra JSON theo schema (structured outputs); embeddings `text-embedding-3-small`; TTS `gpt-4o-mini-tts` | Model cấu hình qua env. Mặc định `gpt-5.4-mini` (nhanh, rẻ) |
| Tài liệu nguồn | Tải PDF/DOCX/TXT/MD → trích chữ (pdf-parse, mammoth) → chia đoạn theo mục → embedding | Đúng BR01: mọi đoạn AI viết trích về đoạn nguồn cụ thể |
| Bài code | Chạy JavaScript trong worker thread + `node:vm`, giới hạn thời gian và bộ nhớ | Đủ cho bản nội bộ (NFR03 mức cơ bản). Ghi rõ giới hạn: production cần sandbox riêng (container/firecracker) |
| Video AI | Slide → giọng đọc AI (TTS) → ghép MP4 bằng ffmpeg; chương và lời thoại lấy từ kịch bản | Đúng mục 4.2 của spec. Không có ffmpeg thì vẫn phát dạng slide + audio |
| Test | Vitest + `app.inject` cho API trên DB test riêng; AI dùng mock | Test không tốn tiền, không phụ thuộc mạng |

## 3. Mô hình dữ liệu (rút gọn)

```
orgs ── users (role: author|learner, dept, position)
     ── sessions
     ── skills ── user_skills (level, nguồn: thi/đánh giá/khai báo) ── skill_events
     ── departments, positions (position_skills: mức cần)
     ── kpis (kpi_skills: kỹ năng tác động)
     ── sources (tài liệu nguồn, phiên bản) ── source_chunks (vector)
     ── kits (bộ đào tạo: mục tiêu, đối tượng, skill, mức, chi tiết, dàn ý)
           └── artifacts (qr|deck|scenario|video|guide, content JSONB, status)
                 ├── artifact_versions (snapshot khi xuất bản)
                 ├── content_chunks (vector, cho Tutor; chỉ bản đã xuất bản)
                 └── assignments (người học, hạn, nguồn giao: thủ công/kế hoạch KPI)
     ── progress (người học × tài liệu: bài đã xong, % , lần xem)
     ── attempts (lượt thi: đề riêng, câu trả lời, điểm, trạng thái, cờ giám sát)
     ── tutor_messages (câu hỏi, câu trả lời, nguồn, found=false → gom cho người soạn)
     ── jobs (việc AI chạy nền), audit_logs (NFR06), outbox (gửi kết quả sang Talent)
```

## 4. Phạm vi theo phase

Mỗi phase xong: chạy test + build, review diff (`/code-review`), sửa, commit rồi mới sang phase sau.

| Phase | Nội dung | Xong khi |
|---|---|---|
| P0 Nền | Monorepo, Docker Postgres, Drizzle schema + migration, seed, auth, phân quyền, lỗi chuẩn, khung web (đăng nhập, thanh bên, route theo vai) | Đăng nhập 2 vai được, test auth xanh |
| P1 Soạn khóa | Tài liệu nguồn (tải, trích, chia đoạn, embedding); tạo bộ: Chi tiết → Dàn ý → AI soạn (job) có trích nguồn và đánh dấu chỗ thiếu căn cứ; trang bộ; editor Tài liệu nhanh + Bài kiểm tra + Slide + Tình huống (autosave); xuất bản có phiên bản | Tạo khóa từ 1 file PDF thật bằng OpenAI, sửa, xuất bản |
| P2 Học | Giao khóa (người/nhóm, hạn); Khóa học của tôi; trình học (tiến độ thật); AI Tutor RAG (nguồn, nhảy tới bài/phút, tìm khóa khác, không có thì nói rõ và gom câu hỏi), tắt khi thi | Người học học và hỏi Tutor được |
| P3 Thi & chấm | Ngân hàng câu đã duyệt; AI sinh câu theo skill + mức; lượt thi: đề riêng, xáo thứ tự, giờ, lượt, lưu liên tục; chấm code (trắc nghiệm, điền, test case); AI chấm nháp tự luận; người chấm xác nhận; cờ giám sát (chuyển tab, dán); đạt chính thức → nâng mức skill (≤3) + outbox Talent; chưa đạt → chỉ phần cần học lại | Luồng thi → chấm → nâng mức chạy hết |
| P4 Năng lực đội ngũ | Đội ngũ, khung năng lực, KPI (có sẵn + tự thêm, AI gợi ý kỹ năng), khoảng cách kỹ năng, gợi ý khóa có sẵn, giao theo kế hoạch, AI tạo khóa cho kỹ năng chưa có khóa; trợ lý giám đốc (LLM trên dữ liệu thật) | Từ KPI ra kế hoạch giao khóa |
| P5 Phân tích & hoàn thiện | Phân tích (người xem, hoàn thành, điểm, câu Tutor chưa trả lời); cài đặt hạn mức AI; video AI (TTS + ffmpeg); nhật ký; dọn dữ liệu giám sát 30 ngày; README, hướng dẫn chạy, test E2E thủ công | Demo trọn luồng |

**Không làm ở bản này:** SSO, nhiều tổ chức trên một bản cài (đã có `org_id` để mở rộng), camera giám sát bằng AI (chỉ ghi cờ chuyển tab/dán; camera để sau), sandbox code đa ngôn ngữ, Hướng dẫn từng bước từ video quay màn hình (cần xử lý video).

## 5. Rủi ro và cách giảm

| Rủi ro | Cách giảm |
|---|---|
| AI bịa nội dung không có trong nguồn | Prompt chỉ cấp đoạn nguồn có mã; đầu ra bắt buộc gắn mã nguồn cho từng khối; khối không có nguồn hợp lệ bị chuyển thành "thiếu căn cứ" |
| Tutor trả lời ngoài nội dung | Chỉ truy xuất từ bản đã xuất bản; ngưỡng điểm tương đồng; model phải trả `found=false` nếu đoạn không đủ |
| Lộ đáp án qua API | API lượt thi không bao giờ trả `ok`, `answer`, `tests` kỳ vọng cho người thi |
| Người học gọi Tutor khi đang thi | Kiểm tra phía server: đang có lượt thi chính thức mở thì từ chối |
| Chi phí AI | Hạn mức theo tổ chức (bảng `ai_usage`), model nhỏ mặc định, mock khi test |
| Code người thi treo máy | Worker + vm timeout 2 giây, giới hạn bộ nhớ, không có `require`/mạng |

## 6. Tiến độ (cập nhật 19/11/2026, 01:40)

| Phase | Trạng thái | Commit |
|---|---|---|
| P0 Nền | Xong | 5ee57b2 |
| P1 Soạn khóa | Xong (đã test trình duyệt với OpenAI thật) | 5ee57b2 |
| P2 Học + Tutor | Xong | 6e9e5d7 |
| P3 Thi & chấm | Xong, đã review và sửa | 6e9e5d7 |
| P4 Năng lực đội ngũ | Xong | a1fb1ca |
| P5 Video AI, seed nguồn, README | Xong: dựng video thật, tab Lời đọc, test video + đổi nguồn (F05), README + file demo | xem git log |

Việc còn lại (tùy chọn): màn đổi mật khẩu, SSO, sandbox code bằng container, hàng đợi job riêng khi chạy nhiều máy chủ, Hướng dẫn từng bước tạo bằng AI.

Cách chạy: `cd lms && npm start` (xem README). Test: `npm test`.

Ghi chú quyết định: web giữ JSX (tái dùng prototype, TS ở backend nơi cần an toàn kiểu); sandbox code là worker + vm, env rỗng, chỉ truyền chuỗi vào vm (production nên thay bằng container).
