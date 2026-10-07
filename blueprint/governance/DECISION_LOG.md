# DECISION LOG — B2C OPS HUB

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | HUB-GOV-01 |
| Dự án | B2C Ops Hub |
| Trạng thái | Đang dùng (sổ ghi liên tục) |
| Cập nhật | 30/09/2026 |

Mẫu: [SDLC-03 mục 1.5](../../../sdlc/03_DOCUMENT_TEMPLATES.md#15-decision-log--một-mục). Không xóa mục; quyết định bị thay thế ghi *Thay thế bởi DEC-…*.

---

### DEC-001 — Tách B2C Ops Hub và UpAffiliate thành hai dự án
- Ngày: 30/09/2026 · Người quyết: chủ dự án · Trạng thái: **Đã quyết**
- Quyết định: **B2C Ops Hub** quản trị phòng Marketing B2C (store & phân công, workload/capacity, SLA, chỉ số hiệu suất, P2/P3, báo cáo điều hành). **UpAffiliate** làm booking đa sàn (master KOC, plan chi tiết, BO, duyệt brand, hợp đồng, nghiệm thu).
- Phương án đã cân nhắc: một dự án đặt ở B2C; một dự án đặt ở UpAffiliate.
- Hệ quả: BRD booking đa nền tảng chuyển sang `Upaffiliate/blueprint/1-requirements/1.3`. Ops Hub chỉ **đọc** dữ liệu booking (xem [SDLC-02](../../../sdlc/02_SYSTEM_BOUNDARY.md), `DEC-005`).

### DEC-002 — `B2C/web-admin` là prototype v0, không phải sản phẩm
- Ngày: 30/09/2026 · Trạng thái: **Đề xuất** — chờ chủ dự án xác nhận
- Bối cảnh: rà soát 30/09/2026 cho thấy web-admin không lưu dữ liệu (toàn bộ state trong bộ nhớ trình duyệt, không gọi Prisma/Supabase), dùng dữ liệu giả, import Excel giả lập, không có đăng nhập, API AI không xác thực và dùng key của server, link portal brand dùng token cố định chung.
- Quyết định đề xuất: coi là **prototype v0** dùng để khảo sát và thử UX. Không đưa dữ liệu thật, không triển khai cho người dùng, không dùng làm cơ sở mã sản phẩm trước khi qua G2 (SDLC-00 nguyên tắc 5). Màn hình thuộc phạm vi booking (booking, hợp đồng, brand hub, sample tracker) là tư liệu tham khảo cho UpAffiliate.
- Việc ngay: tắt hoặc bắt xác thực API `/api/ai/employee-review` nếu prototype đang public trên Vercel.

### DEC-003 — Lưu trữ đặc tả 01–07 của prototype
- Ngày: 30/09/2026 · Người quyết: chủ dự án (yêu cầu chuẩn hóa tài liệu theo SDLC) · Trạng thái: **Đã thực hiện**
- Bối cảnh: các đặc tả 01–07 mô tả prototype như đã chạy, số liệu lệch nhau (26/28/30 nhân sự; 4/8/10 thực thể; tạm ứng 2tr/8tr vs 2tr/10tr), phân công cũ (Booking phân rã plan theo 4 Tier) trái với BRD.
- Quyết định: chuyển vào [`archive/prototype-v0/`](../archive/prototype-v0/README.md). Dùng làm tư liệu tham khảo; không làm căn cứ cho giai đoạn 2.

### DEC-004 — Bỏ vai trò kế toán nội bộ trong hệ thống; phê duyệt chi qua Lark Approval
- Ngày: 23/09/2026 (commit `8b0aa46`) · Trạng thái: **Đã quyết**
- Hệ quả: vai trò hệ thống không có "Kế toán"; kế toán vẫn là stakeholder (xem HUB-1.2).

### DEC-005 — Ranh giới dữ liệu Lark / UpAffiliate / B2C Ops Hub
- Ngày: 30/09/2026 · Trạng thái: **Đề xuất** — chờ chủ dự án hai bên duyệt
- Nội dung: [SDLC-02](../../../sdlc/02_SYSTEM_BOUNDARY.md).
