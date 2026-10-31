# DECISION LOG — B2C OPS HUB

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | HUB-GOV-01 |
| Dự án | B2C Ops Hub |
| Trạng thái | Đang dùng (sổ ghi liên tục) |
| Cập nhật | 31/10/2026 |

Mẫu: [SDLC-03 mục 1.5](../../../sdlc/03_DOCUMENT_TEMPLATES.md#15-decision-log--một-mục). Không xóa mục; quyết định bị thay thế ghi *Thay thế bởi DEC-…*.

---

### DEC-001 — Tách B2C Ops Hub và UpAffiliate thành hai dự án
- Ngày: 30/09/2026 · Người quyết: chủ dự án · Trạng thái: **Đã quyết (Bổ sung bởi DEC-007 & DEC-011)**
- Quyết định: **B2C Ops Hub** quản trị phòng Marketing B2C (store & phân công, workload/capacity, SLA, chỉ số hiệu suất, P2/P3, báo cáo điều hành). **UpAffiliate** làm booking đa sàn (master KOC, plan chi tiết, BO, duyệt brand, hợp đồng, nghiệm thu).
- Phương án đã cân nhắc: một dự án đặt ở B2C; một dự án đặt ở UpAffiliate.
- Hệ quả: Xem cập nhật phạm vi thực thi khép kín 6 chặng tại `DEC-007` và `DEC-011`.

### DEC-002 — `B2C/web-admin` là prototype v0, không phải sản phẩm
- Ngày: 30/09/2026 · Trạng thái: **Thay thế bởi DEC-007, DEC-008 & DEC-011**
- Bối cảnh: rà soát 30/09/2026 cho thấy web-admin ban đầu chưa kết nối cơ sở dữ liệu thật.
- Quyết định thay thế: Từ tháng 10/2026, `B2C/web-admin` đã được nâng cấp toàn diện lên kiến trúc Production (PostgreSQL trên Supabase + Cloudflare R2 + Lark SSO OAuth 2.0 + Google Sheets/Docs API + MISA WeSign + 137/137 kiểm thử tự động) và trở thành hệ thống điều hành chính thức của phòng Marketing B2C.

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

### DEC-006 — Quy tắc đọc Lark 4.1 Plan order tổng
- Ngày: 09/10/2026 · Người xác nhận: owner prototype (buổi rà soát dữ liệu 09/10/2026) · Trạng thái: **Đã xác nhận quy tắc** — chờ owner bảng 4.1 đồng ý mapping
- Quyết định:
  1. Phạm vi B2C lấy theo cột `B2C phụ trách`.
  2. KL1–KL7 chỉ tính video có cast; FOC = TAP Brand + TAP + TAP UpAffiliate; Ops Hub tự tính Cast và tổng video affiliate.
  3. Plan chốt là cột gốc; `(sau điều chỉnh)`, `(Duyệt)` không phải phiên bản plan.
  4. Chi phí dùng Net, lưu song song Gross; Gross = Net × 1,08 (VAT 8%) × 1,10 (TNCN 10%). Hệ số là cấu hình theo kỳ.
- Hệ quả: mapping 36/228 cột và script import ([HUB-1.9](../1-requirements/1.9_DATA_SOURCE_LARK_4.1_PLAN_ORDER.md)); câu hỏi còn mở OI-017, 018, 019.

### DEC-007 — Mở rộng phạm vi B2C Ops Hub bao gồm Thực thi Listing, Deal, Hợp đồng WeSign, Cổng đối tác & Bộ công cụ (`BR-10` → `BR-13`)
- Ngày: 24/10/2026 · Người quyết: Ban Điều Hành & Khối MKT B2C (qua 22 quyết định nghiệp vụ `/grill-me` & `Quy trình Booking - Tech.md`) · Trạng thái: **Đã triển khai kỹ thuật — chờ ký xác nhận đồng bộ BRD**
- Bối cảnh: Trong quá trình triển khai thực tế cho 69 gian hàng B2C (42 Brand), để giải quyết ngay điểm nghẽn vận hành trong khi chờ UpAffiliate hoàn thiện độc lập, `B2C Ops Hub` (`web-admin`) cần cung cấp luồng tác nghiệp khép kín từ Kế hoạch tháng → Sheet Listing KOC theo Brand → Sinh Deal & Nghiệm thu 2 bước → Hợp đồng pháp chế / MISA WeSign / BBNT tự động → Cổng đối tác Brand và Bộ công cụ tiện ích 12 công cụ, đồng thời kết nối đồng bộ 2 chiều với UpAffiliate (`IF-03`) và Lark Approval (`IF-02`).
- Quyết định:
  1. Bổ sung chính thức 4 nhóm yêu cầu nghiệp vụ `BR-10`, `BR-11`, `BR-12`, `BR-13` vào [HUB-1.7 BRD Ops Hub](../1-requirements/1.7_BRD_OPS_HUB.md) để xóa bỏ toàn bộ "FR mồ côi" (`FR-010`, `FR-020..024`, `FR-030..036`, `FR-040..042`, `FR-060..063`, `FR-080..083`).
  2. Giữ nguyên nguyên tắc ranh giới dữ liệu (`DEC-005`): Danh bạ KOC (`COOPERATED` vs `NEW`) và `1–N` Hồ sơ pháp lý đồng bộ định kỳ/thủ công với UpAffiliate qua `upaffiliateCreatorId` và `upaffiliateLegalProfileId`.
- Hệ quả: 100% yêu cầu chức năng trong [HUB-2.1 SRS](../2-design/2.1_SRS_B2C_OPS_HUB.md) có `BR` gốc và `US` trong [HUB-2.2](../2-design/2.2_USER_STORIES.md).

### DEC-008 — Xác thực Lark SSO OAuth 2.0 & Ma trận Phân quyền 8 Vai trò + Data Scoping Engine
- Ngày: 20/10/2026 · Người quyết: Team DX & Khối MKT · Trạng thái: **Đã quyết & Đã triển khai**
- Bối cảnh: Đóng vấn đề mở `OI-005` và khắc phục rủi ro bảo mật của bản prototype v0 (`DEC-002`).
- Quyết định:
  1. Sử dụng Lark SSO (OAuth 2.0) làm nhà cung cấp định danh chuẩn kết hợp cơ chế kiểm tra phiên & phạm vi dữ liệu 2 lớp (UI + Server API Route) theo [HUB-2.6](../2-design/2.6_AUTH_AND_RBAC_SPEC.md).
  2. Áp dụng 8 vai trò (`CEO`, `MKT_DIRECTOR`, `LEADER`, `SPECIALIST`, `LEGAL`, `FINANCE`, `SIGN_ADMIN`, `EXTERNAL_PARTNER`), chống gán nhầm quyền theo tên trùng và ẩn tuyệt đối dữ liệu nhạy cảm PII (`NFR-04`).
- Hệ quả: Đóng `OI-005`; được bảo vệ tự động bởi `TC-005`, `TC-009`, `TC-014`, `TC-015`.

### DEC-009 — Mô hình Danh bạ KOC 2 bảng (`COOPERATED` vs `NEW`), `1 KOC — N Hồ sơ pháp lý` & Nghiệm thu 2 bước theo Deal
- Ngày: 23/10/2026 · Người quyết: Khối MKT B2C, Pháp chế & Team DX · Trạng thái: **Đã quyết & Đã triển khai**
- Quyết định:
  1. Tách Danh bạ KOC thành 2 bảng: Bảng 1 (`COOPERATED` — 4.820 KOC đã hợp tác kèm lịch sử GMV/ROI) và Bảng 2 (`NEW` — KOC mới/tiềm năng kèm trạng thái tiếp cận).
  2. Áp dụng quan hệ `1 KOC — N Hồ sơ pháp lý & Thụ hưởng` (`KocLegalProfile`: `INDIVIDUAL`, `HOUSEHOLD`, `COMPANY`), ràng buộc chặt chẽ `Chủ thể ký ≡ CCCD/MST ≡ STK thụ hưởng ≡ HĐNT`.
  3. Chuẩn hóa đơn vị giao dịch là **Deal** (gồm Asset Video gốc `Wave 0` + Dịch vụ gia tăng `Wave 1`). Nghiệm thu tuần tự 2 bước: `Wave 0` phải đạt `VERIFIED` mới mở khóa nghiệm thu `Wave 1`; tự động khấu trừ hạng mục `DROPPED` trước khi đẩy ĐNTT sang Lark Approval.
- Hệ quả: Cập nhật `SDLC-01 Glossary`, `HUB-2.1 §2.13, §2.16`, `HUB-2.4` và kiểm thử tự động `TC-022`, `TC-023`.

### DEC-010 — Chuẩn hóa SLA Vận hành (48h / T-7→T+7), Khóa Hệ số Độ khó Gian hàng Bảng 2 & Tính điểm Workload 33 Đầu việc SOW
- Ngày: 24/10/2026 · Người quyết: Khối MKT B2C & Team DX · Trạng thái: **Đã triển khai kỹ thuật (Phần thang đo điểm Workload tạm hoãn kích hoạt theo DEC-011)**
- Quyết định:
  1. Áp dụng bộ quy tắc đo lường SLA tự động trên Cockpit (`computeBrandSlaMetrics`, cảnh báo sớm 50% SLA, cảnh báo quá hạn 48h Brand duyệt, lịch trình SLA `T-7 → T+7` và khóa sổ nghiệm thu ngày làm việc thứ 3 đầu tháng `T+1`).
  2. Hệ số độ khó gian hàng (Bảng 2) và động cơ tính điểm tải công việc đã có sẵn trong mã nguồn nhưng tạm hoãn kích hoạt vận hành cho tới khi toàn bộ luồng thực thi 6 chặng chạy ổn định (`DEC-011`).

### DEC-011 — Chuẩn hóa Luồng Quy trình Nền tảng 6 Chặng, Cảnh báo Giải ngân chậm (`Under-spend`), Ranh giới Data Warehouse / UPS & Đóng 12 Màn hình Cũ
- Ngày: 31/10/2026 · Người quyết: Chủ dự án & Khối MKT B2C (Xác nhận qua phỏng vấn kiểm chứng toàn trình `/grill-me`) · Trạng thái: **Đã quyết & Chính thức áp dụng**
- Quyết định:
  1. **Trọng tâm cảnh báo ngân sách (`BR-01`):** Vấn đề cốt lõi cần cảnh báo là **Giải ngân chậm / Chưa chi hết ngân sách (`Under-spend`)** (`< 50%` báo đỏ, `< 80%` cuối tháng bắt buộc giải trình; gian hàng có ngân sách nhưng chi `0đ` tuyệt đối không gắn nhãn *"Trong hạn mức"*) và **Chi ngoài kế hoạch (`Unbudgeted Spend`)** (gian hàng hạn mức `0đ` nhưng phát sinh chi phí). Vượt nhẹ trần Net (`Overbudget`) không khóa cứng vận hành nếu có giải trình/phê duyệt của Giám Đốc Marketing. Job treo từ tháng cũ kéo sang chỉ theo dõi nghiệm thu/thanh toán, **không** trừ vào ngân sách tháng mới.
  2. **Giao tiếp Nhãn hàng qua Google Sheet 57 cột & Đóng Cổng Brand Hub độc lập (`BR-05`, `BR-06`):** 100% luồng trình duyệt Listing KOC (3 đợt 10–20–30, đối khớp `Row ID` ẩn 1-1) và Kịch bản/Video Demo Vòng 2 với Brand thực hiện qua **File Google Sheet 57 cột (`A → BE`)** đồng bộ 2 chiều với hệ thống. Đóng màn hình `brand-hub` độc lập.
  3. **Ranh giới Gửi hàng mẫu trên hệ thống UPS (`BR-07`):** Nghiệp vụ tạo đơn và theo dõi gửi hàng mẫu thực hiện trên **hệ thống UPS của công ty**; B2C Ops Hub không quản lý kho/vận đơn hàng mẫu ở chặng Pre-Air (đóng màn hình `sample-tracker`).
  4. **Hợp đồng 3 chặng (`HĐNT → SOW → BBNT`) & Đàm phán Google Docs Redline (`BR-08`):** `HĐNT` ký 1 lần theo Hồ sơ pháp lý KOC (hoàn toàn độc lập với Brand và Deal). Khi chốt Deal mới tạo `Phụ lục SOW` kế thừa mã `HĐNT`. Hợp đồng sửa đổi đi qua **Google Docs 3 chặng (`Draft → Edit → Final`)** kèm đối chiếu **Redline từng từ** và Báo cáo đàm phán, được Pháp chế & Kế toán duyệt độc lập trước khi đẩy **MISA WeSign**.
  5. **Tích hợp Data Warehouse công ty cho Danh bạ KOC (`BR-13`):** **Data Warehouse công ty** là nguồn dữ liệu gốc (Source of Truth) để đọc và cập nhật **KOC Master**, **Đa kênh MXH** và **`1–N` Hồ sơ pháp lý (`KocLegalProfile`)**, cùng chỉ số hậu kiểm **D14/D30/D60**. CSDL của B2C Ops Hub chỉ lưu thông tin vận hành nội bộ phòng B2C (đánh giá/ghi chú KOC theo Brand, lịch sử đàm phán, trạng thái tiếp cận, Plan, Deal, Hợp đồng, Nghiệm thu, ĐNTT).
  6. **Tạm hoãn Thang đo điểm tải công việc (`Workload Bảng 1–7` & `P3`) (`BR-14`):** Hiện tại chỉ bật chức năng **Phân công nhân sự phụ trách Gian hàng (1 PIC chính + Nhân sự hỗ trợ)** và **Phân công 3 vị trí cấp Brand (`Plan/Strategy`, `Content Main`, `KV/SIS`)**. Phần chấm điểm tải công việc (Workload/P3) tạm hoãn sang giai đoạn sau.
- Hệ quả: Ban hành chính thức bộ 4 tài liệu trụ cột [HUB-1.7 BRD v1.0](../1-requirements/1.7_BRD_OPS_HUB.md), [HUB-2.3 Architecture v1.0](../2-design/2.3_ARCHITECTURE.md), [HUB-2.1 SRS v2.6](../2-design/2.1_SRS_B2C_OPS_HUB.md) và đồng bộ toàn bộ bộ tài liệu dự án.
