// Dữ liệu mẫu cho trang Năng lực đội ngũ: KPI của khối, khung năng lực theo vị trí, mức kỹ năng hiện tại.
// Mức kỹ năng 0–3 theo LEVELS trong data.js (0 = chưa có).

export const UNIT = { name: 'Khối Kỹ thuật sản phẩm', period: 'Q1/2027', due: '31/01/2027' }
export const DUES = ['15/01/2027', '31/01/2027', '28/02/2027', '31/03/2027']

export const DEPTS = {
  mgmt: 'Quản lý khối',
  plat: 'Nền tảng & DevOps',
  dev: 'Phát triển sản phẩm',
  ai: 'AI & Dữ liệu',
  prod: 'Sản phẩm & Nghiệp vụ',
  qa: 'Chất lượng',
}

// Khung năng lực: mức tối thiểu mỗi vị trí cần
export const POSITIONS = {
  head: { name: 'Trưởng phòng Kỹ thuật', need: { lead: 3, req: 2, sec: 2, cloud: 1, agent: 1 } },
  pm: { name: 'Product manager', need: { req: 3, lead: 2, agent: 2, sql: 1 } },
  tl: { name: 'Tech lead', need: { lead: 2, cicd: 3, docker: 3, cloud: 2, sec: 2, agent: 1 } },
  ba: { name: 'Business analyst', need: { req: 3, sql: 2, agent: 1, sec: 1 } },
  be: { name: 'Dev backend', need: { cicd: 2, docker: 2, sql: 2, sec: 2, cloud: 1 } },
  fe: { name: 'Dev frontend', need: { cicd: 2, docker: 1, sec: 1 } },
  mobile: { name: 'Dev mobile', need: { cicd: 2, sec: 2, docker: 1 } },
  devops: { name: 'DevOps', need: { cicd: 3, docker: 3, cloud: 3, sec: 2 } },
  ml: { name: 'Kỹ sư ML', need: { mlops: 3, agent: 2, cloud: 2, docker: 2 } },
  data: { name: 'Kỹ sư dữ liệu', need: { sql: 3, cloud: 1, mlops: 1 } },
  qa: { name: 'QA', need: { cicd: 2, req: 2, sql: 1 } },
}

export const TEAM = [
  { id: 'p1', name: 'Trần Minh Đức', pos: 'head', dept: 'mgmt', since: 2017, color: '#5b7bd5', lv: { lead: 2, req: 1, sec: 2, cloud: 0, agent: 0 } },
  { id: 'p2', name: 'Lê Hoài Nam', pos: 'tl', dept: 'plat', since: 2019, color: '#3a9d8f', lv: { lead: 0, cicd: 2, docker: 3, cloud: 1, sec: 2, agent: 0 } },
  { id: 'p9', name: 'Trịnh Đăng Khôi', pos: 'devops', dept: 'plat', since: 2020, color: '#7a7f8c', lv: { cicd: 3, docker: 3, cloud: 2, sec: 1 } },
  { id: 'p13', name: 'Đoàn Minh Trí', pos: 'devops', dept: 'plat', since: 2024, color: '#8a6d3b', lv: { cicd: 2, docker: 2, cloud: 1, sec: 1 } },
  { id: 'p6', name: 'Phạm Thu Hà', pos: 'be', dept: 'dev', since: 2025, color: '#e07a3f', lv: { cicd: 1, docker: 1, sql: 2, sec: 1, cloud: 0 }, learner: true },
  { id: 'p7', name: 'Hoàng Gia Khánh', pos: 'be', dept: 'dev', since: 2022, color: '#4f9bd1', lv: { cicd: 1, docker: 2, sql: 1, sec: 1, cloud: 1 } },
  { id: 'p16', name: 'Châu Mỹ Duyên', pos: 'be', dept: 'dev', since: 2018, color: '#c2577a', lv: { cicd: 3, docker: 2, sql: 3, sec: 2, cloud: 2 } },
  { id: 'p8', name: 'Bùi Quốc Việt', pos: 'fe', dept: 'dev', since: 2023, color: '#6aa84f', lv: { cicd: 0, docker: 0, sec: 1 } },
  { id: 'p14', name: 'Nguyễn Hải Yến', pos: 'fe', dept: 'dev', since: 2021, color: '#d08a3c', lv: { cicd: 2, docker: 1, sec: 1 } },
  { id: 'p15', name: 'Tô Đức Anh', pos: 'mobile', dept: 'dev', since: 2024, color: '#5f8fa8', lv: { cicd: 1, sec: 1, docker: 0 } },
  { id: 'p10', name: 'Lý Ngọc Anh', pos: 'ml', dept: 'ai', since: 2023, color: '#c45c5c', lv: { mlops: 1, agent: 1, cloud: 1, docker: 1 } },
  { id: 'p11', name: 'Phan Tuấn Kiệt', pos: 'ml', dept: 'ai', since: 2022, color: '#2f8f6b', lv: { mlops: 2, agent: 0, cloud: 0, docker: 2 } },
  { id: 'p18', name: 'Hồ Bảo Ngọc', pos: 'ml', dept: 'ai', since: 2019, color: '#7d5ba6', lv: { mlops: 3, agent: 2, cloud: 2, docker: 2 } },
  { id: 'p17', name: 'Võ Quang Hiếu', pos: 'data', dept: 'ai', since: 2021, color: '#3f7f9f', lv: { sql: 3, cloud: 1, mlops: 0 } },
  { id: 'p3', name: 'Vũ Thảo Vy', pos: 'pm', dept: 'prod', since: 2021, color: '#d0679b', lv: { req: 2, lead: 1, agent: 0, sql: 1 } },
  { id: 'p19', name: 'Kiều Anh Thư', pos: 'pm', dept: 'prod', since: 2018, color: '#b5651d', lv: { req: 3, lead: 2, agent: 1, sql: 1 } },
  { id: 'p4', name: 'Ngô Thanh Bình', pos: 'ba', dept: 'prod', since: 2022, color: '#c98a2e', lv: { req: 2, sql: 1, agent: 0, sec: 1 } },
  { id: 'p5', name: 'Đặng Mỹ Linh', pos: 'ba', dept: 'prod', since: 2025, color: '#9a6fd0', lv: { req: 1, sql: 2, agent: 0, sec: 0 } },
  { id: 'p12', name: 'Mai Hồng Nhung', pos: 'qa', dept: 'qa', since: 2023, color: '#b0739a', lv: { cicd: 1, req: 1, sql: 1 } },
  { id: 'p20', name: 'Lâm Văn Toàn', pos: 'qa', dept: 'qa', since: 2020, color: '#4d8b6f', lv: { cicd: 2, req: 1, sql: 2 } },
]

// KPI của khối; skills là kỹ năng ảnh hưởng trực tiếp, why là căn cứ AI dẫn ra.
// 4 KPI đầu đang theo dõi; 3 KPI sau là gợi ý từ mục tiêu năm.
export const KPIS = [
  {
    id: 'k1', title: 'Giảm 50% sự cố production do release', metric: 'Sự cố / quý', now: '9', target: '≤ 4', due: '31/03/2027', state: 'late',
    skills: ['cicd', 'docker'],
    why: { cicd: '6/9 sự cố quý 3 do bỏ qua quality gate hoặc rollback quá 30 phút', docker: '2 sự cố mất dữ liệu do cấu hình volume sai' },
  },
  {
    id: 'k2', title: 'Giảm 30% chi phí cloud và GPU', metric: 'Chi phí / tháng', now: '1,2 tỷ', target: '840 triệu', due: '31/03/2027', state: 'risk',
    skills: ['cloud', 'mlops'],
    why: { cloud: '23% chi phí không gắn thẻ nhóm, không ai chịu trách nhiệm', mlops: 'GPU suy luận chạy 24/7 dù lưu lượng đêm chỉ 8%' },
  },
  {
    id: 'k3', title: 'Ra mắt trợ lý AI chăm sóc khách hàng', metric: 'Mốc go-live', now: 'Đang thiết kế', target: '31/03/2027', due: '31/03/2027', state: 'risk',
    skills: ['agent', 'mlops', 'sec'],
    why: { agent: 'Chưa ai trong nhóm sản phẩm từng đưa agent lên production', mlops: 'Cần phục vụ model với độ trễ dưới 2 giây', sec: 'Agent đọc dữ liệu khách hàng, bắt buộc rà soát an toàn thông tin' },
  },
  {
    id: 'k4', title: 'Giảm 25% thay đổi yêu cầu sau khi chốt phạm vi', metric: 'Change request / quý', now: '38', target: '≤ 28', due: '31/03/2027', state: 'ok',
    skills: ['req', 'sql', 'lead'],
    why: { req: '61% change request do thiếu tiêu chí chấp nhận', sql: 'BA phải nhờ dev lấy số liệu, chậm 2–3 ngày mỗi lần', lead: 'Trưởng nhóm ít phản hồi sớm khi yêu cầu chưa rõ' },
  },
  {
    id: 'k5', title: 'Không để lộ dữ liệu khách hàng', metric: 'Sự cố bảo mật / năm', now: '2', target: '0', due: '31/12/2027', state: 'ok', suggested: true,
    skills: ['sec', 'cloud'],
    why: { sec: '2 sự cố năm nay do để lộ khóa truy cập trong mã nguồn', cloud: '5 bucket lưu trữ đang để chế độ công khai' },
  },
  {
    id: 'k6', title: 'Rút ngắn hội nhập kỹ sư mới còn 3 tuần', metric: 'Tuần tới lần release đầu', now: '6 tuần', target: '3 tuần', due: '30/06/2027', state: 'risk', suggested: true,
    skills: ['cicd', 'docker', 'lead'],
    why: { cicd: 'Kỹ sư mới mất trung bình 2 tuần để hiểu quy trình release', docker: 'Môi trường chạy thử ở máy cá nhân hay lỗi', lead: 'Người kèm cặp chưa có lịch 1-1 cố định' },
  },
  {
    id: 'k7', title: 'Đội sản phẩm tự lấy được số liệu', metric: 'Báo cáo không cần nhờ dev', now: '35%', target: '70%', due: '30/06/2027', state: 'ok', suggested: true,
    skills: ['sql', 'req'],
    why: { sql: 'PM và BA gửi yêu cầu lấy số liệu cho dev, chờ 2–3 ngày', req: 'Định nghĩa chỉ số chưa thống nhất giữa các nhóm' },
  },
]

// Ví dụ điền nhanh khi tự thêm KPI
export const KPI_EXAMPLES = [
  { title: 'Giữ chân nhân sự chủ chốt trên 90%', metric: 'Tỷ lệ giữ chân', now: '82%', target: '90%' },
  { title: 'Giảm 20% thời gian xử lý khiếu nại khách hàng', metric: 'Giờ xử lý trung bình', now: '26 giờ', target: '≤ 20 giờ' },
  { title: 'Đưa 3 tính năng AI vào sản phẩm chính', metric: 'Tính năng AI đã phát hành', now: '0', target: '3' },
]

// AI gợi ý kỹ năng từ tên KPI (mô phỏng bằng từ khóa)
export const SKILL_HINTS = [
  ['cicd', /release|triển khai|deploy|pipeline|sự cố|phát hành/i],
  ['docker', /container|docker|môi trường/i],
  ['cloud', /cloud|hạ tầng|chi phí|bucket/i],
  ['mlops', /model|gpu|suy luận|tính năng ai/i],
  ['agent', /agent|trợ lý|chatbot|tự động|\bai\b/i],
  ['sec', /bảo mật|an toàn thông tin|lộ|dữ liệu khách/i],
  ['sql', /số liệu|báo cáo|dữ liệu|sql/i],
  ['req', /yêu cầu|phạm vi|change|nghiệp vụ|tính năng/i],
  ['lead', /kèm cặp|trưởng nhóm|giữ chân|nghỉ việc|hội nhập|nhân sự/i],
  ['cs', /khách hàng|khiếu nại|nps|csat/i],
  ['sales', /doanh thu|bán hàng|chuyển đổi/i],
]

/* ---------- Đánh giá năng lực bằng bằng chứng ---------- */
// kind: exam (thi chính thức), code (bài code), scenario (luyện tình huống), work (dữ liệu công việc), mentor (người kèm cặp), placement (bài xếp mức)
export const EVIDENCE = [
  {
    id: 'e1', pid: 'p7', sk: 'cicd', to: 2, conf: 'high', at: '17/11',
    why: 'Bài code và dữ liệu release đều cho thấy Khánh tự sửa pipeline và release an toàn, đúng mô tả mức 2.',
    items: [['code', 'Bài code "Sửa pipeline bị đỏ"', 'Đạt 9/10 test tự động'], ['work', 'Lịch sử release tháng 11', '4 lần release, 0 lần rollback'], ['exam', 'Bài thi CI/CD (luyện tập)', '82%']],
  },
  {
    id: 'e2', pid: 'p13', sk: 'cloud', to: 2, conf: 'high', at: '16/11',
    why: 'Hoàn thành bài thực hành cảnh báo ngân sách và được người kèm cặp xác nhận tự dựng được môi trường dev.',
    items: [['code', 'Thực hành "Tạo cảnh báo ngân sách"', 'Hoàn thành 5/5 bước'], ['mentor', 'Nhận xét của Trịnh Đăng Khôi', '"Tự dựng landing zone cho môi trường dev, gắn thẻ đầy đủ"']],
  },
  {
    id: 'e3', pid: 'p10', sk: 'mlops', to: 2, conf: 'medium', at: '15/11',
    why: 'Đạt bài thi chính thức nhưng điểm sát ngưỡng (78% so với 75%) nên AI không tự áp dụng.',
    items: [['exam', 'Bài thi "Triển khai model AI tối ưu chi phí"', '78% · ngưỡng đạt 75%'], ['scenario', 'Tình huống "Hóa đơn GPU tăng gấp ba"', 'Chọn tốt 1/2 lần']],
  },
  {
    id: 'e4', pid: 'p5', sk: 'req', to: 2, conf: 'medium', at: '14/11',
    why: 'Bằng chứng mới từ bài luyện tập, chưa có bài thi chính thức. Nên xác nhận nếu bạn đã thấy Linh làm tốt trong dự án.',
    items: [['scenario', 'Tình huống "Khách muốn thêm tính năng sát ngày bàn giao"', 'Chọn tốt 2/2 lần'], ['exam', 'Tự luận viết user story (luyện tập)', 'Đạt 3/3 tiêu chí rubric']],
  },
  {
    id: 'e5', pid: 'p8', sk: 'docker', to: 1, conf: 'high', at: '13/11',
    why: 'Mức 1 chỉ yêu cầu biết khái niệm; Việt đã xem hết video và trả lời đúng mọi điểm kiểm tra.',
    items: [['exam', 'Video "Docker Volume trong 8 phút"', 'Xem hết, điểm kiểm tra 3/3'], ['scenario', 'Tình huống "Dữ liệu biến mất sau khi deploy"', 'Chọn tốt 2/3 lần']],
  },
  {
    id: 'e6', pid: 'p2', sk: 'lead', to: 1, conf: 'medium', at: '12/11',
    why: 'Có phản hồi tích cực từ thành viên nhóm, nhưng mới có 2 buổi 1-1 nên độ tin cậy trung bình.',
    items: [['scenario', 'Tình huống "Phản hồi khi thành viên trễ hạn"', 'Chọn tốt 2/3 lần'], ['mentor', 'Khảo sát nhóm sau 1-1', '4,2/5 · 2 buổi']],
  },
]

// Lịch sử lên mức 30 ngày qua (đã phản ánh trong mức hiện tại)
export const LEVEL_HISTORY = [
  { pid: 'p16', sk: 'cicd', from: 2, to: 3, at: '12/11', src: 'Bài thi chính thức CI/CD · 92%', by: 'auto' },
  { pid: 'p11', sk: 'mlops', from: 1, to: 2, at: '08/11', src: 'Bài thi chính thức triển khai model · 86%', by: 'auto' },
  { pid: 'p14', sk: 'cicd', from: 1, to: 2, at: '05/11', src: 'Bài code pipeline · 10/10 test', by: 'you' },
  { pid: 'p18', sk: 'agent', from: 1, to: 2, at: '30/10', src: 'Bài thi chính thức AI agent · 88%', by: 'auto' },
  { pid: 'p17', sk: 'sql', from: 2, to: 3, at: '28/10', src: 'Bài code SQL nâng cao · 12/12 test', by: 'auto' },
  { pid: 'p19', sk: 'req', from: 2, to: 3, at: '24/10', src: 'Đánh giá dự án + nhận xét của trưởng phòng', by: 'you' },
]

// Quy tắc tự áp dụng
export const AUTO_RULE = 'Thi chính thức đạt và điểm cao hơn ngưỡng ít nhất 5% thì tự cập nhật. Bằng chứng từ bài luyện tập, tình huống hoặc người kèm cặp chờ bạn xác nhận.'

/* ---------- Tác động lên KPI ---------- */
export const MONTHS = ['T6', 'T7', 'T8', 'T9', 'T10', 'T11']
export const TRAIN_START = 3 // bắt đầu giao khóa từ T9
export const KPI_TREND = {
  k1: { label: 'Sự cố do release / tháng', values: [4, 3, 3, 3, 2, 1], target: 1.3, lower: true, fmt: (v) => `${v}`,
    cohort: { label: 'Sự cố do release trên 10 người / quý', trained: 2.1, untrained: 5.8, nT: 9, nU: 8 },
    note: 'Nhóm đã học CI/CD gây ít sự cố hơn rõ rệt. Hai tháng gần nhất không còn sự cố do bỏ qua quality gate.' },
  k2: { label: 'Chi phí cloud + GPU (tỷ/tháng)', values: [1.25, 1.28, 1.2, 1.18, 1.08, 1.02], target: 0.84, lower: true, fmt: (v) => v.toFixed(2).replace('.', ','),
    cohort: { label: 'Chi phí trung bình mỗi dịch vụ (triệu/tháng)', trained: 38, untrained: 61, nT: 6, nU: 9 },
    note: 'Giảm 15% từ khi bắt đầu đào tạo, chủ yếu nhờ tắt GPU ban đêm và gắn thẻ chi phí. Cần thêm khóa Cloud để về đích.' },
  k3: { label: 'Tiến độ trợ lý AI (%)', values: [5, 10, 20, 35, 45, 55], target: 100, lower: false, fmt: (v) => `${v}%`,
    cohort: { label: 'Tình huống đánh giá agent đạt (%)', trained: 91, untrained: 74, nT: 4, nU: 6 },
    note: 'Tiến độ tăng nhanh hơn sau khi nhóm học thiết kế rào chắn cho agent. Vẫn thiếu người có mức 2 về AI agent.' },
  k4: { label: 'Change request / tháng', values: [14, 13, 12, 13, 11, 9], target: 9.3, lower: true, fmt: (v) => `${v}`,
    cohort: { label: 'Change request do thiếu tiêu chí / dự án', trained: 1.2, untrained: 3.4, nT: 3, nU: 4 },
    note: 'Dự án có BA đã học viết tiêu chí chấp nhận ít phải sửa yêu cầu hơn gần 3 lần.' },
  k5: { label: 'Sự cố bảo mật / tháng', values: [0, 1, 0, 1, 0, 0], target: 0, lower: true, fmt: (v) => `${v}`,
    cohort: { label: 'Lỗi lộ khóa truy cập khi quét mã nguồn / 10 người', trained: 0.4, untrained: 1.9, nT: 11, nU: 9 },
    note: 'Chưa có sự cố mới trong 2 tháng. Quét mã nguồn cho thấy nhóm đã học An toàn thông tin ít để lộ khóa hơn.' },
  k6: { label: 'Tuần tới lần release đầu', values: [6, 6, 5.5, 5, 4.5, 4], target: 3, lower: true, fmt: (v) => `${v}`.replace('.', ','),
    cohort: { label: 'Tuần tới lần release đầu', trained: 3.5, untrained: 5.5, nT: 3, nU: 2 },
    note: 'Kỹ sư mới học CI/CD và Docker trong tuần đầu release sớm hơn khoảng 2 tuần.' },
  k7: { label: 'Báo cáo tự lấy được (%)', values: [30, 32, 35, 38, 44, 49], target: 70, lower: false, fmt: (v) => `${v}%`,
    cohort: { label: 'Báo cáo tự lấy được (%)', trained: 68, untrained: 31, nT: 4, nU: 5 },
    note: 'PM và BA đã học SQL tự lấy được gần 70% số liệu. Cần mở rộng cho cả nhóm sản phẩm.' },
}
export const TRAIN_STATS = { assigned: 46, completion: 71, pass: 83 }

/* ---------- Trợ lý giám đốc ---------- */
// Tiến độ học hiện tại của các khóa đã giao (mẫu) để AI dự báo nguy cơ trễ hạn
export const LEARNING = [
  { pid: 'p6', course: 'Cuộc gọi giả danh IT hỗ trợ', due: '15/11', pct: 0, lastSeen: '9 ngày trước', why: 'Quá hạn 3 ngày, chưa mở khóa' },
  { pid: 'p15', course: 'An toàn thông tin cho mọi nhân viên', due: '20/11', pct: 25, lastSeen: '6 ngày trước', why: 'Còn 2 ngày, mới xong 1/4 tài liệu' },
  { pid: 'p8', course: 'Docker Volume cơ bản', due: '30/11', pct: 10, lastSeen: '14 ngày trước', why: '2 tuần không vào học, tốc độ hiện tại cần thêm 5 tuần' },
  { pid: 'p12', course: 'JOIN và GROUP BY cho báo cáo bán hàng', due: '05/12', pct: 40, lastSeen: 'hôm qua', why: 'Trượt bài luyện tập 2 lần ở phần GROUP BY' },
  { pid: 'p7', course: 'Lệnh và lựa chọn khi dùng Docker Volume', due: '30/11', pct: 80, lastSeen: 'hôm nay', why: '' },
  { pid: 'p14', course: 'An toàn thông tin cho mọi nhân viên', due: '20/11', pct: 100, lastSeen: '3 ngày trước', why: '' },
  { pid: 'p5', course: 'SQL cho phân tích dữ liệu', due: '05/12', pct: 65, lastSeen: 'hôm nay', why: '' },
]
