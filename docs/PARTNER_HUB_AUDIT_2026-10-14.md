# Audit hub làm việc Brand, KOC và CTV

Ngày: 14/10/2026. Trạng thái: đề xuất để review, chưa triển khai.

## Cập nhật phạm vi theo trao đổi với người dùng

Phạm vi mới nhất: file/video chủ yếu được các bên gửi bằng link Drive. Hub vẫn có phần trao đổi, nhưng cho phép các bên trao đổi bên ngoài rồi ghi lại ý kiến/kết luận trong hub. Ưu tiên comment và quyết định duyệt KOC; mức sử dụng chat sẽ được đánh giá sau. Phần này thay thế các đề xuất bên dưới về bắt buộc tải file trực tiếp, tính năng chat nâng cao ở phiên bản đầu và tỷ lệ trao đổi phải diễn ra trong hub.

### Thiết kế duyệt KOC

Danh sách KOC theo chiến dịch hiển thị: KOC/kênh, thông tin đề xuất được phép chia sẻ, link hồ sơ, trạng thái duyệt, ý kiến gần nhất và người/thời điểm phản hồi. Mở một KOC sẽ thấy hồ sơ đề xuất và luồng ý kiến ngay cạnh nhau.

- Ba hành động: **Duyệt**, **Không duyệt**, **Cần bổ sung thông tin**. “Cần bổ sung” vẫn là đang chờ quyết định, không tính là từ chối.
- Đề xuất mặc định: duyệt có thể thêm ghi chú; không duyệt hoặc cần bổ sung phải có lý do cụ thể. Đây là quy tắc thiết kế đề xuất, không phải quy định nghiệp vụ đã được người dùng xác nhận riêng.
- Có thể gửi comment mà không đổi trạng thái. Comment “OK” không tự trở thành quyết định duyệt.
- Mỗi comment/quyết định gắn với đúng đề xuất KOC trong chiến dịch, có tác giả xác thực và thời gian. Cùng một KOC ở hai chiến dịch có hai luồng riêng.
- Khi thay đổi quyết định hoặc gửi lại đề xuất, giữ lịch sử trước đó; quyết định gắn với phiên bản được xem, không tự áp dụng sang đề xuất đã đổi.
- Có lựa chọn **Ghi nhận trao đổi bên ngoài**: nhập nội dung kết luận, kênh trao đổi và thời điểm nếu biết. Hiển thị người ghi nhận; không giả danh người phát biểu và không tự đánh dấu Brand đã duyệt. Người có quyền duyệt vẫn thực hiện hành động xác nhận riêng.

### Link tài liệu và khu vực trao đổi

Hỗ trợ dán link Drive cùng tên tài liệu, loại tài liệu và ghi chú phiên bản. Chỉ lưu đường dẫn và thông tin tham chiếu; không tự tải, sao chép video/file hay đổi quyền Drive. Mỗi bản nộp mới có bản ghi link mới, giữ liên kết cũ để tra cứu. Link Drive có thể đổi nội dung tại nguồn, nên lịch sử link không phải bản lưu bất biến của file; giao diện cần phân biệt điều này khi dùng làm căn cứ duyệt.

Nếu người nhận không mở được link, có hành động báo “Cần cấp quyền truy cập” cho người gửi. Quyền xem trong hub không đồng nghĩa có quyền Drive. Không mặc định yêu cầu bật chia sẻ công khai.

Mục **Trao đổi** vẫn xuất hiện trong cả ba hub, gắn theo chiến dịch/job và thành viên được phép. Phiên bản đầu gồm: tin nhắn chữ, link, trả lời comment, lịch sử lưu lâu dài và dấu hiệu có phản hồi mới. Ý kiến duyệt KOC được hiển thị trong ngữ cảnh hồ sơ; mục Trao đổi dẫn về cùng luồng đó, tránh tạo hai bản comment độc lập.

Các khả năng nhắc tên nâng cao, tìm kiếm toàn bộ hội thoại, trạng thái đang nhập, xác nhận đã đọc từng người, upload trực tiếp và đồng bộ chat bên ngoài được xét sau theo nhu cầu. Không bắt buộc đối tác chuyển mọi trao đổi vào hub.

### Tiêu chí nghiệm thu cho phạm vi này

1. Brand comment/duyệt/không duyệt đúng một đề xuất KOC; tải lại vẫn còn trạng thái, lý do, tác giả và lịch sử. Không tác động KOC cùng tên hay chiến dịch khác.
2. Comment thông thường và ghi nhận trao đổi bên ngoài không tự thay đổi trạng thái duyệt; người ghi nhận được hiển thị đúng.
3. Gửi link Drive không tạo bản sao file trên hệ thống; link cần cấp quyền được ghi nhận để người gửi xử lý.
4. Từ danh sách duyệt hoặc mục Trao đổi đều mở cùng một luồng ý kiến; thành viên ngoài phạm vi không đọc/gửi được.
5. Gửi lại khi lỗi không tạo tin/quyết định trùng; duyệt một đề xuất đã có phiên bản mới phải yêu cầu xem lại.
6. Các bên hoàn thành được quy trình bằng trao đổi ngoài + ghi nhận trong hub; không bị ép sử dụng chat để duyệt.

Thứ tự cập nhật: dữ liệu và quyền → duyệt KOC kèm comment/lịch sử/link → trao đổi cơ bản cho ba hub → mở rộng theo mức sử dụng. Đo tỷ lệ quyết định có lý do/lịch sử đầy đủ và thời gian xử lý duyệt; lượng tin nhắn chỉ dùng để hiểu nhu cầu, không làm mục tiêu bắt buộc.

Kết luận: đã có khung nghiệp vụ và giao diện trao đổi ở cả ba hub, nhưng chưa đủ cơ sở để coi đây là nơi làm việc chính thức của đối tác. Ưu tiên xây hồ sơ công việc dùng chung, chat gắn đúng hồ sơ và quyền truy cập theo người tham gia.

Phạm vi: đọc mã nguồn ba hub, cách nối với trang chính, luồng đăng nhập đối tác và hệ thống chat kế hoạch hiện có. Chưa chạy kiểm thử trình duyệt, nhiều tài khoản, thiết bị di động hay môi trường triển khai; không kết luận đã có rò rỉ dữ liệu thực tế. Không sửa mã nguồn sản phẩm. Các tham chiếu dòng dưới đây là vị trí tại thời điểm audit.

## 1. Hiện trạng có bằng chứng

| Hub | Phần đã có trong mã nguồn | Khoảng trống chính |
|---|---|---|
| Brand | Tổng quan chiến dịch, duyệt plan/KOC/kịch bản, job đang làm, trao đổi, lịch sử | Dữ liệu portal khởi tạo riêng từ mock; chat chỉ trong bộ nhớ màn hình; chưa có hồ sơ công việc xuyên suốt các hub |
| KOC | Danh bạ giám sát, lời mời và thương lượng, nhận mẫu, nộp nội dung, trao đổi, số liệu thu nhập | Chọn KOC đầu danh sách khi khởi tạo; gán job mẫu nếu không có job phù hợp; thay đổi deal nằm ở state riêng |
| CTV | Giao/nhận việc, hàng mẫu, duyệt kịch bản, QA video, nghiệm thu, feedback và đối soát | Có callback cập nhật task lên trang chính, nhưng chat vẫn riêng; lọc việc đối tác theo tên; hội thoại chung chưa có phạm vi từng job |

Nguồn: [BrandHubView](../web-admin/src/components/views/BrandHubView.tsx), [KocKolHubView](../web-admin/src/components/views/KocKolHubView.tsx), [SelfChannelCtvHubView](../web-admin/src/components/views/SelfChannelCtvHubView.tsx).

### Phát hiện cần xử lý

P0 = phải giải quyết trước khi mở làm việc với dữ liệu thật. P1 = cần cho phiên bản dùng hằng ngày. P2 = tối ưu sau khi luồng cốt lõi ổn định.

| Mức | Phát hiện và bằng chứng | Ảnh hưởng / hướng sửa |
|---|---|---|
| P0 | `auth/partner/login/route.ts:12` nhận email/accountId, tìm tài khoản rồi cấp phiên; trong handler không có bước xác minh quyền sở hữu email. `middleware.ts:14` cho luồng auth đi tiếp. | Đây là luồng mô phỏng chưa đủ để xác thực đối tác thực. Cần xác minh đăng nhập, lời mời có hạn, thu hồi thành viên và kiểm tra quyền tại máy chủ. Cần kiểm chứng toàn bộ luồng triển khai trước khi kết luận khả năng khai thác. |
| P0 | `KocKolHubView.tsx:149` khởi tạo KOC đầu danh sách; `:205` lấy bốn deal đầu làm job mẫu nếu không tìm thấy deal của KOC. | Có thể hiển thị sai người/sai việc. Gắn tài khoản với partnerId cố định; không có job phải hiển thị trạng thái trống. |
| P0 | `SelfChannelCtvHubView.tsx:437` lọc việc bằng tên chứa tên người dùng; cho OPEN_TASK qua bộ lọc này. | Tên không phải định danh. Giới hạn bằng ID và quyền dự án; job mở chỉ dành cho nhóm đủ điều kiện, với thông tin thương mại được giới hạn. |
| P0 | Brand chat `:149`, KOC chat `:158` và CTV chat `:148` là các mảng state cục bộ, không mang khóa cuộc hội thoại/job trong cấu trúc đang dùng. | Tải lại làm mất tin mới; đổi đối tác không tạo tập tin riêng tương ứng. Cần lưu theo conversationId, thành viên và đối tượng công việc. |
| P1 | Brand gửi tin luôn mang vai BRAND (`BrandHubView.tsx:359`); KOC luôn mang vai KOC (`KocKolHubView.tsx:183`); CTV luôn mang vai CTV (`SelfChannelCtvHubView.tsx:178`). | Nhân viên đang thao tác cũng có thể bị biểu diễn thành đối tác. Tác giả lấy từ phiên xác thực, không từ nhãn giao diện. |
| P1 | Brand dùng `INITIAL_BRAND_PORTAL_DATA` (`:72`), KOC sao chép `initialDeals` vào state (`:134`); props KOC không có callback ghi deal. Trang chính `page.tsx:1200` duyệt deal dựa vào tên KOC/mã và so khớp chuỗi. | Duyệt ở hub này có thể không phản ánh đúng hub khác; tên trùng có thể tác động nhiều deal. Dùng ID chính xác, một nguồn trạng thái và lịch sử thay đổi. |
| P1 | KOC `:252` thay giá trị thiếu/0 bằng 3 triệu và GMV bằng 25 triệu; `:1512` dùng tỷ lệ cố định để hiển thị phép tính thu nhập. | Không phù hợp làm thông tin đối soát. Tách dự kiến, đủ điều kiện, chờ trả và đã trả; thiếu dữ liệu hiển thị chưa có dữ liệu. |
| P1 | Brand hiển thị SLA dưới 24h tại `:450`, dưới 2h tại chat `:1407`; link mời `:380` dựng với token cố định. | Chưa chứng minh có đo hạn phản hồi hay lời mời có hiệu lực. Cấu hình SLA theo loại việc, có mốc thời gian và PIC; thay link mô phỏng bằng lời mời được quản lý. |

Nền tảng có thể tái sử dụng: `usePlanChat.ts`, API `monthly-plans/[id]/messages`, `monthlyPlanStore.ts` đã có lưu tin, chống gửi trùng, xử lý lỗi và cập nhật tin. Tuy nhiên `_shared.ts:6` chủ động loại tài khoản đối tác; đây là chat kế hoạch nội bộ, chưa phải backend chat đối tác. Tái sử dụng cơ chế sau khi thiết kế quyền thành viên; không mở quyền vào toàn bộ kế hoạch nội bộ.

README ngày 30/09 mô tả prototype và ranh giới UpAffiliate, trong khi mã hiện tại có thêm API/lưu trữ. Cần xác nhận lại nguồn dữ liệu chuẩn và trách nhiệm giữa B2C/UpAffiliate trước triển khai. Báo cáo này không tự thay đổi ranh giới dự án.

## 2. Hub cần trả lời được điều gì?

Trong một lần mở, mỗi người cần biết: đang làm việc gì; việc tiếp theo của mình; hạn khi nào; chờ ai; tài liệu nào là bản chốt; đã thống nhất gì; tiền đang ở bước nào.

Đề xuất cùng một hồ sơ công việc, ba cách nhìn theo quyền. Tầng dữ liệu: Brand → chiến dịch → job → sản phẩm bàn giao/phiên bản. Hồ sơ đối tác, hợp đồng, vận chuyển và khoản thanh toán được liên kết vào job, không nhập lại ở từng hub.

| Nội dung | Brand | KOC | CTV |
|---|---|---|---|
| Việc hôm nay | Duyệt plan, nhân sự/nội dung, xử lý phát sinh | Nhận/từ chối job, xác nhận mẫu, nộp bài, sửa bài | Nhận việc, đọc brief, quay/nộp/sửa, bàn giao |
| Brief và điều kiện | Mục tiêu, SKU, thông điệp, ngân sách được chia sẻ, đầu ra cam kết | Brief, deliverable, phí đã thỏa thuận, lịch đăng, quyền sử dụng nội dung | Đề bài sản xuất, format, file cần bàn giao, số vòng sửa, thù lao |
| Tiến độ | Số lượng cam kết/đã hoàn thành, điểm tắc, người xử lý | Job của mình, mốc nộp/duyệt/đăng, hàng mẫu | Task của mình, lịch quay, mẫu đang giữ, checklist QA |
| Duyệt và tài liệu | Xem đúng phiên bản, duyệt/yêu cầu sửa có lý do | Bản nộp và feedback đúng phiên bản | Kịch bản, video, feedback theo thời điểm video, file gốc/file sạch |
| Tiền và hồ sơ | Hợp đồng, nghiệm thu, hóa đơn/đối soát được phép xem | Phí, hoa hồng nếu áp dụng, khoản điều chỉnh có căn cứ, lịch trả | Đơn giá theo đầu việc, số lượng nghiệm thu, kỳ và trạng thái trả |
| Kết quả | Nội dung đã đăng, hiệu suất và nguồn/ngày cập nhật | Link bài, số liệu và nghĩa vụ báo cáo của mình | Sản phẩm đã bàn giao/được nhận, lịch sử chất lượng |

Thông tin thường trực trên đầu job: mã job, brand/chiến dịch, trạng thái, PIC chính và dự phòng, deadline, bước tiếp theo, người đang được chờ, brief/bản nộp mới nhất. Dùng trên điện thoại cần mở nhanh từ thông báo đến đúng việc.

## 3. Thiết kế chat và trao đổi

Ba phạm vi cần tách rõ:

1. **Phòng chiến dịch Brand ↔ Upbase:** brief, plan, mốc chung, thay đổi phạm vi và kết quả. Thành viên theo chiến dịch.
2. **Phòng job Upbase ↔ KOC/CTV:** phí hợp tác, mẫu, kịch bản, video, sửa bài và bàn giao. Đối tác chỉ thấy job của mình.
3. **Ghi chú nội bộ:** trao đổi nội bộ về ngân sách, đánh giá, phương án xử lý. Có nhãn và khu vực soạn riêng để tránh gửi nhầm ra ngoài.

Brand không tự động thấy toàn bộ chat KOC/CTV. Nếu cần trao đổi ba bên, tạo luồng chung với danh sách thành viên rõ ràng; chỉ đưa nội dung đã chọn vào luồng này, không mở lịch sử thương lượng riêng.

Trong hồ sơ job, chat nằm cạnh tài liệu/tiến độ; ở cấp hub có hộp thư tổng hợp với bộ lọc Chưa đọc, Nhắc đến tôi, Chờ tôi và Quá hạn. Bấm thông báo mở đúng job, tin nhắn và phiên bản liên quan.

Phiên bản đầu cần: tin nhắn lưu lâu dài; tác giả xác thực; trạng thái đang gửi/đã gửi/lỗi và thử lại không trùng; trả lời tin; nhắc người phụ trách; đính kèm có quyền truy cập; chưa đọc; tìm kiếm trong phạm vi được phép; ghi nhận sự kiện nộp bài/duyệt/đổi hạn. Thành viên bị thu hồi không đọc được tin/file qua đường dẫn cũ hoặc kênh cập nhật trực tiếp.

Mỗi trao đổi có thể được chuyển thành **việc cần xử lý** với người nhận, hạn và trạng thái. Ghim bản brief đã chốt và quyết định quan trọng. Tin nhắn “OK” không tự đổi trạng thái nghiệp vụ: người có quyền phải chọn Duyệt/Yêu cầu sửa trên đúng phiên bản; hệ thống ghi người duyệt, thời gian, lý do và phát sự kiện vào hội thoại.

Ví dụ: Brand yêu cầu sửa giây 00:12 của video v2 → PIC nhận việc có hạn → KOC nhận feedback được chia sẻ trong job → nộp v3 → người có quyền duyệt v3 → tiến độ, lịch sử và điều kiện nghiệm thu cùng cập nhật. Không mất dấu góp ý v2 và không lấy v2 làm bản đã duyệt.

## 4. Bố cục đề xuất

Giữ cấu trúc nhất quán: **Tổng quan · Công việc · Trao đổi · Tài liệu & duyệt · Đối soát**. Hồ sơ đối tác và cài đặt thành viên ở mục phụ; danh bạ giám sát dành cho nhân viên. Trên Tổng quan, đưa Việc cần tôi xử lý lên đầu, sau đó việc đang chờ, deadline và số liệu.

Lịch sử nằm ngay trong từng job/tài liệu và có thể tổng hợp khi cần. File được tìm theo chiến dịch, job, loại tài liệu và phiên bản; hiển thị rõ nháp/đang duyệt/đã duyệt/hết hiệu lực. Kho tài liệu Brand chứa guideline, thông tin SKU, thông điệp bắt buộc, nội dung không được dùng và tài nguyên hình ảnh đã được chia sẻ.

Quyền cần kiểm tra tại máy chủ cho mọi thao tác xem, tìm kiếm, tải file, nhận thông báo và gửi/duyệt. KOC/CTV không thấy đối tác khác; Brand không thấy giá vốn và ghi chú nội bộ. Nhân sự nội bộ theo phân công dự án; quyền duyệt, nghiệm thu và xác nhận đã trả phải được chỉ định riêng.

## 5. Thứ tự triển khai và điều kiện hoàn thành

| Đợt | Công việc | Điều kiện hoàn thành |
|---|---|---|
| 0 — Dữ liệu và quyền | Định danh đối tác/job, xác thực, thành viên, bỏ fallback mẫu, thống nhất nguồn dữ liệu | Không thể truy cập chéo brand/đối tác qua UI, API, file, tìm kiếm hay thông báo; không tự tạo số liệu khi thiếu |
| 1 — Làm việc và chat | Hồ sơ job, chat lưu thật, đính kèm, chưa đọc/nhắc tên, PIC và deadline | Hai tài khoản trao đổi được; tải lại vẫn còn tin; gửi lại không trùng; đổi phòng không lẫn tin |
| 2 — Nộp và duyệt | Brief phiên bản, bản nộp, feedback, phê duyệt, nhật ký và cập nhật các hub | Duyệt đúng phiên bản/quyền; phiên bản cũ không ghi đè bản mới; Brand và người thực hiện nhìn cùng trạng thái |
| 3 — Hoàn tất hợp tác | Hàng mẫu, hợp đồng liên kết, nghiệm thu, đối soát, kết quả | Truy được từ khoản thanh toán tới đầu việc đã nghiệm thu; phân biệt dự kiến và thực trả, có nguồn và thời điểm cập nhật |
| Sau đó | Tìm kiếm nâng cao, báo cáo SLA, nhắc việc và kết nối kênh trao đổi ngoài nếu cần | Chọn theo số liệu sử dụng; không mở tích hợp trước khi có quy tắc nguồn chuẩn và quyền dữ liệu |

Kịch bản nghiệm thu bắt buộc: Brand A không đọc Brand B; KOC A không đọc KOC B; CTV trùng tên không thấy việc nhau; người chưa được giao chỉ thấy job mở được phép; tài khoản hết quyền bị ngắt truy cập; mất mạng và gửi lại không mất/trùng tin; mở hai cửa sổ thấy cùng trạng thái; một người duyệt bản cũ trong lúc có bản mới bị chặn; không có job/thu nhập hiển thị đúng trạng thái trống; hoàn tất hành trình trên điện thoại.

Chỉ số đề xuất cho pilot, chưa phải kết quả đã đo: 100% job đang chạy có PIC, hạn và brief; 100% quyết định duyệt truy được phiên bản/người/thời gian; không có truy cập chéo trong bộ nghiệm thu; ít nhất 90% quyết định và bản bàn giao được ghi nhận trong hub; đo thời gian tìm brief bản chốt, phản hồi, số việc quá hạn và số lần phải hỏi lại thông tin. Chốt mục tiêu thời gian sau khi có baseline vận hành.

Điểm cần chốt khi triển khai: ai có quyền duyệt cuối mỗi loại đầu ra; SLA theo giờ làm việc; Brand có cần phòng ba bên; hệ thống nào là nguồn chuẩn cho deal/hợp đồng/thanh toán. Các điểm này không ngăn hoàn thành audit, nhưng quyết định phạm vi triển khai.

## 6. Tự kiểm tra báo cáo

Áp dụng agent-self-evaluation; điểm trung bình 4,0/5, không có tiêu chí dưới 3.

| Tiêu chí | Điểm | Bằng chứng và giới hạn |
|---|---|---|
| Chính xác | 4/5 | Có tham chiếu handler/state và phân biệt phát hiện mã nguồn với sự cố thực tế; chưa xác minh runtime |
| Đầy đủ | 4/5 | Bao phủ ba hub, chat, quyền, tài liệu, duyệt và tiền; chưa quan sát người dùng thật |
| Rõ ràng | 4/5 | Có ma trận theo vai trò và ví dụ sửa video; báo cáo chi tiết cần đọc theo phần |
| Khả năng hành động | 4/5 | Có đợt triển khai và nghiệm thu; chưa ước lượng do nguồn dữ liệu/ràng buộc dự án chưa chốt |
| Ngắn gọn | 4/5 | Bảng tập trung vấn đề và hành động; giữ chi tiết bằng chứng để review được |

Cải thiện tiếp theo: kiểm thử bằng hai tài khoản cho mỗi vai trò; quan sát một ca làm việc từ brief đến nghiệm thu; cập nhật phạm vi B2C/UpAffiliate với người phụ trách. Tự kiểm tra: người dùng có cơ sở đánh giá đề xuất, nhưng không nên coi báo cáo là chứng nhận hệ thống đã sẵn sàng vận hành.
