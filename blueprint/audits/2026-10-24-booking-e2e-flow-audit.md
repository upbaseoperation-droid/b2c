# Audit luồng Booking E2E — 2026-10-24

Phạm vi: Plan tháng → Listing KOC → Brand duyệt → Deal/Job → Hợp đồng → Air/Ads → Nghiệm thu → Thanh toán Lark, cộng phân quyền và nhất quán dữ liệu xuyên suốt. Đối chiếu với `Quy trình Booking - Tech.md`, `Quy trình Quản lý hợp đồng Booking.md`, SRS 2.1. Chỉ đọc code tại commit `07415ba` (lưu ý: trong lúc audit có 6 file đang được sửa dở ngoài phiên: `deal-board/route.ts`, `payment-requests/route.ts`, `pull-sheet/route.ts`, `PlanDealBoard.tsx`, `dealBoardRules.ts`, `ManagerDelegationHub.tsx` — số dòng ở các file này có thể lệch).

Đường dẫn tính từ `web-admin/src`. ✅ = đã kiểm chứng lại trực tiếp sau khi agent báo.

Kiểm tra tự động: `tsc --noEmit` sạch. `npm test` 83/86 qua; 3 test fail đều thuộc hợp đồng (`contract-templates.test.ts` mong 8 mẫu gốc nhưng có 25/26; test "Thiếu khóa phiên chỉ mở kho thử trình duyệt").

## Vấn đề gốc (đọc trước)

Gần như mọi lỗi nặng quy về 3 nguyên nhân:

1. **Máy chủ tin dữ liệu client.** Listing, deal-board, payment-requests, contracts đều ghi nguyên khối những gì client gửi; luật nghiệp vụ (chuyển trạng thái, duyệt Pháp chế/Kế toán, nghiệm thu, thanh toán) chỉ nằm ở UI.
2. **Dữ liệu giả/mặc định chảy vào luồng thật.** STK/CCCD mẫu, link HĐ/BBNT tự sinh, số liệu UpAffiliate bịa, "thành công" giả khi Lark lỗi.
3. **Tiền tính sai ở chỗ nối giữa các chặng.** DROPPED cộng thay vì trừ, VAT cộng 2 lần, tất toán không trừ tạm ứng, deal bị nhân đôi.

## Mức Cao

### Bảo mật & phân quyền
| # | Lỗi | Vị trí |
|---|---|---|
| S1 ✅ | Đăng nhập sandbox mở mặc định (chỉ chặn khi `BLOCK_SANDBOX_LOGIN=true`), `/api/auth/*` không cần phiên → ai cũng lấy được phiên ADMIN; POST nhận `staffOverrides` mở khóa `canLogin`. Cần xác minh env production. | `app/api/auth/lark/sandbox/route.ts:12,178`, `middleware.ts:15-21` |
| S2 ✅ | Khóa ký phiên rơi về chuỗi cố định trong mã nguồn nếu thiếu `AUTH_SECRET`/`SESSION_SECRET` → giả mạo cookie bất kỳ ai. | `lib/larkAuth.ts:303-308` |
| S3 ✅ | PATCH phiếu thanh toán không kiểm vai trò/đối tác, nhận `nextStatus` tùy ý → MEMBER/BRAND_PARTNER đặt thẳng `PAID`, bỏ qua Giám đốc & Kế toán, hoặc lùi trạng thái. Không có `REJECTED`, không đọc trạng thái từ Lark về. | `app/api/integrations/larkbase/payment-requests/route.ts:558-614` |
| S4 | Phiếu thanh toán dựng hoàn toàn từ `deals`/`kocs` client gửi (cả STK), không đối chiếu deal-board, không kiểm phạm vi brand, `actorName` từ client. | `payment-requests/route.ts:174-260` |
| S5 ✅ | Webhook booking-plans: thiếu header secret vẫn qua; mọi phiên (kể cả BRAND_PARTNER) ghi đè được kế hoạch tháng với status `APPROVED`, `isVersionLocked`, bỏ qua luồng duyệt và revision. | `app/api/integrations/larkbase/booking-plans/route.ts:43-50`, `lib/.../larkbaseBookingPlanSync.ts:600-603,666-669,735+` |
| S6 | PIC tự đặt `legalReviewStatus`/`financeReviewStatus=APPROVED`, `acceptance.status=PASSED`, `leadConfirmedBy`, `payment.status=PAID` — server không kiểm vai trò, không nối với bản ghi duyệt thật ở `/api/contracts`. | `app/api/deal-board/route.ts:86-115`, `lib/dealBoardRules.ts:1094-1130`, `PlanDealBoard.tsx:1727-1875` |
| S7 | Phạm vi quyền khớp theo **tên hiển thị** (danh bạ có 52 tên trùng, vd "Bùi Phương Linh" HN509/HN374) — trái quy tắc khóa theo mã nhân sự. Override/SUSPENDED theo tên; `matchPersonName` khớp chuỗi con. | `lib/rbacScope.ts:57-62`, `lib/server/accessPolicy.ts:204-208`, `monthlyPlanStore.ts:284`, `lib/larkAuth.ts:235` |

### Listing (chặng 1)
| # | Lỗi | Vị trí |
|---|---|---|
| L1 ✅ | PUT listing ghi đè nguyên mảng, không kiểm chuyển trạng thái/giá/KL; plan DRAFT vẫn chốt được. | `app/api/listing-board/route.ts:35-55` |
| L2 ✅ | DRAFT/WAIT_BRAND kéo thẳng sang CONFIRMED ("Chốt thẳng") tự gán `BRAND_APPROVED`+`TERMS_AGREED`, không kiểm điều kiện FOC/KOL chỉ định. DROPPED→NEGOTIATING gán `BRAND_APPROVED` bằng tên nhân viên. | `lib/listingBoardRules.ts:29-35,80-100`, `PlanListingBoard.tsx:889-898` |
| L3 | Sửa `proposedFee`/`finalFee`/KL ở mọi cột kể cả CONFIRMED mà không trình lại Brand (vi phạm bước 17/19). | `PlanListingBoard.tsx:457-475` |
| L4 | Pull-sheet ghi đè giá vô điều kiện, cả item đã chốt; `parseFeeCell("5tr + 10% hoa hồng")` → 510đ. | `app/api/booking-list/pull-sheet/route.ts:180-183` |
| L5 | Trình lại Brand kẹt vĩnh viễn: không xóa `lastSheetDecision`, không xóa ô "Brand duyệt" trên sheet → "Yes" cũ đứng cạnh giá mới. | `listingBoardRules.ts:520-523`, `googleSheets.ts:109` |
| L6 | Brand từ chối KOC đã chốt: listing bỏ qua nhưng content plan gỡ KOC khỏi slot mỗi lần pull → hai bảng lệch, thao tác tay bị ghi đè. | `listingBoardRules.ts:551`, `pull-sheet/route.ts:230` |

### Deal / Job (chặng 2)
| # | Lỗi | Vị trí |
|---|---|---|
| D1 ✅ | Commit `07415ba` **gỡ chốt chặn HĐNT ở máy chủ** → tạo deal có phí khi KOC chưa có HĐNT. Trái SRS 2.1 dòng 70. Cần chốt lại nghiệp vụ. | `app/api/deal-board/route.ts:82-111`, `dealBoardRules.ts:1080-1091` |
| D2 ✅ | Deal bị nhân đôi mỗi lần lưu: lọc tiền tố `planjob-` nhưng id sinh ra là `PJ-…` → tổng chi, đếm pipeline, cảnh báo vượt ngân sách đều sai. | `app/page.tsx:778`, `lib/planDealLink.ts:102` |
| D3 ✅ | STK `19036829104018`, CCCD `001099012345`, ngân hàng Techcombank làm mặc định khi Job thiếu thông tin thụ hưởng, kèm `hasIdCardScan:true` → ĐNTT đi Kế toán với STK không phải của KOC. | `PlanDealBoard.tsx:801-804` |
| D4 ✅ | DROPPED bị **cộng** vào giá trị deal (`contractDisplayValue + droppedNet`) thay vì trừ. | `planDealLink.ts:132`, `PlanDealBoard.tsx:792` |
| D5 | Phí/phụ lục sửa được sau khi ký hoặc đã đề nghị thanh toán; server không so với bản cũ. | `PlanDealBoard.tsx:1366,1686-1695`, `deal-board/route.ts` |
| D6 | "Đồng bộ UpAffiliate" lưu số liệu bịa (views 18500, GMV = phí×2.8) vào Job → ROI và xếp B5 sai. | `PlanDealBoard.tsx:621-647` |

### Hợp đồng
| # | Lỗi | Vị trí |
|---|---|---|
| C1 ✅ | Bỏ qua Pháp chế dù sửa điều khoản: server lấy `requireLegal` từ body, `false` ghi đè `hasCustomTerms`. | `app/api/contracts/route.ts:100`, `lib/contracts/domain.ts:55` |
| C2 | CREATOR tự phát hành "mẫu riêng KOC" với `exemptLegalReview`/`approvedByLegal` lấy từ body. | `app/api/contracts/templates/[id]/route.ts:43-45,75-99`, `lib/contracts/templates.ts:760` |
| C3 | VAT cộng 2 lần cho Công ty: `contractDisplayValue` đã gồm VAT rồi `calculateContractTax` cộng tiếp (10% ở prefill, 8% ở phiếu Lark — hai mức lệch nhau). Net 30tr → 35,64tr. | `planDealLink.ts:132`, `dealBoardRules.ts:510`, `components/contracts/contractUi.ts:180-187`, `larkPaymentRequestEngine.ts:363,407` |

### Nghiệm thu & Thanh toán
| # | Lỗi | Vị trí |
|---|---|---|
| P1 | Tất toán không trừ tạm ứng (cả từ deal board lẫn màn 3.2) và không chống gửi lặp → BO 10tr đã ứng 5tr bị đề nghị 10tr, gửi lại thêm 10tr. | `PlanDealBoard.tsx:790,849`, `approvedBookingList.ts:977,1025`, `larkPaymentRequestEngine.ts:394-399,480` |
| P2 | Chặn cứng BR-03/BR-04 bị vượt bằng dữ liệu tự sinh: có ngày air ⇒ phụ lục "ĐÃ_KÝ", link HĐ/BBNT tự dựng. | `approvedBookingList.ts:473-480,1008-1038`, `larkPaymentRequestEngine.ts:436-439` |
| P3 | Nút "Điền nhanh hồ sơ mẫu chuẩn" bịa toàn bộ chứng từ + STK/CCCD, hiện cho mọi người, mọi môi trường. | `components/booking/LarkPaymentRequestModal.tsx:210-242,736-744` |
| P4 ✅ | Thiếu cấu hình Lark hoặc Lark lỗi (`catch {}`) vẫn trả 201 "đã đồng bộ" + mã instance giả; client chuyển deal sang `FINAL_PAID`. Phiếu chỉ lưu trong bộ nhớ, mã `size+1` trùng giữa instance. | `payment-requests/route.ts:300-312,461,535` |
| P5 | Phiếu gom nhiều KOC chuyển toàn bộ tiền vào STK của `deals[0]`; màn 3.2 ghi đè STK/CCCD và số tiền tổng phiếu lên từng dòng. | `larkPaymentRequestEngine.ts:721-763`, `ApprovedBookingListView.tsx:1267-1276` |

## Mức Trung bình (tóm tắt)

- **Listing:** Brand "Yes" muộn làm sống lại KOC rớt vì lý do khác (`listingBoardRules.ts:532-537`); mã Brief push/pull lệch nhau → KOC làm 2 video nhận cùng quyết định (`bookingList.ts:125`, `pull-sheet:157`); push-sheet bỏ sót video thứ 2 cùng KOC (`push-sheet:90`); mã pipeline 2.x/3.x/4.1/4.2/5.4 không bao giờ đạt, 5.1/6.2 gán sai so với spec (`listingBoardRules.ts:709-781`); ngân sách & KL chỉ cảnh báo.
- **Deal:** chuyển bước pipeline 5 bước không điều kiện, chỉ lưu client (`BookingView.tsx:254-296`); Job thật chỉ sinh `TERMS_AGREED` → nằm mãi ở B1 (`planDealLink.ts:123-128`); Job hủy/REPLACED vẫn bị cộng tiền (`dealBoardRules.ts:463,851,1630`); cùng kênh tạo được Deal thứ 2 (`PlanDealBoard.tsx:3133,3171`); List KOC không biết KOC đã có Deal; Air/mã Ads không phụ thuộc bước trước, khóa 7 ngày chỉ ở UI; hai thước đo ngân sách khác nhau (Net vs gồm VAT) và so chi nhiều tháng với trần 1 tháng; `storeAirPlanData.ts:509` cộng `orders14d + orders30d`.
- **Hợp đồng:** SOW gắn được vào HĐNT của KOC khác/bản nháp (`ContractForm.tsx:369`); `documentsOfJob` chọn bản mới nhất thay vì bản đã ký, fallback theo tên (`planDealLink.ts:249-254`); `advanceAmount: 0` gán cứng nên BR-03 tạm ứng không kích hoạt (`planDealLink.ts:136`); ngưỡng TNCN 2tr so trên Net và theo từng đợt (`contractRules.ts:394`) — cần đối chiếu BR-09; `hasDiscrepancy` luôn false (`ContractDetail.tsx:316-318`); Kế toán duyệt được trước Pháp chế (`domain.ts:81-86`).
- **Nghiệm thu/Thanh toán:** khóa sổ tháng chỉ hiển thị, `closingState.mode` từ client, mốc là ngày 2 dương lịch UTC thay vì ngày làm việc thứ 2 (`dealBoardRules.ts:590-636`); màn 3.2 không gọi `jobPaymentBlocker`; `adsCodeStatus` mặc định `ĐÃ_NGHIỆM_THU` nên addon chưa nghiệm thu lọt; server giữ xác nhận nghiệm thu khi đổi link air; tạm ứng lập lặp được; GET phiếu trả STK/CCCD đầy đủ cho mọi nhân sự; phiếu mẫu có CCCD/STK luôn được nạp.
- **Xuyên suốt:** sổ HĐNT ai cũng đọc/sửa STK của mọi KOC, không revision (`koc-framework/route.ts`); pull/push sheet dùng link client gửi, không đối chiếu `sheetUrl` của plan; 409 ba lần vẫn trả `ok:true`, push ghi Sheet trước listing; deal đọc tháng/gian từ plan hiện tại, `LOCKED_FIELDS` không khóa `month/storeName/brandName`; mã plan cắt 10 ký tự → hai gian cùng brand trùng `PLAN-2026-10-KUTIESKINM`; phạm vi hợp đồng từ `CONTRACT_ACCESS_JSON` thay vì Dữ liệu gốc; tên Leader/Giám đốc và tháng `2026/10` gắn cứng; gian chứa "mine" (Jasmine, Mineral) bị gán nhầm Leader.

## Bước trong quy trình chưa có trên hệ thống

- B12 audit nội bộ list KOC; B14/16/18 ghi phản hồi & xác nhận giá của KOC (chỉ có nút chuyển cột).
- B20 nhóm hợp tác; B23–29 KOC duyệt HĐ, trình ký, Kế toán tạo HĐ, Leader/CEO ký (không có bước CEO).
- B37 Content audit tách khỏi feedback vòng 1; B40–42 xếp & xác nhận lịch air; B44–45 trạng thái xin/nhận mã Ads.
- Theo dõi hiệu quả 14/30/60 ngày: chưa được audit.

## Thứ tự sửa đề xuất

1. **Chặn rủi ro tiền & bảo mật ngay:** S1, S2 (kiểm env production), S3, P3, D3, P4 (không báo thành công giả), S5.
2. **Đúng tiền:** D2, D4, C3, P1, P5.
3. **Đưa luật lên server:** L1/L2, S6, C1/C2, D1 (sau khi chốt nghiệp vụ HĐNT), D5.
4. **Định danh theo mã nhân sự:** S7.
5. Các mục Trung bình và bước còn thiếu.
