# Nghiên cứu: ghép CV ↔ JD trên các hệ thống hiện có

Ngày tra cứu: 20/11/2026. Nguồn là tài liệu công khai của nhà cung cấp; các con số hiệu quả là số do họ tự công bố.

## 1. Ba hệ thống được gợi ý

| Hệ thống | Có ghép CV ↔ JD? | Chiều | Cách thể hiện mức phù hợp |
|---|---|---|---|
| **Workday Recruiting + HiredScore** | Có, đầy đủ nhất | Cả hai chiều | Hạng **A–D** cho mỗi cặp ứng viên × tin tuyển dụng. Từng yêu cầu bắt buộc / ưu tiên được đánh dấu đạt hoặc chưa đạt, kèm giải thích bằng lời. |
| **Teal** | Có, phía ứng viên | CV → một JD | **Match Score %** theo độ phủ từ khoá. Từ khoá được tách kỹ năng cứng / mềm và tô màu theo trạng thái. Teal khuyên đạt ≥ 80%. |
| **MyCVCreator** | Không có điểm ghép | — | Chỉ là công cụ tạo CV, kèm bộ kiểm tra CV cho ATS. Bộ này có thể so từ khoá với một JD dán vào, nhưng không cho ra phần trăm phù hợp. |

**Workday HiredScore: các chức năng liên quan**
- **Spotlight:** hộp hồ sơ được chấm hạng sẵn. Lọc theo hạng, lọc theo yêu cầu đã đạt, xem thêm số năm kinh nghiệm và khoảng cách địa lý.
- **Fetch / ATS Fetch:** từ một tin tuyển dụng, tìm lại ứng viên cũ trong kho. Đây là chiều **JD → kho CV**.
- **Reverse Fetch:** từ một hồ sơ, gợi ý các vị trí đang mở. Đây là chiều **CV → kho JD**.
- **Talent Mobility:** gợi ý vị trí nội bộ cho nhân viên; quản lý trực tiếp duyệt trước.
- **Masked screening:** ẩn thông tin định danh khi quản lý sàng lọc.
- **Nguyên tắc:** hạng thấp không có nghĩa là bị loại. Người tuyển dụng luôn ra quyết định cuối cùng.

## 2. Các hệ thống khác cùng nghiệp vụ

| Hệ thống | Điểm đáng học |
|---|---|
| **Textkernel Search & Match** | Ghép theo cả 4 hướng: JD→CV, CV→JD, CV→CV, JD→JD. Mỗi nhóm tiêu chí có trọng số (kỹ năng, chức danh, học vấn, ngoại ngữ, kinh nghiệm…). Mỗi tiêu chí có một trong 3 mức yêu cầu: *nice-to-have*, *should-have*, hoặc *must-have*; mức *must-have* là bộ lọc cứng. Điểm cộng dồn thành thang 0–1 và chia nhỏ theo nhóm. Trọng số thay đổi theo ngữ cảnh: tin làm từ xa thì bỏ tiêu chí địa điểm, kinh nghiệm gần đây được tính nặng hơn. |
| **Jobscan** | Ưu tiên chấm: kỹ năng cứng, rồi học vấn, chức danh, kỹ năng mềm. Gợi ý ngưỡng 75%. Tách bảng kỹ năng cứng và kỹ năng mềm. |
| **Eightfold AI** | Điểm chỉ có nghĩa cho một cặp ứng viên × vị trí cụ thể, không phải điểm chung của ứng viên. Giải thích điểm theo kỹ năng, công việc và chức danh liên quan. |

## 3. Những gì bản này lấy về

| Lấy từ | Áp dụng trong Talent Match |
|---|---|
| Workday HiredScore | Hạng A–D. Danh sách đạt / chưa đạt theo từng yêu cầu. Lọc theo hạng và theo tiêu chí đã đạt. Chiều JD → kho và kho → JD. Gợi ý nội bộ. Ẩn danh khi sàng lọc. Người tuyển dụng là người quyết định. |
| Textkernel | Cây tiêu chí có trọng số. Ba mức Bắt buộc / Quan trọng / Cộng điểm. Tiêu chí bắt buộc không đạt thì giới hạn hạng. Trọng số theo ngữ cảnh (làm từ xa). Điểm chia nhỏ theo nhóm. Kỹ năng gần nghĩa được tính một phần. |
| Teal / Jobscan | Màn của ứng viên: phần trăm phù hợp và từ khoá kỹ năng cứng / mềm theo 3 trạng thái (có, gần đúng, thiếu). Kèm gợi ý cải thiện ghi rõ mỗi gợi ý thêm được bao nhiêu điểm. |

## 4. Khu vực ứng viên theo kiểu Teal

`app.tealhq.com` yêu cầu đăng nhập, và trang công khai cùng trang trợ giúp của Teal chặn truy cập tự động (Cloudflare / 403). Vì vậy bố cục được dựng theo mô tả công khai của Teal, không sao chép giao diện từng điểm ảnh, logo hay tên thương hiệu. Các mô tả đó gồm: thanh điều hướng bên trái, trang chủ dạng bảng tiến độ, bảng theo dõi việc làm, trình tạo CV, và chế độ đối chiếu đặt CV cạnh JD kèm từ khoá có / thiếu.

| Thành phần của Teal | Trong Talent Match |
|---|---|
| Thanh điều hướng trái: Home · Job Tracker · Resume Builder | Trang chủ · Việc phù hợp · Theo dõi việc làm · Trình tạo CV |
| Job Tracker: bảng việc đã lưu, trạng thái, mức hứng thú (sao) | `/me/tracker`, có thêm cột mức phù hợp theo CV |
| Resume Builder + Matching Mode: CV một bên, JD và từ khoá một bên | `/me/resume/match/:jobId`: JD tô màu từ khoá, bấm để chèn; điểm tính lại ngay |
| Match Score theo độ phủ từ khoá | Thay bằng điểm top-down có trọng số, kèm “Vì sao phù hợp” / “Còn thiếu” |

## Nguồn
- [Workday – Review candidates 50% faster in Workday Recruiting](https://blog.workday.com/en-us/screen-candidates-50-faster-workday-recruiting.html)
- [Workday – HiredScore AI for Recruiting (feature description)](https://doc.workday.com/admin-guide/en-us/workday-feature-descriptions/workday-hiredscore/hiredscore-ai-for-recruiting.html)
- [Workday – HiredScore AI for Talent Mobility](https://doc.workday.com/admin-guide/en-us/workday-feature-descriptions/workday-hiredscore/hiredscore-ai-for-talent-mobility.html)
- [Workday – AI Recruiting](https://www.workday.com/en-ch/products/talent-management/ai-recruiting.html)
- [Teal – Using Matching Mode](https://tealhq.helpscoutdocs.com/article/21-using-matching-mode)
- [Teal – Job matcher UI update (06/2025)](https://help.tealhq.com/en/articles/11662593-job-matcher-ui-update-june-2025-beta)
- [Teal – Using Job Matching](https://intercom.help/tealhq-9a9274919b13/en/articles/9524864-using-job-matching)
- [Teal – Leveraging your Job Tracker tools](https://help.tealhq.com/en/articles/9525013-leveraging-your-job-tracker-tools)
- [MyCVCreator – ATS Resume Checker](https://www.mycvcreator.com/tools/ats-resume-checker)
- [Textkernel – Matching: Scoring](https://developer.textkernel.com/SearchMatch/master/Matching/Scoring/)
- [Textkernel – Search & Match specs](https://developer.textkernel.com/tx-platform/v10/search-match/overview/specs/)
- [Jobscan – Resume Match Report](https://www.jobscan.co/video-resume-match-report)
- [Eightfold – Matching Model](https://eightfold.ai/nyc-eightfold-matching-model)
