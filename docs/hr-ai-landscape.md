# Tính năng AI của các nền tảng HR dẫn đầu (11/2026)

Nov 17, 2026 · Tiếp nối [hr-platforms-research.md](hr-platforms-research.md) (Credly, Viva, Workday, Gartner — không nhắc lại ở đây).

## 1. Phạm vi và độ tin cậy

- 15 nền tảng, xếp theo nhóm nghiệp vụ. Nguồn chủ yếu là thông cáo báo chí, release notes và trang sản phẩm của chính hãng, đọc trong tháng 11/2026.
- **Chưa dùng thử nền tảng nào.** Mọi nền tảng ở đây đều bán cho doanh nghiệp hoặc phải đăng ký. Số liệu hiệu quả (giảm x%, tăng y%) là hãng tự công bố, nên tài liệu này không trích lại.
- Cột "Áp dụng" ghi mã use case trong [scope-prd](../scope-prd.md). Ý tưởng mới được đánh số **N1…N16** ở mục 3.

## 2. Mỗi nền tảng có gì

### 2.1 HR lõi (Gartner xếp Leader 2025)

| Nền tảng | Tính năng AI đáng chú ý | Áp dụng |
| --- | --- | --- |
| **SAP SuccessFactors** (Joule) | Gọi là "Autonomous HCM": trợ lý Joule điều phối nhiều agent chuyên biệt, làm trọn một quy trình. Có Recruiting/Onboarding/HR Service Assistant. **Agent giải thích phiếu lương** cho nhân viên. Gợi ý AI ở mọi bước của form đánh giá hiệu suất | 3.1, 5.x, N11 |
| **Oracle HCM** | Hơn 25 agent HCM: Employee Concierge, **Learning Tutor**, Positions Assistant, **Employee Lifecycle Policy Analyst** (hỏi về chính sách khi có sự kiện như chuyển đơn vị, nghỉ thai sản). Đợt 08/2026 thêm Job Architect, coaching cho quản lý, dịch chuyển nội bộ. Agent chạy **trong quyền và luồng phê duyệt có sẵn**. Có AI Agent Studio để khách tự tạo agent | 5.1, 6.4, 6.7 |
| **UKG** (Bryte) | **Bryte Voice:** nhân viên tuyến đầu hỏi bằng giọng nói qua Siri/Google Assistant ("công tôi có sai không?", "còn bao nhiêu phép?"). Tuyển số lượng lớn: xử lý hàng loạt tới 100 ứng viên. Agent soát lỗi bảng lương. Hỗ trợ giao thức Agent2Agent | 5.2–5.4, N13 |

### 2.2 Tuyển dụng và đánh giá (M1, M2)

| Nền tảng | Tính năng AI đáng chú ý | Áp dụng |
| --- | --- | --- |
| **Eightfold AI** | AI Interviewer phỏng vấn sàng lọc số lượng lớn. **AI Interview Companion:** trợ lý cho *người phỏng vấn* suốt buổi phỏng vấn. **Candidate Agent:** chatbot trả lời ứng viên. Điểm phù hợp gồm kỹ năng, tiềm năng và hướng phát triển nghề nghiệp. Có chứng nhận ISO 42001 (quản lý hệ thống AI) | 2.3, N5, N6 |
| **LinkedIn Recruiter** (Hiring Assistant) | Chuyển yêu cầu của quản lý tuyển dụng (nói chuyện tự nhiên) thành tiêu chí tuyển, rồi dựng danh sách ứng viên, **gồm cả người từng ứng tuyển trước đây**. Một agent giám sát điều phối các agent con. Soạn tin nhắn cá nhân hóa | 1.1, N2 |
| **Greenhouse** (Real Talent) | Gắn cờ đơn đáng ngờ theo **SĐT, email, IP, vị trí**. Xác minh danh tính (đối tác CLEAR) trước phỏng vấn hoặc trước offer; **xác minh thất bại không tự loại ứng viên**. Xếp hạng theo **hiệu chỉnh do recruiter đặt** | 1.1, 1.5, N3, N4 |
| **HireVue** | **Assessment Builder:** tạo bài đánh giá theo vai trò từ JD. AI Interviewer bằng giọng nói chấm theo rubric, có giải thích và lịch sử kiểm tra. Recruiter duyệt mọi quyết định | 2.1, 2.2 |

### 2.3 Đào tạo và kỹ năng (M6)

| Nền tảng | Tính năng AI đáng chú ý | Áp dụng |
| --- | --- | --- |
| **Degreed** (Maestro) | **Role-play với AI** (bằng chữ hoặc giọng nói), chấm theo **rubric riêng của tổ chức**. **Skills Check-In:** khoảng 10 phút tự đánh giá 15 kỹ năng theo thang của công ty, có người xác nhận. Agent soát catalog khóa học: **link hỏng, nội dung lỗi thời**. MCP server cho các AI khác (ChatGPT, Claude) đọc dữ liệu kỹ năng | 6.4, 6.5, 6.8, N7, N9, N12 |
| **Cornerstone** (nay đổi tên thành Workforce AI) | Adaptive Learning Agent tạo không gian học theo vai trò và kỹ năng, kèm quiz và role-play. Course Assistant hỗ trợ ngay trong khóa học. **Agent nội dung chuyển SCORM/tài liệu dài thành bài học tương tác** theo hồ sơ kỹ năng. Hỗ trợ MCP và agent-to-agent | 6.3, 6.4, N10 |

### 2.4 Trải nghiệm nhân viên và dịch vụ HR

| Nền tảng | Tính năng AI đáng chú ý | Áp dụng |
| --- | --- | --- |
| **ServiceNow HRSD** (Now Assist) | **Tóm tắt case** (vấn đề, việc đã làm, **tình trạng SLA**, tệp đính kèm). **Tóm tắt chat khi bot chuyển cho người.** Agent dự đoán và chuyển case đúng nhóm, **đánh giá mức khẩn**, tạo kế hoạch xử lý. Tạo case qua điện thoại bằng giọng nói | 5.5, N1 |
| **Qualtrics EX** | Tóm tắt bình luận. Phản hồi dạng hội thoại (AI hỏi lại khi câu trả lời mơ hồ). **Kế hoạch hành động cho quản lý, có theo dõi trách nhiệm**. Dự báo nghỉ việc | V1 (file trước), 4.3 |
| **Culture Amp** | **AI Coach giúp viết nhận xét cân bằng** (đồng nghiệp, cấp trên, tự đánh giá), dựa trên phản hồi đã có trong kỳ. Có chế độ giọng nói. Admin bật/tắt được; dữ liệu không dùng để huấn luyện mô hình bên thứ ba | 2.3, N5 |

### 2.5 Nền tảng Việt Nam

| Nền tảng | Tính năng AI đáng chú ý | Áp dụng |
| --- | --- | --- |
| **MISA AMIS HRM** (AVA) | **Trích xuất thông tin từ CV, CCCD, bằng cấp** vào hồ sơ. **Tạo văn bản nhân sự từ mẫu** (HĐLĐ, quyết định bổ nhiệm). Chat để tạo đơn nghỉ, **giải thích công thức lương ngay trên bảng lương**. Hỏi đáp báo cáo | 3.2, 5.2–5.4, N8, N11 |
| **1Office** | AI đọc hiểu CV (không chỉ dò từ khóa). Agent tự chạy chuỗi: CV mới → chấm → gửi mời phỏng vấn → cập nhật trạng thái. Trợ lý chủ động làm tác vụ | 1.1 |
| **Base.vn** | Base 2.0 (09/2026): định hướng nối con người, phần mềm và AI trên một hệ thống; chưa có chi tiết AI cho HRM | — |

### 2.6 Nguồn kiến thức nghiệp vụ

| Nền tảng | Điểm đáng học | Áp dụng |
| --- | --- | --- |
| **Josh Bersin Galileo** | Kho nghiên cứu HR được **chia nhỏ thành đơn vị có gắn nhãn ngữ nghĩa** để agent truy xuất ("Agent Ready Corpus"). **400 quy trình mẫu có rẽ nhánh** cho các tình huống HR thường gặp. Nhúng được vào agent của nền tảng khác (HiBob) | 5.1, N7, N15 |

## 3. Ý tưởng mới cho hệ thống của mình

Chỉ ghi những ý chưa có trong 28 use case hoặc trong file trước, hoặc những ý làm một use case cụ thể hơn hẳn.

### GĐ1 — dùng được ngay với DB hiện có

| # | Ý tưởng | Học từ | Use case | Ghi chú thiết kế |
| --- | --- | --- | --- | --- |
| N1 | Khi chatbot chuyển cho HR: **tự tóm tắt hội thoại, phân loại, đánh giá mức khẩn** | ServiceNow | 5.1 → 5.5 | Ghi vào `hr_request.details` + một `ai_run`; HR sửa được phân loại |
| N2 | **Tìm lại ứng viên cũ** cho vị trí mới (người từng vào vòng cuối nhưng trượt) | LinkedIn | 1.1 | Truy vấn `candidate` + `application` cũ bằng `pgvector`; cần ứng viên đồng ý lưu hồ sơ |
| N3 | **Recruiter hiệu chỉnh xếp hạng** bằng cách đánh dấu vài CV mẫu tốt/không tốt | Greenhouse | 1.1, 1.2 | Lưu vào `job_requisition` (jsonb); trọng số gốc vẫn lấy từ `m1.match_weights` |
| N4 | Mở rộng tín hiệu gian lận: **trùng SĐT/email giữa nhiều hồ sơ**, nhiều đơn từ cùng nguồn | Greenhouse | 1.1 | Bổ sung G1 (file trước); chỉ gắn cờ, không loại |
| N5 | **Trợ lý cho người phỏng vấn:** nhắc tiêu chí rubric chưa hỏi, giúp viết nhận xét dựa trên bằng chứng, cảnh báo từ ngữ thiên kiến | Eightfold, Culture Amp | 2.2, 2.3 | Trên `interview.kit` và `interview_feedback`; khác AI tự phỏng vấn (PRD đã loại) |
| N6 | **Chatbot cho ứng viên:** hỏi trạng thái hồ sơ, lịch phỏng vấn, câu hỏi thường gặp | Eightfold | Mới (M1) | Dùng lại engine RAG của M5; ứng viên đã có tài khoản `user_account` |
| N7 | **Soát kho chính sách:** văn bản mâu thuẫn nhau, sắp hết hiệu lực, đoạn chưa bao giờ được trích; gắn nhãn "đối tượng áp dụng" cho từng đoạn | Degreed, Galileo | 5.1 | Trên `kb_document`/`kb_chunk`; nhãn để trong jsonb của chunk |

### GĐ2

| # | Ý tưởng | Học từ | Use case |
| --- | --- | --- | --- |
| N8 | **Đọc giấy tờ (CCCD, bằng cấp) để điền sẵn hồ sơ onboarding; soạn nháp HĐLĐ từ mẫu.** HR kiểm tra trước khi ghi sang HRM | MISA | 3.2 |
| N9 | **Role-play luyện tập** (bán hàng, xử lý khiếu nại, phỏng vấn, nói chuyện khó cho quản lý), chấm theo rubric của công ty | Degreed, Cornerstone | 6.4, 6.5 |
| N10 | **Chuyển tài liệu dài/SCORM có sẵn thành bài học ngắn + quiz** | Cornerstone | 6.3 |
| N11 | **Giải thích bảng công:** "vì sao tháng này thiếu 1 công", chỉ ra ngày và quy tắc cụ thể. Chỉ giải thích, không tính lương | SAP, MISA | 5.2 |

### GĐ3 hoặc sau

| # | Ý tưởng | Học từ | Use case |
| --- | --- | --- | --- |
| N12 | **Skills check-in 10 phút:** nhân viên tự chấm theo thang của công ty, quản lý xác nhận | Degreed | 6.8 |
| N13 | **Hỏi đáp bằng giọng nói cho lao động tuyến đầu** (công nhân, nhân viên cửa hàng không ngồi máy tính) | UKG | 5.x |
| N14 | **Mở dịch vụ dạng MCP server** để agent khác trong công ty (Copilot, chatbot nội bộ) gọi được: tra chính sách, tra kỹ năng | Degreed, Cornerstone, UKG | Kiến trúc |
| N15 | **Thư viện tình huống cho quản lý** ("nhân viên đi muộn liên tục thì xử lý thế nào"): quy trình có rẽ nhánh, dẫn chiếu chính sách | Galileo | 5.1 mở rộng cho vai quản lý |
| N16 | **Hỏi chính sách theo sự kiện đời nhân viên** (chuyển đơn vị, thai sản, nghỉ hưu): gom tất cả quy định liên quan một sự kiện | Oracle | 5.1 |

### Không nên làm (dù các hãng đều có)

- **AI tự phỏng vấn ứng viên, avatar số** (Eightfold, HireVue): PRD đã loại. Rủi ro thiên kiến và trải nghiệm ứng viên.
- **Dự báo ai sắp nghỉ việc** (Qualtrics): nằm trong phần "phân tích nhân lực" đang tạm hoãn. Nhạy cảm, dễ bị dùng sai.
- **Tính lương, soát lỗi lương** (SAP, UKG): ngoài phạm vi.

## 4. Xu hướng chung

1. **Từ trả lời sang làm thay.** Hãng nào cũng chuyển từ chatbot sang agent thực thi tác vụ, có agent giám sát điều phối agent con. Mình đã có `outbox_event` và `*_by` cho bước người duyệt, nên đi đúng hướng.
2. **Con người vẫn quyết định ở bước quan trọng.** Greenhouse không tự loại khi xác minh thất bại; HireVue để recruiter duyệt mọi quyết định; Oracle cho agent chạy trong luồng phê duyệt sẵn có. Khớp nguyên tắc "AI gợi ý, người quyết định".
3. **Chống gian lận ứng viên** thành tính năng chuẩn của tuyển dụng.
4. **Giọng nói cho lao động tuyến đầu** (UKG, ServiceNow, Culture Amp).
5. **Kết nối agent giữa các hệ thống** qua MCP và A2A (Degreed, Cornerstone, UKG, Galileo).
6. **Luyện tập bằng role-play AI** thay cho khóa học chỉ xem video.

## 5. Đề xuất

Nếu chọn 3 ý từ file này để bổ sung GĐ1: **N1** (tóm tắt khi chuyển HR), **N5** (trợ lý cho người phỏng vấn), **N7** (soát kho chính sách). Cả ba nằm trong use case đã chốt, dùng bảng đã có, không cần thêm bảng mới.

## Nguồn

- SAP: [Autonomous HCM 05/2026](https://news.sap.com/2026/05/sap-successfactors-innovations-new-era-autonomous-hcm/) · [SAPinsider 1H 2026](https://sapinsider.org/articles/successfactors-1h-release-deepens-ai-across-hr-suite/)
- Oracle: [Agentic apps cho HR 04/2026](https://www.oracle.com/sg/news/announcement/oracle-introduces-fusion-agentic-applications-for-hr-2026-04-09/) · [Talent management 08/2026](https://www.oracle.com/news/announcement/oracle-adds-new-fusion-agentic-applications-and-ai-agents-to-help-improve-talent-management-2026-08-11/) · [diginomica](https://diginomica.com/oracle-doubles-number-ai-agents-fusion-hcm.md)
- UKG: [Bản phát hành 08/2026](https://www.ukg.com/company/newsroom/ukg-deepens-workforce-operating-platform-ai-built-help-chros-improve-frontline-work) · [UKG + Google Cloud](https://www.ukg.com/company/newsroom/ukg-and-google-cloud-partner-transform-work-agentic-ai-tens-millions-users)
- Eightfold: [AI Interview Companion](https://eightfold.ai/company/press/press-releases/eightfold-ai-expands-talent-agents-across-the-full-interview-journey-introducing-ai-interview-companion-and-new-interview-capabilities/) · [Candidate Agent](https://itbrief.co.uk/story/eightfold-launches-candidate-agent-for-hiring-chats) · [Josh Bersin: multi-agent TA](https://joshbersin.com/2026/07/multi-agent-ai-for-talent-acquisition-arrives-eightfold-paradox-maki-radancy-and-more/)
- LinkedIn: [Q2 2026 product update](https://business.linkedin.com/hire/product-update/archival/product-update-q2-2026) · [Multi-agent Hiring Assistant](https://getcoai.com/news/linkedins-multi-agent-ai-hiring-assistant-goes-live-for-recruiters/)
- Greenhouse: [Real Talent](https://www.greenhouse.com/product-features/greenhouse-real-talent) · [Release notes 02/2026](https://support.greenhouse.io/hc/en-us/articles/47028491519387-Release-notes-February-2026) · [Case study nội bộ](https://www.greenhouse.com/blog/real-talent-spot-fraud-earlier-protect-recruiter-time)
- HireVue: [AI Interviewer](https://www.hirevue.com/press-release/hirevue-launches-ai-interviewer) · [AI Hiring Agents](https://www.hirevue.com/platform/ai-hiring-agents)
- Degreed: [LENS 2026](https://trainingindustry.com/press-release/artificial-intelligence/degreed-introduces-new-solutions-for-accelerating-ai-fluency-and-leadership-transformation-at-lens-2026/) · [Maestro](https://degreed.com/experience/degreed-maestro/)
- Cornerstone: [Adaptive Learning Agent](https://www.cornerstoneondemand.com/company/news-room/press-releases/moving-at-speed-with-the-ai-multiplier-cornerstone-launches-adaptive-learning-agent/) · [Nucleus: Workforce AI](https://nucleusresearch.com/wp-content/uploads/2026/06/26101-Cornerstone-unveils-Workforce-AI.pdf)
- ServiceNow: [Now Assist for HRSD](https://www.servicenow.com/docs/r/employee-service-management/now-assist-for-hrsd/explore-now-assist-hr.html) · [Release notes Zurich](https://www.servicenow.com/docs/r/zurich/release-notes/hr-na-rn.html)
- Qualtrics: [Futurum](https://futurumgroup.com/insights/can-qualtrics-help-customers-move-from-listening-to-insights-to-driving-action/) · [Brandon Hall](https://brandonhall.com/qualtrics-and-the-shift-from-listening-to-outcomes/)
- Culture Amp: [AI Coach cho peer/upward feedback](https://updates.cultureamp.com/152007-ai-coach-is-now-available-in-peer-and-upward-feedback) · [Trang AI](https://www.cultureamp.com/platform/ai)
- MISA: [AMIS HRM](https://amis.misa.vn/amis-hrm) · [Trợ lý ảo AI trong nhân sự](https://amis.misa.vn/?p=233819)
- 1Office / Base: [1Office AI Agents](https://1office.vn/en/ai-agents) · [VnEconomy về Base 2.0](https://vneconomy.vn/ai-dang-dinh-hinh-tuong-tai-cua-phan-mem-saas.htm)
- Galileo: [Jupiter release 09/2026](https://joshbersin.com/2026/09/hr-intelligence-goes-enterprise-the-galileo-jupiter-release/) · [HiBob + Galileo](https://www.hibob.com/news/hibob-and-the-josh-bersin-company-launch-galileopowered-workforce-intelligence-in-bob/)
