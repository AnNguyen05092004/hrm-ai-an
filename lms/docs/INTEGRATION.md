# Kết nối với LMS và hệ thống nội bộ của công ty

LMS này có ba cách nối với hệ thống đào tạo sẵn có. Có thể dùng cùng lúc.

| Cách | Dùng khi | Chiều dữ liệu | Cài ở đâu |
|---|---|---|---|
| Xuất gói SCORM 1.2 | Công ty muốn khóa học chạy ngay trên LMS hiện có | LMS này → tệp .zip → LMS công ty | Trang khóa học → Chia sẻ cả khóa → Xuất SCORM |
| xAPI tới LRS | LMS công ty có LRS và muốn nhận kết quả học trên LMS này | LMS này → LRS (tự động, gần thời gian thực) | Cài đặt → Tích hợp |
| Webhook | Hệ thống nội bộ (HRM, Talent, BI) muốn nhận sự kiện học | LMS này → địa chỉ HTTP của bạn | Cài đặt → Tích hợp |

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
- **Đề kiểm tra chính thức.** Gói chạy hoàn toàn trên trình duyệt nên đáp án sẽ nằm phía người học, không giữ được bảo mật đề. Giám sát khi thi cũng cần máy chủ. Thi chính thức làm trên LMS này, kết quả gửi sang công ty qua xAPI hoặc webhook.
- **AI Tutor.** Tutor cần máy chủ và tài liệu nguồn.

Gói lấy bản đã xuất bản tại thời điểm xuất. Sửa khóa xong thì xuất bản lại rồi xuất gói mới.

## 2. xAPI (Experience API 1.0.3)

Nhập địa chỉ LRS, khóa và mật khẩu (Basic auth) ở Cài đặt → Tích hợp, bấm **Gửi thử**, rồi bật. Mỗi sự kiện gửi một statement tới `POST {endpoint}/statements`:

| Sự kiện | Động từ (verb) | Đối tượng |
|---|---|---|
| Học xong một phần của khóa | `completed` | Tài liệu (lesson, media, simulation…), thuộc khóa học cha |
| Có kết quả thi (tự chấm hoặc người chấm xác nhận) | `passed` / `failed`, kèm điểm | Đề kiểm tra (assessment) |
| Xong mọi phần được giao của khóa | `completed` | Khóa học (course), chỉ gửi một lần |

Ví dụ:

```json
{
  "actor": { "objectType": "Agent", "name": "Trần Thu Hà", "mbox": "mailto:ha@demo.local" },
  "verb": { "id": "http://adlnet.gov/expapi/verbs/passed", "display": { "vi-VN": "đã đạt" } },
  "object": { "objectType": "Activity", "id": "https://lms.congty.vn/xapi/activities/exam/…", "definition": { "name": { "vi-VN": "Đề kiểm tra: Docker Volume" }, "type": "http://adlnet.gov/expapi/activities/assessment" } },
  "result": { "completion": true, "success": true, "score": { "scaled": 0.9, "raw": 90, "min": 0, "max": 100 } },
  "context": { "contextActivities": { "parent": [{ "id": "https://lms.congty.vn/xapi/activities/course/…" }] } }
}
```

## 3. Webhook

Hệ thống gửi `POST` JSON tới địa chỉ bạn nhập, với hai header:
- `X-LMS-Event`: tên sự kiện;
- `X-LMS-Signature: sha256=<HMAC-SHA256 của body, khóa là khóa ký>`.

Tạo khóa ký ở Cài đặt → Tích hợp. Khóa chỉ hiện một lần.

```json
{ "event": "exam.finished", "at": "2026-11-19T08:30:00.000Z",
  "user": { "id": "…", "name": "Trần Thu Hà", "email": "ha@demo.local" },
  "course": { "id": "…", "title": "Docker Volume cơ bản" },
  "item": { "id": "…", "type": "exam", "title": "Đề kiểm tra: Docker Volume" },
  "result": { "score": 90, "passed": true, "mode": "official" } }
```

Bên nhận kiểm tra chữ ký (Node.js):

```js
const ok = req.headers['x-lms-signature'] === 'sha256=' + crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex')
```

## Gửi tin cậy

- Sự kiện được ghi vào hàng đợi (bảng `outbox`) ngay khi nghiệp vụ xảy ra. Phần gửi chạy nền mỗi 15 giây.
- Gửi lỗi (mạng, 4xx, 5xx) thì thử lại sau 1, 2, 4… phút, tối đa 1 giờ một lần. Sau 8 lần thì dừng và giữ lỗi để xem.
- Nhật ký gửi ở Cài đặt → Tích hợp cho biết từng sự kiện đã gửi, đang thử lại, hay đã dừng và vì sao.
- Mật khẩu LRS và khóa ký không bao giờ trả về trình duyệt.

## Chưa làm (cần trao đổi với IT công ty)

| Hạng mục | Ghi chú |
|---|---|
| Đăng nhập một lần (SSO qua SAML hoặc OIDC) | Cần thông tin nhà cung cấp định danh của công ty |
| LTI 1.3 | Để LMS công ty mở thẳng khóa học trên LMS này (giữ được Tutor và thi chính thức) |
| Đồng bộ danh sách nhân viên và phòng ban từ HRM | Hiện thêm thành viên trong Năng lực đội ngũ |
| SCORM 2004 / cmi5 | Làm thêm khi LMS công ty yêu cầu |
