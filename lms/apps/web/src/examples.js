// Chủ đề mẫu để thử nhanh luồng tạo bằng AI (chỉ điền sẵn mô tả mục tiêu)
export const EXAMPLES = [
  {
    "id": "cicd",
    "tag": "DevOps",
    "label": "CI/CD: từ commit tới production",
    "img": "terminal",
    "goal": "Tạo khóa đào tạo CI/CD cho kỹ sư phần mềm: các giai đoạn pipeline nội bộ, quality gate bắt buộc, triển khai canary và rollback. Nhiều bạn vẫn tắt test để kịp release. Cần bài thi chính thức mức 2 và một tình huống luyện xử lý áp lực release."
  },
  {
    "id": "mlcost",
    "tag": "AI / MLOps",
    "label": "Triển khai model AI tối ưu chi phí",
    "img": "ml",
    "goal": "Chi phí GPU và API model tăng gấp ba trong quý 3. Tạo bộ đào tạo cho kỹ sư ML và backend về triển khai model tối ưu chi phí: chọn model vừa đủ, cache, batching, lượng tử hóa, autoscale về 0, và đo chi phí mỗi request. Có tình huống trình bày với quản lý."
  },
  {
    "id": "cloud",
    "tag": "Cloud",
    "label": "Cloud: sẵn sàng cao, bảo mật, chi phí",
    "img": "earth",
    "goal": "Tạo khóa cloud căn bản cho kỹ sư theo chuẩn landing zone nội bộ: chạy nhiều vùng sẵn sàng, phân quyền tối thiểu, gắn thẻ chi phí, và hướng dẫn tạo cảnh báo ngân sách từ video quay màn hình của nhóm FinOps."
  },
  {
    "id": "agent",
    "tag": "AI agent",
    "label": "Xây AI agent an toàn",
    "img": "nodes",
    "goal": "Công ty bắt đầu đưa AI agent vào chăm sóc khách hàng và nhân sự. Tạo bộ đào tạo cho kỹ sư AI và PM: agent hoạt động thế nào, thiết kế công cụ, rào chắn bắt buộc (phân quyền, xác nhận trước khi gửi ra ngoài, nhật ký), prompt injection, và đánh giá trước khi lên production."
  },
  {
    "id": "req",
    "tag": "BA / PM",
    "label": "Viết yêu cầu nghiệp vụ rõ ràng",
    "img": "sketch",
    "goal": "Change request sau khi chốt phạm vi đang ở mức 38 mỗi quý, phần lớn do yêu cầu viết chưa rõ. Tạo bộ đào tạo cho BA, PM và QA: viết user story đủ ý, tiêu chí chấp nhận kiểm thử được, chốt phạm vi và xử lý yêu cầu thay đổi. Cần bài thi mức 2 và tình huống luyện giữ phạm vi với khách hàng."
  },
  {
    "id": "docker",
    "tag": "Kỹ thuật",
    "label": "Docker volume cho kỹ sư mới",
    "img": "server",
    "goal": "Tạo khóa đào tạo cho kỹ sư phần mềm mới về Docker volume. Họ đã biết lệnh docker run cơ bản nhưng hay mất dữ liệu khi container khởi động lại. Dạy họ phân biệt bind mount và named volume, cách sao lưu volume và các lỗi hay gặp. Giữ giọng văn thực tế, dùng tài liệu nội bộ đính kèm."
  },
  {
    "id": "sales",
    "tag": "Bán hàng",
    "label": "Tư vấn bán hàng khi khách chê giá",
    "img": "store",
    "goal": "Đội tư vấn bán hàng mới hay giảm giá ngay khi khách nói \"bên kia rẻ hơn\", làm tỷ lệ hủy tăng. Tạo bộ đào tạo giúp họ xử lý khi khách chê giá: ghi nhận, hỏi nhu cầu, nói về giá trị và đề xuất dùng thử. Cần có phần luyện hội thoại và slide cho họp sáng."
  },
  {
    "id": "expense",
    "tag": "Quy trình",
    "label": "Thanh toán công tác phí",
    "img": "receipt",
    "goal": "Nhân viên hay nộp đề nghị thanh toán công tác phí sai: thiếu hóa đơn, vượt định mức, nộp trễ. Tạo hướng dẫn từng bước từ video quay màn hình của Kế toán, kèm một khóa ngắn về định mức và hóa đơn hợp lệ."
  },
  {
    "id": "onboard",
    "tag": "Hội nhập",
    "label": "Tuần đầu của nhân viên mới",
    "img": "welcome",
    "goal": "Tạo bộ hội nhập cho nhân viên mới trong tuần đầu: slide chào mừng cho buổi sáng thứ Hai, video lời chào, khóa ngắn về giờ làm và ai hỗ trợ việc gì, và một tình huống luyện cách làm việc với người kèm cặp."
  },
  {
    "id": "warehouse",
    "tag": "An toàn",
    "label": "An toàn khi làm việc trong kho",
    "img": "warehouse",
    "goal": "Nhân viên kho mới cần được huấn luyện an toàn trước khi cấp thẻ vào kho: đồ bảo hộ, lối đi xe nâng, nâng và xếp hàng đúng cách, báo cáo suýt sự cố. Có bài thi chính thức, điểm đạt 80%. Dùng nội quy và video huấn luyện đính kèm."
  }
]
