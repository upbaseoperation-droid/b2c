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
  - Bộ kiểm tra & đối soát dữ liệu thực: `npx tsx scripts/verify-db.ts` (16 tài khoản nhân sự/lãnh đạo B2C, 69 gian hàng `StorePortfolio`, 42 thương hiệu trong `AppSharedRecord` & `BrandProfileRecord`, 8/8 mẫu Word pháp chế trong `ContractTemplateSnapshot`, 98 kế hoạch tháng `MonthlyPlan`, 4.820 KOC chuẩn hóa 100% danh bạ Master và 16.024 bản ghi video/deal lịch sử hợp tác thực tế từ 3 nguồn Master KOC 2026 / File 3.4 / File 3.2).
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
   - Tách bạch **Hồ sơ định danh tĩnh** (Pháp nhân, Định vị 4P, Sản phẩm SKU kèm **Góc nội dung & Ma trận kịch bản Hook 3s theo SKU (`ContentAngleSetupView`)**, Từ khóa cấm, Trần thù lao, Kho tệp R2, Thông số kỹ thuật sàn & Đội ngũ phụ trách) với **Hồ sơ Tháng (`Plan & Report`)**.
   - Quản lý các chỉ số **Doanh số NMV**, **Ngân sách Net/Gross** và **Sản lượng Video (Paid KOC, Self-channel, FOC)** theo từng kỳ tháng (`2026/11`, `2026/10`, `2026/09`, `2026/08`), đối soát trực tiếp giữa **Plan (Kế hoạch tháng)** và **Report (Thực tế đạt)**.
   - Bảng tổng hợp Thương hiệu được thiết kế tinh gọn, phân cấp thị giác rõ ràng: Cột PIC hiển thị 2 tầng (Dòng 1: Plan PIC/Chính; Dòng 2: Content & Account với tooltip chi tiết), chuẩn hóa tỷ lệ % (tránh tràn số thập phân), huy hiệu cảnh báo ngân sách (Ngoài KH / Vượt NS), icon sàn thu gọn và nút drill-down tinh tế.
   - Hỗ trợ **drill-down** trực tiếp từ Hồ sơ Thương hiệu / Gian hàng xuống từng dòng phân rã trong **Kế hoạch tháng (`input-plan`)**, **Đề xuất KOC (`koc-listing`)**, **Quản lý Deal Booking & Báo cáo Video (`booking`)** và **Soạn/Xem Hợp đồng (`contracts`)**.
7. **Vận hành Booking, Danh bạ KOC Chủ lực (4.820 KOC & 16.024 Video/Deal Lịch sử hợp tác) / VJ CTV & Phân hệ độc lập Crawler KOC & Đối thủ (`tiktok-crawler` / `TikTokCrawlerHubView`):**
   - Quản lý vòng đời hợp đồng booking, kịch bản, duyệt video; đồng bộ 100% ngôn ngữ thiết kế (Design System: Panel flush, FilterBar, Chips, DataTable, drill-down xem hồ sơ in-place) giữa **Danh bạ KOC** và **Danh sách VJ / CTV**. Chuẩn hóa 100% danh bạ 4.820 KOC từ 3 nguồn (`Danh_Ba_Chuan_Hoa_Master_KOC_KOL_B2C_2026.xlsx`, `3.4 KOCs tổng hợp.xlsx`, `3.2 List duyệt book.xlsx`) bao gồm hồ sơ pháp lý/thuế (`CCCD`, `MST`, `Loại TK thuế`, `Đầu mối MCN dùng chung CCCD/MST`, `Lịch sử CCCD/TK thụ hưởng thay thế qua các đợt nghiệm thu`, `Link hợp đồng Drive`), biên độ đơn giá lịch sử (`Min`–`Max`), danh sách PIC từng hợp tác và toàn bộ 16.024 dòng video/deal thực tế (11.705 video Paid/Cast, 4.319 suất gửi mẫu FOC/Affiliate, 4.706 link video air thực tế).
   - **Động cơ Đề xuất & Chấm điểm KOC 100 điểm (`kocRecommendationEngine.ts` & `StoreShortlistFilterModal.tsx`):** Tự động đối soát định mức thiếu theo từng bậc `KL1–KL7` & `FOC` của Kế hoạch tháng, lọc loại trừ cứng (`HF-01..HF-06`), phân nhóm 4 rổ chiến thuật (*1. KOC Tái book của Brand*, *2. Winner cùng ngành*, *3. Tệp mở rộng / Đối thủ*, *4. Tệp gửi mẫu FOC/KL1*), chấm điểm 4 trụ cột (*Hiệu quả 35đ*, *Độ khớp 25đ*, *Ngân sách 20đ*, *Vận hành 20đ* + *Thưởng/Phạt*) kèm dẫn chứng số liệu và nút **Điền theo định mức thiếu** vào đợt trình duyệt (`BATCH_10`, `BATCH_20`, `BATCH_30`).
   - **Phân hệ độc lập `Crawler KOC & Đối thủ` (`TikTokCrawlerHubView.tsx`)** trên thanh menu trái thu thập 100% dữ liệu thực tế từ TikTok (tích hợp bộ giải mã `SlardarWAF` SHA-256 Proof-of-Work, bộ nhớ đệm dùng chung `SharedTikTokCrawlerStore` TTL 15–30 phút, gộp truy vấn trùng `In-Flight Deduplication`, tái sử dụng `WAF Session Cookie` và bộ điều tiết luồng `ConcurrencyLimiter` chịu tải mượt cho 30+ nhân sự dùng đồng thời):
     1. **Quét KOC làm việc cho Đối thủ (`discoverCompetitorKocs`):** Nhập `@handle` kênh TikTok hoặc tên thương hiệu đối thủ (`@larocheposayvn`, `@anessavietnam`, `@romand_vn`, `@cocoonvietnam`...), chọn số lượng cần lấy (`12 | 50 | 100 | 200 | 500`, nhập tối đa `1.000` KOC chia đợt tự động `12 KOC/lần` khi nhấn nút Quét) $\rightarrow$ Phát hiện các KOC thực tế đang đăng video review hoặc gắn giỏ sản phẩm đối thủ, lấy 100% số liệu thật từ trang video/kênh TikTok, lọc đa chiều (Trạng thái KOC Mới / Đã có tại UpBase, Hình thức hợp tác, Có SĐT, Quy mô Follower Nano/Micro/Macro/Mega, Lượt xem video tối thiểu, ER% tối thiểu, Sắp xếp theo View/Follower/ER%/Ngày đăng mới nhất).
     2. **Tìm KOC theo `#Hashtag` / Từ khóa ngách (`discoverTikTokKocsByHashtag`):** Quét KOC thực tế theo hashtag (`#kemchongnang`, `#skincare`, `#clubclio`, `#kutieskin`...) theo số lượng yêu cầu (tối đa `1.000` KOC chia đợt tự động) kèm bộ lọc Quy mô Follower, Lượt xem, ER%, Video xu hướng (`View ≥ Follower`) và sắp xếp linh hoạt.
     3. **Cào Bình luận & Lọc Khách hỏi mua (`scrapeTikTokVideoComments`):** Cào trực tiếp danh sách bình luận thật từ link video TikTok theo đợt phân trang cursor (`40 | 100 | 200 | 300 | 500`, tối đa `1.000` bình luận), tự động phân loại bình luận có nhu cầu mua hàng (`BUYING_INTENT`), phản hồi trải nghiệm sản phẩm (`PRODUCT_FEEDBACK`) và tách SĐT trong bình luận.
     4. **KOC Xu hướng theo Ngành hàng (`fetchTikTokTrendingCreators`), Cào Hồ sơ Kênh hàng loạt (`TikTokKocScraperModal`) & Nghiệm thu Link Video KOC gửi (`TikTokVideoInspectorModal`):** Quét KOC đang thịnh hành thực tế trên TikTok Việt Nam theo 7 ngành hàng B2C (`Mỹ phẩm & Skincare`, `Trang điểm`, `Chăm sóc cơ thể & Tóc`, `Mẹ & Bé`, `Chăm sóc Nam giới`, `Sức khỏe & Thực phẩm bổ sung`, `Thời trang & Đời sống`) với số lượng tùy chọn (`12 | 50 | 100 | 200 | 500` KOC chia đợt tự động), hỗ trợ lưu từng KOC hoặc lưu hàng loạt vào Danh bạ gốc, xuất CSV và kiểm tra link video KOC gửi. Toàn bộ 3 công cụ cào KOC (*Đối thủ*, *#Hashtag*, *KOC xu hướng*) sử dụng **khung bảng 5 cột đồng nhất** (`Kênh KOC & Liên hệ`, `Quy mô kênh`, `Phân loại & Ngữ cảnh`, `Video tiêu biểu`, `Thao tác`) kết hợp bộ hiển thị tiến trình quét Radar trực quan (`TikTokCrawlCreativeLoader`).
     5. **Kiểm tra link air đa nền tảng (`LinkAirCheckerPanel`):** Dán tối đa 100 link TikTok, Shopee Video, Facebook, Instagram; đối chiếu đúng kênh, lịch air, hashtag, brand, gắn sản phẩm, view tối thiểu. Chạy qua dịch vụ riêng `crawler-worker/` (route `/api/integrations/link-air-check`, cần `CRAWLER_WORKER_URL` + `CRAWLER_WORKER_TOKEN`).
8. **Hợp đồng & Hàng mẫu:** Soạn thảo hợp đồng và biên bản nghiệm thu theo đúng bộ 8 biểu mẫu chuẩn Ver052026 (`IND-HD`, `IND-BBNT`, `HKD-HD`, `HKD-BBNT`, `COM-HD`, `COM-BBNT`, `CTV-HD`, `CTV-BBNT`), bộ quy tắc pháp chế tự động (ngưỡng 50M BR-01, nghĩa vụ ký hợp đồng BR-03, nghĩa vụ biên bản nghiệm thu BR-04, phân luồng 5 stream & SLA BR-05, tính khấu trừ thuế TNCN 10% và thuế VAT BR-09, đọc số tiền thành chữ tiếng Việt), đọc ảnh CCCD/ĐKKD tự động (OCR), tích hợp WeSign trình ký điện tử và theo dõi hành trình hàng mẫu / mã Spark Ads.
9. **Cổng cộng tác đối tác (Partner Hub):** Giao diện riêng cho Brand xem tiến độ chiến dịch, duyệt kịch bản và theo dõi doanh thu sàn.
10. **Phân quyền người dùng (RBAC & Data Scoping Engine):** Phân định các nhóm quyền (CEO Đỗ Văn Giang, Giám đốc Marketing Đặng Thị Yến Nhi, Trưởng phòng Growth/Media, Trưởng nhóm Leader, Chuyên viên Specialist cả cấp Gian hàng và 3 vị trí cấp Brand, Pháp chế Legal, Kế toán Finance, Điều phối ký số Sign Admin, Đại diện thương hiệu Brand Partner). Áp dụng cơ chế **Data Scoping Engine**: nhân viên Growth/B2C chỉ được xem và thao tác trên đúng các thương hiệu, gian hàng, kế hoạch tháng và deal booking thuộc quyền quản lý trực tiếp của mình.
11. **Dữ liệu gốc danh mục tĩnh (Master Data Hub) & Chuẩn hóa Design System toàn diện:** Chuẩn hóa 100% các tab trong phân hệ Dữ liệu gốc (`Thương hiệu`, `Gian hàng`, `Sản phẩm chủ lực & SKU`, `Trụ cột nội dung`, `Danh bạ KOC`, `Danh sách VJ / CTV`) theo đúng mẫu chuẩn của Design System (`PageActions`, `Panel flush`, `FilterBar`, `Chips` có đếm số lượng thực tế, `DataTable` chuẩn với `ActionMenu`, `Pagination` và drill-down hồ sơ in-place). Lịch sử điều chuyển gian hàng và danh sách ủy quyền nhân sự dự phòng (Backup PIC) được tổ chức hiển thị trực quan trong **Điều hành & Giao việc của Quản lý (`ManagerDelegationHub`)** và trong hồ sơ chi tiết từng gian hàng (`StoreProfile`).
12. **Nhật ký kiểm toán hệ thống (`audit-trail` / `AuditTrailView`):** Phân hệ độc lập lưu vết toàn bộ hoạt động vận hành trọng yếu (Duyệt kế hoạch, Phê duyệt chi phí, Bàn giao gian hàng, Ủy quyền PIC dự phòng, Ký hợp đồng, Giải ngân). Cung cấp bộ lọc đa chiều (Đối tượng, Hành động, Người thực hiện, Thời gian) và chức năng xuất file CSV phục vụ kiểm toán nội bộ và đối soát Kế toán.
13. **Bản đồ 3D & Workload Nhân sự (`workload-3d` / `Workload3dMapView`):** Màn hình trực quan hóa không gian 3D tương tác xoay 360° (với 3 chế độ bố cục: *Trụ Tải Trọng 3D*, *Phân Tầng 3D: Nhân sự → Brand → Gian hàng*, và *Quỹ Đạo Tâm Điểm*), thể hiện chiều cao cột tải trọng Point thực tế của 28 nhân sự B2C so với định mức chuẩn Level (`L0.5`–`L3`), cảnh báo màu sắc theo trạng thái tải (`Quá tải ≥115%`, `Đủ tải 85–114%`, `Dư công suất <85%`), hiệu ứng hạt chuyển động (flowing particles) trên các đường cong liên kết 3D giữa Nhân sự — 42 Thương hiệu — 69 Gian hàng, hiệu ứng camera tự động bay (Fly-To) khi chọn nút và bảng điều phối cân bằng tải ngay bên cạnh.
14. **Hệ thống Nhận diện Thương hiệu (Brand Logos) & Nền tảng Sàn (Platform Logos):**
    - Trang bị 100% logo chính thức và vector SVG cho 42 Thương hiệu B2C tại `public/brands/` kèm module tra cứu linh hoạt `getBrandLogoUrl()` và component `BrandAvatar` hiển thị trên nền trắng bo viền thanh nhã.
    - Bộ biểu tượng sàn TMĐT (`ShopeeLogo`, `TikTokLogo`, `LazadaLogo`, `FacebookLogo`, `InstagramLogo`, `ThreadsLogo`, `LiveLogo`, `SelfChannelLogo`) và component `PlatformBadge` / `ChannelTag` ưu tiên hiển thị logo biểu tượng kèm tên ngắn gọn, tối ưu không gian hiển thị trên toàn bộ các view.
15. **Phân hệ độc lập Nghiên cứu Brand & Đối thủ (`market-research` / `BrandMarketResearchHubView.tsx` — 8 Mô-đun kèm Sổ Dẫn chứng `[EV]`):**
    - **1. Hồ sơ Brand / Đối thủ, 4P, Danh mục SKU, Mùa vụ & SWOT (`BRAND_AUDIT_4P`):** Phân tích chiến lược 4P cho toàn bộ **42 thương hiệu B2C nội bộ** và **29+ thương hiệu đối thủ lớn trên thị trường** (`Nous`, `BU Baby`, `Lullaby`, `Cocoon`, `Cỏ Mềm`, `La Roche-Posay`, `SKIN1004`, `CeraVe`, `Cetaphil`, `Bioderma`, `SVR`, `Obagi`, `Torriden`, `Keyshu`, `Anessa`, `L'Oréal`, `Rom&nd`, `Judydoll`, `Colorkey`, `Maybelline`, `Mustela`, `Bepanthen`, `Momo Rabbit`, `Moony`, `D-nee`, `Femfresh`, `Lactacyd`, `Nerman`, `Romano`...) theo 13 phân ngành chuyên biệt (`MOM_BABY_SKINCARE`, `MOM_BABY_DIAPER`, `MOM_BABY_APPAREL`, `INTIMATE_PERSONAL_CARE`, `HAIR_BODY_CARE`, `MENS_GROOMING`, `FRAGRANCE_PERFUME`, `DERMOCOSMETICS_ACNE`, `KBEAUTY_MAKEUP_SUN`, `HEALTH_COLLAGEN_SUPPLEMENT`, `MEDICAL_NUTRITION`, `HOME_LAUNDRY_CARE`, `PET_NUTRITION`), ma trận danh mục SKU thật (trích xuất từ đơn book File 3.2, `BrandProfile`, cấu hình SKU thật của đối thủ & quét trực tiếp TikTok/Website), lịch mùa vụ 4 quý, ma trận SWOT gắn dẫn chứng, bảng từ khóa cấm kiểm duyệt sàn và cơ cấu phân bổ KOC `KL1–KL4`.
    - **2. Đối soát Thực thi Nội bộ B2C & Video KOC Thực tế (`INTERNAL_EXECUTION`):** Đối với Brand B2C nội bộ: đối chiếu 69 gian hàng B2C trong `File 4.1 & 4.1.1`, liên kết tài liệu `File 3.5`, bóc tách ngân sách thực chi theo SKU từ 746 đơn `File 3.2` và hiển thị bảng chứng từ đơn booking (`BO2610...`) kèm link video thực tế (`linkAir`). Đối với Đối thủ bên ngoài: tự động cào danh sách video KOC đang lên sóng thực tế trên TikTok (`discoverCompetitorKocs`) kèm lượt xem, tỷ lệ tương tác và link video gốc để đối chiếu.
    - **3. Ma trận So sánh Đối thủ Trực diện (`COMPETITOR_MATRIX`):** Hỗ trợ dán trực tiếp tên đối thủ hoặc `@handle` ngay tại thanh công cụ trên cùng hoặc thanh tìm kiếm trong Tab 3 để lập hồ sơ nghiên cứu sâu cho đối thủ đó; khi nghiên cứu đối thủ bên ngoài, bảng tự động đưa các Brand B2C cùng phân ngành của UpBase vào ma trận để so sánh ngược và đề xuất đòn phản công; tích hợp quét trực tiếp KOC từ TikTok và xuất file `.CSV`.
    - **4. Đào Bình luận & Nỗi đau Khách hàng (`REVIEW_PAIN_MINER`):** Tự động lấy link video đã lên sóng thực tế (`linkAir` từ File 3.2 hoặc video KOC TikTok vừa quét của đối thủ) để cào bình luận trực tiếp từ TikTok kết hợp phân tích đánh giá khách hàng, gom cụm tâm lý, gợi ý Hook 3s và lưu bộ câu hỏi khó (`FAQ`) vào `BrandProfile` (`section: 'FAQS'`).
    - **5. Sổ Dẫn chứng Xác thực (`[EV-01..EV-N]`) & Quét Website (`EVIDENCE_AND_WEB`):** Lưu trữ và lọc toàn bộ nguồn chứng từ gốc cho mọi nhận định/số liệu trong hồ sơ; tự động quét DOM website chính thức của thương hiệu/đối thủ (`resolveOfficialWebsiteForBrand` + `inspectCompetitorWebUrl`) để gộp dẫn chứng trực tiếp và xuất toàn bộ báo cáo `.MD`.

---

## 3. Cổng tích hợp API

- **Lark Suite, Larkbase & Lark Approval:** Xác thực SSO, đồng bộ kế hoạch tháng từ File 4.1 Plan order tổng (`/api/integrations/larkbase/booking-plans`) và đẩy phiếu đề nghị thanh toán / tạm ứng từ Bảng 3.2 sang Lark Approval & Larkbase (`/api/integrations/larkbase/payment-requests`).
- **TikTok Shop Open API, Thu thập dữ liệu KOC, Lịch sử quét theo tuần & Nghiệm thu Video:** Đồng bộ doanh thu, GMV và đơn hàng từ Seller Center (`/api/tiktok-seller/sync`), thu thập thông tin kênh, video và chỉ số bán hàng Affiliate KOC (`/api/integrations/tiktok-koc/scrape`), đồng bộ **Lịch sử crawl KOC theo tuần (7 ngày gần nhất)** hiển thị trực tiếp ở từng tab trong màn hình Crawler giữa các nhân sự (`/api/integrations/tiktok-koc/history`), kiểm tra và nghiệm thu link video KOC gửi kèm kịch bản (`/api/integrations/tiktok-koc/inspect-video`).
- **Nghiên cứu Thị trường, Thương hiệu & Đối thủ:** Bóc tách hồ sơ 4P, lập ma trận đối thủ, đào bình luận khách hàng và quét trực tiếp trang đích (`/api/integrations/market-research/analyze`).
- **Kalodata:** Tra cứu creator và khám phá thị trường (`/api/integrations/kalodata/*`).
- **WeSign:** Đồng bộ trạng thái hợp đồng ký điện tử (`/api/contracts/integrations/wesign/*`).
- **OCR:** Đọc và trích xuất dữ liệu ảnh thẻ CCCD tiếng Việt (`/api/ocr/extract-legal-doc`).
- **Cổng Kết nối Mô hình Ngôn ngữ (`/api/integrations/llm`), Báo cáo Thẩm định Lịch sử & Rủi ro KOC (`KocHistoryEvaluationModal`) & Thiết lập Câu lệnh (Prompt) Đa Phân hệ:** Hỗ trợ cấu hình khóa API và tùy chỉnh/lưu câu lệnh chỉ dẫn (`systemInstruction`) trực tiếp tại từng phân hệ cho 8 mục đích nghiệp vụ (`LEGAL_OCR`, `SCRIPT_REVIEW`, `CONTRACT_DRAFTING`, `STAFF_REVIEW`, `PLAN_ADS_ANALYSIS`, `KOC_MATCHING`, `KOC_HISTORY_EVALUATION`, `KNOWLEDGE_QA`).

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

## 5. Cập nhật nâng cấp giao diện & Trải nghiệm người dùng (19/10/2026)

- **Kiến trúc Điều hướng & Gộp Nhóm Màn Hình (`src/lib/navGroups.ts`, `Sidebar.tsx` & `TopHeader.tsx`):** Đồng bộ 100% nhãn hiển thị giữa `Sidebar` và `TopHeader` qua `TAB_LABELS`; gộp các màn hình cùng cụm nghiệp vụ vào `NAV_GROUPS` (*Điều phối & Giao việc*, *Brand & Gian hàng*, *Nghiên cứu & Crawler* gộp `market-research`, `tiktok-crawler` và `koc-master`) hiển thị ngay trên `TopHeader` cạnh tiêu đề trang, trong khi các công cụ con bên trong màn hình sử dụng thanh `<Tabs>` ở vùng làm việc; bảo toàn trạng thái kết quả quét của `TikTokCrawlerHubView` qua `KeepAliveTab` khi chuyển qua lại với Danh bạ KOC, hỗ trợ nút quay lại trực tiếp (`Quay lại Crawl KOC Xu hướng`) từ `KocProfile` / `KocMasterDataView` cùng đồng bộ lịch sử trình duyệt (`window.history.pushState` / `popstate`), đồng thời tích hợp thanh & bảng **Lịch sử crawl theo tuần (7 ngày)** ngay bên trong mỗi tab của màn hình Crawler (`/api/integrations/tiktok-koc/history`).
- **Triệt tiêu dữ liệu trùng lặp & Phụ đề giải thích thừa (Single Source of Truth):** Mỗi thực thể chỉ quản trị tại 1 màn hình duy nhất; gỡ bỏ toàn bộ dòng phụ đề xám (`subtitle`, `description`, `hint`, `moduleSubtitle`) dưới tiêu đề; thay thế số liệu gõ cứng bằng dữ liệu tính toán động và chuẩn hóa hộp thoại sang `<Modal>`.

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
- **Chuẩn hóa Mobile & Tablet Responsive toàn diện (`360px–1023px`):**
  - Trang bị `Viewport` (`viewportFit: 'cover'`), `min-h-dvh` và `env(safe-area-inset-bottom)` cho toàn bộ khung ứng dụng, ngăn kéo điều hướng, hộp thoại (`Modal`, `Drawer`) và thông báo (`ToastStack`); ngăn trình duyệt di động tự động phóng to khi nhập liệu.
  - Tối ưu hóa `TopHeader`, `Sidebar` (khóa cuộn nền, đóng bằng `Escape`), `StatRow` / `Stat`, `Tabs`, `Segmented`, `Chips`, `FilterBar` và `DataTable` (vuốt ngang mượt trên mobile cho bảng nhiều cột, tự co giãn vừa khít trên màn hình máy tính).
  - Chuẩn hóa toàn bộ lưới biểu mẫu, bảng ma trận kế hoạch tháng, hồ sơ KOC / Thương hiệu / Gian hàng / Hợp đồng hiển thị 1 cột trên điện thoại (`grid-cols-1 sm:grid-cols-*`) và không tràn ngang ở khung nhìn `360px`.

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
