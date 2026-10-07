# OPEN ISSUES — B2C OPS HUB

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | HUB-GOV-02 |
| Dự án | B2C Ops Hub |
| Trạng thái | Đang dùng (sổ ghi liên tục) |
| Cập nhật | 30/09/2026 |

Nguồn: `B2C/Pain point Marketing B2C.xlsx` (Sheet1, Sheet3, Sheet5, *Khảo sát nhân viên*), [HUB-1.6 Mục tiêu vận hành](../1-requirements/1.6_OPERATING_GOALS.md) mục "Việc cần xác nhận", rà soát 30/09/2026.

**Chặn G1** = phải đóng trước khi duyệt BRD Ops Hub.

## 1. Phạm vi và người quyết

| Mã | Câu hỏi | Vì sao quan trọng | Chặn | Hỏi ai | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| OI-001 | Ai là **chủ dự án** và **owner nghiệp vụ** của Ops Hub? | Không có người duyệt thì không qua cổng | **G1** | Ban giám đốc | Mở |
| OI-010 | Trong các mục tiêu ngắn hạn của HUB-1.6, **chọn 3 mục tiêu ưu tiên** nào cho kỳ tới; mục nào lùi? | Quyết định phạm vi phát hành đầu | **G1** | Giám đốc khối | Mở |
| OI-014 | Có giữ tính năng **AI nhận xét nhân viên** (có trong prototype)? Nếu có: ai xem, ai chịu trách nhiệm kết luận, dữ liệu nào được gửi tới nhà cung cấp AI? | Đụng tới đánh giá nhân sự và dữ liệu cá nhân | G1 | Giám đốc khối, HR | Mở |
| OI-015 | Khảo sát quy trình Brand, Content và liên phòng ban (Growth, Design, Media) chưa xong | As-is chưa đủ để viết BRD | **G1** | Theo kế hoạch Sheet5 tuần 28/09–02/10 | Đang làm |
| OI-011 | Nguyên nhân gốc của lần **tách team Content và Booking** trước đây không thành công là gì? | Tránh lặp lại khi thiết kế phân công | G1 | Giám đốc khối, nhân sự cũ | Mở |

## 2. SLA và chỉ số

| Mã | Câu hỏi | Vì sao quan trọng | Chặn | Hỏi ai | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| OI-002 | Danh sách **SLA chính thức** là gì? Hiện SLA nằm rải rác ở file của nhân viên và quản lý, có SLA mâu thuẫn, chưa đủ. | Ops Hub đo SLA; không thể đo khi định nghĩa chưa thống nhất | **G1** | Nguyễn Thị Ngọc Tâm; `B2C/Các SLA B2C.pdf` | Đang làm |
| OI-003 | Chọn **5–7 chỉ số** điều hành nào (đề xuất từ khảo sát: tiến độ air video, tiến độ gửi báo cáo, tiến độ gửi list duyệt, chủ động nghiệm thu…)? Công thức, mẫu số, thời điểm chốt? | Lõi của BRD Ops Hub | **G1** | Giám đốc khối, Lead | Mở |
| OI-009 | **Số gốc** hiện tại: trễ air, thời gian duyệt, lỗi nghiệm thu, chi phí, workload | Không có số gốc thì không đặt mục tiêu | **G1** | Lấy từ Lark + khảo sát | Mở |
| OI-004 | Báo cáo tuần (thứ 6, điền vào report của Growth để gửi brand) và báo cáo tháng (trước ngày 5) thuộc hệ thống nào: Ops Hub, UpAffiliate hay vẫn ở Growth? | Ranh giới hệ thống | G1 | Lead Growth, Lead Booking | Mở |
| OI-013 | Khi UpAffiliate chưa chạy, Ops Hub lấy dữ liệu chỉ số từ đâu (Lark Base, Seller Center, file đo lường riêng)? Dashboard hiện chưa kéo được NMV, tỷ lệ hủy. | Thứ tự phát hành giữa hai dự án | G2 | Team DX | Mở |

## 3. Workload, đánh giá, P2/P3

| Mã | Câu hỏi | Vì sao quan trọng | Chặn | Hỏi ai | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| OI-006 | Chính sách lương **4P (P2/P3)** hiện tại có đo được không; có đưa vào hệ thống ở phát hành đầu không? (Khảo sát: "chưa ưu tiên nhưng làm song song") | Phạm vi; tránh tự động hóa một chính sách chưa chốt | **G1** | Đặng Thị Yến Nhi, Giám đốc khối | Đang làm |
| OI-008 | Mô hình **workload theo store** (hệ số độ khó, scope) trong `4P Marketing B2C.xlsx` còn đúng khi làm đa nền tảng? | Công thức workload/capacity | G1 | Đặng Thị Yến Nhi | Mở |
| OI-007 | Có hiển thị **bảng điểm/xếp hạng công khai** giữa nhân viên không? (Khảo sát: nhìn thi đua sẽ có động lực; HUB-1.6: đo không được méo hành vi) | Tác động tới hành vi và tâm lý đội | G1 | Giám đốc khối | Mở |
| OI-016 | Tiêu chí tách **năng lực** và **kết quả** trong đánh giá (khảo sát: đang "đánh đồng") | Thiết kế đánh giá | G1 | Giám đốc khối | Mở |

## 4. Kỹ thuật

| Mã | Câu hỏi | Vì sao quan trọng | Chặn | Hỏi ai | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| OI-005 | Nhà cung cấp định danh dùng chung với UpAffiliate (đề xuất Lark SSO) | Đăng nhập, phân quyền | G2 | Team DX | Mở |
| OI-012 | Giữ tech stack của prototype (Next.js, Prisma, Supabase, Vercel) hay chọn lại ở giai đoạn 2? | Kiến trúc | G2 | Tech lead | Mở |

## Tổng hợp

- **Chặn G1 (in đậm):** OI-001, 002, 003, 006, 009, 010, 015.
- Việc làm ngay: gán chủ dự án (OI-001); hoàn tất khảo sát tuần 28/09–02/10 (OI-015, OI-002); buổi 90 phút với Giám đốc khối theo [HUB-1.4](../1-requirements/1.4_DISCOVERY_GUIDE_GIAM_DOC_KHOI.md) để đóng OI-003, 010, 006, 007.
