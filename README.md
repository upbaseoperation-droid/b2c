# B2C OPS HUB — HỆ THỐNG QUẢN TRỊ & ĐIỀU HÀNH PHÒNG MARKETING B2C

> **Trạng thái 14/10/2026:** Giai đoạn 2 — Phân tích & Thiết kế kỹ thuật. Hệ thống đang hoàn thiện và vận hành mã nguồn tại `web-admin/` với đầy đủ đặc tả phần mềm ([HUB-2.1 SRS](blueprint/2-design/2.1_SRS_B2C_OPS_HUB.md)), tích hợp API ([HUB-2.5](blueprint/2-design/2.5_INTEGRATION_SPEC.md)) và phân quyền ([HUB-2.6](blueprint/2-design/2.6_AUTH_AND_RBAC_SPEC.md)).

---

## 1. Mục tiêu hệ thống

B2C Ops Hub là nền tảng quản trị và điều phối vận hành tập trung cho khối Marketing B2C tại UpBase:
- **Quản lý đa tầng:** Brand (Thương hiệu) → Gian hàng (Store/Platform) → Đợt Booking (Campaign) → Video/Nội dung → Nhân sự thực thi.
- **Phân bổ & Kiểm soát ngân sách:** Quản lý trần PnL 69 gian hàng B2C, phân rã chỉ tiêu Paid/FOC, kiểm soát hạn mức chi phí Net/Gross.
- **Tiến độ & Đo lường SLA:** Theo dõi từng chặng bàn giao từ nhận order đến nghiệm thu bài đăng, định vị chính xác điểm nghẽn.
- **Cổng đối tác tập trung (Partner Hub):** Kết nối 2 chiều giữa thương hiệu và đội ngũ vận hành nội bộ.

---

## 2. Tài liệu hệ thống & Quy chuẩn vận hành

- **Quy tắc vận hành & đồng bộ tài liệu:** [GEMINI.md](GEMINI.md) (Tuân thủ nguyên tắc "Code đổi - Doc cập nhật trong cùng một lượt").
- **Sổ đăng ký tài liệu:** [blueprint/README.md](blueprint/README.md).
- **Đặc tả yêu cầu phần mềm:** [HUB-2.1 SRS](blueprint/2-design/2.1_SRS_B2C_OPS_HUB.md).
- **Đặc tả tích hợp API:** [HUB-2.5 Integrations](blueprint/2-design/2.5_INTEGRATION_SPEC.md).
- **Đặc tả xác thực & RBAC:** [HUB-2.6 Auth & RBAC](blueprint/2-design/2.6_AUTH_AND_RBAC_SPEC.md).
- **Nhật ký quyết định:** [DECISION_LOG.md](blueprint/governance/DECISION_LOG.md).

---

## 3. Cấu trúc thư mục

```
B2C/
├── GEMINI.md                     # Hướng dẫn & Quy tắc vận hành bắt buộc
├── README.md                     # Tổng quan dự án
├── blueprint/
│   ├── README.md                 # Sổ đăng ký tài liệu hệ thống
│   ├── 1-requirements/           # Hồ sơ khảo sát, hiện trạng & BRD
│   ├── 2-design/                 # Đặc tả kỹ thuật (SRS, Integrations, Auth & RBAC)
│   ├── governance/               # Decision Log, Open Issues, Traceability
│   └── archive/prototype-v0/     # Hồ sơ lưu trữ lịch sử khảo sát
├── web-admin/                    # Ứng dụng quản trị Next.js 15
└── *.xlsx, *.pdf, *.md           # Dữ liệu nguồn & tài liệu khảo sát nghiệp vụ
```

---

## 4. Khởi chạy ứng dụng

```bash
cd web-admin
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`.
Kiểm tra bản dựng: `npm run build`.
