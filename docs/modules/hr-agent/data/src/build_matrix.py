"""Sinh file Excel mẫu ma trận phân quyền cho HR Agent.

Chạy: python build_matrix.py <đường_dẫn_output.xlsx>   (cần openpyxl)
Toàn bộ người, email, quy chế "(giả lập)" và ngưỡng tiền là hư cấu.
"""
import sys, unicodedata, datetime as dt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.comments import Comment

OUT = sys.argv[1]
DOMAIN = 'vinsmartfuture.demo'
F = 'Arial'
NAVY = '3F48A6'
thin = Side(style='thin', color='D5D9E3')
B = Border(left=thin, right=thin, top=thin, bottom=thin)
H_FONT = Font(name=F, bold=True, color='FFFFFF', size=10)
H_FILL = PatternFill('solid', fgColor=NAVY)
STEP_FILL = PatternFill('solid', fgColor='64748B')
OUT_FILL = PatternFill('solid', fgColor='2E9E6A')
BODY = Font(name=F, size=10)
INPUT = Font(name=F, size=10, color='0000FF')
YELLOW = PatternFill('solid', fgColor='FFF2CC')
GREY = PatternFill('solid', fgColor='F3F5F8')
WRAP = Alignment(wrap_text=True, vertical='top')
CENTER = Alignment(horizontal='center', vertical='top', wrap_text=True)
TITLE = Font(name=F, bold=True, size=13, color=NAVY)
NOTE = Font(name=F, italic=True, size=9, color='6B7280')

def unaccent(s):
    s = s.replace('đ', 'd').replace('Đ', 'D')
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

def header(ws, row, cols, fill=H_FILL):
    for i, (h, w) in enumerate(cols, 1):
        c = ws.cell(row, i, h); c.font = H_FONT; c.fill = fill; c.alignment = CENTER; c.border = B
        if w: ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[row].height = 30

def body(c, center=False):
    c.font = BODY; c.border = B; c.alignment = CENTER if center else WRAP
    return c

# =============================================================== DỮ LIỆU
# ---- Phòng ban VinSmart Future (giả lập): mã, tên, khối, TP, GDK, HRBP (mã NV)
DEPTS = [
 ('BGD',     'Ban Tổng giám đốc',              'Ban điều hành',     'VSF001', 'VSF001', 'VSF022'),
 ('PM-BE',   'Phòng Phát triển Backend',       'Khối Phần mềm',     'VSF010', 'VSF002', 'VSF022'),
 ('PM-FE',   'Phòng Frontend & Mobile',        'Khối Phần mềm',     'VSF012', 'VSF002', 'VSF022'),
 ('PM-QA',   'Phòng Đảm bảo chất lượng (QA)',  'Khối Phần mềm',     'VSF014', 'VSF002', 'VSF022'),
 ('PM-OPS',  'Phòng DevOps & Vận hành hệ thống', 'Khối Phần mềm',   'VSF017', 'VSF002', 'VSF022'),
 ('AI-ML',   'Phòng AI ứng dụng',              'Khối AI & Dữ liệu', 'VSF013', 'VSF004', 'VSF023'),
 ('AI-DATA', 'Phòng Nền tảng dữ liệu',         'Khối AI & Dữ liệu', 'VSF018', 'VSF004', 'VSF023'),
 ('KD-B2B',  'Phòng Kinh doanh doanh nghiệp',  'Khối Kinh doanh',   'VSF015', 'VSF003', 'VSF023'),
 ('KD-MKT',  'Phòng Marketing',                'Khối Kinh doanh',   'VSF016', 'VSF003', 'VSF023'),
 ('HT-NS',   'Phòng Nhân sự',                  'Khối Hỗ trợ',       'VSF019', 'VSF006', 'VSF022'),
 ('HT-TC',   'Phòng Tài chính – Kế toán',      'Khối Hỗ trợ',       'VSF007', 'VSF006', 'VSF022'),
 ('HT-PC',   'Phòng Pháp chế',                 'Khối Hỗ trợ',       'VSF020', 'VSF006', 'VSF022'),
 ('HT-IT',   'Phòng IT nội bộ',                'Khối Hỗ trợ',       'VSF021', 'VSF006', 'VSF022'),
]
# ---- Nhân sự: mã, họ tên, chức danh, phòng, QLTT, cấp bậc, đang nghỉ phép, ủy quyền
PEOPLE = [
 ('VSF001', 'Đặng Văn Khánh', 'Tổng giám đốc', 'BGD', None, 'Giám đốc', False, 'VSF006'),
 ('VSF002', 'Nguyễn Hoàng Long', 'Giám đốc Khối Phần mềm', 'BGD', 'VSF001', 'Giám đốc', False, 'VSF024'),
 ('VSF003', 'Võ Thị Ngọc Ánh', 'Giám đốc Khối Kinh doanh', 'BGD', 'VSF001', 'Giám đốc', False, 'VSF015'),
 ('VSF004', 'Lâm Quang Vinh', 'Giám đốc Khối AI & Dữ liệu', 'BGD', 'VSF001', 'Giám đốc', False, 'VSF013'),
 ('VSF005', 'Hoàng Thị Lan', 'Giám đốc Nhân sự', 'HT-NS', 'VSF001', 'Giám đốc', False, 'VSF019'),
 ('VSF006', 'Bùi Văn Nam', 'Giám đốc Khối Hỗ trợ', 'BGD', 'VSF001', 'Giám đốc', False, 'VSF007'),
 ('VSF007', 'Trịnh Văn Sơn', 'Kế toán trưởng – Trưởng phòng TC-KT', 'HT-TC', 'VSF006', 'Quản lý', False, 'VSF025'),
 ('VSF010', 'Trần Quốc Bảo', 'Trưởng phòng Backend', 'PM-BE', 'VSF002', 'Quản lý', True, 'VSF011'),
 ('VSF011', 'Lê Thị Cúc', 'Phó phòng Backend', 'PM-BE', 'VSF010', 'Quản lý', False, None),
 ('VSF012', 'Đinh Gia Huy', 'Trưởng phòng Frontend & Mobile', 'PM-FE', 'VSF002', 'Quản lý', False, None),
 ('VSF013', 'Phùng Thảo Vy', 'Trưởng phòng AI ứng dụng', 'AI-ML', 'VSF004', 'Quản lý', False, 'VSF031'),
 ('VSF014', 'Hà Minh Tuấn', 'Trưởng phòng QA', 'PM-QA', 'VSF002', 'Quản lý', False, None),
 ('VSF015', 'Cao Thị Diệu', 'Trưởng phòng Kinh doanh DN', 'KD-B2B', 'VSF003', 'Quản lý', False, 'VSF033'),
 ('VSF016', 'Tạ Đức Anh', 'Trưởng phòng Marketing', 'KD-MKT', 'VSF003', 'Quản lý', False, None),
 ('VSF017', 'Châu Văn Lực', 'Trưởng phòng DevOps', 'PM-OPS', 'VSF002', 'Quản lý', False, 'VSF032'),
 ('VSF018', 'Kiều Thị Nga', 'Trưởng phòng Nền tảng dữ liệu', 'AI-DATA', 'VSF004', 'Quản lý', False, None),
 ('VSF019', 'Phan Thị Hồng', 'Trưởng phòng Nhân sự', 'HT-NS', 'VSF005', 'Quản lý', False, 'VSF022'),
 ('VSF020', 'Doãn Minh Khoa', 'Trưởng phòng Pháp chế', 'HT-PC', 'VSF006', 'Quản lý', False, None),
 ('VSF021', 'Lưu Hải Đăng', 'Trưởng phòng IT nội bộ', 'HT-IT', 'VSF006', 'Quản lý', False, None),
 ('VSF022', 'Ngô Thanh Mai', 'HRBP Khối Phần mềm & Hỗ trợ', 'HT-NS', 'VSF019', 'Nhân viên', False, 'VSF023'),
 ('VSF023', 'Lý Thanh Tâm', 'HRBP Khối AI & Kinh doanh', 'HT-NS', 'VSF019', 'Nhân viên', False, 'VSF022'),
 ('VSF024', 'Đỗ Mạnh Hùng', 'Phó giám đốc Khối Phần mềm', 'BGD', 'VSF002', 'Giám đốc', False, None),
 ('VSF025', 'Mai Thị Yến', 'Phó phòng Tài chính – Kế toán', 'HT-TC', 'VSF007', 'Quản lý', False, None),
 ('VSF030', 'Phạm Minh Đức', 'Trưởng nhóm Backend Platform', 'PM-BE', 'VSF010', 'Quản lý', False, 'VSF011'),
 ('VSF031', 'Vũ Thu Hà', 'Trưởng nhóm Computer Vision', 'AI-ML', 'VSF013', 'Quản lý', False, None),
 ('VSF032', 'Mạc Văn Toàn', 'Trưởng nhóm SRE', 'PM-OPS', 'VSF017', 'Quản lý', False, None),
 ('VSF033', 'Quách Thị Hạnh', 'Trưởng nhóm Key Account', 'KD-B2B', 'VSF015', 'Quản lý', False, None),
 ('VSF034', 'Tôn Thất Bình', 'Trưởng nhóm Mobile', 'PM-FE', 'VSF012', 'Quản lý', False, None),
 ('VSF035', 'Huỳnh Ngọc Trâm', 'Trưởng nhóm Content', 'KD-MKT', 'VSF016', 'Quản lý', True, None),
 ('VSF101', 'Nguyễn Văn An', 'Kỹ sư Backend', 'PM-BE', 'VSF030', 'Nhân viên', False, None),
 ('VSF102', 'Trần Thị Bích', 'Kỹ sư AI', 'AI-ML', 'VSF031', 'Nhân viên', False, None),
 ('VSF103', 'Lê Hoàng Phúc', 'Chuyên viên Kinh doanh', 'KD-B2B', 'VSF033', 'Nhân viên', False, None),
 ('VSF104', 'Đỗ Thị Thu', 'Kỹ sư DevOps', 'PM-OPS', 'VSF032', 'Nhân viên', False, None),
 ('VSF105', 'Hồ Quang Minh', 'Chuyên viên Content', 'KD-MKT', 'VSF035', 'Nhân viên', False, None),
 ('VSF106', 'Trương Thị Yến', 'Kế toán thanh toán', 'HT-TC', 'VSF007', 'Nhân viên', False, None),
 ('VSF107', 'Phan Văn Tài', 'Kỹ sư Mobile', 'PM-FE', 'VSF034', 'Nhân viên', False, None),
 ('VSF108', 'Lương Thị Hoa', 'Chuyên viên Tuyển dụng', 'HT-NS', 'VSF019', 'Nhân viên', False, None),
 ('VSF109', 'Nghiêm Đức Thắng', 'Kỹ sư QA Automation', 'PM-QA', 'VSF014', 'Nhân viên', False, None),
 ('VSF110', 'Âu Thị Kim', 'Kỹ sư Dữ liệu', 'AI-DATA', 'VSF018', 'Nhân viên', False, None),
 ('VSF111', 'Khúc Minh Quân', 'Chuyên viên IT Helpdesk', 'HT-IT', 'VSF021', 'Nhân viên', False, None),
 ('VSF112', 'Vương Thị Lệ', 'Chuyên viên Pháp chế', 'HT-PC', 'VSF020', 'Nhân viên', False, None),
 ('VSF113', 'Thái Bảo Ngọc', 'Kỹ sư NLP', 'AI-ML', 'VSF031', 'Nhân viên', False, None),
]
# ---- Vai trò: mã, tên, loại tra cứu, cột ở PhongBan / mã NV cố định, email nhóm, máy lẻ nhóm, cấp kế tiếp
ROLES = [
 ('QLTT', 'Quản lý trực tiếp', 'Theo người gửi', '', '', '', 'TP'),
 ('TP', 'Trưởng phòng', 'Theo phòng ban', 'TP', '', '', 'GDK'),
 ('GDK', 'Giám đốc khối', 'Theo phòng ban', 'GDK', '', '', 'TGD'),
 ('HRBP', 'HR Business Partner', 'Theo phòng ban', 'HRBP', '', '', 'TPHR'),
 ('GDNS', 'Giám đốc nhân sự', 'Cố định', 'VSF005', '', '', 'TGD'),
 ('TGD', 'Tổng giám đốc', 'Cố định', 'VSF001', '', '', ''),
 ('TPHR', 'Trưởng phòng Nhân sự', 'Cố định', 'VSF019', '', '', 'GDNS'),
 ('KTT', 'Kế toán trưởng', 'Cố định', 'VSF007', '', '', 'GDK'),
 ('CB', 'Nhóm C&B', 'Hàng đợi', '', f'cb@{DOMAIN}', '2310', ''),
 ('KT', 'Nhóm Kế toán thanh toán', 'Hàng đợi', '', f'ketoan@{DOMAIN}', '2410', ''),
 ('TT', 'Nhóm Thanh tra công', 'Hàng đợi', '', f'thanhtra@{DOMAIN}', '2320', ''),
 ('PC', 'Nhóm Pháp chế', 'Hàng đợi', '', f'phapche@{DOMAIN}', '2510', ''),
 ('LD', 'Nhóm Đào tạo (L&D)', 'Hàng đợi', '', f'daotao@{DOMAIN}', '2330', ''),
 ('IT', 'Nhóm IT tài sản', 'Hàng đợi', '', f'it-helpdesk@{DOMAIN}', '2610', ''),
 ('HRADM', 'Nhóm HR Admin', 'Hàng đợi', '', f'hradmin@{DOMAIN}', '2340', ''),
 ('HDKL', 'Hội đồng kỷ luật', 'Hàng đợi', '', f'hoidongkyluat@{DOMAIN}', '2300', ''),
]

# ---- Ma trận
D_EFF = dt.date(2026, 11, 1)
BL = 'BLLĐ 2019'
ALL = 'Tất cả'
rows = []
def add(task, name, group, crit, unit, levels, check='', co='', deleg='Có', proof='', secret='Không', sla=8,
        basis='', note='', scope=ALL):
    for i, lv in enumerate(levels, 1):
        frm, to, cat, appr = lv[:4]
        ex = lv[4] if len(lv) > 4 else {}
        tag = '' if scope == ALL else '-' + scope.replace('-', '')
        rows.append(dict(
            code=f'{task}{tag}-L{i}', task=task, name=name, group=group, scope=scope, crit=crit, unit=unit,
            frm=frm, to=to, cat=cat, check=ex.get('check', check), appr=appr, co=ex.get('co', co),
            deleg=ex.get('deleg', deleg), proof=ex.get('proof', proof), secret=ex.get('secret', secret),
            sla=ex.get('sla', sla), basis=basis, eff=D_EFF, note=ex.get('note', note if i == 1 else '')))

N = None
# Nghỉ và công
add('HR-LV-01', 'Nghỉ phép năm', 'Nghỉ và công', 'Số ngày', '',
    [(0.5, 3, N, 'QLTT'), (3, 10, N, 'TP'), (10, N, N, 'GDK', {'sla': 24})],
    basis=f'{BL} Điều 113; Nội quy lao động (giả lập) Mục 4', note='Tạm giữ số dư phép khi đơn đang chờ')
add('HR-LV-01', 'Nghỉ phép năm', 'Nghỉ và công', 'Số ngày', '',
    [(0.5, 2, N, 'QLTT', {'sla': 4}), (2, 7, N, 'TP'), (7, N, N, 'GDK', {'sla': 24})], scope='PM-OPS',
    basis=f'{BL} Điều 113; Quy chế trực vận hành 24/7 (giả lập)', note='DevOps có lịch trực on-call: ngưỡng thấp hơn để kịp xếp người trực thay')
add('HR-LV-02', 'Nghỉ không hưởng lương', 'Nghỉ và công', 'Số ngày', '',
    [(0.5, 5, N, 'TP'), (5, 30, N, 'GDK', {'check': 'HRBP'}), (30, N, N, 'GDNS', {'check': 'HRBP', 'sla': 48})],
    basis=f'{BL} Điều 115 khoản 3', proof='Lý do nghỉ')
add('HR-LV-03', 'Nghỉ ốm hưởng BHXH', 'Nghỉ và công', 'Không có', '',
    [(N, N, N, 'QLTT')], check='CB', proof='Giấy chứng nhận nghỉ việc hưởng BHXH', basis='Luật BHXH 2024 (41/2024/QH15)')
add('HR-LV-04', 'Nghỉ thai sản', 'Nghỉ và công', 'Không có', '',
    [(N, N, N, 'TP')], check='CB', proof='Giấy khai sinh hoặc giấy chứng sinh', sla=24, basis='Luật BHXH 2024 (41/2024/QH15)')
add('HR-LV-05', 'Nghỉ việc riêng có lương (cưới, tang)', 'Nghỉ và công', 'Không có', '',
    [(N, N, N, 'QLTT')], proof='Giấy đăng ký kết hôn / giấy báo tử', basis=f'{BL} Điều 115 khoản 1')
add('HR-OT-01', 'Làm thêm giờ', 'Nghỉ và công', 'Loại ngày', '',
    [(N, N, 'Ngày thường', 'QLTT', {'sla': 2}), (N, N, 'Cuối tuần', 'QLTT', {'sla': 2}), (N, N, 'Ngày lễ', 'TP', {'sla': 4})],
    basis=f'{BL} Điều 107; NĐ 145/2020/NĐ-CP Điều 60–62', note='Chặn trước nếu vượt 40h/tháng hoặc 200h/năm')
add('HR-OT-01', 'Làm thêm giờ', 'Nghỉ và công', 'Loại ngày', '',
    [(N, N, 'Ngày thường', 'QLTT', {'sla': 1}), (N, N, 'Cuối tuần', 'TP', {'sla': 2}), (N, N, 'Ngày lễ', 'GDK', {'sla': 4})],
    scope='PM-OPS', basis=f'{BL} Điều 107; Quy chế trực vận hành 24/7 (giả lập)',
    note='OT xử lý sự cố production: trưởng nhóm SRE duyệt trong 1 giờ')
add('HR-OT-02', 'Làm thêm trên 200h/năm (dự án được phép 300h)', 'Nghỉ và công', 'Không có', '',
    [(N, N, N, 'GDNS')], check='CB', proof='Dự án thuộc diện được làm 300h; thông báo Sở LĐ', sla=24,
    basis=f'{BL} Điều 107 khoản 3; NĐ 145/2020/NĐ-CP Điều 61')
add('HR-AT-01', 'Giải trình công', 'Nghỉ và công', 'Số ngày trong tháng', '',
    [(1, 3, N, 'TT', {'check': 'QLTT'}), (3, N, N, 'TT', {'check': 'TP', 'note': 'Từ 3 ngày/tháng cần Trưởng phòng xác nhận'})],
    proof='Ảnh xác nhận của quản lý / log hệ thống', sla=4, basis='Quy chế chấm công (giả lập) Điều 6',
    note='Người kiểm tra = người xác nhận đúng sự thật')
add('HR-WFH-01', 'Làm việc từ xa', 'Nghỉ và công', 'Số ngày trong tháng', '',
    [(1, 5, N, 'QLTT'), (5, N, N, 'TP')], basis='Chính sách làm việc linh hoạt (giả lập)')
add('HR-BT-01', 'Đi công tác trong nước', 'Công tác', 'Số ngày', '',
    [(1, 5, N, 'TP'), (5, N, N, 'GDK')], proof='Kế hoạch công tác', basis='Quy chế công tác (giả lập) Điều 3')
add('HR-BT-02', 'Đi công tác nước ngoài', 'Công tác', 'Số ngày', '',
    [(1, 15, N, 'GDK', {'check': 'HRBP'}), (15, N, N, 'TGD', {'check': 'HRBP', 'deleg': 'Không', 'sla': 48})],
    proof='Kế hoạch công tác; thư mời', basis='Quy chế công tác (giả lập) Điều 5')
# Chi phí
add('FIN-TA-01', 'Tạm ứng công tác phí', 'Chi phí', 'Số tiền (VND)', '',
    [(0, 5_000_000, N, 'QLTT', {'check': 'KT'}), (5_000_000, 20_000_000, N, 'TP', {'check': 'KT'}),
     (20_000_000, 100_000_000, N, 'GDK', {'check': 'KT', 'sla': 16}),
     (100_000_000, N, N, 'TGD', {'check': 'KTT', 'deleg': 'Không', 'sla': 24})],
    proof='Kế hoạch công tác', basis='Quy chế tài chính QC-TC-05 (giả lập) Điều 8')
add('FIN-TA-01', 'Tạm ứng công tác phí', 'Chi phí', 'Số tiền (VND)', '',
    [(0, 10_000_000, N, 'QLTT', {'check': 'KT'}), (10_000_000, 50_000_000, N, 'TP', {'check': 'KT'}),
     (50_000_000, 200_000_000, N, 'GDK', {'check': 'KT', 'sla': 16}),
     (200_000_000, N, N, 'TGD', {'check': 'KTT', 'deleg': 'Không', 'sla': 24})], scope='KD-B2B',
    proof='Kế hoạch công tác; tên khách hàng', basis='Quy chế tài chính QC-TC-05 (giả lập) Phụ lục 2',
    note='Kinh doanh đi gặp khách thường xuyên nên ngưỡng cao hơn')
add('FIN-RE-01', 'Hoàn ứng / thanh toán chi phí', 'Chi phí', 'Số tiền (VND)', '',
    [(0, 5_000_000, N, 'QLTT', {'check': 'KT'}), (5_000_000, 50_000_000, N, 'TP', {'check': 'KT'}),
     (50_000_000, N, N, 'GDK', {'check': 'KTT', 'sla': 24})],
    proof='Hóa đơn GTGT; bảng kê chi phí', basis='Quy chế tài chính QC-TC-05 (giả lập) Điều 11',
    note='AI đối chiếu tổng hóa đơn với số tiền trên ticket')
add('FIN-TR-01', 'Đào tạo / chứng chỉ bên ngoài (AWS, GCP…)', 'Chi phí', 'Số tiền (VND)', '',
    [(0, 10_000_000, N, 'TP', {'check': 'LD'}), (10_000_000, 50_000_000, N, 'GDK', {'check': 'LD'}),
     (50_000_000, N, N, 'TGD', {'check': 'LD', 'co': 'GDNS', 'deleg': 'Không', 'sla': 48,
                                 'proof': 'Báo giá khóa học; cam kết đào tạo'})],
    proof='Báo giá khóa học', basis=f'{BL} Điều 62 (hợp đồng đào tạo); Quy chế đào tạo (giả lập)')
add('HR-AL-01', 'Thưởng / phụ cấp đột xuất', 'Chi phí', 'Số tiền (VND)', '',
    [(0, 5_000_000, N, 'TP', {'check': 'CB'}), (5_000_000, 20_000_000, N, 'GDK', {'check': 'CB'}),
     (20_000_000, N, N, 'GDNS', {'check': 'CB', 'sla': 24})],
    proof='Đề xuất có lý do', basis='Quy chế lương thưởng (giả lập) Điều 14')
add('HR-EQ-01', 'Cấp thiết bị làm việc', 'Chi phí', 'Số tiền (VND)', '',
    [(0, 15_000_000, N, 'QLTT', {'check': 'IT'}), (15_000_000, 50_000_000, N, 'TP', {'check': 'IT'}),
     (50_000_000, N, N, 'GDK', {'check': 'IT', 'sla': 24})],
    proof='Cấu hình đề xuất', basis='Quy chế quản lý tài sản (giả lập) Điều 7')
add('HR-EQ-01', 'Cấp thiết bị làm việc', 'Chi phí', 'Số tiền (VND)', '',
    [(0, 50_000_000, N, 'TP', {'check': 'IT'}), (50_000_000, 300_000_000, N, 'GDK', {'check': 'IT', 'sla': 24}),
     (300_000_000, N, N, 'TGD', {'check': 'KTT', 'deleg': 'Không', 'sla': 48})], scope='AI-ML',
    proof='Cấu hình đề xuất; lý do cần GPU (dự án, mô hình)', basis='Quy chế quản lý tài sản (giả lập) Phụ lục 1',
    note='Máy trạm GPU cho huấn luyện mô hình')
# Hồ sơ
add('HR-CF-01', 'Giấy xác nhận công tác / thu nhập', 'Hồ sơ', 'Không có', '',
    [(N, N, N, 'HRBP')], check='HRADM', sla=16, basis='Quy trình hồ sơ nhân sự (giả lập)')
add('HR-PR-01', 'Cập nhật thông tin cá nhân (tài khoản lương, địa chỉ)', 'Hồ sơ', 'Không có', '',
    [(N, N, N, 'HRBP')], check='HRADM', proof='Ảnh giấy tờ chứng minh', sla=16,
    basis='Luật Bảo vệ dữ liệu cá nhân 2025 (91/2025/QH15)')
add('HR-PB-01', 'Kết thúc thử việc', 'Hồ sơ', 'Không có', '',
    [(N, N, N, 'TP')], check='QLTT', proof='Phiếu đánh giá thử việc', sla=24, basis=f'{BL} Điều 27',
    note='QLTT đánh giá, TP quyết định')
# Khiếu nại, kỷ luật
add('HR-CP-01', 'Khiếu nại, phản ánh', 'Khiếu nại và kỷ luật', 'Mức độ', '',
    [(N, N, 'Thấp', 'HRBP'), (N, N, 'Trung bình', 'TPHR', {'sla': 24}),
     (N, N, 'Nghiêm trọng', 'GDNS', {'co': 'PC', 'deleg': 'Không', 'sla': 24})],
    secret='Có', basis=f'{BL} Điều 179 (giải quyết khiếu nại); Quy chế khiếu nại (giả lập)',
    note='Bỏ qua người duyệt nếu là đối tượng bị khiếu nại')
add('HR-CP-02', 'Báo cáo quấy rối, hành vi sai phạm', 'Khiếu nại và kỷ luật', 'Mức độ', '',
    [(N, N, 'Trung bình', 'GDNS', {'sla': 24}), (N, N, 'Nghiêm trọng', 'GDNS', {'co': 'PC', 'sla': 8})],
    deleg='Không', secret='Có', basis=f'{BL} Điều 118 khoản 2 điểm d; NĐ 145/2020/NĐ-CP Điều 84–85',
    note='Không gửi quản lý trực tiếp; chỉ người xử lý thấy nội dung')
add('HR-DS-01', 'Đề xuất kỷ luật', 'Khiếu nại và kỷ luật', 'Hình thức', '',
    [(N, N, 'Khiển trách', 'GDK', {'check': 'HRBP'}),
     (N, N, 'Kéo dài thời hạn nâng lương', 'GDNS', {'check': 'HRBP'}),
     (N, N, 'Cách chức', 'TGD', {'check': 'PC'}),
     (N, N, 'Sa thải', 'TGD', {'check': 'PC', 'co': 'HDKL'})],
    deleg='Không', secret='Có', proof='Biên bản vi phạm', sla=48, basis=f'{BL} Điều 122–125')
# Biến động nhân sự
add('HR-TF-01', 'Điều chuyển nội bộ', 'Biến động nhân sự', 'Phạm vi', '',
    [(N, N, 'Trong phòng', 'TP'), (N, N, 'Khác phòng, cùng khối', 'GDK', {'check': 'HRBP'}),
     (N, N, 'Khác khối', 'GDNS', {'check': 'HRBP', 'sla': 24})],
    proof='Đồng ý của đơn vị nhận', sla=16, basis=f'{BL} Điều 29 (chuyển tạm thời); Quy chế điều chuyển (giả lập)')
add('HR-RS-01', 'Đơn xin thôi việc', 'Biến động nhân sự', 'Cấp bậc người gửi', '',
    [(N, N, 'Nhân viên', 'TP', {'check': 'HRBP'}), (N, N, 'Quản lý', 'GDK', {'check': 'HRBP'}),
     (N, N, 'Giám đốc', 'TGD', {'check': 'GDNS', 'deleg': 'Không'})],
    sla=24, basis=f'{BL} Điều 35 (thời hạn báo trước)')
add('HR-HC-01', 'Đề xuất tuyển bổ sung', 'Biến động nhân sự', 'Định biên', '',
    [(N, N, 'Trong định biên', 'GDK', {'check': 'HRBP'}),
     (N, N, 'Ngoài định biên', 'TGD', {'check': 'GDNS', 'deleg': 'Không', 'sla': 48})],
    proof='Mô tả công việc (JD)', sla=24, basis='Quy trình tuyển dụng (giả lập)')

assert len(rows) >= 50, len(rows)
n_scope = sum(r['scope'] != ALL for r in rows)

# email từ tên: "Nguyễn Văn An" -> annv@
used = {}
def email(name):
    p = unaccent(name).lower().split()
    base = p[-1] + ''.join(x[0] for x in p[:-1])
    used[base] = used.get(base, 0) + 1
    return f'{base}{used[base] if used[base] > 1 else ""}@{DOMAIN}'

wb = Workbook()

# =============================================================== Sheet NhanSu
ns = wb.active; ns.title = 'NhanSu'
ns['A1'] = 'Danh bạ nhân sự (thay cho HRM khi demo)'; ns['A1'].font = TITLE
ns['A2'] = f'Tên, email (@{DOMAIN}), máy lẻ đều hư cấu. Bản thật lấy từ HRM tại thời điểm gửi ticket.'; ns['A2'].font = NOTE
NS_COLS = [('Mã NV', 10), ('Họ tên', 20), ('Chức danh', 32), ('Mã phòng ban', 11), ('Email', 30), ('Máy lẻ', 8),
           ('Tài khoản chat', 16), ('Quản lý trực tiếp', 11), ('Cấp bậc', 11), ('Đang nghỉ phép', 10), ('Người ủy quyền', 11)]
header(ns, 4, NS_COLS)
ns['J4'].comment = Comment('Bản thật lấy từ lịch nghỉ trong HRM tại lúc gửi ticket. Demo: Trần Quốc Bảo và Huỳnh Ngọc Trâm đang nghỉ 15–25/11/2026.', 'HR Agent')
NS0 = 5; NS1 = NS0 + len(PEOPLE) - 1
for i, (code, name, title, dept, mgr, lvl, leave, deleg) in enumerate(PEOPLE):
    r = NS0 + i
    em = email(name)
    vals = [code, name, title, dept, em, str(2100 + i * 7 % 900), '@' + em.split('@')[0], mgr, lvl,
            'Có' if leave else 'Không', deleg]
    for j, v in enumerate(vals, 1):
        body(ns.cell(r, j, v), center=j in (1, 4, 6, 8, 9, 10, 11))
ns.freeze_panes = 'C5'; ns.auto_filter.ref = f'A4:K{NS1}'
ns.conditional_formatting.add(f'J{NS0}:J{NS1}', FormulaRule(formula=[f'J{NS0}="Có"'], font=Font(name=F, bold=True, color='C11D2A'), fill=PatternFill('solid', fgColor='FDE8E8')))
NSR = lambda col: f'NhanSu!${col}${NS0}:${col}$120'   # chừa chỗ thêm người

# =============================================================== Sheet PhongBan
pb = wb.create_sheet('PhongBan')
pb['A1'] = 'Phòng ban và người giữ vai trò theo phòng ban'; pb['A1'].font = TITLE
pb['A2'] = 'Cột TP / GDK / HRBP chứa mã NV; tên tra từ NhanSu. Vai trò "Theo phòng ban" ở sheet VaiTro đọc đúng tên cột này.'; pb['A2'].font = NOTE
PB_COLS = [('Mã phòng ban', 11), ('Tên phòng ban', 30), ('Khối', 18), ('TP', 9), ('Tên trưởng phòng', 22),
           ('GDK', 9), ('Tên giám đốc khối', 22), ('HRBP', 9), ('Tên HRBP', 20)]
header(pb, 4, PB_COLS)
PB0 = 5; PB1 = PB0 + len(DEPTS) - 1
for i, (code, name, block, tp, gdk, hrbp) in enumerate(DEPTS):
    r = PB0 + i
    for j, v in enumerate([code, name, block, tp, None, gdk, None, hrbp, None], 1):
        body(pb.cell(r, j, v), center=j in (1, 4, 6, 8))
    for col, src in (('E', 'D'), ('G', 'F'), ('I', 'H')):
        body(pb[f'{col}{r}']).value = f'=IFERROR(INDEX({NSR("B")},MATCH({src}{r},{NSR("A")},0)),"Không tìm thấy")'
pb.freeze_panes = 'C5'

# =============================================================== Sheet VaiTro
vr = wb.create_sheet('VaiTro')
vr['A1'] = 'Danh mục vai trò: cách tra ra người cụ thể'; vr['A1'].font = TITLE
vr['A2'] = 'Theo người gửi = quản lý trực tiếp trong NhanSu · Theo phòng ban = cột cùng tên ở PhongBan · Cố định = mã NV ở cột D · Hàng đợi = gửi email nhóm, ai nhận trước xử lý.'; vr['A2'].font = NOTE
VR_COLS = [('Mã vai trò', 10), ('Tên vai trò', 24), ('Loại tra cứu', 16), ('Cột PhongBan / mã NV cố định', 16),
           ('Email nhóm (hàng đợi)', 32), ('Máy lẻ nhóm', 9), ('Cấp kế tiếp (khi tự duyệt)', 13)]
header(vr, 4, VR_COLS)
VR0 = 5; VR1 = VR0 + len(ROLES) - 1
for i, ro in enumerate(ROLES):
    r = VR0 + i
    for j, v in enumerate(ro, 1):
        body(vr.cell(r, j, v or None), center=j in (1, 3, 4, 6, 7))
vr.freeze_panes = 'B5'
VRR = lambda col: f'VaiTro!${col}${VR0}:${col}$40'
dv = DataValidation(type='list', formula1='"Theo người gửi,Theo phòng ban,Cố định,Hàng đợi"'); vr.add_data_validation(dv); dv.add('C5:C40')

# =============================================================== Sheet MaTran
mt = wb.create_sheet('MaTran', 0)
MT = [('code', 'Mã dòng', 20), ('task', 'Mã task', 11), ('name', 'Tên việc', 28), ('group', 'Nhóm việc', 16),
      ('scope', 'Phạm vi áp dụng', 11), ('crit', 'Tiêu chí', 15), ('frm', 'Từ (≥)', 13),
      ('to', 'Đến (<)', 13), ('cat', 'Giá trị phân loại', 20), ('check', 'Kiểm tra', 9), ('appr', 'Phê duyệt', 9),
      ('co', 'Đồng phê duyệt', 10), ('deleg', 'Được ủy quyền', 9), ('proof', 'Minh chứng bắt buộc', 28),
      ('secret', 'Bảo mật', 8), ('sla', 'SLA (giờ)', 8), ('basis', 'Căn cứ', 38),
      ('note', 'Ghi chú', 34), ('chk', 'Kiểm tra dòng', 24)]
L = {k: get_column_letter(i) for i, (k, _, _) in enumerate(MT, 1)}
mt['A1'] = 'Ma trận phân quyền VinSmart Future (giả lập) · phiên bản v4 · hiệu lực 01/11/2026'; mt['A1'].font = TITLE
mt['A2'] = ('Khoảng [Từ, Đến): Từ tính vào, Đến không tính vào, Đến trống = không giới hạn. Phạm vi = "Tất cả" hoặc mã phòng ban; '
            'nếu phòng ban của người gửi có dòng riêng thì dùng dòng riêng, không thì dùng "Tất cả". Vai trò ghi bằng mã ở sheet VaiTro.')
mt['A2'].font = NOTE
header(mt, 4, [(h, w) for _, h, w in MT])
M0 = 5; M1 = M0 + len(rows) - 1
MTR = lambda k: f'MaTran!${L[k]}${M0}:${L[k]}${M1}'
block_id = {}
for n, row in enumerate(rows):
    r = M0 + n
    for j, (k, _, _) in enumerate(MT, 1):
        if k == 'chk': continue
        v = row[k]
        c = body(mt.cell(r, j, v if v not in (None, '') else None),
                 center=k in ('scope', 'check', 'appr', 'co', 'deleg', 'secret', 'sla'))
        if k in ('frm', 'to'): c.number_format = '#,##0.##'
    block_id.setdefault((row['task'], row['scope']), len(block_id))
    if block_id[(row['task'], row['scope'])] % 2:
        for j in range(1, len(MT)): mt.cell(r, j).fill = GREY
    if row['scope'] != ALL:
        mt[f'{L["scope"]}{r}'].font = Font(name=F, size=10, bold=True, color='9A4A00')
    g = lambda k, rr=r: f'{L[k]}{rr}'
    same_next = f'{L["task"]}{r + 1}={g("task")},{L["scope"]}{r + 1}={g("scope")}'
    f = (f'=IF(COUNTIF({MTR("code")},{g("code")})>1,"Trùng mã dòng",'
         f'IF(AND({g("scope")}<>"{ALL}",COUNTIF(PhongBan!$A${PB0}:$A$30,{g("scope")})=0),"Phạm vi không tồn tại",'
         f'IF(AND({g("frm")}<>"",{g("to")}<>"",{g("frm")}>={g("to")}),"Từ ≥ Đến",'
         f'IF(COUNTIF({VRR("A")},{g("appr")})=0,"Vai trò phê duyệt không tồn tại",'
         f'IF(AND({g("check")}<>"",COUNTIF({VRR("A")},{g("check")})=0),"Vai trò kiểm tra không tồn tại",'
         f'IF(AND({g("co")}<>"",COUNTIF({VRR("A")},{g("co")})=0),"Vai trò đồng duyệt không tồn tại",'
         f'IF(AND({same_next},{g("to")}<>"",{L["frm"]}{r + 1}<>{g("to")}),"Hở/chồng với mức kế tiếp",'
         f'IF(AND({same_next},{g("frm")}<>"",{g("to")}=""),"Mức không giới hạn chưa phải mức cuối","OK"))))))))')
    body(mt[f'{L["chk"]}{r}'], center=True).value = f
mt.freeze_panes = mt.cell(M0, 4)
mt.auto_filter.ref = f'A4:{L["chk"]}{M1}'
CK = f'{L["chk"]}{M0}:{L["chk"]}{M1}'
mt.conditional_formatting.add(CK, FormulaRule(formula=[f'{L["chk"]}{M0}<>"OK"'], font=Font(name=F, bold=True, color='C11D2A'), fill=PatternFill('solid', fgColor='FDE8E8')))
mt.conditional_formatting.add(CK, FormulaRule(formula=[f'{L["chk"]}{M0}="OK"'], font=Font(name=F, color='2E9E6A')))
mt.conditional_formatting.add(f'{L["secret"]}{M0}:{L["secret"]}{M1}', FormulaRule(formula=[f'{L["secret"]}{M0}="Có"'], font=Font(name=F, bold=True, color='C11D2A')))
for dvv, rng in ((DataValidation(type='list', formula1='"Có,Không"'), [f'{L["deleg"]}{M0}:{L["deleg"]}{M1 + 50}', f'{L["secret"]}{M0}:{L["secret"]}{M1 + 50}']),
                 (DataValidation(type='list', formula1='"Số tiền (VND),Số ngày,Số ngày trong tháng,Loại ngày,Mức độ,Hình thức,Phạm vi,Cấp bậc người gửi,Định biên,Không có"'), [f'{L["crit"]}{M0}:{L["crit"]}{M1 + 50}']),
                 (DataValidation(type='list', formula1=f'=VaiTro!$A${VR0}:$A$40', allow_blank=True), [f'{L["check"]}{M0}:{L["co"]}{M1 + 50}'])):
    mt.add_data_validation(dvv)
    for x in rng: dvv.add(x)
mt[f'{L["scope"]}4'].comment = Comment('"Tất cả" hoặc mã phòng ban ở sheet PhongBan. Dòng riêng phòng ban được ưu tiên hơn dòng chung.', 'HR Agent')
mt[f'{L["deleg"]}4'].comment = Comment('Có: người duyệt đang nghỉ phép thì gửi người ủy quyền ghi ở NhanSu.', 'HR Agent')
mt[f'{L["secret"]}4'].comment = Comment('Có: không gửi quản lý trực tiếp; bỏ qua người duyệt nếu họ là đối tượng của ticket.', 'HR Agent')

# =============================================================== Sheet ThuDinhTuyen
td = wb.create_sheet('ThuDinhTuyen', 1)
td.sheet_view.showGridLines = False
td['A1'] = 'Thử định tuyến: nhân viên gửi yêu cầu → ticket đến đúng người nào, liên hệ ra sao'; td['A1'].font = TITLE
td['A2'] = 'Nhập ở 5 cột nền vàng chữ xanh, kết quả ở các cột xanh lá. Các bước code tra cứu (cột F–Q) đang thu gọn: bấm dấu + trên đầu cột để mở khi cần giải thích.'; td['A2'].font = NOTE
TD = [('A', 'Yêu cầu (câu chat)', 30, 'in'), ('B', 'Người gửi (mã NV)', 10, 'in'), ('C', 'Mã task', 11, 'in'),
      ('D', 'Giá trị số', 13, 'in'), ('E', 'Giá trị phân loại', 14, 'in'),
      ('F', 'Người gửi', 16, 'st'), ('G', 'Phòng ban', 9, 'st'), ('H', 'Khớp dòng riêng PB', 8, 'st'),
      ('I', 'Khớp dòng chung', 8, 'st'), ('J', 'Mã dòng áp dụng', 19, 'st'), ('K', 'Vai trò phê duyệt', 9, 'st'),
      ('L', 'Mã NV theo ma trận', 9, 'st'), ('M', 'Vai trò sau kiểm tra tự duyệt', 10, 'st'), ('N', 'Mã NV sau tự duyệt', 9, 'st'),
      ('O', 'Mã NV nhận cuối (ủy quyền)', 10, 'st'), ('P', 'Mã NV kiểm tra', 9, 'st'), ('Q', 'Mã NV đồng duyệt', 9, 'st'),
      ('R', 'Người phê duyệt', 30, 'out'), ('S', 'Email', 25, 'out'), ('T', 'Máy lẻ · chat', 18, 'out'),
      ('U', 'Người kiểm tra (liên hệ)', 32, 'out'), ('V', 'Đồng phê duyệt (liên hệ)', 28, 'out'), ('W', 'SLA (giờ)', 7, 'out'),
      ('X', 'Bảo mật', 8, 'out'), ('Y', 'Minh chứng bắt buộc', 24, 'out'), ('Z', 'Kết luận', 42, 'out')]
td.merge_cells('A3:E3'); td.merge_cells('F3:Q3'); td.merge_cells('R3:Z3')
for rng, txt, fill in (('A3', 'NHẬP', H_FILL), ('F3', 'CÁC BƯỚC CODE TRA CỨU', STEP_FILL), ('R3', 'KẾT QUẢ GỬI TICKET', OUT_FILL)):
    c = td[rng]; c.value = txt; c.font = H_FONT; c.fill = fill; c.alignment = Alignment(horizontal='center')
for col, h, w, kind in TD:
    c = td[f'{col}4']; c.value = h; c.font = H_FONT; c.alignment = CENTER; c.border = B
    c.fill = {'in': H_FILL, 'st': STEP_FILL, 'out': OUT_FILL}[kind]
    td.column_dimensions[col].width = w
td.row_dimensions[4].height = 44

CASES = [
 ('Xin tạm ứng 15 triệu công tác phí Đà Nẵng', 'VSF101', 'FIN-TA-01', 15_000_000, None),
 ('Xin tạm ứng 15 triệu đi gặp khách hàng Đà Nẵng', 'VSF103', 'FIN-TA-01', 15_000_000, None),
 ('Tạm ứng 120 triệu đi hội thảo AWS re:Invent', 'VSF101', 'FIN-TA-01', 120_000_000, None),
 ('Xin nghỉ phép 2 ngày 20–21/11', 'VSF101', 'HR-LV-01', 2, None),
 ('Tôi (trưởng phòng) xin nghỉ phép 5 ngày', 'VSF010', 'HR-LV-01', 5, None),
 ('Xin nghỉ phép 5 ngày, đang trong lịch trực on-call', 'VSF104', 'HR-LV-01', 5, None),
 ('Đăng ký OT 4 tiếng ngày 2/9 xử lý sự cố production', 'VSF104', 'HR-OT-01', None, 'Ngày lễ'),
 ('Đăng ký OT 3 tiếng tối nay chạy chiến dịch', 'VSF105', 'HR-OT-01', None, 'Ngày thường'),
 ('Mua máy trạm GPU 120 triệu để train mô hình', 'VSF102', 'HR-EQ-01', 120_000_000, None),
 ('Phản ánh trưởng nhóm có lời lẽ xúc phạm', 'VSF105', 'HR-CP-01', None, 'Nghiêm trọng'),
 ('Giải trình công 4 ngày tháng 10', 'VSF101', 'HR-AT-01', 4, None),
 ('Xin nghỉ phép 0,25 ngày', 'VSF101', 'HR-LV-01', 0.25, None),
]

def match_expr(r):
    return (f'({MTR("task")}=$C{r})*((({MTR("crit")}="Không có"))'
            f'+(({MTR("frm")}<>"")*($D{r}<>"")*({MTR("frm")}<=$D{r})*((({MTR("to")}="")+({MTR("to")}>$D{r}))>0))'
            f'+(({MTR("cat")}<>"")*({MTR("cat")}=$E{r})))')
IDX = f'(ROW({MTR("code")})-{M0 - 1})'
def mtv(k, r):   # giá trị cột k của dòng ma trận áp dụng
    return f'INDEX({MTR(k)},MATCH($J{r},{MTR("code")},0))'
def vrv(col, role):
    return f'INDEX({VRR(col)},MATCH({role},{VRR("A")},0))'
def nsv(col, code):
    return f'INDEX({NSR(col)},MATCH({code},{NSR("A")},0))'
def resolve(role, r):
    """Mã NV giữ vai trò `role` (ô) với người gửi ở B và phòng ban ở G; hàng đợi trả ""."""
    t = vrv('C', role)
    return (f'IF({role}="","",IF({t}="Theo người gửi",{nsv("H", f"$B{r}")},'
            f'IF({t}="Theo phòng ban",INDEX(PhongBan!$A${PB0}:$I$30,MATCH($G{r},PhongBan!$A${PB0}:$A$30,0),'
            f'MATCH({vrv("D", role)},PhongBan!$A$4:$I$4,0)),IF({t}="Cố định",{vrv("D", role)},""))))')
def contact(code, role):
    return (f'IF({role}="","—",IF({code}="",{vrv("B", role)}&" · "&{vrv("E", role)},'
            f'{nsv("B", code)}&" · "&{nsv("E", code)}))')

for n, (q, who, task, num, cat) in enumerate(CASES):
    r = 5 + n
    for col, v in zip('ABCDE', (q, who, task, num, cat)):
        c = td[f'{col}{r}']; c.value = v; c.font = INPUT; c.fill = YELLOW; c.border = B; c.alignment = WRAP
    td[f'D{r}'].number_format = '#,##0.##'
    m = match_expr(r)
    F_ = {
     'F': f'=IFERROR({nsv("B", f"$B{r}")},"Không có mã NV")',
     'G': f'=IFERROR({nsv("D", f"$B{r}")},"")',
     'H': f'=SUMPRODUCT({m}*({MTR("scope")}=$G{r}))',
     'I': f'=SUMPRODUCT({m}*({MTR("scope")}="{ALL}"))',
     'J': (f'=IF(H{r}=1,INDEX({MTR("code")},SUMPRODUCT({m}*({MTR("scope")}=$G{r})*{IDX})),'
           f'IF(AND(H{r}=0,I{r}=1),INDEX({MTR("code")},SUMPRODUCT({m}*({MTR("scope")}="{ALL}")*{IDX})),""))'),
     'K': f'=IF(J{r}="","",{mtv("appr", r)})',
     'L': f'=IF(J{r}="","",{resolve(f"K{r}", r)})',
     'M': f'=IF(J{r}="","",IF(AND(L{r}<>"",L{r}=$B{r}),{vrv("G", f"K{r}")},K{r}))',
     'N': f'=IF(J{r}="","",{resolve(f"M{r}", r)})',
     'O': (f'=IF(N{r}="","",IF(AND({nsv("J", f"N{r}")}="Có",{mtv("deleg", r)}="Có",{nsv("K", f"N{r}")}<>""),'
           f'{nsv("K", f"N{r}")},N{r}))'),
     'P': f'=IF(J{r}="","",IF({mtv("check", r)}="","",{resolve(mtv("check", r), r)}))',
     'Q': f'=IF(J{r}="","",IF({mtv("co", r)}="","",{resolve(mtv("co", r), r)}))',
     'R': (f'=IF(J{r}="","",IF(O{r}="",{vrv("B", f"M{r}")}&" (hàng đợi nhóm)",'
           f'{nsv("B", f"O{r}")}&" – "&{nsv("C", f"O{r}")}&IF(O{r}<>N{r}," (ủy quyền thay "&{nsv("B", f"N{r}")}&")","")))'),
     'S': f'=IF(J{r}="","",IF(O{r}="",{vrv("E", f"M{r}")},{nsv("E", f"O{r}")}))',
     'T': f'=IF(J{r}="","",IF(O{r}="","Ext "&{vrv("F", f"M{r}")},"Ext "&{nsv("F", f"O{r}")}&" · "&{nsv("G", f"O{r}")}))',
     'U': f'=IF(J{r}="","",IF({mtv("check", r)}="","—",{contact(f"P{r}", mtv("check", r))}))',
     'V': f'=IF(J{r}="","",IF({mtv("co", r)}="","—",{contact(f"Q{r}", mtv("co", r))}))',
     'W': f'=IF(J{r}="","",{mtv("sla", r)})',
     'X': f'=IF(J{r}="","",{mtv("secret", r)})',
     'Y': f'=IF(J{r}="","",IF({mtv("proof", r)}="","—",{mtv("proof", r)}))',
     'Z': (f'=IF(G{r}="","Không tìm thấy người gửi",IF(AND(H{r}=0,I{r}=0),"Không khớp dòng nào → chuyển HR xử lý tay",'
           f'IF(OR(H{r}>1,AND(H{r}=0,I{r}>1)),"Khớp nhiều dòng → lỗi ma trận",'
           f'"Dòng "&J{r}&IF(H{r}=1," (riêng "&G{r}&")"," (chung)")'
           f'&IF(M{r}<>K{r}," · người gửi chính là người duyệt → lên "&{vrv("B", f"M{r}")},"")'
           f'&IF(AND(O{r}<>"",O{r}<>N{r})," · người duyệt nghỉ phép → gửi người ủy quyền","")'
           f'&IF(AND(O{r}<>"",O{r}=N{r},IFERROR({nsv("J", f"N{r}")},"")="Có")," · người duyệt đang nghỉ, chưa có ủy quyền → vẫn gửi, tính SLA","")'
           f'&IF(O{r}=""," · gửi hàng đợi nhóm",""))))'),
    }
    for col, f in F_.items():
        c = body(td[f'{col}{r}'], center=col in 'GHIKLMNOPQWX'); c.value = f
        if col in 'FGHIJKLMNOPQ': c.font = Font(name=F, size=9, color='4B5563')
TD1 = 4 + len(CASES)
td.conditional_formatting.add(f'Z5:Z{TD1}', FormulaRule(formula=['OR(H5+I5=0,H5>1,AND(H5=0,I5>1))'], font=Font(name=F, bold=True, color='C11D2A'), fill=PatternFill('solid', fgColor='FDE8E8')))
td.conditional_formatting.add(f'H5:H{TD1}', FormulaRule(formula=['H5=1'], font=Font(name=F, bold=True, color='9A4A00'), fill=PatternFill('solid', fgColor='FFF5E8')))
td.freeze_panes = 'C5'
td.column_dimensions.group('F', 'Q', hidden=True, outline_level=1)
td.sheet_properties.outlinePr.summaryRight = False
nr = TD1 + 2
for k, t in enumerate([
    'Ghi chú:',
    '• Hai dòng đầu cùng 15 triệu nhưng khác phòng ban: Backend dùng mức chung (Trưởng phòng), Kinh doanh DN có mức riêng nên Trưởng phòng KD duyệt.',
    '• Trần Quốc Bảo (VSF010) đang nghỉ phép 15–25/11 và ủy quyền cho Lê Thị Cúc: ticket gửi Trưởng phòng Backend sẽ đi tới Lê Thị Cúc.',
    '• Dòng VSF010 tự xin nghỉ 5 ngày: vai trò duyệt là Trưởng phòng = chính mình, nên lên Giám đốc khối (BR03).',
    '• DevOps (PM-OPS) có dòng riêng vì lịch trực on-call; Huỳnh Ngọc Trâm (VSF035) đang nghỉ mà không ủy quyền nên ticket vẫn gửi và tính SLA.',
    '• Dòng 0,25 ngày cố ý không khớp mức nào để thấy agent chuyển HR thay vì đoán. Thử đổi mã NV ở cột B để xem người duyệt đổi theo phòng ban.'
]):
    c = td.cell(nr + k, 1, t); c.font = Font(name=F, size=9, bold=(k == 0), color='374151')

# =============================================================== Sheet KiemTra
kt = wb.create_sheet('KiemTra')
kt.sheet_view.showGridLines = False
kt.column_dimensions['A'].width = 52; kt.column_dimensions['B'].width = 42
kt['A1'] = 'Kiểm tra trước khi cho ma trận hiệu lực (BR01)'; kt['A1'].font = TITLE
CKR = f'MaTran!${L["chk"]}${M0}:${L["chk"]}${M1}'
checks = [
 ('Tổng số dòng ma trận', f'=COUNTA({MTR("code")})'),
 ('Số loại việc (mã task)', f'=SUMPRODUCT(1/COUNTIF({MTR("task")},{MTR("task")}))'),
 ('Số dòng riêng theo phòng ban', f'=COUNTIF({MTR("scope")},"<>{ALL}")'),
 ('Trùng mã dòng', f'=COUNTIF({CKR},"Trùng mã dòng")'),
 ('Phạm vi (phòng ban) không tồn tại', f'=COUNTIF({CKR},"Phạm vi*")'),
 ('Từ ≥ Đến', f'=COUNTIF({CKR},"Từ ≥ Đến")'),
 ('Vai trò không tồn tại', f'=COUNTIF({CKR},"Vai trò*")'),
 ('Hở/chồng giữa các mức', f'=COUNTIF({CKR},"Hở/chồng*")'),
 ('Mức không giới hạn đặt sai chỗ', f'=COUNTIF({CKR},"Mức không giới hạn*")'),
 ('Phòng ban có TP/GDK/HRBP không có trong NhanSu',
  f'=SUMPRODUCT((COUNTIF({NSR("A")},PhongBan!$D${PB0}:$D${PB1})=0)+(COUNTIF({NSR("A")},PhongBan!$F${PB0}:$F${PB1})=0)+(COUNTIF({NSR("A")},PhongBan!$H${PB0}:$H${PB1})=0))'),
 ('Nhân sự có quản lý trực tiếp không tồn tại',
  f'=SUMPRODUCT((NhanSu!$H${NS0}:$H${NS1}<>"")*(COUNTIF({NSR("A")},NhanSu!$H${NS0}:$H${NS1})=0))'),
 ('Nhân sự thuộc phòng ban không tồn tại',
  f'=SUMPRODUCT((COUNTIF(PhongBan!$A${PB0}:$A${PB1},NhanSu!$D${NS0}:$D${NS1})=0)*1)'),
]
for i, (k, f) in enumerate(checks):
    a = kt.cell(3 + i, 1, k); a.font = BODY; a.border = B
    b = kt.cell(3 + i, 2, f); b.font = BODY; b.border = B; b.alignment = Alignment(horizontal='center')
    b.number_format = '0'
tot = 3 + len(checks); con = tot + 1
kt.cell(tot, 1, 'Tổng lỗi').font = Font(name=F, bold=True, size=10)
kt.cell(tot, 2, f'=SUM(B6:B{tot - 1})').font = Font(name=F, bold=True, size=10)
kt.cell(con, 1, 'Kết luận').font = Font(name=F, bold=True, size=10)
kt.cell(con, 2, f'=IF(B{tot}=0,"Hợp lệ: được dùng làm ma trận hiệu lực","Có lỗi: chưa được dùng")').font = Font(name=F, bold=True, size=10)
for rr in (tot, con):
    for cc in (1, 2): kt.cell(rr, cc).border = B
    kt.cell(rr, 2).alignment = Alignment(horizontal='center')
kt.conditional_formatting.add(f'B{tot}', FormulaRule(formula=[f'B{tot}>0'], font=Font(name=F, bold=True, color='C11D2A')))
kt.conditional_formatting.add(f'B{con}', FormulaRule(formula=[f'B{tot}=0'], font=Font(name=F, bold=True, color='2E9E6A')))
kt.cell(con + 2, 1, f'Thử: sửa ô {L["to"]}5 của MaTran (Đến của HR-LV-01-L1) thành 2 để thấy lỗi "Hở/chồng".').font = NOTE

# =============================================================== Sheet PhienBan
pv = wb.create_sheet('PhienBan')
pv['A1'] = 'Lịch sử phiên bản ma trận'; pv['A1'].font = TITLE
header(pv, 3, [('Phiên bản', 10), ('Hiệu lực từ', 13), ('Người duyệt', 20), ('Thay đổi', 90)])
for n, h in enumerate([
    ('v1', dt.date(2026, 6, 1), 'Hoàng Thị Lan', 'Bản đầu: nghỉ phép, OT, giải trình công, tạm ứng (2 mức)'),
    ('v2', dt.date(2026, 9, 1), 'Hoàng Thị Lan', 'Thêm khiếu nại, kỷ luật, chi phí đào tạo; thêm cột Bảo mật'),
    ('v3', dt.date(2026, 10, 1), 'Hoàng Thị Lan', 'Tạm ứng tách 4 mức; thêm điều chuyển, thôi việc, tuyển bổ sung; giải trình từ 3 ngày/tháng cần Trưởng phòng xác nhận'),
    ('v4', dt.date(2026, 11, 1), 'Hoàng Thị Lan', f'Thêm cột Phạm vi áp dụng và {n_scope} dòng riêng cho DevOps (phép, OT on-call), Kinh doanh DN (tạm ứng), AI ứng dụng (máy GPU)')]):
    for j, v in enumerate(h, 1):
        c = body(pv.cell(4 + n, j, v));
        if j == 2: c.number_format = 'dd/mm/yyyy'

# =============================================================== Sheet HuongDan
hd = wb.create_sheet('HuongDan', 0)
hd.sheet_view.showGridLines = False
hd.column_dimensions['A'].width = 3; hd.column_dimensions['B'].width = 24; hd.column_dimensions['C'].width = 110
hd['B2'] = 'Ma trận phân quyền mẫu cho HR Agent · VinSmart Future'; hd['B2'].font = Font(name=F, bold=True, size=16, color=NAVY)
hd['B3'] = ('Dữ liệu giả lập để demo, không phải số liệu thật của công ty. Tên người, email, máy lẻ, quy chế "(giả lập)" và ngưỡng tiền là hư cấu; '
            'điều luật trích dẫn chỉ để minh họa, cần HR/pháp chế xác nhận.'); hd['B3'].font = NOTE
info = [
 ('Mục đích', 'HR Agent dùng file này để biết ticket phải gửi cho AI CỤ THỂ, kèm email/máy lẻ. AI chỉ trích loại việc và giá trị từ câu chat; CODE tra MaTran → vai trò → người (NhanSu, PhongBan) → ủy quyền.'),
 ('Thứ tự tra cứu', '1) Phòng ban của người gửi (NhanSu)  2) Dòng ma trận: ưu tiên dòng riêng của phòng ban, không có thì dòng "Tất cả"  3) Vai trò → người: theo người gửi / theo phòng ban / cố định / hàng đợi  4) Người duyệt là người gửi → lên cấp kế tiếp (BR03)  5) Người duyệt nghỉ phép và dòng cho ủy quyền → người ủy quyền (BR05)  6) Lấy email, máy lẻ, tài khoản chat.'),
 ('MaTran', f'{len(rows)} dòng, trong đó {n_scope} dòng riêng theo phòng ban. Cùng mã task + phạm vi thì các mức nối nhau theo khoảng [Từ, Đến). Cột cuối là công thức tự kiểm tra từng dòng.'),
 ('ThuDinhTuyen', f'{len(CASES)} tình huống: nhập người gửi (mã NV), mã task, giá trị → ra người phê duyệt, email, máy lẻ, người kiểm tra, đồng duyệt, SLA, kết luận. Các bước tra cứu trung gian đang thu gọn.'),
 ('NhanSu', f'{len(PEOPLE)} người: phòng ban, email, máy lẻ, tài khoản chat, quản lý trực tiếp, đang nghỉ phép, người ủy quyền. Thay cho HRM khi demo.'),
 ('PhongBan', f'{len(DEPTS)} phòng ban thuộc Ban điều hành và 4 khối (Phần mềm, AI & Dữ liệu, Kinh doanh, Hỗ trợ); ai là Trưởng phòng, Giám đốc khối, HRBP của từng phòng.'),
 ('VaiTro', f'{len(ROLES)} vai trò và cách tra ra người; vai trò hàng đợi có email nhóm và máy lẻ nhóm.'),
 ('KiemTra', 'Tổng hợp lỗi (BR01): trùng mã, phạm vi không tồn tại, hở/chồng, vai trò sai, phòng ban hoặc quản lý trỏ tới người không tồn tại. Chỉ dùng ma trận khi tổng lỗi = 0.'),
 ('PhienBan', 'Lịch sử phiên bản; ticket lưu phiên bản lúc gửi để người nhận so với bản đang hiệu lực.'),
 ('Ô được sửa', 'MaTran, NhanSu, PhongBan, VaiTro: các cột dữ liệu (không sửa cột công thức: Kiểm tra dòng, tên tra cứu). ThuDinhTuyen: chỉ ô nền vàng chữ xanh.'),
]
r = 5
for k, v in info:
    hd.cell(r, 2, k).font = Font(name=F, bold=True, size=10)
    c = hd.cell(r, 3, v); c.font = BODY; c.alignment = WRAP
    hd.row_dimensions[r].height = 44 if len(v) > 200 else 30
    r += 1
c = hd.cell(r + 1, 3, 'Nền vàng, chữ xanh = ô nhập để thử'); c.font = INPUT; c.fill = YELLOW
hd.cell(r + 2, 3, 'Chữ đen = dữ liệu hoặc công thức').font = BODY

# thứ tự sheet + màu tab
order = ['HuongDan', 'MaTran', 'ThuDinhTuyen', 'NhanSu', 'PhongBan', 'VaiTro', 'KiemTra', 'PhienBan']
wb._sheets = [wb[n] for n in order]
colors = ['3F48A6', 'EFAA75', '9CCF96', '8EB8E8', 'A4ACEC', 'C6A3E0', 'E8948C', '9CA3AF']
for n, col in zip(order, colors): wb[n].sheet_properties.tabColor = col
wb.active = 1
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print('rows', len(rows), 'scoped', n_scope, 'people', len(PEOPLE), 'cases', len(CASES), 'M', M0, M1, 'cols', L)
