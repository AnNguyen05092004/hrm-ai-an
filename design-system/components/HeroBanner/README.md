# HeroBanner

Section banner theo phong cách NOVA: nền hồng phấn, tiêu đề Lexend lớn, nút tối màu, vòng đan nhau có bóng và thẻ nổi. Dùng để giới thiệu mục tiêu của một trang tổng quan hoặc một hành trình.

## Biến thể
- `wf-hero`: bản lớn, tiêu đề 36px và chiều cao tối thiểu 320px; dùng cho tổng quan.
- `wf-hero wf-hero--compact`: bản gọn, tiêu đề 28px và chiều cao tối thiểu 244px; dùng cho học tập, onboarding hoặc cơ hội nội bộ.
- `wf-btn--dark`: CTA nền ink, chữ trắng. Chỉ một CTA trong banner.

## Cấu trúc
`wf-hero-copy` gồm `wf-hero-eyebrow`, heading `wf-hero-title`, mô tả `wf-hero-desc` và link hành động. `wf-hero-art` là minh họa CSS, có aria-hidden; không cần tải ảnh hoặc dùng logo NOVA. Màu dùng token `banner-*`; các vòng là trang trí, không biểu diễn dữ liệu.

## Quy tắc
- Mỗi trang tối đa một banner lớn. Không chèn vào mọi màn xử lý chi tiết hoặc đặt trước cảnh báo quan trọng.
- Mỗi trang vẫn chỉ có một h1; heading banner dùng h2. Nhãn và CTA viết theo nội dung thật, không hứa chức năng chưa có.
- Bên dưới 760px ẩn minh họa, giữ nội dung 28px và CTA. Không thu chữ còn 7–10px như bản tham chiếu.
- PromoBanner tiếp tục dành cho lời mời tính năng nhỏ; HeroBanner dành cho section mở đầu trang.

Xem ba mẫu trong preview và các trang `patterns/workspace-overview.html`, `patterns/learner-portal.html`.
