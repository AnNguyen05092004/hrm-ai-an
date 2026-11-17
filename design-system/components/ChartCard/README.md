# ChartCard

Khung chung cho **mọi biểu đồ**: tiêu đề, một dòng mô tả số liệu, nút chuyển "Biểu đồ / Bảng", thân biểu đồ, chú giải và dòng nguồn ở chân. Ảnh mẫu đang ở chế độ Bảng.

## Bắt buộc có
1. Tiêu đề nói biểu đồ trả lời câu hỏi gì; mô tả ghi đơn vị đo và kỳ.
2. Chế độ **Bảng** với cùng số liệu (cho người không phân biệt màu, đọc màn hình, in).
3. **Nguồn, kỳ dữ liệu và độ phủ dữ liệu** ở chân (6.9: nhận định phải có nguồn và độ phủ).
4. Chú giải khi có từ 2 chuỗi trở lên.

## Màu biểu đồ
- Chuỗi dùng `chart-1` → `chart-5` theo **thứ tự cố định**, không xoay vòng. `chart-1` (đỏ thương hiệu) dành cho đơn vị hoặc nhóm đang xem.
- Độ lớn (heatmap) dùng thang `chart-seq-1` → `chart-seq-5`; so với chuẩn (thiếu/vượt) dùng `chart-div-neg`, `chart-div-mid`, `chart-div-pos`.
- Bảng màu đã kiểm tra bằng công cụ: phân biệt được với người mù màu khi đặt cạnh nhau. `chart-3`, `chart-4` tương phản thấp nên luôn kèm nhãn số.
- Chữ, số, nhãn luôn dùng màu chữ (`ink`, `ink-muted`), không dùng màu của chuỗi.
- Không dùng biểu đồ hai trục tung; không dùng màu trạng thái (đạt/cảnh báo/lỗi) làm màu chuỗi.

## Tương tác
Rê chuột lên từng cột, ô, điểm thì hiện giá trị chính xác. Bộ lọc nằm một hàng phía trên (FilterBar).

## Trạng thái
Chưa có kết quả đã xác nhận thì hiện EmptyState nêu lý do ("Kỳ 2/2026 chưa có kết quả đã xác nhận"), không vẽ biểu đồ rỗng.
