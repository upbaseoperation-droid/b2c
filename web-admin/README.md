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
  - Bộ kiểm tra & đối soát dữ liệu thực: `npx tsx scripts/verify-db.ts` (16 tài khoản nhân sự/lãnh đạo B2C, 69 gian hàng `StorePortfolio`, 42 thương hiệu trong `AppSharedRecord` & `BrandProfileRecord`, 25 mẫu Word pháp chế trong `ContractTemplateSnapshot`, 98 kế hoạch tháng `MonthlyPlan`, 4.820 KOC chuẩn hóa 100% danh bạ Master và 16.024 bản ghi video/deal lịch sử hợp tác thực tế).
- **Quản lý dữ liệu & State:** Kiến trúc phân lớp, đồng bộ trạng thái thời gian thực giữa giao diện và các API nội bộ / bên thứ ba.
- **Xác thực:** Hỗ trợ Lark Suite SSO (`/api/auth/lark/*`) cho nhân sự nội bộ và Cổng đối tác Partner Hub Token (`/api/auth/partner/*`) cho đại diện Brand.
- **Xử lý tài liệu & Nhận diện:** Tích hợp OCR (`/api/ocr/extract-legal-doc`) bóc tách ảnh CCCD và giấy tờ pháp lý KOC.

---

## 2. Tổ chức Menu Tinh Gọn (5 Nhóm Nghiệp Vụ Chuẩn 0 → 18)

Sau khi rà soát và ẩn 10 màn hình thừa / trùng lặp, hệ thống được cấu trúc lại thành 5 nhóm màn hình mạch lạc, bám sát toàn diện chu trình vận hành từ Plan order tổng đến thanh toán:

### Nhóm 1: Điều hành & Cá nhân
1. **Việc của tôi (`cockpit` / `CockpitView`):** Bàn làm việc hàng ngày của nhân sự và quản lý: tổng hợp việc chờ xử lý (Action Items), theo dõi hạn chót SLA và cảnh báo quá hạn.
2. **Báo cáo & Dashboard (`dashboard-bi` / `ExecutiveDashboardReportsView`):**
   - *1. Ngân sách & PnL:* Đối soát chi phí Gross/Net 42 Thương hiệu, dòng tiền ĐNTT & xuất file Excel 5 sheets.
   - *2. Tiến độ 69 gian hàng (0 → 18):* Theo dõi 7 chặng phễu vận hành, phát hiện điểm nghẽn và hỗ trợ 1 chạm điều hướng trực tiếp sang màn hình tác nghiệp.
   - *3. Gian hàng & TikTok Seller:* 69 gian hàng B2C, doanh thu GMV Ads và hiệu suất chiến dịch PGM/LGM.
   - *4. Hiệu quả video:* Đánh giá sản lượng video Paid vs FOC, ROI và GMV 14d/30d.
   - *5. Lịch đăng video (W40–W45):* Ma trận nhịp độ lên sóng đồng loạt 31 ngày.
   - *6. Hiệu suất nhân sự:* Workload và đánh giá năng suất từng chuyên viên.
   - *(Tab phụ: Báo cáo Ads TikTok `ads-report`).*

### Nhóm 2: Kế hoạch & Điều phối
3. **Kế hoạch tháng (`input-plan` / `InputPlanBreakdownView`):** Tiếp nhận file 4.1 Plan order tổng, lập phân rã 4.1.1 theo tuần, kiểm soát chỉ tiêu Paid/FOC, hạn mức Net/Gross và luồng phê duyệt (8 gian hàng có Trưởng nhóm `Nguyễn Thị Ngọc Tâm` sơ duyệt → Giám đốc `Đặng Thị Yến Nhi`; 61 gian hàng không có Leader trình thẳng Giám đốc `Đặng Thị Yến Nhi`).
4. **Kịch bản & Video (`content` / `ContentView`):**
   - *Plan tháng của Brand (`BrandMonthlyPlanForm.tsx`):* Nhập 5 phần (Định hướng, KPI, Key Visual, TikTok Shop, Shopee, Pillar riêng và Chi tiết Content). Hỗ trợ cơ chế **"1 Dự Án — 1 Strategy Owner"** (`BRAND_TEAM` cho Brand lớn ≥ 1 tỷ vs `CONTENT_TEAM` cho Brand vừa & nhỏ) và phân vai Booking rõ theo bậc (`Content Team` book KOL `KL5–KL7` & Hero Content; `Booking Team` book KOC `KL1–KL4` & `FOC`).
   - *Kế hoạch content (`ContentPlanBoard.tsx`):* Sinh content từ plan Brand, xếp theo 15 pillar và lưới tuần × bậc KL; hỗ trợ đẩy trực tiếp các ô `SELF` sang phân hệ Video kênh Brand (`GET /api/content-plan?selfAll=1`).
   - *Kịch bản & Video nháp:* Tiếp nhận brief, duyệt kịch bản và tiền kiểm duyệt video trước khi lên sóng.
5. **Điều phối nhân sự (`manager` / `ManagerView` & `ManagerDelegationHub`):** Màn hình cho Giám đốc Marketing phân bổ nhân sự phụ trách 3 vị trí cấp Brand (`Content Main`, `Plan/Strategy`, `KV/SIS`), duyệt hệ số gian hàng đầu tháng (Bảng 2) cho 69 gian hàng và ghi nhận lịch sử bàn giao.
   - *(Tab phụ: Giao việc & định mức `task-delegation` theo 33 đầu việc SOW Bảng 1–7).*
6. **Chiến dịch Brand (`campaigns` / `CampaignView`):** Quản lý thực thể Chiến dịch kéo dài 1–3 tháng độc lập với vận hành thường nhật.

### Nhóm 3: Booking & Thực thi
7. **Listing, Deal & Air Video (`koc-listing` / `KocListingBatchHubView`):**
   - *Điều phối theo kế hoạch (`PlanListingBoard.tsx`):* Đề xuất danh sách KOC theo **3 đợt Listing chuẩn SLA** (Đợt 1 Ngày 10: 60% ưu tiên KL cao; Đợt 2 Ngày 20: 30%; Đợt 3 Ngày 30: 10%), đẩy Google Sheet trình Brand và kéo kết quả Brand duyệt về tự động.
   - *Deal, Job & nghiệm thu (`PlanDealBoard.tsx`):*
     - **Hồ sơ pháp lý 1–N & Quy tắc Thuế (`Booking đa sàn.md`):** Liên thông trực tiếp `KocLegalProfile` (1 KOC → N pháp nhân `INDIVIDUAL` / `HOUSEHOLD` / `COMPANY`), tự động tính giá trị ghi trên HĐ/SOW (Cá nhân ghi giá Net chưa gồm 10% TNCN; Hộ kinh doanh ghi tổng giá trị HĐ; Công ty ghi tổng gồm VAT) và kiểm soát khớp tên chủ tài khoản ngân hàng (hoặc bắt buộc đính kèm Giấy ủy quyền nhận thanh toán).
     - **Đa sàn & 6 Hình thức sản xuất (`Booking đa sàn.md`):** Tách bạch `publishPlatform` (TikTok, Facebook, YouTube, Instagram, Threads) vs `commercePlatform` (TikTok Shop, Shopee, Lazada, Website), 6 hình thức sản xuất (`ORIGINAL`, `ADAPT`, `CROSS_POST`, `POST_ONLY`, `PRODUCTION_ONLY`, `CUT_DOWN`), chế độ hiển thị giá (`PACKAGE_ALL_IN` cho KL1–KL4 vs `ITEMIZED_SOW` cho KL5–KL7) và tạo nhanh **Phụ lục SOW phát sinh sau Air** (`createPostAirUpsellJob`).
     - **Chuẩn SLA 2-3-5-7 ngày & Khóa sổ E2E (`Các SLA B2C.md`, `E2E v1.0.0`):** Kiểm soát 4 mốc SLA (2 ngày tạo vận đơn, 3 ngày chốt SOW, 5 ngày KOC gửi nháp, 7 ngày tính từ lúc giao mẫu đến lúc Air), khóa cứng ô `Link bài Air` sau 7 ngày làm việc hoặc khi qua mốc khóa sổ tháng (Mùng 2 — Ngày LV 4 — 5 — 10 — 11), theo dõi hạn nộp bản cứng HĐNT về Kế toán trước ngày 15 tháng T+1, đính kèm bill UNC gửi KOC trong 7 ngày và đồng bộ ngược hiệu suất D14/D30/D60 từ UpAffiliate.
     - **Đồng bộ xuyên suốt toàn hệ thống (`GET /api/deal-board?all=1`):** Mọi Deal/Job thực tế tạo trong `PlanDealBoard.tsx` tự động đồng bộ vào `KocProfile.tsx`, `OverviewView.tsx` và `ContractManagementView.tsx`.
8. **Video kênh Brand & CTV (`self-channel-hub` / `SelfChannelCtvHubView`):** Quản lý sản xuất video kênh tự xây (Voice, POV, Remix), đồng bộ trực tiếp các ô `SELF` từ `ContentPlanBoard` (`/api/content-plan?selfAll=1`) và điều phối danh bạ CTV / VJ.
9. **Hợp đồng & Pháp lý (`contracts` / `ContractManagementView`):** Quản lý bộ 25 biểu mẫu pháp chế chuẩn (Ver052026 + Livestream + Video SOW/HĐNT/BBNT). HĐNT ký theo từng KOC, phụ lục SOW bắt buộc liên kết với HĐNT gốc. Kiểm tra chữ ký số, hỗ trợ điền tự động từ Deal và **Chụp khung hình sản phẩm từ video KOC (`VideoProductScreenshotModal.tsx` & `/api/integrations/tiktok-koc/video-frame`)** để nhúng trực tiếp ảnh minh chứng (kèm mốc giây xuất hiện sản phẩm theo phụ đề WebVTT) vào trang A4 **Biên bản nghiệm thu (BBNT)**.

### Nhóm 4: Dữ liệu & Nghiên cứu
10. **Danh bạ KOC (`koc-master` / `KocMasterDataView`):** Tra cứu 4.820 KOC và 16.024 dòng lịch sử video/deal, hồ sơ pháp lý CCCD/MST và lịch sử tài khoản thụ hưởng.
11. **Hồ sơ thương hiệu (`brand-knowledge` / `BrandView`):** Hồ sơ định danh tĩnh của 42 nhãn hàng B2C (pháp nhân, guideline, ratecard, SKU và góc nội dung).
12. **Nghiên cứu & Đối thủ (`market-research` / `BrandMarketResearchHubView`):** Bóc tách định vị 4P, lập ma trận đối thủ trực diện và crawler video KOC TikTok đối thủ (`tiktok-crawler`).

### Nhóm 5: Hệ thống & Tiện ích
13. **Dữ liệu gốc (`master-data` / `MasterDataHubView`):** Quản lý danh mục 69 gian hàng B2C và Danh mục sản phẩm theo Brand (Brand → Nhóm sản phẩm → Sản phẩm → Link giỏ hàng & Link affiliate hoa hồng riêng).
14. **Phân quyền & Nhân sự (`partner-access` / `CentralizedRbacHubView`):** Quản trị tài khoản Lark SSO, phân quyền 14 vai trò và Data Scoping Engine.
15. **Quản lý Cloudflare R2 (`cloudflare-admin` / `CloudflareAdminView`):** Quản lý bucket tệp đính kèm và tài liệu hợp đồng.
16. **Chân trang:** Sổ tay & Hỏi đáp (`knowledge-qa`), Cấu hình API (`api-settings`).

---

## 3. Danh sách 10 Màn hình Thừa Đã Được Ẩn & Chuyển Hướng

Các màn hình sau đã được đưa vào danh sách `HIDDEN_SYSTEM_SCREENS` ([`rbacData.ts`](lib/rbacData.ts)) để ẩn hoàn toàn khỏi menu thanh bên, đồng thời được cấu hình chuyển hướng an toàn trong `TAB_ALIASES` ([`navGroups.ts`](lib/navGroups.ts)):

| Màn hình bị ẩn | Mã TabKey | Lý do ẩn | Màn hình thay thế / Tiếp nhận |
|---|---|---|---|
| **Quản lý Booking cũ** | `booking` | Prototype Kanban cũ; dữ liệu deal và quy trình thực tế đã chuyển tập trung vào bảng điều phối và bảng Deal kế hoạch | `koc-listing` (`PlanDealBoard.tsx`) |
| **List duyệt book cũ** | `approved-booking-list` | Sheet 3.2 cũ; quy trình mới đã tự động kéo kết quả Brand duyệt từ Google Sheet về bảng điều phối | `koc-listing` (`PlanListingBoard.tsx`) |
| **Hàng mẫu & Ads cũ** | `sample-tracker` | Đã tích hợp trực tiếp trường vận đơn (GHN, ViettelPost...) và mã Spark Ads vào từng Deal ở bước 12 | `koc-listing` (`PlanDealBoard.tsx`) |
| **Báo cáo Kế hoạch & Air Video** | `store-air-plan-report` | Trùng lặp hoàn toàn với tab *Tiến độ 69 gian hàng* và tab *Lịch đăng video* trong Dashboard | `dashboard-bi` (`ExecutiveDashboardReportsView.tsx`) |
| **Sản phẩm trọng tâm cũ** | `push-products` | Quản lý sản phẩm rời rạc cũ; đã thay thế bằng *Danh mục sản phẩm theo Brand* chuẩn hóa | `master-data` (`ProductCatalogView.tsx`) |
| **Hồ sơ gian hàng cũ** | `stores` | Trùng lặp 100% với tab *Gian hàng* trong Dữ liệu gốc và màn Điều phối nhân sự | `master-data` (Tab *Gian hàng*) |
| **Danh bạ CTV cũ** | `ctv-master` | Trùng lặp quản lý CTV video với phân hệ Video kênh tự xây | `self-channel-hub` |
| **Bản đồ 3D Workload** | `workload-3d` | Đồ họa WebGL nặng, không phục vụ thao tác nghiệp vụ hàng ngày của phòng Marketing B2C | `manager` |
| **Đánh giá 4P & Thưởng** | `performance-p3` | Chưa áp dụng cơ chế tính thưởng tự động trên hệ thống | `manager` |
| **Nhật ký kiểm toán** | `audit-trail` | Màn hình tra cứu kỹ thuật, không dùng trong vận hành B2C | `partner-access` |
