# HR Agent: User story và tiêu chí nghiệm thu

> Nguồn: [hr-agent-specs.md](hr-agent-specs.md) (mã F, BR ghi theo file này).
> Nguyên tắc: AI hiểu câu chat, trích thông tin, tóm tắt. Code tra ma trận và kiểm quyền. Con người xác nhận và duyệt; agent không tự duyệt, không tự chuyển ticket.

| Vai trò | Là ai |
|---|---|
| Nhân viên | Người gửi yêu cầu qua bot trong app chat |
| Người duyệt | Người nhận ticket theo ma trận: quản lý trực tiếp, trưởng phòng, giám đốc khối, HRBP… |
| Quản lý | Người dùng tóm tắt chat và thống kê cho team mình |
| HR quản trị | Người nhập và quản lý ma trận phân quyền |
| Admin nhóm chat | Người quản lý một nhóm chat |

---

## A. Tác vụ nhân viên

### A1. Hỏi chính sách (F01)

**US-A1.1 · Hỏi chính sách có trích dẫn**
Là nhân viên, tôi muốn hỏi chính sách bằng tiếng Việt tự nhiên, để có câu trả lời ngay mà không phải chờ HR.
- Khi tôi hỏi, thì bot trả lời ngắn dựa trên quy chế nội bộ và Bộ luật Lao động, kèm tên văn bản và điều khoản.
- Cho câu hỏi không tìm được căn cứ, thì bot nói "chưa đủ thông tin" và đề xuất chuyển HR, không tự bịa.

**US-A1.2 · Từ câu hỏi sang tạo yêu cầu** (phụ thuộc US-A1.1)
Là nhân viên, tôi muốn được gợi ý tạo yêu cầu ngay sau khi hỏi, để không phải bắt đầu lại.
- Cho câu hỏi gắn với một loại việc có trong ma trận (ví dụ "tạm ứng công tác phí thế nào?"), thì bot trả lời và hiện nút "Tạo yêu cầu".

### A2. Giải trình công (F02)

**US-A2.1 · Giải trình công qua chat**
Là nhân viên, tôi muốn báo ngày thiếu công bằng một câu chat, để công được ghi đủ.
- Khi tôi nêu ngày, thì bot đối chiếu log chấm công; nếu ngày đó không thiếu công, thì bot báo không cần giải trình.
- Bot hỏi lý do và cho đính kèm minh chứng (lịch họp, log hệ thống, xác nhận của quản lý).

**US-A2.2 · Xác nhận và duyệt giải trình** (phụ thuộc US-A2.1, US-B2.1)
Là nhân viên, tôi muốn giải trình đi đúng người xác nhận và Thanh tra, để được xử lý trước kỳ chốt lương.
- Người xác nhận lấy theo ma trận: quản lý trực tiếp; từ 3 ngày/tháng trở lên là trưởng phòng.
- Sau khi có xác nhận, thì ticket vào hàng đợi Thanh tra; được duyệt thì công ghi đủ, bị từ chối thì tôi nhận lý do.

### A3. Đăng ký OT (F03)

**US-A3.1 · Đăng ký OT bằng một câu chat**
Là nhân viên, tôi muốn đăng ký OT kiểu "OT 3 tiếng tối nay cho dự án X", để không phải điền biểu mẫu.
- AI trích ngày, giờ, loại ngày (thường / cuối tuần / lễ), dự án; bot hiện thẻ để tôi kiểm tra trước khi gửi.
- Người duyệt lấy theo ma trận (US-B2.1); riêng DevOps có mức riêng cho OT xử lý sự cố.

**US-A3.2 · Chặn đăng ký vượt hạn mức** (phụ thuộc US-A3.1)
Là nhân viên, tôi muốn biết ngay khi đăng ký vượt hạn mức, để không gửi đơn sai.
- Code kiểm tra giờ OT tích lũy theo tháng và năm (40 giờ/tháng, 200 giờ/năm, 300 giờ với dự án được phép).
- Cho đăng ký vượt hạn mức, thì bot chặn và nêu hạn mức bị vượt, số giờ đã dùng.

### A4. Nghỉ phép (F04)

**US-A4.1 · Xin nghỉ phép qua chat**
Là nhân viên, tôi muốn xin nghỉ bằng chat, để gửi đơn nhanh.
- Khi tôi nêu ngày nghỉ, thì bot kiểm tra số dư phép và hiện thẻ xác nhận: số ngày, số dư sau khi nghỉ, người duyệt.
- Khi gửi, thì số ngày xin nghỉ được tạm giữ trong số dư cho đến khi đơn được duyệt hoặc bị từ chối.

**US-A4.2 · Không đủ phép** (phụ thuộc US-A4.1)
Là nhân viên, tôi muốn biết khi không đủ phép, để chọn cách khác.
- Cho số ngày xin vượt số dư, thì bot báo số dư hiện có và gợi ý tách phần thiếu sang nghỉ không hưởng lương.

### A5. Theo dõi đơn và SLA (F05)

**US-A5.1 · Xem trạng thái đơn**
Là nhân viên, tôi muốn hỏi "đơn của tôi đến đâu rồi", để biết đang chờ ai.
- Bot liệt kê các đơn đang mở: loại việc, người đang giữ, thời gian còn lại theo SLA.

**US-A5.2 · Nhắc và leo thang khi quá hạn**
Là nhân viên, tôi muốn đơn không bị bỏ quên, để được xử lý đúng hạn.
- Trước khi hết SLA, thì bot nhắc người duyệt; quá SLA, thì báo cấp kế tiếp và báo tôi.
- Quá hạn chỉ nhắc và leo thang, không tự duyệt.

---

## B. Định tuyến theo thẩm quyền

### B1. Quản lý ma trận phân quyền (F06)

**US-B1.1 · Nhập ma trận từ Excel**
Là HR quản trị, tôi muốn nhập ma trận phân quyền từ file Excel, để agent dùng đúng quy định mới nhất.
- Hệ thống chặn file có lỗi: trùng mã dòng, khoảng mức hở hoặc chồng nhau, vai trò hoặc phòng ban không tồn tại; liệt kê từng dòng lỗi (BR01).
- Cho file hợp lệ, thì hệ thống tạo phiên bản mới có ngày hiệu lực.

**US-B1.2 · Xem phiên bản ma trận** (phụ thuộc US-B1.1)
Là HR quản trị, tôi muốn xem các phiên bản cũ, để truy vết ticket gửi theo bản nào.
- Mỗi ticket lưu mã task, phiên bản ma trận và lý do chọn người duyệt (BR02).

### B2. Gửi ticket đúng người (F07)

**US-B2.1 · Agent tìm đúng người duyệt** (phụ thuộc US-B1.1)
Là nhân viên, tôi muốn agent tìm đúng người có thẩm quyền, để không gửi nhầm và không phải hỏi ai duyệt.
- AI trích loại việc và giá trị (số tiền, số ngày, mức độ). Code tra dòng ma trận, ưu tiên dòng riêng của phòng ban tôi, rồi tra ra người cụ thể trong HRM.
- Thẻ xác nhận hiện người phê duyệt (tên, chức danh), người kiểm tra, đồng phê duyệt, SLA, minh chứng cần nộp và lý do chọn (dòng ma trận, căn cứ). Tôi bấm gửi mới tạo ticket.
- Cho thiếu giá trị mà dòng ma trận cần, thì bot hỏi lại, không đoán. Cho không khớp dòng nào, thì bot báo và chuyển HR xử lý tay.

**US-B2.2 · Xử lý các trường hợp đặc biệt khi chọn người** (phụ thuộc US-B2.1)
Là nhân viên, tôi muốn ticket vẫn đi đúng người khi người duyệt không thể duyệt, để không bị kẹt.
- Người duyệt chính là tôi, thì lên cấp kế tiếp (BR03).
- Người duyệt đang nghỉ phép và dòng ma trận cho ủy quyền, thì gửi người được ủy quyền; người này cũng vắng, thì lên cấp kế tiếp (BR05).
- Thẻ xác nhận ghi rõ vì sao không gửi người duyệt gốc.

**US-B2.3 · Gửi khi thiếu minh chứng** (phụ thuộc US-B2.1)
Là nhân viên, tôi muốn vẫn gửi được khi chưa đủ giấy tờ, để không chậm việc.
- Ticket thiếu minh chứng bắt buộc vẫn gửi được nhưng gắn nhãn "Thiếu minh chứng" (BR08).

### B3. Kiểm tra thẩm quyền phía người nhận (F08)

**US-B3.1 · Kiểm tra mình có đúng thẩm quyền** (phụ thuộc US-B2.1)
Là người duyệt, tôi muốn biết ticket có thuộc thẩm quyền của mình không, để không duyệt vượt quyền.
- Khi mở ticket, thì panel so giá trị ticket với ngưỡng của ma trận đang hiệu lực và báo: "Đúng thẩm quyền", "Vượt thẩm quyền" hoặc "Ma trận đã đổi từ lúc gửi".
- Cho ticket không đúng thẩm quyền, thì agent đề xuất người đúng; tôi bấm "Chuyển" mới chuyển, và lần chuyển được ghi lịch sử (BR07).

**US-B3.2 · Xem gói căn cứ và minh chứng** (phụ thuộc US-B3.1)
Là người duyệt, tôi muốn có sẵn căn cứ và minh chứng ngay trong ticket, để quyết định nhanh mà không phải tự đi tìm.
- Panel hiện căn cứ (quy chế, điều khoản) và danh sách minh chứng bắt buộc: đã nộp / còn thiếu.
- AI đọc minh chứng và chỉ chỗ lệch, ví dụ hóa đơn 18 triệu nhưng ticket ghi 15 triệu; tôi vẫn là người quyết định.

### B4. Loại việc có tiền và mức độ (F09)

**US-B4.1 · Tạm ứng công tác phí theo số tiền**
Là nhân viên, tôi muốn xin tạm ứng bằng một câu chat, để ticket đến đúng cấp theo số tiền.
- Số tiền quyết định cấp duyệt theo ma trận; Kế toán là người kiểm tra.
- Cùng số tiền nhưng phòng ban có mức riêng (ví dụ Kinh doanh DN), thì dùng mức riêng.

**US-B4.2 · Gửi khiếu nại bảo mật**
Là nhân viên, tôi muốn gửi khiếu nại mà không lộ cho người bị khiếu nại, để yên tâm phản ánh.
- AI đề xuất mức độ (thấp / trung bình / nghiêm trọng) kèm lý do; tôi xác nhận hoặc sửa. HR được phân loại lại sau khi nhận (BR06).
- Nội dung không gửi cho quản lý trực tiếp; nếu người duyệt là người bị khiếu nại, thì bỏ qua người đó và lên cấp kế tiếp (BR04).

**US-B4.3 · Đề xuất kỷ luật**
Là quản lý, tôi muốn gửi đề xuất kỷ luật, để đến đúng cấp quyết định theo hình thức kỷ luật.
- Hình thức kỷ luật quyết định cấp duyệt; sa thải cần thêm Hội đồng kỷ luật đồng phê duyệt.
- Ticket bảo mật, không được ủy quyền, bắt buộc có biên bản vi phạm.

---

## C. Trợ lý đọc nhanh (chỉ người gõ lệnh thấy)

### C1. Tóm tắt đoạn chat nhóm (F10)

**US-C1.1 · Tóm tắt bằng lệnh**
Là quản lý, tôi muốn gõ `/tomtat` trong nhóm chat dài, để đọc một lượt mà không sót tin quan trọng.
- Kết quả chỉ mình tôi thấy; người khác trong nhóm không thấy lệnh hay kết quả.
- Đầu bản tóm tắt ghi số tin, khoảng thời gian, số tin bị bỏ qua (BR14).
- Cho đoạn chat trên 500 tin, thì bot yêu cầu thu hẹp khoảng thời gian.

**US-C1.2 · Gợi ý tóm tắt khi nhiều tin chưa đọc**
Là quản lý, tôi muốn có nút "Tóm tắt N tin chưa đọc", để không phải nhớ gõ lệnh.
- Nút hiện khi nhóm có từ 30 tin chưa đọc trở lên; chỉ đọc khi tôi bấm (BR09).

**US-C1.3 · Xem lại bản tóm tắt** (phụ thuộc US-C1.1)
Là quản lý, tôi muốn xem lại các bản tóm tắt gần đây, để không phải tóm tắt lại.
- Lịch sử chỉ của riêng tôi, giữ 7 ngày; không lưu tin gốc (BR11).

### C2. Tóm tắt một tin dài (F11)

**US-C2.1 · Tóm tắt một tin dài**
Là nhân viên, tôi muốn tóm tắt một tin nhắn dài (thông báo, biên bản), để nắm ý chính nhanh.
- Khi tôi chọn tin và bấm "Tóm tắt", thì bot trả về các ý chính, chỉ mình tôi thấy.
- Thuật ngữ tiếng Anh và viết tắt được giữ nguyên.

### C3. Phân loại và mức khẩn (F12)

**US-C3.1 · Phân loại và chấm mức khẩn từng ý** (phụ thuộc US-C1.1)
Là quản lý, tôi muốn biết ý nào cần xử lý trước, để ưu tiên đúng việc.
- Mỗi ý có loại (quyết định, việc cần làm, câu hỏi chưa trả lời, nhắc đến bạn, sự cố / thông báo), mức khẩn và lý do chấm mức.
- Có mức khẩn chung cho cả đoạn; ý khẩn và ý nhắc đến tôi xếp lên đầu.

**US-C3.2 · Mở tin gốc để kiểm tra** (phụ thuộc US-C3.1)
Là quản lý, tôi muốn bấm vào từng ý để xem tin gốc, để tự kiểm tra AI tóm tắt đúng không.
- Mỗi ý có link về ít nhất một tin gốc; ý không có tin gốc thì không hiển thị (BR13).
- Tin gốc đã bị sửa hoặc xóa, thì link báo "tin đã thay đổi".

### C4. Quyền riêng tư nhóm chat (F13)

**US-C4.1 · Tắt tóm tắt cho nhóm nhạy cảm**
Là admin nhóm chat, tôi muốn tắt tóm tắt cho nhóm, để nội dung nhạy cảm không bị đưa vào AI.
- Khi nhóm đã tắt, thì lệnh và nút tóm tắt báo "nhóm đã tắt tóm tắt" (BR12).
- Bot chỉ đọc nhóm mà người gõ là thành viên và chỉ những tin người đó được xem (BR10).

---

## D. Thống kê bằng lời (F14)

**US-D1.1 · Hỏi số liệu bằng câu chat**
Là quản lý, tôi muốn hỏi kiểu "OT team tôi tháng 10 thế nào?", để có số liệu mà không phải mở báo cáo.
- Bot trả về bảng, biểu đồ và 2–3 dòng nhận xét; mọi con số lấy từ kết quả truy vấn, không do AI tự nói.
- Có link "Xem chi tiết" sang web HR để lọc tiếp.

**US-D1.2 · Chỉ thấy số liệu trong phạm vi quyền** (phụ thuộc US-D1.1)
Là quản lý, tôi muốn số liệu tự lọc theo team tôi quản lý, để không thấy dữ liệu của người khác.
- Nhân viên chỉ xem số liệu của chính mình; quản lý xem team mình quản lý.
- Cho câu hỏi ngoài phạm vi quyền, thì bot báo không có quyền, không trả số liệu một phần (BR17).

**US-D1.3 · Câu hỏi ngoài danh mục chỉ số** (phụ thuộc US-D1.1)
Là quản lý, tôi muốn biết khi bot chưa hỗ trợ câu hỏi, để không nhận số liệu sai.
- AI chỉ chọn trong danh mục chỉ số có sẵn: phép, OT, công, ticket và SLA (BR16).
- Cho câu hỏi ngoài danh mục, thì bot nói chưa hỗ trợ và gợi ý các chỉ số gần nhất.
