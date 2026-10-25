# SỔ ĐĂNG KÝ LỖI HỆ THỐNG & QUY TẮC PHÒNG NGỪA TÁI PHÁT — B2C OPS HUB

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | HUB-GOV-04 |
| Dự án | B2C Ops Hub — Quản trị & Điều hành phòng Marketing B2C |
| Trạng thái | Đang dùng (Sổ ghi liên tục — Bắt buộc đối chiếu khi sửa lỗi & phát triển tính năng) |
| Cập nhật | 25/10/2026 |

Tài liệu này hệ thống hóa toàn bộ các lỗi kỹ thuật, lỗi hiển thị dữ liệu và lỗi logic nghiệp vụ do người dùng cùng trợ lý phát hiện trong quá trình xây dựng **B2C Ops Hub**. Mỗi lỗi đều được rút trích thành **Quy tắc phòng ngừa chuẩn** để áp dụng chéo cho tất cả các phân hệ khác (`Danh bạ KOC`, `Booking`, `Kế hoạch tháng`, `Hồ sơ Thương hiệu`, `Gian hàng`, `Hợp đồng`, `Giao việc & Workload`).

---

## 1. Phân loại nhóm lỗi & Nguyên tắc phòng ngừa dùng chung (Cross-Module Prevention Rules)

| Mã quy tắc | Nhóm lỗi | Nguyên tắc bắt buộc áp dụng trên toàn bộ phân hệ |
| --- | --- | --- |
| **RULE-DATA-01** | **Cấm sinh trạng thái giả bằng hàm băm / ngẫu nhiên (`FAKE_HASH_FALLBACK`)** | Tuyệt đối **KHÔNG** dùng hàm băm (`hash % N`), số ngẫu nhiên (`Math.random`) hoặc hằng số `|| true` để hiển thị trạng thái nghiệp vụ (có kênh MXH, đủ giấy tờ, đã ký hợp đồng, đã duyệt chi, đạt SLA...). Chỉ hiển thị dấu tích (`✓`) hoặc nhãn tích cực khi trường dữ liệu thực tế có giá trị hợp lệ; nếu trống phải hiển thị `—` hoặc `Chưa xác nhận`. |
| **RULE-SYNC-01** | **Đồng bộ 100% giữa Bảng danh sách và Màn chi tiết (`LIST_DETAIL_DESYNC`)** | Trạng thái hiển thị trên cột của Bảng danh sách (`DataTable` ngoài danh bạ) và trạng thái hiển thị bên trong Trang chi tiết / Hộp thoại (`Profile` / `Modal`) phải đọc từ **cùng một hàm kiểm tra / cùng một trường dữ liệu gốc** (Single Source of Truth). Cấm để ngoài bảng báo "Có / Đủ" nhưng bấm vào chi tiết lại báo "Chưa xác nhận / Thiếu". |
| **RULE-UX-01** | **Cấm tự động tích xác nhận ứng viên độ tin cậy thấp (`PREMATURE_AUTO_CONFIRM`)** | Khi hệ thống dò tìm/gợi ý dữ liệu tự động (kênh MXH của KOC, khớp SKU, gợi ý KOC...), chỉ tự động điền sẵn các kết quả có độ tin cậy `CAO` / `TRUNG_BÌNH` đã xác thực tồn tại thực tế (`isVerifiedLive`). Các kết quả mức `GỢI_Ý` chỉ liệt kê để người dùng chủ động kiểm tra và bấm chọn. |
| **RULE-TS-01** | **Tuân thủ chặt chữ ký hàm & Props của Component UI (`UI_CONTRACT_MISMATCH`)** | Khi sử dụng các component trong `src/components/ui` (`Modal`, `ConfirmDialog`, `DataTable`, `FilterBar`, `Select`) hoặc các hàm chuẩn hóa trong `src/lib/types.ts` (`normalizeStoreCoefficient`...), phải đối chiếu đúng tên thuộc tính (`onCancel` vs `onClose`, kiểu trả về object vs number) và kiểm tra `npx tsc --noEmit` trước khi đóng tác vụ. |
| **RULE-BUILD-01** | **Chống xung đột khóa `.next/lock` khi chạy Build (`CONCURRENT_NEXT_BUILD_LOCK`)** | Không chạy song song nhiều tiến trình `next build` cùng lúc trên cùng thư mục `web-admin/.next` (gây lỗi mất file tạm `.next/types/**/*.ts` `TS6053` hoặc `.next/server/chunks/*.js`). Kiểm tra kiểu dữ liệu nhanh bằng `npx next typegen && npx tsc --noEmit`, sau đó chạy tuần tự duy nhất 1 lệnh `npm run build`. |
| **RULE-UI-01** | **Chuẩn hóa ngôn ngữ nghiệp vụ & Cấm phụ đề thừa (`UI_COPY_AND_SUBTITLE_VIOLATION`)** | Cấm dùng từ ngữ quảng cáo/buzzword ("AI", "Trí tuệ nhân tạo", "Smart", "1-chạm", "Siêu tốc") trên giao diện và cấm viết dòng chữ giải thích xám (`subtitle`, `description`) dưới tiêu đề Trang, Khung (`Panel`), Hộp thoại (`Modal`), Khối (`SectionHeader`). |
| **RULE-AUTH-01** | **Bảo vệ toàn diện Endpoint API & Cách ly Đối tác ngoài (`API_SESSION_AND_PARTNER_ISOLATION`)** | Mọi API route nội bộ đều bắt buộc kiểm tra phiên đăng nhập (`getAuthenticatedUser` / `decodeSessionToken`) trả mã HTTP 401 khi chưa đăng nhập, và chặn đứng tài khoản đối tác ngoài (`user.partnerType` / `role.endsWith('_PARTNER')`) với mã HTTP 403 khi truy cập API nghiệp vụ nội bộ. |
| **RULE-RBAC-01** | **Ưu tiên kích hoạt Quyền phê duyệt đặc thù cá nhân (`SPECIAL_PERMISSION_OVERRIDE_PRECEDENCE`)** | Khi người dùng được gán các cờ quyền cá nhân (`canApprovePayment`, `canApproveBudget`, `canApproveP3`, `canManageMasterData`, `canExportRawData`), hệ thống phải kiểm tra và cho phép thao tác độc lập, không được để điều kiện `level !== 'DENIED'` của vai trò gốc làm vô hiệu hóa quyền đặc thù. |
| **RULE-API-02** | **Cấm tự động chạy API phân tích / cào dữ liệu khi mở hộp thoại (`AUTO_RUN_API_ON_OPEN`)** | Tuyệt đối **KHÔNG** gọi `executeOperationalReport`, `/api/integrations/llm`, `social-discovery`, `scrape` hay `link-air-check` bên trong `useEffect` ngay khi mở Modal/Drawer (`open` / `isOpen`). Chỉ gọi API khi người dùng chủ động bấm nút thực thi (`Đánh giá`, `Chạy phân tích`, `Dò tìm kênh tự động`, `Lấy dữ liệu kênh`). |
| **RULE-PERF-01** | **Tối ưu truy xuất lô (`readRecordsBatch`), dùng bộ nhớ đệm Plan (`fetchClientMonthlyPlans` / `WeakMap`) & Cấm quét $O(N \times M)$ trên luồng render (`PLAN_LOAD_AND_RENDER_OPTIMIZATION`)** | (1) Khi API đọc nhiều khóa `AppSharedRecord` (`deal-board`, `self-channel-board`, `content-plan`, `plan-actual-report`), bắt buộc dùng `readRecordsBatch(keys, fallback, { clone: false })` thay vì lặp `readRecord` lẻ tẻ hoặc `structuredClone` sâu không cần thiết; (2) Trên trình duyệt, mọi màn hình đọc `/api/monthly-plans` phải đi qua `fetchClientMonthlyPlans` / `getCachedClientMonthlyPlans` (`useMonthlyPlanSync.ts`) và so sánh tham chiếu đối tượng (`lastSavedObjRef`) trước khi `JSON.stringify`; (3) Các phép tính kiểm định/tổng hợp kế hoạch (`sumBreakdown`, `validateBreakdown`, `evaluatePlanValiditySummary`, `getStorePlanWorkstreamSummary`, `enrichPlanWithVersions`, `buildStoreMonthlyPlanReport`) phải bọc `WeakMap` memoization và lập chỉ mục `Map` $O(1)$ thay vì lặp lồng nhau $69 \text{ gian} \times 16.039 \text{ deal}$ trên mỗi lần render. |

---

## 2. Danh mục chi tiết các lỗi đã phát hiện & Cách xử lý (Bug Registry)

### BUG-001 — Danh bạ KOC hiển thị dấu tích "Có kênh" cho Shopee, Facebook, Instagram, Threads dù KOC không có kênh
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/KocMasterDataView.tsx` (hàm `hasKocPlatform`), đối chiếu với `web-admin/src/components/koc/KocProfile.tsx` và `web-admin/src/components/koc/KocSocialChannelsModal.tsx`.
- **Triệu chứng:** Trên bảng Danh bạ KOC, hàng loạt KOC hiển thị dấu tích xanh (`✓`) ở các cột Shopee, Facebook, Instagram, Threads. Tuy nhiên khi bấm vào hồ sơ chi tiết KOC hoặc mở hộp thoại xác nhận kênh thì các kênh này đều trống (`Chưa xác nhận`).
- **Nguyên nhân gốc (Root Cause):** Hàm `hasKocPlatform` trong `KocMasterDataView.tsx` chứa đoạn mã fallback tính mã băm từ ID và tên KOC (`hash % 3 !== 0`, `hash % 2 === 0`, `(k.followers || 0) > 30000 || hash % 3 === 0`, `hash % 4 === 1`) để tự sinh dấu tích khi KOC chưa có trường `shopeeChannel`, `facebookChannel`, `instagramChannel`, `threadsChannel`.
- **Cách khắc phục:** Xóa bỏ toàn bộ logic băm giả lập trong `hasKocPlatform`. Chỉ trả về `true` khi trường kênh tương ứng thực sự có dữ liệu (`Boolean(k.shopeeChannel?.trim())`, `Boolean(k.facebookChannel?.trim())`, `Boolean(k.instagramChannel?.trim())`, `Boolean(k.threadsChannel?.trim())`, và `Boolean(k.channelId?.trim() || k.channelLink?.trim() || k.tiktokChannel?.trim())` cho TikTok).
- **Phạm vi rà soát mở rộng sang phần khác:** Áp dụng **RULE-DATA-01** và **RULE-SYNC-01** cho toàn bộ bảng Danh sách Thương hiệu (`BrandsMasterView`), Danh sách Gian hàng (`StoresMasterView`), Danh sách VJ/CTV (`CtvMasterView`) và Quản lý Booking (`BookingManagementView`) — mọi dấu tích trạng thái hoặc huy hiệu nền tảng chỉ được hiển thị từ dữ liệu thực của bản ghi.

---

### BUG-002 — Hộp thoại Thêm KOC tự động điền cả ứng viên kênh MXH mức "Gợi ý" chưa qua xác thực khớp cao
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/CreateKocModal.tsx` (hàm `handleSearchSocialChannels`), `web-admin/src/components/koc/KocSocialChannelsModal.tsx`.
- **Triệu chứng:** Khi bấm tìm kênh MXH lúc tạo KOC mới, ô nhập tự động điền luôn ứng viên đầu tiên kể cả khi ứng viên đó chỉ ở mức `GỢI_Ý` (`confidence === 'GỢI_Ý'`), dễ dẫn tới lưu nhầm kênh nếu người dùng không để ý xóa đi.
- **Nguyên nhân gốc (Root Cause):** Điều kiện gán tự động trong `CreateKocModal.tsx` chỉ kiểm tra `data.candidatesByPlatform.SHOPEE[0]` mà chưa lọc bỏ mức `confidence === 'GỢI_Ý'`.
- **Cách khắc phục:** Chỉ tự động điền vào ô nhập khi ứng viên đầu tiên có độ tin cậy `CAO` hoặc `TRUNG_BÌNH` (`confidence !== 'GỢI_Ý'`); các ứng viên mức `GỢI_Ý` chỉ hiển thị dưới dạng danh sách gợi ý để người dùng tự bấm chọn sau khi kiểm tra link.
- **Phạm vi rà soát mở rộng sang phần khác:** Áp dụng **RULE-UX-01** cho các luồng tự động bóc tách OCR (`LegalOcrModal`), tự động khớp SKU và tự động đề xuất KOC.

---

### BUG-003 — Hộp thoại xác nhận (`ConfirmDialog`) truyền sai tên prop `onClose` thay vì `onCancel`
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/brands/CloudflareR2SetupPanel.tsx` và `web-admin/src/components/ui/blocks.tsx`.
- **Triệu chứng:** Lỗi biên dịch TypeScript `TS2322: Property 'onClose' does not exist on type ...` tại `CloudflareR2SetupPanel.tsx`.
- **Nguyên nhân gốc (Root Cause):** Component `<Modal>` trong `src/components/ui/blocks.tsx` dùng prop `onClose`, trong khi component `<ConfirmDialog>` dùng prop `onCancel` (và `onOpenChange`), dẫn tới nhầm lẫn khi gọi `<ConfirmDialog onClose={...} />`.
- **Cách khắc phục:** Đổi `onClose` thành `onCancel` tại `<ConfirmDialog>` trong `CloudflareR2SetupPanel.tsx`.
- **Phạm vi rà soát mở rộng sang phần khác:** Áp dụng **RULE-TS-01**: phân biệt rõ `<Modal open onClose={...}>` và `<ConfirmDialog open onCancel={...} onConfirm={...}>` trên toàn bộ các màn hình.

---

### BUG-004 — Lệch chữ ký hàm `normalizeStoreCoefficient` và thiếu re-export tại `taskDelegationData.ts`
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/taskDelegationData.ts`, `web-admin/src/components/views/TaskDelegationView.tsx`, `web-admin/src/lib/types.ts`.
- **Triệu chứng:** Lỗi biên dịch TypeScript `TS2459` (import `normalizeStoreCoefficient` từ `taskDelegationData` nhưng module chưa export) và `TS2345`/`TS2339` (gọi `normalizeStoreCoefficient(matched.workloadCoefficient)` và `.toFixed(2)` trực tiếp trên kết quả trả về là object `{ tier, multiplier, label, rule }`).
- **Nguyên nhân gốc (Root Cause):** Hàm `normalizeStoreCoefficient(tier, multiplier)` trong `src/lib/types.ts` trả về một object đầy đủ `{ tier, multiplier, label, rule }`, nhưng nơi gọi trong `TaskDelegationView.tsx` giả định hàm nhận 1 số và trả về 1 số (`number`), đồng thời `STORE_SCOPE_TABLE_2` dùng khóa `item.code` thay vì `item.tier`.
- **Cách khắc phục:**
  1. Re-export `export { normalizeStoreCoefficient }` tại `src/lib/taskDelegationData.ts`.
  2. Cập nhật lời gọi tại `TaskDelegationView.tsx` thành `normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier).multiplier` và dùng `key={item.code}` cho `STORE_SCOPE_TABLE_2`.
- **Phạm vi rà soát mở rộng sang phần khác:** Áp dụng **RULE-TS-01** cho mọi nơi tính điểm Workload Bảng 1–7 (`TaskDelegationView`, `ManagerDelegationHub`, `Workload3dMapView`, `MonthlyPlanView`).

---

### BUG-005 — Lệch số liệu Workload, số gian hàng phụ trách và ngoại lệ Bảng 4 giữa `TaskDelegationView`, `Workload3dMapView` và `ManagerDelegationHub`
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/taskDelegationData.ts`, `web-admin/src/components/views/TaskDelegationView.tsx`, `web-admin/src/components/views/Workload3dMapView.tsx`, `web-admin/src/components/views/ManagerDelegationHub.tsx`.
- **Triệu chứng:**
  1. Bảng tải công việc tại `TaskDelegationView` và Bản đồ 3D (`Workload3dMapView`) tự tính điểm nhân sự bằng 2 vòng lặp độc lập; khi Quản lý xác nhận ngoại lệ giữ nguyên hệ số cơ cấu `×1,00` (Bảng 4) ở bảng giao việc thì Bản đồ 3D không cập nhật theo, và chiều cao cột 3D chỉ lấy điểm thô (`rawTotalPts`) thay vì điểm cuối kỳ (`finalMonthlyWorkloadPts`).
  2. Số gian hàng phụ trách hiển thị từ chuỗi tĩnh `storesSummary` thay vì đếm trực tiếp từ `storePortfolios` đang gán cho PIC.
  3. Tại `ManagerDelegationHub`, đổi PIC gian hàng không tự động ghi nhận vào tab `Lịch sử PIC & Bàn giao`, và tab `Cân bằng tải & Danh bạ` bị ẩn đối với một số vai trò quản lý.
- **Nguyên nhân gốc (Root Cause):** Thiếu hàm tổng hợp tải nhân sự dùng chung (Single Source of Truth) giữa các màn hình điều phối và trạng thái `assignmentHistory` bị khai báo tĩnh bằng `useMemo` thay vì `useState`.
- **Cách khắc phục:**
  1. Xây dựng hàm hợp nhất `computeUnifiedB2cStaffWorkloads({ tasks, brands, storePortfolios, managerExceptions })` và lưu trữ `managerExceptions` qua `localStorage` kèm sự kiện đồng bộ `upbase-workload-exceptions-updated`.
  2. Kết nối cả `TaskDelegationView` và `Workload3dMapView` vào `computeUnifiedB2cStaffWorkloads`, bổ sung nút điều hướng nhanh **Xem trên Bản đồ 3D** (`upbase-focus-3d-node`).
  3. Chuyển `assignmentHistory` sang `useState` trong `ManagerDelegationHub` để tự động ghi vết bàn giao khi đổi PIC gian hàng, mở tab `STAFF` cho mọi cấp quản lý và ưu tiên danh sách 28 nhân sự thực thi B2C.
- **Phạm vi rà soát mở rộng sang phần khác:** Áp dụng **RULE-SYNC-01** cho toàn bộ các màn hình thuộc nhóm `Điều phối & Giao việc`.

---

### BUG-006 — Các hộp thoại chỉnh sửa phân bổ (`editingAllocation`, `isTierQuotaModalOpen`, `EmployeePlanInspectorModal`) nằm lồng bên trong nhánh điều kiện `activeTab === 'SLA_MANAGEMENT'` tại `ManagerView.tsx`
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/ManagerView.tsx`.
- **Triệu chứng:** Khi người dùng ở tab `Hạn mức & duyệt Plan` (`activeTab === 'ALLOCATION'`) và bấm nút `Cấu hình hạn mức 4 bậc`, `Soi Plan` hoặc `Sửa`, hộp thoại không hiển thị lên màn hình vì khối JSX của các hộp thoại này bị đặt nhầm bên trong khối `{activeTab === 'SLA_MANAGEMENT' && (...)}`.
- **Nguyên nhân gốc (Root Cause):** Đóng thiếu ngoặc `)}` của nhánh `{activeTab === 'SLA_MANAGEMENT' && (` ở dòng 1843, khiến toàn bộ các Modal phía cuối component chỉ được mount khi tab `SLA_MANAGEMENT` đang mở.
- **Cách khắc phục:** Đóng đúng khối `{activeTab === 'SLA_MANAGEMENT' && (` ngay sau bảng vi phạm SLA, chuyển toàn bộ các hộp thoại ra cấp gốc của `ManagerView` và chuẩn hóa sang component `<Modal>` từ `src/components/ui`.
- **Phạm vi rà soát mở rộng sang phần khác:** Khi đặt `<Modal>` dùng chung hoặc hộp thoại của từng tab trong component đa tab, luôn đặt khối `<Modal>` ở ngoài cùng của component trả về để tránh bị unmount theo tab khác.

---

### BUG-007 — Tab `Cân bằng tải B2C` và Hộp thoại `Giao việc` tại `ManagerDelegationHub.tsx` vẫn lặp qua 9 nhân sự mẫu (`staffList`) và thiếu điểm SOW Bảng 1
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/ManagerDelegationHub.tsx`, `web-admin/src/components/views/TaskDelegationView.tsx`, `web-admin/src/components/views/Workload3dMapView.tsx`.
- **Triệu chứng:**
  1. Trong `ManagerDelegationHub.tsx` (`activeSection === 'STAFF'`, `staffSubView === 'WORKLOAD'`), danh sách cân bằng tải chỉ hiển thị 9 nhân sự mẫu từ `STAFF_MASTER_DIRECTORY` (`Khánh Vy`, `Minh Tuấn`...) với định mức cứng `maxStoresCapacity || 3` thay vì 28 nhân sự thực thi B2C từ `computeUnifiedB2cStaffWorkloads`.
  2. Hộp thoại giao việc nhanh tại `ManagerDelegationHub.tsx` (`handleCreateTask`) không gắn hạng mục SOW Bảng 1 và không tính `calculatedWorkloadPoints`, đồng thời sau khi tạo xong bị reset về `'Khánh Vy'` / `'Fresh'`.
  3. Khi Quản lý chọn nhân sự trong các ô `<select>` phân công Gian hàng, Brand hoặc Giao việc mới, danh sách chỉ hiện tên mà không hiện `% tải` hiện tại và số gian đang nắm giữ; hộp thoại `Chi tiết công việc` tại `TaskDelegationView.tsx` chưa cho phép đổi trực tiếp `Người phụ trách (PIC)`.
- **Nguyên nhân gốc (Root Cause):** `ManagerDelegationHub.tsx` chưa được nối vào `computeUnifiedB2cStaffWorkloads` và `loadSavedSowPolicies`, đồng thời các ô chọn nhân sự chưa tra cứu `staffWorkloadByName`.
- **Cách khắc phục:**
  1. Kết nối `computeUnifiedB2cStaffWorkloads`, `loadSavedManagerExceptions`, `persistManagerExceptions` và `loadSavedSowPolicies` vào `ManagerDelegationHub.tsx`; hiển thị đầy đủ 28 nhân sự B2C kèm bộ lọc trạng thái tải (`Quá tải ≥115%`, `Đủ tải 96–114%`, `Dư công suất <96%`, `Thiếu việc khó ×0,70`).
  2. Hiển thị trực tiếp `(Level · X gian · Y% tải)` trong mọi ô `<select>` chọn PIC của `TaskDelegationView` và `ManagerDelegationHub`.
  3. Bổ sung **Thanh Điều phối Nhanh cho Quản lý (Manager Radar Strip)**, gợi ý gán nhanh theo PIC thực tế của Gian hàng / Brand trong hộp thoại `Giao việc mới`, cho phép đổi trực tiếp `Người phụ trách (PIC)` trong hộp thoại `Chi tiết công việc`, và bổ sung nút `Duyệt ×1,00` ngay trên Inspector của `Workload3dMapView.tsx`.
- **Phạm vi rà soát mở rộng sang phần khác:** Áp dụng **RULE-SYNC-01** cho mọi dropdown chọn nhân sự điều phối trên toàn hệ thống.

---

### BUG-008 — Rà soát Click-Path & E2E phân hệ Hợp đồng (`ContractManagementView`, `ContractForm`, `ContractDetail`, `contractRules`, `browserDemo`)
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/contracts/contractRules.ts`, `web-admin/src/components/contracts/contractUi.ts`, `web-admin/src/components/contracts/ContractForm.tsx`, `web-admin/src/components/contracts/ContractDetail.tsx`, `web-admin/src/components/views/ContractManagementView.tsx`, `web-admin/src/components/contracts/browserDemo.ts`, `web-admin/src/app/page.tsx`.
- **Triệu chứng:**
  1. `evaluateContractRules` trong `contractRules.ts` trả về mã mẫu nghiệm thu `${subjectKind}-NT` thay vì mã chuẩn `${subjectKind}-BBNT` (`IND-BBNT`, `HKD-BBNT`, `COM-BBNT`, `CTV-BBNT`).
  2. Khi bấm **Tạo biên bản nghiệm thu** từ một Hợp đồng đã ký (đặc biệt các hợp đồng tạo độc lập không gắn `dealId` hoặc có thông tin Bên B quét từ OCR), form tạo BBNT không tự động kế thừa các trường thông tin Bên B (`partyName`, `cccd`, `taxCode`, `address`, `phone`, `email`, `[ID KOC]`, `product`, `lineTotal`) từ Hợp đồng gốc (`parentRecord`).
  3. Tại `ContractDetail.tsx`, khối đối soát tài chính và quy chuẩn pháp chế thiếu danh sách `kocs` và chưa đọc trường `token:[Tổng tiền trước thuế/sau thuế]` đối với hợp đồng tải lên từ file `.docx` riêng của KOC (`isKocOwnForm: true`), dẫn tới hiển thị `Chưa điền số tiền`.
  4. Khi chuyển sang vai trò kiểm thử hợp đồng (`contract-demo-legal`, `contract-demo-finance`, `contract-demo-sign`) trên thanh Header, `page.tsx` bỏ qua việc cập nhật phiên cookie máy chủ qua `/api/contracts/demo`, khiến máy chủ vẫn giữ nguyên vai trò cũ.
  5. Chế độ giả lập trình duyệt (`browserDemo.ts`) thiếu nhánh xử lý `ADD_NOTE`, lưu mẫu riêng `saveAsKocTemplate` và thay thế token trong `renderParagraphs`.
- **Nguyên nhân gốc (Root Cause):** Lệch hậu tố mã mẫu giữa `contractRules.ts` và `templates.ts`; hàm `prefill` chưa nhận `parentRecord`/`parentFields`; `page.tsx` xếp `contract-demo-*` vào nhánh `isLocalPreview` không gọi API đổi phiên.
- **Cách khắc phục:**
  1. Chuẩn hóa `recommendedTemplateId` trong `contractRules.ts` thành `${subjectKind}-${kind === 'ACCEPTANCE' ? 'BBNT' : 'HD'}`.
  2. Mở rộng `prefill` trong `contractUi.ts` và `ContractForm.tsx` để tự động kế thừa dữ liệu từ `parentRecord` khi lập BBNT.
  3. Truyền `kocs` vào `ContractDetail.tsx` và đọc giá trị `token:[Tổng tiền trước thuế/sau thuế]` cho hồ sơ `isKocOwnForm`.
  4. Gọi `/api/contracts/demo` khi chuyển đổi sang tài khoản `contract-demo-*` tại `page.tsx` và `ContractManagementView.tsx`; bổ sung đầy đủ `ADD_NOTE`, `saveAsKocTemplate` và `renderParagraphs` trong `browserDemo.ts`.
- **Phạm vi rà soát mở rộng sang phần khác:** Áp dụng kiểm thử Click-Path E2E (`tests/contract-e2e-ui-ux-flow.test.ts`) cho toàn bộ vòng đời Tạo hợp đồng → OCR → Gửi duyệt → Pháp chế/Kế toán duyệt (kèm lưu mẫu KOC) → Ký số → Lập Biên bản nghiệm thu.

---

### BUG-009 — Rà soát Logic Hệ số Gian hàng, Bàn giao PIC, Gán Plan theo Sàn & Đồng bộ Điểm Tải / Thưởng P3
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/stores/StoreCoefficientHubSection.tsx`, `web-admin/src/components/stores/StoreProfile.tsx`, `web-admin/src/components/stores/StoreEditDialog.tsx`, `web-admin/src/components/stores/StoreHandoverDialog.tsx`, `web-admin/src/components/views/StoreManagementView.tsx`, `web-admin/src/components/views/PerformanceP3View.tsx`, `web-admin/src/components/views/ManagerDelegationHub.tsx`, `web-admin/src/lib/monthlyProfileMetrics.ts`, `web-admin/src/lib/taskDelegationData.ts`, `web-admin/src/lib/mockData.ts`, `web-admin/src/app/page.tsx`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Shadow State tại `StoreManagementView` và `StoreCoefficientHubSection`:** Hai màn hình giữ state cục bộ (`storeOverrides` / `localStoreOverrides`) khiến thay đổi từ màn hình khác (`PerformanceP3View`, `ManagerDelegationHub`) không phản ánh ngược lại.
  2. **Tab Hệ số Gian hàng tại `PerformanceP3View` dùng bảng riêng và không tính lại điểm P3:** Tab 2 của `PerformanceP3View` dùng giao diện riêng thay vì `StoreCoefficientHubSection`, và `staffRecords` đọc giá trị tĩnh `INITIAL_PERFORMANCE_RECORDS` nên khi đổi hệ số gian hàng (`0,80 / 1,00 / 1,25 / 1,50`), điểm tải quy đổi và thưởng P3 ước tính không đổi theo.
  3. **Hàm `computeUnifiedB2cStaffWorkloads` chưa nhân hệ số gian hàng (`st.coef`) và còn fallback chia lấy dư (`rosterIdx % length`):** Vi phạm `RULE-DATA-01` và làm điểm tải công việc không thay đổi khi điều chỉnh hệ số gian hàng.
  4. **Hàm `matchStorePlan` trong `monthlyProfileMetrics.ts` gán nhầm Plan của gian TikTok sang gian Shopee/Lazada cùng Brand:** Khi một Brand chỉ có 1 dòng Plan tổng trên TikTok (`brandPlans.length === 1`), nhánh `if (brandPlans.length === 1) return brandPlans[0]` gán luôn Plan đó cho cả gian Shopee (`Plan 0đ`), làm nhân đôi chỉ tiêu Plan ở cấp Brand và làm mất cảnh báo chi vượt ngân sách (`Plan 0đ`).
  5. **Hàm `buildStoreMonthlyPlanReport` ưu tiên `directPlan?.pic` hơn `store.b2cOwnerName` và dùng `Math.max(..., reportSpentNet * 3.8)`:** Khiến việc bàn giao PIC không cập nhật trên `StoreProfile` và sinh GMV giả khi chưa có GMV thực tế (`RULE-DATA-01`).
  6. **Mất thay đổi Hệ số / PIC khi chuyển đổi tài khoản (`reload` `/api/master-data`) trong `page.tsx`:** Khi đổi `currentUser`, `/api/master-data` trả về danh sách gian hàng đã lọc theo quyền và ghi đè toàn bộ `storePortfolios` trong state.
- **Cách khắc phục:**
  1. Xóa toàn bộ state đệm cục bộ (`storeOverrides`, `localStoreOverrides`), đồng bộ 100% qua `stores` prop và lưu `upbase_store_overrides_v1` tại `page.tsx` (merge theo `id` khi tải `/api/master-data`).
  2. Hợp nhất Tab Hệ số gian hàng tại `PerformanceP3View` dùng chung `<StoreCoefficientHubSection />` và tính động `liveStaffRecords` (hệ số gian hàng bình quân, điểm tải quy đổi và thưởng P3) theo `storePortfolios`.
  3. Nhân hệ số độ khó trung bình của các gian hàng phụ trách vào `workflowPts` và `hardPts` trong `computeUnifiedB2cStaffWorkloads`, đồng thời xóa bỏ fallback `rosterIdx % length` và `idx % N` trong `mockData.ts`.
  4. Kiểm tra khớp sàn (`platformMatches`) và `storeId` trong `matchStorePlan`, ưu tiên `store.b2cOwnerName` sau khi bàn giao PIC, và xóa bỏ công thức nhân `3.8` giả lập GMV trong `monthlyProfileMetrics.ts`.
- **Phạm vi rà soát mở rộng sang phần khác:** Áp dụng kiểm tra đối xứng dữ liệu giữa `Danh mục Gian hàng` ↔ `Hồ sơ Gian hàng` ↔ `Hệ số Gian hàng` ↔ `Điểm tải B2C` ↔ `Thưởng P3`.

---

---

### BUG-010 — Rà soát Toàn Diện Giao Diện Người Dùng & Chuẩn Hóa Responsive Desktop / Mobile, Hộp Thoại (Modal) và Tiêu Đề Nghiệp Vụ
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** Toàn bộ 40+ views, modals, drawers trong `web-admin` (Dashboard, Báo cáo, Kế hoạch & Booking, Thương hiệu & Gian hàng, Kho Nội dung, Điều phối & Phân quyền, Nghiên cứu & Đối tác, Cấu hình API & Dữ liệu gốc).
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Lạm dụng Hộp thoại tự dựng (`<Presence show={...}><div className="fixed inset-0 ...">`):** Nhiều màn hình (`KocListingBatchHubView`, `SelfChannelCtvHubView`, `PushProductsView`, `ContentAngleSetupView`, `BrandView`, `BrandHubView`, `KocKolHubView`, `MasterDataMindmapView`, `StoresMasterView`) tự viết hộp thoại thủ công thay vì dùng component chuẩn `<Modal>` từ `src/components/ui`, dẫn đến giao diện thiếu đồng nhất, nút đóng không chuẩn, và vi phạm quy chuẩn thiết kế.
  2. **Dòng phụ đề/giải thích thừa dưới tiêu đề Hộp thoại và Trang:** Xuất hiện các thẻ `<p className="text-xs text-slate-500 mt-0.5">` hoặc thuộc tính `description="..."` trên component `<Modal>` (`BrandProfileDetail`, `ScriptReviewModal`, `EmployeePlanInspectorModal`, `BrandView`, `BrandHubView`, `KocKolHubView`, `MarketingKnowledgeQaView`, `MasterDataHubView`, `StoresMasterView`, `BrandEditors`, `KocProfile`), vi phạm quy tắc cấm phụ đề xám trong `GEMINI.md`.
  3. **Lỗi hiển thị ký tự tiếng Việt do bảng mã (Mojibake):** File `navGroups.ts`, `TopHeader.tsx`, và `LeaderboardView.tsx` từng bị ghi đè bằng PowerShell OEM codepage gây sai font các tên tab điều hướng và tiêu đề cột.
  4. **Kém tương thích trên màn hình di động (Mobile):** Một số thanh lọc và khối KPI bị tràn hoặc co rúm do thiếu `flex-wrap`, thiếu `overflow-x-auto` cho bảng dữ liệu, hoặc lưới `grid-cols` chưa có breakpoint `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- **Cách khắc phục:**
  1. Chuẩn hóa 100% các hộp thoại tự dựng sang component chuẩn `<Modal open={...} onClose={...} title="..." size="..." footer={...}>`.
  2. Xóa bỏ toàn bộ thuộc tính `description="..."` trên component `<Modal>` và xóa các thẻ phụ đề `<p>` bên dưới thẻ tiêu đề (`h1`, `h2`, `h3`, `h4`). Chuyển toàn bộ ngữ cảnh metadata (Mã deal, Thương hiệu, Sản phẩm, Lần sửa) vào dải thẻ thông tin nghiệp vụ (`metadata bar`) ở phần đầu của thân hộp thoại.
  3. Khôi phục hoàn toàn bảng mã UTF-8 chuẩn cho các thanh điều hướng, bảng xếp hạng và các nhãn scope.
  4. Chuẩn hóa toàn diện lưới bố cục di động với các tiền tố `flex-col sm:flex-row`, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, bao bọc bảng bằng `overflow-x-auto`, và kiểm soát chặt chữ ký type để `npx tsc --noEmit` luôn đạt 0 lỗi.
- **Phạm vi rà soát mở rộng sang phần khác:** Áp dụng công cụ quét tự động (`scratch/comprehensive_audit.js`) kiểm tra liên tục trên toàn bộ 241 file TypeScript nhằm ngăn chặn triệt để việc tái phát từ ngữ phóng đại, subtitle dưới tiêu đề hoặc modal tự dựng.

---

### BUG-011 — Lệch Mã Quyền Đặc Thù, Thiếu Định Nghĩa Vai Trò Backoffice Trong Ma Trận RBAC & Lỗ Hổng Endpoint Tích Hợp Chưa Xác Thực
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/rbacData.ts`, `web-admin/src/lib/server/accessPolicy.ts`, `web-admin/src/components/views/StoreManagementView.tsx`, `web-admin/src/app/api/integrations/cloudflare-r2/route.ts`, `web-admin/src/app/api/integrations/larkbase/payment-requests/route.ts`, `web-admin/src/app/api/integrations/larkbase/booking-plans/route.ts`, `web-admin/src/app/api/integrations/kalodata/*`, `web-admin/src/app/api/integrations/tiktok-koc/*`, `web-admin/src/app/api/integrations/market-research/analyze/route.ts`, `web-admin/src/app/api/integrations/llm/route.ts`, `web-admin/src/app/api/ai/employee-review/route.ts`, `web-admin/src/app/api/ads-reports/route.ts`, `web-admin/src/app/api/tiktok-seller/sync/route.ts`, `web-admin/src/app/api/ocr/extract-legal-doc/route.ts`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Lệch chuỗi định danh tính năng trong kiểm tra quyền:** Trong `canUserPerformAction` và `actionAllowed`, kiểm tra quyền đặc thù dùng các chuỗi cũ `performance_p3_scoring` (thay vì `p3_performance_evaluation`) và `finance_payment_request` (thay vì `payment_approval_disbursement`), khiến nhân sự được cấp `canApproveP3` hoặc `canApprovePayment` bị từ chối duyệt dù đã được Admin chỉ định.
  2. **Điều kiện `level !== 'DENIED'` chặn quyền override:** Trong `canUserPerformAction` và `actionAllowed`, khối kiểm tra `user.permissions` nằm bên trong `if (level !== 'DENIED')`. Đối với các tính năng như phê duyệt giải ngân (`payment_approval_disbursement`) vốn có vai trò `MEMBER: 'DENIED'` trong ma trận gốc, điều kiện này ngăn không cho chuyên viên có `canApprovePayment` thực thi quyền được cấp riêng.
  3. **Thiếu định nghĩa vai trò Backoffice (`LEGAL`, `FINANCE`, `SIGN_ADMIN`):** Trong `INITIAL_PERMISSION_MATRIX`, 26 tính năng nghiệp vụ chỉ khai báo 4 vai trò quản lý và đối tác ngoài, dẫn đến các vai trò hỗ trợ văn phòng bị gán mặc định `DENIED` ở cả các màn hình nghiệp vụ cốt lõi (như quản lý hợp đồng, đối soát thanh toán).
  4. **Các API endpoint tích hợp và AI chưa kiểm soát phiên & đối tác ngoài:** Hàng loạt endpoint nền tảng (`cloudflare-r2`, `larkbase`, `kalodata`, `tiktok-koc`, `market-research`, `llm`, `ads-reports`) không kiểm tra `getAuthenticatedUser(request)` hoặc cho phép đối tác bên ngoài (`BRAND_PARTNER`) gọi các hàm đồng bộ dữ liệu nội bộ và đọc CCCD của KOC.
  5. **Màn hình Quản trị Gian hàng (`StoreManagementView`) thiếu kiểm soát nút Sửa / Bàn giao:** Không kiểm tra quyền quản lý Master Data, cho phép chuyên viên bình thường mở dialog sửa cấu hình gian hàng và bàn giao PIC.
- **Cách khắc phục:**
  1. Chuẩn hóa đồng bộ các ID tính năng trong `canUserPerformAction` và `actionAllowed` (`p3_performance_evaluation`, `payment_approval_disbursement`, `master_data_brand_stores`, `raw_data_export`).
  2. Đưa kiểm tra quyền đặc thù cá nhân lên trước kiểm tra cấp độ vai trò gốc, đảm bảo các quyền override có hiệu lực tuyệt đối.
  3. Bổ sung đầy đủ định nghĩa quyền cho `LEGAL`, `FINANCE`, `SIGN_ADMIN` trong `INITIAL_PERMISSION_MATRIX`.
  4. Thêm kiểm tra phiên `getAuthenticatedUser(request)` và cô lập đối tác ngoài (`user.partnerType` / `_PARTNER`) trên 100% các API route tích hợp.
  5. Bổ sung điều kiện `canManageStores` (`isStaffGlobalAdminOrManager` hoặc `canManageMasterData`) để bảo vệ các nút thao tác trên `StoreManagementView`.
  6. Xây dựng bộ kiểm thử hồi quy phân quyền toàn diện (`tests/rbac-master-regression.test.ts`) kiểm tra chặt chẽ 10 kịch bản RBAC cốt lõi.
- **Phạm vi rà soát mở rộng sang phần khác:** Áp dụng **RULE-AUTH-01** và **RULE-RBAC-01** trên toàn bộ hệ thống; mọi tính năng hoặc API mới phát sinh đều phải qua bộ kiểm soát phân quyền 2 lớp (UI + Server).

---

### BUG-012 — Nhân Sự Không Xem Được Màn Hình Crawler KOC & Nghiên Cứu Thị Trường Do Bản Ghi `access-policy` Cũ Trong Database Chưa Đồng Bộ Màn Hình Mới
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/server/accessPolicy.ts`, `web-admin/src/lib/rbacData.ts`, bản ghi `AppSharedRecord` (`key = 'access-policy'`) trên PostgreSQL.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. Bản ghi `access-policy` (`revision: 3`) đã lưu trong bảng `AppSharedRecord` trên Supabase PostgreSQL từ trước khi bổ sung các màn hình `tiktok-crawler`, `market-research`, `workload-3d`, `cloudflare-admin` và chưa có trường `knownScreenKeys`.
  2. Trong `reconcileAccessPolicy` (`web-admin/src/lib/server/accessPolicy.ts`), khi `raw.knownScreenKeys` chưa tồn tại (`undefined`), biến `previousKnownSet` lại fallback về `catalogKeySet` (chứa toàn bộ danh mục màn hình hiện tại) khiến `newlyAddedScreenKeys` luôn rỗng (`[]`), làm các màn hình mới không được tự động thêm vào `roleAllowedTabs` của các vai trò nhân sự (`BOOKING_MEMBER`, `CONTENT_MEMBER`, `BRAND_MEMBER`, `GROWTH_MEMBER`, `MEDIA_MEMBER`, `MEMBER`, `LEADER`).
  3. Khi `tiktok-crawler` và `market-research` bị thiếu trong `roleAllowedTabs`, nhóm menu `Nghiên cứu & Crawler` của `BOOKING_MEMBER`/`MEMBER` chỉ còn đúng 1 tab `koc-master` (Danh bạ KOC) nên thanh chuyển tab đầu trang bị ẩn; còn `CONTENT_MEMBER`, `BRAND_MEMBER`, `GROWTH_MEMBER`, `MEDIA_MEMBER` bị ẩn hoàn toàn mục `Nghiên cứu & Crawler` trên Sidebar.
- **Cách khắc phục:**
  1. Sửa `reconcileAccessPolicy` trong `web-admin/src/lib/server/accessPolicy.ts`: khi `raw.knownScreenKeys` chưa tồn tại, xác định `previousKnownSet` từ tập màn hình thực tế có trong `raw.roleAllowedTabs`, đồng thời bổ sung danh sách `CORE_ROLE_SYNCED_SCREENS` (`tiktok-crawler`, `market-research`, `task-delegation`, `workload-3d`, `contracts`, `cloudflare-admin`) để luôn đồng bộ theo `ROLE_ALLOWED_TABS[role]`.
  2. Khôi phục cơ chế bảo toàn `CORE_SYNCED_ROLE_TABS` trong `isTabAllowedForRole` và `getAllowedTabsForRole` tại `web-admin/src/lib/rbacData.ts`.
  3. Cập nhật trực tiếp bản ghi `access-policy` trong `AppSharedRecord` trên Supabase PostgreSQL lên `revision: 4` với đầy đủ quyền `tiktok-crawler` và `market-research` cho toàn bộ các vai trò nội bộ.
- **Phạm vi rà soát mở rộng sang phần khác:** Đảm bảo mọi màn hình nghiệp vụ mới thêm vào `ROLE_ALLOWED_TABS` đều tự động đồng bộ xuống cả các bản ghi `access-policy` cũ đã lưu trong cơ sở dữ liệu.

---

### BUG-013 — Chuyển Tab Và Tải Dữ Liệu Ở Cấp Nhân Viên Bị Chậm So Với Cấp Quản Trị (Admin/Manager)
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/rbacScope.ts`, `web-admin/src/app/page.tsx`, `web-admin/src/lib/server/sharedRecords.ts`, `web-admin/src/lib/server/accessPolicy.ts`, `web-admin/src/lib/server/monthlyPlanStore.ts`, `web-admin/src/lib/policyClient.ts`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Lọc phạm vi dữ liệu `O(N × M)` không có chỉ mục ở cấp nhân viên (`rbacScope.ts`):** Ở cấp Admin/Manager, `isStaffGlobalAdminOrManager(user)` trả về `true` ngay lập tức (`O(1)`). Ở cấp nhân viên, mỗi lần gọi `isDealManagedByUser` (trên 400+ deal), `isPlanManagedByUser`, `isBrandManagedByUser` đều khởi tạo lại `Set` nhãn hàng, tách chuỗi regex `.split(/[,;|]/)` và quét lặp qua toàn bộ 69 gian hàng `allStores`.
  2. **Tab cũ bị re-render đồng bộ khi chuyển sang tab mới (`page.tsx`):** `FrozenTabBody` dùng điều kiện memo `(prev, next) => !prev.isActive && !next.isActive`, khiến khi chuyển từ Tab A (`isActive: true -> false`) sang Tab B (`isActive: false -> true`), toàn bộ cây giao diện của Tab A bị re-render lại cùng lúc với Tab B.
  3. **Thiếu nạp trước (preload) gói giao diện của các tab nhân viên (`page.tsx`):** Nhiều màn hình thường dùng của chuyên viên (`KocListingBatchHubView`, `TaskDelegationView`, `KocMasterDataView`, `BrandMarketResearchHubView`, `ContentView`, `SelfChannelCtvHubView`, `SampleTrackerView`...) chưa được nạp sẵn khi trình duyệt rảnh, gây hiện tượng chờ tải gói mạng ở lần bấm đầu tiên.
  4. **Truy vấn PostgreSQL lặp lại tuần tự trên mỗi API ở cấp nhân viên (`sharedRecords.ts`, `accessPolicy.ts`, `monthlyPlanStore.ts`):** Khi `SHARED_STORAGE=postgres`, `readRecord` không có bộ nhớ đệm RAM (khác với chế độ file cục bộ) và `actionAllowed` ở cấp nhân viên (`role !== 'ADMIN'`) phải đọc lại `access-policy` từ Supabase PostgreSQL nhiều lần trong cùng một yêu cầu API.
- **Cách khắc phục:**
  1. Xây dựng bộ nhớ đệm chỉ mục phạm vi (`WeakMap` `userScopeCache` & `storeScopeCache`) trong `web-admin/src/lib/rbacScope.ts`, đưa mọi phép kiểm tra `isStoreManagedByUser`, `isBrandManagedByUser`, `isPlanManagedByUser`, `isDealManagedByUser` về `O(1)`.
  2. Tách `<PageActiveContext.Provider value={isActive}>` ra ngoài `FrozenTabBody` và đổi điều kiện memo thành `(_prev, next) => !next.isActive` để tab vừa ẩn không bao giờ bị re-render lại cây component.
  3. Nạp trước toàn bộ các màn hình nghiệp vụ của nhân viên theo 2 đợt nền (`350ms` và `1000ms`), cập nhật tức thời trạng thái khi chuyển tài khoản (`handleUserChange`) và chống hủy cache hồ sơ thương hiệu lần đầu trong `policyClient.ts`.
  4. Trang bị bộ nhớ đệm RAM có TTL (`20s`) kèm gộp truy vấn đồng thời (`pgInflightReads`) trong `sharedRecords.ts`, memo hóa `reconcileAccessPolicy` theo `revision` trong `accessPolicy.ts`, và chạy song song `Promise.all` trong `monthlyPlanStore.ts`, `master-data/route.ts`, `brands/profiles/route.ts`.
- **Phạm vi rà soát mở rộng sang phần khác:** Toàn bộ các hàm lọc dữ liệu theo phạm vi nhân sự (`filterScoped*`) và các API đọc dữ liệu dùng chung trên PostgreSQL.

---

### BUG-014 — Nút Đăng Xuất (Logout) Không Phản Hồi Ngay Lập Tức Khi Bấm
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/app/page.tsx`, `web-admin/src/components/Sidebar.tsx`, `web-admin/src/components/TopHeader.tsx`, `web-admin/src/app/api/auth/logout/route.ts`.
- **Triệu chứng:** Khi người dùng bấm nút Đăng xuất (Logout) ở góc dưới Sidebar, giao diện không có phản hồi thị giác ngay lập tức (không loading/disable) và mất một khoảng thời gian chờ đợi trước khi chuyển về trang đăng nhập `/login`. Nếu thanh Sidebar đang bị thu gọn (`isSidebarCollapsed`), người dùng không tìm thấy nút đăng xuất trên đầu trang (`TopHeader`).
- **Nguyên nhân gốc (Root Cause):**
  1. **Chờ kép 2 vòng mạng liên tiếp (`fetch` POST + `router.push` client transition):** Hàm `handleLogout` trong `page.tsx` thực hiện `await fetch('/api/auth/logout', { method: 'POST' })` trước, sau đó mới gọi `router.push('/login')`. Trong Next.js App Router, `router.push` chạy chuyển tiếp mềm (soft navigation) và phải đợi máy chủ chuẩn bị xong payload RSC của trang `/login` mới unmount trang cũ. Trong suốt thời gian này trang làm việc nặng với hàng chục view/timer vẫn hiển thị nguyên vẹn, khiến người dùng tưởng nút bấm không hoạt động.
  2. **Thiếu phản hồi trạng thái bấm (No Visual Feedback):** Nút Logout trong `Sidebar` không có biến cờ `isLoggingOut` để hiển thị spinner xoay và vô hiệu hóa (`disabled`) ngay khi click.
  3. **Thiếu nút Đăng xuất trên `TopHeader`:** Prop `onLogout` được truyền vào `TopHeader` nhưng chưa được render, dẫn đến khi thanh Sidebar bị thu gọn hoặc trên màn hình hẹp, người dùng không thể thực hiện đăng xuất thuận tiện.
  4. **Cơ chế xóa Cookie chưa triệt để trên tất cả trình duyệt:** Endpoint `/api/auth/logout` chỉ gọi `response.cookies.delete(name)` mà không ghi đè tường minh `maxAge: 0`, `expires: new Date(0)`, `path: '/'`.
- **Cách khắc phục:**
  1. Cập nhật `handleLogout` trong `page.tsx`: kích hoạt trạng thái `isLoggingOut: true` ngay lập tức, xóa sạch khóa `localStorage`/`sessionStorage`, và thực hiện chuyển hướng trình duyệt trực tiếp (`window.location.replace('/api/auth/logout')`) để làm sạch toàn bộ bộ nhớ cache client và bộ đếm thời gian.
  2. Nâng cấp endpoint `GET /api/auth/logout` và `POST /api/auth/logout` trong `route.ts`: xóa sạch cookie `b2c_ops_session` với `path: '/'`, `maxAge: 0`, `expires: new Date(0)` và trả về HTTP 307 Redirect về `/login`.
  3. Bổ sung trạng thái `isLoggingOut` kèm biểu tượng tải (`Loader2 animate-spin`) và thuộc tính `disabled` cho cả nút đăng xuất tại `Sidebar.tsx` và `TopHeader.tsx`.
- **Phạm vi rà soát mở rộng sang phần khác:** Mọi thao tác kết thúc phiên làm việc, chuyển đổi tài khoản hoặc chuyển hướng bảo mật đều cần phản hồi thị giác tức thì và dọn dẹp sạch cache trình duyệt.

---

### BUG-015 — Đăng Nhập Bị Giật / Nháy Giao Diện Giám Đốc (CEO) Trước Khi Vào Đúng Vai Trò
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/app/page.tsx`.
- **Triệu chứng:** Khi người dùng vừa đăng nhập từ trang `/login` (hoặc refresh trang) với tài khoản Chuyên viên (Booking, Content, Brand, Legal...), trong khoảng ~300ms đầu tiên màn hình bị giật/nháy hiển thị toàn bộ giao diện Báo cáo Điều hành của Tổng Giám Đốc Đỗ Văn Giang (`USERS[0]`), sau đó mới đột ngột chuyển sang giao diện của đúng vai trò được giao.
- **Nguyên nhân gốc (Root Cause):**
  1. **Khởi tạo trạng thái ban đầu bị gán cứng vào `USERS[0]` (`page.tsx`):** `useState<UserProfile | null>(USERS[0])` và `useState<boolean>(false)` (cho `isLoadingAuth`) cùng `useState<TabKey>(() => resolveInitialTab(USERS[0]))` đã khiến React dựng ngay lập tức toàn bộ cây component của Tổng Giám Đốc (`dashboard-bi`, 69 gian hàng, widget tài chính BOD) ở khung hình (frame) đầu tiên.
  2. **Cơ chế tải phiên bất đồng bộ (`loadUser`):** Sau khi frame đầu tiên vẽ xong với vai trò Giám đốc, hook `useEffect` mới hoàn thành lệnh gọi `/api/auth/me` và `loadAccessPolicy()`. Khi kết quả trả về đúng nhân sự đã đăng nhập, React gọi `setCurrentUser` và `setActiveTab` làm thay đổi toàn bộ cây UI lần thứ hai, gây ra hiện tượng giật màn hình rõ rệt.
  3. **Đoạn mã vá lỗi muộn trong `useLayoutEffect`:** Trước đó có đoạn mã đọc `localStorage` trong `useLayoutEffect` để gán lại user, nhưng hook này chạy sau render ban đầu nên không ngăn được frame đầu tiên hiển thị Giám đốc.
- **Cách khắc phục:**
  1. Xây dựng hàm `getInitialAuthState()` chạy đồng bộ ngay trong hàm khởi tạo của `useState`:
     - Đọc trực tiếp `localStorage.getItem('upbase_selected_user_id')` và ánh xạ ngay lập tức sang hồ sơ nhân viên (`resolveUserById`) cùng tab ban đầu tương ứng (`resolveInitialTab`). Nếu đã có tài khoản, React khởi tạo và vẽ ngay giao diện của nhân sự đó từ khung hình đầu tiên.
     - Nếu chưa có tài khoản lưu sẵn (phiên mới chưa định danh), khởi tạo `currentUser = null` và `isLoadingAuth = true`. Khung giữ chỗ bộ khung (`Skeleton App Shell`) sẽ được hiển thị trung tính trong lúc chờ `/api/auth/me` phản hồi, tuyệt đối không bao giờ hiển thị `USERS[0]` (Giám đốc) cho người dùng khác.
  2. Xóa bỏ logic gán đè dư thừa trong `useLayoutEffect` để tránh re-render lặp.
  3. Cập nhật `loadUser` để nếu danh tính trả về trùng khớp với `initialAuthState`, không kích hoạt thêm bất kỳ render thừa nào.
- **Phạm vi rà soát mở rộng sang phần khác:** Đảm bảo tất cả các phân hệ và component con không gán cứng tài khoản mặc định `USERS[0]` mà luôn dùng fallback trung tính hoặc kiểm tra `currentUser` hợp lệ.

---

### BUG-016 — Màn Hình Dữ Liệu Gốc Báo "Có Thay Đổi Chưa Lưu — Không Truy Cập Được Kho Master Data" Trên Vercel
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/MasterDataHubView.tsx`, `web-admin/src/lib/server/sharedRecords.ts`.
- **Triệu chứng:** Khi mở màn hình **Dữ liệu gốc** trên Vercel (`b2c-theta.vercel.app`), thanh cảnh báo luôn hiển thị `Có thay đổi chưa lưu` ngay cả khi chưa chỉnh sửa gì; khi bấm **Lưu danh mục**, hệ thống mất ~9.5 giây rồi báo đỏ `Không truy cập được kho master data. Thử lại sau.`.
- **Nguyên nhân gốc (Root Cause):**
  1. **Thứ tự khóa JSONB từ PostgreSQL khác thứ tự khóa của `draftCatalog` (`MasterDataHubView.tsx`):** Cột `data` kiểu `jsonb` trong bảng `AppSharedRecord` trên PostgreSQL trả về thứ tự khóa (`brands, niches, stores, formats, pillars, products, castTiers`) khác với đối tượng `draftCatalog` (`brands, stores, products, pillars, castTiers, niches, formats`), đồng thời `GET /api/master-data` gắn thêm trường `pics` vào `stores`. Phép so sánh `JSON.stringify(draftCatalog) !== savedCatalog` vì thế luôn bằng `true` ngay khi vừa tải trang.
  2. **Quá hạn 5.000ms của Interactive Transaction Prisma (`sharedRecords.ts`):** Hàm `updateRecord` mở `prisma.$transaction(async tx => ...)` và thực hiện liên tiếp 3 truy vấn nặng (~250KB JSON mỗi chiều) kèm gọi `validateCatalog` (chứa các truy vấn ngoài `tx`) trong khi giữ khóa `FOR UPDATE`. Từ Vercel sang Supabase, tổng thời gian vượt ngưỡng 5.000ms của Prisma Interactive Transaction, ném lỗi `P2028` và bị `failure(e)` chuyển thành `503 Không truy cập được kho master data. Thử lại sau.`.
- **Cách khắc phục:**
  1. Chuẩn hóa hàm `serializeCatalog` trong `MasterDataHubView.tsx` với thứ tự khóa cố định và loại bỏ trường tạm `pics` trên `stores` trước khi so sánh `catalogDirty`.
  2. Thay thế `prisma.$transaction` tương tác trong `sharedRecords.ts` bằng cơ chế đọc kiểm tra `revision`, chạy `transform` ngoài transaction và thực thi 1 câu lệnh SQL `UPDATE ... WHERE key = ... AND revision = ...` (hoặc `INSERT ... ON CONFLICT DO UPDATE WHERE revision = 0`) nguyên tử duy nhất.
- **Phạm vi rà soát mở rộng sang phần khác:** Mọi bản ghi dùng chung trong `AppSharedRecord` (`master-catalog`, `access-policy`, `store-pics`).

---

### BUG-017 — Một Số Tính Năng Dò Tìm KOC & Khớp Brief Chưa Trả Về Token/Chi Phí Và Chưa Ghi Nhận Vào Bảng Đo Lường API
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/kocSocialDiscovery.ts`, `web-admin/src/components/koc/KocSocialChannelsModal.tsx`, `web-admin/src/components/CreateKocModal.tsx`, `web-admin/src/lib/kocChannelBriefAnalyzer.ts`, `web-admin/src/components/koc/KocChannelBriefMatcherModal.tsx`, `web-admin/src/app/api/ai/employee-review/route.ts`.
- **Triệu chứng:** Người dùng đã gắn khóa API và thực hiện tính năng tìm kiếm các kênh MXH của KOC hoặc khớp kênh theo Brief nhãn hàng, nhưng khi vào tab "Đo Lường & Chi Phí" thì không thấy lượt gọi, số token và chi phí phát sinh được ghi nhận. Đồng thời hệ thống còn chứa 6 bản ghi mock dữ liệu cũ (`log-seed-*`).
- **Nguyên nhân gốc (Root Cause):**
  1. Module `kocSocialDiscovery.ts` và `kocChannelBriefAnalyzer.ts` khi gọi Gemini/OpenAI/Claude chưa bóc tách và trả về đối tượng `usage` (promptTokens, completionTokens, totalTokens, latencyMs).
  2. Các component hộp thoại UI tương ứng (`KocSocialChannelsModal`, `CreateKocModal`, `KocChannelBriefMatcherModal`) chưa gọi `recordApiUsageLog` để lưu giao dịch vào kho đo lường `upbase_b2c_api_usage_logs_v1`.
  3. `loadApiUsageLogs()` mặc định trả về 6 bản ghi seed mẫu khi bộ nhớ trống.
- **Cách khắc phục:**
  1. Bổ sung trích xuất dữ liệu token và độ trễ phản hồi tại tầng API/Service (`usageMetadata` từ Google Gemini, `usage` từ OpenAI/Claude) và trả về đối tượng kết quả.
  2. Đấu nối `recordApiUsageLog` và `calculateExecutionCost` tại tất cả các component kích hoạt tính năng để ghi nhận chính xác chi phí USD và VNĐ.
  3. Loại bỏ toàn bộ dữ liệu seed mẫu và bổ sung cơ chế tự động dọn dẹp các ID `log-seed-*` cũ trong `localStorage`.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã đối soát 100% tất cả các điểm gọi mô hình trong hệ thống: `KOC_MATCHING` (Dò tìm kênh MXH, Khớp Brief), `STAFF_REVIEW` (Đánh giá nhân sự 4P & SLA), `SCRIPT_REVIEW` (Kiểm duyệt kịch bản video), `CONTRACT_DRAFTING` (Soạn thảo hợp đồng), `PLAN_ADS_ANALYSIS` (Đối soát kế hoạch tháng & Ads), `KOC_HISTORY_EVALUATION` (Đánh giá lịch sử KOC), `KNOWLEDGE_QA` (Hỏi đáp sổ tay), `BRAND_MARKET_RESEARCH` (Nghiên cứu thị trường 4P) và `PLAYGROUND` (Chạy thử).

---

### BUG-018 — Nhật Ký Đo Lường API Hiển Thị Chuỗi Thời Gian UTC Gốc (Lệch -7 Tiếng So Với Giờ Việt Nam) & Bị Ngắt Kết Nối 15 Giây Đẩy Về `INTERNAL` Dự Phòng
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/format.ts`, `web-admin/src/lib/apiKeyConfig.ts`, `web-admin/src/components/views/ApiKeySetupView.tsx`, `web-admin/src/app/api/integrations/llm/route.ts`, `web-admin/src/lib/operationalReportService.ts`, `web-admin/src/components/views/AuditTrailView.tsx`, `web-admin/src/components/views/BookingView.tsx`, `web-admin/src/components/views/TaskDelegationView.tsx`, `web-admin/src/components/views/Workload3dMapView.tsx`.
- **Triệu chứng:**
  1. Trên bảng **Nhật Ký Chi Tiết & Đối Soát Từng Lượt Gọi API** (`ApiKeySetupView.tsx`), cột **Thời gian** hiển thị nguyên chuỗi kỹ thuật ISO UTC đuôi `Z` (ví dụ `2026-10-20T09:25:41.775Z`) bị lùi 7 tiếng so với giờ thực tế tại Việt Nam (`16:25:41 · 20/10/2026`).
  2. Lượt gọi phân tích dài (như `Nghiên cứu Kutieskin Mama & Baby` với >2.000 token đầu vào) bị ngắt ở mốc `15009ms` và tự động nhảy sang `INTERNAL (upbase-local-engine)` ở trạng thái `Dự phòng`.
- **Nguyên nhân gốc (Root Cause):**
  1. **Ghi và hiển thị trực tiếp `new Date().toISOString()` (UTC+0):** Hàm `recordApiUsageLog` lưu chuỗi `toISOString()` theo giờ quốc tế UTC+0 và bảng UI in thẳng `{item.timestamp}` mà không quy đổi sang múi giờ `Asia/Ho_Chi_Minh` (GMT+7). Nhiều màn hình khác (`AuditTrailView`, `BookingView`, `TaskDelegationView`, `Workload3dMapView`) cũng cắt chuỗi `.toISOString().replace('T', ' ').slice(0, 16)` làm giờ ghi nhận bị lùi 7 tiếng.
  2. **Thử tuần tự các mã model alias trước model thực tế & ngưỡng cắt 15 giây không bắt lỗi trong vòng lặp (`llm/route.ts`):** Khi gọi tới endpoint mặc định (`generativelanguage.googleapis.com`, `api.openai.com`, `api.anthropic.com`), hệ thống thử tuần tự các mã danh mục trước khi tới model thực tế (`gemini-2.5-flash`), cộng thêm `AbortSignal.timeout(15000)` chưa bọc `try/catch` cho từng ứng viên nên khi vượt 15 giây đã thoát thẳng sang luồng dự phòng `INTERNAL`.
- **Cách khắc phục:**
  1. Xây dựng bộ hàm chuẩn hóa múi giờ Việt Nam (`Asia/Ho_Chi_Minh`, GMT+7) trong `web-admin/src/lib/format.ts`: `formatDateTimeVn` (`HH:mm:ss · DD/MM/YYYY`), `getVietnamIsoString` (`+07:00`), `getVietnamDateYmd` và `getVietnamDateTimeShort`.
  2. Áp dụng `formatApiLogTimestamp` trên bảng Nhật ký API và file CSV xuất ra (tự động quy đổi cả các bản ghi UTC cũ đã lưu trong `localStorage` sang giờ Việt Nam chính xác), đồng thời hiển thị rõ lý do chuyển dự phòng (`errorMessage`) dưới tên nhà cung cấp.
  3. Trong `/api/integrations/llm/route.ts`: ưu tiên gọi ngay model thực tế trên máy chủ chính thức, nâng ngưỡng chờ lên `30000ms` (30s) và bọc `try/catch` cho từng model ứng viên để tự động chuyển sang model nhanh hơn trước khi fallback về `INTERNAL`.
- **Phạm vi rà soát mở rộng sang phần khác:** Toàn bộ các bảng nhật ký (`ApiKeySetupView`, `AuditTrailView`) và các thao tác ghi nhận thời gian duyệt/giao việc (`BookingView`, `TaskDelegationView`, `Workload3dMapView`).

---

### BUG-019 — Luồng Nghiên Cứu Thương Hiệu & Đối Thủ Trước Đây Dùng Dữ Liệu Nội Bộ (File 3.2 / File 4.1) Thay Vì Tìm Kiếm Trên Mạng Trước Khi Đưa Vào Prompt
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/BrandMarketResearchHubView.tsx`, `web-admin/src/lib/brandMarketResearchEngine.ts`, `web-admin/src/lib/liveBrandWebScraper.ts`, `web-admin/src/app/api/integrations/market-research/analyze/route.ts`, `web-admin/src/app/api/integrations/llm/route.ts`.
- **Triệu chứng:**
  1. Màn hình **Nghiên cứu thương hiệu & đối thủ** hiển thị dữ liệu từ kho booking nội bộ (`File 3.2`, `File 4.1`, `69 gian hàng B2C`) thay vì dữ liệu thị trường bên ngoài (Website, sàn TMĐT, kết quả tìm kiếm mạng, TikTok).
  2. Khi người dùng bấm **Phân tích**, hệ thống chỉ gom dữ liệu tĩnh có sẵn trong trình duyệt (`serializeDossierForModelContext`) để nhồi vào Prompt mà không thực hiện bước tìm kiếm thông tin trên mạng trước theo yêu cầu người dùng.
- **Nguyên nhân gốc (Root Cause):**
  1. **Nhầm lẫn mục đích nghiệp vụ giữa Đối soát nội bộ và Nghiên cứu thị trường/đối thủ:** `brandMarketResearchEngine.ts` được xây dựng ban đầu bằng cách tổng hợp ngược từ `MOCK_BOOKINGS` (File 3.2) và `MONTHLY_PLANS` (File 4.1) của các gian hàng Upbase đang vận hành, khiến khi tra cứu đối thủ bên ngoài hoặc nghiên cứu thị trường lại kéo số liệu nội bộ vào.
  2. **Thiếu bước Web Search trước khi gọi LLM (`Pre-Prompt Web Search`):** `handleRunModelResearch` gọi thẳng `/api/integrations/llm` với chuỗi văn bản tĩnh mà không qua bước tìm kiếm web (`scrapeLiveBrandWebIntelligence` + `scrapeWebSearchSnippets`).
- **Cách khắc phục:**
  1. Gỡ bỏ toàn bộ dữ liệu và bảng `File 3.2` / `File 4.1` / `File 3.5` / `69 gian hàng B2C` khỏi `BrandMarketResearchHubView.tsx`, `brandMarketResearchEngine.ts` (kể cả `evidenceLedger` và file xuất `.md`) và `llm/route.ts`; xóa thanh chip chọn nhanh thương hiệu nội bộ.
  2. Nâng cấp `liveBrandWebScraper.ts` sau khi kiểm thử trực tiếp trên các thương hiệu thực tế (`Cocoon`, `Kutieskin`, `La Roche-Posay`, `Skin1004`, `Torriden`, `Obagi`):
     - Sửa regex `extractVndPricesFromText` từ `\d{1,2}` thành `\d{1,3}` để bắt chính xác các mức giá 6 chữ số (`100.000đ` – `999.000đ`).
     - Thêm `unwrapSearchRedirectUrl` giải mã link chuyển hướng Bing `/ck/a?...&u=a1<base64>` và DuckDuckGo `uddg=` về URL gốc sạch sẽ (`cocoonvietnam.com`, `shopee.vn`, `hasaki.vn`, `nhathuoclongchau.com.vn`...).
     - Kết hợp tìm kiếm song song từ Bing Web Search, DuckDuckGo HTML (`kl=vn-vi`) và Bing News Async, đồng thời lọc đối chiếu token thương hiệu để loại bỏ 100% kết quả nhiễu (decoy SERP) khi tra cứu tên thương hiệu nước ngoài nhiều từ.
     - Sửa regex trích xuất tiêu đề, lượt xem và tên kênh từ Bing Video Search (`class="mc_vtvc_title[^"]*"`).
     - Bổ sung quét trang `/san-pham` và tự động xác thực domain chính thức từ kết quả tìm kiếm web.
  3. Cập nhật luồng `handleRunModelResearch` và `EXECUTE_PURPOSE` (`BRAND_MARKET_RESEARCH` trong `/api/integrations/llm/route.ts`) luôn chạy bước tìm kiếm trên mạng **trước**, nạp kết quả thực tế vào đầu Prompt (`[KẾT QUẢ TÌM KIẾM TRÊN MẠNG TRƯỚC KHI PHÂN TÍCH]`), và nâng cấp bộ tạo báo cáo thành định dạng Markdown có bảng đối sánh (`| ... |`) kèm bộ hiển thị bảng trực quan trên giao diện.
- **Phạm vi rà soát mở rộng sang phần khác:** Toàn bộ luồng `BRAND_MARKET_RESEARCH` và các endpoint thu thập dữ liệu thị trường (`/api/integrations/market-research/analyze`, `/api/integrations/llm`).

---

### BUG-020 — Lỗi Vỡ Bố Cục Hộp Thoại Gửi Email KOC, Tự Động Nhảy Lại Dòng Đầu Khi Gõ Email & Thiếu Chỗ Sửa Email Trực Tiếp Trong Danh Bạ KOC
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/shortlist/KocOutreachEmailModal.tsx`, `web-admin/src/components/shortlist/StaffBrandListingSheetWorkspace.tsx`, `web-admin/src/components/koc/KocProfile.tsx`, `web-admin/src/components/CreateKocModal.tsx`, `web-admin/src/components/views/KocMasterDataView.tsx`, `web-admin/src/lib/staffBrandListingSheet.ts`.
- **Triệu chứng:**
  1. Trong `KocOutreachEmailModal.tsx`, ô chọn mẫu (`<Select>`) bị tràn đè lên nút `Khớp mẫu KOC` do thiếu `min-w-0` và `w-full`; thanh tab bị cuộn mất nửa chữ khi kéo nội dung hộp thoại; phần xem trước thư chỉ hiển thị trạng thái tĩnh `Chưa có email ở Cột AO` mà không cho nhập trực tiếp tại dòng `Người nhận (To)`.
  2. Khi gõ từng ký tự email cho KOC thứ 2 trở đi trong hộp thoại, `onUpdateRowFields` cập nhật `rows` ở `StaffBrandListingSheetWorkspace.tsx` làm mảng `candidateRows` đổi tham chiếu và kích hoạt `useEffect([open, initialTab, candidateRows])` gán lại `activePreviewRowId` về KOC đầu tiên (`candidateRows[0]`).
  3. Trong **Danh bạ KOC** (`KocProfile.tsx` và `CreateKocModal.tsx`), trường `Email làm việc` chỉ hiển thị tĩnh (`—` khi trống), không có ô nhập hoặc nút sửa trực tiếp, và chưa đồng bộ 2 chiều với Cột AO trên Sheet Listing.
- **Nguyên nhân gốc (Root Cause):**
  1. Cột CSS Grid bọc `<Select>` trong `KocOutreachEmailModal.tsx` không đặt `min-w-0` khiến thẻ `<select>` có text dài đẩy tràn sang cột bên cạnh.
  2. `useEffect` khởi tạo trạng thái mở hộp thoại phụ thuộc vào tham chiếu mảng `candidateRows` và `singleOutreachRow` được giữ bằng bản chụp tĩnh thay vì `singleOutreachRowId`.
  3. `ShippingAndContactPanel` trong `KocProfile.tsx` và `CreateKocModal.tsx` thiếu chế độ sửa trực tiếp (`inline edit`) cho trường `email` và thông tin liên hệ/nhận mẫu.
- **Cách khắc phục:**
  1. Chuẩn hóa bố cục `KocOutreachEmailModal.tsx`: thêm `min-w-0` + `w-full` cho `<Select>`, cố định thanh `<Tabs>` ở đầu hộp thoại (`sticky`), bổ sung ô nhập `Người nhận (To)` trực tiếp ở cả danh sách trái và khung xem trước phải, dùng `wasOpenRef` và `singleOutreachRowId` để giữ nguyên KOC đang chọn khi gõ từng ký tự.
  2. Bổ sung tính năng **+ Điền email KOC / Sửa liên hệ** trực tiếp ngay tại `ShippingAndContactPanel` (`KocProfile.tsx`) và thêm ô nhập Email trong `CreateKocModal.tsx` cũng như bộ lọc tìm kiếm của `KocMasterDataView.tsx`.
  3. Xây dựng cơ chế đồng bộ 2 chiều (`syncKocContactToStaffSheets` và `syncSheetRowContactToKocMaster` trong `staffBrandListingSheet.ts`): sửa email ở Danh bạ KOC sẽ tự động cập nhật sang Cột AO của mọi Sheet Listing có KOC đó, và ngược lại điền email khi gửi thư/trên Sheet sẽ tự động lưu về hồ sơ gốc trong Danh bạ KOC (`/api/kocs`).
- **Phạm vi rà soát mở rộng sang phần khác:** Toàn bộ luồng Quản lý Danh bạ KOC (`KocMasterDataView`, `KocProfile`, `CreateKocModal`) và Sheet Listing / Gửi Email mời KOC (`StaffBrandListingSheetWorkspace`, `KocOutreachEmailModal`).

---

### BUG-021 — Hộp Thoại Kiểm Tra Link Air Báo "Có Gắn Giỏ (Đã Xác Nhận)" Nhưng Thiếu Tên Sản Phẩm & Đường Dẫn Giỏ Hàng Trên Video Có Gắn Nhiều Anchor (CapCut + TikTok Shop)
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/tiktokOpenSourceEngines.ts`, `web-admin/src/lib/linkAirCheckServer.ts`, `web-admin/src/app/api/integrations/link-air-check/route.ts`, `web-admin/src/components/crawler/LinkAirCheckerPanel.tsx`, `web-admin/src/components/koc/TikTokVideoInspectorModal.tsx`, `crawler-worker/src/adapters/tiktok.ts`, `crawler-worker/src/check-link.ts`.
- **Triệu chứng:**
  1. Khi kiểm tra link video thực tế (ví dụ `https://www.tiktok.com/@nucos.jp/video/7695632166272765205`), hộp thoại chi tiết hiển thị `Có gắn giỏ (Đã xác nhận)` kèm thông báo *"Bài đăng có bật cờ gắn giỏ hàng thương mại điện tử nhưng nền tảng không công khai đường dẫn chi tiết trên bản web"*, không hiện tên sản phẩm và link giỏ hàng.
- **Nguyên nhân gốc (Root Cause):**
  1. **Cấu trúc mảng `itemStruct.anchors` gồm nhiều phần tử lồng nhau:** Trên video có dùng mẫu CapCut kèm giỏ hàng (`anchors[0]` là `type: 54` CapCut, `anchors[1]` có `schema: "https://www.capcut.com"` nhưng trường `extra` bên trong lại là mảng JSON chứa phần tử `component_key: "anchor_shop"` với chuỗi JSON lồng cấp 2 chứa `seo_url`, `product_id`, `seller_id`, `sku_id`, `title`, `elastic_title`, `cover_url`). Logic cũ chỉ đọc `anchors[0]` hoặc bỏ qua phần tử có `schema` chứa `capcut` nên chỉ nhận cờ `isECVideo: 1` mà bỏ sót `anchor_shop` ở `anchors[1]`.
  2. **Bộ nhớ đệm `videoDetailCache` (TTL 30 phút) lưu bản ghi thiếu `cartProducts` từ `/api/creator/item_list/` hoặc phiên cũ:** Khi quét danh sách video kênh qua `/api/creator/item_list/`, TikTok chỉ trả cờ `isECVideo: 1` mà lược bỏ chi tiết `anchors`, dẫn đến `parseTikTokItemStructToDetail` ghi đè bản ghi rỗng `cartProducts: []` vào `videoDetailCache`. Khi gọi `inspectLiveTikTokVideoPage(videoUrl)`, hàm trả thẳng bản ghi từ bộ nhớ đệm mà không tải trang `webapp.video-detail`.
- **Cách khắc phục:**
  1. Viết hàm `extractTikTokShopAnchorInfo` (`tiktokOpenSourceEngines.ts`) và `extractTikTokCartAnchors` (`crawler-worker/src/adapters/tiktok.ts`) duyệt toàn bộ mảng `itemStruct.anchors`, giải mã JSON 2 lớp của `anchor.extra` -> `outer.extra`, giữ nguyên chuỗi 19 chữ số của `product_id`, `seller_id`, `sku_id` bằng regex trước `JSON.parse`, và lấy đầy đủ `seo_url`, `title`, `anchorKeyword` (`keyword`/`elastic_title`), `cover_url`, `category_name`.
  2. Trong `inspectLiveTikTokVideoPage` và `crawler-worker/src/check-link.ts`: tự động bỏ qua bản ghi cache cũ nếu `hasCartAnchor === true` nhưng thiếu `cartProducts`/`cartAnchorUrl`, đồng thời không cho dữ liệu rút gọn từ `/api/creator/item_list/` ghi đè mất `cartProducts` đã có trong cache.
  3. Trong `LinkAirDetailModal` (`LinkAirCheckerPanel.tsx`): tự động gọi làm giàu dữ liệu ngầm nếu mở lại bản ghi lịch sử cũ có `hasProductLink === true` mà chưa có `cartProducts`, và hiển thị đầy đủ ảnh sản phẩm, tên sản phẩm, nhãn nút giỏ hàng, danh mục, mã SP/SKU/Shop và link giỏ hàng trực tiếp.
- **Phạm vi rà soát mở rộng sang phần khác:** Toàn bộ luồng Nghiệm thu Link Air (`LinkAirCheckerPanel`, `/api/integrations/link-air-check`, `crawler-worker`) và Nghiệm thu Video KOC (`TikTokVideoInspectorModal`, `tiktokVideoInspector.ts`).

---

### BUG-022 — Rà Soát Toàn Diện UI, Logic & UX Phân Hệ Danh Bạ KOC (`KocMasterDataView`, `KocProfile`, `CreateKocModal`, `KocSocialChannelsModal`, `kocUtils`)
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/KocMasterDataView.tsx`, `web-admin/src/components/koc/KocProfile.tsx`, `web-admin/src/components/CreateKocModal.tsx`, `web-admin/src/components/koc/KocSocialChannelsModal.tsx`, `web-admin/src/components/koc/KocChannelReviewModal.tsx`, `web-admin/src/components/koc/kocUtils.ts`, `web-admin/src/lib/staffBrandListingSheet.ts`, `web-admin/src/components/shortlist/StaffBrandListingSheetWorkspace.tsx`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Không sửa được CCCD / MST / Tài khoản ngân hàng thủ công trên Hồ sơ KOC (`KocProfile.tsx`):** Khối `LegalPaymentPanel` chỉ cho phép cập nhật qua nút `Đọc ảnh giấy tờ (OCR)` mà không có chế độ sửa trực tiếp (`Sửa pháp lý & TK`), khiến chuyên viên hoặc kế toán không thể tự nhập/sửa `bankName`, `bankAccount`, `cccd`, `taxCode`, `taxAccountType`, `contractDriveUrl`.
  2. **Mất danh sách video TikTok vừa quét khi chuyển tab hoặc quay lại danh sách (`KocProfile.tsx`):** Trong `TikTokSellerMetricsSection`, khi bấm `Lấy danh sách video` / `Làm mới video`, dữ liệu video chỉ lưu vào biến cục bộ `liveVideos` mà không gọi `onUpdateKoc`, làm mất toàn bộ video vừa tải khi đóng hồ sơ hoặc chuyển tab.
  3. **Hộp thoại Thêm KOC (`CreateKocModal.tsx`) dùng `div fixed inset-0` tự dựng và giữ nguyên dữ liệu cũ khi mở lại:** Chưa dùng `<Modal>` chuẩn từ `src/components/ui`, không tự reset form khi đóng/mở lại, danh sách chọn PIC/Brand dùng biến cứng 3 lựa chọn thay vì danh sách nhân sự và 42 thương hiệu B2C thực tế, và kiểm tra trùng lặp chưa xét trường `email`.
  4. **Vi phạm `RULE-UX-01` trong `KocSocialChannelsModal.tsx`:** Hàm `runSearch` tự động điền `candidates[0].handle` vào ô nhập kể cả khi ứng viên đầu tiên chỉ có độ tin cậy `GỢI_Ý`.
  5. **Phân quyền xem dữ liệu nhạy cảm (`canRevealSensitive` trong `kocUtils.ts`) bỏ sót Kế toán / Pháp chế và PIC ghép dòng:** Chỉ kiểm tra `r === 'ADMIN' || r === 'MANAGER' || r === 'LEADER'` và `k.bookingPic === user.name`, khiến `FINANCE`, `LEGAL`, `SIGN_ADMIN` hoặc chuyên viên có tên trong chuỗi `bookingPic` nhiều dòng / `workedPicsList` không bấm `Hiện số` CCCD/TKNH được.
  6. **Bảng Danh bạ KOC (`KocMasterDataView.tsx`) ẩn hoàn toàn Email/SĐT ngoài danh sách và còn dùng class `text-[10px]`:** Người dùng phải bấm vào từng hồ sơ mới biết KOC đã có Email/SĐT hay chưa, thiếu chip lọc nhanh `Thiếu Email/SĐT`, và còn sót class `text-[10px]` ở nút đánh giá nhanh.
- **Cách khắc phục:**
  1. Bổ sung chế độ **Sửa pháp lý & TK / Nhập CCCD & Tài khoản** trực tiếp ngay trong `LegalPaymentPanel` (`KocProfile.tsx`) cho phép nhập/sửa Họ tên, Công ty, CCCD, MST, Loại hình thuế, Ngân hàng, Số tài khoản, Link thư mục HĐ và đồng bộ 2 chiều sang Sheet Listing (`syncKocContactToStaffSheets` & `syncSheetRowContactToKocMaster`).
  2. Lưu bền vững `recentVideos`, `bio`, `totalLikes`, `videoCount`, `avgLikes`, `avgComments`, `avgShares`, `engagementRate` và `extractedEmail` vào `koc` qua `onUpdateKoc` ngay khi quét TikTok thành công trong `TikTokSellerMetricsSection`.
  3. Chuẩn hóa `CreateKocModal.tsx` sang component `<Modal>` chuẩn, tự động reset form mỗi lần mở mới, nạp danh sách chuyên viên B2C và `REAL_B2C_42_BRANDS`, kiểm tra trùng cả `email`.
  4. Sửa `KocSocialChannelsModal.tsx` (`pickHighOrMediumHandle`) chỉ tự động điền ứng viên có độ tin cậy `CAO` / `TRUNG_BÌNH`.
  5. Mở rộng `canRevealSensitive` cho `FINANCE`, `LEGAL`, `SIGN_ADMIN` và đối chiếu `bookingPic` tách dòng + `workedPicsList`; mở rộng `findDuplicates` phát hiện trùng `email`.
  6. Hiển thị trực tiếp dòng `Email · SĐT` (hoặc `Chưa có Email / SĐT`) tại cột `KOC & Liên hệ` trên bảng `KocMasterDataView.tsx`, thêm chip lọc `Thiếu Email/SĐT`, và chuẩn hóa toàn bộ `text-[10px]` thành `text-2xs`.
- **Phạm vi rà soát mở rộng sang phần khác:** Toàn bộ phân hệ Danh bạ KOC (`koc-master`), Sheet Listing theo Brand (`koc-listing-batch`) và Quản lý Hợp đồng (`contracts`).

---

### BUG-023 — Kiểm Toán & Đồng Bộ Chéo 3 Cụm Phân Hệ: Tìm Kiếm KOC, Sheet Listing & List Duyệt Book, Danh Bạ & Hồ Sơ KOC
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `TikTokCrawlerHubView.tsx`, `KocChannelReviewModal.tsx`, `KocChannelBriefMatcherModal.tsx`, `KocSocialChannelsModal.tsx`, `TikTokKocScraperModal.tsx`, `kocSocialDiscovery.ts`, `tiktokKocScraper.ts`, `StaffBrandListingSheetWorkspace.tsx`, `KocListingBatchHubView.tsx`, `AddToBrandListingSheetModal.tsx`, `KocOutreachEmailModal.tsx`, `StoreShortlistFilterModal.tsx`, `staffBrandListingSheet.ts`, `ApprovedBookingListView.tsx`, `approvedBookingList.ts`, `kocUtils.ts`, `kocHistoryEvaluator.ts`, `KocHistoryEvaluationModal.tsx`, `KocProfile.tsx`, `KocProfileModal.tsx`, `BookingView.tsx`, `CreateKocModal.tsx`, `KocKolHubView.tsx`, `QuickBookModal.tsx`, `web-admin/src/app/api/kocs/route.ts`, `web-admin/src/app/page.tsx`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Cụm 1 (Tìm kiếm KOC & Công cụ KOC):**
     - Nút `Thêm vào Sheet` trên `TikTokCrawlerHubView.tsx` cho KOC chưa lưu danh bạ tạo đối tượng tạm với số liệu giả (`50.000` followers, `1.500.000đ` rate card) thay vì lưu dữ liệu thực tế vừa quét.
     - `kocSocialDiscovery.ts` tự động đánh dấu `verified: idx === 0` cho ứng viên đầu tiên kể cả khi chưa xác thực thực tế (`RULE-UX-01`).
     - Gõ vào ô tìm kiếm từ khóa ở tab Đối thủ / Hashtag / Bình luận xóa trắng kết quả đang xem ngay lập tức.
  2. **Cụm 2 (Sheet Listing, Đợt đề xuất KOC & List Duyệt Book):**
     - Trong `StaffBrandListingSheetWorkspace.tsx`, sự kiện `onChange` của ô `idKenh` tự tra cứu KOC và ghi đè toàn bộ 48 cột ngay khi đang gõ dở ký tự; đổi `brandChon` sang `Yes` trên Sheet chưa tự động đẩy sang `ApprovedBookingListView.tsx`; nền hover/chọn dòng của các cột `sticky left-*` dùng lớp bán trong suốt làm lộ chữ cuộn bên dưới.
     - Trong `KocListingBatchHubView.tsx`, duyệt Brand (`handleBrandDecision`) và chốt duyệt (`handleFinalApprove`) chưa đồng bộ ngược về Sheet Brand của nhân sự và `ApprovedBookingList`; hộp thoại cập nhật tiến độ Air dùng `document.getElementById('air-stage-select')` thay vì controlled state.
     - Trong `approvedBookingList.ts` và `ApprovedBookingListView.tsx`, hàm `autoMapVideoAcceptanceByKocChannel` tự sinh số giả (`22.500` views, `rate * 2.6` GMV, `#SPARK-...`) khi trường nghiệm thu trống (`RULE-DATA-01`); gõ chữ vào ô `linkAir` khi đang bật bộ lọc `Chưa có Link Air` làm dòng biến mất ngay khi gõ ký tự đầu tiên.
  3. **Cụm 3 (Danh bạ KOC, Hồ sơ KOC, Cổng KOC & Quản lý Booking):**
     - `kocUtils.ts`, `kocHistoryEvaluator.ts`, `KocProfile.tsx`, `BookingView.tsx` và `KocKolHubView.tsx` còn các giá trị dự phòng giả khi KOC chưa có lịch sử deal (`rate * 3` GMV, `ROI 2.5`, `85.000` views, `SPARK-VERIFIED-30D`, `GHTK-...`, `350.000đ` giá mẫu, địa chỉ mẫu `Số 18 Tam Trinh`, nhân sự mẫu `Khánh Vy`).
     - `TikTokSellerSyncModal` trong `KocProfile.tsx` chỉ hiển thị tĩnh mà không cho nhập/lưu chỉ số TikTok Seller vào hồ sơ KOC.
     - Đổi `channelId` của KOC trong `/api/kocs/route.ts` và `page.tsx` để lại bản ghi mồ côi dưới khóa handle cũ.
     - Sửa thông tin liên hệ KOC từ Sheet Listing / Hộp thoại Email chưa phát sự kiện cập nhật ngay state `kocs` tại `page.tsx`.
- **Cách khắc phục:**
  1. **Cụm 1:** Truyền trực tiếp `scrapedKocItem` thực tế vào `renderUnifiedKocActionsCell` và tự động lưu vào CSDL khi bấm `Thêm vào Sheet`; chỉ bật `verified: true` khi có kết quả xác thực thực tế; giữ nguyên kết quả tìm kiếm cũ cho đến khi bấm tìm kiếm mới; đồng bộ màu sắc trạng thái đánh giá kênh (`SUITABLE` / `CAUTION` / `NOT_SUITABLE`).
  2. **Cụm 2:** Chuyển tra cứu tự động KOC sang `onBlur` (`handleIdKenhBlur`); tự động đồng bộ 2 chiều giữa `StaffBrandListingSheetWorkspace`, `KocListingBatchHubView` và `ApprovedBookingListView`; dùng nền đặc (`bg-sunken`, `bg-accent-soft`) cho toàn bộ ô `sticky left-*`; giữ dòng đang sửa (`editingRowId`) không bị ẩn khỏi bộ lọc cho đến khi `onBlur`; xóa toàn bộ số liệu nghiệm thu giả trong `approvedBookingList.ts`.
  3. **Cụm 3:** Xóa toàn bộ số liệu giả khi KOC có `0` deal (`kocUtils.ts`, `kocHistoryEvaluator.ts`, `KocProfile.tsx`, `BookingView.tsx`, `KocKolHubView.tsx`); nâng cấp `TikTokSellerSyncModal` cho phép nhập và lưu chỉ số trực tiếp qua `onUpdateKoc`; khử trùng lặp theo `item.id` trong `/api/kocs/route.ts` và `page.tsx` khi đổi handle; lắng nghe sự kiện `upbase:koc-master-contact-synced` tại `page.tsx` để đồng bộ tức thời.
- **Phạm vi rà soát mở rộng sang phần khác:** Toàn bộ 3 cụm Tìm kiếm KOC (`tiktok-crawler`), Đợt đề xuất & List duyệt book (`koc-listing`, `approved-booking-list`), Danh bạ KOC & Quản lý Booking (`koc-master`, `koc-hub`, `booking`).

---

### BUG-024 — Kiểm Toán Chuyên Sâu Phân Hệ Crawler, Nghiệm Thu Video & Kiểm Tra Link Air Đa Nền Tảng
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/linkAirCheck.ts`, `web-admin/src/lib/linkAirCheckServer.ts`, `web-admin/src/components/crawler/LinkAirCheckerPanel.tsx`, `web-admin/src/lib/tiktokOpenSourceEngines.ts`, `web-admin/src/lib/tiktokVideoInspector.ts`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Thiếu bộ giải mã chuyên biệt cho Shopee Video, Facebook và Instagram trong `checkSingleLinkServerless` (`linkAirCheckServer.ts`):** Khi không cấu hình `CRAWLER_WORKER_URL`, luồng serverless trong `web-admin` chỉ dùng regex thẻ `og:title`/`og:description` cơ bản thay vì bóc tách `<script id="__NEXT_DATA__">` (`mediaInfo`) của Shopee Video, JSON nhúng (`video_view_count`, `reaction_count`, `total_comment_count`, `share_count`, `publish_time`, `playable_duration_in_ms`, `owner_as_page`, `vanity`, `message.text`, `comet_product_tag_feed_overlay_renderer`) của Facebook, và định dạng `parseInstagramDescription` (`likes, comments - handle on Month Day, Year: "caption"`) của Instagram.
  2. **Tab "Kiểm tra link air" (`LinkAirCheckerPanel.tsx` / `linkAirCheckServer.ts`) chưa trích xuất phụ đề lời thoại WebVTT, chữ chèn trên màn hình (`stickersOnItem`), giây xuất hiện tên sản phẩm và từ cấm chính sách:** `inspectLiveTikTokVideoPage` chưa lưu `subtitleUrl` và `onScreenStickers`, dẫn đến khi KOC nói tên thương hiệu/từ khóa trong video hoặc gắn chữ trên màn hình nhưng không viết trong caption thì vẫn bị cảnh báo thiếu từ khóa, và hộp thoại chi tiết thiếu mốc giây nhắc tên sản phẩm.
  3. **Từ khóa tính từ tiếng Anh thông dụng (`White`, `Super`...) bị bắt nhầm làm tên riêng trong `detectProductMentionMoments` (`tiktokVideoInspector.ts`):** Khi kiểm tra video sản phẩm có tên tiếng Anh ghép (như `Nucos Super White`), các từ đơn `White`, `Super` chưa nằm trong `GENERIC_TITLE_STOPWORDS` nên bị khớp đơn lẻ; đồng thời nhãn thời gian `11.2s - 12.2s` bị cắt phần thập phân thành `00:11 - 00:11`.
  4. **Lỗi regex thẻ tiêu đề Bing Video, điều kiện loại nhầm bài Photo Carousel 0 giây và công thức modulo trong `tiktokOpenSourceEngines.ts`:**
     - Dòng 2382 dùng `class="mc_vtvc_title"` không khớp với HTML thực tế của Bing (`class="mc_vtvc_title b_promtxt"`).
     - Dòng 917 trả về `null` khi `views === 0 && durationSeconds === 0`, làm các bài Photo Carousel mới đăng (`durationSeconds === 0`) bị báo nhầm là `UNAVAILABLE`.
     - `fetchRawCommentsByAwemeId` dùng tham số vùng `app_language: 'ja-JP', region: 'ID'` thay vì `vi-VN` / `VN`.
     - `getUpbaseMasterKocsForTrendingCategory` còn công thức modulo `(idx * 17389) % 380000` (`RULE-DATA-01`).
- **Cách khắc phục:**
  1. Tích hợp đầy đủ bộ giải mã chuyên biệt cho Shopee Video (`__NEXT_DATA__`), Facebook (JSON nhúng + `publish_time` + `owner_as_page` + `comet_product_tag_feed_overlay_renderer`) và Instagram (`parseInstagramDescription`) vào `web-admin/src/lib/linkAirCheckServer.ts`.
  2. Bổ sung `onScreenStickers` và `subtitleUrl` vào `RealTikTokVideoAndAuthorDetail` (`tiktokOpenSourceEngines.ts`); tự động tải phụ đề WebVTT, phát hiện mốc giây nhắc tên sản phẩm (`detectProductMentionMoments`), quét từ cấm chính sách (`scanBlacklistViolations`), đối chiếu `requiredKeywords` trên cả 4 nguồn (Caption + Phụ đề lời thoại + Chữ trên màn hình + Tên giỏ hàng) và hiển thị trực quan trên bảng + `LinkAirDetailModal` + file CSV xuất ra.
  3. Mở rộng `GENERIC_TITLE_STOPWORDS`, ưu tiên cụm tên riêng Latin 2–3 từ đi liền nhau (`Nucos Super White`, `La Roche Posay`), chuẩn hóa `formatSecToMmSs` trong `parseWebVttToSegments`, lấy `Math.max` giữa `stats` và `statsV2` và thử toàn bộ `urlList` phụ đề trong `tiktokVideoInspector.ts`.
  4. Sửa regex `class="mc_vtvc_title[^"]*"`, giữ hợp lệ bài Photo Carousel / bài mới đăng trong `parseTikTokItemStructToDetail`, chuyển `fetchRawCommentsByAwemeId` sang `vi-VN`/`VN`, và xóa bỏ hoàn toàn công thức modulo trong `getUpbaseMasterKocsForTrendingCategory`.
- **Phạm vi rà soát mở rộng sang phần khác:** Toàn bộ phân hệ Crawler (`tiktokOpenSourceEngines.ts`, `tiktokKocScraper.ts`, `tiktokVideoInspector.ts`, `linkAirCheckServer.ts`, `LinkAirCheckerPanel.tsx`, `crawler-worker`).

---

### BUG-025 — Tự Động Gọi API Phân Tích / Dò Tìm / Cào Dữ Liệu Ngay Khi Vừa Mở Hộp Thoại Mà Chưa Bấm Nút
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/koc/KocHistoryEvaluationModal.tsx`, `web-admin/src/components/OperationalReportDrawer.tsx`, `web-admin/src/components/koc/KocSocialChannelsModal.tsx`, `web-admin/src/components/koc/TikTokKocScraperModal.tsx`, `web-admin/src/components/crawler/LinkAirCheckerPanel.tsx`.
- **Triệu chứng:** Khi người dùng mở hộp thoại **Báo cáo đánh giá lịch sử & rủi ro KOC** (`KocHistoryEvaluationModal`), **Báo cáo phân tích vận hành** (`OperationalReportDrawer`), **Tìm & xác nhận kênh MXH** (`KocSocialChannelsModal`), **Lấy dữ liệu kênh TikTok** (`TikTokKocScraperModal`) hoặc **Chi tiết kiểm tra Link Air** (`LinkAirDetailModal`), hệ thống tự động gọi ngay API mô hình ngôn ngữ / API cào dữ liệu mà không chờ người dùng kiểm tra tham số và bấm nút.
- **Nguyên nhân gốc (Root Cause):** Các component trên đặt lệnh gọi `handleRunReport()`, `handleGenerateReport()`, `runSearch()`, `fetch('/api/integrations/tiktok-koc/scrape')` và `fetch('/api/integrations/link-air-check')` bên trong `useEffect([open, ...])` ngay khi hộp thoại mở.
- **Cách khắc phục:** Xóa bỏ toàn bộ `useEffect` tự động gọi API khi mở hộp thoại trên cả 5 component; chỉ thực thi API khi người dùng chủ động bấm nút (`Đánh giá` / `Chạy đánh giá`, `Chạy phân tích`, `Dò tìm kênh tự động` / `Quét qua mô hình & Google`, `Lấy dữ liệu kênh`, `Tải chi tiết giỏ hàng`). Ban hành quy tắc bắt buộc **`RULE-API-02`**.
- **Phạm vi rà soát mở rộng sang phần khác:** Toàn bộ các hộp thoại và ngăn kéo có tích hợp LLM hoặc crawler trong toàn hệ thống.

---

### BUG-026 — Lưu Đánh Giá Kênh KOC Không Hiện Ngay Ở Bảng Bên Cạnh & Báo Lỗi 500 Client Reference Trên Server Route
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/koc/KocChannelReviewModal.tsx`, `web-admin/src/lib/kocChannelReviewService.ts`, `web-admin/src/app/api/integrations/tiktok-koc/channel-reviews/route.ts`, `web-admin/src/lib/server/accessPolicy.ts`.
- **Triệu chứng:** Khi bấm `Lưu đánh giá vào lịch sử` trong hộp thoại `Đánh giá Kênh & Lịch sử đánh giá`, kết quả đánh giá mới không lưu được hoặc không hiển thị ngay ở bảng bên phải (`Lịch sử đánh giá kênh @...`) và cột `Đánh giá & Brand` trên bảng danh sách phía sau.
- **Nguyên nhân gốc (Root Cause):**
  1. **Route Handler máy chủ gọi hàm từ file có `'use client'` (`channel-reviews/route.ts`):** `src/lib/kocChannelReviewService.ts` khai báo `'use client'` ở dòng đầu, nhưng `src/app/api/integrations/tiktok-koc/channel-reviews/route.ts` lại import và gọi hàm `normalizeKocChannelHandle()` và `getVerdictLabel()` từ file đó trên server, khiến React Server Runtime ném lỗi HTTP 500: `Attempted to call normalizeKocChannelHandle() from the server but normalizeKocChannelHandle is on the client`.
  2. `KocChannelReviewModal.tsx` trước đó chỉ đọc dữ liệu từ prop `reviews` của màn hình cha và đặt thông báo lỗi ở cuối cột trái (bị khuất bên dưới vùng cuộn của hộp thoại).
  3. `submitKocChannelReview` trong `kocChannelReviewService.ts` chờ phản hồi mạng xong mới cập nhật bộ nhớ đệm; khi API trả về 500 (hoặc 403), hàm trả về `success: false` mà không rơi vào nhánh `catch`, làm lượt đánh giá không được ghi nhận.
- **Cách khắc phục:**
  1. Tách riêng các hàm thuần túy (`normalizeKocChannelHandle`, `getVerdictLabel`) trực tiếp trong `src/app/api/integrations/tiktok-koc/channel-reviews/route.ts` và chỉ dùng `import type` đối với `kocChannelReviewService.ts` để triệt tiêu hoàn toàn lỗi ranh giới Client/Server trên Next.js 16.
  2. Cập nhật `submitKocChannelReview` (`kocChannelReviewService.ts`) thực hiện **lưu và phát sự kiện cập nhật tức thì (0ms)** vào bộ nhớ đệm + `localStorage` + `KOC_CHANNEL_REVIEWS_UPDATED_EVENT` ngay khi bấm nút, sau đó đồng bộ ngầm (`keepalive: true`) với máy chủ (`/api/integrations/tiktok-koc/channel-reviews`) cùng một mã `id` thống nhất.
  3. Tích hợp `localReviews` + `useKocChannelReviews()` trực tiếp trong `KocChannelReviewModal.tsx`, hiển thị thông báo xác nhận xanh ngay tại chân hộp thoại và trong form, đồng thời đánh dấu nổi bật (`Mới lưu`) cho lượt đánh giá vừa lưu ở bảng bên phải.
  4. Mở rộng `userWithPolicy` (`accessPolicy.ts`) khớp đầy đủ theo `id`, `email`, `staffCode` (`staff-${code}`) và `name`, đồng bộ trực tiếp vào `AppSharedRecord` trên Supabase PostgreSQL.
- **Phạm vi rà soát mở rộng sang phần khác:** Toàn bộ các file trong `src/app/api/` và `src/lib/server/` để đảm bảo không có route máy chủ nào import hàm runtime từ module có `'use client'`.

### BUG-027 — Màn Hình Nghiên Cứu Brand & Đối Thủ Tự Động Chạy API Mô Hình Ngôn Ngữ Khi Tải Màn Hình & Khi Đổi Nhãn Hàng
- **Ngày phát hiện:** 20/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/BrandMarketResearchHubView.tsx` và `web-admin/src/components/crawler/CompetitorVideoScriptModal.tsx`.
- **Triệu chứng:** Mở màn hình Nghiên cứu Brand & Đối thủ hoặc chuyển đổi giữa các thương hiệu làm phát sinh hàng loạt lượt gọi API đến Mô hình Ngôn ngữ (`Nghiên cứu Kutieskin — Toàn diện...`, gọi Google Gemini `gemini-3.8-flash` hoặc fallback Bộ xử lý nội bộ) ghi nhận tại Nhật ký Chi tiết & Đối soát API, tiêu tốn token và thời gian xử lý mà người dùng chưa bấm nút nghiên cứu. Tương tự, hộp thoại tách lời thoại video đối thủ tự động gọi bóc tách ngay khi vừa mở.
- **Nguyên nhân gốc (Root Cause):**
  1. `BrandMarketResearchHubView.tsx` chứa `useEffect` khởi tạo (`hasInitializedModelReport`) tự động gọi `handleRunModelResearch({ targetDossier: dossier, playbook: 'COMPREHENSIVE' })` ngay khi render lần đầu.
  2. Khối so sánh `selectedBrand !== prevSelectedBrand` trong `BrandMarketResearchHubView.tsx` tự động kích hoạt `handleRunModelResearch(...)` mỗi khi đổi thương hiệu.
  3. `CompetitorVideoScriptModal.tsx` tự động gọi `runExtract` bên trong `useEffect` khi `isOpen` và có `initialUrl`.
- **Cách khắc phục:**
  1. Xóa bỏ hoàn toàn `useEffect` khởi tạo và biến cờ `hasInitializedModelReport` trong `BrandMarketResearchHubView.tsx`.
  2. Trong khối đổi `selectedBrand`, chỉ cập nhật dữ liệu hồ sơ tĩnh (`setDossier`, `setMinedClusters`) và đặt `setModelResearchResult(null)`, không tự động gọi `handleRunModelResearch`. API chỉ được gọi khi người dùng bấm nút tường minh (`Tìm & Tổng hợp`, `Nghiên cứu` hoặc chọn Playbook phân tích).
  3. Xóa bỏ lệnh gọi `runExtract` trong `useEffect` của `CompetitorVideoScriptModal.tsx`, chỉ điền sẵn ô nhập đường dẫn và chờ người dùng bấm `Tách lời thoại & Hook` hoặc nhấn Enter.
- **Phạm vi rà soát mở rộng sang phần khác:** Toàn bộ các view và drawer tích hợp API mô hình và crawler, đảm bảo 100% tuân thủ `RULE-API-02`.

### BUG-028 — Lệch Tên Gian Hàng Giữa Bộ Chọn Dropdown (4PM) Và Trạng Thái Bảng Dữ Liệu (Kutieskin) Tại Màn Hình Listing & Air Video
- **Ngày phát hiện:** 21/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/KocListingBatchHubView.tsx`, `web-admin/src/components/shortlist/StaffBrandListingSheetWorkspace.tsx`, `web-admin/src/components/shortlist/AddToBrandListingSheetModal.tsx`, `web-admin/src/components/views/ApprovedBookingListView.tsx`, `web-admin/src/lib/staffBrandListingSheet.ts`, `web-admin/src/lib/mockData.ts`.
- **Triệu chứng:**
  - Trên màn hình *Listing & Air Video* (Tab *Sheet Listing Cá Nhân (Theo Brand)*):
  - Khung chọn dropdown phía trên hiển thị `4PM – 4PM_Shopee_E2E-S (5 KOC)` và các tab đính kèm `4PM_Shopee_E2E-S 5`, `4PM_TikTok_E2E-S 5`.
  - Cụm thống kê hiển thị: `KOC: 0 | Net: 0 đ | Gross: 0 đ`.
  - Bảng dữ liệu bên dưới hiển thị trạng thái trống: `Sheet “Kutieskin Chính Hãng - TikTok Shop” (2026/10) chưa có KOC nào`.
- **Nguyên nhân gốc (Root Cause):**
  1. `KocListingBatchHubView.tsx` khởi tạo `selectedStore` mặc định là `'Kutieskin Chính Hãng - TikTok Shop'` (chuỗi hardcode cũ thời mockup ban đầu).
  2. Danh mục 69 gian hàng B2C chuẩn (`REAL_B2C_69_STORES`) không có gian hàng tên `'Kutieskin Chính Hãng - TikTok Shop'` (tên chuẩn của thương hiệu này là `'Kutieskin Mama_Shopee_E2E-S'` và `'Kutieskin Mama_TikTok_E2E-S'`). Gian hàng đầu tiên trong danh mục thực tế là `'4PM_Shopee_E2E-S'`.
  3. `StaffBrandListingSheetWorkspace.tsx` nhận prop `selectedStore = 'Kutieskin Chính Hãng - TikTok Shop'` nhưng không đối soát xem tên đó có tồn tại trong danh sách `b2cStores` hay không.
  4. Thẻ HTML `<select value={activeStoreName}>` nhận giá trị `'Kutieskin Chính Hãng - TikTok Shop'`. Do không có thẻ `<option>` nào khớp, trình duyệt mặc định hiển thị tùy chọn đầu tiên là `4PM – 4PM_Shopee_E2E-S (5 KOC)`.
  5. Tuy nhiên, state nội bộ `activeStoreName` trong React vẫn giữ `'Kutieskin Chính Hãng - TikTok Shop'`. Vì sheet `'2026/10__Kutieskin...'` không có dữ liệu mẫu, React render trạng thái trống kèm thông báo `Sheet “Kutieskin...” chưa có KOC nào` và số lượng `KOC: 0`.
- **Cách khắc phục:**
  1. Trong `KocListingBatchHubView.tsx`: Thay chuỗi hardcode cũ bằng gian hàng B2C hợp lệ đầu tiên từ `stores` (`4PM_Shopee_E2E-S`), đồng thời cập nhật form tạo mới và các fallback.
  2. Trong `StaffBrandListingSheetWorkspace.tsx`: Kiểm tra `isStoreValid = b2cStores.some(s => s.storeName === selectedStore)`. Nếu không hợp lệ, tự động tìm alias matching hoặc lấy `b2cStores[0]?.storeName` và phát lệnh `onChangeStore` để đồng bộ ngược lên component cha.
  3. Trong `mockData.ts` & `monthlyPlanData.ts`: Chuẩn hóa dữ liệu mẫu của Kutieskin sang tên gian hàng chuẩn `Kutieskin Mama_TikTok_E2E-S`.
  4. Trong `staffBrandListingSheet.ts`: Mở rộng tập gian hàng khởi tạo dữ liệu mẫu ban đầu để bao gồm cả các gian hàng của Kutieskin bên cạnh top 5 gian hàng đầu tiên.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã đối soát và thay thế toàn bộ các fallback hardcode `'Kutieskin Chính Hãng - TikTok Shop'` tại `AddToBrandListingSheetModal.tsx` và `ApprovedBookingListView.tsx` sang đọc từ gian hàng thực tế.

### BUG-029 — Nhãn UI Và Form Bị Rớt Dòng Đơn Độc Trên Hộp Thoại Do Chia Lưới Quá Chật & Thiếu Chống Ngắt Dòng
- **Ngày phát hiện:** 21/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/ui/blocks.tsx`, `StaffBrandListingSheetWorkspace.tsx`, `AddToBrandListingSheetModal.tsx`, `LarkPaymentRequestModal.tsx`, `KocVideoHistoryRegistryModal.tsx`, `BrandEditors.tsx`, `StoreEditDialog.tsx`, `CtvManagementView.tsx`, `KocHistoryEvaluationModal.tsx`.
- **Triệu chứng:** Trên các hộp thoại chọn KOC vào Sheet (`StaffBrandListingSheetWorkspace`), các nhãn trường như `Đề xuất UpBase (Cột R)` bị rớt chữ `R)` đơn độc xuống dòng thứ 2. Tương tự, trên các hộp thoại khác các cụm `(VNĐ)`, `(%)`, `(Giờ)`, `(Khớp CCCD/HĐ)` bị gãy dòng do chia lưới 4-5 cột bằng nhau trong modal cỡ `lg` (672px).
- **Nguyên nhân gốc (Root Cause):**
  1. Hộp thoại cấu hình cỡ `size="lg"` quá hẹp khi chia lưới nhiều cột (`grid-cols-4`, `grid-cols-5`), làm chiều rộng mỗi cột chỉ còn ~140px.
  2. Component `<Field>` chưa có cơ chế chống ngắt dòng nhãn (`whitespace-nowrap`), khiến trình duyệt ngắt dòng ở dấu cách trước dấu ngoặc đơn hoặc ký hiệu đơn vị.
- **Cách khắc phục:**
  1. Nâng kích thước các modal chứa form nhiều cột lên `size="xl"` (896px).
  2. Tái cấu trúc lưới chia cột theo tỷ lệ linh hoạt 12 cột (cột ngắn 2 cột, cột dài 3-4 cột) thay vì chia đều.
  3. Bổ sung thuộc tính `noWrap?: boolean` và `labelClassName?: string` vào component chuẩn `<Field>` (`blocks.tsx`) và áp dụng đồng loạt cho các form liên quan.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã rà soát hơn 370 trường `Field` trên toàn bộ hệ thống.

---

### BUG-030 — Bảng Ma Trận Chức Năng Bị Thừa Quá Nhiều UI (Mô Tả Xám Lê Thê, Phụ Đề Cột Lặp Lại, Buzzword Tiếng Anh)
- **Ngày phát hiện:** 21/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/CentralizedRbacHubView.tsx`.
- **Triệu chứng:** Màn hình *Phân quyền & Nhân sự* (Tab *Ma trận chức năng*) hiển thị quá nhiều chi tiết giải thích thừa thãi: mỗi hàng có 2 dòng mô tả xám, 1 dòng cảnh báo bảo mật vàng riêng biệt; mỗi tiêu đề cột có chữ xám `Nội bộ` / `Đối tác` lặp lại 16 lần; tên tính năng kèm tiếng Anh trong ngoặc đơn; thanh lọc chứa khung chú giải màu sắc dài dòng; mỗi ô hiển thị là một thẻ `<select>` thô dày với mũi tên dropdown, đẩy chiều cao mỗi hàng lên tới ~90px khiến bảng rất khó nhìn và cuộn mỏi mắt.
- **Nguyên nhân gốc (Root Cause):** Chưa áp dụng triệt để quy tắc `GEMINI.md` Rule 1 (Cấm dòng chữ giải thích/phụ đề bên dưới tiêu đề) vào bảng ma trận quyền dữ liệu lớn (33 tính năng × 16 vai trò).
- **Cách khắc phục:**
  1. Xóa bỏ toàn bộ 2 dòng mô tả xám và dòng cảnh báo bảo mật riêng biệt dưới tên tính năng; chuyển toàn bộ nội dung sang thuộc tính `title` (tooltip khi hover) kèm icon khóa `🔒` nhỏ gọn nếu có lưu ý bảo mật.
  2. Lọc bỏ các đuôi tiếng Anh thừa trong ngoặc đơn (`featureName.replace(/\s*\([^)]*\)$/, '')`), trả lại tên nghiệp vụ tiếng Việt gọn gàng.
  3. Xóa bỏ dòng chữ xám `Nội bộ` / `Đối tác` lặp lại ở 16 tiêu đề cột.
  4. Xóa bỏ khung chú giải màu sắc dài dòng trên thanh lọc.
  5. Đơn giản hóa các ô mức quyền: Hiển thị badge pill phẳng gọn gàng khi người dùng không phải Admin, dùng ô chọn tối giản (`h-6`, chữ đậm nét) khi là Admin.
  6. Chiều cao dòng giảm từ ~90px xuống ~34px, bảng hiển thị được gấp 3 lần lượng dữ liệu trên một màn hình.
- **Phạm vi rà soát mở rộng sang phần khác:** Các bảng phân quyền và danh mục trong toàn bộ hệ thống.

---

### BUG-031 — Thu Thập Dữ Liệu Video TikTok Bị Thiếu Thông Tin Giỏ Hàng & Link Sản Phẩm
- **Ngày phát hiện:** 21/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/tiktokOpenSourceEngines.ts`, `web-admin/src/lib/tiktokVideoInspector.ts`, `web-admin/src/components/koc/TikTokVideoInspectorModal.tsx`.
- **Triệu chứng:** Khi đối soát nghiệm thu link video TikTok có gắn giỏ hàng TikTok Shop, hệ thống nhận diện được cờ "Có gắn giỏ" nhưng không bóc tách được thông tin chi tiết sản phẩm (tiêu đề sản phẩm, ảnh bìa, mã sản phẩm ID, mã shop ID và link giỏ hàng trực tiếp). Giao diện modal chỉ hiển thị dòng chữ chung chung "Gắn thẻ giỏ hàng: TikTok Shop" và không có nút mở link giỏ.
- **Nguyên nhân gốc (Root Cause):**
  1. Cấu trúc dữ liệu TikTok web SSR thay đổi: `anchor.extra` được trả về dưới dạng JSON Object/Array hoặc chuỗi JSON lồng nhiều tầng, trong khi hàm cũ chỉ parse 1 tầng chuỗi (`typeof extra === 'string'`).
  2. Một số video trên bản web desktop chỉ gắn cờ `isECVideo = 1` nhưng mảng `anchors` trong HTML SSR bị giấu (`anchors: []`).
  3. Mã sản phẩm (`productId`) là số nguyên dài 19 chữ số vượt quá giới hạn an toàn của JavaScript Number (`Number.MAX_SAFE_INTEGER`), nếu ép kiểu số sẽ bị làm tròn sai số đuôi.
  4. Chưa có cơ chế truy vấn dữ liệu dự phòng từ feed tác giả (`/api/creator/item_list/`) theo `secUid` để lấy trọn vẹn danh mục giỏ hàng.
- **Cách khắc phục:**
  1. Nâng cấp hàm `extractTikTokShopAnchorInfo`: hỗ trợ giải mã đa tầng cả Object, Array, chuỗi JSON lồng nhau, bóc tách ID sản phẩm bằng Regex dạng chuỗi (tránh làm tròn BigInt), quét cả thuộc tính `schema` và `commerceInfo`.
  2. Bổ sung cơ chế fallback tự động trong `tiktokVideoInspector.ts`: khi video có cờ giỏ hàng (`hasCartAnchor = true`) nhưng mảng sản phẩm rỗng, tự động gọi feed tác giả theo `secUid` để trích xuất đầy đủ thông tin sản phẩm (Tên, Ảnh, ID, Shop ID).
  3. Đảm bảo luôn tự động sinh đường dẫn trực tiếp tới sản phẩm TikTok Shop (`https://shop.tiktok.com/view/product/${productId}?region=VN&locale=vi-VN`) khi có `productId`.
  4. Cập nhật `TikTokVideoInspectorModal.tsx` hiển thị thẻ sản phẩm rõ ràng với ảnh bìa, tên sản phẩm, mã ID, cùng nút "Mở giỏ" và "Chép link" tiện lợi cho chuyên viên đối soát.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã đối soát toàn bộ luồng nghiệm thu link video, nhật ký nghiệm thu và kiểm tra build (`npm run build`) đạt exit code 0.

---

### BUG-032 — Thiếu Chẩn Đoán Nguyên Nhân Kỹ Thuật Khi Giỏ Hàng Bị Ẩn & Xung Đột Anchor CapCut Trên TikTok Web
- **Ngày phát hiện:** 21/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/tiktokOpenSourceEngines.ts`, `web-admin/src/lib/tiktokVideoInspector.ts`, `web-admin/src/components/koc/TikTokVideoInspectorModal.tsx`, `crawler-worker/src/adapters/tiktok.ts`, `crawler-worker/src/core/types.ts`, `crawler-worker/src/check-link.ts`, `crawler-worker/src/cli.ts`.
- **Triệu chứng:** Khi đối soát một số video TikTok có gắn giỏ hàng nhưng không cung cấp nguồn đối chiếu, nếu TikTok Web không trả về chi tiết sản phẩm hoặc KOC dùng mẫu CapCut, giao diện chỉ hiển thị dòng dự phòng mờ nhạt `Gắn thẻ giỏ hàng: TikTok Shop`, không hiển thị thông tin sản phẩm cào được và không có chẩn đoán nguyên nhân kỹ thuật cụ thể (tại sao video có cờ giỏ hàng nhưng không lấy được link/mã SP).
- **Nguyên nhân gốc (Root Cause):**
  1. Chưa có bộ phân loại chẩn đoán kỹ thuật (`CartDiagnosisInfo`) dựa trên các trường thực tế của TikTok: `isECVideo`, `AnchorTypes`, `anchors[].type`, `commerceInfo`.
  2. Khi KOC gắn đồng thời Giỏ hàng và Mẫu CapCut, TikTok Web trả về `AnchorTypes: ['54', '33']`, trong đó phần tử `anchors[0]` là CapCut (`type: 54`), còn thẻ giỏ hàng (`type: 35/33`) bị đẩy xuống phần tử thứ hai hoặc giấu trên bản web. Nếu chỉ đọc phần tử đầu thì sẽ bỏ sót sản phẩm.
  3. Giao diện `TikTokVideoInspectorModal.tsx` khi `detectedProducts` rỗng chỉ in dòng text cụt lủn `Gắn thẻ giỏ hàng: TikTok Shop`, không giải thích nguyên nhân nền tảng và không cung cấp đường dẫn mở video trực tiếp.
- **Cách khắc phục:**
  1. Bổ sung bộ chẩn đoán kỹ thuật 5 mã trạng thái chuẩn (`CartDiagnosticCode`):
     - `ACTIVE_CART`: Đã bóc tách thành công thẻ sản phẩm công khai trên video.
     - `CAPCUT_CONFLICT`: Video có bật giỏ hàng khi đăng (`isECVideo: 1` / Anchor 33), nhưng bị thẻ mẫu CapCut (`type: 54`) đè lên trên bản Web Desktop.
     - `OUT_OF_STOCK_OR_HIDDEN`: Video có bật giỏ hàng khi đăng (`isECVideo: 1`), nhưng TikTok không trả về thẻ sản phẩm (sản phẩm hết tồn kho, shop tạm ẩn hoặc bị gỡ).
     - `CAPTION_LINK`: KOC dán link sản phẩm trong phần mô tả bài đăng.
     - `NO_CART`: Video không gắn giỏ hàng (`isECVideo: 0`).
  2. Nâng cấp cơ chế Deep Anchor Traversal: Quét sâu toàn bộ các phần tử trong `anchors`, bóc tách thành công thẻ giỏ hàng `type: 35/33` kể cả khi nằm sau thẻ CapCut `type: 54`.
  3. Bổ sung fallback kết nối TikTok Mobile Crawler API (`TIKTOK_CRAWLER_API_URL` qua container Docker) khi bản Web desktop không render thẻ giỏ hàng.
  4. Đồng bộ logic chẩn đoán `CartDiagnosis` sang service độc lập `crawler-worker` (`types.ts`, `tiktok.ts`, `check-link.ts`, `cli.ts`).
  5. Cập nhật giao diện `TikTokVideoInspectorModal.tsx`:
     - Huy hiệu trạng thái phản ánh đúng bản chất: `Có gắn giỏ (Thẻ CapCut đè web)` (tone vàng cảnh báo) thay vì báo chung chung.
     - Khung hiển thị chi tiết khi `detectedProducts` rỗng: hiển thị banner chẩn đoán nguyên nhân kỹ thuật, nhãn tín hiệu gốc (`isECVideo: 1`), nút `Mở video kiểm tra trên TikTok` và hướng dẫn dán link/mã SP đối soát.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã kiểm tra cả 2 phân hệ `crawler-worker` (toàn bộ 17 unit test pass, typecheck sạch) và `web-admin` (`npm run build` hoàn thành với exit code 0).

---

### BUG-033 — Khung Lương KL1–KL7 Mỗi Màn Một Số, Lệch Bảng 5.6 Tệp Cast Của Lark
- **Ngày phát hiện:** 22/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/klTiers.ts` (mới), `StoreShortlistFilterModal.tsx`, `KocKolHubView.tsx`, `KocListingBatchHubView.tsx`, `kocRecommendationEngine.ts`, `larkbaseBookingPlanSync.ts`, `planBreakdownRules.ts`.
- **Triệu chứng:** Cùng một bậc KOC nhưng nhãn và đơn giá khác nhau giữa các màn: KL4 là 3M–5M hoặc 3M–6M, KL5 là 5M–10M, 6M–12M hoặc 10M–18M, KL6 là 10M–30M, 12M–25M, 10M–20M hoặc 18M–35M, KL7 là trên 20M, 25M, 30M hoặc 35M. Đơn giá mặc định (400k, 2,2M, 14M, 25M...) lệch giá thực tế trong bảng 4.1.1 và 3.2.
- **Nguyên nhân gốc (Root Cause):** Mỗi màn tự khai báo mảng khung lương bằng số cứng, không có nguồn dùng chung; không đối chiếu với bảng 5.6 Tệp cast (khoảng giá và giá cơ sở: 250k, 1M, 2M, 4M, 7,5M, 18M, 45M).
- **Cách khắc phục:**
  1. Tạo `klTiers.ts` làm nguồn duy nhất (khoảng giá, nhãn, giá cơ sở theo bảng 5.6).
  2. Các màn lọc, hộp thoại, bộ gợi ý KOC, đồng bộ Larkbase và bộ kiểm soát phân rã đều đọc từ `klTiers.ts`.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã đồng bộ nốt toàn bộ chuỗi nhãn `KL6 (10-30tr)` và `KL7 (>30tr)` trong `mockData.ts` và `realB2cPlanData.ts`. Khi thêm màn mới dùng khung lương phải import từ `klTiers.ts`.

### BUG-034 — Hai Người Cùng Thao Tác Một Kế Hoạch: Người Lưu Sau Mất Toàn Bộ Phần Vừa Sửa
- **Ngày phát hiện:** 22/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/usePlanRecord.ts`, `useListingBoard.ts`, `threeWayMerge.ts` (mới); các màn dùng bản ghi chung theo kế hoạch: Kế hoạch content, Điều phối listing, Plan tháng của Brand, Danh mục sản phẩm, Deal.
- **Triệu chứng:** Khi người khác lưu trước, máy chủ trả 409 và màn hình tải lại bản mới, bỏ hết phần người dùng vừa sửa, dù hai người sửa hai KOC hoặc hai content khác nhau.
- **Nguyên nhân gốc (Root Cause):** Chống ghi đè bằng `revision` trên cả bản ghi nhưng không có bước gộp; phía máy khách không giữ bản mốc để so sánh.
- **Cách khắc phục:**
  1. Máy khách giữ bản mốc (bản máy chủ đã tải hoặc lưu gần nhất). Khi gặp 409, tải bản mới nhất rồi gộp ba bên (`threeWayMerge`): phần chỉ một bên sửa thì lấy bản đã sửa, danh sách có `id` gộp theo từng phần tử, hai bên cùng sửa một giá trị khác nhau thì giữ bản máy chủ và báo số mục trùng. Sau đó tự lưu lại, tối đa 3 lần.
  2. Khi máy chủ từ chối (400, 403, 423) thì báo lý do và tải lại, màn hình không giữ trạng thái lệch với dữ liệu thật.
- **Phạm vi rà soát mở rộng sang phần khác:** Mọi bản ghi mới dùng `usePlanRecord`. Các thao tác ghi trực tiếp từ máy chủ (đẩy sheet, lấy kết quả Brand, sổ hợp đồng nguyên tắc) đã tự thử lại khi gặp 409. Danh sách không có `id` ở từng phần tử được coi là một khối và xung đột khi hai người cùng sửa.

### BUG-035 — Cắt Cụt ID Kênh TikTok (Truncate) Trên Màn Hình Cào Dữ Liệu KOC
- **Ngày phát hiện:** 23/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/TikTokCrawlerHubView.tsx`.
- **Triệu chứng:** Trong bảng quét dữ liệu KOC (các tab Quét đối thủ, Hashtag, Xu hướng), cột "Kênh KOC & Liên hệ" bị co ngắn tên handle ID kênh thành 3-5 ký tự kèm dấu ba chấm (ví dụ: `@hal...`, `@cia...`, `@bs...`, `@go...`), khiến chuyên viên không thể đọc hoặc đối soát được ID kênh TikTok thực tế.
- **Nguyên nhân gốc (Root Cause):**
  1. Trong hàm hiển thị `renderUnifiedKocIdentityCell`, ID kênh, tích xanh, huy hiệu trạng thái (`KOC Mới`) và huy hiệu đánh giá Brand được nhồi nhét chung vào một hàng ngang flexbox hẹp kèm class `truncate`. Khi các huy hiệu chiếm diện tích, flexbox tự động co ép chuỗi ID kênh lại.
  2. Độ rộng cột `Kênh KOC & Liên hệ` cố định ở mức 245px quá hẹp đối với các handle dài khi kèm theo nhiều nhãn trạng thái.
- **Cách khắc phục:**
  1. Tách cấu trúc hiển thị thành 3 hàng độc lập:
     - Hàng 1: ID kênh TikTok đầy đủ (bỏ class `truncate`, sử dụng `font-code font-bold text-xs break-all`) + Tích xanh xác thực + Link mở video TikTok.
     - Hàng 2: Huy hiệu trạng thái KOC (`KOC Mới` / `Đã có trong Master`) + Nhãn đánh giá Brand.
     - Hàng 3: Tên hiển thị (Nickname) + SĐT hoặc Email.
  2. Nâng độ rộng cột `Kênh KOC & Liên hệ` từ 245px lên 285px trên cả 3 bảng dữ liệu cào.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã kiểm tra các bảng phụ `inlineReviewColumns` và nâng độ rộng lên 230px, đảm bảo toàn bộ các màn hình hiển thị ID KOC không bị cắt cụt.

---

### BUG-036 — Bất Đồng Bộ UI/UX Giữa Các Phân Hệ (Cỡ Chữ Dưới 12px, Màu Ngoài Chuẩn, Hộp Thoại Tự Dựng, Phụ Đề Giải Thích Dư Thừa)
- **Ngày phát hiện:** 24/10/2026
- **Phân hệ / File liên quan:** 66 tệp giao diện trên toàn bộ `web-admin/src/components` và `web-admin/src/app` (`ApprovedBookingListView.tsx`, `AirBookingReportHubView.tsx`, `SelfChannelCtvHubView.tsx`, `BrandHubView.tsx`, `KocKolHubView.tsx`, `TikTokCrawlerHubView.tsx`, `TikTokCrawlCreativeLoader.tsx`, `StoresMasterView.tsx`, `EmployeePlanInspectorModal.tsx`, `KalodataSyncModal.tsx`, `LegalOcrModal.tsx`, `ScriptReviewModal.tsx`, `ImportExcelModal.tsx`, `ContentView.tsx`, `SampleTrackerView.tsx`...).
- **Triệu chứng:**
  1. Nhiều màn hình sử dụng cỡ chữ tuỳ ý dưới 12px (`text-[9px]`, `text-[10px]`, `text-[11px]`) và độ đậm `font-bold` dày đặc làm giao diện nặng nề, khó đọc.
  2. Tồn tại các bảng màu nằm ngoài Design System (`indigo-*`, `purple-*`, `teal-*`, `sky-*`, `orange-*`) và các nút dùng nền tối cũ (`bg-slate-900`, `bg-slate-800`) thay vì token ngữ nghĩa (`bg-primary`, `bg-accent`, `bg-ink`).
  3. 16 hộp thoại tự dựng bằng `<div className="fixed inset-0 z-50...">` (8 hộp thoại trong `SelfChannelCtvHubView.tsx`, 3 trong `StoresMasterView.tsx`, cùng `EmployeePlanInspectorModal`, `KalodataSyncModal`, `LegalOcrModal`, `ScriptReviewModal`, `ImportExcelModal`) và 13 điểm gọi `window.confirm`/`alert` trình duyệt gây thiếu đồng nhất trải nghiệm đóng/mở và phím `Escape`.
  4. Một số màn hình (`AirBookingReportHubView.tsx`) lặp lại thẻ `<h1>` trùng với `TopHeader`, hoặc đặt dòng chữ giải thích xám (`<p>`, `description`, `hint`) ngay dưới tiêu đề khung/trường nhập liệu.
  5. Cột hành động cố định bên phải (`sticky right-0`) trên `ContentView.tsx` và `SampleTrackerView.tsx` dùng nền bán trong suốt (`bg-white/95`, `bg-surface/95`) làm lộ chữ của các cột bên dưới khi cuộn ngang.
- **Nguyên nhân gốc (Root Cause):** Các màn hình phát triển qua nhiều giai đoạn chưa được quét kiểm toán tự động đồng bộ theo chuẩn `DESIGN_SYSTEM.md` và `GEMINI.md` Mục 1.
- **Cách khắc phục:**
  1. Chuẩn hóa 100% cỡ chữ nhỏ về token `text-3xs` / `text-2xs` (tối thiểu 12px) và hạ toàn bộ `font-bold` về `font-semibold`.
  2. Thay thế toàn bộ màu ngoài chuẩn (`indigo`, `purple`, `teal`, `sky`, `orange`) và nền tối cũ (`bg-slate-900`/`800`) sang hệ token ngữ nghĩa (`primary`, `accent`, `positive`, `warning`, `danger`, `ink`, `surface`, `sunken`).
  3. Chuyển đổi toàn bộ 16 hộp thoại tự dựng sang component `<Modal>` chuẩn và thay toàn bộ `window.confirm`/`alert` bằng `<ConfirmDialog>` và thông báo `onNotify`.
  4. Xóa thẻ `<h1>` trùng lặp trong `AirBookingReportHubView.tsx`, gỡ bỏ toàn bộ dòng phụ đề `<p>` / `description` / `hint` dưới tiêu đề và trường nhập liệu.
  5. Đổi nền các ô `sticky right-0` và thanh `TopHeader` / `MobileBottomNav` sang nền đặc (`bg-surface`), gỡ bỏ hoàn toàn `backdrop-blur`, `animate-ping`, `animate-pulse`, `transition-all`, chuẩn hóa toàn bộ 44 khung `rounded-2xl` về `rounded-xl` và bổ sung khóa chặn vĩnh viễn vào `eslint.config.mjs`.
  6. Xóa bộ chọn Nhà cung cấp / Mô hình trên hộp thoại người dùng cuối (`KocSocialChannelsModal.tsx`, `BrandMarketResearchHubView.tsx`, `AiStaffReviewModal.tsx`) theo đúng `RULE-API-01` để đọc tự động từ Trung tâm Cấu hình API.
  7. Xử lý triệt để toàn bộ 25 tệp giao diện có lỗi React Compiler (`react-hooks/set-state-in-effect` và `react-hooks/refs`) bằng cơ chế đồng bộ state theo `prevKey` trong lúc render, triệt tiêu hiện tượng render kép khi mở hộp thoại hoặc chuyển bộ lọc.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã chạy trình quét tự động 2 vòng và ESLint trên toàn bộ 107+ tệp `.tsx` trong `src/components` và `src/app`, đạt **0 lỗi ESLint (`0 errors`)**, **0 lỗi `no-restricted-syntax`**, **0 lỗi TypeScript (`tsc --noEmit`)** và build sản phẩm (`npm run build`) thành công.

---

### BUG-037 — Tái Nhiễm Mẫu Lỗi Lịch Sử Trên Các Phân Hệ Phụ (Import Client Từ Server API, Lệch Giờ UTC+0, Nhãn Khung Lương Cũ, Tên Gian Hàng / Nhân Sự Mẫu Cũ & Rớt Dòng Nhãn Hộp Thoại)
- **Ngày phát hiện:** 24/10/2026
- **Phân hệ / File liên quan:** 45 tệp trên `web-admin/src` (`app/api/integrations/upaffiliate/sync/route.ts`, `lib/mockData.ts`, `lib/realB2cPlanData.ts`, `components/ui/blocks.tsx`, `MasterDataMindmapView.tsx`, `PlanDealBoard.tsx`, `TikTokCrawlerHubView.tsx`, `ApprovedBookingListView.tsx`, `KocKolHubView.tsx`, `InputPlanBreakdownView.tsx`, `CreatorMatchModal.tsx`, `StoresMasterView.tsx`, `TaskPolicySetupView.tsx`...).
- **Triệu chứng:**
  1. **Rủi ro `BUG-026` (Server Route import `'use client'` module):** API route `app/api/integrations/upaffiliate/sync/route.ts` import giá trị runtime (`computeNextScheduledSyncAt`, `DEFAULT_UPAFFILIATE_SYNC_CONFIG`) từ `src/lib/upaffiliateKocSyncService.ts` có chỉ thị `'use client'`, tiềm ẩn lỗi `TypeError: fn is not a function` trên Next.js Server Runtime.
  2. **Rủi ro `BUG-018` (Lệch ngày từ 00:00–06:59 sáng giờ Việt Nam do cắt chuỗi UTC+0):** 56 vị trí trên 26 tệp giao diện và thư viện vẫn dùng `new Date().toISOString().slice(0, 10)` / `.split('T')[0]` / `.substring(0, 10)` (múi giờ UTC+0) khi ghi ngày nghiệm thu, ngày bàn giao, ngày tạo bản ghi và đặt tên file CSV/MD xuất ra.
  3. **Rủi ro `BUG-033` (Nhãn bậc lương cũ):** 27 vị trí trong `mockData.ts` và `realB2cPlanData.ts` còn hiển thị chuỗi nhãn cũ `KL7 (>25tr)` / `KL6 (10-25tr)` thay vì chuẩn bảng 5.6 Lark (`KL6 (10-30tr)`, `KL7 (>30tr)`).
  4. **Rủi ro `BUG-028` & `BUG-007` (Tên gian hàng và nhân sự mẫu cũ):** Còn sót tên gian hàng mẫu (`Shopee Mall Kutieskin Chính Hãng`, `Kutieskin Official Store`) trong `MasterDataMindmapView.tsx` và các tên nhân sự mẫu cũ (`Khánh Vy`, `Lê Hoàng Nam`, `Minh Tuấn`) ở giá trị mặc định/fallback của 14 tệp giao diện.
  5. **Rủi ro `BUG-029` (Hộp thoại hẹp chứa lưới nhiều cột & rớt dòng chữ trong ngoặc đơn):** 8 hộp thoại `<Modal>` để `size="md"` hoặc `size="lg"` nhưng bên trong chia lưới `grid-cols-3` / `grid-cols-4`, và 166 thẻ `<Field label="...">` có cụm chú thích ngoặc đơn ở cuối (`(VNĐ)`, `(%)`, `(Brand) *`, `(SLA ≤ 2 ngày)`) dễ bị ngắt đôi chữ trong ngoặc khi khung hẹp.
- **Nguyên nhân gốc (Root Cause):** Các bản vá lỗi trước đây xử lý tại màn hình được báo cáo nhưng chưa có kịch bản quét đối soát chéo toàn bộ 36 mẫu lỗi lịch sử trên toàn kho mã nguồn.
- **Cách khắc phục:**
  1. Tách `import type` và định nghĩa hằng số/hàm tính lịch đồng bộ ngay phía server trong `app/api/integrations/upaffiliate/sync/route.ts` (`BUG-026`).
  2. Thay thế toàn bộ 56 điểm cắt chuỗi ngày UTC+0 trên 26 tệp sang hàm chuẩn múi giờ Việt Nam `getVietnamDateYmd()` và `getVietnamDateTimeShort()` (`Asia/Ho_Chi_Minh`, `GMT+7`) từ `src/lib/format.ts` (`BUG-018`).
  3. Đồng bộ 100% nhãn `KL6 (10-30tr)` và `KL7 (>30tr)` trong `mockData.ts` và `realB2cPlanData.ts` (`BUG-033`).
  4. Thay thế hoàn toàn tên gian hàng mẫu sang gian hàng B2C thực tế (`Kutieskin Mama_Shopee_E2E-S`, `Kutieskin Mama_TikTok_E2E-S`) và thay toàn bộ tên nhân sự mẫu cũ sang nhân sự B2C thực tế (`Lê Phương Thảo`, `Nguyễn Thị Ngọc Tâm`) (`BUG-028`, `BUG-007`).
  5. Nâng kích thước 8 hộp thoại `<Modal>` đa cột lên `size="lg"` / `size="xl"` và nâng cấp trực tiếp component gốc `<Field>` trong `src/components/ui/blocks.tsx` để tự động bọc `<span className="whitespace-nowrap">` cho cụm ngoặc đơn cuối nhãn, chấm dứt triệt để hiện tượng rớt dòng chữ mồôi trên mọi biểu mẫu (`BUG-029`).
- **Phạm vi rà soát mở rộng sang phần khác:** Đã kiểm chứng lại bằng kịch bản quét mẫu lỗi lịch sử, ESLint (`0 errors`), TypeScript (`tsc --noEmit` 0 lỗi) và `npm run build` thành công.

---

### BUG-038 — Lỗi React Compiler Trong Hooks Dùng Chung (`src/lib`), Kiểu `any` Trên API Routes & Nút Bấm Thiếu `type="button"` Trong Biểu Mẫu
- **Ngày phát hiện:** 24/10/2026
- **Phân hệ / File liên quan:** 45 tệp trên `web-admin/src/app/api/**`, `web-admin/src/lib/**` và `web-admin/src/components/**` (`usePlanRecord.ts`, `usePlanChat.ts`, `useMonthlyPlanSync.ts`, `useBrandProfiles.ts`, `kocChannelReviewService.ts`, `ImportExcelModal.tsx`, `MasterDataMindmapView.tsx`, `BrandView.tsx`, `ContentAngleSetupView.tsx`, `PlanDiscussionHub.tsx`...).
- **Triệu chứng:**
  1. **React Compiler (`react-hooks/immutability` & `react-hooks/set-state-in-effect` trong `src/lib`):** Hook `usePlanRecord.ts` gọi đệ quy `void flush(id)` bên trong chính `useCallback` của `flush` trước khi biến được khởi tạo xong; 4 hook dùng chung (`useBrandProfiles.ts`, `kocChannelReviewService.ts`, `useMonthlyPlanSync.ts`, `usePlanChat.ts`) gọi `setState` đồng bộ trong thân `useEffect`.
  2. **Kiểu `any` & `prefer-const` trong `src/app/api` và `src/lib`:** 36 vị trí dùng `any` (trong `catch (err: any)`, ép kiểu phản hồi API Kalodata/Shopee/LLM, `contractRules.ts`...) và 9 vị trí `let` không gán lại.
  3. **Click-path & Biểu mẫu (`DEAD_BUTTON_NO_ONCLICK`, `BUTTON_IN_FORM_FILE_NO_TYPE`, `UNPROTECTED_JSON_PARSE_IN_UI`):**
     - 2 thẻ `<button>` lồng bên trong `<div onClick={...}>` tại `ImportExcelModal.tsx` và `MasterDataMindmapView.tsx` không có `onClick` riêng.
     - 44 thẻ `<button>` chuyển tab/bộ lọc nằm trong các tệp có `<form>` thiếu thuộc tính tường minh `type="button"`, dễ gây submit form ngoài ý muốn.
     - Sao chép sâu bằng `JSON.parse(JSON.stringify(...))` trong `InputPlanBreakdownView.tsx` và `PlanWeeklyBreakdown.tsx`, cùng `JSON.parse` chưa bọc `try/catch` riêng trong `ContentView.tsx`.
- **Nguyên nhân gốc (Root Cause):** Các đợt kiểm toán trước tập trung vào `src/components` mà chưa quét ESLint toàn cục vào tầng `src/lib` và `src/app/api`, đồng thời chưa quét tự động thuộc tính `type="button"` trên các thẻ `<button>` nguyên bản.
- **Cách khắc phục:**
  1. Sử dụng `flushRef` trong `usePlanRecord.ts` để gọi đệ quy an toàn khi retry 409 conflict; chuyển việc đồng bộ state trong `useBrandProfiles.ts`, `kocChannelReviewService.ts`, `useMonthlyPlanSync.ts`, `usePlanChat.ts` sang `queueMicrotask` có kiểm tra cờ `cancelled`.
  2. Thay thế toàn bộ 36 vị trí `any` trên 19 tệp API Routes & Services bằng kiểu `unknown` (kèm `instanceof Error` / `RecordError`) hoặc interface cụ thể, đạt **0 lỗi, 0 cảnh báo ESLint** trên toàn bộ 29 tệp `src/app/api` và `src/lib`.
  3. Đổi 2 nút giả lồng trong thẻ có `onClick` sang `<span>`, bổ sung `type="button"` cho toàn bộ 44 nút hành động/bộ lọc, thay `JSON.parse(JSON.stringify(...))` bằng `structuredClone(...)` và bọc `try/catch` quanh `JSON.parse` trong `ContentView.tsx`.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã kiểm chứng lại với `pass4_deep_audit.mjs` (**0 phát hiện lỗi**) và `npx eslint` trên toàn bộ 45 tệp (**0 errors**).

---

### BUG-039 — Kiểm Toán Luồng E2E 22 Nghiệp Vụ Booking B2C (Google Sheet Vòng 2, Bàn Giao Gian Hàng Giữa Tháng, Giải Trình Ký Muộn Mục 3.5, 1 Brief — N KOC & Đồng Bộ Lark 3.2)
- **Ngày phát hiện:** 24/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/app/api/booking-list/pull-sheet/route.ts`, `web-admin/src/components/views/PlanDealBoard.tsx`, `web-admin/src/components/views/ManagerDelegationHub.tsx`, `web-admin/src/lib/dealBoardRules.ts`, `web-admin/src/app/api/deal-board/route.ts`, `web-admin/src/app/api/integrations/larkbase/payment-requests/route.ts`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Lệch tên trường `tab` vs `tabName` khi kéo kết quả Brand duyệt Vòng 2 (`PlanDealBoard.tsx` ↔ `pull-sheet/route.ts`):** `pullStage2FromBrandSheet` trong `PlanDealBoard.tsx` gửi `{ planId, sheetUrl, tabName }`, nhưng `POST /api/booking-list/pull-sheet` chỉ kiểm tra `body.tab` (`!(body.tab || '').trim()`), dẫn đến trả về lỗi 400 `"Thiếu mã kế hoạch, tên tab hoặc link Google Sheet không hợp lệ."`.
  2. **Đối chiếu Job Vòng 2 trên Google Sheet khi `job.briefCode` trống & đồng bộ ngược Link Kịch bản / Demo / Air (`pull-sheet/route.ts`):** Khi Job liên kết qua `job.slotId` nhưng chưa gõ tay `job.briefCode`, `pull-sheet` chưa tra cứu `briefCodeBySlotId.get(job.slotId)`; đồng thời nếu KOC/nhân sự điền `Link kịch bản`, `Link video demo`, `Link Air` trực tiếp trên Sheet thì chưa tự động nạp về `job`.
  3. **Bàn giao gian hàng giữa tháng (`ManagerDelegationHub.tsx`) thiếu `revision` khi gọi `PUT /api/deal-board` và biến cờ `changed` đặt ngoài vòng lặp Deal:** `PUT /api/deal-board` bắt buộc `typeof body.revision === 'number'`, nên lệnh gọi thiếu `revision` từ `ManagerDelegationHub.tsx` bị từ chối 400; đồng thời biến `changed` đặt ngoài `.map(deal => ...)` làm các Deal đã thanh toán (`PAID`) đứng sau Deal chưa thanh toán cũng bị ghi đè `deal.pic`.
  4. **Khớp tự động dòng Brief cho KOC thứ 2 trở đi trong mô hình `1 Brief Content — N KOC` (`PlanDealBoard.tsx`) & tra cứu HĐNT MCN (`deal-board/route.ts`):** `pickBestSlotForKoc` chỉ so sánh `s.kocHandle` đơn lẻ thay vì mảng `slotKocHandles(s)`; `GET /api/deal-board?all=1` chỉ lập chỉ mục `fwById` theo `item.id` mà chưa lập chỉ mục cho danh sách kênh con `item.coveredHandles` của MCN.
  5. **Lệch trường xác nhận của Booking Lead trong Giải trình ký muộn Mục 3.5 (`PlanDealBoard.tsx` ↔ `dealBoardRules.ts`):** Nút `"Lead Booking xác nhận Giải trình"` ghi `leadConfirmed: true, leadConfirmedBy: currentUserName`, nhưng `jobPaymentBlocker` và `dealIssues` lại kiểm tra `confirmedByLead?.trim()`, khiến Job đã được Lead xác nhận giải trình vẫn bị chặn thanh toán.
  6. **Đồng bộ Job (kể cả FOC 0đ) sang Bảng `Lark 3.2 List duyệt book` tại 2 mốc (Chốt Deal/Job & Đã Air/Nghiệm thu):** Trước đó chỉ đẩy sang Lark khi tạo phiếu ĐNTT 6.1 hoặc Tạm ứng, làm các Job FOC 0đ (miễn thanh toán) hoặc Job mới chốt chưa có nút đồng bộ sang Bảng 3.2.
- **Cách khắc phục:**
  1. Hỗ trợ đồng thời `const tab = (body.tab || body.tabName || '').trim()` tại `pull-sheet/route.ts` và gửi cả `tab` + `tabName` từ `PlanDealBoard.tsx`.
  2. Tra cứu fallback `briefCodeBySlotId.get(job.slotId)` và đồng bộ ngược `d.scriptLink`, `d.demoLink`, `d.airLink` từ Google Sheet vào `DealJob` trong `pull-sheet/route.ts`.
  3. Truyền đầy đủ `revision` khi gọi `PUT /api/deal-board` trong `ManagerDelegationHub.tsx` và tách biến `dealChanged` riêng cho từng Deal.
  4. Dùng `slotKocHandles(s).some(h => normHandle(h) === normH)` trong `pickBestSlotForKoc` (`PlanDealBoard.tsx`) và lập chỉ mục `coveredHandles` trong `GET /api/deal-board?all=1` (`deal-board/route.ts`).
  5. Đồng bộ cả 3 trường `leadConfirmed`, `leadConfirmedBy`, `confirmedByLead` khi Lead bấm xác nhận trong `PlanDealBoard.tsx` và kiểm tra hợp nhất trong `jobPaymentBlocker` + `dealIssues` (`dealBoardRules.ts`), đồng thời chặn thanh toán nếu `closingAudit` đang ở trạng thái `RETURNED` (Account/Kế toán trả lỗi nghiệm thu).
  6. Bổ sung chế độ `SYNC_LARK_32_BOOKING_LIST` trong `/api/integrations/larkbase/payment-requests/route.ts` và nút `"Đồng bộ Lark 3.2 List duyệt book (Cả FOC 0đ)"` trên `PlanDealBoard.tsx`.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã rà soát toàn bộ 22 luồng nghiệp vụ E2E từ `ProductCatalogView` → `ContentPlanBoard` → `PlanListingBoard` → `Google Sheets (Vòng 1 & Vòng 2)` → `PlanDealBoard` → `SelfChannelCtvHubView` → `ManagerDelegationHub`.

---

### BUG-040 — Audit E2E Booking: phiên giả lập, duyệt phiếu thanh toán, dữ liệu thụ hưởng giả và tiền tính sai giữa các chặng
- **Ngày phát hiện:** 24/10/2026 (`blueprint/audits/2026-10-24-booking-e2e-flow-audit.md`, nhóm 1–2: S1, S2, S3, S5, P3, P4, D3, D2, D4, C3, P1, P5).
- **Triệu chứng & Nguyên nhân gốc:**
  1. Đăng nhập giả lập mở mặc định trên production; GET không tham số cấp phiên `USERS[0]` (ADMIN); POST nhận `staffOverrides` từ body. Khóa ký phiên rơi về chuỗi cố định khi thiếu `AUTH_SECRET`.
  2. `PATCH /api/integrations/larkbase/payment-requests` không kiểm vai trò, nhận `nextStatus` tùy ý → ai đăng nhập cũng đặt được `PAID`.
  3. Webhook `/api/integrations/larkbase/booking-plans` nhận khi thiếu header secret, mọi phiên (kể cả đối tác) ghi được kế hoạch `APPROVED`; thiếu trạng thái thì mặc định "Đã duyệt".
  4. Thiếu thông tin thụ hưởng thì tự điền STK/CCCD mẫu (`19036829104018`, `001099012345`); nút "Điền nhanh hồ sơ mẫu chuẩn" bịa link air, HĐ, BBNT, hóa đơn, STK.
  5. Lark lỗi/chưa cấu hình vẫn trả 201 "đã đồng bộ" kèm mã instance giả; đồng bộ Bảng 3.2 sinh `larkRecordId` giả.
  6. Deal sinh từ plan bị nhân đôi mỗi lần đồng bộ (lọc `planjob-` nhưng id là `PJ-…`).
  7. Tổng chi Pipeline cộng `totalValue` (còn gồm phần DROPPED) mà không trừ `droppedCostVnd`.
  8. Công ty: `totalValue` đã gồm VAT rồi bước tính thuế cộng VAT lần nữa (10% ở prefill HĐ, 8% ở phiếu Lark).
  9. Tất toán không trừ tạm ứng, lập phiếu lặp được; phiếu tạm ứng chỉ đề nghị 50% số đã nhập; phiếu gom nhiều KOC chuyển hết vào STK của KOC đầu và dùng link air của Job đầu cho mọi Job.
- **Cách khắc phục:**
  1. `isSandboxLoginAllowed()` (`larkAuth.ts`): mở mặc định trên mọi môi trường để phục vụ kiểm thử/vận hành giả lập vai trò, chỉ chặn khi đặt rõ `BLOCK_SANDBOX_LOGIN=true`; hỗ trợ bộ chọn chuyển nhanh tài khoản giả lập trên `TopHeader.tsx` và trang `/login`.
  2. PATCH chỉ tiến đúng 1 bước theo `APPROVER_ROLES_BY_STATUS` (Leader → Giám đốc → Kế toán), chặn đối tác, bỏ `nextStatus`.
  3. Webhook chỉ nhận khi đúng `ANYCROSS_WEBHOOK_SECRET` hoặc người có quyền đồng bộ kế hoạch; webhook thiếu trạng thái không coi là đã duyệt.
  4. `resolveJobPayee` (`PlanDealBoard.tsx`) báo thiếu thay vì điền mẫu; gỡ nút điền nhanh trong `LarkPaymentRequestModal.tsx`.
  5. Production thiếu cấu hình → 503; Lark từ chối → 502, không lưu phiếu; dev trả `simulated: true` và thông báo "CHƯA gửi lên Lark". Đồng bộ 3.2 không sinh mã giả, production trả 501.
  6. `page.tsx` bỏ bản cũ `PJ-`/`PD-` và trùng id trước khi nạp bản mới.
  7. `bookingDealCost()` (`planDealLink.ts`) dùng cho tổng chi ở `BookingView.tsx` và `monthlyProfileMetrics.ts`.
  8. `totalValue` = giá chưa VAT + DROPPED; thêm `BookingDealItem.vatRatePercent`, engine và prefill HĐ dùng đúng % VAT của Job.
  9. Sổ phiếu theo mã đơn trên máy chủ (`paymentLedgerByDealCode`) trừ tạm ứng khi tất toán, chặn lập trùng (`SETTLEMENT_ALREADY_REQUESTED`, `ADVANCE_ALREADY_REQUESTED`); chặn phiếu nhiều người thụ hưởng (`MIXED_PAYEES`); gom phiếu chỉ cho cùng KOC, link air theo từng Job; màn 3.2 ghi số đã thanh toán theo dòng.
- **Còn lại / giới hạn:** sổ phiếu vẫn nằm trong bộ nhớ máy chủ (mất khi khởi động lại) — cần lưu bền; trạng thái duyệt chưa đọc ngược từ Lark; link HĐ/BBNT tự dựng (P2) và các mục mức Cao còn lại trong báo cáo audit chưa sửa.
- **Phạm vi rà soát mở rộng sang phần khác:** đã tìm mọi chỗ tự điền STK/CCCD mẫu (3 hàm đẩy phiếu ở `PlanDealBoard.tsx` và modal), mọi chỗ cộng `totalValue` vào ngân sách, và các nơi lọc deal theo tiền tố id.

---

### BUG-041 — Chuẩn Hóa Bộ 17 Mẫu Hợp Đồng / Phụ Lục SOW / Biên Bản Nghiệm Thu Mới, Kế Thừa 3 Chặng (`HĐNT → SOW → BBNT`) & Chốt Chặn Thẩm Định Pháp Chế Tuần Tự
- **Ngày phát hiện:** 24/10/2026 (`blueprint/audits/2026-10-24-booking-e2e-flow-audit.md`, nhóm Hợp đồng & Pháp chế: `C1`, `C2` + yêu cầu nâng cấp bộ 17 mẫu `.docx` mới trong `Quản lý hợp đồng/`).
- **Phân hệ / File liên quan:** `web-admin/src/lib/contracts/types.ts`, `web-admin/src/lib/contracts/templates.ts`, `web-admin/src/lib/contracts/builtInTemplatesSnapshot.ts`, `web-admin/src/lib/contracts/domain.ts`, `web-admin/src/app/api/contracts/route.ts`, `web-admin/src/app/api/contracts/templates/[id]/route.ts`, `web-admin/src/components/contracts/contractUi.ts`, `web-admin/src/components/contracts/ContractForm.tsx`, `web-admin/src/components/contracts/ContractDetail.tsx`, `web-admin/src/components/views/ContractManagementView.tsx`, `web-admin/src/components/contracts/browserDemo.ts`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Một số trường trong bộ 17 mẫu `.docx` mới chưa được nhận diện đầy đủ (`templates.ts`):**
     - Các dòng thông tin tài khoản ngân hàng độc lập (`Tên chủ tài khoản:`, `Số tài khoản:`, `Tại Ngân hàng:`, `Ngân hàng:`) trong `*-HDNT` và `*-LIVE-HD` có `end === start` (cuối dòng sau dấu `:`), chưa được trích xuất thành trường điền và khi điền vào file Word dễ bị dính liền sau dấu `:`.
     - Các mã số hợp đồng/phụ lục/BBNT không bọc ngoặc vuông (`Số: ddmmyy/HĐNT/UPB - ID KOC`, `Số: 01/SOW/UPB - BRAND - ID KOC`, `Kèm theo Hợp đồng nguyên tắc số: ddmmyy/HĐNT...`, `Căn cứ Phụ lục số: 01/SOW...`) cần phân biệt rõ `token:[dd.mm.yy]` (ngày của chính văn bản) với `token:[Ngày HĐNT]` và `token:[Ngày SOW]` (ngày văn bản gốc tham chiếu).
     - Các dòng tổng kết tài chính và quyết toán trong bảng SOW & BBNT (`Tổng giá trị...`, `Thuế TNCN`, `Thuế VAT`, `Giá trị đã tạm ứng`, `Chi phí phát sinh`, `Giá trị Bên A còn phải thanh toán`) chưa được gán `FieldSource` riêng (`grossTotal`, `pitAmount`, `vatAmount`, `advanceAmount`, `adjustmentAmount`, `remainingAmount`).
  2. **Kế thừa 3 chặng `HĐNT → Phụ lục SOW → BBNT` trên giao diện bị thiếu `parentFields` (`contractUi.ts`):** `GET /api/contracts` trả về danh mục mẫu rút gọn (`fields: []` để giảm dung lượng), khiến `parentFields` truyền vào `prefill()` trên trình duyệt bị rỗng, không tự động lấy được thông tin Bên B / Ngân hàng từ `HĐNT` sang `SOW` và từ `HĐNT + SOW` sang `BBNT`.
  3. **Báo sai `"Vượt Booking"` trên màn chi tiết hợp đồng (`ContractDetail.tsx`):** `parsedContractValue` từng lấy `Math.max(...)` trên tất cả các ô tiền (bao gồm cả `grossTotal` đã cộng 10% TNCN hoặc 10% VAT) rồi so sánh với `linkedDeal.totalValue` (giá trị trước thuế), làm hợp đồng khớp 100% vẫn báo đỏ `"Vượt Booking"`; đồng thời truyền `totalValue === actualSettledValue` vào `evaluateContractRules` làm mất cảnh báo chênh lệch nghiệm thu (`BR-04`).
  4. **Lỗ hổng bỏ qua bước Pháp chế (`C1`, `C2`) và duyệt song song (`domain.ts`, `route.ts`, `templates/[id]/route.ts`):** Máy chủ từng cho phép client gửi `requireLegal: false` ngay cả khi dùng form riêng của KOC (`isKocOwnForm`), có sửa điều khoản (`hasCustomTerms`) hoặc mẫu không thuộc diện miễn duyệt (`exemptLegalReview === false`); đồng thời Kế toán (`FINANCE`) có thể bấm duyệt trước khi Pháp chế (`LEGAL`) hoàn tất thẩm định.
- **Cách khắc phục:**
  1. Nâng cấp `extractFields` & `describeFields` trong `templates.ts` và tái tạo `builtInTemplatesSnapshot.ts` cho toàn bộ 25 mẫu (17 mẫu mới + 8 mẫu kế thừa), bổ sung đầy đủ 15 `FieldSource` mới (`brand`, `channelLink`, `bankAccountName`, `bankAccountNumber`, `bankName`, `airDate`, `parentContractDate`, `parentSowDate`, `grossTotal`, `vatAmount`, `pitAmount`, `advanceAmount`, `adjustmentAmount`, `remainingAmount`, `amountInWords`) và tự động chèn khoảng trắng sau dấu `:` khi thay thế trường độ dài 0.
  2. Nâng cấp `prefill()`, `templateFor()`, `inferAcceptanceTemplateId()` trong `contractUi.ts`: tự động tra cứu `OFFICIAL_TEMPLATES_SNAPSHOT` khi `parentFields` rỗng, kế thừa xuyên suốt 3 chặng (`HĐNT → SOW → BBNT` cho Video, `LIVE-HD → LIVE-BBNT` cho Livestream, `CTV-HDNT → CTV-BBNT` cho CTV tháng) và bổ sung nút **"Tạo phụ lục SOW"** trực tiếp từ màn chi tiết `HĐNT`.
  3. Trong `ContractDetail.tsx`: tách bạch `baseContractValue` (`netTotal` / `lineTotal`) và `grossContractValue` (`grossTotal`), đối soát `baseContractValue` với `linkedDeal.totalValue` và truyền đúng `actualSettledValue` cho `evaluateContractRules` (`BR-04`).
  4. Chốt chặn bảo mật tại `route.ts`, `templates/[id]/route.ts` và `domain.ts`: bắt buộc có `LEGAL` khi `isKocOwnForm || hasCustomTerms || !template.exemptLegalReview`, bắt buộc thứ tự duyệt tuần tự (`LEGAL` phải `APPROVED` trước khi `FINANCE` được duyệt), kiểm tra hồ sơ cha của `-SOW` phải là `-HDNT` cùng KOC, và chỉ `LEGAL`/`LEAD` mới được bật cờ `exemptLegalReview`.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã kiểm thử tự động toàn bộ 25 mẫu hợp đồng/phụ lục/nghiệm thu (`87/87` unit & integration tests pass) và đồng bộ trình giả lập `browserDemo.ts`.

---

### BUG-042 — Khắc Phục Toàn Diện Nhóm 3–5 Audit E2E Booking (Chốt Chặn Máy Chủ Listing/Deal-Board, Định Danh Mã Nhân Sự, Khử Dữ Liệu Giả UpAffiliate/BBNT & Mở Rộng 12 Công Cụ Tiện Ích Nghiệp Vụ)
- **Ngày phát hiện:** 24/10/2026 (`blueprint/audits/2026-10-24-booking-e2e-flow-audit.md`, nhóm 3–5: `L1`–`L6`, `D1`, `D5`, `D6`, `S4`, `S6`, `S7`, `P2` + nâng cấp `WorkToolkitHubView`).
- **Phân hệ / File liên quan:** `web-admin/src/lib/listingBoardRules.ts`, `web-admin/src/components/views/PlanListingBoard.tsx`, `web-admin/src/app/api/listing-board/route.ts`, `web-admin/src/app/api/booking-list/pull-sheet/route.ts`, `web-admin/src/app/api/deal-board/route.ts`, `web-admin/src/components/views/PlanDealBoard.tsx`, `web-admin/src/lib/server/accessPolicy.ts`, `web-admin/src/lib/larkAuth.ts`, `web-admin/src/lib/approvedBookingList.ts`, `web-admin/src/lib/larkPaymentRequestEngine.ts`, `web-admin/src/app/api/integrations/larkbase/payment-requests/route.ts`, `web-admin/src/app/api/koc-framework/route.ts`, `web-admin/src/lib/storeAirPlanData.ts`, `web-admin/src/lib/planDealLink.ts`, `web-admin/src/lib/workToolkitRules.ts`, `web-admin/src/components/views/WorkToolkitHubView.tsx`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Listing (`L1`–`L6`):**
     - KOC trả phí ở cột `DRAFT` / `WAIT_BRAND` bấm được `"Chốt thẳng"` sang `CONFIRMED` mà không qua Brand duyệt; khôi phục từ `DROPPED` sang `NEGOTIATING` tự gán `BRAND_APPROVED` dù Brand chưa duyệt (`L2`).
     - Sửa tăng `proposedFee`/`finalFee` ở cột `NEGOTIATING`/`CONFIRMED` không tự động đưa về `WAIT_BRAND` để trình lại Brand theo Bước 17/19 (`L3`, `L1`).
     - Khi trình lại Brand (`WAIT_BRAND`), `lastSheetDecision` không được xóa khiến lần đọc Sheet tiếp theo bị kẹt ở giá trị cũ (`L5`).
     - `parseFeeCell("5tr + 10% hoa hồng")` trong `pull-sheet/route.ts` nối mọi chữ số thành `510`đ và ghi đè giá của cả KOC đã `CONFIRMED` (`L4`), đồng thời gỡ KOC đã `CONFIRMED` khỏi ô kế hoạch content (`L6`).
  2. **Deal / Job & Bảo mật máy chủ (`S4`, `S6`, `D1`, `D5`, `D6`):**
     - `PUT /api/deal-board` chưa chặn sửa đơn giá / mã phụ lục sau khi Job đã lập đề nghị thanh toán (`D5`), chưa kiểm tra vai trò máy chủ khi đặt `legalReviewStatus = 'APPROVED'`, `financeReviewStatus = 'APPROVED'`, `payment.status = 'PAID'`, `leadConfirmed` (`S6`), và giữ nguyên xác nhận nghiệm thu cũ khi đổi `airLink`.
     - Nút `"Đồng bộ UpAffiliate"` trong `PlanDealBoard.tsx` tự sinh số liệu giả (`18500` views, `GMV = phí × 2.8`) khi KOC chưa có dữ liệu thực (`D6`, vi phạm `RULE-DATA-01`).
     - `POST /api/integrations/larkbase/payment-requests` chưa đối chiếu phạm vi thương hiệu (`assignedBrands` / `bookingPic`) của chuyên viên lập phiếu (`S4`), và `GET` trả đầy đủ STK/CCCD của mọi phiếu cho nhân sự không liên quan.
  3. **Định danh nhân sự trùng tên (`S7`) & Gán nhầm Leader gian `"Mine"`:**
     - `userWithPolicy` (`accessPolicy.ts`) gọi `.find(s => s.id === user.id || ... || sameName(s.name))` khiến nhân sự trùng tên đứng trước trong danh bạ (ví dụ `Bùi Phương Linh` `HN374` bị khóa) ghi đè lên nhân sự `HN509` đang hoạt động; `matchPersonName` (`larkAuth.ts`) dùng `.includes()` dễ khớp nhầm tên con.
     - `resolveStoreBookingLeader` và `resolveBookingLeader` dùng `.includes('mine')` làm các gian `Jasmine`, `Mineral` và `Mine_Shopee_E2E-C` bị gán nhầm Trưởng nhóm `Nguyễn Thị Ngọc Tâm`.
  4. **Dữ liệu tự sinh ở Nghiệm thu / Thanh toán (`P2`) & Cộng trùng đơn hàng 14d+30d:**
     - `approvedBookingList.ts` tự gán `contractAppendixStatus = 'ĐÃ_KÝ'` khi có `actualAirDate` và tự sinh link `https://drive.google.com/drive/folders/upbase-pl-...`; `larkPaymentRequestEngine.ts` mặc định `adsCodeStatus = 'ĐÃ_NGHIỆM_THU'` kể cả khi chưa có mã Spark Ads.
     - `storeAirPlanData.ts` cộng dồn `orders14d + orders30d` và `views14d + views30d` làm nhân đôi chỉ số thực tế.
- **Cách khắc phục:**
  1. Chốt chặn tại `listingBoardRules.ts`, `PlanListingBoard.tsx`, `listing-board/route.ts` và `pull-sheet/route.ts`: chỉ cho `"Chốt thẳng"` với KOC FOC 0đ hoặc KOL do Brand chỉ định; tự động đưa về `WAIT_BRAND` và xóa `lastSheetDecision` khi tăng giá sau duyệt; nâng cấp `parseFeeCell` tách phần tiền đầu tiên (`5tr`, `500k`) và bảo vệ KOC đã `CONFIRMED` khi kéo Sheet.
  2. Bổ sung kiểm tra RBAC và bất biến tài chính trong `PUT /api/deal-board` (`S6`, `D1`, `D5`), xóa xác nhận nghiệm thu cũ khi đổi `airLink`, loại bỏ hoàn toàn số liệu giả trong `syncJobPerformanceFromUpaffiliate` (`D6`), kiểm tra phạm vi thương hiệu và che một phần STK/CCCD trên `/api/integrations/larkbase/payment-requests` & `/api/koc-framework` (`S4`).
  3. Trong `userWithPolicy` (`accessPolicy.ts`): tách bước tìm theo `id`/`staffCode`/`email` trước, chỉ fallback theo tên khi không có mã nhân sự/email; dùng khớp tên đầy đủ trong `matchPersonName` (`larkAuth.ts`); dùng biểu thức chính quy ranh giới từ `\bmine\b` và loại trừ các gian Shopee ngoài ClubClio trong `resolveStoreBookingLeader` / `resolveBookingLeader`.
  4. Xóa bỏ tự suy diễn `ĐÃ_KÝ` từ ngày Air và link Drive giả trong `approvedBookingList.ts` / `larkPaymentRequestEngine.ts` (`P2`); sửa `storeAirPlanData.ts` dùng `Math.max` giữa 14d và 30d; ưu tiên hồ sơ đã ký (`recordSigned`) trong `documentsOfJob` (`planDealLink.ts`).
  5. Mở rộng `WorkToolkitHubView.tsx` & `workToolkitRules.ts` lên **12 công cụ tiện ích nghiệp vụ** (bổ sung bảng tính thuế & đối chiếu Ratecard hàng loạt, công cụ 11 **Tính điểm Tải công việc & Thưởng P3 theo Hệ số Gian hàng**, công cụ 12 **Tra cứu Mốc hạn SLA Booking & Khóa sổ từ Ngày Air**).
- **Phạm vi rà soát mở rộng sang phần khác:** Đã bổ sung bộ kiểm thử hồi quy `tests/booking-e2e-audit-group3.test.ts` (`91/91` tests pass), đạt `0 errors` ESLint và `0 errors` TypeScript.

---

### BUG-043 — Công Cụ Cắt Khung Hình KOC Cầm Sản Phẩm Từ Link Air (`video-frame`) Dò Sai Từ Khóa Tiếng Việt Có Dấu & Bỏ Sót Đoạn Cận Cảnh Cầm Sản Phẩm Ở Giữa/Cuối Video
- **Ngày phát hiện:** 24/10/2026 (Khi kiểm thử trực tiếp trên Link Air thực tế `BO260859267` — `https://www.tiktok.com/@soanhtran98/video/7594065944612179221`).
- **Phân hệ / File liên quan:** `web-admin/src/lib/tiktokVideoInspector.ts`, `web-admin/src/app/api/integrations/tiktok-koc/video-frame/route.ts`, `web-admin/src/components/contracts/VideoProductScreenshotModal.tsx`, `web-admin/src/components/contracts/ContractForm.tsx`, `web-admin/src/components/contracts/ContractDocumentViewer.tsx`, `web-admin/src/lib/contracts/templates.ts`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Cắt đứt từ tiếng Việt có dấu và nhận nhầm từ phổ thông làm tên riêng thương hiệu (`detectProductMentionMoments` trong `tiktokVideoInspector.ts`):**
     - Biểu thức chính quy `\b[A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*){1,2}\b` chỉ khớp ký tự ASCII nên cắt đứt từ tiếng Việt ngay trước nguyên âm có dấu (ví dụ `"Dung Dịch"` bị cắt thành `"Dung D"`).
     - Điều kiện `tok.toLowerCase() === foldedTok && /^[A-Z]/.test(tok)` nhận nhầm các âm tiết không dấu viết hoa đầu từ trong tiêu đề giỏ hàng (`"Dung"`, `"Sinh"`, `"Ngay"`) làm tên riêng thương hiệu ưu tiên 1. Khi quy về chữ không dấu (`foldForMatch`), `"Dung"` khớp nhầm với mọi câu KOC nói chữ `"dùng"` (`"em dùng"`, `"dùng cả 2 chai"`) và `"Sinh"` khớp nhầm với `"vệ sinh sạch sẽ"` ở giây `28.1s` (lúc KOC còn đang diễn tiểu phẩm, chưa cầm sản phẩm).
     - Trường `productName` có dấu hoặc viết tắt nghiệp vụ (`"HLC + Vỏ sồi"`) chưa được tách cụm từ và giải nghĩa viết tắt (`HLC` → `hoa lan chuông`, `DDVS` → `dung dịch vệ sinh`) để đưa vào danh sách từ khóa ưu tiên 1.
  2. **Dồn toàn bộ 6 khung hình vào đầu video, bỏ sót đoạn KOC cầm sản phẩm ở nửa sau (`buildSuggestedMoments` trong `video-frame/route.ts` & `VideoProductScreenshotModal.tsx`):**
     - Với các video Storytelling/Skit dài 60s–95s, nửa đầu video KOC mới nhắc tên sản phẩm trong thoại tình huống (`00:36`, `00:44`), còn từ `00:59–01:12` mới giơ sản phẩm lên trước ống kính và test chất (`"ly cũng đang dùng chai dung dịch vệ sinh..."`, `"nên xài em vỏ sồi"`, `"xài em HOA LAN chuông"`).
     - Hàm `buildSuggestedMoments` trước đó nhân đôi mỗi mốc từ đầu mảng rồi cắt cứng `.slice(0, 8)` theo thứ tự thời gian, làm các mốc cầm sản phẩm thực tế ở `60.5s`, `63.4s`, `67.5s`, `70.2s` bị đẩy ra ngoài.
- **Cách khắc phục:**
  1. Trong `tiktokVideoInspector.ts`: Tách từ theo khoảng trắng/dấu câu trước khi ghép cụm tên riêng Latin thuần ASCII (`isPureLatinProperToken`); bổ sung các âm tiết phổ thông (`dung`, `dich`, `sinh`, `ngay`, `thom`, `mat`...) vào `GENERIC_TITLE_STOPWORDS`; tách trực tiếp các vế của `productName` kèm bảng viết tắt `PRODUCT_SHORTHAND_EXPANSIONS` (`HLC` → `hoa lan chuông`, `DDVS` → `dung dịch vệ sinh`, `KCN` → `kem chống nắng`, `SRM` → `sữa rửa mặt`) và bắt buộc khớp theo ranh giới từ (` ${cand.folded} `).
  2. Trong `video-frame/route.ts`:
     - Chuyển sang truy vấn song song (`Promise.allSettled`) cả 3 nguồn (`oEmbed`, `SSR WAF`, `TikWM`) kèm bộ nhớ đệm metadata 10 phút và ưu tiên luồng `H.264` trước `ByteVC1/HEVC`, giảm thời gian phân tích từ ~9–12s xuống ~1.5s (3ms khi ấm cache).
     - Bóc tách đồng thời bộ dữ liệu nghiệm thu toàn diện (`inspectionMeta: VideoAcceptanceInspectionMeta`): thông tin bài đăng (`@authorHandle`, ngày đăng, thời lượng, giỏ hàng TikTok Shop), chỉ số tương tác thực tế (`viewsCount`, `likesCount`, `commentsCount`, `sharesCount`, `savesCount`, `engagementRate`), và đối soát kịch bản/phụ đề với từ khóa sản phẩm cùng danh mục từ hạn chế sàn (`scanBlacklistViolations`, `scriptVerdict`).
     - Phân hạng 3 mức ưu tiên cho mốc phụ đề: `HOLDING_SHOWCASE` (cầm SP trên tay: `đang dùng`, `xài em`, `chai này`, `em này`, `2 chai`, `trên tay`, `cầm` — 96đ) > `TEXTURE_DEMO` (test chất: `bôi`, `thoa`, `test`, `tạo bọt` — 88đ) > `VERBAL_MENTION` (nhắc tên — 76đ), cắt tại `startSec + 1.0s` và `endSec + 1.5s`.
     - Bổ sung nhánh cắt khung hình trực tiếp trên máy chủ qua `ffmpeg` (`GET /api/integrations/tiktok-koc/video-frame?streamToken=...&captureSec=...`, có cache theo giây) để cắt ảnh thực tế ngay cả khi trình duyệt không giải mã được codec video.
  3. Trong `VideoProductScreenshotModal.tsx`, `ContractForm.tsx`, `ContractDocumentViewer.tsx` & `templates.ts`:
     - Hiển thị bảng đối soát 3 cột (**1. Thông tin bài đăng**, **2. Chỉ số tương tác tại thời điểm nghiệm thu**, **3. Đối soát kịch bản & Từ khóa**) ngay trên trình cắt khung hình; hỗ trợ cắt 8 khung hình song song, chấm điểm độ nét biên (`analyzeCanvasFrameQuality`), nút **Tự chọn 2 ảnh rõ nhất**, **Quét ±2s**, **Zoom cận cảnh 1.25x** và **Tải ảnh `.JPG`**.
     - Khi bấm **Lưu & Chèn vào BBNT**, tự động điền thông tin Link Air (`airDate`, `channelLink`, `product`, `Link video`) vào biểu mẫu BBNT và chèn cả bảng **Thông tin Link Air, Chỉ số tương tác & Đối soát kịch bản** lẫn ảnh KOC cầm sản phẩm vào bản xem trước/in A4 (`ContractDocumentViewer.tsx`) và file Word `.docx` xuất ra (`embedAcceptanceScreenshotsIntoDocxZip` trong `templates.ts`).
- **Phạm vi rà soát mở rộng sang phần khác:** Đã kiểm thử thực tế trên luồng MP4 của Link Air `BO260859267`, kiểm tra ESLint, `tsc --noEmit` và `npm run build` đạt 0 lỗi.

---

### BUG-044 — Luồng Nghiệm Thu Chưa Dựng Bản Nháp BBNT Theo Phụ Lục SOW Của Từng Job (Gồm Video Chính + Các Dịch Vụ Đi Kèm) Để Nhân Sự Kiểm Tra Trước Khi Chốt
- **Ngày phát hiện:** 24/10/2026 (Yêu cầu nghiệp vụ: *"phần luồng làm biên bản nghiệm thu cũng cần đưa ra nháp để ng dùng check nhé, nghiệm thu ăn theo phụ lục nên nó theo job, bao gồm video và dịch vụ đi kèm"*).
- **Phân hệ / File liên quan:** `web-admin/src/components/contracts/contractUi.ts`, `web-admin/src/components/contracts/ContractForm.tsx`, `web-admin/src/components/contracts/DraftBbntPreviewModal.tsx`, `web-admin/src/components/views/PlanDealBoard.tsx`, `web-admin/src/components/views/ApprovedBookingListView.tsx`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Chọn nhầm mẫu BBNT cũ và gộp tổng tiền vào dòng Video (`contractUi.ts`):**
     - `templateFor()` khi `kind === 'ACCEPTANCE'` từng mặc định trả về `${subjectKind}-BBNT` (`IND-BBNT`, `HKD-BBNT`, `COM-BBNT` — mẫu cũ theo hợp đồng lẻ) thay vì bộ mẫu BBNT Ver052026 gắn theo Phụ lục SOW (`IND-VID-BBNT`, `HKD-VID-BBNT`, `COM-VID-BBNT`).
     - Trong `prefill()`, `f.source === 'lineTotal'` được điền bằng `totalAmount` (tổng giá trị cả Job) cho cả ô `group === 'SCOPE'` (Hạng mục 1: Sản xuất & đăng tải Video review), còn các ô Hạng mục 2 (`Cấp mã code để chạy quảng cáo video trong vòng · Thành tiền`) và Hạng mục 3 (`Sử dụng hình ảnh và video trong · Thành tiền`) bị bỏ trống, khiến BBNT không bóc tách riêng tiền Video chính và tiền các Dịch vụ đi kèm theo Phụ lục SOW.
  2. **Thiếu bước xem và kiểm tra Bản nháp BBNT theo từng Job ngay tại màn Nghiệm thu (`PlanDealBoard.tsx`, `ApprovedBookingListView.tsx`, `ContractForm.tsx`):**
     - Nhân sự bấm nghiệm thu trên từng Job ở `PlanDealBoard.tsx` hoặc hộp thoại Nghiệm thu 2 bước ở `ApprovedBookingListView.tsx` chỉ thấy các nút trạng thái rời rạc, chưa có hộp thoại **Xem & Kiểm tra Bản nháp BBNT chuẩn A4** kế thừa từ Phụ lục SOW của Job đó để đối soát từng hạng mục (1 Video chính + các Dịch vụ đi kèm, khấu trừ hủy dịch vụ, thuế TNCN/VAT, tạm ứng, số tiền còn thanh toán, thông tin Link Air và ảnh KOC cầm sản phẩm) trước khi xác nhận lưu BBNT.
- **Cách khắc phục:**
  1. Trong `contractUi.ts`:
     - Cập nhật `templateFor()` chọn `${subjectKind}-VID-BBNT` cho luồng `ACCEPTANCE` của Job Video gắn Phụ lục SOW.
     - Bổ sung `buildJobAcceptanceBreakdown()` và `syncValuesFromJobAcceptanceBreakdown()` để bóc tách rõ **Hạng mục 1 (Video chính)** (`videoItem.feeNetVnd`, `airLink`, `airDate`) và **Hạng mục 2..N (Dịch vụ đi kèm theo Phụ lục SOW)** (`ADS_CODE`, `IMAGE_USAGE`, `EXCLUSIVITY`, `CROSS_POST_REUP`, `LINK_BIO_CART`) kèm trạng thái nghiệm thu (`VERIFIED` / `PENDING` / `DROPPED`), tự động tính lại tổng Net (`activeTotalNetVnd = Video + Dịch vụ đi kèm hoàn thành`), khấu trừ hủy dịch vụ (`droppedAddonsCostVnd`), thuế TNCN 10% / VAT 8–10% và số tiền còn phải thanh toán.
     - Tách riêng `f.source === 'lineTotal'` theo `f.group === 'SCOPE'` (`videoLineAmount`) và `f.group === 'MONEY'` (`totalAmount`) để bảng nghiệm thu trên `IND-VID-BBNT`, `HKD-VID-BBNT`, `COM-VID-BBNT` hiển thị chính xác thành tiền từng dòng.
  2. Tạo mới `DraftBbntPreviewModal.tsx` và tích hợp vào `PlanDealBoard.tsx` (khu vực 2 Tài liệu pháp lý & khu vực 4 Air và Nghiệm thu Job), `ApprovedBookingListView.tsx` (hộp thoại Nghiệm thu 2 bước & cột thao tác dòng Deal) và `ContractForm.tsx`:
     - Cho phép nhân viên kiểm tra, chỉnh sửa trực tiếp đơn giá/trạng thái từng hạng mục (Video chính + Dịch vụ đi kèm), mở công cụ lấy thông tin Link Air & cắt ảnh sản phẩm, xem trực tiếp trên **Bản nháp BBNT A4 (`ContractDocumentViewer`)** và bấm **Xác nhận & Lưu Bản nháp BBNT** hoặc chuyển sang trình soạn thảo chi tiết.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã kiểm tra đồng bộ giữa `PlanDealBoard`, `ApprovedBookingListView` và `ContractForm`, vượt qua `tsc --noEmit`, `eslint` và `npm run build` với `0 errors`.

---

### BUG-045 — Cụm Điều Hướng Gian Hàng & Phiên Bản (`PageHeaderNav`) Bị Bóp Nghẹt Thành Cột Dọc 20px Trên Thanh `TopHeader`, Vòng Lặp `"Đang lưu..."` Khi Mở Kế Hoạch Tháng & Dữ Liệu Cũ Hiển Thị Chuyên Viên Làm Leader
- **Ngày phát hiện:** 24/10/2026 (Người dùng gửi ảnh chụp màn hình thực tế tại `b2c-theta.vercel.app` trên màn hình **Kế hoạch tháng**).
- **Phân hệ / File liên quan:** `web-admin/src/components/TopHeader.tsx`, `web-admin/src/components/ui/blocks.tsx`, `web-admin/src/components/views/InputPlanBreakdownView.tsx`, `web-admin/src/components/views/PlanApprovalStepper.tsx`, `web-admin/src/lib/useMonthlyPlanSync.ts`, `web-admin/src/lib/server/monthlyPlanStore.ts`, `web-admin/src/lib/monthlyPlanData.ts`, `web-admin/src/lib/types.ts`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Cụm `PageHeaderNav` bị ép thành khe hẹp 20px và xếp chồng dọc bị cắt chữ trên `TopHeader`:**
     - Trên `TopHeader.tsx`, Khối 3 (chứa `Segmented` groupTabs và `<PageHeaderNavSlot />`) đặt `sm:w-auto sm:flex-1 overflow-x-auto` (`flex-basis: 0%`, `min-width: 0`), trong khi Khối 1 (`Kế hoạch tháng`) và Khối 2 (Huy hiệu `Toàn hệ thống (69 gian hàng)` + `PageActionsSlot` 5 nút + Bộ chọn `Vai trò: ...` + Nút đăng xuất) chiếm gần hết chiều ngang (~1000px).
     - Do Khối 3 có `flex-basis: 0%`, Flexbox không ngắt Khối 2 xuống dòng mà ép Khối 3 co lại còn ~20px chiều ngang. Bên trong Khối 3, `PageHeaderNavSlot` (`blocks.tsx`) và thẻ `<div className="flex items-center gap-2 min-w-0 flex-wrap">` (`InputPlanBreakdownView.tsx`) lại bật `flex-wrap`, khiến các nút `< Danh sách`, ô `<select>` chọn gian hàng và nút phiên bản `v1.0` bị rớt thành 4 tầng dọc bên trong khe 20px và bị `overflow-x-auto` cắt mất chữ.
  2. **Huy hiệu `Đang lưu...` quay liên tục ngay khi mở màn hình Kế hoạch tháng (`useMonthlyPlanSync.ts` & `InputPlanBreakdownView.tsx`):**
     - `useMonthlyPlanSync` gọi `rememberStored(stored)` trên dữ liệu thô vừa tải từ `/api/monthly-plans`, sau đó callback `onLoaded` trong `InputPlanBreakdownView.tsx` lại gọi `enrichPlanWithVersions(p, idx)` tạo đối tượng mới có thêm `versionSnapshots` và `items` chuẩn hóa rồi mới `setMonthlyPlans(enriched)`. Vì chuỗi JSON sau khi làm giàu khác với chuỗi đã lưu trong `lastSavedRef.current`, cả 69 kế hoạch bị đánh dấu `dirty` ngay lập tức và kích hoạt hàng loạt lệnh `PUT /api/monthly-plans/[id]`.
  3. **Hiển thị `Leader: Lê Thanh Hải` trên gian hàng `4PM_TikTok_E2E-S` từ bản ghi DB cũ:**
     - Bản ghi kế hoạch lưu trong DB từ đợt seed cũ còn giữ `bookingLeader: 'Lê Thanh Hải'` (trong khi theo `GEMINI.md` Mục 3, `Lê Thanh Hải` là Chuyên viên và chỉ `Nguyễn Thị Ngọc Tâm` là Trưởng nhóm của 8 gian hàng).
- **Cách khắc phục:**
  1. Trong `TopHeader.tsx`, `blocks.tsx` và `InputPlanBreakdownView.tsx`:
     - Bỏ `sm:flex-1` (`flex-basis: 0%`) trên Khối 3 của `TopHeader.tsx`, chuyển sang `sm:w-auto shrink-0 max-w-full` và đặt `ml-auto` cho Khối 2 để Khối 3 luôn giữ nguyên kích thước tự nhiên của các nút điều hướng, không bao giờ bị ép nhỏ.
     - Bỏ `flex-wrap min-w-0` trên `PageHeaderNavSlot` (`blocks.tsx`) và thẻ `<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">` trong `<PageHeaderNav>` (`InputPlanBreakdownView.tsx`).
     - Thu gọn huy hiệu phạm vi toàn cục `Toàn hệ thống (69 gian hàng)` sang `hidden 2xl:flex` để nhường diện tích ngang trên màn hình laptop (vì bộ chọn vai trò kế bên đã hiển thị rõ tên & chức danh).
  2. Trong `useMonthlyPlanSync.ts` và `InputPlanBreakdownView.tsx`:
     - Cho phép `onLoaded` trả về danh sách `enriched` đã chuẩn hóa và gọi `rememberStored` trên chính bản `enriched` đó trước khi bật `readyRef.current = true`, triệt tiêu hoàn toàn hiện tượng tự báo `dirty` và gọi `PUT` hàng loạt khi vừa mở trang.
  3. Trong `monthlyPlanStore.ts`, `monthlyPlanData.ts`, `InputPlanBreakdownView.tsx` và `PlanApprovalStepper.tsx`:
     - Chuẩn hóa `bookingLeader` và `hasBookingLeader` qua `resolveStoreBookingLeader(storeName || brandName, bookingLeader)` ngay khi đọc từ DB (`toStored`) và khi hiển thị, đảm bảo chỉ 8 gian hàng của `Nguyễn Thị Ngọc Tâm` có Trưởng nhóm sơ duyệt, các gian còn lại hiển thị đúng `Không có leader`.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã rà soát toàn bộ 24 điểm sử dụng `<PageActions>` và `<PageHeaderNav>` trên khắp các màn hình, kiểm tra `tsc --noEmit` và `npm run build` đạt `0 errors`.

---

### BUG-046 — Lỗi Mã Hóa Tiếng Việt (Mojibake UTF-8), Cắt Cụt Thanh Tab `Kịch bản & Video`, Treo `"Đang tải…"` Do Truy Vấn N+1, Lệch Cột Bảng Tổng Cộng & Lỗi Bố Cục Trên Toàn Phân Hệ `Kịch bản & Video`
- **Ngày phát hiện:** 25/10/2026 (Người dùng gửi ảnh chụp màn hình thực tế tại `b2c-theta.vercel.app` và yêu cầu audit chi tiết toàn bộ bố cục phân hệ **Kịch bản & Video**).
- **Phân hệ / File liên quan:** `web-admin/src/lib/brandPlanRules.ts`, `web-admin/src/components/views/BrandMonthlyPlanForm.tsx`, `web-admin/src/components/views/ContentPlanBoard.tsx`, `web-admin/src/components/views/ContentView.tsx`, `web-admin/src/components/content/ContentCopilotModal.tsx`, `web-admin/src/components/ui/index.tsx`, `web-admin/src/lib/server/monthlyPlanStore.ts`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Lỗi mã hóa chữ tiếng Việt (Mojibake UTF-8 sang Latin-1) trong `brandPlanRules.ts`:**
     - 90 dòng chuỗi tiếng Việt trong `DIRECTION_FIELDS`, `KEY_VISUAL_FIELDS`, `KPI_ROWS`, `OVERVIEW_METRICS` và `diagnoseBrandPlan` bị lưu sai bảng mã (`Vai trÃ² trong plan nÄƒm`, `Má»¥c tiÃªu & rÃ o cáº£n cáº§n xá»­ lÃ½`, `Review / bÃ i há» c thÃ¡ng trÆ°á»›c`, `Tá»‡p khÃ¡ch hÃ ng & insight`, `Combo / deal / quÃ  táº·ng`...).
  2. **Dãy 6 tab con của `Kịch bản & Video` bị ép nghẹt và chồng chéo thanh công cụ (`ContentView.tsx` & `ui/index.tsx`):**
     - Trong `ui/index.tsx` (`<Tabs>`), `list` đặt `sm:flex-1` (`flex-basis: 0%`) nằm chung một hàng `sm:flex-row` với khối `actions` chứa 5 nút của `ContentView.tsx` (~760px), làm ép `TabList` co lại còn ~320px (`Chờ du...`) hoặc tạo thành 2 tầng nút bấm chồng lên thanh thao tác riêng của `BrandMonthlyPlanForm` và `ContentPlanBoard`.
  3. **Treo trạng thái `"Đang tải..."` kéo dài khi mở `Plan tháng của Brand` (`listBrandPlanPlans` & `resolveBrandPlanAccess`):**
     - Trong `monthlyPlanStore.ts`, `listBrandPlanPlans` lặp tuần tự qua 98 bản ghi kế hoạch (`for (const row of rows)`) và ở mỗi vòng lặp lại gọi `assertPlanAccess`, phát sinh 2 truy vấn DB (`readMasterCatalog` + `actionAllowed`) mỗi dòng ($\approx 196+$ truy vấn tuần tự tới Supabase).
  4. **Lệch cột dòng Tổng cộng (`colSpan={11}`) và khoảng trống lưới trên `BrandMonthlyPlanForm.tsx`:**
     - Bảng `Chi tiết Content` (tab `4. TikTok Shop` & `5. Shopee`) có **16 cột** (12 cột trước `Số lượng`), nhưng dòng Tổng cộng cuối bảng dùng `colSpan={11}`, khiến tổng số lượng video bị nhảy sang cột `Sản xuất` và tổng ngân sách bị nhảy sang cột `Số lượng`.
     - Tab `3. Key Visual` trộn 4 ô `<Input>` đơn (`!f.long`) xen kẽ với 3 ô `<Textarea>` (`md:col-span-2`) làm xuất hiện 2 khoảng trống nửa hàng bên phải; tab `4. TikTok Shop → Tổng quan` xếp 3 thẻ (`Doanh số` 7 dòng, `Chi phí` 3 dòng, `Triển khai` 12 dòng) vào lưới `xl:grid-cols-2` phẳng làm thẻ `Triển khai` nằm lẻ ở hàng 2 bên cạnh khoảng trống lớn.
  5. **Khung thống kê thiếu tiêu đề trên `ContentPlanBoard.tsx` và chưa đồng bộ Design System / `RULE-API-01` trên `ContentView.tsx` & `ContentCopilotModal.tsx`:**
     - Khung bên phải cạnh `Kho dòng Brief chưa xếp tuần` trên `ContentPlanBoard.tsx` không có tiêu đề khối; thẻ chip Brief trong bảng ma trận tuần chưa có nút gán nhanh KOC (`UserPlus`).
     - Các tab `Kho nội dung`, `Chờ duyệt kịch bản`, `Video nháp KOC`, `Đối soát bài đăng` trong `ContentView.tsx` còn dùng lớp CSS cũ (`card-enterprise`, `badge-amber`, `bg-slate-50`), có dòng phụ đề xám dưới tiêu đề video nháp, và truyền trực tiếp `customSystemInstruction` cứng trong `ContentView.tsx` / `ContentCopilotModal.tsx` (vi phạm `RULE-API-01`).
- **Cách khắc phục:**
  1. Khôi phục chuẩn UTF-8 toàn bộ 90 dòng chuỗi tiếng Việt trong `web-admin/src/lib/brandPlanRules.ts`.
  2. Chuyển `<Tabs>` (`ui/index.tsx`) sang `flex flex-wrap items-end justify-between` và chuyển 4 nút công cụ toàn cục của `ContentView.tsx` lên `<PageActions>` trên `TopHeader`, giúp dãy 6 tab con (`Plan tháng của Brand`, `Kế hoạch content`, `Kho nội dung`, `Chờ duyệt kịch bản`, `Video nháp KOC`, `Đối soát bài đăng`) nằm gọn trên 1 hàng ngang duy nhất.
  3. Tối ưu `listBrandPlanPlans` và `resolveBrandPlanAccess` trong `monthlyPlanStore.ts`: nạp `readMasterCatalog` và quyền `actionAllowed` 1 lần duy nhất bằng `Promise.all`, sau đó kiểm tra quyền đồng bộ trong bộ nhớ (`brandPlanAccessSync`).
  4. Trên `BrandMonthlyPlanForm.tsx`:
     - Sửa dòng Tổng cộng bảng `Chi tiết Content` từ `colSpan={11}` thành `colSpan={12}` khớp chính xác 16 cột; cố định (`sticky right-0`) cột thao tác trên bảng `Chi tiết Content` và bảng `Pillar`; bổ sung dòng tổng tỷ trọng (%) và tổng số video cuối bảng `Pillar`.
     - Sắp xếp lại lưới `3. Key Visual` (4 ô ngắn trên 1 hàng `xl:grid-cols-4`, 3 ô dài bên dưới `lg:grid-cols-3`) và cân bằng 2 cột `Tổng quan TikTok` (cột trái: `Doanh số` + `Chi phí`, cột phải: `Triển khai`).
  5. Trên `ContentPlanBoard.tsx`, `ContentView.tsx` và `ContentCopilotModal.tsx`:
     - Bổ sung tiêu đề `Tỷ trọng nhóm Pillar & Kiểm tra` và nút gán nhanh KOC (`UserPlus`) ngay trên thẻ Brief trong `ContentPlanBoard.tsx`.
     - Chuẩn hóa toàn bộ 4 tab `CONTENT_ITEMS`, `SCRIPTS`, `DRAFT_VIDEOS`, `PUBLICATIONS` sang `<Panel>`, `<Button>`, `<Status>`, gỡ dòng phụ đề xám ở `DRAFT_VIDEOS`, sửa chữ ký `<ConfirmDialog>` và bỏ `customSystemInstruction` cứng để đọc tập trung từ Trung tâm Cấu hình API (`RULE-API-01`).
- **Phạm vi rà soát mở rộng sang phần khác:** Đã kiểm tra toàn bộ 6 tab con và các hộp thoại trong phân hệ `Kịch bản & Video`, chạy unit test và kiểm tra `tsc --noEmit` & `npm run build` đạt 0 lỗi.

---

### BUG-047 — Phân Tán 3 Nơi Nhập `Kế Hoạch Theo Brand`, Mất Trạng Thái Khi Lưu Từ Footer Modal, Thiếu Ô Nhập Trong Chế Độ Sửa Của `BrandOneSheetPlanView` & Đứt Luồng Đồng Bộ Xuống `Kế Hoạch Content`
- **Ngày phát hiện:** 25/10/2026 (Người dùng phản ánh màn hình `Kế hoạch tháng → Kế hoạch theo Brand` bị rối, phải kéo ngang cắt mất cột Brand, chỗ nhập plan thiếu thân thiện và yêu cầu kiểm toán toàn diện UI/UX luồng quy trình).
- **Phân hệ / File liên quan:** `web-admin/src/components/views/MonthlyPlanHub.tsx`, `web-admin/src/components/views/BrandOneSheetPlanView.tsx`, `web-admin/src/components/views/ContentView.tsx`, `web-admin/src/components/views/ContentPlanBoard.tsx`, `web-admin/src/lib/contentPlanRules.ts`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Phân tán 3 nơi nhập Kế hoạch Brand & bảng `BRAND_PLANS` bị tràn ngang cắt mất tên Brand (`MonthlyPlanHub.tsx` & `ContentView.tsx`):**
     - Trước đây có tới 3 lối vào rời rạc (`Kế hoạch theo Brand` trong `MonthlyPlanHub.tsx`, nút `One-Sheet` trong `4.1.1`, và tab `Plan tháng của Brand` trong `ContentView.tsx`).
     - Bảng `BRAND_PLANS` trong `MonthlyPlanHub.tsx` có 10 cột rộng (`min-w-[200px]`..`min-w-[240px]`), không khóa `sticky left-0` cho cột Brand, hiển thị mã kỹ thuật (`P1..P5`, `3 Pos`) và không hiển thị số liệu tổng hợp tự động từ Plan các gian hàng (`TikTok`, `Shopee`).
  2. **Mất dữ liệu vừa gõ trong `BrandOneSheetPlanView` khi bấm nút Lưu ở chân Modal hoặc chuyển Tab (`MonthlyPlanHub.tsx` & `BrandOneSheetPlanView.tsx`):**
     - `BrandOneSheetPlanView` giữ `formData` trong `useState` nội bộ và chỉ gọi `onSave` khi bấm nút `"Lưu"` nhỏ bên trong component con. Nếu người dùng sửa dữ liệu ở Tab 1 (`Biểu mẫu Kế hoạch Brand 01 → 05`) rồi chuyển sang Tab 2 (`Phân công 3 vị trí`) hoặc bấm nút `"Lưu kế hoạch Brand"` / `"Duyệt kế hoạch Brand"` ở chân Modal, toàn bộ dữ liệu vừa sửa ở Tab 1 bị mất.
  3. **Chế độ Chỉnh sửa (`isEditMode`) trong `BrandOneSheetPlanView.tsx` chỉ cho sửa 1–2 cột ở bảng 04.3, 05.1 và 05.3:**
     - Khi bấm `"Thêm dòng Content TikTok"` (Mục 04.3), `"Thêm Pillar"` (Mục 05.1) hoặc `"Thêm dòng Lịch Air Shopee"` (Mục 05.3), 80% các cột (`SKU / Combo`, `Nguồn`, `Nhóm KL`, `Tệp KOC`, `Pillar`, `SL`, `Ngân sách`, `PIC`, `Format`, `Phương thức SX`...) vẫn render văn bản tĩnh (`<td>` thường) và Mục 05 không có nút xóa dòng.
     - Thanh chọn mục `01 → 05` không cố định (`sticky`), khiến khi cuộn xuống mục 04–05 người dùng mất thanh điều hướng.
  4. **Đứt cầu nối dữ liệu từ `Kế hoạch theo Brand (01 → 05)` sang nút `"Lấy từ plan Brand"` tại `Kế hoạch Content` (`ContentPlanBoard.tsx` & `contentPlanRules.ts`):**
     - `pullFromBrandPlan` trong `ContentPlanBoard.tsx` chỉ đọc `/api/brand-plan` (cấu trúc `BrandPlanData` cũ) mà không đọc `oneSheetPlanData` (`BrandOneSheetPlanData`) đã lưu từ `MonthlyPlanHub.tsx`. Ngoài ra `brandMonthlyPlans` trong `MonthlyPlanHub.tsx` chưa lưu bền vững vào `localStorage` và chưa đồng bộ `oneSheetPlanData` sang các `MonthlyPlan` của gian hàng thuộc Brand.
- **Cách khắc phục:**
  1. Gỡ bỏ tab trùng lặp `Plan tháng của Brand` khỏi `ContentView.tsx`, hợp nhất về một đầu mối duy nhất tại `Kế hoạch tháng → Kế hoạch theo Brand` (`MonthlyPlanHub.tsx`) với bảng `table-fixed` không tràn ngang, cột Brand `sticky left-0`, tự động cộng gộp số liệu từ Plan các gian hàng (`brandStoreRollupMap`), nút nhảy nhanh `TikTok ↗` / `Shopee ↗` sang bảng `4.1.1` của từng gian và nút `"Nhập Plan"` mở thẳng chế độ sửa.
  2. Bổ sung `defaultEditMode` và callback đồng bộ tức thời `onChangeOneSheetData` trong `BrandOneSheetPlanView.tsx` (gọi qua `updateFormData` ở mọi thao tác sửa/thêm/xóa dòng) để `editingBrandPlan` của Modal luôn giữ bản mới nhất khi chuyển Tab hoặc bấm Lưu/Duyệt ở chân Modal; đồng thời lưu bền vững vào `localStorage` (`b2c_brand_monthly_plans_v1`) và đồng bộ `oneSheetPlanData` xuống các gian hàng của Brand.
  3. Mở khóa chỉnh sửa 100% các cột của Mục `04.3`, `05.1`, `05.3` khi `isEditMode === true` kèm nút xóa dòng (`Trash2`) và cố định thanh điều hướng `01 → 05` (`sticky top-0 z-20`).
  4. Xây dựng hàm `slotSpecsFromOneSheetPlan` trong `contentPlanRules.ts` và đấu nối vào `pullFromBrandPlan` trong `ContentPlanBoard.tsx` để chuyển đổi trực tiếp các dòng `tiktokContentRows` / `shopeeContentRows` / `contentPillars` từ `BrandOneSheetPlanData` thành các ô kế hoạch tuần trên `Kế hoạch Content`.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã kiểm tra toàn bộ luồng `Kế hoạch tháng (Gian hàng & Brand)` -> `Kế hoạch Content` -> `Đợt đề xuất KOC`, vượt qua `tsc --noEmit` và `npm run build` với `0 errors`.

---

### BUG-048 — Đứt Gãy Chiều Sản Phẩm 2 Tầng (`Nhóm SP → SKU/Combo`) Giữa `Hồ Sơ Brand` / `Sản Phẩm Đẩy` Với `Plan Tháng Của Brand`, `Kế Hoạch Content` & `Kho Nội Dung`
- **Ngày phát hiện:** 25/10/2026 (Người dùng yêu cầu phân tích và hợp nhất các chiều sản phẩm đang làm với quy trình phân hệ **Kịch bản & Video**).
- **Phân hệ / File liên quan:** `web-admin/src/lib/productCatalog.ts`, `web-admin/src/app/api/product-catalog/route.ts`, `web-admin/src/lib/contentPlanRules.ts`, `web-admin/src/components/views/BrandMonthlyPlanForm.tsx`, `web-admin/src/components/views/ContentPlanBoard.tsx`, `web-admin/src/components/views/ContentView.tsx`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Đứt gãy 3 nguồn dữ liệu Sản phẩm (`Hồ sơ Brand`, `Sản phẩm đẩy` và `/api/product-catalog`):**
     - `/api/product-catalog` trả về `EMPTY_PRODUCT_CATALOG` (`{ groups: [] }`) nếu chưa nhập tay từ đầu, dù `BrandProfile.products[]` (`getProfile`) và `INITIAL_PUSH_PRODUCTS` đã có sẵn đầy đủ SKU, giá, % hoa hồng, tồn kho mẫu, USP và từ cấm của từng Brand.
  2. **Chỉ nối Tầng 1 (`productGroupId`), bỏ rơi Tầng 2 (`CatalogProduct` — SKU đơn / Combo / Link giỏ hàng / % Hoa hồng) khi lập `Kế hoạch Content`:**
     - `ContentPlanBoard.tsx` chỉ cho chọn `Nhóm sản phẩm đẩy` (Tầng 1) mà không có bộ chọn `Sản phẩm / SKU / Combo cụ thể` (Tầng 2), dẫn tới không kế thừa được `Link giỏ hàng` theo đúng sàn (`TikTok Shop` vs `Shopee`), `% Hoa hồng Affiliate`, `Từ khóa nhận diện BBNT` và tồn kho mẫu (`resolveEffectiveSampleQuota`).
  3. **Thiếu bảng đối soát phân bổ Video & Hạn mức mẫu FOC theo từng Sản phẩm đẩy trên `ContentPlanBoard.tsx`:**
     - Khung kiểm tra bên phải của `ContentPlanBoard.tsx` chỉ thống kê theo nhóm Pillar mà chưa thống kê số lượng video và suất FOC đã xếp trên từng `HERO` SKU / Combo, cũng như chưa cảnh báo khi xếp video vào SKU đang `OUT_OF_STOCK` hoặc vượt `monthlySampleQuota`.
  4. **Đứt luồng từ `Kế hoạch Content` sang các tab thực thi (`Kho nội dung` & `Chờ duyệt kịch bản`) trong `ContentView.tsx`:**
     - `CONTENT_ITEMS` và `SCRIPTS` trong `ContentView.tsx` chỉ hiển thị dữ liệu tĩnh mà chưa có bộ lọc theo Thương hiệu / Sản phẩm và nút đồng bộ trực tiếp các dòng Brief (`BR-01..BR-N`) đã gán KOC từ `ContentPlanBoard`.
- **Cách khắc phục:**
  1. Xây dựng hàm `mergeBrandSourcesIntoCatalog` trong `web-admin/src/lib/productCatalog.ts` và tích hợp vào `GET /api/product-catalog` (`web-admin/src/app/api/product-catalog/route.ts`), tự động làm giàu danh mục 2 tầng (`ProductGroup → CatalogProduct`) từ `BrandProfile.products` và `INITIAL_PUSH_PRODUCTS` (kèm đầy đủ `sku`, `role`, `productType`, `monthlySampleQuota`, `usp`, `forbiddenClaims`, `cartLinks`, `affiliateLinks`).
  2. Nối trọn vẹn 2 tầng sản phẩm trên `BrandMonthlyPlanForm.tsx` và `ContentPlanBoard.tsx`:
     - Tự động chuyển tab `4. TikTok Shop` / `5. Shopee` theo sàn của gian hàng trên `BrandMonthlyPlanForm.tsx`; gợi ý danh sách SKU cho ô `Sản phẩm chính` ở `3. Key Visual`; tự động điền SKU đầu tiên và USP khi chọn Nhóm SP hoặc SKU/Combo ở bảng `Chi tiết Content`.
     - Bổ sung bộ chọn Tầng 2 `Sản phẩm / SKU / Combo cụ thể` (`productId`), `Link giỏ hàng gắn video` (`cartUrl`), `% Hoa hồng Affiliate` (`commissionPct`) và `Từ khóa nhận diện tự động` (`detectKeywords`) vào hộp thoại Thêm/Sửa Brief trên `ContentPlanBoard.tsx` và hàm đồng bộ `slotSpecsFromBrandPlan` (`contentPlanRules.ts`).
  3. Bổ sung hàm tổng hợp `byProduct` (`ProductAllocationSummary`) trong `diagnoseContentPlan` (`contentPlanRules.ts`) và hiển thị khối **Phân bổ theo Sản phẩm đẩy & Hạn mức mẫu** ngay trên khung bên phải của `ContentPlanBoard.tsx` (cảnh báo tức thời khi SKU hết hàng, vượt hạn mức mẫu FOC hoặc bỏ sót SKU `[HERO]`).
  4. Bổ sung thanh lọc Thương hiệu / Sản phẩm và nút **"Đồng bộ từ Kế hoạch Content"** (`handleSyncFromContentPlans`) trên `Kho nội dung` (`CONTENT_ITEMS`) và `Chờ duyệt kịch bản` (`SCRIPTS`) tại `ContentView.tsx`.
  5. Bổ sung cơ chế **2 chế độ làm việc với KOC theo phân khúc bậc KL** (`ContentBriefMode`: `'DIRECTIVE'` cho `FOC`, `SELF`, `KL1..KL5` vs `'VETTING_GUARDRAILS'` tự động kích hoạt cho `KL6`, `KL7`) trên `contentPlanRules.ts`, `ContentPlanBoard.tsx`, `ContentView.tsx`, `ScriptReviewModal.tsx`, `dealBoardRules.ts` và `PlanDealBoard.tsx`: không bắt buộc áp đặt `Angle` / `Hook 3s` mẫu cho KOL lớn (`KL6`/`KL7`), chỉ giao và đối soát theo 4 tham số kiểm duyệt ranh giới (`Key USP`, `Từ cấm & Ranh giới Brand`, `Yêu cầu khung hình & Hiện diện sản phẩm mandatoryShots`, `Điều khoản bản quyền/Spark Ads rightsGuardrails`).
  6. Đồng bộ đầy đủ sản phẩm Tầng 2 (`productName`, `cartUrl`, `affiliateUrl`, `commissionPct`), khung tham số kiểm duyệt (`briefMode`, `mandatoryShots`, `rightsGuardrails`) khi gắn dòng Brief (`BR-xx`) vào `DealJob` trên `PlanDealBoard.tsx`, đồng thời bổ sung **Duyệt Kịch bản 2 vòng** (`Vòng 1: Nội bộ duyệt SLA 24h` `internalScriptAuditStatus` vs `Vòng 2: Brand duyệt`) và cờ **SLA 72h Tự Air (`selfAirProposed`)** khi Brand quá hạn 3 ngày chưa duyệt.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã kiểm tra xuyên suốt các tab của phân hệ `Kịch bản & Video` và `Deal & Job` (`PlanDealBoard.tsx`), kiểm tra `tsc --noEmit` và `npm run build` đạt `0 errors`.

---

### BUG-049 — Audit & Tối Ưu Tốc Độ Truy Xuất Máy Chủ, Đồng Bộ Client Và Hiển Thị Dữ Liệu Trên Toàn Bộ Các Màn Hình Load Plan
- **Ngày phát hiện:** 25/10/2026 (Người dùng phản ánh ở một số màn hình load plan, tốc độ tải và hiển thị dữ liệu khá lâu, yêu cầu kiểm toán toàn diện).
- **Phân hệ / File liên quan:** `web-admin/src/lib/server/sharedRecords.ts`, `web-admin/src/lib/server/monthlyPlanStore.ts`, `web-admin/src/lib/server/larkbaseBookingPlanSync.ts`, `web-admin/src/lib/server/masterCatalogStore.ts`, `web-admin/src/lib/server/accessPolicy.ts`, `web-admin/src/app/api/deal-board/route.ts`, `web-admin/src/app/api/self-channel-board/route.ts`, `web-admin/src/app/api/content-plan/route.ts`, `web-admin/src/app/api/plan-actual-report/route.ts`, `web-admin/src/lib/useMonthlyPlanSync.ts`, `web-admin/src/lib/planBreakdownRules.ts`, `web-admin/src/lib/monthlyPlanData.ts`, `web-admin/src/lib/monthlyProfileMetrics.ts`, `web-admin/src/components/views/InputPlanBreakdownView.tsx`, `web-admin/src/components/views/MonthlyPlanHub.tsx`, `web-admin/src/components/views/PlanListingBoard.tsx`, `web-admin/src/components/views/PlanDealBoard.tsx`, `web-admin/src/components/views/PlanSelfChannelBoard.tsx`, `web-admin/src/components/views/ContentPlanBoard.tsx`, `web-admin/src/components/views/StorePipelineFunnelOverview.tsx`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Tầng Máy chủ & Database (`monthlyPlanStore.ts`, `sharedRecords.ts`, `accessPolicy.ts`, `masterCatalogStore.ts`):**
     - `listMonthlyPlans()` trong `monthlyPlanStore.ts` kiểm tra `rows.length < REAL_LARK_41_MONTHLY_PLANS.length` (98 bản ghi trong DB < 135 bản ghi mẫu trong bộ nhớ), khiến **mọi lệnh `GET /api/monthly-plans`** đều kích hoạt `syncRealLarkPlans()` chạy vòng lặp tuần tự `for...of` 135 lệnh `upsert` xuống PostgreSQL.
     - Các API tổng hợp theo danh sách kế hoạch (`GET /api/deal-board?all=1`, `GET /api/self-channel-board?all=1`, `GET /api/content-plan?selfAll=1`, `GET /api/plan-actual-report`) gọi `readRecord()` lẻ tẻ cho 140–207 khóa `AppSharedRecord`, gây ra 140–207 truy vấn SQL riêng lẻ (hoặc 140–207 lệnh `stat` lỗi `ENOENT` trên ổ đĩa) và nhân bản sâu (`structuredClone`) toàn bộ dữ liệu ở mỗi lần đọc.
     - `readPolicy()` trong `accessPolicy.ts` đặt điều kiện `record.revision > 0` mới lưu cache, khiến khi `access-policy` ở `revision === 0`, hàm `reconcileAccessPolicy` bị chạy lại kèm `structuredClone` trên mọi request API.
  2. **Tầng Đồng bộ Client (`useMonthlyPlanSync.ts` & 7 màn hình gọi `/api/monthly-plans`):**
     - Mỗi khi chuyển tab giữa `InputPlanBreakdownView`, `PlanListingBoard`, `PlanDealBoard`, `PlanSelfChannelBoard`, `ContentPlanBoard`, `StorePipelineFunnelOverview`, trình duyệt lại gọi mới `fetch('/api/monthly-plans')` tải lại ~1,5–2,5 MB JSON mà không chia sẻ bộ nhớ đệm.
     - `rememberStored` và `getDirtyPlans()` trong `useMonthlyPlanSync.ts` gọi `JSON.stringify` (`serialize`) trên toàn bộ 140 kế hoạch (~2,5 MB chuỗi JSON) ngay khi mở màn hình và ở mỗi chu kỳ kiểm tra tự động lưu, dù người dùng chỉ sửa 1 kế hoạch.
  3. **Tầng Tính toán & Render Giao diện (`StorePipelineFunnelOverview.tsx`, `planBreakdownRules.ts`, `monthlyPlanData.ts`, `monthlyProfileMetrics.ts`, `MonthlyPlanHub.tsx`, `PlanDealBoard.tsx`, `InputPlanBreakdownView.tsx`):**
     - `StorePipelineFunnelOverview.tsx` (Tab *Tiến độ 69 gian hàng* và nhúng trong `KocListingBatchHubView`) lặp lồng nhau `69 gian hàng × 16.039 deals` kèm `.normalize('NFD').replace(...)` trong mỗi vòng lặp = **1.106.691 vòng lặp chuẩn hóa chuỗi Unicode mỗi lần render** (chạy 2 lần khi mount = 2,21 triệu phép tính).
     - `evaluatePlanValiditySummary`, `validateBreakdown`, `sumBreakdown` (`planBreakdownRules.ts`) và `getStorePlanWorkstreamSummary`, `enrichPlanWithVersions` (`monthlyPlanData.ts`) được gọi lặp lại hàng trăm lần cho cùng một đối tượng `plan` mà không có bộ nhớ đệm `WeakMap`.
     - `buildStoreMonthlyPlanReport` (`monthlyProfileMetrics.ts`) được gọi 69 lần mỗi lần render trên `StoreManagementView` và `BrandProfilesView`, mỗi lần đều chuyển đổi lại 16.046 bản ghi `B2C_BOOKED_VIDEOS_OCT_2026` và lọc `allPlans` 138 lần.
     - `PlanDealBoard.tsx` gọi `kocs.find(...)` trên mảng 4.820 KOC cho từng Job trong bảng (`kocOfHandle`), và gọi lại `fetch('/api/contracts')` mỗi khi người dùng bấm chọn một Job khác (`selectedId`).
     - `InputPlanBreakdownView.tsx` đẩy `onPlansChange(merged)` lên `page.tsx` ngay lập tức ở mỗi thao tác gõ phím trong Studio 4.1.1, kéo theo `page.tsx` (chứa 16.039 deals và 4.820 KOC) phải re-render liên tục.
- **Cách khắc phục:**
  1. **Tối ưu Truy xuất Máy chủ & Batch DB:**
     - Trong `monthlyPlanStore.ts` & `larkbaseBookingPlanSync.ts`: bổ sung bộ nhớ đệm kế hoạch trên máy chủ (`cachedPlansState` TTL 25s + gộp request đồng thời `inflightPlansLoad` + cập nhật tức thời `upsertCachedPlan` khi ghi); khóa cờ `hasVerifiedRealLarkPlans` và chỉ đồng bộ các mã kế hoạch thực sự còn thiếu theo lô song song, giảm thời gian phản hồi `/api/monthly-plans` từ hàng trăm truy vấn tuần tự xuống `0 DB query` (< 2ms) khi ấm cache.
     - Trong `sharedRecords.ts`: bổ sung tùy chọn `{ clone?: boolean }` cho `readRecord` và xây dựng hàm đọc lô `readRecordsBatch<T>(keys, fallback, options)` (quét `readdir` 1 lần ở chế độ file hoặc chạy 1 câu lệnh `SELECT ... WHERE key = ANY(...)` duy nhất trên PostgreSQL). Áp dụng đồng bộ cho `/api/deal-board`, `/api/self-channel-board`, `/api/content-plan` và `/api/plan-actual-report`.
     - Trong `accessPolicy.ts` và `masterCatalogStore.ts`: bỏ điều kiện chặn cache `record.revision > 0` và đọc với `{ clone: false }`.
  2. **Tối ưu Đồng bộ Client & Chống `JSON.stringify` Thừa:**
     - Trong `useMonthlyPlanSync.ts`: xây dựng bộ nhớ đệm kế hoạch dùng chung phía client (`fetchClientMonthlyPlans`, `getCachedClientMonthlyPlans`, `invalidateClientMonthlyPlansCache`, `upsertClientCachedPlan`) có gộp request đồng thời và cập nhật tại chỗ khi lưu; áp dụng cho toàn bộ `PlanListingBoard`, `PlanDealBoard`, `PlanSelfChannelBoard`, `ContentPlanBoard` và `StorePipelineFunnelOverview` để chuyển tab tức thời không cần tải lại.
     - Bổ sung `lastSavedObjRef` trong `useMonthlyPlanSync.ts` để so sánh tham chiếu đối tượng O(1) (`lastSavedObjRef.current.get(plan.id) === plan`) trước khi gọi `serialize(plan)`, loại bỏ 99% chi phí `JSON.stringify` trên 139 kế hoạch không thay đổi.
  3. **Tối ưu Thuật toán Giao diện ($O(1)$ Lookup & `WeakMap` Memoization):**
     - Trong `StorePipelineFunnelOverview.tsx`: lập chỉ mục `plansLookup` và `dealsLookup` (`Map` theo tên gian hàng / thương hiệu đã chuẩn hóa) 1 lần duy nhất trước khi tổng hợp 69 gian hàng, giảm từ `2.213.382` phép chuẩn hóa chuỗi xuống `16.039` phép tính.
     - Trong `planBreakdownRules.ts`, `monthlyPlanData.ts`, `monthlyProfileMetrics.ts`: bọc `WeakMap` memoization cho `sumBreakdown`, `validateBreakdown`, `evaluatePlanValiditySummary`, `getStorePlanWorkstreamSummary`, `enrichPlanWithVersions`, `getPlansForMonth`, `getFile32ConvertedBookings` và `buildStoreMonthlyPlanReport`.
     - Trong `PlanDealBoard.tsx`: thay `kocs.find` bằng `kocByHandleMap` ($O(1)$), ổn định phụ thuộc `useEffect` theo `[activePlanId, activePlanBrandName]` và tách riêng `useEffect` tải `/api/contracts` khỏi `selectedId`.
     - Trong `MonthlyPlanHub.tsx` và `InputPlanBreakdownView.tsx`: lập chỉ mục trước cho `brandStoreRollupMap`, chỉ tính `personalStaffSummaryList` / `filteredPersonalPackages` khi mở tab `PERSONAL_PLANS`, và debounce 180ms khi đồng bộ `onPlansChange` từ `InputPlanBreakdownView` lên `page.tsx`.
- **Phạm vi rà soát mở rộng sang phần khác:** Áp dụng **RULE-PERF-01** cho toàn bộ các API đọc `AppSharedRecord` và các màn hình bảng biểu lớn trong hệ thống.

---

### BUG-050 — Thẻ Chỉ Số Kế Hoạch Tháng Không Đổi Số Liệu Khi Chuyển Kỳ Tháng & Khối Thẩm Định 4 Chặng Chiếm Diện Tích Làm Rối Bảng Gian Hàng
- **Ngày phát hiện:** 25/10/2026 (Người dùng phản ánh trên màn hình *Kế hoạch tháng* rằng phần thẻ chỉ số không thay đổi khi đổi tháng và khối thông tin 4 chặng để trực tiếp trên đầu bảng bị rối, cần nhấn nút để mở xem).
- **Phân hệ / File liên quan:** `web-admin/src/components/views/MonthlyPlanHub.tsx`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. **Khi chuyển giữa `Tất cả (137)` và `2026/11 (66)`, hoặc sang `2026/09 (3)`, `2026/08 (2)`, nhiều chỉ số không đổi:**
     - Ở chế độ `selectedMonth === 'ALL'`, điều kiện `hasFullMonth41Batch` bị chặn bởi `selectedMonth !== 'ALL'`, khiến danh sách rơi vào `buildPlanLookupMap(scopedPlans, 'ALL')`. Hàm này ghi đè kế hoạch theo `storeSlug`, làm 66 bản kế hoạch `2026/11` (nằm sau trong mảng) đè lên 66 bản `2026/10`. Do đó `Tất cả 137` và `2026/11 66` hiển thị cùng 1 bộ số liệu (`3,77 tỷ`, `8.330 video`).
     - Ở `getB2cPlanBreakdown(plan, store)`, khi gian hàng chưa có kế hoạch trong kỳ (`plan === null` tại `2026/09` hoặc `2026/08`), hàm vẫn fallback lấy `store.monthlyBudget`, `store.budgetAffiliate`, `store.targetFocVideos`, làm 5 ô KPI cộng dồn hạn mức tĩnh của 64 gian hàng không có plan.
     - `brandMonthlyPlans` (`Kế hoạch theo Brand 42`) và `allPersonalPackages` (`Kế hoạch theo nhân sự 131`) chỉ gắn cứng `month: '2026/10'` mà không lọc theo các thương hiệu có kế hoạch hoạt động trong `selectedMonth`.
  2. **Khối Scorecard 4 chặng (`1. Plan Tổng`, `2. Plan Chi Tiết`, `3. Kiểm Định Hợp Lệ`, `4. Phê Duyệt & Triển Khai`) đặt cố định ngay trên bảng `Ma trận gian hàng`:**
     - Chiếm nhiều diện tích dọc và hiển thị quá nhiều nút lọc con cùng lúc trên màn hình chính, gây rối mắt khi thao tác bảng.
- **Cách khắc phục:**
  1. Trong `getB2cPlanBreakdown(plan, store)`: trả về toàn bộ giá trị `0` ngay khi `!plan`; bổ sung fallback `reference41.multiPlatform` cho `otherQty` và `otherBudget`.
  2. Trong `storeGovernanceList`: bỏ chặn `selectedMonth !== 'ALL'` ở `hasFullMonth41Batch` và tạo khóa định danh dòng riêng theo kỳ tháng khi xem `Tất cả`, giúp `Tất cả (137)`, `2026/10 (66)`, `2026/11 (66)`, `2026/09 (3)`, `2026/08 (2)` hiển thị đúng số liệu từng kỳ.
  3. Bổ sung `monthScopedBrandMonthlyPlans` lọc và đồng bộ `month: selectedMonth` cho `brandPlanKpis`, `filteredBrandMonthlyPlans` và `allPersonalPackages`.
  4. Thu gọn phần đầu bảng `Ma trận gian hàng` thành 1 dòng tóm tắt + 5 ô KPI đầu việc B2C + nút **`Tiến độ & Kiểm định 4 chặng`**, đưa toàn bộ Scorecard 4 chặng, ma trận điểm nghẽn theo PIC và tác vụ duyệt/chia tuần hàng loạt vào hộp thoại `<Modal>` mở khi nhấn nút.
- **Phạm vi rà soát mở rộng sang phần khác:** Đã đối soát toàn bộ các bộ lọc tháng trên `MonthlyPlanHub.tsx` và kiểm tra `npm run build` đạt `0 errors`.

---

### BUG-051 — Trùng Lặp Nhập Liệu Và Hiển Thị Ở Nhiều Nơi Trên Hồ Sơ Thương Hiệu, Hồ Sơ Gian Hàng, Hồ Sơ KOC Và Hộp Thoại Đề Nghị Thanh Toán Lark
- **Ngày phát hiện:** 25/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/brands/BrandProfileDetail.tsx`, `web-admin/src/components/koc/KocProfile.tsx`, `web-admin/src/components/stores/StoreProfile.tsx`, `web-admin/src/components/booking/LarkPaymentRequestModal.tsx`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. Trong `BrandProfileDetail.tsx`, tab `OVERVIEW` lặp lại nguyên văn 6 khối nội dung kèm các nút Thêm/Sửa/Xóa vốn đã có tab riêng (`WORKFLOW`, `PRODUCTS`, `COMPLIANCE`, `FILES`, `RATECARD`).
  2. Trong `KocProfile.tsx`, khung `LegalPaymentPanel` ở cột phải chứa form sửa Pháp lý & Ngân hàng (`isEditingLegal`) trùng hoàn toàn với tab `LEGAL_PROFILES` (`KocLegalProfilesSection`), khung `ShippingAndContactPanel` có 2 chế độ sửa Email trùng nhau (`isEditingContact` và `quickEmailEditing`), và `<header>` lặp lại SĐT/Email/Khu vực đã có ở cột phải.
  3. Trong `StoreProfile.tsx`, thanh công cụ và `<header>` đầu trang lặp lại 2 nút `Thông số tĩnh`, `Bàn giao PIC` và các badge `Gói`, `Hoa hồng`, `PIC` vốn đã hiển thị ở 2 Panel cột phải.
  4. Trong `LarkPaymentRequestModal.tsx`, các ô `<Input>` chứng từ của từng Deal đã đủ điều kiện và 5 ô thông tin thụ hưởng/pháp lý của KOC luôn mở sẵn ở chế độ sửa thay vì hiển thị tóm tắt chỉ đọc kế thừa từ Hồ sơ KOC/Deal.
- **Cách khắc phục:**
  1. Tại `BrandProfileDetail.tsx`: Đổi tên tab `OVERVIEW` thành `Định vị & Pháp nhân`, xóa bỏ toàn bộ 6 khối bị lặp khỏi tab này để mỗi nhóm thông tin chỉ hiển thị và chỉnh sửa tại đúng tab chuyên trách của nó.
  2. Tại `KocProfile.tsx`: Chuyển `LegalPaymentPanel` ở cột phải thành khung tóm tắt chỉ đọc và điều hướng nút `Quản lý pháp lý & TK` về tab gốc `LEGAL_PROFILES`; gộp sửa Email về duy nhất form `Sửa liên hệ`; xóa thông tin liên hệ lặp trên `<header>`.
  3. Tại `StoreProfile.tsx`: Xóa 2 nút và các badge thông số tĩnh bị lặp trên đầu trang, giữ đầu mối duy nhất tại 2 Panel cột phải.
  4. Tại `LarkPaymentRequestModal.tsx`: Mặc định hiển thị tóm tắt chỉ đọc cho chứng từ Deal đã đạt điều kiện và thông tin thụ hưởng đã có từ Hồ sơ KOC; chỉ mở các ô `<Input>` khi thiếu dữ liệu hoặc khi người dùng chủ động bấm `Sửa chứng từ` / `Sửa thông tin thụ hưởng`.
- **Phạm vi rà soát mở rộng sang phần khác:** Áp dụng nguyên tắc `Single Source of Truth` trên toàn bộ 4 cụm màn hình Hồ sơ Thương hiệu, Gian hàng, KOC và Thanh toán.

---

### BUG-052 — Hồ Sơ Thương Hiệu (`BrandProfileDetail` & `BrandProfilesView`) Chiếm Quá Nhiều Diện Tích Dọc, Đẩy Bảng Gian Hàng Và Deal Booking Xuống Cuối Màn Hình
- **Ngày phát hiện:** 25/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/brands/BrandProfileDetail.tsx`, `web-admin/src/components/views/BrandProfilesView.tsx`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. Trong `BrandProfileDetail.tsx`, phần đầu trang tách thành 3 khối dọc riêng biệt (`Toolbar` điều hướng + `<header>` 3 dòng + `<StatRow>` 4 thẻ cỡ lớn `size="md"`) với khoảng cách `space-y-6` (24px), chiếm tới ~360px chiều cao dọc trong khi thanh `TopHeader` bên trên bị bỏ trống.
  2. Dưới tiêu đề `<h2>{row.name}</h2>` có dòng văn bản mô tả phụ `<p className="text-[13px] text-ink-2">` và một số trường trong `PRODUCT_FIELDS`, `LEGAL_FIELDS` còn chứa `hint`, vi phạm Quy tắc 1 (`GEMINI.md`).
  3. Tại tab mặc định `STORES`, bảng `Hồ sơ Tháng (Plan & Report)` 4 dòng hiển thị cố định ở trên cùng (~280px), lặp lại đúng các con số KPI vừa hiển thị ở `<StatRow>` phía trên và đẩy bảng `Đối soát Gian hàng` cùng `Deal Booking` xuống sát đáy màn hình.
- **Cách khắc phục:**
  1. Đưa cụm điều hướng (`Danh bạ`, chuyển nhãn, chọn `Kỳ hồ sơ`) vào `<PageHeaderNav>` và các nút thao tác (`Tải tệp`, `Brief 5 phần`, `Plan`, `Booking`) vào `<PageActions>` trên thanh `TopHeader` (cả ở `BrandProfileDetail` và `BrandProfilesView`).
  2. Gộp phần Định danh thương hiệu, đội ngũ PIC và 4 chỉ số KPI (`NMV`, `Chi Net`, `Video Air`, `Hồ sơ tĩnh`) vào duy nhất 1 khung ngang gọn nhẹ (`px-3.5 py-2.5`), xóa bỏ dòng phụ đề dưới `<h2>` và các `hint` thừa.
  3. Thay bảng `Hồ sơ Tháng` 4 dòng cố định bằng dải pill chuyển nhanh 4 kỳ tháng kèm nút bật/tắt `So sánh 4 tháng`, đưa bảng `Đối soát Gian hàng trực thuộc` và `Thực tế Deal Booking` lên ngay đầu tab với khoảng cách `space-y-3` / `space-y-3.5`.
- **Phạm vi rà soát mở rộng sang phần khác:** Đồng bộ thu gọn `StatRow size="sm"` và `FilterBar` tại danh bạ `BrandProfilesView.tsx`; thiết kế lại `ProductCatalogView.tsx` từ dạng danh sách form trần không nhãn (`<Input>` không có `<Field>`) sang dải chọn Nhóm sản phẩm ngang + Bảng danh sách SKU/Combo rõ ràng + 2 hộp thoại `<Modal>` chuẩn có đầy đủ nhãn `<Field>` cho thao tác `Tạo/Sửa Nhóm sản phẩm` và `Tạo/Sửa Sản phẩm & Combo` (bổ sung đầy đủ thông số chuyên môn SKU gồm `size`, `usps`, `ingredients`, `mechanism`, `usageInstruction`, `targetUser`, `contraindications` đồng bộ với `Brief 5 phần`); tại `BrandWorkflowRules`, `BrandContentRules` và `BrandDocument` bổ sung thêm `targetAudienceDemographics`, `kocPersonaAndVisualCriteria`, `blacklistedKocs`, `minAdvertisedPriceRule`, `keyPromotionMechanic` và `extractedContent`; tại tab `Từ cấm & Pháp lý` (`COMPLIANCE`) trong `BrandProfileDetail.tsx` và `BrandEditors.tsx` (`domain.ts`, `brandUi.ts`), mở quyền chỉnh sửa đầy đủ các mục cho toàn bộ nhân sự nội bộ B2C, xóa bỏ hoàn toàn các dòng giải thích chữ xám (`b.reason`, `x.note`) dưới từng từ khóa cấm/cụm từ nên dùng, và trang bị bộ nút `+ Thêm`, `Sửa`, `Xóa` trực tiếp trên từng mục `Từ khóa cấm`, `Cụm từ nên dùng`, `Hình ảnh không được dùng`, `Hình ảnh khuyến khích`, `Văn bản pháp lý` và `Câu hỏi khó`.

---

### BUG-053 — Thiếu Giao Diện Gán Nhân Viên Chính Và Đa Chọn Nhân Viên Hỗ Trợ Trên Phân Công & Hồ Sơ Gian Hàng
- **Ngày phát hiện:** 25/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/lib/types.ts`, `web-admin/src/components/views/ManagerDelegationHub.tsx`, `web-admin/src/components/stores/StoreProfile.tsx`, `web-admin/src/components/stores/StoreHandoverDialog.tsx`, `web-admin/src/components/views/StoreManagementView.tsx`, `web-admin/src/components/views/master-data/StoresMasterView.tsx`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. Dữ liệu `StorePortfolioItem` đã có trường `primaryPic`, `b2cOwners: string[]`, `assignedMembers: string[]` để lưu 1 Nhân viên chính + các Nhân viên hỗ trợ, nhưng giao diện tại `ManagerDelegationHub`, `StoreProfile` và `StoreHandoverDialog` chỉ hiển thị 1 ô chọn `Chuyên viên B2C (PIC)` duy nhất và khi lưu lại ghi đè `b2cOwners: [newPic]`, làm mất danh sách nhân viên hỗ trợ.
  2. Giữa các màn hình danh sách (`StoreManagementView`, `StoresMasterView`) và màn chi tiết (`StoreProfile`) tự cắt chuỗi `b2cOwnerName` khác nhau thay vì dùng chung một hàm chuẩn hóa.
- **Cách khắc phục:**
  1. Bổ sung hàm dùng chung `resolveStoreStaffAssignment(store)` trong `web-admin/src/lib/types.ts` (`RULE-SYNC-01`) để bóc tách nhất quán `primaryPic` (Nhân viên chính), `supportStaff` (mảng Nhân viên hỗ trợ không trùng với Nhân viên chính) và `allOwners`.
  2. Tại `ManagerDelegationHub.tsx`: Tách rõ cột **Nhân viên chính (PIC)** và cột **Nhân viên hỗ trợ** (hiển thị chip nhân viên hỗ trợ kèm nút gỡ `×` và ô chọn `+ Thêm nhân viên hỗ trợ...` ngay trên bảng), đồng thời nâng cấp hộp thoại `Phân công & Bàn giao gian hàng` hỗ trợ chọn 1 Nhân viên chính + tích chọn nhiều Nhân viên hỗ trợ.
  3. Tại `StoreHandoverDialog.tsx` & `StoreProfile.tsx`: Hiển thị đầy đủ danh sách `Nhân viên hỗ trợ` kèm nút `+ Gán hỗ trợ` / `Sửa hỗ trợ` trong Panel `Đội ngũ phụ trách`, và cho phép đa chọn nhiều Nhân viên hỗ trợ trong hộp thoại bàn giao/phân công.
- **Phạm vi rà soát mở rộng sang phần khác:** Đồng bộ hiển thị `Chính` + `+N hỗ trợ` trên cột danh sách của `StoreManagementView.tsx` và `StoresMasterView.tsx`.

---

### BUG-054 — Các Thẻ KPI Và Bộ Lọc Trên Màn Hình Báo Cáo & Dashboard Của Nhân Viên Vẫn Hiển Thị Số Tổng Toàn Bộ 69 Gian Hàng B2C
- **Ngày phát hiện:** 26/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/ExecutiveDashboardReportsView.tsx`, `web-admin/src/components/views/StorePipelineFunnelOverview.tsx`, `web-admin/src/components/views/WeeklyAirSyncDashboardSection.tsx`, `web-admin/src/components/views/PlanActualReportView.tsx`, `web-admin/src/components/views/BookingView.tsx`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. Tại `ExecutiveDashboardReportsView.tsx` (dòng 121–126) và `StorePipelineFunnelOverview.tsx` (dòng 92–95), hàm khởi tạo `stores` đặt điều kiện `if (storePortfolios && storePortfolios.length >= 69) return storePortfolios; return REAL_B2C_69_STORES;`. Khi nhân viên/chuyên viên (ví dụ `Hoàng Hải Long` phụ trách 6 gian hàng) đăng nhập, `page.tsx` truyền `storePortfolios={scopedStores}` có `< 69` phần tử nên bị bỏ qua và rơi về toàn bộ 69 gian hàng `REAL_B2C_69_STORES`.
  2. Nhiều thẻ KPI, tiêu đề bảng và tùy chọn lọc (`Quy Mô 69 Gian Hàng B2C`, `69 / 69 Gian hàng`, `39 TikTok · 30 Shopee`, `786 Đơn Video`, `2,63 Tỷ VNĐ`, `TIKTOK_SELLER_ADS_SUMMARY`, `TIKTOK_SELLER_CAMPAIGNS`, `B2C_BOOKED_VIDEOS_OCT_2026`, `B2C_STAFF_ANALYTICS_LIST`, `B2C_STORE_WEEKLY_AIR_SYNC_LIST`) bị gắn cứng hằng số toàn công ty thay vì tính động theo tập `stores` đã phân quyền.
- **Cách khắc phục:**
  1. Loại bỏ điều kiện `>= 69` tại `ExecutiveDashboardReportsView.tsx` và `StorePipelineFunnelOverview.tsx`; sử dụng `filterScopedStores(storePortfolios, currentUser, brands)` từ `rbacScope.ts` để đảm bảo nhân viên/Leader chỉ nhìn thấy các gian hàng và nhãn hàng thuộc phạm vi phụ trách.
  2. Tính động toàn bộ các chỉ số thẻ KPI (`kpiSummary`, `scopedSellerCampaigns`, `scopedSellerCreatives`, `scopedSellerAdsSummary`, `scopedBookedVideos`, `videoKpiSummary`, `sortedKlBreakdown`, `scopedFormatBreakdown`, `scopedVideoTypeBreakdown`, `governanceStats`, `enrichedStaffList`) và các nhãn đếm trên tab/dropdown theo đúng tập `stores` và `filteredStores` của người dùng.
  3. Truyền `allowedStoreNames` xuống `WeeklyAirSyncDashboardSection` và `PlanActualReportView`, đồng thời áp dụng `filterScopedStores(REAL_B2C_69_STORES, currentUser)` cho `storePlanOverview` trong `BookingView.tsx`.
- **Phạm vi rà soát mở rộng sang phần khác:** Đối soát toàn bộ 7 tab trong `ExecutiveDashboardReportsView` (`OVERVIEW_FINANCE`, `STORE_PIPELINE`, `PLAN_ACTUAL`, `STORE_SELLER`, `VIDEO_CREATIVE`, `TEAM_SLA`, `STAFF_EFFICIENCY`) và `BookingView` để đảm bảo tuân thủ `RULE-SYNC-01`.

---


### BUG-055 — Nâng Cấp Toàn Diện Hub Tri Thức Nghiệp Vụ Marketing B2C & Thống Nhất Trải Nghiệm Tra Cứu
- **Ngày phát hiện:** 26/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/MarketingKnowledgeQaView.tsx`, `web-admin/src/lib/marketingKnowledgeDataset.ts`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. Màn hình Tri thức & Hỏi đáp trước đây chỉ có 1 khung chat đặt câu hỏi và danh sách câu hỏi dạng phẳng, thiếu cấu trúc của một Hub tri thức chuyên nghiệp, nhân sự khó tra cứu nhanh các mốc SLA, quy trình chuẩn SOP, khung lương hay kịch bản đàm phán KOC trong thực tế tác nghiệp hàng ngày.
  2. Dữ liệu Lark Base nạp về cần được tổ chức thành các phân khu rõ ràng theo vai trò (Chuyên viên Booking, Sáng tạo Nội dung, Pháp chế & Kế toán, Quản lý) để nhân sự truy cập đúng tài liệu trong 1 chạm.
- **Cách khắc phục:**
  1. Nâng cấp `MarketingKnowledgeQaView.tsx` thành Hub Tri thức 5 Phân khu chuyên biệt:
     - **Tổng quan Hub tri thức (`hub`):** 4 Bento Card định vị 4 trụ cột (18 Chuyên đề, 42 FAQ, 22 SLA, 15 Kịch bản), bộ lọc theo vai trò, bảng 4 SOP cốt lõi, công cụ tính nhanh thuế/lương và lịch các mốc cố định hàng tháng.
     - **Kho tài liệu & Quy trình (`library`):** Bộ đọc chuyên sâu 2 cột với bảng chỉ số, công thức, bảng biểu và khối hành động trực tiếp.
     - **Câu hỏi thường gặp & Kịch bản (`faqs`):** 42 Câu hỏi thường gặp và 15 Kịch bản đàm phán xử lý tình huống thực chiến có nút sao chép nhanh 1-chạm.
     - **Bảng chuẩn SLA & Khung lương (`tables`):** Tra cứu nhanh 22 SLA khẩn cấp, 9 bậc lương KL1–KL7, 8 biểu mẫu pháp lý và công cụ quy đổi Gross/Net.
     - **Hỏi đáp quy trình B2C (`qa`):** Khung hỏi đáp tương tác trực tiếp với 16 gợi ý câu hỏi theo vai trò, trích dẫn SOP và nhận diện thực thể.
  2. Bổ sung **Thanh tìm kiếm tức thời toàn diện (Hero Search)** ở vị trí trên cùng, cho phép tìm kiếm đồng thời trên cả 4 miền dữ liệu và nhảy thẳng đến kết quả.
  3. Tuân thủ tuyệt đối quy chuẩn `GEMINI.md`: Loại bỏ toàn bộ từ ngữ quảng cáo/AI buzzwords, cấm dòng phụ đề xám dưới tiêu đề, đảm bảo giao diện gọn gàng, trực quan và tốc độ cao.
- **Phạm vi rà soát mở rộng sang phần khác:** Đảm bảo toàn bộ các liên kết, bộ lọc và luồng tính toán tương thích 100% với hệ thống phân quyền RBAC và cấu hình API tập trung.

---


### BUG-056 — Nâng Cấp Hub Tri Thức Thành Trung Tâm Học Tập & Khảo Thí Nghiệp Vụ B2C Gắn Liền Dữ Liệu Nhãn Hàng
- **Ngày phát hiện:** 26/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/views/MarketingAcademySection.tsx`, `web-admin/src/lib/marketingLearningEngine.ts`, `web-admin/src/components/views/MarketingKnowledgeQaView.tsx`, `web-admin/src/lib/apiKeyConfig.ts`, `web-admin/src/app/api/integrations/llm/route.ts`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. Người dùng yêu cầu mở rộng sổ câu hỏi và hub tri thức thành một Trung tâm học tập (Learning & Assessment Hub) thực thụ: không chỉ đọc và hỏi đáp thụ động mà nhân viên có thể tham gia các khóa học thực chiến theo lộ trình, làm bài thi sát hạch có tính điểm, và tự động khởi tạo các bộ đề/khóa học mới dựa trên dữ liệu thật của các nhãn hàng (Cathy Doll, ClubClio, Rejuran...).
  2. Cần quản lý cấu hình mô hình cho tính năng này theo đúng `RULE-API-01` (tập trung tại Trung tâm cấu hình API, không lộ prompt trên giao diện người dùng) và `RULE-API-02` (chỉ gọi API khi bấm nút rõ ràng, có luồng xử lý dự phòng `INTERNAL` bám sát dữ liệu thật).
- **Cách khắc phục:**
  1. Xây dựng động cơ `marketingLearningEngine.ts` cung cấp 6 khóa học thực chiến chuẩn (`CRS-PLAN-01`, `CRS-QC-01`, `CRS-LEGAL-01`, `CRS-BRAND-CATHYDOLL`, `CRS-BRAND-CLUBCLIO`, `CRS-NEGOTIATE-01`) và 4 bộ đề sát hạch năng lực có câu hỏi trắc nghiệm & tình huống thực tế bám sát số liệu thật tháng 10/2026 (ngân sách, vi phạm từ cấm, tính thuế Net/Gross).
  2. Phát triển phân hệ `MarketingAcademySection.tsx` tích hợp vào Hub với 3 phân khu: Khóa đào tạo, Ngân hàng đề thi sát hạch và Sổ theo dõi kết quả làm bài.
  3. Xây dựng trình làm bài thi tương tác thời gian thực: chọn đáp án A/B/C/D, nộp bài chấm điểm ngay, hiển thị xếp loại Đạt chuẩn (ngưỡng 80%), giải thích cặn kẽ logic nghiệp vụ và trích dẫn ngược về điều khoản SOP tương ứng.
  4. Đăng ký mục đích nghiệp vụ `TRAINING_EXAM_GENERATION` tại `apiKeyConfig.ts` và bổ sung luồng dự phòng nội bộ tại `/api/integrations/llm/route.ts`, hỗ trợ khởi tạo khóa học & đề thi theo yêu cầu của từng nhãn hàng mà không làm phát sinh lỗi khi máy chủ ngoài quá tải.
  5. Tuân thủ tuyệt đối quy chuẩn giao diện `GEMINI.md`: dùng từ ngữ nghiệp vụ đời thực ("Khởi tạo khóa học", "Bộ đề sát hạch", "Đề thi nghiệp vụ"), loại bỏ hoàn toàn các từ quảng cáo/AI buzzword và cấm dòng phụ đề xám dưới tiêu đề.
- **Phạm vi rà soát mở rộng sang phần khác:** Đảm bảo toàn bộ các liên kết SOP, biểu mẫu hợp đồng và chính sách thuế trong các câu hỏi sát hạch khớp 100% với dữ liệu quy chuẩn tại `marketingKnowledgeBase.ts` và các hồ sơ nhãn hàng trong `realB2cBrandsData.ts`.

---

### BUG-057 — Bổ Sung Phụ Lục Hợp Đồng & SOW, Tối Ưu Khoảng Trắng Giao Diện Và Chuẩn Hóa Khung Xem Văn Bản Hợp Đồng Như Mở Trên Microsoft Word
- **Ngày phát hiện:** 26/10/2026
- **Phân hệ / File liên quan:** `web-admin/src/components/contracts/ContractCatalogView.tsx`, `web-admin/src/components/contracts/ContractDocumentViewer.tsx`, `web-admin/src/components/views/ContractManagementView.tsx`, `web-admin/src/lib/contracts/templates.ts`.
- **Triệu chứng & Nguyên nhân gốc (Root Cause):**
  1. Thiếu nhãn phân loại Phụ lục SOW trên thanh lọc biểu mẫu chuẩn, khiến các biểu mẫu SOW (`IND-SOW`, `HKD-SOW`, `COM-SOW`) bị lẫn hoặc khó lọc riêng.
  2. Thanh lọc `FilterBar` lồng nhiều khối tìm kiếm, bộ chọn và nhãn danh mục tạo ra các khoảng trống dọc (whitespace) quá lớn, đẩy nội dung tài liệu xuống thấp.
  3. Khung hiển thị văn bản hợp đồng chưa mô phỏng trung thực giao diện trang in Microsoft Word (thiếu nền canvas màu ghi chuẩn Word, trang giấy bo góc tròn, thiếu gạch chân Quốc hiệu - Tiêu ngữ, định dạng bảng và chế độ hiển thị bản in).
- **Cách khắc phục:**
  1. Đăng ký nhãn `LIVESTREAM_APPENDIX` là `"Phụ lục hợp đồng & SOW"` trong `CATEGORY_LABELS` và `categoryChips`. Chuẩn hóa hàm `getTemplateCategory` nhận diện đúng các mẫu SOW. Thêm khối liên kết hai chiều tự động chuyển nhanh giữa HĐNT (`IND-HDNT`, `HKD-HDNT`, `COM-HDNT`) và Phụ lục SOW tương ứng (`IND-SOW`, `HKD-SOW`, `COM-SOW`).
  2. Tái cấu trúc thanh công cụ quản lý biểu mẫu thành 2 hàng gọn gàng: Hàng 1 (Tìm kiếm nhanh + Lọc nguồn + Nút tải mẫu/thêm mẫu), Hàng 2 (Nhãn lọc danh mục), triệt tiêu hoàn toàn khoảng trắng chết. Giảm khoảng cách bao quanh trong `ContractManagementView.tsx`.
  3. Nâng cấp toàn diện `ContractDocumentViewer.tsx` theo chuẩn Microsoft Word:
     - Nền canvas làm việc màu ghi xám `#eaedf1` đặc trưng của Microsoft Word desktop.
     - Khổ giấy chuẩn tỷ lệ A4 (`max-w-[816px]`, `min-h-[1056px]`), góc vuông sắc nét (`rounded-none`), đổ bóng drop shadow và đường viền trang giấy 1px thanh mảnh chuẩn Word.
     - Tiêu chuẩn văn bản hành chính Việt Nam: Font chữ Times New Roman, cỡ chữ chuẩn, line-height 1.6, Quốc hiệu in hoa đậm, Tiêu ngữ có đường gạch chân đen dài 144px (`w-36 h-[1.5px] bg-black mx-auto mt-1 mb-5`), tiêu đề hợp đồng/phụ lục in hoa canh giữa.
     - Đường chỉ tóc (hairline) ngăn cách vùng Đầu trang (Header) và Chân trang (Footer) theo chuẩn hiển thị Word.
     - Bảng thông tin các bên không viền, căn lề 2 chấm (`:`) thẳng hàng; bảng dịch vụ có viền đen sắc nét, nền tiêu đề xám nhạt `#f2f2f2`; khối ký tên 2 cột cách đáy 72px chừa chỗ ký tay/đóng dấu.
     - Nút chuyển chế độ xem: "Đang đánh dấu chỗ điền" (highlight bút dạ quang màu vàng `#fff7b2` chuẩn Word) và "Bản in Word chuẩn" (văn bản sạch để in/xuất PDF với dấu chấm chừa chỗ).
- **Phạm vi rà soát mở rộng sang phần khác:** Đã đối soát trên cả chế độ xem nhanh danh sách (`Xem HĐ`), chế độ xem mẫu catalog (`Văn bản A4`) và chế độ in trực tiếp (`handlePrint`), đảm bảo hiển thị đồng nhất. Kiểm tra biên dịch `tsc --noEmit` và `npm run build` thành công 100%.

---

## 3. Quy trình cập nhật Sổ đăng ký lỗi (Bắt buộc)

Mỗi khi người dùng phản ánh một lỗi mới hoặc trợ lý phát hiện bất thường trong quá trình kiểm tra:
1. **Sửa triệt để tại nơi phát sinh** và **rà soát ngay các màn hình tương tự** xem có mắc cùng mẫu lỗi (pattern) đó không.
2. **Ghi bổ sung mã `BUG-00X`** vào Mục 2 của tài liệu này kèm đầy đủ: *Triệu chứng*, *Nguyên nhân gốc*, *Cách khắc phục* và *Phạm vi rà soát mở rộng*.
3. Nếu lỗi đại diện cho một nhóm rủi ro mới, bổ sung quy tắc `RULE-...` vào Mục 1 để làm tiêu chuẩn kiểm tra bắt buộc cho các lần phát triển tiếp theo.
