# Độ phủ: use case → component

Đối chiếu 28 use case của 6 module (và 15 màn hình M6) với component trong thư viện. Dùng khi vẽ màn mới để biết dùng component nào; khi có use case mới thì thêm một dòng và kiểm tra còn thiếu gì.

Cột "Component" liệt kê thành phần chính. Các component dùng khắp nơi (Button, Badge, Card, Alert, Toast, ConfirmDialog, EmptyState, Skeleton, AiProgress, NoAccess) không ghi lại từng dòng. Tên component là thư mục trong `components/`.

> Trạng thái: mọi use case dưới đây đã có đủ component. Phần chưa có là màn hình ghép (ngoài các mẫu trong `patterns/`, `DashboardPage` và `HomePage`) và nội dung thật cho từng màn, thuộc về bước thiết kế màn.

## M1: Tuyển dụng và tái bố trí
| UC | Màn / việc | Component |
|---|---|---|
| 1.1 Tìm CV theo JD | Danh sách hồ sơ xếp theo điểm, chọn shortlist | ListItem, MatchScore, SkillChips, FilterChip, Checkbox, FilterBar, Pagination, BulkActionBar, Skeleton, AiProgress (AI đang xử lý) |
| 1.2 Gợi ý JD theo CV | Tải CV, thông tin AI đọc được, danh sách JD | EmptyState (`wf-drop`), FileUpload, AiPanel, MatchScore, SkillChips, PromoBanner |
| 1.3 Tái bố trí | Ba nhóm tương thích, duyệt, phiếu chuyển giao | Tabs, DataTable, Badge, AiPanel, DecisionBar, Stepper, MultiSelect, Textarea, DateTimeField |
| 1.4 So sánh ứng viên | Ma trận 2–5 ứng viên, xuất PDF/XLSX | CompareMatrix, BulkActionBar, Dropdown, MatchScore |
| 1.5 Xác minh hồ sơ | Báo cáo rủi ro, cờ cảnh báo, trục thời gian | RiskBadge, EmploymentTimeline, IssueList, AiPanel |

## M2: Đánh giá và phỏng vấn
| UC | Màn / việc | Component |
|---|---|---|
| 2.1 Đánh giá kỹ thuật | Ứng viên làm bài (có bài code), báo cáo xác minh | AssessmentPlayer, CodeEditor, QuizQuestion, ProgressBar, AiPanel, SkillChips, DecisionBar |
| 2.2 Chuẩn bị phỏng vấn | Bộ câu hỏi, rubric 5 mức, lịch hội đồng | RubricGrid, AiPanel, Calendar, Tabs |
| 2.3 Chấm và tổng hợp | Ghi chú/transcript, điểm AI gợi ý, chênh lệch giám khảo, báo cáo hợp nhất | Textarea, FileUpload, LevelRating, RubricGrid, CompareMatrix, AiPanel, DecisionBar, Stepper |

## M3: Onboarding
| UC | Màn / việc | Component |
|---|---|---|
| 3.1 Khởi tạo và điều phối | Checklist theo bộ phận, tiến độ, cảnh báo trễ | ChecklistItem, ProgressBar, SlaBadge, PersonCell, DataTable, NotificationItem |
| 3.2 Hồ sơ nhân sự | Cổng tải giấy tờ, OCR, đối chiếu, HR xác nhận | EmptyState (`wf-drop`), FileUpload (đã xác minh, cần bổ sung, lỗi), ExtractedFieldsReview, AiPanel, DecisionBar |
| 3.3 Đào tạo và kích hoạt | Điều kiện bắt buộc, xác nhận HR rồi Lead | ReadinessConditions, ProgressBar, CourseCard, Stepper, DecisionBar |

## M4: Nghỉ việc và bàn giao
| UC | Màn / việc | Component |
|---|---|---|
| 4.1 Soạn nháp bàn giao | Bản nháp AI, Manager chốt phạm vi và người nhận | AiPanel, ChecklistItem (đề xuất AI), MultiSelect, DecisionBar |
| 4.2 Rà soát bàn giao | Bằng chứng, vấn đề AI tìm thấy, người nhận xác nhận hoặc làm lại | FileUpload, IssueList, ChecklistItem, ConfirmDialog (có nhập lý do), SignoffList |
| 4.3 Tổng hợp tồn đọng | Báo cáo từng người và cả đợt, yêu cầu xử lý, đóng hồ sơ | BarChart (cột chồng), DataFreshness, SignoffList, DataTable, Pagination, KpiTile, DecisionBar |

## M5: Chatbot HR
| UC | Màn / việc | Component |
|---|---|---|
| 5.1 Tra cứu chính sách | Hỏi đáp có trích dẫn, chuyển chuyên viên HR | ChatAssistant (`wf-cite`), gợi ý nhanh `wf-quick`, Alert (khi không đủ căn cứ thì chuyển chuyên viên HR) |
| 5.2 Giải trình công | Ticket có minh chứng; quản lý xác nhận một chạm; Thanh tra duyệt hàng loạt | DraftCard, FileUpload, ApprovalCard, BulkActionBar, DataTable, Drawer, ConfirmDialog, Timeline, SlaCountdown |
| 5.3 Đăng ký OT | Kiểm tra hạn mức, phiếu gửi duyệt | QuotaMeter, DateTimeField, DraftCard, ApprovalCard |
| 5.4 Xin nghỉ phép | Số dư, tạm giữ, lịch vắng mặt | QuotaMeter, RadioGroup, DateTimeField, Calendar, DraftCard |
| 5.5 SLA và leo thang | Hạn, nhắc, quá hạn, lịch sử vi phạm | SlaBadge, SlaCountdown, ApprovalChain, Timeline, NotificationItem |

## M6: Đào tạo và phát triển (15 màn hình)
| Màn | Component |
|---|---|
| S1 Trang chủ tạo nội dung | PromptComposer, OptionCard, ContentCard, FileUpload, Skeleton, AiProgress |
| S2 Thư viện nội dung | FilterBar (thanh lọc), Tabs, ContentCard (`wf-grid`), ListItem, Pagination, Dropdown, FilterChip |
| S3 Trình soạn khóa học | TreeList, ContentBlock, Accordion, ProcessBlock, QuizQuestion, AvatarGroup, Switch, FileUpload, PageHeader, Tooltip, Timeline (phiên bản). Mẫu: `patterns/course-editor.html` |
| S4 Rà soát và góp ý | CommentThread, ContentBlock (chế độ xem), DecisionBar, Textarea, ConfirmDialog |
| S5 Ngân hàng câu hỏi | QuestionEditor, QuizQuestion, DataTable, BulkActionBar, Badge, AiPanel |
| S6 Cấu hình đánh giá | TextField, RadioGroup, Switch, DateTimeField, MultiSelect, DecisionBar (gửi duyệt cấu hình) |
| S7 Giao học và lộ trình | MultiSelect, DateTimeField, DataTable, ProgressBar, Stepper |
| S8 Cổng học của nhân viên | CourseCard, ProgressBar, AiTutor, Tabs. Mẫu: `patterns/learner-portal.html` |
| S9 Làm bài và xem kết quả | AssessmentPlayer, QuizQuestion, CriteriaResult, CodeEditor |
| S10 Chấm và xác nhận | LevelRating, RubricGrid, CriteriaResult, AiPanel, DecisionBar, DataTable |
| S11 Báo cáo học | KpiTile, DataTable, ProgressBar, BarChart, DataFreshness, Pagination |
| S12 Quản trị vai trò và quyền AI | PermissionMatrix, Switch, Checkbox, FilterBar, ConfirmDialog |
| S13 Khung năng lực | TreeList, LevelMatrix, Badge (phiên bản), AiPanel, Alert khung nháp |
| S14 Kỳ đánh giá của tôi | LevelRating (tự đánh giá, Lead, AI), GapBar, FileUpload, AiPanel, Textarea, Calendar (hạn từng bước) |
| S15 Dashboard năng lực và nhân tài | DashboardPage, ChartCard, Heatmap, RadarChart, NineBox, BarChart, Timeline (mốc sắp tới), Calendar, KpiTile, AiPanel, DecisionBar, Drawer, DataFreshness, FilterBar |

## Token bổ sung
| Nhóm | Token | Dùng cho |
|---|---|---|
| Màu biểu đồ | `chart-1` → `chart-5`, `chart-seq-*`, `chart-div-*` | Mọi biểu đồ |
| Chữ | `text-code`, `--font-mono` | CodeEditor, đoạn mã trong nội dung |
| Chuyển động | `duration-fast/base/slow`, `ease-standard` | Mọi chuyển động; tắt khi người dùng chọn giảm chuyển động |
| Lớp xếp chồng | `z-sticky` → `z-tooltip` | Dropdown, Drawer, Dialog, Toast, Tooltip |

## Vẫn phụ thuộc vào khảo sát HRM/LMS
Nếu LMS hiện có đã có một chức năng (ngân hàng câu hỏi, giao học, ghi kết quả), ưu tiên cấu hình LMS và chỉ dùng component ở đây cho phần giao diện bổ sung. Danh sách câu hỏi khảo sát: `docs/survey/hrm-lms-questions.md`.
