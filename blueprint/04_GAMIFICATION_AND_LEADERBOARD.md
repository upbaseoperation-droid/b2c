# QUY CHẾ TÍNH ĐIỂM THI ĐUA (GAMIFICATION LEADERBOARD) & ĐÁNH GIÁ HIỆU SUẤT
## Tạo động lực chủ động, minh bạch và tách bạch Năng lực vs Kết quả cho phòng Marketing B2C Upbase

---

## 1. Mục tiêu cốt lõi
1. **Giải quyết tình trạng "Đánh đồng Năng lực và Kết quả":** Phân định rạch ròi giữa Năng lực (Competency - thái độ, kỹ năng, tinh thần sáng tạo) và Kết quả đầu ra (Performance - số lượng video lên sóng, doanh số GMV, tỷ lệ hoàn thành đúng SLA).
2. **Kích hoạt động lực thi đua tự thân (Intrinsic Motivation):** Nhân sự trẻ rất giàu cảm xúc (emotion), việc hiển thị minh bạch bảng điểm cá nhân & nhóm giúp tạo không khí thi đua hào hứng, lành mạnh, không bị cảm giác "bị kiểm soát".
3. **Giảm tải cho Quản lý:** Đánh giá dựa trên số liệu thực tế của hệ thống, không phụ thuộc vào cảm tính của người quản lý.

---

## 2. Mô hình Đánh giá Kép (Dual Evaluation Model)

```
                     TỔNG ĐIỂM ĐÁNH GIÁ (100%)
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼ (Trọng số 70%)                                ▼ (Trọng số 30%)
[ KẾT QUẢ ĐẦU RA - PERFORMANCE ]              [ NĂNG LỰC & KỶ LUẬT - COMPETENCY ]
(Đo lường tự động từ hệ thống)                (Đo lường qua SLA & Tinh thần làm việc)
• Số lượng KOC chốt thành công                • Tỷ lệ tuân thủ SLA (Target >= 90%)
• Số lượng Video/Live lên sóng đúng hạn       • Tinh thần hỗ trợ đồng đội & L&D
• Doanh thu Affiliate GMV đóng góp            • Kỷ luật dữ liệu & cập nhật đầy đủ
```

---

## 3. Hệ thống Bảng Vàng Thi Đua (Gamification Leaderboard)

### 3.1. Các Danh hiệu & Bảng xếp hạng hàng tuần / hàng tháng
1. **The Booking Master (Chiến Thần Booking):** Top 3 nhân sự chốt được nhiều KOC chất lượng nhất và có số video lên sóng cao nhất.
2. **Revenue Hunter (Vua Doanh Số):** Top 3 nhân sự mang lại doanh thu Affiliate GMV cao nhất cho các chiến dịch.
3. **SLA Champion (Hiệp Sĩ Đúng Hạn):** Nhân sự có tỷ lệ hoàn thành công việc đúng cam kết SLA đạt 100% trong tháng.
4. **Hero Content Creator:** Nhân sự Content có kịch bản/video đạt mốc Triệu View (Viral Hero Content).

### 3.2. Cơ chế Tích lũy Huy hiệu & Điểm thưởng (Badges & Upbase Coins)
- **Huy hiệu "Sấm Sét" (Flash Approval):** Xử lý duyệt brief hoặc trình ký hợp đồng KOC trong vòng dưới 2 giờ.
- **Huy hiệu "Bàn Tay Vàng":** 10 video booking liên tiếp lên sóng không bị trễ hạn hoặc lỗi kiểm duyệt.
- Điểm thưởng thi đua được quy đổi thành phần thưởng vật chất/tinh thần tại buổi All-Hands hàng tháng.

---

## 4. Công thức Tính Điểm Thi Đua Thời Gian Thực (Scoring Formula)

Điểm thi đua hiển thị trên màn hình chính của Web App:

$$\text{Điểm Tổng} = (\text{Điểm SLA} \times 0.3) + (\text{Điểm Sản Lượng Video/Live} \times 0.4) + (\text{Điểm GMV/Traffic} \times 0.3)$$

- **Điểm SLA (Tối đa 100 điểm):** Bắt đầu 100 điểm. Mỗi lần trễ hạn không báo trước bị trừ 10 điểm.
- **Điểm Sản Lượng:** Điểm tỷ lệ theo % hoàn thành KPI tuần (Đạt 100% KPI = 100 điểm, vượt KPI cộng lũy tiến).
- **Điểm GMV:** Điểm quy đổi từ doanh thu phát sinh trên link affiliate của các deal KOC phụ trách.

---

## 5. Quy trình Đào tạo L&D & Kèm cặp (Mentorship & Feedback)
- Hàng tuần, Team Lead mở **Dashboard Bảng Điểm** trong buổi họp tuần (Weekly Standup 15 phút).
- Nhìn vào số liệu: Ai đang bị nghẽn ở khâu nào (liên hệ KOC chậm, hay kịch bản bị sửa nhiều lần, hay hợp đồng bị treo ở kế toán) để trực tiếp tháo gỡ hỗ trợ thay vì chỉ trích cá nhân.
- Tạo thư viện bài học kinh nghiệm (Best Practices) từ các case study thành công của các "Chiến thần Booking" để đào tạo nhân sự mới.
