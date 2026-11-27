"""Đề kiểm tra mẫu "An toàn thông tin" (trắc nghiệm + tự luận có tiêu chí chấm) để thử xuất đề QTI cho LMS công ty."""
from app.shared import tables as t
from app.shared.db import db, one

EXAM_TITLE = "Đề kiểm tra: An toàn thông tin cho mọi nhân viên"
QD = "QuyDinh-ATTT-2026.pdf"


def _mc(qid: str, level: int, src: str, q: str, choices: list[tuple[str, bool, str]]) -> dict:
    return {"id": qid, "type": "mc", "level": level, "src": src, "q": q, "choices": [{"t": a, "ok": ok, "fb": fb} for a, ok, fb in choices], "approved": True}


QUESTIONS = [
    _mc("sec-q1", 1, f"{QD} · mục 3.1", 'Email ký tên "Phòng IT" yêu cầu bạn gửi mã OTP vừa nhận để giữ tài khoản. Theo quy định, đây là dấu hiệu gì?', [
        ("Yêu cầu hợp lệ vì đến từ Phòng IT", False, "Sai. Bộ phận IT không bao giờ yêu cầu xác minh qua email."),
        ("Dấu hiệu lừa đảo: xin mật khẩu hoặc mã OTP", True, "Đúng. Không ai có quyền hỏi mật khẩu hay mã OTP của bạn, kể cả IT."),
        ("Chỉ đáng ngờ khi email có tệp đính kèm", False, "Sai. Xin OTP đã là dấu hiệu lừa đảo, có tệp hay không cũng vậy."),
        ("Bình thường nếu tên người gửi đúng", False, "Sai. Tên hiển thị giả được dễ dàng; phải xem địa chỉ đầy đủ."),
    ]),
    _mc("sec-q2", 1, f"{QD} · mục 5", "Bạn vừa lỡ bấm vào đường dẫn lạ trong email. Việc cần làm đầu tiên là gì?", [
        ("Ngắt mạng máy tính (rút cáp hoặc tắt Wi-Fi)", True, "Đúng. Đây là bước đầu tiên trong quy trình 15 phút."),
        ("Xóa email đó để không ai bấm nữa", False, "Sai. Xóa email không ngăn được thiệt hại, còn làm mất dấu vết."),
        ("Chờ xem máy có biểu hiện lạ không", False, "Sai. Chờ đợi làm thiệt hại lan rộng."),
        ("Chạy lại máy tính", False, "Sai. Chạy lại máy không cô lập được máy khỏi mạng."),
    ]),
    {"id": "sec-q3", "type": "fill", "level": 1, "src": f"{QD} · mục 5", "q": "Điền vào chỗ trống: khi gặp sự cố, gọi đường dây nóng IT ở máy lẻ _____.", "answer": "1234", "approved": True},
    _mc("sec-q4", 2, f"{QD} · bảng 3.2", "Bạn nhận được tệp .zip có mật khẩu ghi ngay trong email, người gửi bạn không quen. Nên làm gì?", [
        ("Mở bằng mật khẩu trong email rồi quét virus", False, "Sai. Bảng 3.2 ghi rõ: không mở bằng mật khẩu trong email."),
        ("Báo cáo IT", True, "Đúng. Tệp .zip có mật khẩu là cách hay dùng để né bộ lọc."),
        ("Chuyển tiếp cho đồng nghiệp mở thử", False, "Sai. Việc này chỉ lan rủi ro sang người khác."),
        ("Trả lời email hỏi nội dung tệp", False, "Sai. Trả lời email lừa đảo xác nhận địa chỉ của bạn đang dùng."),
    ]),
    {"id": "sec-q5", "type": "essay", "level": 2, "src": "BaoCao-SuCo-Phishing-Q3.pptx · slide 7–9", "approved": True,
     "q": 'Bạn nhận email "hóa đơn tháng 11" từ một nhà cung cấp quen, đề nghị chuyển tiền sang số tài khoản mới và thanh toán ngay trong hôm nay. Nêu các dấu hiệu đáng ngờ và cách bạn xử lý theo quy định.',
     "rubric": ["Nhận ra kiểu lừa đảo giả hóa đơn nhà cung cấp: đổi số tài khoản nhận tiền.", "Nhận ra dấu hiệu thúc giục, tạo cảm giác gấp.",
                "Xác minh qua kênh khác (hỏi phòng Kế toán hoặc gọi nhà cung cấp), không thanh toán theo email.", "Báo cáo email qua nút Báo cáo lừa đảo hoặc báo IT."]},
    {"id": "sec-q6", "type": "essay", "level": 2, "src": f"{QD} · mục 5", "approved": True,
     "q": "Bạn lỡ nhập mật khẩu vào một trang đăng nhập giả. Trình bày các việc cần làm trong 15 phút đầu và giải thích vì sao phải báo ngay.",
     "rubric": ["Ngắt mạng máy tính.", "Đổi mật khẩu từ một thiết bị khác.", "Gọi đường dây nóng IT (máy lẻ 1234).", "Ghi lại thời điểm và những gì đã bấm.",
                "Nêu được: báo sớm không bị phạt, báo muộn hoặc giấu sự cố làm thiệt hại lan rộng."]},
]
SUMMARY = "Đề kiểm tra · mức 1, 2 · 20 phút · đạt từ 80%"
QUIZ = {"mode": "official", "pick": 6, "level": 2, "skill": "sec", "minutes": 20, "attempts": 2, "passScore": 80, "questions": QUESTIONS}
CONTENT = {
    "plan": {"type": "exam", "basedOn": 1, "title": EXAM_TITLE, "summary": SUMMARY,
             "outline": {"mode": "official", "pick": 6, "focus": "", "title": "", "levels": [1, 2], "minutes": 20, "attempts": 2, "perLevel": 3, "passScore": 80}},
    "quiz": QUIZ,
}


def seed_exam(org_id: str, kit_id: str, img: str, author_id: str) -> str:
    """Thêm đề mẫu (đã xuất bản) vào khóa An toàn thông tin"""
    exam = one(t.artifacts.insert().values(orgId=org_id, kitId=kit_id, type="exam", title=EXAM_TITLE, summary=SUMMARY, content=CONTENT, status="published", publishedVersion=1, img=img)
               .returning(t.artifacts.c.id))
    db().execute(t.artifact_versions.insert().values(artifactId=exam["id"], version=1, title=EXAM_TITLE, summary=SUMMARY, content=CONTENT, publishedBy=author_id, note="Bản đầu"))
    return exam["id"]
