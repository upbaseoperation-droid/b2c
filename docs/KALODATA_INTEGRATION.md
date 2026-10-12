# Hướng Dẫn Tích Hợp Số Liệu Thương Mại KOC Từ Kalodata (Open API)

Tài liệu thiết kế kỹ thuật & hướng dẫn vận hành module kết nối dữ liệu Kalodata dành cho đội ngũ Marketing B2C Upbase.

---

## 1. Mục Đích & Phạm Vi Ứng Dụng

Module tích hợp Kalodata giúp giải quyết bài toán cốt lõi trong quy trình Booking KOC:
* **Đánh giá năng lực bán hàng thực tế:** Thay vì chỉ dựa vào số follower hay lượt xem ảo, đội Booking có ngay số liệu doanh số (GMV), số lượng đơn hàng, và hiệu quả gắn giỏ hàng (GPM).
* **Phân loại tệp KOC chính xác:** Nắm rõ KOC mạnh về **Video ngắn** hay **Livestream**, cơ cấu giới tính/độ tuổi người xem để ghép đúng ngành hàng và sản phẩm của nhãn hàng.
* **Tự động hóa cập nhật hồ sơ:** 1 thao tác đồng bộ trực tiếp đưa các chỉ số bán hàng vào Master Data KOC, phục vụ tính toán khung lương và chọn lọc KOC cho chiến dịch.

---

## 2. Danh Mục Chỉ Số Thu Thập Từ Kalodata

Hệ thống trích xuất và ánh xạ tự động vào hồ sơ KOC (`KocProfile` / `KocItem`):

| Chỉ số | Ý nghĩa nghiệp vụ | Đơn vị |
| :--- | :--- | :--- |
| **Doanh số ước tính (GMV)** | Tổng giá trị hàng hóa KOC bán ra trong chu kỳ (7 ngày / 30 ngày / 90 ngày) | VNĐ |
| **Số lượng bán ra (Units Sold)** | Số sản phẩm thực tế đã giao dịch qua liên kết của KOC | Sản phẩm |
| **Đơn hàng (Order Count)** | Số đơn hàng phát sinh | Đơn |
| **GPM (GMV / 1.000 views)** | Doanh thu tạo ra trên mỗi 1.000 lượt hiển thị nội dung | VNĐ |
| **Giá trị đơn trung bình (AOV)** | Mức chi tiêu trung bình của một khách hàng mua qua KOC | VNĐ |
| **Tỉ trọng Video / Live / Thẻ** | Phân bổ doanh thu đến từ video ngắn, livestream hay giỏ hàng | % |
| **Cơ cấu người xem** | Tỉ lệ giới tính (Nam/Nữ) và nhóm tuổi (18-24, 25-34, 35+) | % |
| **Top sản phẩm bán chạy** | Các mặt hàng KOC từng bán tốt nhất kèm tỉ lệ hoa hồng | Danh mục |

---

## 3. Kiến Trúc Kỹ Thuật

```
                    ┌───────────────────────────────┐
                    │   Giao Diện Master Data KOC   │
                    │   (web-admin: MasterDataView) │
                    └───────────────┬───────────────┘
                                    │ Bấm "Đồng bộ Kalodata"
                                    ▼
                    ┌───────────────────────────────┐
                    │      KalodataSyncModal        │
                    │  (Xem trước & xác nhận lưu)   │
                    └───────────────┬───────────────┘
                                    │ Gọi API
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │         Backend API Routes (/api/integrations/kalodata) │
       │  • /status    • /creator    • /sync    • /discover      │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │               KalodataClient (Service SDK)              │
       │           (Kiểm tra cờ KALODATA_API_KEY)                │
       └──────────────┬───────────────────────────┬──────────────┘
                      │ Chưa có Key               │ Đã có Key
                      ▼                           ▼
       ┌─────────────────────────────┐ ┌───────────────────────────┐
       │   Chế Độ Thử Nghiệm Sandbox │ │   Kalodata Enterprise     │
       │ (Mô phỏng số liệu chuẩn VN) │ │   Open API (Trực tiếp)    │
       └─────────────────────────────┘ └───────────────────────────┘
```

### Các tệp thành phần:
* **Cấu hình & Kiểu dữ liệu:** `web-admin/src/lib/kalodata/types.ts`
* **Bộ dữ liệu thử nghiệm:** `web-admin/src/lib/kalodata/mockData.ts`
* **Dịch vụ kết nối SDK:** `web-admin/src/lib/kalodata/client.ts`
* **API Endpoints:**
  * `GET /api/integrations/kalodata/status`: Kiểm tra trạng thái kết nối.
  * `GET /api/integrations/kalodata/creator`: Tra cứu số liệu chi tiết theo handle TikTok.
  * `POST /api/integrations/kalodata/sync`: Đồng bộ số liệu vào hồ sơ KOC và cơ sở dữ liệu.
  * `GET /api/integrations/kalodata/discover`: Khám phá top KOC theo bộ lọc ngành hàng.
* **Giao diện Modal:** `web-admin/src/components/kalodata/KalodataSyncModal.tsx`

---

## 4. Cơ Chế Chuyển Đổi Khi Nhận Khóa API Chính Thức

Hiện tại, hệ thống đã hoàn thiện sẵn toàn bộ luồng xử lý và giao diện ở **Chế độ thử nghiệm (Sandbox)**. 

Khi hoàn tất thủ tục liên hệ và ký hợp đồng gói Enterprise với Kalodata, đội ngũ kỹ thuật chỉ cần thực hiện 2 bước đơn giản sau:

### Bước 1: Mở tệp biến môi trường `.env` hoặc `.env.local`
Điền khóa bí mật do Kalodata cấp:
```env
KALODATA_API_KEY="khóa_secret_key_do_kalodata_cấp"
KALODATA_BASE_URL="https://api.kalodata.com/open-api/v1"
KALODATA_REGION="VN"
KALODATA_CURRENCY="VND"
```

### Bước 2: Khởi động lại dịch vụ
Hệ thống tự động phát hiện `KALODATA_API_KEY`, chuyển huy hiệu sang **"API trực tiếp"** và kết nối thẳng tới máy chủ Kalodata mà không cần sửa bất kỳ dòng mã nguồn nào.
