# QUY TRÌNH QUẢN TRỊ DỮ LIỆU GỐC & DANH BẠ KOC PHÒNG B2C
## Tiêu Chuẩn Hồ Sơ Pháp Lý, Giám Sát Booking Đang Chạy & Đối Soát Trùng Lặp

---

## 1. THÔNG TIN CHUNG

| Thuộc tính | Giá trị |
| :--- | :--- |
| **Mã tài liệu** | `QT-UPB-B2C-MD-01` |
| **Tên tài liệu** | Quy trình Quản trị Dữ liệu gốc Master Data & Danh bạ KOC B2C |
| **Phiên bản** | `v1.0.0` |
| **Ngày ban hành** | 13/10/2026 |
| **Đơn vị áp dụng** | Toàn bộ nhân sự phòng Marketing B2C (Booking, Content, Phân tích dữ liệu) |

---

## 2. MỤC TIÊU & NGUYÊN TẮC QUẢN TRỊ DỮ LIỆU GỐC

Nhằm xóa bỏ tình trạng phân mảnh thông tin, nhập liệu trùng lặp và thiếu sót hồ sơ pháp lý khi thanh toán, phân hệ Danh bạ KOC Master Data được xây dựng dựa trên 4 nguyên tắc cốt lõi:

1. **Một danh bạ duy nhất cho toàn phòng B2C (Single Source of Truth):**
   * Mọi KOC được tuyển chọn hoặc hợp tác trong chiến dịch phải được định danh duy nhất thông qua ID kênh (Channel Handle) hoặc mã định danh pháp lý (CCCD / Mã số thuế).
   * Lịch sử làm việc, hợp đồng, chất lượng video và doanh thu bán hàng được tích lũy xuyên suốt các thương hiệu trong phòng B2C.

2. **Tiêu chuẩn dữ liệu sạch – Tuyệt đối không lưu dữ liệu mẫu giả định (Zero Mock Policy):**
   * Nghiêm cấm lưu số điện thoại mặc định (như `0987654321`), CCCD giả định hoặc số lượng người theo dõi giả tạo.
   * Dữ liệu chưa xác minh hoặc chưa có thực tế phải để trống (`null` / `undefined`) hoặc hiển thị dấu gạch ngang (`—`) để yêu cầu chuyên viên cập nhật bổ sung.

3. **Phân tầng hồ sơ pháp lý phục vụ thanh toán & hợp đồng (3 Legal Tiers):**
   * **Nhóm Cá nhân (`INDIVIDUAL`):** Bắt buộc có Họ tên thật, Số CCCD/CMND, Ngày cấp, Nơi cấp, Địa chỉ thường trú, Tài khoản ngân hàng chính chủ. Áp dụng khấu trừ thuế TNCN 10% theo quy định nếu đủ ngưỡng.
   * **Nhóm Hộ kinh doanh (`BUSINESS_HOUSEHOLD`):** Bắt buộc có Giấy chứng nhận đăng ký hộ kinh doanh, Mã số thuế HKD, Họ tên chủ hộ, Tài khoản ngân hàng của hộ kinh doanh.
   * **Nhóm Doanh nghiệp / Công ty đại diện (`BUSINESS_LICENSE`):** Bắt buộc có Giấy phép đăng ký kinh doanh, Mã số thuế doanh nghiệp, Người đại diện theo pháp luật, Tài khoản ngân hàng công ty. Xuất hóa đơn GTGT khi nghiệm thu thanh toán.

4. **Bảo mật thông tin nhạy cảm:**
   * Thông tin số CCCD, Mã số thuế và Số tài khoản ngân hàng được che mặt nạ mặc định (`******1234`).
   * Chỉ nhân sự có thẩm quyền (Kế toán, Pháp chế, Trưởng phòng B2C hoặc PIC trực tiếp quản trị) mới được quyền giải mã để đối soát hồ sơ.

---

## 3. CƠ CHẾ ĐỐI SOÁT TRÙNG LẶP & CẢNH BÁO RỦI RO (DUPLICATE DETECTION)

Hệ thống tự động quét và gắn cờ cảnh báo **"Nghi trùng"** khi phát hiện 2 hoặc nhiều hồ sơ KOC thỏa mãn một trong các điều kiện sau:
* **Trùng ID Kênh / Liên kết kênh:** Cùng tài khoản TikTok/Instagram/Facebook.
* **Trùng giấy tờ pháp lý:** Cùng số CCCD hoặc cùng Mã số thuế.
* **Trùng thông tin thanh toán:** Cùng Số tài khoản và Tên ngân hàng thụ hưởng.
* **Trùng thông tin liên lạc:** Cùng Số điện thoại hoặc Zalo.

**Quy tắc xử lý:**
* Khi phát hiện nghi trùng, hệ thống hiển thị danh sách các hồ sơ liên quan để chuyên viên và Leader đối chiếu trước khi tạo booking mới.
* Leader/Trưởng phòng thực hiện gộp hồ sơ (Merge) hoặc xác nhận tách biệt nếu có ủy quyền hợp pháp.

---

## 4. BẢNG THEO DÕI "CÁC JOB ĐANG CHẠY CÙNG UPBASE" (ACTIVE BOOKING PANEL)

Trên giao diện chi tiết hồ sơ KOC (KOC Profile), hệ thống tự động tổng hợp toàn bộ các hợp tác phát sinh giữa KOC với các thương hiệu của Upbase B2C:

1. **Hiển thị thông tin thực thi đa gian hàng:**
   * Tên thương hiệu và dòng sản phẩm đang hợp tác (`Brand · Product`).
   * Mã Booking Order (`dealCode`).
   * Trạng thái thực thi (`dealStatus`): Đang trao đổi, Đã gửi mẫu, Đang duyệt kịch bản, Đang sản xuất video, Đã lên bài (Air), Hoàn tất nghiệm thu.
   * Thời hạn lên bài (`deadlinePost`) và người phụ trách (`PIC`).
   * Chi phí thù lao hợp đồng và Doanh thu phát sinh (GMV 30 ngày).
   * Chỉ số hoàn vốn thực tế: $\text{ROI} = \frac{\text{GMV 30 ngày}}{\text{Chi phí thù lao}}$.

2. **Cơ chế trao đổi chéo giữa các Chuyên viên (Colleague Collaboration):**
   * Cho phép Chuyên viên B bấm nút **"Nhắn"** gửi thông điệp trực tiếp đến Chuyên viên A đang chạy job với cùng KOC đó.
   * **Mục đích nghiệp vụ:**
     * Thăm dò thái độ hợp tác, tiến độ trả lời tin nhắn và chất lượng kịch bản/video thực tế của KOC.
     * Chủ động ghép đơn hàng hoặc gộp gói hợp đồng giữa nhiều thương hiệu để đàm phán mức giá chiết khấu tốt nhất từ KOC.

---

## 5. PHÂN CẤP QUẢN TRỊ 42 THƯƠNG HIỆU B2C CHUẨN HÓA

Danh mục thương hiệu được chuẩn hóa cố định gồm 42 nhãn hàng thuộc phạm vi B2C:
* **Mức Thương hiệu (Brand):** Đứng tên ký kết điều khoản chung và định mức phê duyệt.
* **Mức Gian hàng (Store):** Phân chia theo từng sàn thương mại điện tử (`TikTok Shop`, `Shopee Mall`, `Lazada`, `Đa sàn`).
* Khi lọc nhãn hàng trên thanh điều hướng đầu trang, toàn bộ Danh bạ KOC sẽ tự động giới hạn hiển thị các KOC đã từng hợp tác hoặc đang được phân công chạy cho nhãn hàng đó.

---
*(Tài liệu ban hành phục vụ vận hành thực tế hệ thống B2C Ops Hub)*
