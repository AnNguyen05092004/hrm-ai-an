# AvatarGroup

Nhóm avatar xếp chồng cho **cộng tác viên** của nội dung, người học một khóa, các giám khảo của buổi phỏng vấn. Mỗi avatar viền trắng 2px chồng lên nhau 8px; phần dư gom vào `wf-avatar--more` ("+3"); `wf-avatar--add` (viền nét đứt) là nút mời thêm.

## Quy tắc
- Hiện tối đa 4 avatar rồi "+n". Bấm vào nhóm mở danh sách đầy đủ (kèm vai trò: sửa hay chỉ xem) bằng `Dropdown` hoặc `Drawer`.
- Mỗi avatar có `title` và `aria-label` là họ tên; cả nhóm có nhãn tổng ("5 cộng tác viên").
- Không dùng để đại diện cho **người ra quyết định** (dùng `PersonCell` ghi rõ vai trò).
- Nút mời chỉ hiện khi người dùng có quyền mời.
