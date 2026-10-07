# web-admin — PROTOTYPE V0 (KHÔNG PHẢI SẢN PHẨM)

Prototype giao diện của B2C Ops Hub, dùng để khảo sát và thử UX (`HUB:DEC-002`). Quy trình: [SDLC-00](../../sdlc/00_SDLC_PROTOCOL.md) nguyên tắc 5.

## Hiện trạng (rà soát 30/09/2026)

- **Không lưu dữ liệu.** State nằm trong `src/app/page.tsx` (React `useState`), khởi tạo từ `src/lib/mockData.ts`. Code không gọi `prisma` hay `supabase` ở đâu cả. Tải lại trang là mất hết.
- `prisma/schema.prisma` (38 model) là bản nháp, **chưa được duyệt**. Mô hình `BookingDeal`–`Contract` một-một trái với BRD (HĐNT + phụ lục).
- **Không có đăng nhập.** Vai trò chọn bằng dropdown ở header.
- Import Excel, "đồng bộ Lark", "Lark Approval", magic link portal brand đều là giả lập.
- `src/app/api/ai/employee-review` không xác thực người gọi, dùng key AI của server và nhận key từ client. **Không deploy public** khi chưa sửa.
- `tsc` sạch; `eslint` báo 44 lỗi và 213 cảnh báo; nhiều component vượt 1.000 dòng.

## Chạy

```bash
npm install
npm run dev
```

## Quy tắc

- Không dùng dữ liệu thật (danh bạ KOC, CCCD, tài khoản ngân hàng).
- Không dùng làm cơ sở mã sản phẩm trước khi dự án qua G2. Thiết kế sản phẩm nằm ở `B2C/blueprint/2-design/` (chưa tạo).
