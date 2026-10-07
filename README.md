# B2C OPS HUB — HỆ THỐNG QUẢN TRỊ PHÒNG MARKETING B2C

> **Trạng thái 30/09/2026:** SDLC giai đoạn 1 (yêu cầu), **chưa qua cổng G1**. Chưa có thiết kế kỹ thuật hay mã nguồn sản phẩm được duyệt. `web-admin/` là **prototype v0** chỉ để khảo sát và thử UX, không lưu dữ liệu, không dùng dữ liệu thật (`DEC-002`).

## 1. Dự án

B2C Ops Hub giúp Giám đốc khối và Lead điều hành phòng Marketing B2C bằng dữ liệu, gồm:
- danh mục store và phân công nhân sự (owner/backup);
- workload và capacity;
- danh mục SLA và theo dõi SLA;
- 5–7 chỉ số điều hành;
- báo cáo tuần/tháng;
- dữ liệu cho đánh giá năng lực và kết quả.

Thao tác booking (master KOC, phân rã plan, BO, duyệt brand, hợp đồng, nghiệm thu) thuộc dự án riêng **UpAffiliate** ([`../Upaffiliate`](../Upaffiliate/README.md)), theo quyết định `DEC-001` ngày 30/09/2026. Ranh giới dữ liệu giữa hai dự án: [SDLC-02](../sdlc/02_SYSTEM_BOUNDARY.md).

## 2. Tài liệu

- **Sổ đăng ký tài liệu và trạng thái cổng:** [blueprint/README.md](blueprint/README.md). Đây là điểm bắt đầu.
- Quy trình SDLC, glossary, mẫu tài liệu dùng chung: [`../sdlc`](../sdlc/README.md).
- Quyết định: [blueprint/governance/DECISION_LOG.md](blueprint/governance/DECISION_LOG.md) · Vấn đề mở: [OPEN_ISSUES.md](blueprint/governance/OPEN_ISSUES.md)

## 3. Cấu trúc thư mục

```
B2C/
├── README.md
├── blueprint/
│   ├── README.md                 # Sổ đăng ký tài liệu (register)
│   ├── governance/               # DECISION_LOG, OPEN_ISSUES, TRACEABILITY
│   ├── 1-requirements/           # 1.1 Charter · 1.2 RACI · 1.3 As-is · 1.4–1.5 Discovery · 1.6 Mục tiêu · 1.7 BRD
│   └── archive/prototype-v0/     # Đặc tả 01–07 của prototype (lưu trữ)
├── web-admin/                    # Prototype v0 (Next.js) — không phải sản phẩm
├── app/                          # Prototype tĩnh cũ (HTML/CSS/JS)
├── Luồng quản lý job/            # Ghi chú luồng job có cast (nguồn cho UpAffiliate)
└── *.xlsx, *.pdf, *.docx, *.md   # Tài liệu gốc: khảo sát, quy trình, dữ liệu Lark xuất ra
```

Dữ liệu xuất từ Lark (`B2C_Quản lý Booking*.xlsx|csv`) có thông tin cá nhân của KOC. Không đưa lên dịch vụ ngoài và không dùng làm dữ liệu cho prototype.

## 4. Chạy prototype

```bash
cd web-admin
npm install
npm run dev
```

Mở `http://localhost:3000`. Mọi thay đổi sẽ mất khi tải lại trang. Các tính năng import Excel, "đồng bộ Lark", "Lark Approval" và portal brand chỉ là **giả lập**.

## 5. Quy tắc

Tuân theo [SDLC-00](../sdlc/00_SDLC_PROTOCOL.md): không nhảy giai đoạn; mọi thay đổi yêu cầu, thiết kế hay mã nguồn phải cập nhật tài liệu liên quan trong cùng một thay đổi.
