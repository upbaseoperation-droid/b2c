# Upbase Ops Design System

Quy chuẩn giao diện và từ ngữ cho `web-admin`. Áp dụng cho mọi màn hình mới và mọi lần sửa màn hình cũ.

- Token: [`src/app/globals.css`](src/app/globals.css), khối `@theme`
- Thành phần: [`src/components/ui/index.tsx`](src/components/ui/index.tsx)
- Định dạng số: [`src/lib/format.ts`](src/lib/format.ts)
- Kiểm tra tự động: quy tắc `no-restricted-syntax` trong [`eslint.config.mjs`](eslint.config.mjs)

Thứ tự ưu tiên khi có mâu thuẫn: yêu cầu của người dùng → file này → thói quen của code cũ.

### Cập nhật trải nghiệm 19/10/2026

- **Kiến trúc Điều hướng & Nhóm màn hình (`src/lib/navGroups.ts`):** Toàn bộ tên màn hình trên `Sidebar` và tiêu đề `TopHeader` lấy từ một nguồn duy nhất `TAB_LABELS`. Các màn hình cùng cụm nghiệp vụ được gộp thành 1 mục trên menu trái và chuyển đổi qua thanh `<Tabs>` ngang đầu trang (`NAV_GROUPS`: *Điều phối & Giao việc* gộp `task-delegation` / `workload-3d` / `manager`; *Brand & Gian hàng* gộp `brand-knowledge` / `stores`; *Nghiên cứu & Crawler* gộp `market-research` / `tiktok-crawler` / `koc-master`). *Báo cáo Ads TikTok* là mục con của *Báo cáo & Dashboard*; *Sổ tay & Hỏi đáp* và *Cấu hình API* là nút biểu tượng ở chân menu cạnh tài khoản. Mục menu khai báo một lần trong `NAV` của `Sidebar.tsx`, mỗi vai trò chỉ chọn và xếp nhóm. Menu trái còn 18 mục với Quản trị viên và 9–11 mục với Chuyên viên.
- **Nguyên tắc Nguồn dữ liệu duy nhất (Single Source of Truth):** Mỗi thực thể hoặc bảng cấu hình chỉ đặt tại đúng 1 màn hình chuyên trách; tuyệt đối không nhân bản tab chéo giữa các màn hình (Hệ số gian hàng Bảng 2 chỉ ở `ManagerDelegationHub`; Trụ cột nội dung chỉ ở `ContentAngleSetupView`; Nhật ký kiểm toán chỉ ở `AuditTrailView`; Bảng xếp hạng tích hợp trong `ExecutiveDashboardReportsView` → Nhân sự).
- **Cấm tuyệt đối dòng phụ đề/mô tả xám giải thích dưới tiêu đề:** `TopHeader`, `Panel`, `SectionHeader`, `Modal` và `Field` đã gỡ bỏ hoàn toàn dòng chữ phụ đề xám (`subtitle`, `description`, `hint`, `moduleSubtitle`) nhằm giữ giao diện sạch, đi thẳng vào dữ liệu và thao tác.
- Menu trái hiển thị trọn bộ danh mục trong một màn hình (mỗi mục cao 32px, đầu trang cao 56px), không để phát sinh thanh cuộn dọc. Mục hiện tại dùng nền `accent-soft`, chữ `accent` và vạch chỉ báo.
- Thanh tiêu đề cao tối thiểu 56px (khớp với đầu menu trái), thao tác tự xuống hàng khi thiếu chỗ. Nội dung có khoảng đệm 20–24px theo chiều dọc và căn giữa ở màn hình rộng.
- Khung `Panel` có đệm tiêu đề 16 × 20px. Nút `.btn-md` cao 38px; nhóm `.btn-*` có chiều cao tối thiểu 44px trên thiết bị cảm ứng. Thành phần `Button` dùng kích thước riêng như bảng thành phần bên dưới.
- Chuyển động theo quy chuẩn riêng ở §9: token thời lượng/đường cong, số KPI lăn, thanh biểu đồ mọc, vạch chỉ báo trượt, hàng bảng trượt khi sắp xếp, dấu duyệt bước, toast xếp chồng, chuyển cảnh danh sách → hồ sơ. Tôn trọng `prefers-reduced-motion`; không thêm chuyển động lặp liên tục.
- Danh bạ KOC, hợp đồng, báo cáo Ads và báo cáo điều hành được chia gói tải theo nhu cầu, có thông báo đang tải và khung giữ chỗ. Chưa có số đo tốc độ trước/sau.

### Cập nhật 29/10/2026: học từ UpOperation MCN

Mẫu tham chiếu là các màn Tổng quan, Phân tích và Chi tiết creator của UpOperation. Những màn này hiện rất nhiều số mà vẫn sạch nhờ các điểm sau, nay thành quy chuẩn:

- **Mật độ dày cho màn số liệu.** Bọc màn bằng `<Density>` (§3.1). Chữ nhỏ đi một bậc (13px nội dung, 11px nhãn), số chỉ số dùng font mono, một hàng có tới 8 ô chỉ số. Dashboard là màn đầu tiên dùng chế độ này.
- **Phân cấp bằng cỡ chữ và độ đậm, không bằng màu.** Nhãn nhỏ màu xám, số to màu đen, chỉ một màu nhấn (`critical`) cho icon khối, biểu đồ và heatmap. Không dùng hộp nền màu (`*-soft`) để trang trí, chỉ dùng cho trạng thái.
- **Khối = icon + tiêu đề + một dòng ngữ cảnh.** `Panel` nhận `icon` và `meta`. `meta` chỉ ghi kỳ dữ liệu, lúc cập nhật hoặc nguồn ("29/09 – 28/10 · cập nhật 17:13"), không giải thích. Điều khiển nhỏ (khoảng ngày, chỉ số) nằm ở góc phải khối, không gom thành dải bộ lọc riêng.
- **Biểu đồ trước, bảng sau.** Hai biểu đồ đặt cạnh nhau rồi mới đến bảng. Dưới biểu đồ có một dòng "Cao nhất: …" hoặc "Nhiều nhất: …". Bảng tối đa 7 cột, mỗi ô một ý.
- **Cột phải cho thông tin phụ.** Ở màn ≥1536px (`2xl`), tiến độ, việc cần xử lý và hồ sơ nằm trong một cột phải khoảng 320–360px. Màn hẹp hơn thì cột này xuống dưới.
- **Thiếu số là "—", và dồn về sau.** Ô chỉ số chưa có dữ liệu để "—", và nên xếp sau các ô có số.

---

## 1. Nguyên tắc

1. **Dữ liệu là nhân vật chính.** Bảng, con số và trạng thái nằm ở màn hình đầu. Không mở trang bằng banner giới thiệu, thẻ giải thích vai trò, khẩu hiệu hay dòng phụ đề xám (`subtitle`, `description`, `hint`) dưới tiêu đề. Ngoại lệ duy nhất: `Panel meta` ghi kỳ dữ liệu, lúc cập nhật hoặc nguồn.
2. **Một nguồn dữ liệu duy nhất (Single Source of Truth).** Mỗi danh mục, bảng cấu hình hoặc chỉ số KPI chỉ xuất hiện ở một nơi duy nhất trên màn hình và một phân hệ duy nhất trong toàn hệ thống. Không lặp lại cùng một con số giữa thẻ KPI đầu trang và các ô phụ bên dưới; không nhúng lại bảng của màn hình khác thành tab phụ.
3. **Một điểm nhấn mỗi vùng.** Một màu nhấn, một nút chính, một con số quan trọng. Màu chỉ dùng để báo trạng thái, không dùng để phân biệt phân hệ.
4. **Khoảng trắng thay đường viền.** Nhóm nội dung bằng khoảng cách và tiêu đề. Chỉ đóng khung khi khối đó thao tác được độc lập (bảng, form). Không lồng khung trong khung.
5. **Nói như đồng nghiệp.** Câu ngắn, viết hoa kiểu câu, đúng từ team dùng hằng ngày. Không quảng cáo, không cảm thán, không emoji, không từ ngữ AI/Smart/Engine/Cockpit.
6. **Không bịa dữ liệu.** Không dùng `??` / `||` để điền số, tên, địa chỉ, SĐT, số giấy tờ hay bản ghi mẫu vào giao diện hoặc vào bản ghi khi lưu, và không gõ cứng số giả trong JSX. Thiếu thì hiện “—” hoặc trạng thái rỗng nói thiếu gì. Dữ liệu mẫu chỉ nằm trong `lib/mockData.ts` và các file dataset.

---

## 2. Màu

Dùng **token ngữ nghĩa** trong code mới. Tailwind sinh class từ token: `bg-surface`, `text-ink-3`, `border-line`, `bg-accent`, `text-critical`…

| Token | Giá trị | Dùng cho |
|---|---|---|
| `canvas` | `#F6F7F9` | Nền trang, nền hàng khi rê chuột |
| `surface` | `#FFFFFF` | Bảng, menu trái, modal, ô nhập |
| `sunken` | `#EEF1F5` | Nền nhãn trung tính, segmented control |
| `line` | `#E4E8EE` | Đường kẻ bảng, viền khung |
| `line-strong` | `#C9D1DC` | Viền ô nhập, nút phụ |
| `ink` | `#16171A` | Tiêu đề, nội dung bảng, con số |
| `ink-2` | `#43454B` | Đoạn văn, mô tả |
| `ink-3` | `#686B72` | Nhãn cột, chú thích, icon phụ (4,9:1 trên nền trắng) |
| `primary` / `primary-hover` | `#2B2B2B` / `#141414` | Nút chính. Lấy từ chữ “upbase” trong logo |
| `accent` / `accent-hover` | `#24457A` / `#1B355F` | Liên kết, tab đang chọn, tiến độ, trạng thái “Đang chạy”. Không dùng trang trí |
| `accent-soft` | `#E9EEF6` | Nền trạng thái "Đang chạy", ảnh đại diện |
| `positive` / `-soft` | `#1E6E46` / `#E5F1E9` | Đã duyệt, hoàn tất, vượt mục tiêu |
| `warning` / `-soft` | `#855000` / `#F7EDDB` | Chờ duyệt, sắp đến hạn, thiếu dữ liệu |
| `critical` / `-soft` | `#A3241B` / `#F8E4E2` | Quá hạn, vượt ngân sách, lỗi, xóa |
| `focus` | `#3D6BC4` | Viền focus bàn phím |

**Không dùng:** gradient, màu tím/chàm/hồng/cam/xanh ngọc/xanh lơ, bóng màu (`shadow-blue-…`), nền tối cho khối nội dung. Tính năng có máy gợi ý không có màu riêng.

### Màu thương hiệu

Nút chính dùng `--color-primary` (than đen của chữ “upbase”). Màu xanh `--color-accent` dành cho thông tin: liên kết, tiến độ, trạng thái đang chạy. Đổi màu ở `globals.css` là cả app đổi theo; nút cũ viết `bg-blue-600`/`bg-indigo-600` cũng được ánh xạ về `primary`. Logo: `public/upbase-logo.png`, hiển thị qua thành phần `BrandLogo` (menu trái, trang đăng nhập). Icon tab trình duyệt: `src/app/icon.png` và `src/app/favicon.ico`, cắt từ biểu tượng chữ U của logo (48×48). Màu lấy từ logo: cam san hô `#EF5842`, chữ `#2B2B2B`. Cam san hô chỉ dùng cho logo, không dùng cho nút hay trạng thái vì dễ lẫn với màu lỗi và màu Shopee. File hiện là PNG 180×48; nên thay bằng SVG khi có để logo nét trên màn hình độ phân giải cao.

### Màu dữ liệu

Mỗi kênh bán có một màu cố định. Chỉ dùng trong biểu đồ, thanh phân bổ, chấm phân loại, **không** dùng cho nút, chữ hay nền khối.

| Token | Kênh | Giá trị |
|---|---|---|
| `ch-tiktok` | TikTok Shop | `#2A78D6` |
| `ch-shopee` | Shopee | `#EB6834` |
| `ch-live` | Livestream | `#1BAF7A` |
| `ch-self` | Kênh tự xây | `#EDA100` |
| `ch-lazada` | Lazada | `#E87BA4` |
| `ch-other` | Facebook, Instagram, Threads… | `#A9ABB0` |

Thứ tự trên đã qua kiểm tra phân biệt cho người mù màu (cặp kề nhau ΔE ≥ 9). Livestream, kênh tự xây và Lazada có độ tương phản dưới 3:1 trên nền trắng, nên **luôn hiện kèm nhãn chữ** (`ChannelBar` và `ChannelTag` đã làm sẵn). Màu kênh không thay màu trạng thái: vàng của “kênh tự xây” không có nghĩa là cảnh báo.

Ảnh đại diện dùng 8 cặp nền nhạt + chữ đậm, chọn cố định theo tên (cùng người luôn cùng màu), chữ đạt ≥ 5,8:1.

### Bảng màu Tailwind cũ

Code cũ dùng 12 họ màu. Trong `@theme`, mỗi họ đã được trỏ về một thang của design system nên giao diện cũ tự đổi theo:

| Họ màu Tailwind | Trỏ về |
|---|---|
| slate, gray, zinc, neutral, stone | trung tính (`canvas` → `ink`) |
| blue, indigo, violet, purple, fuchsia, sky, cyan, pink | nhấn (xanh mực) |
| emerald, green, teal, lime | tích cực |
| amber, yellow, orange | cảnh báo |
| red, rose | lỗi |

Đây là lớp tương thích. Khi sửa một màn hình, thay class cũ bằng token ngữ nghĩa (`text-slate-500` → `text-ink-3`, `bg-blue-600` → `bg-accent`, `bg-emerald-50 text-emerald-700` → `<Status tone="positive">`).

---

## 3. Chữ

- **Be Vietnam Pro** (400, 500, 600) cho toàn bộ giao diện. Font do nhóm thiết kế người Việt làm, dấu không bị chồng ở cỡ nhỏ.
- **JetBrains Mono** chỉ cho mã: mã deal, SKU, mã hợp đồng. Dùng class `font-code`.
- Số trong bảng và chỉ số luôn đều cột (`tabular-nums`, đã bật mặc định cho `<table>`).

| Vai trò | Class | Cỡ / dòng / độ đậm |
|---|---|---|
| Tiêu đề trang (thanh trên) | `text-xl font-semibold` | 20/28 · 600 |
| Con số trong ô chỉ số | `text-[26px] font-semibold` | 26/32 · 600 |
| Tiêu đề khối | `text-base font-semibold` | 16/24 · 600 |
| Nội dung | `text-sm` | 14/22 · 400 |
| Ô bảng, nội dung dày | `text-xs` | 13/20 · 400 |
| Nhãn, chú thích | `text-2xs text-ink-3` | 12/18 · 400–500 |

Chữ điều khiển và số chỉ số có token riêng để chế độ dày thu nhỏ được: `text-ctl-sm` (12,5px: chip, nút chọn), `text-ctl` (13px: tab, nút nhỏ), `text-ctl-md` (13,5px: nút, ô nhập), `text-stat` (26px), `text-stat-sm` (20px), `font-figure` (font của số chỉ số). Thành phần trong `ui` dùng các token này, không gõ `text-[13px]`.

Quy tắc:
- **Cỡ nhỏ nhất là 12px** (`text-2xs`), riêng trong mật độ dày là 11px (vẫn qua `text-2xs`). Không dùng `text-[9px]`, `text-[10px]`, `text-[11px]`.
- Chỉ 3 độ đậm: `font-normal`, `font-medium`, `font-semibold`. Không dùng `font-bold` trở lên.
- Không viết hoa toàn bộ (`uppercase`), kể cả tiêu đề cột và tên nhóm menu. Không giãn chữ (`tracking-wider`).

### 3.1 Mật độ dày (compact)

Dùng cho màn đọc nhiều số liệu: Dashboard, báo cáo, hồ sơ có nhiều chỉ số. Bọc cả màn trong `<Density>` (từ `@/components/ui`); không bật cho form nhập liệu dài.

```tsx
<Density className="space-y-4">…</Density>
```

`<Density>` gắn `data-density="compact"`. Trong vùng này, `globals.css` hạ thang chữ một bậc và các thành phần tự đổi kiểu theo `useDensity()`:

| | Thường | Dày |
|---|---|---|
| `text-2xs` / `text-xs` / `text-sm` / `text-base` | 12 / 13 / 14 / 16px | 11 / 12 / 13 / 14px |
| Chữ tab, nút chọn (`text-ctl*`) | 12,5–13,5px | 12–12,5px |
| Số chỉ số | 26px Be Vietnam Pro, đậm 600 | 18px JetBrains Mono, đậm 500 |
| `StatRow` | Chung một khung, tối đa 4 ô | Mỗi ô một thẻ, tối đa 8 ô (2 → 4 → 8 cột theo bề rộng) |
| `Panel` | Tiêu đề có kẻ ngang bên dưới | Không kẻ ngang; icon màu nhấn + `meta` ngay dưới tiêu đề |

Bố cục gợi ý cho một màn số liệu, từ trên xuống:
1. `Panel` kỳ dữ liệu: icon, tiêu đề, `meta` là khoảng ngày, nút phụ bên phải.
2. `StatRow` tối đa 8 ô.
3. Lưới `grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px]`. Cột trái có hai biểu đồ cạnh nhau, rồi đến bảng. Cột phải là tiến độ và việc cần xử lý.

Chữ 11–13px dễ đọc trên màn 1920px nhưng hơi nhỏ trên laptop 13 inch. Không bật mật độ dày cho màn người dùng phải đọc lâu hoặc nhập liệu.

---

## 4. Khoảng cách, bo góc, đổ bóng

**Khoảng cách** theo bội số 4: `1` (4px) icon–chữ · `2` (8px) giữa các nút · `3` (12px) đệm dọc ô bảng · `4` (16px) đệm khung · `6` (24px) giữa các khối · `8` (32px) lề trang.

**Bo góc**, chỉ 3 mức:

| Class | Giá trị | Dùng cho |
|---|---|---|
| `rounded`, `rounded-sm` | 4px | Nhãn trạng thái, ô mã |
| `rounded-md`, `rounded-lg` | 8px / 10px | Nút, ô nhập, mục menu |
| `rounded-xl`, `rounded-2xl` | 12px / 16px | Bảng, modal, khung |
| `rounded-full` | | Chỉ ảnh đại diện và chấm trạng thái |

**Đổ bóng:** khung `Panel` và `card-enterprise` dùng bóng trung tính rất nhẹ (2px / 6px, độ mờ 2,5%) cùng viền `border-line`. `shadow-sm` trở xuống đã được tắt. Chỉ lớp nổi (menu thả, popover, modal, toast) dùng `shadow-md`, `shadow-xl`, `shadow-2xl`.

**Chuyển động:** xem §9. Tóm tắt: chỉ dùng khi có nghĩa, dùng token `--motion-*` / `ease-*` và thành phần trong `ui/motion.tsx`; không `animate-pulse`, `animate-bounce`, `animate-ping`, không phóng to khi rê chuột.

---

## 5. Thành phần

Import từ `@/components/ui` (hoặc đường dẫn tương đối `../ui`).

| Thành phần | Dùng khi | Quy tắc |
|---|---|---|
| `Button` | Mọi nút | `variant`: `primary` · `secondary` · `ghost` · `danger`. `size`: `md` (34px) · `sm` (28px). **Mỗi vùng tối đa một `primary`.** Icon truyền qua `icon={Plus}`, không gõ “+” vào nhãn |
| `Status` | Trạng thái của một bản ghi | Chấm tròn + chữ, không viền. Dùng `STATUS.approved` … để lấy đúng nhãn và màu |
| `Tabs` | Chuyển giữa các phần cùng cấp của một trang | Gạch chân. Số đếm màu nhạt bên cạnh, không đóng khung, không đánh số “1. 2. 3.” |
| `Segmented` | Bộ lọc nhỏ hoặc phân khu con (tháng, tuần, mục trong tab) | Không lồng `Tabs` trong `Tabs` — tầng thứ hai dùng `Segmented` |
| `SectionHeader` | Đầu một khối | Một tiêu đề, mô tả chỉ khi thêm thông tin, thao tác bên phải |
| `Stat`, `StatRow` | Hàng chỉ số đầu trang | Tối đa 4 ô, hoặc 8 ô trong mật độ dày (§3.1). Ghi chú nói ý nghĩa của con số, không lặp lại nhãn |
| `Density` | Bọc màn số liệu để dùng mật độ dày | Xem §3.1. Một màn chỉ một vùng `Density`, không lồng |
| `EmptyState` | Bảng hoặc danh sách rỗng | Một câu nói đang thiếu gì, một câu nói việc tiếp theo, một nút |

**Thành phần dữ liệu** (`src/components/ui/data.tsx`, export qua `ui`):

| Thành phần | Dùng khi | Quy tắc |
|---|---|---|
| `Avatar`, `Person` | Bất kỳ chỗ nào hiện tên người (PIC, nhân sự, người duyệt) | Ảnh Lark nếu có, nếu không là chữ viết tắt trên màu cố định theo tên. Không tự vẽ ô tròn chữ cái |
| `ChannelTag` | Hiện kênh/sàn của một bản ghi | Thay cho chuỗi thô `TIKTOK_SHOP`, `SHOPEE_MALL`. Mã thô được chuẩn hóa qua `channelOf()` |
| `ChannelBar` | Cơ cấu ngân sách, số nội dung, giá trị deal theo kênh | Khe 2px giữa các đoạn, chú thích có tên và %. Truyền `format` để tooltip hiện số tiền |
| `Progress` | Tiến độ so với chỉ tiêu (đã phân rã / ngân sách, air / kế hoạch) | Màu theo ý nghĩa: dưới mốc → cảnh báo, đạt → nhấn, đủ 100% → tích cực. `invert` cho chỉ số càng thấp càng tốt. Không dùng thanh trang trí với độ rộng cố định |
| `Sparkline` | Xu hướng của một chỉ số qua các kỳ | Chỉ vẽ từ dữ liệu thật (ít nhất 2 kỳ). Không tự bịa dãy số cho đẹp |

`Stat` nhận thêm `trend` (dãy số) và `progress` ({ value, max }) để hiện các thành phần trên trong ô chỉ số.

**Khối dựng màn hình** (`src/components/ui/blocks.tsx`):

| Thành phần | Dùng khi | Quy tắc |
|---|---|---|
| `Toolbar` | Hàng ngay dưới tiêu đề trang, khi có bộ chọn kỳ hoặc lọc nhanh | Trái: chọn kỳ, bộ lọc nhanh. Phải: thao tác phụ. Không dùng Toolbar chỉ để chứa một nút — nút chính đưa lên thanh trên bằng `PageActions` |
| `PageActions` | Nút chính của màn (Thêm KOC, Tạo booking…) | Đưa nút lên cuối thanh trên, cạnh tiêu đề trang. Chỉ hiện khi màn đang mở. Tối đa một `primary` |
| `Panel` | Khung chứa bảng, form, biểu đồ | Tiêu đề + thao tác. `icon`: icon lucide màu nhấn trước tiêu đề. `meta`: một dòng ngữ cảnh dưới tiêu đề, **chỉ** ghi kỳ dữ liệu, lúc cập nhật hoặc nguồn, không dùng để giải thích. `flush` cho bảng |
| `FilterBar`, `SearchInput`, `Chips` | Lọc một bảng | Đặt ngay trên bảng, trong `Panel`. Ô tìm kiếm trái, ô chọn phải, chip trạng thái hàng dưới, số kết quả cuối hàng. Chip có số đếm |
| `ActionMenu` | Thao tác phụ của một hàng | Nút “⋯” mở danh sách thao tác. Tự chặn lan sự kiện nên dùng được cùng `onRowClick` |
| `Pagination` | Chân bảng có phân trang | Vị trí đang xem, số dòng mỗi trang, trang trước/sau. Chỉ đặt cuối bảng |
| `DataTable` | Mọi bảng dữ liệu | Khai báo cột (`header`, `render`, `align`, `width`). Số căn phải. Có `empty` (dùng `EmptyState`). `stickyLast` khi cột cuối là thao tác. `onRowClick` khi cả hàng mở chi tiết |
| `Modal` | Tác vụ ngắn: sửa một bản ghi, bàn giao | Đóng bằng Esc/X/bấm ngoài. Chân: “Hủy” (ghost) rồi nút chính. Tiêu đề là động từ + đối tượng (“Cập nhật job BO…”) |
| `ConfirmDialog` | Thao tác không hoàn tác được, hoặc cần lý do | Thay cho `alert`, `confirm`, `prompt` (ESLint chặn ở màn đã chuyển). `tone="danger"` cho từ chối, xóa, hủy |
| `Field`, `Input`, `Select`, `Textarea` | Mọi form | Nhãn ở trên, `error` nói cách sửa (không hiển thị dòng `hint` xám dư thừa). Lựa chọn ≤ 3 dùng `Segmented`, nhiều hơn dùng `Select` |

Toast: dùng `showToast(message, type)` trong `app/page.tsx` (hàng đợi `useToastQueue` + `ToastStack` trong `ui/toast.tsx`). Nền `ink`, chữ trắng, icon theo loại. Nhiều thông báo xếp chồng, không đè nhau.

Chuyển động (`NumberRoll`, `SlidingIndicator`, `StepMark`, `ChangeFlash`, `Skeleton`, `withViewTransition`…): xem §9.

Cần thành phần mới (Modal, Table, Menu…)? Thêm vào `src/components/ui/` thay vì viết style riêng trong màn hình.

---

## 6. Giọng văn và từ ngữ

### Quy tắc

1. **Viết hoa kiểu câu.** Chỉ viết hoa chữ đầu và tên riêng (tên brand, tên người, TikTok, Shopee).
   `Hợp Đồng & Thanh Toán` → `Hợp đồng & thanh toán`
2. **Một thuật ngữ, một ngôn ngữ.** Không chú thích tiếng Anh trong ngoặc.
   `Lưu Bản Nháp (Save Draft)` → `Lưu nháp`
3. **Gọi tên việc, không gọi tên công nghệ.** Không có “AI”, “API”, “Engine”, “OCR” trên nút hay tiêu đề.
   `Phân Tích Bằng AI (AI Deep Scan)` → `Kiểm tra kịch bản`
4. **Nội dung do máy tạo ghi là “Gợi ý”.** Người dùng luôn là người bấm áp dụng. Không hứa “chuẩn hóa 100%”.
   `AI nhận xét nhân viên` → `Gợi ý nhận xét`
5. **Không từ quảng cáo:** thông minh, toàn diện, cấp cao, đột phá, trung tâm, bách khoa toàn thư, siêu, hub, engine, cockpit, 100%.
6. **Nút: động từ + đối tượng, tối đa 3 từ.** `Tạo booking`, `Gửi duyệt`, `Thêm KOC`.
7. **Thông báo nói việc đã xảy ra.** Bắt đầu bằng “Đã”, không dấu chấm than, không kể lại quy trình.
   `Trưởng phòng đã chuyển đổi thành công 3 KOC… sang Booking Deals tác nghiệp!` → `Đã tạo 3 deal từ kế hoạch của Khánh Vy`
8. **Lỗi nói sai gì và sửa thế nào.** Không đổ lỗi, không xin lỗi, không viết hoa cả cụm.
   `Không có KOC nào ở trạng thái ĐÃ DUYỆT!` → `Kế hoạch chưa có KOC nào được duyệt. Duyệt ít nhất một KOC rồi thử lại.`
9. **Không emoji, không ký tự trang trí.** Dùng icon `lucide-react`, nét 1.75, cỡ 16px. Mũi tên trong câu dùng “→”.
10. **Không lộ chi tiết kỹ thuật.** Không ghi tên cơ sở dữ liệu, thư viện, kiểu dữ liệu.
    `Tự động đồng bộ với CSDL Supabase PostgreSQL` → `Cập nhật lúc 09:42`

### Thuật ngữ

Giữ nguyên tiếng Anh (team dùng hằng ngày, viết thường trừ viết tắt): KOC, booking, deal, brief, SKU, GMV, SLA, Brand PIC, livestream, Spark Ads, retainer, content pillar.

| Không viết | Viết |
|---|---|
| Dashboard, Overview | Tổng quan |
| Handoff | Bàn giao |
| Pipeline | Quy trình |
| Workload | Khối lượng việc |
| Plan | Kế hoạch |
| Lead (vai trò) | Trưởng phòng / Trưởng nhóm |
| Sample | Hàng mẫu |
| Cockpit | Việc của tôi |

### Trạng thái

Chỉ dùng 8 nhãn sau (có sẵn trong `STATUS` của `ui/index.tsx`):

| Nhãn | Tone | Khi nào | Thay cho |
|---|---|---|---|
| Nháp | neutral | Chưa gửi cho ai | Draft, Bản nháp, Đang soạn |
| Chờ duyệt | warning | Đã gửi, đang đợi người khác | Pending, Chờ phê duyệt, Đang trình duyệt |
| Cần sửa | critical | Bị trả lại, có ghi chú | Yêu cầu sửa, Rejected |
| Đã duyệt | positive | Được chấp nhận | Approved, ĐÃ DUYỆT, Đã chốt |
| Đang chạy | info | Đang thực hiện trong kỳ | Live, Đang triển khai, Active |
| Hoàn tất | positive | Đã nghiệm thu, đóng việc | Done, Nghiệm thu 100% |
| Quá hạn | critical | Vượt SLA | Overdue, Trễ hạn |
| Đã hủy | neutral | Dừng, không làm tiếp | Cancelled, Paused |

### Số liệu

Dùng hàm trong `src/lib/format.ts`, không tự viết `toFixed(1)}M`.

| Hàm | Ví dụ | Dùng ở |
|---|---|---|
| `formatVndShort(n)` | `280 tr` · `1,75 tỷ` | Ô chỉ số, tóm tắt, cột ngân sách |
| `formatVnd(n)` | `10.000.000 đ` | Hợp đồng, thanh toán, chỗ cần chính xác |
| `formatNumber(n)` | `12.450` | Số lượng |
| `formatPercent(r)` | `76,5%` | Tỷ lệ (truyền 0,765) |
| `formatDate(d)` | `08/10/2026` | Ngày |

---

## 7. Bố cục trang

- Thanh trên (`TopHeader`): tiêu đề trang là nhãn của màn đó trên menu trái của vai trò đang đăng nhập (`getNavLabelForRole` trong `Sidebar.tsx`), màn không có trên menu thì lấy `TAB_LABELS[activeTab]`. Đổi tên màn: sửa nhãn trong `Sidebar.tsx` và `TAB_LABELS`, không đặt tiêu đề riêng ở `page.tsx` + tối đa một nút chính (`PageActions`). Tuyệt đối không hiển thị dòng phụ đề giải thích dưới tiêu đề trang. Thanh trên và menu trái luôn đứng yên khi cuộn: thanh trên `sticky top-0`, menu trái `fixed`. Không đặt `overflow: hidden` lên `html`/`body` hay khung chứa thanh trên (làm hỏng `sticky`); cần chặn tràn ngang thì dùng `overflow-x: clip`.
- Nhóm màn hình cùng cụm nghiệp vụ (`NAV_GROUPS` trong `src/lib/navGroups.ts`): hiển thị 1 mục đại diện trên menu trái, đưa cụm `<Segmented>` chuyển màn hình trong nhóm lên thẳng `TopHeader` cạnh tiêu đề trang, và dành thanh `<Tabs>` bên dưới cho các phân mục con bên trong từng màn hình.
- Dưới thanh trên: bộ chọn kỳ (tháng/tuần) và thao tác phụ → `Tabs` → nội dung.
- Thao tác nằm cùng hàng với tab: truyền vào `Tabs actions={…}`, không tự xếp `Tabs` cạnh nút bằng `flex` (dãy tab bị nút đè). Trong `actions`: tối đa một `Button` primary + một `ActionMenu` cho phần còn lại. Màn mẫu: `ContentView.tsx`.
- Phía trên tab chỉ được một hàng chỉ số (`StatRow`, tối đa 4 ô, hoặc 8 ô trong mật độ dày) và chỉ khi các số đó dùng cho mọi tab. Hàng chỉ số nằm trên tab hoặc bảng dùng `StatRow size="sm"`. Không xếp chồng thẻ cảnh báo + thẻ chỉ số lớn + biểu mẫu trước nội dung chính: nội dung chính phải bắt đầu trong nửa trên màn 1440×900.
- Không thêm tiêu đề lớn thứ hai trong trang. Không thêm thẻ “giới thiệu phân hệ”.
- Lề trang `px-3 sm:px-4 lg:px-6`, khoảng cách giữa các khối `space-y-5`.
- Không hiển thị ô chọn chuyển đổi tài khoản / vai trò hay nút đăng xuất trùng lặp trên thanh trên (`TopHeader`) hoặc các màn hình nghiệp vụ; thông tin tài khoản và nút đăng xuất chỉ đặt tại chân menu trái (`Sidebar`).
- **Thiết kế đáp ứng thiết bị di động & máy tính bảng (Mobile & Tablet Responsive):**
  - **Khung nhìn & Vùng an toàn (`Viewport & Safe-Area`):** Cấu hình `viewportFit: "cover"`, `min-h-dvh` và đệm đáy `env(safe-area-inset-bottom)` trên `RootLayout`, `Sidebar`, `Modal` và `ToastStack`. Tự động áp dụng `font-size: 16px` cho ô nhập liệu trên màn hình cảm ứng `< 640px` để ngăn Safari iOS tự phóng to trang.
  - **Menu trái (`Sidebar`) & Thanh tiêu đề (`TopHeader`):** Trên màn hình `< 1024px` (`lg`), menu trái chuyển thành ngăn kéo trượt (`w-64 max-w-[85vw] z-50`), tự khóa cuộn nền (`overflow: hidden`), đóng khi bấm nền mờ hoặc phím `Escape`. Tiêu đề trang tự co chữ (`text-base sm:text-xl`) và các khe `PageHeaderNavSlot` / `PageActionsSlot` tự xuống dòng (`flex-wrap`) khi hẹp.
  - **Hàng chỉ số (`StatRow` & `Stat`):** Trên mobile hiển thị lưới 2 cột (`grid-cols-2 lg:grid-cols-4`), cỡ số `text-xl sm:text-[26px]` và tự ẩn `Sparkline` ở màn `< 640px` để con số tiền tệ lớn không bị cắt chữ.
  - **Thanh điều hướng & Bộ lọc (`Tabs`, `Segmented`, `Chips`, `FilterBar`):** Thanh `Tabs` có `actions` tự xếp dọc trên mobile (`flex-col sm:flex-row`); `Segmented` và `Chips` hỗ trợ cuộn ngang mượt (`max-w-full overflow-x-auto`); `SearchInput` trong `FilterBar` tự mở rộng `w-full sm:w-auto`.
  - **Bảng dữ liệu (`DataTable`) & Biểu mẫu (`Modal`):** Bảng ≥ 4 cột tự giữ `min-w-[480px]` / `min-w-[600px]` trên mobile kèm `overflow-x-auto overscroll-x-contain` để vuốt ngang mượt mà, trong khi trên máy tính (`lg:`+) tự động vừa khít khung nhìn (`lg:min-w-0`). Cột cố định phải (`stickyLast`) chỉ ghim từ `sm:` trở lên để không che khuất bảng trên điện thoại. Các lưới biểu mẫu đa cột luôn khai báo `grid-cols-1 sm:grid-cols-2` / `sm:grid-cols-3`.

---

### Mẫu tương tác

| Tình huống | Làm |
|---|---|
| Chuyển giữa các phần của một trang | `Tabs`. Tầng thứ hai dùng `Segmented`, không lồng `Tabs` |
| Lọc một danh sách | `FilterBar` trong `Panel` của bảng đó. ≤ 5 trạng thái: `Chips` hoặc `Segmented`; nhiều giá trị (gian hàng, ngành hàng): `Select` |
| Xem chi tiết một bản ghi | Bấm cả hàng (`onRowClick`) mở modal/trang chi tiết. Nút trong hàng chặn lan sự kiện |
| Sửa nhanh | `Modal` cỡ `md`/`lg`. Form dài hơn một màn hình → trang riêng |
| Xóa, từ chối, hủy | `ConfirmDialog`, có lý do nếu nghiệp vụ cần lưu vết |
| Sau khi lưu | Toast “Đã …”, đóng modal, giữ nguyên vị trí cuộn và bộ lọc |
| Danh sách rỗng | `EmptyState`: thiếu gì + việc tiếp theo + nút |
| Đang tải | Giữ khung bảng, hiện hàng giữ chỗ; không thay cả trang bằng vòng xoay |

### Màn danh sách

Áp dụng cho mọi màn liệt kê bản ghi (KOC, booking, hợp đồng, gian hàng…). Màn mẫu: Danh bạ KOC (`KocMasterDataView.tsx`).

1. **Một màn, một tên.** Tên trên menu trái, thanh trên và nút quay lại giống hệt nhau. Không thêm tiêu đề lớn thứ hai trong trang.
2. **Nút tạo mới là nút `primary` duy nhất, đặt trên thanh trên qua `PageActions`.** Không dành cả một hàng chỉ để chứa nút. Thao tác trên một bản ghi (đọc giấy tờ, cập nhật chỉ số) đặt trong hàng hoặc trong hồ sơ, không đặt ở đầu trang.
3. **Bộ lọc:** ô tìm kiếm + tối đa 3 ô chọn luôn hiện; phần còn lại vào nút “Lọc khác” (có số bộ lọc đang bật). Không lặp bộ lọc toàn cục của thanh trên (nhãn hàng). Nhãn viết kiểu câu, không đánh số. “Xóa bộ lọc” là nút `ghost`, chỉ hiện khi đang lọc. Số kết quả chỉ hiện khi đang lọc.
4. **Chip: mỗi nhóm một chiều.** Phân loại (loại hồ sơ) và việc cần xử lý (thiếu giấy tờ, nghi trùng) là hai nhóm `Chips` riêng, mỗi nhóm có nhãn. Chip dùng màu trung tính; số đếm trên chip tính theo các bộ lọc khác đang bật.
5. **Bảng:** tối đa 8 cột, mỗi ô tối đa 2 dòng (dòng 2 là `text-2xs text-ink-3`). Mỗi con số một cột riêng, căn phải. Tổng độ rộng cột phải vừa khung ở màn 1440px, không cuộn ngang.
6. **Màu trong ô chỉ đến từ `Status` (tối đa 1 `Status` trên mỗi dòng bảng, chỉ dành cho trạng thái quy trình chính của bản ghi).** Tuyệt đối không dùng `Status` hoặc hộp/pill tô nền (`px-* py-* rounded bg-*`) cho thông tin phân loại và thuộc tính (khung lương `KL1–KL7`, bậc KOC, phân khúc, vai trò, loại chiến dịch `Campaign`/`Duy trì`, hệ số gian hàng, mã hồ sơ/SKU, số lượng, thứ hạng, điểm đánh giá, mức chênh lệch). Tất cả hiển thị bằng chữ thường (`text-ink-2` / `text-2xs text-ink-3`, `font-code` cho mã, nối bằng ` · `).
7. **Bấm cả hàng để mở hồ sơ.** Trong hàng tối đa 1 nút hiện sẵn, còn lại vào `ActionMenu`. Nút chỉ có icon phải có `aria-label` và `title`.
8. **Dữ liệu nhạy cảm không vào danh sách.** CCCD, MST, số tài khoản, địa chỉ thường trú không có cột trong bảng (vẫn tìm được bằng ô tìm kiếm). SĐT chỉ hiện khi đó là thông tin làm việc chính của màn.
9. **Không hiện một con số ở hai nơi.** Tổng số đã có trên chip “Tất cả” thì không lặp ở đầu trang. Phân trang chỉ ở cuối bảng (`Pagination`).

### Màn hồ sơ một bản ghi

Màn mẫu: hồ sơ KOC (`components/koc/KocProfile.tsx`).

10. **Một bản ghi, một component hồ sơ.** Trang chi tiết và modal xem nhanh dùng chung component (`layout="page" | "modal"`), không sao chép.
11. **Hồ sơ không phải tab của danh sách.** Mở bằng cách bấm hàng; hồ sơ thay chỗ danh sách, nút “← {tên màn}” quay lại và giữ nguyên bộ lọc. Có ‹ › để chuyển bản ghi kế tiếp trong danh sách đang lọc.
12. **Đầu hồ sơ:** `Avatar` + tên + tối đa 2 `Status` (chỉ khi có vấn đề) → một dòng phân loại nối bằng “ · ” → một dòng chủ sở hữu (`Person`). Một nút `primary` bên phải. Không đóng khung, không xếp chồng nhiều tầng.
13. **Cảnh báo về bản ghi** (nghi trùng, thiếu giấy tờ) nằm ngay dưới đầu hồ sơ: nói trùng với ai, theo trường nào, và cho mở bản ghi kia. Nêu tối đa 3 tên, còn lại “và N hồ sơ khác”.
14. **Ưu tiên một trang cuộn hai cột thay vì tab.** Cột chính: thông tin để ra quyết định (chỉ số, lịch sử). Cột phụ 340px: thông tin tra cứu (liên hệ, pháp lý, ghi chú), chung một khung, các mục ngăn bằng đường kẻ. Chỉ thêm tab khi trang dài quá 3 màn hình; khi đó tối đa 3 tab, tên 1–2 từ, không đánh số, không tiếng Anh.
15. **Thao tác đặt cạnh dữ liệu nó thay đổi.** “Cập nhật chỉ số” ở đầu khối chỉ số, “Đọc ảnh giấy tờ” trong mục pháp lý.
16. **Mỗi khối chỉ số ghi thời điểm cập nhật** (“Cập nhật 13/10/2026”) hoặc “Chưa có ngày cập nhật”. Ô chỉ số không tô màu riêng; số qua `lib/format`.
17. **Dữ liệu nhạy cảm trong hồ sơ mặc định che** (`•••• 2194`). Nút “Hiện số” chỉ có với người được phép (quản trị, trưởng phòng, trưởng nhóm, PIC của chính bản ghi); người khác thấy câu nói ai xem được. Nút sao chép chỉ có sau khi hiện số.

### Danh sách kiểm tra cho mỗi màn hình (dán vào mô tả PR)

- [ ] Dùng `Toolbar` / `Tabs` / `Panel` / `DataTable` / `Modal` từ `ui`, không tự viết bảng hay modal
- [ ] Tối đa một nút `primary` mỗi vùng
- [ ] Trạng thái dùng `Status` với bộ 8 nhãn chuẩn
- [ ] Số tiền qua `lib/format`, người qua `Person`/`Avatar`, kênh qua `ChannelTag`
- [ ] Có trạng thái rỗng; không còn `alert`/`prompt`/`confirm`
- [ ] Câu chữ theo §6; không emoji
- [ ] Không có giá trị mẫu điền bằng `??` / `||` (§1.5)
- [ ] Màn danh sách / hồ sơ theo 17 quy tắc ở §7; CCCD, MST, STK được che
- [ ] Chuyển động theo §9: mỗi chuyển động nói lên một điều, dùng thành phần trong `ui/motion`, không tự viết keyframe; đã thử với “giảm chuyển động”
- [ ] `npx eslint <file>` không còn cảnh báo design system → thêm file vào danh sách “đã chuyển” trong `eslint.config.mjs`

## 8. Trạng thái chuyển đổi

**Đã chuyển một phần (xem `UI_SYNC_PLAN.md` §3.2 để biết số liệu lệch còn lại):** Toàn bộ `src/components/**/*.tsx` và `src/app/**/*.tsx` (23 màn hình chính, các tab con và toàn bộ hộp thoại) đã chuyển sang hệ thống token ngữ nghĩa và thành phần `ui/`, đồng thời bật kiểm tra `no-restricted-syntax` ở mức `error` trong `eslint.config.mjs`:

- **Khung ứng dụng & Xác thực:** `Sidebar.tsx` (thu gọn vừa 1 màn hình không cần cuộn chuột), `TopHeader.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`.
- **Tổng quan & Điều phối:** Việc của tôi (`CockpitView.tsx`), Tổng quan (`OverviewView.tsx`), Kế hoạch tháng (`MonthlyPlanHub.tsx`, `InputPlanBreakdownView.tsx`, `GrowthPlanBreakdownView.tsx`, `PlanApprovalStepper.tsx`, `PlanChatDrawer.tsx`, `PlanDiscussionHub.tsx`, `PlanHistoryModal.tsx`, `PlanSyncBadge.tsx`), Hồ sơ thương hiệu (`BrandProfilesView.tsx`, `components/brands/`), Hồ sơ gian hàng (`StoreManagementView.tsx`, `components/stores/`), Phân bổ & điều phối (`ManagerView.tsx`, `ManagerDelegationHub.tsx`, `EmployeePlanInspectorModal.tsx`, `AiStaffReviewModal.tsx`).
- **Triển khai:** Booking (`BookingView.tsx`, `MyPlanWorkspace.tsx`, `QuickBookModal.tsx`, `ImportExcelModal.tsx`, `StoreShortlistFilterModal.tsx`), Đề xuất KOC (`KocListingBatchHubView.tsx`), Danh bạ KOC (`KocMasterDataView.tsx`, `components/koc/`, `CreateKocModal.tsx`, `LegalOcrModal.tsx`, `KalodataSyncModal.tsx`), Kịch bản & video (`ContentView.tsx`, `ScriptReviewModal.tsx`), Góc tiếp cận (`ContentAngleSetupView.tsx`), Duyệt với nhãn hàng (`BrandView.tsx`, `CampaignCreateModal.tsx`), Sản phẩm đẩy (`PushProductsView.tsx`), Hợp đồng & thanh toán (`ContractManagementView.tsx`, `components/contracts/`), Hàng mẫu (`SampleTrackerView.tsx`).
- **Báo cáo & Quản trị:** Báo cáo hiệu suất (`ExecutiveDashboardReportsView.tsx`), Bảng xếp hạng (`LeaderboardView.tsx`), Báo cáo Ads tuần (`WeeklyAdsReportHubView.tsx`), Đánh giá 4P (`PerformanceP3View.tsx`), Dữ liệu gốc (`MasterDataHubView.tsx`, `MasterDataMindmapView.tsx`, `views/master-data/*`), Phân quyền (`CentralizedRbacHubView.tsx`, `ThirdPartyAccessSetupView.tsx`).
- **Nghiên cứu & Quét kênh:** Nghiên cứu thị trường (`BrandMarketResearchHubView.tsx`), Quét kênh & đối thủ (`TikTokCrawlerHubView.tsx`, `components/crawler/`).
- **Cổng đối tác:** Cổng nhãn hàng (`BrandHubView.tsx`), Cổng KOC (`KocKolHubView.tsx`), Cổng cộng tác viên (`SelfChannelCtvHubView.tsx`).

**Lưu ý bảo trì:**
- Mọi file mới trong `src/components/**/*.tsx` và `src/app/**/*.tsx` mặc định chịu kiểm tra `error` từ `eslint.config.mjs`.
- Hợp đồng in (`ContractModal.tsx`) giữ nguyên định dạng văn bản pháp lý.


---

## 9. Chuyển động

Chuyển động trong app phải **nói lên một điều**: số vừa đổi, phần tử đến từ đâu, thao tác đã xong. Chuyển động chỉ để trang trí là dấu hiệu của giao diện làm vội (“AI slop”) và không được dùng.

- Token: `--motion-*`, `--ease-*` trong [`src/app/globals.css`](src/app/globals.css)
- Thành phần và hook: [`src/components/ui/motion.tsx`](src/components/ui/motion.tsx), [`src/components/ui/toast.tsx`](src/components/ui/toast.tsx), export qua `@/components/ui`
- Kiểm tra tự động: biến `MOTION_CLASS` trong [`eslint.config.mjs`](eslint.config.mjs)

### Nguyên tắc

1. **Có nghĩa mới chuyển động.** Trước khi thêm, trả lời được câu “chuyển động này cho người dùng biết điều gì?”. Không trả lời được thì không thêm.
2. **Mỗi màn một khoảnh khắc lớn.** Ví dụ: số KPI lăn ở Báo cáo điều hành, dấu duyệt ở stepper, chuyển cảnh danh sách → hồ sơ. Phần còn lại im lặng.
3. **Không bắt người dùng chờ.** Thao tác bấm được ngay; dữ liệu không hiện chậm hơn vì hiệu ứng. Đi ra nhanh hơn đi vào.
4. **Nhất quán.** Chỉ dùng 4 thời lượng và 3 đường cong dưới đây. Không tự đặt `duration-300`, `ease-in-out`, `cubic-bezier(…)` trong màn hình.
5. **Nhẹ.** Ưu tiên `transform` và `opacity`. Không animate `width`/`height`/`top`/`left` trên nhiều phần tử, trừ thanh dữ liệu trong rãnh cố định (`.data-bar`). Danh sách dài chỉ animate khoảng 40 phần tử đầu.
6. **Tôn trọng “giảm chuyển động”.** `globals.css` đã tắt mọi hiệu ứng khi hệ điều hành bật `prefers-reduced-motion`. Code JS dùng `useReducedMotion()` / `prefersReducedMotion()`. Không vượt qua thiết lập này.

### Token

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--motion-fast` | 120ms | Phản hồi: rê chuột, nhấn, focus, đóng lớp nổi |
| `--motion-base` | 200ms | Mở lớp nổi (modal, menu), vạch chỉ báo trượt, chuyển màn |
| `--motion-slow` | 320ms | Chuỗi có thứ tự: duyệt bước, hàng bảng đổi chỗ, toast |
| `--motion-data` | 640ms | Số liệu: số lăn, thanh và cột biểu đồ |
| `ease-enter` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Phần tử xuất hiện, số liệu dừng lại |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Phần tử rời đi |
| `ease-move` | `cubic-bezier(0.65, 0, 0.35, 1)` | Phần tử đổi chỗ: vạch chỉ báo, hàng bảng |

Trong class: `duration-(--motion-base) ease-enter`. Trong JS (Web Animations API): `MOTION.base`, `MOTION.easeEnter`.

### Dùng gì cho tình huống nào

| Tình huống | Dùng | Ghi chú |
|---|---|---|
| Con số KPI, tổng tiền, số lượng | `NumberRoll`, hoặc truyền chuỗi/số vào `Stat` (tự lăn) | Chỉ chữ số thay đổi mới lăn. Mức chênh (`numeric` + `formatDelta`) **chỉ** khi dữ liệu cùng phạm vi được cập nhật (đồng bộ, nhập mới). Không hiện mức chênh khi đổi bộ lọc vì đó là so hai phạm vi khác nhau |
| Thanh tiến độ, ngân sách, thanh ngang trong biểu đồ | `Progress`, hoặc class `data-bar` trên phần tử có `style={{ width }}` | Mọc từ trái khi xuất hiện, chạy từ giá trị cũ sang mới khi bộ lọc đổi |
| Xu hướng nhỏ | `Sparkline` (đã có sẵn) | Đường được vẽ từ trái khi hiện; biến hình khi dữ liệu đổi |
| Mục đang chọn: menu trái, `Tabs`, `Segmented`, `Chips`, thanh tab riêng | `useActiveBox(ref, activeKey)` + `SlidingIndicator`; đánh dấu nút bằng `data-active` | Container `position: relative`. `fit="underline"` cho gạch chân. Nút chưa chọn để nền trong suốt để vạch trượt không bị che |
| Bảng sắp xếp/lọc lại | `DataTable` (đã bật sẵn); danh sách tự viết dùng `useFlipList(ref, orderKey)` + `data-flip` | Hàng còn lại trượt về chỗ mới, hàng mới hiện dần |
| Bước quy trình vừa hoàn tất | `StepMark` | Đóng dấu + vẽ dấu tích **chỉ khi** vừa đổi trong phiên; bước xong từ trước hiện tĩnh |
| Nhãn/khối vừa đổi trạng thái | `ChangeFlash on={giá trị}` | Hiện lại một lần, không chạy lần đầu |
| Mở/đóng modal | `Modal`, `ConfirmDialog` (đã có hiệu ứng mở và đóng) | Ưu tiên dùng hai thành phần này |
| Lớp nổi tự viết (`fixed inset-0`), drawer | `<Presence show={open}>{open && (…)}</Presence>`; khung trắng gắn `data-motion-panel`; drawer thêm `exit="drawer"` | Lớp phủ: `animate-in fade-in duration-(--motion-base)`. Khung: `animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter`; drawer: `animate-in slide-in-from-right duration-(--motion-slow) ease-enter`. Component tự trả `null`: `if (!open) return <Presence show={false} />` và bọc phần render bằng `<Presence show>`. Mẫu: drawer trong `PushProductsView.tsx` |
| Menu thả, popover | `animate-in fade-in zoom-in-95 duration-(--motion-fast) ease-enter` + `origin-*` đúng góc mở | Lấy theo `ActionMenu` |
| Thông báo sau thao tác | `showToast(message, type)` → `ToastStack` | Xếp chồng, rê chuột để xoè và dừng đếm giờ |
| Danh sách → hồ sơ một bản ghi | Hàng: `<span {...sharedFrom('koc-avatar', id)}>`. Đầu hồ sơ: `style={sharedTo('koc-avatar')}`. Mở: `openShared(id, () => setOpenId(id))`. Quay lại: `closeShared(id, () => setOpenId(null))` | Ảnh và tên bay từ hàng bảng lên đầu hồ sơ và ngược lại. Mẫu: hồ sơ thương hiệu, KOC, gian hàng. Mỗi tên chỉ dùng cho một phần tử đang hiện |
| Đang tải | `Skeleton`, `SkeletonRows`, `DataTable loading`; màn tải theo nhu cầu dùng `ViewLoading` trong `app/page.tsx` | Giữ hình dạng nội dung sắp hiện. Vòng xoay (`animate-spin`) chỉ cho nút hoặc tác vụ đang xử lý (đồng bộ, đọc giấy tờ, gửi tin) |

### Không dùng

| Không làm | Vì sao | Thay bằng |
|---|---|---|
| Mọi khối fade-up so le khi vào trang | Trang trí, làm dữ liệu hiện chậm | Màn đã có `workspace-reveal` chung; không thêm |
| View Transition cho mọi lần chuyển màn | Trùng với `workspace-reveal`, chụp ảnh cả trang mỗi lần bấm menu | Chỉ dùng View Transition khi có phần tử bay giữa hai trạng thái (danh sách → hồ sơ) |
| `hover:scale-*`, card nổi lên khi rê chuột | Không cho biết điều gì, làm bảng rung | Đổi nền `hover:bg-canvas` / viền |
| `animate-bounce`, `animate-ping`, `animate-pulse`, hiệu ứng nảy (spring/elastic) | Gây xao nhãng, trông như đồ chơi | Màu trạng thái tĩnh (`Status`) |
| Chuyển động lặp liên tục | Chiếm sự chú ý vô thời hạn | Chỉ `Skeleton` và `animate-spin` khi đang tải, tắt khi xong |
| Gradient trôi, glow, viền phát sáng, glassmorphism, `backdrop-blur` trên vùng lớn | Ngoài phong cách, tốn GPU | Nền phẳng, `shadow-*` của lớp nổi |
| Typewriter, parallax, số đếm từ 0 mỗi lần lọc | Bắt người dùng chờ để đọc số | `NumberRoll` (chỉ chữ số đổi mới lăn) |
| `transition-all`, `duration-500` trở lên, `ease-in-out` | Animate cả thuộc tính không cần, chậm, thiếu nhất quán | `transition-colors` / `transition-transform` + token |

ESLint chặn `hover:scale-*`, `group-hover:scale-*`, `animate-bounce|pulse|ping`, `duration-500|700|1000`, `ease-in-out` trong `className`.

### Thêm chuyển động mới

1. Kiểm tra bảng “Dùng gì” ở trên. Phần lớn trường hợp đã có thành phần.
2. Nếu thật sự cần kiểu mới: thêm keyframe/class vào khối **CHUYỂN ĐỘNG** cuối `globals.css` (dùng token, có nhánh `prefers-reduced-motion`), thêm thành phần/hook vào `ui/motion.tsx`, rồi thêm một dòng vào bảng trên.
3. Không viết `@keyframes`, `style={{ transition }}` hay `element.animate()` trực tiếp trong file màn hình.
4. Tự kiểm tra: bật “Reduce motion” trong hệ điều hành (Windows: Settings → Accessibility → Visual effects → Animation effects), mở màn và xác nhận mọi thứ vẫn hiện đúng, chỉ không chuyển động.
