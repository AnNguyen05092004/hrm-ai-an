# AI Talent: User story và tiêu chí nghiệm thu

> Nguồn: [talent-specs.md](talent-specs.md) (mã F, BR ghi theo file này).
> Nguyên tắc: Talent là khung, LMS là nhiên liệu. Code tính mức và gap. AI dịch KPI, gợi ý, viết kế hoạch và tóm tắt. Người có thẩm quyền duyệt; AI không xếp loại nhân viên.

| Vai trò | Là ai |
|---|---|
| Giám đốc / leader | Người đặt KPI, chiến lược và theo dõi kế hoạch đào tạo của đơn vị |
| Trưởng phòng | Người chỉnh danh sách người học trong đơn vị mình, sửa khung nháp của đơn vị, xem dashboard đơn vị |
| Quản lý trực tiếp | Người đánh giá mức 4–5 và tiềm năng của nhân viên mình |
| Nhân viên | Người xem năng lực của mình, chọn hướng phát triển và học theo lộ trình |
| Phòng đào tạo / HR | Người giữ khung năng lực, danh mục khóa học, nhãn khóa và xác nhận chứng chỉ ngoài |

---

## A. Khung năng lực và career path

### A1. Khung năng lực và career path (F01, F02)

**US-A1.1 · Xem khung năng lực của vị trí**
Là nhân viên, tôi muốn xem vị trí của mình cần những năng lực và skill gì, ở mức nào, để biết mình được kỳ vọng ra sao.
- Khung hiện dạng cây: năng lực → skill → mức yêu cầu 1–5, kèm mô tả từng mức.
- Chỉ hiện phiên bản khung đã duyệt, đang hiệu lực (BR01).

**US-A1.2 · Quản lý khung theo phiên bản**
Là phòng đào tạo / HR, tôi muốn cập nhật khung mà không làm hỏng dữ liệu cũ, để khung theo kịp thay đổi của công ty.
- Mỗi lần sửa tạo phiên bản mới, có ngày hiệu lực và người duyệt.
- Phiên bản mới có hiệu lực thì gap được tính lại. Kế hoạch và lộ trình đang chạy được báo để xem lại, không tự đổi.

**US-A1.3 · Xem career path** (phụ thuộc US-A1.1)
Là nhân viên, tôi muốn thấy từ vị trí của mình có thể đi tiếp những hướng nào, để chọn hướng phát triển.
- Hiện các hướng lên và hướng chuyển ngang từ vị trí hiện tại.
- Bấm vào một vị trí thì thấy khung của vị trí đó và gap của tôi so với nó.

### A2. Xây khung khi chưa có (F03)

**US-A2.1 · Xây khung năng lực từ kho JD**
Là trưởng phòng, tôi muốn có bản khung nháp cho vị trí chưa có khung, để không phải viết từ đầu.
- Chọn vị trí, AI đọc JD và mô tả công việc của vị trí đó rồi đề xuất cây năng lực → skill → mức.
- Mỗi skill kèm câu trong JD làm căn cứ, ví dụ "thành thạo Python" → Python mức 3.
- Tôi sửa rồi gửi duyệt. Khung chưa duyệt thì không dùng để tính gap.

---

## B. Hồ sơ năng lực

### B1. Mức hiện tại từng skill (F04)

**US-B1.1 · Xem mức skill và nguồn** (phụ thuộc US-A1.1)
Là nhân viên, tôi muốn biết mức từng skill của mình lấy từ đâu, để tin được con số đó.
- Mỗi skill hiện mức, nguồn (khóa học, bài thi, chứng chỉ hoặc người đánh giá) và ngày (BR03).
- Skill chưa có dữ liệu ghi "chưa đánh giá", không tính là mức 0.
- Mức lấy từ chứng chỉ đã hết hạn được đánh dấu "cần xác nhận lại".

**US-B1.2 · Kết quả học tự cập nhật mức** (phụ thuộc US-E1.1)
Là nhân viên, tôi muốn thi đạt thì mức skill tự cập nhật, để không phải khai lại.
- LMS trả kết quả bài thi đạt về thì code nâng mức theo nhãn của khóa, **tối đa mức 3** (BR02).
- Học xong khóa không có bài thi thì chỉ ghi "đã học", không đổi mức.
- Chứng chỉ bên ngoài (AWS, Microsoft…) tôi tải lên; HR xác nhận rồi mới được tính.

**US-B1.3 · Quản lý đánh giá mức 4–5**
Là quản lý trực tiếp, tôi muốn ghi nhận nhân viên đã đạt mức 4–5 qua dự án, để hồ sơ năng lực phản ánh đúng việc thực tế.
- Chỉ quản lý được đặt mức 4–5 (BR02). Mỗi lần đặt phải ghi dự án hoặc kết quả làm căn cứ.
- Quy trình đánh giá chi tiết chưa nằm trong phạm vi.

**US-B1.4 · Có mức ban đầu khi bắt đầu dùng**
Là HR, tôi muốn hồ sơ năng lực có dữ liệu ngay từ đầu, để tính được gap.
- Mức ban đầu lấy từ bằng cấp, chứng chỉ đã duyệt ở onboarding.
- HR mở một vòng để nhân viên tự đánh giá, rồi quản lý xác nhận.

### B2. Gap (F05)

**US-B2.1 · Xem gap của mình** (phụ thuộc US-B1.1)
Là nhân viên, tôi muốn thấy mình còn thiếu gì, để biết cần học gì.
- Code tính gap từng skill theo hai mốc: vị trí hiện tại, và vị trí kế tiếp hoặc vị trí tôi đã chọn (BR04).
- Gap hiện rõ skill nào lên được bằng khóa học có bài thi (tới mức 3), skill nào cần việc thực tế (mức 4–5).

---

## C. Kế hoạch đào tạo tổ chức

### C1. Từ KPI ra năng lực (F06)

**US-C1.1 · Nhập KPI và xác nhận cách AI hiểu**
Là Giám đốc, tôi muốn nhập KPI, chiến lược và để AI dịch ra năng lực cần có, để biết đội ngũ cần gì cho mục tiêu này.
- Tôi nhập KPI, phạm vi đơn vị, thời hạn và ngân sách nếu có. Đầu vào mơ hồ thì AI hỏi lại.
- AI trả về skill, mức và số người cần; tôi xác nhận hoặc sửa trước khi đi tiếp (BR05).
- KPI không gắn với năng lực nào thì AI nói rõ, không ép ra kế hoạch.

### C2. Gap và kế hoạch theo cấp (F07)

**US-C2.1 · Xem gap theo đơn vị** (phụ thuộc US-C1.1)
Là Giám đốc, tôi muốn thấy đơn vị nào thiếu skill gì, thiếu bao nhiêu người, để biết cần đầu tư vào đâu.
- Code so năng lực cần với hồ sơ năng lực, hiện gap theo đơn vị và theo skill.

**US-C2.2 · Nhận kế hoạch theo cấp** (phụ thuộc US-C2.1)
Là Giám đốc, tôi muốn có kế hoạch nói rõ trưởng phòng, lead và nhân viên mỗi cấp học gì, để triển khai được ngay.
- Hình thức theo gap: tới mức 3 thì khóa học; mức 4–5 thì việc thực tế hoặc mentor, không chỉ khóa học (BR08).
- Gap quá lớn so với thời hạn, hoặc không có ai ở gần mức cần, thì AI gợi ý tuyển và chuyển sang tuyển dụng.

### C3. Chọn người và duyệt (F08)

**US-C3.1 · Chỉnh danh sách người học** (phụ thuộc US-C2.2)
Là trưởng phòng, tôi muốn xem và chỉnh danh sách người AI đề xuất trong đơn vị mình, để chọn đúng người có thể đi học.
- Mỗi người có lý do gắn với gap cụ thể (BR07).
- Tôi chỉ thêm hoặc bớt người trong đơn vị mình (BR06). Bớt người thì ghi lý do, ví dụ đang quá tải dự án; AI không đề xuất lại người đó trong kế hoạch này.

**US-C3.2 · Duyệt và giao sang LMS** (phụ thuộc US-C3.1)
Là người có thẩm quyền duyệt kế hoạch, tôi muốn duyệt rồi giao học một lần, để không phải giao tay từng người.
- Chỉ sau khi duyệt mới giao khóa sang LMS, tạo việc thực tế và ghép mentor (BR06).
- Người được giao nhận thông báo kèm lý do và hạn.

### C4. Theo dõi kế hoạch (F09)

**US-C4.1 · Theo dõi kết quả kế hoạch** (phụ thuộc US-C3.2)
Là Giám đốc, tôi muốn biết kế hoạch đang chạy tới đâu, để điều chỉnh kịp.
- Hiện tiến độ học và mức skill thay đổi theo đơn vị; AI tóm tắt định kỳ, kèm số liệu.
- Không coi KPI thay đổi là tác động riêng của đào tạo.

---

## D. Lộ trình cá nhân

### D1. Chọn hướng (F10)

**US-D1.1 · Được gợi ý hướng gần với mình** (phụ thuộc US-A1.3, US-B2.1)
Là nhân viên, tôi muốn biết hướng nào gần với mình nhất, để chọn hướng có khả năng đạt được.
- AI so các hướng trong career path (BR10), hiện số skill còn thiếu và thời gian ước tính của từng hướng, kèm giải thích.
- Tôi vẫn chọn được hướng có gap lớn; AI nói rõ thời gian ước tính và gợi ý hướng gần hơn.

### D2. Lộ trình (F11)

**US-D2.1 · Nhận lộ trình để vượt KPI** (phụ thuộc US-D1.1)
Là nhân viên, tôi muốn có lộ trình cụ thể tới vị trí mình chọn, để không chỉ dừng ở mức làm đủ KPI.
- Lộ trình gồm khóa học có bài thi (gap tới mức 3), việc thực tế nên xin nhận (gap mức 4–5) và mốc đánh giá lại.
- Lộ trình là gợi ý, không cần ai duyệt. Tôi tự đăng ký khóa trong LMS ngay từ lộ trình; việc thực tế, mentor, khóa ngoài có phí thì tôi tự trao đổi với quản lý.

### D3. Trợ lý theo dõi (F12)

**US-D3.1 · Được nhắc và cập nhật lộ trình** (phụ thuộc US-D2.1)
Là nhân viên, tôi muốn có trợ lý nhắc học và cập nhật tiến độ, để giữ được nhịp.
- Trợ lý chạy trên bot HR trong app chat: nhắc học, cập nhật gap hằng tháng, đề xuất chỉnh lộ trình khi mức skill thay đổi.
- Tôi chuyển vị trí thì gap được tính lại theo khung mới; mức skill đã có vẫn giữ.

---

## E. Gợi ý khóa học

### E1. Gắn nhãn khóa (F13)

**US-E1.1 · Gắn nhãn skill cho khóa học**
Là phòng đào tạo, tôi muốn mỗi khóa được gắn với skill và mức nó đưa tới, để khóa được gợi ý đúng người.
- AI đọc mô tả và nội dung khóa, đề xuất skill và mức; tôi duyệt hoặc sửa.
- Khóa chưa được duyệt nhãn thì không được dùng để gợi ý (BR09).

### E2. Gợi ý theo thứ tự (F14)

**US-E2.1 · Gợi ý khóa cho một skill** (phụ thuộc US-E1.1)
Là nhân viên hoặc người lập kế hoạch, tôi muốn được gợi ý khóa phù hợp với gap, để không phải tự tìm.
- Gợi ý theo thứ tự: khóa trong LMS → khóa ngoài trong danh mục phòng đào tạo đã duyệt → vẫn thiếu thì gợi ý từ khóa để tự tìm hiểu (BR09).
- Không gợi ý link khóa cụ thể ngoài danh mục.

**US-E2.2 · Biết skill nào đang thiếu khóa** (phụ thuộc US-E2.1)
Là phòng đào tạo, tôi muốn biết skill nào đang được cần mà không có khóa, để bổ sung danh mục.
- Danh sách skill thiếu khóa, kèm số người và số kế hoạch đang cần skill đó.

---

## F. Dashboard nhân tài

### F1. Heatmap (F15)

**US-F1.1 · Xem heatmap skill của đơn vị** (phụ thuộc US-B1.1)
Là trưởng phòng / Giám đốc, tôi muốn thấy toàn cảnh skill của đơn vị, để biết điểm mạnh, điểm yếu.
- Mức trung bình từng skill theo đơn vị, so với chuẩn vị trí.
- Chỉ xem được đơn vị trong quyền của mình (BR12).

### F2. 9-Box (F16)

**US-F2.1 · Đánh giá tiềm năng**
Là quản lý trực tiếp, tôi muốn đánh giá tiềm năng của nhân viên mình với căn cứ rõ ràng, để đánh giá công bằng hơn.
- Tôi chọn thấp / vừa / cao. AI chỉ đưa căn cứ tham khảo: tốc độ tăng mức skill trong 12 tháng, đang theo lộ trình nào, khoảng cách tới vị trí kế tiếp.
- AI không tự đánh giá tiềm năng (BR11). Đánh giá đã quá 12 tháng thì tôi được nhắc cập nhật.

**US-F2.2 · Xem 9-Box Năng lực × Tiềm năng** (phụ thuộc US-B1.1, US-F2.1)
Là Giám đốc / trưởng phòng, tôi muốn thấy nhân sự của đơn vị theo năng lực và tiềm năng, để biết ai cần phát triển, ai cần hỗ trợ.
- Trục Năng lực do code tính từ tỷ lệ skill đạt mức yêu cầu; trục Tiềm năng lấy từ đánh giá của quản lý.
- Chỉ xếp người đã có ≥ 70% skill được đánh giá; chưa đủ thì ghi "chưa đủ dữ liệu" (BR14).
- Ban điều hành và HR xem toàn công ty; trưởng khối, trưởng phòng xem đơn vị mình; nhân viên không thấy ô 9-Box của mình (BR12).
- Ô có đánh giá tiềm năng cũ được đánh dấu "dữ liệu cũ". Đơn vị chưa ai được đánh giá tiềm năng thì chỉ hiện heatmap.

**US-F2.3 · AI tóm tắt điểm đáng chú ý** (phụ thuộc US-F2.2)
Là Giám đốc, tôi muốn có tóm tắt những điểm cần chú ý, để không phải tự soi từng ô.
- Tóm tắt các điểm sau, mỗi điểm kèm số liệu và nguồn:
  - người tiềm năng cao chưa có lộ trình;
  - skill thiếu nhiều nhất so với KPI;
  - người có thể làm mentor;
  - đánh giá đã cũ.
- AI không kết luận về từng người (BR11).
- Bấm "Lập kế hoạch đào tạo" từ một điểm thì mở luồng kế hoạch, với phạm vi và skill đã điền sẵn, bỏ qua bước nhập KPI và đi thẳng tới gap theo đơn vị (US-C2.1).
