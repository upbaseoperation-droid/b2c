# MA TRẬN TRUY VẾT YÊU CẦU (RTM) — B2C OPS HUB

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | HUB-GOV-03 |
| Dự án | B2C Ops Hub |
| Trạng thái | **Đã hoàn thiện truy vết đầu-cuối (`BR` → `FR` → `US` → `Thiết kế` → `TC`)** |
| Owner | `@it-business-analyst` & Team DX |
| Cập nhật | 24/10/2026 |
| Phiên bản | 1.0 |

Điều kiện cổng **G2**: Mọi `BR` đều truy vết tới `FR` và `US` ([HUB-2.2](../2-design/2.2_USER_STORIES.md)).
Điều kiện cổng **G4**: Mọi `FR` mức *Must* đều có `TC` tự động đạt 100% ([HUB-2.8](../2-design/2.8_TEST_STRATEGY.md)) và kịch bản nghiệm thu UAT ([HUB-4.1](../4-test/4.1_UAT_TEST_CASES.md)).

---

## 1. Ma Trận Truy Vết Chính: `BR` → `FR` → `US` → `Thiết Kế` → `TC`

- Yêu cầu nghiệp vụ (`BR-`): [HUB-1.7 BRD Ops Hub](../1-requirements/1.7_BRD_OPS_HUB.md)
- Yêu cầu chức năng (`FR-`): [HUB-2.1 SRS §3](../2-design/2.1_SRS_B2C_OPS_HUB.md)
- User Stories & Gherkin AC (`US-`): [HUB-2.2 User Stories](../2-design/2.2_USER_STORIES.md)
- Kiểm thử tự động & UAT (`TC-`): [HUB-2.8 Chiến lược kiểm thử](../2-design/2.8_TEST_STRATEGY.md) & [HUB-4.1 Kịch bản UAT](../4-test/4.1_UAT_TEST_CASES.md)

| Mã BR | Tóm tắt Quy tắc Nghiệp vụ | Nguồn | Quyết định / OI | Mã FR (`HUB-2.1`) | Mã User Story (`HUB-2.2`) | Thiết kế & Mô hình | Mã Test Case (`HUB-2.8` / `HUB-4.1`) | Trạng thái Kiểm thử |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **BR-01** | Danh mục SLA chuẩn, một nguồn duy nhất | Pain point Sheet1, Sheet5 | OI-002 | `FR-002`, `FR-083` | `US-002`, `US-023` | `HUB-2.1 §2.1, §2.17` | `TC-017`, `TC-023` | ✅ Đạt (Auto + UAT) |
| **BR-02** | Đo SLA theo người/store/đợt, biết việc đang chờ ai | Sheet1; Khảo sát NV | OI-002, OI-009 | `FR-001`, `FR-002`, `FR-006`, `FR-024`, `FR-035`, `FR-082`, `FR-083` | `US-001`, `US-002`, `US-004`, `US-010`, `US-022`, `US-023` | `HUB-2.1 §2.1–2.5, §2.16–2.17`; `HUB-2.4` | `TC-011`, `TC-016`, `TC-017`, `TC-018`, `TC-022`, `TC-023` | ✅ Đạt (Auto + UAT) |
| **BR-03** | 5–7 chỉ số điều hành (hiệu quả & chất lượng) theo team | Sheet1; `HUB-1.6` | `DEC-006`, OI-003 | `FR-003`, `FR-004`, `FR-005`, `FR-006`, `FR-007`, `FR-008`, `FR-018`, `FR-080`, `FR-081` | `US-003`, `US-004`, `US-005`, `US-020`, `US-021` | `HUB-2.1 §2.2, §2.14–2.15` | `TC-010`, `TC-011`, `TC-018`, `TC-020`, `TC-021` | ✅ Đạt (Auto + UAT) |
| **BR-04** | Tách bạch năng lực và kết quả trong đánh giá nhân sự | Sheet3 | OI-016 | `FR-036`, `FR-050` | `US-014`, `US-018` | `HUB-2.1 §2.5, §2.7, §2.10` | `TC-003`, `TC-019` | ✅ Đạt (Auto + UAT) |
| **BR-05** | Workload & Capacity theo store, độ khó gian hàng | Sheet3; `4P.xlsx` | OI-008 | `FR-008`, `FR-011`, `FR-015`, `FR-050`, `FR-051`, `FR-080` | `US-005`, `US-006`, `US-008`, `US-018`, `US-020` | `HUB-2.1 §2.3, §2.7–2.8, §2.14` | `TC-011`, `TC-012`, `TC-019`, `TC-020` | ✅ Đạt (Auto + UAT) |
| **BR-06** | Phân công Owner/Backup, phân quyền dòng PIC & KPI cấp trung | Sheet1, Sheet3; Khảo sát | `DEC-004` | `FR-001`, `FR-012`, `FR-013`, `FR-014`, `FR-017`, `FR-018`, `FR-024`, `FR-070`, `FR-080`, `FR-082`, `FR-083` | `US-001`, `US-005`, `US-007`, `US-008`, `US-010`, `US-017`, `US-020`, `US-022`, `US-023` | `HUB-2.1 §2.3`; `HUB-2.6 (RBAC)` | `TC-005`, `TC-010`, `TC-011`, `TC-012`, `TC-014`, `TC-015`, `TC-019`, `TC-020`, `TC-022`, `TC-023` | ✅ Đạt (Auto + UAT) |
| **BR-07** | Tự động hóa báo cáo tuần/tháng & xuất biểu mẫu trình Brand | Sheet5; Khảo sát | `DEC-006`, OI-004, OI-013 | `FR-003`, `FR-005`, `FR-016`, `FR-041`, `FR-081` | `US-003`, `US-004`, `US-006`, `US-016`, `US-021` | `HUB-2.1 §2.2–2.3, §2.6, §2.15`; `HUB-2.5` | `TC-010`, `TC-021` | ✅ Đạt (Auto + UAT) |
| **BR-08** | Tính thưởng P2/P3 tự động từ dữ liệu theo chính sách 4P | Sheet1, Sheet5 | `DEC-010`, OI-006 | `FR-050`, `FR-083` | `US-018`, `US-023` | `HUB-2.1 §2.7, §2.17` | `TC-019`, `TC-023` | ✅ Đạt (Auto + UAT) |
| **BR-09** | Bảng điểm/thi đua công khai giữa nhân viên | Sheet3 | OI-007 | — (Tạm hoãn chờ chốt `OI-007`) | — | — | — | ⏳ Chờ quyết định `OI-007` |
| **BR-10** | Quản lý Chiến dịch, Sheet Listing KOC theo Brand, Chấm điểm 100đ & Sinh Deal đa nền tảng (`Wave 0` → `Wave 1`) | `Quy trình Booking - Tech.md` | `DEC-007`, `DEC-009` | `FR-010`, `FR-020`, `FR-021`, `FR-022`, `FR-023`, `FR-024`, `FR-063` | `US-006`, `US-009`, `US-010`, `US-011`, `US-024` | `HUB-2.1 §2.3–2.4, §2.13`; `HUB-2.4` | `TC-010`, `TC-011`, `TC-013`, `TC-023` | ✅ Đạt (Auto + UAT) |
| **BR-11** | Hợp đồng 8 mẫu Word, Rule Engine thuế/pháp lý, Duyệt độc lập Pháp chế/Kế toán, Ký số MISA WeSign & Nghiệm thu BBNT tự động | `Quy trình Booking - Tech.md` §3.5 | `DEC-007`, `DEC-009` | `FR-030`, `FR-031`, `FR-032`, `FR-033`, `FR-034`, `FR-036` | `US-012`, `US-013`, `US-014`, `US-024` | `HUB-2.1 §2.5, §2.10`; `HUB-2.5` | `TC-001` → `TC-006`, `TC-016`, `TC-023` | ✅ Đạt (Auto + UAT) |
| **BR-12** | Hồ sơ Brand (Optimistic Revision), Cổng đối tác Nhãn hàng (Brand Partner Hub) & Nghiên cứu AI có dẫn chứng (`EV-`) | Khảo sát & `PartnerHub` | `DEC-007`, `DEC-008`, OI-014 | `FR-040`, `FR-041`, `FR-042`, `FR-060`, `FR-061`, `FR-062` | `US-015`, `US-016`, `US-019` | `HUB-2.1 §2.6, §2.11–2.12`; `HUB-2.6` | `TC-007`, `TC-008`, `TC-009`, `TC-014` | ✅ Đạt (Auto + UAT) |
| **BR-13** | Danh bạ KOC 2 bảng (`COOPERATED`/`NEW`), `1 KOC — N Hồ sơ pháp lý`, Video Kênh Brand CTV/VJ, Lịch sử tuần `videoId` & Bộ công cụ 12 tiện ích | `ERD UpAffiliate` & Vận hành B2C | `DEC-007`, `DEC-009` | `FR-080`, `FR-081`, `FR-082`, `FR-083` | `US-020`, `US-021`, `US-022`, `US-023` | `HUB-2.1 §2.14–2.17`; `HUB-2.4` | `TC-020`, `TC-021`, `TC-022`, `TC-023` | ✅ Đạt (Auto + UAT) |

---

## 2. Kết Quả Kiểm Toán Truy Vết (ITBA Traceability Audit)

- **Yêu cầu nghiệp vụ mồ côi (Orphan `BR-nn`):** `0` (Duy nhất `BR-09` được đánh dấu tạm hoãn có chủ đích theo `OI-007`).
- **Yêu cầu chức năng mồ côi (Orphan `FR-nnn` không có `BR` gốc):** **`0`** (Toàn bộ `FR-010`, `FR-020..024`, `FR-030..036`, `FR-040..042`, `FR-060..063`, `FR-080..083` đã được hợp nhất vào `BR-10` → `BR-13` theo quyết định `DEC-007`).
- **Độ phủ User Stories (`US-001` → `US-024`):** **100%** đối với mọi `FR` đang hoạt động.
- **Độ phủ Kiểm thử tự động (`TC-001` → `TC-023`) & Kịch bản UAT (`UAT-01` → `UAT-08`):** **100%** đối với mọi `FR` mức *Must* (`99/99 pass`).

---

## 3. Lịch sử thay đổi

| Phiên bản | Ngày | Người sửa | Nội dung |
| --- | --- | --- | --- |
| 0.1 | 20/10/2026 | Team DX | Tạo bảng truy vết sơ bộ BR → FR → TC. |
| 1.0 | 24/10/2026 | `@it-business-analyst` | Hoàn thiện truy vết đầu-cuối 100% tới 24 User Stories (`US-001` → `US-024` trong `HUB-2.2`), bổ sung `FR-080`..`FR-083` và `TC-017`..`TC-023`. |
