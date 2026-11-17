# DashboardPage

Mẫu màn **Dashboard năng lực và nhân tài** (6.9, màn S15), ghép từ các component có sẵn. Dùng làm khung cho mọi dashboard khác (báo cáo học S11, báo cáo nghỉ việc 4.3).

## Thứ tự từ trên xuống
1. PageHeader: tiêu đề và hành động tiếp theo (lập kế hoạch đào tạo 6.2, xem gợi ý ứng viên nội bộ 1.3).
2. FilterBar: phạm vi và kỳ. Phạm vi chỉ gồm những gì người xem có quyền.
3. Hàng KpiTile (tối đa 4).
4. AiPanel tóm tắt điểm đáng chú ý, kèm số liệu, nguồn và độ phủ dữ liệu; không kết luận về cá nhân.
5. Lưới 2 cột các ChartCard: Heatmap, RadarChart, NineBox, BarChart, tiến độ kỳ và mốc sắp tới.

## Quy tắc
- Chưa có kết quả đã xác nhận: thay phần 3–5 bằng EmptyState nêu lý do.
- Lead chỉ đi sâu tới người mình quản lý; nhóm dưới 5 người chỉ hiện tổng hợp.
- Trên màn hẹp, lưới chuyển thành 1 cột.
