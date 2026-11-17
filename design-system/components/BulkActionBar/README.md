# BulkActionBar

Thanh thao tác hiện khi người dùng **chọn nhiều dòng**: Thanh tra phê duyệt hàng loạt ticket, Recruiter chọn 2–5 hồ sơ để so sánh. Nền `ink`, dính đáy vùng bảng (`wf-bulk--sticky`).

## Thành phần
- Ô chọn ở đầu bảng (`th.wf-th-check`) có 3 trạng thái: chưa chọn, chọn một phần (`indeterminate`), chọn hết.
- Thanh hiện số đã chọn bằng chữ ("Đã chọn 7 ticket"), nút bỏ chọn, các nút hành động bên phải (`wf-bulk-end`).

## Quy tắc
- Nút phê duyệt hàng loạt **luôn mở `ConfirmDialog`** liệt kê hệ quả ("Mở khóa bảng công của 7 nhân viên").
- Có giới hạn số lượng (so sánh 2–5) thì ghi ngay trên thanh: "Chọn thêm 1 hồ sơ để so sánh", và khóa nút đến khi đủ.
- Chỉ chọn được dòng đủ điều kiện (ví dụ ticket đã có xác nhận của quản lý). Dòng không đủ điều kiện khóa ô chọn kèm lý do.
- Chọn "tất cả" chỉ áp dụng cho dòng đang hiện, không âm thầm gồm cả trang khác.
