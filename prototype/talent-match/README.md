# Talent Match – ghép CV ↔ JD

Bản frontend dùng dữ liệu giả lập cho tính năng ghép hồ sơ với vị trí của hệ thống nhân sự. Bản này đi theo luồng của Workday HiredScore: chấm hạng, đánh dấu từng tiêu chí đạt / chưa đạt, ghép theo cả hai chiều. Phần trọng số lấy theo Textkernel, màn của ứng viên lấy theo Teal. Chi tiết xem [NGHIEN-CUU.md](NGHIEN-CUU.md).

Toàn bộ người, tổ chức và tin tuyển dụng trong bản này đều là giả lập.

## Chạy

```bash
npm install
npm run dev      # http://127.0.0.1:5191
npm test         # kiểm thử bộ chấm điểm
npm run build
```

Trang đầu (`/`) là trang đích: kéo thả CV hoặc JD dạng PDF/TXT (có file mẫu trong `public/samples/`) để xem kết quả ngay, chưa cần tài khoản. Bấm **Vào bản demo** để vào ứng dụng. Có thể chuyển vai **Nhà tuyển dụng / Ứng viên** bằng nút ảnh đại diện ở đáy thanh icon bên trái.

Giao diện theo phong cách Teal (theo ảnh chụp app.tealhq.com): thanh icon hẹp, nền trắng phẳng, viền mảnh, font Inter, xanh rêu `#22504a` và vàng `#ecb22e`. Màu đỏ chỉ dùng cho nghĩa “thiếu / rủi ro”. Không dùng logo hay tên Teal. Mục **Quy tắc chấm điểm → Đặt lại dữ liệu demo** đưa mọi thứ về trạng thái ban đầu.

## Luồng nghiệp vụ

```
                    ┌──────────── Nhà tuyển dụng ────────────┐
JD ──AI trích──► Cây tiêu chí ──chỉnh trọng số, chốt──► Xếp hạng toàn kho CV ──► Phân tích 1 cặp ──► Rút gọn / So sánh / Mời PV
                 (nháp, AI đề xuất)   (xem trước tác động)  (lọc hạng, nguồn, tiêu chí)  (điểm → nhóm → tiêu chí → bằng chứng)

CV ──AI chuẩn hoá──► Hồ sơ kỹ năng ──► Xếp hạng toàn kho JD ──► Gán vào tin / Đề xuất luân chuyển (nhân viên nội bộ)

                    ┌──────────── Ứng viên (bố cục kiểu Teal) ────────────┐
Thả CV ở trang đích ──► Kết quả + giải thích (chưa cần tài khoản) ──► Lưu ──► Chế độ đối chiếu
Trang chủ ─ Việc phù hợp ─ Theo dõi việc làm ─ Trình tạo CV ──► Chế độ đối chiếu (JD tô màu | CV sửa trực tiếp) ──► Ứng tuyển

                    ┌──────────── Nhà tuyển dụng ────────────┐
Thả JD ở trang đích ──► Cây tiêu chí AI trích + ứng viên hợp nhất (ẩn danh) ──► Lưu thành tin nháp ──► Chỉnh trọng số
```

## Ba yêu cầu trải nghiệm

| Yêu cầu | Ở đâu |
|---|---|
| **AI có giải thích**: con số % luôn đi kèm “Vì sao phù hợp” và “Còn thiếu” (+% nếu bổ sung) | Trang đích, Trang chủ, Chế độ đối chiếu (`components/Explain.jsx`) |
| **Chia đôi màn hình, sửa trực tiếp**: JD tô màu từ khoá (xanh có / vàng gần đúng / đỏ thiếu), bấm từ khoá để thêm vào mục Kỹ năng hoặc chèn câu vào kinh nghiệm; CV sửa tại chỗ, điểm tính lại ngay, có hoàn tác | `/me/resume/match/:jobId` (`pages/match-mode/`) |
| **Không cần cấu hình / đăng ký trước**: kéo thả PDF CV hoặc JD ở trang đích, tự nhận dạng loại văn bản, trả kết quả trước khi lưu | `/` (`pages/landing/`, `lib/extract.js`, `lib/readFile.js`) |

Quy tắc chống “nhồi từ khoá”: kỹ năng chỉ xuất hiện trong mô tả kinh nghiệm mà chưa khai ở mục Kỹ năng được tính mức **Cơ bản**. Câu chèn tự động có phần `[kết quả cụ thể]` buộc người dùng tự điền.

## Cách tính điểm (top-down)

```
Tổng 100 điểm
├── Nhóm tiêu chí (trọng số nhóm, tổng = 100)
│     Kỹ năng chuyên môn · Kinh nghiệm · Học vấn & chứng chỉ · Ngoại ngữ · Kỹ năng mềm · Điều kiện làm việc
│   └── Tiêu chí (trọng số trong nhóm, mức Bắt buộc / Quan trọng / Cộng điểm, mức yêu cầu)
│         └── Mức đạt 0–100% + bằng chứng trích từ CV
│
Điểm = Σ trọng số nhóm × trọng số tiêu chí (chuẩn hoá) × mức đạt
Hạng: A ≥ 85 · B ≥ 70 · C ≥ 50 · D < 50 (chỉnh được theo từng tin)
Tiêu chí bắt buộc đạt < 50% → tối đa hạng C (vẫn hiển thị, người tuyển dụng quyết định)
```

Quy tắc chấm mức đạt cho từng loại tiêu chí nằm ở màn **Quy tắc chấm điểm** và trong [src/lib/criteria.js](src/lib/criteria.js). Các quy tắc gồm: kỹ năng gần nghĩa, số năm theo lĩnh vực, bậc học / ngành, IELTS quy đổi, địa điểm (vị trí làm từ xa thì bỏ qua), lương (cho vượt ngân sách tối đa 15%) và thời gian nhận việc.

## Màn hình

| Đường dẫn | Nội dung |
|---|---|
| `/jobs` | Danh sách tin, phân bố hạng A/B/C, số gợi ý hạng A–B lấy từ kho. Nút **Tải JD lên** (PDF, dán chữ hoặc JD mẫu) → AI trích tiêu chí → tạo tin nháp → mở ngay danh sách ứng viên tiềm năng trong kho |
| `/jobs/:id` | **Ứng viên phù hợp**: bộ lọc hạng, nguồn, tiêu chí đã đạt, điểm tối thiểu; chọn 2–4 hồ sơ để so sánh |
| `/jobs/:id?tab=criteria` | **Tiêu chí & trọng số**: cây tiêu chí 2 tầng (nhóm → tiêu chí con), thêm tiêu chí con vào nhóm Kỹ năng, Kinh nghiệm (số năm / lĩnh vực), Học vấn (chứng chỉ), nút phân bổ 3 : 2 : 1, ngưỡng hạng, bảng xếp hạng xem trước thay đổi ngay khi chỉnh |
| `/jobs/:id?tab=jd` | JD dạng tài liệu, **sửa tại chỗ** (bấm vào chữ nào sửa chữ đó: chức danh, thông tin tin, mô tả, trách nhiệm, yêu cầu; Enter thêm dòng, Ctrl/⌘+S lưu). Gõ tới đâu thẻ tiêu chí dưới mỗi dòng yêu cầu cập nhật tới đó; tiêu chí được **trích lại theo dòng**: dòng không đổi giữ nguyên tiêu chí và trọng số, chỉ dòng mới/sửa/xoá làm đổi. Bản nháp tự giữ khi chuyển tab hay tải lại trang; có Huỷ thay đổi và Khôi phục JD gốc |
| `/jobs/:id/match/:cvId` | Phân tích một cặp: vòng điểm, thanh đóng góp theo nhóm, từng tiêu chí con kèm trọng số trong nhóm, điểm tối đa, bằng chứng; dòng cuối mỗi nhóm cộng điểm các tiêu chí con ra điểm nhóm; khoảng trống (+điểm), câu hỏi phỏng vấn gợi ý |
| `/candidates`, `/candidates/:id` | Kho hồ sơ; hồ sơ → các vị trí phù hợp; nhân viên nội bộ có nút “Đề xuất luân chuyển” |
| `/compare` | Ma trận so sánh theo cùng cây tiêu chí, xuất CSV |
| `/rules` | Quy tắc chấm, hạng, ẩn danh khi sàng lọc |
| `/` | Trang đích: kéo thả / dán / dùng mẫu CV hoặc JD → kết quả có giải thích → lưu |
| `/me/home` | Trang chủ (theo Teal Home): banner, mục tiêu nghề nghiệp, hướng dẫn, danh sách “Bắt đầu” |
| `/me/resume`, `/me/resume/edit` | Trình tạo CV (theo Teal Resume Builder): 4 cách bắt đầu, CV gần đây; màn sửa từng mục |
| `/me/tracker` | Theo dõi việc làm (theo Teal Job Tracker): dải trạng thái mũi tên, bảng sắp xếp được, chọn nhiều |
| `/me/jobs` | Tìm việc (theo Teal Job Search): danh sách trái, chi tiết phải, kèm % phù hợp có giải thích |
| `/me/ai` | Tìm việc bằng AI: hỏi bằng lời (“việc React từ xa trên 30 triệu”), trả lời bằng việc có giải thích |
| `/me/tools` | Tất cả công cụ |
| `/me/resume/match/:jobId` | **Chế độ đối chiếu** chia đôi màn hình |

## Cấu trúc

```
src/
  data/        skills.js (danh mục kỹ năng + kỹ năng gần nghĩa) · jobs.js (8 JD + cây tiêu chí) · cvs.js (24 hồ sơ)
  lib/         criteria.js (chấm từng tiêu chí) · match.js (tổng hợp, hạng, xếp hạng 2 chiều) · insights.js
               extract.js (đọc CV/JD thành dữ liệu) · readFile.js (PDF/TXT trên trình duyệt) · cvEdit.js · tracker.js · *.test.js
  components/  Breakdown.jsx (phân rã điểm) · CvView.jsx
  pages/       các màn ở bảng trên · landing/ (trang đích) · match-mode/ (chế độ đối chiếu, trình sửa CV)
public/samples/  cv-mau.pdf, jd-mau.pdf để thử kéo thả
  store.jsx    trạng thái demo (localStorage) — chỗ thay bằng API khi có backend
```

## Khi nối backend

- `store.jsx` hiện thay cho API. Khi có backend, các hàm `saveCriteria`, `toggleShortlist`, `invite`, `apply` sẽ gọi API tương ứng.
- Bộ chấm trong `lib/` là hàm thuần, chạy được ở cả backend. Phần AI chỉ lo hai việc: (1) trích tiêu chí từ JD, (2) chuẩn hoá CV thành kỹ năng, mức độ và lĩnh vực. Còn điểm được tính bằng công thức có thể giải thích được, không để mô hình tự cho điểm.
