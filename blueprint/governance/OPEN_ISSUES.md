# OPEN ISSUES — B2C OPS HUB

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | HUB-GOV-02 |
| Dự án | B2C Ops Hub |
| Trạng thái | Đã đóng toàn bộ điểm nghẽn G1/G2 — Vận hành theo `DEC-011` |
| Cập nhật | 31/10/2026 (Đã kiểm chứng & chốt toàn bộ luồng quy trình nền tảng 6 chặng qua `/grill-me` — `DEC-011`) |

Nguồn: `B2C/Pain point Marketing B2C.xlsx` (Sheet1, Sheet3, Sheet5, *Khảo sát nhân viên*), [HUB-1.6 Mục tiêu vận hành](../1-requirements/1.6_OPERATING_GOALS.md) mục "Việc cần xác nhận", rà soát 30/09/2026.

**Chặn G1** = phải đóng trước khi duyệt BRD Ops Hub.

## 1. Phạm vi và người quyết

| Mã | Câu hỏi | Vì sao quan trọng | Chặn | Hỏi ai | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| OI-001 | Ai là **chủ dự án** và **owner nghiệp vụ** của Ops Hub? | Không có người duyệt thì không qua cổng | **G1** | Ban giám đốc | **Đã xác định trong RACI (`HUB-1.2`)**: Sponsor: CEO Đỗ Văn Giang · Owner nghiệp vụ: GĐ Khối MKT B2C Đặng Thị Yến Nhi (Chờ ký biên bản cổng) |
| OI-010 | Trong các mục tiêu ngắn hạn của HUB-1.6, **chọn 3 mục tiêu ưu tiên** nào cho kỳ tới; mục nào lùi? | Quyết định phạm vi phát hành đầu | **G1** | Giám đốc khối | **Đã chốt phạm vi phát hành (`DEC-007`)**: Ưu tiên (1) Kế hoạch tháng 69 gian & Phân bổ PIC, (2) Listing → Deal → Nghiệm thu 2 bước & Hợp đồng WeSign, (3) Cockpit SLA & Workload/P3 |
| OI-014 | Có giữ tính năng **AI nhận xét nhân viên** (có trong prototype)? Nếu có: ai xem, ai chịu trách nhiệm kết luận, dữ liệu nào được gửi tới nhà cung cấp AI? | Đụng tới đánh giá nhân sự và dữ liệu cá nhân | G1 | Giám đốc khối, HR | **Đã kiểm soát bảo mật (`FR-062`, `NFR-04`, `DEC-008`)**: Chỉ vai trò Quản trị sửa được Prompt; cấm gửi PII (CCCD, STK, SĐT) sang LLM bên ngoài |
| OI-015 | Khảo sát quy trình Brand, Content và liên phòng ban (Growth, Design, Media) chưa xong | As-is chưa đủ để viết BRD | **G1** | Theo kế hoạch Sheet5 tuần 28/09–02/10 | **Đã hoàn tất & Chuẩn hóa (`HUB-1.2 v1.1`, `HUB-2.1 §2.3`)**: Đã chuẩn hóa 3 vị trí cấp Brand (`Content/Brand main`, `Plan/Strategy`, `KV/SIS`) & quy trình 0 → 18 (`FR-018`) |
| OI-011 | Nguyên nhân gốc của lần **tách team Content và Booking** trước đây không thành công là gì? | Tránh lặp lại khi thiết kế phân công | G1 | Giám đốc khối, nhân sự cũ | **Đã giải quyết trong thiết kế (`FR-013`, `FR-017`)**: Tách rõ phân bổ cấp Brand (3 vị trí) và cấp Gian hàng, kèm phân quyền sửa dòng Content theo PIC |

## 2. SLA và chỉ số

| Mã | Câu hỏi | Vì sao quan trọng | Chặn | Hỏi ai | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| OI-002 | Danh sách **SLA chính thức** là gì? Hiện SLA nằm rải rác ở file của nhân viên và quản lý, có SLA mâu thuẫn, chưa đủ. | Ops Hub đo SLA; không thể đo khi định nghĩa chưa thống nhất | **G1** | Nguyễn Thị Ngọc Tâm; `B2C/Các SLA B2C.pdf` | **Đã chuẩn hóa & Triển khai (`DEC-010`, `DEC-011`, `FR-002`, `FR-083`)**: Đo SLA Brand duyệt 48h trên Google Sheet 57 cột, hạn nghiệm thu 7 ngày làm việc sau Air & khóa sổ ngày làm việc thứ 3 đầu tháng `T+1` (`WORKDAY(EOMONTH(AirDate,0),3)`) |
| OI-003 | Chọn **5–7 chỉ số** điều hành nào (đề xuất từ khảo sát: tiến độ air video, tiến độ gửi báo cáo, tiến độ gửi list duyệt, chủ động nghiệm thu…)? Công thức, mẫu số, thời điểm chốt? | Lõi của BRD Ops Hub | **G1** | Giám đốc khối, Lead | **Đã triển khai Dashboard điều hành 7 tab phẳng (`HUB-2.1 §2.2`, `DEC-011`)**: Trọng tâm kiểm soát **Giải ngân chậm (`Under-spend`: `< 50%` báo đỏ, `< 80%` giải trình, chi `0đ` không gắn nhãn "Trong hạn mức")**, **Chi ngoài kế hoạch (`Unbudgeted Spend`)**, Kế hoạch & Thực thi tuần, Tiến độ 69 gian hàng, Hiệu quả video Paid/FOC, Lịch đăng video & Hiệu suất nhân sự |
| OI-009 | **Số gốc** hiện tại: trễ air, thời gian duyệt, lỗi nghiệm thu, chi phí, workload | Không có số gốc thì không đặt mục tiêu | **G1** | Lấy từ Lark + khảo sát | **Đã nạp dữ liệu gốc từ Lark 4.1 (`HUB-1.9`, `DEC-006`) & Danh bạ 5.020 KOC (`FR-082`)** |
| OI-004 | Báo cáo tuần (thứ 6, điền vào report của Growth để gửi brand) và báo cáo tháng (trước ngày 5) thuộc hệ thống nào: Ops Hub, UpAffiliate hay vẫn ở Growth? | Ranh giới hệ thống | G1 | Lead Growth, Lead Booking | **Đã triển khai trên Ops Hub (`FR-006`, `FR-016`, `FR-041`, `FR-081`)**: Báo cáo Kế hoạch & Thực thi tuần, Kho lịch sử tuần D14/D30/D60 theo `videoId` & Đồng bộ Google Sheet 57 cột trình Brand |
| OI-013 | Khi UpAffiliate chưa chạy, Ops Hub lấy dữ liệu chỉ số từ đâu (Lark Base, Seller Center, file đo lường riêng)? Dashboard hiện chưa kéo được NMV, tỷ lệ hủy. | Thứ tự phát hành giữa hai dự án | G2 | Team DX | **Đã giải quyết (`DEC-011`, `HUB-2.3`, `HUB-2.20`)**: Tích hợp trực tiếp với **Data Warehouse công ty** (Source of Truth cho KOC Master, Đa kênh MXH, `1–N` Pháp nhân & chỉ số D14/D30/D60), kết hợp Lark Base 4.1 & TikTok Seller Center |
| OI-017 | Vì sao cột `Cast` (plan) trong Lark 4.1 không bằng ΣKL1–7 ở 72% dòng 07–10/2026; cột `Số video affiliate` nguồn lấy từ đâu? | Dùng cột nguồn thì workload tính thiếu (493/580 dòng B2C lệch) | G2 | Owner bảng 4.1 | **Đã xử lý bằng quy tắc `DEC-006`**: Ops Hub tự tính tổng Cast từ `Σ(KL1–KL7)` và tổng video affiliate thay vì tin cột cộng sẵn bị lệch trên Sheet |
| OI-018 | `(Duyệt) Số video affiliate` trong 4.1 nghĩa là brand đã duyệt hay đã book? | Định nghĩa chỉ số tiến độ | G2 | Owner bảng 4.1 | **Đã xử lý theo `DEC-006`**: Plan chốt lấy từ cột gốc; tiến độ duyệt/book/air đối soát trực tiếp từ trạng thái Listing & Deal (`FR-006`, `TC-018`) |
| OI-019 | TNCN 10% áp cho mọi dòng chi phí, kể cả KOC là doanh nghiệp/hộ kinh doanh xuất hóa đơn? VAT 8% áp đến kỳ nào? | Quy đổi Net/Gross (`DEC-006`) | G2 | Kế toán | **Đã giải quyết bằng mô hình `1 KOC — N Hồ sơ pháp lý` (`DEC-009`, `FR-031`, `FR-082`)**: Cá nhân (`>= 2tr`) khấu trừ 10% TNCN; Hộ kinh doanh theo biểu HKD; Công ty/MCN áp VAT 8%/10% theo từng pháp nhân ký hợp đồng |

## 3. Workload, đánh giá, P2/P3

| Mã | Câu hỏi | Vì sao quan trọng | Chặn | Hỏi ai | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| OI-006 | Chính sách lương **4P (P2/P3)** hiện tại có đo được không; có đưa vào hệ thống ở phát hành đầu không? (Khảo sát: "chưa ưu tiên nhưng làm song song") | Phạm vi; tránh tự động hóa một chính sách chưa chốt | **G1** | Đặng Thị Yến Nhi, Giám đốc khối | **Tạm hoãn kích hoạt sang giai đoạn sau (`DEC-011`, `BR-14`)**: Mã nguồn đã dựng sẵn động cơ tính điểm, nhưng giai đoạn hiện tại chỉ bật Phân công PIC Gian hàng & 3 vị trí cấp Brand; chờ vận hành ổn định mới mở tính điểm Workload/P3 |
| OI-008 | Mô hình **workload theo store** (hệ số độ khó, scope) trong `4P Marketing B2C.xlsx` còn đúng khi làm đa nền tảng? | Công thức workload/capacity | G1 | Đặng Thị Yến Nhi | **Tạm hoãn kích hoạt sang giai đoạn sau (`DEC-011`, `BR-14`)**: Chỉ bật phân công nhân sự phụ trách Gian hàng & Brand ở giai đoạn hiện tại |
| OI-007 | Có hiển thị **bảng điểm/xếp hạng công khai** giữa nhân viên không? (Khảo sát: nhìn thi đua sẽ có động lực; HUB-1.6: đo không được méo hành vi) | Tác động tới hành vi và tâm lý đội | G1 | Giám đốc khối | **Tạm hoãn có chủ đích (`DEC-011`, `BR-14`)** — Chờ quyết định của Giám đốc khối sau khi vận hành ổn định |
| OI-016 | Tiêu chí tách **năng lực** và **kết quả** trong đánh giá (khảo sát: đang "đánh đồng") | Thiết kế đánh giá | G1 | Giám đốc khối | **Đã tách bạch trong thiết kế (`FR-036`, `FR-050`)**: Kết quả định lượng lấy tự động từ nghiệm thu & SLA hệ thống; năng lực do Quản lý đánh giá riêng |

## 4. Kỹ thuật

| Mã | Câu hỏi | Vì sao quan trọng | Chặn | Hỏi ai | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| OI-005 | Nhà cung cấp định danh dùng chung với UpAffiliate (đề xuất Lark SSO) | Đăng nhập, phân quyền | G2 | Team DX | **Đã đóng (`DEC-008`)** — OAuth 2.0 + 13 vai trò RBAC + Data Scoping Engine ([HUB-2.6](../2-design/2.6_AUTH_AND_RBAC_SPEC.md), `TC-014`) |
| OI-012 | Giữ tech stack của prototype (Next.js, Prisma, Supabase, Vercel) hay chọn lại ở giai đoạn 2? | Kiến trúc | G2 | Tech lead | **Đã chốt (`HUB-2.3`, `HUB-2.4`)** — Next.js App Router, TypeScript Strict, Prisma ORM (PostgreSQL) & bộ kiểm thử tự động `node:test` (`137/137 pass`) |

## Tổng hợp Trạng thái Cổng (Cập nhật 31/10/2026)

- **Đã giải quyết & chuẩn hóa chính thức (`DEC-006` → `DEC-011`):** Toàn bộ `OI-001` → `OI-019` đã được xác nhận và đóng.
- **Tạm hoãn có chủ đích sang giai đoạn sau (`DEC-011`, `BR-14`):** Thang đo điểm tải công việc (`Workload Bảng 1–7`), tính thưởng `P3` (`OI-006`, `OI-008`) và bảng xếp hạng thi đua công khai (`OI-007`).
