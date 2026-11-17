# TextField

Ô nhập và ô chọn cao 42px, viền `line`, bo 4px, nhãn nằm trên; giống bộ lọc bên trái trang việc làm.

## Thành phần
`wf-field` bọc `wf-label` (dấu * đỏ `wf-req` khi bắt buộc), `wf-input` (thêm `wf-select` cho ô chọn), và `wf-help` cho gợi ý hoặc lỗi.

## Quy tắc
- Focus: viền `red-500` và vòng `red-100`.
- Lỗi: viền và chữ `danger-text`, câu lỗi nói **sai gì và sửa thế nào**.
- Placeholder chỉ là ví dụ, không thay nhãn (placeholder `ink-hint` quá nhạt để đọc).

## Các ô nhập khác
`Textarea` (nhiều dòng) · `RadioGroup` (chọn một) · `Switch` (bật/tắt ngay) · `DateTimeField` (ngày, giờ, khoảng) · `FilterBar` (tìm kiếm, thanh lọc) · `MultiSelect` (chọn nhiều người, nhóm) · `FileUpload` (tệp đã chọn). Tất cả dùng chung nhãn, trạng thái focus và lỗi của TextField.
