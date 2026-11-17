# Workforce AI: Design System

Thư viện giao diện chung của dự án. Màn nào vẽ trên Figma hay code ra cũng phải dùng đúng token và component ở đây, để cả hệ thống nhìn như một sản phẩm.

**Bản v2 · 16/11/2026:** phong cách tham chiếu NOVA từ checkout `HRM-chatgpt`, giữ tên Workforce AI và API class `wf-*`. Mở [thư viện](index.html) hoặc [tổng quan mẫu](patterns/workspace-overview.html). Liên kết artifact cũ không đại diện cho bản v2.

Phần nền tảng nằm trong `design-system/`. Sau khi chốt sidebar cho tất cả vai trò, shell của prototype đã được đồng bộ, thêm banner tổng quan/học tập và kiểm tra lại menu theo quyền. Dữ liệu và luồng nghiệp vụ giữ nguyên.

## Thư mục có gì

| File | Dùng để |
|---|---|
| `index.html` | **Mở bằng trình duyệt để xem toàn bộ**: bảng màu, component, biểu đồ và mẫu màn |
| `tokens.json` | Nguồn gốc của mọi giá trị: màu, chữ, khoảng cách, bo góc, bóng, kích thước |
| `tokens.css` | CSS variables sinh từ `tokens.json` (`--primary`, `--space-4`…) và class chữ (`.text-h1`…) |
| `components.css` | Kiểu dáng các component, class tiền tố `wf-` |
| `components/<Tên>/README.md` | Hướng dẫn dùng từng component: khi nào dùng, biến thể, nên/không nên |
| `components/<Tên>/preview.html` | Mẫu HTML của component, copy được |
| `patterns/` | Năm mẫu màn: tổng quan, danh sách, phê duyệt, soạn khóa học và cổng học nhân viên |
| `assets/fonts/` | Font Be Vietnam Pro và Lexend cục bộ, nạp qua `components.css` |
| `COVERAGE.md` | Bảng đối chiếu use case của 6 module và 15 màn M6 với component, để biết dùng gì và còn thiếu gì |
| `build.py` | Sinh lại `tokens.css`, `index.html` và danh sách component trong file này |

## Cách dùng

**Designer (Figma, Google Stitch)**
- Tạo Figma Variables theo đúng tên và giá trị trong `tokens.json` (`red-600`, `ink`, `space-4`, `radius-md`…).
- Vẽ component theo `components/<Tên>/README.md` và đối chiếu với `index.html`.
- Gặp trường hợp chưa có component phù hợp thì đề xuất bổ sung vào đây trước, không tự chế màu hay kích thước mới.

**Dev**
- Nạp `tokens.css` rồi `components.css`. Có thể dùng ngay class `wf-*`, hoặc viết component React/Vue riêng nhưng chỉ dùng biến CSS, không viết mã màu trực tiếp.
- Dùng Tailwind thì map biến vào theme, ví dụ `colors: { primary: 'var(--primary)' }`.

**Sửa design system**
- Sửa `tokens.json`, `components.css` hoặc thêm thư mục `components/<Tên>/` (gồm `README.md` và `preview.html`, dòng đầu ghi nhóm), chạy `python3 design-system/build.py`, rồi mở `index.html` kiểm tra lại.
- Mở pull request. Tech lead duyệt, vì thay đổi ở đây ảnh hưởng mọi màn.

## Tổng quan

Thư viện giao diện cho **Workforce AI**, hệ thống nhân sự có AI dành cho phòng Nhân sự. Bản v2 tham chiếu `HRM-chatgpt/prototype/styles.css` và `HRM-chatgpt/design-system/README.md`: **sidebar trắng, canvas xám nhạt, điểm nhấn đỏ sáng, tiêu đề Lexend và card có bóng nhẹ**. Giữ schema token, 90 component cũ, bổ sung HeroBanner và giữ quy ước nghiệp vụ của thư viện hiện tại.

Bản tham chiếu là prototype, không phải chuẩn production để sao chép nguyên trạng. Bản v2 giữ body 14px, nhãn tối thiểu 12px trong các mẫu mới, spacing bước 4px và màu trạng thái có ngữ nghĩa. Không dùng thương hiệu NOVA hay logo VinSmart Future.

## Nguyên tắc
- **Trắng chiếm phần lớn, đỏ dùng tiết kiệm.** Khoảng 80% diện tích là `white` và `surface-*`. Đỏ chỉ cho hành động chính, mục đang chọn và điểm cần chú ý.
- **Mỗi vùng chỉ một nút đỏ đặc** (`primary`). Hành động phụ dùng nút viền hoặc nút chữ.
- **AI đề xuất, con người quyết định.** Kết quả AI luôn nằm trong `AiPanel` (nền `ai-surface`, nhãn và icon AI màu đỏ đậm). Màu AI không thay thế trạng thái nghiệp vụ. Quyết định nằm trong `DecisionBar`. Thao tác khó hoàn tác phải qua `ConfirmDialog`.
- **Trạng thái luôn có chữ**, màu chỉ hỗ trợ.

## Màu
Màu chính `primary = #ea0029`, hover `#c60023`, nền chọn `#fff0f2`; chữ chính `#20242d`, canvas `#f7f8fa`. Các sắc đỏ còn lại được điều chỉnh cho thư viện; dùng alias `primary`, `primary-hover`, `primary-soft` thay vì suy luận chức năng từ số thang đỏ. `red-500` là sắc đỏ tương tác đậm hơn primary để dùng cho chữ nhỏ.

| Việc | Token |
|---|---|
| Nền trang, nền thẻ | card `surface` (= `white`), canvas `surface-subtle`, chip `surface-muted` |
| Chữ | `ink` (xám đậm), chữ phụ `ink-muted`, ghi chú `ink-subtle` |
| Nút chính, nút chat, đầu khung chat | `primary` (= `red-600`), hover `primary-hover`, nhấn `primary-pressed` |
| Mục menu đang chọn | nền `primary-soft`, chữ `red-700`; link và dấu * dùng `red-500` |
| Nền nhấn mềm, hàng đang chọn | `primary-soft` (= `red-50`), viền `red-200` |
| Lỗi, quá hạn | chữ `danger-text`, nền `danger-surface`, viền `danger-line` |
| Kết quả AI | `ai-surface`, `ai-line`, nhãn `ai-ink` |
| Đạt / cảnh báo / thông tin | `success-text`, `warning-text`, `info` cùng các nền `*-surface` |
| Biểu đồ | `chart-1` → `chart-5`, thang `chart-seq-*`, thang phân kỳ `chart-div-*` (xem mục Biểu đồ) |

Lưu ý tương phản:
- Chữ phụ `ink-muted`, `ink-subtle`, `ink-hint` đã tăng độ đậm so với bản tham chiếu. Placeholder vẫn phải có nhãn ô nhập riêng. Kiểm tra tương phản khi đặt trên nền khác.
- `success`, `warning`, `info` dùng cho chấm và icon. Chữ trạng thái dùng `success-text`, `warning-text`; thông tin dùng `ink` trên `info-surface`.

## Chữ
Font **Lexend 500** cho heading và số KPI; **Be Vietnam Pro 400/500/600/700** cho nội dung, nút và nhãn. Các font nạp cục bộ từ `assets/fonts/`, có `font-display: swap`; không cần mạng để xem mẫu.

Thang chữ:
- `h1` 28, `h2` 20, `h3` 17, `item-title` 16 cho tiêu đề.
- `body` 14, `small` 13, `caption` 12; nút thường 14 và nút nhỏ 13.
- `overline` dành cho nhãn in hoa 12px.
- `hero` 32px, Lexend 500, viết thường theo câu; mỗi màn tối đa một banner.
- Font mã nguồn có fallback monospace; JetBrains Mono chưa được đóng gói cục bộ.

## Khoảng cách, bo góc, bóng
- **Khoảng cách:** bước 4px, gồm `space-1` (4) đến `space-10` (40). Lề trang 32px trên màn rộng, 16px trên điện thoại.
- **Bo góc:**
  - Ô nhập `radius-sm` (8px).
  - Nút `radius-md` (8px).
  - Thẻ và banner `radius-lg` (12px).
  - Chat và hộp thoại `radius-xl` (16px).
  - Chip dùng `radius-pill`; nhãn Badge dùng `radius-sm`.
- **Bóng:**
  - Thẻ nổi dùng `shadow-card`.
  - Dòng danh sách khi rê chuột đổi nền `surface-subtle`; nút phụ dùng bóng nhẹ `shadow-hover`.
  - Menu và hộp thoại dùng `shadow-pop`.
  - `shadow-brand` chỉ dùng cho icon tròn đỏ và nút chat nổi.
- **Kích thước:**
  - Nút cao `control-h` (40px), nút nhỏ `control-h-sm` (36px).
  - Ô nhập cao `input-h` (42px).
  - Thanh đầu trang cao `header-h` (80px; shell mới thu còn 68px dưới 900px).
  - Menu trái rộng `sidebar-w` (252px).
  - Nội dung rộng tối đa `content-max` (1640px).

## Chuyển động và lớp xếp chồng
- Thời lượng `duration-fast` (120ms), `duration-base` (200ms), `duration-slow` (400ms), đường cong `ease-standard`. Khi người dùng bật "giảm chuyển động" thì mọi animation tắt (đã xử lý trong `components.css`).
- Thứ tự lớp: `z-sticky` 10 < `z-dropdown` 30 < `z-drawer` 40 < `z-dialog` 50 < `z-toast` 60 < `z-tooltip` 70.
- Chữ dạng mã (trình soạn mã của `CodeEditor`) dùng `font-mono` và kiểu `text-code`.

## Bố cục
- **Màn nghiệp vụ** (HR, quản lý, recruiter): `wf-app--workspace`: sidebar bên trái có wordmark và đơn vị; topbar có breadcrumb, vai trò và avatar. Menu chuyển sang native dialog dưới 900px trong ba mẫu mới.
- **Nhân viên, ứng viên, HR, quản lý, L&D và các vai trò khác:** cùng shell sidebar. Chỉ danh sách mục, nhóm và số việc thay đổi theo quyền. Topbar chứa ngữ cảnh, công cụ và tài khoản; không lặp lại điều hướng chính.
- **Trên điện thoại:** ba mẫu v2 kiểm tra từ 320px, bảng tự cuộn trong khung; preview chuyên biệt của các component còn cần kiểm tra theo màn khi tích hợp.

### Mẫu bố cục màn hình
Thư mục [patterns/](patterns/README.md) có ba mẫu mới theo phong cách NOVA: **tổng quan**, **danh sách hồ sơ**, **chi tiết phê duyệt**, cùng hai mẫu soạn khóa học và cổng học nhân viên đã có. Ba mẫu mới có menu mobile, bộ chọn trạng thái và tương tác minh họa. Chúng không lưu dữ liệu và không cập nhật HRM.

## Section banner

[HeroBanner](components/HeroBanner/README.md) bổ sung section mở đầu theo NOVA: nền hồng phấn, tiêu đề lớn, CTA tối màu và vòng đan nhau có bóng/thẻ nổi. Có bản lớn cho tổng quan, bản gọn cho học tập/onboarding. Xem ba ví dụ trong preview. Mỗi trang tối đa một banner lớn; màn xử lý chi tiết ưu tiên hồ sơ và quyết định. PromoBanner tiếp tục là lời mời tính năng nhỏ.

## Icon
Icon nét (outline) 24px, nét 1.65px, kiểu bộ **Lucide**, hiển thị 16px trong nút và 20px trong menu. Không dùng emoji. Icon luôn đi kèm chữ, trừ nút chỉ có icon (khi đó phải có `aria-label`).

## Logo
Wordmark giữ tên "Workforce AI", dùng Lexend. Shell mới có ký tự `w` trong ô nhấn mềm làm dấu tạm, chưa phải logo sản phẩm chính thức. **Không dùng logo hay tên Vingroup** khi chưa được bộ phận thương hiệu cho phép.

## Cách viết chữ trên giao diện
- Tiếng Việt, xưng "bạn", câu ngắn, chỉ viết hoa chữ đầu câu.
- Nút là động từ + đối tượng: "Gửi đơn", "Thêm vào shortlist", "Tải CV lên".
- Thông báo lỗi nói sai gì và cách sửa: "Tệp vượt quá 5 MB. Chọn tệp nhỏ hơn rồi tải lên."
- Hộp xác nhận liệt kê hệ quả, không hỏi "Bạn có chắc không?".
- Dùng tên dễ hiểu ("Tuyển dụng", "Học tập"), không dùng mã nội bộ M1–M6.
- Số và ngày theo kiểu Việt Nam: 7,5 ngày; 1.240 hồ sơ; 21/11/2026.

## Biểu đồ và dashboard
- Mọi biểu đồ nằm trong `ChartCard`: tiêu đề, mô tả đơn vị đo và kỳ, nút chuyển **Biểu đồ / Bảng**, chú giải, dòng **nguồn và độ phủ dữ liệu**.
- **Màu chuỗi** `chart-1` → `chart-5` theo thứ tự cố định, không xoay vòng.
  - `chart-1` (đỏ thương hiệu) dành cho đơn vị hoặc nhóm đang xem.
  - Quá 5 chuỗi thì gom vào "Khác" hoặc tách nhiều biểu đồ nhỏ.
  - Bảng màu v2 chưa được kiểm tra lại bằng mô phỏng mù màu; luôn kèm chú giải và bảng số liệu. `chart-3` và `chart-4` tương phản thấp nên luôn kèm nhãn số.
- **Độ lớn** (heatmap) dùng thang một màu `chart-seq-1` → `chart-seq-5`. **So với chuẩn** (thiếu hay vượt) dùng `chart-div-neg` / `chart-div-mid` / `chart-div-pos`.
- Chữ và số trên biểu đồ dùng `ink`, `ink-muted`, không dùng màu chuỗi. Không vẽ biểu đồ hai trục tung. Màu trạng thái (đạt, cảnh báo, lỗi) không dùng làm màu chuỗi.
- Dữ liệu nhân sự: nhóm **dưới 5 người** chỉ hiện tổng hợp; 9-Box và heatmap ghi rõ là **thông tin tham khảo, không phải quyết định nhân sự**.
- Bố cục dashboard theo mẫu `DashboardPage`: PageHeader → FilterBar (phạm vi, kỳ) → KpiTile → AiPanel tóm tắt → lưới 2 cột ChartCard.

## Nhãn trạng thái dùng thống nhất
Một khái niệm chỉ có một cách gọi và một màu `Badge`, ở mọi module:

| Khái niệm | Nhãn → màu Badge |
|---|---|
| Kết quả AI | Chờ xác nhận `warning` · Đã chấp nhận `success` · Đã sửa `info` · Đã bỏ `neutral`; nội dung AI chưa ai xem `ai` |
| Đơn từ (phép, OT, giải trình) | Chờ quản lý `warning` · Chờ Thanh tra `info` · Đã duyệt `success` · Từ chối `danger` · Đã rút `neutral` |
| Nội dung khóa học, đề thi | Nháp `neutral` · Chờ rà soát `info` · Trả lại `warning` · Đã duyệt `success` · Đã xuất bản `brand` |
| Khung năng lực, cấu hình | Nháp `neutral` · Chờ duyệt `info` · Đã ban hành `success` |
| Kết quả đánh giá theo tiêu chí | Đạt `success` · Chưa đạt `danger` · Chưa đủ bằng chứng `unknown` (viền nét đứt, không phải lỗi) |
| Mức rủi ro xác minh hồ sơ | Thấp `success` · Trung bình `warning` · Cao `danger`, kèm câu "cảnh báo, không phải kết luận" |
| Mức phù hợp (matching) | Cao ≥ 70 · Trung bình 50–69 · Thấp < 50 (xem `MatchScore`) |
| Kết luận hội đồng | Tuyển (HIRE) `success` · Không tuyển (NO_HIRE) `neutral` |
| Hạn xử lý | dùng `SlaBadge`: còn hạn, sắp hết (đã nhắc), quá hạn (đã chuyển cấp, không tự duyệt) |

## Trạng thái và quyền
- Mỗi màn thiết kế đủ 5 trạng thái:
  - đang tải (`Skeleton`);
  - rỗng (`EmptyState`);
  - lỗi (`Alert`);
  - AI đang xử lý (`AiProgress`);
  - không có quyền (`NoAccess`).
- Vai trò không có quyền thì ẩn mục menu. Trong trang, các nút quyết định chuyển sang chế độ xem.
- Quản trị hệ thống không duyệt hay ra quyết định nghiệp vụ.

## Danh sách component

Danh sách dưới đây sinh tự động bởi `build.py`.

<!-- components:start -->

**Hành động**

- [Button](components/Button/README.md): Nút bấm thực hiện một hành động; nút chính đỏ đặc, cao 40px, bo 8px, Be Vietnam Pro 500 ở 14px.
- [FilterChip](components/FilterChip/README.md): Chip lọc nhanh dạng viên thuốc, lấy nguyên từ dải chọn công ty ở trang việc làm: nền xám nhạt, chọn thì đỏ `red-500` chữ trắng.

**Biểu mẫu**

- [Checkbox](components/Checkbox/README.md): Ô chọn vuông 16px; khi chọn nền `primary` và dấu tích trắng.
- [DateTimeField](components/DateTimeField/README.md): Ô chọn ngày, giờ và khoảng thời gian: ngày nghỉ, giờ OT, hạn hoàn thành khóa, hạn từng bước của kỳ đánh giá.
- [FileUpload](components/FileUpload/README.md): Tải tệp lên: vùng kéo thả (`wf-drop`) và danh sách tệp, mỗi tệp có tên, dung lượng hoặc ghi chú, trạng thái xử lý.
- [MultiSelect](components/MultiSelect/README.md): Chọn **nhiều** người, nhóm, vai trò hoặc dự án: giao học theo đối tượng, mời cộng tác viên, chọn phạm vi kỳ đánh giá.
- [RadioGroup](components/RadioGroup/README.md): Chọn **một** trong vài lựa chọn nhìn thấy hết: loại nghỉ, hình thức bài đánh giá, cách xử lý khi hết lượt làm lại.
- [SegmentedControl](components/SegmentedControl/README.md): Chọn một trong 2–4 lựa chọn ngắn đặt cạnh nhau: định dạng nội dung (Khóa học / Tình huống), kiểu xem (Biểu đồ / Bảng).
- [Switch](components/Switch/README.md): Công tắc bật/tắt một thiết lập, **có hiệu lực ngay**, không cần nút Lưu.
- [TextField](components/TextField/README.md): Ô nhập và ô chọn cao 42px, viền `line`, bo 4px, nhãn nằm trên; giống bộ lọc bên trái trang việc làm.
- [Textarea](components/Textarea/README.md): Ô nhập nhiều dòng: lý do giải trình công, ghi chú phỏng vấn, góp ý khi trả lại nội dung, mô tả mục tiêu học.

**Bố cục**

- [Drawer](components/Drawer/README.md): Bảng trượt từ cạnh phải, rộng 400px: cài đặt, chi tiết phụ, AI Tutor trong màn học.
- [FilterBar](components/FilterBar/README.md): Dải bộ lọc nằm **một hàng phía trên** danh sách, bảng hoặc biểu đồ: ô tìm kiếm, các ô chọn và nút "Xóa lọc".
- [Modal](components/Modal/README.md): Hộp thoại cho nội dung cần xem hoặc nhập mà không rời màn: tiêu đề, nút đóng, thân và chân có nút.
- [PageHeader](components/PageHeader/README.md): Đầu mỗi màn: tiêu đề Lexend 500 ở 28px/36px, mô tả và các nút hành động bên phải.
- [Pagination](components/Pagination/README.md): Phân trang cho danh sách và bảng dài: số kết quả ở bên trái, các nút trang ở bên phải; trang hiện tại nền `primary`.

**Điều hướng**

- [AppHeader](components/AppHeader/README.md): Topbar trắng cao 80px, viền `line` và đệm 32px.
- [Dropdown](components/Dropdown/README.md): Menu thả xuống từ một nút: "Xuất báo cáo", thao tác khác trên một dòng, chọn loại nội dung để tạo.
- [SideNav](components/SideNav/README.md): Menu trái 252px cho tất cả màn ứng dụng theo vai trò; mục đang mở nền `primary-soft`, chữ `red-700` đậm.
- [Stepper](components/Stepper/README.md): Thể hiện tiến trình qua các bước có thứ tự: bước xong nền `primary`, bước hiện tại viền đỏ chữ đậm, bước chưa tới `ink-subtle`.
- [Tabs](components/Tabs/README.md): Chuyển giữa các phần của cùng một hồ sơ; tab đang chọn chữ `red-700` đậm 600 với gạch chân đỏ 3px, khoảng cách giữa tab 24px.

**Hiển thị**

- [AvatarGroup](components/AvatarGroup/README.md): Nhóm avatar xếp chồng cho **cộng tác viên** của nội dung, người học một khóa, các giám khảo của buổi phỏng vấn.
- [BulkActionBar](components/BulkActionBar/README.md): Thanh thao tác hiện khi người dùng **chọn nhiều dòng**: Thanh tra phê duyệt hàng loạt ticket, Recruiter chọn 2–5 hồ sơ để so sánh.
- [Calendar](components/Calendar/README.md): Lịch tháng hiển thị **sự kiện theo ngày**: lịch vắng mặt của phòng ban (5.4), lịch phỏng vấn kèm bộ câu hỏi (2.2), các mốc sắp tới của kỳ đánh giá (6.8, 6.9).
- [Card](components/Card/README.md): Khung nội dung nền trắng, viền `line`, bo 12px, đệm 24px và bóng `shadow-card` nhẹ.
- [DataTable](components/DataTable/README.md): Bảng dữ liệu nhiều cột cho màn duyệt và báo cáo: đầu bảng in hoa nền `surface-subtle`, dòng kẻ `line`, dòng đang chọn nền `red-50`.
- [KanbanBoard](components/KanbanBoard/README.md): Bảng theo cột giai đoạn (pipeline đánh giá ứng viên): mỗi cột là một vòng, có số lượng; mỗi thẻ là một hồ sơ với cờ cảnh báo.
- [KpiTile](components/KpiTile/README.md): Ô số liệu nền trắng có viền mảnh: nhãn 13px, số Lexend 500 ở 30px/40px và ghi chú 12px.
- [ListItem](components/ListItem/README.md): Một dòng trong danh sách việc làm, hồ sơ, đơn: logo hoặc avatar 56px, tiêu đề đậm 16px, dòng thông tin phụ; rê chuột đổi nền xám nhẹ và tiêu đề đỏ đậm.
- [NotificationItem](components/NotificationItem/README.md): Một dòng thông báo: icon loại việc, nội dung, thời gian.
- [PermissionMatrix](components/PermissionMatrix/README.md): Bảng **vai trò × quyền** ở màn quản trị (S12, F27): người tạo, chuyên gia, người duyệt, người giao học, quản trị; và công tắc **quyền dùng AI theo nhóm** (tách riêng khỏi vai trò).
- [PersonCell](components/PersonCell/README.md): Avatar chữ cái đầu (nền `red-100`, chữ `red-800`) kèm tên và một dòng phụ (chức danh, đơn vị).
- [ProgressBar](components/ProgressBar/README.md): Thanh tiến độ có nhãn và con số: tiến độ onboarding, khóa học, tỷ lệ hoàn thành kỳ đánh giá.
- [QuotaMeter](components/QuotaMeter/README.md): Thanh **hạn mức và số dư**: giờ OT theo ngày/tháng/năm (5.3), số ngày phép còn lại và phần đang tạm giữ (5.4).
- [Timeline](components/Timeline/README.md): Dòng thời gian, có hai dạng.
- [TreeList](components/TreeList/README.md): Danh sách phân cấp có thể mở/thu: khung năng lực (nhóm năng lực → năng lực → mô tả theo cấp bậc, 6.7), cấu trúc bài học, cây đơn vị khi chọn phạm vi.

**Trạng thái**

- [Badge](components/Badge/README.md): Nhãn trạng thái viên thuốc có chấm màu; trạng thái **luôn có chữ**, màu chỉ hỗ trợ.
- [DataFreshness](components/DataFreshness/README.md): Dòng nhỏ nói **dữ liệu của báo cáo cập nhật lúc nào** và **phần nào chưa có thông tin**.
- [RiskBadge](components/RiskBadge/README.md): Mức rủi ro của một hồ sơ sau **xác minh bằng cấp, chứng chỉ và timeline** (1.5): thấp, trung bình, cao.
- [SlaBadge](components/SlaBadge/README.md): Thời hạn xử lý một đơn: còn thời gian (xanh), sắp hết sau mốc nhắc 75% (vàng), quá hạn (đỏ).
- [SlaCountdown](components/SlaCountdown/README.md): Bộ đếm hạn xử lý đầy đủ cho **người duyệt** và **người gửi đơn** (5.5): thời gian còn lại bằng chữ, thanh tiến trình với **vạch mốc nhắc 75%**, và nhật ký những việc hệ thống đã làm.

**AI & quyết định**

- [AiPanel](components/AiPanel/README.md): Khung kết quả AI có viền `ai-line`, đầu khung nền hồng rất nhạt `ai-surface`, nhãn và icon tia sáng màu `ai-ink`.
- [AiProgress](components/AiProgress/README.md): Trạng thái **AI đang xử lý**, một trong 5 trạng thái bắt buộc của mỗi màn (đang tải, rỗng, lỗi, AI đang xử lý, không có quyền).
- [ApprovalCard](components/ApprovalCard/README.md): Thẻ duyệt một đơn, tối ưu cho **điện thoại**: người gửi, hạn xử lý, nội dung chính, hai nút lớn.
- [CompareMatrix](components/CompareMatrix/README.md): Bảng so sánh song song 2–5 đối tượng: mỗi cột là một ứng viên, mỗi dòng là một tiêu chí (1.4).
- [ConfirmDialog](components/ConfirmDialog/README.md): Hộp xác nhận trước thao tác khó hoàn tác: tiêu đề là câu hỏi, danh sách **hệ quả** cụ thể, nút Hủy và nút xác nhận lặp lại động từ của tiêu đề.
- [CriteriaResult](components/CriteriaResult/README.md): Kết quả đánh giá theo từng tiêu chí với **3 trạng thái tách biệt**: Đạt, Chưa đạt, Chưa đủ bằng chứng.
- [DecisionBar](components/DecisionBar/README.md): Vùng **quyết định của con người**, đặt ngay dưới AiPanel: icon khiên màu ink, tiêu đề nói ai quyết định, mô tả điều kiện, và các nút quyết định.
- [IssueList](components/IssueList/README.md): Danh sách **vấn đề AI tìm thấy** khi rà soát: bàn giao thiếu hoặc mâu thuẫn so với checklist (4.2), hồ sơ lệch (3.2), cờ cảnh báo xác minh (1.5).
- [LevelRating](components/LevelRating/README.md): Chọn mức theo thang (1–5 cho rubric phỏng vấn; Junior → Expert cho năng lực).
- [MatchScore](components/MatchScore/README.md): Điểm phù hợp giữa hồ sơ và JD: vòng tròn điểm 0–100 và thanh phân rã theo 4 tiêu chí (bắt buộc 50, kinh nghiệm 25, bổ trợ 15, học vấn 10).
- [PromptComposer](components/PromptComposer/README.md): Ô nhập yêu cầu cho AI tạo nội dung (màn S1 Trang chủ tạo nội dung): vùng gõ lớn, đính kèm tài liệu hoặc link nguồn, chọn định dạng, nút tạo.
- [SkillChips](components/SkillChips/README.md): Kỹ năng khớp (xanh, viền liền), khớp một phần (vàng), còn thiếu (viền nét đứt, gạch ngang).

**Học tập & soạn nội dung**

- [Accordion](components/Accordion/README.md): **Khối nội dung** gập/mở trong bài học (và dùng được trong màn chi tiết): câu hỏi thường gặp, các bước xử lý, giải thích mở rộng.
- [CommentThread](components/CommentThread/README.md): Góp ý gắn với một khối nội dung khi rà soát khóa học (S4): đoạn được trích, người góp ý, nội dung, nút "Trả lời" và "Đã xử lý".
- [ContentBlock](components/ContentBlock/README.md): Một khối nội dung trong trình soạn khóa học (Course → Lesson → Block, S3).
- [ContentCard](components/ContentCard/README.md): Thẻ một nội dung (khóa học, scenario) trong **lưới thư viện** (S2): ảnh bìa, tên, trạng thái, người tạo, thời điểm sửa.
- [CourseCard](components/CourseCard/README.md): Một khóa **được giao** trong cổng học của nhân viên (S8): ảnh bìa nhỏ, tên khóa, hạn, tiến độ và nút **Học tiếp**.
- [OptionCard](components/OptionCard/README.md): Thẻ chọn **một trong vài lựa chọn lớn có mô tả**: định dạng nội dung (Course, Scenario), hình thức bài đánh giá, loại câu hỏi.
- [ProcessBlock](components/ProcessBlock/README.md): **Khối quy trình**: các bước **theo thứ tự** trong một bài học, mỗi bước có số, tên và mô tả.
- [QuestionEditor](components/QuestionEditor/README.md): Màn soạn **một câu hỏi** trong ngân hàng câu hỏi (S5, F20, F21): chọn loại câu, nhập đề, các đáp án (đánh dấu đáp án đúng), giải thích và nguồn.
- [QuizQuestion](components/QuizQuestion/README.md): Một câu hỏi khi làm bài (S9): số thứ tự, thời gian còn lại, nội dung câu, các lựa chọn dạng thẻ lớn.

**Hồ sơ & quy trình**

- [ApprovalChain](components/ApprovalChain/README.md): **Tuyến duyệt** của một đơn: ai duyệt trước, nếu quá hạn thì leo thang tới ai (5.5), kèm trạng thái từng người.
- [ChecklistItem](components/ChecklistItem/README.md): Một đầu việc trong checklist có **người phụ trách, hạn và bằng chứng**: checklist onboarding theo bộ phận (HR, IT, Admin, Manager) và hạng mục bàn giao khi nghỉ việc.
- [EmploymentTimeline](components/EmploymentTimeline/README.md): Trục thời gian làm việc của ứng viên, để **nhìn thấy** khoảng trống và đoạn trùng lặp (1.5).
- [ExtractedFieldsReview](components/ExtractedFieldsReview/README.md): Màn HR **đối chiếu** dữ liệu AI đọc từ giấy tờ (OCR) với dữ liệu nhân viên khai báo và hồ sơ tuyển dụng (3.2).
- [ReadinessConditions](components/ReadinessConditions/README.md): Danh sách **điều kiện bắt buộc** để hoàn tất onboarding và active vào dự án (3.3, 6.6): hồ sơ hợp lệ, thủ tục xong, tài khoản và thiết bị được cấp, đào tạo xong, bài kiểm tra đạt.
- [SignoffList](components/SignoffList/README.md): Danh sách **xác nhận của nhiều bên** cho cùng một hồ sơ: các bộ phận HR, IT, Admin, Finance trong đóng hồ sơ nghỉ việc (4.3); người nhận và Manager khi bàn giao (4.2).

**Đánh giá**

- [AssessmentPlayer](components/AssessmentPlayer/README.md): Màn **làm bài** của ứng viên (đánh giá kỹ thuật 2.1) và nhân viên (đánh giá năng lực 6.5).
- [CodeEditor](components/CodeEditor/README.md): Khung soạn mã cho **bài lập trình** trong đánh giá kỹ thuật (Coding Challenge, 2.1) và bài thực hành (6.5).
- [GapBar](components/GapBar/README.md): Thanh **khoảng trống năng lực**: mức hiện tại so với mức chuẩn của vai trò hoặc mục tiêu (6.1, 6.8).
- [LevelMatrix](components/LevelMatrix/README.md): Bảng **khung năng lực** (S13, 6.7): mỗi hàng là một năng lực, mỗi cột là một cấp bậc (giả định Junior, Professional, Senior, Expert), mỗi ô là **mô tả hành vi** ở cấp đó.
- [RubricGrid](components/RubricGrid/README.md): Bảng rubric: mỗi hàng là một tiêu chí, mỗi cột là một mức điểm kèm **mô tả hành vi và bằng chứng cụ thể**.

**Biểu đồ**

- [BarChart](components/BarChart/README.md): Biểu đồ cột ngang so sánh một chỉ số giữa các đơn vị (6.9: so sánh giữa các đơn vị).
- [ChartCard](components/ChartCard/README.md): Khung chung cho **mọi biểu đồ**: tiêu đề, một dòng mô tả số liệu, nút chuyển "Biểu đồ / Bảng", thân biểu đồ, chú giải và dòng nguồn ở chân.
- [Heatmap](components/Heatmap/README.md): Lưới mức thành thạo theo **kỹ năng × cấp bậc** (6.9, US-6.9.2).
- [NineBox](components/NineBox/README.md): Ma trận 3×3: trục ngang **hiệu suất** (lấy từ HRM), trục dọc **tiềm năng** (Lead xếp ở 6.8); mỗi ô ghi số người (6.9, US-6.9.3).
- [RadarChart](components/RadarChart/README.md): So sánh hồ sơ năng lực của một nhóm với **chuẩn vai trò** trên 5–8 nhóm năng lực (6.9, US-6.9.2).

**Gợi ý & trợ lý**

- [AiTutor](components/AiTutor/README.md): **Trợ lý học tập** gắn trong màn học của một khóa (6.4): nhân viên hỏi về nội dung đang học, AI trả lời **chỉ dựa trên nội dung đã duyệt của khóa** và tài liệu người học được phép truy cập, kèm nguồn.
- [ChatAssistant](components/ChatAssistant/README.md): Khung trò chuyện với trợ lý HR, đầu khung đỏ, bong bóng người dùng đỏ chữ trắng, bong bóng trợ lý `ai-surface`, bo 16px; nút nổi tròn đỏ 56px ở góc phải dưới, hover `red-800`.
- [DraftCard](components/DraftCard/README.md): **Thẻ bản nháp** trong khung chat: trợ lý soạn sẵn đơn nghỉ, phiếu OT hoặc ticket giải trình công, người dùng kiểm tra rồi mới bấm gửi.
- [HeroBanner](components/HeroBanner/README.md): Section banner theo phong cách NOVA: nền hồng phấn, tiêu đề Lexend lớn, nút tối màu, vòng đan nhau có bóng và thẻ nổi.
- [PromoBanner](components/PromoBanner/README.md): Khối giới thiệu một tính năng AI: nền `primary-soft`, viền `red-200`, tiêu đề Lexend 500 ở 20px/28px, icon tròn đỏ, tối đa 3 điểm lợi ích và một nút chính.

**Phản hồi**

- [Alert](components/Alert/README.md): Thông báo nằm trong trang: lỗi (`danger`, luôn có mô tả lỗi), cảnh báo, thông tin.
- [EmptyState](components/EmptyState/README.md): Trạng thái rỗng (`wf-empty`, viền nét đứt xám) và vùng kéo-thả tệp (`wf-drop`, nền `red-50`, viền nét đứt `red-300`, theo hộp tải CV của trang).
- [NoAccess](components/NoAccess/README.md): Trạng thái **không có quyền**: người dùng mở link tới trang hoặc hồ sơ ngoài quyền của vai trò.
- [Skeleton](components/Skeleton/README.md): Trạng thái **đang tải**: các khối xám nhấp nháy theo đúng hình dạng nội dung sắp hiện (tiêu đề, ô số liệu, dòng chữ).
- [Toast](components/Toast/README.md): Thông báo ngắn sau một thao tác, hiện ở giữa phía trên màn hình trong 4 giây.
- [Tooltip](components/Tooltip/README.md): Giải thích ngắn cho một icon hoặc nút bị khóa.

**Mẫu màn**

- [DashboardPage](components/DashboardPage/README.md): Mẫu màn **Dashboard năng lực và nhân tài** (6.9, màn S15), ghép từ các component có sẵn.
- [HomePage](components/HomePage/README.md): Mẫu màn **Tổng quan theo vai trò**: lời chào, hàng KpiTile, danh sách "Việc cần tôi xử lý" (ListItem kèm SlaBadge, sắp theo hạn) và thông báo mới.

<!-- components:end -->
