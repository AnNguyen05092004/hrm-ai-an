# SideNav

Menu trái 252px cho tất cả màn ứng dụng theo vai trò; mục đang mở nền `primary-soft`, chữ `red-700` đậm. Bản v2 dùng trạng thái nền mềm, không có vạch đỏ bên trái.

## Người dùng cung cấp
Danh sách mục đã lọc theo vai trò, nhóm mục bằng `wf-side-group`, số việc chờ bằng `wf-count`. Thêm `wf-side-brand` cho wordmark và `wf-workspace-label` cho đơn vị.

## Bố cục
`wf-app--workspace` giữ sidebar sticky, cao 100vh và cuộn nội bộ. Dưới 900px ẩn sidebar desktop, nút topbar mở native dialog; xem `patterns/preview.js` để nối hành vi minh họa. Prototype đã dùng shell chung cho cả nhân viên và ứng viên; quyền của từng mục vẫn do route quy định.
