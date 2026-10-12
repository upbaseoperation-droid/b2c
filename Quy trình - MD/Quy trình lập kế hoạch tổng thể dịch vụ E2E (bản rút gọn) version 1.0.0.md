# Quy trình lập kế hoạch tổng thể dịch vụ E2E \(bản rút gọn\) version 1\.0\.0

***Bản version 1\.0\.0 là bản rút gọn, bao gồm khung logic và quy trình cơ bản\. Các biểu mẫu, hướng dẫn liên quan sẽ được cập nhật bổ sung trong version 1\.1\.0\.***

**Mã tài liệu:**

**Phiên bản:**

**Trạng thái:**

**Ngày ban hành:**

QT\-UPB\-202607\-005

v1\.0\.0

Draft

17/07/2026

# LỊCH SỬ THAY ĐỔI

|**Version**|**Ngày**|**Nội dung thay đổi**|
|---|---|---|
|**v1\.0\.0**|17/07/2026|Ban hành lần đầu bản rút gọn|

---

# MỤC ĐÍCH

## Quy trình này được xây dựng nhằm:

- Chuẩn hóa toàn bộ quy trình Planning cho Brand E\-commerce từ nghiên cứu thị trường, xác định khách hàng, định vị giá trị, chiến lược tăng trưởng, JBP, kế hoạch tháng, content plan đến kiểm soát P\&L\.

- Thiết lập một tiêu chuẩn lập kế hoạch thống nhất giữa Growth, Account, Content, Media, Livestream, Booking, Finance, Brand và BOD\. 

- Bảo đảm mọi kế hoạch đều có mục tiêu định lượng, cơ sở dữ liệu, owner, deadline, nguồn lực, ngân sách, P\&L và cơ chế review rõ ràng\. 

- Giảm rủi ro lập kế hoạch theo cảm tính hoặc chỉ điền template nhưng thiếu dữ liệu triển khai thực tế\. 

- Tạo nền tảng để quản trị trên Lark Base, đồng bộ task, approval, output, learning và lịch sử thay đổi của từng chu kỳ Planning\.

---

# PHẠM VI ÁP DỤNG

|**Nhóm phạm vi**|**Áp dụng**|**Không áp dụng**|
|---|---|---|
|Đối tượng<br>|Brand đã và đang vận hành hoặc chuẩn bị vận hành trên Shopee, TikTok Shop, Lazada, website hoặc kênh bán online khác được vận hành bởi UpBase|Các hoạt động mua hàng, nhập kho, thanh toán, hợp đồng booking hoặc vận hành khác không được nhắc tới trong tài liệu này\.|
|Team/TTVH<br>|Growth, Account, Content, Media, Livestream, Booking, Finance, Brand và Leader/CEO khi phê duyệt kế hoạch\.|Các bộ phận không tham gia xây dựng, duyệt hoặc vận hành kế hoạch E\-commerce\.|
|Chu kỳ|- Yearly <br>- Quarterly<br>- Monthly |Các task phát sinh hằng ngày không làm thay đổi mục tiêu, ngân sách hoặc chiến lược đã duyệt\.|
|Tài liệu<br>|- Brand Strategy<br>- Ecom Strategy<br>- Joint Business Plan<br>- Monthly Plan<br>- Content tactics|Tài liệu truyền thông hoặc tài liệu bán hàng không gắn với kế hoạch đã duyệt\.|

---

# ĐỊNH NGHĨA THUẬT NGỮ

|**Thuật ngữ**|**Giải thích**|
|---|---|
|Ecom Strategy|Chiến lược tăng trưởng thương mại điện tử gồm nhưng không giới hạn ở sản phẩm, giá, kênh, nội dung, ngân sách và P\&L\.|
|Brand Strategy|Chiến lược tăng trưởng của nhãn hàng, tập trung vào định vị thương hiệu và đối tượng khách hàng hướng tới, có thể bao gồm các chiến lược tăng trưởng\.|
|JBP|Joint Business Plan giữa Brand, UpBase nhằm thống nhất mục tiêu tăng trưởng, ngân sách, nguồn lực và cơ chế phối hợp giữa hai bên trong một khoảng thời gian xác định\.|
|SKU Role|Vai trò của SKU trong danh mục như Entry, Expansion, Key, Hero, Profit SKU hoặc Traffic SKU\.|
|Content Pillar<br>|Nhóm chủ đề nội dung chiến lược giúp bảo đảm thông điệp nhất quán theo mục tiêu nhận diện, cân nhắc, chuyển đổi và giữ chân\.|
|P\&L Forecast<br>|Dự báo doanh thu, giá vốn, phí sàn, chi phí vận hành, chi phí thúc đẩy, lợi nhuận và các kịch bản tài chính của kế hoạch\.|
|Approval Gate<br>|Điểm kiểm soát bắt buộc trước khi kế hoạch được chuyển sang giai đoạn tiếp theo hoặc bàn giao vận hành\.|

---

# TỔNG QUAN ĐẦU VÀO \(INPUT\)

|**STT**|**Đầu vào**|**Mô tả**|
|---|---|---|
|1<br>|Mục tiêu kinh doanh năm/quý/tháng của Brand|Business objective, growth target, ngân sách tổng và ưu tiên chiến lược\.|
|2|Dữ liệu thị trường và ngành hàng|Quy mô thị trường, xu hướng tăng trưởng, mùa vụ, chính sách sàn, mức độ cạnh tranh và dữ liệu tìm kiếm\.|
|3|Dữ liệu bán hàng nội bộ<br>|GMV/NMV, orders, traffic, CR, AOV, CIR, ROAS, tỷ lệ hủy, tỷ lệ hoàn và hiệu quả theo SKU/kênh\.|
|4|Danh mục sản phẩm và biên lợi nhuận|SKU list, giá vốn, giá bán, tồn kho, vai trò SKU, khả năng bundle/combo và sản phẩm mới\.|
|5|Thông tin khách hàng và insight|Nhân khẩu học, hành vi mua, pain point, buying trigger, objection và dữ liệu review/comment/chat\.|
|6|Nguồn lực vận hành|Năng lực content, media, livestream, affiliate, CS, fulfillment, tồn kho và ngân sách nhân sự\.|
|7|Template hệ thống<br>|Business Strategy, JBP, Monthly Plan, Master Plan Content, Content Calendar, Est KOL, P\&L Form và Approval Log\.|

---

# TỔNG QUAN ĐẦU RA \(OUTPUT\)

*Mô tả ngắn gọn kết quả cuối cùng mà quy trình cần đạt được, bao gồm tài liệu, dữ liệu, sản phẩm bàn giao hoặc mục tiêu vận hành\. Người thực hiện cần có thể hiểu và tập trung vào giá trị và kết quả đạt được, không chỉ hoàn thành các bước thao tác máy móc\.*

|**STT**|**Đầu ra**|**Mô tả**|
|---|---|---|
|1|Market Research|Báo cáo thị trường, đối thủ, phân khúc giá, cơ hội tăng trưởng và rủi ro ngành hàng\.|
|2|Target Audience \& Value Proposition|Chân dung khách hàng mục tiêu, customer journey, insight, USP/RTB, key message và offer định hướng\.|
|3|Brand Strategy \- Ecom Strategy|Mục tiêu tăng trưởng, OKR, strategic priority, roadmap, ngân sách tổng và chiến lược triển khai\.|
|4|Joint Business Plan|Kế hoạch hợp tác tổng thể brand \(có thể chia ra chi tiết Shopee, TikTok Shop hoặc kênh khác\)|
|5|Ecom strategy guidelines<br>|Bộ hướng dẫn chiến lược chi tiết để chuyển mục tiêu thành cấu trúc SKU, giá, kênh và content\.|
|6|Tactics plan|Bộ kế hoạch triển khai chi tiết các hoạt động theo khung thời gian lên Plan\.|

# QUY TRÌNH THỰC HIỆN

## Khung tư duy logic từ** Strategy** \(chiến lược\) sang **Tactics** \(chiến thuật\) 

### Các tầng chiến lược và chiến thuật

#### Cấu trúc các tầng chiến lược tới chiến thuật

#### Vai trò của các tầng

### Quy trình planning tổng thể

Quy trình tổng thể là khung quy trình gốc của hoạt động planning\. Các quy trình phía sau thực hiện toàn bộ hoặc một phần của quy trình tổng thể này, rút gọn một số bước tuỳ theo chu kỳ lên plan và bổ sung các bước cụ thể theo từng PIC tham gia trong quy trình\.

## Quy trình lập kế hoạch Yearly

### Sơ đồ quy trình

Trong quy trình này, các team Brand \(thuộc Marketing B2C\), Media, Livestream, CX, Design, Fulfillment không tham gia thực hiện hoặc chịu trách nhiệm của các bước trong quy trình\. Tuy nhiên có trách nhiệm tham gia tham vấn cho các team còn lại trong quá trình lên kế hoạch\. 

### Mô tả các bước

|**STT**|**Hoạt động**|**PIC**|**Input**|**Output**|**SLA**|**Công cụ**|**Template**|**Hướng dẫn**|
|---|---|---|---|---|---|---|---|---|
|1|Review và định hướng từ Brand<br>|Account<br>|Báo cáo kết quả hoạt động năm trước, Chia sẻ từ phía Brand|Thông tin về định hướng và mong muốn của Brand trong năm tới\.<br>|Ngày 01/09|Lark Meeting/Họp trực tiếp\. Lark Sheet, Lark Slide|||
|2|Thống nhất định hướng và mong muốn của Brand|Account|Thông tin về định hướng và mong muốn của Brand trong năm tới\.|File Sheet tổng hợp mong muốn và định hướng của Brand đã được xác nhận|Ngày 17/09|Lark Sheet|||
|3|Tổ chức họp nội bộ<br>|Account|File Sheet tổng hợp mong muốn và định hướng của Brand đã được xác nhận<br>Báo cáo kết quả hoạt động năm trước\.|Toàn bộ thành viên tham gia họp nắm được kế mong muốn và định hướng của brand\. Thống nhất trách nhiệm và nhiệm vụ của các thành viên tham gia|Ngày 20/09<br>|Họp trực tiếp, Lark Sheet, Lark Slide|||
|4|Market research<br>|Tất cả thành viên|File Sheet tổng hợp mong muốn và định hướng của Brand đã được xác nhận|- Báo cáo nghiên cứu thị trường<br>- Bản đồ ngành hàng<br>- Ma trận đối thủ cạnh tranh<br>- Cơ hội và rủi ro<br>- Các giả định nền tảng cho kế hoạch<br>> Các team với vai trò và SOP khác nhau thực hiện tập trung research vào các nội dung khác nhau\. Mục tiêu chính nhằm đáp ứng yêu cầu lên plan của phần mà team đó phụ trách<br>> <br>> |Ngày 25/09<br>|AI, Metric\.vn, Seller, Tool khác\.<br>|[\[Template\] Market Research Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/LDyZsfF4kh5Go7tlhtMlQ2oDgag)||
|5|Target Audience <br>Value Proposition<br>|Team Brand<br>\(Marketing B2C\)|- Brand guideline<br>- Định hướng và mong muốn của brand<br>- Kết quả market research<br>|- Target Audience <br>- Value Proposition<br>|Ngày 03/10<br>|Lark Sheet<br>|[\[Template\] Target Audience \& Value Proposition Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/Vj8TsyJWyhkanptLioclAMa0g0f?sheet=0WvOFN)||
|6|Brand Strategy<br>|Brand \(Marketing B2C\)<br>|- Kết quả market research và Target Audience, Value Proposition<br>|Core target <br>Broad target <br>Pain Point / Insight / Barrier to Trial <br>Awareness Objective <br>Positioning Objective|Ngày 10/10<br>|Lark Sheet<br>|[JBP, Brand Strategy, Ecom Strategy, ECOM Guidelines](https://upbasevn.sg.larksuite.com/sheets/ISlzsdhTHhkaTutPrGSlqtHgg7g?sheet=02EFMu&302from=wiki)||
|6|ECOM Strategy<br>|Growth TikTok<br>|- Kết quả market research và Target Audience, Value Proposition<br>|Core target <br>Broad target <br>Pain Point / Insight / Barrier to Trial <br>Awareness Objective <br>Positioning Objective|Ngày 18/10<br>|Lark Sheet<br>|[JBP, Brand Strategy, Ecom Strategy, ECOM Guidelines](https://upbasevn.sg.larksuite.com/sheets/ISlzsdhTHhkaTutPrGSlqtHgg7g?sheet=02EFMu&302from=wiki)||
|7|Product Strategy<br>|Growth|- Mong muốn và định hướng của brand<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research|Chiến lược theo nhóm sản phẩm:<br>- Entry: Nhóm thu hút khách hàng mới <br>- Expansion: Nhóm mở rộng giỏ hàng <br>- Key: Nhóm thúc đẩy chính|Ngày 18/10|Lark Sheet|[\[Template\] ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/YMgjsA3xOhTyhNtPotilLAo0gIK)<br>|[\[Hướng dẫn\] Hướng dẫn điền template ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/docx/LtgKdulUaoucvNx1XmNlThbVgvd)|
|8|Commercial strategy<br>|Growth|- Mong muốn và định hướng của brand<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research|Chiến lược giá theo:<br>- Nhóm Entry, Expansion, Key <br>- Bậc giá: Niêm yết, Flash sale, Campaign, KOL / Live<br>|Ngày 18/10<br>|Lark Sheet|[\[Template\] ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/YMgjsA3xOhTyhNtPotilLAo0gIK)|[\[Hướng dẫn\] Hướng dẫn điền template ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/docx/LtgKdulUaoucvNx1XmNlThbVgvd)|
|9|Channel strategy<br>|Growth<br>|- Mong muốn và định hướng của brand<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research|Channel theo hành vi khách hàng:<br>- Awareness<br>- Interest<br>- Action<br>- Repeat/Loyalty|Ngày 18/10<br>|Lark Sheet|[\[Template\] ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/YMgjsA3xOhTyhNtPotilLAo0gIK)|[\[Hướng dẫn\] Hướng dẫn điền template ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/docx/LtgKdulUaoucvNx1XmNlThbVgvd)|
|10|Content strategy<br>|Content|- Mong muốn và định hướng của brand<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research|Chiến lược về content, trong đó cần có: Pain Point, Insight, Barrier to Trial, Awareness Objective|Ngày 18/10<br>|Lark Sheet|[\[Template\] ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/YMgjsA3xOhTyhNtPotilLAo0gIK)<br>|[\[Hướng dẫn\] Hướng dẫn điền template ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/docx/LtgKdulUaoucvNx1XmNlThbVgvd)|
|11|Join Business Plan<br>|Account|- Mong muốn và định hướng của brand<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research<br>- Product strategy,  Commercial strategy, Channel strategy, Content strategy|Bản JBP hoàn chỉnh|Ngày 23/10<br>|Lark Sheet<br>|[\[Template\] Joint Business Plan Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/SMHusSgEbh6NQxtbyxllm7G3gjg)<br>|[\[Hướng dẫn\] Joint Business Plan Version 1\.0\.0](https://upbasevn.sg.larksuite.com/docx/VXsjd3shdoSc4lxJSvYlbvOjg7d)|
|12|Tactics plan<br>|Growth|- Mong muốn và định hướng của brand<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research<br>- Product strategy, Commercial strategy, Channel strategy, Content strategy\.<br>- Joint business plan|Bản kế hoạch theo từng tháng với tối thiểu:<br>- Doanh thu<br>- Chi phí<br>- Chi tiết các hoạt động sẽ triển khai onsite và offsite|Ngày 31/10<br>|Lark Sheet|- Monthly plan: [\[Template\] Monthly Plan Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/KmRCsEIw1h4aJytsbZgl4347gZb)<br>- Content tactics: [\[Template\] Content Tactics Template \- Ver 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/Vasys8Ll7hdH5Xt7gvqlll6ZgTs)|- Monthly plan:<br>- Content tactics: [\[Hướng dẫn\] Content Tactics Template Version 1\.0\.0](https://upbasevn.sg.larksuite.com/docx/YmOSdFv7zoNHpYxwau5lDerFgcc)<br>|
|13|Tổ chức họp nội bộ|Account|- Market research<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research<br>- Product strategy, Commercial strategy, Channel strategy, Content strategy\.<br>- Joint business plan|Thống nhất được chiến lược và kế hoạch chung, JBP và các hoạt động sẽ triển khai\.|Ngày 1/11|Họp trưc tiếp / Lark Meeting<br>|||
|14|Chuẩn bị Slide và lịch họp với Brand<br>|Account|- Market research<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research<br>- Product strategy, Commercial strategy, Channel strategy, Content strategy\.<br>- Joint business plan|- Slide trình bày<br>- Lịch họp đã chốt với Brand và nội bộ<br>|Ngày 05/11|Canva, Lark Slide|||
|15|Đánh giá plan<br>|Brand|- Brand Strategy \- ECOM Strategy<br>- Product strategy, Commercial strategy, Channel strategy, Content strategy\.<br>- Joint business plan<br>- Tactics plan|Thống nhất và chốt được kế hoạch triển khai\. Brand cam kết phối hợp và triển khai cùng UpBase|Ngày 25/11|Lark Sheet, Canva, Lark slide|||
|16|Input plan lên hệ thống<br>|Growth|- Tactics plan<br>- Joint business plan|Plan được input lên hệ thống và gửi duyệt\.|Ngày 26/11|Lark Base|||
|17|Duyệt plan|Growth<br>|- Tactics plan<br>- Joint business plan|Plan được duyệt thành công|Ngày 30/11|Lark Approval|||
|18|Gửi email xác nhận kế hoạch|Account|- Joint business plan<br>- Tactics plan|Email được gửi thành công và được brand xác nhận\.|Ngày 01/12|Lark Mail|||

## Quy trình lập kế hoạch Quarterly

### Sơ đồ quy trình

Trong quy trình này, các team Brand \(thuộc Marketing B2C\), Media, Livestream, CX, Design, Fulfillment không tham gia thực hiện hoặc chịu trách nhiệm của các bước trong quy trình\. Tuy nhiên có trách nhiệm tham gia tham vấn cho các team còn lại trong quá trình lên kế hoạch\. 

### Mô tả các bước

|**STT**|**Hoạt động**|**PIC**|**Input**|**Output**|**SLA**|**Công cụ**|**Template**|**Hướng dẫn**|
|---|---|---|---|---|---|---|---|---|
|1|Review và định hướng từ Brand|Account<br>|Báo cáo kết quả hoạt động năm trước, Chia sẻ từ phía Brand|Thông tin về định hướng và mong muốn của Brand trong năm tới\.|Từ ngày 10 \- 13 tháng thứ 2 của quý trước|Lark Meeting/Họp trực tiếp\. Lark Sheet, Lark Slide|||
|2|Thống nhất định hướng và mong muốn của Brand|Account|Thông tin về định hướng và mong muốn của Brand trong năm tới\.|File Sheet tổng hợp mong muốn và định hướng của Brand đã được xác nhận||Lark Sheet|||
|3|Tổ chức họp nội bộ|Account|File Sheet tổng hợp mong muốn và định hướng của Brand đã được xác nhận<br>Báo cáo kết quả hoạt động năm trước\.|Toàn bộ thành viên tham gia họp nắm được kế mong muốn và định hướng của brand\. Thống nhất trách nhiệm và nhiệm vụ của các thành viên tham gia|Từ ngày 13 \- 14 tháng thứ 2 của quý trước<br>|Họp trực tiếp, Lark Sheet, Lark Slide|||
|4|Market research|Tất cả thành viên|File Sheet tổng hợp mong muốn và định hướng của Brand đã được xác nhận<br>|- Báo cáo nghiên cứu thị trường<br>- Bản đồ ngành hàng<br>- Ma trận đối thủ cạnh tranh<br>- Cơ hội và rủi ro<br>- Các giả định nền tảng cho kế hoạch<br>> Các team với vai trò và SOP khác nhau thực hiện tập trung research vào các nội dung khác nhau\. Mục tiêu chính nhằm đáp ứng yêu cầu lên plan của phần mà team đó phụ trách<br>> <br>> |Từ ngày 15 \- 17 tháng thứ 2 của quý trước<br>|AI, Metric\.vn, Seller, Tool khác\.|[\[Template\] Market Research Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/LDyZsfF4kh5Go7tlhtMlQ2oDgag)<br>||
|6|Ecom Strategy<br>|Growth TikTok|- Kết quả market research và Target Audience, Value Proposition<br>|Trả lời câu hỏi: <br>- Chiến lược chung có phù hợp cho quý tới?<br>- Có cần điều chỉnh chiến lược chung?<br>|Từ ngày 18 \- 20 tháng thứ 2 của quý trước<br>|Lark Sheet<br>|[\[Template\] Brand Strategy Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/FTlVsMO31hx35UtcmDMlHuLog3f)||
|7|Product strategy|Growth|- Mong muốn và định hướng của brand<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research|Trả lời câu hỏi: <br>- Product strategy có phù hợp cho quý tới?<br>- Có cần điều chỉnh chiến lược?|Từ ngày  tháng thứ 3 của quý trước|Lark Sheet|[\[Template\] ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/YMgjsA3xOhTyhNtPotilLAo0gIK)<br>|[\[Hướng dẫn\] Hướng dẫn điền template ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/docx/LtgKdulUaoucvNx1XmNlThbVgvd)|
|8|Commercial strategy<br>|Growth|- Mong muốn và định hướng của brand<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research|Trả lời câu hỏi: <br>- Commercial strategy có phù hợp cho quý tới?<br>- Có cần điều chỉnh chiến lược?|Trước ngày 2 tháng thứ 3 của quý trước|Lark Sheet<br>|[\[Template\] ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/YMgjsA3xOhTyhNtPotilLAo0gIK)|[\[Hướng dẫn\] Hướng dẫn điền template ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/docx/LtgKdulUaoucvNx1XmNlThbVgvd)|
|9|Channel strategy|Growth<br>|- Mong muốn và định hướng của brand<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research|Trả lời câu hỏi: <br>- Channel strategy có phù hợp cho quý tới?<br>- Có cần điều chỉnh chiến lược?<br>|Trước ngày 2 tháng thứ 3 của quý trước|Lark Sheet|[\[Template\] ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/YMgjsA3xOhTyhNtPotilLAo0gIK)|[\[Hướng dẫn\] Hướng dẫn điền template ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/docx/LtgKdulUaoucvNx1XmNlThbVgvd)|
|10|Content strategy|Content|- Mong muốn và định hướng của brand<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research|Trả lời câu hỏi: <br>- Content strategy có phù hợp cho quý tới?<br>- Có cần điều chỉnh chiến lược?|Trước ngày 2 tháng thứ 3 của quý trước|Lark Sheet<br>|[\[Template\] ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/YMgjsA3xOhTyhNtPotilLAo0gIK)<br>|[\[Hướng dẫn\] Hướng dẫn điền template ECOM Strategy Implementation Guidelines Version 1\.0\.0](https://upbasevn.sg.larksuite.com/docx/LtgKdulUaoucvNx1XmNlThbVgvd)|
|11|Join Business Plan|Account|- Mong muốn và định hướng của brand<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research<br>- Product strategy,  Commercial strategy, Channel strategy, Content strategy|Bản JBP hoàn chỉnh của riêng quý \(có điều chỉnh nếu cần thiết\)|Trước ngày 6 tháng thứ 3 của quý trước|Lark Sheet<br>|[\[Template\] Joint Business Plan Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/SMHusSgEbh6NQxtbyxllm7G3gjg)<br>|[\[Hướng dẫn\] Joint Business Plan Version 1\.0\.0](https://upbasevn.sg.larksuite.com/docx/VXsjd3shdoSc4lxJSvYlbvOjg7d)|
|12|Tactics plan<br>|Growth|- Mong muốn và định hướng của brand<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research<br>- Product strategy, Commercial strategy, Channel strategy, Content strategy\.<br>- Joint business plan|Bản kế hoạch đầy đủ có tối thiểu:<br>- Doanh thu<br>- Chi phí<br>- Chi tiết các hoạt động sẽ triển khai onsite và offsite theo từng tháng|Trước ngày 9 tháng thứ 3 của quý trước|Lark Sheet<br>|- Monthly plan: [\[Template\] Monthly Plan Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/KmRCsEIw1h4aJytsbZgl4347gZb)<br>- Content tactics: [\[Template\] Content Tactics Template \- Ver 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/Vasys8Ll7hdH5Xt7gvqlll6ZgTs)|- Monthly plan:<br>- Content tactics: [\[Hướng dẫn\] Content Tactics Template Version 1\.0\.0](https://upbasevn.sg.larksuite.com/docx/YmOSdFv7zoNHpYxwau5lDerFgcc)<br>|
|13|Tổ chức họp nội bộ|Account|- Market research<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research<br>- Product strategy, Commercial strategy, Channel strategy, Content strategy\.<br>- Joint business plan|Thống nhất được chiến lược và kế hoạch chung, JBP và các hoạt động sẽ triển khai\.<br>|Trước ngày 10 tháng thứ 3 của quý trước|Họp trưc tiếp / Lark Meeting<br>|||
|14|Chuẩn bị Slide và lịch họp với Brand<br>|Account|- Market research<br>- Brand Strategy \- ECOM Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research<br>- Product strategy, Commercial strategy, Channel strategy, Content strategy\.<br>- Joint business plan|- Slide trình bày<br>- Lịch họp đã chốt với Brand và nội bộ<br>|Trước ngày 13 tháng thứ 3 của quý trước|Canva, Lark Slide|||
|15|Đánh giá plan|Brand|- Brand Strategy \- ECOM Strategy<br>- Product strategy, Commercial strategy, Channel strategy, Content strategy\.<br>- Joint business plan<br>- Tactics plan|Thống nhất và chốt được kế hoạch triển khai\. Brand cam kết phối hợp và triển khai cùng UpBase|Trước ngày 14 tháng thứ 3 của quý trước<br>|Lark Sheet, Canva, Lark slide|||
|16|Input plan lên hệ thống|Growth|- Tactics plan<br>- Joint business plan|Plan được input lên hệ thống và gửi duyệt\.|Trước ngày 15 tháng thứ 3 của quý trước|Lark Base|||
|17|Duyệt plan|Growth<br>|- Tactics plan<br>- Joint business plan|Plan được duyệt thành công<br>|Trước ngày 18 tháng thứ 3 của quý trước|Lark Approval|||
|18|Gửi email xác nhận kế hoạch|Account|- Joint business plan<br>- Tactics plan|Email được gửi thành công và được brand xác nhận\.|Trước ngày 20 tháng thứ 3 của quý trước|Lark Mail|||

## Quy trình lập kế hoạch Monthly

### Sơ đồ quy trình

Trong quy trình này, các team Livestream, CX, Design, Fulfillment không tham gia thực hiện hoặc chịu trách nhiệm của các bước trong quy trình\. Tuy nhiên có trách nhiệm tham gia tham vấn cho các team còn lại trong quá trình lên kế hoạch\. 

### Mô tả các bước

|**STT**|**Hoạt động**|**PIC**|**Input**|**Output**|**SLA**|**Công cụ**|**Hướng dẫn **|**Template**|
|---|---|---|---|---|---|---|---|---|
|1|Review và định hướng từ Brand|Account<br>|Báo cáo kết quả hoạt động năm trước, Chia sẻ từ phía Brand|Thông tin về định hướng và mong muốn của Brand trong năm tới\.<br>|Ngày 8\-10 hàng tháng<br>|Lark Meeting/Họp trực tiếp\. Lark Sheet, Lark Slide|||
|2|Thống nhất định hướng và mong muốn của Brand|Account|Thông tin về định hướng và mong muốn của Brand trong năm tới\.|File Sheet tổng hợp mong muốn và định hướng của Brand đã được xác nhận||Lark Sheet|||
|3|Tổ chức họp nội bộ|Account|File Sheet tổng hợp mong muốn và định hướng của Brand đã được xác nhận<br>Báo cáo kết quả hoạt động năm trước\.|Toàn bộ thành viên tham gia họp nắm được kế mong muốn và định hướng của brand\. Thống nhất trách nhiệm và nhiệm vụ của các thành viên tham gia|Ngày 9\-10 hàng tháng|Họp trực tiếp, Lark Sheet, Lark Slide|||
|4|Market research|Tất cả thành viên|File Sheet tổng hợp mong muốn và định hướng của Brand đã được xác nhận|- Tổng quan về xu hướng hoặc benchmark thị trường và ngành hàng<br>- Hành động học được từ đối thủ cạnh tranh<br>> Các team với vai trò và SOP khác nhau thực hiện tập trung research vào các nội dung khác nhau\. Mục tiêu chính nhằm đáp ứng yêu cầu lên plan của phần mà team đó phụ trách<br>> <br>> |Ngày 9\-12 hàng tháng|AI, Metric\.vn, Seller, Tool khác\.|||
|7|Growth plan<br>|Growth|- Mong muốn và định hướng của brand<br>- Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research|Plan về thúc đẩy tăng trưởng tổng thể của Growth|Ngày 10\-12 hàng tháng|Lark Sheet|[\[Template\] Monthly Plan Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/KmRCsEIw1h4aJytsbZgl4347gZb)||
|8|Content plan<br>|Content|- Mong muốn và định hướng của brand<br>- Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research|Plan về content triển khai trong tháng <br>|Ngày 10\-12 hàng tháng|Lark Sheet|[\[Template\] Content Monthly Plan Template \- Ver 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/Gsr1sxmpDh8J2jtzSg9lSW4ugZc?sheet=laU0pT)<br>||
|9|Media plan<br>|Media<br>|- Mong muốn và định hướng của brand<br>- Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research|Kế hoạch về hoạt động media của các kênh\.|Ngày 10\-12 hàng tháng|Lark Sheet|[\[Template\] Monthly Plan Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/KmRCsEIw1h4aJytsbZgl4347gZb)||
|10|Livestream plan<br>|Content|- Mong muốn và định hướng của brand<br>- Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research|Kế hoạch về hoạt động livestream operation và quản lý hostlive\.<br>|Ngày 10\-12 hàng tháng|Lark Sheet|[\[Template\] Monthly Plan Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/KmRCsEIw1h4aJytsbZgl4347gZb)||
|12|Monthly plan<br>|Growth|- Mong muốn và định hướng của brand<br>- Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research<br>- Product strategy, Commercial strategy, Channel strategy, Content strategy\.<br>- Joint business plan của quý|Bản kế hoạch chi tiết tháng đầy đủ có tối thiểu:<br>- Doanh thu<br>- Chi phí<br>- Chi tiết các hoạt động sẽ triển khai onsite và offsite|Ngày 13 hàng tháng|Lark Sheet|[\[Template\] Monthly Plan Version 1\.0\.0](https://upbasevn.sg.larksuite.com/sheets/KmRCsEIw1h4aJytsbZgl4347gZb)<br>||
|13|Tổ chức họp nội bộ|Account|- Market research<br>- Strategy<br>- Target Audience <br>- Value Proposition<br>- Market research<br>- Product strategy, Commercial strategy, Channel strategy, Content strategy\.<br>- Monthly plan|Thống nhất được chiến lược và kế hoạch tăng trưởng và các hoạt động sẽ triển khai trong tháng giữa toàn bộ các thành viên\.|Ngày 13\-16 hàng tháng|Họp trưc tiếp / Lark Meeting<br>|||
|14|Chuẩn bị Slide và lịch họp với Brand<br>|Account|- Market research<br>- Joint business plan quý<br>- Monthly plan|- Slide trình bày<br>- Lịch họp đã chốt với Brand và nội bộ<br>|Ngày 15\-18 hàng tháng|Canva, Lark Slide|||
|15|Đánh giá plan|Brand|- Joint business plan quý<br>- Monthly plan|Thống nhất và chốt được kế hoạch triển khai\. Brand cam kết phối hợp và triển khai cùng UpBase||Lark Sheet, Canva, Lark slide|||
|16|Input plan lên hệ thống|Growth|- Monthly plan|Plan được input lên hệ thống và gửi duyệt\.|Ngày 18 hàng tháng|Lark Base|||
|17|Duyệt plan|Growth<br>|- Monthly plan|Plan được duyệt thành công và các nguồn lực được xác nhận khả năng đáp ứng|Ngày 18\-23 hàng tháng|Lark Approval|||
|18|Gửi email xác nhận kế hoạch|Account|- Monthly plan|Email được gửi thành công và được brand xác nhận\.|Ngày 23\-25 hàng tháng|Lark Mail|||



---

# VAI TRÒ VÀ TRÁCH NHIỆM \(RACI\)

***R = Responsible***
***A = Accountable***

***C = Consulted***
***I = Informed***

|**Hoạt động**|**Brand \(KH\)**|**Account**|**Growth**|**Content**|**Media**|**Livestream**|**Marketing B2C \- Team Brand**|
|---|---|---|---|---|---|---|---|
|**Review và định hướng từ Brand**|R/A|R|I/C|I|I|I|I|
|**Market research**||R|R/A|R|R|R|R|
|**Target Audience**|C/I|I/C|I/C|R|I/C|I/C|A/R|
|**Value Proposition**|C/I|I/C|I/C|R|I/C|I/C|A/R|
|**Brand strategy**|C/I|I/C|R|R|I/C|I/C|A/R|
|**Ecom Strategy**|C/I|I/C|A/R|R|I/C|I/C|C/I|
|**Product strategy**||C/I|R/A|C/I|C/I|C/I|C/I|
|**Commercial strategy**||C/I|R/A|C/I|C/I|C/I|C/I|
|**Channel strategy**||C/I|R/A|C/I|C/I|C/I|C/I|
|**Content strategy**||C/I|C/I|R/C|C/I|C/I|C/I|
|**Join Business Plan**|A|R/A|R/C|R/C|C/I|C/I|C/I|
|**Duyệt plan**|R|R|A|R|R|R|I|

# SLA VÀ KPI KIỂM SOÁT



---

# RỦI RO VÀ BIỆN PHÁP KIỂM SOÁT

|**STT**|**Rủi ro**|**Mức độ**|**Biện pháp kiểm soát**|**Owner kiểm soát**|
|---|---|---|---|---|
|1|Lập kế hoạch theo cảm tính, thiếu dữ liệu thị trường hoặc dữ liệu bán hàng làm cơ sở|Cao|Checklist input bắt buộc trước khi bắt đầu chu kỳ Planning; Quản lý từ chối plan không có nguồn dữ liệu hoặc giả định được ghi rõ|Growth / Leader duyệt plan|
|2|Template có tên hạng mục nhưng thiếu target, ngân sách, owner, timeline hoặc output|Cao|Kiểm tra tính đầy đủ tại bước Input plan lên hệ thống và bước Duyệt plan; plan thiếu trường bắt buộc bị trả lại kèm lý do|Growth|
|3|Trễ SLA một bước làm lệch toàn bộ chu kỳ \(plan tháng chốt sau khi tháng đã bắt đầu\)|Cao|Gắn SLA cụ thể cho từng bước; reminder tự động trên Lark; trễ quá 2 ngày làm việc thông báo lên Leader|Account|
|4|Brand thay đổi định hướng hoặc mục tiêu giữa chu kỳ khiến plan đã duyệt không còn phù hợp|Trung bình|Xử lý theo quy trình ngoại lệ \(change request\); mọi điều chỉnh phải re\-approve và lưu lịch sử thay đổi trên Lark Base|Account|
|5|Forecast sai lệch lớn so với thực tế \(GMV, chi phí, P\&L\)<br>|Cao|Review plan vs actual hằng tháng; sai lệch vượt ±15% GMV hoặc ±10% P\&L phải có phân tích nguyên nhân và rebase trong chu kỳ Quarterly|Growth / Finance|
|6|Xung đột nguồn lực không đáp ứng được|Trung bình|Xác nhận khả năng đáp ứng nguồn lực là điều kiện bắt buộc tại bước Duyệt plan Monthly; xung đột được phân xử theo ưu tiên do Leader quyết định|Leader các team|
|7|Mất đồng bộ giữa bản plan trên Sheet/Slide và bản trên Lark Base|Trung bình|Quy ước Lark Base là bản chính thức duy nhất để đánh giá kết quả thực hiện; bản Sheet/Slide chỉ dùng để làm việc; mọi thay đổi sau duyệt phải cập nhật vào Lark Base trước|Growth|
|8|Chính sách sàn thay đổi \(phí, thuật toán, quy định campaign\) làm giả định plan không còn đúng|Trung bình|Theo dõi thông báo Seller Center định kỳ; cập nhật giả định nền tảng trong Market research; kích hoạt quy trình ngoại lệ nếu ảnh hưởng trọng yếu|Growth|
|9|P\&L bị bỏ qua hoặc làm hình thức để plan được duyệt nhanh|Cao|P\&L Form là điều kiện tiên quyết của Approval Gate; Finance có quyền veto plan không đạt ngưỡng biên lợi nhuận hoặc thiếu kịch bản rủi ro|Finance|
|10|Learning từ chu kỳ trước không được đưa vào chu kỳ sau, lặp lại lỗi cũ|Thấp|Bước Review và định hướng đầu mỗi chu kỳ bắt buộc sử dụng báo cáo kết quả kỳ trước; learning được lưu trên Lark Base theo từng chu kỳ|Account|

---

# XỬ LÝ NGOẠI LỆ

|**STT**|**Trường hợp**|**Cách xử lý**|**Thẩm quyền quyết định**|
|---|---|---|---|
|1|Brand mới, chưa có dữ liệu bán hàng lịch sử để làm input<br>|Dùng benchmark ngành hàng, dữ liệu đối thủ và giả định được ghi rõ thay cho dữ liệu nội bộ; plan chu kỳ đầu được coi là plan thử nghiệm với mốc review sớm hơn \(sau 4\-6 tuần\) để hiệu chỉnh|Leader Growth \+ Account|
|2|Điều chỉnh ngân sách hoặc target giữa tháng ở mức nhỏ \(trong ngưỡng ±5% ngân sách tháng, không đổi mục tiêu quý\)|Growth đề xuất kèm lý do và dữ liệu, Account xác nhận với Brand qua văn bản; cập nhật trên Lark Base, không cần re\-approve toàn bộ plan|Growth \+ Account|
|4|Điều chỉnh lớn \(vượt ±10% ngân sách, thay đổi target quý/năm, thay đổi chiến lược kênh hoặc danh mục\)|Kích hoạt change request: lập bản điều chỉnh có so sánh trước/sau và tác động P\&L; re\-approve và xác nhận lại với Brand qua email|Leader/CEO \+ Brand|
|5|Khủng hoảng truyền thông, sự cố chất lượng sản phẩm hoặc gián đoạn nguồn hàng|Tạm dừng các hoạt động thúc đẩy liên quan trong plan; ưu tiên xử lý sự cố; Growth lập plan điều chỉnh sau khi tình hình ổn định và trình duyệt lại|Leader/CEO|
|6|Brand không phản hồi xác nhận kế hoạch đúng hạn|Account nhắc lần 1 sau 2 ngày làm việc, thông tin lên Leader sau 4 ngày; nếu tiếp tục không có phản hồi, leader trao đổi trực tiếp với brand, nếu vẫn không có phản hồi, BOD tham gia trao đổi trực tiếp\.|Account \+ Leader|
|7|Thiếu nguồn lực đáp ứng plan tại thời điểm duyệt \(nhân sự, ngân sách, tồn kho\)|Plan được duyệt có điều kiện: cắt giảm hoặc dời các hạng mục không đủ nguồn lực sang kỳ sau, ghi rõ trong kế hoạch; không duyệt plan vượt quá năng lực đã xác nhận|Leader các team|



