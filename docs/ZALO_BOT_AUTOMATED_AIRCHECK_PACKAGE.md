# HỆ THỐNG NGHIỆM THU TỰ ĐỘNG VIDEO TIKTOK QUA ZALO BOT
> **Tài liệu Kỹ thuật & Hướng dẫn Đóng gói Tích hợp dành cho Dev Team**  
> **Đơn vị phát triển:** Hệ thống Upbase B2C Operations  
> **Phiên bản:** v1.4.0 (Tích hợp Engine Nghiệm thu, Cắt Frame Video & Đối soát BBNT)

---

## 1. Tổng quan Kiến trúc & Mục tiêu Nghiệp vụ

### 1.1. Mục tiêu
- **Tự động hóa 100% khâu nghiệm thu Air Link:** Khi KOC gửi link video TikTok vào nhóm Zalo (nhóm 3 bên: Brand - KOC - Upbase B2C), Bot tự động cào dữ liệu, đối soát giỏ hàng, phân tích lời thoại và trả kết quả ngay lập tức trong 2-5 giây.
- **Bằng chứng thị giác tự động:** Tự động bắt đúng khung hình KOC cầm sản phẩm (`firstProductAppearanceSec`), đóng dấu tem nghiệm thu chính hãng Upbase B2C và gửi ảnh trực tiếp vào nhóm Zalo.
- **Đồng bộ thời gian thực:** Kết quả nghiệm thu tự động liên kết với mã Deal (`dealCode`), cập nhật trạng thái hợp đồng thành `ĐÃ_NGHIỆM_THU_AIR`, sẵn sàng cho khâu lập Biên bản nghiệm thu (`/bbnt`) và thanh toán kế toán.

### 1.2. Sơ đồ Luồng Xử lý Dữ liệu (End-to-End Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor KOC as KOC / Chuyên viên
    participant Zalo as Zalo Group Chat
    participant Webhook as Webhook Route (/api/integrations/zalo-bot/webhook)
    participant Engine as Zalo Bot Engine (zaloBot.ts)
    participant Inspector as Video Inspector (tiktokVideoInspector.ts)
    participant DB as Web-Admin Database (AppSharedRecord)

    KOC->>Zalo: Gửi link video TikTok (hoặc gõ /air, /bbnt)
    Zalo->>Webhook: POST Webhook Event (kèm x-bot-api-secret-token)
    Webhook->>Engine: processZaloWebhookEvent(body)
    Note over Engine: Kiểm tra Whitelist Nhóm & Phân loại Lệnh 4 Lớp
    Engine->>Inspector: checkSingleLinkServerless(videoUrl)
    Note over Inspector: Cào Metadata, Giỏ hàng Anchor Type 35 & WebVTT Subtitle
    Inspector-->>Engine: LinkAirResult (verdict: PASS/REVIEW/FAIL, metrics, cart)
    Engine->>Zalo: Phản hồi Báo cáo Nghiệm thu dạng Chữ (Text Reply)
    opt Nếu Video Hợp lệ (Status: LIVE)
        Engine->>Engine: captureTikTokProductFrameBuffer()
        Note over Engine: Cắt Frame tại giây nhắc SP & Đóng dấu Tem Watermark
        Engine->>Zalo: sendZaloPhoto (Gửi ảnh chụp có tem kiểm tra)
    end
    Engine->>DB: Ghi lịch sử nghiệm thu (zalo-air-history & video-acceptance-screenshots-v1)
    Note over DB: Cập nhật Deal: ĐÃ_NGHIỆM_THU_AIR
```

---

## 2. Cấu trúc Mã nguồn & Phân công Module

| Tệp tin / Module | Đường dẫn | Vai trò kỹ thuật |
| :--- | :--- | :--- |
| **Zalo Bot Engine** | [`web-admin/src/lib/server/zaloBot.ts`](file:///e:/Upbase/B2C/web-admin/src/lib/server/zaloBot.ts) | Trọng tâm xử lý logic: Router 4 lớp, gọi engine nghiệm thu, sinh ảnh tem Watermark, quản lý nhóm & quyền hạn. |
| **Webhook Handler** | [`web-admin/src/app/api/integrations/zalo-bot/webhook/route.ts`](file:///e:/Upbase/B2C/web-admin/src/app/api/integrations/zalo-bot/webhook/route.ts) | Nhận sự kiện từ Zalo Bot Platform; cung cấp endpoint `?frame=1` xuất ảnh CDN có tem phục vụ `sendPhoto`. |
| **Status API** | [`web-admin/src/app/api/integrations/zalo-bot/status/route.ts`](file:///e:/Upbase/B2C/web-admin/src/app/api/integrations/zalo-bot/status/route.ts) | Báo cáo tình trạng kết nối Bot, danh sách nhóm, thống kê lượt nghiệm thu và nhật ký gỡ lỗi (debug events). |
| **Send Message API** | [`web-admin/src/app/api/integrations/zalo-bot/send/route.ts`](file:///e:/Upbase/B2C/web-admin/src/app/api/integrations/zalo-bot/send/route.ts) | Cho phép các module nội bộ (hoặc cron job) bắn tin nhắn / ảnh nghiệm thu chủ động vào nhóm chỉ định. |
| **Group Mapping API** | [`web-admin/src/app/api/integrations/zalo-bot/mappings/route.ts`](file:///e:/Upbase/B2C/web-admin/src/app/api/integrations/zalo-bot/mappings/route.ts) | Gán nhóm Zalo với Mã Deal, Gian hàng B2C, phân quyền Whitelist. |
| **Giao diện Quản trị** | [`web-admin/src/components/views/ZaloBotManagerView.tsx`](file:///e:/Upbase/B2C/web-admin/src/components/views/ZaloBotManagerView.tsx) | Màn hình Dashboard trên Web-Admin theo dõi live nhật ký nghiệm thu, quản lý nhóm và cấu hình tin nhắn mẫu. |
| **Kịch bản Giả lập Dev**| [`scripts/test_zalo_bot_aircheck_simulation.ts`](file:///e:/Upbase/B2C/scripts/test_zalo_bot_aircheck_simulation.ts) | Bộ test tự động giả lập Webhook sự kiện phục vụ Dev Team test local mà không cần mở tunnel mạng. |

---

## 3. Danh mục Biến môi trường (Environment Variables)

Các biến môi trường cần thiết lập trong file `.env` hoặc trên hệ thống triển khai (Vercel / Docker / VPS):

```env
# 1. Khóa truy cập Zalo Bot Platform (bot-api.zaloplatforms.com)
ZALO_BOT_TOKEN="your_zalo_bot_access_token"
ZALO_BOT_SECRET_TOKEN="your_webhook_secret_token_here"
ZALO_BOT_API_URL="https://bot-api.zaloplatforms.com"

# 2. Địa chỉ Web-Admin phục vụ sinh link ảnh Frame CDN (?frame=1)
NEXT_PUBLIC_APP_URL="https://b2c.upbase.vn"

# 3. Kết nối Cơ sở dữ liệu (PostgreSQL / Prisma)
DATABASE_URL="postgresql://user:password@localhost:5432/upbase_b2c?schema=public"

# 4. Bảo mật API nội bộ
UPBASE_SECRET_KEY="internal_upbase_secret_passphrase"
```

> [!NOTE]
> **Cơ chế Zero-Crash Standalone:** Nếu chưa cấu hình `DATABASE_URL`, hệ thống sẽ tự động chuyển sang đọc/ghi In-Memory và tệp dữ liệu dự phòng `zalo_air_history.json` & `zalo_group_mappings.json`, đảm bảo quá trình dev không bị crash.

---

## 4. Đặc tả Kỹ thuật API & Webhook Handshake

### 4.1. Webhook Tiếp nhận Tin nhắn (`POST /api/integrations/zalo-bot/webhook`)
- **Headers bắt buộc:**
  - `Content-Type: application/json`
  - `x-bot-api-secret-token: <ZALO_BOT_SECRET_TOKEN>` (Nếu token không khớp, trả về HTTP 403 `UNAUTHORIZED_SECRET_TOKEN`).
- **Payload mẫu:**
```json
{
  "event_name": "message",
  "result": {
    "message": {
      "chat": {
        "id": "group_clio_koc_001",
        "title": "Nhóm Booking ClubClio x KOC Po Trần"
      },
      "from": {
        "id": "user_zalo_9988",
        "display_name": "Po Trần KOC"
      },
      "text": "Dạ em gửi link video lên sóng ạ: https://www.tiktok.com/@po.trann77/video/7429881122334455667"
    }
  }
}
```
- **Response trả về cho Zalo:**
```json
{
  "ok": true,
  "message": "Event received"
}
```

### 4.2. Endpoint Xuất Ảnh Frame nghiệm thu Dynamic (`GET /api/integrations/zalo-bot/webhook?frame=1`)
- **Query Params:**
  - `frameId`: Mã nhận diện frame ảnh.
  - `videoUrl`: Link video TikTok gốc.
  - `sec`: Mốc giây KOC cầm sản phẩm (vd: `3.5`).
  - `handle`: Kênh KOC (vd: `po.trann77`).
  - `title`: Tên sản phẩm nghiệm thu.
  - `air`: Ngày giờ lên sóng.
- **Response:** Trả về file nhị phân `image/jpeg` hoặc `image/png` có đóng sẵn tem dải màu đen-xanh lá của Upbase B2C, tự động đặt header `Cache-Control: public, max-age=86400`.

---

## 5. Tiêu chuẩn Đánh giá Nghiệm thu & Thuật toán 4 Bước

Khi KOC gửi link video, Engine sẽ chạy qua 4 bước kiểm định tự động:

```
[Bước 1: Trạng thái Video] -> [Bước 2: Giỏ hàng Anchor] -> [Bước 3: Lời thoại Subtitle] -> [Bước 4: Cắt Frame SP]
```

1. **Bước 1 — Tình trạng Video (Video Availability):**
   - Video phải ở trạng thái công khai (`LIVE`), không bị ẩn riêng tư, không bị xóa và không bị giới hạn độ tuổi.
2. **Bước 2 — Đối soát Giỏ hàng TikTok Shop (Cart Anchor Type 35):**
   - Bóc tách cấu trúc nhúng `anchors` của TikTok.
   - So sánh Mã sản phẩm (`productId`) và Tên sản phẩm (`productTitle`) với hồ sơ Deal của gian hàng.
3. **Bước 3 — Đối soát Lời thoại WebVTT (Subtitle & USP Matching):**
   - Tự động tải track phụ đề `.vtt`.
   - Tìm kiếm các từ khóa bắt buộc (USP) của chiến dịch (vd: *kiềm dầu*, *căng bóng*).
   - Kiểm tra bộ lọc từ cấm y tế / điều hướng ngoài sàn (cấm các từ như *chữa dứt điểm*, *điều trị 100%*, *nhắn ngoài*).
   - Xác định chính xác giây đầu tiên KOC nhắc đến sản phẩm (`firstProductAppearanceSec`).
4. **Bước 4 — Bằng chứng Thị giác (Holding Moment Frame Capture):**
   - Trích xuất frame hình ảnh tại giây KOC cầm sản phẩm.
   - Đóng dấu dải tem thông tin nghiệm thu chính thức: Kênh, Mốc thời gian, Lượt view, Sản phẩm.

### Phân loại Kết luận:
- **`✅ ĐẠT (PASS)`:** Video LIVE + Có giỏ hàng chuẩn + Đủ hashtag/USP + Không vi phạm từ cấm. Cập nhật Deal thành `ĐÃ_NGHIỆM_THU_AIR`.
- **`⚠️ CẦN RÀ SOÁT (REVIEW)`:** Video LIVE nhưng chưa gắn giỏ hàng hoặc thiếu một phần hashtag cam kết.
- **`❌ KHÔNG ĐẠT (FAIL)`:** Video không tồn tại / Riêng tư hoặc vi phạm chính sách nghiêm trọng.

---

## 6. Các Câu lệnh Hỗ trợ trong Nhóm Zalo (Commands)

| Lệnh | Ý nghĩa | Đối tượng |
| :--- | :--- | :--- |
| **`/air <Link TikTok>`** | Yêu cầu quét nghiệm thu video thủ công | KOC / Chuyên viên B2C |
| **`/bbnt`** | Kiểm tra điều kiện lập Biên bản nghiệm thu và thanh toán cho Deal của nhóm | KOC / Chuyên viên B2C |
| **`/link <Mã Deal>`** | Gán nhóm Zalo hiện tại vào Mã Deal (vd: `/link BO2610-18492`) | Chuyên viên B2C / Admin |
| **`/status`** | Kiểm tra tiến độ Deal, trạng thái nhận mẫu, duyệt kịch bản và nghiệm thu | Tất cả thành viên |
| **`/help`** | Hiển thị bảng tra cứu câu lệnh của Bot | Tất cả thành viên |

---

## 7. Hướng dẫn Test & Triển khai Local cho Dev Team

### Cách 1: Chạy Kịch bản Giả lập Tự động (Khuyến nghị cho Dev)
Không cần cài đặt webhook hay mở ngrok, chạy trực tiếp test suite giả lập 12 ca kiểm thử:
```bash
cd web-admin
npx tsx --tsconfig tsconfig.json ../scripts/test_zalo_bot_aircheck_simulation.ts
```
*Kết quả mong đợi:* `12/12 TEST CASES ĐẠT CHUẨN (FAILED: 0)`.

### Cách 2: Test bằng cURL qua Terminal
Chạy máy chủ dev: `npm run dev` (cổng 3000), sau đó gửi lệnh:

```bash
curl -X POST http://localhost:3000/api/integrations/zalo-bot/webhook \
  -H "Content-Type: application/json" \
  -H "x-bot-api-secret-token: your_zalo_bot_secret_token" \
  -d '{
    "result": {
      "message": {
        "chat": { "id": "test_dev_group", "title": "Dev Test Group" },
        "from": { "id": "dev_user", "display_name": "Tester" },
        "text": "https://www.tiktok.com/@po.trann77/video/7429881122334455667"
      }
    }
  }'
```

---

## 8. Hướng dẫn Bàn giao cho Dev Team
1. Cung cấp file tài liệu này (`docs/ZALO_BOT_AUTOMATED_AIRCHECK_PACKAGE.md`) cho nhóm lập trình.
2. Dev Team cấu hình các biến môi trường trong Mục 3 vào file `.env.local`.
3. Chạy lệnh kiểm thử tại Mục 7 để xác nhận engine chạy xanh 100%.
4. Triển khai Webhook URL trên Zalo Bot Developer Console: `https://<DOMAIN_CUA_BAN>/api/integrations/zalo-bot/webhook`.
