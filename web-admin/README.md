# B2C OPS HUB — WEB-ADMIN

Hệ thống điều hành và quản trị vận hành tập trung cho phòng Marketing B2C (UpBase).

---

## 1. Kiến trúc & Công nghệ

- **Framework:** Next.js 15 (App Router), React 19, TypeScript.
- **Styling & UI:** Tailwind CSS, Lucide React, Design System chuẩn hóa theo [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
  - Tối ưu hóa hiển thị bảng danh sách (`DataTable` và các bảng ma trận chuyên biệt): tự động dàn đều vừa vặn 100% khung nhìn máy tính (laptop/desktop từ 1280px trở lên), loại bỏ hoàn toàn tình trạng tràn màn hình và thanh cuộn ngang không cần thiết; typography cô đọng, padding tinh gọn và tổ chức dữ liệu đa tầng rõ ràng.
- **Cơ sở dữ liệu thực tế (Database & Storage Engine):**
  - **Prisma ORM & PostgreSQL trên Supabase** (AWS ap-southeast-1 Pooler / Direct).
  - Vận hành 100% dữ liệu thực tế thông qua các biến môi trường: `BRAND_STORAGE=postgres`, `CONTRACT_STORAGE=postgres`, `PARTNER_HUB_STORAGE=postgres`, `SHARED_STORAGE=postgres`.
  - Bộ kiểm tra & đối soát dữ liệu thực: `npx tsx scripts/verify-db.ts` (16 tài khoản nhân sự/lãnh đạo B2C, 69 gian hàng `StorePortfolio`, 42 thương hiệu trong `AppSharedRecord` & `BrandProfileRecord`, 8/8 mẫu Word pháp chế trong `ContractTemplateSnapshot`, 98 kế hoạch tháng `MonthlyPlan`).
- **Quản lý dữ liệu & State:** Kiến trúc phân lớp, đồng bộ trạng thái thời gian thực giữa giao diện và các API nội bộ / bên thứ ba.
- **Xác thực:** Hỗ trợ Lark Suite SSO (`/api/auth/lark/*`) cho nhân sự nội bộ và Cổng đối tác Partner Hub Token (`/api/auth/partner/*`) cho đại diện Brand.
- **Xử lý tài liệu & Nhận diện:** Tích hợp Tesseract OCR (`/api/ocr/extract-legal-doc`) bóc tách ảnh CCCD và giấy tờ pháp lý KOC.

---

## 2. Các phân hệ chức năng chính

1. **Bàn làm việc nhân sự (Cockpit):** Tổng hợp danh sách việc chờ xử lý (Action Items), theo dõi hạn chót SLA và lối tắt thao tác nhanh.
2. **Dashboard Quản trị B2C (5 nhóm phân hệ tinh gọn, không lồng tab):**
   - 1. Ngân sách & Đối soát Kế toán (42 Brand · Gộp Ngân sách Gross/Net, Sổ cái ĐNTT & Xuất Excel 5 Sheets)
   - 2. Gian hàng & TikTok Seller (69 Gian hàng B2C)
   - 3. Lịch Air Tuần & Tiến độ Video (W40–W45 · Gộp Biểu đồ Lịch Air Tuần, Nhịp độ Air đồng loạt 31 ngày, Ma trận 69 gian hàng & Tiến độ SLA 786 đơn)
   - 4. Hiệu quả Video & KOC/Ads (786 Đơn)
   - 5. Hiệu suất & Hiệu quả Nhân viên (32 nhân sự B2C)
3. **Kế hoạch tháng (Monthly Plans), Thực thể Chiến dịch (Campaign 1–3 Tháng) & Biểu mẫu 1-Sheet Trình Brand:** Quản lý **Chiến dịch (`CampaignItem`) như một thực thể độc lập kéo dài 1–3+ tháng** (với phân kỳ `monthlyPhases`, định hướng chiến lược & CTKM Section 01, và lịch treo Key Visual Section 03 theo Template 1 Sheet), đối soát tháng **Có Campaign vs Không có Campaign (Duy trì thường nhật)**, quản lý phiên bản kế hoạch theo Gian hàng (69 gian B2C), **Kế hoạch tháng theo Brand (42 Brand cho 3 vị trí gắn theo Brand: `Content / Brand main`, `Plan / Strategy`, `Key Visual / SIS`)**, **Biểu mẫu 1-Sheet Trình Brand (`BrandOneSheetPlanView.tsx` & `exportBrandMonthlyOneSheetToExcel` — tổng hợp đủ 5 phân khu `01 Định hướng tháng`, `02 Kế hoạch KPI tháng Shopee vs TikTok Shop`, `03 Key Visual chung`, `04 TikTok Shop Content/KOC/Booking` và `05 Shopee Chiến lược Pillar P01–P05 & Target tuần` kèm xuất file `.xlsx`)**, **Hệ số gian hàng — Bảng 2 (`0,80` Cơ bản / `1,00` Tiêu chuẩn / `1,25` Vừa / `1,50` Khó — HS phạm vi cho việc cấp Sàn và cấp Brand, áp dụng theo store)**, Kế hoạch theo nhân sự (Việc của tôi), phân rã chỉ tiêu Paid/FOC, Affiliate/Self-channel/Livestream, kiểm soát hạn mức chi phí Net/Gross và thảo luận nội bộ.
4. **Phân bổ Nhân sự & Định mức (Manager Delegation Hub):** Màn hình dành cho Giám đốc Marketing (`Đặng Thị Yến Nhi`) phân bổ nhân sự phụ trách 3 vị trí gắn theo Brand (`Content / Brand main`, `Plan / Strategy`, `Key Visual / SIS`) trên 42 Thương hiệu B2C, duyệt **Hệ số gian hàng đầu tháng (Bảng 2)** cho 69 gian hàng, cân đối tải công việc theo nhân sự và phân công PIC thực thi.
5. **Giao việc & Đo lường Workload Nhân sự (`task-delegation`):** Phân hệ quản lý đồng thời **Task thuộc luồng quy trình hệ thống (`WORKFLOW_SYSTEM`)** và **Task Giám đốc / Quản lý giao (`DIRECTOR_ASSIGNED`)** đồng bộ 2 chiều với **Việc của tôi (Cockpit)**; tích hợp **Bảng Đo lường Workload 28 Nhân sự B2C** (tính điểm theo công thức chuẩn `SL nghiệm thu × Point chuẩn Bảng 1 × HS phạm vi Bảng 2/2b × HS công việc Bảng 3 × HS timeline Bảng 5 × HS đa sàn Bảng 6 × Tỷ trọng vai trò × HS cơ cấu Level Bảng 4`) và bộ **Setup Độ khó & Chính sách Point (Bảng 1 – 33 đầu việc SOW, Bảng 2b Research 0,80–1,60, Bảng 2–7)**.
6. **Hồ sơ Thương hiệu (`brand-knowledge`) & Hồ sơ Gian hàng (`stores`) theo Kỳ Tháng (Plan & Report + Drill-down):**
   - Tách bạch **Hồ sơ định danh tĩnh** (Pháp nhân, Định vị 4P, Sản phẩm SKU, Từ khóa cấm, Trần thù lao, Kho tệp R2, Thông số kỹ thuật sàn & Đội ngũ phụ trách) với **Hồ sơ Tháng (`Plan & Report`)**.
   - Quản lý các chỉ số **Doanh số NMV**, **Ngân sách Net/Gross** và **Sản lượng Video (Paid KOC, Self-channel, FOC)** theo từng kỳ tháng (`2026/11`, `2026/10`, `2026/09`, `2026/08`), đối soát trực tiếp giữa **Plan (Kế hoạch tháng)** và **Report (Thực tế đạt)**.
   - Hỗ trợ **drill-down** trực tiếp từ Hồ sơ Thương hiệu / Gian hàng xuống từng dòng phân rã trong **Kế hoạch tháng (`input-plan`)**, **Đề xuất KOC (`koc-listing`)**, **Quản lý Deal Booking & Báo cáo Video (`booking`)** và **Soạn/Xem Hợp đồng (`contracts`)**.
7. **Vận hành Booking & KOC / VJ CTV:** Quản lý vòng đời hợp đồng booking, kịch bản, duyệt video; đồng bộ 100% ngôn ngữ thiết kế (Design System: Panel flush, FilterBar, Chips, DataTable, drill-down xem hồ sơ in-place) giữa **Danh bạ KOC** và **Danh sách VJ / CTV** trong phân hệ Dữ liệu gốc cũng như phân hệ Quản lý chuyên sâu.
8. **Hợp đồng & Hàng mẫu:** Soạn thảo phụ lục, đọc ảnh CCCD tự động (OCR), tích hợp WeSign trình ký điện tử và theo dõi hành trình hàng mẫu / mã Spark Ads.
9. **Cổng cộng tác đối tác (Partner Hub):** Giao diện riêng cho Brand xem tiến độ chiến dịch, duyệt kịch bản và theo dõi doanh thu sàn.
10. **Phân quyền người dùng (RBAC & Data Scoping Engine):** Phân định các nhóm quyền (CEO Đỗ Văn Giang, Giám đốc Marketing Đặng Thị Yến Nhi, Trưởng phòng Growth/Media, Trưởng nhóm Leader, Chuyên viên Specialist cả cấp Gian hàng và 3 vị trí cấp Brand, Pháp chế Legal, Kế toán Finance, Điều phối ký số Sign Admin, Đại diện thương hiệu Brand Partner). Áp dụng cơ chế **Data Scoping Engine**: nhân viên Growth/B2C chỉ được xem và thao tác trên đúng các thương hiệu, gian hàng, kế hoạch tháng và deal booking thuộc quyền quản lý trực tiếp của mình.
11. **Dữ liệu gốc danh mục tĩnh (Master Data Hub) & Chuẩn hóa Design System toàn diện:** Chuẩn hóa 100% các tab trong phân hệ Dữ liệu gốc (`Thương hiệu`, `Gian hàng`, `Sản phẩm chủ lực & SKU`, `Trụ cột nội dung`, `Danh bạ KOC`, `Danh sách VJ / CTV`) theo đúng mẫu chuẩn của Design System (`PageActions`, `Panel flush`, `FilterBar`, `Chips` có đếm số lượng thực tế, `DataTable` chuẩn với `ActionMenu`, `Pagination` và drill-down hồ sơ in-place). Lịch sử điều chuyển gian hàng và danh sách ủy quyền nhân sự dự phòng (Backup PIC) được tổ chức hiển thị trực quan trong **Điều hành & Giao việc của Quản lý (`ManagerDelegationHub`)** và trong hồ sơ chi tiết từng gian hàng (`StoreProfile`).
12. **Nhật ký kiểm toán hệ thống (`audit-trail` / `AuditTrailView`):** Phân hệ độc lập lưu vết toàn bộ hoạt động vận hành trọng yếu (Duyệt kế hoạch, Phê duyệt chi phí, Bàn giao gian hàng, Ủy quyền PIC dự phòng, Ký hợp đồng, Giải ngân). Cung cấp bộ lọc đa chiều (Đối tượng, Hành động, Người thực hiện, Thời gian) và chức năng xuất file CSV phục vụ kiểm toán nội bộ và đối soát Kế toán.
13. **Bản đồ 3D & Workload Nhân sự (`workload-3d` / `Workload3dMapView`):** Màn hình trực quan hóa không gian 3D tương tác xoay 360° (với 3 chế độ bố cục: *Trụ Tải Trọng 3D*, *Phân Tầng 3D: Nhân sự → Brand → Gian hàng*, và *Quỹ Đạo Tâm Điểm*), thể hiện chiều cao cột tải trọng Point thực tế của 28 nhân sự B2C so với định mức chuẩn Level (`L0.5`–`L3`), cảnh báo màu sắc theo trạng thái tải (`Quá tải ≥115%`, `Đủ tải 85–114%`, `Dư công suất <85%`), hiệu ứng hạt chuyển động (flowing particles) trên các đường cong liên kết 3D giữa Nhân sự — 42 Thương hiệu — 69 Gian hàng, hiệu ứng camera tự động bay (Fly-To) khi chọn nút và bảng điều phối cân bằng tải ngay bên cạnh.
14. **Hệ thống Nhận diện Thương hiệu (Brand Logos) & Nền tảng Sàn (Platform Logos):**
    - Trang bị 100% logo chính thức và vector SVG cho 42 Thương hiệu B2C tại `public/brands/` kèm module tra cứu linh hoạt `getBrandLogoUrl()` và component `BrandAvatar` hiển thị trên nền trắng bo viền thanh nhã.
    - Bộ biểu tượng sàn TMĐT (`ShopeeLogo`, `TikTokLogo`, `LazadaLogo`, `FacebookLogo`, `InstagramLogo`, `ThreadsLogo`, `LiveLogo`, `SelfChannelLogo`) và component `PlatformBadge` / `ChannelTag` ưu tiên hiển thị logo biểu tượng kèm tên ngắn gọn, tối ưu không gian hiển thị trên toàn bộ các view.

---

## 3. Cổng tích hợp API

- **Lark Suite & Larkbase:** Xác thực SSO và đồng bộ kế hoạch tháng từ File 4.1 Plan order tổng (`/api/integrations/larkbase/booking-plans`).
- **TikTok Shop Open API:** Đồng bộ doanh thu, GMV và đơn hàng từ Seller Center (`/api/tiktok-seller/sync`).
- **Kalodata:** Tra cứu creator và khám phá thị trường (`/api/integrations/kalodata/*`).
- **WeSign:** Đồng bộ trạng thái hợp đồng ký điện tử (`/api/contracts/integrations/wesign/*`).
- **OCR:** Đọc và trích xuất dữ liệu ảnh thẻ CCCD tiếng Việt (`/api/ocr/extract-legal-doc`).

---

## 4. Hướng dẫn cài đặt & Khởi chạy

```bash
# Di chuyển vào thư mục web-admin
cd web-admin

# Cài đặt thư viện phụ thuộc
npm install

# Khởi chạy môi trường phát triển
npm run dev

# Kiểm tra chất lượng mã nguồn & Build sản phẩm
npm run build

# Chạy toàn bộ 54 ca kiểm thử tự động (Unit, Integration & E2E)
npm test
```

Mở trình duyệt tại `http://localhost:3000`.

---

## 5. Cập nhật nâng cấp giao diện & Trải nghiệm người dùng (15/10/2026)

- **Trang đăng nhập Enterprise SaaS (`/login`):** Nâng cấp bố cục 2 cột cân đối: cột trái giới thiệu hệ sinh thái B2C với 3 khối tính năng then chốt (Quản lý 69 gian hàng, Đối soát kế hoạch Gross/Net, Báo cáo Ads & Đo lường Video); cột phải là card đăng nhập tối giản, hỗ trợ Lark SSO nội bộ, đối tác Gmail và bảng chọn vai trò thử nghiệm nhanh.
- **Thanh menu trái (`Sidebar`):** Tích hợp huy hiệu số lượng việc tồn đọng (`badgeCounts`) theo thời gian thực (hiển thị trực tiếp số việc cần xử lý ở mục *Việc của tôi*), vạch chỉ báo trượt chuẩn xác, phân nhóm danh mục tinh tế.
- **Thanh tiêu đề (`TopHeader`):** Hỗ trợ hiển thị đường dẫn phân hệ phụ (`subtitle`), nâng cấp thẻ phạm vi dữ liệu (`userScopeSummary`) với chấm chỉ báo trạng thái và viền phân tách sang trọng.
- **Bộ thành phần lõi (`ui/index.tsx`, `ui/blocks.tsx`):**
  - `Panel`: Hỗ trợ trường mô tả phụ (`description`) dưới tiêu đề khối, bổ sung đổ bóng nhẹ `shadow-2xs`.
  - `Stat`: Hỗ trợ biểu tượng chuyên biệt (`icon`), hiệu ứng hover nhẹ nhàng `hover:bg-canvas/50`, định dạng số lớn và sparkline xu hướng sắc nét.
  - `DataTable`: Hỗ trợ `fitContainer` linh hoạt theo tỷ lệ màn hình thực tế, loại bỏ `minWidth` ép cố định gây tràn ngang; padding `compact` (px-2.5 sm:px-3 py-2) giúp tối ưu diện tích hiển thị; header bảng có nền phân tách nhẹ `bg-sunken/40`.
- **Chuẩn hóa hiển thị bảng danh sách - Triệt tiêu thanh cuộn ngang (Zero-horizontal-scroll Layout):**
  - Tinh giản số lượng cột trên các bảng nghiệp vụ trọng điểm (`KocListingBatchHubView`, `BookingView`, `SampleTrackerView`, `ManagerView`...) từ 8-10 cột xuống 5-6 cột logic có cấu trúc thông tin đa tầng (multi-line).
  - Gộp các trường dữ liệu có liên kết nghiệp vụ trực tiếp (như KOC + Gian hàng/Kênh; Tiến trình + Trách nhiệm + Cảnh báo SLA; Nghiệm thu kỹ thuật gồm Link Video + Giỏ hàng + Mã Ads) giúp người dùng nắm bắt trọn vẹn thông tin mà không cần kéo ngang màn hình trên mọi độ phân giải laptop từ 1280px đến 1920px.
- **Bàn làm việc nhân sự (`CockpitView`):** Thêm biểu tượng trực quan cho các ô chỉ số (Khẩn cấp, Trong ngày, Hoàn tất, Tổng đầu việc), tích hợp bộ điều khiển phân đoạn `Segmented` để lọc nhanh danh sách nhiệm vụ.
- **Tinh giản phân hệ Phân quyền (`CentralizedRbacHubView`):** Loại bỏ các thanh thông báo, card KPI thừa thãi và đoạn giải thích dài dòng; loại bỏ hoàn toàn các nút đóng vai (impersonate) nội bộ và đối tác; danh sách màn hình phân quyền theo Role hiển thị 2 cột tinh gọn, trực quan hóa trạng thái cấu hình.

---

## 6. Tài liệu liên quan

- [Design System & Quy chuẩn giao diện](DESIGN_SYSTEM.md)
- [Quy tắc vận hành & Nghiệp vụ B2C (GEMINI.md)](../GEMINI.md)
- [Bộ hồ sơ thiết kế Blueprint](../blueprint/README.md)

- Quy tắc vận hành & nghiệp vụ: [GEMINI.md](../GEMINI.md)
- Đặc tả yêu cầu phần mềm: [HUB-2.1 SRS](../blueprint/2-design/2.1_SRS_B2C_OPS_HUB.md)
- Đặc tả tích hợp API: [HUB-2.5 Integrations](../blueprint/2-design/2.5_INTEGRATION_SPEC.md)
- Đặc tả phân quyền & xác thực: [HUB-2.6 Auth & RBAC](../blueprint/2-design/2.6_AUTH_AND_RBAC_SPEC.md)
- Hệ thống thiết kế giao diện: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
