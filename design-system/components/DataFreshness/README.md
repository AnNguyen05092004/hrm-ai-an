# DataFreshness

Dòng nhỏ nói **dữ liệu của báo cáo cập nhật lúc nào** và **phần nào chưa có thông tin**. Dùng ở đầu báo cáo tổng hợp tình trạng nghỉ việc (4.3), dashboard năng lực (độ phủ dữ liệu, 6.9) và mọi báo cáo do AI tổng hợp.

## Quy tắc
- Luôn ghi **thời điểm** theo kiểu Việt Nam: "Cập nhật 16/11/2026 10:30".
- Dữ liệu cũ hơn ngưỡng cấu hình thì chuyển `wf-fresh--stale` (chữ vàng) và nói rõ: "Dữ liệu HRM chưa đồng bộ từ 14/11".
- Nêu **phần chưa có thông tin** thành số cụ thể và liên kết tới danh sách ("3 hạng mục chưa có xác nhận"), vì AI không được suy đoán phần thiếu.
- Có nút "Làm mới" khi người dùng có quyền yêu cầu tổng hợp lại.
- Báo cáo thể hiện **độ phủ** ("Dữ liệu của 118/142 người") thay vì để người xem tưởng là toàn bộ.
