# Kiểm chứng design-system v2

Ngày kiểm tra: 16/11/2026. Tham chiếu hình thức: checkout `HRM-chatgpt`, giữ nhận diện Workforce AI. Phạm vi chỉnh sửa: `design-system/`, cùng shell điều hướng và banner tổng quan/học tập trong prototype theo quyết định thống nhất sidebar của người dùng.

## Kết quả đã chạy

- `python3 design-system/build.py`: sinh đủ 91 component; chạy lại cho cùng nội dung ở `tokens.css`, `index.html`, `README.md`.
- Kiểm tra schema hiện tại: không trùng tên token, mọi alias trỏ đến token tồn tại; giữ toàn bộ tên class `wf-*` đã có.
- `node --check design-system/patterns/preview.js` và `git diff --check`: đạt.
- Chromium 153.0.8010.12 qua Playwright: 201 assertion đạt; không ghi nhận page error hoặc HTTP 4xx/5xx trong các trang đã nạp.
- Ba mẫu mới kiểm tra ở 320, 400, 768, 1024 và 1440px: một h1 mỗi trang, font cục bộ nạp được, không cuộn ngang trang. Bảng cuộn trong khung riêng.
- Menu mobile mở được, Escape đóng và trả focus về nút mở. Bộ lọc hỗ trợ tìm không dấu, loại/trạng thái, xóa lọc và không có kết quả.
- Mỗi mẫu chuyển được giữa bình thường và năm trạng thái: đang tải, rỗng, lỗi, AI đang xử lý, không có quyền. Nút thử lại đưa về nội dung bình thường.
- Minh họa phê duyệt/từ chối: chặn từ chối thiếu lý do; hủy hộp xác nhận giữ nguyên trạng thái; xác nhận hiển thị kết quả mẫu, toast và khóa thao tác lặp. Không lưu dữ liệu hoặc trừ số dư phép.
- Cả 91 trang preview component nạp được. Đã xem ảnh ba mẫu mới ở desktop/mobile và hai mẫu soạn khóa học/cổng học trên desktop; việc nạp được không đồng nghĩa đã duyệt hình thức chi tiết từng component.

## Màu chữ kiểm tra từ token

Tính tương phản bằng công thức luminance sRGB, trên các cặp nền xác định dưới đây. Đây là kiểm tra token, chưa phải audit toàn bộ trang.

| Chữ / nền | Tỷ lệ xấp xỉ |
|---|---:|
| on-primary / primary | 4,64:1 |
| ink-muted / surface-subtle | 5,06:1 |
| ink-subtle / surface-subtle | 4,62:1 |
| ai-ink / ai-surface | 7,61:1 |
| success-text / success-surface | 5,75:1 |
| warning-text / warning-surface | 5,33:1 |
| danger-text / danger-surface | 6,45:1 |

## Kiểm tra lại

Chạy máy chủ tĩnh ở gốc repo, mở `design-system/index.html`, chọn ba mẫu màn ở đầu thư viện. Trong từng mẫu, dùng bộ chọn trạng thái ở cuối trang. Chi tiết component và cách ghép mẫu nằm trong `README.md` và `patterns/README.md`.

Chưa kiểm tra screen reader, axe, Safari/Firefox hoặc mô phỏng mù màu. Đã kiểm tra phần shell/sidebar và các banner của prototype; không coi đây là nghiệm thu toàn bộ sản phẩm hoặc tích hợp HRM/AI thật.

## Bổ sung: sidebar thống nhất và HeroBanner

- Bỏ nhánh menu ngang riêng của nhân viên/ứng viên. Cả 8 vai trò dùng cùng sidebar, wordmark và menu mobile native dialog; danh sách mục vẫn theo quyền route.
- HeroBanner có bản lớn/gọn và ba ví dụ tổng quan, học tập, onboarding. Áp dụng vào mẫu tổng quan, cổng học và trang chủ/học tập trong prototype. Minh họa vòng đan dựng bằng CSS theo ảnh NOVA; dưới 760px ẩn phần trang trí, giữ chữ và CTA.
- `prototype/tools/scen.sh navigation-scenarios.js`: trước thay đổi phát hiện thiếu sidebar ở nhân viên/ứng viên; sau thay đổi **99 kiểm tra đạt**, không có FAIL hoặc JSERRORS.
- `prototype/tools/smoke.sh`: **97 màn/role đạt**; `prototype/tools/scen.sh`: **133 kiểm tra nghiệp vụ hiện có đạt**. Không ghi nhận JavaScript error.
- Playwright bổ sung **185 assertion đạt** trên 8 vai trò và 5 chiều rộng 320/400/768/1024/1440px: sidebar, bỏ topnav, menu mobile/Escape/trả focus, CTA banner và trang minh họa không tràn ngang trong phạm vi kiểm tra. Mẫu cổng học được sửa min-width của grid để không tràn ở 320px.
