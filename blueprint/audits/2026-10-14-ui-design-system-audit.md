# Audit giao diện & design system — B2C Ops

Ngày: 14/10/2026. Phạm vi: mã nguồn hiện có trong `web-admin`, bao gồm các thay đổi chưa commit. Đây là báo cáo audit, chưa phải bản thiết kế được triển khai.

## Kết luận

Giao diện có nền tảng màu sắc và thành phần dùng chung khá rõ, nhưng chưa có kỷ luật về lượng thông tin và thứ tự ưu tiên. Cảm giác “AI slop” đến từ việc diễn giải nghiệp vụ thành nhiều tiêu đề, thẻ, nhãn và mô tả cùng lúc; ngôn ngữ trình diễn; và thông báo khẳng định mạnh hơn hành vi thật của ứng dụng.

Đổi màu hoặc giảm bo góc sẽ không giải quyết gốc vấn đề. Cần giảm số quyết định trên mỗi màn hình, viết lại nội dung và thống nhất thành phần ở các luồng dùng hằng ngày.

## Phạm vi và mức độ xác minh

- Quét toàn bộ 88 file TSX trong `src`; thống kê từng file nằm trong [inventory](2026-10-14-ui-inventory.csv). Đọc sâu shell, design tokens, thành phần chung, dashboard, kế hoạch, booking, phân quyền và các điểm nội dung nổi bật.
- Quan sát trực tiếp màn Phân quyền tại viewport mặc định khoảng 590px và desktop 1440 × 900; đọc DOM màn Kế hoạch tháng với các hàng dữ liệu thực tế của phiên cục bộ.
- Các màn còn lại được đánh giá từ nguồn, không được coi là đã kiểm thử trực quan toàn bộ. Điều hướng trình duyệt có timeout và trạng thái trang thay đổi trong phiên; không kết luận đây là lỗi sản phẩm khi chưa tái hiện trong phiên ổn định.
- Các số đếm class là số lần xuất hiện trong nguồn, bao gồm nhánh có điều kiện; không phải số lỗi độc lập hay số phần tử cùng xuất hiện trên một màn hình. Component tự viết không mặc nhiên là lỗi.
- Không chủ động thao tác lưu/duyệt/xóa hoặc đổi quyền. Tuy nhiên log máy chủ trong phiên có các yêu cầu PUT đồng bộ kế hoạch tự động, gồm phản hồi 200/409/423; chưa đối chiếu dữ liệu trước/sau nên không khẳng định phiên xem là hoàn toàn không phát sinh ghi dữ liệu. Cần dùng dữ liệu audit cô lập cho vòng kiểm tra tiếp theo. Không có kết luận đạt WCAG, độ tương phản toàn ứng dụng, hoặc hiệu năng.

Kiểm tra ESLint có mục tiêu đã chạy và không đạt: Sidebar 5 lỗi (4 thuộc rule design system), dashboard 503 (490 thuộc rule design system), InputPlan 56 (52 thuộc rule design system), blocks 1 (không thuộc rule design system). Tổng 565 lỗi, trong đó 546 thuộc `no-restricted-syntax`. Đây chỉ là bốn file được kiểm tra, không phải kết quả lint toàn repo; nhiều lỗi có thể cùng nằm ở một phần tử. Không chạy build vì không sửa mã ứng dụng và audit này không đánh giá khả năng phát hành.

## Các vấn đề ưu tiên

### P1 · Điều hướng phản ánh danh mục chức năng hơn là việc cần làm

**Bằng chứng:** `Sidebar.tsx:77` đặt tên như “1. Ngân sách & Đối soát Kế toán”, kèm “42 Brand”; `Sidebar.tsx:671` tự thêm tất cả màn được cấp quyền nhưng chưa có trong menu vào “Màn hình mở rộng”. DOM phiên Admin xuất hiện thêm 11 mục trong nhóm này. Ở desktop, nhiều nhãn bị cắt còn “Dashboard Q…”, “Giao việc & Định mức Ta…”.

**Tác động:** người dùng phải đọc một danh mục dài và đoán phần bị cắt. Badge tĩnh cạnh mục menu tạo cảm giác số liệu cập nhật dù không gắn bộ lọc hiện tại.

**Sửa:** tổ chức theo Công việc, Kế hoạch, Booking & nội dung, Danh mục, Báo cáo, Quản trị; hiển thị nhóm phù hợp vai trò và mở nhóm đang dùng. Mọi màn được cấp quyền phải có vị trí điều hướng chủ đích hoặc được tìm qua tìm kiếm; bỏ nhóm gom thừa. Giữ quyền truy cập độc lập với việc ưu tiên hiển thị.

**Đạt khi:** nhãn đầy đủ ở desktop; không cần số thứ tự hay số bản ghi để hiểu nơi đến; không mất đường tới màn được phép dùng. Cho phép menu cuộn khi cần, bỏ yêu cầu cứng “mọi mục phải vừa một màn hình”.

### P1 · Dashboard có quá nhiều điểm nhấn và chữ nhỏ

**Bằng chứng nguồn:** `ExecutiveDashboardReportsView.tsx:1271` dùng khung viền 2px, nhãn “Chỉ Số Trọng Tâm #1 · Tỷ Lệ Giải Ngân Chi Phí (% Spend)”, chữ đậm, thêm số Gross, một ô dư địa, mô tả rồi thanh tiến độ lặp lại tiền và phần trăm. Khối kế tiếp tiếp tục “Chỉ Số Trọng Tâm #2”. Lần quét đầu ghi nhận 269 lần `font-bold/extrabold/black`, 165 lần cỡ 8–11,5px trong file này.

**Tác động:** khó phân biệt chỉ số cần hành động với số liệu giải thích. Nhấn mạnh gần như mọi thứ làm giảm khả năng đọc lướt.

**Sửa:** phần đầu chỉ gồm kỳ/phạm vi, tối đa bốn chỉ số và danh sách ngoại lệ cần xử lý. Ví dụ: Đã chi / Ngân sách Net; Video đã đăng / Kế hoạch; Gian vượt ngân sách; Việc quá hạn. Đưa phân tích chi tiết và Gross vào vùng đối chiếu hoặc chi tiết, giữ Net/Gross phân biệt rõ.

**Đạt khi:** trong màn hình đầu xác định được gian nào cần xử lý và bấm tới được; một chỉ số không lặp lại bằng cả câu văn, badge và thanh tiến độ; không có chữ dưới 12px trong UI vận hành.

### P1 · Bảng Kế hoạch tháng chứa cả danh sách lẫn hồ sơ chi tiết

**Bằng chứng DOM:** trước bảng có năm tab dài, bộ chọn kỳ, tổng hợp kế hoạch, cơ cấu kênh, tìm kiếm và bảy bộ lọc trạng thái. Một ô gian hàng gồm tên, phiên bản, sàn, thương hiệu, chiến dịch, hệ số, chênh lệch và nút “Miễn trừ?”. Ô nhân sự có người phụ trách, số người phối hợp, tuyến duyệt và nút đổi. Các ô kênh còn chứa nút theo từng nhân sự.

**Tác động:** bảng không còn là nơi so sánh nhanh giữa gian hàng. Mỗi hàng đòi hỏi đọc và chọn nhiều thao tác nhỏ.

**Sửa:** danh sách mặc định giữ Gian hàng, PIC, Ngân sách Net, Sản lượng, Trạng thái duyệt và một thao tác mở. Chiến dịch, hệ số, phiên bản, miễn trừ và phân bổ từng người chuyển vào panel chi tiết. Giữ một chế độ “Ma trận phân bổ” riêng cho người thực sự cần so sánh kênh; không xóa bảng nghiệp vụ chuyên sâu.

**Đạt khi:** không cắt tên gian hàng quan trọng; một hàng có tối đa hai dòng thông tin chính; trạng thái duyệt và trạng thái vận hành có nhãn khác nhau; không mất đường tới lịch sử phiên bản hoặc cấu hình hệ số.

### P1 · Nội dung đang giải thích cấu trúc phần mềm thay vì hướng dẫn việc kế tiếp

**Bằng chứng:** `InputPlanBreakdownView.tsx:1951` và `:1971` dùng “Layer 1”, “Layer 2”; `:2202` trình bày lại cả quy trình ba bước; `:2224` có nút “Chốt Layer 1 & Sang Phân rã Layer 2 →”. Sidebar thêm “Input Plan 4.1”, “Hero SKU”, “Content Angles” ở các nhãn khác nhau.

**Sửa:** dùng “Chỉ tiêu”, “Phân bổ”, “Chốt chỉ tiêu”, “Tiếp tục phân bổ”. Quy tắc và ví dụ dài đặt sau “Hướng dẫn”; chỉ hiện lỗi hoặc điều kiện chặn đúng lúc người dùng cần. Giữ các thuật ngữ team dùng thật như KOC, GMV, Net/Gross; không dịch máy hoặc xóa thuật ngữ nghiệp vụ chỉ để thuần Việt.

**Đạt khi:** người mới biết việc cần làm từ tiêu đề và nút; không cần học Layer hoặc số hiệu bảng nguồn để thao tác.

### P1 · Trạng thái và thông báo làm giảm độ tin cậy

**Bằng chứng:** `BrandHubView.tsx:696` ghi “100% kết nối realtime”. `MonthlyPlanHub.tsx`, hàm `handleRemindSubmission`, chỉ gọi `notify` nhưng báo “Đã gửi thông báo nhắc nộp kế hoạch…”. Hàm `handleCreatePlanForStore` điền ngân sách và mục tiêu mặc định khi giá trị bằng 0 hoặc thiếu. Màn Phân quyền quan sát được tiêu đề 16 lớp nhưng badge 17 Role; tổng quyền Admin có lúc 36/32 màn.

**Sửa:** hiển thị lần đồng bộ gần nhất và trạng thái kết nối thực; chỉ báo gửi thành công sau xác nhận của hệ thống gửi. Thiếu dữ liệu hiện thiếu; phân biệt rõ 0 với chưa có dữ liệu; mẫu khởi tạo phải được người dùng chọn rõ ràng. Số đếm dùng cùng nguồn và cùng phạm vi.

**Đạt khi:** lỗi gửi không xuất hiện toast thành công; mất kết nối không vẫn hiện khẳng định tuyệt đối; số lượng được chọn không lớn hơn tổng khả dụng; giá trị 0 không tự biến thành ngân sách mẫu.

### P1 · Design system có quy tắc nhưng triển khai vẫn phân mảnh

**Bằng chứng:** `DESIGN_SYSTEM.md` cấm chữ dưới 12px, font-bold, uppercase và nhiều họ màu; CSS vẫn khai báo `text-3xs` 11px. Có cả `Button` cao 34px, `.btn-md` cao 38px và nhiều nút tự viết. Quét đầu 85 file component thấy 1.033 thẻ `<button>` so với 284 `<Button>`, 105 `<table>` so với 27 `<DataTable>` — đây là chỉ báo phân mảnh, không phải tỷ lệ tuân thủ chính xác.

**Sửa:** chốt một bảng kích thước button/input; dùng cùng thành phần cho cùng hành vi; quy định ngoại lệ cho bảng chuyên sâu. Ưu tiên chuyển shell, dashboard, kế hoạch và phân quyền trước. Không thay hàng loạt chỉ theo tên class khi chưa xem ý nghĩa trạng thái.

**Đạt khi:** cùng hành vi có cùng kích thước, nhãn và trạng thái disabled/loading; các màn ưu tiên không còn vi phạm typography. Kiểm tra class cần bao phủ cả chuỗi cấu hình và helper, không chỉ className trực tiếp.

### P2 · CSS tương thích che giấu khác biệt, khó bảo trì

**Bằng chứng:** `globals.css` ánh xạ nhiều họ màu về một thang; selector `[class*="bg-slate-900"]`, `[class*="bg-[#0"]`… tự đổi nền tối thành sáng. Quy tắc `white-space: nowrap` áp dụng rộng cho ô bảng, nút và span có padding + bo góc. Header/surface lại có lớp polish thêm bóng sau phần mô tả không dùng bóng.

**Tác động:** đọc class không đoán chắc kết quả; một sửa đổi toàn cục có thể tác động màn không liên quan. Nội dung dài dễ tràn hoặc phải cắt.

**Sửa:** dùng token trực tiếp ở màn đã chuyển đổi; tách lớp tương thích vào phạm vi legacy rõ ràng và bỏ dần theo màn. Chỉ nowrap với số, mã hoặc nhãn thật sự cần. Thống nhất tài liệu về bóng và kích thước, không bổ sung lớp override nữa.

### P2 · Phân quyền giống tài liệu đặc tả đặt lên màn hình

**Bằng chứng trực quan:** banner giải thích dài, sáu tab nhiều chữ, danh sách role có tên + mã + mô tả + hai số đếm; phần bên phải lặp lại role, mô tả và phạm vi. Tab cuối nằm ngoài vùng nhìn ngay cả tại 1440px. Ở viewport hẹp, badge banner bị tràn.

**Sửa:** tách ba việc: Vai trò, Người dùng, Nhật ký. Danh sách vai trò chỉ tên và số người; chọn mới hiện mô tả/phạm vi chi tiết. Mã kỹ thuật chỉ hiện trong chi tiết quản trị. Tóm tắt thay đổi quyền và cách áp dụng phải rõ, không che cảnh báo thao tác quan trọng để giảm chữ.

### P2 · Thành phần chung còn thiếu hành vi bàn phím nhất quán

**Bằng chứng nguồn:** `ui/blocks.tsx:262`, Modal có `aria-modal`, Escape và đưa focus vào phần tử đầu, nhưng trong triển khai đọc được chưa có vòng giữ focus, trả focus về nút mở hoặc làm nền inert. `Button` không dùng `.btn-*` nên media query tăng vùng chạm lên 44px của `.btn-*` không tự áp dụng cho Button.

**Sửa:** hoàn thiện modal dùng chung rồi chuyển modal tự viết theo mức độ dùng. Kiểm tra Tab/Shift+Tab, Escape, focus trở lại, cuộn nội dung dài, vùng chạm. Đây là nhận xét nguồn cần xác minh bằng bàn phím, chưa phải kết quả test E2E.

### P2 · Chuyển động được đầu tư nhiều hơn thứ tự ưu tiên nội dung

**Bằng chứng:** design system và `globals.css` có số lăn, biểu đồ mọc, vạch trượt, dấu đóng, flash trạng thái và reveal màn. Đã có hỗ trợ reduced-motion — điểm tốt cần giữ.

**Sửa:** mặc định số liệu hiển thị ổn định; chỉ nhấn thay đổi do thao tác hoặc cập nhật có ý nghĩa. Giữ phản hồi hover/focus/loading; không dùng chuyển động để bù cho bảng khó đọc. Tần suất thực tế cần đo trong phiên dữ liệu ổn định.

## Phạm vi màn hình và hướng xử lý

Danh sách dưới là hướng audit/thiết kế theo nhóm; không khẳng định mọi màn trong nhóm có cùng lỗi hoặc đã được mở trên trình duyệt. Inventory ghi từng file để theo dõi chuyển đổi.

| Nhóm / file chính | Hướng xử lý | Ưu tiên |
|---|---|---|
| Sidebar, TopHeader, page, login | Rút nhãn menu; bỏ badge tĩnh không giúp quyết định; header chỉ ngữ cảnh cần thiết; login cần kiểm tra riêng khi không dùng phiên sẵn có | P1 |
| ExecutiveDashboardReports, WeeklyAirSync, Overview | Ngoại lệ cần xử lý trước; phân tích chuyên sâu sau; giảm nhấn mạnh và chữ nhỏ | P1 |
| MonthlyPlanHub, InputPlanBreakdown, GrowthPlanBreakdown, BrandOneSheetPlan, StorePlanMindmap | Tách danh sách, chỉnh sửa, phân bổ và xem lịch sử; đổi Layer thành việc thật | P1 |
| CentralizedRbacHub, ThirdPartyAccessSetup, AuditTrail | Tách vai trò/người dùng/nhật ký; đồng nhất số đếm; giữ thông tin tác động của thay đổi quyền | P1 |
| Booking, KocListingBatchHub, QuickBook, CampaignCreate | Một thao tác chính theo trạng thái; thao tác phụ trong menu; giữ ngoại lệ cần xử lý lộ rõ | P2 |
| Content, ContentAngleSetup, ScriptReview | Tập trung bản cần duyệt và lý do; lời giải thích dài hiển thị theo nhu cầu | P2 |
| Cockpit, Manager, ManagerDelegation, TaskDelegation, MyPlanWorkspace | Việc hôm nay/quá hạn lên trước; định mức và cấu hình tách khỏi danh sách thực thi | P2 |
| BrandProfiles, BrandProfileDetail, BrandEditors, BrandView | Dùng cấu trúc danh sách → hồ sơ thống nhất; chỉ hiện trường hữu ích cho việc đang làm | P2 |
| StoreManagement, StoreProfile, StoreCoefficientHubSection, StoreEdit/Handover | Tách hồ sơ và cấu hình hệ số; tránh đưa toàn bộ cấu hình vào mỗi hàng danh sách | P2 |
| KocMasterData, KocProfile, KocProfileModal, CreateKoc, KalodataSync | Dùng danh bạ KOC làm mẫu đối chiếu vì đã dùng thành phần chung khá rõ; kiểm tra riêng form dài và giấy tờ | P2 |
| CtvManagement, SelfChannelCtvHub, KocKolHub, BrandHub | Phân biệt màn đối tác với màn quản trị; một hàng chờ việc chính; bỏ lời hứa realtime tuyệt đối | P2 |
| ContractManagement, ContractCatalog, ContractDetail/Form/Viewer, LegalOcr | Giữ mẫu danh sách gọn; chi tiết pháp lý và tài liệu vẫn đầy đủ; thông báo đọc giấy tờ phải cho biết cần kiểm tra lại trường nào | P2 |
| SampleTracker, PushProducts | Ưu tiên tình trạng giao, hạn nộp, tồn mẫu; chi tiết địa chỉ/SKU mở theo bản ghi | P2 |
| WeeklyAdsReport, PerformanceP3, Leaderboard | Mỗi màn có câu hỏi quyết định riêng; giữ định nghĩa KPI và nguồn kỳ báo cáo trong chi tiết | P2 |
| MasterDataHub và toàn bộ master-data/* | Chuẩn hóa bảng/form; tránh bảng cấu hình lặp nhiều cách biểu diễn cùng thực thể | P2 |
| ApiKeySetup, MarketingKnowledgeQa | Cho phép thuật ngữ kỹ thuật cần thiết ở trang tích hợp; tài liệu dài đặt trong sổ tay, không dàn sang các màn tác nghiệp | P3 |
| PlanChat/Discussion/History/Approval/Sync, PartnerDiscussion, OperationalReportDrawer, ImportExcel, AiStaffReview, EmployeePlanInspector, StoreShortlistFilter | Kiểm tra mật độ và hành vi lớp nổi; không lặp toàn bộ ngữ cảnh của trang cha; phân biệt gợi ý với kết quả đã áp dụng | P2 |
| ui/index, blocks, data, motion, toast, PlatformLogos, ErrorBoundary | Bộ thành phần chuẩn; hoàn thiện keyboard, trạng thái lỗi/rỗng/tải và quy tắc kích thước | P1–P2 |

## Nội dung trước → sau

| Hiện tại | Đề xuất |
|---|---|
| Dashboard Quản Trị B2C | Báo cáo |
| 1. Ngân sách & Đối soát Kế toán | Ngân sách |
| 3. Lịch Air Tuần & Tiến độ Video | Lịch đăng video |
| Giao việc & Định mức Task | Giao việc; định mức ở phần cấu hình |
| Chỉ Số Trọng Tâm #1 · Tỷ Lệ Giải Ngân Chi Phí (% Spend) | Ngân sách đã dùng |
| Chốt Layer 1 & Sang Phân rã Layer 2 → | Chốt chỉ tiêu |
| Kế hoạch theo nhân sự (Việc của tôi) | Theo nhân sự |
| 100% kết nối realtime | Đồng bộ lúc [giờ thực tế], hoặc Chưa kết nối |
| Xuất Excel (5 Sheets) | Xuất Excel; số trang tính trong tùy chọn xuất |

Không cắt câu bằng cách bỏ thông tin bắt buộc: cảnh báo vượt Net, chi ngoài ngân sách, tuyến duyệt, tình trạng hợp đồng, quyền truy cập và nguyên nhân lỗi phải còn rõ ràng.

## Đề xuất chỉnh design system

1. **Bốn mẫu trang:** danh sách, chi tiết, nhập liệu nhiều bước, báo cáo. Mỗi mẫu có bản chuẩn về vị trí tiêu đề, lọc, trạng thái và hành động.
2. **Ngân sách nội dung:** một tiêu đề trang; tối đa một mô tả thật sự cần thiết; tối đa bốn KPI; một nút chính cho mỗi vùng quyết định. Đây là chuẩn khởi đầu, ngoại lệ cần có lý do nghiệp vụ.
3. **Danh sách:** mặc định hiển thị trường để so sánh và quyết định; chi tiết trong panel/hồ sơ. Không dùng chữ nhỏ để nhét thêm cột.
4. **Typography:** nội dung 14px, dữ liệu dày 13px, metadata 12px; trọng lượng 400/500/600; bỏ 11px và uppercase khỏi UI vận hành.
5. **Màu:** giữ bộ semantic hiện có; màu trạng thái chỉ mang ý nghĩa trạng thái; bỏ viền màu/nhãn màu chỉ để tô điểm tên phân hệ.
6. **Control:** một chiều cao mặc định cho button/input/select; vùng chạm được bảo đảm cả với Button mới; hành vi modal/tab/menu nhất quán.
7. **Copy:** nhãn ngắn theo tác vụ, không lặp Anh–Việt; thông báo dựa trên kết quả thật; hướng dẫn dài theo nhu cầu; thuật ngữ chuyên ngành có định nghĩa một nơi.
8. **Governance:** ví dụ đúng/sai và ảnh mẫu được duyệt cho mỗi mẫu trang; kiểm tra lint cộng review trực quan. Lint không phát hiện được toàn bộ dư chữ và thứ tự ưu tiên sai.

## Thứ tự triển khai đề xuất

1. Chốt shell, từ điển nhãn và mẫu danh sách; sửa các thông báo dễ gây hiểu nhầm và số đếm sai.
2. Làm một lát cắt hoàn chỉnh: Kế hoạch tháng → mở gian hàng → phân bổ → gửi duyệt. Đo xem người dùng tìm việc cần làm nhanh hơn mà không mất nghiệp vụ.
3. Áp dụng mẫu báo cáo cho dashboard, sau đó phân quyền và booking/nội dung.
4. Chuyển các màn còn lại theo inventory; gỡ CSS tương thích theo từng nhóm đã xác minh.

Không nên viết lại đồng loạt toàn bộ giao diện trước khi kiểm chứng một luồng. Tránh chỉ thay class, giảm font hoặc giấu mọi thứ vào menu ba chấm.

## Nghiệm thu sau chỉnh sửa

- Desktop 1440 × 900 và laptop 1280 × 800: menu đọc được; tiêu đề, bộ lọc và dòng dữ liệu đầu nằm trong vùng nhìn ở trang danh sách chuẩn.
- Viewport hẹp 390px và tablet 768px: không có banner tràn ra ngoài; bảng chuyên sâu cuộn trong vùng riêng; hành động cần thiết vẫn tới được.
- Người dùng tìm việc quá hạn/chờ duyệt và mở bản ghi đúng mà không đọc đoạn giới thiệu. So sánh với thời gian thực hiện trước sửa trên cùng nhiệm vụ; chưa có baseline để đặt phần trăm cải thiện.
- Tab/Shift+Tab không lọt khỏi modal; Escape đóng đúng lớp; focus quay về nơi mở; tên nút icon có thể đọc được.
- Loading, rỗng, lỗi, mất kết nối và dữ liệu bằng 0 được thể hiện đúng; chỉ báo thành công sau kết quả thật.
- Luồng duyệt, phạm vi vai trò, phân biệt Net/Gross, FOC/Paid và lịch sử không bị thay đổi do tinh giản giao diện.

## Tự kiểm chất lượng báo cáo

Áp dụng skill agent-self-evaluation. Điểm đánh giá báo cáo, không phải điểm chất lượng sản phẩm.

| Trục | Điểm | Bằng chứng / giới hạn |
|---|---|---|
| Chính xác | 4/5 | Có vị trí nguồn và quan sát DOM; số liệu là snapshot khi workspace có thay đổi, chưa xác minh mọi nhận xét bằng render |
| Bao phủ | 3/5 | Inventory toàn bộ TSX và danh sách nhóm màn; kiểm tra trực quan mới giới hạn ở Phân quyền và DOM Kế hoạch, chưa đủ mọi role/modal/breakpoint |
| Rõ ràng | 4/5 | Mỗi lỗi có nguyên nhân và cách sửa; báo cáo dài vì cần giữ bằng chứng và phạm vi |
| Hành động được | 4/5 | Có thứ tự triển khai, copy trước/sau và tiêu chí nghiệm thu; chưa có bản thiết kế tương tác để dùng trực tiếp |
| Súc tích | 4/5 | Kết luận ngắn, chi tiết nằm theo mục; bảng phạm vi còn dài để không bỏ sót nhóm |

Trung bình: 3,8/5. Cải thiện quan trọng nhất: hoàn tất vòng trực quan trên phiên dữ liệu ổn định, đủ các vai trò và kích thước; sau đó kiểm chứng lát cắt Kế hoạch với người dùng thực. Người dùng có thể đồng ý với chẩn đoán, nhưng chưa nên coi đây là chứng nhận đã kiểm thử mọi màn hình.
