# Upbase Ops Design System

Quy chuẩn giao diện và từ ngữ cho `web-admin`. Áp dụng cho mọi màn hình mới và mọi lần sửa màn hình cũ.

- Token: [`src/app/globals.css`](src/app/globals.css), khối `@theme`
- Thành phần: [`src/components/ui/index.tsx`](src/components/ui/index.tsx)
- Định dạng số: [`src/lib/format.ts`](src/lib/format.ts)
- Kiểm tra tự động: quy tắc `no-restricted-syntax` trong [`eslint.config.mjs`](eslint.config.mjs)

Thứ tự ưu tiên khi có mâu thuẫn: yêu cầu của người dùng → file này → thói quen của code cũ.

---

## 1. Nguyên tắc

1. **Dữ liệu là nhân vật chính.** Bảng, con số và trạng thái nằm ở màn hình đầu. Không mở trang bằng banner giới thiệu, thẻ giải thích vai trò hay khẩu hiệu.
2. **Một điểm nhấn mỗi vùng.** Một màu nhấn, một nút chính, một con số quan trọng. Màu chỉ dùng để báo trạng thái, không dùng để phân biệt phân hệ.
3. **Khoảng trắng thay đường viền.** Nhóm nội dung bằng khoảng cách và tiêu đề. Chỉ đóng khung khi khối đó thao tác được độc lập (bảng, form). Không lồng khung trong khung.
4. **Nói như đồng nghiệp.** Câu ngắn, viết hoa kiểu câu, đúng từ team dùng hằng ngày. Không quảng cáo, không cảm thán, không emoji.

---

## 2. Màu

Dùng **token ngữ nghĩa** trong code mới. Tailwind sinh class từ token: `bg-surface`, `text-ink-3`, `border-line`, `bg-accent`, `text-critical`…

| Token | Giá trị | Dùng cho |
|---|---|---|
| `canvas` | `#F5F5F3` | Nền trang, nền hàng khi rê chuột |
| `surface` | `#FFFFFF` | Bảng, menu trái, modal, ô nhập |
| `sunken` | `#EFEFEC` | Mục menu đang chọn, nền nhãn trung tính, segmented control |
| `line` | `#E3E3DE` | Đường kẻ bảng, viền khung |
| `line-strong` | `#CFCFC8` | Viền ô nhập, nút phụ |
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
| Tiêu đề trang (thanh trên) | `text-lg font-semibold` | 18/28 · 600 |
| Con số trong ô chỉ số | `text-[26px] font-semibold` | 26/32 · 600 |
| Tiêu đề khối | `text-base font-semibold` | 16/24 · 600 |
| Nội dung | `text-sm` | 14/22 · 400 |
| Ô bảng, nội dung dày | `text-xs` | 13/20 · 400 |
| Nhãn, chú thích | `text-2xs text-ink-3` | 12/18 · 400–500 |

Quy tắc:
- **Cỡ nhỏ nhất là 12px** (`text-2xs`). Không dùng `text-[9px]`, `text-[10px]`, `text-[11px]`.
- Chỉ 3 độ đậm: `font-normal`, `font-medium`, `font-semibold`. Không dùng `font-bold` trở lên.
- Không viết hoa toàn bộ (`uppercase`), kể cả tiêu đề cột và tên nhóm menu. Không giãn chữ (`tracking-wider`).

---

## 4. Khoảng cách, bo góc, đổ bóng

**Khoảng cách** theo bội số 4: `1` (4px) icon–chữ · `2` (8px) giữa các nút · `3` (12px) đệm dọc ô bảng · `4` (16px) đệm khung · `6` (24px) giữa các khối · `8` (32px) lề trang.

**Bo góc**, chỉ 3 mức:

| Class | Giá trị | Dùng cho |
|---|---|---|
| `rounded`, `rounded-sm` | 4px | Nhãn trạng thái, ô mã |
| `rounded-md`, `rounded-lg` | 6px | Nút, ô nhập, mục menu |
| `rounded-xl`, `rounded-2xl` | 10px | Bảng, modal, khung |
| `rounded-full` | | Chỉ ảnh đại diện và chấm trạng thái |

**Đổ bóng:** thẻ và bảng không có bóng, chỉ có viền `border-line`. `shadow-sm` trở xuống đã được tắt. Chỉ lớp nổi (menu thả, popover, modal, toast) dùng `shadow-md`, `shadow-xl`, `shadow-2xl`.

**Chuyển động:** chỉ dùng khi có nghĩa (đang tải: `animate-spin`; mở modal: `animate-in`). Không dùng `animate-pulse`, `animate-bounce`, `animate-ping` để trang trí.

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
| `Stat`, `StatRow` | Hàng chỉ số đầu trang | Tối đa 4 ô. Ghi chú nói ý nghĩa của con số, không lặp lại nhãn |
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
| `Toolbar` | Hàng ngay dưới tiêu đề trang | Trái: chọn kỳ, bộ lọc nhanh. Phải: thao tác, tối đa 1 nút `primary` |
| `Panel` | Khung chứa bảng, form | Tiêu đề + mô tả một dòng + thao tác. `flush` cho bảng |
| `FilterBar`, `SearchInput`, `Chips` | Lọc một bảng | Đặt ngay trên bảng, trong `Panel`. Ô tìm kiếm trái, ô chọn phải, chip trạng thái hàng dưới, số kết quả cuối hàng. Chip có số đếm |
| `DataTable` | Mọi bảng dữ liệu | Khai báo cột (`header`, `render`, `align`, `width`). Số căn phải. Có `empty` (dùng `EmptyState`). `stickyLast` khi cột cuối là thao tác. `onRowClick` khi cả hàng mở chi tiết |
| `Modal` | Tác vụ ngắn: sửa một bản ghi, bàn giao | Đóng bằng Esc/X/bấm ngoài. Chân: “Hủy” (ghost) rồi nút chính. Tiêu đề là động từ + đối tượng (“Cập nhật job BO…”) |
| `ConfirmDialog` | Thao tác không hoàn tác được, hoặc cần lý do | Thay cho `alert`, `confirm`, `prompt` (ESLint chặn ở màn đã chuyển). `tone="danger"` cho từ chối, xóa, hủy |
| `Field`, `Input`, `Select`, `Textarea` | Mọi form | Nhãn ở trên. `hint` giải thích, `error` nói cách sửa. Lựa chọn ≤ 3 dùng `Segmented`, nhiều hơn dùng `Select` |

Toast: dùng `showToast(message, type)` trong `app/page.tsx`. Nền `ink`, chữ trắng, icon theo loại.

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

- Thanh trên: tiêu đề trang (khớp tên trên menu) + mô tả một dòng nếu cần + tối đa một nút chính.
- Dưới thanh trên: bộ chọn kỳ (tháng/tuần) và thao tác phụ → `Tabs` → nội dung.
- Không thêm tiêu đề lớn thứ hai trong trang. Không thêm thẻ “giới thiệu phân hệ”.
- Lề trang `px-4 sm:px-6 lg:px-8`, khoảng cách giữa các khối `space-y-6`.
- Ô chọn vai trò ở thanh trên chỉ hiện khi chạy dev, hoặc khi đặt `NEXT_PUBLIC_ENABLE_ROLE_SWITCHER=1`.

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

### Danh sách kiểm tra cho mỗi màn hình (dán vào mô tả PR)

- [ ] Dùng `Toolbar` / `Tabs` / `Panel` / `DataTable` / `Modal` từ `ui`, không tự viết bảng hay modal
- [ ] Tối đa một nút `primary` mỗi vùng
- [ ] Trạng thái dùng `Status` với bộ 8 nhãn chuẩn
- [ ] Số tiền qua `lib/format`, người qua `Person`/`Avatar`, kênh qua `ChannelTag`
- [ ] Có trạng thái rỗng; không còn `alert`/`prompt`/`confirm`
- [ ] Câu chữ theo §6; không emoji
- [ ] `npx eslint <file>` không còn cảnh báo design system → thêm file vào danh sách “đã chuyển” trong `eslint.config.mjs`

## 8. Trạng thái chuyển đổi

**Màn mẫu:** Booking (`BookingView.tsx`) đã chuyển hoàn toàn: 3 bảng dùng `DataTable`, bộ lọc dùng `FilterBar`/`Chips`/`Select`, 2 modal dùng `Modal`, `prompt()`/`alert()` thay bằng `ConfirmDialog`. File giảm từ 1.868 xuống 1.098 dòng. Dùng màn này làm mẫu khi chuyển các màn khác.

**Đã chuyển hẳn sang design system:** khung app (menu trái, thanh trên, toast), trang đăng nhập, Tổng quan (hàng chỉ số, giá trị deal theo kênh), Phân bổ & điều phối (thanh công cụ, bảng nhãn hàng có ảnh đại diện PIC), đầu trang Booking và kế hoạch cá nhân, Kế hoạch tháng (chỉ số có xu hướng, thẻ kế hoạch có thanh kênh). Ảnh đại diện và nhãn kênh đã áp dụng ở Hiệu suất nhân sự, Đánh giá 4P, Việc của tôi, Dữ liệu gốc, Gian hàng.

**Đã áp dụng tự động cho toàn bộ app:** màu (qua bảng màu Tailwind được ánh xạ), font, cỡ chữ tối thiểu 12px, độ đậm, bo góc, đổ bóng, bỏ gradient, bỏ emoji, bỏ hiệu ứng nhấp nháy, viết hoa kiểu câu cho chữ hiển thị, bỏ chú thích tiếng Anh trong ngoặc, định dạng tiền tệ.

**Còn lại:**
- Các view còn dùng class màu Tailwind trực tiếp thay vì token ngữ nghĩa và thành phần `ui/`. ESLint báo các chỗ này ở mức cảnh báo.
- Lớp tương thích “LỚP TƯƠNG THÍCH CŨ” cuối `globals.css` vẫn cần cho các khối từng viết theo nền tối. Xóa khi không còn class `bg-slate-900`, `bg-[#0…]` trên khối nội dung.
- Giá trị trạng thái trong dữ liệu mẫu (`lib/mockData.ts`, `lib/types.ts`) vẫn viết hoa mọi chữ vì được so sánh trong code. Khi có API thật, map sang bộ 8 trạng thái ở trên khi hiển thị.
- Hợp đồng in (`ContractModal.tsx`) giữ nguyên định dạng văn bản pháp lý.

Thứ tự chuyển các màn còn lại (dùng nhiều trước): Kế hoạch tháng → Phân bổ & điều phối → Hợp đồng & thanh toán → Kịch bản → Hàng mẫu → các màn còn lại.

Thứ tự đề xuất khi chuyển một view: thay tab/nút bằng `Tabs`/`Button` → thay nhãn trạng thái bằng `Status` → thay class màu bằng token → bỏ khung lồng khung → chạy `npx eslint <file>` đến khi hết cảnh báo design system.
