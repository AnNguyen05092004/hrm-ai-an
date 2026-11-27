// Đề kiểm tra mẫu "An toàn thông tin" (trắc nghiệm + tự luận có tiêu chí chấm) để thử xuất đề QTI cho LMS công ty.
import { db, schema } from './client.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const EXAM_TITLE = 'Đề kiểm tra: An toàn thông tin cho mọi nhân viên'
const QD = 'QuyDinh-ATTT-2026.pdf'

const mc = (id: string, level: number, src: string, q: string, choices: [string, boolean, string][]): Json =>
  ({ id, type: 'mc', level, src, q, choices: choices.map(([t, ok, fb]) => ({ t, ok, fb })), approved: true })

const QUESTIONS: Json[] = [
  mc('sec-q1', 1, `${QD} · mục 3.1`, 'Email ký tên "Phòng IT" yêu cầu bạn gửi mã OTP vừa nhận để giữ tài khoản. Theo quy định, đây là dấu hiệu gì?', [
    ['Yêu cầu hợp lệ vì đến từ Phòng IT', false, 'Sai. Bộ phận IT không bao giờ yêu cầu xác minh qua email.'],
    ['Dấu hiệu lừa đảo: xin mật khẩu hoặc mã OTP', true, 'Đúng. Không ai có quyền hỏi mật khẩu hay mã OTP của bạn, kể cả IT.'],
    ['Chỉ đáng ngờ khi email có tệp đính kèm', false, 'Sai. Xin OTP đã là dấu hiệu lừa đảo, có tệp hay không cũng vậy.'],
    ['Bình thường nếu tên người gửi đúng', false, 'Sai. Tên hiển thị giả được dễ dàng; phải xem địa chỉ đầy đủ.'],
  ]),
  mc('sec-q2', 1, `${QD} · mục 5`, 'Bạn vừa lỡ bấm vào đường dẫn lạ trong email. Việc cần làm đầu tiên là gì?', [
    ['Ngắt mạng máy tính (rút cáp hoặc tắt Wi-Fi)', true, 'Đúng. Đây là bước đầu tiên trong quy trình 15 phút.'],
    ['Xóa email đó để không ai bấm nữa', false, 'Sai. Xóa email không ngăn được thiệt hại, còn làm mất dấu vết.'],
    ['Chờ xem máy có biểu hiện lạ không', false, 'Sai. Chờ đợi làm thiệt hại lan rộng.'],
    ['Chạy lại máy tính', false, 'Sai. Chạy lại máy không cô lập được máy khỏi mạng.'],
  ]),
  { id: 'sec-q3', type: 'fill', level: 1, src: `${QD} · mục 5`, q: 'Điền vào chỗ trống: khi gặp sự cố, gọi đường dây nóng IT ở máy lẻ _____.', answer: '1234', approved: true },
  mc('sec-q4', 2, `${QD} · bảng 3.2`, 'Bạn nhận được tệp .zip có mật khẩu ghi ngay trong email, người gửi bạn không quen. Nên làm gì?', [
    ['Mở bằng mật khẩu trong email rồi quét virus', false, 'Sai. Bảng 3.2 ghi rõ: không mở bằng mật khẩu trong email.'],
    ['Báo cáo IT', true, 'Đúng. Tệp .zip có mật khẩu là cách hay dùng để né bộ lọc.'],
    ['Chuyển tiếp cho đồng nghiệp mở thử', false, 'Sai. Việc này chỉ lan rủi ro sang người khác.'],
    ['Trả lời email hỏi nội dung tệp', false, 'Sai. Trả lời email lừa đảo xác nhận địa chỉ của bạn đang dùng.'],
  ]),
  {
    id: 'sec-q5', type: 'essay', level: 2, src: 'BaoCao-SuCo-Phishing-Q3.pptx · slide 7–9', approved: true,
    q: 'Bạn nhận email "hóa đơn tháng 11" từ một nhà cung cấp quen, đề nghị chuyển tiền sang số tài khoản mới và thanh toán ngay trong hôm nay. Nêu các dấu hiệu đáng ngờ và cách bạn xử lý theo quy định.',
    rubric: [
      'Nhận ra kiểu lừa đảo giả hóa đơn nhà cung cấp: đổi số tài khoản nhận tiền.',
      'Nhận ra dấu hiệu thúc giục, tạo cảm giác gấp.',
      'Xác minh qua kênh khác (hỏi phòng Kế toán hoặc gọi nhà cung cấp), không thanh toán theo email.',
      'Báo cáo email qua nút Báo cáo lừa đảo hoặc báo IT.',
    ],
  },
  {
    id: 'sec-q6', type: 'essay', level: 2, src: `${QD} · mục 5`, approved: true,
    q: 'Bạn lỡ nhập mật khẩu vào một trang đăng nhập giả. Trình bày các việc cần làm trong 15 phút đầu và giải thích vì sao phải báo ngay.',
    rubric: [
      'Ngắt mạng máy tính.',
      'Đổi mật khẩu từ một thiết bị khác.',
      'Gọi đường dây nóng IT (máy lẻ 1234).',
      'Ghi lại thời điểm và những gì đã bấm.',
      'Nêu được: báo sớm không bị phạt, báo muộn hoặc giấu sự cố làm thiệt hại lan rộng.',
    ],
  },
]

const QUIZ = { mode: 'official', pick: 6, level: 2, skill: 'sec', minutes: 20, attempts: 2, passScore: 80, questions: QUESTIONS }
const CONTENT = {
  plan: {
    type: 'exam', basedOn: 1, title: EXAM_TITLE, summary: 'Đề kiểm tra · mức 1, 2 · 20 phút · đạt từ 80%',
    outline: { mode: 'official', pick: 6, focus: '', title: '', levels: [1, 2], minutes: 20, attempts: 2, perLevel: 3, passScore: 80 },
  },
  quiz: QUIZ,
}


/** Thêm đề mẫu (đã xuất bản) vào khóa An toàn thông tin */
export async function seedExam(orgId: string, kitId: string, img: string, authorId: string): Promise<string> {
  const [exam] = await db.insert(schema.artifacts).values({
    orgId, kitId, type: 'exam', title: EXAM_TITLE, summary: CONTENT.plan.summary, content: CONTENT, status: 'published', publishedVersion: 1, img,
  }).returning()
  await db.insert(schema.artifactVersions).values({ artifactId: exam.id, version: 1, title: EXAM_TITLE, summary: CONTENT.plan.summary, content: CONTENT, publishedBy: authorId, note: 'Bản đầu' })
  return exam.id
}
