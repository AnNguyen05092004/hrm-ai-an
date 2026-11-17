# Mẫu bố cục màn hình

Năm mẫu màn ghép từ component trong thư viện, để designer và dev thấy các component đứng cạnh nhau thế nào. Mở trực tiếp bằng trình duyệt. Dữ liệu là dữ liệu mẫu. Mẫu **dashboard** nằm ở component `DashboardPage`, mẫu **trang chủ** ở `HomePage`.

| File | Màn | Bố cục | Component chính |
|---|---|---|---|
| `workspace-overview.html` | Tổng quan HRBP | Shell v2, KPI bốn cột, dashboard 1.7:1 | AppHeader, SideNav, KpiTile, Card, AiPanel |
| `request-list.html` | Danh sách hồ sơ chờ duyệt | Bộ lọc, bảng cuộn ngang | FilterBar, DataTable, PersonCell, Badge |
| `approval-detail.html` | Chi tiết phê duyệt nghỉ phép | Thông tin + tiến trình, vùng quyết định | AiPanel, DecisionBar, ConfirmDialog |
| `course-editor.html` | Trình soạn khóa học (S3) | Sidebar L&D + topbar + thanh công cụ + **3 cột** `wf-editor`: cấu trúc · các khối · cài đặt | TreeList, ContentBlock, Accordion, AvatarGroup, FileUpload, Switch, Tooltip |
| `learner-portal.html` | Cổng học của nhân viên (S8) | Shell sidebar nhân viên, HeroBanner gọn, `wf-split--2-1` | Tabs, CourseCard, ProgressBar, AiTutor, Badge |

## Lớp bố cục dùng chung
| Lớp | Việc |
|---|---|
| `wf-app` | Lưới hai cột: menu trái `sidebar-w` + nội dung. Dưới 900px menu ẩn. |
| `wf-page` | Vùng nội dung tối đa `content-max`, lề 32px (16px trên điện thoại), các khối cách nhau 20px. |
| `wf-toolbar` | Thanh công cụ dưới header (tên nội dung, trạng thái, nút). `wf-toolbar-end` đẩy nhóm nút sang phải. |
| `wf-editor` | Ba cột 260px · tự giãn · 300px. Dưới 900px xếp dọc. |
| `wf-split` | Các khối cạnh nhau, tự rớt dòng khi hẹp (tối thiểu 300px). `wf-split--2-1` chia 2:1 và xếp dọc dưới 900px. |
| `wf-grid` | Lưới thẻ (ContentCard) tối thiểu 240px. |
| `wf-menu-btn` | Nút ba gạch trong `AppHeader`, hiện dưới 900px trong shell v2 (mẫu cũ giữ breakpoint riêng); khi đó menu ngang ẩn đi. |

## Quy tắc khi dựng màn mới
- Bắt đầu từ các mẫu này và `DashboardPage`/`HomePage`, **không tự chế lưới mới**. Thấy thiếu thì đề xuất bổ sung lớp bố cục vào đây.
- Mỗi màn có đủ năm trạng thái: đang tải, rỗng, lỗi, AI đang xử lý, không có quyền (xem README gốc).
- Kiểm tra ở 400px: không cuộn ngang trang, bảng tự cuộn trong `wf-table-wrap`.
- Một màn chỉ có một nút đỏ đặc cho mỗi vùng. Kết quả AI nằm trong `AiPanel`, quyết định của người trong `DecisionBar`.

## Shell v2 và tương tác mẫu

Các mẫu màn dùng `wf-app wf-app--workspace`: wordmark trong sidebar, topbar có breadcrumb/vai trò. `wf-workspace`, `wf-kpi-grid`, `wf-dashboard-grid`, `wf-stack` là lớp dùng chung trong `components.css`; `preview.css` chỉ chứa cách trình bày của các mẫu.

`preview.js` minh họa menu mobile (native dialog, đóng bằng Escape), tìm kiếm không dấu, lọc và xóa bộ lọc, xác nhận phê duyệt/từ chối (bắt buộc lý do), toast và năm trạng thái nội dung. Chọn trạng thái ở cuối màn. Các link “Xem mẫu” cùng mở một hồ sơ minh họa. Không có backend, không ghi localStorage và không cập nhật số dư phép; tải lại trang để đặt lại kết quả.

Mở bằng trình duyệt hoặc chạy `python3 -m http.server 8787 --bind 127.0.0.1` ở gốc repo, rồi truy cập `/design-system/patterns/workspace-overview.html`. Font được đóng gói cục bộ.

## Điều hướng và banner đã thống nhất

Nhân viên và L&D cùng dùng sidebar, menu mobile mở native dialog. Các tab trong nội dung vẫn là điều hướng cục bộ. Tổng quan dùng HeroBanner lớn; cổng học dùng bản gọn. Thư viện HeroBanner có thêm ví dụ onboarding, chưa tự chèn banner vào mọi trang chi tiết.
