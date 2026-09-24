# ĐẶC TẢ BÁO CÁO ĐIỀU HÀNH & HỆ THỐNG TÁC NGHIỆP BOOKING B2C
## Dựa trên Báo cáo Vận hành & Dữ liệu Thực tế Phòng Marketing B2C Upbase

> **Cập nhật yêu cầu 24/09/2026:** Trong phạm vi booking đa nền tảng, **job = BO**. Một BO có một tổ hợp Platform × Content Type × Format × Model. HĐNT dùng chung cho KOC; phụ lục/SOW gom các BO cùng KOC và tháng, kể cả nhiều brand/store; BO phát sinh sau khi phụ lục tháng ký đi vào phụ lục bổ sung. Các mô tả hợp đồng theo từng job bên dưới là hiện trạng prototype cần thiết kế lại. Xem [BRD booking đa nền tảng](08_BOOKING_MULTIPLATFORM_BRD.md).

> **Cập nhật phân công plan:** Growth thuộc team vận hành sàn lập plan/order đầu vào theo từng nền tảng; **Content phân rã order đó thành plan chi tiết**. Các mục “Growth Demand Breakdown Cockpit” và “My Plan Workspace” bên dưới đang mô tả Booking phân rã plan theo prototype; chưa phản ánh phân công đã xác nhận. Xem [BRD](08_BOOKING_MULTIPLATFORM_BRD.md#2a-khảo-sát-ranh-giới-lập-plan--chưa-chốt-raci).

> **Mức chi tiết đã chốt:** Growth giao số tổng theo nền tảng và tổng ngân sách; Content phân rã theo năm chiều booking (Platform, Content Type, Format, Model, KL). Báo cáo plan phải đối soát tổng số lượng từng nền tảng và ngân sách Content phân bổ với số Growth giao; không dùng luồng Booking tự phân rã trong prototype làm nguồn quy tắc nghiệp vụ.

> **Nhịp T−1 đã chốt:** List booking Đợt 1 của tháng T phải hoàn thành chậm nhất **ngày 10/T−1**; số plan Growth chốt đến **ngày 25/T−1**. Theo dõi riêng mốc hoàn thành list và kết quả đối soát sau khi Content phân rã từ số Growth chốt. Tiêu chí “list xong” và phạm vi cam kết trước ngày 25 còn mở tại [BRD BR-10](08_BOOKING_MULTIPLATFORM_BRD.md).
> **Nhịp booking tháng đã chốt:** Booking có **3 đợt/tháng**; ngày 10/T−1 chỉ là hạn của list Đợt 1. Báo cáo cần lọc theo từng đợt và cộng lên tổng tháng; lịch Đợt 2/3 chưa chốt tại [BRD BR-11](08_BOOKING_MULTIPLATFORM_BRD.md).

---

## 📌 1. BẢN CHẤT VẬN HÀNH & KIẾN TRÚC 2 THỰC THỂ (ENTITY MODEL)

Hệ thống được thiết kế phân định rành mạch giữa **Hồ Sơ KOC Dùng Chung (Master CRM)** và **Từng Job Vận Hành Độc Lập Với Brand (Per-Job Booking Deal)**:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  HỒ SƠ GỐC KOC (MASTER KOC CRM - 5.700 CREATORS)                                │
│  • Kênh TikTok, Followers, View TB, Phân tích Giới tính & Độ tuổi khán giả     │
│  • Khung lương (KL1 ➔ KL7), Báo giá Net chuẩn, Kỷ lục GMV lịch sử              │
│  • Thông tin pháp lý & hậu cần: CCCD, STK Ngân Hàng, Địa chỉ nhận hàng mẫu vật lý│
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │ 1 KOC được đề xuất vào NHIỀU JOB khác nhau
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│  VẬN HÀNH TỪNG JOB VỚI BRAND (BOOKING DEAL / CAMPAIGN EXECUTION)               │
│  Mỗi dòng trong Lark Base (Mã ID: ID26..., Mã BO: BO26...) là 1 JOB ĐỘC LẬP:   │
│  • Brand & Gian hàng: Royal Ausnz, Kutieskin, Bye Bye Blemish, pHCare, Babe... │
│  • Sản phẩm cụ thể: Nước tắm, Kem dịu da, Sữa Úc, Chấm mụn tràm trà...        │
│  • Đợt booking: Đợt 1 (Mở màn), Đợt 2 (Đẩy số), Đợt 3 (Về đích)...            │
│  • 🎃 PHÊ DUYỆT BRAND (THEO TỪNG JOB):                                         │
│    - ĐÃ DUYỆT: Chuyển sang tạo hợp đồng BO, cọc tạm ứng, gửi mẫu.             │
│    - TỪ CHỐI: Ghi nhận LÝ DO TỪ CHỐI (Lệch định vị, sai tệp, vượt ngân sách)   │
│    - CHỜ DUYỆT: Đang trình duyệt với Brand / Nhãn hàng.                       │
│  • PIPELINE NỘI BỘ 8 BƯỚC: Gửi mẫu ➔ Kịch bản ➔ Video ➔ Mã Ads ➔ GMV/ROI       │
│  • NHÂN SỰ 3 BÊN THEO JOB: Booking PIC (KOC) • Growth PIC (Ads) • Account PIC │
└────────────────────────────────────────────────────────────────────────────────┘
```

> ⚠️ **LƯU Ý CỐT LÕI NGHIỆP VỤ UPBASE:**
> - Một KOC (ví dụ *Mega Uri, Võ Hà Linh, Chanh Beauty*) có thể được **Brand A duyệt** cho Job sản phẩm X, nhưng lại bị **Brand B từ chối** cho Job sản phẩm Y trong cùng một tháng.
> - Trạng thái phê duyệt Brand, lý do từ chối, tiến độ xuất kho mẫu, link video và mã Spark Ads **HOÀN TOÀN THUỘC VỀ CẤP ĐỘ JOB**, tuyệt đối không gắn cứng lên hồ sơ KOC Master.

### 1.1. Hệ Thống 4 Trường Phân Loại KOC/KOL Cốt Lõi (Taxonomy Specifications)
Hệ thống chuẩn hóa 4 trường phân loại tác nghiệp trích xuất từ cấu trúc dữ liệu thực tế tại File Quản Lý Booking (Sheet 3.1, 3.2, 5.4, 5.6):

1. **Trường `KL` (Khung Lương Booking Net) — Nguồn: Sheet 3.1 & Sheet 5.6:**
   - `TAP UpAffiliate`: 0đ (thuần hoa hồng / KOC tự động kéo affiliate)
   - `KL1`: 0 - 500.000 VNĐ
   - `KL2`: 500.000 - 1.500.000 VNĐ
   - `KL3`: 1.500.000 - 3.000.000 VNĐ
   - `KL4`: 3.000.000 - 5.000.000 VNĐ
   - `KL5`: 5.000.000 - 10.000.000 VNĐ
   - `KL6`: 10.000.000 - 30.000.000 VNĐ
   - `KL7`: > 30.000.000 VNĐ (Celeb / Mega)
   - `TAP đối tác ngoài`: Booking thông qua MCN / Agency bên ngoài

2. **Trường `Segment` (Phân Nhóm Creator) — Nguồn: Sheet 3.2 (Col 81) & Sheet 5.6:**
   - `Massive Creator`: Bao gồm TAP UpAffiliate, KL1, KL2, KL3 (< 3M). Phủ diện rộng, ra GMV dài hạn, tối ưu chi phí (không mất phí ads/SDHA).
   - `Mid Creator`: Bao gồm KL4, KL5 (3M - 10M). Review chuyên sâu, tương tác gắn kết, chuyển đổi đơn ổn định.
   - `Key Creator`: Bao gồm KL6 (10M - 30M). Nhận diện thương hiệu mạnh, đẩy số bùng nổ, dùng quyền Spark Ads kéo scale.
   - `Top Creator`: Bao gồm KL7 (> 30M). Celebrity / Macro KOL đỉnh cao, bảo chứng uy tín thương hiệu, chiến dịch lớn (D-Day/Mega).

3. **Trường `🌟Tệp kênh` (Tệp Kênh / Channel Niche) — Nguồn: Sheet 3.1 (Col 23) & Sheet 5.4:**
   - 25 tệp kênh chuẩn hóa trong vận hành Upbase:
     - *Review / Mua sắm:* `Review Nữ`, `Review Nam`, `Unboxing`, `Seller`
     - *Mẹ & Bé / Gia đình:* `Mẹ bé (bầu)`, `Mẹ bé (bé)`, `Gia đình`, `Couple`
     - *Làm đẹp & Sức khỏe:* `Beauty`, `Health`, `Makeup Artist`, `Tóc`, `Bác sỹ/chuyên gia`, `Gym`, `Eat Clean`
     - *Thời trang:* `Thời trang (review)`, `Thời trang (có kiến thức)`
     - *Đời sống & Ngách:* `Lifestyle`, `Nhà cửa đời sống`, `Cooking`, `Thú cưng`, `POV`, `Dance`, `Cosplay`, `Tin tức`, `LGBT`, `KOL`, `Nữ xinh`

4. **Trường `KOC category` (Ngành Hàng / Lĩnh Vực KOC) — Nguồn: Sheet 3.2 (Col 87) & Sheet 5.4:**
   - 9 nhóm danh mục ngành hàng cốt lõi:
     1. `Personal care`: Mỹ phẩm, chăm sóc cá nhân, da liễu, tóc
     2. `Mom and baby`: Mẹ và bé, phụ nữ mang thai, đồ trẻ em
     3. `Reviewer`: KOC chuyên nghề review trải nghiệm đa sản phẩm
     4. `Lifestyle`: Cuộc sống, thể thao, sức khỏe
     5. `Fashion`: Thời trang, quần áo, phụ kiện
     6. `ELHA`: Thiết bị điện gia dụng, đồ dùng nhà cửa, decor
     7. `F&B`: Thực phẩm, đồ uống, ẩm thực, nấu nướng
     8. `Social / Comedian`: Hài hước, tình huống sáng tạo, giải trí
     9. `Travel/Hospitality`: Du lịch, trải nghiệm khách sạn, dịch vụ

---

## 🛠️ 2. QUY TRÌNH TÁC NGHIỆP CỦA NHÂN VIÊN BOOKING

### 2.0. Tiếp Nhận, Khởi Tạo & Quản Lý Hồ Sơ KOC 360° (Chuẩn 65 Cột Dữ Liệu B2C Upbase)
* **Nguồn dữ liệu gốc:** Tệp đồng bộ hoá trực tiếp từ Lark Base vận hành của Upbase (`B2C_Quản lý Booking_3.1 Listing KOCs_All (Đồng bộ hoá).csv` - 65 cột).
* **Màn hình thao tác:** Menu `Booking Content Execution` ➔ Tab `2. Danh Bạ KOC, Hồ Sơ & Lịch Sử Booking`:
  - Nút `+ Thêm KOC Mới`: Mở modal khởi tạo chuẩn 65 trường với tính năng tự động phát hiện khung lương và gán các trường hậu cần nhận mẫu.
  - Nút `Hồ Sơ 360°`: Modal phân tách 4 Tab chi tiết cho từng KOC:
    1. **Tab 1: Hiệu Suất E-Commerce & GMV TikTok Shop:** Báo giá Net, Followers, View TB, GMV Best case (Kỷ lục 1 campaign), AOV (Giá trị đơn trung bình), GPM, Cơ cấu nguồn GMV (% Video ngắn, % Livestream, % Thẻ sản phẩm Showcase).
    2. **Tab 2: Nhân Khẩu Học & Tệp Khán Giả:** Tỉ lệ Giới tính (Nữ % vs Nam %), Cơ cấu độ tuổi (18-24 Gen Z, 25-34 Sức mua cao, >35 Trưởng thành), Khuyến nghị độ khớp với gian hàng mỹ phẩm/mẹ bé.
    3. **Tab 3: Hậu Cần Gửi Mẫu & Vận Hành:** Thông tin nhận hàng (Địa chỉ đầy đủ, Tên người nhận, SĐT giao hàng mẫu vật lý), Khu vực địa lý (Hà Nội, TP.HCM, Miền Bắc, Miền Nam...), Booking PIC phụ trách, Định dạng booking (Video, Live, Affiliate), Content note từ UpBase.
    4. **Tab 4: Pháp Lý & Lịch Sử Từng Job Với Brand:** Họ tên CCCD, Số CCCD, Ngân hàng, STK, Bảng lịch sử 100% jobs theo Brand (*Royal Ausnz, Bye Bye Blemish, pHCare...*) hiển thị rõ phê duyệt của từng Brand (`ĐÃ_DUYỆT` / `TỪ_CHỐI` kèm lý do), Pipeline và ROI thực tế.

### 2.0a. Bàn Làm Việc Kế Hoạch Cá Nhân (My Plan Workspace — Tab 0 Phân Hệ Booking)
* **Mục tiêu:** Chuyển hóa chỉ tiêu Top-Down từ Trưởng phòng thành bản kế hoạch hành động cụ thể từng tuần (W1 - W4) cho từng chuyên viên.
* **Cơ chế hoạt động:**
  1. **Thẻ Tóm Tắt Hạn Mức Giao (Assigned Quota Summary):** Hiển thị hạn mức video đã giao, ngân sách dự kiến, target GMV, và cơ cấu 4 Tier (`T1 Celeb | T2 Macro | T3 Micro | T4 Nano`).
  2. **Thanh Tiến Độ Lấp Đầy (Plan Fill Rate Tracker):** Theo dõi số slot KOC nhân viên đã lên kế hoạch so với hạn mức (ví dụ: `28/35 Clips (80%)`).
  3. **Bộ Lọc Phân Rã Theo Tuần (W1 ➔ W4):** Cho phép nhân sự phân bổ nhịp độ lên sóng chiến dịch:
     - `W1: Mở Màn & Teasing`: Khơi gợi tò mò, giới thiệu USP.
     - `W2: Đẩy Mạnh Social Proof & Review`: Micro KOC đánh mạnh trải nghiệm thực tế.
     - `W3: Mega D-Day & Livestream Push`: Top Creator bùng nổ traffic, kích hoạt mua sắm voucher.
     - `W4: Về Đích & Tối Ưu Tồn Kho`: Nano Affiliate quét đơn vét.
  4. **Modal Thêm Slot KOC Vào Kế Hoạch (`+ Lên Slot KOC Mới`):**
     - Cho phép chọn nhanh Creator từ danh bạ 5.700 KOCs hoặc gõ tên KOC mới.
     - Gán nhãn hàng, sản phẩm, định dạng (Video / Live), ngân sách ước tính và GMV mục tiêu.
  5. **Quy Trình Trình Duyệt & Chuyển Đổi Deal (Plan Lifecycle):**
     - Trạng thái `DRAFT (Bản nháp)` ➔ Bấm `📤 Gửi Trình Duyệt Lên Trưởng Phòng` chuyển sang `SUBMITTED (Chờ Trưởng phòng duyệt)`.
     - Sau khi Trưởng phòng duyệt (`APPROVED`), nút `⚡ Kích Hoạt Deal Booking` sáng lên: 1 chạm tự động khởi tạo Deal chính thức kèm mã định danh `BO26_xxxxxx`, chuyển ngay sang khâu Trình Ký Hợp Đồng & Tạm Ứng Đợt 1.

### 2.1. Quy Trình Vận Hành Từng Job & Phê Duyệt Brand (Pipeline 8 Bước Chuẩn Lark Base)
Mỗi Job booking trong hệ thống bắt buộc trải qua luồng tác nghiệp chuẩn hóa:
1. **Bước 1: Khởi Tạo Job & Trình Brand Duyệt (Job Initiation & Brand Approval):**
   - Nhân viên Booking chọn KOC từ danh bạ, gán Brand/Gian hàng (*Kutieskin, Bye Bye Blemish, Royal Ausnz, pHCare, Babe...*), Sản phẩm booking, Đợt booking (Đợt 1/2/3).
   - Job được đưa vào trạng thái `CHỜ_DUYỆT`.
   - **Phê duyệt của Brand:**
     - Nếu Brand **ĐỒNG Ý**: Trạng thái chuyển sang `ĐÃ_DUYỆT`, cấp mã BO, cho phép sinh hợp đồng và chuyển sang bước cọc tạm ứng.
     - Nếu Brand **TỪ CHỐI**: Trạng thái chuyển sang `TỪ_CHỐI`, bắt buộc nhập **Lý do từ chối** (*Lệch định vị, Sai tệp khách hàng, Chi phí vượt budget, Yêu cầu creator Bác sĩ/Chuyên môn*). Job dừng lại và lưu vào báo cáo từ chối.
2. **Bước 2: Hợp Đồng & Tạm Ứng Đợt 1 (Advance Payment):**
   - Sau khi Brand duyệt, hệ thống tự động sinh Hợp đồng pháp lý PDF (jsPDF) kèm mã VietQR thanh toán ➔ Kế toán duyệt chi tạm ứng.
3. **Bước 3: Xuất Kho & Gửi Mẫu Sản Phẩm (Sample Dispatch):**
   - Kho căn cứ địa chỉ nhận mẫu từ hồ sơ KOC để gửi sản phẩm thực tế. Cập nhật trạng thái: `Chưa gửi` ➔ `Đang giao` ➔ `Đã nhận mẫu`.
4. **Bước 4: Phối Hợp Kịch Bản Nội Dung (Script Review - SLA 24h):**
   - KOC nộp kịch bản video ➔ Content Team & Brand duyệt kịch bản theo SLA 24h.
5. **Bước 5: Thẩm Định Video Nháp & Gắn Giỏ Hàng (Draft Review - SLA 12h):**
   - KOC quay và gửi bản nháp ➔ Kiểm duyệt hashtag, âm thanh bản quyền, gắn sản phẩm TikTok Shop.
6. **Bước 6: Nghiệm Thu Video Lên Sóng & Mã Spark Ads (Video & Ads Verification):**
   - KOC đăng video chính thức ➔ Nhân viên booking cập nhật link video TikTok.
   - **Nghiệm thu mã Ads:** Kiểm tra và nghiệm thu mã ủy quyền quảng cáo Spark Ads để Growth Team chạy Ads (Tránh sự cố Plan Gap ngân sách như ở gian hàng pHCare).
7. **Bước 7: Quyết Toán Đợt 2 (Tất Toán & Kế Toán):**
   - Kế toán đối soát và tất toán đợt 2 qua VietQR. Job chuyển sang trạng thái `Done`.
8. **Bước 8: Đo Lường GMV 30 Ngày & Đánh Giá Tái Ký (ROI & Winner Analysis):**
   - Hệ thống tự động ghi nhận doanh số GMV 30 ngày từ TikTok Shop Affiliate:
     $$\text{ROI} = \frac{\text{GMV 30 Ngày}}{\text{Chi Phí Booking}}$$
   - Phân loại chỉ báo: *Winner Top 20 (GMV > 30M), Hoàn vốn (ROI >= 1.0), Có GMV (GMV > 0).* Cập nhật kết quả vào Lịch sử hợp tác của KOC để phục vụ tái ký.

---

## 📊 3. HỆ THỐNG MÀN HÌNH QUẢN TRỊ DÀNH CHO TRƯỞNG PHÒNG

### 3.0. Màn Hình Cốt Lõi: Quản Lý Chỉ Tiêu Top-Down 2 Cấp Theo Tháng (Two-Level Monthly Quota Management)
Hệ thống quản lý chỉ tiêu của Trưởng phòng được chuẩn hóa theo mô hình **Top-Down 2 Cấp (Two-Level Top-Down Quota Model)** quản lý tách bạch theo từng **Tháng** cụ thể (*Tháng 8/2026 - Đã chốt, Tháng 9/2026 - Đang chạy, Tháng 10/2026 - Dự thảo Q4*):

#### A. Cấp 1: Quản Trị Hạn Mức 4 Tier KOC / KOL Toàn Phòng (Master Tier Quotas by Month)
Trưởng phòng thiết lập và chốt trần số lượng video, ngân sách và đơn giá dự kiến theo 4 Tier KOC/KOL trước khi phân bổ cho nhân viên:
1. **Tier 1 — Celebrity & Mega KOL (Khung lương KL7 >25M):**
   - Vai trò: Đại sứ thương hiệu, bùng nổ nhận diện, bảo chứng chất lượng và kéo traffic đột phá.
   - Định mức chuẩn T8: **24 clips** • Ngân sách trần: **990.200.000 đ** (~34.9% trần phòng) • Đơn giá TB: **~41.258.000 đ/clip**.
2. **Tier 2 — Macro Creator (Khung lương KL6 10M - 25M):**
   - Vai trò: Creator chuyên môn sâu ngành hàng, kéo tương tác mạnh và educate tính năng cốt lõi.
   - Định mức chuẩn T8: **63 clips** • Ngân sách trần: **926.300.000 đ** (~32.7% trần phòng) • Đơn giá TB: **~14.703.000 đ/clip**.
3. **Tier 3 — Micro Creator (Khung lương KL4 - KL5 2.5M - 10M):**
   - Vai trò: Bác sĩ, dược sĩ, chuyên gia da liễu và mẹ bỉm tạo độ tin cậy cộng đồng (Social Proof), thúc đẩy chuyển đổi trực tiếp.
   - Định mức chuẩn T8: **127 clips** • Ngân sách trần: **637.400.000 đ** (~22.5% trần phòng) • Đơn giá TB: **~5.018.000 đ/clip**.
4. **Tier 4 — Nano & Affiliate KOC (Khung lương KL1 - KL3 <2.5M & KOC thuần affiliate):**
   - Vai trò: Mạng lưới affiliate phủ rộng quy mô lớn, unboxing, review hàng loạt, gắn giỏ hàng TikTok Shop & Shopee.
   - Định mức chuẩn T8: **5.434 clips** • Ngân sách trần: **1.127.500.000 đ** • Đơn giá TB: **~207.000 đ/clip**.
* **Thanh kiểm soát cân đối Tier (Tier Balance Tracker):** Hiển thị số video Tier đã giao cho nhân viên vs Hạn mức trần của Tier đó. Trạng thái: Cân đối 100% (Xanh lá), Còn trống X clips chưa giao (Xanh dương), Cảnh báo vượt trần +Y clips (Đỏ).
* **Modal Cấu Hình Hạn Mức 4 Tier:** Cho phép Trưởng phòng chỉnh sửa trần video và ngân sách của 4 Tier cho từng tháng, tự động tính lại đơn giá TB/clip và tổng trần toàn phòng.

#### B. Cấp 2: Bảng Ma Trận Phân Bổ Đa Chiều (Multi-Dimensional Matrix Allocation Grid) & Soi Plan Nhân Viên (Inspector Modal)
Từ hạn mức 4 Tier đã chốt ở Cấp 1, Trưởng phòng phân rã và giám sát kế hoạch của 26 chuyên viên booking qua Bảng Ma Trận tương tác cao:
* **3 Chế Độ Góc Nhìn Ma Trận (View Mode Switcher):**
  1. `4_TIER (Cơ cấu 4 Phân khúc KOC)`: [26 Nhân sự] × [Tier 1 Celeb, Tier 2 Macro, Tier 3 Micro, Tier 4 Nano]. Giúp đối soát trực tiếp với trần Master Quota toàn phòng.
  2. `BRANDS (Phân rã theo Nhãn hàng)`: [26 Nhân sự] × [Senka, Cure Natural, Bio-Essence, Peripera, Kutieskin, Royal Ausnz]. Giám sát độ phủ nhân sự theo từng tài khoản Brand.
  3. `WEEKS (Nhịp độ chiến dịch 4 Tuần)`: [26 Nhân sự] × [W1 Mở màn, W2 Đẩy số, W3 Mega D-Day, W4 Về đích]. Đảm bảo dồn đúng lực lượng creator vào tuần cao điểm D-Day.
* **Thanh Đối Soát 3 Tầng Real-Time (3-Tier Real-Time Reconciliation Footer):**
  - **Dòng 1 - Tổng Phân Bổ 26 Nhân Sự:** Tổng cộng số video (T1, T2, T3, T4), Ngân sách và GMV đã phân bổ cho toàn bộ nhân sự.
  - **Dòng 2 - Trần Hạn Mức Plan Tổng Toàn Phòng:** Giá trị trần được duyệt từ Cấp 1.
  - **Dòng 3 - Gap Đối Soát / Headroom Còn Trống:** Đánh giá độ chênh lệch. Hiển thị badge xanh `✅ Cân đối 100%` hoặc `Còn trống X slots` khi trong ngưỡng an toàn; hiển thị cảnh báo đỏ `⚠️ Vượt trần +Y slots` nếu phân bổ vượt quá hạn mức phòng.
* **Tính Năng Soi Kế Hoạch Chi Tiết Của Nhân Viên (`EmployeePlanInspectorModal`):**
  - Trưởng phòng bấm nút `👁️ Soi Plan` tại bất kỳ dòng nhân sự nào để thẩm định kế hoạch chi tiết mà nhân viên đã lập.
  - **Reconciliation Header:** Đối chiếu tỷ lệ Lấp đầy kế hoạch (Plan Fill Rate = Số slot đã lập / Chỉ tiêu giao), Ngân sách đã lập vs Ngân sách giao, Target GMV đã cam kết.
  - **Matrix Target vs Plan Breakdown:** Bảng so sánh 4 Tier (Mục tiêu giao vs Số slot KOC nhân viên đã đưa vào danh sách).
  - **Bộ Lọc & Tìm Kiếm:** Lọc theo Tuần (W1-W4), Phân khúc Tier, hoặc tìm kiếm theo tên KOC/Kênh TikTok.
  - **Bảng Danh Sách Slot KOC Tác Nghiệp:** Hiển thị KOC, Kênh, Khung lương, Phân khúc, Nhãn hàng, Ngân sách ước tính, GMV kỳ vọng, Tuần lên sóng, Trạng thái (`DRAFT`, `SUBMITTED`, `APPROVED`, `REVISION_REQUESTED`, `CONVERTED`), và Ghi chú nội bộ.
  - **3 Quyền Quản Trị Của Trưởng Phòng (Lead Governance Actions):**
    1. `Duyệt Từng Slot / Duyệt Toàn Bộ Kế Hoạch (Approve Plan)`: Gửi feedback chấp thuận và mở khóa quyền chuyển đổi Deal cho nhân viên.
    2. `Yêu Cầu Chỉnh Sửa Kế Hoạch (Request Revision)`: Nhập ghi chú phản hồi yêu cầu nhân viên đổi KOC hoặc cân đối lại ngân sách.
    3. `Khởi Tạo Hàng Loạt Booking Deals (Batch 1-Click Deal Creation)`: Tự động chuyển toàn bộ các slot KOC đã duyệt sang Deal Booking chính thức trong phân hệ Quản lý Booking.

### 3.0b. Màn Hình Tác Nghiệp: Phân Bổ KOC/KOL Từ Yêu Cầu Growth (Growth Demand Breakdown Cockpit)
Màn hình chuyên biệt dành cho nhân sự Booking khi nhận đề bài chiến dịch từ Team Growth:
1. **Tiếp Nhận Yêu Cầu Từ Growth:**
   - Đề bài gồm: Mã chiến dịch, Nhãn hàng/Gian hàng, Tổng Ngân Sách Được Cấp, Target GMV, CIR kỳ vọng (Cost-to-Income Ratio), Hạn chót lập plan (SLA 24h) và Ghi chú định hướng SKU/Hook.
2. **Bàn Làm Việc Phân Rã (Breakdown Workspace):**
   - **Đồng hồ kiểm soát Headroom thời gian thực:** Hiển thị tức thời Ngân sách đã phân rã vs Ngân sách được cấp (Cảnh báo Over-Budget), % Đạt Target GMV, CIR Dự phóng (So sánh với CIR trần của Growth).
   - **Gợi ý phân bổ 1-Click thông minh:**
     - `🚀 Tối Đa Hóa GMV`: Tập trung 60% ngân sách vào Micro KOC và Mass Affiliate để bùng nổ chuyển đổi trong ngày D-Day.
     - `👑 Nhận Diện & Trust`: Dành 50% ngân sách cho Celeb Tier 1 và Macro KOL để mở phễu nhận diện và kéo niềm tin thương hiệu.
     - `⚖️ Tỷ Lệ Vàng Upbase`: Phân bổ chuẩn 4 cấp (20% Celeb, 30% Macro, 35% Micro, 15% Affiliate).
   - **Lưới dữ liệu tương tác 4 Level KOC/KOL:**
     - Cho phép chỉnh sửa số lượng KOC (+/-), đơn giá dự kiến, GMV kỳ vọng / KOC (có hiển thị benchmark ROI lịch sử).
     - Tự động re-calculate tổng chi phí, tỷ trọng ngân sách, tổng GMV và ROI dự kiến của từng Level.
   - **Ghi chú chiến lược của Booking PIC:** Nhập pool KOC dự kiến, góc quay, thỏa thuận độc quyền và rủi ro.
3. **Thao Tác Duyệt & Chuyển Giao Tác Nghiệp:**
   - `Lưu Bản Nháp (Save Draft)`: Lưu trạng thái làm việc.
   - `Trình Duyệt (Submit Approval)`: Bàn giao kế hoạch sang Growth Lead và Trưởng phòng phê duyệt.
   - `Duyệt & Khởi Tạo Booking Deals`: Tự động sinh danh sách các deal booking vào phân hệ Quản Lý Booking để nhân viên bắt đầu tiếp cận KOC.

### 3.1. Báo Cáo 1: Tiến Độ Air & Chi Tiêu Ngân Sách Của 26 Nhân Sự Booking
Theo dõi 26 nhân sự thực tế của Upbase:
* **Các cột số liệu:** `Tháng`, `Nhân sự Booking`, `Plan số video` (Tổng 5.648), `Report số video` (Tổng 1.407), `Tiến độ air` (TB 65%), `Plan hiệu suất video` (TB 105.8), `Report hiệu suất video` (TB 51.72), `Tỉ lệ nghiệm thu sai` (0.00%), `Plan ngân sách` (Tổng 3,68 Tỷ đ), `Report ngân sách` (Tổng 2,85 Tỷ đ), `Tiến độ ngân sách` (TB 74%).
* **Cảnh báo chậm tiến độ:** Nhận diện các nhân sự có tiến độ air thấp (<50%) (*Vũ Hoài Lâm 14%, Ôn Ngọc Hà 16%, Lê Thanh Hải 17%, Dương Thị Hồng Nhung 24%...*).

### 3.2. Báo Cáo 2: Hiệu Quả Doanh Thu & Tăng Trưởng GMV Theo Nhân Sự
* **Các cột số liệu:** `Nhân sự Booking`, `Tiến độ ngân sách`, `Số KOC book mới` (Tổng 243 KOCs), `(This month) GMV 30 ngày` (Tổng 1,36 Tỷ đ), `(Last month) GMV 30 ngày` (Tổng 2,39 Tỷ đ), `Tăng trưởng GMV 30 ngày` (TB 22,51%), `ROI`.
* **Top nhân sự gánh doanh số:** Đinh Thị Bích Liên (332,5M đ), Hà Thị Thùy (158,4M đ), Bùi Thu Hằng (120,2M đ), Lê Phương Thảo (111,3M đ), Lương Nguyễn Trang Nhung (103,1M đ)...

### 3.3. Báo Cáo 3: Phân Tích Nguyên Nhân Plan Gap Ngân Sách (Hụt 466 Triệu Đồng)
Phân loại 5 nhóm nguyên nhân khiến chi tiêu thực tế (2,85 Tỷ) thấp hơn kế hoạch (3,37 Tỷ):
1. **Thiếu capacity triển khai (Hụt 203,2 Triệu đ):** Thiếu nhân sự/KOC tại cụm gian *EUPC, Natural Care, Keyshu, Lipit, Herbal Care*.
2. **Con người / vận hành nội bộ (Hụt 123,5 Triệu đ):** Chậm trễ quy trình tại cụm gian *Bye Bye Blemish*.
3. **Thay đổi plan ngân sách trong quá trình triển khai (Hụt 70,8 Triệu đ):** Cụm gian *Kutieskin Mama, Dynik*.
4. **Hệ thống chưa nghiệm thu chi phí mã Ads (Hụt 50,0 Triệu đ):** Cụm gian *pHCare*.
5. **Chưa có giải pháp mới với Brand (Hụt 19,3 Triệu đ):** Cụm gian *Doji, Meracine*.

### 3.4. Báo Cáo 4: Kế Hoạch Tháng (Plan vs Revise vs Actual) & Báo Cáo Đa Chiều
* Tổng thể Marketing B2C (Video Affiliate, Self Channel, Live Affiliate, Campaign).
* Phân tích 7 Khung lương (KL1 ➔ KL7).
* Phân tích 6 Trụ cột Content Pillar & 10 Nhóm Tệp Creator.
* Nhận định quy luật Winner Video: Top 20 video (3,2%) gánh 55,8% GMV (709,4M đ).

---

## 🏛️ 4. PHÂN HỆ CỔNG TÁC NGHIỆP DÀNH RIÊNG CHO KHÁCH HÀNG (UPBASE BRAND CLIENT HUB)

Nhằm giải quyết triệt để rào cản trao đổi qua Zalo/Lark, tránh trôi tin nhắn và tam sao thất bản, hệ thống cung cấp phân hệ **Brand Client Hub (Brand Review Portal)** theo quy trình 4 chặng tuần tự nghiêm ngặt (4-Stage Gated Pipeline):

### 4.1. Chặng 1: 📋 Brand Duyệt Kế Hoạch Ngân Sách (Bắt Buộc Trước)
- **Đề bài Kế hoạch:** Tổng Ngân Sách Gói, Target GMV, CIR kỳ vọng (Cost/Income), Danh sách Hero SKUs, Big Idea chiến dịch.
- **Bảng Cơ Cấu 4 Level KOC:**
  - *Level 1 (Celeb / Mega KOL):* Mở phễu nhận diện, bảo chứng uy tín thương hiệu.
  - *Level 2 (Macro KOL):* Đào sâu công dụng, test chất sản phẩm và educate người dùng.
  - *Level 3 (Micro KOC):* Tạo độ tin cậy cộng đồng (Social Proof) từ sinh viên, nhân viên văn phòng.
  - *Level 4 (Nano & Mass Affiliate):* Phủ sóng giỏ hàng TikTok Shop trong 3 ngày D-Day.
- **Thao tác:** Brand bấm `✅ Duyệt Thông Qua Kế Hoạch` hoặc `🔄 Yêu Cầu Điều Chỉnh Plan` (nhập form góp ý).
- **Quy tắc khóa cổng (Gating Rule):** Hệ thống chỉ mở khóa Chặng 2 sau khi Chặng 1 đã được Brand duyệt (`BRAND_PLAN_APPROVED`).

### 4.2. Chặng 2: 👥 Brand Duyệt Danh Sách KOC Đề Xuất
- Hiển thị danh sách KOC tương ứng với cơ cấu đã duyệt ở Chặng 1.
- Hồ sơ KOC chuẩn Client: Kênh TikTok, Followers, Lượt xem TB, Tỷ lệ tương tác, Thẻ ngành hàng, 2 Clip mẫu tương tự.
- **Thao tác:** 
  - `✅ Đồng Ý KOC`: Mở khóa tiến trình ký kết và gửi sample.
  - `🔄 Đổi KOC Khác`: Mở popup chọn lý do chuẩn hóa (*Lệch định vị, Từng booking đối thủ, Rủi ro hình ảnh, Chất giọng chưa phù hợp...*) để Booking đổi KOC khác trong vòng 24h.

### 4.3. Chặng 3: ✍️ Brand Thẩm Định Kịch Bản (SLA 24h)
- Kịch bản được chuẩn hóa 4 phần:
  1. *Hook 3s đầu:* Giữ chân người xem trong 3 giây vàng.
  2. *Nỗi đau khách hàng:* Tình huống thực tế đời thường.
  3. *Giải pháp & USP Sản phẩm:* Trải nghiệm chân thực, màng lọc công nghệ, test texture.
  4. *Kêu gọi mua hàng (CTA):* Mã voucher độc quyền và hướng dẫn bấm giỏ hàng.
- **Đồng hồ đếm ngược SLA 24h:** Hiển thị thời gian còn lại để Brand phản hồi.
- **Quy tắc giới hạn phản hồi:** Giới hạn tối đa **2 lần chỉnh sửa** để bảo vệ tính sáng tạo tự nhiên của Creator.

### 4.4. Chặng 4: 🎬 Nghiệm Thu Video & Báo Cáo Tiến Độ (Live Cockpit)
- Xem bản xem trước video nháp (có đóng dấu Watermark "Bản Duyệt Nháp Upbase").
- Live Ticker: Số clip đã lên sóng / Tổng số clip cam kết, Lượt view thực tế, Link video TikTok trực tiếp.
- Doanh thu GMV tạm tính từ link Affiliate & Giỏ hàng sàn.

### 4.5. Chính Sách Bảo Mật Dữ Liệu Khách Hàng (Data Masking)
- **Ẩn toàn bộ Rate Card Net:** Brand chỉ nhìn thấy giá trị gói dịch vụ, tuyệt đối không nhìn thấy thù lao thực trả cho KOC.
- **Ẩn dữ liệu PII của KOC:** Ẩn số điện thoại cá nhân, Zalo cá nhân, CCCD, tài khoản ngân hàng của Creator.
- **Cơ chế Magic Link:** Cung cấp đường dẫn bảo mật có mã xác thực token 1-chạm gửi cho Brand Manager.

---

## 🎯 5. MÔ HÌNH PHÂN BỔ KẾ HOẠCH TOP-DOWN & BẢNG MA TRẬN ĐA CHIỀU (PLANNING & MATRIX RECONCILIATION)

Nhằm tối ưu hóa năng lực điều hành của Trưởng Phòng và giải quyết triệt để bài toán phân bổ chỉ tiêu xuống 26 chuyên viên Booking, hệ thống chuẩn hóa mô hình **Two-Level Top-Down Allocation**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ CẤP 1: QUẢN LÝ TRẦN ĐỊNH MỨC 4 TIER KOC/KOL (TRƯỞNG PHÒNG THIẾT LẬP)     │
│ • Trần Video Toàn Phòng (Target Videos)                                │
│ • Trần Ngân Sách Khống Chế (Ceiling Budget)                            │
│ • Đơn Giá Trung Bình Dự Kiến & Tỷ Trọng Theo 4 Tier                    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Phân bổ xuống 26 Chuyên Viên
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ CẤP 2: BẢNG MA TRẬN PHÂN BỔ ĐA CHIỀU (MULTI-DIMENSIONAL MATRIX TABLE)  │
│ 1. Ma Trận 4 Tier: Số lượng clip T1 Celeb, T2 Macro, T3 Micro, T4 Nano │
│ 2. Ma Trận Nhãn Hàng (Brands): 6 nhãn hàng phân công cho từng chuyên viên│
│ 3. Ma Trận Tuần (Weeks): Phân bổ tiến độ lên sóng từ Tuần 1 đến Tuần 4   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Nhân viên triển khai KOC chi tiết
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ CẤP 3: WORKSPACE KẾ HOẠCH CÁ NHÂN (MY PLAN WORKSPACE) & DUYỆT PLAN     │
│ • Nhân viên lập danh sách KOC dự kiến: Brand, Tier, Tệp kênh, Budget   │
│ • Fill Rate Tracker: Đo lường độ lấp đầy KOC so với chỉ tiêu được giao │
│ • Luồng Trạng Thái: DRAFT ➔ SUBMITTED ➔ APPROVED ➔ CONVERTED           │
│ • Modal "Soi Plan": Trưởng phòng thẩm định, góp ý sửa hoặc duyệt       │
│ • Batch Deal Conversion: Chuyển đổi hàng loạt KOC đã duyệt sang Deals  │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.1. Cơ Chế Đối Soát 3 Cấp Tại Footer Bảng Ma Trận (Headroom Reconciliation)
Footer của Bảng Ma Trận Phân Bổ luôn duy trì 3 hàng đối soát tức thời (Real-time Headroom):
1. **Hàng 1 - Tổng Phân Bổ (26 Nhân Sự):** Tính tổng thực tế các chỉ tiêu đã giao cho toàn bộ chuyên viên (Video, Ngân sách, Target GMV, Clips đã lập).
2. **Hàng 2 - Trần Plan Tổng (Trưởng Phòng):** Hiển thị hạn mức trần bất biến của tháng do Trưởng Phòng chốt.
3. **Hàng 3 - Gap Đối Soát (Headroom Balance):**
   - **Xanh Lá (`✓ Khớp`):** Chỉ tiêu phân bổ khớp 100% với trần kế hoạch.
   - **Vàng (`Trống X clips` / `Còn Y triệu`):** Ngân sách hoặc số video chưa được phân bổ hết, còn dư capacity.
   - **Đỏ (`Vượt +X clips` / `Vượt Y triệu`):** Cảnh báo vi phạm trần ngân sách hoặc quá tải nhân sự.

### 5.2. Chuẩn Hóa UI/UX Doanh Nghiệp (Enterprise Data-Dense Experience)
- **Cố Định Cột Đầu (Sticky Left Column):** Cột `Nhân Sự & Vị Trí` được cố định (`sticky left-0 bg-[#0c121e] z-10 border-r`) khi cuộn ngang trên các màn hình có nhiều cột ma trận.
- **Phân Quyền Hiển Thị (Role-Aware UI):**
  - Khi Trưởng Phòng (`MANAGER`) đăng nhập: Mở khóa các nút thiết lập trần 4 Tier, cân bằng tải tự động, nút sửa hạn mức từng chuyên viên, và nút duyệt/chuyển deal.
  - Khi Nhân Viên hoặc Khách Hàng đăng nhập: Bảng tự động chuyển sang chế độ **Giám Sát (Read-Only Observer Mode)** có banner thông báo rõ ràng, khóa toàn bộ các nút sửa trần định mức để đảm bảo an toàn số liệu.
