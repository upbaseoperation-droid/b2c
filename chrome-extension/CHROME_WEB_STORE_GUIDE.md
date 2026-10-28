# Hướng Dẫn Đưa Extension Lên Google Chrome Web Store Developer Dashboard

Tài liệu này cung cấp trọn bộ hướng dẫn và **nội dung mẫu (copy-paste 100%)** để đẩy **Upbase B2C Extension (`v1.4.0`)** lên **Chrome Web Store Developer Console** (`https://chrome.google.com/webstore/devconsole`) được Google duyệt nhanh ngay từ lần đầu.

---

## Cách 1: Tải trực tiếp lên Giao diện Web của Google Developer (Nhanh nhất — 5 phút)

### Bước 1: Mở trang quản trị & Tải file `.zip` chuẩn
1. Truy cập **[Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)** và đăng nhập tài khoản Google Developer của bạn (phí kích hoạt tài khoản Google Developer lần đầu là **5 USD** một lần duy nhất).
2. Bấm nút **New item (Mục mới)** ở góc phải màn hình.
3. Chọn file `.zip` đã được đóng gói sạch theo chuẩn của Google tại:
   👉 **[`e:\Upbase\B2C\chrome-extension\Upbase-B2C-ChromeWebStore-v1.4.0.zip`](file:///e:/Upbase/B2C/chrome-extension/Upbase-B2C-ChromeWebStore-v1.4.0.zip)**

---

### Bước 2: Điền tab **Store Listing (Thông tin trên cửa hàng)**
Copy các nội dung dưới đây dán vào từng ô:

- **Title (Tên tiện ích — đã tự nhận từ `manifest.json`):**
  ```text
  Upbase B2C - KOC, TikTok Seller, TikTok Ads & Nghiệm thu Air Link
  ```
- **Summary (Tóm tắt ngắn — đã tự nhận từ `manifest.json`):**
  ```text
  Phân tích KOC, nhãn lưới bài đăng, bóc giỏ hàng & chấm điểm mặt hàng, phụ đề WebVTT, tải MP4/MP3/Ảnh trên TikTok & Douyin, đồng bộ Seller & Ads.
  ```
- **Description (Mô tả chi tiết):**
  ```text
  Bộ công cụ vận hành và phân tích KOC chuyên nghiệp dành cho chuyên viên Booking (PIC) và quản trị viên thương mại điện tử:

  1. Phân tích Kênh & Nhãn trên lưới bài đăng:
  - Hiển thị trực tiếp lượt xem, lượt thích, bình luận, lượt lưu, tốc độ tăng trưởng (view/giờ) và nhãn đánh giá bằng chữ (Bài nổi bật, Đang tăng nhanh, Tương tác bất thường, Gắn giỏ Shop, Quảng cáo) ngay trên từng thẻ video của lưới TikTok & Douyin.
  - Sắp xếp lưới bài đăng trực tiếp trên trang theo Lượt xem, Lượt thích, Tỷ lệ tương tác (ER), Tốc độ tăng trưởng hoặc lọc riêng bài gắn giỏ hàng.
  - Thống kê khung giờ đăng bài hiệu quả (Giờ VN UTC+7), hiệu quả theo từng Hashtag, danh sách Nhạc nền (kèm nút tải MP3) và lượt xem theo ngày đăng.
  - Xuất báo cáo tóm tắt kênh chuẩn in ấn (PDF/PNG) và bảng dữ liệu CSV.

  2. Phân tích Mặt hàng, Gian hàng & Máy tính Hoa hồng:
  - Quét toàn bộ bài đăng trên kênh để đếm số lượng video làm cho từng mặt hàng, gom nhóm theo từng Gian hàng (Shop) và xuất file CSV/Excel.
  - Chấm điểm mặt hàng từ Link hoặc Product ID: hiển thị giá bán, hoa hồng ước tính, số lượng đã bán, tốc độ bán/ngày, tồn kho và mức độ cạnh tranh bằng chữ.
  - Lưu theo dõi biến động kênh đối thủ/KOC trực tiếp trên máy bạn (localStorage) và tính điểm hòa vốn hoa hồng Affiliate / Booking.

  3. Nghiệm thu Air Link, Phụ đề WebVTT & Tải đa định dạng:
  - Tự động đọc thông tin sản phẩm trong giỏ hàng TikTok Shop, giải mã lời thoại phụ đề (WebVTT Subtitle) để đối chiếu từ khóa USP và cảnh báo từ ngữ nhạy cảm.
  - Phân loại bình luận người xem theo 10 nhóm ý định mua hàng và xuất file CSV bình luận.
  - Hỗ trợ tải Video MP4 gốc lưu trữ chứng từ nghiệm thu, tải nhạc MP3, bộ ảnh Slide và lời thoại phụ đề.

  4. Đồng bộ TikTok Seller (Cột Y -> AM) & TikTok Ads Manager (Cột BE -> BI):
  - Trích xuất 15 chỉ số thương mại từ TikTok Seller / Affiliate Creator Marketplace và sao chép đúng định dạng cột Google Sheet.
  - Hỗ trợ nạp mã ủy quyền Spark Ads và tính toán hiệu quả chi phí (ROAS / ROI tổng thực tế).
  ```
- **Category (Danh mục):** Chọn **`Productivity`** (Năng suất) hoặc **`Workflow & Planning`**.
- **Language (Ngôn ngữ):** Chọn **`Vietnamese (Tiếng Việt)`**.

---

### Bước 3: Điền tab **Privacy Practices (Thực hành quyền riêng tư) — QUAN TRỌNG NHẤT ĐỂ ĐƯỢC DUYỆT NHANH**

Google yêu cầu giải trình ngắn gọn lý do dùng từng quyền trong `manifest.json`. Bạn chỉ cần **copy nguyên văn** các đoạn dưới đây dán vào từng ô tương ứng:

1. **Single purpose description (Mô tả mục đích duy nhất của tiện ích):**
   ```text
   Giúp chuyên viên vận hành thương mại điện tử và Booking KOC phân tích chỉ số kênh/bài đăng trên TikTok, Douyin, Instagram, TikTok Seller và TikTok Ads Manager, kiểm tra nội dung nghiệm thu video (giỏ hàng, phụ đề) và đồng bộ số liệu về bảng quản trị nội bộ.
   ```

2. **Permission Justifications (Giải trình từng quyền):**
   - **`storage` justification:**
     ```text
     Lưu trữ cấu hình máy chủ nội bộ (Server URL), tên chuyên viên thực thi (PIC), vị trí neo bảng giao diện và tùy chọn hiển thị của người dùng ngay trên trình duyệt.
     ```
   - **`activeTab` justification:**
     ```text
     Đọc thông tin bài đăng và chỉ số kênh trên tab TikTok / TikTok Seller / TikTok Ads đang mở khi người dùng chủ động tương tác với bảng điều khiển của tiện ích.
     ```
   - **`clipboardWrite` justification:**
     ```text
     Cho phép người dùng bấm nút sao chép nhanh hàng dữ liệu chỉ số KOC (Cột Y -> AM hoặc BE -> BI) và lời thoại phụ đề vào bộ nhớ tạm (Clipboard) để dán vào bảng tính Google Sheets.
     ```
   - **`declarativeNetRequest` justification:**
     ```text
     Thiết lập tiêu đề Referer và User-Agent phù hợp khi truy xuất luồng dữ liệu phụ đề và thông tin giỏ hàng sản phẩm từ máy chủ CDN của TikTok/Douyin để phục vụ kiểm tra nghiệm thu nội dung.
     ```
   - **`downloads` justification:**
     ```text
     Cho phép người dùng tải về tệp video bài đăng, âm thanh MP3, ảnh slide hoặc phụ đề khi người dùng chủ động bấm nút Tải về để lưu trữ chứng từ nghiệm thu.
     ```
   - **`Host permission` justification:**
     ```text
     Tiện ích chỉ hoạt động trên các tên miền mạng xã hội và sàn thương mại điện tử được khai báo (tiktok.com, tiktokshop.com, douyin.com, instagram.com) để hiển thị bảng phân tích chỉ số KOC trên trang và đồng bộ dữ liệu về máy chủ quản trị upbase.vn do người dùng cấu hình.
     ```

3. **Are you using remote code? (Bạn có sử dụng mã từ xa không?):**
   - Chọn **`No, I am not using Remote code`** (Toàn bộ mã JavaScript đều nằm gọn bên trong gói `.zip`).

4. **Data Usage (Khai báo thu thập dữ liệu):**
   - Tích chọn **`Website content`** (Nội dung trang web — do đọc số liệu bài đăng công khai trên trang TikTok đang mở).
   - Tích chọn đủ **3 ô cam kết** ở cuối trang (Không bán dữ liệu cho bên thứ ba, không dùng cho mục đích ngoài chức năng tiện ích, không dùng để chấm điểm tín dụng).

---

### Bước 4: Chọn Chế độ Hiển thị (`Visibility`) và Bấm **Submit for Review**

Trong mục **Visibility (Khả năng hiển thị)**, bạn có 3 lựa chọn tùy nhu cầu:
- **Lựa chọn khuyên dùng cho nội bộ & đối tác (`Unlisted` — Không công khai):**
  - Bất kỳ ai có đường link Chrome Web Store bạn gửi đều cài đặt được chỉ bằng 1 cú nhấp chuột (**Add to Chrome**), nhưng người lạ tìm kiếm trên Google sẽ không thấy. **Chế độ `Unlisted` được Google duyệt cực nhanh (thường chỉ mất vài giờ).**
- **Lựa chọn công khai (`Public`):**
  - Ai cũng có thể tìm thấy trên Chrome Web Store (thời gian duyệt khoảng 1 – 3 ngày làm việc).
- **Lựa chọn nội bộ tên miền (`Private`):**
  - Chỉ các tài khoản Google thuộc danh sách email bạn chỉ định mới cài được.

---

## Cách 2: Đẩy tự động từ dòng lệnh (Terminal / CI-CD) qua Google Chrome Web Store API

Tôi đã viết sẵn script tự động hóa **[`publish-chrome-web-store.mjs`](file:///e:/Upbase/B2C/chrome-extension/publish-chrome-web-store.mjs)** tại thư mục `chrome-extension`.

### 1. Đóng gói lại file `.zip` chuẩn Store bất cứ lúc nào:
```powershell
node e:\Upbase\B2C\chrome-extension\publish-chrome-web-store.mjs
```

### 2. Đẩy và Publish tự động lên Google qua API (dành cho các bản cập nhật về sau):
Sau khi bạn đã tạo Item lần đầu trên Web Console và lấy `Extension ID` (ví dụ `knfbcnmlegpoakjaegkmpedalinhjnac`) cùng bộ khóa OAuth2 (`Client ID`, `Client Secret`, `Refresh Token` từ Google Cloud Console có bật **Chrome Web Store API**), bạn chỉ cần chạy 1 lệnh duy nhất:
```powershell
$env:CWS_CLIENT_ID="your_client_id"
$env:CWS_CLIENT_SECRET="your_client_secret"
$env:CWS_REFRESH_TOKEN="your_refresh_token"
$env:CWS_EXTENSION_ID="your_extension_id"
node e:\Upbase\B2C\chrome-extension\publish-chrome-web-store.mjs --publish
```
Script sẽ tự động nén `.zip`, lấy OAuth2 Token từ Google, tải gói mới lên Chrome Web Store và bấm gửi xét duyệt (`publish`).
