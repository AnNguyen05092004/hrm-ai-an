# Runbook sao lưu volume (bản 3)

## mục 1
Volume lưu bền nhưng vẫn có thể mất khi máy chủ hỏng hoặc chạy nhầm lệnh xóa. Sao lưu định kỳ giúp khôi phục nhanh.

## mục 2
Không cần dừng ghi nếu dùng snapshot của ổ đĩa. Chạy container tạm gắn volume, nén bằng tar, kiểm tra file sao lưu.

## mục 2.3
docker run --rm -v pgdata:/data -v $(pwd):/backup busybox tar czf /backup/pgdata.tar.gz /data
