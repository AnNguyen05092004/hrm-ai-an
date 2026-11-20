// Dữ liệu mẫu cho trang Chấm bài: đề kiểm tra "An toàn thông tin" (có tự luận) và 2 bài đang chờ chấm,
// kèm điểm nháp AI soạn sẵn (không gọi AI khi seed). Chạy lại nhiều lần không tạo trùng.
import { fileURLToPath } from 'node:url'
import { and, eq, inArray } from 'drizzle-orm'
import { db, schema, sqlClient } from './client.js'
import type { Flag } from './schema.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const KIT_TITLE = 'An toàn thông tin cho mọi nhân viên'
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

const QUIZ = { mode: 'official', pick: 6, level: 2, skill: 'sec', minutes: 20, proctor: true, attempts: 2, passScore: 80, questions: QUESTIONS }
const CONTENT = {
  plan: {
    type: 'exam', title: EXAM_TITLE, summary: 'Thi chính thức · mức 1, 2 · 20 phút · đạt từ 80%',
    outline: { mode: 'official', pick: 6, focus: '', title: '', levels: [1, 2], minutes: 20, proctor: true, attempts: 2, perLevel: 3, passScore: 80 },
  },
  quiz: QUIZ,
}

const ok = (correct: boolean): Json => ({ score: correct ? 1 : 0, max: 1, auto: true, correct })
const essay = (rubric: string[], met: boolean[], evidence: string[], comment: string): Json => ({
  score: met.filter(Boolean).length / rubric.length, max: 1, auto: false,
  ai: { criteria: met.map((m, index) => ({ index, met: m, evidence: m ? evidence[index] ?? '' : '' })), comment },
})
const R5 = QUESTIONS[4].rubric as string[], R6 = QUESTIONS[5].rubric as string[]

interface Sample { email: string; minutesAgo: number; answers: Json; grades: Json; flags: Flag[] }
const SAMPLES: Sample[] = [
  {
    // bài làm tốt: AI chấm nháp gần đủ, người chấm chỉ cần xem lại tiêu chí cuối của câu 5
    email: 'khanh.hg@demo.local', minutesAgo: 95,
    answers: {
      'sec-q1': 1, 'sec-q2': 0, 'sec-q3': '1234', 'sec-q4': 1,
      'sec-q5': 'Dấu hiệu đáng ngờ: nhà cung cấp quen nhưng tự nhiên đổi số tài khoản nhận tiền, đây đúng kiểu giả hóa đơn nhà cung cấp. Email còn ép thanh toán ngay trong hôm nay để mình không kịp kiểm tra.\nCách xử lý: không thanh toán theo email. Gọi lại nhà cung cấp bằng số điện thoại đã lưu trong hợp đồng (không dùng số trong email) và hỏi phòng Kế toán xem có thông báo đổi tài khoản chính thức không. Sau đó chuyển email cho anh chị trong nhóm cùng xem.',
      'sec-q6': 'Trong 15 phút đầu:\n1. Rút cáp mạng, tắt Wi-Fi để ngắt mạng máy tính.\n2. Dùng điện thoại đổi ngay mật khẩu tài khoản vừa nhập.\n3. Gọi đường dây nóng IT máy lẻ 1234.\n4. Ghi lại giờ bấm và trang đã nhập mật khẩu để IT điều tra.\nPhải báo ngay vì báo sớm không bị phạt, còn giấu hoặc báo muộn thì kẻ gian có thêm thời gian dùng tài khoản, thiệt hại lan rộng.',
    },
    grades: {
      'sec-q1': ok(true), 'sec-q2': ok(true), 'sec-q3': ok(true), 'sec-q4': ok(true),
      'sec-q5': essay(R5, [true, true, true, false], [
        'nhà cung cấp quen nhưng tự nhiên đổi số tài khoản nhận tiền, đây đúng kiểu giả hóa đơn nhà cung cấp',
        'Email còn ép thanh toán ngay trong hôm nay để mình không kịp kiểm tra',
        'không thanh toán theo email. Gọi lại nhà cung cấp bằng số điện thoại đã lưu trong hợp đồng',
      ], 'Nhận diện đúng hai dấu hiệu và xác minh qua kênh khác. Chưa nêu việc báo cáo qua nút Báo cáo lừa đảo hoặc báo IT; "chuyển email cho nhóm" không thay được báo cáo.'),
      'sec-q6': essay(R6, [true, true, true, true, true], [
        'Rút cáp mạng, tắt Wi-Fi để ngắt mạng máy tính',
        'Dùng điện thoại đổi ngay mật khẩu tài khoản vừa nhập',
        'Gọi đường dây nóng IT máy lẻ 1234',
        'Ghi lại giờ bấm và trang đã nhập mật khẩu',
        'báo sớm không bị phạt, còn giấu hoặc báo muộn thì kẻ gian có thêm thời gian dùng tài khoản, thiệt hại lan rộng',
      ], 'Đủ bốn bước theo đúng thứ tự và giải thích đúng lý do phải báo sớm.'),
    },
    flags: [],
  },
  {
    // bài yếu, có cờ giám sát: người chấm phải xử lý cờ trước khi xác nhận
    email: 'yen.nh@demo.local', minutesAgo: 40,
    answers: {
      'sec-q1': 1, 'sec-q2': 2, 'sec-q3': '1234', 'sec-q4': 1,
      'sec-q5': 'Email này có thể là lừa đảo vì đổi số tài khoản. Em sẽ hỏi lại phòng Kế toán trước khi chuyển tiền.',
      'sec-q6': 'Đổi mật khẩu ngay rồi báo cho IT biết. Nên báo sớm để IT xử lý kịp.',
    },
    grades: {
      'sec-q1': ok(true), 'sec-q2': ok(false), 'sec-q3': ok(true), 'sec-q4': ok(true),
      'sec-q5': essay(R5, [true, false, true, false], [
        'có thể là lừa đảo vì đổi số tài khoản',
        '',
        'Em sẽ hỏi lại phòng Kế toán trước khi chuyển tiền',
      ], 'Nhận ra việc đổi số tài khoản và có xác minh với Kế toán. Chưa nêu dấu hiệu thúc giục và chưa báo cáo email.'),
      'sec-q6': essay(R6, [false, true, false, false, false], [
        '',
        'Đổi mật khẩu ngay',
      ], 'Chỉ nêu đổi mật khẩu; không rõ đổi từ thiết bị khác. "Báo cho IT" chưa đủ cụ thể (đường dây nóng máy lẻ 1234). Thiếu ngắt mạng và ghi lại thời điểm. Lý do báo sớm nêu chung chung.'),
    },
    flags: [
      { kind: 'tab', at: 312, status: 'open' },
      { kind: 'paste', at: 655, note: 'Dán 96 ký tự vào câu 5', status: 'open' },
    ],
  },
]

/** Tạo đề mẫu và bài chờ chấm cho tổ chức; bỏ qua nếu đã có */
export async function seedGrading(orgId: string, authorId: string): Promise<number> {
  const [kit] = await db.select().from(schema.kits).where(and(eq(schema.kits.orgId, orgId), eq(schema.kits.title, KIT_TITLE)))
  if (!kit) return 0
  let [exam] = await db.select().from(schema.artifacts).where(and(eq(schema.artifacts.kitId, kit.id), eq(schema.artifacts.title, EXAM_TITLE)))
  if (!exam) {
    [exam] = await db.insert(schema.artifacts).values({
      orgId, kitId: kit.id, type: 'exam', title: EXAM_TITLE, summary: CONTENT.plan.summary, content: CONTENT,
      status: 'published', publishedVersion: 1, img: kit.img,
    }).returning()
    await db.insert(schema.artifactVersions).values({ artifactId: exam.id, version: 1, title: EXAM_TITLE, summary: CONTENT.plan.summary, content: CONTENT, publishedBy: authorId, note: 'Bản đầu' })
  }
  const people = await db.select({ id: schema.users.id, email: schema.users.email }).from(schema.users)
    .where(and(eq(schema.users.orgId, orgId), inArray(schema.users.email, SAMPLES.map((s) => s.email))))
  const done = new Set((await db.select({ userId: schema.attempts.userId }).from(schema.attempts).where(eq(schema.attempts.artifactId, exam.id))).map((x) => x.userId))
  let n = 0
  for (const s of SAMPLES) {
    const u = people.find((p) => p.email === s.email)
    if (!u || done.has(u.id)) continue
    const submittedAt = new Date(Date.now() - s.minutesAgo * 60_000)
    const startedAt = new Date(submittedAt.getTime() - 16 * 60_000)
    const g = s.grades as Record<string, { score: number; max: number }>
    const score = (100 * Object.values(g).reduce((t, x) => t + x.score, 0)) / Object.values(g).reduce((t, x) => t + x.max, 0)
    await db.insert(schema.attempts).values({
      orgId, artifactId: exam.id, version: 1, userId: u.id, mode: 'official', questions: QUESTIONS as never, answers: s.answers,
      grades: s.grades, flags: s.flags, consent: true, status: 'grading', score,
      startedAt, deadline: new Date(startedAt.getTime() + QUIZ.minutes * 60_000), submittedAt,
    })
    n++
  }
  return n
}

// Chạy riêng cho DB đang dùng (không xóa dữ liệu): npm run db:seed-grading -w apps/api
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [author] = await db.select().from(schema.users).where(eq(schema.users.role, 'author')).limit(1)
  const n = author ? await seedGrading(author.orgId, author.id) : 0
  process.stdout.write(`Đã thêm ${n} bài chờ chấm.\n`)
  await sqlClient.end()
}
