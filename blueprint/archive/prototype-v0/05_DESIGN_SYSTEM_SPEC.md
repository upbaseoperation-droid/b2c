> **Đã được thay thế (08/10/2026)** bởi [web-admin/DESIGN_SYSTEM.md](../../../web-admin/DESIGN_SYSTEM.md). Bảng màu, font và quy tắc dưới đây không còn áp dụng.

> **LƯU TRỮ — prototype v0 (30/09/2026).** Tài liệu này mô tả prototype `B2C/web-admin`, không phải yêu cầu đã duyệt. Không dùng làm căn cứ cho giai đoạn 2. Lý do và tài liệu thay thế: [README lưu trữ](README.md), `HUB:DEC-003`.

# ĐẶC TẢ HỆ THỐNG THIẾT KẾ ĐỒNG NHẤT (ENTERPRISE DESIGN SYSTEM SPEC)
## Dự án: Upbase B2C Marketing Operations Hub
### Phong Cách: Enterprise SaaS Light Theme (Sáng Rõ, Hiện Đại, Chuẩn Mực Doanh Nghiệp)

---

## 🎨 1. Triết Lý Thiết Kế: "Command Center — Tối Giản, Sáng Rõ, Chống Mỏi Mắt"

Toàn bộ ứng dụng tuân thủ nghiêm ngặt theo phong cách **Enterprise SaaS Light Theme** (tương tự Linear, Vercel, Stripe Dashboard):
* **Không chói gắt, không mỏi mắt:** Sử dụng tông nền xám phấn dịu nhẹ (`#f8fafc` Slate 50), bề mặt thẻ làm việc màu trắng tinh khiết (`#ffffff`), đường viền siêu mỏng sắc nét (`#e2e8f0` Slate 200). Khắc phục triệt để cảm giác u tối, nặng nề của giao diện tối (Dark Mode).
* **Độ tương phản cao & Dễ đọc (High Contrast & Legibility):** Chữ tiêu đề và số liệu chính sử dụng màu đen than đậm (`#0f172a` Slate 900), nhãn và nội dung tác nghiệp sử dụng Slate 700/800 (`#334155`). Không bao giờ có hiện tượng chữ xám mờ trên nền sáng hay chữ trắng trên nền trắng.
* **Bảo vệ màu chữ trên nút hành động (Button Contrast Protection):** Các nút CTA thể rắn (`bg-blue-600`, `bg-emerald-600`, `bg-rose-600`) giữ vững 100% màu chữ trắng tinh khiết (`text-white font-semibold`) tạo điểm nhấn thao tác dứt khoát.
* **Huy hiệu Pastel cao cấp (Pastel Status Badges):** Màu nền mềm (opacity 10-15%) kết hợp chữ đậm màu và viền tinh tế, giúp phân biệt trạng thái nghiệp vụ tức thì mà không gây rối mắt.
* **Cột cố định không lóa (Seamless Sticky Columns):** Khi cuộn ngang bảng ma trận nhiều cột, cột nhân sự cố định bên trái có nền trắng đục nguyên khối (`bg-white`), đổi màu đồng bộ khi hover (`group-hover:bg-slate-50`), có viền phải và đổ bóng thanh mảnh (`shadow-[2px_0_5px_rgba(0,0,0,0.04)]`) ngăn chặn hoàn toàn hiện tượng đè chữ.

---

## 🌈 2. Bảng Màu Chuẩn Hóa (Enterprise Color Tokens)

```css
/* Background & Surfaces */
--bg-base:        #f8fafc; /* Nền phấn toàn trang (Slate 50) */
--bg-surface:     #ffffff; /* Bề mặt Card chính, Modal dialog (Pure White) */
--bg-surface-alt: #f1f5f9; /* Bề mặt Card con, Container lồng nhau (Slate 100) */
--bg-hover:       #f8fafc; /* Trạng thái Hover của dòng bảng và card phụ */

/* Borders & Dividers */
--border-subtle:  #e2e8f0; /* Viền Card, viền chia bảng (Slate 200) */
--border-accent:  #cbd5e1; /* Viền nút bấm phụ, viền input (Slate 300) */

/* Brand & Functional Accents */
--primary-blue:   #2563eb; /* Nút chính, liên kết, thương hiệu (Blue 600) */
--cyan-accent:    #0284c7; /* Điểm nhấn số liệu trực quan (Sky 600) */
--emerald-green:  #059669; /* Thành công, Đạt chỉ tiêu SLA, Đã duyệt (Emerald 600) */
--amber-gold:     #d97706; /* Cảnh báo SLA, Headroom trống, Chờ duyệt (Amber 600) */
--rose-red:       #e11d48; /* Khẩn cấp, Vượt trần ngân sách, Lỗi (Rose 600) */
--royal-purple:   #7c3aed; /* Content Team, Kịch bản, Sáng tạo (Violet 600) */

/* Typography Colors */
--text-primary:   #0f172a; /* Tiêu đề, số liệu chính (Slate 900) */
--text-secondary: #334155; /* Nội dung tác nghiệp, tên bảng (Slate 700) */
--text-muted:     #64748b; /* Nhãn phụ, metadata, timestamp (Slate 500) */
```

---

## 📐 3. Quy Chuẩn Cấu Trúc Khối (Component Anatomy)

### A. Cấu Trúc Card Thống Nhất (Card Anatomy)
Tất cả màn hình đều sử dụng cấu trúc Card chuẩn:
1. **Card Header:** Icon vuông bo góc 10px + Tiêu đề `text-base font-bold text-slate-900` + Mô tả `text-xs text-slate-500` + Huy hiệu trạng thái.
2. **Card Body:** `p-5` hoặc `p-6`, nền `#ffffff`, viền bo góc 16px (`rounded-2xl border border-slate-200/90 shadow-xs`).
3. **Card Footer (nếu có):** Đường viền `border-t border-slate-200`, nền `bg-slate-50/70`, chứa thông tin người phụ trách và nút thao tác nhanh.

### B. Cấu Trúc Bảng Dữ Liệu Thống Nhất (Table Anatomy)
Mọi bảng dữ liệu (Matrix 4 Tier, Deals, KOCs, SLA, Contracts, Leaderboard):
* **Header (`thead`):** Nền `bg-slate-50`, chữ in hoa nhỏ `text-[11px] font-semibold text-slate-600`, viền dưới `border-b border-slate-200`.
* **Cột cố định (`Sticky Left Column`):** Nền đặc `bg-white`, trạng thái dòng `group-hover:bg-slate-50`, viền ngăn cách `border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.04)]`.
* **Hàng dữ liệu (`tbody tr`):** Chiều cao tiêu chuẩn `py-3.5`, hover chuyển sang `bg-slate-50`, chuyển tiếp mượt `transition-colors duration-150`.
* **Footer đối soát (`tfoot`):** Phân biệt rõ rệt 3 tầng: Hàng tổng thực tế (`bg-slate-100 font-bold`), Hàng trần định mức (`bg-slate-50 text-slate-600`), Hàng Gap chênh lệch (`bg-white`).
* **Cột Thao tác:** Căn phải (`text-right`), nút bấm kích thước nhỏ `text-xs px-3 py-1.5 rounded-lg font-medium`.

### C. Quy Chuẩn Badge Trạng Thái (Pastel Status Badges)
Tất cả Badge đều có định dạng: `text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border`:
* **Đạt / Hoàn thành / Đã duyệt:** `bg-emerald-50 text-emerald-700 border-emerald-200`
* **Khẩn cấp / Vượt trần / Lỗi:** `bg-rose-50 text-rose-700 border-rose-200`
* **Cảnh báo / Chờ duyệt / Headroom trống:** `bg-amber-50 text-amber-700 border-amber-200`
* **Đang chạy / Tiến hành / Live:** `bg-blue-50 text-blue-700 border-blue-200`
* **Bản nháp / Chưa nộp:** `bg-slate-100 text-slate-700 border-slate-200`

### D. Cấu Trúc Hộp Thoại (Modal Dialogs)
* **Lớp phủ nền (Backdrop):** Nền xám mờ mềm mại `rgba(15, 23, 42, 0.45) backdrop-blur-sm`.
* **Thân hộp thoại (Dialog Container):** Nền `bg-white`, viền `border border-slate-200`, đổ bóng sâu đa tầng `shadow-2xl rounded-2xl text-slate-800`.
* **Thanh công cụ lọc (Modal Toolbars):** Nền `bg-slate-50 border border-slate-200 rounded-xl p-3`.
* **Inputs & Selects:** Nền `#ffffff`, viền `#cbd5e1`, chữ `#0f172a`, focus outline `ring-2 ring-blue-500/20 border-blue-500`.

---

## ⚡ 4. Quy Chuẩn TopHeader & Sidebar (Navigation System)

1. **TopHeader Toàn Cục Tinh Gọn (Global Top Bar):**
   * Chiều cao cố định ~52px (`py-2.5 px-6`), nền kính mờ `bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs`.
   * Tiêu đề phân hệ sắc nét `text-slate-900 font-bold`.
   * Role Switcher thiết kế sang trọng: Avatar tròn 24px chữ viết tắt (`[KV]`) + Tên vai trò rút gọn (`Khánh Vy (Booking)`), nền `bg-slate-100 border border-slate-200 text-slate-800`.
   * Nút tác vụ nhanh: Thống nhất tông màu sáng, viền `border-slate-200`, chữ `text-slate-700 hover:text-slate-900 hover:bg-slate-100`.

2. **Sidebar Doanh Nghiệp (Enterprise Sidebar):**
   * Nền `bg-white`, viền phải `border-r border-slate-200`, bóng viền `shadow-xs`.
   * Trạng thái mục đang chọn (Active Nav Item): Nền `bg-blue-50 text-blue-700 font-semibold border border-blue-200/80 shadow-xs`.
   * Trạng thái mục thông thường (Inactive Nav Item): Chữ `text-slate-600 hover:text-slate-900 hover:bg-slate-100`.
   * Thẻ hồ sơ người dùng chân trang (User Footer Card): Nền `bg-white border border-slate-200 shadow-xs`.

---

## 🚀 5. Danh Sách Các Màn Hình Đã Đồng Bộ Chuẩn Enterprise Light Theme

1. **`globals.css`:** Cấu hình toàn bộ CSS Custom Properties và Utility Classes Light Theme, cách ly nút hành động bảo vệ chữ trắng.
2. **`Sidebar.tsx` & `TopHeader.tsx`:** Hệ thống thanh điều hướng chuẩn Enterprise SaaS.
3. **`ManagerView.tsx`:**
   - 4 Card tóm tắt trần định mức 4 Tier (Trắng, viền mảnh Slate 200).
   - Thanh chuyển đổi ma trận 3 chế độ (4 Tier, Brand, Tuần W1-W4).
   - Bảng ma trận 26 nhân sự với cột tên cố định (`Sticky Left Column`) không bị xuyên thấu nội dung khi cuộn.
   - Footer đối soát 3 tầng (Tổng phân bổ, Trần trưởng phòng, Gap chênh lệch).
4. **`BookingView.tsx`:**
   - Thanh Sub-Tabs điều hướng (Bàn làm việc My Plan, Kế hoạch 4 Tier, Danh bạ KOC, Deals).
   - Bộ thẻ telemetry đường ống ứng viên KOC.
   - Bảng theo dõi KOC và Deals tác nghiệp chuẩn Light Theme.
5. **`MyPlanWorkspace.tsx`:**
   - Thẻ chỉ tiêu tổng phân bổ từ Trưởng phòng.
   - Bảng phân rã kế hoạch theo tuần W1-W4 và gắn slot KOC.
6. **`EmployeePlanInspectorModal.tsx`:**
   - Hộp thoại duyệt kế hoạch nhân sự cho Trưởng phòng (Đối soát 4 Tier, bộ lọc tuần/tier, phản hồi góp ý, phê duyệt & batch tạo deal).
