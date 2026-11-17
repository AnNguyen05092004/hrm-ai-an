# Button

Nút bấm thực hiện một hành động; nút chính đỏ đặc, cao 40px, bo 8px, Be Vietnam Pro 500 ở 14px.

## Biến thể
| Lớp | Dùng khi |
|---|---|
| `wf-btn--dark` | CTA tối màu trong HeroBanner; mỗi banner một CTA. |
| `wf-btn--primary` | Hành động chính của vùng. **Mỗi vùng tối đa 1 nút đỏ.** Hover đậm hơn `primary-hover`, nhấn tối đi `primary-pressed`. |
| `wf-btn--secondary` | Hủy, quay lại: nền trắng, viền `line-strong` và chữ `ink`. |
| `wf-btn--outline` | Hành động phụ nhưng vẫn cần nổi (Xem chi tiết, Tải mẫu). |
| `wf-btn--ghost` | Hành động ít quan trọng, nút trong thanh công cụ. |
| `wf-btn--sm` | Cao 36px, trong dòng danh sách và bảng. |
| `wf-btn--icon` | Nút chỉ có icon; luôn có `aria-label`. |

## Người dùng cung cấp
Nhãn là **động từ + đối tượng** ("Gửi đơn", "Thêm vào shortlist"), không viết "OK", "Xác nhận" chung chung. Icon đứng trước chữ, 16px.

## Nên / không nên
- Nên khóa nút (`disabled`) khi chưa đủ điều kiện và ghi lý do ngay cạnh, ví dụ "Chờ 2 giám khảo xác nhận điểm".
- Không dùng nút đỏ cho hành động xóa; xóa dùng `secondary` rồi xác nhận bằng ConfirmDialog.
