# Tổng hợp tính năng bản nhóm (hrm-batch4) để chốt scope

> **Nguồn:** `INTERNSHIP/hrm-batch4`, nhánh `main` (commit `39c2fc6`). Đã đọc README, brief, scope-prd, requirements và user stories của 6 module, M6 features-and-screens, khảo sát HRM/LMS và README của prototype.
> **Mục đích:** liệt kê đủ tính năng, nội dung chính và luồng của bản nhóm để chọn phần đưa vào project riêng.
> **Cách review:** ở bảng mục 3, điền cột **Giữ?** bằng `✔` (giữ), `✖` (bỏ) hoặc `?` (cần hỏi thêm).

---

## 1. Tổng quan

| Mục | Nội dung |
|---|---|
| Tên | AI-powered Workforce Ecosystem (prototype đặt tên "Workforce AI") |
| Bài toán | Một lớp AI đặt trên **HRM và LMS hiện có**, hỗ trợ cả vòng đời nhân sự: tuyển dụng → đánh giá → tiếp nhận → tác vụ hằng ngày → đào tạo → tái bố trí → nghỉ việc |
| Quy mô | 6 module, 28 use case, 139 user stories, prototype 56 màn hình, 8 vai trò |
| Trạng thái | Mới phân tích nghiệp vụ. Prototype chạy cục bộ, toàn bộ AI và tích hợp HRM/LMS đều là giả lập, chưa có backend |
| Nguyên tắc | AI chỉ tìm, phân tích và soạn nháp; người có thẩm quyền quyết định. Kết quả AI phải có căn cứ, nếu không thì ghi "chưa đủ dữ liệu". HRM và LMS là nguồn dữ liệu chính thức. Quá hạn SLA chỉ nhắc và leo thang, không tự duyệt |
| Không làm | Xây lại HRM/LMS; tính lương và chi trả; bot hoặc avatar AI phỏng vấn trực tiếp; để AI tự quyết tuyển, duyệt, kích hoạt, cho đạt hay cho nghỉ việc; quy trình ra quyết định nghỉ việc |
| Tạm hoãn | Trợ lý tri thức chung của công ty; hỗ trợ công việc chuyên môn; phân tích nhân lực tổng thể; tối ưu nguồn lực chủ động; quy trình đánh giá hiệu suất (mục tiêu, chấm điểm, thưởng) |

**Vai trò** (prototype gộp còn 8 vai): Nhân viên (gồm nhân viên mới và người sắp nghỉ), Ứng viên, HR (gồm Recruiter), Quản lý / Chuyên gia (gồm Interviewer và người duyệt nội dung), L&D, Thanh tra, Giám đốc, IT / Admin (gồm các bộ phận làm thủ tục).

---

## 2. Mind map và luồng tổng thể

```text
Workforce AI
├── M1 Tuyển dụng và tái bố trí
│   ├── 1.1 Tìm CV theo JD
│   ├── 1.2 Gợi ý JD theo CV
│   ├── 1.3 Tái bố trí nhân sự khi giải thể/tái cấu trúc
│   ├── 1.4 So sánh 2–5 ứng viên
│   └── 1.5 Xác minh bằng cấp, chứng chỉ, timeline
├── M2 Đánh giá và phỏng vấn
│   ├── 2.1 Bài đánh giá kỹ thuật do AI sinh
│   ├── 2.2 Bộ câu hỏi phỏng vấn + rubric
│   └── 2.3 Phân tích phỏng vấn, tổng hợp hội đồng, offer
├── M3 Onboarding
│   ├── 3.1 Khởi tạo, checklist, phân công các bộ phận
│   ├── 3.2 Thu giấy tờ, OCR, đối chiếu hồ sơ
│   └── 3.3 Đào tạo hội nhập, điều kiện hoàn tất, active
├── M4 Nghỉ việc và bàn giao
│   ├── 4.1 AI soạn nháp bàn giao
│   ├── 4.2 AI rà soát bằng chứng bàn giao
│   └── 4.3 Báo cáo tồn đọng theo người/đợt, đóng hồ sơ
├── M5 Chatbot HR
│   ├── 5.1 Hỏi đáp chính sách có trích dẫn (RAG)
│   ├── 5.2 Giải trình công qua chat
│   ├── 5.3 Đăng ký OT qua chat, chặn vượt hạn mức
│   ├── 5.4 Xin nghỉ phép qua chat, tạm giữ ngày phép
│   └── 5.5 SLA, nhắc, leo thang
└── M6 Đào tạo và phát triển
    ├── 6.1 Lộ trình phát triển cá nhân
    ├── 6.2 Kế hoạch đào tạo tổ chức (agent)
    ├── 6.3 AI tạo/cập nhật nội dung khóa học
    ├── 6.4 AI Tutor trong khóa học
    ├── 6.5 Đánh giá năng lực và kết quả đào tạo
    ├── 6.6 Sẵn sàng vào dự án
    ├── 6.7 Khung năng lực dùng chung
    ├── 6.8 Đánh giá năng lực/tiềm năng theo kỳ, cân chỉnh
    └── 6.9 Dashboard năng lực, 9-Box
```

```text
                 ┌──────────── HRM (hồ sơ, công, phép, OT, trạng thái) ───────────┐
                 │                                                                │
 Ứng viên ─► M1 Tìm/ghép CV–JD ─► M2 Đánh giá, phỏng vấn ─► offer ─► M3 Onboarding ─► Active vào dự án
                 ▲                                                    │     ▲
                 │ kỹ năng đã xác nhận                    giao học    ▼     │ kết quả học
                 └──────────────────────────────── M6 Đào tạo (LMS) ◄───────┘
                 ▲                                         ▲
 Tái cấu trúc ─► M1 Tái bố trí ──── cần học bổ sung ───────┘

 Nhân viên đang làm ─► M5 Chatbot: chính sách, giải trình công, OT, phép ─► người duyệt ─► HRM cập nhật
 HRM có quyết định nghỉ ─► M4 Bàn giao + thủ tục các bộ phận ─► HR đóng hồ sơ ─► HRM
```

**Điểm giao đã chốt:** chỉ tạo onboarding khi đủ 3 điều kiện (duyệt tuyển, ứng viên nhận offer, HR xác nhận tiếp nhận). M4 chỉ bắt đầu khi HRM đã có quyết định nghỉ. Điểm matching thấp không bao giờ tự sinh quyết định nghỉ việc. Trạng thái active theo dự án tách khỏi trạng thái quan hệ lao động.

---

## 3. Bảng chốt scope (28 use case)

**Mức AI:** **Lõi** nghĩa là AI tạo ra giá trị chính (ghép, sinh, đọc, soạn). **Hỗ trợ** nghĩa là chủ yếu là quy trình, AI chỉ tóm tắt hoặc gợi ý thêm. **Quy tắc** nghĩa là gần như không cần AI, code hoặc cấu hình làm được.
**GĐ:** giai đoạn trong PRD của nhóm. GĐ 1 chủ yếu đọc dữ liệu; GĐ 2 cần ghi sang HRM/LMS; GĐ 3 cần khung năng lực hoặc nguồn bên ngoài.

| Mã | Tính năng | AI làm gì | Người quyết | Mức AI | Hệ thống | GĐ | Giữ? |
|---|---|---|---|---|---|---|---|
| 1.1 | Tìm CV theo JD | Vector search kho CV cũ, điểm 0–100 (trọng số 50/25/15/10), giải thích kỹ năng đáp ứng/thiếu | Recruiter chọn shortlist | Lõi | Kho CV, JD | 1 | |
| 1.2 | Gợi ý JD theo CV | Bóc tách CV, ghép với JD đang tuyển, chỉ gap; ứng tuyển 1 chạm | Ứng viên / Recruiter | Lõi | Cổng việc làm, chatbot | 1 | |
| 1.3 | Tái bố trí nhân sự | Tổng hợp hồ sơ NV, ghép vị trí mở, chia 3 nhóm (≥70 / 50–69 / <50) | Recruiter duyệt, Manager nhận xác nhận | Lõi | HRM (hồ sơ, KPI) | 3 | |
| 1.4 | So sánh ứng viên | Bảng so sánh 2–5 người: điểm, kỹ năng, lương kỳ vọng, ngày sẵn sàng; xuất PDF/XLSX | Recruiter, Line Manager | Hỗ trợ | Dữ liệu 1.1 | 1 | |
| 1.5 | Xác minh hồ sơ | Đối chiếu trường được công nhận, tìm khoảng trống/trùng timeline, kiểm tra chứng chỉ; mức rủi ro L/M/H | Recruiter, Onboarding | Quy tắc | Nguồn xác thực ngoài | 3 | |
| 2.1 | Đánh giá kỹ thuật | Sinh bài theo JD + CV (kiến thức, coding, tình huống, câu hỏi kiểm tra dự án trong CV), chấm theo rubric, báo cáo xác minh | Recruiter: phỏng vấn / bổ sung / dừng | Lõi | — | 1 | |
| 2.2 | Chuẩn bị phỏng vấn | Sinh 3–5 câu hỏi STAR, 3–4 câu tình huống, câu đào sâu phần chưa xác minh; rubric 5 mức; gắn vào lịch hội đồng | Recruiter, Line Manager | Lõi | Lịch | 1 | |
| 2.3 | Tổng hợp phỏng vấn | Đọc ghi chú/transcript, gợi ý điểm theo rubric; cờ VARIANCE_FLAG khi lệch > 2.0; báo cáo HIRE/NO_HIRE | Interviewer xác nhận điểm; hội đồng quyết | Lõi | — | 1 | |
| 3.1 | Khởi tạo onboarding | Gợi ý quy trình/checklist theo loại NV; phân công HR/IT/Admin/Manager; nhắc trễ hạn | HR chỉnh và xác nhận checklist | Hỗ trợ | HRM, email | 2 | |
| 3.2 | Hồ sơ nhân sự | OCR giấy tờ, phân loại, đối chiếu với dữ liệu M1 và lời khai, báo thiếu/sai/trùng | HR xác nhận hợp lệ | Lõi | HRM (Employee Records) | 2 | |
| 3.3 | Hội nhập và active | Đề xuất lộ trình học, phân tích phần chưa đạt, tổng hợp 5 điều kiện hoàn tất | HR hoàn tất; Lead xác nhận sẵn sàng | Hỗ trợ | LMS, HRM | 2 | |
| 4.1 | Soạn nháp bàn giao | Từ bảng công việc và tài liệu → nháp bàn giao có nguồn, nêu phần thiếu | Manager chốt phạm vi, người nhận | Lõi | HRM | 2 | |
| 4.2 | Rà soát bàn giao | Đối chiếu bằng chứng với checklist, báo thiếu/mâu thuẫn | Người nhận xác nhận; Manager hoàn tất | Lõi | — | 2 | |
| 4.3 | Báo cáo tồn đọng | Tóm tắt tiến độ theo người/đợt/đơn vị, chỉ điểm nghẽn | HR đóng hồ sơ | Hỗ trợ | HRM, IT/Admin/Finance | 2 | |
| 5.1 | Hỏi đáp chính sách | RAG trên quy chế nội bộ + Bộ luật Lao động, bắt buộc trích dẫn; không có thì chuyển HR | — | Lõi | Kho chính sách | 1 | |
| 5.2 | Giải trình công | Bot đọc log chấm công, hỏi lý do + minh chứng, tạo ticket | Quản lý xác nhận 1 chạm → Thanh tra duyệt hàng loạt | Hỗ trợ | HRM (công) | 2 | |
| 5.3 | Đăng ký OT | Hiểu câu chat, kiểm tra hạn mức ngày/tháng/năm, chặn nếu vượt, hiện hệ số | Quản lý trực tiếp | Quy tắc | HRM (OT) | 2 | |
| 5.4 | Nghỉ phép | Hiểu câu chat, kiểm tra số dư, tạm giữ, trả lại khi bị từ chối/hủy | Quản lý trực tiếp | Quy tắc | HRM (phép) | 2 | |
| 5.5 | SLA và leo thang | Không dùng AI: tính hạn, nhắc trước hạn, quá hạn thì leo thang | Người có thẩm quyền | Quy tắc | — | 2 | |
| 6.1 | Lộ trình cá nhân | Tổng hợp bằng chứng năng lực, chỉ gap, đề xuất roadmap học + thực hành + đánh giá lại | NV tự quyết; Lead xác nhận nếu Lead giao | Lõi | LMS, HRM | 3 | |
| 6.2 | Kế hoạch đào tạo tổ chức | Agent: từ mục tiêu/KPI → năng lực cần có → kế hoạch; tìm khóa có sẵn trong LMS | Leader/L&D duyệt | Lõi | LMS | 3 | |
| 6.3 | Tạo nội dung | Từ tài liệu nguồn → outline → bài học + câu hỏi có trích nguồn; nguồn đổi thì chỉ phần cần sửa | Chuyên gia rà soát, người duyệt xuất bản | Lõi | LMS | 2 | |
| 6.4 | AI Tutor | Hỏi đáp trong khóa học có nguồn, đề xuất bài luyện; tắt khi làm bài thi chính thức | — | Lõi | LMS | 2 | |
| 6.5 | Đánh giá năng lực | Sinh nháp đề, đáp án, rubric; nhận xét bài tự luận; phân tích đạt/chưa đạt | Chuyên gia duyệt đề; người chấm xác nhận | Lõi | LMS | 2 | |
| 6.6 | Sẵn sàng vào dự án | Phân tích phần thiếu, đề xuất học bổ sung; chuyển dự án được kế thừa điều kiện | Lead xác nhận active | Hỗ trợ | LMS, HRM | 2 | |
| 6.7 | Khung năng lực | Đề xuất nhóm năng lực, mô tả theo 4 cấp, chỉ chỗ trùng/mâu thuẫn giữa các đơn vị | L&D/HR duyệt | Lõi | — | 3 | |
| 6.8 | Đánh giá theo kỳ | Tổng hợp bằng chứng, gợi ý mức, chỉ chênh lệch giữa tự đánh giá và đánh giá của Lead | Lead xác nhận; HR cân chỉnh | Hỗ trợ | HRM (KPI), LMS | 3 | |
| 6.9 | Dashboard nhân tài | Heatmap, radar, 9-Box, so sánh đơn vị; AI tóm tắt điểm đáng chú ý | Người có thẩm quyền | Hỗ trợ | Kết quả 6.8 | 3 | |

**Theo mức AI:** Lõi 16 · Hỗ trợ 8 · Quy tắc 4.

---

## 4. Chi tiết từng module

### M1 — Tuyển dụng và tái bố trí (5 use case, 23 stories)

**Mục tiêu:** giảm 70% thời gian tìm hồ sơ (là kỳ vọng, chưa đo baseline), dùng lại kho CV cũ thay vì mua gói lọc CV bên ngoài.

```text
1.1 JD → CV
Recruiter chọn JD đã duyệt ─► AI quét kho CV ─► Điểm 0–100 + giải thích ─► Recruiter chọn shortlist ─► M2
                                                     └─ tùy chọn: so sánh 2–5 người (1.4), xác minh hồ sơ (1.5)

1.2 CV → JD
Tải CV (cổng việc làm / chat) ─► AI bóc tách ─► ghép với JD đang tuyển ─► Top JD + điểm mạnh + gap
   ├─ Ứng viên: Ứng tuyển 1 chạm ─► pipeline
   ├─ Recruiter: Gán vào vị trí ─► pipeline
   └─ Nhân viên: xem cơ hội luân chuyển nội bộ

1.3 Tái bố trí
HR chọn đơn vị giải thể ─► AI tổng hợp hồ sơ NV ─► ghép vị trí/dự án đang mở ─► 3 nhóm
   ├─ ≥70%   : chuyển vị trí tương đương
   ├─ 50–69% : chuyển kèm upskill 2–4 tuần (M6)
   └─ <50%   : HR tư vấn chính sách hỗ trợ (không tự cho nghỉ)
─► Recruiter duyệt, tạo phiếu chuyển ─► Manager đơn vị nhận xác nhận
```

- Điểm: kỹ năng bắt buộc 50%, kinh nghiệm 25%, kỹ năng bổ trợ 15%, học vấn/chứng chỉ 10%. Prototype tính điểm thật theo công thức này.
- Ứng tuyển chỉ đưa hồ sơ vào pipeline; Recruiter vẫn phải chọn shortlist rồi mới sang M2.
- Còn cần chốt: lương ngân sách có hiện cho ứng viên bên ngoài không; điểm nằm ở biên (69,5%) thuộc nhóm nào; ngưỡng khoảng trống timeline bao nhiêu thì coi là bất thường.

### M2 — Đánh giá và phỏng vấn (3 use case, 15 stories)

**Nguyên tắc:** người thật phỏng vấn người thật; không dùng bot hay avatar AI.

```text
Shortlist ─► 2.1 AI sinh bài theo JD + CV ─► Ứng viên làm bài ─► AI chấm theo rubric ─► Báo cáo xác minh
                                                                (kỹ năng đã xác minh, gap, rủi ro)
Recruiter ─┬─ Phỏng vấn ─► 2.2 AI soạn câu hỏi STAR + tình huống + rubric 5 mức ─► gắn vào lịch hội đồng
           ├─ Đánh giá bổ sung
           └─ Dừng hồ sơ

2.3 Phỏng vấn ─► Interviewer nhập ghi chú/transcript ─► AI gợi ý điểm ─► Interviewer sửa và xác nhận
   ─► Hệ thống tổng hợp các giám khảo (lệch > 2.0 ─► VARIANCE_FLAG ─► hội ý)
   ─► AI báo cáo hợp nhất HIRE / NO_HIRE ─► Hội đồng quyết ─► HR làm offer
   ─► Ứng viên nhận offer + HR xác nhận tiếp nhận ─► M3     (từ chối offer ─► xét người kế tiếp)
```

- Còn cần chốt: vị trí không phải lập trình thì dùng loại bài nào; ứng viên quá hạn chưa nộp thì gia hạn hay dừng.

### M3 — Onboarding (3 use case, 16 stories)

```text
Đủ 3 điều kiện ─► AI gợi ý checklist theo loại NV ─► HR chỉnh, xác nhận ─► tạo tài khoản cổng tiếp nhận
                                                                           │
          ┌──────────────────────────────┬─────────────────────────────────┴───────────────┐
          ▼                              ▼                                                 ▼
 3.2 Hồ sơ nhân sự             3.1 Thủ tục các bộ phận                         3.3 Đào tạo hội nhập
 NV tải giấy tờ ─► OCR         HR: hợp đồng · IT: email, quyền                 LMS giao khóa ─► học
 ─► đối chiếu M1 + lời khai    Admin: thiết bị, thẻ · Manager: mentor          ─► bài kiểm tra ─► AI chỉ phần
 ─► báo thiếu/sai ─► HR        AI nhắc việc trễ hạn                            chưa đạt, đề xuất học bổ sung
          └──────────────────────────────┴─────────────────────────────────┬───────────────┘
                                                                           ▼
             AI tổng hợp 5 điều kiện (hồ sơ, hợp đồng, tài khoản/thiết bị, học xong, đạt bài)
             ─► HR xác nhận hoàn tất ─► Lead xác nhận sẵn sàng ─► active theo dự án, đồng bộ HRM
```

- Phần nào chưa đạt thì chỉ quay lại làm phần đó, không làm lại cả checklist.
- Tài khoản cổng tiếp nhận tách khỏi tài khoản nội bộ của công ty.

### M4 — Nghỉ việc và bàn giao (3 use case, 14 stories)

```text
HRM có quyết định nghỉ (từng người hoặc theo đợt)
   ├─► Bàn giao công việc
   │     NV cung cấp công việc, tài liệu, tồn đọng ─► 4.1 AI soạn nháp ─► Manager chốt phạm vi, người nhận
   │     ─► NV cập nhật bằng chứng ─► 4.2 AI rà soát thiếu/mâu thuẫn ─► người nhận xác nhận hoặc yêu cầu làm lại
   │     ─► Manager xác nhận hoàn tất bàn giao
   └─► Thủ tục các bộ phận: HR / IT (thu quyền) / Admin (tài sản) / Finance (đối soát) cập nhật trạng thái + bằng chứng
                          ▼
   4.3 AI báo cáo theo người/đợt/đơn vị (xem được bất cứ lúc nào) ─► HR yêu cầu xử lý tồn đọng ─► HR đóng hồ sơ ─► HRM
```

- AI không xác nhận tài sản đã thu hay tài khoản đã khóa chỉ dựa vào mô tả; việc đó cần bộ phận phụ trách xác nhận.
- Ngày nghỉ có hiệu lực, ngày thu hồi quyền và ngày đóng hồ sơ là ba mốc riêng.

### M5 — Chatbot HR (5 use case, 23 stories)

```text
Nhân viên chat ─┬─ 5.1 Hỏi chính sách ─► RAG ─► trả lời + trích dẫn (tên văn bản, số, điều) | không có ─► chuyển HR
                ├─ 5.2 Giải trình công ─► bot đọc log ─► hỏi lý do + minh chứng ─► ticket
                │      ─► Quản lý xác nhận 1 chạm ─► Thanh tra duyệt hàng loạt (5 ngày cuối tháng)
                │      ─► công LOCKED ─► VERIFIED          (từ chối ─► giữ LOCKED, báo lý do)
                ├─ 5.3 OT ─► kiểm tra ≤4h/ngày (tổng ≤12h), ≤40h/tháng, ≤200h/năm (300h ngành đặc thù)
                │      ─► vượt: chặn, nêu lý do | hợp lệ: hệ số 150%/200%, tạo phiếu ─► Quản lý duyệt ─► HRM
                └─ 5.4 Nghỉ phép ─► kiểm tra số dư ─► không đủ: báo, gợi ý loại nghỉ khác
                       ─► đủ: tạm giữ ─► Quản lý duyệt ─► trừ phép, cập nhật lịch vắng | từ chối/hủy: trả lại

5.5 SLA chạy kèm cả 3 loại đơn: mặc định 2 giờ (cấu hình theo loại đơn/đơn vị) ─► nhắc ở phút 90
    ─► quá hạn: SLA_BREACHED, leo thang (Trưởng khối/Thanh tra) ─► người có thẩm quyền quyết; không tự duyệt
```

- Hủy đơn phép sau khi đã duyệt phải tạo yêu cầu thay đổi và được duyệt lại.
- Còn cần chốt: log cho thấy không thiếu lượt chấm thì xử lý thế nào; SLA tính theo giờ hành chính hay liên tục.

### M6 — Đào tạo và phát triển (9 use case, 48 stories, 37 tính năng, 15 màn hình)

Bối cảnh từ trước: công ty đang trả phí Articulate 360 và nhóm được giao làm phần thay thế. Vì vậy M6 có trình soạn khóa học, thư viện, review và cổng học tương tự Articulate.

```text
Bốn điểm bắt đầu:
 6.1 NV/Lead đặt mục tiêu ─► AI gom bằng chứng, chỉ gap ─► roadmap (riêng tư nếu NV tự khám phá)
 6.2 Giám đốc/L&D nhập KPI ─► AI: năng lực cần có ─► kế hoạch ─► tìm khóa trong LMS ─► duyệt ─► giao học
 6.3 Tài liệu nguồn ─► AI outline ─► người tạo chỉnh ─► AI soạn bài + câu hỏi ─► chuyên gia rà soát ─► xuất bản
 6.6 Được giao chương trình (onboarding M3, chuyển dự án, upskill từ M1)
                │
                ▼
 Học trên LMS (6.4 AI Tutor khi hỏi) ─► 6.5 bài đánh giá đã duyệt ─► đạt / chưa đạt / chưa đủ bằng chứng
   ├─ chưa đạt: học bổ sung, làm lại theo số lượt cấu hình (hết lượt ─► người phụ trách xử lý)
   └─ đạt: gửi M3/HRM ─► Lead xác nhận sẵn sàng; kỹ năng đã xác nhận chia sẻ cho M1

Chu kỳ năng lực (GĐ 3):
 6.7 Khung năng lực (AI đề xuất, L&D duyệt) ─► 6.8 Kỳ đánh giá: tự đánh giá + Lead đánh giá + cân chỉnh
 ─► 6.9 Dashboard: heatmap, radar, 9-Box ─► tạo kế hoạch 6.2 hoặc xem ứng viên nội bộ 1.3
```

Tính năng theo nhóm (theo features-and-screens):

| Nhóm | Tính năng chính | Mức ưu tiên của nhóm |
|---|---|---|
| Tạo nội dung | Prompt + tài liệu → khóa học; outline trước khi viết; trình soạn Course → Lesson → Block; AI viết lại/rút gọn từng khối; trích nguồn; thư viện; phiên bản | Cần: F1, F2, F5, F6, F8, F9 |
| Review | Nháp → Chờ rà soát → Đã duyệt → Xuất bản; góp ý theo khối; cộng tác | Cần: F12, F13 |
| Giao học | Giao theo người/nhóm/vai trò/dự án; lộ trình; cổng học | Cần: F15, F17 |
| Hỗ trợ học | AI Tutor có nguồn; đề xuất bài luyện | Cần: F18 |
| Đánh giá | Ngân hàng câu hỏi; AI sinh đề + rubric; cấu hình điểm đạt/số lượt; chấm; kết quả theo tiêu chí | Cần: F20–F24 |
| Báo cáo, quyền | Báo cáo học; gửi kết quả sang M3/HRM; quyền dùng AI theo nhóm | Cần: F25–F27 |
| Năng lực, nhân tài | Khung năng lực; kỳ đánh giá; heatmap; 9-Box; AI tóm tắt | Cần: F30–F32, F34 |

- Nguyên tắc: học xong không có nghĩa là đạt năng lực; KPI thấp chỉ là tín hiệu, không kết luận thiếu kỹ năng; 9-Box và mức tiềm năng chỉ để tham khảo, AI không xếp loại nhân viên; nhóm dưới ngưỡng (ví dụ 5 người) chỉ hiện số tổng hợp.
- Còn cần chốt: số cấp và tên cấp bậc (đang giả định Junior, Professional, Senior, Expert); chu kỳ đánh giá; thang tiềm năng; ai được xem 9-Box.

---

## 5. Vấn đề phát hiện khi đọc

### 5.1 Lệch giữa các tài liệu

| # | Vấn đề | Chỗ |
|---|---|---|
| 1 | README ghi 28 UC và 139 stories, nhưng bảng UC chỉ có 26 dòng (thiếu 6.7–6.9) và phần stories ghi "toàn bộ 123 stories" (thiếu 16 story của 6.7–6.9) | README mục 3–4 |
| 2 | Bảng giai đoạn trong README không có 6.7–6.9; scope-prd thì có | README mục 5 |
| 3 | Requirements dùng tác nhân RECRUITER, HR_ADMIN, INTERVIEWER…; prototype gộp còn 8 vai | requirements ↔ prototype |
| 4 | "Không xây lại LMS", nhưng M6 có trình soạn, thư viện, ngân hàng câu hỏi, giao học, cổng học, tức là gần như dựng một LMS/authoring tool | scope-prd ↔ M6 |
| 5 | "Quy trình đánh giá hiệu suất nằm ngoài phạm vi", nhưng 6.8 có mở kỳ, tự đánh giá, Lead chấm, cân chỉnh, xếp tiềm năng; thực chất gần giống một kỳ review | scope-prd ↔ 6.8 |

### 5.2 Chồng chéo chức năng

| Cặp | Trùng ở đâu |
|---|---|
| 1.5 ↔ 3.2 | Cả hai đều xác minh hồ sơ và giấy tờ |
| 2.1 ↔ 6.5 | Hai bộ máy sinh đề + rubric + chấm (một cho tuyển dụng, một cho LMS) |
| 3.3 ↔ 6.6 | Cùng mô tả bước đào tạo hội nhập → đạt → Lead xác nhận active |
| 1.3 ↔ 6.9 | Cả hai đều gợi ý ứng viên nội bộ |

### 5.3 Điểm nghiệp vụ nên xem lại

| # | Điểm | Vì sao |
|---|---|---|
| 1 | 5.2 vẫn đi Quản lý xác nhận → Thanh tra duyệt hàng loạt, SLA 2 giờ | Theo thông tin mentor đưa trước đây, ticket dồn cuối tháng chủ yếu do quản lý lỡ cửa sổ duyệt 2 giờ. Bản nhóm chỉ giúp Thanh tra duyệt nhanh hơn, chưa giảm số ticket |
| 2 | 5.3 chỉ có hệ số 150% và 200% | Thiếu OT ngày lễ (300%) và OT ban đêm; số liệu pháp lý cần HR/pháp chế xác nhận |
| 3 | 5.4 ví dụ "tạm giữ 1 ngày" | Chưa nói nghỉ nửa ngày hay nhiều ngày liền |
| 4 | 5.2 chỉ duyệt hàng loạt trong "5 ngày cuối tháng" | Chưa nói ngoài khoảng đó thì ticket xử lý thế nào |
| 5 | 2.3 cờ khi lệch > 2.0 trên thang 5 | Hai giám khảo chấm 2 và 4 vẫn không bị gắn cờ; ngưỡng có thể quá lỏng |
| 6 | 2.1 có coding challenge | Hệ thống phục vụ mọi vị trí, không chỉ IT (đang [Cần chốt]) |
| 7 | 1.5 | Chưa có nguồn danh sách trường được công nhận hay API xác thực chứng chỉ, nên khó làm thật |
| 8 | 6.8–6.9 (mức tiềm năng, 9-Box) | Là dữ liệu nhạy cảm về người lao động; cần xét rủi ro theo Luật Bảo vệ dữ liệu cá nhân và Luật AI trước khi đưa vào demo |
| 9 | Toàn bộ | Brief viết chung là "Tập đoàn IT", chưa gắn với hệ thống thật của Vin Smart Future (HRM nào, LMS nào, có API không); 17 câu khảo sát HRM/LMS đều chưa có câu trả lời |

---

## 6. Gợi ý khi chọn scope cho project riêng

Đây chỉ là gợi ý để tham khảo khi điền cột **Giữ?**:

- **AI là giá trị chính và dễ demo trên dữ liệu giả:** 1.1, 1.2, 2.2, 2.3, 3.2, 4.1, 5.1, 6.3, 6.4.
- **Thấy rõ tích hợp với hệ thống HR (đọc/ghi HRM):** 5.2, 5.3, 5.4 qua chat, cộng với 3.2 ghi hồ sơ vào HRM.
- **Nên bỏ hoặc để sau:** 5.5 và 1.5 (gần như không có AI); 6.7–6.9 (cần khung năng lực, dữ liệu nhạy cảm, GĐ 3); 1.4 (chỉ là bảng hiển thị từ 1.1).
- **Nên gộp khi làm riêng:** 1.5 vào 3.2; 3.3 vào 6.6; 2.1 với 6.5 dùng chung một bộ sinh đề.

**Bước tiếp theo:** bạn điền cột Giữ? → mình viết tài liệu scope cho hrm-an (tính năng, luồng, use case, user story) theo đúng phần đã chọn.
