# SỔ ĐĂNG KÝ LỖI HỆ THỐNG & QUY TẮC PHÒNG NGỪA TÁI PHÁT — B2C OPS HUB

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | HUB-GOV-04 |
| Dự án | B2C Ops Hub — Quản trị & Điều hành phòng Marketing B2C |
| Trạng thái | Đang dùng (Sổ ghi liên tục — Bắt buộc đối chiếu khi sửa lỗi & phát triển tính năng) |
| Cập nhật | 20/10/2026 |

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

## 3. Quy trình cập nhật Sổ đăng ký lỗi (Bắt buộc)

Mỗi khi người dùng phản ánh một lỗi mới hoặc trợ lý phát hiện bất thường trong quá trình kiểm tra:
1. **Sửa triệt để tại nơi phát sinh** và **rà soát ngay các màn hình tương tự** xem có mắc cùng mẫu lỗi (pattern) đó không.
2. **Ghi bổ sung mã `BUG-00X`** vào Mục 2 của tài liệu này kèm đầy đủ: *Triệu chứng*, *Nguyên nhân gốc*, *Cách khắc phục* và *Phạm vi rà soát mở rộng*.
3. Nếu lỗi đại diện cho một nhóm rủi ro mới, bổ sung quy tắc `RULE-...` vào Mục 1 để làm tiêu chuẩn kiểm tra bắt buộc cho các lần phát triển tiếp theo.
