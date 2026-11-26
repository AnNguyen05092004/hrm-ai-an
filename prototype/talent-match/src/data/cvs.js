// Kho hồ sơ mẫu — toàn bộ là người và tổ chức giả lập.
// skills: { kỹNăng: mức 1–5 } · english: điểm quy đổi tương đương IELTS · salary: kỳ vọng (triệu/tháng)
// source: applied = ứng tuyển · pool = kho hồ sơ cũ · internal = nhân viên nội bộ · referral = được giới thiệu
// history.to = null nghĩa là đang làm.

const job = (title, org, from, to, tags, skills, note, roles = []) => ({ title, org, from, to, tags, skills, note, roles })

export const CVS = [
  {
    id: 'cv-01', name: 'Nguyễn Minh Khoa', headline: 'Kỹ sư thị giác máy tính', city: 'Hà Nội', relocate: false,
    source: 'applied', appliedTo: ['job-cv'], updatedAt: '2026-11-12', salary: 55, noticeDays: 60,
    education: { level: 3, major: 'Khoa học máy tính', school: 'Đại học Bách khoa' }, certs: [], english: { band: 7.0, label: 'IELTS 7.0' },
    skills: { python: 5, pytorch: 5, opencv: 4, vision: 5, mlops: 2, docker: 4, linux: 4, mentoring: 3, problem: 4, teamwork: 4 },
    summary: '6 năm làm AI, 4 năm tập trung thị giác máy tính cho kiểm tra chất lượng trong nhà máy điện tử.',
    history: [
      job('Kỹ sư AI chính', 'Công ty Tự động hoá Hưng Phát', '2022-09', null, ['ai', 'vision', 'manufacturing'], ['python', 'pytorch', 'opencv', 'mlops', 'docker', 'mentoring'],
        'Dẫn dắt mô hình phát hiện lỗi bo mạch, giảm 38% lỗi lọt; kèm 3 kỹ sư mới.', ['mentor']),
      job('Kỹ sư thị giác máy tính', 'Công ty Linh kiện Đông Á', '2020-11', '2022-08', ['ai', 'vision', 'manufacturing'], ['python', 'pytorch', 'opencv'],
        'Xây dựng hệ thống đo kích thước linh kiện bằng camera công nghiệp.'),
      job('Kỹ sư học máy', 'Công ty phần mềm Sao Mai', '2020-08', '2020-10', ['ai'], ['python'], 'Thực tập rồi chuyển chính thức nhóm dự báo nhu cầu.'),
    ],
  },
  {
    id: 'cv-02', name: 'Trần Thị Thu Hà', headline: 'Kỹ sư AI – xử lý ngôn ngữ', city: 'Hà Nội', relocate: false,
    source: 'applied', appliedTo: ['job-cv'], updatedAt: '2026-11-10', salary: 45, noticeDays: 30,
    education: { level: 2, major: 'CNTT', school: 'Đại học Công nghệ' }, certs: [], english: { band: 6.5, label: 'IELTS 6.5' },
    skills: { python: 5, tensorflow: 4, llm: 4, opencv: 2, docker: 3, sql: 3, communication: 4, problem: 4 },
    summary: '4,5 năm làm AI, chủ yếu xử lý ngôn ngữ tự nhiên; 1 năm làm dự án nhận dạng chứng từ bằng ảnh.',
    history: [
      job('Kỹ sư AI', 'Công ty Tài chính số Bình Minh', '2023-05', null, ['ai', 'fintech'], ['python', 'tensorflow', 'llm', 'docker'],
        'Xây chatbot hỗ trợ khách hàng dùng RAG trên tài liệu nội bộ.'),
      job('Kỹ sư AI', 'Công ty Tài chính số Bình Minh', '2022-05', '2023-04', ['ai', 'vision', 'fintech'], ['python', 'tensorflow', 'opencv'],
        'Nhận dạng và trích xuất thông tin từ ảnh chứng từ.'),
      job('Lập trình viên Python', 'Công ty phần mềm Sao Mai', '2021-06', '2022-04', ['ai', 'backend'], ['python', 'sql'], 'Xây dịch vụ làm sạch dữ liệu văn bản.'),
    ],
  },
  {
    id: 'cv-03', name: 'Lê Hoàng Nam', headline: 'Nhà khoa học dữ liệu', city: 'TP. Hồ Chí Minh', relocate: true,
    source: 'pool', appliedTo: [], updatedAt: '2026-06-18', salary: 38, noticeDays: 30,
    education: { level: 2, major: 'Toán tin', school: 'Đại học Khoa học Tự nhiên' }, certs: [], english: { band: 6.5, label: 'IELTS 6.5' },
    skills: { python: 4, pytorch: 3, sql: 4, spark: 2, analytics: 4, airflow: 2, aws: 2, problem: 4, stakeholder: 3 },
    summary: '3 năm xây mô hình dự báo và phân khúc khách hàng cho thương mại điện tử.',
    history: [
      job('Nhà khoa học dữ liệu', 'Sàn thương mại điện tử Chợ Lớn', '2023-10', null, ['ai', 'data', 'ecommerce'], ['python', 'pytorch', 'sql', 'spark', 'airflow'],
        'Mô hình gợi ý sản phẩm tăng 9% tỷ lệ chuyển đổi.'),
      job('Chuyên viên phân tích dữ liệu', 'Sàn thương mại điện tử Chợ Lớn', '2022-06', '2023-09', ['data', 'ecommerce'], ['sql', 'python', 'analytics'],
        'Xây bảng điều khiển doanh thu theo ngành hàng.'),
    ],
  },
  {
    id: 'cv-04', name: 'Phạm Đức Long', headline: 'Kỹ sư xử lý ảnh', city: 'TP. Hồ Chí Minh', relocate: true,
    source: 'pool', appliedTo: [], updatedAt: '2026-09-02', salary: 62, noticeDays: 60,
    education: { level: 2, major: 'Điện tử', school: 'Đại học Bách khoa' }, certs: [], english: { band: 6.0, label: 'TOEIC 750' },
    skills: { python: 4, pytorch: 4, opencv: 5, vision: 5, mlops: 2, docker: 3, cpp: 4, problem: 4, mentoring: 2 },
    summary: '5 năm xử lý ảnh và thị giác máy tính, từng triển khai mô hình trên thiết bị biên.',
    history: [
      job('Kỹ sư xử lý ảnh cao cấp', 'Công ty Camera An Ninh Việt', '2023-01', null, ['ai', 'vision', 'iot'], ['python', 'pytorch', 'opencv', 'cpp', 'docker'],
        'Tối ưu mô hình nhận diện người chạy trên camera, giảm 45% độ trễ.'),
      job('Kỹ sư xử lý ảnh', 'Công ty Camera An Ninh Việt', '2021-08', '2022-12', ['ai', 'vision', 'iot'], ['python', 'opencv', 'cpp'],
        'Phát triển thuật toán chống rung và tăng sáng ảnh.'),
    ],
  },
  {
    id: 'cv-05', name: 'Vũ Quang Huy', headline: 'Kỹ sư Backend Java', city: 'Hà Nội', relocate: false,
    source: 'applied', appliedTo: ['job-be'], updatedAt: '2026-11-08', salary: 42, noticeDays: 30,
    education: { level: 2, major: 'CNTT', school: 'Đại học Bách khoa' }, certs: ['aws-saa'], english: { band: 6.0, label: 'IELTS 6.0' },
    skills: { java: 5, spring: 5, postgresql: 4, redis: 4, kafka: 2, microservices: 4, docker: 3, aws: 3, teamwork: 4, ownership: 4 },
    summary: '5 năm phát triển hệ thống thanh toán và ví điện tử chịu tải lớn.',
    history: [
      job('Kỹ sư Backend', 'Công ty Tài chính số Bình Minh', '2023-03', null, ['backend', 'fintech'], ['java', 'spring', 'postgresql', 'redis', 'kafka', 'microservices', 'docker'],
        'Tách dịch vụ thanh toán khỏi hệ thống nguyên khối, chịu 3.000 giao dịch/giây.'),
      job('Lập trình viên Java', 'Công ty phần mềm Sao Mai', '2021-07', '2023-02', ['backend'], ['java', 'spring', 'postgresql'], 'Phát triển API quản lý đơn hàng.'),
    ],
  },
  {
    id: 'cv-06', name: 'Đặng Thị Mai Anh', headline: 'Kỹ sư Backend Go', city: 'Hà Nội', relocate: false,
    source: 'applied', appliedTo: ['job-be'], updatedAt: '2026-11-14', salary: 40, noticeDays: 30,
    education: { level: 2, major: 'Kỹ thuật phần mềm', school: 'Đại học Công nghệ' }, certs: ['cka'], english: { band: 6.5, label: 'IELTS 6.5' },
    skills: { go: 5, postgresql: 4, kafka: 4, redis: 3, microservices: 4, docker: 4, kubernetes: 4, teamwork: 4, ownership: 4 },
    summary: '4 năm xây hệ thống phân phối nội dung và hàng đợi sự kiện bằng Go.',
    history: [
      job('Kỹ sư Backend', 'Công ty Truyền thông số Hoa Sen', '2022-11', null, ['backend'], ['go', 'postgresql', 'kafka', 'redis', 'microservices', 'docker', 'kubernetes'],
        'Thiết kế hệ thống sự kiện xử lý 50 triệu thông điệp/ngày.'),
      job('Lập trình viên Backend', 'Công ty phần mềm Sao Mai', '2022-09', '2022-10', ['backend'], ['go'], 'Thực tập nhóm hạ tầng.'),
    ],
  },
  {
    id: 'cv-07', name: 'Bùi Văn Toàn', headline: 'Lập trình viên Java', city: 'Hà Nội', relocate: false,
    source: 'pool', appliedTo: [], updatedAt: '2026-07-21', salary: 20, noticeDays: 15,
    education: { level: 2, major: 'Hệ thống thông tin', school: 'Đại học Giao thông' }, certs: [], english: { band: 5.0, label: 'TOEIC 550' },
    skills: { java: 3, spring: 3, mysql: 3, docker: 2, teamwork: 3 },
    summary: '1,5 năm phát triển hệ thống quản lý kho bằng Java Spring.',
    history: [
      job('Lập trình viên Java', 'Công ty Logistics Phương Nam', '2025-05', null, ['backend'], ['java', 'spring', 'mysql'], 'Viết API nhập – xuất kho.'),
    ],
  },
  {
    id: 'cv-08', name: 'Ngô Thị Lan', headline: 'Kỹ sư Backend Kotlin/Java', city: 'TP. Hồ Chí Minh', relocate: false,
    source: 'referral', appliedTo: [], updatedAt: '2026-10-30', salary: 34, noticeDays: 30,
    education: { level: 2, major: 'CNTT', school: 'Đại học Bách khoa' }, certs: [], english: { band: 6.0, label: 'IELTS 6.0' },
    skills: { java: 4, kotlin: 4, spring: 3, postgresql: 3, redis: 2, docker: 2, microservices: 2, teamwork: 4 },
    summary: '3 năm backend Kotlin/Java cho ứng dụng gọi xe; trước đó 1 năm lập trình Android.',
    history: [
      job('Kỹ sư Backend', 'Công ty Di chuyển Xanh', '2023-11', null, ['backend'], ['kotlin', 'java', 'spring', 'postgresql', 'redis', 'docker'],
        'Xây dịch vụ ghép chuyến theo thời gian thực.'),
      job('Lập trình viên Android', 'Công ty Di chuyển Xanh', '2022-10', '2023-10', ['frontend'], ['kotlin', 'java'], 'Phát triển ứng dụng tài xế.'),
    ],
  },
  {
    id: 'cv-09', name: 'Hồ Thanh Tùng', headline: 'Kỹ sư dữ liệu', city: 'TP. Hồ Chí Minh', relocate: false,
    source: 'applied', appliedTo: ['job-de'], updatedAt: '2026-11-15', salary: 44, noticeDays: 30,
    education: { level: 2, major: 'Hệ thống thông tin', school: 'Đại học Kinh tế' }, certs: ['gcp-de'], english: { band: 6.5, label: 'IELTS 6.5' },
    skills: { sql: 5, python: 4, spark: 4, airflow: 4, gcp: 2, dbt: 3, kafka: 2, stakeholder: 4, problem: 4 },
    summary: '3 năm xây kho dữ liệu và pipeline cho chuỗi bán lẻ 400 cửa hàng.',
    history: [
      job('Kỹ sư dữ liệu', 'Chuỗi bán lẻ Sao Việt', '2023-09', null, ['data', 'ecommerce'], ['sql', 'python', 'spark', 'airflow', 'gcp', 'dbt'],
        'Chuyển kho dữ liệu lên BigQuery, giảm 60% thời gian chạy báo cáo.'),
      job('Kỹ sư dữ liệu', 'Công ty phần mềm Sao Mai', '2023-01', '2023-08', ['data'], ['sql', 'python', 'airflow'], 'Xây pipeline ETL theo lô.'),
      job('Chuyên viên BI', 'Công ty phần mềm Sao Mai', '2022-10', '2022-12', ['data'], ['sql'], 'Thực tập báo cáo quản trị.'),
    ],
  },
  {
    id: 'cv-10', name: 'Châu Ngọc Diệp', headline: 'Chuyên viên phân tích dữ liệu', city: 'TP. Hồ Chí Minh', relocate: false,
    source: 'pool', appliedTo: [], updatedAt: '2026-08-11', salary: 30, noticeDays: 30,
    education: { level: 2, major: 'Khoa học dữ liệu', school: 'Đại học Khoa học Tự nhiên' }, certs: [], english: { band: 7.0, label: 'IELTS 7.0' },
    skills: { sql: 4, python: 3, airflow: 2, aws: 3, analytics: 4, stakeholder: 4, communication: 4 },
    summary: '2 năm phân tích dữ liệu, 1 năm gần đây tự xây pipeline nhỏ trên AWS.',
    history: [
      job('Chuyên viên phân tích dữ liệu', 'Công ty Bảo hiểm An Tâm', '2024-11', null, ['data', 'fintech'], ['sql', 'python', 'airflow', 'aws', 'analytics'],
        'Tự động hoá báo cáo bồi thường bằng Airflow trên AWS.'),
    ],
  },
  {
    id: 'cv-11', name: 'Trịnh Thu Phương', headline: 'Kỹ sư kiểm thử tự động', city: 'Hà Nội', relocate: false,
    source: 'applied', appliedTo: ['job-qa'], updatedAt: '2026-11-11', salary: 28, noticeDays: 30,
    education: { level: 2, major: 'Kỹ thuật phần mềm', school: 'Đại học Công nghệ' }, certs: [], english: { band: 6.0, label: 'TOEIC 780' },
    skills: { playwright: 4, apitest: 4, typescript: 2, cicd: 3, sql: 2, communication: 4, problem: 4 },
    summary: '3 năm kiểm thử tự động web và API cho sản phẩm thương mại điện tử.',
    history: [
      job('Kỹ sư kiểm thử tự động', 'Sàn thương mại điện tử Chợ Lớn', '2023-10', null, ['qa', 'ecommerce'], ['playwright', 'apitest', 'typescript', 'cicd'],
        'Dựng bộ 1.200 kịch bản Playwright chạy trên mỗi lần gộp code.'),
      job('Kỹ sư kiểm thử', 'Công ty phần mềm Sao Mai', '2023-01', '2023-09', ['qa'], ['apitest', 'sql'], 'Kiểm thử API hệ thống CRM.'),
    ],
  },
  {
    id: 'cv-12', name: 'Lý Gia Bảo', headline: 'Kỹ sư kiểm thử Selenium', city: 'Hà Nội', relocate: false,
    source: 'pool', appliedTo: [], updatedAt: '2026-05-27', salary: 30, noticeDays: 45,
    education: { level: 2, major: 'CNTT', school: 'Đại học Giao thông' }, certs: ['istqb'], english: { band: 5.5, label: 'TOEIC 650' },
    skills: { selenium: 5, java: 3, apitest: 3, javascript: 3, cicd: 2, sql: 3, problem: 4, communication: 3 },
    summary: '4 năm kiểm thử tự động bằng Selenium cho phần mềm ngân hàng.',
    history: [
      job('Kỹ sư kiểm thử tự động', 'Công ty Giải pháp Ngân hàng Việt', '2022-10', null, ['qa', 'fintech'], ['selenium', 'java', 'apitest', 'cicd', 'sql'],
        'Tự động hoá 70% bộ kiểm thử hồi quy cổng ngân hàng điện tử.'),
    ],
  },
  {
    id: 'cv-13', name: 'Mai Thị Hồng', headline: 'Kỹ sư kiểm thử', city: 'Hà Nội', relocate: false,
    source: 'applied', appliedTo: ['job-qa'], updatedAt: '2026-11-04', salary: 22, noticeDays: 15,
    education: { level: 1, major: 'CNTT', school: 'Cao đẳng Công nghệ' }, certs: [], english: { band: 5.0, label: 'TOEIC 520' },
    skills: { selenium: 2, apitest: 2, sql: 2, communication: 4, teamwork: 4 },
    summary: '3 năm kiểm thử thủ công, đang tự học kiểm thử tự động.',
    history: [
      job('Kỹ sư kiểm thử', 'Công ty Giáo dục Trực tuyến Ánh Dương', '2023-11', null, ['qa'], ['selenium', 'apitest', 'sql'], 'Kiểm thử ứng dụng học trực tuyến trên web và di động.'),
    ],
  },
  {
    id: 'cv-14', name: 'Đinh Công Thành', headline: 'Trưởng nhóm phần mềm nhúng', city: 'Hà Nội', relocate: false,
    source: 'pool', appliedTo: [], updatedAt: '2026-10-05', salary: 48, noticeDays: 45,
    education: { level: 2, major: 'Điện tử – Viễn thông', school: 'Đại học Bách khoa' }, certs: [], english: { band: 6.0, label: 'TOEIC 760' },
    skills: { c: 5, rtos: 4, periph: 5, cpp: 3, leadership: 4, mentoring: 4, problem: 5 },
    summary: '7 năm firmware cho thiết bị IoT, 3 năm gần nhất làm trưởng nhóm 5 kỹ sư.',
    history: [
      job('Trưởng nhóm firmware', 'Công ty Thiết bị Thông minh Nhà Việt', '2023-08', null, ['embedded', 'iot'], ['c', 'rtos', 'periph', 'leadership'],
        'Dẫn dắt nhóm 5 kỹ sư làm firmware công tắc và cảm biến thông minh.', ['lead']),
      job('Kỹ sư phần mềm nhúng', 'Công ty Thiết bị Thông minh Nhà Việt', '2020-09', '2023-07', ['embedded', 'iot'], ['c', 'rtos', 'periph', 'cpp'], 'Viết driver cảm biến, cập nhật firmware từ xa.'),
      job('Kỹ sư phần mềm nhúng', 'Công ty Điện tử Hồng Hà', '2019-07', '2020-08', ['embedded'], ['c'], 'Lập trình bộ điều khiển công nghiệp.'),
    ],
  },
  {
    id: 'cv-15', name: 'Tạ Minh Quân', headline: 'Kỹ sư phần mềm nhúng', city: 'Hà Nội', relocate: false,
    source: 'applied', appliedTo: ['job-emb'], updatedAt: '2026-11-13', salary: 30, noticeDays: 30,
    education: { level: 2, major: 'Tự động hoá', school: 'Đại học Bách khoa' }, certs: [], english: { band: 5.5, label: 'TOEIC 650' },
    skills: { c: 4, rtos: 3, periph: 4, cpp: 2, teamwork: 4, problem: 3 },
    summary: '3 năm firmware cho thiết bị đo lường và khoá cửa thông minh.',
    history: [
      job('Kỹ sư phần mềm nhúng', 'Công ty Khoá Thông Minh An Gia', '2023-10', null, ['embedded', 'iot'], ['c', 'rtos', 'periph'], 'Phát triển firmware khoá cửa vân tay.'),
    ],
  },
  {
    id: 'cv-16', name: 'Phan Văn Hiếu', headline: 'Kỹ sư Embedded Linux', city: 'Đà Nẵng', relocate: true,
    source: 'pool', appliedTo: [], updatedAt: '2026-04-19', salary: 52, noticeDays: 60,
    education: { level: 3, major: 'Điện tử', school: 'Đại học Bách khoa' }, certs: [], english: { band: 6.5, label: 'IELTS 6.5' },
    skills: { cpp: 5, c: 4, emblinux: 5, rtos: 2, periph: 3, linux: 5, mentoring: 3, problem: 4 },
    summary: '6 năm Embedded Linux cho thiết bị mạng và màn hình ô tô.',
    history: [
      job('Kỹ sư Embedded Linux cao cấp', 'Công ty Điện tử Ô tô Miền Trung', '2022-06', null, ['embedded'], ['cpp', 'c', 'emblinux', 'periph', 'mentoring'],
        'Phát triển BSP cho màn hình giải trí trên xe.', ['mentor']),
      job('Kỹ sư phần mềm nhúng', 'Công ty Thiết bị Mạng Sông Hàn', '2020-10', '2022-05', ['embedded', 'iot'], ['c', 'emblinux', 'rtos'], 'Firmware bộ phát Wi-Fi.'),
    ],
  },
  {
    id: 'cv-17', name: 'Kiều Anh Thư', headline: 'Kỹ sư Frontend React', city: 'Đà Nẵng', relocate: false,
    source: 'applied', appliedTo: ['job-fe'], updatedAt: '2026-11-16', salary: 32, noticeDays: 30,
    education: { level: 2, major: 'CNTT', school: 'Đại học Bách khoa' }, certs: [], english: { band: 6.5, label: 'IELTS 6.5' },
    skills: { react: 5, typescript: 4, css: 5, jest: 2, nextjs: 4, figma: 3, communication: 4, ownership: 4 },
    summary: '3 năm phát triển giao diện quản trị và trang bán hàng, làm việc từ xa 2 năm.',
    history: [
      job('Kỹ sư Frontend', 'Công ty phần mềm Sao Mai', '2024-02', null, ['frontend'], ['react', 'typescript', 'css', 'jest', 'nextjs', 'figma'],
        'Xây lại cổng quản trị bằng Next.js, tăng điểm hiệu năng từ 54 lên 92.'),
      job('Lập trình viên Frontend', 'Studio thiết kế Mộc', '2023-08', '2024-01', ['frontend'], ['react', 'css', 'figma'], 'Dựng giao diện từ bản thiết kế Figma.'),
    ],
  },
  {
    id: 'cv-18', name: 'Lương Đức Mạnh', headline: 'Kỹ sư Frontend Vue', city: 'TP. Hồ Chí Minh', relocate: false,
    source: 'pool', appliedTo: [], updatedAt: '2026-09-24', salary: 34, noticeDays: 30,
    education: { level: 2, major: 'Kỹ thuật phần mềm', school: 'Đại học Công nghệ Thông tin' }, certs: [], english: { band: 6.0, label: 'IELTS 6.0' },
    skills: { vue: 5, typescript: 4, javascript: 5, css: 4, jest: 2, communication: 3, ownership: 4 },
    summary: '4 năm frontend bằng Vue cho ứng dụng đặt phòng khách sạn.',
    history: [
      job('Kỹ sư Frontend', 'Công ty Du lịch Trực tuyến Biển Xanh', '2022-10', null, ['frontend', 'ecommerce'], ['vue', 'typescript', 'javascript', 'css', 'jest'],
        'Phát triển luồng đặt phòng, tăng 12% tỷ lệ hoàn tất thanh toán.'),
    ],
  },
  {
    id: 'cv-19', name: 'Nguyễn Thành Đạt', headline: 'Kỹ sư Fullstack (nhân viên nội bộ)', city: 'Hà Nội', relocate: false,
    source: 'internal', appliedTo: [], updatedAt: '2026-11-01', salary: 30, noticeDays: 30,
    education: { level: 2, major: 'CNTT', school: 'Đại học Bách khoa' }, certs: [], english: { band: 6.0, label: 'IELTS 6.0' },
    skills: { react: 4, typescript: 4, nodejs: 4, postgresql: 3, css: 3, jest: 3, docker: 3, java: 2, teamwork: 4, ownership: 4 },
    summary: '3 năm làm fullstack cho ứng dụng nội bộ; muốn chuyển hẳn sang frontend hoặc backend sản phẩm.',
    history: [
      job('Kỹ sư Fullstack', 'Khối Công nghệ (nội bộ)', '2023-09', null, ['frontend', 'backend'], ['react', 'typescript', 'nodejs', 'postgresql', 'jest', 'docker'],
        'Xây cổng đặt lịch bảo hành thiết bị cho trung tâm dịch vụ.'),
    ],
  },
  {
    id: 'cv-20', name: 'Hoàng Thị Minh Châu', headline: 'Product Owner phần mềm nhân sự', city: 'Hà Nội', relocate: false,
    source: 'applied', appliedTo: ['job-po'], updatedAt: '2026-11-09', salary: 58, noticeDays: 45,
    education: { level: 3, major: 'Quản trị kinh doanh', school: 'Đại học Kinh tế' }, certs: ['cspo'], english: { band: 7.5, label: 'IELTS 7.5' },
    skills: { backlog: 5, scrum: 4, discovery: 4, analytics: 2, sql: 2, figma: 3, stakeholder: 5, negotiation: 4, communication: 5 },
    summary: '5 năm làm sản phẩm cho phần mềm chấm công và tuyển dụng.',
    history: [
      job('Product Owner', 'Công ty Phần mềm Nhân sự Nhân Hoà', '2023-01', null, ['product', 'hrtech'], ['backlog', 'scrum', 'discovery', 'analytics', 'stakeholder', 'negotiation'],
        'Ra mắt phân hệ tuyển dụng, 120 doanh nghiệp sử dụng sau 1 năm.', ['owner']),
      job('Chuyên viên sản phẩm', 'Công ty Phần mềm Nhân sự Nhân Hoà', '2021-09', '2022-12', ['product', 'hrtech'], ['backlog', 'discovery', 'sql'], 'Phụ trách phân hệ chấm công.'),
    ],
  },
  {
    id: 'cv-21', name: 'Võ Tuấn Kiệt', headline: 'Phân tích nghiệp vụ → Product Owner', city: 'Hà Nội', relocate: false,
    source: 'applied', appliedTo: ['job-po'], updatedAt: '2026-11-07', salary: 42, noticeDays: 30,
    education: { level: 2, major: 'Hệ thống thông tin', school: 'Đại học Kinh tế' }, certs: ['psm'], english: { band: 6.0, label: 'IELTS 6.0' },
    skills: { backlog: 4, scrum: 4, discovery: 2, analytics: 4, sql: 4, stakeholder: 4, negotiation: 2, communication: 4 },
    summary: '5 năm phân tích nghiệp vụ ngân hàng, 1,5 năm gần đây làm Product Owner.',
    history: [
      job('Product Owner', 'Công ty Giải pháp Ngân hàng Việt', '2025-05', null, ['product', 'fintech'], ['backlog', 'scrum', 'analytics', 'stakeholder'], 'Phụ trách ứng dụng cho vay tiêu dùng.', ['owner']),
      job('Chuyên viên phân tích nghiệp vụ', 'Công ty Giải pháp Ngân hàng Việt', '2021-09', '2025-04', ['fintech'], ['sql', 'analytics', 'backlog'], 'Viết đặc tả, làm việc với khối nghiệp vụ.'),
    ],
  },
  {
    id: 'cv-22', name: 'Nguyễn Thị Thanh Xuân', headline: 'Chuyên viên tuyển dụng công nghệ', city: 'Hà Nội', relocate: false,
    source: 'applied', appliedTo: ['job-hr'], updatedAt: '2026-11-17', salary: 30, noticeDays: 30,
    education: { level: 2, major: 'Quản trị nhân lực', school: 'Đại học Lao động – Xã hội' }, certs: [], english: { band: 6.5, label: 'IELTS 6.5' },
    skills: { sourcing: 5, interviewing: 4, ats: 3, branding: 2, communication: 5, negotiation: 4 },
    summary: '3 năm tuyển kỹ sư phần mềm và dữ liệu, trung bình 4 người nhận việc mỗi tháng.',
    history: [
      job('Chuyên viên tuyển dụng IT', 'Công ty phần mềm Sao Mai', '2023-10', null, ['recruit', 'hr', 'backend', 'data'], ['sourcing', 'interviewing', 'ats', 'branding'],
        'Rút thời gian tuyển trung bình từ 42 xuống 29 ngày.'),
    ],
  },
  {
    id: 'cv-23', name: 'Phùng Bảo Ngọc', headline: 'Chuyên viên nhân sự tổng hợp', city: 'Hà Nội', relocate: false,
    source: 'pool', appliedTo: [], updatedAt: '2026-03-30', salary: 20, noticeDays: 30,
    education: { level: 2, major: 'Quản trị nhân lực', school: 'Đại học Thương mại' }, certs: ['shrm'], english: { band: 5.5, label: 'TOEIC 600' },
    skills: { sourcing: 3, interviewing: 3, ats: 2, communication: 4, negotiation: 3 },
    summary: '4 năm nhân sự tổng hợp, 1,5 năm tuyển dụng khối bán lẻ.',
    history: [
      job('Chuyên viên tuyển dụng', 'Chuỗi bán lẻ Sao Việt', '2025-04', null, ['recruit', 'hr'], ['sourcing', 'interviewing', 'ats'], 'Tuyển nhân viên cửa hàng và quản lý khu vực.'),
      job('Chuyên viên C&B', 'Chuỗi bán lẻ Sao Việt', '2022-11', '2025-03', ['hr'], ['communication'], 'Tính lương, bảo hiểm cho 2.000 nhân viên.'),
    ],
  },
  {
    id: 'cv-24', name: 'Trương Quốc Việt', headline: 'Kỹ sư kiểm thử (nhân viên nội bộ)', city: 'Hà Nội', relocate: false,
    source: 'internal', appliedTo: [], updatedAt: '2026-10-22', salary: 26, noticeDays: 30,
    education: { level: 2, major: 'CNTT', school: 'Đại học Công nghệ' }, certs: [], english: { band: 6.0, label: 'TOEIC 720' },
    skills: { cypress: 4, playwright: 3, apitest: 3, typescript: 3, cicd: 2, sql: 3, communication: 4, problem: 4 },
    summary: '2,5 năm kiểm thử tự động ứng dụng di động trong công ty.',
    history: [
      job('Kỹ sư kiểm thử', 'Khối Công nghệ (nội bộ)', '2024-05', null, ['qa'], ['cypress', 'playwright', 'apitest', 'typescript', 'cicd', 'sql'],
        'Dựng bộ kiểm thử Cypress cho ứng dụng điều khiển nhà thông minh.'),
    ],
  },
]

export const cvById = (id) => CVS.find((c) => c.id === id)
