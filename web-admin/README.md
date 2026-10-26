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
- **Quản lý dữ liệu & Đồng bộ 2 chiều (PostgreSQL <-> `localStorage` Cache):**
  - **API máy chủ `/api/shared-state` (`route.ts`):**
    - Cung cấp 2 phương thức `GET` và `PUT`, quản lý dữ liệu tập trung trên bảng `AppSharedRecord` (PostgreSQL) thông qua `readRecord`, `readRecordsBatch` (đọc lô 1 truy vấn SQL / 1 lần quét thư mục kèm tùy chọn `{ clone: false }`) và `upsertRecord` kèm số hiệu phiên bản (`revision`) để chống ghi đè xung đột.
    - Tối ưu hóa truy xuất kế hoạch tháng (`monthlyPlanStore.ts` & `useMonthlyPlanSync.ts`): bộ nhớ đệm kế hoạch phía máy chủ (`cachedPlansState` + gộp request đồng thời) và bộ nhớ đệm dùng chung phía trình duyệt (`fetchClientMonthlyPlans` / `getCachedClientMonthlyPlans` + kiểm tra tham chiếu `lastSavedObjRef` chống `JSON.stringify` thừa), kết hợp `WeakMap` memoization trên các hàm kiểm định/tổng hợp kế hoạch (`planBreakdownRules.ts`, `monthlyPlanData.ts`, `monthlyProfileMetrics.ts`).
    - Hỗ trợ tham số: `?key=<mã>` (lấy 1 bộ dữ liệu), `?keys=<mã1,mã2>` (lấy nhiều bộ cụ thể), hoặc không truyền tham số để lấy toàn bộ 16 bộ dữ liệu trong danh sách `ALLOWED_SHARED_STATE_KEYS`.
    - Hỗ trợ lưu bản ghi đơn qua `{ key, data }` hoặc cập nhật hàng loạt qua `{ updates: { [key]: data } }`.
    - Tự động giới hạn số lượng bản ghi lịch sử để kiểm soát dung lượng: tối đa 100 ảnh nghiệm thu (`video-acceptance-screenshots-v1`) và 500 dòng nhật ký API (`api-usage-logs-v1`).
    - Đồng bộ thực thể quan hệ: Khi cập nhật `store-overrides-v1`, API tự động trích xuất các trường ghi đè (`difficultyTier`, `difficultyMultiplier`, `b2cOwnerName`, `accountOwnerName`, `bookingLeader`, `hasBookingLeader`) và cập nhật trực tiếp vào bảng quan hệ `prisma.storePortfolio`.
  - **Module client `src/lib/sharedStateClient.ts`:**
    - `hydrateAllSharedStatesFromDb()`: Kích hoạt khi khởi tạo ứng dụng (`page.tsx`), tải dữ liệu mới nhất từ PostgreSQL về lưu vào `localStorage` và phát `CustomEvent` tương ứng để các màn hình cập nhật ngay lập tức. Nếu máy chủ chưa có dữ liệu (`revision === 0`) nhưng `localStorage` đã có sẵn dữ liệu cục bộ, hệ thống tự động gom backfill và đẩy lên máy chủ.
    - `pushSharedStateToDb(key, data, debounceMs = 250)`: Tự động gom và đẩy dữ liệu lên `/api/shared-state` với độ trễ debounce 250ms khi có chỉnh sửa trên giao diện.
  - **16 bộ dữ liệu vận hành B2C được đồng bộ:**
    1. `brand-monthly-plans-v1` (`b2c_brand_monthly_plans_v1`): Kế hoạch tháng Brand.
    2. `store-air-plans-v1` (`upbase_b2c_store_air_plans_v1`): Kế hoạch Air Gian hàng.
    3. `approved-booking-list-v2` (`upbase_b2c_approved_booking_list_v2`): Danh sách Booking đã duyệt.
    4. `staff-brand-listing-sheets-v1` (`upbase_b2c_staff_brand_listing_sheets_v1`): Sheet Listing KOC theo nhãn.
    5. `video-acceptance-screenshots-v1` (`upbase_b2c_video_acceptance_screenshots_v1`): Kho ảnh nghiệm thu.
    6. `store-overrides-v1` (`upbase_store_overrides_v1`): Ghi đè gian hàng (tự động đồng bộ sang `prisma.storePortfolio`).
    7. `sla-tasks-v1` (`upbase_b2c_sla_tasks_v1`): Task SLA.
    8. `task-difficulty-configs-v1` (`upbase_b2c_task_difficulty_configs_v1`): Cấu hình hệ số độ khó.
    9. `sow-point-policies-v1` (`upbase_b2c_sow_point_policies_v1`): Điểm SOW.
    10. `staff-workload-exceptions-v1` (`upbase_b2c_staff_workload_exceptions_v1`): Ngoại lệ tải công việc nhân sự.
    11. `third-party-accounts-v1` (`upbase_b2c_third_party_accounts_v1`): Tài khoản đối tác bên thứ 3.
    12. `api-workspace-config-v2` (`upbase_b2c_api_workspace_config_v2`): Cấu hình API & System Prompt tập trung.
    13. `api-usage-logs-v1` (`upbase_b2c_api_usage_logs_v1`): Nhật ký sử dụng API.
    14. `custom-knowledge-articles-v1` (`upbase_b2c_custom_knowledge_articles_v1`): Bài viết kiến thức Marketing.
    15. `ads-reports-metadata-v1`: Metadata báo cáo Ads.
    16. `cloudflare-r2-config-v1`: Cấu hình Cloudflare R2.
- **Xác thực:** Hỗ trợ Lark Suite SSO (`/api/auth/lark/*`) cho nhân sự nội bộ và Cổng đối tác Partner Hub Token (`/api/auth/partner/*`) cho đại diện Brand.
- **Xử lý tài liệu & Nhận diện:** Tích hợp OCR (`/api/ocr/extract-legal-doc`) bóc tách ảnh CCCD và giấy tờ pháp lý KOC.

---

## 2. Tổ chức Menu Tinh Gọn (5 Nhóm Nghiệp Vụ Chuẩn 0 → 18)

Sau khi rà soát và ẩn 10 màn hình thừa / trùng lặp, hệ thống được cấu trúc lại thành 5 nhóm màn hình mạch lạc, bám sát toàn diện chu trình vận hành từ Plan order tổng đến thanh toán:

### Nhóm 1: Điều hành & Cá nhân
1. **Việc của tôi (`cockpit` / `CockpitView`):** Bàn làm việc hàng ngày của nhân sự và quản lý: tổng hợp việc chờ xử lý (Action Items), theo dõi hạn chót SLA và cảnh báo quá hạn.
2. **Báo cáo & Dashboard (`dashboard-bi` / `ExecutiveDashboardReportsView`):**
   - *1. Ngân sách & PnL:* Đối soát chi phí Gross/Net 42 Thương hiệu, dòng tiền ĐNTT & xuất file Excel 5 sheets.
   - *2. Tiến độ 69 gian hàng (0 → 18):* Theo dõi 7 chặng phễu vận hành, đồng bộ trực tiếp trạng thái hợp lệ Plan `4.1 vs 4.1.1` (`evaluatePlanValiditySummary`), phát hiện điểm nghẽn và hỗ trợ 1 chạm điều hướng trực tiếp sang màn hình tác nghiệp.
   - *3. Gian hàng & TikTok Seller:* 69 gian hàng B2C, doanh thu GMV Ads và hiệu suất chiến dịch PGM/LGM.
   - *4. Hiệu quả video:* Đánh giá sản lượng video Paid vs FOC, ROI và GMV 14d/30d.
   - *5. Lịch đăng video (W40–W45):* Ma trận nhịp độ lên sóng đồng loạt 31 ngày.
   - *6. Hiệu suất nhân sự:* Workload và đánh giá năng suất từng chuyên viên.
   - *(Tab phụ: Báo cáo Ads TikTok `ads-report`).*

### Nhóm 2: Kế hoạch & Điều phối
3. **Kế hoạch tháng (`input-plan` / `InputPlanBreakdownView` & `MonthlyPlanHub.tsx`):**
   - **Bảng Điều Khiển Tiến Độ & Thẩm Định Hợp Lệ 4 Chặng (`STORE_GOVERNANCE`):** Hiển thị tổng quan cho Quản lý theo 4 chặng liên hoàn: (1) *Tiến độ Plan Tổng 4.1* (Đã chốt 4.1, Chưa chốt, Có bản 4.1 mới lệch, Chưa lập), (2) *Tiến độ Plan Chi tiết 4.1.1* (Đã chia tuần 4.1.1 vs Chưa chia tuần), (3) *Kiểm định Tính hợp lệ 4.1 vs 4.1.1* (`evaluatePlanValiditySummary`: Khớp 4.1, Hợp lệ có giải trình, Lệch 4.1 chưa giải trình, Lỗi cấu trúc 4.1.1, Cảnh báo đơn giá vượt trần Bảng 5.6), và (4) *Phê duyệt & Triển khai tiếp* (Chờ sơ duyệt Leader, Chờ GĐ duyệt, Cần sửa lại, Đã duyệt triển khai — kèm nút **Duyệt hàng loạt plan hợp lệ**).
   - **Hộp thoại Thẩm định & Đối soát Nhanh Plan 4.1 vs 4.1.1:** Bấm vào nhãn hợp lệ trên từng gian hàng để xem bảng đối soát 7 chỉ tiêu (`Chi phí Gross`, `Chi phí Net`, `Tổng Video`, `Video Paid`, `Video FOC`, `Video Kênh Brand`, `Số giờ Live`), kiểm tra ghi chú giải trình (`breakdownNote`), tự động khớp 4.1 & chia đều tuần, yêu cầu sửa lại, sơ duyệt / phê duyệt trực tiếp hoặc chuyển sang điều phối Listing KOC.
   - **Trình soạn thảo 5 bước 4.1.1:** Tiếp nhận file 4.1 Plan order tổng (cảnh báo 3 lớp: kiểm tra cột `Chốt plan` và chặn gửi duyệt khi 4.1 chưa chốt, cảnh báo chi tiết chỉ tiêu lệch trên bản Nháp, và bảo vệ bản Đã duyệt kèm cờ `Lệch 4.1 mới` để Quản lý chủ động mở khóa cập nhật), lập phân rã 4.1.1 theo tuần (đồng bộ 2 chiều giữa Bước 2 *Phân bổ kênh & KOC* và Bước 3 *Phân rã tuần*, tự nhân đơn giá khi nhập số lượng tuần, chia nhanh theo kịch bản *Chia đều / Dồn Mega W2–W3 / Dồn đầu tháng / Khớp Bảng 4.1* và bảo toàn nhân sự `+Chia`), kiểm soát chỉ tiêu Paid/FOC, hạn mức Net/Gross và luồng phê duyệt (8 gian hàng có Trưởng nhóm `Nguyễn Thị Ngọc Tâm` sơ duyệt → Giám đốc `Đặng Thị Yến Nhi`; 61 gian hàng không có Leader trình thẳng Giám đốc `Đặng Thị Yến Nhi`).
   - **Màn hình Chi tiết Kế hoạch Tháng theo Brand (`MonthlyPlanHub.tsx` + `BrandOneSheetPlanView.tsx` + `oneSheetPlanBuilder.ts`):** Mở màn hình toàn trang thay cho hộp thoại popup khi nhập/xem Plan Brand (có thanh điều hướng chuyển nhanh giữa các Brand, 2 tab *Biểu mẫu Plan Brand 01→05* và *Phân công 3 vị trí & Chiến dịch*, cùng lối tắt sang Plan 4.1.1 của từng gian hàng). Kết nối trực tiếp dữ liệu từ **Phân rã 4.1.1 (`extractBrand411Summary`)** của các gian hàng thuộc Brand sang toàn bộ các bảng KPI 2 sàn (`02`), Phân bổ Tuần W1–W5 theo từng bậc `KL1–KL7` & `FOC` (`4.2`), Tổng quan & Chi tiết Content TikTok (`4.1`, `4.3` gồm `Video Cast`, `FOC`, `Self-channel`, `Livestream`) và Shopee (`5.2`, `5.3`), kèm **Bảng Đối Soát Khớp Nối 4.1.1 ↔ Plan Brand** và nút *Đồng bộ chuẩn từ 4.1.1*. Trong Section `03. Key Visual Chung Của Tháng`, chuyển phần lịch lên plan ảnh thành **Bảng Kế hoạch & Mốc thời gian lên Plan ảnh Key Visual (`kvScheduleRows`: Đợt/Phiên bản KV, Hạng mục thiết kế, Ngày lên Ref, Ngày Order, Ngày nộp Draft, Ngày Duyệt, Ngày Treo KV, PIC, Ghi chú)** tự động tính số ngày giữa các mốc, kết hợp chức năng tải ảnh Key Visual trực tiếp (`kvImages`: `MASTER_KV`, `SIS_BANNER`, `PDP_FRAME`, `MOODBOARD`) kèm xem trước ảnh lớn, sửa ghi chú/phân loại và đồng bộ số lượng ảnh ra bảng danh sách Brand.
4. **Kịch bản & Video (`content` / `ContentView`):**
   - *Plan tháng của Brand (`BrandMonthlyPlanForm.tsx`):* Nhập 5 phần (Định hướng, KPI, Key Visual kèm tải ảnh Key Visual, TikTok Shop, Shopee, Pillar riêng và Chi tiết Content). Hỗ trợ cơ chế **"1 Dự Án — 1 Strategy Owner"** (`BRAND_TEAM` cho Brand lớn ≥ 1 tỷ vs `CONTENT_TEAM` cho Brand vừa & nhỏ), phân vai Booking rõ theo bậc (`Content Team` book KOL `KL5–KL7` & Hero Content; `Booking Team` book KOC `KL1–KL4` & `FOC`), và móc trực tiếp **SKU đơn / Combo** từ chiều Sản phẩm của Brand.
   - *Sản phẩm & Combo của Brand (`ProductCatalogView.tsx` & `productCatalog.ts`):* Quản lý chiều Sản phẩm độc lập xuyên tháng theo cấu trúc **Brand → Nhóm sản phẩm (USP, Claim cấm) → Sản phẩm / Combo (`SINGLE` SKU đơn, `HARD_BUNDLE` Combo có link riêng trên sàn, `ROUTINE_COMBO` Combo ghép nhiều link lẻ) → Thành phần cấu thành Combo (`bundleComponents`: Số lượng, Vai trò Chính/Phụ/Quà tặng, Tỷ trọng phân bổ báo cáo %) → Link giỏ hàng theo Gian hàng & Link Affiliate hoa hồng riêng**, kèm kiểm soát tồn mẫu khả dụng (`resolveEffectiveSampleQuota`) và SKU thay thế khi hết hàng (`substituteProductId`).
   - *Kế hoạch content (`ContentPlanBoard.tsx`):* Sinh content từ plan Brand, xếp theo 15 pillar và lưới tuần × bậc KL; khi chọn Nhóm SP & SKU/Combo tự động gắn sẵn **Link giỏ hàng sàn (`cartUrl`)**, **Link Commission (`affiliateUrl`, `commissionPct`)**, **USP bắt buộc (`usp`)**, **Claim cấm (`forbiddenClaims`)** và **Từ khóa nhận diện (`detectKeywords`)** vào từng dòng Brief; hỗ trợ đẩy trực tiếp các ô `SELF` sang phân hệ Video kênh Brand (`GET /api/content-plan?selfAll=1`).
   - *Kịch bản & Video nháp:* Tiếp nhận brief, duyệt kịch bản và tiền kiểm duyệt video trước khi lên sóng.
5. **Điều phối nhân sự (`manager` / `ManagerView` & `ManagerDelegationHub`):** Màn hình cho Giám đốc Marketing phân bổ nhân sự phụ trách Gian hàng (1 Nhân viên chính PIC + đa chọn nhiều Nhân viên hỗ trợ cùng thực thi, đồng bộ với `StoreProfile` và `StoreHandoverDialog`), phân bổ 3 vị trí cấp Brand (`Content Main`, `Plan/Strategy`, `KV/SIS`), duyệt hệ số gian hàng đầu tháng (Bảng 2) cho 69 gian hàng và ghi nhận lịch sử bàn giao.
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
8. **Video kênh Brand & CTV (`self-channel-hub` / `SelfChannelCtvHubView`):** Quản lý sản xuất video kênh tự xây (Voice, AI, Remix, Video to live, Nhạc text), lưu trữ theo từng kế hoạch tháng qua `/api/self-channel-board`, kiểm soát 6 bước nghiệp vụ (Brief, Kịch bản, Sản xuất QA, Duyệt Brand, Nghiệm thu, Thanh toán), đồng bộ trực tiếp các ô `SELF` từ `ContentPlanBoard` (`/api/content-plan?selfAll=1`) và tích hợp đối soát Kế hoạch vs Thực tế qua `/api/plan-actual-report`.
9. **Hợp đồng & Pháp lý (`contracts` / `ContractManagementView`):** Quản lý bộ 25 biểu mẫu pháp chế chuẩn (Ver052026 + Livestream + Video SOW/HĐNT/BBNT). HĐNT ký theo từng KOC, phụ lục SOW bắt buộc liên kết với HĐNT gốc. Kiểm tra chữ ký số, hỗ trợ điền tự động từ Deal và **Chụp khung hình sản phẩm từ video KOC (`VideoProductScreenshotModal.tsx` & `/api/integrations/tiktok-koc/video-frame`)** để nhúng trực tiếp ảnh minh chứng (kèm mốc giây xuất hiện sản phẩm theo phụ đề WebVTT) vào trang A4 **Biên bản nghiệm thu (BBNT)**.

### Nhóm 4: Dữ liệu & Nghiên cứu
10. **Danh bạ KOC (`koc-master` / `KocMasterDataView`):** Tra cứu 4.820 KOC và 16.024 dòng lịch sử video/deal, hồ sơ pháp lý CCCD/MST và lịch sử tài khoản thụ hưởng.
11. **Hồ sơ thương hiệu (`brand-knowledge` / `BrandProfilesView` & `BrandProfileDetail`):** Hồ sơ định danh tĩnh của 42 nhãn hàng B2C (pháp nhân, guideline, ratecard, **Danh mục Nhóm Sản phẩm & Combo 2 tầng** `ProductCatalogView` và góc nội dung theo SKU).
12. **Nghiên cứu & Đối thủ (`market-research` / `BrandMarketResearchHubView`):** Bóc tách định vị 4P, lập ma trận đối thủ trực diện và crawler video KOC TikTok đối thủ (`tiktok-crawler`).

### Nhóm 5: Hệ thống & Tiện ích
13. **Dữ liệu gốc (`master-data` / `MasterDataHubView`):** Quản lý danh mục Thương hiệu, 69 Gian hàng B2C, Trụ cột nội dung, Bậc cast, Tệp kênh, Định dạng video, Danh bạ KOC, VJ/CTV, Nhân sự và Chuẩn SLA & KPI (đã gỡ bỏ các tab nhập liệu sản phẩm trùng lặp tại Dữ liệu gốc để tập trung 100% về `Hồ sơ thương hiệu › Sản phẩm, Combo & Góc nội dung`).
14. **Phân quyền & Nhân sự (`partner-access` / `CentralizedRbacHubView`):** Quản trị tài khoản Lark SSO, phân quyền 14 vai trò và Data Scoping Engine.
15. **Quản lý Cloudflare R2 (`cloudflare-admin` / `CloudflareAdminView`):** Quản lý bucket tệp đính kèm và tài liệu hợp đồng.
16. **Bộ công cụ tiện ích (`work-toolkit` / `WorkToolkitHubView`):** Kho 12 công cụ tác nghiệp nhanh cho quản lý và chuyên viên nội bộ (Quy đổi Gross ↔ Net & bậc KL, bảng thuế/hoa hồng hàng loạt, tính ROAS/CIR hòa vốn, chia định mức KPI tuần, tính điểm tải P3 theo 33 đầu việc SOW, tính lịch SLA ngược từ ngày Air, bóc tách hàng loạt link TikTok/Shopee đối chiếu danh bạ KOC, tạo mã QR VietQR chuẩn Bảng 3.2, tạo link UTM, kiểm tra từ hạn chế TikTok Shop, tính thời lượng đọc kịch bản, soạn Brief/Hashtag và đối soát 2 danh sách mã).
17. **Chân trang:** Bộ công cụ tiện ích (`work-toolkit`), Sổ tay & Hỏi đáp (`knowledge-qa`), Cấu hình API (`api-settings`).

---

## 3. Danh sách 10 Màn hình Thừa Đã Được Ẩn & Chuyển Hướng

Các màn hình sau đã được đưa vào danh sách `HIDDEN_SYSTEM_SCREENS` ([`rbacData.ts`](lib/rbacData.ts)) để ẩn hoàn toàn khỏi menu thanh bên, đồng thời được cấu hình chuyển hướng an toàn trong `TAB_ALIASES` ([`navGroups.ts`](lib/navGroups.ts)):

| Màn hình bị ẩn | Mã TabKey | Lý do ẩn | Màn hình thay thế / Tiếp nhận |
|---|---|---|---|
| **Quản lý Booking cũ** | `booking` | Prototype Kanban cũ; dữ liệu deal và quy trình thực tế đã chuyển tập trung vào bảng điều phối và bảng Deal kế hoạch | `koc-listing` (`PlanDealBoard.tsx`) |
| **List duyệt book cũ** | `approved-booking-list` | Sheet 3.2 cũ; quy trình mới đã tự động kéo kết quả Brand duyệt từ Google Sheet về bảng điều phối | `koc-listing` (`PlanListingBoard.tsx`) |
| **Hàng mẫu & Ads cũ** | `sample-tracker` | Đã tích hợp trực tiếp trường vận đơn (GHN, ViettelPost...) và mã Spark Ads vào từng Deal ở bước 12 | `koc-listing` (`PlanDealBoard.tsx`) |
| **Báo cáo Kế hoạch & Air Video** | `store-air-plan-report` | Trùng lặp hoàn toàn với tab *Tiến độ 69 gian hàng* và tab *Lịch đăng video* trong Dashboard | `dashboard-bi` (`ExecutiveDashboardReportsView.tsx`) |
| **Sản phẩm trọng tâm cũ** | `push-products` | Quản lý sản phẩm rời rạc cũ; đã thay thế bằng *Sản phẩm & Combo của Brand* chuẩn hóa | `content` (`ProductCatalogView.tsx`) |
| **Hồ sơ gian hàng cũ** | `stores` | Trùng lặp 100% với tab *Gian hàng* trong Dữ liệu gốc và màn Điều phối nhân sự | `master-data` (Tab *Gian hàng*) |
| **Danh bạ CTV cũ** | `ctv-master` | Trùng lặp quản lý CTV video với phân hệ Video kênh tự xây | `self-channel-hub` |
| **Bản đồ 3D Workload** | `workload-3d` | Đồ họa WebGL nặng, không phục vụ thao tác nghiệp vụ hàng ngày của phòng Marketing B2C | `manager` |
| **Đánh giá 4P & Thưởng** | `performance-p3` | Chưa áp dụng cơ chế tính thưởng tự động trên hệ thống | `manager` |
| **Nhật ký kiểm toán** | `audit-trail` | Màn hình tra cứu kỹ thuật, không dùng trong vận hành B2C | `partner-access` |
