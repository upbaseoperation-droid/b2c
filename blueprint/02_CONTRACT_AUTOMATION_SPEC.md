# ĐẶC TẢ TỰ ĐỘNG HÓA HỢP ĐỒNG & THANH TOÁN TẠM ỨNG KOC
## Giải pháp giải phóng thao tác thủ công cho Booking Execution Team

> **Cập nhật yêu cầu 24/09/2026 — SDLC giai đoạn 1:** Luồng bên dưới mô tả thiết kế prototype cũ, sinh một hợp đồng cho mỗi BO. Yêu cầu đã xác nhận hiện là **HĐNT với KOC → phụ lục/SOW gom các BO cùng KOC, cùng tháng (không phụ thuộc brand/store) → phụ lục bổ sung cho BO phát sinh sau khi phụ lục tháng đã ký**. Thanh toán theo phụ lục/SOW; từng BO giữ chi phí để đối soát. Xem [BRD booking đa nền tảng](08_BOOKING_MULTIPLATFORM_BRD.md). Chưa áp dụng luồng cũ để triển khai mới cho đến khi đặc tả chi tiết được cập nhật.

---

## 1. Vấn đề thực tế (Pain Point)
* **Hiện trạng:** Nhân viên booking phải soạn hợp đồng KOC thủ công từng bản Word/Google Doc, sau đó chuyển file qua lại để xin duyệt. 
* **Điểm tắc nghẽn điển hình:** Các deal KOC có chia đợt thanh toán (ví dụ: Giá trị hợp đồng 10.000.000đ, tạm ứng trước 2.000.000đ khi nhận sample/duyệt kịch bản, 8.000.000đ thanh toán sau khi nghiệm thu link video).
* **Hậu quả:** 
  - Không thể tự động gen hợp đồng hàng loạt.
  - Kế toán và Quản lý không biết hợp đồng này là của ai phụ trách, đã trình ký chưa, có bị trễ hạn SLA không.
  - Thất thoát thời gian và rủi ro sai sót thông tin thuế, STK, CCCD của KOC.

---

## 2. Kiến trúc Luồng Tự Động Hóa Hợp Đồng (Contract Pipeline)

```
[Nhân viên Booking] 
       │
       ▼ (1) Điền form thông tin KOC (hoặc chọn KOC từ danh bạ 4 Tier có sẵn)
[Auto Contract Generator]
       │
       ▼ (2) Tự động sinh Hợp đồng PDF chuẩn pháp lý (tự chia đợt: Tạm ứng 2tr / Nghiệm thu 8tr)
[Hệ thống Quản trị]
       │
       ├─► (3) Gửi link xem trước cho KOC xác nhận trực tuyến
       └─► (4) Bắn thông báo Lark Bot tới Kế toán & Lead để phê duyệt trình ký trong 12h
[Kế toán duyệt]
       │
       ▼ (5) Tự động cập nhật trạng thái "Đã chi tạm ứng 2tr" -> Kích hoạt Booking gửi sample
```

---

## 3. Cấu trúc Dữ liệu Hợp đồng (Data Schema)

Mỗi hợp đồng KOC chứa các trường thông tin chuẩn hóa:
```json
{
  "contract_id": "UB-B2C-2026-0901",
  "campaign_id": "CAMP-MEGA-1010",
  "created_by": "Nguyen Van A (Booking Team)",
  "koc_info": {
    "full_name": "Lê Thị B (KOC Beauty)",
    "stage_name": "Chanh Review",
    "tier": "Tier 3 (Micro)",
    "phone": "0987654321",
    "cccd": "001201004567",
    "tax_code": "8472910394",
    "bank_name": "Techcombank",
    "bank_account_number": "1903456789012"
  },
  "deliverables": [
    {
      "platform": "TikTok Video",
      "quantity": 1,
      "requirements": "Gắn link giỏ hàng Shopee/TikTok, 60s review, 3 hashtag bắt buộc"
    }
  ],
  "payment_terms": {
    "total_value": 10000000,
    "stages": [
      {
        "stage": 1,
        "name": "Tạm ứng khi duyệt kịch bản",
        "amount": 2000000,
        "due_trigger": "AFTER_SCRIPT_APPROVAL",
        "status": "PAID"
      },
      {
        "stage": 2,
        "name": "Quyết toán sau nghiệm thu video",
        "amount": 8000000,
        "due_trigger": "AFTER_VIDEO_VERIFICATION",
        "status": "PENDING"
      }
    ]
  },
  "sla_status": {
    "submitted_at": "2026-09-22T09:00:00Z",
    "sla_deadline": "2026-09-22T21:00:00Z",
    "approved_at": "2026-09-22T14:30:00Z",
    "is_on_time": true
  }
}
```

---

## 4. Công Nghệ Sinh Hợp Đồng Điện Tử & Xuất PDF

Hệ thống áp dụng thư viện `jspdf` kết hợp thiết kế A4 chuẩn hoá để xuất file PDF trực tiếp trên trình duyệt:
- **Tự động điền biến số:** `{{koc_name}}`, `{{koc_cccd}}`, `{{koc_bank_account}}`, `{{campaign_name}}`, `{{payment_advance_amount}}`, `{{payment_final_amount}}`, `{{created_by_staff_name}}`.
- **Tích hợp Cổng VietQR Thanh Toán Nhanh:**
  Hệ thống tự động sinh đường dẫn ảnh VietQR động:
  ```
  https://img.vietqr.io/image/[BANK_ID]-[ACCOUNT_NO]-compact2.png?amount=[AMOUNT]&addInfo=UPBASE%20[DEAL_CODE]&accountName=[ACCOUNT_NAME]
  ```
  Kế toán chỉ cần dùng App ngân hàng quét mã là hệ thống tự động điền đúng Số tài khoản, Tên chủ thẻ, Số tiền tạm ứng/tất toán và Cú pháp đối soát.

---

## 5. Quy trình Vận Hành 2 Đợt Thanh Toán Qua Lark Approval API
1. **Đợt 1: Chi Tạm Ứng (Advance Payment — 2.000.000đ hoặc 20%):**
   - Kích hoạt khi: Hợp đồng được ký và kịch bản KOC đã được duyệt sơ bộ.
   - Thao tác: Hệ thống tự động đẩy đơn sang **Lark Approval Open API** (hoặc Kế toán/Lead quét VietQR). Khi duyệt trên Lark, webhook `/api/webhooks/lark-approval` tự động cập nhật trạng thái.
   - Tác động hệ thống: Deal chuyển sang trạng thái `ADVANCE_PAID` (`Đã Chi Cọc - Được Gửi Mẫu`). Booking Team được phép tạo phiếu xuất kho gửi hàng test cho KOC.
2. **Đợt 2: Tất Toán Quyết Toán (Final Settlement — 8.000.000đ):**
   - Kích hoạt khi: Video KOC đã lên sóng, gắn đúng hashtag, giỏ hàng và gửi link nghiệm thu hợp lệ.
   - Thao tác: Hệ thống tự động tạo đơn quyết toán trên Lark Approval. Khi duyệt chi thành công trên Lark, webhook tự động cập nhật trạng thái.
   - Tác động hệ thống: Deal chuyển sang trạng thái `FINAL_PAID` (`Hoàn Tất HĐ`), hệ thống tự động chốt doanh số GMV thực tế và ghi nhận điểm thi đua vào Bảng Vàng (Gamification Leaderboard).

---

## 6. Quy trình Kiểm soát SLA Duyệt Hợp đồng qua Lark Bot
1. **Trigger nộp hợp đồng:** Ngay khi nhân viên bấm "Tạo & Trình ký", hệ thống lưu bản ghi và gửi thông báo dạng tương tác (Card Message) vào nhóm Lark Chat Kế toán / Quản lý.
2. **Nội dung tin nhắn Lark Bot:**
   - 📄 *Hợp đồng mới cần duyệt:* [UB-B2C-2026-0901] - KOC Chanh Review
   - 👤 *Nhân sự phụ trách:* Nguyễn Văn A (Booking Team)
   - 💰 *Tổng giá trị:* 10,000,000 đ (Tạm ứng: 2,000,000 đ)
   - ⏳ *Hạn chót SLA:* 21:00 hôm nay (Còn 6 giờ)
   - 🔘 [Nút Bấm: Xem PDF] | [Nút Bấm: Duyệt Chi Tạm Ứng] | [Nút Bấm: Yêu Cầu Sửa]
3. **Cảnh báo vượt SLA:** Nếu sau 6 giờ chưa ai duyệt, Bot tự động tag Team Lead và Ops Lead để giải quyết tức thì.
