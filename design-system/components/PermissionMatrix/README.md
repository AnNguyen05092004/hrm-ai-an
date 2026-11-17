# PermissionMatrix

Bảng **vai trò × quyền** ở màn quản trị (S12, F27): người tạo, chuyên gia, người duyệt, người giao học, quản trị; và công tắc **quyền dùng AI theo nhóm** (tách riêng khỏi vai trò). Ô là `Checkbox` hoặc `Switch`, tiêu đề cột là tên quyền.

## Quy tắc
- Quyền dùng AI là **bảng riêng**: một công tắc "Tạo nội dung bằng AI" mỗi nhóm, vì quyền này độc lập với vai trò.
- Đổi quyền ảnh hưởng nhiều người thì mở `ConfirmDialog` nêu số người bị ảnh hưởng và có ghi nhật ký.
- **Quản trị hệ thống không duyệt hay ra quyết định nghiệp vụ**: ô "Duyệt xuất bản" của vai trò Quản trị khóa và ghi lý do bằng tooltip.
- Tách người **tạo** và người **duyệt**: một người không tự duyệt nội dung mình tạo; ghi nguyên tắc dưới bảng.
- Cột đầu cố định khi cuộn ngang; mỗi checkbox có `aria-label` "Người tạo: Tạo nội dung".
