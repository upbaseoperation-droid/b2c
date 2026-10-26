# Upbase B2C - Hướng Dẫn & Quy Tắc Vận Hành Trợ Lý (GEMINI.md)

## 1. Ngôn Ngữ, Giao Diện & Quy Chuẩn Design System
- **Tham chiếu bắt buộc:** Mọi màn hình, bảng biểu, hộp thoại đều phải tuân thủ nghiêm ngặt [`web-admin/DESIGN_SYSTEM.md`](web-admin/DESIGN_SYSTEM.md) và nhập thành phần từ `@/components/ui`.
- **Thành phần dựng trang chuẩn:**
  - Bảng dữ liệu: Dùng `<DataTable>`, `<FilterBar>`, `<Pagination>`, `<ActionMenu>`; không tự viết thẻ `<table>` thô.
  - Khung & Khối: Dùng `<Panel>`, `<StatRow>` / `<Stat>` (tối đa 4 chỉ số đầu trang), `<EmptyState>` khi không có dữ liệu.
  - Tác vụ & Hộp thoại: Dùng `<Modal>` (tác vụ ngắn), `<ConfirmDialog>` (xác nhận xóa/hủy/duyệt); `<Button>` tối đa 1 nút `primary` cho mỗi vùng. Phân biệt rõ props: `<Modal open onClose={...}>` và `<ConfirmDialog open onCancel={...} onConfirm={...}>`.
  - Định danh & Trạng thái: Dùng `<Person>` / `<Avatar>` cho nhân sự; `<ChannelTag>` / `<ChannelBar>` cho kênh/sàn; `<Status>` cho trạng thái nghiệp vụ.
- **Hệ màu Token ngữ nghĩa (Cấm tự bịa màu Tailwind):**
  - Chỉ dùng class token: `bg-canvas`, `bg-surface`, `bg-sunken`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-line`, `border-line-strong`.
  - Màu nhấn chính: Nút chính dùng than đen `primary` (`#2B2B2B`), liên kết và tiến độ dùng xanh mực `accent` (`#24457A`).
  - Màu trạng thái: `positive` (đã duyệt/hoàn tất), `warning` (chờ duyệt/sắp hạn), `critical` (vượt trần/quá hạn/lỗi). Màu kênh chỉ dùng cho biểu đồ, không thay thế màu trạng thái.
  - Tuyệt đối CẤM: gradient, bóng màu (`shadow-blue-...`), màu tím (`purple`), hồng (`pink`), xanh ngọc (`cyan`) và nền tối cho khối nội dung.
- **Font chữ, cỡ chữ & Từ ngữ nghiệp vụ:**
  - Font Be Vietnam Pro; cỡ chữ tối thiểu 12px (`text-2xs`), cấm dùng `text-[9-11px]`; không viết hoa toàn bộ (`uppercase`) tiêu đề cột.
  - Dùng từ ngữ nghiệp vụ đời thực (Tải ảnh giấy tờ, Đọc ảnh CCCD, Soạn hợp đồng, Duyệt chi, Mã QR).
  - CẤM từ ngữ buzzword/quảng cáo: "AI", "Trí tuệ nhân tạo", "Smart", "OCR AI", "1-chạm", "Siêu tốc", "Đột phá", "Toàn diện", "Live dynamic binding".
  - CẤM tuyệt đối dòng chữ giải thích/phụ đề xám (`subtitle`, `description`, `hint`) bên dưới tiêu đề Trang (`TopHeader`), Khung (`Panel`), Hộp thoại (`Modal`), Khối (`SectionHeader`) hoặc dưới ô nhập (`Field`).
- **Giao tiếp:** Trả lời ngắn gọn, thẳng thắn, không liệt kê hoa mỹ, không dùng giọng điệu robot hay marketing quảng cáo.

## 2. Tiêu Chuẩn Kỹ Thuật, Kiến Trúc Next.js & Độc Lập Môi Trường
- **Kiểm tra bắt buộc trước khi báo cáo:** Chạy `npm run typecheck` (`tsc --noEmit`) và `npm run build`. Đảm bảo mã nguồn TypeScript sạch sẽ, 0 lỗi type.
- **Ranh giới Server vs Client (Next.js 16 / React 19):**
  - Mọi component có hook (`useState`, `useEffect`, `useCallback`) hoặc tương tác DOM bắt buộc có `'use client'` ở dòng đầu tiên.
  - Tuyệt đối KHÔNG import module server (`node:fs`, `node:crypto`, `prisma`, `@/lib/server/*`) vào Client Component.
- **Cơ chế Fallback bền vững (Zero-Crash Standalone):**
  - Mọi API route hoặc dịch vụ đọc Database (Prisma) hoặc File nhị phân (mẫu Word `.docx`) BẮT BUỘC phải có nhánh xử lý dự phòng đọc từ Snapshot tĩnh / In-Memory cache (`OFFICIAL_TEMPLATES_SNAPSHOT`, mock store) khi thiếu biến môi trường `DATABASE_URL` hoặc thiếu file vật lý trên đĩa.
  - Không để hệ thống bị sập (lỗi 500/503) hoặc đứt gãy kiểm thử khi chạy ở chế độ độc lập / local dev.

## 3. Quy Chuẩn Vận Hành, Thẩm Quyền & Định Dạng Số Liệu B2C
- **Phân cấp thẩm quyền phê duyệt phòng B2C:**
  - **Cấp Tổng Giám Đốc (CEO) — Đỗ Văn Giang:** Phê duyệt chiến lược toàn hệ thống, bảo trợ nguồn lực và ký duyệt cấp cao nhất.
  - **Cấp Giám Đốc Marketing (Lead B2C) — Đặng Thị Yến Nhi:** Quản lý trần PnL/ngân sách toàn bộ 69 gian hàng B2C, ký duyệt kế hoạch tháng và đại diện ký biên bản 4 bên.
  - **Cấp Trưởng Nhóm (Leader) — Nguyễn Thị Ngọc Tâm:** Phụ trách nhóm 8 gian hàng trọng điểm theo Cột 55 File 4.1.1 (ClubClio TikTok/Shopee, Cindy Bloom, Mine, EUPC, L'Occitane, Bye Bye Blemish, Rejuran).
  - **Quy tắc gian hàng không có Leader:** Các gian hàng còn lại (Shopee và TikTok khác) không có chức danh Leader trung gian. Chuyên viên thực thi (PIC) chủ động lập phân rã và trình duyệt trực tiếp lên Giám Đốc Marketing (`Đặng Thị Yến Nhi`).
- **Phân cấp quản trị Thương hiệu vs Gian hàng:**
  - Một Brand sở hữu nhiều gian hàng trên các sàn (`TikTok`, `Shopee`, `Lazada`...). Hạn mức Order được phân bổ chi tiết theo từng gian hàng nhưng phải tuân thủ định mức chung của Brand.
  - Phạm vi B2C: Chỉ tính các gian hàng có `B2C phụ trách = 1` (Cột 25 File 4.1). Tách bạch rõ **Chi phí Gross** và **Chi phí Net** (Kế toán kiểm soát theo hạn mức Net); tách riêng **Video trả phí**, **Suất gửi mẫu FOC**, **Video Affiliate**, **Kênh Brand** và **Livestream**.
- **Quy chuẩn Định dạng & Bảo mật Dữ liệu B2C:**
  - **Tiền tệ:** Luôn là **số nguyên VND** (không có số thập phân lẻ `.00`), định dạng qua `Intl.NumberFormat('vi-VN')`.
  - **Tỷ lệ & Hiệu số:** Mọi phép tính chia tỷ lệ hoàn thành / ROI bắt buộc chặn mẫu số bằng 0 (`denominator === 0 ? 0 : ...`) để tránh văng `NaN` hoặc `Infinity` lên giao diện.
  - **Ngày tháng:** Chuẩn Việt Nam `DD/MM/YYYY` hoặc `YYYY/MM` (giờ VN UTC+7), cấm dùng chuẩn Mỹ `MM/DD/YYYY`.
  - **Bảo vệ dữ liệu nhạy cảm (Data Masking):** Số CCCD, Số tài khoản ngân hàng và Số điện thoại của KOC trên các bảng danh sách công cộng phải được che mờ (chỉ hiển thị 4 số cuối: `****5678`), chỉ mở đầy đủ khi có quyền Kế toán / Pháp chế mở xem chi tiết.
  - **Cảnh báo tài chính:** Báo động đỏ ngay khi phát sinh chi phí vượt trần (Overbudget) hoặc gian hàng có chi phí nhưng hạn mức ghi nhận 0đ (Unbudgeted Spend).

## 4. Quy Tắc Phòng Ngừa Lỗi Hệ Thống (`blueprint/governance/KNOWN_BUGS_AND_LESSONS.md`)
- **`RULE-DATA-01` (Cấm sinh trạng thái giả bằng hàm băm / ngẫu nhiên):** Tuyệt đối KHÔNG dùng `hash % N`, `Math.random()` hay `|| true` để hiển thị dấu tích (`✓`) hoặc trạng thái nghiệp vụ. Chỉ hiển thị khi trường dữ liệu thực tế có giá trị hợp lệ; nếu trống hiển thị `—` hoặc `Chưa xác nhận`.
- **`RULE-SYNC-01` (Đồng bộ 100% giữa Bảng danh sách và Màn chi tiết):** Cột trạng thái trên bảng danh sách (`DataTable`) và thông tin trong trang chi tiết (`Profile` / `Modal`) phải đọc từ cùng một hàm kiểm tra / cùng một nguồn dữ liệu gốc duy nhất.
- **`RULE-UX-01` (Cấm tự động tích xác nhận ứng viên độ tin cậy thấp):** Khi dò tìm hoặc gợi ý dữ liệu tự động, chỉ điền sẵn kết quả có độ tin cậy `CAO` / `TRUNG_BÌNH` đã xác thực tồn tại; mức `GỢI_Ý` chỉ hiển thị để người dùng chủ động chọn.
- **`RULE-PERF-01` (Tối ưu truy xuất & Cấm quét $O(N \times M)$ trên luồng render):** Với bảng dữ liệu lớn (69 gian hàng, >16.000 deals), bắt buộc dùng `useMemo`, `WeakMap` hoặc index `Map` $O(1)$. Tuyệt đối không lặp lồng mảng `.filter().reduce()` trực tiếp trong thân hàm render JSX.
- **`RULE-API-01` (Quản lý tập trung Cấu hình API & Prompt):** Mọi tính năng phân tích/đánh giá AI mới phải đăng ký mục đích nghiệp vụ tại `web-admin/src/lib/apiKeyConfig.ts` và thiết lập Prompt tập trung tại `ApiKeySetupView.tsx`. Không hiển thị nút/khung chỉnh sửa Prompt trên màn hình nghiệp vụ của người dùng cuối. Luôn có nhánh dự phòng `INTERNAL` tại `/api/integrations/llm/route.ts`.
- **`RULE-API-02` (Cấm tự động gọi API mô hình / cào dữ liệu khi mở màn hình):** Tuyệt đối KHÔNG gọi API phân tích / thu thập dữ liệu bên trong `useEffect` khi vừa mở Modal/Drawer. Chỉ được phép gọi API khi người dùng bấm nút hành động tường minh.

## 5. Đồng Bộ Tài Liệu & Định Tuyến Mô Hình (Model Routing)
- **Đồng bộ Tài liệu & Mã nguồn trong cùng một lượt:** Khi sửa đổi luồng nghiệp vụ, thêm API, đổi quyền hay đổi giao diện, BẮT BUỘC cập nhật đồng bộ các tài liệu tương ứng tại `blueprint/2-design/`, `blueprint/README.md` và `web-admin/README.md`. Tuyệt đối không để tài liệu lệch pha với code thực tế.
- **Tối ưu Token & Định tuyến Mô hình khi điều phối Task:**
  - Tác vụ tra cứu, đọc file, cập nhật doc, gỡ lỗi cú pháp, chạy `tsc` và `build`: Sử dụng model nhẹ, tốc độ cao (`flash` hoặc `flash_lite`).
  - Tác vụ phân rã kiến trúc phức tạp, thiết kế giải pháp mới hoặc nghiệm thu `git diff` quan trọng trước khi xuất xưởng: Sử dụng model thông minh (`inherit` hoặc `pro`).
