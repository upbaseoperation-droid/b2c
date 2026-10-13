# Bản giả lập hợp đồng online trong B2C

Đã xác minh trực tiếp trên `https://b2c-theta.vercel.app/login?demo=contracts`: mở module không cần phiên Lark, tạo và lưu hồ sơ, gửi duyệt cho hai vai trò độc lập. Mục Hợp đồng trong app cũng chuyển sang bản thử khi máy chủ báo chưa cấu hình khóa phiên; không bỏ điều kiện xác thực/phân quyền ở API thật.

Kho thử là localStorage riêng của trình duyệt, không dùng PostgreSQL hoặc API MISA/AI. Có tám mẫu rút gọn ghi rõ Giả lập, xuất Word có dòng KHÔNG DÙNG ĐỂ KÝ. Bộ Word pháp chế gốc thuộc luồng máy chủ và vẫn chờ cấu hình vận hành. Bản thử không tạo chữ ký thật và không nhận hồ sơ thật từ máy chủ.

Kiểm chứng: build thành công; TypeScript kiểm tra sau thay đổi cuối đạt; lint phạm vi thay đổi đạt. 14 kiểm thử domain, quyền production, giả lập và browser demo đạt, gồm chặn tự duyệt, ký trước đủ duyệt, gọi MISA từ bản thử và tải tài liệu có chữ ký giả. Không chạy migration hoặc cấu hình khóa thật.

## Tự đánh giá

| Tiêu chí | Điểm | Bằng chứng và phần cần cải thiện |
|---|---|---|
| Chính xác | 4/5 | Đã mở và gửi duyệt trên Vercel; chưa kiểm chứng kết nối thật. |
| Đầy đủ | 4/5 | Mở được cả người đang dùng app lẫn người chưa đăng nhập; mẫu online rút gọn chưa thay bộ mẫu gốc. |
| Rõ ràng | 4/5 | Banner và file xuất ghi Giả lập; cần người dùng review cách trình bày. |
| Khả năng sử dụng | 4/5 | Có link mở trực tiếp, vai trò thử và lưu trong trình duyệt; chưa chia sẻ hồ sơ thử giữa các máy. |
| Ngắn gọn | 4/5 | Giao diện giữ hướng dẫn một đoạn; báo cáo chi tiết nằm ngoài sản phẩm. |
