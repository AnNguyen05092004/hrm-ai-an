# Rà soát UI/UX và so sánh với Articulate 360

Cập nhật 19/11/2026 (lần 2, sau khi bổ sung ảnh, giao diện khóa, khối và dạng câu mới, tích hợp). Rà trên bản chạy thật (nhánh `feat/lms-app`), cả hai vai.

## 1. Cấu trúc từ trên xuống

```
Khóa học (bộ đào tạo)
├── Tài liệu nhanh   (bài học + bài luyện tập cuối)
├── Bộ slide
├── Tình huống
├── Video
├── Hướng dẫn từng bước
└── Đề kiểm tra      (đề riêng, thi chính thức, giám sát)
```

| Màn | Người soạn | Người học |
|---|---|---|
| Danh sách | Thư viện → Khóa học | Khóa học của tôi (thẻ theo khóa, tiến độ gộp) |
| Một khóa | Trang khóa: các tài liệu theo thứ tự học, Chia sẻ cả khóa, Thêm tài liệu, Tạo đề kiểm tra | Trang khóa: các phần theo thứ tự, trạng thái từng phần, nút "Học tiếp" |
| Một tài liệu | Trình soạn riêng cho từng loại | Trình học, quay lại trang khóa |
| Chia sẻ | Từng tài liệu hoặc cả khóa (xuất bản hàng loạt, giao cả khóa, đường dẫn cả khóa) | Mở bằng giao khóa hoặc đường dẫn |
| Số liệu | Phân tích gom theo khóa, dòng con theo tài liệu | Bài thi của tôi |

Đã sửa trong đợt này để thống nhất:
- Đổi "bộ đào tạo" thành "khóa học" ở mọi màn hình (người soạn và người học dùng chung một từ).
- Người học không còn thấy tài liệu rời: mọi thứ gom theo khóa, mở khóa mới thấy các phần.
- Thứ tự tài liệu giống nhau ở trang khóa của người soạn, trang khóa của người học và Phân tích.
- Nút quay lại từ trình học và trang thi đưa về trang khóa.
- Phân tích gom theo khóa.

## 2. Còn chưa thống nhất (nhỏ)

| Chỗ | Vấn đề | Đề xuất |
|---|---|---|
| Chấm bài | Không có thanh tên công ty như các màn khác | Thêm thanh trên cùng cho đồng bộ |
| Xem trước đề kiểm tra | Chỉ có thông báo, chưa xem được đề mẫu | Thêm "Xem thử một đề" rút ngẫu nhiên từ câu đã duyệt |
| Giao khóa | Tài liệu xuất bản sau khi đã giao cả khóa phải giao thêm | Lưu "giao theo khóa" để tài liệu mới tự giao |
| Bài luyện tập trong Tài liệu nhanh và Đề kiểm tra | Cùng trình soạn, khác tên gọi | Giữ: tên "Luyện tập" / "Đề kiểm tra" đã phân biệt mục đích |

## 3. So với Articulate 360

Nguồn: [Articulate Q1 2026](https://www.articulate.com/blog/articulate-feature-release-whats-new-in-q1-2026/), [Q2 2026](https://www.articulate.com/blog/announcing-new-articulate-features-q2-2026/), [AI Assistant Rise/Storyline](https://www.articulatesupport.com/article/AI-Assistant-Storyline-360-and-Rise-360-Features), [Roadmap](https://www.articulatesupport.com/article/Articulate-360-Feature-Roadmap).

### Mình hơn

| Điểm | LMS này | Articulate |
|---|---|---|
| Bám nguồn | Mọi khối và câu hỏi gắn đoạn nguồn; chỗ thiếu căn cứ được đánh dấu | AI soạn từ tài liệu nhưng không gắn nguồn từng đoạn |
| Nguồn đổi | Tải bản mới, chỉ ra đúng bài/slide/câu hỏi bị ảnh hưởng | Không có |
| AI Tutor | Trả lời từ nội dung đã xuất bản, nhảy tới bài/phút video, tắt khi thi | Không có trong khóa |
| Thi | Đề riêng từ ngân hàng, giám sát có đồng ý, bài code chạy cách ly, AI chấm nháp tự luận | Quiz cơ bản, chấm tự động trắc nghiệm |
| Năng lực | Thi đạt cập nhật mức kỹ năng; KPI → khoảng cách → giao khóa; trợ lý giám đốc | Không có (cần LMS khác) |
| Video AI | Slide + giọng AI → MP4 có phụ đề, dựng lại từng đoạn | Có giọng đọc AI, không dựng video từ slide |

### Đã bù trong lần này

| Trước đây thiếu | Đã có |
|---|---|
| Xuất SCORM để đưa khóa sang LMS khác | Gói SCORM 1.2 cho cả khóa, cùng giao diện học, ghi hoàn thành/điểm/học dở; thêm xAPI và webhook ([INTEGRATION.md](INTEGRATION.md)) |
| Tải ảnh, thư viện ảnh, AI tạo ảnh | Ảnh có sẵn, tải ảnh lên, AI tạo ảnh; ảnh vào cả video |
| Câu ghép cặp, sắp thứ tự, kéo thả | Có cả ba, chấm tự động từng phần, thao tác bằng chuột hoặc bấm chọn (dùng được trên điện thoại) |
| Khối tab, timeline, ảnh có chú thích | Có, kèm khối luyện tập kéo thả; AI soạn được |
| Giao diện riêng từng khóa | Màu nhấn, font, ảnh bìa |

### Còn thua (xếp theo mức ảnh hưởng)

| # | Thiếu | Articulate có | Mức |
|---|---|---|---|
| 1 | Góp ý của người duyệt trên bản nháp (comment từng khối, trạng thái duyệt) | Review 360 | Cao cho quy trình chuyên gia duyệt |
| 2 | Chứng chỉ hoàn thành, nhắc hạn qua email | Reach 360 | Trung bình |
| 3 | Hướng dẫn từng bước từ quay màn hình | Có | Trung bình |
| 4 | Thư viện ảnh/biểu tượng/nhân vật có sẵn lớn | Content Library 360 | Thấp–trung bình |
| 5 | Dịch khóa sang ngôn ngữ khác | Localization | Thấp (nội bộ dùng tiếng Việt) |
| 6 | Sửa toàn khóa bằng chat AI (giọng văn, đối tượng) | Beta 2026 | Thấp: đã sửa được từng khối/slide |
| 7 | SCORM 2004, cmi5, LTI | Có | Thấp: làm khi LMS công ty yêu cầu |
| 8 | Nhiều người soạn cùng lúc, phân quyền chi tiết | Có | Thấp (phạm vi 2 vai) |

### Nên làm tiếp (theo thứ tự)

1. Góp ý của người duyệt trên bản nháp (đúng BR "chuyên gia duyệt" của spec).
2. Chứng chỉ khi hoàn thành khóa, nhắc hạn qua email.
3. SSO công ty và LTI 1.3 (cần IT công ty cung cấp thông tin).
