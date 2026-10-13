# Module hợp đồng — triển khai và kiểm thử

## Phạm vi

Tính năng nằm tại mục Hợp đồng trong app B2C, dùng chung điều hướng và đăng nhập của ứng dụng. Dùng 8 mẫu Word trong thư mục `Quản lý hợp đồng`; đọc vị trí điền trong bảng/đoạn văn và giữ file nguồn. Không thay điều khoản bằng nội dung viết sẵn của prototype cũ.

Hai luồng độc lập: phê duyệt nội bộ (pháp chế + kế toán, Lead nếu được chọn) và trình ký MISA AMIS weSign. Chỉ phiên bản đủ duyệt được liên kết trình ký. Người tạo không tự duyệt. Thu hồi/sửa làm mất phê duyệt cũ và lưu phiên bản trước. Lượt ký đang hoạt động/đã hoàn tất khóa sửa nội dung.

MVP giữ thao tác trình ký trên weSign đang dùng tại công ty; B2C liên kết mã tài liệu để lấy chi tiết người tham gia và trạng thái. Người điều phối phải xác nhận đã đối chiếu bản weSign với bản duyệt; API chi tiết không có nội dung file để tự so sánh. Không tự tạo/gửi/hủy luồng weSign.

## Chạy thử cục bộ

1. Chạy ứng dụng trong `web-admin` bằng `npm run dev`, mở app B2C và chọn mục Hợp đồng trên thanh điều hướng.
2. Chọn tài khoản kiểm thử Người tạo. Tạo hồ sơ với dữ liệu giả lập, chọn mẫu và điền trường.
3. Lưu nháp; tải Word và đối chiếu với file nguồn. Dùng kiểm tra trường điền khi chưa cấu hình AI.
4. Chọn hai reviewer kiểm thử Pháp chế và Kế toán, gửi duyệt.
5. Chuyển từng tài khoản reviewer để duyệt/yêu cầu bổ sung. Chỉ sau đủ duyệt mới có luồng liên kết ký cho Điều phối ký.
6. Khi chưa có tài khoản MISA, chọn Điều phối ký → mở hồ sơ đã duyệt → Bắt đầu ký giả lập. Dùng Giả lập người tiếp theo ký để thử chờ ký → ký một phần → hoàn tất, hoặc Giả lập từ chối ký để thử mở lượt mới. Dữ liệu ghi rõ provider DEMO và lưu lịch sử; không gọi MISA, không sinh file có chữ ký.

Theo yêu cầu ngày 13/10/2026, kết nối thật để chờ vì chưa có môi trường thử. Chế độ giả lập chỉ mở trong môi trường phát triển; không bật lại sandbox trên production để thử.

Hồ sơ cục bộ lưu dưới `web-admin/.contract-data/`, đã loại khỏi Git. Tài khoản kiểm thử chỉ có ở môi trường phát triển. Không dùng dữ liệu thật trong chế độ này.

## Cấu hình vận hành

Các biến được đặt trong môi trường máy chủ; không gửi khóa qua giao diện:

| Biến | Mục đích |
|---|---|
| AUTH_SECRET | Khóa ký session riêng của môi trường |
| LARK_APP_ID, LARK_APP_SECRET, LARK_REDIRECT_URI | Cấu hình Lark SSO hiện có |
| LARK_TENANT_KEY | Tổ chức Lark được phép vào module |
| CONTRACT_ACCESS_JSON | Danh sách cấp quyền do quản trị cấu hình, theo `larkOpenId` ổn định |
| CONTRACT_TEMPLATE_DIR | Đường dẫn bộ mẫu Word của pháp chế trên máy chủ; mặc định thư mục gốc hiện tại |
| CONTRACT_STORAGE | Đặt `postgres` để kiểm thử PostgreSQL; production luôn yêu cầu PostgreSQL |
| DATABASE_URL, DIRECT_URL | Kết nối PostgreSQL theo cấu hình Prisma hiện có |
| CONTRACT_DATA_DIR | Đường dẫn lưu cục bộ, chỉ môi trường phát triển |
| CONTRACT_AI_ENABLED | Chỉ bật AI gửi tài liệu đi khi đặt `true` |
| GEMINI_API_KEY, CONTRACT_AI_MODEL | Khóa/model Gemini đã được chọn cho kiểm tra hợp đồng |
| WESIGN_ENV | `test`, `demo` hoặc `production`; mặc định production |
| WESIGN_CLIENT_ID, WESIGN_CLIENT_SECRET, WESIGN_AMIS_SID | Xác thực theo OpenAPI MISA |
| WESIGN_ACCESS_TOKEN | Có thể dùng token được MISA cấp thay bộ credentials; theo dõi hết hạn |
| WESIGN_STATUS_MAP | Mapping mã trạng thái tài liệu do MISA xác nhận thành WAITING/PARTIAL/COMPLETED/CANCELLED/REJECTED/DRAFT |
| WESIGN_SYNC_SECRET | Khóa bảo vệ endpoint đồng bộ định kỳ/callback |

Ví dụ cấp quyền, dùng định danh giả lập để thay bằng tài khoản thực:

```json
[
  {"id":"ou_owner_example","name":"Người tạo","roles":["CREATOR"],"brands":["Brand A"]},
  {"id":"ou_legal_example","name":"Pháp chế","roles":["LEGAL"],"brands":[],"allBrands":true},
  {"id":"ou_finance_example","name":"Kế toán","roles":["FINANCE"],"brands":[],"allBrands":true},
  {"id":"ou_coordinator_example","name":"Điều phối ký","roles":["SIGN_COORDINATOR"],"brands":[],"allBrands":true}
]
```

Role quản trị của prototype không tự cấp quyền đọc hợp đồng trong production. Quyền tại API được lấy từ danh sách cấp quyền, không từ lựa chọn vai trò trên giao diện. Có kiểm tra quyền cho preview, file nguồn và tài liệu xuất. Lark callback yêu cầu state hợp lệ và kiểm tra tenant khi được cấu hình.

## Cơ sở dữ liệu

Migration `20261013_contract_hub` tạo bảng hồ sơ, bảng giữ mã weSign duy nhất và bản mẫu gốc bất biến theo hash. Production không tự chuyển sang lưu file khi database lỗi. Chạy migration trên môi trường kiểm thử trước; đợt triển khai mã này không tự chạy migration trên database công ty.

Các cập nhật dùng revision để từ chối ghi đè thay đổi của người khác. File cục bộ có khóa và ghi thay thế nguyên tử; database có transaction và kiểm tra revision.

## Đồng bộ MISA weSign

- Adapter dùng OpenAPI công khai: `POST /api/v1/Auth/credentials`, `POST /Documents/detail`, `POST /api/File/downloadFileInfosByDocumentID`.
- Đồng bộ thủ công hoặc mỗi 2 phút khi đang xem hồ sơ. Có endpoint `POST /api/contracts/integrations/wesign/sync` cho lịch chạy của hạ tầng; yêu cầu header `Authorization: Bearer <WESIGN_SYNC_SECRET>`.
- Endpoint này chỉ kích hoạt đọc lại trạng thái từ MISA; không dùng trạng thái do callback gửi vào. Đăng ký callback có header bảo vệ phải xác minh với MISA; nếu không hỗ trợ thì dùng lịch đồng bộ phía máy chủ.
- Người tham gia có các action rõ trong tài liệu MISA (chờ ký, đã ký, từ chối...). Mã `document.status` chưa có bảng nghĩa trong OpenAPI đã đọc, nên mặc định hiển thị mã nguồn/chưa đối chiếu thay vì tự suy ra hoàn tất. Cần MISA xác nhận `WESIGN_STATUS_MAP` trước vận hành.
- API detail không cung cấp ngày xử lý trong schema đã đọc: giao diện hiển thị thời điểm đồng bộ; không gọi đó là ngày ký.
- Không lưu/trả OTP, mật khẩu hoặc sign link của người ký.
- Tải bản ký từ MISA chỉ mở khi mapping nguồn xác nhận hoàn tất. Phạm vi quyền đọc luồng do kế toán/pháp chế tạo cần thử bằng tài khoản tích hợp thực.

Nguồn: [OpenAPI MISA](https://amisapp.misa.vn/wesign/api/public/swagger/v1/swagger.json), đọc ngày 13/10/2026.

## Giới hạn cần review trước dùng thật

## Kết quả kiểm thử ngày 13/10/2026

- Build production thành công; TypeScript và lint phạm vi hợp đồng đạt. Build còn cảnh báo tracing đường dẫn file động và quy ước middleware cũ; cần tối ưu đóng gói trước triển khai hạ tầng.
- 20 kiểm thử đạt: domain, 8 mẫu Word thật, giữ nguồn bất biến, API toàn luồng, phân quyền Lark, adapter MISA qua mock và ký giả lập. Kiểm thử API bổ sung xác minh trạng thái WAITING/PARTIAL/COMPLETED và chặn đồng bộ/tải file ký từ luồng DEMO.
- Đã thao tác trên app B2C: tạo/lưu hồ sơ giả lập, gửi duyệt, pháp chế duyệt, kế toán duyệt, điều phối mở ký, hai người ký lần lượt, hoàn tất. Không ký hoặc gửi tài liệu thật.
- Diff phạm vi hợp đồng không có lỗi khoảng trắng. Không thay đổi các màn hình khác đang được chỉnh song song.

Tự đánh giá theo skill agent-self-evaluation: chính xác 4/5 (đã xác minh local, chưa có MISA thật); đầy đủ 4/5 (MVP giả lập đủ luồng, đối chiếu pháp chế và tích hợp thật còn chờ); rõ ràng 4/5 (giao diện ghi rõ DEMO, cần UAT người dùng); khả năng sử dụng 4/5 (có hướng dẫn và tài khoản giả lập, chưa vận hành thật); ngắn gọn 4/5 (báo cáo tách khỏi giao diện, tài liệu cấu hình còn dài). Cải thiện tiếp theo khi có môi trường: UAT 8 mẫu, quyền Lark thực và mã trạng thái MISA.

## Giới hạn trước vận hành

- Mapping trường tự nhận diện phải được pháp chế đối chiếu từng mẫu, đặc biệt ô trống trong bảng và trường tùy chọn. Không tự suy ra ngưỡng tiền/thuế từ prototype.
- Xuất Word là bản giữ bố cục gốc. Preview web chỉ để đọc nội dung; chưa có chuyển đổi PDF giữ bố cục trên máy chủ.
- Mẫu có mã/hash nguồn; mỗi hồ sơ tạo mới lưu bản nguồn bất biến. File mẫu hiện hành thay đổi không đổi bản nguồn của hồ sơ cũ. Pháp chế quản lý bộ file hiện hành trên máy chủ; chưa có giao diện upload/phát hành mẫu mới.
- Chưa kết nối tài khoản thật Lark/weSign, chưa gọi AI trên tài liệu thật; cần cấu hình và UAT tích hợp.
- Chưa triển khai dịch vụ trên hạ tầng vận hành và chưa lên lịch đồng bộ thực tế.
