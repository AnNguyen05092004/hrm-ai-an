// Dữ liệu mẫu bổ sung: 4 bộ đào tạo khác chủ đề để demo đủ dạng, đủ trạng thái.

/* =========================================================
   1. An toàn thông tin cho nhân viên (bắt buộc, đã chia sẻ)
   ========================================================= */
const SEC1 = 'QuyDinh-ATTT-2026.pdf'
const SEC2 = 'BaoCao-SuCo-Phishing-Q3.pptx'

const secQr = {
  id: 'a-sec-qr', kitId: 'k-sec', type: 'qr', title: 'Nhận diện email lừa đảo trong 15 phút',
  summary: 'Năm dấu hiệu nhận ra email lừa đảo, cách kiểm tra đường dẫn và tệp đính kèm, và phải làm gì ngay khi lỡ bấm vào. Dựa trên quy định an toàn thông tin và các sự cố thật trong quý 3.',
  status: 'published', updated: '16/11/2026 15:20', img: 'phish', viewers: 214, sessions: 268, done: 187, link: 'learn.example.com/s/email-lua-dao',
  lessons: [
    { id: 'p1', kind: 'lesson', title: 'Năm dấu hiệu của email lừa đảo', blocks: [
      { id: 'p1a', t: 'image', cap: 'Email lừa đảo thường nhắm vào thanh toán và tài khoản', img: 'phish' },
      { id: 'p1b', t: 'para', p: 'Trong quý 3, 7 trên 10 sự cố an toàn thông tin bắt đầu từ một email. Phần lớn người bấm vào không phải vì bất cẩn, mà vì email trông giống thật và tạo cảm giác gấp.', src: `${SEC2} · slide 4` },
      { id: 'p1c', t: 'flash', h: 'Lật thẻ để xem dấu hiệu', p: 'Mỗi thẻ là một dấu hiệu đã gặp trong sự cố thật.', cards: [
        { f: 'Địa chỉ gửi gần giống thật', b: 'Ví dụ: hotro@cong-ty-demo.co thay vì .com.vn. Luôn xem địa chỉ đầy đủ, không chỉ tên hiển thị.' },
        { f: 'Thúc giục, dọa khóa tài khoản', b: '"Tài khoản sẽ bị khóa sau 2 giờ". Bộ phận IT không bao giờ yêu cầu xác minh qua email.' },
        { f: 'Đường dẫn khác chữ hiển thị', b: 'Rê chuột lên đường dẫn để xem địa chỉ thật trước khi bấm.' },
        { f: 'Tệp đính kèm lạ', b: '.html, .zip có mật khẩu, .docm. Không mở nếu không chờ tệp đó.' },
        { f: 'Xin mật khẩu hoặc mã OTP', b: 'Không ai có quyền hỏi mật khẩu hay mã OTP của bạn, kể cả IT.' },
      ], src: `${SEC1} · mục 3.1` },
      { id: 'p1d', t: 'kc', q: 'Email từ "Phòng IT" yêu cầu bạn bấm vào đường dẫn để giữ tài khoản trong 2 giờ. Bạn làm gì?', choices: ['Bấm ngay để không bị khóa', 'Trả lời email hỏi lại', 'Báo cáo email qua nút Báo cáo lừa đảo, không bấm'], correct: 2 },
    ] },
    { id: 'p2', kind: 'lesson', title: 'Kiểm tra đường dẫn và tệp đính kèm', blocks: [
      { id: 'p2a', t: 'heading', h: 'Kiểm tra trước khi bấm', p: 'Mất 5 giây để kiểm tra, mất 5 ngày để khắc phục nếu tài khoản bị chiếm.', src: `${SEC1} · mục 3.2` },
      { id: 'p2b', t: 'table', head: ['Bạn thấy', 'Nên làm', 'Không nên'], rows: [['Đường dẫn rút gọn (bit.ly…)', 'Hỏi lại người gửi qua kênh khác', 'Bấm thử để xem'], ['Tệp .zip có mật khẩu', 'Báo cáo IT', 'Mở bằng mật khẩu trong email'], ['Trang đăng nhập lạ', 'Đóng tab, gõ địa chỉ thật', 'Nhập mật khẩu'], ['Hóa đơn bạn không chờ', 'Hỏi phòng Kế toán', 'Thanh toán theo email']], src: `${SEC1} · bảng 3.2` },
      { id: 'p2c', t: 'accordion', h: 'Các kiểu lừa đảo hay gặp', p: 'Mở từng mục để xem ví dụ.', items: [
        { t: 'Giả danh lãnh đạo', b: 'Email tên giám đốc nhờ chuyển tiền gấp hoặc mua thẻ quà tặng.' },
        { t: 'Giả hóa đơn nhà cung cấp', b: 'Đổi số tài khoản nhận tiền trong hóa đơn quen thuộc.' },
        { t: 'Giả thông báo chia sẻ tài liệu', b: 'Nút "Mở tài liệu" dẫn tới trang đăng nhập giả.' },
      ], src: `${SEC2} · slide 7–9` },
    ] },
    { id: 'p3', kind: 'lesson', title: 'Lỡ bấm rồi thì làm gì', blocks: [
      { id: 'p3a', t: 'process', h: 'Làm ngay trong 15 phút', steps: ['Ngắt mạng máy tính (rút cáp hoặc tắt Wi-Fi)', 'Đổi mật khẩu từ một thiết bị khác', 'Gọi đường dây nóng IT: máy lẻ 1234', 'Ghi lại thời điểm và những gì đã bấm'], src: `${SEC1} · mục 5` },
      { id: 'p3b', t: 'para', p: 'Báo sớm không bị phạt. Báo muộn hoặc giấu sự cố mới làm thiệt hại lan rộng.', src: `${SEC1} · mục 5.3` },
      { id: 'p3c', t: 'gap', p: 'Tài liệu nguồn chưa nói cách xử lý khi bấm nhầm trên điện thoại cá nhân. AI không tự viết thêm phần này.' },
    ] },
    { id: 'quiz', kind: 'quiz', title: 'Bài kiểm tra' },
  ],
  quiz: {
    mode: 'official', skill: 'sec', level: 1, passScore: 70, attempts: 3, minutes: 15, proctor: false,
    questions: [
      { id: 'e1', type: 'mc', level: 1, approved: true, q: 'Dấu hiệu nào cho thấy email có thể là lừa đảo?', src: `${SEC1} · mục 3.1`, choices: [
        { t: 'Gửi từ địa chỉ nội bộ quen thuộc, không có đường dẫn', ok: false, fb: 'Đây là email bình thường.' },
        { t: 'Yêu cầu xác minh tài khoản trong 2 giờ qua đường dẫn', ok: true, fb: 'Đúng. Thúc giục và xin xác minh là dấu hiệu điển hình.' },
        { t: 'Có chữ ký và số điện thoại người gửi', ok: false, fb: 'Chữ ký có thể làm giả, nhưng tự nó không phải dấu hiệu.' },
      ] },
      { id: 'e2', type: 'mc', level: 1, approved: true, q: 'Bạn lỡ nhập mật khẩu vào trang đăng nhập lạ. Việc đầu tiên nên làm?', src: `${SEC1} · mục 5`, choices: [
        { t: 'Chờ xem có gì bất thường không', ok: false, fb: 'Chờ càng lâu thiệt hại càng lớn.' },
        { t: 'Đổi mật khẩu từ thiết bị khác và báo IT', ok: true, fb: 'Đúng. Làm ngay trong 15 phút.' },
        { t: 'Xóa email đó đi', ok: false, fb: 'Xóa email không thu hồi được mật khẩu đã lộ.' },
      ] },
      { id: 'e3', type: 'fill', level: 1, approved: true, q: 'Số máy lẻ đường dây nóng IT là ______', answer: '1234', src: `${SEC1} · mục 5` },
      { id: 'e4', type: 'essay', level: 1, approved: true, q: 'Bạn nhận email "hóa đơn nhà cung cấp" báo đổi số tài khoản nhận tiền. Bạn sẽ làm gì? Nêu ít nhất 2 việc.', src: `${SEC2} · slide 8`,
        rubric: ['Không thanh toán theo email', 'Xác minh qua kênh khác (gọi điện, hỏi Kế toán)', 'Báo cáo cho IT / bấm Báo cáo lừa đảo'], kw: ['không (thanh toán|chuyển)', 'gọi|hỏi|xác minh', 'báo|IT'] },
      { id: 'e5', type: 'mc', level: 1, approved: false, q: 'Tệp đính kèm nào nên cẩn thận nhất?', src: `${SEC1} · bảng 3.2`, choices: [
        { t: '.pdf từ đồng nghiệp đang trao đổi', ok: false, fb: '' },
        { t: '.zip có mật khẩu ghi ngay trong email', ok: true, fb: 'Kẻ gian đặt mật khẩu để qua mặt bộ lọc virus.' },
        { t: '.png ảnh chụp màn hình', ok: false, fb: '' },
      ] },
    ],
  },
  tutor: [
    { k: 'đơn giản|simple', text: 'Hiểu đơn giản: email lừa đảo luôn muốn bạn làm gì đó thật nhanh (bấm, mở, chuyển tiền). Thấy gấp là dừng lại 5 giây để kiểm tra.', src: 'Bài 1 · Năm dấu hiệu', jump: [['Mở Bài 1', 'p1']] },
    { k: 'lỡ|làm gì|chỉ cần', text: 'Nếu bạn chỉ cần biết phải làm gì khi lỡ bấm, xem Bài 3. Tóm tắt: ngắt mạng, đổi mật khẩu từ thiết bị khác, gọi máy lẻ 1234.', list: ['Bài 3 · Làm ngay trong 15 phút'], src: `${SEC1} · mục 5`, jump: [['Mở Bài 3', 'p3']] },
    { k: 'zip|tệp|đính kèm|link|đường dẫn', text: 'Rê chuột lên đường dẫn để xem địa chỉ thật. Tệp .zip có mật khẩu ghi trong email là dấu hiệu nguy hiểm, nên báo IT thay vì mở.', src: `${SEC1} · bảng 3.2`, jump: [['Mở Bài 2', 'p2']] },
  ],
}

const secScn = {
  id: 'a-sec-scn', kitId: 'k-sec', type: 'scenario', title: 'Cuộc gọi giả danh IT hỗ trợ',
  summary: 'Người học nhận cuộc gọi từ "IT hỗ trợ" xin mã OTP. Luyện cách từ chối lịch sự và xác minh.',
  intro: 'Trong tình huống này, bạn nhận cuộc gọi từ một người xưng là Anh Tuấn bên IT, nói tài khoản của bạn đang bị khóa. Bạn phải nhận ra dấu hiệu lừa đảo và xử lý đúng quy trình.',
  status: 'published', updated: '16/11/2026 15:40', img: 'support', viewers: 176, sessions: 203, done: 151, link: 'learn.example.com/s/cuoc-goi-gia-danh',
  experience: 'photo', frame: 'full',
  character: { name: 'Anh Tuấn', role: 'Người gọi xưng là nhân viên IT hỗ trợ', img: 'man' },
  learner: 'Nhân viên văn phòng',
  scenes: [
    { id: 'ss1', title: 'Cảnh 1', goal: 'Không cung cấp mã OTP', cards: [
      { id: 's1a', kind: 'char', text: 'Chào em, anh Tuấn bên IT đây. Hệ thống báo tài khoản em đăng nhập bất thường, anh cần khóa gấp. Em đọc giúp anh mã 6 số vừa gửi về điện thoại nhé.' },
      { id: 's1b', kind: 'decision', choices: [
        { t: 'Dạ, mã là 48…', ok: 'bad', reply: 'Cảm ơn em, anh xử lý ngay. (Mã OTP vừa đủ để chiếm tài khoản của bạn.)' },
        { t: 'Em xin lỗi, quy định không cho đọc mã OTP qua điện thoại. Em sẽ tự gọi lại IT qua máy lẻ 1234.', ok: 'good', reply: 'À… vậy thôi em cứ để đó, anh xử lý sau.' },
        { t: 'Anh cho em tên đầy đủ và mã nhân viên được không?', ok: 'neutral', reply: 'Anh là Tuấn, NV088. Nhanh lên em, sắp bị khóa rồi.' },
      ] },
    ] },
    { id: 'ss2', title: 'Cảnh 2', goal: 'Không cài phần mềm điều khiển từ xa', cards: [
      { id: 's2a', kind: 'char', text: 'Thôi được, vậy em cài giúp anh phần mềm hỗ trợ từ xa, anh gửi đường dẫn qua chat. Anh tự làm cho nhanh.' },
      { id: 's2b', kind: 'decision', choices: [
        { t: 'Em chỉ cài phần mềm từ cổng phần mềm của công ty. Em sẽ tạo phiếu hỗ trợ để IT liên hệ lại.', ok: 'good', reply: 'Ừ… thôi được.' },
        { t: 'Vâng, anh gửi đi ạ.', ok: 'bad', reply: 'Đường dẫn đây em. (Phần mềm này cho người lạ toàn quyền điều khiển máy.)' },
      ] },
    ] },
    { id: 'ss3', title: 'Cảnh 3', goal: 'Báo cáo sự cố', cards: [
      { id: 's3a', kind: 'char', text: '(Cuộc gọi kết thúc.) Bạn sẽ làm gì tiếp theo?' },
      { id: 's3b', kind: 'decision', choices: [
        { t: 'Gọi máy lẻ 1234 báo có cuộc gọi giả danh, kèm số điện thoại và thời gian.', ok: 'good', reply: 'IT cảm ơn bạn. Họ sẽ cảnh báo cả công ty về số điện thoại này.' },
        { t: 'Bỏ qua vì mình không làm gì sai.', ok: 'neutral', reply: 'Bạn an toàn, nhưng đồng nghiệp khác có thể là nạn nhân tiếp theo.' },
      ] },
    ] },
  ],
}

const secVid = {
  id: 'a-sec-vid', kitId: 'k-sec', type: 'video', title: 'Mật khẩu mạnh và xác thực 2 lớp',
  summary: 'Video 6 phút do AI tạo từ quy định an toàn thông tin: cách đặt cụm mật khẩu, dùng trình quản lý mật khẩu và bật xác thực 2 lớp.',
  status: 'published', updated: '15/11/2026 11:05', img: 'mobile', viewers: 198, sessions: 240, done: 172, link: 'learn.example.com/s/mat-khau-2-lop',
  ai: true, voice: 'Giọng nam miền Nam · AI', duration: 372,
  chapters: [
    { t: 0, title: 'Vì sao mật khẩu bị lộ' },
    { t: 70, title: 'Cụm mật khẩu dễ nhớ, khó đoán' },
    { t: 160, title: 'Trình quản lý mật khẩu' },
    { t: 250, title: 'Bật xác thực 2 lớp' },
  ],
  checkpoints: [
    { t: 150, q: 'Mật khẩu nào mạnh hơn?', choices: ['P@ssw0rd2026', 'ca-phe-sua-da-luc-7-gio', 'Abc123456!'], correct: 1 },
    { t: 330, q: 'Ai được phép hỏi mã xác thực 2 lớp của bạn?', choices: ['Phòng IT', 'Quản lý trực tiếp', 'Không ai cả'], correct: 2 },
  ],
  transcript: [
    { t: 0, x: 'Phần lớn tài khoản bị chiếm không phải do bị bẻ khóa, mà do dùng lại mật khẩu đã lộ ở trang khác.' },
    { t: 70, x: 'Cụm mật khẩu gồm 4 đến 5 từ ngẫu nhiên vừa dễ nhớ vừa khó đoán hơn chuỗi ký tự đặc biệt ngắn.' },
    { t: 160, x: 'Trình quản lý mật khẩu của công ty giúp mỗi trang một mật khẩu khác nhau, bạn chỉ cần nhớ một.' },
    { t: 250, x: 'Xác thực 2 lớp chặn được hầu hết các vụ chiếm tài khoản, kể cả khi mật khẩu đã lộ.' },
    { t: 320, x: 'Nhớ: không ai, kể cả IT, được hỏi mã xác thực của bạn.' },
  ],
}

const secDeck = {
  id: 'a-sec-deck', kitId: 'k-sec', type: 'deck', title: '5 thói quen an toàn khi làm việc từ xa',
  summary: 'Bộ slide 10 phút cho buổi họp đầu tuần của các nhóm làm việc từ xa.',
  status: 'draft', updated: '17/11/2026 08:45', img: 'cyber', viewers: 0, sessions: 0, done: 0,
  slides: [
    { id: 'sd1', layout: 'cover', img: 'cyber', title: '5 thói quen an toàn khi làm việc từ xa', sub: 'Ở nhà vẫn là văn phòng của công ty.', notes: 'Hỏi nhanh: ai đang dùng Wi-Fi quán cà phê?' },
    { id: 'sd2', layout: 'steps', title: '5 thói quen', items: ['Khóa màn hình', 'Dùng VPN', 'Không dùng USB lạ', 'Tách máy cá nhân', 'Báo sự cố sớm'], notes: 'Đi nhanh qua 5 thói quen, mỗi cái 1 phút.' },
    { id: 'sd3', layout: 'two', title: 'Wi-Fi công cộng: được và không', cols: [['Được', 'Đọc tin tức', 'Họp có bật VPN'], ['Không', 'Mở hệ thống nội bộ không VPN', 'Chia sẻ màn hình nơi đông người']], notes: 'Nhấn mạnh VPN là bắt buộc.' },
    { id: 'sd4', layout: 'table', title: 'Gặp sự cố thì gọi ai', head: ['Sự cố', 'Liên hệ', 'Thời gian'], rows: [['Mất máy', 'IT · máy lẻ 1234', 'Ngay lập tức'], ['Email lạ', 'Nút Báo cáo lừa đảo', 'Trong ngày'], ['Lộ mật khẩu', 'IT · máy lẻ 1234', 'Trong 15 phút']], notes: 'Chụp màn hình slide này lại.' },
    { id: 'sd5', layout: 'bullets', title: 'Làm ngay hôm nay', items: ['Bật khóa màn hình sau 5 phút', 'Cài VPN từ cổng phần mềm', 'Bật xác thực 2 lớp'], notes: 'Kết thúc bằng 3 việc làm trong ngày.' },
  ],
}

/* =========================================================
   2. SQL cho phân tích dữ liệu (đang soạn)
   ========================================================= */
const SQL1 = 'SQL-NoiBo-PhanTich.pdf'

const sqlQr = {
  id: 'a-sql-qr', kitId: 'k-sql', type: 'qr', title: 'JOIN và GROUP BY cho báo cáo bán hàng',
  summary: 'Viết truy vấn ghép bảng đơn hàng với khách hàng, gom nhóm theo tháng và lọc nhóm bằng HAVING. Có bài tập với dữ liệu mẫu.',
  status: 'draft', updated: '18/11/2026 10:02', img: 'dash', viewers: 0, sessions: 0, done: 0,
  lessons: [
    { id: 'q1l', kind: 'lesson', title: 'Ghép bảng với JOIN', blocks: [
      { id: 'j1', t: 'heading', h: 'INNER JOIN và LEFT JOIN', p: 'INNER JOIN chỉ giữ dòng khớp ở cả hai bảng. LEFT JOIN giữ mọi dòng ở bảng bên trái, kể cả khi không khớp.', src: `${SQL1} · mục 2` },
      { id: 'j2', t: 'code', h: 'Khách hàng và tổng đơn', code: 'SELECT c.name, COUNT(o.id) AS so_don\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.name;', src: `${SQL1} · mục 2.3` },
      { id: 'j3', t: 'kc', q: 'Muốn liệt kê cả khách hàng chưa có đơn nào, dùng JOIN nào?', choices: ['INNER JOIN', 'LEFT JOIN từ bảng customers', 'CROSS JOIN'], correct: 1 },
    ] },
    { id: 'q2l', kind: 'lesson', title: 'Gom nhóm và lọc nhóm', blocks: [
      { id: 'g1', t: 'table', head: ['Mệnh đề', 'Lọc gì', 'Chạy lúc'], rows: [['WHERE', 'Từng dòng', 'Trước GROUP BY'], ['HAVING', 'Từng nhóm', 'Sau GROUP BY']], src: `${SQL1} · bảng 3.1` },
      { id: 'g2', t: 'code', h: 'Tháng có doanh thu trên 1 tỷ', code: "SELECT DATE_TRUNC('month', created_at) AS thang,\n       SUM(total) AS doanh_thu\nFROM orders\nWHERE status = 'paid'\nGROUP BY 1\nHAVING SUM(total) > 1e9\nORDER BY 1;", src: `${SQL1} · mục 3.2` },
      { id: 'g3', t: 'gap', p: 'Tài liệu nguồn chưa có phần hàm cửa sổ (window function). AI không tự viết thêm.' },
    ] },
    { id: 'quiz', kind: 'quiz', title: 'Bài kiểm tra' },
  ],
  quiz: {
    mode: 'official', skill: 'sql', level: 2, passScore: 75, attempts: 2, minutes: 25, proctor: true,
    questions: [
      { id: 'k1', type: 'mc', level: 1, approved: true, q: 'Mệnh đề nào lọc kết quả sau khi gom nhóm?', src: `${SQL1} · bảng 3.1`, choices: [
        { t: 'WHERE', ok: false, fb: 'WHERE lọc từng dòng trước khi gom nhóm.' }, { t: 'HAVING', ok: true, fb: 'Đúng.' }, { t: 'ORDER BY', ok: false, fb: 'ORDER BY chỉ sắp xếp.' },
      ] },
      { id: 'k2', type: 'fill', level: 1, approved: true, q: 'Để giữ mọi khách hàng kể cả khi chưa có đơn, dùng ______ JOIN', answer: 'left', src: `${SQL1} · mục 2` },
      { id: 'k3', type: 'essay', level: 2, approved: false, q: 'Báo cáo doanh thu theo tháng bị đếm trùng sau khi JOIN thêm bảng order_items. Giải thích nguyên nhân và cách sửa.', src: `${SQL1} · mục 4`,
        rubric: ['Chỉ ra JOIN một-nhiều làm nhân dòng', 'Đề xuất gom nhóm trước rồi mới JOIN (hoặc dùng subquery)', 'Kiểm tra lại bằng COUNT'], kw: ['nhân|trùng|một-nhiều', 'subquery|gom trước|CTE', 'count'] },
      { id: 'k4', type: 'code', level: 3, approved: false, q: 'Viết truy vấn trả về 5 khách hàng có tổng chi tiêu cao nhất trong năm 2026.', src: `${SQL1} · mục 3`,
        tests: ['Đúng 5 dòng', 'Sắp xếp giảm dần theo tổng chi tiêu', 'Chỉ tính đơn đã thanh toán'] },
    ],
  },
}

const sqlDeck = {
  id: 'a-sql-deck', kitId: 'k-sql', type: 'deck', title: 'Đọc kế hoạch truy vấn với EXPLAIN',
  summary: 'Slide nội bộ giải thích cách đọc EXPLAIN để tìm truy vấn chậm.',
  status: 'draft', updated: '18/11/2026 10:15', img: 'charts', viewers: 0, sessions: 0, done: 0,
  slides: [
    { id: 'x1', layout: 'cover', img: 'charts', title: 'Truy vấn chậm? Đọc EXPLAIN trước', sub: 'Đừng đoán, hãy đo.', notes: 'Mở bằng ví dụ báo cáo chạy 3 phút.' },
    { id: 'x2', layout: 'bullets', title: 'EXPLAIN cho biết gì', items: ['Thứ tự quét bảng', 'Có dùng chỉ mục hay không', 'Số dòng ước tính mỗi bước'], notes: '' },
    { id: 'x3', layout: 'two', title: 'Seq Scan và Index Scan', cols: [['Seq Scan', 'Quét cả bảng', 'Chậm với bảng lớn'], ['Index Scan', 'Đi thẳng tới dòng cần', 'Cần chỉ mục phù hợp']], notes: '' },
  ],
}

const sqlGuide = {
  id: 'a-sql-gd', kitId: 'k-sql', type: 'guide', title: 'Kết nối công cụ BI tới kho dữ liệu',
  summary: 'Hướng dẫn từng bước tạo kết nối chỉ đọc từ công cụ BI tới kho dữ liệu phân tích.',
  source: 'quay-man-hinh-ket-noi-BI.mp4 · 4:10',
  status: 'published', updated: '14/11/2026 14:30', img: 'code', viewers: 64, sessions: 81, done: 52, link: 'learn.example.com/s/ket-noi-bi',
  steps: [
    { title: 'Xin quyền truy cập', text: 'Tạo phiếu trên cổng IT, chọn "Quyền đọc kho dữ liệu". Quản lý duyệt trong 1 ngày.', img: 'plan' },
    { title: 'Tạo kết nối mới', text: 'Trong công cụ BI, chọn Nguồn dữ liệu → Thêm → PostgreSQL.', img: 'code' },
    { title: 'Điền thông tin', text: 'Máy chủ dwh.noibo, cổng 5432, cơ sở dữ liệu analytics. Bật SSL.', img: 'charts' },
    { title: 'Kiểm tra và lưu', text: 'Bấm Kiểm tra kết nối. Thấy "Thành công" thì lưu với tên dễ nhận ra.', img: 'dash' },
  ],
}

/* =========================================================
   3. Phản hồi 1-1 cho trưởng nhóm mới (kỹ năng mềm)
   ========================================================= */
const LEAD1 = 'CamNang-QuanLy-MoiBoNhiem.pdf'

const leadScn = {
  id: 'a-lead-scn', kitId: 'k-lead', type: 'scenario', title: 'Phản hồi khi thành viên trễ hạn',
  summary: 'Trưởng nhóm mới luyện cách nói chuyện 1-1 với thành viên trễ hạn lần thứ ba: cụ thể, không phán xét, cùng tìm cách gỡ.',
  intro: 'Trong tình huống này, bạn là trưởng nhóm mới. Chị Mai, một thành viên giỏi, vừa trễ hạn lần thứ ba trong tháng. Bạn cần phản hồi thẳng thắn mà vẫn giữ được sự tin tưởng.',
  status: 'published', updated: '13/11/2026 17:10', img: 'woman3', viewers: 38, sessions: 57, done: 29, link: 'learn.example.com/s/phan-hoi-tre-han',
  experience: 'photo', frame: 'full',
  character: { name: 'Chị Mai', role: 'Chuyên viên cao cấp, làm ở nhóm 4 năm', img: 'woman3' },
  learner: 'Trưởng nhóm mới bổ nhiệm',
  scenes: [
    { id: 'l1', title: 'Cảnh 1 · Mở đầu', goal: 'Nêu sự việc cụ thể, không quy kết', cards: [
      { id: 'l1a', kind: 'char', text: 'Em gọi chị vào có việc gì vậy?' },
      { id: 'l1b', kind: 'decision', choices: [
        { t: 'Chị dạo này hay trễ hạn quá, em hơi thất vọng.', ok: 'bad', reply: 'Hay trễ? Chị làm ở đây 4 năm rồi đấy em.' },
        { t: 'Báo cáo tuần trước và tuần này đều nộp sau hạn 2 ngày. Em muốn hiểu chuyện gì đang xảy ra.', ok: 'good', reply: 'Ừ… chị biết. Chị cũng đang khó xử.' },
        { t: 'Không có gì đâu chị, em hỏi thăm thôi.', ok: 'neutral', reply: 'Vậy à. Thế chị về làm tiếp nhé.' },
      ] },
    ] },
    { id: 'l2', title: 'Cảnh 2 · Lắng nghe', goal: 'Hỏi để hiểu nguyên nhân', cards: [
      { id: 'l2a', kind: 'char', text: 'Từ khi nhận thêm dự án của nhóm bên kia, chị không xoay kịp. Mà chị ngại nói vì sợ bị đánh giá là không gánh nổi.' },
      { id: 'l2b', kind: 'decision', choices: [
        { t: 'Cảm ơn chị đã nói thật. Hiện chị đang ôm những việc gì, việc nào gấp nhất?', ok: 'good', reply: 'Có 3 việc. Chị liệt kê cho em xem nhé.' },
        { t: 'Ai cũng bận mà chị, cố gắng thêm chút.', ok: 'bad', reply: '…Ừ, chị sẽ cố.' },
      ] },
    ] },
    { id: 'l3', title: 'Cảnh 3 · Thống nhất', goal: 'Chốt việc cụ thể, có hạn', cards: [
      { id: 'l3a', kind: 'char', text: 'Vậy giờ mình làm sao em?' },
      { id: 'l3b', kind: 'decision', choices: [
        { t: 'Em sẽ xin chuyển bớt một việc sang bạn khác. Chị gửi lại hạn mới cho báo cáo tuần trước nhé, thứ Sáu mình xem lại.', ok: 'good', reply: 'Được, vậy chị nhẹ hơn nhiều. Cảm ơn em.' },
        { t: 'Chị tự sắp xếp nhé, em tin chị.', ok: 'neutral', reply: 'Ừ… để chị xem.' },
      ] },
    ] },
  ],
}

const leadQr = {
  id: 'a-lead-qr', kitId: 'k-lead', type: 'qr', title: 'Mô hình SBI: phản hồi cụ thể, không phán xét',
  summary: 'Cách đưa phản hồi theo 3 phần Tình huống, Hành vi, Tác động. Kèm ví dụ nói đúng và nói sai.',
  status: 'published', updated: '13/11/2026 16:00', img: 'handshake', viewers: 41, sessions: 49, done: 33, link: 'learn.example.com/s/mo-hinh-sbi',
  lessons: [
    { id: 'b1', kind: 'lesson', title: 'Ba phần của SBI', blocks: [
      { id: 'b1a', t: 'image', cap: 'Phản hồi tốt bắt đầu từ sự việc, không phải con người', img: 'meeting' },
      { id: 'b1b', t: 'process', h: 'Tình huống → Hành vi → Tác động', steps: ['Tình huống: khi nào, ở đâu', 'Hành vi: điều bạn thấy hoặc nghe, không suy diễn', 'Tác động: ảnh hưởng tới bạn, nhóm hoặc khách hàng'], src: `${LEAD1} · mục 2` },
      { id: 'b1c', t: 'table', head: ['Nói thế này', 'Thay vì'], rows: [['Trong buổi demo sáng thứ Hai, em ngắt lời khách 3 lần', 'Em thiếu chuyên nghiệp'], ['Báo cáo nộp sau hạn 2 ngày', 'Em lúc nào cũng trễ'], ['Nhờ phần tóm tắt của em, khách duyệt ngay', 'Em làm tốt lắm']], src: `${LEAD1} · bảng 2.1` },
      { id: 'b1d', t: 'kc', q: 'Câu nào là "Hành vi" theo SBI?', choices: ['Em không quan tâm tới nhóm', 'Em không trả lời 4 tin nhắn trong nhóm chat hôm qua', 'Em lười'], correct: 1 },
    ] },
    { id: 'b2', kind: 'lesson', title: 'Buổi 1-1 hiệu quả', blocks: [
      { id: 'b2a', t: 'list', intro: 'Một buổi 1-1 30 phút nên có:', items: ['10 phút: người kia nói trước, bạn nghe', '10 phút: phản hồi theo SBI', '10 phút: thống nhất 1–2 việc, có hạn'] },
      { id: 'b2b', t: 'para', p: 'Buổi 1-1 là thời gian của thành viên, không phải buổi báo cáo tiến độ. Nếu chỉ hỏi tiến độ, hãy dùng bảng công việc.', src: `${LEAD1} · mục 3` },
    ] },
    { id: 'quiz', kind: 'quiz', title: 'Bài kiểm tra' },
  ],
  quiz: {
    mode: 'practice', skill: 'lead', level: 1, passScore: 60, attempts: 5, minutes: 10, proctor: false,
    questions: [
      { id: 'm1', type: 'mc', level: 1, approved: true, q: 'Chữ "I" trong SBI là gì?', src: `${LEAD1} · mục 2`, choices: [
        { t: 'Ý kiến (Idea)', ok: false, fb: '' }, { t: 'Tác động (Impact)', ok: true, fb: 'Đúng.' }, { t: 'Cải thiện (Improve)', ok: false, fb: '' },
      ] },
      { id: 'm2', type: 'mc', level: 1, approved: true, q: 'Trong buổi 1-1, ai nên nói trước?', src: `${LEAD1} · mục 3`, choices: [
        { t: 'Trưởng nhóm', ok: false, fb: 'Buổi 1-1 là thời gian của thành viên.' }, { t: 'Thành viên', ok: true, fb: 'Đúng.' },
      ] },
    ],
  },
  tutor: [
    { k: 'đơn giản|simple', text: 'Hiểu đơn giản: nói điều bạn thấy (không phải điều bạn nghĩ), rồi nói nó ảnh hưởng thế nào.', src: 'Bài 1 · Ba phần của SBI', jump: [['Mở Bài 1', 'b1']] },
    { k: 'ví dụ|nói sao|câu', text: 'Ví dụ: "Trong buổi demo sáng thứ Hai (tình huống), em ngắt lời khách 3 lần (hành vi), khách phải nhắc lại câu hỏi và buổi demo kéo dài thêm 20 phút (tác động)."', src: `${LEAD1} · bảng 2.1`, jump: [['Mở Bài 1', 'b1']] },
    { k: 'chỉ cần|1-1|một một', text: 'Nếu bạn chỉ cần cách tổ chức buổi 1-1, xem Bài 2: chia 30 phút thành 3 phần.', list: ['Bài 2 · Buổi 1-1 hiệu quả'], src: `${LEAD1} · mục 3`, jump: [['Mở Bài 2', 'b2']] },
  ],
}

const leadDeck = {
  id: 'a-lead-deck', kitId: 'k-lead', type: 'deck', title: '30 ngày đầu làm trưởng nhóm',
  summary: 'Slide cho buổi hội nhập quản lý mới: những việc nên làm trong tháng đầu.',
  status: 'published', updated: '12/11/2026 09:00', img: 'teamwork', viewers: 22, sessions: 25, done: 19, link: 'learn.example.com/s/30-ngay-dau',
  slides: [
    { id: 't1', layout: 'cover', img: 'teamwork', title: '30 ngày đầu làm trưởng nhóm', sub: 'Lắng nghe trước, thay đổi sau.', notes: 'Chia sẻ câu chuyện tháng đầu của bạn.' },
    { id: 't2', layout: 'steps', title: 'Lộ trình 30 ngày', items: ['Tuần 1: 1-1 với từng người', 'Tuần 2: hiểu việc đang chạy', 'Tuần 3: chọn 1 việc cải thiện', 'Tuần 4: chốt nhịp họp'], notes: '' },
    { id: 't3', layout: 'two', title: 'Nên và tránh', cols: [['Nên', 'Hỏi nhiều hơn nói', 'Giữ lời hứa nhỏ'], ['Tránh', 'Đổi quy trình tuần đầu', 'So sánh với trưởng nhóm cũ']], notes: '' },
    { id: 't4', layout: 'bullets', title: 'Câu hỏi cho buổi 1-1 đầu tiên', items: ['Điều gì làm bạn thấy có động lực?', 'Điều gì đang cản trở bạn?', 'Bạn muốn nhận phản hồi thế nào?'], notes: 'Phát thẻ in sẵn 3 câu hỏi.' },
  ],
}

/* =========================================================
   4. Chăm sóc khách hàng qua điện thoại (bản nháp, mới tạo)
   ========================================================= */
const csScn = {
  id: 'a-cs-scn', kitId: 'k-cs', type: 'scenario', title: 'Khách phàn nàn giao hàng trễ',
  summary: 'Nhân viên tổng đài xử lý cuộc gọi của khách đang bực vì đơn hàng trễ 3 ngày.',
  intro: 'Trong tình huống này, Anh Minh gọi lên tổng đài, rất bực vì đơn hàng trễ 3 ngày mà không ai báo. Bạn cần xoa dịu, nhận trách nhiệm và đưa ra hướng xử lý rõ ràng.',
  status: 'draft', updated: '18/11/2026 08:30', img: 'man2', viewers: 0, sessions: 0, done: 0,
  experience: 'photo', frame: 'full',
  character: { name: 'Anh Minh', role: 'Khách hàng thân thiết, mua hàng 2 năm', img: 'man2' },
  learner: 'Nhân viên tổng đài mới',
  scenes: [
    { id: 'c1', title: 'Cảnh 1', goal: 'Ghi nhận cảm xúc trước khi giải thích', cards: [
      { id: 'c1a', kind: 'char', text: 'Đơn của tôi trễ 3 ngày rồi! Không ai gọi báo một câu. Các bạn làm ăn kiểu gì vậy?' },
      { id: 'c1b', kind: 'decision', choices: [
        { t: 'Em rất xin lỗi anh, chờ 3 ngày mà không được báo thì bực là phải. Anh cho em mã đơn để em kiểm tra ngay.', ok: 'good', reply: 'Mã đơn là DH20481. Kiểm tra nhanh giúp tôi.' },
        { t: 'Dạ do bên vận chuyển chứ không phải lỗi bên em ạ.', ok: 'bad', reply: 'Tôi mua của các bạn, không mua của bên vận chuyển!' },
      ] },
    ] },
    { id: 'c2', title: 'Cảnh 2', goal: 'Đưa hướng xử lý cụ thể', cards: [
      { id: 'c2a', kind: 'char', text: 'Rồi giờ sao? Bao giờ tôi nhận được?' },
    ] },
  ],
}

const csGuide = {
  id: 'a-cs-gd', kitId: 'k-cs', type: 'guide', title: 'Tạo phiếu khiếu nại trên hệ thống CRM',
  summary: 'Các bước ghi nhận khiếu nại, gắn mã đơn và chuyển cho bộ phận vận chuyển.',
  source: 'quay-man-hinh-CRM.mp4 · 2:55',
  status: 'draft', updated: '18/11/2026 08:50', img: 'support', viewers: 0, sessions: 0, done: 0,
  steps: [
    { title: 'Tìm khách hàng', text: 'Nhập số điện thoại vào ô tìm kiếm trên cùng. Chọn đúng hồ sơ khách.', img: 'support' },
    { title: 'Tạo phiếu', text: 'Bấm Tạo phiếu → Khiếu nại → Giao hàng trễ.', img: 'openoffice' },
    { title: 'Gắn mã đơn và hạn xử lý', text: 'Dán mã đơn, chọn hạn xử lý 24 giờ. Phiếu tự chuyển cho bộ phận vận chuyển.', img: 'sketch' },
  ],
}

export const MORE_ARTIFACTS = {
  'a-sec-qr': secQr, 'a-sec-scn': secScn, 'a-sec-vid': secVid, 'a-sec-deck': secDeck,
  'a-sql-qr': sqlQr, 'a-sql-deck': sqlDeck, 'a-sql-gd': sqlGuide,
  'a-lead-scn': leadScn, 'a-lead-qr': leadQr, 'a-lead-deck': leadDeck,
  'a-cs-scn': csScn, 'a-cs-gd': csGuide,
}

export const MORE_KITS = [
  {
    id: 'k-sec', title: 'An toàn thông tin cho mọi nhân viên',
    desc: 'Khóa bắt buộc hằng năm: nhận diện email và cuộc gọi lừa đảo, mật khẩu và xác thực 2 lớp, làm việc từ xa an toàn.',
    audience: 'Mọi nhân viên, kể cả thực tập sinh và cộng tác viên.',
    goals: ['Nhận diện email, cuộc gọi lừa đảo', 'Bật xác thực 2 lớp cho mọi tài khoản', 'Báo sự cố trong 15 phút'],
    takeaways: ['Kể được 5 dấu hiệu email lừa đảo', 'Xử lý đúng khi lỡ bấm', 'Đặt cụm mật khẩu mạnh'],
    metrics: ['Tỷ lệ bấm email lừa đảo giả lập dưới 5%', 'Thời gian báo sự cố trung bình dưới 30 phút'],
    practice: 'more', delivery: 'self', skill: 'sec', level: 1,
    sources: [{ name: SEC1, ver: 'v2', size: '1,6 MB' }, { name: SEC2, ver: 'v1', size: '5,2 MB' }],
    sourceChange: { file: SEC1, from: 'v2', to: 'v3', parts: [
      { where: 'Tài liệu nhanh · Bài 3 · Làm ngay trong 15 phút', what: 'Đường dây nóng IT đổi từ máy lẻ 1234 sang 8888' },
      { where: 'Tình huống · Cảnh 1 và Cảnh 3', what: 'Lời thoại nhắc máy lẻ 1234' },
      { where: 'Bài kiểm tra · Câu 3', what: 'Đáp án điền chỗ trống cần đổi thành 8888' },
      { where: 'Bộ slide · Slide 4', what: 'Bảng liên hệ có máy lẻ cũ' },
    ] },
    artifacts: ['a-sec-qr', 'a-sec-vid', 'a-sec-scn', 'a-sec-deck'], updated: '17/11/2026 08:45', owner: 'AN',
  },
  {
    id: 'k-lead', title: 'Phản hồi 1-1 cho trưởng nhóm mới',
    desc: 'Bộ đào tạo cho quản lý mới bổ nhiệm: đưa phản hồi theo mô hình SBI và tổ chức buổi 1-1 hiệu quả.',
    audience: 'Trưởng nhóm mới bổ nhiệm trong 6 tháng.',
    goals: ['Đưa phản hồi cụ thể, không phán xét', 'Tổ chức 1-1 định kỳ'],
    takeaways: ['Dùng được mô hình SBI', 'Biết chia thời gian buổi 1-1'],
    metrics: ['Điểm khảo sát "quản lý cho phản hồi hữu ích" tăng 15%'],
    practice: 'more', delivery: 'both', skill: 'lead', level: 1,
    sources: [{ name: LEAD1, ver: 'v1', size: '2,8 MB' }],
    artifacts: ['a-lead-scn', 'a-lead-qr', 'a-lead-deck'], updated: '13/11/2026 17:10', owner: 'AN',
  },
  {
    id: 'k-sql', title: 'SQL cho phân tích dữ liệu',
    desc: 'Khóa cho kỹ sư và chuyên viên phân tích: ghép bảng, gom nhóm, đọc kế hoạch truy vấn và kết nối công cụ BI.',
    audience: 'Kỹ sư phần mềm và chuyên viên phân tích đã biết SELECT cơ bản.',
    goals: ['Viết báo cáo bằng JOIN và GROUP BY', 'Tìm truy vấn chậm'],
    takeaways: ['Chọn đúng loại JOIN', 'Phân biệt WHERE và HAVING', 'Đọc được EXPLAIN'],
    metrics: ['Giảm yêu cầu viết báo cáo gửi nhóm dữ liệu'],
    practice: 'more', delivery: 'self', skill: 'sql', level: 2,
    sources: [{ name: SQL1, ver: 'v1', size: '3,0 MB' }, { name: 'quay-man-hinh-ket-noi-BI.mp4', ver: 'v1', size: '112 MB' }],
    artifacts: ['a-sql-qr', 'a-sql-gd', 'a-sql-deck'], updated: '18/11/2026 10:15', owner: 'AN',
  },
  {
    id: 'k-cs', title: 'Chăm sóc khách hàng qua điện thoại',
    desc: 'Bộ đào tạo cho nhân viên tổng đài mới: xử lý khiếu nại và ghi nhận trên CRM. Đang soạn.',
    audience: 'Nhân viên tổng đài trong tháng thử việc.',
    goals: ['Xoa dịu khách đang bực', 'Ghi nhận khiếu nại đúng quy trình'],
    takeaways: [], metrics: ['Giảm cuộc gọi lại về cùng một khiếu nại'],
    practice: 'more', delivery: 'self', skill: 'cs', level: 1,
    sources: [{ name: 'KichBan-TongDai-2026.docx', ver: 'v1', size: '640 KB' }, { name: 'quay-man-hinh-CRM.mp4', ver: 'v1', size: '74 MB' }],
    artifacts: ['a-cs-scn', 'a-cs-gd'], updated: '18/11/2026 08:50', owner: 'AN',
  },
]

// Bài nộp đủ trạng thái: chờ chấm có cờ, chờ chấm sạch, đạt, chưa đạt, nhiều khóa
export const MORE_SUBMISSIONS = [
  { id: 'sub4', who: 'Đỗ Quang Huy', code: 'NV042', art: 'a-sec-qr', at: '18/11 11:20', mc: [1, 1, 0], status: 'grading',
    essay: 'Em sẽ không chuyển tiền theo email đó. Em gọi điện cho nhà cung cấp theo số cũ để hỏi lại, rồi báo IT bằng nút Báo cáo lừa đảo.',
    ai: [{ c: 0, ok: true, quote: 'không chuyển tiền theo email đó' }, { c: 1, ok: true, quote: 'gọi điện cho nhà cung cấp theo số cũ' }, { c: 2, ok: true, quote: 'báo IT bằng nút Báo cáo lừa đảo' }], flags: [] },
  { id: 'sub5', who: 'Bùi Thanh Tâm', code: 'NV057', art: 'a-qr', at: '18/11 09:48', mc: [0, 1, 1], status: 'grading',
    essay: 'Cơ sở dữ liệu dùng named volume. Web app thì cũng named volume luôn cho đồng bộ.',
    ai: [{ c: 0, ok: true, quote: 'Cơ sở dữ liệu dùng named volume' }, { c: 1, ok: false, quote: '' }, { c: 2, ok: false, quote: 'cho đồng bộ' }],
    flags: [{ t: '08:12', kind: 'Có người thứ hai trong khung hình', note: 'Một người đứng sau 25 giây' }, { t: '15:40', kind: 'Rời khỏi khung hình', note: 'Không thấy khuôn mặt 40 giây' }] },
  { id: 'sub6', who: 'Vũ Ngọc Lan', code: 'NV019', art: 'a-sec-qr', at: '17/11 15:02', mc: [1, 0, 0], status: 'failed',
    essay: 'Em chuyển khoản theo số mới vì email có logo công ty.', ai: [{ c: 0, ok: false, quote: '' }, { c: 1, ok: false, quote: '' }, { c: 2, ok: false, quote: '' }], flags: [] },
  { id: 'sub7', who: 'Ngô Bảo Châu', code: 'NV008', art: 'a-sec-qr', at: '16/11 10:15', mc: [1, 1, 1], status: 'passed', sent: true,
    essay: 'Không thanh toán. Gọi phòng Kế toán xác minh. Báo IT.', ai: [{ c: 0, ok: true, quote: 'Không thanh toán' }, { c: 1, ok: true, quote: 'Gọi phòng Kế toán xác minh' }, { c: 2, ok: true, quote: 'Báo IT' }], flags: [] },
  { id: 'sub8', who: 'Phạm Thu Hà', code: 'NV023', art: 'a-sec-qr', at: '15/11 09:30', mc: [1, 1, 1], status: 'passed', sent: true,
    essay: 'Em không thanh toán, gọi hỏi Kế toán và báo IT qua nút Báo cáo lừa đảo.', ai: [{ c: 0, ok: true, quote: 'không thanh toán' }, { c: 1, ok: true, quote: 'gọi hỏi Kế toán' }, { c: 2, ok: true, quote: 'báo IT' }], flags: [] },
  { id: 'sub9', who: 'Phạm Thu Hà', code: 'NV023', art: 'a-qr', at: '10/11 16:40', mc: [1, 0, 1], status: 'failed',
    essay: 'Cả hai dùng named volume.', ai: [{ c: 0, ok: true, quote: 'named volume' }, { c: 1, ok: false, quote: '' }, { c: 2, ok: false, quote: '' }], flags: [] },
]

export const MORE_MISSED = [
  { q: 'Bấm nhầm đường dẫn trên điện thoại cá nhân thì sao?', course: 'Nhận diện email lừa đảo trong 15 phút', n: 9, at: '17/11' },
  { q: 'Có được dùng trình quản lý mật khẩu cá nhân không?', course: 'Mật khẩu mạnh và xác thực 2 lớp', n: 5, at: '16/11' },
  { q: 'Thành viên khóc trong buổi 1-1 thì xử lý thế nào?', course: 'Mô hình SBI: phản hồi cụ thể, không phán xét', n: 3, at: '14/11' },
]
