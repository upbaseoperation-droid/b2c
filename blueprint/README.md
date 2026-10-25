# SỔ ĐĂNG KÝ TÀI LIỆU — B2C OPS HUB

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | HUB-REG |
| Dự án | B2C Ops Hub — Quản trị & Điều hành phòng Marketing B2C |
| Giai đoạn hiện tại | **2 — Phân tích & Thiết kế kỹ thuật (Sẵn sàng duyệt G2 → G4)** |
| Cập nhật | 24/10/2026 |

Danh sách **mọi tài liệu bắt buộc** theo quy trình quản lý dự án. Cập nhật bảng này mỗi khi tạo tài liệu hoặc đổi trạng thái.

## Trạng thái cổng

| Cổng | Trạng thái | Điều kiện & Tiến độ |
| --- | --- | --- |
| G1 (Yêu cầu) | **Đã hoàn thành sơ bộ** | Đã xác lập phạm vi 69 gian hàng B2C, phân cấp quản trị Brand → Gian hàng, bóc tách chỉ tiêu Paid/FOC, Gross/Net. |
| G2 (Thiết kế kỹ thuật) | **Đã hoàn thành bộ đặc tả** | Đã hoàn thành toàn bộ đặc tả thiết kế kỹ thuật cốt lõi: HUB-2.1 (SRS), HUB-2.2 (24 User Stories & State Machines), HUB-2.4 (ERD & Data Dictionary), HUB-2.5 (Tích hợp API), HUB-2.6 (RBAC) và HUB-2.8 (99/99 test pass) đồng bộ trực tiếp với mã nguồn `web-admin`. |
| G3–G5 | Đang triển khai & Nghiệm thu | Triển khai mã nguồn sản phẩm thực tế và sẵn sàng kịch bản nghiệm thu UAT cổng G4 (`HUB-4.1`). |

## Dùng chung

| Tài liệu | Trạng thái |
| --- | --- |
| [SDLC-00 Quy trình](../../sdlc/00_SDLC_PROTOCOL.md) | Áp dụng nguyên tắc "Code đổi - Doc cập nhật trong cùng một lượt" |
| [SDLC-01 Glossary & số liệu chuẩn](../../sdlc/01_GLOSSARY.md) | Đang dùng |
| [SDLC-02 Ranh giới hệ thống](../../sdlc/02_SYSTEM_BOUNDARY.md) | Đã chuẩn hóa ranh giới với UpAffiliate và Larkbase |
| [SDLC-03 Mẫu tài liệu](../../sdlc/03_DOCUMENT_TEMPLATES.md) | Đang dùng |

## Governance

| Mã | Tài liệu | Trạng thái |
| --- | --- | --- |
| HUB-GOV-01 | [Decision log](governance/DECISION_LOG.md) | Đang dùng |
| HUB-GOV-02 | [Open issues](governance/OPEN_ISSUES.md) | Đang xử lý |
| **HUB-GOV-03** | [**Ma trận truy vết (RTM)**](governance/TRACEABILITY.md) | **Đã hoàn thiện (`BR` → `FR` → `US` → `TC`)** |
| **HUB-GOV-04** | [**Sổ đăng ký lỗi & Quy tắc phòng ngừa tái phát**](governance/KNOWN_BUGS_AND_LESSONS.md) | **Đang dùng (Bắt buộc đối chiếu chéo toàn hệ thống)** |
| HUB-AUDIT-01 | [Audit Giao diện & Design System](audits/2026-10-14-ui-design-system-audit.md) | Đã hoàn thành toàn diện (Gộp nhóm điều hướng NAV_GROUPS, khử trùng lặp tab chéo, chuẩn hóa Modal & loại bỏ phụ đề giải thích thừa) |

## Giai đoạn 1 — Yêu cầu

| Mã | Tài liệu | Trạng thái | Owner | Ghi chú |
| --- | --- | --- | --- | --- |
| HUB-1.1 | [Project Charter](1-requirements/1.1_PROJECT_CHARTER.md) | Hoàn thiện | Ban Điều Hành | Định hướng quản trị số liệu phòng Marketing B2C |
| HUB-1.2 | [Stakeholder & RACI](1-requirements/1.2_STAKEHOLDERS_AND_RACI.md) | Đã chuẩn hóa | Khối Marketing B2C | Cơ cấu CEO, Giám Đốc MKT, Leader, Specialist, Legal, Finance |
| HUB-1.3 | [Hiện trạng (As-is)](1-requirements/1.3_AS_IS_CURRENT_STATE.md) | Đang dùng | Team DX & MKT | Khảo sát quy trình hiện tại |
| HUB-1.4 | [Bộ câu hỏi discovery — Giám đốc khối](1-requirements/1.4_DISCOVERY_GUIDE_GIAM_DOC_KHOI.md) | Hoàn tất | Khối MKT | Công cụ khảo sát |
| HUB-1.5 | [Bảng câu hỏi — nhân viên kỳ cựu](1-requirements/1.5_DISCOVERY_GUIDE_NHAN_VIEN_KY_CUU.md) | Hoàn tất | Khối MKT | Công cụ khảo sát |
| HUB-1.6 | [Mục tiêu vận hành](1-requirements/1.6_OPERATING_GOALS.md) | Đã chốt | Khối MKT | Tối ưu SLA, kiểm soát trần PnL, chuẩn hóa đánh giá nhân sự |
| HUB-1.7 | [BRD Ops Hub](1-requirements/1.7_BRD_OPS_HUB.md) | Đã chuẩn hóa | Khối MKT | 9 Nhu cầu nghiệp vụ cốt lõi |
| HUB-1.9 | [Nguồn dữ liệu Lark 4.1 Plan order tổng](1-requirements/1.9_DATA_SOURCE_LARK_4.1_PLAN_ORDER.md) | Đã áp dụng | Khối MKT & DX | Quy tắc DEC-006: đồng bộ thực tế 64 gian B2C kỳ `2026/10` & 66 gian B2C kỳ `2026/11`, tách Gross/Net, Paid/FOC |
| HUB-1.10 | [Tổng quan hệ thống Lark Base B2C_Quản lý Booking](1-requirements/1.10_LARK_BASE_SYSTEM_OVERVIEW.md) | Đã chuẩn hóa | Khối MKT & DX | 34 bảng, luồng đối soát xuyên suốt `4.1` → `4.1.1` → `3.1` → `3.2` → `6.1` kỳ `2026/10` (2.877 booking, 2.214 listing, 946 phiếu thanh toán) |

## Giai đoạn 2 — Phân tích & thiết kế kỹ thuật

| Mã | Tài liệu | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| **HUB-2.1** | [**SRS (Đặc tả yêu cầu phần mềm)**](2-design/2.1_SRS_B2C_OPS_HUB.md) | **Đã hoàn thành** | Quy chuẩn Cockpit, 5 Dashboard điều hành tinh gọn, Kế hoạch tháng 3 tab, Nhóm điều hướng `NAV_GROUPS`, Chiều Sản phẩm & Combo xuyên tháng (`ProductCatalogView.tsx` + `productCatalog.ts`: 3 loại SKU/Combo, 4 vai trò, kiểm soát tồn mẫu khả dụng `resolveEffectiveSampleQuota`, kế thừa link `resolveEffectiveProductLinks`, gộp USP/Claim `resolveEffectiveProductGuidelines`), Báo cáo Hiệu quả Đầu tư theo Chiều Sản phẩm & Combo trong Dashboard Video (`ExecutiveDashboardReportsView.tsx`), Video Kênh Brand & Điều phối CTV/VJ (`self-channel-hub`) kèm Luồng Quy trình Sản xuất, Nghiệm thu & Thanh toán Video Self-channel theo Kế hoạch tháng (`PlanSelfChannelBoard`, `selfChannelBoardRules.ts`), Kho lịch sử Tuần KOC & Video Ads theo `videoId` hệ thống (`KocVideoWeeklyHistoryPanel`), Nghiên cứu Brand & Đối thủ, Động cơ Đề xuất & Chấm điểm KOC 100 điểm (`kocRecommendationEngine`), Sheet Listing Cá nhân 48 cột theo Brand (`StaffBrandListingSheetWorkspace`), Gửi Mail Mời Hợp Tác KOC & Quản Lý Mẫu Thư Chuẩn (`KocOutreachEmailModal`), Báo cáo đánh giá lịch sử & rủi ro KOC, Báo cáo Kế hoạch & Air Video theo Gian hàng & Khung lương KL (`AirBookingReportHubView`), Chụp ảnh khung hình sản phẩm từ video đính kèm Biên bản nghiệm thu (`VideoProductScreenshotModal`), Bộ công cụ tiện ích nghiệp vụ (`WorkToolkitHubView`), Thiết lập Prompt đa phân hệ, Booking, Hợp đồng & Cổng đối tác |
| **HUB-2.2** | [**User stories, luồng trạng thái & tiêu chí nghiệm thu**](2-design/2.2_USER_STORIES.md) | **Đã hoàn thành** | 24 User Stories (`US-001` → `US-024`) với Gherkin AC, lưu đồ Swimlane, State Machines (`MonthlyPlan`, `BookingDeal`) và Bảng quyết định thuế/pháp lý phủ 100% `FR-001` → `FR-083` |
| HUB-2.3 | [Kiến trúc tổng thể](2-design/2.3_ARCHITECTURE.md) | Đang hoàn thiện | Next.js App Router, Micro-services API, State Sync |
| **HUB-2.4** | [**Mô hình dữ liệu & Từ điển dữ liệu**](2-design/2.4_DATA_MODEL.md) | **Đã hoàn thành** | Sơ đồ `erDiagram` Logic, Từ điển dữ liệu chuẩn (Data Dictionary & UI-API-DB Mapping), cấu trúc Brand, Store, Monthly Plan, Danh mục Sản phẩm & Combo xuyên tháng (`BrandProductCatalog`, `ProductGroup`, `CatalogProduct`, `BundleComponentItem` qua khóa `product-catalog-<brand>`), Video Self-channel & Đợt quyết toán CTV (`SelfChannelBoardData`, `SelfChannelJob`, `SelfSettlementBatch` qua khóa `self-channel-board-<planId>`), KOC Master 2 bảng (`COOPERATED` vs `NEW`), `1 KOC — N Hồ sơ pháp lý` (`KocLegalProfile`) & Deal — Job |
| **HUB-2.5** | [**Đặc tả tích hợp API**](2-design/2.5_INTEGRATION_SPEC.md) | **Đã hoàn thành** | Lark SSO, Larkbase Plans, Bảng Quản trị Sản xuất Video Kênh Brand, Nghiệm thu & Quyết toán CTV (`/api/self-channel-board` & mở rộng `/api/plan-actual-report` đọc dữ liệu Self-channel), Luồng đẩy Phiếu ĐNTT / Tạm ứng Bảng 3.2 sang Lark Approval & Larkbase, TikTok Seller, Kho lịch sử Tuần KOC & Video Ads và API phát sinh KOC/Video mới (`/api/koc-video-history`), Kalodata, Nghiên cứu Brand & Đối thủ, Crawler KOC & Đối thủ (TikTok Open-Source Engines), Trích xuất luồng phát & chụp khung hình sản phẩm từ video TikTok cho BBNT (`/api/integrations/tiktok-koc/video-frame`), Lịch sử đánh giá kênh KOC (`/api/integrations/tiktok-koc/channel-reviews`), Gửi Mail Mời Hợp Tác KOC (`/api/integrations/koc-outreach-email`), LLM Gateway & Prompt Setup 8 phân hệ, WeSign, OCR |
| **HUB-2.6** | [**Xác thực & Phân quyền (RBAC)**](2-design/2.6_AUTH_AND_RBAC_SPEC.md) | **Đã hoàn thành** | Phân quyền vai trò toàn diện (CEO, Giám Đốc MKT, Leader, Specialist, Legal, Finance, Sign Admin, Đối tác ngoài), Ma trận CRUD 26 tính năng, Quyền phê duyệt đặc thù (Special Staff Permissions), Động cơ phân quyền phạm vi (Data Scoping Engine) & Bảo mật API route 2 lớp |
| HUB-2.7 | [Đặc tả hệ thống thiết kế (Design System)](../web-admin/DESIGN_SYSTEM.md) | Đã hoàn thành | Token màu, chuyển động, `NAV_GROUPS` & `TAB_LABELS`, nguyên tắc Single Source of Truth, Mobile Responsive (`360px–1023px`) và component UI |
| **HUB-2.8** | [**Chiến lược kiểm thử & Danh mục Test Cases**](2-design/2.8_TEST_STRATEGY.md) | **Đã hoàn thành** | 23 nhóm kịch bản kiểm thử tự động (`TC-001` → `TC-023`, 99/99 pass) phủ 100% yêu cầu chức năng mức Must |
| **HUB-2.9** | [**Dự toán chi phí API & Định hướng Báo cáo, Phân tích dữ liệu và Hỗ trợ nhập liệu**](2-design/2.9_API_COST_AND_WORKFLOW_ACCELERATION_BACKLOG.md) | **Đã lưu trữ** | Tập trung 2 trụ cột: (1) Hỗ trợ nhập liệu nhanh & chuẩn hóa (`ENTRY-01`..`ENTRY-04`), (2) Báo cáo điều hành & phân tích đối soát dữ liệu (`REPORT-01`..`REPORT-04`) kèm dự toán chi phí cho 69 gian hàng B2C |

## Giai đoạn 4 — Kiểm thử & Nghiệm thu (UAT — Cổng G4)

| Mã | Tài liệu | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| **HUB-4.1** | [**Kịch bản nghiệm thu UAT & Đánh giá tác động thay đổi**](4-test/4.1_UAT_TEST_CASES.md) | **Sẵn sàng ký duyệt G4** | 8 kịch bản nghiệm thu đầu-cuối (`UAT-01` → `UAT-08`), quy trình phân tích tác động 5 tầng (5-Layer Impact Analysis) và Biên bản nghiệm thu UAT |

## Mã nguồn & Sản phẩm thực thi

| Mục | Vị trí | Trạng thái |
| --- | --- | --- |
| **Hệ thống web-admin** | [`B2C/web-admin`](../web-admin/README.md) | Đang vận hành và phát triển các phân hệ theo đặc tả Giai đoạn 2 |
| Tài liệu lưu trữ prototype v0 | [`blueprint/archive/prototype-v0`](archive/prototype-v0/README.md) | Lưu trữ tư liệu lịch sử khảo sát |
