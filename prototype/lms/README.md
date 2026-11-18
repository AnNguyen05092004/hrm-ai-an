# Prototype LMS: soạn khóa học bằng AI

Giao diện và luồng thao tác dựa trên Articulate 360 Frontline, ghép thêm các tính năng trong [lms-specs.md](../../docs/modules/lms/lms-specs.md). Không dùng tên, logo của Articulate hay của công ty; ảnh minh họa lấy từ Unsplash (cần mạng).

## Chạy

```bash
npm install
npm run dev        # mở http://localhost:5173
```

Dữ liệu lưu trong trình duyệt. Bấm **Đặt lại dữ liệu mẫu** ở cuối thanh bên để quay về ban đầu.

## Vai trò

Bấm tên người dùng ở cuối thanh bên để đổi vai:

| Vai | Người mẫu | Thấy gì |
|---|---|---|
| Người tạo khóa học (Giám đốc Kỹ thuật) | Nguyễn An | Trang chủ, Thư viện, Năng lực đội ngũ, Phân tích, Chấm bài, Cài đặt; soạn, chia sẻ, chấm bài, lập kế hoạch đào tạo theo KPI |
| Người học | Phạm Thu Hà | Khóa học của tôi (khóa được giao, tiến độ, hạn, mục tiêu kỹ năng), bài thi của tôi; học và hỏi AI Tutor |

Không có vai duyệt và bước gửi duyệt. Mở màn không thuộc vai thì tự về trang chính của vai đó.

## Luồng demo

Kịch bản test chi tiết (9 chủ đề mẫu cho luồng tạo bằng AI, 13 kịch bản, kết quả mong đợi): [KICH-BAN-DEMO.md](KICH-BAN-DEMO.md).

1. **Trang chủ** → bấm "Dùng ví dụ mẫu" → **Bắt đầu**.
2. **Chi tiết**: sửa đối tượng, mục tiêu, chỉ số; gắn kỹ năng + mức (nối Talent); rà kế hoạch tài liệu, thêm/xóa tài liệu.
3. **Dàn ý**: bấm vào dàn ý để sửa, nút ✦ để sửa bằng AI → **Tạo N tài liệu**.
4. **Bộ đào tạo**: tài liệu được tạo dần; banner "tài liệu nguồn có bản mới"; Dịch; AI sửa hàng loạt.
5. Mở từng tài liệu:
   - **Tài liệu nhanh**: danh sách bài → sửa bài theo khối (thanh công cụ khối, thư viện khối, công cụ AI, nguồn trích, chỗ thiếu căn cứ).
   - **Bài kiểm tra**: loại bài (luyện tập/thi chính thức), mức, điểm đạt, lượt, giám sát; chọn câu đưa vào ngân hàng đề; sinh câu bằng AI; tự luận có rubric, bài code có test case.
   - **Tình huống**: sơ đồ cảnh, thêm thẻ, Trải nghiệm, Xem trước dạng chat.
   - **Bộ slide**: slide, ghi chú người trình bày, trình chiếu, tạo video từ slide.
   - **Video tương tác**: video AI tạo, chương, điểm kiểm tra, lời thoại, tạo lại từng đoạn.
6. **Chia sẻ**: bản nháp → Chia sẻ → Tạo đường dẫn / Giao theo nhóm (không có bước gửi duyệt).
7. **Xem trước** (người học): đổi thiết bị; **Hỏi AI Tutor** (trả lời kèm nguồn, nhảy tới bài/phút video, chỉ học phần cần, câu ngoài tài liệu thì nói không tìm thấy); bài thi có màn đồng ý giám sát, Tutor tắt khi thi.
8. **Chấm bài**: trắc nghiệm code chấm, tự luận AI chấm nháp theo rubric, xử lý cờ giám sát rồi mới xác nhận; đạt thì gửi sang Quản trị nhân tài.
9. **Phân tích**: số người xem, hoàn thành; câu hỏi Tutor chưa trả lời được.

## Cấu trúc

```
src/
├── data.js            dữ liệu mẫu chính (Docker Volume, nghỉ phép, bài nộp, ảnh)
├── data-more.js       4 bộ thêm: An toàn thông tin, Phản hồi 1-1, SQL, Chăm sóc khách hàng
├── gen.js             "AI" giả lập sinh chi tiết, dàn ý, tài liệu
├── data-team.js       Đội mẫu, khung năng lực theo vị trí, KPI (trang Năng lực đội ngũ)
├── pages/Advisor.jsx  Trợ lý AI cho giám đốc trên trang Năng lực đội ngũ
├── edit.jsx           Sửa tại chỗ (Editable, EditableList) dùng cho mọi màn soạn
├── tutor.js           AI Tutor giả lập: tìm trong nội dung khóa, câu hỏi chung, chặn câu thi
├── presets.js         10 chủ đề mẫu cho luồng tạo bằng AI (CI/CD, model AI, cloud, agent, yêu cầu nghiệp vụ, Docker, bán hàng, công tác phí, hội nhập, kho)
├── store.jsx          state + localStorage
├── ui.jsx, blocks.jsx thành phần dùng chung, khối nội dung bài học
├── Shell.jsx          thanh bên
└── pages/
    ├── Dashboard.jsx      trang chủ
    ├── KitFlow.jsx        Chi tiết → Dàn ý
    ├── KitPage.jsx        trang bộ đào tạo
    ├── Common.jsx         thanh trên, Chia sẻ, AI, Giao diện, Phiên bản
    ├── CourseEditor.jsx   Tài liệu nhanh + Bài kiểm tra
    ├── OtherEditors.jsx   Tình huống, Slide, Video, Hướng dẫn
    ├── Preview.jsx        người học: khóa học, AI Tutor, thi, video
    ├── Lists.jsx          Thư viện, Phân tích, Chấm bài, Cài đặt
    └── Roles.jsx          Khóa học của tôi (người học)
```

Chưa làm: Hướng dẫn từng bước chỉ có bản xem; trợ lý giám đốc và AI Tutor hiểu câu hỏi bằng từ khóa, chưa gọi mô hình thật.
