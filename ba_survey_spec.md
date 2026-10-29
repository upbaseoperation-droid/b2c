# Kế Hoạch Khảo Sát Nghiệp Vụ Chuẩn Hóa Dữ Liệu Google Sheet 42 Brand

Tài liệu phục vụ đội BA đi khảo sát thực tế trên 4 — 5 gian hàng điểm, thu thập bài toán vận hành để làm việc với Team DX External về giải pháp kết nối hệ thống.

---

## 1. Mục tiêu và phạm vi công việc

* **Mục tiêu trước mắt:** Đội BA đi khảo sát thực tế để "bắt đúng bệnh" tại sao nhân viên không tuân thủ template và tại sao dữ liệu của 42 brand lại rất khó tổng hợp.
* **Phạm vi khảo sát điểm:** Khảo sát sâu trên **4 — 5 gian hàng đại diện** (thuộc nhóm gian hàng trọng điểm do chị Nguyễn Thị Ngọc Tâm quản lý: ClubClio, Cindy Bloom, EUPC...).
* **Nguyên tắc triển khai:** **Chưa vội chốt giải pháp kỹ thuật kết nối.** Việc kết nối Google Sheet với hệ thống sẽ do **Team DX External** chủ trì thẩm định và quyết định sau khi có đầy đủ kết quả khảo sát từ 4 — 5 gian hàng này.

---

## 2. Thực trạng 2 vấn đề lớn nhất hiện tại

### 2.1. Tại sao nhân viên không làm đúng template?
* **Template quá dài (45 cột):** Bắt buộc điền quá nhiều thông tin chi tiết khiến nhân viên tốn nhiều thời gian, dẫn đến tâm lý điền đối phó, bỏ trống hoặc tự ý xóa bớt cột.
* **Copy-paste tự do từ Kalodata/Zalo:** Khi dán số liệu thô vào sheet, các định dạng cũ đè mất công thức tính thuế 10%, mất danh sách chọn (dropdown) và format tiền tệ.
* **Mỗi bạn tạo một sheet riêng:** Nhân viên tự nhân bản tab mới, tự thêm cột ghi chú cá nhân, làm cấu trúc các file bị lệch nhau.
* **Chưa có công cụ kiểm soát:** Google Sheet hiện tại cho phép gõ tự do (chữ lẫn số: `280M`, `4.3K`, `4,000,000 đ`) mà không có cảnh báo hay chặn lỗi.

### 2.2. Tại sao rất khó tổng hợp thông tin báo cáo?
* **Dữ liệu phân tán ở 42 file riêng biệt:** Mỗi brand là một file độc lập nằm ở nhiều thư mục Drive khác nhau, không có một kho dữ liệu chung.
* **Không đồng nhất cấu trúc:** Cùng một chỉ số nhưng mỗi file lại đặt ở vị trí cột khác nhau, khiến các công cụ gom dữ liệu tự động bị lỗi.
* **Thiếu mã định danh dòng:** Không có mã quản lý cho từng đề xuất booking, dẫn đến khó phân biệt KOC làm nhiều video hoặc theo dõi lịch sử duyệt của Brand.
* **Phải tổng hợp thủ công:** Mỗi khi Lead B2C (`Đặng Thị Yến Nhi`) hoặc Tổng Giám Đốc (`Đỗ Văn Giang`) cần số liệu, nhân sự phải mở từng file để copy tay, mất nhiều thời gian và số liệu thường bị chậm trễ.

---

## 3. Định hướng chuẩn hóa bước đầu trên Google Sheet

Để phục vụ đợt làm việc sắp tới với Team DX External, đội BA sẽ khảo sát theo định hướng phân chia lại cấu trúc file đơn giản và an toàn hơn:

### 3.1. Rút gọn thông tin nhân viên phải nhập
* Giảm tải tối đa: Đề xuất rút từ 45 cột xuống còn **7 thông tin cơ bản** khi PIC lên danh sách KOC (Link kênh, Tên KOC, Tệp kênh, Báo giá net, Sản phẩm gửi, Hướng video, Ngày lên bài).
* Các chỉ số phụ về nhân khẩu học, độ tuổi, phân tích sâu sẽ xem xét lấy tự động hoặc chỉ bổ sung khi thực sự cần thiết.

### 3.2. Phân định rõ 3 khu vực thao tác trên file
* **Khu vực 1 (Upbase điền đề xuất):** Tên KOC, link kênh, giá net, giá gồm thuế 10%, sản phẩm gửi. Cài đặt bảo vệ dải ô để Brand chỉ xem, không chỉnh sửa.
* **Khu vực 2 (Brand thao tác):** Brand chỉ được thao tác trên đúng 2 cột: Cột chọn Duyệt (`Duyệt` / `Từ chối` / `Cân nhắc`) và Cột ghi lý do từ chối.
* **Khu vực 3 (Theo dõi thực thi):** Cập nhật trạng thái gửi mẫu, mã vận đơn và link video sau khi đăng bài.

### 3.3. Bảo mật tuyệt đối dữ liệu cá nhân KOC
* **Dỡ bỏ hoàn toàn khỏi file gửi Brand:** Số CCCD, ảnh giấy tờ cá nhân, số điện thoại riêng và số tài khoản ngân hàng của KOC không được để trên Google Sheet chia sẻ với Brand.
* Các thông tin này chỉ phục vụ khâu làm hợp đồng và chuyển khoản của Kế toán Upbase, cần quản lý trong phân hệ bảo mật riêng.

---

## 4. Nhiệm vụ và Bộ câu hỏi khảo sát cho đội BA

Đội BA sẽ ngồi trực tiếp tại 4 — 5 gian hàng điểm để phỏng vấn 4 nhóm đối tượng:

### 4.1. Khảo sát trực tiếp chuyên viên PIC
1. Trong 45 cột hiện tại, những cột nào bạn thấy mất thời gian điền nhất và cột nào hầu như không bao giờ dùng đến?
2. Bạn thường lấy số liệu KOC từ đâu (Kalodata, TikTok Shop, chat Zalo)? Thao tác copy như thế nào dẫn đến bị mất công thức và định dạng?
3. Bạn có đang tạo sheet riêng hoặc file nháp riêng ở ngoài không? Vì sao không thao tác trực tiếp trên file chính?
4. Khi Brand bấm Duyệt, bạn chuyển tiếp thông tin đi các khâu khác (kho gửi hàng, kế toán) bằng cách nào?

### 4.2. Khảo sát nhu cầu của Quản lý B2C (Chị Nhi & Chị Tâm)
1. Đầu ngày hoặc đầu tuần, những con số tổng hợp nào là quan trọng nhất để điều hành? (Hạn mức ngân sách còn lại theo từng Brand? Số deal đang chờ Brand duyệt? Số KOC bị chậm tiến độ lên bài?).
2. Hiện tại việc tổng hợp báo cáo thủ công từ các gian hàng đang gây tắc nghẽn ở những khâu nào?

### 4.3. Khảo sát phía Brand (Nhãn hàng)
1. Brand thường nhìn vào những tiêu chí nào đầu tiên khi duyệt KOC (Hình ảnh kênh, giá tiền, hay doanh số bán hàng quá khứ)?
2. Brand có thực sự cần xem tất cả các cột chỉ số chi tiết trên file không?
3. Khi từ chối một KOC, lý do phổ biến nhất là gì? Brand có đồng ý chọn lý do từ danh sách có sẵn để Upbase đổi KOC nhanh hơn không?

### 4.4. Khảo sát Bộ phận Kế toán & Pháp chế
1. Công thức tính thuế thu nhập cá nhân 10% và chi phí Gross cần chuẩn hóa như thế nào để khớp hoàn toàn giữa đề xuất của PIC và thủ tục thanh toán?
2. Kế toán cần các trường thông tin tối thiểu nào để đối soát và làm lệnh chuyển khoản cho KOC?

---

## 5. Lộ trình thực hiện: Khảo sát thực tế trước — Làm việc với Team DX sau

Quy trình triển khai chia làm 3 bước rõ ràng:

* **Bước 1: Khảo sát thực tế trên 4 — 5 gian hàng đại diện (Tuần 1)**
  - Đội BA ngồi trực tiếp cùng các bạn PIC phụ trách 4 — 5 gian hàng điểm để ghi nhận từng thao tác thực tế.
  - Phỏng vấn Brand và Kế toán để làm rõ các yêu cầu tối thiểu.
  - Tổng hợp danh mục các điểm lỗi thường gặp và bảng đề xuất rút gọn trường dữ liệu.

* **Bước 2: Họp đánh giá thực trạng & Làm việc cùng Team DX External (Tuần 2)**
  - Thành phần: Quản lý B2C + Đội BA + Team DX External.
  - Trình bày toàn bộ số liệu thực tế, mẫu file hiện tại và các lỗi nhập liệu thường phát sinh.
  - **Team DX External chủ trì đánh giá và đề xuất giải pháp kỹ thuật:** Quyết định phương án kết nối Google Sheet với hệ thống (dùng Webhook, API đồng bộ, hay công cụ chuyên dụng) sao cho phù hợp với hạ tầng kỹ thuật chung.

* **Bước 3: Thử nghiệm giải pháp trên 4 — 5 gian hàng trước khi nhân rộng (Tuần 3 — 4)**
  - Áp dụng file mẫu chuẩn và phương án kết nối kỹ thuật do Team DX External đề xuất trên 4 — 5 gian hàng điểm.
  - Đo lường độ ổn định, kiểm tra xem nhân viên còn làm sai không và dữ liệu tổng hợp có chính xác không.
  - Sau khi kiểm chứng thành công mới tiến hành nhân rộng ra toàn bộ 42 Brand.
