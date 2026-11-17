# Tooltip

Giải thích ngắn cho một icon hoặc nút bị khóa. Hiện khi rê chuột **và khi focus bàn phím**. Nền `ink`, chữ trắng, tối đa 240px.

## Dùng khi
- Nút chỉ có icon (nhắc lại `aria-label`).
- **Lý do một nút bị khóa**: "Chờ 2 giám khảo xác nhận điểm".
- Giải thích thuật ngữ ("Độ lệch điểm > 2,0 trên thang 5").

## Không nên
- Không đặt thông tin bắt buộc phải đọc trong tooltip: điện thoại không có hover. Thông tin quan trọng viết thẳng ra trang.
- Không chứa nút hoặc liên kết. Cần tương tác thì dùng Drawer hoặc Dropdown.
- Không quá 2 dòng.

## Vị trí
Mặc định hiện phía trên, căn giữa. Phần tử sát mép phải màn hình thêm `wf-tip--end` (căn mép phải) để tooltip không bị cắt hoặc gây cuộn ngang.
