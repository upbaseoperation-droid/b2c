# Quy trình vận hành Marketing B2C

Bản làm việc ngày 09/10/2026. Mục đích: làm tài liệu chung để trao đổi và hoàn thiện từng phần với người phụ trách. Nội dung bên dưới tổng hợp từ nguồn được cung cấp, **chưa phải SOP đã duyệt**. Không dùng màn hình prototype để suy ra quy định nghiệp vụ.

## 1. Phạm vi và cách dùng nguồn

**Quy ước đã được người phụ trách xác nhận:** T là tháng plan chính/tháng triển khai. T−1 là tháng trước, T+1 là tháng sau. Các nguồn dùng T/T+1 để chỉ chuẩn bị/triển khai phải quy đổi về T−1/T khi tổng hợp. Không coi khác ký hiệu tháng là mâu thuẫn nghiệp vụ.

Phạm vi là hoạt động của phòng Marketing B2C, gồm nghiên cứu, chiến lược, kế hoạch, triển khai, nghiệm thu, đo lường và quản trị nguồn lực. Phạm vi nghiệp vụ rộng hơn phạm vi phần mềm B2C Ops Hub; việc thuộc UpAffiliate hoặc Lark vẫn phải xuất hiện trong tài liệu khi có bàn giao với B2C.

Đã kiểm kê và trích xuất 32 file nguồn ở thư mục gốc và thư mục Luồng quản lý job, gồm 19 workbook Excel/XLSM với 161 sheet, 5 PDF, 3 Word, 1 CSV và 4 file Markdown/text. Đã đọc bổ sung 7 tài liệu Markdown trong Quy trình - MD, nội dung 4 ZIP trong Quy trình - MD và Knowledge - MD, gồm hướng dẫn Content Tactics và 2 PDF đào tạo đính kèm (31 trang). Đã xem bộ ảnh minh họa Content Tactics. Có các bản sao và bản trích xuất chồng nội dung; không tính chúng là bằng chứng độc lập.

Các workbook quy trình/knowledge/chính sách/proposal được trích xuất toàn bộ ô có dữ liệu. Các file Lark nghiệp vụ được quét toàn bộ cấu trúc và hàng, đọc trường dữ liệu để hiểu luồng; chưa kiểm toán từng giao dịch/KOC hoặc xác minh mọi số liệu hiệu quả. CSV đọc schema và số hàng. PDF đọc lớp chữ và xem thêm các bảng/sơ đồ ảnh trọng yếu; các sơ đồ ERD nhỏ chưa đọc được toàn bộ nhãn. Word đọc đoạn và bảng; hình có thể chứa thông tin bổ sung. Không truy cập các link Lark/Google bên trong nguồn trong lượt này.

Một số Excel khai báo dimension A1 dù có nhiều ô: đã đọc lại XML thực tế để tránh coi nhầm là file rỗng. Các nguồn đều được giữ nguyên.

Phân biệt ba loại nội dung khi hoàn thiện:

- Quy định trong nguồn: ghi rõ tài liệu và điều kiện áp dụng; còn cần xác nhận hiệu lực hiện tại.
- Thực tế được kể lại: phản ánh cách nhân sự làm, có thể khác quy định.
- Đề xuất/mẫu tham khảo: không tự nâng thành chính sách. SIPOC có nhãn DL/KS/GT; P3 ghi bản đề xuất; MeUp ghi dữ liệu demo.

## 2. Mô hình vận hành được mô tả trong tài liệu

### 2.1 Một dự án có một Strategy Owner

Theo Định hướng Marketing B2C / Cơ cấu team, mục II.5:

| Nhánh dự án | Strategy Owner | Cách triển khai |
| --- | --- | --- |
| Tier A, dự án thương hiệu/chiến lược | Brand Team | Brand sở hữu Brand và Content Strategy; giao workstream cho Content và Booking/Content Execution |
| Tier B, tăng trưởng chủ yếu bằng content | Content Strategy Team | Content sở hữu chiến lược nội dung, phối hợp đội execution |
| Tier C, dự án nhỏ | Content Full-stack | Content làm planning và execution trong phạm vi nhận |
| Dự án/campaign tiềm năng | Review Board quyết định Tier A/B | Phân loại trước khi bố trí owner và nguồn lực |

Điều kiện tier là tham chiếu trong nguồn, chưa tự biến thành bộ quy tắc duyệt tự động. Khi Brand là owner, Content không tự thay Target Audience, positioning, objective, Big Idea, Key Message, KV hoặc vai trò kênh.

### 2.2 Vai trò và bàn giao chính

| Vai trò | Trách nhiệm thể hiện trong nguồn | Bàn giao chính |
| --- | --- | --- |
| Brand Team | Làm rõ đề bài, research, chiến lược, campaign, thông điệp/KV; duyệt và chịu trách nhiệm kết quả tổng | Direction/brief cho Content, Booking, Design, Media; report và learning |
| Content Team | Content Strategy khi không có Brand; pillar/angle/format/calendar; script/hero content, QC; có thể booking KL cao | Creator/content brief; phản hồi nội dung; báo cáo theo workstream |
| Booking & Content Execution | Tìm/shortlist creator, thương lượng, gửi mẫu, follow script/demo/air, mã ads, nghiệm thu, hồ sơ chi phí | Deliverable và bằng chứng cho Content/Brand, Media, Account/Kế toán |
| Growth | Ecom strategy, mục tiêu kinh doanh, ngân sách/order, điều kiện bán hàng và phối hợp đo hiệu quả | Đầu vào kế hoạch; deal/SKU/voucher/commission, dữ liệu báo cáo |
| Account | Đầu mối thông tin khách hàng ở các trường hợp trong nguồn; nghiệm thu và tổng hợp | Phản hồi brand; xác nhận nghiệm thu; bảng lỗi |
| Design/Media | Thực hiện tài nguyên hình ảnh hoặc quảng cáo theo brief, quyền và ngân sách | Asset, kết quả và phản hồi tối ưu |
| KOC/KOL/MCN/VJ/CTV | Thực hiện đầu ra theo hợp tác, cung cấp hồ sơ và bằng chứng | Script/demo/video/live, link/code/file, chứng từ |
| Brand/Kho | Chuẩn bị/gửi sản phẩm và các điều kiện phía brand | Sản phẩm, mã vận đơn, xác nhận sẵn sàng |
| Pháp chế/Tài chính Kế toán | Review điều khoản/chứng từ, trình ký, duyệt/xử lý thanh toán theo luồng | Kết quả kiểm tra/ký/chi hoặc danh sách lỗi |

Brand Team nội bộ khác Brand/Client phía khách hàng; cần dùng tên phân biệt xuyên suốt SOP. Quyền duyệt nội bộ và quyền duyệt của nhãn hàng là hai mốc khác nhau.

## 3. Bản đồ quy trình tổng

Đây là cấu trúc tổng hợp để trao đổi; chưa xác nhận một trình tự bắt buộc giống nhau cho mọi nhánh.

| Phần | Trigger và đầu vào | Đầu ra để chuyển tiếp |
| --- | --- | --- |
| 01 Tiếp nhận | Gian mới onboard, kế hoạch tháng, campaign hoặc yêu cầu bổ sung | Bài toán, phạm vi, mục tiêu, ngân sách, thời hạn và người chịu trách nhiệm |
| 02 Research và phân loại | Business/marketing brief; dữ liệu brand, ngành hàng, khách hàng, đối thủ, hiệu quả hiện tại | Chẩn đoán, cơ hội, tier và Strategy Owner |
| 03 Strategy và đề xuất | Kết quả research; ecom direction | Brand/content/channel/creator direction; proposal được xác nhận |
| 04 Plan và nguồn lực | Direction, ngân sách, target | Plan theo store, SKU, nền tảng, kênh, tuần/đợt; PIC và scope |
| 05 Thực thi theo nhánh | Plan/brief được xác nhận | Booking video; Self Channel; Live Affiliate; tài nguyên KV/SIS/PDP/social theo phạm vi |
| 06 Kiểm soát và thay đổi | Tiến độ, script/demo, phát sinh | Đầu ra được duyệt; thay đổi có xác nhận; cảnh báo có người xử lý |
| 07 Air và bàn giao | Nội dung và điều kiện đăng/live đủ | Link/replay, ads code/quyền dùng, file, dữ liệu và bằng chứng đúng deal |
| 08 Nghiệm thu và thanh toán | Deliverable, hợp đồng/chứng từ, kết quả chi | Nghiệm thu, sửa lỗi, thanh toán/hoàn ứng, xác nhận đóng nghĩa vụ |
| 09 Báo cáo và tối ưu | Plan/report, dữ liệu sàn/ads/KOC | Insight, hành động giữ/thay/scale creator, cập nhật direction và kỳ tiếp theo |
| 10 Quản trị nhân sự | Phân công, workload, bằng chứng, kết quả | Review năng lực/kết quả, điều phối/bàn giao và đề xuất phát triển |

Ký hợp đồng, gửi mẫu, duyệt nội dung và tạm ứng có thể có nhánh song song tùy điều kiện. Tài liệu cuối phải vẽ các điều kiện này, không ép thành một pipeline đơn tuyến.

## 4. Các nhánh thực thi

### 4.1 Booking video

Ecom Strategy → Content Strategy → Booking brief/content direction/chân dung KOC → shortlist/báo giá → audit nội bộ → brand duyệt → liên hệ/thương lượng → trình lại khi giá/timeline/scope đổi → xác nhận hợp tác trong nhóm → BO và hồ sơ hợp đồng → gửi/nhận mẫu → script/demo và các vòng feedback → air → bàn giao code/file/quyền → nghiệm thu/chứng từ/thanh toán → đánh giá hiệu quả và cập nhật kho KOC.

Nguồn Tech mô tả cả 19 nhóm pipeline, gồm hồ sơ, tạm ứng, sample, sản xuất, duyệt, air, usage, nghiệm thu, thanh toán, hoàn tất và hủy/tạm dừng. Trạng thái tổng không thay thế trạng thái của từng đầu ra hoặc từng nghĩa vụ.

### 4.2 Booking đa nền tảng

Theo ghi chú luồng job: một lần trao đổi có thể chốt nhiều video trên nhiều nền tảng với một hợp đồng. Nghiệm thu theo từng video/BO; có thể mua thêm quyền/gia hạn sau khi thấy hiệu quả.

Phải tách kênh truyền thông nơi đăng nội dung và kênh affiliate nơi ghi nhận bán hàng. Một asset có thể có nhiều SOW: sản xuất, gắn link, ads, quyền hình ảnh/video, reup. Số hợp đồng, job, asset, BO và lần thanh toán không đồng nhất. Cách tổ chức campaign/job đa sàn trong ghi chú có nhiều phương án, chưa coi phương án được gợi ý là quyết định đã chốt.

### 4.3 Self Channel và CTV/VJ

Content plan/direction → phân bổ tuần/ngày → script → nội bộ/brand duyệt theo phạm vi → chuẩn bị sản phẩm → CTV/VJ sản xuất → demo/feedback → đăng → dữ liệu đầu ra → nghiệm thu/thanh toán CTV → review nội dung.

Khảo sát có thực tế nhận plan ngày 18, phân bổ ngày 22, gửi brand ngày 25 và chuyển CTV sau duyệt ngày 27 của T−1. SLA đưa ra lịch direction theo đợt ngày 15/25 T−1 và trước ngày 05 T. Hai nguồn cần xác nhận theo mô hình/gian, không tự chọn một lịch chung.

### 4.4 Livestream Affiliate

Tech tách nhánh độc quyền/mua gói/daily trả phí và nhánh daily chỉ commission. Nhánh trả phí mô tả shortlist, duyệt, chốt hợp tác/hợp đồng; tiếp đó live sheet/group, deal/giỏ/commission/ads, kịch bản/tài nguyên, kiểm tra tồn kho/voucher/quyền, trực phiên và log sự cố, số liệu/chứng từ, nghiệm thu và đối soát.

Nhánh daily only commission còn bảng trống trong Tech: phải làm rõ trước khi viết SOP chi tiết. Livestream creator khác livestream inhouse; chỉ đưa phần inhouse vào phạm vi B2C khi xác nhận trách nhiệm.

### 4.5 Brand Campaign, Design và Social

Business brief → research/insight → objective/TA/positioning → Big Idea/Key Message/KV → channel/creator/content plan → brief execution/Design/Media → review theo milestone → theo dõi business và communication impact → campaign report/learning.

Clio, Onstyle và Olay là ví dụ thực tế về bộ đầu vào/đầu ra research, thông điệp, content, plan từng sàn, promotion, SOW và P&L. Không sao chép điều kiện thương mại riêng của một khách hàng thành quy định chung.

## 5. Các quy tắc đã tìm thấy và điểm cần xác nhận

| Chủ đề | Nội dung nguồn | Cần đối chiếu khi trao đổi |
| --- | --- | --- |
| Listing theo đợt | Chuẩn hóa theo tháng plan chính: đẩy list 10/20/30 T−1; gửi brand 12/22 T−1 và 02 T; meeting chốt 13/23 T−1 và 03 T; hoàn thiện 15/25 T−1 và 05 T | Khác ký hiệu tháng trong nguồn không phải mâu thuẫn; giữ thứ tự bước và khoảng thời gian |
| Plan tháng | SLA: nguồn lực/list đầu ngày 10 T−1, chốt plan 20–23 T−1 | Khảo sát có mốc nhận 15/18/20 và duyệt 25/27; cần xác định input sơ bộ và final |
| Top-up/gian mới | Xếp theo kỳ list/direction gần nhất, đợt bổ sung thường air sau ngày 20 | Ai chấp thuận việc gấp và ảnh hưởng target/nguồn lực |
| Gửi hàng | SLA mục Self Channel: 48h sau đủ thông tin; mục VI: 24h sau có địa chỉ | Phạm vi của từng SLA và điểm bắt đầu |
| Chờ duyệt/gửi hàng | Nguồn có raise Growth/Account/Leader và đề xuất thay creator hoặc đổi timeline | Đề xuất tự air khi brand duyệt chậm không phải tự động được phép air; cần người duyệt và điều kiện |
| Bàn giao | Người cũ hoàn tất phạm vi nhận hoặc có xác nhận chuyển đầy đủ; bàn giao tiến độ, tồn, deadline và rủi ro | Cách xác nhận; nhánh nghỉ đột xuất; quyền/việc đang mở |
| Ký hợp đồng | Tech yêu cầu trước air tối thiểu một ngày, đồng thời ghi thực tế vẫn air khi chưa xong HĐ | Quy định chính thức và cách phê duyệt ngoại lệ |
| Giá trị hợp tác | SLA nêu ngưỡng >9 triệu phải có HĐ trước DNTT tối thiểu hai ngày; Tech nêu ngưỡng 50 triệu cho chọn mẫu và review mẫu riêng | Hai ngưỡng phục vụ hai quyết định khác nhau; xác nhận hiệu lực, không coi là cùng một ngưỡng |
| Nghiệm thu/sửa lỗi | SLA: chốt mùng 2; tổng lỗi ngày làm việc 4/10; mở sửa ngày 5/11 từ 9h, sửa trước 17h, khóa 17h30 | Ngày lịch/ngày làm việc, owner xác nhận và thay đổi sau cửa sổ sửa |
| Tạm ứng trước air | Customer journey mô tả dùng link HĐ tạm ở ô link air để tạo DNTT rồi xóa/back trạng thái | Đây là cách làm thực tế vượt hạn chế hệ thống, không đưa thành thao tác chuẩn |
| Chất lượng content | Knowledge chia objective/funnel → hook → body/product/claim → visual/format → CTA, kèm câu hỏi và action | Ai check vòng đầu, ai quyết cuối, lưu feedback và phiên bản như thế nào |
| P2/P3 | 4P có ASK/bằng chứng, workload theo store/scope; P3 có plan/report được duyệt, tỷ trọng tổng 100%, chống trừ SLA hai lần | P3 ghi bản đề xuất 09/2026; workbook KPI story point khác mô hình 4P; cần chọn chính sách có hiệu lực |
| Đo hiệu quả | E2E và các nguồn có GMV 14/30/60 ngày, NMV, chi phí, ROI/CIR | Phân biệt GMV tháng với GMV theo tuổi video; định nghĩa ROI trong SIPOC là GMV/cost, chưa phải lợi nhuận |

## 6. Những điều cần sửa trong cách hiểu trước đây

- Không thể nói B2C chỉ là điều hành booking: nguồn cơ cấu team có Brand Strategy, Content Strategy, research, campaign và đa kênh.
- Không thể nói chưa có quy định bàn giao/chốt sửa số: Các SLA B2C đã mô tả. Cần xác nhận hiệu lực và mức áp dụng, thay vì yêu cầu tạo mới toàn bộ.
- Không thể suy ra thiếu baseline chỉ từ register: SIPOC đã chứa số liệu khảo sát và phân tích T6–T8/2026; chưa kiểm toán lại các số nên chưa coi là baseline được phê duyệt.
- Không thể coi mọi bảng đánh giá là chính sách thật: nguồn có giả thuyết, ví dụ, proposal và công thức chưa thống nhất.

## 7. Cách hoàn thiện tài liệu qua trao đổi

Đi theo thứ tự: phạm vi/tier/owner → tiếp nhận và research → strategy/plan → từng nhánh execution → duyệt/thay đổi → nghiệm thu/thanh toán → report/tối ưu → quản trị nguồn lực.

Với mỗi bước, bổ sung trigger, input bắt buộc, người làm, người chịu trách nhiệm cuối, người duyệt, thao tác, output, điều kiện hoàn tất, thời hạn, bằng chứng, nơi lưu và ngoại lệ. Ghi riêng quy định đang áp dụng và thay đổi được đề xuất. Chỉ đánh dấu đã xác nhận sau khi người phụ trách xác nhận trong trao đổi.

## 8. Nguồn tra cứu chính

- [Cơ cấu team](../../B2C/Định%20hướng%20Marketing%20B2C%20_%20Cơ%20cấu%20team.pdf): vai trò, tier, RACI, research và chuyển dịch.
- [Quy trình Booking Tech](../Quy%20trình%20Booking%20-%20Tech.md): video/live, pipeline, thương lượng, nhóm hợp tác, hợp đồng.
- [Các SLA B2C](../Các%20SLA%20B2C.pdf): kỳ kế hoạch, listing, sample, thanh toán, bàn giao, sửa nghiệm thu.
- [Customer journey](../%5BBooking%5D%20Customer%20journey.xlsx): hành vi thao tác thực tế và workaround.
- [SIPOC](../Danh_gia_quy_trinh_Booking_SIPOC.xlsx): 9 bước, checklist và dữ liệu/khảo sát/giả thuyết.
- [Knowledge](../KNOWLEADGE%20MARKETING%20B2C.xlsx): tiêu chí duyệt script và nội dung.
- [4P](../4P%20Marketing%20B2C.xlsx): JD, workload, năng lực, đề xuất P3.
- [Pain point](../Pain%20point%20Marketing%20B2C.xlsx): khảo sát và ghi chú Growth.
- Booking E2E.pdf, Booking đa sàn.pdf, Luồng quản lý job: data/metrics và tổ chức hợp tác nhiều đầu ra.
- Các file plan/report Lark, proposal Clio/Onstyle/Olay, báo cáo dịch chuyển, portfolio AI và MeUp: nguồn bổ trợ; áp dụng theo phạm vi/loại tài liệu.


## 9. Bổ sung từ bộ quy trình Markdown và Knowledge

### 9.1 Planning là một luồng liên phòng ban

Nguồn: Quy trình lập kế hoạch tổng thể dịch vụ E2E, bản rút gọn v1.0.0, có trạng thái dự thảo. Luồng chung: Account nhận và xác nhận định hướng khách hàng → họp nội bộ → nghiên cứu → Target Audience/Value Proposition → Brand/Ecom Strategy → Product/Commercial/Channel/Content Strategy → JBP → Tactics → thống nhất nội bộ và khách hàng → Growth nhập Lark Base và gửi duyệt → Account xác nhận qua email.

- Năm: nhận định hướng tháng 9; nghiên cứu và chiến lược tháng 9–10; tactics cuối tháng 10; chốt, nhập và duyệt tháng 11; xác nhận email ngày 01/12.
- Quý: nhận định hướng trong tháng thứ hai của quý trước; chốt chiến lược/tactics rồi xác nhận kế hoạch trước ngày 20 tháng thứ ba của quý trước.
- Tháng: review ngày 8–10; nghiên cứu và các kế hoạch chuyên môn ngày 9–12; Growth tổng hợp ngày 13; họp và chuẩn bị trình bày ngày 13–18; nhập ngày 18; duyệt ngày 18–23; email ngày 23–25. Theo quy ước tháng plan chính đã xác nhận, các mốc chuẩn bị cho plan tháng T được trình bày ở T−1; không đánh dấu khác ký hiệu tháng là mâu thuẫn.

Finance kiểm soát P&L tại cổng duyệt; xác nhận nguồn lực là điều kiện duyệt. Theo tài liệu này, Lark Base là bản kế hoạch chính thức; Sheet/Slide là bản làm việc. Có vòng review actual và learning để quay lại planning kỳ sau.

### 9.2 Từ chiến lược sang Content Tactics

Nguồn hướng dẫn Content Tactics: Brand Guideline + mục tiêu kinh doanh/Marketing Plan → funnel và Communication Objective → Master Plan Content → kế hoạch Booking/Self Channel/Shopee → Content Calendar → Tracking. Product Roadmap xác định sản phẩm chủ lực theo thời điểm; Campaign Roadmap nối Big Idea, Key Message và KV với lịch hoạt động. Mỗi kênh có vai trò theo hành trình khách hàng, không đơn thuần sao chép cùng một nội dung.

Các hình EUCP và tài liệu chia sẻ TikTok/kể chuyện là ví dụ hoặc knowledge đào tạo; không tự dùng làm chính sách bắt buộc. Bộ câu hỏi kiểm tra plan gồm mục tiêu, Hero SKU, Big Idea, Key Message, funnel, vai trò kênh, KPI và tính nhất quán.

### 9.3 Luồng Content kênh

Nguồn mô tả chuỗi nhận order → mục tiêu/định vị, pillar và angle → chia đầu việc VJ theo tuần → viết script → kiểm tra nội bộ/khách hàng → tổng hợp feedback → demo → khách hàng duyệt → đăng trên kênh → nghiệm thu và đo lường trên Lark. Partnership phụ trách thỏa thuận CTV, đầu mối nhóm, địa chỉ/thanh toán, hồ sơ hợp đồng khi cần và phối hợp nghiệm thu/thanh toán. File cuối lưu trên drive dùng chung; timeline cần thống nhất giữa các bên.

### 9.4 Luồng hợp đồng Booking

Quy trình Quản lý hợp đồng Booking phân biệt video (Booking phụ trách) và livestream affiliate (Growth phụ trách), HĐNT kèm SOW và HĐSV. Quy định trong nguồn:

- Video dưới 50 triệu: mẫu HĐNT Upbase nếu chưa có, hoặc SOW nếu đã có HĐNT; từ 50 triệu: HĐSV của KOC.
- Livestream dưới 50 triệu: HĐSV Upbase; từ 50 triệu: HĐSV KOC.
- Mẫu Upbase không sửa: chuyển Kế toán. Chỉ sửa thanh toán/thuế/hóa đơn: Finance. Sửa quyền/nghĩa vụ: Legal; nếu sửa cả hai nhóm thì Legal và Finance rà soát song song. Legal 24 giờ, Finance rà soát/ký 48 giờ theo nguồn.
- Cá nhân/CTV: tạm ứng dưới 2 triệu và tổng giá trị dưới 10 triệu có thể không bắt buộc hợp đồng; vượt một trong hai ngưỡng thì bắt buộc. HKD/doanh nghiệp luôn cần hợp đồng. BBNT bắt buộc từ 20 triệu hoặc khi thực tế khác thỏa thuận.

Đây là nội dung nguồn để đối chiếu, chưa xác nhận là quy định đang có hiệu lực.

### 9.5 Các điểm bổ sung cần xác nhận khi trao đổi

| Điểm | Bằng chứng chưa thống nhất | Cách giữ trong bản làm việc |
| --- | --- | --- |
| Vai trò Team Brand trong planning năm/quý | Đoạn phạm vi nói chỉ tham vấn nhưng bảng bước và RACI giao trách nhiệm TA/VP/Brand Strategy | Chưa tự chọn một cách phân quyền |
| PIC livestream affiliate | Quy trình hợp đồng giao Growth; các tài liệu execution mô tả vai trò Booking | Xác định PIC theo loại công việc, tách execution và hồ sơ hợp đồng |
| Ngưỡng hợp đồng | SLA có mốc 9 triệu; quy trình hợp đồng có tổng giá trị 10 triệu và tạm ứng 2 triệu; Booking đa sàn nói 100% HĐNT | Cần xác nhận phiên bản và điều kiện áp dụng |
| Loại hợp đồng livestream | Booking đa sàn ghi HĐNT; quy trình hợp đồng ghi HĐSV | Chưa chuẩn hóa một mẫu chung |
| SLA tạm ứng | Bảng hợp đồng ghi tối đa 7 ngày làm việc; bước chi tiết lại nói chưa quy định | Giữ là điểm chưa chốt |
| Change request ngân sách | Nhỏ trong ±5%; lớn vượt ±10%; thiếu nhánh khoảng giữa | Chưa tự đặt thẩm quyền cho khoảng 5–10% |
| Lịch planning tháng | Chuẩn hóa giai đoạn chuẩn bị ở T−1, triển khai ở T theo xác nhận của người phụ trách | Đã loại khỏi nhóm mâu thuẫn do ký hiệu tháng |
| Định nghĩa BO | Một BO theo platform/type/format/model nhưng đoạn khác nói gom các output lần đầu vào một BO | Cần thống nhất đơn vị quản lý trước khi mô tả dữ liệu |

Các nguồn bổ sung nằm trong thư mục `E:\Upbase\B2C\Quy trình - MD` và `E:\Upbase\B2C\Knowledge - MD`. Link Lark trong các nguồn chưa được truy cập; phần hình/đối tượng nhúng chưa được đọc hết ở độ chi tiết từng nhãn. Bản này dùng để cùng xác nhận vận hành từng phần, không phải kết luận hệ thống đã đủ hoặc thiếu luồng.


## 10. Hiệu chỉnh danh sách mâu thuẫn sau xác nhận quy ước tháng

Đã rút các nhận định về khác T−1/T với T/T+1, list không kịp Double Day và đợt 2 không kịp ngày 20 nếu những nhận định đó chỉ phát sinh do chọn sai tháng làm mốc. Chênh lệch ngày trong cùng một công đoạn chỉ được đánh giá sau khi quy đổi và phân biệt input sơ bộ/final, từng loại dịch vụ.

Các điểm còn lại cần chốt: (1) Brand chỉ tham vấn nhưng bảng bước giao thực hiện; (2) Livestream chỉ tham vấn nhưng RACI có R; (3) Content hay Booking phân bổ plan đến nhân sự; (4) BO theo từng tổ hợp hay gom lần hợp tác đầu; (5) tạm ứng chưa có SLA nhưng bảng ghi 7 ngày; (6) review Legal/Kế toán song song hay tuần tự; (7) mọi thay đổi re-approve nhưng có ngoại lệ nhỏ; (8) demo trước air 2 ngày nhưng ví dụ gấp là 1 ngày; (9) Strategy Owner theo tier chưa phản ánh trong luồng planning/booking; (10) 100% HĐNT so với miễn bắt buộc và HĐSV theo điều kiện; (11) ngưỡng 9/10 triệu; (12) Legal 24 hay 24–48 giờ; (13) gửi hàng 24/48 giờ; (14) Growth/Booking phụ trách live; (15) cấm trung gian so với làm việc MCN.

Không kết luận các khác biệt về công đoạn, phạm vi, phiên bản hoặc cách làm thực tế là mâu thuẫn chính sách trước khi xác nhận. Finance thiếu trong RACI, cơ sở tính giá trị hợp đồng, khoảng ngân sách 5–10%, điểm bắt đầu tính 7 ngày và ngày lịch/ngày làm việc là khoảng trống/định nghĩa chưa rõ.


## 11. Bộ trường tiếp nhận kế hoạch tổng từ Lark 4.1

### 11.1 Nguyên tắc đã thống nhất

Hệ thống mới là nơi thao tác chính của phòng MKT. Nhận kế hoạch tổng cố định từ Lark 4.1, sau đó phân rã, phân công và thực thi trên hệ thống mới. T là tháng plan chính. Không tự đồng bộ điều chỉnh để ghi đè kế hoạch đã nhận.

### 11.2 Phạm vi rà soát và trạng thái đề xuất

Nguồn trực tiếp: `B2C_Quản lý Booking_4.1 Plan order tổng - file nguồn.xlsx`, sheet `4.1 Plan order tổng`, hàng tiêu đề có 229 cột. Bản thường có 228 cột; bản nguồn thêm `% hoàn thành NMV`. Vị trí cột dưới đây chỉ dùng đối chiếu Excel; khi kết nối cần xác định field ID Lark. Đây là đề xuất từng cột, chưa là mapping được phê duyệt. Không sửa/xóa cột ở Lark hoặc file gốc.

| Phân loại | Số cột |
| --- | ---: |
| GIỮ | 27 |
| CẦN XÁC NHẬN | 45 |
| KHÔNG NHẬP | 88 |
| GIỮ THAM CHIẾU | 12 |
| GIỮ CÓ ĐIỀU KIỆN | 57 |


GIỮ là đề xuất đưa vào đầu vào. GIỮ THAM CHIẾU phục vụ đầu mối/truy vết. GIỮ CÓ ĐIỀU KIỆN phụ thuộc phạm vi dịch vụ; không tự loại Design/Social/Reup/live hoặc đa sàn. KHÔNG NHẬP nghĩa là không đưa vào kế hoạch tổng, không có nghĩa xóa nguồn hoặc không cần dữ liệu đó ở nơi khác. CẦN XÁC NHẬN chưa được dùng để chốt plan.

### 11.3 Các quyết định cần xác nhận

1. Cột nào xác nhận plan chốt: Chốt plan, Plan B2C chốt, Leader confirm hay Duyệt plan? Không mặc định mọi cột chứa chữ duyệt là plan.
2. Định danh gian hàng: Mã GH hay StoreID; xử lý thiếu mã/trùng tên. Record ID cần giữ để truy vết nguồn.
3. Số video affiliate tổng đối chiếu với KL/TAP/FOC/Cast bằng định nghĩa nào; không tự thay số nguồn bằng tổng tính lại khi lệch.
4. Chi phí dùng net/gross thế nào và thuế thuộc phạm vi nào; không áp một hệ số thuế cố định cho mọi đối tác.
5. Các cột Booking/Brand/Inhouse/CTV phản ánh phạm vi MKT hay nghĩa vụ bên khác; số phiên/giờ 2h và 3h không cộng trực tiếp khi chưa quy đổi.
6. Ngân sách tổng và ngân sách theo nền tảng là hai cấp của cùng một khoản hay khoản độc lập; không cộng trùng. Ads và hoa hồng có thuộc ngân sách MKT không.
7. Design/Social/Reup là đầu ra MKT cần nhận hay order của bộ phận khác.
8. Phân biệt ô trống với số 0; thiếu chỉ tiêu bắt buộc thì chờ xác nhận, không tự coi là không có nhu cầu.

### 11.4 Bảng đối chiếu toàn bộ cột

| Cột | Tên gốc | Đề xuất | Nhóm đích | Lý do/điều kiện |
| --- | --- | --- | --- | --- |
| A | Order no | GIỮ | Kế hoạch tổng | Định danh/phạm vi kế hoạch. |
| B | Gian hàng | GIỮ | Kế hoạch tổng | Định danh/phạm vi kế hoạch. |
| C | Brand | GIỮ | Kế hoạch tổng | Định danh/phạm vi kế hoạch. |
| D | Ngày bắt đầu | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| E | Tháng | GIỮ | Kế hoạch tổng | Định danh/phạm vi kế hoạch. |
| F | (Plan) NMV | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| G | NMV report | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| H | (Report) NMV | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| I | Tiến độ NMV | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| J | Số video affiliate | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| K | (Duyệt) Số video affiliate | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Chưa dùng làm plan: phải xác nhận đây là số được giao, số đã duyệt execution hay tiến độ. |
| L | (Report) Số video affiliate | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| M | (sau điều chỉnh) Số video affliate | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| N | TAP Brand | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| O | TAP | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| P | TAP UpAffiliate | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| Q | KL1 | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| R | KL2 | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| S | KL3 | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| T | KL4 | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| U | KL5 | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| V | KL6 | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| W | KL7 | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| X | Plan Total >= KL4 | KHÔNG NHẬP | Đối chiếu/tổng hợp | Tổng/chỉ số suy ra; chỉ dùng đối chiếu, hệ thống mới tính theo định nghĩa được xác nhận. |
| Y | B2C phụ trách | GIỮ | Kế hoạch tổng | Định danh/phạm vi kế hoạch. |
| Z | Chi phí booking video affiliate | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| AA | (Net) Chi phí video affiliate | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| AB | Booking - Số video self channel | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| AC | (sau điều chỉnh) Booking - Số video self channel | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| AD | (Month-to-date) - Số video self channel | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| AE | (Duyệt) Booking - Số video self channel | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Chưa dùng làm plan: phải xác nhận đây là số được giao, số đã duyệt execution hay tiến độ. |
| AF | (Report) Booking - Số video self channel | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| AG | Booking - Chi phí video self channel | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| AH | (Net) Chi phí video self channel | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| AI | Growth_PIC | GIỮ THAM CHIẾU | Đầu mối/phân công | Đầu mối ban đầu; phân công thực thi được quản lý trên hệ thống mới. |
| AJ | Total order | KHÔNG NHẬP | Đối chiếu/tổng hợp | Tổng/chỉ số suy ra; chỉ dùng đối chiếu, hệ thống mới tính theo định nghĩa được xác nhận. |
| AK | (sau điều chỉnh) Total order | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| AL | Leader confirm | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| AM | Booking phụ trách | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| AN | Người yêu cầu.Direct Manager | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| AO | Content phụ trách | GIỮ THAM CHIẾU | Đầu mối/phân công | Đầu mối ban đầu; phân công thực thi được quản lý trên hệ thống mới. |
| AP | Tháng hiện tại | KHÔNG NHẬP | Đối chiếu/tổng hợp | Tổng/chỉ số suy ra; chỉ dùng đối chiếu, hệ thống mới tính theo định nghĩa được xác nhận. |
| AQ | Trạng thái gian hàng | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| AR | SourceID | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| AS | Plan | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| AT | Số video self channel | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| AU | Chi phí video self channel | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| AV | (sau điều chỉnh) Số phiên live affliate | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| AW | Note | GIỮ CÓ ĐIỀU KIỆN | Yêu cầu kế hoạch | Giữ yêu cầu/giới hạn ảnh hưởng kế hoạch; ghi chú theo dõi phát sinh chuyển sang hệ thống mới. |
| AX | Hoa hồng | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| AY | Chi phí booking video aff điều chỉnh | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| AZ | Tâm phụ trách | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| BA | TTVH | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| BB | Sàn | GIỮ | Kế hoạch tổng | Định danh/phạm vi kế hoạch. |
| BC | (Actual) Chi phí video affiliate | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BD | (Actual) Chi phí Thanh toán mã Ads | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BE | (Actual) Chi phí video self channel | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BF | (Đã duyệt) Chi phí video affiliate | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Chưa dùng làm plan: phải xác nhận đây là số được giao, số đã duyệt execution hay tiến độ. |
| BG | (Đã duyệt) Chi phí video self channel | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Chưa dùng làm plan: phải xác nhận đây là số được giao, số đã duyệt execution hay tiến độ. |
| BH | Booking PIC | GIỮ THAM CHIẾU | Đầu mối/phân công | Đầu mối ban đầu; phân công thực thi được quản lý trên hệ thống mới. |
| BI | Brand chưa list | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BJ | Brand chưa duyệt | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BK | Plan chi phí điều chỉnh net Growth | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| BL | % Hoàn thành | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BM | Gap chi tiêu tháng | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BN | Giải trình | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BO | Vấn đề Aff | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BP | Yêu cầu chi tiêu theo plan MoM | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| BQ | Gap month to date | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BR | Gap ngân sách Month to date | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BS | Vấn đề Self | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BT | Plan ngân sách self thực chạy | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| BU | GAP tháng | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BV | Sel Plan Month to date | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BW | Gap MoM | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BX | Gap SL MoM | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BY | Vấn đề Self Channel | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| BZ | R.TAP | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CA | R.KL1 | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CB | R.KL2 | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CC | R.KL3 | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CD | R.KL4 | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CE | R.KL5 | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CF | R.KL6 | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CG | R.KL7 | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CH | R.Freecast | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CI | R.Video Aff | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CJ | R.>= KL4 | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CK | Tổng số video | KHÔNG NHẬP | Đối chiếu/tổng hợp | Tổng/chỉ số suy ra; chỉ dùng đối chiếu, hệ thống mới tính theo định nghĩa được xác nhận. |
| CL | FOC | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| CM | Cast | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| CN | R.FOC | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CO | R.Cast | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CP | (Plan) GMV video affiliate | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| CQ | (Report) GMV video affiliate | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CR | (Tiến độ) GMV video affiliate | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CS | (Report) GMV video self channel | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CT | (Plan) GMV video self channel | GIỮ | Kế hoạch tổng | Chỉ tiêu hoặc ngân sách đầu vào; giữ giá trị nguồn. |
| CU | (Plan MTD) GMV video affiliate | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CV | (Plan MTD) GMV video self channel | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CW | % MTD Video AFF | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CX | Gap NMV video AFF | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| CY | Account PIC | GIỮ THAM CHIẾU | Đầu mối/phân công | Đầu mối ban đầu; phân công thực thi được quản lý trên hệ thống mới. |
| CZ | Plan B2C chốt | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| DA | HCM | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| DB | (Duyệt) Chi phí video affiliate | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Chưa dùng làm plan: phải xác nhận đây là số được giao, số đã duyệt execution hay tiến độ. |
| DC | Gap Self Channel | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| DD | Brand - Số video self channel | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| DE | Brand - Chi phí video self channel | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| DF | Số phiên livestream affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| DG | Chi phí booking livestream affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| DH | Chi phí Ads | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| DI | Chi phí livestream self channel | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| DJ | Brand - Số phiên livestream self channel (2h) | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| DK | Brand - Chi phí livestream self channel | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| DL | NMV nhà bán | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| DM | Cảnh báo bất thường cast | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| DN | Tổng chi phí thúc đẩy (gross) | KHÔNG NHẬP | Đối chiếu/tổng hợp | Tổng/chỉ số suy ra; chỉ dùng đối chiếu, hệ thống mới tính theo định nghĩa được xác nhận. |
| DO | Tracking Plan | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| DP | (sau điều chỉnh) Inhouse - Số phiên live self channel | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| DQ | (sau điều chỉnh) CTV ngoài - Số phiên live self channel | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| DR | Số phiên livestream affiliate GMV <20M | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| DS | Số phiên livestream affiliate GMV từ 20M - <50M | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| DT | Số phiên livestream affiliate GMV >50M | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| DU | Report số phiên livestream affiliate GMV <20M | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| DV | Report Số phiên livestream affiliate GMV từ 20M - <50M | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| DW | Report Số phiên livestream affiliate GMV >50M | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| DX | R.Số phiên livestream affiliate | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| DY | Cảnh báo lỗi định mức Design | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| DZ | Duyệt plan (Plan order tổng mới nhất) | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| EA | Số video KL4 trở lên | KHÔNG NHẬP | Đối chiếu/tổng hợp | Tổng/chỉ số suy ra; chỉ dùng đối chiếu, hệ thống mới tính theo định nghĩa được xác nhận. |
| EB | Record ID | GIỮ | Kế hoạch tổng | Định danh/phạm vi kế hoạch. |
| EC | Số giờ livestream self channel | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| ED | Brand - Số giờ livestream self channel | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| EE | Tổng số đơn hàng | KHÔNG NHẬP | Hệ thống nguồn liên quan | Dữ liệu vận hành kho/đơn hàng; không phải đầu vào phân rã MKT. |
| EF | Số đơn kho HCM phụ trách | KHÔNG NHẬP | Hệ thống nguồn liên quan | Dữ liệu vận hành kho/đơn hàng; không phải đầu vào phân rã MKT. |
| EG | Tỷ lệ đơn theo kho | KHÔNG NHẬP | Hệ thống nguồn liên quan | Dữ liệu vận hành kho/đơn hàng; không phải đầu vào phân rã MKT. |
| EH | Cảnh báo bất thường Video affiliate | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| EI | HN - Inhouse - Số giờ livestream | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| EJ | ✅ Booking - Số video self channel | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Chưa dùng làm plan: phải xác nhận đây là số được giao, số đã duyệt execution hay tiến độ. |
| EK | ✅ Booking - Số video affiliate | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Chưa dùng làm plan: phải xác nhận đây là số được giao, số đã duyệt execution hay tiến độ. |
| EL | Inhouse️ - Doanh thu livestream self channel | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| EM | ✅ Inhouse - Doanh thu livestream self channel | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Chưa dùng làm plan: phải xác nhận đây là số được giao, số đã duyệt execution hay tiến độ. |
| EN | Inhouse️ - Số phiên livestream self channel (3h) | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| EO | ✅ Inhouse - Số phiên livestream self channel (3h) | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Chưa dùng làm plan: phải xác nhận đây là số được giao, số đã duyệt execution hay tiến độ. |
| EP | Inhouse️ - Chi phí livestream self channel | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| EQ | CTV ngoài - Doanh thu livestream self channel | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| ER | CTV ngoài - Số phiên livestream self channel (2h) | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| ES | CTV ngoài - Chi phí livestream self channel | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| ET | (cũ) Booking - Số phiên livestream affiliate | KHÔNG NHẬP | Nguồn lưu trữ | Trường di sản; lưu trong nguồn gốc để tra cứu. |
| EU | (cũ) ✅ Booking - Số phiên livestream affiliate | KHÔNG NHẬP | Nguồn lưu trữ | Trường di sản; lưu trong nguồn gốc để tra cứu. |
| EV | (cũ) Booking - Chi phí booking livestream affiliate | KHÔNG NHẬP | Nguồn lưu trữ | Trường di sản; lưu trong nguồn gốc để tra cứu. |
| EW | ✅ Chi phí Ads | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Chưa dùng làm plan: phải xác nhận đây là số được giao, số đã duyệt execution hay tiến độ. |
| EX | ️Landing dài | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| EY | ️Landing ngắn | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| EZ | ️Banner lẻ | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| FA | Ảnh Resize | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| FB | ️Ảnh nội dung | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| FC | ️Cover | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| FD | ️Banner Live | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| FE | Video | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| FF | Branding | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| FG | Banner Video | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| FH | Post Social | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| FI | Event | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| FJ | Key Visual | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| FK | Ghi chú cho Account | GIỮ CÓ ĐIỀU KIỆN | Yêu cầu kế hoạch | Giữ yêu cầu/giới hạn ảnh hưởng kế hoạch; ghi chú theo dõi phát sinh chuyển sang hệ thống mới. |
| FL | Ghi chú cho Leader Growth | GIỮ CÓ ĐIỀU KIỆN | Yêu cầu kế hoạch | Giữ yêu cầu/giới hạn ảnh hưởng kế hoạch; ghi chú theo dõi phát sinh chuyển sang hệ thống mới. |
| FM | Ghi chú cho Leader B2C | GIỮ CÓ ĐIỀU KIỆN | Yêu cầu kế hoạch | Giữ yêu cầu/giới hạn ảnh hưởng kế hoạch; ghi chú theo dõi phát sinh chuyển sang hệ thống mới. |
| FN | Livestream phụ trách | GIỮ THAM CHIẾU | Đầu mối/phân công | Đầu mối ban đầu; phân công thực thi được quản lý trên hệ thống mới. |
| FO | update | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| FP | Ghi chú cho Leader Account | GIỮ CÓ ĐIỀU KIỆN | Yêu cầu kế hoạch | Giữ yêu cầu/giới hạn ảnh hưởng kế hoạch; ghi chú theo dõi phát sinh chuyển sang hệ thống mới. |
| FQ | Tỉ lệ hủy | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| FR | Service | GIỮ | Kế hoạch tổng | Định danh/phạm vi kế hoạch. |
| FS | Mã GH | GIỮ | Kế hoạch tổng | Định danh/phạm vi kế hoạch. |
| FT | (cũ)  Brand - Số video self channel | KHÔNG NHẬP | Nguồn lưu trữ | Trường di sản; lưu trong nguồn gốc để tra cứu. |
| FU | (cũ) Brand - Chi phí video self channel | KHÔNG NHẬP | Nguồn lưu trữ | Trường di sản; lưu trong nguồn gốc để tra cứu. |
| FV | (cũ)  Số video affiliate | KHÔNG NHẬP | Nguồn lưu trữ | Trường di sản; lưu trong nguồn gốc để tra cứu. |
| FW | (cũ) Freecast | KHÔNG NHẬP | Nguồn lưu trữ | Trường di sản; lưu trong nguồn gốc để tra cứu. |
| FX | (cũ) Chi phí booking video affiliate | KHÔNG NHẬP | Nguồn lưu trữ | Trường di sản; lưu trong nguồn gốc để tra cứu. |
| FY | (cũ) Chi phí Ads | KHÔNG NHẬP | Nguồn lưu trữ | Trường di sản; lưu trong nguồn gốc để tra cứu. |
| FZ | Growth_Support | GIỮ THAM CHIẾU | Đầu mối/phân công | Đầu mối ban đầu; phân công thực thi được quản lý trên hệ thống mới. |
| GA | Cảnh báo dữ liệu bất thường | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| GB | Check đã input Plan | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| GC | Chốt plan | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| GD | Live/Off | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| GE | Người yêu cầu.Phòng ban | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| GF | Chốt điều chỉnh nguồn lực | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| GG | (điều chỉnh) Booking - Số video self channel | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| GH | (điều chỉnh) Số video affliate | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| GI | (điều chỉnh) Inhouse - Số phiên live self channel | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| GJ | (điều chỉnh) CTV ngoài - Số phiên live self channel | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| GK | (điều chỉnh) Số phiên live affliate | KHÔNG NHẬP | Kế hoạch chi tiết | Điều chỉnh thực thi tách khỏi kế hoạch tổng cố định; giữ nguồn để đối chiếu. |
| GL | Ngày sửa đổi gần nhất | GIỮ THAM CHIẾU | Thông tin nguồn | Truy vết nguồn và thời điểm tiếp nhận; không phải chỉ tiêu thực thi. |
| GM | Người sửa đổi | GIỮ THAM CHIẾU | Thông tin nguồn | Truy vết nguồn và thời điểm tiếp nhận; không phải chỉ tiêu thực thi. |
| GN | B2C PIC | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| GO | StoreID | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Cần chọn trường có thẩm quyền, định nghĩa và đối chiếu với các cột tương tự; không suy ra từ tên. |
| GP | Design cho phép sửa | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| GQ | Ngày order đầy đủ thời gian | GIỮ THAM CHIẾU | Thông tin nguồn | Truy vết nguồn và thời điểm tiếp nhận; không phải chỉ tiêu thực thi. |
| GR | Kiểm tra bản ghi - Chặn gửi duyệt Plan | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| GS | Design duyệt vượt định mức | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Tên cột chưa đủ để xác định là plan, trạng thái hay dữ liệu phụ; chưa bỏ. |
| GT | Người tạo | GIỮ THAM CHIẾU | Thông tin nguồn | Truy vết nguồn và thời điểm tiếp nhận; không phải chỉ tiêu thực thi. |
| GU | Ghi chú cho Leader Livestream | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| GV | Account Support | GIỮ THAM CHIẾU | Đầu mối/phân công | Đầu mối ban đầu; phân công thực thi được quản lý trên hệ thống mới. |
| GW | Nguồn order | GIỮ THAM CHIẾU | Thông tin nguồn | Truy vết nguồn và thời điểm tiếp nhận; không phải chỉ tiêu thực thi. |
| GX | Inhouse - Số giờ livestream self channel | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| GY | CTV ngoài - Số giờ livestream self channel | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| GZ | ✅ Inhouse - Số giờ livestream self channel | CẦN XÁC NHẬN | Chờ xác nhận ngữ nghĩa | Chưa dùng làm plan: phải xác nhận đây là số được giao, số đã duyệt execution hay tiến độ. |
| HA | Số đơn kho HN phụ trách | KHÔNG NHẬP | Hệ thống nguồn liên quan | Dữ liệu vận hành kho/đơn hàng; không phải đầu vào phân rã MKT. |
| HB | Đơn vị vận hành kho | KHÔNG NHẬP | Hệ thống nguồn liên quan | Dữ liệu vận hành kho/đơn hàng; không phải đầu vào phân rã MKT. |
| HC | Số Video Reup - Instagram | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HD | Số Video Reup - Shopee | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HE | Số Video Reup - TikTok | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HF | Số Video Reup - Facebook | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HG | Số Video Reup - Threads | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HH | (Gross) TikTok - Chi phí video affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HI | TikTok - Số video affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HJ | Facebook - Chi phí video affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HK | Facebook - Số video affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HL | Instagram - Chi phí video affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HM | Instagram - Số video affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HN | Threads - Chi phí video affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HO | Threads - Số video affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HP | Shopee - Chi phí video affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HQ | Shopee - Số video affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HR | HCM - Inhouse - Số giờ livestream | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HS | (MTD) Chi phí video aff | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
| HT | (Net) TikTok - Chi phí video affiliate | GIỮ CÓ ĐIỀU KIỆN | Chỉ tiêu dịch vụ/kênh | Chỉ tiêu dịch vụ/nền tảng/nguồn lực; giữ khi thuộc phạm vi MKT. Chọn cấp tổng hoặc chi tiết để tránh cộng trùng. |
| HU | % hoàn thành NMV | KHÔNG NHẬP | Thực thi/báo cáo trên hệ thống mới | Kết quả/tiến độ/chỉ số theo dõi; không phải chỉ tiêu plan cố định. |
