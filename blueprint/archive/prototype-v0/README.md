# LƯU TRỮ — ĐẶC TẢ PROTOTYPE V0

**Ngày lưu trữ:** 30/09/2026 · **Quyết định:** `HUB:DEC-003` · **Prototype:** `B2C/web-admin` (`HUB:DEC-002`)

Bảy tài liệu dưới đây được viết song song với prototype `B2C/web-admin`. Chúng mô tả giao diện và luồng của prototype như thể đã chạy. Rà soát ngày 30/09/2026 cho thấy chúng không đủ điều kiện làm đặc tả giai đoạn 2:

- Prototype **không lưu dữ liệu**: không có lời gọi Prisma/Supabase nào, state chỉ nằm trong trình duyệt. Dữ liệu giả, import Excel giả lập, chưa có đăng nhập.
- **Số liệu lệch nhau** giữa các tài liệu: 26/28/30 nhân sự; 4/8/10 thực thể, trong khi schema thực có 38 model; tạm ứng 2tr/8tr so với 2tr/10tr; 4 Tier so với KL1–KL7.
- **Phân công cũ trái với BRD**: Booking phân rã plan theo 4 Tier (SLA-00), trong khi BRD đã chốt Content phân rã theo năm chiều. Mô hình 1 deal = 1 hợp đồng, trong khi đã chốt HĐNT + phụ lục.
- Còn vai trò Kế toán, dù vai trò này đã bị bỏ (`HUB:DEC-004`).

## Dùng lại được gì

| Tài liệu | Nội dung còn giá trị tham khảo | Dùng cho |
| --- | --- | --- |
| [01 Handoff & SLA](01_HANDOFF_MATRIX_AND_SLA.md) | Danh sách chặng bàn giao, ý tưởng cảnh báo khi vượt 50% SLA | Đầu vào cho danh mục SLA (`HUB:OI-002`) — cần đối chiếu `Các SLA B2C.pdf` |
| [02 Tự động hóa hợp đồng](02_CONTRACT_AUTOMATION_SPEC.md) | Pain point hợp đồng | UPA — thay bằng mô hình HĐNT/phụ lục |
| [03 Kiến trúc & CSDL](03_DATABASE_AND_SYSTEM_ARCHITECTURE.md) | Phân tích nguyên nhân Lark chậm; tách Candidate/Deal/Content/Publication; ghi chú về plan 4.1 (228 cột) | UPA-2.3, UPA-2.4, HUB-2.4 |
| [04 Gamification](04_GAMIFICATION_AND_LEADERBOARD.md) | Mô hình đánh giá kép 70/30 (chưa duyệt) | `HUB:OI-007`, `HUB:OI-016` |
| [05 Design system](05_DESIGN_SYSTEM_SPEC.md) | Token màu, bảng sticky column | HUB-2.7, UPA-2.7 |
| [06 Auth & RBAC](06_AUTH_AND_RBAC_SPEC.md) | Định hướng Supabase Auth, RLS, Lark SSO | HUB-2.6, UPA-2.6 |
| [07 Báo cáo điều hành & vận hành booking](07_EXECUTIVE_REPORTING_AND_BOOKING_OPS_SPEC.md) | Taxonomy 4 trường KOC (đã chuyển sang [glossary](../../../../sdlc/01_GLOSSARY.md)); danh bạ 65 cột; các báo cáo điều hành | UPA master KOC; HUB-1.7 |

## Quy tắc

- Không sửa nội dung các file này, trừ link bị hỏng.
- Khi lấy ý tưởng từ đây, ghi lại thành yêu cầu mới trong BRD/SRS của dự án, có nguồn và trạng thái. Không trích dẫn file lưu trữ như một yêu cầu đã duyệt.
