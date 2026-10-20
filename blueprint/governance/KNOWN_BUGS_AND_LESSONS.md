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

## 3. Quy trình cập nhật Sổ đăng ký lỗi (Bắt buộc)

Mỗi khi người dùng phản ánh một lỗi mới hoặc trợ lý phát hiện bất thường trong quá trình kiểm tra:
1. **Sửa triệt để tại nơi phát sinh** và **rà soát ngay các màn hình tương tự** xem có mắc cùng mẫu lỗi (pattern) đó không.
2. **Ghi bổ sung mã `BUG-00X`** vào Mục 2 của tài liệu này kèm đầy đủ: *Triệu chứng*, *Nguyên nhân gốc*, *Cách khắc phục* và *Phạm vi rà soát mở rộng*.
3. Nếu lỗi đại diện cho một nhóm rủi ro mới, bổ sung quy tắc `RULE-...` vào Mục 1 để làm tiêu chuẩn kiểm tra bắt buộc cho các lần phát triển tiếp theo.
