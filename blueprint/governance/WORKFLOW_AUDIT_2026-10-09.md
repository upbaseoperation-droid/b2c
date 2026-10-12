# Audit độ đầy đủ luồng làm việc B2C

Ngày rà soát: 09/10/2026. Phạm vi: tài liệu hiện hành và mã prototype trong B2C. Không kiểm thử giao diện, tích hợp thật hoặc hệ thống UpAffiliate; không xác nhận trạng thái triển khai thực tế.

## Kết luận

**Chưa đủ để vận hành xuyên suốt.** Có khung nghiệp vụ và nhiều màn hình minh họa, nhưng chưa chứng minh được luồng từ phân công → nhận dữ liệu → xử lý cảnh báo → chốt báo cáo → đánh giá có đầu vào, người chịu trách nhiệm, điều kiện chuyển bước và bằng chứng hoàn tất đầy đủ.

Theo DEC-001, Ops Hub phụ trách điều hành; UpAffiliate phụ trách booking; Lark phụ trách plan Growth/phê duyệt chi. Thiếu màn hình booking trong Ops Hub không phải thiếu phạm vi; thiếu bàn giao dữ liệu giữa các hệ thống mới là khoảng trống cần đóng.

Sổ đăng ký vẫn ghi chưa đạt G1; cả 9 BR đều là đề xuất, ma trận truy vết chưa có FR/US/TC. Đây là trạng thái hồ sơ được tìm thấy, không phải khẳng định các cuộc họp hay công việc ngoài repo chưa diễn ra.

## Ma trận luồng

| Luồng | Bằng chứng hiện có | Phần chưa đủ / cần xác nhận |
| --- | --- | --- |
| Tiếp nhận store và xác định phạm vi dịch vụ | BR-05/06; StoresView, ManagerDelegationHub | Tiêu chí kích hoạt, thay đổi scope giữa tháng, tạm dừng/kết thúc store và ảnh hưởng tới mục tiêu |
| Phân công owner/backup và bàn giao | BR-06; types có backup và lịch sử phân công | Quy trình nhận bàn giao, thời điểm hiệu lực, chuyển việc đang mở, trả quyền khi owner quay lại; có kiểu dữ liệu chưa chứng minh luồng hoàn tất |
| Workload/capacity và điều phối | BR-05; P3 có hệ số store | OI-008 chưa chốt công thức; thiếu ngưỡng và quy tắc quyết định điều phối theo tải; không thể coi điểm P3 là capacity đã được duyệt |
| Plan tháng và điều chỉnh | MonthlyPlanHub có tạo/clone/trình trạng thái | Ranh giới plan Growth/plan chi tiết; xử lý tăng giảm ngân sách sau duyệt; lịch list Đợt 1 ngày 10/T−1 mâu thuẫn với plan Growth chốt ngày 25/T−1 trong As-is |
| Nhận dữ liệu thực thi từ UpAffiliate/Lark | BR-02/07 và DEC-001/005 | Đặc tả tích hợp HUB-2.5 chưa tạo; nguồn tạm khi UpAffiliate chưa chạy (OI-013); nhận lại sự kiện, dữ liệu trễ/sai/thiếu và đối soát |
| SLA → cảnh báo → xử lý → đóng | BR-01/02; SlaTask và SLA config trong prototype | OI-002: định nghĩa chính thức; quy tắc giờ làm việc, chờ brand/KOC, chuyển trách nhiệm, escalation, xác nhận đã xử lý; cấu hình trong mã chưa thay thế phê duyệt nghiệp vụ |
| Brand/Content và bàn giao liên phòng ban | Có BrandView, ContentView và quy trình booking | OI-015: khảo sát chưa hoàn tất theo hồ sơ; thiếu quy trình mục tiêu đã xác nhận cho Brand/Content/Growth/Design/Media |
| Báo cáo tuần/tháng và chốt số | BR-07; dashboard có xuất Excel | OI-004: ai lập/duyệt/gửi; OI-003: chỉ số và nguồn; cutoff, đối soát, khóa kỳ, sửa số sau khóa và phiên bản báo cáo |
| Đánh giá kết quả/năng lực | BR-04/08; PerformanceP3View | OI-016/006: tiêu chí và chính sách; phản hồi số sai, duyệt điều chỉnh, bằng chứng năng lực; staffRecords khởi tạo từ MOCK_P3_STAFF_RECORDS |
| Ngoại lệ và kết thúc công việc | Quy trình Booking - Tech có trả lỗi chứng từ/nghiệm thu | Chuẩn hóa hủy job, thay KOC, thiếu hàng, trễ duyệt, thanh toán trước, urgent, air sai/gỡ video; thống nhất điều kiện đóng và dữ liệu trả về Hub |

## Điểm đứt cụ thể trong prototype

1. **Dữ liệu nghiệp vụ chưa có lưu trữ xuyên phiên ở luồng chính.** `src/app/page.tsx:213` khởi tạo KOC/deal/task/store bằng `useState` từ `INITIAL_*`; các handler plan/deal cập nhật state. Chưa thể dùng luồng này làm nguồn vận hành cho nhiều người và nhiều kỳ. Auth đã có API riêng; không kết luận toàn hệ thống không có backend.
2. **Duyệt plan có thể làm sai trạng thái.** `handleApproveEntirePlanFromLead` lọc theo `staffName`, không ràng buộc kỳ hoặc trạng thái trước đó, nên có thể đổi dòng `CONVERTED` thành `APPROVED`. Cần chỉ duyệt các dòng đúng kỳ, đang chờ duyệt; bảo vệ dòng đã tạo deal.
3. **Tạo deal vượt qua bằng chứng duyệt/ký.** `handleConvertPlanItemToDeal` tự gán `brandApprovalStatus: 'ĐÃ_DUYỆT'`, `status: 'CONTRACT_GENERATED'` nhưng nhãn `Đã Ký HĐ`. Chưa kiểm tra chứng cứ brand duyệt và chữ ký trong handler. Cần tách tạo hợp đồng, ký đủ và duyệt brand thành các mốc có bằng chứng.
4. **Dashboard chưa chứng minh số liệu cùng nguồn.** `ExecutiveDashboardReportsView` có cả tính từ deal và các bảng staff/video/tuần với dữ liệu định sẵn; xuất Excel không đồng nghĩa báo cáo đã đối soát. P3 dùng bản ghi mock riêng.
5. **Tài liệu chưa đồng nhất với mã.** README/DEC-002 mô tả prototype chưa có đăng nhập, trong khi hiện có auth Lark và OI-005 ghi đã triển khai sandbox. DEC-002 vẫn là đề xuất, DEC-005 chưa duyệt. Cần cập nhật trạng thái theo bằng chứng và giữ rõ ranh giới thử nghiệm/sản phẩm.

Các điểm trên là đọc mã tĩnh; chưa tái hiện bằng thao tác trình duyệt.

## Thứ tự hoàn thiện đề xuất

**P0 — chốt nghiệp vụ trước thiết kế:** gán owner; chọn phạm vi kỳ đầu; hoàn tất Brand/Content/liên phòng ban; thống nhất lịch plan/list; duyệt SLA, 5–7 chỉ số, workload và ranh giới báo cáo. Đối chiếu toàn bộ các issue ghi G1, không chỉ 7 issue in đậm: OI-004/007/008/011/014/016 cũng ghi G1 ở từng dòng.

**P1 — đặc tả từng bàn giao:** mỗi luồng cần trigger, input, PIC, người duyệt, trạng thái, điều kiện chuyển bước, deadline, output, ngoại lệ và bằng chứng. Xác định nguồn dữ liệu chính, mã store/người/job chung và cách đối soát giữa Hub/UpAffiliate/Lark. Không biến đề xuất audit thành yêu cầu đã duyệt.

**P2 — chứng minh bằng kịch bản nghiệm thu:**

1. Một store trong một kỳ: phân công → nhận dữ liệu thực thi → cảnh báo → xử lý → báo cáo có truy vết → chốt kết quả.
2. Owner nghỉ giữa kỳ: backup nhận việc và quyền, SLA không mất, kết quả ghi đúng người, hoàn trả quyền có lịch sử.
3. Brand duyệt chậm/KOC trễ: phân biệt thời gian chờ và thời gian xử lý nội bộ, escalation có người nhận, có bằng chứng đóng.
4. Sửa nguồn sau khóa kỳ: mở điều chỉnh có duyệt, tính lại có phiên bản, báo cáo/P3 cùng bộ số.
5. Job hủy/thay KOC/thiếu hàng: cập nhật mục tiêu, chi phí, tải việc và SLA thống nhất qua các hệ thống.
6. Duyệt/tạo deal lặp lại hoặc nhận sự kiện trùng: không tạo deal trùng, không lùi trạng thái đã hoàn tất.

Đủ luồng khi các kịch bản trong phạm vi phát hành được owner xác nhận và chạy đạt trên dữ liệu lưu bền, với quyền đúng vai trò; chưa cần đưa toàn bộ P2/P3, AI hay leaderboard vào kỳ đầu.

## Nguồn

- `README.md`; `blueprint/README.md`.
- `blueprint/1-requirements/1.3_AS_IS_CURRENT_STATE.md`, `1.7_BRD_OPS_HUB.md`.
- `blueprint/governance/DECISION_LOG.md`, `OPEN_ISSUES.md`, `TRACEABILITY.md`.
- `Quy trình Booking - Tech.md` (đặc biệt chặng chứng từ/nghiệm thu).
- `web-admin/src/app/page.tsx`, `src/lib/types.ts`, `src/lib/enterpriseMasterConfig.ts`.
- Các view MonthlyPlanHub, StoresView, ManagerDelegationHub, PerformanceP3View, ExecutiveDashboardReportsView.

## Tự kiểm tra chất lượng audit

| Tiêu chí | Điểm / 5 | Bằng chứng và giới hạn |
| --- | --- | --- |
| Chính xác | 4 | Phân biệt tài liệu/mã và trạng thái thật; chưa tái hiện lỗi UI |
| Đầy đủ | 4 | Bao phủ chu kỳ điều hành và ngoại lệ; chưa audit repo UpAffiliate hoặc phỏng vấn PIC |
| Rõ ràng | 4 | Có ma trận và ưu tiên; chi tiết giao dịch cần kiểm tra tiếp ở dự án sở hữu |
| Khả thi | 4 | Có thứ tự và 6 kịch bản nghiệm thu; owner/thời hạn cần người phụ trách quyết |
| Ngắn gọn | 4 | Kết luận tách khỏi phụ lục bằng chứng; có thể rút thành agenda workshop |

Trung bình: 4,0/5. Cải thiện ưu tiên: tái hiện các lỗi trạng thái; đối chiếu bàn giao với UpAffiliate; xác nhận khoảng trống với owner. Người dùng có cơ sở đánh giá kết luận, nhưng chưa nên coi đây là chứng nhận vận hành thực tế.
