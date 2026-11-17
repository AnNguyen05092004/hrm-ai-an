# DraftCard

**Thẻ bản nháp** trong khung chat: trợ lý soạn sẵn đơn nghỉ, phiếu OT hoặc ticket giải trình công, người dùng kiểm tra rồi mới bấm gửi. Thực hiện nguyên tắc của `ChatAssistant`: **trợ lý không tự gửi**.

Cấu trúc: `wf-draft-head` (nhãn "Bản nháp, chưa gửi" + trạng thái kiểm tra) → `wf-draft-body` (cặp nhãn–giá trị) → `wf-draft-foot` (nút).

## Quy tắc
- Đầu thẻ luôn ghi **"Bản nháp, chưa gửi"**. Gửi xong thẻ đổi thành "Đã gửi" và dùng `Toast`.
- Thân thẻ liệt kê đủ điều người duyệt cần: loại, ngày giờ, dự án, **hạn mức hoặc số dư còn lại**, người duyệt, hạn SLA dự kiến.
- Kết quả kiểm tra của bot hiện bằng huy hiệu: "Đủ hạn mức" (`success`) hoặc **"Vượt hạn mức"** (`danger`) và khi đó **không có nút Gửi**, chỉ có nút sửa và lý do.
- Nút chính ghi động từ + đối tượng ("Gửi đơn", "Gửi phiếu OT"). Nút phụ là "Sửa".
- Gợi ý trả lời nhanh (`wf-quick`) đặt **dưới** tin nhắn của trợ lý, tối đa 3 gợi ý, dùng `FilterChip`.
