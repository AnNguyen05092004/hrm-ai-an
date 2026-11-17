# ApprovalChain

**Tuyến duyệt** của một đơn: ai duyệt trước, nếu quá hạn thì leo thang tới ai (5.5), kèm trạng thái từng người. Khác `Stepper` (tiến trình cố định, không có người): mỗi nút là một **người hoặc nhóm** với vai trò và trạng thái.

| Lớp nút | Nghĩa |
|---|---|
| `wf-chain-node--current` | Người đang phải xử lý (viền đỏ) |
| `wf-chain-node--escalate` | Nút leo thang: viền nét đứt, **chỉ hoạt động khi quá hạn** |
| mặc định | Đã xử lý hoặc chưa tới |

## Quy tắc
- Nút leo thang ghi điều kiện bằng chữ: "Nếu quá hạn 2 giờ" và **không** hiển thị như đã duyệt.
- Mỗi nút ghi vai trò (Quản lý trực tiếp, Trưởng khối, Thanh tra), tên người và trạng thái bằng `Badge`.
- Đơn bị từ chối hoặc không duyệt: các nút sau chuyển xám, ghi "Dừng tại đây" kèm lý do.
- Tuyến duyệt lấy từ cấu hình theo loại đơn, đơn vị; người dùng không sửa được tuyến trên màn này.
