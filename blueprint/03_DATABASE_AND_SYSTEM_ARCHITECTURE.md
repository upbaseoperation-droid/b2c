# KIẾN TRÚC DỮ LIỆU & HỆ THỐNG HYBRID (GIẢI QUYẾT TRIỆT ĐỂ GIẬT LAG LARK)
## Nền tảng quản trị vận hành tốc độ cao cho Marketing B2C Upbase

> **Khoảng cách thiết kế 24/09/2026:** Mô hình `BookingDeal`–`Contract` một-một đang mô tả prototype, chưa đáp ứng HĐNT, phụ lục/SOW gom nhiều BO cùng KOC và tháng, cũng như phụ lục bổ sung cho BO phát sinh sau ký. Đây là yêu cầu SDLC giai đoạn 1 tại [BRD booking đa nền tảng](08_BOOKING_MULTIPLATFORM_BRD.md). Chưa sửa schema triển khai trước khi chốt các điểm còn mở trong BRD.

> **Đầu vào plan Growth:** Plan nguồn đang trên Lark. Kết nối API là phương án khả thi nếu xác định được Base/Sheets và app có quyền đọc. Trong giai đoạn 1 chưa chốt API, webhook hay schema đồng bộ; yêu cầu thử nghiệm và quy tắc nguồn dữ liệu ghi tại [BRD mục 2b](08_BOOKING_MULTIPLATFORM_BRD.md#2b-khả-thi-tích-hợp-plan-growth-từ-lark--cần-xác-minh-tại-tenant).

> **Phạm vi dữ liệu:** Bản xuất `4.1 Plan order tổng.xlsx` có 228 cột, gồm nhiều nhóm lịch sử, vận hành và báo cáo. Thiết kế tích hợp phải dùng danh sách trường plan Growth được chốt trong BRD, giữ ID nguồn và trạng thái duyệt; không sao chép nguyên bảng 228 cột vào mô hình plan Booking.

---

## 1. Phân tích nguyên nhân kỹ thuật khiến Lark Base bị giật lag
1. **Client-side Evaluation Overload:** Lark Base tải toàn bộ bảng dữ liệu cùng hàng trăm công thức Rollup/Lookup về RAM của trình duyệt người dùng. Khi bảng vượt qua 2,000 - 5,000 dòng liên kết, trình duyệt ngốn 1.5GB - 2GB RAM và bắt đầu đơ chuột/treo tab.
2. **Khối lượng Media phình to:** Hàng nghìn video draft, ảnh banner, PDP, hợp đồng scan đính kèm trực tiếp trong từng ô dữ liệu làm nghẽn băng thông tải trang.
3. **Xung đột ghi đồng thời (Concurrent Write Conflict):** 30 nhân sự cùng nhập liệu và lọc dữ liệu đồng thời khiến cơ chế đồng bộ thời gian thực của Lark liên tục tính toán lại cho tất cả người dùng.

---

## 2. Mô hình Kiến trúc Hiện Đại (Next.js + Prisma + Supabase + Vercel)

Hệ thống tách biệt hoàn toàn giữa **Tầng Lưu trữ & Tính toán** và **Tầng Giao tiếp**:

```
[ FRONTEND & API LAYER - NEXT.JS ON VERCEL ]
  ├── Tốc độ tải trang < 300ms (App Router, SSR & Server Actions)
  ├── Virtualized Table: Cuộn mượt mà 50.000 dòng KOC không tốn RAM
  └── 8 Phân hệ nghiệp vụ chuyên biệt (Cockpit, Brand, Content, Booking, Contracts, Manager, Leaderboard, Import)
          │ 
          ▼ (Type-Safe Query via Prisma Client v6)
[ DATA ACCESS LAYER - PRISMA ORM ]
  ├── Schema Modeling 8 thực thể quan hệ (schema.prisma)
  ├── Connection Pooling: Cổng 6543 tối ưu cho serverless Vercel
  └── Auto-generated TypeScript Types (Zero runtime schema errors)
          │ 
     ┌────┴─────────────────────────────┐
     ▼                                  ▼
[ SUPABASE (PostgreSQL + Auth + Storage) ] [ LARK OPEN API & BOT ]
  ├── PostgreSQL Database đánh Index KOCs    (Nhận thông báo Card Message,
  ├── Supabase Storage lưu Hợp đồng PDF      duyệt tạm ứng 12h trực tiếp,
  └── Supabase Auth phân quyền 5 Roles       cảnh báo vượt 50% SLA vào chat)
```

---

## 3. Thiết kế Cơ sở Dữ liệu Quan hệ (Relational Database Schema)

### 3.0. Bảng `brands` & `ecom_stores` (Quản Lý Danh Mục Nhãn Hàng & Gian Hàng E-Commerce)
* **Bảng `brands` (Do Trưởng phòng quản lý - Nhân viên chỉ xem):**
  - `id` (VARCHAR PK, vd: `brand-kutieskin`, `brand-royal-ausnz`)
  - `code` (VARCHAR UNIQUE, vd: `BRAND_KUTIESKIN`)
  - `name` (VARCHAR): Tên thương hiệu
  - `company_name` (VARCHAR): Công ty chủ quản / Pháp nhân
  - `category` (VARCHAR): Mẹ & bé, Dược mỹ phẩm, Skincare, Gia dụng...
  - `status` (ENUM: `ACTIVE`, `PAUSED`, `UPCOMING`)
  - `plan_budget` (DECIMAL): Ngân sách tháng được phân bổ
  - `spent_budget` (DECIMAL): Ngân sách thực chi lũy kế
  - `target_gmv` (DECIMAL): Doanh thu GMV mục tiêu
  - `current_gmv` (DECIMAL): GMV thực tế đạt được từ TikTok Shop/Shopee
  - `target_videos` (INT), `aired_videos` (INT)
  - `account_pic` (VARCHAR): Nhân sự Account phụ trách quan hệ Brand
  - `growth_pic` (VARCHAR): Nhân sự Growth phụ trách chạy ads & traffic
  - `booking_pic_lead` (VARCHAR): Trưởng nhóm Booking phụ trách KOCs
  - `brand_guideline` (TEXT): Quy định duyệt kịch bản, tone & voice của Brand
  - `koc_criteria` (TEXT): Tiêu chí chọn KOC phù hợp
  - `forbidden_notes` (TEXT): Những điều cấm kỵ (scandal, so sánh tiêu cực)

* **Bảng `ecom_stores` (Gian hàng trực thuộc Brand):**
  - `id` (VARCHAR PK, vd: `store-kutieskin-tts`)
  - `brand_id` (FK `brands.id`)
  - `platform` (ENUM: `TIKTOK_SHOP`, `SHOPEE_MALL`, `LAZADA`)
  - `store_name` (VARCHAR): Tên gian hàng (vd: `Kutieskin Official Store`)
  - `store_id` (VARCHAR): Mã định danh gian hàng trên sàn (`TTS_VN_83921`)
  - `store_url` (VARCHAR): Link gian hàng
  - `affiliate_rate` (DECIMAL): Tỷ lệ hoa hồng affiliate mặc định (%)
  - `requires_spark_ads` (BOOLEAN): Yêu cầu bắt buộc mã Spark Ads (tránh gap ngân sách)
  - `status` (ENUM: `ACTIVE`, `PAUSED`)

* **Bảng `hero_products` (Sản phẩm chủ lực booking & cấp mẫu):**
  - `id` (VARCHAR PK)
  - `brand_id` (FK `brands.id`)
  - `product_name` (VARCHAR): Tên sản phẩm
  - `sku` (VARCHAR)
  - `price` (DECIMAL)
  - `commission_rate` (DECIMAL)
  - `sample_available` (BOOLEAN), `sample_stock` (INT)
  - `pdp_url` (VARCHAR): Link chi tiết sản phẩm trên sàn

### 3.1. Bảng `campaigns` (Chiến dịch Brand Team)
- `id` (VARCHAR PK, vd: `CAMP-2026-1010`)
- `brand_id` (FK `brands.id`): Liên kết nhãn hàng
- `name` (VARCHAR): Tên chiến dịch
- `brand_name` (VARCHAR)
- `status` (ENUM: `DRAFT`, `BRIEF_SENT`, `IN_EXECUTION`, `COMPLETED`, `ARCHIVED`)
- `big_idea` (TEXT)
- `key_message` (TEXT)
- `target_audience` (TEXT)
- `budget_total` (DECIMAL)
- `start_date` (DATE), `end_date` (DATE)
- `created_by` (VARCHAR), `created_at` (TIMESTAMP)

### 3.2. Bảng `content_plans` (Kế hoạch nội dung Content Team)
- `id` (VARCHAR PK)
- `campaign_id` (FK `campaigns.id`)
- `pillar_name` (VARCHAR): Giáo dục, Bán hàng, Giải trí, Social Proof...
- `channel` (ENUM: `TIKTOK`, `SHOPEE`, `FACEBOOK`, `THREADS`, `ALL`)
- `angle_description` (TEXT)
- `target_koc_tier` (ENUM: `TIER_1`, `TIER_2`, `TIER_3`, `TIER_4`)
- `required_posts_count` (INT)
- `status` (ENUM: `PLANNING`, `HANDED_OFF_TO_BOOKING`, `COMPLETED`)

### 3.3. Bảng `koc_profiles` (Danh bạ KOC & 4 Phân Loại Cốt Lõi - Sheet 3.1 & 3.2)
- `id` (VARCHAR PK)
- `channel_id` (VARCHAR UNIQUE): ID kênh (vd: `@megauriviu`)
- `stage_name` (VARCHAR): Tên kênh / biệt danh KOC
- `real_name` (VARCHAR)
- `tier` (ENUM: `TIER_1_CELEB`, `TIER_2_MACRO`, `TIER_3_MICRO`, `TIER_4_AFFILIATE`)

**🌟 4 TRƯỜNG PHÂN LOẠI CỐT LÕI (Chuẩn hóa từ Sheet 3.1, 3.2, 5.4, 5.6):**
1. **`salary_grade` (ENUM `SalaryGrade`):** Khung lương booking net (`TAP_UP_AFFILIATE`, `KL1`..`KL7`, `TAP_EXTERNAL`).
2. **`segment` (ENUM `CreatorSegment`):** Phân nhóm vai trò chiến lược (`MASSIVE_CREATOR`, `MID_CREATOR`, `KEY_CREATOR`, `TOP_CREATOR`).
3. **`tep_kenh` (VARCHAR):** 25 tệp kênh chuẩn hóa (Review Nữ, Review Nam, Unboxing, Seller, Mẹ bé (bầu), Mẹ bé (bé), Gia đình, Couple, Beauty, Health, Makeup Artist, Tóc, Bác sỹ/chuyên gia, Gym, Eat Clean, Thời trang (review), Thời trang (có kiến thức), Lifestyle, Nhà cửa đời sống, Cooking, Thú cưng, POV, Dance, Cosplay, Tin tức, LGBT, KOL, Nữ xinh).
4. **`koc_category` (ENUM `KocCategory`):** 9 nhóm ngành hàng cốt lõi (`PERSONAL_CARE`, `MOM_AND_BABY`, `REVIEWER`, `LIFESTYLE`, `FASHION`, `ELHA`, `FB`, `SOCIAL_COMEDIAN`, `TRAVEL_HOSPITALITY`).

- `main_channel` (VARCHAR), `channel_url` (VARCHAR)
- `followers_count` (INT), `avg_views` (INT)
- `niche` (VARCHAR): Chi tiết ngách kênh
- `phone` (VARCHAR), `cccd` (VARCHAR), `tax_code` (VARCHAR)
- `bank_name` (VARCHAR), `bank_account_number` (VARCHAR)
- `rate_card_video` (DECIMAL), `rate_card_live` (DECIMAL)
- `reliability_score` (INT 1-10): Điểm uy tín trả bài

### 3.0. Bảng `store_portfolios` & `store_staff_assignments` (Module 1: Danh Mục Gian Hàng, Phân Quyền & Đồng Phụ Trách Đa Nhân Sự)
* **Bảng `store_portfolios` (Quản trị danh mục gian hàng 4P Marketing B2C):**
  - `id` (VARCHAR PK)
  - `brand_name` (VARCHAR): Thương hiệu chủ quản (Kutieskin, Fresh Herb, Bio-Essence...)
  - `store_name` (VARCHAR UNIQUE): Tên gian hàng (vd: `Kutieskin Mama_TikTok_E2E-S`)
  - `platform` (VARCHAR): TikTok Shop, Shopee Mall, Lazada
  - `store_url` (VARCHAR): Đường dẫn gian hàng
  - `service_model` (ENUM: `FULL_SERVICE`, `AFFILIATE_ONLY`, `LIVESTREAM_DEDICATED`)
  - `difficulty_tier` (VARCHAR): Khó (x1.6), Vừa (x1.4), Tiêu chuẩn (x1.2), Cơ bản (x1.0)
  - `difficulty_multiplier` (FLOAT: 1.0 - 1.6)
  - `account_status` (ENUM: `ONBOARDING`, `ACTIVE`, `MAINTENANCE`, `OFFBOARDED`)
  - `category` (VARCHAR): Ngành hàng
  - `monthly_target_gmv` (DECIMAL): Chỉ tiêu GMV giao cho Store
  - `monthly_budget` (DECIMAL): Hạn mức ngân sách giải ngân
  - **Trách nhiệm kép & Denormalized Owner Fields:**
    - `account_owner_name` (VARCHAR): **Account/Growth Owner** phụ trách doanh số & quan hệ khách hàng.
    - `b2c_owner_name` (VARCHAR): **B2C Ops Owner** phụ trách vận hành nội dung, KOC & SLA (primary display).

* **Bảng `store_staff_assignments` (Bảng liên kết Nhiều-Nhiều Phân công Nhân sự & RBAC Data Scoping):**
  - `id` (VARCHAR PK)
  - `store_id` (FK `store_portfolios.id` ON DELETE CASCADE)
  - `user_id` (FK `users.id` ON DELETE CASCADE)
  - `role` (ENUM `StoreAssignmentRole`: `GROWTH_OWNER`, `PRIMARY_B2C_OWNER`, `CO_OWNER`, `CONTENT_LEAD`)
  - `notes` (TEXT): Ghi chú phân công (vd: *"Phụ trách mảng Livestream"*, *"Phụ trách Seeding KOC"*, *"Phối hợp trực ca tối"*)
  - `assigned_at` (TIMESTAMP DEFAULT NOW())
  - `assigned_by` (VARCHAR): Manager phân quyền
  - **Ràng buộc toàn vẹn:** `@@unique([store_id, user_id, role])` đảm bảo 1 nhân sự không bị trùng lặp cùng 1 vai trò trên 1 gian hàng.
  - **Bảo mật dữ liệu (Data Scoping):** Nhân viên thông thường chỉ truy vấn được danh sách gian hàng và chiến dịch KOC mà `store_staff_assignments` có `user_id` của họ (hoặc gian hàng mà họ được gán là `CO_OWNER`/`PRIMARY_B2C_OWNER`). Quản lý (Manager/Lead) nhìn thấy toàn bộ.

---

### 3.4. Tách Biệt 4 Thực Thể Tác Nghiệp (Module 3 & 4: Execution & Content Decoupled)

> ⚠️ **Quy Chuẩn Kiến Trúc Cốt Lõi:** Tuyệt đối không coi mỗi dòng là "1 booking" để tránh làm méo mó số liệu CPA, conversion rate và số lượng output thực tế. Hệ thống phân rã thành 4 thực thể liên kết 1-N:
> `Candidate (Outreach)` ➔ `Booking Deal (Hợp đồng)` ➔ `Content Item (Kịch bản/QC)` ➔ `Publication (Link Live/Ads)`.

#### 3.4.1. Bảng `koc_candidates` (Thực thể 1: Ứng Viên & Pipeline Tiếp Cận)
- `id` (VARCHAR PK)
- `candidate_code` (VARCHAR UNIQUE, vd: `CAN-26-001`)
- `koc_profile_id` (FK `koc_profiles.id`, optional)
- `stage_name` (VARCHAR), `channel_id` (VARCHAR), `channel_url` (VARCHAR)
- `platform` (VARCHAR: `TIKTOK`, `SHOPEE`, `INSTAGRAM`)
- `tier` (ENUM: `TIER_1_CELEB`, `TIER_2_MACRO`, `TIER_3_MICRO`, `TIER_4_AFFILIATE`)
- `salary_grade` (ENUM `SalaryGrade`), `segment` (ENUM `CreatorSegment`), `tep_kenh` (VARCHAR), `koc_category` (ENUM `KocCategory`)
- `followers_count` (INT), `avg_views` (INT)
- `rate_card_expected` (DECIMAL): Giá net đề xuất ban đầu
- `outreach_status` (ENUM: `PROSPECTING`, `CONTACTED`, `PITCHED`, `ACCEPTED`, `REJECTED`, `CONVERTED_TO_BOOKING`)
- `brand_name` (VARCHAR), `store_portfolio_id` (FK `store_portfolios.id`)
- `assigned_pic` (VARCHAR): Nhân sự tiếp cận
- `pitch_batch` (VARCHAR): Đợt tiếp cận
- `rejection_reason` (TEXT): Lý do KOC từ chối hoặc báo giá vượt khung trần
- `converted_booking_id` (VARCHAR): Liên kết sang hợp đồng Booking sau khi chốt thành công

#### 3.4.2. Bảng `booking_deals` (Thực thể 2: Thỏa Thuận Thương Mại & Điều Khoản Chi Lark)
- `id` (VARCHAR PK, vd: `deal-1`)
- `deal_code` (VARCHAR UNIQUE, vd: `BO260757834`)
- `campaign_id` (FK `campaigns.id`)
- `koc_id` (FK `koc_profiles.id`)
- `candidate_id` (FK `koc_candidates.id`)
- `store_portfolio_id` (FK `store_portfolios.id`)
- `assigned_staff_id` (FK `users.id`): Booking PIC
- `salary_grade` (ENUM `SalaryGrade`), `segment` (ENUM `CreatorSegment`), `tep_kenh` (VARCHAR), `koc_category` (ENUM `KocCategory`)
- `status` (ENUM `DealStatus`: Draft, Terms Agreed, Advance Paid, Sample Shipped, Video Verified, Final Paid...)
- `committed_outputs_count` (INT default 1): Số lượng output cam kết (1 booking có thể sinh ra 2-3 content items)
- `total_value` (DECIMAL): Giá trị hợp đồng thương mại
- `advance_amount` (DECIMAL default 2.000.000)
- `final_amount` (DECIMAL)
- `lark_advance_approval_code` (VARCHAR): Mã quy trình phê duyệt chi tạm ứng 2tr trên Lark Open API
- `lark_final_approval_code` (VARCHAR): Mã quy trình phê duyệt chi tất toán 8tr trên Lark Open API
- `deadline_post` (TIMESTAMP)

#### 3.4.3. Bảng `content_items` (Thực thể 3: Sản Phẩm Nội Dung, Góc Tiếp Cận & QC)
- `id` (VARCHAR PK)
- `content_code` (VARCHAR UNIQUE, vd: `CNT-26-001`)
- `booking_deal_id` (FK `booking_deals.id` ON DELETE CASCADE)
- `campaign_title` (VARCHAR), `creator_name` (VARCHAR)
- `pillar` (VARCHAR): Review trực tiếp, Nỗi đau - Giải pháp, Educate, Commercial...
- `angle` (TEXT): Góc tiếp cận kịch bản
- `format` (ENUM: `VIDEO_SHORT_60S`, `VIDEO_HOOK_30S`, `LIVESTREAM_SESSION`, `CAROUSEL_PHOTO`)
- `channel` (VARCHAR: `TIKTOK`, `SHOPEE`, `REELS`, `THREADS`)
- `script_hook` (TEXT), `script_pain_point` (TEXT), `script_usp` (TEXT), `script_cta` (TEXT)
- `script_status` (ENUM: `PENDING`, `APPROVED`, `REVISION_REQUESTED`)
- `revision_count` (INT default 0, tối đa 2 lần)
- `demo_video_url` (VARCHAR), `demo_status` (ENUM: `NOT_SUBMITTED`, `SUBMITTED`, `APPROVED`, `REJECTED`)
- `qc_status` (ENUM: `PENDING`, `PASS`, `REVISION_REQUIRED`)
- `qc_checklist_notes` (TEXT): Ghi chú thẩm định QC âm thanh, ánh sáng, logo, policy

#### 3.4.4. Bảng `publications` (Thực thể 4: Bài Đăng Live, Mã Ads & Hiệu Quả Thực Tế)
- `id` (VARCHAR PK)
- `publication_code` (VARCHAR UNIQUE, vd: `PUB-26-001`)
- `content_item_id` (FK `content_items.id` ON DELETE CASCADE)
- `platform` (VARCHAR: `TIKTOK`, `SHOPEE`)
- `platform_post_url` (VARCHAR): Đường dẫn video chính thức lên sóng
- `spark_ads_code` (VARCHAR): Mã ủy quyền quảng cáo Spark Ads
- `spark_ads_expiry_days` (INT default 30)
- `is_media_handed_off` (BOOLEAN): Đã bàn giao mã Ads cho Media Team chưa
- `published_at` (TIMESTAMP)
- `views_count` (INT), `likes_count` (INT), `comments_count` (INT), `shares_count` (INT)
- `affiliate_gmv` (DECIMAL): Doanh thu phát sinh thực tế ghi nhận từ sàn
- `items_sold` (INT): Số món bán được
- `cost_attributed` (DECIMAL): Chi phí phân bổ cho lần xuất bản này
- `roi` (FLOAT): Hệ số hoàn vốn GMV / Chi phí
- `verification_status` (ENUM: `PENDING_AUDIT`, `VERIFIED`, `REJECTED`)
- `verified_at` (TIMESTAMP)

### 3.5. Bảng `sla_logs` (Nhật ký kiểm soát SLA)
- `id` (VARCHAR PK)
- `entity_type` (ENUM: `CAMPAIGN_BRIEF`, `SCRIPT_REVIEW`, `CONTRACT_APPROVAL`, `VIDEO_REVIEW`, `GROWTH_BREAKDOWN`)
- `entity_id` (VARCHAR)
- `assigned_to` (VARCHAR)
- `started_at` (TIMESTAMP)
- `deadline` (TIMESTAMP)
- `completed_at` (TIMESTAMP)
- `is_breached` (BOOLEAN)
- `breach_minutes` (INT)

### 3.6. Bảng `growth_demands` & `growth_demand_tier_breakdowns` (Phân rã Chỉ tiêu Growth)
* **Bảng `growth_demands` (Yêu cầu ngân sách & GMV từ Growth cho Booking):**
  - `id` (VARCHAR PK)
  - `code` (VARCHAR UNIQUE, vd: `GD-1010-SENKA`)
  - `title` (VARCHAR)
  - `brand_name` (VARCHAR), `brand_category` (VARCHAR)
  - `month` (VARCHAR, vd: `2026/10`)
  - `total_assigned_budget` (DECIMAL)
  - `target_gmv` (DECIMAL)
  - `target_cir` (FLOAT, vd: 20.0%)
  - `growth_pic` (VARCHAR), `booking_pic` (VARCHAR)
  - `deadline_breakdown` (VARCHAR)
  - `growth_notes` (TEXT): Định hướng SKU, góc hook, đối tượng
  - `status` (ENUM: `PENDING_BREAKDOWN`, `PLANNED`, `LEAD_APPROVED`, `IN_EXECUTION`, `REJECTED`)
  - `strategy_notes` (TEXT): Ghi chú chiến lược tiếp cận của Booking PIC

* **Bảng `growth_demand_tier_breakdowns` (Phân bổ chi tiết 4 Level KOC):**
  - `id` (VARCHAR PK)
  - `growth_demand_id` (FK `growth_demands.id`)
  - `tier` (ENUM: `TIER_1_CELEB`, `TIER_2_MACRO`, `TIER_3_MICRO`, `TIER_4_AFFILIATE`)
  - `tier_label` (VARCHAR), `salary_grade_label` (VARCHAR)
  - `target_count` (INT)
  - `estimated_avg_cost` (DECIMAL)
  - `allocated_budget` (DECIMAL)
  - `estimated_gmv_per_koc` (DECIMAL)
  - `total_expected_gmv` (DECIMAL)
  - `estimated_gmv_per_koc` (DECIMAL)
  - `total_expected_gmv` (DECIMAL)
  - `roi_benchmark` (FLOAT)
  - `notes` (TEXT)

- **`self_channel_plans` (Kế hoạch Video Kênh Tự Xây & Reup):**
  - `id` (UUID, PK)
  - `growth_demand_id` (UUID, FK -> `growth_demands.id`)
  - `planned_videos` (INT, số video inhouse dự kiến)
  - `approved_videos` (INT, số video đã duyệt)
  - `reported_videos` (INT, số video đã nghiệm thu)
  - `production_budget` (DECIMAL, chi phí inhouse)
  - `reported_cost` (DECIMAL, chi phí thực tế)
  - `reup_tiktok`, `reup_shopee`, `reup_facebook`, `reup_threads` (INT)

- **`livestream_plans` (Kế hoạch Livestream Gian Hàng):**
  - `id` (UUID, PK)
  - `growth_demand_id` (UUID, FK -> `growth_demands.id`)
  - `inhouse_sessions_hn` (INT, số phiên Studio HN 3h)
  - `inhouse_sessions_hcm` (INT, số phiên Studio HCM 3h)
  - `ctv_sessions` (INT, số phiên CTV ngoài 2h)
  - `total_hours` (INT, tổng số giờ live)
  - `planned_budget`, `reported_budget` (DECIMAL)
  - `planned_gmv`, `reported_gmv` (DECIMAL)

- **`plan_four_stage_tracking` (Bảng Đối Soát 4 Chặng & NMV Gap):**
  - `id` (UUID, PK)
  - `growth_demand_id` (UUID, FK -> `growth_demands.id`)
  - `plan_budget`, `approved_budget`, `adjusted_budget`, `reported_budget_mtd` (DECIMAL)
  - `budget_gap_mtd` (DECIMAL)
  - `plan_nmv`, `approved_nmv`, `adjusted_nmv`, `reported_nmv_mtd` (DECIMAL)
  - `nmv_gap_mtd` (DECIMAL)
  - `cancellation_rate` (FLOAT, định mức hủy đơn)

- **`sample_shipments` (Theo Dõi Mẫu & Chống Bùng KOC):**
  - `id` (UUID, PK)
  - `deal_code` (STRING, FK -> `booking_deals.deal_code`)
  - `koc_name`, `koc_phone`, `shipping_address` (STRING)
  - `carrier` (STRING, GHN / ViettelPost / J&T / ShopeeExpress)
  - `tracking_code` (STRING, Mã vận đơn)
  - `sent_date`, `delivered_date` (DATETIME)
  - `status` (ENUM: DELIVERING, DELIVERED, DEMO_SUBMITTED, AIRED, GHOST_WARNING, BLACKLISTED)
  - `spark_ads_code` (STRING, Mã Spark Ads TikTok)
  - `spark_ads_expiry_days` (INT, 30/60 ngày)
  - `is_media_handed_off` (BOOLEAN)

- **`store_difficulty_configs` (Hệ Số Độ Khó Store 4P):**
  - `id` (UUID, PK)
  - `store_name` (STRING, Unique)
  - `platform` (STRING: TikTok Shop, Shopee, Lazada)
  - `difficulty_tier` (ENUM: Cơ bản, Tiêu chuẩn, Vừa, Khó)
  - `multiplier` (FLOAT: 1.0, 1.2, 1.4, 1.6)
  - `monthly_target_gmv` (DECIMAL)
  - `assigned_pic` (STRING)

- **`staff_p3_records` (Tính Thưởng & Đánh Giá Năng Lực P3):**
  - `id` (UUID, PK)
  - `staff_name`, `role`, `level` (STRING)
  - `assigned_store` (STRING)
  - `store_multiplier` (FLOAT: 1.0 - 1.6)
  - `completed_cases` (INT)
  - `quality_multiplier` (FLOAT: 0.9 - 1.15)
  - `sla_multiplier` (FLOAT: 0.8 - 1.2)
  - `calculated_workload_points` (FLOAT = Cases * StoreMulti * Quality * SLA)
  - `base_p3_unit_rate` (DECIMAL, e.g. 35.000đ/điểm)
  - `estimated_bonus_vnd` (DECIMAL)
  - `approval_status` (ENUM: CHỜ_DUYỆT, ĐÃ_DUYỆT, YÊU_CẦU_ĐIỀU_CHỈNH)

- **`weekly_store_plans_411` (Kế Hoạch Tuần Chi Tiết File 4.1.1):**
  - `id` (UUID, PK)
  - `month`, `week`, `store_name`, `pic` (STRING)
  - `total_affiliate_budget` (DECIMAL)
  - `actual_booked_qty`, `actual_spent_budget` (DECIMAL)
  - `target_gmv` (DECIMAL)
  - `notes` (TEXT)

---

## 4. Cơ chế Giải phóng Hiệu năng (Performance Optimization)
1. **Server-side Pagination & Query Filtering:** Dữ liệu chỉ tải 20 - 50 dòng cho mỗi lần cuộn (Infinite scroll / Virtualized viewport).
2. **File Offloading:** Tuyệt đối không lưu file binary vào cơ sở dữ liệu. Tất cả file hợp đồng, video upload trực tiếp lên Storage S3/Cloudflare R2 qua Presigned URL, CSDL chỉ lưu chuỗi URL.
3. **Tương thích hoàn hảo với Lark:** Web App bắn Webhook cập nhật trạng thái sang Lark Group thông qua Lark Custom Bot. Nhân viên chỉ cần bấm link từ Lark Chat là mở đúng tác vụ trên Web App chỉ trong 0.2 giây.
4. **Kiến trúc xử lý tải lớn (5,700+ KOCs / Big Dataset Scaling):** Tệp danh bạ KOC thực tế có tới 5,700 dòng (dung lượng gốc >74MB). CSDL áp dụng B-Tree Index cho `channel_id`, `tier`, `salary_grade`, `koc_category`. Phía Next.js Server Actions sử dụng truy vấn `skip/take` phân trang phía máy chủ và Lean Select (chỉ lấy các trường cần hiển thị trên Table), giảm Payload truyền qua mạng từ 74MB xuống <45KB mỗi request.
