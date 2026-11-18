# Kịch bản demo và test

Trước khi demo: bấm **Đặt lại dữ liệu mẫu** ở cuối thanh bên. Đổi vai: bấm tên người dùng ở cuối thanh bên.

## Dữ liệu mẫu có gì

| Bộ đào tạo | Nội dung | Trạng thái nổi bật |
|---|---|---|
| Docker Volume cơ bản | Tài liệu nhanh, Tình huống, Slide, Video | Thi chính thức có giám sát; tài liệu nguồn có bản mới |
| Nghỉ phép cho nhân viên mới | Tài liệu nhanh, Hướng dẫn | Đã chia sẻ, nhiều người xem |
| An toàn thông tin cho mọi nhân viên | Tài liệu nhanh, Video, Tình huống, Slide | Khóa bắt buộc; thi không giám sát; đổi máy lẻ IT ảnh hưởng 4 chỗ |
| Phản hồi 1-1 cho trưởng nhóm mới | Tình huống, Tài liệu nhanh (luyện tập), Slide | Kỹ năng mềm, đã chia sẻ |
| SQL cho phân tích dữ liệu | Tài liệu nhanh (nháp), Hướng dẫn, Slide (nháp) | Câu hỏi chưa vào ngân hàng đề, bài code |
| Chăm sóc khách hàng qua điện thoại | Tình huống (nháp), Hướng dẫn (nháp) | Bộ đang soạn dở |

Bài nộp: 9 bài, gồm chờ chấm có cờ giám sát, chờ chấm không cờ, đạt, chưa đạt.

Không có bước gửi duyệt: người tạo khóa rà bản nháp rồi bấm Chia sẻ là người học thấy.

## Vai người tạo khóa học (Nguyễn An)

### Phần chính: tạo bộ đào tạo bằng AI (10 chủ đề mẫu)

Ở Trang chủ, dưới ô mô tả có hàng thẻ **Thử nhanh với chủ đề mẫu** (cuộn ngang hoặc bấm mũi tên ‹ ›). 5 chủ đề công nghệ / BA nằm đầu. Bấm một thẻ: mô tả mục tiêu và tệp nguồn được điền sẵn.

| Chủ đề | Tệp nguồn | AI tạo ra | Nên khoe |
|---|---|---|---|
| CI/CD từ commit tới production (DevOps) | PDF quy trình + file pipeline YAML | Tài liệu nhanh, Tình huống, Slide, Video | Thi chính thức có giám sát + câu code; tình huống "Pipeline đỏ hai giờ trước release" với tech lead |
| Triển khai model AI tối ưu chi phí (AI / MLOps) | PDF hướng dẫn + bảng chi phí GPU | Tài liệu nhanh, Tình huống, Slide, Video | Bảng phân rã chi phí, 5 kỹ thuật giảm chi phí; tình huống "Hóa đơn GPU tăng gấp ba" trình bày với quản lý |
| Cloud: sẵn sàng cao, bảo mật, chi phí (Cloud) | PDF landing zone + video quay màn hình | Tài liệu nhanh, Hướng dẫn từng bước, Slide | Thẻ chi phí bắt buộc (Terraform), hướng dẫn tạo cảnh báo ngân sách |
| Xây AI agent an toàn (AI agent) | PDF nguyên tắc + báo cáo đánh giá | Tài liệu nhanh, Tình huống, Slide, Video | Ma trận quyền, prompt injection; tình huống thuyết phục PM giữ bước xác nhận |
| Viết yêu cầu nghiệp vụ rõ ràng (BA / PM) | PDF khung viết yêu cầu + thống kê change request | Tài liệu nhanh, Tình huống, Slide | User story + tiêu chí chấp nhận; tình huống giữ phạm vi với khách |
| Docker volume (Kỹ thuật) | PDF + DOCX | Tài liệu nhanh, Tình huống, Slide, Video | Thi chính thức có giám sát, nguồn trích từng khối |
| Tư vấn bán hàng khi khách chê giá (Bán hàng) | PDF + ghi âm cuộc gọi | Tình huống, Tài liệu nhanh, Slide, Video | Luyện hội thoại với Chị Thảo; slide có số liệu, trích lời khách |
| Thanh toán công tác phí (Quy trình) | PDF + video quay màn hình | Hướng dẫn từng bước, Tài liệu nhanh, Video | Hướng dẫn có ảnh từng bước; video quay màn hình được chia chương |
| Tuần đầu của nhân viên mới (Hội nhập) | PDF + bảng lịch | Slide chào mừng, Video, Tài liệu nhanh, Tình huống | Slide 6 kiểu bố cục; video AI đọc |
| An toàn khi làm việc trong kho (An toàn) | PDF + video huấn luyện | Tài liệu nhanh, Tình huống, Video | Bài thi chính thức 80%; tình huống nhắc nhở trưởng ca |

**KB1. Tạo bộ đào tạo từ chủ đề mẫu**
1. Bấm một thẻ chủ đề → **Bắt đầu**.
2. Màn AI đang soạn: đọc từng tệp nguồn → xác định người học → viết mục tiêu → đề xuất tài liệu.
3. **Chi tiết**: sửa đối tượng, mục tiêu, chỉ số; gắn kỹ năng + mức; thêm hoặc xóa tài liệu trong kế hoạch.
4. **Dàn ý**: bấm vào một dàn ý để sửa, bấm ✦ để sửa bằng AI. Với Tài liệu nhanh, bạn đổi tên bài, sửa ý chính (mỗi dòng một ý), **Thêm bài**, xóa bài hoặc đổi thứ tự (↑ ↓) → **Xong** → **Tạo N tài liệu**. Bài mới thêm được AI dựng khung, phần nguồn chưa có thì để trống.
5. Mở từng tài liệu vừa tạo:
   - Slide: bìa ảnh, số liệu lớn, trích dẫn, ảnh + ý chính, bảng, các bước.
   - Video: mỗi chương là một slide, có phụ đề, giọng AI, điểm kiểm tra.
   - Tình huống: bấm Xem trước để chat với nhân vật.

Kết quả: dàn ý và bản nháp khớp nhau; bộ mới nằm đầu Thư viện, mọi tài liệu ở trạng thái Bản nháp.

**KB2. Tự gõ mục tiêu**
- Gõ mô tả có từ khóa của một chủ đề (ví dụ "pipeline", "GPU", "cloud", "agent", "khách chê giá"): AI dùng đúng chủ đề đó.
- Gõ chủ đề khác hẳn: AI soạn khung chung và ghi rõ chỗ thiếu căn cứ, không tự bịa nội dung.

**KB3. Tài liệu nguồn đổi phiên bản**
1. Thư viện → **An toàn thông tin cho mọi nhân viên**.
2. Bấm vào banner "Tài liệu nguồn đã có bản mới".

Kết quả: liệt kê 4 chỗ bị ảnh hưởng (bài học, tình huống, câu thi, slide).

**KB4. Chia sẻ**
1. Mở một bản nháp, ví dụ **JOIN và GROUP BY cho báo cáo bán hàng**.
2. **Chia sẻ** → **Tạo đường dẫn**.

Kết quả: trạng thái chuyển Bản nháp → Đang chia sẻ, có đường dẫn để sao chép.

**KB5. Ngân hàng đề**
1. Mở cùng khóa SQL → mục **Bài kiểm tra**.
2. Câu tự luận và câu code chưa vào đề → bấm **Thêm vào ngân hàng đề**.

Kết quả: số câu trong ngân hàng đề tăng lên.

**KB6. Chấm bài có cờ giám sát**
1. Chấm bài → **Bùi Thanh Tâm** (khóa Docker, 2 cờ).
2. Thử bấm Xác nhận: bị khóa vì còn cờ chưa xử lý.
3. Quyết định từng cờ (Không vi phạm / Vi phạm), chỉnh rubric nếu cần → Xác nhận.

Kết quả: điểm dưới 80%, ra **Chưa đạt**, báo còn lượt thi.

**KB7. Chấm bài đạt, gửi kết quả**
1. Chấm bài → **Đỗ Quang Huy** (An toàn thông tin, không cờ).
2. Rubric AI đề xuất đạt cả 3, có trích câu trả lời → **Xác nhận đạt**.

Kết quả: kết quả được gửi sang Quản trị nhân tài; badge Chấm bài giảm 1.

**KB8. Phân tích**
Mở Phân tích: tổng người xem, tỷ lệ hoàn thành theo bộ và theo tài liệu, danh sách câu hỏi AI Tutor chưa trả lời được.

### Năng lực đội ngũ: từ KPI tới khóa học (vai giám đốc)

Thanh bên → **Năng lực đội ngũ**. Đội mẫu: Khối Kỹ thuật sản phẩm, 20 người, 6 bộ phận, 11 vị trí (trưởng phòng, PM, tech lead, BA, dev BE/FE/mobile, DevOps, kỹ sư ML, kỹ sư dữ liệu, QA). Có 7 KPI: 4 KPI đang theo dõi và 3 KPI có nhãn **Gợi ý** (không lộ dữ liệu khách hàng, rút ngắn hội nhập, tự lấy số liệu).

**KB-NL1. AI lập kế hoạch**
1. Tab **Kế hoạch theo KPI** → bấm thẻ để chọn hoặc bỏ KPI.
2. Bấm **AI lập kế hoạch**.

Kết quả:
- Tóm tắt: kỹ năng ưu tiên số 1 kèm căn cứ, số kỹ năng đã có khóa hoặc chưa có, mức sẵn sàng hiện tại → sau kế hoạch.
- Danh sách kỹ năng xếp theo mức ảnh hưởng tới KPI, mỗi kỹ năng kèm người thiếu và khóa tương ứng.
- Người cần mức cao hơn khóa: AI ghép kèm cặp 1-1 với đồng nghiệp đã đạt mức (ví dụ Phan Tuấn Kiệt kèm cặp với Hồ Bảo Ngọc).

**KB-NL2. Tự thêm KPI**
1. Bấm **Thêm KPI**, hoặc thẻ "Thêm KPI của bạn".
2. Gõ tên KPI, hoặc bấm một ví dụ. AI gợi ý kỹ năng theo từ khóa trong tên; bấm để thêm, hoặc chọn kỹ năng khác từ danh sách.
3. Tùy chọn: chọn vị trí và mức cần cao hơn khung năng lực.
4. Bấm **Lập lại kế hoạch**.

Kết quả: KPI mới có nhãn "Tự thêm", xóa được. Ví dụ KPI khiếu nại khách hàng áp cho BA sẽ thêm kỹ năng "Xử lý khiếu nại" vào kế hoạch.

**KB-NL2b. Sơ đồ đội ngũ**
Sau khi lập kế hoạch, sơ đồ tổ chức hiện từ trên xuống: giám đốc → trưởng phòng → 5 bộ phận → từng người, mỗi người có các thẻ kỹ năng cần học.
- Màu thẻ: xanh = đã giao khóa, trắng = có khóa chưa giao, tím = chưa có khóa (cần tạo), cam = cần kèm cặp hoặc khóa nâng cao.
- Bấm một bộ phận, ví dụ **AI & Dữ liệu**: danh sách đề xuất bên dưới chỉ còn người của bộ phận đó. Giao khóa lúc này chỉ thêm người của bộ phận, không xóa người đã giao ở bộ phận khác.
- Bấm thẻ kỹ năng: cuộn tới dòng khóa tương ứng và tô sáng. Bấm tên người: mở hồ sơ năng lực.

**KB-NL3. Giao khóa có chọn người và hạn**
1. Bấm **Giao khóa** ở một kỹ năng: hiện danh sách người thiếu. Người khóa giúp lên mức được chọn sẵn; người cần mức cao hơn khóa được ghi chú.
2. Chọn hạn → **Giao**. Đã giao thì hiện "Đã giao N người · Sửa".
3. Hoặc bấm **Giao tất cả khóa có sẵn**.

**KB-NL4. Chưa có khóa → tạo bằng AI**
1. Ở kỹ năng **CI/CD và release** bấm **Tạo khóa bằng AI**: đi thẳng luồng tạo bộ, mục tiêu và tài liệu nguồn đã điền sẵn.
2. Suốt luồng Chi tiết → Dàn ý → Bản nháp, đầu trang có nút **Về Năng lực đội ngũ**; trang bộ có thêm banner "tạo từ kế hoạch năng lực".
3. Quay lại kế hoạch → **Giao khóa**.

**KB-NL5. Đội ngũ và hồ sơ năng lực**
1. Tab **Đội ngũ**: tìm theo tên, lọc theo bộ phận. Ma trận hiện mức hiện tại / mức cần.
2. Bấm **Phạm Thu Hà**: lộ trình đề xuất (khóa, kèm cặp, số giờ). Bấm 0–3 để chỉnh mức kỹ năng; ma trận và kế hoạch cập nhật ngay.
3. **Thêm nhân viên**: nhập tên, chọn vị trí (bộ phận tự điền), đặt mức từng kỹ năng.
4. Giao khóa cho Hà, chia sẻ bộ đó, rồi đổi sang vai người học: khóa hiện trong "Khóa học của tôi" với lý do "Kế hoạch năng lực · <KPI>".

**KB-NL6. AI đánh giá năng lực (khép vòng học → đo lại)**
1. Tab **Đánh giá năng lực**. Quy tắc: thi chính thức đạt và cao hơn ngưỡng ít nhất 5% thì tự cập nhật; bằng chứng từ luyện tập, tình huống, người kèm cặp hoặc điểm sát ngưỡng thì chờ bạn xác nhận.
2. 6 đề xuất chờ xác nhận, mỗi đề xuất có bằng chứng cụ thể (bài code, lịch sử release, nhận xét người kèm cặp…), độ tin cậy và lý do AI đưa ra. Ví dụ Lý Ngọc Anh đạt 78% so với ngưỡng 75% nên AI không tự áp dụng.
3. Bấm **Xác nhận mức** từng thẻ, hoặc **Xác nhận tất cả độ tin cậy cao** → ma trận, sơ đồ và mức sẵn sàng cập nhật ngay; dòng mới hiện ở **Lịch sử cập nhật mức**.
4. **Từ Chấm bài**: chấm bài Docker của **Phạm Thu Hà** (quyết định 2 cờ → Xác nhận đạt). Thông báo hiện "Phạm Thu Hà tự lên mức 2 trong Năng lực đội ngũ"; lịch sử ghi "Tự động", Docker của Hà trong ma trận thành 2/2.
5. **Bài xếp mức**: mở hồ sơ một người → **Gửi bài kiểm tra xếp mức** → **Mô phỏng: đã làm xong** → AI chấm từng kỹ năng và tạo đề xuất (có thể đề xuất hạ mức, kèm lời khuyên trao đổi trước). Thêm nhân viên mới có sẵn lựa chọn "Để AI xếp mức".

**KB-NL7. Tác động lên KPI**
Tab **Tác động lên KPI**:
- Số liệu tổng: lượt giao khóa, tỷ lệ hoàn thành, tỷ lệ đạt thi, lượt lên mức.
- Mỗi KPI có:
  - biểu đồ T6–T11, vùng xanh từ lúc bắt đầu đào tạo và đường mục tiêu (rê chuột xem từng tháng);
  - so sánh nhóm đã học với nhóm chưa học, ví dụ sự cố do release 2,1 so với 5,8 trên 10 người;
  - nhận xét của AI.
- Cuối trang ghi rõ đây là tương quan, chưa phải nhân quả.

**KB-NL8. Trợ lý AI cho giám đốc**
Trên trang Năng lực đội ngũ, bấm **Hỏi trợ lý AI** (góc phải dưới). Câu trả lời tính từ dữ liệu thật trên trang và có nút hành động. Bấm nút thì khung chat tự đóng; mở lại vẫn còn lịch sử.

| Câu hỏi | Kết quả mong đợi | Nút hành động |
|---|---|---|
| "Bộ phận nào yếu nhất về cloud?" | Nền tảng & DevOps 50%, kèm biểu đồ so sánh các bộ phận và danh sách người thiếu | Lọc kế hoạch theo bộ phận (cuộn tới sơ đồ đã lọc); tạo khóa Cloud bằng AI |
| "Ai có nguy cơ trễ hạn?" | 4 người, kèm lý do (quá hạn, 2 tuần không học, trượt bài luyện tập) | Gửi nhắc nhở; nhờ đồng nghiệp kèm cặp |
| "Nếu thêm KPI giảm 20% bug thì cần đào tạo gì?" | CI/CD + Phân tích yêu cầu, số người thiếu, khóa có sẵn hoặc cần tạo, căn cứ | Thêm KPI này và lập kế hoạch (thẻ KPI "Tự thêm" xuất hiện, kế hoạch chạy lại) |
| "Tóm tắt tình hình tuần này" | Mức sẵn sàng, KPI chậm, xu hướng KPI, nguy cơ trễ hạn, đề xuất lên mức chờ xác nhận | Sao chép báo cáo; xem đề xuất; xem tác động |
| "KPI nào đang chậm?" | Danh sách KPI đang chọn, trước → sau đào tạo, trạng thái | Xem tác động lên KPI |
| "Ai giỏi CI/CD nhất?" | Khôi, Duyên mức 3: người kèm cặp được | (bấm tên để mở hồ sơ) |
| "Ai cần học SQL?" | Người chưa đạt mức vị trí cần | Giao khóa SQL |
| "Phạm Thu Hà cần học gì?" | 4 kỹ năng thiếu + khóa đang học quá hạn | Mở hồ sơ năng lực |
| Câu ngoài phạm vi | Nói rõ trả lời được gì + 6 câu gợi ý | |

## Sửa nội dung trực tiếp (thấy gì sửa nấy)

Ở mọi màn soạn: bấm vào chữ là gõ được ngay, giống Word. Rê chuột thấy viền mảnh, đang gõ thấy viền xanh, ô trống hiện chữ gợi ý màu xám. Trong danh sách: **Enter** thêm dòng mới, **Backspace** ở dòng trống thì xóa dòng. Sửa xong là lưu ngay, không có nút Lưu.

| Màn | Sửa được trực tiếp |
|---|---|
| Trang bộ đào tạo | Tên, mô tả, mục tiêu, chỉ số thành công |
| Dàn ý | Tên và mục đích tài liệu; tên bài, ý chính; thêm, xóa, đổi thứ tự bài; tiêu đề slide, chương, bước; nhân vật, tình huống, mục tiêu cảnh. Bản nháp tạo ra theo đúng dàn ý đã sửa |
| Tài liệu nhanh: tổng quan | Tên, mô tả, tên từng bài; xóa bài (rê chuột); thêm bài ở dòng cuối |
| Tài liệu nhanh: bài học | Tên bài và mọi khối: đoạn văn, tiêu đề, danh sách, thẻ lật (mặt trước/sau), accordion, bảng (thêm/xóa dòng), các bước, mã nguồn, chú thích ảnh, câu hỏi kiểm tra nhanh (bấm vòng tròn chọn đáp án đúng). Khối mới từ "Thêm khối" đúng loại đã chọn |
| Bài kiểm tra | Câu hỏi, lựa chọn, phản hồi, đáp án đúng; thêm/xóa lựa chọn; rubric tự luận, test case, đáp án điền chỗ trống; xóa câu hỏi |
| Slide | Mọi chữ trên slide (tiêu đề, ý, cột, ô bảng, số liệu, trích dẫn); đổi bố cục; nhân đôi, xóa slide; ghi chú người trình bày. Ảnh thu nhỏ cập nhật ngay |
| Tình huống | Tên, giới thiệu, tên và vai nhân vật; tên và mục tiêu cảnh; lời nhân vật, lời dẫn, từng lựa chọn và câu đáp của nhân vật; bấm biểu tượng để đổi tốt/chưa tốt; thêm/xóa thẻ, lựa chọn, cảnh |
| Video | Tên, mô tả; tên chương (thêm chương tại thời điểm đang xem); điểm kiểm tra (câu hỏi, lựa chọn, đáp án đúng); lời thoại |
| Hướng dẫn từng bước | Tên, mô tả; tên và nội dung từng bước; thêm, xóa, đổi thứ tự bước |

## Vai người học (Phạm Thu Hà)

**KB9. Trang Khóa học của tôi**
Mở trang, kiểm tra các điểm sau:
- 8 khóa được giao, có tiến độ.
- Khóa tình huống An toàn thông tin hiện **Quá hạn 3 ngày** (màu đỏ).
- Khóa còn ≤ 2 ngày hiện màu cam.
- Khóa xong hiện **Đã hoàn thành**.
- Bài thi của tôi có đủ 3 trạng thái: Đang chấm, Đạt, Chưa đạt (Docker lần 1 trượt, lần 2 đang chấm).

**KB10. AI Tutor**
Tutor chỉ trả lời từ nội dung khóa (bài học hoặc lời thoại video). Mỗi câu trả lời có nguồn, nút mở đúng bài hoặc đúng phút, và gợi ý câu hỏi tiếp theo. Câu không tìm thấy thì báo rõ, không đoán, và câu hỏi hiện ở **Phân tích** của người tạo. Nút "Cuộc trò chuyện mới" xóa lịch sử chat.

| Khóa (mở xem trước → Hỏi AI Tutor) | Câu hỏi | Kết quả mong đợi |
|---|---|---|
| Bất kỳ | "bạn có thể làm gì" / "chào" | Giới thiệu 4 việc Tutor làm được, nói rõ không trả lời câu thi; không ghi vào Phân tích |
| Bất kỳ | "Tóm tắt khóa này" | Tóm tắt khóa + danh sách bài/chương, nút mở 3 bài đầu |
| Bất kỳ | "Tìm trong nội dung khóa" | Hỏi lại muốn tìm gì, kèm 3 từ khóa gợi ý bấm được |
| Bất kỳ | "Mình chỉ cần học một phần" | Danh sách bài, mỗi bài một nút mở |
| Bất kỳ | "đáp án câu 2" | Từ chối trả lời câu thi |
| Bất kỳ | "cảm ơn" | Trả lời ngắn |
| Lệnh và lựa chọn khi dùng Docker Volume | "Giải thích đơn giản hơn" | Ví dụ phòng khách sạn / tủ gửi đồ, nút mở Bài 1 và video 00:00 |
| Như trên | "Mình chỉ cần học phần sao lưu" | Chỉ Bài 3 + video 04:48, nguồn Runbook |
| Như trên | "thiết kế volume cho database" | Tìm trong nội dung: trích bảng "Cơ sở dữ liệu – Named volume", nút mở Bài 2 |
| Như trên | "compose trên windows" | Không tìm thấy → hiện ở Phân tích |
| Nhận diện email lừa đảo | "lỡ bấm rồi thì sao" | Chỉ tới Bài 3 |
| Như trên | "dùng điện thoại cá nhân có sao không" | Không tìm thấy (nguồn chưa có phần này) → hiện ở Phân tích |
| JOIN và GROUP BY | "group by khác join thế nào" | Trích hai chỗ ở Bài 1 và Bài 2 |
| Docker Volume trong 8 phút (video) | "sao lưu volume" | Trích lời thoại chương 4, nút "Xem 04:48" tua video |
| Khóa CI/CD vừa tạo từ chủ đề mẫu | "rollback khi nào", "canary là gì" | Câu trả lời riêng của khóa hoặc trích đoạn Bài 1 |
| Bài thi chính thức (Docker) | Mở Tutor khi đang thi | Tutor tắt |

**KB11. Thi chính thức**
1. Docker: vào bài kiểm tra → màn đồng ý giám sát → làm bài (thử chuyển tab, dán chữ vào tự luận) → Nộp.
2. An toàn thông tin: bài thi không giám sát, vào thẳng.

Kết quả:
- Trắc nghiệm có điểm ngay.
- Bài nộp xuất hiện ở Chấm bài, có cờ nếu đã chuyển tab hoặc dán chữ.
- Tutor tắt trong lúc thi chính thức.

**KB12. Luyện hội thoại tình huống**
1. Mở **Cuộc gọi giả danh IT hỗ trợ** (người học), hoặc **Phản hồi khi thành viên trễ hạn** (người tạo: Xem trước).
2. Chọn câu trả lời tốt và câu trả lời xấu.

Kết quả: viền ảnh nhân vật đổi xanh hoặc đỏ, nhân vật đáp theo lựa chọn, khung chat tự cuộn xuống; hết cảnh thì hiện số lần chọn tốt nhất và nút Chơi lại.

**KB13. Video tương tác**
1. Mở **Mật khẩu mạnh và xác thực 2 lớp** → Phát.

Kết quả: video dừng ở điểm kiểm tra, trả lời xong mới chạy tiếp; bấm chương để nhảy.

## Kiểm tra nhanh lỗi phân quyền

- Người học không thấy Trang chủ, Thư viện, Chấm bài; gõ thẳng `#/library` sẽ tự về Khóa học của tôi.
- Người học xem khóa: không có nút Sửa, không có thanh đổi thiết bị.
