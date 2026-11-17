# RubricGrid

Bảng rubric: mỗi hàng là một tiêu chí, mỗi cột là một mức điểm kèm **mô tả hành vi và bằng chứng cụ thể**. Dùng cho rubric phỏng vấn 5 mức (2.2, 2.3), rubric bài đánh giá (6.5) và `LevelMatrix` của khung năng lực.

| Trạng thái ô | Cách hiển thị |
|---|---|
| Mặc định | Bấm được để chọn mức |
| Giám khảo đã chọn | `aria-selected="true"`: nền `red-50`, viền trong `red-500` |
| AI gợi ý | `data-ai`: nền `ai-surface`, viền xám; kèm `Badge ai` |

## Quy tắc
- Tiêu đề cột ghi **số và tên mức** ("3 · Đạt chuẩn"). Mô tả mỗi ô là hành vi quan sát được, không viết "tốt", "kém".
- Gợi ý của AI nêu **câu trả lời của ứng viên làm căn cứ** (trong `AiPanel` đi kèm), không chỉ đưa số.
- Rubric đã gửi cho hội đồng thì khóa nội dung, chỉ chọn mức.
- Trên điện thoại bảng cuộn ngang, cột tiêu chí dính bên trái.
