# MA TRẬN TRUY VẾT YÊU CẦU (RTM) — B2C OPS HUB

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | HUB-GOV-03 |
| Dự án | B2C Ops Hub |
| Trạng thái | **Chính thức v1.1 — Đồng bộ 100% với `HUB-1.7` (BRD v1.0) & `HUB-2.1` (SRS v2.6)** |
| Owner | `@it-business-analyst` & Team DX |
| Cập nhật | 31/10/2026 |
| Phiên bản | 1.1 |

Điều kiện cổng **G2**: Mọi `BR` đều truy vết tới `FR` và `US` ([HUB-2.2](../2-design/2.2_USER_STORIES.md)).
Điều kiện cổng **G4**: Mọi `FR` mức *Must* đều có `TC` tự động đạt 100% ([HUB-2.8](../2-design/2.8_TEST_STRATEGY.md)) và kịch bản nghiệm thu UAT ([HUB-4.1](../4-test/4.1_UAT_TEST_CASES.md)).

---

## 1. Ma Trận Truy Vết Chính: `BR` → `FR` → `US` → `Thiết Kế` → `TC`

- Yêu cầu nghiệp vụ (`BR-01` → `BR-14`): [HUB-1.7 BRD Ops Hub v1.0](../1-requirements/1.7_BRD_OPS_HUB.md)
- Yêu cầu chức năng (`FR-001` → `FR-085`): [HUB-2.1 SRS v2.6 §3](../2-design/2.1_SRS_B2C_OPS_HUB.md)
- User Stories & Gherkin AC (`US-001` → `US-024`): [HUB-2.2 User Stories](../2-design/2.2_USER_STORIES.md)
- Kiểm thử tự động & UAT (`TC-001` → `TC-024`): [HUB-2.8 Chiến lược kiểm thử](../2-design/2.8_TEST_STRATEGY.md) & [HUB-4.1 Kịch bản UAT](../4-test/4.1_UAT_TEST_CASES.md)

| Mã BR | Tóm tắt Quy tắc Nghiệp vụ (`HUB-1.7 v1.0`) | Quyết định / OI | Mã FR (`HUB-2.1 v2.6`) | Mã User Story (`HUB-2.2`) | Thiết kế & Mô hình | Mã Test Case (`HUB-2.8` / `HUB-4.1`) | Trạng thái Kiểm thử |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **BR-01** | Kiểm soát Tiến độ Giải ngân Ngân sách (`Under-spend` `< 50%` báo đỏ, `< 80%` giải trình; chi `0đ` không gắn nhãn "Trong hạn mức"; `Unbudgeted Spend`) & Tách Gross/Net | `DEC-006`, `DEC-011`, OI-003 | `FR-003`, `FR-004`, `FR-005`, `FR-006`, `FR-007`, `FR-018` | `US-003`, `US-004`, `US-005` | `HUB-2.1 §2.2`; `HUB-2.3` | `TC-010`, `TC-011`, `TC-018`, `TC-024` | ✅ Đạt (Auto + UAT) |
| **BR-02** | Lập Kế hoạch Tháng 2 Nhánh Song song (`4.1` → `4.1.1` theo Lát cắt Nhân sự / Tuần / Bậc KL & `Plan Brand 1-Sheet 01→05`) | `DEC-006`, `DEC-011`, OI-015 | `FR-011`, `FR-013`, `FR-016`, `FR-017`, `FR-018` | `US-006`, `US-007`, `US-008` | `HUB-2.1 §2.3`; `HUB-2.4` | `TC-010`, `TC-011`, `TC-012`, `TC-024` | ✅ Đạt (Auto + UAT) |
| **BR-03** | Quy trình Phê duyệt Nội bộ 2 Tầng (Leader 8 gian `Nguyễn Thị Ngọc Tâm` sơ duyệt → GĐ MKT `Đặng Thị Yến Nhi` duyệt cuối) trước khi gửi Brand | `DEC-011`, OI-001 | `FR-012`, `FR-070` | `US-007`, `US-017` | `HUB-2.1 §2.3`; `HUB-2.6 (RBAC)` | `TC-005`, `TC-011`, `TC-014` | ✅ Đạt (Auto + UAT) |
| **BR-04** | Phối hợp Linh hoạt 2 Chiều giữa Định hướng Content (`BR-01..BR-N`, Danh mục SP/Combo 2 tầng) và Chuẩn bị Listing KOC | `DEC-011`, OI-011 | `FR-010`, `FR-020`, `FR-040`, `FR-063` | `US-006`, `US-009`, `US-015` | `HUB-2.1 §2.4, §2.6`; `HUB-2.18` | `TC-007`, `TC-011`, `TC-013` | ✅ Đạt (Auto + UAT) |
| **BR-05** | Trình duyệt Nhãn hàng 100% qua Google Sheet 57 Cột (3 đợt 10–20–30, SLA 48h, đối khớp `Row ID` 1-1; đóng Cổng Brand Hub độc lập) | `DEC-007`, `DEC-010`, `DEC-011`, OI-002 | `FR-001`, `FR-002`, `FR-020`, `FR-021`, `FR-083` | `US-001`, `US-002`, `US-009`, `US-023` | `HUB-2.1 §2.1, §2.4`; `HUB-2.5` | `TC-011`, `TC-017`, `TC-023`, `TC-024` | ✅ Đạt (Auto + UAT) |
| **BR-06** | Phân nhánh Quy trình Chốt KOC theo Bậc KL (`KL1–KL4` duyệt trước báo sau, `KL5–KL7` check lịch trước, `FOC 0đ` chốt thẳng) & Kéo Job Treo Tháng Cũ không trừ ngân sách tháng mới | `DEC-009`, `DEC-011` | `FR-021`, `FR-022`, `FR-024` | `US-010`, `US-011` | `HUB-2.1 §2.4`; `HUB-2.4` | `TC-011`, `TC-023`, `TC-024` | ✅ Đạt (Auto + UAT) |
| **BR-07** | Ranh giới Hệ thống: Gửi hàng mẫu thực hiện trên Hệ thống UPS Công ty (không quản lý vận đơn/tồn kho mẫu trên B2C Ops Hub) | `DEC-011` | `FR-035` *(Đã đóng Sample Tracker nội bộ)* | — | `HUB-2.1 §2.5`; `HUB-2.3 §5` | — | ✅ Đã đóng theo ranh giới UPS |
| **BR-08** | Quản lý Hợp đồng 3 Chặng (`1. HĐNT` độc lập Brand/Deal → `2. Phụ lục SOW` → `3. BBNT`), Đàm phán Google Docs 3 Chặng Redline từng từ & Ký số MISA WeSign | `DEC-007`, `DEC-009`, `DEC-011` | `FR-030`, `FR-031`, `FR-032`, `FR-033`, `FR-034`, `FR-036` | `US-012`, `US-013`, `US-014` | `HUB-2.1 §2.5, §2.10`; `HUB-2.20` | `TC-001` → `TC-006`, `TC-023`, `TC-024` | ✅ Đạt (Auto + UAT) |
| **BR-09** | Duyệt Kịch bản & Video Demo 2 Vòng phân tầng theo Bậc KL (`DIRECTIVE` cho `KL1–KL5`/Self vs `VETTING_GUARDRAILS` cho `KL6–KL7`; `FOC 0đ` không bắt buộc duyệt Demo) | `DEC-011` | `FR-020`, `FR-023` | `US-009`, `US-010`, `US-024` | `HUB-2.1 §2.4`; `HUB-2.18` | `TC-011`, `TC-023` | ✅ Đạt (Auto + UAT) |
| **BR-10** | Nghiệm thu 2 Bước Tuần tự trên TikTok (`Main Video` + `Add-ons`, tự cấn trừ `DROPPED`), Nghiệm thu 1 giá trọn gói Đa Sàn (`Shopee Video`, `Threads`, `FB`, `IG`), Kênh Tự Xây CTV & Bot Zalo | `DEC-009`, `DEC-011` | `FR-023`, `FR-034`, `FR-080`, `FR-084`, `FR-085` | `US-011`, `US-014`, `US-020`, `US-024` | `HUB-2.1 §2.5, §2.13–2.14, §2.18`; `HUB-2.5` | `TC-003`, `TC-016`, `TC-020`, `TC-023` | ✅ Đạt (Auto + UAT) |
| **BR-11** | Hạn Nghiệm thu 7 Ngày Làm Việc, Khóa Sổ Tháng (`WORKDAY(EOMONTH(AirDate,0),3)`) & Mở Khóa 2 Đợt (`Ngày LV 4–5` / `Ngày LV 10–11`) | `DEC-010`, `DEC-011`, OI-002 | `FR-023`, `FR-083` | `US-011`, `US-023` | `HUB-2.1 §2.5, §2.13` | `TC-023`, `TC-024` | ✅ Đạt (Auto + UAT) |
| **BR-12** | Tạm ứng (khi SOW chọn *"Thanh toán 2 đợt"*), ĐNTT Quyết toán Lark, Cổng Đối soát Giải ngân Tập trung 1 Màn hình cho Kế toán, Trả Mã Bill UNC & Hậu kiểm D14/D30/D60 | `DEC-009`, `DEC-011`, OI-019 | `FR-023`, `FR-031`, `FR-032`, `FR-081` | `US-011`, `US-012`, `US-021`, `US-024` | `HUB-2.1 §2.5, §2.10, §2.15`; `HUB-2.5` | `TC-001`, `TC-003`, `TC-021`, `TC-023`, `TC-024` | ✅ Đạt (Auto + UAT) |
| **BR-13** | Liên thông Data Warehouse Công ty (Source of Truth cho KOC Master, Đa kênh MXH, `1–N` Hồ sơ pháp lý) & Lưu trữ Đánh giá/Lịch sử Đàm phán KOC Nội bộ B2C | `DEC-009`, `DEC-011`, OI-013 | `FR-060`, `FR-061`, `FR-062`, `FR-082`, `NFR-04` | `US-019`, `US-022` | `HUB-2.1 §2.11–2.12, §2.16`; `HUB-2.20` | `TC-014`, `TC-022`, `TC-024` | ✅ Đạt (Auto + UAT) |
| **BR-14** | Phân công Nhân sự Phụ trách Gian hàng (1 PIC chính + Hỗ trợ) & 3 Vị trí Cấp Brand (`Plan/Strategy`, `Content Main`, `KV/SIS`) — Tạm hoãn Thang đo Điểm Workload sang Giai đoạn sau | `DEC-008`, `DEC-011`, OI-006, OI-007, OI-008 | `FR-008`, `FR-014`, `FR-015`, `FR-050`, `FR-051`, `FR-070` | `US-005`, `US-008`, `US-017`, `US-018` | `HUB-2.1 §2.3, §2.7–2.8`; `HUB-2.6` | `TC-011`, `TC-014`, `TC-019`, `TC-024` | ✅ Đạt (Phân công PIC/Brand đang bật; Điểm Workload tạm hoãn) |

---

## 2. Kết Quả Kiểm Toán Truy Vết (ITBA Traceability Audit)

- **Yêu cầu nghiệp vụ (`BR-01` → `BR-14`):** 100% đồng bộ giữa [HUB-1.7 BRD v1.0](../1-requirements/1.7_BRD_OPS_HUB.md) và [HUB-2.1 SRS v2.6](../2-design/2.1_SRS_B2C_OPS_HUB.md).
- **Yêu cầu chức năng mồ côi (Orphan `FR-nnn`):** **`0`**. Các tính năng cũ đã đóng (`FR-035` Sample Tracker, `FR-042` Brand Hub, `FR-051` Bản đồ 3D) hoặc tạm hoãn (`FR-050` Điểm Workload) đều được ghi chú trạng thái tường minh.
- **Độ phủ Kiểm thử tự động (`TC-001` → `TC-024`) & Kịch bản UAT (`UAT-01` → `UAT-08`):** **100%** (`137/137 pass`).

---

## 3. Lịch sử thay đổi

| Phiên bản | Ngày | Người sửa | Nội dung |
| --- | --- | --- | --- |
| 0.1 | 20/10/2026 | Team DX | Tạo bảng truy vết sơ bộ BR → FR → TC. |
| 1.0 | 24/10/2026 | `@it-business-analyst` | Hoàn thiện truy vết đầu-cuối tới 24 User Stories (`US-001` → `US-024` trong `HUB-2.2`). |
| 1.1 | 31/10/2026 | `@it-business-analyst` | Đồng bộ 14 yêu cầu nghiệp vụ nền tảng (`BR-01` → `BR-14`) theo `HUB-1.7 BRD v1.0`, `HUB-2.1 SRS v2.6` và quyết định `DEC-011` (`137/137 pass`). |
