# ContentCard

Thẻ một nội dung (khóa học, scenario) trong **lưới thư viện** (S2): ảnh bìa, tên, trạng thái, người tạo, thời điểm sửa. Cả thẻ bấm được để mở. Dùng khung lưới `wf-grid`. Danh sách dày dùng `ListItem`.

## Trạng thái nội dung (Badge)
`neutral` Nháp → `info` Chờ rà soát → `success` Đã duyệt → `brand` Đã xuất bản; `warning` Cần sửa (đã trả lại, kèm số góp ý).

## Quy tắc
- Chưa có ảnh bìa dùng khối gradient `red-50` kèm icon, không dùng ảnh minh họa chung chung.
- Dòng cuối: `PersonCell` rút gọn hoặc tên người tạo; thời gian sửa dạng "Sửa 2 giờ trước" kèm ngày đầy đủ trong `title`.
- Nội dung **đang làm dở** nổi lên đầu thư viện, mang nhãn "Đang làm dở".
- Nội dung do AI soạn nháp chưa duyệt mang `Badge ai`, giữ cho đến khi có người xác nhận.
- Nhãn trạng thái luôn bằng chữ. Thẻ có thao tác nhanh dùng `Dropdown` (menu ba chấm) với `aria-label`.
