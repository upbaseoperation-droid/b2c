# Kế hoạch đồng bộ UI, font chữ toàn hệ thống

Bản chốt 31/10/2026 · Áp dụng cho `web-admin` · Đi kèm quy chuẩn [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)

**Mục tiêu:** giao diện sạch, không nhồi chữ, nhưng vẫn đủ thông tin để ra quyết định. Các màn làm cùng một việc thì thao tác giống nhau. Chuẩn tự giữ được về sau, không phụ thuộc vào việc ai nhớ quy tắc.

---

## 1. Quyết định đã chốt

1. **Không sửa các màn đang ẩn** (danh sách ở §2.2). Kế hoạch chỉ làm các màn đang có trên menu.
2. **Không ép mọi màn vào khuôn.** Mọi màn theo chung một bộ quy tắc thao tác (§4.4). Chỉ 3 nhóm có nhiều màn giống nhau mới dùng khuôn trang (§4.5). Màn có thao tác đặc thù giữ bố cục riêng, có ghi lý do.
3. **Gọn mà đủ:** không bỏ thông tin, mà xếp thông tin theo 3 tầng (§4.1).
4. **Sửa ở thành phần gốc trước, sửa từng màn sau.** Lỗi nằm ở thành phần dùng chung thì sửa một lần trong `src/components/ui/`.
5. **Chặn tái phạm bằng công cụ**, không bằng trí nhớ (§6).

---

## 2. Phạm vi

### 2.1 Màn sẽ làm (đang có trên menu)

| Nhóm | Màn |
|---|---|
| Nội bộ | Việc của tôi · Báo cáo & Dashboard (gồm Báo cáo Ads) · Kế hoạch tháng · Kịch bản & video · Điều phối & giao việc · Quản lý Deal & Booking · Video kênh Brand & CTV · Hợp đồng · Danh bạ KOC · Hồ sơ thương hiệu · Nghiên cứu & đối thủ (gồm Quét kênh) · Dữ liệu gốc · Phân quyền & nhân sự |
| Chân menu | Sổ tay & Hỏi đáp · Tích hợp & API (gồm Zalo Bot) |
| Cổng đối tác | Cổng KOC/KOL (vai trò KOC) · Cộng tác viên video (vai trò CTV) |

Gồm cả các màn con, hộp thoại và hồ sơ được mở từ những màn trên.

### 2.2 Màn ẩn: không sửa

| Loại | Màn (file) |
|---|---|
| Bị chuyển hướng sang màn khác (`TAB_ALIASES` trong `lib/navGroups.ts`) | Chiến dịch Brand / Duyệt với nhãn hàng (`BrandView`) · Sản phẩm trọng tâm (`PushProductsView`) · Bản đồ 3D (`Workload3dMapView`) · Đánh giá 4P & thưởng (`PerformanceP3View`) · Nhật ký kiểm toán (`AuditTrailView`) · Quản lý tệp R2 (`CloudflareAdminView`) · Báo cáo kế hoạch & air video (`AirBookingReportHubView`) · Cổng đối tác Brand (`BrandHubView`, đang được gỡ, chưa commit) |
| Không màn nào hiển thị | `OverviewView` · `LeaderboardView` · `KocPipelineMonitorView` · `MasterDataMindmapView` · `PlanDealBoard` |
| Không có trên menu nhưng còn nút dẫn vào | Booking của nhân viên (`BookingView`) · Hàng mẫu (`SampleTrackerView`) · Danh bạ gian hàng bản cũ (`StoreManagementView`) |

Giữ nguyên các màn này, không xóa và không đổi nút dẫn vào. Bộ kiểm tra tự động (§6) bỏ qua các file này. Khi một màn ẩn được đưa lại lên menu, màn đó phải qua đủ chuẩn trước khi mở.

---

## 3. Hiện trạng

### 3.1 Đã có và giữ nguyên

- **Font đã thống nhất:**
  - Be Vietnam Pro (độ đậm 400/500/600) cho toàn bộ giao diện.
  - JetBrains Mono chỉ dùng cho mã.
  - Cả hai được nạp một lần ở `app/layout.tsx`. Không màn nào tự nạp font khác.
- **Đã có design system:**
  - quy chuẩn trong `DESIGN_SYSTEM.md`;
  - token màu, chữ và chuyển động trong `globals.css`;
  - thư viện thành phần `src/components/ui/`;
  - định dạng số trong `lib/format.ts`;
  - ESLint chặn một phần kiểu cũ.
- **Màn làm tốt, dùng làm mẫu:** Danh bạ KOC, danh sách Hợp đồng, Danh bạ CTV.

### 3.2 Số đo lệch chuẩn (160 file trong phạm vi, khoảng 180.500 dòng)

| Hạng mục | Số chỗ | Số file | Chuẩn |
|---|---:|---:|---|
| Chữ 12px (`text-2xs`) | 2.930 | 136 | Chỉ cho nhãn, chú thích |
| Chữ 13px (`text-xs`) | 2.383 | 137 | Ô bảng |
| Chữ 14px (`text-sm`, cỡ nội dung) | 286 | 74 | Đoạn văn, form, mô tả |
| Chữ 11px (`text-3xs`) và cỡ gõ tay `text-[13px]` | 107 + 71 | 20 + 18 | Dùng token, tối thiểu 12px |
| In đậm `font-semibold` | 2.942 | 134 | Chỉ tiêu đề, số chính, cột đầu |
| Màu Tailwind cũ (`slate-`, `blue-`, `emerald-`…) | 3.590 | 24 | Token ngữ nghĩa |
| Nút `<button>` tự viết | 845 | 103 | `Button` |
| Ô `<input>` / `<select>` tự viết | 497 / 184 | 75 / 39 | `Input` / `Select` / `Combobox` |
| Bảng `<table>` tự viết | 110 | 45 | `DataTable` |
| Nhãn tô nền tự viết | 318 | 63 | `Status` cho trạng thái, chữ thường cho thuộc tính |
| Lớp nổi tự viết (`fixed inset-0`) | 10 | 7 | `Modal` |
| `font-mono` (dùng cả cho số) | 841 | 71 | Mono chỉ cho mã |
| `toFixed` / `toLocaleString` | 170 / 167 | 33 / 38 | `lib/format.ts` |
| `uppercase` / `tracking-wide*` | 68 / 43 | 19 / 14 | Không dùng |
| Icon 12px (`w-3 h-3`) | 246 | 63 | 16px, hoặc 14px trong chip/bảng |
| Khoảng cách nửa bậc (`gap-1.5`, `p-2.5`…) | 1.464 | 130 | Bội số 4px |

**Bốn nguyên nhân khiến giao diện rối:**

1. **Chữ quá nhỏ, in đậm khắp nơi.** Hơn 90% chữ ở cỡ 12–13px, chỉ khoảng 5% ở cỡ nội dung 14px. Chữ nhỏ thì phải nhồi nhiều mới lấp đầy màn. Chỗ nào cũng đậm thì mắt không biết nhìn đâu trước.
2. **Cùng một việc nhỏ, mỗi màn một kiểu.** Có 5 kiểu chọn kỳ, 3 kiểu mở chi tiết, nhiều kiểu nút duyệt, và khoảng 20 file đánh số tab hoặc cột ("1. KOC trả phí").
3. **Thành phần dùng chung có lỗi, nên màn phải tự chế.** Ví dụ ô chọn lệch dòng, phải ghép ô tìm với ô chọn, danh sách bị cắt (§4.7).
4. **Một việc nằm ở nhiều nơi** (§4.6).

**Lệch tập trung ở 8 file**, chiếm khoảng 55% số màu cũ: `KocKolHubView` (562), `InputPlanBreakdownView` (472), `BrandOneSheetPlanView` (398), `PlanWeeklyBreakdown` (238), `ScriptReviewModal` (113), `PlanHistoryModal` (112), `ContentAngleSetupView` (99), `MonthlyPlanHub` (53).

**Công cụ kiểm tra để lọt lỗi.** ESLint hiện chỉ báo 23 lỗi giao diện. Luật chặn màu bỏ sót các họ dùng nhiều nhất (`slate`, `blue`, `emerald`, `amber`, `red`), và không có luật cho bảng, nút, ô tự viết hay nhãn đánh số.

**Tài liệu tự mâu thuẫn:**
- `DESIGN_SYSTEM.md` §8 ghi "hoàn tất 100%" (chưa đúng).
- Cỡ tiêu đề trang ghi khác nhau giữa tài liệu (20px) và `globals.css` (22px).
- Token `text-3xs` (11px) vẫn còn, trong khi chuẩn ghi tối thiểu 12px.

**Đo trên trình duyệt** (31/10/2026, 7 màn, 1440×900):
- Cả 7 màn có chữ dưới 12px. Ở danh sách Hợp đồng, toàn bộ tiêu đề cột chỉ 11px.
- Kế hoạch tháng đánh số cột và bị cắt chữ ở cột cuối.

**Lỗi đã sửa trong lúc khảo sát:** màn Quản lý Deal & Booking không tải được khi người dùng chưa có gian hàng (`lib/bookingList.ts`, hàm `resolveBrandBookingSheetUrl`). Đã sửa, chưa commit.

---

## 4. Chuẩn giao diện

Các mục 4.1–4.4 sẽ được đưa vào `DESIGN_SYSTEM.md`.

### 4.1 Gọn mà đủ: ba tầng thông tin

| Tầng | Ở đâu | Chứa gì |
|---|---|---|
| 1. Nhìn lướt | Hàng bảng, ô chỉ số | Thứ cần để quyết định có mở bản ghi hay không: tên, trạng thái, 1–2 con số chính, người phụ trách, hạn |
| 2. Rê chuột / mở rộng | Tooltip, dòng phụ nhỏ màu xám, hàng mở rộng | Phân rã con số, mã, ngày tạo, ghi chú ngắn |
| 3. Mở chi tiết | Trang hồ sơ, hộp thoại | Lịch sử, tài liệu, pháp lý |

Mỗi trường chỉ nằm ở **một** tầng. Mỗi lần dọn một màn, phải gửi bảng xếp tầng để duyệt trước khi sửa.

**Giới hạn mỗi màn:**

| Thành phần | Giới hạn |
|---|---|
| Hàng chỉ số | 4 ô (8 ô trong màn số liệu dày), mỗi ô 1 nhãn + 1 số + tối đa 1 dòng ghi chú |
| Bảng | 7 cột ở màn 1440px, mỗi ô tối đa 2 dòng, không cuộn ngang |
| Hàng lọc | Ô tìm kiếm + tối đa 3 ô chọn; phần còn lại vào "Lọc khác" |
| Chip | Tối đa 6 mỗi nhóm |
| Nút hiện sẵn trên mỗi dòng | 1, còn lại vào menu "⋯" |
| Màu trên mỗi dòng | 1 nhãn trạng thái |
| In đậm | Tiêu đề, số chính, tên bản ghi ở cột đầu |
| Chú thích dưới tiêu đề | Không có. Chỉ được ghi kỳ dữ liệu, lúc cập nhật hoặc nguồn |

### 4.2 Font và thang chữ

| Bậc | Cỡ | Đậm | Dùng cho |
|---|---|---|---|
| Tiêu đề trang | 20px | 600 | Thanh trên |
| Tiêu đề khối | 16px | 600 | `Panel`, `SectionHeader` |
| Nội dung | 14px | 400 | Đoạn văn, form, mô tả |
| Bảng | 13px | 400 (500 cho cột đầu) | Ô bảng, danh sách |
| Nhãn | 12px | 400–500 | Tiêu đề cột, nhãn ô, chú thích |
| Số chỉ số | 24–26px | 600 | `Stat` |

- **Font:** chỉ Be Vietnam Pro cho giao diện. JetBrains Mono (`font-code`) chỉ cho mã deal, SKU, mã hợp đồng. Số trong bảng dùng font chính, căn cột bằng `tabular-nums`.
- **Cỡ chữ:** tối thiểu 12px. Riêng màn số liệu dày (`<Density>`) được dùng 11px. Bỏ token `text-3xs` và các cỡ gõ tay.
- **Độ đậm và kiểu chữ:** chỉ dùng 3 độ đậm (400, 500, 600). Không viết hoa toàn bộ, không giãn chữ.
- **Icon:** 16px, hoặc 14px trong chip và bảng dày. Nét 1,75.

### 4.3 Khoảng cách

Chỉ dùng 4 · 8 · 12 · 16 · 24 · 32px. Quy đổi khi dọn:
- `gap-1.5` → `gap-2` (giữa các phần tử) hoặc `gap-1` (icon cạnh chữ)
- `gap-2.5` → `gap-2` hoặc `gap-3`
- `p-2.5` → `p-3`
- `p-3.5` → `p-4`

Trong `ui/` được giữ nửa bậc khi cần căn chỉnh.

### 4.4 Quy tắc thao tác chung (bắt buộc với mọi màn)

| Việc | Hiện tại | Chuẩn |
|---|---|---|
| **Chọn kỳ** | 5 kiểu: nút viên có "Tất cả" (Kế hoạch tháng), Select "Kỳ" (Kế hoạch content), Select "Tháng" (Video kênh Brand, Deal), Select gộp "gian·tháng" (Studio kế hoạch), không có kỳ chung (Báo cáo) | Một `PeriodPicker`, đặt ở thanh trên, bên trái. Các tab trong một màn dùng chung kỳ |
| **Nút tạo mới** | Lúc ở thanh trên, lúc ở giữa trang (Kế hoạch content, Video kênh Brand, Giao việc) | Luôn ở góc phải thanh trên (`PageActions`), một nút |
| **Mở chi tiết** | Thay trang, Modal, drawer tự viết | Thay trang khi bản ghi có nhiều phần (KOC, brand, deal, hợp đồng, CTV). Modal khi chỉ xem hoặc sửa nhanh một mục |
| **Duyệt / từ chối** | Hai đường duyệt kế hoạch tháng (thẩm định ở danh sách, phê duyệt trong studio); duyệt hàng loạt không có ô chọn dòng (Video kênh Brand) | Nhãn chỉ dùng "Duyệt", "Từ chối", "Yêu cầu sửa". Nút Duyệt bên phải. Từ chối và yêu cầu sửa luôn qua `ConfirmDialog` có lý do bắt buộc. Kết quả hiện bằng `Status`. Duyệt hồ sơ nhiều bước (hợp đồng, kế hoạch tháng) đặt nút ở đầu trang chi tiết; duyệt nhanh từng mục đặt ở cột cuối của dòng |
| **Thao tác hàng loạt** | Thanh theo ngữ cảnh (Đề xuất KOC), nút rời (Video kênh Brand) | Một `BulkBar`: hiện khi chọn ≥1 dòng, ghi "Đã chọn N", nút bên phải |
| **Bước quy trình** | Tab đánh số "1. Trình Brand (17)", "Bước 1…6", thanh bước tự viết | Một `StepBar` dùng chung; không đánh số trong nhãn tab và cột |
| **Lọc bảng** | `FilterBar` hoặc ô tìm kiếm + select tự viết | `FilterBar` |
| **Chọn trong danh sách lớn** | Ghép ô tìm + ô chọn, cắt danh sách | `Combobox` (§4.7) |
| **Trạng thái** | `Status` hoặc nhãn tô màu tự viết | `Status` với 8 nhãn chuẩn |

### 4.5 Khuôn trang: chỉ cho nhóm có đủ màn giống nhau

| Khuôn | Màn mẫu | Màn chuyển sang |
|---|---|---|
| **Danh sách + Hồ sơ** | Danh bạ KOC, Danh bạ CTV | Hồ sơ thương hiệu · Kế hoạch tháng (phần danh sách) · Quản lý Deal & Booking (chế độ danh sách) và hồ sơ deal · Hợp đồng, Phụ lục và hồ sơ hợp đồng · Giao việc |
| **Báo cáo** | Báo cáo điều hành | Báo cáo Ads tuần chỉ dùng chung phần vỏ (kỳ, thanh nút). Phần thân là luồng tải file và đối soát |
| **Cấu hình** | Phân quyền (đã có nháp → lưu/hoàn tác) | Tích hợp & API · các tab danh mục của Dữ liệu gốc (bậc cast, ngách, định dạng, trụ cột, SLA) · Phân công PIC/hệ số (`ManagerDelegationHub`). Ma trận quyền giữ dạng lưới riêng |

**Thành phần dùng chung** (không phải khuôn trang):

- `StepBar`: Quản lý Deal & Booking, Video kênh Brand & CTV, Studio kế hoạch tháng.
- `EditableGrid`: ô số, màu lệch so với chỉ tiêu, hàng tổng, cột ghim. Dùng cho Phân rã tuần và chế độ "Bảng tính Lark" của Deal.
- `RunPanel` (nhập → chạy → kết quả → lưu): các tab Quét kênh, Nghiên cứu Brand, bước tải file ở Báo cáo Ads.

**Không làm khuôn** cho:
- **Hàng chờ duyệt:** dùng chip "Chờ tôi duyệt" trong danh sách có sẵn.
- **Việc của tôi:** chỉ có một màn, phần nhân viên của Giao việc là chế độ xem của nó.
- **Lưới kế hoạch:** dùng `EditableGrid`.

**Giữ bố cục riêng** (vẫn theo §4.1–4.4):

| Màn | Lý do |
|---|---|
| Đề xuất KOC (`StaffBrandListingSheetWorkspace`) | Bản sao Google Sheet 57 cột: sửa ô, ẩn/hiện cột, khớp cột với Sheet |
| Bản 1-Sheet trình Brand (`BrandOneSheetPlanView`) | Văn bản bám đúng bố cục file Excel gửi Brand |
| Studio kế hoạch tháng (`InputPlanBreakdownView`) | Vỏ theo kiểu hồ sơ (quay lại, trạng thái, nút duyệt); thân là lưới nhiều bước |
| Kế hoạch content (`ContentPlanBoard`) | Kéo thả brief vào lưới Tuần × Bậc |
| Video kênh Brand & CTV (khung chứa) | Khung 9 tab; từng tab con theo khuôn tương ứng |
| Quét kênh & đối thủ, Nghiên cứu Brand | Luồng chạy công cụ (`RunPanel`) |
| Quản lý Zalo Bot | Ứng dụng con. Phần cấu hình (mẫu tin, webhook) chuyển về Tích hợp & API |
| Sổ tay & Hỏi đáp | Thư viện tài liệu |
| Cổng KOC/KOL | Cố ý đơn giản hơn màn nội bộ: ít cột, chữ dễ hiểu với người ngoài, không có menu thao tác nội bộ |

### 4.6 Một việc chỉ ở một nơi

| Việc | Đang ở | Giữ ở | Kết quả 31/10/2026 |
|---|---|---|---|
| Danh sách KOC | Danh bạ KOC, và lặp lại nguyên màn thành tab trong Dữ liệu gốc | Danh bạ KOC; Dữ liệu gốc chỉ để liên kết | **Xong.** Tab "Danh bạ KOC" trong Dữ liệu gốc chỉ còn số lượng và nút mở Danh bạ KOC |
| Phân quyền người dùng | Phân quyền & nhân sự, tab trong Zalo Bot | Phân quyền & nhân sự | **Chưa làm.** Tab Zalo Bot quản lý quyền của tài khoản Zalo với lệnh bot (`zaloUserId`), không phải quyền vào app. Gom vào RBAC chung là đổi mô hình phân quyền, phải chốt cả mô hình trước |
| Nghiệm thu link video | Tab trong Quét kênh, mục trong menu Quét kênh, tab trong Zalo Bot | Cần chốt một chỗ | **Quyết định: giữ cả ba nơi.** Không đổi |
| Cấu hình R2 | Nút trong Hồ sơ thương hiệu, Tích hợp & API | Tích hợp & API | **Xong.** Đã bỏ hai nút và modal ở Hồ sơ thương hiệu (danh sách và chi tiết) |
| Bảng SLA | Dữ liệu gốc và Sổ tay, lấy từ hai nguồn khác nhau | Dữ liệu gốc là nguồn; Sổ tay đọc từ đó | **Quyết định: bỏ qua.** Hai bảng khác loại (mốc giờ theo vai trò và mốc lịch theo ngày), chưa gom |
| Tính thuế Net/Gross | Máy tính trong Sổ tay (`MarketingKnowledgeQaView`) và `calculateContractTax` (hợp đồng, phiếu chi Lark, quyết toán CTV) | Một hàm trong `lib/` | **Quyết định: bỏ qua.** Hai nơi khác quy tắc (ngưỡng Net 1,8 triệu và 2 triệu; HKD trừ 7% và không trừ; VAT 8% và 10%); cần chốt quy tắc đúng trước khi gom |

Lỗi dữ liệu giả: Kịch bản & video gán cứng video `'DF-VID-1'` (`ContentView.tsx:951–978`).

### 4.7 Lỗi bố cục form: sửa ở thành phần gốc

Ví dụ: form Tạo hợp đồng, bước chọn Bên B (`contracts/ContractForm.tsx:1921`).

| Lỗi nhìn thấy | Nguyên nhân gốc | Sửa một lần ở đâu | Phạm vi |
|---|---|---|---|
| Ô chọn hẹp hơn cột, lệch dòng với ô bên cạnh | `Select` hiển thị dạng `inline-flex`; `Field` chỉ kéo rộng ô khi ô là con trực tiếp | `Field` (`ui/blocks.tsx:475`) kéo rộng mọi ô bên trong | ~30 form |
| Hai ô cho một lựa chọn (ô tìm + ô chọn), danh sách cắt ở 300/5.174 KOC | `Select` chỉ tìm theo nhãn, không chịu được danh sách lớn | Thêm `Combobox`: một ô, tìm nhiều trường, cuộn ảo | 20 chỗ ghép, 16 chỗ cắt `.slice(0, N)` |
| Đoạn chữ xám giải thích dưới tiêu đề khối | Luật chỉ chặn thuộc tính `subtitle`; màn tự viết `StepHint` nên lọt | Xóa; thêm vào bộ kiểm tra | Vài chỗ |
| "Bước 1 · …" | Không có thành phần bước | `StepBar` hoặc tiêu đề không đánh số | Kèm khoảng 20 file đánh số tab/cột |
| Danh sách chọn hiện đủ CCCD, MST, số tài khoản | Ghép thẳng dữ liệu nhạy cảm vào nhãn | Che số (`•••• 2194`) theo `DESIGN_SYSTEM.md` §7 | Cần rà |
| "Chưa rõ tên" khi thiếu dữ liệu | Điền chữ thay thế bằng `\|\|` | Hiện "—" | Cần rà |
| Bắt nhập lại "Tên Bên B" dù đã chọn hồ sơ pháp lý | Form không lấy tên từ hồ sơ | Có hồ sơ thì hiện dạng chữ; chỉ hiện ô nhập khi chưa có | Áp dụng chung: thông tin đã có thì không bắt nhập lại |

---

## 5. Lộ trình (khoảng 4–6 tuần)

Mỗi bước đều chụp ảnh trước và sau (1440×900 và 375px) để đối chiếu.

| Bước | Việc | Thời gian | Người dùng thấy gì |
|---|---|---|---|
| 0 | Chốt chuẩn | 0,5 ngày | — |
| 1 | Sửa ở thành phần gốc + đổi tự động | 2–3 ngày | Form thẳng hàng, chọn được đủ KOC, hết chữ li ti |
| 1′ | Gác cổng (song song bước 1) | 1–2 ngày | Lỗi mới không lọt được |
| 2 | Quy tắc thao tác chung + dọn trùng lặp | 1 tuần | Chọn kỳ, duyệt, mở chi tiết giống nhau ở mọi màn |
| 3 | Chuyển và dọn từng màn | 2–3 tuần | Từng màn gọn dần |
| 4 | Tách file lớn | Làm dần | — |

### Bước 0. Chốt chuẩn

1. Đưa §4.1–4.4 vào `DESIGN_SYSTEM.md`, sửa các chỗ mâu thuẫn ở §3.2.
2. Thêm `CLAUDE.md` ở gốc repo trỏ về `web-admin/DESIGN_SYSTEM.md` và file này.
3. Commit các thay đổi đang dở (bản sửa lỗi màn Deal, các file đang sửa của người khác) trước khi chạy bước 1, để thay đổi tự động không lẫn với thay đổi tay.

### Bước 1. Sửa ở thành phần gốc và đổi tự động

Sửa ở gốc, mỗi lần sửa có tác dụng cho nhiều màn:

1. `Field`: kéo rộng mọi ô bên trong, cho ô thẳng cột.
2. Thêm `Combobox`, thay 20 chỗ ghép ô tìm + ô chọn, bỏ 16 chỗ cắt danh sách.
3. Tiêu đề cột `DataTable` và mọi chữ dưới 12px đưa về 12px.
4. Màn thử đầu tiên là form Tạo hợp đồng (đã có ảnh lỗi để đối chiếu).

Đổi tự động bằng `scripts/ui-codemod.mjs`. Script chạy thử in ra diff trước, và bỏ qua các màn ẩn:

| Đổi | Ước tính |
|---|---:|
| Màu cũ → token ngữ nghĩa (theo bảng ánh xạ ở `DESIGN_SYSTEM.md` §2; `globals.css` đã trỏ màu cũ về thang mới nên phần lớn không đổi hình ảnh) | ~3.600 |
| `text-[13px]` → token; `text-3xs` → `text-2xs` và xóa token | ~180 |
| Bỏ `uppercase`, `tracking-wide*` | ~110 |
| Icon 12px → 14px | ~250 |
| Khoảng cách nửa bậc (trừ `ui/`) | ~1.460 |

### Bước 2. Quy tắc thao tác chung và dọn trùng lặp

1. Làm `PeriodPicker`, `BulkBar`, `StepBar`, chuẩn hóa duyệt qua `ConfirmDialog`.
2. Áp cho mọi màn trong phạm vi, kể cả màn giữ bố cục riêng.
3. Gom duyệt kế hoạch tháng về một đường.
4. Dọn các việc ở nhiều nơi theo §4.6.

### Bước 3. Chuyển và dọn từng màn

Mỗi màn làm 5 việc trong một lần, không quay lại lần hai:

1. Gửi bảng xếp tầng thông tin (§4.1) để duyệt.
2. Chuyển sang khuôn (§4.5) nếu thuộc khuôn; nếu không thì chỉ áp §4.4.
3. Thay thành phần tự viết bên trong:
   - nút, ô, bảng → `Button`, `Input`/`Select`/`Combobox`, `DataTable`;
   - nhãn tô nền → `Status`, hoặc chữ thường nếu là thuộc tính;
   - lớp nổi → `Modal`;
   - số → `lib/format.ts`;
   - `font-mono` ngoài mã → bỏ.
4. Hạ in đậm, đưa nội dung về 14px (bảng 13px, nhãn 12px), kiểm giới hạn §4.1.
5. Rà bằng mắt những lỗi máy không bắt được: ô thừa, bắt nhập lại, sai thứ tự thao tác.

Thứ tự:
1. Kế hoạch tháng
2. Quản lý Deal & Booking
3. Hợp đồng (form tạo và hồ sơ)
4. Video kênh Brand & CTV
5. Kịch bản & video
6. Cổng KOC/KOL
7. Danh bạ KOC, Hồ sơ thương hiệu, Điều phối & giao việc
8. Báo cáo & Dashboard
9. Nghiên cứu & đối thủ
10. Dữ liệu gốc, Phân quyền, Tích hợp & API
11. Việc của tôi, Sổ tay

### Bước 4. Tách file lớn

File trên 1.500 dòng chỉ tách khi đang sửa đúng màn đó. Tách thành bảng, form, hộp thoại, hook dữ liệu trong thư mục riêng (như `components/contracts/`). Không tách hàng loạt.

---

## 6. Giữ chuẩn về sau

Ba lớp bổ sung cho nhau. Không lớp nào bắt được 100%.

1. **Thành phần gốc đúng.** Đã có `Combobox`, `PeriodPicker`, `StepBar`, `BulkBar` thì không còn lý do tự chế.
2. **Kiểm tra mã nguồn** (`npm run ui:check`; ESLint giữ các luật `error` cũ, chưa thêm luật giao diện mới, quyết định 31/10/2026):
   - Chặn đủ mọi họ màu cũ, `text-3xs`, cỡ gõ tay, `font-mono` ngoài mã, `uppercase`, icon 12px, khoảng cách nửa bậc.
   - Chặn `<button>`, `<input>`, `<select>`, `<textarea>`, `<table>` ngoài `src/components/ui/`.
   - Chặn `toFixed` / `toLocaleString` trong `.tsx`.
   - Chặn nhãn tab hoặc cột bắt đầu bằng số thứ tự hay "Bước N".
   - Chặn ô tìm kiếm đi cặp với `Select`, `.slice(0, N)` trong danh sách chọn, component chú thích tự viết, CCCD/MST/STK trong nhãn tùy chọn, `|| 'Chưa rõ…'`.
   - **Đăng ký màn:** mỗi màn khai báo trong `src/lib/screenRegistry.ts` là thuộc khuôn nào, hoặc "riêng" kèm lý do. Tab mới chưa khai báo thì báo lỗi. Màn khai báo khuôn mà không dùng component khuôn đó cũng báo lỗi.
   - **Chỉ được giảm:** luật mới bật mức cảnh báo. `ui-baseline.json` lưu số vi phạm của từng file. File nào có số vi phạm tăng thì báo lỗi. File về 0 thì luật thành lỗi cứng cho file đó. Code mới phải sạch ngay.
3. **Kiểm tra trên trình duyệt** (`scripts/ui-audit-browser`): mở từng màn trong phạm vi ở 1440×900 và 375px, đo trên trang thật:
   - ô cùng hàng lệch quá 2px;
   - ô hẹp hơn 85% cột chứa nó;
   - chữ bị cắt;
   - chữ dưới 12px ngoài màn số liệu dày;
   - nhãn đánh số;
   - đoạn chú thích dưới tiêu đề khối.

   Bản thử đã chạy được. Còn phải bổ sung cho tab viết bằng nút thường và cột bị cắt do tràn khung bảng.

Kèm theo:

- Chạy `npm run lint && npm run ui:check` trước khi commit.
- `CLAUDE.md` (gốc và `web-admin`) và `GEMINI.md` cùng trỏ về `DESIGN_SYSTEM.md`, yêu cầu chạy `ui:check` trước khi báo xong.
- Danh sách kiểm tra PR thêm: ảnh chụp 1440 và 375px; bảng xếp tầng nếu thêm trường mới; màn đã khai báo trong `screenRegistry.ts`.
- Trang mẫu thành phần `/ui` (chỉ quản trị viên thấy), để người làm màn mới nhìn và chọn thay vì tự viết.

---

## 7. Chỉ số theo dõi

| Chỉ số | Hiện tại | Sau bước 1–2 | Sau bước 3 |
|---|---:|---:|---:|
| Màu Tailwind cũ | 3.590 | 0 | 0 |
| Chữ dưới 12px (ngoài màn số liệu dày) | có ở 7/7 màn đã đo | 0 | 0 |
| Kiểu chọn kỳ khác nhau | 5 | 1 | 1 |
| File đánh số tab/cột | ~20 | 0 | 0 |
| Chỗ ghép ô tìm + ô chọn / cắt danh sách | 20 / 16 | 0 / 0 | 0 / 0 |
| Việc nằm ở nhiều nơi (§4.6) | 6 | 0 | 0 |
| `<button>` / `<table>` tự viết ngoài `ui/` | 845 / 110 | giảm dần | < 50 / 0 |
| Nhãn tô nền tự viết | 318 | giảm dần | 0 |
| `font-semibold` | 2.942 | — | < 1.000 |
| `toFixed` / `toLocaleString` | 337 | 0 | 0 |
| Màn đã chuyển xong (§5 bước 3) | 0 / 11 nhóm | — | 11 / 11 |

`scripts/ui-audit.mjs` in bảng này mỗi lần chạy.

---

## 8. Còn cần chốt

1. **Cỡ chữ bảng:** đề xuất giữ 13px cho bảng và 14px cho mọi chỗ khác. Hay tăng bảng lên 14px (dễ đọc hơn trên laptop 13 inch, nhưng ít dòng hơn)?
2. **Xếp tầng thông tin (§4.1):** đồng ý đưa thông tin phụ vào tooltip và trang chi tiết để hàng bảng gọn?
3. **Nơi giữ cho việc bị lặp (§4.6):** đồng ý bảng đề xuất? Nghiệm thu link video giữ ở Quét kênh hay Zalo Bot?
4. **Mức chặn:** đề xuất "chỉ được giảm" (code mới phải sạch, code cũ giảm dần), hay chặn cứng ngay (phải sửa hết mới build được)?
5. **Đối tác Brand:** sau khi gỡ Cổng Brand, đối tác Brand dùng thẳng Quản lý Deal & Booking, Kịch bản & video, Báo cáo. Cần xác nhận các màn này đã lọc dữ liệu theo brand của đối tác trước khi dọn giao diện cho vai trò này.

Trạng thái các câu hỏi trên (31/10/2026): câu 1 áp dụng bảng 13px/14px như đề xuất, chưa có phản hồi riêng; câu 2 đã duyệt (xếp tầng áp dụng ở Kế hoạch tháng); câu 3 đã chốt (§4.6, kết quả ghi trong bảng); câu 4 đang chạy theo "chỉ được giảm" (`ui:check`); **câu 5 vẫn mở**.

---

## 9. Trạng thái và việc tiếp theo (cập nhật 31/10/2026)

Mục này để bắt đầu session mới mà không phải khám phá lại. Đọc trước khi làm.

### 9.1 Đã xong

**Bước 0 (một phần):** sửa dòng "hoàn tất 100%" ở `DESIGN_SYSTEM.md` §8; thêm `CLAUDE.md` ở gốc và cập nhật `web-admin/CLAUDE.md` (yêu cầu chạy `ui:check`). **Chưa:** mâu thuẫn cỡ tiêu đề trang (tài liệu 20px, `--text-2xl` trong `globals.css` 22px).

**Bước 1:**
- `Field` (`ui/blocks.tsx`): kéo rộng mọi ô bên trong (kể cả khi ô nằm trong wrapper), `content-start` chống ô bị đẩy xuống, loại thẻ `<select>` ẩn (`sr-only`) khỏi quy tắc `w-full` (từng làm cả trang tràn ngang).
- `Combobox` (`ui/Combobox.tsx`): một ô tìm + chọn, tìm không dấu theo nhiều trường, cuộn ảo (đã thử 5.001 KOC). Đã thay ở: Tạo hợp đồng (chọn KOC; số CCCD/MST/STK trong danh sách hồ sơ pháp lý che còn 4 số cuối), Công cụ QR (`WorkToolkitHubView`), Hồ sơ KOC liên kết (`ThirdPartyAccessSetupView`), thêm dòng Đề xuất KOC (`MultiPlatformListingWorkspace`), chọn nhãn hàng ở Điều phối (`ManagerDelegationHub`).
- `scripts/ui-codemod.mjs` (chạy thử mặc định, `--write`, `--only=color,textsize,tracking,icon,spacing`): đã ghi cả 5 luật. Đã xóa token `text-3xs`. `Avatar` chữ viết tắt tối thiểu 12px. Quy tắc CSS `th > .sr-only` chống tràn ngang ở bảng rộng.

**Bước 1′ (gác cổng):**
- `npm run ui:check`: 16 luật + `ui-baseline.json` theo nguyên tắc chỉ được giảm. `--report` in bảng chỉ số, `--where=<luật>` in từng dòng, `--update` khóa mức mới (chỉ cho giảm), `--update --accept-increase` khi buộc phải tăng.
- `src/lib/screenRegistry.ts`: khai báo đủ 43 khóa `TabKey` (19 màn hiển thị, 24 khóa ẩn); `ui:check` báo lỗi khi tab mới chưa khai báo, `own` thiếu lý do, hoặc khai `done` mà màn không dùng thành phần khuôn. **Chưa có thành phần khuôn nào** (`ListProfilePage`, `ReportPage`, `ConfigPage`) nên mọi màn còn `todo`.
- `npm run ui:audit` (Playwright, cần dev server cổng 3000, chỉ localhost): đo 13 màn x 2 cỡ (1440 và 375). `scripts/ui-audit-browser/probe.js` chạy được độc lập trong trang.
- Trang mẫu `/ui` (chỉ Quản trị, người khác nhận 404): màu, chữ, nút, trạng thái, số liệu, form, chọn kỳ, thanh bước, thao tác hàng loạt, bảng, hộp thoại.
- **ESLint: quyết định bỏ qua** (hook `config-protection` của plugin ecc chặn sửa `eslint.config.mjs`). `ui:check` là nơi chặn duy nhất. `scripts/lib/ui-patterns.mjs` giữ mẫu regex dùng lại được nếu sau này nối ESLint.

**Bước 2:**
- `StepBar` (`ui/StepBar.tsx`): thanh bước, tự hiện thứ tự, nhãn không đánh số. Đã dùng ở Video kênh Brand & CTV; nhãn bước `SELF_STAGE_LABEL` đã bỏ số.
- `PeriodPicker` (`ui/PeriodPicker.tsx`): nút lùi, ô chọn, nút tiến, có `allLabel`. Đã thay ở 5 chỗ trong Video kênh Brand & CTV, Hồ sơ thương hiệu (thanh trên), Kế hoạch tháng (thanh trên).
- `BulkBar` (`ui/BulkBar.tsx`): đã thay 3 thanh hàng loạt (Video kênh, Đề xuất KOC, Hệ số gian hàng).
- **Duyệt kế hoạch tháng gom về một đường** (`src/lib/planApproval.ts`: `canFinalApprovePlan`, `buildFinalApproval`; `handleStatusChangeForPlan` nhận `patch` để trạng thái và bản vá ghi một lần). Duyệt chốt luôn = `IN_EXECUTION` + khóa phiên bản + bản lưu + chữ ký, chỉ khi đủ các bên. Test: `tests/planApproval.test.ts` (6 bài). Đã xóa các hộp thoại duyệt chết ở Studio và danh sách. "Yêu cầu sửa" ở danh sách qua `ConfirmDialog` có lý do bắt buộc.
- §4.6: đã dọn 2/6 (Danh bạ KOC trong Dữ liệu gốc thành liên kết; bỏ cấu hình R2 ở Hồ sơ thương hiệu). Kết quả cả 6 việc ở bảng §4.6.

**Bước 3 (1/11 nhóm):** Kế hoạch tháng làm theo bảng xếp tầng đã duyệt: bảng 9 → 7 cột, 4 ô chỉ số, 5 chip (Tất cả, Cần xử lý, Khớp 4.1, Chờ duyệt, Đã duyệt), một nhãn trạng thái và một nút mỗi dòng cùng menu "⋯", `PeriodPicker` ở thanh trên. Bộ đo: sạch ở 1440px.

### 9.2 Số đo ngày 31/10/2026 (`npm run ui:check -- --report`, 154 file)

| Chỉ số | Đầu kế hoạch | Hiện tại |
|---|---:|---:|
| Nút `<button>` tự viết | 805 | 781 |
| `<select>` tự viết | 169 | 167 |
| Nhãn đánh số | 323 | 301 |
| `toFixed` / `toLocaleString` | 322 | 310 |
| Chữ dưới 12px | có ở 7/7 màn | 9 chỗ còn lại |
| Màn đã chuyển theo khuôn (§4.5) | 0 / 19 | 0 / 19 (Kế hoạch tháng đã dọn tầng thông tin, chưa dùng khuôn vì khuôn chưa có) |

Số **màu cũ (585)** và **khoảng cách nửa bậc (215)** đang cao hơn baseline vì `BrandOneSheetPlanView.tsx` bị ai đó đưa về bản cũ sau khi codemod chạy (550 màu cũ, 181 khoảng cách nửa bậc). Chạy lại `node scripts/ui-codemod.mjs --write src/components/views/BrandOneSheetPlanView.tsx` sau khi hỏi người đang sửa file đó.

### 9.3 Việc còn lại

**Bước 3, theo thứ tự §5, mỗi màn gửi bảng xếp tầng (§4.1) để duyệt trước khi sửa:**
2. Quản lý Deal & Booking (kèm `StaffBrandListingSheetWorkspace`, `MultiPlatformListingWorkspace`) · 3. Hợp đồng (form tạo, hồ sơ) · 4. Video kênh Brand & CTV · 5. Kịch bản & video · 6. Cổng KOC/KOL · 7. Danh bạ KOC, Hồ sơ thương hiệu, Điều phối & giao việc · 8. Báo cáo & Dashboard · 9. Nghiên cứu & đối thủ · 10. Dữ liệu gốc, Phân quyền, Tích hợp & API · 11. Việc của tôi, Sổ tay.

**Còn dở ở Kế hoạch tháng:** hộp thoại Thẩm định 4.1 (tiêu đề đánh số, mới mở được nhờ nối nút "Duyệt" và mục menu "Thẩm định 4.1"); hộp thoại đồng bộ Larkbase (bảng 7 cột); Studio kế hoạch (`InputPlanBreakdownView`, tab "2. Phê duyệt & Chỉ tiêu 4.1" còn đánh số); chưa bấm thử nút "Duyệt" thật vì dữ liệu demo không có kế hoạch nào chờ duyệt (không nên đẩy kế hoạch sang "chờ duyệt" qua giao diện vì sẽ ghi vào kho thật; dùng bản sao dữ liệu hoặc môi trường thử).

**Còn dở ở Bước 2:**
- `PeriodPicker` chưa thay ở: `StaffBrandListingSheetWorkspace` (kèm số KOC và gian trong nhãn), `ApprovedBookingListView`, `PlanActualReportView`, `BrandProfileDetail`, ô gộp "gian·tháng" của Studio, Báo cáo chưa có kỳ chung. Chưa gom trạng thái để các tab trong một màn dùng chung một kỳ.
- Chuẩn hóa duyệt/từ chối qua `ConfirmDialog` có lý do bắt buộc ở các màn khác (hợp đồng...) chưa rà.
- Studio kế hoạch tháng chưa dùng `StepBar`; công tắc "1. Trình Brand…" trong Đề xuất KOC mới bỏ số, các nút "1. So sánh dữ liệu 2 bên", "1. Đọc & So sánh lại", "3. Cập nhật & Tạo Deal" giữ nguyên vì lời hướng dẫn cạnh đó nhắc đúng tên nút.

**Chưa làm từ các bước trước:**
- Tạo ba thành phần khuôn trang (§4.5) và `RunPanel`, `EditableGrid`.
- 35 chỗ màu codemod không dám đổi (`ui:check --where=mau-cu`), 1 chỗ `.slice(0, N)` trước danh sách `<option>`, 5 chỗ `|| 'Chưa rõ'`.
- Đo ở 375px: Việc của tôi có 35 tên công việc bị cắt không có tooltip; Danh bạ KOC, Hợp đồng vài chỗ.
- Bước 4 (tách file lớn): chưa. `MonthlyPlanHub.tsx` còn khoảng 4.900 dòng, nhiều biến chết (cảnh báo `no-unused-vars`).
- Lỗi dữ liệu giả: Kịch bản & video gán cứng video `'DF-VID-1'` (`ContentView.tsx`).
- Mâu thuẫn cỡ tiêu đề trang (§3.2).

**Các quyết định đã chốt hoặc đang treo (đã hỏi user, không hỏi lại):**
- Quy tắc thuế Net/Gross: user chọn **bỏ qua**. Sổ tay và `calculateContractTax` khác quy tắc (ngưỡng Net 1,8 triệu và 2 triệu; hộ kinh doanh trừ 7% và không trừ; VAT 8% và 10%). Chưa gom, chưa sửa hàm hợp đồng, cần xác nhận kế toán/pháp chế trước.
- Bảng SLA: **bỏ qua**, giữ hai bảng khác loại (mốc giờ ở Dữ liệu gốc, mốc lịch theo ngày ở Sổ tay).
- Nghiệm thu link video: **giữ cả ba nơi**.
- Phân quyền Zalo Bot: **chưa đụng** vì là quyền của tài khoản Zalo với lệnh bot; gom vào RBAC chung là đổi mô hình phân quyền, phải chốt cả mô hình quyền trước.

### 9.4 Cách làm việc và những điều cần biết

- **Lệnh:** `npm run ui:check` (và `-- --report`, `-- --where=<luật>`, `-- --update`), `npm run ui:codemod`, `npm run ui:audit`, `npx tsx --test tests/planApproval.test.ts`. Điểm khôi phục codemod nằm ở `refs/ui-sync/*` (chỉ chứa file đã theo dõi, chỉ có ở máy đã chạy codemod).
- **Cây làm việc dùng chung với người/agent khác.** Trong lúc làm, họ sửa dở hợp đồng, brand, `approvedBookingList`..., làm `ui:check` và `tsc` thất bại ở file của họ và có lúc app trả lỗi 500. Đừng sửa hộ; kiểm tra `git status` và chỉ commit file của mình.
- **Màn ẩn bị xóa:** `AirBookingReportHubView`, `AuditTrailView`, `BookingView`, `BrandHubView`, `BrandView`, `CloudflareAdminView` đang ở trạng thái xóa trong cây làm việc (không phải do công việc này), trái với §2.2 ("giữ nguyên, không xóa"). `HIDDEN_SCREENS` trong `scripts/lib/ui-scope.mjs` vẫn liệt kê chúng; cập nhật khi chốt số phận các file đó.
- **Hook cần lưu ý:** `gateguard` bắt nêu nơi gọi, API, dữ liệu và lệnh của người dùng trước lần sửa/tạo file đầu tiên; `config-protection` (plugin ecc) chặn sửa `eslint.config.mjs`. Shell có lúc không nhận heredoc dài: ghi script vào thư mục tạm bằng công cụ ghi file rồi chạy bằng `node`.
- **Dev server:** sửa nóng liên tục có thể để lại trạng thái lỗi; tải lại trang và chờ khoảng 10 giây trước khi đo. Đăng nhập demo: `/login`, hoặc `POST /api/auth/lark/sandbox` với `{ "userId": "user-huu-chien" }` (Quản trị).
- **Bộ nhớ dự án** (`~/.claude/projects/E--Upbase-B2C/memory/`, chỉ có trên máy này): `plan-approval-single-path-2026-10`, `net-gross-tax-rules-diverge`, `ui-same-function-same-layout`.
