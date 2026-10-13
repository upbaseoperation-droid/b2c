# Kế hoạch review module quản lý hợp đồng

Ngày cập nhật: 13/10/2026. Trạng thái: nháp để review, chưa triển khai.

## 1. Phạm vi đã được người dùng chốt

- Xây module quản lý hợp đồng trong dự án B2C hiện tại.
- Dùng bộ mẫu tại `Quản lý hợp đồng/`, do pháp chế quản lý.
- MVP hỗ trợ tạo hợp đồng và theo dõi tiến trình duyệt, ký.
- Hai luồng riêng: gửi/phê duyệt nội bộ và trình ký. Chỉ sau khi đủ phê duyệt mới được bắt đầu trình ký.
- Công ty đang trình ký qua MISA AMIS weSign (người dùng đã xác nhận); MVP cần tích hợp để B2C theo dõi tiến độ thực tế.
- AI chỉ kiểm tra hợp đồng sau khi người dùng điền thông tin; không soạn mẫu, không tự sửa điều khoản, không tự phê duyệt.
- Giữ yêu cầu đăng nhập Lark và phân quyền cho người tạo, kế toán, pháp chế, Lead và người duyệt/ký.

Đây là điều chỉnh phạm vi so với tài liệu ranh giới cũ đặt hợp đồng tại UpAffiliate. Khi cập nhật tài liệu chính thức cần phản ánh quyết định này; không coi ranh giới cũ là lý do chuyển module sang dự án khác. Kế hoạch này chưa thay đổi trạng thái các cổng SDLC và chưa cấp phép đưa prototype vào vận hành thật.

## 2. Hiện trạng đã kiểm tra

`web-admin/src/components/ContractModal.tsx` đang dùng các loại mẫu khai báo trong mã, nội dung xem trước dựng sẵn và luồng xuất tài liệu tự dựng. `ocrPresets.ts` có mã mẫu pháp chế nhưng mã/tên mẫu không chứng minh nội dung được lấy từ file nguồn.

Luồng đã kiểm tra chưa đọc 8 file Word trong thư mục nguồn để tạo hợp đồng. Màn hình `ContractView.tsx` chủ yếu theo trạng thái deal và tạm ứng/quyết toán, chưa phải hồ sơ duyệt/ký độc lập. Prototype hiện có không phải hệ thống hợp đồng dùng thật.

## 3. Bộ mẫu nguồn

| Mã nhóm | Chủ thể | File nguồn |
|---|---|---|
| IND-HĐ | Cá nhân | 1.1.1. BM.HĐ.VID.IND.Ver052026 booking Video.docx |
| IND-BBNT | Cá nhân | 1.1.2. BM.BBNT.VID.IND.Ver052026 booking Video.docx |
| HKD-HĐ | Hộ kinh doanh | 2.1.1. BM.HĐ.VID.HKD.Ver052026 booking Video.docx |
| HKD-BBNT | Hộ kinh doanh | 2.1.2. BM.BBNT.VID.HKD.Ver052026 booking Video.docx |
| COM-HĐ | Công ty | 3.1.1. BM.HĐ.VID.COM.Ver052026 booking video.docx |
| COM-BBNT | Công ty | 3.1.2. BM.BBNT.VID.COM.Ver052026 boooking video.docx |
| CTV-HĐNT | CTV theo tháng | 4.1. BM.HĐVID.CTV.Ver052026 Upbase HĐNT booking CTV Video tháng.docx |
| CTV-BBNT | CTV theo tháng | 4.2. BM.BBNTVID.CTV.Ver052026 Upbase BBNT booking Video tháng.docx |

Thư mục còn có `QUY ĐỊNH VỀ BIỂU MẪU HỢP ĐỒNG BOOKING.pdf`. Cần đọc và đối chiếu nội dung PDF với quy trình và từng mẫu trước khi chốt các ngưỡng nghiệp vụ. Chưa xác minh PDF trong đợt kiểm tra này.

Không đưa mẫu livestream hoặc SOW do ứng dụng tự dựng vào bộ mẫu chính thức nếu chưa có file nguồn do pháp chế cung cấp/duyệt.

### Quản lý mẫu

- Pháp chế sở hữu nội dung, phát hành phiên bản mới và ngừng sử dụng phiên bản cũ.
- Giữ nguyên file nguồn; tạo bản làm việc để mapping trường, không chỉnh trực tiếp file gốc.
- Mapping cả đoạn văn, bảng, header/footer, thông tin ký và trường lặp; không chỉ thay chuỗi nhìn thấy trên màn hình.
- Trường được phép điền có biểu mẫu tương ứng; điều khoản chuẩn được bảo toàn. Mọi thay đổi ngoài trường điền phải có dấu vết và review pháp chế.
- Mỗi mẫu có mã, phiên bản, chủ thể, loại văn bản, ngày hiệu lực, trạng thái và người phát hành.
- Mỗi hồ sơ lưu phiên bản mẫu và bản dữ liệu đã điền. Mẫu mới không thay nội dung hồ sơ đã tạo hoặc đã ký.

## 4. Luồng MVP

Luồng 1 — Gửi và phê duyệt: chọn mẫu → điền thông tin → tạo bản nháp theo file nguồn → AI kiểm tra → xử lý nhận xét → gửi duyệt → review kế toán/pháp chế và các bước bắt buộc → đủ phê duyệt.

Luồng 2 — Trình ký qua WeSign: lấy đúng phiên bản đã đủ phê duyệt → người có quyền trình ký hoặc liên kết luồng ký được tạo trên WeSign → đồng bộ tiến độ → hoàn tất ký → nhận/lưu bản đã ký.

Điều kiện mở luồng 2 được kiểm tra tại máy chủ: đúng phiên bản đã duyệt, đủ các bước phê duyệt bắt buộc, chưa bị thu hồi/hủy và người thao tác có quyền trình ký. Ẩn nút trên giao diện không thay thế kiểm tra này. Không gửi ký khi đang review, chờ bổ sung, bị từ chối hoặc mới duyệt một phần.

AI check diễn ra trên bản đã điền. Lỗi trường bắt buộc có thể kiểm tra bằng quy tắc trước khi gọi AI. Phân loại nhận xét thành lỗi dữ liệu, chênh lệch với mẫu và vấn đề cần người review đánh giá. Không hiển thị kết luận bảo đảm hợp đồng có hiệu lực pháp lý.

### Theo dõi duyệt

- Có hàng đợi theo người/phòng ban, người được giao, hạn xử lý và hồ sơ chờ bổ sung.
- Mỗi bước ghi người xử lý, kết quả, nhận xét, thời điểm và phiên bản được duyệt.
- Kế toán review nội dung tài chính; pháp chế review pháp lý và thay đổi điều khoản; Lead/người có thẩm quyền duyệt theo luồng được thống nhất.
- Trình tự hoặc review song song cần được kế toán/pháp chế xác nhận; MVP không tự suy ra luồng từ chức danh trên Lark.
- Yêu cầu sửa/từ chối có lý do. Gửi lại tạo vòng review mới và giữ lịch sử vòng trước.
- Nội dung đổi sau khi gửi/duyệt tạo phiên bản mới; quyết định cũ không tự áp dụng cho phiên bản mới. Mặc định yêu cầu duyệt lại, chỉ tối ưu các bước bị ảnh hưởng sau khi có quy tắc được duyệt.

### Trình ký và theo dõi WeSign

- Ghi từng bên/người ký, trạng thái chờ ký/đã ký/từ chối, ngày ký và bằng chứng.
- WeSign là nguồn trạng thái ký; module B2C hiển thị bản đồng bộ, thời điểm đồng bộ gần nhất và lỗi kết nối nếu có. Không dùng cập nhật thủ công làm nguồn chính cho tiến độ WeSign.
- MVP ưu tiên khả năng liên kết và đọc tiến độ luồng ký do công ty đang tạo trên WeSign. Tạo/gửi luồng ký trực tiếp từ B2C là phần cần xác minh API và quyền tài khoản, không mặc định thay đổi cách công ty đang trình ký.
- Khi liên kết luồng có sẵn cần kiểm tra phiên bản đã duyệt, đối tác/người ký và tài liệu tương ứng; không cho liên kết tùy ý chỉ dựa trên mã hợp đồng.
- Chỉ đánh dấu hoàn tất khi đủ người ký bắt buộc và có bản ký được xác nhận tương ứng với phiên bản đã duyệt.
- Nếu bản ký khác bản duyệt, chuyển trạng thái cần đối chiếu và không tự đóng hồ sơ.
- MVP có tích hợp WeSign để theo dõi trình ký; chữ ký thực hiện trên WeSign. Không xây công cụ ký riêng.
- Trạng thái duyệt/ký độc lập với trạng thái thanh toán. Đã duyệt không đồng nghĩa đã ký; đã ký không đồng nghĩa đã chi tiền.

### Phạm vi tích hợp WeSign cần xác minh

Người dùng đã xác nhận nhà cung cấp là MISA AMIS weSign. Tài liệu nghiên cứu MISA áp dụng cho hướng tích hợp; quyền API, phạm vi dữ liệu, gói dịch vụ và khả năng trên tài khoản công ty vẫn cần xác minh thực tế.

- B2C cần biết: đã trình ký chưa, đang chờ ai/bước nào, ai đã ký, ai từ chối, thời điểm xử lý, luồng có bị hủy không và bản ký cuối cùng. Chỉ hiển thị chi tiết được API thực tế cung cấp; thông tin thiếu ghi rõ chưa có.
- Liên kết hồ sơ/phiên bản đã duyệt với mã luồng ký, mã tài liệu và tài khoản tổ chức trên WeSign.
- Nhận thay đổi qua webhook nếu được hỗ trợ và cấp quyền; truy vấn API định kỳ/đối soát để khôi phục sự kiện bị mất. Tần suất chốt sau khi biết hạn mức API và nhu cầu cập nhật.
- Xử lý sự kiện trùng/sai thứ tự, mất kết nối, token hết hạn và tài liệu bị hủy/gửi lại. Lỗi đồng bộ không đổi trạng thái hợp đồng thành thất bại ký.
- Gửi lại tạo lượt trình ký mới, giữ lịch sử lượt cũ; không tạo luồng trùng khi thử lại thao tác gửi. Nếu phiên bản nội dung thay đổi thì bắt buộc qua luồng phê duyệt lại trước lượt trình ký mới.
- Nếu phát hiện luồng WeSign được tạo trước khi nội bộ đủ duyệt, gắn cảnh báo ngoại lệ; không tự coi là đủ duyệt và không tự hủy luồng bên ngoài.
- Không giả định một tài khoản tích hợp được xem tất cả hợp đồng của công ty. Xác minh phạm vi đọc luồng do kế toán/pháp chế tạo và khả năng truy xuất luồng cũ.
- Quyền xem tiến độ ký và quyền trình ký tách riêng. Thao tác hủy/thu hồi trên WeSign cần quyền riêng; MVP không mặc định cấp cho Booking.
- File trả về phải gắn đúng luồng/phiên bản, có quyền truy cập; dữ liệu xác thực lưu phía máy chủ.

Nguồn nghiên cứu ngày 13/10/2026:

- [MISA: Tổng quan Open API weSign](https://www.misa.vn/154977/tong-quan-open-api-hop-dong-so-misa-wesign/): mô tả tạo luồng, theo dõi qua API/webhook và tải tài liệu đã ký.
- [MISA weSign Public API](https://amisapp.misa.vn/wesign/api/public/docs-public/index.html): tài liệu API công khai; cần xác minh phương thức xác thực, quyền và trường trạng thái trên môi trường công ty.

Chưa kết nối tài khoản WeSign, chưa thử API và chưa tạo/gửi hợp đồng ra hệ thống bên ngoài.

## 5. Mô hình nghiệp vụ đề xuất để review

| Thành phần | Nội dung |
|---|---|
| Mẫu và phiên bản mẫu | File nguồn, mapping trường, phạm vi áp dụng, quyền phát hành |
| Hồ sơ hợp đồng | Mã, người phụ trách, đối tác, chủ thể, job/brand liên quan, trạng thái |
| Phiên bản tài liệu | Mẫu đã dùng, dữ liệu điền, file sinh ra, người/thời điểm tạo |
| Kết quả AI check | Phiên bản được check, nhận xét, dẫn chứng, trạng thái người dùng xử lý |
| Vòng duyệt và bước duyệt | Reviewer, vai trò, hạn xử lý, quyết định và phiên bản |
| Lượt trình ký WeSign | Mã luồng/tài liệu, phiên bản đã duyệt, người trình ký, trạng thái và lần đồng bộ |
| Bước/người ký | Vai trò, thứ tự, trạng thái và thời điểm theo dữ liệu WeSign |
| Sự kiện đồng bộ ký | Mã sự kiện nếu có, thời điểm nguồn/tiếp nhận, kết quả xử lý và lỗi |
| Tài liệu liên quan | BBNT, phụ lục nếu có mẫu được duyệt, giấy ủy quyền và chứng từ |
| Nhật ký | Tạo/sửa, phân công, duyệt, tải lên bản ký, đổi quyền và truy cập nhạy cảm |

Lưu riêng trạng thái phê duyệt: nháp/đang duyệt/cần bổ sung/bị từ chối/đã phê duyệt/thu hồi. Lưu riêng trạng thái trình ký: chưa trình/đã trình/chờ ký/ký một phần/hoàn tất/từ chối/hủy. Mapping các trạng thái này theo dữ liệu thực tế của WeSign, không giả định đây là tên hoặc mã trạng thái của API. Timeline hiển thị hai luồng riêng. Hủy hồ sơ cần lý do và giữ lịch sử. AI check có trạng thái riêng: chưa chạy/đang chạy/hoàn tất/lỗi/kết quả cũ do tài liệu thay đổi.

## 6. AI check sau khi điền

- Đầu vào: nội dung mẫu đúng phiên bản, bản đã điền và quy tắc/checklist đã được pháp chế/kế toán xác nhận.
- Kiểm tra: trường còn trống, thông tin lặp không nhất quán, số tiền/ngày/tham chiếu, điều khoản thiếu hoặc khác mẫu, vấn đề cần reviewer đánh giá.
- Đầu ra: mức độ, loại vấn đề, đoạn dẫn chứng/vị trí, lý do và đề xuất xử lý. Không sửa file tự động.
- Người dùng sửa thông tin rồi chạy lại; kết quả cũ bị đánh dấu không còn áp dụng cho phiên bản mới.
- Khi dịch vụ AI lỗi, giữ nguyên bản nháp, báo lỗi và cho chạy lại. Luồng review thủ công vẫn có thể thực hiện và ghi rõ chưa có kết quả AI.
- Chỉ người có quyền trên hồ sơ được chạy/xem kết quả; nội dung từ file là dữ liệu, không phải chỉ dẫn cho AI thay đổi quy tắc hay gọi công cụ.
- Trước khi sử dụng tài liệu thật cần chốt dịch vụ AI, phạm vi dữ liệu gửi đi, lưu trữ và quyền truy cập. Đợt lập kế hoạch này không gửi mẫu hợp đồng hoặc dữ liệu đối tác lên AI bên ngoài.

## 7. Lark và phân quyền

Lark xác định danh tính; module quản lý quyền nghiệp vụ. Giới hạn tenant được phép, dùng định danh ổn định, kiểm tra quyền tại máy chủ cho cả dữ liệu và file. Tài khoản mới không tự có quyền xem toàn bộ hợp đồng.

| Vai trò | Quyền đề xuất |
|---|---|
| Người tạo | Tạo/sửa nháp và gửi review trong phạm vi được giao |
| Lead | Xem/phân công/duyệt hồ sơ thuộc phạm vi phụ trách |
| Kế toán | Xem và review hồ sơ được giao, gồm dữ liệu tài chính cần thiết |
| Pháp chế | Review pháp lý; quản lý và phát hành mẫu theo quyền được cấp |
| Người duyệt/ký | Xử lý bước được giao và xem tài liệu liên quan |
| Quản trị | Cấu hình quyền/tích hợp; quyền đọc nội dung hợp đồng cấp riêng |

Tách quyền xem dữ liệu nhạy cảm, tải file, xuất danh sách và lưu trữ. Không tự duyệt hồ sơ do mình tạo tại bước yêu cầu kiểm soát độc lập. Có cơ chế thu hồi quyền và bàn giao hồ sơ khi nhân sự chuyển vai trò/ngừng làm việc.

## 8. Màn hình MVP

1. Thư viện mẫu pháp chế: chọn đúng chủ thể/loại văn bản và phiên bản.
2. Tạo hợp đồng: biểu mẫu, xem trước tài liệu, lưu nháp và xuất DOCX/PDF.
3. Kết quả AI check: nhận xét có dẫn chứng và trạng thái đã xử lý.
4. Hub review: hàng đợi, bộ lọc và hạn xử lý.
5. Chi tiết hồ sơ: phiên bản, nhận xét, quyết định và tài liệu liên quan; hai khu vực riêng cho tiến trình phê duyệt và trình ký WeSign. Hiển thị người đang giữ bước ký, thời điểm đồng bộ và liên kết WeSign nếu được hỗ trợ.
6. Quản trị mẫu và phân quyền: dành cho người được cấp quyền.

## 9. Backlog và tiêu chí nghiệm thu

| Thứ tự | Công việc | Bằng chứng hoàn thành |
|---|---|---|
| 1 | Chuẩn hóa danh mục 8 mẫu và mapping | Pháp chế đối chiếu từng mẫu; nội dung và bố cục được giữ trên bản xuất |
| 2 | Hồ sơ, lưu nháp, phiên bản và xuất file | Dữ liệu điền đúng vị trí; trường lặp nhất quán; lưu/tải lại không mất hồ sơ |
| 3 | Lark login và quyền | Tài khoản ngoài tổ chức/bên ngoài phạm vi bị từ chối cả qua URL và tải file |
| 4 | AI check sau điền | Nhận xét gắn đúng phiên bản và dẫn chứng; lỗi AI không làm mất tài liệu |
| 5 | Luồng review | Quyết định có người/thời điểm/phiên bản; gửi lại giữ lịch sử; sửa sau duyệt cần duyệt lại |
| 6 | Tích hợp WeSign | Chặn trình ký khi chưa đủ duyệt kể cả gọi trực tiếp; liên kết đúng phiên bản; theo dõi người/bước ký và bản ký; sự kiện trùng không tạo trạng thái/lượt ký trùng; lỗi đồng bộ có cảnh báo |
| 7 | UAT | Người tạo, kế toán và pháp chế hoàn thành luồng bằng dữ liệu giả lập trước khi dùng thật |

Đây là thứ tự ưu tiên, chưa phải lịch cam kết. Ước lượng sau khi review mapping mẫu, luồng duyệt và hạ tầng lưu trữ/đăng nhập hiện tại.

## 10. Nội dung còn cần review

- Mapping từng mẫu và xử lý các tham chiếu HĐ/SOW chưa nhất quán; thay đổi nội dung phải do pháp chế quyết định.
- Ngưỡng nghiệp vụ và SLA theo quy định hiện hành, không kế thừa tự động các ngưỡng viết sẵn trong prototype.
- Luồng duyệt, người có quyền xác nhận bản ký và trường hợp ngoại lệ.
- Quyền API/gói dịch vụ MISA AMIS weSign, tài khoản tạo luồng hiện tại; khả năng đọc luồng của công ty, webhook và tải bản đã ký. Nhà cung cấp đã xác nhận, không cần hỏi lại. Cần thử trên môi trường kiểm thử trước khi chốt đặc tả tích hợp.
- MVP chỉ liên kết/đọc tiến độ hay có thêm nút trình ký trực tiếp qua API. Trong cả hai trường hợp, phê duyệt nội bộ phải hoàn tất trước khi trình ký.
- Chính sách dữ liệu nhạy cảm, thời gian lưu hồ sơ và cấu hình AI.

Không nằm trong MVP: AI soạn hợp đồng, tự xây nền tảng ký điện tử, portal đối tác, giải ngân/hạch toán, dự án quản lý hợp đồng tổng quát cho mọi phòng ban. Tích hợp tiến độ WeSign nằm trong MVP.
