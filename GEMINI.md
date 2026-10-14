# Upbase B2C - Hướng Dẫn & Quy Tắc Vận Hành Trợ Lý (GEMINI.md)

## 1. Cấm Lạm Dụng Từ Ngữ AI & Buzzword
- **Giao diện (UI):** Dùng từ ngữ nghiệp vụ đời thực của phòng ban Marketing/Vận hành/Kế toán.
  - CẤM: "AI", "Trí tuệ nhân tạo", "Smart", "OCR AI", "1-chạm", "Siêu tốc", "Đột phá", "Toàn diện", "Live dynamic binding".
  - DÙNG: "Tải ảnh giấy tờ", "Đọc ảnh CCCD", "Soạn hợp đồng", "Xem hợp đồng", "Duyệt chi", "Mã QR".
- **Giao tiếp:** Trả lời ngắn gọn, thẳng thắn, không liệt kê hoa mỹ, không dùng giọng điệu robot hay marketing quảng cáo.

## 2. Tiêu Chuẩn Kỹ Thuật & Vận Hành B2C
- Kiểm tra `npm run build` trước khi báo cáo kết quả.
- Đảm bảo mã nguồn TypeScript sạch sẽ, không lỗi type.
- Tôn trọng các quy chuẩn SLA B2C và luồng duyệt tài chính.

## 3. Quy Tắc Nghiệp Vụ Đối Soát Kế Hoạch & Booking B2C
- **Phân cấp quản trị Thương hiệu (Brand -> Gian hàng):**
  - **Mức Brand (Thương hiệu):** Là cấp cao nhất, ký hợp đồng dịch vụ tổng thể, giao ngân sách chiến dịch tổng và định mức phê duyệt kịch bản/đơn giá (Brand Guideline).
  - **Mức Gian hàng (Store / Platform):** Một Brand sở hữu nhiều gian hàng trên các sàn (`TikTok`, `Shopee`, `Lazada`...). Hạn mức Order được phân bổ chi tiết theo từng gian hàng nhưng phải tuân thủ định mức của Brand.
- **Phạm vi phân tích B2C:** Chỉ tính toán các gian hàng có `B2C phụ trách = 1` (Cột 25 trong file 4.1 Plan order tổng). Tuyệt đối không gộp gian hàng thuộc Social Commerce hoặc Outright của phòng ban khác trừ khi được yêu cầu rõ ràng.
- **Cơ cấu tổ chức & Phân bổ Leader - Specialist phòng B2C:**
  - **Cấp Ban Giám Đốc / Tổng Giám Đốc (CEO):** `Đỗ Văn Giang` — Phụ trách chung định hướng doanh nghiệp, bảo trợ nguồn lực, phê duyệt chiến lược toàn hệ thống và ký duyệt cấp cao nhất.
  - **Cấp Giám Đốc Marketing (Lead B2C):** `Đặng Thị Yến Nhi` — Phụ trách chung toàn khối Marketing B2C, quản lý trần PnL/ngân sách toàn bộ 69 gian hàng B2C, ký duyệt kế hoạch tháng và đại diện ký biên bản 4 bên.
  - **Cấp Trưởng Nhóm (Leader):** Xem thực tế tại Cột 55 File 4.1.1 (chỉ có `Nguyễn Thị Ngọc Tâm` làm Trưởng nhóm phụ trách 8 gian hàng: ClubClio TikTok/Shopee, Cindy Bloom, Mine, EUPC, L'Occitane, Bye Bye Blemish, Rejuran).
  - **Cấp Chuyên Viên (Specialist / PIC):** Các nhân sự nhận order tại File 4.1 (Cột 25, 39, 60) và File 4.1.1 (Cột 3, 50) như `Lê Phương Thảo`, `Lương Thị Như Quỳnh`, `Lê Thanh Hải`, `Phạm Thị Thu Hằng`, `Hoàng Hải Long`, `Trần Hải Phượng`, `Phan Diệu Ánh`, `Vũ Hoài Lâm`, `Nguyễn Thị Mai Anh`... là **Chuyên viên thực thi**, KHÔNG PHẢI Leader.
  - **Quy tắc gian hàng không có Leader:** Đối với các gian hàng chỉ có 1 người phụ trách (toàn bộ các gian Shopee và nhiều gian TikTok) hoặc Cột 55 trong File 4.1.1 để trống, gian hàng ghi nhận **Không có leader** (`bookingLeader: undefined`). Chuyên viên chủ động lập phân rã và trình duyệt trực tiếp lên Giám Đốc Marketing (`Đặng Thị Yến Nhi`) mà không cần bước sơ duyệt trung gian.
- **Bóc tách chỉ tiêu Order Growth:**
  - Tách bạch rõ ràng **Chi phí Gross** và **Chi phí Net** (Kế toán kiểm soát theo hạn mức Net).
  - Tách bạch rõ **Video KOC trả phí** (Paid) và **Suất gửi mẫu sản phẩm miễn phí (FOC)** (chi phí 0đ, thường do chuyên viên riêng phụ trách như Trần Thị Hảo).
  - Tách biệt rõ **Video Affiliate**, **Video kênh Brand (Self-channel)** và **Livestream**.
- **Nguyên tắc cảnh báo tài chính:**
  - Cảnh báo ngay khi gian hàng có Thực tế duyệt chi vượt hạn mức Order Net (Overbudget).
  - Báo động đỏ khi có gian hàng phát sinh chi phí lớn nhưng hạn mức Order ghi nhận 0đ (Unbudgeted Spend) để yêu cầu bổ sung phê duyệt.

## 4. Quy Tắc Đồng Bộ Tài Liệu & Mã Nguồn (Documentation Sync Rule)
- **Nguyên tắc "Code đổi - Doc cập nhật trong cùng một lượt":** Bất kỳ khi nào phát triển tính năng mới, sửa đổi luồng nghiệp vụ, mở rộng API, thêm trường dữ liệu, thay đổi ma trận phân quyền (RBAC) hay cấu trúc điều hướng/giao diện người dùng, BẮT BUỘC phải cập nhật đồng bộ các tài liệu đặc tả hệ thống tương ứng (`blueprint/2-design/`, `blueprint/README.md`, `web-admin/README.md`).
- **Cấm để tài liệu lỗi thời:** Tuyệt đối không để tài liệu ở trạng thái "Chưa tạo" hoặc giữ nguyên mô tả "prototype cũ" trong khi mã nguồn thực tế đã hoàn thiện và vận hành.
- **Duy trì tính chính xác của Sổ đăng ký tài liệu (`blueprint/README.md`):** Sổ đăng ký tài liệu phải luôn phản ánh đúng hiện trạng tài liệu thiết kế hệ thống, kiến trúc, phân quyền và tích hợp API.
- **Rà soát định kỳ:** Trước khi hoàn thành bất kỳ phiên làm việc nào về mã nguồn, trợ lý phải đối soát lại tài liệu xem đặc tả chức năng, tham số API, phân quyền vai trò và luồng dữ liệu đã ăn khớp 100% với mã nguồn hay chưa.
