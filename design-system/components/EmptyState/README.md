# EmptyState

Trạng thái rỗng (`wf-empty`, viền nét đứt xám) và vùng kéo-thả tệp (`wf-drop`, nền `red-50`, viền nét đứt `red-300`, theo hộp tải CV của trang).

## Quy tắc
Mỗi danh sách đều có trạng thái rỗng: tiêu đề nói chưa có gì, một câu nói khi nào sẽ có hoặc nút tạo mới.

## Các trạng thái liên quan
- Đang tải: `Skeleton`. AI đang xử lý: `AiProgress`.
- Không có quyền: `NoAccess`.
- Tệp đã chọn trong vùng kéo-thả: `FileUpload`.
