# LMS Studio: soạn khóa học bằng AI, mời review, xuất sang LMS công ty

Nhánh `feat/lms-studio`, tách từ bản LMS đầy đủ (`feat/lms-app`). Bản này chỉ giữ phần **làm ra khóa học**: soạn bằng AI từ tài liệu nội bộ, mời người review, xuất gói SCORM 1.2 và đề QTI 2.1 cho LMS sẵn có của công ty. Đã bỏ toàn bộ phía người học (học, AI Tutor, thi, chấm bài, kế hoạch đào tạo, phân tích, xAPI/webhook). Lý do và phạm vi ở [docs/STUDIO.md](docs/STUDIO.md), kiến trúc (C4) ở [docs/C4.md](docs/C4.md), cách xuất và gửi gói ở [docs/INTEGRATION.md](docs/INTEGRATION.md).

## Chạy (một lệnh)

Cần Node 22, [uv](https://docs.astral.sh/uv/) (`brew install uv`; uv tự tải Python 3.12), Docker Desktop (đang mở) và ffmpeg (`brew install ffmpeg`, chỉ dùng để dựng video AI).

```bash
cd lms
npm start
```

Mở http://localhost:5194. Dừng bằng Ctrl+C.

| Địa chỉ | Là gì |
|---|---|
| http://localhost:5194 | Web LMS Studio |
| http://localhost:4100/api/docs | Tài liệu API (OpenAPI, tự sinh) |
| http://localhost:5196 | LMS công ty (demo): nhận gói qua API, nhập gói, học thử |
| http://localhost:8025 | Mailpit: hộp thư giả, xem email thông báo đã gửi |

`npm start` tự làm các bước:

1. Tạo `.env` từ `.env.example` nếu chưa có. Lấy key OpenAI từ `../key.txt`; không có key thì chạy AI giả lập. Sinh `LMS_API_TOKEN` (khóa chung giữa Studio và LMS demo) nếu còn trống.
2. Chạy `npm install` nếu chưa cài, `uv sync` cho API.
3. Bật Postgres và Mailpit trong Docker, tạo DB `lms_studio` nếu chưa có.
4. Cập nhật cấu trúc CSDL (Alembic). Tạo dữ liệu mẫu ở lần chạy đầu; các lần sau giữ nguyên dữ liệu.
5. Chạy API FastAPI (cổng 4100), Background Worker, web (cổng 5194) và LMS công ty demo (cổng 5196).

Cổng và DB khác bản LMS đầy đủ (4000, 5190, 5192, DB `lms`) nên chạy song song hai bản được, dữ liệu không đụng nhau.

| Lệnh | Dùng khi |
|---|---|
| `npm start` | Chạy hằng ngày |
| `npm run reset` | Xóa hết dữ liệu, tạo lại dữ liệu mẫu rồi chạy |
| `npm test` | Chạy 77 test API bằng pytest (AI giả lập, email giả, LMS giả, DB `lms_studio_test` riêng) |
| `npm run lint` · `npm run build` | Kiểm tra code Python (ruff) · build web và LMS demo |

**Bản demo:** mở web là vào thẳng vai người soạn. Bấm tên ở góc dưới thanh bên để đổi vai. Tự bật khi không phải production; tắt bằng `DEMO_MODE=false` trong `.env` để dùng màn đăng nhập.

## Ba vai

Mật khẩu mẫu `demo1234`, chỉ dùng ở môi trường phát triển.

| Vai | Email mẫu | Làm được |
|---|---|---|
| Quản trị (admin) | admin@demo.local | Mọi việc của người soạn, cộng thêm: tạo tài khoản, đổi vai, khóa tài khoản, đặt lại mật khẩu, đổi hạn mức AI, xem nhật ký |
| Người soạn (author) | an@demo.local | Tải tài liệu nguồn, tạo và soạn khóa học bằng AI, mời review, trả lời góp ý, xuất bản, xuất gói |
| Reviewer | ha@demo.local, nam.lh@demo.local | Chỉ thấy khóa được mời; nhận thông báo (chuông và email) khi được mời, khi sắp tới hạn. Xem bản nháp (kèm đáp án câu hỏi), góp ý theo từng bài / slide / cảnh / câu hỏi, kết luận Duyệt hoặc Cần sửa. Không sửa được nội dung |

Quyền được kiểm tra ở API, không chỉ ẩn nút trên giao diện. Đổi vai hoặc khóa tài khoản thì mọi phiên đăng nhập của người đó hết hiệu lực ngay.

## Luồng làm việc

```
Người soạn                              Reviewer                      LMS công ty
──────────                              ────────                      ───────────
Tải tài liệu nguồn
Nhập mục tiêu → AI soạn chi tiết
→ dàn ý nội dung → AI viết NỘI DUNG (có trích nguồn, chỉ dùng nội bộ)
Mời review ──────────────────────────► Góp ý theo bài, kết luận
Sửa theo góp ý ◄──────────────────────
"Chốt nội dung" (phiên bản 1)
Tạo định dạng TỪ bản đã chốt:
  Tài liệu nhanh, Bộ slide, Video, Tình huống, Đề kiểm tra
Sửa nội dung → "Chốt lại" (v2) → định dạng soạn từ v1 báo "Soạn lại"
Xuất bản → Xuất khóa học ─────────────────────────────────────────► Nhập gói SCORM / đề QTI
```

## Tính năng

| Phần | Làm được |
|---|---|
| Tài liệu nguồn | Tải PDF, DOCX, TXT, MD rồi tìm theo nghĩa. Tải bản mới thì chỉ ra bài, slide, câu hỏi nào đang trích phần bị đổi |
| Soạn khóa học | Nhập mục tiêu → AI soạn chi tiết → dàn ý nội dung → AI viết Nội dung (tối đa 8 bài). Mọi khối ghi nguồn; chỗ nguồn không đủ được đánh dấu; AI cảnh báo nguồn mâu thuẫn hoặc nhạy cảm |
| Nội dung | Bản nội dung đầy đủ để duyệt, không xuất cho người học. "Chốt nội dung" lưu thành phiên bản; Tài liệu nhanh, Slide, Video, Tình huống, Đề kiểm tra chỉ soạn từ bản đã chốt (AI không đọc lại tài liệu nguồn nên các định dạng không lệch nhau, trích nguồn vẫn giữ đúng tài liệu gốc). Sửa rồi chốt lại thì định dạng soạn từ bản cũ được đánh dấu và soạn lại một cú bấm. Khóa tạo trước khi có bước này: tạo nội dung từ Tài liệu nhanh đang có |
| Soạn tại chỗ | Bấm vào chữ là sửa, tự lưu, định dạng chữ, sửa từng khối bằng AI, khôi phục phiên bản cũ. Thêm bài học (bài trống hoặc AI soạn theo tên bài và yêu cầu), đổi thứ tự bài |
| Slide, video AI | Trình soạn slide (hộp chữ, ảnh, hình khối, xoay, sắp lớp, hoàn tác); slide + lời đọc → giọng AI → MP4 có phụ đề. Chọn giọng (nữ/nam, nghe thử), phong cách đọc (thân thiện, trang trọng, chậm rãi, hào hứng) và **cách đọc từng slide** (nhấn từ nào, ngừng ở đâu; AI soạn video điền sẵn). **Người dẫn** ở góc trái hoặc phải video: ảnh chân dung do AI tạo (người không có thật), nữ hay nam theo giọng, vòng sáng nhấp nháy theo giọng đọc; khớp khẩu hình sẽ bổ sung sau. Bấm dựng thì thấy tiến độ từng đoạn (%), dựng xong có thông báo |
| Câu hỏi | 9 dạng: một đáp án, nhiều đáp án, đúng/sai, điền chỗ trống, sắp thứ tự, ghép cặp, phân loại kéo thả, tự luận có tiêu chí chấm, bài code có test case. Mỗi câu có độ khó Dễ / Trung bình / Khó. Thêm câu theo dạng, hoặc chọn dạng và độ khó muốn AI soạn. Người soạn duyệt từng câu |
| Kho đề | Thư viện → Kho đề: mọi đề của công ty, ghi rõ ra đề từ khóa nào hay từ tài liệu nào, số câu đã duyệt. Tạo đề theo **ma trận đề** (mỗi dòng: dạng câu, độ khó, số câu trong mỗi lượt thi) và số câu dự phòng; mỗi lượt thi rút ngẫu nhiên đúng số câu của từng ô. Tạo từ khóa học đã chốt nội dung, hoặc thẳng từ tài liệu nguồn (đề đứng riêng, không thành khóa học) |
| Review | Mời nhiều reviewer cho một khóa, kèm lời nhắn và hạn. Góp ý gắn với tài liệu và vị trí (bài, slide, chương, cảnh, bước, câu hỏi), trả lời trong luồng, đánh dấu đã xử lý / mở lại. Kết luận "Cần sửa" bắt buộc nói rõ cần sửa gì. Gửi lại mở vòng review mới. Thẻ khóa học hiện tình trạng review |
| Thông báo | Chuông ở góc trên bên phải (Trang chủ, Thư viện, trang khóa, trang review; số chưa đọc, bấm là mở đúng trang) và email. Reviewer: được mời review, mời review lại, nhắc khi còn dưới 24 giờ tới hạn. Người soạn: kết luận review, góp ý mới (chỉ trong app; nhiều góp ý liên tiếp của cùng người gộp thành một dòng có số đếm), kết quả gửi gói sang LMS. Email gửi bằng job nền, kiểm lại lời mời còn hiệu lực trước khi gửi |
| Xuất | Xuất bản cả khóa (bỏ qua tài liệu không đổi, nêu lý do tài liệu bị chặn). Gói SCORM 1.2 cùng giao diện học. Đề kiểm tra QTI 2.1 kèm đáp án, tiêu chí chấm và lời nhắc cho AI chấm của LMS công ty. **Gửi sang LMS công ty qua API**: xác nhận đúng các phiên bản sẽ gửi, worker gửi gói, lưu mã gói hoặc lỗi, gửi lại khi lỗi; sửa và xuất bản lại sau đó không đổi gói đã gửi. Trang demo LMS công ty (http://localhost:5196) nhận gói qua API hoặc nhập tay |
| Quản trị | Người dùng và vai, hạn mức AI theo tháng, thống kê token, nhật ký thao tác (mời review, kết luận, xuất gói, đổi vai…) |

## Kịch bản demo nhanh

1. Vai **Người soạn**: tạo khóa mới ở Trang chủ, đi qua Chi tiết → Dàn ý → Nội dung; ở trang khóa bấm **Chốt nội dung** rồi tạo Bộ slide, Đề kiểm tra từ bản đã chốt. Khóa "Docker Volume cơ bản" đang **Cần sửa**. Mở **Xem review**: anh Nam góp ý ở Bài 3. Bấm **Sửa chỗ này**, sửa, quay lại đánh dấu **Đã xử lý**, rồi **Đã sửa, gửi lại review**.
2. Mở khóa "SQL cho phân tích dữ liệu" → **Review** → **Mời review**, chọn Phạm Thu Hà, ghi lời nhắn.
3. Đổi sang vai **Reviewer** (Phạm Thu Hà): hộp **Cần review** có khóa vừa mời và khóa An toàn thông tin. Mở khóa, bấm **Xem** một tài liệu, bấm **Góp ý**, chọn tài liệu và vị trí, viết góp ý. Bấm **Kết luận review** → Duyệt hoặc Cần sửa.
   Vai Reviewer thấy số đỏ ở chuông **Thông báo** góc trên bên phải: lời mời vừa gửi. Email cùng nội dung ở Mailpit http://localhost:8025.
4. Về vai **Người soạn**: mở khóa An toàn thông tin → **Xuất khóa học** → xuất bản cả khóa → **Gửi sang LMS công ty** → **Gửi khóa**, xác nhận phiên bản. Lịch sử hiện "LMS đã nhận" kèm mã gói; chuông báo kết quả. Mở http://localhost:5196 (vai Quản trị đào tạo) → mục **Gói nhận qua API** → **Xem và nhập**. Vẫn tải được gói SCORM và đề QTI để nhập tay.
5. Vai **Quản trị**: **Người dùng** → thêm một reviewer mới (mật khẩu tạm hiện một lần), đổi vai, khóa tài khoản. **Cài đặt → Nhật ký** xem lại các thao tác.

## Tech stack

| Lớp | Dùng |
|---|---|
| Web | React 18, Vite, Tailwind, React Router, TanStack Query. Vite chuyển `/api` sang cổng 4100 |
| API | Python 3.12, FastAPI, pydantic cho mọi đầu vào, uvicorn. Mã chia theo module nghiệp vụ (`app/modules/*`) và adapter (`app/adapters/*`), xem [C4](docs/C4.md) |
| CSDL | PostgreSQL 16 + pgvector (Docker), SQLAlchemy Core (psycopg 3), Alembic. Migration nền `0001_baseline` giữ nguyên DB đã có |
| AI | OpenAI (model đổi qua `.env`), có hạn mức theo tháng; `AI_PROVIDER=mock` để chạy không cần key |
| Đăng nhập | Email + mật khẩu (bcrypt), session trong cookie httpOnly, chống CSRF, giới hạn số lần gọi |
| Việc chạy nền | Bảng `jobs` (`for update skip locked`) + Background Worker là tiến trình riêng: AI soạn, đọc tài liệu, dựng video, gửi email, gửi gói sang LMS, nhắc hạn review |
| Email | SMTP; máy phát triển dùng Mailpit |
| Xuất gói | SCORM 1.2 và IMS QTI 2.1; gửi qua API của LMS công ty (Bearer token, Idempotency-Key) |
| Test | pytest + FastAPI TestClient, ruff |

## Cấu trúc

```
lms/
├── scripts/start.sh          chạy một bước (npm start)
├── docker-compose.yml        Postgres + pgvector, Mailpit
├── docs/STUDIO.md            phạm vi bản này, quyết định, phân quyền
├── docs/C4.md                kiến trúc theo mô hình C4 (C1, C2, C3)
├── docs/INTEGRATION.md       xuất SCORM và đề QTI, gửi gói qua API, thử trên LMS công ty
├── apps/api                  FastAPI (Python 3.12, uv)
│   ├── app/main.py           Application API · app/worker.py: Background Worker
│   ├── app/modules           identity, sources, courses, exams, reviews, notifications, lms_export, media
│   ├── app/adapters          AI (OpenAI/mock), trích tài liệu, email, LMS client, dựng slide
│   ├── app/shared            CSDL và unit of work, hàng đợi job, phiên đăng nhập, lỗi, nhật ký
│   ├── migrations            Alembic
│   └── tests                 pytest
├── apps/web                  React + Vite + Tailwind
└── apps/company-lms          LMS công ty mô phỏng: API nhận gói, nhập gói, học thử
```

## Giới hạn

- Chỉ đăng nhập bằng email và mật khẩu. Chưa có SSO, chưa có màn đổi mật khẩu (quản trị đặt lại mật khẩu tạm).
- Thông báo trong app lấy bằng polling (30 giây), chưa đẩy tức thời.
- Reviewer xem bản nháp đang soạn, không phải bản chụp cố định: người soạn sửa trong lúc review thì reviewer thấy ngay bản mới.
- Tệp lưu trên ổ đĩa (`STORAGE_DIR`) dùng chung cho API và Worker; chưa có S3. Giới hạn số request đếm trong bộ nhớ từng tiến trình API.
