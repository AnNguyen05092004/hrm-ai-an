// Dữ liệu mẫu cho prototype. Mọi thứ chạy trên trình duyệt, không gọi API.
import { MORE_ARTIFACTS, MORE_KITS, MORE_SUBMISSIONS, MORE_MISSED } from './data-more'

export const FORMATS = {
  qr: {
    name: 'Tài liệu nhanh', en: 'Quick Reference', bg: '#e3f1fd', fg: '#1e88e5',
    desc: 'Những điều cốt lõi trong một khóa ngắn', long: 'Một khóa ngắn bao quát toàn bộ chủ đề', note: 'Tối đa 3 bài',
  },
  deck: {
    name: 'Bộ slide', en: 'Training Deck', bg: '#fff1dc', fg: '#e8930c',
    desc: 'Slide gọn đẹp, dễ chia sẻ và cập nhật', long: 'Slide để trình bày hoặc gửi đi',
  },
  guide: {
    name: 'Hướng dẫn từng bước', en: 'Guide', bg: '#e5f6e1', fg: '#4caf3d',
    desc: 'Các bước để hoàn thành một việc', long: 'Hướng dẫn từng bước kèm ảnh chụp từ video', req: 'Cần video có lời thuyết minh. Tối đa 500 MB, 45 phút.',
  },
  scenario: {
    name: 'Tình huống', en: 'Scenario', bg: '#ece9fd', fg: '#7765e3',
    desc: 'Luyện hội thoại với tình huống thật', long: 'Một đoạn chat mô phỏng có các lựa chọn trả lời',
  },
  video: {
    name: 'Video tương tác', en: 'Interactive Video', bg: '#fde3e3', fg: '#e32b22',
    desc: 'Video có chương và điểm kiểm tra', long: 'Chương và điểm kiểm tra gắn vào video', req: 'Tải video lên, hoặc để AI tạo video từ slide và giọng đọc AI.',
  },
}

export const SKILLS = [
  { id: 'docker', name: 'Container (Docker)', comp: 'Hạ tầng & triển khai' },
  { id: 'k8s', name: 'Kubernetes', comp: 'Hạ tầng & triển khai' },
  { id: 'sql', name: 'SQL & mô hình dữ liệu', comp: 'Dữ liệu' },
  { id: 'ml', name: 'Huấn luyện mô hình ML', comp: 'AI/ML' },
  { id: 'onb', name: 'Quy định nội bộ', comp: 'Hội nhập' },
  { id: 'sec', name: 'An toàn thông tin', comp: 'Tuân thủ' },
  { id: 'lead', name: 'Phản hồi và kèm cặp', comp: 'Lãnh đạo' },
  { id: 'cs', name: 'Xử lý khiếu nại khách hàng', comp: 'Dịch vụ khách hàng' },
  { id: 'sales', name: 'Tư vấn bán hàng', comp: 'Kinh doanh' },
  { id: 'safety', name: 'An toàn lao động', comp: 'Tuân thủ' },
  { id: 'cicd', name: 'CI/CD và release', comp: 'Hạ tầng & triển khai' },
  { id: 'mlops', name: 'Triển khai và vận hành model', comp: 'AI/ML' },
  { id: 'cloud', name: 'Hạ tầng cloud', comp: 'Hạ tầng & triển khai' },
  { id: 'agent', name: 'Xây dựng AI agent', comp: 'AI/ML' },
  { id: 'req', name: 'Phân tích yêu cầu nghiệp vụ', comp: 'Nghiệp vụ' },
]

export const LEVELS = [
  { v: 1, name: 'Mức 1 · Biết khái niệm', kinds: 'Trắc nghiệm' },
  { v: 2, name: 'Mức 2 · Làm được khi có hướng dẫn', kinds: 'Trắc nghiệm tình huống + tự luận ngắn' },
  { v: 3, name: 'Mức 3 · Làm độc lập', kinds: 'Bài code / thực hành + tự luận tình huống' },
]

const SRC1 = 'Docker-Volumes-NoiBo.pdf'
const SRC2 = 'Runbook-Backup-v2.docx'

/* ---------- Kit mẫu đã tạo xong ---------- */

const qrDocker = {
  id: 'a-qr', kitId: 'k-docker', type: 'qr', title: 'Lệnh và lựa chọn khi dùng Docker Volume',
  summary: 'Giải thích vì sao dữ liệu container biến mất, khi nào dùng named volume hay bind mount, cách tạo, sao lưu và khôi phục volume. Là cẩm nang thực hành cho kỹ sư mới.',
  status: 'published', updated: '18/11/2026 09:12', img: 'server', viewers: 42, sessions: 61, done: 31, link: 'learn.example.com/s/docker-volume',
  lessons: [
    {
      id: 'l1', kind: 'lesson', title: 'Vì sao dữ liệu container biến mất',
      blocks: [
        { id: 'b1', t: 'image', cap: 'Ổ dữ liệu bên ngoài container', img: 'rack' },
        { id: 'b2', t: 'para', p: 'Nhiều kỹ sư mới bất ngờ khi thấy dữ liệu mất sau lần khởi động lại container. Hiểu cách Docker lưu dữ liệu giúp bạn làm việc ổn định, dù chạy ở máy cá nhân hay môi trường thật.', src: `${SRC1} · mục 1` },
        { id: 'b3', t: 'list', intro: 'Học xong bài này, bạn có thể:', items: ['Giải thích vì sao dữ liệu container mất sau khi khởi động lại', 'Phân biệt hệ thống file tạm của container và volume lưu bền', 'Xác định khi nào cần dùng volume cho dữ liệu quan trọng'] },
        { id: 'b4', t: 'flash', h: 'Lỗi hay gặp khi lưu dữ liệu', p: 'Lật từng thẻ để xem lỗi thường gặp và cách làm đúng.', cards: [
          { f: 'Ghi dữ liệu vào trong container', b: 'Mất khi container bị xóa. Hãy gắn volume vào thư mục dữ liệu.' },
          { f: 'Gõ sai đường dẫn bind mount', b: 'Docker tạo thư mục rỗng mới, ứng dụng tưởng dữ liệu đã mất.' },
          { f: 'Xóa volume bằng docker volume prune', b: 'Lệnh xóa mọi volume không gắn với container nào. Kiểm tra trước khi chạy.' },
        ], src: `${SRC1} · mục 4` },
        { id: 'b5', t: 'heading', h: 'Hệ thống file tạm và volume lưu bền', p: 'Container bắt đầu với một hệ thống file tạm mỗi lần chạy. Dữ liệu ghi vào đó mất khi container dừng hoặc bị xóa. Docker cung cấp volume và bind mount để lưu dữ liệu bên ngoài vòng đời container.', src: `${SRC1} · mục 1.2` },
        { id: 'b6', t: 'accordion', h: 'Docker lưu dữ liệu thế nào', p: 'Mỗi cách có cách dùng và hệ quả riêng. Mở từng mục để xem chi tiết.', items: [
          { t: 'Hệ thống file tạm của container', b: 'Nằm trong lớp ghi của container. Xóa container là mất.' },
          { t: 'Named volume', b: 'Docker quản lý, nằm ngoài container, dùng lại được giữa nhiều container.' },
          { t: 'Bind mount', b: 'Gắn thẳng một thư mục trên máy vào container. Hợp với lúc phát triển ở máy cá nhân.' },
        ], src: `${SRC1} · mục 2` },
        { id: 'b7', t: 'kc', q: 'Dữ liệu ghi vào trong container (không gắn volume) sẽ thế nào khi container bị xóa?', choices: ['Vẫn còn trong image', 'Mất cùng container', 'Tự chuyển sang named volume'], correct: 1 },
      ],
    },
    {
      id: 'l2', kind: 'lesson', title: 'Chọn và dùng volume: named volume hay bind mount',
      blocks: [
        { id: 'c1', t: 'heading', h: 'Tiêu chí chọn', p: 'Bắt đầu từ mục đích, không phải từ cú pháp. Dữ liệu của dịch vụ cần bền thì dùng named volume. Cần sửa file trên máy và thấy ngay trong container thì dùng bind mount.', src: `${SRC1} · mục 3` },
        { id: 'c2', t: 'table', head: ['Trường hợp', 'Nên chọn', 'Lý do'], rows: [['Cơ sở dữ liệu', 'Named volume', 'Lưu bền, Docker quản lý'], ['Code khi phát triển', 'Bind mount', 'Sửa là thấy ngay'], ['Môi trường thật', 'Named volume', 'Ít phụ thuộc máy chủ'], ['Sao lưu', 'Named volume', 'Dễ đóng gói, khôi phục']], src: `${SRC1} · bảng 3.1` },
        { id: 'c3', t: 'code', h: 'Tạo và gắn named volume', code: 'docker volume create pgdata\ndocker run -d --name db \\\n  -v pgdata:/var/lib/postgresql/data postgres:16', src: `${SRC1} · mục 3.2` },
        { id: 'c4', t: 'gap', p: 'Tài liệu nguồn chưa có hướng dẫn cho Docker Compose trên Windows. AI không tự viết thêm phần này.' },
      ],
    },
    {
      id: 'l3', kind: 'lesson', title: 'Sao lưu và khôi phục Docker volume',
      blocks: [
        { id: 'd1', t: 'heading', h: 'Vì sao phải sao lưu', p: 'Volume lưu bền nhưng vẫn có thể mất khi máy chủ hỏng hoặc chạy nhầm lệnh xóa. Sao lưu định kỳ giúp khôi phục nhanh.', src: `${SRC2} · mục 1` },
        { id: 'd2', t: 'process', h: 'Các bước sao lưu', steps: ['Dừng ghi vào volume hoặc bật chế độ chỉ đọc', 'Chạy container tạm gắn volume và thư mục sao lưu', 'Nén dữ liệu bằng tar ra file .tar.gz', 'Kiểm tra file sao lưu mở được'], src: `${SRC2} · mục 2` },
        { id: 'd3', t: 'code', h: 'Lệnh sao lưu mẫu', code: 'docker run --rm -v pgdata:/data -v $(pwd):/backup \\\n  busybox tar czf /backup/pgdata.tar.gz /data', src: `${SRC2} · mục 2.3` },
      ],
    },
    { id: 'quiz', kind: 'quiz', title: 'Bài kiểm tra' },
  ],
  quiz: {
    mode: 'official', skill: 'docker', level: 2, passScore: 80, attempts: 2, minutes: 30, proctor: true,
    questions: [
      { id: 'q1', type: 'mc', level: 1, approved: true, q: 'Dữ liệu ghi vào trong container mà không gắn volume sẽ mất khi nào?', src: `${SRC1} · mục 1`, choices: [
        { t: 'Khi container bị xóa', ok: true, fb: 'Đúng. Lớp ghi của container bị xóa cùng container.' },
        { t: 'Khi đổi tên image', ok: false, fb: 'Đổi tên image không ảnh hưởng tới container đang chạy.' },
        { t: 'Không bao giờ mất', ok: false, fb: 'Dữ liệu trong lớp ghi chỉ tồn tại cùng container.' },
      ] },
      { id: 'q2', type: 'mc', level: 2, approved: true, q: 'Lệnh nào tạo đúng file sao lưu cho named volume `pgdata` vào thư mục hiện tại?', src: `${SRC2} · mục 2.3`, choices: [
        { t: 'docker cp pgdata /backup/pgdata.tar.gz', ok: false, fb: '`docker cp` chép file giữa container và máy, không đọc trực tiếp named volume.' },
        { t: 'docker volume rm pgdata && tar czf ...', ok: false, fb: 'Lệnh này xóa volume trước khi sao lưu.' },
        { t: 'docker save pgdata -o pgdata.tar.gz', ok: false, fb: '`docker save` dùng cho image, không cho volume.' },
        { t: 'docker run --rm -v pgdata:/data -v $(pwd):/backup busybox tar czf /backup/pgdata.tar.gz /data', ok: true, fb: 'Đúng. Container tạm gắn volume và thư mục hiện tại rồi nén bằng tar.' },
      ] },
      { id: 'q3', type: 'essay', level: 2, approved: true, q: 'Đội bạn có 2 dịch vụ: một cơ sở dữ liệu cần giữ dữ liệu khi triển khai lại, và một web app đang phát triển ở máy cá nhân. Bạn chọn cách lưu dữ liệu nào cho từng dịch vụ? Giải thích ngắn.', src: `${SRC1} · mục 3`,
        rubric: ['Chọn named volume cho cơ sở dữ liệu', 'Chọn bind mount cho web app khi phát triển', 'Nêu được lý do (lưu bền / sửa là thấy ngay)'], kw: ['named', 'bind', 'vì|lưu bền|thấy ngay|giữ'] },
      { id: 'q4', type: 'fill', level: 1, approved: false, q: 'Để tạo named volume tên mydata, chạy lệnh: docker volume ______ mydata', answer: 'create', src: `${SRC1} · mục 3.2` },
      { id: 'q5', type: 'code', level: 3, approved: false, q: 'Viết script `backup.sh` nhận tên volume làm tham số, nén volume ra file `<tên>-<ngày>.tar.gz` trong thư mục ./backups.', src: `${SRC2} · mục 2`,
        tests: ['Tạo được file ./backups/pgdata-YYYYMMDD.tar.gz', 'Báo lỗi khi volume không tồn tại', 'Không dừng container đang chạy'] },
    ],
  },
}

const deckDocker = {
  id: 'a-deck', kitId: 'k-docker', type: 'deck', title: 'Named volume và bind mount',
  summary: 'Bộ slide cho buổi chia sẻ 15 phút về khi nào dùng named volume, khi nào dùng bind mount.',
  status: 'draft', updated: '18/11/2026 09:20', img: 'desk', viewers: 0, sessions: 0, done: 0,
  slides: [
    { id: 's1', layout: 'cover', title: 'Vì sao dữ liệu container biến mất', sub: 'Container dùng xong có thể bỏ. Dữ liệu của bạn thì không.', notes: 'Mở đầu bằng câu hỏi: ai đã từng dựng lại container rồi thấy dữ liệu mất? Nhấn mạnh đây là cách Docker vận hành, không phải lỗi của người dùng.' },
    { id: 's2', layout: 'two', title: 'Dữ liệu của bạn: tạm hay bền?', cols: [['Lớp ghi của container', 'Mất khi xóa container', 'Không chia sẻ được'], ['Volume', 'Nằm ngoài container', 'Dùng lại giữa nhiều container']], notes: 'So sánh hai cột, hỏi người nghe đang lưu dữ liệu ở đâu.' },
    { id: 's3', layout: 'steps', title: 'Lộ trình hôm nay', items: ['Các loại volume', 'Khi nào dùng', 'Sao lưu', 'Lỗi hay gặp'], notes: 'Giới thiệu nhanh 4 phần.' },
    { id: 's4', layout: 'bullets', title: 'Named volume: đơn giản và ổn định', items: ['Docker quản lý vị trí lưu', 'Hợp cho cơ sở dữ liệu và môi trường thật', 'Dễ sao lưu và khôi phục'], notes: 'Nhấn mạnh named volume là lựa chọn mặc định cho dữ liệu cần giữ.' },
    { id: 's5', layout: 'bullets', title: 'Bind mount: lối tắt khi phát triển', items: ['Gắn thẳng thư mục trên máy', 'Sửa code là thấy ngay', 'Cẩn thận đường dẫn sai'], notes: 'Demo nhanh lệnh -v ./src:/app.' },
    { id: 's6', layout: 'table', title: 'Tài liệu nhanh: chọn đúng loại volume', head: ['Trường hợp', 'Chọn', 'Quy tắc'], rows: [['Cơ sở dữ liệu', 'Named volume', 'Lưu an toàn'], ['Code ở máy', 'Bind mount', 'Sửa trực tiếp'], ['Môi trường thật', 'Named volume', 'Ít phụ thuộc máy chủ'], ['Sao lưu', 'Named volume', 'Đích rõ ràng']], notes: 'Bắt đầu từ mục đích, không phải từ cú pháp.' },
    { id: 's7', layout: 'bullets', title: 'Kế hoạch hành động', items: ['Rà lại các container đang chạy', 'Chuyển dữ liệu quan trọng sang named volume', 'Đặt lịch sao lưu hằng tuần'], notes: 'Kết thúc bằng 3 việc làm ngay trong tuần.' },
  ],
}

const scenarioDocker = {
  id: 'a-scn', kitId: 'k-docker', type: 'scenario', title: 'Sửa cấu hình làm mất dữ liệu',
  summary: 'Người học nhận diện và sửa cấu hình volume rủi ro, chọn cách lưu và sao lưu an toàn.',
  status: 'draft', updated: '18/11/2026 09:05', img: 'person', viewers: 0, sessions: 0, done: 0,
  experience: 'photo', frame: 'full',
  character: { name: 'Chị Hạnh', role: 'Kỹ sư cao cấp, phụ trách triển khai container' },
  learner: 'Kỹ sư phần mềm mới, chưa quen Docker volume',
  scenes: [
    { id: 'sc1', title: 'Cảnh 1', goal: 'Kiểm tra người học có chọn named volume cho dữ liệu cần giữ không', cards: [
      { id: 'c1', kind: 'char', text: 'Container của em mất dữ liệu sau mỗi lần khởi động lại, mà bind mount trông khá lỏng. Có nên chuyển sang named volume trước khi mất thêm dữ liệu không?' },
      { id: 'c2', kind: 'decision', choices: [
        { t: 'Em nghĩ dữ liệu cần giữ nên chuyển sang named volume, vì như vậy an toàn hơn bind mount.', ok: 'good', reply: 'Đúng hướng. Đường triển khai rõ hơn khi có named volume. Vậy nếu khởi động lại hoặc triển khai lỗi, dữ liệu cần được bảo vệ thêm thế nào?' },
        { t: 'Em sẽ giữ bind mount làm mặc định cho đơn giản và thống nhất.', ok: 'bad', reply: 'Dữ liệu vẫn còn hở. Nếu đường dẫn trên máy chủ sai, ứng dụng sẽ thấy thư mục rỗng.' },
        { t: 'Em muốn kiểm tra dữ liệu cần cấu hình thêm gì trước khi đổi.', ok: 'neutral', reply: 'Cẩn thận là tốt, nhưng đang mất dữ liệu thì cần quyết nhanh hơn.' },
      ] },
    ] },
    { id: 'sc2', title: 'Cảnh 2', goal: 'Chọn chiến lược sao lưu', cards: [
      { id: 'c3', kind: 'char', text: 'Volume đã chuyển xong. Em định sao lưu thế nào?' },
      { id: 'c4', kind: 'decision', choices: [
        { t: 'Em đặt lịch sao lưu định kỳ ra file nén, có kiểm tra khôi phục.', ok: 'good', reply: 'Tốt. Nhớ thử khôi phục ít nhất một lần.' },
        { t: 'Chỉ sao lưu khi có thay đổi lớn.', ok: 'bad', reply: 'Sự cố thường đến lúc không có thay đổi lớn nào.' },
      ] },
    ] },
    { id: 'sc3', title: 'Cảnh 3', goal: 'Rà lại cấu hình trước khi triển khai', cards: [
      { id: 'c5', kind: 'char', text: 'Trước khi đưa lên môi trường thật, em kiểm tra gì?' },
    ] },
  ],
}

const videoDocker = {
  id: 'a-vid', kitId: 'k-docker', type: 'video', title: 'Docker Volume trong 8 phút',
  summary: 'Video do AI tạo từ bộ slide và giọng đọc AI, đã chia chương và chép lời. Có điểm kiểm tra giữa video.',
  status: 'published', updated: '17/11/2026 16:40', img: 'video', viewers: 37, sessions: 44, done: 25, link: 'learn.example.com/s/docker-8-phut',
  ai: true, voice: 'Giọng nữ miền Bắc · AI', duration: 492,
  chapters: [
    { t: 0, title: 'Vì sao dữ liệu container biến mất' },
    { t: 95, title: 'Named volume' },
    { t: 192, title: 'Bind mount' },
    { t: 288, title: 'Sao lưu volume' },
    { t: 400, title: 'Lỗi hay gặp' },
  ],
  checkpoints: [
    { t: 180, q: 'Dữ liệu cơ sở dữ liệu nên lưu ở đâu?', choices: ['Trong container', 'Named volume', 'Bind mount'], correct: 1 },
    { t: 390, q: 'Lệnh sao lưu dùng container tạm nào trong ví dụ?', choices: ['busybox', 'postgres', 'nginx'], correct: 0 },
  ],
  transcript: [
    { t: 0, x: 'Mỗi container có một lớp ghi riêng. Khi bạn xóa container, lớp ghi này mất theo.' },
    { t: 48, x: 'Vì vậy mọi dữ liệu cần giữ phải nằm ngoài container.' },
    { t: 95, x: 'Named volume do Docker quản lý. Bạn chỉ cần đặt tên và gắn vào thư mục dữ liệu.' },
    { t: 150, x: 'Đây là lựa chọn mặc định cho cơ sở dữ liệu và môi trường thật.' },
    { t: 192, x: 'Bind mount gắn thẳng một thư mục trên máy vào container, rất tiện khi đang sửa code.' },
    { t: 245, x: 'Cẩn thận: gõ sai đường dẫn, Docker sẽ tạo thư mục rỗng mới.' },
    { t: 288, x: 'Để sao lưu, ta chạy một container tạm gắn volume và thư mục sao lưu, rồi nén bằng tar.' },
    { t: 352, x: 'Hãy thử khôi phục từ file sao lưu ít nhất một lần.' },
    { t: 400, x: 'Lỗi hay gặp nhất là chạy docker volume prune khi chưa kiểm tra.' },
  ],
}

const guideOnb = {
  id: 'a-guide', kitId: 'k-leave', type: 'guide', title: 'Tạo đơn nghỉ phép trên HRM',
  summary: 'Hướng dẫn từng bước kèm ảnh chụp từ video quay màn hình của phòng Nhân sự.',
  status: 'published', updated: '12/11/2026 10:00', img: 'screen', viewers: 128, sessions: 140, done: 117, link: 'learn.example.com/s/nghi-phep',
  steps: [
    { title: 'Mở mục Đơn từ', text: 'Trên thanh bên trái của HRM, chọn Đơn từ → Nghỉ phép.' },
    { title: 'Chọn loại nghỉ', text: 'Chọn Nghỉ phép năm. Số ngày còn lại hiện ngay dưới ô chọn.' },
    { title: 'Chọn ngày', text: 'Chọn ngày bắt đầu và kết thúc. Nửa ngày thì bật Sáng/Chiều.' },
    { title: 'Gửi đơn', text: 'Kiểm tra người duyệt rồi bấm Gửi. Đơn hiện ở mục Đơn của tôi.' },
  ],
}

const qrLeave = {
  id: 'a-qr2', kitId: 'k-leave', type: 'qr', title: 'Chính sách nghỉ phép 2026',
  summary: 'Những điều cần biết về phép năm, nghỉ không lương và cách tính phép tồn.',
  status: 'published', updated: '12/11/2026 09:30', img: 'office', viewers: 156, sessions: 190, done: 139, link: 'learn.example.com/s/chinh-sach-phep',
  lessons: [{ id: 'x1', kind: 'lesson', title: 'Phép năm và phép tồn', blocks: [{ id: 'x', t: 'heading', h: 'Phép năm', p: 'Nhân viên chính thức có 12 ngày phép năm, cộng 1 ngày cho mỗi 5 năm làm việc.', src: 'SoTay-NhanVien-2026.pdf · mục 5' }] }],
  quiz: { mode: 'practice', skill: 'onb', level: 1, passScore: 70, attempts: 3, minutes: 10, proctor: false, questions: [] },
}

// Hai vai trò: người tạo khóa học (soạn, chia sẻ, chấm) và người học.
export const ROLES = {
  author: { name: 'Nguyễn An', short: 'An', initials: 'AN', title: 'Giám đốc Kỹ thuật · Người tạo khóa học', color: '#8b88c9', home: '/' },
  learner: { name: 'Phạm Thu Hà', short: 'Hà', initials: 'TH', title: 'Người học · Kỹ sư phần mềm', color: '#e07a3f', home: '/learn', code: 'NV023' },
}
// Khóa được giao cho người học mẫu (giao khóa là việc của LMS có sẵn; ở đây chỉ mô phỏng)
export const ASSIGNED = [
  { id: 'a-qr', due: '30/11/2026', why: 'Lộ trình Container (Docker) lên mức 2', done: 1 },
  { id: 'a-vid', due: '30/11/2026', why: 'Lộ trình Container (Docker) lên mức 2', done: 2 },
  { id: 'a-sec-scn', due: '15/11/2026', why: 'Bắt buộc hằng năm · An toàn thông tin', done: 0 },
  { id: 'a-guide', due: '20/11/2026', why: 'Hội nhập nhân viên mới', done: 0 },
  { id: 'a-sql-gd', due: '05/12/2026', why: 'Quản lý đề xuất · SQL mức 2', done: 1 },
  { id: 'a-sec-qr', due: '20/11/2026', why: 'Bắt buộc hằng năm · An toàn thông tin', done: 4 },
  { id: 'a-sec-vid', due: '20/11/2026', why: 'Bắt buộc hằng năm · An toàn thông tin', done: 4 },
  { id: 'a-qr2', due: '20/11/2026', why: 'Hội nhập nhân viên mới', done: 3 },
]

export const SEED = {
  role: 'author',
  user: { name: 'Nguyễn An', short: 'An', org: 'Công ty demo', initials: 'AN', role: 'Khối Kỹ thuật sản phẩm' },
  credits: { used: 18400, total: 50000 },
  checklist: [0, 1],
  wf: { kpis: ['k1', 'k2', 'k3', 'k4'], analyzed: false, assigned: {}, customKpis: [], members: [], lv: {}, resolved: {}, history: [], extraPending: [], placement: {} },
  kits: [
    {
      id: 'k-docker', title: 'Docker Volume cơ bản',
      desc: 'Khóa thực hành cho kỹ sư phần mềm mới về giữ dữ liệu container an toàn bằng Docker volume: bind mount, named volume, sao lưu và các lỗi cần tránh.',
      audience: 'Kỹ sư phần mềm mới, đã biết lệnh docker run cơ bản, cần kỹ năng quản lý dữ liệu container.',
      goals: ['Lưu dữ liệu container ổn định', 'Chọn đúng loại volume', 'Sao lưu dữ liệu volume', 'Tránh các lỗi volume hay gặp'],
      takeaways: ['Giải thích vì sao dữ liệu container biến mất', 'So sánh bind mount và named volume', 'Tạo và dùng named volume', 'Sao lưu và khôi phục volume'],
      metrics: ['Giảm sự cố mất dữ liệu container', 'Tăng tỷ lệ dùng volume đúng', 'Giảm yêu cầu hỗ trợ liên quan volume'],
      practice: 'more', delivery: 'self', skill: 'docker', level: 2,
      sources: [{ name: SRC1, ver: 'v3', size: '2,1 MB' }, { name: SRC2, ver: 'v2', size: '480 KB' }],
      sourceChange: { file: SRC2, from: 'v2', to: 'v3', parts: [
        { where: 'Tài liệu nhanh · Bài 3 · Các bước sao lưu', what: 'Bước 1 đổi: không cần dừng ghi nếu dùng snapshot' },
        { where: 'Video · Chương "Sao lưu volume" 04:48–05:52', what: 'Lời đọc nhắc dừng ghi trước khi sao lưu' },
        { where: 'Bài kiểm tra · Câu 2', what: 'Đáp án vẫn đúng, giải thích cần cập nhật' },
      ] },
      artifacts: ['a-qr', 'a-scn', 'a-deck', 'a-vid'], updated: '18/11/2026 09:20', owner: 'AN',
    },
    {
      id: 'k-leave', title: 'Nghỉ phép cho nhân viên mới',
      desc: 'Bộ đào tạo hội nhập: chính sách nghỉ phép và cách tạo đơn trên HRM.',
      audience: 'Nhân viên mới trong 2 tuần đầu.', goals: ['Hiểu chính sách phép', 'Tự tạo đơn nghỉ trên HRM'], takeaways: [], metrics: ['Giảm câu hỏi về phép gửi HR'],
      practice: 'less', delivery: 'self', skill: 'onb', level: 1,
      sources: [{ name: 'SoTay-NhanVien-2026.pdf', ver: 'v1', size: '3,4 MB' }, { name: 'quay-man-hinh-don-phep.mp4', ver: 'v1', size: '86 MB' }],
      artifacts: ['a-qr2', 'a-guide'], updated: '12/11/2026 10:00', owner: 'AN',
    },
  ].concat(MORE_KITS),
  artifacts: { 'a-qr': qrDocker, 'a-deck': deckDocker, 'a-scn': scenarioDocker, 'a-vid': videoDocker, 'a-guide': guideOnb, 'a-qr2': qrLeave, ...MORE_ARTIFACTS },
  tutorMissed: [
    { q: 'Docker Compose trên Windows gắn volume thế nào?', course: 'Lệnh và lựa chọn khi dùng Docker Volume', n: 4, at: '18/11' },
    { q: 'Có nên dùng tmpfs cho cache không?', course: 'Lệnh và lựa chọn khi dùng Docker Volume', n: 2, at: '17/11' },
    { q: 'Nghỉ phép có được chuyển sang năm sau không?', course: 'Chính sách nghỉ phép 2026', n: 7, at: '15/11' },
    ...MORE_MISSED,
  ],
  submissions: [
    { id: 'sub1', who: 'Phạm Thu Hà', code: 'NV023', art: 'a-qr', at: '18/11 14:05', mc: [1, 1, 1], status: 'grading', essay: 'Cơ sở dữ liệu em dùng named volume vì cần giữ dữ liệu khi triển khai lại. Web app em dùng bind mount để sửa code ở máy là container thấy ngay.',
      ai: [{ c: 0, ok: true, quote: 'Cơ sở dữ liệu em dùng named volume' }, { c: 1, ok: true, quote: 'Web app em dùng bind mount' }, { c: 2, ok: true, quote: 'vì cần giữ dữ liệu khi triển khai lại' }],
      flags: [{ t: '12:40', kind: 'Chuyển tab', note: 'Rời trang bài thi 18 giây' }, { t: '21:05', kind: 'Dán từ ngoài vào', note: 'Dán 2 dòng vào ô tự luận' }] },
    { id: 'sub2', who: 'Trần Minh Đức', code: 'NV015', art: 'a-qr', at: '18/11 10:30', mc: [1, 0, 1], status: 'grading', essay: 'Cả hai đều dùng bind mount cho tiện.',
      ai: [{ c: 0, ok: false, quote: '' }, { c: 1, ok: true, quote: 'dùng bind mount' }, { c: 2, ok: false, quote: 'cho tiện' }], flags: [] },
    { id: 'sub3', who: 'Lê Hoàng Yến', code: 'NV031', art: 'a-qr', at: '17/11 16:12', mc: [1, 1, 1], status: 'passed', sent: true,
      essay: 'Cơ sở dữ liệu dùng named volume để dữ liệu còn sau khi triển khai lại. Web app khi phát triển dùng bind mount để sửa code là thấy ngay.',
      ai: [{ c: 0, ok: true, quote: 'Cơ sở dữ liệu dùng named volume' }, { c: 1, ok: true, quote: 'dùng bind mount' }, { c: 2, ok: true, quote: 'sửa code là thấy ngay' }], flags: [] },
    ...MORE_SUBMISSIONS,
  ],
}

// Ảnh minh họa (Unsplash). grad là màu nền hiện trong lúc tải hoặc khi không có mạng.
const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`
export const IMG = {
  server: { src: U('1605745341112-85968b19335b'), grad: 'linear-gradient(135deg,#1f2a37,#8aa0b6)' },
  rack: { src: U('1558494949-ef010cbdcc31'), grad: 'linear-gradient(135deg,#0f172a,#334155)' },
  desk: { src: U('1517694712202-14dd9538aa97'), grad: 'linear-gradient(135deg,#0f172a,#64748b)' },
  person: { src: U('1573497019940-1c28c88b4f3e'), grad: 'linear-gradient(135deg,#ede9fe,#e0f2fe)' },
  video: { src: U('1498050108023-c5249f4df085'), grad: 'linear-gradient(135deg,#334155,#cbd5e1)' },
  screen: { src: U('1454165804606-c3d57bc86b40'), grad: 'linear-gradient(135deg,#14532d,#bbf7d0)' },
  office: { src: U('1521737604893-d14cc237f11d'), grad: 'linear-gradient(135deg,#7c2d12,#fed7aa)' },
  meeting: { src: U('1552664730-d307ca884978'), grad: 'linear-gradient(135deg,#78350f,#fde68a)' },
  team: { src: U('1600880292203-757bb62b4baf'), grad: 'linear-gradient(135deg,#7c2d12,#fed7aa)' },
  cyber: { src: U('1550751827-4bd374c3f58b'), grad: 'linear-gradient(135deg,#020617,#334155)' },
  phish: { src: U('1563013544-824ae1b704d3'), grad: 'linear-gradient(135deg,#78716c,#e7e5e4)' },
  lock: { src: U('1614064641938-3bbee52942c7'), grad: 'linear-gradient(135deg,#14532d,#ef4444)' },
  mobile: { src: U('1586953208448-b95a79798f07'), grad: 'linear-gradient(135deg,#e5e7eb,#f8fafc)' },
  dash: { src: U('1551288049-bebda4e38f71'), grad: 'linear-gradient(135deg,#0f172a,#1e3a8a)' },
  charts: { src: U('1460925895917-afdab827c52f'), grad: 'linear-gradient(135deg,#44403c,#d6d3d1)' },
  code: { src: U('1555066931-4365d14bab8c'), grad: 'linear-gradient(135deg,#0f172a,#1e293b)' },
  plan: { src: U('1531403009284-440f080d1e12'), grad: 'linear-gradient(135deg,#e2e8f0,#f8fafc)' },
  sketch: { src: U('1581291518857-4e27b48ff24e'), grad: 'linear-gradient(135deg,#d6d3d1,#fafaf9)' },
  support: { src: U('1553775282-20af80779df7'), grad: 'linear-gradient(135deg,#d6d3d1,#f5f5f4)' },
  openoffice: { src: U('1556761175-b413da4baf72'), grad: 'linear-gradient(135deg,#78350f,#e7e5e4)' },
  handshake: { src: U('1521791136064-7986c2920216'), grad: 'linear-gradient(135deg,#334155,#e2e8f0)' },
  teamwork: { src: U('1600880292089-90a7e086ee0c'), grad: 'linear-gradient(135deg,#1e3a8a,#e2e8f0)' },
  man: { src: U('1507003211169-0a1dd7228f2d'), grad: 'linear-gradient(135deg,#78716c,#e7e5e4)' },
  man2: { src: U('1500648767791-00dcc994a43e'), grad: 'linear-gradient(135deg,#475569,#cbd5e1)' },
  terminal: { src: U('1518432031352-d6fc5c10da5a'), grad: 'linear-gradient(135deg,#0a0a0a,#3f3f46)' },
  devscreen: { src: U('1504639725590-34d0984388bd'), grad: 'linear-gradient(135deg,#0f172a,#334155)' },
  earth: { src: U('1451187580459-43490279c0fa'), grad: 'linear-gradient(135deg,#020617,#1e3a8a)' },
  nodes: { src: U('1639322537228-f710d846310a'), grad: 'linear-gradient(135deg,#020617,#1e40af)' },
  ai: { src: U('1677442136019-21780ecad995'), grad: 'linear-gradient(135deg,#312e81,#a5b4fc)' },
  ml: { src: U('1591453089816-0fbb971b454c'), grad: 'linear-gradient(135deg,#e7e5e4,#fafaf9)' },
  servers: { src: U('1558494949-ef010cbdcc31'), grad: 'linear-gradient(135deg,#0f172a,#334155)' },
  laptopglow: { src: U('1531297484001-80022131f5a1'), grad: 'linear-gradient(135deg,#0a0a0a,#7c3aed)' },
  setup: { src: U('1550439062-609e1531270e'), grad: 'linear-gradient(135deg,#0a0a0a,#404040)' },
  devs: { src: U('1522071820081-009f0129c71c'), grad: 'linear-gradient(135deg,#78350f,#e7e5e4)' },
  man5: { src: U('1560250097-0b93528c311a'), grad: 'linear-gradient(135deg,#94a3b8,#e2e8f0)' },
  woman5: { src: U('1580489944761-15a19d654956'), grad: 'linear-gradient(135deg,#e5e7eb,#f9fafb)' },
  woman6: { src: U('1534528741775-53994a69daeb'), grad: 'linear-gradient(135deg,#4338ca,#a5b4fc)' },
  shop: { src: U('1556742049-0cfed4f6a45d'), grad: 'linear-gradient(135deg,#a8a29e,#f5f5f4)' },
  store: { src: U('1556740738-b6a63e27c4df'), grad: 'linear-gradient(135deg,#78350f,#fef3c7)' },
  receipt: { src: U('1554224155-6726b3ff858f'), grad: 'linear-gradient(135deg,#e7e5e4,#fafaf9)' },
  piggy: { src: U('1607863680198-23d4b2565df0'), grad: 'linear-gradient(135deg,#7c2d12,#fca5a5)' },
  notes: { src: U('1488190211105-8b0e65b80b4e'), grad: 'linear-gradient(135deg,#78350f,#d6d3d1)' },
  sign: { src: U('1450101499163-c8848c66ca85'), grad: 'linear-gradient(135deg,#334155,#e2e8f0)' },
  writing: { src: U('1434030216411-0b793f4b4173'), grad: 'linear-gradient(135deg,#d6d3d1,#f5f5f4)' },
  welcome: { src: U('1529156069898-49953e39b3ac'), grad: 'linear-gradient(135deg,#0ea5e9,#fde68a)' },
  loft: { src: U('1559136555-9303baea8ebd'), grad: 'linear-gradient(135deg,#44403c,#e7e5e4)' },
  workshop: { src: U('1557804506-669a67965ba0'), grad: 'linear-gradient(135deg,#78350f,#e7e5e4)' },
  warehouse: { src: U('1586528116311-ad8dd3c8310d'), grad: 'linear-gradient(135deg,#a16207,#e2e8f0)' },
  man3: { src: U('1472099645785-5658abf4ff4e'), grad: 'linear-gradient(135deg,#9ca3af,#f3f4f6)' },
  man4: { src: U('1506794778202-cad84cf45f1d'), grad: 'linear-gradient(135deg,#0a0a0a,#404040)' },
  woman4: { src: U('1438761681033-6461ffad8d80'), grad: 'linear-gradient(135deg,#0c4a6e,#bae6fd)' },
  woman3: { src: U('1573496359142-b8d87734a5a2'), grad: 'linear-gradient(135deg,#c2410c,#fed7aa)' },
}

export const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
