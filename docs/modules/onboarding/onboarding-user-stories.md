# AI Onboarding: User story và tiêu chí nghiệm thu

> Nguồn: [onboarding-specs.md](onboarding-specs.md) (mã F, BR ghi theo file này).
> Nguyên tắc: code sinh checklist, tính hạn, nhắc và tính %. AI đọc giấy tờ, đối chiếu và trao đổi với nhân viên. HR quyết định từng mục; AI không bao giờ từ chối hồ sơ.

| Vai trò | Là ai |
|---|---|
| Nhân viên mới | Ứng viên đã nhận offer; trước ngày đầu chỉ có email cá nhân |
| HR onboarding | Người phụ trách hồ sơ của nhân viên mới |

---

## A. Checklist và tiến độ

### A1. Checklist riêng từng người (F01)

**US-A1.1 · HR gửi lời mời với checklist riêng**
Là HR onboarding, tôi muốn có sẵn checklist đúng với từng nhân viên mới, để không phải soạn tay cho từng người.
- Khi tôi xác nhận tiếp nhận một ứng viên đã nhận offer, thì hệ thống sinh checklist theo loại hợp đồng và vị trí, chia đợt 1 và đợt 2 và tính sẵn hạn (BR01, BR02).
- Tôi thêm hoặc bớt mục được trước khi bấm "Gửi lời mời".

**US-A1.2 · Trợ lý hỏi để bật mục "nếu có"** (phụ thuộc US-B2.1)
Là nhân viên mới, tôi muốn chỉ thấy những giấy tờ áp dụng với mình, để không phải đoán mục nào cần nộp.
- Lần đầu vào cổng, trợ lý hỏi vài câu ngắn (có người phụ thuộc không, đã có mã BHXH chưa, có quyết định nghỉ việc ở công ty cũ không); câu trả lời bật hoặc tắt các mục "nếu có".
- Tôi đổi được câu trả lời sau đó; checklist cập nhật theo.

### A2. Tiến độ (F02)

**US-A2.1 · Xem tiến độ và trạng thái từng mục** (phụ thuộc US-A1.1)
Là nhân viên mới, tôi muốn thấy mình đã xong bao nhiêu và còn thiếu gì, để nộp cho kịp hạn.
- Cổng hiện % hoàn tất của từng đợt, hạn của đợt và trạng thái từng mục: chưa nộp, đang kiểm, cần nộp lại, cần giải thích, chờ HR, đã duyệt online, hoàn tất.
- Có thêm số mục đã xong phần của tôi (chờ HR, đã duyệt online hoặc hoàn tất), để tôi biết mình không còn phải làm gì.
- Mục cần bản giấy chỉ tính hoàn tất sau khi HR tick "đã nhận" vào ngày đầu (BR06).

**US-A2.2 · HR theo dõi tất cả nhân viên mới**
Là HR onboarding, tôi muốn xem tiến độ của mọi nhân viên mới tôi phụ trách, để biết ai cần hỗ trợ.
- Danh sách có % từng đợt, số mục chờ tôi duyệt, số ngày còn lại đến hạn; người quá hạn được đưa lên đầu.

---

## B. Kênh trao đổi

### B1. Email mời và nhắc (F03)

**US-B1.1 · Nhận email mời** (phụ thuộc US-A1.1)
Là nhân viên mới, tôi muốn nhận email nói rõ cần chuẩn bị gì, để bắt đầu nộp ngay.
- Email có lời chào, ngày bắt đầu đi làm, danh sách mục đợt 1 kèm hạn, và link vào cổng.
- Email không chứa dữ liệu cá nhân (BR08).

**US-B1.2 · Nhận email nhắc đúng mục còn thiếu** (phụ thuộc US-B1.1)
Là nhân viên mới, tôi muốn được nhắc đúng những gì còn thiếu, để không phải tự đối chiếu lại.
- Code gửi nhắc 3 ngày một lần và một lần 1 ngày trước hạn; AI viết nội dung gồm % tiến độ, các mục còn thiếu và lý do chung, ví dụ "ảnh bằng chưa đọc được".
- Không còn mục bắt buộc nào chờ tôi làm thì dừng nhắc, kể cả khi mục còn chờ HR hoặc chờ bản giấy ngày đầu (BR07).

**US-B1.3 · HR được báo khi quá hạn** (phụ thuộc US-B1.2)
Là HR onboarding, tôi muốn biết ngay ai quá hạn, để gia hạn hoặc gọi trực tiếp.
- Ngày sau hạn mà nhân viên vẫn còn mục chưa làm, hệ thống báo HR phụ trách, không gửi nhân viên.
- Tôi gia hạn được cho từng đợt; ngày bắt đầu đi làm đổi thì hạn tự tính lại (BR11).
- Email mời bị trả về thì báo tôi ngay.

### B2. Cổng web có trợ lý chat (F04)

**US-B2.1 · Vào cổng bằng link và OTP** (phụ thuộc US-B1.1)
Là nhân viên mới, tôi muốn vào cổng mà không phải tạo tài khoản, để bắt đầu nhanh.
- Bấm link trong email, nhập mã OTP gửi về email cá nhân là vào được (BR03).
- Link hết hạn khi hồ sơ hoàn tất hoặc sau 60 ngày; cổng dùng tốt trên điện thoại.

**US-B2.2 · Nộp giấy tờ ngay trong chat** (phụ thuộc US-B2.1)
Là nhân viên mới, tôi muốn chụp và gửi giấy tờ như nhắn tin, để không phải tìm đúng ô tải lên.
- Tôi gửi ảnh hoặc PDF, một hay nhiều file một lúc; trợ lý tự xếp vào đúng mục (US-C1.1).
- Nộp lại một mục thì bản mới được dùng để duyệt, bản cũ chỉ lưu trong lịch sử.

**US-B2.3 · Hỏi về giấy tờ** (phụ thuộc US-B2.1)
Là nhân viên mới, tôi muốn hỏi kiểu "chưa có bằng chính thức thì nộp gì?", để không phải email HR rồi chờ.
- Trợ lý trả lời theo hướng dẫn hồ sơ của công ty và trích phần hướng dẫn liên quan.
- Câu hỏi ngoài hồ sơ onboarding, hoặc không có trong hướng dẫn, thì trợ lý đưa thông tin HR phụ trách, không tự trả lời (BR12).

### B3. Nộp tiếp sau ngày đầu (F05)

**US-B3.1 · Nộp đợt 2 qua bot HR trong app chat**
Là nhân viên mới đã đi làm, tôi muốn nộp các mục đợt 2 ngay trong app chat công ty, để không phải quay lại cổng cũ.
- Từ ngày đầu, bot HR hiện checklist đợt 2 cùng trạng thái hiện tại; nộp và kiểm tra giống trên cổng.
- Email chỉ báo một lần về việc chuyển kênh.

---

## C. AI kiểm tra giấy tờ

### C1. Nhận loại giấy và kiểm ảnh (F06)

**US-C1.1 · Biết ngay file có dùng được không** (phụ thuộc US-B2.2)
Là nhân viên mới, tôi muốn biết ngay ảnh có đạt không, để chụp lại khi vẫn đang cầm giấy.
- Code kiểm định dạng (ảnh hoặc PDF), dung lượng tối đa 10 MB và không trùng file đã nộp.
- AI nhận loại giấy và mục tương ứng; kiểm ảnh rõ, đủ mặt, đủ trang, còn hạn so với ngày bắt đầu đi làm.
- Có lỗi thì trợ lý nói rõ lỗi và cách chụp lại, mục chuyển sang "Cần nộp lại"; phản hồi trong ≤ 20 giây.

**US-C1.2 · File chứa nhiều giấy hoặc không đúng mục** (phụ thuộc US-C1.1)
Là nhân viên mới, tôi muốn nộp gộp mà vẫn được xếp đúng, để đỡ chụp nhiều lần.
- Ảnh hoặc PDF có nhiều giấy thì AI tách theo từng giấy; tách không được thì yêu cầu chụp riêng.
- Giấy không thuộc mục nào thì trợ lý hỏi tôi định nộp cho mục nào; không khớp thì không lưu.

### C2. Trích thông tin (F07)

**US-C2.1 · Xác nhận thông tin AI đọc được** (phụ thuộc US-C1.1)
Là nhân viên mới, tôi muốn kiểm tra thông tin AI đọc từ giấy tờ trước khi hệ thống đối chiếu, để AI đọc sai không làm hồ sơ của tôi bị báo lệch hay ghi sai.
- CCCD gắn chip thì hệ thống đọc mã QR; AI chỉ đọc khi QR mờ.
- Trợ lý hiện ảnh cạnh các trường đã đọc (họ tên, số CCCD, ngày sinh, trường, ngành, số tài khoản…), tô vàng trường AI không chắc, để tôi xác nhận hoặc sửa.
- Số CCCD, ngày sinh, số tài khoản và mã BHXH phải bấm xác nhận từng trường.
- Trường tôi sửa khác với AI đọc được thì được đánh dấu cho HR thấy (BR10).
- Giấy khám sức khỏe và giấy tờ người phụ thuộc không được trích nội dung (BR09).

### C3. Đối chiếu chéo (F08)

**US-C3.1 · Giải thích khi thông tin lệch nhau** (phụ thuộc US-C2.1)
Là nhân viên mới, tôi muốn được hỏi khi giấy tờ lệch nhau, thay vì bị từ chối, để có cơ hội giải thích.
- Code so họ tên (bỏ dấu, viết hoa), ngày sinh, số CCCD giữa các giấy và với offer; AI so trường, ngành với CV khi cách viết khác nhau.
- Đối chiếu chạy trên dữ liệu tôi đã xác nhận (BR13).
- Lệch thì trợ lý chỉ rõ chỗ lệch và hỏi trước "mình đọc sai, hay giấy ghi đúng như vậy?". AI đọc sai thì tôi sửa và hệ thống đối chiếu lại, không gắn cờ.
- Giấy ghi đúng như vậy thì tôi giải thích hoặc nộp giấy bổ sung, rồi mục chuyển sang "Chờ HR" kèm cờ (BR05).
- AI không bao giờ từ chối và không kết luận giấy tờ giả (BR04).

---

## D. HR duyệt và ghi HRM

### D1. Duyệt từng mục (F09)

**US-D1.1 · Duyệt với đủ thông tin trên một màn** (phụ thuộc US-C2.1)
Là HR onboarding, tôi muốn thấy ảnh gốc, dữ liệu trích và cờ trên cùng một màn, để duyệt nhanh mà không phải mở nhiều chỗ.
- Mỗi mục hiện ảnh gốc cạnh dữ liệu trích; trường nhân viên đã sửa ghi cả giá trị AI đọc và giá trị nhân viên sửa.
- Mục có cờ hiện chỗ lệch, lời giải thích và giấy bổ sung của nhân viên.

**US-D1.2 · Duyệt hoặc yêu cầu bổ sung** (phụ thuộc US-D1.1)
Là HR onboarding, tôi muốn duyệt hoặc yêu cầu bổ sung từng mục, để hồ sơ đúng mà không phải làm lại từ đầu.
- Duyệt thì mục sang "Đã duyệt online"; mục không cần bản giấy thì Hoàn tất luôn.
- Yêu cầu bổ sung thì tôi ghi lý do; mục chuyển sang "Cần nộp lại", trợ lý báo nhân viên trong cổng và nhắc như mục còn thiếu.
- Mỗi thao tác được ghi nhật ký: ai làm, lúc nào, lý do.

**US-D1.3 · Duyệt bản tạm và kèm hạn bổ sung** (phụ thuộc US-D1.2)
Là HR onboarding, tôi muốn nhận tạm giấy chứng nhận tốt nghiệp tạm thời, để nhân viên vẫn đi làm đúng hạn.
- Tôi duyệt mục ở dạng "bản tạm" kèm hạn nộp bản chính thức; mục tính là Đã duyệt online. Đến hạn mà chưa có bản chính thức thì hệ thống nhắc như một mục còn thiếu.

### D2. Ngày đầu đi làm (F10)

**US-D2.1 · Nhận bản công chứng** (phụ thuộc US-D1.2)
Là HR onboarding, tôi muốn có danh sách các bản giấy cần thu của từng người vào ngày đầu, để thu đủ một lần.
- Danh sách chỉ gồm các mục cần bản giấy đã được duyệt online; tôi đối chiếu rồi tick "đã nhận" từng mục.
- Tick xong thì mục chuyển sang Hoàn tất và % tiến độ cập nhật (BR06).

### D3. Ghi hồ sơ HRM (F11)

**US-D3.1 · Dữ liệu tự điền vào hồ sơ nhân viên** (phụ thuộc US-D1.2)
Là HR onboarding, tôi muốn dữ liệu đã duyệt tự vào hồ sơ nhân viên trong HRM, để không phải gõ lại.
- Chỉ dữ liệu của mục đã duyệt mới được ghi vào HRM (BR10); ảnh gốc được lưu vào hồ sơ nhân viên.
- Ghi lỗi thì báo tôi kèm trường bị lỗi; không ghi thiếu mà không báo.

**US-D3.2 · Hủy hồ sơ khi ứng viên không nhận việc**
Là HR onboarding, tôi muốn hủy hồ sơ của người không nhận việc nữa, để không còn nhắc và không giữ giấy tờ không cần thiết.
- Hủy thì dừng nhắc, khóa link vào cổng và xóa file theo chính sách lưu trữ.
