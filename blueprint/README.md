# SỔ ĐĂNG KÝ TÀI LIỆU — B2C OPS HUB

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | HUB-REG |
| Dự án | B2C Ops Hub — quản trị phòng Marketing B2C |
| Giai đoạn hiện tại | **1 — Yêu cầu** (chưa qua G1) |
| Cập nhật | 30/09/2026 |

Danh sách **mọi tài liệu bắt buộc** theo [SDLC-00](../../sdlc/00_SDLC_PROTOCOL.md), kể cả tài liệu chưa tạo. Cập nhật bảng này mỗi khi tạo tài liệu hoặc đổi trạng thái.

## Trạng thái cổng

| Cổng | Trạng thái | Điều kiện còn thiếu |
| --- | --- | --- |
| G1 | **Chưa đạt** | Chưa có chủ dự án/owner nghiệp vụ; 7 open issue chặn G1 ([OPEN_ISSUES](governance/OPEN_ISSUES.md)); BRD mới là nháp đề xuất; chưa có số gốc; khảo sát Brand/Content/liên phòng ban chưa xong |
| G2–G5 | Chưa bắt đầu | — |

## Dùng chung

| Tài liệu | Trạng thái |
| --- | --- |
| [SDLC-00 Quy trình](../../sdlc/00_SDLC_PROTOCOL.md) | Nháp |
| [SDLC-01 Glossary & số liệu chuẩn](../../sdlc/01_GLOSSARY.md) | Nháp — có mâu thuẫn |
| [SDLC-02 Ranh giới hệ thống](../../sdlc/02_SYSTEM_BOUNDARY.md) | Đề xuất |
| [SDLC-03 Mẫu tài liệu](../../sdlc/03_DOCUMENT_TEMPLATES.md) | Nháp |

## Governance

| Mã | Tài liệu | Trạng thái |
| --- | --- | --- |
| HUB-GOV-01 | [Decision log](governance/DECISION_LOG.md) | Đang dùng — 5 mục |
| HUB-GOV-02 | [Open issues](governance/OPEN_ISSUES.md) | Đang dùng — 16 mục, 7 chặn G1 |
| HUB-GOV-03 | [Ma trận truy vết](governance/TRACEABILITY.md) | Đang dùng — mới có cột BR |

## Giai đoạn 1 — Yêu cầu

| Mã | Tài liệu | Trạng thái | Owner | Ghi chú |
| --- | --- | --- | --- | --- |
| HUB-1.1 | [Project Charter](1-requirements/1.1_PROJECT_CHARTER.md) | Nháp | _chưa gán_ | Thiếu chủ dự án, mốc, số gốc |
| HUB-1.2 | [Stakeholder & RACI](1-requirements/1.2_STAKEHOLDERS_AND_RACI.md) | Nháp | Team DX | Dùng chung với UpAffiliate; nhiều ô `?` |
| HUB-1.3 | [Hiện trạng (As-is)](1-requirements/1.3_AS_IS_CURRENT_STATE.md) | Nháp | Team DX | Dùng chung với UpAffiliate |
| HUB-1.4 | [Bộ câu hỏi discovery — Giám đốc khối](1-requirements/1.4_DISCOVERY_GUIDE_GIAM_DOC_KHOI.md) | Sẵn sàng dùng | Team DX | Công cụ khảo sát |
| HUB-1.5 | [Bảng câu hỏi — nhân viên kỳ cựu](1-requirements/1.5_DISCOVERY_GUIDE_NHAN_VIEN_KY_CUU.md) | Sẵn sàng dùng | Team DX | Công cụ khảo sát |
| HUB-1.6 | [Mục tiêu vận hành (bản thảo luận)](1-requirements/1.6_OPERATING_GOALS.md) | Nháp — giả thuyết | Team DX | Chờ Giám đốc khối chọn 3 mục tiêu (OI-010) |
| HUB-1.7 | [BRD Ops Hub](1-requirements/1.7_BRD_OPS_HUB.md) | Nháp đề xuất | _chưa gán_ | 9 BR rút từ khảo sát, chưa xác nhận |
| HUB-1.8 | Số đo gốc (baseline) | **Chưa tạo** | _chưa gán_ | Xem HUB-1.3 mục 6 |

Tài liệu gốc (giữ nguyên ở `B2C/`): `Pain point Marketing B2C.xlsx`, `4P Marketing B2C.xlsx`, `Bang_Danh_Gia_Workload_Va_Hieu_Suat_MKT_B2C.xlsx`, `Các SLA B2C.pdf`, `Định hướng Marketing B2C _ Cơ cấu team.pdf`, `Quy trình Booking - Tech.md`, `MeUp_Playbook_02_Booking_KOC.docx`, `Luồng quản lý job/`.

## Giai đoạn 2 — Phân tích & thiết kế (chưa bắt đầu, chờ G1)

| Mã | Tài liệu | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| HUB-2.1 | SRS (FR/NFR) | Chưa tạo | Định nghĩa từng chỉ số: công thức, mẫu số, thời điểm chốt |
| HUB-2.2 | User stories + tiêu chí nghiệm thu | Chưa tạo | — |
| HUB-2.3 | Kiến trúc + ADR | Chưa tạo | ADR đầu tiên: giữ hay chọn lại stack của prototype (OI-012) |
| HUB-2.4 | Mô hình dữ liệu | Chưa tạo | Store, phân công, SLA catalog, chỉ số; bản sao dữ liệu booking chỉ đọc |
| HUB-2.5 | Đặc tả tích hợp IF-03, IF-04 (+ đọc Lark) | Chưa tạo | Phụ thuộc UpAffiliate |
| HUB-2.6 | Bảo mật & phân quyền | Chưa tạo | Dữ liệu đánh giá nhân sự; ai xem điểm của ai |
| HUB-2.7 | Đặc tả UX | Chưa tạo | Tham khảo màn hình prototype (archive) |
| HUB-2.8 | Chiến lược kiểm thử | Chưa tạo | — |
| HUB-2.9 | Kế hoạch phát hành & backlog | Chưa tạo | — |

## Giai đoạn 3–6 (chưa bắt đầu)

| Mã | Tài liệu | Trạng thái |
| --- | --- | --- |
| HUB-4.1 | Test cases & báo cáo kiểm thử | Chưa tạo |
| HUB-4.2 | Kế hoạch & biên bản UAT | Chưa tạo |
| HUB-5.1 | Runbook triển khai & rollback | Chưa tạo |
| HUB-6.1 | SOP Lead (phân công, xem SLA, xử lý cảnh báo) | Chưa tạo |
| HUB-6.2 | Hướng dẫn nhân viên (xem chỉ số, sửa số sai) | Chưa tạo |
| HUB-6.3 | Báo cáo lợi ích so với baseline | Chưa tạo |

## Prototype và lưu trữ

| Mục | Vị trí | Trạng thái |
| --- | --- | --- |
| Prototype v0 | `B2C/web-admin` | Chỉ dùng khảo sát, thử UX (`DEC-002`) |
| Đặc tả prototype 01–07 | [archive/prototype-v0](archive/prototype-v0/README.md) | Lưu trữ (`DEC-003`) |
| Prototype tĩnh cũ | `B2C/app/` | Lưu trữ |
