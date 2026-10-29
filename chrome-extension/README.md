# Upbase B2C — Tiện Ích Phân Tích KOC, Bóc Tách Kịch Bản & Nghiệm Thu Đa Nền Tảng (v1.4.0)

> **Đơn vị phát triển:** **Hệ thống Upbase B2C Operations**

## Giới thiệu mở đầu

**Upbase B2C Extension** là công cụ chuyên dụng dành cho đội ngũ Booking (PIC), Content và Vận hành thương mại điện tử đa sàn (**TikTok, Douyin, Instagram, Threads, Facebook & Reels**). Tiện ích hỗ trợ đọc trực tiếp số liệu thực tế ngay trên trang kênh của KOC, gắn nhãn nhận diện bài gắn giỏ hàng, bóc tách lời thoại và cấu trúc kịch bản hàng loạt, tải video không logo và đồng bộ nghiệm thu trực tiếp về hệ thống **Upbase B2C Web-Admin**.

---

## 1. Cấu trúc thư mục

- [`e:\Upbase\B2C\chrome-extension\`](file:///e:/Upbase/B2C/chrome-extension): Bản Chrome Extension chính thức của **Upbase B2C (v1.4.0)** tuân thủ nghiêm ngặt [`DESIGN_SYSTEM.md`](file:///e:/Upbase/B2C/web-admin/DESIGN_SYSTEM.md) (Font Be Vietnam Pro, hệ màu ngữ nghĩa, tiền tệ nguyên VND, bảo mật che mờ CCCD/SĐT/STK `****5678`).
- **Kiến trúc Dữ liệu tập trung (Database Centric):** Toàn bộ dữ liệu lịch sử của hơn 5.020 KOC và lịch sử Booking chi tiết đã được chuyển về lưu trữ tập trung tại cơ sở dữ liệu máy chủ backend ([`web-admin/src/lib/kocHistoricalDatabase.ts`](file:///e:/Upbase/B2C/web-admin/src/lib/kocHistoricalDatabase.ts)), hoàn toàn không lưu trên máy client Extension để bảo mật thông tin nội bộ và tối ưu kích thước gói cài đặt chỉ còn ~185 KB.
- [`e:\Upbase\B2C\chrome-extension\Upbase-B2C-ChromeWebStore-v1.4.0.zip`](file:///e:/Upbase/B2C/chrome-extension/Upbase-B2C-ChromeWebStore-v1.4.0.zip) & [`web-admin/public/Upbase-B2C-Extension-v1.4.zip`](file:///e:/Upbase/B2C/web-admin/public/Upbase-B2C-Extension-v1.4.zip): File nén đóng gói sẵn chuẩn Chrome Web Store để triển khai hoặc gửi nhanh qua Lark / Zalo cho nhân sự trong phòng cài đặt.
- [`e:\Upbase\B2C\chrome-extension\updog-mod\`](file:///e:/Upbase/B2C/chrome-extension/updog-mod): Bản giải nén tích hợp cầu nối đồng bộ (`upbase-bridge.js`) về hệ thống Upbase B2C.

## 2. Chi tiết các nhóm tính năng nghiệp vụ (v1.4.0)

### A. Nhóm tính năng MIỄN PHÍ, PRO & SUPER VIP trên Tab Kênh (`metrics`)
1. **Sub-tab `Bài đăng` (Xem, Nhãn trên lưới & Sắp xếp lưới):**
   - **Điều khiển trình phát (Xem):** Tự cuộn sang video kế tiếp khi hết bài (`Tự cuộn`), giữ phát nền khi chuyển tab (`Phát nền`), chọn tốc độ phát (`0.75x` – `2.0x`), bộ lọc từ khóa nội dung và lọc theo ngày đăng.
   - **Nhãn số liệu & Nhãn chữ PRO trực tiếp trên từng thẻ của lưới TikTok/Douyin (`.ub-GridCardOverlay`):** Hiển thị trực tiếp lượt xem, thích, bình luận, lượt lưu (`saves`), ngày đăng, tốc độ tăng trưởng (`view/h`), nút `Tải MP4` nhanh, cùng các nhãn đánh giá bằng chữ tiếng Việt: `Bài nổi bật`, `Đang tăng nhanh`, `Tương tác bất thường`, `Gắn giỏ Shop`, `Quảng cáo`.
   - **Sắp xếp lưới trực tiếp trên trang:** Sắp xếp lại các thẻ video trên trang TikTok/Douyin theo `View cao`, `Tim cao`, `ER cao`, `Tăng nhanh (view/h)`, hoặc lọc `Chỉ bài gắn giỏ`.
   - **Độ bão hòa ngách trên trang Tìm kiếm (`/search`):** Tự động tính tỷ lệ bài gắn giỏ Shop (%), View trung bình ngách, mức độ cạnh tranh bằng chữ và danh sách KOC nổi bật trong ngách.
   - **Báo cáo Tóm tắt Kênh (PDF/PNG):** Nút `Báo cáo PDF` mở trang tổng hợp chuẩn in ấn gồm Điểm KOC (`0–100`), Sức khỏe kênh, Giờ vàng, Mặt hàng chủ lực và Bảng phân tích bài đăng.
2. **Sub-tab `Giờ · Tag · Nhạc` (PRO):**
   - Thống kê khung giờ đăng bài hiệu quả nhất (Giờ VN `UTC+7`), bảng hiệu quả theo từng `Hashtag`, danh sách `Âm thanh / Nhạc nền` kèm nút **`Tải MP3`** từng bài, và bảng lượt xem gom theo từng **Ngày đăng**.
3. **Sub-tab `Mặt hàng & Shop` (MIỄN PHÍ + SUPER VIP):**
   - **Chấm điểm Mặt hàng từ Link hoặc Product ID (`SCORE_PRODUCT_SUPER_VIP`):** Dán link sản phẩm TikTok Shop hoặc mã Product ID để lấy **Giá bán**, **Hoa hồng ước tính (% & VND/đơn)**, **Số lượng đã bán**, **Tốc độ bán/ngày**, **Tồn kho ước tính**, **Điểm mặt hàng (`0–100`)**, **Mức cạnh tranh bằng chữ** (`Cạnh tranh thấp / vừa / cao`) và liên kết tìm nhanh sang **TikTok Shop, Shopee, Lazada**.
   - **Quét tài khoản theo mặt hàng & Gom theo Shop:** Đếm chính xác mỗi mặt hàng được kênh làm bao nhiêu bài, tổng view mang lại, gom nhóm theo từng **Gian hàng (Shop)** và xuất file **CSV/Excel (`Xuất CSV Mặt hàng & Shop`)**.
4. **Sub-tab `Theo dõi & Hoa hồng` (Affiliate Hub - PRO):**
   - **Theo dõi kênh đối thủ / KOC trên máy (`localStorage`):** Chỉ lưu khi người dùng bấm `+ Lưu kênh đang mở`, tự động tính chênh lệch `Δ Followers` và `Δ View TB` so với lần xem trước.
   - **Máy tính Hoa hồng & Điểm hòa vốn:** Nhập giá bán, % hoa hồng, số đơn dự kiến và chi phí Cát-xê/Ads để tính tức thì Hoa hồng/đơn, Tổng GMV, Tổng hoa hồng và **Số đơn hòa vốn**.

### B. Tab Seller (`Y → AM`), TikTok Ads (`BE → BI`), Đề xuất & Air Link
- **Tab Seller (`Y → AM`):** Tự động đọc 15 chỉ số trên TikTok Seller / Creator Marketplace và copy đúng thứ tự **Cột Y → AM** để dán vào Google Sheet Listing.
- **Tab TikTok Ads (`BE → BI`):** Nạp mã ủy quyền Spark Ads hàng loạt trên `ads.tiktok.com`, tính **ROI Tổng Thực Tế = GMV / (Cát-xê Net + Chi phí Ads)**, copy **Cột BE → BI** và đồng bộ về Web-Admin.
- **Tab Đề xuất:** Đối soát trực tiếp 2.357 KOC Master & 16.024 Deal lịch sử, định tuyến phê duyệt chuẩn phòng B2C (**Leader Nguyễn Thị Ngọc Tâm** cho 8 gian hàng trọng điểm hoặc trình trực tiếp **GĐ Marketing Đặng Thị Yến Nhi**).
- **Tab Air Link (Tải đa định dạng, Xuất bình luận & Viết kịch bản):**
  - **Tải về đa định dạng (hỗ trợ TikTok, Douyin, Instagram, Threads, Facebook Reels):** Tải **Video MP4 Không Logo**, **Nhạc nền MP3**, **Lời thoại Phụ đề (`.txt`/WebVTT)**, **Bộ ảnh Photo Slide**, và **Xuất CSV toàn bộ Bình luận** (kèm phân loại 10 nhóm ý định mua hàng & SĐT khách để lại).
  - **Nhận xét Kênh & Viết Kịch bản 3 cảnh (`ANALYZE_CHANNEL_AND_SCRIPT`):** Bấm nút tường minh (tuân thủ `RULE-API-02`) để tổng hợp nhận xét kênh và dựng khung kịch bản 3 phân cảnh (`Mở đầu 3s`, `Chứng minh USP`, `Kêu gọi bấm giỏ hàng`).
  - **Nút `Báo lỗi` trên thanh tiêu đề:** Gửi ghi chú ngắn về bộ phận kỹ thuật, chỉ gửi khi người dùng chủ động bấm nút `Gửi ghi chú`.

### C. Tính năng chuyên sâu cho Instagram, Reels, Threads & Facebook (Tích hợp từ các Repo mã nguồn mở GitHub)
1. **Giải mã Shortcode → PK 64-bit & Làm giàu dữ liệu bài đăng (từ [`Andrei-Alb/isorter`](https://github.com/Andrei-Alb/isorter)):**
   - Tự động chuyển mã `shortcode` (`p/ABC...`, `reel/XYZ...`, `post/DEF...`) sang `media_id` (`pk` 64-bit `BigInt`) và gọi `/api/v1/media/{pk}/info/` kèm `x-ig-app-id` để lấy đủ Caption, Hashtag, Lượt xem, Lượt tim và luồng `video_versions` có độ phân giải cao nhất (`width × height`).
2. **Sắp xếp lưới & Đọc số liệu SVG chuẩn xác (từ [`RostyslavDzhohola/free-sort-feed-extension`](https://github.com/RostyslavDzhohola/free-sort-feed-extension)):**
   - Định vị gốc ô lưới (`resolveMetaGridTile`) trên Instagram & Facebook Reels để sắp xếp theo `View cao`, `Tim cao`, `ER cao`, `Chỉ bài giỏ` mà không làm vỡ bố cục CSS Flexbox/Grid.
   - Đọc chính xác số Follower nguyên từ thuộc tính `header [title]` và bóc tách số lượt xem/tim cạnh biểu tượng SVG (`Play` / `Heart` / `Comment`), loại bỏ hoàn toàn số liệu ước tính giả (tuân thủ `RULE-DATA-01`).
3. **Thanh công cụ ngang `.ub-ThreadsPostBar` & Tải Video MSE/Blob trên Threads, IG, FB Reels (từ [`jeongpiano/threads-video-downloader`](https://github.com/jeongpiano/threads-video-downloader) & `yt-dlp`):**
   - **Giao diện riêng cho Threads (`.ub-ThreadsPostBar`):** Hiển thị thanh ngang gọn bên dưới bài đăng Threads (kèm nút `🔍 Chọn bài` và `⬇ Tải Video`), không đè lên Avatar và không làm lệch lưới 2 cột của Threads.
   - **Giao diện Compact Tile cho Instagram & Facebook Reels (`.ub-GridCardOverlay--compactTile` + `.ub-MetaQuickDlBtn`):** Hiển thị gọn ở đáy ô vuông/9:16 kèm nút `⬇ MP4` ở góc phải trên.
   - **Tải trọn vẹn file MP4 khi trang phát bằng `blob:`:** Tự động cắt bỏ tham số phân mảnh `bytestart` / `byteend` trên `cdninstagram.com` & `fbcdn.net`, kết hợp bóc tách `videoDeliveryResponseFragment.progressive_urls` (HD/SD) và dự phòng qua trang `/embed` / `/embed/captioned/`.

## 3. Hướng dẫn cài đặt và chia sẻ cho nhân sự khác trong team

### Cách 1: Chia sẻ nhanh qua file `.zip` nội bộ (Miễn phí, dùng ngay trong 30 giây)
1. Gửi file [`Upbase-B2C-Extension-v1.3.zip`](file:///e:/Upbase/B2C/chrome-extension/Upbase-B2C-Extension-v1.3.zip) (hoặc `Upbase-B2C-Extension-v1.2.zip`) qua Lark hoặc Zalo cho các bạn PIC trong team.
2. Người nhận giải nén file `.zip` ra một thư mục cố định trên máy (ví dụ: `D:\Upbase-B2C-Extension`).
3. Mở trình duyệt Chrome / Edge / Brave / Cốc Cốc, truy cập `chrome://extensions/`.
4. Bật công tắc **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên bên phải.
5. Bấm **Load unpacked (Tải tiện ích đã giải nén)** và chọn thư mục vừa giải nén.
6. Bấm vào biểu tượng chữ **U (Upbase B2C)** trên thanh công cụ trình duyệt:
   - Nhập tên **Chuyên viên thực thi (PIC)** của mình.
   - Nhập **Địa chỉ máy chủ Upbase B2C (Web-Admin)**:
     - Nếu chạy trên máy cá nhân: `http://localhost:3000`
     - Nếu dùng chung máy chủ mạng LAN công ty: `http://<IP-Máy-Chủ>:3000` (ví dụ `http://192.168.1.50:3000`)
     - Nếu đã đưa Web-Admin lên tên miền nội bộ / Vercel / VPS: `https://b2c.upbase.vn`

### Cách 2: Đưa lên Chrome Web Store ở chế độ Nội bộ (`Unlisted`)
- Đăng ký tài khoản Chrome Web Store Developer (phí 5 USD một lần duy nhất), tải file `Upbase-B2C-Extension-v1.3.zip` lên và chọn chế độ hiển thị **Unlisted (Không công khai — chỉ người có link mới cài được)** hoặc **Private (Chỉ email `@upbase.vn`)**. Khi đó nhân sự chỉ cần bấm 1 nút **Add to Chrome** và tự động nhận bản cập nhật mới.
