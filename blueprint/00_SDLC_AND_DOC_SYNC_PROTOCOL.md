# QUY CHUẨN PHÁT TRIỂN PHẦN MỀM (SDLC) & NGUYÊN TẮC ĐỒNG BỘ TÀI LIỆU
## Dự Án: Hệ Thống Quản Trị Marketing B2C Upbase (Upbase B2C Operations Hub)

---

## 📌 1. NGUYÊN TẮC BẮT BUỘC: ĐỒNG BỘ TÀI LIỆU (DOCUMENTATION SYNCHRONICITY)

> 🔴 **MANDATORY RULE:** Bất kỳ thay đổi nào liên quan đến kiến trúc, cơ sở dữ liệu, API, nghiệp vụ hay mã nguồn đều **BẮT BUỘC PHẢI CẬP NHẬT ĐỒNG BỘ TẤT CẢ TÀI LIỆU LIÊN QUAN TRONG CÙNG MỘT TASK**.
> ❌ Viết code mà không cập nhật tài liệu = **VI PHẠM QUY CHUẨN (PROTOCOL VIOLATION)** và công việc bị coi là **CHƯA HOÀN THÀNH**.

### Ma Trận Kiểm Tra Chéo Cập Nhật Tài Liệu:
| Loại thay đổi | Tài liệu BẮT BUỘC phải cập nhật |
| :--- | :--- |
| **Kiến trúc hệ thống / Tech stack mới** | `README.md`, `03_DATABASE_AND_SYSTEM_ARCHITECTURE.md`, `MEMORY.md` |
| **Cơ sở dữ liệu / Bảng mới / Cột mới** | `schema.prisma`, `03_DATABASE_AND_SYSTEM_ARCHITECTURE.md`, `seed.ts` |
| **Quy trình bàn giao 3 team / Chuẩn SLA** | `01_HANDOFF_MATRIX_AND_SLA.md` |
| **Luồng hợp đồng KOC / Tạm ứng tài chính**| `02_CONTRACT_AUTOMATION_SPEC.md` |
| **Công thức thi đua / Leaderboard** | `04_GAMIFICATION_AND_LEADERBOARD.md` |
| **Quy chuẩn thiết kế UI / Design System** | `05_DESIGN_SYSTEM_SPEC.md` |
| **Hệ thống Tài khoản & Phân quyền (RBAC)** | `06_AUTH_AND_RBAC_SPEC.md` |
| **Quy trình phát triển & Kiểm thử** | `00_SDLC_AND_DOC_SYNC_PROTOCOL.md` |

---

## 🏛️ 2. QUY TRÌNH PHÁT TRIỂN PHẦN MỀM CHUẨN (SDLC 6 GIAI ĐOẠN)

### Giai Đoạn 1: Phân Tích & Đặc Tả Yêu Cầu (Requirements Engineering)
* **Đầu vào:** Khảo sát hiện trạng, phỏng vấn nhân sự (`Pain point Marketing B2C.xlsx`), dữ liệu vận hành 19.000 dòng KOCs.
* **Đầu ra:**
  * Tài liệu BRD (Business Requirements Document).
  * Danh sách User Stories với tiêu chí nghiệm thu (Acceptance Criteria - AC) cho 5 nhóm vai trò: *Brand, Content, Booking, Accountant, Manager*.

### Giai Đoạn 2: Thiết Kế Hệ Thống & CSDL Chi Tiết (Architectural & DB Design)
* **High-Level Design (HLD):** Kiến trúc phân tán (Decoupled): Next.js App Router ➔ Prisma ORM ➔ Supabase PostgreSQL (Port 6543) ➔ Vercel Cloud.
* **Low-Level Design (LLD):**
  * Mô hình CSDL 8 thực thể quan hệ (`schema.prisma`).
  * Cơ chế đánh Index cho `KocProfile` và `BookingDeal` để đạt tốc độ truy vấn < 30ms.
  * Phân quyền RBAC (Role-Based Access Control).

### Giai Đoạn 3: Phát Triển Theo Sprint (Sprint-Based Agile Development)
* **Sprint 1 (Core DB & KOC CRM):** Supabase connection, Prisma migration, seed 5.708 KOCs, bảng tra cứu KOC không giật lag.
* **Sprint 2 (Booking Engine & Auto Contract):** Quick Book Modal (4 trường, 30s), Auto-split tạm ứng 2tr/8tr, Engine sinh hợp đồng PDF chuẩn pháp lý.
* **Sprint 3 (Handoff Pipeline & Content Review):** Campaign Brief chuẩn của Brand, Script Review Queue (SLA 24h) của Content, Sample Dispatch Tracker.
* **Sprint 4 (Manager Tower, Gamification & Smart Import):** SLA Bottleneck Radar, Workload Balancing, Leaderboard thời gian thực, Smart Bulk Excel Ingestion (Zero-API).

### Giai Đoạn 4: Đảm Bảo Chất Lượng & Kiểm Thử (QA & Testing)
* **Unit Test:** Thuật toán chia tiền tạm ứng, công thức Leaderboard, bộ đếm ngược SLA.
* **Integration Test:** Type-safe queries Prisma, Supabase Auth/Storage.
* **E2E Test (Playwright):** Luồng Happy Path từ tạo deal ➔ duyệt tạm ứng ➔ duyệt script ➔ nghiệm thu video.

### Giai Đoạn 5: Đóng Gói, CI/CD & Triển Khai (DevOps & Deployment)
* Quản trị 3 môi trường: `Local Dev`, `Staging (UAT)`, `Production (Vercel)`.
* Pipeline GitHub Actions tự động kiểm tra `lint`, `typecheck`, `test` và `prisma validate` trước khi merge.

### Giai Đoạn 6: Nghiệm Thu UAT, Đào Tạo & Vận Hành (Handover & SOP)
* Thực hiện UAT thực tế với 5 nhân sự đại diện 5 vai trò.
* Ban hành bộ tài liệu Quy trình Vận hành Chuẩn (SOP).
* Thiết lập hệ thống cảnh báo lỗi (Monitoring & Error Tracking).
