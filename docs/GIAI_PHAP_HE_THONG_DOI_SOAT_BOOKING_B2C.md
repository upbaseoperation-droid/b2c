# ĐẶC TẢ YÊU CẦU NGHIỆP VỤ & THIẾT KẾ GIẢI PHÁP HỆ THỐNG
## QUẢN LÝ VÀ ĐỐI SOÁT KẾ HOẠCH BOOKING B2C
*(Tài liệu chuẩn hóa phục vụ xây dựng phần mềm quản trị tập trung)*

---

## 1. BỐI CẢNH & CÁC VẤN ĐỀ VẬN HÀNH THỰC TẾ (PAIN POINTS)

Hiện tại, quy trình quản lý booking của Phòng Marketing B2C đang vận hành dựa trên **3 file Excel độc lập**:
1. **File 4.1 Plan order tổng:** Do bộ phận Tăng trưởng sàn (Growth) lập vào đầu tháng, ghi nhận mục tiêu doanh số (NMV), hạn mức ngân sách Gross/Net, chỉ tiêu số lượng video KOC và phiên livestream.
2. **File 4.1.1 Input plan:** Do các Chuyên viên Booking lập hàng tuần, phân rã chỉ tiêu tháng thành kế hoạch tuần (W1 – W5) theo từng nhóm KOC.
3. **File 3.2 List duyệt book:** Bảng theo dõi thực tế từng booking phát sinh trong tháng từ lúc đề xuất, gửi mẫu, tạm ứng, lên bài (air video) đến khi nghiệm thu thanh toán.

### Các bất cập cốt lõi rút ra từ thực tế vận hành:
* **Nguy cơ bội chi và chi ngoài kế hoạch:** Không có cơ chế kiểm soát trần chi phí tự động. Thực tế tháng 10/2026 đã ghi nhận gian hàng vượt trần ngân sách tới 20.1% (`Mine TikTok` vượt 39.7 triệu) hoặc vượt gần gấp 3 lần (`Bye Bye Blemish` vượt 9.6 triệu); đồng thời có những gian hàng ban đầu giao chi phí 0đ nhưng thực tế đã ký duyệt hàng trăm triệu (`BaBe TikTok` 221 triệu, `Revision TikTok` 74 triệu, `Ekseption TikTok` 59.7 triệu).
* **Lỗi nhập liệu thủ công (Nhầm cột dữ liệu):** Điển hình như trường hợp gian hàng `Lipit TikTok`, Brand đặt hàng 15 video ở cột Self-channel (Cột 107) thay vì cột Affiliate (Cột 27), dẫn đến hệ thống báo động sai lệch rằng nhân sự tự ý tăng ngân sách.
* **Chênh lệch cách hiểu giữa Gross và Net:** Growth và Kế toán theo dõi theo hạn mức Net (sau thuế), trong khi khi làm việc với KOC thường trao đổi theo giá Gross hoặc Net tay, dẫn đến lệch hạch toán nếu không quy đổi chuẩn.
* **Lẫn lộn giữa Video trả phí và Suất gửi mẫu miễn phí (FOC):** Tổng chỉ tiêu video trên bảng tổng thường rất lớn (hơn 7,000 video), nhưng thực chất >80% là các suất gửi mẫu miễn phí (chi phí 0đ). Nếu không bóc tách, báo cáo sẽ gây hiểu lầm nghiêm trọng về khối lượng ngân sách cần giải ngân.
* **Theo dõi nhân sự chưa phân tầng:** Trên file Order chỉ ghi 1 tên Leader, trong khi người trực tiếp chạy kế hoạch và nghiệm thu lại là các Chuyên viên cấp dưới. Khi đối soát 1-1, hệ thống không xác định đúng KPI và trách nhiệm xử lý SLA.

---

## 2. MÔ HÌNH NHÂN SỰ 2 TẦNG (2-TIER TEAM STRUCTURE)

Hệ thống mới cần cấu trúc rõ ràng mô hình tổ chức của Phòng Booking B2C:

```mermaid
flowchart TD
    Growth[Bộ phận Growth Sàn] -->|Giao hạn mức Order tổng| Leader[Trưởng nhóm Booking - Leader]
    Leader -->|Phân bổ ngân sách & chỉ tiêu tuần| Spec1[Chuyên viên Booking - Deal có phí]
    Leader -->|Phân bổ chỉ tiêu gửi mẫu FOC| Spec2[Chuyên viên Gửi mẫu FOC]
    Spec1 -->|Tạo hợp đồng & mã booking| Sys32[(Hệ thống Duyệt Book 3.2)]
    Spec2 -->|Cập nhật danh sách gửi mẫu| Sys32
```

### Phân định trách nhiệm:
1. **Cấp Trưởng Phòng (Lead B2C):** `Đặng Thị Yến Nhi`
   * Phụ trách chung toàn phòng, quản lý trần PnL và ngân sách toàn bộ 69 gian hàng B2C.
   * Ký duyệt kế hoạch tháng, phê duyệt hạn mức bổ sung (Top-up), đại diện ký biên bản các bên và duyệt hợp đồng/thanh toán.
2. **Cấp Trưởng nhóm (Leader / Account Owner):**
   * Xem thực tế tại Cột 55 File 4.1.1: Hiện tại chỉ có `Nguyễn Thị Ngọc Tâm` làm Trưởng nhóm phụ trách 8 gian hàng trọng điểm (`ClubClio TikTok/Shopee`, `Cindy Bloom`, `Mine`, `EUPC`, `L'Occitane`, `Bye Bye Blemish`, `Rejuran`).
   * Chịu trách nhiệm về tiến độ giải ngân chung, tỷ lệ hoàn thành ngân sách và hiệu quả doanh thu (NMV/GMV) của nhóm phụ trách.
   * Phê duyệt kế hoạch tuần của các chuyên viên trước khi gửi sang Growth.
3. **Cấp Chuyên viên thực thi (Specialist / PIC):**
   * Các nhân sự nhận order tại File 4.1 (Cột 25, 39, 60) và File 4.1.1 (Cột 3, 50) như `Lê Phương Thảo`, `Lương Thị Như Quỳnh`, `Lê Thanh Hải`, `Phạm Thị Thu Hằng`, `Hoàng Hải Long`, `Trần Hải Phượng`, `Phan Diệu Ánh`, `Vũ Hoài Lâm`, `Nguyễn Thị Mai Anh`... là **Chuyên viên thực thi**, không phải Leader.
   * Trực tiếp lập kế hoạch chi tiết tuần (Input plan): chọn KOC, đàm phán thù lao, xếp lịch lên bài.
   * Trực tiếp tạo mã booking, gửi sản phẩm mẫu, theo dõi tiến độ lên bài, thu thập link và làm thủ tục hợp đồng, nghiệm thu thanh toán.
   * Phân tách riêng nhân sự chuyên trách gửi mẫu miễn phí FOC (như `Trần Thị Hảo`) với nhân sự phụ trách deal KOC trả phí.
4. **Quy tắc gian hàng không có Leader:**
   * Đối với các gian hàng chỉ có 1 người phụ trách (toàn bộ các gian Shopee và nhiều gian TikTok) hoặc Cột 55 trong File 4.1.1 để trống, gian hàng ghi nhận **Không có leader** (`bookingLeader: undefined`).
   * Chuyên viên chủ động lập phân rã và trình duyệt trực tiếp lên Trưởng Phòng (`Đặng Thị Yến Nhi`) mà không cần bước sơ duyệt trung gian.

5. **Bước 0: Quy trình Phân công Gian hàng đầu kỳ (Resource Allocation Gate):**
   * Diễn ra ngay sau khi Growth giao Order tổng (ngày 26–28 hàng tháng) và phải hoàn thành trước khi mở quyền lập Input Plan.
   * Leader/Trưởng phòng chỉ định rõ: Gian hàng nào do Chuyên viên nào phụ trách deal có phí, ai phụ trách gửi mẫu FOC. Khi bấm `[Chốt Phân Công Đầu Kỳ]`, hệ thống mới mở quyền cho Chuyên viên vào tạo bản nháp Input Plan tuần.
6. **Cơ chế Lệnh Bàn Giao Giữa Kỳ có Ngày Hiệu Lực (Mid-Month Handover Protocol):**
   * Giải quyết triệt để rủi ro nhân sự nghỉ việc, nghỉ thai sản, chuyển nhóm hoặc chia tải giữa chừng.
   * Leader/Trưởng phòng tạo `Lệnh bàn giao` chỉ định: Chuyển giao từ Chuyên viên A sang Chuyên viên B, kèm **Ngày hiệu lực chuyển giao**.
   * Hệ thống tự động phân tách:
     * *Phần việc đã hoàn thành/Đã air trước ngày hiệu lực:* Giữ nguyên tên Chuyên viên A để tính đúng KPI/hoa hồng.
     * *Phần việc dở dang (đang gửi hàng, tạm ứng, chờ duyệt):* Chuyển quyền tiếp quản sang Chuyên viên B để tiếp tục theo dõi nghiệm thu.
     * *Kế hoạch các tuần tiếp theo:* Chuyển quyền sửa Input plan sang Chuyên viên B.
   * Toàn bộ lịch sử phân công được lưu tại bảng `STORE_ASSIGNMENT_HISTORY`.

---

## 3. MÔ HÌNH THỰC THỂ DỮ LIỆU (DOMAIN DATA MODEL)

Hệ thống phân cấp quản trị bắt đầu từ **Cấp Thương hiệu (Brand)** $\rightarrow$ **Gian hàng theo sàn (Store / Platform)** $\rightarrow$ **Phân công gian hàng (Store Assignment)** $\rightarrow$ **Kế hoạch tháng (Plan Order)** $\rightarrow$ **Kế hoạch tuần (Input Plan)** $\rightarrow$ **Thực tế thực thi (Actual Booking)** $\rightarrow$ **Hồ sơ hợp đồng & Ký điện tử (Contract & weSign)**:

```mermaid
erDiagram
    BRAND ||--o{ STORE : "sở hữu các gian hàng"
    BRAND ||--o{ BRAND_BUDGET : "ký ngân sách chiến dịch tổng"
    STORE ||--o{ STORE_ASSIGNMENT_HISTORY : "lưu vết phân công và bàn giao"
    STORE ||--o{ PLAN_ORDER : "nhận chỉ tiêu tháng theo sàn"
    PLAN_ORDER ||--o{ INPUT_PLAN_WEEKLY : "phân rã thành"
    STORE ||--o{ BOOKING_ACTUAL : "phát sinh thực tế"
    KOC_MASTER_PROFILE ||--o{ BOOKING_ACTUAL : "được book trong"
    BOOKING_ACTUAL ||--o| CONTRACT_RECORD : "lập hợp đồng dịch vụ"
    CONTRACT_TEMPLATE_SNAPSHOT ||--o{ CONTRACT_RECORD : "cố định mẫu theo hash"
    USER_ACCOUNT ||--o{ STORE_ASSIGNMENT_HISTORY : "nhân sự được phân công"
    USER_ACCOUNT ||--o{ PLAN_ORDER : "Leader/Lead quản lý"
    USER_ACCOUNT ||--o{ INPUT_PLAN_WEEKLY : "Specialist lập plan"
    USER_ACCOUNT ||--o{ BOOKING_ACTUAL : "Specialist thực thi"

    BRAND {
        string brand_id PK
        string brand_name
        string company_group
        decimal total_campaign_budget
        string brand_guideline
    }

    STORE {
        string store_id PK
        string brand_id FK
        string store_name
        string platform
        string operating_center
        boolean is_b2c_managed
    }

    KOC_MASTER_PROFILE {
        string koc_id PK
        string stage_name
        string channel_id
        string channel_url
        string salary_grade
        string legal_type "INDIVIDUAL | BUSINESS_HOUSEHOLD | BUSINESS_LICENSE"
        string cccd
        string tax_code
        string company_name
        string legal_representative
        string bank_account
        string bank_name
        string phone
        string email
        string shipping_address
    }

    PLAN_ORDER {
        string order_id PK
        string store_id FK
        string month_target
        decimal nmv_target
        decimal aff_budget_gross
        decimal aff_budget_net
        decimal self_budget_gross
        decimal self_budget_net
        decimal live_budget
        int paid_video_target
        int foc_video_target
        int self_video_target
        string leader_id FK
        string growth_pic
        string status
    }

    INPUT_PLAN_WEEKLY {
        string input_id PK
        string order_id FK
        string week_name
        string specialist_id FK
        decimal committed_budget
        int committed_paid_videos
        int committed_foc_videos
        string channel_type
    }

    BOOKING_ACTUAL {
        string booking_code PK
        string store_id FK
        string specialist_id FK
        string koc_id FK
        decimal cost
        string platform
        string pipeline_stage
        datetime air_date
        string link_air
        string payment_status
        string sla_warning
    }

    CONTRACT_RECORD {
        string id PK
        string code
        string title
        string template_id
        string template_hash FK
        string booking_code FK
        string review_status "DRAFT | IN_REVIEW | APPROVED | REJECTED"
        string signing_status "PENDING | WAITING | COMPLETED | CANCELLED"
        string wesign_doc_id
        int revision
        string created_by_user_id FK
    }

    CONTRACT_TEMPLATE_SNAPSHOT {
        string hash PK
        string template_id
        blob file_bytes
        datetime created_at
    }
```

---

## 4. QUY TẮC KINH DOANH & CÁC CHỐT CHẶN TỰ ĐỘNG (BUSINESS RULES & VALIDATION GATES)

### Chốt chặn 1: Khóa vượt hạn mức ngân sách (Hard Budget Gate)
* **Quy tắc:** Hệ thống tự động tính lũy kế chi phí đã duyệt của gian hàng trong tháng:
  $$\text{Tổng chi phí đã duyệt (File 3.2)} + \text{Chi phí booking mới} \le \text{Hạn mức Net Kế toán duyệt (File 4.1)}$$
* **Cơ chế xử lý:** Nếu tỷ lệ giải ngân đạt $\ge 100\%$, hệ thống tự động **khóa chức năng phê duyệt booking mới**. Muốn tiếp tục duyệt, PIC phải làm "Phiếu đề xuất bổ sung ngân sách (Top-up)" có xác nhận điện tử của Growth và Trưởng phòng B2C.

### Chốt chặn 2: Kiểm soát chi ngoài kế hoạch (Zero-Budget Gate)
* **Quy tắc:** Các gian hàng có hạn mức chi phí Affiliate trên Order bằng 0 VNĐ (chỉ order gửi mẫu FOC) thì mặc định hệ thống **không cho phép chọn hình thức thanh toán trả phí**.
* **Cơ chế xử lý:** Nếu phát sinh deal lớn đột xuất (như case `BaBe` 221 triệu, `Revision` 74 triệu), phải có luồng phê duyệt ngoại lệ kèm văn bản thống nhất từ Brand trước khi kế toán mở cổng chi.

### Chốt chặn 3: Kiểm soát tính toàn vẹn và chống nhầm cột (Data Integrity Gate)
* **Quy tắc:** 
  * Chi phí Gross và Net phải thỏa mãn công thức thuế chuẩn: $\text{Net} = \frac{\text{Gross}}{1 + \text{Thuế suất}}$.
  * Phân biệt rõ loại hình: Nếu là "Gửi mẫu KOC (FOC)" thì trường chi phí bắt buộc bằng 0đ. Nếu chi phí $> 0$ thì bắt buộc phải gắn mã định danh KOC và hợp đồng thanh toán.
  * Tách biệt rõ ràng các cột chỉ tiêu cho từng kênh: TikTok, Facebook, Threads, Shopee Video, Instagram; nghiêm cấm gộp chung vào 1 cột.

### Chốt chặn 4: Cảnh báo SLA và dòng tiền tạm ứng
* **Quy tắc:**
  * Toàn bộ các booking ở giai đoạn **"Gửi hàng"** hoặc **"Tạm ứng"** được gắn bộ đếm thời gian lùi (định mức tối đa 7 ngày từ khi KOC nhận hàng đến khi lên bài).
  * Trước hạn 2 ngày: Hệ thống gửi thông báo nhắc nhở chuyên viên đôn đốc KOC.
  * Quá hạn: Tự động chuyển trạng thái cảnh báo sang **"Trễ hạn SLA"** và đưa vào danh sách kiểm soát hoàn ứng của Kế toán.

### Chốt chặn 5: Toàn vẹn mẫu hợp đồng & Kiểm soát trình ký (Contract & Legal Gate)
* **Quy tắc:**
  * Mọi hồ sơ hợp đồng tạo mới phải tham chiếu chính xác đến 1 trong 8 mẫu Word chuẩn của phòng Pháp chế.
  * Bản mẫu gốc được lưu trữ cố định theo hàm băm SHA-256 (`template_hash`). Mọi thay đổi trên mẫu hiện hành không làm sai lệch văn bản của hồ sơ cũ.
  * Phê duyệt nội bộ 2 cấp bắt buộc (Pháp chế + Kế toán; kèm Lead nếu được chỉ định). Người tạo không được tự duyệt hồ sơ của chính mình.
  * Chỉ hồ sơ đã được duyệt đầy đủ nội bộ mới được liên kết mã trình ký MISA AMIS weSign (`documentId`). Trạng thái ký được đồng bộ hai chiều thời gian thực.
  * Khi đang có lượt ký hiệu lực hoặc đã hoàn tất ký, hệ thống khóa toàn bộ quyền sửa đổi nội dung. Mọi hành vi thu hồi/sửa hồ sơ phải tạo revision mới và hủy lượt ký cũ.

---

## 5. THIẾT KẾ GIẢI PHÁP HỆ THỐNG PHẦN MỀM (TARGET ARCHITECTURE)

Nhằm xóa bỏ hoàn toàn rủi ro thao tác thủ công trên các file Excel rời rạc và chuẩn hóa quy trình vận hành, hệ thống phần mềm quản trị B2C được cấu trúc thành **5 phân hệ chức năng tập trung**:

1. **Phân hệ Quản lý Kế hoạch & Phân bổ (Planning & Allocation Module):**
   * Tiếp nhận hạn mức Order tổng cố định từ Growth, gắn đúng Trưởng phòng (`Đặng Thị Yến Nhi`) và Leader (`Nguyễn Thị Ngọc Tâm` cho 8 gian) hoặc chuyên viên trực tiếp phụ trách.
   * Phân rã mục tiêu 4 chiều (Kênh, Trụ cột nội dung, Khung lương KOC KL1–KL7, 3 đợt chạy trong tháng).
   * Phối hợp 3 bên: Growth – Marketing B2C – Media, bàn giao trọn gói Tổng ngân sách Ads cho Media và chốt đóng băng số liệu bằng Biên bản điện tử (`Baseline v1.0`).

2. **Phân hệ Quản lý Thực thi Booking (Booking Execution Module):**
   * Quản lý tập trung toàn bộ vòng đời booking từ lúc lựa chọn KOC, tạo mã BO, gửi mẫu, kiểm tra kịch bản/video demo, gắn link air đến nghiệm thu.
   * Tích hợp kiểm tra trần ngân sách thời gian thực (Real-time Budget Checking).

3. **Bảng điều khiển Đối soát 3 bên Thời gian thực (3-Way Reconciliation Dashboard):**
   * Tự động tổng hợp và hiển thị trực quan 3 dòng dữ liệu: **Hạn mức Order -> Kế hoạch Input -> Thực chi 3.2**.
   * Cảnh báo trực quan bằng màu sắc: Đỏ (Bội chi/Chi ngoài kế hoạch), Vàng (Chậm tiến độ giải ngân < 20% khi đã qua nửa tháng), Xanh (Bám sát tiến độ).
   * Phân quyền xem báo cáo: Theo cấp Trưởng phòng (Toàn bộ 69 gian hàng), cấp Leader (Nhóm 8 gian) và cấp Chuyên viên (Từng gian hàng được giao).

4. **Phân hệ Quản lý Hợp đồng & Trình ký điện tử weSign (Contract Hub & e-Signing Module):**
   * Điền dữ liệu tự động vào 8 biểu mẫu Word chuẩn hóa của Pháp chế, giữ nguyên bố cục gốc.
   * Lưu trữ bản mẫu gốc bất biến theo mã băm SHA-256 (`ContractTemplateSnapshot`) chống sai lệch điều khoản.
   * Luồng phê duyệt nội bộ 2 cấp minh bạch (Pháp chế + Kế toán); cơ chế chống ghi đè (Optimistic Locking Revision).
   * Tích hợp cổng trình ký điện tử MISA AMIS weSign: theo dõi trạng thái ký (Chờ ký, Ký một phần, Hoàn tất ký, Hủy) và tự động đồng bộ hóa tài liệu.

5. **Phân hệ Dữ liệu gốc Master Data & Danh bạ KOC (Master Data & KOC Directory Module):**
   * Chuẩn hóa danh mục 42 thương hiệu B2C phân cấp theo Gian hàng / Nền tảng sàn (TikTok Shop, Shopee, Lazada).
   * Hồ sơ KOC phân loại theo 3 nhóm pháp lý: Cá nhân (`INDIVIDUAL`), Hộ kinh doanh (`BUSINESS_HOUSEHOLD`), Doanh nghiệp (`BUSINESS_LICENSE`).
   * Bảng theo dõi **"Các job đang chạy cùng Upbase"**: Cho phép chuyên viên xem lịch sử booking, GMV 30 ngày, hiệu quả ROI và trao đổi chéo giữa các PIC để ghép deal tối ưu chi phí.
   * Bộ lọc dữ liệu sạch: Không sử dụng dữ liệu mẫu giả định; tự động phát hiện hồ sơ nghi trùng theo CCCD, MST, SĐT và liên kết kênh.

### Hạ tầng xác thực & Phân quyền tập trung (Auth & RBAC):
* Tích hợp đăng nhập một lần SSO thông qua tài khoản **Lark Suite** nội bộ công ty (`/api/auth/lark/login`, `/api/auth/lark/callback`).
* Phân quyền nghiêm ngặt theo vai trò công việc: Trưởng phòng B2C, Leader, Chuyên viên Booking, Chuyên viên Gửi mẫu, Kế toán, Pháp chế và Khách hàng bên ngoài.

---
*(Tài liệu được cập nhật ngày 13/10/2026 đồng bộ cùng phiên bản phần mềm B2C Ops Hub)*

