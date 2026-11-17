# DataTable

Bảng dữ liệu nhiều cột cho màn duyệt và báo cáo: đầu bảng in hoa nền `surface-subtle`, dòng kẻ `line`, dòng đang chọn nền `red-50`.

## Quy tắc
- Bảng luôn nằm trong `wf-table-wrap` để tự cuộn ngang trên màn hẹp; trang không bao giờ cuộn ngang.
- Cột số căn phải với `wf-num`.
- Trạng thái dùng Badge, hạn dùng SlaBadge, người dùng PersonCell.

## Thành phần đi kèm
- Chọn nhiều dòng: `Checkbox` ở đầu bảng và `BulkActionBar`.
- Danh sách dài: `Pagination`. Tìm và lọc: `FilterBar` + `FilterChip`.
- So sánh song song các đối tượng (cột đầu dính): `CompareMatrix`.
- Chi tiết một dòng mà không rời danh sách: `Drawer`.
