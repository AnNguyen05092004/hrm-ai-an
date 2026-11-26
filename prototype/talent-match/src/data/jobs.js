// Tin tuyển dụng mẫu (dữ liệu giả lập). Lương: triệu đồng/tháng (gross).
// criteria = cây tiêu chí top-down: nhóm (trọng số trên 100) → tiêu chí (trọng số trong nhóm).
// req: must = bắt buộc · important = quan trọng · bonus = cộng điểm. `src` = câu trong JD mà AI trích ra.

const skill = (id, skillId, level, req, weight, src) => ({ id, type: 'skill', skill: skillId, level, req, weight, src })

export const JOBS = [
  {
    id: 'job-cv', code: 'REQ-2611-014', title: 'Kỹ sư AI – Thị giác máy tính', level: 'Senior',
    dept: 'Khối AI', team: 'Thị giác máy tính', city: 'Hà Nội', mode: 'Hybrid', headcount: 2,
    salary: { min: 40, max: 60 }, noticeDays: 45, openedAt: '2026-10-28', recruiter: 'Lê Thu Trang', manager: 'Phạm Quốc Huy',
    status: 'confirmed',
    summary: 'Xây dựng mô hình nhận diện và kiểm tra lỗi sản phẩm bằng camera trên dây chuyền thiết bị thông minh, từ thu thập dữ liệu đến triển khai mô hình chạy trên thiết bị biên.',
    responsibilities: [
      'Thiết kế, huấn luyện và tối ưu mô hình phát hiện lỗi bề mặt, phân loại linh kiện.',
      'Đưa mô hình vào vận hành: đóng gói, giám sát độ chính xác, huấn luyện lại định kỳ.',
      'Kèm cặp 2–3 kỹ sư mới trong nhóm.',
    ],
    requirements: [
      'Tối thiểu 4 năm kinh nghiệm AI/ML, trong đó ít nhất 2 năm về thị giác máy tính.',
      'Thành thạo Python và PyTorch.',
      'Vững OpenCV và các kỹ thuật xử lý ảnh.',
      'Có kinh nghiệm MLOps, Docker.',
      'Ưu tiên: đã làm trong môi trường sản xuất / nhà máy.',
      'Tốt nghiệp Đại học trở lên ngành CNTT, Toán tin, Điện tử.',
      'Tiếng Anh đọc hiểu tài liệu, tương đương IELTS 6.0.',
    ],
    criteria: {
      groups: [
        { id: 'skills', name: 'Kỹ năng chuyên môn', weight: 45, items: [
          skill('c1', 'python', 4, 'must', 25, 'Thành thạo Python và PyTorch.'),
          skill('c2', 'pytorch', 4, 'must', 25, 'Thành thạo Python và PyTorch.'),
          skill('c3', 'opencv', 4, 'important', 20, 'Vững OpenCV và các kỹ thuật xử lý ảnh.'),
          skill('c4', 'mlops', 3, 'important', 15, 'Có kinh nghiệm MLOps, Docker.'),
          skill('c5', 'docker', 3, 'bonus', 15, 'Có kinh nghiệm MLOps, Docker.'),
        ] },
        { id: 'experience', name: 'Kinh nghiệm', weight: 30, items: [
          { id: 'c6', type: 'years', domains: ['ai', 'vision'], min: 4, req: 'must', weight: 50, src: 'Tối thiểu 4 năm kinh nghiệm AI/ML…' },
          { id: 'c7', type: 'years', domains: ['vision'], min: 2, req: 'important', weight: 30, src: '…ít nhất 2 năm về thị giác máy tính.' },
          { id: 'c8', type: 'domain', domain: 'manufacturing', req: 'bonus', weight: 20, src: 'Ưu tiên: đã làm trong môi trường sản xuất / nhà máy.' },
        ] },
        { id: 'education', name: 'Học vấn & chứng chỉ', weight: 10, items: [
          { id: 'c9', type: 'degree', min: 2, majors: ['CNTT', 'Khoa học máy tính', 'Toán tin', 'Điện tử'], req: 'important', weight: 100, src: 'Tốt nghiệp Đại học trở lên ngành CNTT, Toán tin, Điện tử.' },
        ] },
        { id: 'language', name: 'Ngoại ngữ', weight: 5, items: [
          { id: 'c10', type: 'lang', min: 6.0, req: 'important', weight: 100, src: 'Tiếng Anh đọc hiểu tài liệu, tương đương IELTS 6.0.' },
        ] },
        { id: 'soft', name: 'Kỹ năng mềm', weight: 5, items: [
          skill('c11', 'mentoring', 3, 'important', 60, 'Kèm cặp 2–3 kỹ sư mới trong nhóm.'),
          skill('c12', 'problem', 3, 'bonus', 40, 'Suy ra từ mô tả công việc'),
        ] },
        { id: 'conditions', name: 'Điều kiện làm việc', weight: 5, items: [
          { id: 'c13', type: 'location', req: 'important', weight: 40, src: 'Hà Nội · Hybrid' },
          { id: 'c14', type: 'salary', req: 'important', weight: 40, src: 'Ngân sách 40–60 triệu' },
          { id: 'c15', type: 'availability', req: 'bonus', weight: 20, src: 'Nhận việc trong 45 ngày' },
        ] },
      ],
      thresholds: { A: 85, B: 70, C: 50 },
    },
  },
  {
    id: 'job-be', code: 'REQ-2611-009', title: 'Kỹ sư Backend (Java)', level: 'Middle',
    dept: 'Khối Công nghệ', team: 'Nền tảng dịch vụ', city: 'Hà Nội', mode: 'Tại văn phòng', headcount: 3,
    salary: { min: 25, max: 40 }, noticeDays: 30, openedAt: '2026-10-15', recruiter: 'Lê Thu Trang', manager: 'Trần Đức Anh',
    status: 'confirmed',
    summary: 'Phát triển các dịch vụ nền tảng (tài khoản, thông báo, thanh toán nội bộ) phục vụ ứng dụng điều khiển thiết bị thông minh với hàng triệu người dùng.',
    responsibilities: [
      'Thiết kế và phát triển API theo kiến trúc microservices.',
      'Tối ưu hiệu năng cơ sở dữ liệu, bộ nhớ đệm và hàng đợi thông điệp.',
      'Viết kiểm thử, tham gia review code và trực vận hành theo lịch.',
    ],
    requirements: [
      'Từ 3 năm kinh nghiệm phát triển backend.',
      'Thành thạo Java, Spring Boot.',
      'Vững PostgreSQL; có kinh nghiệm Redis, Kafka.',
      'Hiểu kiến trúc microservices, Docker.',
      'Tốt nghiệp Đại học ngành CNTT hoặc tương đương.',
      'Tiếng Anh giao tiếp cơ bản (IELTS 5.5 tương đương).',
    ],
    criteria: {
      groups: [
        { id: 'skills', name: 'Kỹ năng chuyên môn', weight: 50, items: [
          skill('b1', 'java', 4, 'must', 25, 'Thành thạo Java, Spring Boot.'),
          skill('b2', 'spring', 4, 'must', 20, 'Thành thạo Java, Spring Boot.'),
          skill('b3', 'postgresql', 4, 'important', 15, 'Vững PostgreSQL…'),
          skill('b4', 'redis', 3, 'important', 10, '…có kinh nghiệm Redis, Kafka.'),
          skill('b5', 'kafka', 3, 'important', 10, '…có kinh nghiệm Redis, Kafka.'),
          skill('b6', 'microservices', 3, 'important', 10, 'Hiểu kiến trúc microservices, Docker.'),
          skill('b7', 'docker', 3, 'bonus', 10, 'Hiểu kiến trúc microservices, Docker.'),
        ] },
        { id: 'experience', name: 'Kinh nghiệm', weight: 25, items: [
          { id: 'b8', type: 'years', domains: ['backend'], min: 3, req: 'must', weight: 100, src: 'Từ 3 năm kinh nghiệm phát triển backend.' },
        ] },
        { id: 'education', name: 'Học vấn & chứng chỉ', weight: 10, items: [
          { id: 'b9', type: 'degree', min: 2, majors: ['CNTT', 'Khoa học máy tính', 'Kỹ thuật phần mềm', 'Hệ thống thông tin'], req: 'important', weight: 100, src: 'Tốt nghiệp Đại học ngành CNTT hoặc tương đương.' },
        ] },
        { id: 'language', name: 'Ngoại ngữ', weight: 5, items: [
          { id: 'b10', type: 'lang', min: 5.5, req: 'bonus', weight: 100, src: 'Tiếng Anh giao tiếp cơ bản (IELTS 5.5 tương đương).' },
        ] },
        { id: 'soft', name: 'Kỹ năng mềm', weight: 5, items: [
          skill('b11', 'teamwork', 3, 'important', 50, 'Suy ra từ mô tả công việc'),
          skill('b12', 'ownership', 3, 'bonus', 50, 'Trực vận hành theo lịch'),
        ] },
        { id: 'conditions', name: 'Điều kiện làm việc', weight: 5, items: [
          { id: 'b13', type: 'location', req: 'must', weight: 40, src: 'Hà Nội · Tại văn phòng' },
          { id: 'b14', type: 'salary', req: 'important', weight: 40, src: 'Ngân sách 25–40 triệu' },
          { id: 'b15', type: 'availability', req: 'bonus', weight: 20, src: 'Nhận việc trong 30 ngày' },
        ] },
      ],
      thresholds: { A: 85, B: 70, C: 50 },
    },
  },
  {
    id: 'job-de', code: 'REQ-2611-017', title: 'Kỹ sư Dữ liệu', level: 'Middle',
    dept: 'Khối Công nghệ', team: 'Nền tảng dữ liệu', city: 'TP. Hồ Chí Minh', mode: 'Hybrid', headcount: 1,
    salary: { min: 28, max: 42 }, noticeDays: 30, openedAt: '2026-11-03', recruiter: 'Đỗ Hải Yến', manager: 'Ngô Thanh Bình',
    status: 'draft',
    summary: 'Xây dựng kho dữ liệu và luồng xử lý dữ liệu thiết bị (telemetry), phục vụ báo cáo vận hành và huấn luyện mô hình.',
    responsibilities: [
      'Thiết kế pipeline ETL/ELT theo lô và theo luồng.',
      'Mô hình hoá dữ liệu trong kho, đảm bảo chất lượng và lịch sử dữ liệu.',
      'Phối hợp với nhóm AI và nhóm phân tích để cung cấp dữ liệu sạch.',
    ],
    requirements: [
      'Từ 2 năm kinh nghiệm kỹ sư dữ liệu.',
      'Thành thạo SQL, Python.',
      'Có kinh nghiệm Spark, Airflow; biết dbt là lợi thế.',
      'Đã làm với một nền tảng đám mây (GCP hoặc AWS).',
      'Có chứng chỉ Google Professional Data Engineer là lợi thế.',
    ],
    criteria: {
      groups: [
        { id: 'skills', name: 'Kỹ năng chuyên môn', weight: 50, items: [
          skill('d1', 'sql', 4, 'must', 25, 'Thành thạo SQL, Python.'),
          skill('d2', 'python', 3, 'must', 20, 'Thành thạo SQL, Python.'),
          skill('d3', 'spark', 3, 'important', 20, 'Có kinh nghiệm Spark, Airflow…'),
          skill('d4', 'airflow', 3, 'important', 15, 'Có kinh nghiệm Spark, Airflow…'),
          skill('d5', 'gcp', 3, 'important', 10, 'Đã làm với một nền tảng đám mây (GCP hoặc AWS).'),
          skill('d6', 'dbt', 2, 'bonus', 10, '…biết dbt là lợi thế.'),
        ] },
        { id: 'experience', name: 'Kinh nghiệm', weight: 25, items: [
          { id: 'd7', type: 'years', domains: ['data'], min: 2, req: 'must', weight: 100, src: 'Từ 2 năm kinh nghiệm kỹ sư dữ liệu.' },
        ] },
        { id: 'education', name: 'Học vấn & chứng chỉ', weight: 10, items: [
          { id: 'd8', type: 'degree', min: 2, majors: ['CNTT', 'Khoa học máy tính', 'Toán tin', 'Hệ thống thông tin', 'Khoa học dữ liệu'], req: 'important', weight: 60, src: 'Suy ra từ vị trí' },
          { id: 'd9', type: 'cert', cert: 'gcp-de', req: 'bonus', weight: 40, src: 'Có chứng chỉ Google Professional Data Engineer là lợi thế.' },
        ] },
        { id: 'language', name: 'Ngoại ngữ', weight: 5, items: [
          { id: 'd10', type: 'lang', min: 5.5, req: 'bonus', weight: 100, src: 'AI đề xuất (JD không nêu)' },
        ] },
        { id: 'soft', name: 'Kỹ năng mềm', weight: 5, items: [
          skill('d11', 'stakeholder', 3, 'important', 60, 'Phối hợp với nhóm AI và nhóm phân tích…'),
          skill('d12', 'problem', 3, 'bonus', 40, 'Suy ra từ mô tả công việc'),
        ] },
        { id: 'conditions', name: 'Điều kiện làm việc', weight: 5, items: [
          { id: 'd13', type: 'location', req: 'important', weight: 40, src: 'TP. Hồ Chí Minh · Hybrid' },
          { id: 'd14', type: 'salary', req: 'important', weight: 40, src: 'Ngân sách 28–42 triệu' },
          { id: 'd15', type: 'availability', req: 'bonus', weight: 20, src: 'Nhận việc trong 30 ngày' },
        ] },
      ],
      thresholds: { A: 85, B: 70, C: 50 },
    },
  },
  {
    id: 'job-qa', code: 'REQ-2610-031', title: 'Kỹ sư Kiểm thử tự động', level: 'Middle',
    dept: 'Khối Công nghệ', team: 'Chất lượng phần mềm', city: 'Hà Nội', mode: 'Hybrid', headcount: 2,
    salary: { min: 20, max: 32 }, noticeDays: 30, openedAt: '2026-10-02', recruiter: 'Đỗ Hải Yến', manager: 'Trần Đức Anh',
    status: 'confirmed',
    summary: 'Xây dựng bộ kiểm thử tự động cho ứng dụng di động, web quản trị và API của hệ sinh thái thiết bị thông minh.',
    responsibilities: [
      'Viết và duy trì kịch bản kiểm thử tự động giao diện và API.',
      'Tích hợp kiểm thử vào CI/CD, báo cáo chất lượng mỗi bản phát hành.',
      'Phối hợp với lập trình viên để tái hiện và khoanh vùng lỗi.',
    ],
    requirements: [
      'Từ 2 năm kinh nghiệm kiểm thử tự động.',
      'Thành thạo Playwright hoặc Selenium.',
      'Có kinh nghiệm kiểm thử API, viết script bằng TypeScript/JavaScript.',
      'Hiểu CI/CD.',
      'Có chứng chỉ ISTQB là lợi thế.',
    ],
    criteria: {
      groups: [
        { id: 'skills', name: 'Kỹ năng chuyên môn', weight: 50, items: [
          skill('q1', 'playwright', 4, 'must', 30, 'Thành thạo Playwright hoặc Selenium.'),
          skill('q2', 'apitest', 3, 'important', 25, 'Có kinh nghiệm kiểm thử API…'),
          skill('q3', 'typescript', 3, 'important', 20, '…viết script bằng TypeScript/JavaScript.'),
          skill('q4', 'cicd', 3, 'important', 15, 'Hiểu CI/CD.'),
          skill('q5', 'sql', 2, 'bonus', 10, 'AI đề xuất (JD không nêu)'),
        ] },
        { id: 'experience', name: 'Kinh nghiệm', weight: 25, items: [
          { id: 'q6', type: 'years', domains: ['qa'], min: 2, req: 'must', weight: 100, src: 'Từ 2 năm kinh nghiệm kiểm thử tự động.' },
        ] },
        { id: 'education', name: 'Học vấn & chứng chỉ', weight: 10, items: [
          { id: 'q7', type: 'degree', min: 2, majors: ['CNTT', 'Khoa học máy tính', 'Kỹ thuật phần mềm', 'Hệ thống thông tin'], req: 'important', weight: 50, src: 'Suy ra từ vị trí' },
          { id: 'q8', type: 'cert', cert: 'istqb', req: 'bonus', weight: 50, src: 'Có chứng chỉ ISTQB là lợi thế.' },
        ] },
        { id: 'language', name: 'Ngoại ngữ', weight: 5, items: [
          { id: 'q9', type: 'lang', min: 5.0, req: 'bonus', weight: 100, src: 'AI đề xuất (JD không nêu)' },
        ] },
        { id: 'soft', name: 'Kỹ năng mềm', weight: 5, items: [
          skill('q10', 'communication', 3, 'important', 50, 'Phối hợp với lập trình viên…'),
          skill('q11', 'problem', 3, 'important', 50, '…tái hiện và khoanh vùng lỗi.'),
        ] },
        { id: 'conditions', name: 'Điều kiện làm việc', weight: 5, items: [
          { id: 'q12', type: 'location', req: 'important', weight: 40, src: 'Hà Nội · Hybrid' },
          { id: 'q13', type: 'salary', req: 'important', weight: 40, src: 'Ngân sách 20–32 triệu' },
          { id: 'q14', type: 'availability', req: 'bonus', weight: 20, src: 'Nhận việc trong 30 ngày' },
        ] },
      ],
      thresholds: { A: 85, B: 70, C: 50 },
    },
  },
  {
    id: 'job-emb', code: 'REQ-2611-021', title: 'Kỹ sư Phần mềm nhúng', level: 'Senior',
    dept: 'Khối Thiết bị', team: 'Firmware thiết bị gia dụng thông minh', city: 'Hà Nội', mode: 'Tại văn phòng', headcount: 2,
    salary: { min: 35, max: 50 }, noticeDays: 45, openedAt: '2026-11-06', recruiter: 'Lê Thu Trang', manager: 'Vũ Minh Tâm',
    status: 'draft',
    summary: 'Phát triển firmware cho dòng thiết bị gia dụng thông minh: điều khiển cảm biến, kết nối không dây và cập nhật phần mềm từ xa.',
    responsibilities: [
      'Phát triển firmware trên vi điều khiển chạy RTOS.',
      'Viết driver giao tiếp cảm biến và ngoại vi.',
      'Dẫn dắt nhóm 3–4 kỹ sư, review thiết kế và code.',
    ],
    requirements: [
      'Từ 5 năm kinh nghiệm phần mềm nhúng, trong đó có thiết bị IoT.',
      'Thành thạo C, biết C++.',
      'Vững RTOS và giao tiếp ngoại vi UART/I2C/SPI.',
      'Đã từng dẫn dắt nhóm.',
      'Tốt nghiệp Đại học ngành Điện tử – Viễn thông, Tự động hoá hoặc CNTT.',
    ],
    criteria: {
      groups: [
        { id: 'skills', name: 'Kỹ năng chuyên môn', weight: 45, items: [
          skill('e1', 'c', 4, 'must', 30, 'Thành thạo C, biết C++.'),
          skill('e2', 'rtos', 4, 'must', 25, 'Vững RTOS…'),
          skill('e3', 'periph', 4, 'important', 25, '…giao tiếp ngoại vi UART/I2C/SPI.'),
          skill('e4', 'cpp', 2, 'bonus', 10, 'Thành thạo C, biết C++.'),
          skill('e5', 'emblinux', 2, 'bonus', 10, 'AI đề xuất (JD không nêu)'),
        ] },
        { id: 'experience', name: 'Kinh nghiệm', weight: 30, items: [
          { id: 'e6', type: 'years', domains: ['embedded'], min: 5, req: 'must', weight: 50, src: 'Từ 5 năm kinh nghiệm phần mềm nhúng…' },
          { id: 'e7', type: 'domain', domain: 'iot', req: 'important', weight: 25, src: '…trong đó có thiết bị IoT.' },
          { id: 'e8', type: 'role', role: 'lead', req: 'important', weight: 25, src: 'Đã từng dẫn dắt nhóm.' },
        ] },
        { id: 'education', name: 'Học vấn & chứng chỉ', weight: 10, items: [
          { id: 'e9', type: 'degree', min: 2, majors: ['Điện tử', 'Điện tử – Viễn thông', 'Tự động hoá', 'CNTT'], req: 'important', weight: 100, src: 'Tốt nghiệp Đại học ngành Điện tử – Viễn thông, Tự động hoá hoặc CNTT.' },
        ] },
        { id: 'language', name: 'Ngoại ngữ', weight: 5, items: [
          { id: 'e10', type: 'lang', min: 5.5, req: 'bonus', weight: 100, src: 'AI đề xuất (đọc datasheet tiếng Anh)' },
        ] },
        { id: 'soft', name: 'Kỹ năng mềm', weight: 5, items: [
          skill('e11', 'leadership', 3, 'important', 100, 'Dẫn dắt nhóm 3–4 kỹ sư…'),
        ] },
        { id: 'conditions', name: 'Điều kiện làm việc', weight: 5, items: [
          { id: 'e12', type: 'location', req: 'must', weight: 40, src: 'Hà Nội · Tại văn phòng (làm việc với phần cứng)' },
          { id: 'e13', type: 'salary', req: 'important', weight: 40, src: 'Ngân sách 35–50 triệu' },
          { id: 'e14', type: 'availability', req: 'bonus', weight: 20, src: 'Nhận việc trong 45 ngày' },
        ] },
      ],
      thresholds: { A: 85, B: 70, C: 50 },
    },
  },
  {
    id: 'job-fe', code: 'REQ-2611-011', title: 'Kỹ sư Frontend (React)', level: 'Middle',
    dept: 'Khối Công nghệ', team: 'Ứng dụng web', city: 'Hà Nội', mode: 'Từ xa', headcount: 2,
    salary: { min: 22, max: 35 }, noticeDays: 30, openedAt: '2026-10-21', recruiter: 'Đỗ Hải Yến', manager: 'Trần Đức Anh',
    status: 'confirmed',
    summary: 'Phát triển cổng quản trị thiết bị và trang tự phục vụ cho khách hàng doanh nghiệp. Làm việc từ xa toàn thời gian.',
    responsibilities: [
      'Xây dựng giao diện bằng React, TypeScript theo hệ thống thiết kế chung.',
      'Tối ưu hiệu năng tải trang và khả năng truy cập.',
      'Viết kiểm thử đơn vị và phối hợp với thiết kế trên Figma.',
    ],
    requirements: [
      'Từ 2 năm kinh nghiệm frontend.',
      'Thành thạo React, TypeScript.',
      'Vững HTML/CSS; biết Next.js là lợi thế.',
      'Có kinh nghiệm viết kiểm thử đơn vị.',
      'Đọc được bản thiết kế Figma.',
    ],
    criteria: {
      groups: [
        { id: 'skills', name: 'Kỹ năng chuyên môn', weight: 55, items: [
          skill('f1', 'react', 4, 'must', 30, 'Thành thạo React, TypeScript.'),
          skill('f2', 'typescript', 4, 'must', 25, 'Thành thạo React, TypeScript.'),
          skill('f3', 'css', 4, 'important', 15, 'Vững HTML/CSS…'),
          skill('f4', 'jest', 3, 'important', 15, 'Có kinh nghiệm viết kiểm thử đơn vị.'),
          skill('f5', 'nextjs', 3, 'bonus', 10, '…biết Next.js là lợi thế.'),
          skill('f6', 'figma', 2, 'bonus', 5, 'Đọc được bản thiết kế Figma.'),
        ] },
        { id: 'experience', name: 'Kinh nghiệm', weight: 25, items: [
          { id: 'f7', type: 'years', domains: ['frontend'], min: 2, req: 'must', weight: 100, src: 'Từ 2 năm kinh nghiệm frontend.' },
        ] },
        { id: 'education', name: 'Học vấn & chứng chỉ', weight: 5, items: [
          { id: 'f8', type: 'degree', min: 1, majors: [], req: 'bonus', weight: 100, src: 'AI đề xuất (JD không nêu)' },
        ] },
        { id: 'language', name: 'Ngoại ngữ', weight: 5, items: [
          { id: 'f9', type: 'lang', min: 5.5, req: 'bonus', weight: 100, src: 'AI đề xuất (JD không nêu)' },
        ] },
        { id: 'soft', name: 'Kỹ năng mềm', weight: 5, items: [
          skill('f10', 'communication', 3, 'important', 50, 'Làm việc từ xa toàn thời gian'),
          skill('f11', 'ownership', 3, 'important', 50, 'Làm việc từ xa toàn thời gian'),
        ] },
        { id: 'conditions', name: 'Điều kiện làm việc', weight: 5, items: [
          { id: 'f12', type: 'location', req: 'bonus', weight: 20, src: 'Từ xa – không xét địa điểm' },
          { id: 'f13', type: 'salary', req: 'important', weight: 60, src: 'Ngân sách 22–35 triệu' },
          { id: 'f14', type: 'availability', req: 'bonus', weight: 20, src: 'Nhận việc trong 30 ngày' },
        ] },
      ],
      thresholds: { A: 85, B: 70, C: 50 },
    },
  },
  {
    id: 'job-po', code: 'REQ-2611-005', title: 'Product Owner – Nền tảng nhân sự số', level: 'Senior',
    dept: 'Khối Sản phẩm', team: 'Sản phẩm nội bộ', city: 'Hà Nội', mode: 'Hybrid', headcount: 1,
    salary: { min: 40, max: 55 }, noticeDays: 45, openedAt: '2026-10-09', recruiter: 'Lê Thu Trang', manager: 'Hoàng Mai Linh',
    status: 'confirmed',
    summary: 'Chịu trách nhiệm sản phẩm cho nền tảng nhân sự số: tuyển dụng, đào tạo, chấm công. Làm việc trực tiếp với khối Nhân sự và nhóm kỹ thuật.',
    responsibilities: [
      'Xây dựng lộ trình sản phẩm, viết user story và quản lý backlog.',
      'Khám phá nhu cầu người dùng, đo lường bằng dữ liệu.',
      'Điều phối các bên liên quan: Nhân sự, Pháp chế, Kỹ thuật.',
    ],
    requirements: [
      'Từ 4 năm kinh nghiệm quản lý sản phẩm số, ưu tiên phần mềm nhân sự.',
      'Thành thạo Scrum và quản lý backlog.',
      'Có kỹ năng phân tích dữ liệu sản phẩm (SQL cơ bản là lợi thế).',
      'Kỹ năng làm việc với các bên liên quan, đàm phán.',
      'Tiếng Anh tốt (IELTS 6.5 tương đương).',
      'Có chứng chỉ CSPO hoặc PSM là lợi thế.',
    ],
    criteria: {
      groups: [
        { id: 'skills', name: 'Kỹ năng chuyên môn', weight: 35, items: [
          skill('p1', 'backlog', 4, 'must', 30, 'Thành thạo Scrum và quản lý backlog.'),
          skill('p2', 'scrum', 4, 'important', 20, 'Thành thạo Scrum và quản lý backlog.'),
          skill('p3', 'discovery', 3, 'important', 25, 'Khám phá nhu cầu người dùng…'),
          skill('p4', 'analytics', 3, 'important', 15, 'Có kỹ năng phân tích dữ liệu sản phẩm…'),
          skill('p5', 'sql', 2, 'bonus', 10, '…SQL cơ bản là lợi thế.'),
        ] },
        { id: 'experience', name: 'Kinh nghiệm', weight: 30, items: [
          { id: 'p6', type: 'years', domains: ['product'], min: 4, req: 'must', weight: 60, src: 'Từ 4 năm kinh nghiệm quản lý sản phẩm số…' },
          { id: 'p7', type: 'domain', domain: 'hrtech', req: 'bonus', weight: 40, src: '…ưu tiên phần mềm nhân sự.' },
        ] },
        { id: 'education', name: 'Học vấn & chứng chỉ', weight: 5, items: [
          { id: 'p8', type: 'cert', cert: 'cspo', alt: ['psm'], req: 'bonus', weight: 100, src: 'Có chứng chỉ CSPO hoặc PSM là lợi thế.' },
        ] },
        { id: 'language', name: 'Ngoại ngữ', weight: 10, items: [
          { id: 'p9', type: 'lang', min: 6.5, req: 'important', weight: 100, src: 'Tiếng Anh tốt (IELTS 6.5 tương đương).' },
        ] },
        { id: 'soft', name: 'Kỹ năng mềm', weight: 15, items: [
          skill('p10', 'stakeholder', 4, 'must', 60, 'Kỹ năng làm việc với các bên liên quan…'),
          skill('p11', 'negotiation', 3, 'important', 40, '…đàm phán.'),
        ] },
        { id: 'conditions', name: 'Điều kiện làm việc', weight: 5, items: [
          { id: 'p12', type: 'location', req: 'important', weight: 40, src: 'Hà Nội · Hybrid' },
          { id: 'p13', type: 'salary', req: 'important', weight: 40, src: 'Ngân sách 40–55 triệu' },
          { id: 'p14', type: 'availability', req: 'bonus', weight: 20, src: 'Nhận việc trong 45 ngày' },
        ] },
      ],
      thresholds: { A: 85, B: 70, C: 50 },
    },
  },
  {
    id: 'job-hr', code: 'REQ-2611-002', title: 'Chuyên viên Tuyển dụng Công nghệ', level: 'Middle',
    dept: 'Khối Nhân sự', team: 'Thu hút nhân tài', city: 'Hà Nội', mode: 'Tại văn phòng', headcount: 1,
    salary: { min: 18, max: 28 }, noticeDays: 30, openedAt: '2026-11-01', recruiter: 'Hoàng Mai Linh', manager: 'Hoàng Mai Linh',
    status: 'confirmed',
    summary: 'Tuyển dụng các vị trí kỹ thuật và AI: tìm nguồn, sàng lọc, phỏng vấn và chăm sóc ứng viên đến khi nhận việc.',
    responsibilities: [
      'Chủ động tìm nguồn ứng viên kỹ thuật trên nhiều kênh.',
      'Phỏng vấn sơ loại theo năng lực, phối hợp với quản lý tuyển dụng.',
      'Vận hành quy trình trên ATS, báo cáo chỉ số tuyển dụng.',
    ],
    requirements: [
      'Từ 2 năm kinh nghiệm tuyển dụng, ưu tiên mảng công nghệ.',
      'Thành thạo tìm nguồn và phỏng vấn theo năng lực.',
      'Đã vận hành một hệ thống ATS.',
      'Giao tiếp, đàm phán tốt.',
      'Tiếng Anh giao tiếp (IELTS 6.0 tương đương).',
    ],
    criteria: {
      groups: [
        { id: 'skills', name: 'Kỹ năng chuyên môn', weight: 40, items: [
          skill('h1', 'sourcing', 4, 'must', 35, 'Thành thạo tìm nguồn và phỏng vấn theo năng lực.'),
          skill('h2', 'interviewing', 3, 'must', 30, 'Thành thạo tìm nguồn và phỏng vấn theo năng lực.'),
          skill('h3', 'ats', 3, 'important', 20, 'Đã vận hành một hệ thống ATS.'),
          skill('h4', 'branding', 2, 'bonus', 15, 'AI đề xuất (JD không nêu)'),
        ] },
        { id: 'experience', name: 'Kinh nghiệm', weight: 30, items: [
          { id: 'h5', type: 'years', domains: ['recruit'], min: 2, req: 'must', weight: 70, src: 'Từ 2 năm kinh nghiệm tuyển dụng…' },
          { id: 'h6', type: 'domain', domain: 'backend', alt: ['ai', 'frontend', 'data', 'qa'], label: 'Tuyển dụng mảng công nghệ', req: 'bonus', weight: 30, src: '…ưu tiên mảng công nghệ.' },
        ] },
        { id: 'education', name: 'Học vấn & chứng chỉ', weight: 5, items: [
          { id: 'h7', type: 'degree', min: 2, majors: [], req: 'important', weight: 100, src: 'AI đề xuất (JD không nêu)' },
        ] },
        { id: 'language', name: 'Ngoại ngữ', weight: 10, items: [
          { id: 'h8', type: 'lang', min: 6.0, req: 'important', weight: 100, src: 'Tiếng Anh giao tiếp (IELTS 6.0 tương đương).' },
        ] },
        { id: 'soft', name: 'Kỹ năng mềm', weight: 10, items: [
          skill('h9', 'communication', 4, 'must', 60, 'Giao tiếp, đàm phán tốt.'),
          skill('h10', 'negotiation', 3, 'important', 40, 'Giao tiếp, đàm phán tốt.'),
        ] },
        { id: 'conditions', name: 'Điều kiện làm việc', weight: 5, items: [
          { id: 'h11', type: 'location', req: 'important', weight: 40, src: 'Hà Nội · Tại văn phòng' },
          { id: 'h12', type: 'salary', req: 'important', weight: 40, src: 'Ngân sách 18–28 triệu' },
          { id: 'h13', type: 'availability', req: 'bonus', weight: 20, src: 'Nhận việc trong 30 ngày' },
        ] },
      ],
      thresholds: { A: 85, B: 70, C: 50 },
    },
  },
]

export const jobById = (id) => JOBS.find((j) => j.id === id)
