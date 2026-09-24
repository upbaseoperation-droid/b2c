# MA TRẬN BÀN GIAO (HANDOFF MATRIX) & BỘ QUY CHUẨN SLA
## Phòng Marketing B2C - Upbase Asia

> **Rà soát yêu cầu 24/09/2026 — SDLC giai đoạn 1:** Người phụ trách giải pháp xác nhận Growth thuộc team vận hành sàn lập plan/order đầu vào và Content phân rã thành plan chi tiết. `Booking đa sàn.pdf` tr. 1 và tr. 4 từng mô tả khác nhau về người phân rã; quyết định đã xác nhận trong trao đổi được ưu tiên. Xem [khảo sát plan trong BRD](08_BOOKING_MULTIPLATFORM_BRD.md#2a-khảo-sát-ranh-giới-lập-plan--chưa-chốt-raci). Ma trận bên dưới chưa được cập nhật SLA và trường bàn giao nên chưa dùng để phân quyền hoặc giao SLA chính thức cho plan đa sàn.

> **Bằng chứng bổ sung cùng ngày:** Ảnh thông báo team DX **đề xuất** cho plan tháng 10/2026: Growth nhập plan ở Daily/Operation Tracking và order nguồn lực theo từng nền tảng ở Plan order tổng → tự động đồng bộ sang Booking → Content phân rã order. Điều này khác SLA-00 bên dưới đang giao Booking phân rã KL. Chưa xác nhận đề xuất đã được phê duyệt hoặc đã áp dụng; xem [BRD](08_BOOKING_MULTIPLATFORM_BRD.md#2a-khảo-sát-ranh-giới-lập-plan--chưa-chốt-raci).

> **Quyết định nghiệp vụ được xác nhận sau khảo sát:** **Content phân rã order của Growth thành plan chi tiết**. SLA-00 và câu “Plan Đầu Tháng do Booking PIC phân rã” bên dưới là mô tả cũ, chưa được dùng làm phân công cho plan đa sàn. Cần chốt thời hạn, người duyệt và đầu ra bàn giao sang Booking trước khi thay bằng ma trận SLA chính thức.

> **Chi tiết đã chốt:** Growth giao **số tổng theo nền tảng và tổng ngân sách**. Content phân rã theo `Platform × Content Type × Format × Model × KL`, đối soát số lượng từng nền tảng và tổng ngân sách với plan Growth. Phần vượt ngân sách không được trình duyệt khi chưa có quy tắc ngoại lệ được xác nhận. Xem BR-07/BR-08 trong [BRD](08_BOOKING_MULTIPLATFORM_BRD.md).

> **Nhịp T−1 đã xác nhận:** B2C phải **hoàn thành list booking Đợt 1 chậm nhất ngày 10/T−1** cho tháng T; **ngày 25/T−1** Growth mới có số chốt. List Đợt 1 phải được đối soát lại sau khi Content phân rã plan từ số Growth chốt. Chưa xác nhận tiêu chí “list hoàn thành” và mức được phép đi tới phê duyệt Brand, liên hệ KOC hay tạo BO trước ngày 25; xem BR-10 trong [BRD](08_BOOKING_MULTIPLATFORM_BRD.md).
> **Nhịp booking tháng đã xác nhận:** Booking gồm **3 đợt mỗi tháng**. Mốc ngày 10/T−1 ở trên chỉ dành cho list Đợt 1; lịch và điều kiện chốt Đợt 2/3 chưa được xác nhận. Theo dõi bàn giao và tiến độ riêng từng đợt, đồng thời đối soát tổng tháng; xem BR-11 trong [BRD](08_BOOKING_MULTIPLATFORM_BRD.md).

---

## 1. Nguyên tắc cốt lõi (Core Principles)
1. **Không nhận việc qua chat miệng/tin nhắn rời rạc:** Mọi yêu cầu bàn giao giữa các team bắt buộc phải đi qua **Phiếu Bàn Giao Chuẩn (Standard Brief Template)** trên hệ thống.
2. **Cam kết SLA hai chiều (Two-way SLA):** Đội gửi brief chịu trách nhiệm cung cấp đủ thông tin chuẩn; Đội nhận brief cam kết phản hồi và hoàn thành đúng thời hạn.
3. **Cơ chế Cảnh báo & Leo thang (Escalation Trigger):** Khi một đầu việc trễ quá 50% thời gian SLA quy định, hệ thống tự động bắn cảnh báo đến Team Lead và Quản lý phòng qua Lark Bot.

---

## 2. Ma trận Luồng Phối hợp 3 Team (3-Team Handoff Flow)

[ GROWTH TEAM ]
      │
      │ (0) Growth Demand (Tổng Ngân Sách, Target GMV, CIR kỳ vọng)
      ▼ [SLA Lập Plan Breakdown: Tối đa 24h]
[ BOOKING EXECUTION TEAM ] ◄── Break-down số lượng KOC/KOL theo 4 Level & Ngân Sách
      ▲
      │ (3) Execution Brief & Content Angle
[ CONTENT TEAM ] ◄── (2) Master Content Plan & Strategy ── [ BRAND TEAM ]
      │
      ├─► (3a) Booking Video Affiliate (TikTok Video, FB Reels, Shopee Video, Threads)
      ├─► (3b) Booking Live Affiliate (TikTok Live, Shopee Live)
      └─► (3c) Content Channel Execution (Lên bài, trả link, quản lý bình luận)
```

---

## 3. Chi tiết Bộ Quy chuẩn SLA theo từng chặng

| Chặng | Đầu việc bàn giao | Team gửi | Team nhận | SLA Cam kết | Đầu ra tiêu chuẩn (Standard Output) |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **SLA-00** | **Phân rã Kế hoạch KOC từ Yêu cầu Growth** | **Growth** | **Booking** | **24 giờ** | **Bảng phân bổ số lượng KOC theo 4 Level & Ngân sách (CIR dự phóng đạt chuẩn)** |
| **SLA-00b**| **Brand Phê Duyệt Kế Hoạch Ngân Sách (Chặng 1)** | **Booking/Brand** | **Brand Client** | **24 giờ** | **Brand bấm Duyệt Plan trên Brand Hub hoặc yêu cầu điều chỉnh cơ cấu KOC** |
| **SLA-01** | Bàn giao Campaign Strategy | Brand | Content | **24 giờ** | File Campaign Brief duyệt đầy đủ Big Idea, Key Visual, Budget dự kiến |
| **SLA-02** | Master Content Plan & Angle | Content | Brand | **48 giờ** | Bảng phân bổ Pillar, số lượng bài/kênh, định hướng kịch bản |
| **SLA-03** | Execution Brief cho Booking | Content | Booking | **24 giờ** | Bảng yêu cầu KOC: Tier, ngành hàng, angle video, mã affiliate |
| **SLA-04** | Tiếp cận & Chốt danh sách KOC | Booking | Content | **48 giờ** | Danh sách KOC xác nhận nhận job, báo giá và địa chỉ gửi sample |
| **SLA-04b**| **Brand Phê Duyệt Danh Sách KOC (Chặng 2)** | **Booking** | **Brand Client** | **24 giờ** | **Brand bấm Duyệt KOC hoặc yêu cầu đổi KOC kèm lý do chuẩn hóa trên Hub** |
| **SLA-05** | Duyệt Kịch bản KOC (Script Review)| Content | Booking | **24 giờ** | Feedback duyệt kịch bản hoặc yêu cầu sửa theo guideline sản phẩm |
| **SLA-05b**| **Brand Thẩm Định Kịch Bản (Chặng 3)** | **Content/Booking**| **Brand Client** | **24 giờ** | **Brand duyệt kịch bản 4 phần hoặc gửi góp ý (giới hạn tối đa 2 lần sửa)** |
| **SLA-06** | Trình ký & Duyệt tạm ứng Hợp đồng | Booking | Lark Approval / Lead | **12 giờ** | Hợp đồng sinh tự động, đẩy đơn duyệt chi sang Lark Open API, tự động kích hoạt gửi mẫu khi duyệt |
| **SLA-07** | Nghiệm thu Video / Livestream | Booking | Content/Brand| **24 giờ** | Kiểm tra bài đăng lên sóng, đúng hashtag, gắn đúng link affiliate/giỏ hàng |
| **SLA-07b**| Bàn giao Spark Ads & Chốt Ads | Booking | Team Growth | **24 giờ** | Mã Spark Ads TikTok, link video duyệt, xác nhận khách hàng chạy Ads |
| **SLA-08** | Báo cáo Hiệu suất Chiến dịch | All Teams | Ban Giám đốc | **72 giờ** (sau end camp)| Dashboard tổng kết: GMV, Views, ROI, Chi phí thực tế vs Ngân sách |

### 3.1. Trạm Kiểm Soát Định Mức Lập Plan (Validation Gate)
Hệ thống tự động khóa nút **"Trình Duyệt Lên Growth"** nếu vi phạm bất kỳ tiêu chuẩn nào dưới đây:
1. **Trần ngân sách:** Tổng ngân sách phân bổ cho KOC + Self-Channel + Livestream vượt trần Growth giao.
2. **Cơ cấu định mức KOC:** Ngân sách cho nhóm KOC lớn (`>= KL4` Celeb & Macro) vượt ngưỡng **45%** tổng ngân sách.
3. **Chỉ tiêu NMV thuần:** Dự phóng NMV hụt quá **10%** so với cam kết ban đầu sau khi trừ tỷ lệ hủy định mức (ví dụ 8%).
4. **Quy tắc giải trình:** Nếu vi phạm nhưng có sự thống nhất chiến lược với Growth Lead, bắt buộc nhập lý do giải trình ngoại lệ vào ô hệ thống mới cho phép mở khóa gửi duyệt.

### 3.2. Chu Trình Đối Soát Kế Hoạch 4 Chặng (Chuẩn File 4.1 Plan Order Tổng)
Mỗi gian hàng hàng tháng được quản trị qua 4 trạng thái số liền mạch:
1. **Plan Đầu Tháng:** Con số kỳ vọng ban đầu do Booking PIC phân rã.
2. **Số Duyệt:** Con số sau khi Team Lead & Growth Lead chốt duyệt chính thức.
3. **Sau Điều Chỉnh:** Con số cập nhật giữa tháng theo nhịp chạy thực tế và nguồn hàng tồn kho.
4. **Report MTD:** Con số thực tế nghiệm thu cuối kỳ, đối chiếu GAP ngân sách và GAP NMV thuần để đánh giá thưởng phạt.

---

## 4. Biểu mẫu Chuẩn hóa (Standard Brief Templates)

### 4.1. Template 1: Campaign Brief (Brand -> Content)
* **Tên Chiến dịch:** [Ví dụ: Mega Sale 10.10 - Kháng Nắng Đa Tầng]
* **Giai đoạn:** Teasing (1-5/10) / D-Day (6-10/10) / Thank you (11-12/10)
* **Mục tiêu chiến lược:** GMV mục tiêu, Nhận diện thương hiệu (Reach/Views)
* **Target Audience:** Nhân khẩu học, chân dung khách hàng, nỗi đau (pain point)
* **Big Idea & Key Message:** Câu thông điệp chủ đạo xuyên suốt
* **Key Visual & Asset Guideline:** Link moodboard, màu sắc chủ đạo, font chữ
* **Ngân sách dự kiến:** Phân bổ cho Content & Booking

### 4.2. Template 2: Execution Brief (Content -> Booking)
* **Mã chiến dịch liên kết:** [Link tự động từ Campaign Brief]
* **Nhóm KOC mục tiêu:** Tier 1 (Celebrity), Tier 2 (Macro), Tier 3 (Micro), Tier 4 (Affiliate KOC)
* **Kênh triển khai:** TikTok Video, Shopee Video, Facebook Reels, TikTok Live
* **Key Selling Points (USP sản phẩm):** 3-5 điểm bắt buộc phải nói trong video/live
* **Do's & Don'ts:** Quy định về từ khóa cấm (vi phạm chính sách TikTok/Shopee), trang phục, ánh sáng
* **Mẫu sản phẩm (Sample):** Mã SKU gửi mẫu, số lượng mẫu
* **Deal/Chính sách hoa hồng:** % Affiliate commission hoặc chi phí booking cố định

---

## 5. Quy chế Thưởng/Phạt Tuân thủ SLA
* **Điểm SLA cá nhân:** Khởi điểm mỗi tháng 100 điểm.
  * Mỗi lần trễ SLA có lý do chính đáng & báo trước: trừ 5 điểm.
  * Mỗi lần trễ SLA không báo trước: trừ 10 điểm.
  * Hoàn thành trước hạn và đạt chất lượng xuất sắc: cộng 5 điểm.
* **Quy đổi:** Điểm SLA là trọng số chiếm **30%** trong điểm đánh giá hiệu suất hàng tháng và quyết định xếp hạng trên Bảng vàng thi đua (Leaderboard).

---

## 6. Bộ Quy Chuẩn SLA B2C Chi Tiết & Cơ Chế Kiểm Soát Tự Động (Cập Nhật 09/2026)

### 6.1. Nhịp Lập Kế Hoạch Booking KOC & Kênh Tự Xây (Self-Channel)
1. **Booking Affiliate (KOC Channel):**
   * **Ngày 10/T−1:** Bàn giao nguồn lực & hoàn thành Danh sách KOC Đợt 1.
   * **Ngày 20−23/T−1:** Freeze (đóng băng) kế hoạch tổng thể.
   * **3 Đợt đẩy hàng tháng:** Ngày 10, 20 và 30 hàng tháng.
   * **Brand duyệt list (tỷ lệ 60-30-10):** Vào ngày 12, 22, 02 (SLA duyệt: tối đa **48h**).
   * **Họp chốt danh sách:** Vào ngày 13, 23, 03 (SLA phản hồi: tối đa **24h**).
   * **Danh sách chốt chính thức (Final List):** Vào ngày 15, 25, 05 (SLA: **48h**).
2. **Kênh Tự Xây (Self-Channel Booking):**
   * **15/T−1:** Chốt danh sách trước Mega Double Day.
   * **25/T−1:** Chốt danh sách sau Double Day đến ngày 20/T.
   * **05/T:** Chốt danh sách còn lại trong tháng.

### 6.2. Kiểm Soát Hàng Mẫu (Sample) & Vận Chuyển Kho
1. **SLA Xuất kho:** Kho đóng gói & xuất hàng trong vòng **48 giờ (2 ngày)** kể từ khi Content nộp thông tin.
2. **Cơ chế leo thang (Escalation Trigger):**
   * **Quá 2 ngày chưa xuất kho:** Hệ thống tự động bắn cảnh báo tới **Growth & Account Management**.
   * **Quá 3 ngày chưa có mã vận đơn:** Tự động kích hoạt thông báo tới **Leader B2C** để can thiệp kho vận.
   * **Quá 5 ngày chưa nhận hàng:** Đổi KOC hoặc điều chỉnh timeline chiến dịch.
   * **Quy tắc Video gấp:** Nghiêm cấm nhận KOC/kênh mới khi thời gian lên bài dưới **5 ngày** tính đến ngày air.
3. **Phê duyệt định hướng kịch bản Brand:**
   * Brand quá **2 ngày** chưa duyệt: Cảnh báo Account/Growth.
   * Brand quá **3 ngày** không phản hồi: Kích hoạt đề xuất **Tự Air (Auto-Air)** để đảm bảo tiến độ chiến dịch.

### 6.3. Quy Chuẩn Tài Chính, Hợp Đồng & Thanh Toán (DNTT)
1. **Hạn nộp DNTT:** Bắt buộc nộp trước **10:00 sáng ngày làm việc tiếp theo**.
2. **Nghiệm thu & gửi bill:** Bắt buộc gửi bill hoàn tất nghiệm thu cho KOC trong vòng **7 ngày làm việc** kể từ ngày on-air.
3. **Trạm kiểm soát Hợp đồng > 9.000.000 VNĐ:**
   * Bắt buộc có bản **Scan hợp đồng** đầy đủ chữ ký 2 bên lưu trên Drive chung của team.
   * Bắt buộc ký tối thiểu **2 ngày làm việc** trước ngày làm ĐNTT.
   * Bắt buộc kiểm tra và lưu trữ bản chụp **CCCD / Passport** chính chủ của KOC.
   * Bắt buộc tài khoản ngân hàng thụ hưởng phải khớp tên KOC (Nghiêm cấm chuyển khoản qua tài khoản cá nhân trung gian).
   * **Khóa cứng nút Duyệt Lark:** Nếu thiếu bản scan hoặc ký trễ dưới 2 ngày, hệ thống chặn phê duyệt giải ngân.

### 6.4. Kỷ Luật Dữ Liệu & Tự Động Khóa (Data Hygiene Auto-Lock)
* **Cập nhật link bài đăng:** Bắt buộc điền link video/live hàng ngày trước **10:00 sáng** (Thứ 6 nộp link cho cả Thứ 7).
* **Cơ chế tự khóa sau 7 ngày:** Nếu video đã on-air quá **7 ngày làm việc** mà chuyên viên chưa điền link nghiệm thu, hệ thống tự động khóa đóng băng bản ghi deal. Bắt buộc có giải trình và phê duyệt mở khóa từ Leader B2C.

### 6.5. Cửa Sổ Nghiệm Thu Đối Soát E2E 5 Bước (E2E Settlement Protocol)
* **Bước 1 (Mùng 2 hàng tháng):** Chốt số liệu & đóng băng toàn bộ dữ liệu tạm tính.
* **Bước 2 (WD04 - Ngày làm việc thứ 4):** Kế toán gửi Báo cáo Sai lệch Round 1.
* **Bước 3 (WD05 - Ngày làm việc thứ 5):** Cửa sổ mở sửa Round 1 từ **09:00 đến 17:00**; khóa cứng lúc **17:30**.
* **Bước 4 (WD10 - Ngày làm việc thứ 10):** Kế toán gửi Báo cáo Sai lệch Round 2.
* **Bước 5 (WD11 - Ngày làm việc thứ 11):** Cửa sổ mở sửa cuối từ **09:00 đến 17:00**; khóa vĩnh viễn lúc **17:30** để chốt báo cáo tài chính.

### 6.6. Ma Trận Phê Duyệt Content & Demo theo Cấp Brand × Khung Lương (KL1 ➔ KL7 & TAP)
* **Bản chất Tier KOC:** Tier trong vận hành Upbase B2C được quy định trực tiếp bằng **Khung Lương (KL)**: TAP UpAffiliate, KL1, KL2, KL3, KL4, KL5, KL6, KL7.
* **Quy chuẩn kiểm soát 2 tầng (Policy Engine):**
  1. **Nhóm KL1, KL2, KL3 & TAP (< 3.000.000 VNĐ hoặc 0đ hoa hồng):** Mặc định **MIỄN DUYỆT KỊCH BẢN (Script Exempted)** nhằm giải phóng 80% áp lực cho đội ngũ Content. Với gian hàng FMCG hoặc Thuần Performance: **MIỄN DUYỆT CẢ HAI (Auto-Pass)**, KOC nhận hàng được bấm máy và lên sóng ngay.
  2. **Nhóm KL4, KL5 (3.000.000 – 10.000.000 VNĐ):** Tùy cấp độ Brand (Brand Dược mỹ phẩm khắt khe thì duyệt cả Kịch bản & Demo; Brand Tiêu chuẩn thì miễn kịch bản, chỉ duyệt demo video).
  3. **Nhóm KL6, KL7 (> 10.000.000 VNĐ Celeb / Macro):** Giá trị hợp đồng và rủi ro lớn, bắt buộc kiểm soát chặt chẽ cả Kịch bản (SLA 24h) và Video Demo (SLA 12h).

### 6.7. Luồng Đề Xuất Ngoại Lệ (Exception Override Flow) từ Nhân Viên lên Quản Lý
* **Mục đích:** Cho phép linh hoạt với các trường hợp khẩn cấp (D-Day rush) hoặc KOC quen thuộc/Celeb có phong cách review mộc tự nhiên nằm ngoài diện miễn duyệt của Ma trận chính sách.
* **Quy trình:**
  1. Booking PIC bấm **"Đề xuất Miễn Duyệt"** trên dòng Deal, chọn phạm vi (Miễn Content / Miễn Demo / Miễn Cả Hai) và nhập lý do giải trình bắt buộc.
  2. Deal chuyển trạng thái sang `EXEMPTION_REQUESTED` chờ Quản lý (Manager / Lead B2C) phê duyệt.
  3. Quản lý thẩm định:
     * **Chấp thuận (Approve):** Deal nhận nhãn `⚡ Miễn duyệt do Lead phê duyệt`, tự động bỏ qua bước chờ duyệt, mở khóa xuất kho và lên sóng ngay.
     * **Bác bỏ (Reject):** Ghi rõ lý do từ chối, Deal bắt buộc quay lại quy trình nộp kịch bản và demo bình thường.
  4. Ghi nhận nhật ký kiểm toán (Audit Trail) phục vụ đối soát trách nhiệm vận hành.

