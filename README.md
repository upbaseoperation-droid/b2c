# HỆ THỐNG QUẢN TRỊ PHÒNG MARKETING B2C — UPBASE ASIA
## Upbase B2C Operations Hub (Next.js + Prisma + Supabase + Vercel)

> **Trạng thái yêu cầu 24/09/2026:** Đang ở SDLC giai đoạn 1 để cùng chốt giải pháp booking đa nền tảng. Quyết định mới về **job = BO**, HĐNT, phụ lục/SOW theo KOC-tháng và phụ lục bổ sung đã ghi trong [BRD booking đa nền tảng](blueprint/08_BOOKING_MULTIPLATFORM_BRD.md). Mô hình hợp đồng và giao diện hiện có là prototype chưa thực hiện các quy tắc đó.

Tài liệu khảo sát phạm vi toàn phòng: [Bộ câu hỏi discovery cho Giám đốc khối Marketing B2C](blueprint/09_DISCOVERY_GUIDE_GIAM_DOC_KHOI_B2C.md). Bộ câu hỏi bao quát mục tiêu, quy trình, nhân sự, chỉ số và công cụ; câu hỏi chưa phải yêu cầu đã được phê duyệt.

Tài liệu khảo sát tuyến vận hành: [Bảng câu hỏi phỏng vấn nhân viên kỳ cựu Marketing B2C](blueprint/10_DISCOVERY_GUIDE_NHAN_VIEN_KY_CUU_B2C.md). Dùng một case thực tế để kiểm tra khoảng cách giữa SOP và cách team làm việc.

Mục tiêu vận hành để thảo luận sau phỏng vấn: [Ngắn hạn và dài hạn cho Marketing B2C](blueprint/11_LO_TRINH_KHAO_SAT_VA_THIET_KE_GIAI_PHAP_B2C.md). Tập trung chuyển dịch booking đa nền tảng, plan, BO, nghiệm thu, Research và năng lực team; chưa phải KPI đã duyệt.

---

## 📌 1. Tổng Quan Dự Án & 6 Phân Hệ Chuẩn (Canonical Modules)

Hệ thống được thiết kế dựa trên sơ đồ tổ chức chuyên biệt của phòng Marketing B2C Upbase Asia và vận hành xoay quanh **6 Canonical Modules nghiệp vụ cốt lõi**:
1. **Module 1: Portfolio / Store Management:** Brand, Store, Trách nhiệm kép (**Account/Growth owner** phụ trách doanh số & khách hàng vs **B2C Ops owner** phụ trách tác nghiệp KOC & nội dung), Service Model (`Full Service`, `Affiliate Only`, `Livestream Dedicated`), Difficulty Tier (1.0 - 1.6), Account Status.
2. **Module 2: Planning:** Month/Quarter ➔ Store ➔ Objectives ➔ GMV (GMV & NMV) ➔ Channel (KOC, Inhouse, Live) ➔ Workstream ➔ Output ➔ Budget ➔ Owner.
3. **Module 3: Execution (Cốt lõi lớn nhất):** Tách bạch 4 thực thể liên kết 1-N: `Creator Candidate (Outreach)` ➔ `Booking Deal (Hợp đồng & chi tạm ứng Lark)` ➔ `Content Item (Sáng tạo & QC)` ➔ `Publication (Link live & Mã Spark Ads)`. Khử triệt để lỗi "1 dòng = 1 booking gây méo mó metric".
4. **Module 4: Content:** Content Item, Master Pillars, Angle, Format (Video 60s, Video 30s Hook, Live session, Carousel), Channel, Campaign, Creator, Status, QC Checklist đa tiêu chí, Performance tracking.
5. **Module 5: People & Capacity:** Employee ➔ Role ➔ Lead ➔ Team ➔ Assignment ➔ Workload ($W = \text{Cases} \times \text{StoreMulti} \times \text{Quality} \times \text{SLA}$) ➔ Capacity (<75%, 75-115%, >115%) ➔ P3 Incentive.
6. **Module 6: Control Tower:** Tháp điều khiển trung tâm cho Head/Lead (**Zero manual input**; chỉ giám sát Plan vs Actual, SLA, Backlog, Bottleneck Radar, Workload balance, Quality và Exceptions).
*(Module 7: Research được quy hoạch sau khi chuẩn hóa xong quy trình).*

---

## 🏛️ 2. Quy Chuẩn SDLC & Đồng Bộ Tài Liệu (Mandatory Rules)

Dự án tuân thủ nghiêm ngặt theo **Quy trình Phát triển Phần mềm Chuẩn (SDLC 6 Giai đoạn)**:
* 🔴 **Quy tắc Bắt buộc:** Mọi thay đổi về kiến trúc, CSDL, API hay logic code đều **BẮT BUỘC phải cập nhật đồng bộ toàn bộ tài liệu liên quan** (`README.md`, các file trong `blueprint/`, `schema.prisma`, `MEMORY.md`).
* Chi tiết quy chuẩn được quy định tại: [00_SDLC_AND_DOC_SYNC_PROTOCOL.md](file:///e:/Upbase/B2C/blueprint/00_SDLC_AND_DOC_SYNC_PROTOCOL.md)

---

## 📁 3. Cấu Trúc Thư Mục Dự Án

```
e:\Upbase\B2C\
├── blueprint\                                      # Tài liệu Thiết kế & Đặc tả Hệ thống
│   ├── 00_SDLC_AND_DOC_SYNC_PROTOCOL.md            # Quy chuẩn SDLC & Nguyên tắc Đồng bộ Tài liệu
│   ├── 01_HANDOFF_MATRIX_AND_SLA.md                # Ma trận bàn giao 3 team & Chuẩn SLA 8 chặng
│   ├── 02_CONTRACT_AUTOMATION_SPEC.md              # Đặc tả tự động hóa Hợp đồng, QR & Tạm ứng (2tr/10tr)
│   ├── 03_DATABASE_AND_SYSTEM_ARCHITECTURE.md       # Thiết kế CSDL PostgreSQL & Kiến trúc Next.js/Supabase
│   ├── 04_GAMIFICATION_AND_LEADERBOARD.md          # Quy chế Bảng vàng thi đua & Đánh giá Năng lực vs Kết quả
│   ├── 05_DESIGN_SYSTEM_SPEC.md                    # Quy chuẩn Hệ thống Thiết kế Đồng nhất (Enterprise UI)
│   ├── 06_AUTH_AND_RBAC_SPEC.md                    # Đặc tả Hệ thống Tài khoản, Phân quyền RBAC & RLS (Phase 2)
│   └── 07_EXECUTIVE_REPORTING_AND_BOOKING_OPS_SPEC.md # Đặc tả Báo cáo Điều hành, Vận hành Job Đa Brand & Danh bạ KOC chuẩn 65 trường
│
├── web-admin\                                      # Ứng dụng Web Quản trị Doanh nghiệp (Enterprise)
│   ├── prisma\
│   │   ├── schema.prisma                           # Mô hình 10 thực thể dữ liệu Prisma (PostgreSQL - bổ sung GrowthDemand & TierBreakdown)
│   │   └── seed.ts                                 # Script nạp dữ liệu mẫu & KOCs
│   ├── src\
│   │   ├── app\                                    # Next.js App Router (Dashboard, Layout, Styles)
│   │   ├── components\                             # UI Components chuyên sâu:
│   │   │   ├── EmployeePlanInspectorModal.tsx  # Soi & Thẩm Định Kế Hoạch Chi Tiết Nhân Viên dành cho Trưởng phòng (Đối soát 4 Tier, phê duyệt & batch tạo deal)
│   │   │   ├── MyPlanWorkspace.tsx             # Bàn làm việc Kế Hoạch Cá Nhân của chuyên viên (Phân rã W1-W4, lên slot KOC, trình Lead, kích hoạt deal)
│   │   │   ├── KocProfileModal.tsx                 # Hồ sơ 360° KOC (Chuẩn 4 trường phân loại: KL, Segment, Tệp Kênh, KOC category; Demographics, Logistics & Pháp lý)
│   │   │   ├── CreateKocModal.tsx                  # Tạo KOC mới chuẩn 4 trường (Tự động tính khung lương 9 bậc, phân nhóm Segment tự động theo rate)
│   │   │   ├── CampaignCreateModal.tsx             # Tạo Brief chiến dịch chuẩn & Tự động kích hoạt SLA 24h
│   │   │   ├── ScriptReviewModal.tsx               # Thẩm định kịch bản 4 phần (Hook, Pain, USP, CTA) & SLA
│   │   │   ├── QuickBookModal.tsx                  # Lên Deal siêu tốc 30s & Tự động chia cọc 2tr/20%
│   │   │   ├── ContractModal.tsx                   # Sinh Hợp Đồng PDF thực tế (jsPDF) & Mã VietQR tự động
│   │   │   ├── ImportExcelModal.tsx                # Nạp báo cáo GMV Excel/CSV từ TikTok/Shopee (Zero-API)
│   │   │   ├── TopHeader.tsx                       # Giả lập 5 vai trò (Role Switcher Phase 1)
│   │   │   └── views\                              # 13 Phân hệ tác nghiệp:
│   │   │       ├── GrowthPlanBreakdownView.tsx     # Lập Plan 3 kênh (KOC KL1-KL7, Self-Channel, Livestream), Đối soát 4 chặng & NMV Gap, Validation Gate, Xuất Excel 4.1 & Tải Mẫu 4.1.1
│   │   │       ├── SampleTrackerView.tsx           # Giám sát vận đơn mẫu & Chống bùng KOC theo MeUp Playbook, SLA 5 ngày, Zalo direct & Spark Ads
│   │   │       ├── PerformanceP3View.tsx           # Đánh giá 4P & Tính thưởng P3 tự động theo ma trận độ khó Store (x1.0 - x1.6)
│   │   │       ├── BrandView.tsx                   # Không gian Chiến Lược & Vận Hành Brand Team: Studio Soạn Brief SLA 24h, Guideline & Blacklist Hub, Cổng Thẩm Định KOC & Script Gatekeeper, Retainer P&L
│   │   │       ├── BrandHubView.tsx                # Cổng duyệt 4 chặng cho Brand Client
│   │   │       ├── BookingView.tsx                 # Phân hệ Quản lý Booking (Tích hợp Tab 0: Bàn làm việc Kế hoạch cá nhân My Plan)
│   │   │       └── ManagerView.tsx                 # Cụm Quản trị Kế hoạch: Ma trận phân bổ đa chiều (4 Tier, Brand, Tuần W1-W4), Đối soát 3 tầng & Soi plan nhân sự
│   │   └── lib\                                    # Prisma Client, Supabase Client, excelExport.ts, Types & Data
│   ├── vercel.json                                 # Cấu hình sẵn sàng triển khai Vercel 1-click
│   └── .env.example                                # Cấu hình biến môi trường Supabase & Vercel
│
├── generate_excel.js                               # Script Node.js tự động tạo 2 Workbook Excel chuẩn: Workload 4P & Plan Order Tổng 4.1
├── app\                                            # Bản Web Prototype tĩnh (HTML/CSS/JS)
│
├── B2C_Quản lý Booking.xlsx                        # File dữ liệu Lark Base gốc (35MB - 20 Sheets)
├── B2C_Quản lý Booking_3.1 Listing KOCs_All.csv    # Dữ liệu 19.000 dòng KOC (74MB)
├── 4.1 Plan order tổng.xlsx                        # Kế hoạch vận hành tổng (2.286 dòng × 228 cột)
├── 4.1.1 Input plan.xlsx                           # Dữ liệu kế hoạch tuần chi tiết 7 bậc KOC (2.987 dòng)
├── 4P Marketing B2C.xlsx                           # Khung đánh giá hiệu suất & hệ số độ khó Store
├── Pain point Marketing B2C.xlsx                   # Khảo sát hiện trạng & Phỏng vấn nội bộ
└── Định hướng Marketing B2C _ Cơ cấu team.pdf     # Slide chiến lược cơ cấu tổ chức team B2C
```

---

## 🚀 4. Hướng Dẫn Khởi Chạy Web Quản Trị Cục Bộ

1. Di chuyển vào thư mục `web-admin`:
   ```bash
   cd e:\Upbase\B2C\web-admin
   ```
2. Khởi chạy máy chủ phát triển Next.js:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt tại: **`http://localhost:3000`**
   * Trải nghiệm **Bàn làm việc hôm nay** theo từng vai trò (Booking, Content, Brand, Kế toán, Quản lý).
   * Bấm **"+ Lên Deal (30s)"** để tạo hợp đồng KOC tự động.
   * Kéo thả file Excel tại **"📥 Nhập Báo Cáo"** để mô phỏng cập nhật GMV tự động.
   * Xem hợp đồng PDF và duyệt chi tạm ứng 2.000.000đ.

---

## 🏷️ 5. Quy Chuẩn 4 Trường Phân Loại KOC/KOL (Sheet 3.1 & 3.2 Lark Base)

Hệ thống đã chuẩn hóa toàn bộ Danh bạ Creator và Hợp đồng Booking Deal theo 4 trường phân loại cốt lõi:
1. **Khung Lương (KL - 9 Bậc chuẩn):**
   - `TAP UpAffiliate` (0đ - Thuần Affiliate nội bộ)
   - `KL1` (0 - 500.000đ)
   - `KL2` (500.000đ - 1.500.000đ)
   - `KL3` (1.500.000đ - 3.000.000đ)
   - `KL4` (3.000.000đ - 5.000.000đ)
   - `KL5` (5.000.000đ - 10.000.000đ)
   - `KL6` (10.000.000đ - 30.000.000đ)
   - `KL7` (> 30.000.000đ)
   - `TAP đối tác ngoài` (Thuần Affiliate đối tác)
2. **Segment (4 Cấp độ chiến lược Creator):**
   - `Massive Creator`: Quy mô lớn, độ phủ cao (KL1, KL2, TAP).
   - `Mid Creator`: Tương tác ổn định, chuyển đổi tốt (KL3, KL4).
   - `Key Creator`: Định hình hình ảnh ngành hàng, traffic lớn (KL5, KL6).
   - `Top Creator`: KOL/Celeb đầu ngành, định hướng thương hiệu (KL7).
3. **Tệp Kênh (25 Tệp ngách nội dung):**
   - Review Nữ, Review Nam, Unboxing, Seller, Mẹ bé (bầu), Mẹ bé (bé), Gia đình, Couple, Beauty, Health, Makeup Artist, Tóc, Bác sỹ/chuyên gia, Gym, Eat Clean, Thời trang (review), Thời trang (có kiến thức), Lifestyle, Nhà cửa đời sống, Cooking, Thú cưng, POV, Dance, Cosplay, Tin tức, LGBT, KOL, Nữ xinh.
4. **KOC Category (9 Ngành hàng thương mại):**
   - Personal care, Mom and baby, Reviewer, Lifestyle, Fashion, ELHA, F&B, Social / Comedian, Travel/Hospitality.

---

## 🎯 6. Phân Hệ Quản Lý Kế Hoạch 2 Cấp & Bảng Ma Trận Đa Chiều (Two-Level Matrix Planning)

1. **Cấp 1 — Quản Lý Trần Định Mức 4 Tier Toàn Phòng (Trưởng Phòng):**
   - Thiết lập trần số lượng video, trần ngân sách và đơn giá dự kiến cho 4 Tier: T1 Celeb (KL7), T2 Macro (KL6), T3 Micro (KL4-5), T4 Nano (KL1-3).
   - Cơ chế cân bằng tải tự động (Auto-Rebalance Capacity) cho 26 chuyên viên.
2. **Cấp 2 — Bảng Ma Trận Phân Bổ Xuống 26 Nhân Sự (Chuyển đổi 3 chế độ xem linh hoạt):**
   - **Ma trận 4 Tier:** Xem số video từng Tier được giao cho mỗi nhân sự.
   - **Ma trận Nhãn Hàng:** Phân công 6 nhãn hàng chủ lực (Senka, Cure Natural, Bio-Essence, Peripera, Kutieskin, Royal Ausnz).
   - **Ma trận Tuần (W1-W4):** Tiến độ lên sóng theo từng tuần chiến dịch.
   - **Cột Cố Định (Sticky Left Column):** Giữ nguyên cột *Nhân Sự & Vị Trí* khi cuộn ngang bảng rộng.
   - **Đối Soát 3 Cấp Tại Footer:** Hàng 1 (Tổng phân bổ 26 nhân sự) ➔ Hàng 2 (Trần Plan Tổng Trưởng phòng) ➔ Hàng 3 (Gap Đối Soát / Headroom cân đối với huy hiệu màu trạng thái: Xanh ✓ Khớp, Vàng Trống, Đỏ Vượt).
3. **Cấp 3 — Bàn Làm Việc Kế Hoạch Cá Nhân (My Plan Workspace) & Duyệt Plan:**
   - Nhân sự phân rã kế hoạch theo tuần W1-W4, gắn slot KOC, đo lường Fill Rate độ lấp đầy so với chỉ tiêu.
   - Nộp kế hoạch lên Trưởng phòng (`DRAFT` ➔ `SUBMITTED`).
   - Modal "Soi Plan" (Employee Plan Inspector): Trưởng phòng duyệt toàn bộ kế hoạch hoặc gửi phản hồi góp ý sửa (`APPROVED` / `REVISION_REQUESTED`).
   - Chuyển đổi hàng loạt sang Booking Deals: Trưởng phòng hoặc Chuyên viên có thể kích hoạt chuyển đổi KOC đã duyệt sang Deals tác nghiệp chỉ với 1 click.
4. **Phân Quyền Doanh Nghiệp (Role-Aware RBAC):**
   - Quản lý (`MANAGER`): Toàn quyền cấu hình hạn mức 4 Tier, sửa chỉ tiêu từng nhân sự, duyệt kế hoạch, và chuyển deal hàng loạt.
   - Chuyên viên (`BOOKING_MEMBER`, `CONTENT_MEMBER`, `BRAND_MEMBER`): Tự động áp dụng chế độ Giám Sát (Read-Only Observer Mode) khi xem bảng phân bổ của Quản lý, khóa toàn bộ nút sửa trần định mức để đảm bảo an toàn dữ liệu; trong Bàn làm việc Booking, chuyên viên tập trung vào KPI và kế hoạch cá nhân của mình.

---

## 🎨 7. Chuẩn Giao Diện Enterprise SaaS Light Theme (Clean White & Slate)

Toàn bộ ứng dụng đã được đồng bộ chuyển đổi sang giao diện sáng cao cấp (**Enterprise SaaS Light Theme**):
1. **Bảng màu dịu mắt & Độ tương phản cao:**
   - Nền toàn trang: `#f8fafc` (Slate 50).
   - Thẻ làm việc và Hộp thoại: Nền trắng `#ffffff` với viền `#e2e8f0` (Slate 200).
   - Chữ tiêu đề & Số liệu: `#0f172a` (Slate 900), chữ nội dung: `#334155` (Slate 700).
   - Tuyệt đối bảo vệ chữ trắng tinh khiết trên các nút hành động chính (`button.bg-blue-600`, `button.bg-emerald-600`, `button.bg-rose-600`).
2. **Huy hiệu Pastel Tinh Tế:** Màu nền nhạt (50) kết hợp chữ đậm (700) và viền mảnh (200) cho tất cả các trạng thái duyệt, SLA, headroom.
3. **Cột Cố Định Chống Xuyên Thấu (Seamless Sticky Columns):** Cột danh sách nhân sự trên bảng ma trận giữ nguyên nền trắng `bg-white`, hover đồng bộ dòng `group-hover:bg-slate-50`, đổ bóng viền mờ chống đè chữ khi cuộn ngang.
4. **Chi tiết thiết kế:** Xem tại [05_DESIGN_SYSTEM_SPEC.md](file:///e:/Upbase/B2C/blueprint/05_DESIGN_SYSTEM_SPEC.md).
