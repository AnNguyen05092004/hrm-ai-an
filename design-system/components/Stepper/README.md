# Stepper

Thể hiện tiến trình qua các bước có thứ tự: bước xong nền `primary`, bước hiện tại viền đỏ chữ đậm, bước chưa tới `ink-subtle`.

## Dùng khi
Quy trình cố định: vòng tuyển dụng, onboarding (HR xác nhận → Lead xác nhận), các bước AI xử lý CV. Tối đa 6 bước.

## Phân biệt
- Tiến độ của **một đối tượng đang chạy** (vòng tuyển dụng, onboarding): dùng Stepper này.
- Các bước **để đọc** trong bài học: `ProcessBlock`.
- Tuyến **người duyệt** và leo thang: `ApprovalChain`.
- Dòng lịch sử đã xảy ra: `Timeline`.
