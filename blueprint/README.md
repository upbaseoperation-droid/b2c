# SỔ ĐĂNG KÝ TÀI LIỆU HỆ THỐNG — B2C OPS HUB

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | HUB-REG |
| Dự án | B2C Ops Hub — Hệ thống Quản trị & Điều hành Phòng Marketing B2C |
| Giai đoạn hiện tại | **Vận hành Thực tế & Chuẩn hóa Bàn giao Bảo trì (v1.0)** |
| Cập nhật | 31/10/2026 |

---

## Lộ Trình Đọc Tài Liệu Nhanh (Dành Cho Người Mới & Kỹ Sư Bảo Trì)

Nếu bạn mới tiếp cận dự án **B2C Ops Hub** (với vai trò Quản lý, BA, QA hoặc Developer tiếp nhận maintain), hãy đọc theo đúng thứ tự **4 tài liệu trụ cột** dưới đây:

1. **[1.7_BRD_OPS_HUB.md](1-requirements/1.7_BRD_OPS_HUB.md) (`HUB-1.7` — Tài liệu Nghiệp vụ & Quy trình Nền tảng 6 Chặng):**
   - **Ai nên đọc:** Tất cả mọi người (Lãnh đạo, Quản lý B2C, BA, QA, Developer).
   - **Nội dung:** Giải thích thuần ngôn ngữ nghiệp vụ về bài toán của phòng B2C (kiểm soát tiến độ tiêu ngân sách Under-spend, cơ cấu 69 gian hàng / 42 Brand), sơ đồ luồng vận hành End-to-End 6 chặng từ lập Plan `4.1/4.1.1/1-Sheet` $\rightarrow$ Sản phẩm & Content $\rightarrow$ Listing Google Sheet 57 cột $\rightarrow$ Deal & Hợp đồng 3 bước (`HĐNT → SOW → BBNT` + Google Docs Redline) $\rightarrow$ Nghiệm thu 6 sàn / Zalo Bot $\rightarrow$ Tạm ứng, Khóa sổ ngày làm việc thứ 3 & Tất toán ĐNTT Lark, cùng ranh giới hệ thống với **Data Warehouse** và **UPS**.
2. **[2.3_ARCHITECTURE.md](2-design/2.3_ARCHITECTURE.md) (`HUB-2.3` — Kiến trúc Tổng thể & Bản đồ Bảo trì Mã nguồn):**
   - **Ai nên đọc:** Developer tiếp nhận bảo trì, Tech Lead.
   - **Nội dung:** Sơ đồ kiến trúc kỹ thuật, phân định dữ liệu giữa **Data Warehouse công ty** (KOC Master, Kênh MXH, Hồ sơ pháp lý `1–N`) và **PostgreSQL của B2C Ops Hub**, bảng ánh xạ 1–1 từ **5 nhóm Menu UI $\leftrightarrow$ File View (`.tsx`) $\leftrightarrow$ File Logic (`.ts`) $\leftrightarrow$ API Route $\leftrightarrow$ Database**, cùng danh sách 12 màn hình cũ đã đóng để không sửa nhầm.
3. **[2.1_SRS_B2C_OPS_HUB.md](2-design/2.1_SRS_B2C_OPS_HUB.md) (`HUB-2.1` — Đặc tả Yêu cầu Phần mềm Chi tiết):**
   - **Ai nên đọc:** BA, QA/Tester, Developer.
   - **Nội dung:** Đặc tả chi tiết từng phân hệ chức năng, công thức tính toán, điều kiện chặn lỗi (Server-side Blockers) và danh mục yêu cầu `FR-001` $\rightarrow$ `FR-085`.
4. **[KNOWN_BUGS_AND_LESSONS.md](governance/KNOWN_BUGS_AND_LESSONS.md) (`HUB-GOV-04` — Sổ Đăng ký Lỗi & Quy tắc Phòng ngừa Tái phát):**
   - **Ai nên đọc:** Developer, QA trước khi sửa code hoặc nghiệm thu.
   - **Nội dung:** Các quy tắc bắt buộc (`RULE-DATA-01`, `RULE-SYNC-01`, `RULE-PERF-01`, `RULE-API-01/02`) và 65 bài học thực tế đã xử lý.

---

## Danh Mục Đầy Đủ Toàn Bộ Tài Liệu Dự Án

### 1. Tài liệu Quản trị & Kiểm soát chất lượng (Governance)

| Mã | Tài liệu | Trạng thái | Nội dung chính |
| --- | --- | --- | --- |
| **HUB-GOV-01** | [Decision Log](governance/DECISION_LOG.md) | **Chính thức (`DEC-001` → `DEC-011`)** | Nhật ký các quyết định kiến trúc và phạm vi nghiệp vụ (`DEC-001` $\rightarrow$ `DEC-011`). |
| **HUB-GOV-02** | [Open Issues](governance/OPEN_ISSUES.md) | **Đã đóng 100% (`DEC-011`)** | Danh sách 19 câu hỏi khảo sát ban đầu đã được chốt và giải quyết. |
| **HUB-GOV-03** | [Ma trận truy vết (RTM)](governance/TRACEABILITY.md) | **Chính thức v1.1** | Truy vết xuyên suốt 14 yêu cầu nền tảng (`BR-01` $\rightarrow$ `BR-14`) sang `FR`, `US` và `TC` (`137/137 pass`). |
| **HUB-GOV-04** | [Sổ đăng ký lỗi & Quy tắc phòng ngừa](governance/KNOWN_BUGS_AND_LESSONS.md) | **Bắt buộc đọc khi maintain** | Hệ thống quy tắc chống lỗi tái phát (`BUG-001` $\rightarrow$ `BUG-065`). |

### 2. Giai đoạn 1 — Yêu cầu Nghiệp vụ & Nguồn Dữ liệu Thực tế

| Mã | Tài liệu | Trạng thái | Nội dung chính |
| --- | --- | --- | --- |
| **HUB-1.7** | [**BRD — Tài liệu Yêu cầu Nghiệp vụ & Quy trình Nền tảng 6 Chặng**](1-requirements/1.7_BRD_OPS_HUB.md) | **Chính thức v1.0** | **Tài liệu nghiệp vụ gốc:** Luồng vận hành 6 chặng của phòng Marketing B2C, quy tắc kiểm soát giải ngân ngân sách (Under-spend), ranh giới với Data Warehouse & UPS, và 14 yêu cầu nghiệp vụ cốt lõi (`BR-01` $\rightarrow$ `BR-14`). |
| **HUB-1.2** | [Stakeholder & RACI](1-requirements/1.2_STAKEHOLDERS_AND_RACI.md) | **Chính thức v1.2** | Ma trận RACI chuẩn hóa theo 6 chặng quy trình nền tảng (CEO, GĐ MKT B2C, Leader 8 gian hàng, 3 vị trí Brand, PIC, Pháp chế, Kế toán, Brand). |
| **HUB-1.9** | [Nguồn dữ liệu Lark 4.1 Plan order tổng](1-requirements/1.9_DATA_SOURCE_LARK_4.1_PLAN_ORDER.md) | **Chính thức** | Quy tắc đọc và đối soát Bảng 4.1 & 4.1.1 từ Lark Base (tách Gross/Net, Paid/FOC, phân công PIC). |
| **HUB-1.10** | [Tổng quan hệ thống Lark Base B2C_Quản lý Booking](1-requirements/1.10_LARK_BASE_SYSTEM_OVERVIEW.md) | **Chính thức** | Khảo sát 34 bảng Lark Base và luồng đối soát `4.1` $\rightarrow$ `4.1.1` $\rightarrow$ `3.1` $\rightarrow$ `3.2` $\rightarrow$ `6.1`. |
| HUB-1.1 | [Project Charter](1-requirements/1.1_PROJECT_CHARTER.md) | Lưu trữ tham khảo | Tuyên bố khởi tạo dự án ban đầu. |
| HUB-1.3 | [Hiện trạng ban đầu (As-is)](1-requirements/1.3_AS_IS_CURRENT_STATE.md) | Lưu trữ tham khảo | Tài liệu khảo sát hiện trạng trước khi xây hệ thống. |
| HUB-1.6 | [Mục tiêu vận hành thảo luận ban đầu](1-requirements/1.6_OPERATING_GOALS.md) | Lưu trữ tham khảo | Bản thảo luận mục tiêu giai đoạn khảo sát (đã được chuẩn hóa chính thức vào `HUB-1.7`). |

### 3. Giai đoạn 2 — Thiết kế Kỹ thuật, Đặc tả Phần mềm & Bản đồ Bảo trì

| Mã | Tài liệu | Trạng thái | Nội dung chính |
| --- | --- | --- | --- |
| **HUB-2.1** | [**SRS — Đặc tả Yêu cầu Phần mềm**](2-design/2.1_SRS_B2C_OPS_HUB.md) | **Chính thức v2.6** | Đặc tả chi tiết 17 phân hệ đang vận hành, danh mục `FR-001` $\rightarrow$ `FR-085` và danh sách màn hình cũ đã đóng. |
| **HUB-2.2** | [**User Stories, Luồng Trạng thái & Tiêu chí Nghiệm thu**](2-design/2.2_USER_STORIES.md) | **Chính thức v1.2** | Lưu đồ liên phòng ban 6 chặng, State Machines (`MonthlyPlan`, `BookingDeal`), bảng quyết định thuế và 24 User Stories (`US-001` $\rightarrow$ `US-024`). |
| **HUB-2.3** | [**Kiến trúc Tổng thể & Bản đồ Bảo trì Mã nguồn**](2-design/2.3_ARCHITECTURE.md) | **Chính thức v1.0** | **Tài liệu kỹ thuật gốc cho Developer:** Sơ đồ kiến trúc, phân vùng dữ liệu Data Warehouse vs. PostgreSQL, bảng tra cứu `Menu UI ↔ File View ↔ File Rule ↔ API Route ↔ DB`, và danh sách 12 màn hình cũ đã đóng. |
| **HUB-2.4** | [**Mô hình Dữ liệu & Từ điển Dữ liệu**](2-design/2.4_DATA_MODEL.md) | **Chính thức v1.0** | Sơ đồ ERD, cấu trúc Prisma Schema, 18 bộ dữ liệu `AppSharedRecord`, liên thông Data Warehouse KOC Master & `1 KOC — N Hồ sơ pháp lý`. |
| **HUB-2.5** | [**Đặc tả Tích hợp API**](2-design/2.5_INTEGRATION_SPEC.md) | **Chính thức v1.2** | Đặc tả kết nối Lark SSO, Lark Base/Approval, Google Sheets 57 cột, Google Docs 3 chặng, Engine Nghiệm thu 6 nền tảng, Zalo Bot, WeSign và Data Warehouse. |
| **HUB-2.6** | [**Xác thực & Phân quyền (RBAC)**](2-design/2.6_AUTH_AND_RBAC_SPEC.md) | **Chính thức v1.5** | Phân quyền 13 vai trò, Data Scoping Engine và quy tắc che mờ dữ liệu nhạy cảm (`****5678`). |
| **HUB-2.7** | [**Hệ thống Thiết kế Giao diện (Design System)**](../web-admin/DESIGN_SYSTEM.md) | **Chính thức** | Quy chuẩn UI/UX bắt buộc (`@/components/ui`, token màu ngữ nghĩa, typography, cấm dòng giải thích xám thừa). |
| **HUB-2.8** | [**Chiến lược Kiểm thử & Danh mục Test Cases**](2-design/2.8_TEST_STRATEGY.md) | **Chính thức v1.0** | Bộ kịch bản kiểm thử tự động (`TC-001` $\rightarrow$ `TC-024`, `137/137 pass`). |
| **HUB-2.18** | [**Bản đồ Quy trình Phân cấp BPMN Swimlane & 7 Thực thể Cốt lõi**](2-design/2.18_BPMN_SWIMLANE_AND_ENTITY_MAP.md) | **Chính thức v1.1** | Sơ đồ quy trình 6 làn Swimlane BPMN 2.0 và chuỗi 7 thực thể dữ liệu cốt lõi. |
| **HUB-2.19** | [**Giải pháp Tích hợp B2C Ops Hub, Data Warehouse & UpAffiliate**](2-design/2.19_UPAFFILIATE_INTEGRATION_SOLUTION.md) | **Chính thức v1.1** | Đặc tả đồng bộ KOC Master, Hồ sơ pháp lý 1–N và số liệu hiệu quả D14/D30/D60 qua Data Warehouse công ty. |
| **HUB-2.20** | [**Đặc tả Liên thông Hệ thống Hợp đồng (`contract-system`) & Luồng Dữ liệu KOC / Data Warehouse**](2-design/2.20_CONTRACT_SYSTEM_AND_DATA_FLOW_SPEC.md) | **Chính thức v1.0** | Kiến trúc 13 bước liên thông Hợp đồng (`Google Docs` $\rightarrow$ `WeSign` $\rightarrow$ `Webhook`) và luồng dữ liệu KOC với Data Warehouse. |

### 4. Giai đoạn 4 — Nghiệm thu UAT & Hướng dẫn Mã nguồn

| Mã | Tài liệu | Vị trí | Nội dung chính |
| --- | --- | --- | --- |
| **HUB-4.1** | **Kịch bản Nghiệm thu UAT (`G4` — Chính thức v1.1)** | [`4-test/4.1_UAT_TEST_CASES.md`](4-test/4.1_UAT_TEST_CASES.md) | 8 kịch bản nghiệm thu đầu-cuối (`UAT-01` $\rightarrow$ `UAT-08`) theo quy trình 6 chặng và đánh giá tác động 5 tầng. |
| **WEB-README** | **Hướng dẫn Vận hành Mã nguồn `web-admin`** | [`../web-admin/README.md`](../web-admin/README.md) | Tổ chức 5 nhóm menu nghiệp vụ (18 màn hình, gồm Sổ Nghiệm thu & ĐNTT Lark tập trung) trên `web-admin` và cấu hình môi trường. |
| **EXT-README** | **Tiện ích Trình duyệt Chrome Extension** | [`../chrome-extension/README.md`](../chrome-extension/README.md) | Thu thập chỉ số kênh KOC và đồng bộ nghiệm thu đa sàn về `/api/extension/koc-sync`. |
