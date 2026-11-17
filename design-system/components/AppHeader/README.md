# AppHeader

Topbar trắng cao 80px, viền `line` và đệm 32px. Dùng cùng sidebar cho mọi vai trò: nhân viên, ứng viên, HR, quản lý và L&D.

## Cấu trúc chung
Wordmark nằm trong SideNav; topbar chứa breadcrumb/ngữ cảnh bên trái và công cụ, thông báo, tài khoản bên phải. Danh sách mục trong sidebar thay đổi theo quyền. Không dùng menu ngang làm điều hướng chính của cổng nhân viên nữa; `wf-topnav` chỉ được giữ để tương thích HTML cũ.

## Responsive và truy cập
Trong `wf-app--workspace`, dưới 900px hiện nút mở menu, topbar cao 68px. Mẫu màn và prototype dùng native dialog cho menu mobile, có nút đóng và hỗ trợ Escape. Nút chỉ icon phải có aria-label.
