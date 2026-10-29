/**
 * ============================================================================
 * UPBASE B2C OPERATIONS - GOOGLE APPS SCRIPT GUARDRAILS & AUTOMATION
 * Hệ thống tự động hóa & Chặn lỗi nhập liệu trước khi đồng bộ Web-Admin
 * 
 * Tích hợp 9 lớp bảo vệ dữ liệu (Proactive Guardrails):
 * 1. Tự động chuẩn hóa tiền tệ (3.5tr, 500k -> 3.500.000, 500.000) & Chặn số âm
 * 2. Tự động bù số '0' ở đầu SĐT và kiểm tra 10 chữ số hợp lệ
 * 3. Kiểm tra định dạng số CCCD (bắt buộc đúng 12 chữ số)
 * 4. Tự động bóc tách link TikTok, làm sạch handle & tạo link kênh chuẩn
 * 5. Bắt buộc điền Lý do từ chối & di chuyển con trỏ khi Brand chọn "No"
 * 6. Tự động đổi màu dòng & Đóng dấu thời gian Brand duyệt (SLA 48h)
 * 7. Khóa cứng cột kỹ thuật "Mã dòng (Row ID)" chống vô tình xóa/sửa
 * 8. Cảnh báo bảo vệ KOC đã duyệt Yes & Chặn sửa dòng tháng cũ đã chốt sổ
 * 9. Thanh menu "UpBase B2C" với bộ công cụ Audit dữ liệu toàn bảng
 * ============================================================================
 */

function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var row = e.range.getRow();
  var col = e.range.getColumn();

  // Bỏ qua dòng tiêu đề
  if (row <= 1) return;

  var lastCol = Math.max(sheet.getLastColumn(), col);
  var headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  function normHeader(text) {
    return String(text || '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
      .replace(/\s*\(bổ sung thêm\)/gi, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  var headers = headerValues.map(normHeader);

  function findCol(candidates) {
    for (var i = 0; i < headers.length; i++) {
      if (candidates.indexOf(headers[i]) !== -1) return i + 1;
    }
    return -1;
  }

  var ctx = {
    e: e,
    sheet: sheet,
    row: row,
    col: col,
    lastCol: lastCol,
    headers: headers,
    findCol: findCol,
    rawVal: String(e.range.getValue() || '').trim(),
    oldVal: typeof e.oldValue !== 'undefined' ? e.oldValue : '',
    toast: function(msg, title, sec) {
      try {
        SpreadsheetApp.getActiveSpreadsheet().toast(msg, title || 'UpBase B2C Guardrail', sec || 5);
      } catch (err) {}
    }
  };

  // KÍCH HOẠT CÁC LỚP CHẶN BẢO VỆ DỮ LIỆU
  try { guardrail_ProtectRowId(ctx); } catch (err) {}
  try { guardrail_NormalizeCurrency(ctx); } catch (err) {}
  try { guardrail_NormalizePhone(ctx); } catch (err) {}
  try { guardrail_ValidateCccd(ctx); } catch (err) {}
  try { guardrail_CleanTikTokHandle(ctx); } catch (err) {}
  try { guardrail_BrandReviewAndSla(ctx); } catch (err) {}
  try { guardrail_ProtectApprovedAndOldMonths(ctx); } catch (err) {}
}

/**
 * LỚP 1: Khóa cột kỹ thuật "Mã dòng (Row ID)" chống vô tình sửa / xóa
 */
function guardrail_ProtectRowId(ctx) {
  var rowIdCol = ctx.findCol(['ma dong (row id)', 'row id', 'ma dong']);
  if (rowIdCol === -1 || ctx.col !== rowIdCol) return;

  // Nếu người dùng cố tình đổi hoặc xóa Row ID đã có từ trước
  if (ctx.oldVal && ctx.rawVal !== ctx.oldVal) {
    ctx.e.range.setValue(ctx.oldVal);
    ctx.toast('Mã dòng (Row ID) là khóa đối soát kỹ thuật với Web-Admin, không được phép chỉnh sửa!', 'Đã khôi phục Row ID', 6);
  }
}

/**
 * LỚP 2: Tự động chuẩn hóa tiền tệ viết tắt ("3.5tr", "500k", "2tr5", "1,500,000đ") & Chặn số âm
 */
function guardrail_NormalizeCurrency(ctx) {
  var netFeeCol = ctx.findCol(['gia net video', 'chi phi chot cuoi', 'gia da hop tac truoc do (gia du kien)']);
  if (netFeeCol === -1 || ctx.col !== netFeeCol) return;

  var val = ctx.rawVal.toLowerCase();
  if (!val) return;

  // Xử lý viết tắt dạng tr / triệu / m
  var trMatch = val.match(/^(\d+(?:[.,]\d+)?)\s*(?:tr|trieu|triệu|m)\b/i);
  if (trMatch) {
    var numTr = Math.round(parseFloat(trMatch[1].replace(',', '.')) * 1000000);
    ctx.e.range.setValue(numTr);
    ctx.e.range.setNumberFormat('#,##0');
    return;
  }

  // Xử lý viết tắt dạng k
  var kMatch = val.match(/^(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    var numK = Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);
    ctx.e.range.setValue(numK);
    ctx.e.range.setNumberFormat('#,##0');
    return;
  }

  // Xử lý có chữ đ hoặc dấu chấm phẩy
  var digits = val.replace(/[^\d-]/g, '');
  if (digits) {
    var num = parseInt(digits, 10);
    if (num < 0) {
      if (ctx.oldVal) ctx.e.range.setValue(ctx.oldVal);
      ctx.toast('Chi phí booking không thể là số âm!', 'Sai giá tiền', 5);
      return;
    }
    if (num !== Number(ctx.rawVal)) {
      ctx.e.range.setValue(num);
      ctx.e.range.setNumberFormat('#,##0');
    }
  }
}

/**
 * LỚP 3: Tự động bù số '0' ở đầu SĐT và kiểm tra 10 chữ số
 */
function guardrail_NormalizePhone(ctx) {
  var phoneCol = ctx.findCol(['sdt nhan hang', 'sdt', 'so dien thoai']);
  if (phoneCol === -1 || ctx.col !== phoneCol) return;

  var raw = ctx.rawVal.replace(/[^0-9]/g, '');
  if (!raw) return;

  // Nếu Google Sheet tự cắt mất số 0 đầu (còn 9 số)
  if (raw.length === 9) {
    raw = '0' + raw;
    ctx.e.range.setValue("'" + raw); // Ép kiểu text giữ số 0
    ctx.e.range.setBackground(null);
    return;
  }

  // Kiểm tra độ dài hợp lệ (10 số)
  if (raw.length === 10 && raw.startsWith('0')) {
    ctx.e.range.setValue("'" + raw);
    ctx.e.range.setBackground(null);
  } else {
    ctx.e.range.setBackground('#FFEDD5'); // Cảnh báo màu cam
    ctx.toast('SĐT nhận hàng phải gồm đúng 10 chữ số (Ví dụ: 0981234567).', 'Cảnh báo SĐT', 6);
  }
}

/**
 * LỚP 4: Kiểm tra định dạng số CCCD (12 chữ số)
 */
function guardrail_ValidateCccd(ctx) {
  var cccdCol = ctx.findCol(['so cccd', 'cccd', 'so can cuoc']);
  if (cccdCol === -1 || ctx.col !== cccdCol) return;

  var raw = ctx.rawVal.replace(/[^0-9]/g, '');
  if (!raw) return;

  // Kiểm tra đúng chuẩn 12 số CCCD gắn chip hiện hành
  if (raw.length === 12) {
    ctx.e.range.setValue("'" + raw);
    ctx.e.range.setBackground(null);
  } else {
    ctx.e.range.setBackground('#FEE2E2'); // Cảnh báo màu đỏ nhạt
    ctx.toast('Số CCCD phải đủ đúng 12 chữ số để phục vụ kê khai thuế TNCN và ký hợp đồng.', 'Cảnh báo CCCD', 6);
  }
}

/**
 * LỚP 5: Làm sạch handle TikTok & Tự động tạo link kênh chuẩn
 */
function guardrail_CleanTikTokHandle(ctx) {
  var idCol = ctx.findCol(['id kenh', '🎃id kenh', 'ma koc']);
  if (idCol === -1 || ctx.col !== idCol) return;

  var raw = ctx.rawVal;
  if (!raw) return;

  var clean = raw
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '')
    .trim();

  if (clean && clean !== raw) {
    ctx.e.range.setValue(clean);
  }

  // Tự điền Link kênh nếu cột bên cạnh có mặt
  var linkCol = ctx.findCol(['link kenh', '🎃link kenh']);
  if (linkCol !== -1 && clean) {
    ctx.sheet.getRange(ctx.row, linkCol).setValue('https://www.tiktok.com/@' + clean);
  }

  // Tự điền ngày điền nếu đang trống
  var dateCol = ctx.findCol(['ngay dien', 'ngay_dien']);
  if (dateCol !== -1) {
    var dateCell = ctx.sheet.getRange(ctx.row, dateCol);
    if (!String(dateCell.getValue() || '').trim()) {
      dateCell.setValue(Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy'));
    }
  }
}

/**
 * LỚP 6: Xử lý Brand chọn -> Bắt buộc Lý do từ chối (No), Tô màu dòng & Ghi mốc giờ SLA 48h
 */
function guardrail_BrandReviewAndSla(ctx) {
  var brandCol = ctx.findCol(['brand chon', 'brand chọn', 'brand duyet']);
  if (brandCol === -1 || ctx.col !== brandCol) return;

  var decision = ctx.rawVal.toLowerCase();
  var rowRange = ctx.sheet.getRange(ctx.row, 1, 1, Math.min(ctx.lastCol, 25));

  // Ghi mốc thời gian Brand duyệt lần đầu (chỉ ghi khi ô đang trống, không ghi đè khi sửa lại)
  var timeCol = ctx.findCol(['tg brand duyet', 'thoi gian brand duyet', 'thoi gian brand duyet (lan dau)', 'ngay brand duyet']);
  if (timeCol !== -1) {
    var timeCell = ctx.sheet.getRange(ctx.row, timeCol);
    var currentVal = String(timeCell.getValue() || '').trim();
    if (['yes', 'no', 'can nhac', 'cân nhắc'].indexOf(decision) !== -1 && !currentVal) {
      // Chỉ ghi khi ô đang trống (lúc Brand điền lần đầu tiên)
      var nowStr = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
      timeCell.setValue(nowStr);

      // Tự động tính SLA phản hồi nếu có cột Thời gian gửi listing
      var sentCol = ctx.findCol(['thoi gian gui listing', 'tg gui listing', 'ngay gui listing']);
      var slaHoursCol = ctx.findCol(['sla phan hoi (gio)', 'sla phan hoi']);
      var slaStatusCol = ctx.findCol(['trang thai sla 48h', 'trang thai sla', 'sla 48h']);

      if (sentCol !== -1 && slaHoursCol !== -1) {
        var sentVal = ctx.sheet.getRange(ctx.row, sentCol).getValue();
        if (sentVal) {
          var sentDate = new Date(sentVal);
          var reviewDate = new Date();
          if (!isNaN(sentDate.getTime())) {
            var diffHours = Math.round((reviewDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60) * 10) / 10;
            ctx.sheet.getRange(ctx.row, slaHoursCol).setValue(diffHours);
            if (slaStatusCol !== -1) {
              if (diffHours <= 48) {
                ctx.sheet.getRange(ctx.row, slaStatusCol).setValue('Đúng hạn');
                ctx.sheet.getRange(ctx.row, slaStatusCol).setBackground('#ECFDF5');
              } else {
                ctx.sheet.getRange(ctx.row, slaStatusCol).setValue('Quá hạn (' + diffHours + 'h)');
                ctx.sheet.getRange(ctx.row, slaStatusCol).setBackground('#FEF2F2');
              }
            }
          }
        }
      }
    }
  }

  // Xử lý tô màu dòng & Nhắc lý do từ chối
  if (decision === 'yes') {
    rowRange.setBackground('#ECFDF5'); // Xanh nhạt
  } else if (decision === 'no') {
    rowRange.setBackground('#F8FAFC'); // Xám nhạt
    var reasonCol = ctx.findCol(['ly do tu choi', 'lý do từ chối']);
    if (reasonCol !== -1) {
      var reasonCell = ctx.sheet.getRange(ctx.row, reasonCol);
      if (!String(reasonCell.getValue() || '').trim()) {
        reasonCell.setBackground('#FEF2F2');
        ctx.sheet.setActiveSelection(reasonCell);
        ctx.toast('Vui lòng chọn hoặc ghi ngắn gọn Lý do từ chối để UpBase lọc KOC thay thế sát yêu cầu hơn.', 'Nhắc điền Lý do (Dòng ' + ctx.row + ')', 7);
      }
    }
  } else if (decision === 'can nhac' || decision === 'cân nhắc') {
    rowRange.setBackground('#FFFBEB'); // Vàng nhạt
  } else {
    rowRange.setBackground(null);
  }
}

/**
 * LỚP 7 & 8: Cảnh báo khi sửa KOC đã duyệt "Yes" hoặc dòng tháng cũ đã chốt sổ
 */
function guardrail_ProtectApprovedAndOldMonths(ctx) {
  var brandCol = ctx.findCol(['brand chon', 'brand chọn']);
  var netFeeCol = ctx.findCol(['gia net video']);
  var prodCol = ctx.findCol(['san pham', 'sản phẩm']);

  // Cảnh báo sửa KOC đã duyệt Yes
  if (brandCol !== -1 && (ctx.col === netFeeCol || ctx.col === prodCol)) {
    var brandVal = String(ctx.sheet.getRange(ctx.row, brandCol).getValue() || '').trim().toLowerCase();
    if (brandVal === 'yes') {
      ctx.toast('LƯU Ý: KOC này đã được Brand duyệt Yes. Việc thay đổi giá net hoặc sản phẩm có thể ảnh hưởng đến PnL ngân sách!', 'Cảnh báo KOC đã duyệt', 6);
    }
  }

  // Chặn sửa dòng tháng cũ đã chốt sổ
  var monthCol = ctx.findCol(['thang', 'tháng']);
  if (monthCol !== -1) {
    var rawMonth = String(ctx.sheet.getRange(ctx.row, monthCol).getDisplayValue() || '').trim();
    var match = rawMonth.match(/(20\d{2})[\/-](\d{1,2})/);
    if (match) {
      var rowYearMonth = match[1] + '/' + ('0' + match[2]).slice(-2);
      var nowYearMonth = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy/MM');
      if (rowYearMonth < nowYearMonth) {
        if (ctx.oldVal) ctx.e.range.setValue(ctx.oldVal);
        ctx.toast('Dòng KOC thuộc tháng cũ (' + rowYearMonth + ') đã chốt sổ nghiệm thu — không thể chỉnh sửa.', 'Đã khóa sổ tháng cũ', 6);
      }
    }
  }
}

/**
 * LỚP 9: Menu tiện ích UpBase B2C trên thanh công cụ Google Sheet
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('UpBase B2C')
      .addItem('1. Xem tổng hợp KOC đã duyệt (Yes & Ngân sách)', 'upbaseShowApprovalSummary')
      .addItem('2. Quét kiểm tra dữ liệu lỗi (Audit SĐT, CCCD, Giá)', 'upbaseAuditSheetData')
      .addSeparator()
      .addItem('3. Khóa bảo vệ các dòng Tháng cũ (Chốt sổ)', 'upbaseProtectClosedMonthRows')
      .addToUi();
  } catch (err) {}
}

function upbaseShowApprovalSummary() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('Bảng hiện chưa có dữ liệu KOC.');
    return;
  }
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var brandIdx = headers.indexOf('brand chọn');
  var netIdx = headers.indexOf('giá net video');
  
  var total = 0, approved = 0, rejected = 0, waiting = 0, approvedNet = 0;
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row.some(Boolean)) continue;
    total++;
    var decision = brandIdx !== -1 ? String(row[brandIdx] || '').trim().toLowerCase() : '';
    var netVal = netIdx !== -1 ? Number(String(row[netIdx] || '').replace(/[^0-9]/g, '')) || 0 : 0;
    if (decision === 'yes') { approved++; approvedNet += netVal; }
    else if (decision === 'no') { rejected++; }
    else { waiting++; }
  }

  SpreadsheetApp.getUi().alert(
    'TỔNG HỢP LISTING KOC (' + sheet.getName() + ')',
    '• Tổng số dòng KOC: ' + total + '\n' +
    '• Brand đã duyệt (Yes): ' + approved + ' KOC\n' +
    '• Brand từ chối (No): ' + rejected + ' KOC\n' +
    '• Đang chờ phản hồi: ' + waiting + ' KOC\n' +
    '• Tổng Giá Net đã duyệt: ' + approvedNet.toLocaleString('vi-VN') + ' VNĐ',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function upbaseAuditSheetData() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('Bảng chưa có dữ liệu.');
    return;
  }
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var phoneIdx = headers.indexOf('sđt nhận hàng');
  var cccdIdx = headers.indexOf('số cccd');
  var netIdx = headers.indexOf('giá net video');

  var errorCount = 0;
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row.some(Boolean)) continue;
    
    // Check phone
    if (phoneIdx !== -1) {
      var p = String(row[phoneIdx] || '').replace(/[^0-9]/g, '');
      if (p && p.length !== 10) {
        sheet.getRange(r + 1, phoneIdx + 1).setBackground('#FFEDD5');
        errorCount++;
      }
    }
    // Check CCCD
    if (cccdIdx !== -1) {
      var c = String(row[cccdIdx] || '').replace(/[^0-9]/g, '');
      if (c && c.length !== 12) {
        sheet.getRange(r + 1, cccdIdx + 1).setBackground('#FEE2E2');
        errorCount++;
      }
    }
  }

  if (errorCount > 0) {
    SpreadsheetApp.getUi().alert('Phát hiện ' + errorCount + ' ô dữ liệu cần chuẩn hóa (SĐT hoặc CCCD sai độ dài đã được tô màu cảnh báo).');
  } else {
    SpreadsheetApp.getUi().alert('Tuyệt vời! 100% dữ liệu SĐT và CCCD trên sheet đều chuẩn xác.');
  }
}

function upbaseProtectClosedMonthRows() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return;

  var data = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var monthIdx = headers.indexOf('tháng');
  if (monthIdx === -1) {
    SpreadsheetApp.getUi().alert('Không tìm thấy cột Tháng.');
    return;
  }

  var nowYearMonth = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy/MM');
  var locked = 0;
  for (var r = 1; r < data.length; r++) {
    var raw = String(data[r][monthIdx] || '').trim();
    var m = raw.match(/(20\d{2})[\/-](\d{1,2})/);
    if (!m) continue;
    var ym = m[1] + '/' + ('0' + m[2]).slice(-2);
    if (ym < nowYearMonth) {
      var range = sheet.getRange(r + 1, 1, 1, lastCol);
      range.protect().setDescription('UpBase Lock Month ' + ym).setWarningOnly(true);
      locked++;
    }
  }
  SpreadsheetApp.getUi().alert('Đã thiết lập khóa bảo vệ cảnh báo cho ' + locked + ' dòng thuộc các tháng cũ trước ' + nowYearMonth + '.');
}
