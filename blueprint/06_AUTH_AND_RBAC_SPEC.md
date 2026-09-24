# ĐẶC TẢ HỆ THỐNG TÀI KHOẢN, XÁC THỰC & PHÂN QUYỀN (AUTH & RBAC SPEC)
## Dự án: Upbase B2C Marketing Operations Hub
### Phân loại lộ trình: Bản đặc tả thiết kế chuẩn — Sẽ phát triển chuyên sâu ở Giai đoạn 2 (Phase 2)
### Hiện tại (Giai đoạn 1): Cơ chế "Role Switcher" linh hoạt phục vụ tối ưu hóa tác nghiệp sâu

---

## 📌 1. Bối Cảnh & Định Hướng Phát Triển (Roadmap Strategy)

Hệ thống quản trị Marketing B2C Upbase phục vụ đội ngũ gồm 30 nhân sự thuộc 5 bộ phận chủ chốt: **Brand, Content, Booking, Kế toán và Quản lý**.

Để đảm bảo tiến độ triển khai thần tốc, giải quyết ngay các "điểm nghẽn" nhức nhối (Lark Base quá tải, giật lag khi tải 5.700 KOCs, gõ tay hợp đồng chậm chạp, thất thoát SLA), chiến lược phát triển được chia làm 2 giai đoạn minh bạch:

```
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: TẬP TRUNG TÁC NGHIỆP SÂU (FEATURE DEEP-DIVE & MVP)        │
│ • Sử dụng Role Switcher trên TopHeader (5 nhân sự đại diện)            │
│ • Kiểm thử liền mạch toàn bộ luồng Handoff giữa 3 Team                  │
│ • Không bị chặn bởi form đăng nhập hoặc mã OTP                         │
│ • Tối ưu 100% trải nghiệm người dùng trên từng tính năng thực tế       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Kế thừa thiết kế đặc tả
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 2: BẢO MẬT & ĐÓNG GÓI DOANH NGHIỆP (PRODUCTION HARDENING)   │
│ • Triển khai Supabase Auth (OTP Email @upbase.vn + Lark SSO)           │
│ • Kích hoạt Row-Level Security (RLS) trên PostgreSQL                   │
│ • Màn hình quản trị Thành viên, Mời nhân sự, Phân quyền động          │
│ • Next.js Middleware kiểm tra JWT Session và bảo vệ route              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 👤 2. Vòng Đời & Quản Trị Tài Khoản (User Account Lifecycle)

### 2.1. Định Danh Nhân Sự
- **Định danh duy nhất:** Email doanh nghiệp có đuôi `@upbase.vn`.
- **Thông tin hồ sơ (User Profile):**
  - Họ và tên đầy đủ (`full_name`)
  - Chức danh chuyên môn (`title`: ví dụ *Booking Executive, Content Specialist, Brand Manager*)
  - Bộ phận (`department`: `BRAND`, `CONTENT`, `BOOKING`, `FINANCE`, `MANAGEMENT`)
  - Số điện thoại nội bộ / Telegram / Zalo liên hệ
  - Trạng thái tài khoản (`status`: `ACTIVE`, `INVITED`, `SUSPENDED`, `DEACTIVATED`)

### 2.2. Vòng Đời Tài Khoản (Account Lifecycle)
1. **Mời nhân sự mới (Invitation):** Quản lý hoặc Quản trị viên (Admin) nhập email `@upbase.vn` và chỉ định Role ban đầu. Hệ thống gửi link kích hoạt qua Email/Lark.
2. **Kích hoạt & Đăng nhập một chạm (Single Sign-On):** Nhân sự đăng nhập qua Lark Workspace SSO hoặc OTP Email, hệ thống tự động sinh `session_token`.
3. **Phân bổ chiến dịch & việc:** Khi tài khoản kích hoạt, các tác vụ mới thuộc phạm vi phân hệ sẽ tự động đổ về **Bàn Làm Việc Cá Nhân (My Daily Cockpit)**.
4. **Đình chỉ / Thu hồi quyền (Offboarding):** Khi nhân sự chuyển bộ phận hoặc nghỉ việc, Quản trị viên chuyển trạng thái sang `SUSPENDED` hoặc `DEACTIVATED`. Mọi deal và hợp đồng đang phụ trách sẽ tự động hiển thị để Quản lý tái phân bổ (Reassign) cho nhân sự khác mà không làm gián đoạn tiến độ.

---

## 🛡️ 3. Ma Trận Phân Quyền Chi Tiết (Granular RBAC Matrix)

Hệ thống phân định 5 vai trò nội bộ chính và **tích hợp hệ thống duyệt chi qua Lark Approval Open API** (không cần ghế tài khoản Kế toán riêng trên Web App):

| Mã Quyền (Granular Permission) | Diễn Giải Nghiệp Vụ | ADMIN | MANAGER | BRAND | CONTENT | BOOKING | LARK APPROVAL API |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `cockpit:access` | Truy cập bàn làm việc cá nhân | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `brand:manage` | **Toàn quyền Quản lý Brand, Shop TikTok/Shopee, Ngân sách & Phân bổ PIC** | ✅ | ✅ | 👁️ (Xem) | 👁️ (Xem) | 👁️ (Xem) | ❌ |
| `brand:view_stores` | **Tra cứu gian hàng, % hoa hồng affiliate, sản phẩm chủ lực & guideline** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `campaign:create` | Tạo chiến dịch & viết Campaign Brief | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `campaign:approve` | Phê duyệt ngân sách & KPI chiến dịch | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `content:script_submit` | KOC nộp kịch bản, Content upload nháp | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `content:script_approve` | Thẩm định & Duyệt kịch bản (SLA 24h) | ✅ | ✅ | 👁️ (Xem) | ✅ | ❌ | ❌ |
| `koc:view_list` | Tra cứu danh bạ 5.700 KOCs & Bộ lọc | ✅ | ✅ | 👁️ | 👁️ | ✅ | ❌ |
| `koc:view_pii` | Xem dữ liệu nhạy cảm (CCCD, STK, MST) | ✅ | ✅ | ❌ | ❌ | ✅ (Deal mình) | 🤖 (Đồng bộ) |
| `koc:create_deal` | Lên Deal siêu tốc 30s & Đặt lịch KOC | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `contract:generate` | Tự động sinh hợp đồng pháp lý & QR | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `finance:approve_advance` | Duyệt chi tạm ứng 2.000.000đ đợt 1 | ✅ | ✅ | ❌ | ❌ | ❌ | 🤖 **Duyệt qua Lark API** |
| `finance:settle_deal` | Tất toán 8.000.000đ khi video lên sóng | ✅ | ✅ | ❌ | ❌ | ❌ | 🤖 **Duyệt qua Lark API** |
| `sla:view_radar` | Giám sát radar nút thắt & cảnh báo SLA | ✅ | ✅ | 👁️ | 👁️ | 👁️ | ❌ |
| `sla:ping_remind` | Gửi hối thúc 1-click cho người phụ trách | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `gmv:import_excel` | Nạp file báo cáo GMV TikTok/Shopee | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `leaderboard:view` | Xem Bảng Vàng thi đua & Điểm thưởng | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `brand_hub:approve_plan` | **[Chặng 1] Duyệt Kế hoạch Phân bổ Ngân sách** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `brand_hub:approve_koc` | **[Chặng 2] Duyệt / Đổi KOC đề xuất** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `brand_hub:approve_script` | **[Chặng 3] Duyệt & Góp ý kịch bản (SLA 24h)** | ✅ | ✅ | ✅ | 👁️ | ❌ | ❌ |
| `brand_hub:view_live` | **[Chặng 4] Xem clip nháp & Báo cáo live GMV** | ✅ | ✅ | ✅ | 👁️ | 👁️ | ❌ |
| `plan:set_ceiling_quota` | **Thiết lập trần định mức 4 Tier KOC & Trần ngân sách tháng** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `plan:rebalance_capacity` | **Cân bằng tải tự động cho 26 chuyên viên** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `plan:edit_staff_alloc` | **Chỉnh sửa hạn mức phân bổ chi tiết cho từng nhân sự** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `plan:inspect_employee_plan`| **Soi chi tiết danh sách KOC do nhân viên lập & duyệt** | ✅ | ✅ | 👁️ (Xem) | 👁️ (Xem) | 👁️ (Xem) | ❌ |
| `plan:approve_plan` | **Phê duyệt toàn bộ kế hoạch tháng của nhân viên** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `plan:request_revision` | **Gửi phản hồi yêu cầu nhân viên điều chỉnh plan** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `plan:batch_convert_deals` | **Chuyển đổi hàng loạt KOC đã duyệt sang Booking Deals** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `plan:submit_my_plan` | **Nhân viên nộp Kế hoạch cá nhân (My Plan) lên Trưởng phòng** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `plan:convert_my_deal` | **Chuyên viên kích hoạt tạo Deal Booking từ slot KOC đã duyệt** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

> 🤖 **Cơ chế Phê Duyệt Chi Tự Động Qua Lark Approval (Lark Open API):**
> 1. Khi Hợp đồng sinh ra, hệ thống tự động bắn đơn duyệt chi (Approval Instance) sang Lark qua Open API, đính kèm link PDF Hợp đồng, mã VietQR và thông tin STK của KOC.
> 2. Bộ phận Tài chính / Ban Lãnh đạo phê duyệt trực tiếp trên Lark Chat hoặc Lark Approval App.
> 3. Webhook từ Lark (`/api/webhooks/lark-approval`) tự động cập nhật trạng thái hợp đồng trong hệ thống (`ADVANCE_PAID` hoặc `FINAL_PAID`), kích hoạt bước xuất kho gửi sample hoặc tất toán hoa hồng.

> 🔒 **Cơ chế Data Masking cho Khách Hàng (Brand Client Access):** Khi khách hàng truy cập qua Cổng Brand Hub (hoặc Magic Link), hệ thống tự động lọc bỏ toàn bộ các trường dữ liệu nhạy cảm:
> 1. **Rate Card Net:** Tuyệt đối không hiển thị chi phí thỏa thuận thực trả cho KOC.
> 2. **Dữ liệu PII của KOC:** Ẩn số điện thoại riêng, Zalo riêng, số CCCD, tài khoản ngân hàng của Creator.
> 3. **Biên Lợi Nhuận & Tải Lượng Nội Bộ:** Ẩn phân bổ điểm tải nhân sự và lợi nhuận gộp của Agency.

---

## 🔒 4. Cơ Chế Bảo Mật Cấp Dòng (Row-Level Security - RLS) trên Supabase

Trong Giai đoạn 2, các chính sách bảo mật sau sẽ được kích hoạt trực tiếp trong PostgreSQL:

### 4.1. Bảng Thông Tin KOC (`koc_profiles`)
```sql
-- 1. Cho phép toàn bộ nhân viên nội bộ tra cứu thông tin chung
CREATE POLICY "Cho phép xem danh bạ KOC chung" ON koc_profiles
FOR SELECT TO authenticated
USING (true);

-- 2. Chỉ hiển thị thông tin nhạy cảm (STK, CCCD) cho Booking phụ trách, Kế toán và Manager
-- Sử dụng PostgreSQL View hoặc Column-Level Security kết hợp RLS.
```

### 4.2. Bảng Hợp Đồng & Deal Booking (`booking_deals`, `contracts`)
```sql
-- Nhân sự Booking chỉ có quyền sửa đổi Deal do mình trực tiếp phụ trách
CREATE POLICY "Booking chỉ sửa deal của mình" ON booking_deals
FOR UPDATE TO authenticated
USING (
  assigned_user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
);

-- Kế toán chỉ có quyền cập nhật trạng thái giải ngân tài chính
CREATE POLICY "Kế toán cập nhật thanh toán" ON contracts
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'FINANCE'))
);
```

### 4.3. Bảng Kiểm Soát Kỷ Luật SLA (`sla_logs`)
- **Nguyên tắc bất biến (Immutable Audit Log):** Không một vai trò nào (kể cả Manager) được phép sửa mốc thời gian `started_at` hoặc `completed_at`. Mọi thay đổi trạng thái đều được kích hoạt tự động qua Trigger Database hoặc Edge Functions có ký định danh.

---

## 🚀 5. Lộ Trình Triển Khai Chi Tiết Sang Phase 2

1. **Bước 1:** Tạo bảng `users`, `roles`, `user_roles`, `audit_logs` trên Prisma & Supabase.
2. **Bước 2:** Cấu hình Next.js App Router Middleware (`middleware.ts`) xác thực JWT từ `@supabase/ssr`.
3. **Bước 3:** Thay thế "Role Switcher" giả lập bằng Menu Người dùng cá nhân (Avatar, Đổi mật khẩu, Đăng xuất) và Màn hình Đăng nhập doanh nghiệp.
4. **Bước 4:** Xây dựng trang Quản trị Người Dùng (`/settings/users`) dành riêng cho Admin/Manager.
