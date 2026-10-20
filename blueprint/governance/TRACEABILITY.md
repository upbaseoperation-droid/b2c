# MA TRẬN TRUY VẾT YÊU CẦU — B2C OPS HUB

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | HUB-GOV-03 |
| Dự án | B2C Ops Hub |
| Trạng thái | Đang dùng — đã có cột FR và TC; US chưa có (HUB-2.2) |
| Cập nhật | 20/10/2026 |

Điều kiện G2: không còn BR nào thiếu FR. Điều kiện G4: không còn FR *Must* nào thiếu TC đạt.

## 1. BR → FR → TC

FR ở [HUB-2.1 §3](../2-design/2.1_SRS_B2C_OPS_HUB.md); TC ở [HUB-2.8 §3](../2-design/2.8_TEST_STRATEGY.md).

| BR | Tóm tắt | Nguồn | Quyết định | OI | FR | US | Thiết kế | TC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BR-01 | Danh mục SLA chuẩn, một nguồn | Pain point Sheet1, Sheet5 | — | OI-002 | FR-002 | — | HUB-2.1 §2.1 | — |
| BR-02 | Đo SLA theo người/store/đợt, biết việc đang chờ ai | Sheet1; khảo sát nhân viên | — | OI-002, OI-009 | FR-001, FR-002, FR-006, FR-035 | — | HUB-2.1 §2.1–2.2 | TC-011 (FR-035) |
| BR-03 | 5–7 chỉ số, hiệu quả và chất lượng, theo team | Sheet1; HUB-1.6 | — | OI-003 | FR-003, FR-004, FR-005, FR-006, FR-007, FR-008 | — | HUB-2.1 §2.2 | TC-010, TC-011 |
| BR-04 | Tách năng lực và kết quả | Sheet3 | — | OI-016 | FR-050 | — | HUB-2.1 §2.7 | — |
| BR-05 | Workload/capacity theo store, độ khó | Sheet3; 4P xlsx | — | OI-008 | FR-008, FR-011, FR-015, FR-050, FR-051 | — | HUB-2.1 §2.3, 2.7–2.8 | TC-011, TC-012 |
| BR-06 | Phân công, owner/backup, KPI quản lý cấp trung | Sheet1, Sheet3; khảo sát | — | — | FR-001, FR-012, FR-013, FR-014, FR-070 | — | HUB-2.1 §2.3; HUB-2.6 | TC-005, TC-011, TC-014 |
| BR-07 | Báo cáo tuần/tháng tự động | Sheet5; khảo sát | — | OI-004, OI-013 | FR-003, FR-005, FR-016, FR-041 | — | HUB-2.1 §2.2–2.3, 2.6 | TC-010 |
| BR-08 | P2/P3 từ dữ liệu theo chính sách đã duyệt | Sheet1, Sheet5 | — | OI-006 | FR-050 | — | HUB-2.1 §2.7 | — |
| BR-09 | Bảng điểm/thi đua công khai | Sheet3 | — | OI-007 | — | — | — | — |

Tất cả BR ở trạng thái **Đề xuất**; cột *Quyết định* điền `DEC-` khi owner nghiệp vụ xác nhận. BR-09 chưa có FR là chủ ý (chờ OI-007).

## 2. FR không có BR gốc

Các FR sau được xây trong mã nguồn nhưng không truy về BR nào; phần lớn nằm trong mục *Ngoài phạm vi* của [BRD §4](../1-requirements/1.7_BRD_OPS_HUB.md). Cần owner nghiệp vụ bổ sung BR hoặc đánh dấu hủy — xem đề xuất `DEC-007`.

| FR | Phân hệ | TC |
| --- | --- | --- |
| FR-010 | Chiến dịch | — |
| FR-020, FR-021 | Listing KOC → Deal | TC-010, TC-011 |
| FR-022, FR-023 | Deal đa nền tảng, P&L | — |
| FR-030 → FR-034 | Hợp đồng, weSign, OCR | TC-001 → TC-006 |
| FR-040, FR-042 | Hồ sơ Brand, cổng đối tác | TC-007 → TC-009 |
| FR-060 → FR-063 | Nghiên cứu, đánh giá KOC, prompt, chấm điểm KOC | TC-013 (FR-063) |
