# YÊU CẦU NGHIỆP VỤ BOOKING ĐA NỀN TẢNG (BRD ĐANG XÂY DỰNG)

**Giai đoạn SDLC:** 1 — Phân tích và đặc tả yêu cầu.  
**Cập nhật:** 24/09/2026.  
**Trạng thái:** Ghi nhận các quyết định đã xác nhận; chưa phê duyệt thiết kế kỹ thuật hoặc triển khai.

## 1. Nguồn và mục tiêu

- Nguồn: trao đổi với người phụ trách giải pháp ngày 24/09/2026; `Booking E2E.pdf`; `Booking đa sàn.pdf`; bảng định nghĩa năm chiều do người dùng cung cấp.
- Nguồn bổ sung: ảnh chụp thông báo của team DX sau trao đổi với Lead Booking và Lead Growth, **đề xuất** thay đổi Plan order tổng cho Video Affiliate, nêu thời gian áp dụng từ plan tháng 10/2026. Ảnh là bằng chứng về đề xuất quy trình, chưa chứng minh quy trình đã được phê duyệt hoặc vận hành.
- Hiện tại vận hành booking TikTok. Mục tiêu là quản trị booking theo nền tảng, content type, format, model và KL, đồng thời theo dõi kế hoạch, thực hiện, nghiệm thu, chi phí theo brand/store, KOC và nhân sự.
- Hai PDF là tài liệu tham khảo nghiệp vụ. Quyết định được xác nhận trong trao đổi là nguồn ưu tiên khi có khác biệt.

## 2. Quyết định nghiệp vụ đã xác nhận

| ID | Quy tắc | Hệ quả cần thể hiện trong giải pháp |
| --- | --- | --- |
| BR-01 | **Job chính là BO**; dùng một mã BO. | Không tạo thêm thực thể `Job` độc lập chỉ để đổi tên BO. |
| BR-02 | Một BO ứng với một tổ hợp `Platform × Content Type × Format × Model`. | Các chiều này phải gắn với BO để lọc, lập kế hoạch và nghiệm thu. |
| BR-03 | Chuyển sang ký **hợp đồng nguyên tắc (HĐNT)** với KOC; công việc được ghi trong **phụ lục/SOW**. | HĐNT là hồ sơ chung; phụ lục/SOW là hồ sơ theo kỳ hợp tác, không đồng nhất với BO. |
| BR-04 | Gom BO vào phụ lục/SOW theo **cùng KOC và cùng tháng**; **không yêu cầu cùng brand/store**. | Một phụ lục/SOW có thể chứa nhiều BO thuộc nhiều brand/store; từng BO phải giữ chi phí và thông tin nghiệm thu riêng để đối soát. |
| BR-05 | Nếu BO phát sinh **sau khi phụ lục tháng đã ký**, lập **phụ lục bổ sung**. | Giữ nguyên bản đã ký; phụ lục bổ sung liên kết HĐNT, tháng và các BO phát sinh, có mã và trạng thái ký riêng. Không sửa đè văn bản đã ký. |
| BR-06 | Thanh toán theo phụ lục/SOW. | Phải đối chiếu tổng giá trị phụ lục với tổng giá trị các BO/hạng mục thuộc phụ lục; báo cáo chi phí vẫn phân bổ được về từng BO và brand/store. |
| BR-07 | **Growth thuộc team vận hành sàn** giao plan số tổng theo từng nền tảng cùng tổng ngân sách; **Content phân rã plan theo toàn bộ các chiều booking** (`Platform × Content Type × Format × Model × KL`). | Content sở hữu plan chi tiết; Booking không phải bên phân rã plan. Mỗi dòng chi tiết phải truy được về số tổng theo nền tảng của Growth. |
| BR-08 | Plan chi tiết của Content phải **cân và đối soát theo tổng ngân sách Growth giao**. | Hệ thống phải hiển thị tổng ngân sách được giao, tổng ngân sách Content đã phân bổ, phần còn lại và phần vượt; không cho trình duyệt một plan vượt hạn mức khi chưa có quy trình ngoại lệ được chốt. |
| BR-09 | Plan Growth hiện được quản trị trên Lark. | Lark là nguồn dữ liệu gốc cho số tổng Growth; hệ thống Booking cần nhận bản plan có mã nguồn, kỳ, trạng thái và thời điểm cập nhật để Content phân rã. Cách kết nối chưa được chọn. |
| BR-10 | **List booking Đợt 1 phải hoàn thành chậm nhất ngày 10/T−1** cho tháng T; **ngày 25/T−1** Growth mới có số plan chốt. | Quy trình phải hỗ trợ list trước số Growth chốt và đối soát sau chốt. List Đợt 1 phải truy được căn cứ/phiên bản dùng khi lập. Chưa mặc định list đã xong là BO hay cam kết với KOC. |
| BR-11 | **Booking được tổ chức thành 3 đợt trong mỗi tháng.** | Mỗi list/BO phải truy được tháng booking và đợt booking (1, 2 hoặc 3); theo dõi tiến độ, sản lượng và ngân sách theo từng đợt và tổng tháng. Mốc ngày 10/T−1 chỉ áp dụng cho list Đợt 1. |

### Nhịp plan và booking đã xác nhận

1. **Chậm nhất ngày 10/T−1:** B2C hoàn thành list booking Đợt 1 cho tháng T khi chưa có số Growth chốt. Cần lưu kỳ, brand/store, người lập, thời điểm hoàn thành và căn cứ dự kiến để sau này biết list được xây từ số nào.
2. **Từ sau ngày 10 đến trước 25/T−1:** Tiếp tục xử lý list theo mức được phép trong quy trình; phạm vi được phép vẫn cần xác nhận.
3. **Ngày 25/T−1:** Growth chốt số tổng theo nền tảng và tổng ngân sách cho tháng T trên Lark.
4. **Sau khi có số chốt:** Content đối soát/cập nhật plan chi tiết theo năm chiều và cân số lượng/ngân sách với số Growth chốt. List Đợt 1 đã hoàn thành phải được đối chiếu với plan được duyệt; phần thiếu, vượt hoặc lệch cơ cấu có owner xử lý. **Chưa xác nhận Content đã có bản plan tạm trước ngày 10 hay chỉ phân rã lần đầu sau ngày 25.**

**Chưa xác nhận:** tiêu chí để coi list Đợt 1 là **hoàn thành ngày 10** (chỉ đủ KOC/giá hay đã qua audit/Brand duyệt); ai trong B2C lập và duyệt list; sau ngày 10 list được gửi Brand/tiếp cận KOC tới mức nào; có được tạo BO, chốt giá, gửi mẫu hoặc cam kết air trước số Growth chốt hay không. Chưa có mốc lập/chốt list Đợt 2 và Đợt 3, cũng chưa rõ mỗi đợt phân theo thời gian thực hiện, thời gian air hay một tiêu chí vận hành khác. Không suy diễn các bước này chỉ từ từ “xong list”.

**Khoảng trống quy trình cần giải quyết:** Nếu list Đợt 1 ngày 10 cần bám theo cơ cấu và ngân sách plan, thì phải có một căn cứ tạm trước ngày 10 (ví dụ số dự kiến của Growth hoặc plan tạm của Content). Hiện chưa có bằng chứng xác định căn cứ đó, người duyệt hay giới hạn sai lệch so với số Growth chốt ngày 25. Vì vậy không thể đặc tả luồng bắt đầu từ Growth chốt ngày 25 rồi mới lập toàn bộ plan Content và booking cho cả tháng T. Ba đợt booking không tự giải quyết khoảng trống này.

## 2a. Khảo sát ranh giới lập plan — chưa chốt RACI

| Nguồn | Nội dung ghi nhận | Giới hạn bằng chứng |
| --- | --- | --- |
| Người phụ trách giải pháp, 24/09/2026 | Growth thuộc team vận hành sàn đang làm plan. | Chưa xác nhận Growth lập tới nền tảng, KL, format, model, nhân sự hay KOC cụ thể. |
| `Booking đa sàn.pdf`, tr. 1 | Growth/Content lên plan theo gian hàng; TikTok phân bổ chi phí tới KL; Shopee phân bổ tới nền tảng được ghi là **đề xuất**. Content phân tiếp tới nhân sự, format, model để tính workload. | Diễn đạt gộp Growth/Content, chưa chỉ rõ người tạo và người duyệt từng tầng. |
| `Booking đa sàn.pdf`, tr. 4 | “Plan order từ Growth, phân bổ đến từng nền tảng và KL”; Booking Execution tạo plan chi tiết theo nhân sự và model. | Khác với mô tả Content phân bổ ở tr. 1; cần xác nhận quy trình thực tế. |
| `01_HANDOFF_MATRIX_AND_SLA.md`, mục 2–3 | Growth Demand gồm tổng ngân sách, target GMV, CIR; Booking phân rã số KOC theo 4 level và ngân sách; Content lập Master Content Plan, angle và brief cho Booking. | Là đặc tả cũ; chưa phản ánh đầy đủ plan đa sàn hiện tại. |
| `B2C_Quản lý Booking_4.1 Plan order tổng.xlsx` | Dòng kế hoạch theo store–tháng có NMV, số video affiliate, cơ cấu KL, ngân sách, self-channel và các cột PIC Growth/Booking/Content. | Cấu trúc bảng không xác định ai sở hữu từng trường. |
| `B2C_Quản lý Booking_4.1.1 Input plan.xlsx` | Dòng theo store–tuần–người phụ trách, có số lượng/ngân sách TikTok theo KL; Shopee/Facebook/Instagram/Threads theo reup/affiliate; self-channel theo loại video; live theo loại phiên. | Đây là mức chi tiết **đã có trong biểu mẫu**, không chứng minh Growth là người nhập toàn bộ. |
| Ảnh thông báo team DX, đề xuất cho plan 10/2026 | Bước 1 Growth nhập plan tại bảng Daily của Operation Tracking. Bước 2 Growth order nguồn lực các team **chi tiết từng nền tảng** tại Plan order tổng. Bước 3 plan tự động đồng bộ sang hệ thống Booking. Bước 4 Content phân rã order theo plan chi tiết đã lên trước đó. | Đây là luồng **đề xuất**; ảnh không chỉ ra Content phân rã tới KL, format, model, tuần, nhân sự hay KOC nào, và không nêu vai trò Booking trong bước phân rã. |

**Kết luận sau xác nhận của người phụ trách giải pháp:** Growth giao **số tổng theo nền tảng và tổng ngân sách**; **Content phân rã theo toàn bộ năm chiều booking và cân theo ngân sách Growth giao**. Vai trò Booking sau khi nhận plan chi tiết vẫn cần làm rõ. Ma trận handoff cũ gán Booking phân rã KL không còn là phân công đúng cho bước phân rã plan. File 4.1.1 là dữ liệu tham chiếu về độ chi tiết, không chứng minh Growth là người nhập các chiều này.

**Cấu trúc Video Affiliate trong ảnh đề xuất:** nhánh *không cast* gồm TAP (UpAffiliate, TAP đối tác ngoài, TAP Brand phụ trách) và reup video theo Instagram, Shopee, TikTok, Facebook, Threads, theo dõi số video; nhánh *có cast* theo TikTok, Facebook, Instagram, Threads, Shopee, theo dõi chi phí và số video. Đây là cấu trúc order được đề xuất, chưa phải taxonomy BO đã phê duyệt.

## 2b. Khả thi tích hợp plan Growth từ Lark — cần xác minh tại tenant

- Lark Open Platform có API cho Base; tài liệu chính thức có thao tác đọc danh sách bảng, trường và bản ghi. Vì vậy **nếu** plan nằm trong Lark Base và app được cấp quyền với Base đó, hệ thống có thể đọc plan qua API thay cho nhập tay. Nguồn: [Lark Developer](https://open.larksuite.com/), [Base record API](https://open.larksuite.com/document/server-docs/docs/bitable-v1/app-table-record/list), [Base field API](https://open.larksuite.com/document/server-docs/docs/bitable-v1/app-table-field/list).
- Chưa xác định plan Growth nằm trong **Lark Base hay Lark Sheets**. Hai loại dữ liệu cần API và ánh xạ khác nhau; tên “Daily” và “Plan order tổng” chưa đủ để kết luận.
- Phương án đề xuất ở giai đoạn yêu cầu: **đồng bộ một chiều Lark → Booking** đối với plan Growth; Content lập plan chi tiết trên hệ thống Booking. Chỉ nhận bản plan đủ trạng thái nghiệp vụ; lưu mã bản ghi nguồn và thời điểm đồng bộ; cập nhật cùng mã nguồn thay vì tạo bản trùng; báo lỗi khi cấu trúc cột hoặc dữ liệu thay đổi.
- Ở thử nghiệm kỹ thuật SDLC giai đoạn 2, dùng một bảng và vài dòng đã được phép truy cập để kiểm tra quyền đọc, ánh xạ store–tháng–nền tảng–số lượng–ngân sách, cập nhật lại một dòng, xử lý phân trang và thời gian đồng bộ. Bắt đầu bằng lịch đọc định kỳ; cơ chế sự kiện/webhook chỉ chọn sau khi xác nhận loại dữ liệu và sự kiện Lark hỗ trợ.
- Chưa có kết nối Lark plan trong web prototype hiện tại; các nhãn “đồng bộ Lark” trong UI không chứng minh đã kết nối API.

### Khảo sát bản xuất `4.1 Plan order tổng.xlsx` (24/09/2026)

- Bảng có **2.285 dòng dữ liệu và 228 cột**. Một dòng có khóa nghiệp vụ `Order no`, `Gian hàng`, `Tháng`; còn có `Record ID`, `SourceID` và `StoreID`. Cần xác nhận ID nào là khóa ổn định của bản ghi Lark trước khi đồng bộ.
- Các cột **211–215** là số video reup theo Instagram, Shopee, TikTok, Facebook, Threads. Các cột **216–225** là chi phí và số video affiliate có cast theo TikTok, Facebook, Instagram, Threads, Shopee. Trong bản xuất, nhóm này chỉ có dữ liệu ở kỳ **2026/10** (76/103 dòng có ít nhất một trường cast theo nền tảng; 64/103 dòng có ít nhất một trường reup); các kỳ trước không có dữ liệu ở nhóm cột này. Đây là dấu hiệu cấu trúc plan mới, không phải cơ sở để xóa dữ liệu lịch sử.
- Các cột cũ chứa plan, số duyệt, sau điều chỉnh, report, MTD, gap, cảnh báo, PIC nhiều team, live, thiết kế và thông tin vận hành khác. Số lượng lớn và mức điền thấp **không tự chứng minh cột là rác**; cần phân loại theo chủ sở hữu và mục đích trước khi loại khỏi giao diện hoặc tích hợp.
- **Danh sách lấy dữ liệu dự kiến cho Growth → Booking:** định danh dòng/store/kỳ; trạng thái chốt/duyệt và thời điểm sửa; số tổng theo từng nền tảng; chi phí theo từng nền tảng; tổng ngân sách Growth giao. Riêng Video Affiliate, ánh xạ từ nhóm TAP, reup 211–215 và cast 216–225, kèm đơn vị tiền gross/net được xác nhận. Chưa khóa danh sách cột vì cần đối chiếu bảng Lark sống và trường ngân sách nguồn chính thức.
- **Không đưa vào gói đồng bộ plan đầu vào:** cột `Report`, `Actual`, MTD, gap, cảnh báo, ghi chú vận hành, chỉ tiêu Design/Live/Self-channel không thuộc phạm vi Video Affiliate. Những cột này có thể vẫn cần cho báo cáo hoặc phân hệ khác; không đề xuất xóa khỏi Lark.
- Khi thử API, đọc metadata trường và vài bản ghi kỳ 2026/10; so sánh tổng số video/chi phí theo nền tảng với bản xuất, kiểm tra record ID và trạng thái duyệt. Chỉ sau đó mới chốt mapping từng trường.

## 3. Quy tắc từ tài liệu nguồn cần kiểm chứng khi đặc tả chi tiết

- `Booking đa sàn.pdf` nêu ký HĐNT cho KOC video và livestream; phụ lục/SOW đầu tiên trong tháng có thể gồm nhiều hạng mục và bóc chi phí từng hạng mục.
- File cũng nêu yêu cầu chứng từ và cách điền giá trị khác nhau cho cá nhân, hộ kinh doanh và công ty. Cần xác nhận với kế toán/pháp chế trước khi biến thành điều kiện bắt buộc trong hệ thống.
- `Booking E2E.pdf` yêu cầu theo dõi plan, BO, air, ngân sách, phễu CRM và hiệu quả theo KOC, KL, brand/store, PIC và kỳ. Công thức, thời điểm chốt số liệu và mẫu số của từng tỷ lệ chưa được chốt.

## 4. Nhu cầu chức năng để thiết kế ở SDLC giai đoạn 2

1. Quản lý KOC và các ID kênh riêng trên từng nền tảng; không dùng ID TikTok làm định danh chung của KOC.
2. Quản lý BO theo năm chiều, KOC, tháng, brand/store, PIC, đầu ra, tiến độ và chi phí phân bổ.
3. Quản lý HĐNT, phụ lục/SOW tháng và phụ lục bổ sung; tra cứu văn bản, phiên bản, hiệu lực, trạng thái ký và BO được bao gồm.
4. Đối soát tiền: tổng hạng mục/BO trong phụ lục bằng tổng giá trị phụ lục; thanh toán gắn với phụ lục, chi phí quản trị gắn với BO.
5. Báo cáo tách riêng **số BO**, **số đầu ra cam kết**, **số đầu ra đã air** và **số đầu ra đã nghiệm thu**. Không mặc định một BO bằng một video.
6. Plan Growth lưu số tổng theo nền tảng và ngân sách được giao; plan Content lưu các dòng phân rã theo năm chiều booking, số lượng và ngân sách, có đối soát về plan Growth.
7. Quản lý 3 đợt booking trong một tháng; mỗi list/BO gắn đợt, báo cáo số lượng và chi phí theo đợt đồng thời đối soát với tổng tháng.

## 5. Tiêu chí nghiệm thu nghiệp vụ sơ bộ

- Với một KOC có BO của hai brand trong cùng tháng trước khi ký, hệ thống lập được một phụ lục/SOW chứa cả hai BO và hiển thị chi phí riêng theo từng brand.
- Khi phụ lục tháng đã ký và có BO mới, hệ thống lập phụ lục bổ sung; nội dung và tổng tiền của phụ lục đã ký không thay đổi.
- Từ một BO có thể truy ngược tới phụ lục/SOW áp dụng và HĐNT; từ một phụ lục có thể liệt kê toàn bộ BO và đối soát tổng tiền.
- Báo cáo không dùng số mã BO làm số video air nếu chưa có dữ liệu đầu ra đã air tương ứng.
- Với mỗi nền tảng, hệ thống đối chiếu tổng số lượng các dòng Content phân rã với số tổng Growth giao; hiển thị chênh lệch và không báo “đã cân” khi còn lệch.
- Tổng ngân sách Content phân bổ phải được so với ngân sách Growth giao; hệ thống hiển thị phần còn lại hoặc phần vượt và chặn trình duyệt khi vượt hạn mức theo quy tắc BR-08.
- Với list Đợt 1 hoàn thành chậm nhất ngày 10/T−1, ghi nhận thời điểm hoàn thành và phiên bản list; sau khi Growth chốt plan ngày 25/T−1 phải chỉ ra list nào đã khớp, list nào cần đổi và ai xác nhận xử lý; không làm mất lịch sử list ban đầu.
- Với một tháng có 3 đợt booking, lọc được list/BO theo từng đợt và cộng gộp số lượng, ngân sách lên tổng tháng mà không đếm trùng BO.

## 6. Điểm còn mở

- Định danh KOC khi người thực hiện và bên ký/nhận tiền là các chủ thể khác nhau (cá nhân, hộ kinh doanh, công ty, MCN).
- Cách xác định **tháng gom BO**: tháng tạo BO, tháng dự kiến air hay tháng nghiệm thu.
- Một BO có thể có bao nhiêu đầu ra cùng tổ hợp bốn chiều; cách tính sản lượng cho live, story và reup.
- Quy tắc xử lý BO bị hủy, đổi giá hoặc đổi brand sau khi phụ lục đã ký.
- Bộ taxonomy chuẩn và ngưỡng KL thống nhất giữa các tài liệu; quyền duyệt và điều kiện ký cụ thể.
- Quy tắc phân rã tiếp theo sau năm chiều: Content có gán tuần, nhân sự và KOC cụ thể trong plan hay các thông tin này phát sinh khi Booking thực hiện; Booking tiếp nhận và thực hiện bước nào; ai duyệt thay đổi plan.
- Khi Growth giao ngân sách tổng, có đồng thời đặt trần ngân sách riêng cho từng nền tảng hay chỉ quản lý một trần chung; cách xử lý phần ngân sách chưa phân bổ và ngoại lệ vượt trần.
- Link bảng plan Growth trên Lark, loại tài liệu (Base/Sheets), người sở hữu và quyền cấp cho app tích hợp; trường nào đánh dấu plan đã duyệt, khóa kỳ hoặc điều chỉnh; tần suất Content cần thấy thay đổi.
- Xác nhận đề xuất team DX cho plan 10/2026 đã được Lead Growth/Lead Booking/Content phê duyệt và bắt đầu áp dụng chưa; nếu có, bản plan/order nào là nguồn dữ liệu chính thức khi hai hệ thống lệch nhau.
- “List Đợt 1 xong ngày 10/T−1” có nghĩa là đủ thông tin/trạng thái gì, ai duyệt; căn cứ số dự kiến nào; từ ngày 10 đến trước số Growth chốt ngày 25 được phép đi tới mức Brand duyệt, liên hệ KOC, tạo BO hoặc chốt cam kết nào?
- Ranh giới và lịch của Đợt 1/2/3: mỗi đợt bắt đầu/kết thúc khi nào, hạn chốt list Đợt 2/3, quy tắc chuyển BO giữa các đợt và có cần phân bổ chỉ tiêu/ngân sách Growth theo đợt không?
- Trước ngày 10/T−1, B2C nhận số dự kiến nào để lập list Đợt 1, từ ai, ở đâu, có Content phân rã plan tạm hay không; ai được phép duyệt/điều chỉnh list khi số Growth chốt ngày 25 khác dự kiến?

## 7. Bước SDLC tiếp theo

Hoàn tất các điểm còn mở và kịch bản ngoại lệ ở giai đoạn 1; sau khi xác nhận BRD mới cập nhật thiết kế CSDL/API, `schema.prisma`, mẫu chứng từ và kế hoạch kiểm thử. Bản web hiện có là prototype, chưa đáp ứng các quy tắc BR-03 đến BR-06.
