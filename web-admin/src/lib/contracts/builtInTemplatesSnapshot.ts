/* Auto-generated snapshot of official Ver052026 legal templates from Quản lý hợp đồng */
import type { LegalTemplate } from './types';

export const OFFICIAL_TEMPLATES_SNAPSHOT: Record<string, LegalTemplate> = {
  "IND-HD": {
    "id": "IND-HD",
    "name": "Hợp đồng video · Cá nhân",
    "filename": "1.1.1. BM.HĐ.VID.IND.Ver052026 booking Video.docx",
    "subject": "Cá nhân",
    "kind": "CONTRACT",
    "version": "Ver052026",
    "hash": "046fcd759e30775e8d0500d509440de6ae8ffef93ef5eab27fdc85011e74b48d",
    "fields": [
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 4,
        "end": 14,
        "label": "dd.mm.yy",
        "context": "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 33,
        "end": 41,
        "label": "ID KOC",
        "context": "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p16:14",
        "part": "word/document.xml",
        "paragraph": 16,
        "start": 14,
        "end": 15,
        "label": "Hôm nay, ngày  [điền]  tháng … năm 202…, tại tr",
        "context": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "required": true,
        "title": "Ngày ký",
        "group": "DATE",
        "kind": "number",
        "source": "signDay"
      },
      {
        "key": "word/document.xml:p16:22",
        "part": "word/document.xml",
        "paragraph": 16,
        "start": 22,
        "end": 23,
        "label": "Hôm nay, ngày … tháng  [điền]  năm 202…, tại trụ sở chí",
        "context": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "required": true,
        "title": "Tháng ký",
        "group": "DATE",
        "kind": "number",
        "source": "signMonth"
      },
      {
        "key": "word/document.xml:p16:31",
        "part": "word/document.xml",
        "paragraph": 16,
        "start": 31,
        "end": 32,
        "label": "Hôm nay, ngày … tháng … năm 202 [điền] , tại trụ sở chính của Cô",
        "context": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "required": true,
        "title": "Năm ký (chữ số cuối, ví dụ 6 cho 2026)",
        "group": "DATE",
        "kind": "number",
        "source": "signYearDigit"
      },
      {
        "key": "word/document.xml:p36:cell",
        "part": "word/document.xml",
        "paragraph": 36,
        "label": "BÊN B",
        "context": "BÊN B",
        "required": true,
        "title": "Họ tên Bên B",
        "group": "PARTY",
        "kind": "text",
        "source": "partyName"
      },
      {
        "key": "word/document.xml:p39:cell",
        "part": "word/document.xml",
        "paragraph": 39,
        "label": "CCCD",
        "context": "CCCD",
        "required": true,
        "title": "Số CCCD",
        "group": "PARTY",
        "kind": "text",
        "source": "cccd"
      },
      {
        "key": "word/document.xml:p42:cell",
        "part": "word/document.xml",
        "paragraph": 42,
        "label": "Địa chỉ",
        "context": "Địa chỉ",
        "required": true,
        "title": "Địa chỉ",
        "group": "PARTY",
        "kind": "long",
        "source": "address"
      },
      {
        "key": "word/document.xml:p45:cell",
        "part": "word/document.xml",
        "paragraph": 45,
        "label": "Số điện thoại",
        "context": "Số điện thoại",
        "required": true,
        "title": "Số điện thoại",
        "group": "PARTY",
        "kind": "text",
        "source": "phone"
      },
      {
        "key": "word/document.xml:p48:cell",
        "part": "word/document.xml",
        "paragraph": 48,
        "label": "Email",
        "context": "Email",
        "required": true,
        "title": "Email",
        "group": "PARTY",
        "kind": "text",
        "source": "email"
      },
      {
        "key": "word/document.xml:p158:109",
        "part": "word/document.xml",
        "paragraph": 158,
        "start": 109,
        "end": 110,
        "label": "đẩy doanh số bán hàng với sản phẩm  [điền] .",
        "context": "Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….",
        "required": false,
        "title": "Sản phẩm",
        "group": "SCOPE",
        "kind": "text",
        "source": "product"
      },
      {
        "key": "word/document.xml:p162:30",
        "part": "word/document.xml",
        "paragraph": 162,
        "start": 30,
        "end": 31,
        "label": "Có gắn link/giỏ hàng sản phẩm  [điền]  (thời gian tiến hành gắn",
        "context": "Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)",
        "required": false,
        "title": "Sản phẩm gắn giỏ hàng",
        "group": "SCOPE",
        "kind": "text",
        "source": "product"
      },
      {
        "key": "word/document.xml:p163:35",
        "part": "word/document.xml",
        "paragraph": 163,
        "start": 35,
        "end": 36,
        "label": "Cấp mã code để chạy quảng cáo trong [điền]  ngày",
        "context": "Cấp mã code để chạy quảng cáo trong… ngày",
        "required": false,
        "title": "Số ngày cấp mã quảng cáo",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p166:cell",
        "part": "word/document.xml",
        "paragraph": 166,
        "label": "Sản xuất và đăng tải Video review · Đơn giá",
        "context": "1 · Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….Tài khoản đăng tải – link: Thời gian đăng tải:Thời lượng video:Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)Cấp mã code để chạy quảng cáo trong… ngàyBàn giao video gốcYêu cầu key cần bổ sung nếu có",
        "required": false,
        "title": "Sản xuất và đăng tải Video review · Đơn giá",
        "group": "SCOPE",
        "kind": "money",
        "source": "unitPrice"
      },
      {
        "key": "word/document.xml:p167:cell",
        "part": "word/document.xml",
        "paragraph": 167,
        "label": "Sản xuất và đăng tải Video review · Số lượng",
        "context": "1 · Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….Tài khoản đăng tải – link: Thời gian đăng tải:Thời lượng video:Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)Cấp mã code để chạy quảng cáo trong… ngàyBàn giao video gốcYêu cầu key cần bổ sung nếu có",
        "required": false,
        "title": "Sản xuất và đăng tải Video review · Số lượng",
        "group": "SCOPE",
        "kind": "number",
        "source": "quantity"
      },
      {
        "key": "word/document.xml:p168:cell",
        "part": "word/document.xml",
        "paragraph": 168,
        "label": "Sản xuất và đăng tải Video review · Thành tiền",
        "context": "1 · Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….Tài khoản đăng tải – link: Thời gian đăng tải:Thời lượng video:Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)Cấp mã code để chạy quảng cáo trong… ngàyBàn giao video gốcYêu cầu key cần bổ sung nếu có",
        "required": false,
        "title": "Sản xuất và đăng tải Video review · Thành tiền",
        "group": "SCOPE",
        "kind": "money",
        "source": "lineTotal"
      },
      {
        "key": "word/document.xml:p170:23",
        "part": "word/document.xml",
        "paragraph": 170,
        "start": 23,
        "end": 24,
        "label": "Sử dụng hình ảnh trong  [điền]  ngày từ ngày ….",
        "context": "Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Số ngày sử dụng hình ảnh",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p170:38",
        "part": "word/document.xml",
        "paragraph": 170,
        "start": 38,
        "end": 39,
        "label": "dụng hình ảnh trong … ngày từ ngày  [điền] .",
        "context": "Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Ngày bắt đầu sử dụng hình ảnh",
        "group": "SCOPE",
        "kind": "date"
      },
      {
        "key": "word/document.xml:p171:cell",
        "part": "word/document.xml",
        "paragraph": 171,
        "label": "Sử dụng hình ảnh trong · Đơn giá",
        "context": "2 · Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Sử dụng hình ảnh trong · Đơn giá",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p172:cell",
        "part": "word/document.xml",
        "paragraph": 172,
        "label": "Sử dụng hình ảnh trong · Số lượng",
        "context": "2 · Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Sử dụng hình ảnh trong · Số lượng",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p173:cell",
        "part": "word/document.xml",
        "paragraph": 173,
        "label": "Sử dụng hình ảnh trong · Thành tiền",
        "context": "2 · Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Sử dụng hình ảnh trong · Thành tiền",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p175:32",
        "part": "word/document.xml",
        "paragraph": 175,
        "start": 32,
        "end": 33,
        "label": "Tham dự sự kiện trong thời gian  [điền]  tiếng ngày….",
        "context": "Tham dự sự kiện trong thời gian … tiếng ngày….",
        "required": false,
        "title": "Số giờ tham dự sự kiện",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p175:44",
        "part": "word/document.xml",
        "paragraph": 175,
        "start": 44,
        "end": 45,
        "label": "ự kiện trong thời gian … tiếng ngày [điền] .",
        "context": "Tham dự sự kiện trong thời gian … tiếng ngày….",
        "required": false,
        "title": "Ngày tham dự sự kiện",
        "group": "SCOPE",
        "kind": "date"
      },
      {
        "key": "word/document.xml:p176:cell",
        "part": "word/document.xml",
        "paragraph": 176,
        "label": "Tham dự sự kiện trong thời gian · Đơn giá",
        "context": "3 · Tham dự sự kiện trong thời gian … tiếng ngày….",
        "required": false,
        "title": "Tham dự sự kiện trong thời gian · Đơn giá",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p177:cell",
        "part": "word/document.xml",
        "paragraph": 177,
        "label": "Tham dự sự kiện trong thời gian · Số lượng",
        "context": "3 · Tham dự sự kiện trong thời gian … tiếng ngày….",
        "required": false,
        "title": "Tham dự sự kiện trong thời gian · Số lượng",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p178:cell",
        "part": "word/document.xml",
        "paragraph": 178,
        "label": "Tham dự sự kiện trong thời gian · Thành tiền",
        "context": "3 · Tham dự sự kiện trong thời gian … tiếng ngày….",
        "required": false,
        "title": "Tham dự sự kiện trong thời gian · Thành tiền",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p180:26",
        "part": "word/document.xml",
        "paragraph": 180,
        "start": 26,
        "end": 27,
        "label": "Đăng 1 post trên Facebook  [điền] .",
        "context": "Đăng 1 post trên Facebook ….",
        "required": false,
        "title": "Trang Facebook đăng bài",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p181:cell",
        "part": "word/document.xml",
        "paragraph": 181,
        "label": "Đăng 1 post trên Facebook · Đơn giá",
        "context": "4 · Đăng 1 post trên Facebook ….",
        "required": false,
        "title": "Đăng 1 post trên Facebook · Đơn giá",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p182:cell",
        "part": "word/document.xml",
        "paragraph": 182,
        "label": "Đăng 1 post trên Facebook · Số lượng",
        "context": "4 · Đăng 1 post trên Facebook ….",
        "required": false,
        "title": "Đăng 1 post trên Facebook · Số lượng",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p183:cell",
        "part": "word/document.xml",
        "paragraph": 183,
        "label": "Đăng 1 post trên Facebook · Thành tiền",
        "context": "4 · Đăng 1 post trên Facebook ….",
        "required": false,
        "title": "Đăng 1 post trên Facebook · Thành tiền",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p186:cell",
        "part": "word/document.xml",
        "paragraph": 186,
        "label": "Tổng Giá trị hợp đồng chưa bao gồm thuế TNCN (số tiền Bên B thực nhận)",
        "context": "Tổng Giá trị hợp đồng chưa bao gồm thuế TNCN (số tiền Bên B thực nhận)",
        "required": true,
        "title": "Tổng Giá trị hợp đồng chưa bao gồm thuế TNCN (số tiền Bên B thực nhận)",
        "group": "MONEY",
        "kind": "money",
        "source": "netTotal"
      },
      {
        "key": "word/document.xml:p188:cell",
        "part": "word/document.xml",
        "paragraph": 188,
        "label": "Thuế TNCN (Bên A có nghĩa vụ trích nộp)",
        "context": "Thuế TNCN (Bên A có nghĩa vụ trích nộp)",
        "required": false,
        "title": "Thuế TNCN (Bên A có nghĩa vụ trích nộp)",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p190:cell",
        "part": "word/document.xml",
        "paragraph": 190,
        "label": "Tổng Giá trị hợp đồng đã bao gồm thuế TNCN",
        "context": "Tổng Giá trị hợp đồng đã bao gồm thuế TNCN",
        "required": false,
        "title": "Tổng Giá trị hợp đồng đã bao gồm thuế TNCN",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p194:64",
        "part": "word/document.xml",
        "paragraph": 194,
        "start": 64,
        "end": 65,
        "label": "hưởng hoa hồng affiliate với tỷ lệ  [điền] % trên doanh thu phát sin",
        "context": "Hoa hồng organic: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh tự nhiên từ video, được ghi nhận thông qua link/mã theo dõi của Bên B và không bao gồm doanh thu phát sinh từ ngân sách quảng cáo do Bên A hoặc bên thứ ba chi trả. ",
        "required": false,
        "title": "Hoa hồng organic (%)",
        "group": "MONEY",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p195:65",
        "part": "word/document.xml",
        "paragraph": 195,
        "start": 65,
        "end": 66,
        "label": "hưởng hoa hồng affiliate với tỷ lệ  [điền] % trên doanh thu phát sin",
        "context": "Hoa hồng chạy ads: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh từ video được sử dụng để chạy quảng cáo, với điều kiện doanh thu đó được ghi nhận thông qua link/mã theo dõi của Bên B và được Bên A xác nhận trong báo cáo đối soát.",
        "required": false,
        "title": "Hoa hồng chạy ads (%)",
        "group": "MONEY",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p208:14",
        "part": "word/document.xml",
        "paragraph": 208,
        "start": 14,
        "end": 15,
        "label": "Lần 1 tạm ứng  [điền]  trong vòng … ngày làm vi",
        "context": "Lần 1 tạm ứng … trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm hai bên ký kết hợp đồng này.",
        "required": false,
        "title": "Số tiền tạm ứng lần 1",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p208:27",
        "part": "word/document.xml",
        "paragraph": 208,
        "start": 27,
        "end": 28,
        "label": "Lần 1 tạm ứng … trong vòng  [điền]  ngày làm việc (trừ thứ b",
        "context": "Lần 1 tạm ứng … trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm hai bên ký kết hợp đồng này.",
        "required": false,
        "title": "Hạn tạm ứng (ngày làm việc)",
        "group": "MONEY",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p209:44",
        "part": "word/document.xml",
        "paragraph": 209,
        "start": 44,
        "end": 45,
        "label": "nh toán số tiền còn lại trong vòng  [điền]  ngày làm việc (trừ thứ b",
        "context": "Lần 2 thanh toán số tiền còn lại trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm Bên B hoàn thành dịch vụ và Bên A đã nhận được Hợp đồng, Biên bản nghiệm thu dịch vụ có chữ ký của hai bên.",
        "required": false,
        "title": "Hạn thanh toán lần 2 (ngày làm việc)",
        "group": "MONEY",
        "kind": "number"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/footer1.xml",
        "paragraph": 1,
        "start": 0,
        "end": 10,
        "label": "dd.mm.yy",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/footer1.xml",
        "paragraph": 1,
        "start": 29,
        "end": 37,
        "label": "ID KOC",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      }
    ],
    "paragraphs": [
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Độc lập – Tự do – Hạnh phúc",
      "",
      "HỢP ĐỒNG DỊCH VỤ BOOKING VIDEO",
      "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
      "Căn cứ: ",
      "Bộ luật Dân sự số 91/2015/QH13, có hiệu lực từ ngày 01/01/2017;",
      "Luật Thương mại số 36/2005/QH11, có hiệu lực từ ngày 01/01/2006;",
      "Luật Thương mại điện tử số 122/2025/QH15, có hiệu lực từ ngày 01/07/2026;",
      "Nghị định số 147/2024/NĐ-CP về quản lý, cung cấp và sử dụng dịch vụ Internet và thông tin trên mạng, có hiệu lực từ ngày 25/12/2024; ",
      "Luật Quảng cáo số 16/2012/QH13 có hiệu lực từ ngày 01/01/2013;",
      "Luật sửa đổi, bổ sung một số điều của Luật Quảng cáo số 75/2025/QH15, có hiệu lực từ ngày 01/01/2026;",
      "Luật Sở hữu Trí tuệ số 50/2005/QH11, có hiệu lực từ ngày 01/07/2006;",
      "Luật Sửa đổi bổ sung một số điều của Luật Sở hữu Trí tuệ số 131/2025/QH15, có hiệu lực từ ngày 01/04/2026;",
      "Nhu cầu và khả năng của hai Bên.",
      "",
      "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
      "",
      "BÊN SỬ DỤNG DỊCH VỤ",
      "BÊN A",
      ":",
      "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
      "Mã số thuế",
      ":",
      "0109361325",
      "Địa chỉ",
      ":",
      "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
      "Người đại diện",
      ":",
      "Ông Đỗ Văn Giang   ",
      "Sau đây gọi tắt là “Bên A”",
      "",
      "BÊN CUNG ỨNG DỊCH VỤ ",
      "BÊN B",
      ":",
      "",
      "CCCD",
      ":",
      "",
      "Địa chỉ",
      ":",
      "",
      "Số điện thoại",
      ":",
      "",
      "Email",
      ":",
      "",
      "Sau đây gọi tắt là “Bên B”",
      "",
      "",
      "",
      "Bên A có nhu cầu triển khai các hoạt động quảng bá sản phẩm thông qua các KOL/KOC trên các nền tảng truyền thông. Hai bên cùng hợp tác ký kết hợp đồng dịch vụ nhằm quảng cáo, tiếp thị, thúc đẩy doanh số kinh doanh với các điều khoản như sau:",
      "ĐIỀU 1: ĐỊNH NGHĨA",
      "Khái niệm",
      "Định nghĩa",
      "Tài khoản mạng xã hội",
      "Là tài khoản mạng xã hội có link: …",
      "Bên B là chủ sở hữu hợp pháp và có toàn quyền quản lý, vận hành tài khoản mạng xã hội trong suốt thời gian thực hiện Hợp đồng. ",
      "Tiếp thị ",
      "liên kết ",
      "(Affiliate)",
      "Là việc Bên B quảng bá sản phẩm/dịch vụ thông qua cơ chế của nền tảng thương mại điện tử (sàn TMĐT) (bao gồm link, mã, giỏ hàng hoặc công cụ tương đương), trong đó doanh thu chỉ được ghi nhận khi được hệ thống nền tảng xác nhận. Hoa hồng và doanh thu được xác định theo dữ liệu cuối cùng từ nền tảng và có thể bị điều chỉnh trong trường hợp hoàn đơn, gian lận hoặc vi phạm chính sách.",
      "Booking video",
      "Booking video là việc Bên A thuê Bên B sản xuất và đăng tải Video theo các yêu cầu cụ thể của Bên A, có nội dung review, đánh giá, giới thiệu, quảng bá sản phẩm và thúc đẩy doanh số bán hàng (có thể bao gồm các cơ chế như gắn link, mã, giỏ hàng hoặc kêu gọi hành động). ",
      "Phí dịch vụ booking",
      "Phí dịch vụ booking là khoản phí cố định Bên A thanh toán cho Bên B theo Hợp đồng.",
      "Hoa hồng",
      "Là khoản thu nhập của Bên B dựa trên doanh thu Affiliate hợp lệ được nền tảng chi trả. Bên B tự chịu trách nhiệm kê khai, nộp thuế và các nghĩa vụ tài chính liên quan đến khoản hoa hồng này theo quy định pháp luật (nếu áp dụng).",
      "",
      "ĐIỀU 2: PHẠM VI CÔNG VIỆC",
      " Phạm vi công việc cần thực hiện",
      "Bên B thực hiện sản xuất và đăng tải video trên các nền tảng mạng xã hội.",
      "Phạm vi công việc mở rộng:",
      "Gắn công cụ bán hàng: Gắn link, giỏ hàng, mã theo dõi, mã giảm giá, hashtag, CTA …; ",
      "Hỗ trợ quảng cáo: Cho phép Bên A hoặc bên thứ ba do Bên A chỉ định sử dụng nội dung video để chạy quảng cáo, chia sẻ mã quảng cáo, …; ",
      "Sử dụng hình ảnh:",
      "Bên A có quyền sử dụng, khai thác, chỉnh sửa kỹ thuật, resize, cắt ghép định dạng, biên tập, chuyển thể, lồng ghép, tái sử dụng và phân phối lại hình ảnh, video, nội dung do Bên B thực hiện để phục vụ hoạt động truyền thông, quảng bá và thương mại cho nhãn hàng/sản phẩm theo phạm vi đã thỏa thuận tại Hợp đồng.",
      "Bên A được quyền đăng tải lại video trên kênh chính thức của nhãn hàng; sử dụng hình ảnh/video làm banner, hình ảnh trưng bày trên gian hàng TMĐT, website, landing page, nền tảng số hoặc các kênh truyền thông khác của nhãn hàng; đồng thời được quyền cho phép các KOC/KOL/người dùng khác duet, stitch, chia sẻ hoặc sử dụng lại nội dung nhằm phục vụ hoạt động quảng bá chiến dịch trong phạm vi đã thỏa thuận.",
      "Bên A được quyền sử dụng hình ảnh, giọng nói, tên, hình tượng và các yếu tố nhận diện của Bên B/KOL xuất hiện trong nội dung nhằm phục vụ hoạt động quảng cáo, truyền thông và thương mại cho nhãn hàng/sản phẩm theo phạm vi sử dụng đã thỏa thuận.",
      "Phạm vi sử dụng bao gồm nhưng không giới hạn tại: website, landing page, sàn thương mại điện tử, Facebook, TikTok, Instagram, YouTube và các nền tảng số khác của nhãn hàng.",
      "Nội dung được phép sử dụng trong các hoạt động digital marketing, social seeding, PR, media booking, livestream, affiliate marketing, e-commerce campaign và các hoạt động quảng bá sản phẩm/nhãn hàng khác theo nhu cầu truyền thông thực tế của Bên A.",
      "Tham gia hoạt động truyền thông và sự kiện: Tham gia event …; ",
      "Triển khai các định dạng nội dung khác: Thực hiện các bài đăng ngoài video như hình ảnh, carousel, bài viết, caption, story, reel hoặc các định dạng nội dung khác.",
      "Quy trình cung ứng dịch vụ",
      "Bước",
      "Tên bước",
      "Mô tả công việc",
      "1",
      "Ký Hợp đồng ",
      "dịch vụ ",
      "Hai Bên ký Hợp đồng dịch vụ làm cơ sở pháp lý điều chỉnh toàn bộ hoạt động hợp tác.",
      "2",
      "Yêu cầu dịch vụ",
      "Bên A gửi brief/yêu cầu cung ứng dịch vụ, bao gồm: thông tin chiến dịch, sản phẩm/dịch vụ, nội dung quảng bá, nền tảng triển khai, timeline và các yêu cầu liên quan.",
      "4",
      "Dựng kịch bản",
      "Bên B xây dựng kịch bản và nội dung video dựa trên brief của Bên A và gửi Bên A phê duyệt trước khi sản xuất.",
      "5",
      "Duyệt kịch bản",
      "Bên A xem xét, phản hồi và yêu cầu chỉnh sửa (nếu có).",
      "Tối đa 01 vòng chỉnh sửa trước khi duyệt cuối cùng.",
      "6",
      "Sản xuất video",
      "Bên B tiến hành quay dựng, chỉnh lý, biên tập, hậu kỳ video theo kịch bản đã thống nhất.",
      "7",
      "Duyệt video",
      "Bên A xem xét, phản hồi và yêu cầu chỉnh sửa (nếu có). ",
      "Tối đa 01 vòng chỉnh sửa trước khi duyệt cuối cùng.",
      "8",
      "Đăng tải video",
      "Bên B đăng tải nội dung theo đúng nội dung đã duyệt, đúng tài khoản và timeline.",
      "9",
      "Ghi nhận ",
      "kết quả",
      "Ghi nhận các chỉ số: lượt xem, tương tác, đơn hàng, GMV… theo dữ liệu từ nền tảng.",
      "10",
      "Nghiệm thu",
      "Bên A kiểm tra việc thực hiện dịch vụ theo Hợp đồng này.",
      "11",
      "Thanh toán phí Booking",
      "Bên A thực hiện thanh toán phí booking theo Hợp đồng này.",
      "12",
      "Đối soát Affiliate",
      "(nếu có)",
      "Hoa hồng Affiliate do nền tảng chi trả trực tiếp cho Bên B theo dữ liệu hệ thống.",
      "",
      "2.3. Tiêu chuẩn nghiệm thu dịch vụ ",
      "Tiêu chuẩn về nội dung và đăng tải",
      "Video phải tuân thủ đầy đủ kịch bản, thông điệp và guideline do Bên A cung cấp; ",
      "Bao gồm đầy đủ các yếu tố yêu cầu (nếu có): link, giỏ hàng, mã theo dõi, hashtag, CTA…; ",
      "Chỉ được đăng tải sau khi có phê duyệt nội dung từ Bên A; ",
      "Đăng tải đúng tài khoản, đúng thời điểm và duy trì hiển thị, không được xóa video sau khi đăng tải mà không có sự chấp thuận hoặc yêu cầu của Bên A; ",
      "Nếu video bị ẩn, xóa, tắt âm thanh… hoặc các lỗi tương đương ảnh hưởng đến việc hiển thị bình thường của video trên nền tảng thì Bên B có nghĩa vụ phải chỉnh lý, đăng tải lại video đã khắc phục lỗi.",
      "Không vi phạm pháp luật, chính sách nền tảng hoặc gây ảnh hưởng tiêu cực đến hình ảnh thương hiệu. ",
      "Tiêu chuẩn về kịch bản và sản xuất",
      "Kịch bản phải được Bên A phê duyệt bằng email/tin nhắn/văn bản trước khi quay dựng; ",
      "Mọi chi phí phát sinh do sản xuất khi chưa có phê duyệt hợp lệ do Bên B tự chi trả; ",
      "Cảnh quay, bố cục và thông điệp phải phù hợp với kịch bản đã duyệt; ",
      "Trường hợp sai lệch, Bên A có quyền từ chối nghiệm thu và yêu cầu chỉnh sửa hoặc quay lại mà không phát sinh chi phí. ",
      "Tiêu chuẩn về chất lượng và hậu kỳ",
      "Video phải được dựng và hoàn thiện theo tiêu chuẩn đã thống nhất (video mẫu, guideline thương hiệu); ",
      "Bên B có trách nhiệm chỉnh sửa theo yêu cầu hợp lý của Bên A cho đến khi đạt tiêu chuẩn nghiệm thu.",
      "Tiêu chuẩn về hình ảnh và nhận diện",
      "Bên B phải kiểm soát trang phục, bối cảnh, nhận diện cá nhân và các yếu tố hình ảnh khác nhằm không được gây trùng lặp, xung đột hoặc ảnh hưởng tiêu cực đến hiệu quả truyền thông của Bên A;",
      "Trường hợp vi phạm, Bên B phải chỉnh sửa, thay thế hoặc quay lại nội dung cho đến khi đạt yêu cầu, không làm ảnh hưởng tiến độ cam kết. ",
      "Áp dụng đối với dịch vụ khác: tiêu chuẩn nghiệm thu được áp dụng theo quy định cụ thể tại mô tả dịch vụ (nếu có).",
      "",
      "ĐIỀU 3: PHÍ DỊCH VỤ VÀ THANH TOÁN",
      "Phí dịch vụ booking",
      "STT",
      "Hạng mục ",
      "Đơn giá",
      "(VNĐ)",
      "Số lượng",
      "Thành tiền",
      "1",
      "Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….",
      "Tài khoản đăng tải – link: ",
      "Thời gian đăng tải:",
      "Thời lượng video:",
      "Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)",
      "Cấp mã code để chạy quảng cáo trong… ngày",
      "Bàn giao video gốc",
      "Yêu cầu key cần bổ sung nếu có",
      "",
      "",
      "",
      "2",
      "Sử dụng hình ảnh trong … ngày từ ngày ….",
      "",
      "",
      "",
      "3",
      "Tham dự sự kiện trong thời gian … tiếng ngày….",
      "",
      "",
      "",
      "4",
      "Đăng 1 post trên Facebook ….",
      "",
      "",
      "",
      "Tổng Giá trị hợp đồng chưa bao gồm thuế TNCN ",
      "(số tiền Bên B thực nhận)",
      "",
      "Thuế TNCN (Bên A có nghĩa vụ trích nộp)",
      "",
      "Tổng Giá trị hợp đồng đã bao gồm thuế TNCN",
      "",
      "",
      "Thỏa thuận Hoa hồng Affiliate (nếu áp dụng)",
      "Hoa hồng affiliate gồm hai loại như sau:",
      "Hoa hồng organic: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh tự nhiên từ video, được ghi nhận thông qua link/mã theo dõi của Bên B và không bao gồm doanh thu phát sinh từ ngân sách quảng cáo do Bên A hoặc bên thứ ba chi trả. ",
      "Hoa hồng chạy ads: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh từ video được sử dụng để chạy quảng cáo, với điều kiện doanh thu đó được ghi nhận thông qua link/mã theo dõi của Bên B và được Bên A xác nhận trong báo cáo đối soát.",
      "Doanh thu làm căn cứ tính hoa hồng là doanh thu đã hoàn tất (không bao gồm đơn hủy, hoàn trả hoặc gian lận), theo dữ liệu của nền tảng và/hoặc hệ thống của Bên A; ",
      "Hoa hồng affiliate do nền tảng chi trả trực tiếp cho Bên B. Bên B tự chịu trách nhiệm kê khai, khấu trừ và nộp các loại thuế, phí liên quan đến khoản thu nhập từ hoa hồng affiliate theo quy định pháp luật.     ",
      " Hình thức thanh toán",
      "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
      "Tên chủ tài khoản: ",
      "Số tài khoản: ",
      "Tại Ngân hàng: ",
      " Thời hạn thanh toán",
      "Thanh toán 1 lần",
      "Phí dịch vụ được thanh toán 1 lần trong vòng 7 - 10 ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) sau khi Bên B hoàn thành dịch vụ và hai bên đã hoàn tất việc ký kết Hợp đồng này (Bên A đã nhận được Hợp đồng có chữ ký của hai bên).",
      "Thanh toán 2 lần",
      "Phí dịch vụ được thanh toán làm 2 lần:",
      "Lần 1 tạm ứng … trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm hai bên ký kết hợp đồng này.",
      "Lần 2 thanh toán số tiền còn lại trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm Bên B hoàn thành dịch vụ và Bên A đã nhận được Hợp đồng, Biên bản nghiệm thu dịch vụ có chữ ký của hai bên.",
      "",
      "",
      "ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A",
      "4.1. Quyền của Bên A",
      "Quyền kiểm tra, giám sát: Bên A có quyền kiểm tra và giám sát Bên B thực hiện công việc đúng nội dung, chất lượng, tiến độ theo Hợp đồng; có quyền phê duyệt hoặc đưa ra ý kiến trong thời gian hợp lý đối với các nội dung, đề xuất của Bên B.",
      "Quyền chỉnh sửa kịch bản: Bên A có quyền kiểm tra và yêu cầu Bên B chỉnh sửa nội dung kịch bản trước khi sản xuất/trước khi đăng tải trong trường hợp nội dung chưa phù hợp với yêu cầu đã thống nhất.",
      "Quyền chỉnh sửa sản phẩm: Trường hợp nội dung video/bài đăng do Bên B đăng tải không đúng với nội dung đã được hai Bên thống nhất, Bên A có quyền yêu cầu Bên B chỉnh sửa, gỡ bỏ hoặc thay thế ngay nội dung đã đăng tải sai.",
      "4.2. Nghĩa vụ của Bên A",
      "Thanh toán đầy đủ và đúng hạn Phí Booking cho Bên B theo Hợp đồng;",
      "Cung cấp đầy đủ, kịp thời các thông tin, tài liệu, sản phẩm mẫu và phối hợp với Bên B để triển khai dịch vụ theo Hợp đồng;",
      "Không sử dụng hình ảnh, nội dung hoặc danh tiếng của Bên B theo cách gây ảnh hưởng tiêu cực đến uy tín hoặc hình ảnh cá nhân của Bên B.",
      "",
      "ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B",
      "5.1.   Quyền của Bên B",
      "Yêu cầu Bên A cung cấp đầy đủ thông tin, tài liệu, sản phẩm mẫu, guideline, chính sách thương hiệu và các dữ liệu cần thiết để thực hiện dịch vụ; ",
      "Yêu cầu Bên A phối hợp phản hồi, xác nhận nội dung, kế hoạch triển khai; ",
      "Được sử dụng tên thương mại, nhãn hiệu, hình ảnh sản phẩm của Bên A trong phạm vi cần thiết để thực hiện dịch vụ theo Hợp đồng.",
      " Nghĩa vụ của Bên B",
      "Nghĩa vụ thực hiện dịch vụ: Thực hiện công việc đúng nội dung, chất lượng, số lượng, thời hạn, nền tảng theo Hợp đồng đã ký kết; không được chuyển giao, ủy quyền cho bên thứ ba thực hiện công việc; chủ động thông báo kịp thời cho Bên A về bất kỳ sự kiện nào có thể ảnh hưởng đến việc thực hiện dịch vụ.",
      "Nghĩa vụ duy trì nội dung đã đăng tải:",
      "Bên B không được tự ý xóa, ẩn hoặc hạn chế hiển thị đối với nội dung (bao gồm video, bài đăng) đã đăng tải theo Hợp đồng. Trong trường hợp nội dung phát sinh lỗi kỹ thuật do nền tảng (bao gồm nhưng không giới hạn: mất tiếng, lỗi hình ảnh, lỗi hiển thị hoặc các sự cố tương tự), Bên B có nghĩa vụ phối hợp với Bên A để khắc phục và đăng tải lại nội dung trong thời gian sớm nhất theo yêu cầu của Bên A.",
      "Nghĩa vụ về nội dung và trách nhiệm quảng cáo: Bên B là người chuyển tải sản phẩm quảng cáo theo quy định pháp luật và cam kết tuân thủ quy định tại Luật Quảng cáo, Luật Bảo vệ quyền lợi người tiêu dùng hiện hành cũng như quy định của sàn TMĐT.",
      "Nghĩa vụ tư vấn nội dung: Bên B có nghĩa vụ tư vấn, đề xuất nội dung, thông điệp và định hướng triển khai phù hợp với đặc thù nền tảng, hành vi người dùng, mục tiêu chiến dịch… nhằm tối ưu hiệu quả truyền thông.",
      "Nghĩa vụ bảo vệ hình ảnh và uy tín nhãn hiệu: Bên B cam kết bảo vệ hình ảnh, uy tín của nhãn hiệu và Bên A bằng việc không thực hiện bất kỳ hành vi, phát ngôn hoặc đăng tải nội dung nào gây ảnh hưởng tiêu cực, gây hiểu nhầm hoặc chưa được kiểm chứng liên quan đến Bên A hoặc sản phẩm/dịch vụ, cũng như không sử dụng ngôn từ, hình ảnh phản cảm, vi phạm pháp luật hoặc không phù hợp với định vị thương hiệu của Bên A; các nghĩa vụ này áp dụng trong suốt thời gian thực hiện Hợp đồng và kéo dài ít nhất 06 tháng sau khi chấm dứt việc hợp tác với nhãn hàng.",
      "Nghĩa vụ bảo vệ hình ảnh và uy tín cá nhân: Bên B cam kết duy trì danh tiếng cá nhân, không để xảy ra các sự kiện, hành vi hoặc phát ngôn có thể gây scandal, tranh cãi hoặc ảnh hưởng trực tiếp hoặc gián tiếp đến uy tín của Bên A; trong trường hợp phát sinh sự kiện có nguy cơ ảnh hưởng tiêu cực, Bên B phải thông báo kịp thời và phối hợp với Bên A để xử lý phù hợp.",
      "",
      "ĐIỂU 6: PHẠT VI PHẠM, BỒI THƯỜNG THIỆT HẠI",
      "6.1. Vi phạm của Bên A",
      "Chậm thanh toán: Trừ trường hợp bất khả kháng hoặc do lỗi của Bên B, nếu Bên A chậm thanh toán quá 30 (ba mươi) ngày so với thời hạn đã thỏa thuận (thời hạn thanh toán được tính từ thời điểm Bên B hoàn tất chứng từ thanh toán), Bên A phải trả lãi chậm thanh toán với mức lãi suất 8%/năm trên số tiền chậm trả, tính theo số ngày chậm thanh toán.",
      "6.2. Vi phạm của Bên B",
      "Vi phạm tiến độ thực hiện: Trường hợp Bên B không thực hiện đúng tiến độ theo Hợp đồng mà không do lỗi của Bên A hoặc yếu tố khách quan, Bên A sẽ gia hạn để Bên B khắc phục kịp thời theo tiến độ của dự án. Nếu Bên B không khắc phục trong vòng 3 – 5 ngày hoặc xong trước deadline cuối của dự án, Bên B phải chịu phạt tương đương 1% giá trị phí dịch vụ của hạng mục công việc bị vi phạm cho mỗi ngày chậm, tổng mức phạt không vượt quá 8% giá trị hạng mục đó hoặc Bên A có quyền không nghiệm thu và không trả phí cho hạng mục công việc hoàn thành muộn.",
      "Vi phạm nghĩa vụ về về nội dung và trách nhiệm quảng cáo: Bên A có quyền yêu cầu Bên B gỡ bỏ, chỉnh sửa nội dung và chịu mọi trách nhiệm phát sinh; đồng thời Bên A có quyền giảm trừ hoặc không thanh toán phần Phí Dịch vụ liên quan đến nội dung vi phạm pháp luật hoặc đơn phương chấm dứt Hợp đồng tùy theo mức độ nghiêm trọng của sự việc. ",
      "Vi phạm nghĩa vụ bảo vệ hình ảnh, uy tín và danh tiếng thương hiệu và danh tiếng cá nhân của Bên B: Bên A có quyền đơn phương chấm dứt Hợp đồng, từ chối thanh toán phần phí dịch vụ liên quan đến sai phạm và yêu cầu Bên B thực hiện các biện pháp khắc phục (bao gồm đính chính, gỡ bỏ nội dung nếu có).",
      "6.3. Bồi thường thiệt hại",
      "Bên nào vi phạm nghĩa vụ theo Hợp đồng gây thiệt hại cho Bên còn lại thì phải bồi thường toàn bộ thiệt hại thực tế, trực tiếp phát sinh theo quy định của pháp luật.",
      "ĐIỀU 7: HIỆU LỰC VÀ CHẤM DỨT HỢP ĐỒNG ",
      "7.1. Hiệu lực: Hợp đồng có hiệu lực trong thời hạn 01 (một) năm kể từ ngày ký hoặc đến thời điểm Hai Bên hoàn tất nghiệm thu, thanh lý Hợp đồng theo quy định tại Hợp đồng này, tùy thời điểm nào đến trước.",
      "7.2. Các trường hợp chấm dứt hợp đồng",
      "Hai bên cùng thỏa thuận chấm dứt Hợp đồng",
      "Bên A có quyền đơn phương chấm dứt Hợp đồng theo mục c, d khoản 6.2, Điều 6 của Hợp đồng này.",
      "Bên B có quyền đơn phương chấm dứt Hợp đồng nếu Bên A vi phạm nghĩa vụ thanh toán quá 30 ngày.",
      "7.3. Thanh lý Hợp đồng",
      "Hai Bên bắt buộc ký Biên bản nghiệm thu và/hoặc Biên bản thanh lý trong các trường hợp sau:",
      "Giá trị nghiệm thu hoặc thanh toán thực tế từ 20.000.000 đồng trở lên; hoặc",
      "Giá trị nghiệm thu/thanh toán thực tế dưới 20.000.000 đồng nhưng khác với giá trị Hợp đồng đã ký kết.",
      "Hợp đồng được tự động nghiệm thu và thanh lý mà không cần ký Biên bản nghiệm thu hoặc Biên bản thanh lý khi đồng thời đáp ứng đầy đủ các điều kiện sau:",
      "Giá trị Hợp đồng dưới 20.000.000 đồng;",
      "Giá trị nghiệm thu thực tế và giá trị thanh toán thực tế đúng bằng giá trị Hợp đồng;",
      "Hai Bên đã hoàn tất toàn bộ quyền và nghĩa vụ theo Hợp đồng.",
      "Thời điểm đáp ứng đầy đủ các điều kiện tự động nghiệm thu và thanh lý được xem là thời điểm Hợp đồng được nghiệm thu, thanh lý và chấm dứt hiệu lực.",
      "ĐIỀU 8: BẢO MẬT THÔNG TIN",
      "Trong quá trình thực hiện Hợp đồng và sau khi Hợp đồng chấm dứt, mỗi Bên (sau đây gọi là “Bên Nhận Thông Tin”) có nghĩa vụ bảo mật tuyệt đối đối với mọi thông tin, tài liệu do Bên còn lại (“Bên Tiết Lộ”) cung cấp hoặc phát sinh liên quan đến việc thực hiện Hợp đồng, bao gồm nhưng không giới hạn các điều khoản Hợp đồng, dữ liệu, tài liệu, kế hoạch kinh doanh, thông tin tài chính, chiến lược marketing, bí mật kinh doanh và các thông tin có tính chất bảo mật khác (“Thông Tin Mật”); theo đó, Bên Nhận Thông Tin không được tiết lộ, công bố hoặc sử dụng Thông Tin Mật cho bất kỳ mục đích nào ngoài việc thực hiện Hợp đồng nếu không có sự chấp thuận trước bằng văn bản của Bên Tiết Lộ.",
      "Bên vi phạm phải chịu trách nhiệm bồi thường toàn bộ thiệt hại phát sinh cho Bên còn lại và các bên liên quan (nếu có).",
      "Thời hạn bảo mật: Nghĩa vụ bảo mật tiếp tục có hiệu lực sau khi Hợp Đồng chấm dứt hoặc hết hạn, cho đến khi Thông Tin Bảo Mật trở thành thông tin công khai hợp pháp.",
      "ĐIỀU 9: BẤT KHẢ KHÁNG",
      "Một Bên sẽ không bị xem là vi phạm Hợp Đồng nếu việc chậm trễ hoặc không thực hiện nghĩa vụ do sự kiện khách quan, không thể lường trước và không thể khắc phục mặc dù đã áp dụng mọi biện pháp cần thiết (“Sự Kiện Bất Khả Kháng”), bao gồm nhưng không giới hạn: thiên tai, hỏa hoạn, chiến tranh, bạo loạn, đình công, dịch bệnh, hoặc các quyết định, hạn chế của cơ quan nhà nước có thẩm quyền. Bên bị ảnh hưởng phải thông báo bằng văn bản cho Bên còn lại trong vòng 03 ngày làm việc kể từ khi xảy ra sự kiện, nêu rõ bản chất sự kiện, phạm vi ảnh hưởng và thời gian dự kiến khắc phục.",
      "ĐIỀU 10: ĐIỀU KHOẢN CHUNG",
      "Luật áp dụng: Hợp Đồng này được điều chỉnh và giải thích theo pháp luật Việt Nam.",
      "Giải quyết tranh chấp: Mọi tranh chấp phát sinh từ hoặc liên quan đến Hợp Đồng sẽ được ưu tiên giải quyết thông qua thương lượng, hòa giải giữa các Bên. Nếu tranh chấp không được giải quyết trong vòng 30 (ba mươi) ngày kể từ ngày một Bên thông báo bằng văn bản về tranh chấp, tranh chấp sẽ được đưa ra Tòa án có thẩm quyền tại Việt Nam để giải quyết.",
      "Hợp đồng này được lập thành 02 bản, mỗi Bên giữ 01 bản, có giá trị pháp lý như nhau.",
      "",
      "ĐẠI DIỆN BÊN A",
      "ĐẠI DIỆN BÊN B",
      "",
      "",
      "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
      "http://www.upbase.asia",
      "Trang 1 ",
      "",
      "",
      "",
      "",
      "BM.HĐ.VID.IND.Ver052026",
      ""
    ],
    "blocks": [
      {
        "kind": "p",
        "part": "word/header1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/header1.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header1.xml",
                  "paragraph": 1,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header1.xml",
                  "paragraph": 2,
                  "text": "BM.HĐ.VID.IND.Ver052026",
                  "align": "right"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/header1.xml",
        "paragraph": 3,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 0,
        "text": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 1,
        "text": "Độc lập – Tự do – Hạnh phúc",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 2,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 3,
        "text": "HỢP ĐỒNG DỊCH VỤ BOOKING VIDEO",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 4,
        "text": "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "align": "center",
        "boldPrefix": 4
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 5,
        "text": "Căn cứ: ",
        "bold": true,
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 6,
        "text": "Bộ luật Dân sự số 91/2015/QH13, có hiệu lực từ ngày 01/01/2017;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 7,
        "text": "Luật Thương mại số 36/2005/QH11, có hiệu lực từ ngày 01/01/2006;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 8,
        "text": "Luật Thương mại điện tử số 122/2025/QH15, có hiệu lực từ ngày 01/07/2026;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 9,
        "text": "Nghị định số 147/2024/NĐ-CP về quản lý, cung cấp và sử dụng dịch vụ Internet và thông tin trên mạng, có hiệu lực từ ngày 25/12/2024; ",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 10,
        "text": "Luật Quảng cáo số 16/2012/QH13 có hiệu lực từ ngày 01/01/2013;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 11,
        "text": "Luật sửa đổi, bổ sung một số điều của Luật Quảng cáo số 75/2025/QH15, có hiệu lực từ ngày 01/01/2026;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 12,
        "text": "Luật Sở hữu Trí tuệ số 50/2005/QH11, có hiệu lực từ ngày 01/07/2006;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 13,
        "text": "Luật Sửa đổi bổ sung một số điều của Luật Sở hữu Trí tuệ số 131/2025/QH15, có hiệu lực từ ngày 01/04/2026;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 14,
        "text": "Nhu cầu và khả năng của hai Bên.",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 15,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 16,
        "text": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 17,
        "text": "",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 18,
                  "text": "BÊN SỬ DỤNG DỊCH VỤ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 4
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 19,
                  "text": "BÊN A",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 20,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 21,
                  "text": "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 22,
                  "text": "Mã số thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 23,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 24,
                  "text": "0109361325",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 25,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 26,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 27,
                  "text": "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 28,
                  "text": "Người đại diện",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 29,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 30,
                  "text": "Ông Đỗ Văn Giang   ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 31,
                  "text": "Sau đây gọi tắt là “Bên A”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 32,
                  "text": "",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                },
                {
                  "kind": "table",
                  "part": "word/document.xml",
                  "variant": "party",
                  "rows": [
                    [
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 33,
                            "text": "BÊN CUNG ỨNG DỊCH VỤ ",
                            "align": "justify",
                            "bold": true
                          }
                        ],
                        "colSpan": 4
                      }
                    ],
                    [
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 34,
                            "text": "BÊN B",
                            "align": "justify",
                            "bold": true
                          }
                        ]
                      },
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 35,
                            "text": ":",
                            "align": "justify"
                          }
                        ]
                      },
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 36,
                            "text": "",
                            "align": "justify",
                            "bold": true
                          }
                        ],
                        "colSpan": 2
                      }
                    ],
                    [
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 37,
                            "text": "CCCD",
                            "align": "justify",
                            "bold": true
                          }
                        ]
                      },
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 38,
                            "text": ":",
                            "align": "justify"
                          }
                        ]
                      },
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 39,
                            "text": "",
                            "align": "justify"
                          }
                        ],
                        "colSpan": 2
                      }
                    ],
                    [
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 40,
                            "text": "Địa chỉ",
                            "align": "justify",
                            "bold": true
                          }
                        ]
                      },
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 41,
                            "text": ":",
                            "align": "justify"
                          }
                        ]
                      },
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 42,
                            "text": "",
                            "align": "justify"
                          }
                        ],
                        "colSpan": 2
                      }
                    ],
                    [
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 43,
                            "text": "Số điện thoại",
                            "align": "justify",
                            "bold": true
                          }
                        ]
                      },
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 44,
                            "text": ":",
                            "align": "justify"
                          }
                        ]
                      },
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 45,
                            "text": "",
                            "align": "justify"
                          }
                        ],
                        "colSpan": 2
                      }
                    ],
                    [
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 46,
                            "text": "Email",
                            "align": "justify",
                            "bold": true
                          }
                        ]
                      },
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 47,
                            "text": ":",
                            "align": "justify"
                          }
                        ]
                      },
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 48,
                            "text": "",
                            "align": "justify"
                          }
                        ],
                        "colSpan": 2
                      }
                    ],
                    [
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 49,
                            "text": "Sau đây gọi tắt là “Bên B”",
                            "align": "justify",
                            "bold": true,
                            "italic": true
                          }
                        ],
                        "colSpan": 3
                      },
                      {
                        "blocks": [
                          {
                            "kind": "p",
                            "part": "word/document.xml",
                            "paragraph": 50,
                            "text": "",
                            "align": "justify",
                            "bold": true
                          }
                        ]
                      }
                    ]
                  ]
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 51,
                  "text": "",
                  "align": "justify"
                }
              ],
              "colSpan": 3
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 52,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 53,
        "text": "Bên A có nhu cầu triển khai các hoạt động quảng bá sản phẩm thông qua các KOL/KOC trên các nền tảng truyền thông. Hai bên cùng hợp tác ký kết hợp đồng dịch vụ nhằm quảng cáo, tiếp thị, thúc đẩy doanh số kinh doanh với các điều khoản như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 54,
        "text": "ĐIỀU 1: ĐỊNH NGHĨA",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 55,
                  "text": "Khái niệm",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 56,
                  "text": "Định nghĩa",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 57,
                  "text": "Tài khoản mạng xã hội",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 58,
                  "text": "Là tài khoản mạng xã hội có link: …"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 59,
                  "text": "Bên B là chủ sở hữu hợp pháp và có toàn quyền quản lý, vận hành tài khoản mạng xã hội trong suốt thời gian thực hiện Hợp đồng. ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 60,
                  "text": "Tiếp thị ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 61,
                  "text": "liên kết ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 62,
                  "text": "(Affiliate)",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 63,
                  "text": "Là việc Bên B quảng bá sản phẩm/dịch vụ thông qua cơ chế của nền tảng thương mại điện tử (sàn TMĐT) (bao gồm link, mã, giỏ hàng hoặc công cụ tương đương), trong đó doanh thu chỉ được ghi nhận khi được hệ thống nền tảng xác nhận. Hoa hồng và doanh thu được xác định theo dữ liệu cuối cùng từ nền tảng và có thể bị điều chỉnh trong trường hợp hoàn đơn, gian lận hoặc vi phạm chính sách.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 64,
                  "text": "Booking video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 65,
                  "text": "Booking video là việc Bên A thuê Bên B sản xuất và đăng tải Video theo các yêu cầu cụ thể của Bên A, có nội dung review, đánh giá, giới thiệu, quảng bá sản phẩm và thúc đẩy doanh số bán hàng (có thể bao gồm các cơ chế như gắn link, mã, giỏ hàng hoặc kêu gọi hành động). ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 66,
                  "text": "Phí dịch vụ booking",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 67,
                  "text": "Phí dịch vụ booking là khoản phí cố định Bên A thanh toán cho Bên B theo Hợp đồng.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 68,
                  "text": "Hoa hồng",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 69,
                  "text": "Là khoản thu nhập của Bên B dựa trên doanh thu Affiliate hợp lệ được nền tảng chi trả. Bên B tự chịu trách nhiệm kê khai, nộp thuế và các nghĩa vụ tài chính liên quan đến khoản hoa hồng này theo quy định pháp luật (nếu áp dụng).",
                  "align": "justify"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 70,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 71,
        "text": "ĐIỀU 2: PHẠM VI CÔNG VIỆC",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 72,
        "text": " Phạm vi công việc cần thực hiện",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 73,
        "text": "Bên B thực hiện sản xuất và đăng tải video trên các nền tảng mạng xã hội.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 74,
        "text": "Phạm vi công việc mở rộng:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 75,
        "text": "Gắn công cụ bán hàng: Gắn link, giỏ hàng, mã theo dõi, mã giảm giá, hashtag, CTA …; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 76,
        "text": "Hỗ trợ quảng cáo: Cho phép Bên A hoặc bên thứ ba do Bên A chỉ định sử dụng nội dung video để chạy quảng cáo, chia sẻ mã quảng cáo, …; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 77,
        "text": "Sử dụng hình ảnh:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 78,
        "text": "Bên A có quyền sử dụng, khai thác, chỉnh sửa kỹ thuật, resize, cắt ghép định dạng, biên tập, chuyển thể, lồng ghép, tái sử dụng và phân phối lại hình ảnh, video, nội dung do Bên B thực hiện để phục vụ hoạt động truyền thông, quảng bá và thương mại cho nhãn hàng/sản phẩm theo phạm vi đã thỏa thuận tại Hợp đồng.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 79,
        "text": "Bên A được quyền đăng tải lại video trên kênh chính thức của nhãn hàng; sử dụng hình ảnh/video làm banner, hình ảnh trưng bày trên gian hàng TMĐT, website, landing page, nền tảng số hoặc các kênh truyền thông khác của nhãn hàng; đồng thời được quyền cho phép các KOC/KOL/người dùng khác duet, stitch, chia sẻ hoặc sử dụng lại nội dung nhằm phục vụ hoạt động quảng bá chiến dịch trong phạm vi đã thỏa thuận.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 80,
        "text": "Bên A được quyền sử dụng hình ảnh, giọng nói, tên, hình tượng và các yếu tố nhận diện của Bên B/KOL xuất hiện trong nội dung nhằm phục vụ hoạt động quảng cáo, truyền thông và thương mại cho nhãn hàng/sản phẩm theo phạm vi sử dụng đã thỏa thuận.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 81,
        "text": "Phạm vi sử dụng bao gồm nhưng không giới hạn tại: website, landing page, sàn thương mại điện tử, Facebook, TikTok, Instagram, YouTube và các nền tảng số khác của nhãn hàng.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 82,
        "text": "Nội dung được phép sử dụng trong các hoạt động digital marketing, social seeding, PR, media booking, livestream, affiliate marketing, e-commerce campaign và các hoạt động quảng bá sản phẩm/nhãn hàng khác theo nhu cầu truyền thông thực tế của Bên A.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 83,
        "text": "Tham gia hoạt động truyền thông và sự kiện: Tham gia event …; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 84,
        "text": "Triển khai các định dạng nội dung khác: Thực hiện các bài đăng ngoài video như hình ảnh, carousel, bài viết, caption, story, reel hoặc các định dạng nội dung khác.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 85,
        "text": "Quy trình cung ứng dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 86,
                  "text": "Bước",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 87,
                  "text": "Tên bước",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 88,
                  "text": "Mô tả công việc",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 89,
                  "text": "1",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 90,
                  "text": "Ký Hợp đồng ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 91,
                  "text": "dịch vụ ",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 92,
                  "text": "Hai Bên ký Hợp đồng dịch vụ làm cơ sở pháp lý điều chỉnh toàn bộ hoạt động hợp tác.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 93,
                  "text": "2",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 94,
                  "text": "Yêu cầu dịch vụ",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 95,
                  "text": "Bên A gửi brief/yêu cầu cung ứng dịch vụ, bao gồm: thông tin chiến dịch, sản phẩm/dịch vụ, nội dung quảng bá, nền tảng triển khai, timeline và các yêu cầu liên quan.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 96,
                  "text": "4",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 97,
                  "text": "Dựng kịch bản",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 98,
                  "text": "Bên B xây dựng kịch bản và nội dung video dựa trên brief của Bên A và gửi Bên A phê duyệt trước khi sản xuất.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 99,
                  "text": "5",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 100,
                  "text": "Duyệt kịch bản",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 101,
                  "text": "Bên A xem xét, phản hồi và yêu cầu chỉnh sửa (nếu có).",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 102,
                  "text": "Tối đa 01 vòng chỉnh sửa trước khi duyệt cuối cùng.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 103,
                  "text": "6",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 104,
                  "text": "Sản xuất video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 105,
                  "text": "Bên B tiến hành quay dựng, chỉnh lý, biên tập, hậu kỳ video theo kịch bản đã thống nhất.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 106,
                  "text": "7",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 107,
                  "text": "Duyệt video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 108,
                  "text": "Bên A xem xét, phản hồi và yêu cầu chỉnh sửa (nếu có). ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 109,
                  "text": "Tối đa 01 vòng chỉnh sửa trước khi duyệt cuối cùng.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 110,
                  "text": "8",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 111,
                  "text": "Đăng tải video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 112,
                  "text": "Bên B đăng tải nội dung theo đúng nội dung đã duyệt, đúng tài khoản và timeline.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 113,
                  "text": "9",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 114,
                  "text": "Ghi nhận ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 115,
                  "text": "kết quả",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 116,
                  "text": "Ghi nhận các chỉ số: lượt xem, tương tác, đơn hàng, GMV… theo dữ liệu từ nền tảng.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 117,
                  "text": "10",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 118,
                  "text": "Nghiệm thu",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 119,
                  "text": "Bên A kiểm tra việc thực hiện dịch vụ theo Hợp đồng này.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 120,
                  "text": "11",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 121,
                  "text": "Thanh toán phí Booking",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 122,
                  "text": "Bên A thực hiện thanh toán phí booking theo Hợp đồng này.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 123,
                  "text": "12",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 124,
                  "text": "Đối soát Affiliate",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 125,
                  "text": "(nếu có)",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 126,
                  "text": "Hoa hồng Affiliate do nền tảng chi trả trực tiếp cho Bên B theo dữ liệu hệ thống.",
                  "align": "justify"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 127,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 128,
        "text": "2.3. Tiêu chuẩn nghiệm thu dịch vụ ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 129,
        "text": "Tiêu chuẩn về nội dung và đăng tải",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 130,
        "text": "Video phải tuân thủ đầy đủ kịch bản, thông điệp và guideline do Bên A cung cấp; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 131,
        "text": "Bao gồm đầy đủ các yếu tố yêu cầu (nếu có): link, giỏ hàng, mã theo dõi, hashtag, CTA…; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 132,
        "text": "Chỉ được đăng tải sau khi có phê duyệt nội dung từ Bên A; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 133,
        "text": "Đăng tải đúng tài khoản, đúng thời điểm và duy trì hiển thị, không được xóa video sau khi đăng tải mà không có sự chấp thuận hoặc yêu cầu của Bên A; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 134,
        "text": "Nếu video bị ẩn, xóa, tắt âm thanh… hoặc các lỗi tương đương ảnh hưởng đến việc hiển thị bình thường của video trên nền tảng thì Bên B có nghĩa vụ phải chỉnh lý, đăng tải lại video đã khắc phục lỗi.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 135,
        "text": "Không vi phạm pháp luật, chính sách nền tảng hoặc gây ảnh hưởng tiêu cực đến hình ảnh thương hiệu. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 136,
        "text": "Tiêu chuẩn về kịch bản và sản xuất",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 137,
        "text": "Kịch bản phải được Bên A phê duyệt bằng email/tin nhắn/văn bản trước khi quay dựng; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 138,
        "text": "Mọi chi phí phát sinh do sản xuất khi chưa có phê duyệt hợp lệ do Bên B tự chi trả; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 139,
        "text": "Cảnh quay, bố cục và thông điệp phải phù hợp với kịch bản đã duyệt; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 140,
        "text": "Trường hợp sai lệch, Bên A có quyền từ chối nghiệm thu và yêu cầu chỉnh sửa hoặc quay lại mà không phát sinh chi phí. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 141,
        "text": "Tiêu chuẩn về chất lượng và hậu kỳ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 142,
        "text": "Video phải được dựng và hoàn thiện theo tiêu chuẩn đã thống nhất (video mẫu, guideline thương hiệu); ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 143,
        "text": "Bên B có trách nhiệm chỉnh sửa theo yêu cầu hợp lý của Bên A cho đến khi đạt tiêu chuẩn nghiệm thu.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 144,
        "text": "Tiêu chuẩn về hình ảnh và nhận diện",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 145,
        "text": "Bên B phải kiểm soát trang phục, bối cảnh, nhận diện cá nhân và các yếu tố hình ảnh khác nhằm không được gây trùng lặp, xung đột hoặc ảnh hưởng tiêu cực đến hiệu quả truyền thông của Bên A;",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 146,
        "text": "Trường hợp vi phạm, Bên B phải chỉnh sửa, thay thế hoặc quay lại nội dung cho đến khi đạt yêu cầu, không làm ảnh hưởng tiến độ cam kết. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 147,
        "text": "Áp dụng đối với dịch vụ khác: tiêu chuẩn nghiệm thu được áp dụng theo quy định cụ thể tại mô tả dịch vụ (nếu có).",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 148,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 149,
        "text": "ĐIỀU 3: PHÍ DỊCH VỤ VÀ THANH TOÁN",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 150,
        "text": "Phí dịch vụ booking",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 151,
                  "text": "STT",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 152,
                  "text": "Hạng mục ",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 153,
                  "text": "Đơn giá",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 154,
                  "text": "(VNĐ)",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 155,
                  "text": "Số lượng",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 156,
                  "text": "Thành tiền",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 157,
                  "text": "1",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 158,
                  "text": "Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 159,
                  "text": "Tài khoản đăng tải – link: ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 160,
                  "text": "Thời gian đăng tải:",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 161,
                  "text": "Thời lượng video:",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 162,
                  "text": "Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 163,
                  "text": "Cấp mã code để chạy quảng cáo trong… ngày",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 164,
                  "text": "Bàn giao video gốc",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 165,
                  "text": "Yêu cầu key cần bổ sung nếu có",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 166,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 167,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 168,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 169,
                  "text": "2",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 170,
                  "text": "Sử dụng hình ảnh trong … ngày từ ngày ….",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 171,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 172,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 173,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 174,
                  "text": "3",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 175,
                  "text": "Tham dự sự kiện trong thời gian … tiếng ngày….",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 176,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 177,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 178,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 179,
                  "text": "4",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 180,
                  "text": "Đăng 1 post trên Facebook ….",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 181,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 182,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 183,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 184,
                  "text": "Tổng Giá trị hợp đồng chưa bao gồm thuế TNCN ",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 185,
                  "text": "(số tiền Bên B thực nhận)",
                  "bold": true
                }
              ],
              "colSpan": 4
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 186,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 187,
                  "text": "Thuế TNCN (Bên A có nghĩa vụ trích nộp)",
                  "bold": true
                }
              ],
              "colSpan": 4
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 188,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 189,
                  "text": "Tổng Giá trị hợp đồng đã bao gồm thuế TNCN",
                  "bold": true
                }
              ],
              "colSpan": 4
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 190,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 191,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 192,
        "text": "Thỏa thuận Hoa hồng Affiliate (nếu áp dụng)",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 193,
        "text": "Hoa hồng affiliate gồm hai loại như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 194,
        "text": "Hoa hồng organic: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh tự nhiên từ video, được ghi nhận thông qua link/mã theo dõi của Bên B và không bao gồm doanh thu phát sinh từ ngân sách quảng cáo do Bên A hoặc bên thứ ba chi trả. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 195,
        "text": "Hoa hồng chạy ads: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh từ video được sử dụng để chạy quảng cáo, với điều kiện doanh thu đó được ghi nhận thông qua link/mã theo dõi của Bên B và được Bên A xác nhận trong báo cáo đối soát.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 196,
        "text": "Doanh thu làm căn cứ tính hoa hồng là doanh thu đã hoàn tất (không bao gồm đơn hủy, hoàn trả hoặc gian lận), theo dữ liệu của nền tảng và/hoặc hệ thống của Bên A; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 197,
        "text": "Hoa hồng affiliate do nền tảng chi trả trực tiếp cho Bên B. Bên B tự chịu trách nhiệm kê khai, khấu trừ và nộp các loại thuế, phí liên quan đến khoản thu nhập từ hoa hồng affiliate theo quy định pháp luật.     ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 198,
        "text": " Hình thức thanh toán",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 199,
        "text": "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 200,
        "text": "Tên chủ tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 201,
        "text": "Số tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 202,
        "text": "Tại Ngân hàng: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 203,
        "text": " Thời hạn thanh toán",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 204,
                  "text": "Thanh toán 1 lần",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 205,
                  "text": "Phí dịch vụ được thanh toán 1 lần trong vòng 7 - 10 ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) sau khi Bên B hoàn thành dịch vụ và hai bên đã hoàn tất việc ký kết Hợp đồng này (Bên A đã nhận được Hợp đồng có chữ ký của hai bên).",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 206,
                  "text": "Thanh toán 2 lần",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 207,
                  "text": "Phí dịch vụ được thanh toán làm 2 lần:",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 208,
                  "text": "Lần 1 tạm ứng … trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm hai bên ký kết hợp đồng này.",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 209,
                  "text": "Lần 2 thanh toán số tiền còn lại trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm Bên B hoàn thành dịch vụ và Bên A đã nhận được Hợp đồng, Biên bản nghiệm thu dịch vụ có chữ ký của hai bên.",
                  "align": "justify"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 210,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 211,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 212,
        "text": "ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 213,
        "text": "4.1. Quyền của Bên A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 214,
        "text": "Quyền kiểm tra, giám sát: Bên A có quyền kiểm tra và giám sát Bên B thực hiện công việc đúng nội dung, chất lượng, tiến độ theo Hợp đồng; có quyền phê duyệt hoặc đưa ra ý kiến trong thời gian hợp lý đối với các nội dung, đề xuất của Bên B.",
        "align": "justify",
        "boldPrefix": 25
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 215,
        "text": "Quyền chỉnh sửa kịch bản: Bên A có quyền kiểm tra và yêu cầu Bên B chỉnh sửa nội dung kịch bản trước khi sản xuất/trước khi đăng tải trong trường hợp nội dung chưa phù hợp với yêu cầu đã thống nhất.",
        "align": "justify",
        "boldPrefix": 25
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 216,
        "text": "Quyền chỉnh sửa sản phẩm: Trường hợp nội dung video/bài đăng do Bên B đăng tải không đúng với nội dung đã được hai Bên thống nhất, Bên A có quyền yêu cầu Bên B chỉnh sửa, gỡ bỏ hoặc thay thế ngay nội dung đã đăng tải sai.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 217,
        "text": "4.2. Nghĩa vụ của Bên A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 218,
        "text": "Thanh toán đầy đủ và đúng hạn Phí Booking cho Bên B theo Hợp đồng;",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 219,
        "text": "Cung cấp đầy đủ, kịp thời các thông tin, tài liệu, sản phẩm mẫu và phối hợp với Bên B để triển khai dịch vụ theo Hợp đồng;",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 220,
        "text": "Không sử dụng hình ảnh, nội dung hoặc danh tiếng của Bên B theo cách gây ảnh hưởng tiêu cực đến uy tín hoặc hình ảnh cá nhân của Bên B.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 221,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 222,
        "text": "ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 223,
        "text": "5.1.   Quyền của Bên B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 224,
        "text": "Yêu cầu Bên A cung cấp đầy đủ thông tin, tài liệu, sản phẩm mẫu, guideline, chính sách thương hiệu và các dữ liệu cần thiết để thực hiện dịch vụ; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 225,
        "text": "Yêu cầu Bên A phối hợp phản hồi, xác nhận nội dung, kế hoạch triển khai; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 226,
        "text": "Được sử dụng tên thương mại, nhãn hiệu, hình ảnh sản phẩm của Bên A trong phạm vi cần thiết để thực hiện dịch vụ theo Hợp đồng.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 227,
        "text": " Nghĩa vụ của Bên B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 228,
        "text": "Nghĩa vụ thực hiện dịch vụ: Thực hiện công việc đúng nội dung, chất lượng, số lượng, thời hạn, nền tảng theo Hợp đồng đã ký kết; không được chuyển giao, ủy quyền cho bên thứ ba thực hiện công việc; chủ động thông báo kịp thời cho Bên A về bất kỳ sự kiện nào có thể ảnh hưởng đến việc thực hiện dịch vụ.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 229,
        "text": "Nghĩa vụ duy trì nội dung đã đăng tải:",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 230,
        "text": "Bên B không được tự ý xóa, ẩn hoặc hạn chế hiển thị đối với nội dung (bao gồm video, bài đăng) đã đăng tải theo Hợp đồng. Trong trường hợp nội dung phát sinh lỗi kỹ thuật do nền tảng (bao gồm nhưng không giới hạn: mất tiếng, lỗi hình ảnh, lỗi hiển thị hoặc các sự cố tương tự), Bên B có nghĩa vụ phối hợp với Bên A để khắc phục và đăng tải lại nội dung trong thời gian sớm nhất theo yêu cầu của Bên A.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 231,
        "text": "Nghĩa vụ về nội dung và trách nhiệm quảng cáo: Bên B là người chuyển tải sản phẩm quảng cáo theo quy định pháp luật và cam kết tuân thủ quy định tại Luật Quảng cáo, Luật Bảo vệ quyền lợi người tiêu dùng hiện hành cũng như quy định của sàn TMĐT.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 232,
        "text": "Nghĩa vụ tư vấn nội dung: Bên B có nghĩa vụ tư vấn, đề xuất nội dung, thông điệp và định hướng triển khai phù hợp với đặc thù nền tảng, hành vi người dùng, mục tiêu chiến dịch… nhằm tối ưu hiệu quả truyền thông.",
        "align": "justify",
        "boldPrefix": 26
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 233,
        "text": "Nghĩa vụ bảo vệ hình ảnh và uy tín nhãn hiệu: Bên B cam kết bảo vệ hình ảnh, uy tín của nhãn hiệu và Bên A bằng việc không thực hiện bất kỳ hành vi, phát ngôn hoặc đăng tải nội dung nào gây ảnh hưởng tiêu cực, gây hiểu nhầm hoặc chưa được kiểm chứng liên quan đến Bên A hoặc sản phẩm/dịch vụ, cũng như không sử dụng ngôn từ, hình ảnh phản cảm, vi phạm pháp luật hoặc không phù hợp với định vị thương hiệu của Bên A; các nghĩa vụ này áp dụng trong suốt thời gian thực hiện Hợp đồng và kéo dài ít nhất 06 tháng sau khi chấm dứt việc hợp tác với nhãn hàng.",
        "align": "justify",
        "boldPrefix": 46
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 234,
        "text": "Nghĩa vụ bảo vệ hình ảnh và uy tín cá nhân: Bên B cam kết duy trì danh tiếng cá nhân, không để xảy ra các sự kiện, hành vi hoặc phát ngôn có thể gây scandal, tranh cãi hoặc ảnh hưởng trực tiếp hoặc gián tiếp đến uy tín của Bên A; trong trường hợp phát sinh sự kiện có nguy cơ ảnh hưởng tiêu cực, Bên B phải thông báo kịp thời và phối hợp với Bên A để xử lý phù hợp.",
        "align": "justify",
        "boldPrefix": 43
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 235,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 236,
        "text": "ĐIỂU 6: PHẠT VI PHẠM, BỒI THƯỜNG THIỆT HẠI",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 237,
        "text": "6.1. Vi phạm của Bên A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 238,
        "text": "Chậm thanh toán: Trừ trường hợp bất khả kháng hoặc do lỗi của Bên B, nếu Bên A chậm thanh toán quá 30 (ba mươi) ngày so với thời hạn đã thỏa thuận (thời hạn thanh toán được tính từ thời điểm Bên B hoàn tất chứng từ thanh toán), Bên A phải trả lãi chậm thanh toán với mức lãi suất 8%/năm trên số tiền chậm trả, tính theo số ngày chậm thanh toán.",
        "align": "justify",
        "boldPrefix": 16
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 239,
        "text": "6.2. Vi phạm của Bên B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 240,
        "text": "Vi phạm tiến độ thực hiện: Trường hợp Bên B không thực hiện đúng tiến độ theo Hợp đồng mà không do lỗi của Bên A hoặc yếu tố khách quan, Bên A sẽ gia hạn để Bên B khắc phục kịp thời theo tiến độ của dự án. Nếu Bên B không khắc phục trong vòng 3 – 5 ngày hoặc xong trước deadline cuối của dự án, Bên B phải chịu phạt tương đương 1% giá trị phí dịch vụ của hạng mục công việc bị vi phạm cho mỗi ngày chậm, tổng mức phạt không vượt quá 8% giá trị hạng mục đó hoặc Bên A có quyền không nghiệm thu và không trả phí cho hạng mục công việc hoàn thành muộn.",
        "align": "justify",
        "boldPrefix": 27
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 241,
        "text": "Vi phạm nghĩa vụ về về nội dung và trách nhiệm quảng cáo: Bên A có quyền yêu cầu Bên B gỡ bỏ, chỉnh sửa nội dung và chịu mọi trách nhiệm phát sinh; đồng thời Bên A có quyền giảm trừ hoặc không thanh toán phần Phí Dịch vụ liên quan đến nội dung vi phạm pháp luật hoặc đơn phương chấm dứt Hợp đồng tùy theo mức độ nghiêm trọng của sự việc. ",
        "align": "justify",
        "boldPrefix": 58
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 242,
        "text": "Vi phạm nghĩa vụ bảo vệ hình ảnh, uy tín và danh tiếng thương hiệu và danh tiếng cá nhân của Bên B: Bên A có quyền đơn phương chấm dứt Hợp đồng, từ chối thanh toán phần phí dịch vụ liên quan đến sai phạm và yêu cầu Bên B thực hiện các biện pháp khắc phục (bao gồm đính chính, gỡ bỏ nội dung nếu có).",
        "align": "justify",
        "boldPrefix": 100
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 243,
        "text": "6.3. Bồi thường thiệt hại",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 244,
        "text": "Bên nào vi phạm nghĩa vụ theo Hợp đồng gây thiệt hại cho Bên còn lại thì phải bồi thường toàn bộ thiệt hại thực tế, trực tiếp phát sinh theo quy định của pháp luật.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 245,
        "text": "ĐIỀU 7: HIỆU LỰC VÀ CHẤM DỨT HỢP ĐỒNG ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 246,
        "text": "7.1. Hiệu lực: Hợp đồng có hiệu lực trong thời hạn 01 (một) năm kể từ ngày ký hoặc đến thời điểm Hai Bên hoàn tất nghiệm thu, thanh lý Hợp đồng theo quy định tại Hợp đồng này, tùy thời điểm nào đến trước.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 247,
        "text": "7.2. Các trường hợp chấm dứt hợp đồng",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 248,
        "text": "Hai bên cùng thỏa thuận chấm dứt Hợp đồng",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 249,
        "text": "Bên A có quyền đơn phương chấm dứt Hợp đồng theo mục c, d khoản 6.2, Điều 6 của Hợp đồng này.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 250,
        "text": "Bên B có quyền đơn phương chấm dứt Hợp đồng nếu Bên A vi phạm nghĩa vụ thanh toán quá 30 ngày.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 251,
        "text": "7.3. Thanh lý Hợp đồng",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 252,
        "text": "Hai Bên bắt buộc ký Biên bản nghiệm thu và/hoặc Biên bản thanh lý trong các trường hợp sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 253,
        "text": "Giá trị nghiệm thu hoặc thanh toán thực tế từ 20.000.000 đồng trở lên; hoặc",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 254,
        "text": "Giá trị nghiệm thu/thanh toán thực tế dưới 20.000.000 đồng nhưng khác với giá trị Hợp đồng đã ký kết.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 255,
        "text": "Hợp đồng được tự động nghiệm thu và thanh lý mà không cần ký Biên bản nghiệm thu hoặc Biên bản thanh lý khi đồng thời đáp ứng đầy đủ các điều kiện sau:",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 256,
        "text": "Giá trị Hợp đồng dưới 20.000.000 đồng;",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 257,
        "text": "Giá trị nghiệm thu thực tế và giá trị thanh toán thực tế đúng bằng giá trị Hợp đồng;",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 258,
        "text": "Hai Bên đã hoàn tất toàn bộ quyền và nghĩa vụ theo Hợp đồng.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 259,
        "text": "Thời điểm đáp ứng đầy đủ các điều kiện tự động nghiệm thu và thanh lý được xem là thời điểm Hợp đồng được nghiệm thu, thanh lý và chấm dứt hiệu lực.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 260,
        "text": "ĐIỀU 8: BẢO MẬT THÔNG TIN",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 261,
        "text": "Trong quá trình thực hiện Hợp đồng và sau khi Hợp đồng chấm dứt, mỗi Bên (sau đây gọi là “Bên Nhận Thông Tin”) có nghĩa vụ bảo mật tuyệt đối đối với mọi thông tin, tài liệu do Bên còn lại (“Bên Tiết Lộ”) cung cấp hoặc phát sinh liên quan đến việc thực hiện Hợp đồng, bao gồm nhưng không giới hạn các điều khoản Hợp đồng, dữ liệu, tài liệu, kế hoạch kinh doanh, thông tin tài chính, chiến lược marketing, bí mật kinh doanh và các thông tin có tính chất bảo mật khác (“Thông Tin Mật”); theo đó, Bên Nhận Thông Tin không được tiết lộ, công bố hoặc sử dụng Thông Tin Mật cho bất kỳ mục đích nào ngoài việc thực hiện Hợp đồng nếu không có sự chấp thuận trước bằng văn bản của Bên Tiết Lộ.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 262,
        "text": "Bên vi phạm phải chịu trách nhiệm bồi thường toàn bộ thiệt hại phát sinh cho Bên còn lại và các bên liên quan (nếu có).",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 263,
        "text": "Thời hạn bảo mật: Nghĩa vụ bảo mật tiếp tục có hiệu lực sau khi Hợp Đồng chấm dứt hoặc hết hạn, cho đến khi Thông Tin Bảo Mật trở thành thông tin công khai hợp pháp.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 264,
        "text": "ĐIỀU 9: BẤT KHẢ KHÁNG",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 265,
        "text": "Một Bên sẽ không bị xem là vi phạm Hợp Đồng nếu việc chậm trễ hoặc không thực hiện nghĩa vụ do sự kiện khách quan, không thể lường trước và không thể khắc phục mặc dù đã áp dụng mọi biện pháp cần thiết (“Sự Kiện Bất Khả Kháng”), bao gồm nhưng không giới hạn: thiên tai, hỏa hoạn, chiến tranh, bạo loạn, đình công, dịch bệnh, hoặc các quyết định, hạn chế của cơ quan nhà nước có thẩm quyền. Bên bị ảnh hưởng phải thông báo bằng văn bản cho Bên còn lại trong vòng 03 ngày làm việc kể từ khi xảy ra sự kiện, nêu rõ bản chất sự kiện, phạm vi ảnh hưởng và thời gian dự kiến khắc phục.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 266,
        "text": "ĐIỀU 10: ĐIỀU KHOẢN CHUNG",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 267,
        "text": "Luật áp dụng: Hợp Đồng này được điều chỉnh và giải thích theo pháp luật Việt Nam.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 268,
        "text": "Giải quyết tranh chấp: Mọi tranh chấp phát sinh từ hoặc liên quan đến Hợp Đồng sẽ được ưu tiên giải quyết thông qua thương lượng, hòa giải giữa các Bên. Nếu tranh chấp không được giải quyết trong vòng 30 (ba mươi) ngày kể từ ngày một Bên thông báo bằng văn bản về tranh chấp, tranh chấp sẽ được đưa ra Tòa án có thẩm quyền tại Việt Nam để giải quyết.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 269,
        "text": "Hợp đồng này được lập thành 02 bản, mỗi Bên giữ 01 bản, có giá trị pháp lý như nhau.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 270,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "signature",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 271,
                  "text": "ĐẠI DIỆN BÊN A",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 272,
                  "text": "ĐẠI DIỆN BÊN B",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 273,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/footer1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/footer1.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 1,
                  "text": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 2,
                  "text": "http://www.upbase.asia",
                  "align": "center"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 3,
                  "text": "Trang 1 ",
                  "align": "right"
                },
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 4,
                  "text": ""
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/footer1.xml",
        "paragraph": 5,
        "text": ""
      }
    ],
    "category": "BOOKING_VIDEO",
    "description": "Mẫu hợp đồng dịch vụ sản xuất & đăng tải video quảng cáo áp dụng cho đối tác là cá nhân.",
    "active": true,
    "defaultReviewRoles": [
      "LEGAL",
      "FINANCE"
    ],
    "exemptLegalReview": true,
    "scope": "GLOBAL",
    "updatedAt": "2026-05-01T08:00:00.000Z",
    "updatedBy": "Phòng Pháp chế",
    "fieldCount": 40,
    "requiredFieldCount": 13,
    "history": [
      {
        "version": "Ver052026",
        "hash": "046fcd759e30775e8d0500d509440de6ae8ffef93ef5eab27fdc85011e74b48d",
        "filename": "1.1.1. BM.HĐ.VID.IND.Ver052026 booking Video.docx",
        "updatedAt": "2026-05-01T08:00:00.000Z",
        "updatedBy": "Phòng Pháp chế",
        "note": "Phiên bản chuẩn ban hành bởi Pháp chế"
      }
    ]
  },
  "IND-BBNT": {
    "id": "IND-BBNT",
    "name": "Nghiệm thu video · Cá nhân",
    "filename": "1.1.2. BM.BBNT.VID.IND.Ver052026 booking Video.docx",
    "subject": "Cá nhân",
    "kind": "ACCEPTANCE",
    "version": "Ver052026",
    "hash": "b51f1217fc10ff7ad8a3d7efb2b8170e454cdb77058511f3ccc954e0f9277221",
    "fields": [
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 0,
        "end": 10,
        "label": "dd.mm.yy",
        "context": "[dd.mm.yy]/BBNT/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 29,
        "end": 37,
        "label": "ID KOC",
        "context": "[dd.mm.yy]/BBNT/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 5,
        "start": 29,
        "end": 39,
        "label": "dd.mm.yy",
        "context": "Kèm theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 5,
        "start": 58,
        "end": 66,
        "label": "ID KOC",
        "context": "Kèm theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p25:cell",
        "part": "word/document.xml",
        "paragraph": 25,
        "label": "BÊN B",
        "context": "BÊN B",
        "required": true,
        "title": "Họ tên Bên B",
        "group": "PARTY",
        "kind": "text",
        "source": "partyName"
      },
      {
        "key": "word/document.xml:p28:cell",
        "part": "word/document.xml",
        "paragraph": 28,
        "label": "CCCD",
        "context": "CCCD · số … cấp ngày… tại…",
        "required": true,
        "start": 0,
        "end": 19,
        "title": "Số CCCD",
        "group": "PARTY",
        "kind": "text",
        "source": "cccd"
      },
      {
        "key": "word/document.xml:p31:cell",
        "part": "word/document.xml",
        "paragraph": 31,
        "label": "Địa chỉ",
        "context": "Địa chỉ",
        "required": true,
        "title": "Địa chỉ",
        "group": "PARTY",
        "kind": "long",
        "source": "address"
      },
      {
        "key": "word/document.xml:p34:cell",
        "part": "word/document.xml",
        "paragraph": 34,
        "label": "Số điện thoại",
        "context": "Số điện thoại",
        "required": true,
        "title": "Số điện thoại",
        "group": "PARTY",
        "kind": "text",
        "source": "phone"
      },
      {
        "key": "word/document.xml:p37:cell",
        "part": "word/document.xml",
        "paragraph": 37,
        "label": "Email",
        "context": "Email",
        "required": true,
        "title": "Email",
        "group": "PARTY",
        "kind": "text",
        "source": "email"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 41,
        "start": 27,
        "end": 37,
        "label": "dd.mm.yy",
        "context": "Căn cứ Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] và kết quả thực hiện công việc thực tế của Bên B.",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 41,
        "start": 50,
        "end": 58,
        "label": "ID KOC",
        "context": "Căn cứ Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] và kết quả thực hiện công việc thực tế của Bên B.",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p59:32",
        "part": "word/document.xml",
        "paragraph": 59,
        "start": 32,
        "end": 33,
        "label": "Tham dự sự kiện trong thời gian  [điền]  tiếng ngày….",
        "context": "Tham dự sự kiện trong thời gian … tiếng ngày….",
        "required": false,
        "title": "Số giờ tham dự sự kiện",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p59:44",
        "part": "word/document.xml",
        "paragraph": 59,
        "start": 44,
        "end": 45,
        "label": "ự kiện trong thời gian … tiếng ngày [điền] .",
        "context": "Tham dự sự kiện trong thời gian … tiếng ngày….",
        "required": false,
        "title": "Ngày tham dự sự kiện",
        "group": "SCOPE",
        "kind": "date"
      },
      {
        "key": "word/document.xml:p89:cell",
        "part": "word/document.xml",
        "paragraph": 89,
        "label": "Tổng giá trị nghiệm thu chi phí thực tế · Chi phí",
        "context": "1 · Tổng giá trị nghiệm thu chi phí thực tế",
        "required": false,
        "title": "Tổng giá trị nghiệm thu chi phí thực tế",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p92:cell",
        "part": "word/document.xml",
        "paragraph": 92,
        "label": "Chi phí Bên B thực nhận · Chi phí",
        "context": "1.1 · Chi phí Bên B thực nhận",
        "required": false,
        "title": "Chi phí Bên B thực nhận",
        "group": "MONEY",
        "kind": "money",
        "source": "netTotal"
      },
      {
        "key": "word/document.xml:p95:cell",
        "part": "word/document.xml",
        "paragraph": 95,
        "label": "Thuế TNCN · Chi phí",
        "context": "1.2 · Thuế TNCN",
        "required": false,
        "title": "Thuế TNCN",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 97,
        "start": 47,
        "end": 57,
        "label": "dd.mm.yy",
        "context": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] ",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 97,
        "start": 70,
        "end": 78,
        "label": "ID KOC",
        "context": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] ",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p99:cell",
        "part": "word/document.xml",
        "paragraph": 99,
        "label": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐ · Chi phí",
        "context": "2 · Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] (không gồm thuế TNCN)",
        "required": false,
        "title": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐ",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p103:cell",
        "part": "word/document.xml",
        "paragraph": 103,
        "label": "Giá trị còn lại Bên A phải thanh toán cho Bên B · Chi phí",
        "context": "3 · Giá trị còn lại Bên A phải thanh toán cho Bên B(không gồm thuế TNCN)",
        "required": false,
        "title": "Giá trị còn lại Bên A phải thanh toán cho Bên B",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p105:93",
        "part": "word/document.xml",
        "paragraph": 105,
        "start": 93,
        "end": 94,
        "label": "đồng tương ứng với tổng giá trị là  [điền] . (Bằng chữ: ….).",
        "context": "Bên A có nghĩa vụ thanh toán 100% giá trị còn lại của Hợp đồng tương ứng với tổng giá trị là …. (Bằng chữ: ….).",
        "required": false,
        "title": "Số tiền còn phải thanh toán",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p105:107",
        "part": "word/document.xml",
        "paragraph": 105,
        "start": 107,
        "end": 108,
        "label": " với tổng giá trị là …. (Bằng chữ:  [điền] .).",
        "context": "Bên A có nghĩa vụ thanh toán 100% giá trị còn lại của Hợp đồng tương ứng với tổng giá trị là …. (Bằng chữ: ….).",
        "required": false,
        "title": "Số tiền bằng chữ",
        "group": "MONEY",
        "kind": "text"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/footer1.xml",
        "paragraph": 1,
        "start": 0,
        "end": 10,
        "label": "dd.mm.yy",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/footer1.xml",
        "paragraph": 1,
        "start": 29,
        "end": 37,
        "label": "ID KOC",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      }
    ],
    "paragraphs": [
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Độc lập – Tự do – Hạnh phúc",
      "",
      "BIÊN BẢN NGHIỆM THU DỊCH VỤ BOOKING VIDEO",
      "[dd.mm.yy]/BBNT/UPBASE-BRAND-[ID KOC]",
      "Kèm theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
      "",
      "BÊN SỬ DỤNG DỊCH VỤ",
      "BÊN A",
      ":",
      "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
      "Mã số thuế",
      ":",
      "0109361325",
      "Địa chỉ",
      ":",
      "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
      "Người đại diện",
      ":",
      "Ông Đỗ Văn Giang   ",
      "Sau đây gọi tắt là “Bên A”",
      "",
      "BÊN CUNG ỨNG DỊCH VỤ ",
      "BÊN B",
      ":",
      "",
      "CCCD",
      ":",
      "số … cấp ngày… tại…",
      "Địa chỉ",
      ":",
      "",
      "Số điện thoại",
      ":",
      "",
      "Email",
      ":",
      "",
      "Sau đây gọi tắt là “Bên B”",
      "",
      "",
      "Căn cứ Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] và kết quả thực hiện công việc thực tế của Bên B.",
      "Hai Bên tiến hành nghiệm thu các hạng mục công việc do Bên B thực hiện thep Hợp đồng nêu trên làm cơ sở xác nhận hoàn thành nghĩa vụ và thanh toán theo thỏa thuận.",
      "",
      "Điều 1: Nghiệm thu phạm vi và phí dịch vụ",
      " Nghiệm thu phí dịch vụ",
      "STT",
      "Nội dung nghiệm thu ",
      "Trạng thái",
      "Đơn giá",
      "Số lượng",
      "Thành tiền",
      "1",
      "Link video",
      "Hoàn thành",
      "8.000.000",
      "1",
      "8.000.000",
      "2",
      "Tham dự sự kiện trong thời gian … tiếng ngày….",
      "Hoàn thành",
      "5.000.000",
      "1",
      "5.000.000",
      "3",
      "Link bài đăng Fb",
      "Hoàn thành",
      "3.000.000",
      "1",
      "3.000.000",
      "Thành tiền Bên B thực nhận ",
      "16.000.000",
      "Thuế TNCN Bên A đóng nộp",
      "1.777.778",
      "Thành tiền giá trị nghiệm thu chi phí thực tế",
      "17.777.778",
      "",
      "Hình ảnh nghiệm thu dịch vụ",
      "",
      "",
      "",
      "",
      "Điều 2: Thanh toán phí dịch vụ",
      "Phí dịch vụ Bên A phải thanh toán cho Bên B là:",
      "STT",
      "Nội dung",
      "Chi phí (VNĐ)",
      "1",
      "Tổng giá trị nghiệm thu chi phí thực tế",
      "",
      "1.1",
      "Chi phí Bên B thực nhận",
      "",
      "1.2",
      "Thuế TNCN ",
      "",
      "2",
      "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] ",
      "(không gồm thuế TNCN)",
      "",
      "3",
      "Giá trị còn lại Bên A phải thanh toán cho Bên B",
      "(không gồm thuế TNCN)",
      "",
      "",
      "Bên A có nghĩa vụ thanh toán 100% giá trị còn lại của Hợp đồng tương ứng với tổng giá trị là …. (Bằng chữ: ….).",
      "Thời hạn thanh toán là trong vòng 10 ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ ngày Bên A nhận được: Hợp đồng dịch vụ; Biên bản nghiệm thu công việc đã được các Bên ký xác nhận.",
      "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
      "Tên chủ tài khoản: ",
      "Số tài khoản: ",
      "Tại Ngân hàng: ",
      "",
      "Điều 2: Hiệu lực ",
      "Biên bản này được lập và có hiệu lực từ ngày ….",
      "Biên bản này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi Bên giữ 01 (một) bản để thực hiện.",
      "",
      "ĐẠI DIỆN BÊN A",
      "",
      "ĐẠI DIỆN BÊN B ",
      "",
      "",
      "",
      "",
      "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
      "http://www.upbase.asia",
      "Trang 1 ",
      "",
      "",
      "",
      "BM.BBNTVID.IND.Ver052026",
      ""
    ],
    "blocks": [
      {
        "kind": "table",
        "part": "word/header1.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header1.xml",
                  "paragraph": 0,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header1.xml",
                  "paragraph": 1,
                  "text": "BM.BBNTVID.IND.Ver052026",
                  "align": "right"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/header1.xml",
        "paragraph": 2,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 0,
        "text": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 1,
        "text": "Độc lập – Tự do – Hạnh phúc",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 2,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 3,
        "text": "BIÊN BẢN NGHIỆM THU DỊCH VỤ BOOKING VIDEO",
        "align": "center",
        "bold": true,
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 4,
        "text": "[dd.mm.yy]/BBNT/UPBASE-BRAND-[ID KOC]",
        "align": "center"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 5,
        "text": "Kèm theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "align": "center",
        "boldPrefix": 29
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 6,
        "text": "",
        "align": "center"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 7,
                  "text": "BÊN SỬ DỤNG DỊCH VỤ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 4
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 8,
                  "text": "BÊN A",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 9,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 10,
                  "text": "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 11,
                  "text": "Mã số thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 12,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 13,
                  "text": "0109361325",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 14,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 15,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 16,
                  "text": "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 17,
                  "text": "Người đại diện",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 18,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 19,
                  "text": "Ông Đỗ Văn Giang   ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 20,
                  "text": "Sau đây gọi tắt là “Bên A”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 21,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 22,
                  "text": "BÊN CUNG ỨNG DỊCH VỤ ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 4
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 23,
                  "text": "BÊN B",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 24,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 25,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 26,
                  "text": "CCCD",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 27,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 28,
                  "text": "số … cấp ngày… tại…",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 29,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 30,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 31,
                  "text": "",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 32,
                  "text": "Số điện thoại",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 33,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 34,
                  "text": "",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 35,
                  "text": "Email",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 36,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 37,
                  "text": "",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 38,
                  "text": "Sau đây gọi tắt là “Bên B”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 39,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 40,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 41,
        "text": "Căn cứ Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] và kết quả thực hiện công việc thực tế của Bên B.",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 42,
        "text": "Hai Bên tiến hành nghiệm thu các hạng mục công việc do Bên B thực hiện thep Hợp đồng nêu trên làm cơ sở xác nhận hoàn thành nghĩa vụ và thanh toán theo thỏa thuận.",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 43,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 44,
        "text": "Điều 1: Nghiệm thu phạm vi và phí dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 45,
        "text": " Nghiệm thu phí dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 46,
                  "text": "STT",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 47,
                  "text": "Nội dung nghiệm thu ",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 48,
                  "text": "Trạng thái",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 49,
                  "text": "Đơn giá",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 50,
                  "text": "Số lượng",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 51,
                  "text": "Thành tiền",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 52,
                  "text": "1",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 53,
                  "text": "Link video",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 54,
                  "text": "Hoàn thành"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 55,
                  "text": "8.000.000",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 56,
                  "text": "1",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 57,
                  "text": "8.000.000",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 58,
                  "text": "2",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 59,
                  "text": "Tham dự sự kiện trong thời gian … tiếng ngày….",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 60,
                  "text": "Hoàn thành"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 61,
                  "text": "5.000.000",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 62,
                  "text": "1",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 63,
                  "text": "5.000.000",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 64,
                  "text": "3",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 65,
                  "text": "Link bài đăng Fb",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 66,
                  "text": "Hoàn thành"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 67,
                  "text": "3.000.000",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 68,
                  "text": "1",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 69,
                  "text": "3.000.000",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 70,
                  "text": "Thành tiền Bên B thực nhận ",
                  "align": "center",
                  "bold": true
                }
              ],
              "colSpan": 5
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 71,
                  "text": "16.000.000",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 72,
                  "text": "Thuế TNCN Bên A đóng nộp",
                  "align": "center",
                  "bold": true
                }
              ],
              "colSpan": 5
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 73,
                  "text": "1.777.778",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 74,
                  "text": "Thành tiền giá trị nghiệm thu chi phí thực tế",
                  "align": "center",
                  "bold": true
                }
              ],
              "colSpan": 5
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 75,
                  "text": "17.777.778",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 76,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 77,
        "text": "Hình ảnh nghiệm thu dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 78,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 79,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 80,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 81,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 82,
        "text": "Điều 2: Thanh toán phí dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 83,
        "text": "Phí dịch vụ Bên A phải thanh toán cho Bên B là:",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 84,
                  "text": "STT",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 85,
                  "text": "Nội dung",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 86,
                  "text": "Chi phí (VNĐ)",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 87,
                  "text": "1",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 88,
                  "text": "Tổng giá trị nghiệm thu chi phí thực tế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 89,
                  "text": "",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 90,
                  "text": "1.1",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 91,
                  "text": "Chi phí Bên B thực nhận",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 92,
                  "text": "",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 93,
                  "text": "1.2",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 94,
                  "text": "Thuế TNCN ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 95,
                  "text": "",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 96,
                  "text": "2",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 97,
                  "text": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] ",
                  "align": "justify",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 98,
                  "text": "(không gồm thuế TNCN)",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 99,
                  "text": "",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 100,
                  "text": "3",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 101,
                  "text": "Giá trị còn lại Bên A phải thanh toán cho Bên B",
                  "align": "justify",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 102,
                  "text": "(không gồm thuế TNCN)",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 103,
                  "text": "",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 104,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 105,
        "text": "Bên A có nghĩa vụ thanh toán 100% giá trị còn lại của Hợp đồng tương ứng với tổng giá trị là …. (Bằng chữ: ….).",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 106,
        "text": "Thời hạn thanh toán là trong vòng 10 ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ ngày Bên A nhận được: Hợp đồng dịch vụ; Biên bản nghiệm thu công việc đã được các Bên ký xác nhận.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 107,
        "text": "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 108,
        "text": "Tên chủ tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 109,
        "text": "Số tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 110,
        "text": "Tại Ngân hàng: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 111,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 112,
        "text": "Điều 2: Hiệu lực ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 113,
        "text": "Biên bản này được lập và có hiệu lực từ ngày ….",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 114,
        "text": "Biên bản này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi Bên giữ 01 (một) bản để thực hiện.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 115,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "signature",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 116,
                  "text": "ĐẠI DIỆN BÊN A",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 117,
                  "text": "",
                  "align": "center"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 118,
                  "text": "ĐẠI DIỆN BÊN B ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 119,
                  "text": "",
                  "align": "center"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 120,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 121,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/footer1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/footer1.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 1,
                  "text": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 2,
                  "text": "http://www.upbase.asia",
                  "align": "center"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 3,
                  "text": "Trang 1 ",
                  "align": "right"
                },
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 4,
                  "text": ""
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/footer1.xml",
        "paragraph": 5,
        "text": ""
      }
    ],
    "category": "ACCEPTANCE_SETTLEMENT",
    "description": "Biên bản nghiệm thu link bài đăng, mã Spark Ads và giá trị thanh toán thực tế cho đối tác cá nhân.",
    "active": true,
    "defaultReviewRoles": [
      "FINANCE",
      "LEAD"
    ],
    "exemptLegalReview": true,
    "scope": "GLOBAL",
    "updatedAt": "2026-05-01T08:00:00.000Z",
    "updatedBy": "Phòng Pháp chế",
    "fieldCount": 24,
    "requiredFieldCount": 15,
    "history": [
      {
        "version": "Ver052026",
        "hash": "b51f1217fc10ff7ad8a3d7efb2b8170e454cdb77058511f3ccc954e0f9277221",
        "filename": "1.1.2. BM.BBNT.VID.IND.Ver052026 booking Video.docx",
        "updatedAt": "2026-05-01T08:00:00.000Z",
        "updatedBy": "Phòng Pháp chế",
        "note": "Phiên bản chuẩn ban hành bởi Pháp chế"
      }
    ]
  },
  "HKD-HD": {
    "id": "HKD-HD",
    "name": "Hợp đồng video · Hộ kinh doanh",
    "filename": "2.1.1. BM.HĐ.VID.HKD.Ver052026 booking Video.docx",
    "subject": "Hộ kinh doanh",
    "kind": "CONTRACT",
    "version": "Ver052026",
    "hash": "823c5dac56549d503fdda748dc4aaccc94d7e1eca028443b1567a808a421aca4",
    "fields": [
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 4,
        "end": 14,
        "label": "dd.mm.yy",
        "context": "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 33,
        "end": 41,
        "label": "ID KOC",
        "context": "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p16:14",
        "part": "word/document.xml",
        "paragraph": 16,
        "start": 14,
        "end": 15,
        "label": "Hôm nay, ngày  [điền]  tháng … năm 202…, tại tr",
        "context": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "required": true,
        "title": "Ngày ký",
        "group": "DATE",
        "kind": "number",
        "source": "signDay"
      },
      {
        "key": "word/document.xml:p16:22",
        "part": "word/document.xml",
        "paragraph": 16,
        "start": 22,
        "end": 23,
        "label": "Hôm nay, ngày … tháng  [điền]  năm 202…, tại trụ sở chí",
        "context": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "required": true,
        "title": "Tháng ký",
        "group": "DATE",
        "kind": "number",
        "source": "signMonth"
      },
      {
        "key": "word/document.xml:p16:31",
        "part": "word/document.xml",
        "paragraph": 16,
        "start": 31,
        "end": 32,
        "label": "Hôm nay, ngày … tháng … năm 202 [điền] , tại trụ sở chính của Cô",
        "context": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "required": true,
        "title": "Năm ký (chữ số cuối, ví dụ 6 cho 2026)",
        "group": "DATE",
        "kind": "number",
        "source": "signYearDigit"
      },
      {
        "key": "word/document.xml:p36:cell",
        "part": "word/document.xml",
        "paragraph": 36,
        "label": "BÊN B",
        "context": "BÊN B · Tên Hộ kinh doanh",
        "required": true,
        "start": 0,
        "end": 17,
        "title": "Tên hộ kinh doanh",
        "group": "PARTY",
        "kind": "text",
        "source": "partyName"
      },
      {
        "key": "word/document.xml:p39:cell",
        "part": "word/document.xml",
        "paragraph": 39,
        "label": "Mã số thuế",
        "context": "Mã số thuế · MST hộ kinh doanh",
        "required": true,
        "start": 0,
        "end": 17,
        "title": "Mã số thuế",
        "group": "PARTY",
        "kind": "text",
        "source": "taxCode"
      },
      {
        "key": "word/document.xml:p42:cell",
        "part": "word/document.xml",
        "paragraph": 42,
        "label": "Địa chỉ",
        "context": "Địa chỉ · Địa chỉ hộ kinh doanh",
        "required": true,
        "start": 0,
        "end": 21,
        "title": "Địa chỉ",
        "group": "PARTY",
        "kind": "long",
        "source": "address"
      },
      {
        "key": "word/document.xml:p45:cell",
        "part": "word/document.xml",
        "paragraph": 45,
        "label": "Chủ hộ kinh doanh",
        "context": "Chủ hộ kinh doanh · Họ và tên",
        "required": true,
        "start": 0,
        "end": 10,
        "title": "Họ tên chủ hộ",
        "group": "PARTY",
        "kind": "text",
        "source": "ownerName"
      },
      {
        "key": "word/document.xml:p48:cell",
        "part": "word/document.xml",
        "paragraph": 48,
        "label": "CCCD chủ hộ kinh doanh",
        "context": "CCCD chủ hộ kinh doanh · Số… cấp ngày … tại…",
        "required": true,
        "start": 0,
        "end": 19,
        "title": "CCCD chủ hộ (số, ngày cấp, nơi cấp)",
        "group": "PARTY",
        "kind": "text",
        "source": "cccd"
      },
      {
        "key": "word/document.xml:p51:cell",
        "part": "word/document.xml",
        "paragraph": 51,
        "label": "Số điện thoại",
        "context": "Số điện thoại",
        "required": true,
        "title": "Số điện thoại",
        "group": "PARTY",
        "kind": "text",
        "source": "phone"
      },
      {
        "key": "word/document.xml:p54:cell",
        "part": "word/document.xml",
        "paragraph": 54,
        "label": "Email",
        "context": "Email",
        "required": true,
        "title": "Email",
        "group": "PARTY",
        "kind": "text",
        "source": "email"
      },
      {
        "key": "word/document.xml:p163:109",
        "part": "word/document.xml",
        "paragraph": 163,
        "start": 109,
        "end": 110,
        "label": "đẩy doanh số bán hàng với sản phẩm  [điền] .",
        "context": "Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….",
        "required": false,
        "title": "Sản phẩm",
        "group": "SCOPE",
        "kind": "text",
        "source": "product"
      },
      {
        "key": "word/document.xml:p167:30",
        "part": "word/document.xml",
        "paragraph": 167,
        "start": 30,
        "end": 31,
        "label": "Có gắn link/giỏ hàng sản phẩm  [điền]  (thời gian tiến hành gắn",
        "context": "Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)",
        "required": false,
        "title": "Sản phẩm gắn giỏ hàng",
        "group": "SCOPE",
        "kind": "text",
        "source": "product"
      },
      {
        "key": "word/document.xml:p168:35",
        "part": "word/document.xml",
        "paragraph": 168,
        "start": 35,
        "end": 36,
        "label": "Cấp mã code để chạy quảng cáo trong [điền]  ngày",
        "context": "Cấp mã code để chạy quảng cáo trong… ngày",
        "required": false,
        "title": "Số ngày cấp mã quảng cáo",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p171:cell",
        "part": "word/document.xml",
        "paragraph": 171,
        "label": "Sản xuất và đăng tải Video review · Đơn giá",
        "context": "1 · Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….Tài khoản đăng tải – link: Thời gian đăng tải:Thời lượng video:Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)Cấp mã code để chạy quảng cáo trong… ngàyBàn giao video gốcYêu cầu key cần bổ sung nếu có",
        "required": false,
        "title": "Sản xuất và đăng tải Video review · Đơn giá",
        "group": "SCOPE",
        "kind": "money",
        "source": "unitPrice"
      },
      {
        "key": "word/document.xml:p172:cell",
        "part": "word/document.xml",
        "paragraph": 172,
        "label": "Sản xuất và đăng tải Video review · Số lượng",
        "context": "1 · Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….Tài khoản đăng tải – link: Thời gian đăng tải:Thời lượng video:Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)Cấp mã code để chạy quảng cáo trong… ngàyBàn giao video gốcYêu cầu key cần bổ sung nếu có",
        "required": false,
        "title": "Sản xuất và đăng tải Video review · Số lượng",
        "group": "SCOPE",
        "kind": "number",
        "source": "quantity"
      },
      {
        "key": "word/document.xml:p173:cell",
        "part": "word/document.xml",
        "paragraph": 173,
        "label": "Sản xuất và đăng tải Video review · Thành tiền",
        "context": "1 · Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….Tài khoản đăng tải – link: Thời gian đăng tải:Thời lượng video:Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)Cấp mã code để chạy quảng cáo trong… ngàyBàn giao video gốcYêu cầu key cần bổ sung nếu có",
        "required": false,
        "title": "Sản xuất và đăng tải Video review · Thành tiền",
        "group": "SCOPE",
        "kind": "money",
        "source": "lineTotal"
      },
      {
        "key": "word/document.xml:p175:23",
        "part": "word/document.xml",
        "paragraph": 175,
        "start": 23,
        "end": 24,
        "label": "Sử dụng hình ảnh trong  [điền]  ngày từ ngày ….",
        "context": "Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Số ngày sử dụng hình ảnh",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p175:38",
        "part": "word/document.xml",
        "paragraph": 175,
        "start": 38,
        "end": 39,
        "label": "dụng hình ảnh trong … ngày từ ngày  [điền] .",
        "context": "Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Ngày bắt đầu sử dụng hình ảnh",
        "group": "SCOPE",
        "kind": "date"
      },
      {
        "key": "word/document.xml:p176:cell",
        "part": "word/document.xml",
        "paragraph": 176,
        "label": "Sử dụng hình ảnh trong · Đơn giá",
        "context": "2 · Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Sử dụng hình ảnh trong · Đơn giá",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p177:cell",
        "part": "word/document.xml",
        "paragraph": 177,
        "label": "Sử dụng hình ảnh trong · Số lượng",
        "context": "2 · Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Sử dụng hình ảnh trong · Số lượng",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p178:cell",
        "part": "word/document.xml",
        "paragraph": 178,
        "label": "Sử dụng hình ảnh trong · Thành tiền",
        "context": "2 · Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Sử dụng hình ảnh trong · Thành tiền",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p181:cell",
        "part": "word/document.xml",
        "paragraph": 181,
        "label": "Tổng giá trị Hợp đồng(Đã bao gồm toàn bộ các khoản thuế, phí và nghĩa vụ tài chính mà Hộ kinh doanh phải kê khai, nộp theo quy định pháp luật, bao gồm chính sách giảm thuế tại thời điểm xuất hóa đơn – nếu có)",
        "context": "Tổng giá trị Hợp đồng(Đã bao gồm toàn bộ các khoản thuế, phí và nghĩa vụ tài chính mà Hộ kinh doanh phải kê khai, nộp theo quy định pháp luật, bao gồm chính sách giảm thuế tại thời điểm xuất hóa đơn – nếu có)",
        "required": false,
        "title": "Tổng giá trị Hợp đồng",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p185:64",
        "part": "word/document.xml",
        "paragraph": 185,
        "start": 64,
        "end": 65,
        "label": "hưởng hoa hồng affiliate với tỷ lệ  [điền] % trên doanh thu phát sin",
        "context": "Hoa hồng organic: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh tự nhiên từ video, được ghi nhận thông qua link/mã theo dõi của Bên B và không bao gồm doanh thu phát sinh từ ngân sách quảng cáo do Bên A hoặc bên thứ ba chi trả. ",
        "required": false,
        "title": "Hoa hồng organic (%)",
        "group": "MONEY",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p186:65",
        "part": "word/document.xml",
        "paragraph": 186,
        "start": 65,
        "end": 66,
        "label": "hưởng hoa hồng affiliate với tỷ lệ  [điền] % trên doanh thu phát sin",
        "context": "Hoa hồng chạy ads: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh từ video được sử dụng để chạy quảng cáo, với điều kiện doanh thu đó được ghi nhận thông qua link/mã theo dõi của Bên B và được Bên A xác nhận trong báo cáo đối soát.",
        "required": false,
        "title": "Hoa hồng chạy ads (%)",
        "group": "MONEY",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p202:29",
        "part": "word/document.xml",
        "paragraph": 202,
        "start": 29,
        "end": 30,
        "label": "Lần 1: Bên A tạm ứng số tiền  [điền]  trong vòng … ngày làm vi",
        "context": "Lần 1: Bên A tạm ứng số tiền … trong vòng … ngày làm việc (không bao gồm thứ Bảy, Chủ nhật và ngày nghỉ lễ) kể từ thời điểm đáp ứng đầy đủ các điều kiện sau: ",
        "required": false,
        "title": "Số tiền tạm ứng lần 1",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p202:42",
        "part": "word/document.xml",
        "paragraph": 202,
        "start": 42,
        "end": 43,
        "label": "Bên A tạm ứng số tiền … trong vòng  [điền]  ngày làm việc (không bao",
        "context": "Lần 1: Bên A tạm ứng số tiền … trong vòng … ngày làm việc (không bao gồm thứ Bảy, Chủ nhật và ngày nghỉ lễ) kể từ thời điểm đáp ứng đầy đủ các điều kiện sau: ",
        "required": false,
        "title": "Hạn tạm ứng (ngày làm việc)",
        "group": "MONEY",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p205:56",
        "part": "word/document.xml",
        "paragraph": 205,
        "start": 56,
        "end": 57,
        "label": "án phần giá trị còn lại trong vòng  [điền]  ngày làm việc (không bao",
        "context": "Lần 2: Bên A thanh toán phần giá trị còn lại trong vòng … ngày làm việc (không bao gồm thứ Bảy, Chủ nhật và ngày nghỉ lễ) kể từ thời điểm đáp ứng đầy đủ các điều kiện sau: ",
        "required": false,
        "title": "Hạn thanh toán lần 2 (ngày làm việc)",
        "group": "MONEY",
        "kind": "number"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/footer2.xml",
        "paragraph": 1,
        "start": 0,
        "end": 10,
        "label": "dd.mm.yy",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/footer2.xml",
        "paragraph": 1,
        "start": 29,
        "end": 37,
        "label": "ID KOC",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      }
    ],
    "paragraphs": [
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Độc lập – Tự do – Hạnh phúc",
      "",
      "HỢP ĐỒNG DỊCH VỤ BOOKING VIDEO",
      "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
      "Căn cứ: ",
      "Bộ luật Dân sự số 91/2015/QH13, có hiệu lực từ ngày 01/01/2017;",
      "Luật Thương mại số 36/2005/QH11, có hiệu lực từ ngày 01/01/2006;",
      "Luật Thương mại điện tử số 122/2025/QH15, có hiệu lực từ ngày 01/07/2026;",
      "Nghị định số 147/2024/NĐ-CP về quản lý, cung cấp và sử dụng dịch vụ Internet và thông tin trên mạng, có hiệu lực từ ngày 25/12/2024; ",
      "Luật Quảng cáo số 16/2012/QH13 có hiệu lực từ ngày 01/01/2013;",
      "Luật sửa đổi, bổ sung một số điều của Luật Quảng cáo số 75/2025/QH15, có hiệu lực từ ngày 01/01/2026;",
      "Luật Sở hữu Trí tuệ số 50/2005/QH11, có hiệu lực từ ngày 01/07/2006;",
      "Luật Sửa đổi bổ sung một số điều của Luật Sở hữu Trí tuệ số 131/2025/QH15, có hiệu lực từ ngày 01/04/2026;",
      "Nhu cầu và khả năng của hai Bên.",
      "",
      "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
      "",
      "BÊN SỬ DỤNG DỊCH VỤ",
      "BÊN A",
      ":",
      "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
      "Mã số thuế",
      ":",
      "0109361325",
      "Địa chỉ",
      ":",
      "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
      "Người đại diện",
      ":",
      "Ông Đỗ Văn Giang   ",
      "Sau đây gọi tắt là “Bên A”",
      "",
      "BÊN CUNG ỨNG DỊCH VỤ ",
      "BÊN B",
      ":",
      "Tên Hộ kinh doanh",
      "Mã số thuế",
      ":",
      "MST hộ kinh doanh",
      "Địa chỉ",
      ":",
      "Địa chỉ hộ kinh doanh",
      "Chủ hộ kinh doanh",
      ":",
      "Họ và tên ",
      "CCCD chủ hộ kinh doanh",
      ":",
      "Số… cấp ngày … tại…",
      "Số điện thoại",
      ":",
      "",
      "Email",
      ":",
      "",
      "Sau đây gọi tắt là “Bên B”",
      "",
      "Bên A có nhu cầu triển khai các hoạt động quảng bá sản phẩm thông qua các KOL/KOC trên các nền tảng truyền thông. Hai bên cùng hợp tác ký kết hợp đồng dịch vụ nhằm quảng cáo, tiếp thị, thúc đẩy doanh số kinh doanh với các điều khoản như sau:",
      "ĐIỀU 1: ĐỊNH NGHĨA",
      "Khái niệm",
      "Định nghĩa",
      "Tài khoản mạng xã hội",
      "Là tài khoản mạng xã hội có link: …",
      "Bên B là chủ sở hữu hợp pháp và có toàn quyền quản lý, vận hành tài khoản mạng xã hội trong suốt thời gian thực hiện Hợp đồng. ",
      "Tiếp thị ",
      "liên kết ",
      "(Affiliate)",
      "Là việc Bên B quảng bá sản phẩm/dịch vụ thông qua cơ chế của nền tảng thương mại điện tử (sàn TMĐT) (bao gồm link, mã, giỏ hàng hoặc công cụ tương đương), trong đó doanh thu chỉ được ghi nhận khi được hệ thống nền tảng xác nhận. Hoa hồng và doanh thu được xác định theo dữ liệu cuối cùng từ nền tảng và có thể bị điều chỉnh trong trường hợp hoàn đơn, gian lận hoặc vi phạm chính sách.",
      "Booking video",
      "Booking video là việc Bên A thuê Bên B sản xuất và đăng tải Video theo các yêu cầu cụ thể của Bên A, có nội dung review, đánh giá, giới thiệu, quảng bá sản phẩm và thúc đẩy doanh số bán hàng (có thể bao gồm các cơ chế như gắn link, mã, giỏ hàng hoặc kêu gọi hành động). ",
      "Phí dịch vụ booking",
      "Phí dịch vụ booking là khoản phí cố định Bên A thanh toán cho Bên B theo Hợp đồng.",
      "Hoa hồng",
      "Là khoản thu nhập của Bên B dựa trên doanh thu Affiliate hợp lệ được nền tảng chi trả. Bên B tự chịu trách nhiệm kê khai, nộp thuế và các nghĩa vụ tài chính liên quan đến khoản hoa hồng này theo quy định pháp luật (nếu áp dụng).",
      "",
      "ĐIỀU 2: PHẠM VI CÔNG VIỆC",
      " Phạm vi công việc cần thực hiện",
      "Bên B thực hiện sản xuất và đăng tải video trên các nền tảng mạng xã hội.",
      "Phạm vi công việc mở rộng:",
      "Gắn công cụ bán hàng: Gắn link, giỏ hàng, mã theo dõi, mã giảm giá, hashtag, CTA …; ",
      "Hỗ trợ quảng cáo: Cho phép Bên A hoặc bên thứ ba do Bên A chỉ định sử dụng nội dung video để chạy quảng cáo, chia sẻ mã quảng cáo, …; ",
      "Sử dụng hình ảnh:",
      "Bên A có quyền sử dụng, khai thác, chỉnh sửa kỹ thuật, resize, cắt ghép định dạng, biên tập, chuyển thể, lồng ghép, tái sử dụng và phân phối lại hình ảnh, video, nội dung do Bên B thực hiện để phục vụ hoạt động truyền thông, quảng bá và thương mại cho nhãn hàng/sản phẩm theo phạm vi đã thỏa thuận tại Hợp đồng.",
      "Bên A được quyền đăng tải lại video trên kênh chính thức của nhãn hàng; sử dụng hình ảnh/video làm banner, hình ảnh trưng bày trên gian hàng TMĐT, website, landing page, nền tảng số hoặc các kênh truyền thông khác của nhãn hàng; đồng thời được quyền cho phép các KOC/KOL/người dùng khác duet, stitch, chia sẻ hoặc sử dụng lại nội dung nhằm phục vụ hoạt động quảng bá chiến dịch trong phạm vi đã thỏa thuận.",
      "Bên A được quyền sử dụng hình ảnh, giọng nói, tên, hình tượng và các yếu tố nhận diện của Bên B/KOL xuất hiện trong nội dung nhằm phục vụ hoạt động quảng cáo, truyền thông và thương mại cho nhãn hàng/sản phẩm theo phạm vi sử dụng đã thỏa thuận.",
      "Phạm vi sử dụng bao gồm nhưng không giới hạn tại: website, landing page, sàn thương mại điện tử, Facebook, TikTok, Instagram, YouTube và các nền tảng số khác của nhãn hàng.",
      "Nội dung được phép sử dụng trong các hoạt động digital marketing, social seeding, PR, media booking, livestream, affiliate marketing, e-commerce campaign và các hoạt động quảng bá sản phẩm/nhãn hàng khác theo nhu cầu truyền thông thực tế của Bên A.",
      "Tham gia hoạt động truyền thông và sự kiện: Tham gia event …; ",
      "Triển khai các định dạng nội dung khác: Thực hiện các bài đăng ngoài video như hình ảnh, carousel, bài viết, caption, story, reel hoặc các định dạng nội dung khác.",
      "",
      "Quy trình cung ứng dịch vụ",
      "Bước",
      "Tên bước",
      "Mô tả công việc",
      "1",
      "Ký Hợp đồng ",
      "dịch vụ ",
      "Hai Bên ký Hợp đồng dịch vụ làm cơ sở pháp lý điều chỉnh toàn bộ hoạt động hợp tác.",
      "2",
      "Yêu cầu dịch vụ",
      "Bên A gửi brief/yêu cầu cung ứng dịch vụ, bao gồm: thông tin chiến dịch, sản phẩm/dịch vụ, nội dung quảng bá, nền tảng triển khai, timeline và các yêu cầu liên quan.",
      "4",
      "Dựng kịch bản",
      "Bên B xây dựng kịch bản và nội dung video dựa trên brief của Bên A và gửi Bên A phê duyệt trước khi sản xuất.",
      "5",
      "Duyệt kịch bản",
      "Bên A xem xét, phản hồi và yêu cầu chỉnh sửa (nếu có).",
      "Tối đa 01 vòng chỉnh sửa trước khi duyệt cuối cùng.",
      "6",
      "Sản xuất video",
      "Bên B tiến hành quay dựng, chỉnh lý, biên tập, hậu kỳ video theo kịch bản đã thống nhất.",
      "7",
      "Duyệt video",
      "Bên A xem xét, phản hồi và yêu cầu chỉnh sửa (nếu có). ",
      "Tối đa 01 vòng chỉnh sửa trước khi duyệt cuối cùng.",
      "8",
      "Đăng tải video",
      "Bên B đăng tải nội dung theo đúng nội dung đã duyệt, đúng tài khoản và timeline.",
      "9",
      "Ghi nhận ",
      "kết quả",
      "Ghi nhận các chỉ số: lượt xem, tương tác, đơn hàng, GMV… theo dữ liệu từ nền tảng.",
      "10",
      "Nghiệm thu",
      "Bên A kiểm tra việc thực hiện dịch vụ theo Hợp đồng này.",
      "11",
      "Thanh toán phí Booking",
      "Bên A thực hiện thanh toán phí booking theo Hợp đồng này.",
      "12",
      "Đối soát Affiliate",
      "(nếu có)",
      "Hoa hồng Affiliate do nền tảng chi trả trực tiếp cho Bên B theo dữ liệu hệ thống.",
      "",
      "2.3. Tiêu chuẩn nghiệm thu dịch vụ ",
      "Tiêu chuẩn về nội dung và đăng tải",
      "Video phải tuân thủ đầy đủ kịch bản, thông điệp và guideline do Bên A cung cấp; ",
      "Bao gồm đầy đủ các yếu tố yêu cầu (nếu có): link, giỏ hàng, mã theo dõi, hashtag, CTA…; ",
      "Chỉ được đăng tải sau khi có phê duyệt nội dung từ Bên A; ",
      "Đăng tải đúng tài khoản, đúng thời điểm và duy trì hiển thị, không được xóa video sau khi đăng tải mà không có sự chấp thuận hoặc yêu cầu của Bên A; ",
      "Nếu video bị ẩn, xóa, tắt âm thanh… hoặc các lỗi tương đương ảnh hưởng đến việc hiển thị bình thường của video trên nền tảng thì Bên B có nghĩa vụ phải chỉnh lý, đăng tải lại video đã khắc phục lỗi.",
      "Không vi phạm pháp luật, chính sách nền tảng hoặc gây ảnh hưởng tiêu cực đến hình ảnh thương hiệu. ",
      "Tiêu chuẩn về kịch bản và sản xuất",
      "Kịch bản phải được Bên A phê duyệt bằng email/tin nhắn/văn bản trước khi quay dựng; ",
      "Mọi chi phí phát sinh do sản xuất khi chưa có phê duyệt hợp lệ do Bên B tự chi trả; ",
      "Cảnh quay, bố cục và thông điệp phải phù hợp với kịch bản đã duyệt; ",
      "Trường hợp sai lệch, Bên A có quyền từ chối nghiệm thu và yêu cầu chỉnh sửa hoặc quay lại mà không phát sinh chi phí. ",
      "Tiêu chuẩn về chất lượng và hậu kỳ",
      "Video phải được dựng và hoàn thiện theo tiêu chuẩn đã thống nhất (video mẫu, guideline thương hiệu); ",
      "Bên B có trách nhiệm chỉnh sửa theo yêu cầu hợp lý của Bên A cho đến khi đạt tiêu chuẩn nghiệm thu.",
      "Tiêu chuẩn về hình ảnh và nhận diện",
      "Bên B phải kiểm soát trang phục, bối cảnh, nhận diện cá nhân và các yếu tố hình ảnh khác nhằm không được gây trùng lặp, xung đột hoặc ảnh hưởng tiêu cực đến hiệu quả truyền thông của Bên A;",
      "Trường hợp vi phạm, Bên B phải chỉnh sửa, thay thế hoặc quay lại nội dung cho đến khi đạt yêu cầu, không làm ảnh hưởng tiến độ cam kết. ",
      "Áp dụng đối với dịch vụ khác: tiêu chuẩn nghiệm thu được áp dụng theo quy định cụ thể tại mô tả dịch vụ (nếu có).",
      "",
      "ĐIỀU 3: PHÍ DỊCH VỤ VÀ THANH TOÁN",
      "Phí dịch vụ booking",
      "STT",
      "Hạng mục",
      "Đơn giá",
      "(VNĐ)",
      "Số lượng",
      "Thành tiền (VNĐ)",
      "1",
      "Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….",
      "Tài khoản đăng tải – link: ",
      "Thời gian đăng tải:",
      "Thời lượng video:",
      "Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)",
      "Cấp mã code để chạy quảng cáo trong… ngày",
      "Bàn giao video gốc",
      "Yêu cầu key cần bổ sung nếu có",
      "",
      "",
      "",
      "2",
      "Sử dụng hình ảnh trong … ngày từ ngày ….",
      "",
      "",
      "",
      "Tổng giá trị Hợp đồng",
      "(Đã bao gồm toàn bộ các khoản thuế, phí và nghĩa vụ tài chính mà Hộ kinh doanh phải kê khai, nộp theo quy định pháp luật, bao gồm chính sách giảm thuế tại thời điểm xuất hóa đơn – nếu có)",
      "",
      "",
      "Thỏa thuận Hoa hồng Affiliate (nếu áp dụng)",
      "Hoa hồng affiliate gồm hai loại như sau:",
      "Hoa hồng organic: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh tự nhiên từ video, được ghi nhận thông qua link/mã theo dõi của Bên B và không bao gồm doanh thu phát sinh từ ngân sách quảng cáo do Bên A hoặc bên thứ ba chi trả. ",
      "Hoa hồng chạy ads: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh từ video được sử dụng để chạy quảng cáo, với điều kiện doanh thu đó được ghi nhận thông qua link/mã theo dõi của Bên B và được Bên A xác nhận trong báo cáo đối soát.",
      "Doanh thu làm căn cứ tính hoa hồng là doanh thu đã hoàn tất (không bao gồm đơn hủy, hoàn trả hoặc gian lận), theo dữ liệu của nền tảng và/hoặc hệ thống của Bên A; ",
      "Hoa hồng affiliate do nền tảng chi trả trực tiếp cho Bên B. Bên B tự chịu trách nhiệm kê khai, khấu trừ và nộp các loại thuế, phí liên quan đến khoản thu nhập từ hoa hồng affiliate theo quy định pháp luật.     ",
      " Hình thức thanh toán",
      "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
      "Tên chủ tài khoản: ",
      "Số tài khoản: ",
      "Tại Ngân hàng: ",
      " Thời hạn thanh toán",
      "Thanh toán 1 lần",
      "Phí dịch vụ được thanh toán 01 (một) lần trong vòng 07 - 10 ngày làm việc (không bao gồm thứ Bảy, Chủ nhật và ngày nghỉ lễ) kể từ thời điểm đáp ứng đầy đủ các điều kiện sau:",
      "Bên B đã hoàn thành dịch vụ theo Hợp đồng; ",
      "Hai Bên đã hoàn tất ký kết Hợp đồng, biên bản nghiệm thu và Bên A đã nhận được Hợp đồng, biên bản nghiệm thu có đầy đủ chữ ký của hai Bên; ",
      "Bên B đã cung cấp hóa đơn hộ kinh doanh hợp lệ (toàn bộ giá trị Hợp đồng) cho Bên A.",
      "Thanh toán 2 lần",
      "Phí dịch vụ được thanh toán thành 02 (hai) lần như sau:",
      "Lần 1: Bên A tạm ứng số tiền … trong vòng … ngày làm việc (không bao gồm thứ Bảy, Chủ nhật và ngày nghỉ lễ) kể từ thời điểm đáp ứng đầy đủ các điều kiện sau: ",
      "Hai Bên đã hoàn tất ký kết Hợp đồng và Bên A đã nhận được Hợp đồng có đầy đủ chữ ký của hai Bên; ",
      "Bên B đã cung cấp hóa đơn hộ kinh doanh hợp lệ tương ứng với giá trị thanh toán đợt 1 cho Bên A.",
      "Lần 2: Bên A thanh toán phần giá trị còn lại trong vòng … ngày làm việc (không bao gồm thứ Bảy, Chủ nhật và ngày nghỉ lễ) kể từ thời điểm đáp ứng đầy đủ các điều kiện sau: ",
      "Bên B đã hoàn thành dịch vụ theo Hợp đồng; ",
      "Hai Bên đã ký Biên bản nghiệm thu dịch vụ, Bên A đã nhận được đầy đủ Hợp đồng và Biên bản nghiệm thu có chữ ký của hai Bên; ",
      "Bên B đã cung cấp hóa đơn hộ kinh doanh hợp lệ tương ứng với giá trị thanh toán đợt 2 cho Bên A.",
      "",
      "ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A",
      "4.1. Quyền của Bên A",
      "Quyền kiểm tra, giám sát: Bên A có quyền kiểm tra và giám sát Bên B thực hiện công việc đúng nội dung, chất lượng, tiến độ theo Hợp đồng; có quyền phê duyệt hoặc đưa ra ý kiến trong thời gian hợp lý đối với các nội dung, đề xuất của Bên B.",
      "Quyền chỉnh sửa kịch bản: Bên A có quyền kiểm tra và yêu cầu Bên B chỉnh sửa nội dung kịch bản trước khi sản xuất/trước khi đăng tải trong trường hợp nội dung chưa phù hợp với yêu cầu đã thống nhất.",
      "Quyền chỉnh sửa sản phẩm: Trường hợp nội dung video/bài đăng do Bên B đăng tải không đúng với nội dung đã được hai Bên thống nhất, Bên A có quyền yêu cầu Bên B chỉnh sửa, gỡ bỏ hoặc thay thế ngay nội dung đã đăng tải sai.",
      "4.2. Nghĩa vụ của Bên A",
      "Thanh toán đầy đủ và đúng hạn Phí Booking cho Bên B theo Hợp đồng;",
      "Cung cấp đầy đủ, kịp thời các thông tin, tài liệu, sản phẩm mẫu và phối hợp với Bên B để triển khai dịch vụ theo Hợp đồng;",
      "Không sử dụng hình ảnh, nội dung hoặc danh tiếng của Bên B theo cách gây ảnh hưởng tiêu cực đến uy tín hoặc hình ảnh cá nhân của Bên B.",
      "",
      "ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B",
      "5.1.   Quyền của Bên B",
      "Yêu cầu Bên A cung cấp đầy đủ thông tin, tài liệu, sản phẩm mẫu, guideline, chính sách thương hiệu và các dữ liệu cần thiết để thực hiện dịch vụ; ",
      "Yêu cầu Bên A phối hợp phản hồi, xác nhận nội dung, kế hoạch triển khai; ",
      "Được sử dụng tên thương mại, nhãn hiệu, hình ảnh sản phẩm của Bên A trong phạm vi cần thiết để thực hiện dịch vụ theo Hợp đồng.",
      " Nghĩa vụ của Bên B",
      "Nghĩa vụ thực hiện dịch vụ: Thực hiện công việc đúng nội dung, chất lượng, số lượng, thời hạn, nền tảng theo Hợp đồng đã ký kết; không được chuyển giao, ủy quyền cho bên thứ ba thực hiện công việc; chủ động thông báo kịp thời cho Bên A về bất kỳ sự kiện nào có thể ảnh hưởng đến việc thực hiện dịch vụ.",
      "Nghĩa vụ duy trì nội dung đã đăng tải:",
      "Bên B không được tự ý xóa, ẩn hoặc hạn chế hiển thị đối với nội dung (bao gồm video, bài đăng) đã đăng tải theo Hợp đồng. Trong trường hợp nội dung phát sinh lỗi kỹ thuật do nền tảng (bao gồm nhưng không giới hạn: mất tiếng, lỗi hình ảnh, lỗi hiển thị hoặc các sự cố tương tự), Bên B có nghĩa vụ phối hợp với Bên A để khắc phục và đăng tải lại nội dung trong thời gian sớm nhất theo yêu cầu của Bên A.",
      "Nghĩa vụ về nội dung và trách nhiệm quảng cáo: Bên B là người chuyển tải sản phẩm quảng cáo theo quy định pháp luật và cam kết tuân thủ quy định tại Luật Quảng cáo, Luật Bảo vệ quyền lợi người tiêu dùng hiện hành cũng như quy định của sàn TMĐT.",
      "Nghĩa vụ tư vấn nội dung: Bên B có nghĩa vụ tư vấn, đề xuất nội dung, thông điệp và định hướng triển khai phù hợp với đặc thù nền tảng, hành vi người dùng, mục tiêu chiến dịch… nhằm tối ưu hiệu quả truyền thông.",
      "Nghĩa vụ bảo vệ hình ảnh và uy tín nhãn hiệu: Bên B cam kết bảo vệ hình ảnh, uy tín của nhãn hiệu và Bên A bằng việc không thực hiện bất kỳ hành vi, phát ngôn hoặc đăng tải nội dung nào gây ảnh hưởng tiêu cực, gây hiểu nhầm hoặc chưa được kiểm chứng liên quan đến Bên A hoặc sản phẩm/dịch vụ, cũng như không sử dụng ngôn từ, hình ảnh phản cảm, vi phạm pháp luật hoặc không phù hợp với định vị thương hiệu của Bên A; các nghĩa vụ này áp dụng trong suốt thời gian thực hiện Hợp đồng và kéo dài ít nhất 06 tháng sau khi chấm dứt việc hợp tác với nhãn hàng.",
      "Nghĩa vụ bảo vệ hình ảnh và uy tín cá nhân: Bên B cam kết duy trì danh tiếng cá nhân, không để xảy ra các sự kiện, hành vi hoặc phát ngôn có thể gây scandal, tranh cãi hoặc ảnh hưởng trực tiếp hoặc gián tiếp đến uy tín của Bên A; trong trường hợp phát sinh sự kiện có nguy cơ ảnh hưởng tiêu cực, Bên B phải thông báo kịp thời và phối hợp với Bên A để xử lý phù hợp.",
      "",
      "ĐIỂU 6: PHẠT VI PHẠM, BỒI THƯỜNG THIỆT HẠI",
      "6.1. Vi phạm của Bên A",
      "Chậm thanh toán: Trừ trường hợp bất khả kháng hoặc do lỗi của Bên B, nếu Bên A chậm thanh toán quá 30 (ba mươi) ngày so với thời hạn đã thỏa thuận (thời hạn thanh toán được tính từ thời điểm Bên B hoàn tất chứng từ thanh toán), Bên A phải trả lãi chậm thanh toán với mức lãi suất 8%/năm trên số tiền chậm trả, tính theo số ngày chậm thanh toán.",
      "6.2. Vi phạm của Bên B",
      "Vi phạm tiến độ thực hiện: Trường hợp Bên B không thực hiện đúng tiến độ theo Hợp đồng mà không do lỗi của Bên A hoặc yếu tố khách quan, Bên A sẽ gia hạn để Bên B khắc phục kịp thời theo tiến độ của dự án. Nếu Bên B không khắc phục trong vòng 3 – 5 ngày hoặc xong trước deadline cuối của dự án, Bên B phải chịu phạt tương đương 1% giá trị phí dịch vụ của hạng mục công việc bị vi phạm cho mỗi ngày chậm, tổng mức phạt không vượt quá 8% giá trị hạng mục đó hoặc Bên A có quyền không nghiệm thu và không trả phí cho hạng mục công việc hoàn thành muộn.",
      "Vi phạm nghĩa vụ về về nội dung và trách nhiệm quảng cáo: Bên A có quyền yêu cầu Bên B gỡ bỏ, chỉnh sửa nội dung và chịu mọi trách nhiệm phát sinh; đồng thời Bên A có quyền giảm trừ hoặc không thanh toán phần Phí Dịch vụ liên quan đến nội dung vi phạm pháp luật hoặc đơn phương chấm dứt Hợp đồng tùy theo mức độ nghiêm trọng của sự việc. ",
      "Vi phạm nghĩa vụ bảo vệ hình ảnh, uy tín và danh tiếng thương hiệu và danh tiếng cá nhân của Bên B: Bên A có quyền đơn phương chấm dứt Hợp đồng, từ chối thanh toán phần phí dịch vụ liên quan đến sai phạm và yêu cầu Bên B thực hiện các biện pháp khắc phục (bao gồm đính chính, gỡ bỏ nội dung nếu có).",
      "6.3. Bồi thường thiệt hại",
      "Bên nào vi phạm nghĩa vụ theo Hợp đồng gây thiệt hại cho Bên còn lại thì phải bồi thường toàn bộ thiệt hại thực tế, trực tiếp phát sinh theo quy định của pháp luật.",
      "",
      "ĐIỀU 7: HIỆU LỰC VÀ CHẤM DỨT HỢP ĐỒNG ",
      "7.1. Hiệu lực: Hợp đồng có hiệu lực trong thời hạn 01 (một) năm kể từ ngày ký hoặc đến thời điểm Hai Bên hoàn tất nghiệm thu, thanh lý Hợp đồng theo quy định tại Hợp đồng này, tùy thời điểm nào đến trước.",
      "7.2. Các trường hợp chấm dứt hợp đồng",
      "Hai bên cùng thỏa thuận chấm dứt Hợp đồng",
      "Bên A có quyền đơn phương chấm dứt Hợp đồng theo mục c, d khoản 6.2, Điều 6 của Hợp đồng này.",
      "Bên B có quyền đơn phương chấm dứt Hợp đồng nếu Bên A vi phạm nghĩa vụ thanh toán quá 30 ngày.",
      "7.3. Thanh lý Hợp đồng",
      "Hai Bên bắt buộc ký Biên bản nghiệm thu và/hoặc Biên bản thanh lý trong các trường hợp sau:",
      "Giá trị nghiệm thu hoặc thanh toán thực tế từ 20.000.000 đồng trở lên; hoặc",
      "Giá trị nghiệm thu/thanh toán thực tế dưới 20.000.000 đồng nhưng khác với giá trị Hợp đồng đã ký kết.",
      "Hợp đồng được tự động nghiệm thu và thanh lý mà không cần ký Biên bản nghiệm thu hoặc Biên bản thanh lý khi đồng thời đáp ứng đầy đủ các điều kiện sau:",
      "Giá trị Hợp đồng dưới 20.000.000 đồng;",
      "Giá trị nghiệm thu thực tế và giá trị thanh toán thực tế đúng bằng giá trị Hợp đồng;",
      "Hai Bên đã hoàn tất toàn bộ quyền và nghĩa vụ theo Hợp đồng.",
      "Thời điểm đáp ứng đầy đủ các điều kiện tự động nghiệm thu và thanh lý được xem là thời điểm Hợp đồng được nghiệm thu, thanh lý và chấm dứt hiệu lực.",
      "",
      "ĐIỀU 8: BẢO MẬT THÔNG TIN",
      "Trong quá trình thực hiện Hợp đồng và sau khi Hợp đồng chấm dứt, mỗi Bên (sau đây gọi là “Bên Nhận Thông Tin”) có nghĩa vụ bảo mật tuyệt đối đối với mọi thông tin, tài liệu do Bên còn lại (“Bên Tiết Lộ”) cung cấp hoặc phát sinh liên quan đến việc thực hiện Hợp đồng, bao gồm nhưng không giới hạn các điều khoản Hợp đồng, dữ liệu, tài liệu, kế hoạch kinh doanh, thông tin tài chính, chiến lược marketing, bí mật kinh doanh và các thông tin có tính chất bảo mật khác (“Thông Tin Mật”); theo đó, Bên Nhận Thông Tin không được tiết lộ, công bố hoặc sử dụng Thông Tin Mật cho bất kỳ mục đích nào ngoài việc thực hiện Hợp đồng nếu không có sự chấp thuận trước bằng văn bản của Bên Tiết Lộ.",
      "Bên vi phạm phải chịu trách nhiệm bồi thường toàn bộ thiệt hại phát sinh cho Bên còn lại và các bên liên quan (nếu có).",
      "Thời hạn bảo mật: Nghĩa vụ bảo mật tiếp tục có hiệu lực sau khi Hợp Đồng chấm dứt hoặc hết hạn, cho đến khi Thông Tin Bảo Mật trở thành thông tin công khai hợp pháp.",
      "",
      "ĐIỀU 9: BẤT KHẢ KHÁNG",
      "Một Bên sẽ không bị xem là vi phạm Hợp Đồng nếu việc chậm trễ hoặc không thực hiện nghĩa vụ do sự kiện khách quan, không thể lường trước và không thể khắc phục mặc dù đã áp dụng mọi biện pháp cần thiết (“Sự Kiện Bất Khả Kháng”), bao gồm nhưng không giới hạn: thiên tai, hỏa hoạn, chiến tranh, bạo loạn, đình công, dịch bệnh, hoặc các quyết định, hạn chế của cơ quan nhà nước có thẩm quyền. Bên bị ảnh hưởng phải thông báo bằng văn bản cho Bên còn lại trong vòng 03 ngày làm việc kể từ khi xảy ra sự kiện, nêu rõ bản chất sự kiện, phạm vi ảnh hưởng và thời gian dự kiến khắc phục.",
      "",
      "ĐIỀU 10: ĐIỀU KHOẢN CHUNG",
      "Luật áp dụng: Hợp Đồng này được điều chỉnh và giải thích theo pháp luật Việt Nam.",
      "Giải quyết tranh chấp: Mọi tranh chấp phát sinh từ hoặc liên quan đến Hợp Đồng sẽ được ưu tiên giải quyết thông qua thương lượng, hòa giải giữa các Bên. Nếu tranh chấp không được giải quyết trong vòng 30 (ba mươi) ngày kể từ ngày một Bên thông báo bằng văn bản về tranh chấp, tranh chấp sẽ được đưa ra Tòa án có thẩm quyền tại Việt Nam để giải quyết.",
      "Hợp đồng này được lập thành 02 bản, mỗi Bên giữ 01 bản, có giá trị pháp lý như nhau.",
      "",
      "ĐẠI DIỆN BÊN A",
      "ĐẠI DIỆN BÊN B",
      "",
      "",
      "",
      "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
      "http://www.upbase.asia",
      "Trang 1 ",
      "",
      "",
      "",
      "",
      "",
      "",
      "BM.HĐ.VID.HKD.Ver052026",
      "",
      ""
    ],
    "blocks": [
      {
        "kind": "p",
        "part": "word/header1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/header2.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/header2.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header2.xml",
                  "paragraph": 1,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header2.xml",
                  "paragraph": 2,
                  "text": "BM.HĐ.VID.HKD.Ver052026",
                  "align": "right"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/header2.xml",
        "paragraph": 3,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/header3.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 0,
        "text": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 1,
        "text": "Độc lập – Tự do – Hạnh phúc",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 2,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 3,
        "text": "HỢP ĐỒNG DỊCH VỤ BOOKING VIDEO",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 4,
        "text": "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "align": "center",
        "boldPrefix": 4
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 5,
        "text": "Căn cứ: ",
        "bold": true,
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 6,
        "text": "Bộ luật Dân sự số 91/2015/QH13, có hiệu lực từ ngày 01/01/2017;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 7,
        "text": "Luật Thương mại số 36/2005/QH11, có hiệu lực từ ngày 01/01/2006;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 8,
        "text": "Luật Thương mại điện tử số 122/2025/QH15, có hiệu lực từ ngày 01/07/2026;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 9,
        "text": "Nghị định số 147/2024/NĐ-CP về quản lý, cung cấp và sử dụng dịch vụ Internet và thông tin trên mạng, có hiệu lực từ ngày 25/12/2024; ",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 10,
        "text": "Luật Quảng cáo số 16/2012/QH13 có hiệu lực từ ngày 01/01/2013;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 11,
        "text": "Luật sửa đổi, bổ sung một số điều của Luật Quảng cáo số 75/2025/QH15, có hiệu lực từ ngày 01/01/2026;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 12,
        "text": "Luật Sở hữu Trí tuệ số 50/2005/QH11, có hiệu lực từ ngày 01/07/2006;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 13,
        "text": "Luật Sửa đổi bổ sung một số điều của Luật Sở hữu Trí tuệ số 131/2025/QH15, có hiệu lực từ ngày 01/04/2026;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 14,
        "text": "Nhu cầu và khả năng của hai Bên.",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 15,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 16,
        "text": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 17,
        "text": "",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 18,
                  "text": "BÊN SỬ DỤNG DỊCH VỤ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 4
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 19,
                  "text": "BÊN A",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 20,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 21,
                  "text": "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 22,
                  "text": "Mã số thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 23,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 24,
                  "text": "0109361325",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 25,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 26,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 27,
                  "text": "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 28,
                  "text": "Người đại diện",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 29,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 30,
                  "text": "Ông Đỗ Văn Giang   ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 31,
                  "text": "Sau đây gọi tắt là “Bên A”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 32,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 33,
                  "text": "BÊN CUNG ỨNG DỊCH VỤ ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 3
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 34,
                  "text": "BÊN B",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 35,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 36,
                  "text": "Tên Hộ kinh doanh",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 37,
                  "text": "Mã số thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 38,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 39,
                  "text": "MST hộ kinh doanh",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 40,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 41,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 42,
                  "text": "Địa chỉ hộ kinh doanh",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 43,
                  "text": "Chủ hộ kinh doanh",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 44,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 45,
                  "text": "Họ và tên ",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 46,
                  "text": "CCCD chủ hộ kinh doanh",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 47,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 48,
                  "text": "Số… cấp ngày … tại…",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 49,
                  "text": "Số điện thoại",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 50,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 51,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 52,
                  "text": "Email",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 53,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 54,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 55,
                  "text": "Sau đây gọi tắt là “Bên B”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 56,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 57,
        "text": "Bên A có nhu cầu triển khai các hoạt động quảng bá sản phẩm thông qua các KOL/KOC trên các nền tảng truyền thông. Hai bên cùng hợp tác ký kết hợp đồng dịch vụ nhằm quảng cáo, tiếp thị, thúc đẩy doanh số kinh doanh với các điều khoản như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 58,
        "text": "ĐIỀU 1: ĐỊNH NGHĨA",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 59,
                  "text": "Khái niệm",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 60,
                  "text": "Định nghĩa",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 61,
                  "text": "Tài khoản mạng xã hội",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 62,
                  "text": "Là tài khoản mạng xã hội có link: …"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 63,
                  "text": "Bên B là chủ sở hữu hợp pháp và có toàn quyền quản lý, vận hành tài khoản mạng xã hội trong suốt thời gian thực hiện Hợp đồng. ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 64,
                  "text": "Tiếp thị ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 65,
                  "text": "liên kết ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 66,
                  "text": "(Affiliate)",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 67,
                  "text": "Là việc Bên B quảng bá sản phẩm/dịch vụ thông qua cơ chế của nền tảng thương mại điện tử (sàn TMĐT) (bao gồm link, mã, giỏ hàng hoặc công cụ tương đương), trong đó doanh thu chỉ được ghi nhận khi được hệ thống nền tảng xác nhận. Hoa hồng và doanh thu được xác định theo dữ liệu cuối cùng từ nền tảng và có thể bị điều chỉnh trong trường hợp hoàn đơn, gian lận hoặc vi phạm chính sách.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 68,
                  "text": "Booking video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 69,
                  "text": "Booking video là việc Bên A thuê Bên B sản xuất và đăng tải Video theo các yêu cầu cụ thể của Bên A, có nội dung review, đánh giá, giới thiệu, quảng bá sản phẩm và thúc đẩy doanh số bán hàng (có thể bao gồm các cơ chế như gắn link, mã, giỏ hàng hoặc kêu gọi hành động). ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 70,
                  "text": "Phí dịch vụ booking",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 71,
                  "text": "Phí dịch vụ booking là khoản phí cố định Bên A thanh toán cho Bên B theo Hợp đồng.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 72,
                  "text": "Hoa hồng",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 73,
                  "text": "Là khoản thu nhập của Bên B dựa trên doanh thu Affiliate hợp lệ được nền tảng chi trả. Bên B tự chịu trách nhiệm kê khai, nộp thuế và các nghĩa vụ tài chính liên quan đến khoản hoa hồng này theo quy định pháp luật (nếu áp dụng).",
                  "align": "justify"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 74,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 75,
        "text": "ĐIỀU 2: PHẠM VI CÔNG VIỆC",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 76,
        "text": " Phạm vi công việc cần thực hiện",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 77,
        "text": "Bên B thực hiện sản xuất và đăng tải video trên các nền tảng mạng xã hội.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 78,
        "text": "Phạm vi công việc mở rộng:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 79,
        "text": "Gắn công cụ bán hàng: Gắn link, giỏ hàng, mã theo dõi, mã giảm giá, hashtag, CTA …; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 80,
        "text": "Hỗ trợ quảng cáo: Cho phép Bên A hoặc bên thứ ba do Bên A chỉ định sử dụng nội dung video để chạy quảng cáo, chia sẻ mã quảng cáo, …; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 81,
        "text": "Sử dụng hình ảnh:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 82,
        "text": "Bên A có quyền sử dụng, khai thác, chỉnh sửa kỹ thuật, resize, cắt ghép định dạng, biên tập, chuyển thể, lồng ghép, tái sử dụng và phân phối lại hình ảnh, video, nội dung do Bên B thực hiện để phục vụ hoạt động truyền thông, quảng bá và thương mại cho nhãn hàng/sản phẩm theo phạm vi đã thỏa thuận tại Hợp đồng.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 83,
        "text": "Bên A được quyền đăng tải lại video trên kênh chính thức của nhãn hàng; sử dụng hình ảnh/video làm banner, hình ảnh trưng bày trên gian hàng TMĐT, website, landing page, nền tảng số hoặc các kênh truyền thông khác của nhãn hàng; đồng thời được quyền cho phép các KOC/KOL/người dùng khác duet, stitch, chia sẻ hoặc sử dụng lại nội dung nhằm phục vụ hoạt động quảng bá chiến dịch trong phạm vi đã thỏa thuận.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 84,
        "text": "Bên A được quyền sử dụng hình ảnh, giọng nói, tên, hình tượng và các yếu tố nhận diện của Bên B/KOL xuất hiện trong nội dung nhằm phục vụ hoạt động quảng cáo, truyền thông và thương mại cho nhãn hàng/sản phẩm theo phạm vi sử dụng đã thỏa thuận.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 85,
        "text": "Phạm vi sử dụng bao gồm nhưng không giới hạn tại: website, landing page, sàn thương mại điện tử, Facebook, TikTok, Instagram, YouTube và các nền tảng số khác của nhãn hàng.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 86,
        "text": "Nội dung được phép sử dụng trong các hoạt động digital marketing, social seeding, PR, media booking, livestream, affiliate marketing, e-commerce campaign và các hoạt động quảng bá sản phẩm/nhãn hàng khác theo nhu cầu truyền thông thực tế của Bên A.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 87,
        "text": "Tham gia hoạt động truyền thông và sự kiện: Tham gia event …; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 88,
        "text": "Triển khai các định dạng nội dung khác: Thực hiện các bài đăng ngoài video như hình ảnh, carousel, bài viết, caption, story, reel hoặc các định dạng nội dung khác.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 89,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 90,
        "text": "Quy trình cung ứng dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 91,
                  "text": "Bước",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 92,
                  "text": "Tên bước",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 93,
                  "text": "Mô tả công việc",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 94,
                  "text": "1",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 95,
                  "text": "Ký Hợp đồng ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 96,
                  "text": "dịch vụ ",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 97,
                  "text": "Hai Bên ký Hợp đồng dịch vụ làm cơ sở pháp lý điều chỉnh toàn bộ hoạt động hợp tác.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 98,
                  "text": "2",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 99,
                  "text": "Yêu cầu dịch vụ",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 100,
                  "text": "Bên A gửi brief/yêu cầu cung ứng dịch vụ, bao gồm: thông tin chiến dịch, sản phẩm/dịch vụ, nội dung quảng bá, nền tảng triển khai, timeline và các yêu cầu liên quan.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 101,
                  "text": "4",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 102,
                  "text": "Dựng kịch bản",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 103,
                  "text": "Bên B xây dựng kịch bản và nội dung video dựa trên brief của Bên A và gửi Bên A phê duyệt trước khi sản xuất.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 104,
                  "text": "5",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 105,
                  "text": "Duyệt kịch bản",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 106,
                  "text": "Bên A xem xét, phản hồi và yêu cầu chỉnh sửa (nếu có).",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 107,
                  "text": "Tối đa 01 vòng chỉnh sửa trước khi duyệt cuối cùng.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 108,
                  "text": "6",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 109,
                  "text": "Sản xuất video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 110,
                  "text": "Bên B tiến hành quay dựng, chỉnh lý, biên tập, hậu kỳ video theo kịch bản đã thống nhất.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 111,
                  "text": "7",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 112,
                  "text": "Duyệt video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 113,
                  "text": "Bên A xem xét, phản hồi và yêu cầu chỉnh sửa (nếu có). ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 114,
                  "text": "Tối đa 01 vòng chỉnh sửa trước khi duyệt cuối cùng.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 115,
                  "text": "8",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 116,
                  "text": "Đăng tải video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 117,
                  "text": "Bên B đăng tải nội dung theo đúng nội dung đã duyệt, đúng tài khoản và timeline.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 118,
                  "text": "9",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 119,
                  "text": "Ghi nhận ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 120,
                  "text": "kết quả",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 121,
                  "text": "Ghi nhận các chỉ số: lượt xem, tương tác, đơn hàng, GMV… theo dữ liệu từ nền tảng.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 122,
                  "text": "10",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 123,
                  "text": "Nghiệm thu",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 124,
                  "text": "Bên A kiểm tra việc thực hiện dịch vụ theo Hợp đồng này.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 125,
                  "text": "11",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 126,
                  "text": "Thanh toán phí Booking",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 127,
                  "text": "Bên A thực hiện thanh toán phí booking theo Hợp đồng này.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 128,
                  "text": "12",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 129,
                  "text": "Đối soát Affiliate",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 130,
                  "text": "(nếu có)",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 131,
                  "text": "Hoa hồng Affiliate do nền tảng chi trả trực tiếp cho Bên B theo dữ liệu hệ thống.",
                  "align": "justify"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 132,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 133,
        "text": "2.3. Tiêu chuẩn nghiệm thu dịch vụ ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 134,
        "text": "Tiêu chuẩn về nội dung và đăng tải",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 135,
        "text": "Video phải tuân thủ đầy đủ kịch bản, thông điệp và guideline do Bên A cung cấp; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 136,
        "text": "Bao gồm đầy đủ các yếu tố yêu cầu (nếu có): link, giỏ hàng, mã theo dõi, hashtag, CTA…; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 137,
        "text": "Chỉ được đăng tải sau khi có phê duyệt nội dung từ Bên A; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 138,
        "text": "Đăng tải đúng tài khoản, đúng thời điểm và duy trì hiển thị, không được xóa video sau khi đăng tải mà không có sự chấp thuận hoặc yêu cầu của Bên A; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 139,
        "text": "Nếu video bị ẩn, xóa, tắt âm thanh… hoặc các lỗi tương đương ảnh hưởng đến việc hiển thị bình thường của video trên nền tảng thì Bên B có nghĩa vụ phải chỉnh lý, đăng tải lại video đã khắc phục lỗi.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 140,
        "text": "Không vi phạm pháp luật, chính sách nền tảng hoặc gây ảnh hưởng tiêu cực đến hình ảnh thương hiệu. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 141,
        "text": "Tiêu chuẩn về kịch bản và sản xuất",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 142,
        "text": "Kịch bản phải được Bên A phê duyệt bằng email/tin nhắn/văn bản trước khi quay dựng; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 143,
        "text": "Mọi chi phí phát sinh do sản xuất khi chưa có phê duyệt hợp lệ do Bên B tự chi trả; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 144,
        "text": "Cảnh quay, bố cục và thông điệp phải phù hợp với kịch bản đã duyệt; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 145,
        "text": "Trường hợp sai lệch, Bên A có quyền từ chối nghiệm thu và yêu cầu chỉnh sửa hoặc quay lại mà không phát sinh chi phí. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 146,
        "text": "Tiêu chuẩn về chất lượng và hậu kỳ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 147,
        "text": "Video phải được dựng và hoàn thiện theo tiêu chuẩn đã thống nhất (video mẫu, guideline thương hiệu); ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 148,
        "text": "Bên B có trách nhiệm chỉnh sửa theo yêu cầu hợp lý của Bên A cho đến khi đạt tiêu chuẩn nghiệm thu.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 149,
        "text": "Tiêu chuẩn về hình ảnh và nhận diện",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 150,
        "text": "Bên B phải kiểm soát trang phục, bối cảnh, nhận diện cá nhân và các yếu tố hình ảnh khác nhằm không được gây trùng lặp, xung đột hoặc ảnh hưởng tiêu cực đến hiệu quả truyền thông của Bên A;",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 151,
        "text": "Trường hợp vi phạm, Bên B phải chỉnh sửa, thay thế hoặc quay lại nội dung cho đến khi đạt yêu cầu, không làm ảnh hưởng tiến độ cam kết. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 152,
        "text": "Áp dụng đối với dịch vụ khác: tiêu chuẩn nghiệm thu được áp dụng theo quy định cụ thể tại mô tả dịch vụ (nếu có).",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 153,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 154,
        "text": "ĐIỀU 3: PHÍ DỊCH VỤ VÀ THANH TOÁN",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 155,
        "text": "Phí dịch vụ booking",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 156,
                  "text": "STT",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 157,
                  "text": "Hạng mục",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 158,
                  "text": "Đơn giá",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 159,
                  "text": "(VNĐ)",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 160,
                  "text": "Số lượng",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 161,
                  "text": "Thành tiền (VNĐ)",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 162,
                  "text": "1"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 163,
                  "text": "Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 164,
                  "text": "Tài khoản đăng tải – link: ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 165,
                  "text": "Thời gian đăng tải:",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 166,
                  "text": "Thời lượng video:",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 167,
                  "text": "Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 168,
                  "text": "Cấp mã code để chạy quảng cáo trong… ngày",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 169,
                  "text": "Bàn giao video gốc",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 170,
                  "text": "Yêu cầu key cần bổ sung nếu có",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 171,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 172,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 173,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 174,
                  "text": "2"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 175,
                  "text": "Sử dụng hình ảnh trong … ngày từ ngày …."
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 176,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 177,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 178,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 179,
                  "text": "Tổng giá trị Hợp đồng",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 180,
                  "text": "(Đã bao gồm toàn bộ các khoản thuế, phí và nghĩa vụ tài chính mà Hộ kinh doanh phải kê khai, nộp theo quy định pháp luật, bao gồm chính sách giảm thuế tại thời điểm xuất hóa đơn – nếu có)",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 4
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 181,
                  "text": "",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 182,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 183,
        "text": "Thỏa thuận Hoa hồng Affiliate (nếu áp dụng)",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 184,
        "text": "Hoa hồng affiliate gồm hai loại như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 185,
        "text": "Hoa hồng organic: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh tự nhiên từ video, được ghi nhận thông qua link/mã theo dõi của Bên B và không bao gồm doanh thu phát sinh từ ngân sách quảng cáo do Bên A hoặc bên thứ ba chi trả. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 186,
        "text": "Hoa hồng chạy ads: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh từ video được sử dụng để chạy quảng cáo, với điều kiện doanh thu đó được ghi nhận thông qua link/mã theo dõi của Bên B và được Bên A xác nhận trong báo cáo đối soát.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 187,
        "text": "Doanh thu làm căn cứ tính hoa hồng là doanh thu đã hoàn tất (không bao gồm đơn hủy, hoàn trả hoặc gian lận), theo dữ liệu của nền tảng và/hoặc hệ thống của Bên A; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 188,
        "text": "Hoa hồng affiliate do nền tảng chi trả trực tiếp cho Bên B. Bên B tự chịu trách nhiệm kê khai, khấu trừ và nộp các loại thuế, phí liên quan đến khoản thu nhập từ hoa hồng affiliate theo quy định pháp luật.     ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 189,
        "text": " Hình thức thanh toán",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 190,
        "text": "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 191,
        "text": "Tên chủ tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 192,
        "text": "Số tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 193,
        "text": "Tại Ngân hàng: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 194,
        "text": " Thời hạn thanh toán",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 195,
                  "text": "Thanh toán 1 lần",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 196,
                  "text": "Phí dịch vụ được thanh toán 01 (một) lần trong vòng 07 - 10 ngày làm việc (không bao gồm thứ Bảy, Chủ nhật và ngày nghỉ lễ) kể từ thời điểm đáp ứng đầy đủ các điều kiện sau:",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 197,
                  "text": "Bên B đã hoàn thành dịch vụ theo Hợp đồng; ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 198,
                  "text": "Hai Bên đã hoàn tất ký kết Hợp đồng, biên bản nghiệm thu và Bên A đã nhận được Hợp đồng, biên bản nghiệm thu có đầy đủ chữ ký của hai Bên; ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 199,
                  "text": "Bên B đã cung cấp hóa đơn hộ kinh doanh hợp lệ (toàn bộ giá trị Hợp đồng) cho Bên A.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 200,
                  "text": "Thanh toán 2 lần",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 201,
                  "text": "Phí dịch vụ được thanh toán thành 02 (hai) lần như sau:"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 202,
                  "text": "Lần 1: Bên A tạm ứng số tiền … trong vòng … ngày làm việc (không bao gồm thứ Bảy, Chủ nhật và ngày nghỉ lễ) kể từ thời điểm đáp ứng đầy đủ các điều kiện sau: ",
                  "align": "justify",
                  "boldPrefix": 6
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 203,
                  "text": "Hai Bên đã hoàn tất ký kết Hợp đồng và Bên A đã nhận được Hợp đồng có đầy đủ chữ ký của hai Bên; ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 204,
                  "text": "Bên B đã cung cấp hóa đơn hộ kinh doanh hợp lệ tương ứng với giá trị thanh toán đợt 1 cho Bên A.",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 205,
                  "text": "Lần 2: Bên A thanh toán phần giá trị còn lại trong vòng … ngày làm việc (không bao gồm thứ Bảy, Chủ nhật và ngày nghỉ lễ) kể từ thời điểm đáp ứng đầy đủ các điều kiện sau: ",
                  "align": "justify",
                  "boldPrefix": 6
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 206,
                  "text": "Bên B đã hoàn thành dịch vụ theo Hợp đồng; ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 207,
                  "text": "Hai Bên đã ký Biên bản nghiệm thu dịch vụ, Bên A đã nhận được đầy đủ Hợp đồng và Biên bản nghiệm thu có chữ ký của hai Bên; ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 208,
                  "text": "Bên B đã cung cấp hóa đơn hộ kinh doanh hợp lệ tương ứng với giá trị thanh toán đợt 2 cho Bên A.",
                  "align": "justify"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 209,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 210,
        "text": "ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 211,
        "text": "4.1. Quyền của Bên A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 212,
        "text": "Quyền kiểm tra, giám sát: Bên A có quyền kiểm tra và giám sát Bên B thực hiện công việc đúng nội dung, chất lượng, tiến độ theo Hợp đồng; có quyền phê duyệt hoặc đưa ra ý kiến trong thời gian hợp lý đối với các nội dung, đề xuất của Bên B.",
        "align": "justify",
        "boldPrefix": 25
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 213,
        "text": "Quyền chỉnh sửa kịch bản: Bên A có quyền kiểm tra và yêu cầu Bên B chỉnh sửa nội dung kịch bản trước khi sản xuất/trước khi đăng tải trong trường hợp nội dung chưa phù hợp với yêu cầu đã thống nhất.",
        "align": "justify",
        "boldPrefix": 25
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 214,
        "text": "Quyền chỉnh sửa sản phẩm: Trường hợp nội dung video/bài đăng do Bên B đăng tải không đúng với nội dung đã được hai Bên thống nhất, Bên A có quyền yêu cầu Bên B chỉnh sửa, gỡ bỏ hoặc thay thế ngay nội dung đã đăng tải sai.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 215,
        "text": "4.2. Nghĩa vụ của Bên A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 216,
        "text": "Thanh toán đầy đủ và đúng hạn Phí Booking cho Bên B theo Hợp đồng;",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 217,
        "text": "Cung cấp đầy đủ, kịp thời các thông tin, tài liệu, sản phẩm mẫu và phối hợp với Bên B để triển khai dịch vụ theo Hợp đồng;",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 218,
        "text": "Không sử dụng hình ảnh, nội dung hoặc danh tiếng của Bên B theo cách gây ảnh hưởng tiêu cực đến uy tín hoặc hình ảnh cá nhân của Bên B.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 219,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 220,
        "text": "ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 221,
        "text": "5.1.   Quyền của Bên B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 222,
        "text": "Yêu cầu Bên A cung cấp đầy đủ thông tin, tài liệu, sản phẩm mẫu, guideline, chính sách thương hiệu và các dữ liệu cần thiết để thực hiện dịch vụ; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 223,
        "text": "Yêu cầu Bên A phối hợp phản hồi, xác nhận nội dung, kế hoạch triển khai; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 224,
        "text": "Được sử dụng tên thương mại, nhãn hiệu, hình ảnh sản phẩm của Bên A trong phạm vi cần thiết để thực hiện dịch vụ theo Hợp đồng.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 225,
        "text": " Nghĩa vụ của Bên B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 226,
        "text": "Nghĩa vụ thực hiện dịch vụ: Thực hiện công việc đúng nội dung, chất lượng, số lượng, thời hạn, nền tảng theo Hợp đồng đã ký kết; không được chuyển giao, ủy quyền cho bên thứ ba thực hiện công việc; chủ động thông báo kịp thời cho Bên A về bất kỳ sự kiện nào có thể ảnh hưởng đến việc thực hiện dịch vụ.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 227,
        "text": "Nghĩa vụ duy trì nội dung đã đăng tải:",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 228,
        "text": "Bên B không được tự ý xóa, ẩn hoặc hạn chế hiển thị đối với nội dung (bao gồm video, bài đăng) đã đăng tải theo Hợp đồng. Trong trường hợp nội dung phát sinh lỗi kỹ thuật do nền tảng (bao gồm nhưng không giới hạn: mất tiếng, lỗi hình ảnh, lỗi hiển thị hoặc các sự cố tương tự), Bên B có nghĩa vụ phối hợp với Bên A để khắc phục và đăng tải lại nội dung trong thời gian sớm nhất theo yêu cầu của Bên A.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 229,
        "text": "Nghĩa vụ về nội dung và trách nhiệm quảng cáo: Bên B là người chuyển tải sản phẩm quảng cáo theo quy định pháp luật và cam kết tuân thủ quy định tại Luật Quảng cáo, Luật Bảo vệ quyền lợi người tiêu dùng hiện hành cũng như quy định của sàn TMĐT.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 230,
        "text": "Nghĩa vụ tư vấn nội dung: Bên B có nghĩa vụ tư vấn, đề xuất nội dung, thông điệp và định hướng triển khai phù hợp với đặc thù nền tảng, hành vi người dùng, mục tiêu chiến dịch… nhằm tối ưu hiệu quả truyền thông.",
        "align": "justify",
        "boldPrefix": 26
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 231,
        "text": "Nghĩa vụ bảo vệ hình ảnh và uy tín nhãn hiệu: Bên B cam kết bảo vệ hình ảnh, uy tín của nhãn hiệu và Bên A bằng việc không thực hiện bất kỳ hành vi, phát ngôn hoặc đăng tải nội dung nào gây ảnh hưởng tiêu cực, gây hiểu nhầm hoặc chưa được kiểm chứng liên quan đến Bên A hoặc sản phẩm/dịch vụ, cũng như không sử dụng ngôn từ, hình ảnh phản cảm, vi phạm pháp luật hoặc không phù hợp với định vị thương hiệu của Bên A; các nghĩa vụ này áp dụng trong suốt thời gian thực hiện Hợp đồng và kéo dài ít nhất 06 tháng sau khi chấm dứt việc hợp tác với nhãn hàng.",
        "align": "justify",
        "boldPrefix": 46
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 232,
        "text": "Nghĩa vụ bảo vệ hình ảnh và uy tín cá nhân: Bên B cam kết duy trì danh tiếng cá nhân, không để xảy ra các sự kiện, hành vi hoặc phát ngôn có thể gây scandal, tranh cãi hoặc ảnh hưởng trực tiếp hoặc gián tiếp đến uy tín của Bên A; trong trường hợp phát sinh sự kiện có nguy cơ ảnh hưởng tiêu cực, Bên B phải thông báo kịp thời và phối hợp với Bên A để xử lý phù hợp.",
        "align": "justify",
        "boldPrefix": 43
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 233,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 234,
        "text": "ĐIỂU 6: PHẠT VI PHẠM, BỒI THƯỜNG THIỆT HẠI",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 235,
        "text": "6.1. Vi phạm của Bên A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 236,
        "text": "Chậm thanh toán: Trừ trường hợp bất khả kháng hoặc do lỗi của Bên B, nếu Bên A chậm thanh toán quá 30 (ba mươi) ngày so với thời hạn đã thỏa thuận (thời hạn thanh toán được tính từ thời điểm Bên B hoàn tất chứng từ thanh toán), Bên A phải trả lãi chậm thanh toán với mức lãi suất 8%/năm trên số tiền chậm trả, tính theo số ngày chậm thanh toán.",
        "align": "justify",
        "boldPrefix": 16
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 237,
        "text": "6.2. Vi phạm của Bên B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 238,
        "text": "Vi phạm tiến độ thực hiện: Trường hợp Bên B không thực hiện đúng tiến độ theo Hợp đồng mà không do lỗi của Bên A hoặc yếu tố khách quan, Bên A sẽ gia hạn để Bên B khắc phục kịp thời theo tiến độ của dự án. Nếu Bên B không khắc phục trong vòng 3 – 5 ngày hoặc xong trước deadline cuối của dự án, Bên B phải chịu phạt tương đương 1% giá trị phí dịch vụ của hạng mục công việc bị vi phạm cho mỗi ngày chậm, tổng mức phạt không vượt quá 8% giá trị hạng mục đó hoặc Bên A có quyền không nghiệm thu và không trả phí cho hạng mục công việc hoàn thành muộn.",
        "align": "justify",
        "boldPrefix": 27
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 239,
        "text": "Vi phạm nghĩa vụ về về nội dung và trách nhiệm quảng cáo: Bên A có quyền yêu cầu Bên B gỡ bỏ, chỉnh sửa nội dung và chịu mọi trách nhiệm phát sinh; đồng thời Bên A có quyền giảm trừ hoặc không thanh toán phần Phí Dịch vụ liên quan đến nội dung vi phạm pháp luật hoặc đơn phương chấm dứt Hợp đồng tùy theo mức độ nghiêm trọng của sự việc. ",
        "align": "justify",
        "boldPrefix": 58
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 240,
        "text": "Vi phạm nghĩa vụ bảo vệ hình ảnh, uy tín và danh tiếng thương hiệu và danh tiếng cá nhân của Bên B: Bên A có quyền đơn phương chấm dứt Hợp đồng, từ chối thanh toán phần phí dịch vụ liên quan đến sai phạm và yêu cầu Bên B thực hiện các biện pháp khắc phục (bao gồm đính chính, gỡ bỏ nội dung nếu có).",
        "align": "justify",
        "boldPrefix": 100
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 241,
        "text": "6.3. Bồi thường thiệt hại",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 242,
        "text": "Bên nào vi phạm nghĩa vụ theo Hợp đồng gây thiệt hại cho Bên còn lại thì phải bồi thường toàn bộ thiệt hại thực tế, trực tiếp phát sinh theo quy định của pháp luật.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 243,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 244,
        "text": "ĐIỀU 7: HIỆU LỰC VÀ CHẤM DỨT HỢP ĐỒNG ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 245,
        "text": "7.1. Hiệu lực: Hợp đồng có hiệu lực trong thời hạn 01 (một) năm kể từ ngày ký hoặc đến thời điểm Hai Bên hoàn tất nghiệm thu, thanh lý Hợp đồng theo quy định tại Hợp đồng này, tùy thời điểm nào đến trước.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 246,
        "text": "7.2. Các trường hợp chấm dứt hợp đồng",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 247,
        "text": "Hai bên cùng thỏa thuận chấm dứt Hợp đồng",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 248,
        "text": "Bên A có quyền đơn phương chấm dứt Hợp đồng theo mục c, d khoản 6.2, Điều 6 của Hợp đồng này.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 249,
        "text": "Bên B có quyền đơn phương chấm dứt Hợp đồng nếu Bên A vi phạm nghĩa vụ thanh toán quá 30 ngày.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 250,
        "text": "7.3. Thanh lý Hợp đồng",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 251,
        "text": "Hai Bên bắt buộc ký Biên bản nghiệm thu và/hoặc Biên bản thanh lý trong các trường hợp sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 252,
        "text": "Giá trị nghiệm thu hoặc thanh toán thực tế từ 20.000.000 đồng trở lên; hoặc",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 253,
        "text": "Giá trị nghiệm thu/thanh toán thực tế dưới 20.000.000 đồng nhưng khác với giá trị Hợp đồng đã ký kết.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 254,
        "text": "Hợp đồng được tự động nghiệm thu và thanh lý mà không cần ký Biên bản nghiệm thu hoặc Biên bản thanh lý khi đồng thời đáp ứng đầy đủ các điều kiện sau:",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 255,
        "text": "Giá trị Hợp đồng dưới 20.000.000 đồng;",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 256,
        "text": "Giá trị nghiệm thu thực tế và giá trị thanh toán thực tế đúng bằng giá trị Hợp đồng;",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 257,
        "text": "Hai Bên đã hoàn tất toàn bộ quyền và nghĩa vụ theo Hợp đồng.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 258,
        "text": "Thời điểm đáp ứng đầy đủ các điều kiện tự động nghiệm thu và thanh lý được xem là thời điểm Hợp đồng được nghiệm thu, thanh lý và chấm dứt hiệu lực.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 259,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 260,
        "text": "ĐIỀU 8: BẢO MẬT THÔNG TIN",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 261,
        "text": "Trong quá trình thực hiện Hợp đồng và sau khi Hợp đồng chấm dứt, mỗi Bên (sau đây gọi là “Bên Nhận Thông Tin”) có nghĩa vụ bảo mật tuyệt đối đối với mọi thông tin, tài liệu do Bên còn lại (“Bên Tiết Lộ”) cung cấp hoặc phát sinh liên quan đến việc thực hiện Hợp đồng, bao gồm nhưng không giới hạn các điều khoản Hợp đồng, dữ liệu, tài liệu, kế hoạch kinh doanh, thông tin tài chính, chiến lược marketing, bí mật kinh doanh và các thông tin có tính chất bảo mật khác (“Thông Tin Mật”); theo đó, Bên Nhận Thông Tin không được tiết lộ, công bố hoặc sử dụng Thông Tin Mật cho bất kỳ mục đích nào ngoài việc thực hiện Hợp đồng nếu không có sự chấp thuận trước bằng văn bản của Bên Tiết Lộ.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 262,
        "text": "Bên vi phạm phải chịu trách nhiệm bồi thường toàn bộ thiệt hại phát sinh cho Bên còn lại và các bên liên quan (nếu có).",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 263,
        "text": "Thời hạn bảo mật: Nghĩa vụ bảo mật tiếp tục có hiệu lực sau khi Hợp Đồng chấm dứt hoặc hết hạn, cho đến khi Thông Tin Bảo Mật trở thành thông tin công khai hợp pháp.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 264,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 265,
        "text": "ĐIỀU 9: BẤT KHẢ KHÁNG",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 266,
        "text": "Một Bên sẽ không bị xem là vi phạm Hợp Đồng nếu việc chậm trễ hoặc không thực hiện nghĩa vụ do sự kiện khách quan, không thể lường trước và không thể khắc phục mặc dù đã áp dụng mọi biện pháp cần thiết (“Sự Kiện Bất Khả Kháng”), bao gồm nhưng không giới hạn: thiên tai, hỏa hoạn, chiến tranh, bạo loạn, đình công, dịch bệnh, hoặc các quyết định, hạn chế của cơ quan nhà nước có thẩm quyền. Bên bị ảnh hưởng phải thông báo bằng văn bản cho Bên còn lại trong vòng 03 ngày làm việc kể từ khi xảy ra sự kiện, nêu rõ bản chất sự kiện, phạm vi ảnh hưởng và thời gian dự kiến khắc phục.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 267,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 268,
        "text": "ĐIỀU 10: ĐIỀU KHOẢN CHUNG",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 269,
        "text": "Luật áp dụng: Hợp Đồng này được điều chỉnh và giải thích theo pháp luật Việt Nam.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 270,
        "text": "Giải quyết tranh chấp: Mọi tranh chấp phát sinh từ hoặc liên quan đến Hợp Đồng sẽ được ưu tiên giải quyết thông qua thương lượng, hòa giải giữa các Bên. Nếu tranh chấp không được giải quyết trong vòng 30 (ba mươi) ngày kể từ ngày một Bên thông báo bằng văn bản về tranh chấp, tranh chấp sẽ được đưa ra Tòa án có thẩm quyền tại Việt Nam để giải quyết.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 271,
        "text": "Hợp đồng này được lập thành 02 bản, mỗi Bên giữ 01 bản, có giá trị pháp lý như nhau.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 272,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "signature",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 273,
                  "text": "ĐẠI DIỆN BÊN A",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 274,
                  "text": "ĐẠI DIỆN BÊN B",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 275,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/footer1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/footer2.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/footer2.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 1,
                  "text": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 2,
                  "text": "http://www.upbase.asia",
                  "align": "center"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 3,
                  "text": "Trang 1 ",
                  "align": "right"
                },
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 4,
                  "text": ""
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/footer2.xml",
        "paragraph": 5,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/footer3.xml",
        "paragraph": 0,
        "text": ""
      }
    ],
    "category": "BOOKING_VIDEO",
    "description": "Mẫu hợp đồng dịch vụ sản xuất & đăng tải video quảng cáo áp dụng cho đối tác là hộ kinh doanh.",
    "active": true,
    "defaultReviewRoles": [
      "LEGAL",
      "FINANCE"
    ],
    "exemptLegalReview": true,
    "scope": "GLOBAL",
    "updatedAt": "2026-05-01T08:00:00.000Z",
    "updatedBy": "Phòng Pháp chế",
    "fieldCount": 31,
    "requiredFieldCount": 14,
    "history": [
      {
        "version": "Ver052026",
        "hash": "823c5dac56549d503fdda748dc4aaccc94d7e1eca028443b1567a808a421aca4",
        "filename": "2.1.1. BM.HĐ.VID.HKD.Ver052026 booking Video.docx",
        "updatedAt": "2026-05-01T08:00:00.000Z",
        "updatedBy": "Phòng Pháp chế",
        "note": "Phiên bản chuẩn ban hành bởi Pháp chế"
      }
    ]
  },
  "HKD-BBNT": {
    "id": "HKD-BBNT",
    "name": "Nghiệm thu video · Hộ kinh doanh",
    "filename": "2.1.2. BM.BBNT.VID.HKD.Ver052026 booking Video.docx",
    "subject": "Hộ kinh doanh",
    "kind": "ACCEPTANCE",
    "version": "Ver052026",
    "hash": "b2ee827159c3ccb763592e6b8fdd873726a6a894f60469395a056f3ad0f636d0",
    "fields": [
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 0,
        "end": 10,
        "label": "dd.mm.yy",
        "context": "[dd.mm.yy]/BBNT/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 29,
        "end": 37,
        "label": "ID KOC",
        "context": "[dd.mm.yy]/BBNT/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 5,
        "start": 29,
        "end": 39,
        "label": "dd.mm.yy",
        "context": "Kèm theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 5,
        "start": 58,
        "end": 66,
        "label": "ID KOC",
        "context": "Kèm theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p25:cell",
        "part": "word/document.xml",
        "paragraph": 25,
        "label": "BÊN B",
        "context": "BÊN B · Tên Hộ kinh doanh",
        "required": true,
        "start": 0,
        "end": 17,
        "title": "Tên hộ kinh doanh",
        "group": "PARTY",
        "kind": "text",
        "source": "partyName"
      },
      {
        "key": "word/document.xml:p28:cell",
        "part": "word/document.xml",
        "paragraph": 28,
        "label": "Mã số thuế",
        "context": "Mã số thuế · MST hộ kinh doanh",
        "required": true,
        "start": 0,
        "end": 17,
        "title": "Mã số thuế",
        "group": "PARTY",
        "kind": "text",
        "source": "taxCode"
      },
      {
        "key": "word/document.xml:p31:cell",
        "part": "word/document.xml",
        "paragraph": 31,
        "label": "Địa chỉ",
        "context": "Địa chỉ · Địa chỉ hộ kinh doanh",
        "required": true,
        "start": 0,
        "end": 21,
        "title": "Địa chỉ",
        "group": "PARTY",
        "kind": "long",
        "source": "address"
      },
      {
        "key": "word/document.xml:p34:cell",
        "part": "word/document.xml",
        "paragraph": 34,
        "label": "Chủ hộ kinh doanh",
        "context": "Chủ hộ kinh doanh · Họ và tên",
        "required": true,
        "start": 0,
        "end": 10,
        "title": "Họ tên chủ hộ",
        "group": "PARTY",
        "kind": "text",
        "source": "ownerName"
      },
      {
        "key": "word/document.xml:p37:cell",
        "part": "word/document.xml",
        "paragraph": 37,
        "label": "CCCD chủ hộ kinh doanh",
        "context": "CCCD chủ hộ kinh doanh · Số… cấp ngày … tại…",
        "required": true,
        "start": 0,
        "end": 19,
        "title": "CCCD chủ hộ (số, ngày cấp, nơi cấp)",
        "group": "PARTY",
        "kind": "text",
        "source": "cccd"
      },
      {
        "key": "word/document.xml:p40:cell",
        "part": "word/document.xml",
        "paragraph": 40,
        "label": "Số điện thoại",
        "context": "Số điện thoại",
        "required": true,
        "title": "Số điện thoại",
        "group": "PARTY",
        "kind": "text",
        "source": "phone"
      },
      {
        "key": "word/document.xml:p43:cell",
        "part": "word/document.xml",
        "paragraph": 43,
        "label": "Email",
        "context": "Email",
        "required": true,
        "title": "Email",
        "group": "PARTY",
        "kind": "text",
        "source": "email"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 46,
        "start": 27,
        "end": 37,
        "label": "dd.mm.yy",
        "context": "Căn cứ Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC] và kết quả thực hiện công việc thực tế của Bên B.",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 46,
        "start": 56,
        "end": 64,
        "label": "ID KOC",
        "context": "Căn cứ Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC] và kết quả thực hiện công việc thực tế của Bên B.",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p58:109",
        "part": "word/document.xml",
        "paragraph": 58,
        "start": 109,
        "end": 110,
        "label": "đẩy doanh số bán hàng với sản phẩm  [điền] .",
        "context": "Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….",
        "required": false,
        "title": "Sản phẩm",
        "group": "SCOPE",
        "kind": "text",
        "source": "product"
      },
      {
        "key": "word/document.xml:p60:cell",
        "part": "word/document.xml",
        "paragraph": 60,
        "label": "Sản xuất và đăng tải Video review · Đơn giá",
        "context": "1 · Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….Link video:",
        "required": false,
        "title": "Sản xuất và đăng tải Video review · Đơn giá",
        "group": "SCOPE",
        "kind": "money",
        "source": "unitPrice"
      },
      {
        "key": "word/document.xml:p61:cell",
        "part": "word/document.xml",
        "paragraph": 61,
        "label": "Sản xuất và đăng tải Video review · Số lượng",
        "context": "1 · Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….Link video:",
        "required": false,
        "title": "Sản xuất và đăng tải Video review · Số lượng",
        "group": "SCOPE",
        "kind": "number",
        "source": "quantity"
      },
      {
        "key": "word/document.xml:p62:cell",
        "part": "word/document.xml",
        "paragraph": 62,
        "label": "Sản xuất và đăng tải Video review · Thành tiền",
        "context": "1 · Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….Link video:",
        "required": false,
        "title": "Sản xuất và đăng tải Video review · Thành tiền",
        "group": "SCOPE",
        "kind": "money",
        "source": "lineTotal"
      },
      {
        "key": "word/document.xml:p64:23",
        "part": "word/document.xml",
        "paragraph": 64,
        "start": 23,
        "end": 24,
        "label": "Sử dụng hình ảnh trong  [điền]  ngày từ ngày ….",
        "context": "Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Số ngày sử dụng hình ảnh",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p64:38",
        "part": "word/document.xml",
        "paragraph": 64,
        "start": 38,
        "end": 39,
        "label": "dụng hình ảnh trong … ngày từ ngày  [điền] .",
        "context": "Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Ngày bắt đầu sử dụng hình ảnh",
        "group": "SCOPE",
        "kind": "date"
      },
      {
        "key": "word/document.xml:p65:cell",
        "part": "word/document.xml",
        "paragraph": 65,
        "label": "Sử dụng hình ảnh trong · Đơn giá",
        "context": "2 · Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Sử dụng hình ảnh trong · Đơn giá",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p66:cell",
        "part": "word/document.xml",
        "paragraph": 66,
        "label": "Sử dụng hình ảnh trong · Số lượng",
        "context": "2 · Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Sử dụng hình ảnh trong · Số lượng",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p67:cell",
        "part": "word/document.xml",
        "paragraph": 67,
        "label": "Sử dụng hình ảnh trong · Thành tiền",
        "context": "2 · Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Sử dụng hình ảnh trong · Thành tiền",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p70:cell",
        "part": "word/document.xml",
        "paragraph": 70,
        "label": "Tổng giá trị Hợp đồng(Đã bao gồm toàn bộ các khoản thuế, phí và nghĩa vụ tài chính mà Hộ kinh doanh phải kê khai, nộp theo quy định pháp luật, bao gồm cả chính sách giảm thuế (nếu có) tại thời điểm xuất hóa đơn)",
        "context": "Tổng giá trị Hợp đồng(Đã bao gồm toàn bộ các khoản thuế, phí và nghĩa vụ tài chính mà Hộ kinh doanh phải kê khai, nộp theo quy định pháp luật, bao gồm cả chính sách giảm thuế (nếu có) tại thời điểm xuất hóa đơn)",
        "required": false,
        "title": "Tổng giá trị Hợp đồng",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p82:cell",
        "part": "word/document.xml",
        "paragraph": 82,
        "label": "Tổng giá trị nghiệm thu Hợp đồng · Chi phí",
        "context": "1 · Tổng giá trị nghiệm thu Hợp đồng",
        "required": false,
        "title": "Tổng giá trị nghiệm thu Hợp đồng",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 84,
        "start": 47,
        "end": 57,
        "label": "dd.mm.yy",
        "context": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] ",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 84,
        "start": 70,
        "end": 78,
        "label": "ID KOC",
        "context": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] ",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p85:cell",
        "part": "word/document.xml",
        "paragraph": 85,
        "label": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐ · Chi phí",
        "context": "2 · Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC]",
        "required": false,
        "title": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐ",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p88:cell",
        "part": "word/document.xml",
        "paragraph": 88,
        "label": "Giá trị còn lại Bên A phải thanh toán cho Bên B · Chi phí",
        "context": "3 · Giá trị còn lại Bên A phải thanh toán cho Bên B",
        "required": false,
        "title": "Giá trị còn lại Bên A phải thanh toán cho Bên B",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p90:93",
        "part": "word/document.xml",
        "paragraph": 90,
        "start": 93,
        "end": 94,
        "label": "đồng tương ứng với tổng giá trị là  [điền] . (Bằng chữ: ….).",
        "context": "Bên A có nghĩa vụ thanh toán 100% giá trị còn lại của Hợp đồng tương ứng với tổng giá trị là …. (Bằng chữ: ….).",
        "required": false,
        "title": "Số tiền còn phải thanh toán",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p90:107",
        "part": "word/document.xml",
        "paragraph": 90,
        "start": 107,
        "end": 108,
        "label": " với tổng giá trị là …. (Bằng chữ:  [điền] .).",
        "context": "Bên A có nghĩa vụ thanh toán 100% giá trị còn lại của Hợp đồng tương ứng với tổng giá trị là …. (Bằng chữ: ….).",
        "required": false,
        "title": "Số tiền bằng chữ",
        "group": "MONEY",
        "kind": "text"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/footer2.xml",
        "paragraph": 1,
        "start": 0,
        "end": 10,
        "label": "dd.mm.yy",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/footer2.xml",
        "paragraph": 1,
        "start": 29,
        "end": 37,
        "label": "ID KOC",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      }
    ],
    "paragraphs": [
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Độc lập – Tự do – Hạnh phúc",
      "",
      "BIÊN BẢN NGHIỆM THU DỊCH VỤ BOOKING VIDEO",
      "[dd.mm.yy]/BBNT/UPBASE-BRAND-[ID KOC]",
      "Kèm theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
      "",
      "BÊN SỬ DỤNG DỊCH VỤ",
      "BÊN A",
      ":",
      "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
      "Mã số thuế",
      ":",
      "0109361325",
      "Địa chỉ",
      ":",
      "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
      "Người đại diện",
      ":",
      "Ông Đỗ Văn Giang   ",
      "Sau đây gọi tắt là “Bên A”",
      "",
      "BÊN CUNG ỨNG DỊCH VỤ ",
      "BÊN B",
      ":",
      "Tên Hộ kinh doanh",
      "Mã số thuế",
      ":",
      "MST hộ kinh doanh",
      "Địa chỉ",
      ":",
      "Địa chỉ hộ kinh doanh",
      "Chủ hộ kinh doanh",
      ":",
      "Họ và tên ",
      "CCCD chủ hộ kinh doanh",
      ":",
      "Số… cấp ngày … tại…",
      "Số điện thoại",
      ":",
      "",
      "Email",
      ":",
      "",
      "Sau đây gọi tắt là “Bên B”",
      "",
      "Căn cứ Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC] và kết quả thực hiện công việc thực tế của Bên B.",
      "Hai Bên tiến hành nghiệm thu các hạng mục công việc do Bên B thực hiện thep Hợp đồng nêu trên làm cơ sở xác nhận hoàn thành nghĩa vụ và thanh toán theo thỏa thuận.",
      "",
      "Điều 1: Nghiệm thu phạm vi và phí dịch vụ",
      " Nghiệm thu phí dịch vụ",
      "STT",
      "Hạng mục",
      "Đơn giá",
      "(VNĐ)",
      "Số lượng",
      "Thành tiền (VND)",
      "1",
      "Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….",
      "Link video: ",
      "",
      "",
      "",
      "2",
      "Sử dụng hình ảnh trong … ngày từ ngày ….",
      "",
      "",
      "",
      "Tổng giá trị Hợp đồng",
      "(Đã bao gồm toàn bộ các khoản thuế, phí và nghĩa vụ tài chính mà Hộ kinh doanh phải kê khai, nộp theo quy định pháp luật, bao gồm cả chính sách giảm thuế (nếu có) tại thời điểm xuất hóa đơn)",
      "",
      "",
      "Hình ảnh nghiệm thu dịch vụ",
      "",
      "",
      "Điều 2: Thanh toán phí dịch vụ",
      "Phí dịch vụ Bên A phải thanh toán cho Bên B là:",
      "STT",
      "Nội dung",
      "Chi phí (VNĐ)",
      "1",
      "Tổng giá trị nghiệm thu Hợp đồng",
      "",
      "2",
      "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] ",
      "",
      "3",
      "Giá trị còn lại Bên A phải thanh toán cho Bên B",
      "",
      "",
      "Bên A có nghĩa vụ thanh toán 100% giá trị còn lại của Hợp đồng tương ứng với tổng giá trị là …. (Bằng chữ: ….).",
      "Thời hạn thanh toán là trong vòng 10 ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ ngày Bên A nhận được: Hợp đồng dịch vụ và Biên bản nghiệm thu công việc đã được các Bên ký xác nhận, hóa đơn hộ kinh doanh hợp lệ theo giá trị nghiệm thu Hợp đồng thực tế.     ",
      "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
      "Tên chủ tài khoản: ",
      "Số tài khoản: ",
      "Tại Ngân hàng: ",
      "",
      "Điều 2: Hiệu lực ",
      "Biên bản này được lập và có hiệu lực từ ngày ….",
      "Biên bản này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi Bên giữ 01 (một) bản để thực hiện.",
      "",
      "ĐẠI DIỆN BÊN A",
      "",
      "ĐẠI DIỆN BÊN B ",
      "",
      "",
      "",
      "",
      "",
      "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
      "http://www.upbase.asia ",
      "Trang 1 ",
      "",
      "",
      "",
      "",
      "",
      "BM.BBNT.VID.HKD.Ver052026",
      "",
      ""
    ],
    "blocks": [
      {
        "kind": "p",
        "part": "word/header1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/header2.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header2.xml",
                  "paragraph": 0,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header2.xml",
                  "paragraph": 1,
                  "text": "BM.BBNT.VID.HKD.Ver052026",
                  "align": "right"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/header2.xml",
        "paragraph": 2,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/header3.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 0,
        "text": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 1,
        "text": "Độc lập – Tự do – Hạnh phúc",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 2,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 3,
        "text": "BIÊN BẢN NGHIỆM THU DỊCH VỤ BOOKING VIDEO",
        "align": "center",
        "bold": true,
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 4,
        "text": "[dd.mm.yy]/BBNT/UPBASE-BRAND-[ID KOC]",
        "align": "center"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 5,
        "text": "Kèm theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "align": "center",
        "boldPrefix": 29
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 6,
        "text": "",
        "align": "center"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 7,
                  "text": "BÊN SỬ DỤNG DỊCH VỤ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 4
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 8,
                  "text": "BÊN A",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 9,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 10,
                  "text": "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 11,
                  "text": "Mã số thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 12,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 13,
                  "text": "0109361325",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 14,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 15,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 16,
                  "text": "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 17,
                  "text": "Người đại diện",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 18,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 19,
                  "text": "Ông Đỗ Văn Giang   ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 20,
                  "text": "Sau đây gọi tắt là “Bên A”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 21,
        "text": "",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 22,
                  "text": "BÊN CUNG ỨNG DỊCH VỤ ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 3
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 23,
                  "text": "BÊN B",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 24,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 25,
                  "text": "Tên Hộ kinh doanh",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 26,
                  "text": "Mã số thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 27,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 28,
                  "text": "MST hộ kinh doanh",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 29,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 30,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 31,
                  "text": "Địa chỉ hộ kinh doanh",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 32,
                  "text": "Chủ hộ kinh doanh",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 33,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 34,
                  "text": "Họ và tên ",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 35,
                  "text": "CCCD chủ hộ kinh doanh",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 36,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 37,
                  "text": "Số… cấp ngày … tại…",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 38,
                  "text": "Số điện thoại",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 39,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 40,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 41,
                  "text": "Email",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 42,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 43,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 44,
                  "text": "Sau đây gọi tắt là “Bên B”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 45,
        "text": "",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 46,
        "text": "Căn cứ Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC] và kết quả thực hiện công việc thực tế của Bên B.",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 47,
        "text": "Hai Bên tiến hành nghiệm thu các hạng mục công việc do Bên B thực hiện thep Hợp đồng nêu trên làm cơ sở xác nhận hoàn thành nghĩa vụ và thanh toán theo thỏa thuận.",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 48,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 49,
        "text": "Điều 1: Nghiệm thu phạm vi và phí dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 50,
        "text": " Nghiệm thu phí dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 51,
                  "text": "STT",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 52,
                  "text": "Hạng mục",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 53,
                  "text": "Đơn giá",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 54,
                  "text": "(VNĐ)",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 55,
                  "text": "Số lượng",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 56,
                  "text": "Thành tiền (VND)",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 57,
                  "text": "1"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 58,
                  "text": "Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 59,
                  "text": "Link video: ",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 60,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 61,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 62,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 63,
                  "text": "2"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 64,
                  "text": "Sử dụng hình ảnh trong … ngày từ ngày …."
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 65,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 66,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 67,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 68,
                  "text": "Tổng giá trị Hợp đồng",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 69,
                  "text": "(Đã bao gồm toàn bộ các khoản thuế, phí và nghĩa vụ tài chính mà Hộ kinh doanh phải kê khai, nộp theo quy định pháp luật, bao gồm cả chính sách giảm thuế (nếu có) tại thời điểm xuất hóa đơn)",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 4
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 70,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 71,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 72,
        "text": "Hình ảnh nghiệm thu dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 73,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 74,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 75,
        "text": "Điều 2: Thanh toán phí dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 76,
        "text": "Phí dịch vụ Bên A phải thanh toán cho Bên B là:",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 77,
                  "text": "STT",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 78,
                  "text": "Nội dung",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 79,
                  "text": "Chi phí (VNĐ)",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 80,
                  "text": "1",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 81,
                  "text": "Tổng giá trị nghiệm thu Hợp đồng",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 82,
                  "text": "",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 83,
                  "text": "2",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 84,
                  "text": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 85,
                  "text": "",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 86,
                  "text": "3",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 87,
                  "text": "Giá trị còn lại Bên A phải thanh toán cho Bên B",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 88,
                  "text": "",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 89,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 90,
        "text": "Bên A có nghĩa vụ thanh toán 100% giá trị còn lại của Hợp đồng tương ứng với tổng giá trị là …. (Bằng chữ: ….).",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 91,
        "text": "Thời hạn thanh toán là trong vòng 10 ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ ngày Bên A nhận được: Hợp đồng dịch vụ và Biên bản nghiệm thu công việc đã được các Bên ký xác nhận, hóa đơn hộ kinh doanh hợp lệ theo giá trị nghiệm thu Hợp đồng thực tế.     ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 92,
        "text": "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 93,
        "text": "Tên chủ tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 94,
        "text": "Số tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 95,
        "text": "Tại Ngân hàng: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 96,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 97,
        "text": "Điều 2: Hiệu lực ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 98,
        "text": "Biên bản này được lập và có hiệu lực từ ngày ….",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 99,
        "text": "Biên bản này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi Bên giữ 01 (một) bản để thực hiện.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 100,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "signature",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 101,
                  "text": "ĐẠI DIỆN BÊN A",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 102,
                  "text": "",
                  "align": "center"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 103,
                  "text": "ĐẠI DIỆN BÊN B ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 104,
                  "text": "",
                  "align": "center"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 105,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 106,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/footer1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/footer2.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/footer2.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 1,
                  "text": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 2,
                  "text": "http://www.upbase.asia ",
                  "align": "center"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 3,
                  "text": "Trang 1 ",
                  "align": "right"
                },
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 4,
                  "text": ""
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/footer2.xml",
        "paragraph": 5,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/footer3.xml",
        "paragraph": 0,
        "text": ""
      }
    ],
    "category": "ACCEPTANCE_SETTLEMENT",
    "description": "Biên bản nghiệm thu link bài đăng, mã Spark Ads và giá trị thanh toán thực tế cho đối tác hộ kinh doanh.",
    "active": true,
    "defaultReviewRoles": [
      "FINANCE",
      "LEAD"
    ],
    "exemptLegalReview": true,
    "scope": "GLOBAL",
    "updatedAt": "2026-05-01T08:00:00.000Z",
    "updatedBy": "Phòng Pháp chế",
    "fieldCount": 32,
    "requiredFieldCount": 17,
    "history": [
      {
        "version": "Ver052026",
        "hash": "b2ee827159c3ccb763592e6b8fdd873726a6a894f60469395a056f3ad0f636d0",
        "filename": "2.1.2. BM.BBNT.VID.HKD.Ver052026 booking Video.docx",
        "updatedAt": "2026-05-01T08:00:00.000Z",
        "updatedBy": "Phòng Pháp chế",
        "note": "Phiên bản chuẩn ban hành bởi Pháp chế"
      }
    ]
  },
  "COM-HD": {
    "id": "COM-HD",
    "name": "Hợp đồng video · Công ty",
    "filename": "3.1.1. BM.HĐ.VID.COM.Ver052026 booking video.docx",
    "subject": "Công ty",
    "kind": "CONTRACT",
    "version": "Ver052026",
    "hash": "003c9a94a221818eb037832d65698c75980f127a5f1f09c5966b8ec7d181d339",
    "fields": [
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 4,
        "end": 14,
        "label": "dd.mm.yy",
        "context": "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 33,
        "end": 41,
        "label": "ID KOC",
        "context": "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p16:14",
        "part": "word/document.xml",
        "paragraph": 16,
        "start": 14,
        "end": 15,
        "label": "Hôm nay, ngày  [điền]  tháng … năm 202…, tại tr",
        "context": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "required": true,
        "title": "Ngày ký",
        "group": "DATE",
        "kind": "number",
        "source": "signDay"
      },
      {
        "key": "word/document.xml:p16:22",
        "part": "word/document.xml",
        "paragraph": 16,
        "start": 22,
        "end": 23,
        "label": "Hôm nay, ngày … tháng  [điền]  năm 202…, tại trụ sở chí",
        "context": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "required": true,
        "title": "Tháng ký",
        "group": "DATE",
        "kind": "number",
        "source": "signMonth"
      },
      {
        "key": "word/document.xml:p16:31",
        "part": "word/document.xml",
        "paragraph": 16,
        "start": 31,
        "end": 32,
        "label": "Hôm nay, ngày … tháng … năm 202 [điền] , tại trụ sở chính của Cô",
        "context": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "required": true,
        "title": "Năm ký (chữ số cuối, ví dụ 6 cho 2026)",
        "group": "DATE",
        "kind": "number",
        "source": "signYearDigit"
      },
      {
        "key": "word/document.xml:p39:cell",
        "part": "word/document.xml",
        "paragraph": 39,
        "label": "BÊN B",
        "context": "BÊN B · Tên Công ty",
        "required": true,
        "start": 0,
        "end": 11,
        "title": "Tên công ty",
        "group": "PARTY",
        "kind": "text",
        "source": "partyName"
      },
      {
        "key": "word/document.xml:p42:cell",
        "part": "word/document.xml",
        "paragraph": 42,
        "label": "Mã số thuế",
        "context": "Mã số thuế · MST công ty",
        "required": true,
        "start": 0,
        "end": 11,
        "title": "Mã số thuế",
        "group": "PARTY",
        "kind": "text",
        "source": "taxCode"
      },
      {
        "key": "word/document.xml:p45:cell",
        "part": "word/document.xml",
        "paragraph": 45,
        "label": "Địa chỉ",
        "context": "Địa chỉ · Địa chỉ công ty",
        "required": true,
        "start": 0,
        "end": 15,
        "title": "Địa chỉ",
        "group": "PARTY",
        "kind": "long",
        "source": "address"
      },
      {
        "key": "word/document.xml:p48:cell",
        "part": "word/document.xml",
        "paragraph": 48,
        "label": "Người đại diện",
        "context": "Người đại diện",
        "required": true,
        "title": "Người đại diện",
        "group": "PARTY",
        "kind": "text",
        "source": "representative"
      },
      {
        "key": "word/document.xml:p51:cell",
        "part": "word/document.xml",
        "paragraph": 51,
        "label": "Chức vụ",
        "context": "Chức vụ · ….Theo ủy quyền số … ngày… - cần ủy quyền từ người đại diện theo pháp luật nếu người ký không phải là đại diện pháp luật (giám đốc, tổng giám đốc công ty)",
        "required": false,
        "start": 0,
        "end": 2,
        "title": "Chức vụ người đại diện",
        "group": "PARTY",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p55:cell",
        "part": "word/document.xml",
        "paragraph": 55,
        "label": "Số điện thoại",
        "context": "Số điện thoại",
        "required": true,
        "title": "Số điện thoại",
        "group": "PARTY",
        "kind": "text",
        "source": "phone"
      },
      {
        "key": "word/document.xml:p58:cell",
        "part": "word/document.xml",
        "paragraph": 58,
        "label": "Email",
        "context": "Email",
        "required": true,
        "title": "Email",
        "group": "PARTY",
        "kind": "text",
        "source": "email"
      },
      {
        "key": "word/document.xml:p169:109",
        "part": "word/document.xml",
        "paragraph": 169,
        "start": 109,
        "end": 110,
        "label": "đẩy doanh số bán hàng với sản phẩm  [điền] .",
        "context": "Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….",
        "required": false,
        "title": "Sản phẩm",
        "group": "SCOPE",
        "kind": "text",
        "source": "product"
      },
      {
        "key": "word/document.xml:p173:30",
        "part": "word/document.xml",
        "paragraph": 173,
        "start": 30,
        "end": 31,
        "label": "Có gắn link/giỏ hàng sản phẩm  [điền]  (thời gian tiến hành gắn",
        "context": "Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)",
        "required": false,
        "title": "Sản phẩm gắn giỏ hàng",
        "group": "SCOPE",
        "kind": "text",
        "source": "product"
      },
      {
        "key": "word/document.xml:p174:35",
        "part": "word/document.xml",
        "paragraph": 174,
        "start": 35,
        "end": 36,
        "label": "Cấp mã code để chạy quảng cáo trong [điền]  ngày",
        "context": "Cấp mã code để chạy quảng cáo trong… ngày",
        "required": false,
        "title": "Số ngày cấp mã quảng cáo",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p177:cell",
        "part": "word/document.xml",
        "paragraph": 177,
        "label": "Sản xuất và đăng tải Video review · Đơn giá",
        "context": "1 · Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….Tài khoản đăng tải – link: Thời gian đăng tải:Thời lượng video:Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)Cấp mã code để chạy quảng cáo trong… ngàyBàn giao video gốcYêu cầu key cần bổ sung nếu có",
        "required": false,
        "title": "Sản xuất và đăng tải Video review · Đơn giá",
        "group": "SCOPE",
        "kind": "money",
        "source": "unitPrice"
      },
      {
        "key": "word/document.xml:p178:cell",
        "part": "word/document.xml",
        "paragraph": 178,
        "label": "Sản xuất và đăng tải Video review · Số lượng",
        "context": "1 · Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….Tài khoản đăng tải – link: Thời gian đăng tải:Thời lượng video:Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)Cấp mã code để chạy quảng cáo trong… ngàyBàn giao video gốcYêu cầu key cần bổ sung nếu có",
        "required": false,
        "title": "Sản xuất và đăng tải Video review · Số lượng",
        "group": "SCOPE",
        "kind": "number",
        "source": "quantity"
      },
      {
        "key": "word/document.xml:p179:cell",
        "part": "word/document.xml",
        "paragraph": 179,
        "label": "Sản xuất và đăng tải Video review · Thành tiền",
        "context": "1 · Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….Tài khoản đăng tải – link: Thời gian đăng tải:Thời lượng video:Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)Cấp mã code để chạy quảng cáo trong… ngàyBàn giao video gốcYêu cầu key cần bổ sung nếu có",
        "required": false,
        "title": "Sản xuất và đăng tải Video review · Thành tiền",
        "group": "SCOPE",
        "kind": "money",
        "source": "lineTotal"
      },
      {
        "key": "word/document.xml:p181:23",
        "part": "word/document.xml",
        "paragraph": 181,
        "start": 23,
        "end": 24,
        "label": "Sử dụng hình ảnh trong  [điền]  ngày từ ngày ….",
        "context": "Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Số ngày sử dụng hình ảnh",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p181:38",
        "part": "word/document.xml",
        "paragraph": 181,
        "start": 38,
        "end": 39,
        "label": "dụng hình ảnh trong … ngày từ ngày  [điền] .",
        "context": "Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Ngày bắt đầu sử dụng hình ảnh",
        "group": "SCOPE",
        "kind": "date"
      },
      {
        "key": "word/document.xml:p182:cell",
        "part": "word/document.xml",
        "paragraph": 182,
        "label": "Sử dụng hình ảnh trong · Đơn giá",
        "context": "2 · Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Sử dụng hình ảnh trong · Đơn giá",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p183:cell",
        "part": "word/document.xml",
        "paragraph": 183,
        "label": "Sử dụng hình ảnh trong · Số lượng",
        "context": "2 · Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Sử dụng hình ảnh trong · Số lượng",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p184:cell",
        "part": "word/document.xml",
        "paragraph": 184,
        "label": "Sử dụng hình ảnh trong · Thành tiền",
        "context": "2 · Sử dụng hình ảnh trong … ngày từ ngày ….",
        "required": false,
        "title": "Sử dụng hình ảnh trong · Thành tiền",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p186:cell",
        "part": "word/document.xml",
        "paragraph": 186,
        "label": "Tổng Giá trị hợp đồng chưa bao gồm thuế",
        "context": "Tổng Giá trị hợp đồng chưa bao gồm thuế",
        "required": true,
        "title": "Tổng Giá trị hợp đồng chưa bao gồm thuế",
        "group": "MONEY",
        "kind": "money",
        "source": "netTotal"
      },
      {
        "key": "word/document.xml:p188:cell",
        "part": "word/document.xml",
        "paragraph": 188,
        "label": "Thuế VAT",
        "context": "Thuế VAT",
        "required": false,
        "title": "Thuế VAT",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p190:cell",
        "part": "word/document.xml",
        "paragraph": 190,
        "label": "Tổng Giá trị hợp đồng đã bao gồm thuế VAT",
        "context": "Tổng Giá trị hợp đồng đã bao gồm thuế VAT",
        "required": false,
        "title": "Tổng Giá trị hợp đồng đã bao gồm thuế VAT",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p194:64",
        "part": "word/document.xml",
        "paragraph": 194,
        "start": 64,
        "end": 65,
        "label": "hưởng hoa hồng affiliate với tỷ lệ  [điền] % trên doanh thu phát sin",
        "context": "Hoa hồng organic: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh tự nhiên từ video, được ghi nhận thông qua link/mã theo dõi của Bên B và không bao gồm doanh thu phát sinh từ ngân sách quảng cáo do Bên A hoặc bên thứ ba chi trả. ",
        "required": false,
        "title": "Hoa hồng organic (%)",
        "group": "MONEY",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p195:65",
        "part": "word/document.xml",
        "paragraph": 195,
        "start": 65,
        "end": 66,
        "label": "hưởng hoa hồng affiliate với tỷ lệ  [điền] % trên doanh thu phát sin",
        "context": "Hoa hồng chạy ads: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh từ video được sử dụng để chạy quảng cáo, với điều kiện doanh thu đó được ghi nhận thông qua link/mã theo dõi của Bên B và được Bên A xác nhận trong báo cáo đối soát. ",
        "required": false,
        "title": "Hoa hồng chạy ads (%)",
        "group": "MONEY",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p209:14",
        "part": "word/document.xml",
        "paragraph": 209,
        "start": 14,
        "end": 15,
        "label": "Lần 1 tạm ứng  [điền]  trong vòng … ngày làm vi",
        "context": "Lần 1 tạm ứng … trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm hai bên ký kết hợp đồng này.",
        "required": false,
        "title": "Số tiền tạm ứng lần 1",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p209:27",
        "part": "word/document.xml",
        "paragraph": 209,
        "start": 27,
        "end": 28,
        "label": "Lần 1 tạm ứng … trong vòng  [điền]  ngày làm việc (trừ thứ b",
        "context": "Lần 1 tạm ứng … trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm hai bên ký kết hợp đồng này.",
        "required": false,
        "title": "Hạn tạm ứng (ngày làm việc)",
        "group": "MONEY",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p210:44",
        "part": "word/document.xml",
        "paragraph": 210,
        "start": 44,
        "end": 45,
        "label": "nh toán số tiền còn lại trong vòng  [điền]  ngày làm việc (trừ thứ b",
        "context": "Lần 2 thanh toán số tiền còn lại trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm Bên B hoàn thành dịch vụ và Bên A đã nhận được Hợp đồng, Biên bản nghiệm thu dịch vụ có chữ ký của hai bên đồng thời Bên B đã cung cấp hóa đơn hợp lệ toàn bộ giá trị Hợp đồng cho Bên A.",
        "required": false,
        "title": "Hạn thanh toán lần 2 (ngày làm việc)",
        "group": "MONEY",
        "kind": "number"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/footer1.xml",
        "paragraph": 1,
        "start": 0,
        "end": 10,
        "label": "dd.mm.yy",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/footer1.xml",
        "paragraph": 1,
        "start": 29,
        "end": 37,
        "label": "ID KOC",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      }
    ],
    "paragraphs": [
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Độc lập – Tự do – Hạnh phúc",
      "",
      "HỢP ĐỒNG DỊCH VỤ BOOKING VIDEO",
      "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
      "Căn cứ: ",
      "Bộ luật Dân sự số 91/2015/QH13, có hiệu lực từ ngày 01/01/2017;",
      "Luật Thương mại số 36/2005/QH11, có hiệu lực từ ngày 01/01/2006;",
      "Luật Thương mại điện tử số 122/2025/QH15, có hiệu lực từ ngày 01/07/2026;",
      "Nghị định số 147/2024/NĐ-CP về quản lý, cung cấp và sử dụng dịch vụ Internet và thông tin trên mạng, có hiệu lực từ ngày 25/12/2024; ",
      "Luật Quảng cáo số 16/2012/QH13 có hiệu lực từ ngày 01/01/2013;",
      "Luật sửa đổi, bổ sung một số điều của Luật Quảng cáo số 75/2025/QH15, có hiệu lực từ ngày 01/01/2026;",
      "Luật Sở hữu Trí tuệ số 50/2005/QH11, có hiệu lực từ ngày 01/07/2006;",
      "Luật Sửa đổi bổ sung một số điều của Luật Sở hữu Trí tuệ số 131/2025/QH15, có hiệu lực từ ngày 01/04/2026;",
      "Nhu cầu và khả năng của hai Bên.",
      "",
      "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
      "",
      "BÊN SỬ DỤNG DỊCH VỤ",
      "BÊN A",
      ":",
      "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
      "Mã số thuế",
      ":",
      "0109361325",
      "Địa chỉ",
      ":",
      "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
      "Người đại diện",
      ":",
      "Ông Đỗ Văn Giang   ",
      "Chức vụ",
      ":",
      "Giám đốc",
      "Sau đây gọi tắt là “Bên A”",
      "",
      "BÊN CUNG ỨNG DỊCH VỤ ",
      "BÊN B",
      ":",
      "Tên Công ty",
      "Mã số thuế",
      ":",
      "MST công ty",
      "Địa chỉ",
      ":",
      "Địa chỉ công ty",
      "Người đại diện",
      ":",
      "",
      "Chức vụ",
      ":",
      "….",
      "Theo ủy quyền số … ngày… - cần ủy quyền từ người đại diện theo pháp luật nếu người ký không phải là đại diện pháp luật (giám đốc, tổng giám đốc công ty)",
      "Số điện thoại",
      ":",
      "",
      "Email",
      ":",
      "",
      "Sau đây gọi tắt là “Bên B”",
      "",
      "Bên A có nhu cầu triển khai các hoạt động quảng bá và tiếp thị sản phẩm thông qua các KOL/KOC trên các nền tảng truyền thông và/hoặc thương mại điện tử. Bên B là đơn vị quản lý và đại diện cho các KOL/KOC, có năng lực kết nối, điều phối và sắp xếp các KOL/KOC tham gia các hoạt động quảng bá theo yêu cầu của Bên A.",
      "Trên cơ sở đó, hai Bên thống nhất ký kết Hợp đồng dịch vụ này nhằm thiết lập các điều khoản và điều kiện chung cho việc cung cấp dịch vụ quảng cáo, tiếp thị và thúc đẩy doanh số thông qua KOL/KOC.",
      "",
      "ĐIỀU 1: ĐỊNH NGHĨA",
      "Khái niệm",
      "Định nghĩa",
      "Tài khoản mạng xã hội",
      "Là tài khoản mạng xã hội có link: …",
      "Bên B là chủ sở hữu hợp pháp và có toàn quyền quản lý, vận hành tài khoản mạng xã hội trong suốt thời gian thực hiện Hợp đồng. ",
      "Tiếp thị ",
      "liên kết ",
      "(Affiliate)",
      "Là việc Bên B quảng bá sản phẩm/dịch vụ thông qua cơ chế của nền tảng thương mại điện tử (sàn TMĐT) (bao gồm link, mã, giỏ hàng hoặc công cụ tương đương), trong đó doanh thu chỉ được ghi nhận khi được hệ thống nền tảng xác nhận. Hoa hồng và doanh thu được xác định theo dữ liệu cuối cùng từ nền tảng và có thể bị điều chỉnh trong trường hợp hoàn đơn, gian lận hoặc vi phạm chính sách.",
      "Booking video",
      "Booking video là việc Bên A thuê Bên B sản xuất và đăng tải Video theo các yêu cầu cụ thể tại hợp đồng, có nội dung review, đánh giá, giới thiệu, quảng bá sản phẩm và thúc đẩy doanh số bán hàng (có thể bao gồm các cơ chế như gắn link, mã, giỏ hàng hoặc kêu gọi hành động). ",
      "Phí dịch vụ booking",
      "Phí dịch vụ booking là khoản phí cố định Bên A thanh toán cho Bên B.",
      "Hoa hồng",
      "Là khoản thu nhập của Bên B dựa trên doanh thu Affiliate hợp lệ được nền tảng chi trả. Bên B tự chịu trách nhiệm kê khai, nộp thuế và các nghĩa vụ tài chính liên quan đến khoản hoa hồng này theo quy định pháp luật.",
      "",
      "ĐIỀU 2: PHẠM VI CÔNG VIỆC",
      " Phạm vi công việc cần thực hiện",
      "Bên B thực hiện sản xuất và đăng tải video trên các nền tảng mạng xã hội.",
      "Phạm vi công việc mở rộng:",
      "Gắn công cụ bán hàng: Gắn link, giỏ hàng, mã theo dõi, mã giảm giá, hashtag, CTA …; ",
      "Hỗ trợ quảng cáo: Cho phép Bên A hoặc bên thứ ba do Bên A chỉ định sử dụng nội dung video để chạy quảng cáo, chia sẻ mã quảng cáo, …; ",
      "Sử dụng hình ảnh:",
      "Bên A có quyền sử dụng, khai thác, chỉnh sửa kỹ thuật, resize, cắt ghép định dạng, biên tập, chuyển thể, lồng ghép, tái sử dụng và phân phối lại hình ảnh, video, nội dung do Bên B thực hiện để phục vụ hoạt động truyền thông, quảng bá và thương mại cho nhãn hàng/sản phẩm theo phạm vi đã thỏa thuận tại Hợp đồng.",
      "Bên A được quyền đăng tải lại video trên kênh chính thức của nhãn hàng; sử dụng hình ảnh/video làm banner, hình ảnh trưng bày trên gian hàng TMĐT, website, landing page, nền tảng số hoặc các kênh truyền thông khác của nhãn hàng; đồng thời được quyền cho phép các KOC/KOL/người dùng khác duet, stitch, chia sẻ hoặc sử dụng lại nội dung nhằm phục vụ hoạt động quảng bá chiến dịch trong phạm vi đã thỏa thuận.",
      "Bên A được quyền sử dụng hình ảnh, giọng nói, tên, hình tượng và các yếu tố nhận diện của Bên B/KOL xuất hiện trong nội dung nhằm phục vụ hoạt động quảng cáo, truyền thông và thương mại cho nhãn hàng/sản phẩm theo phạm vi sử dụng đã thỏa thuận.",
      "Phạm vi sử dụng bao gồm nhưng không giới hạn tại: website, landing page, sàn thương mại điện tử, Facebook, TikTok, Instagram, YouTube và các nền tảng số khác của nhãn hàng.",
      "Nội dung được phép sử dụng trong các hoạt động digital marketing, social seeding, PR, media booking, livestream, affiliate marketing, e-commerce campaign và các hoạt động quảng bá sản phẩm/nhãn hàng khác theo nhu cầu truyền thông thực tế của Bên A.",
      "Tham gia hoạt động truyền thông và sự kiện: Tham gia event …; ",
      "Triển khai các định dạng nội dung khác: Thực hiện các bài đăng ngoài video như hình ảnh, carousel, bài viết, caption, story, reel hoặc các định dạng nội dung khác.",
      "",
      "Quy trình cung ứng dịch vụ",
      "Bước",
      "Tên bước",
      "Mô tả công việc",
      "1",
      "Ký Hợp đồng ",
      "dịch vụ ",
      "Hai Bên ký Hợp đồng dịch vụ làm cơ sở pháp lý điều chỉnh toàn bộ hoạt động hợp tác.",
      "2",
      "Yêu cầu dịch vụ",
      "Bên A gửi brief/yêu cầu cung ứng dịch vụ, bao gồm: thông tin chiến dịch, sản phẩm/dịch vụ, nội dung quảng bá, nền tảng triển khai, timeline và các yêu cầu liên quan.",
      "3",
      "Dựng kịch bản",
      "Bên B xây dựng kịch bản và nội dung video dựa trên brief của Bên A và gửi Bên A phê duyệt trước khi sản xuất.",
      "4",
      "Duyệt kịch bản",
      "Bên A xem xét, phản hồi và yêu cầu chỉnh sửa (nếu có).",
      "Tối đa 01 vòng chỉnh sửa trước khi duyệt cuối cùng.",
      "5",
      "Sản xuất video",
      "Bên B tiến hành quay dựng, chỉnh lý, biên tập, hậu kỳ video theo kịch bản đã thống nhất.",
      "6",
      "Duyệt video",
      "Bên A xem xét, phản hồi và yêu cầu chỉnh sửa (nếu có). ",
      "Tối đa 01 vòng chỉnh sửa trước khi duyệt cuối cùng.",
      "7",
      "Đăng tải video",
      "Bên B đăng tải nội dung hoặc thực hiện livestream theo đúng nội dung đã duyệt, đúng tài khoản và timeline.",
      "8",
      "Ghi nhận ",
      "kết quả",
      "Ghi nhận các chỉ số: lượt xem, tương tác, đơn hàng, GMV… theo dữ liệu từ nền tảng.",
      "9",
      "Nghiệm thu",
      "Bên A kiểm tra việc thực hiện dịch vụ.",
      "10",
      "Thanh toán phí Booking",
      "Bên A thực hiện thanh toán phí booking.",
      "11",
      "Đối soát Affiliate",
      "(nếu có)",
      "Hoa hồng Affiliate do nền tảng chi trả trực tiếp cho Bên B theo dữ liệu hệ thống.",
      "",
      "2.3. Tiêu chuẩn nghiệm thu dịch vụ ",
      "Tiêu chuẩn về nội dung và đăng tải",
      "Video phải tuân thủ đầy đủ kịch bản, thông điệp và guideline do Bên A cung cấp; ",
      "Bao gồm đầy đủ các yếu tố yêu cầu (nếu có): link, giỏ hàng, mã theo dõi, hashtag, CTA…; ",
      "Chỉ được đăng tải sau khi có phê duyệt nội dung từ Bên A; ",
      "Đăng tải đúng tài khoản, đúng thời điểm và duy trì hiển thị, không được xóa video sau khi đăng tải mà không có sự chấp thuận hoặc yêu cầu của Bên A; ",
      "Nếu video bị ẩn, xóa, tắt âm thanh… hoặc các lỗi tương đương ảnh hưởng đến việc hiển thị bình thường của video trên nền tảng thì Bên B có nghĩa vụ phải chỉnh lý, đăng tải lại video đã khắc phục lỗi.",
      "Không vi phạm pháp luật, chính sách nền tảng hoặc gây ảnh hưởng tiêu cực đến hình ảnh thương hiệu. ",
      "Tiêu chuẩn về kịch bản và sản xuất",
      "Kịch bản phải được Bên A phê duyệt bằng email/tin nhắn/văn bản trước khi quay dựng; ",
      "Mọi chi phí phát sinh do sản xuất khi chưa có phê duyệt hợp lệ do Bên B tự chi trả; ",
      "Cảnh quay, bố cục và thông điệp phải phù hợp với kịch bản đã duyệt; ",
      "Trường hợp sai lệch, Bên A có quyền từ chối nghiệm thu và yêu cầu chỉnh sửa hoặc quay lại mà không phát sinh chi phí. ",
      "Tiêu chuẩn về chất lượng và hậu kỳ",
      "Video phải được dựng và hoàn thiện theo tiêu chuẩn đã thống nhất (video mẫu, guideline thương hiệu …); ",
      "Bên B có trách nhiệm chỉnh sửa theo yêu cầu hợp lý của Bên A cho đến khi đạt tiêu chuẩn nghiệm thu.",
      "Tiêu chuẩn về hình ảnh và nhận diện",
      "Bên B phải kiểm soát trang phục, bối cảnh, nhận diện cá nhân và các yếu tố hình ảnh khác nhằm không được gây trùng lặp, xung đột hoặc ảnh hưởng tiêu cực đến hiệu quả truyền thông của Bên A;",
      "Trường hợp vi phạm, Bên B phải chỉnh sửa, thay thế hoặc quay lại nội dung cho đến khi đạt yêu cầu, không làm ảnh hưởng tiến độ cam kết. ",
      "Áp dụng đối với dịch vụ khác: tiêu chuẩn nghiệm thu được áp dụng theo quy định cụ thể tại mô tả dịch vụ.",
      "",
      "ĐIỀU 3: PHÍ DỊCH VỤ VÀ THANH TOÁN",
      "Phí dịch vụ booking",
      "STT",
      "Hạng mục",
      "Đơn giá",
      "(VNĐ)",
      "Số lượng",
      "Thành tiền (VND)",
      "1",
      "Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….",
      "Tài khoản đăng tải – link: ",
      "Thời gian đăng tải:",
      "Thời lượng video:",
      "Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)",
      "Cấp mã code để chạy quảng cáo trong… ngày",
      "Bàn giao video gốc",
      "Yêu cầu key cần bổ sung nếu có",
      "",
      "",
      "",
      "2",
      "Sử dụng hình ảnh trong … ngày từ ngày ….",
      "",
      "",
      "",
      "Tổng Giá trị hợp đồng chưa bao gồm thuế",
      "",
      "Thuế VAT",
      "",
      "Tổng Giá trị hợp đồng đã bao gồm thuế VAT",
      "",
      "",
      "Thỏa thuận Hoa hồng Affiliate (nếu áp dụng)",
      "Hoa hồng affiliate gồm hai loại như sau:",
      "Hoa hồng organic: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh tự nhiên từ video, được ghi nhận thông qua link/mã theo dõi của Bên B và không bao gồm doanh thu phát sinh từ ngân sách quảng cáo do Bên A hoặc bên thứ ba chi trả. ",
      "Hoa hồng chạy ads: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh từ video được sử dụng để chạy quảng cáo, với điều kiện doanh thu đó được ghi nhận thông qua link/mã theo dõi của Bên B và được Bên A xác nhận trong báo cáo đối soát. ",
      "Doanh thu làm căn cứ tính hoa hồng là doanh thu đã hoàn tất (không bao gồm đơn hủy, hoàn trả hoặc gian lận), theo dữ liệu của nền tảng và/hoặc hệ thống của Bên A; ",
      "Hoa hồng affiliate do nền tảng chi trả trực tiếp cho Bên B. Bên B tự chịu trách nhiệm kê khai, khấu trừ và nộp các loại thuế, phí liên quan đến khoản thu nhập từ hoa hồng affiliate theo quy định pháp luật.",
      "Hình thức thanh toán",
      "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
      "Tên chủ tài khoản: ",
      "Số tài khoản: ",
      "Tại Ngân hàng: ",
      "",
      "Thời hạn thanh toán",
      "Thanh toán 1 lần",
      "Phí dịch vụ được thanh toán 1 lần trong vòng 7 - 10 ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) sau khi Bên B hoàn thành dịch vụ và hai bên đã hoàn tất việc ký kết Hợp đồng này (Bên A đã nhận được Hợp đồng có chữ ký của hai bên) đồng thời Bên B đã cung cấp hóa đơn hợp lệ cho Bên A. ",
      "Thanh toán 2 lần",
      "Phí dịch vụ được thanh toán làm 2 lần:",
      "Lần 1 tạm ứng … trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm hai bên ký kết hợp đồng này.",
      "Lần 2 thanh toán số tiền còn lại trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm Bên B hoàn thành dịch vụ và Bên A đã nhận được Hợp đồng, Biên bản nghiệm thu dịch vụ có chữ ký của hai bên đồng thời Bên B đã cung cấp hóa đơn hợp lệ toàn bộ giá trị Hợp đồng cho Bên A.",
      "",
      "ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A",
      "4.1. Quyền của Bên A",
      "Quyền kiểm tra, giám sát: Bên A có quyền kiểm tra và giám sát Bên B thực hiện công việc đúng nội dung, chất lượng, tiến độ theo Hợp đồng; có quyền phê duyệt hoặc đưa ra ý kiến trong thời gian hợp lý đối với các nội dung, đề xuất của Bên B.",
      "Quyền chỉnh sửa kịch bản: Bên A có quyền kiểm tra và yêu cầu Bên B chỉnh sửa nội dung kịch bản trước khi sản xuất/trước khi đăng tải trong trường hợp nội dung chưa phù hợp với yêu cầu đã thống nhất.",
      "Quyền chỉnh sửa sản phẩm: Trường hợp nội dung video/bài đăng do Bên B đăng tải không đúng với nội dung đã được hai Bên thống nhất, Bên A có quyền yêu cầu Bên B chỉnh sửa, gỡ bỏ hoặc thay thế ngay nội dung đã đăng tải sai.",
      "4.2. Nghĩa vụ của Bên A",
      "Thanh toán đầy đủ và đúng hạn Phí Booking cho Bên B theo Hợp đồng;",
      "Cung cấp đầy đủ, kịp thời các thông tin, tài liệu, sản phẩm mẫu và phối hợp với Bên B để triển khai dịch vụ theo Hợp đồng;",
      "Không sử dụng hình ảnh, nội dung hoặc danh tiếng của Bên B theo cách gây ảnh hưởng tiêu cực đến uy tín hoặc hình ảnh cá nhân của Bên B.",
      "",
      "ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B",
      "5.1.   Quyền của Bên B",
      "Yêu cầu Bên A cung cấp đầy đủ thông tin, tài liệu, sản phẩm mẫu, guideline, chính sách thương hiệu và các dữ liệu cần thiết để thực hiện dịch vụ; ",
      "Yêu cầu Bên A phối hợp phản hồi, xác nhận nội dung, kế hoạch triển khai; ",
      "Được sử dụng tên thương mại, nhãn hiệu, hình ảnh sản phẩm của Bên A trong phạm vi cần thiết để thực hiện dịch vụ theo Hợp đồng.",
      " Nghĩa vụ của Bên B",
      "Nghĩa vụ thực hiện dịch vụ: Thực hiện công việc đúng nội dung, chất lượng, số lượng, thời hạn, nền tảng theo Hợp đồng đã ký kết; không được chuyển giao, ủy quyền cho bên thứ ba thực hiện công việc; chủ động thông báo kịp thời cho Bên A về bất kỳ sự kiện nào có thể ảnh hưởng đến việc thực hiện dịch vụ.",
      "Nghĩa vụ duy trì nội dung đã đăng tải:",
      "Bên B không được tự ý xóa, ẩn hoặc hạn chế hiển thị đối với nội dung (bao gồm video, bài đăng) đã đăng tải theo Hợp đồng. Trong trường hợp nội dung phát sinh lỗi kỹ thuật do nền tảng (bao gồm nhưng không giới hạn: mất tiếng, lỗi hình ảnh, lỗi hiển thị hoặc các sự cố tương tự), Bên B có nghĩa vụ phối hợp với Bên A để khắc phục và đăng tải lại nội dung trong thời gian sớm nhất theo yêu cầu của Bên A.",
      "Nghĩa vụ về nội dung và trách nhiệm quảng cáo: Bên B có trách nhiệm quản lý, điều phối và đảm bảo các KOL/KOC và/hoặc host livestream do Bên B sắp xếp tham gia thực hiện hoạt động quảng cáo tuân thủ đầy đủ các quy định pháp luật có liên quan, bao gồm nhưng không giới hạn Luật Quảng cáo, Luật Bảo vệ quyền lợi người tiêu dùng, cũng như các quy định, chính sách của các nền tảng thương mại điện tử và/hoặc mạng xã hội. Bên B chịu trách nhiệm rà soát, nhắc nhở và kiểm soát nội dung do các KOL/KOC thực hiện nhằm hạn chế tối đa các hành vi quảng cáo sai sự thật, gây nhầm lẫn hoặc vi phạm pháp luật.",
      "Nghĩa vụ tư vấn nội dung: Bên B có nghĩa vụ tư vấn, đề xuất nội dung, thông điệp và định hướng triển khai phù hợp với đặc thù nền tảng, hành vi người dùng, mục tiêu chiến dịch… nhằm tối ưu hiệu quả truyền thông.",
      "Nghĩa vụ bảo vệ hình ảnh và uy tín nhãn hiệu: Bên B có trách nhiệm quản lý và đảm bảo các KOL/KOC do mình quản lý và/hoặc sắp xếp không thực hiện bất kỳ hành vi, phát ngôn hoặc đăng tải nội dung nào có thể gây ảnh hưởng tiêu cực, gây hiểu nhầm, chưa được kiểm chứng hoặc làm tổn hại đến hình ảnh, uy tín của Bên A hoặc sản phẩm/dịch vụ của Bên A.Bên B đồng thời có nghĩa vụ kiểm soát việc sử dụng ngôn từ, hình ảnh của các KOL/KOC nhằm đảm bảo không vi phạm pháp luật, không trái với thuần phong mỹ tục và phù hợp với định vị thương hiệu của Bên A. Nghĩa vụ này áp dụng trong suốt thời gian thực hiện Hợp đồng và kéo dài tối thiểu 06 (sáu) tháng kể từ ngày chấm dứt hợp tác đối với các nội dung liên quan đến chiến dịch.",
      "Nghĩa vụ bảo vệ hình ảnh và uy tín cá nhân: Bên B có trách nhiệm quản lý và giám sát danh tiếng của các KOL/KOC do mình đại diện, đảm bảo các KOL/KOC không thực hiện các hành vi, phát ngôn hoặc tham gia các sự kiện có thể dẫn đến scandal, tranh cãi hoặc gây ảnh hưởng tiêu cực trực tiếp hoặc gián tiếp đến uy tín, hình ảnh của Bên A. Trong trường hợp phát sinh hoặc có nguy cơ phát sinh sự kiện ảnh hưởng tiêu cực, Bên B phải thông báo kịp thời cho Bên A và chủ động phối hợp với Bên A để xử lý, bao gồm nhưng không giới hạn việc gỡ bỏ nội dung, đính chính thông tin hoặc thay thế KOL/KOC khi cần thiết.",
      "",
      "ĐIỂU 6: PHẠT VI PHẠM, BỒI THƯỜNG THIỆT HẠI",
      "6.1. Vi phạm của Bên A",
      "Chậm thanh toán: Trừ trường hợp bất khả kháng hoặc do lỗi của Bên B, nếu Bên A chậm thanh toán quá 15 (mười lăm) ngày so với thời hạn đã thỏa thuận (thời hạn thanh toán được tính từ thời điểm Bên B hoàn tất chứng từ thanh toán), Bên A phải trả lãi chậm thanh toán với mức lãi suất 8%/năm trên số tiền chậm trả, tính theo số ngày chậm thanh toán.",
      "6.2. Vi phạm của Bên B",
      "Vi phạm tiến độ thực hiện: Trường hợp Bên B không thực hiện đúng tiến độ theo Hợp đồng mà không do lỗi của Bên A hoặc yếu tố khách quan, Bên A sẽ gia hạn để Bên B khắc phục kịp thời theo tiến độ của dự án. Nếu Bên B không khắc phục trong vòng 3 – 5 ngày hoặc xong trước deadline cuối của dự án, Bên B phải chịu phạt tương đương 1% giá trị phí dịch vụ của hạng mục công việc bị vi phạm cho mỗi ngày chậm, tổng mức phạt không vượt quá 8% giá trị hạng mục đó hoặc Bên A có quyền không nghiệm thu và không trả phí cho hạng mục công việc hoàn thành muộn.",
      "Vi phạm nghĩa vụ về về nội dung và trách nhiệm quảng cáo: Bên A có quyền yêu cầu Bên B gỡ bỏ, chỉnh sửa nội dung và chịu mọi trách nhiệm phát sinh; đồng thời Bên A có quyền giảm trừ hoặc không thanh toán phần Phí Dịch vụ liên quan đến nội dung vi phạm pháp luật hoặc đơn phương chấm dứt Hợp đồng tùy theo mức độ nghiêm trọng của sự việc. ",
      "Vi phạm nghĩa vụ bảo vệ hình ảnh, uy tín và danh tiếng thương hiệu và danh tiếng cá nhân của Bên B: Bên A có quyền đơn phương chấm dứt Hợp đồng, từ chối thanh toán phần phí dịch vụ liên quan đến sai phạm và yêu cầu Bên B thực hiện các biện pháp khắc phục (bao gồm đính chính, gỡ bỏ nội dung nếu có).",
      "6.3. Bồi thường thiệt hại",
      "Bên nào vi phạm nghĩa vụ theo Hợp đồng gây thiệt hại cho Bên còn lại thì phải bồi thường toàn bộ thiệt hại thực tế, trực tiếp phát sinh theo quy định của pháp luật.",
      "",
      "ĐIỀU 7: HIỆU LỰC VÀ CHẤM DỨT HỢP ĐỒNG ",
      "7.1. Hiệu lực: Hợp đồng có hiệu lực trong thời hạn 01 (một) năm kể từ ngày ký hoặc đến thời điểm Hai Bên hoàn tất nghiệm thu, thanh lý Hợp đồng theo quy định tại Hợp đồng này, tùy thời điểm nào đến trước.",
      "7.2. Các trường hợp chấm dứt hợp đồng",
      "Hai bên cùng thỏa thuận chấm dứt Hợp đồng",
      "Bên A có quyền đơn phương chấm dứt Hợp đồng theo mục c, d khoản 6.2, Điều 6 của Hợp đồng này.",
      "Bên B có quyền đơn phương chấm dứt Hợp đồng nếu Bên A vi phạm nghĩa vụ thanh toán quá 30 ngày.",
      "7.3. Thanh lý Hợp đồng",
      "Hai Bên bắt buộc ký Biên bản nghiệm thu và/hoặc Biên bản thanh lý trong các trường hợp sau:",
      "Giá trị nghiệm thu hoặc thanh toán thực tế từ 20.000.000 đồng trở lên; hoặc",
      "Giá trị nghiệm thu/thanh toán thực tế dưới 20.000.000 đồng nhưng khác với giá trị Hợp đồng đã ký kết.",
      "Hợp đồng được tự động nghiệm thu và thanh lý mà không cần ký Biên bản nghiệm thu hoặc Biên bản thanh lý khi đồng thời đáp ứng đầy đủ các điều kiện sau:",
      "Giá trị Hợp đồng dưới 20.000.000 đồng;",
      "Giá trị nghiệm thu thực tế và giá trị thanh toán thực tế đúng bằng giá trị Hợp đồng;",
      "Hai Bên đã hoàn tất toàn bộ quyền và nghĩa vụ theo Hợp đồng.",
      "Thời điểm đáp ứng đầy đủ các điều kiện tự động nghiệm thu và thanh lý được xem là thời điểm Hợp đồng được nghiệm thu, thanh lý và chấm dứt hiệu lực.",
      "ĐIỀU 8: BẢO MẬT THÔNG TIN",
      "Trong quá trình thực hiện Hợp đồng và sau khi Hợp đồng chấm dứt, mỗi Bên (sau đây gọi là “Bên Nhận Thông Tin”) có nghĩa vụ bảo mật tuyệt đối đối với mọi thông tin, tài liệu do Bên còn lại (“Bên Tiết Lộ”) cung cấp hoặc phát sinh liên quan đến việc thực hiện Hợp đồng, bao gồm nhưng không giới hạn các điều khoản Hợp đồng, dữ liệu, tài liệu, kế hoạch kinh doanh, thông tin tài chính, chiến lược marketing, bí mật kinh doanh và các thông tin có tính chất bảo mật khác (“Thông Tin Mật”); theo đó, Bên Nhận Thông Tin không được tiết lộ, công bố hoặc sử dụng Thông Tin Mật cho bất kỳ mục đích nào ngoài việc thực hiện Hợp đồng nếu không có sự chấp thuận trước bằng văn bản của Bên Tiết Lộ.",
      "Bên vi phạm phải chịu trách nhiệm bồi thường toàn bộ thiệt hại phát sinh cho Bên còn lại và các bên liên quan (nếu có).",
      "Thời hạn bảo mật: Nghĩa vụ bảo mật tiếp tục có hiệu lực sau khi Hợp Đồng chấm dứt hoặc hết hạn, cho đến khi Thông Tin Bảo Mật trở thành thông tin công khai hợp pháp.",
      "",
      "ĐIỀU 9: BẤT KHẢ KHÁNG",
      "Một Bên sẽ không bị xem là vi phạm Hợp Đồng nếu việc chậm trễ hoặc không thực hiện nghĩa vụ do sự kiện khách quan, không thể lường trước và không thể khắc phục mặc dù đã áp dụng mọi biện pháp cần thiết (“Sự Kiện Bất Khả Kháng”), bao gồm nhưng không giới hạn: thiên tai, hỏa hoạn, chiến tranh, bạo loạn, đình công, dịch bệnh, hoặc các quyết định, hạn chế của cơ quan nhà nước có thẩm quyền. Bên bị ảnh hưởng phải thông báo bằng văn bản cho Bên còn lại trong vòng 03 ngày làm việc kể từ khi xảy ra sự kiện, nêu rõ bản chất sự kiện, phạm vi ảnh hưởng và thời gian dự kiến khắc phục.",
      "",
      "ĐIỀU 10: ĐIỀU KHOẢN CHUNG",
      "Luật áp dụng: Hợp Đồng này được điều chỉnh và giải thích theo pháp luật Việt Nam.",
      "Giải quyết tranh chấp: Mọi tranh chấp phát sinh từ hoặc liên quan đến Hợp Đồng sẽ được ưu tiên giải quyết thông qua thương lượng, hòa giải giữa các Bên. Nếu tranh chấp không được giải quyết trong vòng 30 (ba mươi) ngày kể từ ngày một Bên thông báo bằng văn bản về tranh chấp, tranh chấp sẽ được đưa ra Tòa án có thẩm quyền tại Việt Nam để giải quyết.",
      "Hợp đồng này được lập thành 02 bản, mỗi Bên giữ 01 bản, có giá trị pháp lý như nhau.",
      "",
      "ĐẠI DIỆN BÊN A",
      "ĐẠI DIỆN BÊN B",
      "",
      "",
      "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
      "http://www.upbase.asia",
      "Trang 1 ",
      "",
      "",
      "",
      "",
      "BM.HĐ.VID.COM.Ver052026",
      ""
    ],
    "blocks": [
      {
        "kind": "p",
        "part": "word/header1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/header1.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header1.xml",
                  "paragraph": 1,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header1.xml",
                  "paragraph": 2,
                  "text": "BM.HĐ.VID.COM.Ver052026",
                  "align": "right"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/header1.xml",
        "paragraph": 3,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 0,
        "text": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 1,
        "text": "Độc lập – Tự do – Hạnh phúc",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 2,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 3,
        "text": "HỢP ĐỒNG DỊCH VỤ BOOKING VIDEO",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 4,
        "text": "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "align": "center",
        "boldPrefix": 4
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 5,
        "text": "Căn cứ: ",
        "bold": true,
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 6,
        "text": "Bộ luật Dân sự số 91/2015/QH13, có hiệu lực từ ngày 01/01/2017;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 7,
        "text": "Luật Thương mại số 36/2005/QH11, có hiệu lực từ ngày 01/01/2006;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 8,
        "text": "Luật Thương mại điện tử số 122/2025/QH15, có hiệu lực từ ngày 01/07/2026;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 9,
        "text": "Nghị định số 147/2024/NĐ-CP về quản lý, cung cấp và sử dụng dịch vụ Internet và thông tin trên mạng, có hiệu lực từ ngày 25/12/2024; ",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 10,
        "text": "Luật Quảng cáo số 16/2012/QH13 có hiệu lực từ ngày 01/01/2013;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 11,
        "text": "Luật sửa đổi, bổ sung một số điều của Luật Quảng cáo số 75/2025/QH15, có hiệu lực từ ngày 01/01/2026;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 12,
        "text": "Luật Sở hữu Trí tuệ số 50/2005/QH11, có hiệu lực từ ngày 01/07/2006;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 13,
        "text": "Luật Sửa đổi bổ sung một số điều của Luật Sở hữu Trí tuệ số 131/2025/QH15, có hiệu lực từ ngày 01/04/2026;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 14,
        "text": "Nhu cầu và khả năng của hai Bên.",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 15,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 16,
        "text": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 17,
        "text": "",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 18,
                  "text": "BÊN SỬ DỤNG DỊCH VỤ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 4
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 19,
                  "text": "BÊN A",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 20,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 21,
                  "text": "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 22,
                  "text": "Mã số thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 23,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 24,
                  "text": "0109361325",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 25,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 26,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 27,
                  "text": "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 28,
                  "text": "Người đại diện",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 29,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 30,
                  "text": "Ông Đỗ Văn Giang   ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 31,
                  "text": "Chức vụ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 32,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 33,
                  "text": "Giám đốc",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 34,
                  "text": "Sau đây gọi tắt là “Bên A”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 35,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 36,
                  "text": "BÊN CUNG ỨNG DỊCH VỤ ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 3
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 37,
                  "text": "BÊN B",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 38,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 39,
                  "text": "Tên Công ty",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 40,
                  "text": "Mã số thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 41,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 42,
                  "text": "MST công ty",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 43,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 44,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 45,
                  "text": "Địa chỉ công ty",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 46,
                  "text": "Người đại diện",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 47,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 48,
                  "text": "",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 49,
                  "text": "Chức vụ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 50,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 51,
                  "text": "….",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 52,
                  "text": "Theo ủy quyền số … ngày… - cần ủy quyền từ người đại diện theo pháp luật nếu người ký không phải là đại diện pháp luật (giám đốc, tổng giám đốc công ty)",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 53,
                  "text": "Số điện thoại",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 54,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 55,
                  "text": "",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 56,
                  "text": "Email",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 57,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 58,
                  "text": "",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 59,
                  "text": "Sau đây gọi tắt là “Bên B”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 60,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 61,
        "text": "Bên A có nhu cầu triển khai các hoạt động quảng bá và tiếp thị sản phẩm thông qua các KOL/KOC trên các nền tảng truyền thông và/hoặc thương mại điện tử. Bên B là đơn vị quản lý và đại diện cho các KOL/KOC, có năng lực kết nối, điều phối và sắp xếp các KOL/KOC tham gia các hoạt động quảng bá theo yêu cầu của Bên A.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 62,
        "text": "Trên cơ sở đó, hai Bên thống nhất ký kết Hợp đồng dịch vụ này nhằm thiết lập các điều khoản và điều kiện chung cho việc cung cấp dịch vụ quảng cáo, tiếp thị và thúc đẩy doanh số thông qua KOL/KOC.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 63,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 64,
        "text": "ĐIỀU 1: ĐỊNH NGHĨA",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 65,
                  "text": "Khái niệm",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 66,
                  "text": "Định nghĩa",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 67,
                  "text": "Tài khoản mạng xã hội",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 68,
                  "text": "Là tài khoản mạng xã hội có link: …"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 69,
                  "text": "Bên B là chủ sở hữu hợp pháp và có toàn quyền quản lý, vận hành tài khoản mạng xã hội trong suốt thời gian thực hiện Hợp đồng. ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 70,
                  "text": "Tiếp thị ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 71,
                  "text": "liên kết ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 72,
                  "text": "(Affiliate)",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 73,
                  "text": "Là việc Bên B quảng bá sản phẩm/dịch vụ thông qua cơ chế của nền tảng thương mại điện tử (sàn TMĐT) (bao gồm link, mã, giỏ hàng hoặc công cụ tương đương), trong đó doanh thu chỉ được ghi nhận khi được hệ thống nền tảng xác nhận. Hoa hồng và doanh thu được xác định theo dữ liệu cuối cùng từ nền tảng và có thể bị điều chỉnh trong trường hợp hoàn đơn, gian lận hoặc vi phạm chính sách.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 74,
                  "text": "Booking video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 75,
                  "text": "Booking video là việc Bên A thuê Bên B sản xuất và đăng tải Video theo các yêu cầu cụ thể tại hợp đồng, có nội dung review, đánh giá, giới thiệu, quảng bá sản phẩm và thúc đẩy doanh số bán hàng (có thể bao gồm các cơ chế như gắn link, mã, giỏ hàng hoặc kêu gọi hành động). ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 76,
                  "text": "Phí dịch vụ booking",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 77,
                  "text": "Phí dịch vụ booking là khoản phí cố định Bên A thanh toán cho Bên B.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 78,
                  "text": "Hoa hồng",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 79,
                  "text": "Là khoản thu nhập của Bên B dựa trên doanh thu Affiliate hợp lệ được nền tảng chi trả. Bên B tự chịu trách nhiệm kê khai, nộp thuế và các nghĩa vụ tài chính liên quan đến khoản hoa hồng này theo quy định pháp luật.",
                  "align": "justify"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 80,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 81,
        "text": "ĐIỀU 2: PHẠM VI CÔNG VIỆC",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 82,
        "text": " Phạm vi công việc cần thực hiện",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 83,
        "text": "Bên B thực hiện sản xuất và đăng tải video trên các nền tảng mạng xã hội.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 84,
        "text": "Phạm vi công việc mở rộng:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 85,
        "text": "Gắn công cụ bán hàng: Gắn link, giỏ hàng, mã theo dõi, mã giảm giá, hashtag, CTA …; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 86,
        "text": "Hỗ trợ quảng cáo: Cho phép Bên A hoặc bên thứ ba do Bên A chỉ định sử dụng nội dung video để chạy quảng cáo, chia sẻ mã quảng cáo, …; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 87,
        "text": "Sử dụng hình ảnh:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 88,
        "text": "Bên A có quyền sử dụng, khai thác, chỉnh sửa kỹ thuật, resize, cắt ghép định dạng, biên tập, chuyển thể, lồng ghép, tái sử dụng và phân phối lại hình ảnh, video, nội dung do Bên B thực hiện để phục vụ hoạt động truyền thông, quảng bá và thương mại cho nhãn hàng/sản phẩm theo phạm vi đã thỏa thuận tại Hợp đồng.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 89,
        "text": "Bên A được quyền đăng tải lại video trên kênh chính thức của nhãn hàng; sử dụng hình ảnh/video làm banner, hình ảnh trưng bày trên gian hàng TMĐT, website, landing page, nền tảng số hoặc các kênh truyền thông khác của nhãn hàng; đồng thời được quyền cho phép các KOC/KOL/người dùng khác duet, stitch, chia sẻ hoặc sử dụng lại nội dung nhằm phục vụ hoạt động quảng bá chiến dịch trong phạm vi đã thỏa thuận.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 90,
        "text": "Bên A được quyền sử dụng hình ảnh, giọng nói, tên, hình tượng và các yếu tố nhận diện của Bên B/KOL xuất hiện trong nội dung nhằm phục vụ hoạt động quảng cáo, truyền thông và thương mại cho nhãn hàng/sản phẩm theo phạm vi sử dụng đã thỏa thuận.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 91,
        "text": "Phạm vi sử dụng bao gồm nhưng không giới hạn tại: website, landing page, sàn thương mại điện tử, Facebook, TikTok, Instagram, YouTube và các nền tảng số khác của nhãn hàng.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 92,
        "text": "Nội dung được phép sử dụng trong các hoạt động digital marketing, social seeding, PR, media booking, livestream, affiliate marketing, e-commerce campaign và các hoạt động quảng bá sản phẩm/nhãn hàng khác theo nhu cầu truyền thông thực tế của Bên A.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 93,
        "text": "Tham gia hoạt động truyền thông và sự kiện: Tham gia event …; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 94,
        "text": "Triển khai các định dạng nội dung khác: Thực hiện các bài đăng ngoài video như hình ảnh, carousel, bài viết, caption, story, reel hoặc các định dạng nội dung khác.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 95,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 96,
        "text": "Quy trình cung ứng dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 97,
                  "text": "Bước",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 98,
                  "text": "Tên bước",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 99,
                  "text": "Mô tả công việc",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 100,
                  "text": "1",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 101,
                  "text": "Ký Hợp đồng ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 102,
                  "text": "dịch vụ ",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 103,
                  "text": "Hai Bên ký Hợp đồng dịch vụ làm cơ sở pháp lý điều chỉnh toàn bộ hoạt động hợp tác.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 104,
                  "text": "2",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 105,
                  "text": "Yêu cầu dịch vụ",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 106,
                  "text": "Bên A gửi brief/yêu cầu cung ứng dịch vụ, bao gồm: thông tin chiến dịch, sản phẩm/dịch vụ, nội dung quảng bá, nền tảng triển khai, timeline và các yêu cầu liên quan.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 107,
                  "text": "3",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 108,
                  "text": "Dựng kịch bản",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 109,
                  "text": "Bên B xây dựng kịch bản và nội dung video dựa trên brief của Bên A và gửi Bên A phê duyệt trước khi sản xuất.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 110,
                  "text": "4",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 111,
                  "text": "Duyệt kịch bản",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 112,
                  "text": "Bên A xem xét, phản hồi và yêu cầu chỉnh sửa (nếu có).",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 113,
                  "text": "Tối đa 01 vòng chỉnh sửa trước khi duyệt cuối cùng.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 114,
                  "text": "5",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 115,
                  "text": "Sản xuất video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 116,
                  "text": "Bên B tiến hành quay dựng, chỉnh lý, biên tập, hậu kỳ video theo kịch bản đã thống nhất.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 117,
                  "text": "6",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 118,
                  "text": "Duyệt video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 119,
                  "text": "Bên A xem xét, phản hồi và yêu cầu chỉnh sửa (nếu có). ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 120,
                  "text": "Tối đa 01 vòng chỉnh sửa trước khi duyệt cuối cùng.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 121,
                  "text": "7",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 122,
                  "text": "Đăng tải video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 123,
                  "text": "Bên B đăng tải nội dung hoặc thực hiện livestream theo đúng nội dung đã duyệt, đúng tài khoản và timeline.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 124,
                  "text": "8",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 125,
                  "text": "Ghi nhận ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 126,
                  "text": "kết quả",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 127,
                  "text": "Ghi nhận các chỉ số: lượt xem, tương tác, đơn hàng, GMV… theo dữ liệu từ nền tảng.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 128,
                  "text": "9",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 129,
                  "text": "Nghiệm thu",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 130,
                  "text": "Bên A kiểm tra việc thực hiện dịch vụ.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 131,
                  "text": "10",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 132,
                  "text": "Thanh toán phí Booking",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 133,
                  "text": "Bên A thực hiện thanh toán phí booking.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 134,
                  "text": "11",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 135,
                  "text": "Đối soát Affiliate",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 136,
                  "text": "(nếu có)",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 137,
                  "text": "Hoa hồng Affiliate do nền tảng chi trả trực tiếp cho Bên B theo dữ liệu hệ thống.",
                  "align": "justify"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 138,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 139,
        "text": "2.3. Tiêu chuẩn nghiệm thu dịch vụ ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 140,
        "text": "Tiêu chuẩn về nội dung và đăng tải",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 141,
        "text": "Video phải tuân thủ đầy đủ kịch bản, thông điệp và guideline do Bên A cung cấp; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 142,
        "text": "Bao gồm đầy đủ các yếu tố yêu cầu (nếu có): link, giỏ hàng, mã theo dõi, hashtag, CTA…; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 143,
        "text": "Chỉ được đăng tải sau khi có phê duyệt nội dung từ Bên A; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 144,
        "text": "Đăng tải đúng tài khoản, đúng thời điểm và duy trì hiển thị, không được xóa video sau khi đăng tải mà không có sự chấp thuận hoặc yêu cầu của Bên A; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 145,
        "text": "Nếu video bị ẩn, xóa, tắt âm thanh… hoặc các lỗi tương đương ảnh hưởng đến việc hiển thị bình thường của video trên nền tảng thì Bên B có nghĩa vụ phải chỉnh lý, đăng tải lại video đã khắc phục lỗi.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 146,
        "text": "Không vi phạm pháp luật, chính sách nền tảng hoặc gây ảnh hưởng tiêu cực đến hình ảnh thương hiệu. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 147,
        "text": "Tiêu chuẩn về kịch bản và sản xuất",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 148,
        "text": "Kịch bản phải được Bên A phê duyệt bằng email/tin nhắn/văn bản trước khi quay dựng; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 149,
        "text": "Mọi chi phí phát sinh do sản xuất khi chưa có phê duyệt hợp lệ do Bên B tự chi trả; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 150,
        "text": "Cảnh quay, bố cục và thông điệp phải phù hợp với kịch bản đã duyệt; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 151,
        "text": "Trường hợp sai lệch, Bên A có quyền từ chối nghiệm thu và yêu cầu chỉnh sửa hoặc quay lại mà không phát sinh chi phí. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 152,
        "text": "Tiêu chuẩn về chất lượng và hậu kỳ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 153,
        "text": "Video phải được dựng và hoàn thiện theo tiêu chuẩn đã thống nhất (video mẫu, guideline thương hiệu …); ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 154,
        "text": "Bên B có trách nhiệm chỉnh sửa theo yêu cầu hợp lý của Bên A cho đến khi đạt tiêu chuẩn nghiệm thu.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 155,
        "text": "Tiêu chuẩn về hình ảnh và nhận diện",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 156,
        "text": "Bên B phải kiểm soát trang phục, bối cảnh, nhận diện cá nhân và các yếu tố hình ảnh khác nhằm không được gây trùng lặp, xung đột hoặc ảnh hưởng tiêu cực đến hiệu quả truyền thông của Bên A;",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 157,
        "text": "Trường hợp vi phạm, Bên B phải chỉnh sửa, thay thế hoặc quay lại nội dung cho đến khi đạt yêu cầu, không làm ảnh hưởng tiến độ cam kết. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 158,
        "text": "Áp dụng đối với dịch vụ khác: tiêu chuẩn nghiệm thu được áp dụng theo quy định cụ thể tại mô tả dịch vụ.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 159,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 160,
        "text": "ĐIỀU 3: PHÍ DỊCH VỤ VÀ THANH TOÁN",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 161,
        "text": "Phí dịch vụ booking",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 162,
                  "text": "STT",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 163,
                  "text": "Hạng mục",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 164,
                  "text": "Đơn giá",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 165,
                  "text": "(VNĐ)",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 166,
                  "text": "Số lượng",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 167,
                  "text": "Thành tiền (VND)",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 168,
                  "text": "1"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 169,
                  "text": "Sản xuất và đăng tải Video review, đánh giá, giới thiệu, quảng bá và thúc đẩy doanh số bán hàng với sản phẩm ….",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 170,
                  "text": "Tài khoản đăng tải – link: ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 171,
                  "text": "Thời gian đăng tải:",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 172,
                  "text": "Thời lượng video:",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 173,
                  "text": "Có gắn link/giỏ hàng sản phẩm … (thời gian tiến hành gắn giỏ hàng sản phẩm do Bên B thông báo cụ thể theo thực tế phát sinh)",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 174,
                  "text": "Cấp mã code để chạy quảng cáo trong… ngày",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 175,
                  "text": "Bàn giao video gốc",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 176,
                  "text": "Yêu cầu key cần bổ sung nếu có",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 177,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 178,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 179,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 180,
                  "text": "2"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 181,
                  "text": "Sử dụng hình ảnh trong … ngày từ ngày ….",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 182,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 183,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 184,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 185,
                  "text": "Tổng Giá trị hợp đồng chưa bao gồm thuế",
                  "bold": true
                }
              ],
              "colSpan": 4
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 186,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 187,
                  "text": "Thuế VAT",
                  "bold": true
                }
              ],
              "colSpan": 4
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 188,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 189,
                  "text": "Tổng Giá trị hợp đồng đã bao gồm thuế VAT",
                  "bold": true
                }
              ],
              "colSpan": 4
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 190,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 191,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 192,
        "text": "Thỏa thuận Hoa hồng Affiliate (nếu áp dụng)",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 193,
        "text": "Hoa hồng affiliate gồm hai loại như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 194,
        "text": "Hoa hồng organic: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh tự nhiên từ video, được ghi nhận thông qua link/mã theo dõi của Bên B và không bao gồm doanh thu phát sinh từ ngân sách quảng cáo do Bên A hoặc bên thứ ba chi trả. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 195,
        "text": "Hoa hồng chạy ads: Bên B được hưởng hoa hồng affiliate với tỷ lệ …% trên doanh thu phát sinh từ video được sử dụng để chạy quảng cáo, với điều kiện doanh thu đó được ghi nhận thông qua link/mã theo dõi của Bên B và được Bên A xác nhận trong báo cáo đối soát. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 196,
        "text": "Doanh thu làm căn cứ tính hoa hồng là doanh thu đã hoàn tất (không bao gồm đơn hủy, hoàn trả hoặc gian lận), theo dữ liệu của nền tảng và/hoặc hệ thống của Bên A; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 197,
        "text": "Hoa hồng affiliate do nền tảng chi trả trực tiếp cho Bên B. Bên B tự chịu trách nhiệm kê khai, khấu trừ và nộp các loại thuế, phí liên quan đến khoản thu nhập từ hoa hồng affiliate theo quy định pháp luật.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 198,
        "text": "Hình thức thanh toán",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 199,
        "text": "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 200,
        "text": "Tên chủ tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 201,
        "text": "Số tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 202,
        "text": "Tại Ngân hàng: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 203,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 204,
        "text": "Thời hạn thanh toán",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 205,
                  "text": "Thanh toán 1 lần",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 206,
                  "text": "Phí dịch vụ được thanh toán 1 lần trong vòng 7 - 10 ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) sau khi Bên B hoàn thành dịch vụ và hai bên đã hoàn tất việc ký kết Hợp đồng này (Bên A đã nhận được Hợp đồng có chữ ký của hai bên) đồng thời Bên B đã cung cấp hóa đơn hợp lệ cho Bên A. ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 207,
                  "text": "Thanh toán 2 lần",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 208,
                  "text": "Phí dịch vụ được thanh toán làm 2 lần:",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 209,
                  "text": "Lần 1 tạm ứng … trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm hai bên ký kết hợp đồng này.",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 210,
                  "text": "Lần 2 thanh toán số tiền còn lại trong vòng … ngày làm việc (trừ thứ bảy, chủ nhật, ngày nghỉ lễ) kể từ thời điểm Bên B hoàn thành dịch vụ và Bên A đã nhận được Hợp đồng, Biên bản nghiệm thu dịch vụ có chữ ký của hai bên đồng thời Bên B đã cung cấp hóa đơn hợp lệ toàn bộ giá trị Hợp đồng cho Bên A.",
                  "align": "justify"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 211,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 212,
        "text": "ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 213,
        "text": "4.1. Quyền của Bên A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 214,
        "text": "Quyền kiểm tra, giám sát: Bên A có quyền kiểm tra và giám sát Bên B thực hiện công việc đúng nội dung, chất lượng, tiến độ theo Hợp đồng; có quyền phê duyệt hoặc đưa ra ý kiến trong thời gian hợp lý đối với các nội dung, đề xuất của Bên B.",
        "align": "justify",
        "boldPrefix": 26
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 215,
        "text": "Quyền chỉnh sửa kịch bản: Bên A có quyền kiểm tra và yêu cầu Bên B chỉnh sửa nội dung kịch bản trước khi sản xuất/trước khi đăng tải trong trường hợp nội dung chưa phù hợp với yêu cầu đã thống nhất.",
        "align": "justify",
        "boldPrefix": 26
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 216,
        "text": "Quyền chỉnh sửa sản phẩm: Trường hợp nội dung video/bài đăng do Bên B đăng tải không đúng với nội dung đã được hai Bên thống nhất, Bên A có quyền yêu cầu Bên B chỉnh sửa, gỡ bỏ hoặc thay thế ngay nội dung đã đăng tải sai.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 217,
        "text": "4.2. Nghĩa vụ của Bên A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 218,
        "text": "Thanh toán đầy đủ và đúng hạn Phí Booking cho Bên B theo Hợp đồng;",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 219,
        "text": "Cung cấp đầy đủ, kịp thời các thông tin, tài liệu, sản phẩm mẫu và phối hợp với Bên B để triển khai dịch vụ theo Hợp đồng;",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 220,
        "text": "Không sử dụng hình ảnh, nội dung hoặc danh tiếng của Bên B theo cách gây ảnh hưởng tiêu cực đến uy tín hoặc hình ảnh cá nhân của Bên B.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 221,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 222,
        "text": "ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 223,
        "text": "5.1.   Quyền của Bên B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 224,
        "text": "Yêu cầu Bên A cung cấp đầy đủ thông tin, tài liệu, sản phẩm mẫu, guideline, chính sách thương hiệu và các dữ liệu cần thiết để thực hiện dịch vụ; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 225,
        "text": "Yêu cầu Bên A phối hợp phản hồi, xác nhận nội dung, kế hoạch triển khai; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 226,
        "text": "Được sử dụng tên thương mại, nhãn hiệu, hình ảnh sản phẩm của Bên A trong phạm vi cần thiết để thực hiện dịch vụ theo Hợp đồng.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 227,
        "text": " Nghĩa vụ của Bên B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 228,
        "text": "Nghĩa vụ thực hiện dịch vụ: Thực hiện công việc đúng nội dung, chất lượng, số lượng, thời hạn, nền tảng theo Hợp đồng đã ký kết; không được chuyển giao, ủy quyền cho bên thứ ba thực hiện công việc; chủ động thông báo kịp thời cho Bên A về bất kỳ sự kiện nào có thể ảnh hưởng đến việc thực hiện dịch vụ.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 229,
        "text": "Nghĩa vụ duy trì nội dung đã đăng tải:",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 230,
        "text": "Bên B không được tự ý xóa, ẩn hoặc hạn chế hiển thị đối với nội dung (bao gồm video, bài đăng) đã đăng tải theo Hợp đồng. Trong trường hợp nội dung phát sinh lỗi kỹ thuật do nền tảng (bao gồm nhưng không giới hạn: mất tiếng, lỗi hình ảnh, lỗi hiển thị hoặc các sự cố tương tự), Bên B có nghĩa vụ phối hợp với Bên A để khắc phục và đăng tải lại nội dung trong thời gian sớm nhất theo yêu cầu của Bên A.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 231,
        "text": "Nghĩa vụ về nội dung và trách nhiệm quảng cáo: Bên B có trách nhiệm quản lý, điều phối và đảm bảo các KOL/KOC và/hoặc host livestream do Bên B sắp xếp tham gia thực hiện hoạt động quảng cáo tuân thủ đầy đủ các quy định pháp luật có liên quan, bao gồm nhưng không giới hạn Luật Quảng cáo, Luật Bảo vệ quyền lợi người tiêu dùng, cũng như các quy định, chính sách của các nền tảng thương mại điện tử và/hoặc mạng xã hội. Bên B chịu trách nhiệm rà soát, nhắc nhở và kiểm soát nội dung do các KOL/KOC thực hiện nhằm hạn chế tối đa các hành vi quảng cáo sai sự thật, gây nhầm lẫn hoặc vi phạm pháp luật.",
        "align": "justify",
        "boldPrefix": 47
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 232,
        "text": "Nghĩa vụ tư vấn nội dung: Bên B có nghĩa vụ tư vấn, đề xuất nội dung, thông điệp và định hướng triển khai phù hợp với đặc thù nền tảng, hành vi người dùng, mục tiêu chiến dịch… nhằm tối ưu hiệu quả truyền thông.",
        "align": "justify",
        "boldPrefix": 26
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 233,
        "text": "Nghĩa vụ bảo vệ hình ảnh và uy tín nhãn hiệu: Bên B có trách nhiệm quản lý và đảm bảo các KOL/KOC do mình quản lý và/hoặc sắp xếp không thực hiện bất kỳ hành vi, phát ngôn hoặc đăng tải nội dung nào có thể gây ảnh hưởng tiêu cực, gây hiểu nhầm, chưa được kiểm chứng hoặc làm tổn hại đến hình ảnh, uy tín của Bên A hoặc sản phẩm/dịch vụ của Bên A.Bên B đồng thời có nghĩa vụ kiểm soát việc sử dụng ngôn từ, hình ảnh của các KOL/KOC nhằm đảm bảo không vi phạm pháp luật, không trái với thuần phong mỹ tục và phù hợp với định vị thương hiệu của Bên A. Nghĩa vụ này áp dụng trong suốt thời gian thực hiện Hợp đồng và kéo dài tối thiểu 06 (sáu) tháng kể từ ngày chấm dứt hợp tác đối với các nội dung liên quan đến chiến dịch.",
        "align": "justify",
        "boldPrefix": 46
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 234,
        "text": "Nghĩa vụ bảo vệ hình ảnh và uy tín cá nhân: Bên B có trách nhiệm quản lý và giám sát danh tiếng của các KOL/KOC do mình đại diện, đảm bảo các KOL/KOC không thực hiện các hành vi, phát ngôn hoặc tham gia các sự kiện có thể dẫn đến scandal, tranh cãi hoặc gây ảnh hưởng tiêu cực trực tiếp hoặc gián tiếp đến uy tín, hình ảnh của Bên A. Trong trường hợp phát sinh hoặc có nguy cơ phát sinh sự kiện ảnh hưởng tiêu cực, Bên B phải thông báo kịp thời cho Bên A và chủ động phối hợp với Bên A để xử lý, bao gồm nhưng không giới hạn việc gỡ bỏ nội dung, đính chính thông tin hoặc thay thế KOL/KOC khi cần thiết.",
        "align": "justify",
        "boldPrefix": 44
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 235,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 236,
        "text": "ĐIỂU 6: PHẠT VI PHẠM, BỒI THƯỜNG THIỆT HẠI",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 237,
        "text": "6.1. Vi phạm của Bên A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 238,
        "text": "Chậm thanh toán: Trừ trường hợp bất khả kháng hoặc do lỗi của Bên B, nếu Bên A chậm thanh toán quá 15 (mười lăm) ngày so với thời hạn đã thỏa thuận (thời hạn thanh toán được tính từ thời điểm Bên B hoàn tất chứng từ thanh toán), Bên A phải trả lãi chậm thanh toán với mức lãi suất 8%/năm trên số tiền chậm trả, tính theo số ngày chậm thanh toán.",
        "align": "justify",
        "boldPrefix": 16
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 239,
        "text": "6.2. Vi phạm của Bên B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 240,
        "text": "Vi phạm tiến độ thực hiện: Trường hợp Bên B không thực hiện đúng tiến độ theo Hợp đồng mà không do lỗi của Bên A hoặc yếu tố khách quan, Bên A sẽ gia hạn để Bên B khắc phục kịp thời theo tiến độ của dự án. Nếu Bên B không khắc phục trong vòng 3 – 5 ngày hoặc xong trước deadline cuối của dự án, Bên B phải chịu phạt tương đương 1% giá trị phí dịch vụ của hạng mục công việc bị vi phạm cho mỗi ngày chậm, tổng mức phạt không vượt quá 8% giá trị hạng mục đó hoặc Bên A có quyền không nghiệm thu và không trả phí cho hạng mục công việc hoàn thành muộn.",
        "align": "justify",
        "boldPrefix": 27
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 241,
        "text": "Vi phạm nghĩa vụ về về nội dung và trách nhiệm quảng cáo: Bên A có quyền yêu cầu Bên B gỡ bỏ, chỉnh sửa nội dung và chịu mọi trách nhiệm phát sinh; đồng thời Bên A có quyền giảm trừ hoặc không thanh toán phần Phí Dịch vụ liên quan đến nội dung vi phạm pháp luật hoặc đơn phương chấm dứt Hợp đồng tùy theo mức độ nghiêm trọng của sự việc. ",
        "align": "justify",
        "boldPrefix": 58
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 242,
        "text": "Vi phạm nghĩa vụ bảo vệ hình ảnh, uy tín và danh tiếng thương hiệu và danh tiếng cá nhân của Bên B: Bên A có quyền đơn phương chấm dứt Hợp đồng, từ chối thanh toán phần phí dịch vụ liên quan đến sai phạm và yêu cầu Bên B thực hiện các biện pháp khắc phục (bao gồm đính chính, gỡ bỏ nội dung nếu có).",
        "align": "justify",
        "boldPrefix": 100
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 243,
        "text": "6.3. Bồi thường thiệt hại",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 244,
        "text": "Bên nào vi phạm nghĩa vụ theo Hợp đồng gây thiệt hại cho Bên còn lại thì phải bồi thường toàn bộ thiệt hại thực tế, trực tiếp phát sinh theo quy định của pháp luật.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 245,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 246,
        "text": "ĐIỀU 7: HIỆU LỰC VÀ CHẤM DỨT HỢP ĐỒNG ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 247,
        "text": "7.1. Hiệu lực: Hợp đồng có hiệu lực trong thời hạn 01 (một) năm kể từ ngày ký hoặc đến thời điểm Hai Bên hoàn tất nghiệm thu, thanh lý Hợp đồng theo quy định tại Hợp đồng này, tùy thời điểm nào đến trước.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 248,
        "text": "7.2. Các trường hợp chấm dứt hợp đồng",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 249,
        "text": "Hai bên cùng thỏa thuận chấm dứt Hợp đồng",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 250,
        "text": "Bên A có quyền đơn phương chấm dứt Hợp đồng theo mục c, d khoản 6.2, Điều 6 của Hợp đồng này.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 251,
        "text": "Bên B có quyền đơn phương chấm dứt Hợp đồng nếu Bên A vi phạm nghĩa vụ thanh toán quá 30 ngày.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 252,
        "text": "7.3. Thanh lý Hợp đồng",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 253,
        "text": "Hai Bên bắt buộc ký Biên bản nghiệm thu và/hoặc Biên bản thanh lý trong các trường hợp sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 254,
        "text": "Giá trị nghiệm thu hoặc thanh toán thực tế từ 20.000.000 đồng trở lên; hoặc",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 255,
        "text": "Giá trị nghiệm thu/thanh toán thực tế dưới 20.000.000 đồng nhưng khác với giá trị Hợp đồng đã ký kết.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 256,
        "text": "Hợp đồng được tự động nghiệm thu và thanh lý mà không cần ký Biên bản nghiệm thu hoặc Biên bản thanh lý khi đồng thời đáp ứng đầy đủ các điều kiện sau:",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 257,
        "text": "Giá trị Hợp đồng dưới 20.000.000 đồng;",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 258,
        "text": "Giá trị nghiệm thu thực tế và giá trị thanh toán thực tế đúng bằng giá trị Hợp đồng;",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 259,
        "text": "Hai Bên đã hoàn tất toàn bộ quyền và nghĩa vụ theo Hợp đồng.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 260,
        "text": "Thời điểm đáp ứng đầy đủ các điều kiện tự động nghiệm thu và thanh lý được xem là thời điểm Hợp đồng được nghiệm thu, thanh lý và chấm dứt hiệu lực.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 261,
        "text": "ĐIỀU 8: BẢO MẬT THÔNG TIN",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 262,
        "text": "Trong quá trình thực hiện Hợp đồng và sau khi Hợp đồng chấm dứt, mỗi Bên (sau đây gọi là “Bên Nhận Thông Tin”) có nghĩa vụ bảo mật tuyệt đối đối với mọi thông tin, tài liệu do Bên còn lại (“Bên Tiết Lộ”) cung cấp hoặc phát sinh liên quan đến việc thực hiện Hợp đồng, bao gồm nhưng không giới hạn các điều khoản Hợp đồng, dữ liệu, tài liệu, kế hoạch kinh doanh, thông tin tài chính, chiến lược marketing, bí mật kinh doanh và các thông tin có tính chất bảo mật khác (“Thông Tin Mật”); theo đó, Bên Nhận Thông Tin không được tiết lộ, công bố hoặc sử dụng Thông Tin Mật cho bất kỳ mục đích nào ngoài việc thực hiện Hợp đồng nếu không có sự chấp thuận trước bằng văn bản của Bên Tiết Lộ.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 263,
        "text": "Bên vi phạm phải chịu trách nhiệm bồi thường toàn bộ thiệt hại phát sinh cho Bên còn lại và các bên liên quan (nếu có).",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 264,
        "text": "Thời hạn bảo mật: Nghĩa vụ bảo mật tiếp tục có hiệu lực sau khi Hợp Đồng chấm dứt hoặc hết hạn, cho đến khi Thông Tin Bảo Mật trở thành thông tin công khai hợp pháp.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 265,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 266,
        "text": "ĐIỀU 9: BẤT KHẢ KHÁNG",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 267,
        "text": "Một Bên sẽ không bị xem là vi phạm Hợp Đồng nếu việc chậm trễ hoặc không thực hiện nghĩa vụ do sự kiện khách quan, không thể lường trước và không thể khắc phục mặc dù đã áp dụng mọi biện pháp cần thiết (“Sự Kiện Bất Khả Kháng”), bao gồm nhưng không giới hạn: thiên tai, hỏa hoạn, chiến tranh, bạo loạn, đình công, dịch bệnh, hoặc các quyết định, hạn chế của cơ quan nhà nước có thẩm quyền. Bên bị ảnh hưởng phải thông báo bằng văn bản cho Bên còn lại trong vòng 03 ngày làm việc kể từ khi xảy ra sự kiện, nêu rõ bản chất sự kiện, phạm vi ảnh hưởng và thời gian dự kiến khắc phục.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 268,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 269,
        "text": "ĐIỀU 10: ĐIỀU KHOẢN CHUNG",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 270,
        "text": "Luật áp dụng: Hợp Đồng này được điều chỉnh và giải thích theo pháp luật Việt Nam.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 271,
        "text": "Giải quyết tranh chấp: Mọi tranh chấp phát sinh từ hoặc liên quan đến Hợp Đồng sẽ được ưu tiên giải quyết thông qua thương lượng, hòa giải giữa các Bên. Nếu tranh chấp không được giải quyết trong vòng 30 (ba mươi) ngày kể từ ngày một Bên thông báo bằng văn bản về tranh chấp, tranh chấp sẽ được đưa ra Tòa án có thẩm quyền tại Việt Nam để giải quyết.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 272,
        "text": "Hợp đồng này được lập thành 02 bản, mỗi Bên giữ 01 bản, có giá trị pháp lý như nhau.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 273,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "signature",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 274,
                  "text": "ĐẠI DIỆN BÊN A",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 275,
                  "text": "ĐẠI DIỆN BÊN B",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 276,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/footer1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/footer1.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 1,
                  "text": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 2,
                  "text": "http://www.upbase.asia",
                  "align": "center"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 3,
                  "text": "Trang 1 ",
                  "align": "right"
                },
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 4,
                  "text": ""
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/footer1.xml",
        "paragraph": 5,
        "text": ""
      }
    ],
    "category": "BOOKING_VIDEO",
    "description": "Mẫu hợp đồng dịch vụ sản xuất & đăng tải video quảng cáo áp dụng cho đối tác là công ty.",
    "active": true,
    "defaultReviewRoles": [
      "LEGAL",
      "FINANCE"
    ],
    "exemptLegalReview": true,
    "scope": "GLOBAL",
    "updatedAt": "2026-05-01T08:00:00.000Z",
    "updatedBy": "Phòng Pháp chế",
    "fieldCount": 33,
    "requiredFieldCount": 14,
    "history": [
      {
        "version": "Ver052026",
        "hash": "003c9a94a221818eb037832d65698c75980f127a5f1f09c5966b8ec7d181d339",
        "filename": "3.1.1. BM.HĐ.VID.COM.Ver052026 booking video.docx",
        "updatedAt": "2026-05-01T08:00:00.000Z",
        "updatedBy": "Phòng Pháp chế",
        "note": "Phiên bản chuẩn ban hành bởi Pháp chế"
      }
    ]
  },
  "COM-BBNT": {
    "id": "COM-BBNT",
    "name": "Nghiệm thu video · Công ty",
    "filename": "3.1.2. BM.BBNT.VID.COM.Ver052026 boooking video.docx",
    "subject": "Công ty",
    "kind": "ACCEPTANCE",
    "version": "Ver052026",
    "hash": "dee8d8d79101a66955182fd8290dcb261ec4719516e50c23ed4e16fe70917b59",
    "fields": [
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 0,
        "end": 10,
        "label": "dd.mm.yy",
        "context": "[dd.mm.yy]/BBNT/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 29,
        "end": 37,
        "label": "ID KOC",
        "context": "[dd.mm.yy]/BBNT/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 5,
        "start": 29,
        "end": 39,
        "label": "dd.mm.yy",
        "context": "Kèm theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 5,
        "start": 58,
        "end": 66,
        "label": "ID KOC",
        "context": "Kèm theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p29:cell",
        "part": "word/document.xml",
        "paragraph": 29,
        "label": "BÊN B",
        "context": "BÊN B · Tên Công ty",
        "required": true,
        "start": 0,
        "end": 11,
        "title": "Tên công ty",
        "group": "PARTY",
        "kind": "text",
        "source": "partyName"
      },
      {
        "key": "word/document.xml:p32:cell",
        "part": "word/document.xml",
        "paragraph": 32,
        "label": "Mã số thuế",
        "context": "Mã số thuế · MST công ty",
        "required": true,
        "start": 0,
        "end": 11,
        "title": "Mã số thuế",
        "group": "PARTY",
        "kind": "text",
        "source": "taxCode"
      },
      {
        "key": "word/document.xml:p35:cell",
        "part": "word/document.xml",
        "paragraph": 35,
        "label": "Địa chỉ",
        "context": "Địa chỉ · Địa chỉ công ty",
        "required": true,
        "start": 0,
        "end": 15,
        "title": "Địa chỉ",
        "group": "PARTY",
        "kind": "long",
        "source": "address"
      },
      {
        "key": "word/document.xml:p38:cell",
        "part": "word/document.xml",
        "paragraph": 38,
        "label": "Người đại diện",
        "context": "Người đại diện",
        "required": true,
        "title": "Người đại diện",
        "group": "PARTY",
        "kind": "text",
        "source": "representative"
      },
      {
        "key": "word/document.xml:p41:cell",
        "part": "word/document.xml",
        "paragraph": 41,
        "label": "Chức vụ",
        "context": "Chức vụ · ….Theo ủy quyền số … ngày… - cần ủy quyền từ người đại diện theo pháp luật nếu người ký không phải là đại diện pháp luật (giám đốc, tổng giám đốc công ty)",
        "required": false,
        "start": 0,
        "end": 2,
        "title": "Chức vụ người đại diện",
        "group": "PARTY",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p45:cell",
        "part": "word/document.xml",
        "paragraph": 45,
        "label": "Số điện thoại",
        "context": "Số điện thoại",
        "required": true,
        "title": "Số điện thoại",
        "group": "PARTY",
        "kind": "text",
        "source": "phone"
      },
      {
        "key": "word/document.xml:p48:cell",
        "part": "word/document.xml",
        "paragraph": 48,
        "label": "Email",
        "context": "Email",
        "required": true,
        "title": "Email",
        "group": "PARTY",
        "kind": "text",
        "source": "email"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 51,
        "start": 27,
        "end": 37,
        "label": "dd.mm.yy",
        "context": "Căn cứ Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] và kết quả thực hiện công việc thực tế của Bên B. ",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 51,
        "start": 50,
        "end": 58,
        "label": "ID KOC",
        "context": "Căn cứ Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] và kết quả thực hiện công việc thực tế của Bên B. ",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p65:cell",
        "part": "word/document.xml",
        "paragraph": 65,
        "label": "Link video · Đơn giá",
        "context": "1 · Link video · Hoàn thành",
        "required": false,
        "title": "Link video · Đơn giá",
        "group": "SCOPE",
        "kind": "money",
        "source": "unitPrice"
      },
      {
        "key": "word/document.xml:p66:cell",
        "part": "word/document.xml",
        "paragraph": 66,
        "label": "Link video · Số lượng",
        "context": "1 · Link video · Hoàn thành",
        "required": false,
        "title": "Link video · Số lượng",
        "group": "SCOPE",
        "kind": "number",
        "source": "quantity"
      },
      {
        "key": "word/document.xml:p67:cell",
        "part": "word/document.xml",
        "paragraph": 67,
        "label": "Link video · Thành tiền",
        "context": "1 · Link video · Hoàn thành",
        "required": false,
        "title": "Link video · Thành tiền",
        "group": "SCOPE",
        "kind": "money",
        "source": "lineTotal"
      },
      {
        "key": "word/document.xml:p69:32",
        "part": "word/document.xml",
        "paragraph": 69,
        "start": 32,
        "end": 33,
        "label": "Tham dự sự kiện trong thời gian  [điền]  tiếng ngày….",
        "context": "Tham dự sự kiện trong thời gian … tiếng ngày….",
        "required": false,
        "title": "Số giờ tham dự sự kiện",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p69:44",
        "part": "word/document.xml",
        "paragraph": 69,
        "start": 44,
        "end": 45,
        "label": "ự kiện trong thời gian … tiếng ngày [điền] .",
        "context": "Tham dự sự kiện trong thời gian … tiếng ngày….",
        "required": false,
        "title": "Ngày tham dự sự kiện",
        "group": "SCOPE",
        "kind": "date"
      },
      {
        "key": "word/document.xml:p71:cell",
        "part": "word/document.xml",
        "paragraph": 71,
        "label": "Tham dự sự kiện trong thời gian · Đơn giá",
        "context": "2 · Tham dự sự kiện trong thời gian … tiếng ngày…. · Hoàn thành",
        "required": false,
        "title": "Tham dự sự kiện trong thời gian · Đơn giá",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p72:cell",
        "part": "word/document.xml",
        "paragraph": 72,
        "label": "Tham dự sự kiện trong thời gian · Số lượng",
        "context": "2 · Tham dự sự kiện trong thời gian … tiếng ngày…. · Hoàn thành",
        "required": false,
        "title": "Tham dự sự kiện trong thời gian · Số lượng",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p73:cell",
        "part": "word/document.xml",
        "paragraph": 73,
        "label": "Tham dự sự kiện trong thời gian · Thành tiền",
        "context": "2 · Tham dự sự kiện trong thời gian … tiếng ngày…. · Hoàn thành",
        "required": false,
        "title": "Tham dự sự kiện trong thời gian · Thành tiền",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p77:cell",
        "part": "word/document.xml",
        "paragraph": 77,
        "label": "Link bài đăng Fb · Đơn giá",
        "context": "3 · Link bài đăng Fb · Hoàn thành",
        "required": false,
        "title": "Link bài đăng Fb · Đơn giá",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p78:cell",
        "part": "word/document.xml",
        "paragraph": 78,
        "label": "Link bài đăng Fb · Số lượng",
        "context": "3 · Link bài đăng Fb · Hoàn thành",
        "required": false,
        "title": "Link bài đăng Fb · Số lượng",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p79:cell",
        "part": "word/document.xml",
        "paragraph": 79,
        "label": "Link bài đăng Fb · Thành tiền",
        "context": "3 · Link bài đăng Fb · Hoàn thành",
        "required": false,
        "title": "Link bài đăng Fb · Thành tiền",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p81:cell",
        "part": "word/document.xml",
        "paragraph": 81,
        "label": "Tổng Giá trị Hợp đồng chưa bao gồm thuế",
        "context": "Tổng Giá trị Hợp đồng chưa bao gồm thuế",
        "required": true,
        "title": "Tổng Giá trị Hợp đồng chưa bao gồm thuế",
        "group": "MONEY",
        "kind": "money",
        "source": "netTotal"
      },
      {
        "key": "word/document.xml:p83:cell",
        "part": "word/document.xml",
        "paragraph": 83,
        "label": "Thuế VAT",
        "context": "Thuế VAT",
        "required": false,
        "title": "Thuế VAT",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p85:cell",
        "part": "word/document.xml",
        "paragraph": 85,
        "label": "Tổng Giá trị Hợp đồng đã bao gồm thuế VAT",
        "context": "Tổng Giá trị Hợp đồng đã bao gồm thuế VAT",
        "required": false,
        "title": "Tổng Giá trị Hợp đồng đã bao gồm thuế VAT",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p98:cell",
        "part": "word/document.xml",
        "paragraph": 98,
        "label": "Giá trị Hợp đồng chưa bao gồm thuế · Chi phí",
        "context": "1 · Giá trị Hợp đồng chưa bao gồm thuế",
        "required": false,
        "title": "Giá trị Hợp đồng chưa bao gồm thuế",
        "group": "MONEY",
        "kind": "money",
        "source": "netTotal"
      },
      {
        "key": "word/document.xml:p101:cell",
        "part": "word/document.xml",
        "paragraph": 101,
        "label": "Thuế VAT · Chi phí",
        "context": "2 · Thuế VAT",
        "required": false,
        "title": "Thuế VAT (2)",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 103,
        "start": 47,
        "end": 57,
        "label": "dd.mm.yy",
        "context": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] ",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 103,
        "start": 70,
        "end": 78,
        "label": "ID KOC",
        "context": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] ",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p104:cell",
        "part": "word/document.xml",
        "paragraph": 104,
        "label": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐ · Chi phí",
        "context": "2 · Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC]",
        "required": false,
        "title": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐ",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p107:cell",
        "part": "word/document.xml",
        "paragraph": 107,
        "label": "Giá trị còn lại Bên A phải thanh toán cho Bên B · Chi phí",
        "context": "3 · Giá trị còn lại Bên A phải thanh toán cho Bên B",
        "required": false,
        "title": "Giá trị còn lại Bên A phải thanh toán cho Bên B",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p109:93",
        "part": "word/document.xml",
        "paragraph": 109,
        "start": 93,
        "end": 94,
        "label": "đồng tương ứng với tổng giá trị là  [điền]  VNĐ (Bằng chữ: …).",
        "context": "Bên A có nghĩa vụ thanh toán 100% giá trị còn lại của Hợp đồng tương ứng với tổng giá trị là … VNĐ (Bằng chữ: …).",
        "required": false,
        "title": "Số tiền còn phải thanh toán",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p109:110",
        "part": "word/document.xml",
        "paragraph": 109,
        "start": 110,
        "end": 111,
        "label": "i tổng giá trị là … VNĐ (Bằng chữ:  [điền] ).",
        "context": "Bên A có nghĩa vụ thanh toán 100% giá trị còn lại của Hợp đồng tương ứng với tổng giá trị là … VNĐ (Bằng chữ: …).",
        "required": false,
        "title": "Số tiền bằng chữ",
        "group": "MONEY",
        "kind": "text"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/footer1.xml",
        "paragraph": 1,
        "start": 0,
        "end": 10,
        "label": "dd.mm.yy",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/footer1.xml",
        "paragraph": 1,
        "start": 29,
        "end": 37,
        "label": "ID KOC",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      }
    ],
    "paragraphs": [
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Độc lập – Tự do – Hạnh phúc",
      "",
      "BIÊN BẢN NGHIỆM THU DỊCH VỤ BOOKING VIDEO",
      "[dd.mm.yy]/BBNT/UPBASE-BRAND-[ID KOC]",
      "Kèm theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
      "",
      "",
      "BÊN SỬ DỤNG DỊCH VỤ",
      "BÊN A",
      ":",
      "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
      "Mã số thuế",
      ":",
      "0109361325",
      "Địa chỉ",
      ":",
      "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
      "Người đại diện",
      ":",
      "Ông Đỗ Văn Giang   ",
      "Chức vụ",
      ":",
      "Giám đốc",
      "Sau đây gọi tắt là “Bên A”",
      "",
      "BÊN CUNG ỨNG DỊCH VỤ ",
      "BÊN B",
      ":",
      "Tên Công ty",
      "Mã số thuế",
      ":",
      "MST công ty",
      "Địa chỉ",
      ":",
      "Địa chỉ công ty",
      "Người đại diện",
      ":",
      "",
      "Chức vụ",
      ":",
      "….",
      "Theo ủy quyền số … ngày… - cần ủy quyền từ người đại diện theo pháp luật nếu người ký không phải là đại diện pháp luật (giám đốc, tổng giám đốc công ty)",
      "Số điện thoại",
      ":",
      "",
      "Email",
      ":",
      "",
      "Sau đây gọi tắt là “Bên B”",
      "",
      "Căn cứ Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] và kết quả thực hiện công việc thực tế của Bên B. ",
      "Hai Bên tiến hành nghiệm thu các hạng mục công việc do Bên B thực hiện theo SOW nêu trên làm cơ sở xác nhận hoàn thành nghĩa vụ và thanh toán theo thỏa thuận.",
      "",
      "Điều 1: Nghiệm thu phạm vi và phí dịch vụ",
      " Giá trị nghiệm thu",
      "STT",
      "Nội dung nghiệm thu ",
      "Trạng thái",
      "Đơn giá",
      "Số lượng",
      "Thành tiền",
      "1",
      "Link video",
      "Hoàn thành",
      "",
      "",
      "",
      "2",
      "Tham dự sự kiện trong thời gian … tiếng ngày….",
      "Hoàn thành",
      "",
      "",
      "",
      "3",
      "Link bài đăng Fb",
      "Hoàn thành",
      "",
      "",
      "",
      "Tổng Giá trị Hợp đồng chưa bao gồm thuế",
      "",
      "Thuế VAT",
      "",
      "Tổng Giá trị Hợp đồng đã bao gồm thuế VAT",
      "",
      "",
      "Hình ảnh nghiệm thu",
      "",
      "",
      "",
      "Điều 2: Thanh toán phí dịch vụ",
      "Phí dịch vụ Bên A phải thanh toán cho Bên B là:",
      "STT",
      "Nội dung",
      "Chi phí (VNĐ)",
      "1",
      "Giá trị Hợp đồng chưa bao gồm thuế",
      "",
      "2",
      "Thuế VAT",
      "",
      "2",
      "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] ",
      "",
      "3",
      "Giá trị còn lại Bên A phải thanh toán cho Bên B",
      "",
      "",
      "Bên A có nghĩa vụ thanh toán 100% giá trị còn lại của Hợp đồng tương ứng với tổng giá trị là … VNĐ (Bằng chữ: …).",
      "Thời hạn thanh toán là trong vòng 10 ngày làm việc kể từ ngày Bên A nhận được: Hợp đồng dịch vụ và Biên bản nghiệm thu công việc đã được các Bên ký xác nhận, hóa đơn hợp lệ  toàn bộ giá trị Hợp đồng do Bên B xuất cho Bên A.",
      "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
      "Tên chủ tài khoản: ",
      "Số tài khoản: ",
      "Tại Ngân hàng: ",
      "",
      "Điều 2: Hiệu lực ",
      "Biên bản này được lập và có hiệu lực từ ngày ….",
      "Biên bản này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi Bên giữ 01 (một) bản để thực hiện.",
      "",
      "ĐẠI DIỆN BÊN A",
      "",
      "ĐẠI DIỆN BÊN B ",
      "",
      "",
      "",
      "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
      "http://www.upbase.asia",
      "Trang 1 ",
      "",
      "",
      "",
      "",
      "BM.BBNT.VID.COM.Ver052026",
      ""
    ],
    "blocks": [
      {
        "kind": "p",
        "part": "word/header1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/header1.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header1.xml",
                  "paragraph": 1,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header1.xml",
                  "paragraph": 2,
                  "text": "BM.BBNT.VID.COM.Ver052026",
                  "align": "right"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/header1.xml",
        "paragraph": 3,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 0,
        "text": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 1,
        "text": "Độc lập – Tự do – Hạnh phúc",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 2,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 3,
        "text": "BIÊN BẢN NGHIỆM THU DỊCH VỤ BOOKING VIDEO",
        "align": "center",
        "bold": true,
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 4,
        "text": "[dd.mm.yy]/BBNT/UPBASE-BRAND-[ID KOC]",
        "align": "center"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 5,
        "text": "Kèm theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]",
        "align": "center",
        "boldPrefix": 29
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 6,
        "text": "",
        "align": "center"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 7,
        "text": "",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 8,
                  "text": "BÊN SỬ DỤNG DỊCH VỤ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 4
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 9,
                  "text": "BÊN A",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 10,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 11,
                  "text": "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 12,
                  "text": "Mã số thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 13,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 14,
                  "text": "0109361325",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 15,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 16,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 17,
                  "text": "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 18,
                  "text": "Người đại diện",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 19,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 20,
                  "text": "Ông Đỗ Văn Giang   ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 21,
                  "text": "Chức vụ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 22,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 23,
                  "text": "Giám đốc",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 24,
                  "text": "Sau đây gọi tắt là “Bên A”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 25,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 26,
                  "text": "BÊN CUNG ỨNG DỊCH VỤ ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 3
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 27,
                  "text": "BÊN B",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 28,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 29,
                  "text": "Tên Công ty",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 30,
                  "text": "Mã số thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 31,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 32,
                  "text": "MST công ty",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 33,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 34,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 35,
                  "text": "Địa chỉ công ty",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 36,
                  "text": "Người đại diện",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 37,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 38,
                  "text": "",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 39,
                  "text": "Chức vụ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 40,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 41,
                  "text": "….",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 42,
                  "text": "Theo ủy quyền số … ngày… - cần ủy quyền từ người đại diện theo pháp luật nếu người ký không phải là đại diện pháp luật (giám đốc, tổng giám đốc công ty)",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 43,
                  "text": "Số điện thoại",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 44,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 45,
                  "text": "",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 46,
                  "text": "Email",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 47,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 48,
                  "text": "",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 49,
                  "text": "Sau đây gọi tắt là “Bên B”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 50,
        "text": "",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 51,
        "text": "Căn cứ Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] và kết quả thực hiện công việc thực tế của Bên B. ",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 52,
        "text": "Hai Bên tiến hành nghiệm thu các hạng mục công việc do Bên B thực hiện theo SOW nêu trên làm cơ sở xác nhận hoàn thành nghĩa vụ và thanh toán theo thỏa thuận.",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 53,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 54,
        "text": "Điều 1: Nghiệm thu phạm vi và phí dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 55,
        "text": " Giá trị nghiệm thu",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 56,
                  "text": "STT",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 57,
                  "text": "Nội dung nghiệm thu ",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 58,
                  "text": "Trạng thái",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 59,
                  "text": "Đơn giá",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 60,
                  "text": "Số lượng",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 61,
                  "text": "Thành tiền",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 62,
                  "text": "1",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 63,
                  "text": "Link video",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 64,
                  "text": "Hoàn thành"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 65,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 66,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 67,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 68,
                  "text": "2",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 69,
                  "text": "Tham dự sự kiện trong thời gian … tiếng ngày….",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 70,
                  "text": "Hoàn thành"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 71,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 72,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 73,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 74,
                  "text": "3",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 75,
                  "text": "Link bài đăng Fb",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 76,
                  "text": "Hoàn thành"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 77,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 78,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 79,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 80,
                  "text": "Tổng Giá trị Hợp đồng chưa bao gồm thuế",
                  "bold": true
                }
              ],
              "colSpan": 6
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 81,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 82,
                  "text": "Thuế VAT",
                  "bold": true
                }
              ],
              "colSpan": 6
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 83,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 84,
                  "text": "Tổng Giá trị Hợp đồng đã bao gồm thuế VAT",
                  "bold": true
                }
              ],
              "colSpan": 6
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 85,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 86,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 87,
        "text": "Hình ảnh nghiệm thu",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 88,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 89,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 90,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 91,
        "text": "Điều 2: Thanh toán phí dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 92,
        "text": "Phí dịch vụ Bên A phải thanh toán cho Bên B là:",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 93,
                  "text": "STT",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 94,
                  "text": "Nội dung",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 95,
                  "text": "Chi phí (VNĐ)",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 96,
                  "text": "1",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 97,
                  "text": "Giá trị Hợp đồng chưa bao gồm thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 98,
                  "text": "",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 99,
                  "text": "2",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 100,
                  "text": "Thuế VAT",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 101,
                  "text": "",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 102,
                  "text": "2",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 103,
                  "text": "Giá trị đã thanh toán theo Hợp đồng dịch vụ số [dd.mm.yy]/HĐDV/UPBASE-[ID KOC] ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 104,
                  "text": "",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 105,
                  "text": "3",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 106,
                  "text": "Giá trị còn lại Bên A phải thanh toán cho Bên B",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 107,
                  "text": "",
                  "align": "right",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 108,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 109,
        "text": "Bên A có nghĩa vụ thanh toán 100% giá trị còn lại của Hợp đồng tương ứng với tổng giá trị là … VNĐ (Bằng chữ: …).",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 110,
        "text": "Thời hạn thanh toán là trong vòng 10 ngày làm việc kể từ ngày Bên A nhận được: Hợp đồng dịch vụ và Biên bản nghiệm thu công việc đã được các Bên ký xác nhận, hóa đơn hợp lệ  toàn bộ giá trị Hợp đồng do Bên B xuất cho Bên A.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 111,
        "text": "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 112,
        "text": "Tên chủ tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 113,
        "text": "Số tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 114,
        "text": "Tại Ngân hàng: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 115,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 116,
        "text": "Điều 2: Hiệu lực ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 117,
        "text": "Biên bản này được lập và có hiệu lực từ ngày ….",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 118,
        "text": "Biên bản này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi Bên giữ 01 (một) bản để thực hiện.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 119,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "signature",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 120,
                  "text": "ĐẠI DIỆN BÊN A",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 121,
                  "text": "",
                  "align": "center"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 122,
                  "text": "ĐẠI DIỆN BÊN B ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 123,
                  "text": "",
                  "align": "center"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 124,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/footer1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/footer1.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 1,
                  "text": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-[ID KOC]"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 2,
                  "text": "http://www.upbase.asia",
                  "align": "center"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 3,
                  "text": "Trang 1 ",
                  "align": "right"
                },
                {
                  "kind": "p",
                  "part": "word/footer1.xml",
                  "paragraph": 4,
                  "text": ""
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/footer1.xml",
        "paragraph": 5,
        "text": ""
      }
    ],
    "category": "ACCEPTANCE_SETTLEMENT",
    "description": "Biên bản nghiệm thu link bài đăng, mã Spark Ads và giá trị thanh toán thực tế cho đối tác công ty.",
    "active": true,
    "defaultReviewRoles": [
      "FINANCE",
      "LEAD"
    ],
    "exemptLegalReview": true,
    "scope": "GLOBAL",
    "updatedAt": "2026-05-01T08:00:00.000Z",
    "updatedBy": "Phòng Pháp chế",
    "fieldCount": 37,
    "requiredFieldCount": 17,
    "history": [
      {
        "version": "Ver052026",
        "hash": "dee8d8d79101a66955182fd8290dcb261ec4719516e50c23ed4e16fe70917b59",
        "filename": "3.1.2. BM.BBNT.VID.COM.Ver052026 boooking video.docx",
        "updatedAt": "2026-05-01T08:00:00.000Z",
        "updatedBy": "Phòng Pháp chế",
        "note": "Phiên bản chuẩn ban hành bởi Pháp chế"
      }
    ]
  },
  "CTV-HD": {
    "id": "CTV-HD",
    "name": "Hợp đồng nguyên tắc · CTV tháng",
    "filename": "4.1. BM.HĐVID.CTV.Ver052026 Upbase HĐNT booking CTV Video tháng.docx",
    "subject": "CTV tháng",
    "kind": "CONTRACT",
    "version": "Ver052026",
    "hash": "bd7c7da90e5fd08b0eb132d163812751f365724996c98e55fda593f0aac9bfd0",
    "fields": [
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 4,
        "end": 14,
        "label": "dd.mm.yy",
        "context": "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-CTV[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 36,
        "end": 44,
        "label": "ID KOC",
        "context": "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-CTV[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p16:14",
        "part": "word/document.xml",
        "paragraph": 16,
        "start": 14,
        "end": 15,
        "label": "Hôm nay, ngày  [điền]  tháng … năm 202…, tại tr",
        "context": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "required": true,
        "title": "Ngày ký",
        "group": "DATE",
        "kind": "number",
        "source": "signDay"
      },
      {
        "key": "word/document.xml:p16:22",
        "part": "word/document.xml",
        "paragraph": 16,
        "start": 22,
        "end": 23,
        "label": "Hôm nay, ngày … tháng  [điền]  năm 202…, tại trụ sở chí",
        "context": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "required": true,
        "title": "Tháng ký",
        "group": "DATE",
        "kind": "number",
        "source": "signMonth"
      },
      {
        "key": "word/document.xml:p16:31",
        "part": "word/document.xml",
        "paragraph": 16,
        "start": 31,
        "end": 32,
        "label": "Hôm nay, ngày … tháng … năm 202 [điền] , tại trụ sở chính của Cô",
        "context": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "required": true,
        "title": "Năm ký (chữ số cuối, ví dụ 6 cho 2026)",
        "group": "DATE",
        "kind": "number",
        "source": "signYearDigit"
      },
      {
        "key": "word/document.xml:p36:cell",
        "part": "word/document.xml",
        "paragraph": 36,
        "label": "BÊN B",
        "context": "BÊN B",
        "required": true,
        "title": "Họ tên Bên B",
        "group": "PARTY",
        "kind": "text",
        "source": "partyName"
      },
      {
        "key": "word/document.xml:p39:cell",
        "part": "word/document.xml",
        "paragraph": 39,
        "label": "CCCD",
        "context": "CCCD · Số… cấp ngày … tại…",
        "required": true,
        "start": 0,
        "end": 19,
        "title": "Số CCCD",
        "group": "PARTY",
        "kind": "text",
        "source": "cccd"
      },
      {
        "key": "word/document.xml:p42:cell",
        "part": "word/document.xml",
        "paragraph": 42,
        "label": "Địa chỉ",
        "context": "Địa chỉ",
        "required": true,
        "title": "Địa chỉ",
        "group": "PARTY",
        "kind": "long",
        "source": "address"
      },
      {
        "key": "word/document.xml:p45:cell",
        "part": "word/document.xml",
        "paragraph": 45,
        "label": "Số điện thoại",
        "context": "Số điện thoại",
        "required": true,
        "title": "Số điện thoại",
        "group": "PARTY",
        "kind": "text",
        "source": "phone"
      },
      {
        "key": "word/document.xml:p48:cell",
        "part": "word/document.xml",
        "paragraph": 48,
        "label": "Email",
        "context": "Email",
        "required": true,
        "title": "Email",
        "group": "PARTY",
        "kind": "text",
        "source": "email"
      },
      {
        "key": "word/document.xml:p81:cell",
        "part": "word/document.xml",
        "paragraph": 81,
        "label": "Dòng 1 · Dạng video",
        "context": "Liệt kê loại video · Liệt kê đơn giá · Liệt kê ghi chú về loại video",
        "required": false,
        "start": 0,
        "end": 18,
        "title": "Dòng 1 · Dạng video",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p82:cell",
        "part": "word/document.xml",
        "paragraph": 82,
        "label": "Dòng 1 · Mức giá/01 video(Chưa gồm thuế TNCN)",
        "context": "Liệt kê loại video · Liệt kê đơn giá · Liệt kê ghi chú về loại video",
        "required": false,
        "start": 0,
        "end": 15,
        "title": "Dòng 1 · Mức giá/01 video(Chưa gồm thuế TNCN)",
        "group": "SCOPE",
        "kind": "money",
        "source": "unitPrice"
      },
      {
        "key": "word/document.xml:p83:cell",
        "part": "word/document.xml",
        "paragraph": 83,
        "label": "Dòng 1 · Ghi chú",
        "context": "Liệt kê loại video · Liệt kê đơn giá · Liệt kê ghi chú về loại video",
        "required": false,
        "start": 0,
        "end": 29,
        "title": "Dòng 1 · Ghi chú",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/footer2.xml",
        "paragraph": 1,
        "start": 0,
        "end": 10,
        "label": "dd.mm.yy",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-CTV[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/footer2.xml",
        "paragraph": 1,
        "start": 32,
        "end": 40,
        "label": "ID KOC",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-CTV[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      }
    ],
    "paragraphs": [
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Độc lập – Tự do – Hạnh phúc",
      "",
      "HỢP ĐỒNG DỊCH VỤ BOOKING VIDEO",
      "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-CTV[ID KOC]",
      "Căn cứ: ",
      "Bộ luật Dân sự số 91/2015/QH13, có hiệu lực từ ngày 01/01/2017;",
      "Luật Thương mại số 36/2005/QH11, có hiệu lực từ ngày 01/01/2006;",
      "Luật Thương mại điện tử số 122/2025/QH15, có hiệu lực từ ngày 01/07/2026;",
      "Nghị định số 147/2024/NĐ-CP về quản lý, cung cấp và sử dụng dịch vụ Internet và thông tin trên mạng, có hiệu lực từ ngày 25/12/2024; ",
      "Luật Quảng cáo số 16/2012/QH13 có hiệu lực từ ngày 01/01/2013;",
      "Luật sửa đổi, bổ sung một số điều của Luật Quảng cáo số 75/2025/QH15, có hiệu lực từ ngày 01/01/2026;",
      "Luật Sở hữu Trí tuệ số 50/2005/QH11, có hiệu lực từ ngày 01/07/2006;",
      "Luật Sửa đổi bổ sung một số điều của Luật Sở hữu Trí tuệ số 131/2025/QH15, có hiệu lực từ ngày 01/04/2026;",
      "Nhu cầu và khả năng của hai Bên.",
      "",
      "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
      "",
      "BÊN SỬ DỤNG DỊCH VỤ",
      "BÊN A",
      ":",
      "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
      "Mã số thuế",
      ":",
      "0109361325",
      "Địa chỉ",
      ":",
      "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
      "Người đại diện",
      ":",
      "Ông Đỗ Văn Giang   ",
      "Sau đây gọi tắt là “Bên A”",
      "",
      "BÊN CUNG ỨNG DỊCH VỤ ",
      "BÊN B",
      ":",
      "",
      "CCCD",
      ":",
      "Số… cấp ngày … tại…",
      "Địa chỉ",
      ":",
      "",
      "Số điện thoại",
      ":",
      "",
      "Email",
      ":",
      "",
      "Sau đây gọi tắt là “Bên B”",
      "",
      "",
      "Bên A có nhu cầu thuê Bên B cung cấp dịch vụ sản xuất video để phục vụ hoạt động truyền thông và marketing. Bên B thực hiện với tư cách cộng tác viên độc lập, tự chịu trách nhiệm về quá trình sản xuất và bàn giao sản phẩm. Hai bên ký kết Hợp đồng dịch vụ này làm cơ sở khung để hai bên cùng hợp tác.",
      "",
      "ĐIỀU 1: ĐỊNH NGHĨA",
      "Khái niệm",
      "Định nghĩa",
      "Hợp đồng nguyên tắc (Hợp đồng)",
      "Là Hợp đồng này quy định nguyên tắc hợp tác chung giữa Các Bên về việc cung cấp dịch vụ sản xuất nội dung/video. ",
      "Hợp đồng là cơ sở để Các Bên thực hiện đặt hàng, triển khai dịch vụ, nghiệm thu và thanh toán trong suốt quá trình hợp tác.",
      "Đặt hàng/Xác nhận dịch vụ",
      "Trong quá trình thực hiện Hợp đồng, Bên A thực hiện đặt hàng cho Bên B thông qua email, tin nhắn công việc hoặc các kênh liên lạc được Hai Bên thống nhất. ",
      "Nội dung xác nhận bao gồm loại dịch vụ, số lượng, timeline, yêu cầu nội dung, đơn giá và các thông tin liên quan khác. ",
      "Các nội dung được Hai Bên xác nhận qua các hình thức trên có giá trị ràng buộc và là căn cứ triển khai dịch vụ, nghiệm thu và thanh toán.",
      "Nghiệm thu và đối soát",
      "Hàng tháng, Hai Bên thực hiện đối soát và nghiệm thu các dịch vụ/video mà Bên B đã cung cấp cho Bên A trong kỳ để làm căn cứ thanh toán.",
      "",
      "ĐIỀU 2: PHẠM VI CÔNG VIỆC",
      " Phạm vi công việc booking video và đơn giá dịch vụ",
      "Phạm vi công việc:",
      "Bên B cung cấp dịch vụ sản xuất video/nội dung truyền thông theo yêu cầu đặt hàng và brief do Bên A gửi qua email, tin nhắn công việc hoặc kênh liên lạc được Hai Bên thống nhất. Nội dung đặt hàng bao gồm phạm vi công việc, số lượng video, yêu cầu nội dung, timeline, đơn giá và các yêu cầu liên quan khác.",
      "Đơn giá dịch vụ được xác định theo bảng giá và nội dung xác nhận công việc giữa Hai Bên tại từng thời điểm đặt hàng và là căn cứ để đối soát, nghiệm thu và thanh toán.",
      "Bên B có nghĩa vụ bàn giao file sản phẩm hoàn chỉnh cho Bên A đúng timeline đã thống nhất. Dịch vụ được xem là hoàn thành khi Bên A xác nhận nghiệm thu thông qua biên bản, email hoặc tin nhắn công việc.",
      "Đơn giá dịch vụ:",
      "STT",
      "Dạng video",
      "Mức giá/01 video",
      "(Chưa gồm thuế TNCN)",
      "(VNĐ)",
      "Ghi chú",
      "",
      "Liệt kê loại video",
      "Liệt kê đơn giá",
      "Liệt kê ghi chú về loại video",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      " Quy trình cung ứng dịch vụ",
      "STT",
      "Bước",
      "Nội dung",
      "",
      "Đặt hàng/ Xác nhận dịch vụ",
      "Bên A gửi yêu cầu dịch vụ cho Bên B thông qua email, tin nhắn công việc hoặc kênh liên lạc được Hai Bên thống nhất, bao gồm thông tin về nội dung, số lượng video, timeline, nền tảng triển khai và các yêu cầu liên quan.",
      "",
      "Xây dựng kịch bản",
      "Bên B xây dựng kịch bản và định hướng nội dung video dựa trên yêu cầu của Bên A và gửi Bên A xem xét trước khi sản xuất.",
      "",
      "Duyệt kịch bản",
      "Bên A phản hồi, yêu cầu chỉnh sửa (nếu có) và xác nhận kịch bản để triển khai sản xuất.",
      "",
      "Sản xuất video",
      "Bên B thực hiện quay dựng, biên tập, hậu kỳ và hoàn thiện video theo nội dung đã được thống nhất.",
      "",
      "Duyệt video",
      "Bên A xem xét video demo, phản hồi và yêu cầu chỉnh sửa (nếu có) trong phạm vi thống nhất giữa Hai Bên.",
      "",
      "Bàn giao video",
      "Bên B bàn giao video hoàn thiện cho Bên A theo timeline đã xác nhận.",
      "",
      "Đối soát & nghiệm thu",
      "Phí dịch vụ được đối soát theo từng tháng căn cứ trên khối lượng công việc đã hoàn thành. Từ ngày 01 đến ngày 05 của tháng kế tiếp, Bên A thực hiện đối soát và gửi Biên bản nghiệm thu/đối soát cho Bên B xác nhận.",
      "",
      "Ký BBNT",
      "Hai Bên phối hợp xác nhận và ký Biên bản nghiệm thu/đối soát làm căn cứ thanh toán.",
      "",
      "Thanh toán",
      "Bên A thanh toán cho Bên B trong vòng 07 – 09 ngày làm việc (không bao gồm thứ 7, chủ nhật và ngày nghỉ lễ) kể từ ngày Hai Bên hoàn tất ký Biên bản nghiệm thu/đối soát dịch vụ của tháng và Bên A đã nhận được Biên bản nghiệm thu/đối soát có đầy đủ chữ ký của hai bên.",
      "",
      "2.3. Tiêu chuẩn nghiệm thu dịch vụ ",
      "Tiêu chuẩn về nội dung",
      "Video phải tuân thủ đầy đủ kịch bản, thông điệp và guideline do Bên A cung cấp; ",
      "Bao gồm đầy đủ các yếu tố yêu cầu (nếu có): link, giỏ hàng, mã theo dõi, hashtag, CTA…; ",
      "Chỉ được đăng tải sau khi có phê duyệt nội dung từ Bên A; ",
      "Nếu video bị ẩn, xóa, tắt âm thanh… hoặc các lỗi tương đương ảnh hưởng đến việc hiển thị bình thường của video trên nền tảng thì Bên B có nghĩa vụ phải chỉnh lý, bàn giao lại video đã khắc phục lỗi.",
      "Không vi phạm pháp luật, chính sách nền tảng hoặc gây ảnh hưởng tiêu cực đến hình ảnh thương hiệu. ",
      "Tiêu chuẩn về kịch bản và sản xuất",
      "Kịch bản phải được Bên A phê duyệt bằng email/tin nhắn/văn bản trước khi quay dựng; ",
      "Mọi chi phí phát sinh do sản xuất khi chưa có phê duyệt hợp lệ do Bên B tự chi trả; ",
      "Cảnh quay, bố cục và thông điệp phải phù hợp với kịch bản đã duyệt; ",
      "Trường hợp sai lệch, Bên A có quyền từ chối nghiệm thu và yêu cầu chỉnh sửa hoặc quay lại mà không phát sinh chi phí. ",
      "Tiêu chuẩn về chất lượng và hậu kỳ",
      "Video phải được dựng và hoàn thiện theo tiêu chuẩn đã thống nhất (video mẫu, guideline thương hiệu …); ",
      "Bên B có trách nhiệm chỉnh sửa theo yêu cầu hợp lý của Bên A cho đến khi đạt tiêu chuẩn nghiệm thu.",
      "Tiêu chuẩn về hình ảnh và nhận diện",
      "Bên B phải kiểm soát trang phục, bối cảnh, nhận diện cá nhân và các yếu tố hình ảnh khác nhằm không được gây trùng lặp, xung đột hoặc ảnh hưởng tiêu cực đến hiệu quả truyền thông của Bên A;",
      "Trường hợp vi phạm, Bên B phải chỉnh sửa, thay thế hoặc quay lại nội dung cho đến khi đạt yêu cầu, không làm ảnh hưởng tiến độ cam kết. ",
      "",
      "ĐIỀU 3: PHÍ DỊCH VỤ VÀ THANH TOÁN",
      "Phí dịch vụ booking",
      "Phí dịch vụ booking và thời hạn thanh toán được xác định cụ thể theo từng biên bản nghiệm thu công việc tương ứng với từng chiến dịch hoặc công việc. Bên A chỉ có nghĩa vụ thanh toán đối với phần công việc đã được nghiệm thu hợp lệ theo tiêu chí quy định tại Hợp đồng khung. ",
      "Hình thức thanh toán",
      "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
      "Tên chủ tài khoản: ",
      "Số tài khoản: ",
      "Tại Ngân hàng: ",
      "",
      "ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A",
      "4.1. Quyền của Bên A",
      "Quyền kiểm tra, giám sát: Bên A có quyền kiểm tra và giám sát Bên B thực hiện công việc đúng nội dung, chất lượng, tiến độ theo Hợp đồng khung; có quyền phê duyệt hoặc đưa ra ý kiến trong thời gian hợp lý đối với các nội dung, đề xuất của Bên B.",
      "Quyền chỉnh sửa kịch bản: Bên A có quyền kiểm tra và yêu cầu Bên B chỉnh sửa nội dung kịch bản trước khi sản xuất/trước khi đăng tải trong trường hợp nội dung chưa phù hợp với yêu cầu đã thống nhất.",
      "Quyền chỉnh sửa sản phẩm: Trường hợp nội dung video/bài đăng do Bên B đăng tải không đúng với nội dung đã được hai Bên thống nhất, Bên A có quyền yêu cầu Bên B chỉnh sửa, gỡ bỏ hoặc thay thế ngay nội dung đã đăng tải sai.",
      "4.2. Nghĩa vụ của Bên A",
      "Thanh toán đầy đủ và đúng hạn Phí Booking cho Bên B theo Hợp đồng khung;",
      "Cung cấp đầy đủ, kịp thời các thông tin, tài liệu, sản phẩm mẫu và phối hợp với Bên B để triển khai dịch vụ theo Hợp đồng;",
      "Không sử dụng hình ảnh, nội dung hoặc danh tiếng của Bên B theo cách gây ảnh hưởng tiêu cực đến uy tín hoặc hình ảnh cá nhân của Bên B.",
      "",
      "ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B",
      "5.1.   Quyền của Bên B",
      "Yêu cầu Bên A cung cấp đầy đủ thông tin, tài liệu, sản phẩm mẫu cần thiết để thực hiện dịch vụ;",
      "Yêu cầu Bên A thanh toán đầy đủ, đúng hạn Phí Booking theo thỏa thuận tại Hợp đồng khung.",
      " Nghĩa vụ của Bên B",
      "Nghĩa vụ thực hiện dịch vụ: Thực hiện công việc đúng nội dung, chất lượng, số lượng, thời hạn, nền tảng theo Hợp đồng đã ký kết; chủ động thông báo kịp thời cho Bên A về bất kỳ sự kiện nào có thể ảnh hưởng đến việc thực hiện dịch vụ.",
      "Nghĩa vụ bảo vệ hình ảnh và uy tín nhãn hiệu: Bên B cam kết bảo vệ hình ảnh, uy tín của nhãn hiệu và Bên A bằng việc không thực hiện bất kỳ hành vi, phát ngôn hoặc đăng tải nội dung nào gây ảnh hưởng tiêu cực, gây hiểu nhầm hoặc chưa được kiểm chứng liên quan đến Bên A hoặc sản phẩm/dịch vụ, cũng như không sử dụng ngôn từ, hình ảnh phản cảm, vi phạm pháp luật hoặc không phù hợp với định vị thương hiệu của Bên A; các nghĩa vụ này áp dụng trong suốt thời gian thực hiện Hợp đồng và kéo dài ít nhất 06 tháng sau khi chấm dứt việc hợp tác với nhãn hàng.",
      "Nghĩa vụ bảo vệ hình ảnh và uy tín cá nhân: Bên B cam kết duy trì danh tiếng cá nhân, không để xảy ra các sự kiện, hành vi hoặc phát ngôn có thể gây scandal, tranh cãi hoặc ảnh hưởng trực tiếp hoặc gián tiếp đến uy tín của Bên A; trong trường hợp phát sinh sự kiện có nguy cơ ảnh hưởng tiêu cực, Bên B phải thông báo kịp thời và phối hợp với Bên A để xử lý phù hợp.",
      "",
      "ĐIỂU 6: PHẠT VI PHẠM, BỒI THƯỜNG THIỆT HẠI",
      "Hai bên thống nhất thực hiện Hợp đồng trên nguyên tắc hợp tác thiện chí, ưu tiên phối hợp xử lý và khắc phục các vấn đề phát sinh nhằm đảm bảo Sản phẩm đạt yêu cầu nghiệm thu theo thỏa thuận.",
      "Trong trường hợp phát sinh sai sót, chậm tiến độ hoặc Sản phẩm chưa đáp ứng yêu cầu, Bên B có trách nhiệm chủ động điều chỉnh, chỉnh sửa và hoàn thiện theo phản hồi của Bên A trong thời hạn hợp lý. Bên A có trách nhiệm cung cấp phản hồi rõ ràng, đầy đủ và kịp thời để Bên B thực hiện khắc phục.",
      "Trường hợp không thể khắc phục sau các nỗ lực hợp lý, hai bên sẽ cùng trao đổi để thống nhất phương án xử lý phù hợp trên tinh thần hợp tác.",
      "",
      "ĐIỀU 7: HIỆU LỰC VÀ CHẤM DỨT HỢP ĐỒNG ",
      "Hợp đồng có hiệu lực kể từ ngày ký và duy trì vô thời hạn cho đến khi hai bên thỏa thuận chấm dứt hoặc một trong hai bên đơn phương chấm dứt. Việc chấm dứt Hợp đồng không ảnh hưởng đến hiệu lực của các điều khoản về thanh toán, quyền sở hữu, bảo mật và các nghĩa vụ còn tồn đọng phát sinh trước thời điểm chấm dứt.",
      "",
      "ĐIỀU 8: BẢO MẬT THÔNG TIN",
      "Trong quá trình thực hiện Hợp đồng và sau khi Hợp đồng chấm dứt, mỗi Bên (sau đây gọi là “Bên Nhận Thông Tin”) có nghĩa vụ bảo mật tuyệt đối đối với mọi thông tin, tài liệu do Bên còn lại (“Bên Tiết Lộ”) cung cấp hoặc phát sinh liên quan đến việc thực hiện Hợp đồng, bao gồm nhưng không giới hạn: thông tin về sản phẩm/dịch vụ, nội dung Brief, kế hoạch sản xuất nội dung, chiến lược marketing, dữ liệu vận hành, thông tin tài chính, điều khoản hợp tác, cũng như toàn bộ nội dung trao đổi, làm việc giữa hai Bên dưới bất kỳ hình thức nào (email, tin nhắn, tài liệu, file dữ liệu) và các thông tin có tính chất bảo mật khác (sau đây gọi chung là “Thông Tin Mật”).",
      "Bên Nhận Thông Tin không được tiết lộ, công bố, chuyển giao hoặc sử dụng Thông Tin Mật cho bất kỳ mục đích nào ngoài phạm vi thực hiện Hợp đồng nếu không có sự chấp thuận trước bằng văn bản của Bên Tiết Lộ. Bên Nhận Thông Tin có trách nhiệm áp dụng các biện pháp cần thiết để đảm bảo cá nhân, nhân sự hoặc bên thứ ba do mình quản lý (nếu có) không tiếp cận, sử dụng hoặc tiết lộ trái phép Thông Tin Mật.",
      "Trong trường hợp vi phạm nghĩa vụ bảo mật, Bên vi phạm phải chịu trách nhiệm bồi thường toàn bộ thiệt hại thực tế phát sinh cho Bên còn lại và các bên liên quan (nếu có), đồng thời thực hiện mọi biện pháp cần thiết để chấm dứt và khắc phục hậu quả của hành vi vi phạm.",
      "Nghĩa vụ bảo mật tiếp tục có hiệu lực sau khi Hợp đồng chấm dứt hoặc hết hạn và chỉ chấm dứt khi Thông Tin Mật trở thành thông tin công khai một cách hợp pháp, không do lỗi của Bên Nhận Thông Tin.",
      "ĐIỀU 9: BẤT KHẢ KHÁNG",
      "Một Bên sẽ không bị xem là vi phạm Hợp Đồng nếu việc chậm trễ hoặc không thực hiện nghĩa vụ do sự kiện khách quan, không thể lường trước và không thể khắc phục mặc dù đã áp dụng mọi biện pháp cần thiết (“Sự Kiện Bất Khả Kháng”), bao gồm nhưng không giới hạn: thiên tai, hỏa hoạn, chiến tranh, bạo loạn, đình công, dịch bệnh, hoặc các quyết định, hạn chế của cơ quan nhà nước có thẩm quyền. Bên bị ảnh hưởng phải thông báo bằng văn bản cho Bên còn lại trong vòng 03 ngày làm việc kể từ khi xảy ra sự kiện, nêu rõ bản chất sự kiện, phạm vi ảnh hưởng và thời gian dự kiến khắc phục.",
      "ĐIỀU 10: ĐIỀU KHOẢN CHUNG",
      "Luật áp dụng: Hợp Đồng này được điều chỉnh và giải thích theo pháp luật Việt Nam.",
      "Giải quyết tranh chấp: Mọi tranh chấp phát sinh từ hoặc liên quan đến Hợp Đồng sẽ được ưu tiên giải quyết thông qua thương lượng, hòa giải giữa các Bên. Nếu tranh chấp không được giải quyết trong vòng 30 (ba mươi) ngày kể từ ngày một Bên thông báo bằng văn bản về tranh chấp, tranh chấp sẽ được đưa ra Tòa án có thẩm quyền tại Việt Nam để giải quyết.",
      "Hợp đồng này được lập thành 02 bản, mỗi Bên giữ 01 bản, có giá trị pháp lý như nhau.",
      "",
      "ĐẠI DIỆN BÊN A",
      "ĐẠI DIỆN BÊN B",
      "",
      "",
      "",
      "[dd.mm.yy]/HĐDV/UPBASE-BRAND-CTV[ID KOC]",
      "http://www.upbase.asia",
      "Trang 1 ",
      "",
      "",
      "",
      "",
      "                                            ",
      "",
      "BM.HĐVID.CTV.Ver052026",
      "",
      ""
    ],
    "blocks": [
      {
        "kind": "p",
        "part": "word/header1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/header2.xml",
        "paragraph": 0,
        "text": "                                            ",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/header2.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header2.xml",
                  "paragraph": 1,
                  "text": "",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header2.xml",
                  "paragraph": 2,
                  "text": "BM.HĐVID.CTV.Ver052026",
                  "align": "right"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/header2.xml",
        "paragraph": 3,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/header3.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 0,
        "text": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 1,
        "text": "Độc lập – Tự do – Hạnh phúc",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 2,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 3,
        "text": "HỢP ĐỒNG DỊCH VỤ BOOKING VIDEO",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 4,
        "text": "Số/:[dd.mm.yy]/HĐDV/UPBASE-BRAND-CTV[ID KOC]",
        "align": "center",
        "boldPrefix": 4
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 5,
        "text": "Căn cứ: ",
        "bold": true,
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 6,
        "text": "Bộ luật Dân sự số 91/2015/QH13, có hiệu lực từ ngày 01/01/2017;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 7,
        "text": "Luật Thương mại số 36/2005/QH11, có hiệu lực từ ngày 01/01/2006;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 8,
        "text": "Luật Thương mại điện tử số 122/2025/QH15, có hiệu lực từ ngày 01/07/2026;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 9,
        "text": "Nghị định số 147/2024/NĐ-CP về quản lý, cung cấp và sử dụng dịch vụ Internet và thông tin trên mạng, có hiệu lực từ ngày 25/12/2024; ",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 10,
        "text": "Luật Quảng cáo số 16/2012/QH13 có hiệu lực từ ngày 01/01/2013;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 11,
        "text": "Luật sửa đổi, bổ sung một số điều của Luật Quảng cáo số 75/2025/QH15, có hiệu lực từ ngày 01/01/2026;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 12,
        "text": "Luật Sở hữu Trí tuệ số 50/2005/QH11, có hiệu lực từ ngày 01/07/2006;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 13,
        "text": "Luật Sửa đổi bổ sung một số điều của Luật Sở hữu Trí tuệ số 131/2025/QH15, có hiệu lực từ ngày 01/04/2026;",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 14,
        "text": "Nhu cầu và khả năng của hai Bên.",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 15,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 16,
        "text": "Hôm nay, ngày … tháng … năm 202…, tại trụ sở chính của Công Ty Cổ Phần Công Nghệ UpBase - Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam. Chúng tôi gồm các bên có tên dưới đây cùng ký kết Hợp Đồng cung ứng Dịch vụ (“Hợp Đồng”):",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 17,
        "text": "",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 18,
                  "text": "BÊN SỬ DỤNG DỊCH VỤ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 4
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 19,
                  "text": "BÊN A",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 20,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 21,
                  "text": "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 22,
                  "text": "Mã số thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 23,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 24,
                  "text": "0109361325",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 25,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 26,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 27,
                  "text": "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 28,
                  "text": "Người đại diện",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 29,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 30,
                  "text": "Ông Đỗ Văn Giang   ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 31,
                  "text": "Sau đây gọi tắt là “Bên A”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 32,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 33,
                  "text": "BÊN CUNG ỨNG DỊCH VỤ ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 4
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 34,
                  "text": "BÊN B",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 35,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 36,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 37,
                  "text": "CCCD",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 38,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 39,
                  "text": "Số… cấp ngày … tại…",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 40,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 41,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 42,
                  "text": "",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 43,
                  "text": "Số điện thoại",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 44,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 45,
                  "text": "",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 46,
                  "text": "Email",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 47,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 48,
                  "text": "",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 49,
                  "text": "Sau đây gọi tắt là “Bên B”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 50,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 51,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 52,
        "text": "Bên A có nhu cầu thuê Bên B cung cấp dịch vụ sản xuất video để phục vụ hoạt động truyền thông và marketing. Bên B thực hiện với tư cách cộng tác viên độc lập, tự chịu trách nhiệm về quá trình sản xuất và bàn giao sản phẩm. Hai bên ký kết Hợp đồng dịch vụ này làm cơ sở khung để hai bên cùng hợp tác.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 53,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 54,
        "text": "ĐIỀU 1: ĐỊNH NGHĨA",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 55,
                  "text": "Khái niệm",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 56,
                  "text": "Định nghĩa",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 57,
                  "text": "Hợp đồng nguyên tắc (Hợp đồng)",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 58,
                  "text": "Là Hợp đồng này quy định nguyên tắc hợp tác chung giữa Các Bên về việc cung cấp dịch vụ sản xuất nội dung/video. ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 59,
                  "text": "Hợp đồng là cơ sở để Các Bên thực hiện đặt hàng, triển khai dịch vụ, nghiệm thu và thanh toán trong suốt quá trình hợp tác.",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 60,
                  "text": "Đặt hàng/Xác nhận dịch vụ",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 61,
                  "text": "Trong quá trình thực hiện Hợp đồng, Bên A thực hiện đặt hàng cho Bên B thông qua email, tin nhắn công việc hoặc các kênh liên lạc được Hai Bên thống nhất. ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 62,
                  "text": "Nội dung xác nhận bao gồm loại dịch vụ, số lượng, timeline, yêu cầu nội dung, đơn giá và các thông tin liên quan khác. ",
                  "align": "justify"
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 63,
                  "text": "Các nội dung được Hai Bên xác nhận qua các hình thức trên có giá trị ràng buộc và là căn cứ triển khai dịch vụ, nghiệm thu và thanh toán.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 64,
                  "text": "Nghiệm thu và đối soát",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 65,
                  "text": "Hàng tháng, Hai Bên thực hiện đối soát và nghiệm thu các dịch vụ/video mà Bên B đã cung cấp cho Bên A trong kỳ để làm căn cứ thanh toán.",
                  "align": "justify"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 66,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 67,
        "text": "ĐIỀU 2: PHẠM VI CÔNG VIỆC",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 68,
        "text": " Phạm vi công việc booking video và đơn giá dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 69,
        "text": "Phạm vi công việc:",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 70,
        "text": "Bên B cung cấp dịch vụ sản xuất video/nội dung truyền thông theo yêu cầu đặt hàng và brief do Bên A gửi qua email, tin nhắn công việc hoặc kênh liên lạc được Hai Bên thống nhất. Nội dung đặt hàng bao gồm phạm vi công việc, số lượng video, yêu cầu nội dung, timeline, đơn giá và các yêu cầu liên quan khác.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 71,
        "text": "Đơn giá dịch vụ được xác định theo bảng giá và nội dung xác nhận công việc giữa Hai Bên tại từng thời điểm đặt hàng và là căn cứ để đối soát, nghiệm thu và thanh toán.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 72,
        "text": "Bên B có nghĩa vụ bàn giao file sản phẩm hoàn chỉnh cho Bên A đúng timeline đã thống nhất. Dịch vụ được xem là hoàn thành khi Bên A xác nhận nghiệm thu thông qua biên bản, email hoặc tin nhắn công việc.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 73,
        "text": "Đơn giá dịch vụ:",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 74,
                  "text": "STT",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 75,
                  "text": "Dạng video",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 76,
                  "text": "Mức giá/01 video",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 77,
                  "text": "(Chưa gồm thuế TNCN)",
                  "align": "center",
                  "bold": true,
                  "italic": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 78,
                  "text": "(VNĐ)",
                  "align": "center",
                  "bold": true,
                  "italic": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 79,
                  "text": "Ghi chú",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 80,
                  "text": "",
                  "italic": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 81,
                  "text": "Liệt kê loại video",
                  "align": "center",
                  "italic": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 82,
                  "text": "Liệt kê đơn giá",
                  "align": "center",
                  "italic": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 83,
                  "text": "Liệt kê ghi chú về loại video",
                  "align": "center",
                  "italic": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 84,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 85,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 86,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 87,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 88,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 89,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 90,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 91,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 92,
        "text": " Quy trình cung ứng dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 93,
                  "text": "STT",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 94,
                  "text": "Bước",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 95,
                  "text": "Nội dung",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 96,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 97,
                  "text": "Đặt hàng/ Xác nhận dịch vụ",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 98,
                  "text": "Bên A gửi yêu cầu dịch vụ cho Bên B thông qua email, tin nhắn công việc hoặc kênh liên lạc được Hai Bên thống nhất, bao gồm thông tin về nội dung, số lượng video, timeline, nền tảng triển khai và các yêu cầu liên quan.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 99,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 100,
                  "text": "Xây dựng kịch bản",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 101,
                  "text": "Bên B xây dựng kịch bản và định hướng nội dung video dựa trên yêu cầu của Bên A và gửi Bên A xem xét trước khi sản xuất.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 102,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 103,
                  "text": "Duyệt kịch bản",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 104,
                  "text": "Bên A phản hồi, yêu cầu chỉnh sửa (nếu có) và xác nhận kịch bản để triển khai sản xuất.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 105,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 106,
                  "text": "Sản xuất video",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 107,
                  "text": "Bên B thực hiện quay dựng, biên tập, hậu kỳ và hoàn thiện video theo nội dung đã được thống nhất.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 108,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 109,
                  "text": "Duyệt video",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 110,
                  "text": "Bên A xem xét video demo, phản hồi và yêu cầu chỉnh sửa (nếu có) trong phạm vi thống nhất giữa Hai Bên.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 111,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 112,
                  "text": "Bàn giao video",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 113,
                  "text": "Bên B bàn giao video hoàn thiện cho Bên A theo timeline đã xác nhận.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 114,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 115,
                  "text": "Đối soát & nghiệm thu",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 116,
                  "text": "Phí dịch vụ được đối soát theo từng tháng căn cứ trên khối lượng công việc đã hoàn thành. Từ ngày 01 đến ngày 05 của tháng kế tiếp, Bên A thực hiện đối soát và gửi Biên bản nghiệm thu/đối soát cho Bên B xác nhận.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 117,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 118,
                  "text": "Ký BBNT",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 119,
                  "text": "Hai Bên phối hợp xác nhận và ký Biên bản nghiệm thu/đối soát làm căn cứ thanh toán.",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 120,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 121,
                  "text": "Thanh toán",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 122,
                  "text": "Bên A thanh toán cho Bên B trong vòng 07 – 09 ngày làm việc (không bao gồm thứ 7, chủ nhật và ngày nghỉ lễ) kể từ ngày Hai Bên hoàn tất ký Biên bản nghiệm thu/đối soát dịch vụ của tháng và Bên A đã nhận được Biên bản nghiệm thu/đối soát có đầy đủ chữ ký của hai bên.",
                  "align": "justify"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 123,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 124,
        "text": "2.3. Tiêu chuẩn nghiệm thu dịch vụ ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 125,
        "text": "Tiêu chuẩn về nội dung",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 126,
        "text": "Video phải tuân thủ đầy đủ kịch bản, thông điệp và guideline do Bên A cung cấp; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 127,
        "text": "Bao gồm đầy đủ các yếu tố yêu cầu (nếu có): link, giỏ hàng, mã theo dõi, hashtag, CTA…; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 128,
        "text": "Chỉ được đăng tải sau khi có phê duyệt nội dung từ Bên A; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 129,
        "text": "Nếu video bị ẩn, xóa, tắt âm thanh… hoặc các lỗi tương đương ảnh hưởng đến việc hiển thị bình thường của video trên nền tảng thì Bên B có nghĩa vụ phải chỉnh lý, bàn giao lại video đã khắc phục lỗi.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 130,
        "text": "Không vi phạm pháp luật, chính sách nền tảng hoặc gây ảnh hưởng tiêu cực đến hình ảnh thương hiệu. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 131,
        "text": "Tiêu chuẩn về kịch bản và sản xuất",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 132,
        "text": "Kịch bản phải được Bên A phê duyệt bằng email/tin nhắn/văn bản trước khi quay dựng; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 133,
        "text": "Mọi chi phí phát sinh do sản xuất khi chưa có phê duyệt hợp lệ do Bên B tự chi trả; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 134,
        "text": "Cảnh quay, bố cục và thông điệp phải phù hợp với kịch bản đã duyệt; ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 135,
        "text": "Trường hợp sai lệch, Bên A có quyền từ chối nghiệm thu và yêu cầu chỉnh sửa hoặc quay lại mà không phát sinh chi phí. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 136,
        "text": "Tiêu chuẩn về chất lượng và hậu kỳ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 137,
        "text": "Video phải được dựng và hoàn thiện theo tiêu chuẩn đã thống nhất (video mẫu, guideline thương hiệu …); ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 138,
        "text": "Bên B có trách nhiệm chỉnh sửa theo yêu cầu hợp lý của Bên A cho đến khi đạt tiêu chuẩn nghiệm thu.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 139,
        "text": "Tiêu chuẩn về hình ảnh và nhận diện",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 140,
        "text": "Bên B phải kiểm soát trang phục, bối cảnh, nhận diện cá nhân và các yếu tố hình ảnh khác nhằm không được gây trùng lặp, xung đột hoặc ảnh hưởng tiêu cực đến hiệu quả truyền thông của Bên A;",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 141,
        "text": "Trường hợp vi phạm, Bên B phải chỉnh sửa, thay thế hoặc quay lại nội dung cho đến khi đạt yêu cầu, không làm ảnh hưởng tiến độ cam kết. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 142,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 143,
        "text": "ĐIỀU 3: PHÍ DỊCH VỤ VÀ THANH TOÁN",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 144,
        "text": "Phí dịch vụ booking",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 145,
        "text": "Phí dịch vụ booking và thời hạn thanh toán được xác định cụ thể theo từng biên bản nghiệm thu công việc tương ứng với từng chiến dịch hoặc công việc. Bên A chỉ có nghĩa vụ thanh toán đối với phần công việc đã được nghiệm thu hợp lệ theo tiêu chí quy định tại Hợp đồng khung. ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 146,
        "text": "Hình thức thanh toán",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 147,
        "text": "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 148,
        "text": "Tên chủ tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 149,
        "text": "Số tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 150,
        "text": "Tại Ngân hàng: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 151,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 152,
        "text": "ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 153,
        "text": "4.1. Quyền của Bên A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 154,
        "text": "Quyền kiểm tra, giám sát: Bên A có quyền kiểm tra và giám sát Bên B thực hiện công việc đúng nội dung, chất lượng, tiến độ theo Hợp đồng khung; có quyền phê duyệt hoặc đưa ra ý kiến trong thời gian hợp lý đối với các nội dung, đề xuất của Bên B.",
        "align": "justify",
        "boldPrefix": 25
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 155,
        "text": "Quyền chỉnh sửa kịch bản: Bên A có quyền kiểm tra và yêu cầu Bên B chỉnh sửa nội dung kịch bản trước khi sản xuất/trước khi đăng tải trong trường hợp nội dung chưa phù hợp với yêu cầu đã thống nhất.",
        "align": "justify",
        "boldPrefix": 25
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 156,
        "text": "Quyền chỉnh sửa sản phẩm: Trường hợp nội dung video/bài đăng do Bên B đăng tải không đúng với nội dung đã được hai Bên thống nhất, Bên A có quyền yêu cầu Bên B chỉnh sửa, gỡ bỏ hoặc thay thế ngay nội dung đã đăng tải sai.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 157,
        "text": "4.2. Nghĩa vụ của Bên A",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 158,
        "text": "Thanh toán đầy đủ và đúng hạn Phí Booking cho Bên B theo Hợp đồng khung;",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 159,
        "text": "Cung cấp đầy đủ, kịp thời các thông tin, tài liệu, sản phẩm mẫu và phối hợp với Bên B để triển khai dịch vụ theo Hợp đồng;",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 160,
        "text": "Không sử dụng hình ảnh, nội dung hoặc danh tiếng của Bên B theo cách gây ảnh hưởng tiêu cực đến uy tín hoặc hình ảnh cá nhân của Bên B.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 161,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 162,
        "text": "ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 163,
        "text": "5.1.   Quyền của Bên B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 164,
        "text": "Yêu cầu Bên A cung cấp đầy đủ thông tin, tài liệu, sản phẩm mẫu cần thiết để thực hiện dịch vụ;",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 165,
        "text": "Yêu cầu Bên A thanh toán đầy đủ, đúng hạn Phí Booking theo thỏa thuận tại Hợp đồng khung.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 166,
        "text": " Nghĩa vụ của Bên B",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 167,
        "text": "Nghĩa vụ thực hiện dịch vụ: Thực hiện công việc đúng nội dung, chất lượng, số lượng, thời hạn, nền tảng theo Hợp đồng đã ký kết; chủ động thông báo kịp thời cho Bên A về bất kỳ sự kiện nào có thể ảnh hưởng đến việc thực hiện dịch vụ.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 168,
        "text": "Nghĩa vụ bảo vệ hình ảnh và uy tín nhãn hiệu: Bên B cam kết bảo vệ hình ảnh, uy tín của nhãn hiệu và Bên A bằng việc không thực hiện bất kỳ hành vi, phát ngôn hoặc đăng tải nội dung nào gây ảnh hưởng tiêu cực, gây hiểu nhầm hoặc chưa được kiểm chứng liên quan đến Bên A hoặc sản phẩm/dịch vụ, cũng như không sử dụng ngôn từ, hình ảnh phản cảm, vi phạm pháp luật hoặc không phù hợp với định vị thương hiệu của Bên A; các nghĩa vụ này áp dụng trong suốt thời gian thực hiện Hợp đồng và kéo dài ít nhất 06 tháng sau khi chấm dứt việc hợp tác với nhãn hàng.",
        "align": "justify",
        "boldPrefix": 46
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 169,
        "text": "Nghĩa vụ bảo vệ hình ảnh và uy tín cá nhân: Bên B cam kết duy trì danh tiếng cá nhân, không để xảy ra các sự kiện, hành vi hoặc phát ngôn có thể gây scandal, tranh cãi hoặc ảnh hưởng trực tiếp hoặc gián tiếp đến uy tín của Bên A; trong trường hợp phát sinh sự kiện có nguy cơ ảnh hưởng tiêu cực, Bên B phải thông báo kịp thời và phối hợp với Bên A để xử lý phù hợp.",
        "align": "justify",
        "boldPrefix": 43
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 170,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 171,
        "text": "ĐIỂU 6: PHẠT VI PHẠM, BỒI THƯỜNG THIỆT HẠI",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 172,
        "text": "Hai bên thống nhất thực hiện Hợp đồng trên nguyên tắc hợp tác thiện chí, ưu tiên phối hợp xử lý và khắc phục các vấn đề phát sinh nhằm đảm bảo Sản phẩm đạt yêu cầu nghiệm thu theo thỏa thuận.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 173,
        "text": "Trong trường hợp phát sinh sai sót, chậm tiến độ hoặc Sản phẩm chưa đáp ứng yêu cầu, Bên B có trách nhiệm chủ động điều chỉnh, chỉnh sửa và hoàn thiện theo phản hồi của Bên A trong thời hạn hợp lý. Bên A có trách nhiệm cung cấp phản hồi rõ ràng, đầy đủ và kịp thời để Bên B thực hiện khắc phục.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 174,
        "text": "Trường hợp không thể khắc phục sau các nỗ lực hợp lý, hai bên sẽ cùng trao đổi để thống nhất phương án xử lý phù hợp trên tinh thần hợp tác.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 175,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 176,
        "text": "ĐIỀU 7: HIỆU LỰC VÀ CHẤM DỨT HỢP ĐỒNG ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 177,
        "text": "Hợp đồng có hiệu lực kể từ ngày ký và duy trì vô thời hạn cho đến khi hai bên thỏa thuận chấm dứt hoặc một trong hai bên đơn phương chấm dứt. Việc chấm dứt Hợp đồng không ảnh hưởng đến hiệu lực của các điều khoản về thanh toán, quyền sở hữu, bảo mật và các nghĩa vụ còn tồn đọng phát sinh trước thời điểm chấm dứt.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 178,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 179,
        "text": "ĐIỀU 8: BẢO MẬT THÔNG TIN",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 180,
        "text": "Trong quá trình thực hiện Hợp đồng và sau khi Hợp đồng chấm dứt, mỗi Bên (sau đây gọi là “Bên Nhận Thông Tin”) có nghĩa vụ bảo mật tuyệt đối đối với mọi thông tin, tài liệu do Bên còn lại (“Bên Tiết Lộ”) cung cấp hoặc phát sinh liên quan đến việc thực hiện Hợp đồng, bao gồm nhưng không giới hạn: thông tin về sản phẩm/dịch vụ, nội dung Brief, kế hoạch sản xuất nội dung, chiến lược marketing, dữ liệu vận hành, thông tin tài chính, điều khoản hợp tác, cũng như toàn bộ nội dung trao đổi, làm việc giữa hai Bên dưới bất kỳ hình thức nào (email, tin nhắn, tài liệu, file dữ liệu) và các thông tin có tính chất bảo mật khác (sau đây gọi chung là “Thông Tin Mật”).",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 181,
        "text": "Bên Nhận Thông Tin không được tiết lộ, công bố, chuyển giao hoặc sử dụng Thông Tin Mật cho bất kỳ mục đích nào ngoài phạm vi thực hiện Hợp đồng nếu không có sự chấp thuận trước bằng văn bản của Bên Tiết Lộ. Bên Nhận Thông Tin có trách nhiệm áp dụng các biện pháp cần thiết để đảm bảo cá nhân, nhân sự hoặc bên thứ ba do mình quản lý (nếu có) không tiếp cận, sử dụng hoặc tiết lộ trái phép Thông Tin Mật.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 182,
        "text": "Trong trường hợp vi phạm nghĩa vụ bảo mật, Bên vi phạm phải chịu trách nhiệm bồi thường toàn bộ thiệt hại thực tế phát sinh cho Bên còn lại và các bên liên quan (nếu có), đồng thời thực hiện mọi biện pháp cần thiết để chấm dứt và khắc phục hậu quả của hành vi vi phạm.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 183,
        "text": "Nghĩa vụ bảo mật tiếp tục có hiệu lực sau khi Hợp đồng chấm dứt hoặc hết hạn và chỉ chấm dứt khi Thông Tin Mật trở thành thông tin công khai một cách hợp pháp, không do lỗi của Bên Nhận Thông Tin.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 184,
        "text": "ĐIỀU 9: BẤT KHẢ KHÁNG",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 185,
        "text": "Một Bên sẽ không bị xem là vi phạm Hợp Đồng nếu việc chậm trễ hoặc không thực hiện nghĩa vụ do sự kiện khách quan, không thể lường trước và không thể khắc phục mặc dù đã áp dụng mọi biện pháp cần thiết (“Sự Kiện Bất Khả Kháng”), bao gồm nhưng không giới hạn: thiên tai, hỏa hoạn, chiến tranh, bạo loạn, đình công, dịch bệnh, hoặc các quyết định, hạn chế của cơ quan nhà nước có thẩm quyền. Bên bị ảnh hưởng phải thông báo bằng văn bản cho Bên còn lại trong vòng 03 ngày làm việc kể từ khi xảy ra sự kiện, nêu rõ bản chất sự kiện, phạm vi ảnh hưởng và thời gian dự kiến khắc phục.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 186,
        "text": "ĐIỀU 10: ĐIỀU KHOẢN CHUNG",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 187,
        "text": "Luật áp dụng: Hợp Đồng này được điều chỉnh và giải thích theo pháp luật Việt Nam.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 188,
        "text": "Giải quyết tranh chấp: Mọi tranh chấp phát sinh từ hoặc liên quan đến Hợp Đồng sẽ được ưu tiên giải quyết thông qua thương lượng, hòa giải giữa các Bên. Nếu tranh chấp không được giải quyết trong vòng 30 (ba mươi) ngày kể từ ngày một Bên thông báo bằng văn bản về tranh chấp, tranh chấp sẽ được đưa ra Tòa án có thẩm quyền tại Việt Nam để giải quyết.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 189,
        "text": "Hợp đồng này được lập thành 02 bản, mỗi Bên giữ 01 bản, có giá trị pháp lý như nhau.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 190,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "signature",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 191,
                  "text": "ĐẠI DIỆN BÊN A",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 192,
                  "text": "ĐẠI DIỆN BÊN B",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 193,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/footer1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/footer2.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/footer2.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 1,
                  "text": "[dd.mm.yy]/HĐDV/UPBASE-BRAND-CTV[ID KOC]"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 2,
                  "text": "http://www.upbase.asia",
                  "align": "center"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 3,
                  "text": "Trang 1 ",
                  "align": "right"
                },
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 4,
                  "text": ""
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/footer2.xml",
        "paragraph": 5,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/footer3.xml",
        "paragraph": 0,
        "text": ""
      }
    ],
    "category": "CTV_FRAMEWORK",
    "description": "Hợp đồng nguyên tắc theo tháng dành cho Cộng tác viên (CTV) sản xuất video kênh nội bộ.",
    "active": true,
    "defaultReviewRoles": [
      "LEGAL",
      "FINANCE"
    ],
    "exemptLegalReview": true,
    "scope": "GLOBAL",
    "updatedAt": "2026-05-01T08:00:00.000Z",
    "updatedBy": "Phòng Pháp chế",
    "fieldCount": 15,
    "requiredFieldCount": 12,
    "history": [
      {
        "version": "Ver052026",
        "hash": "bd7c7da90e5fd08b0eb132d163812751f365724996c98e55fda593f0aac9bfd0",
        "filename": "4.1. BM.HĐVID.CTV.Ver052026 Upbase HĐNT booking CTV Video tháng.docx",
        "updatedAt": "2026-05-01T08:00:00.000Z",
        "updatedBy": "Phòng Pháp chế",
        "note": "Phiên bản chuẩn ban hành bởi Pháp chế"
      }
    ]
  },
  "CTV-BBNT": {
    "id": "CTV-BBNT",
    "name": "Nghiệm thu · CTV tháng",
    "filename": "4.2. BM.BBNTVID.CTV.Ver052026 Upbase BBNT booking Video tháng.docx",
    "subject": "CTV tháng",
    "kind": "ACCEPTANCE",
    "version": "Ver052026",
    "hash": "28ee2543dd94017e791d7e70464449cd2fa83021b0b24eaf9971f2e72fddf240",
    "fields": [
      {
        "key": "word/document.xml:p4:28",
        "part": "word/document.xml",
        "paragraph": 4,
        "start": 28,
        "end": 29,
        "label": "DỊCH VỤ BOOKING VIDEO THÁNG  [điền] ./2026",
        "context": "DỊCH VỤ BOOKING VIDEO THÁNG …./2026",
        "required": false,
        "title": "Tháng nghiệm thu",
        "group": "DATE",
        "kind": "number"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 5,
        "start": 0,
        "end": 10,
        "label": "dd.mm.yy",
        "context": "[dd.mm.yy]/BBNT/UPBASE-CTV[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 5,
        "start": 26,
        "end": 34,
        "label": "ID KOC",
        "context": "[dd.mm.yy]/BBNT/UPBASE-CTV[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 6,
        "start": 35,
        "end": 45,
        "label": "dd.mm.yy",
        "context": "Kèm theo Hợp đồng dịch vụ khung số [dd.mm.yy]/HĐDV/UPBASE-CTV[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 6,
        "start": 61,
        "end": 69,
        "label": "ID KOC",
        "context": "Kèm theo Hợp đồng dịch vụ khung số [dd.mm.yy]/HĐDV/UPBASE-CTV[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p26:cell",
        "part": "word/document.xml",
        "paragraph": 26,
        "label": "BÊN B",
        "context": "BÊN B",
        "required": true,
        "title": "Họ tên Bên B",
        "group": "PARTY",
        "kind": "text",
        "source": "partyName"
      },
      {
        "key": "word/document.xml:p29:cell",
        "part": "word/document.xml",
        "paragraph": 29,
        "label": "CCCD",
        "context": "CCCD",
        "required": true,
        "title": "Số CCCD",
        "group": "PARTY",
        "kind": "text",
        "source": "cccd"
      },
      {
        "key": "word/document.xml:p32:cell",
        "part": "word/document.xml",
        "paragraph": 32,
        "label": "Địa chỉ",
        "context": "Địa chỉ",
        "required": true,
        "title": "Địa chỉ",
        "group": "PARTY",
        "kind": "long",
        "source": "address"
      },
      {
        "key": "word/document.xml:p35:cell",
        "part": "word/document.xml",
        "paragraph": 35,
        "label": "Số điện thoại",
        "context": "Số điện thoại",
        "required": true,
        "title": "Số điện thoại",
        "group": "PARTY",
        "kind": "text",
        "source": "phone"
      },
      {
        "key": "word/document.xml:p38:cell",
        "part": "word/document.xml",
        "paragraph": 38,
        "label": "Email",
        "context": "Email",
        "required": true,
        "title": "Email",
        "group": "PARTY",
        "kind": "text",
        "source": "email"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/document.xml",
        "paragraph": 42,
        "start": 33,
        "end": 43,
        "label": "dd.mm.yy",
        "context": "Căn cứ Hợp đồng dịch vụ khung số [dd.mm.yy]/HĐDV/UPBASE-CTV[ID KOC] và kết quả thực hiện công việc thực tế của Bên B.",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/document.xml",
        "paragraph": 42,
        "start": 59,
        "end": 67,
        "label": "ID KOC",
        "context": "Căn cứ Hợp đồng dịch vụ khung số [dd.mm.yy]/HĐDV/UPBASE-CTV[ID KOC] và kết quả thực hiện công việc thực tế của Bên B.",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      },
      {
        "key": "word/document.xml:p45:58",
        "part": "word/document.xml",
        "paragraph": 45,
        "start": 58,
        "end": 59,
        "label": " vi công việc và phí dịch vụ tháng  [điền] ./2026",
        "context": "Điều 1: Nghiệm thu phạm vi công việc và phí dịch vụ tháng …./2026",
        "required": false,
        "title": "Tháng nghiệm thu (2)",
        "group": "DATE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p57:cell",
        "part": "word/document.xml",
        "paragraph": 57,
        "label": "Dòng 1 · Nhãn hàng",
        "context": "1 · Hoàn thành",
        "required": false,
        "title": "Dòng 1 · Nhãn hàng",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p58:cell",
        "part": "word/document.xml",
        "paragraph": 58,
        "label": "Dòng 1 · Link",
        "context": "1 · Hoàn thành",
        "required": false,
        "title": "Dòng 1 · Link",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p60:cell",
        "part": "word/document.xml",
        "paragraph": 60,
        "label": "Dòng 1 · Đơn giá",
        "context": "1 · Hoàn thành",
        "required": false,
        "title": "Dòng 1 · Đơn giá",
        "group": "SCOPE",
        "kind": "money",
        "source": "unitPrice"
      },
      {
        "key": "word/document.xml:p61:cell",
        "part": "word/document.xml",
        "paragraph": 61,
        "label": "Dòng 1 · Số lượng",
        "context": "1 · Hoàn thành",
        "required": false,
        "title": "Dòng 1 · Số lượng",
        "group": "SCOPE",
        "kind": "number",
        "source": "quantity"
      },
      {
        "key": "word/document.xml:p62:cell",
        "part": "word/document.xml",
        "paragraph": 62,
        "label": "Dòng 1 · Thành tiền",
        "context": "1 · Hoàn thành",
        "required": false,
        "title": "Dòng 1 · Thành tiền",
        "group": "SCOPE",
        "kind": "money",
        "source": "lineTotal"
      },
      {
        "key": "word/document.xml:p64:cell",
        "part": "word/document.xml",
        "paragraph": 64,
        "label": "Dòng 2 · Nhãn hàng",
        "context": "2 · Hoàn thành",
        "required": false,
        "title": "Dòng 2 · Nhãn hàng",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p65:cell",
        "part": "word/document.xml",
        "paragraph": 65,
        "label": "Dòng 2 · Link",
        "context": "2 · Hoàn thành",
        "required": false,
        "title": "Dòng 2 · Link",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p67:cell",
        "part": "word/document.xml",
        "paragraph": 67,
        "label": "Dòng 2 · Đơn giá",
        "context": "2 · Hoàn thành",
        "required": false,
        "title": "Dòng 2 · Đơn giá",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p68:cell",
        "part": "word/document.xml",
        "paragraph": 68,
        "label": "Dòng 2 · Số lượng",
        "context": "2 · Hoàn thành",
        "required": false,
        "title": "Dòng 2 · Số lượng",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p69:cell",
        "part": "word/document.xml",
        "paragraph": 69,
        "label": "Dòng 2 · Thành tiền",
        "context": "2 · Hoàn thành",
        "required": false,
        "title": "Dòng 2 · Thành tiền",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p71:cell",
        "part": "word/document.xml",
        "paragraph": 71,
        "label": "Dòng 3 · Nhãn hàng",
        "context": "3 · Hoàn thành",
        "required": false,
        "title": "Dòng 3 · Nhãn hàng",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p72:cell",
        "part": "word/document.xml",
        "paragraph": 72,
        "label": "Dòng 3 · Link",
        "context": "3 · Hoàn thành",
        "required": false,
        "title": "Dòng 3 · Link",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p74:cell",
        "part": "word/document.xml",
        "paragraph": 74,
        "label": "Dòng 3 · Đơn giá",
        "context": "3 · Hoàn thành",
        "required": false,
        "title": "Dòng 3 · Đơn giá",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p75:cell",
        "part": "word/document.xml",
        "paragraph": 75,
        "label": "Dòng 3 · Số lượng",
        "context": "3 · Hoàn thành",
        "required": false,
        "title": "Dòng 3 · Số lượng",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p76:cell",
        "part": "word/document.xml",
        "paragraph": 76,
        "label": "Dòng 3 · Thành tiền",
        "context": "3 · Hoàn thành",
        "required": false,
        "title": "Dòng 3 · Thành tiền",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p78:cell",
        "part": "word/document.xml",
        "paragraph": 78,
        "label": "Dòng 4 · Nhãn hàng",
        "context": "4",
        "required": false,
        "title": "Dòng 4 · Nhãn hàng",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p79:cell",
        "part": "word/document.xml",
        "paragraph": 79,
        "label": "Dòng 4 · Link",
        "context": "4",
        "required": false,
        "title": "Dòng 4 · Link",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p80:cell",
        "part": "word/document.xml",
        "paragraph": 80,
        "label": "Dòng 4 · Trạng thái",
        "context": "4",
        "required": false,
        "title": "Dòng 4 · Trạng thái",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p81:cell",
        "part": "word/document.xml",
        "paragraph": 81,
        "label": "Dòng 4 · Đơn giá",
        "context": "4",
        "required": false,
        "title": "Dòng 4 · Đơn giá",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p82:cell",
        "part": "word/document.xml",
        "paragraph": 82,
        "label": "Dòng 4 · Số lượng",
        "context": "4",
        "required": false,
        "title": "Dòng 4 · Số lượng",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p83:cell",
        "part": "word/document.xml",
        "paragraph": 83,
        "label": "Dòng 4 · Thành tiền",
        "context": "4",
        "required": false,
        "title": "Dòng 4 · Thành tiền",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p85:cell",
        "part": "word/document.xml",
        "paragraph": 85,
        "label": "Dòng 5 · Nhãn hàng",
        "context": "5",
        "required": false,
        "title": "Dòng 5 · Nhãn hàng",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p86:cell",
        "part": "word/document.xml",
        "paragraph": 86,
        "label": "Dòng 5 · Link",
        "context": "5",
        "required": false,
        "title": "Dòng 5 · Link",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p87:cell",
        "part": "word/document.xml",
        "paragraph": 87,
        "label": "Dòng 5 · Trạng thái",
        "context": "5",
        "required": false,
        "title": "Dòng 5 · Trạng thái",
        "group": "SCOPE",
        "kind": "text"
      },
      {
        "key": "word/document.xml:p88:cell",
        "part": "word/document.xml",
        "paragraph": 88,
        "label": "Dòng 5 · Đơn giá",
        "context": "5",
        "required": false,
        "title": "Dòng 5 · Đơn giá",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p89:cell",
        "part": "word/document.xml",
        "paragraph": 89,
        "label": "Dòng 5 · Số lượng",
        "context": "5",
        "required": false,
        "title": "Dòng 5 · Số lượng",
        "group": "SCOPE",
        "kind": "number"
      },
      {
        "key": "word/document.xml:p90:cell",
        "part": "word/document.xml",
        "paragraph": 90,
        "label": "Dòng 5 · Thành tiền",
        "context": "5",
        "required": false,
        "title": "Dòng 5 · Thành tiền",
        "group": "SCOPE",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p92:cell",
        "part": "word/document.xml",
        "paragraph": 92,
        "label": "Tổng Giá trị Phụ lục hợp đồng chưa bao gồm thuế TNCN (giá trị NET Bên B thực nhận)",
        "context": "Tổng Giá trị Phụ lục hợp đồng chưa bao gồm thuế TNCN (giá trị NET Bên B thực nhận)",
        "required": true,
        "title": "Tổng Giá trị Phụ lục hợp đồng chưa bao gồm thuế TNCN",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p94:cell",
        "part": "word/document.xml",
        "paragraph": 94,
        "label": "Thuế TNCN (Bên A trích nộp cho cơ quan thuế theo quy định)",
        "context": "Thuế TNCN (Bên A trích nộp cho cơ quan thuế theo quy định)",
        "required": false,
        "title": "Thuế TNCN (Bên A trích nộp cho cơ quan thuế theo quy định)",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p96:cell",
        "part": "word/document.xml",
        "paragraph": 96,
        "label": "Tổng giá trị nghiệm thu đã bao gồm thuế TNCN",
        "context": "Tổng giá trị nghiệm thu đã bao gồm thuế TNCN",
        "required": false,
        "title": "Tổng giá trị nghiệm thu đã bao gồm thuế TNCN",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "word/document.xml:p100:48",
        "part": "word/document.xml",
        "paragraph": 100,
        "start": 48,
        "end": 49,
        "label": "ên A phải thanh toán cho Bên B là:  [điền]  điền số tiền bằng số và ",
        "context": "Phí dịch vụ Bên A phải thanh toán cho Bên B là: … điền số tiền bằng số và bằng chữ NET Bên B thực nhận",
        "required": false,
        "title": "Phí dịch vụ phải thanh toán",
        "group": "MONEY",
        "kind": "money"
      },
      {
        "key": "token:[dd.mm.yy]",
        "part": "word/footer2.xml",
        "paragraph": 1,
        "start": 0,
        "end": 10,
        "label": "dd.mm.yy",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-[ID KOC]",
        "required": true,
        "title": "Ngày lập (dd.mm.yy) trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "docDate"
      },
      {
        "key": "token:[ID KOC]",
        "part": "word/footer2.xml",
        "paragraph": 1,
        "start": 23,
        "end": 31,
        "label": "ID KOC",
        "context": "[dd.mm.yy]/HĐDV/UPBASE-[ID KOC]",
        "required": true,
        "title": "Mã KOC trong số hợp đồng",
        "group": "NUMBER",
        "kind": "text",
        "source": "kocId"
      }
    ],
    "paragraphs": [
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "Độc lập – Tự do – Hạnh phúc",
      "",
      "BIÊN BẢN NGHIỆM THU ",
      "DỊCH VỤ BOOKING VIDEO THÁNG …./2026",
      "[dd.mm.yy]/BBNT/UPBASE-CTV[ID KOC]",
      "Kèm theo Hợp đồng dịch vụ khung số [dd.mm.yy]/HĐDV/UPBASE-CTV[ID KOC]",
      "",
      "BÊN SỬ DỤNG DỊCH VỤ",
      "BÊN A",
      ":",
      "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
      "Mã số thuế",
      ":",
      "0109361325",
      "Địa chỉ",
      ":",
      "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
      "Người đại diện",
      ":",
      "Ông Đỗ Văn Giang   ",
      "Sau đây gọi tắt là “Bên A”",
      "",
      "BÊN CUNG ỨNG DỊCH VỤ ",
      "BÊN B",
      ":",
      "",
      "CCCD",
      ":",
      "",
      "Địa chỉ",
      ":",
      "",
      "Số điện thoại",
      ":",
      "",
      "Email",
      ":",
      "",
      "Sau đây gọi tắt là “Bên B”",
      "",
      "",
      "Căn cứ Hợp đồng dịch vụ khung số [dd.mm.yy]/HĐDV/UPBASE-CTV[ID KOC] và kết quả thực hiện công việc thực tế của Bên B.",
      "Hai Bên tiến hành nghiệm thu các hạng mục công việc do Bên B thực hiện theo Hợp đồng nêu trên làm cơ sở xác nhận hoàn thành nghĩa vụ và thanh toán theo thỏa thuận.",
      "",
      "Điều 1: Nghiệm thu phạm vi công việc và phí dịch vụ tháng …./2026",
      " Nghiệm thu phạm vi công việc",
      "STT",
      "Nhãn hàng",
      "Link",
      "Trạng thái",
      "Đơn giá",
      "(VNĐ)",
      "Số lượng",
      "Thành tiền",
      "(VNĐ)",
      "1",
      "",
      "",
      "Hoàn thành",
      "",
      "",
      "",
      "2",
      "",
      "",
      "Hoàn thành",
      "",
      "",
      "",
      "3",
      "",
      "",
      "Hoàn thành",
      "",
      "",
      "",
      "4",
      "",
      "",
      "",
      "",
      "",
      "",
      "5",
      "",
      "",
      "",
      "",
      "",
      "",
      "Tổng Giá trị Phụ lục hợp đồng chưa bao gồm thuế TNCN (giá trị NET Bên B thực nhận)",
      "",
      "Thuế TNCN (Bên A trích nộp cho cơ quan thuế theo quy định)",
      "",
      "Tổng giá trị nghiệm thu đã bao gồm thuế TNCN",
      "",
      "",
      "",
      "1.2. Thanh toán phí dịch vụ",
      "Phí dịch vụ Bên A phải thanh toán cho Bên B là: … điền số tiền bằng số và bằng chữ NET Bên B thực nhận",
      "Thời hạn thanh toán: Bên A thanh toán cho Bên B trong vòng 07 – 09 ngày làm việc (không bao gồm thứ 7, chủ nhật và ngày nghỉ lễ) kể từ ngày Hai Bên hoàn tất ký Biên bản nghiệm thu/đối soát và Bên A đã nhận được Biên bản nghiệm thu/đối soát có đầy đủ chữ ký của hai bên.",
      "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
      "Tên chủ tài khoản: ",
      "Số tài khoản: ",
      "Tại Ngân hàng: ",
      "",
      "Điều 2: Hiệu lực ",
      "Biên bản này được lập và có hiệu lực từ ngày ….",
      "Biên bản này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi Bên giữ 01 (một) bản để thực hiện.",
      "",
      "ĐẠI DIỆN BÊN A",
      "",
      "ĐẠI DIỆN BÊN B ",
      "",
      "",
      "",
      "",
      "[dd.mm.yy]/HĐDV/UPBASE-[ID KOC]",
      "http://www.upbase.asia ",
      "Trang 1 ",
      "",
      "",
      "",
      "",
      "",
      "BM.BBNTVID.CTV.Ver052026",
      "",
      ""
    ],
    "blocks": [
      {
        "kind": "p",
        "part": "word/header1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/header2.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header2.xml",
                  "paragraph": 0,
                  "text": "",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/header2.xml",
                  "paragraph": 1,
                  "text": "BM.BBNTVID.CTV.Ver052026",
                  "align": "right"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/header2.xml",
        "paragraph": 2,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/header3.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 0,
        "text": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 1,
        "text": "Độc lập – Tự do – Hạnh phúc",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 2,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 3,
        "text": "BIÊN BẢN NGHIỆM THU ",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 4,
        "text": "DỊCH VỤ BOOKING VIDEO THÁNG …./2026",
        "align": "center",
        "bold": true,
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 5,
        "text": "[dd.mm.yy]/BBNT/UPBASE-CTV[ID KOC]",
        "align": "center"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 6,
        "text": "Kèm theo Hợp đồng dịch vụ khung số [dd.mm.yy]/HĐDV/UPBASE-CTV[ID KOC]",
        "align": "center",
        "boldPrefix": 35
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 7,
        "text": "",
        "align": "center"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 8,
                  "text": "BÊN SỬ DỤNG DỊCH VỤ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 4
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 9,
                  "text": "BÊN A",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 10,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 11,
                  "text": "CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 12,
                  "text": "Mã số thuế",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 13,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 14,
                  "text": "0109361325",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 15,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 16,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 17,
                  "text": "Nhà J03.LO21, Khu Đô thị Nam Cường, đường Tố Hữu, Phường Dương Nội, TP Hà Nội, Việt Nam",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 18,
                  "text": "Người đại diện",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 19,
                  "text": ":",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 20,
                  "text": "Ông Đỗ Văn Giang   ",
                  "align": "justify"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 21,
                  "text": "Sau đây gọi tắt là “Bên A”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 22,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "party",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 23,
                  "text": "BÊN CUNG ỨNG DỊCH VỤ ",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 4
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 24,
                  "text": "BÊN B",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 25,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 26,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 27,
                  "text": "CCCD",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 28,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 29,
                  "text": "",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 30,
                  "text": "Địa chỉ",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 31,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 32,
                  "text": "",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 33,
                  "text": "Số điện thoại",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 34,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 35,
                  "text": "",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 36,
                  "text": "Email",
                  "align": "justify",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 37,
                  "text": ":",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 38,
                  "text": "",
                  "align": "justify"
                }
              ],
              "colSpan": 2
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 39,
                  "text": "Sau đây gọi tắt là “Bên B”",
                  "align": "justify",
                  "bold": true,
                  "italic": true
                }
              ],
              "colSpan": 3
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 40,
                  "text": "",
                  "align": "justify",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 41,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 42,
        "text": "Căn cứ Hợp đồng dịch vụ khung số [dd.mm.yy]/HĐDV/UPBASE-CTV[ID KOC] và kết quả thực hiện công việc thực tế của Bên B.",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 43,
        "text": "Hai Bên tiến hành nghiệm thu các hạng mục công việc do Bên B thực hiện theo Hợp đồng nêu trên làm cơ sở xác nhận hoàn thành nghĩa vụ và thanh toán theo thỏa thuận.",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 44,
        "text": "",
        "align": "justify",
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 45,
        "text": "Điều 1: Nghiệm thu phạm vi công việc và phí dịch vụ tháng …./2026",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 46,
        "text": " Nghiệm thu phạm vi công việc",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 47,
                  "text": "STT",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 48,
                  "text": "Nhãn hàng",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 49,
                  "text": "Link",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 50,
                  "text": "Trạng thái",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 51,
                  "text": "Đơn giá",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 52,
                  "text": "(VNĐ)",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 53,
                  "text": "Số lượng",
                  "align": "center",
                  "bold": true
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 54,
                  "text": "Thành tiền",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 55,
                  "text": "(VNĐ)",
                  "align": "center",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 56,
                  "text": "1",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 57,
                  "text": "",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 58,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 59,
                  "text": "Hoàn thành"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 60,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 61,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 62,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 63,
                  "text": "2",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 64,
                  "text": "",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 65,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 66,
                  "text": "Hoàn thành"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 67,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 68,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 69,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 70,
                  "text": "3",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 71,
                  "text": "",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 72,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 73,
                  "text": "Hoàn thành"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 74,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 75,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 76,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 77,
                  "text": "4",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 78,
                  "text": "",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 79,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 80,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 81,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 82,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 83,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 84,
                  "text": "5",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 85,
                  "text": "",
                  "align": "justify"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 86,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 87,
                  "text": ""
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 88,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 89,
                  "text": "",
                  "align": "right"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 90,
                  "text": "",
                  "align": "right"
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 91,
                  "text": "Tổng Giá trị Phụ lục hợp đồng chưa bao gồm thuế TNCN (giá trị NET Bên B thực nhận)",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 6
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 92,
                  "text": "",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 93,
                  "text": "Thuế TNCN (Bên A trích nộp cho cơ quan thuế theo quy định)",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 6
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 94,
                  "text": "",
                  "bold": true
                }
              ]
            }
          ],
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 95,
                  "text": "Tổng giá trị nghiệm thu đã bao gồm thuế TNCN",
                  "align": "justify",
                  "bold": true
                }
              ],
              "colSpan": 6
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 96,
                  "text": "",
                  "bold": true
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 97,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 98,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 99,
        "text": "1.2. Thanh toán phí dịch vụ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 100,
        "text": "Phí dịch vụ Bên A phải thanh toán cho Bên B là: … điền số tiền bằng số và bằng chữ NET Bên B thực nhận",
        "align": "justify",
        "bold": true,
        "italic": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 101,
        "text": "Thời hạn thanh toán: Bên A thanh toán cho Bên B trong vòng 07 – 09 ngày làm việc (không bao gồm thứ 7, chủ nhật và ngày nghỉ lễ) kể từ ngày Hai Bên hoàn tất ký Biên bản nghiệm thu/đối soát và Bên A đã nhận được Biên bản nghiệm thu/đối soát có đầy đủ chữ ký của hai bên.",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 102,
        "text": "Bên A thanh toán bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên B theo thông tin như sau:",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 103,
        "text": "Tên chủ tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 104,
        "text": "Số tài khoản: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 105,
        "text": "Tại Ngân hàng: ",
        "align": "justify"
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 106,
        "text": "",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 107,
        "text": "Điều 2: Hiệu lực ",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 108,
        "text": "Biên bản này được lập và có hiệu lực từ ngày ….",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 109,
        "text": "Biên bản này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi Bên giữ 01 (một) bản để thực hiện.",
        "align": "justify",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 110,
        "text": "",
        "align": "justify"
      },
      {
        "kind": "table",
        "part": "word/document.xml",
        "variant": "signature",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 111,
                  "text": "ĐẠI DIỆN BÊN A",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 112,
                  "text": "",
                  "align": "center"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 113,
                  "text": "ĐẠI DIỆN BÊN B ",
                  "align": "center",
                  "bold": true
                },
                {
                  "kind": "p",
                  "part": "word/document.xml",
                  "paragraph": 114,
                  "text": "",
                  "align": "center"
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/document.xml",
        "paragraph": 115,
        "text": "",
        "align": "center",
        "bold": true
      },
      {
        "kind": "p",
        "part": "word/footer1.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/footer2.xml",
        "paragraph": 0,
        "text": ""
      },
      {
        "kind": "table",
        "part": "word/footer2.xml",
        "variant": "grid",
        "rows": [
          [
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 1,
                  "text": "[dd.mm.yy]/HĐDV/UPBASE-[ID KOC]"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 2,
                  "text": "http://www.upbase.asia ",
                  "align": "center"
                }
              ]
            },
            {
              "blocks": [
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 3,
                  "text": "Trang 1 ",
                  "align": "right"
                },
                {
                  "kind": "p",
                  "part": "word/footer2.xml",
                  "paragraph": 4,
                  "text": ""
                }
              ]
            }
          ]
        ]
      },
      {
        "kind": "p",
        "part": "word/footer2.xml",
        "paragraph": 5,
        "text": ""
      },
      {
        "kind": "p",
        "part": "word/footer3.xml",
        "paragraph": 0,
        "text": ""
      }
    ],
    "category": "CTV_FRAMEWORK",
    "description": "Biên bản nghiệm thu tổng hợp số lượng video đạt chuẩn trong tháng của CTV để tất toán thù lao.",
    "active": true,
    "defaultReviewRoles": [
      "FINANCE",
      "LEAD"
    ],
    "exemptLegalReview": true,
    "scope": "GLOBAL",
    "updatedAt": "2026-05-01T08:00:00.000Z",
    "updatedBy": "Phòng Pháp chế",
    "fieldCount": 46,
    "requiredFieldCount": 14,
    "history": [
      {
        "version": "Ver052026",
        "hash": "28ee2543dd94017e791d7e70464449cd2fa83021b0b24eaf9971f2e72fddf240",
        "filename": "4.2. BM.BBNTVID.CTV.Ver052026 Upbase BBNT booking Video tháng.docx",
        "updatedAt": "2026-05-01T08:00:00.000Z",
        "updatedBy": "Phòng Pháp chế",
        "note": "Phiên bản chuẩn ban hành bởi Pháp chế"
      }
    ]
  }
};
